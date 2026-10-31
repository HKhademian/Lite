import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { compile, execute, LiteFault } from './lite.ts';
import { loadSource } from './loader.ts';

type Stream = Readonly<{ text?: string; bytes?: readonly number[]; file?: string }>;
type Scenario = Readonly<{
  name: string;
  args?: readonly string[];
  stdin?: Stream;
  stdout?: Stream;
  stderr?: Stream;
  exitCode: number;
}>;
type Kind = 'feature' | 'example' | 'sample' | 'showcase';
type Manifest = {
  file: string;
  kind: Kind;
  id: string;
  source: string;
  sourcePath: string;
  features: readonly string[];
  guideline?: string;
  description?: string;
  append?: string;
  sourceHash?: string;
  cases: Scenario[];
};
type RegistryEntry = Readonly<{
  id: string;
  summary: string;
  casePath: string;
  status: 'verified' | 'pending';
  docs: readonly string[];
}>;

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const verifications = resolve(root, 'verifications');

const options = { update: false, coverage: false, filter: undefined as string | undefined };
for (let index = 0; index < process.argv.length - 2; index += 1) {
  const flag = process.argv[index + 2] ?? '';
  if (flag === '--update') options.update = true;
  else if (flag === '--coverage') options.coverage = true;
  else if (flag === '--filter') {
    const value = process.argv[index + 3];
    if (value === undefined) usage('--filter requires a value');
    options.filter = value;
    index += 1;
  } else if (flag === '--help' || flag === '-h') usage(undefined, 0);
  else usage(`unknown argument ${flag}`);
}

function usage(message?: string, code = 2): never {
  if (message !== undefined) process.stderr.write(`lite verify: ${message}\n`);
  const target = code === 0 ? process.stdout : process.stderr;
  target.write('Usage: ./lite verify [--update] [--coverage] [--filter id-or-path]\n');
  process.exit(code);
}

function object(value: unknown, label: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new Error(`${label}: expected an object`);
  return value as Record<string, unknown>;
}

function checkKeys(record: Record<string, unknown>, allowed: readonly string[], label: string): void {
  for (const key of Object.keys(record)) {
    if (!allowed.includes(key)) throw new Error(`${label}: unexpected key ${key}`);
  }
}

function text(value: unknown, label: string): string {
  if (typeof value !== 'string') throw new Error(`${label}: expected a string`);
  return value;
}

function strings(value: unknown, label: string): readonly string[] {
  if (!Array.isArray(value) || !value.every(item => typeof item === 'string')) {
    throw new Error(`${label}: expected an array of strings`);
  }
  return value as string[];
}

function stream(value: unknown, label: string): Stream | undefined {
  if (value === undefined) return undefined;
  const record = object(value, label);
  checkKeys(record, ['text', 'bytes', 'file'], label);
  const forms = ['text', 'bytes', 'file'].filter(key => record[key] !== undefined);
  if (forms.length !== 1) throw new Error(`${label}: expected exactly one of text, bytes or file`);
  const form = forms[0];
  if (form === 'text') return { text: text(record['text'], `${label}.text`) };
  if (form === 'bytes') {
    const bytes = record['bytes'];
    if (!Array.isArray(bytes) || !bytes.every(byte =>
      typeof byte === 'number' && Number.isInteger(byte) && byte >= 0 && byte <= 255)) {
      throw new Error(`${label}.bytes: expected an array of bytes`);
    }
    return { bytes: bytes as number[] };
  }
  const file = text(record['file'], `${label}.file`);
  if (isAbsolute(file)) throw new Error(`${label}.file: expected a relative path`);
  return { file };
}

function streamBytes(value: Stream | undefined, base: string, label: string): Buffer {
  if (value === undefined) return Buffer.alloc(0);
  if (value.text !== undefined) return Buffer.from(value.text, 'utf8');
  if (value.bytes !== undefined) return Buffer.from(value.bytes);
  const path = resolve(base, value.file ?? '');
  if (!path.startsWith(`${base}/`) && path !== base) throw new Error(`${label}.file: path escapes its directory`);
  return readFileSync(path);
}

function streamText(value: Stream | undefined, base: string, label: string): string {
  const bytes = streamBytes(value, base, label);
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    throw new Error(`${label}: expected UTF-8 text for the igniter target`);
  }
}

