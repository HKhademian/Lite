# First initialization and definite initialization

Status: **whole-value first initialization with = and path-sensitive checks selected, 2026-10-19**. A fixed binding declared with = ? may receive its first complete value once on each execution path. Later whole-value replacement requires var. Field/element construction and initialization through callees need separate contracts.

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

## Reads and right-hand-side evaluation

Before initialization, reject ordinary reads, copying as User, matching, method calls requiring User, and passing/returning the value. Merely reserving the storage does not create a valid value. For example, x = transform(x) reads the unwritten payload and is rejected.

Evaluate the right-hand side under the established evaluation order. The target becomes initialized only after a successful first write of a valid complete value. If evaluation exits or propagates an error, no complete User has been installed. Do not run initialized-User cleanup on untouched payload bytes. Exact allocation release and exceptional cleanup policies remain part of the memory model.

Initialization establishes a value; later replacement may need cleanup of an old value. The compiler must distinguish these operations even though both use =. Field visibility, type compatibility, and constructor validity are not bypassed by deferred initialization.

## Caller access and partial construction

An ordinary parameter requiring User, mut User, or var User assumes a valid incoming value. It is not automatically an output-only initialization parameter merely because its current implementation writes first. Receiving reserved storage through a callee requires a separately declared contract; no out keyword is selected here.

This decision covers whole-value initialization only. It does not select x.field = ... or indexed writes as construction operations on uninitialized subobjects. Large-array initialization is the main motivating next step: track which elements are valid while the array's storage already exists, without reading untouched elements or requiring a preliminary zero fill.

## Reference comparison

Rust permits declaring an immutable binding and assigning its initial value later; the compiler rejects use before initialization. This supports reusing = without granting later mutation. LiteScript retains explicit = ? because its omitted initializer already means zero initialization. Source: [Rust delayed initialization](https://doc.rust-lang.org/rust-by-example/variable_bindings/declare.html).

C# definite assignment requires initialization before obtaining a local's value and specifies control-flow checks. It also distinguishes ordinary reference parameters, which require initialized input, from output parameters. This illustrates why receiving reserved storage needs an explicit API contract. Source: [C# definite assignment](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/language-specification/variables#94-definite-assignment).

Rust's MaybeUninit documents field/element construction and the distinction between writing initial storage and dropping an old value. Its low-level examples do not automatically clean up every partially initialized resource. LiteScript has not selected Rust's unsafe or pointer syntax. Source: [Rust MaybeUninit](https://doc.rust-lang.org/std/mem/union.MaybeUninit.html).

Zig provides explicit undefined initialization and documents debug filling as an implementation feature rather than a readable language value. That is a comparison point for unspecified bytes, not a selected LiteScript validity or diagnostic model. Source: [Zig undefined](https://ziglang.org/documentation/0.15.1/#undefined).

Related: [reserved storage](reserved-storage.md), [declarations](declarations-and-assignment.md), [zero initialization](zero-initialization.md), [mutability](mutability.md), and [memory and performance](memory-and-performance.md).
