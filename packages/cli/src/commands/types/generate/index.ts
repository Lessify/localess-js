import {Command} from "commander";
import {localessClient} from "../../../client";
import {getSession} from "../../../session";
import {join} from "node:path";
import process from "node:process";
import {DEFAULT_CONFIG_DIR, writeFile} from "../../../file";
import {generateTypes} from "./generator";

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
      debug: true,
    });

    console.log('Fetching schemas from Localess...');
    const specification = await client.getSchemas();
    console.log('Generating types...');
    const content = generateTypes(specification);
    await writeFile(options.path, content);
    console.log(`Types written to ${options.path}`);

  });
