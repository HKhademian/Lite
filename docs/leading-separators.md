# Optional leading separators

Status: **selected 2026-10-24 for conditional and/or chains, ordinary Boolean expressions including unparenthesized initializers and Boolean loop sources, initial/nested pattern alternatives with leading or, and plain-union type expressions; additive-chain leading plus selected 2026-10-25; compact/multiline formatter presentation selected 2026-10-25; intersection-type semantics and complete recursive parsing remain open**. This is a documentation-level language decision, not an implemented parser or formatter claim.

## Purpose

Let every entry in a chain have the same visual shape, including the first. A leading separator makes lines easy to add, remove, reorder, and align without giving the first entry special punctuation. This redundancy is optional; compact forms remain equally valid.

## Conditions

```text
if
    and connected
    and authenticated
    and permitted
{
    proceed()
}

if
    or cached
    or available_locally
    or downloadable
{
    load()
}
```

Assume existing Bool flags and Unit-producing handlers. At the start of a complete condition, permit one optional leading `and` or `or`. Removing that token produces exactly the same condition:

```text
if and a and b { act() }
if a and b { act() }

if or a or b { act() }
if a or b { act() }
```

Each pair is equivalent. A single real operand is sufficient: `if and ready` and `if or ready` both test `ready`. The leading token is punctuation in this position, not a unary operator or an implicit true/false operand. It introduces no evaluation, binding, alternative, or result value.

This applies to `if` and `else if` conditions and to subject-based match-arm guards after their `if` separator, which already reuse the same condition grammar. It also applies at the start of an explicitly parenthesized condition group:

```text
if
    and connected
    and (
        or administrator
        or owner
    )
{
    proceed()
}
```

Each condition/group has its own optional leading token. Parentheses establish a nested group; an already established complete expression or condition boundary needs no extra parentheses. The rule also applies to ordinary Boolean expressions, including loop sources and subjectless match Boolean headers, as described below. Initial match-arm and nested pattern alternatives separately permit one leading `or` under their pattern grammar. An ungrouped interior logical operand cannot start another leading-separator sequence.

### Precedence and effects

After removing the optional leading token at each selected boundary, parse and check the remaining condition normally. `and` still binds more tightly than `or`:

```text
if or a and b or c { act() }
if (a and b) or c { act() }
```

These conditions are equivalent. The leading token does not select a different grouping, require a homogeneous chain, or turn the rest of the condition into an all/any operation. Parenthesize the intended group when mixing operators.

Preserve left-to-right evaluation, short-circuiting, source evaluation counts, effects, failures/exits, ordered shadowing, and all existing successful/failed-path narrowing and binding joins. For example:

```text
if
    and .Some(user) := find_user(id)
    and user.active
{
    greet(user)
}
```

Assume `find_user` returns `Option<User>`, `User.active` is `Bool`, and `greet` returns `Unit`. Evaluate the source once when reached. The binding `user` exists for the active test and successful body only after matching succeeds, exactly as without the leading `and`. A leading `or` creates no empty alternative and contributes no `Unit` to alternative-local binding types. See [conditional pattern chains](condition-chains.md).

## Boolean values without extra parentheses

Selected 2026-10-24: wherever a complete ordinary Boolean expression begins, permit one optional leading `and` or `or`. Parentheses are optional when the surrounding grammar already establishes the expression's start and end:

```text
ready :=
    and connected
    and authenticated
    and permitted
;
```

This initializer infers `Bool` and means exactly `connected and authenticated and permitted`. It is evaluated once when the declaration executes; the stored value does not become a reevaluated condition. The semicolon ends the ordinary declaration item, even when placed on its own line. Neither that line break nor indentation is a delimiter. The one-line `ready := and connected and authenticated and permitted;` and the parenthesized initializer are equivalent.

The same expression rule applies to supplied assignment values, call arguments, return payloads, block tail expressions, and subjectless match Boolean headers. Existing delimiters and result/type contracts still apply. It introduces no condition-pattern binding into an ordinary value expression, loop source, or subjectless header. Prefix recognition is syntactic; a well-formed expression with a leading `and`/`or` must type-check as `Bool`, including a singleton. `flag := or cached;` is valid for a Bool `cached`; `flag := and "text";` is a type error rather than a String-valued initializer. Do not choose a different parse based on expected types or lookup.

