# Pattern bindings, value tests, and type tests

Status: **reference review and concrete proposal dated 2026-10-18; equality-pattern and type-only spellings are not yet selected**.

## Purpose

Distinguish introducing a name from testing a matched value. A pattern should not silently become a comparison merely because an unrelated constant was imported, nor become a type test because an identifier starts with an uppercase letter.

Ordinary readable underscore bindings, typed bindings, constructor/tuple matching, and ordered shadowing are already selected. This review proposes the remaining spelling and lookup rules; it does not adopt them or remove existing constructor forms.

## Proposed core forms

```text
name                  /* bind the matched value */
name: Type            /* type-test and bind the narrowed value */
== expected           /* compare with an existing value */
: Type                /* type-test without introducing a name */
42                    /* literal value pattern */
.completed            /* contextual enum-case pattern */
```

The bare-name rule concerns binding positions, not type names after colon, field selectors, or constructor heads. `_` remains an ordinary readable binding. Repeated bindings shadow in recursive written order; they do not assert equality.

An existing value should use explicit equality even if it is immutable or known at compile time. A literal can remain concise because it cannot be mistaken for a declaration. Enum cases retain their selected dot-prefixed or qualified spelling and their case identity, rather than becoming general whole-value equality tests.

```text
expected := read_expected_code();

match received {
    == expected { report_expected() }
    0 { report_zero() }
    other { report_other(other) }
}
```

This is proposed equality syntax. Both inputs are assumed to have a compatible equality operation and the handlers return Unit. Here other is an unconstrained final binding, not a lookup of an outer variable. Matching still selects the first fully successful arm in source order.

## Existing-value equality inside structures

```text
match pair {
    (== expected, value) { process(value) }
    _ { report_other_pair() }
}
```

The first component compares with expected; the second binds value. Ordinary `if actual == expected { ... }` remains the direct Boolean form. If used in a shared conditional pattern, the same candidate can be nested in `if (== expected, value) := pair { ... }`; no separate conditional-only pattern vocabulary is needed.

New names from a pattern become available only after the whole pattern succeeds. Therefore `(x, == x)` must not silently use the first component's new x as the comparison operand. Under this proposal, the equality operand resolves in the surrounding pre-pattern scope; an unbound x is an error. Express a relationship between extracted components through the selected and chain instead:

```text
if (left, right) := pair and left == right {
    report_equal()
}
```

A later and operand can use names from earlier successful patterns. Rebinding across separate operands remains its own open scope decision.

## Type-only patterns and existing-subject narrowing

```text
label := match person {
    : User { person.display_name() }
    : Guest { person.display_name() }
}
```

Assume a stable person of type User | Guest and String-producing methods. The proposed type-only arm introduces no name. It permits the original subject name to be used with the tested type while its refinement remains valid, as the selected `if person: User` form already does. It does not copy, freeze, or rebind the subject.

Explicit `person: User` or `user: User` arms remain selected alternatives when shadowing or renaming is desired. For a producer expression with no stable existing name, prefer an explicit typed binding to access its matched value. The type-only form does not invent it, _, or another implicit receiver.

In this proposal, bare User is not a type-test shorthand merely because User resolves to a type. After colon, normal type-expression lookup applies. Type-level values and their comparisons still need the type-system contract.

## Constructor compatibility still needs a decision

Existing `Some(user)` and `None` patterns are already documented. A constructor head with payload parentheses has an explicit syntactic role; it is not an ordinary call evaluated during matching. A payload-free bare None is the unresolved case: a strict rule that every unmarked identifier binds would turn it into a catch-all.

Two coherent choices remain:

- Use explicit case spelling for payload-free constructors, such as `.None` once its Option owner/schema is established, or an appropriate qualified case name. This keeps unmarked ordinary names as bindings. Existing None examples would need an explicit migration decision.
- Retain bare None as a recognized prelude-constructor exception. Its identity must be specified explicitly, along with local shadowing and imports; do not pretend the rule then has no lookup-sensitive exceptions.

The recommendation is explicit case spelling for a fully uniform binding rule. This review does not silently replace the selected None examples. Whether all constructor heads must be dotted/qualified, or explicit prelude forms such as Some(user) remain available, also needs formalization.

A qualified enum case remains a case pattern. Other qualified values such as settings.expected should use `== settings.expected` under the proposal; a dot in an arbitrary path must not itself become a generic equality marker. Existing enum/metadata `.field` collision handling remains a separate open rule.

## Proposed equality evaluation contract

