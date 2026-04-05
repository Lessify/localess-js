import {Command} from "commander";
import {localessClient} from "../../../client";
import {getSession} from "../../../session";
import { generate } from 'orval';
import {join} from "node:path";
import process from "node:process";
import {DEFAULT_CONFIG_DIR} from "../../../file";
import {OpenApiDocument} from "@orval/core";

const TYPES_PATH = join(process.cwd(), DEFAULT_CONFIG_DIR, 'localess.ts');

type TypesOptions = {
  path: string;
};

export const typesGenerateCommand = new Command('generate')
  .description('Generate types for your schemas')
  .option('-p, --path <path>', 'Path to the file where to save the generated types. Default is .localess/localess.ts', TYPES_PATH)
  .action(async (options: TypesOptions) => {
    console.log('Types in with options:', options);

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

    console.log('Fetching OpenAPI specification from Localess...');
    const specification = await client.getOpenApi();
    console.log('Generating types from OpenAPI specification...');
    try {
      await generate({
        input: {
          target: specification as OpenApiDocument,
        },
        output: {
          target: options.path,
          client: 'fetch',
          mode: 'single',
        },
      });
      console.log(`Types generated successfully at ${options.path}`);
    } catch (e) {
      console.error(e);
    }
  });
