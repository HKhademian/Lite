# Serious usage, generics, and libraries roadmap

Status: **owner-selected architecture and roadmap direction, 2026-11-25** (language/generics ladder, sibling `lib/` namespaces, `gfx/surface` Slices 1–3 + C11 frame scratch, and platform-target / standalone web export are implemented; multi-file `apps/<name>/` dogfooding and procedural audio mixer remain queued).

This document records the settled architecture for scaling LiteLang and its toolchain from small scripts and playground sketches into serious native and web applications, including multi-file games.

## 1. Language & generics ladder

LiteLang uses one uniform compile-time parameter list `<...>` (omitted when empty) across `record`, `enum`, `distinct`, `alias`, and `fn`, with zero `const`, `where`, or `<:` syntax:

```text
Numeric  := alias Int | Int8 | Int16 | Int32 | Float | Float32;

Vec      := record<T: Type, N: Int> { data: [T; N]; };
Option   := enum<T: Type> { None; Some(T); };
Id       := distinct<T: Type> Int;
Vec2     := alias<T: Type> Vec<T, 2>;
IVec2    := alias Vec<Int, 2>;

Vec.dot  := fn<T: Type<Numeric>, N: Int>(a: Self<T, N>, b: Self<T, N>): T { ... };
Vec.x    := fn<T: Type, N: Int>(v: Self<T, N>): T { v.data[0] };
Vec.setX := fn<T: Type, N: Int>(v: mut Self<T, N>, val: T): Unit { v.data[0] = val; };
```

Ordered implementation steps:

