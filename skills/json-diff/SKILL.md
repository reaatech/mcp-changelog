# JSON Diff Generation Skill

## Purpose

The json-diff skill generates machine-readable JSON output from schema comparisons. This output is consumed by tooling, CI systems, and other automated processes to understand schema changes programmatically.

## Capabilities

### 1. Machine-Readable Diff Output
- Generate structured JSON diff from schema changes
- Include full change metadata (type, category, path, old/new values)
- Provide summary statistics
- Support machine consumption by CI/CD systems

### 2. Change Metadata
- Full change classification (breaking/non-breaking/patch)
- Path information for nested fields
- Old and new value snapshots
- Migration hints for automated tooling

### 3. Summary Statistics
- Total change count
- Breaking vs non-breaking counts
- Suggested version bump
- Per-tool change breakdown

## Usage Examples

### Basic JSON Diff Generation

```typescript
import { JsonDiffGenerator } from '@reaatech/mcp-changelog/diff';

const generator = new JsonDiffGenerator();

const diff = await generator.generate({
  from: 'v1.2.0',
  to: 'v1.3.0',
  date: new Date('2024-05-15'),
  changes: [
    {
      type: 'breaking',
      category: 'field_renamed',
      toolName: 'createUser',
      path: 'inputSchema.properties.name',
      description: 'Field "name" was renamed to "full_name"',
      severity: 'high',
      oldValue: { type: 'string' },
      newValue: { type: 'string' },
      migration: { action: 'rename', from: 'name', to: 'full_name' }
    },
    {
      type: 'non-breaking',
      category: 'field_added',
      toolName: 'createUser',
      path: 'inputSchema.properties.middle_name',
      description: 'Optional field "middle_name" was added',
      severity: 'low'
    }
  ]
});

console.log(JSON.stringify(diff, null, 2));
```

**Output:**
```json
{
  "$schema": "https://raw.githubusercontent.com/reaatech/mcp-changelog/main/schemas/diff.schema.json",
  "version": "1.0.0",
  "from": "v1.2.0",
  "to": "v1.3.0",
  "date": "2024-05-15T00:00:00.000Z",
  "summary": {
    "total": 2,
    "breaking": 1,
    "nonBreaking": 1,
    "patch": 0,
    "suggestedBump": "major"
  },
  "changes": [
    {
      "id": "change-001",
      "type": "breaking",
      "category": "FIELD_RENAMED",
      "tool": "createUser",
      "path": "inputSchema.properties.name",
      "description": "Field \"name\" was renamed to \"full_name\"",
      "severity": "high",
      "oldValue": { "type": "string" },
      "newValue": { "type": "string" },
      "migration": {
        "action": "rename",
        "from": "name",
        "to": "full_name"
      }
    },
    {
      "id": "change-002",
      "type": "non-breaking",
      "category": "FIELD_ADDED",
      "tool": "createUser",
      "path": "inputSchema.properties.middle_name",
      "description": "Optional field \"middle_name\" was added",
      "severity": "low"
    }
  ],
  "affectedTools": {
    "createUser": {
      "changes": 2,
      "breaking": 1,
      "nonBreaking": 1
    }
  }
}
```

### Consuming JSON Diff in CI

```typescript
import { readFileSync } from 'fs';
import { JsonDiffResult } from '@reaatech/mcp-changelog/diff';

const diff: JsonDiffResult = JSON.parse(readFileSync('diff.json', 'utf-8'));

// Check for breaking changes
if (diff.summary.breaking > 0) {
  console.log(`⚠️  ${diff.summary.breaking} breaking change(s) detected`);

  diff.changes
    .filter(c => c.type === 'breaking')
    .forEach(c => {
      console.log(`  - [${c.tool}] ${c.description}`);
    });

  console.log(`Suggested version bump: ${diff.summary.suggestedBump}`);
  process.exit(1); // Fail the build
}
```

### Filtering Changes Programmatically

```typescript
import { JsonDiffResult } from '@reaatech/mcp-changelog/diff';

function getHighSeverityChanges(diff: JsonDiffResult): SchemaChange[] {
  return diff.changes.filter(c => c.severity === 'high');
}

function getChangesByTool(diff: JsonDiffResult, toolName: string): SchemaChange[] {
  return diff.changes.filter(c => c.tool === toolName);
}

function hasMigrationHints(diff: JsonDiffResult): boolean {
  return diff.changes.every(c => c.type === 'non-breaking' || c.migration);
}
```

## Configuration Options

```typescript
interface JsonDiffConfig {
  // Schema version for the output
  schemaVersion: string;

  // Whether to include old/new values
  includeValues: boolean;

  // Whether to include migration hints
  includeMigrationHints: boolean;

  // Whether to include affected tools summary
  includeAffectedTools: boolean;

  // Maximum depth for nested value snapshots
  maxDepth: number;
}

const config: JsonDiffConfig = {
  schemaVersion: '1.0.0',
  includeValues: true,
  includeMigrationHints: true,
  includeAffectedTools: true,
  maxDepth: 5
};
```

