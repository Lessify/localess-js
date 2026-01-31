#!/usr/bin/env node
import { Command } from 'commander';

const program = new Command();

program
  .name('Localess CLI')
  .description('CLI tool for Localess platform management')
  .version('0.0.1');

type LoginOptions = {
  token: string;
  space: string;
  origin: string;
};
program.command('login')
  .description('Login to the Localess CLI')
  .requiredOption('-t, --token <token>', 'Token to login to Localess CLI')
  .requiredOption('-s, --space <space>', 'Space ID to login to')
  .requiredOption('-o, --origin <origin>', 'Origin of the Localess instance')
  .action((options:LoginOptions) => {
    console.log('Logging in with options:', options);
  });

program.parse(process.argv);
