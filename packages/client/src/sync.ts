import { isIframe, isServer } from './utils';

const JS_SYNC_ID = 'localess-js-sync';

let syncPromise: Promise<void> | undefined;

/**
 * Inject Localess Sync Script in Header
 * @param {string} origin A fully qualified domain name with protocol (http/https) and port.
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
