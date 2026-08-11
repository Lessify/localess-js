import { describe, expect, it, vi } from 'vitest';

import { localessIntegration } from './localess-integration';

const baseOptions = { origin: 'https://cms.example.com', spaceId: 'space-1', token: 'secret-token' };

function runConfigSetup(integration: ReturnType<typeof localessIntegration>, config: { output?: string } = {}) {
  const updateConfig = vi.fn();
  const injectScript = vi.fn();
  const addDevToolbarApp = vi.fn();
  const addMiddleware = vi.fn();

  (integration.hooks['astro:config:setup'] as any)({ updateConfig, injectScript, addDevToolbarApp, addMiddleware, config });

  return { updateConfig, injectScript, addDevToolbarApp, addMiddleware };
}

describe('localessIntegration', () => {
  it('has the expected integration name', () => {
    expect(localessIntegration(baseOptions).name).toBe('@localess/astro');
  });

  it('registers all three vite plugins', () => {
    const integration = localessIntegration(baseOptions);
    const { updateConfig } = runConfigSetup(integration);

    const [[configArg]] = updateConfig.mock.calls;
    expect(configArg.vite.plugins).toHaveLength(3);
  });

  it('injects the client instance via the page-ssr stage only', () => {
    const integration = localessIntegration(baseOptions);
    const { injectScript } = runConfigSetup(integration);

    const pageSsrCalls = injectScript.mock.calls.filter(([stage]) => stage === 'page-ssr');
    expect(pageSsrCalls).toHaveLength(1);
    expect(pageSsrCalls[0][1]).toContain('virtual:localess-init');
    expect(pageSsrCalls[0][1]).not.toContain(baseOptions.token);
  });

  it('registers the dev toolbar app', () => {
    const integration = localessIntegration(baseOptions);
    const { addDevToolbarApp } = runConfigSetup(integration);

    expect(addDevToolbarApp).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'localess', name: 'Localess', entrypoint: '@localess/astro/toolbarApp' })
    );
  });

  it('injects the reload-on-change script when enableSync is true and livePreview is false', () => {
    const integration = localessIntegration({ ...baseOptions, enableSync: true });
    const { injectScript, addMiddleware } = runConfigSetup(integration);

    const pageScripts = injectScript.mock.calls.filter(([stage]) => stage === 'page').map(([, code]) => code);
    expect(pageScripts.some(code => code.includes('window.location.reload'))).toBe(true);
    expect(addMiddleware).not.toHaveBeenCalled();
  });

  it('injects the live-preview script and registers middleware when livePreview is true under SSR output', () => {
    const integration = localessIntegration({ ...baseOptions, livePreview: true });
    const { injectScript, addMiddleware } = runConfigSetup(integration, { output: 'server' });

    const pageScripts = injectScript.mock.calls.filter(([stage]) => stage === 'page').map(([, code]) => code);
    expect(pageScripts.some(code => code.includes('handleLocalessMessage'))).toBe(true);
    expect(addMiddleware).toHaveBeenCalledWith(expect.objectContaining({ entrypoint: '@localess/astro/middleware', order: 'pre' }));
  });

  it('throws when livePreview is true but output is not server', () => {
    const integration = localessIntegration({ ...baseOptions, livePreview: true });

    expect(() => runConfigSetup(integration, { output: 'static' })).toThrow(/output.*server|server.*output/i);
  });
});
