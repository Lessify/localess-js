import { isIframe, isServer } from './platform';

const JS_SYNC_ID = 'localess-js-sync';

let syncPromise: Promise<void> | undefined;

/**
 * Loads the Localess Visual Editor sync script and resolves once `window.localess`
 * is available.
 *
 * `origin` is an explicit parameter rather than read from any configuration: the
 * script is served by the Localess deployment itself (`<origin>/scripts/sync-v1.js`),
 * so it is always version-matched to the server the app is talking to. That is why
 * this package needs no config object, and why it does not depend on
 * `@localess/client`.
 *
 * No-ops outside a browser, and outside the Visual Editor iframe — sync has no
 * meaning there. Concurrent callers share one promise.
 * @param {string} origin Fully qualified origin of the Localess deployment, with protocol.
 * @return {Promise<void>} resolves when the script has loaded.
 */
export function loadLocalessSync(origin: string): Promise<void> {
  if (isServer()) {
    return Promise.resolve();
  }
  if (!isIframe()) {
    console.warn('Localess Sync is loaded only in Visual Editor.');
    return Promise.resolve();
  }
  if (typeof window.localess !== 'undefined') {
    return Promise.resolve();
  }
  // Concurrent callers (e.g. React Strict Mode's double effect invocation) share this
  // single promise instead of each independently checking for a <script> tag and
  // resolving as soon as one exists — which previously resolved before the tag had
  // actually finished loading, silently no-oping any `window.localess` access that
  // followed in the same tick.
  if (syncPromise) {
    return syncPromise;
  }

  syncPromise = new Promise((resolve, reject) => {
    const scriptEl = document.getElementById(JS_SYNC_ID);
    if (scriptEl) {
      scriptEl.addEventListener('load', () => resolve());
      scriptEl.addEventListener('error', error => reject(error));
      return;
    }

    const script = document.createElement('script');
    script.id = JS_SYNC_ID;
    script.type = 'text/javascript';
    script.src = `${origin}/scripts/sync-v1.js`;
    script.async = true;

    script.onerror = error => reject(error);
    script.onload = () => {
      console.info('Localess Sync Script loaded');
      resolve();
    };

    document.head.appendChild(script);
  });

  return syncPromise;
}

/**
 * @internal Clears the shared load promise between test cases.
 *
 * The promise is module-level on purpose — there is only ever one sync script,
 * so concurrent callers must share one load. That also means it outlives a
 * single test, and a stale promise would let a later test take the
 * already-loaded early return instead of the path it means to exercise.
 */
export function resetSyncForTest(): void {
  syncPromise = undefined;
}
