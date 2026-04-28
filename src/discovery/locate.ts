import { minimatch } from 'minimatch';
import type { GitRef } from '../types/index.js';
import { listFilesAtRef, readFileAtRef } from '../git/read.js';
import { parseSchema } from './parse.js';
import { SchemaNotFoundError } from './types.js';
import type { SchemaLocatorConfig, DiscoveredSchema } from './types.js';

const DEFAULT_PATTERNS = [
  'schema.json',
  'mcp.json',
  'tools.json',
  '**/*.schema.json',
];

const DEFAULT_EXCLUDE = [
  'node_modules/**',
  'dist/**',
  '.git/**',
  'coverage/**',
];

/**
 * Locate schema files in a git tree at a specific ref.
 *
 * Checks files against configured patterns and returns parsed schemas.
 */
export async function locateSchemas(
  ref: GitRef,
  repoPath: string = process.cwd(),
  partialConfig?: Partial<SchemaLocatorConfig>,
): Promise<DiscoveredSchema[]> {
  const config: SchemaLocatorConfig = {
    patterns: partialConfig?.patterns ?? DEFAULT_PATTERNS,
    exclude: partialConfig?.exclude ?? DEFAULT_EXCLUDE,
  };

  const allFiles = await listFilesAtRef(ref, repoPath);

  const matchedFiles = allFiles.filter((file) => {
    const isExcluded = config.exclude.some((pattern) => minimatch(file, pattern));
    if (isExcluded) return false;

    return config.patterns.some((pattern) => minimatch(file, pattern));
  });

  if (matchedFiles.length === 0) {
    throw new SchemaNotFoundError(ref.name, {
      searched: config.patterns,
      suggestion: 'Create a schema.json file or configure custom patterns via mcp-changelog.config.ts',
    });
  }

  const discovered: DiscoveredSchema[] = [];

  for (const path of matchedFiles) {
    try {
      const content = await readFileAtRef(ref, path, repoPath);
      const schema = parseSchema(content, path);
      discovered.push({ path, ref, schema });
    } catch (error) {
      if (error instanceof SchemaNotFoundError) {
        throw error;
      }
      discovered.push({
        path,
        ref,
        schema: [],
        parseError: error instanceof Error ? error : new Error(String(error)),
      });
    }
  }

  return discovered;
}
