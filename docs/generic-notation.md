# Temporary generic notation

Status: **documentation convention clarified by the user, 2026-10-19**. Generic concepts can be discussed before their source syntax is designed. Angle-bracket examples are temporary explanatory notation, not adopted LiteScript grammar.

## How to read current examples

```text
Array<Float, 3>
List<Int>
Slice<User>
Option<User>
Result<User, LoadError>
```

Read these as descriptions of type families and their inputs. They do not select angle brackets, argument separators, declaration syntax, parameter kinds, or explicit application syntax.

In the array proposal, Float describes an element type and 3 describes an intended compile-time element count. Those play different conceptual roles. Showing them in one argument list does not settle whether the future language expresses them through generic parameters, compile-time functions, dedicated array syntax, or another mechanism. It also does not adopt another language's generic semantics merely by borrowing familiar punctuation.

## Preserve concepts without freezing punctuation

The selected growable List default for [1, 2, 3] is a semantic decision. Calling its inferred type `List<Int>` in prose does not select how a programmer will explicitly write or define that type application.

Likewise, future notation changes must preserve whichever array-length, slice-access, and type-identity contracts are selected. The current array/slice proposals do not themselves settle those contracts. Record syntax and already selected annotations remain separate decisions.

`Result<User, LoadError>` is conceptual type-family notation. The selected source fallibility form User ! LoadError and its postfix propagation rules retain their independent established status; this convention does not reopen them.

## Deferred generic design

The future review should consider declaration and application syntax together, distinguish type inputs from compile-time value inputs, and define inference, defaults, constraints, specialization, and type identity. These are topics for that review, not newly selected features or a replacement syntax proposal.

For now, keep one consistent explanatory notation and link to this convention. Do not implement or treat the examples as a settled generic grammar. Once a source design is selected, migrate the examples together and retain this record as historical context.

Related: [types and inference](types-and-inference.md), [arrays](arrays.md), [sequence families](sequence-types.md), [fallible types](fallible-types-and-error-composition.md), and [grammar sketch](grammar-sketch.md).
