import type { SchemaComponentExport, SchemaEnumExport, SchemaEnumValue, SchemaField, SchemaFieldKind } from './models';

type Prettify<T> = { [K in keyof T]: T[K] } & {};

/**
 * Deep-readonly view of a wire type. Definitions created with `const` type parameters carry
 * readonly arrays/tuples, which the mutable wire types would reject — every authoring-facing
 * type is therefore expressed through this.
 */
type DeepReadonly<T> = T extends readonly (infer U)[]
  ? readonly DeepReadonly<U>[]
  : T extends object
    ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
    : T;

/** Result of defineEnum — readonly view of the wire SchemaEnumExport. */
export type EnumDefinition = DeepReadonly<SchemaEnumExport>;
/** Result of defineSchema — readonly view of the wire SchemaComponentExport. */
export type ComponentDefinition = DeepReadonly<SchemaComponentExport>;
/** Any schema definition. */
export type SchemaDefinition = ComponentDefinition | EnumDefinition;

/** A registry of schema definitions — the unit the CLI loads and inference resolves against. */
export interface LocalessSchemaConfig {
  schemas: readonly SchemaDefinition[];
}

type FieldInputOf<F> = F extends { kind: 'OPTION' | 'OPTIONS' }
  ? Omit<DeepReadonly<F>, 'source'> & { readonly source: string | EnumDefinition }
  : F extends { kind: 'SCHEMA' | 'SCHEMAS' }
    ? Omit<DeepReadonly<F>, 'schemas'> & { readonly schemas?: readonly (string | ComponentDefinition)[] }
    : DeepReadonly<F>;

/**
 * A field as authored: OPTION/OPTIONS source and SCHEMA/SCHEMAS schemas accept by-value refs.
 *
 * Known limitation: TypeScript's excess-property check does not apply to object literals inside
 * an array passed through a `const`-inferred generic parameter (only to literals checked directly
 * against a declared type), so a stray property from a different kind (e.g. `maxLength` on a
 * `NUMBER` field) inside `defineSchema({ fields: [...] })` will not be flagged at the call site.
 * Missing required properties (e.g. omitting `source` on `OPTION`) are still caught, since that is
 * ordinary structural assignability, not a freshness check. Wrap a field in `defineField(...)` to
 * get the excess-property check at the call site; raw literals and `defineField` results are
 * accepted interchangeably (see ADR 008).
 */
export type SchemaFieldInput = FieldInputOf<SchemaField>;

/** Authoring input for defineEnum: type is injected by the helper. */
export interface EnumDefinitionInput {
  id: string;
  displayName?: string;
  description?: string;
  labels?: readonly string[];
  values?: readonly SchemaEnumValue[];
}

/** Authoring input for defineSchema. */
export interface ComponentDefinitionInput {
  id: string;
  type: 'ROOT' | 'NODE';
  displayName?: string;
  description?: string;
  labels?: readonly string[];
  previewField?: string;
  fields?: readonly SchemaFieldInput[];
}

type NormalizeRef<S> = S extends { readonly id: infer Id extends string } ? Id : S;
type NormalizeRefs<A> = A extends readonly unknown[] ? { -readonly [K in keyof A]: NormalizeRef<A[K]> } : A;
type NormalizeField<F> = Prettify<
  Omit<F, 'source' | 'schemas'> &
    (F extends { source: infer S } ? { source: NormalizeRef<S> } : unknown) &
    (F extends { schemas: infer A } ? { schemas: NormalizeRefs<A> } : unknown)
>;

type DefinedEnum<TId extends string, TValues> = Prettify<
  {
    id: TId;
    type: 'ENUM';
    displayName?: string;
    description?: string;
    labels?: readonly string[];
  } & (TValues extends readonly unknown[] ? { values: TValues } : unknown)
>;

type DefinedComponent<TId extends string, TType extends 'ROOT' | 'NODE', TFields> = Prettify<
  {
    id: TId;
    type: TType;
    displayName?: string;
    description?: string;
    labels?: readonly string[];
    previewField?: string;
  } & (TFields extends readonly unknown[] ? { fields: { -readonly [K in keyof TFields]: NormalizeField<TFields[K]> } } : unknown)
>;

/**
 * Define an ENUM schema. Identity function apart from injecting `type: 'ENUM'`;
 * exists to preserve literal types for inference.
 *
 * - `id` — unique schema id; also what `OPTION`/`OPTIONS` fields reference via `source`
 * - `values` — the fixed option set; each `{ name, value }` becomes one selectable option, and
 *   every `value` across the config becomes part of `InferEnum`'s literal union
 *
 * @param definition the enum definition (id, values, optional display metadata)
 * @returns the definition with `type: 'ENUM'`, literal types preserved
 *
 * @example
 * const Status = defineEnum({
 *   id: 'Status',
 *   values: [
 *     { name: 'Draft', value: 'draft' },
 *     { name: 'Published', value: 'published' },
 *   ],
 * });
 */
export function defineEnum<const TId extends string, const TValues extends readonly SchemaEnumValue[] | undefined = undefined>(definition: {
  id: TId;
  displayName?: string;
  description?: string;
  labels?: readonly string[];
  values?: TValues;
}): DefinedEnum<TId, TValues> {
  return { ...definition, type: 'ENUM' } as DefinedEnum<TId, TValues>;
}

