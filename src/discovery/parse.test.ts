import { describe, it, expect } from 'vitest';
import { parseSchema } from './parse.js';
import { SchemaParseError } from './types.js';

describe('parseSchema', () => {
  it('should parse a valid Tool[] array', () => {
    const content = JSON.stringify([
      { name: 'getUser', inputSchema: { type: 'object', properties: {} } },
    ]);
    const result = parseSchema(content, 'schema.json');
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('getUser');
  });

  it('should parse an object with tools property', () => {
    const content = JSON.stringify({
      version: '1.0.0',
      tools: [{ name: 'getUser', inputSchema: { type: 'object', properties: {} } }],
    });
    const result = parseSchema(content, 'schema.json');
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('getUser');
  });

  it('should throw SchemaParseError for invalid JSON', () => {
    expect(() => parseSchema('{ invalid }', 'schema.json')).toThrow(SchemaParseError);
  });

  it('should throw SchemaParseError for non-array, non-object input', () => {
    expect(() => parseSchema('"just a string"', 'schema.json')).toThrow(SchemaParseError);
  });

  it('should throw SchemaParseError for object without tools property', () => {
    expect(() => parseSchema('{"version": "1.0.0"}', 'schema.json')).toThrow(SchemaParseError);
  });

  it('should throw SchemaParseError for array with malformed tool', () => {
    const content = JSON.stringify([{ description: 'no name field' }]);
    expect(() => parseSchema(content, 'schema.json')).toThrow(SchemaParseError);
  });

  it('should throw SchemaParseError for tools array with malformed entry', () => {
    const content = JSON.stringify({ tools: [{ name: 'x' }] });
    expect(() => parseSchema(content, 'schema.json')).toThrow(SchemaParseError);
  });
});
