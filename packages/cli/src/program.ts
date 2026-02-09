import {Command} from "commander";
import {loginCommand} from "./commands/login";
import {logoutCommand} from "./commands/logout";
import {typesCommand} from "./commands/types";

export const program = new Command();

program
  .name('Localess CLI')
  .description('CLI tool for Localess platform management')
  .version('0.0.1');


program.addCommand(loginCommand)
program.addCommand(logoutCommand)
program.addCommand(typesCommand)
