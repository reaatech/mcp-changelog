import type { DiffResult } from '../types/index.js';

/** HTML marker used to identify comments posted by this action. */
export const COMMENT_MARKER = '<!-- mcp-changelog:pr-comment -->';

export function formatComment(diffResult: DiffResult): string {
  const { changes, summary } = diffResult;

  let body = `${COMMENT_MARKER}\n## Schema Changes Detected\n\n`;

  if (changes.length === 0) {
    body += '*No schema changes detected.*\n';
    return body;
  }

  body += '| Change | Tool | Severity |\n';
  body += '|---|---|---|\n';

  for (const change of changes.slice(0, 20)) {
    const icon = change.type === 'breaking' ? '🔴' : change.type === 'non-breaking' ? '🟢' : '⚪';
    body += `| ${change.description} | \`${change.toolName}\` | ${icon} ${change.severity} |\n`;
  }

  if (changes.length > 20) {
    body += `| *...and ${changes.length - 20} more changes* | | |\n`;
  }

  body += `\n**Suggested version bump**: \`${summary.suggestedBump}\`\n`;

  if (summary.breaking > 0) {
    body += `\n⚠️ **${summary.breaking} breaking change(s) detected**\n`;
  }

  return body;
}
