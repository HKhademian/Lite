# Release and tag history

Tagged pushes now have an [igniter release workflow](release-automation.md):
Independent umbrella (`lite-v*`), language (`lang-v*`), scripting
(`script-v*`), compiler (`compiler-v*`), igniter, CLI, formatter, runtime and
library annotated tags run the full gates and package the
complete igniter source, provisional libraries, generated C programs and
verified Linux/macOS x64/ARM64 program builds with source/builder hashes and
checksums. Manual workflow runs build without publishing. The native C compiler
ladder remains pending; native assets currently contain conformance programs.
The release manifest names the released component and the complete independent
version combination. [versions.json](../config/versions.json) records component
versions, with the igniter version kept in its package manifest. No version bump
or tag is introduced by this automation change.

Current components:

- Igniter: **0.1.0-alpha.38**
- VS Code extension: **0.1.1**
- Verification corpus: 38 features, 19 examples, 20 samples, 78 scenarios, 100 target executions
- Tests: 237 interpreter groups, 32 compiler-host groups, 4 policy/tooling groups and 9 editor grammar groups

Constant integer arithmetic faults now execute only when reached. Dead branches,
false loops, skipped Boolean operands and unused functions compile safely; invalid
literals/types still reject before effects. Six fixtures now model runtime faults,
so the compiler corpus is 61 programs/32 rejections (still 93 sources). All 259
full tests pass with zero skips (53.4 s). See the [deferred-fault ledger](../compiler/parity.md#deferred-constant-arithmetic-faults).

Parenthesized inequality and bare String/Int/Bool function tails now stay
comparisons, using a shared equals-token check. All 258 full tests pass with zero
skips (47.3 s); the measured inventory is 75/163 matching cases, 88 remaining.
Existing corpus artifacts are unchanged; see the [inequality ledger](../compiler/parity.md#inequality-token-discrimination).

Generated TS text/list bounds faults now carry exact source locations and keep
earlier output, using shared fault metadata. All 257 full tests pass with zero
skips (47.3 s); the measured inventory is 73/162 matching cases with 89 remaining.
The supplementary-character column convention is separately pending; see the
[bounds-fault ledger](../compiler/parity.md#positioned-text-and-list-bounds-faults).

C multi-value output now evaluates every argument before any write, preserving
left-to-right faults and earlier output. Single-value emitted C is unchanged.
All 256 full tests pass with zero skips (48.5 s); the [C output-order ledger](../compiler/parity.md#c-output-argument-evaluation)
records coverage, unchanged TS seeds and steady paired C-emitter timings.

Single-pass target helper discovery now avoids repeated emitted-code scans.
Paired compiler-phase measurements improve from 100.0 to 60.4 ms for 1,000 output
statements and from 899.0 to 649.8 ms for identical compiler source, with exact
emitted bytes. All 522 previous/current compiler comparisons match; see the
[helper-scan ledger](../compiler/parity.md#single-pass-helper-discovery).

Dynamic integer division/remainder now match exact positioned faults in both
generated targets, and MIN%-1 returns zero without undefined C arithmetic.
The [division-family ledger](../compiler/parity.md#positioned-integer-division-family) records
the seed refresh, differential coverage and paired speed measurements.

Unreleased checked-arithmetic parity, 2026-11-02: generated TS and portable C11
now check dynamic Int64 addition, subtraction, multiplication and negation,
matching T00 overflow diagnostics, status and prior output. Three generated
compiler generations match; all 253 full tests pass with zero skips (54.6 s),
both 93-case corpus comparisons and all 95 verifier executions pass. The
[arithmetic ledger](../compiler/parity.md#checked-int64-arithmetic) records the
boundaries and remaining gates. No release tag is introduced.

Unreleased I/O selection, 2026-11-02: outputLine replaces report with no alias;
output adds the same space-separated display without a newline. Empty calls are
allowed; outputLine always adds its newline. All four input helpers accept an
optional positional String prompt. Generated TS adds strict shared input,
Float input values, aggregate display for admitted forms, and streaming process
output. Maintained Lite calls and live fixtures are migrated. The [contract](tooling-and-learning.md#temporary-input-and-output-helpers-selected-2026-11-02)
and [generated-only seed refresh](../compiler/parity.md#temporary-io-migration)
record the scope and remaining broader type/native gaps. This is not a release tag.

The igniter tags are annotated and pinned to the source commit that produced
each milestone. Do not move or delete a published tag; corrections get a new
version. Detailed milestone prose remains in the
[igniter bootstrap history](../igniter/README.md#bootstrap-milestone).

Unreleased, 2026-11-02: the owner-approved
[T11 transition](../compiler/transition-plan.md) makes the verified generated T11
seed the default TS compiler and TS verification emitter. The exact seed and
source/builder hashes are [preserved](../compiler/bootstrap/README.md); source
changes rebuild with T11 rather than silently using an older artifact or T00.
The C emitter is now also compiled by T11 and shipped as a TS-hosted compiler;
both compile targets and compiler verification avoid T00. Interpreter run/check
remain on T00. This is a tooling migration,
not a language release, new tag, full-feature parity or native self-hosting claim.
Eight host migration/verification-selection/report-order tests join the 236 interpreter groups
in `lite test`. A bounded cache in generated text helpers eliminates repeated
whole-source code-point copies. The [benchmark](../benchmark/reports/2026-11-02-text-cache.md)
records 3.49 s → 146 ms for 1,000 statements, and 668 ms median self-compilation
for the text-cache source snapshot. The refreshed TS seed has three byte-identical generations;
this does not complete feature parity or native C self-hosting. The subsequent
[report-order refresh](../compiler/parity.md#report-order-seed-refresh) fixes lost
output from reporting functions called inside `report(...)`, including multiple
arguments, recursion and exit. The current corpus hashes are recorded separately
from the preserved historical P0 baseline. Full-source lexer/parser/checker test
consumers now use T11-generated drivers; the [recorded full gate](../compiler/parity.md#generated-full-source-test-consumers)
falls from 580.6 s to 47.6 s with all 248 tests passing and zero skips.

| Tag | Date | Commit | Milestone |
|---|---|---|---|
| `igniter-v0.1.0-alpha.1` | 2026-10-30 | `8c74537` | First experimental TypeScript/Node igniter checkpoint; Node 26.13.0, TypeScript 7.0.2; strict checking and 15 test groups pass. No self-hosted successor compiler yet. |
| `igniter-v0.1.0-alpha.2` | 2026-10-30 | `e09cf63` | Boolean/conditional igniter checkpoint: strict TypeScript checks and 22 Node test groups pass; scoped blocks and short-circuit comparison chains. No loops, user functions or self-hosted compiler yet. |
| `igniter-v0.1.0-alpha.3` | 2026-10-30 | `1dcf92f` | Action-loop igniter checkpoint: Bool and unconditional loops, bare nearest-loop break/continue, scoped bodies; strict typechecking and all 30 test groups pass. Wider loop values/metadata and self-hosting remain unimplemented. |
| `igniter-v0.1.0-alpha.4` | 2026-10-30 | `29978ff` | Typed scalar functions, return and recursion; strict checking and 43 test groups pass |
| `igniter-v0.1.0-alpha.5` | 2026-10-30 | `7038ce1` | Text concatenation and temporary scanning helpers; Lite tokenizer example; strict checking and 52 test groups pass |
| `igniter-v0.1.0-alpha.6` | 2026-10-31 | `d667395` | Approved flat fixed tuples, destructuring and function inputs/results; strict checking and 62 interpreter tests pass |
| `igniter-v0.1.0-alpha.7` | 2026-10-31 | `36b301f` | Root lite run shebang launcher; strict checking and 63 interpreter test groups pass |
| `igniter-v0.1.0-alpha.8` | 2026-10-31 | `27d6f03` | Approved optional inputInt prompt and multiple report arguments; strict checking and 69 interpreter tests pass |
| `igniter-v0.1.0-alpha.9` | 2026-10-31 | `fc0fb5d` | Named fixed tuple fields, shorthand and label-sensitive contracts; strict checking and 79 interpreter tests pass |
| `igniter-v0.1.0-alpha.10` | 2026-10-31 | `1e253b5` | Approved nonempty fixed arrays, indexed reads and traversal; strict checking and 93 interpreter tests pass |
| `igniter-v0.1.0-alpha.11` | 2026-10-31 | `b8583ff` | Selected mixed flat tuple FVP increment |
| `igniter-v0.1.0-alpha.12` | 2026-10-31 | `54d3617` | Stored tuple receiving-declaration label conversion |
| `igniter-v0.1.0-alpha.13` | 2026-10-31 | `2139003` | Named fixed-slot user calls and shorthand |
| `igniter-v0.1.0-alpha.14` | 2026-10-31 | `135972e` | Approved builtin List construction, copies and explicit end operations |
| `igniter-v0.1.0-alpha.15` | 2026-10-31 | `f5f9cbe` | Approved temporary text helpers and retained token scanner |
| `igniter-v0.1.0-alpha.16` | 2026-10-31 | `30f1d3e` | Lite-written arithmetic front-end application on preserved alpha.15 |
| `igniter-v0.1.0-alpha.17` | 2026-10-31 | `d5d1c63` | Readable Lite-to-TS report compiler and byte-output parity |
| `igniter-v0.1.0-alpha.18` | 2026-10-31 | `3bce277` | Restricted native C emission and three-way byte-output parity |
| `igniter-v0.1.0-alpha.19` | 2026-10-31 | `90754bd` | Approved inputAll optional prompt and remaining-text EOF contract |
| `igniter-v0.1.0-alpha.20` | 2026-10-31 | `9669ee5` | Whole-source TS and C emitter input with exact parity checks |
| `igniter-v0.1.0-alpha.21` | 2026-10-31 | `7ebd22d` | Approved inputArgs snapshots and -- argument suffix |
| `igniter-v0.1.0-alpha.22` | 2026-10-31 | `02530e3` | Explicit logical compiler source names without artifact changes |
| `igniter-v0.1.0-alpha.23` | 2026-10-31 | `28141c9` | Verification registry, complete artifact coverage, compiler-target cases, floor/compound arithmetic, inferred mutability, VS Code icons, CI |
| `igniter-v0.1.0-alpha.24` | 2026-11-01 | `99e16c3` | Right-associative Float-default power with explicit negative-base grouping |
| `igniter-v0.1.0-alpha.25` | 2026-11-01 | `3eebdde` | Restricted TS/C lowering for Int floor division and floor modulo |
| `igniter-v0.1.0-alpha.26` | 2026-11-01 | `2edf486` | Subjectless Boolean match with required fallback and same-type value arms |
| `igniter-v0.1.0-alpha.27` | 2026-11-01 | `549cbd2` | Typed scalar/tuple/fixed-array locals and omitted zero initialization |
| `igniter-v0.1.0-alpha.28` | 2026-11-01 | `977318a` | Reserved storage and whole-value first initialization for scalar/tuple/fixed-array locals |
| `igniter-v0.1.0-alpha.29` | 2026-11-01 | `ee00ac9` | Source-like report display for flat tuple values |
| `igniter-v0.1.0-alpha.30` | 2026-11-01 | `8e03e71` | Partial conditional declaration defaults and no-write assignments |
| `igniter-v0.1.0-alpha.31` | 2026-11-01 | `e00574d` | Typed loop `.value` accumulation and `then` completion |
| `igniter-v0.1.0-alpha.32` | 2026-11-01 | `14c701a` | Sized integer and floating widths with promotion and lossless widening |
| `igniter-v0.1.0-alpha.33` | 2026-11-01 | `b61c524` | Mixed Int/Float arithmetic and comparisons |
| `igniter-v0.1.0-alpha.34` | 2026-11-01 | `5a6c69e` | Loop metadata, payload exits and tagged targets |
| `igniter-v0.1.0-alpha.35` | 2026-11-01 | `2cf4813` | Construct-level `finally` cleanup |
| `igniter-v0.1.0-alpha.36` | 2026-11-01 | `8da2f93` | Named unsupported-feature diagnostics in the restricted compiler |
| `igniter-v0.1.0-alpha.37` | 2026-11-01 | `64c471f` | Restricted compiler control-flow slice: Bool, mutable locals, if/else and loops |
| `igniter-v0.1.0-alpha.38` | 2026-11-01 | `e5bb678` | Positioned compiler diagnostics and documentation links |

Comparison chains now retain middle operands once and skip later operands on both
generated targets over their admitted scalar types. All 260 full tests pass with
zero skips (49.4 s); inventory is 79/164 matching cases, 85 remaining. The new
canonical chain feature executes on all three targets. See the [chain ledger](../compiler/parity.md#comparison-chain-lowering)
for fixed-point, sanitizer and paired speed evidence. Broader types, Never-valued
exit typing, native C and run/check migration remain pending.


Empty and comment-only scripts now compile silently on generated TS/C, with
malformed comments still rejected before effects. The corpus is 63 programs and
30 rejections; existing 61 artifact pairs are unchanged. The parser skips alias
scanning and remaining state allocation for empty scripts. See the [empty-script
ledger](../compiler/parity.md#empty-script-support) for generated bootstrap and paired timing evidence.


Simple statement separators now follow EOF, closing scopes and directly closed
block initializers on generated targets. Adjacent output calls still require a
separator and reject before effects. The corpus is 64 programs/29 rejections;
all 63 older artifact pairs stay identical. See the [statement-boundary ledger](../compiler/parity.md#statement-boundaries)
for coverage, generated bootstrap and paired timing evidence.


Adjacent admitted String literals now join across whitespace/comments on generated
TS/C and both standalone parser drivers, with malformed later tokens still
rejected before effects. Corpus: 65 programs/28 rejections; all 64 earlier
artifact pairs stay identical. See the [adjacent-literal ledger](../compiler/parity.md#adjacent-string-literals)
for focused coverage, generated bootstrap and paired timing evidence.


Nonempty calls now admit one trailing comma on generated targets while empty
comma-only lists, doubled commas and arity/type errors still reject before effects.
Corpus: 66 programs/27 rejections; all 65 earlier artifact pairs stay identical.
See the [trailing-comma ledger](../compiler/parity.md#trailing-call-commas) for generated bootstrap,
focused combinations and paired timing evidence.


Generated TS/C now support statement scopes and preserve outer values while
shadowed initializers run. The canonical scope feature executes on all three
targets, yielding 100 verifier executions. All 66 earlier program artifact pairs
remain identical. See the [scope ledger](../compiler/parity.md#statement-scopes) for focused combinations,
generated fixed-point evidence, native sanitizer cases and paired timing data.


## Current tag conventions

- Igniter tags use `igniter-vX.Y.Z[-prerelease]`.
- The release page records the igniter commit and component versions; the
  detailed notes stay with the component.
- Project, language, compiler, runtime, CLI and standard-library tag streams
  remain defined by [versioning and naming](versioning-and-naming.md); only the
  igniter stream is currently published.

Sequential ordinary value declarations now create fresh bindings on generated
TS/C; initializers retain the previous value and later uses obey the new type
and mutation permissions. Corpus: 67 programs/26 rejections; all 66 older
artifact pairs remain identical. Inventory: 88/164 match, 76 remain, with no
regressions. See the [shadowing evidence](../compiler/parity.md#sequential-value-bindings).

Generated expression items now evaluate silently, empty separators are accepted,
and trailing separators retain checked function results. Unit tails preserve
effects and reject incompatible results before artifact output. Inventory:
89/164 match, 75 remain; all 67 program artifact pairs stay unchanged. See the
[expression-item evidence](../compiler/parity.md#ordinary-expression-items).
