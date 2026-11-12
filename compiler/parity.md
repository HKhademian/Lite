# Historical bootstrap parity ledger

Status: **historical snapshot, 2026-11-02**. The commands and results below
record the pre-import bootstrap path. They are audit evidence, not current build
instructions; the active graph-based build is documented in
[`README.md`](README.md) and [`bootstrap/README.md`](bootstrap/README.md).

Immediate scope: the bootstrap subset L, S, and the 67 program / 26 rejection
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

T11 was originally produced by `./bin/lite-compile ts` from S while that launcher used T00.
Historical reproduction now uses `node igniter/bundle-cli.ts ts S.lts` explicitly.
T12 was produced by T11 running on the
same S after a strict artifact typecheck. Both artifacts ran the probe source and
their emitted TS matched stage 0 byte for byte. T13 was not recorded for this
original source snapshot. The refreshed source below has its own complete
three-node TS equality record.

Audit the historical T00 → generated builder route for current S with one
command. To reproduce the checkpoint hashes above, first restore its matching
source revision; the command does not restore historical S:

```sh
node compiler/scripts/self-host.ts --reference --out /tmp/selfhost-run
```

Corpus parity for an emitted compiler:

```sh
node compiler/scripts/corpus-parity.ts --reference --artifact /tmp/T11.ts
```

The 2026-11-02 run compared T11 with stage 0 over all 92 cases in 7.7 s with
zero mismatches, covering emitted TS bytes, rejection stderr text and exit
status.

Historical TS ladder commands (do not use for current builds):

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
- [`tests/references/generated/current-artifacts.json`](tests/references/generated/current-artifacts.json) records
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

## Positioned integer division family

Dynamic `/`, `%`, `:/` and `:%` now use the same positioned ArithmeticPanic
path as addition/subtraction/multiplication/negation. Zero-divisor messages match
the reference exactly: division, remainder or modulo by zero. MIN/-1 division
and floor division fault with `integer outside Int range`; MIN%-1 and MIN:%-1
are valid zero results. The shared core remainder helper and constant folder
also admit that representable result. C guards its otherwise undefined MIN/-1
division/remainder before executing them. Hygienic source-offset temporaries
sequence every integer binary helper's operands once, from left to right.

The differential tests cover the 13-value signed boundary matrix, ten fault
expressions (including nested competing faults), exact Unicode logical names
and CRLF columns, TS call effects, earlier output and untaken dynamic branches.
The existing remainder/floor canonical cases gain dynamic MIN/-1 remainders.
Fourteen native programs pass strict C11 compilation and undefined-behavior
sanitizers with exact status/stdout/stderr comparisons.

Current TS S is 171273 bytes, SHA-256
`5957b6aceb411bdc2e234e526cda941b4863ab8520ac402ecc43688ab2b0a271`.
Three generated compiler generations match, 310973 bytes, SHA-256
`625bee56643e91b2836a6d5b3660a28f0e3a6cb0efa28b66fbd175e2d68ac8f9`.
The TS-hosted C emitter is 281923 bytes, SHA-256
`a0e02fcafc53fd24b22e9cd1272d278de6c12c54b6ccf0c522b65d93c6a01ccf`,
from 157990 bytes of C source, SHA-256
`3c42fcffb4d087e1083f640738ff015e209f1f615679f4699d975c27d5876bb6`.
The [generated-only ladder](reports/2026-11-02-division-ladder.json) records
builder identities, reproduction and validation.

The [refreshed inventory](reports/current-t00-t11-inventory.md) has 71/162
matching cases and 91 remaining; 21 original failures are now closed, with no
original passing case regressing. Two accepted-source diagnostic differences
remain, both bounds faults. Dead constant arithmetic/short-circuit folding and
wider numeric semantics remain separate gaps.

The [five-pair speed check](reports/2026-11-02-division-performance.json) uses
identical inputs and alternating fresh processes. Compiler-phase medians are
922.5 → 922.8 ms for the same current S, and 95.6 → 102.4 ms for 1,000 output
statements. Corrected generated code intentionally changes some artifacts; the
output-only workload retains exact bytes. This records the extra scan cost,
not a speedup; helper discovery is the next optimization topic.

Strict host/seed checks pass. All 255 full tests pass with zero skips in 52.3 s;
fast passes 244 with eleven expected skips. Both 93-case corpus comparisons,
all 95 verifier executions and all nine editor groups pass. A combined-feature
C probe found that a multi-value output call can print a prefix before a later
argument faults; the reproducer is tracked separately in [the gap list](gaps.md).

## Single-pass helper discovery

The compiler collects distinct target helper calls once per program, skipping
escaped quoted strings and consuming whole identifiers. Helper queries reuse
that set instead of rescanning every emitted expression and copying the item
list for each helper. C's unsupported-builtin checks likewise scan each item's
code once before testing required names. This is implemented in shared Lite
source and both Lite emitters; it selects the same runtime helpers and changes
no language contract.

The [paired measurements](reports/2026-11-02-helper-scan-performance.json) record
compiler-phase medians of 100.0 → 60.4 ms for 1,000 output statements and
899.0 → 649.8 ms for identical current compiler source. Both emitted outputs
are byte-identical across all five pairs. These are fresh processes with one
warm-up pair, alternating order, and module loading/typechecking excluded.
The earlier division-family scan cost is recovered on these workloads.
The C-emitter pairs likewise improve: 133.0 → 81.0 ms for 1,000 outputs,
and 238.5 → 170.9 ms for 200 dynamic divisions, with identical emitted C.
An early no-helper path avoids a slowdown found in the initial C experiment.

Exact previous/current generated-compiler comparisons cover 261 source inputs
on each target: all 162 inventory cases, 93 compiler corpus cases and six extra
quote/escape/shadow/nesting cases. All 522 comparisons match status/stdout/stderr,
including explicit C rejections; artifacts are not normalized. The
[raw comparison](reports/2026-11-02-helper-scan-exact.json) records input and
output identities. The 71/162 runtime inventory count is unchanged.

Current TS S is 172660 bytes, SHA-256
`9de37c318f9ba014f1f1c50c1f4036a99c2b86a3504b0e9e47eb8b1f86b3d0b8`.
Three generated generations are identical, 312229 bytes, SHA-256
`c25922d7a3c843395844deb30e99c34e73e1cbc66a04740b2a596c1d433c7683`.
The TS-hosted C emitter is 284104 bytes, SHA-256
`eba31df8415d845789dc3a3e1dd6c97666d2381655486b7d260a35184d1f1692`,
from C source SHA-256
`450a6578c13a0f3a4803189edd63679505d6f116afe24fb7bf52755594b63eef`.
The [generated-only ladder](reports/2026-11-02-helper-scan-ladder.json) records
exact source/builder/artifact identities and reproduction.

Strict host/seed checks, all 255 full tests (zero skips, 49.1 s), fast 244 pass
with eleven expected skips (30.3 s), both 93-case corpus comparisons, all 95
verifier executions and all nine editor groups pass. The next behavior topic is
the discovered C output argument-fault ordering gap.

## C output argument evaluation

