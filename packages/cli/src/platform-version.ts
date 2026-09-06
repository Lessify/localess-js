import chalk from 'chalk';

import { getSession } from './session';
import { buildBox, parseVersion } from './version-check';

/**
 * Where the platform publishes its version.
 *
 * A static asset rather than an API endpoint: the Angular build already emits this file
 * (`scripts/generate-version.js`) and Firebase Hosting already serves it publicly on every
 * deployed instance, so the check works against platforms in the field today instead of only
 * ones upgraded to expose a new route. The trade-off is that it is a build artifact, not an
 * API contract — an API-only or emulator-only deployment won't serve it, which surfaces as
 * "unknown" and lets the command proceed.
 */
const VERSION_ASSET_PATH = '/assets/version.json';
const FETCH_TIMEOUT_MS = 3000;

/** Set to any value to bypass the compatibility check entirely. */
const SKIP_ENV_VAR = 'LOCALESS_SKIP_VERSION_CHECK';

/**
 * Minimum platform version each command needs, keyed by its full command path.
 *
 * `null` means the command never talks to the platform, so no version can apply — `login` and
 * `logout` run before or after credentials exist, and `schema validate` only reads local files.
 * Those are skipped rather than checked, so they keep working offline and against any platform.
 *
 * Every command must appear here. `platform-version.matrix.test.ts` walks the Commander tree
 * and fails when an entry is missing or stale, so adding a command forces a deliberate choice
 * instead of silently inheriting one.
 *
 * The values are minimums, not ranges. A future platform that breaks a command cannot be known
 * from here, so that direction is covered by the separate rule that the CLI and platform must
 * share a major version — see {@link checkPlatformCompatibility}.
 */
export const COMMAND_REQUIREMENTS: Record<string, string | null> = {
  login: null,
  logout: null,
  'schema validate': null,
  'schema pull': '4.0.0',
  'schema diff': '4.0.0',
  'schema push': '4.0.0',
  'translation pull': '4.0.0',
  'translation push': '4.0.0',
  'translation diff': '4.0.0',
  'type generate': '4.0.0',
};

/** Why a command cannot run against the platform it found. */
export type IncompatibilityReason = 'major-mismatch' | 'below-minimum';

/**
 * Outcome of the preflight check.
 *
 * `blocked` means the caller must stop before running the command; the message has already
 * been printed.
 */
export type CompatibilityResult = 'ok' | 'unknown' | 'skipped' | 'blocked';

/**
 * Reads the platform's version from its published version asset.
 *
 * Never throws and never rejects: a missing file, non-2xx status, malformed body, unreachable
 * host or timeout all resolve to `null`, meaning "unknown". The compatibility check treats
 * unknown as "proceed", so a network problem can never stop a command from running.
 *
 * @param origin - Platform origin, with or without a trailing slash.
 * @returns The platform's semver string, or `null` when it can't be determined.
 */
export async function fetchPlatformVersion(origin: string): Promise<string | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const url = `${origin.replace(/\/+$/, '')}${VERSION_ASSET_PATH}`;
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) return null;
    const data = (await response.json()) as { version?: unknown };
    return typeof data?.version === 'string' && data.version !== '' ? data.version : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Compares two versions by major, then minor, then patch. Pre-release suffixes are ignored,
 * so `4.0.0-dev.1` counts as `4.0.0` — a dev build of a version satisfies that version.
 *
 * @param version - The version to test.
 * @param minimum - The lowest acceptable version.
 * @returns `true` when `version` is greater than or equal to `minimum`.
 */
export function isAtLeast(version: string, minimum: string): boolean {
  const a = parseVersion(version);
  const b = parseVersion(minimum);
  if (a.major !== b.major) return a.major > b.major;
  if (a.minor !== b.minor) return a.minor > b.minor;
  return a.patch >= b.patch;
}

/**
 * Applies both rules: the CLI and platform must share a major version, and the platform must
 * meet the command's recorded minimum.
 *
 * @param cliVersion - This CLI's version.
 * @param platformVersion - The platform's version.
 * @param minimum - The command's minimum platform version.
 * @returns The reason the command cannot run, or `null` when it can.
 */
export function incompatibilityReason(cliVersion: string, platformVersion: string, minimum: string): IncompatibilityReason | null {
  if (parseVersion(cliVersion).major !== parseVersion(platformVersion).major) return 'major-mismatch';
  if (!isAtLeast(platformVersion, minimum)) return 'below-minimum';
  return null;
}

function buildIncompatibilityMessage(
  commandPath: string,
  cliVersion: string,
  platformVersion: string,
  minimum: string,
  reason: IncompatibilityReason
): string {
  const cliMajor = parseVersion(cliVersion).major;
  const platformMajor = parseVersion(platformVersion).major;

  const explanation =
    reason === 'major-mismatch'
      ? `  CLI ${chalk.cyan(cliVersion)} requires a ${chalk.cyan(`${cliMajor}.x.x`)} platform, but found ${chalk.yellow(platformVersion)}  `
      : `  ${chalk.cyan(commandPath)} requires platform ${chalk.cyan(`>= ${minimum}`)}, but found ${chalk.yellow(platformVersion)}  `;

  return buildBox(
    [
      `  ${chalk.bold(`Incompatible versions — ${commandPath} aborted`)}  `,
      explanation,
      `  Install a matching CLI: ${chalk.cyan(`npm install --save-dev @localess/cli@${platformMajor}`)}  `,
      `  Bypass with ${chalk.dim(SKIP_ENV_VAR + '=1')}  `,
    ],
    'red'
  );
}

/**
 * Verifies the platform can run this command, before the command does anything.
 *
 * Blocks on a confirmed incompatibility — every command, not just the ones that write, because
 * an unmet requirement means the command cannot work correctly.
 *
 * Skips silently, without printing, whenever the answer cannot be trusted or does not apply:
 * the bypass variable is set, the command never talks to the platform, the command is unknown
 * (`--help` and friends), or no credentials are configured — that last case is left to the
 * command itself, which reports it with a better message. An undeterminable platform version
 * is `unknown` and also proceeds, so a network problem never stops a command.
 *
 * @param commandPath - Space-separated command path, e.g. `schema push`.
 * @param cliVersion - This CLI's version.
 * @returns What the caller should do next.
 */
export async function checkPlatformCompatibility(commandPath: string, cliVersion: string): Promise<CompatibilityResult> {
  if (process.env[SKIP_ENV_VAR]) return 'skipped';

  const minimum = COMMAND_REQUIREMENTS[commandPath];
  if (minimum === null || minimum === undefined) return 'skipped';

  const session = await getSession();
  if (!session.isLoggedIn) return 'skipped';

  const platformVersion = await fetchPlatformVersion(session.origin);
  if (!platformVersion) return 'unknown';

  const reason = incompatibilityReason(cliVersion, platformVersion, minimum);
  if (!reason) return 'ok';

  console.error(buildIncompatibilityMessage(commandPath, cliVersion, platformVersion, minimum, reason));
  return 'blocked';
}
