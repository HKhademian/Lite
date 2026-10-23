# Negated comparison operators: investigation

Status: **requested by the user, 2026-10-23; candidate spellings and semantics under investigation, not selected**. The current operator set, postfix Result propagation, and comparison-chain rules remain unchanged. Direct ordering-comparison patterns are still a separate unselected extension. There is no LiteScript lexer/parser/runtime verification.

## Requested family and its structure

The user proposes these positive/negative pairs:

```text
eq    ==       neq    =!=
gt    >        ngt    >!
gte   >=       ngte   >!=
lt    <        nlt    <!
lte   <=       nlte   <!=
```

The insertion rule is consistent: insert ! immediately after the first comparison character, retaining the rest of the positive spelling. It produces all five proposed negative tokens. Descriptive candidate token families are:

```text
equality_token := "==" | "=!="
ordering_token := ">" | ">=" | ">!" | ">!="
                | "<" | "<=" | "<!" | "<!="
```

This is a token inventory for review, not an adopted grammar production. Recognizing the longest admitted token handles >!= before >! or >, and <!= before <! or <. Prefix relationships alone do not make a token family ambiguous. Whitespace may separate tokens; it must not choose a different parse of an already fixed token sequence.

## Meaning: negate the comparison, not its operands

Recommendation: each negative form is the Boolean complement of its corresponding positive comparison on the same evaluated operands:

```text
a =!= b   means   not (a == b)
a >!  b   means   not (a >  b)
a >!= b   means   not (a >= b)
a <!  b   means   not (a <  b)
a <!= b   means   not (a <= b)
```

This does not negate an operand, assert successful Result extraction, catch a failure, or introduce a second independently overloadable relation. Each operand and underlying comparison executes once if reached, with the existing failure/effect rules; only its normal Bool result is complemented. Complete custom-comparison interfaces remain open.

For ordinary totally ordered integers, ngt agrees with <=, ngte with <, nlt with >=, and nlte with >. These equivalences must not become unconditional rewrites for partial or unordered comparisons.

