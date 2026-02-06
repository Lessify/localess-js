# Localess JavaScript/TypeScript SDK

This monorepo contains the JavaScript/TypeScript SDKs for the Localess headless CMS platform.

## Repository Structure

This is an npm workspaces monorepo with three packages:

- **@localess/client** - Core JavaScript/TypeScript client SDK for server-side use only (requires API token)
- **@localess/react** - React framework integration with visual editor sync capabilities
- **@localess/cli** - Command-line interface for Localess platform management (early development stage)

## Build Commands

```bash
# Build all packages in order
npm run build

# Build specific packages
npm run build:client
npm run build:react
npm run build:cli

# Or build individual packages from workspace root
npm run build --workspace=@localess/client
npm run build --workspace=@localess/react
npm run build --workspace=@localess/cli
```

All packages use `tsup` for building with the command:
```bash
tsup src/index.ts --format cjs,esm --dts
```

This generates:
- `dist/index.js` (CommonJS)
- `dist/index.mjs` (ESM)
- `dist/index.d.ts` (TypeScript declarations)

### Requirements

- Node.js >= 20.0.0
- TypeScript 5.x

## Architecture Overview

### Package Dependencies

```
@localess/cli ──┐
                ├──> @localess/client
@localess/react ┘
```

Both `@localess/react` and `@localess/cli` depend on `@localess/client` as the core SDK. Use workspace protocol `"*"` for internal dependencies.

### Core Client (@localess/client)

**Purpose**: Universal SDK for Localess API - designed for server-side use only.

**Security Critical**: This package requires an API token and must NEVER be used in browser/client-side code. The token must be kept secret. In React apps, always fetch data server-side (e.g., Next.js Server Components, API routes, or server-side rendering).

**Key Files**:
- `client.ts` - Main client with API methods
- `cache.ts` - TTL-based caching (default 5 minutes, 300000ms)
- `editable.ts` - Visual editor integration helpers
- `sync.ts` - Visual editor sync script injection
- `models/` - TypeScript type definitions

**Client Initialization**:
```typescript
localessClient({
  origin: string,      // Fully qualified domain: https://my-localess.web.app
  spaceId: string,     // From Localess Space settings
  token: string,       // API token from Space settings (KEEP SECRET)
  version?: 'draft' | string,  // Default: 'published'
  debug?: boolean,
  cacheTTL?: number | false    // Default: 300000ms (5 min), false to disable
})
```

**Main API Methods**:
- `getLinks(params?)` - Fetch content links with optional filtering
- `getContentBySlug(slug, params?)` - Fetch content by slug path
- `getContentById(id, params?)` - Fetch content by ID
- `getTranslations(locale)` - Fetch translations for locale
- `getOpenAPI()` - Get OpenAPI schema

**Content Fetch Parameters** (used in getContentBySlug/Id):
- `version?: 'draft' | string` - Override client version
- `locale?: string` - ISO 639-1 locale (e.g., 'en')
- `resolveReference?: boolean` - Resolve content references
- `resolveLink?: boolean` - Resolve content links

**Caching**: All API responses are cached with TTL. Set `cacheTTL: false` to disable or adjust milliseconds for different TTL.

### React Package (@localess/react)

**Purpose**: React integration with component mapping and visual editor support.

**Key Files**:
- `index.ts` - Global state for client, components registry, and sync
- `localess-componenet.tsx` - Dynamic component renderer
- `richtext.ts` - TipTap-based rich text to React renderer

**Initialization Pattern**:
```typescript
localessInit({
  origin: string,
  spaceId: string,
  token: string,
  enableSync?: boolean,        // Enable visual editor sync
  components?: Record<string, React.ElementType>,  // Component registry
  fallbackComponent?: React.ElementType,           // Fallback for unmapped schemas
  // ... other client options
})
```

**Component Registry**: Maps content `_schema` field to React components:
```typescript
components: {
  'page': PageComponent,      // Renders content where _schema === 'page'
  'header': HeaderComponent,  // Renders content where _schema === 'header'
  'teaser': TeaserComponent,
}
```

**LocalessComponent Usage**:
```tsx
<LocalessComponent data={contentData} links={optionalLinks} />
```

The component:
1. Looks up React component by `data._schema` or `data.schema`
2. If found, renders it with `data`, `links`, and editable attributes
3. If not found, tries `fallbackComponent`
4. If no fallback, renders error message

**Component Implementation Pattern**:
```tsx
const MyComponent = ({ data, links }) => {
  return (
    <div {...llEditable(data)}>
      <h1 {...llEditableField('title')}>{data.title}</h1>
      {data.children?.map(child => (
        <LocalessComponent key={child._id} data={child} links={links} />
      ))}
    </div>
  )
}
```

