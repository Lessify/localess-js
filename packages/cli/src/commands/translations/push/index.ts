import {Command} from "commander";
import {getSession} from "../../../session";
import {localessClient} from "../../../client";
import {TranslationFileFormat, Translations, TranslationUpdateType} from "../../../models";
import {readFile} from "../../../file";
import {zLocaleTranslationsSchema, zTranslationUpdateTypeSchema} from "../../../models/translation.zod";

export type TranslationsPushOptions = {
  path: string;
  format: TranslationFileFormat;
  type: TranslationUpdateType;
  dryRun?: boolean;
}

export const translationsPushCommand = new Command('push')
  .argument('<locale>', 'Locale to push')
  .description('Push locale translations to Localess')
  .requiredOption('-p, --path <path>', 'Path to the translations file to push')
  .option('-f, --format <format>', `File format. Possible values are : ${Object.values(TranslationFileFormat)}`, TranslationFileFormat.FLAT)
  .option('-t, --type <type>', `Push type. Possible values are : ${Object.values(TranslationUpdateType)}`, TranslationUpdateType.ADD_MISSING)
  .option('--dry-run', 'Preview changes without applying them to Localess')
  .action(async (locale: string, options: TranslationsPushOptions) => {
    console.log('Pushing translations with arguments:', locale);
    console.log('Pushing translations with options:', options);
    if (!zTranslationUpdateTypeSchema.safeParse(options.type).success) {
      console.error('Invalid type provided. Possible values are :', Object.values(TranslationUpdateType));
      return;
    }

    const session = await getSession()
    if (!session.isLoggedIn) {
      console.error('Not logged in');
      console.error('Please log in first using "localess login" command');
      return;
    }
    const client = localessClient({
      origin: session.origin,
      spaceId: session.space,
      token: session.token,
    });

    if (options.dryRun) {
      console.warn('Dry run mode enabled: No changes will be made.');
    }

    if (options.format === TranslationFileFormat.NESTED) {
      console.error('Nested format is not implemented yet. Please use flat format for now.');
    }
    console.log('Reading translations file from:', options.path);
    const fileContent = await readFile(options.path);
    const translationValues: Translations = JSON.parse(fileContent);
    const pResult = zLocaleTranslationsSchema.safeParse(translationValues)
    if (!pResult.success) {
      console.error('Invalid translations file format:', pResult.error);
      return;
    }
    console.log('Pushing translations to Localess with locale:', locale, 'and type:', options.type);
    const response = await client.updateTranslations(locale, options.type, translationValues, options.dryRun);
    if (response) {
      if (response.dryRun) {
        console.log('Dry run results:');
      }
      console.log('Successfully pushed translations to Localess');
      console.log('Summary:', response.message);
      if (response.ids) {
        console.log('Updated translation IDs:', response.ids);
      }
    } else {
      console.log('Something went wrong while pushing translations to Localess');
    }
  });
