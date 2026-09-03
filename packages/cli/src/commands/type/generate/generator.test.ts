import { describe, expect, it } from 'vitest';

import { SchemaExport } from '../../../models';
import { generateTypes, toPascalCase } from './generator';

// ---------------------------------------------------------------------------
// toPascalCase
// ---------------------------------------------------------------------------

describe('toPascalCase', () => {
  it('converts hyphenated string', () => {
    expect(toPascalCase('hero-section')).toBe('HeroSection');
  });

  it('converts underscored string', () => {
    expect(toPascalCase('hero_section')).toBe('HeroSection');
  });

  it('converts space-separated string', () => {
    expect(toPascalCase('hero section')).toBe('HeroSection');
  });

  it('uppercases single lowercase word', () => {
    expect(toPascalCase('page')).toBe('Page');
  });

  it('leaves already PascalCase string unchanged', () => {
    expect(toPascalCase('MyComponent')).toBe('MyComponent');
  });

  it('handles mixed delimiters', () => {
    expect(toPascalCase('nav-menu_item')).toBe('NavMenuItem');
  });
});

// ---------------------------------------------------------------------------
// generateTypes – preamble & ContentData
// ---------------------------------------------------------------------------

describe('generateTypes – preamble', () => {
  it('emits preamble with built-in interfaces for empty schemas', () => {
    const result = generateTypes([]);
    expect(result).toContain('export interface ContentAsset');
    expect(result).toContain('export interface ContentLink');
    expect(result).toContain('export interface ContentReference');
    expect(result).toContain('export interface ContentRichText');
  });

  it('applies prefix to all preamble interfaces', () => {
    const result = generateTypes([], 'LL');
    expect(result).toContain('export interface LLContentAsset');
    expect(result).toContain('export interface LLContentLink');
    expect(result).toContain('export interface LLContentReference');
    expect(result).toContain('export interface LLContentRichText');
    expect(result).not.toContain('export interface ContentAsset');
  });

  it('emits ContentData = unknown when there are no schemas', () => {
    const result = generateTypes([]);
    expect(result).toContain('export type ContentData = unknown;');
  });

  it('emits ContentData = unknown when all schemas are NODE type', () => {
    const schemas: SchemaExport[] = [{ id: 'teaser', type: 'NODE', fields: [] }];
    const result = generateTypes(schemas);
    expect(result).toContain('export type ContentData = unknown;');
  });
});

// ---------------------------------------------------------------------------
// generateTypes – ENUM schemas
// ---------------------------------------------------------------------------

describe('generateTypes – ENUM schema', () => {
  it('generates a union type from enum values', () => {
    const schemas: SchemaExport[] = [
      {
        id: 'color',
        type: 'ENUM',
        values: [
          { name: 'Red', value: 'red' },
          { name: 'Blue', value: 'blue' },
        ],
      },
    ];
    const result = generateTypes(schemas);
    expect(result).toContain("export type Color = 'red' | 'blue';");
  });

  it('generates string fallback for enum with no values', () => {
    const schemas: SchemaExport[] = [{ id: 'color', type: 'ENUM', values: [] }];
    const result = generateTypes(schemas);
    expect(result).toContain('export type Color = string;');
  });

  it('generates string fallback for enum with undefined values', () => {
    const schemas: SchemaExport[] = [{ id: 'color', type: 'ENUM' }];
    const result = generateTypes(schemas);
    expect(result).toContain('export type Color = string;');
  });

  it('includes JSDoc when enum has a description', () => {
    const schemas: SchemaExport[] = [{ id: 'color', type: 'ENUM', description: 'Brand colours', values: [{ name: 'Red', value: 'red' }] }];
    const result = generateTypes(schemas);
    expect(result).toContain('* Brand colours');
    expect(result).toContain("export type Color = 'red';");
  });

  it('applies prefix to enum type name', () => {
    const schemas: SchemaExport[] = [{ id: 'status', type: 'ENUM', values: [{ name: 'Active', value: 'active' }] }];
    const result = generateTypes(schemas, 'LL');
    expect(result).toContain("export type LLStatus = 'active';");
  });
});

// ---------------------------------------------------------------------------
// generateTypes – component schemas (ROOT / NODE)
// ---------------------------------------------------------------------------

