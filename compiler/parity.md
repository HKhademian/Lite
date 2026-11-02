# Bootstrap parity ledger

Status: **active, 2026-11-02**. This ledger drives the owner direction that the
TS igniter and the generated compilers converge into the same compiler for the
bootstrap surface. It is a burndown list, not a claim that parity already holds.

Immediate scope: the bootstrap subset L, S, and the 55 program / 38 rejection
cases. The owner approved starting full T00 replacement on 2026-11-02; existing
features beyond L remain pending work in the [transition plan](transition-plan.md).

## Default compiler transition

TS and C compilation and the verifier's compiler emission use the checked-in
[generated seeds](bootstrap/README.md), with exact artifact/source identity checks.
Changed S is rebuilt by T11 into a strictly checked, source-keyed cache; there
is no implicit T00 fallback. The historical T00 ladder remains an explicit
audit through `igniter/bundle-cli.ts`, so its node labels remain accurate.

Interpreter run/check and the interpreter regression tests still use
T00. The C emitter is now a TS-hosted compiler built by T11; its exact source,
artifact and builder hashes are in `bootstrap/c-seed.ts`. The checked-arithmetic seed
refresh below records three byte-identical generated generations for its source snapshot. Native C01/C11
remain unrecorded. These host transition slices do
not complete feature parity or authorize deleting T00 before its replacements pass.

## Terms

- **TS igniter / stage 0** — the preserved TypeScript implementation in
  [`../igniter/`](../igniter/README.md). It executes S.
- **S** — the Lite-written compiler source assembled from a manifest.
- **T00** — the stage-0 TS igniter.
- **C11** — the owner's requested first native compiler built through T11;
  `CompileC(T11, S)`. This is distinct from the TS-hosted C emitter and from the
  historical T00-built C01. Record C11 equality with the historical C nodes at
  the native gate rather than silently renaming an old ladder node.
- **T / C** — the TS and C compilers produced by stage 0 from S.
- **T2 / C2** — the artifacts T/C produce when they compile S again.

The parity loop compares stage 0 running S with T/C compiling the same Lite
source. At the fixed point, T/C replace stage 0 for the bootstrap surface.

## Bootstrap ladder

Owner notation, 2026-11-01. `CompileTS(X, lite)` means "run compiler X on the
Lite compiler source S and emit TS"; `CompileC(X, lite)` means the same with C
emission. Every comparison below is byte-for-byte artifact equality.

```text
TS chain:
T00 = stage-0 TS igniter
T11 = CompileTS(T00, lite)
T12 = CompileTS(T11, lite)
T13 = CompileTS(T12, lite)
TS fixed point: T11 == T12 == T13

C and cross-host chain:
C01 = CompileC(T00, lite)
C21 = CompileC(C01, lite)
T21 = CompileTS(C01, lite)
C22 = CompileC(C21, lite)
T22 = CompileTS(C21, lite)
C23 = CompileC(C22, lite)
T23 = CompileTS(C22, lite)
```

The owner's `T1 == T2 == T3` shorthand maps to the defined
`T11 == T12 == T13` nodes.

**Original priority: T00 → T11 → T12.** These two artifacts are now recorded;
the owner-approved default-host transition above follows. T11 is stage 0 running S on S and emitting TS. T12 is T11
running on S and emitting TS. A TS artifact and its execution are the deliverable;
no separate IR artifact is produced.

T11/T12 acceptance, recorded 2026-11-02:

- [x] S includes the full-L front-end and emits TS directly.
- [x] Stage 0 + S produces T11.
- [x] T11 typechecks strictly and runs.
- [x] T11 + S produces T12.
- [x] T12 runs and records its hash.
- [x] `T12 == T11` byte for byte.
- [x] T11 compiles all 92 corpus cases exactly like stage 0: 53 program outputs
  and 39 rejection streams/status byte for byte.

Original TS ladder record, 2026-11-02 (historical source before the text cache):

