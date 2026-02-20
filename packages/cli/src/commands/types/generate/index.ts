import {Command} from "commander";
import {localessClient} from "../../../client";
import {getSession} from "../../../session";
import openapiTS, { astToString } from "openapi-typescript";
import {join} from "node:path";
import process from "node:process";
import {DEFAULT_CONFIG_DIR, writeFile} from "../../../file";

const TYPES_PATH = join(process.cwd(), DEFAULT_CONFIG_DIR, 'localess.d.ts');

type TypesOptions = {
  file: string;
};

export const typesGenerateCommand = new Command('generate')
  .description('Generate types for your schemas')
  .option('-f, --file <path>', 'Path to the file where to save the generated types. Default is .localess/localess.d.ts', TYPES_PATH)
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
      const minimalSpec = {
        openapi: '3.0.0',
        info: { title: 'Schemas Only', version: '1.0.0' },
        components: { schemas: specification.components?.schemas || {} },
      };
      const ast =  await openapiTS(minimalSpec, {exportType: true, rootTypes: true, rootTypesNoSchemaPrefix: true})
      const contents = astToString(ast);
      await writeFile(options.file, contents);
      console.log(`Types generated successfully at ${options.file}`);
    } catch (e) {
      console.error(e);
    }
  });
