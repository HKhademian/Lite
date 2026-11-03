# Generated compiler gaps and progress

Owner direction, 2026-11-02: continue topic by topic, with an atomic commit for
each verified slice. Improve compiler speed where measurements support a change;
keep correctness, source readability and reproducible bootstrap routes intact.
This tracker covers the T00 replacement goal, including newly discovered flaws.

Latest owner direction prioritizes TS migration over independent correctness
work. Public run is removed; compile and execute artifacts. Keep self-hosted TS
rebuilds/fixed points throughout. T00 remains an explicit reference until TS
features and consumers migrate. C output/native work and advanced edge audits
follow retirement. See the [transition order](transition-plan.md#implementation-order).

## Immediate migration priorities

Latest owner direction: switch to the Lite-written TS compiler as quickly as
possible, keep its generated self-build/fixed point, remove public run, and
execute compiled artifacts. C output/native work is post migration and does not
block TS default use or T00 retirement. This supersedes the older native-first
retirement ordering.

1. Switch public compile/check and ordinary verification/test consumers to
   generated TS artifacts; remove public run. Retain T00 only as an explicit
   reference while the remaining TS ports land.
2. Port the missing ordinary binding/storage, tuple/array/List, call/function and
   block/conditional/loop/match/cleanup forms. All 20 implemented lessons and
   eight library tests already run on generated Lite; eight examples remain.
3. Make every supported feature compile and execute from a TS artifact, then
   remove active T00 dependencies and complete the clean-checkout audit.
4. Resume C output and native self-hosting after the TS migration. Advanced
   correctness/edge matrices remain separate from the urgent compiler switch.

## Measured checkpoint

The [current inventory](reports/current-t00-t11-inventory.md) and
[raw observations](reports/current-t00-t11-inventory.json) use the generated
seed `77cacbac…`. All inputs compile/check against the current reference, both
execution paths use identical anonymous diagnostic naming, and raw-byte input
probes follow the real CLI's lazy strict UTF-8 decoding. Historical reports stay
unchanged. Refresh with `node compiler/scripts/t00-t11-inventory.ts --large-sources`.

- Canonical features: 28/41 match; 13 rejected.
- Examples: 11/19 match; 8 rejected.
- Implemented samples: 20/20 match; none rejected.
- Isolated boundary probes: 45/84 match; 39 rejected; no differences among accepted probes.
- Library tests: 8/8 match. All 214 tracked Lite sources are accounted for;
  compile-only acceptance is distinguished from executed parity.
- Total executed source cases: 112/172 match, 60 still fail. Compared with the
  original inventory, 52 previously failing cases now match and none regress.
  New canonical cases and isolated probes explain denominator changes. The
  Float integer-literal probe now passes; two new braced-value boundary probes
  preserve corrected old behavior. Original-case progress is unchanged at 52
  closures because these three probes were added after the original inventory.


These counts describe measured programs. Several failing cases share one cause;
a passing broad case can still contain unsupported forms. The detailed report
lists every remaining case and exact first diagnostic. Consumer migration is additional work, so this is not an overall completion
percentage. Native C is a separate post-migration milestone.

## Closed slices

- [x] Default verification and expectation updates to TS artifacts, with explicit
  --reference for T00 and no C execution. Canonical TS audit: 60/81 scenarios
  pass, 21 fail visibly; T00 reference: 81/81 pass. Supported verification and
  updates work with T00 absent. Full current regressions: 274 pass, nine native
  skips, zero failures. Three generated self-build generations retain the exact
  selected seed. Default regression routing still needs migration.

- [x] Remove public run; default compilation to TS artifacts and migrate check
  to generated compilation plus strict artifact checking without effects.
  Public C output is explicitly deferred. Full current suite: 273 pass, nine
  native-only skips, zero failures; verifier/default test routing still pending.

- [x] Make T11 the default TS compiler and compile the C emitter through T11.
- [x] Preserve nested output effects and argument order.
- [x] Migrate maintained report calls to outputLine; implement selected
  output/input helpers on generated TS, including strict incremental UTF-8,
  admitted aggregate display, and streamed output before faults.
- [x] Move full-source lexer/parser/checker sweeps to generated TS drivers.
- [x] Check dynamic Int64 addition, subtraction, multiplication and negation in
  TS and portable C11, with exact overflow faults and evaluation order.

## Topic queue

Work the next applicable topic, verify its interacting features, regenerate
seeds when needed, record speed measurements, and commit before independent work.
Keep dependencies explicit; split a topic further when its contracts warrant it.

- [x] **Integer division family:** exact positioned faults, MIN/-1 remainders,
  single evaluation and left-to-right fault ordering on TS/C.
- [x] **Helper-scan performance:** collect needed target helpers once per
  program; verify exact artifacts and paired throughput.
- [x] **Bounds faults:** positioned text/list diagnostics and retained output;
  supplementary-character column units are tracked separately.
- [ ] **Unicode diagnostic columns:** a same-line supplementary character counts
  as one source offset in Lite and two UTF-16 units in T00. Defer this isolated
  compatibility discrepancy to the final diagnostic audit while closing functional
  T00 dependencies; broader Unicode work is outside this migration step. Keep
  existing String/input behavior and retain explicit column cases when resolved.
  Earlier runtime parity probes put supplementary source characters on preceding
  lines, so their passing results do not cover this difference.
- [x] **Equals-token discrimination:** parenthesized inequality and bare
  function tails stay comparisons; assignment and tuple fields still work.
- [x] **Comparison chains:** adjacent comparisons over admitted scalar types,
  middle-operand single evaluation and short-circuiting on TS/C. Broader Float
  ordering remains in the Float topic.
- [x] **Empty scripts:** empty, whitespace-only and nested/raw-comment-only
  scripts compile silently on TS/C; malformed comments still reject.
- [x] **Statement boundaries:** optional final semicolons, closing-scope and
  directly closed-block boundaries; reject missing separators between simple
  items in both generated frontend and standalone parser drivers.
- [x] **Adjacent String literals:** concatenate decoded literal tokens across
  whitespace/comments before expression parsing; encode the joined value once
  in both frontend and standalone parser.
- [x] **Trailing call commas:** nonempty output, function, builtin and list-end
  calls accept one final comma; empty comma-only lists, doubled commas, wrong
  types and missing/excess arguments still reject.
- [x] **Statement scopes:** lexical blocks, outer assignments and restoration;
  hygienic names preserve outer values during shadowed initializers, including
  existing if/loop scopes and TS traversal receiver bindings.
- [x] **Sequential value bindings:** same-block declarations create fresh bindings;
  initializers read the previous binding, copies retain values, and later uses
  obey the newest type and mutation permission. Callable/type namespaces remain queued.
- [x] **Script expressions:** discard ordinary expression values while retaining
  evaluation, effects and faults; accept empty item separators.
- [x] **Function completion:** keep completion facts per block, join all conditional
  arms, reject reachable missing results before artifact output, and validate
  unreachable items while omitting their instructions. Retain early returns and
  source errors in dead code; broader Never and loop-result behavior remain queued.
- [x] **Deferred arithmetic faults:** constant arithmetic must fault only when
  reached; dead branches and short-circuit operands must remain unevaluated.
  Valid constant folding remains; invalid arithmetic executes only when reached.
- [x] **Float literals and values:** shared finite decimal/exponent scanning,
  unary signs, same-family comparisons, scalar copies and round-trip display on
  TS/C. Broader arithmetic and numeric-width conversions remain separate.
- [x] **Mixed Float arithmetic/comparisons:** binary64 operations, pairwise
  Int conversions, single evaluation, skipped faults and finite-result checks.
- [x] **Power checkpoint:** right-associative Float-default power, explicit
  negative-base grouping, positive exponents, lazy faults and TS/C lowering.
  Final signed-exponent semantics and exhaustive libm rounding are later work;
  unselected contextual division/storage semantics are not migration dependencies.
- [x] **64-bit numeric synonyms:** Int64=Int and Float64=Double=Float across
  admitted scalar, alias, tuple, List and function contracts.
- [x] **Float literal contexts:** exactly representable integer literals in
  admitted Float storage/call/result and aggregate contexts. Established Int
  values and Int-only binary results retain their types; brace boundaries and
  actual function tails preserve the context.
- [ ] **Numeric widths:** narrow types, promotion, lossless widening, checked
  narrow results and Float32 rounding; exhaustive matrices follow the cutover.
- [ ] **Block and conditional values:** statement-bearing blocks, Unit tails,
  partial defaults and false-branch no-write assignments. Function completion
  checking over currently admitted statement forms is recorded separately below.
- [ ] **Tuple shapes:** unnamed/mixed/unit/singleton tuples, shorthand fields,
  positional reads, destructuring, receiving-label conversion and display.
  Preserve ordinary labels independently of JS object syntax: T00 prints 7 for
  `p := (__proto__ = 7); outputLine(p.__proto__);`, while generated TS currently
  prints [object Object]. Tuple construction/default lowering needs computed
  property keys for the special prototype-setter spelling.
- [ ] **Fixed arrays:** inferred/explicit extents, function contracts, aliases,
  copies and indexed/sequence access. Keep array/List distinctions in function
  tails: T00 rejects `f := fn(): List<Int> { [1, 2] }` as an array result,
  while T11 currently contextually admits it as a List.
- [ ] **Mutability and lists:** inferred mut/var mut, front operations,
  List<Unit>, all end operations and copy contracts.
- [ ] **Storage and updates:** compound assignments, zero initialization,
  reserved storage and first whole-value writes.
- [ ] **Call routing:** named/positional/shorthand arguments, replacement of
  earlier contributions and trailing argument forms.
- [ ] **Function values and environments:** static function lookup must respect
  later ordinary value shadowing: `f := fn(): Int { 1 } f := 2; outputLine(f());`
  currently prints 1 on T11 while T00 rejects before effects. Compatible copies/replacement,
  nested helpers, live captures and distinct escaped environments. Also reject
  surrounding runtime-data capture where the current reference rejects it: T00
  rejects `var x := 2; reader := fn(): Int { return x; }`, while T11 currently
  accepts it. Keep admitted helper references distinct from unsupported data capture.
- [ ] **Never-valued exit:** preserve the reference's Never result in value
  contexts. T00 rejects `Unit == exit(3)` before effects, while the current TS
  frontend treats exit as Unit and accepts it. Conversely, an Int-returning
  function whose tail exits needs the supported bottom-type flow contract.
- [ ] **Traversal forms:** unnamed item bindings and consistent scope.
- [ ] **Loop values and exits:** value/then completion, metadata, payloads,
  tagged break/continue and the reference's supported tagged returns. A final
  conditional loop must produce its selected zero/last value when it does not
  return: T00 prints 0 for `f := fn(flag: Bool): Int { loop flag { return 1; } }
  outputLine(f(false));`. The earlier generated compiler accepted this but emitted
  a function that failed strict TS checking. Completing loop-result lowering is
  separate from proving statement-block returns.
- [ ] **Cleanup:** construct-level finally and exit/fault interactions.
- [ ] **Match:** supported subjectless Boolean selection and combinations.
- [ ] **Other existing builtins:** audit and port remaining reference helpers,
  including inputWord and default-argument `exit()` (T00 exits zero; T11
  currently requires one argument); preserve the selected six-helper public contract.
- [ ] **C target parity:** functions, aggregates/copies, text/input, control
  flow and complete runtime/memory support. Audit TS-only acceptance explicitly.
- [x] **C output argument faults:** `var zero := 0;
  outputLine("prefix", 1 / zero);` must evaluate arguments before printing any
  part of the call. C now matches T00/TS and prints no partial call on a fault.
- [ ] **Native C ladder:** C11, historical-node equality and cross-host fixed
  points, strict native compilation, boundary cases and clean rebuilds.
- [x] **Inventory provenance:** report HEAD as the base revision when auditing
  uncommitted compiler changes; retain actual artifact/source hashes and record
  worktree state rather than labeling HEAD as the complete audited snapshot.
- [ ] **Consumers (early default gate):** generated check/run and ordinary
  verification/regression consumers, source names/line maps and rejection before
  effects. Keep full diagnostic edge parity in the later conformance audit.
- [ ] **Retirement:** dependency scan, reproducible recovery from Git history,
  clean-checkout gates, remove active T00, then repeat the gap/flaw audit.

The queue ports existing contracts. Unselected language semantics remain open;
do not invent them to make a test pass. Newly found gaps enter this list before
completion can be claimed.

## Performance and validation

Keep matched before/after workloads and exact input/artifact identities per
compiler slice. Separate fresh-process startup, compiler execution, strict
typechecking and generated-program runtime. Do not trade away checks to improve
timings, and do not claim a speedup from noisy or concurrent runs.

Recorded earlier improvements: text scanning's bounded code-point cache gives
23.91× lower process time for the 1,000-statement workload; generated full-source
sweeps reduce the full gate from 580.6 s to 47.6 s. Those are historical paired
measurements. The checked-arithmetic checkpoint passes all 253 full tests with
zero skips in 54.6 s, both 93-case target comparisons, all 95 canonical target
executions, nine editor groups, strict host/seed checking and native overflow
sanitizer probes. This inventory-only refresh changes no compiler code.

Division-family slice: 71/162 cases now match; only the two bounds diagnostic
probes differ among accepted programs. The [paired speed report](reports/2026-11-02-division-performance.json)
records the same source at 922.5 → 922.8 ms median self-compilation, and the
1,000-output workload at 95.6 → 102.4 ms (five paired samples, compiler phase).
The extra scan cost is recorded for the next performance slice; no speedup is
claimed here. MIN%-1 now returns zero in the shared core and both generated
targets; division faults match source names, positions, streams and status.
The final stable-snapshot full gate passes all 255 tests, with zero skips, in
52.3 s; fast is 244 pass/11 expected skips. Strict host/seeds, both 93-case
corpus comparisons, 95 verifier executions and nine editor groups also pass.

The subsequent [single-pass helper scan](reports/2026-11-02-helper-scan-performance.json)
reduces compiler-phase medians from 100.0 to 60.4 ms for 1,000 output statements
and from 899.0 to 649.8 ms for identical compiler source, with exact emitted
bytes in all five paired samples. Current seed: `c25922d7…`; the preceding
inventory remains the measured behavior snapshot, with unchanged case counts.
Paired C-emitter medians also improve: 133.0 → 81.0 ms for 1,000 outputs and
238.5 → 170.9 ms for 200 dynamic divisions. All measured emitted outputs match
exactly. The no-helper fast path removes the initial output-only C slowdown.

The C output-order slice closes the discovered native prefix-on-fault flaw.
Multi-value calls evaluate once before writing; single-value emitted C stays
identical and skips unused temporary names. Fourteen focused programs and six
sanitizer cases cover faults, prior output, scopes/loops, empty/Unit/mixed values
and name hygiene. TS S/seed/artifacts are unchanged, so the TS inventory remains
71/162 with 91 failing cases. All 256 full tests pass with zero skips in 48.5 s;
fast 244 pass/12 expected skips, strict checks, both 93-case target comparisons,
all 95 verifier executions and nine editor groups also pass. The paired C-emitter
timings are steady within noise: 78.8 → 79.6 ms for 1,000 single-value outputs;
185.7 → 181.7 ms for 200 multi-value outputs. Next: positioned bounds diagnostics,
followed by comparison parsing.

Positioned bounds faults pass 30 focused runtime executions. All 257 full tests
pass with zero skips in 47.3 s; fast 245 pass/12 expected skips, strict checks,
both 93-case corpora, 95 verifier executions and nine editor groups pass. The
inventory improves to 73/162 matching cases, 89 remaining, with no observed
accepted-source runtime differences in that finite corpus. Source-column units
for supplementary characters remain separately pending; no parity claim includes
that unresolved case. Paired TS compiler medians: 60.2 → 59.4 ms for 1,000 outputs,
628.3 → 646.2 ms for identical compiler source. C-emitter medians stay steady:
80.0 → 79.9 ms for 1,000 outputs, 166.8 → 164.3 ms for 200 divisions.

Inequality-token discrimination passes 12 TS programs, seven native C programs
and ten rejection checks. All 258 full tests pass with zero skips in 47.3 s;
fast 246 pass/12 expected skips, strict checks, both 93-case corpora, all 95
verifier executions and nine editor groups pass. Existing corpus artifact bytes
are unchanged. Inventory: 75/163 match, 88 reject; the new function-tail probe
also passes. Paired TS medians: 63.2 → 62.9 ms for 1,000 outputs, 634.8 → 647.0 ms
for identical S. C-emitter medians: 80.4 → 85.9 ms for 1,000 outputs,
174.6 → 174.4 ms for 200 divisions. Mixed timing changes are recorded without a
speedup claim. Next: deferred arithmetic faults before comparison chains.

Deferred constant faults pass fourteen expression families, 56 skipped fault
sites, six static rejection checks and sixteen native sanitizer programs. All
259 full tests pass with zero skips in 53.4 s; fast 247 pass/12 expected skips,
strict checks, both 93-case corpora, 95 verifier executions and nine editor
groups pass. Six original sources now model runtime faults, yielding 61 program
and 32 rejection fixtures; all 55 older valid program artifact hashes stay
unchanged. Final staged-path inventory: 209 Lite files, no load errors,
77/163 matching cases, 86 rejecting, 26 original failures closed, no regressions.
Source shrinks by 3029 bytes and the TS compiler by 5045 bytes after removing
eight obsolete eager-failure wrappers. Paired throughput stays steady (see the
[raw measurements](reports/2026-11-02-deferred-faults-performance.json)).
Comparison chains are next; supplementary-character column units remain pending.

Comparison chains close the adjacent-pair probe and add one canonical generated
feature: 79/164 cases match, 85 remain, 27 original failures closed, no regressions.
All 260 full tests pass with zero skips in 49.4 s, both 93-case corpora, 98 verifier
executions, strict checks, coverage and nine editor groups pass. Nine native
UBSan programs match exact status/streams. Existing 61 corpus artifact pairs
are unchanged. Paired medians remain steady with mixed small timing changes;
see the [chain performance report](reports/2026-11-02-comparison-chains-performance.json).
The decisions example next exposes a semicolon-free value-if declaration gap.
Next topic: script/lexical forms, starting with empty scripts.

Empty-script support: 81/164 match, 83 remain; 29 original failures closed and
none regress. All 261 full tests pass without skips in 52.2 s; fast passes
249 with 12 expected skips in 32.5 s. Both 93-case corpora, 98 verifier executions,
coverage, strict checks and nine editor groups pass. The corpus is now 63
programs/30 rejections; 61 older artifact pairs are unchanged. Source and seed
size shrink slightly, while paired throughput stays steady. See the
[empty-script ledger](parity.md#empty-script-support).

Statement boundaries: 83/164 match, 81 remain; 31 original failures closed and
none regress. The decisions example and final-semicolon probe now match. All
262 full tests pass without skips in 63.4 s; fast passes 250 with 12 expected
skips in 39.6 s. Strict checks, both 93-case corpora, 98 verifier executions,
coverage and nine editor groups pass. Corpus: 64 programs/29 rejections; the
63 earlier artifact pairs are unchanged. Shared boundary handling removes six
duplicate trivia scans; paired compiler throughput stays steady with mixed small
changes. The standalone parser's reference/generated drivers also cover nine
valid and five rejected boundary sources. See the [boundary ledger](parity.md#statement-boundaries).
Next: adjacent String literals, then trailing call commas and remaining scope forms.

Adjacent String literals: 84/164 match, 80 remain; 32 original failures closed
and none regress. All 263 full tests pass with zero skips in 70.2 s; fast passes
251 with 12 expected skips in 51.2 s. Strict checks, both 93-case corpora,
98 verifier executions, coverage and nine editor groups pass. Corpus: 65
programs/28 rejections; all 64 earlier artifact pairs remain identical. Literal
pieces are decoded in one scan and encoded once. Paired compiler throughput
stays steady with mixed small changes; see the [literal ledger](parity.md#adjacent-string-literals).
Next: trailing call commas, then remaining scope/statement forms.

Trailing call commas: 85/164 match, 79 remain; 33 original failures closed and
none regress. All 264 full tests pass with zero skips in 78.9 s; fast passes
252 with 12 expected skips in 58.5 s. Strict checks, both 93-case corpora,
98 verifier executions, coverage and nine editor groups pass. Corpus: 66
programs/27 rejections; all 65 earlier artifact pairs stay identical. Paired
compiler throughput remains steady; see the [comma ledger](parity.md#trailing-call-commas).
Default-argument exit() remains a separately verified builtin gap. Remaining
scope/statement forms and broader type/control/native/consumer work stay queued.

Validation-harness performance: four recent groups batch 81 strict TS module
checks into four projects and retain all 133 execution contracts (52 native).
The same 66 precompiled corpus programs validate/run in 5877.2 → 3215.8 ms median
(1.83×), with exact fixture observations across five paired fresh samples.
All 264 full tests pass without skips in 75.5 s; fast passes 252 with 12 expected
skips in 51.0 s. Strict checks, both 93-case corpora, 98 verifier executions,
coverage and nine editor groups pass. Compiler source/seed identities and the
85/164 inventory are unchanged. See the [harness ledger](parity.md#batched-ts-artifact-validation).
Next: remaining scope/statement forms and the verified default exit() gap.

Statement scopes: 87/164 match, 77 remain; 35 original failures closed and none
regress. All 265 full tests pass with zero skips in 94.1 s; fast passes 253 with
12 expected skips in 65.5 s. Strict checks, both 93-case corpora, 100 verifier
executions, coverage and nine editor groups pass; six native sanitizer programs
match exact streams/status. All 66 older program artifact pairs remain identical.
The new canonical scope targets and hygiene repair close two original cases.
Paired compiler throughput stays steady; self-source output changes by runtime
identifier hygiene and matches the strict ladder hashes. See the [scope ledger](parity.md#statement-scopes).
Next: same-block value bindings and ordinary expression statements; static
function/value lookup and broader type namespaces remain explicitly queued.

Sequential value bindings: 88/164 match, 76 remain; 36 original failures closed
and none regress. The corpus now has 67 programs and 26 rejections; all 66 older
program artifact pairs stay identical. Six native UBSan programs pass. Compiler
source shrinks by 295 bytes and each generated artifact by 532 bytes; paired
throughput has small mixed changes, with no general speedup claim. See the
[shadowing ledger](parity.md#sequential-value-bindings). Next: ordinary expression
statements and empty item separators; callable/type shadowing remains separate.
All 266 full tests pass with zero skips; fast passes 254 with 12 expected
skips. Strict checks, both corpora, 100 verifier executions, coverage and nine
editor groups also pass.

Ordinary expression items: 89/164 match, 75 remain; 37 original failures closed
and none regress. All 267 full tests pass without skips; fast passes 255 with
12 expected skips. Strict checks, both 93-case corpora, 100 verifier executions,
coverage, nine editor groups and six native sanitizer programs pass. All 67
earlier artifact pairs stay identical. Consolidated item/tail handling shrinks
source and generated artifacts; paired compiler medians have mixed small changes,
recorded without a general speedup claim. See the
[expression-item ledger](parity.md#ordinary-expression-items). Newly confirmed
array/List tail admission and incomplete declaration-branch results stay queued.
Next: branch-result checking, then broader function admission and control/value
forms; Unicode columns remain in the final diagnostic audit.

Function completion: per-block return/transfer facts close missing-arm admission
and checked-artifact gaps. The owner-requested design comparison retains ordinary
source checking and eliminates proved unreachable instructions; T00 is evidence
rather than automatic semantic authority. Both new completion boundary probes
pass, expanding the inventory to 91/166 matching cases with 75 remaining and
no observed regressions. The original inventory still has 37 closed failures.
All 268 full tests pass with no skips; fast passes 256 with 12 expected skips.
Both corpora, strict checks, 100 verifier executions, coverage, nine editor
groups and six native sanitizer programs pass. All 67 earlier program artifact
pairs remain unchanged. A matched native dead-output workload compiles in
66.8 → 46.2 ms, with exact behavior and C size 123183 → 293 bytes; ordinary
compiler timings are mixed. See the [completion ledger](parity.md#function-completion).
Broader value/loop-result, Never/callable/capture, native C and consumer gaps remain.

Float literal/value migration: 92/166 cases match, 74 remain; 38 original
failures closed, no observed regressions. Both 93-case target corpora pass
with 69 programs/24 rejections; all 67 older program artifact pairs remain
identical. All 273 full tests pass without skips, along with strict checks,
100 verifier executions, coverage, nine editor groups and six generated native
sanitizer cases. Paired compiler timings are mixed and recorded without a
general speedup claim. See the [literal/value ledger](parity.md#float-literals-and-display).
Next: port existing mixed Float arithmetic used by the remaining sample
programs, then continue the generated run/check and native migration dependencies.
Independent issue cleanup stays outside the active path.

Mixed Float arithmetic/comparison migration: all 20 implemented sample manifests
now run on generated TS; the nine affected lessons additionally verify on C.
Inventory improves to 103/167 matching cases, with 64 remaining, 48 original
failures closed and no observed regressions. All 274 full tests pass with
zero skips (149.7 s); fast passes 262 with 12 expected skips
(103.9 s). Strict host/seeds, both 93-case corpora, 121 verifier
executions, coverage of 39 registered features, nine editor groups and six
native sanitizer cases pass. Three generated generations match. All 69 TS
fixture artifacts and 67 of 69 C artifacts remain unchanged; the two C Float
literal fixtures acquire the discovered parser wrapper. Paired compiler timings
are mixed, with no general speedup claimed. See the
[mixed Float ledger](parity.md#mixed-float-arithmetic-and-comparisons),
[ladder](reports/2026-11-02-float-arithmetic-ladder.json) and
[performance record](reports/2026-11-02-float-arithmetic-performance.json).
Next: power and common numeric annotations, then the ordinary syntax blockers
for the eight remaining examples and generated default workflows. Advanced edge
coverage and native self-hosting remain later gates.

Power checkpoint migration: generated TS/C now lower right-associative,
Float-default positive-exponent power, preserving explicit negative-base grouping,
operand effects and lazy positioned faults. T00's concealed-minus admission
differs from the selected rule; Lite follows that rule without changing T00.
All 276 full tests pass with zero skips (161.0 s); fast passes 264
with 12 expected skips (109.8 s). Strict host/seeds, both 93-case
corpora, 123 verifier executions, 39-feature coverage, nine editor groups and
six optimized native sanitizer cases pass. Three generated generations match.
Inventory: 105/167 matching, 62 remaining; 50 original failures closed, none
regress. All 69 earlier TS/C fixture pairs remain byte-identical.
The [power ledger](parity.md#power-checkpoint),
[ladder](reports/2026-11-02-power-ladder.json) and
[paired timing record](reports/2026-11-02-power-performance.json) retain evidence.
Next: common numeric annotations, then remaining ordinary data/call/control
syntax and the Lite-default workflow cutover. Advanced rounding/edge coverage
remains deferred.

Numeric synonym migration: Int64=Int and Float64=Double=Float now normalize
across admitted annotation/alias/function/aggregate forms, without runtime
conversions or source-subset adoption.
All 278 full tests pass with zero skips (166.3 s); fast passes 266
with 12 expected skips (119.7 s). Strict host/seeds, both 93-case
corpora, 126 verifier executions, coverage of 40 registered features, nine editor
groups and six native sanitizer cases pass. Three generated generations match,
and all 69 earlier TS/C fixture pairs remain unchanged. Inventory: 108/169
matching, 61 remaining, 52 original failures closed, no observed regressions.
The new alias feature adds one passing case, while the retained Float-literal
context probe adds one failing case; both contribute to the new denominator.
See the [numeric-synonym ledger](parity.md#numeric-type-synonyms),
[ladder](reports/2026-11-02-numeric-aliases-ladder.json) and
[paired timing report](reports/2026-11-02-numeric-aliases-performance.json).
Next: the retained Float integer-literal context, then remaining ordinary
data/call/control syntax and the early Lite-default workflow cutover.

Float context migration: the scalar/aggregate/contextual literal forms and
related braced-value boundaries now execute on generated TS artifacts. The
TS-focused full suite passes 271 tests with nine native-only skips (126.3 s);
fast passes 268 with 12 expected skips (129.5 s). Strict checks, three matching
self-builds, the 93-case TS corpus, 41-feature coverage and nine editor groups
pass. All 69 earlier fixture artifact pairs remain unchanged. See the
[Float-context ledger](parity.md#float-literal-contexts-and-braced-values),
[ladder](reports/2026-11-02-float-contexts-ladder.json) and
[TS timings](reports/2026-11-02-float-contexts-performance.json).
Owner update: remove public run, compile then execute TS artifacts, and defer
C output/native gates until after TS migration. Next is the public workflow
cutover and the remaining ordinary TS syntax; C is not a retirement blocker.

## Test-contract separation (2026-11-03)

- 2026-11-03: w1 test contracts are separated: all 240 original igniter tests retain destinations (81 generated/phase/artifact, 159 reference), and 776 exact process contracts replace live T00 expected-value lookups. Shared manifest loading retains all 93 compiler fixtures. Five contract/ownership checks, six copied-checkout no-T00 host groups, strict host/seed checks, three identical generated self-builds and nine editor groups pass. Fast: 278 pass/12 skips; full: 281 pass/9 native skips, zero failures. Compiler source/seed and the 60/81 canonical TS audit are unchanged. Default actual compiler/phase helpers and reference selection remain w2 work. See [the evidence](reports/2026-11-03-test-contracts.json) and [contract guide](tests/contracts/README.md).

This is a harness prerequisite, not a language-port closure or completed default test cutover. The measured 112/172 source inventory is unchanged because compiler source and seed identities are unchanged.

## Generated default regressions (2026-11-03)

- 2026-11-03: default tests now compile with generated Lite, strictly check TS and execute isolated artifacts; checked library/phase drivers are reused across inputs. All 93 compiler fixtures, eight library entries and 81 original generated tests remain covered. T00 checks require `./lite test --reference` (162 pass). Ordinary and T00-free source-archive fast suites each pass 119 with 12 deferred skips; full suites each pass 122 with nine native skips and zero failures. Strict checks, nine editor groups and three identical self-builds pass; source/seed are unchanged. The default static graph has 18 modules and no T00 imports. CI now runs the full no-T00 suite. The canonical TS audit still reports 60/81 passing with 21 visible pending ports. See [the evidence](reports/2026-11-03-generated-tests.json). Routine tooling remains w3 work.

This completes the default test execution cutover, not the remaining language ports or T00 retirement. The recorded 112/172 source inventory stays unchanged; source/seed identities match, while the canonical TS scenario audit above was freshly executed.

## Generated routine tooling (2026-11-03)

- 2026-11-03: w3 completes generated-only routine tooling. Self-build strictly checks three named generations and records real source/builder identities; corpus validation checks 93 compiler contracts and 69 TS runtime scenarios against recorded expectations. Benchmarking records generated process/load/compile/check/runtime phases with three samples and one excluded warmup. Old T00 audit programs are preserved byte-for-byte apart from routing comments and require --reference. Five CLI regression groups include absent T00/Git, malformed inputs, wrong compilers and a legitimate changed-source fixed point. Fast: 124 pass/12 skips; ordinary and no-T00 full: 127 pass/nine native skips, zero failures. Reference 162/162, nine editor groups, strict checks and both corpus routes pass. Source/seed remain unchanged; the canonical audit is still 60/81 with 21 visible pending ports. See [evidence](reports/2026-11-03-generated-tooling.json), [tool guide](bootstrap/README.md) and [baseline](../benchmark/reports/2026-11-03-generated-compiler-performance.md).

Workflow cutover is complete. This adds no language support and does not close the 60 measured source-case failures. Next is the planned tuple/data/call migration; advanced audits and native C remain deferred.
