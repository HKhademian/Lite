# Enums and variants

Status: **matching both plain and payload-bearing enums required; declaration, construction, representation, and conversion grammar open**.

## Purpose

Represent a choice between named cases. A plain enum has payload-free cases. A payload-bearing enum also permits cases with associated values of declared types. One match construct must handle both forms.

## Plain cases

Assume a Status enum with Ready, Busy, and Stopped cases:

```text
match status {
    Status.Ready { start() }
    Status.Busy { wait() }
    Status.Stopped { finish() }
}
```

Qualified case spelling is illustrative; no new enum declaration syntax is chosen here. The term conventional or legacy enum describes the payload-free use case, not an automatic promise of integer conversions, duplicate numeric cases, bit flags, or C ABI compatibility.

## Associated-value cases

Assume Event has Click with two coordinate values, Key with a key value, and Quit without a payload:

```text
match event {
    Event.Click(x, y) { handle_click(x, y) }
    Event.Key(key) { handle_key(key) }
    Event.Quit { close_window() }
}
```

The case tag selects the active variant. Its pattern can then bind or constrain that variant's payload. This is not a function invocation. Payload-free and payload-bearing cases may coexist.

All variants can belong to the same declared Event type. Matching the type Event alone does not determine which case is active. Variant cases and the separate union of existing types, such as `User | Guest`, are related selection capabilities but are not assumed to have identical type identity or declaration syntax.

## Coverage and access

A value-producing match over a closed enum must handle every possible case or use a suitable fallback once that spelling is selected. Additional action-match coverage rules remain a proposal. Adding a case should make a previously enumerated closed match incomplete; a broad fallback deliberately handles remaining cases instead.

Payload extraction follows normal visibility and mutation permissions. Private payload details are not made public merely because match syntax exists. Decide explicitly how modules expose public cases while hiding representations, and whether non-exhaustive public enums are supported.

## Open decisions

- Uniform-binding enum declarations, case declarations, payload names/types, and construction.
- Closed versus extensible cases, nominal identity, and any variant-specific types.
- Raw numeric values, storage widths, duplicate-value aliases, flags, explicit conversions, and FFI validity checks.
- Qualified versus inferred case names, and how any shorthand coexists with leading-dot context access.
- Borrowing, moves, copying, partial matching, payload access, layout, and optimization guarantees.

No representation is selected by writing these examples. Plain enums can have compact numeric representations and payload enums can use tagged representations, but their actual ABI and costs need a specification and implementation.

## References and related concepts

- [Swift enumerations](https://github.com/swiftlang/swift-book/blob/main/TSPL.docc/LanguageGuide/Enumerations.md): distinguishes associated values and raw values; those mechanisms should not be conflated.
- [V enums](https://docs.vlang.io/type-declarations.html#enums): an example of conventional enum matching.
- [Rust enum patterns](https://doc.rust-lang.org/reference/patterns.html): tag selection and payload destructuring.
- [Match pattern capabilities](match-patterns.md), [composition and interfaces](composition-and-interfaces.md), and [visibility](visibility.md).
