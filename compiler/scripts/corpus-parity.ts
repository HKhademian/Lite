#!/usr/bin/env node
/**
 * Compares one emitted TS compiler against stage 0 over the whole compiler corpus.
 *
 * Stage 0 is the Lite-written compiler S executed by the TS igniter; the artifact
 * is the same S compiled to TS (T11/T12/…). Both read the same fixture source,
 * arguments and stdin, and must agree byte for byte on emitted stdout, stderr and
 * status for every program and rejection case.
 *
 * Usage:
 *   node compiler/scripts/corpus-parity.ts --artifact /tmp/T11.ts [--target ts|c]
 *
 * Prints one JSON summary and exits nonzero on the first mismatches.
 */

import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repository = resolve(fileURLToPath(new URL('../..', import.meta.url)));
const { loadCompiler } = await import('../../igniter/bootstrap.ts');

const arguments_ = process.argv.slice(2);
const artifactIndex = arguments_.indexOf('--artifact');
if (artifactIndex < 0 || arguments_[artifactIndex + 1] === undefined) {
  process.stderr.write('usage: node compiler/scripts/corpus-parity.ts --artifact T11.ts\n');
  process.exit(64);
}
const artifactPath = resolve(arguments_[artifactIndex + 1]!);
const targetIndex = arguments_.indexOf('--target');
const target = targetIndex < 0 ? 'ts' : arguments_[targetIndex + 1];
if (target !== 'ts' && target !== 'c') throw new Error('--target must be ts or c');

/** Reads one artifact typecheck config from the igniter's strict settings. */
function checkOptions() {
  const config = JSON.parse(readFileSync(join(repository, 'igniter', 'tsconfig.json'), 'utf8')) as { compilerOptions: Record<string, unknown> };
  return { compilerOptions: { ...config.compilerOptions, types: [], typeRoots: [], lib: ['ESNext'] } };
}

const directory = mkdtempSync(join(tmpdir(), 'lite-corpus-parity-'));
let summary;
try {
  const artifact = join(directory, 'artifact.ts');
  const runner = join(directory, 'runner.ts');
  writeFileSync(artifact, readFileSync(artifactPath));
  writeFileSync(join(directory, 'package.json'), '{"type":"module"}\n');
  writeFileSync(runner, "import { main } from './artifact.ts';\nimport { writeSync } from 'node:fs';\nprocess.stdout.write(main((text: string): void => { writeSync(1, text); }));\n");
  writeFileSync(join(directory, 'tsconfig.json'), JSON.stringify({ ...checkOptions(), files: [artifact] }));
  const tsc = join(repository, 'igniter', 'node_modules', 'typescript', 'bin', 'tsc');
  const typecheck = spawnSync(process.execPath, [tsc, '-p', join(directory, 'tsconfig.json')], { timeout: 0 });
  if (typecheck.error !== undefined) throw typecheck.error;
  if (typecheck.status !== 0) {
    process.stdout.write((typecheck.stdout ?? Buffer.alloc(0)).toString());
    process.stderr.write((typecheck.stderr ?? Buffer.alloc(0)).toString());
    process.stderr.write(JSON.stringify({ phase: 'typecheck', status: typecheck.status }) + '\n');
    process.exit(typecheck.status ?? 1);
  }

  const compiler = loadCompiler(join(repository, 'compiler', 'manifests', `${target}.json`));
  const fixtures = join(repository, 'igniter', 'tests', 'compiler');
  const manifests = readdirSync(fixtures).filter(name => name.endsWith('.json')).sort();

  let programs = 0;
  let rejections = 0;
  /** Mismatches stay in corpus order; only the first few are reported. */
  const mismatches = [];
  for (const manifestName of manifests) {
    const manifest = JSON.parse(readFileSync(join(fixtures, manifestName), 'utf8')) as { source: { file: string } };
    const sourcePath = join(fixtures, manifest.source.file);
    const source = readFileSync(sourcePath, 'utf8');
    const expected = compiler.compile({ text: source, name: sourcePath });
    const actual = spawnSync(process.execPath, [runner, sourcePath], {
      input: Buffer.from(source),
      timeout: 10000,
      maxBuffer: 64 * 1024 * 1024,
    });
    if (actual.error !== undefined) throw actual.error;
    const stdout = actual.stdout ?? Buffer.alloc(0);
    const stderr = actual.stderr ?? Buffer.alloc(0);
    const matches = actual.status === expected.status && stdout.equals(expected.stdout) && stderr.equals(expected.stderr);
    if (expected.status === 0) programs += 1;
    else rejections += 1;
    if (!matches) {
      mismatches.push({
        manifest: manifestName,
        expected: { status: expected.status, stdout: expected.stdout.toString(), stderr: expected.stderr.toString() },
        actual: { status: actual.status, stdout: stdout.toString(), stderr: stderr.toString() },
      });
    }
  }

  summary = {
    phase: 'compare',
    artifact: artifactPath,
    target,
    cases: manifests.length,
    programs,
    rejections,
    mismatches: mismatches.length,
    first: mismatches.slice(0, 3),
  };
  process.stdout.write(JSON.stringify(summary, null, 2) + '\n');
  process.exitCode = mismatches.length === 0 ? 0 : 1;
} finally {
  rmSync(directory, { recursive: true, force: true });
}
