import type { Plugin } from 'vite';

/**
 * Builds a Vite plugin that resolves `moduleId` to a virtual module whose source is produced by
 * calling `load` inside Vite's own `load` hook — deferring resolution of that source to the
 * consumer's own Vite build, rather than baking a value in at this package's build time.
 */
export function createVirtualModulePlugin(name: string, moduleId: string, load: () => string | Promise<string>): Plugin {
  const resolvedModuleId = `\0${moduleId}`;

  return {
    name,
    async resolveId(id: string) {
      if (id === moduleId) {
        return resolvedModuleId;
      }
    },
    async load(id: string) {
      if (id === resolvedModuleId) {
        return { code: await load(), moduleType: 'js' };
      }
    },
  };
}
