/**
 * Wire model for Localess schemas. Every value here uses the exact strings the Localess
 * backend stores and serves, so definitions round-trip through pull/push without mapping.
 */

/** Schema kind: ROOT = content type, NODE = nested component, ENUM = fixed option set. */
export type SchemaType = 'ROOT' | 'NODE' | 'ENUM';

/** Field kind discriminator — exact backend enum values. */
export type SchemaFieldKind =
  | 'TEXT'
  | 'TEXTAREA'
  | 'RICH_TEXT'
  | 'MARKDOWN'
  | 'NUMBER'
  | 'COLOR'
  | 'DATE'
  | 'DATETIME'
  | 'BOOLEAN'
  | 'OPTION'
  | 'OPTIONS'
  | 'LINK'
  | 'REFERENCE'
  | 'REFERENCES'
  | 'ASSET'
  | 'ASSETS'
  | 'SCHEMA'
  | 'SCHEMAS';

/** Restriction for ASSET/ASSETS fields. */
export type AssetFileType = 'ANY' | 'IMAGE' | 'VIDEO' | 'TEXT' | 'AUDIO' | 'APPLICATION';

/** A single named value of an ENUM schema. */
export interface SchemaEnumValue {
  name: string;
  value: string;
}

/** Properties shared by every schema field kind. */
export interface SchemaFieldBase {
  name: string;
  kind: SchemaFieldKind;
  displayName?: string;
  required?: boolean;
  description?: string;
  defaultValue?: string;
  translatable?: boolean;
}

export interface SchemaFieldText extends SchemaFieldBase {
  kind: 'TEXT';
  minLength?: number;
  maxLength?: number;
}

export interface SchemaFieldTextarea extends SchemaFieldBase {
  kind: 'TEXTAREA';
  minLength?: number;
  maxLength?: number;
}

export interface SchemaFieldRichText extends SchemaFieldBase {
  kind: 'RICH_TEXT';
  minLength?: number;
  maxLength?: number;
}

export interface SchemaFieldMarkdown extends SchemaFieldBase {
  kind: 'MARKDOWN';
  minLength?: number;
  maxLength?: number;
}

export interface SchemaFieldNumber extends SchemaFieldBase {
  kind: 'NUMBER';
  minValue?: number;
  maxValue?: number;
}

export interface SchemaFieldColor extends SchemaFieldBase {
  kind: 'COLOR';
}

export interface SchemaFieldDate extends SchemaFieldBase {
  kind: 'DATE';
}

export interface SchemaFieldDateTime extends SchemaFieldBase {
  kind: 'DATETIME';
}

export interface SchemaFieldBoolean extends SchemaFieldBase {
  kind: 'BOOLEAN';
}

export interface SchemaFieldSchema extends SchemaFieldBase {
  kind: 'SCHEMA';
  /** Allowed schema ids; unrestricted when absent. */
  schemas?: string[];
}

export interface SchemaFieldSchemas extends SchemaFieldBase {
  kind: 'SCHEMAS';
  /** Allowed schema ids; unrestricted when absent. */
  schemas?: string[];
}

export interface SchemaFieldOption extends SchemaFieldBase {
  kind: 'OPTION';
  /** Id of the ENUM schema providing the options. */
  source: string;
}

export interface SchemaFieldOptions extends SchemaFieldBase {
  kind: 'OPTIONS';
  /** Id of the ENUM schema providing the options. */
  source: string;
  minValues?: number;
  maxValues?: number;
}

export interface SchemaFieldLink extends SchemaFieldBase {
  kind: 'LINK';
}

export interface SchemaFieldReference extends SchemaFieldBase {
  kind: 'REFERENCE';
  path?: string;
}

export interface SchemaFieldReferences extends SchemaFieldBase {
  kind: 'REFERENCES';
  path?: string;
}

export interface SchemaFieldAsset extends SchemaFieldBase {
  kind: 'ASSET';
  fileTypes?: AssetFileType[];
  fileType?: AssetFileType;
}

export interface SchemaFieldAssets extends SchemaFieldBase {
  kind: 'ASSETS';
  fileTypes?: AssetFileType[];
  fileType?: AssetFileType;
}

/** Discriminated union of every field kind. */
export type SchemaField =
  | SchemaFieldText
  | SchemaFieldTextarea
  | SchemaFieldRichText
  | SchemaFieldMarkdown
  | SchemaFieldNumber
  | SchemaFieldColor
  | SchemaFieldDate
  | SchemaFieldDateTime
  | SchemaFieldBoolean
  | SchemaFieldSchema
  | SchemaFieldSchemas
  | SchemaFieldOption
  | SchemaFieldOptions
  | SchemaFieldLink
  | SchemaFieldReference
  | SchemaFieldReferences
  | SchemaFieldAsset
  | SchemaFieldAssets;

/** Export (wire) representation of a ROOT/NODE schema — matches the Localess backend SchemaExport. */
export interface SchemaComponentExport {
  id: string;
  type: 'ROOT' | 'NODE';
  displayName?: string;
  description?: string;
  labels?: string[];
  previewField?: string;
  fields?: SchemaField[];
}

/** Export (wire) representation of an ENUM schema. */
export interface SchemaEnumExport {
  id: string;
  type: 'ENUM';
  displayName?: string;
  description?: string;
  labels?: string[];
  values?: SchemaEnumValue[];
}

/** Export (wire) representation of any schema. */
export type SchemaExport = SchemaComponentExport | SchemaEnumExport;
