/** Component-specific source distributions; never creates tags or rewrites releases. */
import assert from 'node:assert/strict';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { selectComponentRelease, type ComponentRelease } from '../compiler/release-streams.ts';
import { root, run, sha256, versions } from './project.ts';

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
    let bootstrap: unknown = null;
    if (profile !== 'tools') {
      const dependencies = join(directory, 'igniter/node_modules');
      assert(existsSync(dependencies), 'install locked igniter development dependencies for compiler release verification');
      symlinkSync(dependencies, join(source, 'igniter/node_modules'));
      try {
        const ladderDirectory = join(work, 'ladder');
        const ladder = JSON.parse(run(process.execPath, [join(source, 'compiler/scripts/self-host.ts'), '--out', ladderDirectory], source).toString()) as { fixedPoint: boolean; generations: unknown[] };
        assert(ladder.fixedPoint, 'compiler release requires a generated fixed point');
        const corpus = JSON.parse(run(process.execPath, [join(source, 'compiler/scripts/corpus-parity.ts'), '--artifact', join(ladderDirectory, 'generation-3.ts')], source).toString()) as { mismatches: unknown[] };
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
      profile, node: process.version, bootstrap, nativeCompiler: false, vsix };
    const record = JSON.stringify(manifest, null, 2) + '\n';
    assert(!existsSync(join(source, 'RELEASE.json')), 'RELEASE.json is reserved for packaged metadata');
    writeFileSync(join(source, 'RELEASE.json'), record);
    const archive = `lite-${label}.tar.gz`;
    run('tar', ['-czf', join(work, archive), '-C', source, '.'], work);
    const extracted = join(work, 'extracted'); mkdirSync(extracted);
    run('tar', ['-xf', join(work, archive), '-C', extracted], work);
    run(process.execPath, [join(extracted, 'bin/lite'), 'doctor', '--docs'], extracted);
    // The distribution runs generated code with Node alone, without Git or npm packages.
    const emitted = run(process.execPath, [join(extracted, 'bin/litec'), 'igniter/tests/compiler/001-001-report-int-42.lts'], extracted);
    const program = join(work, 'hello.ts'); writeFileSync(program, emitted);
    assert.equal(run(process.execPath, [join(extracted, 'compiler/entry.ts'), program], extracted).toString(), '42\n');
    mkdirSync(output, { recursive: true });
    copyFileSync(join(work, archive), join(output, archive));
    if (vsix) copyFileSync(join(work, vsix.file), join(output, vsix.file));
    writeFileSync(join(output, 'manifest.json'), record);
    writeFileSync(join(output, 'RELEASE-NOTES.md'), `# ${label}\n\nSource: ${commit}\n\nReleased component: ${releasedComponent?.component ?? 'unpublished snapshot'}.\n\nReadiness profile: ${profile}. Native C remains deferred. Tool/source snapshots do not establish full language conformance.\n\nSee docs/start-here.md, docs/release-automation.md and compiler/transition-plan.md in the archive.\n`);
    writeFileSync(join(output, 'SHA256SUMS'), readdirSync(output).sort().map(file => `${sha256(readFileSync(join(output, file)))}  ${file}\n`).join(''));
    return manifest;
  } finally { rmSync(work, { recursive: true, force: true }); }
}

if (import.meta.main) {
  try {
    const [output, tag, ...extra] = process.argv.slice(2);
    assert(output !== undefined && extra.length === 0, 'usage: lite release OUTPUT [TAG]');
    prepareRelease(root, resolve(output), tag);
    console.log('Release prepared.');
  } catch (error) { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; }
}
