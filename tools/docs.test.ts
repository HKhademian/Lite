/** Markdown integrity boundaries that ordinary command fixtures cannot isolate. */
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { compileTs } from '../compiler/host.ts';
import { checkTsArtifact } from '../igniter/artifacts.ts';
import { checkDocuments, documents, extractModules, renderDocuments } from './docs.ts';

const root = fileURLToPath(new URL('../', import.meta.url));

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

test('generated docs artifact matches tools/src/docs.lts and passes strict TS checking', () => {
  const sourcePath = join(root, 'tools/src/docs.lts');
  const compiled = compileTs({ text: readFileSync(sourcePath, 'utf8'), name: 'tools/src/docs.lts', rootPath: sourcePath });
  assert.equal(compiled.status, 0, compiled.stderr.toString());
  const generated = readFileSync(join(root, 'tools/generated/docs.ts'), 'utf8');
  assert.equal(compiled.stdout.toString('utf8'), generated);
  const checked = checkTsArtifact(generated);
  assert.equal(checked.status, 0, `${checked.stdout}\n${checked.stderr}`);
});

test('renderDocuments and extractModules return valid structured metadata via generated Lite docs tool', () => {
  const rendered = renderDocuments(['docs/start-here.md', 'docs/tour.md']);
  assert.equal(rendered.length, 2);
  assert.equal(rendered[0]?.path, 'docs/start-here.md');
  assert.equal(rendered[0]?.title, 'Start with LiteLang');
  assert.equal(rendered[0]?.status, 'guide');
  assert(rendered[0]!.toc.length >= 3);
  assert(rendered[0]!.html.includes('<h1 id="start-with-litelang">Start with LiteLang</h1>'));
  assert(rendered[1]!.html.includes('data-fence="0"'));

  const modules = extractModules();
  assert.equal(modules.length, 17);
  const ioMod = modules.find(m => m.id === 'core/io');
  assert(ioMod !== undefined);
  assert.equal(ioMod.environment, 'universal');
  assert(ioMod.symbols.some(s => s.name === 'outputLine' && s.isHostDeclaration));
  const canvasMod = modules.find(m => m.id === 'extra/canvas');
  assert(canvasMod !== undefined);
  assert.equal(canvasMod.environment, 'play');
  assert(canvasMod.symbols.some(s => s.kind === 'type' && s.name === 'Color'));
  const fileMod = modules.find(m => m.id === 'core/file');
  assert(fileMod !== undefined);
  assert.equal(fileMod.environment, 'cli');
});
