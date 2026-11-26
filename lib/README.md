# Lite Core & Extra Libraries (`lib/`)

`lib/` holds Lite's dual-target (TypeScript + native C11) modules. Every `pub`
declaration carries a `/** ... */` doc comment and is published automatically to
the `/modules/` reference on the site (`./bin/lite docs --modules-json`).

## Core Modules (`lib/core/` — 15 modules)

Core facilities cover [I/O](lite://module/core/io), [text](lite://module/core/text), [numbers](lite://module/core/int), and [collections](lite://module/core/list). Check each generated module page for its environment and operations.

## Math Modules (`lib/math/` — 5 modules)

Use [scalar math](lite://module/math/scalar), [random](lite://module/math/random), [vectors](lite://module/math/vector), [matrices](lite://module/math/matrix), and [geometry](lite://module/math/geom).

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
