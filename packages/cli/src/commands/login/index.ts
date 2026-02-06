import {Command} from "commander";
import {localessClient} from "../../client";
import {getSession, persistSession} from "../../session";

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

    const session = await getSession()

    if (session.isLoggedIn && session.method === 'file') {
      console.log('Already logged in. If you want to log in with different credentials, please log out first using "localess logout" command.');
      return;
    }
    if (options.origin && options.space && options.token) {
      const client = localessClient({
        origin: options.origin,
        spaceId: options.space,
        token: options.token,
      });
      try {
        const space = await client.getSpace();
        console.log(`Successfully logged in to space: ${space.name} (${space.id})`);
        await persistSession({
          origin: options.origin,
          space: options.space,
          token: options.token,
        })
      } catch (e) {
        console.error('Login failed');
      }
    } else {
      console.log('Please provide all required options: --origin, --space, and --token');
      console.log('Or set the following environment variables: LOCALESS_ORIGIN, LOCALESS_SPACE, and LOCALESS_TOKEN');
    }
  });
