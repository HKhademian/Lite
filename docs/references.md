# References

These sources were consulted during the design discussion. They support comparisons and tradeoff analysis, not claims that LiteScript implements or inherits their semantics. The general reference snapshot is dated **2026-10-18**; focused reviews below carry their own dates. External pages can evolve.

## Project reference languages

Updated by user direction, **2026-11-02**: LiteLang's 17 project reference
languages are:

- C
- C++
- Rust
- Zig
- V (Vlang)
- Odin
- C3
- Jai
- Kotlin
- Python
- Dart
- Salam
- C#
- TypeScript
- Swift
- Lua
- Scala 3

Each language has particular parts that can inspire LiteLang. This is selective
inspiration: it does not mean adopting all of any language's features or design
decisions. Evaluate ideas individually against LiteLang's own goals and
contracts; inclusion in this list does not select a feature, syntax, semantic
rule, or implementation strategy. The inspiring parts remain topic-specific,
rather than a fixed package of features to import from each language.

This update retains every previous project reference language and adds C, C3,
Jai, and C#. Existing comparisons retain their dated coverage and sources;
other languages may still be consulted for particular questions. Being cited in
a focused review does not by itself change the project reference set. Adding a
language here does not establish comparison coverage or implementation evidence.
Future reviews should state the languages, versions, features, and evidence they
actually cover. Simple English as Lite's reference human-language presentation
is a separate concept from this programming-language reference set.

## Salam and multilingual source, reviewed 2026-10-28

