# Type-operations and builtin dot-access migration plan

Status: **implementation plan, 2026-11-23; design direction recorded in [type-attached operations](lite://doc/type-operations); compiler implementation not started**.

## Mission

Replace every magical hardcoded dot-access special case in the compiler (`List`, `Array`, `Map`, `Set`, `String`, and related built-in types — including read-only field-like members such as `.length`, `.size`, and `.isEmpty`) with **real, source-visible declarations** in `lib/core/*.lts` backed by Lite's three-tier implementation model:

1. **Hard builtins** (`coreHostFunction` in [`compiler/src/builtins-abi.lts`](lite://repo/compiler/src/builtins-abi.lts)) — bodyless declarations bound to verified core module identities (`lite.core.*.v1`) for irreducible runtime primitives, lowered on **both** TS and C11.
2. **Soft builtins** (`coreSoftBuiltin` + `ITEM_KIND_SOFT_BUILTIN` + `--builtin-mode=pure|builtin`) — **pure Lite implementations** right inside `lib/core/*.lts` that also admit verified native TS and C11 fast-path overrides (switchable per project, module, or individual operation).
3. **Pure Lite implementations** — ordinary Lite bodies (both `pub` and file-private non-`pub` helpers) built directly on top of the hard/soft primitives with zero compiler special cases.

End state: `parsePostfixChain` in [`compiler/src/frontend-expr.lts`](lite://repo/compiler/src/frontend-expr.lts) contains **zero hardcoded stdlib dot-property branches**. Every built-in type's operations and properties are declared, type-checked, documented, and testable directly in `lib/core/*.lts`, and replaceable when a standard module provider is swapped ([replaceable standard modules](lite://doc/modules-and-packages#replaceable-standard-modules)).

## Final audit of all remaining hardcoded magicals in `compiler/src/`

Audited across [`compiler/src/frontend-expr.lts`](lite://repo/compiler/src/frontend-expr.lts), [`compiler/src/frontend.lts`](lite://repo/compiler/src/frontend.lts), and [`compiler/src/builtins-abi.lts`](lite://repo/compiler/src/builtins-abi.lts) on **2026-11-23**.

### 1. Structural language primitives (NOT stdlib magic — stay in compiler)

| Form | Meaning | Notes |
|---|---|---|
| `module.symbol` | Imported module member | Namespace lookup (`VALUE_KIND_MODULE`). |
| `tuple.0`, `tuple.label` | Structural tuple component | Fixed compile-time layout access. |
| `record.field` | Declared record field read / COW write | Nominal record layout access. |
| `EnumType.Case` | Enum case constructor | Compile-time discriminant constant. |
| `@tag.value`, `.count`, `.item`, `.index` | Control-flow context metadata | Scoped to active loop/conditional tags. |

### 2. Category A — Hardcoded dot-properties (`parsePostfixChain`)

| Type | Hardcoded member | Current compiler location | Target owning module & tier |
|---|---|---|---|
| `List<T>` | `.length` | `frontend-expr.lts:6791-6802` | `lib/core/list.lts` — **Hard builtin** (`lite.core.list.v1`) |
| `List<T>` | `.isEmpty` | `frontend-expr.lts:6803-6807` | `lib/core/list.lts` — **Pure Lite** (`length == 0`) + **Soft native override** |
| `[T; N]` (`Array`) | `.length`, `.isEmpty` | `frontend-expr.lts:6791-6807` | Core array owner (`lib/core/array.lts` or core primitive decl) — **Hard/comptime** (`N`) + **Pure/Soft** `isEmpty` |
| `Map<K, V>` | `.size` | `frontend-expr.lts:6811-6823` | `lib/core/map.lts` — **Hard builtin** (`lite.core.map.v1`) |
| `Map<K, V>` | `.isEmpty` | `frontend-expr.lts:6824-6828` | `lib/core/map.lts` — **Pure Lite** (`size == 0`) + **Soft native override** |
| `Set<T>` | `.size` | `frontend-expr.lts:6811-6823` | `lib/core/set.lts` — **Hard builtin** (`lite.core.set.v1`) |
| `Set<T>` | `.isEmpty` | `frontend-expr.lts:6824-6828` | `lib/core/set.lts` — **Pure Lite** (`size == 0`) + **Soft native override** |
| `String` | `.length` | `frontend-expr.lts:6832-6836` | `lib/core/text.lts` — **Hard builtin** (`lite.core.text.v1`) + comptime constant folding |
| `String` | `.isEmpty` | `frontend-expr.lts:6837-6849` | `lib/core/text.lts` — **Pure Lite** (`length == 0`) + **Soft native override** (`s[0] == '\0'` / `s === ""`) + comptime folding |
| `Enum` (value-backed) | `.value` | `frontend-expr.lts:6709-6780` | Compiler-synthesized enum backing-value contract (separate from ad-hoc collection properties) |

### 3. Category B — Legacy ambient unqualified list ops (`VALUE_KIND_LIST_OP`)

| Hardcoded identifiers | Current compiler locations | Migration target |
|---|---|---|
| Bare `push_back`, `pop_back`, `push_front`, `pop_front` (recognized without any import) | `frontend-expr.lts:1265-1266`, `L7013-L7014`; `frontend.lts:2057-2061` | Retire in favor of `List.pushBack` / `List.popBack` / `List.pushFront` / `List.popFront` (`xs.pushBack(v)` and `list.pushBack(mut xs, v)`) |

### 4. Category C — Hardcoded generic collection call dispatchers (24 string-switched intrinsics)

| Module / Type | Hardcoded count & dispatch path | Migration target |
|---|---|---|
| `core/list` (`List<T>`) | 9 intrinsics (`pushBack`, `popBack`, `pushFront`, `popFront`, `length`, `setAt`, `slice`, `reverse`, `clear`) switched in `frontend-expr.lts:7033-7041` → `parseListIntrinsicCall` | Uniform generic `TypeName.op` + `coreHostFunction` ABI lowering |
| `core/map` (`Map<K, V>`) | 9 intrinsics (`set`, `get`, `getOr`, `has`, `remove`, `size`, `clear`, `keys`, `values`) switched in `frontend-expr.lts:7042-7050` → `parseMapIntrinsicCall` | Uniform generic `TypeName.op` + `coreHostFunction` ABI lowering |
| `core/set` (`Set<T>`) | 6 intrinsics (`add`, `has`, `remove`, `size`, `clear`, `values`) switched in `frontend-expr.lts:7051-7056` → `parseSetIntrinsicCall` | Uniform generic `TypeName.op` + `coreHostFunction` ABI lowering |

### 5. Category D — Hardcoded bracket indexing, slicing, and assignment hooks (later phase: operation contracts)

| Construct | Current compiler locations | Future contract owner |
|---|---|---|
| `map[k]` read & `map[k] = v` write | `frontend-expr.lts:6868-6887`, `L2821`; `frontend.lts:3121` | [Collection operation contracts](lite://doc/collection-operation-contracts) (after interfaces) |
| `list[i]` / `arr[i]` read & write | `frontend-expr.lts:6958-6976`, `L2821`; `frontend.lts:3178` | [Collection operation contracts](lite://doc/collection-operation-contracts) (after interfaces) |
| `list[a..b]` / `arr[a..b]` / `str[a..b]` (`..`, `..=`) range slicing | `frontend-expr.lts:6894-7011` | [Collection operation contracts](lite://doc/collection-operation-contracts) / `List.slice` / `String.slice` |

### 6. Category E — Hardcoded variadic output & built-in loop iteration (separate contracts)

| Construct | Current compiler locations | Notes |
|---|---|---|
| `io.output(...)` / `io.outputLine(...)` (`info.count < 0`) | `frontend-expr.lts:1799-1806`, `L7063-L7064`; `frontend.lts:983` | Special variadic display statements; awaits general variadic pack + display interface |
| `loop list/array/map/set as item` built-in sequence lowering | `frontend-expr.lts:2401-2414` | Awaits iterator protocol / [collections and iterators](lite://doc/collections-and-iterators) |

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

1. **Mutating dot calls (resolved 2026-11-23):** `xs.pushBack(42)` is written directly without a call-site `mut` marker and checked statically against writable `mut` authority on `xs` and `mut Self<...>` in the signature (Rust/Swift/V/C3 style).
2. **Remaining open prerequisite — Field-like computed reads (`.length`, `.size`, `.isEmpty`) versus explicit calls (`.length()`, `.size()`, `.isEmpty()`):**
   - **Option A — Unify on explicit calls (recommended for Stage 1):** make `.length()`, `.size()`, and `.isEmpty()` ordinary `TypeName.op := fn(...)` declarations (deleting all hardcoded dot-properties immediately without needing a `get`/`set` backing-function spec first), and run a staged migration of existing `.length`/`.size`/`.isEmpty` callers. Defer `get`/`set` backing properties until field privacy, backing storage, and ownership rules are settled.
   - **Option B — Read-only `get` property spec now (no `set` yet):** introduce a minimal read-only getter declaration form backed by Hard/Soft/Pure tiers so `xs.length`, `m.size`, and `s.isEmpty` stay property syntax, while deferring `set` backing functions until field privacy, compound updates, and `var`-grant conflicts are designed.

## Phased implementation and migration roadmap

Follow [compiler development guidelines](lite://repo/.agents/rules/compiler-development.md) strictly: every phase enforces **mandatory dual-target TS + C11 parity**, atomic commits, and seed-before-adoption discipline.

### Phase 0 — Lock remaining prerequisite and contract fixtures

- Decide Prerequisite 2 (unify `.length`/`.size`/`.isEmpty` as `()` calls vs minimal read-only `get` property spec) and record the choice in [docs/type-operations.md](lite://doc/type-operations) and [docs/decisions-and-open-questions.md](lite://doc/decisions-and-open-questions).
- Add focused positive, negative, and combined verification fixtures covering:
  - `record`, `enum`, and `distinct` owned types (public and private operations);
  - `self(...)` recursion inside a `Self`-receiver operation;
  - generic receivers (`Self<T>`, `Self<K, V>`, `Self<Int>`, `Self<Self<T>>`) and extra method type params (`Self<U>`);
  - mutating dot calls (`xs.pushBack(42)` requiring `mut xs`, rejected on read-only receivers);
  - rejections: missing/non-`Self` receiver, bare `Self` on generic family, `alias`/foreign target attachment, field-name shadowing, duplicate `TypeName.op` (no overloading yet), and mismatched receiver instantiation (`List<String>.sum()`).

### Phase 1 — Frontend parsing, type checking, and IR for `TypeName.op`

- Extend `parser.lts`, `frontend-ir.lts`, `frontend-types.lts`, `frontend.lts`, and `frontend-expr.lts`:
  - Parse `[pub] TypeName.op := fn[<TypeParams>](recv: [mut] Self[<...>], ...): Ret { ... }` (and bodyless hard-builtin declarations inside verified core modules, plus read-only field-getter declarations if Prerequisite 2 selects Option B).
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
  - Allow `coreHostFunction` (hard builtins) and `coreSoftBuiltin` (soft builtins) to register and validate `TypeName.op` (and read-only property getters if Prerequisite 2 selects Option B) under verified `lite.core.*.v1` identities.
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

### Phase 6 — Remove hardcoded dot-access and intrinsic magic from `frontend-expr.lts`

- Delete Category A hardcoded `List`/`Array`/`Map`/`Set`/`String` `.length`, `.isEmpty`, and `.size` branches in `parsePostfixChain` ([`compiler/src/frontend-expr.lts`](lite://repo/compiler/src/frontend-expr.lts)) once all tests and self-builds resolve them through `lib/core/*.lts`.
- Retire Category B legacy ambient `push_back`/`pop_back`/`push_front`/`pop_front` (`VALUE_KIND_LIST_OP`) and replace Category C's 24 string-switched `lite$core$*` call dispatchers with uniform generic `TypeName.op` + ABI lowering.
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
