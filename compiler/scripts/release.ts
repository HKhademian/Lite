#!/usr/bin/env node
/** Release packaging only; never edits seeds, tags, versions or published assets. */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildCompiler } from '../host.ts';
import { loadBundle } from '../../igniter/loader.ts';
import { componentVersions, parseComponentTag, selectComponentRelease, type ComponentRelease, type ComponentVersions } from '../release-streams.ts';

const root = fileURLToPath(new URL('../../', import.meta.url));
const targets = ['linux-x64', 'linux-arm64', 'darwin-x64', 'darwin-arm64'];
const [command, directory, inputDirectory] = process.argv.slice(2);
if (directory === undefined || !['prepare', 'native', 'finalize'].includes(command ?? '')) {
  throw new Error('Usage: node compiler/scripts/release.ts prepare|finalize OUT | native OUT SOURCES');
}
const out = resolve(directory);

type Scenario = { name: string; stdin: string; stdout: string; stderr: string; exitCode: number };
type Program = { name: string; cSha256: string; sourceSha256: string; cases: Scenario[] };
type CompilerIdentity = { target: string; sourceSha256: string; artifactSha256: string; builderSha256: string };
type Release = {
  schemaVersion: number; label: string; tag: string | null; commit: string; node: string; typescript: string;
  igniterVersion: string; libraries: string; nativeCompiler: boolean;
  releasedComponent: ComponentRelease | null; componentVersions: ComponentVersions;
  compilers: CompilerIdentity[]; programs: Program[];
};

/** Runs argument arrays directly and rejects failed, timed-out or signalled tools. */
function run(tool: string, args: string[], input?: string | Buffer, cwd = root): Buffer {
  const result = spawnSync(tool, args, {
    cwd, ...(input === undefined ? {} : { input }), timeout: 120000,
    maxBuffer: 128 * 1024 * 1024,
  });
  if (result.error !== undefined) throw result.error;
  if (result.status !== 0 || result.signal !== null) {
    throw new Error(`${tool} ${args.join(' ')} failed (${result.status}, ${result.signal}):\n${result.stdout?.toString()}${result.stderr?.toString()}`);
  }
  return result.stdout;
}
function sha(bytes: string | Buffer): string { return createHash('sha256').update(bytes).digest('hex'); }
function json(path: string, value: unknown): void { writeFileSync(path, JSON.stringify(value, null, 2) + '\n'); }
function readJson(path: string): unknown { return JSON.parse(readFileSync(path, 'utf8')); }
function object(value: unknown): Record<string, unknown> {
  assert(typeof value === 'object' && value !== null && !Array.isArray(value), 'expected an object');
  return value as Record<string, unknown>;
}
function text(value: unknown): string { assert.equal(typeof value, 'string'); return value as string; }
function array(value: unknown): unknown[] { assert(Array.isArray(value)); return value; }
function emptyOutput(): void {
  mkdirSync(out, { recursive: true });
  assert.equal(readdirSync(out).length, 0, `output directory must be empty: ${out}`);
}
function archive(source: string, name: string, entries: string[]): void {
  run('tar', ['-czf', join(out, name), '-C', source, ...entries]);
}
function readRelease(path: string): Release {
  const value = object(readJson(path));
  assert.equal(value['schemaVersion'], 2);
  const label = text(value['label']);
  if (!/^snapshot-[a-f0-9]{12}$/.test(label)) {
    const release = parseComponentTag(label);
    assert.deepEqual(value['releasedComponent'], release);
    assert.equal(object(value['componentVersions'])[release.component], release.version);
  } else assert.equal(value['releasedComponent'], null);
  assert(/^[a-f0-9]{40}$/.test(text(value['commit'])));
  array(value['programs']);
  return value as Release;
}
/** Resolves hashed fixture streams without changing newline or Unicode bytes. */
function stream(value: unknown, fixtures: string): Buffer {
  if (value === undefined) return Buffer.alloc(0);
  const record = object(value);
  let bytes: Buffer;
  if (record['text'] !== undefined) bytes = Buffer.from(text(record['text']));
  else if (record['file'] !== undefined) {
    const file = text(record['file']);
    assert.equal(basename(file), file);
    bytes = readFileSync(join(fixtures, file));
  } else {
    const values = array(record['bytes']);
    assert(values.every(byte => typeof byte === 'number' && Number.isInteger(byte) && byte >= 0 && byte <= 255));
    bytes = Buffer.from(values as number[]);
  }
  assert.equal(record['hash'], `sha256:${sha(bytes)}`);
  return bytes;
}

