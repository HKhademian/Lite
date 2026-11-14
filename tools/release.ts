/** Component-specific source distributions; never creates tags or rewrites releases. */
import assert from 'node:assert/strict';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { selectComponentRelease, type ComponentRelease } from '../compiler/release-streams.ts';
import { root, run, sha256, versions } from './project.ts';
import { showToolVersion } from './tool-version.ts';

/** Supported compiler/language readiness verification summary attached to compiler and language distributions. */
export type ReleaseBootstrapSummary = Readonly<{
  ladder: Readonly<{ fixedPoint: boolean; generations: readonly unknown[] }>;
  corpus: Readonly<{ cases?: number; programs?: number; rejections?: number; executions?: number; mismatches: readonly unknown[] }>;
  support: string;
}>;

/** Inputs used to render human-readable release notes for packaged archives and GitHub releases. */
export type ReleaseNotesInput = Readonly<{
  label: string;
  commit: string;
  profile: 'tools' | 'compiler' | 'language';
  releasedComponent: ComponentRelease | null;
  archive: string;
  archiveSha256: string;
  manifestSha256: string;
  vsix: Readonly<{ file: string; sha256: string }> | null;
  bootstrap: ReleaseBootstrapSummary | null;
}>;

const profileSummaries: Record<'tools' | 'compiler' | 'language', string> = {
  tools: 'Tool/source snapshot validated for CLI, docs, and extracted TS compilation; does not establish full language conformance.',
  compiler: 'Compiler preview verified across the three-generation fixed-point bootstrap ladder and recorded corpus contracts; native C remains deferred.',
  language: 'Language release verified across the three-generation bootstrap ladder, recorded corpus contracts, and full `lite verify --all --no-cache` conformance.',
};

/** Renders concise Markdown release notes describing component identity, verification evidence, and SHA-256 artifacts. */
export function formatReleaseNotes(input: ReleaseNotesInput): string {
  const componentText = input.releasedComponent === null
    ? 'unpublished snapshot'
    : `${input.releasedComponent.component} v${input.releasedComponent.version}`;
  const verificationLines = [
    '- Extracted archive validated with `./bin/lite doctor --docs`',
    '- Node-only TypeScript emission & execution roundtrip verified on `001-001-report-int-42.lts` (output `42`)',
  ];
  if (input.bootstrap !== null) {
    const gens = input.bootstrap.ladder.generations.length;
    const corpusStats = input.bootstrap.corpus.cases === undefined
      ? `mismatches=${input.bootstrap.corpus.mismatches.length}`
      : `${input.bootstrap.corpus.cases} cases (${input.bootstrap.corpus.programs ?? 0} programs, ${input.bootstrap.corpus.rejections ?? 0} rejections, ${input.bootstrap.corpus.executions ?? 0} executions), mismatches=${input.bootstrap.corpus.mismatches.length}`;
    verificationLines.push(
      `- Self-hosting fixed-point ladder: ${input.bootstrap.ladder.fixedPoint ? 'passed' : 'failed'} (${gens} generations)`,
      `- Generated corpus parity: ${corpusStats}`,
    );
    if (input.profile === 'language') {
      verificationLines.push('- Full repository verification: `./bin/lite verify --all --no-cache` passed');
    }
    verificationLines.push(`- Embedded archive evidence: \`release/compiler.ts\`, \`release/compiler-source.lts\`, \`release/verification.json\` (${input.bootstrap.support})`);
  }
  const artifactLines = [
    `- \`${input.archive}\` — sha256: \`${input.archiveSha256}\``,
    ...(input.vsix === null ? [] : [`- \`${input.vsix.file}\` — sha256: \`${input.vsix.sha256}\``]),
    `- \`manifest.json\` — sha256: \`${input.manifestSha256}\``,
    '- `RELEASE-NOTES.md` — these release notes',
    '- `SHA256SUMS` — checksum manifest for all release files',
  ];
  return [
    `# ${input.label}`,
    '',
    `- **Source commit**: \`${input.commit}\``,
    `- **Released component**: ${componentText}`,
    `- **Readiness profile**: \`${input.profile}\` — ${profileSummaries[input.profile]}`,
    '- **Native C backend**: deferred (`nativeCompiler: false`)',
    '',
    '## Verification',
    '',
    ...verificationLines,
    '',
    '## Artifacts',
    '',
    ...artifactLines,
    '',
    '## Verify and extract',
    '',
    '```sh',
    'shasum -a 256 -c SHA256SUMS',
    `mkdir -p lite-${input.label} && tar -xzf ${input.archive} -C lite-${input.label}`,
    `cd lite-${input.label} && ./bin/lite doctor --docs`,
    '```',
    '',
    'See `docs/start-here.md`, `docs/release-automation.md`, and `compiler/transition-plan.md` in the archive.',
    '',
  ].join('\n');
}