The C emitter now evaluates all arguments of a multi-value output/outputLine
call once, from left to right, before printing any part of that call. Typed,
hygienic temporaries hold Int/String/Bool/Float values; admitted Unit values need
no stored payload. A later arithmetic fault leaves no partial call or separator,
while previous output calls remain visible. Single-value calls retain their
exact emitted C and avoid temporary-name construction. Empty calls preserve the
selected newline behavior. Existing C input/aggregate restrictions remain.

Fourteen focused native programs compare exact status/stdout/stderr with T00,
including later and competing faults, Unicode source names/positions, prior
output, loops/scopes, output without newline, empty/Unit/mixed values and source
names resembling temporary names. Six programs also pass strict C11 and
undefined-behavior sanitizer checks. Multi-value C corpus hashes are refreshed;
historical snapshots and all TS artifacts remain unchanged.

Only C S changes: 161052 bytes, SHA-256
`b109e2dde95a0fd961e3fa7d06dd3d742bc6eb6e63346853a9e4e41916c6d9cd`.
Unchanged T11 (`c25922d7…`) emits the strictly checked TS-hosted C compiler,
286924 bytes, SHA-256
`ec6d4b7b48f61101d8160c464409ccf846e8b0136890d58c54cf7c1198511928`.
The [C-only refresh](reports/2026-11-02-c-output-ladder.json) records provenance
and reproduction. It does not reclassify this TS-hosted emitter as native C11.

The [five-pair C-emitter measurements](reports/2026-11-02-c-output-performance.json)
are steady within noise: 78.8 → 79.6 ms for 1,000 single-value outputs,
185.7 → 181.7 ms for 200 multi-value outputs. Single-value artifacts match
exactly; multi-value artifacts intentionally add argument temporaries.

Strict checks, all 256 full tests (zero skips, 48.5 s), fast 244 pass with twelve
expected skips (27.2 s), both 93-case corpus comparisons, 95 verifier executions
and nine editor groups pass. The TS inventory remains 71/162, with 91 failing
cases. C output ordering is closed; positioned bounds diagnostics, comparison
parsing and the other [live gaps](gaps.md) remain pending.

## Positioned text and list bounds faults

Generated textAt/textSlice, list indexing and pop_back now raise exact positioned
BoundPanic diagnostics and preserve earlier output in the process adapters.
Each call carries its immutable numeric source offset. Bounds and integer faults
share one line-start table and lookup routine, with location lookup only on a
fault; this avoids rescanning the source for every access during compilation.
Operands retain their existing evaluation order and execute once.

Thirty focused executions compare named/anonymous diagnostics with T00, covering
negative/huge indices, empty text/lists, reversed/oversized slices, prior output,
loops, nested effects, valid endpoints, CRLF and BMP source comments. Unicode
source names and supplementary text values are included. A separate same-line
supplementary-character probe exposed different column units: T00 counts UTF-16
units, Lite offsets count code points. The owner is choosing that convention;
this slice preserves the existing Lite convention and keeps that gap explicit.
Earlier arithmetic Unicode probes used preceding lines/logical names and did
not establish parity for supplementary characters before a fault on the same line.

Current TS S is 173376 bytes, SHA-256
`ee0832948120401868cf7e93d93e0f51cc794faadb54daf4cfc58b2533d08aa8`.
Three generated generations match, 315117 bytes, SHA-256
`c95292264a2b894c0f1e5d31eb53193d3605c71800def6b987db6934b8b717b7`.
The refreshed TS-hosted C emitter is 288864 bytes, SHA-256
`7428143f0c993a997d19a08e19c68463e17b0429bd6a4df0281fe95d97b06a46`,
from C source SHA-256
`550cd452f94d14887875c7a335a97d0cf0fffa57fee0a705b549c6e608e47b99`.
Native C program bytes are unchanged. The
[generated-only ladder](reports/2026-11-02-bounds-ladder.json) records provenance.

The refreshed inventory has 73/162 matches, 89 rejections, and no observed
runtime/diagnostic differences among accepted inputs; 23 original failures now
match, with no original passing case regressing. These are finite observations;
the supplementary-column discrepancy and wider gaps remain tracked separately.
The [paired performance report](reports/2026-11-02-bounds-performance.json)
records the cost of positioned helpers without claiming a speedup.

Strict checks, all 257 full tests (zero skips, 47.3 s), fast 245 pass with twelve
expected skips (30.3 s), both 93-case corpora, 95 verifier executions and nine
editor groups pass. Paired compiler-phase medians are 60.2 → 59.4 ms for 1,000
outputs, 628.3 → 646.2 ms for the same compiler source. C-emitter pairs are
80.0 → 79.9 ms for 1,000 outputs and 166.8 → 164.3 ms for 200 divisions.

## Inequality token discrimination

A shared single-equals check now distinguishes assignment/named-tuple fields
from both equality and inequality. Parenthesized `value =!= other` no longer
looks like tuple construction, and a bare function tail no longer looks like
assignment to its immutable parameter. Existing assignment and named fields
retain their contracts. No new operator or language syntax is selected.

Focused checks cover 12 TS programs and seven native C programs over String,
Int and Bool values, nested grouping, comments, loops, ordinary assignment,
tuple construction and implicit function results. Ten target rejection checks
cover malformed/mistyped comparisons, immutable assignment, broken fields and
invalid longer operator spellings, before effects. A new inventory probe keeps
the discovered bare function-tail failure as a permanent source case.

Current TS S is 173318 bytes, SHA-256
`55dfd45e27e5a31a4d90c3833b8750fba22e0a258ee86ad8b570d767b3a1bab1`.
Three generated generations match, 314867 bytes, SHA-256
`0cacf4b4907e8c1c83a343a00ab954df726bd79ed58a3e41e4878691eaa15b36`.
The TS-hosted C emitter is 288610 bytes, SHA-256
`6f891dd9315276f07e75b28a71530953c9173927aef6b92dc41affdbd90de7b3`,
from C source SHA-256
`1b5adf7998d2e335d37be55a4f17d535fe03e10709a7bc967d77bb0c69907b1d`.
The [generated-only ladder](reports/2026-11-02-inequality-ladder.json) records
provenance; all existing corpus program artifact bytes remain unchanged.

The inventory now has 75/163 matches and 88 rejections: one old failed probe
is closed and the new function-tail probe also matches. Twenty-four original
failures are closed, with no original matching case regressing. The
[paired measurements](reports/2026-11-02-inequality-performance.json) are recorded
without claiming a speedup. Deferred constant arithmetic faults are the next
topic, before comparison chains; the supplementary-column decision stays separate.

Strict checks, all 258 full tests (zero skips, 47.3 s), fast 246 pass with twelve
expected skips (30.4 s), both 93-case corpora, all 95 verifier executions and nine
editor groups pass. Paired TS medians: 63.2 → 62.9 ms for 1,000 outputs,
634.8 → 647.0 ms for identical S. C-emitter medians: 80.4 → 85.9 ms for 1,000
outputs, 174.6 → 174.4 ms for 200 divisions. No speedup is claimed for this slice.

## Deferred constant arithmetic faults

