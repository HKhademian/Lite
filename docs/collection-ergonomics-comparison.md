# Beginner collection syntax across reference languages

Status: **reference review, 2026-10-19**. This review checks official documentation. It compares construction, iteration, and reusable function declarations separately; convenient literals alone do not establish provider-neutral APIs.

## Rust: concise use, explicit reusable contracts

An ordinary loop can hide the traversal protocol:

```rust
let numbers = [1, 2, 3];
for number in numbers {
    println!("{number}");
}
```

Rust's IntoIterator connects suitable types, including user implementations, to for loops. A beginner can use the loop before learning that protocol. Authoring a function that accepts different providers still involves a generic requirement, such as an IntoIterator bound. Source: [IntoIterator](https://doc.rust-lang.org/std/iter/trait.IntoIterator.html).

Rust also allows omitted closure parameter annotations. Unlike an automatically generic function, an inferred closure normally gets one concrete type per parameter; the same closure does not then accept unrelated argument types. Ordinary function parameters remain annotated. Source: [closure inference](https://doc.rust-lang.org/book/ch13-01-closures.html#closure-type-inference-and-annotation).

Lesson for LiteScript: hide protocols in everyday loops, but decide explicitly whether omitted function parameter types infer one type or a reusable generic requirement.

## Zig: context for construction, call-based parameter inference

Zig allows contextual aggregate construction and homogeneous tuple-to-array coercion. Its spelling differs from LiteScript:

```zig
const numbers: [3]u8 = .{ 1, 2, 3 };
```

For parameters, anytype lets the compiler infer the actual type at a call:

```zig
fn addFortyTwo(x: anytype) @TypeOf(x) {
    return x + 42;
}
```

This is static type inference, not a runtime universal object type. It reduces declaration requirements but does not itself supply one traversal contract shared by every collection implementation. Sources: [Zig 0.15.1 parameter inference](https://ziglang.org/documentation/0.15.1/#Function-Parameter-Type-Inference), [contextual struct construction](https://ziglang.org/documentation/0.15.1/#Anonymous-Struct-Literals), and [tuple-to-array coercion](https://ziglang.org/documentation/0.15.1/#Type-Coercion-Tuples-to-Arrays).

Lesson for LiteScript: calls can provide static information without requiring beginners to spell a collection abstraction. Declaration and call checking still need a defined inference model.

## V: simple literals and inferred generic call arguments

```v
numbers := [1, 2, 3]
for number in numbers {
    println(number)
}
```

V infers an ordinary array's element type from its first element and provides direct looping. These ordinary arrays are growable; fixed arrays have separate forms. This keeps the first example short, but does not make its concrete array type an abstraction over all providers. Source: [V arrays](https://docs.vlang.io/v-types.html#arrays).

Generic calls can omit type arguments inferred from their arguments. Generic declarations still declare type parameters; the documentation's discussion of further inference in future versions is not treated here as a current feature. Source: [V generics](https://docs.vlang.io/type-declarations.html#generics).

Lesson for LiteScript: infer routine literal and call information. Do not confuse inferred generic arguments with inferred generic function declarations.

## Implications for LiteScript

The references reduce beginner syntax at different boundaries. None of these mechanisms alone settles all of LiteScript's goals: short construction, simple function authoring, interchangeable providers, explicit permissions, and predictable costs.

Keep beginner examples focused on values and operations. Introduce protocol names when the programmer needs to express a reusable guarantee. Evaluate contextual element construction and inferred function requirements separately from a possible collection-type shorthand.

This is a design comparison, not evidence that any syntax has been empirically shown easier for beginners. It adds no generic grammar or automatic provider conversion.

Related: [storage-family comparison](sequence-types-comparison.md), [consumer requirements](collection-abstractions.md), [types and inference](types-and-inference.md), and [learning](tooling-and-learning.md).