- [Official website](https://www.salamlang.ir/): shows Persian and English forms
  of a program and describes `salam translate` for keywords, types, and the entry
  function. This is evidence for a localized source direction; it does not prove
  arbitrary identifier/comment/string translation or exact round-trip conversion.
- [Compiler repository](https://github.com/SalamLang/Salam): describes English
  and Persian keyword packs and editor keyword lists generated from compiler
  tables. No Salam compiler/translation experiment was run in this discussion.
- [Persian teaching material](https://www.salamlang.ir/learn/): a starting
  reference for familiar-language lessons and terminology. Its existence does not
  establish a measured learning advantage for Lite or every learner.
- Native C/LLVM compilation and modest runtime support are the other recorded
  areas of interest; see the [lightweight execution review](#lightweight-native-execution-reviewed-2026-10-28).

The user's [multilingual source and learning proposal](multilingual-source-and-learning.md)
aims to separate learning programming from first having to learn English, with an
optional bridge to Lite's simple-English reference form. Source vocabulary,
localized APIs, Unicode handling, diagnostics, tooling, learning outcomes, and
conversion boundaries need investigation. Persian script, English in Latin
script, and Persian transliteration are distinct capabilities; do not attribute
all of them to Salam merely because it supports Persian and English.

## Arithmetic operators, reviewed 2026-10-25

[Arithmetic operators across languages](arithmetic-operators-comparison.md) links the exact primary sources consulted for Java, C, C++, C#, Python, JavaScript/TypeScript, Rust, Go, Swift, Kotlin, Dart, Lua, Odin, Zig, and V. It compares precedence/associativity, division/remainder, unary signs, power, and evaluation order. The review distinguishes drafts, moving documentation, and versioned references; its [captured probes](research/arithmetic-operator-probes-2026-10-25.json) record seven installed toolchains and a separate expected Rust compile rejection. They are foreign-language checks, not LiteScript execution. LiteScript first selected Odin's % / %% symbols with Zig's remainder / modulo names, then replaced the floor symbols with :/ and :%. The user subsequently clarified calculation versus storage: floating operands supply floating division semantics, including nonintegral operands; Int storage accepts / truncation or :/ floor of the quotient, while Float/Double results retain fractional /. This LiteScript choice is separate from the foreign contracts. The selected values and current spellings are defined in division.md. The user also selected `**` power spelling with explicit grouping at a unary-minus/base boundary after comparing Python/Lua with JavaScript; see [power and negation](power-and-negation.md). Remaining power contracts and other additional operators stay open.

The [signed division, remainder, and modulo table](signed-division-table.md), reviewed 2026-10-25, expands the arithmetic comparison to the twelve references in that dated review and the additional arithmetic languages, including Scala 3/JVM and separate JavaScript/TypeScript numeric families. It links primary sources per operation and includes four signed V playground cases reported by V 0.5.0 345b29d. Calculated cells, prior local probes, and that remote observation are distinguished in its evidence notes.

The [arithmetic methods and selected family](arithmetic-methods-and-division-revision.md), selected 2026-10-25, records / :/ % :% with contextual division and ordinary numeric methods in addition. Kotlin informs the named surface; Dart tilde and R percent-delimited alternatives remain comparison history. The compact/spaced equivalence requirement remains, with unambiguous colon-prefixed operator recognition. No foreign language's wider numeric, overload, or comment contracts are imported.

## Lightweight native execution, reviewed 2026-10-28

- [Salam website](https://www.salamlang.ir/), [compiler repository](https://github.com/SalamLang/Salam), and [benchmark methodology](https://www.salamlang.ir/speed/): inspiration for native compilation, C/LLVM paths, and small support without a mandatory tracing collector. The website's performance numbers are project-reported measurements for its workloads; this discussion did not reproduce them or audit Salam's memory safety. Its compiler documentation describes small runtime helpers included in generated C. Absence of a separately distributed runtime library does not mean absence of runtime code.
- [LLVM frontend performance guidance](https://llvm.org/docs/Frontend/PerformanceTips.html): frontend representation and lowering affect optimization; choosing LLVM alone does not establish speed or a memory model.
- [Rust ownership explanation](https://doc.rust-lang.org/book/ch04-01-what-is-ownership.html): compile-time ownership rules as a reference route to memory management without a tracing collector. LiteLang's selected ordinary copies and unresolved resource-copy contracts must be preserved when evaluating its own model.

These moving primary sources were consulted 2026-10-28. They motivate the [selected LiteLang priorities](memory-and-performance.md#lightweight-native-execution-priority) and [open investigations](../investigations/lightweight-native-execution.md), without adopting another language's semantics or selecting a Lite backend.

## Sequence composition and execution models, reviewed 2026-11-01

Thirteen systems were checked against official documentation on 2026-11-01 for one design question: how a language provides general lazy sequence operators over eager collections, cold sources, and hot or warm push sources, and what happens to repeatability, per-element failure, and cost. The systems are **Kotlin 2.4.21, Java SE 25, Dart 3.13.7, Rust 1.99.1, Go 1.27.3, TypeScript 7.0.2, Zig (master, spanning 0.13–0.17), V 0.5.2, Odin dev-2026-10, Jai, ReactiveX (with RxJS 7.8.2), Underscore.js 1.13.8, and Lodash 4.18.1**. Findings, the comparison matrix, options, and open questions are in the [INV-060 note](../investigations/INV-060-sequence-execution-and-surface-models.md).

Primary sources by area:

- **Lazy type distinct from the eager collection:** [Kotlin sequences](https://kotlinlang.org/docs/sequences.html), [Rust `std::iter`](https://doc.rust-lang.org/std/iter/index.html), [Java `java.util.stream`](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/util/stream/package-summary.html).
- **Cold versus hot production in the type system:** [Kotlin Flow](https://kotlinlang.org/docs/coroutines-flow.html), [ReactiveX observable](https://reactivex.io/documentation/observable.html), [ReactiveX contract](https://reactivex.io/documentation/contract.html), [RxJS glossary](https://rxjs.dev/guide/glossary-and-semantics), [Dart `Stream`](https://api.dart.dev/dart-async/Stream-class.html).
- **Iteration protocols and generators:** [Go `iter`](https://pkg.go.dev/iter) and [range over function types](https://go.dev/blog/range-functions), [Dart creating streams](https://dart.dev/libraries/async/creating-streams), [MDN iteration protocols](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Iteration_protocols), [V custom iterators](https://docs.vlang.io/statements-&-expressions.html#custom-iterators), [Zig `for`](https://ziglang.org/documentation/master/#for).
- **Failure inside a pipeline:** [JLS 11.2.3 checked exceptions in lambdas](https://docs.oracle.com/javase/specs/jls/se25/html/jls-11.html#jls-11.2.3), [Rust `Result` collection](https://doc.rust-lang.org/std/result/enum.Result.html), [Odin `or_return`](https://odin-lang.org/docs/overview/#or_return-operator).
- **Composition and cost models:** [Kotlin extension functions](https://kotlinlang.org/docs/extensions.html), [Lodash chain sequence methods](https://lodash.com/docs), [Lodash FP guide](https://github.com/lodash/lodash/wiki/FP-Guide), [Underscore chaining](https://underscorejs.org/#chaining), [Odin `core:slice`](https://pkg.odin-lang.org/core/slice/).

At the time of this review, Java, Go, TypeScript, Jai, ReactiveX, Underscore.js, and Lodash were included as topic-specific sources; the survey itself did not change the then-current thirteen project reference languages. The owner's 2026-11-02 update above subsequently adds Jai to the project reference set. This review records Jai's entries as low-confidence and community-derived, with no public official specification consulted. No toolchain was executed and no benchmark was run: this is documentation evidence, not foreign-language verification or a LiteLang implementation claim. The survey does not select a surface, an execution model, a generator form, or a failure policy.

## Collection protocols and storage families, reviewed 2026-11-01

Eleven languages and twelve storage families were checked for two questions: which collection properties are independent capabilities, and what each storage family can honestly promise. The analysis is in [INV-057](../investigations/INV-057-capability-lattice.md) and [INV-058](../investigations/INV-058-storage-families-and-equality.md). Versions: C++ working draft (post-C++23), Rust 1.99.1, Swift 6.x, Kotlin 2.4.x, Java SE 25, C#/.NET 10, Scala 3.10, Python 3.14, TypeScript 7.0.2/ES2026, Go 1.27, Dart 3.13.7.

- **Cost-bearing access.** [Scala performance characteristics](https://docs.scala-lang.org/overviews/collections-2.13/performance-characteristics.html) distinguishes `IndexedSeq` from `LinearSeq` and publishes per-type costs; [Java `RandomAccess`](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/util/RandomAccess.html) is the unenforced marker that exists because [`List.get`](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/util/List.html) may be linear.
- **Omission over lying.** [.NET `LinkedList<T>`](https://learn.microsoft.com/en-us/dotnet/api/system.collections.generic.linkedlist-1) does not implement `IList<T>`; [Java's does](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/util/LinkedList.html).
- **Capability graphs.** [C++ ranges concepts](https://eel.is/c++draft/ranges#concepts), [Swift `Collection`](https://developer.apple.com/documentation/swift/collection), [Python `collections.abc`](https://docs.python.org/3.14/library/collections.abc.html), and [Kotlin collection overview](https://kotlinlang.org/docs/collections-overview.html).
- **Storage honesty.** [`vector<bool>`](https://en.cppreference.com/w/cpp/container/vector_bool), [`std::deque`](https://en.cppreference.com/w/cpp/container/deque), [Rust `VecDeque`](https://doc.rust-lang.org/std/collections/struct.VecDeque.html), [C# `Span<T>`](https://learn.microsoft.com/en-us/dotnet/api/system.span-1), and [Odin `#soa`](https://odin-lang.org/docs/overview/#soa-data-types).
- **Order and equality.** [Java `Map`](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/util/Map.html), [Rust `HashMap`](https://doc.rust-lang.org/std/collections/struct.HashMap.html), [Python `dict`](https://docs.python.org/3/library/stdtypes.html#typesmapping), [ECMA-262 keyed collections](https://tc39.es/ecma262/multipage/keyed-collections.html), and [Dart `Map`](https://api.dart.dev/stable/dart-core/Map-class.html).
- **Derived operations.** [Python ABC mixins](https://docs.python.org/3.14/library/collections.abc.html#collections-abstract-base-classes), [Dart `Iterable`](https://api.dart.dev/stable/dart-core/Iterable-class.html), and [Go `iter`](https://pkg.go.dev/iter).

This review uses only documentation; no toolchain was executed and no complexity claim was measured. It does not select a capability set, a conformance rule, a shipping list, or an equality/order policy.

## Rust

- [Block expressions](https://doc.rust-lang.org/reference/expressions/block-expr.html): final expressions, unit results, and control-flow boundaries. LiteScript's semicolons deliberately do not suppress a preceding final result.
- [If expressions](https://doc.rust-lang.org/reference/expressions/if-expr.html): mandatory braced branches, value selection, and restrictions needed around certain condition expressions.
- [Loops and breakable expressions](https://doc.rust-lang.org/reference/expressions/loop-expr.html): loop forms, lexical labels, and explicit exits. LiteScript's selected typed loop value, targeted completion, and loop payload rules have their own [control-flow contract](control-flow.md), with implementation and memory details still open.
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
- [Unicode Standard Annex #9: Bidirectional Algorithm](https://www.unicode.org/reports/tr9/): logical text order and bidirectional display, consulted 2026-10-28 for the multilingual-source investigation.
- [Unicode Technical Standard #39: Security Mechanisms](https://www.unicode.org/reports/tr39/): confusable/script-related mechanisms, consulted 2026-10-28 as input to identifier and tooling questions. These sources do not select a Unicode version, normalization, bidi-control policy, or script restriction for LiteLang.

## Pattern syntax comparison

[Conditional patterns and match syntax](pattern-syntax-comparison.md) compares the primary Rust, V, Odin, Zig, Kotlin, Dart, Swift, Python, Lua, and C++ references for binding syntax, type narrowing, arm boundaries, and scope. It distinguishes the selected LiteScript surface from remaining coverage and ownership policies.

## Local source of design decisions

The [named argument and tuple comparison](named-arguments-reference-comparison.md) checks all twelve reference languages used by the type-category review, plus supplemental C#, for native argument labels, named product alternatives, and tuple name compatibility. The [current routing reference](named-input-routing.md) records selected call permutations and validation, tuple component syntax, contextual construction, stored order, and positional/named destructuring. Different stored tuple labels admit conversion at an explicitly typed receiving declaration with unchanged positions/types, while ordinary transfers check labels; see [labels under an explicit destination type](tuple-label-conversions.md); identical ordered labels and resolved component types define the same structural tuple type when ordinary/segment roles and extent contracts also match. Label-only named/unnamed and callable input-label adaptation under a compatible destination are selected; remaining callable compatibility and full recursive grammar remain open; native reference-language syntax is not rewritten into LiteScript syntax.

The primary source for LiteScript-specific choices is the design conversation through 2026-10-21. No independent external specification, implementation, or benchmark currently establishes those choices. The [decision ledger](decisions-and-open-questions.md) identifies retained direction, working proposals, and unresolved contracts.

## Enum and type-category comparison

[Type categories across the reference languages](type-categories-comparison.md) records a focused primary-source review dated 2026-10-18. It compares Rust, Zig, Odin, V, Swift, Kotlin, Dart, C++, TypeScript, Python, Lua, and Scala 3, with direct sources for enums and payload alternatives, products, data/case classes, distinct domain wrappers, representation, and value/reference semantics. It distinguishes current development documentation from a guarantee about every released compiler.

## Pattern matching across type categories

The [all-type pattern review](pattern-type-review.md#reference-checks), [ordered sequences](sequence-patterns.md), and [set matching](set-patterns.md) compare primary Rust, Dart, Python, Swift, and Kotlin documentation consulted on 2026-10-18. They distinguish structural decomposition, equality, membership, and search; no new collection matching grammar is adopted solely because a reference language supports it.

The [empty/singleton review](tuple-entries-and-access.md#empty-and-singleton-review-across-contexts), checked 2026-10-22, compares low-arity tuple construction and Unit models across the twelve references in that dated review plus C#, with primary sources linked per language. It records open LiteScript recommendations, not implementation verification.
