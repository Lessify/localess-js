import type { EventToAppOf, EventToAppType, LocalessSync, Unsubscribe } from './events';
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
  init(origin: string, enableSync: boolean | undefined, debug?: boolean): void;
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
  /** The `debug` flag passed to {@link init}, forwarded to the sync script. */
  isDebug(): boolean;
  /** Resolves once the script has loaded, or immediately when sync is off. */
  ready(): Promise<void>;
  /**
   * Subscribes to one or more editor events. No-op when sync is unusable.
   * The returned function removes the subscription, and also works before the script has loaded.
   */
  on<T extends EventToAppType>(event: T | T[], callback: (event: EventToAppOf<T>) => void): Unsubscribe;
  /** Subscribes to `change` and `input`. Same semantics as {@link on}. */
  onChange(callback: (event: EventToAppOf<'change' | 'input'>) => void): Unsubscribe;
  /**
   * Subscribes to the content edits (`input` and `change`) of one document, matched by its
   * `documentId` (`Content.id`), and calls `callback` with the edited data. Edits to other
   * documents on the page are ignored. Same semantics as {@link on}.
   *
   * A subscriber that attaches after the document was already edited — the editor sends its
   * current state as a `change` the moment the preview connects — is called once straight away
   * with the latest edit, so a component that mounts late (after a fetch, a lazy route, a
   * client-side navigation) still shows what the editor shows.
   */
  onDocument(documentId: string, callback: (data: any, event: EventToAppOf<'change' | 'input'>) => void): Unsubscribe;
  /** @internal Resets state between test cases. */
  reset(): void;
}

/** Creates an independent {@link SyncController}. */
export function createSyncController(sdk?: string): SyncController {
  let enabled = false;
  let debugEnabled = false;
  let promise: Promise<void> | undefined;

  /** The latest edit per document, so a late {@link SyncController.onDocument} subscriber catches up. */
  const latestEdits = new Map<string, EventToAppOf<'change' | 'input'>>();

  const ready = (): Promise<void> => promise ?? Promise.resolve();
  const isEnabled = () => enabled && isBrowser() && isIframe();

  /** Attaches once the script is ready; unsubscribing before that cancels the attach. */
  const subscribe = (attach: (sync: LocalessSync) => Unsubscribe): Unsubscribe => {
    if (!isEnabled()) return () => undefined;
    let cancelled = false;
    let detach: Unsubscribe | undefined;
    ready().then(() => {
      if (cancelled || !window.localess) return;
      detach = attach(window.localess);
    });
    return () => {
      cancelled = true;
      detach?.();
      detach = undefined;
    };
  };

  return {
    init(origin, enableSync, debug) {
      if (!enableSync) return;
      enabled = true;
      debugEnabled = debug === true;
      promise = loadLocalessSync(origin, { debug: debugEnabled, sdk })
        .catch(error => {
          console.error('[Localess] Failed to load sync script.', error);
        })
        .then(() => {
          // Registered before any subscriber attaches (they all wait on this promise), so no edit is
          // missed. Same condition as `subscribe`: the script object is there, whatever the load reported.
          if (!isEnabled() || !window.localess) return;
          window.localess.onChange(event => {
            if (event.documentId) latestEdits.set(event.documentId, event);
          });
          // A new connection is followed by the editor's current state, so earlier edits no longer apply.
          window.localess.on('pong', () => latestEdits.clear());
        });
    },
    isEnabled,
    isConfigured: () => enabled,
    isDebug: () => debugEnabled,
    ready,
    on(event, callback) {
      return subscribe(sync => sync.on(event, callback));
    },
    onChange(callback) {
      return subscribe(sync => sync.onChange(callback));
    },
    onDocument(documentId, callback) {
      return subscribe(sync => {
        const unsubscribe = sync.onChange(event => {
          if (event.documentId === documentId) callback(event.data, event);
        });
        const latest = latestEdits.get(documentId);
        if (latest) callback(latest.data, latest);
        return unsubscribe;
      });
    },
    reset() {
      enabled = false;
      debugEnabled = false;
      promise = undefined;
      latestEdits.clear();
    },
  };
}
