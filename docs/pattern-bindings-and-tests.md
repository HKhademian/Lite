# Pattern bindings, value tests, and type tests

Status: **bind, type-match, and value-match primitives selected on 2026-10-18; full composition grammar and effect/ownership contracts remain open**.

## Purpose

Distinguish introducing a name from testing a matched value. A pattern should not silently become a comparison merely because an unrelated constant was imported, nor become a type test because an identifier starts with an uppercase letter.

The selected base operations on a supplied value are bind, type match, and value match. They share one pattern vocabulary across match arms, conditional matching, and structural subpatterns. The enclosing construct still determines whether mismatch is permitted and what happens next.

## Three base operations

1. **Bind:** `name` introduces a local name for the supplied value.
2. **Type match:** `: Type` checks the supplied value's type without binding a new name.
3. **Value match:** `== expected` compares the supplied value with an existing value without binding a new name.

```text
name                  /* bind */
: Type                /* type match */
== expected           /* value match */
```

These are pattern operations with a supplied subject, not standalone expressions creating values. The existing typed binding composes the first two operations:

```text
name: Type            /* type match and bind the narrowed value */
```

An ordinary literal such as `42` or `"ali"` is a concise value-match pattern, not a fourth base operation. `== "ali"` spells its value test explicitly. Enum-case selection such as `.completed`, constructor heads, tuples, and future record forms supply structural or case constraints and route components to subpatterns; they are not all reduced to whole-value equality.

No general inline binding-plus-equality spelling is selected by these three primitives. Use the existing and chain to test a value after extracting it; combined-pattern syntax beyond the selected typed binding still needs a grammar decision.

The surrounding construct supplies the pattern's subject: `if .Some(== outValAge) := find_user_age(id)` gives it explicitly, while `.Some(== outValAge) { ... }` receives it from match. The := source separator is not part of the pattern. Whole typed declarations and typed conditions use name : Type = source; name : Type := source is rejected. Nested typed subpatterns still compose, including `.Some(age: Int) := source` in a condition. Receivers do not gain hidden filtering; see the [cross-context audit](pattern-contexts.md#operator-placement-audit).

The [Student aggregate examples](aggregate-patterns.md) apply these meanings to proposed record patterns: `Student(== outVal, "ali")` compares both components, while `Student(outVal, "ali")` binds the first and compares the second. Their positional schema and named-field selector grammar are separate decisions.

The [comparison-pattern review](comparison-patterns.md) proposes extending value matching with direct <, <=, >, and >= prefixes. Equality remains the selected direct comparison. Other comparisons already work in ordinary Boolean and guards, including grouped Boolean or; general logical subpatterns and binding-producing alternatives remain separate open features.

An unmarked bare identifier in a pattern is a binding. The rule does not reinterpret type names after colon, field selectors, or explicit constructor heads as bindings. Imports, capitalization, and the presence of an outer constant or type do not turn a bare binding into a test. `_` remains ordinary and readable; repeated bindings shadow in recursive written order without asserting equality.

An existing value uses explicit equality even if it is immutable or known at compile time. A literal can remain concise because it cannot be mistaken for a declaration. Enum cases retain their selected dot-prefixed or qualified spelling and their case identity, rather than becoming general whole-value equality tests.

```text
expected := read_expected_code();

match received {
    == expected { report_expected() }
    0 { report_zero() }
    other { report_other(other) }
}
```

This uses the selected value-match spelling. Both inputs are assumed to have a compatible equality operation and the handlers return Unit. Here other is an unconstrained final binding, not a lookup of an outer variable. Matching still selects the first fully successful arm in source order.

## Existing-value equality inside structures

```text
match pair {
    (== expected, value) { process(value) }
    _ { report_other_pair() }
}
```

The first component compares with expected; the second binds value. Ordinary `if actual == expected { ... }` remains the direct Boolean form. If used in a shared conditional pattern, the same pattern can be nested in `if (== expected, value) := pair { ... }`; no separate conditional-only pattern vocabulary is needed.

The final `_` arm is an ordinary unconstrained binding: it accepts any remaining whole subject and names that whole pair `_`. It does not select an enum case, skip the match, or unpack a payload. Its unused-name permission makes the illustrated unused binding intentional; a handler could read `_` normally. Inside a tuple, the same name instead binds its particular component because that component is the subpattern's supplied subject.

