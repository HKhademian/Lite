# Unit

Status: **one value, `Unit`, its type/expression spellings, and its zero mapping selected; zero-sized physical representation selected by the user, 2026-10-22; empty tuple identity and () as equivalent type/value syntax selected 2026-10-22; zero-storage shape/cardinality boundaries clarified 2026-10-25; broader name-resolution and ABI details remain open**.

## Purpose

Represent successful completion without useful payload data. `Unit` is not an absent or invalid ordinary value.

## Template

```text
{
    perform_action();
    Unit
}
```

## Rules

- The unit type has one value.
- Since `Unit` has one value, the selected universal zero rule makes `zero(Unit) = Unit`. The user selects a zero-sized representation, so no payload byte needs to be stored. Calling-convention and foreign ABI lowering remain separate representation questions.
- Unit is the zero-component tuple. Both `Unit` and `()` are selected spellings in value and type contexts; they do not create distinct types or union alternatives.
- Empty executable blocks, declarations, and assignments produce `Unit`. Empty record initializer braces create record data; the enclosing declaration still produces Unit, independently of the record value it binds.
- An explicit ignored match arm can simply be `_ {}`; its empty body already returns Unit. `_ { Unit }` is equivalent but need not be written.
- A final explicit `Unit` makes a block's result explicit.
- Repeated separators do not introduce unit-valued items that replace a preceding expression.

```text
{ }                    /* Unit */
{ ;;;;; }              /* Unit */
{ x := 3 }             /* Unit */
{ x := 3; x }          /* Int */
{ calculate(); Unit }  /* Unit */
```

## Absent names in arm alternatives

