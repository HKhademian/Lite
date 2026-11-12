# Generated bootstrap compiler

`compiler.ts` is the one selected generated TypeScript igniter. [seed.ts](seed.ts)
records its source, artifact, builder and revision identities. Numbered compiler
generations are historical records, not parallel active compiler sources.

The TypeScript compiler and retained C emitter are both compiled from their
Lite source roots by that same igniter. The C backend is still TS-hosted; it is
not a native C compiler or a C self-hosting fixed point. No separate generated
C-emitter seed is selected or required.

The TS and C manifests each name one Lite root. The generated compiler follows
its language-level imports. The host reads only the root file and supplies
source reads; dependency identities come from the paths and exact bytes the Lite
graph visitor actually reads. Cache provenance stores each repository-relative
path and SHA-256. Cache hits recheck every dependency byte hash, so nested edits
invalidate the selected artifact before use. A separate selection index keyed
by target, igniter and root bytes locates the prior dependency set; any changed
dependency triggers a fresh graph compilation and replaces that index.

Edit compiler behavior in `compiler/src/` and `lib/core/`, not the generated
igniter. Changed source rebuilds with the selected TS igniter into a strictly
checked cache artifact. There is no T00 fallback.

## Routine generated-only commands

```sh
node igniter/node_modules/typescript/bin/tsc -p compiler/bootstrap/tsconfig.json
node compiler/scripts/build.ts
node compiler/scripts/self-host.ts --out /tmp/lite-selfhost
node compiler/scripts/corpus-parity.ts
node benchmark/compiler-performance.ts --samples 3 --warmups 1
```

The self-build command compiles the same TS root import graph three times,
starting from the selected compiler. It records each builder and output hash,
strictly checks each generation and requires byte equality at the fixed point.
Run the corpus command on the selected output before accepting a compiler
change; a fixed point alone does not establish correct behavior. An alternate
`--artifact path.ts` builder is recorded explicitly.

The corpus command compares admitted TS artifact hashes and exact rejection
streams/status against the maintained contracts. It then strictly checks and
executes every admitted scenario in a fresh process. The current corpus has 69
programs and 25 rejections. The internal C emitter retains its separate C-output
and native execution checks; those do not imply native C self-hosting.

The handwritten T00 interpreter and its command adapters are retired. Earlier
compiler and benchmark reports remain historical evidence; no active command
executes T00.
