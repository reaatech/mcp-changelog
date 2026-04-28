import type { ChangelogConfig, ChangelogOutput } from '../types/index.js';
import { DEFAULT_SECTIONS, buildChangeLine } from './sections.js';

/**
 * Generate a Markdown changelog from schema changes.
 *
 * Uses the caller-supplied `suggestedVersionBump` (typically from
 * `DiffResult.summary.suggestedBump`) to avoid duplicating semver logic.
 */
export function generateChangelog(config: ChangelogConfig): ChangelogOutput {
  const { version, date, changes, suggestedVersionBump } = config;
  const hasBreaking = changes.some((c) => c.type === 'breaking');

  let markdown = `# [${version}] - ${date.toISOString().split('T')[0]}\n\n`;

  for (const section of DEFAULT_SECTIONS) {
    const sectionChanges = changes.filter(section.filter);
    if (sectionChanges.length === 0) continue;

    markdown += `## ${section.emoji} ${section.title}\n`;
    for (const change of sectionChanges) {
      markdown += `${buildChangeLine(change)}\n`;
    }
    markdown += '\n';
  }

  if (changes.length === 0) {
    markdown += '*No schema changes detected.*\n';
  }

  return {
    markdown: markdown.trim(),
    suggestedVersionBump,
    hasBreaking,
    changeCount: changes.length,
  };
}
