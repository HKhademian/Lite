# Union storage: modern reference languages

Status: **reference comparison checked 2026-10-21**. This records documented contracts, not measurements or compiled layout tests. LiteScript's selected conceptual direction is [metadata plus overlapping payload](union-zero.md#current-storage-model). Exact metadata encoding, ABI, and zero-tag meaning remain open.

## The user's model

```text
struct AB {
    metadata;
    union { A a; B b; }
}
```

This is the tagged-union idea: member information plus storage for one payload. A language can expose that idea while allowing a compiler to change the physical encoding. Max-member payload capacity does not imply a universal total size equal to the largest member, nor an exact metadata-plus-payload size without alignment/padding.

## Rust

```rust
enum AB { A(A), B(B) }
```

Enums logically distinguish variants. Most default Rust layouts are not fixed by this sketch. However, `#[repr(C)]` enums with fields are explicitly specified as a C-layout struct containing a tag and a union of payload structs: a direct structural match to the user's model. [Rust enum layout](https://doc.rust-lang.org/reference/type-layout.html#reprc-enums-with-fields)

Some enum encodings can reuse invalid payload representations rather than store a separate tag. The documented Option representation guarantees this for specified types; do not generalize it to every enum. [Option representation](https://doc.rust-lang.org/std/option/index.html#representation)

Default construction and clearing bytes differ. Derived enum Default needs a marked unit variant; a payload default can use a manual implementation. Rust does not guarantee all-zero validity for every type. [Enum defaults](https://doc.rust-lang.org/stable/error_codes/E0665.html), [zeroed](https://doc.rust-lang.org/std/mem/fn.zeroed.html)

Rust also offers an untagged `union`; reading a field requires unsafe because the union does not track the active field. [Rust unions](https://doc.rust-lang.org/reference/items/unions.html)

## Zig

```zig
const AB = union(enum) { a: A, b: B };
const value: AB = .{ .a = a_value };
```

`union(enum)` supplies an inferred enum tag; `union(Tag)` uses a declared tag type. Switch selects the active case. Tagged-union semantics fit member metadata plus one payload, but this source notation is not a fixed C wrapper layout guarantee. Bare unions have unspecified representation and safety-checked active-field access; `extern union` instead guarantees target C ABI compatibility. [Zig unions and tagged unions](https://ziglang.org/documentation/master/#union), [extern union](https://ziglang.org/documentation/master/#extern-union)

The examples initialize a chosen case explicitly. The inspected language-reference sections do not establish LiteScript's universal all-byte-zero initialization contract. Do not infer a first-case zero default or guaranteed tag position from the declaration.

## Odin

```odin
AB :: union { A, B }
```

An ordinary union is discriminated and supports type switches/assertions. Its zero is nil. `union #no_nil { A, B }` removes nil and uses its first variant as the default type. `#shared_nil` is a separate policy that normalizes qualifying variant nil values. These choices illustrate why metadata zero needs a semantic rule. The overview does not establish an exact total-size formula or stable tag offset. [Odin unions and union tags](https://odin-lang.org/docs/overview/#unions)

Odin separately provides `struct #raw_union { ... }`, with every field at offset zero, for C-style untagged storage. [Struct layout directives](https://odin-lang.org/docs/overview/#structs)

## V

```v
type AB = A | B
```

V's sum types preserve runtime member identity: `type_name()` reports it, and match can select variants with exhaustive coverage or an else. These semantics need member information but do not specify an exact inline payload-plus-tag ABI. The checked public page does not settle concrete payload indirection, allocations, or the default zero-tag meaning; this comparison makes no such claim. [V sum types](https://docs.vlang.io/type-declarations.html#sum-types)

V separately provides a C-style `union AB { ... }`: fields share storage, and member access requires unsafe. This is distinct from its A | B sum type. [V unions](https://docs.vlang.io/unions.html)

## C++

```cpp
using AB = std::variant<A, B>;
```

`std::variant` tracks its active alternative and contains that alternative's value within the variant object. A tag/index plus overlapping payload is a suitable conceptual model, but the standard specifies no fixed member offsets or total-size equation. It does not require a separate allocation for its storage; an alternative can itself allocate. [Variant object contract](https://eel.is/c++draft/variant.variant.general)

Default construction value-initializes the first alternative when that alternative is default-constructible; it is not a blanket memset-zero operation. A variant can become valueless through certain throwing operations, so that state must not be confused with its ordinary default. [Default constructor](https://eel.is/c++draft/variant.ctor), [value status](https://eel.is/c++draft/variant.status)

A raw C++ union does not automatically track the active member; adding an external tag produces the user's manual wrapper model. [C++ union documentation](https://learn.microsoft.com/en-us/cpp/cpp/unions?view=msvc-170)

## Consequence for LiteScript

The metadata-wrapper clarification supports the existing checked narrowing and exhaustive matching model. Rust's repr(C) enum is the clearest specified structural precedent; Zig, Odin, and C++ provide tagged alternatives with different initialization and layout guarantees. V provides both safe sum-type behavior and a separate raw union, without the exact sum-type layout contract established here.

Universal bytewise zero remains LiteScript's own stronger requirement. The next unresolved decision is what zero metadata denotes: a listed member or another deliberately specified state. None of the comparisons automatically selects that mapping for an order-independent plain union. Exact tag storage, alignment, and optimizations remain separate from this semantic decision.
