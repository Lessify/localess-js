import {Content} from "./content";

/**
 * Key-Value Object. Where Key is a Unique identifier for the Content object and Value is Content.
 */
export interface References {

  [key: string]: Content;
}
