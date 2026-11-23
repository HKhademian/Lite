# Type-operations and builtin dot-access migration plan

Status: **implementation plan, 2026-11-23; design direction recorded in [type-attached operations](lite://doc/type-operations); compiler implementation not started**.

## Mission

Replace every magical hardcoded dot-access special case in the compiler (`List`, `Array`, `Map`, `Set`, `String`, and related built-in types — including read-only field-like members such as `.length`, `.size`, and `.isEmpty`) with **real, source-visible declarations** in `lib/core/*.lts` backed by Lite's three-tier implementation model:

1. **Hard builtins** (`coreHostFunction` in [`compiler/src/builtins-abi.lts`](lite://repo/compiler/src/builtins-abi.lts)) — bodyless declarations bound to verified core module identities (`lite.core.*.v1`) for irreducible runtime primitives, lowered on **both** TS and C11.
2. **Soft builtins** (`coreSoftBuiltin` + `ITEM_KIND_SOFT_BUILTIN` + `--builtin-mode=pure|builtin`) — **pure Lite implementations** right inside `lib/core/*.lts` that also admit verified native TS and C11 fast-path overrides (switchable per project, module, or individual operation).
3. **Pure Lite implementations** — ordinary Lite bodies (both `pub` and file-private non-`pub` helpers) built directly on top of the hard/soft primitives with zero compiler special cases.

End state: `parsePostfixChain` in [`compiler/src/frontend-expr.lts`](lite://repo/compiler/src/frontend-expr.lts) contains **zero hardcoded stdlib dot-property branches**. Every built-in type's operations and properties are declared, type-checked, documented, and testable directly in `lib/core/*.lts`, and replaceable when a standard module provider is swapped ([replaceable standard modules](lite://doc/modules-and-packages#replaceable-standard-modules)).

## Current hardcoded dot-access inventory

In [`compiler/src/frontend-expr.lts`](lite://repo/compiler/src/frontend-expr.lts), `parsePostfixChain` currently mixes structural language primitives with magical hardcoded built-in members:

### Structural language primitives (stay in frontend)

| Form | Meaning | Notes |
|---|---|---|
| `module.symbol` | Imported module member | Namespace lookup (`VALUE_KIND_MODULE`). |
| `tuple.0`, `tuple.label` | Structural tuple component | Fixed compile-time layout access. |
| `record.field` | Declared record field read / COW write | Nominal record layout access. |
| `EnumType.Case` | Enum case constructor | Compile-time discriminant constant. |
| `@tag.value`, `.count`, `.item`, `.index` | Control-flow context metadata | Scoped to active loop/conditional tags. |

### Magical hardcoded built-in dot members (to migrate and delete)

| Type | Current hardcoded member | Current compiler location | Target owning module & tier |
|---|---|---|---|
| `List<T>` | `.length` | `frontend-expr.lts` (`parsePostfixChain`) | `lib/core/list.lts` — **Hard builtin** (`lite.core.list.v1`) |
| `List<T>` | `.isEmpty` | `frontend-expr.lts` (`parsePostfixChain`) | `lib/core/list.lts` — **Pure Lite** (`length == 0`) + **Soft native override** |
| `[T; N]` (`Array`) | `.length`, `.isEmpty` | `frontend-expr.lts` (`parsePostfixChain`) | Core array owner (`lib/core/array.lts` or core primitive decl) — **Hard/comptime** (`N`) + **Pure/Soft** `isEmpty` |
| `Map<K, V>` | `.size` | `frontend-expr.lts` (`parsePostfixChain`) | `lib/core/map.lts` — **Hard builtin** (`lite.core.map.v1`) |
| `Map<K, V>` | `.isEmpty` | `frontend-expr.lts` (`parsePostfixChain`) | `lib/core/map.lts` — **Pure Lite** (`size == 0`) + **Soft native override** |
| `Set<T>` | `.size` | `frontend-expr.lts` (`parsePostfixChain`) | `lib/core/set.lts` — **Hard builtin** (`lite.core.set.v1`) |
| `Set<T>` | `.isEmpty` | `frontend-expr.lts` (`parsePostfixChain`) | `lib/core/set.lts` — **Pure Lite** (`size == 0`) + **Soft native override** |
| `String` | `.length` | `frontend-expr.lts` (`parsePostfixChain`) | `lib/core/text.lts` — **Hard builtin** (`lite.core.text.v1`) + comptime constant folding |
| `String` | `.isEmpty` | `frontend-expr.lts` (`parsePostfixChain`) | `lib/core/text.lts` — **Pure Lite** (`length == 0`) + **Soft native override** (`s[0] == '\0'` / `s === ""`) + comptime folding |
| `Enum` (value-backed) | `.value` | `frontend-expr.lts` (`parsePostfixChain`) | Compiler-synthesized nominal enum contract (explicitly separated from ad-hoc collection properties) |

### Core module operations to expose as type-attached declarations

All existing module-scoped operations on built-in types become real `pub` or non-`pub` type-attached declarations in their owning core module:

| Owning module | Type | Hard builtins (irreducible primitives) | Soft builtins (pure Lite + native fast-path override) | Pure Lite |
|---|---|---|---|---|
| `lib/core/list.lts` | `List` | `pushBack`, `popBack`, `pushFront`, `popFront`, `length`, `setAt`, `slice`, `reverse`, `clear` | `isEmpty` (and candidate fast paths as measured) | `sortInts`, `sortTexts`, search/helper ops, private helpers |
| `lib/core/map.lts` | `Map` | `set`, `get`, `getOr`, `has`, `remove`, `size`, `clear`, `keys`, `values` | `isEmpty` | derived helpers |
| `lib/core/set.lts` | `Set` | `add`, `has`, `remove`, `size`, `clear`, `values` | `isEmpty` | derived set helpers (union/intersection/diff as added) |
| `lib/core/text.lts` | `String` | `length`, `at`, `slice` | `isEmpty`, `indexOf`, `indexOfText`, `startsWithAt`, `wordAt`, `endsWith`, `containsText`, `trim`, `trimStart`, `trimEnd`, `toLowerAscii`, `repeatText`, `textToInt`, `skipSpaces`, `skipName`, `isDigit`, `isAsciiLetter`, `isNameStart`, `isNameContinue`, `isWhitespace` | `digitValue`, splitting/formatting helpers, private helpers |
| `lib/core/int.lts` | `Int` | *(operators are language primitives)* | `intText` | integer formatting/math helpers |
| `lib/core/unicode.lts` | `String` / `List` | `toCodePoints`, `fromCodePoints` | `utf8Encode`, `utf8DecodeStrict`, `utf8DecodeLossy` | scalar classification helpers |

Note on `joinTexts` (`List<String>`): under the owned-type rule, `List.join` belongs in `lib/core/list.lts` (or remains a module function in `core/text` until explicit imported extensions exist in a future stage).

## Design prerequisites before Phase 1

Two open items in [type-attached operations](lite://doc/type-operations#open-decisions) directly control the source syntax of migrated core files and must be settled before Phase 1 codegen begins:

1. **Field-like computed reads (`.length`, `.size`, `.isEmpty`) versus explicit calls (`.length()`, `.size()`, `.isEmpty()`):**
   - **Option A — Read-only property / field-getter declarations:** introduce an explicit, side-effect-free read-only field/property declaration form on owned nominal types (backed by the same hard/soft/pure tiers) so existing `xs.length`, `m.size`, and `s.isEmpty` code keeps working without compiler hardcoding.
   - **Option B — Unify on explicit calls:** make `.length()`, `.size()`, and `.isEmpty()` ordinary `fn` type operations and run a staged migration of existing `.length`/`.size`/`.isEmpty` callers across compiler, stdlib, tests, Learn, and Gym.
2. **Call-site `mut` visibility on mutating dot calls:**
   - **Option A:** `xs.pushBack(42)` checked statically against `mut xs` and `items: mut Self<T>` (Rust/Swift/V/C3 style).
   - **Option B:** require a visible call-site `mut` marker on mutating receiver calls.

## Phased implementation and migration roadmap

Follow [compiler development guidelines](lite://repo/.agents/rules/compiler-development.md) strictly: every phase enforces **mandatory dual-target TS + C11 parity**, atomic commits, and seed-before-adoption discipline.

### Phase 0 — Lock prerequisites and contract fixtures

- Decide Prerequisite 1 (property declarations vs `()` calls) and Prerequisite 2 (call-site `mut` dot syntax) and record the choice in [docs/type-operations.md](lite://doc/type-operations) and [docs/decisions-and-open-questions.md](lite://doc/decisions-and-open-questions).
- Add focused positive, negative, and combined verification fixtures covering:
  - `record`, `enum`, and `distinct` owned types (public and private operations);
  - `self(...)` recursion inside a `Self`-receiver operation;
  - generic receivers (`Self<T>`, `Self<K, V>`, `Self<Int>`, `Self<Self<T>>`) and extra method type params (`Self<U>`);
  - rejections: missing/non-`Self` receiver, bare `Self` on generic family, `alias`/foreign target attachment, field-name shadowing, duplicate `TypeName.op` (no overloading yet), mismatched receiver instantiation (`List<String>.sum()`), and missing `mut` permission.

### Phase 1 — Frontend parsing, type checking, and IR for `TypeName.op`

- Extend `parser.lts`, `frontend-ir.lts`, `frontend-types.lts`, `frontend.lts`, and `frontend-expr.lts`:
  - Parse `[pub] TypeName.op := fn[<TypeParams>](recv: [mut] Self[<...>], ...): Ret { ... }` (and bodyless hard-builtin declarations inside verified core modules, plus read-only field-getter declarations if Prerequisite 1 selects Option A).
  - Resolve `Self` strictly to the attached `TypeName` inside the declaration header and body; keep `self` strictly as recursive function self-reference.
  - Enforce all selected rules: owned nominal type in the defining module only, explicit `Self`/`Self<...>` first parameter required, no field collision, no duplicate `TypeName.op`, no `alias`/foreign target attachment.
  - Resolve `x.op(...)`, `TypeName.op(x, ...)`, and unbound `TypeName.op` uniformly, unifying generic type parameters from `x`'s type before checking remaining arguments and callbacks.

### Phase 2 — Dual-target TS and C11 lowering

- Update `emit-ts.lts` and `emit-c.lts` together:
  - Lower `x.op(args...)` statically to direct function calls (`Type$op(x, args...)` in TS; monomorphized `lt_fn_<Type>_<op>(...)` in C11) with zero bound-method closures or runtime dispatch tables.
  - Lower `mut Self` receivers cleanly on both targets (preserving value/COW semantics and explicit caller write propagation).
  - Verify all Phase 0 fixtures pass on both TS (`strict tsc`) and C11 (`cc -std=c11 -Wall -Wextra -Werror`) via `./bin/lite verify --all` and `./bin/lite test --full`.

### Phase 3 — Hard/soft builtin ABI and lazy core-owner loading

- Extend [`compiler/src/builtins-abi.lts`](lite://repo/compiler/src/builtins-abi.lts):
  - Allow `coreHostFunction` (hard builtins) and `coreSoftBuiltin` (soft builtins) to register and validate `TypeName.op` (and property getters if Option A) under verified `lite.core.*.v1` identities.
  - Extend `--builtin-mode` spec parsing so users and CI can toggle pure vs native overrides for type operations as well (for example `--builtin-mode=pure`, `--builtin-mode=core/text=pure`, `--builtin-mode=core/text:String.trim=pure`).
- Add lazy on-demand core-owner loading for built-in nominal types (`List`, `Map`, `Set`, `String`, `Array`, `Int`):
  - When a program accesses a member on a built-in type, load its owning `lib/core/*.lts` module definitions without requiring boilerplate imports for basic type operations, while keeping [`reachability.lts`](lite://repo/compiler/src/reachability.lts) DCE intact so unused operations emit **zero bytes** into TS or C11 outputs.
  - Preserve compile-time constant folding for constant strings/arrays (for example `"".isEmpty` / `"abc".length`) via explicit comptime/soft-builtin evaluation rather than ad-hoc parser branches.
- Add parity tests running the same built-in dot-operation suite under **both** `--builtin-mode=builtin` and `--builtin-mode=pure` on TS and C11.

### Phase 4 — Bootstrap seed promotion

- Rebuild and promote the accepted TS (`compiler/bootstrap/igniter.ts`) and C11 (`compiler/bootstrap/compiler.c`) bootstrap seeds using the existing compiler subset (before any `lib/core/*.lts` or `compiler/src/*.lts` file adopts `TypeName.op` syntax).
- Verify deterministic 3-generation self-hosting fixed points on both TS and C11, updating seed hashes and baseline manifests atomically.

### Phase 5 — Migrate `lib/core/*` to real type-attached definitions

- Convert `lib/core/list.lts`, `lib/core/map.lts`, `lib/core/set.lts`, `lib/core/text.lts`, `lib/core/int.lts`, `lib/core/unicode.lts`, and the core `Array` definitions to declare their public and private type-attached operations (`List.*`, `Map.*`, `Set.*`, `String.*`, `Int.*`, `Array.*`) using Hard / Soft / Pure tiers.
- Keep temporary module-level compatibility aliases (`pub pushBack := alias List.pushBack;` or thin forwarders) during migration so existing `list.pushBack(mut xs, v)` / `map.set(mut m, k, v)` / `text.slice(s, a, b)` callers continue compiling uninterrupted.
- Verify dual-target TS + C11 parity under both `--builtin-mode=builtin` and `--builtin-mode=pure`.

### Phase 6 — Remove hardcoded dot-access magic from `frontend-expr.lts`

- Delete the hardcoded `List`/`Array`/`Map`/`Set`/`String` `.length`, `.isEmpty`, and `.size` branches in `parsePostfixChain` ([`compiler/src/frontend-expr.lts`](lite://repo/compiler/src/frontend-expr.lts)) once all tests and self-builds resolve them through `lib/core/*.lts`.
- Re-run full gates:
  - `./bin/lite test --full`
  - `./bin/lite verify --coverage` and `./bin/lite verify --all`
  - 3-generation TS + C11 self-hosting fixed point
  - Performance benchmarks comparing `--builtin-mode=builtin` vs `--builtin-mode=pure` to verify zero hot-path regression.

### Phase 7 — Consumer, tooling, editor, and `lib/extra/` adoption

In separate, reviewable atomic commits after Phase 6:

- **Formatter & tooling:** update `lite fmt`, docgen, and `site/` playground highlighter for `TypeName.op` and `Self`.
- **Editor grammar:** update `editors/vscode/` TextMate grammar (`Self`, `TypeName.op` declarations).
- **`lib/extra/` nominal upgrade:** migrate transparent tuple handles such as `Vec2`/`Vec3`/`Vec4` ([`lib/extra/vector.lts`](lite://repo/lib/extra/vector.lts)) and `MinHeap`/`MaxHeap`/`PriorityQueue` ([`lib/extra/heap.lts`](lite://repo/lib/extra/heap.lts)) to owned `record` or `distinct` types with ergonomic type-attached operations.
- **Academy & docs:** update Learn, Gym, examples, samples, and [`compiler/README.md`](lite://doc/compiler/overview) to reflect shipped support.

## Acceptance criteria

- Zero hardcoded collection or string dot-property branches remain in `compiler/src/frontend-expr.lts`.
- Every `List`, `Array`, `Map`, `Set`, and `String` dot member is declared in `lib/core/*.lts` as a Hard builtin, Soft builtin (pure Lite + optional native override), or Pure Lite implementation.
- `--builtin-mode=pure` and `--builtin-mode=builtin` produce identical observable behavior across all migrated operations on both TS and C11.
- Unused core type operations incur zero emitted code overhead (verified by reachability/DCE tests).
- Full dual-target TS + C11 parity and 3-generation self-hosting fixed points pass at every seed promotion step.

## Related documents

- [Type-attached operations](lite://doc/type-operations)
- [Core and host modules](lite://doc/compiler/core-modules-plan)
- [T11 and C transition](lite://doc/compiler/transition-plan)
- [Compiler development guidelines](lite://repo/.agents/rules/compiler-development.md)
- [Decision ledger](lite://doc/decisions-and-open-questions)
