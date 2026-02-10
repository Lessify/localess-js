import {access, constants, mkdir, writeFile} from "node:fs/promises";
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

export async function writeToFile(filePath: string, data: string, option? : {mode? : number}) {
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
    await writeFile(filePath, data, option);
  }
  catch (writeError) {
  }
}
