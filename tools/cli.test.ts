/** Routed aliases and direct operation commands must share behavior. */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const root = fileURLToPath(new URL('../', import.meta.url));

function command(name: string, args: string[]) {
  const result = spawnSync(process.execPath, [join(root, 'bin', name), ...args], {
    cwd: root, encoding: 'utf8', timeout: 60_000,
  });
  if (result.error) throw result.error;
  return { status: result.status, stdout: result.stdout, stderr: result.stderr };
}

test('lite compile routes through the compiler router to its TypeScript target', () => {
  assert.deepEqual(
    command('lite', ['compile', 'language/examples/001-double-sum.lts']),
    command('lite-compile', ['language/examples/001-double-sum.lts']),
  );
  assert.deepEqual(
    command('lite-compile', ['language/examples/001-double-sum.lts']),
    command('lite-compile-ts', ['language/examples/001-double-sum.lts']),
  );
  assert.deepEqual(
    command('lite-compile', ['--target', 'c', 'language/examples/001-double-sum.lts']),
    command('lite-compile-c', ['language/examples/001-double-sum.lts']),
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
});