Valid Int64 constants still fold. When a checked fold would overflow or divide,
remainder or modulo by zero, the compiler now emits the positioned runtime
operation instead of raising a compile-time arithmetic failure. Such faults
happen only when execution reaches them: dead branches, false loops, skipped
Boolean operands and unused functions remain unevaluated. Literal range errors,
unknown names and type errors still reject the whole source before effects.
Unary negation follows the same rule; later valid operations cannot cancel an
earlier fault. Constant MIN%-1 and MIN:%-1 emit literal zero to avoid undefined
native C remainder, including in otherwise valid constant expressions.

Eight unused eager-failure wrappers are removed. Source is 3029 bytes smaller;
the generated TS compiler is 5045 bytes smaller. Six original source files are
preserved byte for byte but move to program category 001-011, with modeled
runtime status 1 and exact ArithmeticPanic stderr. Corpus: 61 programs and 32
rejections, still 93 sources. Runtime-fault TS/translated-JS executions now use
isolated processes; pure successful cores retain direct-return import coverage.
Both normal TS and translated JS still receive strict checking.

The focused suite covers fourteen fault expressions, all seven binary integer
operations, unary negation, competing faults, prior output, dead branches/loops,
short-circuit operands, unused functions, value-if branches and static rejection
inside dead code. Existing canonical integer arithmetic gains skipped-fault
cases on all three targets. Sixteen native sanitizer programs compare exact
status/stdout/stderr, including valid constant MIN remainders.

Current TS S is 170289 bytes, SHA-256
`8801038265573d0f5552913834a79d64acd6eccb767c5f53d39a497d8fe82110`.
Three generated generations match, 309822 bytes, SHA-256
`c1a9436393f31334aa3574bfc86569e6f2048cd923920b651af9fe74f9a061d8`.
The TS-hosted C emitter is 283560 bytes, SHA-256
`6c04b9cee27e59a786c0348c5c03a222d8816dee831c04bbbdfce6782bbf77b0`,
from C source SHA-256
`e52694da6923f1f6b3cc85c94a69849eee558cb10825a41931eb0edad22674d9`.
The [generated-only ladder](reports/2026-11-02-deferred-faults-ladder.json)
records provenance and validation.

All 259 full tests pass with zero skips in 53.4 s; fast is 247 pass/twelve
expected skips (31.5 s). Strict checks, both 93-case compiler comparisons,
95 canonical target executions and nine editor groups pass. Inventory is
77/163 matching, 86 rejecting; 26 original failures are now closed, without an
original passing case regressing. The [paired performance report](reports/2026-11-02-deferred-faults-performance.json)
records steady throughput, including a new constant-arithmetic workload.
Comparison chains are next. Supplementary-character column units, wider
features, native C self-hosting and run/check replacement remain pending.

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
- [`tests/references/generated/current-artifacts.json`](tests/references/generated/current-artifacts.json) contains
  the current artifact hashes for all 53 program cases. The original 50-case P0
  hashes remain in `tests/references/generated/baseline-artifacts.json` as historical evidence.

Useful internal tools:

