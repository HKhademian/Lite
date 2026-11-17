/** Build the VS Code extension JS artifacts into dist/ (`tools/src/vscode-build.lts`). */
import { runIgnitedTool } from '../../../igniter/ignite.ts';

await runIgnitedTool('vscode-build');
