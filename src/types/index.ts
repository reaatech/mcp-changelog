/**
 * Core types for mcp-changelog.
 *
 * These extend the shared types from @reaatech/mcp-schema-evolution with
 * changelog-specific types for git refs, output generation, and configuration.
 */

import type { SchemaChange, Tool } from '@reaatech/mcp-schema-evolution';

/** A resolved git reference. */
export interface GitRef {
  type: 'tag' | 'commit' | 'branch';
  name: string;
  sha: string;
}

/** A range of two git refs (from..to). */
export interface RefRange {
  from: GitRef;
  to: GitRef;
}

/** Supported output formats. */
export type OutputFormat = 'markdown' | 'json';

/** Changelog generation configuration. */
export interface ChangelogConfig {
  version: string;
  date: Date;
  changes: SchemaChange[];
  suggestedVersionBump: 'major' | 'minor' | 'patch';
  template?: string;
  includeMigrationLinks?: boolean;
}

/** Changelog generation output. */
export interface ChangelogOutput {
  markdown: string;
  suggestedVersionBump: 'major' | 'minor' | 'patch';
  hasBreaking: boolean;
  changeCount: number;
}

/** Result of a schema diff operation. */
export interface DiffResult {
  from: GitRef;
  to: GitRef;
  changes: SchemaChange[];
  schemas: {
    old: Tool[];
    new: Tool[];
  };
  summary: DiffSummary;
}

/** Summary statistics for a diff. */
export interface DiffSummary {
  total: number;
  breaking: number;
  nonBreaking: number;
  patch: number;
  suggestedBump: 'major' | 'minor' | 'patch';
}

/** Re-export shared types for convenience. */
export type { SchemaChange, Tool, ToolSnapshot } from '@reaatech/mcp-schema-evolution';
