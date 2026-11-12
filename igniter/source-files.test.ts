/** Keep project-owned executable source inside the owner's permitted file types. */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, lstatSync, readFileSync, readdirSync, realpathSync } from 'node:fs';
import { extname, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

test('project-owned code uses Lite, TypeScript, JSON and generated C files', () => {
  const root = fileURLToPath(new URL('../', import.meta.url));
  let files: string[];
  if (existsSync(resolve(root, '.git'))) {
    const result = spawnSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'], { cwd: root, encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    files = result.stdout.split('\0').filter(Boolean);
  } else {
    // Source archives have no Git metadata; inspect their shipped files directly.
    const visit = (directory: string): string[] => readdirSync(resolve(root, directory), { withFileTypes: true }).flatMap(entry => {
      if (['.git', '.cache', 'node_modules'].includes(entry.name)) return [];
      const name = directory + entry.name;
      return entry.isDirectory() ? visit(name + '/') : [name];
    });
    files = visit('');
  }
  const data = new Set(['.md', '.jsonl', '.csv', '.txt', '.png', '.svg', '.yml', '.yaml', '.tokens', '.nodes', '.symbols', '.stderr', '.stdin', '.stdout']);
  const source = new Set(['.lt', '.lts', '.lite', '.ts', '.json']);
  const violations: string[] = [];
  for (const name of new Set(files)) {
    const path = resolve(root, name); if (!existsSync(path)) continue;
    if (lstatSync(path).isSymbolicLink()) {
      const target = realpathSync(path);
      if (!target.startsWith(root) || extname(target) !== '.ts') violations.push(`${name}: command must link to project TypeScript`);
      continue;
    }
    const extension = extname(path);
    if (/^tsconfig(?:\.[^/]*)?\.json$/.test(name.split('/').at(-1)!) && !['igniter/tsconfig.json', 'compiler/bootstrap/tsconfig.json'].includes(name)) {
      violations.push(`${name}: use the igniter or bootstrap TypeScript configuration`); continue;
    }
    if (source.has(extension) || data.has(extension)) continue;
    if (extension === '.html' && name.startsWith('brand/investigation/')) continue;
    if (extension === '.c' && (name.startsWith('compiler/tests/references/generated/') || name.startsWith('compiler/bootstrap/'))) continue;
    const content = readFileSync(path);
    if (extension === '' && !content.subarray(0, 2).equals(Buffer.from('#!'))) continue;
    violations.push(relative(root, path));
  }
  assert.deepEqual(violations, [], 'Keep handwritten code in .lt/.lts/.lite/.ts files; generated C references belong under compiler/tests/references/generated or compiler/bootstrap.');
});
