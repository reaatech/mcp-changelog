# Testing Strategy Skill

## Purpose

The testing-strategy skill provides comprehensive testing approaches for mcp-changelog, covering unit tests, integration tests, snapshot tests, and end-to-end pipeline validation using fixture git repositories.

## Capabilities

### 1. Unit Testing
- Test individual modules in isolation
- Mock git operations and file I/O
- Test error handling paths
- Verify type safety

### 2. Integration Testing
- Test module interactions
- Full pipeline tests with fixture repos
- End-to-end CLI tests
- GitHub Action simulation tests

### 3. Snapshot Testing
- Verify changelog output consistency
- Test migration guide formatting
- Validate JSON diff structure

### 4. Fixture-Based Testing
- Create test git repositories with known schema changes
- Test against real git history
- Validate multi-schema scenarios

## Usage Examples

### Unit Test Example

```typescript
import { describe, it, expect, vi } from 'vitest';
import { GitResolver } from '../src/git/resolver';
import { SchemaParseError } from '../src/discovery/errors';

describe('GitResolver', () => {
  it('should resolve a valid tag', async () => {
    const mockGit = {
      revParse: vi.fn().mockResolvedValue('abc123')
    };
    const resolver = new GitResolver({ git: mockGit });

    const ref = await resolver.resolveRef('v1.0.0');

    expect(ref).toEqual({
      type: 'tag',
      name: 'v1.0.0',
      sha: 'abc123'
    });
    expect(mockGit.revParse).toHaveBeenCalledWith('v1.0.0');
  });

  it('should throw GitRefNotFoundError for invalid ref', async () => {
    const mockGit = {
      revParse: vi.fn().mockRejectedValue(new Error('unknown ref'))
    };
    const resolver = new GitResolver({ git: mockGit });

    await expect(resolver.resolveRef('invalid'))
      .rejects.toThrow('Git reference "invalid" not found');
  });
});

describe('SchemaParser', () => {
  it('should parse valid schema', async () => {
    const parser = new SchemaParser();
    const schema = await parser.parse(validSchemaJson, 'test.json');

    expect(schema.version).toBe('1.0.0');
    expect(schema.tools).toHaveLength(2);
    expect(schema.tools[0].name).toBe('createUser');
  });

  it('should throw SchemaParseError for malformed JSON', async () => {
    const parser = new SchemaParser();

    await expect(parser.parse('{ invalid json }', 'test.json'))
      .rejects.toThrow(SchemaParseError);
  });

  it('should throw SchemaValidationError for missing required fields', async () => {
    const parser = new SchemaParser();

    await expect(parser.parse('{"tools": []}', 'test.json'))
      .rejects.toThrow('Missing required "version" field');
  });
});
```

### Integration Test with Fixture Repo

```typescript
import { describe, it, expect, beforeAll } from 'vitest';
import { join } from 'path';
import { mkdir, writeFile, rm } from 'fs/promises';
import { simpleGit } from 'simple-git';
import { detectChanges } from '../src/detector';
import { generateChangelog } from '../src/changelog';

describe('Full Pipeline Integration', () => {
  let testRepo: string;

  beforeAll(async () => {
    testRepo = join(__dirname, '__fixtures__', 'test-repo');
    await rm(testRepo, { recursive: true, force: true });
    await mkdir(testRepo, { recursive: true });

    const git = simpleGit(testRepo);
    await git.init();
    await git.addConfig('user.name', 'Test');
    await git.addConfig('user.email', 'test@test.com');

    // Create v1.0.0 schema
    await writeFile(
      join(testRepo, 'schema.json'),
      JSON.stringify({
        version: '1.0.0',
        tools: [
          {
            name: 'createUser',
            inputSchema: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                email: { type: 'string' }
              },
              required: ['name', 'email']
            }
          }
        ]
      })
    );
    await git.add('schema.json');
    await git.commit('Initial schema');
    await git.addTag('v1.0.0');

    // Create v2.0.0 schema with breaking changes
    await writeFile(
      join(testRepo, 'schema.json'),
      JSON.stringify({
        version: '2.0.0',
        tools: [
          {
            name: 'createUser',
            inputSchema: {
              type: 'object',
              properties: {
                full_name: { type: 'string' },
                email: { type: 'string' },
                age: { type: 'number' }
              },
              required: ['full_name', 'email', 'age']
            }
          },
          {
            name: 'getUser',
            inputSchema: {
              type: 'object',
              properties: {
                id: { type: 'string' }
              },
              required: ['id']
            }
          }
        ]
      })
    );
    await git.add('schema.json');
    await git.commit('v2.0.0 with breaking changes');
    await git.addTag('v2.0.0');
  });

  it('should detect changes between tags', async () => {
    const changes = await detectChanges({
      repoPath: testRepo,
      baseRef: 'v1.0.0',
      headRef: 'v2.0.0'
    });

    expect(changes).toHaveLength(4);

    const breaking = changes.filter(c => c.type === 'breaking');
    expect(breaking).toHaveLength(3); // field rename, required field added, tool added is non-breaking

    const nonBreaking = changes.filter(c => c.type === 'non-breaking');
    expect(nonBreaking).toHaveLength(1); // new tool
  });

  it('should generate changelog from changes', async () => {
    const changes = await detectChanges({
      repoPath: testRepo,
      baseRef: 'v1.0.0',
      headRef: 'v2.0.0'
    });

    const changelog = await generateChangelog({
      version: '2.0.0',
      date: new Date(),
      changes
    });

    expect(changelog.markdown).toContain('# [2.0.0]');
    expect(changelog.markdown).toContain('🔥 Breaking Changes');
    expect(changelog.markdown).toContain('full_name');
    expect(changelog.hasBreaking).toBe(true);
    expect(changelog.suggestedVersionBump).toBe('major');
  });
});
```

