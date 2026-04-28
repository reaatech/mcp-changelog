import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtempSync, writeFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { simpleGit } from 'simple-git';
import { readFileAtRef, listFilesAtRef } from './read.js';
import { resolveRef } from './resolve.js';
import { GitFileNotFoundError } from './types.js';

describe('readFileAtRef', () => {
  let testRepo: string;
  let v1Ref: Awaited<ReturnType<typeof resolveRef>>;

  beforeAll(async () => {
    testRepo = mkdtempSync(join(tmpdir(), 'mcp-changelog-read-test-'));
    const git = simpleGit(testRepo);
    await git.init();
    await git.addConfig('user.name', 'Test');
    await git.addConfig('user.email', 'test@test.com');

    writeFileSync(join(testRepo, 'schema.json'), '{"version": "1.0.0"}');
    await git.add('schema.json');
    await git.commit('Initial commit');
    await git.addTag('v1.0.0');

    v1Ref = await resolveRef('v1.0.0', testRepo);
  });

  afterAll(() => {
    rmSync(testRepo, { recursive: true, force: true });
  });

  it('should read a file at a specific ref', async () => {
    const content = await readFileAtRef(v1Ref, 'schema.json', testRepo);
    expect(content.trim()).toBe('{"version": "1.0.0"}');
  });

  it('should throw GitFileNotFoundError for non-existent file', async () => {
    await expect(readFileAtRef(v1Ref, 'nonexistent.json', testRepo)).rejects.toThrow(
      GitFileNotFoundError,
    );
  });
});

describe('listFilesAtRef', () => {
  let testRepo: string;
  let v1Ref: Awaited<ReturnType<typeof resolveRef>>;

  beforeAll(async () => {
    testRepo = mkdtempSync(join(tmpdir(), 'mcp-changelog-list-test-'));
    const git = simpleGit(testRepo);
    await git.init();
    await git.addConfig('user.name', 'Test');
    await git.addConfig('user.email', 'test@test.com');

    writeFileSync(join(testRepo, 'schema.json'), '{}');
    writeFileSync(join(testRepo, 'README.md'), '# Test');
    await git.add(['schema.json', 'README.md']);
    await git.commit('Initial commit');
    await git.addTag('v1.0.0');

    v1Ref = await resolveRef('v1.0.0', testRepo);
  });

  afterAll(() => {
    rmSync(testRepo, { recursive: true, force: true });
  });

  it('should list files at a ref', async () => {
    const files = await listFilesAtRef(v1Ref, testRepo);
    expect(files).toContain('schema.json');
    expect(files).toContain('README.md');
  });
});
