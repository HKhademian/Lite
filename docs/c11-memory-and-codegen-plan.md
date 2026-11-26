# C11 Memory, Raw Values, Numeric Ladder, and Codegen Architecture Plan

Status: **Phases 0–5 complete at `e6de4a64`. Phases 6–11 and the syntax review queue describe planned work as of 2026-11-26.**

This document records the settled architecture for bringing Lite's C11 backend to predictable real-time performance (~1.00× hand-written C on math/crypto/frame loops, faster and smaller than idiomatic C/Rust/Go on string- and allocation-heavy workloads) with zero hidden allocations, zero `rc` leaks, and full value-semantic safety.

See [memory and performance](lite://doc/memory-and-performance), [serious usage, generics, and libraries roadmap](lite://doc/serious-usage-roadmap), [numbers and ranges](lite://doc/numbers), and [compiler gaps](lite://doc/compiler/gaps).

---

## 1. Tier 0 — Raw Inline Values & Complete Numeric Ladder

The fastest allocation is no allocation at all. Every small, fixed-size, or byte-compact value lives inline with zero heap headers and zero pointers:

- **True inline fixed arrays (`[T; N]`):**
  - Byte-aligned `T` (`>= 8` bits): `typedef struct { T data[N]; } lt_arr_<T>_<N>;` (`sizeof == N * sizeof(T)`, 0 header bytes, 0 `malloc`s). `Vec2`/`Vec4`/`Mat4` live purely in registers/stack/inline fields instead of lowering to `lt_list_<T>`.
  - Sub-byte `T` (`1`/`2`/`4`-bit integers): tightly **bit-packed** `uint8_t data[(N * bits + 7) / 8]` (**8 / 4 / 2 elements per byte**) with shift+mask element access; standalone locals/parameters stay in `int8_t`/`uint8_t` registers with exact range checks.
- **Complete exact-width numeric ladder:**
  - **Signed integers** (pure two's complement `[-2^(k-1), 2^(k-1) - 1]`): `Int1` (`-1..0`, where `0b0 == 0` and `0b1 == -1`), `Int2` (`-2..1`), `Int4` (`-8..7`), `Int8` (`int8_t`), `Int16` (`int16_t`), `Int32` (`int32_t`), `Int64`/`Int` (`int64_t`).
  - **Unsigned integers** (`[0, 2^k - 1]`): `UInt1` (`0..1`), `UInt2` (`0..3`), `UInt4` (`0..15`), `UInt8` (`uint8_t`), `UInt16` (`uint16_t`), `UInt32` (`uint32_t`), `UInt64` (`uint64_t`).
  - **Floating-point types:** `Float8` (**OCP E4M3** stored in `uint8_t` with a 1 KB L1-hot `float[256]` decode LUT + compact encoder), `Float16` (**IEEE-754 binary16** via C23 `_Float16` with portable `uint16_t` fallback; `Math.f16round` on TS), `Float32` (`float`), `Float64`/`Float`/`Double` (`double`).
- **`String` (`lt_str`) — 16 B (`2 × 8 B`) Immutable SSO + Unlimited Jumbo Support:**
  - Fits in **2 CPU registers** (`x0/x1`, `rax/rdx`) and packs **4 strings per 64-byte cache line**, with zero `cap` header overhead (strings remain purely immutable values).
  - **Inline SSO (`<= 14` UTF-8 bytes):** `char buf[15]` + `uint8_t tag`, with **forced-zeroed tail** (`buf[len..14] == 0`) and `buf[14]` always `'\0'` (two 64-bit register compares for equality, zero heap allocations, zero-copy C string interop).
  - **External immutable (`> 14` bytes):** `{ const char *data; uint32_t byte_len; uint32_t meta; }` pointing to static RODATA, a VM Data Stack, or an exact-sized `len + 1` NUL-terminated heap block.
  - **Unlimited size (`> 4 GB`):** `byte_len == UINT32_MAX` sentinel reads a 16 B `{ uint64_t byte_len; int64_t cp_len; }` header placed immediately before `data` (zero overhead below 4 GB).
  - **`TextBuilder` stays permanently** as the explicit portable linear builder (mapping to V8 `ConsString` ropes on JS/TS and linear buffers on C11); mutable character sequences use fixed-width 32-bit Unicode scalars (`UInt32` / `Char`), never raw UTF-8 byte arrays (since UTF-8 code points span 1–4 bytes).
- **Compact dynamically sized containers (zero `rc` inside containers):**
  - `List<T>` = **16 B** (`{ T *data; uint32_t len; uint32_t cap; }`, 2 CPU registers, single backing allocation, same `UINT32_MAX` 64-bit jumbo header if `> 4.29B` elements).
  - `Map<K, V>` & `Set<T>` = **24 B** + **1 contiguous backing allocation** (`int32_t` hash index slots with `-1` tombstone, eliminating both the separate `dead` array and the `rc` allocation).

---

## 2. Ownership, Borrowing, Exclusivity & Closures

- **Unique ownership by default** for `List`, `Map`, `Set`, and owned `String` — eliminating per-container `rc` fields and `_detach` branches on hot writes.
- **Inferred read-only borrowing** (`const *`) for non-`mut` parameters (zero copies, zero refcount traffic) and **move-on-last-use** (`O(1)` descriptor transfer) on returns and dead-binding handoffs.
- **Compile-time exclusivity:** passing the same binding simultaneously as a read-only argument and a `mut` argument (`foo(xs, mut xs)`) is rejected at compile time, eliminating hidden aliasing clones.
- **Explicit shared ownership (`Rc<T>`):** provided as a standalone generic wrapper when shared ownership is genuinely needed, keeping all collection types free of reference-counting overhead.
- **Closures:** non-escaping callbacks (`surface.run`, `sortBy`, etc.) place their environment on the caller's stack (zero heap allocations); escaping closures are uniquely owned in `lt_heap` with compiler-emitted deterministic cleanup.

---

## 3. Arithmetic, Bitwise Primitives & Pure-Lite `core/crypto`

- **Checked default arithmetic** on all `Int*` and `UInt*` types, implemented in C11 via `__builtin_add_overflow` / `__builtin_sub_overflow` / `__builtin_mul_overflow` + `LT_UNLIKELY` (`__builtin_expect(..., 0)`) and `LT_COLD` fault handlers (with portable ISO C11 `#else` fallbacks), eliminating the hardware division currently emitted on every multiplication.
- **Explicit wrapping & unchecked opt-ins:**
  - `wrappingAdd`, `wrappingSub`, `wrappingMul` for explicit wraparound semantics (hashing, PRNGs, ring counters).
  - `uncheckedAdd`, `uncheckedSub`, `uncheckedMul`, `uncheckedDiv` on `Int*` and `Float*` for caller-verified inner loops.
- **Hard-builtin integer bitwise methods** (no operator-precedence grammar changes needed):
  - `bitAnd`, `bitOr`, `bitXor`, `bitNot`, `shiftLeft`, `shiftRight`, `rotateLeft`, `rotateRight`.
- **Edge rules:** mixed signed/unsigned arithmetic requires an explicit `cast`; out-of-range shift counts (`n < 0 || n >= width`) trigger `ArithmeticPanic` (`rotateLeft`/`rotateRight` wrap modulo `width`); `Float8` (E4M3) overflow past `±448.0` triggers `ArithmeticPanic` to match Lite's finite-float contract.
- **Compile-time constant module `val`s** emitted as `static const` in C11 so Clang/GCC constant-fold divisors, masks, and fixed-array bounds checks.
- **Pure-Lite `core/crypto` SHA-256 & SHA-512:** rewritten in pure Lite using `UInt32`/`UInt64`, `UInt8`, bitwise methods, `wrappingAdd`, and stack-inline `[UInt32; 64]` to match hand-written C speed without hiding language bottlenecks behind C shims (optional native hardware SHA-NI/CommonCrypto acceleration remains additive later).

---

## 4. Tiered Virtual-Memory Runtime (Goose + Jai Hybrid)

All random system `malloc`/`calloc`/`realloc`/`free` calls in user and stdlib runtime paths are replaced by a three-tier VM architecture stored in a lock-free `_Thread_local` runtime context (`lt_ctx`), with `-DLITE_ALLOC_SYSTEM` fallback under `--sanitize` so ASan/LSan continue checking every lifetime and bound:

1. **Tier 1 — VM-Reserved Data Stacks (`lt_vm_arena`, Goose/Jai model):**
   - Virtual reservation via POSIX `mmap`/`mprotect`/`madvise(MADV_DONTNEED)`, Windows `VirtualAlloc`, or chunked 64 KB Wasm32 fallback (chained segments on reserve exhaustion; `MemoryFault` only on true OS OOM).
   - **Frame Temp Stack:** automatically checkpointed and rewound in 1 instruction per `extra/surface` frame tick, keeping a 1–2 MB hot committed floor (zero steady-state page faults) while returning large transient spikes to the OS. Invalidates `lt_utf8_cache` via arena generation so reused addresses never read stale metadata.
   - **Scope Data Stacks:** compiler escape analysis routes provably non-escaping local `List`, `TextBuilder`, and external `String` allocations onto scope-bound bump stacks (`sp = mark` on exit, dense linear L1/L2 cache locality).
2. **Tier 2 — VM Slab Heap (`lt_heap`) + Deterministic Single-Owner Cleanup:**
   - Pre-reserved 2 MB VM superblocks partitioned by power-of-two size classes (16 B..32 KB) plus direct VM spans (> 32 KB), keeping consecutive heap allocations localized.
   - Compiler-emitted unconditional single-owner cleanup on scope exit, variable overwrite, `return`/`break`/`continue`, and `finally`/fault unwind — guaranteeing zero leaks and flat RSS across 60/120 FPS games and batch tools (`site-docs`).
3. **Tier 3 — Packed User Pools & Telemetry:**
   - Rebuild [ds/arena](lite://module/ds/arena) and [ds/pool](lite://module/ds/pool) over packed `UInt8` / inline structs and `lt_vm_arena`.
   - Expose `heapAllocs`, `liveBytes`, and `tempPeakBytes` in `surface.vitals()` for zero-allocation frame verification.

---

## 5. Phased Implementation Plan

| Phase | Scope | Verification Gate |
| --- | --- | --- |
| **Phase 0** *(completed)* | Record this architecture specification and cross-link owning docs | `node site/build.ts` + link/fragment validation pass |
| **Phase 1** *(completed)* | Hardware overflow builtins (`__builtin_*_overflow`), `LT_UNLIKELY`/`LT_COLD`, and `static const` module constants in [emit-c.lt](lite://repo/compiler/src/emit-c.lt) | Overflow/division parity tests, full TS/C verification, Gen1/Gen2/Gen3 bootstrap, paired C11 benchmark |
| **Phase 2** *(completed)* | Inline `[T; N]` (with bit-packed 1/2/4-bit arrays), `Int1..64` / `UInt1..64` / `Float8` (E4M3) / `Float16` (`_Float16`) / `Float32` / `Float64`, bitwise + wrapping + unchecked methods, pure-Lite SHA-256/512 | Pure-Lite C11 SHA-256 matches C speeds (~34 ms -> ~1–2 ms); `Vec`/`Mat` math = 0 `malloc`s; full TS/C parity + bootstrap |
| **Phase 3** *(completed)* | `lt_vm_arena`, 16 B immutable SSO `lt_str` (+ jumbo header), generation-safe `lt_utf8_cache`, auto Frame Temp Stack rewind + `surface.vitals()` counters | 10,000-frame native game/HUD loop = 0 persistent allocs/frame, flat RSS, ASan/UBSan clean |
| **Phase 4** *(completed)* | Compile-time exclusivity (`foo(xs, mut xs)`), `rc`-free `List`/`Map`/`Set`, inferred `const *` borrow, move-on-last-use, scope/overwrite cleanup, `lt_heap`, Scope Data Stack escape promotion | ASan/LSan = 0 leaks across native suite, 10,000-frame game loops, and batch `site-docs`; Gen1/Gen2/Gen3 bootstrap |
| **Phase 5** *(completed)* | Explicit 8 B [core/rc](lite://module/core/rc) `Rc<T>` wrapper (TS+C11 parity, `isUnique`/`makeUnique`/`replace`/`reset`), packed `UInt8` + `lt_vm_arena`-backed `VmArena` in [ds/arena](lite://module/ds/arena), packed `UInt32` generational `SlotPool`/`Pool<T>` in [ds/pool](lite://module/ds/pool) | `phase5-rc-pools-dogfood.test.lts` (`Rc<T>` ASan/leak churn, 3-module 2,000-frame zero-alloc game dogfood, `particle-pool.lts` C11 `-Werror`) + full release/corpus parity + bootstrap |

## 6. Phases 6–11

### Phase 6 — Safety flags, unchecked indexing, and builtin boundaries

Extend [OptConfig](lite://repo/compiler/src/opt-config.lt) with independent unchecked, arithmetic, bounds, float-finiteness, and debug-info switches. Before implementation, specify defaults for all six presets and how the Lite checks interact with native sanitizers. Proposed precedence is preset defaults, then `--sanitize` defaults, then explicit per-flag overrides. Test both argument orders for `-O3` and `-fcheck-unchecked` and define what repeated overrides do. Keep regular arithmetic and bounds checks enabled by default across presets.

Add unchecked get and set for lists and fixed arrays. Specify the fault with checks enabled and the valid input domain with checks disabled. Cover ordinary positional access, packed array indexing, and valid unchecked operations on TS and C11.

Use the existing [builtin ABI and selection](lite://repo/compiler/src/builtins-abi.lt) for soft builtins. Each soft builtin needs a verified Lite implementation and can have an optional native override. Candidates include bit counts, byte swap, wide multiplication, carry and borrow operations, scalar helpers, bulk copy and fill, and search. Reserve hard builtins for primitives whose semantics require compiler or runtime support, such as unchecked access, float bit reinterpretation, single-rounding `fma`, `VmArena`, and `Rc<T>`.

### Phase 7 — Borrowed slices

Add non-escaping, allocation-free read-only and mutable [slices](lite://doc/slices) over addressable list and fixed-array storage, plus read-only `String.bytes()`. Use half-open `xs[a..b]`, `xs[..b]`, `xs[a..]`, and `xs[..]`, with `mut xs[a..b]` granting mutable access. Start with `$getSlice` and `$getMutSlice`. Packed backing storage needs a separate representation and write contract.

Include mutable `splitAt(mid)` and suspend access through the parent mutable view while either child borrow is live. Verify empty end slices, disjoint child writes, rejection of owner invalidation and escaping captures, and diagnostics for invalid bounds. Specify how `.toList()` creates owned elements when the element type has single-owner semantics.

### Phase 8 — Native layout and data-oriented types

- Emit C11 `restrict` only when the compiler can prove the required non-aliasing for the accessed storage. Include overlapping views and disjoint `splitAt` halves in the cases.
- Use spare representations to pack `Option<T>` and fall back to a tagged layout when no valid niche exists. Define `-fniche-opt` preset defaults and agreement on layout at package and FFI boundaries. Settle per-type opt-out spelling with the layout attributes. Keep float options tagged until the finite-value invariant is enforced at all relevant ingress points, including bit casts and FFI.
- Add fixed-width `Simd<T, N>`, common aliases, and a compile-time target lane count for `SimdNative<T>`. Specify portable lane behavior first, with scalar fallback on both targets and native vector lowering where supported. Check lane order, integer overflow, and floating-point rounding against the scalar path.
- Add `SoA<R>` with parallel field storage. Define row reads and writes, ownership of moved fields, cleanup, and invalidation when capacity grows.

### Phase 9 — Interfaces

Design [open interface contracts](lite://doc/composition-and-interfaces) before contexts and overloading. Use `Allocator`, `Logger`, and `Index` to exercise conformance, implementation lookup, generic dispatch, and interface-valued dispatch.

### Phase 10 — Lexical contexts

Use `pub context` declarations in a package's `$context.lt`, trailing `context(...)` requirements after `fn(...)` and before the result type, and `context (...) { ... }` for lexical overrides. A default can declare its slot type or infer it from the initializer. `mut` governs access to the supplied value in all three forms. [Package preload](lite://doc/packages-and-preload) remains the owning specification for implicit imports.

The proposed lookup order is the innermost lexical override, the enclosing function's declared slot, then the calling package's default. Match by slot name and validate type and mutability. A function declares each capability it forwards. Closures capture providers lexically under ordinary lifetime and exclusivity rules, and function values retain their context requirements in their types.

The proposed C boundary passes one pointer to a projection containing only the required slots. Functions with no requirements need no extra parameter. Validate cross-package provider selection, mutable reborrows, indirect calls, and escaping versus non-escaping captures before fixing the ABI. Keep generic specialization available where static dispatch is needed.

### Phase 11 — Overloading

Specify direct calls, named arguments, and callable values using the Phase 9 and 10 contracts. The proposed rule selects the callable from explicit arguments and type constraints before resolving its context requirements. Migrate the provisional slice hooks to `Index` and test the migration against the Phase 7 behavior.

## 7. Syntax review implementation queue

The Lite syntax review proposed the following increments. They can proceed alongside the numbered phases as their contracts are confirmed and verified on TS and C11. The review confirmed contextual record literals in calls, assignments, and nested initializers on both targets.

1. **Standalone `do` blocks.** Reuse ordinary executable block semantics and decide how existing standalone brace blocks migrate before introducing standalone inferred records. [Blocks and results](lite://doc/blocks-and-results#standalone-executable-blocks)
2. **Pattern binding in `if`.** Start with `if .Some(n) := source { ... }`, then cover `and n > 0`. Evaluate `source` once and scope `n` to the successful condition and branch. [Pattern contexts](lite://doc/pattern-contexts)
3. **Definite initialization for partial expressions.** Resolve `a := if ready { 42 };` before expanding region-based initialization. The review observed a zero value on the false path. The intended unwritten path needs a diagnostic when later code reads `a` without proof of initialization. [First initialization](lite://doc/first-initialization#conditional-reservation)
4. **Dependent record defaults.** Start with `end: Int = start + 10`. Verify supplied entries in written order, then omitted defaults in declaration order. Leave broader dependency scheduling and its effect order for a separate increment. [Record initialization](lite://doc/record-initialization)
5. **Union values and basic fallible functions.** Start with storing and narrowing `Int | String`, and a returned error in a `T ! E` function that can be handled or forwarded with postfix `!`. Aggregate failure transport can follow separately. [Union values](lite://doc/union-values-and-access) · [Fallible types](lite://doc/fallible-types-and-error-composition)
6. **Standalone inferred records.** Add fixed labels with individual inferred or explicit types after the standalone brace grammar is settled. A candidate case is `scores := { "alice": Float = 10, "bob": UserID = 25, "carl" = "test" };`. [Structured data review](lite://repo/research/investigations/language-review/structured-data-like.md#typed-entries-and-inferred-field-shapes)

Carry definite-initialization checks into Phase 7's rule that slices expose initialized elements only. The basic fallible-function work informs Phase 10's inputs, outputs, errors, and contexts contract. Reuse the [callable variance](lite://doc/callable-value-variance) and [callable defaults](lite://doc/callable-default-contracts) reviews when specifying context requirements and overload selection for typed function values. Whole-use literal inference, field-by-field initialization, and custom collection providers remain follow-up items from the syntax review.

### Compile-time evaluation

Start with the selected first-stage rule for `.lt` modules. Applicable top-level value definitions require an initial value known at compile time. Literals and pure calls with transitively known inputs can meet that requirement implicitly. For example, `width := 4 * 4;` and `area := square(width);` can supply module initial values. A `.lt` function body can still run at runtime when called there. [Modules and packages](lite://doc/modules-and-packages)

Add explicit `comptime { ... }` after ordinary block semantics are established. The same ordinary function should be eligible to run at either stage, including user functions that transitively perform I/O. In the illustrative `seed := comptime { io.readInt() };`, the compiler reads the integer during the build, and the generated program uses the resulting value without repeating the read. Ordinary error handling applies during evaluation. A computation that needs runtime-only state cannot supply a compile-time result.

First-stage `.lt` initializers require an explicit `comptime` block for direct or transitive effects. Test that bare `seed := io.readInt();` and a bare wrapper call are rejected before reading input. Test a known module initializer, an ordinary function called at both stages, rejection of a runtime-dependent input, and an explicit build-time read supplied by the test harness whose result is embedded on both targets. Include handled input failure and failure to produce a required value. Define build-host services, effect ordering, input tracking, and which values can be embedded before enabling effectful execution. [Compile-time evaluation](lite://doc/compile-time-evaluation)

---

## 8. Open items (Phases 6–11)

The remaining unresolved design choices across Phases 6–11 stay explicitly open below rather than being decided implicitly during implementation:

| # | Area | Open Question / Deferred Decision | Current Status / Notes |
| --- | --- | --- | --- |
| **1** | **Phase execution order** | Confirm keeping `6 -> 7 -> 8 -> 9 (Interfaces) -> 10 (Contexts) -> 11 (Overloading)` versus moving Interfaces earlier | Proposed sequence lands raw safety/performance wins early while letting Contexts and Overloading build on Interfaces |
| **2** | **Safety & unchecked switches** *(Phase 6)* | Exact defaults across `-O0`..`-O3` / `-Os` / `-Oc`, precedence and interaction with `--sanitize`, repeated-flag behavior (`-O3 -fcheck-unchecked` in both orders), and exact fault vs unchecked valid-domain contracts for `unchecked*` and `uncheckedGet`/`uncheckedSet` | Keep checked arithmetic and bounds ON by default across presets; overridable independently per flag |
| **3** | **Slice non-escape & `splitAt(mid)`** *(Phase 7)* | Confirm borrowed-only non-escaping `Slice<T>` boundaries (zero `'a` annotations; reject local-slice escape, owner mutation while sliced, and heap storage; `.toList()` element-ownership contract for single-owner values), `mut Slice<T>.splitAt(mid)` parent-borrow suspension, packed-storage slice contract, and whether inclusive `xs[a..=b]` is needed | Provisional `$getSlice` / `$getMutSlice` hook used in Phase 7 until unified in Phase 11 |
| **4** | **Niche packing, SIMD & `SoA<R>`** *(Phase 8)* | Per-type niche opt-out attribute spelling (explicitly deferred to Phase 8 alongside `@packed` / `@align` layout attributes), `-f[no-]niche-opt` preset defaults and package/FFI layout agreement, finite-float ingress enforcement (`bitCast` / FFI) for float niches, portable SIMD overflow/rounding semantics vs scalar paths, and `SoA<R>` row ownership and capacity-growth invalidation | Automatic fallback to tagged layout whenever `nicheCount == 0` (for example a 256-case `Enum: Int8`); runtime-scalable sizeless vectors rejected |
| **5** | **Interfaces / Traits** *(Phase 9)* | Nominal vs structural conformance, implementation/attachment lookup syntax, fat-pointer dynamic dispatch representation, and generic protocol bounds | Deferred to a focused design review immediately before Phase 9 |
| **6** | **Lexical contexts & `$context.lt`** *(Phase 10)* | C/FFI `NULL` `ctx` default-shim behavior, closures capturing `mut` contexts under exclusivity, cross-package provider selection / indirect calls, unused-context diagnostics, and transitive overrides across third-party signatures that omit a context | Unified `context` keyword across `$context.lt` declarations, `fn(...) context(...)`, and `context (...) { ... }` blocks; single `const lt_ctx_* *ctx` C boundary |
| **7** | **Function & method overloading** *(Phase 11)* | Overload ranking and ambiguity rules across generics, named/labeled arguments, defaults, interfaces, contexts, and first-class callable values (`f := foo`) | Deferred to a focused design review immediately before Phase 11; unifies provisional `$getSlice` back into `Index` / `$getIndex` |
