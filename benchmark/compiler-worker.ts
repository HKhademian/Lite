/** One fresh-process compiler measurement. Metrics use fd 3, separate from program streams. */
import { writeSync } from 'node:fs';
import { readFileSync, realpathSync } from 'node:fs';
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const [engine, artifact, sourceName, sourceRoot] = process.argv.slice(2);
if (artifact === undefined || sourceName === undefined) throw new Error('missing compiler artifact or source name');
const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
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
  const readSource = sourceRoot === undefined ? undefined : (importer: string, spec: string): Readonly<{ path: string; text: string }> => {
    if (spec.length === 0 || spec.startsWith('/') || spec.includes('\\') || /^[A-Za-z]:/.test(spec)) throw new Error('invalid source import');
    const path = realpathSync(resolve(dirname(importer), spec));
    const bytes = readFileSync(path);
    const projectRelative = relative(projectRoot, path);
    const identity = projectRelative === '..' || projectRelative.startsWith(`..${sep}`) || isAbsolute(projectRelative)
      ? path : projectRelative.split(sep).join('/');
    return { path: identity, text: new TextDecoder('utf-8', { fatal: true }).decode(bytes) };
  };
  const main = (): string => {
    const value: unknown = sourceRoot === undefined ? entry() : entry(undefined, readSource);
    if (typeof value !== 'string') throw new Error('invalid main result');
    return value;
  };
  process.argv = [process.execPath, artifact, sourceName];
  loaded = performance.now();
  const exit = process.exit;
  process.exit = code => { writeMetrics(); return exit(code); };
  result = { status: 0, stdout: Buffer.from(main()), stderr: Buffer.alloc(0) };
} else {
  throw new Error(`unknown measurement engine: ${engine}`);
}
writeMetrics();
process.stdout.write(result.stdout);
process.stderr.write(result.stderr);
process.exitCode = result.status;
