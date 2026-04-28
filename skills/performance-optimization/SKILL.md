# Performance Optimization Skill

## Purpose

The performance-optimization skill provides strategies for ensuring mcp-changelog meets its performance targets: <2 seconds for full pipeline on typical schemas, efficient git operations, and minimal memory footprint.

## Capabilities

### 1. Git Operation Optimization
- Batch git operations to minimize process spawns
- Cache git results within a single run
- Use streaming for large file extraction
- Parallelize independent git operations

### 2. Schema Processing Optimization
- Lazy parsing of schema files
- Incremental diffing for large schemas
- Memory-efficient JSON parsing
- Early termination for break-on-breaking mode

### 3. Output Generation Optimization
- Template caching for changelog generation
- Parallel format export
- Streaming file writes
- Compression for large outputs

## Usage Examples

### Git Operation Batching

```typescript
// Good: Batch git operations
import { execa } from 'execa';

async function readFilesAtRef(ref: string, paths: string[]): Promise<Map<string, string>> {
  // Use git cat-file --batch for multiple files
  const batchInput = paths.map(p => `${ref}:${p}`).join('\n');
  const { stdout } = await execa('git', ['cat-file', '--batch'], { input: batchInput });
  // Parse batch output...
}

// Bad: One git process per file
for (const path of paths) {
  const content = await execa('git', ['show', `${ref}:${path}`]); // Slow!
}
```

### Caching Strategy

```typescript
class CachedGitResolver {
  private cache = new Map<string, GitRef>();

  async resolveRef(ref: string): Promise<GitRef> {
    const cached = this.cache.get(ref);
    if (cached) return cached;

    const resolved = await this.git.revParse(ref);
    const result = { type: this.classifyRef(ref), name: ref, sha: resolved };
    this.cache.set(ref, result);
    return result;
  }

  clearCache() {
    this.cache.clear();
  }
}

// Usage: Single instance per run
const resolver = new CachedGitResolver({ repoPath });
const [ref1, ref2, ref3] = await Promise.all([
  resolver.resolveRef('v1.0.0'),
  resolver.resolveRef('v1.1.0'),
  resolver.resolveRef('v2.0.0')
]);
```

### Parallel Schema Processing

```typescript
// Good: Parallel independent operations
const [oldSchemas, newSchemas] = await Promise.all([
  discoverSchemas(oldRef),
  discoverSchemas(newRef)
]);

const changes = await Promise.all(
  Object.entries(toolPairs).map(([toolName, { oldTool, newTool }]) =>
    compareTools(toolName, oldTool, newTool)
  )
);

// Bad: Sequential operations
const oldSchemas = await discoverSchemas(oldRef);
const newSchemas = await discoverSchemas(newRef);
const changes = [];
for (const [toolName, { oldTool, newTool }] of toolPairs) {
  changes.push(await compareTools(toolName, oldTool, newTool));
}
```

### Streaming JSON Output

```typescript
import { createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';

async function writeJsonDiff(diff: JsonDiffResult, outputPath: string) {
  const writeStream = createWriteStream(outputPath);
  const jsonStream = JSON.stringify(diff, null, 2);
  writeStream.write(jsonStream);
  writeStream.end();
  await finished(writeStream);
}

// For very large diffs, use streaming JSON serializer
import { stringify } from 'stream-json/stringify';
import { chain } from 'stream-chain';

async function streamJsonDiff(diff: JsonDiffResult, outputPath: string) {
  await pipeline(
    read(diff),
    chain(),
    stringify(),
    createWriteStream(outputPath)
  );
}
```

## Configuration Options

```typescript
interface PerformanceConfig {
  // Git operation timeout in milliseconds
  gitTimeout: number;

  // Maximum concurrent git operations
  maxConcurrentGitOps: number;

  // Whether to cache git operations
  cacheGitOps: boolean;

  // Maximum schema file size to parse (bytes)
  maxSchemaSize: number;

  // Whether to use streaming for large outputs
  streamLargeOutputs: boolean;

  // Size threshold for streaming (bytes)
  streamThreshold: number;
}

const config: PerformanceConfig = {
  gitTimeout: 30000,
  maxConcurrentGitOps: 4,
  cacheGitOps: true,
  maxSchemaSize: 10 * 1024 * 1024, // 10MB
  streamLargeOutputs: true,
  streamThreshold: 1024 * 1024 // 1MB
};
```

## Performance Targets

| Operation | Target | Acceptable |
|---|---|---|
| Git ref resolution | <10ms | <50ms |
| Schema file discovery | <50ms | <200ms |
| Schema parsing (typical) | <20ms | <100ms |
| Change detection (typical) | <50ms | <200ms |
| Changelog generation | <30ms | <100ms |
| Full pipeline | <2s | <5s |
| Memory usage | <50MB | <100MB |

## Best Practices

### 1. Minimize Git Process Spawns
```typescript
// Good: Single git command for multiple operations
const { stdout } = await execa('git', ['ls-tree', '-r', ref]);
const files = stdout.split('\n').map(line => line.split('\t')[1]);

// Bad: One git command per file
for (const pattern of patterns) {
  const { stdout } = await execa('git', ['ls-files', pattern]);
}
```

### 2. Use Appropriate Data Structures
```typescript
// Good: Set for O(1) lookups
const oldToolNames = new Set(oldSchema.tools.map(t => t.name));
const removedTools = newSchema.tools.filter(t => !oldToolNames.has(t.name));

// Bad: Array includes is O(n)
const removedTools = newSchema.tools.filter(t =>
  !oldSchema.tools.some(ot => ot.name === t.name)
);
```

### 3. Early Termination
```typescript
// Good: Stop on first breaking change when only checking
function hasBreakingChanges(changes: SchemaChange[]): boolean {
  return changes.some(c => c.type === 'breaking');
}

// Bad: Process all changes when one is enough
function hasBreakingChanges(changes: SchemaChange[]): boolean {
  const breaking = changes.filter(c => c.type === 'breaking');
  return breaking.length > 0;
}
```

## Monitoring and Profiling

```typescript
import { performance } from 'perf_hooks';

class PerformanceMonitor {
  private timings = new Map<string, number>();

  start(operation: string) {
    this.timings.set(operation, performance.now());
  }

  end(operation: string): number {
    const start = this.timings.get(operation);
    if (start === undefined) throw new Error(`No start time for ${operation}`);
    const duration = performance.now() - start;
    this.timings.delete(operation);
    return duration;
  }

  log(operation: string, duration: number) {
    if (duration > 100) {
      console.warn(`[PERF] ${operation} took ${duration.toFixed(2)}ms`);
    }
  }
}

// Usage
const monitor = new PerformanceMonitor();
monitor.start('git-resolve');
const ref = await resolver.resolveRef('v1.0.0');
const duration = monitor.end('git-resolve');
monitor.log('git-resolve', duration);
```

## Resources

- [ARCHITECTURE.md](../ARCHITECTURE.md) - System architecture
- [Performance section](../ARCHITECTURE.md#performance-considerations) - Architecture performance spec
