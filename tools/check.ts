/** Repository consistency checks; source checking remains lite check FILE. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { checkDocuments } from './docs.ts';
import { root, run, versions } from './project.ts';
import { loadCases } from './cases.ts';

export function checkProject(docsOnly = false): void {
  const failures = checkDocuments();
  assert.equal(failures.length, 0, failures.join('\n'));
  const current = versions();
  const editor = JSON.parse(readFileSync(join(root, 'editors/vscode/package.json'), 'utf8')) as { version: string };
  const lock = JSON.parse(readFileSync(join(root, 'editors/vscode/package-lock.json'), 'utf8')) as { version: string; packages: Record<string, { version: string }> };
  assert.equal(current.vscode, editor.version, 'editor version differs from registry');
  assert.equal(lock.version, editor.version, 'editor lockfile version differs');
  assert.equal(lock.packages['']?.version, editor.version, 'editor lockfile package version differs');
  loadCases();
  if (!docsOnly) {
    process.stdout.write(run(process.execPath, ['igniter/node_modules/typescript/bin/tsc', '-p', 'igniter/tsconfig.json']));
    process.stdout.write(run(process.execPath, ['igniter/node_modules/typescript/bin/tsc', '-p', 'compiler/bootstrap/tsconfig.json']));
  }
  console.log('Repository checks passed.');
}

if (import.meta.main) {
  try {
    const args = process.argv.slice(2);
    assert(args.length === 0 || (args.length === 1 && args[0] === '--docs'), 'usage: lite doctor [--docs]');
    checkProject(args[0] === '--docs');
  } catch (error) { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; }
}
