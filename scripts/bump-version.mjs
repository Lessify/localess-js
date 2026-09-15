#!/usr/bin/env node
/**
 * Bumps the release number in the root package.json.
 *
 * Usage:
 *   node scripts/bump-version.mjs <patch|minor|major>
 *   npm run version:bump -- patch
 *
 * Package manifests under `packages/*` are not touched: their version and their `@localess/*`
 * ranges are derived, and `scripts/set-publish-version.mjs` stamps them during publish.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

// ─── Helpers ─────────────────────────────────────────────────────────────────

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, 'utf-8'));
}

function writeJson(filePath, data) {
  writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf-8');
}

function bumpVersion(current, type) {
  const [major, minor, patch] = current.split('.').map(Number);

  switch (type) {
    case 'major': return `${major + 1}.0.0`;
    case 'minor': return `${major}.${minor + 1}.0`;
    case 'patch': return `${major}.${minor}.${patch + 1}`;
    default: throw new Error(`Unknown bump type: "${type}". Use patch, minor, or major.`);
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const type = process.argv[2];
if (!['patch', 'minor', 'major'].includes(type)) {
  console.error(`\nUsage: npm run version:bump -- <patch|minor|major>\n`);
  process.exit(1);
}

const rootPkgPath = resolve(ROOT, 'package.json');
const rootPkg = readJson(rootPkgPath);
const currentVersion = rootPkg.version;
const newVersion = bumpVersion(currentVersion, type);

rootPkg.version = newVersion;
writeJson(rootPkgPath, rootPkg);

console.log(`\nBumped version: ${currentVersion} → ${newVersion} (${type})`);
console.log(`Packages are stamped at publish time by scripts/set-publish-version.mjs.\n`);
