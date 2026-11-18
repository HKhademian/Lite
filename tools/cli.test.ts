/** Routed aliases and direct operation commands must share behavior. */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { chmodSync, copyFileSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, readlinkSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { compileTs } from '../compiler/host.ts';
import { ensureTool, igniteAllTools } from './project.ts';

const root = fileURLToPath(new URL('../', import.meta.url));

function command(name: string, args: string[]) {
  const result = spawnSync(process.execPath, [join(root, 'bin', name), ...args], {
    cwd: root, encoding: 'utf8', timeout: 60_000,
  });
  if (result.error) throw result.error;
  return { status: result.status, stdout: result.stdout, stderr: result.stderr };
}

test('lite compile routes through the compiler router to its TypeScript target', () => {
  const sample = 'language/examples/foundations/io/double-sum.lts';
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
    command('lite', ['verify', 'tools/cases/tooling/fixtures/proposal.fixture.json']),
    command('lite-verify', ['tools/cases/tooling/fixtures/proposal.fixture.json']),
  );
});

test('lite test routes case mode to the tester command', () => {
  assert.deepEqual(
    command('lite', ['test', '--cases', 'tools/cases/tooling/fixtures/proposal.fixture.json']),
    command('lite-test', ['--cases', 'tools/cases/tooling/fixtures/proposal.fixture.json']),
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
    command('lite', ['check', 'language/examples/foundations/io/double-sum.lts']),
    command('lite-check', ['language/examples/foundations/io/double-sum.lts']),
  );
  assert.equal(command('lite-check', ['language/examples/foundations/io/double-sum.lts']).status, 0);
});

