#!/usr/bin/env node
/**
 * Runs an emitted TS artifact with fixed stdin and no harness timeout.
 *
 * `igniter/artifacts.ts` caps artifact runs at ten seconds, which is enough for
 * the corpus and far too short for a generated compiler compiling S. This
 * driver mirrors that artifact contract (strict typecheck, thin `main()` adapter,
 * captured streams) while allowing a self-hosting run to take as long as it
 * needs.
 *
 * Usage:
 *   node compiler/scripts/run-ts-artifact.ts --artifact T11.ts --source S.lts \
 *     --out T12.ts [--err T12.err] [--args a,b] [--no-check]
 *
 * Exit status is the artifact's status when it ran, or the typecheck status when
 * checking failed. A one-line JSON summary is printed to stderr.
 */

import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repository = resolve(fileURLToPath(new URL('../..', import.meta.url)));

/** Reads one required `--name value` option. */
function required(options: ReadonlyMap<string, string>, name: string) {
  const value = options.get(name);
  if (value === undefined) {
    process.stderr.write(`missing --${name}\n`);
    process.exit(64);
  }
  return value;
}

/** Builds the artifact typecheck config from the igniter's strict settings. */
function checkOptions() {
  const config = JSON.parse(readFileSync(join(repository, 'igniter', 'tsconfig.json'), 'utf8')) as { compilerOptions: Record<string, unknown> };
  return {
    compilerOptions: { ...config.compilerOptions, types: [], typeRoots: [], lib: ['ESNext'] },
    files: [] as string[],
  };
}

const raw = process.argv.slice(2);
const options = new Map<string, string>();
for (let index = 0; index < raw.length; index += 1) {
  const argument = raw[index];
  if (argument === undefined || !argument.startsWith('--')) continue;
  const name = argument.slice(2);
  if (name === 'no-check') {
    options.set(name, 'true');
  } else {
    options.set(name, raw[index + 1] ?? '');
    index += 1;
  }
}

const artifact = resolve(required(options, 'artifact'));
const source = options.get('source');
const outPath = resolve(required(options, 'out'));
const errPath = resolve(options.get('err') ?? `${outPath}.err`);
const args = (options.get('args') ?? '').split(',').filter(text => text !== '');
const checked = !options.has('no-check');

const directory = mkdtempSync(join(tmpdir(), 'lite-self-host-'));
let summary;
try {
  const artifactPath = join(directory, 'artifact.ts');
  const runnerPath = join(directory, 'runner.ts');
  writeFileSync(artifactPath, readFileSync(artifact));
  writeFileSync(join(directory, 'package.json'), '{"type":"module"}\n');
  writeFileSync(runnerPath, "import { main } from './artifact.ts';\nprocess.stdout.write(main());\n");

  if (checked) {
    const config = checkOptions();
    config.files = [artifactPath];
    writeFileSync(join(directory, 'tsconfig.json'), JSON.stringify(config));
    const tsc = join(repository, 'igniter', 'node_modules', 'typescript', 'bin', 'tsc');
    const typecheck = spawnSync(process.execPath, [tsc, '-p', join(directory, 'tsconfig.json')],
      { encoding: 'utf8', timeout: 0 });
    if (typecheck.error !== undefined) throw typecheck.error;
    if (typecheck.status !== 0) {
      writeFileSync(errPath, `${typecheck.stdout}${typecheck.stderr}`);
      process.stderr.write(JSON.stringify({
        phase: 'typecheck', status: typecheck.status, err: errPath,
      }) + '\n');
      process.exit(typecheck.status ?? 1);
    }
  }

  const run = spawnSync(process.execPath, [runnerPath, ...args], {
    input: source === undefined ? undefined : readFileSync(source),
    timeout: 0,
    maxBuffer: 256 * 1024 * 1024,
  });
  if (run.error !== undefined) throw run.error;
  writeFileSync(outPath, run.stdout ?? Buffer.alloc(0));
  writeFileSync(errPath, run.stderr ?? Buffer.alloc(0));
  summary = {
    phase: 'run', status: run.status, signal: run.signal,
    out: outPath, outBytes: (run.stdout ?? Buffer.alloc(0)).length,
    err: errPath, errBytes: (run.stderr ?? Buffer.alloc(0)).length,
  };
} finally {
  rmSync(directory, { recursive: true, force: true });
}

process.stderr.write(JSON.stringify(summary) + '\n');
process.exit(summary.status ?? 0);
