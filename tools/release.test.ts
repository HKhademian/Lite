/** Release requirements distinguish usable tools, compiler previews and language conformance. */
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { root, run, sha256 } from './project.ts';
import { formatReleaseNotes, prepareRelease, releaseProfile } from './release.ts';

test('component readiness does not couple tooling to deferred native or language ports', () => {
  for (const component of ['cli', 'checker', 'tester', 'verifier', 'benchmark', 'release', 'doctor', 'docs', 'vscode'] as const) assert.equal(releaseProfile({ component, version: '0.1.0' }), 'tools');
  assert.equal(releaseProfile(null), 'tools');
  assert.equal(releaseProfile({ component: 'compiler', version: '0.1.0-alpha.1' }), 'compiler');
  assert.equal(releaseProfile({ component: 'igniter', version: '0.1.0-alpha.38' }), 'compiler');
  for (const component of ['project', 'language', 'scripting', 'compiler'] as const) assert.equal(releaseProfile({ component, version: '1.0.0' }), 'language');
});

test('formatReleaseNotes tailors profile summary, verification details, and artifact digests', () => {
  const commit = 'a'.repeat(40);
  const snapshot = formatReleaseNotes({
    label: `snapshot-${commit.slice(0, 12)}`,
    commit,
    profile: 'tools',
    releasedComponent: null,
    archive: `lite-snapshot-${commit.slice(0, 12)}.tar.gz`,
    archiveSha256: '1'.repeat(64),
    manifestSha256: '2'.repeat(64),
    vsix: null,
    bootstrap: null,
  });
  assert.match(snapshot, /Released component\*\*: unpublished snapshot/);
  assert.match(snapshot, /Tool\/source snapshot validated/);
  assert.match(snapshot, new RegExp(`\`${'1'.repeat(64)}\``));
  assert.match(snapshot, new RegExp(`\`${'2'.repeat(64)}\``));
  assert.doesNotMatch(snapshot, /Self-hosting fixed-point ladder/);

  const vscodeNotes = formatReleaseNotes({
    label: 'vscode-v0.1.0',
    commit,
    profile: 'tools',
    releasedComponent: { component: 'vscode', version: '0.1.0' },
    archive: 'lite-vscode-v0.1.0.tar.gz',
    archiveSha256: '3'.repeat(64),
    manifestSha256: '4'.repeat(64),
    vsix: { file: 'lite-0.1.0.vsix', sha256: '5'.repeat(64) },
    bootstrap: null,
  });
  assert.match(vscodeNotes, /Released component\*\*: vscode v0\.1\.0/);
  assert.match(vscodeNotes, /lite-0\.1\.0\.vsix/);
  assert.match(vscodeNotes, new RegExp(`\`${'5'.repeat(64)}\``));

  const bootstrap = {
    ladder: { fixedPoint: true, generations: [1, 2, 3] },
    corpus: { cases: 94, programs: 69, rejections: 25, executions: 69, mismatches: [] },
    support: 'restricted generated-TS subset; consult migration inventory',
  };
  const compilerNotes = formatReleaseNotes({
    label: 'igniter-v0.1.0-alpha.38',
    commit,
    profile: 'compiler',
    releasedComponent: { component: 'igniter', version: '0.1.0-alpha.38' },
    archive: 'lite-igniter-v0.1.0-alpha.38.tar.gz',
    archiveSha256: '6'.repeat(64),
    manifestSha256: '7'.repeat(64),
    vsix: null,
    bootstrap,
  });
  assert.match(compilerNotes, /Compiler preview verified/);
  assert.doesNotMatch(compilerNotes, /Tool\/source snapshot validated/);
  assert.match(compilerNotes, /Self-hosting fixed-point ladder: passed \(3 generations\)/);
  assert.match(compilerNotes, /94 cases \(69 programs, 25 rejections, 69 executions\), mismatches=0/);
  assert.doesNotMatch(compilerNotes, /lite verify --all --no-cache/);

  const languageNotes = formatReleaseNotes({
    label: 'language-v1.0.0',
    commit,
    profile: 'language',
    releasedComponent: { component: 'language', version: '1.0.0' },
    archive: 'lite-language-v1.0.0.tar.gz',
    archiveSha256: '8'.repeat(64),
    manifestSha256: '9'.repeat(64),
    vsix: null,
    bootstrap: { ...bootstrap, support: 'current canonical contracts passed' },
  });
  assert.match(languageNotes, /Language release verified/);
  assert.match(languageNotes, /lite verify --all --no-cache/);
});

test('prepareRelease packages committed HEAD into a verified archive with matching manifest, notes, and SHA256SUMS', () => {
  const work = mkdtempSync(join(tmpdir(), 'lite-release-test-'));
  try {
    const repo = join(work, 'repo');
    const archive = join(work, 'head.tar');
    const output = join(work, 'out');
    const extracted = join(work, 'extracted');
    mkdirSync(repo);
    mkdirSync(extracted);
    writeFileSync(archive, run('git', ['archive', '--format=tar', 'HEAD'], root));
    run('tar', ['-xf', archive, '-C', repo], work);
    run('git', ['init', '-q'], repo);
    run('git', ['config', 'user.name', 'Lite Release Test'], repo);
    run('git', ['config', 'user.email', 'release-test@example.invalid'], repo);
    run('git', ['add', '-A'], repo);
    run('git', ['-c', 'commit.gpgsign=false', 'commit', '-q', '-m', 'snapshot'], repo);
    const head = run('git', ['rev-parse', 'HEAD'], repo).toString().trim();

    const manifest = prepareRelease(repo, output);
    const archiveName = `lite-snapshot-${head.slice(0, 12)}.tar.gz`;
    assert.equal(manifest.commit, head);
    assert.equal(manifest.profile, 'tools');
    assert.equal(manifest.releasedComponent, null);
    assert.ok(existsSync(join(output, archiveName)));

    const manifestText = readFileSync(join(output, 'manifest.json'), 'utf8');
    const notesText = readFileSync(join(output, 'RELEASE-NOTES.md'), 'utf8');
    const sumsText = readFileSync(join(output, 'SHA256SUMS'), 'utf8');

    run('tar', ['-xzf', join(output, archiveName), '-C', extracted], work);
    assert.equal(readFileSync(join(extracted, 'RELEASE.json'), 'utf8'), manifestText);

    const expectedFiles = readdirSync(output).filter(name => name !== 'SHA256SUMS').sort();
    const sumLines = sumsText.trimEnd().split('\n').map(line => {
      const [digest, file] = line.split('  ');
      return { digest, file };
    });
    assert.deepEqual(sumLines.map(entry => entry.file), expectedFiles);
    for (const entry of sumLines) {
      assert.ok(entry.file !== undefined);
      assert.equal(entry.digest, sha256(readFileSync(join(output, entry.file))));
    }

    const archiveDigest = sha256(readFileSync(join(output, archiveName)));
    const manifestDigest = sha256(manifestText);
    assert.match(notesText, new RegExp(`# snapshot-${head.slice(0, 12)}`));
    assert.match(notesText, new RegExp(head));
    assert.match(notesText, new RegExp(archiveName));
    assert.match(notesText, new RegExp(archiveDigest));
    assert.match(notesText, new RegExp(manifestDigest));
    assert.match(notesText, /## Verification/);
    assert.match(notesText, /## Artifacts/);
    assert.match(notesText, /## Verify and extract/);
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
});
