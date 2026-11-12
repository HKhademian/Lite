/** VS Code extension entry point for Lite diagnostics, formatting, and running files. */
import { execFile, spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { dirname } from 'node:path';
import { parseLiteDiagnostics, resolveLiteExecutable } from './helpers.ts';

type VscodeTextDocument = Readonly<{
  languageId: string;
  isDirty: boolean;
  uri: Readonly<{ scheme: string; fsPath: string; toString(): string }>;
  lineCount: number;
  lineAt(line: number): Readonly<{ text: string }>;
  getText(): string;
  save(): Promise<boolean>;
}>;

type VscodeContext = Readonly<{
  subscriptions: Array<{ dispose(): void }>;
}>;

const require = createRequire(import.meta.url);
// Loaded at runtime inside the VS Code extension host.
const vscode = require('vscode') as any;

function getLiteCommand(document?: VscodeTextDocument): { command: string; cwd: string | undefined } {
  const config = vscode.workspace.getConfiguration('lite');
  const configured = String(config.get('executablePath') ?? '');
  const folder = document !== undefined
    ? vscode.workspace.getWorkspaceFolder(document.uri)?.uri.fsPath
    : vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  const cwd = folder ?? (document !== undefined ? dirname(document.uri.fsPath) : undefined);
  return { command: resolveLiteExecutable(folder, configured), cwd };
}

function checkDocument(
  document: VscodeTextDocument,
  collection: { set(uri: unknown, diagnostics: unknown[]): void; delete(uri: unknown): void },
): void {
  if (document.languageId !== 'lite' || document.uri.scheme !== 'file') return;
  const { command, cwd } = getLiteCommand(document);
  execFile(command, ['check', document.uri.fsPath], { cwd, encoding: 'utf8', timeout: 15_000 }, (error, _stdout, stderr) => {
    if (error === null) {
      collection.set(document.uri, []);
      return;
    }
    const output = (stderr || error.message || '').trim();
    const parsed = parseLiteDiagnostics(output);
    const items = parsed.map((diag) => {
      const start = new vscode.Position(diag.line, diag.column);
      const end = new vscode.Position(diag.line, diag.column + 1);
      return new vscode.Diagnostic(new vscode.Range(start, end), diag.message, vscode.DiagnosticSeverity.Error);
    });
    collection.set(document.uri, items);
  });
}

function formatDocument(document: VscodeTextDocument): Promise<unknown[]> {
  return new Promise((resolve) => {
    const { command, cwd } = getLiteCommand(document);
    const child = spawn(command, ['fmt', '-'], { cwd, stdio: ['pipe', 'pipe', 'pipe'] });
    const stdout: Buffer[] = [];
    child.stdout.on('data', (chunk: Buffer) => stdout.push(chunk));
    child.on('error', () => resolve([]));
    child.on('close', (code) => {
      if (code !== 0) {
        resolve([]);
        return;
      }
      const formatted = Buffer.concat(stdout).toString('utf8');
      const original = document.getText();
      if (formatted === original) {
        resolve([]);
        return;
      }
      const lastLine = Math.max(0, document.lineCount - 1);
      const lastCol = document.lineAt(lastLine).text.length;
      const fullRange = new vscode.Range(new vscode.Position(0, 0), new vscode.Position(lastLine, lastCol));
      resolve([vscode.TextEdit.replace(fullRange, formatted)]);
    });
    child.stdin.end(document.getText());
  });
}

export function activate(context: VscodeContext): void {
  const diagnostics = vscode.languages.createDiagnosticCollection('lite');
  context.subscriptions.push(diagnostics);

  for (const doc of vscode.workspace.textDocuments as VscodeTextDocument[]) {
    checkDocument(doc, diagnostics);
  }

  context.subscriptions.push(
    vscode.workspace.onDidOpenTextDocument((doc: VscodeTextDocument) => {
      checkDocument(doc, diagnostics);
    }),
    vscode.workspace.onDidSaveTextDocument((doc: VscodeTextDocument) => {
      const checkOnSave = Boolean(vscode.workspace.getConfiguration('lite').get('checkOnSave', true));
      if (checkOnSave) checkDocument(doc, diagnostics);
    }),
    vscode.workspace.onDidCloseTextDocument((doc: VscodeTextDocument) => {
      diagnostics.delete(doc.uri);
    }),
    vscode.languages.registerDocumentFormattingEditProvider('lite', {
      provideDocumentFormattingEdits(doc: VscodeTextDocument) {
        return formatDocument(doc);
      },
    }),
    vscode.commands.registerCommand('lite.checkFile', () => {
      const doc = vscode.window.activeTextEditor?.document as VscodeTextDocument | undefined;
      if (doc !== undefined) checkDocument(doc, diagnostics);
    }),
    vscode.commands.registerCommand('lite.runFile', async () => {
      const doc = vscode.window.activeTextEditor?.document as VscodeTextDocument | undefined;
      if (doc === undefined || doc.languageId !== 'lite') return;
      if (doc.isDirty) await doc.save();
      const { command } = getLiteCommand(doc);
      const terminal = vscode.window.activeTerminal ?? vscode.window.createTerminal('Lite');
      terminal.show(true);
      const quotedCmd = command.includes(' ') ? `"${command}"` : command;
      const quotedFile = `"${doc.uri.fsPath.replaceAll('"', '\\"')}"`;
      terminal.sendText(`${quotedCmd} run ${quotedFile}`);
    }),
  );
}

export function deactivate(): void {}
