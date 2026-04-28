# mcp-changelog

> Automated changelog and migration guide generator for MCP servers.

[![npm version](https://img.shields.io/npm/v/mcp-changelog.svg)](https://www.npmjs.com/package/mcp-changelog)
[![CI](https://github.com/reaatech/mcp-changelog/actions/workflows/ci.yml/badge.svg)](https://github.com/reaatech/mcp-changelog/actions)

**mcp-changelog** watches your MCP server's tool schemas across git tags and commits, detects changes (additions, removals, breaking changes, field renames, type changes, and more), and generates:

- **Changelog** (Markdown) — Human-readable, keeps the [Keep a Changelog](https://keepachangelog.com/) style
- **Migration guide** (Markdown) — Step-by-step instructions with before/after examples
- **JSON diff** — Machine-readable output for downstream tooling

Works as a CLI and as a **GitHub Action** that posts an auto-updating comment on PRs.

Pairs with [**mcp-schema-evolution**](https://github.com/reaatech/mcp-schema-evolution) — that project *prevents* breaking changes; this one *documents* them.

---

## Installation

```bash
npm install -g mcp-changelog

# Or run ad-hoc via npx
npx mcp-changelog generate v1.2.0..v1.3.0
```

**Requirements:** Node.js 20+, pnpm 9+ (for development).

---

## Quick Start

```bash
# Generate a full changelog between two git tags
mcp-changelog generate v1.0.0..v2.0.0

# Write output to a specific directory
mcp-changelog generate v1.0.0..v2.0.0 --output-dir ./docs/changelog

# Generate JSON diff only
mcp-changelog generate v1.0.0..v2.0.0 --format json

# Inspect a schema at a specific tag to verify its structure
mcp-changelog inspect schema.json --ref v2.0.0

# Show a diff summary in the terminal (no files written)
mcp-changelog diff v1.0.0..v2.0.0

# List all version tags
mcp-changelog list-tags
```

---

## CLI Reference

### `generate <range>`

Run the full pipeline and write output files.

```
mcp-changelog generate v1.0.0..v2.0.0 [options]
```

| Option | Description | Default |
|---|---|---|
| `-s, --schema-path <path>` | Path to schema file (auto-detected if omitted) | — |
| `-o, --output-dir <dir>` | Directory for output files | `./` |
| `-f, --format <format>` | Output format: `markdown`, `json`, or `all` | `all` |
| `-c, --config <path>` | Path to config file | — |
| `-v, --verbose` | Enable verbose logging | `false` |

Generates `CHANGELOG.md`, `MIGRATION.md`, and `diff.json` by default.

### `diff <range>`

Show a summary of changes without writing files.

```
mcp-changelog diff v1.0.0..v2.0.0 [options]
```

| Option | Description | Default |
|---|---|---|
| `-s, --schema-path <path>` | Path to schema file | — |
| `-f, --format <format>` | Output format: `text` or `json` | `text` |
| `-c, --config <path>` | Path to config file | — |

### `inspect <schema>`

Parse and display a schema file, optionally at a specific git ref.

```
mcp-changelog inspect schema.json [options]
```

| Option | Description | Default |
|---|---|---|
| `-r, --ref <ref>` | Git ref to read from | — |

### `list-tags`

List all git tags, optionally filtered by a regex pattern.

```
mcp-changelog list-tags [options]
```

| Option | Description | Default |
|---|---|---|
| `-p, --pattern <pattern>` | Regex pattern to filter tags | — |

---

## GitHub Action

Add a workflow at `.github/workflows/schema-changelog.yml`:

```yaml
name: Schema Changelog

on:
  pull_request:
    branches: [main]

jobs:
  changelog:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pull-requests: write

    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - uses: reaatech/mcp-changelog@v1
        with:
          comment-on-pr: true
          fail-on-breaking: false
```

### Action Inputs

| Input | Description | Default |
|---|---|---|
| `schema-path` | Path to schema file (auto-detected if omitted) | — |
| `base-ref` | Base git ref for comparison | Auto |
| `head-ref` | Head git ref for comparison | Auto |
| `comment-on-pr` | Post or update a comment on the PR | `true` |
| `fail-on-breaking` | Fail the workflow if breaking changes are detected | `false` |
| `output-dir` | Directory for output files | — |
| `format` | Output format: `markdown`, `json`, or `all` | `all` |
| `config` | Path to config file | — |
| `github-token` | Token for posting PR comments | `${{ github.token }}` |

### Action Outputs

| Output | Description |
|---|---|
| `has-breaking` | Whether breaking changes were detected (`true` / `false`) |
| `suggested-bump` | Suggested version bump (`major`, `minor`, `patch`) |

The PR comment is updated on each push (no duplicate comments). It includes a summary table of changes and a suggested version bump.

---

## Configuration

Create `mcp-changelog.config.{js,mjs,cjs,json}` in your repo root, or add a `"mcp-changelog"` key in `package.json`. Configuration is discovered automatically; explicit path via `--config` / the `config` action input overrides it.

```js
// mcp-changelog.config.js
export default {
  schema: {
    paths: ['schema.json'],          // Auto-detected if omitted
    exclude: ['node_modules/**',
              'dist/**',
              '.git/**',
              'coverage/**'],
  },

  output: {
    dir: './changelog',
    formats: ['markdown', 'json'],
    changelogFile: 'CHANGELOG.md',
    migrationFile: 'MIGRATION.md',
    diffFile: 'diff.json',
  },

  changelog: {
    template: 'default',
    includeMigrationLinks: true,
    emojiStyle: 'github',           // 'github' | 'none'
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

All keys are optional. Omitted values fall back to the defaults shown above. CLI flags and action inputs take precedence over config values.

### Config File Discovery Order

1. Explicit path (`--config` / `config` input)
2. `mcp-changelog.config.{js,mjs,cjs,json}` in repo root
3. `"mcp-changelog"` key in `package.json`

---

## How It Works

```
 User runs:  mcp-changelog generate v1.0.0..v2.0.0
                                    │
   ┌────────────────────────────────┼──────────────────────────────┐
   │  Git Integration               │                              │
   │  • resolveRef() resolves each tag to a commit SHA              │
   │  • parseRange() splits & resolves both ends in parallel       │
   └────────────────────────────────┼──────────────────────────────┘
                                    │
   ┌────────────────────────────────┼──────────────────────────────┐
   │  Schema Discovery              │                              │
   │  • locateSchemas() finds schema files via glob patterns        │
   │  • parseSchema() parses JSON and validates with Zod            │
   │  • Both refs are discovered in parallel                       │
   └────────────────────────────────┼──────────────────────────────┘
                                    │
   ┌────────────────────────────────┼──────────────────────────────┐
   │  Change Detection              │                              │
   │  • detectChanges() wraps @mcp-schema-evolution/core            │
   │  • detectMultiSchema() handles repos with multiple schemas     │
   │  • Detects: tool_added, field_renamed, type_changed, etc.     │
   └────────────────────────────────┼──────────────────────────────┘
                                    │
   ┌────────────────────────────────┼──────────────────────────────┐
   │  Output Generation (parallel)  │                              │
   │  • generateChangelog() → CHANGELOG.md                         │
   │  • generateMigrationGuide() → MIGRATION.md                    │
   │  • generateJsonDiff() → diff.json                             │
   └────────────────────────────────┴──────────────────────────────┘
```

**Change categories detected:** `tool_added`, `tool_removed`, `field_added`, `field_removed`, `field_renamed`, `type_changed`, `required_changed`, `default_changed`, `constraint_changed`, and `deprecated`.

---

## Documentation

| Document | Description |
|---|---|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | System design, module specs, data flow |
| [DEV_PLAN.md](./DEV_PLAN.md) | Development roadmap and milestones |
| [CONTRIBUTING.md](./CONTRIBUTING.md) | Contribution guidelines and coding standards |
| [AGENTS.md](./AGENTS.md) | Guidelines for AI agents working on this codebase |

---

## Related Projects

- [**mcp-schema-evolution**](https://github.com/reaatech/mcp-schema-evolution) — Prevent breaking changes, generate backward-compatible wrappers, and validate schemas in CI.

---

## License

MIT © [reaatech](https://github.com/reaatech)
