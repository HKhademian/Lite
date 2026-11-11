# Component releases

Current workflow, 2026-11-03. The [version policy](versioning-and-naming.md) and
[registry](../config/versions.json) define independent component streams.
The igniter retains its existing version authority in igniter/package.json.

## Prepare a release

Use a clean committed checkout and Node from [igniter/.node-version](../igniter/.node-version).
Install locked development dependencies, then run the affected cases and gates.

```sh
./lite doctor
./lite test --full
./lite verify --coverage
./lite test --cases
./lite release .cache/release-local
```

The final command creates an unpublished source snapshot. Output directories
must be empty. Snapshot packaging validates documentation/metadata and extracts
and runs the resulting distribution without Git or installed npm packages.
The generic tooling profile does not claim a newly verified compiler fixed point.

Keep implementation and release preparation in separate atomic commits. Select
only the versions of changed components, commit the registry, and create annotated
tags on that exact revision. For example, after assigning an unused CLI version:

```sh
git tag -a cli-v0.1.0-alpha.1 -m "CLI 0.1.0-alpha.1"
./lite release .cache/release-cli cli-v0.1.0-alpha.1
git push github main cli-v0.1.0-alpha.1
```

The version is illustrative. Never reuse or move a published tag. The owner's
2026-11-03 direction authorizes publishing verified commits and component tags
by default. Confirm CI and the hosted release before reporting publication.

## Readiness by component

- Tool, documentation and editor releases validate their own behavior in CI and
  package the complete source tree. They do not wait for deferred native C or
  remaining accepted-language TS ports.
- Compiler prereleases and igniter/runtime/builtin/library releases additionally
  require three strictly checked generated generations and the recorded compiler
  corpus. The archive includes release/compiler.ts, matching flattened Lite source
  and verification evidence. This establishes the restricted supported subset.
- Language, scripting, project umbrella and stable compiler releases additionally
  require all current canonical semantic verifications to pass. Existing TS gaps
  block those releases rather than becoming skips or pending proposals.
- Unassigned components cannot release. Reserved formatter/linker/library streams
  do not imply implementations. Editor package/lockfile versions must match the
  registry; vscode tags additionally produce a checksummed VSIX.

## Choose verification by change scope

Use the smallest set of checks that covers the changed contract, and run
independent checks in parallel when they do not share mutable outputs:

- Documentation, metadata, or tool-only edits use their focused checks and
  `./lite doctor`; editor grammar checks apply when editor support or syntax
  metadata changes.
- Compiler behavior edits use the named accepted/rejected/boundary/interaction
  cases, affected generated targets, strict checks, and `./lite test --fast`.
- Compiler source, seed, or bootstrap edits add a reproducible build, the
  relevant multi-generation fixed-point ladder, and recorded corpus parity;
  run the full regression suite before accepting the increment.
- Language-wide acceptance and language, scripting, umbrella, or stable compiler
  releases require coverage registration and every canonical semantic contract
  to pass. A recorded migration gap remains a gap; it is not a pass or a skip.

This lets routine improvements iterate on the behavior they touch while the
release profile raises the gate when the released contract is broader. It does
not require every compiler change to establish full language conformance.

Ordinary CI reports all accepted-language failures and compares them with the
explicit [migration baseline](../config/ts-migration.json). A changed pass/failure
set or diagnostic fails the baseline gate for review. This is a regression gate,
not a full-conformance claim; bare `./lite verify --all` still fails for the known
ports. Completing a port requires removing its baseline failure after verification.

## Distribution

Assets are lite-TAG.tar.gz, manifest.json, RELEASE-NOTES.md and SHA256SUMS, plus
an editor VSIX for vscode tags. RELEASE.json inside the source archive matches
the external manifest. Records identify the source commit, all component versions,
released component, readiness profile, Node version and any generated bootstrap
proof. Source archives retain launchers, libraries, cases and rebuild instructions.

Check SHA256SUMS with your platform's SHA-256 tool, extract into an empty directory,
then run `./bin/lite doctor --docs`. The generated compiler can compile a program
with Node alone; development strict checks need the locked npm development tools.
Generated compiler bytes reproduce exactly; compressed archive bytes are not
promised identical across archive toolchains.

## CI and publication

[Test](../.github/workflows/test.yml) runs independent jobs concurrently:
strict repository checks, Linux/macOS full regressions, editor grammar,
verification coverage, the explicit TS migration audit, a verified case
benchmark, extracted-distribution checks, and the T00-free archive gate.
Workflow YAML dispatches named Node tasks without embedded shell programs.
The full suite and archive gate retain separate OS matrices and 30-minute
budgets. The whole-source checker sweep has a 120-second tool budget and the
81-scenario CLI audit a 180-second controller budget; ordinary artifact limits
remain unchanged. Timeouts are failures, never successful samples or skipped cases.
The archive benchmark controller has a separate 300-second budget because it
validates the corpus and measures five workloads; its program limits are unchanged.

[Release](../.github/workflows/release.yml) responds to all registered component
tag streams. It validates the annotated tag and recorded version at the exact
commit, packages the appropriate profile, uploads every asset to a draft, then
publishes. Prereleases remain prereleases, and independent streams do not replace
GitHub's default latest release. Existing releases are never overwritten.
Manual runs build source snapshot artifacts without publishing.

## Historical native packaging

The earlier `compiler/scripts/release.ts prepare|native|finalize` commands and
TS-hosted C emitter remain available for explicit historical audits. Their native
program packages are not native self-hosted compilers. Public C output and native
release gates resume after TS migration and T00 retirement; the current component
workflow does not invoke those historical packaging commands.
