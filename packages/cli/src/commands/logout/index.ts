import {Command} from "commander";
import {clearSession, getSession} from "../../session";

export const logoutCommand = new Command('logout')
  .description('Logout from Localess CLI')
  .action(async () => {
    console.log('Logging out...');

    const session = await getSession();

    if (!session.isLoggedIn) {
      console.log('Not currently logged in.');
      return;
    }

    if (session.method === 'env') {
      console.log('You are logged in using environment variables. To log out, unset LOCALESS_TOKEN, LOCALESS_SPACE, and LOCALESS_ORIGIN.');
      return;
    }

    try {
      await clearSession();
      console.log('Successfully logged out.');
    } catch (e) {
      console.error('Failed to log out:', e);
    }
  });
