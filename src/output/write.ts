import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import type { DiffResult } from '../types/index.js';
import type { Config } from '../config/types.js';
import { generateChangelog } from '../changelog/generate.js';
import { generateMigrationGuide } from '../migration/generate.js';
import { generateJsonDiff } from '../diff/generate.js';

export interface OutputPaths {
  changelog: string;
  migration: string;
  diff: string;
}

/**
 * Write all output files for a diff result.
 */
export async function writeOutputs(
  diffResult: DiffResult,
  config: Config,
): Promise<OutputPaths> {
  const outputDir = config.output?.dir ?? './';
  await mkdir(outputDir, { recursive: true });

  const paths: OutputPaths = {
    changelog: join(outputDir, config.output?.changelogFile ?? 'CHANGELOG.md'),
    migration: join(outputDir, config.output?.migrationFile ?? 'MIGRATION.md'),
    diff: join(outputDir, config.output?.diffFile ?? 'diff.json'),
  };

  const formats = config.output?.formats ?? ['markdown', 'json'];

  if (formats.includes('markdown')) {
    const changelog = generateChangelog({
      version: diffResult.to.name,
      date: new Date(),
      changes: diffResult.changes,
      suggestedVersionBump: diffResult.summary.suggestedBump,
    });
    await writeFile(paths.changelog, changelog.markdown, 'utf-8');

    const migration = generateMigrationGuide(diffResult.changes);
    await writeFile(paths.migration, migration, 'utf-8');
  }

  if (formats.includes('json')) {
    const jsonDiff = generateJsonDiff(diffResult);
    await writeFile(paths.diff, JSON.stringify(jsonDiff, null, 2), 'utf-8');
  }

  return paths;
}
