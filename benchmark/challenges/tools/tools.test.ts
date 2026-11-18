/** Boundary checks for Lite-migrated challenge download and metadata utilities. */
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { createServer } from 'node:http';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { checkTsArtifact, compileTs, runTsArtifact } from '../../../igniter/artifacts.ts';

const root = fileURLToPath(new URL('../../../', import.meta.url));

test('challenge utilities preserve ties-to-even rounding and HTML entity decoding', () => {
  const probe = `
    fs := import "core/file";
    io := import "core/io";
    cbuild := import "${join(root, 'lib/util/challenge-build.lts').replaceAll('\\', '/')}";
    ch := import "${join(root, 'lib/util/challenges.lts').replaceAll('\\', '/')}";
    entities := fs.readText("${join(root, 'benchmark/challenges/tools/html-entities.json').replaceAll('\\', '/')}");
    io.outputLine(
      cbuild.roundDivTiesEven(5, 2),
      cbuild.roundDivTiesEven(7, 2),
      cbuild.roundDivTiesEven(125, 100),
      cbuild.roundDivTiesEven(135, 100),
      cbuild.roundDivTiesEven(2675, 1000),
      cbuild.roundDivTiesEven(-2675, 1000)
    );
    decoded1 := ch.unescapeChallengeHtml(entities.text, "&lt;x&gt; &amp; &NotEqualTilde; &#x1F642; &#128; &notit; &unknown;");
    decoded2 := ch.unescapeChallengeHtml(entities.text, "&#0; &#xD800; &#x110000; &#11;");
    io.outputLine(decoded1);
    io.outputLine(decoded2);
  `;
  const compiled = compileTs({ text: probe, name: 'challenge-util-probe.lts', cwd: root });
  assert.equal(compiled.status, 0, compiled.stderr.toString('utf8'));
  const ts = compiled.stdout.toString('utf8');
  assert.equal(checkTsArtifact(ts).status, 0);
  const run = runTsArtifact(ts);
  assert.equal(run.status, 0, run.stderr.toString('utf8'));
  assert.equal(
    run.stdout.toString('utf8'),
    '2 4 1 1 3 -3\n<x> & ≂̸ 🙂 € ¬it; &unknown;\n\ufffd \ufffd \ufffd \n',
  );
});

test('downloadFile retries rate limits, publishes complete files, reuses cache, and admits missing optional pages', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'lite-download-test-'));
  let mode: 'rateLimitThenOk' | 'notFound' | 'serverError' = 'rateLimitThenOk';
  let hits = 0;
  const server = createServer((_req, res) => {
    hits += 1;
    if (mode === 'rateLimitThenOk') {
      if (hits === 1) {
        res.writeHead(429, { 'Retry-After': '0' });
        res.end('');
        return;
      }
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('complete payload');
      return;
    }
    if (mode === 'notFound') {
      res.writeHead(404);
      res.end('');
      return;
    }
    res.writeHead(503);
    res.end('');
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const addr = server.address();
  assert(addr !== null && typeof addr !== 'string');
  const baseUrl = `http://127.0.0.1:${addr.port}`;

  try {
    const pagePath = join(directory, 'page.html');
    const missingPath = join(directory, 'missing.html');
    const runner = join(directory, 'runner.ts');
    const execAsync = async (file: string) => new Promise<{ status: number; stdout: string; stderr: string }>((resolve) => {
      execFile(process.execPath, [file], { encoding: 'utf8', timeout: 30_000 }, (err, stdout, stderr) => {
        const code = err && 'code' in err && typeof err.code === 'number' ? err.code : 0;
        resolve({ status: code, stdout, stderr });
      });
    });
    const probe = `
      io := import "core/io";
      cfetch := import "${join(root, 'lib/util/challenge-fetch.lts').replaceAll('\\', '/')}";
      r1 := cfetch.downloadFile("${baseUrl}/page", "${pagePath.replaceAll('\\', '/')}", false, 2, 5000, 0, false, true);
      io.outputLine("r1:", r1.ok, r1.skipped);
      r2 := cfetch.downloadFile("${baseUrl}/page", "${pagePath.replaceAll('\\', '/')}", false, 2, 5000, 0, false, true);
      io.outputLine("r2:", r2.ok, r2.skipped);
    `;
    const compiled = compileTs({ text: probe, name: 'challenge-fetch-probe.lts', cwd: root });
    assert.equal(compiled.status, 0, compiled.stderr.toString('utf8'));
    const ts = compiled.stdout.toString('utf8');
    assert.equal(checkTsArtifact(ts).status, 0);
    writeFileSync(runner, ts, 'utf8');

    const executed = await execAsync(runner);
    assert.equal(executed.status, 0, executed.stderr);
    assert.equal(hits, 2); // first attempt 429, second 200; r2 hit local cache!
    assert.equal(readFileSync(pagePath, 'utf8'), 'complete payload');
    assert.equal(existsSync(pagePath + '.tmp'), false);

    // Also exercise allowMissing 404 and failure 503 with fresh invocations so async server serves both:
    mode = 'notFound';
    const probe404 = `
      io := import "core/io";
      cfetch := import "${join(root, 'lib/util/challenge-fetch.lts').replaceAll('\\', '/')}";
      r := cfetch.downloadFile("${baseUrl}/missing", "${missingPath.replaceAll('\\', '/')}", false, 2, 5000, 0, true, false);
      io.outputLine(r.ok, r.skipped);
    `;
    const c404 = compileTs({ text: probe404, name: 'probe-404.lts', cwd: root });
    assert.equal(c404.status, 0);
    writeFileSync(runner, c404.stdout.toString('utf8'), 'utf8');
    const out404 = await execAsync(runner);
    assert.equal(out404.status, 0, out404.stderr);
    assert.equal(out404.stdout, 'true true\n');
    assert.equal(existsSync(missingPath), false);

    mode = 'serverError';
    const probe503 = `
      io := import "core/io";
      cfetch := import "${join(root, 'lib/util/challenge-fetch.lts').replaceAll('\\', '/')}";
      r := cfetch.downloadFile("${baseUrl}/failing", "${missingPath.replaceAll('\\', '/')}", false, 1, 5000, 0, false, false);
      io.outputLine(r.ok, r.error);
    `;
    const c503 = compileTs({ text: probe503, name: 'probe-503.lts', cwd: root });
    assert.equal(c503.status, 0);
    writeFileSync(runner, c503.stdout.toString('utf8'), 'utf8');
    const out503 = await execAsync(runner);
    assert.equal(out503.status, 0, out503.stderr);
    assert.match(out503.stdout, /^false failed to fetch .*HTTP 503\n$/);
  } finally {
    await new Promise<void>(resolve => server.close(() => resolve()));
    rmSync(directory, { recursive: true, force: true });
  }
});
