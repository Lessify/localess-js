#!/usr/bin/env node
/**
 * Stamps the version being released onto every publishable package.
 *
 * Usage:
 *   node scripts/set-publish-version.mjs                     # use the root package.json version
 *   node scripts/set-publish-version.mjs 4.0.1-dev.20260915  # use an explicit snapshot version
 *
 * Package manifests are derived, not authored: `packages/*` carry `"@localess/*": "*"` in the
 * repository and the exact version is applied here, at publish time. The root `package.json`
 * version is the only place a release number is written by hand.
 *
 * Run this immediately before building, so ng-packagr copies the stamped values into its
 * generated manifest.
 */

import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const DEPENDENCY_FIELDS = ['dependencies', 'peerDependencies'];

const EXACT_VERSION = /^\d+\.\d+\.\d+(-[\w.]+)?$/;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, 'utf-8'));
}

function writeJson(filePath, data) {
  writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf-8');
}

function publishablePackagePaths(root) {
  const base = resolve(root, 'packages');
  return readdirSync(base, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => resolve(base, entry.name, 'package.json'))
    .filter(path => {
      try {
        return readJson(path).private !== true;
      } catch {
        return false;
      }
    });
}

// ─── API ─────────────────────────────────────────────────────────────────────

/**
 * Writes `version` as the version of every publishable package, and as the exact range of every
 * `@localess/*` dependency they declare.
 *
 * @param {string} root Absolute path to the monorepo root.
 * @param {string} version Exact version being published.
 * @returns {string[]} Names of the packages that were stamped.
 */
export function setPublishVersion(root, version) {
  const stamped = [];

  for (const pkgPath of publishablePackagePaths(root)) {
    const pkg = readJson(pkgPath);
    pkg.version = version;

    for (const field of DEPENDENCY_FIELDS) {
      const deps = pkg[field];
      if (!deps) continue;

      for (const dependency of Object.keys(deps)) {
        if (dependency.startsWith('@localess/')) deps[dependency] = version;
      }
    }

    writeJson(pkgPath, pkg);
    stamped.push(pkg.name);
  }

  return stamped;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

if (import.meta.url === `file://${process.argv[1]}`) {
  const version = process.argv[2] ?? readJson(resolve(ROOT, 'package.json')).version;

  if (!EXACT_VERSION.test(version)) {
    console.error(`\nNot an exact version: "${version}"\n`);
    process.exit(1);
  }

  const stamped = setPublishVersion(ROOT, version);

  console.log(`\nStamped ${version} onto ${stamped.length} packages:`);
  for (const name of stamped) console.log(`  ${name}`);
  console.log('');
}
