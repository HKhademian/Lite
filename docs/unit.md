# Unit

Status: **one value, `Unit`, its type/expression spellings, and its zero mapping selected; zero-sized physical representation selected by the user, 2026-10-22; empty tuple identity and () as equivalent type/value syntax selected 2026-10-22; broader name-resolution and ABI details remain open**.

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

Initial match-arm alternatives may bind different names. The shared guard/body receives Unit for a name absent from the successful alternative: Email(email)/Sms(phone) patterns produce email: String | Unit and phone: PhoneNumber | Unit. Unit is an initialized ordinary value here, not a new absence tag or a replacement for an unhandled control-flow path. A genuine Unit payload and absent-name Unit cannot be distinguished through that binding alone. Complete condition/guard or alternatives retain their identical-name-set rule. See [differently named arm bindings](match.md#differently-named-arm-bindings-selected).

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
