#!/usr/bin/env node
/** Validates generated TS compiler output and execution against recorded corpus contracts. */
import { validateCorpus } from './corpus-contracts.ts';
import { fail, mainFile, selectedArtifact, toolIdentities, toolOptions } from './tooling.ts';
/** Validates generated TS compiler output against recorded contracts. */
export function corpusParity(args: readonly string[]): void {
  const options = toolOptions(args, ['artifact', 'target']);
  const target = options.values.get('target') ?? 'ts';
  if (target !== 'ts' && target !== 'c') throw new Error('--target must be ts or c');
  if (target !== 'ts') throw new Error('C corpus execution is deferred');
  const selected = selectedArtifact(options.values.get('artifact'));
  const result = validateCorpus(selected.bytes.toString());
  process.stdout.write(JSON.stringify({ phase: 'recorded-contracts', target, artifactSha256: selected.sha256,
    sourceSha256: selected.currentSourceSha256, selectedCompilerSha256: selected.selectedCompilerSha256, selectedCompilerBuilderSha256: selected.selectedCompilerBuilderSha256, supplied: selected.supplied,
    toolSources: toolIdentities(['compiler/scripts/corpus-parity.ts', 'compiler/scripts/corpus-contracts.ts', 'compiler/scripts/tooling.ts', 'compiler/host.ts', 'igniter/artifacts.ts', 'igniter/test-fixtures.ts']),
    ...result }, null, 2) + '\n');
  if (result.mismatches.length !== 0) process.exitCode = 1;
}
if (mainFile(import.meta.url)) { try { corpusParity(process.argv.slice(2)); } catch (error) { fail(error); } }
