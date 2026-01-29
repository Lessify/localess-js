/**
 * Content Asset defines reference to an Asset.
 */
export interface ContentAsset {

  /**
   * Define the type of Asset
   */
  kind: 'ASSET';

  /**
   * Unique identifier for the asset.
   */
  uri: string;
}
