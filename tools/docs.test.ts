/** Markdown integrity boundaries that ordinary command fixtures cannot isolate. */
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { checkDocuments, documents } from './docs.ts';

test('documentation checks anchors, duplicates, code and ignored dependencies', () => {
  const directory = mkdtempSync(join(tmpdir(), 'lite-docs-'));
  try {
    writeFileSync(join(directory, 'topic.md'), '# Topic\n\n## A `name`\n\n## A `name`\n');
    writeFileSync(join(directory, 'README.md'), '# Index\n\n[one](topic.md#a-name) [two](topic.md#a-name-1)\n`[not a link](missing.md)`\n```text\n[fake](missing.md)\n```\n');
    mkdirSync(join(directory, 'node_modules'));
    writeFileSync(join(directory, 'node_modules/ignored.md'), '[broken](absent.md)');
    assert.deepEqual(checkDocuments(directory), []);
    assert.equal(documents(directory).length, 2);
    writeFileSync(join(directory, 'README.md'), '# Index\n\n[bad](topic.md#missing)\n[absent](absent.md)\n```text\nunclosed\n');
    const failures = checkDocuments(directory);
    assert.equal(failures.length, 3);
    assert(failures.some(value => value.includes('missing fragment')));
    assert(failures.some(value => value.includes('missing link')));
    assert(failures.some(value => value.includes('unclosed code fence')));
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

test('registered documentation snippets must match their separately maintained source', () => {
  const directory = mkdtempSync(join(tmpdir(), 'lite-doc-snippet-'));
  try {
    mkdirSync(join(directory, 'config'));
    writeFileSync(join(directory, 'source.lts'), 'outputLine(24);\n');
    writeFileSync(join(directory, 'README.md'), '# Example\n\n```text\noutputLine(24);\n```\n');
    writeFileSync(join(directory, 'config/documentation.json'), JSON.stringify({ navigation: [{ label: 'Start', path: 'README.md' }], snippets: [{ document: 'README.md', source: 'source.lts', fence: 0 }] }));
    assert.deepEqual(checkDocuments(directory), []);
    writeFileSync(join(directory, 'source.lts'), 'outputLine(25);\n');
    assert.match(checkDocuments(directory).join('\n'), /code fence 0 differs/);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});
