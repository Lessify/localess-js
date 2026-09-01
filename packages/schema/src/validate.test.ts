import { describe, expect, it } from 'vitest';

import { defineConfig, defineEnum, defineSchema } from './define';
import { validate } from './validate';

function issuesOf(config: Parameters<typeof validate>[0]) {
  return validate(config).issues.map(it => it.code);
}

describe('validate', () => {
  it('passes a well-formed config', () => {
    const ButtonType = defineEnum({ id: 'ButtonType', values: [{ name: 'P', value: 'primary' }] });
    const Button = defineSchema({
      id: 'Button',
      type: 'NODE',
      previewField: 'label',
      fields: [
        { name: 'label', kind: 'TEXT', required: true },
        { name: 'kind', kind: 'OPTION', source: ButtonType },
      ],
    });
    const result = validate(defineConfig({ schemas: [Button, ButtonType] }));
    expect(result.ok).toBe(true);
    expect(result.issues).toEqual([]);
  });

  it('rejects invalid and reserved schema ids', () => {
    expect(issuesOf({ schemas: [{ id: '1Bad', type: 'NODE' }] })).toContain('schema/invalid-id');
    expect(issuesOf({ schemas: [{ id: 'ContentData', type: 'NODE' }] })).toContain('schema/reserved-id');
    expect(issuesOf({ schemas: [{ id: 'x', type: 'NODE' }] })).toContain('schema/invalid-id'); // length < 2
  });

  it('reserved id check is case-insensitive', () => {
    expect(issuesOf({ schemas: [{ id: 'contentdata', type: 'NODE' }] })).toContain('schema/reserved-id');
  });

  it('rejects invalid, reserved, and _i18n_ field names', () => {
    const bad = (name: string) => ({ schemas: [{ id: 'Comp', type: 'NODE' as const, fields: [{ name, kind: 'TEXT' as const }] }] });
    expect(issuesOf(bad('Title'))).toContain('field/invalid-name');
    expect(issuesOf(bad('_id'))).toContain('field/reserved-name');
    expect(issuesOf(bad('title_i18n_x'))).toContain('field/invalid-name');
    expect(issuesOf(bad('ok'))).toEqual([]);
  });

  it('enforces length limits', () => {
    expect(issuesOf({ schemas: [{ id: 'Comp', type: 'NODE', displayName: 'x'.repeat(51) }] })).toContain('schema/display-name-too-long');
    expect(issuesOf({ schemas: [{ id: 'Comp', type: 'NODE', description: 'x'.repeat(251) }] })).toContain('schema/description-too-long');
    expect(
      issuesOf({ schemas: [{ id: 'Comp', type: 'NODE', fields: [{ name: 'ok', kind: 'TEXT', description: 'x'.repeat(251) }] }] })
    ).toContain('field/description-too-long');
    expect(
      issuesOf({ schemas: [{ id: 'Comp', type: 'NODE', fields: [{ name: 'ok', kind: 'TEXT', displayName: 'x'.repeat(31) }] }] })
    ).toContain('field/display-name-too-long');
    expect(
      issuesOf({ schemas: [{ id: 'Comp', type: 'NODE', fields: [{ name: 'ok', kind: 'TEXT', defaultValue: 'x'.repeat(251) }] }] })
    ).toContain('field/default-value-too-long');
  });

  it('rejects invalid labels on schemas', () => {
    expect(issuesOf({ schemas: [{ id: 'Comp', type: 'NODE', labels: ['a b'] }] })).toContain('schema/invalid-label');
    expect(issuesOf({ schemas: [{ id: 'Comp', type: 'NODE', labels: ['x'] }] })).toContain('schema/invalid-label');
    expect(issuesOf({ schemas: [{ id: 'Comp', type: 'NODE', labels: ['ok'] }] })).toEqual([]);
  });

  it('validates ENUM value names and values', () => {
    expect(issuesOf({ schemas: [{ id: 'Kind', type: 'ENUM', values: [{ name: '', value: 'a' }] }] })).toContain('enum/invalid-value-name');
    expect(issuesOf({ schemas: [{ id: 'Kind', type: 'ENUM', values: [{ name: 'A', value: 'a b' }] }] })).toContain('enum/invalid-value');
    expect(issuesOf({ schemas: [{ id: 'Kind', type: 'ENUM', values: [{ name: 'A', value: 'a' }] }] })).toEqual([]);
    // single-character values are allowed
    expect(issuesOf({ schemas: [{ id: 'Kind', type: 'ENUM', values: [{ name: 'A', value: 'a' }] }] })).toEqual([]);
  });

  it('cross-checks references', () => {
    // OPTION source must resolve to an ENUM in the config
    expect(issuesOf({ schemas: [{ id: 'Comp', type: 'NODE', fields: [{ name: 'kind', kind: 'OPTION', source: 'Missing' }] }] })).toContain(
      'field/unresolved-source'
    );
    // source pointing at a component is an error
    expect(
      issuesOf({
        schemas: [
          { id: 'Other', type: 'NODE' },
          { id: 'Comp', type: 'NODE', fields: [{ name: 'kind', kind: 'OPTION', source: 'Other' }] },
        ],
      })
    ).toContain('field/source-not-enum');
    // OPTIONS behaves the same as OPTION
    expect(
      issuesOf({ schemas: [{ id: 'Comp', type: 'NODE', fields: [{ name: 'kinds', kind: 'OPTIONS', source: 'Missing' }] }] })
    ).toContain('field/unresolved-source');
    // SCHEMA/SCHEMAS refs must resolve to components
    expect(
      issuesOf({ schemas: [{ id: 'Comp', type: 'NODE', fields: [{ name: 'blocks', kind: 'SCHEMAS', schemas: ['Missing'] }] }] })
    ).toContain('field/unresolved-schema-ref');
    expect(
      issuesOf({ schemas: [{ id: 'Comp', type: 'NODE', fields: [{ name: 'hero', kind: 'SCHEMA', schemas: ['Missing'] }] }] })
    ).toContain('field/unresolved-schema-ref');
    // SCHEMA/SCHEMAS refs pointing at an ENUM are errors
    expect(
      issuesOf({
        schemas: [
          { id: 'Kind', type: 'ENUM' },
          { id: 'Comp', type: 'NODE', fields: [{ name: 'blocks', kind: 'SCHEMAS', schemas: ['Kind'] }] },
        ],
      })
    ).toContain('field/schema-ref-is-enum');
    // previewField must exist
    expect(issuesOf({ schemas: [{ id: 'Comp', type: 'NODE', previewField: 'nope', fields: [] }] })).toContain(
      'schema/unknown-preview-field'
    );
    expect(issuesOf({ schemas: [{ id: 'Comp', type: 'NODE', previewField: 'label', fields: [{ name: 'label', kind: 'TEXT' }] }] })).toEqual(
      []
    );
  });

  it('validates every schema in the config, not just the first', () => {
    const issues = issuesOf({
      schemas: [
        { id: '1Bad', type: 'NODE' },
        { id: '2AlsoBad', type: 'NODE' },
      ],
    });
    expect(issues.filter(code => code === 'schema/invalid-id')).toHaveLength(2);
  });

  it('ok is false only when there is at least one error (issues can be non-empty with only warnings)', () => {
    const result = validate({ schemas: [{ id: 'Comp', type: 'NODE' }] });
    expect(result.ok).toBe(true);
  });
});
