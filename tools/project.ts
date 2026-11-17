/** Shared repository locations and independently versioned components. */
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { componentVersions, type ComponentVersions } from '../compiler/release-streams.ts';

export const root = fileURLToPath(new URL('../', import.meta.url));
export const sha256 = (bytes: string | Buffer): string => createHash('sha256').update(bytes).digest('hex');

const igniterScript = join(root, 'compiler/bootstrap/igniter.ts');
const ensuredTools = new Map<string, string>();

/** Ensures `tools/src/<name>.lts` is compiled into `dist/tools/<name>.ts` via the Lite igniter. */
export function ensureTool(name: string, options: Readonly<{ force?: boolean }> = {}): string {
  if (!options.force) {
    const cached = ensuredTools.get(name);
    if (cached !== undefined) return cached;
  }
  const args = options.force ? [igniterScript, '--force', '--ensure', name] : [igniterScript, '--ensure', name];
  const result = spawnSync(process.execPath, args, { cwd: root, encoding: 'utf8', timeout: 60_000 });
  if (result.error) throw result.error;
  if (result.status !== 0 || result.signal !== null) {
    throw new Error(`ignite ${name} failed (${result.status ?? result.signal}):\n${result.stdout}${result.stderr}`);
  }
  const artifact = result.stdout.trim();
  ensuredTools.set(name, artifact);
  return artifact;
}

/** Runs the Lite igniter across selected or all tools under `tools/src/` and returns parsed JSON summary. */
export function igniteAllTools(
  options: Readonly<{ check?: boolean; force?: boolean; clean?: boolean; tools?: readonly string[] }> = {},
): Readonly<{ tools: readonly { name: string; path: string; sha256: string; rebuilt: boolean }[]; checked: boolean }> {
  const args: string[] = [igniterScript, '--json'];
  if (options.clean) args.push('--clean');
  if (options.force) args.push('--force');
  if (options.check) args.push('--check');
  if (options.tools !== undefined) args.push(...options.tools);
  const result = spawnSync(process.execPath, args, { cwd: root, encoding: 'utf8', timeout: 120_000, maxBuffer: 16 * 1024 * 1024 });
  if (result.error) throw result.error;
  if (result.status !== 0 || result.signal !== null) {
    throw new Error(`ignite failed (${result.status ?? result.signal}):\n${result.stdout}${result.stderr}`);
  }
  const parsed = JSON.parse(result.stdout) as { tools: { name: string; path: string; sha256: string; rebuilt: boolean }[]; checked: boolean };
  if (options.clean) ensuredTools.clear();
  for (const tool of parsed.tools) ensuredTools.set(tool.name, tool.path);
  return parsed;
}

/** Ignites `name` if needed and runs its compiled `main` in-process with stdout streaming. */
export async function runIgnitedTool(name: string): Promise<void> {
  const entry = ensureTool(name);
  const mod = (await import(pathToFileURL(entry).href)) as { main: (write?: (text: string) => void) => string };
  mod.main((text: string): void => {
    process.stdout.write(text);
  });
}

export function versions(directory = root): ComponentVersions {
  const igniter = JSON.parse(readFileSync(join(directory, 'igniter/package.json'), 'utf8')) as { version: string };
  return componentVersions(JSON.parse(readFileSync(join(directory, 'config/versions.json'), 'utf8')), igniter.version);
}

export function run(command: string, args: string[], cwd = root, input?: Buffer): Buffer {
  const result = spawnSync(command, args, { cwd, input, timeout: 120_000, maxBuffer: 64 * 1024 * 1024 });
  if (result.error) throw result.error;
  if (result.status !== 0 || result.signal !== null) throw new Error(`${command} ${args.join(' ')} failed:\n${result.stdout?.toString()}${result.stderr?.toString()}`);
  return result.stdout;
}
