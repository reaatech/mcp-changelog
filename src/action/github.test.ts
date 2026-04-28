import { describe, it, expect, vi } from 'vitest';
import { resolveRefs, upsertPullRequestComment } from './github.js';

describe('resolveRefs', () => {
  it('prefers explicit inputs over context', () => {
    const result = resolveRefs({
      inputBase: 'main',
      inputHead: 'feature',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      context: { payload: { pull_request: { base: { sha: 'a' }, head: { sha: 'b' } } } } as any,
    });
    expect(result).toEqual({ base: 'main', head: 'feature' });
  });

  it('falls back to pull_request payload', () => {
    const result = resolveRefs({
      inputBase: '',
      inputHead: '',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      context: { payload: { pull_request: { base: { sha: 'abc' }, head: { sha: 'def' } } } } as any,
    });
    expect(result).toEqual({ base: 'abc', head: 'def' });
  });

  it('falls back to push event before/after', () => {
    const result = resolveRefs({
      inputBase: '',
      inputHead: '',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      context: { payload: { before: 'aaa', after: 'bbb' } } as any,
    });
    expect(result).toEqual({ base: 'aaa', head: 'bbb' });
  });

  it('rejects all-zeros sha (initial branch push)', () => {
    const result = resolveRefs({
      inputBase: '',
      inputHead: '',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      context: { payload: { before: '0000000000000000000000000000000000000000', after: 'bbb' } } as any,
    });
    expect(result).toBeUndefined();
  });

  it('returns undefined when no refs are available', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = resolveRefs({ inputBase: '', inputHead: '', context: { payload: {} } as any });
    expect(result).toBeUndefined();
  });
});

describe('upsertPullRequestComment', () => {
  const repo = { owner: 'me', repo: 'mine' };
  const marker = '<!-- test-marker -->';

  function makeOctokit(existingComments: Array<{ id: number; body: string }>): {
    octokit: Parameters<typeof upsertPullRequestComment>[0]['octokit'];
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  } {
    const create = vi.fn().mockResolvedValue({ data: { id: 999 } });
    const update = vi.fn().mockResolvedValue({ data: { id: existingComments[0]?.id ?? 0 } });
    const paginate = vi.fn().mockResolvedValue(existingComments);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const octokit: any = {
      paginate,
      rest: {
        issues: {
          listComments: vi.fn(),
          createComment: create,
          updateComment: update,
        },
      },
    };
    return { octokit, create, update };
  }

  it('creates a new comment when none with marker exists', async () => {
    const { octokit, create, update } = makeOctokit([
      { id: 1, body: 'unrelated comment' },
    ]);

    await upsertPullRequestComment({
      octokit,
      repo,
      issueNumber: 42,
      body: `${marker}\nhello`,
      marker,
    });

    expect(create).toHaveBeenCalledWith({ ...repo, issue_number: 42, body: `${marker}\nhello` });
    expect(update).not.toHaveBeenCalled();
  });

  it('updates the existing marker comment instead of creating a new one', async () => {
    const { octokit, create, update } = makeOctokit([
      { id: 1, body: 'unrelated' },
      { id: 7, body: `${marker}\nold body` },
    ]);

    await upsertPullRequestComment({
      octokit,
      repo,
      issueNumber: 42,
      body: `${marker}\nnew body`,
      marker,
    });

    expect(update).toHaveBeenCalledWith({ ...repo, comment_id: 7, body: `${marker}\nnew body` });
    expect(create).not.toHaveBeenCalled();
  });
});
