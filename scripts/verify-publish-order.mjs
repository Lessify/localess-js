#!/usr/bin/env node
/**
 * Asserts that the hardcoded package orders in the root `package.json` still match the dependency
 * graph declared by the packages themselves.
 *
 * Usage:
 *   node scripts/verify-publish-order.mjs
 *
 * Three lists name every publishable package by hand, and each is wrong in a different way when a
 * package is added and the list is not:
 *
 *   - `publishOrder` — the order `.github/workflows/publish.yml` publishes in. A dependent that
 *     reaches the registry before something it depends on leaves a window where every install
 *     fails to resolve, and a job that dies mid-loop never closes it. A package missing from the
 *     list is simply never published.
 *   - `scripts.build` — the order `npm run build` builds in. A package built before its dependency
 *     compiles against stale or absent output.
 *   - `scripts.test` — the workspaces `npm test` runs. A package missing here has its suite
 *     silently skipped.
 *
 * The orders are hardcoded rather than derived because they change only when a package is added.
 * This check is what makes that safe: it fails loudly instead of letting the lists drift.
 */

import { readdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const DEPENDENCY_FIELDS = ['dependencies', 'peerDependencies'];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, 'utf-8'));
}

function readPackages(root) {
  const base = resolve(root, 'packages');
  const packages = [];

  for (const entry of readdirSync(base, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;

    try {
      const manifest = readJson(resolve(base, entry.name, 'package.json'));
      if (manifest.private === true) continue;

      const dependencies = new Set();
      for (const field of DEPENDENCY_FIELDS) {
        for (const dependency of Object.keys(manifest[field] ?? {})) {
          if (dependency.startsWith('@localess/')) dependencies.add(dependency);
        }
      }

      packages.push({ name: manifest.name, dir: `packages/${entry.name}`, dependencies });
    } catch {
      continue;
    }
  }

  return packages;
}

function describe(list) {
  return list.length > 0 ? list.join(', ') : 'none';
}

// ─── API ─────────────────────────────────────────────────────────────────────

/**
 * Checks that `order` names every publishable package exactly once, with every dependency ahead of
 * its dependents.
 *
 * @param {string} label Name of the list being checked, used in messages.
 * @param {{ name: string, dir: string, dependencies: Set<string> }[]} packages Publishable packages.
 * @param {string[]} order Package directories in the hardcoded order.
 * @returns {string[]} Human-readable problems; empty when the order is complete and valid.
 */
export function checkOrder(label, packages, order) {
  const problems = [];
  const byDir = new Map(packages.map(pkg => [pkg.dir, pkg]));

  const missing = packages.filter(pkg => !order.includes(pkg.dir)).map(pkg => pkg.dir);
  if (missing.length > 0) {
    problems.push(`${label} — missing ${describe(missing)}. Those packages would be skipped.`);
  }

  const unknown = order.filter(dir => !byDir.has(dir));
  if (unknown.length > 0) {
    problems.push(`${label} — names ${describe(unknown)}, which is not a publishable package.`);
  }

  const duplicates = order.filter((dir, index) => order.indexOf(dir) !== index);
  if (duplicates.length > 0) {
    problems.push(`${label} — lists ${describe([...new Set(duplicates)])} more than once.`);
  }

  const seen = new Set();
  for (const dir of order) {
    const pkg = byDir.get(dir);
    if (!pkg) continue;

    for (const dependency of pkg.dependencies) {
      if (!seen.has(dependency)) {
        problems.push(`${label} — ${pkg.name} comes before its dependency ${dependency}.`);
      }
    }

    seen.add(pkg.name);
  }

  return problems;
}

/**
 * Collects every drift between the hardcoded lists in the root `package.json` and the packages on
 * disk.
 *
 * @param {string} root Absolute path to the monorepo root.
 * @returns {string[]} Human-readable problems; empty when every list is current.
 */
export function verifyPublishOrder(root) {
  const packages = readPackages(root);
  const rootPkg = readJson(resolve(root, 'package.json'));

  const buildOrder = [...(rootPkg.scripts?.build ?? '').matchAll(/build:(\S+)/g)].map(
    ([, name]) => `packages/${name}`,
  );
  const tested = [...(rootPkg.scripts?.test ?? '').matchAll(/--workspace=(\S+)/g)].map(
    ([, name]) => name,
  );

  const problems = [
    ...checkOrder('publishOrder', packages, rootPkg.publishOrder ?? []),
    ...checkOrder('scripts.build', packages, buildOrder),
  ];

  const untested = packages.filter(pkg => !tested.includes(pkg.name)).map(pkg => pkg.name);
  if (untested.length > 0) {
    problems.push(`scripts.test — missing ${describe(untested)}. Those suites never run.`);
  }

  return problems;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

if (import.meta.url === `file://${process.argv[1]}`) {
  const problems = verifyPublishOrder(ROOT);

  if (problems.length > 0) {
    console.error(`\nPackage lists in package.json are out of date. ${problems.length} problem(s):\n`);
    for (const problem of problems) console.error(`  ${problem}`);
    console.error('\nUpdate publishOrder / scripts.build / scripts.test in the root package.json.\n');
    process.exit(1);
  }

  console.log('\npublishOrder, scripts.build and scripts.test all cover every package, in dependency order.\n');
}
