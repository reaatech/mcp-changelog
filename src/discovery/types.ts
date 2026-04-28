import type { GitRef, Tool } from '../types/index.js';

/** Configuration for locating schema files. */
export interface SchemaLocatorConfig {
  patterns: string[];
  exclude: string[];
}

/** A schema file discovered in a git tree. */
export interface DiscoveredSchema {
  path: string;
  ref: GitRef;
  schema: Tool[];
  parseError?: Error;
}

export class SchemaNotFoundError extends Error {
  constructor(ref: string, context?: { searched?: string[]; suggestion?: string }) {
    let message = `No schema file found at ref "${ref}"`;
    if (context?.searched && context.searched.length > 0) {
      message += `\nSearched patterns: ${context.searched.join(', ')}`;
    }
    if (context?.suggestion) {
      message += `\n${context.suggestion}`;
    }
    super(message);
    this.name = 'SchemaNotFoundError';
  }
}

export class SchemaParseError extends Error {
  constructor(filePath: string, context?: { cause?: Error; suggestion?: string }) {
    let message = `Failed to parse ${filePath}`;
    if (context?.cause) {
      message += `: ${context.cause.message}`;
    }
    if (context?.suggestion) {
      message += `\n${context.suggestion}`;
    }
    super(message, context?.cause ? { cause: context.cause } : undefined);
    this.name = 'SchemaParseError';
  }
}
