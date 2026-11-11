# Generated bootstrap seeds

`T12.ts` is the selected generated TS compiler. [seed.ts](seed.ts) owns its
exact source, artifact, builder and revision identities; the current selection
follows the [Float-context checkpoint](../parity.md#float-literal-contexts-and-braced-values).
Historical checkpoint hashes and ladder node identities remain in the parity
ledger and their original reports. A filename is not a substitute for those
source/builder identities.

`c-emitter.ts` is the retained Lite C emitter hosted by generated TS. Its exact
identities are in [c-seed.ts](c-seed.ts). It is not a native C11 compiler or a
native fixed point. Public C output and native/cross-host gates remain deferred
until after TS migration and T00 retirement.

Edit Lite implementation under `compiler/src/` and `lib/core/`, not the generated
seeds. The host verifies source and seed identities. Changed S rebuilds with the
accepted generated TS seed into a source/builder-keyed, strictly checked
`.cache/compiler/` artifact; cached bytes are verified before use. There is no
T00 fallback and no release/tag change implied by these commands.

## Routine generated-only commands

```sh
node igniter/node_modules/typescript/bin/tsc -p compiler/bootstrap/tsconfig.json
node compiler/scripts/build.ts
node compiler/scripts/self-host.ts --out /tmp/lite-generated-ladder
node compiler/scripts/corpus-parity.ts --artifact /tmp/lite-generated-ladder/generation-3.ts
node benchmark/compiler-performance.ts --samples 3 --warmups 1
```

These commands work in a source archive with `igniter/lite.ts`, `bootstrap.ts`,
`cli.ts` and `bundle-cli.ts` absent. Git metadata is optional; reports use a null
revision when the source directory is not the Git checkout root. Input, artifact
and tool hashes still identify what was measured.

The self-build command compiles unchanged current S three times, starting with
the selected generated compiler. The 2026-11-11 minimum-kernel candidate is
recorded in [the self-hosting report](../reports/2026-11-11-self-hosting-kernel.json).
Every builder and output passes strict TS
checking. Self-build execution has no fixed timeout, matching the historical
ladder; ordinary corpus/program tests retain their execution limits. `generation-1.ts` through `generation-3.ts`, `S.lts` and `ladder.json`
are retained under `--out`. The summary records the actual builder SHA for each
generation, byte equality and equality with the selected current compiler.
It does not relabel these outputs as historical T11/T12 nodes or rewrite seeds.
An alternate `--artifact path.ts` builder is recorded explicitly. A changed S may
reach a new fixed point whose bytes differ from the first old-seed build. Those
equality fields are reported separately and do not select a seed. Run the corpus
command on the final generation before accepting it; a fixed point alone does
not establish compiler correctness or feature support.

The corpus command defaults to the selected compiler, with optional
`--artifact path.ts`. Compiler output is checked against recorded artifact
hashes and exact rejection streams/status in the maintained manifests. Every
admitted scenario then executes in a fresh process after strict TS checking.
Inputs sharing source/artifact bytes reuse compilation and checking. A stale
source identity, bad artifact or mismatch fails explicitly; generated output is
never used to update its own expectations. The current corpus is 69 admitted
programs and 24 rejections. Ordinary `--target c` requests reject during TS migration.

The benchmark records generated-only process, load and compilation timings,
strict compiler/program checking, and generated program execution separately.
Corpus contracts and exact runtime output are validated before publishing a
successful report. Defaults are seven samples and one excluded warmup; reports
use a `generated-compiler-performance` prefix so historical T00 measurements are
preserved. See the [benchmark guide](../../benchmark/README.md).

## Explicit historical audits

```sh
node compiler/scripts/self-host.ts --reference --out /tmp/lite-historical-ladder
node compiler/scripts/corpus-parity.ts --reference --artifact compiler/bootstrap/T11.ts
node benchmark/compiler-performance.ts --reference --out /tmp/lite-t00-comparison
```

Only `--reference` routes enter the preserved `*-reference.ts` audit commands.
The historical self-build still invokes `igniter/bundle-cli.ts`: its T11/T12
builder meanings are unchanged. The corpus audit still compares emitted
compiler streams against S interpreted by T00; its explicit `--target c` option
is retained as a historical comparison, not a restored public C/native gate.
The benchmark audit retains its T00+S, generated T11 and T00-frontend lanes.
Reference audits fail when T00 is absent; ordinary commands never fall back to
them. The explicitly named T00 inventory remains reference tooling until the
retirement wave supplies its archival replacement.
