# INV-001 — Language goals and boundaries

Status: recorded
Contributor: redacted (agent-assisted)
Last updated: 2026-10-27
Catalog brief: [INV-001](TOPICS.md#inv-001)
Covered subtopics: whole topic (INV-001 has no starter subtopics in [SUBTOPICS.md](SUBTOPICS.md))

This is a non-normative investigation note outside the language draft. Recording
an option or recommendation here does not select a language rule.

## Investigation question

This note examines three connected questions within INV-001:

1. **Workloads.** Which everyday programs must LiteLang serve first, and which
   uses are explicitly later, aspirational, or outside the milestone?
2. **Memory control.** What does "as much native-like memory control as
   practical" promise, and which of those controls are currently selected rather
   than merely mentioned as a direction?
3. **Conflict resolution.** When selected goals collide — for example ceremony
   versus explicit cost, safety versus placement control, or convenience versus a
   modest runtime — what decides, and what evidence would show the decision was
   wrong?

The note stays at the goal and boundary level. It does not choose syntax, an
ownership mechanism, a backend, an ABI, or a standard-library API. Those belong
to [INV-009](TOPICS.md#inv-009), the memory topics
([INV-041](TOPICS.md#inv-041) through [INV-053](TOPICS.md#inv-053)), and the
implementation topics ([INV-061](TOPICS.md#inv-061) through
[INV-075](TOPICS.md#inv-075)). Exercise coverage is [INV-002](TOPICS.md#inv-002);
performance evaluation is [INV-074](TOPICS.md#inv-074).

## Subsequent priority clarification, 2026-10-28

The user subsequently reaffirmed fast native execution, low memory use, small
runtime support, and small final executables as core priorities. The [current
owning page](../docs/memory-and-performance.md#lightweight-native-execution-priority)
records ordinary native execution without a mandatory VM or tracing collector as
a goal, with mechanisms and numeric budgets still open. The [focused question
map](lightweight-native-execution.md) supplies follow-up investigation points.
The evidence below remains the 2026-10-27 snapshot; its statement that no priority
order was recorded should not obscure this later emphasis or imply a total
ordering among goals.

## Current contracts and evidence

Evidence was read at repository revision `c59f743` ("docs: catalog language
investigations and scoped starter questions") with a clean working tree on
2026-10-27. All citations below are to that revision.

### Established goals

The [white paper](../docs/white-paper.md) is the foundational statement. It
establishes the audience, the central design question, and seven review
questions ([§8](../docs/white-paper.md#8-criteria-for-future-decisions)):

1. Does the proposal help express and reason about the actual problem?
2. Can its behavior be explained from a small, visible set of rules?
3. Does it remove repetition while preserving essential contracts?
4. Are failure paths, access permissions, and meaningful effects understandable
   from source?
5. What representation, allocation, copying, dispatch, and cleanup does it
   require?
6. Can a compiler implement the ordinary path efficiently, and which claims need
   measurement?
7. Does it compose consistently with the rest of the language?

The [principles page](../docs/principles.md#design-goals) condenses the selected
direction: low ceremony, static strong typing with inference, no universal
`null`, `Option` for absence, `Result` for recoverable failure, a separate typed
panic channel, immutability by default with explicit `var`/`mut`, capability-based
collections, small runtime requirements, native execution as an intended
direction, and syntax whose meaning does not depend on layout. The
[decision ledger](../docs/decisions-and-open-questions.md#established-direction)
records the selected fragments in more detail.

Two qualifications matter for this topic:

- The goals are **qualitative**. No page names a binding workload set, a priority
  order among the goals, or an acceptance threshold for "near C."
- The white paper explicitly leaves the **memory-management model, ownership
  rules, compiler backend, and runtime mechanisms** open
  ([§5](../docs/white-paper.md#5-convenience-should-preserve-an-efficient-implementation)).
  The [memory review](../docs/memory-and-performance.md) repeats that the model
  is unchosen and that no benchmark, compiler, allocator, or binary-size result
  exists.

### Workload evidence

The [single-file exercise catalog](../samples/list.md) contains 520 exercises in
26 stages. Exercises 001–020 are marked "implemented but unverified"; 021–520 are
planned ([starting conditions](../samples/list.md#starting-conditions)). The
[contributor notes](../samples/NOTES.md) confirm there is no compiler, runtime, or
implemented `lite run`.

The stage families are broad:

- arithmetic, conditions, loops, and reusable numeric functions (001–080);
- ASCII text, list traversal and transformation, matrices (081–160);
- records, membership/frequency, validation with `Option`/`Result` (161–220);
- text parsing, sorting/searching, recursion, small data structures (221–300);
- host arguments and file utilities, practical text/data tools (301–340);
- discrete math and encodings, two pointers/intervals/greedy, dynamic
  programming (341–400);
- trees, graphs, deterministic simulations, small parsers/evaluators (401–480);
- larger algorithms and bounded single-file applications (481–520).

The catalog's own constraints are as important as its breadth
([starting conditions](../samples/list.md#starting-conditions)):

- every script is self-contained, with no manifest, imports, or third-party
  dependencies;
- inputs are bounded and fixtures deterministic; no clock, network, GUI, or
  concurrency is assumed;
- text is ASCII unless an entry says otherwise;
- sets, maps, queues, trees, and graphs may use list- or index-based
  representations, so pointers, inheritance, and a finalized generic system are
  not prerequisites;
- file and argument work appears only from stage 16 onward, and real I/O is
  marked blocked until a host contract exists
  ([stage 16](../samples/list.md#16--command-arguments-and-file-utilities-301320)).

The [challenge corpus](../challenges/README.md) broadens the inventory to 7,085
records from nine sources, with 101 canonical topics, 43 lists, 3,637 records with
public or held-out tests, and 500 benchmark items. Its category counts are
algorithms 5,533, mathematics 1,005, puzzles 272, bioinformatics 105, databases
94, security 66, concurrency 6, and shell 4
([index](../challenges/data/index.json)). These are inventory counts, not
LiteLang workloads; every database record uses the SQL format and every shell
record the shell format, and the corpus is not a memory-control or
systems-programming suite.

**Evidence reading.** The corpus defines a *breadth* profile: small,
deterministic, single-file, single-threaded, in-memory algorithm and
data-processing programs. It exercises the readability and correctness goals
well, but it does not force ownership, aliasing, placement, reclamation, FFI, or
concurrency decisions. The catalog's "first milestone" phrase therefore cannot
by itself justify a particular memory model.

### Memory-control evidence

The selected and open fragments are scattered across several pages. They do not
yet compose into a memory model.

Selected:

- **Access authority:** fixed bindings and read-only access by default; `var`
  replaces a binding or caller location, `mut` updates held data; caller mutation
  grants are explicit ([mutability](../docs/mutability.md),
  [ledger](../docs/decisions-and-open-questions.md#audience-and-defaults)).
- **Value transfers:** ordinary reads, assignment values, call inputs, and results
  have copy semantics with no implicit references
  ([copy default](../docs/parameter-values-and-slots.md#general-copy-default-selected)).
  Physical copy elimination is permitted, not required, when observable behavior
  is preserved.
- **Initialization:** every type has a valid all-zero value; a simple typed
  declaration is readable immediately; `= ?` reserves storage without zeroing or
  declared defaults ([zero initialization](../docs/zero-initialization.md),
  [reserved storage](../docs/reserved-storage.md),
  [first initialization](../docs/first-initialization.md)).
- **Representation fragments:** tuple labels do not change storage; singleton
  tuples share their component's layout; fixed arrays share homogeneous tuple
  storage; union storage uses payload capacity plus active-member metadata
  ([memory and performance](../docs/memory-and-performance.md)).
- **Cleanup:** construct-level `finally` runs on normal and abrupt exits and
  preserves a pending failure as primary
  ([finally](../docs/finally.md)).
- **Failure transport:** implicit typed panics without checked effect lists
  ([LP-0018](../docs/proposals/LP-0018-implicit-panics-without-effect-declarations.md));
  explicit capture and ordered failure occurrences
  ([LP-0009](../docs/proposals/LP-0009-flat-failure-capture.md)).

Open or explicitly deferred:

- type-specific copy eligibility and the behavior of copying a resource-owning
  descriptor;
- ownership, lifetimes, escape analysis, and alias/exclusivity enforcement;
- growable `List` owner copy, sharing, move, and allocation policy;
- slice/view construction, lifetime checks, and invalidation
  ([slices](../docs/slices.md));
- storage placement (stack versus heap), partial construction through callees,
  allocation failure, and reclamation beyond construct cleanup;
- raw-memory access, foreign interfaces, concurrency, and memory ordering;
- runtime packaging, mixed-channel transfer, and ABI
  ([memory review](../docs/memory-and-performance.md#contracts-most-likely-to-add-machinery)).

The [investigation catalog context](README.md#context) says the direction is
"modern scripting convenience with as much native-like memory control as
practical, restricted raw-pointer access." That sentence describes an ambition.
It is not a selected memory contract, and no page defines how much control is
"practical" or where the restricted raw-pointer boundary sits.

### Process evidence

The [versioning policy](../docs/versioning-and-naming.md#8-proposal-versioning)
requires an accepted `LP-NNNN` proposal or a recorded ledger decision for a
language change. The [normative page map](../docs/normative-pages.md) requires a
single owning page per rule and says conflicts should be reported rather than
synthesized. That process is clear for *individual rules*. It does not define how
to record a **goal conflict** when two selected goals point in different
directions.

## Concrete cases

The examples below are illustrative and use unselected syntax where a mechanism
is missing. They are not executable LiteLang programs.

### Case 1 — Passing a growable sequence

```text
values := [3, 1, 2];
sort(values);
```

`sort` might copy, take a `var` grant and sort in place, or return a new
sequence. Ordinary transfers currently have copy semantics, but the `List`
owner's copy contract is open. A read-only `sort` that returns a new value is
easy to read but may allocate and copy; an in-place `sort` is efficient but
requires a caller-visible grant. The case exposes the difference between
*convenience* (the call looks the same) and *cost transparency* (the reader knows
whether storage is duplicated).

### Case 2 — A large reserved buffer

```text
var pixels: [Pixel; 1920 * 1080] = ?;
fill(pixels);
```

The reservation marker avoids a preliminary zero pass, which is its stated
primary motivation. It does **not** select stack versus heap placement, allocation
failure behavior, partial cleanup, or whether `fill` receives read or write
access. The white paper already permits an optimizer to remove unobservable zero
stores; the open question is whether the *source contract* promises a no-zero
pass or merely permits one. Those are different promises, and only the first can
be relied on by a performance-sensitive program.

### Case 3 — Returning a view

```text
make_window := fn(): [Int] {
    local := [1, 2, 3];
    local[0..1]
}
```

Slices are a proposed limited view, not a selected feature. A view that escapes
its backing storage is invalid, but the lifetime check is open. The existing
variadic-rest rule is informative: borrowed use requires live backing storage,
and an invalid escape is not repaired by an implicit copy or heap promotion. If
views are exposed in ordinary code, lifetime and escape analysis become
unavoidable; if they are hidden, the language loses a cheap way to pass regions
without copying.

### Case 4 — Copying a resource-bearing record

```text
config := record {
    path: String;
    file: File;
}

a := config;
b := a;
```

Shallow record copies are selected where reference-field copy contracts are
valid. A file handle is not an ordinary reference field, and resource ownership,
copy eligibility, and cleanup are deferred. Two copied descriptors could denote
one open resource, two independent resources, or a shared handle with a release
count. The current documents do not choose. This is the sharpest collision
between the selected copy default and the goal of deterministic cleanup.

### Case 5 — A recursive syntax tree

```text
/* Illustrative direct-recursion form, not selected syntax. */
Node := record {
    kind: Kind;
    children: [Node];
}
```

The exercise catalog deliberately permits index-linked nodes so that pointers and
recursive ownership are unnecessary (stages 15 and 21). If a direct recursive
owner is attempted instead, copying or destroying the growable `[Node]` raises
copy, recursion, and cleanup questions. The corpus can be solved without
answering them, which is useful for a first milestone but weak evidence for a
systems-capable memory model.

### Case 6 — A late-stage file utility

```text
text := read_text(path)!;
lines := split_lines(text);
```

Host I/O is an explicit future dependency
([stage 16](../samples/list.md#16--command-arguments-and-file-utilities-301320)).
The example needs a host contract, a typed read failure, text decoding, and
cleanup for any opened resource. If the milestone includes the late stages, these
contracts move into the binding workload; if not, they remain a separate tier.
The exercise list and the "ready to solve the exercises" milestone statement are
ambiguous on this point.

### Case 7 — Concurrency and FFI

No exercise requires threads, atomics, or foreign calls. The challenge corpus has
only six concurrency records, and the language documents treat raw pointers and
foreign interfaces as future boundaries. Yet the catalog context names
"restricted raw-pointer access," and the white paper names native execution as a
goal. If those uses are binding, ABI and memory ordering become early design
constraints; if they are aspirational, they should be labeled as such rather than
silently shaping ordinary features.

## Options and consequences

### A. Workload tiers

**A1 — Corpus-only scripting milestone.** Bind the first milestone to stages
1–15 plus the in-memory portions of stages 17–26; treat host I/O, FFI, and
concurrency as later.

- *Advantages:* matches the deterministic, single-file exercises; avoids
  premature ownership and ABI commitments; keeps attention on readability and
  core semantics.
- *Costs:* "ready to solve the exercises" remains ambiguous; the native-control
  ambition is unvalidated; host-facing programs remain impossible.

**A2 — Everyday scripting plus host utilities.** Include stages 1–26, with host
I/O and file utilities in the binding tier.

- *Advantages:* exercises force text, parsing, records, failures, cleanup, and
  host boundaries; the result is useful for real small programs.
- *Costs:* requires a host contract, standard-library boundary, and more cleanup
  design before the first milestone; the standard library becomes part of the
  language's practical definition.

**A3 — Scripting plus a systems core.** Add placement control, reclamation,
FFI, and concurrency to the binding tier.

- *Advantages:* matches the "native-like memory control" ambition; gives the
  memory topics a concrete acceptance target.
- *Costs:* large scope; risks the low-ceremony and beginner goals; the current
  corpus provides almost no evidence for the difficult cases.

These tiers are not exclusive. A likely structure is a binding everyday tier plus
an explicitly optional advanced tier, with separate acceptance cases. That
structure is a recommendation, not a selected boundary.

### B. Memory-control promise

The phrase "as much native-like memory control as practical" can describe several
different promises. They should be named separately because they have different
costs.

- **M0 — Managed convenience.** A tracing collector or automatic reference
  counting handles reclamation. Simple and uniform, but adds runtime machinery,
  can make cleanup timing unpredictable, and conflicts with the small-runtime and
  deterministic-cleanup goals unless carefully scoped.
- **M1 — Values, access, and inferred borrowing.** Copy/value semantics, explicit
  `var`/`mut`, inferred non-escaping borrows, and deterministic cleanup. This is
  closest to the currently selected fragments, which include values, access, and
  cleanup but not yet inferred borrowing. It keeps ceremony low but leaves large
  copies, resource-bearing values, and escaping views unresolved.
- **M2 — Ownership and lifetimes in types.** Explicit moves, borrows, and
  lifetime relationships. Predictable and efficient, but adds annotations or
  inference obligations that can conflict with beginner clarity and agent
  readability.
- **M3 — Placement, allocators, and unsafe boundaries.** Explicit stack/heap or
  arena placement, allocation failure, raw memory, and FFI. Necessary for systems
  work, but it introduces a second, visibly different contract layer.
- **M4 — Fully manual.** C-like control with minimal safety guarantees. It
  contradicts the stated safety, readability, and no-universal-pointer goals.

The catalog's direction points toward M1 plus some explicit M3 boundary, but the
middle (M2) is not selected. Whether M2 is required for the promised control is
the ownership topic's question, not something this note can settle.

### C. Conflict adjudication

**C1 — Case-by-case prose.** Continue applying the white paper's seven questions
to each proposal without a named workload or priority. Flexible, but the same
conflict can be decided differently in two pages, and "near C" cannot be
falsified.

**C2 — Tier-scoped rules with a visibility test and cost note.** First name the
workload tier affected. Then require that consequential behavior (failure,
mutation, ownership transfer, allocation, cleanup) be visible at a source or type
boundary, per the continuity principle. Record the machine work the rule implies
and the measurement that would test it. For the everyday tier, readability and
defined behavior dominate; for an advanced tier, explicit control may dominate.
No tier may silently hide a consequential effect.

- *Advantages:* resolves conflicts without pretending there is one global
  ranking; keeps advanced features from contaminating ordinary code; produces
  reviewable evidence.
- *Costs:* requires a short conflict record and discipline in proposal review;
  tier membership itself must be decided.

**C3 — Weighted scorecard.** Assign weights to readability, safety, performance,
ceremony, and implementation cost. Explicit but falsely precise: the weights are
arbitrary, and a single number can hide a contract violation.

A recommendation, not a selected rule: use C2, with the white paper's questions
as the checklist, and add a short conflict record to the owning proposal or
ledger entry. The record should name the goals in tension, the affected tier, the
chosen direction, the implied costs, and the evidence or review date.

### D. Evaluation evidence

Whatever boundary is chosen, "near C" needs a falsifiable form:

- name the workload and the baseline language/compiler;
- compare equivalent algorithms and equivalent safety contracts;
- separate execution time, cold startup, compilation latency, binary size,
  allocations, peak memory, and cleanup cost;
- distinguish a *semantic guarantee* (for example, zero initialization is
  observable) from an *optimization permission* (the compiler may omit stores);
- state which claims are measured and which remain aspirations.

These points overlap [INV-074](TOPICS.md#inv-074) and are recorded here only
because the goals cannot be judged without them.

## Verification and limits

- Reviewed the white paper, principles, decision ledger, normative page map,
  versioning policy, memory and performance review, mutability/copy/slice/
  reservation/first-initialization/finally/panic pages, the exercise catalog and
  contributor notes, the challenge README and category index, and the proposal
  register at revision `c59f743`.
- Checked the working tree was clean before writing this note.
- Counted the exercise stages, exercise status, challenge totals, category
  totals, and corpus constraints from the repository files. Category totals come
  from the generated challenge index; the SQL/shell format statement was checked
  against the 7,085 source records rather than the index alone.
- No LiteLang compiler, interpreter, runtime, standard library, or conformance
  suite exists in the repository. No example here was executed or type-checked.
- No foreign-language experiment, benchmark, or primary-source review was
  performed for this note. Statements about Rust, Swift, C, and other languages
  are references already recorded in the repository, not new evidence.
- The options and recommendations in this note are analysis. They do not change a
  selected contract.

## Findings and remaining questions

### Findings

**F1 — The current workload evidence is broad but shallow.** *Evidence:* the 520
exercises cover algorithms, text, records, failures, parsing, trees, and small
applications, but are deterministic, single-file, single-threaded, and mostly
in-memory; file/argument work starts at stage 16 and real I/O is blocked.
*Interpretation:* the corpus is a strong readability and correctness suite and a
weak memory-control suite. It cannot by itself justify ownership, lifetime, or
FFI complexity, and it should not be treated as the whole acceptance target for
those areas.

**F2 — The first-milestone statement is underspecified.** *Evidence:* the
[catalog context](README.md#context) says the first milestone is "a language
ready to solve the exercises," while the exercise catalog includes host-dependent
stages whose real I/O is explicitly blocked until a host contract exists.
*Interpretation:* "the exercises" needs a named subset, or the milestone needs an
explicit host tier. *Recommendation:* resolve this before using exercise coverage
as an acceptance gate; INV-002 owns the coverage inventory.

**F3 — The memory-control promise exceeds the selected contracts.** *Evidence:*
the catalog context promises native-like control and restricted raw-pointer
access; the selected fragments cover access, copies, initialization,
representation, and construct cleanup, while ownership, lifetimes, aliasing,
placement, allocation failure, reclamation, raw memory, FFI, and concurrency
remain open. *Interpretation:* the language currently promises a direction, not a
model. *Recommendation:* state the promise as a tiered contract before adding
features that depend on it.

**F4 — The white paper's criteria are necessary but not sufficient for
adjudication.** *Evidence:* the seven questions are qualitative and do not name a
workload, a priority, or a measurement threshold. *Interpretation:* two
well-intentioned proposals can both satisfy the checklist and still conflict.
*Recommendation:* add a tier and a short conflict record to proposal review rather
than inventing a global numeric ranking.

**F5 — Four junctions carry most of the unresolved conflict.** *Evidence:* the
open items cluster around (a) copying resource-owning values, (b) escaping views
and lifetime proofs, (c) panic/failure transport and cleanup runtime, and (d)
specialization versus compile time and binary size. *Interpretation:* these are
where "convenience with modest runtime" will be won or lost; each needs a
concrete case and a measurement plan, not only prose.

**F6 — Advanced control should be opt-in and visibly bounded.** *Evidence:* the
continuity principle requires a visible source/type/target boundary for a
semantic jump; the beginner and agent goals require ordinary code to stay
readable; the memory review recommends defining the ordinary static path first.
*Interpretation:* an advanced memory tier can coexist with ordinary scripting only
if its entry is explicit. *Recommendation:* keep raw/placement/ownership-heavy
features out of the ordinary path, and require the boundary to be visible.

### Remaining questions

- **Q1 — Milestone membership.** Which exercise stages, host facilities, and
  challenge formats are binding for the first release? (INV-002, INV-003,
  INV-004)
- **Q2 — Memory-control promise.** Which level (M0–M4) is promised in the everyday
  tier, and which are advanced-tier only? (INV-041 through INV-053)
- **Q3 — Copy and resources.** What does copying a resource-owning value mean,
  and which types are copy-eligible? (INV-041, INV-043, INV-053)
- **Q4 — Views and escape.** Are slices/borrows exposed in ordinary code, and
  what proves that a view does not outlive its backing storage? (INV-044,
  INV-045, INV-046, INV-056)
- **Q5 — Placement and cleanup.** Does `= ?` promise no-zero work, or only permit
  it? When is storage reclaimed, and what happens on allocation failure?
  (INV-047, INV-048, INV-049, INV-040)
- **Q6 — Runtime and measurement.** Which runtime support is acceptable for
  panics, failure aggregation, and zero callables, and which measurements count
  as evidence for "near C"? (INV-064, INV-065, INV-074)
- **Q7 — Host and library boundary.** Are host I/O and a standard library part of
  the language's practical definition or a separate product tier? (INV-067,
  INV-071)
- **Q8 — Systems scope.** Are FFI, concurrency, and raw memory in the first
  milestone, a later milestone, or explicitly out of scope? (INV-052, INV-066,
  INV-068, INV-069, INV-070)
- **Q9 — Audience surface.** Does "one language for beginners, experts, and
  agents" permit advanced syntax to be optional, or does it require one uniform
  surface? (INV-003, INV-072, INV-075)

## Decision references

- [LiteLang white paper](../docs/white-paper.md): foundational philosophy and
  review criteria; not a proposal.
- [Principles and goals](../docs/principles.md): established direction.
- [Decision ledger](../docs/decisions-and-open-questions.md#established-direction):
  selected fragments and open contracts.
- [Naming and versioning](../docs/versioning-and-naming.md#8-proposal-versioning):
  proposal and release process.
- [LP-0009](../docs/proposals/LP-0009-flat-failure-capture.md),
  [LP-0010](../docs/proposals/LP-0010-outcome-extraction-and-exhaustion.md), and
  [LP-0018](../docs/proposals/LP-0018-implicit-panics-without-effect-declarations.md)
  select failure-related rules relevant to the cost side of this topic.
- No accepted decision selects a workload tier, a memory-control level, or a
  conflict-adjudication procedure. Target releases remain unassigned.

## Handoff

The question is which workloads bind the language and what memory control it
promises, not which mechanism to implement. The evidence gathered here is the
goal statements, the exercise and challenge inventories, and the selected/open
memory fragments at revision `c59f743`. The unresolved assumptions are the
milestone membership (Q1), the promised memory level (Q2), and the acceptability
of runtime support for failures and cleanup (Q6). A contributor should start with
Q1, because every later boundary depends on it; INV-002 owns the detailed
coverage inventory, and the memory topics own the mechanism questions. No
language rule should be inferred from this note.
