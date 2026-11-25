# Identifiers

Status: **Selected design (2026-11-24): strict UAX #31 `(XID_Start | "_") { XID_Continue }` profile pinned to Unicode 16.0.0 (no format-control characters such as ZWNJ `U+200C` / ZWJ `U+200D`), ordinary underscore bindings and underscore-prefixed unused-name intent, case-sensitive names, NFC normalization for identifier identity, and distinct confusables/Persian-Arabic variants handled via diagnostics and UTS #39 lints. Current executable support: Phase 1 (Unicode 16.0.0 `XID_Start`/`XID_Continue` lexing in `core/text` + `core/unicode` and ASCII-fast-path C11 identifier mangling) is implemented across both TS and C11 backends; Phase 2 (NFC normalization) and Phase 3 (UTS #39 confusable diagnostics) remain planned.**

## Purpose

Let programmers name bindings in their own language while keeping identifier recognition separate from scope, shadowing, and mutation rules.

## Working template

```text
identifier := (XID_Start | "_") { XID_Continue }
```

`XID_Start` and `XID_Continue` are Unicode identifier properties pinned to **Unicode 16.0.0** ([Unicode identifier rules](https://www.unicode.org/reports/tr31/)). The selected LiteScript profile adds `_` as an initial character, uses case-sensitive names, and applies strict `XID_Continue` without format-control (`Cf`) characters such as ZWNJ (`U+200C`) or ZWJ (`U+200D`).

## Examples

```text
student_name := "Ada";
élève := "Ada";
学生数 := 12;
پیام := "سلام";
کتاب_ها := 12;
_temporary := 3;
```

Digits (ASCII or Unicode decimal digits) may continue a name (`XID_Continue`) but do not begin one (`XID_Start`). Symbols and emoji outside `XID_Start` / `XID_Continue` (such as `🚀`), punctuation such as `.`, `@`, and `:`, and join controls such as ZWNJ (`U+200C`, use `_` as in `کتاب_ها` instead) are excluded from identifiers. Reserved words are recognized separately; their complete list and any escaping form remain open.

## Names versus localized source vocabulary

Unicode names already allow student-authored names in familiar scripts. The
[multilingual learning proposal](lite://doc/multilingual-source-and-learning) goes further:
localized keywords, predefined names/APIs, diagnostics, and lessons, with a possible
bridge to simple English. That proposal does not change current keyword lookup,
normalization, scope, or label compatibility. Translation of a user-defined name
needs a scope-aware mapping; visually similar or translated names are not silently
identical. Persian/Arabic letter variants and join controls remain profile and
tooling questions, not newly selected equivalences.

## Names and scope

Identifier spelling determines which name is being referenced. Lexical scope determines which binding of that name is visible across a nested block hierarchy whose outermost level is the invisible-brace file block (with no parent block). As clarified on **2026-11-15**, **same-block shadowing through redeclarations is postponed completely**: two declarations of the same symbol inside one block — even of different kinds — are disallowed for now across both root file blocks and inner `{ ... }` blocks (nested inner `{ ... }` blocks and flow-sensitive type narrowing without redeclaration remain distinct; see [local shadowing and copies](lite://doc/local-shadowing-and-copies)).

Pattern bindings may reuse the source value's name. A matching branch can shadow an outer union binding with a narrowed binding; the source expression is resolved before that new name becomes active. The shadow is limited to its matching branch and does not affect sibling branches or outer lookup. See [union type patterns](lite://doc/union-patterns) for examples using both same-name shadowing and a distinct pattern name.

An unmarked bare identifier in a pattern binds, even if an outer constant or type uses that name. Capitalization does not turn it into a test. Use `.None` to select the absent Option case; bare None binds. Explicit constructor heads with payload parentheses, such as Some(value), keep their distinct constructor role. Use `: Type` for a type-only match and `== expected` for an existing-value match; see [pattern bindings and tests](lite://doc/pattern-bindings-and-tests).

The name after `@` in a tag follows the same identifier character rules. Tags retain their own namespace and construct-specific capabilities.

In every code block (the root file block and inner braced `{ ... }` blocks),
symbol visibility is **parallel at compile time** ("circuit wiring") while
values follow serial execution along the **execution trace**. The
[deferred function-body rule](lite://doc/functions#deferred-body-lookup) permits
late reads, writes, type references, and calls across siblings and parent
blocks under one uniform rule, rejecting only uninitialized accesses (such as
reserved `x: Int = ?;` or reading a later binding before its initializer runs).
When no enclosing same-name binding conflicts, the
[direct self-reference case](lite://doc/functions#direct-self-reference-without-an-earlier-target)
admits a function's own binding, and an
[explicit self call](lite://doc/functions#explicit-current-function-self-calls) targets
the implementation currently executing instead of performing ordinary name lookup.
Only `self(...)` is selected; standalone-value and self-named local/parameter
collisions, mutual recursion, and nested-scope edge cases remain open. See
[executable block items](lite://doc/evaluation-order#executable-block-items) and
[module lookup](lite://doc/modules-and-packages#module-lookup-without-header-files).

## Underscore-prefixed names, including standalone underscore

`_`, `_user`, and `_left` are ordinary readable identifiers with explicit permission to be unused. Their type, var/mut capabilities, ownership, and scope rules remain ordinary. The prefix does not make declared fields private or skip initialization. See [explicit unused-name intent](lite://doc/unused-name-intent).

```text
(first, _, third, _) := tuple;
inspect(_);
```

The second `_` shadows the first, so this read selects the fourth component. Every binding keeps its own inferred type. Repeated names follow ordered shadowing inside patterns, including nested patterns; the rule applies to all names, not only underscores. See [pattern binding and shadowing](lite://doc/pattern-shadowing).

```text
loop items as _ {
    inspect(_, .count);
}
```

Here _ is the one optional item name and may be read. Loop count/index/value use metadata rather than extra receiver slots. _ = value is ordinary assignment requiring an existing var binding and compatible value, not discard syntax. Initializer effects and required-use obligations remain intact; see [underscore bindings and skips](lite://doc/wildcards-and-skips).

## Case and normalization

Selected (2026-11-24):

- **Case-sensitive:** `score` and `Score` are distinct identifiers. Case is stylistic, not semantic. Documentation convention uses UpperCamelCase for types and user-defined enum cases, and snake_case for bindings, functions, modules, and fields. Prelude Option cases `.Some`/`.None` follow enum-case capitalization; prelude Result cases `.ok`/`.err` are the selected fixed exception. Capitalization never selects a binding, test, case, or type. Existing examples may use other casing until normalized; no formatter casing rule is selected.
- **NFC identifier identity:** canonically equivalent Unicode spellings denote the same identifier after [Unicode Normalization Form C (NFC)](https://www.unicode.org/reports/tr15/). NFC normalization applies only to identifier identity (applied only when an identifier contains non-ASCII scalars); original source spelling is preserved in diagnostics, and string literal contents are never auto-normalized.
- **Confusables and Persian/Arabic variants:** visually similar characters — such as Persian `ی` (`U+06CC`) versus Arabic `ي` (`U+064A`), Persian `ک` (`U+06A9`) versus Arabic `ك` (`U+0643`), or Latin `e` (`U+0065`) versus Cyrillic `е` (`U+0435`) — remain distinct identifiers and are never silently merged. Instead, tooling and compiler diagnostics surface them via [UTS #39](https://www.unicode.org/reports/tr39/) mixed-script and same-scope confusable lints and codepoint-aware "did you mean?" hints.
- **ASCII fast-path design:** pure-ASCII sources and identifiers bypass Unicode range-table lookups, NFC normalization, C identifier mangling, and confusable checks so ASCII workloads pay near-zero overhead.

## Open decisions

- The selected `:/`, `:%`, `:/=` and `:%=` arithmetic symbols retain the user's compact/spaced equivalence requirement. Because the spellings begin with a colon, `a:/b` has exactly one reading, `a` followed by `:/` and `b`; the retired `a_/b` could read as `a_ / b` or `a _/ b`. There is no conflict with `a_` or `_` identifiers and no mandatory-space rule. See [the lexical boundary](lite://doc/arithmetic-methods-and-division-revision#compact-and-spaced-forms-must-agree).
- Specify reserved words and any identifier escaping syntax.
- Specify remaining diagnostic severities and configuration (underscore-prefixed unused-name permission is selected; unrelated shadowing, required-use, and UTS #39 confusable lint severities/configuration remain open).
- Implement the selected Unicode identifier design in the compiler and tooling across phases: Unicode 16.0.0 `XID_Start`/`XID_Continue` tables in lexing and `core/text`, target-safe C identifier mangling, non-ASCII-only NFC normalization, and UTS #39 confusable diagnostics.

## Related concepts and references

- [Lexical structure](lite://doc/lexical-structure)
- [Declarations and assignment](lite://doc/declarations-and-assignment)
- [Tuples and patterns](lite://doc/tuples-and-patterns)
- [Loop receivers](lite://doc/loop-receivers)
- [Tags and contexts](lite://doc/tags-and-contexts)
- [Unicode Standard Annex #31: Unicode Identifiers and Syntax](https://www.unicode.org/reports/tr31/)
- [Unicode Standard Annex #15: Unicode Normalization Forms](https://www.unicode.org/reports/tr15/)
- [Unicode Technical Standard #39: Unicode Security Mechanisms](https://www.unicode.org/reports/tr39/)
