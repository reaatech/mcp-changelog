# Git Integration Skill

## Purpose

The git-integration skill provides capabilities for resolving git references, extracting files from git history, and enumerating tags. This is the foundational skill for mcp-changelog's git-native design.

## Capabilities

### 1. Git Reference Resolution
- Resolve tag names, commit SHAs, and branch names to concrete commits
- Parse git range notation (e.g., `v1.2.0..v1.3.0`)
- Handle symbolic refs (HEAD, branch names)
- Validate that refs exist before use

### 2. Tree Reading
- List files in a git tree at a specific ref
- Extract file contents from a git tree
- Support recursive directory listing
- Handle binary vs text file detection

### 3. Tag Enumeration
- List all git tags matching a semver pattern
- Sort tags by creation date or semver order
- Filter lightweight vs annotated tags
- Resolve tag objects to commit SHAs

## Usage Examples

### Resolving Git References

```typescript
import { GitResolver } from '@reaatech/mcp-changelog/git';

const resolver = new GitResolver({ repoPath: '/path/to/repo' });

// Resolve a tag
const ref = await resolver.resolveRef('v1.2.0');
console.log(ref);
// { type: 'tag', name: 'v1.2.0', sha: 'abc123...' }

// Resolve a commit SHA
const commitRef = await resolver.resolveRef('abc123');
console.log(commitRef);
// { type: 'commit', name: 'abc123', sha: 'abc123...' }

// Parse a range
const range = await resolver.parseRange('v1.2.0..v1.3.0');
console.log(range);
// { from: GitRef, to: GitRef }
```

### Reading Files from Git History

```typescript
import { TreeReader } from '@reaatech/mcp-changelog/git';

const reader = new TreeReader({ repoPath: '/path/to/repo' });

// Read a file at a specific ref
const content = await reader.readFile('v1.2.0', 'schema.json');
console.log(content);
// '{"version": "1.2.0", "tools": [...]}'

// List files at a ref
const files = await reader.listFiles('v1.2.0');
console.log(files);
// ['schema.json', 'README.md', 'src/index.ts']

// List files in a subdirectory
const srcFiles = await reader.listFiles('v1.2.0', 'src/');
console.log(srcFiles);
// ['src/index.ts', 'src/types.ts']
```

### Tag Enumeration

```typescript
import { TagLister } from '@reaatech/mcp-changelog/git';

const lister = new TagLister({ repoPath: '/path/to/repo' });

// List all tags
const tags = await lister.listTags();
console.log(tags);
// [
//   { type: 'tag', name: 'v1.0.0', sha: '...' },
//   { type: 'tag', name: 'v1.1.0', sha: '...' },
//   { type: 'tag', name: 'v2.0.0', sha: '...' }
// ]

// List tags matching a pattern
const semverTags = await lister.listTags('^v\\d+\\.\\d+\\.\\d+$');
console.log(semverTags);
// Only semver tags
```

## Configuration Options

```typescript
interface GitIntegrationConfig {
  // Path to git repository (default: current working directory)
  repoPath: string;

  // Whether to cache git operations within a run
  cache: boolean;

  // Timeout for git operations in milliseconds
  timeout: number;

  // Tag pattern for filtering (default: match all)
  tagPattern?: string;
}

const config: GitIntegrationConfig = {
  repoPath: process.cwd(),
  cache: true,
  timeout: 30000,
  tagPattern: '^v\\d+\\.\\d+\\.\\d+$',
};
```

## Best Practices

### 1. Always Validate Refs
```typescript
// Good: Validate before use
const ref = await resolver.resolveRef(userInput);
if (!ref) {
  throw new GitRefNotFoundError(userInput);
}

// Bad: Assume ref exists
const sha = await git.revParse(userInput); // May throw cryptic error
```

### 2. Cache Git Operations
```typescript
// Good: Cache within a run
const resolver = new GitResolver({ repoPath, cache: true });
const schemas = await Promise.all(
  refs.map(ref => resolver.readFile(ref, 'schema.json'))
);

// Bad: Redundant git calls
for (const ref of refs) {
  const r = new GitResolver({ repoPath }); // New instance = no cache
  await r.readFile(ref, 'schema.json');
}
```

### 3. Handle Detached HEAD
```typescript
// Good: Graceful handling
try {
  const content = await reader.readFile('HEAD', 'schema.json');
} catch (error) {
  if (error.code === 'DETACHED_HEAD') {
    // Use fallback approach
  }
  throw error;
}
```

## Error Handling

```typescript
// Git ref not found
class GitRefNotFoundError extends Error {
  constructor(ref: string) {
    super(`Git reference "${ref}" not found`);
    this.name = 'GitRefNotFoundError';
  }
}

// File not found at ref
class GitFileNotFoundError extends Error {
  constructor(ref: string, path: string) {
    super(`File "${path}" not found at ref "${ref}"`);
    this.name = 'GitFileNotFoundError';
  }
}

// Invalid range syntax
class InvalidRangeError extends Error {
  constructor(range: string) {
    super(`Invalid git range: "${range}". Expected format: <from>..<to>`);
    this.name = 'InvalidRangeError';
  }
}
```

## Performance Considerations

- **Batch operations**: Use `git cat-file --batch` for multiple file reads
- **Shallow clones**: Support `--depth` for large repos
- **Cache invalidation**: Clear cache between runs, not within
- **Parallel reads**: Use Promise.all for independent file reads

## Testing Strategies

```typescript
describe('GitResolver', () => {
  it('should resolve a valid tag', async () => {
    const resolver = new GitResolver({ repoPath: testRepo });
    const ref = await resolver.resolveRef('v1.0.0');
    expect(ref).toMatchObject({ type: 'tag', name: 'v1.0.0' });
    expect(ref.sha).toMatch(/^[0-9a-f]{40}$/);
  });

  it('should throw for non-existent ref', async () => {
    const resolver = new GitResolver({ repoPath: testRepo });
    await expect(resolver.resolveRef('nonexistent'))
      .rejects.toThrow(GitRefNotFoundError);
  });

  it('should parse a valid range', async () => {
    const resolver = new GitResolver({ repoPath: testRepo });
    const range = await resolver.parseRange('v1.0.0..v2.0.0');
    expect(range.from.name).toBe('v1.0.0');
    expect(range.to.name).toBe('v2.0.0');
  });
});
```

## Remote Git Access (GitHub API)

For GitHub Action mode, support fetching files from remote repos:

```typescript
import { Octokit } from 'octokit';

class GitHubTreeReader {
  constructor(private octokit: Octokit, private owner: string, private repo: string) {}

  async readFile(ref: string, path: string): Promise<string> {
    const { data } = await this.octokit.rest.repos.getContent({
      owner: this.owner,
      repo: this.repo,
      path,
      ref,
    });

    if ('content' in data) {
      return Buffer.from(data.content, 'base64').toString('utf-8');
    }
    throw new Error('Expected file content but got directory');
  }
}
```

## Resources

- [ARCHITECTURE.md](../ARCHITECTURE.md) - System architecture
- [Git Integration section](../ARCHITECTURE.md#1-git-integration-module) - Detailed module spec
- [simple-git docs](https://github.com/steveukx/git-js) - Git library reference
- [mcp-schema-evolution schema-diffing skill](../../mcp-schema-evolution/skills/schema-diffing/SKILL.md) - Related diffing patterns
