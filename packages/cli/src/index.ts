#!/usr/bin/env node
import { Command } from 'commander';
import {loginCommand} from "./commands/login";
import {logoutCommand} from "./commands/logout";

const program = new Command();

program
  .name('Localess CLI')
  .description('CLI tool for Localess platform management')
  .version('0.0.1');


program.addCommand(loginCommand)
program.addCommand(logoutCommand)

program.parse(process.argv);
