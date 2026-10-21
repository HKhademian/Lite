# Closures

Status: **explicit capture headers, value capture, and `var` capture of original storage are selected directions. Complete callable context types, ownership, aliasing, lifetimes, and representation remain open**.

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
shifted := map(numbers, [offset](n) { n + offset });
```

The lambda uses `offset` from its lexical surroundings rather than receiving it as a parameter. The capture header explicitly lists that context. The map API is illustrative; its library signature remains open.

## Explicit context in the callable signature

The selected direction declares captured context explicitly before the parameter list. Use LiteScript's ordinary `name: Type` parameter notation:

```text
var offset: Int = 10;

snapshot := [offset](n: Int): Int {
    n + offset
}

live := [var offset](n: Int): Unit {
    offset += n
}
```

- `[offset]` captures its value when the closure is created. For this `Int`, the closure holds `10`; later replacement of the source variable does not replace that captured value. The capture introduces a fixed, read-only local binding. General value ownership/copy eligibility remains to be formalized; it must not silently mean deep cloning every reachable object.
- `[var offset]` explicitly grants access to the original writable storage. Assignment and compound updates through the captured name replace that source location's content. This is not a mutable captured copy. The source must already permit the corresponding replacement; capture cannot upgrade a fixed outer binding.
- `var` in a capture list is a capture grant. It does not revive the retired local-only parameter header modifier or change type-side `var` parameter notation.
- Outer local values used by a body must be declared in its capture list. No implicit read capture or capture-all default is selected. A missing list means no captured local context; `[]` may state that explicitly. Resolving statically available type/module/function declarations is separate from capturing an outer local value.
- An empty parameter header still leaves the expected call inputs unnamed. It does not remove explicitly declared context: `[offset]() { ... }` can use its captured `offset` under a suitable expected callable contract.

Captured context is part of the callable's signature/contract, not an invisible implementation detail. Its fields, access permissions, ownership, and lifetime requirements must be retained when the callable is passed, stored, or assigned. Type inference may derive a capture's value type from its source without repeating it in the header; explicit context does not require users to duplicate all inferred types.

This selects the capture-header direction and semantics above. The written grammar for context-bearing callable types and full `fn` capture headers still needs review. Whether field names affect type identity, how callback types admit different environments, and how context contracts compose must not be assumed from the simple `fn(n: Int): Int` input/result notation. In particular, a matching input/result shape alone must not silently erase writable access or lifetime requirements. This does not mandate a runtime context object, dynamic lookup, or heap allocation.

`var` capture introduces a relationship to source storage, not a freely escaping public pointer. Complete nonescape, aliasing, reentrancy, cleanup, and owned-escape rules remain open. Temporary caller grants must not silently become longer-lived handles. Context-bearing callable types must also receive a valid zero mapping under universal zero initialization; a dangling or null storage handle is not an acceptable default.

## Two context roles under discussion

The user proposes two contexts: one supplied by the caller, and another potentially hidden beside the function. The exact meaning of caller-supplied context is under clarification: ordinary arguments, a distinct execution context supplied on each invocation, or values bound when creating the callable. Do not select among those readings implicitly.

The useful distinction is between externally supplied state/access and state owned by the callable itself:

- A caller-supplied context can describe resources, configuration, or writable locations provided by another owner. Its supply time, permission grants, and retention contract must be explicit. It is not necessarily ordinary positional arguments, and it is not automatically stored permanently.
- A callable-owned context can hold captured values or private persistent state alongside that particular callable value. Its fields need not become public call parameters merely because the compiler stores them with the code. Such state is distinct from fresh local variables created on every invocation.

For a model with separate per-call context, the conceptual invocation has three inputs: the callable's stored environment, the context supplied for this invocation, and ordinary arguments. This is an explanatory model, not selected LiteScript syntax or a required ABI. All three need defined contracts even if the private environment's representation is hidden from consumers. Keeping the capture declaration explicit does not require exposing its physical layout.

This distinction could support a private persistent counter owned by a returned callable without borrowing a variable left in the creating call's frame. It does not by itself fix the earlier `[var total]` example: storing an access descriptor next to the function does not make the externally owned target live longer. Private ownership/initialization, closure-copy identity, sharing between callable values, cleanup, and allocation policy remain open.

Two reference mechanisms help separate these roles. Odin supplies a distinct execution `context` through its calling convention, including allocator/logging facilities; see [Odin's implicit context system](https://odin-lang.org/docs/overview/#implicit-context-system). V's closure-owned captured copies can retain private mutable state between calls; see [V closures](https://docs.vlang.io/functions-2.html#closures). These demonstrate different mechanisms, not a claim that Odin supports lexical capturing closures or that LiteScript has selected implicit context passing.

## Capture review

Status: **reference comparison and earlier probes, 2026-10-21. Explicit capture headers above supersede the earlier inferred-name recommendation; lifetime and representation comparisons remain relevant**.

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

### Earlier observable-behavior probe

```text
var offset: Int = 10;
add := (n: Int): Int { n + offset }
offset = 20;
answer := add(1);
```

This historical probe predates explicit capture lists and is not valid current capture syntax as written. Its alternatives explain the decision:

- Snapshot capture of the scalar gives `11`: the environment holds the captured `10`.
- Live access to the outer location could give `21` if lifetime and alias rules permit the reassignment. A borrowing model may reject reassignment while that capture remains live instead.
- Ownership transfer may make later use or replacement of the source invalid, depending on the eventual ownership rules.

Inferred versus listed names is separate from snapshot versus live access. LiteScript now selects listed names, value capture with `[offset]`, and original writable-storage access with `[var offset]`. A read-only captured value still does not imply a deep snapshot of every reachable object.

### Writable captures need an explicit authority contract

```text
var total: Int = 0;
each(numbers, [var total](n) { total += n });
```

The imaginary `each` call explicitly grants the closure replacement access to the original total. Updating an owned captured copy would have a different result. Capturing writable record data and replacing a captured variable must respect the existing `mut`/`var` distinction: `var` alone grants no payload-field mutation. Payload-mutation capture notation, aliasing, and lifetime contracts remain open.

### Lifetime and representation

An immediate callback can borrow only under a contract that prevents retaining it beyond the borrowed data's lifetime. Synchronous invocation alone does not prove nonescape, and the names map/filter do not decide whether a callback is retained or a result is lazy. Returned, stored, deferred, and asynchronous callbacks need a valid environment after the creating call ends. They must not retain access to dead local storage.

Conceptually a capturing closure combines executable code with the required environment. That need not imply heap allocation: a concrete environment may be stored inline or on the stack, or optimized away when unobservable. A uniformly stored or reassigned callable accepting differently sized environments needs an explicit representation and ownership policy; the signature alone does not solve storage, lifetime, dispatch, or cleanup. Do not promise both arbitrary escaping captures and cost-free uniform function storage before defining that policy.

Existing temporary `mut`/`var` parameter grants cannot silently become escaping capture handles. Reusing a resource in an escaping closure requires a defined ownership/lifetime mechanism, not merely access to its lexical name. Tags still cannot escape as control-transfer capabilities.

### Next decision: outliving captured storage

Status: **open review; no escape policy selected**.

```text
make_adder := fn() {
    var total: Int = 0;

    [var total](n: Int): Int {
        total += n;
        total
    }
}

