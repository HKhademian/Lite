/** Keep project-owned executable source inside the owner's permitted file types. */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, lstatSync, readFileSync, realpathSync } from 'node:fs';
import { extname, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

test('project-owned code uses Lite, TypeScript, JSON and generated C files', () => {
  const root = fileURLToPath(new URL('../', import.meta.url));
  const result = spawnSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'], { cwd: root, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  const data = new Set(['.md', '.jsonl', '.csv', '.txt', '.png', '.svg', '.yml', '.yaml', '.tokens', '.nodes', '.symbols', '.stderr', '.stdin', '.stdout']);
  const source = new Set(['.lt', '.lts', '.lite', '.ts', '.json']);
  const violations: string[] = [];
  for (const name of new Set(result.stdout.split('\0').filter(Boolean))) {
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
    if (extension === '.c' && (name.startsWith('compiler/generated/') || name.startsWith('compiler/bootstrap/'))) continue;
    const content = readFileSync(path);
    if (extension === '' && !content.subarray(0, 2).equals(Buffer.from('#!'))) continue;
    violations.push(relative(root, path));
  }
  assert.deepEqual(violations, [], 'Keep handwritten code in .lt/.lts/.lite/.ts files; generated C belongs under compiler/generated or compiler/bootstrap.');
});
