/** Pure helper functions for the Lite VS Code extension. */
import { existsSync } from 'node:fs';
import { join } from 'node:path';

export type ParsedDiagnostic = Readonly<{
  line: number;
  column: number;
  message: string;
}>;

/** Parses Lite compiler diagnostics (`path:line:col: message` or `line:col: message`). */
export function parseLiteDiagnostics(stderr: string): ParsedDiagnostic[] {
  const diagnostics: ParsedDiagnostic[] = [];
  for (const rawLine of stderr.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (line === '') continue;
    const match = /^(?:.*?:)?(\d+):(\d+):\s*(.+)$/.exec(line);
    if (match === null) {
      diagnostics.push({ line: 0, column: 0, message: line });
      continue;
    }
    diagnostics.push({
      line: Math.max(0, Number(match[1]) - 1),
      column: Math.max(0, Number(match[2]) - 1),
      message: match[3]!,
    });
  }
  return diagnostics;
}

/** Resolves the Lite CLI executable from user settings or the active workspace `./bin/lite`. */
export function resolveLiteExecutable(workspaceRoot: string | undefined, configuredPath: string): string {
  const trimmed = configuredPath.trim();
  if (trimmed !== '') return trimmed;
  if (workspaceRoot !== undefined) {
    const localBin = join(workspaceRoot, 'bin', 'lite');
    if (existsSync(localBin)) return localBin;
  }
  return 'lite';
}
