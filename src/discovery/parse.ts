import { z } from 'zod';
import type { Tool } from '../types/index.js';
import { SchemaParseError } from './types.js';

const toolSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  inputSchema: z.object({
    $schema: z.string().optional(),
    type: z.literal('object'),
    properties: z.record(z.unknown()).optional(),
    required: z.array(z.string()).optional(),
  }),
});

const toolArraySchema = z.array(toolSchema);
const wrappedSchema = z.object({ tools: toolArraySchema });

/**
 * Parse a schema file's content into a Tool[] array.
 *
 * Supports JSON files containing either a raw Tool[] array or an object
 * with a `tools` property. Validated with zod so malformed shapes surface as
 * descriptive SchemaParseErrors rather than crashing the diff engine.
 */
export function parseSchema(content: string, path: string): Tool[] {
  let parsed: unknown;

  try {
    parsed = JSON.parse(content) as unknown;
  } catch (cause) {
    const context: { cause?: Error; suggestion: string } = {
      suggestion: 'Check for trailing commas or unquoted keys',
    };
    if (cause instanceof Error) {
      context.cause = cause;
    }
    throw new SchemaParseError(path, context);
  }

  if (Array.isArray(parsed)) {
    const result = toolArraySchema.safeParse(parsed);
    if (!result.success) {
      throw new SchemaParseError(path, {
        suggestion: `Invalid tool array: ${result.error.issues
          .slice(0, 3)
          .map((i) => `${i.path.join('.') || '<root>'}: ${i.message}`)
          .join('; ')}`,
      });
    }
    return result.data as Tool[];
  }

  if (typeof parsed === 'object' && parsed !== null && 'tools' in parsed) {
    const result = wrappedSchema.safeParse(parsed);
    if (!result.success) {
      throw new SchemaParseError(path, {
        suggestion: `Invalid wrapped schema: ${result.error.issues
          .slice(0, 3)
          .map((i) => `${i.path.join('.') || '<root>'}: ${i.message}`)
          .join('; ')}`,
      });
    }
    return result.data.tools as Tool[];
  }

  throw new SchemaParseError(path, {
    suggestion: 'Schema must be a Tool[] array or an object with a "tools" property',
  });
}
