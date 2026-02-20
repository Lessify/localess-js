import {Command} from "commander";
import {typesGenerateCommand} from "./generate";

export const typesCommand = new Command('types')
  .description('Generate types for your schemas')
  .addCommand(typesGenerateCommand);

