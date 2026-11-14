#!/usr/bin/env node
/** Host entrypoint and JS adapter for the Lite-implemented release packager (tools/src/release.lts -> tools/generated/release.ts). */
import { spawnSync } from 'node:child_process';
import { readFileSync, writeSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ComponentRelease } from '../compiler/release-streams.ts';

/** Supported compiler/language readiness verification summary attached to compiler and language distributions. */
export type ReleaseBootstrapSummary = Readonly<{
  ladder: Readonly<{ fixedPoint: boolean; generations: readonly unknown[] }>;
  corpus: Readonly<{ cases?: number; programs?: number; rejections?: number; executions?: number; mismatches: readonly unknown[] }>;
  support: string;
}>;

/** Inputs used to render human-readable release notes for packaged archives and GitHub releases. */
export type ReleaseNotesInput = Readonly<{
  label: string;
  commit: string;
  profile: 'tools' | 'compiler' | 'language';
  releasedComponent: ComponentRelease | null;
  archive: string;
  archiveSha256: string;
  manifestSha256: string;
  vsix: Readonly<{ file: string; sha256: string }> | null;
  bootstrap: ReleaseBootstrapSummary | null;
}>;

const generatedUrl = new URL('./generated/release.ts', import.meta.url);
const generatedPath = fileURLToPath(generatedUrl);

function runReleaseTool(args: string[], options: { directory?: string; input?: string } = {}): string {
  const result = spawnSync(process.execPath, [generatedPath, ...args], {
    cwd: options.directory ?? process.cwd(),
    env: {
      ...process.env,
      LITE_RELEASE_INTERNAL: '1',
      ...(options.directory === undefined ? {} : { LITE_RELEASE_ROOT: options.directory }),
    },
    input: options.input,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
  if (result.error) throw result.error;
  if (result.status !== 0 || result.signal !== null) {
    throw new Error(result.stderr.trim() || `lite release failed (${result.status ?? result.signal})`);
  }
  return result.stdout;
}

/** Classifies a release into `'tools'`, `'compiler'`, or `'language'` via the compiled Lite release module. */
export function releaseProfile(release: ComponentRelease | null): 'tools' | 'compiler' | 'language' {
  const args = release === null ? ['--profile'] : ['--profile', release.component, release.version];
  return runReleaseTool(args).trim() as 'tools' | 'compiler' | 'language';
}

/** Renders Markdown release notes via the compiled Lite release module. */
export function formatReleaseNotes(input: ReleaseNotesInput): string {
  return runReleaseTool(['--format-notes'], { input: JSON.stringify(input) });
}

/** Packages a committed checkout via the compiled Lite release module and returns its parsed manifest. */
export function prepareRelease(directory: string, output: string, tag?: string) {
  runReleaseTool(tag === undefined ? [output] : [output, tag], { directory });
  return JSON.parse(readFileSync(join(output, 'manifest.json'), 'utf8')) as {
    schemaVersion: number;
    tag: string | null;
    commit: string;
    releasedComponent: ComponentRelease | null;
    componentVersions: Record<string, string | null>;
    profile: 'tools' | 'compiler' | 'language';
    bootstrap: ReleaseBootstrapSummary | null;
    nativeCompiler: boolean;
    vsix: Readonly<{ file: string; sha256: string }> | null;
  };
}

if (import.meta.main) {
  const mod = (await import(generatedUrl.href)) as { main: (write?: (text: string) => void) => string };
  mod.main((text: string): void => {
    writeSync(1, text);
  });
}
