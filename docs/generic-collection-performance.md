# Generic collection contracts and performance

Status: **unified API goal selected; mechanism proposal, 2026-10-19**. Shared collection inputs must support primitive values and records without a mandatory primitive/boxed-wrapper API split. Static specialization is the recommended common path; exact generic syntax, compiler strategy, dynamic representation, and ABI remain open. No benchmark or implementation is claimed.

## Same source contract, specialized data

```text
render_icons := fn (icons: Iterable<Icon>) {
    loop icons as icon { render(icon); }
}
```

This sketch describes a capability requirement. Recommend allowing the compiler to retain the concrete provider and element type for specialization and inlining. An inline array, standard list, custom chunked storage, or generated producer can then supply its own traversal representation without conversion to a shared container allocation.

The generic mechanism must support native scalar and record values. A common interface is not a reason to convert Int elements into object wrappers or route every element operation through an erased Object representation. This goal does not force all containers to have identical storage layouts; it keeps implementations behind unified typed contracts.

The source API need not expose an array's static extent for the compiler to use it when known. Neither array length nor a standard List class is a universal prerequisite for iteration.

## Three mechanisms to distinguish

1. Generic capability constraint: the compiler knows a concrete provider satisfying requirements and can specialize calls.
2. Runtime-erased provider value: one value can hold different providers selected at runtime, through a defined interface/adaptor representation.
3. Erased or heterogeneous element representation: elements themselves have differing runtime representations or interface identities.

They solve different problems. Requiring a traversal capability should not silently choose the second or third mechanism. A runtime-polymorphic value may legitimately involve indirect calls, ownership storage, or boxing where its chosen representation requires them; that must be an explicit design decision rather than a cost imposed on every generic collection.

Specialization can increase compilation work and code size. Sharing compatible implementations, specialization limits, and cross-module compilation need design. No universal claim that a generic interface always compiles to a free abstraction follows from the syntax.

## Logical element type and physical access

An ordinary Icon value supplied to render follows the selected [ordinary value-copy contract](parameter-values-and-slots.md#general-copy-default-selected), subject to valid type-specific copy semantics. Read-only access and generic capability syntax do not silently turn that value into a live borrowed view. A future explicit reference/view contract needs its own lifetime and alias rules. The compiler may avoid physical copies when it preserves the evaluated value and every required copy/cleanup effect; this is not a promise that every element transfer is free. Single-pass cursor consumption and explicit mutation grants must remain visible in the access contract.

Alternative layouts can still participate. For example, chunked storage can provide traversal without a contiguous slice, and packed data can produce logical values without exposing addressable native element slots. Decoding/adapting data may have genuine costs; a common protocol does not erase them or promise every provider the same performance.

If absence is needed, an explicit Option element is a semantic choice. It must not be necessary to choose a separately boxed primitive family merely to use the ordinary generic collection API. Foreign runtime interoperation may require explicit representation adapters.

## Reference lessons

Rust supports generic inputs through IntoIterator and documents monomorphization as its specialization strategy. This demonstrates useful ingredients rather than selecting Rust's syntax, borrow rules, or every standard API. Sources: [IntoIterator](https://doc.rust-lang.org/std/iter/trait.IntoIterator.html) and [Rust generic performance](https://doc.rust-lang.org/book/ch10-01-syntax.html#performance-of-code-using-generics).

C++ range concepts distinguish traversal from stronger properties such as size and contiguous access. They support asking for narrower requirements instead of universally requiring a concrete standard container. They do not by themselves make every generic traversal choose an efficient provider-specific membership algorithm. Source: [C++ range requirements](https://eel.is/c++draft/range.req).

Kotlin documents separate primitive arrays and `Array<Int>`-style boxed storage. This is a concrete example of the API/representation split the user wants LiteScript to avoid. Source: [Kotlin primitive-type arrays](https://kotlinlang.org/docs/arrays.html#primitive-type-arrays).

C# generic collections demonstrate that unified generic element APIs can store value types without the boxing required by nongeneric object collections. That does not establish that every interface crossing is allocation-free. Source: [C# generics](https://learn.microsoft.com/en-us/dotnet/csharp/fundamentals/types/generics).

## Integration priorities

Define element/access and capability semantics first, then generic specialization and optional dynamic representations. Review standard algorithm inputs and outputs against those contracts so a new provider can participate without users rewriting their consumers. Concrete construction defaults remain separate from consumer contracts. Fresh known-size bracket literals now infer fixed arrays; growable List storage is explicit. See [fixed-array inference](tuple-array-shapes.md#known-size-fresh-literals-infer-fixed-arrays).

Related: [consumer abstractions](collection-abstractions.md), [capabilities](collection-capabilities.md), [provider-neutral algorithms](collection-algorithms.md), [temporary generic notation](generic-notation.md), and [memory and performance](memory-and-performance.md).