- [`../igniter/bootstrap.ts`](https://github.com/repository owner/Lite/blob/d3bd6f7bcf06bbea6669c8d74bebe5e73f383114/igniter/bootstrap.ts): `RunResult`,
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

## Comparison-chain lowering

The generated TS and C targets now compare adjacent operands, retain each middle
operand once and skip later operands after the first failed pair. All ten
operators share this path, while ordinary two-operand artifacts stay unchanged.
Every adjacent pair is checked even after a constant false pair. TS uses private
expression scopes; C uses typed, source-offset temporaries and flat comma/`&&`
sequencing, avoiding C argument-order ambiguity and deep bracket nesting.

Coverage includes 600 constant/dynamic chains across all 100 operator pairs,
Int64 limits, String/Bool/Unit equality, prefix `not`, grouping, loops, names,
prompted input, operand effects, skipped/reached faults and static rejection.
A 301-operator chain runs on both targets. Nine strict native UBSan programs
match reference status and streams. All 61 older corpus artifact pairs remain
identical; both 93-case corpora and all 98 verifier executions pass.

The full gate passes 260/260 tests, zero skips, in 49.4 s; fast passes 248
with 12 expected skips in 28.3 s. Strict host/seeds,
coverage and nine editor groups pass. The [generated-only ladder](reports/2026-11-02-comparison-chains-ladder.json)
records three identical TS generations and the TS-hosted C emitter. Native C
compiler self-hosting remains pending.

Character-filtered comparison lookahead and C temporary scanning keep the common
path small. Five paired samples show TS medians 60.6 → 59.5 ms for 1,000 outputs,
636.4 → 627.4 ms for identical compiler source, and 123.0 → 124.9 ms for 1,000
constant expressions. C-emitter medians are 78.8 → 76.9, 166.5 → 163.2 and
221.3 → 213.0 ms for outputs, dynamic divisions and constant expressions.
These mixed changes are recorded without a general speedup claim; see the
[raw performance report](reports/2026-11-02-comparison-chains-performance.json).

Inventory: 79/164 match, 85 remain, 27 original failures closed, no regressions,
210 tracked Lite sources, no load errors. The decisions example still needs a
semicolon-free value-if declaration; chain support alone does not close it.
A separate Never-valued `exit` typing flaw was discovered and added to the queue.
Supplementary-character columns remain an owner decision. Next is the script
and lexical-form queue, beginning with empty scripts.

## Empty-script support

Empty, whitespace-only and comment-only scripts now compile and finish silently
on generated TS and C. The parser validates leading trivia, returns its typed
empty Items list before alias discovery and skips the remaining parser-state
allocation. Keeping the Items annotation preserves the historical T00 source
route; contextual inference for a bare `return []` is not required by S.

Twelve focused empty/comment programs include nested/raw comments and Unicode;
two nonempty combinations retain output, locals and chains. Five malformed
sources reject before effects, including unfinished comments after prior output.
The real CLI admits an empty file on both targets and still rejects malformed
later source and invalid UTF-8. The two original empty fixtures move from 002 to
001 without changing source bytes. Corpus: 63 programs/30 rejections, still 93
sources. The 61 earlier program artifact pairs are unchanged.

The full gate passes all 261 tests with zero skips in 52.2 s; fast passes
249 with 12 expected skips in 32.5 s.
The [generated-only ladder](reports/2026-11-02-empty-scripts-ladder.json) records
three identical compiler generations and the TS-hosted C emitter. Strict host,
seed and artifact checks, both 93-case corpora, 98 verifier executions, coverage
and nine editor groups pass. Native C compiler self-hosting remains pending.

Five paired samples show steady nonempty compiler throughput: TS medians
63.0 → 64.7 ms for 1,000 outputs, 645.7 → 642.4 ms for identical S, and
130.6 → 128.5 ms for 1,000 constant expressions. C-emitter medians are
83.2 → 82.2, 170.9 → 168.5 and 216.5 → 217.0 ms for outputs, divisions and
constant expressions. Mixed small changes do not establish a speedup; the
[performance report](reports/2026-11-02-empty-scripts-performance.json) keeps raw
samples and exact input/artifact identities. The source shrinks by 112 bytes
and each generated compiler by 126 bytes.

Inventory: 81/164 match, 83 remain; 29 original failures closed, no regressions,
210 tracked Lite sources, no load errors. Next: optional final semicolons and
closed-block statement boundaries. The broader gap queue remains active.

## Statement boundaries

The shared parser now consumes simple statement separators consistently: explicit
`;`, EOF, a closing scope, or an initializer ending directly in a closed block.
Declarations, assignments, type aliases, calls, return and loop exits use this
rule. Unit functions admit bare `return` before their closing brace. Parentheses
after a block still end in `)`, so they do not create a closed-block boundary.
Comments and line breaks alone do not separate simple items.

The same change fixes a permissive output parser: `outputLine(1) outputLine(2)`
now rejects before any artifact or program output, as T00 requires. Missing
function/scope braces and non-Unit empty returns still reject. Runtime faults
without a final semicolon retain exact locations, prior output and status.
Coverage includes thirteen admitted TS/C programs, eight TS function/value/input
programs, eleven rejection sources and fault execution on both targets.
C input/functions/value-if remain separate target gaps.

The standalone token parser uses the same boundary contract, including optional
separators after closed if/loop/scope bodies. Nine valid and five invalid sources
run through both reference and generated parser drivers; full-source sweeps
continue to cover the compiler itself.

The final-semicolon declaration fixture moves to 001-005 with unchanged source
bytes. The corpus has 64 programs/29 rejections (93 sources); all 63 previous
program artifact pairs remain identical. Both compiler corpora, 98 verifier
executions, coverage, strict host/seeds and nine editor groups pass. The
[generated-only ladder](reports/2026-11-02-statement-boundaries-ladder.json)
records three identical TS generations and the TS-hosted C emitter.

All 262 full tests pass with zero skips in 63.4 s; fast passes 250 with
12 expected skips in 39.6 s. The gate duration is a
validation observation, separate from the isolated paired compiler measurements.

The boundary helper removes six duplicate trivia scans and builds diagnostic
messages only on failure. Five paired compiler-phase medians stay steady:
TS outputs 61.3 → 61.9 ms, identical S 676.2 → 669.4 ms, constant expressions
127.3 → 127.9 ms; C-emitter outputs 80.9 → 79.7 ms, divisions 169.4 → 171.8 ms,
constant expressions 218.0 → 215.0 ms. All measured output bytes match exactly;
these mixed changes do not establish a general speedup. See the
[raw performance report](reports/2026-11-02-statement-boundaries-performance.json).

## Adjacent String literals

Both generated targets now join adjacent admitted quoted literal tokens across
whitespace and nested/raw comments before expression parsing. The frontend scans
all pieces into one value and encodes once. The standalone token parser likewise
joins decoded pieces before quoting normalized text. Semicolons and arbitrary
computed expressions remain item/expression boundaries. Later malformed literals
retain their own source position and reject before effects.

Coverage includes thirteen TS/C programs and seven TS function/aggregate/input
programs: empty pieces, escapes, Unicode, line breaks, comments, concatenation,
comparisons/chains, branches, lists, tuples, prompts and text helpers. A chain of
1,024 literal tokens runs on both targets. Eight invalid sources reject before
artifact output; both targets check the exact later-literal diagnostic and a
runtime fault after joining. Two additional valid and one invalid source execute
through both standalone parser drivers.

The original adjacent-literal fixture moves to 001-001 with unchanged source
bytes. Corpus: 65 programs/28 rejections, still 93 sources. All 64 earlier program
artifact pairs are unchanged. Both compiler corpora, 98 verifier executions,
coverage, strict host/seeds and nine editor groups pass. The
[generated-only ladder](reports/2026-11-02-adjacent-strings-ladder.json) records
three identical TS generations and the TS-hosted C emitter.

Five paired compiler-phase medians stay steady: TS outputs 63.8 → 63.5 ms,
identical S 661.9 → 649.4 ms, constant expressions 126.5 → 129.0 ms;
C-emitter outputs 80.3 → 80.5 ms, divisions 170.7 → 166.3 ms, constant
expressions 211.6 → 215.8 ms. All measured output bytes match exactly. The
[raw performance report](reports/2026-11-02-adjacent-strings-performance.json)
preserves the mixed results without a general speedup claim.

All 263 full tests pass with zero skips in 70.2 s; fast passes 251 with
12 expected skips in 51.2 s. Gate durations are validation observations;
isolated compiler timings are recorded separately above.

Inventory: 84/164 match, 80 remain; 32 original failures closed, no regressions,
210 tracked Lite sources and no load errors. Next: trailing call commas and
remaining scope/statement forms. Broader literal grammar remains separate.

## Trailing call commas

Nonempty calls now admit one final comma without supplying an extra value.
Output/outputLine, scalar functions, admitted builtins and list end operations
share this contract. Output parsing drops the old rejection; function/builtin
loops check for `)` only after consuming a comma. List end operations share one
final-argument close helper. Calls without commas retain their emitted bytes.
Empty comma-only lists, doubled separators, wrong types and missing/excess
arguments still reject before artifact output or program effects.

Coverage includes nine TS/C programs and twelve TS function/aggregate/input
programs: zero/one/many outputs, Unit, literal joining/comments, comparisons,
branches, functions, nested operand effects, all four prompted input helpers,
text helpers, writable-list ends, display, stderr and exit. Thirteen rejection
sources cover separators, zero/required arities and list grants. Four runtime
fault executions compare exact status and streams. Two valid and one invalid
case run through both standalone parser drivers.

The original trailing-comma fixture moves to 001-001 without changing source
bytes. Corpus: 66 programs/27 rejections, still 93 sources. All 65 earlier program
artifact pairs remain identical. Both compiler corpora, 98 verifier executions,
coverage, strict host/seeds and nine editor groups pass. The
[generated-only ladder](reports/2026-11-02-trailing-commas-ladder.json) records
three identical TS generations and the TS-hosted C emitter.

Five paired compiler-phase medians remain steady: TS outputs 62.1 → 62.0 ms,
identical S 644.2 → 653.6 ms, constant expressions 128.5 → 127.6 ms;
C-emitter outputs 79.3 → 79.8 ms, divisions 167.7 → 170.7 ms, constant
expressions 210.7 → 214.5 ms. All measured output bytes match exactly.
Mixed small timing changes are recorded without a general speedup claim in the
[raw performance report](reports/2026-11-02-trailing-commas-performance.json).

All 264 full tests pass with zero skips in 78.9 s; fast passes 252 with
12 expected skips in 58.5 s. Gate durations are validation observations; paired
compiler timings are measured separately above.

Inventory: 85/164 match, 79 remain; 33 original failures closed, no regressions,
210 tracked Lite sources and no load errors. `exit()` still needs its existing
zero-argument contract (T00 exits zero; T11 rejects); this is recorded separately
from trailing separators. The remaining scope/statement forms are next.

## Batched TS artifact validation

Generated TS modules can now be strictly checked in one project, with one fresh
process runner per module. Every source keeps its own directory and module
scope; stdin bytes, argument values, streamed output, status and signals retain
the existing contracts. One checking failure prevents every module in the batch
from executing. The single-artifact API delegates to this path. No persistent
typecheck cache is involved.

Four recent compiler groups now batch their 81 TS modules into four checks;
their 133 execution contracts, including 52 native executions, remain in place.
Compile-time rejection assertions remain individual. Unit cases cover repeated
fresh state, raw stdin/Unicode args, independent module locations, cleanup after
success/throw, atomic checking failure and an empty batch.

The [paired report](reports/2026-11-02-artifact-batches-performance.json) runs the
same 66 precompiled corpus programs through both runners. Five alternating
paired fresh workers after a warm-up pair reduce median validation/execution
from 5877.2 to 3215.8 ms (1.83×). Every status, signal and stdout/stderr byte
matches fixture expectations in every sample. Emission and worker/module loading
are outside that timed phase; this measures the validation harness.

All 264 full tests pass with zero skips in 75.5 s; fast passes 252 with 12
expected skips in 51.0 s. These gate durations are observations, separate from
the controlled paired measurement. Strict host/seeds, both 93-case corpora,
98 verifier executions, coverage and nine editor groups pass. Exact assembled
TS/C source and generated seed hashes remain those of the trailing-comma slice;
both default compiler selections verify successfully. The measured language
inventory stays at 85/164 matching cases with 79 remaining.

## Statement scopes

Standalone lexical blocks now lower to explicit TS/C braces, using the existing
iterative block stack and local visibility filtering. Outer updates survive;
inner bindings disappear at the closing brace. Nested break/continue still
find their enclosing loop. This increment admits statement scopes over existing
forms; value-producing block expressions remain a separate gap.

The same change repairs shadowed initializers in existing if/loop scopes. A
single lookup now checks the current duplicate-admission rule and chooses a
fresh `lt_local_NAME_OFFSET` runtime identifier when an outer binding exists.
Initializers keep their resolved outer identifiers, avoiding TS self-reference
and C uninitialized reads. Traversal receivers use the same hygiene rule.
Names without a previous binding retain their emitted spelling. Same-block
redeclarations and broader callable/type namespaces remain separate work.

Coverage includes twenty TS/C programs, six TS function/aggregate programs,
nine rejected sources and five exact fault executions. Cases combine nesting,
mutation, prior-value reads, type changes, outer assignments, loop exits,
parameters, traversal receivers, List mutation and named tuple copies. Six strict
native UBSan programs compare exact status and streams. The canonical scope.locals
feature now executes on all three targets; verifier coverage rises to 100 target
executions across the same 78 scenarios. Both 93-case corpora pass, and all 66
older program artifact pairs remain identical.

The [generated-only ladder](reports/2026-11-02-statement-scopes-ladder.json)
starts with the previous seed and records three identical final TS generations.
The transitional compiler differs from the final seed because its first output
uses the older runtime naming rule. Every generation is strictly checked, and
the fixed point is byte-for-byte. The C emitter is still TS-hosted; native C
compiler self-hosting remains pending.

Five paired compiler-phase medians stay steady: TS outputs 64.1 → 63.2 ms,
identical S 690.9 → 692.6 ms, constant expressions 132.8 → 131.8 ms;
C-emitter outputs 82.8 → 81.3 ms, divisions 173.0 → 173.3 ms, constant
expressions 216.9 → 218.3 ms. Ordinary measured program bytes match. The
self-source outputs intentionally differ by hygienic identifiers and match the
strict transitional/final ladder hashes exactly. The [raw report](reports/2026-11-02-statement-scopes-performance.json)
records those distinctions without a general speedup claim.

All 265 full tests pass with zero skips in 94.1 s; fast passes 253 with
12 expected skips in 65.5 s. Strict host/seeds, coverage and nine editor groups
also pass. Gate durations are validation observations, separate from paired
compiler-phase measurements above.

Inventory: 87/164 match, 77 remain; 35 original failures closed, no regressions,
210 tracked Lite sources, no load errors. The existing static-function lookup
flaw after ordinary value shadowing is now explicitly retained in the queue.
The supplementary-character column discrepancy stays in the final diagnostic
audit while functional T00 dependencies are removed.

## Sequential value bindings

Ordinary value declarations can now shadow earlier values in the same block.
The initializer resolves against the preceding binding; subsequent reads and
assignments use the new binding's type and mutation permissions. The hygienic
runtime name introduced for statement scopes keeps these cells distinct on
both TS and C. Previous scalar and aggregate copies remain independent.
Function/type namespace replacement remains a separate gap, including the
recorded static-function lookup flaw and unsupported runtime-data captures.

The standalone checker retains sequential value symbols and validates the
latest local binding. Its symbol collector also traverses loop headers and
top-level assignments so those interacting cases reach local checking.
Duplicate parameters and unsupported duplicate callable/type symbols still reject.

Coverage includes sixteen TS/C programs, five TS function/aggregate programs,
seven rejected sources and four exact runtime fault executions. Three accepted
and one rejected source also compare reference/generated standalone checker
results. Six strict native UBSan programs preserve exact streams and status.
The duplicate-local fixture becomes an accepted silent program: the corpus
remains 93 cases, now 67 programs and 26 rejections. All 66 earlier program
artifact pairs remain identical.

The [generated-only ladder](reports/2026-11-02-value-shadowing-ladder.json)
records three identical, strictly checked TS generations. Removing the repeated
duplicate-admission guard and unused helper arguments shrinks each flat source
by 295 bytes and each generated compiler artifact by 532 bytes. The C emitter
is still TS-hosted; native C compiler self-hosting remains pending.

Five paired compiler-phase medians: TS outputs 62.4 → 64.6 ms, identical S
641.2 → 653.7 ms, constant expressions 128.1 → 128.1 ms; C-emitter outputs
81.2 → 80.4 ms, divisions 167.4 → 167.6 ms, constant expressions 213.0 →
214.6 ms. All measured emitted bytes match, including identical compiler source.
Timing changes are small and mixed; no general speedup is claimed. See the
[raw performance report](reports/2026-11-02-value-shadowing-performance.json).

Inventory: 88/164 match, 76 remain; 36 original failures closed, no regressions,
210 tracked Lite sources and no load errors. Expression statements and empty
item separators are next; broader namespaces remain explicitly queued.

All 266 full tests pass with zero skips in 98.1 s; fast passes 254 with
12 expected skips in 71.7 s. Strict host/seeds, both 93-case corpora,
100 verifier executions, coverage and nine editor groups also pass.

## Ordinary expression items

Expression items now evaluate in order and discard ordinary results silently in
scripts and action scopes. Both targets emit explicit discard evaluation, so
checked arithmetic and short-circuit faults are preserved. Empty separators
are admitted. In a function, separators after the final expression do not
change its result; the same result checker handles scalar/name/call/builtin
forms and admitted final conditional branches.

This also repairs incorrectly admitted non-Unit tails in Unit functions. They
now reject before effects. A valid Unit tail keeps its effects and suppresses
an implementation builtin's return payload, such as JavaScript Array.push's
length. Inert Unit literals are encoded separately for TS and C, avoiding a
TypeScript undefined token in discarded native expressions. Native functions,
aggregates and broader value blocks/conditionals remain pending.

Coverage includes fifteen TS/C programs, eighteen TS function/aggregate
programs, three input scenarios, thirteen rejected sources and six exact fault
executions. Four additional expression/separator sources run through both
standalone parser drivers; checker driver coverage also includes empty
separators and ordinary expressions. C explicitly rejects the TS-only cases.
The 93-case corpus stays at 67 programs/26 rejections. All 67 program artifact
pairs are unchanged. Four rejected-source models now identify the unknown name
or unterminated String at its source location, instead of rejecting the whole
expression statement form. Full consumer diagnostic parity stays queued.

The [generated-only ladder](reports/2026-11-02-expression-items-ladder.json)
records three identical, strictly checked final TS generations. Consolidating
five expression/call tail paths removes repeated parsing/checking code. The TS
source shrinks by 3518 bytes and artifact by 4604 bytes; the C source shrinks by
3421 bytes and artifact by 4421 bytes. First-character guards avoid scanning
unrelated keywords on ordinary item names.

Five paired compiler-phase medians: TS outputs 60.2 → 62.7 ms, identical S
642.3 → 635.6 ms, constant expressions 129.4 → 127.7 ms; C-emitter outputs
78.2 → 79.3 ms, divisions 165.8 → 165.8 ms, constants 211.0 → 214.3 ms.
Changes are mixed, including a small output-workload regression; no general
speedup is claimed. Ordinary measured program bytes match. Self-source output
changes by corrected Unit tail normalization and matches the strictly checked
transitional/fixed-point hashes. See the [raw performance report](reports/2026-11-02-expression-items-performance.json).

An additional type-admission flaw is retained in the fixed-array queue: T00
rejects a bare fixed-array tail for a List-returning function, whereas the
restricted frontend contextually treats it as a List. That distinction is not
claimed as fixed by ordinary expression-item support.

All 267 full tests pass without skips in 112.7 s; fast passes 255 with
12 expected skips in 78.4 s. These two gate runs overlap, so their durations
are validation observations rather than speed comparisons. Strict host/seeds,
both 93-case corpora, 100 verifier executions, coverage, nine editor groups and
six strict native UBSan programs also pass. Inventory: 89/164 match, 75 remain;
37 original failures closed, none regress, 210 tracked sources, no load errors.

## Function completion

Completion facts now belong to each lexical/control block. The parser saves the
parent state on entry, joins every conditional arm only after a final else, and
restores the parent on exit. A return in one arm no longer certifies an entire
function. Empty/declaration/assignment-only result arms and incomplete nested
return paths reject in Lite before artifact emission.

The owner requested comparing approaches instead of treating T00 as automatic
design authority. For this bounded slice, checking all ordinary source while
omitting proved unreachable instructions follows Lite's block-result and
control-transfer rules. A harmless ordinary tail after a definite return cannot
change the returned type. Unknown names, malformed expressions, incompatible
operators and explicit wrong-typed return payloads still reject, including on
dead paths. The strict TS settings stay unchanged. Broader warning/public Never
policies remain open in [the owning document](../docs/never-and-unreachable-flow.md).

Both emitters receive only live instructions. Closing/else markers are retained
for live openers, while parent liveness survives nested scopes and loop exits.
The TS emitter records an unreachable-completion assertion after a proved
return-through-loop: the assertion is never reached and lets the unchanged
strict host check verify a function whose loop condition uses Boolean(true).
Conditional/sequence loop zero/last-result lowering remains a separate gap;
reference acceptance alone did not make the old generated artifact runnable.

Coverage includes twenty TS function/completion programs, six TS/C transfer
programs, fifteen rejected sources and two exact TS fault executions. Cases
combine all-arm joins, partial/nested branches, early returns, Unit, tuples,
Lists, break/continue, dead source errors and retained fault/output order. C
explicitly rejects function sources. Six strict native UBSan cases verify the
scalar transfer/pruning contracts. All 67 earlier program artifact pairs remain
identical in both targets; the corpus stays at 67 programs/26 rejections.

Two new boundary probes independently reproduce earlier failures: an ordinary
unreachable String tail after return previously rejected, and a return through
an unconditional loop previously produced TS that failed strict checking. Both
now compile, strictly check and run with exact reference observations. Inventory:
91/166 match, 75 remain; 37 original failures closed, no regressions. The added
probes expand the denominator; they do not reduce the unchanged original-case
remaining count. All 210 tracked Lite sources remain accounted for.

The [generated-only ladder](reports/2026-11-02-branch-results-ladder.json)
records three identical final TS generations, equal to the transitional output,
with strict checks at every step. The compiler still uses the previously
supported source subset. Per-block completion/liveness increases TS source by
5963 bytes and artifact by 9675 bytes, C source by 5830 bytes and artifact by
9429 bytes. The C emitter remains TS-hosted; native C self-hosting stays pending.

Five paired fresh-process compiler-phase medians: TS outputs 71.9 → 75.2 ms,
identical S 686.5 → 674.9 ms, constants 143.6 → 142.0 ms; C-emitter outputs
85.5 → 85.2 ms, divisions 175.6 → 173.0 ms, constants 228.4 → 225.4 ms.
These ordinary workload changes are mixed, without a general speedup claim.
Their emitted bytes match exactly.

A separate matched-source workload places 1000 outputs after an unconditional
break. C-emitter time drops 66.8 → 46.2 ms and generated C shrinks from
123183 to 293 bytes. Both old/new C artifacts compile strictly and print exactly
7 followed by newline, matching T00. This measures compiler work and output
size, not native runtime speed. TS compiler time is 53.3 → 50.9 ms and artifact
size 92075 → 399 bytes; its older artifact fails the unchanged strict TS check,
so that TS timing is not a prior working-program baseline. Full raw source,
hashes, timings and separate strict/execution observations are in the
[performance report](reports/2026-11-02-branch-results-performance.json).

All 268 full tests pass without skips in 127.3 s; fast passes 256 with
12 expected skips in 89.3 s. Strict host/seeds, both 93-case target corpora,
100 verifier executions, coverage, nine editor groups and six native UBSan
programs also pass. Gate durations are validation observations; the paired
compiler measurements above ran without concurrent gates.

## Float literals and display

This migration slice ports existing T00 finite Float values: decimal/exponent
literals, unary signs, same-family comparisons/chains, scalar copies and display.
The frontend and standalone lexer share `src/numeric-literals.lts`; parser and
checker phases recognize the same Float token/type. Literal overflow rejects
before effects, using decimal comparison with the binary64 infinity midpoint
without requiring Float arithmetic in the compiler's source subset.

C display replaces default-precision %g with a shortest round-trip search and
the temporary TS runtime's decimal/exponent thresholds. Generated programs use
the C startup locale and check the binary64 double representation. Native C
functions, aggregates and input remain pending; this does not establish the
native compiler bootstrap. Mixed arithmetic/comparisons, width/storage
conversions and power remain existing T00 migration dependencies.

Coverage: nine TS/C value programs, five TS function/aggregate programs, a
256-value boundary/random display program on both targets, one input
short-circuit scenario, sixteen rejected sources and four exact fault
executions. Three phase drivers each compare three valid and two rejected
sources between reference/generated execution. Six generated native programs
pass address/undefined-behavior sanitizers. The production formatter body is
byte-identical to the independently tested 28401-value native probe.

The decimal and exponent fixtures move from rejection to program cases without
changing their source bytes: 69 programs/24 rejections, still 93 total. All 67
older program artifact pairs remain identical. Diagnostics now name Float among
admitted scalar expressions. The shared scanner caches source length, and a
single-digit Int fast path avoids general scanner/range work.

The [generated-only ladder](reports/2026-11-02-float-literals-ladder.json)
records three identical, strictly checked generations. Compiler implementation
source remains in the previously supported Int/String subset. The
[performance report](reports/2026-11-02-float-literals-performance.json) records
paired compiler measurements and exact emitted-output identities; mixed timing
changes are not a general speedup claim. The independent regular-file TS
capture fix and its three host groups remain intact.

Current scope follows the owner's migration priority: finish existing T00
replacement dependencies, including generated run/check and native gates.
The separately recorded tuple prototype-label defect stays in the migration
audit; it is not the next implementation detour.

The final full gate passes all 273 tests with zero skips in 142.0 s. The fast
gate passed 261 with 12 expected skips before the helper's source-length hoist;
the final full run repeats every case after that self-check correction. Strict
host/seeds, both 93-case corpora, 100 verifier executions, coverage, nine editor
groups and six generated native sanitizer cases pass. Inventory: 92/166 match,
74 remain, 38 original failures closed, no observed regressions, 211 tracked
Lite sources and no load errors.

Final paired compiler-phase medians are mixed: TS outputs 64.9 → 66.7 ms,
identical S 693.5 → 705.5 ms, constants 133.1 → 127.1 ms, dead-output input
44.2 → 44.8 ms; C-emitter outputs 85.5 → 85.1 ms, divisions 169.7 →
166.1 ms, constants 218.7 → 218.1 ms, dead-output input 45.5 → 45.2 ms.
All measured output bytes match. Next: existing T00 mixed Float arithmetic
needed by the remaining sample programs.

## Mixed Float arithmetic and comparisons

This slice ports existing finite binary64 `+`, `-`, `*` and `/`, including mixed
Int/Float operands. Each mixed operand converts at the operation; Int-only
arithmetic stays checked Int64. Floating division rejects either sign of zero,
and non-finite results raise positioned ArithmeticPanic diagnostics only when
executed. Underflow to a finite value or zero remains allowed. Float remainder
and floor operators still reject. Numeric widths, contextual conversions and
power are separate ports; this does not select future division/storage semantics.

Mixed comparisons convert each adjacent pair independently. Original Int values
remain available for later Int-only pairs in a chain, preserving exact comparison
above 2^53. TS expression scopes and typed C comma-expression temporaries evaluate
operands once, left to right, and retain lazy later chain operands. Float
arithmetic reuses the existing source-position table and fault reporting.

The canonical [num.float case](../language/verifications/features/num-float.json) runs on
T00 and both generated targets. Nine previously rejected lesson manifests now
also select TS/C explicitly. Focused host coverage includes eleven TS/C programs,
four TS function/aggregate programs, eleven fault sources on both targets, nine
rejected sources and a prompted mixed-input scenario. Six optimized native
programs check values, conversion, skipped faults and competing faults under
address/undefined-behavior sanitizers. C functions/aggregates/input still reject
explicitly; native compiler self-hosting remains pending.

C literal parsing now uses a discovered `lt_float_literal` wrapper, ensuring its
stdlib dependency even when a Float appears only inside a Bool comparison. This
keeps the existing helper scan's fast rejection path for integer-only code.
Int comparisons likewise keep their ordinary path ahead of Float-specific work.
The [generated-only ladder](reports/2026-11-02-float-arithmetic-ladder.json)
records the source/builder identities, fixed point and validation results; the
paired performance record retains measurements rather than assuming a speedup.

Final validation: 274/274 full tests pass without skips (149.7 s); fast
262 pass/12 expected skips (103.9 s). Strict host/seeds, both 93-case
corpora, 121 verifier executions, 39-feature coverage and nine editor groups pass.
Inventory: 103/167 match, 64 remain; 48 original failures closed, no regressions.
All 20 implemented lessons pass generated TS. All 69 existing TS fixture hashes
and 67 C hashes stay unchanged; only two C Float-literal artifacts acquire the
parser wrapper. The [paired performance report](reports/2026-11-02-float-arithmetic-performance.json)
records mixed medians: TS outputs 67.2 → 70.1 ms, identical S 721.2 → 728.1 ms,
constants 144.7 → 129.9 ms and dead-output input 46.5 → 44.2 ms; C-emitter
outputs 87.9 → 89.6 ms, divisions 191.5 → 183.2 ms, constants 244.5 → 246.3 ms
and dead-output input 49.6 → 48.8 ms. Every measured output stream matches.

## Power checkpoint

The Lite frontend now implements existing `**` syntax at precedence 25, above
multiplication and below the explicitly grouped unary boundary. Power associates
right to left, accepts Int/Float operands, and produces Float. Both operands
evaluate once from left to right, including nested right-associated calls.
The existing positive-exponent checkpoint remains: zero and negative exponents
raise positioned ArithmeticPanic only when reached, as do non-finite results.
This does not decide their final language semantics. TS uses Math.pow; C uses
the C math library's pow. Managed native runners link `-lm` after the source;
manual C builds must link the math library where required.

Explicit negative-base grouping remains mandatory. Lite rejects a leading `+`
that conceals an ungrouped minus, such as `+-2 ** 2`, as the selected syntax
requires. T00 still admits those forms. This documented reference discrepancy
does not change the selected rule or require a T00 implementation update.
The standalone parser enforces the same boundary; the standalone checker
recognizes Float power results in local annotations and explicit returns,
including negated/grouped powers. General implicit-tail checking in that phase
remains outside this slice; the generated frontend checks those function tails.

Focused coverage includes nine TS/C value programs (including decimal bases and
fractional exponents), three TS function/aggregate/effect programs, nine fault
sources on both targets, fifteen malformed/type/grouping rejections, three
concealed-minus rejections and one prompted input scenario. Parser drivers
compare three admitted/four rejected forms; checker drivers compare three
admitted/two rejected types between reference and generated execution. Six native
programs pass optimized address/undefined-behavior sanitizer checks.

The canonical num.power manifest now selects T00, TS and C explicitly. The
[generated-only ladder](reports/2026-11-02-power-ladder.json) records three
matching generations without using power operations in S. The operator reader
recognizes `*`/`**` before comparison-token probes, preserving a short common
path; paired measurements and unchanged-output checks are recorded separately.
Exhaustive libm/host rounding boundaries, numeric-width conversions and final
power fault semantics remain later work, not blockers for the Lite default
workflow migration.

All 276 full tests pass with zero skips (161.0 s); fast passes 264
with 12 expected skips (109.8 s). Strict host/seeds, both 93-case
corpora, 123 verifier executions, 39-feature coverage, nine editor groups and
six optimized native sanitizer cases pass. Three generated generations match.
Inventory: 105/167 matching, 62 remaining; 50 original failures closed, none
regress. All 69 earlier TS/C fixture pairs remain byte-identical.

Paired medians remain mixed: TS output 84.1 → 83.7 ms, identical S 805.5 →
809.9 ms, constants 145.4 → 147.4 ms and dead-output input 54.1 → 48.3 ms;
C-emitter output 85.0 → 85.3 ms, divisions 169.6 → 171.3 ms, constants
215.7 → 213.5 ms and dead-output input 45.1 → 44.8 ms. All measured output
streams match. The [performance record](reports/2026-11-02-power-performance.json)
contains raw pairs and identities; no general speedup is claimed.

## Numeric type synonyms

The shared Lite numeric spelling helper maps Int64 to Int and Float64/Double
to Float. Existing canonical names retain their ordinary frontend path. The
frontend normalizes names in scalar annotations, user-alias targets, tuple fields,
List elements and function signatures. Parser/checker phases share the mapping
and normalize built-in synonyms without changing tuple labels or user-alias
names. This adds no storage conversion, arithmetic width or runtime wrapper.
A focused scalar program emits identical TS/C bytes using synonyms or canonical
names; all earlier corpus artifacts likewise remain unchanged.

The canonical [num.aliases case](../language/verifications/features/num-aliases.json)
selects T00, TS and C. Focused coverage includes eight TS/C programs, five TS
function/tuple/List programs, twelve type/range rejections, four exact positioned
fault executions and a prompted input scenario. Parser/checker drivers each
compare three admitted sources; the checker also compares three rejected sources.
Six native programs check scalar values, zero initialization, user aliases, loops
and arithmetic faults with optimized address/undefined-behavior sanitizers.

Integer-literal admission in a Float storage context is a separate core gap.
The retained `numeric.float-integer-literal` probe shows T00 accepting
`f: Float = 2; outputLine(f);` while generated Lite still rejects it. Its addition
increases the measured denominator rather than hiding the missing behavior.
That literal-context port follows this name-normalization slice; narrow widths
and exhaustive promotion/rounding matrices remain later work. The
[generated-only ladder](reports/2026-11-02-numeric-aliases-ladder.json) records
the fixed point without adopting these type spellings in S.

All 278 full tests pass with zero skips (166.3 s); fast passes 266
with 12 expected skips (119.7 s). Strict host/seeds, both 93-case
corpora, 126 verifier executions, coverage of 40 registered features, nine editor
groups and six native sanitizer cases pass. Three generated generations match,
and all 69 earlier TS/C fixture pairs remain unchanged. Inventory: 108/169
matching, 61 remaining, 52 original failures closed, no observed regressions.
The new alias feature adds one passing case, while the retained Float-literal
context probe adds one failing case; both contribute to the new denominator.

The [paired performance report](reports/2026-11-02-numeric-aliases-performance.json)
records close/mixed medians: TS output 63.9 → 64.9 ms, identical S 704.6 →
704.1 ms, constants 128.6 → 127.7 ms and dead-output input 44.6 → 44.0 ms;
C-emitter output 85.0 → 82.8 ms, divisions 163.5 → 167.8 ms, constants
211.4 → 209.2 ms and dead-output input 44.0 → 44.3 ms. All measured output
bytes match; no general speedup is claimed.

## Float literal contexts and braced values

The generated TS frontend now admits exactly representable Int64 literals into
Float declarations, assignments, calls and results, including admitted grouping,
direct negative literals and typed tuple/List constructors. Established Int
values and Int-only binary results retain their types. Integer exactness uses
at most ten divisions by two and never negates Int64.MIN. The scalar checker
phase shares that exactness predicate; its aggregate contextual inference remains
less complete than the production frontend.

Expected types apply to a complete value, so `(2) + 3` stays Int arithmetic and
`(9007199254740993) + 0.5` retains the permitted mixed arithmetic conversion.
Group lookahead and actual Float function-tail detection keep contexts away from
binary operands and discarded statements. Ordinary dead statements after return
do not become results, preserving the earlier owner-selected completion rule;
T00 still applies its Float result context to one such dead literal.

Related probes established two existing braced-value bugs in the previous seed:
the parser could skip the first branch character, and a binary operator could
attach across a directly closed braced item. Branch parsing now starts immediately
after its consumed opening brace, and the closing brace ends that expression.
An author can group a braced value to combine it with an operator. These fixes
preserve the existing statement-boundary rule rather than selecting new syntax.

Coverage includes ten shared scalar programs, fourteen generated TS
function/aggregate/conditional programs, twenty rejected sources, six exact
positioned fault executions and an explicit dead-statement completion case.
The scalar checker compares five admitted/six rejected sources between reference
and generated drivers. The canonical
[num.float-context case](../language/verifications/features/num-float-context.json) and
two retained boundary probes supplement the previously failing literal probe.
The [ladder](reports/2026-11-02-float-contexts-ladder.json) records pre-fix evidence,
three matching generated self-builds and the exact validation scope.

Owner update during this slice: migration is now TS-first and artifact-based;
C output/native work follows T00 retirement. The C snapshot and native cases
already obtained before that update are retained as evidence, not retirement
gates. Subsequent work removes the public run command and migrates production
check/verification/test consumers to generated TS artifacts.

Validation: 280 full-suite groups, 271 passed and nine native-only skips in
126.3 s; fast 268 passed/12 expected skips in 129.5 s. All TS source sweeps,
strict host/seeds, three generated self-builds, the 93-case TS corpus, coverage
and nine editor groups pass. Current inventory: 112/172 matching, 60 remaining,
52 original failures closed and no observed regressions. The literal probe and
new canonical/boundary cases account for the progress and denominator change.

The [TS paired timing record](reports/2026-11-02-float-contexts-performance.json)
shows mixed medians: output 66.0 → 62.9 ms, identical S 745.8 → 767.4 ms,
constants 131.6 → 135.5 ms and dead-output input 44.5 → 44.6 ms. Every measured
output stream matches. C timing/output/native gates are deferred under the
latest owner direction; earlier C snapshot evidence is retained.

## Generated-only routine tooling

- 2026-11-03: w3 completes generated-only routine tooling. Self-build strictly checks three named generations and records real source/builder identities; corpus validation checks 93 compiler contracts and 69 TS runtime scenarios against recorded expectations. Benchmarking records generated process/load/compile/check/runtime phases with three samples and one excluded warmup. Old T00 audit programs are preserved byte-for-byte apart from routing comments and require --reference. Five CLI regression groups include absent T00/Git, malformed inputs, wrong compilers and a legitimate changed-source fixed point. Fast: 124 pass/12 skips; ordinary and no-T00 full: 127 pass/nine native skips, zero failures. Reference 162/162, nine editor groups, strict checks and both corpus routes pass. Source/seed remain unchanged; the canonical audit is still 60/81 with 21 visible pending ports. See [evidence](reports/2026-11-03-generated-tooling.json), [tool guide](bootstrap/README.md) and [baseline](../benchmark/reports/2026-11-03-generated-compiler-performance.md).

The generated ladder names outputs generation-1 through generation-3 and keeps historical T11/T12 builder meanings in the preserved reference route. A fixed point is not a conformance oracle: supplied candidates and changed-source refreshes require the separate recorded-contract corpus gate before seed acceptance. Benchmark self-build output is independently validated on that corpus before timed hashes are compared. No generated seed or old measurement is rewritten.
