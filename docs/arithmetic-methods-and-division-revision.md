# Arithmetic methods and division revision

Status: **additive arithmetic-method surface requested 2026-10-25; operand-directed division and replacement floor-operation symbols, including `_/` and `_%`, are proposals under review**. The currently selected contract remains fractional `/`, floor `//`, remainder `%`, and modulo `%%` until a revision is selected. No numeric API, overload mechanism, lexer change, or implementation is claimed here.

## Requested method surface

Provide explicit math operations as ordinary methods in addition to symbolic operators:

```text
a.plus(b)
a.div(b)
a.floorDiv(b)
```

These are the user's requested examples. A coherent candidate family is plus, minus, times, div, floorDiv, rem, and mod. Exact signatures, numeric type coverage, mixed operands, method lookup, and operator-to-method dispatch remain to be specified. This request does not introduce Kotlin-style infix calls; any future a floorDiv b form is a separate topic.

Named methods should expose the same numeric operation as their corresponding operator for established operand types: preserve its values, result type, evaluation count/order, and defined typed-panic behavior. Built-in arithmetic returns its result without implicitly replacing the receiver. Normal assignment/update permissions still govern any later write. A name alone must not imply another rounding rule or silently add conversion.

The selected division contract and the proposed revised one give div different integer behavior. Therefore the div/operator mapping must be finalized with the division decision, rather than documenting Int.div(Int) as truncating while still calling it an alias of the currently fractional Int / Int operator. The floorDiv name itself states floor rounding independently of the eventual symbol.

## Proposed operand-directed division

The user proposes restoring convenient truncating integer division and choosing another floor-division spelling. The recommended interpretation is based on already established operand types:

- Int divided by Int produces a truncating integer quotient.
- Division on admitted fractional operand types produces a fractional quotient.
- Floor division remains an explicitly distinct operation.

For illustration only, under that proposed revision:

```text
b: Int = -7;
c: Int = 2;

q: Int = b / c;          /* proposed: -3 */
same := b.div(c);        /* proposed: -3 */
floor := b.floorDiv(c);  /* proposed: -4 */
remainder := b.rem(c);   /* proposed: -1 */
modulo := b.mod(c);      /* proposed: 1 */
```

The initialized operands make the intended signed cases visible. The examples are proposals, not executable LiteScript verification or permission to infer omitted numeric contracts.

### Destination types check the result

For b and c already established as Int, recommend that b / c keep the same operation in an inferred binding, a typed binding, a return, or a call argument. Changing the destination annotation must not by itself switch an already established integer calculation to fractional division:

```text
q := b / c;        /* proposed Int calculation */
q: Int = b / c;    /* same proposed Int calculation */
f: Float = b / c;  /* same Int calculation; assignment conversion is separate */
```

The last line must either satisfy an independently selected numeric conversion rule or be rejected. Its Float destination alone must not manufacture the fractional quotient -3.5. To request fractional division, establish suitable fractional operand types or use a future explicitly specified conversion/API. No concrete conversion-method spelling is selected here.

This recommendation applies to operands whose types are already fixed. It does not prohibit expected-type inference for unresolved literals or type parameters; those general rules remain open. Mixed numeric operands, promotions, fractional representations, and explicit narrowing still need independent contracts.

### Pair the two integer quotients correctly

Under the revised proposal, truncating integer / pairs with remainder %, while floor division pairs with floor modulo. The previously selected remainder/modulo sign rules would stay unchanged: a nonzero remainder follows the dividend and a nonzero modulo follows the divisor. The current selected floor symbols are // and %%; the user's new family candidate is _/ and _% respectively.

The existing [signed table](signed-division-table.md) records the currently selected LiteScript operators, not this proposed change. If operand-directed / and a new floor symbol are accepted, migrate the normative docs, grammar, samples, update operators, and LiteScript table rows together. Keep the foreign-language rows and captured observations intact.

## Floor-operation symbol candidates

### Underscore floor family

The user's new composition uses underscore as a common floor marker:

```text
b: Int = -7;
c: Int = 2;

q := b / c;    /* proposed truncating Int division: -3 */
r := b % c;    /* remainder: -1 */
f := b _/ c;   /* proposed floor division: -4 */
m := b _% c;   /* proposed floor modulo: 1 */
```

The family is visually regular: / and % form the truncating pair, while _/ and _% form the floor pair. The floor pair would preserve a == b * (a _/ b) + (a _% b), mathematically. Candidate method mappings are div, rem, floorDiv, and mod. These examples do not adopt the symbols, destination-directed rounding, a numeric API, or new result/fault contracts.

### Identifier boundary tradeoff

Underscore is already admitted in ordinary identifiers, and standalone _ is a readable name. Under normal longest-identifier scanning, the compact forms would have a different tokenization from the spaced operator forms:

```text
a _/ b;  /* candidate tokens: a, _/, b */
a_/b;    /* ordinary identifier tokens: a_, /, b */

a _% b;  /* candidate tokens: a, _%, b */
a_%b;    /* ordinary identifier tokens: a_, %, b */
```

