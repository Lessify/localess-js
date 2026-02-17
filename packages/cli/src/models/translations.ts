/**
 * Key-Value Object. Where Key is Translation ID and Value is Translated Content
 */
export interface Translations {

  [key: string]: string;
}

export type TranslationUpdate = {
  type: TranslationUpdateType;
  values: Translations;
}

export enum TranslationUpdateType {
  ADD_MISSING = 'add-missing',
  UPDATE_EXISTING = 'update-existing',
}

export type TranslationUpdateResponse = {
  message: string;
  ids?: string[];
}
