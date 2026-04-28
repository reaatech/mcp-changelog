import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtempSync, writeFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { simpleGit } from 'simple-git';
import { resolveRef, parseRange } from './resolve.js';
import { GitRefNotFoundError, InvalidRangeError } from './types.js';

describe('resolveRef', () => {
  let testRepo: string;

  beforeAll(async () => {
    testRepo = mkdtempSync(join(tmpdir(), 'mcp-changelog-git-test-'));
    const git = simpleGit(testRepo);
    await git.init();
    await git.addConfig('user.name', 'Test');
    await git.addConfig('user.email', 'test@test.com');

    writeFileSync(join(testRepo, 'schema.json'), '{"version": "1.0.0"}');
    await git.add('schema.json');
    await git.commit('Initial commit');
    await git.addTag('v1.0.0');

    writeFileSync(join(testRepo, 'schema.json'), '{"version": "2.0.0"}');
    await git.add('schema.json');
    await git.commit('v2.0.0');
    await git.addTag('v2.0.0');
  });

  afterAll(() => {
    rmSync(testRepo, { recursive: true, force: true });
  });

  it('should resolve a valid tag', async () => {
    const ref = await resolveRef('v1.0.0', testRepo);
    expect(ref.type).toBe('tag');
    expect(ref.name).toBe('v1.0.0');
    expect(ref.sha).toMatch(/^[0-9a-f]{40}$/);
  });

  it('should resolve a valid commit SHA', async () => {
    const tagRef = await resolveRef('v1.0.0', testRepo);
    const commitRef = await resolveRef(tagRef.sha, testRepo);
    expect(commitRef.type).toBe('commit');
    expect(commitRef.sha).toBe(tagRef.sha);
  });

  it('should throw GitRefNotFoundError for non-existent ref', async () => {
    await expect(resolveRef('nonexistent', testRepo)).rejects.toThrow(GitRefNotFoundError);
  });

  describe('parseRange', () => {
    it('should parse a valid range', async () => {
      const range = await parseRange('v1.0.0..v2.0.0', testRepo);
      expect(range.from.name).toBe('v1.0.0');
      expect(range.to.name).toBe('v2.0.0');
      expect(range.from.sha).toMatch(/^[0-9a-f]{40}$/);
      expect(range.to.sha).toMatch(/^[0-9a-f]{40}$/);
    });

    it('should throw InvalidRangeError for malformed range', async () => {
      await expect(parseRange('invalid', testRepo)).rejects.toThrow(InvalidRangeError);
    });

    it('should throw InvalidRangeError for empty parts', async () => {
      await expect(parseRange('..v2.0.0', testRepo)).rejects.toThrow(InvalidRangeError);
    });
  });
});
