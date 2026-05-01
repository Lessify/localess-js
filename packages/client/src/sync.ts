import { isIframe, isServer } from './utils';

const JS_SYNC_ID = 'localess-js-sync';

/**
 * Inject Localess Sync Script in Header
 * @param {string} origin A fully qualified domain name with protocol (http/https) and port.
 * @param {boolean} force Force Script Injection even if the application is not in Visual Editor.
 */
export async function loadLocalessSync(origin: string, force: boolean = false): Promise<void> {
  return new Promise((resolve, reject) => {
    if (isServer()) {
      // Skip Server Injection
      reject(undefined);
      return;
    }
    if (!isIframe()) {
      // Skip if the page is not loaded in Visual Editor
      console.warn('Localess Sync is loaded only in Visual Editor.');
      reject(undefined);
      return;
    }
    const isSyncLoaded = typeof window.localess !== 'undefined';
    if (isSyncLoaded) {
      // Skip if Sync is already loaded
      reject(undefined);
      return;
    }
    const scriptEl = document.getElementById(JS_SYNC_ID);
    if (scriptEl) {
      // Skip if a script is already loaded
      reject(undefined);
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
