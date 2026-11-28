# Slices, SIMD, SoA & Layout

Lite pairs memory safety with zero-copy native layouts: borrowed non-escaping `Slice<T>` views, disjoint `splitAt`, bit-packed sub-byte slices, explicit record layout attributes, portable `Simd<T, N>`, and cache-friendly `SoA<R>` containers.

## Borrowed `Slice<T>` Views & Disjoint `splitAt(mid)`

Slice a `List<T>`, `[T; N]` array, or another `Slice<T>` with half-open `a..b` or inclusive `a..=b` ranges (`String.bytes()` returns a read-only `Slice<UInt8>`). Mutating through a writable slice requires `mut` (`mut seq[a..b]`). `mut s.splitAt(mid)` produces two disjoint mutable slices and suspends parent access until both halves go out of scope:

```lite
io := import "core/io";

addBias := fn(s: mut Slice<Int>, delta: Int): Unit {
    loop mut s { .item += delta; }
};

mut vals: List<Int> = [10, 20, 30, 40];
do {
    mut view := mut vals[0..4];
    (left, right) := mut view.splitAt(2);
    addBias(mut left, 1);
    addBias(mut right, 100);
}
io.outputLine(vals);
```

Bit-packed fixed arrays `[Bool; N]`, `[Int1..4; N]`, and `[UInt1..4; N]` also support `Slice<T>`, non-byte-aligned `splitAt`, and `loop mut` element writes without copying.

## Layout Attributes (`#packed`, `#align`) & Niche Packing

Control C11 binary layout directly with `#packed`, `#align(N)`, and `#no_niche` right after `record` or `enum` (after any `<T>` or `: BackingType`). By default, `Option<T>` (`core/option`) automatically uses sentinel niches (including `Bool`, small enums, non-null heap handles, and finite-checked `Float` NaN niches) so `Option<Bool>` or `Option<Rc<T>>` adds zero tag bytes!

```lite
io := import "core/io";
opt := import "core/option";

PacketHeader := record #packed {
    kind: UInt4;
    flags: UInt4;
    length: UInt16;
};

h := PacketHeader { kind = 3, flags = 1, length = 64 };
maybeH: opt.Option<PacketHeader> = .Some(h);
io.outputLine(h.kind, h.length, maybeH.isSome());
```

## Portable `Simd<T, N>` & Data-Oriented `SoA<R>`

Import [core/simd](lite://module/core/simd) for explicit fixed-width vector math (`Simd<Float32, 4>` / `Float32x4`, `Int32x4`, `fma`, lane reductions) and [core/soa](lite://module/core/soa) for `SoA<Record>`, storing each field in a contiguous column slice for zero-stride SIMD kernels:

```lite
io := import "core/io";
simd := import "core/simd";

xs: [Float32; 4] = [1.0, 2.0, 3.0, 4.0];
ys: [Float32; 4] = [10.0, 20.0, 30.0, 40.0];
vx := simd.Float32x4.load(xs[0..4], 0);
vy := simd.Float32x4.load(ys[0..4], 0);
sumVec := vx.add(vy);
io.outputLine(sumVec.reduceAdd());
```

For manual lifetime and shared-ownership building blocks alongside value types, combine `Rc<T>` ([core/rc](lite://module/core/rc)), `VmArena` ([ds/arena](lite://module/ds/arena)), and `SlotPool` ([ds/pool](lite://module/ds/pool)).

See [Borrowed Slices](lite://doc/slices), [C11 Memory & Codegen Plan](lite://doc/c11-memory-and-codegen-plan), [core/simd](lite://module/core/simd), and [core/soa](lite://module/core/soa).

Try the interactive [Slices & Split-Borrow example](lite://play/slice-split-and-pack), [Option, SIMD & SoA example](lite://play/option-simd-soa), and [verified Slices/SIMD/SoA showcase](lite://play/example/showcase-slices-simd-and-soa).

## Next Chapter

Continue to [Comptime, Defaults & Variance](lite://handbook/comptime-defaults-and-variance).
