# INV-070 — Isolated AssemblyScript/Wasm report-core probe

Status: recorded (narrow compatibility evidence; general AS target not selected)
Contributor: redacted (agent-assisted)
Last updated: 2026-10-31
Catalog brief: [INV-070](TOPICS.md#inv-070)
Related: [TS/web and possible early Wasm direction](INV-061-first-compiler-output.md)

## Question and method

The user suggests possible AssemblyScript compatibility for early Wasm. Can the
existing emitted TS report core compile unchanged through that route? Probe the
current restricted artifact instead of assuming strict TS is universally AS
compatible. No source feature, permanent backend, dependency or runtime policy is
selected by performing this bounded compatibility experiment.

Install official AssemblyScript 0.28.20 and its dependencies only in a temporary
directory using npm --ignore-scripts. Query version/integrity from the official
npm registry and retain the exact versions/integrities in the
[probe record](evidence/INV-070-assemblyscript-report-parity.json). The project and
global dependency sets/lockfiles are unchanged. No AS scaffolding or framework
is added to the igniter.

For each of the same 12 signed-integer report sources used by TS/C parity checks:

1. Run the current Lite-written TS emitter from alpha.22 (`02530e3`) to obtain its
   actual emitted core, without editing or adapting that source.
2. Compile with asc --outFile core.wasm --bindings esm --exportRuntime
   --runtime incremental. Retain checks; do not use noAssert or unchecked options.
3. Inspect the generated ESM bindings and run the Wasm main function through
   those bindings plus a visible Node adapter that writes its returned String.
4. Compare stdout/stderr Buffers, status and signal with the same admitted source
   through the igniter. Do not normalize output or change the input program.

## Observed result

All 12 cases compile and run successfully on pinned Node 26.13.0/darwin arm64.
Every stdout/stderr/status/signal comparison matches. The 42 case has stdout hex
34320a, empty stderr and status 0. Leading signs/zeroes, multi-line layouts and
signed Int extremes retain their exact decimal output. The manifest stores
emitted-TS hashes and raw output hex for each case. Existing project validation
remains 147 interpreter groups and 9 editor groups; these AS probes are separate
experiments, not silently added to that test count.

The current artifact is a constant-output String function, not an i64 arithmetic
implementation. Large integer-looking output therefore proves decimal text
preservation, not numeric compatibility. No collections, closures, fault transport,
general TS type forms, compiler self-rebuild, browser execution, performance or
artifact-binary reproducibility is established here.

The selected probe runtime was explicitly incremental. AssemblyScript documents
that this includes garbage collection; this experiment does not choose a final
Lite Wasm memory policy or override native C's lightweight/no-mandatory-tracing
goal. Its generated bindings marshal strings and provide host integration, which
must remain visible in any later shipped path.

## Reproduce the representative case

Use the pinned Node/npm and an isolated temporary directory:

```sh
lite_as_dir=$(mktemp -d)
printf '%s\n' '{"private":true,"type":"module"}' > "$lite_as_dir/package.json"
npm install --prefix "$lite_as_dir" --ignore-scripts --no-audit --no-fund --registry=https://registry.npmjs.org --save-exact assemblyscript@0.28.20 binaryen@131.0.0-nightly.20260721 long@5.3.2
printf '%s\n' 'report(42);' | ./bin/lite run compiler/ts-emitter.lts > "$lite_as_dir/core.ts"
node "$lite_as_dir/node_modules/assemblyscript/bin/asc.js" "$lite_as_dir/core.ts" --outFile "$lite_as_dir/core.wasm" --bindings esm --exportRuntime --runtime incremental
printf '%s\n' 'import { main } from "./core.js"; process.stdout.write(main());' > "$lite_as_dir/run.mjs"
node "$lite_as_dir/run.mjs"
```

Expected execution output is 42 plus newline. Inspect core.ts, generated core.js
and installed tool versions before treating this as a bootstrap artifact. The
generated Wasm/bindings are temporary outputs, not checked-in compiler snapshots.

## Primary references and handoff

AssemblyScript's [concepts](https://www.assemblyscript.org/concepts.html) describe
a TypeScript-like variant with stricter compilation requirements. Its
[compiler/bindings documentation](https://www.assemblyscript.org/compiler.html)
and [runtime variants](https://www.assemblyscript.org/runtime.html) support the
explicit probe flags above. These references motivate separate compatibility and
host/runtime checks, not a claim that arbitrary emitted TS will compile unchanged.

Preserve this evidence in a focused documentation commit with no igniter release
tag. Keep AS/Wasm as an investigated possibility rather than expanding project
dependencies or making it a gate for TS-first self-hosting. The next readable
compiler-source improvement is selected transparent type-alias syntax; its
still-open namespace/shadowing contract must be reviewed before implementation.
