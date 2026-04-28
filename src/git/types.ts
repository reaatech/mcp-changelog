import type { GitRef, RefRange } from '../types/index.js';

export type { GitRef, RefRange };

export class GitRefNotFoundError extends Error {
  constructor(ref: string) {
    super(`Git reference "${ref}" not found`);
    this.name = 'GitRefNotFoundError';
  }
}

export class InvalidRangeError extends Error {
  constructor(range: string) {
    super(`Invalid git range: "${range}". Expected format: <from>..<to>`);
    this.name = 'InvalidRangeError';
  }
}

export class GitFileNotFoundError extends Error {
  constructor(ref: string, path: string, cause?: unknown) {
    let message = `File "${path}" not found at ref "${ref}"`;
    if (cause instanceof Error) {
      message += `: ${cause.message}`;
    }
    super(message, cause instanceof Error ? { cause } : undefined);
    this.name = 'GitFileNotFoundError';
  }
}
