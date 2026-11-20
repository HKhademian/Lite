/** Markdown integrity boundaries that ordinary command fixtures cannot isolate. */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { checkTsArtifact, compileTs, ensureTool } from '../igniter/artifacts.ts';

const root = fileURLToPath(new URL('../', import.meta.url));

function runDocs(args: readonly string[], directory: string, stdinInput?: string) {
  const result = spawnSync(process.execPath, [ensureTool('docs'), ...args], {
    cwd: root,
    env: { ...process.env, LITE_DOCS_ROOT: directory },
    input: stdinInput ?? '',
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
  if (result.error) throw result.error;
  return result;
}
function documents(directory = root): { path: string; title: string; headings: string[] }[] {
  const result = runDocs(['--json'], directory);
  assert.equal(result.status, 0, result.stderr);
  return JSON.parse(result.stdout) as { path: string; title: string; headings: string[] }[];
}
function renderDocuments(paths?: readonly string[], directory = root) {
  const stdinInput = paths !== undefined && paths.length > 0 ? `${paths.join('\n')}\n` : undefined;
  const result = runDocs(['--render-json'], directory, stdinInput);
  assert.equal(result.status, 0, result.stderr);
  return JSON.parse(result.stdout) as { path: string; title: string; status: string; toc: unknown[]; html: string }[];
}
function extractModules(directory = root) {
  const result = runDocs(['--modules-json'], directory);
  assert.equal(result.status, 0, result.stderr);
  return JSON.parse(result.stdout) as { id: string; environment: string; symbols: { kind: string; name: string; isHostDeclaration: boolean }[] }[];
}
function checkDocuments(directory = root): string[] {
  const result = runDocs(['--check'], directory);
  if (result.status === 0 && result.signal === null) return [];
  const text = result.stderr.trimEnd();
  return text === '' ? [`lite docs --check failed (${result.status ?? result.signal})`] : text.split('\n');
}

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

test('ignited docs artifact in dist/tools matches tools/src/docs.lts and passes strict TS checking', () => {
  const sourcePath = join(root, 'tools/src/docs.lts');
  const compiled = compileTs({ text: readFileSync(sourcePath, 'utf8'), name: 'tools/src/docs.lts', rootPath: sourcePath });
  assert.equal(compiled.status, 0, compiled.stderr.toString());
  const generated = readFileSync(ensureTool('docs'), 'utf8');
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

test('docs --check validates lite:// and lite:/ internal URIs, fragments, and module symbols offline', () => {
  const directory = mkdtempSync(join(tmpdir(), 'lite-docs-uri-'));
  try {
    mkdirSync(join(directory, 'docs'), { recursive: true });
    mkdirSync(join(directory, 'lib/core'), { recursive: true });
    mkdirSync(join(directory, 'language/learn/handbook/getting-started'), { recursive: true });
    mkdirSync(join(directory, 'language/gym'), { recursive: true });
    mkdirSync(join(directory, 'samples'), { recursive: true });
    writeFileSync(join(directory, 'language/learn/handbook/getting-started/overview-and-setup.md'), '# Overview\n\n## First Steps\n');
    writeFileSync(join(directory, 'docs/records.md'), '# Records\n\n## Defaults\n');
    writeFileSync(join(directory, 'lib/core/io.lts'), 'pub outputLine := fn(x: String): Unit {};\n');
    writeFileSync(
      join(directory, 'language/learn/catalog.json'),
      JSON.stringify({ tracks: [{ id: 'getting-started', lessons: [{ id: 'learn.gs.hello', slug: 'hello-lite' }] }] }),
    );
    writeFileSync(
      join(directory, 'language/gym/catalog.json'),
      JSON.stringify({ exercises: [{ id: 'drills.x', slug: 'immutable-vs-var', mode: 'drill' }] }),
    );
    writeFileSync(join(directory, 'samples/demo.lts'), 'io := import "core/io";\n');
    writeFileSync(
      join(directory, 'README.md'),
      [
        '# Hub',
        '- [Hb](lite://handbook/overview-and-setup#first-steps)',
        '- [Doc](lite:/doc/records#defaults)',
        '- [Learn](lite://learn/hello-lite)',
        '- [Gym](lite://gym/drill/immutable-vs-var)',
        '- [Mod](lite://module/core/io#outputLine)',
        '- [Play](lite://play/demo)',
        '- [Tool](lite://tool/fmt)',
      ].join('\n') + '\n',
    );
    assert.deepEqual(checkDocuments(directory), []);

    writeFileSync(
      join(directory, 'README.md'),
      [
        '# Bad',
        '- [Ns](lite://bogus/x)',
        '- [HbFrag](lite://handbook/overview-and-setup#missing)',
        '- [LearnMissing](lite://learn/nope)',
        '- [GymMode](lite://gym/workout/immutable-vs-var)',
        '- [ModSym](lite://module/core/io#nonexistent)',
        '- [ToolMissing](lite://tool/unknown-cmd)',
      ].join('\n') + '\n',
    );
    const failures = checkDocuments(directory);
    assert.equal(failures.length, 6, failures.join('\n'));
    assert(failures.some(f => f.includes('unknown lite URI namespace')));
    assert(failures.some(f => f.includes('missing fragment')));
    assert(failures.some(f => f.includes('missing lite://learn')));
    assert(failures.some(f => f.includes('missing lite://gym')));
    assert(failures.some(f => f.includes('missing module symbol')));
    assert(failures.some(f => f.includes('missing lite://tool')));
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
