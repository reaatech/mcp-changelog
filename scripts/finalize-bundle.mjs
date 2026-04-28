// Post-process an ncc bundle directory:
// - prune `.d.ts*` artifacts left behind when ncc reads tsconfig with declaration:true
// - prune empty directories
// - optionally rename `index.js` and prepend a shebang
//
// Usage:
//   node scripts/finalize-bundle.mjs <dir> [--rename old=new] [--shebang file]
import {
  readdirSync,
  rmSync,
  statSync,
  renameSync,
  readFileSync,
  writeFileSync,
  chmodSync,
} from 'node:fs';
import { join } from 'node:path';

const args = process.argv.slice(2);
const dir = args.shift();
if (!dir) {
  console.error('Usage: finalize-bundle.mjs <dir> [--rename old=new] [--shebang file]');
  process.exit(1);
}

let renameSpec;
let shebangFile;
while (args.length) {
  const flag = args.shift();
  if (flag === '--rename') {
    const [from, to] = args.shift().split('=');
    renameSpec = { from, to };
  } else if (flag === '--shebang') {
    shebangFile = args.shift();
  }
}

function prune(target) {
  for (const entry of readdirSync(target)) {
    const p = join(target, entry);
    const st = statSync(p);
    if (st.isDirectory()) {
      prune(p);
      if (readdirSync(p).length === 0) rmSync(p, { recursive: true, force: true });
    } else if (/\.d\.ts(\.map)?$/.test(entry)) {
      rmSync(p, { force: true });
    }
  }
}

prune(dir);

if (renameSpec) {
  renameSync(join(dir, renameSpec.from), join(dir, renameSpec.to));
}

if (shebangFile) {
  const target = join(dir, shebangFile);
  const content = readFileSync(target, 'utf8');
  if (!content.startsWith('#!')) {
    writeFileSync(target, '#!/usr/bin/env node\n' + content);
  }
  chmodSync(target, 0o755);
}
