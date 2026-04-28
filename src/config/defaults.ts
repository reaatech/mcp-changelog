import type { Config } from './types.js';

export const defaultConfig: Config = {
  schema: {
    exclude: ['node_modules/**', 'dist/**', '.git/**', 'coverage/**'],
  },
  output: {
    dir: './',
    formats: ['markdown', 'json'],
    changelogFile: 'CHANGELOG.md',
    migrationFile: 'MIGRATION.md',
    diffFile: 'diff.json',
  },
  changelog: {
    template: 'default',
    includeMigrationLinks: true,
    emojiStyle: 'github',
  },
  migration: {
    includeCodeExamples: true,
    languages: ['json'],
  },
  git: {
    tagPattern: '^v\\d+\\.\\d+\\.\\d+$',
  },
  ci: {
    commentOnPR: true,
    failOnBreaking: false,
  },
};
