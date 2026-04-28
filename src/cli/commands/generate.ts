import { parseRange } from '../../git/resolve.js';
import { diffRange } from '../../pipeline.js';
import { loadConfig, toLocatorConfig } from '../../config/loader.js';
import { writeOutputs } from '../../output/write.js';
import { handleError } from '../error-handler.js';

export interface GenerateOptions {
  schemaPath?: string;
  outputDir: string;
  format: string;
  config?: string;
  verbose: boolean;
}

export async function generate(rangeStr: string, options: GenerateOptions): Promise<void> {
  try {
    const config = await loadConfig(
      options.config,
      {
        output: {
          dir: options.outputDir,
          formats: parseFormats(options.format),
        },
        schema: options.schemaPath ? { paths: [options.schemaPath] } : undefined,
      },
    );

    const range = await parseRange(rangeStr);

    if (options.verbose) {
      console.error(`Resolving range: ${rangeStr}`);
      console.error(`Output directory: ${config.output?.dir}`);
    }

    const result = await diffRange(range, process.cwd(), toLocatorConfig(config.schema));

    const paths = await writeOutputs(result, config);

    console.log('Generated:');
    if (config.output?.formats?.includes('markdown')) {
      console.log(`  - ${paths.changelog}`);
      console.log(`  - ${paths.migration}`);
    }
    if (config.output?.formats?.includes('json')) {
      console.log(`  - ${paths.diff}`);
    }

    if (result.summary.breaking > 0) {
      console.log(`\n⚠️  ${result.summary.breaking} breaking change(s) detected`);
      console.log(`Suggested version bump: ${result.summary.suggestedBump}`);
    }
  } catch (error) {
    handleError(error instanceof Error ? error : new Error(String(error)));
  }
}

export function parseFormats(format: string): Array<'markdown' | 'json'> {
  if (format === 'all') return ['markdown', 'json'];
  if (format === 'markdown') return ['markdown'];
  if (format === 'json') return ['json'];
  throw new Error(`Invalid format: "${format}". Expected: markdown, json, or all`);
}