function prepare(): void {
  emptyOutput();
  assert.equal(run('git', ['status', '--porcelain']).toString().trim(), '', 'release preparation requires a clean checkout');
  const commit = run('git', ['rev-parse', 'HEAD']).toString().trim();
  const tag = process.env['GITHUB_REF_TYPE'] === 'tag' ? process.env['GITHUB_REF_NAME'] : undefined;
  if (tag !== undefined) {
    parseComponentTag(tag);
    assert.equal(run('git', ['cat-file', '-t', `refs/tags/${tag}`]).toString().trim(), 'tag', 'release tags must be annotated');
    assert.equal(run('git', ['rev-parse', `refs/tags/${tag}^{commit}`]).toString().trim(), commit);
  }
  const label = tag ?? `snapshot-${commit.slice(0, 12)}`;
  const igniterVersion = text(object(readJson(join(root, 'igniter/package.json')))['version']);
  const versions = componentVersions(readJson(join(root, 'config/versions.json')), igniterVersion);
  const releasedComponent = selectComponentRelease(tag, versions);
  run(process.execPath, [join(root, 'igniter/node_modules/typescript/bin/tsc'), '-p', join(root, 'compiler/bootstrap/tsconfig.json')]);
  const work = mkdtempSync(join(tmpdir(), 'lite-release-'));
  try {
    const source = join(work, 'source');
    const generated = join(source, 'release');
    const c = join(work, 'c');
    mkdirSync(source);
    mkdirSync(c);
    const sourceTar = join(work, 'source.tar');
    writeFileSync(sourceTar, run('git', ['archive', '--format=tar', commit]));
    run('tar', ['-xf', sourceTar, '-C', source]);
    assert(!existsSync(generated), 'release/ is reserved for generated release content');
    mkdirSync(generated);
    const compilers: CompilerIdentity[] = [];
    for (const target of ['ts', 'c'] as const) {
      const built = buildCompiler(target);
      const bundle = loadBundle(join(root, 'compiler/manifests', `${target}.json`));
      const regenerated = run(process.execPath, [join(root, 'compiler/entry.ts'), buildCompiler('ts').path], bundle.text);
      assert.equal(sha(regenerated), built.artifactSha256, `${target} compiler rebuild must be byte-identical`);
      copyFileSync(built.path, join(generated, `${target}-compiler.ts`));
      writeFileSync(join(generated, `${target}-source.lts`), bundle.text);
      json(join(generated, `${target}-line-map.json`), bundle.lineMap);
      const { sourceSha256, artifactSha256, builderSha256 } = built;
      compilers.push({ target, sourceSha256, artifactSha256, builderSha256 });
    }
    const programs: Program[] = [];
    const fixtures = join(root, 'igniter/tests/compiler');
    const cCompiler = join(generated, 'c-compiler.ts');
    for (const file of readdirSync(fixtures).filter(file => /^001-.*\.json$/.test(file)).sort()) {
      const fixture = object(readJson(join(fixtures, file)));
      const name = file.slice(0, -5);
      const sourceBytes = stream(fixture['source'], fixtures);
      const emitted = run(process.execPath, [join(root, 'compiler/entry.ts'), cCompiler], sourceBytes);
      writeFileSync(join(c, `${name}.c`), emitted);
      writeFileSync(join(c, `${name}.lts`), sourceBytes);
      const cases = array(fixture['cases']).map(value => {
        const scenario = object(value);
        const exitCode = scenario['exitCode'];
        assert(typeof exitCode === 'number' && Number.isInteger(exitCode) && exitCode >= 0 && exitCode <= 255);
        return {
          name: text(scenario['name']), stdin: stream(scenario['stdin'], fixtures).toString('base64'),
          stdout: stream(scenario['stdout'], fixtures).toString('base64'),
          stderr: stream(scenario['stderr'], fixtures).toString('base64'), exitCode,
        };
      });
      programs.push({ name, cSha256: sha(emitted), sourceSha256: sha(sourceBytes), cases });
    }
    assert(programs.length > 0, 'no C programs packaged');
    const release: Release = {
      schemaVersion: 2, label, tag: tag ?? null, commit, node: process.version,
      typescript: text(object(readJson(join(root, 'igniter/node_modules/typescript/package.json')))['version']), igniterVersion,
      libraries: 'provisional lib/core; no stable stdlib version or ABI assigned',
      nativeCompiler: false, compilers, programs,
      releasedComponent, componentVersions: versions,
    };
    json(join(out, 'release.json'), release);
    json(join(generated, 'release.json'), release);
    json(join(c, 'release.json'), release);
    copyFileSync(join(root, 'docs/release-automation.md'), join(source, 'IGNITER.md'));
    archive(source, `lite-${label}-igniter.tar.gz`, ['.']);
    archive(source, `lite-${label}-libraries.tar.gz`, ['lib', 'release/release.json']);
    archive(c, `lite-${label}-generated-c.tar.gz`, ['.']);
    process.stdout.write(`Packaged ${label} at ${commit}: both compilers rebuilt; ${programs.length} C programs.\n`);
  } finally { rmSync(work, { recursive: true, force: true }); }
}

