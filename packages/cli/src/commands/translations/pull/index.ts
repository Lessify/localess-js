import {Command} from "commander";
import {getSession} from "../../../session";
import {localessClient} from "../../../client";
import {TranslationFileFormat} from "../../../models";
import {writeFile} from "../../../file";
import {dotToNestedObject} from "../../../utils";

export type TranslationsPullOptions = {
  path: string;
  format: TranslationFileFormat;
}

export const translationsPullCommand = new Command('pull')
  .argument('<locale>', 'Locale to pull')
  .description('Pull locale translations from Localess')
  .requiredOption('-p, --path <path>', 'Path where the translations file will be saved')
  .option('-f, --format <format>', `File format. Possible values are : ${Object.values(TranslationFileFormat)}`, TranslationFileFormat.FLAT)
  .action(async (locale: string, options: TranslationsPullOptions) => {
    console.log('Pulling translations with arguments:', locale);
    console.log('Pulling translations with options:', options);
    if (!Object.values(TranslationFileFormat).includes(options.format)) {
      console.error('Invalid format provided. Possible values are :', Object.values(TranslationFileFormat));
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

    console.log('Pulling translations from Localess for locale:', locale);
    const translations = await client.getTranslations(locale)

    console.log('Saving translations in file:', options.path);
    if (options.format === TranslationFileFormat.FLAT) {
      await writeFile(options.path, JSON.stringify(translations, null, 2));
    } else if (options.format === TranslationFileFormat.NESTED) {
      const nestedTranslations = dotToNestedObject(translations);
      await writeFile(options.path, JSON.stringify(nestedTranslations, null, 2));
    }
    console.log('Successfully saved translations from Localess');
  });
