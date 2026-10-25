# Tooling and learning

Status: **official formatter required; compact/multiline leading-separator presentation selected 2026-10-25; broader toolchain and teaching approach proposed**.

## Purpose

Students should spend their early effort understanding programs rather than choosing build tools or interpreting parser jargon.

## Formatter

```text
lite fmt
```

An official formatter is an established requirement. Its exact argument syntax and file discovery rules remain open. It should choose one presentation and preserve meaning.

The formatter must not infer missing semicolons from line breaks, change final-expression results by adding separators, or modify literal string data. Repeated separators may be normalized because their count has no semantic role.

Its selected presentation omits optional semicolons after complete block/record items at every nesting depth, including function/lambda definitions and declarations with braced initializers. Keep necessary ordinary-item separators and enclosing call/list/tuple punctuation. Recognize complete syntax rather than deleting every semicolon after a brace character; import-list braces and proposed special delimiters have different roles. See the [semicolon style rule](lexical-structure.md#semicolon-style-after-closing-braces). This is a formatter requirement, not an implemented tool claim.

### Compact and multiline chains

Selected 2026-10-25: for chains with at least two real entries, the formatter omits the optional leader in a compact layout and includes a separator before every entry in a multiline layout. This applies to Boolean expressions/conditions, initial/nested pattern alternatives, and plain unions. It may add or remove the first separator as it expands or compacts a chain; source validity remains independent of this presentation choice.

Use the outer chain's operator under existing grouping: multiline a and b or c uses leading or and still means (a and b) or c. Pattern alternatives use or and union members use |. Only admitted complete-chain/group boundaries can receive a leader; an interior operator is not another prefix position. Surrounding multiline bodies or multiline content inside one entry do not alone trigger an outer leader. A singleton receives no automatic leader; explicit-singleton normalization, exact wrap width, and comment-aware line breaking remain open.

Preserve grouping, Bool requirements, evaluation/effects, binding flow, matching/guard behavior, type identity, comments, and required delimiters. Existing syntactic alternatives remain legal; malformed/type-invalid inputs must not be silently repaired by removing punctuation. See the [formatter presentation rule](leading-separators.md#formatter-presentation-selected) for examples and remaining boundaries. No formatter implementation is claimed.

## Comment neutrality and layout investigation

Comments are neutral to code parsing, so a commented-out entry does not count toward a chain's arity or choose its operator. Ali's ready := /* and authenticated */ and connected; remains a valid singleton initializer, as does the form with the comment deleted. This establishes source validity; it does not automatically pin the initializer to a vertical formatter layout.

The [current formatter comparison](comment-formatting-research.md) covers Deno, Bun, Rustfmt, Dart/Flutter, and Prettier. It includes versioned local Deno/Rustfmt probes and separately labels documentation-only findings for tools unavailable locally. Other tools retain comments as layout/attachment information and may recognize explicit control directives. Their behavior is comparison material, not a selected LiteScript directive or comment-pinning rule. Preserve comments; leave exact comment placement, singleton normalization, and any explicit formatting escapes open.

## Run and build proposals

```text
lite run lesson.lite
lite build lesson.lite
```

One command should run a file without requiring a package manifest. Native compilation/caching is a proposal, not an implemented path.

## Diagnostics

Prefer a concrete cause and action:

```text
Assignment cannot be used as a condition.
Use '==' to compare values.
```

```text
This binding is immutable.
Declare it with 'var' if reassignment is intended.
```

```text
The current conditional context has no field 'count'.
Use an explicitly named loop context such as '@users.count'.
```

Diagnostics should point to declaration and use sites when relevant. Recovery should avoid reporting a long chain of unrelated errors after one missing brace or separator.

## Explicit unused-name intent

Names such as _user and _left are ordinary readable names that opt out of unused-name warnings for that binding, parameter, receiver, or declared field. Later use is legal too; the convention means unused is allowed, not that use is prohibited. `_` alone is included: it binds normally, may be read, and permits nonuse. Repeated names within a pattern shadow in order, including repeated underscores. This naming intent does not suppress required-use/error-handling checks or unrelated diagnostics. Full warning severities and configuration remain open; see [explicitly allowed unused names](unused-name-intent.md).

## Gradual learning

Begin with literals, inferred bindings, calls, braces, separators, conditions, and simple loops. Then introduce binding reassignment through var, held-data updates through mut, functions, annotations, tuple patterns, optional values, explicit errors, accumulators, tags, and packaging as needed. Teach the two permissions separately before combining them in inferred var mut user := expression; neither requires a type annotation. When annotations are introduced, teach user: mut User and var user: mut User as the canonical typed forms, keeping var with the binding and mut with its access-qualified type.

There should be one language rather than different semantics for a beginner mode. Full type and ownership contracts still need to work for advanced users.

Creating, passing, and traversing collections should precede vocabulary such as Iterable and Collection. The [collection-inference proposal](collection-inference.md) explores contextual element construction and omitted parameter annotations for simple functions, while [the reference review](collection-ergonomics-comparison.md) distinguishes these mechanisms from explicit generic declarations. Tooling should explain the required operation and element type before presenting advanced protocol details.

Indexed scripts should be equally direct: values[index] can establish the required operation for an inferred parameter, and local else recovery can avoid an escaping-error annotation. Report an unsupported argument as "This value does not support positional indexing" before explaining an advanced interface name. Inference must not hide materialization or caller mutation, or silently add undeclared escaping errors. See [inferred indexing](collection-inference.md#inferred-indexing-for-small-scripts).

The [access-ergonomics goal](slot-ergonomics.md) keeps mathematical summaries inferred. Teach var as storage replacement: local var creates a reassignable binding, while type-side var receives writable caller storage through an explicit var call grant. Mut separately permits data updates through an explicit mut grant. Local-only rebinding belongs inside the body rather than in public function headers. Describe rejected writes in terms of the actual field and replacement types; advanced summaries need not become mandatory beginner annotations.

## Explicit names versus editor convenience

The language should not silently inject `it`, `count`, or `acc`. An editor may suggest explicit receiver bindings or generate a snippet, leaving names visible and editable in source.

## Beginner validation

Braces were chosen as a promising consistent rule, not as an empirically proven universal advantage over keywords. Future usability work should compare tracing execution, identifying branch ownership, repairing delimiters, and interpreting type errors. Small tasks can reveal problems before freezing the grammar.

## Related concepts and references

- [Lexical structure](lexical-structure.md)
- [Loop receivers](loop-receivers.md)
- [2013 syntax experiments](https://www.vidarholen.net/~vidar/An_Empirical_Investigation_into_Programming_Language_Syntax.pdf)
- [2023 syntax-intuitiveness replication](https://link.springer.com/article/10.1007/s11219-023-09631-7)

These studies motivate evaluating novice experience; they do not isolate LiteScript's brace syntax as already validated.
