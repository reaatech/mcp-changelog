# Change Detection Skill

## Purpose

The change-detection skill provides capabilities for comparing MCP tool schemas between versions and classifying changes as breaking, non-breaking, or patch. This skill wraps mcp-schema-evolution's detector with git-specific context.

## Capabilities

### 1. Schema Comparison
- Compare two versions of MCP schemas
- Detect structural changes in tool definitions
- Identify field-level modifications
- Track type changes and constraint modifications

### 2. Change Classification
- **Breaking Changes**: Require major version bump
- **Non-Breaking Changes**: Compatible with minor version bump
- **Patch Changes**: Documentation and metadata updates

### 3. Multi-Schema Comparison
- Compare multiple schemas across a monorepo
- Track changes per schema file
- Aggregate changes across schemas
- Detect cross-schema conflicts

## Usage Examples

### Basic Change Detection

```typescript
import { diffToolSnapshots } from '@mcp-schema-evolution/core';

const detector = new diffToolSnapshots();

const changes = oldTools, newTools);
    if (!result.ok) { throw new Error(result.error.message); }
    const changes = result.value;
    // await detector.detect(oldSchema, newSchema);

console.log(changes);
// [
//   {
//     type: 'breaking',
//     category: 'field_renamed',
//     toolName: 'createUser',
//     path: 'inputSchema.properties.name',
//     description: 'Field "name" was renamed to "full_name"',
//     severity: 'high',
//     oldValue: { type: 'string' },
//     newValue: { type: 'string' },
//     migration: { action: 'rename', from: 'name', to: 'full_name' }
//   },
//   {
//     type: 'non-breaking',
//     category: 'field_added',
//     toolName: 'createUser',
//     path: 'inputSchema.properties.middle_name',
//     description: 'Optional field "middle_name" was added',
//     severity: 'low'
//   }
// ]
```

### Multi-Schema Detection

```typescript
import { MultiSchemaDetector } from '@mcp-schema-evolution/core';

const detector = new MultiSchemaDetector();

const changes = oldTools, newTools);
    if (!result.ok) { throw new Error(result.error.message); }
    const changes = result.value;
    // await detector.detectMulti(
  [
    { path: 'schema.json', schema: oldSchema1 },
    { path: 'packages/auth/schema.json', schema: oldSchema2 }
  ],
  [
    { path: 'schema.json', schema: newSchema1 },
    { path: 'packages/auth/schema.json', schema: newSchema2 }
  ]
);

console.log(changes);
// Changes are tagged with their source schema path
```

### Change Classification

```typescript
import { ChangeClassifier } from '@mcp-schema-evolution/core';

const classifier = new ChangeClassifier();

const change = {
  category: 'type_changed',
  toolName: 'getUser',
  path: 'outputSchema.properties.age',
  oldValue: { type: 'string' },
  newValue: { type: 'number' }
};

const classification = classifier.classify(change);
console.log(classification);
// {
//   type: 'breaking',
//   severity: 'high',
//   reason: 'Type change from string to number is not backward compatible',
//   versionImpact: 'major'
// }
```

### Semantic Version Suggestion

```typescript
import { VersionSuggester } from '@mcp-schema-evolution/core';

const suggester = new VersionSuggester();

const suggestion = suggester.suggest({
  currentVersion: '1.2.3',
  changes: [
    { type: 'breaking', category: 'field_removed' },
    { type: 'breaking', category: 'tool_renamed' },
    { type: 'non-breaking', category: 'field_added' }
  ]
});

console.log(suggestion);
// {
//   suggestedVersion: '2.0.0',
//   bumpType: 'major',
//   rationale: '2 breaking changes detected requiring major version bump'
// }
```

## Change Categories

### Breaking Changes (Major Version)

| Category | Description | Example |
|---|---|---|
| `TOOL_REMOVED` | Tool deleted | `legacySearch` removed |
| `TOOL_RENAMED` | Tool renamed | `search` → `query` |
| `FIELD_REMOVED` | Required field deleted | `email` removed from `createUser` |
| `FIELD_RENAMED` | Field renamed without alias | `name` → `full_name` |
| `TYPE_CHANGED` | Incompatible type change | `string` → `number` |
| `REQUIRED_CHANGED` | Optional → Required | `age` now required |
| `CONSTRAINT_CHANGED` | Constraint tightened | `maxLength: 100` → `maxLength: 50` |
| `DEFAULT_CHANGED` | Default removed or changed incompatibly | Default `""` removed |

### Non-Breaking Changes (Minor Version)

| Category | Description | Example |
|---|---|---|
| `TOOL_ADDED` | New tool added | `getUser` tool added |
| `FIELD_ADDED` | Optional field added | `middle_name` added to `createUser` |
| `FIELD_ADDED` | Required field with default | `status` with default `"active"` |
| `TYPE_CHANGED` | Type widened | `number` → `number \| null` |
| `REQUIRED_CHANGED` | Required → Optional | `phone` now optional |
| `CONSTRAINT_CHANGED` | Constraint relaxed | `maxLength: 50` → `maxLength: 100` |
| `DEFAULT_CHANGED` | Default added or relaxed | Added default `"US"` for `country` |

### Patch Changes

| Category | Description | Example |
|---|---|---|
| `DESCRIPTION_CHANGED` | Documentation updated | Tool description clarified |
| `EXAMPLE_CHANGED` | Example modified | Example value updated |
| `METADATA_CHANGED` | Schema metadata updated | Version bump only |

