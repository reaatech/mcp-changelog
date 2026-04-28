import { describe, it, expect } from 'vitest';
import { detectChanges, detectMultiSchema } from './detect.js';
import type { DiscoveredSchema } from '../discovery/types.js';
import type { Tool } from '../types/index.js';

function makeTool(name: string, properties: Record<string, unknown> = {}): Tool {
  return {
    name,
    inputSchema: {
      type: 'object',
      properties,
    },
  };
}

function makeDiscoveredSchema(path: string, tools: Tool[]): DiscoveredSchema {
  return {
    path,
    ref: { type: 'tag', name: 'v1.0.0', sha: 'abc123' },
    schema: tools,
  };
}

describe('detectChanges', () => {
  it('should return empty array for identical schemas', () => {
    const tools = [makeTool('getUser')];
    const changes = detectChanges(tools, tools);
    expect(changes).toHaveLength(0);
  });

  it('should detect added tool as non-breaking', () => {
    const oldTools = [makeTool('getUser')];
    const newTools = [makeTool('getUser'), makeTool('createUser')];
    const changes = detectChanges(oldTools, newTools);
    expect(changes).toHaveLength(1);
    expect(changes[0].type).toBe('non-breaking');
    expect(changes[0].category).toBe('tool_added');
    expect(changes[0].toolName).toBe('createUser');
  });

  it('should detect removed tool as breaking', () => {
    const oldTools = [makeTool('getUser'), makeTool('createUser')];
    const newTools = [makeTool('getUser')];
    const changes = detectChanges(oldTools, newTools);
    expect(changes).toHaveLength(1);
    expect(changes[0].type).toBe('breaking');
    expect(changes[0].category).toBe('tool_removed');
    expect(changes[0].toolName).toBe('createUser');
  });

  it('should detect field rename as breaking', () => {
    const oldTools = [
      makeTool('createUser', { name: { type: 'string' } }),
    ];
    const newTools = [
      makeTool('createUser', { full_name: { type: 'string' } }),
    ];
    const changes = detectChanges(oldTools, newTools);
    const renameChange = changes.find((c) => c.category === 'field_renamed');
    expect(renameChange).toBeDefined();
    expect(renameChange!.type).toBe('breaking');
    expect(renameChange!.toolName).toBe('createUser');
  });

  it('should detect added optional field as non-breaking', () => {
    const oldTools = [makeTool('createUser', { name: { type: 'string' } })];
    const newTools = [
      makeTool('createUser', {
        name: { type: 'string' },
        email: { type: 'string' },
      }),
    ];
    const changes = detectChanges(oldTools, newTools);
    const addedField = changes.find((c) => c.category === 'field_added');
    expect(addedField).toBeDefined();
    expect(addedField!.type).toBe('non-breaking');
  });
});

describe('detectMultiSchema', () => {
  it('should diff matched schemas and prefix paths', () => {
    const oldSchemas = [
      makeDiscoveredSchema('schema.json', [makeTool('getUser')]),
    ];
    const newSchemas = [
      makeDiscoveredSchema('schema.json', [
        makeTool('getUser'),
        makeTool('createUser'),
      ]),
    ];

    const changes = detectMultiSchema(oldSchemas, newSchemas);
    expect(changes).toHaveLength(1);
    expect(changes[0].category).toBe('tool_added');
    expect(changes[0].path).toMatch(/^schema\.json:/);
  });

  it('should detect added schema files', () => {
    const oldSchemas = [
      makeDiscoveredSchema('schema.json', [makeTool('getUser')]),
    ];
    const newSchemas = [
      makeDiscoveredSchema('schema.json', [makeTool('getUser')]),
      makeDiscoveredSchema('extra.json', [makeTool('extraTool')]),
    ];

    const changes = detectMultiSchema(oldSchemas, newSchemas);
    const addedFile = changes.find((c) => c.path.includes('extra.json → added'));
    expect(addedFile).toBeDefined();
    expect(addedFile!.category).toBe('tool_added');
  });

  it('should detect removed schema files', () => {
    const oldSchemas = [
      makeDiscoveredSchema('schema.json', [makeTool('getUser')]),
      makeDiscoveredSchema('legacy.json', [makeTool('legacyTool')]),
    ];
    const newSchemas = [
      makeDiscoveredSchema('schema.json', [makeTool('getUser')]),
    ];

    const changes = detectMultiSchema(oldSchemas, newSchemas);
    const removedFile = changes.find((c) => c.path.includes('legacy.json → removed'));
    expect(removedFile).toBeDefined();
    expect(removedFile!.category).toBe('tool_removed');
    expect(removedFile!.type).toBe('breaking');
  });

  it('should handle multiple schema diffs in parallel', () => {
    const oldSchemas = [
      makeDiscoveredSchema('packages/auth/schema.json', [makeTool('login')]),
      makeDiscoveredSchema('packages/users/schema.json', [makeTool('getUser')]),
    ];
    const newSchemas = [
      makeDiscoveredSchema('packages/auth/schema.json', [
        makeTool('login'),
        makeTool('logout'),
      ]),
      makeDiscoveredSchema('packages/users/schema.json', [makeTool('getUser')]),
    ];

    const changes = detectMultiSchema(oldSchemas, newSchemas);
    expect(changes).toHaveLength(1);
    expect(changes[0].path).toMatch(/^packages\/auth\/schema\.json:/);
  });
});
