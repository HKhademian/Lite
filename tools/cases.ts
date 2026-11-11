import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { root, run, sha256 } from './project.ts';
import { streamBytes, type Stream } from './streams.ts';
import { checkTsArtifact } from '../igniter/artifacts.ts';
export type { Stream } from './streams.ts';

export const CaseKind = {
  Tool: 'tool', Feature: 'feature', Reject: 'reject', Compile: 'compile', Sample: 'sample', Example: 'example',
} as const;
export type CaseKind = typeof CaseKind[keyof typeof CaseKind];
export const WorkspaceKind = { Clean: 'clean', Dirty: 'dirty' } as const;
export type WorkspaceKind = typeof WorkspaceKind[keyof typeof WorkspaceKind];
export type Scenario = {
  name: string;
  args?: string[];
  stdin: Stream;
  stdout: Stream;
  stderr: Stream;
  exitCode: number;
  timeoutMs?: number;
  artifact?: Stream;
  inputFiles?: Record<string, Stream>;
  outputFiles?: Record<string, Stream>;
  workspace?: WorkspaceKind;
  tag?: { name: string; annotated: boolean };
  files?: string[];
};
export type Case = {
  id: string;
  pending?: string;
  features: string[];
  cases: Scenario[];
  benchmark?: { warmups: number; samples: number };
} & (
  { kind: typeof CaseKind.Tool; tool: string; source?: never } |
  { kind: Exclude<CaseKind, typeof CaseKind.Tool>; source: string; tool?: never }
);
export type Fixture = { path: string; definition: Case };

export const stream = (value: Stream, directory: string): Buffer => streamBytes(value, directory);

export function loadCase(path: string): Fixture {
  const file = resolve(path);
  const spec = JSON.parse(readFileSync(file, 'utf8')) as Case;
  assert(Object.keys(spec).every(key => ['id', 'kind', 'pending', 'features', 'cases', 'benchmark', 'tool', 'source'].includes(key)), 'unexpected case key');
  assert(typeof spec.id === 'string' && spec.id.length > 0, 'case ID required');
  assert(Object.values(CaseKind).includes(spec.kind), 'invalid case kind');
  assert(spec.pending === undefined || (spec.kind !== CaseKind.Tool && typeof spec.pending === 'string' && spec.pending.trim().length > 0), 'pending needs a language case and reason');
  if (spec.kind === CaseKind.Tool) {
    assert(spec.source === undefined, 'tool cases name a tool, not a case executable');
    assert(typeof spec.tool === 'string' && !spec.tool.includes('/') && existsSync(join(root, 'bin', spec.tool)), 'unknown tool');
  } else {
    assert(typeof spec.source === 'string' && spec.source.endsWith('.lts'), 'Lite source must use .lts');
    readFileSync(resolve(dirname(file), spec.source));
  }
  assert(Array.isArray(spec.features) && spec.features.every(feature => typeof feature === 'string'), 'features must be an array');
  assert(new Set(spec.features).size === spec.features.length, 'duplicate feature IDs');
  assert(Array.isArray(spec.cases) && spec.cases.length > 0, 'case scenarios required');
  const names = new Set<string>();
  for (const scenario of spec.cases) {
    assert(Object.keys(scenario).every(key => ['name', 'args', 'stdin', 'stdout', 'stderr', 'exitCode', 'timeoutMs', 'artifact', 'inputFiles', 'outputFiles', 'workspace', 'tag', 'files'].includes(key)), 'unexpected scenario key');
    assert(typeof scenario.name === 'string' && scenario.name.length > 0 && !names.has(scenario.name), 'scenario names must be unique');
    names.add(scenario.name);
    assert(Number.isInteger(scenario.exitCode) && scenario.exitCode >= 0 && scenario.exitCode <= 255, 'invalid exit status');
    assert(scenario.timeoutMs === undefined || (Number.isInteger(scenario.timeoutMs) && scenario.timeoutMs > 0 && scenario.timeoutMs <= 600_000), 'invalid timeout');
    assert(scenario.args === undefined || (Array.isArray(scenario.args) && scenario.args.every(arg => typeof arg === 'string')), 'invalid arguments');
    for (const key of ['stdin', 'stdout', 'stderr'] as const) stream(scenario[key], dirname(file));
    for (const key of ['inputFiles', 'outputFiles'] as const) {
      const files = scenario[key];
      if (files === undefined) continue;
      assert(([CaseKind.Feature, CaseKind.Sample, CaseKind.Example] as CaseKind[]).includes(spec.kind), 'file fixtures need a runnable Lite case');
      assert(typeof files === 'object' && files !== null && !Array.isArray(files), 'file fixtures must be an object');
      for (const [name, value] of Object.entries(files)) {
        assert(name.length > 0 && !isAbsolute(name) && !name.split(/[\\/]/).includes('..'), 'file fixture paths must stay inside the case workspace');
        stream(value, dirname(file));
      }
    }
    if (scenario.artifact !== undefined) {
      assert(spec.kind === CaseKind.Compile, 'only compile cases compare generated artifacts');
      stream(scenario.artifact, dirname(file));
    }
    assert(scenario.workspace === undefined || (spec.kind === CaseKind.Tool && Object.values(WorkspaceKind).includes(scenario.workspace)), 'invalid workspace');
    assert(scenario.tag === undefined || (scenario.workspace !== undefined && typeof scenario.tag.name === 'string' && typeof scenario.tag.annotated === 'boolean'), 'invalid fixture tag');
    assert(scenario.files === undefined || (spec.kind === CaseKind.Tool && Array.isArray(scenario.files) && scenario.files.every(file => typeof file === 'string' && file.length > 0 && !isAbsolute(file) && !file.split(/[\\/]/).includes('..'))), 'invalid artifact paths');
  }
  if (spec.benchmark !== undefined) {
    assert(Object.keys(spec.benchmark).every(key => ['warmups', 'samples'].includes(key)), 'unexpected benchmark key');
    assert(Number.isInteger(spec.benchmark.warmups) && spec.benchmark.warmups >= 0);
    assert(Number.isInteger(spec.benchmark.samples) && spec.benchmark.samples >= 1);
  }
  return { path: file, definition: spec };
}

