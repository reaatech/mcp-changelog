import type { getOctokit, context as ghContext } from '@actions/github';

export interface ResolveRefsInput {
  inputBase: string;
  inputHead: string;
  context: typeof ghContext;
}

/**
 * Resolve the base/head refs for a diff. Explicit inputs win; otherwise infer
 * from the GitHub event payload (pull_request, push) or fall back to undefined.
 */
export function resolveRefs(
  input: ResolveRefsInput,
): { base: string; head: string } | undefined {
  if (input.inputBase && input.inputHead) {
    return { base: input.inputBase, head: input.inputHead };
  }

  const payload = input.context.payload;

  // pull_request / pull_request_target
  if (payload.pull_request) {
    const pr = payload.pull_request as {
      base?: { sha?: string };
      head?: { sha?: string };
    };
    if (pr.base?.sha && pr.head?.sha) {
      return { base: pr.base.sha, head: pr.head.sha };
    }
  }

  // push event
  if (payload.before && payload.after) {
    const before = String(payload.before);
    const after = String(payload.after);
    // ignore the all-zeros sha used for the initial push to a new branch
    if (!/^0+$/.test(before) && !/^0+$/.test(after)) {
      return { base: before, head: after };
    }
  }

  return undefined;
}

interface UpsertCommentInput {
  octokit: ReturnType<typeof getOctokit>;
  repo: { owner: string; repo: string };
  issueNumber: number;
  body: string;
  marker: string;
}

/**
 * Find a comment authored by us (identified by an HTML marker) and update it,
 * or post a new one if none exists. This prevents the action from spamming a
 * fresh comment on every PR push.
 */
export async function upsertPullRequestComment(input: UpsertCommentInput): Promise<void> {
  const { octokit, repo, issueNumber, body, marker } = input;

  const existing = await octokit.paginate(octokit.rest.issues.listComments, {
    ...repo,
    issue_number: issueNumber,
    per_page: 100,
  });

  const ours = existing.find((c) => typeof c.body === 'string' && c.body.includes(marker));

  if (ours) {
    await octokit.rest.issues.updateComment({
      ...repo,
      comment_id: ours.id,
      body,
    });
    return;
  }

  await octokit.rest.issues.createComment({
    ...repo,
    issue_number: issueNumber,
    body,
  });
}