add := make_adder();
answer := add(1);
```

This is a lifetime probe. The returned closure accesses total's original storage after the creating call has ended. An input/result signature alone cannot establish whether that storage still exists.

Three policies can satisfy memory safety:

1. **Lifetime-checked access to original storage.** Permit `[var total]` only while the compiler can establish that the source storage outlives the closure's permitted use. Reject this returned-local example. A callback need not be invoked immediately: storing it within a proven shorter lifetime can be valid. This policy does not silently extend storage lifetime or introduce shared ownership.
2. **Explicitly owned or shared context for escape.** Offer a separate explicit storage/ownership mechanism when state must survive the creating call. Returning a closure can then be valid under that mechanism. The exact syntax, retention, sharing, cleanup, and allocation contracts are not selected. This can complement policy 1 rather than replace it.
3. **Automatic lifetime extension for captured variables.** Keep the original captured location alive as long as necessary, preserving shared-location behavior across every closure and outer access. This is not equivalent to copying its value at return. It needs a managed retention/cleanup strategy and may require allocation or other lifetime machinery; optimization can remove costs only where observable behavior is preserved.

Rust rejects closures whose borrowed captures may outlive their source and offers ownership capture as a distinct route; see [Rust E0373](https://doc.rust-lang.org/error_codes/E0373.html). C++ reference captures do not extend a local's lifetime, leaving the programmer responsible; see [C++ capture lifetimes](https://learn.microsoft.com/en-us/cpp/cpp/lambda-expressions-in-cpp?view=msvc-170). Go explicitly keeps shared captured variables alive while accessible; see [Go function literals](https://go.dev/ref/spec#Function_literals). The previously reviewed Swift model also manages surviving captured state. C++'s unchecked dangling-access possibility does not satisfy LiteScript's intended safe-storage contract.

Recommendation: policy 1 for `[var name]`, with policy 2 available for separate design if escaping shared state is needed. Reject escaping beyond the source storage's lifetime, not every returned or stored callback indiscriminately. This preserves explicit capture and avoids making `[var name]` silently select automatic lifetime extension. It remains a recommendation pending user choice; full context types, aliasing, zero mappings, and lifetime proof rules still need formalization.

### Recommendation for the next decisions

The earlier inferred-read-name recommendation is superseded by explicit capture lists. Next define context-bearing callable type signatures, record/resource ownership, read-only live access if needed, payload mutation, nonescape guarantees, and owned escaping environments. Preserve the selected value-versus-original-storage distinction without extending temporary caller grants implicitly.

## Tags and control-flow boundaries

A closure must not perform a targeted return or continuation into a construct in the function that created it. Tags are not ordinary escaping runtime handles. If code needs metadata inside a callback, explicitly capturing an ordinary metadata value is a useful safe shape:

```text
@users loop users {
    count := @users.count;
    callback: fn(): Int = [count]() { count }
    use_callback(callback)
}
```

The callback and ownership details remain illustrative, but copying a value is distinct from capturing the ability to jump back into a loop.

## Open decisions

Context-bearing callable type grammar, payload-mutation and read-only live captures, ownership/copy/move eligibility, aliasing, escaping lifetimes, context zero mappings, allocation, callback effects, generic function values, calling conventions, and self-recursive closures.

## Related concepts and references

- [Functions](functions.md)
- [Control-flow exits](control-flow.md)
- [Memory and performance](memory-and-performance.md)
- [Kotlin functions](https://kotlinlang.org/docs/functions.html) and [Rust blocks/async boundaries](https://doc.rust-lang.org/reference/expressions/block-expr.html) are comparisons; no automatic adoption of their capture rules is implied.
