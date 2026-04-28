# MCP Changelog - Architecture Specification

## System Overview

mcp-changelog is a focused tool that reads MCP tool schemas from git history, detects changes between versions, and generates three outputs: a Markdown changelog, a migration guide with before/after examples, and a machine-readable JSON diff.

## Architectural Principles

1. **Narrow Scope**: Only documents changes, does not prevent or adapt them
2. **Git-Native**: All schema resolution flows through git refs (tags, commits, branches)
3. **Type-Safe**: Leverages shared types from mcp-schema-evolution
4. **Composable**: CLI, library, and GitHub Action share the same core engine
5. **Zero Runtime Dependencies on Schema Validation**: Schemas are read as-is

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                       MCP Changelog                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │   Git           │  │   Schema        │  │   Change        │ │
│  │   Integration   │──▶│   Discovery    │──▶│   Detector     │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
│           │                     │                     │         │
│           │                     │                     │         │
│           ▼                     ▼                     ▼         │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │   Markdown      │  │   Migration     │  │   JSON          │ │
│  │   Changelog     │  │   Guide         │  │   Diff          │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
│           │                     │                     │         │
│           └─────────────────────┼─────────────────────┘         │
│                                 │                               │
│                    ┌─────────────────────────────────┐          │
│                    │   CLI   │   Library   │   GH    │          │
│                    │         │             │   Action│          │
│                    └─────────────────────────────────┘          │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

## Core Modules

### 1. Git Integration Module (`@reaatech/mcp-changelog/git`)

**Purpose**: Resolve git refs and extract schema files from git history

**Components**:
- `GitResolver` — Resolve tag names, commit SHAs, and ref ranges (e.g., `v1.2.0..v1.3.0`)
- `TreeReader` — List files in a git tree, extract file contents at a specific ref
- `TagLister` — Enumerate git tags, filter by semver pattern

**Key Interfaces**:
```typescript
interface GitRef {
  type: 'tag' | 'commit' | 'branch';
  name: string;
  sha: string;
}

interface RefRange {
  from: GitRef;
  to: GitRef;
}

interface GitIntegration {
  resolveRef(ref: string): Promise<GitRef>;
  parseRange(range: string): Promise<RefRange>;
  listTags(pattern?: string): Promise<GitRef[]>;
  readFile(ref: GitRef, path: string): Promise<string>;
  listFiles(ref: GitRef, dir?: string): Promise<string[]>;
}
```

**Design Decisions**:
- Uses `simple-git` for git operations (wraps the git CLI)
- Schema files are read as raw strings, parsed downstream
- Supports both local repos and (via Octokit) remote file fetching for GitHub Action mode

### 2. Schema Discovery Module (`@reaatech/mcp-changelog/discovery`)

**Purpose**: Find and parse MCP schema files within a git tree

**Components**:
- `SchemaLocator` — Find schema files by convention (e.g., `schema.json`, `mcp.json`, `tools.json`, `**/*.schema.json`)
- `SchemaParser` — Parse JSON/YAML schema files into `Tool[]` arrays
- `MultiSchemaAggregator` — Handle repos with multiple schema files

**Key Interfaces**:
```typescript
interface SchemaLocatorConfig {
  patterns: string[];  // e.g. ['schema.json', 'mcp.json', '**/*.schema.json']
  exclude: string[];
}

interface DiscoveredSchema {
  path: string;
  ref: GitRef;
  schema: Tool[];
  parseError?: Error;
}
```

**Schema File Conventions** (auto-detected, first match wins):
1. `schema.json` at repo root
2. `mcp.json` at repo root
3. `tools.json` at repo root
4. `**/*.schema.json` (glob)
5. Configurable via `mcp-changelog.config.{js,mjs,cjs,json}`

### 3. Change Detector Module (`@reaatech/mcp-changelog/detector`)

**Purpose**: Compare schemas and classify changes

**Design**: This module reuses `@mcp-schema-evolution/core` as a dependency. No reimplementation needed.

**Wrapper Interface**:
```typescript
interface ChangeDetector {
  detect(oldTools: ToolSnapshot, newTools: ToolSnapshot): Promise<SchemaChange[]>;
  detectMulti(oldSchemas: DiscoveredSchema[], newSchemas: DiscoveredSchema[]): Promise<SchemaChange[]>;
}
```

**Change Categories Detected**:
| Category | Breaking? | Example |
|---|---|---|
| `tool_added` | No | New tool `getUser` added |
| `tool_removed` | Yes | Tool `legacySearch` removed |
| `field_added` | Depends | Optional = No, Required without default = Yes |
| `field_removed` | Yes | Field `email` removed from `createUser` |
| `field_renamed` | Yes | `name` → `full_name` |
| `type_changed` | Depends | `string` → `number` = Yes, `int32` → `int64` = No |
| `required_changed` | Depends | Optional → Required = Yes, Required → Optional = No |
| `default_changed` | Depends | New default that changes behavior = Yes |
| `constraint_changed` | Depends | Tightened = Yes, Relaxed = No |
| `deprecated` | No | Field marked as deprecated |

