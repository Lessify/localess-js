#!/usr/bin/env node
/**
 * Asserts that every manifest about to be published is internally consistent.
 *
 * Usage:
 *   node scripts/verify-publish-manifests.mjs                     # check the root version
 *   node scripts/verify-publish-manifests.mjs 4.0.1-dev.20260915  # check a snapshot version
 *
 * Checks, per publishable package:
 *   - the manifest version matches the version being released
 *   - every `@localess/*` range is that exact version, never `"*"` or a floating range
 *
 * Run it after the build: for ng-packagr libraries the published manifest is the generated one
 * under the build output, not the source `package.json`.
 */

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const DEPENDENCY_FIELDS = ['dependencies', 'peerDependencies'];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, 'utf-8'));
}

/**
 * Resolves the directory a package is published from. ng-packagr libraries publish their build
 * output, whose generated manifest carries the entry points the source manifest lacks.
 *
 * @param {string} packageDir Absolute path to the package directory.
 * @returns {string} Absolute path to the directory that gets published.
 */
export function resolvePublishDir(packageDir) {
  const ngPackage = resolve(packageDir, 'ng-package.json');
  if (!existsSync(ngPackage)) return packageDir;

  const dest = readJson(ngPackage).dest ?? 'dist';
  return resolve(packageDir, dest);
}

function publishableDirs(root) {
  const base = resolve(root, 'packages');
  return readdirSync(base, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => resolve(base, entry.name))
    .filter(dir => {
      try {
        return readJson(resolve(dir, 'package.json')).private !== true;
      } catch {
        return false;
      }
    });
}

// ─── API ─────────────────────────────────────────────────────────────────────

/**
 * Collects every consistency problem across the manifests that would be published.
 *
 * @param {string} root Absolute path to the monorepo root.
 * @param {string} version Version being released.
 * @returns {string[]} Human-readable problems; empty when everything is consistent.
 */
export function verifyPublishManifests(root, version) {
  const problems = [];

  for (const packageDir of publishableDirs(root)) {
    const publishDir = resolvePublishDir(packageDir);
    const manifestPath = resolve(publishDir, 'package.json');
    const relative = manifestPath.slice(root.length + 1);

    if (!existsSync(manifestPath)) {
      problems.push(`${relative} — missing. Has the package been built?`);
      continue;
    }

    const pkg = readJson(manifestPath);

    if (pkg.version !== version) {
      problems.push(`${pkg.name} — version is ${pkg.version}, expected ${version} (${relative})`);
    }

    for (const field of DEPENDENCY_FIELDS) {
      for (const [dependency, range] of Object.entries(pkg[field] ?? {})) {
        if (!dependency.startsWith('@localess/')) continue;
        if (range === version) continue;

        problems.push(
          `${pkg.name} — ${field}.${dependency} is "${range}", expected "${version}". ` +
            `A floating range lets a consumer resolve a mismatched major (${relative}).`,
        );
      }
    }
  }

  return problems;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

if (import.meta.url === `file://${process.argv[1]}`) {
  const version = process.argv[2] ?? readJson(resolve(ROOT, 'package.json')).version;
  const problems = verifyPublishManifests(ROOT, version);

  if (problems.length > 0) {
    console.error(`\nRefusing to publish ${version}. ${problems.length} problem(s):\n`);
    for (const problem of problems) console.error(`  ${problem}`);
    console.error('');
    process.exit(1);
  }

  console.log(`\nAll publish manifests consistent at ${version}.\n`);
}
