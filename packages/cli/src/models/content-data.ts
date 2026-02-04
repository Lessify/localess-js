import {ContentAsset} from "./content-asset";
import {ContentLink} from "./content-link";
import {ContentRichText} from "./content-rich-text";
import {ContentReference} from "./content-reference";

export type ContentDataField =
  any |
  string |
  string[] |
  number |
  boolean |
  ContentLink |
  ContentRichText |
  ContentData | ContentData[] |
  ContentAsset | ContentAsset[] |
  ContentReference | ContentReference[];

/**
 * Content Data Schema related information.
 */
export interface ContentDataSchema {
  /**
   * Unique identifier of a component in a content.
   */
  _id: string;
  /**
   * Unique identifier for the Schema object.
   */
  _schema?: string;
  /**
   * Unique identifier for the Schema object.
   */
  schema: string;
}

/**
 * ContentData defined Object to connect all possible root Schemas.
 */
export interface ContentData extends ContentDataSchema {
  /**
   * Other Schema-specific fields
   */
  [field: string]: ContentDataField | undefined;
}