New names from a pattern become available only after the whole pattern succeeds. Therefore `(x, == x)` must not silently use the first component's new x as the comparison operand. The equality operand resolves in the surrounding pre-pattern scope; an unbound x is an error. Express a relationship between extracted components through the selected and chain instead:

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

Assume a stable person of type User | Guest and String-producing methods. The selected type-only arm introduces no name. It permits the original subject name to be used with the tested type while its refinement remains valid, as the selected `if person: User` form already does. It does not copy, freeze, or rebind the subject.

Explicit `person: User` or `user: User` arms remain alternatives when shadowing or renaming is desired. For a producer expression with no stable existing name, prefer an explicit typed binding to access its matched value. The type-only form does not invent it, _, or another implicit receiver.

Bare User is not a type-test shorthand merely because User resolves to a type; it is a binding in that position under the selected bare-name rule. After colon, normal type-expression lookup applies. The binding-free `: Type` form is selected, including as a nested structural subpattern. Type-level values and their comparisons need the type-system contract.

## Selected constructor distinction

Use `.None` to select the absent Option case in a pattern. The expected Option type supplies the case owner; use qualification when that owner is not established uniquely. Bare None is an ordinary binding identifier, even when the prelude supplies a value called None. There is no special bare prelude-constructor exception.

```text
match find_user(id) {
    .Some(user) { greet(user) }
    .None { report_missing() }
}
```

The examples use `.Some(user)` and `.None` together for consistent contextual case spelling. The expected Option type supplies both owners. The older `Some(user)` form remains an explicitly named prelude-constructor head with payload parentheses; it is not a bare identifier pattern or an ordinary call evaluated during matching. Its constructor role explains why it was previously shown without the dot, while bare None had to be changed to .None. This presentation cleanup does not select a ban on explicitly named payload heads or change aggregate patterns such as User(...). Full constructor schema/name resolution remains open.

The distinctions are:

- `.Some(user)` tests the Some case and binds only its payload to user.
- `.Some(== expected)` tests the Some case and compares its payload with existing expected, without binding a new name.
- `.Some(_)` tests the Some case and binds its payload to ordinary readable unused-allowed _.
- `.Some` tests the Some case without binding its payload; omitting the whole payload-pattern list is selected for any payload-bearing enum case.
- `.None` tests the None case and introduces no binding.
- `_` is an ordinary binding that accepts any remaining whole subject, including a whole Option or Result, without unwrapping it. It may be read, and its nonuse is explicitly allowed.

An unguarded `_` arm covers the remaining values admitted at that point. It has no special priority: source-order selection applies, so placing a catch-all before more specific arms can make those arms unreachable. A specific case test such as .None does not cover unrelated cases. Exact reachability diagnostics remain open.

A tag-only .Some arm covers every Some payload, but not None. The same form works in `if .Some := source` and nested case patterns, with no implicit extraction or invented payload name. This is not construction of a payload-bearing value without its data; see [tag-only patterns](enums-and-variants.md#tag-only-patterns).

The distinction is syntactic context: bare names bind; explicit case forms test case identity; a payload constructor head has its own role. The selected `.None` spelling replaces earlier bare None pattern examples. Bare `User` type-arm shorthand is ruled out for the same reason: unmarked identifiers do not become tests through name lookup.

This changes pattern interpretation, not expression lookup. `empty := None;` can still refer to the existing prelude value in an initializer. Likewise, `return None` is an expression, not a declaration or a pattern. Whether an isolated absent value supplies enough information to infer its Option payload type remains open.

A qualified enum case remains a case pattern. Other qualified values such as settings.expected use `== settings.expected`; a dot in an arbitrary path is not automatically a generic equality marker. Enum/metadata `.field` collision handling remains a separate open rule.

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

Bind (`name`), type match (`: Type`), and value match (`== expected`) are selected as base operations. Typed bindings compose binding and type matching; literals remain concise value tests. Explicit `.None` case selection and ordinary readable underscore bindings remain selected.

Complete equality-operand boundaries, equality effects/fallibility, exact type/subtype semantics, and refinement stability before treating the design as an implementation-ready specification. The broader [pattern context review](pattern-contexts.md) still tracks receiver mismatch, ownership, coverage, rest/record grammar, and enum/metadata disambiguation.

Related: [pattern shadowing](pattern-shadowing.md), [match capabilities](match-patterns.md), [type tests](type-tests-and-narrowing.md), and [match arm chains](match-guards.md).
