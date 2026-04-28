# CLI Development Skill

## Purpose

The CLI development skill provides capabilities for building a user-friendly command-line interface using Commander.js. The CLI is the primary user-facing interface for mcp-changelog.

## Capabilities

### 1. Command Parsing
- Parse git range notation (`v1.0.0..v2.0.0`)
- Support multiple output formats
- Handle configuration file loading
- Provide helpful error messages and usage hints

### 2. Subcommands
- `generate` — Generate changelog for a git range
- `diff` — Show raw diff without generating output
- `inspect` — Parse and display a schema file
- `list-tags` — List all version tags

### 3. Options and Flags
- `--schema-path` — Override auto-detected schema path
- `--output-dir` — Output directory for generated files
- `--format` — Output format (markdown, json, all)
- `--config` — Path to configuration file
- `--verbose` — Enable verbose logging

## Usage Examples

### Generate Changelog

```bash
# Basic usage
mcp-changelog generate v1.0.0..v2.0.0

# With custom schema path
mcp-changelog generate v1.0.0..v2.0.0 --schema-path api/schema.json

# With custom output directory
mcp-changelog generate v1.0.0..v2.0.0 --output-dir ./docs

# JSON only
mcp-changelog generate v1.0.0..v2.0.0 --format json

# Verbose mode
mcp-changelog generate v1.0.0..v2.0.0 --verbose
```

### Show Raw Diff

```bash
# Show diff without generating files
mcp-changelog diff v1.0.0..v2.0.0

# Output as JSON
mcp-changelog diff v1.0.0..v2.0.0 --format json
```

### Validate Schema

```bash
# Parse and display a schema file
mcp-changelog inspect ./schema.json

# Validate at a specific git ref
mcp-changelog inspect ./schema.json --ref v1.0.0
```

### List Tags

```bash
# List all tags
mcp-changelog list-tags

# Filter by semver pattern
mcp-changelog list-tags --pattern '^v\\d+\\.\\d+\\.\\d+$'
```

## Implementation

```typescript
#!/usr/bin/env node
import { Command } from 'commander';
import { generate } from './commands/generate';
import { diff } from './commands/diff';
import { inspect } from './commands/inspect';
import { listTags } from './commands/list-tags';
import { version } from '../package.json';

const program = new Command();

program
  .name('mcp-changelog')
  .description('Automated changelog generator for MCP servers')
  .version(version);

program
  .command('generate <range>')
  .description('Generate changelog for git range (e.g. v1.0.0..v2.0.0)')
  .option('-s, --schema-path <path>', 'Path to schema file (default: auto-detect)')
  .option('-o, --output-dir <dir>', 'Output directory', './')
  .option('-f, --format <format>', 'Output format (markdown, json, all)', 'all')
  .option('-c, --config <path>', 'Path to config file')
  .option('-v, --verbose', 'Enable verbose logging', false)
  .action(generate);

program
  .command('diff <range>')
  .description('Show raw diff without generating output')
  .option('-s, --schema-path <path>', 'Path to schema file (default: auto-detect)')
  .option('-f, --format <format>', 'Output format (text, json)', 'text')
  .action(diff);

program
  .command('inspect <schema>')
  .description('Parse and display a schema file')
  .option('-r, --ref <ref>', 'Git ref to inspect')
  .action(inspect);

program
  .command('list-tags')
  .description('List all version tags')
  .option('-p, --pattern <pattern>', 'Filter by regex pattern')
  .action(listTags);

program.parse(process.argv);
```

## Error Handling

```typescript
// User-friendly error messages
function handleError(error: Error, context: string) {
  switch (error.name) {
    case 'GitRefNotFoundError':
      console.error(`Error: Git reference not found: ${error.message}`);
      console.error('Hint: Run "mcp-changelog list-tags" to see available tags.');
      break;
    case 'SchemaNotFoundError':
      console.error(`Error: No schema file found. ${error.message}`);
      console.error('Hint: Use --schema-path to specify the schema location.');
      break;
    case 'SchemaParseError':
      console.error(`Error: Failed to parse schema: ${error.message}`);
      console.error('Hint: Check that the file is valid JSON.');
      break;
    case 'InvalidRangeError':
      console.error(`Error: Invalid git range: ${error.message}`);
      console.error('Hint: Use format "from..to", e.g. "v1.0.0..v2.0.0"');
      break;
    default:
      console.error(`Error: ${error.message}`);
      if (process.env.DEBUG) {
        console.error(error.stack);
      }
  }
  process.exit(1);
}
```

## Configuration File Support

```typescript
// mcp-changelog.config.ts
export default {
  schema: {
    paths: ['schema.json'],
  },
  output: {
    dir: './changelog',
    formats: ['markdown', 'json'],
  },
  changelog: {
    template: 'default',
    includeMigrationLinks: true,
  },
};
```

```typescript
// Config loading
import { loadConfig } from './config';

async function generate(range: string, options: any) {
  const config = await loadConfig(options.config);

  // CLI options override config file
  const finalConfig = {
    ...config,
    output: {
      ...config.output,
      dir: options.outputDir || config.output.dir,
    },
  };

  // ... generate changelog
}
```

## Best Practices

### 1. Provide Helpful Error Messages
```typescript
// Good: Actionable error
Error: Git reference "v3.0.0" not found
Hint: Run "mcp-changelog list-tags" to see available tags.

// Bad: Cryptic error
Error: fatal: ambiguous argument 'v3.0.0': unknown revision
```

### 2. Support Common Conventions
```typescript
// Good: Support common patterns
mcp-changelog generate v1.0.0..v2.0.0    // Tag range
mcp-changelog generate HEAD~5..HEAD       // Commit range
mcp-changelog generate main..feature      // Branch comparison

// Bad: Only one format
mcp-changelog generate --from v1.0.0 --to v2.0.0
```

### 3. sensible defaults
```typescript
// Good: Sensible defaults
--output-dir ./          // Current directory
--format all             // Both markdown and JSON
--schema-path (auto)     // Auto-detect

// Bad: Required options
--output-dir (required)
--format (required)
--schema-path (required)
```

## Testing Strategies

```typescript
describe('CLI', () => {
  it('should generate changelog for valid range', async () => {
    const { stdout } = await runCLI('generate v1.0.0..v2.0.0 --output-dir /tmp/test');
    expect(stdout).toContain('CHANGELOG.md');
    expect(stdout).toContain('MIGRATION.md');
    expect(stdout).toContain('diff.json');
  });

  it('should fail for invalid range', async () => {
    const { stderr, exitCode } = await runCLI('generate invalid..range');
    expect(exitCode).toBe(1);
    expect(stderr).toContain('Git reference not found');
  });

  it('should list tags', async () => {
    const { stdout } = await runCLI('list-tags');
    expect(stdout).toContain('v1.0.0');
    expect(stdout).toContain('v2.0.0');
  });

  it('should show help', async () => {
    const { stdout } = await runCLI('--help');
    expect(stdout).toContain('generate');
    expect(stdout).toContain('diff');
    expect(stdout).toContain('inspect');
    expect(stdout).toContain('list-tags');
  });
});
```

## Resources

- [ARCHITECTURE.md](../ARCHITECTURE.md) - System architecture
- [CLI section](../ARCHITECTURE.md#7-cli-module) - Detailed module spec
- [Commander.js docs](https://github.com/tj/commander.js) - CLI framework reference
