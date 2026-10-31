# Lightweight native execution — investigation points

Status: **question map**, created 2026-10-28; bounded follow-up direction recorded
2026-10-31. Detailed question status belongs to the linked owning topics. This is a cross-topic focus, not a completed
investigation, selected implementation plan, or additional topic ID.

## Selected priority and open mechanisms

The [memory and performance reference](../docs/memory-and-performance.md#lightweight-native-execution-priority)
records the selected goal: Lite should be light, fast, economical in memory, and
small in runtime support and final executable size. Ordinary native programs
should not require a VM or tracing collector. The [decision ledger](../docs/decisions-and-open-questions.md#lightweight-native-execution-priorities-2026-10-28)
separates this priority from unselected implementation mechanisms.

Owned storage, deterministic cleanup, checked views, explicit sharing, static
specialization, a shared typed compiler core and a later LLVM path remain
candidates. C is now the selected
first native and maintained library/project export/migration target; TS first
supports bootstrapping and maintained web output, with possible AS/early Wasm to
investigate. See [the selected direction](INV-061-first-compiler-output.md).
Those target choices do not select the other mechanisms listed here. Preserve selected copies,
access permissions, safety, zero mappings, failure behavior, and cleanup. No
numeric budget or universal ordering among speed, size, and other goals is set.

## Questions and owning topics

Use these stable IDs to pick a bounded question. Track findings on the owning
parent's **Investigation** line in [TOPICS.md](TOPICS.md); do not mark a topic
recorded merely because this map links it. Existing questions retain their
individual tracking status; listing them here does not restart or complete work.

1. **Ownership compatible with ordinary copies.** Start with
   [INV-041.01–.04](SUBTOPICS.md#inv-041) and
   [INV-043.01–.04](SUBTOPICS.md#inv-043). For a copied growable list, string,
   resource-bearing record, and closure environment, establish copy eligibility,
   observable value/identity, retention, mutation, and disposal. Compare any explicit
   transfer/clone/share alternatives without silently substituting moves or borrows.
2. **Safe lifetime and reclamation without mandatory tracing.** Use
   [INV-044](SUBTOPICS.md#inv-044), [INV-045](SUBTOPICS.md#inv-045), and
   [INV-053](SUBTOPICS.md#inv-053). Examine returned views, list reallocation,
   escaping captures, shared cycles, foreign resources, and cleanup failures.
   Separate compile-time proof, generated destruction, reference-count updates,
   and any optional cycle/tracing machinery. A pointer copy is not a lifetime proof.
3. **Allocation and representation costs.** Use
   [INV-047](SUBTOPICS.md#inv-047), [INV-050](SUBTOPICS.md#inv-050),
   [INV-033.02–.04](SUBTOPICS.md#inv-033), and
   [INV-064.03](SUBTOPICS.md#inv-064-03). Investigate inline products, union tags,
   runtime sequence descriptors, closure environments, dynamic failure aggregates,
   allocator failure, and zero-state validity. Identify which allocation is
   necessary, optional, or forbidden by each candidate contract.
4. **Deployment and scripting latency.** New
   [INV-004.01–.04](SUBTOPICS.md#inv-004) distinguish native deployment, cached
   scripts, behavioral parity, and restricted environments. Cold compilation,
   launch, cache storage, and steady-state execution require separate evidence.
5. **Common compiler core and backend parity.** New
   [INV-061.05](SUBTOPICS.md#inv-061-05) extends
   [INV-061.03–.04](SUBTOPICS.md#inv-061) with C/LLVM lowering questions. Use
   evaluation-order, arithmetic-boundary, aggregate-copy, bounds-fault, panic, and
   cleanup cases to expose backend differences. Compiler dependencies are separate
   from produced-program dependencies. TS-first bootstrap/web and C-first-native directions are now selected; a shared
   IR or direct LLVM path remains unselected.
6. **Speed versus code size.** New
   [INV-063.01–.04](SUBTOPICS.md#inv-063), together with
   [INV-027.03](SUBTOPICS.md#inv-027-03), compare specialization, sharing,
   inlining, helpers, valid check/copy elimination, and link-time reachability.
   Include multiple generic instantiations and cross-module callers to reveal
   code growth hidden by a single small benchmark.
7. **Minimal runtime and optional services.** New
   [INV-064.05](SUBTOPICS.md#inv-064-05) builds on
   [INV-064.01–.04](SUBTOPICS.md#inv-064). Explain base startup support and the
   incremental code/data/metadata of allocation, strings/formatting/I/O, closures,
   panic transport, aggregation, and concurrency. Consider unused registrations,
   metadata roots, helper duplication, and dependencies that inhibit removal.
8. **Reproducible evidence and budgets.** New
   [INV-074.01–.06](SUBTOPICS.md#inv-074) cover workload selection, size accounting,
   feature deltas, time/memory protocols, equivalent C comparisons, and future
   backend conformance/regression evidence. Propose numeric budgets only after
   target-specific baselines exist.

## Later library and code-size questions, 2026-10-30

The user requested later investigation of standard-library swapping, lean
generated code, and interface versus implementation definition locations.
[INV-071.01–.03](SUBTOPICS.md#inv-071) and
[INV-063.05](SUBTOPICS.md#inv-063-05) inventory these questions; all are **not
started**. Provider selection and contract placement may affect cross-module
optimization, duplicate helpers, retained metadata, and runtime dependencies.
No replacement mechanism, layout, dispatch policy, or size result is selected.
The separate [module top-level effects question](SUBTOPICS.md#inv-003-05) also
asks whether initialization can pull in effects/support merely by importing a
module; a top-level-effects ban has not been selected.

## Evidence expected from a bounded investigation

- State the question, current contracts, candidate assumptions, repository
  revision, and supported subset. Read the owning pages before experimenting.
- Use an empty program, scalar calculation, fixed-array loop, and plain record
  call as candidate base cases. Add one feature at a time: strings/I/O, dynamic
  storage, generic instantiations, capturing callables, checks/recovery, and
  cleanup. Include invalid-lifetime, failure, and boundary cases where relevant.
- Record correctness first. Report execution/startup/build time, allocation and
  peak memory, final file/section bytes, required runtime/library bytes, and
  loaded memory as separate observations. Document target, toolchain, flags,
  debug/stripping, static/dynamic linking, LTO, repetitions, and raw artifacts.
- Compare equal work with matching numeric, safety, and failure behavior. Show
  speed/size tradeoffs rather than labeling every change an improvement.
- State whether evidence comes from document review, foreign-language probes,
  or actual LiteLang execution. This question map alone validates no compiler,
  no-GC, performance, or footprint result follows from creating these questions.

Use the [note template](NOTE-TEMPLATE.md) when investigation begins. The
[external reference entry](../docs/references.md#lightweight-native-execution-reviewed-2026-10-28)
records Salam as motivation and LLVM/Rust as focused technical references; their
results and semantics are not LiteLang conformance evidence.
