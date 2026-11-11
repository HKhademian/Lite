# INV-061 — FVP interpreter implementation language

Status: recorded (TypeScript/Node replaces Python; first checkpoint implemented; self-hosting open)
Contributor: project contributor (agent-assisted)
Last updated: 2026-10-30
Catalog brief: [INV-061](TOPICS.md#inv-061)
Covered scope: bounded whole-topic question — language and minimal structure for
the experimental interpreter, subsequent self-hosting, and source-bootstrap continuity.

This note records the bootstrap direction and bounded implementation evidence.
Historical Python sections below are superseded by the follow-up here.

Current bounded follow-ups, **2026-10-31**: the
[Lite arithmetic front-end exercise](INV-061-lite-arithmetic-front-end.md) runs
on preserved alpha.15 without host additions. The
[output/transition direction](INV-061-first-compiler-output.md) now records the
user's TS-first bootstrap/web target, overlapping igniter/self-hosted development,
permanent readable TS seed and byte-output equivalence criterion. C is selected
as the first native and maintained library/project export target; possible AS/Wasm
support is an investigation. The [first TS emitter](INV-061-ts-emission-and-parity.md)
now has bounded execution parity; no self-rebuilding compiler is claimed.

## TypeScript/Node replacement and implementation, 2026-10-30

The user requests tightly typed TypeScript, run directly by the latest stable
Node, instead of Python. The interrupted Python implementation had made no code
changes. TypeScript/Node is now the igniter host, with early LiteLang self-hosting,
minimal infrastructure, and stable bootstrap tags/source history retained.

Verified Node 26.13.0 via the official release index/download page and TypeScript
7.0.2 via npm (official TypeScript download page identifies the 7.0 line).
Versions and Node typings are pinned in igniter/.node-version/package-lock.json.
The downloaded official Node binary was used for actual tests; the user's global
Node installation was not upgraded. Node strips types without checking them,
so the separate strict no-emit check is required. References:
[Node execution](https://nodejs.org/api/typescript.html),
[Node releases](https://nodejs.org/en/download),
[TypeScript installation](https://www.typescriptlang.org/download/),
[strict options](https://www.typescriptlang.org/tsconfig/).

The [igniter guide](../../igniter/README.md) documents the actual runnable checkpoint,
provisional helper behavior, strict typing, and limitations. The implementation
uses no runtime npm dependencies, no JS eval/exec, and no transpilation step.
Tests run the real evaluator and CLI; they cover pre-execution checking, exact
64-bit integer division/overflow, finite floats, shadowing, temporary I/O/exit,
and focused reported outcomes from lessons 001/002/020. Wider language features,
a native backend, and a self-hosted compiler are not implemented.

Initial verification: strict tsc --noEmit passed; all 15 Node test groups passed
on Node 26.13.0 with TypeScript 7.0.2. The first input 7/5 probe reports 24.
No native performance or compiler bootstrap-chain claim follows from those tests.

## Igniter and self-hosting selection, 2026-10-30

Historical host choice: Python was selected here, then replaced above before
any Python implementation. The self-hosting and source preservation direction
remains in force with the TypeScript/Node igniter.

The user accepts Python only as an **igniter**, emphasizing minimal infrastructure
and a switch to self-hosting as soon as LiteLang can implement its compiler.
Retire the actively developed Python path after that transition. Preserve the
versioned igniter and compatible Lite-written compiler sources so a new user can
bootstrap forward to the current compiler. Baseline for selection: `b13887e`.

Owner: [Python igniter and early self-hosting](../../docs/tooling-and-learning.md#typescript-igniter-and-early-self-hosting).
Ledger: [minimal igniter and self-hosting](../../docs/decisions-and-open-questions.md#minimal-python-igniter-and-early-self-hosting-2026-10-30).

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

Owner: [bootstrap source continuity](../../docs/versioning-and-naming.md#bootstrap-source-continuity).
Ledger: [stable tags and history](../../docs/decisions-and-open-questions.md#stable-bootstrap-version-tags-and-source-history-2026-10-30).
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

The [selected checkpoint](../../docs/tooling-and-learning.md#first-executable-checkpoint)
and [numeric profile](../../docs/numbers.md#temporary-fvp-numeric-profile) still
govern observable behavior: explicitly enforce signed 64-bit bounds, integer
division, floating faults, binding identity/types, and explicit I/O rather than
inherit host semantics. Keep text behavior minimal and document actual limits.

## Verification and handoff

Checked local command availability, Python's reported version, current scope,
note/tracking links, fences, and focused diff consistency. No interpreter was
implemented or executed, and no speed/native-footprint result is claimed.

The TypeScript/Node replacement above supersedes the original Python handoff.
The first checkpoint now runs; grow the needed language features toward the
Lite-written compiler. Preserve the tested seed, version tags, and source route;
do not expand the host-language implementation into a permanent framework.
