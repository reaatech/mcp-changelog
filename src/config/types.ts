import { z } from 'zod';

export const configSchema = z.object({
  schema: z
    .object({
      paths: z.array(z.string()).optional(),
      exclude: z.array(z.string()).optional(),
    })
    .optional(),
  output: z
    .object({
      dir: z.string().optional(),
      formats: z.array(z.enum(['markdown', 'json'])).optional(),
      changelogFile: z.string().optional(),
      migrationFile: z.string().optional(),
      diffFile: z.string().optional(),
    })
    .optional(),
  changelog: z
    .object({
      template: z.string().optional(),
      includeMigrationLinks: z.boolean().optional(),
      emojiStyle: z.enum(['github', 'none']).optional(),
    })
    .optional(),
  migration: z
    .object({
      includeCodeExamples: z.boolean().optional(),
      languages: z.array(z.string()).optional(),
    })
    .optional(),
  git: z
    .object({
      tagPattern: z.string().optional(),
    })
    .optional(),
  ci: z
    .object({
      commentOnPR: z.boolean().optional(),
      failOnBreaking: z.boolean().optional(),
    })
    .optional(),
});

export type Config = z.infer<typeof configSchema>;
