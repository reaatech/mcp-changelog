import { describe, it, expect } from 'vitest';
import { generateMigrationGuide } from './generate.js';
import type { SchemaChange } from '@mcp-schema-evolution/core';

function makeBreakingChange(category: SchemaChange['category'], description: string): SchemaChange {
  return {
    type: 'breaking',
    category,
    toolName: 'createUser',
    path: 'test',
    description,
    severity: 'high',
    migration: {
      suggestion: `Update your code to handle this ${category} change`,
      automated: false,
    },
  };
}

describe('generateMigrationGuide', () => {
  it('should return empty guide when no breaking changes', () => {
    const guide = generateMigrationGuide([]);
    expect(guide).toContain('No breaking changes detected');
  });

  it('should include breaking change descriptions', () => {
    const changes = [
      makeBreakingChange('field_renamed', 'Field "name" renamed to "full_name"'),
    ];
    const guide = generateMigrationGuide(changes);
    expect(guide).toContain('Field "name" renamed to "full_name"');
    expect(guide).toContain('What Changed');
    expect(guide).toContain('Migration Steps');
  });

  it('should include summary table', () => {
    const changes = [
      makeBreakingChange('tool_removed', 'Tool "legacySearch" removed'),
      makeBreakingChange('field_removed', 'Field "email" removed'),
    ];
    const guide = generateMigrationGuide(changes);
    expect(guide).toContain('## Summary');
    expect(guide).toContain('legacySearch');
    expect(guide).toContain('email');
  });

  it('should include migration suggestions when available', () => {
    const changes = [
      makeBreakingChange('field_renamed', 'Field "name" renamed to "full_name"'),
    ];
    const guide = generateMigrationGuide(changes);
    expect(guide).toContain('Update your code to handle this field_renamed change');
  });
});
