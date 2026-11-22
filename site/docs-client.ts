/** Site-build JSON bridge to the ignited Lite documentation tool (`dist/tools/docs.ts`). */
import { spawnSync } from 'node:child_process';
import { spawnTool, repoRoot } from '../igniter/artifacts.ts';

export type Document = { path: string; title: string; headings: string[] };

export type RenderedTocItem = Readonly<{
  level: number;
  id: string;
  text: string;
  labelHtml?: string;
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
  const result = spawnTool('docs', [...args], {
    cwd: repoRoot,
    env: { ...process.env, LITE_DOCS_ROOT: directory },
    input: stdinInput ?? '',
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
  if (result.error) throw result.error;
  return result;
}

export function renderDocuments(paths?: readonly string[], directory = repoRoot): RenderedDocument[] {
  const stdinInput = paths !== undefined && paths.length > 0 ? `${paths.join('\n')}\n` : undefined;
  const result = runDocs(['--render-json'], directory, stdinInput);
  if (result.status !== 0 || result.signal !== null) {
    throw new Error(`lite docs --render-json failed (${result.status ?? result.signal}): ${result.stderr}`);
  }
  return JSON.parse(result.stdout) as RenderedDocument[];
}

export function extractModules(directory = repoRoot): ModuleApiDoc[] {
  const result = runDocs(['--modules-json'], directory);
  if (result.status !== 0 || result.signal !== null) {
    throw new Error(`lite docs --modules-json failed (${result.status ?? result.signal}): ${result.stderr}`);
  }
  return JSON.parse(result.stdout) as ModuleApiDoc[];
}
