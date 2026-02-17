import {Command} from "commander";
import {getSession} from "../../../session";
import {localessClient} from "../../../client";
import {Translations, TranslationUpdateType} from "../../../models";
import {readFile} from "../../../file";
import {zLocaleTranslationsSchema, zTranslationUpdateTypeSchema} from "../../../models/translation.zod";

export type TranslationsPushOptions = {
  file: string;
  type: TranslationUpdateType
}

export const translationsPushCommand = new Command('push')
  .argument('<locale>', 'Locale to push')
  .description('Push locale translations to Localess')
  .requiredOption('-f, --file <path>', 'Path to the translations file to push')
  .option('-t, --type <type>', `Push type. Possible values are : ${Object.values(TranslationUpdateType)}`, TranslationUpdateType.ADD_MISSING)
  .action(async (locale: string, options: TranslationsPushOptions) => {
    console.log('Pushing translations with arguments:', locale);
    console.log('Pushing translations with options:', options);
    if (zTranslationUpdateTypeSchema.safeParse(options.type).success!) {
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

    console.log('Reading translations file from:', options.file);
    const fileContent = await readFile(options.file);
    const translationValues: Translations = JSON.parse(fileContent);
    const pResult = zLocaleTranslationsSchema.safeParse(translationValues)
    if (!pResult.success) {
      console.error('Invalid translations file format:', pResult.error);
      return;
    }
    console.log('Pushing translations to Localess with locale:', locale, 'and type:', options.type);
    await client.updateTranslations(locale, options.type, translationValues);
    console.log('Successfully pushed translations to Localess');
  });
