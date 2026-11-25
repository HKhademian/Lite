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
| `core/array` | Browser + CLI | Fixed-length `Array.*` operations & index hooks (`length`, `isEmpty`, `filled`, `fill`, `$getIndex`/`$setIndex`) |
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
| `math/vector` | Browser + CLI | Unified generic `Vec<T: Type<Numeric>, N: Int>` (`Vec2`/`Vec3`/`Vec4`, `FVec2..4`, `IVec2..3`, `vec2..4`, `x`/`y`/`z`/`w`/`r`/`g`/`b`/`a`, `dot`, `lerp`, `normalize`, `cross`, `cross2`, `rotate`, `reflect`) |
| `math/matrix` | Browser + CLI | Unified generic `Mat<T: Type<Numeric>, R: Int, C: Int>` backed by `[Vec<T, C>; R]` (`Mat2..4`, `FMat2..4`, `identity<N>`, `mul`, `mulVec`, `transpose`, `det`, `translate2/3`, `scale2/3`, `rotate2/X/Y/Z`, `perspective`, `transformPoint2/3`) |
| `math/geom` | Browser + CLI | Generic `Box<T, N>`, `Ray<T, N>`, `Segment<T, N>`, `Ball<T, N>` (`Circle`, `Sphere`), `Rect`, `RayHit`, and intersection helpers (`rayBoxHit`, `raySphereHit`) |

## Data Structures (`lib/ds/` — 11 modules)

| Module | Environment | Capabilities |
| --- | --- | --- |
| `ds/grid` | Browser + CLI | Generic `Grid<T>` (`GridCell<T>`, `get`, `set`, `fillRect`, `copyFrom`, `countValue`) plus `IntGrid` and `FloatGrid` aliases |
| `ds/arena` | Browser + CLI | Nominal O(1) bump `Arena` (`allocAligned`, `mark`/`rewind`, `reset`, `ArenaStats`) and generic `TypedArena<T>` (`IntArena`, `FloatArena`) |
| `ds/pool` | Browser + CLI | Generational `Handle`, `SlotPool`, and generic `Pool<T>` (`IntPool`, `TextPool`, `PoolItem<T>`, safe stale-handle detection) |
| `ds/intern` | Browser + CLI | Nominal `Interner` and `SymbolId` (`intern`, `lookupId`, `resolve`, `stats`) |
| `ds/lru` | Browser + CLI | Bounded-capacity generic O(1) `Lru<K, V>` (`LruText`, `LruInt`, `IntLru`, `LruEviction<K, V>`, `LruStats`) |
| `ds/ring` | Browser + CLI | Generic `Ring<T>` (`RingItem<T>`, `push`, `tryPush`, `pop`, `sum`, `avg`, `minMax`) plus `IntRing` and `FloatRing` aliases |
| `ds/deque` | Browser + CLI | Generic `Deque<T>` (`DequeItem<T>`, `pushFront`, `pushBack`, `popFront`, `popBack`) plus `IntDeque` and `TextDeque` aliases |
| `ds/heap` | Browser + CLI | Nominal `MinHeap`, `MaxHeap`, and generic `PriorityQueue<T>` (`IntPriorityQueue`, `HeapItem<T>`, `PQItem<T>`) |
| `ds/bitset` | Browser + CLI | Nominal compact `Bitset` packed 30 bits per word (`set`, `clear`, `toggle`, `test`, `countOnes`, `firstSet`, `orInto`/`andInto`/`xorInto`) |
| `ds/sparse` | Browser + CLI | Nominal O(1) `SparseSet` with dense iteration (`insert`, `remove`, `has`, `denseAt`, `count`) |
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
| `extra/timer` | Browser + CLI | Nominal `StepClock`, `Cooldown`, and monotonic `Stopwatch` records |

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
