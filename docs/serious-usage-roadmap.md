# Serious usage, generics, and libraries roadmap

Status: **owner-selected architecture and roadmap direction, 2026-11-25** (Slice 1 of `extra/surface` is implemented; the remaining language, library, memory, runtime, and target tracks are planned increments).

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

1. **`alias` and `distinct` declarations:** `Name := alias ...` (transparent type aliases) and `Name := distinct ...` (nominal identity over an existing representation, such as `MechaniCat := distinct Cat;` and `Surface := distinct Int;`, crossed via `cast<T>(value)` / inferred `cast(value)`) are implemented across TS and C11 per [aliases and distinct type declarations](lite://doc/type-aliases); legacy `:= type X` declarations have been migrated to `:= alias X` and retired. Lexically scoped value/module symbol aliases and `alias<T: Type>` remain next increments.
2. **Generic `record<T: Type>`, `enum<T: Type>`, `distinct<T: Type>`, and `alias<T: Type>` (implemented across TS and C11; payload enums `Some(T)` next):** User nominal types and generic type aliases accept uniform `<T: Type>` parameters across declarations, cross-module exports, and monomorphization. Type-attached operations keep `<...>` solely on `fn<...>` and strictly use `Self` / `Self<...>` per [type-attached operations](lite://doc/type-operations) and [temporary generic notation](lite://doc/generic-notation). Payload-bearing enum variants (`Option<T> := enum<T: Type> { None; Some(T); }`) remain the next language increment before discrete comptime values.
3. **Discrete comptime value parameters & dead-branch elimination:** Admit Tier 2 discrete compile-time value types — `Int`, `Bool`, payload-free `enum`, and `String` (excluding `Float` to avoid IEEE-754 identity hazards such as `-0.0` vs `+0.0` and `NaN`) — together with constant-folded `if`/`match` dead-branch elimination so one implementation covers 2D/3D/4D and mode variants (`Vec<T, N>`, `Mat<T, R, C>`, `Box<T, D>`, `Ray<T, D>`).
4. **Type narrowing (`T: Type<Constraint>`):** Support `Type<Constraint>` using closed unions (such as `Numeric`) immediately, scaling naturally to multi-bound `Type<A, B>` and future interfaces. Vector coordinate extensions (`.x()`/`.y()`/`.z()`/`.w()`, `mut` setters, and `.r()`/`.g()`/`.b()`/`.a()`) use runtime bounds checks initially and compile-time checks once general comptime validation lands.

## 2. General-purpose library & repository taxonomy

As batteries-included modules grow, keep `core/` focused on the language/OS kernel, organize completely general-purpose libraries into sibling domain namespaces under `lib/`, keep `extra/` for optional multimedia/interactive domains, and enforce **zero cross-module re-exports** (for example, colors live in [extra/color](lite://module/extra/color) and geometry types stay in `math/geom` rather than being re-exported by [extra/surface](lite://module/extra/surface)):

| Tier / Path | Purpose | Modules / Scope |
| --- | --- | --- |
| `lib/core/` | Language & OS kernel only | `io`, `file`, `path`, `process`, `time`, `text`, `unicode`, `int`, `list`, `array`, `map`, `set`, `format`, `crypto`, `diag`, `test`, `source` |
| `lib/math/` | Unified general-purpose math (pure Lite reference + soft-builtin overrides) | `scalar` (single home for scalar math, no split `core/math`), `random`, `vector`, `matrix`, `geom`, `collision`, `noise`, `tween`, `ik` |
| `lib/ds/` | Completely general-purpose abstract data structures | `arena`, `pool`, `sparse`, `heap`, `grid`, `deque`, `ring`, `bitset`, `lru`, `intern`, `spatial` |
| `lib/data/` | General-purpose formats & codecs | `json`, `csv`, `qoi` |
| `lib/extra/` | Optional multimedia, GUI, and game-domain modules | [surface](lite://module/extra/surface), [canvas](lite://module/extra/canvas), [board](lite://module/extra/board), [color](lite://module/extra/color), [audio](lite://module/extra/audio), [timer](lite://module/extra/timer), `ecs`, `ui`, `particles` |
| `apps/<name>/` | Multi-file serious applications & dogfood games | Separate from single-file Playground programs under `samples/` |

See [modules and packages](lite://doc/modules-and-packages) and [the library index](lite://repo/lib/README.md).

## 3. Portable `extra/surface`, beginner `extra/canvas`, audio, memory & targets

1. **Portable `extra/surface` + beginner `extra/canvas`:**
   - **Slice 1 (completed):** Host-driven `surface.run(win, onFrame)` across C11 and TS, pluggable `LiteSurfaceHost`, browser Playground integration, and mountable `createCanvasSurfaceHost`.
   - **Slice 2 (in progress):** Rebase [extra/canvas](lite://module/extra/canvas) as a simple, zero-jargon pixel-graphics entry layer (`setPixel`, `unsetPixel`, `clear`, `fillRect`, `draw`, `show`, `start`) implemented purely on top of [extra/surface](lite://module/extra/surface), retiring duplicated Play rendering glue.
   - **Slice 3:** Expand `extra/surface` with both registered `fn` event callbacks and immediate-mode queries (`isKeyDown`, `isKeyPressed`, `isKeyReleased`, mouse buttons/wheel, `textInput`), fast `Texture`/`blit`, `fillTriangle`, `setClipRect`, full printable ASCII bitmap font, and a multi-voice procedural PCM/WebAudio mixer.
2. **C11 memory & leak hygiene:** Audit long-running 60 FPS native loops with `--sanitize` (ASan/LSan) and live `vitals.memoryBytes`, then implement scope-exit collection (`List`/`Map`/`Set`) release and reclaimable string/frame-scratch storage; see [memory and performance](lite://doc/memory-and-performance).
3. **Platform targets & export tooling:** Decouple codegen backend (`c` / `ts`) from platform target (`macos`, `linux`, `windows`, `web`, `wasm`, `headless`) and provide clean native and standalone web export commands.
4. **Dogfood validation:** Build multi-file applications and games under `apps/<name>/` to stress-test compiler ergonomics, libraries, rendering, audio, and memory end-to-end.
