import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { contractHash, contractReader, contractRequest, expectedText, type ContractFile } from './contracts.ts';

const source = 'outputLine(inputAll());';
const request = contractRequest(source, { stdin: 'سلام🙂\r\n', args: ['one', ''], name: 'named.lts' });
const file: ContractFile = { version: 1, provenance: {}, sources: { [contractHash(source)]: source }, cases: [
  { ...request, status: 7, stdout: 'before\0\r\n🙂', stderr: 'named.lts:1:1: fault\n' },
] };

test('recorded contracts distinguish source, raw input, arguments and diagnostic names', () => {
  const read = contractReader(file);
  const options = { stdin: 'سلام🙂\r\n', args: ['one', ''], name: 'named.lts' };
  const expected = { status: 7, stdout: Buffer.from('before\0\r\n🙂'), stderr: Buffer.from('named.lts:1:1: fault\n') };
  assert.deepEqual(read(source, options), expected);
  assert.deepEqual(read(source, { ...options, stdin: Buffer.from(options.stdin) }), expected);
  for (const [text, changed] of [
    [source + ' ', options], [source, { ...options, stdin: 'سلام🙂\n' }],
    [source, { ...options, args: ['one'] }], [source, { ...options, name: 'other.lts' }],
    [source, { ...options, stdin: Buffer.from([0xff]) }],
  ] as const) assert.throws(() => read(text, changed), /missing reviewed process contract/);
  read(source, options).stdout.fill(0);
  assert.deepEqual(read(source, options), expected, 'fresh buffers preserve future expectations');
});

test('recorded contracts reject stale source identities, duplicate cases and invalid status', () => {
  assert.throws(() => contractReader({ ...file, sources: { [contractHash(source)]: source + ' ' } }), /source hash mismatch/);
  assert.throws(() => contractReader({ ...file, sources: {} }), /missing process contract source/);
  assert.throws(() => contractReader({ ...file, cases: [...file.cases, ...file.cases] }), /duplicate process contract/);
  for (const status of [-1, 256, 1.5]) assert.throws(() => contractReader({ ...file, cases: file.cases.map(c => ({ ...c, status })) }), /invalid process contract status/);
});

test('every recorded expectation is readable without executing the source', () => {
  const saved = JSON.parse(readFileSync(new URL('./contracts/process.json', import.meta.url), 'utf8')) as ContractFile;
  assert.ok(saved.cases.length > 100);
  for (const item of saved.cases) {
    const actual = expectedText(saved.sources[item.source]!, { stdin: Buffer.from(item.stdin, 'base64'), args: item.args,
      ...(item.name === null ? {} : { name: item.name }) });
    assert.deepEqual(actual, { status: item.status, stdout: Buffer.from(item.stdout), stderr: Buffer.from(item.stderr) });
  }
});

test('generated contract lookup loads in a copied package without T00 or bootstrap adapters', () => {
  const directory = mkdtempSync(join(tmpdir(), 'lite-contract-no-t00-'));
  try {
    mkdirSync(join(directory, 'contracts'));
    cpSync(new URL('./contracts.ts', import.meta.url), join(directory, 'contracts.ts'));
    cpSync(new URL('./contracts/process.json', import.meta.url), join(directory, 'contracts/process.json'));
    writeFileSync(join(directory, 'package.json'), '{"type":"module"}');
    assert.equal(existsSync(join(directory, 'igniter/lite.ts')), false);
    const result = spawnSync(process.execPath, ['--input-type=module', '-e',
      'import {expectedText} from "./contracts.ts"; import {readFileSync} from "node:fs"; const f=JSON.parse(readFileSync("./contracts/process.json")); const c=f.cases[0]; const r=expectedText(f.sources[c.source],{stdin:Buffer.from(c.stdin,"base64"),args:c.args,...(c.name===null?{}:{name:c.name})}); if(r.status!==c.status||r.stdout.toString()!==c.stdout||r.stderr.toString()!==c.stderr)process.exit(1);'],
    { cwd: directory, encoding: 'utf8', timeout: 5000 });
    assert.equal(result.status, 0, result.stdout + result.stderr); assert.equal(result.stderr, '');
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

test('the migration ledger retains a destination for every original regression test', () => {
  const ledger = JSON.parse(readFileSync(new URL('./test-migration.json', import.meta.url), 'utf8')) as {
    tests: { title: string; destination: string; originalAssertions: number }[];
  };
  assert.equal(ledger.tests.length, 240);
  assert.equal(new Set(ledger.tests.map(item => item.title)).size, ledger.tests.length);
  for (const item of ledger.tests) {
    assert.ok(Number.isInteger(item.originalAssertions) && item.originalAssertions >= 0, item.title);
    assert.ok(['igniter/test.ts', 'igniter/reference.test.ts'].includes(item.destination));
    const content = readFileSync(new URL('../../' + item.destination, import.meta.url), 'utf8');
    assert.ok(content.includes("test('" + item.title.replaceAll("'", "\\'") + "'"), `${item.title}: lost destination`);
  }
});