| Node | Bytes | SHA-256 |
|---|---:|---|
| S (`compiler/manifests/ts.json`) | 155 219 | `827f90152433e65d2134f6e6df294d2c544b4bd665b879e9a3bd55d1eac343b8` |
| T11 | 243 216 | `8273ce69973afb8beb25052dc2c8ef4b0682c00f4af866623ece751531b15e39` |
| T12 | 243 216 | `8273ce69973afb8beb25052dc2c8ef4b0682c00f4af866623ece751531b15e39` |

T11 was originally produced by `./litec ts` from S while that launcher used T00.
Historical reproduction now uses `node igniter/bundle-cli.ts ts S.lts` explicitly.
T12 was produced by T11 running on the
same S after a strict artifact typecheck. Both artifacts ran the probe source and
their emitted TS matched stage 0 byte for byte. T13 was not recorded for this
original source snapshot. The refreshed source below has its own complete
three-node TS equality record.

Regenerate and re-check the ladder with one command:

```sh
node compiler/scripts/self-host.ts --out /tmp/selfhost-run
```

Corpus parity for an emitted compiler:

```sh
node compiler/scripts/corpus-parity.ts --artifact /tmp/T11.ts
```

The 2026-11-02 run compared T11 with stage 0 over all 92 cases in 7.7 s with
zero mismatches, covering emitted TS bytes, rejection stderr text and exit
status.

TS ladder commands:

```sh
# S is the ordered TS manifest bundle.
node --input-type=module -e 'import {loadBundle} from "./igniter/loader.ts"; process.stdout.write(loadBundle("compiler/manifests/ts.json").text);' > /tmp/S.lts
# T11 = stage 0 compiling S.
node igniter/bundle-cli.ts ts /tmp/S.lts > /tmp/T11.ts
# T12 = T11 compiling S; the runner typechecks T11 strictly first.
node compiler/scripts/run-ts-artifact.ts --artifact /tmp/T11.ts --source /tmp/S.lts --out /tmp/T12.ts
shasum -a 256 /tmp/S.lts /tmp/T11.ts /tmp/T12.ts
```

Slow-stage-0 compiles take minutes, so `compiler/scripts/run-ts-artifact.ts`
keeps the artifact contract while dropping the harness's ten-second cap.

Completion requires all of:

- C fixed point: `C01 == C21 == C22 == C23`
- TS-from-C fixed point: `T11 == T21 == T22 == T23`
- Every ladder node typechecks/runs and the 92-case corpus has exact streams
  and status.

The seed equalities `C01 == C21` and `T11 == T21` are the stage-0 versus
generated-compiler row. Treat them as required unless the owner records a
different completion rule before claiming the ladder is finished.

## Text-cache seed refresh

Recorded 2026-11-02, source based on `6c6b55b4d23a54b95697cabac7484b5aa70dec97`.
This is a new source snapshot, not a relabeling of the original ladder above.
The generated text helpers now share at most eight immutable code-point views
instead of rebuilding a whole-source array at every character read.

- S: 156236 bytes, SHA-256
  `17e53ce5a8eb6a603b84e25af67378c58a6bdec6d9914200c80f056931f8d74f`.
- T11 = T00 at the base revision executing this S on itself.
- T12 = T11 compiling this S; T13 = T12 compiling this S.
- All three are byte-identical, 245146 bytes, SHA-256
  `56d99755c2c816305136da6c54299e2d61e6ff3ab215817a4fd479f85cd6361c`.
- Each generated artifact passes strict TypeScript checking. The current TS and
  TS-hosted C seeds each match T00+S on all 92 corpus inputs, including exact
  rejection streams and status. The verifier passes all 91 executions. The full
  regression gate passes all 242 tests with zero skips (564 s); all 9 editor
  grammar groups also pass. These full-suite timings include the T00 sweeps.
- The unchanged C source is 149119 bytes, SHA-256 `413044da…`; compiling it with
  this T11 produces the 233939-byte TS-hosted C seed, SHA-256 `57b3a3fe…`.
  This is not native C11 or a native fixed point.

