import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * `CLAUDE.md` rule 7 — only a small, fixed set of files may import `@localess/client` directly, so
 * the client-package boundary can be audited or changed in one place.
 *
 * For `@localess/astro` those are:
 *  - `src/index.ts`   — the documented pass-through; the generated `virtual:localess-init` module
 *                       imports `localessClient` from `@localess/astro`, so this re-export is
 *                       load-bearing and must not be "cleaned up".
 *  - `src/models/**`  — the models module.
 *
 * Everything else reaches the client through `../models`.
 */
const SANCTIONED = [join('src', 'index.ts'), join('src', 'models') + sep];

const SRC = join(__dirname);

function sourceFiles(dir: string, found: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) sourceFiles(full, found);
    else if (/\.(ts|tsx|astro)$/.test(entry) && !entry.endsWith('.test.ts')) found.push(full);
  }
  return found;
}

describe('@localess/client import boundary', () => {
  it('is only imported by the sanctioned files', () => {
    const offenders = sourceFiles(SRC)
      .filter(file => /from ['"]@localess\/client['"]/.test(readFileSync(file, 'utf8')))
      .map(file => relative(join(SRC, '..'), file))
      .filter(rel => !SANCTIONED.some(allowed => rel === allowed || rel.startsWith(allowed)));

    expect(offenders).toEqual([]);
  });

  it('model types come from @localess/model, not via the client re-export', () => {
    const offenders = sourceFiles(SRC)
      .filter(file => {
        const source = readFileSync(file, 'utf8');
        return /import type \{[^}]*\b(Content|ContentData|Links|References|Assets|AssetMetadata)\b[^}]*\} from ['"]@localess\/client['"]/.test(
          source
        );
      })
      .map(file => relative(join(SRC, '..'), file));

    expect(offenders).toEqual([]);
  });
});
