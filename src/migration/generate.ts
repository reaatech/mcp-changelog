import type { SchemaChange } from '@reaatech/mcp-schema-evolution';

/**
 * Generate a migration guide Markdown document for breaking changes.
 */
export function generateMigrationGuide(changes: SchemaChange[]): string {
  const breakingChanges = changes.filter((c) => c.type === 'breaking');

  if (breakingChanges.length === 0) {
    return '# Migration Guide\n\nNo breaking changes detected. No migration steps required.\n';
  }

  let markdown = '# Migration Guide\n\n';

  for (const change of breakingChanges) {
    markdown += `## Breaking Change: ${change.description}\n\n`;
    markdown += `### What Changed\n${change.description}\n\n`;

    if (change.migration) {
      markdown += `### Migration Steps\n`;
      markdown += `1. ${change.migration.suggestion}\n`;
      markdown += '\n';
    }

    markdown += '---\n\n';
  }

  markdown += '## Summary\n\n';
  markdown += '| Change | Tool | Severity |\n';
  markdown += '|---|---|---|\n';
  for (const change of breakingChanges) {
    markdown += `| ${change.description} | \`${change.toolName}\` | ${change.severity} |\n`;
  }

  return markdown.trim();
}
