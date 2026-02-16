import {Command} from "commander";
import {translationsPushCommand} from "./push";

export const translationsCommand = new Command('translations')
  .description('Manage translations')
  .addCommand(translationsPushCommand);
