# Arrays, growable lists, and slices across reference languages

Status: **reference review, 2026-10-19**. Sources are official language or standard-library documentation. These comparisons inform proposals; they do not select LiteScript types, syntax, ownership, or a runtime.

## Odin: separate fixed arrays, slices, and dynamic arrays

Odin uses [N]T for fixed arrays, []T for slices, and [dynamic]T for resizable arrays. Fixed arrays hold consecutive values. Slices describe existing elements through an address/length representation; dynamic arrays add growth and capacity. Its allocation/deallocation policy is a separate part of the language. This gives LiteScript a useful role split without requiring the same allocator API, mutable defaults, or nil states. Source: [Odin arrays and slices](https://odin-lang.org/docs/overview/#fixed-arrays).

## Rust: owning arrays and vectors, borrowed slices

Rust's [T; N] includes a compile-time length in the array type. `Vec<T>` owns a contiguous growable allocation, while &[T] and &mut [T] provide shared or writable views. Vector capacity may exceed its initialized length, with spare storage not exposed as ordinary initialized elements. This is particularly relevant to LiteScript's large-buffer use case. Rust's ownership and borrow rules also address view lifetime and reallocation. The representation distinction is useful without importing Rust's punctuation or its entire borrow system. Sources: [arrays](https://doc.rust-lang.org/std/primitive.array.html), [vectors](https://doc.rust-lang.org/std/vec/struct.Vec.html), and [slices](https://doc.rust-lang.org/std/primitive.slice.html).

## Zig: compile-time arrays and runtime-length slices

Zig separates [N]T arrays from []T slices, whose representation carries a data address and runtime length. Its documentation also distinguishes slices from raw many-item pointers. This supports a small bounded-view concept for LiteScript; it does not require adding raw pointers or treating every slice as an owning container. The review uses the versioned 0.15.1 manual, not an assertion about every later standard-library API. Source: [Zig 0.15.1 slices](https://ziglang.org/documentation/0.15.1/#Slices).

## V: concise arrays with context-sensitive slicing behavior

V distinguishes ordinary growable arrays and fixed arrays. Its current documentation describes sharing, cloning, and fixed-array slicing behavior that depend on mutability and use context. This illustrates an alternative to explicit borrowed-view types, but LiteScript should decide whether such context dependence fits its goal of predictable value/permission rules. Do not assume V's array slice is identical to a Rust borrowed slice. Source: [V arrays and fixed arrays](https://docs.vlang.io/v-types.html#arrays).

## Go: convenient slices combine viewing and append capacity

Go's arrays have fixed type-level lengths; slices share a backing array and carry length/capacity information relevant to append. This makes slices central to everyday code, but appending can reuse or replace backing storage. LiteScript should consider keeping growth on an owner and bounded access on a view, so those roles remain visible. Go's nil-slice state is not part of LiteScript's proposed empty-sequence model. Source: [Go slices and their backing arrays](https://go.dev/blog/slices-intro).

## Swift: collection value semantics and deferred copying

Swift arrays are value types whose element storage can be shared until mutation triggers copying. That offers convenient independent-value behavior, with costs and ownership machinery beyond merely copying a descriptor. ArraySlice views retain source index positions rather than always starting at zero. LiteScript can choose a simpler zero-based view contract without assuming every language does so. Sources: [Swift value types and collection copying](https://docs.swift.org/swift-book/documentation/the-swift-programming-language/classesandstructures/#Structures-and-Enumerations-Are-Value-Types) and [ArraySlice](https://developer.apple.com/documentation/swift/arrayslice).

## Kotlin and Dart: useful beginner distinctions, different low-level contracts

Kotlin distinguishes fixed-size arrays from lists; its collection APIs distinguish readable and mutable list interfaces. Dart's List interface has both fixed-length and growable implementations. These are useful teaching models, but runtime fixed length does not mean the length appears in the static type, nor does it establish inline storage. LiteScript needs those distinctions for record layout and specialization. Sources: [Kotlin arrays](https://kotlinlang.org/docs/arrays.html), [Kotlin collection types](https://kotlinlang.org/docs/collections-overview.html), and [Dart List](https://api.dart.dev/dart-core/List-class.html).

## Recommendation for LiteScript

Start from the Odin/Rust separation of roles: fixed-length owning arrays, growable owning lists, and borrowed contiguous slices. Let beginner code infer ordinary lists. Distinguish compile-time fixed length from runtime fixed length within the array family, without calling both stack arrays. Consider bounded-capacity lists and type-level slice lengths later as library/specialization features.

Keep empty sequences valid without universal nullability. Keep slice creation distinct from copying elements. Before selecting owner copy behavior, resolve whether an owning list transfers, clones, shares, or uses copy-on-write; the selected shallow record copy cannot by itself create two independent owners of one allocation.

Related: [collections and iterators](collections-and-iterators.md), [record copies](local-shadowing-and-copies.md), [reserved storage](reserved-storage.md), and [memory and performance](memory-and-performance.md).
