# Closures

Status: **function-value direction established; captures and lifetimes open**.

## Purpose and template

Use the ordinary function expression as a reusable value that may capture surrounding values.

```text
transform := fn(x: Int): Int {
    x * 2
}
```

Use `(x) { ... }` when a binding, method signature, or callback contract supplies parameter and result types. Optional lambda annotations such as `(x: Int): Int { ... }` can also supply an independent signature. Both lambda and full `fn` forms use brace bodies and permit optional trailing item semicolons. The intermediate contextual `fn(x) { ... }` spelling is retired as redundant. Complete lambda parsing and capture rules remain open; see [functions](functions.md#compact-implementations-under-review).

## Result behavior

The final expression supplies normal completion, exactly as in a named function. A plain `return` exits the nearest closure or function body.

```text
transform := fn(x: Int): Int {
    if x < 0 { return 0 }
    x * 2
}
```

## Capture sketch

```text
offset := 3;
shifted := map(numbers, (n) { n + offset });
```

The lambda uses `offset` from its lexical surroundings rather than receiving it as a parameter. Making that value available is capture. The map API is illustrative; this sketch does not select capture inference, copy, move, borrow, or shared-reference semantics.

## Capture review

Status: **comparison and recommendation, not a selected capture contract; 2026-10-21**.

### Modern reference-language solutions

- **Rust** infers required captures and their modes from body use: shared/unique immutable borrow, mutable borrow, or ownership transfer. `move` requests capture by value, copying where the type is Copy. Captures form a concrete closure environment rather than automatically becoming a heap allocation; lifetime/alias restrictions still apply. See [capture modes and closure representation](https://doc.rust-lang.org/reference/types/closure.html) and [capture inference and move](https://doc.rust-lang.org/reference/expressions/closure-expr.html).
- **V** requires captured names to be listed: `fn [offset] (n int) int { return n + offset }`. Captured values are copied when the closure is created. Replacing the outer variable does not replace the captured copy. `fn [mut count] ...` permits mutating the closure's copy, not automatically updating the original variable; references are a separate route. See [V closures](https://docs.vlang.io/functions-2.html#closures). A copy is not a universal deep snapshot of all reachable storage.
- **Odin** supports noncapturing procedure literals, not closures over surrounding local variables. Its FAQ explicitly rejects automatically managed capture environments as contrary to its philosophy. See [Odin closures](https://odin-lang.org/docs/faq/#does-odin-have-closures).
- **Zig** offers an explicit-context approach in its standard sorting API: `heap` and `insertion` receive `context` separately and pass it to the comparator. This is a documented library solution to stateful callbacks, not a capture-list feature. See [Zig sort source](https://github.com/ziglang/zig/blob/master/lib/std/sort.zig).

### Further references: C++, Swift, Go, and JavaScript/TypeScript

Checked against official documentation on 2026-10-21. These fragments belong inside an enclosing function and use an integer to isolate binding capture from object aliasing. They are explanatory examples, not locally compiled fixtures.

**C++: choose value or reference explicitly.**

```cpp
int offset = 10;
auto snapshot = [offset](int n) { return n + offset; };
auto live = [&offset](int n) { return n + offset; };
offset = 20;
snapshot(1); // 11
live(1);     // 21
```

`[offset]` copies this integer; `[&offset]` refers to the original variable. `[=]` and `[&]` establish default modes for referenced outer names. `mutable` permits changes to a captured value copy, not writeback to its source. Reference capture does not extend a local's lifetime, so escape safety needs separate care. See [Microsoft C++ lambda documentation](https://learn.microsoft.com/en-us/cpp/cpp/lambda-expressions-in-cpp?view=msvc-170).

**Swift: shared outer variables by default; capture lists can save a value.**

```swift
var offset = 10
let live: (Int) -> Int = { n in n + offset }
let snapshot: (Int) -> Int = { [offset] n in n + offset }
offset = 20
snapshot(1) // 11
live(1)     // 21
```

The list initializes a new captured constant at closure creation. Capturing a class value still refers to that object, not a deep clone. Swift manages captured state; strong captures involving objects can form reference cycles, with `weak`/`unowned` capture options. Its parameter contracts also distinguish escaping from nonescaping closures. See [Swift capture lists](https://docs.swift.org/latest/documentation/the-swift-programming-language/expressions/#Capture-Lists) and [closures](https://docs.swift.org/latest/documentation/the-swift-programming-language/closures/).

**Go: captured variables are shared and survive while accessible.**

```go
offset := 10
add := func(n int) int { return n + offset }
offset = 20
answer := add(1) // 21
```

For a snapshot of this integer, introduce a separate binding first, such as `saved := offset`, and have the closure read `saved`. This is a copy into a new variable rather than a capture-mode annotation. See [Go function literals](https://go.dev/ref/spec#Function_literals).

**JavaScript/TypeScript: lexical variable bindings remain accessible.**

```typescript
let offset = 10;
const add = (n: number): number => n + offset;
offset = 20;
const answer = add(1); // 21
```

For this scalar snapshot, write `const saved = offset` before creating a closure that reads `saved`. An object saved in another binding still refers to the same object. Type annotations do not introduce a different capture mechanism. See the [TypeScript handbook's capture explanation](https://www.typescriptlang.org/docs/handbook/variable-declarations.html#var-declarations).

For LiteScript, these are separate design tools to consider: explicit value/reference modes, capture-time initializers, escape contracts, and explicit shared-lifetime management. Copying a value, sharing a location, keeping it alive, and permitting writes must each have a contract; concise punctuation does not settle them.

### Decide observable behavior before notation

```text
var offset: Int = 10;
add := (n: Int): Int { n + offset }
offset = 20;
answer := add(1);
```

This is a design probe, not a claim that it is currently valid executable LiteScript:

- Snapshot capture of the scalar gives `11`: the environment holds the captured `10`.
- Live access to the outer location could give `21` if lifetime and alias rules permit the reassignment. A borrowing model may reject reassignment while that capture remains live instead.
- Ownership transfer may make later use or replacement of the source invalid, depending on the eventual ownership rules.

Inferred versus listed names is separate from snapshot versus live access. An explicit capture list alone does not determine either timing or ownership. Likewise, a read-only capture does not imply an immutable deep snapshot.

### Writable captures need an explicit authority contract

```text
var total: Int = 0;
each(numbers, (n) { total += n });
```

The imaginary `each` call illustrates a second probe. Updating the original total requires access to its original storage; updating an owned captured copy would have a different result. The outer `var` grants replacement in that outer scope, but does not yet define how a lambda obtains that authority. Capturing writable record data and replacing a captured variable must respect the existing `mut`/`var` distinction. No capture-grant syntax is selected.

### Lifetime and representation

An immediate callback can borrow only under a contract that prevents retaining it beyond the borrowed data's lifetime. Synchronous invocation alone does not prove nonescape, and the names map/filter do not decide whether a callback is retained or a result is lazy. Returned, stored, deferred, and asynchronous callbacks need a valid environment after the creating call ends. They must not retain access to dead local storage.

Conceptually a capturing closure combines executable code with the required environment. That need not imply heap allocation: a concrete environment may be stored inline or on the stack, or optimized away when unobservable. A uniformly stored or reassigned callable accepting differently sized environments needs an explicit representation and ownership policy; the signature alone does not solve storage, lifetime, dispatch, or cleanup. Do not promise both arbitrary escaping captures and cost-free uniform function storage before defining that policy.

Existing temporary `mut`/`var` parameter grants cannot silently become escaping capture handles. Reusing a resource in an escaping closure requires a defined ownership/lifetime mechanism, not merely access to its lexical name. Tags still cannot escape as control-transfer capabilities.

### Recommendation for the next decisions

Aim for inferred read-only capture names for ordinary callbacks, while making writes to outer storage and ownership/lifetime changes explicit. First settle snapshot versus borrowed access for the scalar example. Then settle capture of records/resources, mutation authority, nonescape guarantees, and owned escaping environments. Capture-list punctuation can follow those contracts. This recommendation does not yet choose a default mode or extend temporary caller grants.

## Tags and control-flow boundaries

A closure must not perform a targeted return or continuation into a construct in the function that created it. Tags are not ordinary escaping runtime handles. If code needs metadata inside a callback, explicitly capturing an ordinary metadata value is a useful safe shape:

```text
@users loop users {
    count := @users.count;
    callback := fn(): Int { count }
    use_callback(callback)
}
```

The callback and ownership details remain illustrative, but copying a value is distinct from capturing the ability to jump back into a loop.

## Open decisions

Capture inference and modifiers, mutable captures, escaping closures, allocation, callback effects, generic function values, calling conventions, and self-recursive closures.

## Related concepts and references

- [Functions](functions.md)
- [Control-flow exits](control-flow.md)
- [Memory and performance](memory-and-performance.md)
- [Kotlin functions](https://kotlinlang.org/docs/functions.html) and [Rust blocks/async boundaries](https://doc.rust-lang.org/reference/expressions/block-expr.html) are comparisons; no automatic adoption of their capture rules is implied.
