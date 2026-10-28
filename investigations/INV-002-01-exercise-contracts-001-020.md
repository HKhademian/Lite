# INV-002 — Exercise coverage: contracts required by exercises 001–020

Status: in progress
Contributor: redacted (agent-assisted)
Last updated: 2026-10-28
Catalog brief: [INV-002](TOPICS.md#inv-002)
Covered subtopics: none — INV-002 has no starter subtopics, so this note answers a bounded question named within the topic's scope: *which language, library, host, and tooling contracts do the 20 written exercises require, and which have no selected rule?*

This is a non-normative investigation note outside the language draft. Recording
an option or recommendation here does not select a language rule.

## Investigation question

Which contracts does stage 01 of the exercise corpus — `samples/001` through
`samples/020`, the only files with written solutions — actually depend on, and
which of those are absent, open, or merely proposed?

Boundary: this note does not scope the full 520-exercise corpus or decide what
the first milestone includes (that remains INV-002 proper, unscoped). It does
address the second half of the starter question, "what would count as a solved
exercise," because no contract for it exists anywhere in `docs/`.

Coverage of the starter question: the missing-contract inventory for 001–020 is
answered at document level; the acceptance-mechanism options are recorded as
options, not selected. Milestone subset selection remains open.

## Current contracts and evidence

Repository revision: `c59f743`, 2026-10-27. The tracked tree matches that
revision; this note and the catalog edits are uncommitted working-tree changes,
so the earlier "working tree clean" claim is not accurate.

Construct inventory, read directly from the 20 files:

| Construct | Files | Owning page and status |
|---|---|---|
| `/* */` comments, also carrying expected answers | 20/20 | [comments](../docs/comments.md) — selected: neutral trivia, opaque-content formatting |
| `;` item separators | 20/20 | [lexical structure](../docs/lexical-structure.md) — selected `{ item; item; final_item }`; [grammar sketch](../docs/grammar-sketch.md) is a "descriptive outline, deliberately incomplete" |
| `:=` first initialization | 20/20 | [first initialization](../docs/first-initialization.md) — selected whole-value first initialization; full token/grammar integration remains grammar work |
| `var` plus `=` reassignment | 1/20 (`020_swap_values.lite`) | [immutability by default](../docs/immutability-by-default.md) — selected goal; later whole-value replacement requires `var` |
| Integer literals | 20/20 | [numbers](../docs/numbers.md) — leading-zero spelling selected; **exact numeric contract open** |
| Fractional literals (`4.0`, `3.14159`) | 11/20 | same page; floating representation and precision open |
| `/` and `%` truncating division and remainder | 18/20 | [division](../docs/division.md) — selected; parsing not settled |
| Parentheses and basic precedence | 20/20 | [operators](../docs/operators.md) — basic grouping selected; full expression integration open |

Not used by any file in 001–020: string literals, type annotations, functions,
collections, I/O, assertions, exit codes. No `"` character and no `: Int` /
`: Float` annotation occurs in these 20 files.

Gap evidence:

1. **Numeric contract** — [numbers status](../docs/numbers.md): "arithmetic fault
   channel selected, exact numeric contract open." Its open-decisions list names
   integer widths, floating defaults, decimal support, arithmetic promotions,
   literal polymorphism, casts, noninteger remainder/modulo, combined
   quotient/remainder APIs, fault triggers and payloads, wrapping operations, and
   range bounds. [samples/NOTES.md](../samples/NOTES.md) repeats that "the full
   numeric representation, literal typing, and compatibility rules remain open."
2. **No acceptance contract** — `grep -i exercise` over `docs/*.md` returns one
   incidental hit, unrelated to the corpus. The milestone statement exists only in
   [the catalog guide](README.md). The nearest acceptance rule is outside the
   draft, in [samples/list.md](../samples/list.md): suggested statuses *draft*,
   *blocked by design*, *blocked by library/host support*, *implemented but
   unverified*, *verified*, with "verification requires an actual available
   toolchain and observed results; documentation examples alone do not qualify."
   [samples/NOTES.md](../samples/NOTES.md) states that no printed answer,
   assertion API, or script exit-value convention is assumed.
3. **No execution path selected** — `lite fmt` and its read-only `--check` are the
   only selected commands in [tooling and learning](../docs/tooling-and-learning.md);
   `lite run` and `lite build` appear under "Run and build proposals" as "a
   proposal, not an implemented path."
4. **Underscore-operator scanning** — [samples/README.md](../samples/README.md)
   teaches `_/` and `_%`, while no written sample uses them;
   [lexical structure](../docs/lexical-structure.md) records "compact
   underscore/identifier scanning remains unresolved."
5. **Beyond this note's scope, recorded as context** — stage 11 says exact
   Option/Result construction "may remain a blocker"; stage 16 says real I/O
   "remains blocked until a host contract exists" (`samples/list.md`).

## Concrete cases

Ordinary cases from the written files (unselected syntax is not introduced
here; these forms already appear in the samples):

```text
/* 002 */ quotient := first / second;        /* 3 — selected truncating Int division */
/* 008 */ hours := total_seconds / 3600;     /* selected, integer operands */
/* 018 */ share_cents := bill_cents / friends;
          leftover_cents := bill_cents % friends;   /* % pairs with truncating / */
/* 020 */ var first_box := 7;  first_box = second_box;  /* var enables replacement */
```

Boundary cases that depend on open rules rather than selected ones:

```text
part: Int = 7.5 / 2;      /* storage boundary and assignment conversion: open */
part: Float = 2 / 7;      /* literal typing and expected-type propagation: open */
offset := rate_from / 2;  /* fine for 019's even rate; generalizing it needs
                             literal-default and promotion rules */
```

The teaching text in `samples/README.md` also states `part: Int = -7.5 _/ 2` is
`-4`; that form is reachable only after the compact underscore-operator scanning
question is settled, even though no written sample spells it.

Varying one property at a time: removing comments leaves every file valid under
the selected rules; removing `var` from 020 breaks only 020; replacing any
integer literal with a fractional one moves the file from "selected division
rule" onto "open literal-typing rule."

## Options and consequences

Acceptance mechanism — the "solved exercise" half of the starter question:

- **A — Read and compare (current de facto).** Expected answers stay in comments
  and a human or agent checks them. Zero language cost. Consequence: the corpus
  can never reach *verified* under its own definition, no compiler or diagnostic
  evidence is produced, and answer comments duplicate nothing that a harness
  could observe.
- **B — Harness-observed output.** `lite run` with fixed fixtures; a harness
  compares observed results with expected values. Consequence: requires a host
  output contract and a process exit contract, neither of which exists in any
  page; also forces a decision about where expected values live (comments vs
  fixture files).
- **C — In-program checks.** Each sample checks its own expected values; a
  mismatch uses the already-selected panic channel, and process exit status
  distinguishes pass from fail. Consequence: least new language surface — no print
  API required — but still needs an exit-status contract, and embedding checks
  makes beginner-facing files longer, which works against the teaching goal in
  the white paper.

Numeric contract — affects 20/20 files regardless of which acceptance option is
chosen. Options are those already recorded on the owning page (widths, defaults,
decimal support, promotions, literal polymorphism, casts, fault triggers); this
note adds no alternative and selects none.

Assumptions identified rather than silently chosen: that the milestone covers at
least 001–020; that fixed fixtures are acceptable in place of runtime input; that
comment answers remain documentation rather than the acceptance mechanism.

Selection recorded 2026-10-28: the design owner adopted **option C** for
001–020 (in-program checks; a mismatch uses the selected panic channel) and
**option B** as the later mechanism once a harness grades the corpus. Comment
answers stay documentation. This is a project acceptance policy recorded in a
non-normative note, not a language rule: it cannot operate until an exit-status
contract exists (INV-004/INV-005) and observation fixtures are defined
(INV-067/INV-073). No sample has been changed to embed checks.

## Verification and limits

What was checked: construct counts by reading `samples/001`–`020` directly;
status lines of `comments`, `lexical-structure`, `first-initialization`,
`immutability-by-default`, `numbers`, `division`, `operators`, `grammar-sketch`,
and `tooling-and-learning`; the 2026-10-27 decision ledger snapshot; the corpus
status vocabulary in `samples/list.md` and `samples/NOTES.md`.

How: text search and file reads at revision `c59f743`. Results: 20/20 files use
`:=` and comments; 1/20 uses `var`; 11/20 use fractional literals; no file uses
strings, annotations, or I/O; no page in `docs/` defines exercise acceptance.

Re-read on 2026-10-27 while closing this check: the counts above reproduce
(20 files; fractional literals in 004–007, 009–012, 014, 016, 017; `var` only in
020; zero string, annotation, or I/O matches), and the single incidental
`exercise` hit in `docs/` is still
[tuple-remainder-gradual-reasoning](../docs/tuple-remainder-gradual-reasoning.md).
No claim in the note changed; only the working-tree metadata was corrected.

Not checked and not claimed: any LiteLang execution, parsing, or type checking.
There is no compiler, so "implemented but unverified" stands for all 20 files.
Construct counts are observations of the current files and will drift as samples
change. No external technical claims were used.

## Findings and remaining questions

Evidence: the written exercises depend on a small, mostly selected surface, and
every dependency that is *not* selected is numeric representation or tooling.

Interpretation: the practical blockers for 001–020 are concentrated in two
places — the open numeric contract (needed by all 20 files) and the absence of any
execution/acceptance contract (needed to call any file *verified*). Grammar
completeness and underscore scanning are smaller, well-localized gaps.

Recommendation (non-normative): scope the first milestone as *parses under the
selected grammar, type-checks under the selected rules, and runs under a selected
`lite run` equivalent with a fixed fixture*; select a minimal host output-or-exit
contract first; prefer option C for the 20 written samples and option B once the
corpus is graded by a harness. Keep comment answers as documentation.

Remaining questions:

- Which exercises the milestone covers — INV-002 proper, still unscoped.
- Whether acceptance follows option A, B, or C — settled 2026-10-28 as C now,
  B later; the exit-status contract ([INV-004](TOPICS.md#inv-004),
  [INV-005](TOPICS.md#inv-005)) and observation mechanism
  ([INV-067](TOPICS.md#inv-067), [INV-073](TOPICS.md#inv-073)) remain open.
- Numeric representation, literal typing, and conversion —
  [INV-014](TOPICS.md#inv-014) ([numeric semantics](SUBTOPICS.md#inv-014)) owns
  the answer; this note only records that 001–020 cannot proceed without it.
- Whether underscore-operator scanning is resolved before any sample teaches
  `_/` — lexical structure, [INV-008](TOPICS.md#inv-008).

## Decision references

Selected rules relied on, with their owning pages: contextual division and
remainder ([division](../docs/division.md)), whole-value first initialization
([first initialization](../docs/first-initialization.md)), immutability by
default and `var` ([immutability](../docs/immutability-by-default.md)),
comment neutrality and formatting ([comments](../docs/comments.md)), formatter
commands and read-only check mode ([tooling](../docs/tooling-and-learning.md)).

No accepted decision or proposal covers numeric representation, execution modes,
host I/O, process exit status, or exercise acceptance. Nothing in this note is
presented as an accepted decision; no LP ID applies.

## Handoff

Question: which contracts do 001–020 need, and what would count as a solved
exercise? Evidence collected: the construct table above, the five gap findings,
and the three acceptance options. Unresolved assumptions: milestone subset,
acceptance option, numeric contract.

Resume at: (1) define the exit-status contract the selected option C needs —
needs [execution modes](TOPICS.md#inv-004) and [program lifecycle](TOPICS.md#inv-005),
not more corpus reading; (2) scope the milestone exercise subset, which reopens
INV-002 proper; (3) re-run the construct inventory once
samples 021+ gain written solutions, since stage 02 adds comparisons and branches
and stage 05 adds text, both absent here. Do not treat this note as an
implementation plan; no implementation work has been requested.
