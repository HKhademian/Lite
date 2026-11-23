/** Generates `/tools/` toolchain hub via the ignited Lite tool (`tools/src/site-tools.lts`). */
import { spawnTool } from '../igniter/artifacts.ts';
import { renderPage, type SourceRevision } from './chrome.ts';
import type { SearchEntry } from './search.ts';

export type ToolsBuildOutput = Readonly<{
  html: string;
  searchEntries: readonly SearchEntry[];
}>;

/** Builds `tools/index.html` and search entries for Lite CLI and developer tooling. */
export function buildToolsSection(options: Readonly<{
  repoUrl: string;
  rev: SourceRevision;
  lightSwitchShine: boolean;
}>): ToolsBuildOutput {
  const { repoUrl, rev, lightSwitchShine } = options;
  const result = spawnTool('site-tools', [repoUrl], {
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024,
  });
  if (result.error) throw result.error;
  if (result.status !== 0 || result.signal !== null) {
    throw new Error(`lite site-tools failed (${result.status ?? result.signal}): ${result.stderr}`);
  }
  const payload = JSON.parse(result.stdout) as { body: string; searchEntries: SearchEntry[] };

  const html = renderPage({
    title: 'Tools — Lite',
    description: 'CLI commands, formatter, test & verify gates, VS Code extension, Play host protocol, and self-hosting bootstrap.',
    basePath: '../',
    active: 'tools',
    repoUrl,
    rev,
    body: payload.body,
    lightSwitchShine,
  });

  return { html, searchEntries: payload.searchEntries };
}
