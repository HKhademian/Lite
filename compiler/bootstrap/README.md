# Generated bootstrap compilers (`igniter.ts` and `compiler.c`)

This directory tracks **two** Lite-generated bootstrap sources in version control:

1. **`igniter.ts`** — Checked-in `-O3` TypeScript bootstrap igniter and compiler
   seed for Node.js workflows. Running `./bin/lite-ignite` (or invoking any
   `bin/lite*` symlink) materializes the standalone compiler
   (`dist/bootstrap/compiler.ts`) and all tools (`dist/tools/*.ts`) inside
   untracked `dist/`.
2. **`compiler.c`** — Checked-in standalone C11 bootstrap compiler generated
   directly from `compiler/src/c-root.lts`. Any standard C11 compiler
   (`cc -std=c11 -Wall -Wextra -Werror -O2 compiler/bootstrap/compiler.c -o lite-c -lm`)
   builds a native Lite-to-C11 compiler binary with **zero Node.js dependency**.

[seed.ts](lite://repo/compiler/bootstrap/seed.ts) records the SHA-256 provenance
for both `igniter.ts` and `compiler.c` alongside the compiler source graph hash.
Both bootstrap paths reach a byte-identical 3-generation self-hosting fixed point.
Running `./bin/lite-wipe` (or `./bin/lite-ignite --wipe`) wipes all untracked
and ignored files via `git clean -ffdx`, reinstalls locked npm dependencies, and
re-ignites `dist/` cleanly from scratch. Numbered compiler generations are
historical records, not parallel active compiler sources.

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
./bin/lite bootstrap verify
./bin/lite bootstrap promote
node igniter/node_modules/typescript/bin/tsc -p compiler/bootstrap/tsconfig.json
node compiler/scripts/build.ts
node compiler/scripts/self-host.ts --out /tmp/lite-selfhost
./compiler/scripts/self-host-c.sh --out /tmp/lite-selfhost-c
node compiler/scripts/corpus-parity.ts
node benchmark/compiler-performance.ts --samples 3 --warmups 1
```

`./bin/lite bootstrap verify` runs strict `tsc`, 3-generation C11 and TS self-hosting fixed points, `igniter.ts --force`, `igniter.ts` `-O3` freshness, `seed.ts` provenance validation, and TS-to-C11 cross-bootstrap SHA-256 byte parity in one command. `./bin/lite bootstrap promote` rebuilds and checks both 3-generation ladders plus cross-bootstrap parity before atomically refreshing `compiler.c`, `igniter.ts`, and `seed.ts` and running full verification.

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
