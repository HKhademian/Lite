# Lite Core & Extra Libraries (`lib/`)

`lib/` holds Lite's dual-target (TypeScript + native C11) modules. Every `pub`
declaration carries a `/** ... */` doc comment and is published automatically to
the `/modules/` reference on the site (`./bin/lite docs --modules-json`).

## Core Modules (`lib/core/` — 18 modules)

Core facilities cover [I/O](lite://module/core/io), [text](lite://module/core/text), [numbers](lite://module/core/int), [collections](lite://module/core/list), [optional values](lite://module/core/option), zero-copy [borrowed slices](lite://module/core/slice), and explicit [reference-counted handles](lite://module/core/rc). Check each generated module page for its environment and operations.

## Math Modules (`lib/math/` — 5 modules)

Use [scalar math](lite://module/math/scalar), [random](lite://module/math/random), [vectors](lite://module/math/vector), [matrices](lite://module/math/matrix), and [geometry](lite://module/math/geom).

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

## Data & Codecs (`lib/data/` — 2 modules)

Use [JSON](lite://module/data/json) or [CSV](lite://module/data/csv) for the corresponding data format.

## Play & Extra Modules (`lib/extra/` — 6 modules)

Start with [Canvas](lite://module/extra/canvas) for drawing or [Surface](lite://module/extra/surface) for portable interactive applications.

## Running Library Tests

All `lib/{core,math,ds,data,extra}/*` suites run under dual-target TS and native C11 (with ASan/UBSan):

```sh
./bin/lite test --unit libraries
./bin/lite test --unit math-geom
./bin/lite test --unit ds-data-generic
./bin/lite test --unit extra-canvas
./bin/lite test --unit extra-memory
./bin/lite test --unit extra-structures
./bin/lite test --unit extra-app
```