describe('generateTypes – component schema', () => {
  it('generates an interface for a ROOT component', () => {
    const schemas: SchemaExport[] = [{ id: 'page', type: 'ROOT', fields: [] }];
    const result = generateTypes(schemas);
    expect(result).toContain('export interface Page {');
    expect(result).toContain("  _schema: 'page';");
    expect(result).toContain('  _id: string;');
  });

  it('adds ROOT type to ContentData union', () => {
    const schemas: SchemaExport[] = [{ id: 'page', type: 'ROOT', fields: [] }];
    const result = generateTypes(schemas);
    expect(result).toContain('export type ContentData = Page;');
  });

  it('joins multiple ROOT types in ContentData union', () => {
    const schemas: SchemaExport[] = [
      { id: 'page', type: 'ROOT', fields: [] },
      { id: 'article', type: 'ROOT', fields: [] },
    ];
    const result = generateTypes(schemas);
    expect(result).toContain('export type ContentData = Page | Article;');
  });

  it('does not add NODE type to ContentData union', () => {
    const schemas: SchemaExport[] = [{ id: 'teaser', type: 'NODE', fields: [] }];
    const result = generateTypes(schemas);
    // Interface is still generated, but ContentData must not reference it
    expect(result).toContain('export interface Teaser {');
    expect(result).toContain('export type ContentData = unknown;');
    expect(result).not.toContain('ContentData = Teaser');
  });

  it('includes JSDoc when component has a description', () => {
    const schemas: SchemaExport[] = [{ id: 'page', type: 'ROOT', description: 'A full page', fields: [] }];
    const result = generateTypes(schemas);
    expect(result).toContain('* A full page');
  });

  it('generates interface with no custom fields (only _id and _schema)', () => {
    const schemas: SchemaExport[] = [{ id: 'empty', type: 'NODE' }];
    const result = generateTypes(schemas);
    expect(result).toContain('export interface Empty {');
    expect(result).toContain('  _id: string;');
    expect(result).toContain("  _schema: 'empty';");
  });
});

// ---------------------------------------------------------------------------
// generateTypes – field sorting
// ---------------------------------------------------------------------------

describe('generateTypes – field sorting', () => {
  it('sorts fields alphabetically by name', () => {
    const schemas: SchemaExport[] = [
      {
        id: 'card',
        type: 'NODE',
        fields: [
          { name: 'zebra', kind: 'TEXT' },
          { name: 'alpha', kind: 'TEXT' },
          { name: 'middle', kind: 'TEXT' },
        ],
      },
    ];
    const result = generateTypes(schemas);
    const alphaPos = result.indexOf('  alpha?:');
    const middlePos = result.indexOf('  middle?:');
    const zebraPos = result.indexOf('  zebra?:');
    expect(alphaPos).toBeLessThan(middlePos);
    expect(middlePos).toBeLessThan(zebraPos);
  });

  it('keeps _id and _schema before sorted fields', () => {
    const schemas: SchemaExport[] = [{ id: 'card', type: 'NODE', fields: [{ name: 'aaa', kind: 'TEXT' }] }];
    const result = generateTypes(schemas);
    const idPos = result.indexOf('  _id:');
    const schemaPos = result.indexOf('  _schema:');
    const fieldPos = result.indexOf('  aaa?:');
    expect(idPos).toBeLessThan(schemaPos);
    expect(schemaPos).toBeLessThan(fieldPos);
  });
});

// ---------------------------------------------------------------------------
// generateTypes – field optionality and descriptions
// ---------------------------------------------------------------------------

describe('generateTypes – field optionality', () => {
  it('emits required field without ?', () => {
    const schemas: SchemaExport[] = [{ id: 'card', type: 'NODE', fields: [{ name: 'title', kind: 'TEXT', required: true }] }];
    const result = generateTypes(schemas);
    expect(result).toContain('  title: string;');
    expect(result).not.toContain('  title?: string;');
  });

  it('emits optional field with ?', () => {
    const schemas: SchemaExport[] = [{ id: 'card', type: 'NODE', fields: [{ name: 'subtitle', kind: 'TEXT', required: false }] }];
    const result = generateTypes(schemas);
    expect(result).toContain('  subtitle?: string;');
  });

  it('emits JSDoc comment for field with description', () => {
    const schemas: SchemaExport[] = [{ id: 'card', type: 'NODE', fields: [{ name: 'title', kind: 'TEXT', description: 'Card heading' }] }];
    const result = generateTypes(schemas);
    expect(result).toContain('  /** Card heading */');
  });
});

// ---------------------------------------------------------------------------
// generateTypes – field kind to TypeScript type mapping
// ---------------------------------------------------------------------------

