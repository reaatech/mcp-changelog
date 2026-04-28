import { describe, it, expect } from 'vitest';
import { summarizeChanges } from './summarize.js';
import type { SchemaChange } from '@mcp-schema-evolution/core';

function makeChange(type: SchemaChange['type'], category: SchemaChange['category']): SchemaChange {
  return {
    type,
    category,
    toolName: 'testTool',
    path: 'test',
    description: 'test change',
    severity: 'low',
  };
}

describe('summarizeChanges', () => {
  it('should suggest patch for no changes', () => {
    const summary = summarizeChanges([]);
    expect(summary.total).toBe(0);
    expect(summary.suggestedBump).toBe('patch');
  });

  it('should suggest patch for only patch changes', () => {
    const changes = [makeChange('patch', 'deprecated')];
    const summary = summarizeChanges(changes);
    expect(summary.patch).toBe(1);
    expect(summary.suggestedBump).toBe('patch');
  });

  it('should suggest minor for non-breaking changes', () => {
    const changes = [
      makeChange('non-breaking', 'tool_added'),
      makeChange('non-breaking', 'field_added'),
    ];
    const summary = summarizeChanges(changes);
    expect(summary.nonBreaking).toBe(2);
    expect(summary.suggestedBump).toBe('minor');
  });

  it('should suggest major for breaking changes', () => {
    const changes = [
      makeChange('non-breaking', 'tool_added'),
      makeChange('breaking', 'tool_removed'),
    ];
    const summary = summarizeChanges(changes);
    expect(summary.breaking).toBe(1);
    expect(summary.suggestedBump).toBe('major');
  });

  it('should count all change types correctly', () => {
    const changes = [
      makeChange('breaking', 'tool_removed'),
      makeChange('breaking', 'field_removed'),
      makeChange('non-breaking', 'tool_added'),
      makeChange('patch', 'deprecated'),
    ];
    const summary = summarizeChanges(changes);
    expect(summary.total).toBe(4);
    expect(summary.breaking).toBe(2);
    expect(summary.nonBreaking).toBe(1);
    expect(summary.patch).toBe(1);
  });
});
