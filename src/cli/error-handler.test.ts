import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { handleError } from './error-handler.js';

describe('handleError', () => {
  let exitSpy: ReturnType<typeof vi.spyOn>;
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    exitSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it('should handle GitRefNotFoundError with hint', () => {
    const error = new Error('Git reference "v99" not found');
    error.name = 'GitRefNotFoundError';
    handleError(error);
    expect(errorSpy).toHaveBeenCalledWith('Error: Git reference "v99" not found');
    expect(errorSpy).toHaveBeenCalledWith('Hint: Run "mcp-changelog list-tags" to see available tags.');
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('should handle InvalidRangeError with hint', () => {
    const error = new Error('Invalid range');
    error.name = 'InvalidRangeError';
    handleError(error);
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('Invalid range'));
    expect(errorSpy).toHaveBeenCalledWith('Hint: Use format "from..to", e.g. "v1.0.0..v2.0.0"');
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('should handle GitFileNotFoundError', () => {
    const error = new Error('File not found');
    error.name = 'GitFileNotFoundError';
    handleError(error);
    expect(errorSpy).toHaveBeenCalledWith('Error: File not found');
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('should handle SchemaNotFoundError with hint', () => {
    const error = new Error('No schema found');
    error.name = 'SchemaNotFoundError';
    handleError(error);
    expect(errorSpy).toHaveBeenCalledWith('Error: No schema found');
    expect(errorSpy).toHaveBeenCalledWith('Hint: Use --schema-path to specify the schema location.');
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('should handle SchemaParseError with hint', () => {
    const error = new Error('Parse failed');
    error.name = 'SchemaParseError';
    handleError(error);
    expect(errorSpy).toHaveBeenCalledWith('Error: Parse failed');
    expect(errorSpy).toHaveBeenCalledWith('Hint: Check that the file is valid JSON.');
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('should handle ConfigNotFoundError', () => {
    const error = new Error('Config not found');
    error.name = 'ConfigNotFoundError';
    handleError(error);
    expect(errorSpy).toHaveBeenCalledWith('Error: Config not found');
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('should handle ConfigValidationError', () => {
    const error = new Error('Config invalid');
    error.name = 'ConfigValidationError';
    handleError(error);
    expect(errorSpy).toHaveBeenCalledWith('Error: Config invalid');
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('should handle generic errors', () => {
    const error = new Error('Something went wrong');
    handleError(error);
    expect(errorSpy).toHaveBeenCalledWith('Error: Something went wrong');
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('should show stack trace for generic errors when DEBUG is set', () => {
    const originalDebug = process.env.DEBUG;
    process.env.DEBUG = '1';
    const error = new Error('Something went wrong');
    handleError(error);
    expect(errorSpy).toHaveBeenCalledWith(error.stack);
    process.env.DEBUG = originalDebug;
  });
});
