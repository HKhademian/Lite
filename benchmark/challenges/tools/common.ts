/** Shared data shapes and dependency-free I/O for the challenge maintenance tools. */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = fileURLToPath(new URL('../', import.meta.url));
export const DATA = join(ROOT, 'data');
export const CACHE = join(ROOT, '.cache');
export const BENCH = join(ROOT, 'benchmark');
export type Difficulty = { scale: string; raw: string | number; normalized: number };
export type Challenge = {
  id: string; title: string; source: string; url: string; native_id: string;
  set: string | null; number: number | null; category: string; primary_topic: string | null;
  topics: string[]; raw_topics: string[]; tags: string[]; difficulty: Difficulty;
  formats: string[]; languages: string[]; topics_source: string;
  popularity: { solved?: number; attempts?: number; acceptance?: number | null; users?: number } | null;
  premium: boolean; status: string;
};
export type Group = { name: string; challenge_ids: string[] };
export type List = { id: string; title: string; kind: string; source: string; url: string; description: string; count: number; groups?: Group[]; challenge_ids: string[] };
export type TestCase = { name: string; kind: string; input: string; output: string; explanation: string | null };
export type Tests = { challenge_id: string; url: string; source: string; format: string; status: string; public: TestCase[]; hidden: TestCase[]; hidden_policy: string; note: string | null };
export type Question = { frontend_id: string | number; problem_slug: string; topics?: string[]; examples?: { example_text?: string }[]; description?: string };
export type Tree = { tree: { type: string; path: string }[] };
export type Reference = { language: string; url: string; license: string; status?: string; verified_answer?: boolean };
export type BenchmarkTests = { public: number; hidden: number; public_path?: string; hidden_path?: string; hidden_kind?: string };
export type Item = { id: string; source: string; title: string; url: string; harness: string; selection?: string; tests: BenchmarkTests; reference: string };
export type Meta = Omit<Item, 'reference'> & { category: string; topics: string[]; difficulty: Difficulty; statement: string; reference_solutions: Reference[]; input_format?: string; answer_sha256?: string; license_note: string };

