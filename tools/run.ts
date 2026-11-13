#!/usr/bin/env node
/** Compile one script to a temporary artifact, execute it with the Node entry and forward its status. */
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { compileTs } from '../compiler/host.ts';
import { displaySourcePath, readSourceInput } from '../compiler/source.ts';

const entry = fileURLToPath(new URL('../compiler/entry.ts', import.meta.url));

function usage(): never {
  process.stderr.write('Usage: ./bin/lite run file.lts [-- argument ...]\n');
  process.exit(2);
}

const args = process.argv.slice(2);
if (args[0] === '--') args.shift();
const path = args.shift();
if (path === undefined) usage();
if (path === '--check') {
  process.stderr.write('lite run: --check is ./bin/lite check file.lts\n');
  process.exit(2);
}
if (path.startsWith('-')) {
  process.stderr.write(`lite run: unknown option ${path}\n`);
  usage();
}
const programArgs = args[0] === '--' ? args.slice(1) : args;
if (!path.endsWith('.lts')) {
  process.stderr.write('lite run: source must be a .lts file\n');
  process.exit(2);
}

let source: ReturnType<typeof readSourceInput>;
try {
  source = readSourceInput(path);
} catch (error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  // Ordinary read failures share the compiler launcher's short message; loader
  // diagnostics (invalid UTF-8, flattening) keep their path-prefixed detail.
  if (typeof (error as NodeJS.ErrnoException | null)?.code === 'string') {
    process.stderr.write(`lite run: cannot read ${path}\n`);
    process.exit(2);
  }
  process.stderr.write(`${message.startsWith(path + ':') ? message : path + ': ' + message}\n`);
  process.exit(1);
}

// Compilation errors keep their exact compiler diagnostics and status; no
// artifact is executed after a rejected program.
let compiled: ReturnType<typeof compileTs>;
try {
  compiled = compileTs({ text: source.text, name: displaySourcePath(source.path), rootPath: source.path });
} catch (error: unknown) {
  process.stderr.write(`lite run: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
}
if (compiled.status !== 0) {
  if (compiled.stderr.length > 0) process.stderr.write(compiled.stderr);
  process.exit(compiled.status);
}

const directory = mkdtempSync(join(tmpdir(), 'lite-run-'));
let status = 1;
let signal: NodeJS.Signals | null = null;
try {
  const artifact = join(directory, `${basename(path, '.lts')}.ts`);
  writeFileSync(artifact, compiled.stdout);
  const child = spawnSync(process.execPath, [entry, artifact, ...programArgs], { stdio: 'inherit' });
  if (child.error !== undefined) process.stderr.write(`lite run: ${child.error.message}\n`);
  else { status = child.status ?? 1; signal = child.signal; }
} finally {
  rmSync(directory, { recursive: true, force: true });
}
if (signal !== null) process.kill(process.pid, signal);
process.exit(status);
