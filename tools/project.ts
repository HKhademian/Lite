/** Shared repository locations and independently versioned components. */
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { componentVersions, type ComponentVersions } from '../compiler/release-streams.ts';

export const root = fileURLToPath(new URL('../', import.meta.url));
export const sha256 = (bytes: string | Buffer): string => createHash('sha256').update(bytes).digest('hex');

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
