# Compiler and performance baseline for the language review

Snapshot: 2026-11-15, source revision `5b1dbdce`, before these review-only
changes. The full execution and probes were repeated in a `git archive` copy of
that revision after concurrent compiler edits appeared in the shared checkout.
The archive used the checkout's installed TypeScript dependencies through a
symlink; an initial run before linking them failed because `tsc` was missing,
then the uncached rerun passed. Evidence applies to that snapshot and the stated source forms, not every
form of a language feature. Later compiler changes require a fresh assessment.
The design docs may describe a selected language rule before the generated
compiler implements it. Older igniter or C results are historical evidence and
are not substituted for the active public compiler.

## Goals and their limits

The requested direction is a small, lightweight language and toolchain, no GC,
no runtime footprint as an aspiration, and speed competitive with or better than
C in suitable complex applications. Review each feature for static metadata,
required machine state, executable code, linked support, heap allocation, copying,
indirection, dispatch, startup, compile cost, and binary size. These dimensions
are separate: zero language-specific runtime dependency, zero executed support
instructions, zero per-value metadata, and zero dynamic allocation are different
claims. Runtime-sized lengths, live union alternatives and cleanup work may need
information or instructions even without a VM, GC, or separate runtime library.
No decision is made here to relax the user's goals; any unavoidable cost or
conflict with a selected semantic rule needs explicit review.

Public `./bin/lite run` compiles to TypeScript and executes with Node; its host
and emitted helpers are not no-GC or zero-runtime evidence. The public C target
is deferred; the C emitter is hosted by generated TS. There is no verified native
self-hosted compiler, native no-GC guarantee, binary-footprint result, or evidence
that Lite matches or exceeds C on comparable workloads. The emitted TS includes
BigInt arithmetic and on-demand host helpers, e.g. in
[emit-ts.lts](../../../compiler/src/emit-ts.lts). Neither the existence nor the
absence of a particular helper proves a native lowering cost.

## Commands and observed results

- `./bin/lite verify --all --no-cache`: **86 executed, 0 cached, all passed** on generated
  TS, including feature and consumer scenarios. This is the finite set in the
  maintained manifests, not exhaustive language coverage or C execution.
- `./bin/lite verify --coverage`: 41 registered features, 41 feature cases,
  22/22 example manifests and 22/22 sample manifests. This checks registry and
  consumer coverage; it does not execute features or prove completeness.
- `./bin/lite --help`, [compiler README](../../../compiler/README.md), and
  [module implementation](../../../compiler/module-import-stages.md) identify
  the active generated path and import restrictions. Some old spec and gap
  sections describe earlier checkpoints; fresh results above supersede their
  historical counts for this snapshot.
- The sources below were written to separate files and checked with
  `./bin/lite check FILE`. All statuses are process exit codes. Checking a form
  is narrower than testing its behavior; rejection establishes only that exact
  source, and a diagnostic may identify a restriction other than the intended
  feature. No claim of support follows from a syntactically invalid probe.

```text
record       1  User := record { name: String; age: Int; }
                user := User { name = "Ali", age = 10, }
enum         1  Status := enum { Ready; Busy; } value := Status.Ready;
distinct     1  UserID := distinct String; raw := "user-42"; id := UserID(raw);
union        1  value: Int | String = 1;
generic      1  identity := fn<T>(x: T): T { x } x := identity(1);
fallible     1  read := fn(): Int ! String { 1 }
subject      1  value := 1; match value { 1 { } _ { } }
borrow       1  use := fn(x: ref String): Int { 1 }
comptime     1  x := comptime { 1 + 2 };
closure-copy 1  make := fn(): fn(): Int { var x := 0; fn(): Int { x = x + 1; x } }
capture      0  var x := 2; reader := fn(): Int { x }
array        0  a := [1, 2, 3]; x := a[1];
module       0  io := import "core/io"; io.outputLine(42);
```

The `ref` and `comptime` spellings are probes of proposals, not selected syntax.
The accepted capture probe does not establish safe escaping, copying, mutation,
or the intended capture policy; the closure-return probe fails earlier at a
function type. Records fail explicitly as unsupported; enum and distinct fail
at name resolution; other rejections occur during parsing/type recognition.
The full verifier includes named cases such as `tuple.shape`, `array.fixed`,
`loop.metadata`, `finally.cleanup`, `function.recursion`, `match.subjectless`,
and `list.mutation`; consult their sources in
[feature verifications](../../../language/verifications/features/) for exact
boundaries. Tests of the TS target do not establish native layout or performance.

## Evidence needed for performance claims

Use equivalent observable behavior, input distributions, safety checks,
allocation policies, optimization levels, and link settings against a documented
C baseline. Include algorithms and data layout rather than only microbenchmarks;
measure steady-state throughput, startup, tail latency, compile time, executable
and linked dependency size, allocations, peak and retained memory, and failure
paths separately. Record target, toolchain, reproducible source/flags, samples,
variance and correctness. Compare C implementations using equivalent algorithmic
knowledge; improved abstractions may enable better algorithms, but do not imply
Lite automatically beats well-optimized C. None of these measurements is claimed
by this review.
