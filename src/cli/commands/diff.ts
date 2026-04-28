import { parseRange } from '../../git/resolve.js';
import { diffRange } from '../../pipeline.js';
import { loadConfig, toLocatorConfig } from '../../config/loader.js';
import { generateJsonDiff } from '../../diff/generate.js';
import { handleError } from '../error-handler.js';

export interface DiffOptions {
  schemaPath?: string;
  format: string;
  config?: string;
}

export async function diff(rangeStr: string, options: DiffOptions): Promise<void> {
  try {
    const config = await loadConfig(
      options.config,
      {
        schema: options.schemaPath ? { paths: [options.schemaPath] } : undefined,
      },
    );

    const range = await parseRange(rangeStr);
    const result = await diffRange(range, process.cwd(), toLocatorConfig(config.schema));

    if (options.format === 'json') {
      console.log(JSON.stringify(generateJsonDiff(result), null, 2));
    } else {
      console.log(`Changes from ${result.from.name} to ${result.to.name}:`);
      console.log(`  Total: ${result.summary.total}`);
      console.log(`  Breaking: ${result.summary.breaking}`);
      console.log(`  Non-breaking: ${result.summary.nonBreaking}`);
      console.log(`  Patch: ${result.summary.patch}`);
      console.log(`  Suggested bump: ${result.summary.suggestedBump}`);
      console.log('');
      for (const change of result.changes) {
        const icon = change.type === 'breaking' ? '🔴' : change.type === 'non-breaking' ? '🟢' : '⚪';
        console.log(`  ${icon} [${change.toolName}] ${change.description}`);
      }
    }
  } catch (error) {
    handleError(error instanceof Error ? error : new Error(String(error)));
  }
}
