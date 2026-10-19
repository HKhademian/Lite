# Collection operations as contract sugar

Status: **user-proposed compiler-contract model, 2026-10-19; resolution and interface details remain proposals**. Ordinary loop and bracket syntax can request underlying traversal and lookup contracts without requiring script authors to name those contracts.

## Resolve operations from the static type

```text
loop users as user {
    greet(user);
}

user := users[5] else {
    guest_user()
}
```

Conceptually, the loop obtains an appropriate traversal and advances it through its protocol. The bracket operation invokes the selected read-lookup contract. Iterable and Indexable describe the protocol roles. The accepted [T] direction identifies get_index, set_index, and iterable hooks; complete interface/implementation syntax remains deferred. General keyed lookup does not automatically imply the positional sequence bundle. This does not add for as another loop keyword.

Resolve the implementation from the receiver's static type, generic requirements, and explicit conformance/implementation rules. The compiler does not inspect arbitrary runtime objects for similarly named methods. If multiple implementations could apply, require a defined coherence/disambiguation rule rather than guessing.

An inferred generic parameter can acquire its required contract from these operations. An explicitly complete signature must supply the requirements used by its body. This is static contract resolution, separate from the eventual choice of specialization or explicit runtime dispatch.

## Two distinct failures

- Missing contract: the receiver cannot support the operation. Reject the definition or call at compilation when its static contract is insufficient.
- Supported operation fails: a valid lookup may encounter an out-of-bounds index or another declared lookup failure. Handle or propagate its typed Result through the existing else/! model, or retain the outcome for inspection.

An unsupported operation does not automatically become a recoverable runtime error. A provider's declared failure type also must not be silently broadened by the sugar. An explicitly dynamic capability-test API could be considered separately.

## Contract facts to retain

A traversal contract must specify its yielded element/access type, how traversal state is obtained, and how normal exhaustion is represented. Creating local traversal state differs from advancing caller-owned cursor state; existing ownership and mut grants still matter. Fallible or asynchronous traversal needs declared delivery/failure contracts. Normal exhaustion must not silently become a producer error or vice versa.

A lookup contract must specify its key/index type, successful result/access type, and fallibility. Integer positional indexing is one case; a map can use a noninteger key. Do not assume every bracket operation provides a stable position, a contiguous addressable slot, a cheap length, or constant-time access.

Read lookup and element replacement need distinct permissions and requirements. An existing read operation plus a mut qualifier does not manufacture a setter or permit writes that violate a set's invariants. Exact indexed-write failure syntax is separate from this read-sugar proposal.

Complexity, invalidation, order, lifetime, and permitted mutation belong to the contract even when the source notation is short. The compiler must not manufacture a missing implementation by sorting a set, draining a generator, or allocating a List.

## Scripts can infer the required operations

```text
third_or_zero := fn(users) {
    users[2] else {
        0
    }
}
```

The input requirement includes supported positional lookup; local recovery handles its declared failures. Result typing follows the existing success/fallback union rule. A function that only loops over its input can infer the weaker traversal requirement and accept suitable sets too.

This proposal still needs a generalization algorithm. It must retain relationships between input elements and output values, access permissions, implementation coherence, and declared error coverage. No generic grammar is selected by the omitted parameter annotation.

## Reference comparison

Rust's IntoIterator connects a type to its for-loop traversal protocol. Its Index trait connects bracket reads to an underlying operation and has a separate IndexMut counterpart for writable use. Rust's Index may panic on invalid bounds, so the operation-to-contract mechanism is relevant without adopting that failure policy. Sources: [IntoIterator](https://doc.rust-lang.org/std/iter/trait.IntoIterator.html) and [Index](https://doc.rust-lang.org/std/ops/trait.Index.html).

Kotlin maps a[i] to get(i) and indexed assignment to set operations through operator conventions. This is another example of familiar source syntax selecting a typed operation. LiteScript's intended explicit conformance and typed recoverable bounds model remain its own design. Source: [Kotlin operator conventions](https://kotlinlang.org/docs/operator-overloading.html#indexed-access-operator).

## Open type-definition question

Contract resolution explains what an operation requires. Function inputs must express required behavior; outputs must describe guaranteed behavior and preserve necessary type relationships. A generic constraint is not automatically a boxed runtime interface value, and a contract does not by itself choose a stored representation. This requires a separate signature/return contract before the shorthand [T] or generic punctuation can be finalized.

Related: [inferred collection syntax](collection-inference.md), [capabilities](collection-capabilities.md), [interfaces](composition-and-interfaces.md), [checked operations](checked-collection-operations.md), and [generic performance](generic-collection-performance.md).
