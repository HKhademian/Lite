# Release and tag history

Current components:

- Igniter: **0.1.0-alpha.38**
- VS Code extension: **0.1.1**
- Verification corpus: 36 features, 19 examples, 20 samples, 75 scenarios, 91 target executions
- Tests: 225 interpreter groups and 9 editor grammar groups

The igniter tags are annotated and pinned to the source commit that produced
each milestone. Do not move or delete a published tag; corrections get a new
version. Detailed milestone prose remains in the
[igniter bootstrap history](../igniter/README.md#bootstrap-milestone).

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

## Current tag conventions

- Igniter tags use `igniter-vX.Y.Z[-prerelease]`.
- The release page records the igniter commit and component versions; the
  detailed notes stay with the component.
- Project, language, compiler, runtime, CLI and standard-library tag streams
  remain defined by [versioning and naming](versioning-and-naming.md); only the
  igniter stream is currently published.
