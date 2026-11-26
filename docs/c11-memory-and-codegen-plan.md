# C11 Memory, Raw Values, Numeric Ladder, and Codegen Architecture Plan

Status: **owner-confirmed architecture plan, 2026-11-26** (design locked; Phase 0 documentation & cross-links landed, Phases 1–5 queued for incremental delivery).

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
| **Phase 1** | Hardware overflow builtins (`__builtin_*_overflow`), `LT_UNLIKELY`/`LT_COLD`, and `static const` module constants in [emit-c.lt](lite://repo/compiler/src/emit-c.lt) | Overflow/division parity tests, full TS/C verification, Gen1/Gen2/Gen3 bootstrap, paired C11 benchmark |
| **Phase 2** | Inline `[T; N]` (with bit-packed 1/2/4-bit arrays), `Int1..64` / `UInt1..64` / `Float8` (E4M3) / `Float16` (`_Float16`) / `Float32` / `Float64`, bitwise + wrapping + unchecked methods, pure-Lite SHA-256/512 | Pure-Lite C11 SHA-256 matches C speeds (~34 ms -> ~1–2 ms); `Vec`/`Mat` math = 0 `malloc`s; full TS/C parity + bootstrap |
| **Phase 3** | `lt_vm_arena`, 16 B immutable SSO `lt_str` (+ jumbo header), generation-safe `lt_utf8_cache`, auto Frame Temp Stack rewind + `surface.vitals()` counters | 10,000-frame native game/HUD loop = 0 persistent allocs/frame, flat RSS, ASan/UBSan clean |
| **Phase 4** | Compile-time exclusivity (`foo(xs, mut xs)`), `rc`-free `List`/`Map`/`Set`, inferred `const *` borrow, move-on-last-use, scope/overwrite cleanup, `lt_heap`, Scope Data Stack escape promotion | ASan/LSan = 0 leaks across native suite, 10,000-frame game loops, and batch `site-docs`; Gen1/Gen2/Gen3 bootstrap |
| **Phase 5** | Standalone explicit `Rc<T>` + packed `UInt8`/VM-backed [ds/arena](lite://module/ds/arena) and [ds/pool](lite://module/ds/pool) | Full tests + multi-file game dogfood checks |
