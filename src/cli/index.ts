#!/usr/bin/env node
import { Command } from 'commander';
import { generate } from './commands/generate.js';
import { diff } from './commands/diff.js';
import { inspect } from './commands/inspect.js';
import { listTags } from './commands/list-tags.js';
import { VERSION as version } from './version.js';

const program = new Command();

program
  .name('mcp-changelog')
  .description('Automated changelog generator for MCP servers')
  .version(version);

program
  .command('generate <range>')
  .description('Generate changelog for git range (e.g. v1.0.0..v2.0.0)')
  .option('-s, --schema-path <path>', 'Path to schema file (default: auto-detect)')
  .option('-o, --output-dir <dir>', 'Output directory', './')
  .option('-f, --format <format>', 'Output format (markdown, json, all)', 'all')
  .option('-c, --config <path>', 'Path to config file')
  .option('-v, --verbose', 'Enable verbose logging', false)
  .action(generate);

program
  .command('diff <range>')
  .description('Show raw diff without generating output')
  .option('-s, --schema-path <path>', 'Path to schema file (default: auto-detect)')
  .option('-f, --format <format>', 'Output format (text, json)', 'text')
  .option('-c, --config <path>', 'Path to config file')
  .action(diff);

program
  .command('inspect <schema>')
  .description('Parse and display a schema file at a git ref')
  .option('-r, --ref <ref>', 'Git ref to inspect')
  .action(inspect);

program
  .command('list-tags')
  .description('List all version tags')
  .option('-p, --pattern <pattern>', 'Filter by regex pattern')
  .action(listTags);

program.parse(process.argv);
