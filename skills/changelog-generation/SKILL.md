# Changelog Generation Skill

## Purpose

The changelog-generation skill automatically creates well-structured Markdown changelogs from schema diffs. It transforms technical change data into human-readable documentation that helps users understand what changed, why it changed, and how to adapt.

## Capabilities

### 1. Automated Changelog Creation
- Generate changelogs from schema version comparisons
- Create structured entries with proper categorization
- Include breaking changes, features, fixes, and deprecations
- Support multiple output formats (Markdown, JSON)

### 2. Semantic Versioning Suggestions
- Analyze changes and suggest appropriate version bumps
- Follow semantic versioning rules (major.minor.patch)
- Provide rationale for version recommendations

### 3. Change Categorization
- Automatically categorize changes by type and impact
- Group related changes together
- Prioritize breaking changes at the top
- Include affected tools and fields

### 4. Template System
- Default template matching Keep a Changelog format
- Custom template support via configuration
- Emoji indicators for change types
- Configurable section ordering

## Usage Examples

### Basic Changelog Generation

```typescript
import { ChangelogGenerator } from '@reaatech/mcp-changelog/changelog';

const generator = new ChangelogGenerator();

const changelog = await generator.generate({
  version: '2.0.0',
  date: new Date('2024-05-15'),
  changes: [
    { type: 'breaking', category: 'field_renamed', toolName: 'createUser', description: 'Field "name" renamed to "full_name"' },
    { type: 'breaking', category: 'field_added', toolName: 'createUser', description: 'Required field "age" added without default' },
    { type: 'non-breaking', category: 'field_added', toolName: 'createUser', description: 'Optional field "middle_name" added' },
    { type: 'non-breaking', category: 'tool_added', toolName: 'getUser', description: 'New tool for fetching user details' },
  ]
});

console.log(changelog.markdown);
```

**Output:**
```markdown
# [2.0.0] - 2024-05-15

## 🔥 Breaking Changes
- **createUser**: Field `name` renamed to `full_name`
- **createUser**: Required field `age` added without default value

## ✨ Added
- **createUser**: Optional field `middle_name` added
- **getUser**: New tool for fetching user details

---

**Suggested version bump**: major (from previous version)
```

### With Custom Template

```typescript
import { ChangelogGenerator, TemplateConfig } from '@reaatech/mcp-changelog/changelog';

const template: TemplateConfig = {
  name: 'enterprise',
  content: `
# Release {{version}}

**Date**: {{date}}

