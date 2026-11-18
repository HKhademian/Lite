/** Generates `/modules/` index and detail pages via the ignited Lite tool (`tools/src/site-modules.lts`). */
import { spawnSync } from 'node:child_process';
import { ensureTool } from '../igniter/artifacts.ts';
import type { ModuleApiDoc } from './docs-client.ts';
import { renderPage, rootDir, type SourceRevision } from './chrome.ts';
import type { ShowcaseSample } from './groups.ts';
import { highlightLite } from './highlight.ts';
import type { PlayGroup, PlaySample } from './play-samples.ts';
import type { SearchEntry } from './search.ts';

export type ModulesBuildOutput = Readonly<{
  files: ReadonlyMap<string, string>;
  searchEntries: readonly SearchEntry[];
  moduleCount: number;
  symbolCount: number;
}>;

function defaultAliasForModule(name: string): string {
  return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name) ? name : 'mod';
}

/** Builds `modules/index.html`, all `modules/<ns>/<name>.html` pages, and module/symbol search entries. */
export function buildModulesSection(options: Readonly<{
  modules: readonly ModuleApiDoc[];
  showcaseSamples: readonly ShowcaseSample[];
  playSamples: readonly PlaySample[];
  playGroups: readonly PlayGroup[];
  repoUrl: string;
  rev: SourceRevision;
  lightSwitchShine: boolean;
}>): ModulesBuildOutput {
  const { modules, showcaseSamples, playSamples, playGroups, repoUrl, rev, lightSwitchShine } = options;
  const playBadgeMap = new Map(playGroups.map((group) => [group.id, group.badge]));
  const samples = [
    ...showcaseSamples.map((s) => ({ id: s.id, title: s.title, file: s.file, badge: 'showcase' })),
    ...playSamples.map((s) => ({ id: s.id, title: s.title, file: s.file, badge: playBadgeMap.get(s.group) ?? 'play' })),
  ];
  const enrichedModules = modules.map((mod) => ({
    ...mod,
    importHtml: highlightLite(`${defaultAliasForModule(mod.name)} := import "${mod.id}";`),
    symbols: mod.symbols.map((sym) => ({
      ...sym,
      signatureHtml: highlightLite(sym.signature),
    })),
  }));

  const result = spawnSync(process.execPath, [ensureTool('site-modules')], {
    cwd: rootDir,
    input: JSON.stringify({ rootDir, repoUrl, modules: enrichedModules, samples }),
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
  if (result.error) throw result.error;
  if (result.status !== 0 || result.signal !== null) {
    throw new Error(`lite site-modules failed (${result.status ?? result.signal}): ${result.stderr}`);
  }

  const payload = JSON.parse(result.stdout) as {
    moduleCount: number;
    symbolCount: number;
    pages: Array<{ relPath: string; title: string; description: string; basePath: string; body: string }>;
    searchEntries: SearchEntry[];
  };

  const files = new Map<string, string>();
  for (const page of payload.pages) {
    files.set(
      page.relPath,
      renderPage({
        title: page.title,
        description: page.description,
        basePath: page.basePath,
        active: 'modules',
        repoUrl,
        rev,
        body: page.body,
        lightSwitchShine,
      }),
    );
  }

  return {
    files,
    searchEntries: payload.searchEntries,
    moduleCount: payload.moduleCount,
    symbolCount: payload.symbolCount,
  };
}
