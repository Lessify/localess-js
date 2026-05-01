import { access, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import * as process from 'node:process';

import { DEFAULT_CONFIG_DIR, ensureGitignore, writeFile } from './file';

export type SessionData = {
  token: string;
  space: string;
  origin: string;
};

export type SessionOptions = {
  token: string;
  space: string;
  origin: string;
};

export type Session =
  | {
      token: string;
      space: string;
      origin: string;
      isLoggedIn: true;
      method?: 'env' | 'file';
    }
  | {
      isLoggedIn: false;
    };

const CREDENTIALS_PATH = join(process.cwd(), DEFAULT_CONFIG_DIR, 'credentials.json');

export async function getSession(): Promise<Session> {
  // Session creation logic here

  const session: Session = {
    isLoggedIn: false,
  };
  // Load session data from environment variables
  const token = process.env.LOCALESS_TOKEN;
  const space = process.env.LOCALESS_SPACE;
  const origin = process.env.LOCALESS_ORIGIN;

  // If all required data is present, mark the session as logged in
  if (token && space && origin) {
    console.debug(`Login in using environment variables.`);
    return {
      isLoggedIn: true,
      space: space,
      origin: origin,
      token: token,
      method: 'env',
    };
  }
  // If no environment variables, fall back to .localess/credentials.json
  try {
    await access(CREDENTIALS_PATH);
    const content = await readFile(CREDENTIALS_PATH, 'utf8');
    const parsedContent: SessionData = JSON.parse(content);
    // Return null if the parsed content is an empty object
    if (Object.keys(parsedContent).length === 0) {
      return session;
    }
    if (parsedContent.origin && parsedContent.token && parsedContent.space) {
      console.debug(`Login in using credentials file.`);
      return {
        isLoggedIn: true,
        space: parsedContent.space,
        origin: parsedContent.origin,
        token: parsedContent.token,
        method: 'file',
      };
    }
  } catch (e) {
    // console.error('No credentials found. Please log in using the "localess login" command.');
  }
  return session;
}

export async function persistSession(data: SessionOptions) {
  if (data.origin && data.token && data.space) {
    await writeFile(CREDENTIALS_PATH, JSON.stringify(data, null, 2), { mode: 0o600 });
    console.log('Session credentials saved to file system.');
    await ensureGitignore(process.cwd(), DEFAULT_CONFIG_DIR);
    console.log(`Added '${DEFAULT_CONFIG_DIR}' to .gitignore to prevent credentials from being committed.`);
  } else {
    throw new Error('Cannot persist session: missing required fields.');
  }
}

export async function clearSession() {
  // Write empty JSON to the file
  try {
    await access(CREDENTIALS_PATH);
    await writeFile(CREDENTIALS_PATH, '{}', { mode: 0o600 });
  } catch (error) {
    throw new Error('Failed to clear session credentials.');
  }
}
