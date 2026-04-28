import { listTags as gitListTags } from '../../git/tags.js';
import { handleError } from '../error-handler.js';

export interface ListTagsOptions {
  pattern?: string;
}

export async function listTags(options: ListTagsOptions): Promise<void> {
  try {
    const tags = await gitListTags(process.cwd(), options.pattern);
    for (const tag of tags) {
      console.log(tag.name);
    }
  } catch (error) {
    handleError(error instanceof Error ? error : new Error(String(error)));
  }
}
