# Unit

Status: **established direction; name-resolution details open**.

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
- The requested expression spelling is `Unit`.
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

## Unit versus None

`Unit` is the result of completing an action without a useful payload. `None` is the absent variant of an `Option<T>`.

```text
print(message)          /* intended action result: Unit */
find_student(id)        /* Option<Student> */
save_student(student)   /* Result<Unit, SaveError> */
```

`Result<Unit, SaveError>` can succeed without extra data or fail explicitly. `Option<Unit>` has two distinct states: `Some(Unit)` and `None`.

## Type and value spelling

The discussion proposed using `Unit` in both type and expression positions. This needs a deliberate name-resolution rule, because ordinary type names are not implicitly instantiated. It must not accidentally turn all compile-time type bindings into runtime constructors.

## Loop interaction

Whether a unit-valued iteration counts as an accumulator contribution needs explicit resolution. The search-loop examples have unit-valued bodies but an optional whole-loop result; this requires separating iteration type from construct result type. See [loop accumulator](loop-accumulator.md).

## Related concepts and references

- [Blocks and results](blocks-and-results.md)
- [Option](option.md)
- [Result and errors](result-and-errors.md)
- [Rust's unit type](https://doc.rust-lang.org/reference/types/tuple.html#unit) demonstrates the distinction between a unit value and optional absence. LiteScript's requested `Unit` literal differs from Rust's `()` spelling.
