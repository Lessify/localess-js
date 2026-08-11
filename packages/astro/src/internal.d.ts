/// <reference types="vite/client" />
/// <reference types="astro/client" />

/**
 * Internal type declarations used for building the Astro SDK.
 * Not published in the package — for local development only.
 */

declare namespace App {
  interface Locals {
    _localess_preview_data?: {
      data?: import('./models').ContentData;
    };
  }
}
