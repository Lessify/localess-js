import type { ContentAsset, ContentLink, ContentReference, ContentRichText } from '@localess/model';
import { describe, expectTypeOf, it } from 'vitest';

import { defineConfig, defineEnum, defineSchema } from './define';
import type { InferContent, InferContentData, InferEnum } from './infer';

const ButtonType = defineEnum({
  id: 'ButtonType',
  values: [
    { name: 'Primary', value: 'primary' },
    { name: 'Secondary', value: 'secondary' },
  ],
});

const Button = defineSchema({
  id: 'Button',
  type: 'NODE',
  fields: [
    { name: 'label', kind: 'TEXT', required: true },
    { name: 'kind', kind: 'OPTION', source: ButtonType },
    { name: 'icon', kind: 'ASSET' },
  ],
});

const Section = defineSchema({
  id: 'Section',
  type: 'NODE',
  fields: [{ name: 'body', kind: 'RICH_TEXT' }],
});

const Page = defineSchema({
  id: 'Page',
  type: 'ROOT',
  fields: [
    { name: 'title', kind: 'TEXT', required: true },
    { name: 'count', kind: 'NUMBER' },
    { name: 'published', kind: 'BOOLEAN', required: true },
    { name: 'blocks', kind: 'SCHEMAS', schemas: [Button] },
    { name: 'any', kind: 'SCHEMA' },
  ],
});

const config = defineConfig({ schemas: [Page, Button, Section, ButtonType] });
void config;

const Status = defineEnum({
  id: 'Status',
  values: [
    { name: 'Draft', value: 'draft' },
    { name: 'Published', value: 'published' },
    { name: 'Archived', value: 'archived' },
  ],
});

const EmptyEnum = defineEnum({ id: 'EmptyEnum' });

const Card = defineSchema({
  id: 'Card',
  type: 'NODE',
  fields: [
    { name: 'summary', kind: 'TEXTAREA' },
    { name: 'body', kind: 'MARKDOWN' },
    { name: 'accent', kind: 'COLOR' },
    { name: 'publishedOn', kind: 'DATE' },
    { name: 'updatedAt', kind: 'DATETIME' },
    { name: 'cta', kind: 'LINK' },
    { name: 'gallery', kind: 'ASSETS' },
    { name: 'author', kind: 'REFERENCE' },
    { name: 'related', kind: 'REFERENCES' },
    { name: 'tags', kind: 'OPTIONS', source: Status },
  ],
});

const Site = defineSchema({
  id: 'Site',
  type: 'ROOT',
  fields: [
    { name: 'status', kind: 'OPTION', source: Status },
    { name: 'card', kind: 'SCHEMA', schemas: [Card] },
    { name: 'cards', kind: 'SCHEMAS', schemas: [Card] },
  ],
});

const Feed = defineSchema({
  id: 'Feed',
  type: 'ROOT',
  fields: [{ name: 'title', kind: 'TEXT', required: true }],
});

const richConfig = defineConfig({ schemas: [Status, EmptyEnum, Card, Site, Feed] });
void richConfig;

const NoNodesRoot = defineSchema({
  id: 'NoNodesRoot',
  type: 'ROOT',
  fields: [{ name: 'any', kind: 'SCHEMA' }],
});
const noNodesConfig = defineConfig({ schemas: [NoNodesRoot] });
void noNodesConfig;

const Orphan = defineSchema({
  id: 'Orphan',
  type: 'NODE',
  fields: [{ name: 'kind', kind: 'OPTION', source: 'DoesNotExist' }],
});
const orphanConfig = defineConfig({ schemas: [Orphan] });
void orphanConfig;

describe('InferEnum', () => {
  it('is the literal union of values', () => {
    expectTypeOf<InferEnum<typeof ButtonType>>().toEqualTypeOf<'primary' | 'secondary'>();
    expectTypeOf<InferEnum<typeof Status>>().toEqualTypeOf<'draft' | 'published' | 'archived'>();
  });

  it('falls back to string when values are absent', () => {
    expectTypeOf<InferEnum<typeof EmptyEnum>>().toEqualTypeOf<string>();
  });
});

