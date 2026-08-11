import { describe, expect, it } from 'vitest';

import { createComponentRegistrationParts, generateModuleCode } from './vite-plugin-import-localess-components';

describe('vite-plugin-import-localess-components', () => {
  describe('createComponentRegistrationParts', () => {
    it('generates structured parts with a getter wrapper for TDZ avoidance', () => {
      const parts = createComponentRegistrationParts({
        componentName: 'hero',
        importPath: '/src/localess/Hero.astro',
      });

      expect(parts.importStatement).toBe(`import __hero_component__ from '/src/localess/Hero.astro';`);
      expect(parts.wrapperDefinition).toBe(`const __hero_wrapper__ = { get default() { return __hero_component__; } };`);
      expect(parts.registrationCall).toBe(`registerComponent('hero', __hero_wrapper__);`);
    });
  });

  describe('generateModuleCode', () => {
    it('uses the localess convention folder for auto-discovery', () => {
      const code = generateModuleCode('/src', null, []);

      expect(code).toContain(`import.meta.glob('/src/localess/**/*.astro'`);
      expect(code).toContain('eager: true');
      expect(code).toContain('import { toCamelCase }');
      expect(code).toContain('export { localessComponents }');
    });

    it('registers glob components before manual components', () => {
      const manual = [createComponentRegistrationParts({ componentName: 'hero', importPath: '/src/localess/Hero.astro' })];
      const code = generateModuleCode('/src', null, manual);

      const globLoopIndex = code.indexOf('for (const filePath in modules)');
      const manualRegisterIndex = code.indexOf(`registerComponent('hero'`);

      expect(globLoopIndex).toBeGreaterThan(-1);
      expect(manualRegisterIndex).toBeGreaterThan(globLoopIndex);
    });

    it('includes the fallback registration last when provided', () => {
      const fallback = createComponentRegistrationParts({
        componentName: 'FallbackComponent',
        importPath: '@localess/astro/FallbackComponent.astro',
      });
      const manual = [createComponentRegistrationParts({ componentName: 'hero', importPath: '/src/localess/Hero.astro' })];
      const code = generateModuleCode('/src', fallback, manual);

      const heroIndex = code.indexOf(`registerComponent('hero'`);
      const fallbackIndex = code.indexOf(`registerComponent('FallbackComponent'`);

      expect(heroIndex).toBeGreaterThan(-1);
      expect(fallbackIndex).toBeGreaterThan(heroIndex);
    });

    it('registers with the wrapper, never the raw component reference (TDZ fix)', () => {
      const manual = [createComponentRegistrationParts({ componentName: 'hero', importPath: '/src/localess/Hero.astro' })];
      const code = generateModuleCode('/src', null, manual);

      expect(code).not.toContain(`registerComponent('hero', __hero_component__)`);
      expect(code).toContain(`registerComponent('hero', __hero_wrapper__)`);
    });
  });
});
