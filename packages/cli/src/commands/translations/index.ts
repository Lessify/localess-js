import {Command} from "commander";
import {translationsPushCommand} from "./push";
import {translationsPullCommand} from "./pull";

export const translationsCommand = new Command('translations')
  .description('Manage translations')
  .addCommand(translationsPushCommand)
  .addCommand(translationsPullCommand);
