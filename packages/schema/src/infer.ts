import type { SchemaContentAsset, SchemaContentLink, SchemaContentReference, SchemaContentRichText } from './content-types';
import type { SchemaEnumValue } from './models';

type Prettify<T> = { [K in keyof T]: T[K] } & {};

type SchemasOf<C> = C extends { schemas: readonly (infer D)[] } ? D : never;
type FindById<C, Id> = Extract<SchemasOf<C>, { id: Id }>;
type NodeIds<C> = Extract<SchemasOf<C>, { type: 'NODE' }> extends { id: infer Id extends string } ? Id : never;

type EnumValuesUnion<E> = E extends { values: readonly SchemaEnumValue[] }
  ? E extends { values: readonly { value: infer V extends string }[] }
    ? V
    : string
  : string;

/** Literal union of an ENUM definition's values (falls back to `string` when values are absent). */
export type InferEnum<E> = EnumValuesUnion<E>;

// OPTION/OPTIONS source resolution: an unresolved source id degrades to string, matching the
// behavior of the CLI's existing codegen when a schema reference can't be resolved.
type ResolveEnum<Id extends string, C> = [FindById<C, Id>] extends [never] ? string : EnumValuesUnion<FindById<C, Id>>;

// SCHEMA/SCHEMAS: an explicit allow-list narrows to those schemas; an absent list means every
// NODE schema registered in the config is allowed.
type AllowedIds<F, C> = F extends { schemas: readonly (infer Id extends string)[] } ? Id : NodeIds<C>;
type ResolveSchemaContent<F, C> = [AllowedIds<F, C>] extends [never] ? { _id: string; _schema: string } : ContentByIds<AllowedIds<F, C>, C>;
type ContentByIds<Id extends string, C> = Id extends unknown ? InferContent<FindById<C, Id>, C> : never;

type FieldValue<F, C> = F extends { kind: 'TEXT' | 'TEXTAREA' | 'MARKDOWN' | 'COLOR' | 'DATE' | 'DATETIME' }
  ? string
  : F extends { kind: 'NUMBER' }
    ? number
    : F extends { kind: 'BOOLEAN' }
      ? boolean
      : F extends { kind: 'RICH_TEXT' }
        ? SchemaContentRichText
        : F extends { kind: 'LINK' }
          ? SchemaContentLink
          : F extends { kind: 'ASSET' }
            ? SchemaContentAsset
            : F extends { kind: 'ASSETS' }
              ? SchemaContentAsset[]
              : F extends { kind: 'REFERENCE' }
                ? SchemaContentReference
                : F extends { kind: 'REFERENCES' }
                  ? SchemaContentReference[]
                  : F extends { kind: 'OPTION'; source: infer S extends string }
                    ? ResolveEnum<S, C>
                    : F extends { kind: 'OPTIONS'; source: infer S extends string }
                      ? ResolveEnum<S, C>[]
                      : F extends { kind: 'SCHEMA' }
                        ? ResolveSchemaContent<F, C>
                        : F extends { kind: 'SCHEMAS' }
                          ? ResolveSchemaContent<F, C>[]
                          : unknown;

type FieldsOf<S> = S extends { fields: readonly (infer F)[] } ? F : never;
type RequiredFieldNames<S> = FieldsOf<S> extends infer F ? (F extends { required: true; name: infer N extends string } ? N : never) : never;
type OptionalFieldNames<S> =
  FieldsOf<S> extends infer F ? (F extends { required: true } ? never : F extends { name: infer N extends string } ? N : never) : never;
type FieldByName<S, N> = Extract<FieldsOf<S>, { name: N }>;

type FieldsObject<S, C> = Prettify<
  { [N in RequiredFieldNames<S>]: FieldValue<FieldByName<S, N>, C> } & { [N in OptionalFieldNames<S>]?: FieldValue<FieldByName<S, N>, C> }
>;

/** Content type of a single ROOT/NODE definition, resolved against config C. */
export type InferContent<S, C> = S extends { type: 'ROOT' | 'NODE'; id: infer Id extends string }
  ? Prettify<{ _id: string; _schema: Id } & FieldsObject<S, C>>
  : never;

type RootIds<C> = Extract<SchemasOf<C>, { type: 'ROOT' }> extends { id: infer Id extends string } ? Id : never;

/** Union of the content types of every ROOT schema in config C. */
export type InferContentData<C> = ContentByIds<RootIds<C>, C>;
