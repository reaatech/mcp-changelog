# MCP Changelog - AI Agent Guidelines

## Overview

This document provides guidelines for AI agents working on the mcp-changelog project. It establishes coding standards, architectural patterns, and development workflows to ensure consistency and quality.

## Project Context

**mcp-changelog** is an automated changelog and migration guide generator for MCP servers. It watches your MCP server's tool schemas across git commits/tags, detects changes, and generates:
- Human-readable changelog (Markdown)
- Migration guide with before/after examples
- Machine-readable diff (JSON)

**Related Project**: mcp-schema-evolution (../mcp-schema-evolution) — that project prevents breaking changes; this one documents them.

## Core Principles

1. **Type Safety First**: Use TypeScript strict mode, avoid `any`, leverage shared types from mcp-schema-evolution
2. **Git-Native Design**: All schema resolution flows through git refs
3. **Narrow Scope**: Only document changes, don't validate or adapt schemas
4. **Composability**: CLI, library, and GitHub Action share the same core engine
5. **Test Coverage**: >90% coverage for core modules, integration tests for full pipeline

## Technology Stack

- **TypeScript 5.x** with strict mode
- **pnpm** package manager
- **Vitest** for testing
- **ESLint + Prettier** for code quality
- **Commander.js** for CLI
- **Octokit** for GitHub API
- **simple-git** for git operations
- **@mcp-schema-evolution/core** for change detection and shared types

## Development Workflow

### Setup
```bash
pnpm install
pnpm run build
pnpm run test
```

### Before Writing Code
1. Read ARCHITECTURE.md to understand the module structure
2. Check existing `skills/` directory for relevant agent skills (files are named `SKILL.md`)
3. Review related types in mcp-schema-evolution if working with schema types

### Code Style
- Use functional composition over classes where possible
- Prefer `const` over `let`, avoid `var`
- Use template literals for string interpolation
- Export only public API from module index files
- Use descriptive variable names (no abbreviations except well-known ones like `schema`, `ref`)
- Add JSDoc comments for public functions and complex logic

### Git Hygiene
- Small, focused commits
- Descriptive commit messages following conventional commits
- One feature/fix per branch off `main`
- Rebase before merging to keep history clean
- No long-lived `develop` branch — trunk-based workflow

## Testing Requirements

### Coverage Targets
- **Minimum**: >85% for all modules
- **Core engine**: >90% for git, discovery, changelog, migration, and diff modules
- **CLI & Action**: >85%

### Unit Tests
Every module must have unit tests covering:
- Happy path scenarios
- Edge cases (empty inputs, malformed data)
- Error handling paths
- Type safety (tests should fail to compile with wrong types)

### Integration Tests
- Full pipeline tests using fixture git repos
- End-to-end CLI tests
- GitHub Action simulation tests
- Coverage enforced in CI via Vitest `--coverage` with thresholds

### Test Structure
```typescript
describe('ModuleName', () => {
  describe('functionName', () => {
    it('should handle happy path', () => {
      // test
    });

    it('should handle edge case: description', () => {
      // test
    });

    it('should throw error for invalid input', () => {
      // test
    });
  });
});
```

## Module-Specific Guidelines

### Git Integration (`src/git/`)
- Always validate git refs before use
- Handle detached HEAD state gracefully
- Support both local and remote (GitHub API) git access
- Cache git operations within a single run

### Schema Discovery (`src/discovery/`)
- Support multiple schema file conventions
- Provide clear error messages when schemas can't be found
- Handle malformed JSON gracefully with helpful error messages

### Change Detector (`src/detector/`)
- Reuse `@mcp-schema-evolution/core` (`diffToolSnapshots`, `classifyChange`), don't reimplement
- Add thin wrapper for git-specific context if needed
- **Always check `Result.ok`** before using the diff output
- Remember: change categories are `snake_case` (e.g., `tool_added`, `field_renamed`)

### Changelog Generator (`src/changelog/`)
- Default template should match Keep a Changelog format
- Support custom templates via configuration
- Include emoji indicators for change types
- Generate proper Markdown with consistent formatting

### Migration Guide Generator (`src/migration/`)
- Always include before/after code examples for breaking changes
- Use JSON for examples (language-agnostic)
- Include step-by-step migration instructions
- Link to affected tools and fields

