/**
 * Core utils barrel.
 *
 * From @localess/client:
 *   localessEditable(content)           — returns { 'data-ll-id', 'data-ll-schema' } for Visual Editor targeting.
 *                                         Spread on a component's root element.
 *   localessEditableField<T>(fieldName) — returns { 'data-ll-field' } for field-level Visual Editor targeting.
 *                                         Generic type T restricts fieldName to valid content keys.
 *   isBrowser  — true when running in a browser (window is defined).
 *   isServer   — true when running in a Node.js / server environment.
 *   isIframe   — true when the page is loaded inside an iframe (i.e. inside the Visual Editor).
 *
 * Local:
 *   findLink(links, link) — resolve a ContentLink to a URL string.
 *                           Returns '/' + fullSlug for type:'content', raw uri for type:'url',
 *                           '/not-found' when the link cannot be resolved.
 */
export * from './link.util';
export { isBrowser, isIframe, isServer, localessEditable, localessEditableField } from '@localess/client';
