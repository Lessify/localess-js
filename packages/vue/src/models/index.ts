/**
 * One of three internal boundaries to `@localess/client` (with `../utils` and `../client.ts`).
 * Every other file in this package imports types through this module (relatively, e.g.
 * `./models` or `../models`) instead of importing `@localess/client` directly — see
 * `packages/vue/CONTRIBUTING.md`.
 */
export type { LocalessComponentProps, LocalessDocumentProps, LocalessSchemaProps } from './components';
export type {
  Assets,
  Content,
  ContentData,
  ContentDataSchema,
  EventToAppOf,
  EventToAppType,
  Links,
  LocalessClient,
  LocalessClientOptions,
  References,
} from '@localess/client';
export { LocalessApiError } from '@localess/client';
