# Lite Core & Extra Libraries (`lib/`)

`lib/` holds Lite's dual-target (TypeScript + native C11) modules. Every `pub`
declaration carries a `/** ... */` doc comment and is published automatically to
the `/modules/` reference on the site (`./bin/lite docs --modules-json`).

## Core Modules (`lib/core/` — 17 modules)

| Module | Environment | Capabilities |
| --- | --- | --- |
| `core/io` | Browser + CLI | Host-backed console/stream I/O (`output`, `outputLine`, `errorLine`, `inputLine`, `inputInt`, `inputFloat`, `inputAll`, `inputArgs`, `exit`) |
| `core/int` | Browser + CLI | `Int.*` operations (`toText`, `toHex`), Int64 bounds, checked arithmetic, decimal/hex formatting and parsing |
| `core/text` | Browser + CLI | `String.*` hard/soft/pure operations (`length`, `isEmpty`, `at`, `slice`, `trim`, `startsWithAt`, `indexOf`, `toInt`, ASCII predicates, split/join) |
| `core/unicode` | Browser + CLI | UTF-8 / UTF-16 scalar encoding, decoding, and validation helpers |
| `core/format` | Browser + CLI | Decimal/hex formatting, padding, and Int-join helpers |
| `core/list` | Browser + CLI | `List.*` operations & index hooks (`pushBack`, `popBack`, `pushFront`, `popFront`, `length`, `isEmpty`, `map`, `filter`, `join`, `$getIndex`/`$setIndex`) |
| `core/array` | Browser + CLI | Fixed-length `Array.*` operations & index hooks (`length`, `isEmpty`, `$getIndex`/`$setIndex`) |
| `core/map` | Browser + CLI | `Map.*` operations & index hooks (`get`, `getOr`, `has`, `set`, `remove`, `clear`, `keys`, `values`, `size`, `isEmpty`, `$getIndex`/`$setIndex`) |
| `core/set` | Browser + CLI | `Set.*` operations (`has`, `add`, `remove`, `clear`, `values`, `size`, `isEmpty`) |
| `core/crypto` | Browser + CLI | Host CSPRNG plus pure-Lite SHA-256, SHA-512, HMAC, and hex digests |
| `core/source` | Browser + CLI | Source offset clamping, line/column lookup, and line start/end/count helpers |
| `core/diag` | Browser + CLI | Prefix-aware `fail`/`expect` diagnostics and exit status |
| `core/test` | Browser + CLI | Assertions (`check`, `checkInt`, `checkText`, `checkFloat`) for Lite unit test suites |
| `core/file` | CLI / Host OS | Synchronous filesystem reads, writes, directory traversal, temp dirs, and streams |
| `core/path` | CLI / Host OS | POSIX/host path joining, normalization, basename/dirname, and recursive file collection |
| `core/process` | CLI / Host OS | Subprocess spawning, byte/text capture, environment variables, and executable path |
| `core/time` | CLI / Host OS | Monotonic/wall-clock timestamps and pure-Lite ISO-8601 calendar helpers |

## Math Modules (`lib/math/` — 5 modules)

| Module | Environment | Capabilities |
| --- | --- | --- |
| `math/scalar` | Browser + CLI | `IntScalar`/`FloatScalar`/`Numeric` constraints, `PI`, `TAU`, `HALF_PI`, `E`, `abs*`/`min*`/`max*`/`clamp*`, `floor`/`ceil`/`round`/`trunc`/`fract`, `sin`/`cos`/`tan`/`atan`/`atan2`, `sqrt`, `gcd`, `lcm` |
| `math/random` | Browser + CLI | Deterministic, seedable Lehmer PRNG (`Rng`, `create`, `nextInt`, `rangeInt`, `nextBool`, `nextFloat`) |
| `math/vector` | Browser + CLI | Generic `Vec<T: Type<Numeric>, N: Int>` (`x`/`y`/`z`/`w`/`r`/`g`/`b`/`a`, `dot`, `lerp`, `normalize`) and `Vec2`, `Vec3`, `Vec4` (`cross`, `rotate`, `reflect`) |
| `math/matrix` | Browser + CLI | 2×2, 3×3, and 4×4 matrix math (`Mat2`, `Mat3`, `Mat4`, `translate`, `scale`, `rotate`, `mul`, `transpose`, `det`, `perspective`, `lookAt`) |
| `math/geom` | Browser + CLI | Generic `Box<T, N>`, `Ray<T, N>`, `Segment<T, N>`, `RayHit`, `Rect`, `Circle`, `Sphere`, and intersection helpers (`rayBoxHit`, `raySphereHit`) |