[Ladder identities](reports/2026-11-02-text-cache-ladder.json) preserve the full
hashes and commands. [Seven-sample benchmark and raw data](../benchmark/reports/2026-11-02-text-cache.md)
record a 668 ms self-compilation median and a 23.91× process-time improvement
for 1,000 report statements with exact emitted-output equality. Old self-build
timeouts remain censored; no whole-source speedup ratio is inferred.

## Report-order seed refresh

Recorded 2026-11-02, based on `d82cfe348889deb7518e8298c2e0cfbf88322069`.
Generated reports evaluate their joined line into a fresh temporary before
reading or appending to the output buffer. Calls in report arguments therefore
retain their own report effects, execute once in written order, and finish before
the outer line is appended. Six focused scenarios compare exact streams and
status with T00: surrounding output, multiple arguments, recursion, mixed scalar
values in a loop, exit after a report, and exit inside an argument.

- S: 156467 bytes, SHA-256
  `70918b20caf5a8f89fe56127f9bce52550e7e9f80542aa35f555384585524f10`.
- T11 == T12 == T13: 253122 bytes, SHA-256
  `49ac81d68078c8f4c189391a4979e84c2fec353c1589cb747c75bdbd61111b9c`.
- The refresh also works without T00: the previous generated seed emits updated
  S into a transitional compiler (`b92698c1…`); that compiler emits the refreshed
  fixed-point artifact. The explicit historical T00 audit independently emits
  the same bytes. The extra generation is necessary because the previous seed
  still emits the old report lowering.
- The unchanged C source (`413044da…`) compiled by the refreshed TS compiler
  produces a 237671-byte TS-hosted C emitter, SHA-256 `4dd040ad…`. C program
  artifacts retain their bytes; native C11 and C functions remain pending.
- Strict checks, all eight host tests, both 92-case corpus comparisons and all
  91 verification executions pass. The fast suite passes 238 tests with nine
  expected skips; all nine editor groups pass. The full suite passes all 247
  tests with zero failures or skips (581 s, including the T00 sweeps).
- [`generated/current-artifacts.json`](generated/current-artifacts.json) records
  current hashes for all 53 program cases, checked without optional hash skips.
  Historical P0 hashes and the original support inventory remain unchanged.

[Exact ladder identities and reproduction commands](reports/2026-11-02-report-order-ladder.json)
record both the generated-only refresh and the independent T00 audit. The
text-cache timings above describe their earlier source snapshot, not a benchmark
of this refresh. Fault-time output retention is a separate remaining gap.

## Generated full-source test consumers

The three full-source lexer/parser/checker sweeps now run the Lite drivers
compiled by T11 instead of interpreting their work through T00. Each driver is
strictly checked once per sweep, and each input runs in a fresh process. Existing
S, C-source, helper-source and corpus assertions are retained; small successful
and rejected fixtures also compare exact status/stdout/stderr against T00.
Focused interpreter tests still exercise T00 directly.

The checker uses an equivalent local Boolean for named tuple-field matching,
avoiding the already-inventoried parenthesized-comparison parser gap. This does
not add language surface or modify S in either backend manifest. Both compiler
seeds and their source/artifact hashes remain unchanged. A new regression group
checks prepared-runner process isolation and strict-typecheck failure handling.

The recorded full gate falls from 580556.73 ms to 47618.322917 ms (12.19×):
248 passed, zero failures, zero skips. The same three sweeps fall from 547043 ms
to 15809 ms combined. The fast gate passes 239 with its nine existing skips in
26.7 s. These are single before/after runs on the same workspace, not a new
compiler-throughput benchmark. [Raw timings and method](reports/2026-11-02-generated-sweeps.json).
This migrates three test consumers; full feature parity, native C11 and run/check
replacement remain pending.

## Temporary I/O migration