### 4. Changelog Generator Module (`@reaatech/mcp-changelog/changelog`)

**Purpose**: Generate human-readable Markdown changelog from detected changes

**Components**:
- `ChangelogBuilder` — Assemble changelog sections from `SchemaChange[]`
- `TemplateEngine` — Render changelog from configurable templates
- `SemanticVersionSuggester` — Suggest version bump based on changes

**Output Format** (default Markdown):
```markdown
# [2.0.0] - 2024-05-15

## 🔥 Breaking Changes
- **createUser**: Field `name` renamed to `full_name`
- **createUser**: Required field `age` added without default
- **legacySearch**: Tool removed

## ✨ Added
- **getUser**: New tool for fetching user details
- **createUser**: Optional field `middle_name` added

## ⚠️ Changed
- **updateUser**: Field `status` type widened from `string` to `string | null`

## 🐛 Fixed
- **getUser**: Pagination `limit` field now accepts values up to 1000
```

**Key Interfaces**:
```typescript
interface ChangelogConfig {
  version: string;
  date: Date;
  changes: SchemaChange[];
  template?: string;
  includeMigrationLinks?: boolean;
}

interface ChangelogOutput {
  markdown: string;
  suggestedVersionBump: 'major' | 'minor' | 'patch';
  hasBreaking: boolean;
  changeCount: number;
}
```

### 5. Migration Guide Generator Module (`@reaatech/mcp-changelog/migration`)

**Purpose**: Generate detailed migration guides for breaking changes with before/after code examples

**Components**:
- `MigrationGuideBuilder` — Assemble migration steps from breaking changes
- `CodeExampleGenerator` — Generate before/after code snippets
- `AffectedToolsAnalyzer` — Identify which tools/clients are affected

**Output Format**:
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

## Breaking Change: Tool Removal

### What Changed
The `legacySearch` tool has been removed.

### Migration Steps
1. Replace `legacySearch` calls with `query` tool
2. Note: `query` has a different response format (paginated)
```

**Key Interfaces**:
```typescript
interface MigrationGuideConfig {
  changes: SchemaChange[];
  includeCodeExamples: boolean;
  codeLanguages: string[];  // ['json', 'typescript', 'python']
  oldSchema?: Tool[];
  newSchema?: Tool[];
}

interface MigrationGuideOutput {
  markdown: string;
  breakingChangeCount: number;
  affectedTools: string[];
}
```

### 6. JSON Diff Module (`@reaatech/mcp-changelog/diff`)

**Purpose**: Generate machine-readable JSON diff for tooling consumption

**Output Format**:
```json
{
  "from": "v1.2.0",
  "to": "v1.3.0",
  "date": "2024-05-15T00:00:00.000Z",
  "summary": {
    "total": 5,
    "breaking": 2,
    "nonBreaking": 3,
    "patch": 0
  },
  "changes": [
    {
      "type": "breaking",
      "category": "field_renamed",
      "toolName": "createUser",
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
    }
  ],
  "suggestedVersionBump": "major"
}
```

### 7. CLI Module (`@reaatech/mcp-changelog/cli`)

**Purpose**: Command-line interface for all operations

**Commands**:
```
mcp-changelog generate <range>        Generate changelog for git range (e.g. v1.0.0..v2.0.0)
mcp-changelog diff <range>            Show raw diff without generating output
mcp-changelog inspect <schema>        Parse and display a schema file at a git ref
mcp-changelog list-tags               List all version tags
```

**Options**:
```
--schema-path <path>        Path to schema file (default: auto-detect)
--output-dir <dir>          Output directory (default: ./)
--format <format>           Output formats: markdown,json,all (default: all)
--config <path>             Path to config file
--verbose                   Enable verbose logging
```

> **Note**: There is no `validate` command. Schema validation is out of scope — this tool assumes schemas are valid and focuses on diffing and documentation.

**Key Interfaces**:
```typescript
interface CLIOptions {
  schemaPath?: string;
  outputDir: string;
  format: 'markdown' | 'json' | 'all';
  config?: string;
  verbose: boolean;
}
```

### 8. GitHub Action Module

**Purpose**: GitHub Action that comments on PRs with schema changes

**Action Inputs**:
```yaml
- uses: reatech/mcp-changelog@v1
  with:
    schema-path: 'schema.json'        # Optional, auto-detected if omitted
    base-ref: ${{ github.event.pull_request.base.sha }}
    head-ref: ${{ github.event.pull_request.head.sha }}
    comment-on-pr: true               # Post comment on PR
    fail-on-breaking: false           # Don't fail the check
    output-dir: './changelog'         # Write files
```

**PR Comment Format**:
```markdown
## Schema Changes Detected

| Change | Tool | Severity |
|---|---|---|
| Field renamed: `name` → `full_name` | `createUser` | 🔴 High |
| Required field added: `age` | `createUser` | 🔴 High |
| New tool added | `getUser` | 🟢 None |

**Suggested version bump**: `major`

<details>
<summary>Full changelog</summary>