function scenario(value: unknown, label: string): Scenario {
  const record = object(value, label);
  checkKeys(record, ['name', 'args', 'stdin', 'stdout', 'stderr', 'exitCode'], label);
  const name = text(record['name'], `${label}.name`);
  const args = record['args'] === undefined ? undefined : strings(record['args'], `${label}.args`);
  const exitCode = record['exitCode'];
  if (typeof exitCode !== 'number' || !Number.isInteger(exitCode) || exitCode < 0 || exitCode > 255) {
    throw new Error(`${label}.exitCode: expected a byte`);
  }
  const stdin = stream(record['stdin'], `${label}.stdin`);
  const stdout = stream(record['stdout'], `${label}.stdout`);
  const stderr = stream(record['stderr'], `${label}.stderr`);
  return {
    name,
    ...(args === undefined ? {} : { args }),
    ...(stdin === undefined ? {} : { stdin }),
    ...(stdout === undefined ? {} : { stdout }),
    ...(stderr === undefined ? {} : { stderr }),
    exitCode,
  };
}

function registry(): Map<string, RegistryEntry> {
  const path = resolve(verifications, 'features.json');
  const record = object(JSON.parse(readFileSync(path, 'utf8')), 'verifications/features.json');
  checkKeys(record, ['features'], 'verifications/features.json');
  const entries = new Map<string, RegistryEntry>();
  const features = record['features'];
  if (!Array.isArray(features)) throw new Error('verifications/features.json: features must be an array');
  for (const [index, value] of features.entries()) {
    const label = `verifications/features.json: features[${index}]`;
    const item = object(value, label);
    checkKeys(item, ['id', 'summary', 'case', 'status', 'docs'], label);
    const id = text(item['id'], `${label}.id`);
    if (entries.has(id)) throw new Error(`${label}: duplicate feature ${id}`);
    const status = item['status'];
    if (status !== 'verified' && status !== 'pending') throw new Error(`${label}.status: expected verified or pending`);
    const casePath = text(item['case'], `${label}.case`);
    if (!existsSync(resolve(verifications, casePath))) throw new Error(`${label}.case: missing ${casePath}`);
    const docs = item['docs'] === undefined ? [] : strings(item['docs'], `${label}.docs`);
    for (const doc of docs) {
      if (!existsSync(resolve(root, doc))) throw new Error(`${label}.docs: missing ${doc}`);
    }
    entries.set(id, { id, summary: text(item['summary'], `${label}.summary`), casePath, status, docs });
  }
  return entries;
}

function manifest(file: string, kind: Kind, features: Map<string, RegistryEntry>): Manifest {
  const label = file.slice(root.length + 1);
  const record = object(JSON.parse(readFileSync(file, 'utf8')), label);
  checkKeys(record, ['id', 'kind', 'source', 'features', 'guideline', 'description', 'append', 'sourceHash', 'cases'], label);
  if (record['kind'] !== kind) throw new Error(`${label}: kind must be ${kind}`);
  const id = text(record['id'], `${label}.id`);
  const source = text(record['source'], `${label}.source`);
  if (isAbsolute(source)) throw new Error(`${label}.source: expected a relative path`);
  const sourcePath = resolve(dirname(file), source);
  if (!existsSync(sourcePath) || !statSync(sourcePath).isFile()) throw new Error(`${label}.source: missing ${source}`);
  const names = strings(record['features'], `${label}.features`);
  if (names.length === 0) throw new Error(`${label}.features: at least one feature is required`);
  for (const name of names) {
    if (!features.has(name)) throw new Error(`${label}.features: unknown feature ${name}`);
  }
  if (kind === 'feature' && !names.includes(id)) throw new Error(`${label}.features: feature case must include its own id`);
  const guideline = record['guideline'] === undefined ? undefined : text(record['guideline'], `${label}.guideline`);
  if (kind === 'feature' && guideline === undefined) throw new Error(`${label}.guideline: feature cases require a guideline`);
  const description = record['description'] === undefined ? undefined : text(record['description'], `${label}.description`);
  const append = record['append'] === undefined ? undefined : text(record['append'], `${label}.append`);
  const sourceHash = record['sourceHash'] === undefined ? undefined : text(record['sourceHash'], `${label}.sourceHash`);
  if (sourceHash !== undefined && !/^sha256:[0-9a-f]{64}$/.test(sourceHash)) {
    throw new Error(`${label}.sourceHash: expected sha256:<64 lowercase hex>`);
  }
  const rawCases = record['cases'];
  if (!Array.isArray(rawCases) || rawCases.length === 0) throw new Error(`${label}.cases: at least one case is required`);
  const cases = rawCases.map((value, index) => scenario(value, `${label}.cases[${index}]`));
  const seen = new Set<string>();
  for (const item of cases) {
    if (seen.has(item.name)) throw new Error(`${label}: duplicate case name ${item.name}`);
    seen.add(item.name);
  }
  return { file, kind, id, source, sourcePath, features: names, ...(guideline === undefined ? {} : { guideline }),
    ...(description === undefined ? {} : { description }), ...(append === undefined ? {} : { append }),
    ...(sourceHash === undefined ? {} : { sourceHash }), cases };
}

