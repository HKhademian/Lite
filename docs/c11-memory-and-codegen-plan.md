# C11 Memory, Raw Values, Numeric Ladder, and Codegen Architecture Plan

Status: **Phases 0–11 complete (Phases 0–8 through `4e3bf354`, Phase 9 at `378ffbbf`/`f318b788`, Phase 10 at `56bbcfb5`/`08e63608`, Phase 11 complete as of 2026-11-27). Remaining deferred follow-ups and the syntax review queue describe post-Phase 11 work.**

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
| **Phase 6** *(completed)* | Independent safety switches (`-f[no-]check-{arithmetic,bounds,float-finite,unchecked,debug-info}`, `--sanitize` precedence with explicit `-f*` last-wins), `List`/`Array` (byte-aligned & bit-packed) `uncheckedGet`/`uncheckedSet`, `Float32`/`Float` bit casts (`toBits`/`fromBits`/`uncheckedFromBits`), and 18 pure-Lite + native-override soft builtins in [core/int](lite://module/core/int) and [core/list](lite://module/core/list) | `phase6-safety-and-builtins.test.lts` (presets, flag order, `--sanitize` ASan/UBSan, C11 `-Werror`, 4-way `(TS, C11) x (builtin, pure)` parity) + corpus parity + bootstrap |
| **Phase 7** *(completed)* | Non-escaping 16 B zero-copy [core/slice](lite://module/core/slice) `Slice<T>` over addressable `List<T>`, byte-aligned `[T; N]`, and nested `Slice<T>` (`xs[a..b]`, `..b`, `a..`, `..`, `a..=b`, `..=b`, `mut xs[a..b]`), mutable `(left, right) := mut s.splitAt(mid)` with parent suspension & disjoint call-site verification, read-only `String.bytes()`, `loop`, `.toList()`, compile-time borrow/escape/closure checks | `phase7-borrowed-slices.test.lts` (TS + C11 `-Werror` + `--sanitize` ASan/UBSan + `-fno-check-{bounds,unchecked}`, rejection & `BoundPanic` matrices) + `range-slicing.test.lts` + corpus parity + 3-gen bootstrap |
| **Phase 8** *(completed)* | Sound C11 `restrict` (with transitive mutable-global & overlap exclusions + disjoint `splitAt`/column slice lowering), `@packed` / `@align(N)` / `@no_niche` layout attributes, `-f[no-]niche-opt` (`O1`/`O2`/`O3`/`Os` on, `O0`/`Oc` off), [core/option](lite://module/core/option) `Option<T>`, narrow plain-enum C storage & niche packing with automatic tagged fallback, fixed-width [core/simd](lite://module/core/simd) `Simd<T, N>` / `SimdNative<T>` (`vector_size` + `-DLITE_SIMD_SCALAR` fallback), and parallel-column [core/soa](lite://module/core/soa) `SoA<R>` with disjoint column slices | `phase8a-layout-niche-restrict.test.lts` & `phase8b-simd-and-soa.test.lts` (3-way SIMD parity, C11 `_Static_assert`s, ASan/LSan/UBSan 0 leaks, rejection matrices) + corpus parity + 3-gen bootstrap |
| **Phase 9** *(completed)* | Nominal `interface` / `impl` conformance (`pub impl`, orphan/coherence checks, generic `Type<Iface>` & multi-bounds), 16 B borrowed `dyn` / `mut dyn` fat-pointer dispatch with NLL/exclusivity checks, [core/interface](lite://module/core/interface) (`Allocator`, `Logger`, `Index`, `IndexMut`) | `phase9-interfaces.test.lts` (`_Static_assert(sizeof == 16)`, zero-vtable static generic check, multi-module coherence, ASan/UBSan, 19-case rejection matrix) + corpus parity + 3-gen bootstrap |
| **Phase 10** *(completed)* | Package-scoped `$context.lt` (`[pub] context [mut] name[: [mut] Type] = init`), `fn(...) context(...): Ret` requirements & order-normalized types, statement & expression `context (...) { ... }` overrides (`=ident`, `mut`), borrow/exclusivity checks, immutable closure capture + `context(...)` on closures/fn values, single `const lt_ctx_* *lite_ctx` C11 projection ABI | `phase10-lexical-contexts.test.lts` (multi-package `$context.lt` isolation, TS/`tsc --strict` & C11 `-Werror`/ASan/UBSan parity, zero-vtable generic inference, C11 projection ABI check, contextual keyword compatibility, 18-case rejection matrix) + corpus parity + 3-gen bootstrap |
| **Phase 11** *(completed)* | Free, module (`pub`), and `Type.op` overloading (`mut self`/param mutability, parameter labels/`=shorthand`, arity, exact/generic/interface-bound/`dyn` specificity ranking, selection-before-context, first-class overloaded fn/type-op values, bodyless `impl` overload resolution), `core/interface` `Range` + `Index`/`IndexMut` for `List<T>`/`[T; N]` and user types, and retirement of provisional `$getSlice`/`$getMutSlice` hooks | `phase11-overloading-and-index.test.lts` (TS/`tsc --strict` & C11 `-Werror`/ASan/UBSan parity, specificity tiers, `context(...)` integration, overloaded `Index`/`Range`/`IndexMut`, Phase 7 slice checks, 15-case rejection matrix) + `range-slicing`/`phase7` + corpus parity + 3-gen bootstrap |
| **Phase 12** *(completed)* | `mut` variable-definition placement cutover (`mut name: T` / `var mut name: T` / `pub mut name: T` via dual-accept -> repo migration -> dropping legacy `name: mut T` + aligning `context mut x: T` / `context(x: mut T)`), contextual static calls (`mut rng: random.Rng = .create(42)`), and writable loop iteration (`loop mut source [as r]` / `.item` with read-only source traversal & `then` `.item`) | `phase12-mut-static-and-loops.test.lts` (TS/`tsc --strict` & C11 `-Werror`/ASan/UBSan parity, Step 1 intermediate seed + repo migration, Step 2/3 cutover & rejection matrices) + `site/build.ts` + corpus parity + 3-gen bootstrap |
| **Phase 13** *(planned)* | Standalone `do { ... }` blocks (two-step cutover migrating and retiring bare `{ ... }` expression blocks), pattern binding in `if` (`if .Some(n) := source`, `and n > 0`, tag-only `.Some`, value-test `.Some(== x)`), and dependent record defaults (`end: Int = start + 10`) | `phase13-syntax-foundations.test.lts` (TS + C11 `-Werror`/ASan/UBSan parity, single-eval & scope-leak rejections, retired bare `{ ... }` expression diagnostic) + `site/build.ts` + corpus + 3-gen bootstrap |
| **Phase 14** *(planned)* | Definite initialization for partial expressions (`a := if ready { 42 };`, `else { ? }`), immutable `Bool` predicate correlation (`flag`/`not flag`), dynamic 1-byte C11 init/drop flag only for maybe-initialized owned locals, and uninitialized-array slice rejection | `phase14-definite-init.test.lts` (branch correlation, first-write vs `var` replacement, owned-value ASan/LSan 0-leak unwinds, uninit-read & uninit-slice rejections) + corpus + 3-gen bootstrap |
| **Phase 15** *(planned)* | Runtime union values (`A \| B`, tagged C11 layout with deterministic drop/clone, widening, `if x: T`/`match`/flow narrowing) and basic fallible functions (`T ! E`, attached `T!` shorthand backed by value-semantic `core/error.Error` + `ToError`, `.ok`/`.err`, implicit success lifting, postfix `!` propagation, `else(err)` recovery) | `phase15-unions-and-fallibles.test.lts` (C11 tagged union drops under ASan/LSan, error-union subset propagation, narrowing & coverage rejections, `T!` attachment grammar tests) + corpus + 3-gen bootstrap |
| **Phase 16** *(planned)* | Portable compiler-embedded compile-time evaluator (TS + native C11 with step/memory panic limits): Stage-1 `.lt` pure evaluation (rejecting bare effects) and explicit `comptime { ... }` with unrestricted build-host access, file-read dependency tracking, and identical owned-value embedding | `phase16-comptime-eval.test.lts` (pure `.lt` init, dual-stage fn, bare-effect rejection before I/O, harnessed build-time read embedded identically on TS & C11, dependency invalidation, handled error & step-limit panic) + corpus + 3-gen bootstrap |
| **Phase 17** *(planned)* | Standalone inferred records (structural anonymous records with identifier & quoted keys, `scores.alice`/`scores."k"`, empty `{}`), symbol & specialized generic function aliases, parameter defaults + overload interaction, and callable value variance | `phase17-inferred-records-and-callables.test.lts` (TS + C11 `-Werror`/ASan parity, empty/quoted/nested structural compatibility, generic alias specialization, default+overload & callable variance checks) + corpus + 3-gen bootstrap |
| **Phase 18** *(planned)* | Post-Phase 7–10 hardening: interface associated types & default method bodies, context C/FFI `NULL` default shims / unused-context diagnostics / escaping `mut` closures, bit-packed slices (`Bool`/`Int1..4`/`UInt1..4`), and float-niche finite ingress on `bitCast`/FFI | `phase18-hardening.test.lts` (TS + C11 `-Werror`/ASan/LSan/UBSan parity, `_Static_assert` float-niche sizes, bit-packed slice write/borrow checks, C FFI `NULL` ctx shim test) + full regression + 3-gen bootstrap |

## 6. Phases 6–11

### Phase 6 — Safety flags, unchecked indexing, and builtin boundaries *(completed)*

Extend [OptConfig](lite://repo/compiler/src/opt-config.lt) with independent unchecked, arithmetic, bounds, float-finiteness, and debug-info switches. Before implementation, specify defaults for all six presets and how the Lite checks interact with native sanitizers. Proposed precedence is preset defaults, then `--sanitize` defaults, then explicit per-flag overrides. Test both argument orders for `-O3` and `-fcheck-unchecked` and define what repeated overrides do. Keep regular arithmetic and bounds checks enabled by default across presets.

Add unchecked get and set for lists and fixed arrays. Specify the fault with checks enabled and the valid input domain with checks disabled. Cover ordinary positional access, packed array indexing, and valid unchecked operations on TS and C11.

Use the existing [builtin ABI and selection](lite://repo/compiler/src/builtins-abi.lt) for soft builtins. Each soft builtin needs a verified Lite implementation and can have an optional native override. Candidates include bit counts, byte swap, wide multiplication, carry and borrow operations, scalar helpers, bulk copy and fill, and search. Reserve hard builtins for primitives whose semantics require compiler or runtime support, such as unchecked access, float bit reinterpretation, single-rounding `fma`, `VmArena`, and `Rc<T>`.

### Phase 7 — Borrowed slices *(completed)*

Add non-escaping, allocation-free read-only and mutable [slices](lite://doc/slices) over addressable list and fixed-array storage, plus read-only `String.bytes()`. Use half-open `xs[a..b]`, `xs[..b]`, `xs[a..]`, and `xs[..]`, with `mut xs[a..b]` granting mutable access. Start with `$getSlice` and `$getMutSlice`. Packed backing storage needs a separate representation and write contract.

Include mutable `splitAt(mid)` and suspend access through the parent mutable view while either child borrow is live. Verify empty end slices, disjoint child writes, rejection of owner invalidation and escaping captures, and diagnostics for invalid bounds. Specify how `.toList()` creates owned elements when the element type has single-owner semantics.

### Phase 8 — Native layout and data-oriented types *(completed)*

- **C11 `restrict`:** emit `* restrict` only when transitive call/global analysis proves no mutable-global aliasing and slice borrows are provably disjoint (`splitAt` halves, distinct `SoA<R>` columns, and disjoint bindings).
- **Layout attributes, `Option<T>`, and niche packing:** `@packed` (POD fields only), `@align(N)` (powers of two `1..4096`), `@no_niche` per-type opt-out, `-f[no-]niche-opt` (`O1`/`O2`/`O3`/`Os` enabled by default; `O0`/`Oc` disabled; package/FFI headers use explicit `-fno-niche-opt` or `@no_niche` when ABI stability across flags is required), narrow plain-enum backing storage, and recursive spare-bit niche packing for `Option<T>` (`Bool`, `Int1..4`, `UInt1..4`, non-full plain `Enum`, `String`, `Rc<T>`, `List<T>`) with automatic tagged fallback when `nicheCount == 0` or on float payloads (until finite-value ingress is enforced across `bitCast`/FFI).
- **Fixed-width SIMD:** `Simd<T, N>` (power-of-two `N` in `2..64`, `<= 64` B; common aliases `Int8x16`..`Float64x4` in [core/simd](lite://module/core/simd)) and `SimdNative<T>` (`16 / sizeof(T)` 128-bit portable baseline; runtime-scalable sizeless vectors rejected), lowering on C11 via `__attribute__((vector_size))` unions with `-DLITE_SIMD_SCALAR` fallback and strict left-to-right checked overflow/finite/rounding semantics matching scalar Lite and TS.
- **Structure of arrays (`SoA<R>`):** parallel heap column buffers in [core/soa](lite://module/core/soa) with move/drop-safe row `pushBack`/`popBack`/`swapRemove`/`get`/`set`, zero-copy disjoint column slice views (`p.x`, `mut p.x`), and compile-time rejection of capacity-growth or whole-container mutation while any column slice is active.

### Phase 9 — Interfaces *(completed)*

Nominal open interfaces (`Name := interface[<T>] { ... }`), explicit `impl` conformance (`[pub] impl[<T>] Interface[<Args>] for Target[<Args>]` with bodyless `;` or inline `{ ... }` method blocks, orphan/coherence checks, completeness & signature/mutability matching), zero-overhead monomorphized generic protocol bounds (`T: Type<Iface>`, multi-bound `Type<I1, I2>`), zero-allocation borrowed dynamic views (`dyn Iface`, `mut dyn Iface` as 16 B `{ void *data; const lt_vt_* *vt; }` fat pointers with non-escaping borrow checks, `mut` exclusivity, object-safety checks, and rvalue post-drop handling), and core interfaces ([core/interface](lite://module/core/interface): `Allocator`, `Logger`, `Index<K, V>`, `IndexMut<K, V>`).

See [composition and interfaces](lite://doc/composition-and-interfaces).

### Phase 10 — Lexical contexts *(completed)*

- **Ambient declarations & package isolation:** `[pub] context [mut] <name>[: [mut] <Type>] = / := <init>` in modules and per-package `$context.lt` files (`Slice<T>` and inferred `dyn Interface` rejected). `$context.lt` exports only `ITEM_KIND_PUBLIC_CONTEXT` to its calling package; callers in outside packages must supply overrides or their own package default. [Package preload](lite://doc/packages-and-preload) remains the owning specification for implicit imports.
- **Function requirements & overrides:** Trailing `context([mut] slot: [mut] Type, ...)` clauses (canonicalized by slot name, omitting any extra parameter when empty) and statement/expression `context (...) { ... }` overrides (`slot = expr`, `mut slot = local`, `slot = mut local`, `=ident`, `mut =ident`, fresh mutable rvalue slots with deterministic cleanup, non-shadowing of ordinary locals). Lookup resolves innermost lexical override, enclosing function slot, calling module ambient, then calling package `$context.lt`.
- **Safety, generics & closures:** Full exclusivity and borrow tracking against explicit arguments, other context slots, and outer local mutations/reads; static generic `Type<Iface>` inference through context slots with zero vtable overhead; function values and closures preserve `@ctx(...)` requirements; closures may capture immutable non-borrowed outer context slots by value while borrowing/`mut` slots require explicit `context(...)`.
- **C11 ABI:** Functions requiring contexts receive a single trailing `const lt_ctx_<hash> *lite_ctx` projection parameter (with `restrict` suppressed cleanly); functions without context requirements have zero ABI overhead. C/FFI `NULL` `ctx` default shims, escaping `mut` closures, unused-context diagnostics, and transitive overrides across non-context third-party wrappers remain deferred follow-up items.

### Phase 11 — Overloading *(completed)*

Free functions, `Type.op` inherent operations (`self` vs `mut self`, static vs instance), and `pub` module exports support static overloading with `$ov<N>` C11/TS mangling added only on secondary overloads so un-overloaded symbols preserve stable ABI names. Duplicate-signature keys exclude return types and `context(...)` clauses while alpha-normalizing generic type parameters, rejecting return-type-only and context-only overloads. Call resolution evaluates argument routing (positional, named labels, and `=shorthand`), mutability, generic unification/constraints, and specificity tiers (concrete > multi-bound generic > single-bound generic > `dyn Interface` > unconstrained generic, preferring structured patterns like `List<T>` over bare `T` and defaulting unsuffixed integer/float literals to `Int`/`Float`), strictly before resolving Phase 10 `context(...)` requirements. Expected `fn(...)` types disambiguate first-class overloaded function and type-operation values, and bodyless `impl` selects the matching `Type.op` signature. Provisional `$getSlice` / `$getMutSlice` compiler hooks are retired in favor of [core/interface](lite://module/core/interface) `Range` and `Index` / `IndexMut` (`List<T>`, `[T; N]`, and user-defined overloaded key/range indexing), while Phase 7 borrowed `Slice<T>` syntax preserves non-escaping borrow/exclusivity and `splitAt` semantics.

### Phase 12 — `mut` placement, contextual static calls, and writable loops *(completed)*

All three increments shipped on TS (`tsc --strict`) and C11 (`-std=c11 -Wall -Wextra -Werror` + ASan/UBSan):

- **Prefix `mut` variable definitions:** `mut name: T`, `var mut name: T`, and `pub mut name: T` are accepted across local, module, block, zero-initialized, and `?` reserved storage definitions; legacy `name: mut T` whole-variable declarations, `mut var`, duplicate `mut`/`var`, `context(mut x: T)`, and `context x: mut T` are rejected while access contracts (`name: mut T` in params, `context(...)`, and compound types) remain type-side.
- **Contextual static calls:** Leading-dot calls such as `.create(42)` or `.make("hi")` resolve static type operations (including generic, type-alias, numeric, intrinsic `Rc`/`Simd`/`SoA`, overloaded, and `context(...)`-taking operations) from a unique expected type, rejecting missing expected types, uncalled references, instance operations, and ambiguous collisions with loop metadata or enum cases.
- **Writable loop iteration:** `loop mut source [as r] { ... }` supports addressable writable `List<T>`, byte-aligned `[T; N]`, and mutable `Slice<T>` sources on both TS (live getter/setter box) and C11 (direct backing-storage pointer), keeping `source` read-only during traversal, enforcing exclusivity between `r` and `.item`, and snapping a read-only copy of the last updated element for `then { .item }` (retaining the zero placeholder when empty).

See [mut qualifier placement](lite://doc/mut-qualifier-placement) and [writable iteration](lite://doc/loops#writable-iteration).

### Phase 13 — `do` blocks, `if` pattern binding, and dependent record defaults *(completed)*

All three increments shipped on TS (`tsc --strict`) and C11 (`-std=c11 -Wall -Wextra -Werror` + ASan/UBSan):

- **Standalone `do { ... }` blocks:** `do` is reserved; `do { ... }`, `@tag do { ... }`, trailing `finally`, and statement `do { ... }` execute ordinary lexical blocks, while unprefixed `{ ... }` in expression position is rejected (`"standalone block expressions must use do { ... }"`) so `{ ... }` can later represent inferred structural records in Phase 17. Statement `{ ... }`, `@tag { ... }`, construct bodies, and contextual nominal record literals (`u: User = { ... }`, `u: User = {}`) retain their existing semantics.
- **Pattern binding in `if`:** `if <pat> := <source>` supports enum payload/tag-only/value-test patterns, tuples, records, nested patterns, `or` alternatives, mixed `if`/`else if`/`else` chains, `@tag if ... then ... finally`, loop-tail partial `if`, and left-to-right `and` chains mixing additional pattern matches with `Bool` guards. Each `<source>` evaluates once, bindings are scoped strictly to subsequent `and` clauses and the matched branch, outermost `if name: Type := expr` is rejected, and C11 drops fresh owned pattern sources on both fallthrough and early exits.
- **Dependent record defaults:** Record field defaults resolve in declaration order with earlier fields read-only in scope (`end: Int = start + 10`) and reject self or forward field references. At construction sites, supplied initializers evaluate first in written order, then omitted defaults evaluate in declaration order (handling local, cross-module `.lt`, owned `List`/`String`, and C11 `/*@CBLK:` compound unwrapping across tuple/list/array/enum constructors).

See [standalone executable blocks](lite://doc/blocks-and-results#standalone-executable-blocks), [pattern contexts](lite://doc/pattern-contexts), and [record initialization](lite://doc/record-initialization).

## 7. Syntax review implementation queue (Phases 12–17)

The Lite syntax review, [mut qualifier placement cutover](lite://doc/mut-qualifier-placement#planned-variable-definition-migration) *(completed in Phase 12)*, and [writable iteration](lite://doc/loops#writable-iteration) *(completed in Phase 12)* decisions are scheduled into **Phases 12–17** in the table above (followed by **Phase 18** hardening). The review already confirmed contextual record literals in calls, assignments, and nested initializers on both TS and C11. Remaining locked design decisions across Phases 13–17:

- **Phase 12 (`mut` cutover, contextual `.static()`, `loop mut` — *completed*):** Dropped legacy `name: mut T` whole-variable definitions, aligned `context` mut syntax, added contextual `.static(...)` calls, and shipped in-place `loop mut source [as r]` / `.item`.
- **Phase 13 (`do` blocks, `if` patterns, dependent defaults — *completed*):** Performed a clean two-step cutover adding `do { ... }` and retiring bare `{ ... }` expression blocks so `{ ... }` can later represent inferred records; added single-eval `if` pattern bindings and written-order / declaration-order dependent record defaults.
- **Phase 14 (Definite initialization):** Correlate immutable `Bool` predicates (`flag`, `not flag`) across branches and exhaustive `if`/`match` joins, emitting a 1-byte C11 init/drop flag only for dynamically maybe-initialized owned locals.
- **Phase 15 (Runtime unions & fallibles):** Ship runtime `A | B` unions together with basic `T ! E` / attached `T!` / `!` / `else(err)` (deferring `({ ... })?` flat panic capture), representing the general `Error` behind `T!` as a value-semantic `core/error.Error` record plus optional `ToError` conversion.
- **Phase 16 (Compile-time evaluation):** Build one portable compiler-embedded evaluator shared by TS and native C11 builds with step/memory panic limits, supporting implicit pure Stage-1 `.lt` evaluation and unrestricted build-host access inside `comptime { ... }` with tracked file-read invalidation.
- **Phase 17 (Inferred records & callables):** Represent standalone `{ "alice": Float = 10, "carl" = "test" }` as structural anonymous records (with identifier + quoted keys and empty `{}` as an empty structural record while `u: User = {}` preserves defaults), alongside symbol/specialized generic function aliases, parameter defaults, and callable variance.

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

## 8. Open items (Phases 7–11)

Confirmed architectural sequencing and Phase 7 baseline rules:

- **Phase order confirmed:** `6 (Safety/Builtins, completed) -> 7 (Slices, completed) -> 8 (restrict/Niche/SIMD/SoA) -> 9 (Interfaces) -> 10 (Contexts) -> 11 (Overloading)` — Slices establish the borrow rules `restrict` relies on, and Interfaces give Contexts and Overloading a shared foundation.
- **Phase 7 slice baseline confirmed & shipped:** Non-escaping borrowed slices for local use and borrowed calls; mutable `splitAt(mid)` yields two disjoint mutable views and suspends access through the parent until both child borrows end.

The remaining unresolved design choices across Phases 7–11 stay explicitly open below rather than being decided implicitly during implementation:

| # | Area | Open Question / Deferred Decision | Current Status / Notes |
| --- | --- | --- | --- |
| **1** | **Deferred slice details** *(Phase 7 follow-up)* | Slices over bit-packed backing storage (`Bool`, `Int1..4`, `UInt1..4` representation and write rules) | Half-open (`a..b`, `..b`, `a..`, `..`), inclusive (`a..=b`, `..=b`), `String.bytes()`, and `.toList()` (deep-copying owned elements) shipped in Phase 7; provisional `$getSlice` / `$getMutSlice` hooks retired and migrated to `Index` / `Range` in Phase 11; bit-packed slices remain rejected until representation and write rules are settled |
| **2** | **Float-niche finite ingress** *(Phase 8 follow-up)* | Finite-value ingress enforcement on raw `bitCast` / FFI boundaries before enabling float NaN-boxing niches | Layout attributes (`@packed`, `@align(N)`, `@no_niche`), `-f[no-]niche-opt`, automatic tagged fallback when `nicheCount == 0`, portable `Simd<T, N>`/`SimdNative<T>` semantics (sizeless rejected), and `SoA<R>` ownership/column-borrow invalidation shipped in Phase 8 |
| **3** | **Interfaces / Traits** *(Phase 9 shipped, Phase 11 `Index`/`Range` migrated)* | Associated types and default method bodies | Nominal `interface` / `impl`, orphan/coherence checks, monomorphized `Type<Iface>` + `Type<I1, I2>` bounds, object-safe `dyn`/`mut dyn` fat-pointer dispatch, and `core/interface` (`Allocator`, `Logger`, `Index<K, V>`, `IndexMut<K, V>`) shipped in Phase 9, with `Range` + built-in/user `Index` migration completed in Phase 11 |
| **4** | **Lexical contexts & `$context.lt`** *(Phase 10 shipped)* | C/FFI `NULL` `ctx` default-shim behavior, escaping closures capturing `mut`/borrowed contexts, unused-context diagnostics, and transitive overrides across third-party signatures that omit a context | Unified `context` keyword across `$context.lt`/module declarations, `fn(...) context(...)`, and `context (...) { ... }` blocks, package `$context.lt` isolation, exclusivity & `$ctxborrow` tracking, generic inference, and single `const lt_ctx_* *lite_ctx` C11 projection ABI shipped in Phase 10 |
| **5** | **Function & method overloading** *(Phase 11 shipped)* | Default-parameter interactions (when parameter defaults are added) and explicit overloaded generic instantiation without contextual argument guidance | Direct calls, labeled/`=shorthand` routing, `mut` matching, specificity ranking (`concrete > multi-bound > single-bound > dyn > generic`), selection-before-context, first-class overloaded fn/type-op values, bodyless `impl` overload selection, and `$getSlice`/`$getMutSlice` retirement to `Index`/`Range` shipped in Phase 11 |