[Full markdown changelog here...]
</details>
```

## Data Flow

```
1. User runs: mcp-changelog generate v1.2.0..v1.3.0

2. Git Integration
   - Parse "v1.2.0..v1.3.0" → RefRange(from: tag v1.2.0, to: tag v1.3.0)
   - Extract schema files at both refs

3. Schema Discovery
   - Find schema files at each ref (auto-detect or use configured path)
   - Parse JSON → Tool[] arrays

4. Change Detector
   - Compare old vs new ToolSnapshot arrays
   - Classify each change as breaking/non-breaking/patch
   - Generate SchemaChange[] with migration hints

5. Output Generation (parallel)
   - Changelog Generator → Markdown string
   - Migration Guide Generator → Markdown string
   - JSON Diff → JSON string

6. Write Output
   - CHANGELOG.md (or configured filename)
   - MIGRATION.md
   - diff.json
   - All written to --output-dir
```

## Configuration System

```js
// mcp-changelog.config.js
export default {
  // Schema file location(s)
  schema: {
    paths: ['schema.json'],           // Auto-detected if not specified
    exclude: ['node_modules/', 'dist/'],
  },

  // Output settings
  output: {
    dir: './changelog',
    formats: ['markdown', 'json'],
    changelogFile: 'CHANGELOG.md',
    migrationFile: 'MIGRATION.md',
    diffFile: 'diff.json',
  },

  // Changelog formatting
  changelog: {
    template: 'default',              // or path to custom template
    includeMigrationLinks: true,
    emojiStyle: 'github',             // github | none
  },

  // Migration guide settings
  migration: {
    includeCodeExamples: true,
    languages: ['json', 'typescript'],
    includeAffectedTools: true,
  },

  // Git settings
  git: {
    tagPattern: '^v\\d+\\.\\d+\\.\\d+$',  // Semver tag filter
  },

  // GitHub Action settings
  ci: {
    commentOnPR: true,
    failOnBreaking: false,
    statusCheckName: 'schema-changelog',
  },
};
```

## Type System

mcp-changelog reuses types from mcp-schema-evolution and adds its own:

```typescript
// Shared from mcp-schema-evolution
import type { Tool, ToolSnapshot, SchemaChange, ChangeCategory, ChangeType, ChangeSeverity } from '@mcp-schema-evolution/core';

// Changelog-specific types
type OutputFormat = 'markdown' | 'json';

interface ChangelogEntry {
  version: string;
  date: Date;
  changes: SchemaChange[];
  breaking: boolean;
  migrationRequired: boolean;
}

interface DiffResult {
  from: GitRef;
  to: GitRef;
  changes: SchemaChange[];
  schemas: {
    old: ToolSnapshot;
    new: ToolSnapshot;
  };
  summary: DiffSummary;
}

interface DiffSummary {
  total: number;
  breaking: number;
  nonBreaking: number;
  patch: number;
  suggestedBump: 'major' | 'minor' | 'patch';
}
```

## Performance Considerations

- **Git operations** are the primary bottleneck — minimize `git show` / `git cat-file` calls
- **Schema parsing** is cached within a single run
- **Large schemas** (>1000 fields) use streaming JSON parsing
- **Targets**: Full diff + output generation < 2 seconds for typical MCP schemas

## Security Considerations

- Schema files are read as data only — no `eval()` or code execution
- Git operations use the local git binary (no shell injection via ref names)
- GitHub Action runs with minimal permissions (read repo contents, write PR comments)
- No external network calls except GitHub API (Octokit) in Action mode

## Testing Strategy

- **Unit tests**: Git resolution, schema parsing, change classification, output formatting
- **Integration tests**: Full pipeline with fixture git repos
- **Snapshot tests**: Changelog and migration guide output consistency
- **Fixture repos**: Test repos with known schema changes for end-to-end validation

## Package Structure

```
mcp-changelog/
├── src/
│   ├── git/              # Git integration
│   ├── discovery/        # Schema file discovery
│   ├── detector/         # Change detection (thin wrapper over mcp-schema-evolution)
│   ├── changelog/        # Markdown changelog generation
│   ├── migration/        # Migration guide generation
│   ├── diff/             # JSON diff output
│   ├── cli/              # CLI commands
│   ├── action/           # GitHub Action entry point
│   ├── config/           # Configuration loading
│   ├── types/            # Shared types
│   └── index.ts          # Public API
├── action/               # GitHub Action distribution (compiled)
├── bin/                  # CLI entry point
├── skills/               # Agent skill specifications (files named SKILL.md)
└── scripts/              # Build utilities (sync-version, finalize-bundle)
```

## Distribution

- **NPM**: `@reaatech/mcp-changelog` (main package)
- **GitHub Action**: `reaatech/mcp-changelog` (uses `action/` directory from NPM package)
- **CLI**: `npx @reaatech/mcp-changelog generate v1.0.0..v2.0.0`

> **Note**: Library usage via `import { diffRange } from '@reaatech/mcp-changelog'` is planned for a future release. In v0.1.0, only the CLI and GitHub Action are supported. The barrel exports in `src/index.ts` are commented out until the library build pipeline is complete.