**Visual Editor Integration**:
- `llEditable(content)` - Adds `data-ll-id` and `data-ll-schema` attributes to root element
- `llEditableField(fieldName)` - Adds `data-ll-field` attribute to specific fields
- Only applied when `enableSync: true`
- Listen to editor events: `window.localess.on(['input', 'change'], callback)`

**Rich Text Rendering**:
```typescript
import { renderRichTextToReact } from '@localess/react'
const reactNodes = renderRichTextToReact(contentRichText)
```

Uses TipTap with extensions: Document, Text, Paragraph, Heading (1-6), Bold, Italic, Strike, Underline, Lists, Code, CodeBlock, Link.

**Asset URL Resolution**:
```typescript
resolveAsset(asset) // Returns: {origin}/api/v1/spaces/{spaceId}/assets/{uri}
```

**Global State Functions**:
- `getLocalessClient()` - Access initialized client (throws if not initialized)
- `registerComponent(key, component)` - Add component to registry
- `unregisterComponent(key)` - Remove from registry
- `setComponents(components)` - Replace entire registry
- `getComponent(key)` - Get component by key
- `setFallbackComponent(component)` - Set fallback
- `isSyncEnabled()` - Check if visual editor sync is enabled

### CLI Package (@localess/cli)

**Status**: Early development - only `login` command implemented.

Built with Commander.js. Entry point: `src/index.ts` with shebang `#!/usr/bin/env node`.

## Content Data Model

**Common Structure**:
- `_id: string` - Unique identifier
- `_schema: string` or `schema: string` - Component type identifier (used for React mapping)
- Additional fields vary by content type

**Type Pattern**:
```typescript
Content<T extends ContentData>
```
Where `T` is your custom content shape.

**Content Types**:
- `ContentData` - Base content structure
- `ContentAsset` - Asset metadata with `uri`
- `ContentRichText` - TipTap document structure
- `ContentReference` - Reference to other content
- `Links` - Collection of content links
- `Translations` - Localization data

## Key Conventions

### Schema Naming Convention

The `_schema` or `schema` field must match the key in the React components registry. Use lowercase hyphenated names:
```typescript
components: {
  'page': Page,
  'hero-section': HeroSection,
  'nav-menu': NavMenu,
}
```

### Editable Attributes Pattern

When `enableSync: true`, always spread editable attributes on the root element and field elements:
```tsx
<article {...llEditable(data)}>
  <h1 {...llEditableField('title')}>{data.title}</h1>
</article>
```

### Module Exports Pattern

All packages use dual exports (CJS + ESM):
```json
"exports": {
  ".": {
    "types": "./dist/index.d.ts",
    "import": "./dist/index.mjs",
    "require": "./dist/index.js"
  }
}
```

### TypeScript Configuration

- `target: "ESNext"`
- `module: "ESNext"`
- `moduleResolution: "Bundler"`
- `strict: true` with `noImplicitAny: false`
- Source maps enabled

### Version Management

Packages follow semantic versioning:
- `@localess/client` and `@localess/react`: v0.9.2
- `@localess/cli`: v0.0.1 (early stage)

## Common Patterns

### Server-Side Data Fetching (Next.js Example)

```typescript
// Server Component or getServerSideProps
const client = localessClient({ origin, spaceId, token })
const content = await client.getContentBySlug<PageData>('home', {
  locale: 'en',
  resolveReference: true
})
```

### React Visual Editor Sync

```typescript
// Initialize once at app startup
localessInit({
  origin: process.env.LOCALESS_ORIGIN,
  spaceId: process.env.LOCALESS_SPACE_ID,
  token: process.env.LOCALESS_TOKEN,
  enableSync: true,
  components: componentRegistry,
})

// In component, listen for changes
useEffect(() => {
  if (window.localess) {
    const handler = (event) => {
      if (event.type === 'input' || event.type === 'change') {
        setPageData(event.data)
      }
    }
    window.localess.on(['input', 'change'], handler)
    return () => window.localess.off(['input', 'change'], handler)
  }
}, [])
```

### Nested Components Pattern

Content often has nested structures. Use recursive `LocalessComponent`:
```tsx
<div {...llEditable(data)}>
  {data.sections?.map(section => (
    <LocalessComponent key={section._id} data={section} links={links} />
  ))}
</div>
```

### Cache Control

Adjust caching based on update frequency:
```typescript
// Frequently changing content
localessClient({ cacheTTL: 60000 }) // 1 minute

// Static content
localessClient({ cacheTTL: 3600000 }) // 1 hour

// No caching (draft mode)
localessClient({ cacheTTL: false })
```
