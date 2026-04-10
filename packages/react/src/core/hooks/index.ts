/**
 * Core hooks barrel.
 *
 * useLocaless<T>(slug, options?) — fetch content by slug inside a Client Component ('use client').
 *                                   Accepts a string or string[] slug (array joined with '/').
 *                                   Subscribes to Visual Editor sync events when isSyncEnabled() is true.
 *                                   Returns Content<T> | undefined.
 */
export * from './use-localess';

