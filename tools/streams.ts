/** One byte-exact stream representation for tools, cases and existing verifiers. */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { sha256 } from './project.ts';

export type Stream = (
  { text: string; bytes?: never; file?: never } |
  { bytes: readonly number[]; text?: never; file?: never } |
  { file: string; text?: never; bytes?: never }
) & { hash?: string };

export function streamBytes(value: unknown, directory: string, label = 'stream', options: { requiredHash?: boolean; siblingOnly?: boolean; checkHash?: boolean } = {}): Buffer {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new Error(`${label}: stream must be an object`);
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record);
  if (keys.some(key => !['text', 'bytes', 'file', 'hash'].includes(key))) throw new Error(`${label}: unexpected stream key`);
  const forms = keys.filter(key => key !== 'hash');
  if (forms.length !== 1) throw new Error(`${label}: exactly one of text, bytes or file required`);
  let bytes: Buffer;
  if (forms[0] === 'text') {
    if (typeof record['text'] !== 'string') throw new Error(`${label}.text must be a string`);
    bytes = Buffer.from(record['text'], 'utf8');
  } else if (forms[0] === 'bytes') {
    const values = record['bytes'];
    if (!Array.isArray(values) || !values.every(byte => typeof byte === 'number' && Number.isInteger(byte) && byte >= 0 && byte <= 255)) throw new Error(`${label}.bytes must contain integers 0–255`);
    bytes = Buffer.from(values as number[]);
  } else {
    const file = record['file'];
    if (typeof file !== 'string' || !file || (options.siblingOnly && !/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(file))) throw new Error(`${label}.file must be ${options.siblingOnly ? 'a sibling file name' : 'a nonempty file path'}`);
    bytes = readFileSync(resolve(directory, file));
  }
  const hash = record['hash'];
  if ((options.requiredHash || hash !== undefined) && (typeof hash !== 'string' || !/^sha256:[0-9a-f]{64}$/.test(hash))) throw new Error(`${label}.hash must be sha256:<64 lowercase hex>`);
  if (options.checkHash !== false && hash !== undefined && hash !== `sha256:${sha256(bytes)}`) throw new Error(`${label}.hash does not match content`);
  return bytes;
}
