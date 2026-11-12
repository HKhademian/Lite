/** Tests for VS Code extension helpers and built extension bundle. */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { parseLiteDiagnostics, resolveLiteExecutable } from '../src/helpers.ts';

const extRoot = dirname(import.meta.dirname);
const repoRoot = dirname(dirname(extRoot));

test('parseLiteDiagnostics extracts 0-based line, column, and message', () => {
  const diags = parseLiteDiagnostics('example.lts:5:10: unknown value io\n1:2: unexpected token\n');
  assert.deepEqual(diags, [
    { line: 4, column: 9, message: 'unknown value io' },
    { line: 0, column: 1, message: 'unexpected token' },
  ]);
});

test('resolveLiteExecutable prefers explicit config, then workspace ./bin/lite, then PATH', () => {
  assert.equal(resolveLiteExecutable(repoRoot, '/custom/lite'), '/custom/lite');
  assert.equal(resolveLiteExecutable(repoRoot, ''), join(repoRoot, 'bin', 'lite'));
  assert.equal(resolveLiteExecutable('/tmp', ''), 'lite');
});

test('built dist/extension.js exists and has valid JavaScript syntax', () => {
  const builtPath = join(extRoot, 'dist', 'extension.js');
  assert.equal(existsSync(builtPath), true, 'dist/extension.js must be built');
  assert.equal(existsSync(join(extRoot, 'dist', 'helpers.js')), true, 'dist/helpers.js must be built');
  execFileSync(process.execPath, ['--check', builtPath]);
  const src = readFileSync(builtPath, 'utf8');
  assert(src.includes('registerDocumentFormattingEditProvider'));
  assert(src.includes('createDiagnosticCollection'));
});
