import {ContentData, ContentDataSchema} from "./models";

/**
 * Adds Localess editable attributes to a content item.
 * @param content
 * @returns An object containing data-ll-id and data-ll-schema attributes.
 */
export function localessEditable(content: ContentDataSchema ) {
  return {
    'data-ll-id': content._id,
    'data-ll-schema': content._schema || content.schema,
  }
}

/**
 * Adds Localess editable attributes to a content item.
 * @param content
 * @returns An object containing data-ll-id and data-ll-schema attributes.
 * @deprecated use localessEditable instead
 */
export function llEditable(content: ContentDataSchema ) {
  return {
    'data-ll-id': content._id,
    'data-ll-schema': content._schema || content.schema,
  }
}

/**
 * Adds Localess editable field attribute to a specific field.
 * Added type safety to ensure fieldName is a valid key of the content data excluding base schema fields.
 * @param fieldName
 * @returns An object containing data-ll-field attribute.
 */
export function localessEditableField<T extends ContentData = ContentData>(fieldName: Exclude<keyof T, keyof ContentDataSchema>) {
  return {
    'data-ll-field': fieldName,
  }
}

/**
 * Adds Localess editable field attribute to a specific field.
 * @param fieldName
 * @returns An object containing data-ll-field attribute.
 * @deprecated use localessEditableField instead
 */
export function llEditableField(fieldName: string ) {
  return {
    'data-ll-field': fieldName,
  }
}
