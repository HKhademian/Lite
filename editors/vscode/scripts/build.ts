/** Build the VS Code extension JS artifacts into dist/. */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(import.meta.dirname);
const distDir = join(root, 'dist');
mkdirSync(distDir, { recursive: true });

for (const name of ['helpers', 'extension']) {
  const src = readFileSync(join(root, 'src', `${name}.ts`), 'utf8');
  let js = stripTypeScriptTypes(src, { mode: 'strip' });
  if (name === 'extension') {
    js = js.replaceAll("from './helpers.ts'", "from './helpers.js'");
  }
  writeFileSync(join(distDir, `${name}.js`), js, 'utf8');
}
