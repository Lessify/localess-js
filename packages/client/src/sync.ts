import {isIframe, isServer} from "./utils";

const JS_SYNC_ID = 'localess-js-sync';

/**
 * Inject Localess Sync Script in Header
 * @param {string} origin A fully qualified domain name with protocol (http/https) and port.
 * @param {boolean} force Force Script Injection even if the application is not in Visual Editor.
 */
export function loadLocalessSync(origin: string, force: boolean = false) {
  if (isServer()) return; // Skip Server Injection
  if (!isIframe()) return; // Skip if the page is not loaded in Visual Editor
  const isSyncLoaded = typeof window.localess !== 'undefined';
  if (isSyncLoaded) return; // Skip if Sync is already loaded
  const scriptEl = document.getElementById(JS_SYNC_ID);
  if (scriptEl) return; // Skip if a script is already loaded
  const script = document.createElement('script');
  script.id = JS_SYNC_ID;
  script.type = 'text/javascript';
  script.src = `${origin}/scripts/sync-v1.js`
  script.async = true;

  script.onerror = (error) => console.error(error);
  script.onload = (event) => console.info('Localess Sync Script loaded');

  document.head.appendChild(script);
}
