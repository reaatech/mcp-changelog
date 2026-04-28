import { simpleGit } from 'simple-git';
import type { GitRef } from './types.js';

/**
 * List all git tags matching an optional regex pattern.
 */
export async function listTags(
  repoPath: string = process.cwd(),
  pattern?: string,
): Promise<GitRef[]> {
  const git = simpleGit(repoPath);
  const tags = await git.tags();

  const regex = pattern ? new RegExp(pattern) : undefined;

  const refs: GitRef[] = [];
  for (const tag of tags.all) {
    if (regex && !regex.test(tag)) {
      continue;
    }
    try {
      const sha = await git.revparse(['--verify', `refs/tags/${tag}`]);
      refs.push({ type: 'tag', name: tag, sha: sha.trim() });
    } catch {
      // Skip tags that can't be resolved
      continue;
    }
  }

  return refs;
}
