# Arithmetic operators across languages

Status: **primary-source comparison researched 2026-10-25; basic LiteScript arithmetic grouping selected; exponentiation and additional operators remain open**. This document compares language contracts. It does not establish a LiteScript parser or runtime.

## Selected LiteScript baseline

Within the selected arithmetic set, precedence runs from tighter to looser:

1. Prefix negation: `-a`.
2. Multiplicative operations: `*`, `/`, `//`, `%`.
3. Additive operations: binary `+`, `-`.

Binary operators at each level associate left to right. Parentheses override grouping. Thus `a - b - c` groups as `(a - b) - c`, and `a / b * c` as `(a / b) * c`. Associativity does not permit algebraic reassociation. Operands retain LiteScript's separate left-to-right evaluation contract.

The optional leading `+` at a complete additive-chain entry is identity punctuation, including for one operand. It preserves value and type without promotion, conversion, an implicit zero, or an extra operator invocation. Minus retains negation. No redundant leading `*`, `/`, `//`, `%`, or prospective power operator follows from that rule.

`/` produces a fractional quotient. Integer `//` rounds down; integer `%` is paired with that floor quotient and a nonzero remainder has the divisor's sign. These choices are independent of numeric representation and exact fault cases. See [operators](operators.md), [division](division.md), [leading separators](leading-separators.md), and [evaluation order](evaluation-order.md).

`**`, `^`, power updates, bitwise operators, and wrapping/saturating arithmetic are not selected. The precedence of negation relative to a future power operator is also unselected. A complete expression grammar still needs integration with calls, access, ranges, types, and recovery.

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

The inspected operator appendix lists numeric `**` above `* / %`, then `+ -`, and shows a negative dividend producing a negative remainder. That appendix does not settle power associativity or unary-minus interaction, so this review makes no claim about those cases. Sources: [operator appendix](https://docs.vlang.io/appendix-ii-operators.html) and [current source documentation](https://raw.githubusercontent.com/vlang/v/master/doc/docs.md). No V compiler was executed; do not infer a guarantee for every released version from development documentation.

## Design consequences for LiteScript

### Division and remainder must be chosen together

Negative values expose three distinct contracts:

- Floor quotient with paired remainder, already selected for LiteScript: `-7 // 2` is `-4`, `-7 % 2` is `1`, and `7 % -2` is `-1`.
- Truncating integer quotient with paired remainder, as in Java and Rust: the corresponding quotient is `-3`, with remainders `-1` and `1`.
- Euclidean modulo, as in Dart: both remainder examples produce `1`, including with a negative divisor.

These are semantic choices, not interchangeable names for the same operation. LiteScript need not add multiple everyday remainder spellings merely because another language provides them. Python/Lua are the closest comparisons for the selected integer floor/remainder pairing; their numeric representations and fault rules do not follow automatically.

`//` is also a lexical choice: several C-family references use it for line comments. LiteScript already reserves it for division and uses its own block-comment rules. Adjacent stars need equal care: C/C++ can parse multiplication followed by dereference; Zig 0.15.2 gives `**` an array meaning. Preserve the selected [comment token boundaries](comments.md) rather than importing another lexer.

### Power is the next independent decision

My recommendation, still a proposal, is `**` with right association if LiteScript adopts a numeric power operator. That gives `2 ** 3 ** 2` the familiar power-tower grouping `2 ** (3 ** 2)`. The comparison supports two serious unary-minus policies:

- Python/Lua-style precedence: ungrouped `-2 ** 2` means `-(2 ** 2)`, producing `-4`.
- JavaScript-style restriction: reject that spelling and require the author to choose `(-2) ** 2` or `-(2 ** 2)`.

The accepted basic ladder does not decide between them. The first follows conventional mathematical notation; the second forces the ambiguity into visible grouping. Either needs a separate grammar decision about signed exponents. Do not treat `^` as a universally familiar power symbol: it is bitwise XOR in Java, C, C++, C#, JavaScript, and Rust, while Lua uses it for power.

Power also needs operand/result typing, integer versus fractional exponents, negative bases, negative exponents, `0 ** 0`, zero to a negative exponent, overflow/precision, and exact typed-panic contracts. `**=` requires its own update decision. No decision here selects those behaviors, generic overloads, or new redundant leading operators.

### Identity and evaluation remain independent contracts

Foreign unary `+` may promote, convert, or dispatch to user code. LiteScript's redundant entry prefix must retain its selected identity semantics instead of inheriting those operations. A future general unary operator facility would need a separate contract.

Associativity describes the expression tree. It does not by itself specify which effectful operand runs first. C and C++ demonstrate why LiteScript's left-to-right operand evaluation must stay explicit, even when borrowing their familiar arithmetic grouping.

## Verification and limits

[Captured local probes](research/arithmetic-operator-probes-2026-10-25.json) include exact source, commands, versions, compiler diagnostics, expected output, and observed output. Seven toolchains completed the applicable probes: Python 3.15.1, Node 24.16.0, Apple Clang 21 in C17 and C++20 modes, Rust 1.97.1, Java 25.0.3, and Swift 6.4. A separate Rust compilation confirmed rejection of unary `+`. All recorded expectations matched.

The probes cover basic precedence/left association, signed division/remainder, selected unary-plus behavior, and Python/JavaScript power examples. They do not test every profile or every numeric type. Go, C#, Kotlin, Dart, Lua, Odin, Zig, and V were reviewed through primary sources without local execution. C17/C++20 probes do not execute every provision of the newer drafts cited above. No installs or LiteScript execution were performed.

## Related documents

- [Operators and selected arithmetic grouping](operators.md#basic-arithmetic-grouping-selected)
- [Provisional grammar](grammar-sketch.md#basic-arithmetic-grouping-and-leading-plus)
- [Numbers](numbers.md)
- [Division](division.md)
- [Decision ledger](decisions-and-open-questions.md)
- [References](references.md)
