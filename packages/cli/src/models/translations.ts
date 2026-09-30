export type TranslationUpdate = {
  dryRun?: boolean;
  type: TranslationUpdateType;
  values: Record<string, string>;
};

export enum TranslationUpdateType {
  ADD_MISSING = 'add-missing',
  UPDATE_EXISTING = 'update-existing',
  DELETE_MISSING = 'delete-missing',
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