If LiteScript eventually permits IEEE-style NaN comparisons, all four positive ordering tests and equality can be false for a NaN operand. Their Boolean complements are then true. Thus not-greater is observably different from less-or-equal. Python's primary reference documents this NaN behavior; LiteScript's floating-point representation and exact comparison behavior remain unselected. Source: [Python value comparisons](https://docs.python.org/3/reference/expressions.html#value-comparisons).

## Existing expression boundaries

LiteScript already gives postfix ! a propagation meaning, and token-separating whitespace is not mandatory around an ordinary comparison. A finite longest-token experiment checked these five existing token sequences:

```text
r!>0     -> r ! > 0
r!>=0    -> r ! >= 0
r!<0     -> r ! < 0
r!<=0    -> r ! <= 0
r!==0    -> r ! == 0
```

The user's five candidates preserve all five tokenizations in that experiment. With a suitable Result-valued r, these describe comparison after explicit extraction.

Alternatives with negation before the positive operator do change them: !>, !>=, !<, !<=, and !== would absorb propagation plus the following comparison. Even conventional != changes r!==0 under plain longest-token recognition: the lexer consumes != and leaves =, instead of consuming ! followed by ==. This is a lexical compatibility issue; it is not proof that a different context-aware lexer could never support those tokens. Type checking or optional spacing must not be used to guess the intended parse.

The proposed =!= is therefore a meaningful candidate rather than merely a longer conventional inequality spelling. It preserves the relation-first family and avoids that observed compact propagation/equality collision.

## Future generic-type boundary

Suffix negation still has an important future boundary. If angle-bracket generic notation becomes source syntax, a generic close followed by the selected fallible-type suffix T! and an initializer could be written:

```text
x: Box<Int>!=load();
/* intended type/initializer tokens: Box < Int > ! = load ( ) */
```

The user's >!= token would absorb > ! = under a global longest-token lexer. Even with a space before assignment, Box<Int>! ends in the proposed >! token. A uniform-suffix alternative such as >=! instead of >!= does not remove the >! collision for the strict-greater case.

Angle-bracket generics are [temporary explanatory notation](generic-notation.md), so this is a future design constraint, not a currently implemented parse conflict. Possible resolutions include different generic application syntax or deterministic token splitting in a grammatical type context. No resolution is selected here. Do not adopt a punctuation family and silently assume this boundary is solved.

## Readability and alternatives

The user's family is mechanically regular. The main human-reading question is whether >!= is reliably read as not-(>=), rather than as not-(>) with equality subsequently added. The latter intuition would give the wrong result at equality. Atomic token recognition solves machine tokenization, but a font and beginner reading study is still needed to substantiate a readability claim.

Other candidates worth comparing:

- Keep existing not (a > b), not (a >= b), and not (a == b). These already express the intended pairwise meanings; parentheses isolate one comparison from an entire chain.
- Investigate a not > b and a not >= b as explicit negated comparison phrases. They add comparison grammar rather than punctuation tokens and do not absorb postfix !. They are not selected infix syntax.
- Uniform suffix ! gives ==!, >!, >=!, <!, <=!. It makes whole-operator negation visible but retains the generic-close/>! boundary and needs a readability comparison with the user's insertion rule.
- Unicode ≠, ≯, ≱, ≮, and ≰ offer mathematically named alternatives without an ASCII ! boundary. The Unicode chart identifies the characters; it does not determine LiteScript semantics or solve keyboard input, fonts, search, normalization, or accessibility. Source: [Unicode mathematical operators](https://www.unicode.org/charts/PDF/U2200.pdf).
- Ada uses /= for inequality, but that token is already LiteScript's division update, so reusing it would conflict with an established operation. Source: [Ada relational operators](https://www.adaic.org/resources/add_content/standards/12rm/html/RM-4-5-2.html).
- Lua uses ~= for inequality. It avoids the particular postfix-! collision, but would give LiteScript a new tilde-based comparison spelling without the user's uniform family. Source: [Lua relational operators](https://www.lua.org/manual/5.4/manual.html#3.4.4).

Readability assessments above are design judgments, not measured user results. eq/neq/gt/etc. are descriptive labels in this investigation, not newly reserved LiteScript words.

## Chains and patterns remain separate decisions

If selected, a negated comparison should complement one adjacent pair within a chain, retaining single evaluation, left-to-right execution, and short-circuiting. For example, a >! b < c would test not (a > b) and then b < c using the retained b. Existing prefix not a > b < c instead negates the entire chain. These are different expressions.

Direct comparison patterns should only be extended after the operator family and operand boundaries are chosen. A negative comparison pattern would test its supplied component and introduce no binding; that would not automatically select general logical not patterns, binding-producing alternatives, or a new coverage proof algorithm.

## Evidence and recommendation

The review inspected current operators, chains, lexical direction, fallible types, and generic-notation boundaries. A finite Python longest-token model checked each of the five proposed tokens between identifiers, the five compact propagation/comparison sequences above, and two illustrative generic/fallible initializer spellings. The user family preserved the five existing expression samples and changed both future generic samples. Prefix-negated alternatives changed all five expression samples; conventional != changed the propagation/equality sample. Host-Python checks also confirmed that the five positive predicates are false against NaN and their Boolean complements true. These are bounded lexical/semantic experiments, not a complete collision audit or LiteScript implementation tests.

Recommendation: keep the user's family as a serious candidate, define negative semantics as literal Boolean complements, preserve explicit not as the semantic reference, and settle the >! type boundary before selecting the punctuation. Measure whether readers distinguish >! from >!= at equality. No proposed operator, infix not phrase, Unicode alias, or comparison-pattern extension is adopted by this investigation.

Related: [operators](operators.md), [comparison chains](comparison-chains.md), [comparison patterns](comparison-patterns.md), [fallible types](fallible-types-and-error-composition.md), and [numbers](numbers.md).