function native(): void {
  assert(inputDirectory !== undefined, 'native requires the source artifact directory');
  emptyOutput();
  const input = resolve(inputDirectory);
  const release = readRelease(join(input, 'release.json'));
  const target = `${process.platform}-${process.arch}`;
  assert(targets.includes(target), `unsupported native target: ${target}`);
  if (process.env['RELEASE_TARGET'] !== undefined) assert.equal(process.env['RELEASE_TARGET'], target);
  const work = mkdtempSync(join(tmpdir(), 'lite-native-'));
  try {
    run('tar', ['-xf', join(input, `lite-${release.label}-generated-c.tar.gz`), '-C', work]);
    assert.deepEqual(readJson(join(work, 'release.json')), release);
    const bin = join(work, 'bin');
    mkdirSync(bin);
    const cc = process.env['CC'] ?? 'cc';
    const flags = ['-std=c11', '-O2', '-Wall', '-Wextra', '-Werror'];
    const linkFlags = ['-lm'];
    for (const program of release.programs) {
      assert(/^001-[a-z0-9-]+$/.test(program.name));
      const source = join(work, `${program.name}.c`);
      assert.equal(sha(readFileSync(source)), program.cSha256);
      const executable = join(bin, program.name);
      run(cc, [...flags, source, '-o', executable, ...linkFlags]);
      for (const scenario of program.cases) {
        const result = spawnSync(executable, [], { input: Buffer.from(scenario.stdin, 'base64'), timeout: 10000 });
        if (result.error !== undefined) throw result.error;
        const label = `${program.name}/${scenario.name}`;
        assert.equal(result.signal, null, label);
        assert.equal(result.status, scenario.exitCode, label);
        assert.deepEqual(result.stdout, Buffer.from(scenario.stdout, 'base64'), `${label} stdout`);
        assert.deepEqual(result.stderr, Buffer.from(scenario.stderr, 'base64'), `${label} stderr`);
      }
    }
    const report = {
      label: release.label, commit: release.commit, target, node: process.version,
      compiler: run(cc, ['--version']).toString(), flags: [...flags, ...linkFlags],
      runnerImage: process.env['ImageVersion'] ?? null,
      programs: release.programs.map(program => ({
        name: program.name, cSha256: program.cSha256,
        binarySha256: sha(readFileSync(join(bin, program.name))), scenarios: program.cases.length,
      })),
    };
    json(join(out, `native-${target}.json`), report);
    json(join(work, 'build.json'), report);
    archive(work, `lite-${release.label}-${target}.tar.gz`, ['bin', 'build.json', 'release.json']);
    process.stdout.write(`${target}: built and verified ${release.programs.length} C programs.\n`);
  } finally { rmSync(work, { recursive: true, force: true }); }
}

function finalize(): void {
  const release = readRelease(join(out, 'release.json'));
  assert.equal(release.commit, run('git', ['rev-parse', 'HEAD']).toString().trim());
  const nativeReports = targets.map(target => {
    const report = object(readJson(join(out, `native-${target}.json`)));
    assert.equal(report['target'], target);
    assert.equal(report['commit'], release.commit);
    assert.equal(report['label'], release.label);
    const programs = array(report['programs']).map(object);
    assert.deepEqual(programs.map(program => [program['name'], program['cSha256'], program['scenarios']]),
      release.programs.map(program => [program.name, program.cSha256, program.cases.length]));
    assert(existsSync(join(out, `lite-${release.label}-${target}.tar.gz`)));
    return report;
  });
  const archives = readdirSync(out).filter(file => file.endsWith('.tar.gz')).sort();
  assert.equal(archives.length, targets.length + 3);
  json(join(out, 'manifest.json'), {
    ...release, nativeReports,
    assets: archives.map(file => ({ file, sha256: sha(readFileSync(join(out, file))) })),
    workflowRun: process.env['GITHUB_RUN_ID'] ?? null,
  });
  writeFileSync(join(out, 'RELEASE-NOTES.md'), `Igniter snapshot ${release.label}\n\n` +
    (release.releasedComponent === null ? 'Unpublished source snapshot.\n\n' :
      `Released component: ${release.releasedComponent.component} ${release.releasedComponent.version}. Other component versions advance independently.\n\n`) +
    `Source commit: ${release.commit}. Igniter package: ${release.igniterVersion}.\n\n` +
    `Component versions: ${Object.entries(release.componentVersions).map(([component, version]) => `${component}=${version ?? 'unassigned'}`).join(', ')}.\n\n` +
    'The igniter archive contains the complete source tree, igniter, provisional libraries, generated TS compiler seeds, flattened compiler sources, line maps and rebuild instructions.\n\n' +
    `Generated C and ${targets.join(', ')} executables cover ${release.programs.length} admitted compiler test programs. These executables are conformance programs; a native self-hosting C compiler is not available yet. Libraries remain provisional, without a stable stdlib API or ABI.\n\n` +
    'See IGNITER.md in the igniter archive. manifest.json records source/builder hashes and native toolchains; SHA256SUMS covers every other release asset. Native binaries depend on their runner OS/libc and are not signed.\n');
  const files = readdirSync(out).filter(file => file !== 'SHA256SUMS').sort();
  writeFileSync(join(out, 'SHA256SUMS'), files.map(file => `${sha(readFileSync(join(out, file)))}  ${file}\n`).join(''));
  process.stdout.write(`Verified ${targets.length} native targets and wrote the release manifest/checksums.\n`);
}

if (command === 'prepare') prepare();
else if (command === 'native') native();
else finalize();
