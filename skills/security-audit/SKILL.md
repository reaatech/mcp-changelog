# Security Audit Skill

## Purpose

The security-audit skill provides guidelines for ensuring mcp-changelog is secure against common vulnerabilities including code injection, path traversal, supply chain attacks, and data exposure.

## Capabilities

### 1. Input Validation
- Validate all git refs before use
- Sanitize schema file content
- Validate configuration files
- Prevent path traversal attacks

### 2. Secure Git Operations
- Prevent command injection via ref names
- Validate git repository paths
- Handle malicious git hooks
- Secure handling of remote repositories

### 3. Supply Chain Security
- Verify dependency integrity
- Use lockfile for reproducible builds
- Audit dependencies for vulnerabilities
- Secure GitHub Action distribution

## Usage Examples

### Input Validation

```typescript
import { z } from 'zod';

// Validate git ref format
const gitRefSchema = z.string()
  .min(1, 'Ref cannot be empty')
  .max(255, 'Ref too long')
  .regex(/^[a-zA-Z0-9_./-]+$/, 'Invalid ref format')
  .refine(ref => !ref.includes('..') || ref.match(/^\w+\.\.\w+$/), {
    message: 'Invalid range format'
  });

function validateGitRef(input: string): string {
  return gitRefSchema.parse(input);
}

// Validate schema path
const pathSchema = z.string()
  .min(1)
  .max(500)
  .refine(path => !path.includes('..'), {
    message: 'Path traversal not allowed'
  })
  .refine(path => !path.startsWith('/'), {
    message: 'Absolute paths not allowed'
  });

function validateSchemaPath(input: string): string {
  return pathSchema.parse(input);
}
```

### Secure Git Operations

```typescript
// Good: Validate ref before passing to git
async function safeResolveRef(ref: string, repoPath: string): Promise<string> {
  // Validate format first
  const validated = validateGitRef(ref);

  // Use git's built-in validation
  try {
    const { stdout } = await execa('git', ['-C', repoPath, 'rev-parse', '--verify', validated]);
    return stdout.trim();
  } catch (error) {
    throw new GitRefNotFoundError(validated);
  }
}

// Bad: No validation
async function unsafeResolveRef(ref: string, repoPath: string): Promise<string> {
  const { stdout } = await execa('git', ['-C', repoPath, 'rev-parse', ref]);
  return stdout.trim();
}
```

### Secure File Reading

```typescript
import { realpath } from 'fs/promises';
import { join, normalize } from 'path';

async function safeReadFile(basePath: string, userPath: string): Promise<string> {
  // Resolve and validate path
  const resolved = normalize(join(basePath, userPath));
  const realBase = await realpath(basePath);
  const realResolved = await realpath(resolved);

  // Ensure resolved path is within base path
  if (!realResolved.startsWith(realBase + '/')) {
    throw new SecurityError('Path traversal detected');
  }

  return readFile(realResolved, 'utf-8');
}
```

### Configuration Validation

```typescript
import { z } from 'zod';

const configSchema = z.object({
  schema: z.object({
    paths: z.array(z.string().max(500)).max(20),
    exclude: z.array(z.string().max(500)).optional()
  }).optional(),
  output: z.object({
    dir: z.string().max(500).optional(),
    formats: z.array(z.enum(['markdown', 'json'])).optional()
  }).optional(),
  git: z.object({
    tagPattern: z.string().max(200).optional()
  }).optional()
}).strict();

function validateConfig(input: unknown) {
  try {
    return configSchema.parse(input);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new ConfigValidationError(error.errors);
    }
    throw error;
  }
}
```

## Security Checklist

### Input Validation
- [ ] All git refs validated before use
- [ ] Schema paths validated (no traversal)
- [ ] Configuration values validated
- [ ] File sizes limited
- [ ] JSON parsing uses safe methods

### Git Operations
- [ ] No shell injection via ref names
- [ ] Git binary path validated
- [ ] Repository paths validated
- [ ] Remote URLs validated

### File Operations
- [ ] Path traversal prevention
- [ ] Symlink attack prevention
- [ ] File size limits enforced
- [ ] Write permissions checked

