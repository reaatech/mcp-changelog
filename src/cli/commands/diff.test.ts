import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { diff } from './diff.js';
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
        type: 'breaking',
        category: 'field_renamed',
        toolName: 'createUser',
        path: 'test',
        description: 'Field renamed',
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
  }),
}));

vi.mock('../../config/loader.js', () => ({
  loadConfig: vi.fn().mockResolvedValue({
    schema: {},
  }),
  toLocatorConfig: vi.fn().mockReturnValue(undefined),
}));

vi.mock('../../diff/generate.js', () => ({
  generateJsonDiff: vi.fn().mockReturnValue({
    from: 'v1.0.0',
    to: 'v2.0.0',
    changes: [],
  }),
}));

vi.mock('../error-handler.js', () => ({
  handleError: vi.fn(),
}));

describe('diff', () => {
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.clearAllMocks();
  });

  afterEach(() => {
    logSpy.mockRestore();
  });

  it('should output text diff by default', async () => {
    await diff('v1.0.0..v2.0.0', {
      format: 'text',
    });

    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Changes from v1.0.0 to v2.0.0'));
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Total: 1'));
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Breaking: 1'));
    expect(handleError).not.toHaveBeenCalled();
  });

  it('should output json diff when requested', async () => {
    await diff('v1.0.0..v2.0.0', {
      format: 'json',
    });

    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('"from": "v1.0.0"'));
    expect(handleError).not.toHaveBeenCalled();
  });

  it('should handle parseRange errors gracefully', async () => {
    const { parseRange } = await import('../../git/resolve.js');
    vi.mocked(parseRange).mockRejectedValueOnce(new Error('Invalid ref'));

    await diff('v1.0.0..v2.0.0', {
      format: 'text',
    });

    expect(handleError).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Invalid ref' }),
    );
  });
});
