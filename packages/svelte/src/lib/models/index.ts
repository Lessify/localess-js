/**
 * One of three internal boundaries to `@localess/client` (with `../utils` and `../client`).
 * Every other file in this package imports types through this module (relatively, e.g.
 * `./models` or `../models`) instead of importing `@localess/client` or `@localess/model`
 * directly — see `packages/svelte/CONTRIBUTING.md`.
 */
export type { LocalessComponentProps, LocalessDocumentProps, LocalessSchemaProps } from './components';
export type { LocalessSvelteInitOptions } from './options';
export type { EventToAppOf, EventToAppType, LocalessClient, LocalessClientOptions } from '@localess/client';
export { LocalessApiError } from '@localess/client';
export type { Assets, Content, ContentData, ContentDataSchema, Links, References } from '@localess/model';
export type { LocalessRichTextDocument, LocalessRichTextInput, LocalessRichTextMark, LocalessRichTextNode } from '@localess/richtext';
