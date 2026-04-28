# Config Loader Skill

## Purpose

The config-loader skill provides capabilities for loading, merging, and validating `mcp-changelog` configuration. Configuration flows from defaults → config file → CLI options → environment variables, with later sources overriding earlier ones.

## Capabilities

### 1. Configuration Discovery
- Auto-discover `mcp-changelog.config.ts`, `.js`, `.json`, or `mcp-changelog` key in `package.json`
- Support explicit `--config <path>` override
- Load from current working directory or git repository root

### 2. Configuration Merging
- Default configuration as base layer
- Config file overrides defaults
- CLI flags override config file
- Environment variables override CLI flags

### 3. Runtime Validation
- Validate configuration with Zod schemas
- Provide helpful error messages for invalid config
- Support partial configuration (unspecified keys use defaults)

## Configuration Schema

```typescript
import { z } from 'zod';

const configSchema = z.object({
  schema: z.object({
    paths: z.array(z.string()).optional(),
    exclude: z.array(z.string()).optional(),
  }).optional(),
  output: z.object({
    dir: z.string().optional(),
    formats: z.array(z.enum(['markdown', 'json'])).optional(),
    changelogFile: z.string().optional(),
    migrationFile: z.string().optional(),
    diffFile: z.string().optional(),
  }).optional(),
  changelog: z.object({
    template: z.string().optional(),
    includeMigrationLinks: z.boolean().optional(),
    emojiStyle: z.enum(['github', 'none']).optional(),
  }).optional(),
  migration: z.object({
    includeCodeExamples: z.boolean().optional(),
    languages: z.array(z.string()).optional(),
  }).optional(),
  git: z.object({
    tagPattern: z.string().optional(),
  }).optional(),
  ci: z.object({
    commentOnPR: z.boolean().optional(),
    failOnBreaking: z.boolean().optional(),
  }).optional(),
});

export type Config = z.infer<typeof configSchema>;
```

## Usage Examples

### Loading Configuration

```typescript
import { loadConfig } from '@reaatech/mcp-changelog/config';

// Auto-discover config file
const config = await loadConfig();

// Explicit path
const config = await loadConfig('./mcp-changelog.config.ts');

// With CLI overrides
const config = await loadConfig(options.config, {
  output: { dir: options.outputDir },
  schema: { paths: options.schemaPath ? [options.schemaPath] : undefined },
});
```

### Default Configuration

```typescript
const defaultConfig: Config = {
  schema: {
    paths: undefined, // Auto-detect
    exclude: ['node_modules/**', 'dist/**', '.git/**'],
  },
  output: {
    dir: './',
    formats: ['markdown', 'json'],
    changelogFile: 'CHANGELOG.md',
    migrationFile: 'MIGRATION.md',
    diffFile: 'diff.json',
  },
  changelog: {
    template: 'default',
    includeMigrationLinks: true,
    emojiStyle: 'github',
  },
  migration: {
    includeCodeExamples: true,
    languages: ['json'],
  },
  git: {
    tagPattern: '^v\\d+\\.\\d+\\.\\d+$',
  },
  ci: {
    commentOnPR: true,
    failOnBreaking: false,
  },
};
```

### Configuration File Examples

**TypeScript (`mcp-changelog.config.ts`)**:
```typescript
import { defineConfig } from '@reaatech/mcp-changelog/config';

export default defineConfig({
  schema: {
    paths: ['packages/*/schema.json'],
    exclude: ['**/node_modules/**'],
  },
  output: {
    dir: './docs/changelog',
    formats: ['markdown', 'json'],
  },
  changelog: {
    template: 'default',
    emojiStyle: 'github',
  },
});
```

**JSON (`mcp-changelog.config.json`)**:
```json
{
  "schema": {
    "paths": ["schema.json"]
  },
  "output": {
    "dir": "./changelog",
    "formats": ["markdown"]
  }
}
```

## Best Practices

### 1. Always Merge with Defaults
```typescript
// Good: Defaults + overrides
const config = mergeConfig(defaultConfig, fileConfig, cliOverrides);

// Bad: Only CLI options
const config = cliOptions; // Missing defaults for unset keys
```

### 2. Validate Early
```typescript
// Good: Validate at load time
const config = validateConfig(rawConfig);
if (!config.ok) {
  console.error(`Invalid config: ${config.error.message}`);
  process.exit(1);
}

// Bad: Validate at use time
generateChangelog(rawConfig); // May fail mid-run with cryptic error
```

### 3. Support Partial Configs
```typescript
// Good: Only specify what you need
export default {
  output: { dir: './docs' }
};
// Everything else uses defaults

// Bad: Require full config
export default {
  // User must specify every key
};
```

## Error Handling

```typescript
class ConfigNotFoundError extends Error {
  constructor(searchPaths: string[]) {
    super(`Config file not found. Searched: ${searchPaths.join(', ')}`);
    this.name = 'ConfigNotFoundError';
  }
}

class ConfigValidationError extends Error {
  constructor(errors: z.ZodError) {
    super(`Config validation failed: ${errors.message}`);
    this.name = 'ConfigValidationError';
  }
}
```

## Testing Strategies

```typescript
describe('loadConfig', () => {
  it('should load TypeScript config file', async () => {
    const config = await loadConfig('./fixtures/mcp-changelog.config.ts');
    expect(config.output.dir).toBe('./changelog');
  });

  it('should merge CLI overrides', async () => {
    const config = await loadConfig(undefined, {
      output: { dir: '/tmp/output' }
    });
    expect(config.output.dir).toBe('/tmp/output');
    expect(config.output.formats).toEqual(['markdown', 'json']); // Default preserved
  });

  it('should throw for invalid config', async () => {
    await expect(loadConfig('./fixtures/invalid.config.ts'))
      .rejects.toThrow(ConfigValidationError);
  });

  it('should use defaults when no config file exists', async () => {
    const config = await loadConfig();
    expect(config.output.formats).toEqual(['markdown', 'json']);
  });
});
```

## Resources

- [ARCHITECTURE.md](../../ARCHITECTURE.md) - System architecture
- [CLI Development skill](../cli-development/SKILL.md) - CLI configuration integration
- [GitHub Action skill](../github-action/SKILL.md) - Action input handling
