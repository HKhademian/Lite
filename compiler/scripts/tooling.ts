/** Shared host plumbing for generated-only compiler tools. No language implementation. */
import { spawnSync } from 'node:child_process';
import { readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildCompiler } from '../host.ts';
import { hashBytes } from '../../igniter/measure.ts';
import { checkTsArtifact } from '../../igniter/artifacts.ts';

export const repository = resolve(fileURLToPath(new URL('../..', import.meta.url)));
/** Parsed generated-tool options. */
export type ToolOptions = Readonly<{ values: ReadonlyMap<string, string> }>;
/** Reject duplicate, unknown and missing options before selecting an artifact or creating output. */
export function toolOptions(args: readonly string[], allowed: readonly string[]): ToolOptions {
  const values = new Map<string, string>();
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i]!;
    const key = arg.startsWith('--') ? arg.slice(2) : '';
    const value = args[++i];
    if (!allowed.includes(key) || values.has(key) || value === undefined || value.startsWith('--')) {
      throw new Error(`invalid or missing option: ${arg}`);
    }
    values.set(key, value);
  }
  return { values };
}
/** Reads a bounded integer option before benchmark output is created. */
export function positiveOption(options: ReadonlyMap<string, string>, key: string, fallback: number, minimum = 1): number {
  const value = Number(options.get(key) ?? fallback);
  if (!Number.isSafeInteger(value) || value < minimum) throw new Error(`invalid --${key}`);
  return value;
}
/** Returns only the owning checkout revision; archives never inherit an ancestor Git identity. */
export function revision(): string | null {
  const result = spawnSync('git', ['rev-parse', '--show-toplevel'], { cwd: repository, encoding: 'utf8' });
  if (result.status !== 0 || resolve(result.stdout.trim()) !== repository) return null;
  const head = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: repository, encoding: 'utf8' });
  return head.status === 0 ? head.stdout.trim() : null;
}
/** Snapshots the selected or explicitly supplied builder and records its exact identities. */
export function selectedArtifact(path?: string): { path: string; bytes: Buffer; sha256: string; currentSourceSha256: string; selectedCompilerSha256: string; selectedCompilerBuilderSha256: string; supplied: boolean } {
  const selected = buildCompiler('ts');
  const chosen = path === undefined ? selected.path : resolve(path);
  const bytes = readFileSync(chosen);
  return { path: chosen, bytes, sha256: hashBytes(bytes), currentSourceSha256: selected.sourceSha256,
    selectedCompilerSha256: selected.artifactSha256, selectedCompilerBuilderSha256: selected.builderSha256, supplied: path !== undefined };
}
/** Checks TS without executing it and returns the parent phase wall time. */
export function strictArtifact(source: string): number {
  const start = performance.now(); const result = checkTsArtifact(source);
  if (result.status !== 0 || result.signal !== null) throw new Error(`strict artifact check failed:\n${result.stdout}${result.stderr}`);
  return performance.now() - start;
}
/** Identifies host tools even when Git metadata is absent or the checkout is dirty. */
export function toolIdentities(paths: readonly string[]): { path: string; sha256: string }[] {
  return paths.map(path => ({ path, sha256: hashBytes(readFileSync(join(repository, path))) }));
}
/** Writes a complete readable JSON record after the owning operation validates its results. */
export function writeJson(path: string, value: unknown): void { writeFileSync(path, JSON.stringify(value, null, 2) + '\n'); }
/** Recognizes direct CLI execution across filesystem path aliases and symlinks. */
export function mainFile(url: string): boolean {
  if (process.argv[1] === undefined) return false;
  return realpathSync(resolve(process.argv[1])) === fileURLToPath(url);
}
/** Reports one tool failure without executing a reference fallback. */
export function fail(error: unknown): void { process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`); process.exitCode = 1; }
export { hashBytes };
