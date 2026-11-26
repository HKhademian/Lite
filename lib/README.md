# Lite Core & Extra Libraries (`lib/`)

`lib/` holds Lite's dual-target (TypeScript + native C11) modules. Every `pub`
declaration carries a `/** ... */` doc comment and is published automatically to
the `/modules/` reference on the site (`./bin/lite docs --modules-json`).

## Core Modules (`lib/core/` — 15 modules)

| Module | Environment | Capabilities |
| --- | --- | --- |
| `core/io` | Browser + CLI | Host-backed console I/O (`output`, `outputLine`, `errorLine`, `input*`, `exit`) plus nominal `Reader`/`Writer` stream types (`Reader.stdin`/`fromBytes`/`fromText`, `Writer.stdout`/`stderr`/`buffer`) |
| `core/int` | Browser + CLI | `Int.*` operations (`toText`, `checkedAdd`/`Sub`/`Mul`/`Div`/`Rem`/`Neg`, `floorDiv`/`floorMod`) and Int64 bounds (`intMin`, `intMax`) |
| [`core/text`](lite://module/core/text) | Browser + CLI | String operations, Unicode scalars, and UTF-8/UTF-16 codecs |
| `core/list` | Browser + CLI | Generic `List.*` operations & index hooks (`pushBack`, `popBack`, `pushFront`, `popFront`, `length`, `isEmpty`, `map`, `filter`, `fold`, `any`, `all`, `find`, `findIndex`, `indexOf`, `contains`, `dedup`, `sort`, `sortBy`, `sortTexts`, `join`, `$getIndex`/`$setIndex`) |
| `core/array` | Browser + CLI | Fixed-length `Array<T, N>` (`[T; N]` sugar) static & collection operations & index hooks (`filled`, `zeroed`, `fill`, `length`, `isEmpty`, `toList`, `join`, `map`, `filter`, `fold`, `any`, `all`, `find`, `findIndex`, `indexOf`, `contains`, `dedup`, `sort`, `sortBy`, `sortTexts`, `$getIndex`/`$setIndex`) |
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
| `math/scalar` | Browser + CLI | `IntScalar`/`FloatScalar`/`Numeric` constraints, `PI`, `TAU`, `HALF_PI`, `E`, generic `abs`/`min`/`max`/`clamp`/`sign`, `floor`/`ceil`/`round`/`trunc`/`fract`, `sin`/`cos`/`tan`/`atan`/`atan2`, `sqrt`, `gcd`, `lcm` |
| `math/random` | Browser + CLI | Deterministic, seedable Lehmer PRNG (`Rng.create`, `mut r.reseed`/`nextInt`/`rangeInt`/`nextBool`, and module-level `seed`/`nextInt`/`rangeInt`/`nextBool`) |
| `math/vector` | Browser + CLI | Unified generic `Vec<T: Type<Numeric>, N: Int>` (`Vec2..4`, `FVec2..4`, `IVec2..3`, static `Vec.from`/`splat`/`zeroed` inherited by aliases, `vec2..4`, `dot`, `lerp`, `normalize`, `cross`, `cross2`, `rotate`, `reflect`) |
| `math/matrix` | Browser + CLI | Unified generic `Mat<T: Type<Numeric>, R: Int, C: Int>` backed by `[Vec<T, C>; R]` (`Mat2..4`, `FMat2..4`, static `Mat.from`/`zeroed`/`identity` + 2D/3D transform constructors, `mul`, `mulVec`, `transpose`, `det`, `transformPoint2/3`) |
| `math/geom` | Browser + CLI | Generic `Box<T, N>`, `Ray<T, N>`, `Segment<T, N>`, `Ball<T, N>` (`Circle`, `Sphere`), `Rect`, `RayHit`, static constructors (`Box.fromMinMax`, `Ray.create`, `Segment.create`, `Rect.create`, `Ball.create`), and `hitBox`/`hitBall` |

## Data Structures (`lib/ds/` — 11 modules)

| Module | Environment | Capabilities |
| --- | --- | --- |
| `ds/grid` | Browser + CLI | Generic `Grid<T>` (`Grid.create`, `GridCell<T>`, `get`, `set`, `fillRect`, `copyFrom`, `countValue`) plus `IntGrid` and `FloatGrid` aliases |
| `ds/arena` | Browser + CLI | Nominal O(1) bump `Arena` (`Arena.create`, `allocAligned`, `mark`/`rewind`, `reset`, `ArenaStats`) and generic `TypedArena<T>` (`TypedArena.create`, `IntArena`, `FloatArena`) |
| `ds/pool` | Browser + CLI | Generational `Handle`, `SlotPool` (`SlotPool.create`), and generic `Pool<T>` (`Pool.create`, `IntPool`, `TextPool`, `PoolItem<T>`, safe stale-handle detection) |
| `ds/intern` | Browser + CLI | Nominal `Interner` (`Interner.create`) and `SymbolId` (`intern`, `lookupId`, `resolve`, `stats`) |
| `ds/lru` | Browser + CLI | Bounded-capacity generic O(1) `Lru<K, V>` (`Lru.create`, `LruText`, `LruInt`, `IntLru`, `LruEviction<K, V>`, `LruStats`) |
| `ds/ring` | Browser + CLI | Generic `Ring<T>` (`Ring.create`, `RingItem<T>`, `push`, `tryPush`, `pop`, `sum`, `avg`, `minMax`) plus `IntRing` and `FloatRing` aliases |
| `ds/deque` | Browser + CLI | Generic `Deque<T>` (`Deque.create`, `DequeItem<T>`, `pushFront`, `pushBack`, `popFront`, `popBack`) plus `IntDeque` and `TextDeque` aliases |
| `ds/heap` | Browser + CLI | Nominal `MinHeap` (`MinHeap.create`), `MaxHeap` (`MaxHeap.create`), and generic `PriorityQueue<T>` (`PriorityQueue.create`, `IntPriorityQueue`, `HeapItem<T>`, `PQItem<T>`) |
| `ds/bitset` | Browser + CLI | Nominal compact `Bitset` (`Bitset.create`) packed 30 bits per word (`set`, `clear`, `toggle`, `test`, `countOnes`, `firstSet`, `orInto`/`andInto`/`xorInto`) |
| `ds/sparse` | Browser + CLI | Nominal O(1) `SparseSet` (`SparseSet.create`) with dense iteration (`insert`, `remove`, `has`, `denseAt`, `count`) |
| `ds/spatial` | Browser + CLI | Uniform 2D spatial hash grid (`SpatialGrid2D`, `SpatialGrid2D.create`, `insertRect`, `insertPoint`, `queryRect`, `queryCircle`, `queryPoint`) |

## Data & Codecs (`lib/data/` — 2 modules)

| Module | Environment | Capabilities |
| --- | --- | --- |
| `data/json` | Browser + CLI | Pure RFC-8259 JSON scanner, typed reader, and O(N) string serializer (`validate`, `valueSpan`, `kindAt`, `readField*`, `quoteString`, `encode*`) |
| `data/csv` | Browser + CLI | RFC-4180 CSV parser and flat `CsvTable` serializer (`CsvTable.parse`, `CsvTable.parseRow`, `cell`, `row`, `CsvTable.encodeField`, `CsvTable.encodeRow`, `encode`) |

## Play & Extra Modules (`lib/extra/` — 6 modules)

| Module | Environment | Capabilities |
| --- | --- | --- |
| `extra/canvas` | Lite Play | Browser & desktop Play 2D pixel/rect canvas (`create`, `play`, `clear`, `fillRect`, `setPixel`, `rgb`/`rgba`) |
| `extra/surface` | Lite Play / Desktop | Nominal `Surface` (`Surface.open`, `run`, `fillTriangle`, `setClipRect`, `vitals`) and `Texture` (`Texture.create`, `blit`, `setPixel`, `destroy`, `width`, `height`) with `scratchMark`/`Rewind` |
| `extra/board` | Lite Play | 2D shape, sprite, and pixel-grid helpers built on `extra/canvas` |
| `extra/audio` | Lite Play | WebAudio & native PCM tone queue (`tone`, `playNote`, `drain`) |
| `extra/color` | Browser + CLI | Nominal `Color` values with static constructors (`Color.fromRgb`, `Color.fromRgba8`, `Color.fromHsl`) and operations (`mix`, `withAlphaFloat`, `red8`..`alpha8`) |
| `extra/timer` | Browser + CLI | Nominal `StepClock` (`StepClock.create`), `Cooldown` (`Cooldown.create`), and monotonic `Stopwatch` (`Stopwatch.start`) records |

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