/** Tool releases validate their own surface; language releases also require full conformance. */
export function releaseProfile(release: ComponentRelease | null): 'tools' | 'compiler' | 'language' {
  if (release === null || ['cli', 'checker', 'tester', 'verifier', 'benchmark', 'release', 'docs', 'vscode', 'doctor', 'formatter', 'linker'].includes(release.component)) return 'tools';
  if (['project', 'language', 'scripting'].includes(release.component) || (release.component === 'compiler' && !release.version.includes('-'))) return 'language';
  return 'compiler';
}

/** Package the committed revision, validate extracted bytes, then expose checksummed assets. */
export function prepareRelease(directory: string, output: string, tag?: string) {
  assert(run('git', ['status', '--porcelain'], directory).length === 0, 'release needs a clean committed checkout');
  const commit = run('git', ['rev-parse', 'HEAD'], directory).toString().trim();
  const current = versions(directory);
  const releasedComponent = selectComponentRelease(tag, current);
  if (tag !== undefined) {
    assert(run('git', ['cat-file', '-t', `refs/tags/${tag}`], directory).toString().trim() === 'tag', 'release tags must be annotated');
    assert(run('git', ['rev-parse', `refs/tags/${tag}^{commit}`], directory).toString().trim() === commit, 'release tag must point at HEAD');
  }
  assert(!existsSync(output) || readdirSync(output).length === 0, 'release output directory must be empty');
  const profile = releaseProfile(releasedComponent);
  const work = mkdtempSync(join(tmpdir(), 'lite-release-'));
  try {
    const source = join(work, 'source'); mkdirSync(source);
    const tar = join(work, 'source.tar');
    writeFileSync(tar, run('git', ['archive', '--format=tar', commit], directory));
    run('tar', ['-xf', tar, '-C', source], work);
    run(process.execPath, [join(source, 'bin/lite'), 'doctor', '--docs'], source);
    let bootstrap: ReleaseBootstrapSummary | null = null;
    if (profile !== 'tools') {
      const dependencies = join(directory, 'igniter/node_modules');
      assert(existsSync(dependencies), 'install locked igniter development dependencies for compiler release verification');
      symlinkSync(dependencies, join(source, 'igniter/node_modules'));
      try {
        const ladderDirectory = join(work, 'ladder');
        const ladder = JSON.parse(run(process.execPath, [join(source, 'compiler/scripts/self-host.ts'), '--out', ladderDirectory], source).toString()) as { fixedPoint: boolean; generations: unknown[] };
        assert(ladder.fixedPoint, 'compiler release requires a generated fixed point');
        const corpus = JSON.parse(run(process.execPath, [join(source, 'compiler/scripts/corpus-parity.ts'), '--artifact', join(ladderDirectory, 'generation-3.ts')], source).toString()) as ReleaseBootstrapSummary['corpus'];
        assert.equal(corpus.mismatches.length, 0);
        if (profile === 'language') run(process.execPath, [join(source, 'bin/lite'), 'verify', '--all', '--no-cache'], source);
        bootstrap = { ladder, corpus, support: profile === 'language' ? 'current canonical contracts passed' : 'restricted generated-TS subset; consult migration inventory' };
        assert(!existsSync(join(source, 'release')), 'release/ is reserved for generated distribution evidence');
        mkdirSync(join(source, 'release'));
        copyFileSync(join(ladderDirectory, 'generation-3.ts'), join(source, 'release/compiler.ts'));
        copyFileSync(join(ladderDirectory, 'S.lts'), join(source, 'release/compiler-source.lts'));
        writeFileSync(join(source, 'release/verification.json'), JSON.stringify(bootstrap, null, 2) + '\n');
      } finally { rmSync(join(source, 'igniter/node_modules'), { force: true }); rmSync(join(source, '.cache'), { recursive: true, force: true }); }
    }
    let vsix: { file: string; sha256: string } | null = null;
    if (releasedComponent?.component === 'vscode') {
      const packager = join(directory, 'editors/vscode/node_modules/@vscode/vsce/vsce');
      assert(existsSync(packager), 'install locked editor packaging dependencies');
      const file = `lite-${releasedComponent.version}.vsix`;
      run(process.execPath, [packager, 'package', '--no-dependencies', '--allow-missing-repository', '--skip-license', '--out', join(work, file)], join(source, 'editors/vscode'));
      vsix = { file, sha256: sha256(readFileSync(join(work, file))) };
    }
    const label = tag ?? `snapshot-${commit.slice(0, 12)}`;
    const manifest = { schemaVersion: 3, tag: tag ?? null, commit, releasedComponent, componentVersions: current,
      profile, bootstrap, nativeCompiler: false, vsix };
    const record = JSON.stringify(manifest, null, 2) + '\n';
    assert(!existsSync(join(source, 'RELEASE.json')), 'RELEASE.json is reserved for packaged metadata');
    writeFileSync(join(source, 'RELEASE.json'), record);
    const archive = `lite-${label}.tar.gz`;
    run('tar', ['-czf', join(work, archive), '-C', source, '.'], work);
    const extracted = join(work, 'extracted'); mkdirSync(extracted);
    run('tar', ['-xf', join(work, archive), '-C', extracted], work);
    run(process.execPath, [join(extracted, 'bin/lite'), 'doctor', '--docs'], extracted);
    // The distribution runs generated code with Node alone, without Git or npm packages.
    const emitted = run(process.execPath, [join(extracted, 'bin/lite-compile'), 'igniter/tests/compiler/001-001-report-int-42.lts'], extracted);
    const program = join(work, 'hello.ts'); writeFileSync(program, emitted);
    assert.equal(run(process.execPath, [join(extracted, 'compiler/entry.ts'), program], extracted).toString(), '42\n');
    const archiveBytes = readFileSync(join(work, archive));
    const archiveSha256 = sha256(archiveBytes);
    const manifestSha256 = sha256(record);
    mkdirSync(output, { recursive: true });
    copyFileSync(join(work, archive), join(output, archive));
    if (vsix) copyFileSync(join(work, vsix.file), join(output, vsix.file));
    writeFileSync(join(output, 'manifest.json'), record);
    writeFileSync(join(output, 'RELEASE-NOTES.md'), formatReleaseNotes({
      label, commit, profile, releasedComponent, archive, archiveSha256, manifestSha256, vsix, bootstrap,
    }));
    writeFileSync(join(output, 'SHA256SUMS'), readdirSync(output).sort().map(file => `${sha256(readFileSync(join(output, file)))}  ${file}\n`).join(''));
    return manifest;
  } finally { rmSync(work, { recursive: true, force: true }); }
}

if (import.meta.main) {
  try {
    if (showToolVersion('release', 'release')) process.exit(0);
    const [output, tag, ...extra] = process.argv.slice(2);
    assert(output !== undefined && extra.length === 0, 'usage: lite release OUTPUT [TAG]');
    prepareRelease(root, resolve(output), tag);
    console.log('Release prepared.');
  } catch (error) { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; }
}