## Configuration Options

```typescript
interface DetectionConfig {
  // Strictness level for change detection
  strictness: 'loose' | 'normal' | 'strict';

  // Whether to detect field renames automatically
  detectRenames: boolean;

  // Similarity threshold for rename detection (0-1)
  renameThreshold: number;

  // Custom change rules
  customRules: ChangeRule[];

  // Whether to include patch-level changes
  includePatchChanges: boolean;
}

const config: DetectionConfig = {
  strictness: 'normal',
  detectRenames: true,
  renameThreshold: 0.8,
  customRules: [
    {
      name: 'no-required-field-removal',
      severity: 'error',
      check: (change) => {
        if (change.category === 'field_removed' && change.oldValue?.required) {
          return { valid: false, message: 'Cannot remove required field' };
        }
        return { valid: true };
      }
    }
  ],
  includePatchChanges: false,
};
```

## Best Practices

### 1. Provide Migration Hints
```typescript
// Good: Includes migration guidance
{
  type: 'breaking',
  category: 'field_renamed',
  description: 'Field "name" was renamed to "full_name"',
  migration: {
    action: 'rename',
    from: 'name',
    to: 'full_name',
    codeExample: '{ full_name: data.name }'
  }
}

// Bad: No migration guidance
{
  type: 'breaking',
  description: 'Field changed'
}
```

### 2. Include Full Context
```typescript
// Good: Complete context
{
  type: 'breaking',
  category: 'type_changed',
  toolName: 'createUser',
  path: 'inputSchema.properties.age',
  oldValue: { type: 'string', description: 'Age as string' },
  newValue: { type: 'number', description: 'Age as number' },
  description: 'Field "age" type changed from string to number',
  severity: 'high'
}

// Bad: Missing context
{
  type: 'breaking',
  description: 'Type changed'
}
```

### 3. Handle Nested Changes
```typescript
// Good: Full path for nested fields
{
  category: 'field_added',
  path: 'inputSchema.properties.address.properties.country',
  description: 'Required nested field "country" added to "address"'
}

// Bad: Unclear path
{
  category: 'field_added',
  path: 'country',
  description: 'Field added'
}
```

## Error Handling

```typescript
// Incompatible schema versions
class IncompatibleSchemaError extends Error {
  constructor(oldVersion: string, newVersion: string) {
    super(`Cannot compare schema v${oldVersion} with v${newVersion}`);
    this.name = 'IncompatibleSchemaError';
  }
}

// Missing required schema fields
class InvalidSchemaError extends Error {
  constructor(message: string) {
    super(`Invalid schema for change detection: ${message}`);
    this.name = 'InvalidSchemaError';
  }
}
```

## Performance Considerations

- **Incremental detection**: Only compare changed portions of large schemas
- **Parallel processing**: Compare independent tools concurrently
- **Caching**: Cache comparison results within a run
- **Early termination**: Stop on first breaking change if only checking for breaks

## Testing Strategies

```typescript
describe('diffToolSnapshots', () => {
  it('should detect field rename as breaking', async () => {
    const oldSchema = createSchema({
      tools: [{ name: 'createUser', inputSchema: { properties: { name: { type: 'string' } } } }]
    });
    const newSchema = createSchema({
      tools: [{ name: 'createUser', inputSchema: { properties: { full_name: { type: 'string' } } } }]
    });

    const changes = oldTools, newTools);
    if (!result.ok) { throw new Error(result.error.message); }
    const changes = result.value;
    // await detector.detect(oldSchema, newSchema);
    expect(changes).toContainEqual(expect.objectContaining({
      type: 'breaking',
      category: 'field_renamed',
      toolName: 'createUser'
    }));
  });

  it('should detect optional field addition as non-breaking', async () => {
    const oldSchema = createSchema({
      tools: [{ name: 'createUser', inputSchema: { properties: { name: { type: 'string' } } } }]
    });
    const newSchema = createSchema({
      tools: [{ name: 'createUser', inputSchema: { properties: {
        name: { type: 'string' },
        email: { type: 'string' }
      } } }]
    });

    const changes = oldTools, newTools);
    if (!result.ok) { throw new Error(result.error.message); }
    const changes = result.value;
    // await detector.detect(oldSchema, newSchema);
    expect(changes).toContainEqual(expect.objectContaining({
      type: 'non-breaking',
      category: 'field_added'
    }));
  });

  it('should classify required field addition as breaking', async () => {
    const oldSchema = createSchema({
      tools: [{ name: 'createUser', inputSchema: { properties: { name: { type: 'string' } }, required: ['name'] } }]
    });
    const newSchema = createSchema({
      tools: [{ name: 'createUser', inputSchema: { properties: {
        name: { type: 'string' },
        email: { type: 'string' }
      }, required: ['name', 'email'] } }]
    });

    const changes = oldTools, newTools);
    if (!result.ok) { throw new Error(result.error.message); }
    const changes = result.value;
    // await detector.detect(oldSchema, newSchema);
    expect(changes).toContainEqual(expect.objectContaining({
      type: 'breaking',
      category: 'field_added'
    }));
  });
});
```

## Resources

- [ARCHITECTURE.md](../ARCHITECTURE.md) - System architecture
- [Change Detector section](../ARCHITECTURE.md#3-change-detector-module) - Detailed module spec
- [mcp-schema-evolution detector](../../mcp-schema-evolution/skills/schema-diffing/SKILL.md) - Reusable detector skill
