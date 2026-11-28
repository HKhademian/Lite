# Slices, `splitAt`, `@packed` Option, SIMD & SoA

Use zero-copy `Slice<T>` views, disjoint `splitAt(mid)` borrows, `@packed` binary layouts, niche-packed `Option<T>`, portable `Simd<T, N>` vector math, and column-oriented `SoA<R>` containers in a single dual-target program.

## Walkthrough

1. `FrameHeader` uses `@packed` with exact sub-byte `UInt4` and `UInt16` fields; `opt.Option<Int>` expresses optional values without null pointers (`if .Some(v) := optLen`).
2. `mut view := mut vals[0..4];` borrows `vals` mutably; `(left, right) := mut view.splitAt(2);` splits it into two disjoint mutable slices so both halves mutate safely in place.
3. `SoA<Particle>` stores `x`, `y`, `vx`, `vy` as contiguous column slices (`mut swarm.x`), enabling direct `Float32x4.load` / `.fma` / `.store` SIMD vector kernels.
4. `Rc.create(77)` and `.share()` demonstrate reference-counted shared handles alongside stack/inline data.

## Try Modifying This

1. Increase `swarm` from 4 particles to 8 and loop `i += 4` to process two SIMD chunks.
2. Add a bit-packed `[Bool; 4]` active mask slice and flip elements with `loop mut`.

See [Handbook: Slices, SIMD, SoA & Layout](lite://handbook/slices-simd-and-layout), [Borrowed Slices](lite://doc/slices), and [C11 Memory & Codegen Plan](lite://doc/c11-memory-and-codegen-plan).