### Snapshot Test Example

```typescript
import { describe, it, expect } from 'vitest';
import { generateChangelog } from '../src/changelog';

describe('Changelog Snapshot', () => {
  it('should generate consistent markdown output', async () => {
    const changes = [
      { type: 'breaking', category: 'field_renamed', toolName: 'createUser', description: 'name → full_name', severity: 'high' as const },
      { type: 'breaking', category: 'field_added', toolName: 'createUser', description: 'Required field age added', severity: 'high' as const },
      { type: 'non-breaking', category: 'field_added', toolName: 'createUser', description: 'Optional field middle_name added', severity: 'low' as const },
      { type: 'non-breaking', category: 'tool_added', toolName: 'getUser', description: 'New tool added', severity: 'low' as const },
    ];

    const changelog = await generateChangelog({
      version: '2.0.0',
      date: new Date('2024-05-15'),
      changes
    });

    expect(changelog.markdown).toMatchSnapshot();
  });
});
```

### CLI Integration Test

```typescript
import { describe, it, expect } from 'vitest';
import { execa } from 'execa';
import { join } from 'path';

describe('CLI Integration', () => {
  const cli = (...args: string[]) =>
    execa('node', [join(__dirname, '../bin/cli.js'), ...args], {
      cwd: fixtureRepo
    });

  it('should generate changelog files', async () => {
    const { stdout } = await cli('generate', 'v1.0.0..v2.0.0', '--output-dir', '/tmp/test-output');

    expect(stdout).toContain('CHANGELOG.md');
    expect(stdout).toContain('MIGRATION.md');
    expect(stdout).toContain('diff.json');
  });

  it('should show help', async () => {
    const { stdout } = await cli('--help');

    expect(stdout).toContain('mcp-changelog');
    expect(stdout).toContain('generate');
    expect(stdout).toContain('diff');
    expect(stdout).toContain('validate');
    expect(stdout).toContain('list-tags');
  });

  it('should fail for invalid range', async () => {
    await expect(cli('generate', 'invalid..range')).rejects.toThrow();
  });
});
```

## Test Coverage Goals

| Module | Target Coverage |
|---|---|
| Git Integration | >95% |
| Schema Discovery | >95% |
| Change Detector | >90% (mostly reused from mcp-schema-evolution) |
| Changelog Generator | >95% |
| Migration Guide Generator | >95% |
| JSON Diff | >90% |
| CLI | >85% |
| GitHub Action | >85% |

## Fixture Repository Structure

```
__fixtures__/
├── test-repo/                    # Created dynamically in tests
│   ├── schema.json               # Schema file
│   └── .git/
├── monorepo/                     # Multi-schema test repo
│   ├── packages/
│   │   ├── auth/schema.json
│   │   └── users/schema.json
│   └── .git/
├── malformed-repo/               # Repo with invalid schemas
│   ├── schema.json               # Invalid JSON
│   └── .git/
└── empty-repo/                   # Repo with no schema files
    └── .git/
```

## Best Practices

### 1. Isolate Tests
```typescript
// Good: Each test gets a clean repo
beforeEach(async () => {
  await rm(testRepo, { recursive: true, force: true });
  await createTestRepo(testRepo);
});

// Bad: Shared state between tests
const repo = createTestRepoOnce(); // Shared across tests
```

### 2. Use Deterministic Data
```typescript
// Good: Fixed dates, consistent data
const changelog = await generate({
  version: '2.0.0',
  date: new Date('2024-05-15'), // Fixed date
  changes: testChanges
});

// Bad: Dynamic data
const changelog = await generate({
  version: '2.0.0',
  date: new Date(), // Changes every run
  changes: testChanges
});
```

### 3. Test Error Paths
```typescript
// Good: Test all error scenarios
it('should throw for non-existent ref', async () => { ... });
it('should throw for malformed schema', async () => { ... });
it('should throw for missing schema', async () => { ... });
it('should throw for invalid range', async () => { ... });

// Bad: Only happy path
it('should generate changelog', async () => { ... });
```

## Resources

- [ARCHITECTURE.md](../ARCHITECTURE.md) - System architecture
- [Testing section](../ARCHITECTURE.md#testing-strategy) - Architecture testing spec
- [Vitest docs](https://vitest.dev/) - Test framework reference
