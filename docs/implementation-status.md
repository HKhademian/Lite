# Implementation status

Use the [specification index](lite://spec) for the selected language design and
the [Shipped Handbook](lite://handbook/overview-and-setup) for supported usage.
The [compiler overview](lite://doc/compiler/overview) and [bootstrap guide](lite://doc/compiler/bootstrap-readme)
describe native C11 and TypeScript self-hosting and seed verification.

## Verified examples

The documentation migration ran these cases on both generated targets on
2026-11-26. The [documentation registry](lite://repo/config/documentation.json)
links the pages and manifest IDs used for the website's example badges.

- [First program](lite://doc/start-here) · [Double-sum case](lite://repo/language/verifications/artifacts/examples/foundations/io/double-sum.json)
- [UTF-8 round trip](lite://handbook/numbers-operators-and-strings#utf-8-round-trip) · [Showcase case](lite://repo/language/verifications/artifacts/showcases/foundations/strings/strings-and-unicode.json)
- [UTF-8 feature case](lite://repo/language/verifications/features/core/text/unicode-and-format.json)
  also passed on TS and C11, including invalid UTF-8 detection.

A badge refers to an example linked by the document. Backend or host
coverage for other examples follows their own verification evidence.

## Shipped compiler coverage (Phases 1–18, dual-target TS + C11)

Both TypeScript and native C11 targets share the self-hosted frontend and pass 3-generation bootstrap verification (`./bin/lite bootstrap verify`). Shipped language capabilities across Phases 1–18 include:

- **Full numeric ladder & safety (Phases 5–6):** Exact signed/unsigned integers (`Int1`..`Int64`/`Int`, `UInt1`..`UInt64`), floating-point widths (`Float8` E4M3, `Float16`, `Float32`, `Float64`/`Float`/`Double`), bitwise methods (`.bitAnd`, `.bitOr`, `.bitXor`, `.shiftLeft`, `.shiftRight`, `.rotateLeft`), wrapping/saturating/unchecked arithmetic (`.wrappingAdd`, `.saturatingAdd`, `.uncheckedAdd`), overflow/division bounds panics, and explicit `core/*` stdlib modules.
- **Borrowed slices & split borrows (Phases 7, 11, 18):** Non-escaping `Slice<T>` views over `List<T>`, byte-aligned and bit-packed `[T; N]` (`Bool`, `Int1..4`, `UInt1..4`), and `String.bytes()`; disjoint mutable `(left, right) := mut s.splitAt(mid)` splits; `.toList()`; and unified `Index` / `Range` dispatch.
- **`Option<T>`, niche packing, layout, SIMD & SoA (Phases 8, 18):** Explicit module-owned `Option<T>` (`core/option`, preloaded via `lib/$preload.lt`) with automatic niche packing (including finite-checked float qNaN niches and `#no_niche`), `#packed` / `#align(N)`, and explicitly imported `core/slice`, `core/simd` (`Simd<T, N>` / `SimdNative<T>`), `core/soa` (`SoA<R>`), and `core/rc` (`Rc<T>`) alongside `VmArena` and `SlotPool`.
- **Nominal interfaces, dynamic dispatch & contexts (Phases 9, 18):** `interface` / `impl` blocks, associated types, default method bodies, bounded generics (`fn<T: Iface>`), object-safe `dyn Interface` / `mut dyn Interface` trait objects, and lexical `context(...)` dependencies with package-isolated `$context.lt`.
- **Overloading & syntax alignment (Phases 11–13):** Static specificity-ranked function/method overloading, prefix `mut name: T` / `var mut name: T` variable definitions, contextual `.static(...)` calls, writable `loop mut`, standalone `do { ... }` expression blocks, `if` pattern bindings, and dependent record defaults.
- **Definite initialization, unions & fallibles (Phases 14–15):** Path-sensitive definite initialization (`= ?`, partial `if` / `else { ? }`) with immutable `Bool` predicate correlation and 1-byte C11 init/drop guards; normalized runtime `A | B` unions with flow narrowing; and `T ! E` / `T!` fallible outcomes with `!` propagation and `else(err)` recovery backed by `core/error`.
- **Compile-time evaluation, inferred records & callables (Phases 16–17):** Portable compiler-embedded `comptime { ... }` evaluator and Stage-1 `.lt` evaluation, `{ ... }` structural inferred records (`Record<$anon;...>`), unified `:= alias` for types/symbols/modules/functions, parameter defaults with `?:` omission markers, and callable value variance.

## Remaining deferred items

- Package-local `$preload.lt` resolution (with `lib/$preload.lt` exposing `core/option` and `core/slice`) and explicit module ownership for `Rc`/`Slice`/`Simd`/`SimdNative`/`SoA` are shipped ([preload design](lite://doc/packages-and-preload)); automatic flat `({ ... })?` panic capture ([LP-0009](lite://doc/failure-capture-and-unwrapping)) remains open design work.
- **Known C11 union edge case:** matching a flow-narrowed union binding directly (e.g., `match v` after `if v: Int { return ... }`) hits a missing C11 typedef (`lt_s_*`) for the residual sub-union; matching the full union directly compiles cleanly on both TS and C11 (tracked in [compiler gaps](lite://doc/compiler/gaps)).
- See [compiler gaps](lite://doc/compiler/gaps) and the [C11 memory and codegen plan](lite://doc/c11-memory-and-codegen-plan) for post-Phase-18 optimization and refinement items.
