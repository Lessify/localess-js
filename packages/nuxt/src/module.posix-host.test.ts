// Pins `path.sep` to '/' so the module-specifier tests exercise the same conditions as a
// Linux CI runner. Without this the Windows-path assertions in `module.test.ts` are only
// meaningful off-Windows: a host-dependent normaliser (`split(path.sep)`) passes on a
// Windows dev machine and fails only in CI, which is exactly how it shipped once.
import { describe, expect, it, vi } from 'vitest';

vi.mock('node:path', async importOriginal => {
  const actual = await importOriginal<typeof import('node:path')>();
  return { ...actual, sep: '/' };
});

const { generateComponentsTemplate } = await import('./module');

describe('generateComponentsTemplate on a POSIX host', () => {
  it('normalises a Windows path into a module specifier', () => {
    const code = generateComponentsTemplate(['C:\\app\\components\\Page.vue'], []);

    expect(code).not.toContain('\\\\');
    expect(code).toContain('import __component_0__ from "C:/app/components/Page.vue";');
  });

  it('normalises a Windows override path too', () => {
    const code = generateComponentsTemplate([], [{ key: 'Page', importPath: 'C:\\app\\Custom.vue' }]);

    expect(code).not.toContain('\\\\');
    expect(code).toContain('import __override_0__ from "C:/app/Custom.vue";');
  });

  it('leaves a POSIX path unchanged', () => {
    const code = generateComponentsTemplate(['/srv/app/components/Page.vue'], []);

    expect(code).toContain('import __component_0__ from "/srv/app/components/Page.vue";');
  });
});
