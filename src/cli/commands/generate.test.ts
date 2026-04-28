import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { generate, parseFormats } from './generate.js';
import { handleError } from '../error-handler.js';

vi.mock('../../git/resolve.js', () => ({
  parseRange: vi.fn().mockResolvedValue({
    from: { type: 'tag', name: 'v1.0.0', sha: 'abc' },
    to: { type: 'tag', name: 'v2.0.0', sha: 'def' },
  }),
}));

vi.mock('../../pipeline.js', () => ({
  diffRange: vi.fn().mockResolvedValue({
    from: { type: 'tag', name: 'v1.0.0', sha: 'abc' },
    to: { type: 'tag', name: 'v2.0.0', sha: 'def' },
    changes: [
      {
        type: 'non-breaking',
        category: 'tool_added',
        toolName: 'getUser',
        path: 'test',
        description: 'New tool added',
        severity: 'low',
      },
    ],
    schemas: { old: [], new: [] },
    summary: {
      total: 1,
      breaking: 0,
      nonBreaking: 1,
      patch: 0,
      suggestedBump: 'minor',
    },
  }),
}));

vi.mock('../../config/loader.js', () => ({
  loadConfig: vi.fn().mockResolvedValue({
    output: {
      dir: './output',
      formats: ['markdown', 'json'],
    },
    schema: {},
  }),
  toLocatorConfig: vi.fn().mockReturnValue(undefined),
}));

vi.mock('../../output/write.js', () => ({
  writeOutputs: vi.fn().mockResolvedValue({
    changelog: './output/CHANGELOG.md',
    migration: './output/MIGRATION.md',
    diff: './output/diff.json',
  }),
}));

vi.mock('../error-handler.js', () => ({
  handleError: vi.fn(),
}));

describe('parseFormats', () => {
  it('should return both formats for all', () => {
    expect(parseFormats('all')).toEqual(['markdown', 'json']);
  });

  it('should return markdown only', () => {
    expect(parseFormats('markdown')).toEqual(['markdown']);
  });

  it('should return json only', () => {
    expect(parseFormats('json')).toEqual(['json']);
  });

  it('should throw for invalid format', () => {
    expect(() => parseFormats('xml')).toThrow('Invalid format: "xml"');
  });
});

describe('generate', () => {
  let logSpy: ReturnType<typeof vi.spyOn>;
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it('should generate outputs successfully', async () => {
    await generate('v1.0.0..v2.0.0', {
      outputDir: './output',
      format: 'all',
      verbose: false,
    });

    expect(logSpy).toHaveBeenCalledWith('Generated:');
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('CHANGELOG.md'));
    expect(handleError).not.toHaveBeenCalled();
  });

  it('should log verbose information', async () => {
    await generate('v1.0.0..v2.0.0', {
      outputDir: './output',
      format: 'all',
      verbose: true,
    });

    expect(errorSpy).toHaveBeenCalledWith('Resolving range: v1.0.0..v2.0.0');
    expect(handleError).not.toHaveBeenCalled();
  });

  it('should handle loadConfig errors gracefully', async () => {
    const { loadConfig } = await import('../../config/loader.js');
    vi.mocked(loadConfig).mockRejectedValueOnce(new Error('Config failed'));

    await generate('v1.0.0..v2.0.0', {
      outputDir: './output',
      format: 'all',
      verbose: false,
    });

    expect(handleError).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Config failed' }),
    );
  });
});
