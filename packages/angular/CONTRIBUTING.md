# Contributing to @localess/angular

## Overview

`@localess/angular` is an Angular library built with ng-packagr. It has three entry points:

- `@localess/angular` — main (re-exports browser + server)
- `@localess/angular/browser` — client-side components, directives, pipes, services
- `@localess/angular/server` — server-side services for SSR

## Build

```bash
# From monorepo root
npm run build:angular

# Or directly from packages/angular/
npx ng build localess-angular
```

Output goes to `packages/angular/dist/`. Required before running `playgrounds/angular-ssr`.

## Adding a Browser Component

1. Create `packages/angular/browser/src/components/<name>.component.ts`
2. Export from `packages/angular/browser/src/index.ts`
3. Export from `packages/angular/browser/src/public-api.ts`
4. Update `packages/angular/SKILL.md`

## Adding a Browser Pipe

1. Create `packages/angular/browser/src/pipes/<name>.pipe.ts`
2. Export from `packages/angular/browser/src/index.ts` and `public-api.ts`
3. Update `packages/angular/SKILL.md`

## Adding a Browser Service

1. Create `packages/angular/browser/src/services/<name>.service.ts`
2. Export from `packages/angular/browser/src/index.ts` and `public-api.ts`
3. Update `packages/angular/SKILL.md`

## Adding a Server Service

1. Create `packages/angular/server/src/services/<name>.service.ts`
2. Export from `packages/angular/server/src/index.ts` and `public-api.ts`
3. Update `packages/angular/SKILL.md`

## Upstream Changes

If `@localess/client` adds or removes a public API method or type:
1. Update any service in `browser/src/services/` or `server/src/services/` that uses it
2. Rebuild: `npm run build:angular`
3. Update `SKILL.md`
