import {Command} from "commander";
import {input, password} from "@inquirer/prompts";
import {localessClient} from "../../client";
import {getSession, persistSession} from "../../session";

type LoginOptions = {
  origin?: string;
  space?: string;
  token?: string;
};

export const loginCommand = new Command('login')
  .description('Login to Localess CLI')
  .option('-o, --origin <origin>', 'Origin of the Localess instance')
  .option('-s, --space <space>', 'Space ID to login to')
  .option('-t, --token <token>', 'Token to login to Localess CLI')
  .action(async (options: LoginOptions) => {
    const session = await getSession()

    if (session.isLoggedIn) {
      console.log('Already logged in.');
      console.log('If you want to log in with different credentials, please log out first using "localess logout" command.');
      return;
    }

    const origin = options.origin ?? await input({
      message: 'Origin of the Localess instance:',
      required: true,
    });

    const space = options.space ?? await input({
      message: 'Space ID:',
      required: true,
    });

    const token = options.token ?? await password({
      message: 'Token:',
      mask: true,
    });

    const client = localessClient({
      origin,
      spaceId: space,
      token,
    });

    try {
      const spaceData = await client.getSpace();
      console.log(`Successfully logged in to space: ${spaceData.name} (${spaceData.id})`);
      await persistSession({origin, space, token});
    } catch (e) {
      console.error('Login failed');
    }
  });