export function loadCases(filter = '', directory?: string): Fixture[] {
  const fixtures: Fixture[] = [];
  function visit(path: string): void {
    for (const entry of readdirSync(path, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const file = join(path, entry.name);
      if (entry.isDirectory()) visit(file);
      else if (entry.name.endsWith('.case.json')) fixtures.push(loadCase(file));
    }
  }
  for (const path of directory === undefined
    ? [join(root, 'language', 'cases'), join(root, 'tools', 'cases')]
    : [directory]) visit(path);
  assert(new Set(fixtures.map(item => item.definition.id)).size === fixtures.length, 'duplicate case IDs');
  const selected = fixtures.filter(item => item.definition.id.includes(filter));
  assert(selected.length > 0, 'no cases match: ' + filter);
  return selected;
}

function toolWorkspace(project: string, scenario: Scenario, work: string): string {
  if (scenario.workspace === undefined) return project;
  const directory = join(work, 'project');
  for (const name of readdirSync(project)) {
    if (['.git', 'node_modules', 'dist', '.cache'].includes(name)) continue;
    cpSync(join(project, name), join(directory, name), {
      recursive: true, verbatimSymlinks: true,
      filter: path => basename(path) !== 'node_modules',
    });
  }
  const git = (...args: string[]) => run('git', [
    '-c', 'user.name=Case fixture', '-c', 'user.email=fixture@example.invalid',
    '-c', 'commit.gpgSign=false', '-c', 'tag.gpgSign=false', '-c', 'maintenance.auto=false', '-c', 'gc.auto=0', ...args,
  ], directory);
  git('init', '-b', 'main');
  git('add', '.');
  git('commit', '-m', 'case fixture');
  if (scenario.tag !== undefined) {
    const args = scenario.tag.annotated ? ['-a', scenario.tag.name, '-m', scenario.tag.name] : [scenario.tag.name];
    git('tag', ...args);
  }
  if (scenario.workspace === WorkspaceKind.Dirty) writeFileSync(join(directory, 'uncommitted.txt'), 'dirty\n');
  return directory;
}

export function verifyScenario(fixture: Fixture, scenario: Scenario, projectRoot = root): string | null {
  const { definition: spec, path } = fixture;
  assert(spec.pending === undefined, spec.id + ': pending: ' + spec.pending);
  const directory = dirname(path);
  const work = mkdtempSync(join(tmpdir(), 'lite-case-'));
  const execute = (file: string, args: string[], input: Buffer, cwd = projectRoot) => {
    const result = spawnSync(process.execPath, [file, ...args], { cwd, input, timeout: scenario.timeoutMs ?? 30_000, maxBuffer: 32 * 1024 * 1024 });
    if (result.error) throw result.error;
    assert.equal(result.signal, null, spec.id + '/' + scenario.name + ': process terminated by signal');
    return result;
  };
  try {
    const input = stream(scenario.stdin, directory);
    let result;
    let artifact: string | null = null;
    let workspace = projectRoot;
    if (spec.kind === CaseKind.Tool) {
      workspace = toolWorkspace(projectRoot, scenario, work);
      result = execute(join(workspace, 'bin', spec.tool), scenario.args ?? [], input, workspace);
    } else {
      const output = join(work, 'program.lts.ts');
      const compiled = execute(join(projectRoot, 'bin/lite-compile'), [relative(projectRoot, resolve(directory, spec.source))], Buffer.alloc(0));
      if (compiled.status === 0) {
        const checked = checkTsArtifact(compiled.stdout.toString('utf8'));
        assert.equal(checked.status, 0, checked.stderr.toString());
        writeFileSync(output, compiled.stdout);
        compiled.stdout = Buffer.alloc(0);
      }
      if (compiled.status === 0) artifact = sha256(readFileSync(output));
      if (spec.kind === CaseKind.Compile && scenario.artifact !== undefined) assert.deepEqual(readFileSync(output), stream(scenario.artifact, directory), 'generated artifact differs');
      if (spec.kind === CaseKind.Reject) assert(!existsSync(output), 'rejection created an output artifact');
      if (spec.kind === CaseKind.Reject || spec.kind === CaseKind.Compile) result = compiled;
      else {
        assert.equal(compiled.status, 0, compiled.stderr.toString());
        assert.equal(compiled.stderr.length, 0, 'unexpected compiler diagnostics');
        assert.equal(compiled.stdout.length, 0, 'unexpected compiler stdout');
        writeFileSync(join(work, 'package.json'), '{"type":"module"}\n');
        const cwd = join(work, 'files');
        mkdirSync(cwd);
        for (const [name, value] of Object.entries(scenario.inputFiles ?? {})) {
          const file = join(cwd, name);
          mkdirSync(dirname(file), { recursive: true });
          writeFileSync(file, stream(value, directory));
        }
        result = execute(join(projectRoot, 'compiler/entry.ts'), [output, ...(scenario.args ?? [])], input, cwd);
        for (const [name, value] of Object.entries(scenario.outputFiles ?? {})) {
          assert.deepEqual(readFileSync(join(cwd, name)), stream(value, directory), spec.id + '/' + scenario.name + ': file ' + name);
        }
      }
    }
    assert.equal(result.status, scenario.exitCode, spec.id + '/' + scenario.name + ': exit status; ' + result.stderr);
    assert.deepEqual(result.stdout, stream(scenario.stdout, directory), spec.id + '/' + scenario.name + ': stdout');
    assert.deepEqual(result.stderr, stream(scenario.stderr, directory), spec.id + '/' + scenario.name + ': stderr');
    if (spec.kind === CaseKind.Reject) { assert.notEqual(scenario.exitCode, 0); assert.equal(result.stdout.length, 0); }
    for (const file of scenario.files ?? []) assert(existsSync(resolve(workspace, file)), 'missing artifact: ' + file);
    return artifact;
  } finally { rmSync(work, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 }); }
}

export function caseIdentity(fixture: Fixture) {
  const base = dirname(fixture.path);
  const spec = fixture.definition;
  const hashFiles = (files: Record<string, Stream>) => Object.fromEntries(
    Object.entries(files).map(([name, value]) => [name, sha256(stream(value, base))]));
  const source = spec.kind === CaseKind.Tool ? join(root, 'bin', spec.tool) : resolve(base, spec.source);
  return {
    manifest: sha256(readFileSync(fixture.path)),
    source: sha256(readFileSync(source)),
    streams: spec.cases.map(scenario => ({
      name: scenario.name,
      stdin: sha256(stream(scenario.stdin, base)),
      stdout: sha256(stream(scenario.stdout, base)),
      stderr: sha256(stream(scenario.stderr, base)),
      ...(scenario.artifact === undefined ? {} : { artifact: sha256(stream(scenario.artifact, base)) }),
      ...(scenario.inputFiles === undefined ? {} : { inputFiles: hashFiles(scenario.inputFiles) }),
      ...(scenario.outputFiles === undefined ? {} : { outputFiles: hashFiles(scenario.outputFiles) }),
    })),
  };
}
