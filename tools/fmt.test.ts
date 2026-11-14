/** Unit and CLI tests for lite fmt. */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
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
  for (const dir of ['language/examples', 'samples', 'lib/core', 'lib/extra']) {
    const absDir = join(root, dir);
    for (const full of collectLiteFiles(absDir)) {
      const src = readFileSync(full, 'utf8');
      const once = formatLite(src);
      assert.equal(formatLite(once), once, `not idempotent on ${full}`);
    }
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
      '@outer loop [1,2,3] {if .item==2 {break .value+10;}} then {.count+.value}\n',
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
