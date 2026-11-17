#!/usr/bin/env node
/** Host entrypoint for Lite-implemented documentation discovery and checks (`tools/src/docs.lts` -> `dist/tools/docs.ts`). */
import { spawnSync } from 'node:child_process';
import { ensureTool, root, runIgnitedTool } from './project.ts';

export type Document = { path: string; title: string; headings: string[] };

export type RenderedTocItem = Readonly<{
  level: number;
  id: string;
  text: string;
}>;

export type RenderedDocument = Readonly<{
  path: string;
  title: string;
  status: string;
  toc: readonly RenderedTocItem[];
  html: string;
}>;

export type ModuleSymbolDoc = Readonly<{
  kind: 'type' | 'fn' | 'const';
  name: string;
  signature: string;
  isHostDeclaration: boolean;
  doc: string;
  line: number;
}>;

export type ModuleApiDoc = Readonly<{
  id: string;
  namespace: string;
  name: string;
  file: string;
  environment: 'universal' | 'play' | 'cli';
  summary: string;
  symbols: readonly ModuleSymbolDoc[];
}>;

function runDocs(args: readonly string[], directory: string, stdinInput?: string) {
  const result = spawnSync(process.execPath, [ensureTool('docs'), ...args], {
    cwd: root,
    env: { ...process.env, LITE_DOCS_ROOT: directory },
    input: stdinInput ?? '',
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
  if (result.error) throw result.error;
  return result;
}

/** Discovers Markdown documents and their extracted headings under `directory`. */
export function documents(directory = root): Document[] {
  const result = runDocs(['--json'], directory);
  if (result.status !== 0 || result.signal !== null) {
    throw new Error(`lite docs --json failed (${result.status ?? result.signal}): ${result.stderr}`);
  }
  return JSON.parse(result.stdout) as Document[];
}

/** Renders selected Markdown files under `directory` (or all discovered files when omitted) via `util/markdown-html`. */
export function renderDocuments(paths?: readonly string[], directory = root): RenderedDocument[] {
  const stdinInput = paths !== undefined && paths.length > 0 ? `${paths.join('\n')}\n` : undefined;
  const result = runDocs(['--render-json'], directory, stdinInput);
  if (result.status !== 0 || result.signal !== null) {
    throw new Error(`lite docs --render-json failed (${result.status ?? result.signal}): ${result.stderr}`);
  }
  return JSON.parse(result.stdout) as RenderedDocument[];
}

/** Extracts `pub` symbol APIs and summaries for `lib/core` and `lib/extra` under `directory` via `util/docgen`. */
export function extractModules(directory = root): ModuleApiDoc[] {
  const result = runDocs(['--modules-json'], directory);
  if (result.status !== 0 || result.signal !== null) {
    throw new Error(`lite docs --modules-json failed (${result.status ?? result.signal}): ${result.stderr}`);
  }
  return JSON.parse(result.stdout) as ModuleApiDoc[];
}

/** Verifies Markdown fences, links, heading fragments, and `config/documentation.json` entries under `directory`. */
export function checkDocuments(directory = root): string[] {
  const result = runDocs(['--check'], directory);
  if (result.status === 0 && result.signal === null) return [];
  const text = result.stderr.trimEnd();
  return text === '' ? [`lite docs --check failed (${result.status ?? result.signal})`] : text.split('\n');
}

if (import.meta.main) {
  await runIgnitedTool('docs');
}
