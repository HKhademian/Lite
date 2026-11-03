/** Internal bootstrap driver and harness. There is no public bootstrap command. */

import { compile, execute, LiteFault, type Program } from './lite.ts';
import { loadBundle, loadSource, type Bundle, type LineMapEntry } from './loader.ts';

/** Captured process-style result with raw UTF-8 bytes. */
export type RunResult = Readonly<{ status: number; stdout: Buffer; stderr: Buffer }>;

/** Fixed arguments, stdin and optional diagnostic name/line map for one run. */
export type RunOptions = Readonly<{
  args?: readonly string[];
  stdin?: string | Uint8Array;
  name?: string;
  lineMap?: readonly LineMapEntry[];
}>;

/** One compiler invocation: source text plus an optional name or bundle line map. */
export type CompilerInput = Readonly<{
  text: string;
  name?: string;
  lineMap?: readonly LineMapEntry[];
}>;

/** A stage-0-compiled compiler bundle, reusable across target sources. */
export type CompilerInstance = Readonly<{
  bundle: Bundle;
  compile: (input: CompilerInput) => RunResult;
}>;

const empty = Buffer.alloc(0);

/**
 * Decodes fixed stdin strictly. Throwing here is reported as an input fault by
 * the caller, matching the CLI's invalid UTF-8 behavior.
 */
function stdinText(input: string | Uint8Array | undefined): string {
  if (input === undefined) return '';
  if (typeof input === 'string') return input;
  return new TextDecoder('utf-8', { fatal: true }).decode(input);
}

/**
 * Formats one failed compile/execute position. A line map wins over `name`;
 * without either, the position is printed without a prefix.
 */
function faultText(error: unknown, options: RunOptions): string {
  const name = options.name;
  if (error instanceof LiteFault) {
    const mapped = options.lineMap?.[error.at.line - 1];
    const prefix = mapped !== undefined ? `${mapped.path}:${mapped.line}`
      : name !== undefined ? `${name}:${error.at.line}`
        : `${error.at.line}`;
    return `${prefix}:${error.at.column}: ${error.category}: ${error.message}\n`;
  }
  const prefix = name === undefined ? '' : `${name}: `;
  if (error instanceof RangeError) return `${prefix}igniter resource/nesting limit exceeded\n`;
  return `${prefix}${error instanceof Error ? error.message : String(error)}\n`;
}

/** Converts one fault to a captured result with empty stdout. */
function faultResult(error: unknown, options: RunOptions): RunResult {
  return { status: 1, stdout: empty, stderr: Buffer.from(faultText(error, options)) };
}

/** Preserves a loader error's own path-bearing message without a second prefix. */
function loadFaultResult(error: unknown): RunResult {
  return {
    status: 1,
    stdout: empty,
    stderr: Buffer.from(`${error instanceof Error ? error.message : String(error)}\n`),
  };
}

/**
 * Executes one checked program with in-memory stdio. Reports and runtime faults
 * after earlier output are appended in order.
 */
function executeProgram(program: Program, options: RunOptions): RunResult {
  let text: string;
  try {
    text = stdinText(options.stdin);
  } catch {
    return { status: 1, stdout: empty, stderr: Buffer.from('InputFault: cannot read input: invalid UTF-8\n') };
  }
  const chars = Array.from(text);
  let cursor = 0;
  let stdout = '';
  let stderr = '';
  try {
    const status = execute(program, {
      args: options.args ?? [],
      read: () => chars[cursor++] ?? null,
      report: value => { stdout += value; },
      reportError: value => { stderr += value; },
    });
    return { status, stdout: Buffer.from(stdout), stderr: Buffer.from(stderr) };
  } catch (error: unknown) {
    return {
      status: 1,
      stdout: Buffer.from(stdout),
      stderr: Buffer.concat([Buffer.from(stderr), Buffer.from(faultText(error, options))]),
    };
  }
}

/** Compiles and runs one Lite source string with fixed arguments and stdin. */
export function runText(source: string, options: RunOptions = {}): RunResult {
  let program: Program;
  try {
    program = compile(source);
  } catch (error: unknown) {
    return faultResult(error, options);
  }
  return executeProgram(program, options);
}

/** Loads one file through the temporary flat-import loader and runs it. */
export function runFile(path: string, options: RunOptions = {}): RunResult {
  const name = options.name ?? path;
  try {
    return runText(loadSource(path), { ...options, name });
  } catch (error: unknown) {
    return loadFaultResult(error);
  }
}

/** Loads one manifest bundle and runs it with the bundle line map in faults. */
export function runBundle(manifestPath: string, options: RunOptions = {}): RunResult {
  try {
    const bundle = loadBundle(manifestPath);
    return runText(bundle.text, { ...options, name: options.name ?? manifestPath, lineMap: bundle.lineMap });
  } catch (error: unknown) {
    return loadFaultResult(error);
  }
}

/**
 * Rewrites compiler diagnostics that reference flattened bundle lines:
 * `line:column: message` becomes `original path:line:column: message`.
 */
function mapDiagnostics(text: string, lineMap: readonly LineMapEntry[]): string {
  return text.split('\n').map(line => {
    const match = /^(\d+):(\d+): (.*)$/.exec(line);
    if (match === null) return line;
    const sourceLine = Number(match[1]);
    const column = match[2] ?? '';
    const message = match[3] ?? '';
    const mapped = lineMap[sourceLine - 1];
    if (mapped === undefined) throw new Error(`unmapped bundle diagnostic line ${sourceLine}`);
    return `${mapped.path}:${mapped.line}:${column}: ${message}`;
  }).join('\n');
}

/**
 * Loads and stage-0 compiles one target manifest. The compiled bundle is reused
 * for every target source; this does not add a public command.
 */
export function loadCompiler(manifestPath: string): CompilerInstance {
  const bundle = loadBundle(manifestPath);
  let program: Program;
  try {
    program = compile(bundle.text);
  } catch (error: unknown) {
    throw new Error(`${manifestPath}: cannot compile bundle: ${faultText(error, { lineMap: bundle.lineMap }).trimEnd()}`);
  }
  return {
    bundle,
    compile: input => {
      const mapped = input.lineMap;
      const options: RunOptions = {
        args: mapped === undefined && input.name !== undefined ? [input.name] : [],
        stdin: input.text,
        name: manifestPath,
        lineMap: bundle.lineMap,
      };
      const result = executeProgram(program, options);
      return mapped === undefined ? result : { ...result, stderr: Buffer.from(mapDiagnostics(result.stderr.toString('utf8'), mapped)) };
    },
  };
}

export { hashBytes, nondeterminismReasons, benchmark } from './measure.ts';
