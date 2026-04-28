import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { inspect } from './inspect.js';
import { handleError } from '../error-handler.js';

vi.mock('../../git/resolve.js', () => ({
  resolveRef: vi.fn().mockResolvedValue({ type: 'tag', name: 'v1.0.0', sha: 'abc' }),
}));

vi.mock('../../git/read.js', () => ({
  readFileAtRef: vi.fn().mockResolvedValue('[{"name":"getUser"}]'),
}));

vi.mock('../../discovery/parse.js', () => ({
  parseSchema: vi.fn().mockReturnValue([{ name: 'getUser' }]),
}));

vi.mock('../error-handler.js', () => ({
  handleError: vi.fn(),
}));

describe('inspect', () => {
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.clearAllMocks();
  });

  afterEach(() => {
    logSpy.mockRestore();
  });

  it('should inspect schema at a ref', async () => {
    await inspect('schema.json', { ref: 'v1.0.0' });

    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('getUser'));
  });

  it('should handle errors gracefully', async () => {
    const { readFileAtRef } = await import('../../git/read.js');
    vi.mocked(readFileAtRef).mockRejectedValueOnce(new Error('Read failed'));

    await inspect('schema.json', { ref: 'v1.0.0' });

    expect(handleError).toHaveBeenCalledWith(expect.objectContaining({ message: 'Read failed' }));
  });
});
