# Project code file types

Owner direction, 2026-11-02: project-owned code is Lite (`.lt`, `.lts`, `.lite`),
TypeScript (`.ts`) or JSON. Generated TS and C artifacts remain supported.
Use the existing igniter and bootstrap TypeScript configurations. Documentation,
fixture data, workflow configuration and editor assets keep their normal formats.
Installed third-party packages are dependencies rather than project-owned source.

`lite` is a command router: it maps subcommands to standalone entries in `bin/`
and forwards arguments, streams and exit status. It contains no implementation
of compiler, verification, testing, runner, documentation or repository-check
operations. For example, `lite compile` routes to `lite-compiler-ts`, while
`lite verify` and `lite doctor` route to `lite-verify` and `lite-doctor`.
Operation implementations live in their owning `tools/`, `compiler/` or
`igniter/` modules. `litec` and `ltc` remain direct compiler compatibility
entries. `config/versions.json` owns component metadata. Internal compiler
routines remain under `compiler/scripts/`; command arguments, source paths,
streams and exit statuses retain their existing contracts. Compiler language
implementation remains in Lite.

All maintained compiler scripts, benchmark runners, challenge maintenance tools
and editor tests are checked by `igniter/tsconfig.json`. The generated compiler
seeds also have their isolated `compiler/bootstrap/tsconfig.json` check. The
extra generated-reference config was removed; those small reference files now
join the igniter check. No additional tsconfig is needed.

The generated JSX benchmark view was removed. Its Markdown report and JSON
measurements remain under `benchmark/reports/`; benchmark runners emit those two
formats. Historical measurements and compiler seed bytes were preserved.

## Checks

Run `./lite test --fast` during development and `./lite test --full` at the gate.
Both include the source-file policy and challenge tooling boundary checks.
CI's separate strict TypeScript check includes all maintained TS tooling.
`igniter/source-files.test.ts` rejects other first-party code extensions, shell
launchers and extra TypeScript configs. Generated C is confined to
`compiler/generated/` or `compiler/bootstrap/`.

The challenge tools run directly with Node, for example:

```sh
node challenges/tools/query.ts --stats
node challenges/tools/validate.ts
node challenges/tools/validate_benchmark.ts
```

## Migration evidence

The reference tooling is preserved in Git at
`7a55c8c` (the last commit before this conversion). Its output and the TypeScript
output were built into separate temporary directories using the same cached
source inputs. No network refresh or dataset rewrite was part of this migration.

- All 1,811 rebuilt data/schema/benchmark files agree: JSON and JSONL were
  compared as parsed values; CSV, statement and answer files matched exact bytes.
  The only normalized text was the two renamed generator/download tool paths.
- This covers 7,085 challenge records, 43 lists, 101 topics, 7,085 test records
  and all 500 benchmark items. Both corpus validators pass.
- Documented query filters, roadmap ordering, grouping, search, premium filtering,
  sorting and JSON results match the reference. Full text and CSV queries over
  all 7,085 records match byte for byte. JSON output uses compact whitespace.
- HTML entity decoding, binary64 decimal rounding, complete cache publication,
  cache reuse, rate-limit retries, optional missing pages and failed downloads
  have focused checks. HTTP transport is mocked; live upstream refreshes were
  not used as migration evidence.
- Compiler build, inventory, artifact execution and benchmark runners were
  exercised through their new TS paths. A generated self-build still matches
  the preserved seed exactly. The historical T00-first ladder remains explicit.
- The final full suite passes all 246 groups with zero skips (527 s); the fast
  lane passes 237 with its 9 expected skips. All 9 editor grammar groups pass.
  Strict checking passes for both configurations, and each target's 92-case
  compiler corpus comparison has zero mismatches.

This is a tooling/file-type migration. It adds no Lite syntax or builtin and
does not complete the pending T00 feature ports or native C11 self-hosting.
