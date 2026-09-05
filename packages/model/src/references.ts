import { Content } from './content';

/**
 * Key-Value Object. Where Key is a Unique identifier for the Content object and Value is Content.
 *
 * Which fields a value actually carries depends on the endpoint that produced the map — see the
 * JSDoc on the parameter that requested it, e.g. `ContentFetchParams.resolveReference`.
 */
export interface References {
  [key: string]: Content;
}
