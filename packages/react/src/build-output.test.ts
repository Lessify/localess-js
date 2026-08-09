import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const distDir = resolve(__dirname, '../dist');

const CLIENT_MODULES = [
  'core/components/localess-document.mjs',
  'core/components/localess-document.js',
  'rsc/localess-sync.mjs',
  'rsc/localess-sync.js',
];

const SERVER_SAFE_MODULES = ['rsc/localess-document.mjs', 'rsc/localess-document.js'];

const distExists = existsSync(distDir);

function startsWithUseClient(contents: string): boolean {
  return contents.startsWith("'use client';") || contents.startsWith('"use client";');
}

describe.skipIf(!distExists)('dist "use client" directive preservation', () => {
  it.each(CLIENT_MODULES)("keeps the 'use client' banner as the first statement in dist/%s", file => {
    const contents = readFileSync(resolve(distDir, file), 'utf-8').trimStart();

    expect(startsWithUseClient(contents)).toBe(true);
  });

  it.each(SERVER_SAFE_MODULES)("does not add a 'use client' banner to the server-safe dist/%s", file => {
    const contents = readFileSync(resolve(distDir, file), 'utf-8').trimStart();

    expect(startsWithUseClient(contents)).toBe(false);
  });
});
