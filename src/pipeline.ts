import type { RefRange, DiffResult } from './types/index.js';
import type { SchemaLocatorConfig } from './discovery/types.js';
import { locateSchemas } from './discovery/locate.js';
import { detectChanges, detectMultiSchema, summarizeChanges } from './detector/index.js';

/**
 * Discover schemas at both refs in a range and compute the diff.
 *
 * This is the main orchestration function that wires together
 * git resolution, schema discovery, and change detection.
 */
export async function diffRange(
  range: RefRange,
  repoPath: string = process.cwd(),
  config?: Partial<SchemaLocatorConfig>,
): Promise<DiffResult> {
  // Parallel discovery at both refs
  const [oldSchemas, newSchemas] = await Promise.all([
    locateSchemas(range.from, repoPath, config),
    locateSchemas(range.to, repoPath, config),
  ]);

  // Handle single-schema vs multi-schema
  const changes =
    oldSchemas.length === 1 && newSchemas.length === 1
      ? detectChanges(oldSchemas[0]!.schema, newSchemas[0]!.schema)
      : detectMultiSchema(oldSchemas, newSchemas);

  const summary = summarizeChanges(changes);

  return {
    from: range.from,
    to: range.to,
    changes,
    schemas: {
      old: oldSchemas.flatMap((s) => s.schema),
      new: newSchemas.flatMap((s) => s.schema),
    },
    summary,
  };
}
