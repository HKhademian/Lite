# Enums and variants

Status: **plain/payload enum matching and contextual .case shorthand selected; declaration, representation, conversion, and metadata disambiguation rules open**.

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

## Inferred case names

When a single enum type is established by the subject or expected type, `.case` is the selected shorthand for `Enum.case`. Keep the leading dot; do not implicitly resolve an unqualified bare name as an enum case merely because its spelling fits. Qualified access remains available.

Assume progress has the enum type Progress, with started and completed cases:

```text
match progress {
    .started { show_started() }
    .completed { show_completed() }
}

if progress == .completed {
    show_completed()
}
```

The match subject supplies Progress to its case patterns. In the comparison, the known type of progress can supply the enum type to the right operand. This is contextual type inference, not a search through all enums for a matching name. If the owning enum cannot be determined uniquely, require qualification. Do not assume a Float subject identifies Progress merely because its raw value agrees with one case.

The same contextual case form can select payload cases, such as `.Click(x, y)`, when the owning enum and payload schema are established. Type-directed resolution for other call/initialization contexts still needs complete inference rules; no arbitrary static-member feature is selected here. In patterns, unmarked bare identifiers bind; they do not become enum cases through ordinary name lookup. In particular, use `.None` to test the absent Option case. Explicit payload heads such as Some(value) retain their constructor-pattern role. Expression construction through prelude Some/None still uses ordinary name resolution; this does not make every bare expression name an inferred enum case.

### Interaction with current-context metadata: policy still open

Leading `.field` already denotes current-context metadata. Enum shorthand must not silently reinterpret an existing metadata access, search outer construct contexts, or choose a meaning solely because it happens to type-check.

Recommended disambiguation: enum-pattern positions use the expected enum case; expression positions require an unambiguous enum-member or current-context interpretation. If both interpretations apply, report ambiguity and require `Progress.completed` or an explicit `@tag.completed`. The exact collision rule is still under review; the .case surface itself is selected. Context metadata continues to resolve only against the current construct; expected enum lookup is a separate, type-directed role, not outward context fallback.

### Float raw values are a separate proposal

The proposed declaration shape `Progress := enum Float { started = 0.0; completed = 1.0 }` asks for named cases with Float raw values. This does not establish whether raw values are storage discriminants or an explicit conversion mapping; declaration and numeric conversion grammar remain open.

Recommend keeping case identity distinct from raw-value equality: a two-case Progress enum has two named cases, not every intermediate Float value. Decide raw-value uniqueness, invalid conversions, NaN and signed-zero treatment, and equality before selecting a float-backed representation. No approximate float comparison is implied by `.completed`.

Swift supports floating-point raw enum values and inferred member expressions. Zig, Odin, and V also offer leading-dot enum shorthand, with their own type and representation rules. These are independent precedents, not a claim that each supports floating raw enums. See [Swift raw values](https://github.com/swiftlang/swift-book/blob/main/TSPL.docc/LanguageGuide/Enumerations.md), [Swift implicit members](https://github.com/swiftlang/swift-book/blob/main/TSPL.docc/ReferenceManual/Expressions.md#implicit-member-expression), [Zig enum literals](https://ziglang.org/documentation/master/#Enum-Literals), [Odin implicit selectors](https://odin-lang.org/docs/overview/#implicit-selector-expression), and [V enums](https://docs.vlang.io/type-declarations.html#enums).

### Reference comparison: keep the dot

Swift implicit members, Zig enum literals, Odin implicit selectors, and V enum examples all provide a leading-dot form when the owning type is known. Kotlin's when documentation describes context-sensitive resolution that can omit the enum type and leave a bare entry name, currently marked preview. LiteScript selects the dot-bearing shorthand and does not adopt bare-case contextual lookup. See the primary references above and [Kotlin when/context-sensitive resolution](https://kotlinlang.org/docs/control-flow.html#when-expressions-and-statements).

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
- Contextual case-owner inference in generic/union situations, nested case patterns, and disambiguation from leading-dot context access.
- Borrowing, moves, copying, partial matching, payload access, layout, and optimization guarantees.

No representation is selected by writing these examples. Plain enums can have compact numeric representations and payload enums can use tagged representations, but their actual ABI and costs need a specification and implementation.

## References and related concepts

- [Swift enumerations](https://github.com/swiftlang/swift-book/blob/main/TSPL.docc/LanguageGuide/Enumerations.md): distinguishes associated values and raw values; those mechanisms should not be conflated.
- [V enums](https://docs.vlang.io/type-declarations.html#enums): an example of conventional enum matching.
- [Rust enum patterns](https://doc.rust-lang.org/reference/patterns.html): tag selection and payload destructuring.
- [Match pattern capabilities](match-patterns.md), [composition and interfaces](composition-and-interfaces.md), and [visibility](visibility.md).
