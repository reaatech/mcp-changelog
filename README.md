# @reaatech/mcp-changelog

> Automated changelog and migration guide generator for MCP servers.

[![npm version](https://img.shields.io/npm/v/@reaatech/mcp-changelog.svg)](https://www.npmjs.com/package/@reaatech/mcp-changelog)
[![CI](https://github.com/reaatech/mcp-changelog/actions/workflows/ci.yml/badge.svg)](https://github.com/reaatech/mcp-changelog/actions)

**mcp-changelog** watches your MCP server's tool schemas across git commits/tags, detects additions, removals, breaking changes, and default value changes, and generates:

- 📋 A **human-readable changelog** (Markdown)
- 🧭 A **migration guide** for breaking changes with before/after examples
- 🤖 A **machine-readable diff** (JSON) that tooling can consume

Runs as a CLI (`mcp-changelog generate v1.2.0..v1.3.0`) and as a **GitHub Action** that comments on PRs with schema changes.

Pairs with [**mcp-schema-evolution**](https://github.com/reaatech/mcp-schema-evolution) — that one *prevents* breaking changes, this one *documents* them. Together they're the "schema governance" story for MCP.

---

## Installation

```bash
# Global CLI
npm install -g @reaatech/mcp-changelog

# Or use via npx
npx @reaatech/mcp-changelog generate v1.2.0..v1.3.0
```

## Quick Start

```bash
# Generate changelog between two git tags
mcp-changelog generate v1.2.0..v1.3.0

# Specify a custom schema path
mcp-changelog generate v1.2.0..v1.3.0 --schema-path api/schema.json

# Output JSON diff only
mcp-changelog generate v1.2.0..v1.3.0 --format json

# Inspect a schema at a specific ref
mcp-changelog inspect schema.json --ref v1.3.0
```

## GitHub Action

Add to `.github/workflows/schema-changelog.yml`:

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
```

The action will post a comment on your PR summarizing schema changes and suggesting a version bump.

## Configuration

Create `mcp-changelog.config.js` (or `.mjs` / `.cjs` / `.json`) in your repo root. A `mcp-changelog` key in `package.json` is also picked up automatically.

```js
export default {
  schema: {
    paths: ['schema.json'], // Auto-detected if omitted
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

## How It Works

1. **Git Integration** — Resolves git refs and extracts schema files at any commit/tag
2. **Schema Discovery** — Auto-detects `schema.json`, `mcp.json`, `tools.json`, or custom patterns
3. **Change Detection** — Uses [`@mcp-schema-evolution/core`](https://github.com/reaatech/mcp-schema-evolution) to diff `Tool[]` snapshots
4. **Output Generation** — Produces Markdown changelog, migration guide, and JSON diff in parallel

## Documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md) — System design and module specs
- [DEV_PLAN.md](./DEV_PLAN.md) — Development roadmap
- [CONTRIBUTING.md](./CONTRIBUTING.md) — Contribution guidelines
- [AGENTS.md](./AGENTS.md) — Guidelines for AI agents working on this codebase

## Related Projects

- [**mcp-schema-evolution**](https://github.com/reaatech/mcp-schema-evolution) — Prevent breaking changes, generate backward-compatible wrappers

## License

MIT © [reaatech](https://github.com/reaatech)