{{#each sections}}
## {{title}}
{{#each changes}}
- [{{tool}}] {{description}}
{{/each}}
{{/each}}
`.trim()
};

const generator = new ChangelogGenerator({ templates: [template] });

const changelog = await generator.generate({
  version: '2.0.0',
  date: new Date(),
  changes: schemaChanges,
  template: 'enterprise'
});
```

### Multi-Format Export

```typescript
import { MultiFormatExporter } from '@reaatech/mcp-changelog/changelog';

const exporter = new MultiFormatExporter();

await exporter.export({
  changelog: changelogData,
  formats: ['markdown', 'json'],
  outputDir: './changelog/',
  filenames: {
    markdown: 'CHANGELOG.md',
    json: 'changelog.json'
  }
});

// Files created:
// - ./changelog/CHANGELOG.md
// - ./changelog/changelog.json
```

## Configuration Options

```typescript
interface ChangelogConfig {
  // Output format
  formats: ('markdown' | 'json')[];

  // Template name or custom template
  template: string | TemplateConfig;

  // Whether to include migration links
  includeMigrationLinks: boolean;

  // Emoji style
  emojiStyle: 'github' | 'none';

  // Section ordering
  sectionOrder: string[];

  // Custom section definitions
  customSections: Record<string, SectionConfig>;
}

interface SectionConfig {
  title: string;
  emoji: string;
  filter: (change: SchemaChange) => boolean;
}

const config: ChangelogConfig = {
  formats: ['markdown', 'json'],
  template: 'default',
  includeMigrationLinks: true,
  emojiStyle: 'github',
  sectionOrder: ['breaking', 'added', 'changed', 'deprecated', 'removed', 'fixed', 'security'],
  customSections: {
    performance: {
      title: 'Performance',
      emoji: '⚡',
      filter: (change) => change.category === 'PERFORMANCE_IMPROVEMENT'
    }
  }
};
```

## Default Sections

| Section | Emoji | Filter |
|---|---|---|
| Breaking Changes | 🔥 | `change.type === 'breaking'` |
| Added | ✨ | `change.category === 'tool_added' \|\| change.category === 'field_added'` (non-breaking) |
| Changed | 🔄 | `change.category === 'type_changed'` (non-breaking) |
| Deprecated | ⚠️ | `change.category === 'DEPRECATED'` |
| Removed | 🗑️ | `change.category === 'tool_removed' \|\| change.category === 'field_removed'` (non-breaking) |
| Fixed | 🐛 | `change.category === 'FIX'` |
| Security | 🔒 | `change.category === 'SECURITY'` |

## Best Practices

### 1. Use Clear, Descriptive Language
```typescript
// Good: Clear and descriptive
{
  type: 'breaking',
  description: 'Renamed field "name" to "full_name" in createUser tool'
}

// Bad: Vague
{
  type: 'breaking',
  description: 'Field changed'
}
```

### 2. Group Related Changes
```typescript
// Good: Grouped by tool
## 🔥 Breaking Changes
- **createUser**:
  - Field `name` renamed to `full_name`
  - Required field `age` added
- **getUser**: Output schema `email` field now nullable

// Bad: Unstructured list
## 🔥 Breaking Changes
- Field renamed
- Field added
- Type changed
```

### 3. Prioritize Breaking Changes
```typescript
// Good: Breaking changes first
const sections = [
  { title: 'Breaking Changes', changes: breakingChanges },  // First
  { title: 'Added', changes: addedChanges },
  { title: 'Fixed', changes: fixedChanges },
];

// Bad: Breaking changes buried
const sections = [
  { title: 'Added', changes: addedChanges },
  { title: 'Fixed', changes: fixedChanges },
  { title: 'Breaking Changes', changes: breakingChanges },  // Last
];
```

## Performance Considerations

- **Template caching**: Cache compiled templates between runs
- **Parallel export**: Write multiple formats concurrently
- **Streaming output**: Stream large changelogs to disk
- **Incremental generation**: Only regenerate changed sections

## Testing Strategies

```typescript
describe('ChangelogGenerator', () => {
  it('should generate markdown with breaking changes section', async () => {
    const generator = new ChangelogGenerator();
    const changelog = await generator.generate({
      version: '2.0.0',
      date: new Date('2024-05-15'),
      changes: [
        { type: 'breaking', category: 'field_renamed', toolName: 'createUser', description: 'name → full_name' }
      ]
    });

    expect(changelog.markdown).toContain('## 🔥 Breaking Changes');
    expect(changelog.markdown).toContain('**createUser**');
    expect(changelog.markdown).toContain('full_name');
  });

  it('should suggest correct version bump', async () => {
    const generator = new ChangelogGenerator();
    const changelog = await generator.generate({
      version: '2.0.0',
      date: new Date(),
      changes: [
        { type: 'breaking', category: 'field_removed' }
      ]
    });

    expect(changelog.suggestedVersionBump).toBe('major');
    expect(changelog.hasBreaking).toBe(true);
  });

  it('should handle empty changes', async () => {
    const generator = new ChangelogGenerator();
    const changelog = await generator.generate({
      version: '1.0.1',
      date: new Date(),
      changes: []
    });

    expect(changelog.markdown).toContain('No changes');
    expect(changelog.hasBreaking).toBe(false);
  });
});
```

## Resources

- [ARCHITECTURE.md](../ARCHITECTURE.md) - System architecture
- [Changelog Generator section](../ARCHITECTURE.md#4-changelog-generator-module) - Detailed module spec
- [Keep a Changelog](https://keepachangelog.com/) - Changelog format standard
