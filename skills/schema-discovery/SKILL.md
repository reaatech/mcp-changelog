# Schema Discovery Skill

## Purpose

The schema-discovery skill provides capabilities for locating and parsing MCP schema files within a git repository. It handles multiple file conventions, malformed JSON, and monorepo-style multi-schema layouts.

## Capabilities

### 1. Schema File Location
- Auto-detect schema files by convention
- Support configurable file patterns
- Handle glob patterns for multi-schema repos
- Exclude directories (node_modules, dist, etc.)

### 2. Schema Parsing
- Parse JSON and YAML schema files
- Validate parsed schemas against ToolSnapshot interface
- Provide helpful error messages for malformed files
- Support schema version detection

### 3. Multi-Schema Aggregation
- Handle repos with multiple schema files
- Merge or keep separate based on configuration
- Detect schema conflicts between files
- Support schema path prefixes for namespacing

## Usage Examples

### Auto-Detecting Schema Files

```typescript
import { SchemaLocator } from '@reaatech/mcp-changelog/discovery';

const locator = new SchemaLocator({ repoPath: '/path/to/repo' });

// Auto-detect schema at HEAD
const schemas = await locator.locate('HEAD');
console.log(schemas);
// [
//   {
//     path: 'schema.json',
//     ref: { type: 'tag', name: 'HEAD', sha: '...' },
//     schema: { version: '1.0.0', tools: [...] }
//   }
// ]

// Auto-detect at a specific tag
const v1Schemas = await locator.locate('v1.0.0');
```

### Custom Schema Patterns

```typescript
import { SchemaLocator, SchemaLocatorConfig } from '@reaatech/mcp-changelog/discovery';

const config: SchemaLocatorConfig = {
  patterns: [
    'mcp-schema.json',
    'api/schema.json',
    '**/*.mcp.json'
  ],
  exclude: ['node_modules/**', 'dist/**', '.git/**']
};

const locator = new SchemaLocator({ repoPath: '/path/to/repo', config });
const schemas = await locator.locate('v2.0.0');
```

### Parsing Schema Files

```typescript
import { SchemaParser } from '@reaatech/mcp-changelog/discovery';

const parser = new SchemaParser();

// Parse JSON content
const content = '{"version": "1.0.0", "tools": [{"name": "getUser", ...}]}';
const schema = await parser.parse(content, 'schema.json');
console.log(schema.version); // '1.0.0'
console.log(schema.tools.length); // 1

// Parse with error handling
try {
  const badSchema = await parser.parse('{ invalid json }', 'schema.json');
} catch (error) {
  if (error instanceof SchemaParseError) {
    console.error(error.message);
    // "Failed to parse schema.json: Unexpected token 'i' at position 2"
  }
}
```

### Multi-Schema Repository

```typescript
import { MultiSchemaAggregator } from '@reaatech/mcp-changelog/discovery';

const aggregator = new MultiSchemaAggregator();

// Discover all schemas in a monorepo
const schemas = await aggregator.aggregate({
  ref: 'v1.0.0',
  repoPath: '/path/to/monorepo',
  patterns: ['packages/*/schema.json', 'services/*/mcp.json']
});

console.log(schemas);
// [
//   { path: 'packages/auth/schema.json', schema: {...} },
//   { path: 'services/search/mcp.json', schema: {...} }
// ]

// Compare multi-schema between versions
const { oldSchemas, newSchemas } = await aggregator.aggregateRange({
  from: 'v1.0.0',
  to: 'v2.0.0',
  repoPath: '/path/to/monorepo'
});
```

## Configuration Options

```typescript
interface SchemaLocatorConfig {
  // File patterns to search for (in priority order)
  patterns: string[];

  // Glob patterns to exclude
  exclude: string[];

  // Whether to search recursively
  recursive: boolean;

  // Maximum depth for recursive search
  maxDepth: number;
}

interface SchemaParserConfig {
  // Strict parsing mode (fail on unknown fields)
  strict: boolean;

  // Allowed schema versions
  allowedVersions: string[];

  // Whether to auto-upgrade old schema formats
  autoUpgrade: boolean;
}

const locatorConfig: SchemaLocatorConfig = {
  patterns: ['schema.json', 'mcp.json', 'tools.json', '**/*.schema.json'],
  exclude: ['node_modules/**', 'dist/**', '.git/**', 'coverage/**'],
  recursive: true,
  maxDepth: 5,
};

const parserConfig: SchemaParserConfig = {
  strict: false,
  allowedVersions: ['1.0.0', '2.0.0'],
  autoUpgrade: true,
};
```

## Schema File Conventions

Auto-detection checks these paths in order (first match wins):

