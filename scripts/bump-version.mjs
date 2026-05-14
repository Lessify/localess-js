#!/usr/bin/env node
/**
 * Usage:
 *   node scripts/bump-version.mjs <patch|minor|major>
 *   npm run version:bump -- patch
 */

import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
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

function resolvePackageJsonPaths(root, workspaces) {
  const paths = [];
  for (const pattern of workspaces ?? []) {
    if (pattern.endsWith('/*')) {
      const base = resolve(root, pattern.slice(0, -2));
      try {
        const entries = readdirSync(base, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.isDirectory()) {
            paths.push(resolve(base, entry.name, 'package.json'));
          }
        }
      } catch {
        // Directory doesn't exist — skip
      }
    } else {
      paths.push(resolve(root, pattern, 'package.json'));
    }
  }
  return paths;
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

const packageJsonPaths = [
  rootPkgPath,
  ...resolvePackageJsonPaths(ROOT, rootPkg.workspaces),
];

console.log(`\nBumping version: ${currentVersion} → ${newVersion} (${type})\n`);

for (const pkgPath of packageJsonPaths) {
  const relative = pkgPath.replace(ROOT + '\\', '').replace(ROOT + '/', '');
  try {
    const pkg = readJson(pkgPath);

    if (pkg.version === undefined) {
      console.log(`  skipped  ${relative}  (no version field)`);
      continue;
    }

    const old = pkg.version;

    if (old !== currentVersion) {
      console.log(`  skipped  ${relative}  (version ${old} doesn't match ${currentVersion})`);
      continue;
    }

    pkg.version = newVersion;
    writeJson(pkgPath, pkg);
    console.log(`  updated  ${relative}  ${old} → ${newVersion}`);
  } catch {
    console.log(`  missing  ${relative}  (file not found)`);
  }
}

console.log(`\nDone. New version: ${newVersion}\n`);
