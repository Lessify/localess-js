import { describe, expect, it } from 'vitest';

import type {
  AssetMetadata,
  Assets,
  AssetTransformParams,
  Content,
  ContentAsset,
  ContentData,
  ContentLink,
  ContentMetadata,
  ContentReference,
  ContentRichText,
  Links,
  Locale,
  References,
  Space,
  Translations,
} from './index';

describe('@localess/model shapes', () => {
  it('Locale', () => {
    const locale: Locale = { id: 'en', name: 'English' };
    expect(locale.id).toBe('en');
  });

  it('Space', () => {
    const locale: Locale = { id: 'en', name: 'English' };
    const space: Space = {
      id: 'space1',
      name: 'Demo',
      locales: [locale],
      localeFallback: locale,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };
    expect(space.locales).toHaveLength(1);
  });

  it('ContentAsset', () => {
    const asset: ContentAsset = { kind: 'ASSET', uri: 'abc' };
    expect(asset.kind).toBe('ASSET');
  });

  it('ContentLink', () => {
    const link: ContentLink = { kind: 'LINK', target: '_self', type: 'url', uri: 'https://example.com' };
    expect(link.type).toBe('url');
  });

  it('ContentReference', () => {
    const reference: ContentReference = { kind: 'REFERENCE', uri: 'content-1' };
    expect(reference.kind).toBe('REFERENCE');
  });

  it('ContentRichText', () => {
    const richText: ContentRichText = { type: 'doc', content: [{ type: 'paragraph' }] };
    expect(richText.content).toHaveLength(1);
  });

  it('ContentMetadata', () => {
    const metadata: ContentMetadata = {
      createdAt: '2026-01-01T00:00:00.000Z',
      fullSlug: 'home',
      id: 'content-1',
      kind: 'DOCUMENT',
      name: 'Home',
      parentSlug: '',
      slug: 'home',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };
    expect(metadata.kind).toBe('DOCUMENT');
  });

  it('ContentData', () => {
    const data: ContentData = { _id: 'a1', _schema: 'Page', title: 'Hello' };
    expect(data._schema).toBe('Page');
  });

  it('Content', () => {
    const content: Content = {
      createdAt: '2026-01-01T00:00:00.000Z',
      fullSlug: 'home',
      id: 'content-1',
      kind: 'DOCUMENT',
      locale: 'en',
      name: 'Home',
      parentSlug: '',
      slug: 'home',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };
    expect(content.id).toBe('content-1');
    expect(content.locale).toBe('en');
  });

  it('References — what a value carries depends on the endpoint that produced it', () => {
    // For `resolveReference: true` the API strips the raw assets/links/references id arrays, so an
    // entry carries metadata, locale and data only. That is endpoint behaviour, documented on
    // `ContentFetchParams.resolveReference` rather than baked into the shared `References` type.
    const references: References = {
      'author-1': {
        createdAt: '2026-01-01T00:00:00.000Z',
        data: { _id: 'author-1', _schema: 'Author', employer: { kind: 'REFERENCE', uri: 'org-9' } },
        fullSlug: 'authors/jane',
        id: 'author-1',
        kind: 'DOCUMENT',
        locale: 'en',
        name: 'Jane',
        parentSlug: 'authors',
        slug: 'jane',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    };
    // The edge is the `uri` on the REFERENCE field value, not a separate id array.
    expect(references['author-1'].data?.employer.uri).toBe('org-9');
    // Resolution stops at one level, so this endpoint never populates a nested map.
    expect(references['author-1'].references).toBeUndefined();
  });

  it('ContentMetadata has no locale — it types Links and getLinks(), which carry none', () => {
    const metadata: ContentMetadata = {
      createdAt: '2026-01-01T00:00:00.000Z',
      fullSlug: 'home',
      id: 'content-1',
      kind: 'DOCUMENT',
      name: 'Home',
      parentSlug: '',
      slug: 'home',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };
    // @ts-expect-error `locale` belongs on Content, never on ContentMetadata. This line failing to
    // error means someone added it to ContentMetadata, which would wrongly imply that `Links`
    // entries and `getLinks()` results carry a locale.
    expect(metadata.locale).toBeUndefined();
    expect(metadata.id).toBe('content-1');
  });

  it('Links/References/Assets', () => {
    const links: Links = {};
    const references: References = {};
    const assets: Assets = {};
    expect(Object.keys(links)).toHaveLength(0);
    expect(Object.keys(references)).toHaveLength(0);
    expect(Object.keys(assets)).toHaveLength(0);
  });

  it('AssetMetadata', () => {
    const metadata: AssetMetadata = { id: 'asset-1', name: 'hero-image', extension: '.jpg', type: 'image/jpeg' };
    expect(metadata.extension).toBe('.jpg');
  });

  it('AssetTransformParams', () => {
    const params: AssetTransformParams = { w: 800, h: 600, q: 85, f: 'webp' };
    expect(params.f).toBe('webp');
  });

  it('Translations', () => {
    const translations: Translations = { 'nav.home': 'Home' };
    expect(translations['nav.home']).toBe('Home');
  });
});
