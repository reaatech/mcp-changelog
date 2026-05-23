import type { DiffResult, DiffSummary } from '../types/index.js';
import type { SchemaChange } from '@reaatech/mcp-schema-evolution';

export interface JsonDiffOutput {
  version: string;
  from: string;
  to: string;
  date: string;
  summary: DiffSummary;
  changes: Array<SchemaChange & { id: string }>;
  affectedTools: Record<string, { changes: number; breaking: number; nonBreaking: number }>;
}

/**
 * Generate a machine-readable JSON diff object from a DiffResult.
 */
export function generateJsonDiff(diffResult: DiffResult): JsonDiffOutput {
  const affectedTools: Record<string, { changes: number; breaking: number; nonBreaking: number }> =
    {};

  for (const change of diffResult.changes) {
    const tool = affectedTools[change.toolName] ?? { changes: 0, breaking: 0, nonBreaking: 0 };
    tool.changes++;
    if (change.type === 'breaking') {
      tool.breaking++;
    } else if (change.type === 'non-breaking') {
      tool.nonBreaking++;
    }
    affectedTools[change.toolName] = tool;
  }

  return {
    version: '1.0.0',
    from: diffResult.from.name,
    to: diffResult.to.name,
    date: new Date().toISOString(),
    summary: {
      total: diffResult.summary.total,
      breaking: diffResult.summary.breaking,
      nonBreaking: diffResult.summary.nonBreaking,
      patch: diffResult.summary.patch,
      suggestedBump: diffResult.summary.suggestedBump,
    },
    changes: diffResult.changes.map((change, index) => ({
      id: `change-${String(index + 1).padStart(3, '0')}`,
      ...change,
    })),
    affectedTools,
  };
}
