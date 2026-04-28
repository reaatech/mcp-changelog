import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, readFileSync, existsSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { writeOutputs } from './write.js';
import type { DiffResult } from '../types/index.js';

function makeDiffResult(overrides: Partial<DiffResult> = {}): DiffResult {
  return {
    from: { type: 'tag', name: 'v1.0.0', sha: 'abc' },
    to: { type: 'tag', name: 'v2.0.0', sha: 'def' },
    changes: [
      {
        type: 'breaking',
        category: 'tool_removed',
        toolName: 'legacySearch',
        path: 'test',
        description: 'Tool removed',
        severity: 'high',
      },
    ],
    schemas: { old: [], new: [] },
    summary: {
      total: 1,
      breaking: 1,
      nonBreaking: 0,
      patch: 0,
      suggestedBump: 'major',
    },
    ...overrides,
  };
}

describe('writeOutputs', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = mkdtempSync(join(tmpdir(), 'mcp-changelog-output-test-'));
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it('should write markdown and json files', async () => {
    const result = makeDiffResult();

    const config = {
      output: {
        dir: testDir,
        formats: ['markdown', 'json'] as Array<'markdown' | 'json'>,
        changelogFile: 'CHANGELOG.md',
        migrationFile: 'MIGRATION.md',
        diffFile: 'diff.json',
      },
    };

    const paths = await writeOutputs(result, config);

    const changelog = readFileSync(paths.changelog, 'utf-8');
    expect(changelog).toContain('# [v2.0.0]');
    expect(changelog).toContain('legacySearch');

    const migration = readFileSync(paths.migration, 'utf-8');
    expect(migration).toContain('Tool removed');

    const diff = readFileSync(paths.diff, 'utf-8');
    const json = JSON.parse(diff);
    expect(json.from).toBe('v1.0.0');
    expect(json.summary.breaking).toBe(1);
  });

  it('should write only json when configured', async () => {
    const result = makeDiffResult({ changes: [], summary: { total: 0, breaking: 0, nonBreaking: 0, patch: 0, suggestedBump: 'patch' } });

    const config = {
      output: {
        dir: testDir,
        formats: ['json'] as Array<'markdown' | 'json'>,
        changelogFile: 'CHANGELOG.md',
        migrationFile: 'MIGRATION.md',
        diffFile: 'diff.json',
      },
    };

    await writeOutputs(result, config);

    const diff = readFileSync(join(testDir, 'diff.json'), 'utf-8');
    expect(JSON.parse(diff).summary.total).toBe(0);

    expect(existsSync(join(testDir, 'CHANGELOG.md'))).toBe(false);
    expect(existsSync(join(testDir, 'MIGRATION.md'))).toBe(false);
  });

  it('should write only markdown when configured', async () => {
    const result = makeDiffResult();

    const config = {
      output: {
        dir: testDir,
        formats: ['markdown'] as Array<'markdown' | 'json'>,
        changelogFile: 'CHANGELOG.md',
        migrationFile: 'MIGRATION.md',
        diffFile: 'diff.json',
      },
    };

    const paths = await writeOutputs(result, config);

    expect(existsSync(paths.changelog)).toBe(true);
    expect(existsSync(paths.migration)).toBe(true);
    expect(existsSync(join(testDir, 'diff.json'))).toBe(false);
  });

  it('should use custom output file names', async () => {
    const result = makeDiffResult();

    const config = {
      output: {
        dir: testDir,
        formats: ['markdown', 'json'] as Array<'markdown' | 'json'>,
        changelogFile: 'CUSTOM_CHANGELOG.md',
        migrationFile: 'CUSTOM_MIGRATION.md',
        diffFile: 'CUSTOM_diff.json',
      },
    };

    const paths = await writeOutputs(result, config);

    expect(paths.changelog).toBe(join(testDir, 'CUSTOM_CHANGELOG.md'));
    expect(paths.migration).toBe(join(testDir, 'CUSTOM_MIGRATION.md'));
    expect(paths.diff).toBe(join(testDir, 'CUSTOM_diff.json'));

    expect(existsSync(paths.changelog)).toBe(true);
    expect(existsSync(paths.migration)).toBe(true);
    expect(existsSync(paths.diff)).toBe(true);
  });

  it('should use default file names and formats when output config is partial', async () => {
    const result = makeDiffResult();

    const config = {
      output: {
        dir: testDir,
        // formats, changelogFile, migrationFile, diffFile all omitted
      },
    };

    const paths = await writeOutputs(result, config as never);

    expect(paths.changelog).toBe(join(testDir, 'CHANGELOG.md'));
    expect(paths.migration).toBe(join(testDir, 'MIGRATION.md'));
    expect(paths.diff).toBe(join(testDir, 'diff.json'));

    expect(existsSync(paths.changelog)).toBe(true);
    expect(existsSync(paths.migration)).toBe(true);
    expect(existsSync(paths.diff)).toBe(true);
  });


});
