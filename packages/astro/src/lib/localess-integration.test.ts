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

  it('injects the reload-on-save script when enableSync is true and livePreview is false', () => {
    const integration = localessIntegration({ ...baseOptions, enableSync: true });
    const { injectScript, addMiddleware } = runConfigSetup(integration);

    const pageScripts = injectScript.mock.calls.filter(([stage]) => stage === 'page').map(([, code]) => code);
    expect(pageScripts.some(code => code.includes('window.location.reload'))).toBe(true);
    expect(addMiddleware).not.toHaveBeenCalled();
  });

  describe('enableSync reload script against a simulated Visual Editor', () => {
    /**
     * Runs the injected page script with the sync script stubbed out, and returns the
     * listener it registered plus a reload spy. The import is swapped for a stub because the
     * real loader needs a browser iframe.
     */
    async function runEnableSyncScript() {
      const { injectScript } = runConfigSetup(localessIntegration({ ...baseOptions, enableSync: true }));
      const [, code] = injectScript.mock.calls.find(([stage]) => stage === 'page')!;
      const listeners: Array<{ events: string[] | null; cb: (event: unknown) => void }> = [];
      const reload = vi.fn();
      const fakeWindow = {
        localess: {
          on: (events: string[], cb: (event: unknown) => void) => listeners.push({ events, cb }),
          onChange: (cb: (event: unknown) => void) => listeners.push({ events: null, cb }),
        },
        location: { reload },
      };
      const body = code.replace(/import \{ loadLocalessSync \} from "@localess\/astro";/, '');
      await new Function('window', 'loadLocalessSync', `return (async () => { ${body}; await Promise.resolve(); })();`)(fakeWindow, () =>
        Promise.resolve()
      );
      await Promise.resolve();
      const dispatch = (type: string) => {
        for (const listener of listeners) {
          if (listener.events === null ? type === 'input' || type === 'change' : listener.events.includes(type)) listener.cb({ type });
        }
      };
      return { dispatch, reload };
    }

    it('does not reload on the change the editor sends right after connecting', async () => {
      vi.useFakeTimers();
      try {
        const { dispatch, reload } = await runEnableSyncScript();

        dispatch('pong');
        dispatch('change');
        dispatch('input');
        vi.advanceTimersByTime(2000);

        expect(reload).not.toHaveBeenCalled();
      } finally {
        vi.useRealTimers();
      }
    });

    it.each(['save', 'publish', 'unpublish'])('reloads once, debounced, after %s', async type => {
      vi.useFakeTimers();
      try {
        const { dispatch, reload } = await runEnableSyncScript();

        dispatch(type);
        dispatch(type);
        vi.advanceTimersByTime(499);
        expect(reload).not.toHaveBeenCalled();
        vi.advanceTimersByTime(1);

        expect(reload).toHaveBeenCalledTimes(1);
      } finally {
        vi.useRealTimers();
      }
    });
  });

  it('injects the live-preview script and registers middleware when livePreview is true under SSR output', () => {
    const integration = localessIntegration({ ...baseOptions, livePreview: true });
    const { injectScript, addMiddleware } = runConfigSetup(integration, { output: 'server' });

    const pageScripts = injectScript.mock.calls.filter(([stage]) => stage === 'page').map(([, code]) => code);
    expect(pageScripts.some(code => code.includes('handleLocalessMessage'))).toBe(true);
    expect(addMiddleware).toHaveBeenCalledWith(expect.objectContaining({ entrypoint: '@localess/astro/middleware', order: 'pre' }));
  });

  it('passes debug through to the injected sync script loader', () => {
    const quiet = runConfigSetup(localessIntegration({ ...baseOptions, enableSync: true }));
    const debug = runConfigSetup(localessIntegration({ ...baseOptions, enableSync: true, debug: true }));
    const pageScript = (injectScript: typeof quiet.injectScript) =>
      injectScript.mock.calls
        .filter(([stage]) => stage === 'page')
        .map(([, code]) => code)
        .join('\n');

    expect(pageScript(quiet.injectScript)).toContain("{ debug: false, sdk: '@localess/astro' }");
    expect(pageScript(debug.injectScript)).toContain("{ debug: true, sdk: '@localess/astro' }");
  });

  it('throws when livePreview is true but output is not server', () => {
    const integration = localessIntegration({ ...baseOptions, livePreview: true });

    expect(() => runConfigSetup(integration, { output: 'static' })).toThrow(/output.*server|server.*output/i);
  });
});
