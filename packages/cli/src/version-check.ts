import chalk from 'chalk';

const PACKAGE_NAME = '@localess/cli';
const REGISTRY_BASE = `https://registry.npmjs.org/${PACKAGE_NAME}`;

type ParsedVersion = {
  major: number;
  minor: number;
  patch: number;
  preRelease: string | null; // e.g. "dev.20260513180146" or null for stable
};

function parseVersion(v: string): ParsedVersion {
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
  return s.replace(/\u001B\[[0-9;]*m/g, '').length;
}

function buildUpdateMessage(currentVersion: string, latestVersion: string, tag: 'latest' | 'dev'): string {
  const line1 = `  Update available: ${chalk.dim(currentVersion)} → ${chalk.green.bold(latestVersion)}  `;
  const line2 = `  Run ${chalk.cyan(`npm install --save-dev ${PACKAGE_NAME}@${tag}`)} to update  `;
  const width = Math.max(visibleLength(line1), visibleLength(line2));
  const pad = (s: string) => s + ' '.repeat(width - visibleLength(s));
  const border = chalk.yellow('─'.repeat(width + 1));

  return [
    '',
    chalk.yellow('┌') + border + chalk.yellow('┐'),
    chalk.yellow('│') + ' ' + pad(line1) + chalk.yellow('│'),
    chalk.yellow('│') + ' ' + pad(line2) + chalk.yellow('│'),
    chalk.yellow('└') + border + chalk.yellow('┘'),
    '',
  ].join('\n');
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