1. **`alias` and `distinct` declarations:** `Name := alias ...` (transparent type aliases) and `Name := distinct ...` (nominal identity over an existing representation, such as `MechaniCat := distinct Cat;` and `Surface := distinct Int;`, crossed via `cast<T>(value)` / inferred `cast(value)`) are implemented across TS and C11 per [aliases and distinct type declarations](lite://doc/type-aliases); legacy `:= type X` declarations have been migrated to `:= alias X` and retired. Lexically scoped value/module/function symbol aliases and specialized/partially-specialized generic function aliases (`pub ivec2 := alias vecN<Int, 2>;`, `pub splat2 := alias<T: Type<Numeric>> splat<T, 2>;`) remain planned per [aliases and distinct type declarations](lite://doc/type-aliases).
2. **Generic `record<T: Type>`, `enum<T: Type>`, `distinct<T: Type>`, `alias<T: Type>`, and payload-bearing enum variants (implemented across TS and C11):** User nominal types and generic type aliases accept uniform `<T: Type>` parameters across declarations, cross-module exports, and monomorphization. Type-attached operations keep `<...>` solely on `fn<...>` and strictly use `Self` / `Self<...>` per [type-attached operations](lite://doc/type-operations) and [temporary generic notation](lite://doc/generic-notation). Payload-bearing enum variants (`Option<T> := enum<T: Type> { None; Some(T); }`, `Result<T, E> := enum<T: Type, E: Type> { Ok(T); Err(E); }`, multi-payload cases `Click(Int, Int)`), constructor expressions, contextual `.Case(...)` shorthand, and nested/exhaustive `match` payload patterns compile across both TS and C11.
3. **Discrete comptime value parameters & dead-branch elimination (implemented across TS and C11):** Tier 2 discrete compile-time value types — `Int`, `Bool`, payload-free `enum`, and `String` (excluding `Float` to avoid IEEE-754 identity hazards such as `-0.0` vs `+0.0` and `NaN`) — work across `fn`, `record`, `distinct`, `enum`, `alias`, `[T; N]` fixed-array extents, explicit `<Args>` calls, cross-module exports, and constant-folded `if`/`match` dead-branch elimination (`Vec<T, N>`, `Mat<T, R, C>`, `Box<T, D>`, `Ray<T, D>`).
4. **Type narrowing (`T: Type<Constraint>`) (implemented across TS and C11):** Closed type-set unions declared via `Numeric := alias Int | Float | ...;`, inline unions (`T: Type<Int | Float>`), multi-bound intersections (`T: Type<A, B>`), call-site/nominal instantiation checks, and subset forwarding across `fn`, `record`, `distinct`, `enum`, and `alias` work across TS and C11 while keeping unions forbidden in runtime/container positions. Vector coordinate extensions (`.x()`/`.y()`/`.z()`/`.w()`, `mut` setters, and `.r()`/`.g()`/`.b()`/`.a()`) use runtime bounds checks initially and compile-time checks once general comptime validation lands.

## 2. General-purpose library & repository taxonomy

As batteries-included modules grow, keep `core/` focused on the language/OS kernel, organize completely general-purpose libraries into sibling domain namespaces under `lib/`, keep `extra/` for optional multimedia/interactive domains, and enforce **zero cross-module re-exports** (for example, colors live in [gfx/color](lite://module/gfx/color) and geometry types stay in `math/geom` rather than being re-exported by [gfx/surface](lite://module/gfx/surface)):

| Tier / Path | Purpose | Modules / Scope |
| --- | --- | --- |
| `lib/core/` | Language & OS kernel only | `io`, `file`, `path`, `process`, `time`, `text`, `unicode`, `int`, `list`, `array`, `map`, `set`, `format`, `crypto`, `diag`, `test`, `source` |
| `lib/math/` | Unified general-purpose math (pure Lite reference + soft-builtin overrides; **promoted to sibling namespace**) | [scalar](lite://module/math/scalar) (single home for scalar math, replacing `core/math`), [random](lite://module/math/random), [vector](lite://module/math/vector), [matrix](lite://module/math/matrix), [geom](lite://module/math/geom), `collision`, `noise`, `tween`, `ik` |
| `lib/ds/` | Completely general-purpose abstract data structures (**promoted to sibling namespace**) | [arena](lite://module/ds/arena), [pool](lite://module/ds/pool), [sparse](lite://module/ds/sparse), [heap](lite://module/ds/heap), [grid](lite://module/ds/grid), [deque](lite://module/ds/deque), [ring](lite://module/ds/ring), [bitset](lite://module/ds/bitset), [lru](lite://module/ds/lru), [intern](lite://module/ds/intern), [spatial](lite://module/ds/spatial) |
| `lib/data/` | General-purpose formats & codecs | [json](lite://module/data/json), [csv](lite://module/data/csv), `qoi` |
| `lib/extra/` | Optional multimedia, GUI, and game-domain modules | [surface](lite://module/gfx/surface), [canvas](lite://module/gfx/canvas), [board](lite://module/gfx/board), [color](lite://module/gfx/color), [audio](lite://module/media/audio), [timer](lite://module/core/timer), `ecs`, `ui`, `particles` |
| `apps/<name>/` | Multi-file serious applications & dogfood games | Separate from single-file Playground programs under `samples/` |

See [modules and packages](lite://doc/modules-and-packages) and [the library index](lite://repo/lib/README.md).

## 3. Portable `gfx/surface`, beginner `gfx/canvas`, audio, memory & targets

1. **Portable `gfx/surface` + beginner `gfx/canvas`:**
   - **Slice 1 (completed):** Host-driven `surface.run(win, onFrame)` across C11 and TS, pluggable `LiteSurfaceHost`, browser Playground integration, and mountable `createCanvasSurfaceHost`.
   - **Slice 2 (completed):** Rebased [gfx/canvas](lite://module/gfx/canvas) as a simple, zero-jargon pixel-graphics entry layer (`setPixel`, `unsetPixel`, `clear`, `fillRect`, `draw`, `show`, `start`) implemented purely on top of [gfx/surface](lite://module/gfx/surface), retiring duplicated Play rendering glue.
   - **Slice 3 (completed for 2D surface/input/textures/ASCII + frame scratch):** Expanded `gfx/surface` with immediate-mode edge-triggered queries (`isKeyDown`, `isKeyPressed`, `isKeyReleased`, `isPointerPressed`, `isPointerReleased`, `wheelDelta`), offscreen `Texture` (`createTexture`, `setTexturePixel`, `blit`, `blitScaled`, `destroyTexture`), `fillTriangle`, `setClipRect`/`clearClipRect`, full 95-glyph printable ASCII bitmap font, and `scratchMark`/`scratchRewind`. Multi-voice procedural audio mixer remains queued.
2. **C11 memory & leak hygiene:** Audited 5,000-frame 60 FPS native loops with `--sanitize` (ASan/LSan) and live `vitals.memoryBytes`, and implemented checkpointed `lt_str_slab` frame-scratch string reclamation (`scratchMark`/`scratchRewind`); full VM-backed arenas, inline raw values, and automatic single-owner collection cleanup are scheduled in [C11 memory, raw values, and codegen plan](lite://doc/c11-memory-and-codegen-plan); see also [memory and performance](lite://doc/memory-and-performance).
3. **Platform targets & export tooling (completed):** Decoupled codegen backend (`c` / `ts`) from platform target (`native`, `macos`, `linux`, `windows`, `headless`, `web`) in `./bin/lite build` (`--platform ...`, `--web`, `--headless`), including standalone single-file HTML5 web export embedding a browser `gfx/surface` canvas/input/audio host.
4. **Dogfood validation (queued next):** Build multi-file applications and games under `apps/<name>/` to stress-test compiler ergonomics, libraries, rendering, audio, and memory end-to-end.

## 4. Library & ergonomics audit findings

Concrete improvements identified during the 2026-11-25 library and ergonomics audit:

- **Symbol & specialized generic function aliases (planned):** Implement value/module/function symbol aliases and full/partial generic function specialization (`alias fnName<Args...>`, `alias<...> fnName<Args...>`) across TS and C11 per [aliases and distinct type declarations](lite://doc/type-aliases).
- **First-class `Array<T, N>` interface & `[val; N]` literal ([core/array](lite://module/core/array) — completed):** Added `[val; N]` repeat-array literals across TS and C11 (with `mut` fixed-array support), promoted `Array<T, N>` to first-class type syntax (`[T; N]` sugar, rejecting 1-arg `Array<T>`), moved `filled` and `zeroed` directly onto `Array` static operations (`Array<T, N>.filled`, `Array<T, N>.zeroed`, `Array.fill`, `Array.length`, `Array.isEmpty`, `$getIndex`/`$setIndex`) in `lib/core/array.lt`, and rewrote `math/vector` `Vec.splat` on `Array<T, N>.filled`. See [fixed-length arrays](lite://doc/arrays).
- **[math/vector](lite://module/math/vector), [math/matrix](lite://module/math/matrix), [math/geom](lite://module/math/geom), and [core/timer](lite://module/core/timer) unification (completed):**
  - Unified `Vec2<T>`, `Vec3<T>`, and `Vec4<T>` onto `Vec<T, N>`, moved `from`/`splat`/`zeroed` onto `Vec` static type operations automatically inherited by aliases (`IVec2.zeroed()`, `Vec2.splat(...)`), removed redundant `ivec*`/`fvec*` concrete wrappers in favor of generic `vec2`/`vec3`/`vec4`, unified `Mat2..4`/`FMat2..4` onto generic `Mat<T, R, C> { rows: [Vec<T, C>; R]; }` with static constructors (`Mat.from`, `Mat.zeroed`, `Mat.identity`, `FMat3.translate2`, `FMat4.perspective`, ...), unified `Circle`/`Sphere` onto `Ball<T, N>`, and converted `core/timer` (`StepClock`, `Cooldown`, `Stopwatch`) to nominal `record`s with methods.
  - Replaced `var out: [T; N]; Vec<T, N> { data = out }` in `zeroVec` with direct [universal zero initialization](lite://doc/zero-initialization) (`res: Vec<T, N>; res`).
  - Replaced manual `var i := 0; loop i < N { ...; i += 1; }` loops across `lib/math/` and `lib/ds/` with `loop 0..N as i { ... }` per [loops](lite://doc/loops).
- **`lib/ds/` nominal `record` & generic `record<T: Type>` modernization (completed):**
  - Migrated all `lib/ds/` modules ([ds/arena](lite://module/ds/arena), [ds/pool](lite://module/ds/pool), [ds/intern](lite://module/ds/intern), [ds/lru](lite://module/ds/lru), [ds/bitset](lite://module/ds/bitset), [ds/sparse](lite://module/ds/sparse), [ds/heap](lite://module/ds/heap), [ds/ring](lite://module/ds/ring), [ds/deque](lite://module/ds/deque), [ds/grid](lite://module/ds/grid), and [ds/spatial](lite://module/ds/spatial)) to nominal `record` and generic `record<T: Type>` value types (`TypedArena<T>`, `Pool<T>`, `Lru<K, V>`, `PriorityQueue<T>`, `Ring<T>`, `Deque<T>`, `Grid<T>`, nominal `Arena`/`SlotPool`/`Interner`/`Bitset`/`SparseSet`/`MinHeap`/`MaxHeap`), retiring module-global slab handle tuples and redundant per-type copy-pastes.
- **Core, math, data & extra abstraction pass (completed):**
  - Unified generic collection operations across [core/list](lite://module/core/list) and [core/array](lite://module/core/array) (`sort`, `sortBy`, `sortTexts`, `indexOf`, `contains`, `dedup`, `fold`, `any`, `all`, `find`, `findIndex`, `map`, `filter`, `join`), unified Unicode codecs and scalar/UTF helpers onto `String.*` in [core/text](lite://module/core/text) (including `String.toUpperAscii`, inlining `*Pure` helpers, and retiring `core/unicode`), moved `String.split`, `splitLines`, `replaceAll`, `padLeft`, `padRight`, `lessOrEqual` onto [core/text](lite://module/core/text) and `Int.checked*`/`floorDiv`/`floorMod` onto [core/int](lite://module/core/int) (plus `Int.toText` directly inlined), unified scalar `abs`/`min`/`max`/`clamp`/`sign` over `Numeric` in [math/scalar](lite://module/math/scalar), moved [math/random](lite://module/math/random) and [data/csv](lite://module/data/csv) onto nominal types, consolidated `util/json` into [data/json](lite://module/data/json), and retired `core/format`, `core/unicode`, and `util/text`.

## 5. Future planning backlog

- **Interfaces / traits / structural protocol constraints:** Documented in [composition and interfaces](lite://doc/composition-and-interfaces#next-stage-planning-note-generic-protocoltrait-constraints-vs-closed-union-constraints) for the next language-design session so generic containers and algorithms can abstract over open user-defined types rather than closed type unions.
- **Generic `Color<T>` (`FColor`, `BColor`):** Deferred in favor of non-generic nominal `Color` in [gfx/color](lite://module/gfx/color) for now; can be revisited later alongside numeric/channel abstraction once open constraints or storage conversions are prioritized.
