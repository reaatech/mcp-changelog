import * as core from '@actions/core';
import { getOctokit, context } from '@actions/github';
import { parseRange } from '../git/resolve.js';
import { diffRange } from '../pipeline.js';
import { writeOutputs } from '../output/write.js';
import { loadConfig, toLocatorConfig } from '../config/loader.js';
import { COMMENT_MARKER, formatComment } from './comment.js';
import { upsertPullRequestComment, resolveRefs } from './github.js';

async function run(): Promise<void> {
  try {
    const schemaPath = core.getInput('schema-path');
    const inputBase = core.getInput('base-ref');
    const inputHead = core.getInput('head-ref');
    const commentOnPR = core.getBooleanInput('comment-on-pr');
    const failOnBreaking = core.getBooleanInput('fail-on-breaking');
    const outputDir = core.getInput('output-dir');
    const format = core.getInput('format') || 'all';
    const configPath = core.getInput('config');
    const token = core.getInput('github-token');

    const refs = resolveRefs({ inputBase, inputHead, context });
    if (!refs) {
      core.setFailed(
        'Could not determine base and head refs. Pass `base-ref` and `head-ref` explicitly when running outside a pull_request or push event.',
      );
      return;
    }

    const config = await loadConfig(configPath || undefined, {
      output: outputDir
        ? {
            dir: outputDir,
            formats:
              format === 'all'
                ? ['markdown', 'json']
                : [format as 'markdown' | 'json'],
          }
        : undefined,
      schema: schemaPath ? { paths: [schemaPath] } : undefined,
    });

    if (core.isDebug()) {
      core.debug(`Comparing ${refs.base}..${refs.head}`);
    }

    const range = await parseRange(`${refs.base}..${refs.head}`);
    const result = await diffRange(range, process.cwd(), toLocatorConfig(config.schema));

    core.setOutput('has-breaking', result.summary.breaking > 0);
    core.setOutput('suggested-bump', result.summary.suggestedBump);

    const body = formatComment(result);

    // Always write the job summary so the run page shows the report.
    if (commentOnPR) {
      core.summary.addRaw(body);
      await core.summary.write();

      if (token && context.issue.number) {
        const octokit = getOctokit(token);
        await upsertPullRequestComment({
          octokit,
          repo: context.repo,
          issueNumber: context.issue.number,
          body,
          marker: COMMENT_MARKER,
        });
      } else if (!context.issue.number) {
        core.info('Not running on a pull request — skipping PR comment.');
      } else if (!token) {
        core.warning('comment-on-pr is enabled but no github-token was provided. Skipping PR comment.');
      }
    }

    if (outputDir) {
      await writeOutputs(result, config);
    }

    if (failOnBreaking && result.summary.breaking > 0) {
      core.setFailed(`${result.summary.breaking} breaking change(s) detected`);
    }
  } catch (error) {
    core.setFailed(error instanceof Error ? error.message : String(error));
  }
}

// Only execute when this is the main module (not during import in tests/bundlers)
const isMainModule = process.argv[1]
  ? import.meta.url === new URL(process.argv[1], 'file:').href
  : false;
if (isMainModule) {
  run();
}

export { run };