## JSON Schema

The JSON diff output conforms to this schema:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "MCP Changelog Diff",
  "type": "object",
  "required": ["from", "to", "date", "summary", "changes"],
  "properties": {
    "$schema": { "type": "string" },
    "version": { "type": "string" },
    "from": { "type": "string" },
    "to": { "type": "string" },
    "date": { "type": "string", "format": "date-time" },
    "summary": {
      "type": "object",
      "required": ["total", "breaking", "nonBreaking", "patch", "suggestedBump"],
      "properties": {
        "total": { "type": "integer", "minimum": 0 },
        "breaking": { "type": "integer", "minimum": 0 },
        "nonBreaking": { "type": "integer", "minimum": 0 },
        "patch": { "type": "integer", "minimum": 0 },
        "suggestedBump": { "type": "string", "enum": ["major", "minor", "patch"] }
      }
    },
    "changes": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["id", "type", "category", "tool", "description"],
        "properties": {
          "id": { "type": "string" },
          "type": { "type": "string", "enum": ["breaking", "non-breaking", "patch"] },
          "category": { "type": "string" },
          "tool": { "type": "string" },
          "path": { "type": "string" },
          "description": { "type": "string" },
          "severity": { "type": "string", "enum": ["high", "medium", "low"] },
          "oldValue": { "type": "object" },
          "newValue": { "type": "object" },
          "migration": { "type": "object" }
        }
      }
    },
    "affectedTools": {
      "type": "object",
      "additionalProperties": {
        "type": "object",
        "properties": {
          "changes": { "type": "integer" },
          "breaking": { "type": "integer" },
          "nonBreaking": { "type": "integer" }
        }
      }
    }
  }
}
```

## Best Practices

### 1. Include Stable IDs
```typescript
// Good: Stable, deterministic IDs
{
  id: 'change-001',  // Based on index or hash
  type: 'breaking',
  ...
}

// Bad: Random IDs
{
  id: 'abc123',  // Changes on every run
  ...
}
```

### 2. Include Full Path Information
```typescript
// Good: Full path for tooling
{
  path: 'inputSchema.properties.address.properties.country',
  toolName: 'createUser',
  ...
}

// Bad: Incomplete path
{
  path: 'country',
  ...
}
```

### 3. Provide Machine-Actionable Migration Hints
```typescript
// Good: Machine-actionable
{
  migration: {
    action: 'rename',
    from: 'name',
    to: 'full_name'
  }
}

// Bad: Human-only
{
  migration: {
    suggestion: 'Update your code to use the new field name'
  }
}
```

## Performance Considerations

- **Streaming output**: Stream JSON to disk for large diffs
- **Value truncation**: Limit old/new value size for large schemas
- **Lazy serialization**: Only serialize requested fields
- **Compression**: Support gzip output for large diffs

## Testing Strategies

```typescript
describe('JsonDiffGenerator', () => {
  it('should generate valid JSON diff', async () => {
    const generator = new JsonDiffGenerator();
    const diff = await generator.generate({
      from: 'v1.0.0',
      to: 'v2.0.0',
      date: new Date(),
      changes: [{ type: 'breaking', category: 'field_removed', toolName: 'test', description: 'test' }]
    });

    expect(diff.from).toBe('v1.0.0');
    expect(diff.to).toBe('v2.0.0');
    expect(diff.summary.breaking).toBe(1);
    expect(diff.summary.suggestedBump).toBe('major');
    expect(diff.changes).toHaveLength(1);
  });

  it('should include affected tools summary', async () => {
    const generator = new JsonDiffGenerator({ includeAffectedTools: true });
    const diff = await generator.generate({
      from: 'v1.0.0',
      to: 'v2.0.0',
      date: new Date(),
      changes: [
        { type: 'breaking', category: 'field_renamed', toolName: 'createUser', description: 'test' },
        { type: 'non-breaking', category: 'field_added', toolName: 'createUser', description: 'test' }
      ]
    });

    expect(diff.affectedTools).toHaveProperty('createUser');
    expect(diff.affectedTools.createUser.changes).toBe(2);
  });

  it('should generate stable change IDs', async () => {
    const generator = new JsonDiffGenerator();
    const diff1 = await generator.generate({ from: 'v1', to: 'v2', date: new Date(), changes: testChanges });
    const diff2 = await generator.generate({ from: 'v1', to: 'v2', date: new Date(), changes: testChanges });

    expect(diff1.changes.map(c => c.id)).toEqual(diff2.changes.map(c => c.id));
  });
});
```

## Resources

- [ARCHITECTURE.md](../ARCHITECTURE.md) - System architecture
- [JSON Diff section](../ARCHITECTURE.md#6-json-diff-module) - Detailed module spec
