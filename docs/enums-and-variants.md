# Enums and variants

Status: **plain/payload enum matching, contextual .case shorthand, tag-only patterns, an explicit enum backing-type header, and assigned case values selected; full declaration, representation, conversion, and metadata disambiguation rules open**.

## Purpose

Represent a choice between named cases. A plain enum has payload-free cases. A payload-bearing enum also permits cases with associated values of declared types. One match construct must handle both forms.

## Backing types and assigned values

The selected explicit form introduces the backing type with a colon after enum and assigns each illustrated case its value with `=`:

```text
Status := enum : Float {
    Ready = 1.1;
    Busy = 2.2;
    Stopped = 3.3
}
```

Here Status is the enum type, Float is its declared backing-value type, and Ready has the declared backing value 1.1. Status.Ready remains an enum value; this declaration does not make every Float a valid Status or select implicit conversion between them. Matching still uses Status.Ready or contextual .Ready.

The same explicit spelling can describe integer-valued cases:

```text
ExitCode := enum : Int {
    Success = 0;
    Failure = 1
}
```

The backing-type clause and each assigned case value are independently optional. Their omission is allowed, not an open syntax question. The complete set of admissible backing types, constant-expression/representability rules, inferred/default backing type, and automatic value assignment still need semantic rules. Float support is required; it must not be silently restricted to integer backing values.

### Independently optional type and values

```text
Plain := enum { Ready; Busy; Stopped; }
Typed := enum : Int { Ready; Busy; Stopped; }
Coded := enum { Ready = 10; Busy = 20; Stopped = 30; }
Mixed := enum : Int { Ready = 10; Busy; Stopped = 30; }
```

These illustrate the selected combinations, including per-case omission among explicit values. An omitted backing type must use the eventual inference/default contract; an omitted value must use the eventual automatic-assignment contract. These examples do not choose zero-based numbering, increment-after-explicit behavior, collision handling, or Float automatic values.

Backing values must be distinguished from payload fields. Whether and how payload-bearing cases also receive an explicit backing value requires a separate declaration rule. Physical storage and ABI guarantees, especially for payload enums, are not settled solely by this header.

### Colon introduces the backing type

The colon is selected whenever a backing type is written, reusing the type-annotation role of fields and function results. Here it means backing-value type, not inheritance or interface implementation. The earlier colonless typed header is superseded and is not an alternate spelling. Omitting the complete colon/type clause is allowed; the inferred/default backing type remains to define.

## Plain cases

Assume a Status enum with Ready, Busy, and Stopped cases:

```text
match status {
    .Ready { start() }
    .Busy { wait() }
    .Stopped { finish() }
}
```

These cases use the established contextual shorthand; qualification remains available when needed. The selected backing-type declaration above does not yet define the complete enum grammar. The term conventional or legacy enum describes the payload-free use case, not an automatic promise of integer conversions, duplicate numeric cases, bit flags, or C ABI compatibility.

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

