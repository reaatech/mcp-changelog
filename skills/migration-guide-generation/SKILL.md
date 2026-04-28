# Migration Guide Generation Skill

## Purpose

The migration-guide-generation skill creates detailed, actionable migration documentation for breaking changes. It generates before/after code examples, step-by-step instructions, and identifies affected tools to help users upgrade smoothly.

## Capabilities

### 1. Automated Migration Guide Creation
- Generate migration guides from breaking changes
- Include before/after code examples
- Provide step-by-step migration instructions
- Identify affected tools and fields

### 2. Code Example Generation
- Generate JSON examples (language-agnostic)
- Support multiple programming languages (TypeScript, Python, Go)
- Show field mappings and type conversions
- Include nested object transformations

### 3. Affected Tools Analysis
- Identify which tools are affected by each change
- List fields that require migration
- Calculate migration effort estimates
- Provide impact summaries

## Usage Examples

### Basic Migration Guide Generation

```typescript
import { MigrationGuideGenerator } from '@reaatech/mcp-changelog/migration';

const generator = new MigrationGuideGenerator();

const guide = await generator.generate({
  version: '2.0.0',
  changes: [
    {
      type: 'breaking',
      category: 'field_renamed',
      toolName: 'createUser',
      path: 'inputSchema.properties.name',
      description: 'Field "name" renamed to "full_name"',
      oldValue: { type: 'string' },
      newValue: { type: 'string' }
    },
    {
      type: 'breaking',
      category: 'field_added',
      toolName: 'createUser',
      path: 'inputSchema.properties.age',
      description: 'Required field "age" added without default',
      oldValue: undefined,
      newValue: { type: 'number' }
    },
    {
      type: 'breaking',
      category: 'tool_removed',
      toolName: 'legacySearch',
      description: 'Tool "legacySearch" removed',
    }
  ],
  oldSchema: v1Schema,
  newSchema: v2Schema
});

console.log(guide.markdown);
```

**Output:**
```markdown
# Migration Guide for v2.0.0

## Breaking Change: Field Rename in `createUser`

### What Changed
The `name` field has been renamed to `full_name`.

### Before (v1.x)
```json
{
  "name": "John Doe",
  "email": "john@example.com"
}
```

### After (v2.x)
```json
{
  "full_name": "John Doe",
  "email": "john@example.com"
}
```

### Migration Steps
1. Update all `createUser` calls to use `full_name` instead of `name`
2. Search codebase for `.name` references in user creation contexts
3. Update any stored data mappings

---

## Breaking Change: Required Field Added to `createUser`

### What Changed
A new required field `age` has been added without a default value.

### Before (v1.x)
```json
{
  "name": "John Doe",
  "email": "john@example.com"
}
```

### After (v2.x)
```json
{
  "full_name": "John Doe",
  "email": "john@example.com",
  "age": 30
}
```

### Migration Steps
1. Add `age` parameter to all `createUser` calls
2. If age is unknown, consider adding a default value on the server side
3. Update any client-side validation to accept the new field

---

## Breaking Change: Tool Removal

### What Changed
The `legacySearch` tool has been removed.

### Migration Steps
1. Replace `legacySearch` calls with the `query` tool
2. Note: `query` has a different response format (paginated)
3. Update response handling code accordingly
4. Remove any `legacySearch`-specific configuration

---

## Summary

| Change | Tool | Action Required |
|---|---|---|
| Field renamed | `createUser` | Update field name in all calls |
| Required field added | `createUser` | Add `age` parameter to all calls |
| Tool removed | `legacySearch` | Migrate to `query` tool |
```

### With Multi-Language Examples

```typescript
import { MigrationGuideGenerator } from '@reaatech/mcp-changelog/migration';

const generator = new MigrationGuideGenerator({
  languages: ['json', 'typescript', 'python']
});

const guide = await generator.generate({
  version: '2.0.0',
  changes: breakingChanges,
  oldSchema: v1Schema,
  newSchema: v2Schema,
  includeCodeExamples: true
});

// Output includes examples in all three languages
```

## Configuration Options

