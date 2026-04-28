import { describe, it, expect } from 'vitest';
import { generateJsonDiff } from './generate.js';
import type { DiffResult } from '../types/index.js';

function makeDiffResult(changes: DiffResult['changes']): DiffResult {
  return {
    from: { type: 'tag', name: 'v1.0.0', sha: 'abc123' },
    to: { type: 'tag', name: 'v2.0.0', sha: 'def456' },
    changes,
    schemas: { old: [], new: [] },
    summary: {
      total: changes.length,
      breaking: changes.filter((c) => c.type === 'breaking').length,
      nonBreaking: changes.filter((c) => c.type === 'non-breaking').length,
      patch: changes.filter((c) => c.type === 'patch').length,
      suggestedBump: changes.some((c) => c.type === 'breaking') ? 'major' : 'minor',
    },
  };
}

describe('generateJsonDiff', () => {
  it('should generate valid JSON diff structure', () => {
    const result = makeDiffResult([
      {
        type: 'breaking',
        category: 'field_renamed',
        toolName: 'createUser',
        path: 'inputSchema.properties.name',
        description: 'Field "name" renamed to "full_name"',
        severity: 'high',
      },
    ]);

    const json = generateJsonDiff(result) as Record<string, unknown>;

    expect(json.from).toBe('v1.0.0');
    expect(json.to).toBe('v2.0.0');
    expect(json.summary).toEqual({
      total: 1,
      breaking: 1,
      nonBreaking: 0,
      patch: 0,
      suggestedBump: 'major',
    });
    expect(Array.isArray(json.changes)).toBe(true);
    expect((json.changes as Array<Record<string, unknown>>)[0].id).toBe('change-001');
    expect((json.changes as Array<Record<string, unknown>>)[0].toolName).toBe('createUser');
  });

  it('should include affected tools summary', () => {
    const result = makeDiffResult([
      {
        type: 'breaking',
        category: 'field_renamed',
        toolName: 'createUser',
        path: 'test',
        description: 'Field renamed',
        severity: 'high',
      },
      {
        type: 'non-breaking',
        category: 'tool_added',
        toolName: 'getUser',
        path: 'test',
        description: 'Tool added',
        severity: 'low',
      },
    ]);

    const json = generateJsonDiff(result) as Record<string, unknown>;
    const affectedTools = json.affectedTools as Record<string, { changes: number; breaking: number; nonBreaking: number }>;

    expect(affectedTools.createUser).toEqual({ changes: 1, breaking: 1, nonBreaking: 0 });
    expect(affectedTools.getUser).toEqual({ changes: 1, breaking: 0, nonBreaking: 1 });
  });

  it('should include version field', () => {
    const result = makeDiffResult([]);
    const json = generateJsonDiff(result) as Record<string, unknown>;
    expect(json.version).toBe('1.0.0');
  });
});
