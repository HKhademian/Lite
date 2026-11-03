/** Shared reviewed compiler fixtures; no compiler or interpreter imports. */
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { streamBytes } from '../tools/streams.ts';


export type CompilerFixture = Readonly<{
  file: string;
  category: 'program' | 'rejected';
  subcategory: string;
  name: string;
  caseName: string;
  sourcePath?: string;
  source: string;
  stdin: Buffer;
  stdout: Buffer;
  stderr: Buffer;
  exitCode: number;
}>;


const fixtureFile = /^(\d{3})-(\d{3})-([a-z0-9]+(?:-[a-z0-9]+)*)\.json$/;



const sha256 = (bytes: Buffer): string => `sha256:${createHash('sha256').update(bytes).digest('hex')}`;


/** Narrows one parsed JSON value to an object, with the fixture file in the error. */
function fixtureRecord(value: unknown, file: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`${file}: expected a JSON object`);
  }
  return value as Record<string, unknown>;
}


/** Rejects unknown keys so fixture typos cannot silently change semantics. */
function checkKeys(record: Record<string, unknown>, allowed: readonly string[], file: string, label: string): void {
  for (const key of Object.keys(record)) {
    if (!allowed.includes(key)) throw new Error(`${file}: unexpected ${label} key ${key}`);
  }
}


/** Reads one stdin/stdout/stderr fixture stream from text, bytes or a sibling file, checking its hash. */
function readStream(value: unknown, file: string, label: string, directory: URL, required: boolean): Buffer {
  if (value === undefined) {
    if (required) throw new Error(`${file}: ${label} is required`);
    return Buffer.alloc(0);
  }
  return streamBytes(value, fileURLToPath(directory), `${file}: ${label}`, { requiredHash: true, siblingOnly: true });
}


/** Loads and validates every compiler verification case under tests/compiler/. */
function loadCompilerFixtures(): readonly CompilerFixture[] {
  const directory = new URL('./tests/compiler/', import.meta.url);
  const files = readdirSync(directory).filter(file => file.endsWith('.json')).sort();
  const names = new Set<string>();
  const fixtures: CompilerFixture[] = [];
  for (const file of files) {
    const match = fixtureFile.exec(file);
    if (match === null) throw new Error(`${file}: expected NNN-MMM-title-subtitle.json`);
    const categoryCode = match[1] ?? '';
    const subcategory = match[2] ?? '';
    const slug = match[3] ?? '';
    const category = categoryCode === '001' ? 'program' : categoryCode === '002' ? 'rejected' : undefined;
    if (category === undefined) throw new Error(`${file}: category must be 001 (program) or 002 (rejected)`);
    const record = fixtureRecord(JSON.parse(readFileSync(new URL(file, directory), 'utf8')), file);
    checkKeys(record, ['name', 'source', 'cases'], file, 'fixture');
    if (record['name'] !== slug) throw new Error(`${file}: name must be ${JSON.stringify(slug)}`);
    if (names.has(slug)) throw new Error(`${file}: duplicate fixture name ${slug}`);
    names.add(slug);
    const sourceRecord = fixtureRecord(record['source'], file);
    checkKeys(sourceRecord, ['file', 'text', 'bytes', 'hash'], file, 'source');
    const sourceForms = ['file', 'text', 'bytes'].filter(key => sourceRecord[key] !== undefined);
    if (sourceForms.length !== 1) throw new Error(`${file}: source must contain exactly one of file, text or bytes`);
    const expectedSourceHash = sourceRecord['hash'];
    if (typeof expectedSourceHash !== 'string' || !/^sha256:[0-9a-f]{64}$/.test(expectedSourceHash)) {
      throw new Error(`${file}: source.hash must be sha256:<64 lowercase hex>`);
    }
    let sourcePath: string | undefined;
    let sourceBytes: Buffer;
    if (sourceForms[0] === 'file') {
      sourcePath = `${file.slice(0, -'.json'.length)}.lts`;
      if (sourceRecord['file'] !== sourcePath) throw new Error(`${file}: source.file must be ${JSON.stringify(sourcePath)}`);
      sourceBytes = readFileSync(new URL(sourcePath, directory));
    } else if (sourceForms[0] === 'text') {
      const sourceText = sourceRecord['text'];
      if (typeof sourceText !== 'string') throw new Error(`${file}: source.text must be a string`);
      sourceBytes = Buffer.from(sourceText, 'utf8');
    } else {
      const values = sourceRecord['bytes'];
      if (!Array.isArray(values) || !values.every(byte =>
        typeof byte === 'number' && Number.isInteger(byte) && byte >= 0 && byte <= 255)) {
        throw new Error(`${file}: source.bytes must be an array of bytes`);
      }
      sourceBytes = Buffer.from(values as number[]);
    }
    if (expectedSourceHash !== sha256(sourceBytes)) throw new Error(`${file}: source.hash does not match content`);
    const source = sourceBytes.toString('utf8');
    const caseValues = record['cases'];
    if (!Array.isArray(caseValues) || caseValues.length === 0) throw new Error(`${file}: cases must be a nonempty array`);
    const caseNames = new Set<string>();
    for (const caseValue of caseValues) {
      const scenario = fixtureRecord(caseValue, file);
      checkKeys(scenario, ['name', 'stdin', 'stdout', 'stderr', 'exitCode'], file, 'case');
      const caseName = scenario['name'];
      if (typeof caseName !== 'string' || caseName.length === 0) throw new Error(`${file}: case.name must be a nonempty string`);
      if (caseNames.has(caseName)) throw new Error(`${file}: duplicate case name ${caseName}`);
      caseNames.add(caseName);
      if (category === 'rejected' && scenario['stdin'] !== undefined) {
        throw new Error(`${file}: rejected cases take no stdin`);
      }
      const stdin = readStream(scenario['stdin'], file, `${caseName}.stdin`, directory, false);
      const stdout = readStream(scenario['stdout'], file, `${caseName}.stdout`, directory, false);
      const stderr = readStream(scenario['stderr'], file, `${caseName}.stderr`, directory, false);
      const exitCode = scenario['exitCode'];
      if (typeof exitCode !== 'number' || !Number.isInteger(exitCode) || exitCode < 0 || exitCode > 255) {
        throw new Error(`${file}: ${caseName}.exitCode must be a byte`);
      }
      fixtures.push({ file, category, subcategory, name: slug, caseName, ...(sourcePath === undefined ? {} : { sourcePath }),
        source, stdin, stdout, stderr, exitCode });
    }
  }
  return fixtures;
}


export const compilerFixtures = loadCompilerFixtures();

export const programFixtures = compilerFixtures.filter(fixture => fixture.category === 'program');

export const rejectionFixtures = compilerFixtures.filter(fixture => fixture.category === 'rejected');