/** Forward a command's streams, exit status and signal without interpreting its operation. */
import { spawnSync } from 'node:child_process';

export function forward(path: string, args: string[]): never {
  const result = spawnSync(process.execPath, [path, ...args], { stdio: 'inherit' });
  if (result.error !== undefined) { process.stderr.write(`${result.error.message}\n`); process.exit(1); }
  if (result.signal !== null) { process.kill(process.pid, result.signal); process.exit(1); }
  process.exit(result.status ?? 1);
}
