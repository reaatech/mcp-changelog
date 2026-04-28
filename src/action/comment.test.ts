import { describe, it, expect } from 'vitest';
import { formatComment } from './comment.js';
import type { DiffResult } from '../types/index.js';

describe('formatComment', () => {
  it('should format empty changes', () => {
    const result: DiffResult = {
      from: { type: 'tag', name: 'v1.0.0', sha: 'abc' },
      to: { type: 'tag', name: 'v1.0.1', sha: 'def' },
      changes: [],
      schemas: { old: [], new: [] },
      summary: { total: 0, breaking: 0, nonBreaking: 0, patch: 0, suggestedBump: 'patch' },
    };

    const comment = formatComment(result);
    expect(comment).toContain('Schema Changes Detected');
    expect(comment).toContain('No schema changes detected');
  });

  it('should format changes table', () => {
    const result: DiffResult = {
      from: { type: 'tag', name: 'v1.0.0', sha: 'abc' },
      to: { type: 'tag', name: 'v2.0.0', sha: 'def' },
      changes: [
        {
          type: 'breaking',
          category: 'field_renamed',
          toolName: 'createUser',
          path: 'test',
          description: 'Field "name" renamed to "full_name"',
          severity: 'high',
        },
        {
          type: 'non-breaking',
          category: 'tool_added',
          toolName: 'getUser',
          path: 'test',
          description: 'New tool added',
          severity: 'low',
        },
      ],
      schemas: { old: [], new: [] },
      summary: { total: 2, breaking: 1, nonBreaking: 1, patch: 0, suggestedBump: 'major' },
    };

    const comment = formatComment(result);
    expect(comment).toContain('Schema Changes Detected');
    expect(comment).toContain('createUser');
    expect(comment).toContain('getUser');
    expect(comment).toContain('Suggested version bump');
    expect(comment).toContain('major');
  });

  it('should warn about breaking changes', () => {
    const result: DiffResult = {
      from: { type: 'tag', name: 'v1.0.0', sha: 'abc' },
      to: { type: 'tag', name: 'v2.0.0', sha: 'def' },
      changes: [
        {
          type: 'breaking',
          category: 'tool_removed',
          toolName: 'legacySearch',
          path: 'test',
          description: 'Tool removed',
          severity: 'high',
        },
      ],
      schemas: { old: [], new: [] },
      summary: { total: 1, breaking: 1, nonBreaking: 0, patch: 0, suggestedBump: 'major' },
    };

    const comment = formatComment(result);
    expect(comment).toContain('breaking change(s) detected');
  });
});
