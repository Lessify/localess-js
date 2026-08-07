import { isIframe, isServer } from './utils';

const JS_SYNC_ID = 'localess-js-sync';

/**
 * Inject Localess Sync Script in Header
 * @param {string} origin A fully qualified domain name with protocol (http/https) and port.
 */
export async function loadLocalessSync(origin: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (isServer()) {
      resolve();
      return;
    }
    if (!isIframe()) {
      console.warn('Localess Sync is loaded only in Visual Editor.');
      resolve();
      return;
    }
    const isSyncLoaded = typeof window.localess !== 'undefined';
    if (isSyncLoaded) {
      resolve();
      return;
    }
    const scriptEl = document.getElementById(JS_SYNC_ID);
    if (scriptEl) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.id = JS_SYNC_ID;
    script.type = 'text/javascript';
    script.src = `${origin}/scripts/sync-v1.js`;
    script.async = true;

    script.onerror = error => reject(error);
    script.onload = event => {
      console.info('Localess Sync Script loaded');
      resolve();
    };

    document.head.appendChild(script);
  });
}
