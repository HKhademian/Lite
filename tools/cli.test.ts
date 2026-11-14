/** Routed aliases and direct operation commands must share behavior. */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { compileTs } from '../compiler/host.ts';
import { checkTsArtifact } from '../igniter/artifacts.ts';

const root = fileURLToPath(new URL('../', import.meta.url));

function command(name: string, args: string[]) {
  const result = spawnSync(process.execPath, [join(root, 'bin', name), ...args], {
    cwd: root, encoding: 'utf8', timeout: 60_000,
  });
  if (result.error) throw result.error;
  return { status: result.status, stdout: result.stdout, stderr: result.stderr };
}

test('lite compile routes through the compiler router to its TypeScript target', () => {
  const sample = 'language/examples/001-double-sum.lts';
  const expected = command('lite-compile-ts', [sample]);
  assert.deepEqual(command('lite', ['compile', sample]), expected);
  assert.deepEqual(command('lite', ['--compile', sample]), expected);
  assert.deepEqual(command('lite-compile', [sample]), expected);
  assert.deepEqual(command('lite-compile', ['ts', sample]), expected);
  assert.deepEqual(command('lite-compile', ['--target', 'ts', sample]), expected);
  assert.deepEqual(command('lite-compile', ['--target=ts', sample]), expected);
  assert.deepEqual(command('lite-compile-ts', ['--target', 'ts', sample]), expected);
  assert.deepEqual(command('lite-compile-ts', ['--target=ts', sample]), expected);
  assert.deepEqual(
    command('lite-compile', ['--target', 'c', sample]),
    command('lite-compile-c', [sample]),
  );
  assert.deepEqual(
    command('lite-compile', ['--target=c', sample]),
    command('lite-compile-c', [sample]),
  );
});

test('lite verify routes case manifests to the verifier command', () => {
  assert.deepEqual(
    command('lite', ['verify', 'tools/cases/tooling/proposal.fixture.json']),
    command('lite-verify', ['tools/cases/tooling/proposal.fixture.json']),
  );
});

test('lite test routes case mode to the tester command', () => {
  assert.deepEqual(
    command('lite', ['test', '--cases', 'tools/cases/tooling/proposal.fixture.json']),
    command('lite-test', ['--cases', 'tools/cases/tooling/proposal.fixture.json']),
  );
});

test('lite doctor routes to the standalone repository checker', () => {
  assert.deepEqual(
    command('lite', ['doctor', '--docs']),
    command('lite-doctor', ['--docs']),
  );
});

test('component versions belong to their tool commands', () => {
  assert.deepEqual(command('lite', ['verify', '--version']), command('lite-verify', ['--version']));
  assert.deepEqual(command('lite', ['doctor', '--version']), command('lite-doctor', ['--version']));
  assert.deepEqual(command('lite', ['check', '--version']), command('lite-check', ['--version']));
  assert.deepEqual(command('lite', ['docs', '--version']), command('lite-docs', ['--version']));
  assert.deepEqual(command('lite', ['bench', '--version']), command('lite-bench', ['--version']));
});

test('lite check routes through ./bin/lite to the standalone checker', () => {
  assert.deepEqual(
    command('lite', ['check', 'language/examples/001-double-sum.lts']),
    command('lite-check', ['language/examples/001-double-sum.lts']),
  );
  assert.equal(command('lite-check', ['language/examples/001-double-sum.lts']).status, 0);
});

test('generated cli, compile, checker, doctor, run, verify, test-runner, test, bench, ci, and release artifacts match their Lite sources and pass strict TS checking', () => {
  for (const name of ['cli', 'compile', 'compile-c', 'compile-ts', 'checker', 'check', 'run', 'verify', 'test-runner', 'test', 'bench', 'ci', 'release'] as const) {
    const sourcePath = join(root, `tools/src/${name}.lts`);
    const compiled = compileTs({ text: readFileSync(sourcePath, 'utf8'), name: `tools/src/${name}.lts`, rootPath: sourcePath });
    assert.equal(compiled.status, 0, compiled.stderr.toString());
    const generated = readFileSync(join(root, `tools/generated/${name}.ts`), 'utf8');
    assert.equal(compiled.stdout.toString('utf8'), generated, `${name} artifact out of date`);
    const checked = checkTsArtifact(generated);
    assert.equal(checked.status, 0, `${checked.stdout}\n${checked.stderr}`);
  }
});

test('lite router help, version, and unknown command handling match exit and output contracts', () => {
  const help = command('lite', ['help']);
  assert.equal(help.status, 0);
  assert.match(help.stdout, /^Usage: \.\/bin\/lite <command> \[options\]/);
  assert.deepEqual(command('lite', ['--help']), help);
  assert.deepEqual(command('lite', ['-h']), help);

  const missing = command('lite', []);
  assert.equal(missing.status, 2);
  assert.equal(missing.stdout, '');
  assert.equal(missing.stderr, help.stdout);

  const version = command('lite', ['--version']);
  assert.equal(version.status, 0);
  assert.match(version.stdout, /^lite cli \S+\n$/);
});

test('munching routers, flag aliases, and direct generated entrypoints converge on identical output', () => {
  const target = 'tools/src/fmt.lts';
  const expected = command('lite-fmt', ['--check', target]);
  assert.equal(expected.status, 0);
  assert.deepEqual(command('lite', ['fmt', '--check', target]), expected);
  assert.deepEqual(command('lite', ['--fmt', '--check', target]), expected);
  assert.deepEqual(command('lite', ['--', 'fmt', '--check', target]), expected);
  const direct = spawnSync(process.execPath, [join(root, 'tools/generated/fmt.ts'), '--check', target], {
    cwd: root, encoding: 'utf8', timeout: 60_000,
  });
  assert.deepEqual({ status: direct.status, stdout: direct.stdout, stderr: direct.stderr }, expected);
});