test('ignited cli, compile, checker, doctor, run, verify, test-runner, test, bench, ci, release, and ignite artifacts match their Lite sources and pass strict TS checking', () => {
  const ignited = igniteAllTools({ check: true });
  assert.equal(ignited.checked, true);
  for (const name of ['cli', 'compile', 'compile-c', 'compile-ts', 'checker', 'check', 'run', 'run-ts-artifact', 'verify', 'test-runner', 'test', 'bench', 'ci', 'release', 'ignite'] as const) {
    const sourcePath = join(root, `tools/src/${name}.lts`);
    const compiled = compileTs({ text: readFileSync(sourcePath, 'utf8'), name: `tools/src/${name}.lts`, rootPath: sourcePath });
    assert.equal(compiled.status, 0, compiled.stderr.toString());
    const generated = readFileSync(ensureTool(name), 'utf8');
    assert.equal(compiled.stdout.toString('utf8'), generated, `${name} artifact out of date`);
  }
  const trackedIgniter = readFileSync(join(root, 'compiler/bootstrap/igniter.ts'), 'utf8').replace(/^#![^\n]*\n/, '');
  assert.equal(trackedIgniter, readFileSync(ensureTool('ignite'), 'utf8'), 'compiler/bootstrap/igniter.ts out of date');
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
  const direct = spawnSync(process.execPath, [ensureTool('fmt'), '--check', target], {
    cwd: root, encoding: 'utf8', timeout: 60_000,
  });
  assert.deepEqual({ status: direct.status, stdout: direct.stdout, stderr: direct.stderr }, expected);
});

test('ignition rebuilds missing, tampered, and dependency-changed tools into dist/tools without checked-in generated files', () => {
  assert.equal(existsSync(join(root, 'tools/generated')), false);
  const directory = mkdtempSync(join(tmpdir(), 'lite-ignite-probe-'));
  try {
    const copyTree = (rel: string): void => {
      const src = join(root, rel);
      const dst = join(directory, rel);
      const st = lstatSync(src);
      if (st.isSymbolicLink()) {
        mkdirSync(dirname(dst), { recursive: true });
        symlinkSync(readlinkSync(src), dst);
      } else if (st.isDirectory()) {
        mkdirSync(dst, { recursive: true });
        for (const entry of readdirSync(src)) copyTree(join(rel, entry));
      } else {
        mkdirSync(dirname(dst), { recursive: true });
        copyFileSync(src, dst);
      }
    };
    for (const rel of [
      'package.json', 'config/versions.json', 'bin/lite', 'bin/lite-fmt', 'bin/lite-ignite',
      'compiler/host.ts', 'compiler/package.json', 'compiler/src', 'compiler/manifests',
      'compiler/bootstrap/igniter.ts', 'compiler/bootstrap/seed.ts',
      'igniter/artifacts.ts', 'igniter/package.json', 'igniter/tsconfig.json',
      'tools/src/cli.lts', 'tools/src/fmt.lts', 'lib/core', 'lib/util',
    ]) {
      copyTree(rel);
    }
    chmodSync(join(directory, 'bin/lite'), 0o755);
    chmodSync(join(directory, 'bin/lite-fmt'), 0o755);
    chmodSync(join(directory, 'bin/lite-ignite'), 0o755);

    const first = spawnSync(process.execPath, [join(directory, 'compiler/bootstrap/igniter.ts'), '--json', 'cli', 'fmt'], {
      cwd: directory, encoding: 'utf8', timeout: 60_000,
    });
    assert.equal(first.status, 0, first.stderr);
    const firstJson = JSON.parse(first.stdout) as { tools: { name: string; rebuilt: boolean; sha256: string }[] };
    assert.deepEqual(firstJson.tools.map(t => [t.name, t.rebuilt]), [['cli', true], ['fmt', true]]);
    assert.ok(existsSync(join(directory, 'dist/tools/fmt.ts')));

    const second = spawnSync(process.execPath, [join(directory, 'compiler/bootstrap/igniter.ts'), '--json', 'cli', 'fmt'], {
      cwd: directory, encoding: 'utf8', timeout: 60_000,
    });
    assert.equal(second.status, 0, second.stderr);
    const secondJson = JSON.parse(second.stdout) as { tools: { name: string; rebuilt: boolean }[] };
    assert.deepEqual(secondJson.tools.map(t => [t.name, t.rebuilt]), [['cli', false], ['fmt', false]]);

    // Tampering with the ignited output triggers clean regeneration.
    writeFileSync(join(directory, 'dist/tools/fmt.ts'), '// tampered\n');
    const repaired = spawnSync(process.execPath, [join(directory, 'bin/lite'), 'fmt', '--check', 'tools/src/fmt.lts'], {
      cwd: directory, encoding: 'utf8', timeout: 60_000,
    });
    assert.equal(repaired.status, 0, repaired.stderr);
    assert.equal(readFileSync(join(directory, 'dist/tools/fmt.ts'), 'utf8').includes('// tampered'), false);

    // Editing a transitive Lite library dependency invalidates affected tools only.
    const cliLib = join(directory, 'lib/util/cli.lts');
    writeFileSync(cliLib, readFileSync(cliLib, 'utf8') + '\n');
    const afterDep = spawnSync(process.execPath, [join(directory, 'compiler/bootstrap/igniter.ts'), '--json', 'cli', 'fmt'], {
      cwd: directory, encoding: 'utf8', timeout: 60_000,
    });
    assert.equal(afterDep.status, 0, afterDep.stderr);
    const afterDepJson = JSON.parse(afterDep.stdout) as { tools: { name: string; rebuilt: boolean }[] };
    assert.deepEqual(afterDepJson.tools.map(t => [t.name, t.rebuilt]), [['cli', true], ['fmt', true]]);

    // Calling bin/lite-ignite ignites both dist/bootstrap/compiler.ts and all tools in dist/tools/.
    rmSync(join(directory, 'dist'), { recursive: true, force: true });
    const ignitedAll = spawnSync(process.execPath, [join(directory, 'bin/lite-ignite'), '--json'], {
      cwd: directory, encoding: 'utf8', timeout: 60_000,
    });
    assert.equal(ignitedAll.status, 0, ignitedAll.stderr);
    assert.ok(existsSync(join(directory, 'dist/bootstrap/compiler.ts')));
    assert.ok(existsSync(join(directory, 'dist/tools/cli.ts')));
    assert.ok(existsSync(join(directory, 'dist/tools/fmt.ts')));
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