Initial match-arm alternatives may bind different names. The shared guard/body receives Unit for a name absent from the successful alternative: Email(email)/Sms(phone) patterns produce email: String | Unit and phone: PhoneNumber | Unit. Unit is an initialized ordinary value here, not a new absence tag or a replacement for an unhandled control-flow path. A genuine Unit payload and absent-name Unit cannot be distinguished through that binding alone. Complete condition/guard or alternatives now use the same rule, including Boolean-only alternatives: `if .Some(user) := find_user(id) or guest_allowed` gives user: User | Unit on success. Unit-filled new bindings shadow outer names; no names escape an all-false condition or a grouped negation. See [differently named arm bindings](match.md#differently-named-arm-bindings-selected).

Unit has one real value. An exhausted type-test remainder has no possible values and uses the selected internal Never read type in an unreachable conditional branch; it does not produce Unit or widen a result union. See [Never and unreachable flow](never-and-unreachable-flow.md).

## Unit versus None

`Unit` is the result of completing an action without a useful payload. `None` is the absent variant of an `Option<T>`.

```text
print(message)          /* intended action result: Unit */
find_student(id)        /* Option<Student> */
save_student(student)   /* Result<Unit, SaveError> */
```

`Result<Unit, SaveError>` can succeed without extra data or fail explicitly. `Option<Unit>` has two distinct states: `Some(Unit)` and `None`.

## Type and value spelling

The selected type name and requested expression spelling are both `Unit`: type positions refer to the type, while a value position can refer to its unique inhabitant. This is a narrow Unit rule, not a general conversion of every type name into an expression constructor. Broader type/value namespace resolution remains open.

## Empty tuple equivalence selected

Selected by the user, 2026-10-22: Unit is the empty tuple, and () is an equivalent value/type spelling. Reference prose may continue to use Unit for action results.

```text
done: Unit = ();
also_done: () = Unit;
```

The [cross-context review](tuple-entries-and-access.md#empty-and-singleton-review-across-contexts) retains the evaluated alternatives and remaining type/pattern questions. A singleton containing Unit remains distinct from Unit. Unit has no .0 component; f() passes zero arguments while f(()) explicitly passes one Unit argument. The existing zero mapping, Option/Result distinctions, and declared-default-only omission rule apply unchanged. Empty tuple identity does not select a new ABI or automatic conversion of nominal empty records.

## Zero storage does not erase shape

Selected clarification, **2026-10-25**: Unit stores no per-instance information. Cardinality and product shape belong to static types or enclosing containers. Unit's zero-byte representation does not remove a real Unit-valued component:

```text
with_unit := (10, (), 20);
without_unit := (10, 20);
with_unit.1;     /* Unit: the second of three components */
without_unit.1;  /* Int: 20, the second of two components */

expanded := (10, ...(), 20);
/* two components: explicit spread emits the empty tuple's zero items */
```

Thus the schematic products (A, (), C) and (A, C) have different types and arities. An explicit ...() contributes no components, while an ordinary () entry contributes one Unit value. Nested zero-sized values are not recursively erased. Even a zero-item spread evaluates its operand and preserves required effects.

### A Unit element type does not declare an empty tail

```text
with_tail: (:Int, ...rest: ()) = (10, (), ());
without_tail := (10,);
/* with_tail.rest contains two Unit elements; without_tail has no tail */
```

The type (...rest: ()) means a declared array tail accepting zero or more Unit elements. It is not the zero-component tuple. Similarly, (...rest: [Int; 0]) accepts zero or more elements each of which is an empty Int array; its element type does not require the outer tail to be empty. A fixed prefix plus either tail is not identified with the prefix-only tuple. Copy retains the stored declaration, even for a known empty tail; explicit logical unpacking may reconstruct a different shape under its destination.

### Fixed Unit arrays keep their static counts

```text
five: [Unit; 5] = [(), (), (), (), ()];
three := [(), (), ()];  /* [Unit; 3] */
three.2;                /* Unit; statically valid */
three.3;                /* rejected: outside the fixed extent */

empty_ints: [Int; 0] = [];
done: Unit = ();
/* zero element/value bytes in each; distinct static contracts */
```

[Unit; 5] has five semantic positions and one possible initialized element sequence. Its count five belongs to its static type; it needs neither element payload bytes nor a runtime count field. The literal [(), (), ()] similarly has three positions, not zero. [Int; 0] retains its array element type and indexing contract despite having no elements. Neither equal storage nor having one possible initialized value identifies these arrays with Unit or with each other.

A runtime-sized array of Unit can have different observable lengths and traversal counts. Its runtime count must be available from the array/container; Unit does not gain hidden information. The same applies to a runtime-sized Unit tail accessed through value.rest. An established fixed [Unit; N] member can now be declared as (...rest: Unit; N); it retains N semantic elements without element payload or an array runtime count field. The general (...rest: ()) schema alone still states no exact N. A fixed ...rest: T; 0 remains a declared empty array member, not Unit. See [array-segment extents](tuple-array-segments.md). A length learned only at runtime does not become a compile-time extent.

A union discriminator likewise belongs to the union representation, even when an alternative has no payload. Statically known type distinctions need no tag in each Unit value. Any future runtime-erased type facility must retain its own required information.

Assuming print returns Unit, [print("A"), print("B")] still executes both calls once in written order and constructs a two-position Unit array. Zero-byte storage does not erase evaluation, failures, or required cleanup. See [fixed-array layout and runtime metadata](memory-and-performance.md#fixed-arrays-share-homogeneous-tuple-storage).

## Empty declared tails are distinct

Unit has no components and no declared array tail. A tuple with an explicitly declared rest segment remains tail-bearing when that array is empty: b := (...rest = arr0), for arr0: [Int; 0], has a rest member and is not Unit. By contrast, inferred (...arr0) contributes zero fixed components and yields Unit. A one-element fixed-array spread yields a fixed singleton tuple, while an explicit one-element rest declaration remains a tail-bearing tuple. Call expansion can supply the same input sequence from these different shapes; that does not make the tuple values/types identical or broaden the Unit-only () pattern. See [zero/singleton expansion boundaries](tuple-array-shapes.md#zero-and-singleton-fixed-expansion-versus-declared-tails).

Explicit unpacking is a reconstruction boundary: a known empty declared tail emits no items and may reconstruct Unit, while a known one-element tail reconstructs a singleton. The original stored value and ordinary copies retain the tail. In contrast, a tail containing two Unit elements emits two Unit items, not zero; unpacking is not recursively applied to each emitted value. See [zero/singleton logical expansion](tuple-unpacking.md#zero-and-singleton-boundaries).

## Empty tuple pattern selected

The selected pattern () matches only Unit and binds no names. Thus () := operation() is valid when the operation has a Unit result contract; it still evaluates the operation once. An ordinary declaration cannot use this pattern on a scalar, a singleton containing Unit, or a source that may have another type/shape. Conditional and match patterns retain their existing mismatch behavior. This does not give bare Unit a special constant-pattern meaning: ordinary binding-name rules still apply. See [empty tuple patterns](tuple-entries-and-access.md#empty-tuple-pattern-selected).

## Singleton layout does not change type identity

The user selected [empty and singleton tuple layout](memory-and-performance.md#empty-and-singleton-tuple-layout), 2026-10-22: Unit/() has zero payload bytes, and a singleton has the same size/alignment as its component at offset zero. A singleton containing Unit therefore has zero payload bytes too, while retaining its one-component shape. Layout identity alone does not merge types. The compiler distinguishes statically known types without a per-value tag; runtime code cannot distinguish identical erased payloads without type information. Actual union alternatives retain their existing discriminator contract. Exact ABI and Unit alignment remain separate.

## Loop interaction

A body that normally completes with `Unit` contributes a valid `Unit` loop value. If no path contributes and nothing else constrains the body type, that type defaults to `Unit`; an expected type can override it. Plain `continue` and bare `break` remain noncontributing paths. A loop's body type and its `then` result type are separate, so a `Unit` body may still have a non-Unit whole-loop result. See [loop value](loop-value.md) and [loop inference](loop-type-inference.md).

## Related concepts and references

- [Blocks and results](blocks-and-results.md)
- [Option](option.md)
- [Result and errors](result-and-errors.md)
- [Rust's unit type](https://doc.rust-lang.org/reference/types/tuple.html#unit) demonstrates the distinction between a unit value and optional absence. LiteScript accepts both `Unit` and `()` for its zero-component value/type.
