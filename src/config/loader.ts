import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { resolve, join } from 'path';
import { pathToFileURL } from 'url';
import { configSchema, type Config } from './types.js';
import { defaultConfig } from './defaults.js';
import type { SchemaLocatorConfig } from '../discovery/types.js';

/**
 * Translate the user-facing `config.schema` shape (`paths`, `exclude`) into
 * the internal SchemaLocatorConfig shape (`patterns`, `exclude`) consumed by
 * the discovery layer.
 */
export function toLocatorConfig(
  schema: Config['schema'],
): Partial<SchemaLocatorConfig> | undefined {
  if (!schema) return undefined;
  const out: Partial<SchemaLocatorConfig> = {};
  if (schema.paths) out.patterns = schema.paths;
  if (schema.exclude) out.exclude = schema.exclude;
  return out;
}

export class ConfigNotFoundError extends Error {
  constructor(searchPaths: string[]) {
    super(`Config file not found. Searched: ${searchPaths.join(', ')}`);
    this.name = 'ConfigNotFoundError';
  }
}

export class ConfigValidationError extends Error {
  constructor(errors: string) {
    super(`Config validation failed: ${errors}`);
    this.name = 'ConfigValidationError';
  }
}

/**
 * Load and validate configuration from file, merging with defaults and overrides.
 */
export async function loadConfig(
  configPath?: string,
  overrides?: Partial<Config>,
  cwd: string = process.cwd(),
): Promise<Config> {
  const fileConfig = configPath
    ? await loadConfigFile(configPath, cwd)
    : await discoverConfigFile(cwd);

  const merged = mergeConfig(defaultConfig, fileConfig ?? {}, overrides ?? {});

  const result = configSchema.safeParse(merged);
  if (!result.success) {
    throw new ConfigValidationError(result.error.message);
  }

  return result.data;
}

async function discoverConfigFile(cwd: string): Promise<Partial<Config> | undefined> {
  const searchPaths = [
    join(cwd, 'mcp-changelog.config.js'),
    join(cwd, 'mcp-changelog.config.mjs'),
    join(cwd, 'mcp-changelog.config.json'),
  ];

  for (const path of searchPaths) {
    if (existsSync(path)) {
      return loadConfigFile(path, cwd);
    }
  }

  // Check package.json for "mcp-changelog" key
  const packageJsonPath = join(cwd, 'package.json');
  if (existsSync(packageJsonPath)) {
    try {
      const content = await readFile(packageJsonPath, 'utf-8');
      const pkg = JSON.parse(content) as Record<string, unknown>;
      if (pkg['mcp-changelog'] && typeof pkg['mcp-changelog'] === 'object') {
        return pkg['mcp-changelog'] as Partial<Config>;
      }
    } catch {
      // ignore
    }
  }

  return undefined;
}

async function loadConfigFile(path: string, cwd: string = process.cwd()): Promise<Partial<Config>> {
  const absolutePath = resolve(cwd, path);

  if (!existsSync(absolutePath)) {
    throw new ConfigNotFoundError([path]);
  }

  if (path.endsWith('.json')) {
    const content = await readFile(absolutePath, 'utf-8');
    return JSON.parse(content) as Partial<Config>;
  }

  if (path.endsWith('.js') || path.endsWith('.mjs') || path.endsWith('.cjs')) {
    // Cache-busting query so tests can reload after edits.
    const module = await import(`${pathToFileURL(absolutePath).href}?t=${Date.now()}`);
    const exported = module.default ?? module;

    if (typeof exported === 'function') {
      return exported() as Partial<Config>;
    }

    return exported as Partial<Config>;
  }

  throw new ConfigValidationError(
    `Unsupported config file extension: ${path}. Use .js, .mjs, .cjs, or .json.`,
  );
}

function mergeConfig(base: Config, file: Partial<Config>, overrides: Partial<Config>): Config {
  return deepMerge(base, deepMerge(file, overrides));
}

function deepMerge(target: Record<string, unknown>, source: Record<string, unknown>): Config {
  const result: Record<string, unknown> = { ...target };

  for (const key of Object.keys(source)) {
    const sourceValue = source[key];
    const targetValue = result[key];

    if (
      typeof sourceValue === 'object' &&
      sourceValue !== null &&
      !Array.isArray(sourceValue) &&
      typeof targetValue === 'object' &&
      targetValue !== null &&
      !Array.isArray(targetValue)
    ) {
      result[key] = deepMerge(
        targetValue as Record<string, unknown>,
        sourceValue as Record<string, unknown>,
      );
    } else if (sourceValue !== undefined) {
      result[key] = sourceValue;
    }
  }

  return result as Config;
}
