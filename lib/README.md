# Lite Core & Extra Libraries (`lib/`)

`lib/` holds Lite's dual-target (TypeScript + native C11) modules. Every `pub`
declaration carries a `/** ... */` doc comment and is published automatically to
the `/modules/` reference on the site (`./bin/lite docs --modules-json`).

## Built-in Type Modules (`lib/type/` — 15 modules)

Built-in value, container, and numeric owners cover [integers](lite://module/type/int) (`Byte`, `Int`, bounds `MIN`/`MAX`), [floats](lite://module/type/float) (`Float`, `Double`, `MIN`/`MAX`/`EPSILON`), [numeric unions](lite://module/type/number), [booleans](lite://module/type/bool), [strings](lite://module/type/string), [fixed arrays](lite://module/type/array), [lists](lite://module/type/list), [maps](lite://module/type/map), [sets](lite://module/type/set), [optional values](lite://module/type/option), [errors](lite://module/type/error), zero-copy [borrowed slices](lite://module/type/slice), fixed-width [SIMD vectors](lite://module/type/simd), parallel-column [structure-of-arrays storage](lite://module/type/soa), and explicit [reference-counted handles](lite://module/type/rc). Defaults for `Option<T>`, `Slice<T>`, `Byte`, `Int`, `Float`, and `Double` are re-exported by [lib/$preload.lt](lite://repo/lib/$preload.lt).

## Core Modules (`lib/core/` — 12 modules)

Core facilities cover [I/O](lite://module/core/io), [core interfaces](lite://module/core/interface), [text builders](lite://module/core/text-builder), [paths](lite://module/core/path), [filesystem](lite://module/core/file), [processes](lite://module/core/process), [cryptography](lite://module/core/crypto), [time](lite://module/core/time), [timers](lite://module/core/timer), [sources](lite://module/core/source), [diagnostics](lite://module/core/diag), and [unit testing](lite://module/core/test). Check each generated module page for its environment and operations.

## Math Modules (`lib/math/` — 6 modules)

Use [scalar math](lite://module/math/scalar), [random](lite://module/math/random), [vectors](lite://module/math/vector), [matrices](lite://module/math/matrix), [3D transforms](lite://module/math/transform), and [geometry](lite://module/math/geom).

Use `Vec<T, N>` for any supported numeric component type, or `IVec<N>` and
`FVec<N>` for `Int` and `Float`. The dimension-specific aliases are
`Vec2<T>`, `IVec2`, `FVec2`, `Vec3<T>`, `IVec3`, `FVec3`, `Vec4<T>`,
`IVec4`, and `FVec4`. All support the same constructors, such as
`IVec4.from([1, 2, 3, 4])`.

Matrices follow the same naming scheme with independent row and column
counts. Use `Mat<T, R, C>`, `IMat<R, C>`, or `FMat<R, C>` for a general
shape, and `Mat2<T>` through `Mat4<T>`, `IMat2` through `IMat4`, or
`FMat2` through `FMat4` for square matrices.

## Data Structures (`lib/ds/` — 11 modules)

See [grids](lite://module/ds/grid), [pools](lite://module/ds/pool), and other data structures in the generated reference.

## Data & Codecs (`lib/data/` — 4 modules)

Use [JSON](lite://module/data/json), [CSV](lite://module/data/csv), [Markdown](lite://module/data/markdown), or [Markdown HTML](lite://module/data/markdown-html).

## Graphics Modules (`lib/gfx/` — 6 modules)

Start with [Canvas](lite://module/gfx/canvas) for 2D drawing or [Surface](lite://module/gfx/surface) for portable interactive applications, backed by [Color](lite://module/gfx/color), [Board](lite://module/gfx/board), [3D Camera](lite://module/gfx/camera), and [3D Scene](lite://module/gfx/scene).

## UI, Media & Tooling Modules (`lib/ui/`, `lib/media/`, `lib/lite/`)

Use [Immediate UI](lite://module/ui/im) for HUD panels, buttons, toggles, and sliders on `gfx/surface`, [Audio](lite://module/media/audio) for PCM/WebAudio tones, [Timer](lite://module/core/timer) for fixed-timestep loops and cooldowns, and `lite/*` barrels for reusable lexer, parser, checker, compiler, formatter, docgen, builder, and runner APIs.

## Running Library Tests

All `lib/{core,math,ds,data,gfx,media,ui,lite}/*` suites run under dual-target TS and native C11 (with ASan/UBSan):

```sh
./bin/lite test --unit libraries
./bin/lite test --unit math-geom
./bin/lite test --unit ds-data-generic
./bin/lite test --unit extra-canvas
./bin/lite test --unit extra-memory
./bin/lite test --unit extra-structures
./bin/lite test --unit extra-app
./bin/lite test --unit gfx-3d-ui
```