describe('generateTypes – field kind mapping', () => {
  it.each([
    ['TEXT', 'string'],
    ['TEXTAREA', 'string'],
    ['MARKDOWN', 'string'],
    ['COLOR', 'string'],
    ['DATE', 'string'],
    ['DATETIME', 'string'],
    ['NUMBER', 'number'],
    ['BOOLEAN', 'boolean'],
    ['RICH_TEXT', 'ContentRichText'],
    ['LINK', 'ContentLink'],
    ['ASSET', 'ContentAsset'],
    ['ASSETS', 'ContentAsset[]'],
    ['REFERENCE', 'ContentReference'],
    ['REFERENCES', 'ContentReference[]'],
  ] as const)('maps %s to %s', (kind, expectedType) => {
    const schemas: SchemaExport[] = [{ id: 'comp', type: 'NODE', fields: [{ name: 'field', kind } as never] }];
    expect(generateTypes(schemas)).toContain(`  field?: ${expectedType};`);
  });

  it('maps OPTION with source to referenced type', () => {
    const schemas: SchemaExport[] = [{ id: 'comp', type: 'NODE', fields: [{ name: 'color', kind: 'OPTION', source: 'brand-color' }] }];
    expect(generateTypes(schemas)).toContain('  color?: BrandColor;');
  });

  it('maps OPTION without source to string', () => {
    const schemas: SchemaExport[] = [{ id: 'comp', type: 'NODE', fields: [{ name: 'color', kind: 'OPTION', source: '' }] }];
    expect(generateTypes(schemas)).toContain('  color?: string;');
  });

  it('maps OPTIONS with source to referenced type array', () => {
    const schemas: SchemaExport[] = [{ id: 'comp', type: 'NODE', fields: [{ name: 'tags', kind: 'OPTIONS', source: 'tag-type' }] }];
    expect(generateTypes(schemas)).toContain('  tags?: TagType[];');
  });

  it('maps OPTIONS without source to string[]', () => {
    const schemas: SchemaExport[] = [{ id: 'comp', type: 'NODE', fields: [{ name: 'tags', kind: 'OPTIONS', source: '' }] }];
    expect(generateTypes(schemas)).toContain('  tags?: string[];');
  });

  it('maps SCHEMA with single ref to direct type', () => {
    const schemas: SchemaExport[] = [{ id: 'comp', type: 'NODE', fields: [{ name: 'hero', kind: 'SCHEMA', schemas: ['hero-section'] }] }];
    expect(generateTypes(schemas)).toContain('  hero?: HeroSection;');
  });

  it('maps SCHEMA with multiple refs to union type', () => {
    const schemas: SchemaExport[] = [
      { id: 'comp', type: 'NODE', fields: [{ name: 'block', kind: 'SCHEMA', schemas: ['hero-section', 'teaser'] }] },
    ];
    expect(generateTypes(schemas)).toContain('  block?: HeroSection | Teaser;');
  });

  it('maps SCHEMA with no refs to unknown', () => {
    const schemas: SchemaExport[] = [{ id: 'comp', type: 'NODE', fields: [{ name: 'block', kind: 'SCHEMA', schemas: [] }] }];
    expect(generateTypes(schemas)).toContain('  block?: unknown;');
  });

  it('maps SCHEMAS with single ref to Type[]', () => {
    const schemas: SchemaExport[] = [{ id: 'comp', type: 'NODE', fields: [{ name: 'items', kind: 'SCHEMAS', schemas: ['card'] }] }];
    expect(generateTypes(schemas)).toContain('  items?: Card[];');
  });

  it('maps SCHEMAS with multiple refs to (Type1 | Type2)[]', () => {
    const schemas: SchemaExport[] = [
      { id: 'comp', type: 'NODE', fields: [{ name: 'items', kind: 'SCHEMAS', schemas: ['card', 'teaser'] }] },
    ];
    expect(generateTypes(schemas)).toContain('  items?: (Card | Teaser)[];');
  });

  it('maps SCHEMAS with no refs to unknown[]', () => {
    const schemas: SchemaExport[] = [{ id: 'comp', type: 'NODE', fields: [{ name: 'items', kind: 'SCHEMAS', schemas: [] }] }];
    expect(generateTypes(schemas)).toContain('  items?: unknown[];');
  });
});

// ---------------------------------------------------------------------------
// generateTypes – prefix propagation through field types
// ---------------------------------------------------------------------------

describe('generateTypes – prefix in field types', () => {
  it('applies prefix to referenced preamble types in fields', () => {
    const schemas: SchemaExport[] = [
      {
        id: 'comp',
        type: 'NODE',
        fields: [
          { name: 'body', kind: 'RICH_TEXT' },
          { name: 'image', kind: 'ASSET' },
          { name: 'link', kind: 'LINK' },
          { name: 'ref', kind: 'REFERENCE' },
        ],
      },
    ];
    const result = generateTypes(schemas, 'LL');
    expect(result).toContain('  body?: LLContentRichText;');
    expect(result).toContain('  image?: LLContentAsset;');
    expect(result).toContain('  link?: LLContentLink;');
    expect(result).toContain('  ref?: LLContentReference;');
  });

  it('applies prefix to SCHEMA/SCHEMAS referenced type names', () => {
    const schemas: SchemaExport[] = [
      {
        id: 'comp',
        type: 'NODE',
        fields: [
          { name: 'hero', kind: 'SCHEMA', schemas: ['hero-section'] },
          { name: 'items', kind: 'SCHEMAS', schemas: ['card', 'teaser'] },
        ],
      },
    ];
    const result = generateTypes(schemas, 'LL');
    expect(result).toContain('  hero?: LLHeroSection;');
    expect(result).toContain('  items?: (LLCard | LLTeaser)[];');
  });

  it('applies prefix to OPTION/OPTIONS referenced type names', () => {
    const schemas: SchemaExport[] = [
      {
        id: 'comp',
        type: 'NODE',
        fields: [
          { name: 'color', kind: 'OPTION', source: 'brand-color' },
          { name: 'tags', kind: 'OPTIONS', source: 'tag-type' },
        ],
      },
    ];
    const result = generateTypes(schemas, 'LL');
    expect(result).toContain('  color?: LLBrandColor;');
    expect(result).toContain('  tags?: LLTagType[];');
  });
});
