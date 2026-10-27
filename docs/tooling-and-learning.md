# Tooling and learning

Status: **official formatter required; compact/multiline presentation, unchanged malformed files, idempotence, verification before writing, and read-only --check mode selected 2026-10-25; broader toolchain and teaching approach proposed**.

## Purpose

Students should spend their early effort understanding programs rather than choosing build tools or interpreting parser jargon.

## Formatter

```text
lite fmt
```

An official formatter is an established requirement. The command lite fmt and its read-only --check mode are selected; remaining argument syntax and file/configuration discovery rules remain open. It should choose one presentation and preserve meaning.

The formatter must not infer missing semicolons from line breaks, change final-expression results by adding separators, or modify literal string data. Repeated separators may be normalized because their count has no semantic role.

Its selected presentation omits optional semicolons after complete block/record items at every nesting depth, including function/lambda definitions and declarations with braced initializers. Keep necessary ordinary-item separators and enclosing call/list/tuple punctuation. Recognize complete syntax rather than deleting every semicolon after a brace character; import-list braces and proposed special delimiters have different roles. See the [semicolon style rule](lexical-structure.md#semicolon-style-after-closing-braces). This is a formatter requirement, not an implemented tool claim.

### Compact and multiline chains

Selected 2026-10-25: for chains with at least two real entries, the formatter omits the optional leader in a compact layout and includes a separator before every entry in a multiline layout. This applies to Boolean expressions/conditions, initial/nested pattern alternatives, and plain unions. It may add or remove the first separator as it expands or compacts a chain; source validity remains independent of this presentation choice.

Use the outer chain's operator under existing grouping: multiline a and b or c uses leading or and still means (a and b) or c. Pattern alternatives use or and union members use |. Only admitted complete-chain/group boundaries can receive a leader; an interior operator is not another prefix position. Surrounding multiline bodies or multiline content inside one entry do not alone trigger an outer leader. A singleton receives no automatic leader; explicit-singleton normalization, exact wrap width, and comment-aware line breaking remain open.

Preserve grouping, Bool requirements, evaluation/effects, binding flow, matching/guard behavior, type identity, comments, and required delimiters. Existing syntactic alternatives remain legal; malformed/type-invalid inputs must not be silently repaired by removing punctuation. See the [formatter presentation rule](leading-separators.md#formatter-presentation-selected) for examples and remaining boundaries. No formatter implementation is claimed.

## Comment neutrality and formatting selected

Comments are neutral to code parsing, so a commented-out entry does not count toward a chain's arity or choose its operator. Ali's ready := /* and authenticated */ and connected; remains a valid singleton initializer, as does the form with the comment deleted. This establishes source validity; it does not automatically pin the initializer to a vertical formatter layout.

Selected 2026-10-25: preserve ordinary/raw comment contents as opaque text and retain their attachment to the same nearby code. Indentation at a comment's source position and surrounding line breaks may change; do not parse or reflow the body as code or prose. Only real operands/patterns/members count when formatting chains. An apparent disabled condition is neither a phantom entry nor an implicit keep-multiline directive. See the [selected comment-formatting contract](comments.md#selected-formatting-contract).

The [formatter comparison](comment-formatting-research.md) covers Deno, Bun, Rustfmt, Dart/Flutter, and Prettier. Its versioned local probes and documentation findings remain comparison evidence, not an adoption of another tool's directives. Exact attachment/line-placement algorithms, explicit-singleton normalization, documentation-comment syntax, and any future formatting escape mechanism remain open. No LiteScript formatter implementation is claimed.

## Formatter stability and idempotence

Selected 2026-10-25: after a successful format, formatting the output again with the same formatter version and effective configuration must succeed and produce byte-for-byte identical source:

```text
fmt(fmt(source)) == fmt(source)
```

This is an equation describing the tool's output, not new LiteScript source syntax. Hold the formatter version and effective settings fixed for both passes. Changing the formatter version or settings may choose a different stable presentation; this rule does not freeze formatting across upgrades or configuration changes.

Leading separators, compact/multiline choices, indentation, line wrapping, comment placement/attachment, ordinary item separators, and final whitespace must not oscillate between layouts on successive passes. Preserve opaque comment contents and the other selected meaning-preservation contracts. Exact width, singleton-leader normalization, and attachment algorithms remain open, but their eventual rules must satisfy this requirement.

Idempotence is a required formatter conformance check: for each successful-format fixture, capture the first output, format it again under the same version/settings, require both passes to succeed, and compare the complete outputs. Cover compact/multiline and mixed chains, grouped/nested expressions, pattern alternatives/shared guards, plain unions, singletons, ordinary/raw comments, and semicolon boundaries. A failed or skipped second pass is not evidence of idempotence. This does not require full type checking before formatting; it is distinct from the separately selected --check mode, which compares source against verified formatted output without requiring an extra runtime formatting pass.

Malformed input retains the separate unchanged-file/failure contract below; it is not a successful formatting fixture. This selects a future conformance requirement, not an implemented formatter, an executed LiteScript check, or proof that all inputs satisfy it.

## Verification before writing

Selected 2026-10-25: generate a file's proposed formatted output in memory, parse it again, and verify it against the original before writing the file or applying formatter edits to an editor buffer. Successful output parsing alone is not the complete check; require preservation of executable structure, source-imposed typing requirements, and the separate comment contract.

The verifier may account only for explicitly approved formatting differences, such as optional leading separators at admitted boundaries and redundant separators under their selected rules. Preserve grouping, item/body boundaries and tail results, operation order, binding scopes, and declared constraints. Do not erase a typing requirement during normalization: ready := and connected; requires Bool even for one operand, so dropping its leader cannot be accepted merely because an unprefixed connected parses as an expression. This does not select singleton-leader removal or a type-check-dependent formatter rewrite.

Check ordinary/raw comment contents and attachment to the same nearby code separately from executable structure. Parsing that structure without comments cannot establish preservation of opaque comment text or attachment. Permit the selected indentation/surrounding line-break changes while rejecting dropped or changed comment contents and attachment to unrelated code. The verifier must not parse a comment body as code to perform this check.

Write/apply the proposed output only after verification succeeds. If the generated output cannot parse, its checked structure or requirements differ, comment checks fail, or equivalence cannot be established, discard that proposed output and leave the entire affected file/buffer unchanged. Report a formatter-verification error rather than presenting a generated-output defect as an error in the user's original source. Continue processing other valid requested files, but return overall failure if any file fails verification; exact numeric exit codes remain open. This uses the same per-file preservation scope as malformed input, without rolling back other successfully formatted files.

No full compilation, name resolution, type checking, or execution is required by this check. The comparison must retain syntactically imposed constraints even when symbol types are unavailable. Exact comparison normal forms, attachment identity, approved-normalization implementation, diagnostic rendering, and write/editor protocols remain open. Do not claim a successful verification when the implementation cannot establish the required preservation.

Future formatter conformance must cover accepted approved rewrites and rejected generated-output changes, including lost singleton Bool requirements, regrouped/reordered operations, changed binding/item boundaries, and dropped/altered/reassociated comments. The separately selected idempotence check remains required as well. This is a formatter contract and future verification requirement, not an implemented checker or an executed LiteScript conformance result.

## Incomplete or malformed source

Selected 2026-10-25: when a file has a lexical or syntax error, lite fmt reports the problem and leaves that entire file unchanged. It does not partially rewrite valid-looking regions, drop unfinished tokens, or invent missing operands. This preserves unfinished work during ordinary editing.

Ali may temporarily have:

```text
ready :=
    and connected
    and
;
```

The formatter leaves the file as supplied and reports a focused diagnostic at the dangling operator/missing operand:

```text
Expected an operand after 'and'.
```

For a request containing several files, continue formatting the other valid files. At completion, report an overall failure status if any requested file failed to parse, even when other files were formatted successfully. Exact numeric exit codes remain open. This is per-file preservation, not an all-files rollback.

Format-on-save follows the same rule: apply no formatter text edits to an invalid buffer and surface its diagnostic. Normal editing/saving remains an editor operation; this formatter rule does not discard or repair the user's unfinished buffer.

This contract covers incomplete/malformed lexical syntax, including missing operands/braces or unterminated comments. It does not require full compilation, name resolution, or type checking before formatting syntactically valid source. The existing obligation to preserve meaning and not silently repair type-invalid code through punctuation changes remains. Diagnostic rendering, parser recovery internals, and precise editor protocol remain open; no formatter implementation is claimed.

## Read-only check mode for CI

Selected 2026-10-25:

```text
lite fmt --check
```

Check mode writes no files and applies no editor-buffer edits. It generates the same proposed output as normal formatting, in memory, using the same formatter version, effective configuration, presentation rules, parsing, and preservation verification. It does not substitute a weaker whitespace-only check or skip the separate comment/typing-requirement checks.

For each requested source file, compare the original bytes with the successfully verified formatted bytes. A matching file passes. A difference is reported as requiring formatting, identifying the affected file, while leaving it unchanged. Malformed source produces its source diagnostic; failed or unestablished output verification produces a formatter-verification error. Both failure kinds identify the affected file and preserve it.

Continue checking other requested valid files. Report overall success only when every requested file parses, verifies, and already matches the formatted output. Report overall failure if any file would change, cannot parse, or fails verification. Ordinary formatting may still rewrite other successfully verified files; --check never writes any files. This lets local formatting and CI enforcement share the same decisions and configuration.

The existing future two-pass idempotence conformance requirement remains independent; --check does not require a second format pass on every invocation. It adds no full-compilation or name/type-check prerequisite. Exact numeric exit codes, diagnostic/diff presentation, file/configuration discovery, and empty-selection behavior remain open. This is a selected command contract, not an implemented CLI or an executed CI result.

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

Begin with literals, inferred bindings, calls, braces, separators, conditions, and simple loops. Then introduce binding reassignment through var, held-data updates through mut, functions, annotations, tuple patterns, optional values, explicit errors, loop values, tags, and packaging as needed. Teach the two permissions separately before combining them in inferred var mut user := expression; neither requires a type annotation. When annotations are introduced, teach user: mut User and var user: mut User as the canonical typed forms, keeping var with the binding and mut with its access-qualified type.

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

## Capture and recovery presentation

The selected [capture/extraction reference](failure-capture-and-unwrapping.md) distinguishes exp? (capture before operand evaluation), outcome! (one-layer extraction or outward forwarding), and else (ordered consumption and recovery). Teach ordinary stored Results before mixed panic capture, then show T ! Panic and T ! (E | Panic), ...fails: Failure with [Failure], and exhaustive recovery yielding T. Do not teach the provisional Captured/FailureGroup wrapper as source syntax. Keep handler-local tags on their explicit block, and untangle confusing chains into temporary outcome layers without promising retroactive panic recovery across eager statements. Exact raise grammar and partial-handler exit policy remain draft LP-0011.

Future formatter/parser fixtures must distinguish postfix capture from the standalone ? storage initializer and the rejected ? propagation spelling, retain grouping in `({ work() })?`, and preserve written else order and block-tag targets. Existing semicolon rules apply: omit optional semicolons after complete braced items; retain separators for continued expressions such as parenthesized block capture. This is a documentation contract, not evidence of implemented parsing, formatting, or execution.