### CLI (`src/cli/`)
- Use Commander.js for argument parsing
- Provide helpful error messages and usage hints
- Support `--help` on all commands
- Use consistent option naming (kebab-case)

### GitHub Action (`src/action/`)
- Minimal permissions (read contents, write PR comments)
- Fail gracefully with clear error messages
- Support both comment-on-PR and file-output modes
- Use GitHub's action toolkit patterns

## Common Patterns

### Error Handling
```typescript
// Good: Specific error with context
if (!schema) {
  throw new SchemaNotFoundError(ref.name, schemaPath);
}

// Bad: Generic error
if (!schema) {
  throw new Error('Schema not found');
}
```

### Configuration
```typescript
// Good: Type-safe config with defaults
const config: ChangelogConfig = {
  outputDir: './changelog',
  formats: ['markdown', 'json'],
  ...loadConfig(options.config),
  ...options,
};

// Bad: Loose config
const config = { ...options };
```

### Async Operations
```typescript
// Good: Parallel independent operations
const [oldSchemas, newSchemas] = await Promise.all([
  discoverSchemas(oldRef),
  discoverSchemas(newRef),
]);

// Bad: Sequential when parallel is possible
const oldSchemas = await discoverSchemas(oldRef);
const newSchemas = await discoverSchemas(newRef);
```

## Common Pitfalls

### 1. Forgetting `Result.ok` Checks
`@mcp-schema-evolution/core` functions return `Result<T>` (never throw). Always handle the error branch:
```typescript
// Good
const result = diffToolSnapshots(oldTools, newTools);
if (!result.ok) {
  throw new SchemaDiffError(result.error);
}
const changes = result.value;

// Bad
const changes = diffToolSnapshots(oldTools, newTools).value; // May be undefined
```

### 2. Wrong Change Category Casing
mcp-schema-evolution uses `snake_case` categories:
```typescript
// Correct
change.category === 'field_renamed'
change.category === 'tool_added'

// Wrong
change.category === 'FIELD_RENAMED'
change.category === 'TOOL_ADDED'
```

### 3. Using `tool` Instead of `toolName`
```typescript
// Correct
const name = change.toolName;

// Wrong
const name = change.tool; // Property does not exist
```

### 4. Treating `ToolSnapshot` as a Single Schema
A snapshot is a `Tool[]` array, not a wrapper object:
```typescript
// Correct
const snapshot: Tool[] = JSON.parse(content);

// Wrong
const schema = JSON.parse(content).tools; // Only if your JSON wraps tools
```

## Code Review Checklist

- [ ] TypeScript strict mode compliance (no `any`)
- [ ] Unit tests for new functionality (>85% coverage, >90% for core)
- [ ] Integration tests for pipeline changes
- [ ] Error handling for edge cases
- [ ] Descriptive variable and function names
- [ ] JSDoc comments for public API
- [ ] Consistent code formatting (Prettier)
- [ ] No ESLint warnings
- [ ] Git commit message follows conventions

## Security Considerations

- Never execute user-provided code
- Validate all git refs before use
- Sanitize schema content (treat as untrusted data)
- Use minimal GitHub API permissions
- No secrets in code or logs

## Performance Guidelines

- Cache git operations within a run
- Use streaming for large schema files
- Parallelize independent operations
- Target <2 seconds for full pipeline on typical schemas

## Documentation

- Update ARCHITECTURE.md for significant changes
- Add JSDoc for public functions
- Include usage examples in skill files
- Update README.md for user-facing changes

## Project Setup Reminders

### `.gitignore` Template
Ensure new agents initialize the project with:
```
node_modules/
dist/
coverage/
*.log
.DS_Store
.env
```

### Local Development with mcp-schema-evolution
Since `mcp-schema-evolution` is a local sibling project (`../mcp-schema-evolution`), use pnpm workspace or `link:` protocol during active development:
```json
"dependencies": {
  "@reaatech/mcp-schema-evolution": "workspace:*"
}
```

## Support

For questions about:
- **Architecture**: See ARCHITECTURE.md
- **Development plan**: See DEV_PLAN.md
- **Specific skills**: See `skills/` directory (files are `SKILL.md`)
- **Related types**: See `../mcp-schema-evolution/packages/core/src/types.ts`

GitHub: https://github.com/reaatech/mcp-changelog
