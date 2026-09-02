import { AssetMetadata } from './asset-metadata';

/**
 * Key-Value Object. Where Key is Unique identifier for the Asset object and Value is Asset Metadata.
 */
export interface Assets {
  [key: string]: AssetMetadata;
}
