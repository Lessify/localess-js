import { z } from 'zod';

export const zLocaleTranslationsSchema = z.record(z.string(), z.string());
export const zTranslationUpdateTypeSchema = z.enum(['add-missing', 'update-existing', 'delete-missing']);

export const zTranslationUpdateSchema = z.object({
  type: zTranslationUpdateTypeSchema,
  values: zLocaleTranslationsSchema,
});
