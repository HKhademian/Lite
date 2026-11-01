# INV-061 — String values and multi-value reports in the restricted emitters

Status: recorded (bounded emitter increment; text operations, runtime input and self-rebuild remain open)
Contributor: redacted (agent-assisted)
Last updated: 2026-10-31
Catalog brief: [INV-061](TOPICS.md#inv-061)
Compatible interpreter: no igniter change; runs on alpha.22 and the later alias checkpoint `d7fdd3e`

## Selected scope

The restricted [TS](../compiler/ts-emitter.lts) and
[C](../compiler/c-emitter.lts) compiler applications gain a second
scalar type and a broader report surface:

- String literals with `\"`, `\\`, `\n`, `\r`, `\t`, raw UTF-8 and literal
  newlines; other escapes are rejected.
- Immutable String locals: `s := <string expression>;`.
- `+` concatenation when both operands are Strings. Mixed Int/String `+` is
  rejected, and `-`, `*`, `/` and unary signs remain Int-only.
- `report(<value>, ...)` with one or more Int or String values, joined by one
  space per boundary and one final newline, matching the igniter.
- Int arithmetic and Int/String locals from the preceding increment remain
  unchanged.

No text helpers, String indexing, adjacent string-literal joining, runtime
input, mutation, control flow or calls are admitted yet. No new Lite syntax or
igniter helper is introduced.

## Typed expression values

Both emitters now parse into a small typed result:

```text
Parsed := type (kind: String, code: String, intValue: Int, textValue: String, next: Int)
Local  := type (name: String, runtime: String, kind: String, code: String, intValue: Int, textValue: String)
```

`kind` is `Int` or `String`. The compile-time value is carried in `intValue` or
`textValue`; `code` is the target expression. This is the first non-Int value
category in the compiler and is reusable for `Bool` later. The aliases are
ordinary Lite source features, not compiler special cases.

## Lowering

- String expressions are closed constants in this slice. Concatenation and
  local-to-local copies are folded at compile time, so emitted C needs no
  allocation, ownership or cleanup runtime. C has no String `+` operator.
- TS String literals are escaped for `\`, `"`, newline, carriage return and tab.
  Raw UTF-8 passes through.
- C String literals escape the same characters plus `?` as `\?`, preventing
  trigraph interpretation under C11. Raw UTF-8 bytes pass through.
- A String local is `const lite_s = <literal>;` in TS and
  `const char *lite_s = <literal>;` in C. Runtime names keep the existing
  `lite_` prefix and every local is still voided for unused-local checking.
- Single-value reports keep the exact previous artifact shape:
  - Int TS: `(<code>).toString() + "\n"`
  - Int C: `printf("%" PRId64 "\n", (int64_t)(<code>))`
  - String TS: `<code> + "\n"`
  - String C: `printf("%s\n", <code>)`
- Multi-value reports join displayed values with a space and one newline. TS
  concatenates the pieces; C issues one checked `printf` per value, space and
  newline, and sets `status = 1` if any write fails.
- The checked `report(42);` TS and C references are unchanged by this increment.

## Diagnostics

Before any artifact bytes, both applications reject with status 2:

- mixed Int/String `+`,
- String operands to `-`, `*`, `/` or unary `+`/`-`,
- unterminated String literals and unterminated escapes,
- unsupported escapes such as `\q` or `\0`,
- missing report values after a comma,
- all earlier arithmetic range, division-by-zero, local and syntax faults.

Embedded NUL is a known boundary: Lite source can carry a NUL character, but the
compiler has no portable NUL literal to compare against and does not diagnose it.
C `printf("%s", ...)`/String literals would truncate at NUL, so source containing
NUL is outside the admitted class. Adjacent String literals (`"a" "b"`) are also
not admitted yet; the compiler reports `expected )`.

## Verification fixtures

The compiler corpus moved out of [test.ts](../igniter/test.ts) into one JSON
model plus a sibling `.lts` entry source per case under
[igniter/tests/compiler](../igniter/tests/compiler/). The schema and workflow are
documented in [igniter/tests/README.md](../igniter/tests/README.md).
Each case pairs a JSON model with a sibling `.lts` entry source. The model records
the source path, optional `stdin`, required `stdout`/`stderr` streams, and
`exitCode`. Each stream uses inline `text`, inline `bytes`, or a sibling `file`.
Filenames follow `NNN-MMM-title-subtitle.json`: category
`001` is program verification, category `002` is compiler rejection, and the
subcategory groups literals, arithmetic, locals, strings, multi-value reports,
hygiene or fault classes. There are **43 program cases** and **34 rejection
cases**.

- Program cases compile with both emitters, then compare the direct igniter,
  emitted TS, translated ES-module JS and native C against the same expected
  bytes/status/signal.
- Rejection cases run through both compiler applications and compare exact
  diagnostics/status with no artifact bytes.
- Expectation data is no longer a second inline copy in test code, and adding a
  case requires only a JSON file.

Invalid UTF-8 compiler input, `--check` behavior, source-name prefix behavior and
exact artifact-shape assertions remain targeted tests because their harness needs
bytes or artifact inspection rather than program input/output.

## Evidence

- Strict `tsc --noEmit` checking passes.
- All **169 interpreter test groups** pass under Node 26.12.1/TypeScript 7.0.2;
  all 9 editor grammar groups pass.
- All 43 program cases pass four-way execution parity; all 34 rejection
  cases pass exact diagnostics through both compilers.
- Native C builds with `cc -std=c11 -Wall -Wextra -Werror`; the run here used
  Apple clang 21.0.0 targeting arm64-apple-darwin27.0.0.
- The corpus covers empty/Unicode/multiline strings, quotes and backslashes,
  tabs, `%` and trigraph-prone `??/`, concatenation, String locals, multi-value
  reports, mixed-type rejections, malformed literals and the previous Int cases.
- The checked-in [TS](../compiler/generated/report-42.ts) and
  [C](../compiler/generated/report-42.c) references are unchanged and still
  reproduce `42`.

## Limits

This is still a closed-program prototype: every String value is known at compile
time, and no runtime input or mutation exists. It does not implement textLength,
textAt, textSlice, String indexing, grapheme handling or normalization. UTF-8
output is byte-preserving under the tested C/TS hosts; the raw-UTF-8 C literal
assumes a UTF-8 source and execution charset. NUL handling, adjacent literals,
source maps and generated runtime fault locations remain open. No full parser,
ABI/library export, browser/Wasm claim or compiler self-rebuild follows.
