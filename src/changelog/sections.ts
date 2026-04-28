import type { SchemaChange } from '@mcp-schema-evolution/core';

export interface Section {
  emoji: string;
  title: string;
  filter: (change: SchemaChange) => boolean;
}

export const DEFAULT_SECTIONS: Section[] = [
  {
    emoji: '🔥',
    title: 'Breaking Changes',
    filter: (c) => c.type === 'breaking',
  },
  {
    emoji: '✨',
    title: 'Added',
    filter: (c) => c.type === 'non-breaking' && (c.category === 'tool_added' || c.category === 'field_added'),
  },
  {
    emoji: '⚠️',
    title: 'Changed',
    filter: (c) =>
      c.type === 'non-breaking' &&
      c.category !== 'tool_added' &&
      c.category !== 'field_added',
  },
  {
    emoji: '🐛',
    title: 'Fixed',
    filter: (c) => c.type === 'patch',
  },
];

export function buildChangeLine(change: SchemaChange): string {
  return `- **${change.toolName}**: ${change.description}`;
}
