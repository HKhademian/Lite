/** One fresh-process compiler measurement. Metrics use fd 3, separate from program streams. */
import { readFileSync, writeSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const [engine, artifact, sourceName] = process.argv.slice(2);
if (artifact === undefined || sourceName === undefined) throw new Error('missing compiler artifact or source name');
const source = engine === 'T11' ? undefined : readFileSync(0, 'utf8');
const started = performance.now();
const cpuStarted = process.cpuUsage();
let loaded = started;
let result: { status: number; stdout: Buffer; stderr: Buffer };
let metricsWritten = false;
function writeMetrics() {
  if (metricsWritten) return;
  metricsWritten = true;
  const ended = performance.now();
  const cpu = process.cpuUsage(cpuStarted);
  writeSync(3, JSON.stringify({
    loadMs: loaded - started,
    compileMs: ended - loaded,
    totalInsideMs: ended - started,
    cpuMs: (cpu.user + cpu.system) / 1000,
    maxRssKiB: process.resourceUsage().maxRSS,
  }));
}
if (engine === 'T11') {
  const module: unknown = await import(pathToFileURL(artifact).href);
  if (typeof module !== 'object' || module === null || !('main' in module) || typeof module.main !== 'function') throw new Error('missing main');
  const entry = module.main;
  const main = (): string => { const value: unknown = entry(); if (typeof value !== 'string') throw new Error('invalid main result'); return value; };
  process.argv = [process.execPath, artifact, sourceName];
  loaded = performance.now();
  const exit = process.exit;
  process.exit = code => { writeMetrics(); return exit(code); };
  result = { status: 0, stdout: Buffer.from(main()), stderr: Buffer.alloc(0) };
} else if (engine === 'T00+S') {
  const { loadCompiler } = await import('../igniter/bootstrap.ts');
  const compiler = loadCompiler(new URL('../compiler/manifests/ts.json', import.meta.url).pathname);
  loaded = performance.now();
  result = compiler.compile({ text: source ?? '', name: sourceName });
} else if (engine === 'T00-frontend') {
  const { compile } = await import('../igniter/lite.ts');
  loaded = performance.now();
  compile(source ?? '');
  result = { status: 0, stdout: Buffer.alloc(0), stderr: Buffer.alloc(0) };
} else {
  throw new Error(`unknown measurement engine: ${engine}`);
}
writeMetrics();
process.stdout.write(result.stdout);
process.stderr.write(result.stderr);
process.exitCode = result.status;
