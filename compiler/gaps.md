# Generated compiler gaps and progress

Owner direction, 2026-11-02: continue topic by topic, with an atomic commit for
each verified slice. Improve compiler speed where measurements support a change;
keep correctness, source readability and reproducible bootstrap routes intact.
This tracker covers the T00 replacement goal, including newly discovered flaws.

## Measured checkpoint

The [current inventory](reports/current-t00-t11-inventory.md) and
[raw observations](reports/current-t00-t11-inventory.json) use the generated
seed `3fe0dd56…`. All inputs compile/check against the current reference, both
execution paths use identical anonymous diagnostic naming, and raw-byte input
probes follow the real CLI's lazy strict UTF-8 decoding. Historical reports stay
unchanged. Refresh with `node compiler/scripts/t00-t11-inventory.ts --large-sources`.

- Canonical features: 23/38 match; 15 rejected.
- Examples: 11/19 match; 8 rejected.
- Implemented samples: 11/20 match; 9 rejected.
- Isolated boundary probes: 32/79 match; 47 rejected; no differences among accepted probes.
- Library tests: 8/8 match. All 210 tracked Lite sources are accounted for;
  compile-only acceptance is distinguished from executed parity.
- Total executed source cases: 85/164 match, 79 still fail. Compared with the
  original inventory, 33 previously failing cases now match and none regress.
  The temporary-I/O case, retained function-tail probe and new chain feature
  account for three additional matching cases.

These counts describe measured programs. Several failing cases share one cause;
a passing broad case can still contain unsupported forms. The detailed report
lists every remaining case and exact first diagnostic. Native C and consumer
migration are additional work, so this is not an overall completion percentage.

## Closed slices

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
  as one source offset in Lite and two UTF-16 units in T00. The owner is choosing
  the convention; retain explicit supplementary-character cases when resolved.
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
- [ ] **Script and lexical forms:** standalone scope blocks, expression
  statements and same-block shadowing.
- [x] **Deferred arithmetic faults:** constant arithmetic must fault only when
  reached; dead branches and short-circuit operands must remain unevaluated.
  Valid constant folding remains; invalid arithmetic executes only when reached.
- [ ] **Float arithmetic:** decimal/exponent literals, mixed operations,
  comparisons, finite-result faults, power and display.
- [ ] **Numeric widths:** explicit Int64/Float aliases, narrow types, promotion,
  lossless widening, checked narrow results and Float32 rounding.
- [ ] **Block and conditional values:** statement-bearing blocks, Unit tails,
  partial defaults and false-branch no-write assignments.
- [ ] **Tuple shapes:** unnamed/mixed/unit/singleton tuples, shorthand fields,
  positional reads, destructuring, receiving-label conversion and display.
- [ ] **Fixed arrays:** inferred/explicit extents, function contracts, aliases,
  copies and indexed/sequence access.
- [ ] **Mutability and lists:** inferred mut/var mut, front operations,
  List<Unit>, all end operations and copy contracts.
- [ ] **Storage and updates:** compound assignments, zero initialization,
  reserved storage and first whole-value writes.
- [ ] **Call routing:** named/positional/shorthand arguments, replacement of
  earlier contributions and trailing argument forms.
- [ ] **Function values and environments:** compatible copies/replacement,
  nested helpers, live captures and distinct escaped environments.
- [ ] **Never-valued exit:** preserve the reference's Never result in value
  contexts. T00 rejects `Unit == exit(3)` before effects, while the current TS
  frontend treats exit as Unit and accepts it. Conversely, an Int-returning
  function whose tail exits needs the supported bottom-type flow contract.
- [ ] **Traversal forms:** unnamed item bindings and consistent scope.
- [ ] **Loop values and exits:** value/then completion, metadata, payloads,
  tagged break/continue and the reference's supported tagged returns.
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
- [ ] **Consumers:** generated check/run and remaining regression consumers,
  source names/line maps, rejection-before-effects and full diagnostic parity.
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
