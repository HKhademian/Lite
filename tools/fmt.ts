#!/usr/bin/env node
/** Format Lite (.lts) source files with canonical indentation and spacing. */
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { showToolVersion } from './tool-version.ts';

type ScanState = Readonly<{ inBlockComment: boolean }>;

function scanLineBraces(line: string, state: ScanState): {
  leadingCloses: number;
  netChange: number;
  normalized: string;
  nextState: ScanState;
} {
  let inBlock = state.inBlockComment;
  let inString: string | null = null;
  let leadingCloses = 0;
  let sawCode = false;
  let netChange = 0;
  const out: string[] = [];
  let i = 0;

  while (i < line.length) {
    const ch = line[i]!;
    if (inBlock) {
      out.push(ch);
      if (ch === '*' && line[i + 1] === '/') {
        out.push('/');
        inBlock = false;
        i += 2;
        continue;
      }
      i += 1;
      continue;
    }
    if (inString !== null) {
      out.push(ch);
      if (ch === '\\' && i + 1 < line.length) {
        out.push(line[i + 1]!);
        i += 2;
        continue;
      }
      if (ch === inString) inString = null;
      i += 1;
      continue;
    }
    if (ch === '/' && line[i + 1] === '/') {
      out.push(line.slice(i));
      break;
    }
    if (ch === '/' && line[i + 1] === '*') {
      out.push('/*');
      inBlock = true;
      sawCode = true;
      i += 2;
      continue;
    }
    if (ch === '"' || ch === "'") {
      inString = ch;
      sawCode = true;
      out.push(ch);
      i += 1;
      continue;
    }
    if (ch === '}') {
      if (!sawCode) leadingCloses += 1;
      else netChange -= 1;
      out.push('}');
      sawCode = true;
      if (line[i + 1] !== undefined && /[a-zA-Z]/.test(line[i + 1]!)) {
        out.push(' ');
      }
      i += 1;
      continue;
    }
    if (ch === '{') {
      if (out.length > 0 && !/[\s(\[]/.test(out[out.length - 1]!)) {
        out.push(' ');
      }
      netChange += 1;
      out.push('{');
      sawCode = true;
      i += 1;
      continue;
    }
    if (!/\s/.test(ch)) sawCode = true;
    out.push(ch);
    i += 1;
  }

  const totalNet = netChange - leadingCloses;
  return {
    leadingCloses,
    netChange: totalNet,
    normalized: out.join('').trimEnd(),
    nextState: { inBlockComment: inBlock },
  };
}

/** Formats Lite source text cleanly and idempotently (4-space indentation, LF, single trailing newline). */
export function formatLite(source: string): string {
  const lines = source.replace(/\r\n?/g, '\n').split('\n');
  const formatted: string[] = [];
  let depth = 0;
  let state: ScanState = { inBlockComment: false };
  let blankRun = 0;

  for (const rawLine of lines) {
    const trimmed = rawLine.trimEnd();
    if (trimmed.trim() === '') {
      if (formatted.length > 0 && blankRun === 0) {
        formatted.push('');
        blankRun = 1;
      }
      continue;
    }
    blankRun = 0;

    if (state.inBlockComment) {
      formatted.push(trimmed);
      state = scanLineBraces(trimmed, state).nextState;
      continue;
    }

    const body = trimmed.trimStart();
    const scanned = scanLineBraces(body, state);
    const lineDepth = Math.max(0, depth - scanned.leadingCloses);
    formatted.push(`${'    '.repeat(lineDepth)}${scanned.normalized}`);
    depth = Math.max(0, depth + scanned.netChange);
    state = scanned.nextState;
  }

  while (formatted.length > 0 && formatted[formatted.length - 1] === '') {
    formatted.pop();
  }
  return formatted.length === 0 ? '' : `${formatted.join('\n')}\n`;
}

function collectLtsFiles(paths: readonly string[]): string[] {
  const files: string[] = [];
  const visit = (target: string): void => {
    const resolved = resolve(target);
    const st = statSync(resolved);
    if (st.isDirectory()) {
      for (const entry of readdirSync(resolved).sort()) {
        if (entry === 'node_modules' || entry === 'dist' || entry.startsWith('.')) continue;
        visit(resolve(resolved, entry));
      }
      return;
    }
    if (resolved.endsWith('.lts')) files.push(resolved);
  };
  for (const p of paths) visit(p);
  return files;
}

if (import.meta.main) {
  if (showToolVersion('formatter', 'fmt')) process.exit(0);

  const args = process.argv.slice(2);
  let checkOnly = false;
  const targets: string[] = [];

  for (const arg of args) {
    if (arg === '--help' || arg === '-h') {
      process.stdout.write(
        'Usage: ./bin/lite fmt [--check] [FILE_OR_DIR... | -]\n\n' +
        'Options:\n' +
        '  --check   Exit with status 1 if any file is not formatted\n',
      );
      process.exit(0);
    }
    if (arg === '--check') {
      checkOnly = true;
      continue;
    }
    if (arg === '--write') continue;
    targets.push(arg);
  }

  if (targets.length === 0) {
    process.stderr.write('Usage: ./bin/lite fmt [--check] [FILE_OR_DIR... | -]\n');
    process.exit(2);
  }

  if (targets.length === 1 && targets[0] === '-') {
    const input = readFileSync(0, 'utf8');
    const output = formatLite(input);
    if (checkOnly) process.exit(input === output ? 0 : 1);
    process.stdout.write(output);
    process.exit(0);
  }

  const files = collectLtsFiles(targets);
  let dirty = 0;
  for (const file of files) {
    const before = readFileSync(file, 'utf8');
    const after = formatLite(before);
    if (before !== after) {
      dirty += 1;
      if (checkOnly) {
        process.stdout.write(`${file}\n`);
      } else {
        writeFileSync(file, after, 'utf8');
      }
    }
  }
  if (checkOnly && dirty > 0) process.exit(1);
}
