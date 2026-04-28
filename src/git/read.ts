import { simpleGit } from 'simple-git';
import type { GitRef } from './types.js';
import { GitFileNotFoundError } from './types.js';

/**
 * Read a file from the git tree at a specific ref.
 */
export async function readFileAtRef(
  ref: GitRef,
  path: string,
  repoPath: string = process.cwd(),
): Promise<string> {
  const git = simpleGit(repoPath);

  try {
    const content = await git.show([`${ref.sha}:${path}`]);
    return content;
  } catch (error) {
    throw new GitFileNotFoundError(ref.name, path, error);
  }
}

/**
 * List files in a git tree at a specific ref.
 */
export async function listFilesAtRef(
  ref: GitRef,
  repoPath: string = process.cwd(),
  dir?: string,
): Promise<string[]> {
  const git = simpleGit(repoPath);

  try {
    const args = ['ls-tree', '-r', '--name-only', ref.sha];
    if (dir) {
      args.push(dir);
    }
    const tree = await git.raw(args);
    return tree
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
  } catch (error) {
    if (error instanceof Error && error.message.includes('does not exist')) {
      return [];
    }
    throw new GitFileNotFoundError(ref.name, dir ?? '<root>', error);
  }
}