### Supply Chain
- [ ] Dependencies pinned to specific versions
- [ ] Lockfile committed
- [ ] Dependencies audited regularly
- [ ] GitHub Action uses pinned version

### Data Handling
- [ ] Schema content treated as untrusted
- [ ] No eval() or Function() calls
- [ ] No code execution from schema data
- [ ] Sensitive data not logged

## Error Handling

```typescript
// Security-specific error classes
class SecurityError extends Error {
  constructor(message: string) {
    super(`Security violation: ${message}`);
    this.name = 'SecurityError';
  }
}

class PathTraversalError extends SecurityError {
  constructor(path: string) {
    super(`Path traversal attempt: ${path}`);
    this.name = 'PathTraversalError';
  }
}

class CommandInjectionError extends SecurityError {
  constructor(input: string) {
    super(`Potential command injection: ${input}`);
    this.name = 'CommandInjectionError';
  }
}

class ConfigValidationError extends SecurityError {
  constructor(errors: z.ZodError[]) {
    super(`Configuration validation failed: ${errors.map(e => e.message).join(', ')}`);
    this.name = 'ConfigValidationError';
  }
}
```

## GitHub Action Security

```yaml
# Good: Minimal permissions
permissions:
  contents: read
  pull-requests: write

# Bad: Overly permissive
permissions: write-all

# Good: Pin action version
- uses: reatech/mcp-changelog@v1.0.0

# Bad: Floating tag
- uses: reatech/mcp-changelog@v1

# Good: Validate inputs
inputs:
  schema-path:
    description: 'Path to schema file'
    required: false
  # Validate in code, not just YAML
```

## Dependency Security

```json
// package.json
{
  "dependencies": {
    "simple-git": "3.20.0",
    "commander": "11.1.0",
    "octokit": "3.1.2",
    "zod": "3.22.4"
  },
  "devDependencies": {
    "typescript": "5.3.3",
    "vitest": "1.1.0"
  },
  "overrides": {
    "inflight": "2.0.0"
  }
}
```

```bash
# Regular security audits
pnpm audit
npm audit
snyk test
```

## Best Practices

### 1. Treat Schema Content as Untrusted
```typescript
// Good: Schema data is just data
const schema = JSON.parse(content);
// Use schema.version, schema.tools as data only

// Bad: Execute schema content
eval(schema.transformCode); // NEVER
new Function(schema.code)(); // NEVER
```

### 2. Validate Before Processing
```typescript
// Good: Validate first
const ref = validateGitRef(userInput);
const result = await git.revParse(ref);

// Bad: Process then handle errors
try {
  const result = await git.revParse(userInput);
} catch (e) {
  // Too late - git already processed potentially malicious input
}
```

### 3. Use Safe APIs
```typescript
// Good: execa with argument array
await execa('git', ['show', `${ref}:${path}`]);

// Bad: Shell execution
await exec(`git show ${ref}:${path}`); // Shell injection risk
```

## Security Testing

```typescript
describe('Security', () => {
  it('should prevent path traversal', async () => {
    await expect(safeReadFile('/repo', '../../../etc/passwd'))
      .rejects.toThrow(PathTraversalError);
  });

  it('should reject malicious git refs', async () => {
    await expect(validateGitRef('$(rm -rf /)'))
      .rejects.toThrow();
  });

  it('should reject shell injection in refs', async () => {
    await expect(validateGitRef('v1.0.0; cat /etc/passwd'))
      .rejects.toThrow();
  });

  it('should validate configuration', async () => {
    await expect(validateConfig({ schema: { paths: ['../../../etc'] } }))
      .rejects.toThrow(ConfigValidationError);
  });

  it('should not execute schema content', async () => {
    const maliciousSchema = JSON.stringify({
      version: '1.0.0',
      tools: [],
      __proto__: { polluted: true }
    });

    const schema = JSON.parse(maliciousSchema);
    expect(({} as any).polluted).toBeUndefined();
  });
});
```

## Resources

- [ARCHITECTURE.md](../ARCHITECTURE.md) - System architecture
- [Security section](../ARCHITECTURE.md#security-considerations) - Architecture security spec
- [OWASP Top 10](https://owasp.org/www-project-top-ten/) - Security reference
- [GitHub Security Lab](https://securitylab.github.com/) - Security resources
