# Investigation catalog

Status: **topic inventory only**, established 2026-10-27; lightweight execution and multilingual learning focuses added 2026-10-28. The 75 topics track their individual investigation status in TOPICS.md; existing language documents are starting evidence, not completed investigations.

This directory is a contributor workspace for agents and developers, outside the
language draft in `docs/`. It records what can be investigated and where to begin.
Its questions, examples, options, and recommendations are non-normative. A topic's
presence does not select a feature or commit it to the first milestone.

## Context

**Immediate focus, clarified 2026-10-30:** reach the tiny runnable
[FVP (first viable product)](../docs/principles.md#immediate-focus-first-viable-product).
Investigate its concrete blockers rather than walking the catalog in numeric
order or completing the whole language design first. .lt/.lts module/import
architecture and the explicitly later investigations are not FVP gates.

The intended direction is modern scripting convenience with as much native-like
memory control as practical, restricted raw-pointer access, substantial compiler
work, and efficient everyday programs with modest runtime requirements. The
[selected working targets](../docs/principles.md#first-working-targets) begin with
a tiny executable demonstrator for experimentation, followed by practical scripts
with command-line arguments, console I/O, and file processing. These goals guide
questions; they do not settle an ownership model, backend, runtime mechanism, or
benchmark.

The selected [source kinds](../docs/modules-and-packages.md#distinct-script-and-module-files)
distinguish convenient .lts scripts from .lt module files with no implicit
imports, including core type names. Even standard modules should be replaceable;
the mechanism and script-run convenience/disclosure proposal remain open.

The [progressive exercise catalog](../samples/list.md) and
[challenge corpus](../challenges/README.md) provide concrete use cases. Their full
contents are not automatically a frozen acceptance suite. The exercise-coverage
topic records the question of what the milestone includes.

## Lightweight native execution focus

The user reaffirmed lightness, fast execution, small runtime support, and small
final executables as core priorities on 2026-10-28. The [owning design page](../docs/memory-and-performance.md#lightweight-native-execution-priority)
records those selected goals. The [focused question map](lightweight-native-execution.md)
connects memory, compiler, runtime, optimization, and evaluation topics and adds
16 bounded questions. Their status remains not started. The focus does not select
an ownership mechanism, backend, numeric budget, implementation sequence, or
priority ordering for the entire catalog.

## Multilingual source and learning focus

The [multilingual source proposal](../docs/multilingual-source-and-learning.md)
records learning programming in a familiar human language with an optional bridge
to simple English. Salam joins the project's reference programming languages.
The [question map](multilingual-source-and-learning.md) adds 12 not-started
questions under lexical structure, tooling/diagnostics, and testing/verification,
with links to existing goals, API, Unicode, and footprint work. It does not select
translated keywords, language packs, source conversion, or a learning outcome.

## Start a topic

1. Find its stable `INV-NNN` ID below and read the [topic brief](TOPICS.md).
   Broader topics also link to [starter subtopics](SUBTOPICS.md): choose one
   bounded question, or name a different question within the topic's scope.
2. Follow its starting references, then check the current
   [decision ledger](../docs/decisions-and-open-questions.md) and
   [normative page map](../docs/normative-pages.md). Reference links are entry
   points, not an exhaustive authority list. Shared references do not imply
   dependencies or an investigation order.
3. When investigation work is requested, copy
   [the note template](NOTE-TEMPLATE.md) to a descriptive root-level file here,
   such as `INV-043-01-responsibility-boundaries.md`. Replace template fields,
   identify the subtopics covered, and link the note from the parent topic's
   **Investigation** line in `TOPICS.md`. A whole-topic note may retain a name
   such as `INV-043-ownership.md`.
4. Update that line's status and contributor as work proceeds, keeping the ID and
   scope stable. Read an existing note before opening another for the same topic.
5. Follow the [atomic commit requirement](#atomic-commit-requirement) before
   handing off or reporting the investigation update as complete.

The catalog itself does not request investigations, reviews, implementation,
delegation, or draft changes. Topic numbers preserve the discussion's inventory;
they are not priorities, phases, dependencies, or a roadmap. Investigation notes
are tracked on each topic's **Investigation** line and remain non-normative.

## Starter subtopics

The [subtopic catalog](SUBTOPICS.md) contains 173 concrete questions across 41
broader topics. These are entry points, not an exhaustive decomposition.
Topics without subtopics remain available at their existing scope; their lack of
subtopics does not imply lower importance or readiness.

Subtopic IDs extend the parent ID, for example `INV-043.01`. Keep them stable;
append new IDs rather than renumbering existing entries. Links use anchors such
as `SUBTOPICS.md#inv-043-01`. Neither parent nor subtopic numbering defines an
execution order. Cross-references identify related contracts, not dependencies.

Start with one independently answerable question and its concrete cases. Add
depth when evidence exposes another question; there is no requirement to fill
every topic with subtopics before investigation can begin. Questions involving
multiple areas should identify which topic owns the answer and link the others.

## Status and handoff

Each topic's **Investigation** line is the tracking location. Use `not started`,
`in progress`, `waiting for input`, or `recorded`, with a contributor and note link
once work starts. `recorded` means findings and remaining questions have been
written down; it does not mean a feature is selected or implemented. A waiting
note should name the missing information so another contributor can resume.

For scoped work, list each note with the subtopic IDs it covers on the parent
tracking line. Subtopics begin as `not started`; when work starts, track their
individual status in their notes. A parent's `recorded` status describes the
linked findings and their stated coverage, not resolution of every subtopic or
completion of the whole language area.

Keep observed facts, selected contracts, proposals, and recommendations distinct.
Recheck the current repository when starting: references and unresolved boundaries
can change. Documentation checks and experiments in other languages are not
LiteLang compiler or runtime verification.

Accepted decisions belong in the existing proposal/decision process and their
owning language pages. Link them from the investigation; an investigation note
does not change the language contract by itself. Preserve unrelated working-tree
changes when contributing.

## Reconsidering decisions and postponed ideas

This applies to **every investigation point**. A selected decision is the current
baseline, not a permanent constraint or an exemption from review. An
investigation may find that an earlier rule is inconsistent, unnecessarily
restrictive, or no longer the best fit. A later result can also remove the
reason an idea was postponed and make that idea worth reconsidering.

- Check selected rules as critically as open proposals. Do not skip a relevant
  question merely because a decision was recorded earlier.
- When a contradiction or changed assumption appears, identify the affected
  decisions and give concrete cases showing the problem. Compare retaining,
  revising, and replacing the earlier rule, including effects on related topics.
- Revisit postponed ideas when new evidence or resolved dependencies change
  their feasibility. Record why the earlier postponement may no longer apply;
  discovering a connection does not select the idea or restart every deferred topic.
- Keep current behavior, proposed replacements, and newly accepted changes
  distinct. Until replaced through the decision process, the current rule remains
  the baseline; do not silently invent a third rule to reconcile conflicting pages.
- For an accepted revision, record what it supersedes and why, then update the
  owning pages, ledger/proposal records, investigation tracking, and affected
  examples/references in the same [atomic commit](#atomic-commit-requirement).
  Keep historical alternatives clearly labeled and preserve unrelated work.

The purpose is to reach a coherent working language. Previous selection or
postponement is evidence about the design's history, not proof that it must stay.

## Atomic commit requirement

Investigation changes and accepted decisions **must be committed atomically**.
Each commit must contain one coherent investigation result or decision, together
with every documentation change needed to make that result consistent.

- Commit the investigation note, affected topic/subtopic tracking, and relevant
  links together. For an accepted decision, include its owning language page,
  decision-ledger/proposal record, and affected summaries or examples in the same
  commit. Preserve the distinction between findings, proposals, and selected rules.
- Keep independent questions or decisions in separate focused commits. A bounded
  result may record unresolved questions; committing it does not resolve them or
  mark the whole topic complete.
- Review the diff, run checks appropriate to the change, and stage only the
  intended files or hunks. Preserve unrelated work; do not use a blanket stage
  operation when the working tree contains unrelated changes.
- Create the commit before reporting that unit of work complete or moving to
  another independent investigation unit. Report its commit ID and verification
  limits in the handoff. If committing is blocked, preserve the work and report
  the blocker and uncommitted scope explicitly; do not claim completion.

This is a required contributor workflow for agents and developers, including
updates to existing notes. It does not require a decision before findings can be
recorded, and it does not authorize implementing a discussed feature.

## Topics

- [INV-001 — Language goals and boundaries](TOPICS.md#inv-001)
- [INV-002 — Exercise coverage](TOPICS.md#inv-002)
- [INV-003 — Scripting model](TOPICS.md#inv-003)
- [INV-004 — Execution modes](TOPICS.md#inv-004)
- [INV-005 — Program lifecycle](TOPICS.md#inv-005)
- [INV-006 — Source organization](TOPICS.md#inv-006)
- [INV-007 — Packages and dependencies](TOPICS.md#inv-007)
- [INV-008 — Lexical structure](TOPICS.md#inv-008)
- [INV-009 — Syntax and parsing](TOPICS.md#inv-009)
- [INV-010 — Declarations and bindings](TOPICS.md#inv-010)
- [INV-011 — Scopes and name resolution](TOPICS.md#inv-011)
- [INV-012 — Expressions and blocks](TOPICS.md#inv-012)
- [INV-013 — Operators](TOPICS.md#inv-013)
- [INV-014 — Numeric semantics](TOPICS.md#inv-014)
- [INV-015 — Boolean values and conditions](TOPICS.md#inv-015)
- [INV-016 — Text and characters](TOPICS.md#inv-016)
- [INV-017 — Binary data](TOPICS.md#inv-017)
- [INV-018 — Type-system foundations](TOPICS.md#inv-018)
- [INV-019 — Conversions and coercions](TOPICS.md#inv-019)
- [INV-020 — Unit, empty, and never types](TOPICS.md#inv-020)
- [INV-021 — Optional values](TOPICS.md#inv-021)
- [INV-022 — Tuples](TOPICS.md#inv-022)
- [INV-023 — Records](TOPICS.md#inv-023)
- [INV-024 — Enums and unions](TOPICS.md#inv-024)
- [INV-025 — Type refinement](TOPICS.md#inv-025)
- [INV-026 — Patterns and destructuring](TOPICS.md#inv-026)
- [INV-027 — Generics](TOPICS.md#inv-027)
- [INV-028 — Interfaces and capabilities](TOPICS.md#inv-028)
- [INV-029 — Type aliases and distinct types](TOPICS.md#inv-029)
- [INV-030 — Functions and calls](TOPICS.md#inv-030)
- [INV-031 — Argument routing](TOPICS.md#inv-031)
- [INV-032 — Callable values](TOPICS.md#inv-032)
- [INV-033 — Closures and captures](TOPICS.md#inv-033)
- [INV-034 — Conditionals](TOPICS.md#inv-034)
- [INV-035 — Loops and iteration](TOPICS.md#inv-035)
- [INV-036 — Control transfer](TOPICS.md#inv-036)
- [INV-037 — Returned errors](TOPICS.md#inv-037)
- [INV-038 — Panics and checked faults](TOPICS.md#inv-038)
- [INV-039 — Failure aggregation](TOPICS.md#inv-039)
- [INV-040 — Cleanup and resources](TOPICS.md#inv-040)
- [INV-041 — Value semantics](TOPICS.md#inv-041)
- [INV-042 — Mutability and access permissions](TOPICS.md#inv-042)
- [INV-043 — Ownership](TOPICS.md#inv-043)
- [INV-044 — References and borrowing](TOPICS.md#inv-044)
- [INV-045 — Lifetimes and escape analysis](TOPICS.md#inv-045)
- [INV-046 — Aliasing and exclusivity](TOPICS.md#inv-046)
- [INV-047 — Allocation control](TOPICS.md#inv-047)
- [INV-048 — Storage placement](TOPICS.md#inv-048)
- [INV-049 — Initialization safety](TOPICS.md#inv-049)
- [INV-050 — Memory layout](TOPICS.md#inv-050)
- [INV-051 — Addresses and identity](TOPICS.md#inv-051)
- [INV-052 — Raw memory boundaries](TOPICS.md#inv-052)
- [INV-053 — Memory reclamation](TOPICS.md#inv-053)
- [INV-054 — Fixed arrays](TOPICS.md#inv-054)
- [INV-055 — Runtime-sized arrays and lists](TOPICS.md#inv-055)
- [INV-056 — Slices and views](TOPICS.md#inv-056)
- [INV-057 — Collection protocols](TOPICS.md#inv-057)
- [INV-058 — Maps, sets, and standard structures](TOPICS.md#inv-058)
- [INV-059 — Collection algorithms](TOPICS.md#inv-059)
- [INV-060 — Iterator behavior](TOPICS.md#inv-060)
- [INV-061 — Compiler structure](TOPICS.md#inv-061)
- [INV-062 — Compile-time computation](TOPICS.md#inv-062)
- [INV-063 — Optimization contracts](TOPICS.md#inv-063)
- [INV-064 — Runtime responsibilities](TOPICS.md#inv-064)
- [INV-065 — Calling conventions and ABI](TOPICS.md#inv-065)
- [INV-066 — Foreign interfaces](TOPICS.md#inv-066)
- [INV-067 — Host interaction](TOPICS.md#inv-067)
- [INV-068 — Concurrency and parallelism](TOPICS.md#inv-068)
- [INV-069 — Memory ordering](TOPICS.md#inv-069)
- [INV-070 — Platform targets](TOPICS.md#inv-070)
- [INV-071 — Standard-library boundaries](TOPICS.md#inv-071)
- [INV-072 — Tooling and diagnostics](TOPICS.md#inv-072)
- [INV-073 — Testing and verification](TOPICS.md#inv-073)
- [INV-074 — Performance evaluation](TOPICS.md#inv-074)
- [INV-075 — Language evolution](TOPICS.md#inv-075)
