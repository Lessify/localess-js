/** `true` when running in a browser. */
export const isBrowser = () => typeof window !== 'undefined';

/** `true` when running outside a browser (SSR, build scripts, edge runtimes). */
export const isServer = () => typeof window === 'undefined';

/**
 * `true` when the page is framed — which is how the Visual Editor loads it.
 *
 * Sync is only meaningful inside that frame, so this is the gate every
 * framework package applies before subscribing to editor events.
 */
export const isIframe = () => isBrowser() && window.self !== window.top;
