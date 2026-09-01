import type { LocalessSchemaConfig, SchemaDefinition } from './define';

const SCHEMA_ID_PATTERN = /^[a-zA-Z][a-zA-Z0-9]+$/;
const FIELD_NAME_PATTERN = /^[a-z][a-zA-Z0-9_]*[a-zA-Z0-9]$/;
const ENUM_VALUE_PATTERN = /^[a-zA-Z]$|^[a-zA-Z][a-zA-Z0-9-_]*[a-zA-Z0-9]$/;

const RESERVED_SCHEMA_IDS = [
  'Translations',
  'Links',
  'ContentMetadata',
  'ContentReference',
  'ContentRichText',
  'ContentLink',
  'ContentData',
  'ContentAsset',
  'Content',
];
const RESERVED_FIELD_NAMES = ['_id', '_schema', 'schema'];

export interface ValidationIssue {
  severity: 'error' | 'warning';
  code: string;
  path: string;
  message: string;
}

export interface ValidationResult {
  ok: boolean;
  issues: ValidationIssue[];
}

/**
 * Validate a schema config against the Localess authoring rules (ID/name patterns, reserved
 * names, length limits, reference resolution). Non-throwing; `ok` is false only when at least
 * one error-severity issue is present — warnings alone don't fail validation.
 */
export function validate(config: LocalessSchemaConfig): ValidationResult {
  const issues: ValidationIssue[] = [];
  const error = (code: string, path: string, message: string) => issues.push({ severity: 'error', code, path, message });
  const byId = new Map<string, SchemaDefinition>();
  for (const schema of config.schemas) byId.set(schema.id, schema);

  for (const schema of config.schemas) {
    const path = schema.id;
    if (schema.id.length < 2 || schema.id.length > 50 || !SCHEMA_ID_PATTERN.test(schema.id)) {
      error('schema/invalid-id', path, `Schema id '${schema.id}' must match ${SCHEMA_ID_PATTERN} and be 2-50 characters`);
    }
    if (RESERVED_SCHEMA_IDS.some(it => it.toLowerCase() === schema.id.toLowerCase())) {
      error('schema/reserved-id', path, `Schema id '${schema.id}' is reserved`);
    }
    if (schema.displayName && schema.displayName.length > 50) {
      error('schema/display-name-too-long', path, 'displayName exceeds 50 characters');
    }
    if (schema.description && schema.description.length > 250) {
      error('schema/description-too-long', path, 'description exceeds 250 characters');
    }
    for (const label of schema.labels ?? []) {
      if (label.length < 2 || label.length > 50 || label.includes(' ')) {
        error('schema/invalid-label', path, `Label '${label}' must be 2-50 characters without spaces`);
      }
    }

    if (schema.type === 'ENUM') {
      for (const value of schema.values ?? []) {
        if (value.name.length < 1 || value.name.length > 50) {
          error('enum/invalid-value-name', `${path}.${value.name}`, 'Enum value name must be 1-50 characters');
        }
        if (value.value.length < 1 || value.value.length > 50 || !ENUM_VALUE_PATTERN.test(value.value)) {
          error('enum/invalid-value', `${path}.${value.name}`, `Enum value '${value.value}' is invalid`);
        }
      }
      continue;
    }

    // ROOT | NODE
    const fieldNames = new Set((schema.fields ?? []).map(it => it.name));
    if (schema.previewField && !fieldNames.has(schema.previewField)) {
      error('schema/unknown-preview-field', path, `previewField '${schema.previewField}' does not exist on '${schema.id}'`);
    }
    for (const field of schema.fields ?? []) {
      const fieldPath = `${path}.${field.name}`;
      if (field.name.length < 2 || field.name.length > 30 || !FIELD_NAME_PATTERN.test(field.name) || field.name.includes('_i18n_')) {
        error('field/invalid-name', fieldPath, `Field name '${field.name}' must be camelCase, 2-30 characters, without '_i18n_'`);
      }
      if (RESERVED_FIELD_NAMES.some(it => it.toLowerCase() === field.name.toLowerCase())) {
        error('field/reserved-name', fieldPath, `Field name '${field.name}' is reserved`);
      }
      if (field.displayName && field.displayName.length > 30) {
        error('field/display-name-too-long', fieldPath, 'Field displayName exceeds 30 characters');
      }
      if (field.description && field.description.length > 250) {
        error('field/description-too-long', fieldPath, 'Field description exceeds 250 characters');
      }
      if (field.defaultValue && field.defaultValue.length > 250) {
        error('field/default-value-too-long', fieldPath, 'Field defaultValue exceeds 250 characters');
      }
      if (field.kind === 'OPTION' || field.kind === 'OPTIONS') {
        const source = byId.get(field.source);
        if (!source) {
          error('field/unresolved-source', fieldPath, `source '${field.source}' does not resolve to a schema in the config`);
        } else if (source.type !== 'ENUM') {
          error('field/source-not-enum', fieldPath, `source '${field.source}' must be an ENUM schema`);
        }
      }
      if (field.kind === 'SCHEMA' || field.kind === 'SCHEMAS') {
        for (const ref of field.schemas ?? []) {
          const target = byId.get(ref);
          if (!target) {
            error('field/unresolved-schema-ref', fieldPath, `schemas ref '${ref}' does not resolve to a schema in the config`);
          } else if (target.type === 'ENUM') {
            error('field/schema-ref-is-enum', fieldPath, `schemas ref '${ref}' must be a ROOT or NODE schema, not an ENUM`);
          }
        }
      }
    }
  }

  return { ok: !issues.some(it => it.severity === 'error'), issues };
}
