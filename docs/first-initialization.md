# First initialization and definite initialization

Status: **whole-value first initialization with = and path-sensitive checks selected, 2026-10-19; conditional `else { ? }` reservation and branch-correlated initialization selected 2026-10-25; scalar/tuple/fixed-array locals implemented in the igniter, 2026-11-01**. A fixed binding declared with = ? may receive its first complete value once on each execution path. Later whole-value replacement requires var. Field/element construction and initialization through callees need separate contracts.

Implementation checkpoint, 2026-11-01: the igniter implements `x: Type = ?` for
scalar, flat-tuple and fixed-array locals. Reads before the first whole-value `=`
are rejected, the first write is permitted without `var`, later replacement
requires `var`, and definite initialization is joined across `if` and
subjectless `match` paths. Loop bodies do not establish initialization after the
loop. A guarded write such as `x = if flag { value }` records may-initialization
but not definite initialization, so a later unguarded first write is rejected as
a possible replacement. Conditional `else { ? }` reservation and its branch
correlation, field/element construction and initialization through callees
remain unimplemented.

The selected [union-local declaration rule](lite://doc/union-initialization-policy#bare-local-declarations) zero-initializes bare typed declarations, including unions. Explicitly reserved union storage (`= ?`) remains uninitialized and reuses the no-read-before-initialization rules below.

## Reserved storage already exists

```text
x: User = ?;
x = make_user();
use(x);
```

The declaration reserves storage with the intended User layout. It does not mean a null pointer or a missing allocation. The payload is not yet initialized as a User. The first successful whole-value = initializes that payload and makes ordinary User use legal. It does not grant permanent reassignment permission.

```text
x = another_user(); /* rejected here: x is initialized and lacks var */
```

In contrast:

```text
var x: User = ?;
x = make_user();      /* first initialization */
x = another_user();   /* later replacement; var permits it */
```

An omitted initializer is different: x: User; already initializes semantic zero. Its next x = ... would be replacement and therefore requires var.

## Writable before initialization, readable afterward

Clarified on **2026-10-24**: the examples distinguish single-write and multi-write bindings. Both begin unreadable when explicitly reserved with = ?. In every currently selected case, a successful whole-value write makes the binding readable:

- Single-write, x: Int = ?: unreadable with one initialization write available; after that write, readable with no further writes allowed on that execution path.
- Multi-write, var y: Int = ?: unreadable with initialization available; after that write, readable with further replacements allowed. Each later successful write keeps reads available and updates the current read type under the ordinary flow rules.

Write allowance and readable state are separate checks. These labels describe the existing fixed/var declarations; they add no source keywords.

```text
x: Int = ?;
/* x permits first initialization; reading x is rejected. */
x = 74;
/* x is readable as Int; another assignment is rejected without var. */

var y: Int = ?;
z0 := y; /* Rejected: y has no initialized value to read. */
y = 1;   /* Valid first initialization. */
z1 := y; /* Valid read. */
y = 2;   /* Valid replacement through var. */
z2 := y; /* Valid read. */
```

The marked rejected declaration illustrates a diagnostic; remove it for a valid sequence (using distinct names `z1`/`z2` reflects the 2026-11-15 postponement of same-block redeclaration shadowing; see [local shadowing and copies](lite://doc/local-shadowing-and-copies)). Var never makes an uninitialized payload readable, and first-initialization permission does not give fixed x ongoing replacement access. Both single-write and multi-write bindings become readable after a successful write; the multi-write binding also retains replacement permission. Ordinary var parameters still require initialized readable input.

The same checks apply to unions alongside the selected [assignment flow rules](lite://doc/type-tests-and-narrowing#flow-types-after-direct-assignment-selected):

```text
var value: String | Int = ?;
/* Reads and type tests are rejected before initialization. */
value = 74;
/* Reads are Int; later replacements may still be String or Int. */
value = "ready";
/* Reads are String; later replacements may still be String or Int. */
```

For fixed value: String | Int = ?, the first valid assignment likewise establishes the current member, but another whole-value assignment is rejected without var. Reservation adds neither Unit nor an unknown member to the union. Read-flow narrowing does not erase definite-initialization, branch-coverage, or access obligations; storage declared String | Int still rejects a Bool write. Write-only callee access remains [future work](lite://doc/call-replacement-flow#future-write-only-access).

## One initialization per execution path

Multiple source assignment sites are allowed when control flow chooses exactly one:

```text
x: User = ?;
if use_cached {
    x = cached_user();
} else if use_guest {
    x = guest_user();
} else {
    x = make_user();
}
use(x);
```

Every branch reaching use(x) has initialized x once. Analyze each binding independently; if the branches also initialize y, using y requires the same proof for y.

```text
x: User = ?;
if use_cached {
    x = cached_user();
}
use(x); /* rejected: the false path leaves the payload uninitialized */
```

Do not silently supply zero, declared defaults, None, or a runtime initialization check on the missing path. Branches that return or otherwise cannot reach the use do not contribute an uninitialized path to that continuation.

A fixed target's first write requires proof that it has not already been initialized on any reaching path. If some paths already initialized it, a subsequent assignment is not universally a first write; reject it without var. Loops also need proof: a possibly empty loop does not establish initialization, and a potentially repeated assignment cannot initialize a fixed binding multiple times. Complete loop analysis remains to formalize.

## Conditional reservation

An explicit `?` branch can make initialization conditional:

```text
y: User = if flag {
    new_user()
} else {
    ?
}
```

`y` is initialized when `flag` is true and reserved when it is false. The state is correlated with `flag`:

```text
if flag {
    use(y);        /* ok: this path initialized y */
}

if not flag {
    use(y);        /* rejected: y is reserved here */
}
```

For a fixed `y`, the only permitted write is the first initialization on a path where `y` is definitely reserved:

```text
if not flag {
    y = fallback_user();   /* first initialization */
    use(y);                /* ok */
}
/* both paths now initialized; use(y) is allowed */
```

A write under `if flag` is rejected for a fixed binding because that path already initialized `y`; `var y` permits replacement there. After `if not flag { y = ... }`, both the true path (initialized by the declaration) and the false path (initialized by the write) are initialized.

A declaration without `?` uses its normal default instead, so it is initialized on every path:

```text
x: User = if flag { new_user() }   /* new_user() or zero(User) */
```

The compiler must retain the branch correlation between `flag` and `y`'s state. A merely conservative "maybe uninitialized" state would reject the valid first write under `if not flag`; exact correlation and loop/branch proof rules remain to formalize.

## Reads and right-hand-side evaluation

Before initialization, reject ordinary reads, copying as User, matching, method calls requiring User, and passing/returning the value. Merely reserving the storage does not create a valid value. For example, x = transform(x) reads the unwritten payload and is rejected.

Evaluate the right-hand side under the established evaluation order. The target becomes initialized only after a successful first write of a valid complete value. If evaluation exits or propagates an error, no complete User has been installed. Do not run initialized-User cleanup on untouched payload bytes. Exact allocation release and exceptional cleanup policies remain part of the memory model.

Initialization establishes a value; later replacement may need cleanup of an old value. The compiler must distinguish these operations even though both use =. Field visibility, type compatibility, and constructor validity are not bypassed by deferred initialization.

## Caller access and partial construction

An ordinary parameter requiring User, mut User, or var User assumes a valid incoming value. It is not automatically an output-only initialization parameter merely because its current implementation writes first. Receiving reserved storage through a callee requires a separately declared contract; no out keyword is selected here. The user requests future single-write-only and multi-write-only parameter contracts, motivated by users: [User; 100000] = ?. Their syntax, read permissions after writes, per-element versus whole-destination write allowance, completion guarantees, and partial-failure behavior remain open; see [future write-only access](lite://doc/call-replacement-flow#future-write-only-access).

This decision covers whole-value initialization only. It does not select x.field = ... or indexed writes as construction operations on uninitialized subobjects. Large-array initialization is the main motivating next step: track which elements are valid while the array's storage already exists, without reading untouched elements or requiring a preliminary zero fill.

### Proposed field-by-field initialization

The joint review considers tracking initialized parts of a reserved value separately. In the design example below, `Point` holds two `Int16` fields. The byte sketches assume little-endian storage with no padding.

```text
Point := record { x: Int16; y: Int16; }

p0: Point;        /* [0, 0, 0, 0] */
show(p0);         /* whole value is initialized */

p1: Point = ?;    /* [?, ?, ?, ?] */
p1.x = 10;        /* [10, 0, ?, ?] */
show(p1.x);       /* x is initialized */
p1.y = 20;        /* [10, 0, 20, 0] */
show(p1);         /* both fields are initialized */
show(p1.x);
show(p1.y);
```

Separate rejection cases: reading `p1` before either write, reading `p1` or `p1.y` after only the write to `p1.x`, and writing `p1.x` a second time without writable access to replace it. A repeat write of the same value is still a write. Each read requires proof that the region it observes contains a valid initialized value on every reaching path. A partial first write leaves the remaining parts untouched. The compiler can potentially track this information statically for disjoint named fields.

Check writes per target region as well. A region without overwrite permission is single-write: a write is permitted only if it is a first write on every path reaching it. A region with `mut` access permits repeated writes to its contents, subject to the applicable type and access rules. This is separate from `var` permission to replace an initialized binding as a whole. If only one branch initialized `p1.x`, a read after the merge lacks a definite initialization proof. A write without `mut` at that same merge would also fail because it could overwrite the field. These checks apply even when the second write would store the same bits.

After `p1: Point = ?; p1.x = 10;`, a whole-value assignment `p1 = anotherPoint;` is rejected for this fixed binding. It would initialize `y` and overwrite the initialized, single-write region for `x` in the same operation. A whole-value first write would have been permitted before any part was initialized. `p1 := anotherPoint;` is separately rejected as a redeclaration in the same block.

The byte sketch motivates region-level tracking. The exact unit of tracking remains open. Typed fields give a tractable starting point. Padding and inactive union payload storage need separate rules before treating every physical byte as a readable part of the value. Raw byte writes also need a validity rule before they can produce a typed field value. Construction through aliases or callees, overlapping and dynamic index writes, and cleanup after interrupted construction remain open. These examples are a proposal beyond the selected whole-value rule.

A zero-initialized `mut point: Point;` followed by the same two field writes can lower to the same stores as the reserved-storage example. For this scalar-field record, the optimizer can elide the initial zero stores if it proves that no read or other observation can see them. The reserved form expresses first writes directly and may make that proof easier. With neither `mut` nor `var`, each initialized field is protected from later writes, including through a whole-value overwrite. The mutable example permits later field writes even if the emitted initialization stores are identical. Either form can store directly in the final location. If an intermediate state becomes observable through a read, alias, call, or exit with cleanup, the compiler must preserve the behavior required by that path. Copies can arise from evaluation order, overlapping accesses, or ownership requirements. Partial initialization alone does not require them.

### Apply the same region rule to array elements

An array element is a typed region, just like a record field. A first write into reserved array storage follows the same checks. The index must select a valid element and, in a single-write region, the selected element must be uninitialized on every path reaching the write. A read of one element needs that element initialized. A read of the whole array needs all of its elements initialized.

```text
items: [Int; 4] = ?;
loop 0..=3 as i {
    items[i] = i;
}
show(items);
```

This is a design case for a loop proven to visit each element exactly once and complete the writes before the read. A skipped write can leave an uninitialized element, and a repeated index can attempt an overwrite. The proof forms that the compiler recognizes remain open.

### Cleanup after interrupted construction

Apply the eventual ownership and cleanup rules to the initialized parts that hold live values on each exit path. If acquisition of the second resource in a reserved record fails, the first initialized field can still require cleanup even though the whole record never became readable. Untouched fields provide no value to clean up. Probe exits after zero, one, and both field writes. When the initialized regions are known at a given exit, the compiler can emit the applicable cleanup directly. The cleanup order and representation for paths with runtime-dependent initialization remain open.

### Reads during initialization by a callee

The user confirms that a callee can initialize reserved caller storage. The compiler checks its body with the granted output region initially unwritten. A callee may write a field without reading its old value. Reading the field, using it in a compound assignment, or passing it as an ordinary input all require proof of a prior write on every reaching path. For a reserved `Point`, `show(p.x)` is rejected at entry and allowed after `p.x = 10`. `show(p)` requires both fields initialized. The caller can rely on the callee's separately checked completion guarantee. How to declare and grant this access, and how to communicate partial state after a failed call, remain open.

```text
p: Point = ?;
initPointButDoNotReadBeforeInitedAndOnlyInitOnce(mut p); /* illustrative grant */
show(p);
```

The illustrative `mut p` expresses explicit consent to writes under a single-write initialization contract. Each field becomes readable after its first write. The callee can use it in later expressions immediately and cannot write that same region again under this contract. The callee's checked contract must guarantee that the complete `Point` is initialized on every successful return for the final `show(p)` to be valid. Actual parameter and grant syntax remain open.

### Initialization before a pending call begins

Selected on **2026-10-25**: a var local reserved with = ? may have its location selected by an earlier var argument and then receive its first whole value in a later argument before invocation. Selection does not read the payload. For use_int requiring var Int and Int, use_int(var value, ({ value = 42; 0 })) is valid after var value: Int = ?, because the caller initializes value before the callee receives it. The scalar temporary form makes the same order explicit; see [initialization during preparation](lite://doc/call-replacement-flow#initialization-during-argument-preparation-selected).

Every path reaching invocation must establish initialization and input compatibility. No read before initialization is allowed. A plain call with the payload still uninitialized is rejected, and this does not let fixed storage supply ongoing var replacement authority. Construction performed by the receiving callee, partial field/element initialization, and future write-only parameters remain open; this case initializes the whole local in caller-side preparation.

## Reference comparison

Rust permits declaring an immutable binding and assigning its initial value later; the compiler rejects use before initialization. This supports reusing = without granting later mutation. LiteScript retains explicit = ? because its omitted initializer already means zero initialization. Source: [Rust delayed initialization](https://doc.rust-lang.org/rust-by-example/variable_bindings/declare.html).

C# definite assignment requires initialization before obtaining a local's value and specifies control-flow checks. It also distinguishes ordinary reference parameters, which require initialized input, from output parameters. This illustrates why receiving reserved storage needs an explicit API contract. Source: [C# definite assignment](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/language-specification/variables#94-definite-assignment).

Rust's MaybeUninit documents field/element construction and the distinction between writing initial storage and dropping an old value. Its low-level examples do not automatically clean up every partially initialized resource. LiteScript has not selected Rust's unsafe or pointer syntax. Source: [Rust MaybeUninit](https://doc.rust-lang.org/std/mem/union.MaybeUninit.html).

Zig provides explicit undefined initialization and documents debug filling as an implementation feature rather than a readable language value. That is a comparison point for unspecified bytes, not a selected LiteScript validity or diagnostic model. Source: [Zig undefined](https://ziglang.org/documentation/0.15.1/#undefined).

Related: [reserved storage](lite://doc/reserved-storage), [declarations](lite://doc/declarations-and-assignment), [zero initialization](lite://doc/zero-initialization), [mutability](lite://doc/mutability), and [memory and performance](lite://doc/memory-and-performance).