| Priority | Pattern | Description |
|---|---|---|
| 1 | `schema.json` | Root-level schema (most common) |
| 2 | `mcp.json` | Alternative root-level name |
| 3 | `tools.json` | Alternative root-level name |
| 4 | `**/*.schema.json` | Glob for multi-schema repos |
| 5 | `**/mcp.json` | Glob fallback |

## Best Practices

### 1. Provide Helpful Parse Errors
```typescript
// Good: Actionable error
throw new SchemaParseError(filePath, {
  cause: jsonError,
  suggestion: 'Check for trailing commas or unquoted keys'
});

// Bad: Generic error
throw new Error('JSON parse error');
```

### 2. Validate Schema Structure
```typescript
// Good: Validate after parsing
const schema = await parser.parse(content, path);
if (!schema.version) {
  throw new SchemaValidationError('Missing required "version" field');
}
if (!Array.isArray(schema.tools)) {
  throw new SchemaValidationError('"tools" must be an array');
}

// Bad: Trust parsed data
const schema = JSON.parse(content); // May be missing required fields
```

### 3. Handle Missing Schemas Gracefully
```typescript
// Good: Clear error with suggestions
const schemas = await locator.locate(ref);
if (schemas.length === 0) {
  throw new SchemaNotFoundError(ref, {
    searched: config.patterns,
    suggestion: 'Create a schema.json file or configure custom patterns'
  });
}

// Bad: Empty result with no explanation
const schemas = await locator.locate(ref);
if (schemas.length === 0) {
  throw new Error('No schemas found');
}
```

## Error Handling

```typescript
// Schema file not found
class SchemaNotFoundError extends Error {
  constructor(ref: string, context?: { searched: string[]; suggestion?: string }) {
    super(`No schema file found at ref "${ref}"`);
    this.name = 'SchemaNotFoundError';
  }
}

// Schema parse error
class SchemaParseError extends Error {
  constructor(filePath: string, context?: { cause?: Error; suggestion?: string }) {
    super(`Failed to parse ${filePath}: ${context?.cause?.message}`);
    this.name = 'SchemaParseError';
  }
}

// Schema validation error
class SchemaValidationError extends Error {
  constructor(message: string) {
    super(`Schema validation failed: ${message}`);
    this.name = 'SchemaValidationError';
  }
}
```

## Performance Considerations

- **Lazy parsing**: Only parse files that match patterns
- **Parallel discovery**: Check multiple patterns concurrently
- **Cache parsed schemas**: Avoid re-parsing within a run
- **Early termination**: Stop at first match for single-schema mode

## Testing Strategies

```typescript
describe('SchemaLocator', () => {
  it('should find schema.json at repo root', async () => {
    const locator = new SchemaLocator({ repoPath: testRepo });
    const schemas = await locator.locate('HEAD');
    expect(schemas).toHaveLength(1);
    expect(schemas[0].path).toBe('schema.json');
  });

  it('should handle missing schema gracefully', async () => {
    const locator = new SchemaLocator({
      repoPath: emptyRepo,
      config: { patterns: ['nonexistent.json'], exclude: [] }
    });
    await expect(locator.locate('HEAD'))
      .rejects.toThrow(SchemaNotFoundError);
  });

  it('should find multiple schemas with glob pattern', async () => {
    const locator = new SchemaLocator({
      repoPath: monorepo,
      config: { patterns: ['packages/*/schema.json'], exclude: [] }
    });
    const schemas = await locator.locate('HEAD');
    expect(schemas.length).toBeGreaterThan(1);
  });
});

describe('SchemaParser', () => {
  it('should parse valid schema', async () => {
    const parser = new SchemaParser();
    const schema = await parser.parse(validSchemaJson, 'test.json');
    expect(schema.version).toBe('1.0.0');
    expect(schema.tools).toHaveLength(3);
  });

  it('should provide helpful error for malformed JSON', async () => {
    const parser = new SchemaParser();
    await expect(parser.parse('{ invalid }', 'test.json'))
      .rejects.toThrow(SchemaParseError);
  });

  it('should validate required fields', async () => {
    const parser = new SchemaParser();
    await expect(parser.parse('{"tools": []}', 'test.json'))
      .rejects.toThrow(SchemaValidationError);
  });
});
```

## Resources

- [ARCHITECTURE.md](../ARCHITECTURE.md) - System architecture
- [Schema Discovery section](../ARCHITECTURE.md#2-schema-discovery-module) - Detailed module spec
- [mcp-schema-evolution types](../../mcp-schema-evolution/ARCHITECTURE.md#1-schema-parser-module) - ToolSnapshot interface