## Data Structures (`lib/ds/` — 11 modules)

| Module | Environment | Capabilities |
| --- | --- | --- |
| `ds/grid` | Browser + CLI | Generic `Grid<T>` (`GridCell<T>`, `get`, `set`, `fillRect`) plus handle-backed `IntGrid` and `FloatGrid` |
| `ds/arena` | Browser + CLI | O(1) scratch/frame bump allocators (`Arena`, `IntArena`, `FloatArena`, `allocAligned`, `mark`/`rewind`, `reset`) |
| `ds/pool` | Browser + CLI | Generational handle slot pools (`SlotPool`, `IntPool`, `TextPool`, safe stale-handle detection) |
| `ds/intern` | Browser + CLI | String interner and symbol table (`SymbolId`, `intern`, `lookup`, `resolve`, `stats`) |
| `ds/lru` | Browser + CLI | Bounded-capacity O(1) LRU caches (`LruText`, `LruInt`, `IntLru`, eviction reporting, `LruStats`) |
| `ds/ring` | Browser + CLI | Generic `Ring<T>` (`RingItem<T>`, `push`, `tryPush`, `pop`) plus `IntRing` and `FloatRing` circular buffers |
| `ds/deque` | Browser + CLI | Generic `Deque<T>` (`DequeItem<T>`, `pushFront`, `pushBack`, `popFront`, `popBack`) plus `IntDeque` and `TextDeque` |
| `ds/heap` | Browser + CLI | Binary `MinHeap`, `MaxHeap`, and keyed `PriorityQueue` |
| `ds/bitset` | Browser + CLI | Compact bit-arrays packed 30 bits per word (`set`, `clear`, `toggle`, `test`, `countOnes`, `firstSet`, `orInto`/`andInto`/`xorInto`) |
| `ds/sparse` | Browser + CLI | O(1) `SparseSet` with dense iteration (`insert`, `remove`, `has`, `denseAt`, `count`) |
| `ds/spatial` | Browser + CLI | Uniform 2D spatial hash grid (`SpatialGrid2D`, `insertRect`, `insertPoint`, `queryRect`, `queryCircle`, `queryPoint`) |

## Data & Codecs (`lib/data/` — 2 modules)

| Module | Environment | Capabilities |
| --- | --- | --- |
| `data/json` | Browser + CLI | Pure RFC-8259 JSON scanner, typed reader, and O(N) string serializer (`validate`, `kindAt`, `readField*`, `quoteString`, `encode*`) |
| `data/csv` | Browser + CLI | RFC-4180 CSV parser and flat `CsvTable` serializer (`parse`, `parseRow`, `cell`, `row`, `encodeField`, `encodeRow`, `encodeTable`) |

## Play & Extra Modules (`lib/extra/` — 6 modules)

| Module | Environment | Capabilities |
| --- | --- | --- |
| `extra/canvas` | Lite Play | Browser & desktop Play 2D pixel/rect canvas (`create`, `play`, `clear`, `fillRect`, `setPixel`, `rgb`/`rgba`) |
| `extra/surface` | Lite Play / Desktop | Target-independent 2D surface (`open`, `run`, `fillTriangle`, `setClipRect`, `Texture`/`blit`, `isKeyDown`/`Pressed`/`Released`, `wheelDelta`, `scratchMark`/`Rewind`, `vitals`) |
| `extra/board` | Lite Play | 2D shape, sprite, and pixel-grid helpers built on `extra/canvas` |
| `extra/audio` | Lite Play | WebAudio & native PCM tone queue (`tone`, `playNote`, `drain`) |
| `extra/color` | Browser + CLI | Encoding-independent normalized RGBA/HSL color values (`fromRgb`, `fromRgba8`, `fromHsl`, `mix`, `withAlphaFloat`) |
| `extra/timer` | Browser + CLI | Fixed-timestep `StepClock`, `Cooldown`, and monotonic `Stopwatch` |

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
