#!/usr/bin/env node
/**
 * Runs the TS bootstrap ladder end to end and reports the artifact hashes.
 *
 *   S   = the ordered TS manifest bundle
 *   T11 = explicit stage-0 bundle driver compiling S (not the default CLI)
 *   T12 = T11 compiling S, after a strict artifact typecheck
 *
 * Usage:
 *   node compiler/scripts/self-host.mjs [--out DIR]
 *
 * Prints one JSON summary with both statuses, byte counts, hashes and whether
 * T12 equals T11. A non-pairing ladder exits nonzero so it can gate CI later.
 */

import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repository = resolve(fileURLToPath(new URL('../..', import.meta.url)));
const arguments_ = process.argv.slice(2);
const outIndex = arguments_.indexOf('--out');
const outDirectory = outIndex >= 0 && arguments_[outIndex + 1] !== undefined
  ? resolve(arguments_[outIndex + 1])
  : mkdtempSync(join(tmpdir(), 'lite-self-host-'));

/** SHA-256 as lowercase hex. */
function hashBytes(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

/** Runs one command and returns its status and captured text streams. */
function run(command, arguments__, options = {}) {
  const started = process.hrtime.bigint();
  const result = spawnSync(command, arguments__, {
    encoding: 'buffer',
    timeout: 0,
    maxBuffer: 512 * 1024 * 1024,
    ...options,
  });
  if (result.error !== undefined) throw result.error;
  return {
    status: result.status,
    stdout: result.stdout ?? Buffer.alloc(0),
    stderr: result.stderr ?? Buffer.alloc(0),
    seconds: Number(process.hrtime.bigint() - started) / 1e9,
  };
}

mkdirSync(outDirectory, { recursive: true });

const bundle = spawnSync(process.execPath, [
  '--input-type=module',
  '-e',
  'import {loadBundle} from "./igniter/loader.ts"; process.stdout.write(loadBundle("compiler/manifests/ts.json").text);',
], { cwd: repository, encoding: 'buffer', maxBuffer: 64 * 1024 * 1024 });
if (bundle.error !== undefined) throw bundle.error;
if (bundle.status !== 0) {
  process.stderr.write(bundle.stderr ?? Buffer.alloc(0));
  process.exit(bundle.status ?? 1);
}
const sourcePath = join(outDirectory, 'S.lts');
writeFileSync(sourcePath, bundle.stdout ?? Buffer.alloc(0));

// The default litec now uses T11. Keep this historical audit's T00 builder explicit.
const stage0 = run(process.execPath, [join(repository, 'igniter', 'bundle-cli.ts'), 'ts', sourcePath]);
const t11Path = join(outDirectory, 'T11.ts');
writeFileSync(t11Path, stage0.stdout);
writeFileSync(`${t11Path}.err`, stage0.stderr);
if (stage0.status !== 0) {
  process.stderr.write(stage0.stderr);
  process.stderr.write(JSON.stringify({ phase: 'T11', status: stage0.status, out: outDirectory }) + '\n');
  process.exit(stage0.status ?? 1);
}

const t12Path = join(outDirectory, 'T12.ts');
const generated = run(process.execPath, [
  join(repository, 'compiler', 'scripts', 'run-ts-artifact.mjs'),
  '--artifact', t11Path,
  '--source', sourcePath,
  '--out', t12Path,
]);
if (generated.status !== 0) {
  process.stderr.write(generated.stderr);
  process.stderr.write(JSON.stringify({ phase: 'T12', status: generated.status, out: outDirectory }) + '\n');
  process.exit(generated.status ?? 1);
}

const t11 = readFileSync(t11Path);
const t12 = readFileSync(t12Path);
const summary = {
  phase: 'complete',
  out: outDirectory,
  source: { bytes: (bundle.stdout ?? Buffer.alloc(0)).length, hash: hashBytes(bundle.stdout ?? Buffer.alloc(0)) },
  t11: { bytes: t11.length, hash: hashBytes(t11), seconds: stage0.seconds },
  t12: { bytes: t12.length, hash: hashBytes(t12) },
  fixedPoint: t11.equals(t12),
};
process.stdout.write(JSON.stringify(summary, null, 2) + '\n');
process.exit(summary.fixedPoint ? 0 : 1);
