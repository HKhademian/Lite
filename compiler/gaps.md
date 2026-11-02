# Generated compiler gaps and progress

Owner direction, 2026-11-02: continue topic by topic, with an atomic commit for
each verified slice. Improve compiler speed where measurements support a change;
keep correctness, source readability and reproducible bootstrap routes intact.
This tracker covers the T00 replacement goal, including newly discovered flaws.

## Measured checkpoint

The [current inventory](reports/current-t00-t11-inventory.md) and
[raw observations](reports/current-t00-t11-inventory.json) use the checked Int64
seed `c9529226…`. All inputs compile/check against the current reference, both
execution paths use identical anonymous diagnostic naming, and raw-byte input
probes follow the real CLI's lazy strict UTF-8 decoding. Historical reports stay
unchanged. Refresh with `node compiler/scripts/t00-t11-inventory.ts --large-sources`.

- Canonical features: 22/37 match; 15 rejected.
- Examples: 10/19 match; 9 rejected.
- Implemented samples: 11/20 match; 9 rejected.
- Isolated boundary probes: 22/78 match; 56 rejected; no differences among accepted probes.
- Library tests: 8/8 match. All 209 tracked Lite sources are accounted for;
  compile-only acceptance is distinguished from executed parity.
- Total executed source cases: 73/162 match, 89 still fail. Compared with the
  original inventory, 23 previously failing cases now match and none regress.
  A new temporary-I/O case accounts for the additional matching case.

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
- [ ] **Comparisons:** parenthesized inequality, chains and single evaluation.
  A bare function tail `value =!= ""` is also mistaken for assignment to the
  parameter; retain a regression for that form when fixing comparison parsing.
- [ ] **Script and lexical forms:** empty scripts, optional final semicolons,
  adjacent Strings, trailing call commas, standalone scope blocks, expression
  statements and same-block shadowing.
- [ ] **Deferred arithmetic faults:** constant arithmetic must fault only when
  reached; dead branches and short-circuit operands must remain unevaluated.
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
- [ ] **Traversal forms:** unnamed item bindings and consistent scope.
- [ ] **Loop values and exits:** value/then completion, metadata, payloads,
  tagged break/continue and the reference's supported tagged returns.
- [ ] **Cleanup:** construct-level finally and exit/fault interactions.
- [ ] **Match:** supported subjectless Boolean selection and combinations.
- [ ] **Other existing input:** audit and port remaining reference helpers,
  including inputWord; preserve the selected six-helper public contract.
- [ ] **C target parity:** functions, aggregates/copies, text/input, control
  flow and complete runtime/memory support. Audit TS-only acceptance explicitly.
- [x] **C output argument faults:** `var zero := 0;
  outputLine("prefix", 1 / zero);` must evaluate arguments before printing any
  part of the call. C now matches T00/TS and prints no partial call on a fault.
- [ ] **Native C ladder:** C11, historical-node equality and cross-host fixed
  points, strict native compilation, boundary cases and clean rebuilds.
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