function manifests(features: Map<string, RegistryEntry>): readonly Manifest[] {
  const directories: readonly [Kind, string][] = [
    ['feature', 'features'],
    ['example', 'artifacts/examples'],
    ['sample', 'artifacts/samples'],
    ['showcase', 'artifacts/showcases'],
  ];
  const result: Manifest[] = [];
  const ids = new Set<string>();
  for (const [kind, relative] of directories) {
    const directory = resolve(verifications, relative);
    if (!existsSync(directory)) continue;
    for (const file of readdirSync(directory).filter(name => name.endsWith('.json')).sort()) {
      const item = manifest(resolve(directory, file), kind, features);
      if (ids.has(item.id)) throw new Error(`${item.id}: duplicate manifest id`);
      ids.add(item.id);
      result.push(item);
    }
  }
  return result;
}

function hash(bytes: Buffer): string {
  return `sha256:${createHash('sha256').update(bytes).digest('hex')}`;
}

function matches(item: Manifest, filter: string | undefined): boolean {
  if (filter === undefined) return true;
  return item.id.includes(filter) || item.file.includes(filter) || item.features.some(feature => feature.includes(filter));
}

function describe(buffer: Buffer): string {
  return JSON.stringify(buffer.toString('utf8'));
}

function runCase(source: string, item: Manifest, fallback: Scenario): { stdout: Buffer; stderr: Buffer; exitCode: number } {
  const base = dirname(item.file);
  const input = streamText(fallback.stdin, base, `${item.id}/${fallback.name}/stdin`);
  let cursor = 0;
  let stdout = '';
  let stderr = '';
  try {
    const program = compile(source);
    const exitCode = execute(program, {
      args: [...(fallback.args ?? [])],
      read: () => input[cursor++] ?? null,
      report: value => { stdout += value; },
      reportError: value => { stderr += value; },
    });
    return { stdout: Buffer.from(stdout, 'utf8'), stderr: Buffer.from(stderr, 'utf8'), exitCode };
  } catch (error: unknown) {
    if (error instanceof LiteFault) {
      throw new Error(`${error.category}: ${error.message}`);
    }
    throw error;
  }
}

function updatedScenario(original: Scenario, actual: { stdout: Buffer; stderr: Buffer; exitCode: number }): Scenario {
  const stdout = actual.stdout.length === 0 ? undefined : { text: actual.stdout.toString('utf8') };
  const stderr = actual.stderr.length === 0 ? undefined : { text: actual.stderr.toString('utf8') };
  return {
    name: original.name,
    ...(original.args === undefined ? {} : { args: original.args }),
    ...(original.stdin === undefined ? {} : { stdin: original.stdin }),
    ...(stdout === undefined ? {} : { stdout }),
    ...(stderr === undefined ? {} : { stderr }),
    exitCode: actual.exitCode,
  };
}

function writeManifest(item: Manifest, scenarios: readonly Scenario[], sourceHash: string): void {
  const record = {
    id: item.id,
    kind: item.kind,
    source: item.source,
    features: item.features,
    ...(item.guideline === undefined ? {} : { guideline: item.guideline }),
    ...(item.description === undefined ? {} : { description: item.description }),
    ...(item.append === undefined ? {} : { append: item.append }),
    sourceHash,
    cases: scenarios,
  };
  writeFileSync(item.file, `${JSON.stringify(record, null, 2)}\n`, 'utf8');
}

function verifyFeatures() {
  const features = registry();
  const items = manifests(features);
  const featureItems = items.filter(item => item.kind === 'feature');
  for (const [id, entry] of features) {
    if (entry.status === 'verified' && !featureItems.some(item => item.id === id)) {
      throw new Error(`feature ${id}: no verification case`);
    }
    if (!existsSync(resolve(verifications, entry.casePath))) throw new Error(`feature ${id}: missing case ${entry.casePath}`);
  }
  for (const item of items) {
    if (item.kind !== 'feature') continue;
    const entry = features.get(item.id);
    if (entry === undefined) throw new Error(`${item.file}: feature ${item.id} is not registered`);
  }
  return { features, items };
}

