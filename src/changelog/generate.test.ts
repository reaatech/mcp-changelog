import { describe, it, expect } from 'vitest';
import { generateChangelog } from './generate.js';
import type { SchemaChange } from '@mcp-schema-evolution/core';

function makeChange(type: SchemaChange['type'], category: SchemaChange['category']): SchemaChange {
  return {
    type,
    category,
    toolName: 'createUser',
    path: 'test',
    description: 'Test change',
    severity: 'low',
  };
}

describe('generateChangelog', () => {
  it('should generate changelog with breaking changes section', () => {
    const result = generateChangelog({
      version: '2.0.0',
      date: new Date('2024-05-15'),
      changes: [
        makeChange('breaking', 'field_renamed'),
        makeChange('breaking', 'tool_removed'),
        makeChange('non-breaking', 'tool_added'),
      ],
      suggestedVersionBump: 'major',
    });

    expect(result.markdown).toContain('# [2.0.0] - 2024-05-15');
    expect(result.markdown).toContain('## 🔥 Breaking Changes');
    expect(result.markdown).toContain('## ✨ Added');
    expect(result.hasBreaking).toBe(true);
    expect(result.suggestedVersionBump).toBe('major');
    expect(result.changeCount).toBe(3);
  });

  it('should handle empty changes', () => {
    const result = generateChangelog({
      version: '1.0.1',
      date: new Date('2024-05-15'),
      changes: [],
      suggestedVersionBump: 'patch',
    });

    expect(result.markdown).toContain('No schema changes detected');
    expect(result.hasBreaking).toBe(false);
    expect(result.suggestedVersionBump).toBe('patch');
  });

  it('should return caller-supplied version bump', () => {
    const result = generateChangelog({
      version: '1.1.0',
      date: new Date('2024-05-15'),
      changes: [makeChange('non-breaking', 'tool_added')],
      suggestedVersionBump: 'minor',
    });

    expect(result.suggestedVersionBump).toBe('minor');
    expect(result.hasBreaking).toBe(false);
  });

  it('should include tool names in change lines', () => {
    const result = generateChangelog({
      version: '2.0.0',
      date: new Date('2024-05-15'),
      changes: [
        { ...makeChange('breaking', 'field_renamed'), toolName: 'getUser', description: 'Field name renamed' },
      ],
      suggestedVersionBump: 'major',
    });

    expect(result.markdown).toContain('**getUser**');
    expect(result.markdown).toContain('Field name renamed');
  });
});
