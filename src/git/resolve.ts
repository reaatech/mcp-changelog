import { simpleGit } from 'simple-git';
import type { GitRef, RefRange } from './types.js';
import { GitRefNotFoundError, InvalidRangeError } from './types.js';

/**
 * Resolve a git ref (tag, commit, branch) to a concrete SHA.
 */
export async function resolveRef(ref: string, repoPath: string = process.cwd()): Promise<GitRef> {
  const git = simpleGit(repoPath);

  try {
    const sha = await git.revparse(['--verify', ref]);
    const type = await classifyRef(ref, repoPath);
    return { type, name: ref, sha: sha.trim() };
  } catch {
    throw new GitRefNotFoundError(ref);
  }
}

/**
 * Parse a git range string like "v1.2.0..v1.3.0" into a RefRange.
 */
export async function parseRange(range: string, repoPath: string = process.cwd()): Promise<RefRange> {
  const parts = range.split('..');
  if (parts.length !== 2) {
    throw new InvalidRangeError(range);
  }

  const [fromRef, toRef] = parts;
  if (!fromRef || !toRef) {
    throw new InvalidRangeError(range);
  }

  const [from, to] = await Promise.all([
    resolveRef(fromRef, repoPath),
    resolveRef(toRef, repoPath),
  ]);

  return { from, to };
}

async function classifyRef(ref: string, repoPath: string): Promise<GitRef['type']> {
  const git = simpleGit(repoPath);

  // Check if it's a tag
  try {
    await git.revparse(['--verify', `refs/tags/${ref}`]);
    return 'tag';
  } catch {
    // not a tag
  }

  // Check if it's a branch
  try {
    await git.revparse(['--verify', `refs/heads/${ref}`]);
    return 'branch';
  } catch {
    // not a branch
  }

  // Check if it's a remote branch
  try {
    await git.revparse(['--verify', `refs/remotes/${ref}`]);
    return 'branch';
  } catch {
    // not a remote branch
  }

  return 'commit';
}
