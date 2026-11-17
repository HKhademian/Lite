/** Host adapter collecting Playground library items via the ignited Lite tool (`tools/src/site-library.lts`). */
import { spawnSync } from 'node:child_process';
import { ensureTool } from '../tools/project.ts';
import type { ShowcaseSample } from './groups.ts';
import type { PlaySample } from './play-samples.ts';

export type LibraryCategory = 'sample' | 'example' | 'case' | 'piece';

export type PlaygroundExtraModule = Readonly<{
  path: string;
  display: string;
  identity: string;
  text: string;
}>;

export type PlaygroundLibraryItem = Readonly<{
  id: string;
  slug: string;
  category: LibraryCategory;
  badge: string;
  title: string;
  file: string;
  source: string;
  stdin: string;
  args: readonly string[];
  environment?: 'universal' | 'play' | 'cli';
  extraModules?: Readonly<Record<string, PlaygroundExtraModule>>;
  sampleId?: string;
}>;

/** Collects Samples, Examples, Cases, and Pieces for Playground's unified Open explorer. */
export function collectPlaygroundLibrary(options: Readonly<{
  rootDir: string;
  samples: readonly (ShowcaseSample | PlaySample)[];
}>): readonly PlaygroundLibraryItem[] {
  const result = spawnSync(process.execPath, [ensureTool('site-library'), options.rootDir], {
    cwd: options.rootDir,
    input: JSON.stringify(options.samples),
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
  if (result.error) throw result.error;
  if (result.status !== 0 || result.signal !== null) {
    throw new Error(`lite site-library failed (${result.status ?? result.signal}): ${result.stderr}`);
  }
  return JSON.parse(result.stdout) as PlaygroundLibraryItem[];
}
