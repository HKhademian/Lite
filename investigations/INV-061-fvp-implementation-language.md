# INV-061 — FVP interpreter implementation language

Status: in progress
Contributor: redacted (agent-assisted)
Last updated: 2026-10-30
Catalog brief: [INV-061](TOPICS.md#inv-061)
Covered scope: bounded whole-topic question — language and minimal structure for
the experimental interpreter, not the eventual native compiler.

This is a non-normative proposal. No implementation language is selected yet.

## Evidence and recommendation

Baseline: `a814652`; working tree clean before this note. The local environment
has Python 3.15.1, plus node and rustc commands. No existing interpreter package
or implementation-language manifest was found in the repository.

**Recommend Python 3 with the standard library only** for the first interpreter.
Keep a tokenizer, parser producing a syntax tree, checker, and direct evaluator;
use the temporary input/report/exit adapters. Do not use Python eval/exec to
interpret LiteLang source. No external parser framework or package-manager setup
is proposed as a prerequisite for the first executable checkpoint.

This is a practical scope preference, not a measured delivery-time comparison
against TypeScript or Rust. Either remains a possible alternative. The choice
does not select the implementation language of a future native compiler.

The [selected checkpoint](../docs/tooling-and-learning.md#first-executable-checkpoint)
and [numeric profile](../docs/numbers.md#temporary-fvp-numeric-profile) still
govern observable behavior: explicitly enforce signed 64-bit bounds, integer
division, floating faults, binding identity/types, and explicit I/O rather than
inherit host semantics. Keep text behavior minimal and document actual limits.

## Verification and handoff

Checked local command availability, Python's reported version, current scope,
note/tracking links, fences, and focused diff consistency. No interpreter was
implemented or executed, and no speed/native-footprint result is claimed.

Choose the host language, then implement the selected first checkpoint with
focused successful and rejected-program examples. Keep later language features
and native compilation outside that first implementation unit.
