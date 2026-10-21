# References

These sources were consulted during the design discussion. They support comparisons and tradeoff analysis, not claims that LiteScript implements or inherits their semantics. The documentation snapshot is dated **2026-10-18**; external pages can evolve.

## Rust

- [Block expressions](https://doc.rust-lang.org/reference/expressions/block-expr.html): final expressions, unit results, and control-flow boundaries. LiteScript's semicolons deliberately do not suppress a preceding final result.
- [If expressions](https://doc.rust-lang.org/reference/expressions/if-expr.html): mandatory braced branches, value selection, and restrictions needed around certain condition expressions.
- [Loops and breakable expressions](https://doc.rust-lang.org/reference/expressions/loop-expr.html): loop forms, lexical labels, and explicit exits. LiteScript's selected accumulator, targeted completion, and loop payload rules have their own [control-flow contract](control-flow.md), with implementation and memory details still open.
- [Tuple types and unit](https://doc.rust-lang.org/reference/types/tuple.html): the singleton unit type and tuple values.
- [Option](https://doc.rust-lang.org/std/option/index.html): explicit absence, pattern handling, and representation guarantees for particular types. This does not imply every `Option<T>` in a new language has no representation cost.
- [Recoverable errors with Result](https://doc.rust-lang.org/book/ch09-02-recoverable-errors-with-result.html): typed failures and propagation. LiteScript selects implicit ordinary success construction while keeping explicit failure handling and propagation; see [Result and errors](result-and-errors.md).
- [Ownership](https://doc.rust-lang.org/stable/book/ch04-01-what-is-ownership.html): an established ownership-based memory model. LiteScript's ownership rules remain unchosen.
- [References and borrowing](https://doc.rust-lang.org/book/ch04-02-references-and-borrowing.html): read/write access and constraints on simultaneous aliases; comparison material for the selected [var/mut access contracts](mutability.md) and the remaining ownership/lifetime design.

## C++

- [Const correctness](https://isocpp.org/wiki/faq/const-correctness): binding/pointer constness, access to referenced data, const receiver operations, and the limits of read-only access. These distinctions inform [mutability](mutability.md), without adopting C++ qualifier placement or interior-mutation exceptions.

## Kotlin

- [Conditions and loops](https://kotlinlang.org/docs/control-flow.html): conditional values, optional short bodies, and block results.
- [Functions](https://kotlinlang.org/docs/functions.html): contrasting function-body and signature conventions.
- [Expression specification](https://kotlinlang.org/spec/expressions.html): reference material for conditional expression typing and grammar; versioned specification details may differ from the current tutorial.

## Swift

- [Statements](https://docs.swift.org/latest/documentation/the-swift-programming-language/statements/): explicit braces and branch structure.
- [Methods](https://docs.swift.org/latest/documentation/the-swift-programming-language/methods/): explicit mutation contracts for value-type methods; the LiteScript receiver syntax remains open.
- [Expressions](https://docs.swift.org/swift-book/ReferenceManual/Expressions.html): documented conditional-expression restrictions. Swift is not being cited as allowing arbitrary multi-statement value branches in every context.
- [Control flow](https://docs.swift.org/swift-book/LanguageGuide/ControlFlow.html): conditional values and exhaustive branches.
- [Value and reference types](https://www.swift.org/documentation/articles/value-and-reference-types.html): value semantics, sharing, composition, and local reasoning.
- [Automatic reference counting](https://github.com/swiftlang/swift-book/blob/main/TSPL.docc/LanguageGuide/AutomaticReferenceCounting.md): an alternative memory-management tradeoff. ARC is not a selected LiteScript implementation.

## Zig

- [Language reference](https://ziglang.org/documentation/master/): typed values, optional/error representations, conditionals, loops, and implementation tradeoffs. The linked development reference evolves.
- [Grammar](https://ziglang.org/documentation/master/#Grammar): parenthesized control headers and block/nonblock alternatives. These delimiters informed discussion but are not LiteScript's final grammar.

## Odin

- [Overview](https://odin-lang.org/docs/overview/): declaration syntax, procedures, and explicit body markers.
- [Grammar](https://odin-lang.org/spec/grammar/): braced bodies and `do` for a single statement.
- [Conditional-value idioms](https://odin-lang.org/docs/overview/#ternary-operator): Odin has separate ternary forms; it should not be described as identical to Rust's value-producing `if` syntax.

## V

- [Statements and expressions](https://docs.vlang.io/statements-&-expressions.html): mandatory branch braces, value-producing conditionals, and a unified `for` keyword with multiple forms.
- [Functions](https://docs.vlang.io/functions.html): comparison for function declarations and source organization.

## Dart

- [Branches](https://dart.dev/language/branches): statement conditionals, pattern conditions, and switch expressions.
- [Operators](https://dart.dev/language/operators): conditional expressions use another form from ordinary `if` statements; this differs from LiteScript's one-conditional-syntax goal.
- [Functions](https://dart.dev/language/functions): function-body comparisons.

## Lua and Python

- [Lua control structures](https://www.lua.org/manual/5.4/manual.html#3.3.4): keyword-delimited conditions and loops.
- [Lua function definitions](https://www.lua.org/manual/5.4/manual.html#3.4.11): explicit function endings.
- [Python compound statements](https://docs.python.org/3/reference/compound_stmts.html): colon/suite structure, indentation, and limits on inline nested compound statements.
- [Python loop completion](https://docs.python.org/3/tutorial/controlflow.html#break-and-continue-statements): completion without `break`; not equivalent to a no-contribution fallback.
- [Python comparisons](https://docs.python.org/3/reference/expressions.html#comparisons): adjacent-pair comparison chains with each operand evaluated at most once and short-circuiting. LiteScript adopts that chain direction with strict `Bool` results, not Python's dynamic comparison rules.

## Beginner syntax research

- Andreas Stefik and Susanna Siebert, 2013, [An Empirical Investigation into Programming Language Syntax](https://www.vidarholen.net/~vidar/An_Empirical_Investigation_into_Programming_Language_Syntax.pdf), ACM Transactions on Computing Education, DOI 10.1145/2534973. The paper examines novice syntax performance across languages; it does not isolate braces as the only relevant variable.
- Vilma Lappi, Ville Tirronen, and Jonne Itkonen, 2023, [A replication study on the intuitiveness of programming language syntax](https://link.springer.com/article/10.1007/s11219-023-09631-7), Software Quality Journal. It supports caution about assuming expert familiarity is novice intuitiveness; it does not validate LiteScript's proposed syntax.

## Unicode

- [Unicode Standard Annex #31: Unicode Identifiers and Syntax](https://www.unicode.org/reports/tr31/): identifier character properties and language-specific profiles. LiteScript's exact profile and Unicode version remain open.
- [Unicode Standard Annex #15: Unicode Normalization Forms](https://www.unicode.org/reports/tr15/): normalization choices for identifier equivalence. Linking the standard does not adopt a normalization policy for identifiers or strings.

## Pattern syntax comparison

[Conditional patterns and match syntax](pattern-syntax-comparison.md) compares the primary Rust, V, Odin, Zig, Kotlin, Dart, Swift, Python, Lua, and C++ references for binding syntax, type narrowing, arm boundaries, and scope. It distinguishes the selected LiteScript surface from remaining coverage and ownership policies.

## Local source of design decisions

The [named argument and tuple comparison](named-arguments-reference-comparison.md) checks all twelve reference languages used by the type-category review, plus supplemental C#, for native argument labels, named product alternatives, and tuple name compatibility. The [current routing reference](named-input-routing.md) records selected call permutations and validation, tuple component syntax, contextual construction, stored order, and positional/named destructuring. Different stored tuple labels require explicit reconstruction; identical ordered labels and resolved component types define the same structural tuple type. Stored named/unnamed conversions, callable compatibility, and full recursive grammar remain open; native reference-language syntax is not rewritten into LiteScript syntax.

The primary source for LiteScript-specific choices is the design conversation through 2026-10-21. No independent external specification, implementation, or benchmark currently establishes those choices. The [decision ledger](decisions-and-open-questions.md) identifies retained direction, working proposals, and unresolved contracts.

## Enum and type-category comparison

[Type categories across the reference languages](type-categories-comparison.md) records a focused primary-source review dated 2026-10-18. It compares Rust, Zig, Odin, V, Swift, Kotlin, Dart, C++, TypeScript, Python, Lua, and Scala 3, with direct sources for enums and payload alternatives, products, data/case classes, distinct domain wrappers, representation, and value/reference semantics. It distinguishes current development documentation from a guarantee about every released compiler.

## Pattern matching across type categories

The [all-type pattern review](pattern-type-review.md#reference-checks), [ordered sequences](sequence-patterns.md), and [set matching](set-patterns.md) compare primary Rust, Dart, Python, Swift, and Kotlin documentation consulted on 2026-10-18. They distinguish structural decomposition, equality, membership, and search; no new collection matching grammar is adopted solely because a reference language supports it.
