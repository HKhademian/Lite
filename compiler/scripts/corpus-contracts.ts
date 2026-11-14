/** Recorded corpus contracts and generated TS execution; no live interpreter. */
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { buildCompiler, invokeCompilerArtifact } from '../host.ts';
import { checkTsArtifact, prepareTsArtifacts, type ArtifactRun } from '../../igniter/artifacts.ts';
import { compilerFixtures, type CompilerFixture } from '../../igniter/test-fixtures.ts';
import { repository, hashBytes } from './tooling.ts';

export type ArtifactContract = Readonly<{ ts: string; c: string }>;
/** Runtime streams/status come from manifests; compiler artifacts come from independently recorded hashes. */
export function corpusContracts(): { fixtures: readonly CompilerFixture[]; artifacts: ReadonlyMap<string, ArtifactContract> } {
  const record = JSON.parse(readFileSync(join(repository, 'compiler/tests/references/generated/current-artifacts.json'), 'utf8')) as {
    sourceSha256: string; artifacts: { name: string; ts: string; c: string }[];
  };
  if (record.sourceSha256 !== buildCompiler('ts').sourceSha256) throw new Error('recorded corpus artifacts do not match current Lite compiler source; review their contracts first');
  const artifacts = new Map(record.artifacts.map(row => [row.name, { ts: row.ts, c: row.c }]));
  for (const fixture of compilerFixtures) if (fixture.category === 'program' && !artifacts.has(fixture.name)) throw new Error(`missing artifact contract: ${fixture.name}`);
  return { fixtures: compilerFixtures, artifacts };
}
export function compilerContractMatches(fixture: CompilerFixture, result: Pick<ArtifactRun, 'status' | 'signal' | 'stdout' | 'stderr'>, artifacts: ReadonlyMap<string, ArtifactContract>): boolean {
  if (result.signal !== null) return false;
  if (fixture.category === 'rejected') return result.status === fixture.exitCode && result.stdout.equals(fixture.stdout) && result.stderr.equals(fixture.stderr);
  return result.status === 0 && result.stderr.length === 0 && 'sha256:' + hashBytes(result.stdout) === artifacts.get(fixture.name)?.ts;
}
/** Compile each distinct source and then strictly check/run every admitted scenario. */
export function validateCorpus(artifact: string): { cases: number; programs: number; rejections: number; executions: number; mismatches: string[] } {
  const { fixtures, artifacts } = corpusContracts();
  const checked = checkTsArtifact(readFileSync(artifact, 'utf8'));
  if (checked.status !== 0 || checked.signal !== null) throw new Error(`strict compiler check failed:\n${checked.stdout}${checked.stderr}`);
  const programs: { fixture: CompilerFixture; source: string }[] = []; const mismatches: string[] = [];
  const compiled = new Map<string, ArtifactRun>();
  let rejections = 0;
  for (const fixture of fixtures) {
    const sourcePath = resolve(repository, 'igniter/tests/compiler', fixture.sourcePath ?? fixture.file.replace(/\.json$/, '.lts'));
    const key = sourcePath + '\0' + fixture.source;
    let actual = compiled.get(key);
    if (actual === undefined) {
      const result = invokeCompilerArtifact(resolve(artifact), {
        text: fixture.source, rootPath: sourcePath, cwd: tmpdir(),
      });
      actual = { phase: 'run', status: result.status, signal: null, stdout: result.stdout, stderr: result.stderr };
      compiled.set(key, actual);
    }
    if (!compilerContractMatches(fixture, actual, artifacts)) {
      const detail = fixture.category === 'rejected'
        ? `status ${actual.status}, stderr ${JSON.stringify(actual.stderr.toString())}`
        : `artifact ${hashBytes(actual.stdout)}, expected ${artifacts.get(fixture.name)?.ts}`;
      mismatches.push(fixture.file + '/' + fixture.caseName + `: compiler contract (${detail})`);
      continue;
    }
    if (fixture.category === 'rejected') rejections += 1;
    else programs.push({ fixture, source: actual.stdout.toString() });
  }
  const distinctPrograms = [...new Set(programs.map(item => item.source))];
  const executableIndex = new Map(distinctPrograms.map((source, i) => [source, i]));
  const executables = prepareTsArtifacts(distinctPrograms);
  let executions = 0;
  try {
    if (executables.checked.status !== 0 || executables.checked.signal !== null) throw new Error(`strict corpus artifact check failed:\n${executables.checked.stdout}${executables.checked.stderr}`);
    for (const { fixture, source } of programs) {
      const actual = executables.runs[executableIndex.get(source)!]!({ stdin: fixture.stdin }); executions += 1;
      if (actual.phase !== 'run' || actual.signal !== null || actual.status !== fixture.exitCode || !actual.stdout.equals(fixture.stdout) || !actual.stderr.equals(fixture.stderr)) {
        mismatches.push(fixture.file + '/' + fixture.caseName + ': runtime contract');
      }
    }
  } finally { executables.dispose(); }
  return { cases: fixtures.length, programs: programs.length, rejections, executions, mismatches };
}