- Compare the matched subject/component as the left operand of ordinary equality, with the expected expression as the right operand. Require a defined compatible equality operation yielding Bool; no truthiness or unrelated implicit conversion.
- Evaluate the match subject once. Evaluate an expected expression only when its pattern is reached, once for that occurrence, and do not run later-arm expressions after selection has succeeded.
- Retain selected source-order arm selection and and-chain short-circuiting. Exact recursive extraction and comparison order still need their broader effect contract before claiming a complete pattern evaluation algorithm.
- A literal pattern is a value test, not an implicit binding, type conversion, or call to a separate pattern-matching operator. Enum-tag and structural tests do not acquire whole-value equality requirements.
- Do not implicitly unwrap a Result used as an expected value, propagate an error, or discard an equality failure. Any recoverable equality operation must follow an explicitly chosen handling contract; overload/fallibility restrictions remain open.

Parenthesize a computed equality operand when needed to keep its expression together, for example `== (base + adjustment)`. A top-level and belongs to the arm/condition chain; logical operators intended inside the expected value need grouping. Full precedence must also distinguish comparison chains in expressions from a sequence of pattern tests; this review does not add `== a == b` as a pattern-chain shorthand.

These evaluation rules are proposals. They do not promise a jump table, allocation-free equality, runtime reflection, or particular performance.

## Reference comparison

### Rust

Identifier patterns bind, but path patterns take precedence, including single-segment constants resolved through name lookup. Arbitrary runtime-value comparison is ordinarily expressed through a guard rather than a general runtime expression pattern. This is compact for constants but does not meet an absolute rule that a bare name's role is independent of resolved declarations. [Rust patterns](https://doc.rust-lang.org/reference/patterns.html).

### Python

Bare names capture, dotted names compare with an existing value, and `Class(...)` introduces a class pattern. This gives a useful syntactic distinction between capture and named-value matching, although Python's nonbinding underscore and scope rules differ from LiteScript. Its dotted-value convention cannot be copied wholesale because LiteScript also uses dots for context metadata and enum cases. [Python patterns](https://docs.python.org/3/reference/compound_stmts.html#patterns).

### Dart

In matching contexts, bare identifiers denote named constants; `var name`, `final name`, or a typed variable pattern binds. Declaration and assignment contexts give bare names other roles. The explicit capture marker avoids confusing a constant test with a fresh match binding, but copying that marker would add ceremony to LiteScript's selected bare destructuring names. [Dart pattern types](https://dart.dev/language/pattern-types).

### Swift

Value-binding patterns use let/var, type tests use is or an as pattern, and expression patterns use the overloadable ~= operator. This makes several roles explicit but also admits matching behavior broader than ordinary equality. LiteScript can separate roles while reusing its existing colon and equality operator, without adopting ~=. [Swift patterns](https://github.com/swiftlang/swift-book/blob/main/TSPL.docc/ReferenceManual/Patterns.md).

### Kotlin

Subject-based when uses expressions for value cases and `is Type` for type checks; it can also bind the subject once in the header. It does not use LiteScript's bare per-component capture convention in those case expressions. Its value-case brevity therefore does not establish that the same bare spelling can unambiguously mean both capture and existing-value comparison in a structural pattern. [Kotlin conditions](https://kotlinlang.org/docs/control-flow.html#when-expressions-and-statements).

### Odin

Ordinary switch cases accept nonconstant expressions and are considered from top to bottom, stopping on success. Type switches use a distinct header such as `switch v in value` with types in the cases. This offers readable runtime-value matching and an explicit receiver, while keeping its value and type-switch contexts separate. [Odin switch](https://odin-lang.org/docs/overview/#switch-statement), [Odin type switch](https://odin-lang.org/docs/overview/#type-switch-statement).

### Zig

Switch case expressions are compile-time known; tagged-union payload capture is written separately, for example `.case => |value| ...`. This clearly separates a case selector from its introduced payload name. It is not a model for arbitrary runtime-valued case comparisons, and its broader no-shadowing policy is not LiteScript's selected policy. [Zig switch](https://ziglang.org/documentation/master/#switch).

### V

Match examples use literal cases, dot-prefixed enum cases, and bare type names for sum-type alternatives; type branches narrow the existing subject. This supports compact braced bodies, but adopting bare type names alongside LiteScript's ordinary capture names would still need a type-versus-binding resolution rule. [V matching and type checks](https://docs.vlang.io/statements-%26-expressions.html#match).

## Review outcome and remaining work

Recommend unmarked bindings, explicit `== expected` comparisons, and `: Type` type-only patterns. Keep literals and enum-case patterns concise. These spellings are under review, not added as selected grammar productions.

Before selection, resolve the bare None compatibility issue. Then settle complete operand boundaries, equality effects/fallibility, exact type/subtype semantics, and refinement stability. The broader [pattern context review](pattern-contexts.md) still tracks receiver mismatch, ownership, coverage, rest/record grammar, and enum/metadata disambiguation.

Related: [pattern shadowing](pattern-shadowing.md), [match capabilities](match-patterns.md), [type tests](type-tests-and-narrowing.md), and [match arm chains](match-guards.md).
