import {access, constants, mkdir, writeFile as nodeWriteFile, readFile as nodeReadFile} from "node:fs/promises";
import {parse} from "node:path";

export const DEFAULT_CONFIG_DIR = '.localess'

export async function fileExists(path: string) {
  try {
    await access(path, constants.F_OK);
    return true;
  }
  catch {
    return false;
  }
}

export async function writeFile(filePath: string, data: string, option? : {mode? : number}) {
  // Get the directory path
  const resolvedPath = parse(filePath).dir;
  // Ensure the directory exists
  try {
    await mkdir(resolvedPath, { recursive: true });
  } catch (mkdirError) {
    return;
  }
  // Write the file
  try {
    await nodeWriteFile(filePath, data, option);
  }
  catch (writeError) {
  }
}

export async function readFile(filePath: string): Promise<string> {
  return nodeReadFile(filePath, 'utf-8');
}
