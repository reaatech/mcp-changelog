import type { SchemaChange } from '@reaatech/mcp-schema-evolution';
import type { DiffSummary } from '../types/index.js';

/**
 * Summarize a list of schema changes into counts and a suggested version bump.
 */
export function summarizeChanges(changes: SchemaChange[]): DiffSummary {
  const breaking = changes.filter((c) => c.type === 'breaking').length;
  const nonBreaking = changes.filter((c) => c.type === 'non-breaking').length;
  const patch = changes.filter((c) => c.type === 'patch').length;

  let suggestedBump: DiffSummary['suggestedBump'] = 'patch';
  if (breaking > 0) {
    suggestedBump = 'major';
  } else if (nonBreaking > 0) {
    suggestedBump = 'minor';
  }

  return {
    total: changes.length,
    breaking,
    nonBreaking,
    patch,
    suggestedBump,
  };
}
