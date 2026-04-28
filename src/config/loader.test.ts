import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, writeFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { loadConfig, ConfigNotFoundError, ConfigValidationError } from './loader.js';
import { defaultConfig } from './defaults.js';

describe('loadConfig', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = mkdtempSync(join(tmpdir(), 'mcp-changelog-config-test-'));
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it('should return defaults when no config file exists', async () => {
    const config = await loadConfig(undefined, undefined, testDir);
    expect(config.output?.dir).toBe(defaultConfig.output?.dir);
    expect(config.output?.formats).toEqual(defaultConfig.output?.formats);
  });

  it('should load JSON config file', async () => {
    writeFileSync(
      join(testDir, 'mcp-changelog.config.json'),
      JSON.stringify({ output: { dir: './docs' } }),
    );
    const config = await loadConfig(join(testDir, 'mcp-changelog.config.json'));
    expect(config.output?.dir).toBe('./docs');
    expect(config.output?.formats).toEqual(defaultConfig.output?.formats);
  });

  it('should merge CLI overrides', async () => {
    const config = await loadConfig(undefined, { output: { dir: '/tmp/output' } }, testDir);
    expect(config.output?.dir).toBe('/tmp/output');
    expect(config.output?.formats).toEqual(defaultConfig.output?.formats);
  });

  it('should throw ConfigNotFoundError for missing explicit path', async () => {
    await expect(loadConfig('./nonexistent.config.json')).rejects.toThrow(ConfigNotFoundError);
  });

  it('should throw ConfigValidationError for invalid config', async () => {
    writeFileSync(
      join(testDir, 'bad.config.json'),
      JSON.stringify({ output: { formats: 'invalid' } }),
    );
    await expect(loadConfig(join(testDir, 'bad.config.json'))).rejects.toThrow(
      ConfigValidationError,
    );
  });

  it('should discover config file automatically', async () => {
    writeFileSync(
      join(testDir, 'mcp-changelog.config.json'),
      JSON.stringify({ changelog: { emojiStyle: 'none' } }),
    );
    const config = await loadConfig(undefined, undefined, testDir);
    expect(config.changelog?.emojiStyle).toBe('none');
    expect(config.output?.dir).toBe(defaultConfig.output?.dir);
  });
});
