/** Host read of one root Lite source; dependency traversal remains in Lite. */
import { readFileSync, realpathSync } from 'node:fs';
import { resolve } from 'node:path';

/** Canonical root source identity and strict UTF-8 text. */
export type SourceInput = Readonly<{ path: string; text: string }>;

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
  return { path: canonical, text };
}
