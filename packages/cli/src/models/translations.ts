export type TranslationUpdate = {
  dryRun?: boolean;
  type: TranslationUpdateType;
  values: Record<string, string>;
};

export enum TranslationUpdateType {
  ADD_MISSING = 'add-missing',
  UPDATE_EXISTING = 'update-existing',
  /** Deletes keys absent from the file entirely — every locale's value, not just the pushed one. */
  DELETE_MISSING_KEY = 'delete-missing-key',
  /** Removes only the pushed locale's value of keys absent from the file; other locales keep theirs. */
  DELETE_MISSING_VALUE = 'delete-missing-value',
}

export enum TranslationFileFormat {
  FLAT = 'flat',
  NESTED = 'nested',
}

export type TranslationUpdateResponse = {
  message: string;
  /** Translation keys the push type wrote (or, on a dry run, would write). */
  ids?: string[];
  dryRun?: boolean;
};
