#!/usr/bin/env node
/**
 * Packs every publishable package and asserts the resulting tarball is actually usable.
 *
 * Usage:
 *   node scripts/pack-smoke-test.mjs
 *
 * `npm pack --dry-run --json` reports exactly the files npm would ship, honouring `files`,
 * `.npmignore` and ng-packagr's generated output. Every entry point the manifest declares is then
 * looked up in that list.
 *
 * This exists because `@localess/angular@3.4.0` shipped as raw TypeScript source with no `main`,
 * `module`, `typings` or `exports` at all: it installed cleanly and then failed at
 * `ERR_MODULE_NOT_FOUND` on first import. Nothing in lint, build, test or the manifest checks
 * looks at the tarball, so nothing caught it. Run it after the build, before publishing.
 */

import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { resolvePublishDir } from './verify-publish-manifests.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const ENTRY_FIELDS = ['main', 'module', 'browser', 'svelte', 'types', 'typings'];

const REQUIRED_FILES = ['SKILL.md'];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, 'utf-8'));
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

function normalize(target) {
  return target.replace(/^\.\//, '');
}

/**
 * Finds the `--json` array in npm's stdout.
 *
 * Anchoring on the first `[` is not enough: npm still forwards some output ahead of the JSON, and
 * consola switches from `\u2139 Building` to `[info] ...` when it detects CI — so a run that parsed
 * locally failed on a runner purely because the prefix gained a bracket.
 */
function parsePackReport(stdout) {
  for (let index = stdout.indexOf('['); index !== -1; index = stdout.indexOf('[', index + 1)) {
    try {
      const parsed = JSON.parse(stdout.slice(index));
      if (Array.isArray(parsed) && parsed[0]?.files) return parsed[0];
    } catch {
      // Not the start of the report — keep looking.
    }
  }

  throw new Error(`npm pack produced no parseable --json report. Output began: ${stdout.slice(0, 80).trim()}`);
}

function collectTargets(node, label, out) {
  if (node == null) return;
  if (typeof node === 'string') {
    out.push({ label, path: normalize(node) });
    return;
  }
  if (Array.isArray(node)) {
    node.forEach((child, index) => collectTargets(child, `${label}[${index}]`, out));
    return;
  }
  for (const [key, child] of Object.entries(node)) collectTargets(child, `${label}.${key}`, out);
}

// ─── API ─────────────────────────────────────────────────────────────────────

/**
 * Every file path a manifest points a consumer at, labelled by the field that declares it.
 *
 * @param {Record<string, unknown>} manifest Parsed package.json.
 * @returns {{ label: string, path: string }[]} Declared entry points.
 */
export function declaredTargets(manifest) {
  const targets = [];

  for (const field of ENTRY_FIELDS) {
    if (typeof manifest[field] === 'string') targets.push({ label: field, path: normalize(manifest[field]) });
  }

  collectTargets(manifest.exports, 'exports', targets);

  if (typeof manifest.bin === 'string') targets.push({ label: 'bin', path: normalize(manifest.bin) });
  else if (manifest.bin) {
    for (const [name, target] of Object.entries(manifest.bin)) {
      if (typeof target === 'string') targets.push({ label: `bin.${name}`, path: normalize(target) });
    }
  }

  return targets;
}

/**
 * Lists the files npm would ship for a package.
 *
 * @param {string} publishDir Directory `npm publish` would run in.
 * @returns {Set<string>} Package-relative paths in the tarball.
 */
export function packedFiles(publishDir) {
  // --ignore-scripts for the same reason `npm publish` uses it: a `prepack` script would rebuild
  // the package, so the smoke test would inspect an artifact the publish step never produces.
  // It also keeps lifecycle logging out of the stdout we have to parse.
  const stdout = execFileSync('npm', ['pack', '--dry-run', '--ignore-scripts', '--json'], {
    cwd: publishDir,
    encoding: 'utf-8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  return new Set(parsePackReport(stdout).files.map(file => file.path));
}

/**
 * Collects every way a package's tarball would fail a consumer.
 *
 * @param {string} root Absolute path to the monorepo root.
 * @returns {{ problems: string[], summary: { name: string, files: number, runtime: number, types: number }[] }}
 */
export function packSmokeTest(root) {
  const problems = [];
  const summary = [];

  for (const packageDir of publishableDirs(root)) {
    const publishDir = resolvePublishDir(packageDir);
    const relative = publishDir.slice(root.length + 1);

    let manifest;
    let files;
    try {
      manifest = readJson(resolve(publishDir, 'package.json'));
      files = packedFiles(publishDir);
    } catch (error) {
      problems.push(`${relative} — could not be packed: ${error.message.split('\n')[0]}. Has it been built?`);
      continue;
    }

    const name = manifest.name ?? relative;
    const targets = declaredTargets(manifest);

    const runtime = targets.filter(t => !t.path.endsWith('.d.ts') && !t.path.endsWith('package.json'));
    const types = targets.filter(t => t.path.endsWith('.d.ts'));

    if (runtime.length === 0) {
      problems.push(
        `${name} — declares no runtime entry point (no main, module or exports target). ` +
          `The tarball installs but cannot be imported (${relative}).`,
      );
    }

    if (types.length === 0) {
      problems.push(`${name} — ships no type declarations (no types, typings or exports types condition).`);
    }

    for (const { label, path } of targets) {
      if (!files.has(path)) {
        problems.push(`${name} — ${label} points at "${path}", which is not in the tarball (${relative}).`);
      }
    }

    for (const required of REQUIRED_FILES) {
      if (!files.has(required)) {
        problems.push(`${name} — ${required} is not in the tarball. It ships to downstream AI agents.`);
      }
    }

    summary.push({ name, files: files.size, runtime: runtime.length, types: types.length });
  }

  return { problems, summary };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

if (import.meta.url === `file://${process.argv[1]}`) {
  const { problems, summary } = packSmokeTest(ROOT);

  // Built as one string and written to a single stream: splitting the table across stdout and the
  // errors across stderr lets a CI log interleave them, which reads as though the failure happened
  // partway down the table.
  const table = summary
    .map(({ name, files, runtime, types }) => `  ${name.padEnd(24)} ${String(files).padStart(4)} files  ${runtime} entry  ${types} types`)
    .join('\n');

  if (problems.length > 0) {
    const report = problems.map(problem => `  ${problem}`).join('\n');
    console.error(`${table}\n\nRefusing to publish. ${problems.length} tarball problem(s):\n\n${report}\n`);
    process.exit(1);
  }

  console.log(`${table}\n\nAll ${summary.length} tarballs are importable and complete.\n`);
}
