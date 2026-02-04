import { access, readFile } from 'node:fs/promises';
import { join, parse, resolve } from 'node:path';
import * as process from "node:process";

export type Session = {
  token?: string;
  space?: string;
  origin?: string;
  isLoggedIn: boolean;
}

export async function createSession() {
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
    console.log(`Login in using environment variables.`);
    session.space = space;
    session.origin = origin;
    session.token = token;
    session.isLoggedIn = true;
    return session;
  }
  // If no environment variables, fall back to .localess/credentials.json
  try {
    const filePath = join(process.cwd(), '.localess', 'credentials.json');
    await access(filePath)
    const content = await readFile(filePath, 'utf8');
    const parsedContent = JSON.parse(content);
    // Return null if the parsed content is an empty object
    if (Object.keys(parsedContent).length === 0) {
      return session;
    }
    if (parsedContent.origin && parsedContent.token && parsedContent.space) {
      console.log(`Login in using credentials file.`);
      session.space = space;
      session.origin = origin;
      session.token = token;
      session.isLoggedIn = true;
      return session;
    }
  } catch (e) {
    console.error('No credentials found. Please log in using the "localess login" command.');
  }
  console.log('Not logged in.');
  return session;
}
