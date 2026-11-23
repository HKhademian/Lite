# Data Structures & Memory Pools

Alongside built-in `[T; N]`, `List<T>`, `Map<K, V>`, and `Set<T>`, Lite ships nine pure-Lite systems data structure and memory management modules under `extra/*`. Every module runs with identical semantics on both TypeScript and native C11 (verified under ASan/UBSan).

## Bump Arenas & Generational Slot Pools (`extra/arena`, `extra/pool`)

- [extra/arena](lite://module/extra/arena) provides O(1) scratch/frame bump allocators (`Arena`, `IntArena`, `FloatArena`) with aligned byte allocation (`allocAligned`), checkpoint/rewind (`mark`, `rewind`), bulk `reset`, and peak usage telemetry (`ArenaStats`).
- [extra/pool](lite://module/extra/pool) provides fixed-capacity generational handle pools (`SlotPool`, `IntPool`, `TextPool`) where every handle pairs `(index, generation)` so stale handles after `release` are safely detected (`isIntAlive`, `getInt`) without use-after-free bugs:

```lite
io := import "core/io";
pool := import "extra/pool";

p := pool.createInts(8);
h1 := pool.acquireInt(p, 100);
h2 := pool.acquireInt(p, 200);
pool.releaseInt(p, h1);
io.outputLine(pool.isIntAlive(p, h1), pool.getInt(p, h2).value, pool.intCount(p));
pool.destroyInts(p);
```

## String Interning & O(1) LRU Caches (`extra/intern`, `extra/lru`)

- [extra/intern](lite://module/extra/intern) deduplicates repeated strings into compact integer `SymbolId`s (`intern`, `lookup`, `resolve`, `stats`)—used inside Lite's own site validator for fast symbol comparisons.
- [extra/lru](lite://module/extra/lru) implements bounded-capacity O(1) least-recently-used caches (`LruText`, `LruInt`, `IntLru`) with strict recency tracking, eviction reporting, and hit/miss counters (`LruStats`):

```lite
io := import "core/io";
intern := import "extra/intern";
lru := import "extra/lru";

tbl := intern.create();
idA := intern.intern(tbl, "alpha");
idB := intern.intern(tbl, "alpha");

cache := lru.createText(2);
lru.putText(cache, "a", "one");
lru.putText(cache, "b", "two");
ev := lru.putText(cache, "c", "three");
io.outputLine(idA == idB, ev.evicted, ev.evictedKey);
lru.destroyText(cache);
intern.destroy(tbl);
```

## Queues, Ring Buffers & Priority Heaps (`extra/ring`, `extra/deque`, `extra/heap`)

| Module | Types | Typical Use |
| --- | --- | --- |
| [extra/ring](lite://module/extra/ring) | `IntRing`, `FloatRing` | Fixed-capacity circular buffers for rolling telemetry, FPS windows, and audio samples (`pushInt`, `tryPushInt`, `sumInts`) |
| [extra/deque](lite://module/extra/deque) | `IntDeque`, `TextDeque` | O(1) double-ended queues and FIFO worklists (`pushFrontInt`, `pushBackInt`, `popFrontInt`, `popBackInt`) |
| [extra/heap](lite://module/extra/heap) | `MinHeap`, `MaxHeap`, `PriorityQueue` | Binary heaps and keyed priority queues for Dijkstra/A* pathfinding, event timers, and schedulers |

```lite
io := import "core/io";
heap := import "extra/heap";

h := heap.createMin(8);
heap.pushMin(h, 30);
heap.pushMin(h, 10);
heap.pushMin(h, 20);
io.outputLine(heap.popMin(h).value, heap.popMin(h).value, heap.minCount(h));
heap.destroyMin(h);
```

## Dense Bitsets & Sparse Sets (`extra/bitset`, `extra/sparse`)

- [extra/bitset](lite://module/extra/bitset) packs flags 30 bits per word with O(1) `set`/`clear`/`toggle`/`test`, popcount (`countOnes`), first-set/clear scans (`firstSet`, `firstClear`), and bitwise bulk ops (`orInto`, `andInto`, `xorInto`).
- [extra/sparse](lite://module/extra/sparse) provides O(1) membership, insertion, and swap-remove over integer IDs `0..capacity-1` alongside dense cache-friendly iteration (`denseAt`, `count`)—ideal for ECS component sets and graph visited sets:

```lite
io := import "core/io";
bs := import "extra/bitset";
sp := import "extra/sparse";

flags := bs.create(64);
bs.set(flags, 3);
bs.set(flags, 42);

entities := sp.create(32);
sp.insert(entities, 7);
sp.insert(entities, 19);
io.outputLine(bs.countOnes(flags), bs.firstSet(flags), sp.has(entities, 19), sp.count(entities));
bs.destroy(flags);
sp.destroy(entities);
```

## Next Chapter

Continue to [Native C11, Optimization & Tooling](lite://handbook/native-c11-and-optimization).
