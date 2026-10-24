# Collections and iterators

Status: **iteration capabilities required; collection and iterator protocols open**.

## Purpose

Build consumer APIs around required collection abilities while allowing one iteration syntax. Compatible providers should not need conversion to a standard List or exposure of their static size merely to supply elements. Keep direction, stepping, keys, and entry views outside the loop keyword set. See [consumer abstractions](collection-abstractions.md) and [proposed capabilities](collection-capabilities.md).

## Templates and examples

```text
loop users as user { greet(user) }
loop users.reverse() as user { greet(user) }
loop users.reverse().step(2) as user { greet(user) }
loop directory.keys() as key { process(key) }
loop directory.items() as entry {
    (key, value) := entry;
    process(key, value);
}
```

These method names are proposals, not implemented standard-library APIs.

## Proposed storage families

The [sequence storage review](sequence-types.md) recommends fixed-length owning arrays, growable owning lists, and borrowed contiguous slices. The [array proposal](arrays.md) separates compile-time inline length from runtime-sized fixed ownership; the [list proposal](lists.md) separates live initialized length from reserved capacity; the [slice proposal](slices.md) exposes existing initialized elements without owning or copying them. Their owning/view representations and complete source grammar remain proposals; fixed-array [T; N] examples and known-size literal inference are selected below.

Fresh bracket literals with an established element type and statically known length infer [T; N], unless an expected concrete collection type selects another constructor family. This supersedes unconditional List inference. Var/mut affect permissions without changing family or extent. Growable List storage is explicit; existing providers retain their contracts. Empty/heterogeneous and runtime-length spread literal inference, ownership/transfer, runtime-array spelling, and view lifetimes remain open. See [tuple and array shapes](tuple-array-shapes.md).

## Element contract

The source determines the item type. One optional header name denotes that element. Destructuring and refutable selection happen inside the body. Count/index/value are context fields, not tuple components or receiver slots. A present/filter adapter remains a deferred library possibility; see [loop pattern alternatives](loop-pattern-alternatives.md).

## Iterator evaluation

An iterable-producing source expression is evaluated once. Advancing the resulting iterator supplies successive items. A Boolean loop guard is a different static source mode and is reevaluated before each attempt.

## Capability and cost rules

- Reverse traversal requires a source that can provide it, or explicit buffering.
- Source indexes and loop iteration counts are different concepts.
- An exact remaining length cannot be assumed for an arbitrary stream.
- Last-item detection may need lookahead and must not be promised as free universal metadata.
- Accumulating a final value is not automatically equivalent to collecting all values.

## Reserved array and buffer storage

Large arrays are the primary use case for [explicit reserved storage](reserved-storage.md#main-use-case-large-arrays-and-buffers). Successful reservation provides storage with unwritten payload bytes; it does not create a missing/null allocation or make those elements readable. A construction protocol must distinguish reserved capacity from initialized elements before ordinary iteration can expose them.

Sequential prefix filling and arbitrary-index filling may need different proof/tracking strategies. Dynamic-size allocation, length versus capacity, first element writes, partial views, and cleanup remain open. Neither the loop syntax nor mut/var caller grants automatically selects an output-buffer initialization contract.

## Open decisions

The iteration interface; owned versus borrowed items; mutation during iteration; reusable versus consuming iterators; errors while advancing; termination signaling; adapter representation; and capabilities exposed through tags.

The type of an iterator's end signal must not reintroduce universal nullability. An optional or tagged next-result representation is a candidate, not a selected ABI.

## Related concepts and references

- [Loops](loops.md)
- [Loop receivers](loop-receivers.md)
- [Memory and performance](memory-and-performance.md)
- [V iteration examples](https://docs.vlang.io/statements-&-expressions.html#for-loop) and [Rust iterator loops](https://doc.rust-lang.org/reference/expressions/loop-expr.html#iterator-loops) are comparisons rather than selected protocols.