/**
 * Define a single field, narrowing it to the extras valid for its `kind` and catching a stray
 * property from the wrong kind at the call site (e.g. `maxLength` on a `NUMBER` field) — something
 * a bare field literal inside `defineSchema({ fields: [...] })` cannot do. Optional: `defineSchema`
 * accepts raw field literals and `defineField(...)` results interchangeably in the same `fields`
 * array. A near-identity function like `defineEnum`/`defineSchema` — by-value ref normalization
 * (`source`, `schemas`) still happens exclusively in `defineSchema`, applied uniformly regardless
 * of a field's origin. See `docs/decisions/008-schema-package.md`.
 *
 * Every `kind` accepts `name` (required), plus `displayName?`, `required?`, `description?`,
 * `defaultValue?`, `translatable?`. Kind-specific extras:
 * - `TEXT` / `TEXTAREA` / `RICH_TEXT` / `MARKDOWN` — `minLength?`, `maxLength?`
 * - `NUMBER` — `minValue?`, `maxValue?`
 * - `COLOR` / `DATE` / `DATETIME` / `BOOLEAN` / `LINK` — no extras
 * - `OPTION` — `source` (required: an ENUM definition from `defineEnum`, or its id)
 * - `OPTIONS` — `source` (required, same as `OPTION`), `minValues?`, `maxValues?`
 * - `REFERENCE` / `REFERENCES` — `path?`
 * - `ASSET` / `ASSETS` — `fileTypes?`, `fileType?`
 * - `SCHEMA` / `SCHEMAS` — `schemas?` (allowed definitions from `defineSchema`, or their ids;
 *   every `NODE` schema in the config is allowed when omitted)
 *
 * Full field-kind reference, including the type each kind infers to: `docs/schema.md`.
 *
 * @param field the field definition; `kind` selects which extra properties are allowed
 * @returns the field unchanged, with `name`/`kind`/extras narrowed to their literal types
 *
 * @example
 * defineField({ name: 'title', kind: 'TEXT', required: true, maxLength: 100 });
 * @example
 * defineField({ name: 'status', kind: 'OPTION', source: Status }); // Status = defineEnum(...)
 * @example
 * defineField({ name: 'blocks', kind: 'SCHEMAS', schemas: [Button] }); // Button = defineSchema(...)
 */
export function defineField<
  const TKind extends SchemaFieldKind,
  const TName extends string,
  const TField extends Omit<Extract<SchemaFieldInput, { kind: TKind }>, 'name' | 'kind'> = Omit<
    Extract<SchemaFieldInput, { kind: TKind }>,
    'name' | 'kind'
  >,
>(field: { kind: TKind; name: TName } & TField): Prettify<{ name: TName; kind: TKind } & TField> {
  return field as Prettify<{ name: TName; kind: TKind } & TField>;
}

/**
 * Define a ROOT (content type) or NODE (nested component) schema.
 * Normalizes by-value references (enum in `source`, components in `schemas`) to their id strings;
 * the returned type keeps those ids as literals for inference.
 *
 * - `id` — unique schema id; also the `_schema` value on its inferred content type, and what
 *   `SCHEMA`/`SCHEMAS` fields reference via `schemas`
 * - `type` — `'ROOT'` for a fetchable content type, `'NODE'` for a nested component only reachable
 *   through another schema's `SCHEMA`/`SCHEMAS` field
 * - `previewField` — name of one of this schema's own fields, shown as its preview label in the
 *   Localess editor
 * - `fields` — ordered list of `defineField(...)` results and/or raw field literals; see
 *   `defineField` for the per-kind property reference
 *
 * @param definition the schema definition; `type` selects ROOT or NODE
 * @returns the definition with references normalized to id strings, literal types preserved
 * @throws Error on duplicate field names — a programming error, not a validation concern
 *
 * @example
 * const Button = defineSchema({
 *   id: 'Button',
 *   type: 'NODE',
 *   previewField: 'label',
 *   fields: [defineField({ name: 'label', kind: 'TEXT', required: true })],
 * });
 */
export function defineSchema<
  const TId extends string,
  const TType extends 'ROOT' | 'NODE',
  const TFields extends readonly SchemaFieldInput[] | undefined = undefined,
>(definition: {
  id: TId;
  type: TType;
  displayName?: string;
  description?: string;
  labels?: readonly string[];
  previewField?: string;
  fields?: TFields;
}): DefinedComponent<TId, TType, TFields> {
  const seen = new Set<string>();
  const fields = definition.fields?.map(field => {
    if (seen.has(field.name)) {
      throw new Error(`[localess/schema] Duplicate field name '${field.name}' in schema '${definition.id}'`);
    }
    seen.add(field.name);
    const out: Record<string, unknown> = { ...field };
    if ('source' in field && typeof field.source === 'object' && field.source !== null) {
      out.source = field.source.id;
    }
    if ('schemas' in field && Array.isArray(field.schemas)) {
      out.schemas = field.schemas.map(ref => (typeof ref === 'object' && ref !== null ? ref.id : ref));
    }
    return out;
  });
  return { ...definition, ...(fields ? { fields } : {}) } as unknown as DefinedComponent<TId, TType, TFields>;
}

/**
 * Register schemas into a config — the unit the CLI pushes and type inference resolves against.
 *
 * @param config object with the full list of schema definitions
 * @returns the config unchanged, literal types preserved
 * @throws Error on duplicate schema ids
 */
export function defineConfig<const T extends { schemas: readonly SchemaDefinition[] }>(config: T): T {
  const seen = new Set<string>();
  for (const schema of config.schemas) {
    if (seen.has(schema.id)) {
      throw new Error(`[localess/schema] Duplicate schema id '${schema.id}' in config`);
    }
    seen.add(schema.id);
  }
  return config;
}
