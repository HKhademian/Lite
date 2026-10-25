# Arithmetic operators across languages

Status: **primary-source comparison researched 2026-10-25; basic LiteScript arithmetic grouping selected; remainder/modulo symbols and names and explicit signed-power grouping subsequently selected; remaining power contracts and other additional operators stay open**. This document compares language contracts. It does not establish a LiteScript parser or runtime.

## Selected LiteScript baseline

Within the selected arithmetic set, precedence runs from tighter to looser:

1. Prefix negation: `-a`.
2. Multiplicative operations: `*`, `/`, `_/`, `%`, `_%`.
3. Additive operations: binary `+`, `-`.

Binary operators at each level associate left to right. Parentheses override grouping. Thus `a - b - c` groups as `(a - b) - c`, and `a / b * c` as `(a / b) * c`. Associativity does not permit algebraic reassociation. Operands retain LiteScript's separate left-to-right evaluation contract.

The optional leading `+` at a complete additive-chain entry is identity punctuation, including for one operand. It preserves value and type without promotion, conversion, an implicit zero, or an extra operator invocation. Minus retains negation. No redundant leading `*`, `/`, `_/`, `%`, `_%`, or power operator follows from that rule.

Selected 2026-10-25: Floating operands supply floating division semantics, including nonintegral literals and established values. For Int storage, `/` truncates the quotient and `_/` floors it; an Int destination does not truncate or retype operands. Float/Double results keep `/` fractional, including 2 / 7. Without floating operands or a fractional expected result, integer-only division retains its integer default. See [calculation and storage](division.md#floating-calculation-and-integer-storage). `%` is remainder paired with Int-result truncating `/`, with the dividend's sign when nonzero; `_%` is modulo paired with floor `_/`, with the divisor's sign when nonzero. This supersedes always-fractional Int division, the subsequent operand-only rule, and the earlier `//` / `%%` spellings. Ordinary methods are requested in addition. Compact/spaced equivalence remains required, with underscore/identifier scanning unresolved. Numeric representation, mixed operands, conversions, exact faults, and complete parsing remain open. See [operators](operators.md), [division](division.md), [the selected family](arithmetic-methods-and-division-revision.md), and [evaluation order](evaluation-order.md).

Power uses `**` with explicit unary-minus/base grouping, selected after this comparison; see [power and negation](power-and-negation.md). Chained-power association, full precedence/grammar, and numeric contracts remain open. ^, power updates, bitwise operators, and wrapping/saturating arithmetic are not selected. A complete expression grammar still needs integration with calls, access, ranges, types, and recovery.

## Java, C, C++, C#, and Python

### Java

Prefix numeric signs bind above `* / %`, which bind above binary `+ -`; these binary arithmetic levels associate left to right. Integer `/` truncates toward zero and `%` has the dividend's sign when nonzero. Unary `+` applies numeric promotion: a `byte` operand becomes `int`. Ordinary operands evaluate left to right. Java has no exponentiation operator in this grammar; [Math.pow](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/Math.html#pow(double,double)) is a library method. Source: [JLS 25, expressions, especially 15.7 and 15.15–15.18](https://docs.oracle.com/javase/specs/jls/se25/html/jls-15.html).

### C

The C23 committee draft puts unary signs above multiplicative `* / %`, then additive `+ -`, with left grouping within those binary levels. Integer division truncates toward zero. Unary `+` performs integer promotions. There is no power operator: with a suitable pointer, `2 **p` tokenizes as multiplication followed by dereference and can produce `6`. Grouping does not guarantee left-to-right evaluation of ordinary arithmetic operands. Source: [N3096 draft, 6.5, 6.5.3.3, 6.5.5–6.5.6](https://www.open-std.org/jtc1/sc22/wg14/www/docs/n3096.pdf). This is a committee draft, not a claim to have consulted the paid final standard.

### C++

The same basic arithmetic ladder and left grouping apply. Built-in integer division truncates toward zero; unary `+` applies integral promotions. `*p` is indirection, so adjacent stars do not introduce power. Ordinary arithmetic operands generally lack a left-to-right sequencing guarantee. Sources: the editor's draft on [multiplicative expressions](https://eel.is/c++draft/expr.mul), [additive expressions](https://eel.is/c++draft/expr.add), [unary operators](https://eel.is/c++draft/expr.unary.op), and [execution sequencing](https://eel.is/c++draft/intro.execution). User overloads require separate attention; this describes built-in arithmetic.

### C#

Unary signs bind above `* / %`, then binary `+ -`; those binary levels associate left to right. Integer `/` truncates toward zero, and a nonzero `%` result has the dividend's sign. Small integral operands can be promoted under unary `+`. Operands evaluate left to right. The predefined operator set has no `**` power operator; [Math.Pow](https://learn.microsoft.com/en-us/dotnet/api/system.math.pow) is a library method. Sources: [operator precedence and evaluation](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/operators/) and [arithmetic operators](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/operators/arithmetic-operators).

### Python

`**` is right associative: `2 ** 3 ** 2` means `2 ** (3 ** 2)`, producing `512`. Power binds tighter than a unary sign on its left but accepts a signed exponent: `-2 ** 2` is `-4`, `(-2) ** 2` is `4`, and `2 ** -2` is `0.25`. Below unary signs come `* / // %`, then binary `+ -`, with left grouping at those two levels. `/` is true division; `//` floors; `%` follows the divisor's sign. Source: [Python expression reference](https://docs.python.org/3/reference/expressions.html).

## Other modern reference languages

### JavaScript and TypeScript

JavaScript uses right-associative `**`, above multiplicative and additive operations, but rejects unparenthesized `-2 ** 2`. Write `(-2) ** 2` or `-(2 ** 2)`. A signed exponent such as `2 ** -2` is permitted. `Number` division is fractional; `BigInt` division truncates toward zero. `%` follows the dividend's sign. Unary `+` converts to `Number`, rather than preserving every input's type. Sources: [ECMAScript expression grammar and operations](https://tc39.es/ecma262/multipage/ecmascript-language-expressions.html) and [TypeScript's adoption of exponentiation](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-1-7.html). The local probe executed JavaScript in Node, not a TypeScript compiler.

### Rust

Unary negation binds above `* / %`, then `+ -`, with left grouping at both binary levels. Integer `/` truncates toward zero and `%` follows the dividend's sign. There is no unary `+` or built-in numeric power operator; integer power is available through methods such as `pow`. Sources: [precedence and evaluation](https://doc.rust-lang.org/reference/expressions.html#expression-precedence), [operator expressions](https://doc.rust-lang.org/reference/expressions/operator-expr.html), and [i32::pow](https://doc.rust-lang.org/std/primitive.i32.html#method.pow).

### Go

Unary operators bind above multiplicative `* / %`, then additive `+ -`; same-level binary arithmetic associates left to right. Integer `/` truncates toward zero and `%` follows the dividend's sign. Unary `+x` leaves the numeric value unchanged. Numeric power is a library operation rather than `**`. Sources: [Go specification, operators](https://go.dev/ref/spec#Operators) and [math.Pow](https://pkg.go.dev/math#Pow).

### Swift

The standard arithmetic set has prefix signs, multiplicative `* / %`, and additive `+ -`; the latter two levels associate left to right. Integer division truncates, and a nonzero integer remainder follows the dividend's sign. The standard set has no numeric `**`; Swift can define custom operators and precedence groups, so a library may add one. Sources: the Swift book's [basic operators](https://raw.githubusercontent.com/swiftlang/swift-book/main/TSPL.docc/LanguageGuide/BasicOperators.md) and [advanced operators](https://raw.githubusercontent.com/swiftlang/swift-book/main/TSPL.docc/LanguageGuide/AdvancedOperators.md).

### Kotlin

Prefix expressions bind above multiplicative `* / %`, then additive `+ -`. Integer division discards the fractional part. Operator syntax maps to named operations, including `unaryPlus`; custom implementations must not be assumed to satisfy LiteScript's identity-prefix contract. Power is supplied by `pow` functions, not a numeric `**` operator. Sources: [expression grammar and operator expansion](https://kotlinlang.org/spec/expressions.html), [numeric division](https://kotlinlang.org/docs/numbers.html#integer-division), and [pow](https://kotlinlang.org/api/core/kotlin-stdlib/kotlin.math/pow.html).

### Dart

Unary minus binds above multiplicative `* / % ~/`, then additive `+ -`; those binary levels associate left to right. `/` produces a double quotient, and `~/` truncates toward zero. `%` is Euclidean modulo: its result is nonnegative even for a negative divisor. Consequently `%` is not always the remainder paired with `~/`. Dart's operator set has no unary `+` or numeric `**`. Sources: [operator reference](https://dart.dev/language/operators) and [num.operator %](https://api.dart.dev/dart-core/num/operator_modulo.html).

### Lua 5.4

Power uses `^`, associates right to left, and binds above unary minus. Multiplicative `* / // %` bind above additive `+ -`. `/` is floating-point division, while `//` floors and `%` is paired with floor division. Lua's unary operator set does not include `+`. Sources: [arithmetic](https://www.lua.org/manual/5.4/manual.html#3.4.1) and [precedence](https://www.lua.org/manual/5.4/manual.html#3.4.8). These are explicitly Lua 5.4 rules.

### Odin

Unary operators bind above multiplicative `* / % %%`, then additive `+ -`, with left grouping at each binary level. Integer `/` truncates toward zero. `%` uses the truncating quotient; `%%` uses a floor quotient. Those remainder forms therefore differ for negative inputs. The documented operator set does not supply numeric `**`. Source: [Odin overview, operators](https://odin-lang.org/docs/overview/#operators), also available as [official source Markdown](https://raw.githubusercontent.com/odin-lang/odin-lang.org/master/content/docs/overview.md).

### Zig 0.15.2

The versioned reference distinguishes ordinary, wrapping, and saturating arithmetic. Signed integer `/` is restricted to compile-time-known positive operands; other cases use explicit operations such as `@divTrunc`, `@divFloor`, or `@divExact`. In this version, `**` repeats arrays: `"ab" ** 3` yields `"ababab"`. It is not numeric power. Source: [Zig 0.15.2 operators](https://ziglang.org/documentation/0.15.2/#Operators). This version-specific observation is not a blanket claim about moving development documentation or all Zig releases.

### V

The inspected operator appendix lists numeric `**` above `* / %`, then `+ -`, and shows a negative dividend producing a negative remainder. That appendix does not settle power associativity or unary-minus interaction, so this review makes no claim about those cases. Sources: [operator appendix](https://docs.vlang.io/appendix-ii-operators.html) and [current source documentation](https://raw.githubusercontent.com/vlang/v/master/doc/docs.md). The subsequent [signed table](signed-division-table.md) records four division/remainder cases executed in the official V playground, which reported V 0.5.0 345b29d. Power was not executed; neither the playground version nor development documentation establishes every released version's behavior.

## Design consequences for LiteScript

### Division and remainder must be chosen together

Negative values expose three distinct contracts:

- Floor quotient with paired modulo, selected as LiteScript `_/` and `_%`: `-7 _/ 2` is `-4`; `-7 _% 2`, `7 _% -2`, and `-7 _% -2` produce `1`, `-1`, and `-1` respectively. A nonzero modulo result follows the divisor's sign.
- Truncating quotient with paired remainder, selected as LiteScript integer `/` and `%`: `-7 / 2` gives `-3`; the same three remainder cases produce `-1`, `1`, and `-1`. A nonzero remainder follows the dividend's sign. Java and Rust also use truncating integer division; LiteScript uses floating calculations when an operand supplies floating arithmetic or a fractional expected result requests it; Int storage then accepts the rounded quotient. Its contextual rule is a separate choice from those languages' operand-based contracts.
- Euclidean modulo, as in Dart: all three remainder cases produce `1`, including with a negative divisor. The result satisfies `0 <= r < abs(b)`; exact division still produces zero.

These are semantic choices, not interchangeable names for the same operation. The user selected both named meanings, finally choosing `/`, `_/`, `%`, and `_%` as the symbolic family. Python/Lua are close comparisons for the selected integer floor/modulo pairing, with a different modulo spelling; their numeric representations and fault rules do not follow automatically.

### Symbols and signed results are separate choices

Selected 2026-10-25 after the sign and spelling reviews: LiteScript uses `%` for remainder and `_%` for floor modulo, retaining Zig-inspired operation names rem/mod. The earlier floor-paired `%` meaning and later `%%` spelling are superseded. Ordinary numeric methods are requested in addition, including div, floorDiv, and working rem/mod counterparts; exact signatures/dispatch remain open. No word-form infix mod operator or @rem/@mod callable API is selected. A familiar symbol alone does not establish a sign rule. The five modern references illustrate the differences directly:

- Rust: `%` uses truncating remainder, while integer [rem_euclid](https://doc.rust-lang.org/std/primitive.i32.html#method.rem_euclid) supplies a nonnegative remainder even for a negative divisor. The local sign probe checks all three cases above for both forms.
- Odin: `%` uses truncating remainder, while `%%` uses `a - b * floor(a / b)`. Thus `-7 %% 2` is `1`, but `7 %% -2` is `-1`. These values are derived from the [documented formula](https://raw.githubusercontent.com/odin-lang/odin-lang.org/master/content/docs/overview.md), not an executed Odin program.
- Dart: `%` is [Euclidean modulo](https://api.dart.dev/dart-core/num/operator_modulo.html); [remainder](https://api.dart.dev/dart-core/num/remainder.html) instead follows truncating division. The two coincide for many positive inputs but differ for negative dividends.
- Zig 0.15.2: [@rem](https://ziglang.org/documentation/0.15.2/#rem) pairs with truncating division and [@mod](https://ziglang.org/documentation/0.15.2/#mod) with floor division. Their documented contracts give `@rem(-7, 2) == -1` and `@mod(-7, 2) == 1`; these are source-derived examples, with no local Zig execution.
- V: the [operator appendix](https://docs.vlang.io/appendix-ii-operators.html) explicitly gives `-10 % 7 == -3`. The subsequent [signed table](signed-division-table.md) adds all four signed cases observed in the official V 0.5.0 playground, confirming truncating integer division and dividend-signed remainder for those values.

For LiteScript, `%` follows the dividend and `_%` follows the divisor when nonzero. Modulo `_%` is therefore not always nonnegative for negative divisors; preserve its selected floor identity with `_/`. Floating-point remainder, signed zero, zero divisors, and unrepresentable fixed-width cases need their own numeric/fault contracts.

The selected remainder/modulo values match Odin's documented successful integer formulas and Zig 0.15.2's documented rem/mod pairing; LiteScript's modulo symbol differs. It is not a claim to match every operation in Rust or V: Rust's % matches remainder, while rem_euclid differs from floor modulo for negative divisors; V's appendix establishes its cited remainder example but not a corresponding modulo operation. Representations and overflow/fault policies remain separate.

### Mathematical consistency and the Euclidean alternative

Both the floor and Euclidean conventions are coherent. Floor modulo keeps a == b * floor(a / b) + modulo for either divisor sign. Euclidean modulo instead requires 0 <= result < abs(b); its quotient rounds down for positive divisors and up for negative divisors. For example, floor modulo gives 7 modulo -2 as -1 with quotient -4, while Euclidean modulo gives 1 with quotient -3. Both reconstruct 7. Lean's [formal integer reference](https://lean-lang.org/doc/reference/latest/Basic-Types/Integers/) explicitly distinguishes Euclidean, truncating, and floor conventions; its zero-divisor policy is not adopted here.

For positive divisors, floor modulo and Euclidean modulo agree. Keeping the selected floor form makes `_%` pair with LiteScript's `_/` for negative divisors too. A future nonnegative Euclidean operation would need its own clear contract; neither the word modulo nor a claim of mathematical correctness should silently switch conventions.

Several C-family references use `//` for line comments. LiteScript has retired that arithmetic spelling, without selecting a line-comment replacement; its current block-comment rules remain in force. Selecting `_/` and `_%` leaves the compact operator/identifier boundary unresolved. Adjacent stars need equal care: C/C++ can parse multiplication followed by dereference; Zig 0.15.2 gives `**` an array meaning. Preserve the selected [comment token boundaries](comments.md) rather than importing another lexer.

### Power spelling selected; remaining contracts open

The user subsequently selected `**` power spelling and rejection of an unparenthesized unary-minus/base boundary. My recommendation of right association remains a separate proposal. That gives `2 ** 3 ** 2` the familiar power-tower grouping `2 ** (3 ** 2)`. The comparison supports two serious unary-minus policies:

- Python/Lua-style precedence: ungrouped `-2 ** 2` means `-(2 ** 2)`, producing `-4`.
- JavaScript-style restriction: reject that spelling and require the author to choose `(-2) ** 2` or `-(2 ** 2)`.

The user selected the second policy on 2026-10-25: reject -2 `**` 2 and -2 `**` 3 and require (-2) `**` exponent or -(2 `**` exponent). The odd exponent is not an exception just because both interpretations give -8. Signed right operands, complete grammar, and numeric acceptance still need separate decisions. Do not treat `^` as a universally familiar power symbol: it is bitwise XOR in Java, C, C++, C#, JavaScript, and Rust, while Lua uses it for power.

Power also needs operand/result typing, integer versus fractional exponents, negative bases, negative exponents, `0 ** 0`, zero to a negative exponent, overflow/precision, and exact typed-panic contracts. `**=` requires its own update decision. No decision here selects those behaviors, generic overloads, or new redundant leading operators.

### Base sign, exponent sign, and outer negation

The power symbol and the signs of its operands require separate decisions. The following mathematical examples use the selected `**` spelling with explicit grouping; they do not establish complete LiteScript typing or numeric-domain rules:

```text
(-2) ** 3;  /* -8: odd integer exponent preserves the negative sign */
(-2) ** 4;  /* 16: even integer exponent produces a positive value */
2 ** -3;    /* 0.125: negative exponent means reciprocal, not negation */
(-2) ** -3; /* -0.125: reciprocal of a negative odd power */
(-2) ** -4; /* 0.0625: reciprocal of a positive even power */
-(2 ** 4);  /* -16: explicitly negate the completed power */
```

Parity controls the sign for a finite nonzero negative base and integer exponent; negative exponents additionally require a reciprocal-capable result domain. Ordinary integer power need not admit them. Rust's integer pow method takes an unsigned exponent; JavaScript BigInt power rejects a negative exponent. Python instead converts integer operands to floating point for negative exponents. Sources: [Rust integer pow](https://doc.rust-lang.org/std/primitive.i32.html#method.pow), [ECMAScript BigInt exponentiation](https://tc39.es/ecma262/multipage/ecmascript-data-types-and-values.html#sec-numeric-types-bigint-exponentiate), and [Python power](https://docs.python.org/3/reference/expressions.html#the-power-operator).

A negative base with a noninteger exponent is another domain decision. Python's `(-4) ** 0.5` produces a complex value; JavaScript Number power produces NaN. For zero to a negative exponent, Python raises ZeroDivisionError, while JavaScript Number power on positive zero produces positive infinity. These are foreign contracts, not LiteScript defaults. Sources: [Python expressions](https://docs.python.org/3/reference/expressions.html#the-power-operator) and [ECMAScript Number exponentiation](https://tc39.es/ecma262/multipage/ecmascript-data-types-and-values.html#sec-numeric-types-number-exponentiate).

Keep four questions explicit: the power symbol, association, unary-minus grouping, and operand/result domains. The symbol and required grouping are now selected; association and complete domains remain open. The inspected V appendix lists that symbol but does not establish its signed-power cases; Odin, Dart, Rust, and Zig do not gain a numeric power operator through this comparison. No complex-number default, implicit integer-to-fractional promotion, NaN/infinity policy, or new fault trigger is selected for LiteScript here.

### Identity and evaluation remain independent contracts

Foreign unary `+` may promote, convert, or dispatch to user code. LiteScript's redundant entry prefix must retain its selected identity semantics instead of inheriting those operations. A future general unary operator facility would need a separate contract.

Associativity describes the expression tree. It does not by itself specify which effectful operand runs first. C and C++ demonstrate why LiteScript's left-to-right operand evaluation must stay explicit, even when borrowing their familiar arithmetic grouping.

## Verification and limits

[Captured local probes](research/arithmetic-operator-probes-2026-10-25.json) include exact source, commands, versions, compiler diagnostics, expected output, and observed output. Seven toolchains completed the applicable probes: Python 3.15.1, Node 24.16.0, Apple Clang 21 in C17 and C++20 modes, Rust 1.97.1, Java 25.0.3, and Swift 6.4. A separate Rust compilation confirmed rejection of unary `+`. All recorded expectations matched.

The probes cover basic precedence/left association, signed division/remainder, selected unary-plus behavior, and Python/JavaScript power examples. They do not test every profile or every numeric type. Go, C#, Kotlin, Dart, Lua, Odin, Zig, and V were reviewed through primary sources without local execution. C17/C++20 probes do not execute every provision of the newer drafts cited above. No installs or LiteScript execution were performed.

The same capture now includes three focused sign probes in Python, Node, and Rust. They check negative dividends/divisors, Rust Euclidean remainder, odd/even negative-base powers, Python/JavaScript negative exponents and domain outcomes, and Rust integer power. All captured expectations matched. Additional sign examples for Odin, Dart, and Zig remain primary-source findings rather than runtime verification. Four V 0.5.0 playground division/remainder cases are captured separately in the [signed table's data](research/signed-division-table-2026-10-25.json); no signed-power execution is claimed there.

## Related documents

- [Signed division, remainder, and modulo table](signed-division-table.md)
- [Operators and selected arithmetic grouping](operators.md#basic-arithmetic-grouping-selected)
- [Provisional grammar](grammar-sketch.md#basic-arithmetic-grouping-and-leading-plus)
- [Numbers](numbers.md)
- [Division](division.md)
- [Decision ledger](decisions-and-open-questions.md)
- [References](references.md)
