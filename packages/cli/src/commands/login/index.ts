import {Command} from "commander";
import {localessClient} from "../../client";

type LoginOptions = {
  token?: string;
  space?: string;
  origin?: string;
};

export const loginCommand = new Command('login')
  .description('Login to Localess CLI')
  .option('-t, --token <token>', 'Token to login to Localess CLI')
  .option('-s, --space <space>', 'Space ID to login to')
  .option('-o, --origin <origin>', 'Origin of the Localess instance')
  .action(async (options: LoginOptions) => {
    console.log('Logging in with options:', options);



    const client = localessClient({
      origin: options.origin,
      spaceId: options.space,
      token: options.token,
    });
    try {
      const space = await client.getSpace();
      console.log(`Successfully logged in to space: ${space.name} (${space.id})`);

    } catch (e) {
      console.error('Login failed');
    }

  });
