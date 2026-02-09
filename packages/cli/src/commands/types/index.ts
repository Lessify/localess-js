import {Command} from "commander";
import {localessClient} from "../../client";
import {getSession} from "../../session";
import {compile} from 'json-schema-to-typescript'

type TypesOptions = {

};

export const typesCommand = new Command('types')
  .description('Generate types for your schemas')
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

    const specification = await client.getOpenApi();

    try {
      const dts = await compile(specification.components?.schemas || {}, 'OpenAPI')
      console.log(dts);
    } catch (e) {
      console.error(e);
    }
  });
