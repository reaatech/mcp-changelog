import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtempSync, writeFileSync, rmSync, readFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { simpleGit } from 'simple-git';
import { execa } from 'execa';

describe('CLI Integration', () => {
  let testRepo: string;
  let cliPath: string;

  beforeAll(async () => {
    testRepo = mkdtempSync(join(tmpdir(), 'mcp-changelog-cli-test-'));
    const git = simpleGit(testRepo);
    await git.init();
    await git.addConfig('user.name', 'Test');
    await git.addConfig('user.email', 'test@test.com');

    writeFileSync(
      join(testRepo, 'schema.json'),
      JSON.stringify([
        { name: 'getUser', inputSchema: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] } },
      ]),
    );
    await git.add('schema.json');
    await git.commit('v1.0.0');
    await git.addTag('v1.0.0');

    writeFileSync(
      join(testRepo, 'schema.json'),
      JSON.stringify([
        { name: 'getUser', inputSchema: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] } },
        { name: 'createUser', inputSchema: { type: 'object', properties: { name: { type: 'string' } }, required: ['name'] } },
      ]),
    );
    await git.add('schema.json');
    await git.commit('v2.0.0');
    await git.addTag('v2.0.0');

    cliPath = join(process.cwd(), 'dist', 'cli', 'index.js');
  });

  afterAll(() => {
    rmSync(testRepo, { recursive: true, force: true });
  });

  it('should list tags', async () => {
    const { stdout } = await execa('node', [cliPath, 'list-tags'], { cwd: testRepo });
    expect(stdout).toContain('v1.0.0');
    expect(stdout).toContain('v2.0.0');
  });

  it('should diff a range', async () => {
    const { stdout } = await execa('node', [cliPath, 'diff', 'v1.0.0..v2.0.0'], { cwd: testRepo });
    expect(stdout).toContain('createUser');
    expect(stdout).toContain('added');
  });

  it('should generate outputs', async () => {
    const outputDir = mkdtempSync(join(tmpdir(), 'mcp-changelog-cli-output-'));
    await execa('node', [cliPath, 'generate', 'v1.0.0..v2.0.0', '--output-dir', outputDir], { cwd: testRepo });

    const changelog = readFileSync(join(outputDir, 'CHANGELOG.md'), 'utf-8');
    expect(changelog).toContain('createUser');

    const diff = readFileSync(join(outputDir, 'diff.json'), 'utf-8');
    expect(JSON.parse(diff).summary.total).toBe(1);

    rmSync(outputDir, { recursive: true, force: true });
  });
});
