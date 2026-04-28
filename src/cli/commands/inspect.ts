import { readFile } from 'fs/promises';
import { resolveRef } from '../../git/resolve.js';
import { readFileAtRef } from '../../git/read.js';
import { parseSchema } from '../../discovery/parse.js';
import { handleError } from '../error-handler.js';

export interface InspectOptions {
  ref?: string;
}

export async function inspect(schemaPath: string, options: InspectOptions): Promise<void> {
  try {
    const content = options.ref
      ? await readFileAtRef(await resolveRef(options.ref), schemaPath)
      : await readFile(schemaPath, 'utf-8');

    const schema = parseSchema(content, schemaPath);
    console.log(JSON.stringify(schema, null, 2));
  } catch (error) {
    handleError(error instanceof Error ? error : new Error(String(error)));
  }
}
