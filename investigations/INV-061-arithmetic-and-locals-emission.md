# INV-061 — Arithmetic expressions and immutable locals in the restricted emitters

Status: recorded (bounded emitter increment; general compiler stages and self-rebuild remain open)
Contributor: redacted (agent-assisted)
Last updated: 2026-10-31
Catalog brief: [INV-061](TOPICS.md#inv-061)
Compatible interpreter: no igniter change; runs on alpha.22 and the later alias checkpoint `d7fdd3e`

## Selected scope

Under automatic selected-scope progression from the alias checkpoint, the
restricted [TS](../compiler/ts-emitter.lts) and
[C](../compiler/c-emitter.lts) compiler applications advance from
sequences of literal `report(integer);` statements to:

- `report(<integer expression>);` over decimal Int literals and previously
  declared immutable Int locals, with parentheses, unary `+`/`-`, and
  left-associative `*`/`/` above `+`/`-`.
- Immutable locals `x := <integer expression>;`, lowered to `const` in TS and
  `int64_t` in C11.
- Whole-source sequencing of both statement forms, keeping the existing
  optional logical source name after `--`.

No new Lite syntax, builtin, file/process API or igniter change is introduced.
This is ordinary application code using functions, tuples, lists, recursion and
checked Int arithmetic that the igniter already supports.

## Lowering and runtime shape

The emitter parses with precedence climbing and evaluates every expression at
compile time under the igniter's signed 64-bit Int semantics. The emitted
artifact performs the same arithmetic again with a target representation chosen
to preserve all admitted values:

- TypeScript uses `bigint` literals (`1n`, `-1n`) and BigInt operators; `main`
  formats each report with `(<expression>).toString()` and appends `"\n"`.
- C uses `int64_t` expressions, writes each report with
  `printf("%" PRId64 "\n", (int64_t)(<expression>))`, and returns nonzero if a
  write reports an error. `<stdio.h>` and `<inttypes.h>` are included. Every
  literal is emitted through `INT64_C(...)` (or `INT64_MIN`) so arithmetic is
  performed in 64-bit types even when the value fits `int`.
- The minimum signed value is emitted as `INT64_MIN` in C because the positive
  literal `9223372036854775808` is not an in-range signed literal there.
- Source locals are emitted in source order before reports. They are immutable
  and effect-free, so this hoisting cannot change observable output.
- Runtime local names are prefixed with `lite_` to prevent collisions with
  generated C names (`status`), library names (`printf`) and macros
  (`INT64_MIN`). Source spelling remains only in diagnostics.
- Every source local is followed by `void`/`(void)` so generated TS and C still
  pass `noUnusedLocals` and `-Werror` checking whether or not the local happens
  to be reported.

Compile-time evaluation is not optional validation decoration: it rejects any
expression whose intermediate or final value leaves signed 64-bit range, any
division by zero, and `INT64_MIN / -1` before artifact bytes are emitted. The
emitted operations therefore remain in range even though C signed overflow would
otherwise be undefined and BigInt would otherwise grow without bound.

## Diagnostics

Before any artifact output, both applications reject with status 2:

- integer literals and expression results outside signed 64-bit range,
- division by zero in an integer expression,
- unknown values and duplicate local names,
- a missing `:=` after a local name or a missing `;` after its declaration,
- malformed, unsupported or trailing source such as strings, calls, decimals or
  injected statements.

Diagnostics retain the optional logical source name prefix. `report` still
accepts an optional trailing semicolon; local declarations require one.

## Evidence

The arithmetic/local corpus at this checkpoint had 28 programs. It covers signed literal
boundaries, leading signs and zeroes, multi-line whitespace, multiple reports,
precedence and associativity, nested parentheses, unary signs, negative
division, expression-built Int minimum, expressions that exceed 32-bit range but
stay inside Int, locals that depend on earlier locals, locals named `status`,
`printf` and `INT64_MIN`, and an unreported local.

- Strict `tsc --noEmit` checking passes for the igniter and generated TS cores.
- All 153 interpreter groups pass under Node 26.12.1/TypeScript 7.0.2; all 9
  editor grammar groups pass.
- Emitted TS, emitted TS translated to ES-module JavaScript, native C built with
  `cc -std=c11 -Wall -Wextra -Werror`, and direct igniter execution agree on raw
  stdout/stderr bytes, status and signal for every admitted program. The native
  group ran with Apple clang 21.0.0 targeting arm64-apple-darwin27.0.0; it skips
  explicitly where a C compiler is unavailable.
- The checked-in [TS](../compiler/generated/report-42.ts) and
  [C](../compiler/generated/report-42.c) references were regenerated from
  `report(42);` and the checked-in TS adapter still prints `42`.
- Dedicated tests assert the exact emitted bytes for a program combining locals,
  arithmetic and reports, and confirm arithmetic faults fail before output.

## Limits

This remains a tiny admitted class, not a general Lite compiler. It has no
runtime input, strings, calls, functions, conditionals, loops, mutable locals or
control flow in compiled source, and no source maps or generated fault locations.
Overflow and division by zero are compile-time rejections (status 2), not emitted
runtime panic parity with the igniter (which would panic with status 1). C output
depends on the C11 standard library and `int64_t`/`PRId64` availability. The TS
core now requires BigInt, so the earlier AssemblyScript report-core probe does
not establish Wasm compatibility for this form.

No self-hosted compiler, full-language parser, ABI/library export, browser/Wasm
claim, performance result or universal equivalence proof follows. Closed pipes,
resource exhaustion and host failure paths remain outside the tested contract.
This application increment does not move the alpha.22 tag or add an igniter
feature; it is a checkpointed main-branch delivery after `d7fdd3e`.
