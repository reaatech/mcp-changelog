import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { simpleGit } from 'simple-git';
import { locateSchemas } from './locate.js';
import { resolveRef } from '../git/resolve.js';
import { SchemaNotFoundError } from './types.js';

describe('locateSchemas', () => {
  let testRepo: string;
  let headRef: Awaited<ReturnType<typeof resolveRef>>;

  beforeAll(async () => {
    testRepo = mkdtempSync(join(tmpdir(), 'mcp-changelog-discovery-test-'));
    const git = simpleGit(testRepo);
    await git.init();
    await git.addConfig('user.name', 'Test');
    await git.addConfig('user.email', 'test@test.com');

    writeFileSync(
      join(testRepo, 'schema.json'),
      JSON.stringify([
        { name: 'getUser', inputSchema: { type: 'object', properties: {} } },
      ]),
    );

    mkdirSync(join(testRepo, 'packages', 'auth'), { recursive: true });
    writeFileSync(
      join(testRepo, 'packages', 'auth', 'schema.json'),
      JSON.stringify([
        { name: 'login', inputSchema: { type: 'object', properties: {} } },
      ]),
    );

    await git.add(['schema.json', 'packages/auth/schema.json']);
    await git.commit('Initial commit');

    headRef = await resolveRef('HEAD', testRepo);
  });

  afterAll(() => {
    rmSync(testRepo, { recursive: true, force: true });
  });

  it('should find schema.json at repo root', async () => {
    const schemas = await locateSchemas(headRef, testRepo);
    expect(schemas).toHaveLength(1);
    expect(schemas[0].path).toBe('schema.json');
    expect(schemas[0].schema).toHaveLength(1);
    expect(schemas[0].schema[0].name).toBe('getUser');
  });

  it('should find schemas with glob pattern', async () => {
    const schemas = await locateSchemas(headRef, testRepo, {
      patterns: ['packages/**/*.json'],
    });
    expect(schemas).toHaveLength(1);
    expect(schemas[0].path).toBe('packages/auth/schema.json');
    expect(schemas[0].schema[0].name).toBe('login');
  });

  it('should throw SchemaNotFoundError when no schemas match', async () => {
    await expect(
      locateSchemas(headRef, testRepo, {
        patterns: ['nonexistent.json'],
      }),
    ).rejects.toThrow(SchemaNotFoundError);
  });

  it('should handle parse errors gracefully', async () => {
    // Create a repo with invalid JSON
    const badRepo = mkdtempSync(join(tmpdir(), 'mcp-changelog-bad-test-'));
    const git = simpleGit(badRepo);
    await git.init();
    await git.addConfig('user.name', 'Test');
    await git.addConfig('user.email', 'test@test.com');
    writeFileSync(join(badRepo, 'schema.json'), '{ invalid json }');
    await git.add('schema.json');
    await git.commit('Bad commit');

    const ref = await resolveRef('HEAD', badRepo);
    const schemas = await locateSchemas(ref, badRepo);
    expect(schemas).toHaveLength(1);
    expect(schemas[0].parseError).toBeDefined();

    rmSync(badRepo, { recursive: true, force: true });
  });
});