describe('comprehensive NODE field coverage', () => {
  type CardContent = InferContent<typeof Card, typeof richConfig>;

  it('maps every remaining primitive-like kind to string', () => {
    expectTypeOf<CardContent['summary']>().toEqualTypeOf<string | undefined>();
    expectTypeOf<CardContent['body']>().toEqualTypeOf<string | undefined>();
    expectTypeOf<CardContent['accent']>().toEqualTypeOf<string | undefined>();
    expectTypeOf<CardContent['publishedOn']>().toEqualTypeOf<string | undefined>();
    expectTypeOf<CardContent['updatedAt']>().toEqualTypeOf<string | undefined>();
  });

  it('maps LINK, ASSETS, REFERENCE, REFERENCES to their structural content types', () => {
    expectTypeOf<CardContent['cta']>().toEqualTypeOf<ContentLink | undefined>();
    expectTypeOf<CardContent['gallery']>().toEqualTypeOf<ContentAsset[] | undefined>();
    expectTypeOf<CardContent['author']>().toEqualTypeOf<ContentReference | undefined>();
    expectTypeOf<CardContent['related']>().toEqualTypeOf<ContentReference[] | undefined>();
  });

  it('resolves OPTIONS to an array of the referenced enum literal union', () => {
    expectTypeOf<CardContent['tags']>().toEqualTypeOf<('draft' | 'published' | 'archived')[] | undefined>();
  });
});

describe('ROOT schema exercising all field kinds', () => {
  type SiteContent = InferContent<typeof Site, typeof richConfig>;
  type CardContent = InferContent<typeof Card, typeof richConfig>;

  it('resolves OPTION and restricted SCHEMA/SCHEMAS against the referenced definitions', () => {
    expectTypeOf<SiteContent['status']>().toEqualTypeOf<'draft' | 'published' | 'archived' | undefined>();
    expectTypeOf<SiteContent['card']>().toEqualTypeOf<CardContent | undefined>();
    expectTypeOf<SiteContent['cards']>().toEqualTypeOf<CardContent[] | undefined>();
  });
});

describe('fallback branches', () => {
  it('OPTION with an unresolvable source degrades to string', () => {
    type OrphanContent = InferContent<typeof Orphan, typeof orphanConfig>;
    expectTypeOf<OrphanContent['kind']>().toEqualTypeOf<string | undefined>();
  });

  it('unrestricted SCHEMA in a config with no NODE schemas degrades to the minimal shape', () => {
    type NoNodesContent = InferContent<typeof NoNodesRoot, typeof noNodesConfig>;
    expectTypeOf<NonNullable<NoNodesContent['any']>>().toEqualTypeOf<{ _id: string; _schema: string }>();
  });

  it('InferContentData unions every ROOT schema in the config', () => {
    type Content = InferContentData<typeof richConfig>;
    expectTypeOf<Content['_schema']>().toEqualTypeOf<'Site' | 'Feed'>();
  });
});

describe('InferContent', () => {
  type ButtonContent = InferContent<typeof Button, typeof config>;
  type PageContent = InferContent<typeof Page, typeof config>;

  it('adds _id and literal _schema', () => {
    expectTypeOf<ButtonContent['_id']>().toEqualTypeOf<string>();
    expectTypeOf<ButtonContent['_schema']>().toEqualTypeOf<'Button'>();
  });

  it('splits required vs optional and maps primitives', () => {
    expectTypeOf<PageContent['title']>().toEqualTypeOf<string>();
    expectTypeOf<PageContent['published']>().toEqualTypeOf<boolean>();
    expectTypeOf<PageContent['count']>().toEqualTypeOf<number | undefined>();
  });

  it('resolves OPTION to the referenced enum literal union', () => {
    expectTypeOf<ButtonContent['kind']>().toEqualTypeOf<'primary' | 'secondary' | undefined>();
  });

  it('maps structural content types', () => {
    expectTypeOf<ButtonContent['icon']>().toEqualTypeOf<ContentAsset | undefined>();
    type SectionContent = InferContent<typeof Section, typeof config>;
    expectTypeOf<SectionContent['body']>().toEqualTypeOf<ContentRichText | undefined>();
  });

  it('SCHEMAS resolves to the allowed schemas content array; unrestricted SCHEMA to all NODE content', () => {
    expectTypeOf<PageContent['blocks']>().toEqualTypeOf<ButtonContent[] | undefined>();
    type AnyBlock = NonNullable<PageContent['any']>;
    expectTypeOf<AnyBlock['_schema']>().toEqualTypeOf<'Button' | 'Section'>();
  });
});

describe('InferContentData', () => {
  it('is the union of ROOT content types', () => {
    type Content = InferContentData<typeof config>;
    expectTypeOf<Content['_schema']>().toEqualTypeOf<'Page'>();
  });
});