```typescript
interface MigrationGuideConfig {
  // Version being migrated to
  version: string;

  // Breaking changes to document
  changes: SchemaChange[];

  // Old and new schemas for generating examples
  oldSchema?: ToolSnapshot;
  newSchema?: ToolSnapshot;

  // Whether to include code examples
  includeCodeExamples: boolean;

  // Programming languages for examples
  languages: string[];

  // Whether to include affected tools summary
  includeAffectedTools: boolean;

  // Whether to include migration effort estimates
  includeEffortEstimates: boolean;
}

const config: MigrationGuideConfig = {
  version: '2.0.0',
  changes: breakingChanges,
  oldSchema: v1Schema,
  newSchema: v2Schema,
  includeCodeExamples: true,
  languages: ['json', 'typescript', 'python', 'go'],
  includeAffectedTools: true,
  includeEffortEstimates: true
};
```

## Code Example Generation

### JSON Examples (Default)
```json
// Before (v1.x)
{ "name": "John", "email": "john@example.com" }

// After (v2.x)
{ "full_name": "John", "email": "john@example.com", "age": 30 }
```

### TypeScript Examples
```typescript
// Before (v1.x)
const user = await client.createUser({
  name: 'John Doe',
  email: 'john@example.com'
});

// After (v2.x)
const user = await client.createUser({
  full_name: 'John Doe',
  email: 'john@example.com',
  age: 30
});
```

### Python Examples
```python
# Before (v1.x)
user = client.create_user(
    name='John Doe',
    email='john@example.com'
)

# After (v2.x)
user = client.create_user(
    full_name='John Doe',
    email='john@example.com',
    age=30
)
```

## Best Practices

### 1. Always Include Before/After Examples
```typescript
// Good: Clear before/after
### Before (v1.x)
```json
{ "name": "John" }
```

### After (v2.x)
```json
{ "full_name": "John" }
```

// Bad: No examples
The field was renamed. Update your code.
```

### 2. Provide Actionable Steps
```typescript
// Good: Specific steps
// 1. Find all createUser calls: grep -r "createUser(" src/
// 2. Replace "name" with "full_name"
// 3. Add "age" parameter (use 0 if unknown)
// 4. Run tests to verify

// Bad: Vague instructions
// Update your code to use the new field name.
```

### 3. Include Impact Assessment
```typescript
// Good: Clear impact
// **Affected**: All clients using `createUser` tool
// **Effort**: ~30 minutes for typical codebase
// **Risk**: Low - straightforward field rename

// Bad: No context
// Breaking change detected.
```

## Performance Considerations

- **Lazy example generation**: Only generate examples for changes that need them
- **Template caching**: Cache example templates between runs
- **Parallel generation**: Generate examples for multiple changes concurrently
- **Streaming output**: Stream large guides to disk

## Testing Strategies

```typescript
describe('MigrationGuideGenerator', () => {
  it('should generate migration guide with before/after examples', async () => {
    const generator = new MigrationGuideGenerator();
    const guide = await generator.generate({
      version: '2.0.0',
      changes: [{
        type: 'breaking',
        category: 'field_renamed',
        toolName: 'createUser',
        description: 'name → full_name',
        oldValue: { type: 'string' },
        newValue: { type: 'string' }
      }],
      oldSchema: v1Schema,
      newSchema: v2Schema
    });

    expect(guide.markdown).toContain('Before (v1.x)');
    expect(guide.markdown).toContain('After (v2.x)');
    expect(guide.markdown).toContain('full_name');
  });

  it('should list affected tools', async () => {
    const generator = new MigrationGuideGenerator();
    const guide = await generator.generate({
      version: '2.0.0',
      changes: breakingChanges
    });

    expect(guide.affectedTools).toContain('createUser');
    expect(guide.affectedTools).toContain('legacySearch');
  });

  it('should generate multi-language examples', async () => {
    const generator = new MigrationGuideGenerator({
      languages: ['json', 'typescript', 'python']
    });
    const guide = await generator.generate({
      version: '2.0.0',
      changes: breakingChanges,
      includeCodeExamples: true
    });

    expect(guide.markdown).toContain('```json');
    expect(guide.markdown).toContain('```typescript');
    expect(guide.markdown).toContain('```python');
  });
});
```

## Resources

- [ARCHITECTURE.md](../ARCHITECTURE.md) - System architecture
- [Migration Guide Generator section](../ARCHITECTURE.md#5-migration-guide-generator-module) - Detailed module spec
- [mcp-schema-evolution changelog skill](../../mcp-schema-evolution/skills/changelog-generation/SKILL.md) - Related migration guide patterns
