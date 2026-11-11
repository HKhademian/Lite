# Temporary generic notation

Status: **documentation convention clarified by the user, 2026-10-19**. Generic concepts can be discussed before their source syntax is designed. Angle-bracket examples are temporary explanatory notation except for the explicitly approved builtin FVP List<T> family below; general generic grammar remains unselected.

FVP exception selected by the user, **2026-10-31**: adopt List<T> for this builtin
family in the [bounded INV-055 slice](../research/investigations/INV-055-fvp-list-slice.md).
The igniter supports existing scalar/flat-tuple elements and explicit receiving
construction. This does not adopt general generic declarations/application,
other families, constraints or specialization infrastructure.

## How to read current examples

```text
Array<Float, 3>
List<Int>
Slice<User>
Option<User>
Result<User, LoadError>
```

Except for the narrow List<T> approval above, read these as descriptions of type families and their inputs. They do not select angle brackets, argument separators, declaration syntax, parameter kinds, or explicit application syntax.

The user selected a conditional type-boundary contract on 2026-10-23: if angle brackets are adopted for generic source syntax, grammatical type context must separate a closing > from an attached fallible-type ! suffix and any following initializer =. Box<Int>! = load(), Box<Int>!= load(), and Box<Int>!=load() preserve that boundary in a typed declaration; Box<Int> != load() has a detached suffix and is invalid shorthand. This reserves the attachment behavior without selecting generic application syntax, expression operators, or complete token-splitting implementation. See [fallible-type shorthand attachment](fallible-types-and-error-composition.md#fallible-type-shorthand-attachment-selected).

The same convention covers capability examples such as `Iterable<Icon>`. A capability written in a parameter sketch does not settle whether the final spelling is a generic constraint or a runtime interface value, and it does not mandate boxing or dynamic dispatch. The future generic/interface review must distinguish those mechanisms explicitly.

In the array proposal, Float describes an element type and 3 describes an intended compile-time element count. Those play different conceptual roles. Showing them in one argument list does not settle whether the future language expresses them through generic parameters, compile-time functions, dedicated array syntax, or another mechanism. It also does not adopt another language's generic semantics merely by borrowing familiar punctuation.

## Preserve concepts without freezing punctuation

The 2026-10-24 rule makes a fresh [1, 2, 3] infer [Int; 3], superseding the earlier unconditional List default. This fixed-array notation does not select general angle-bracket generic declaration/application syntax. List<Int> now has the explicit builtin FVP exception above; other generic examples and runtime-array type spelling remain open. See [shape and inference decisions](tuple-array-shapes.md).

Likewise, future notation changes must preserve whichever array-length, slice-access, and type-identity contracts are selected. The current array/slice proposals do not themselves settle those contracts. Record syntax and already selected annotations remain separate decisions.

`Result<User, LoadError>` is conceptual type-family notation. The selected source fallibility form User ! LoadError and its postfix propagation rules retain their independent established status; this convention does not reopen them.

## Selected compatibility criterion

The selected [generic widening criterion](types-and-inference.md#generic-widening-requires-complete-compatibility) permits a value conversion only when the compiler can prove compatibility of the complete instantiated contracts. Int fitting Int | String does not automatically make an arbitrary G<Int> fit G<Int | String>; stored callbacks and other contracts can prevent it. This semantic criterion does not settle generic punctuation, variance declarations/inference, or the complete proof algorithm.

## Deferred generic design

The **2026-10-31** [INV-055 FVP proposal](../research/investigations/INV-055-fvp-list-slice.md)
was explicitly approved for the builtin List<T> family after operation-name
selection. That bounded exception does not adopt angle brackets for other
families or settle their generic declaration/application design.

The future review should consider declaration and application syntax together, distinguish type inputs from compile-time value inputs, and define inference, defaults, constraints, specialization, and type identity. These are topics for that review, not newly selected features or a replacement syntax proposal.

For now, keep one consistent explanatory notation and link to this convention. Beyond the explicit builtin List exception, do not implement or treat the examples as a settled generic grammar. Once a source design is selected, migrate the examples together and retain this record as historical context.

Related: [types and inference](types-and-inference.md), [arrays](arrays.md), [sequence families](sequence-types.md), [fallible types](fallible-types-and-error-composition.md), and [grammar sketch](grammar-sketch.md).
