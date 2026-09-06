import type { EventToAppOf, EventToAppType } from './events';
import { isBrowser, isIframe } from './platform';
import { loadLocalessSync } from './sync';

/**
 * Per-module-graph Visual Editor sync state and subscription helpers.
 *
 * Every framework package previously held its own module-level `_enableSync` /
 * `_syncPromise` pair plus byte-identical `isSyncEnabled`, `localessSyncOn`, and
 * `localessSyncOnChange` implementations. This is that logic, once.
 *
 * Deliberately a factory rather than module-level state: React's App Router
 * bundles Server and Client Components into separate module graphs, so each
 * graph needs its own instance and a shared singleton here would be wrong.
 */
export interface SyncController {
  /**
   * Records the `enableSync` flag and starts loading the script when enabled.
   * A load failure is logged, never thrown — the app works without live editing.
   */
  init(origin: string, enableSync: boolean | undefined): void;
  /**
   * `true` when sync is enabled **and** usable here: in a browser, inside the
   * Visual Editor iframe. Callers need no further environment checks.
   */
  isEnabled(): boolean;
  /**
   * The raw `enableSync` flag, without the browser/iframe gating.
   *
   * Needed where module-scope state is not shared across bundles — a server
   * component can read this and pass it down as a prop rather than calling
   * {@link isEnabled} from a client component where it was never set.
   */
  isConfigured(): boolean;
  /** Resolves once the script has loaded, or immediately when sync is off. */
  ready(): Promise<void>;
  /** Subscribes to one or more editor events. No-op when sync is unusable. */
  on<T extends EventToAppType>(event: T | T[], callback: (event: EventToAppOf<T>) => void): void;
  /** Subscribes to `change` and `input`. No-op when sync is unusable. */
  onChange(callback: (event: EventToAppOf<'change' | 'input'>) => void): void;
  /** @internal Resets state between test cases. */
  reset(): void;
}

/** Creates an independent {@link SyncController}. */
export function createSyncController(): SyncController {
  let enabled = false;
  let promise: Promise<void> | undefined;

  const ready = (): Promise<void> => promise ?? Promise.resolve();
  const isEnabled = () => enabled && isBrowser() && isIframe();

  return {
    init(origin, enableSync) {
      if (!enableSync) return;
      enabled = true;
      promise = loadLocalessSync(origin).catch(error => {
        console.error('[Localess] Failed to load sync script.', error);
      });
    },
    isEnabled,
    isConfigured: () => enabled,
    ready,
    on(event, callback) {
      if (!isEnabled()) return;
      ready().then(() => {
        window.localess?.on(event, callback);
      });
    },
    onChange(callback) {
      if (!isEnabled()) return;
      ready().then(() => {
        window.localess?.onChange(callback);
      });
    },
    reset() {
      enabled = false;
      promise = undefined;
    },
  };
}
