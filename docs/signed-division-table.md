# Signed division, remainder, and modulo table

Reviewed **2026-10-25**. Each column supplies the same signed values to the row's expression. Most operands are native signed integers; JavaScript/TypeScript Number and BigInt are separated. The selected LiteScript contract is a design, not an implemented runtime.

The later [method and division revision proposal](arithmetic-methods-and-division-revision.md) has not changed the LiteScript rows below. The proposed truncating Int / Int and any replacement floor-division symbol must be accepted and migrated explicitly before those rows change. R was later consulted specifically for the punctuation-only spelling review; it is not included in this earlier 18-language matrix.

| Language | Operand type | Expression | Rule | pos:pos (7, 2) | pos:neg (7, -2) | neg:pos (-7, 2) | neg:neg (-7, -2) |
| --- | --- | --- | --- | ---: | ---: | ---: | ---: |
| [LiteScript](division.md) | Int | `a / b` | Fractional quotient | 3.5 | -3.5 | -3.5 | 3.5 |
| [LiteScript](division.md) | Int | `a // b` | Floor quotient | 3 | -4 | -4 | 3 |
| [LiteScript](division.md) | Int | `a % b` | Remainder (dividend sign) | 1 | 1 | -1 | -1 |
| [LiteScript](division.md) | Int | `a %% b` | Floor modulo (divisor sign) | 1 | -1 | 1 | -1 |
| [Odin](https://odin-lang.org/docs/overview/#operators) | int | `a / b` | Truncating quotient | 3 | -3 | -3 | 3 |
| [Odin](https://odin-lang.org/docs/overview/#operators) | int | `a % b` | Remainder (dividend sign) | 1 | 1 | -1 | -1 |
| [Odin](https://odin-lang.org/docs/overview/#operators) | int | `a %% b` | Floor modulo (divisor sign) | 1 | -1 | 1 | -1 |
| [Zig 0.15.2](https://ziglang.org/documentation/0.15.2/#divTrunc) | signed integer | `@divTrunc(a, b)` | Truncating quotient | 3 | -3 | -3 | 3 |
| [Zig 0.15.2](https://ziglang.org/documentation/0.15.2/#divFloor) | signed integer | `@divFloor(a, b)` | Floor quotient | 3 | -4 | -4 | 3 |
| [Zig 0.15.2](https://ziglang.org/documentation/0.15.2/#rem) | signed integer | `@rem(a, b)` | Remainder (dividend sign) | 1 | 1 | -1 | -1 |
| [Zig 0.15.2](https://ziglang.org/documentation/0.15.2/#mod) | signed integer | `@mod(a, b)` | Floor modulo (divisor sign) | 1 | -1 | 1 | -1 |
| [Rust](https://doc.rust-lang.org/reference/expressions/operator-expr.html) | i32 | `a / b` | Truncating quotient | 3 | -3 | -3 | 3 |
| [Rust](https://doc.rust-lang.org/reference/expressions/operator-expr.html) | i32 | `a % b` | Remainder (dividend sign) | 1 | 1 | -1 | -1 |
| [Rust](https://doc.rust-lang.org/std/primitive.i32.html#method.div_euclid) | i32 | `a.div_euclid(b)` | Euclidean quotient | 3 | -3 | -4 | 4 |
| [Rust](https://doc.rust-lang.org/std/primitive.i32.html#method.rem_euclid) | i32 | `a.rem_euclid(b)` | Euclidean modulo (nonnegative) | 1 | 1 | 1 | 1 |
| [V 0.5.0](https://play.vlang.io/) | int | `a / b` | Truncating quotient | 3 | -3 | -3 | 3 |
| [V 0.5.0](https://play.vlang.io/) | int | `a % b` | Remainder (dividend sign) | 1 | 1 | -1 | -1 |
| [Dart](https://dart.dev/language/operators) | int | `a / b` | Fractional quotient | 3.5 | -3.5 | -3.5 | 3.5 |
| [Dart](https://dart.dev/language/operators) | int | `a ~/ b` | Truncating quotient | 3 | -3 | -3 | 3 |
| [Dart](https://api.dart.dev/dart-core/num/remainder.html) | int | `a.remainder(b)` | Remainder (dividend sign) | 1 | 1 | -1 | -1 |
| [Dart](https://api.dart.dev/dart-core/num/operator_modulo.html) | int | `a % b` | Euclidean modulo (nonnegative) | 1 | 1 | 1 | 1 |
| [Python](https://docs.python.org/3/reference/expressions.html#binary-arithmetic-operations) | int | `a / b` | Fractional quotient | 3.5 | -3.5 | -3.5 | 3.5 |
| [Python](https://docs.python.org/3/reference/expressions.html#binary-arithmetic-operations) | int | `a // b` | Floor quotient | 3 | -4 | -4 | 3 |
| [Python](https://docs.python.org/3/reference/expressions.html#binary-arithmetic-operations) | int | `a % b` | Floor modulo (divisor sign) | 1 | -1 | 1 | -1 |
| [Lua 5.4](https://www.lua.org/manual/5.4/manual.html#3.4.1) | integer | `a / b` | Fractional quotient | 3.5 | -3.5 | -3.5 | 3.5 |
| [Lua 5.4](https://www.lua.org/manual/5.4/manual.html#3.4.1) | integer | `a // b` | Floor quotient | 3 | -4 | -4 | 3 |
| [Lua 5.4](https://www.lua.org/manual/5.4/manual.html#3.4.1) | integer | `a % b` | Floor modulo (divisor sign) | 1 | -1 | 1 | -1 |
| [Java](https://docs.oracle.com/javase/specs/jls/se25/html/jls-15.html#jls-15.17) | int | `a / b` | Truncating quotient | 3 | -3 | -3 | 3 |
| [Java](https://docs.oracle.com/javase/specs/jls/se25/html/jls-15.html#jls-15.17) | int | `a % b` | Remainder (dividend sign) | 1 | 1 | -1 | -1 |
| [Java](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/Math.html#floorDiv(int,int)) | int | `Math.floorDiv(a, b)` | Floor quotient | 3 | -4 | -4 | 3 |
| [Java](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/Math.html#floorMod(int,int)) | int | `Math.floorMod(a, b)` | Floor modulo (divisor sign) | 1 | -1 | 1 | -1 |
| [C](https://www.open-std.org/jtc1/sc22/wg14/www/docs/n3096.pdf) | signed int | `a / b` | Truncating quotient | 3 | -3 | -3 | 3 |
| [C](https://www.open-std.org/jtc1/sc22/wg14/www/docs/n3096.pdf) | signed int | `a % b` | Remainder (dividend sign) | 1 | 1 | -1 | -1 |
| [C++](https://eel.is/c++draft/expr.mul) | signed int | `a / b` | Truncating quotient | 3 | -3 | -3 | 3 |
| [C++](https://eel.is/c++draft/expr.mul) | signed int | `a % b` | Remainder (dividend sign) | 1 | 1 | -1 | -1 |
| [C#](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/operators/arithmetic-operators) | int | `a / b` | Truncating quotient | 3 | -3 | -3 | 3 |
| [C#](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/operators/arithmetic-operators) | int | `a % b` | Remainder (dividend sign) | 1 | 1 | -1 | -1 |
| [Go](https://go.dev/ref/spec#Integer_operators) | int | `a / b` | Truncating quotient | 3 | -3 | -3 | 3 |
| [Go](https://go.dev/ref/spec#Integer_operators) | int | `a % b` | Remainder (dividend sign) | 1 | 1 | -1 | -1 |
| [Swift](https://raw.githubusercontent.com/swiftlang/swift-book/main/TSPL.docc/LanguageGuide/BasicOperators.md) | Int | `a / b` | Truncating quotient | 3 | -3 | -3 | 3 |
| [Swift](https://raw.githubusercontent.com/swiftlang/swift-book/main/TSPL.docc/LanguageGuide/BasicOperators.md) | Int | `a % b` | Remainder (dividend sign) | 1 | 1 | -1 | -1 |
| [Kotlin](https://kotlinlang.org/docs/numbers.html#integer-division) | Int | `a / b` | Truncating quotient | 3 | -3 | -3 | 3 |
| [Kotlin](https://kotlinlang.org/api/core/kotlin-stdlib/kotlin/-int/rem.html) | Int | `a % b` | Remainder (dividend sign) | 1 | 1 | -1 | -1 |
| [Kotlin](https://kotlinlang.org/api/core/kotlin-stdlib/kotlin/floor-div.html) | Int | `a.floorDiv(b)` | Floor quotient | 3 | -4 | -4 | 3 |
| [Kotlin](https://kotlinlang.org/api/core/kotlin-stdlib/kotlin/mod.html) | Int | `a.mod(b)` | Floor modulo (divisor sign) | 1 | -1 | 1 | -1 |
| [Scala 3 (JVM)](https://www.scala-lang.org/api/current/scala/Int.html) | Int | `a / b` | Truncating quotient | 3 | -3 | -3 | 3 |
| [Scala 3 (JVM)](https://www.scala-lang.org/api/current/scala/Int.html) | Int | `a % b` | Remainder (dividend sign) | 1 | 1 | -1 | -1 |
| [JavaScript](https://tc39.es/ecma262/multipage/ecmascript-data-types-and-values.html) | Number | `a / b` | Fractional quotient | 3.5 | -3.5 | -3.5 | 3.5 |
| [JavaScript](https://tc39.es/ecma262/multipage/ecmascript-data-types-and-values.html) | Number | `a % b` | Remainder (dividend sign) | 1 | 1 | -1 | -1 |
| [JavaScript](https://tc39.es/ecma262/multipage/ecmascript-data-types-and-values.html) | BigInt | `a / b` | Truncating quotient | 3n | -3n | -3n | 3n |
| [JavaScript](https://tc39.es/ecma262/multipage/ecmascript-data-types-and-values.html) | BigInt | `a % b` | Remainder (dividend sign) | 1n | 1n | -1n | -1n |
| [TypeScript](https://tc39.es/ecma262/multipage/ecmascript-data-types-and-values.html) | number | `a / b` | Fractional quotient | 3.5 | -3.5 | -3.5 | 3.5 |
| [TypeScript](https://tc39.es/ecma262/multipage/ecmascript-data-types-and-values.html) | number | `a % b` | Remainder (dividend sign) | 1 | 1 | -1 | -1 |
| [TypeScript](https://tc39.es/ecma262/multipage/ecmascript-data-types-and-values.html) | bigint | `a / b` | Truncating quotient | 3n | -3n | -3n | 3n |
| [TypeScript](https://tc39.es/ecma262/multipage/ecmascript-data-types-and-values.html) | bigint | `a % b` | Remainder (dividend sign) | 1n | 1n | -1n | -1n |

## Reading the differences

- Truncating division rounds toward zero; floor division rounds toward negative infinity.
- Remainder uses a truncating quotient and follows the dividend's sign when nonzero.
- Floor modulo uses a floor quotient and follows the divisor's sign when nonzero.
- Euclidean modulo is nonnegative, including for negative divisors. Its quotient differs from floor division when the divisor is negative and the division is inexact.
- With positive dividends and positive divisors, several rules agree. The additional neg:pos column exposes differences that pos:pos and neg:neg can hide.

LiteScript's selected pair is // plus %%: a == b * (a // b) + (a %% b), mathematically. Its % supplies the separate truncating remainder. See [division, remainder, and modulo](division.md).

## Scope and evidence

The table covers all twelve established reference languages, the additional Java/C/C#/Go arithmetic references, JavaScript alongside TypeScript, and LiteScript: 18 language entries in total. It selects representative operators and named alternatives, rather than claiming every numeric library API has been enumerated. It compares small successful values, not zero divisors, overflow, unsigned types, overloaded custom types, or every floating-point remainder convention.

Every language label links to its primary source. Values are calculated from the associated rounding/remainder definitions; a calculated cell is not a claim that its language was executed. Earlier [local foreign-runtime probes](research/arithmetic-operator-probes-2026-10-25.json) cover subsets in Python, Node, C, C++, Rust, Java, and Swift. TypeScript rows describe JavaScript runtime semantics, not an independently executed TypeScript compilation. Scala 3 rows are scoped to JVM Int operations and were not locally executed.

V's four signed cases were additionally run in the [official playground](https://play.vlang.io/), which reported V 0.5.0 345b29d. Its observed quotient/remainder pairs were (3, 1), (-3, 1), (-3, -1), and (3, -1), in column order. This is a remote playground observation, not a locally installed V compiler or a guarantee about every V version. The [captured source, output, and table data](research/signed-division-table-2026-10-25.json) and [verification image](research/v-signed-division-2026-10-25.png) preserve that evidence.

Zig rows use the explicitly versioned 0.15.2 builtin contracts. The ordinary signed / and % operator forms have compile-time-positive restrictions in that reference, so the table uses the named signed operations instead. No local Zig execution is claimed. Java Math.floorDiv/floorMod and Kotlin floorDiv/mod are library operations, not extra infix operators. No helper from another language becomes a LiteScript builtin through this comparison.

The [arithmetic comparison](arithmetic-operators-comparison.md) discusses the wider language contracts and sources. Floating-point representation and exact LiteScript fault rules remain open.
