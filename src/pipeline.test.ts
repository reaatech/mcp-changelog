import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtempSync, writeFileSync, rmSync, mkdirSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { simpleGit } from 'simple-git';
import { diffRange } from './pipeline.js';
import { parseRange } from './git/resolve.js';

describe('diffRange', () => {
  let testRepo: string;

  beforeAll(async () => {
    testRepo = mkdtempSync(join(tmpdir(), 'mcp-changelog-pipeline-test-'));
    const git = simpleGit(testRepo);
    await git.init();
    await git.addConfig('user.name', 'Test');
    await git.addConfig('user.email', 'test@test.com');

    // v1.0.0 — initial schema
    writeFileSync(
      join(testRepo, 'schema.json'),
      JSON.stringify([
        {
          name: 'getUser',
          inputSchema: {
            type: 'object',
            properties: {
              id: { type: 'string' },
            },
            required: ['id'],
          },
        },
        {
          name: 'createUser',
          inputSchema: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              email: { type: 'string' },
            },
            required: ['name', 'email'],
          },
        },
      ]),
    );
    await git.add('schema.json');
    await git.commit('v1.0.0 schema');
    await git.addTag('v1.0.0');

    // v2.0.0 — breaking changes
    writeFileSync(
      join(testRepo, 'schema.json'),
      JSON.stringify([
        {
          name: 'getUser',
          inputSchema: {
            type: 'object',
            properties: {
              id: { type: 'string' },
            },
            required: ['id'],
          },
        },
        {
          name: 'createUser',
          inputSchema: {
            type: 'object',
            properties: {
              full_name: { type: 'string' },
              email: { type: 'string' },
              age: { type: 'number' },
            },
            required: ['full_name', 'email', 'age'],
          },
        },
        {
          name: 'deleteUser',
          inputSchema: {
            type: 'object',
            properties: {
              id: { type: 'string' },
            },
            required: ['id'],
          },
        },
      ]),
    );
    await git.add('schema.json');
    await git.commit('v2.0.0 with breaking changes');
    await git.addTag('v2.0.0');
  });

  afterAll(() => {
    rmSync(testRepo, { recursive: true, force: true });
  });

  it('should detect no changes for identical schemas', async () => {
    const range = await parseRange('v1.0.0..v1.0.0', testRepo);
    const result = await diffRange(range, testRepo);
    expect(result.changes).toHaveLength(0);
    expect(result.summary.total).toBe(0);
    expect(result.summary.suggestedBump).toBe('patch');
  });

  it('should detect breaking and non-breaking changes', async () => {
    const range = await parseRange('v1.0.0..v2.0.0', testRepo);
    const result = await diffRange(range, testRepo);

    expect(result.changes.length).toBeGreaterThan(0);
    expect(result.summary.breaking).toBeGreaterThan(0);
    expect(result.summary.nonBreaking).toBeGreaterThan(0);
    expect(result.summary.suggestedBump).toBe('major');

    const breaking = result.changes.filter((c) => c.type === 'breaking');
    const nonBreaking = result.changes.filter((c) => c.type === 'non-breaking');

    expect(breaking.length).toBeGreaterThan(0);
    expect(nonBreaking.length).toBeGreaterThan(0);
  });

  it('should include schema data in result', async () => {
    const range = await parseRange('v1.0.0..v2.0.0', testRepo);
    const result = await diffRange(range, testRepo);

    expect(result.schemas.old).toHaveLength(2);
    expect(result.schemas.new).toHaveLength(3);
    expect(result.from.name).toBe('v1.0.0');
    expect(result.to.name).toBe('v2.0.0');
  });

  it('should handle multi-schema repos', async () => {
    const multiRepo = mkdtempSync(join(tmpdir(), 'mcp-changelog-multi-test-'));
    const git = simpleGit(multiRepo);
    await git.init();
    await git.addConfig('user.name', 'Test');
    await git.addConfig('user.email', 'test@test.com');

    mkdirSync(join(multiRepo, 'packages', 'auth'), { recursive: true });
    mkdirSync(join(multiRepo, 'packages', 'users'), { recursive: true });

    writeFileSync(
      join(multiRepo, 'packages', 'auth', 'schema.json'),
      JSON.stringify([{ name: 'login', inputSchema: { type: 'object', properties: {} } }]),
    );
    writeFileSync(
      join(multiRepo, 'packages', 'users', 'schema.json'),
      JSON.stringify([{ name: 'getUser', inputSchema: { type: 'object', properties: {} } }]),
    );

    await git.add('.');
    await git.commit('v1');
    await git.addTag('v1.0.0');

    writeFileSync(
      join(multiRepo, 'packages', 'auth', 'schema.json'),
      JSON.stringify([
        { name: 'login', inputSchema: { type: 'object', properties: {} } },
        { name: 'logout', inputSchema: { type: 'object', properties: {} } },
      ]),
    );

    await git.add('.');
    await git.commit('v2');
    await git.addTag('v2.0.0');

    const range = await parseRange('v1.0.0..v2.0.0', multiRepo);
    const result = await diffRange(range, multiRepo, {
      patterns: ['packages/*/schema.json'],
    });

    expect(result.changes).toHaveLength(1);
    expect(result.changes[0].category).toBe('tool_added');
    expect(result.changes[0].path).toMatch(/^packages\/auth\/schema\.json:/);

    rmSync(multiRepo, { recursive: true, force: true });
  });
});
