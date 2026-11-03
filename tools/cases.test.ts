/** Shared schema boundaries and the maintained declarative command suite. */
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { streamBytes } from './streams.ts';
import { sha256 } from './project.ts';
import { testCases } from './test.ts';

test('shared streams preserve raw bytes and reject ambiguous or stale descriptors', () => {
  const directory = mkdtempSync(join(tmpdir(), 'lite-streams-'));
  try {
    const bytes = Buffer.from([0, 255, 13, 10]);
    writeFileSync(join(directory, 'raw.stdin'), bytes);
    for (const value of [{ bytes: [...bytes] }, { file: 'raw.stdin', hash: `sha256:${sha256(bytes)}` }]) assert.deepEqual(streamBytes(value, directory), bytes);
    assert.deepEqual(streamBytes({ text: 'a\r\n' }, directory), Buffer.from('a\r\n'));
    for (const value of ['file.stdin', { text: '', bytes: [] }, { bytes: [256] }, { file: 'raw.stdin', hash: 'sha256:' + '0'.repeat(64) }, { text: '', typo: 1 }]) assert.throws(() => streamBytes(value, directory));
    assert.throws(() => streamBytes({ text: '' }, directory, 'stream', { requiredHash: true }), /hash/);
    assert.throws(() => streamBytes({ file: '../raw.stdin' }, directory, 'stream', { siblingOnly: true }), /sibling/);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

test('declarative tool and language cases preserve their recorded contracts', () => {
  const result = testCases();
  assert.equal(result.failures, 0);
  assert(result.count > 0);
});
