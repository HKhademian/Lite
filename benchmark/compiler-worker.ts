/** One fresh-process compiler measurement. Metrics use fd 3, separate from program streams. */
import { readFileSync, realpathSync, writeSync } from 'node:fs';
import { dirname, isAbsolute, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { displaySourcePath, resolveImportPath, sourceModuleIdentity } from '../compiler/source.ts';

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
  const sourceCache = new Map<string, Readonly<{ path: string; display: string; identity: string; text: string }>>();
  const readSource = (importer: string, spec: string): Readonly<{ path: string; display: string; identity: string; text: string }> => {
    const importerPath = isAbsolute(importer) ? importer : resolve(projectRoot, importer || '__lite_stdin__.lts');
    const path = realpathSync(resolveImportPath(importerPath, spec, projectRoot));
    const cached = sourceCache.get(path);
    if (cached !== undefined) return cached;
    const bytes = readFileSync(path);
    const loaded = {
      path,
      display: displaySourcePath(path),
      identity: sourceModuleIdentity(bytes),
      text: new TextDecoder('utf-8', { fatal: true }).decode(bytes),
    };
    sourceCache.set(path, loaded);
    return loaded;
  };
  const main = (): string => {
    const value: unknown = entry(undefined, readSource);
    if (typeof value !== 'string') throw new Error('invalid main result');
    return value;
  };
  const rootPath = sourceRoot === undefined || sourceRoot === '' ? resolve(projectRoot, '__lite_stdin__.lts') : resolve(projectRoot, sourceRoot);
  process.argv = [process.execPath, artifact, sourceName, '', rootPath];
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
