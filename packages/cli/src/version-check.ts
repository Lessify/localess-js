import chalk from 'chalk';

const PACKAGE_NAME = '@localess/cli';
const REGISTRY_BASE = `https://registry.npmjs.org/${PACKAGE_NAME}`;

type ParsedVersion = {
  major: number;
  minor: number;
  patch: number;
  preRelease: string | null; // e.g. "dev.20260513180146" or null for stable
};

export function parseVersion(v: string): ParsedVersion {
  const [core, preRelease = null] = v.split('-') as [string, string | undefined];
  const parts = core.split('.').map(Number);
  return {
    major: parts[0] ?? 0,
    minor: parts[1] ?? 0,
    patch: parts[2] ?? 0,
    preRelease: preRelease ?? null,
  };
}

export function isNewer(candidate: string, current: string): boolean {
  const l = parseVersion(candidate);
  const c = parseVersion(current);

  if (l.major !== c.major) return l.major > c.major;
  if (l.minor !== c.minor) return l.minor > c.minor;
  if (l.patch !== c.patch) return l.patch > c.patch;

  // Same major.minor.patch: stable beats dev
  if (l.preRelease === null && c.preRelease !== null) return true;
  if (l.preRelease !== null && c.preRelease === null) return false;

  // Both pre-release: compare timestamp strings lexicographically
  if (l.preRelease !== null && c.preRelease !== null) {
    return l.preRelease > c.preRelease;
  }

  return false; // identical
}

async function fetchTag(tag: string, signal: AbortSignal): Promise<string | null> {
  try {
    const res = await fetch(`${REGISTRY_BASE}/${tag}`, { signal });
    if (!res.ok) return null;
    const data = (await res.json()) as { version: string };
    return data.version;
  } catch {
    return null;
  }
}

function visibleLength(s: string): number {
  // eslint-disable-next-line no-control-regex -- intentionally strips ANSI escape codes
  return s.replace(/\u001B\[[0-9;]*m/g, '').length;
}

/**
 * Renders lines inside a box, padded to the widest line.
 *
 * Width is measured with {@link visibleLength} so ANSI colour codes don't inflate it.
 *
 * @param lines - Already-coloured content lines, each with its own leading/trailing spacing.
 * @param color - Border colour.
 * @returns The boxed message, with a blank line above and below.
 */
export function buildBox(lines: string[], color: 'yellow' | 'red' = 'yellow'): string {
  const paint = color === 'red' ? chalk.red : chalk.yellow;
  const width = Math.max(...lines.map(visibleLength));
  const pad = (s: string) => s + ' '.repeat(width - visibleLength(s));
  const border = paint('─'.repeat(width + 1));

  return [
    '',
    paint('┌') + border + paint('┐'),
    ...lines.map(line => paint('│') + ' ' + pad(line) + paint('│')),
    paint('└') + border + paint('┘'),
    '',
  ].join('\n');
}

function buildUpdateMessage(currentVersion: string, latestVersion: string, tag: 'latest' | 'dev'): string {
  return buildBox([
    `  Update available: ${chalk.dim(currentVersion)} → ${chalk.green.bold(latestVersion)}  `,
    `  Run ${chalk.cyan(`npm install --save-dev ${PACKAGE_NAME}@${tag}`)} to update  `,
  ]);
}

export async function checkForUpdate(currentVersion: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);

    const isDevVersion = parseVersion(currentVersion).preRelease !== null;

    // Dev version: check both stable and dev tags in parallel; stable wins if both are newer
    // Stable version: check only the latest (stable) tag
    const [stableVersion, devVersion] = await Promise.all([
      fetchTag('latest', controller.signal),
      isDevVersion ? fetchTag('dev', controller.signal) : Promise.resolve(null),
    ]);

    clearTimeout(timeout);

    // Prefer notifying about a stable release over a dev release
    if (stableVersion && isNewer(stableVersion, currentVersion)) {
      return buildUpdateMessage(currentVersion, stableVersion, 'latest');
    }

    if (devVersion && isNewer(devVersion, currentVersion)) {
      return buildUpdateMessage(currentVersion, devVersion, 'dev');
    }
  } catch {
    // Silently ignore network errors or timeouts
  }
  return null;
}