/** JSON shapes are checked by the validators; cached source adapters supply their upstream schema. */
export function readJson<T>(path: string): T { return JSON.parse(readFileSync(path, 'utf8')) as T; }
export function readJsonl<T>(path: string): T[] { return readFileSync(path, 'utf8').split(/\r?\n/).filter(line => line.trim()).map(line => JSON.parse(line) as T); }
export function writeJson(path: string, value: unknown): void { mkdirSync(dirname(path), { recursive: true }); writeFileSync(path, JSON.stringify(value, null, 2) + '\n'); }
export function writeJsonl(path: string, rows: readonly unknown[]): void { mkdirSync(dirname(path), { recursive: true }); writeFileSync(path, rows.map(row => JSON.stringify(row) + '\n').join('')); }
export function text(path: string): string { return readFileSync(path, 'utf8').replace(/\r\n?/g, '\n'); }
export function optionalText(path: string): string { return existsSync(path) ? text(path) : ''; }
export function fail(message: string): never { process.stderr.write(`FAIL: ${message}\n`); process.exit(1); }
export function counts(values: Iterable<string>): Record<string, number> {
  const out = new Map<string, number>();
  for (const value of values) out.set(value, (out.get(value) ?? 0) + 1);
  return Object.fromEntries([...out].sort((a, b) => b[1] - a[1]));
}
export function csv(rows: readonly (readonly (string | number | boolean | null)[])[]): string {
  return rows.map(row => row.map(value => {
    const s = value === null ? '' : typeof value === 'boolean' ? (value ? 'True' : 'False') : String(value);
    return /[",\r\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
  }).join(',') + '\r\n').join('');
}
export function band(value: number): string { return value <= 2 ? 'beginner' : value <= 4 ? 'easy' : value <= 6 ? 'intermediate' : value <= 8 ? 'advanced' : 'expert'; }
/** Preserve the existing CSV spelling of float scores and integer Cryptopals levels. */
export function normalizedText(record: Pick<Challenge, 'source' | 'difficulty'>): string {
  const value = record.difficulty.normalized;
  return record.source !== 'cryptopals' && Number.isInteger(value) ? value.toFixed(1) : String(value);
}
export function unique<T>(values: Iterable<T>): T[] { return [...new Set(values)]; }
export function slugify(value: string): string { return value.trim().toLowerCase().replaceAll('&', ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''); }

// HTML5 named references, extracted as data from the prior standard-library decoder.
const entities = readJson<Record<string, string>>(fileURLToPath(new URL('html-entities.json', import.meta.url)));
const legacyNumeric = [8364,129,8218,402,8222,8230,8224,8225,710,8240,352,8249,338,141,381,143,144,8216,8217,8220,8221,8226,8211,8212,732,8482,353,8250,339,157,382,376];
export function unescapeHtml(value: string): string {
  return value.replace(/&(#(?:[xX][\da-fA-F]+|\d+);?|[^\t\n\f <&#;]{1,32};?)/g, (original: string, name: string) => {
    if (name.startsWith('#')) {
      const raw = name.replace(/;$/, '');
      const n = /^#x/i.test(raw) ? Number.parseInt(raw.slice(2), 16) : Number.parseInt(raw.slice(1), 10);
      if (n === 0 || n > 0x10ffff || (n >= 0xd800 && n <= 0xdfff)) return '\ufffd';
      if (n >= 128 && n <= 159) return String.fromCodePoint(legacyNumeric[n - 128]!);
      if ((n >= 1 && n <= 8) || n === 11 || (n >= 14 && n <= 31) || n === 127 || (n >= 0xfdd0 && n <= 0xfdef) || (n & 0xffff) >= 0xfffe) return '';
      return String.fromCodePoint(n);
    }
    for (let size = name.length; size > 1; size--) {
      const replacement = entities[name.slice(0, size)];
      if (replacement !== undefined) return replacement + name.slice(size);
    }
    return original;
  });
}
export function clean(value: string): string { return unescapeHtml(value.replace(/<[^>]+>/g, '')).replace(/\s+/gu, ' ').trim(); }

/** Preserve the earlier ties-to-even decimal rounding used by normalized metadata. */
export function round(value: number, digits: number): number {
  if (!Number.isFinite(value) || !Number.isInteger(digits) || digits < 0 || digits > 12) throw new Error('invalid metadata rounding');
  const bits = new DataView(new ArrayBuffer(8)); bits.setFloat64(0, Math.abs(value));
  const raw = bits.getBigUint64(0), exponent = Number((raw >> 52n) & 2047n);
  const mantissa = (raw & ((1n << 52n) - 1n)) | (exponent === 0 ? 0n : 1n << 52n);
  const shift = (exponent === 0 ? -1074 : exponent - 1075) + digits;
  let numerator = mantissa * 5n ** BigInt(digits), denominator = 1n;
  if (shift >= 0) numerator <<= BigInt(shift); else denominator <<= BigInt(-shift);
  let integer = numerator / denominator;
  const remainder = numerator % denominator;
  if (remainder * 2n > denominator || (remainder * 2n === denominator && integer % 2n !== 0n)) integer++;
  return (value < 0 ? -1 : 1) * Number(integer) / 10 ** digits;
}

/** Small command option reader with explicit allowed switches and repeated values. */
export function options(values: readonly string[], allowed: Readonly<Record<string, 'flag' | 'value' | 'repeat'>>): Map<string, string[]> {
  const out = new Map<string, string[]>();
  function invalid(message: string): never { process.stderr.write(`${message}\n`); process.exit(2); }
  for (let i = 0; i < values.length; i++) {
    const argument = values[i]!;
    const equals = argument.indexOf('=');
    const name = equals < 0 ? argument : argument.slice(0, equals);
    const kind = allowed[name];
    if (kind === undefined) invalid(`unknown option ${name}`);
    if (kind === 'flag' && equals >= 0) invalid(`${name} does not accept a value`);
    const value = kind === 'flag' ? 'true' : equals >= 0 ? argument.slice(equals + 1) : values[++i];
    if (value === undefined || (kind !== 'flag' && value.startsWith('--'))) invalid(`missing value for ${name}`);
    out.set(name, kind === 'repeat' ? [...out.get(name) ?? [], value] : [value]);
  }
  return out;
}
