# INV-061 — FVP interpreter implementation language

Status: recorded (Python igniter and early self-hosting direction selected; bootstrap details open)
Contributor: redacted (agent-assisted)
Last updated: 2026-10-30
Catalog brief: [INV-061](TOPICS.md#inv-061)
Covered scope: bounded whole-topic question — language and minimal structure for
the experimental interpreter, subsequent self-hosting, and source-bootstrap continuity.

This is a non-normative record of the selected bootstrap direction. No interpreter
or compiler implementation is claimed.

## Igniter and self-hosting selection, 2026-10-30

The user accepts Python only as an **igniter**, emphasizing minimal infrastructure
and a switch to self-hosting as soon as LiteLang can implement its compiler.
Retire the actively developed Python path after that transition. Preserve the
versioned igniter and compatible Lite-written compiler sources so a new user can
bootstrap forward to the current compiler. Baseline for selection: `b13887e`.

Owner: [Python igniter and early self-hosting](../docs/tooling-and-learning.md#python-igniter-and-early-self-hosting).
Ledger: [minimal igniter and self-hosting](../docs/decisions-and-open-questions.md#minimal-python-igniter-and-early-self-hosting-2026-10-30).

Keep Python 3/standard-library implementation minimal and disposable. Do not
build a long-term Python compiler platform. The first supported checkpoint
remains unchanged; later language features should enable a Lite-written compiler
without waiting for a complete language or stdlib. A concrete sufficient subset
and transition criterion have not yet been selected.

Preserving the seed differs from maintaining Python as the real compiler forever.
Later compiler source may require newer syntax/features, so a compatible sequence
of compiler sources may be necessary. The igniter can interpret an early
Lite-written compiler; its output must still have a defined execution route to
build the next stage. Stage artifacts, backend, first compatible revision, host
tools, version links, rebuild checks, and exact distribution remain open under
[INV-061.06](SUBTOPICS.md#inv-061-06). No direct seed-to-latest capability or
verified source chain is claimed.

## Bootstrap versioning clarification, 2026-10-30

The user emphasizes tagged versioning and version control to make the preserved
source route usable. Select stable tags at exact igniter/compiler milestone
commits, preserved referenced source history, and a compatibility map recording
which builder revision builds each compiler source revision. Include host
requirements and build/check steps as the chain becomes real. Do not move/delete
published or chain-referenced tags; corrections get new tags/versions.

Owner: [bootstrap source continuity](../docs/versioning-and-naming.md#bootstrap-source-continuity).
Ledger: [stable tags and history](../docs/decisions-and-open-questions.md#stable-bootstrap-version-tags-and-source-history-2026-10-30).
This does not require tagging every investigation commit or create a release now.
Milestone numbers, igniter tag spelling, record format, and implemented chain
checks remain open. No successful source rebuild is claimed.

## Evidence and recommendation

Baseline: `a814652`; working tree clean before this note. The local environment
has Python 3.15.1, plus node and rustc commands. No existing interpreter package
or implementation-language manifest was found in the repository.

**Selected: Python 3 with the standard library only**, bounded as the igniter
above, for the first interpreter.
Keep a tokenizer, parser producing a syntax tree, checker, and direct evaluator;
use the temporary input/report/exit adapters. Do not use Python eval/exec to
interpret LiteLang source. No external parser framework or package-manager setup
is proposed as a prerequisite for the first executable checkpoint.

This is a practical scope preference, not a measured delivery-time comparison
against TypeScript or Rust. The user's refinement now selects LiteLang as the
intended self-hosted compiler language; those host-language alternatives remain
historical options rather than the current choice.

The [selected checkpoint](../docs/tooling-and-learning.md#first-executable-checkpoint)
and [numeric profile](../docs/numbers.md#temporary-fvp-numeric-profile) still
govern observable behavior: explicitly enforce signed 64-bit bounds, integer
division, floating faults, binding identity/types, and explicit I/O rather than
inherit host semantics. Keep text behavior minimal and document actual limits.

## Verification and handoff

Checked local command availability, Python's reported version, current scope,
note/tracking links, fences, and focused diff consistency. No interpreter was
implemented or executed, and no speed/native-footprint result is claimed.

The host language is selected as the minimal Python igniter. Implement the
selected first checkpoint with focused successful and rejected-program examples,
then grow toward the Lite-written compiler. Keep a complete self-hosted compiler,
bootstrap release system, and native backend outside that first implementation
unit. Preserve the source-bootstrap direction as the compiler evolves.
