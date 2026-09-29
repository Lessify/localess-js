#!/usr/bin/env node
/**
 * Bumps the release number in the root package.json, every publishable package under
 * `packages/*`, and their entries in package-lock.json.
 *
 * Usage:
 *   node scripts/bump-version.mjs <patch|minor|major>
 *   npm run version:patch
 *
 * `@localess/*` ranges stay `"*"` in the repository; `scripts/set-publish-version.mjs` stamps the
 * exact version onto them during publish.
 */

import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const BUMP_TYPES = ['patch', 'minor', 'major'];

const RELEASE_VERSION = /^\d+\.\d+\.\d+$/;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, 'utf-8'));
}

function writeJson(filePath, data) {
  writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf-8');
}

function publishablePackageDirs(root) {
  const base = resolve(root, 'packages');
  return readdirSync(base, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name)
    .filter(dir => {
      try {
        return readJson(resolve(base, dir, 'package.json')).private !== true;
      } catch {
        return false;
      }
    });
}

// ─── API ─────────────────────────────────────────────────────────────────────

/**
 * Computes the next release version.
 *
 * @param {string} current Current version, `major.minor.patch`.
 * @param {'patch' | 'minor' | 'major'} type Bump type.
 * @returns {string} The bumped version.
 */
export function nextVersion(current, type) {
  if (!RELEASE_VERSION.test(current)) {
    throw new Error(`Not a release version: "${current}". Expected major.minor.patch.`);
  }

  const [major, minor, patch] = current.split('.').map(Number);

  switch (type) {
    case 'major': return `${major + 1}.0.0`;
    case 'minor': return `${major}.${minor + 1}.0`;
    case 'patch': return `${major}.${minor}.${patch + 1}`;
    default: throw new Error(`Unknown bump type: "${type}". Use ${BUMP_TYPES.join(', ')}.`);
  }
}

/**
 * Bumps the root version and writes it to every publishable package and to package-lock.json.
 *
 * @param {string} root Absolute path to the monorepo root.
 * @param {'patch' | 'minor' | 'major'} type Bump type.
 * @returns {{ from: string, to: string, packages: { name: string, from: string }[] }} What changed.
 */
export function bumpVersion(root, type) {
  const rootPkgPath = resolve(root, 'package.json');
  const rootPkg = readJson(rootPkgPath);
  const from = rootPkg.version;
  const to = nextVersion(from, type);

  const packages = [];
  const lockPath = resolve(root, 'package-lock.json');
  const lock = existsSync(lockPath) ? readJson(lockPath) : undefined;

  for (const dir of publishablePackageDirs(root)) {
    const pkgPath = resolve(root, 'packages', dir, 'package.json');
    const pkg = readJson(pkgPath);
    packages.push({ name: pkg.name, from: pkg.version });
    pkg.version = to;
    writeJson(pkgPath, pkg);

    const lockEntry = lock?.packages?.[`packages/${dir}`];
    if (lockEntry) lockEntry.version = to;
  }

  rootPkg.version = to;
  writeJson(rootPkgPath, rootPkg);

  if (lock) {
    lock.version = to;
    if (lock.packages?.['']) lock.packages[''].version = to;
    writeJson(lockPath, lock);
  }

  return { from, to, packages };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const type = process.argv[2];
  if (!BUMP_TYPES.includes(type)) {
    console.error(`\nUsage: node scripts/bump-version.mjs <${BUMP_TYPES.join('|')}>\n`);
    process.exit(1);
  }

  const { from, to, packages } = bumpVersion(ROOT, type);

  console.log(`\nBumped version: ${from} → ${to} (${type})\n`);
  for (const { name, from: previous } of packages) {
    const note = previous === from ? '' : `  (was ${previous}, out of sync with root)`;
    console.log(`  ${name}${note}`);
  }
  console.log('');
}