The candidate therefore needs an ordinary token boundary before its underscore after an identifier. Spaces provide that boundary; another admitted delimiter may also do so. This is analogous to separating a and b instead of writing aandb: whitespace separates different tokens, rather than changing the meaning of an already recognized operator. It is not the proposed spacing-dependent switch between an arithmetic token and a line comment.

Preserve a_ as an identifier and _ as an ordinary readable binding. Do not split an existing identifier retroactively because an operator might fit, use type/lookup success to choose the tokenization, or reserve underscore globally for math. A declared _ / b and an adjacent _/b would likewise need distinct lexical treatment if the candidate is adopted; no prefix floor operator or implicit left operand follows.

This is a practical cost of the family: a _/ b cannot uniformly compact to a_/b while preserving its tokens. The exact lexical boundaries, compact spelling, _/= and _%= updates, precedence integration, and numeric coverage must be decided before selection. See [identifiers](identifiers.md) and [lexical structure](lexical-structure.md).

### Earlier tilde candidate

ASCII `~/` remains the earlier candidate replacement for `//`:

```text
q: Int = b ~/ c; /* proposed floor result: -4 */
```

Use ASCII tilde U+007E in this candidate. The visually similar small tilde in b˜/c is U+02DC and is not silently an alias. Any Unicode operator aliases would need an explicit lexical decision.

The candidate avoids the widespread // line-comment association, but carries another reference-language difference: [Dart's ~/](https://api.dart.dev/dart-core/num/operator_truncate_divide.html) truncates toward zero rather than flooring. Reusing its spelling for floor division is possible, but must be a deliberate LiteScript choice. `a.floorDiv(b)` expresses the rounding unambiguously while the symbolic choice remains under review. The candidate's precedence, tokenization, and ~/= update are not selected by this proposal.

The current // and %% spellings remain selected until replacements are accepted. Ordinary named methods can coexist with whichever symbols are eventually chosen; they are additional access to numeric operations, not a reason to remove operator syntax.

## Future line comments and spacing

The user raises a future spacing-dependent // line comment. This remains a proposal and does not change current block/raw comment syntax or the current // division token.

Recommend an unambiguous lexical distinction if // is ever reclaimed for comments. With a spacing-dependent interpretation, inserting ordinary spaces could turn a division into a comment and change or remove executable code. That would revise the current guarantees that spacing does not choose arithmetic meaning and comments are neutral parser trivia. Reserving // consistently for one role would avoid that specific ambiguity, but neither line comments nor a replacement floor symbol are adopted here.

Any future comment decision must specify exact opener recognition, end-of-line behavior, token separation, and compatibility with existing source. It requires a dedicated language decision rather than an implied formatter convention. See [comments](comments.md) and [lexical structure](lexical-structure.md).

## Operator and method implementation boundaries

Ordinary method calls evaluate the receiver, then supplied arguments in source order, under the existing [evaluation contract](evaluation-order.md). Built-in numeric methods may lower directly to the same arithmetic operation as their operator forms; method spelling need not force a runtime function call. This is an implementation direction, not a fixed instruction-count guarantee or a completed custom-overload design.

The identity leading + remains presentation punctuation at its selected entry boundaries. It adds no actual numeric operation or plus/unaryPlus method invocation and must not acquire a synthetic zero argument through this proposal. Actual binary addition and its plus method are separate from that redundancy.

Power method names and domains, assignment-method names, operator declaration syntax, extension-method resolution, generic specialization, and future user-defined infix syntax remain open. Preserve the already selected explicit grouping restriction for signed power bases; this proposal changes none of those cases.

## Primary comparisons

- [Kotlin operator overloading](https://kotlinlang.org/docs/operator-overloading.html) maps binary +, -, *, /, and % to plus, minus, times, div, and rem. Kotlin distinguishes these actual operations from unary operator methods; LiteScript's identity entry prefix keeps its own contract.
- [Kotlin numbers](https://kotlinlang.org/docs/numbers.html#integer-division) provides integer division based on numeric operands and requires a fractional operand for a fractional quotient. Its conversion, overflow, and inference rules are not adopted automatically.
- [Kotlin floorDiv](https://kotlinlang.org/api/core/kotlin-stdlib/kotlin/floor-div.html) and [mod](https://kotlinlang.org/api/core/kotlin-stdlib/kotlin/mod.html) supply named floor operations in addition to ordinary division/remainder.
- [Dart operators](https://dart.dev/language/operators) use / for fractional division, and the [~/ API contract](https://api.dart.dev/dart-core/num/operator_truncate_divide.html) specifies truncating division. That spelling must not be described as an existing floor-division convention.

## Related documents

- [Current division, remainder, and modulo](division.md)
- [Operators](operators.md)
- [Numbers and ranges](numbers.md)
- [Signed reference table](signed-division-table.md)
- [Decision ledger](decisions-and-open-questions.md)
