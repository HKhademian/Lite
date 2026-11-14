#!/usr/bin/env node
/** Host entrypoint for Lite-implemented documentation discovery and checks (tools/src/docs.lts -> tools/generated/docs.ts). */
import { spawnSync } from 'node:child_process';
import { writeSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { root } from './project.ts';

export type Document = { path: string; title: string; headings: string[] };

const generatedUrl = new URL('./generated/docs.ts', import.meta.url);
const generatedPath = fileURLToPath(generatedUrl);

function runDocs(args: string[], directory: string) {
  const result = spawnSync(process.execPath, [generatedPath, ...args], {
    cwd: root,
    env: { ...process.env, LITE_DOCS_ROOT: directory },
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

/** Verifies Markdown fences, links, heading fragments, and `config/documentation.json` entries under `directory`. */
export function checkDocuments(directory = root): string[] {
  const result = runDocs(['--check'], directory);
  if (result.status === 0 && result.signal === null) return [];
  const text = result.stderr.trimEnd();
  return text === '' ? [`lite docs --check failed (${result.status ?? result.signal})`] : text.split('\n');
}

if (import.meta.main) {
  const entry = generatedUrl.href;
  const mod = (await import(entry)) as { main: (write?: (text: string) => void) => string };
  mod.main((text: string): void => {
    writeSync(1, text);
  });
}
