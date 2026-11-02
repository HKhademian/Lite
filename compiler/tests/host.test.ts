import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { chmodSync, copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { delimiter, dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { loadBundle } from '../../igniter/loader.ts';
import { buildTsCompiler, compileTs } from '../host.ts';
import { seed } from '../bootstrap/seed.ts';

const root = fileURLToPath(new URL('../../', import.meta.url));
const env = { ...process.env, PATH: dirname(process.execPath) + delimiter + (process.env['PATH'] ?? '') };

/** Copies only host glue, the seed and Lite sources; the T00 implementation is deliberately absent. */
function isolatedCheckout(): string {
  const directory = mkdtempSync(join(tmpdir(), 'lite-t11-checkout-'));
  const manifest = resolve(root, 'compiler/manifests/ts.json');
  const bundle = loadBundle(manifest);
  const paths = [
    'litec', 'compiler/host.ts', 'compiler/entry.ts', 'compiler/cli.ts', 'compiler/package.json',
    'compiler/bootstrap/T11.ts', 'compiler/bootstrap/seed.ts', 'compiler/bootstrap/tsconfig.json',
    'compiler/manifests/ts.json', 'igniter/loader.ts', 'igniter/tsconfig.json',
    ...bundle.files.map(path => relative(root, resolve(dirname(manifest), path))),
  ];
  for (const path of paths) {
    const destination = join(directory, path);
    mkdirSync(dirname(destination), { recursive: true });
    copyFileSync(join(root, path), destination);
  }
  chmodSync(join(directory, 'litec'), 0o755);
  return directory;
}

/** Invokes the copied launcher and captures exact bytes, without a fallback interpreter. */
function invoke(directory: string, source: string | Buffer) {
  const path = join(directory, 'source with spaces.lts');
  writeFileSync(path, source);
  return spawnSync(join(directory, 'litec'), ['ts', path], { env, timeout: 10000 });
}

test('T11 host selects the recorded seed and preserves output, diagnostics and source line maps', () => {
  const built = buildTsCompiler();
  assert.equal(built.artifactSha256, seed.artifactSha256);
  assert.equal(built.sourceSha256, seed.sourceSha256);
  const reference = readFileSync(join(root, 'compiler/generated/report-42.ts'));
  for (const name of [undefined, '', 'a b.lts', 'سلام🙂.lts', 'quote";\\\nname.lts']) {
    const input = name === undefined ? { text: 'report(42);' } : { text: 'report(42);', name };
    assert.deepEqual(compileTs(input), { status: 0, stdout: reference, stderr: Buffer.alloc(0) });
    const bad = name === undefined ? { text: 'report(1 +);' } : { text: 'report(1 +);', name };
    assert.deepEqual(compileTs(bad), { status: 2, stdout: Buffer.alloc(0),
      stderr: Buffer.from(`${name === undefined || name === '' ? '' : name + ':'}1:11: expected an Int, String or Bool expression\n`) });
  }
  assert.deepEqual(compileTs({ text: 'report(1);\nreport(1 +);\n', name: 'flattened.lts',
    lineMap: [{ path: 'first.lts', line: 5 }, { path: 'second.lts', line: 9 }] }), {
    status: 2, stdout: Buffer.alloc(0), stderr: Buffer.from('second.lts:9:11: expected an Int, String or Bool expression\n'),
  });
});

test('default TS compilation works in an isolated checkout with no T00 implementation', () => {
  const directory = isolatedCheckout();
  try {
    assert.equal(existsSync(join(directory, 'igniter/lite.ts')), false);
    assert.equal(existsSync(join(directory, 'igniter/bootstrap.ts')), false);
    const result = invoke(directory, 'report(42);');
    assert.equal(result.error, undefined); assert.equal(result.status, 0, result.stderr.toString());
    assert.deepEqual(result.stdout, readFileSync(join(root, 'compiler/generated/report-42.ts')));
    assert.equal(result.stderr.length, 0);
    const bad = invoke(directory, 'report(42);\nunsupported();\n');
    assert.equal(bad.error, undefined); assert.equal(bad.status, 2);
    assert.equal(bad.stdout.length, 0); assert.ok(bad.stderr.length > 0);
    const invalid = invoke(directory, Buffer.from([0xff]));
    assert.equal(invalid.status, 1); assert.equal(invalid.stdout.length, 0);
    assert.match(invalid.stderr.toString(), /InputFault: cannot read input: invalid UTF-8/);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

test('a changed Lite compiler rebuilds with T11, caches by source and rejects corrupt cache bytes', () => {
  const directory = isolatedCheckout();
  try {
    // Only the TypeScript checker is shared; the copied checkout still has no T00 code.
    symlinkSync(join(root, 'igniter/node_modules'), join(directory, 'igniter/node_modules'));
    const source = join(directory, 'compiler/src/fixture.lts');
    writeFileSync(join(directory, 'compiler/manifests/ts.json'), JSON.stringify({ target: 'ts', files: ['../src/fixture.lts'] }));
    writeFileSync(source, 'source := inputAll();\nreport("fresh");\n');
    const first = invoke(directory, 'report(42);');
    assert.equal(first.error, undefined); assert.equal(first.status, 0, first.stderr.toString());
    assert.equal(first.stdout.toString(), 'fresh\n');
    const second = invoke(directory, 'report(7);');
    assert.equal(second.status, 0); assert.deepEqual(second.stdout, first.stdout);
    // Ask the real build selector for its exact cache path inside the copied checkout.
    const selected = spawnSync(process.execPath, ['--input-type=module', '-e',
      'import {buildTsCompiler} from "./compiler/host.ts"; process.stdout.write(JSON.stringify(buildTsCompiler()));'],
    { cwd: directory, env, encoding: 'utf8', timeout: 10000 });
    assert.equal(selected.status, 0, selected.stderr);
    const record: unknown = JSON.parse(selected.stdout);
    assert.ok(typeof record === 'object' && record !== null && 'path' in record && typeof record.path === 'string');
    assert.ok('cached' in record && record.cached === true);
    writeFileSync(record.path, readFileSync(record.path, 'utf8') + '\n');
    const corrupt = invoke(directory, 'report(42);');
    assert.equal(corrupt.status, 1); assert.equal(corrupt.stdout.length, 0);
    assert.match(corrupt.stderr.toString(), /cache integrity mismatch/);
    // A new source hash cannot accidentally pick the old cache or the original seed.
    writeFileSync(source, 'this is not valid Lite');
    const rejected = invoke(directory, 'report(42);');
    assert.equal(rejected.status, 1); assert.equal(rejected.stdout.length, 0);
    assert.match(rejected.stderr.toString(), /T11 cannot rebuild current compiler source/);
    assert.match(rejected.stderr.toString(), /\.\.\/src\/fixture\.lts:1:/);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

test('a modified bootstrap seed fails explicitly without executing T00', () => {
  const directory = isolatedCheckout();
  try {
    const path = join(directory, 'compiler/bootstrap/T11.ts');
    writeFileSync(path, readFileSync(path, 'utf8') + '\n');
    const result = invoke(directory, 'report(42);');
    assert.equal(result.status, 1); assert.equal(result.stdout.length, 0);
    assert.match(result.stderr.toString(), /T11 bootstrap seed hash mismatch/);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});
