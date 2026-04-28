# Contributing to MCP Changelog

Thank you for your interest in contributing to mcp-changelog! This document provides guidelines and instructions for contributing to the project.

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 9+
- Git

### Setting Up the Development Environment

```bash
# Clone the repository
git clone https://github.com/reaatech/mcp-changelog.git
cd mcp-changelog

# Install dependencies
pnpm install

# Build the project
pnpm run build

# Run tests
pnpm run test

# Run tests with coverage
pnpm run test:coverage

# Lint and format
pnpm run lint
pnpm run format
```

## Development Workflow

### Branch Strategy

We use **trunk-based development**:
- `main` — stable release branch
- `feature/*` — new features (short-lived branches off `main`)
- `fix/*` — bug fixes
- `chore/*` — maintenance tasks
- Rebase onto `main` before merging; no long-lived `develop` branch

### Creating a Pull Request

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Make your changes
4. Write or update tests
5. Run the test suite (`pnpm run test`)
6. Run the linter (`pnpm run lint`)
7. Commit your changes using [Conventional Commits](https://www.conventionalcommits.org/)
8. Push to your fork
9. Open a Pull Request

### Commit Message Format

This project follows the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

**Types:**
- `feat` — New feature
- `fix` — Bug fix
- `docs` — Documentation changes
- `style` — Code style changes (formatting, semicolons, etc.)
- `refactor` — Code refactoring
- `perf` — Performance improvement
- `test` — Adding or updating tests
- `chore` — Maintenance tasks

**Examples:**
```
feat(cli): add --verbose flag to generate command
fix(detector): handle nested field renames correctly
docs: update architecture diagram
refactor(git): extract TreeReader class
test: add integration tests for full pipeline
```

## Coding Standards

### TypeScript

- Strict mode enabled (`"strict": true` in tsconfig.json)
- No `any` types in public API
- Use descriptive type names
- Prefer interfaces for public types, types for unions

### Code Style

- Use `const` over `let`, never `var`
- Use template literals for string interpolation
- Use functional composition over classes where possible
- Export only public API from module index files
- Add JSDoc comments for public functions

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

### Testing

- Unit tests for all modules (>85% minimum, >90% for core engine)
- Integration tests for full pipeline
- Snapshot tests for output consistency
- Test error paths, not just happy paths
- Coverage enforced in CI via Vitest with thresholds

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

## Project Structure

```
mcp-changelog/
├── src/
│   ├── git/              # Git integration
│   ├── discovery/        # Schema file discovery
│   ├── detector/         # Change detection (wrapper over @mcp-schema-evolution/core)
│   ├── changelog/        # Markdown changelog generation
│   ├── migration/        # Migration guide generation
│   ├── diff/             # JSON diff output
│   ├── cli/              # CLI commands
│   ├── action/           # GitHub Action entry point
│   ├── config/           # Configuration loading
│   ├── types/            # Shared types
│   └── index.ts          # Public API
├── action/               # GitHub Action distribution
├── bin/                  # CLI entry point
├── templates/            # Default templates
├── __fixtures__/         # Test fixtures
├── skills/               # Agent skill specifications (files named SKILL.md)
├── AGENTS.md             # AI agent guidelines
├── ARCHITECTURE.md       # System architecture
├── DEV_PLAN.md           # Development plan
├── CONTRIBUTING.md       # This file
└── action.yml            # GitHub Action metadata
```

## Types of Contributions

### Bug Fixes

Bug fixes are always welcome! Please:
1. Check existing issues for duplicates
2. Include a test that reproduces the bug
3. Reference the issue number in your PR

### New Features

Before starting work on a new feature:
1. Open an issue to discuss the feature
2. Wait for maintainer approval
3. Follow the development workflow above

### Documentation

Documentation improvements are greatly appreciated:
- Fix typos or unclear explanations
- Add examples for complex features
- Improve API documentation
- Add troubleshooting guides

### Performance Improvements

Performance improvements are welcome but should:
1. Include benchmarks showing the improvement
2. Not sacrifice code clarity for micro-optimizations
3. Include tests to prevent regressions

## Reporting Issues

### Bug Reports

When reporting a bug, please include:
- **Description**: Clear description of the bug
- **Steps to reproduce**: Exact steps to reproduce the issue
- **Expected behavior**: What should happen
- **Actual behavior**: What actually happens
- **Environment**: Node.js version, OS, pnpm version
- **Sample code**: Minimal code that reproduces the issue

### Feature Requests

When requesting a feature, please include:
- **Use case**: Why this feature is needed
- **Proposed solution**: How you would implement it
- **Alternatives considered**: Other approaches you've thought about

## Code Review Process

All PRs require approval from at least one maintainer. Reviewers will check:

- [ ] TypeScript strict mode compliance (no `any`)
- [ ] Unit tests for new functionality
- [ ] Integration tests for pipeline changes
- [ ] Error handling for edge cases
- [ ] Descriptive variable and function names
- [ ] JSDoc comments for public API
- [ ] Consistent code formatting (Prettier)
- [ ] No ESLint warnings
- [ ] Commit message follows conventions

## Releasing

We use **changesets** for release management:

```bash
# Add a changeset for your PR
pnpm changeset

# Version packages and update changelogs
pnpm version-packages
```

Releases follow semantic versioning:
- **Patch** (1.0.0 → 1.0.1): Bug fixes only
- **Minor** (1.0.0 → 1.1.0): New features, backward compatible
- **Major** (1.0.0 → 2.0.0): Breaking changes

## License

By contributing to mcp-changelog, you agree that your contributions will be licensed under the [MIT License](LICENSE).

## Questions?

If you have questions, please:
- Open a [GitHub Discussion](https://github.com/reaatech/mcp-changelog/discussions)
- Check the [documentation](https://github.com/reaatech/mcp-changelog#readme)
- Review the [ARCHITECTURE.md](ARCHITECTURE.md) and [DEV_PLAN.md](DEV_PLAN.md)

Thank you for contributing! 🎉
