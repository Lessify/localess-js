import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const distDir = resolve(__dirname, '../dist');

const CLIENT_MODULES = [
  'core/components/localess-document.mjs',
  'core/components/localess-document.js',
  'rsc/live-edit-listener.mjs',
  'rsc/live-edit-listener.js',
];

const SERVER_SAFE_MODULES = [
  'ssr/localess-document.mjs',
  'ssr/localess-document.js',
  'rsc/localess-document.mjs',
  'rsc/localess-document.js',
];

const SERVER_ACTION_MODULES = ['rsc/live-edit-action.mjs', 'rsc/live-edit-action.js'];

const distExists = existsSync(distDir);

function startsWithDirective(contents: string, directive: string): boolean {
  return contents.startsWith(`'${directive}';`) || contents.startsWith(`"${directive}";`);
}

describe.skipIf(!distExists)('dist directive preservation', () => {
  it.each(CLIENT_MODULES)("keeps the 'use client' banner as the first statement in dist/%s", file => {
    const contents = readFileSync(resolve(distDir, file), 'utf-8').trimStart();

    expect(startsWithDirective(contents, 'use client')).toBe(true);
  });

  it.each(SERVER_SAFE_MODULES)("does not add a 'use client' banner to the server-safe dist/%s", file => {
    const contents = readFileSync(resolve(distDir, file), 'utf-8').trimStart();

    expect(startsWithDirective(contents, 'use client')).toBe(false);
  });

  it.each(SERVER_ACTION_MODULES)("keeps the 'use server' banner as the first statement in dist/%s", file => {
    const contents = readFileSync(resolve(distDir, file), 'utf-8').trimStart();

    expect(startsWithDirective(contents, 'use server')).toBe(true);
  });
});