function coverage(features: ReadonlyMap<string, RegistryEntry>, items: readonly Manifest[]): void {
  const counts = (kind: Kind): number => items.filter(item => item.kind === kind).length;
  const sourceCount = (dir: string): number => {
    const path = resolve(root, dir);
    if (!existsSync(path)) return 0;
    return readdirSync(path).filter(name => name.endsWith('.lts')).length;
  };
  const examples = sourceCount('examples');
  const samples = sourceCount('samples');
  const showcases = sourceCount('showcases');
  process.stdout.write(`features: ${features.size} registered, ${counts('feature')} cases\n`);
  process.stdout.write(`examples: ${counts('example')}/${examples} manifests\n`);
  process.stdout.write(`samples: ${counts('sample')}/${samples} manifests\n`);
  process.stdout.write(`showcases: ${counts('showcase')}/${showcases} manifests\n`);
  const pending = (kind: Kind): string[] => items.filter(item => item.kind === kind).map(item => item.source);
  process.stdout.write(`covered examples: ${pending('example').join(', ') || '(none)'}\n`);
  process.stdout.write(`covered samples: ${pending('sample').join(', ') || '(none)'}\n`);
}

function main(): void {
  let features: Map<string, RegistryEntry>;
  let items: readonly Manifest[];
  try {
    ({ features, items } = verifyFeatures());
  } catch (error: unknown) {
    process.stderr.write(`lite verify: ${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 2;
    return;
  }
  if (options.coverage) {
    coverage(features, items);
    return;
  }
  let failures = 0;
  let scenariosRun = 0;
  for (const item of items) {
    if (!matches(item, options.filter)) continue;
    const failuresBefore = failures;
    const sourceBytes = readFileSync(item.sourcePath);
    const sourceHash = hash(sourceBytes);
    const source = loadSource(item.sourcePath) + (item.append === undefined ? '' : `\n${item.append}`);
    if (!options.update && item.sourceHash !== sourceHash) {
      process.stdout.write(`FAIL ${item.id}: source hash changed; run ./lite verify --update\n`);
      failures += 1;
      continue;
    }
    const scenarios: Scenario[] = [];
    for (const original of item.cases) {
      scenariosRun += 1;
      let actual: { stdout: Buffer; stderr: Buffer; exitCode: number };
      try {
        actual = runCase(source, item, original);
      } catch (error: unknown) {
        process.stdout.write(`FAIL ${item.id}/${original.name}: ${error instanceof Error ? error.message : String(error)}\n`);
        failures += 1;
        continue;
      }
      const expectedStdout = streamBytes(original.stdout, dirname(item.file), `${item.id}/${original.name}/stdout`);
      const expectedStderr = streamBytes(original.stderr, dirname(item.file), `${item.id}/${original.name}/stderr`);
      if (options.update) {
        scenarios.push(updatedScenario(original, actual));
        continue;
      }
      if (!actual.stdout.equals(expectedStdout) || !actual.stderr.equals(expectedStderr) ||
          actual.exitCode !== original.exitCode) {
        process.stdout.write(`FAIL ${item.id}/${original.name}\n`);
        if (!actual.stdout.equals(expectedStdout)) {
          process.stdout.write(`  stdout expected ${describe(expectedStdout)} got ${describe(actual.stdout)}\n`);
        }
        if (!actual.stderr.equals(expectedStderr)) {
          process.stdout.write(`  stderr expected ${describe(expectedStderr)} got ${describe(actual.stderr)}\n`);
        }
        if (actual.exitCode !== original.exitCode) {
          process.stdout.write(`  exitCode expected ${original.exitCode} got ${actual.exitCode}\n`);
        }
        failures += 1;
        continue;
      }
      process.stdout.write(`PASS ${item.id}/${original.name}\n`);
      scenarios.push(original);
    }
    if (options.update) {
      if (failures === failuresBefore) {
        writeManifest(item, scenarios, sourceHash);
        process.stdout.write(`updated ${item.file.slice(root.length + 1)}\n`);
      }
    }
  }
  if (failures > 0) {
    process.stdout.write(`verification failed: ${failures} failing scenario(s)\n`);
    process.exitCode = 1;
    return;
  }
  if (!options.update) {
    process.stdout.write(`verification passed: ${scenariosRun} scenario(s)\n`);
  }
}

main();
