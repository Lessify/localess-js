import {access, constants, mkdir, writeFile as nodeWriteFile, readFile as nodeReadFile, appendFile} from "node:fs/promises";
import {join, parse} from "node:path";

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

export async function ensureGitignore(cwd: string, entry: string): Promise<void> {
  const gitignorePath = join(cwd, '.gitignore');
  let content = '';
  try {
    content = await nodeReadFile(gitignorePath, 'utf-8');
  } catch {
    // file does not exist yet
  }
  const lines = content.split('\n').map(l => l.trim());
  if (lines.includes(entry)) {
    return;
  }
  const suffix = content.length > 0 && !content.endsWith('\n') ? '\n' : '';
  await appendFile(gitignorePath, `${suffix}${entry}\n`, 'utf-8');
}
