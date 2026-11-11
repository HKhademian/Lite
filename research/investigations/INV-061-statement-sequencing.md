# INV-061 — Statement sequencing in compiler applications

Status: recorded (sequential report statements implemented; general control flow remains open)
Contributor: redacted (agent-assisted)
Last updated: 2026-10-31
Catalog brief: [INV-061](TOPICS.md#inv-061)

## Delivery

The restricted TypeScript and C compiler applications ([ts-emitter.lts](../../compiler/ts-emitter.lts) and [c-emitter.lts](../../compiler/c-emitter.lts)) are advanced from a single `report(integer);` statement to arbitrary sequences of `report(integer);` statements over the whole source input.

This is implemented using existing approved Lite language features:
- `List<String>` with `mut` and `push_back` to collect parsed and normalized integer string representations.
- Sequential loop over source input indices advancing past spaces and semicolons.
- Emits readable TypeScript returning the concatenated string with newlines.
- Emits readable C invoking `fputs` with the concatenated string with newlines.
- Preserves immediate rejection with exit code 2 and diagnostic errors on empty source, malformed statements, unsupported trailing source, or invalid integers before artifact output.

No new syntax, AST structures, or host runtime features were introduced.

## Evidence

- Strict no-emit TypeScript checking (`tsc --noEmit`) passes with zero diagnostics.
- All 148 interpreter test groups pass under Node 26.13.0 and TypeScript 7.0.2.
- The shared `reportLiteralPrograms` test corpus includes single-statement and multi-statement programs.
- All admitted cases exhibit byte-for-byte stdout and stderr parity, as well as exact exit status parity, across:
  1. Direct igniter execution (`lite run`)
  2. Native C binary compilation with `cc` (`-std=c11 -Wall -Wextra -Werror`)
  3. Strict TypeScript execution through a Node runner
- VS Code TextMate grammar test suite passes completely.
