# Conditional patterns and match syntax: language comparison

Status: **reference comparison supporting selected surface forms; remaining policies are proposals**.

Reviewed **2026-10-17** against primary documentation. Reference-language fragments below illustrate syntax, assume suitable surrounding declarations, and are not LiteScript code or executed tests. Development references may change.

## Questions being compared

- Does a condition test a Boolean, match a pattern, or unwrap an optional/outcome?
- Does narrowing bind a new name or change what the compiler knows about an existing name?
- What separates a pattern from its action or result?
- Where do matched bindings exist, and what must exhaustive selection cover?

## Rust: explicit refutable binding

```rust
if let Some(user) = find_user(id) {
    greet(user);
}
```

Rust uses `if let` for a pattern condition and `pattern => expression` for match arms. Bindings are local to their matched arm. Enum payload patterns, such as `Person::User(user)`, are distinct from arbitrary runtime type tests. Rust permits irrefutable conditional patterns, whose match always succeeds. Sources: [if expressions](https://doc.rust-lang.org/reference/expressions/if-expr.html), [match expressions](https://doc.rust-lang.org/reference/expressions/match-expr.html).

**For LiteScript:** explicit branch-local pattern bindings fit our rules. Reusing `:=` avoids introducing `let`; whether to reject always-matching conditions remains open.

## V: closest precedent for brace-only arms

```v
match person {
    User { greet_user(person) }
    Guest { greet_guest(person) }
}
```

Given an appropriate sum type, V accepts type arms directly followed by braces. Sum-type matching requires all variants or an `else`. V also supports `if person is User` and smart-casts the subject in the branch. Source: [sum types and matching](https://docs.vlang.io/type-declarations.html#sum-types).

**For LiteScript:** retain the direct pattern/body boundary. Explicit `user: User` arm bindings remain selected; existing-subject narrowing is now selected for `if person: User`, while a binding-free match-arm spelling remains under review.

## Odin: named type-switch receiver

```odin
switch value in person {
case User:
    greet_user(value)
case Guest:
    greet_guest(value)
}
```

Odin type switches introduce a named receiver, with `case Type:` arms. A single-type arm supplies that type; a multi-type arm retains the original union type according to the overview. Source: [type switch](https://odin-lang.org/docs/overview/#type-switch-statement).

**For LiteScript:** naming the narrowed input is useful, but each pattern can select its own name without an additional switch receiver syntax.

## Zig: captures separate selection from payload names

```zig
if (outcome) |value| {
    use(value);
} else |err| {
    report(err);
}
```

Zig has optional/error-union conditional captures and tagged-union switch arms such as `.user => |user| { ... },`. These are payload/tag mechanisms, not arbitrary runtime type tests. Sources: [if](https://ziglang.org/documentation/master/#if), [switch](https://ziglang.org/documentation/master/#switch).

**For LiteScript:** preserve the distinction between outcome side and payload type. Existing `Some(...)`, failure patterns, and type patterns provide explicit selection without another capture delimiter.

## Kotlin: smart casts of stable expressions

Kotlin uses `if (person is User)` and `when (person) { is User -> ... }`. Smart casts depend on stability and mutation rules; a guard with an early exit can narrow later code. Sources: [type checks and casts](https://kotlinlang.org/docs/typecasts.html), [control flow](https://kotlinlang.org/docs/control-flow.html).

**For LiteScript:** `if person: User` now permits existing-name narrowing alongside explicit bindings. Stability, logical-flow, and guard refinements require formalization; adopting the compact test does not adopt all Kotlin smart-cast rules or settle ownership.

## Dart: patterns with explicit local bindings

Dart supports `if (pair case [int x, int y]) { ... }`, including typed variable patterns. Switch statements use `case pattern:` while switch expressions use `pattern => value`. Pattern variables belong to the matching case's scope. Sources: [patterns](https://dart.dev/language/patterns), [branches](https://dart.dev/language/branches).

**For LiteScript:** reuse typed and destructuring patterns, with one braced action/value arm syntax instead of separate statement/expression arm forms.

## Swift: several distinct matching mechanisms

Swift supports enum conditions such as `if case .user(let user) = person`, optional bindings, and switch type-casting patterns such as `case let user as User:`. These are related but distinct mechanisms. Source: [Swift pattern reference](https://github.com/swiftlang/swift-book/blob/main/TSPL.docc/ReferenceManual/Patterns.md).

**For LiteScript:** keep constructor selection and type narrowing distinct semantically while sharing declaration-shaped conditional headers. Avoid requiring `case let` and a second type-pattern spelling.

## Python: structural matching, different binding lifetime

Python uses `match person:` with indented arms such as `case User() as user:`. Successful bindings outlive the case body, and matching is dynamic. Source: [match statement](https://docs.python.org/3/reference/compound_stmts.html#the-match-statement).

**For LiteScript:** retain structural-pattern expressiveness as a direction; retain our own lexical branch scope and explicit braces. Python's binding lifetime and indentation do not fit those selected rules.

## Lua and C++: useful contrasts

Lua's control grammar has no dedicated structural-match construct; programs use ordinary conditions and runtime data conventions. Source: [Lua complete syntax](https://www.lua.org/manual/5.4/manual.html#9).

For C++ `std::variant`, `std::get_if<Type>` provides a pointer when that alternative is active, otherwise a null pointer. This is library-mediated extraction, not our typed binding header. Source: [C++ variant access](https://eel.is/c++draft/variant.get).

Neither mechanism provides a reason to introduce null into LiteScript's explicit Option/Result design.

## Selected LiteScript forms

```text
if Some(user) := find_user(id) {
    greet(user)
}

if person: User {
    greet_user(person)
}

label := match person {
    person: User { person.display_name() }
    guest: Guest { guest.display_name() }
}
```

The match example assumes `person: User | Guest` and String-producing display methods. These are selected surfaces, not a complete specification. Evaluation occurs once; newly bound pattern names exist only in their branch; an existing-name test introduces no shadow. For explicit bindings, the right-hand source resolves before the shadow is introduced. Ordinary declarations require irrefutable patterns, whereas conditional matching can fail.

Existing-name stability and further logical/guard flow are tracked in [type tests and narrowing](type-tests-and-narrowing.md). This design combines declaration consistency with V-like arm boundaries. That is a design judgment, not evidence of beginner learning outcomes or generated-code speed. Choosing a syntax does not establish a runtime type registry or allocation requirement.

## Match-specific comparison and recommendations

This section evaluates the next match decisions; it does not mark the proposals as selected.

### Required pattern families

LiteScript now requires equality, plain enum selection, payload enum selection, destructuring, and type matching in the same construct. These capabilities and their illustrative forms are documented in [match pattern capabilities](match-patterns.md); plain versus payload cases are explained in [enums and variants](enums-and-variants.md).

Rust separates constant patterns from new identifier bindings and restricts which values qualify as structural constants. Dart likewise distinguishes constant and variable patterns and supplies record/object destructuring. These are useful models, but neither makes an arbitrary runtime comparison expression interchangeable with a binding. Sources: [Rust patterns](https://doc.rust-lang.org/reference/patterns.html), [Dart pattern types](https://dart.dev/language/pattern-types).

Swift distinguishes associated payloads from raw enum values. That distinction helps interpret conventional enums without assuming payload cases are integer constants or separate types. Source: [Swift enumerations](https://github.com/swiftlang/swift-book/blob/main/TSPL.docc/LanguageGuide/Enumerations.md).

**Recommendation:** compose the five families in one pattern system, keep equality tests distinct from name capture, and specify enum tag selection independently of type tests. Guards are the suggested sixth capability; runtime-equality punctuation, constructor qualification, and record-pattern grammar remain open.

Typed destructuring is now a selected composition requirement: `(x: Int, y: String)` checks component types while extracting them, in both match arms and conditional patterns. Dart provides a direct precedent with typed variable subpatterns such as `(int a, String b)`; failure of a component type test fails the pattern. LiteScript retains its colon annotations and readable underscore rules instead of copying Dart's syntax wholesale. See [Dart typed patterns](https://dart.dev/language/pattern-types#variable) and [LiteScript typed destructuring](match-patterns.md#typed-destructuring-selected-composition-rule).

### Arm shape and type-only selection

- **V:** `Type { body }` directly supports the compact type-arm direction and narrows the existing subject.
- **Kotlin:** `when (subject)` uses `is Type -> body`; a subjectless `when` handles Boolean conditions. Its common selection construct does not remove the difference between subject patterns and Boolean tests. [Kotlin control flow](https://kotlinlang.org/docs/control-flow.html).
- **Rust:** `pattern => expression` gives a broad structural-pattern vocabulary; it does not supply arbitrary `User | Guest` runtime type tests. [Rust match](https://doc.rust-lang.org/reference/expressions/match-expr.html).
- **Zig:** switch tag/literal arms use `=>`, with separate payload captures. The syntax makes the tag and bound payload distinct. [Zig switch](https://ziglang.org/documentation/master/#switch).
- **Odin:** type switches bind one receiver and use `case Type:`; they provide a useful explicit-naming contrast. [Odin type switch](https://odin-lang.org/docs/overview/#type-switch-statement).
- **Swift:** switch patterns include enum payload and type-casting patterns; `case` and `:` delimit the body. [Swift patterns](https://github.com/swiftlang/swift-book/blob/main/TSPL.docc/ReferenceManual/Patterns.md).
- **Dart:** switch statements and switch expressions have different arm punctuation; LiteScript's one braced form avoids that distinction. [Dart branches](https://dart.dev/language/branches).
- **Python:** `case pattern:` supplies class, sequence, and capture patterns, with explicit `if` guards; its dynamic name rules and indentation are not selected. [Python match](https://docs.python.org/3/reference/compound_stmts.html#the-match-statement).

**Recommendation:** keep pattern-and-brace bodies, make rebinding optional for type tests, and retain explicit patterns for payload extraction. Decide whether type-only arms use bare `User` or marked `: User` before adding shorthand to the grammar. Bare-name capture versus constant/type resolution is a real design choice; uppercase spelling must not become an implicit grammar rule.

### Exhaustiveness and fallthrough

Rust requires complete match coverage. Zig requires complete switch coverage without `else`; V requires all sum variants or `else`. Swift switches are exhaustive and do not fall through automatically. Sources: [Rust coverage](https://doc.rust-lang.org/book/ch06-02-match.html#matches-are-exhaustive), [Zig exhaustive switching](https://ziglang.org/documentation/master/#Exhaustive-Switching), [V sum matching](https://docs.vlang.io/type-declarations.html#matching-sum-types), [Swift control flow](https://github.com/swiftlang/swift-book/blob/main/TSPL.docc/LanguageGuide/ControlFlow.md).

Kotlin documents partial statement selection and requires exhaustive value selection. Python permits no arm to match. Odin normally runs one selected case but also offers explicit fallthrough. These policies are not one universal convention. Sources: [Kotlin statements and expressions](https://kotlinlang.org/docs/control-flow.html#when-expressions-and-statements), [Python matching flow](https://docs.python.org/3/reference/compound_stmts.html#the-match-statement), [Odin fallthrough](https://odin-lang.org/docs/overview/#fallthrough-statement).

**Recommendation:** require exhaustive actions as well as values, and provide no fallthrough. `if` handles intentionally partial tests. A final `else { ... }` handles the remainder, without making `_` a wildcard. On closed unions, explicit alternatives preserve the compiler's signal when a new variant is added; broad fallbacks intentionally trade away that signal.

### Ordered guards and their cost

Rust and Python use `if` after a pattern; Dart uses `when`; Swift uses `where`. Sources: [Rust guards](https://doc.rust-lang.org/reference/expressions/match-expr.html#match-guards), [Python guards](https://docs.python.org/3/reference/compound_stmts.html#guards), [Dart guards](https://dart.dev/language/branches#guard-clause), [Swift patterns](https://github.com/swiftlang/swift-book/blob/main/TSPL.docc/ReferenceManual/Patterns.md).

**Recommendation:** first matching arm in source order, no fallthrough, and an optional `pattern if condition { body }` as the guard candidate. Pattern success precedes guard evaluation; a false guard continues selection. Do not assume a guarded variant covers all its values. Avoid adopting alternative-pattern guard behavior accidentally: Rust documents that a guard may run more than once when an arm has multiple alternatives. Ownership and side-effect rules must be specified before claiming guard execution is allocation-free or optimally compiled.

The resulting LiteScript proposal, examples, and unresolved name-resolution rules are collected in [match](match.md#next-design-proposals-compact-arms-and-predictable-coverage).

## Remaining decisions

1. Reject or diagnose irrefutable pattern conditions. `Some(false)` still matches `Some(flag)`; matching does not test payload truthiness.
2. Choose fallback/otherwise patterns. `_` remains a readable binding, so it cannot silently acquire another language's nonbinding-wildcard meaning.
3. Define guards, overlap, ordering, unreachable arms, and exhaustive coverage for closed unions versus open interfaces.
4. Define nested patterns, exact-type versus subtype matching, and borrowing/moving/copying.
5. Name the stored Result success pattern without erasing its outer success/failure tag. Success and error payload types can overlap.

See [conditionals](conditionals.md), [match](match.md), [union type patterns](union-patterns.md), and the [decision ledger](decisions-and-open-questions.md).