Owner selection, 2026-11-02: replace report with outputLine, add output without a
newline, allow empty output calls, display ordinary values including arrays,
and give inputAll/inputLine/inputInt/inputFloat an optional positional String
prompt. A leading output String is a value. The [current helper contract](../docs/tooling-and-learning.md#temporary-input-and-output-helpers-selected-2026-11-02)
supersedes earlier report signatures; there is no source-level report alias.
All maintained Lite calls and live source snippets are migrated. Historical
snapshots and published tags remain unchanged.

T00 supports its admitted scalar/Unit, tuple, array and list values. Generated
TS supports admitted scalar/Unit, flat named-tuple and List display, prompted
line/token/all input with shared lookahead, checked Int64 input and finite Float
input values. Strict incremental UTF-8 decoding preserves prompt/read/fault
order. Wider Float operators, unnamed/mixed tuple grammar and fixed-array
contracts remain existing-feature parity work. The C emitter supports admitted
scalar output and explicitly rejects unsupported input/aggregate forms.

Generated main accepts an optional streaming writer used by the process
adapters; a zero-argument main call retains the original return-text contract.
Output is now retained before later runtime faults in normal artifact runs.
A Unit-returning function tail also preserves its called function's effects.
TS verification now runs strict-checked child artifacts with supplied stdin and
arguments, rather than importing programs into the verifier process.

Current S: 167117 bytes, SHA-256 `4cf236be54783ca9b2854dbdc22c4c28a08d579ff92cb902714c36619f9c1991`.
Three generated compiler generations are identical, 273040 bytes,
SHA-256 `fa134de2a4c19891ce0a8970d83682ea4acafdfe21736ac73a30e1f4ac330daf`. The generated-only refresh adapts
source call spellings for the previous seed and then compiles unchanged current
S three times; this preserves the historical ladder node meanings. The current
TS-hosted C emitter is 244073 bytes, SHA-256 `8928ddc79ac55f0d48990fa71ab163f4f6987e90bc19fba1a863c964de6446a4`.
[Exact builder recipe and identities](reports/2026-11-02-io-migration-ladder.json).

The compiler corpus now has 55 programs and 38 rejections: empty outputLine()
moves to the program category, and a new output/no-newline case is added.
Canonical verification adds one feature with two scenarios on T00 and TS:
37 features, 77 total scenarios and 95 target executions. Focused host probes
cover value/effect order, shared input state, prompts, numeric faults, EOF,
Unicode chunk boundaries, exact real-CLI decoding faults, empty calls and the
removed report spelling. Strict host/seed checks pass. All 251 full tests pass with zero skips in 51.7 s;
the fast suite passes 242 with nine expected skips in 30.1 s. All nine editor
groups, both 93-case compiler comparisons and 95 verifier executions pass.

## Checked Int64 arithmetic

The next existing-feature slice checks dynamic default-Int addition, subtraction,
multiplication and negation in both generated targets. TS guards BigInt results;
portable C11 guards reject overflow before evaluating signed operations. C
source-offset operand temporaries use comma sequencing to preserve left-to-right
nested faults. Helper names and temporaries are distinct from source locals.
Line-start metadata is emitted once, with line/column lookup only on a fault;
logical source names, Unicode code-point columns and CRLF positions match T00.
Overflow preserves earlier streamed output, exact ArithmeticPanic stderr and
status 1. Short-circuit logic and untaken branches avoid executing their faults.

The [host differential tests](tests/host.test.ts) cover a 13-value signed boundary
matrix, all representable pairwise results, eleven overflow expressions, nested
fault order, helper-name hygiene and TS call effects. The existing canonical
Int-limits case now also executes dynamic boundary operations on all three
targets. Six native programs pass with `-fsanitize=undefined` and
`-fno-sanitize-recover=all`, matching T00's exact status/stdout/stderr.
Constant folding, division-family behavior and wider numeric widths are unchanged
by this slice; these checks do not establish complete numeric or language parity.

Current TS S is 171197 bytes, SHA-256
`e9764d147082ef2f95583adddd3100305b00b966bd7a7852d7a0d56449fd00ab`.
Three generated compiler generations are byte-identical, 310891 bytes, SHA-256
`de37c5be4c981847fbfc0895ac9af027451e07ddc267952638fb8d18ee7e3767`.
The refresh starts from the previous generated seed, compiles unchanged current
S through a transitional compiler, then compiles it three times; no T00 or
source rewriting is used. The refreshed TS-hosted C emitter is 283282 bytes,
SHA-256 `b6f54e8e809b89db75965781436ebbc8647ecaa66dee510d653c46e2d36fa4cc`,
from C source SHA-256
`e70525a549f47e2ca1fad710ab9bc14b581af90c1197c67be854f939d984c183`.
The [ladder record](reports/2026-11-02-int64-ladder.json) preserves the recipe,
identities and validation results.

Strict host/seed checks pass. The full suite passes all 253 tests with zero
skips in 54.6 s; fast passes 243 with ten expected skips in 30.4 s. All nine
editor groups, both 93-case corpus comparisons and all 95 canonical target
executions pass. Full existing-feature parity, run/check migration and the native
C compiler ladder remain pending; T00 is still required.

## Rule

For one Lite source at a time, starting with the compiler corpus and then S:

1. Run stage 0 and the generated target compiler over the same source.
2. Compare status, stdout and stderr byte for byte. For emitted TS/C, compare
   hashes and diff the exact artifact.
3. Record only the first difference in the log below.
4. Classify it as a missing T/C feature, a stage-0 feature S depends on but T/C
   lack, or nondeterminism.
5. Add the smallest compiler slice that removes it and rerun.
6. Keep going until `T2 == T`, `C2 == C` and the corpus matches.

Do not normalize a diff before its cause is understood (bootstrap default B6).
Do not widen S or L just to simplify parity.

## Feature gap

The [measured support inventory](reports/2026-11-02-t00-t11-inventory.md) audits
all canonical features, examples and samples plus isolated boundary probes.
Of 36 feature cases, 20 match and 16 reject; of 19 examples, 2 match and 17
reject; of 20 implemented samples, 11 match and 9 reject. Isolated probes also
expose missing forms within passing broad feature cases, including typed fixed
arrays, and behavioral differences in overflow, output retention and invalid
UTF-8 input. These finite results do not establish general parity.

Stage 0 already supports more than L. That extra surface is frozen debt, not a
target to expand. New capability is Lite-first: add it to L/S and the compiler
slice, then give stage 0 only the minimal execution support needed to run S.

| Area | Stage 0 | L/S | T/C | Status |
|---|---|---|---|---|
| Bootstrap surface: Int/String/Bool, flat tuples, lists, typed functions, `if`/`loop`, `report`/input helpers | yes | yes | P3-P7 | close |
| Igniter-only surface: Float, fixed arrays, `match`, loop metadata, `finally`, compound updates, closures and other non-L forms | yes | no | no | frozen; do not add more; port only by owner decision |
| New capability | no | no | no | Lite-first owner decision; never stage-0-first |

The bootstrap parity gate needs only the first row. The owner-approved transition
also includes porting existing T00 features, but that work remains pending; the
freeze prevents the target from growing while it is approached.

## Current state

- P1 bundle tooling is green: direct flat-import and bundle paths produce
  byte-identical artifacts and exact diagnostics for all 92 compiler cases.
- P2 L0 helpers exist under `lib/core/` with direct Lite tests. The compiler
  imports them without changing the 50/42 artifact and diagnostic baseline.
- P3 adds the Lite lexer under `compiler/src/`; it tokenizes expanded S, the C
  emitter, the lexer sources and every compiler case. No parser or emitter
  behavior changed.
- P4 is complete: the parser parses expanded S, L0, the lexer and all program
  cases; manifest order is authoritative, compiler source and `lib/core` have no
  `importFlatAll`, and unsupported declarations reject by name.
- P5 is complete: the checker covers top-level symbols, block scopes, local
  types, initializers/assignments, Bool conditions, arity/arguments/returns,
  tuple/list/field/index types, mutation grants and break/return placement. S
  checks, the 39 rejection cases retain exact diagnostics, and invalid programs
  do not emit artifacts.
- P6 is in progress: the TS runtime covers checked Int64 arithmetic, code-point
  text, list copies, faults and exit; the compiler now accepts typed scalar
  locals, nested/doc/raw comments, transparent scalar and flat named-tuple type
  aliases, flat named-tuple construction and field reads, top-level functions
  with positional calls, recursion/`self` and `return`, and growable `List<T>`
  types, literals, checked indexing, `loop sequence as item` traversal and
  `push_back`/`pop_back` mutation with copies in the TS path. Total value `if`
  expressions with same-kind branches lower to TS conditional expressions in
  value positions. Checked `inputArgs`/`inputAll`/`reportError`/`exit` and
  code-point `textLength`/`textAt`/`textSlice` calls lower to self-contained TS
  helpers in expressions, Unit statements, functions, loops and value `if`
  branches. Action `if` chains admit any number of `else if` arms with Bool
  conditions and an optional final `else`, lowering to TS/C `else if` emission. A
  function-tail `if` whose branches hold statements now returns each branch's
  tail expression, which S relies on.
  Dynamic Int `/`, `%`, `:/` and `:%` lower to checked TS and C
  helpers that preserve zero-divisor and signed-minimum faults. Dynamic String
  concatenation lowers to ordinary left-to-right TS `+` and a checked C
  byte-copy helper whose allocations are intentionally leaked in this
  bootstrap slice. Bare nearest-loop `break`/`continue` lower in Boolean,
  unconditional and list-traversal loops; C admits the first two and still
  rejects list traversal. The C path
  rejects function syntax, tuple or list values, list
  traversal, value `if` and the new input/diagnostic/text builtins with clear
  status-2 diagnostics. TS/C output is emitted directly; no separate IR
  deliverable is planned. The full emitter, Node I/O adapter and T-from-S gate
  remain.
- Stage 0 is feature-frozen. P3-P8 add Lite compiler features, not igniter
  features; any new capability is a Lite-first owner decision.
- T00 exists. The refreshed T11, T12 and T13 are recorded and byte-identical for
  the bootstrap surface. The native C ladder remains pending.
- [`generated/current-artifacts.json`](generated/current-artifacts.json) contains
  the current artifact hashes for all 53 program cases. The original 50-case P0
  hashes remain in `generated/baseline-artifacts.json` as historical evidence.

Useful internal tools:

- [`../igniter/bootstrap.ts`](../igniter/bootstrap.ts): `RunResult`,
  `loadCompiler`, `runText`/`runFile`/`runBundle`, `hashBytes`,
  `nondeterminismReasons`.
- [`../igniter/artifacts.ts`](../igniter/artifacts.ts): strict TS typecheck/run
  and C build/run with `-std=c11 -Wall -Wextra -Werror`.

## Difference log

| Date | Target | Source | First difference | Class | Resolution |
|---|---|---|---|---|---|
| 2026-11-02 | TS | `report(f())` where `f` itself reports | Stage 0 prints `f`'s line before the outer line; the emitted `lite_out += f()` reads the accumulator before its arguments, so `f`'s line is dropped | emitter argument-order bug | closed by the report-order seed refresh above; six focused T00/generated scenarios and current corpus hashes |
| 2026-11-02 | TS | Dynamic Int64 addition, subtraction, multiplication and negation overflow | T00 faults; generated TS returns out-of-range BigInt values | checked-arithmetic gap | closed for these four default-Int operations by the checked Int64 refresh; exact fault streams/status and portable C11 guards covered |
| 2026-11-02 | TS | A report followed by an indexed-read runtime fault | T00 retains the earlier report; generated TS loses it because main never returns the accumulator | output-retention gap | closed for process adapters by the I/O migration; exact runtime fault diagnostics remain separate |
| 2026-11-02 | TS | `inputAll()` with invalid UTF-8 stdin | T00 returns InputFault; generated TS substitutes a replacement character and succeeds | input-decoding gap | closed by strict incremental input decoding and exact real-CLI UTF-8 probes |
| — | — | — | No generated compiler yet | — | — |
