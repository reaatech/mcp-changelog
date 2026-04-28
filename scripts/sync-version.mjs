// Write src/cli/version.ts from the version field in package.json so the
// CLI's --version output stays in sync without requiring a runtime read of
// package.json (which makes bundlers conservatively copy dependency trees).
import { readFileSync, writeFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const target = 'src/cli/version.ts';
const next = `// This file is regenerated from package.json by \`pnpm syncversion\`.\n// Keep this fallback in sync with the version field in package.json.\nexport const VERSION = ${JSON.stringify(pkg.version)};\n`;

let current = '';
try {
  current = readFileSync(target, 'utf8');
} catch {
  /* empty */
}

if (current !== next) {
  writeFileSync(target, next);
}
