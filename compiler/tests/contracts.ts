/** Read-only expected process contracts, independent of the compiler under test. */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

export type ContractOptions = Readonly<{ stdin?: string | Uint8Array; args?: readonly string[]; name?: string }>;
export type ContractResult = Readonly<{ status: number; stdout: Buffer; stderr: Buffer }>;
export type ContractCase = Readonly<{
  source: string; stdin: string; args: readonly string[]; name: string | null;
  status: number; stdout: string; stderr: string;
}>;
export type ContractFile = Readonly<{
  version: 1; provenance: Readonly<Record<string, string>>;
  sources: Readonly<Record<string, string>>; cases: readonly ContractCase[];
}>;

export const contractHash = (text: string): string => createHash('sha256').update(text).digest('hex');
export function contractRequest(source: string, options: ContractOptions = {}): Pick<ContractCase, 'source' | 'stdin' | 'args' | 'name'> {
  return { source: contractHash(source), stdin: Buffer.from(options.stdin ?? '').toString('base64'),
    args: options.args ?? [], name: options.name ?? null };
}
export const contractKey = (request: Pick<ContractCase, 'source' | 'stdin' | 'args' | 'name'>): string =>
  JSON.stringify([request.source, request.stdin, request.args, request.name]);

/** Reject missing, stale and duplicate expectations rather than consulting a live interpreter. */
export function contractReader(file: ContractFile): (source: string, options?: ContractOptions) => ContractResult {
  if (file.version !== 1) throw new Error('unsupported process contract version');
  for (const [hash, source] of Object.entries(file.sources)) {
    if (contractHash(source) !== hash) throw new Error(`process contract source hash mismatch: ${hash}`);
  }
  const cases = new Map<string, ContractCase>();
  for (const item of file.cases) {
    if (file.sources[item.source] === undefined) throw new Error(`missing process contract source: ${item.source}`);
    if (!Number.isInteger(item.status) || item.status < 0 || item.status > 255) throw new Error('invalid process contract status');
    if (typeof item.stdout !== 'string' || typeof item.stderr !== 'string') throw new Error('invalid process contract streams');
    const key = contractKey(item);
    if (cases.has(key)) throw new Error(`duplicate process contract: ${key}`);
    cases.set(key, item);
  }
  return (source, options) => {
    const key = contractKey(contractRequest(source, options));
    const item = cases.get(key);
    if (item === undefined) throw new Error(`missing reviewed process contract: ${key}\nAdd an explicit expectation; never derive it from generated output.`);
    return { status: item.status, stdout: Buffer.from(item.stdout), stderr: Buffer.from(item.stderr) };
  };
}
let reader: ReturnType<typeof contractReader> | undefined;
export function expectedText(source: string, options?: ContractOptions): ContractResult {
  reader ??= contractReader(JSON.parse(readFileSync(new URL('./contracts/process.json', import.meta.url), 'utf8')) as ContractFile);
  return reader(source, options);
}
