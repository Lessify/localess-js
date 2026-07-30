export const isBrowser = () => typeof window !== 'undefined';
export const isServer = () => typeof window === 'undefined';

export const isIframe = () => isBrowser() && window.self !== window.top;