### Ali removes the first condition

Confirmed 2026-10-25: a chain still accepts one real operand after an earlier entry is commented out or deleted. Ali starts with:

```text
ready :=
    and authenticated
    and connected
;
```

Then Ali temporarily disables the first entry:

```text
ready :=
    /* and authenticated */
    and connected
;
```

Deleting the comment leaves another valid spelling:

```text
ready :=
    and connected
;
```

Assume both flags are Bool. The last two snippets have exactly one real operand and compute connected with its ordinary evaluation/failure behavior. The comment contributes no operand, operator, implicit true value, binding, or separator. The remaining leading and is the one optional leader at the expression entry; it does not require a second operand. Reordering or restoring real entries retains ordinary written-order evaluation. Commenting out every operand still leaves an invalid empty expression.

Well-formed ordinary/raw comments are [lexical trivia](comments.md#neutrality-in-code-and-parsing): their bodies are not parsed as code or counted as chain entries. Comment removal here means replacement by token-separating whitespace, not concatenating neighboring tokens. The selected [comment-formatting contract](comments.md#selected-formatting-contract) preserves opaque contents and attachment while allowing surrounding layout changes; this comment alone does not pin the initializer vertically. Normalization of an explicitly written singleton leader remains open. See the [formatter comment investigation](comment-formatting-research.md).

### Boolean loop sources

```text
loop
    and running
    and remaining > 0
{
    process_next()
}
```

Assume `running` is Bool, `remaining` is Int, and `process_next` returns Unit and may update the state read by the source. This means exactly `loop running and remaining > 0 { process_next() }`. The loop keyword starts the source position and the body-opening brace ends the header; parentheses are not required. The source is checked before the first body entry and reevaluated before each subsequent entry. Each check preserves ordinary short-circuiting; the prefix adds no test or evaluation. See [loop source modes](loops.md#boolean-condition).

The leading token requires a Bool source; it does not coerce an iterable to Bool or introduce header pattern matching. Iterable sources retain their existing evaluation-once contract, and an omitted source still selects unconditional iteration. A bare leader without an operand is invalid, not an omitted source. This extension supersedes the earlier restriction of leading logical separators to if/guard conditions.

## Additive chains with leading plus

Selected 2026-10-25: a complete additive-chain entry may start with one optional `+`, including a singleton. Every contribution can use the same written shape:

```text
total :=
    + rent
    + groceries
    + transport
;
```

Assume compatible numeric inputs. Removing only the first `+` gives exactly the same additive expression: rent + groceries + transport. Its grouping, operand evaluation order, actual binary additions, effects/failures, and result contract remain unchanged. The prefix introduces no operation, overload invocation, implicit zero operand, conversion, or promotion. In particular, the rule does not lower the expression to 0 + rent + groceries + transport.

The singleton form `+ amount` has the same value and type as the admitted operand amount and evaluates that occurrence once. Ali can comment out an earlier contribution while leaving the next line intact:

```text
total :=
    /* + rent */
    + groceries
;
```

The comment contributes no operator or operand. Removing it still leaves the valid singleton + groceries. Commenting out all real operands remains invalid. No grouping parentheses are required around an already delimited initializer; a parenthesized additive expression can establish another complete chain entry. Whitespace/newlines do not choose the parse. Require a real operand and at most one redundant leading + per entry; no permission for stacked/interior extra leaders or trailing operators follows.

### Negation and other arithmetic operators

The identity that permits this redundancy is +A having the same value as A for an admitted additive operand. It does not justify removing a leading minus: -A retains its ordinary negation meaning and may differ from A. A minus before a later term likewise retains its actual subtraction/negation role; never erase it as presentation punctuation.

Leading `*` and `/` are not admitted as redundant chain separators. Do not infer a multiplication seed of 1, a reciprocal, or another unary operation. This selection adds no corresponding leading `:/`, `%`, or `:%` rule either. Existing binary arithmetic retains its contracts; separate uses of prefix operators would require their own language decisions.

This selects an identity prefix at complete additive-chain boundaries, not a general permission to ignore arithmetic operators. The examples do not select nonnumeric/custom-operator contracts, a numeric conversion policy, complete unary integration, or new ownership/copy behavior. Basic arithmetic precedence and binary left association were subsequently selected in [operators](operators.md#basic-arithmetic-grouping-selected); power spelling and the explicit unary-minus grouping restriction are selected separately in [power and negation](power-and-negation.md); remaining power contracts stay open. See [operators](operators.md#optional-leading-plus-selected) and [evaluation order](evaluation-order.md#operator-operands).

## Pattern alternatives with one shared body

Selected 2026-10-24: a complete initial subject-based match-arm pattern list may start with one optional `or`. Every entry is a complete pattern, with its own payload bindings when applicable. The body-opening brace follows the whole list, or its optional shared `if` guard:

```text
match contact {
    or .Email(address)
    or .Sms(address)
    or .Unavailable
    {
        deliver_optional(address)
    }
}
```

Assume Contact has exactly Email(String), Sms(PhoneNumber), and payload-free Unavailable cases, and the handler accepts String | PhoneNumber | Unit and returns Unit. These three alternatives form one arm with one body. Removing the first `or` produces exactly the same arm; line breaks and indentation do not create separate arms. A singleton `or .Email(address) { body }` is also allowed when the complete match handles its other cases as required.

Evaluate the subject once, try the real patterns in written order, and stop at the first successful pattern. Bindings belong to that alternative and retain their existing inferred types and ordered shadowing. The shared continuation joins the real alternatives' final binding-name sets: here `address` is String | PhoneNumber | Unit because the real Unavailable pattern supplies no address. The leading `or` contributes no additional alternative, binding, Unit, result, or test. A shared name present in every real alternative gains no Unit merely from this punctuation. Different names retain their existing payload-or-Unit joins; outer values never fill omissions. See [binding inference](pattern-binding-inference.md#alternative-arm-binding-types-selected).

### Shared guards

```text
match contact {
    or .Email(address)
    or .Sms(address)
    if
        and permitted(address)
        and ready
    {
        deliver(address)
    }
    _ {}
}
```

Assume permitted accepts String | PhoneNumber and returns Bool, ready is Bool, and deliver accepts that union and returns Unit. The pattern list and guard each have their own optional leader. The `if` separates them syntactically. Run the shared guard once after the first successful initial pattern. If the complete guard fails, move to the next arm; do not retry the earlier arm's remaining initial alternatives. Effects and failures retain ordinary behavior, and exhaustiveness/result checking are unchanged. See [shared-guard selection](match.md#alternative-selection-before-a-shared-guard-selected).

### Nested alternatives

The same single leading `or` is allowed at the start of an already supported constructor-payload or tuple-component alternative list:

```text
match maybe_contact {
    .Some(
        or .Email(address)
        or .Sms(address)
    ) {
        deliver(address)
    }
    _ {}
}
```

Assume Option<Contact> and the same payload/handler types above. This means `.Some(.Email(address) or .Sms(address))`, without another Option layer or an empty alternative. A tuple component may likewise use `(or .Email(address) or .Sms(address), received_at)`: the comma ends the first component's list and `received_at` remains the next component. Each local list has its own optional leader and requires a real pattern. Successful candidate bindings escape the enclosing pattern only after the whole pattern succeeds. Preserve local first-success/no-backtracking, pre-pattern free-name lookup, known binding relationships, and ownership obligations.

These nested forms also work inside already supported conditional patterns. The condition prefix and pattern-list prefix must not stack at the same boundary: `if or or .Some(value) := source` remains invalid. This does not add `and`/`not` subpatterns, new pattern-bearing loop/lambda headers, refutable ordinary declarations, or arbitrary new record-pattern schemas. Full recursive parsing remains open. This selection supersedes the earlier exclusion of leading `or` from initial/nested pattern alternatives.

## Plain-union types

In an established type-expression context, a plain-union chain permits one optional leading `|`:

```text
Value := type
    | String
    | Int
    | Float;

Compact := type String | Int | Float;
Grouped := type (| String | Int) | Float;
Single := type | String;
```

`Value`, `Compact`, and `Grouped` denote the same type. `Single` denotes `String`. The `type` keyword establishes the alias's type context; an annotation or explicit type grouping can likewise supply type context. This is not a new alias spelling or a value-expression operator.

The leading `|` introduces no empty member, `Unit`, bottom type, or fresh nominal identity. Plain-union normalization and existing precedence with fallible type `!` are unchanged. Each union chain, including a grouped chain or a union operand of a fallible type, has its own optional leading `|`. For example, `Outcome := type (| String | Int) ! (| ReadError | ParseError);` has the same type as the form without those two leaders. See [type aliases](type-aliases.md), [union normalization](union-normalization.md), and [fallible type grouping](fallible-types-and-error-composition.md#grouping).

The same presentation is intended for a leading `&` if intersection types are selected. This decision does not establish public intersection syntax, its semantics, or its precedence. Illustrative simultaneous-failure aggregates using `A & B` do not establish intersection types or gain a leading `&` through this rule.

## Boundaries and rejected forms

- Require at least one real Boolean/condition or additive operand, pattern, or union member. A leading separator alone does not form an expression, condition, loop source, pattern list, or type.
- Permit at most one leading separator at each admitted boundary. Do not stack leading `and`/`or` tokens or repeat redundant leading `+`/`|` tokens.
- Retain every interior separator and operand. A trailing separator is not selected.
- Whitespace, indentation, comments, and line breaks do not create or change these boundaries. The same forms work on one line or many.

```text
/* Invalid: no real operand/member. */
if and { act() }
if or { act() }
Empty := type |;
ready := and;
loop or { act() }

/* Invalid: stacked or interior leading separators. */
if and and ready { act() }
if or and ready { act() }
if a and or b { act() }
if a or and b { act() }
ready := a and or b;
ready := not and a;
Invalid := type | | String;
InvalidInterior := type String | | Int;

/* Invalid: missing final operand/member. */
if a and { act() }
InvalidTail := type String |;
```

Ordinary item and list separators retain their own contracts. A leading `|` is unrelated to duplicate type-member normalization, repeated semicolons, or optional boundary commas in call inputs. No general permission to repeat arbitrary punctuation follows.

At an arm's initial-pattern boundary, `or { body }`, `or or .Email(address) { body }`, `.Email(address) or or .Sms(address) { body }`, and `or .Email(address) or { body }` are invalid: a real initial pattern or the pattern after a separator is missing. Apply the same nonempty/no-stacked/no-trailing rule to nested pattern lists. An interior separator never opens another prefix position by itself.

## Grammar and tooling

The [condition grammar](grammar-sketch.md#conditionals) and [Boolean expression fragment](grammar-sketch.md#logical-grouping) put the optional logical leader at each complete expression/condition entry, outside the precedence ladder. They do not independently prefix the first operand again. The [additive fragment](grammar-sketch.md#basic-arithmetic-grouping-and-leading-plus) permits one identity + at a complete nonempty additive-chain entry. The [pattern fragment](grammar-sketch.md#match) places one optional `or` on each complete nonempty initial/component alternative list; its individual patterns do not independently admit another bare leader at that same boundary. The [type fragment](grammar-sketch.md#optional-leading-union-separator-selected) places `|` on a nonempty union chain. This prevents accidental admission of stacked/interior extra leaders. Special pattern-source and comparison-pattern operand grammars retain their existing boundaries; use explicit grouping when those grammars reserve ungrouped top-level logical operators as separators.

### Formatter presentation selected

Selected 2026-10-25: the official formatter uses compact chains without a leading separator and multiline chains with a separator before every entry, including the first. This policy applies to chains with at least two real entries: Boolean expressions/conditions, initial/nested pattern alternatives, and plain unions. Both source spellings remain legal independently of formatter presentation.

For a compact layout:

```text
ready := connected and authenticated;
Value := type String | Int;
```

For a multiline layout:

```text
ready :=
    and connected
    and authenticated
    and permitted
;

Value := type
    | String
    | Int
    | Float;
```

The formatter may add the optional leader when expanding a chain and remove it when compacting that same multi-entry chain. It aligns the repeated entries consistently. The policy follows the chosen output layout; exact width and comment-aware line-breaking rules remain open. A multiline surrounding body or a multiline expression inside one entry does not by itself make the containing chain multiline.

For a mixed logical expression, use the operator of the outer chain according to the existing grouping. Thus a multiline rendering of `a and b or c` uses `or`:

```text
ready :=
    or a and b
    or c
;
```

This preserves `(a and b) or c`. Explicitly grouped inner chains can be formatted independently. An interior operator is not a new prefix boundary; wrapping must never synthesize stacked/interior extra leaders, change precedence, or require a different parse. Pattern lists use `or` and union lists use `|`; one shared arm body and an optional shared guard retain their boundaries. Unsupported leading `&` and logical and/not subpatterns are not formatter options.

Do not automatically insert a leader for a singleton or invent a choice between `and` and `or` when no binary chain establishes it. The existing singleton spellings remain valid; normalization of an explicitly written singleton leader remains open. Preserve the Bool requirement of prefixed value expressions and ordinary type errors rather than silently repairing an invalid program through punctuation removal. No empty operand, pattern, member, or Unit contribution is introduced.

These transformations preserve evaluation order, short-circuiting, effects/failures, binding joins/narrowing, pattern first-success/no-retry behavior, and type identity. Preserve comments, literal data, required ordinary item/list separators, and the selected omission of unnecessary semicolons after completed block items. Line layout remains a formatter choice with no grammatical meaning. This selects a formatter requirement, not an implemented tool or a change to source validity; the earlier preservation-versus-normalization question is superseded for multi-entry chains.

Diagnostics should identify the missing operand or extra separator at the relevant token. Under the selected [incomplete-source formatter rule](tooling-and-learning.md#incomplete-or-malformed-source), a dangling chain operator leaves the entire affected file unchanged and produces a focused missing-operand diagnostic. Other valid files may still be formatted, with overall failure status when any requested file cannot parse. Format-on-save applies no edits to the invalid buffer. These examples require future parser/type-checker and formatter conformance tests; documentation checks do not verify execution or formatting.

The selected [formatter idempotence requirement](tooling-and-learning.md#formatter-stability-and-idempotence) applies to these presentation choices: after a successful format, the same version/settings must produce identical source on a second pass. Adding/removing an optional leader, choosing multiline layout, and placing comments must settle together rather than alternate between forms. Include leading-separator cases in future two-pass conformance checks; no formatter execution is claimed here.

The selected [verification-before-write contract](tooling-and-learning.md#verification-before-writing) also requires reparsing proposed output and checking preserved structure/typing requirements plus comments before any rewrite. Only approved optional-prefix/separator differences may be normalized. A singleton and's Bool requirement must survive comparison; parsing an unprefixed operand is not sufficient evidence for dropping its leader. Failed or unestablished verification leaves that entire file/buffer unchanged and reports a formatter error, with overall failure even when other files finish. This does not select singleton normalization or a verifier implementation.

The selected [read-only --check mode](tooling-and-learning.md#read-only-check-mode-for-ci) uses the same chain presentation, effective configuration, and preservation checks as normal formatting. It compares source with verified formatted output without writing files and reports a difference or parse/verification error for the affected file. Check mode cannot bypass singleton Bool requirements or comment checks, and it claims no formatter implementation here.

Under the selected [comment-formatting contract](comments.md#selected-formatting-contract), ordinary/raw comment contents remain opaque and retain their attachment to the same nearby code. The formatter may change indentation at the source position and surrounding line breaks. Count only real entries; /* and authenticated */ is neither a disabled-but-real operand nor an implicit formatter directive. Its presence alone requires no specific vertical layout. Exact line-placement algorithms, explicit-singleton normalization, and any future formatter-escape mechanism remain open after the [comparison of current formatters](comment-formatting-research.md).
