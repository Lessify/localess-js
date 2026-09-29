import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { bumpVersion, nextVersion } from './bump-version.mjs';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf-8'));
}

function writeJson(path, data) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(data, null, 2) + '\n');
}

describe('nextVersion', () => {
  it('bumps patch', () => assert.equal(nextVersion('4.0.1', 'patch'), '4.0.2'));
  it('bumps minor and resets patch', () => assert.equal(nextVersion('4.0.1', 'minor'), '4.1.0'));
  it('bumps major and resets minor and patch', () => assert.equal(nextVersion('4.2.1', 'major'), '5.0.0'));
  it('rejects an unknown bump type', () => assert.throws(() => nextVersion('4.0.1', 'huge'), /Unknown bump type/));
  it('rejects a prerelease version', () => assert.throws(() => nextVersion('4.0.1-dev.1', 'patch'), /Not a release version/));
});

describe('bumpVersion', () => {
  let root;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'bump-version-'));
    writeJson(join(root, 'package.json'), { name: 'root', version: '1.2.3', workspaces: ['packages/*'] });
    writeJson(join(root, 'packages/model/package.json'), { name: '@localess/model', version: '1.2.3' });
    writeJson(join(root, 'packages/client/package.json'), {
      name: '@localess/client',
      version: '1.2.3',
      dependencies: { '@localess/model': '*' },
    });
    writeJson(join(root, 'packages/drifted/package.json'), { name: '@localess/drifted', version: '0.9.0' });
    writeJson(join(root, 'packages/internal/package.json'), { name: 'internal', version: '0.0.0', private: true });
    mkdirSync(join(root, 'packages/empty'));
    writeJson(join(root, 'package-lock.json'), {
      name: 'root',
      version: '1.2.3',
      packages: {
        '': { name: 'root', version: '1.2.3' },
        'packages/model': { name: '@localess/model', version: '1.2.3' },
        'packages/client': { name: '@localess/client', version: '1.2.3' },
        'packages/internal': { name: 'internal', version: '0.0.0' },
        'node_modules/other': { version: '1.2.3' },
      },
    });
  });

  afterEach(() => rmSync(root, { recursive: true, force: true }));

  it('bumps the root and every publishable package', () => {
    const result = bumpVersion(root, 'minor');

    assert.equal(result.from, '1.2.3');
    assert.equal(result.to, '1.3.0');
    assert.equal(readJson(join(root, 'package.json')).version, '1.3.0');
    assert.equal(readJson(join(root, 'packages/model/package.json')).version, '1.3.0');
    assert.equal(readJson(join(root, 'packages/client/package.json')).version, '1.3.0');
  });

  it('brings out-of-sync packages in line and reports their previous version', () => {
    const result = bumpVersion(root, 'patch');

    assert.equal(readJson(join(root, 'packages/drifted/package.json')).version, '1.2.4');
    assert.deepEqual(
      result.packages.find(p => p.name === '@localess/drifted'),
      { name: '@localess/drifted', from: '0.9.0' },
    );
  });

  it('leaves private packages and @localess/* ranges untouched', () => {
    bumpVersion(root, 'patch');

    assert.equal(readJson(join(root, 'packages/internal/package.json')).version, '0.0.0');
    assert.deepEqual(readJson(join(root, 'packages/client/package.json')).dependencies, { '@localess/model': '*' });
  });

  it('updates the workspace entries in package-lock.json only', () => {
    bumpVersion(root, 'major');
    const lock = readJson(join(root, 'package-lock.json'));

    assert.equal(lock.version, '2.0.0');
    assert.equal(lock.packages[''].version, '2.0.0');
    assert.equal(lock.packages['packages/model'].version, '2.0.0');
    assert.equal(lock.packages['packages/client'].version, '2.0.0');
    assert.equal(lock.packages['packages/internal'].version, '0.0.0');
    assert.equal(lock.packages['node_modules/other'].version, '1.2.3');
  });

  it('works without a package-lock.json', () => {
    rmSync(join(root, 'package-lock.json'));

    assert.equal(bumpVersion(root, 'patch').to, '1.2.4');
  });

  it('writes nothing when the bump type is invalid', () => {
    assert.throws(() => bumpVersion(root, 'huge'));

    assert.equal(readJson(join(root, 'package.json')).version, '1.2.3');
    assert.equal(readJson(join(root, 'packages/model/package.json')).version, '1.2.3');
  });
});

describe('repository', () => {
  it('keeps every publishable package at the root version', () => {
    const rootVersion = readJson(join(REPO_ROOT, 'package.json')).version;
    const lock = readJson(join(REPO_ROOT, 'package-lock.json'));

    const drifted = readdirSync(join(REPO_ROOT, 'packages'), { withFileTypes: true })
      .filter(entry => entry.isDirectory())
      .map(entry => ({ dir: entry.name, pkg: readJson(join(REPO_ROOT, 'packages', entry.name, 'package.json')) }))
      .filter(({ pkg }) => pkg.private !== true)
      .flatMap(({ dir, pkg }) => [
        pkg.version !== rootVersion && `packages/${dir}/package.json is ${pkg.version}`,
        lock.packages[`packages/${dir}`]?.version !== rootVersion &&
          `package-lock.json packages/${dir} is ${lock.packages[`packages/${dir}`]?.version}`,
      ])
      .filter(Boolean);

    assert.deepEqual(drifted, [], `Expected ${rootVersion}. Run npm run version:<type> to resync.`);
  });
});
