import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { listTags } from './list-tags.js';
import { handleError } from '../error-handler.js';

vi.mock('../../git/tags.js', () => ({
  listTags: vi.fn().mockResolvedValue([
    { type: 'tag', name: 'v1.0.0', sha: 'abc' },
    { type: 'tag', name: 'v2.0.0', sha: 'def' },
  ]),
}));

vi.mock('../error-handler.js', () => ({
  handleError: vi.fn(),
}));

describe('listTags', () => {
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.clearAllMocks();
  });

  afterEach(() => {
    logSpy.mockRestore();
  });

  it('should list tags', async () => {
    await listTags({});

    expect(logSpy).toHaveBeenCalledWith('v1.0.0');
    expect(logSpy).toHaveBeenCalledWith('v2.0.0');
  });

  it('should handle errors gracefully', async () => {
    const { listTags: gitListTags } = await import('../../git/tags.js');
    vi.mocked(gitListTags).mockRejectedValueOnce(new Error('Git failed'));

    await listTags({});

    expect(handleError).toHaveBeenCalledWith(expect.objectContaining({ message: 'Git failed' }));
  });
});
