# Data Structures & Memory Pools

Alongside built-in `[T; N]`, `List<T>`, `Map<K, V>`, and `Set<T>`, Lite ships general-purpose systems data structure and memory management modules under `ds/*`. Every module runs with identical semantics on both TypeScript and native C11 (verified under ASan/UBSan).

## Bump Arenas & Generational Slot Pools (`ds/arena`, `ds/pool`)

- [ds/arena](lite://module/ds/arena) provides O(1) scratch/frame bump allocators: byte-addressed `Arena` (`allocAligned`, `mark`/`rewind`, bulk `reset`, `ArenaStats`) and generic `TypedArena<T>` (`IntArena`, `FloatArena`).
- [ds/pool](lite://module/ds/pool) provides fixed-capacity generational handle pools (`SlotPool` and generic `Pool<T>`, with `IntPool` and `TextPool` aliases) where every `Handle` pairs `(index, generation)` so stale handles after `release` are safely detected (`isAlive`, `get`) without use-after-free bugs:

```lite
io := import "core/io";
pool := import "ds/pool";

mut p := pool.Pool<Int>.create(8);
h1 := mut p.acquire(100);
h2 := mut p.acquire(200);
_rel := mut p.release(h1);
io.outputLine(p.isAlive(h1), p.get(h2).unwrapOr(-1), p.count());
```

## String Interning & O(1) LRU Caches (`ds/intern`, `ds/lru`)

- [ds/intern](lite://module/ds/intern) deduplicates repeated strings into `distinct` `SymbolId` values inside a nominal `Interner` (`intern`, `lookupId`, `resolve`, `stats`)—used inside Lite's own site validator for fast symbol comparisons.
- [ds/lru](lite://module/ds/lru) implements bounded-capacity generic O(1) least-recently-used caches (`Lru<K, V>`, with `LruText`, `LruInt`, and `IntLru` aliases) featuring strict recency tracking, eviction reporting (`LruEviction<K, V>`), and hit/miss counters (`LruStats`):

```lite
io := import "core/io";
intern := import "ds/intern";
lru := import "ds/lru";

mut tbl := intern.Interner.create();
idA := mut tbl.intern("alpha");
idB := mut tbl.intern("alpha");

mut cache := lru.LruText.create(2);
_e1 := mut cache.put("a", "one");
_e2 := mut cache.put("b", "two");
ev := mut cache.put("c", "three");
io.outputLine(idA == idB, ev.evicted, ev.key);
```

## Queues, Ring Buffers & Priority Heaps (`ds/ring`, `ds/deque`, `ds/heap`)

| Module | Types | Typical Use |
| --- | --- | --- |
| [ds/ring](lite://module/ds/ring) | `Ring<T>`, `IntRing`, `FloatRing` | Fixed-capacity circular buffers for rolling telemetry, FPS windows, and audio samples (`push`, `tryPush`, `pop`, `sum`, `avg`) |
| [ds/deque](lite://module/ds/deque) | `Deque<T>`, `IntDeque`, `TextDeque` | O(1) double-ended queues and FIFO worklists (`pushFront`, `pushBack`, `popFront`, `popBack`) |
| [ds/heap](lite://module/ds/heap) | `MinHeap`, `MaxHeap`, `PriorityQueue<T>` | Binary heaps and generic keyed priority queues for Dijkstra/A* pathfinding, event timers, and schedulers |
| [ds/grid](lite://module/ds/grid) | `Grid<T>`, `IntGrid`, `FloatGrid` | Flat-backed 2D tilemaps and boards with generic value cells (`GridCell<T>`, `get`, `set`, `fillRect`, `copyFrom`, `countValue`) |
| [ds/spatial](lite://module/ds/spatial) | `SpatialGrid2D` | Uniform 2D spatial hash grid for fast broad-phase `queryRect`, `queryCircle`, and `queryPoint` lookups |

## Structured Data Codecs (`data/json`, `data/csv`)

- [data/json](lite://module/data/json) provides a pure RFC-8259 JSON validator, offset scanner, typed reader, and O(N) serializer (`validate`, `kindAt`, `readFieldString`/`Int`/`Bool`, `quoteString`, `encodeObject`).
- [data/csv](lite://module/data/csv) provides a pure RFC-4180 CSV parser and flat `CsvTable` encoder (`parse`, `parseRow`, `cell`, `row`, `encodeField`, `encodeRow`, `encodeTable`).

```lite
io := import "core/io";
heap := import "ds/heap";

mut h := heap.MinHeap.create(8);
_a := mut h.push(30);
_b := mut h.push(10);
_c := mut h.push(20);
p1 := mut h.pop();
p2 := mut h.pop();
io.outputLine(p1.unwrapOr(-1), p2.unwrapOr(-1), h.count());
```

## Dense Bitsets & Sparse Sets (`ds/bitset`, `ds/sparse`)

- [ds/bitset](lite://module/ds/bitset) packs flags 30 bits per word in a nominal `Bitset` with O(1) `set`/`clear`/`toggle`/`test`, popcount (`countOnes`), first-set/clear scans (`firstSet`, `firstClear`), and bitwise bulk ops (`orInto`, `andInto`, `xorInto`).
- [ds/sparse](lite://module/ds/sparse) provides a nominal `SparseSet` with O(1) membership, insertion, and swap-remove over integer IDs `0..capacity-1` alongside dense cache-friendly iteration (`denseAt`, `count`)—ideal for ECS component sets and graph visited sets:

```lite
io := import "core/io";
bitset := import "ds/bitset";
sparse := import "ds/sparse";

mut flags := bitset.Bitset.create(64);
_s1 := mut flags.set(3);
_s2 := mut flags.set(42);

mut entities := sparse.SparseSet.create(32);
_i1 := mut entities.insert(7);
_i2 := mut entities.insert(19);
io.outputLine(flags.countOnes(), flags.firstSet(), entities.has(19), entities.count());
```

## Next Chapter

Continue to [Native C11, Optimization & Tooling](lite://handbook/native-c11-and-optimization).