Option pattern examples use `.Some(value)` alongside `.None` for consistent presentation of this already selected shorthand. The earlier explicitly named Some(value) pattern remains an admitted constructor-head form; the examples do not create a new requirement that every constructor or aggregate head begin with a dot. A top-level `_` is instead an ordinary whole-subject binding, not a case selector; see [cases and bindings](pattern-bindings-and-tests.md#selected-constructor-distinction).

### Interaction with current-context metadata: policy still open

Leading `.field` already denotes current-context metadata. Enum shorthand must not silently reinterpret an existing metadata access, search outer construct contexts, or choose a meaning solely because it happens to type-check.

Recommended disambiguation: enum-pattern positions use the expected enum case; expression positions require an unambiguous enum-member or current-context interpretation. If both interpretations apply, report ambiguity and require `Progress.completed` or an explicit `@tag.completed`. The exact collision rule is still under review; the .case surface itself is selected. Context metadata continues to resolve only against the current construct; expected enum lookup is a separate, type-directed role, not outward context fallback.

### Float backing values and conversion policy

The declaration shape `Progress := enum : Float { started = 0.0; completed = 1.0 }` is now selected for an explicit backing type and assigned case values. This does not establish whether those values are physical storage discriminants or an explicit conversion mapping; complete declaration and numeric conversion rules remain open.

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

Selected on **2026-10-25**: where valid value/payload copy contracts exist, ordinary enum arguments and their corresponding fixed temporaries preserve the evaluated active case identity and payload after the source is replaced. Copying Email(payload) does not become Sms when the source changes; Items(3) and Retries(3) remain different copied cases. Inactive alternatives are not constructed, and already-copyable reference payloads retain their target/permissions under the shallow rule. This selects no tag encoding, physical copy instruction, implicit unwrap, new constructor syntax, or universal copyability. Reference syntax, memory safety, resource eligibility, ownership/lifetimes, and aliases remain deferred; see [copyable union and enum values](parameter-values-and-slots.md#copyable-union-and-enum-values-selected).

All variants can belong to the same declared Event type. Matching the type Event alone does not determine which case is active. Variant cases and the separate union of existing types, such as `User | Guest`, are related selection capabilities but are not assumed to have identical type identity or declaration syntax.

## Tag-only patterns

A case pattern may omit its entire payload-pattern list to test only the case tag and introduce no payload bindings. This is selected for payload-bearing cases as well as payload-free cases, and has the same meaning in if, match, and nested case patterns.

```text
if .Some := find_user_age(id) {
    report_found()
}

match event {
    .Click { report_click() }
    .Key { report_key() }
    .Quit { close_window() }
}
```

Assume Event has the Click, Key, and Quit cases introduced above. The Click and Key arms accept every payload of their respective case; they need neither payload equality nor an invented payload name. The match subject still supplies the enum owner, and explicit qualification remains available.

`.Some(age)` binds its payload, `.Some(== expected)` compares its payload, `.Some(_)` binds readable unused-allowed _, and `.Some` introduces no payload binding. An unguarded tag-only arm covers the whole case, so a later more specific pattern for that case cannot be selected under the existing first-success rule; exact diagnostics remain open.

This is pattern syntax, not construction of a payload-bearing enum value without its required data. It selects omission of the complete payload-pattern list, not partial argument lists or empty-parentheses behavior. Construction, payload-list arity, access/ownership effects, and recursive grammar retain their separate contracts. It does not add filtering or selective dispatch to receiver contexts whose mismatch policy remains open.

## Coverage and access

Every match over a closed enum must handle every possible case or use an explicit catch-all, including action-only matches. `_ {}` handles remaining inputs with an empty Unit body; `_` binds the subject and may be read. No extra Unit token is needed. Adding a case should make a previously enumerated closed match incomplete; a broad fallback deliberately handles remaining cases instead.

Payload extraction follows normal visibility and mutation permissions. Private payload details are not made public merely because match syntax exists. Decide explicitly how modules expose public cases while hiding representations, and whether non-exhaustive public enums are supported.

## Design direction after the category review

Status: **working proposal dated 2026-10-18; the backing-type/assigned-value declaration surface above is selected, while full grammar, case-specific types, and representation remain open**.

The [twelve-language comparison](type-categories-comparison.md) distinguishes several contracts that should not be bundled into one keyword. The [type-category vocabulary](type-categories.md) explains products, sums, domain types, generated operations, and storage independently.

### One enum family for plain and payload cases

Recommend one nominal enum concept: named alternatives, each with zero or more payload fields. A plain enum is the zero-payload case, not a separate weaker feature. This is closer to Rust/Swift than to requiring a sealed subclass declaration for every event case.

```text
/* Conceptual type equations, not selected declaration grammar. */
Status = Ready | Busy | Stopped
Event  = Click(Point) | Key(String) | Quit
Count  = Items(Int) | Retries(Int)
```

Items(3) and Retries(3) must preserve different case identities even though both carry Int. A union of existing types serves another role: `User | Guest` chooses between independently usable types. It cannot distinguish two differently named Int cases merely from the payload's type.

Recommend keeping an enum case a constructor/value of the enclosing enum, without automatically creating an independently annotatable subtype for every case. Under that proposal, a Click case can carry an independently declared Point; `.Click(point)` identifies the case and exposes that payload. A whole-subject `: Point` does not unwrap Event. Whether separately annotatable case types are desirable remains an explicit design decision.

An enum may implement behavior through an interface without requiring every case to inherit a common class. Conversely, an ordinary empty interface is not enough to establish a closed set of alternatives; any sealed-family facility would need a separate closedness contract.

### Keep raw codes and representation separate

Recommend explicit, validated conversion between raw codes and enum values. Invalid external data must not silently become an otherwise unmatchable case. Conversion names and failure channels are not chosen here. Duplicate codes would also need a rule for ambiguity or aliases.

Raw Float/string/integer codes need not determine the physical tag representation. Flags, reflection names, explicit ABI layout, and compile-time constant substitution each require their own justification. TypeScript const enum is primarily an emission facility, not another sum-type category.

Compact native representation is a goal. The enum concept should not mandate a heap object or virtual dispatch for every case. Recursive payloads, explicit references, generic layout, ownership, and ABI constraints still need rules; neither a universal zero-allocation claim nor a C performance claim follows from this proposal.

### Keep related data features independent

- **Products:** record combines fields, using the selected `Name := record { field: Type; }` surface. Construction and complete field contracts remain open; see [records](records.md).
- **Domain wrappers:** a distinct UserId can reject accidental OrderId interchange while retaining an appropriate representation. Alias identity, wrapper syntax, conversions, and layout require separate contracts.
- **Generated operations:** equality, hashing, formatting, copying, and destructuring can be requested or derived subject to field capabilities and visibility. A data-class keyword is not required merely to bundle convenient operations.
- **Identity and access:** reference identity, ownership, allocation, and read/write access are separate choices. Existing var/mut permissions do not decide those semantics.

This direction does not add class, data class, value class, sealed, or distinct declaration syntax. The subsequent explicit enum backing-type and case-value surface is recorded above. Each extra construct should provide a contract not already expressible through products, named alternatives, unions, interfaces, or explicit representation.

### Next enum decisions

1. Confirm one enclosing nominal enum type versus independently usable case types.
2. Complete the selected declaration with inference/default rules for omitted backing types/values, case payload schemas, and construction syntax.
3. Define closure/exhaustiveness across modules, including any non-exhaustive public enums.
4. Specify raw mappings, checked conversions, equality, and flags separately from layout.
5. Set representation, recursive storage, ownership, and generated-operation guarantees with the broader type model.

## Open decisions

- Complete enum declaration rules beyond the selected optional backing-type/value surface: backing-type inference/defaults, automatic case values, payload names/types, and construction.
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
