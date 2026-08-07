import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const distDir = resolve(__dirname, '../dist');

const CLIENT_MODULES = ['core/components/localess-document.mjs', 'core/components/localess-document.js'];

const distExists = existsSync(distDir);

describe.skipIf(!distExists)('dist "use client" directive preservation', () => {
  it.each(CLIENT_MODULES)('keeps the \'use client\' banner as the first statement in dist/%s', file => {
    const contents = readFileSync(resolve(distDir, file), 'utf-8').trimStart();

    expect(contents.startsWith("'use client';") || contents.startsWith('"use client";')).toBe(true);
  });
});
