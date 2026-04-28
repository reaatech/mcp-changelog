import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtempSync, writeFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { simpleGit } from 'simple-git';
import { listTags } from './tags.js';

describe('listTags', () => {
  let testRepo: string;

  beforeAll(async () => {
    testRepo = mkdtempSync(join(tmpdir(), 'mcp-changelog-tags-test-'));
    const git = simpleGit(testRepo);
    await git.init();
    await git.addConfig('user.name', 'Test');
    await git.addConfig('user.email', 'test@test.com');

    writeFileSync(join(testRepo, 'schema.json'), '{"version": "1.0.0"}');
    await git.add('schema.json');
    await git.commit('v1.0.0');
    await git.addTag('v1.0.0');

    writeFileSync(join(testRepo, 'schema.json'), '{"version": "1.1.0"}');
    await git.add('schema.json');
    await git.commit('v1.1.0');
    await git.addTag('v1.1.0');

    writeFileSync(join(testRepo, 'schema.json'), '{"version": "2.0.0"}');
    await git.add('schema.json');
    await git.commit('v2.0.0');
    await git.addTag('v2.0.0');
  });

  afterAll(() => {
    rmSync(testRepo, { recursive: true, force: true });
  });

  it('should list all tags', async () => {
    const tags = await listTags(testRepo);
    expect(tags).toHaveLength(3);
    expect(tags.map((t) => t.name)).toContain('v1.0.0');
    expect(tags.map((t) => t.name)).toContain('v1.1.0');
    expect(tags.map((t) => t.name)).toContain('v2.0.0');
  });

  it('should filter tags by pattern', async () => {
    const tags = await listTags(testRepo, '^v2\\.');
    expect(tags).toHaveLength(1);
    expect(tags[0].name).toBe('v2.0.0');
  });

  it('should return empty array when no tags match', async () => {
    const tags = await listTags(testRepo, '^v9\\.');
    expect(tags).toHaveLength(0);
  });
});
