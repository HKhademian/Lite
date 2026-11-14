/** Unit and CLI tests for lite fmt. */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { compileTs } from '../compiler/host.ts';
import { checkTsArtifact } from '../igniter/artifacts.ts';
import { formatLite } from './fmt.ts';

const root = fileURLToPath(new URL('../', import.meta.url));

test('formatLite normalizes indentation, brace spacing, blank lines, and EOF newline idempotently', () => {
  const input = [
    '',
    '  io := import "core/io";  ',
    '',
    '',
    'if 1 < 2{',
    'io.outputLine("ok {not a brace}");',
    '}else{',
    '  io.outputLine("no");',
    '}',
    '',
    '',
  ].join('\n');

  const expected = [
    'io := import "core/io";',
    '',
    'if 1 < 2 {',
    '    io.outputLine("ok {not a brace}");',
    '} else {',
    '    io.outputLine("no");',
    '}',
    '',
  ].join('\n');

  const once = formatLite(input);
  assert.equal(once, expected);
  assert.equal(formatLite(once), expected);
});

function collectLiteFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...collectLiteFiles(full));
    else if (entry.name.endsWith('.lts')) out.push(full);
  }
  return out;
}

test('formatLite is idempotent across all language examples, samples, and library files', () => {
  const tmp = mkdtempSync(join(tmpdir(), 'lite-fmt-corpus-test-'));
  try {
    const copied: string[] = [];
    for (const dir of ['language/examples', 'samples', 'lib/core', 'lib/extra']) {
      const absDir = join(root, dir);
      for (const full of collectLiteFiles(absDir)) {
        const rel = relative(root, full);
        const dest = join(tmp, rel);
        mkdirSync(dirname(dest), { recursive: true });
        writeFileSync(dest, readFileSync(full, 'utf8'), 'utf8');
        copied.push(dest);
      }
    }
    assert.ok(copied.length > 0);
    const first = spawnSync(process.execPath, [join(root, 'bin', 'lite'), 'fmt', tmp], { cwd: root, encoding: 'utf8' });
    assert.equal(first.status, 0, first.stderr);
    const afterFirst = new Map(copied.map(file => [file, readFileSync(file, 'utf8')]));
    const check = spawnSync(process.execPath, [join(root, 'bin', 'lite'), 'fmt', '--check', tmp], { cwd: root, encoding: 'utf8' });
    assert.equal(check.status, 0, check.stdout + check.stderr);
    const second = spawnSync(process.execPath, [join(root, 'bin', 'lite'), 'fmt', tmp], { cwd: root, encoding: 'utf8' });
    assert.equal(second.status, 0, second.stderr);
    for (const file of copied) {
      assert.equal(readFileSync(file, 'utf8'), afterFirst.get(file), `not idempotent on ${file}`);
    }
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test('generated fmt artifact matches tools/src/fmt.lts and passes strict TS checking', () => {
  const sourcePath = join(root, 'tools/src/fmt.lts');
  const compiled = compileTs({ text: readFileSync(sourcePath, 'utf8'), name: 'tools/src/fmt.lts', rootPath: sourcePath });
  assert.equal(compiled.status, 0, compiled.stderr.toString());
  const generated = readFileSync(join(root, 'tools/generated/fmt.ts'), 'utf8');
  assert.equal(compiled.stdout.toString('utf8'), generated);
  const checked = checkTsArtifact(generated);
  assert.equal(checked.status, 0, `${checked.stdout}\n${checked.stderr}`);
});

test('lite fmt CLI handles --version, --help, stdin -, missing args, and directory exclusions', () => {
  const versionRun = spawnSync(process.execPath, [join(root, 'bin', 'lite'), 'fmt', '--version'], { cwd: root, encoding: 'utf8' });
  assert.equal(versionRun.status, 0, versionRun.stderr);
  assert.match(versionRun.stdout, /^lite fmt (?:unassigned|\d+\.\d+\.\d+.*)\n$/);

  const helpRun = spawnSync(process.execPath, [join(root, 'bin', 'lite'), 'fmt', '--help'], { cwd: root, encoding: 'utf8' });
  assert.equal(helpRun.status, 0, helpRun.stderr);
  assert.match(helpRun.stdout, /Usage: \.\/bin\/lite fmt \[--check\] \[FILE_OR_DIR\.\.\. \| -\]/);

  const missingArgs = spawnSync(process.execPath, [join(root, 'bin', 'lite'), 'fmt'], { cwd: root, encoding: 'utf8' });
  assert.equal(missingArgs.status, 2);

  const stdinCheckDirty = spawnSync(process.execPath, [join(root, 'bin', 'lite'), 'fmt', '--check', '-'], {
    cwd: root,
    input: 'if 1<2{\n}\n\n',
    encoding: 'utf8',
  });
  assert.equal(stdinCheckDirty.status, 1);

  const stdinCheckClean = spawnSync(process.execPath, [join(root, 'bin', 'lite'), 'fmt', '--check', '-'], {
    cwd: root,
    input: 'if 1<2 {\n}\n',
    encoding: 'utf8',
  });
  assert.equal(stdinCheckClean.status, 0);

  const tmp = mkdtempSync(join(tmpdir(), 'lite-fmt-exclude-test-'));
  try {
    for (const ignored of ['node_modules', 'dist', '.hidden']) {
      mkdirSync(join(tmp, ignored), { recursive: true });
      writeFileSync(join(tmp, ignored, 'bad.lts'), 'if 1<2{\n}\n\n', 'utf8');
    }
    writeFileSync(join(tmp, 'clean.lts'), 'x := 1;\n', 'utf8');
    const checkIgnored = spawnSync(process.execPath, [join(root, 'bin', 'lite'), 'fmt', '--check', tmp], { cwd: root, encoding: 'utf8' });
    assert.equal(checkIgnored.status, 0, checkIgnored.stdout + checkIgnored.stderr);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test('lite fmt CLI routes through ./bin/lite and supports --check and file formatting', () => {
  const tmp = mkdtempSync(join(tmpdir(), 'lite-fmt-test-'));
  try {
    const sample = join(tmp, 'sample.lts');
    writeFileSync(sample, 'if 1 < 2{\nio.outputLine("hi");\n}\n\n', 'utf8');

    const checkFail = spawnSync(process.execPath, [join(root, 'bin', 'lite'), 'fmt', '--check', sample], {
      cwd: root,
      encoding: 'utf8',
    });
    assert.equal(checkFail.status, 1);

    const writeOk = spawnSync(process.execPath, [join(root, 'bin', 'lite'), 'fmt', sample], {
      cwd: root,
      encoding: 'utf8',
    });
    assert.equal(writeOk.status, 0);

    const checkPass = spawnSync(process.execPath, [join(root, 'bin', 'lite'), 'fmt', '--check', sample], {
      cwd: root,
      encoding: 'utf8',
    });
    assert.equal(checkPass.status, 0);
    assert.equal(readFileSync(sample, 'utf8'), 'if 1 < 2 {\n    io.outputLine("hi");\n}\n');
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test('lite fmt formats subjectless match blocks consistently and passes --check', () => {
  const tmp = mkdtempSync(join(tmpdir(), 'lite-fmt-match-test-'));
  try {
    const sample = join(tmp, 'match.lts');
    writeFileSync(sample, 'match{\ntier==3{\nnote="top tier";\n}\n_{\nnote="other";\n}\n}\n\n', 'utf8');
    const formatted = spawnSync(process.execPath, [join(root, 'bin', 'lite'), 'fmt', sample], {
      cwd: root,
      encoding: 'utf8',
    });
    assert.equal(formatted.status, 0);
    const checkPass = spawnSync(process.execPath, [join(root, 'bin', 'lite'), 'fmt', '--check', sample], {
      cwd: root,
      encoding: 'utf8',
    });
    assert.equal(checkPass.status, 0);
    assert.equal(
      readFileSync(sample, 'utf8'),
      'match {\n    tier==3 {\n        note="top tier";\n    }\n    _ {\n        note="other";\n    }\n}\n',
    );
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test('lite fmt formats narrow numeric width declarations and passes --check', () => {
  const tmp = mkdtempSync(join(tmpdir(), 'lite-fmt-widths-test-'));
  try {
    const sample = join(tmp, 'widths.lts');
    writeFileSync(sample, 'a: Int8 = -128;\nf: Float32 = 0.5;\nxs: List<Int8> = [1, 2];\n\n', 'utf8');
    const formatted = spawnSync(process.execPath, [join(root, 'bin', 'lite'), 'fmt', sample], {
      cwd: root,
      encoding: 'utf8',
    });
    assert.equal(formatted.status, 0);
    const checkPass = spawnSync(process.execPath, [join(root, 'bin', 'lite'), 'fmt', '--check', sample], {
      cwd: root,
      encoding: 'utf8',
    });
    assert.equal(checkPass.status, 0);
    assert.equal(readFileSync(sample, 'utf8'), 'a: Int8 = -128;\nf: Float32 = 0.5;\nxs: List<Int8> = [1, 2];\n');
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test('lite fmt formats tagged loops with then clauses and metadata reads', () => {
  const tmp = mkdtempSync(join(tmpdir(), 'lite-fmt-loop-test-'));
  try {
    const sample = join(tmp, 'tagged_loop.lts');
    writeFileSync(
      sample,
      '@outer loop [1, 2, 3]{\nif .item==2{\nbreak .value+10;\n}\n}then{\n.count+.value\n}\n\n',
      'utf8',
    );
    const formatted = spawnSync(process.execPath, [join(root, 'bin', 'lite'), 'fmt', sample], {
      cwd: root,
      encoding: 'utf8',
    });
    assert.equal(formatted.status, 0);
    const checkPass = spawnSync(process.execPath, [join(root, 'bin', 'lite'), 'fmt', '--check', sample], {
      cwd: root,
      encoding: 'utf8',
    });
    assert.equal(checkPass.status, 0);
    assert.equal(
      readFileSync(sample, 'utf8'),
      '@outer loop [1, 2, 3] {\n    if .item==2 {\n        break .value+10;\n    }\n} then {\n    .count+.value\n}\n',
    );
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test('lite fmt formats construct-level then and finally clauses idempotently', () => {
  const tmp = mkdtempSync(join(tmpdir(), 'lite-fmt-finally-test-'));
  try {
    const sample = join(tmp, 'then_finally.lts');
    writeFileSync(
      sample,
      'io := import "core/io";\n\n\n@outer loop [1, 2]{\nio.outputLine(.item);\n}then{\nio.outputLine("then");\n}finally{\nio.outputLine("fin");\n}\nx := if true{ 1 }else{ 2 }finally{ io.outputLine("cond"); }\n\n',
      'utf8',
    );
    const formatted = spawnSync(process.execPath, [join(root, 'bin', 'lite'), 'fmt', sample], {
      cwd: root,
      encoding: 'utf8',
    });
    assert.equal(formatted.status, 0, formatted.stderr);
    const expected = [
      'io := import "core/io";',
      '',
      '@outer loop [1, 2] {',
      '    io.outputLine(.item);',
      '} then {',
      '    io.outputLine("then");',
      '} finally {',
      '    io.outputLine("fin");',
      '}',
      'x := if true { 1 } else { 2 } finally { io.outputLine("cond"); }',
      '',
    ].join('\n');
    assert.equal(readFileSync(sample, 'utf8'), expected);
    const checkPass = spawnSync(process.execPath, [join(root, 'bin', 'lite'), 'fmt', '--check', sample], {
      cwd: root,
      encoding: 'utf8',
    });
    assert.equal(checkPass.status, 0, checkPass.stderr);
    const secondRun = spawnSync(process.execPath, [join(root, 'bin', 'lite'), 'fmt', sample], {
      cwd: root,
      encoding: 'utf8',
    });
    assert.equal(secondRun.status, 0, secondRun.stderr);
    assert.equal(readFileSync(sample, 'utf8'), expected);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});
