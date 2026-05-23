import { diffToolSnapshots } from '@reaatech/mcp-schema-evolution';
import type { SchemaChange, Tool } from '@reaatech/mcp-schema-evolution';
import type { DiscoveredSchema } from '../discovery/types.js';

/**
 * Detect changes between two tool snapshots.
 *
 * Thin wrapper around `@reaatech/mcp-schema-evolution`'s `diffToolSnapshots`.
 * Always check `Result.ok` and throws descriptive errors on failure.
 */
export function detectChanges(oldTools: Tool[], newTools: Tool[]): SchemaChange[] {
  const result = diffToolSnapshots(oldTools, newTools);
  if (!result.ok) {
    throw new Error(`Schema diff failed: ${result.error.message}`);
  }
  return result.value;
}

/**
 * Detect changes across multiple schema files (monorepo-style).
 *
 * Pairs schemas by file path, detects added/removed schema files,
 * and diffs each matched pair.
 */
export function detectMultiSchema(
  oldSchemas: DiscoveredSchema[],
  newSchemas: DiscoveredSchema[],
): SchemaChange[] {
  const oldPaths = new Map(oldSchemas.map((s) => [s.path, s]));
  const newPaths = new Map(newSchemas.map((s) => [s.path, s]));

  const changes: SchemaChange[] = [];

  // Detect removed schema files
  for (const [path, oldSchema] of oldPaths) {
    if (!newPaths.has(path)) {
      for (const tool of oldSchema.schema) {
        changes.push({
          type: 'breaking',
          category: 'tool_removed',
          toolName: tool.name,
          path: `${path} → removed`,
          description: `Schema file "${path}" removed (contained tool "${tool.name}")`,
          severity: 'high',
        });
      }
    }
  }

  // Detect added schema files
  for (const [path, newSchema] of newPaths) {
    if (!oldPaths.has(path)) {
      for (const tool of newSchema.schema) {
        changes.push({
          type: 'non-breaking',
          category: 'tool_added',
          toolName: tool.name,
          path: `${path} → added`,
          description: `Schema file "${path}" added (contains tool "${tool.name}")`,
          severity: 'low',
        });
      }
    }
  }

  // Diff matched schema files
  for (const [path, oldSchema] of oldPaths) {
    const newSchema = newPaths.get(path);
    if (!newSchema) continue;

    const fileChanges = detectChanges(oldSchema.schema, newSchema.schema);

    // Prefix change paths with schema file path for context
    for (const change of fileChanges) {
      changes.push({
        ...change,
        path: `${path}:${change.path}`,
      });
    }
  }

  return changes;
}
