/** Host read of one root Lite source; dependency traversal remains in Lite. */
import { readFileSync, realpathSync } from 'node:fs';
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = fileURLToPath(new URL('../', import.meta.url));
const hostModules = [
  ['lite.core.io.v1', 'lib/core/io.lts'],
  ['lite.core.list.v1', 'lib/core/list.lts'],
  ['lite.core.text.v1', 'lib/core/text-host.lts'],
  ['lite.core.fs.v1', 'lib/core/fs.lts'],
  ['lite.core.process.v1', 'lib/core/process.lts'],
  ['lite.core.crypto.v1', 'lib/core/crypto.lts'],
  ['lite.core.time.v1', 'lib/core/time.lts'],
  ['lite.compiler.modules.v1', 'compiler/src/modules.lts'],
  ['lite.compiler.source-reader.v1', 'compiler/src/source-reader.lts'],
] as const;

/** Canonical root source identity and strict UTF-8 text. */
export type SourceInput = Readonly<{ path: string; text: string; bytes: Buffer }>;

/** Resolves Lite imports: relative paths use the importer, absolute paths stay absolute, and bare paths use this distribution's lib/ root. */
export function resolveImportPath(importer: string, spec: string, cwd = process.cwd()): string {
  if (spec.length === 0 || spec.includes('\\')) {
    throw new Error('import path must be nonempty and use "/" separators');
  }
  const sourceSpec = spec.endsWith('.lts') ? spec : `${spec}.lts`;
  if (isAbsolute(sourceSpec)) return resolve(sourceSpec);
  if (/^[A-Za-z]:/.test(sourceSpec)) throw new Error('absolute drive paths are not supported on this host');
  if (sourceSpec.startsWith('./') || sourceSpec.startsWith('../')) {
    const importerPath = isAbsolute(importer) ? importer : resolve(cwd, importer || '__lite_stdin__.lts');
    return resolve(dirname(importerPath), sourceSpec);
  }
  return resolve(projectRoot, 'lib', sourceSpec);
}

/** Returns a stable project-relative name when a path belongs to this distribution. */
export function displaySourcePath(path: string): string {
  const canonical = isAbsolute(path) ? path : resolve(path);
  const projectRelative = relative(projectRoot, canonical);
  return projectRelative === '..' || projectRelative.startsWith(`..${sep}`) || isAbsolute(projectRelative)
    ? canonical : projectRelative.split(sep).join('/');
}

/** Identifies source bytes that exactly match a host module shipped with this Lite distribution. */
export function sourceModuleIdentity(bytes: Buffer | string): string {
  const candidate = typeof bytes === 'string' ? Buffer.from(bytes, 'utf8') : bytes;
  for (const [identity, path] of hostModules) {
    try {
      if (candidate.equals(readFileSync(resolve(projectRoot, path)))) return identity;
    } catch { /* An optional core host module may not be installed in this package revision. */ }
  }
  return '';
}

/** Resolves and reads only the requested root file, leaving imports to the generated compiler. */
export function readSourceInput(path: string): SourceInput {
  const canonical = realpathSync(resolve(path));
  const bytes = readFileSync(canonical);
  let text: string;
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    throw new Error(`${canonical}: source is not valid UTF-8`);
  }
  return { path: canonical, text, bytes };
}
