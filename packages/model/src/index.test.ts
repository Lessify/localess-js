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
      name: 'Home',
      parentSlug: '',
      slug: 'home',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };
    expect(content.id).toBe('content-1');
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
