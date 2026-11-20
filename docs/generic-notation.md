# Temporary generic notation

Status: **documentation convention clarified 2026-10-19; separate angle-bracket function type-parameter direction selected 2026-11-14**. The builtin `List<T>` slice is implemented. The function direction below is selected design, not compiler support or a complete generic grammar. Other type-family notation remains explanatory except where separately selected.

## Separate function type parameters

Selected 2026-11-14: a function's explicit type parameters belong in a
separate angle-bracket list, distinct from its ordinary callable input tuple.
The Kotlin-like separation gives readers a familiar visual distinction between
type parameters and ordinary inputs. An illustrative anonymous-function form is:

```text
first := fn <T>(items: [T]): T { items[0] }
```

This is the current design choice, made for readability and developer
familiarity; it may be revisited as the remaining language design develops.

`T` names a type parameter; it is not an ordinary input tuple component. The
function's ordinary input is `items`. The same name relates its element type
to the result. `[T]` is the previously selected full indexed-sequence contract,
including count and traversal; it is stronger than the minimal indexed-read
requirement that a local omitted-input function can infer. See [the indexed
contract](lite://doc/indexed-sequence-contract) and [local input inference](lite://doc/collection-function-signatures#local-inferred-indexing-and-explicit-public-contracts).

The `fn <T>(...)` example illustrates the selected separate-list direction; it
does not complete the declaration grammar, callable-type spelling, or parsing
rules. The direction applies to functions as values and does not require a
function name in its declaration. It does not decide the status or placement of
compile-time value parameters, first-class type values, type-family declaration
syntax, or whether any future feature can pass a type through a tuple.

Keep the selected ordinary tuple application boundary: `f(pair)` supplies one
tuple value and `f(...pair)` supplies its components. Introducing separate type
parameters does not require inserting a type into an ordinary input tuple or
unpacking a tuple-valued ordinary argument.

### Pending contract cases

These are specification examples, not executable passes:

- **element relationship:** in the function above, `T = Int` gives an `Int`
  result and `T = String` gives a `String` result, with suitable providers.
- **inferred call:** `first(numbers)` can infer `T` from an appropriately typed
  indexed input under the selected local-inference direction; the complete
  inference algorithm and ambiguity rules remain open.
- **tuple type:** a tuple type such as `(:Int, :String)` can be one type
  argument, rather than automatically becoming two type parameters.
- **union type:** `Int | String` can be one type argument, preserving the
  selected plain-union normalization and ordinary admission rules.
- **two types:** a function with type parameters `From` and `To` may relate
  one to its input and the other to its result; how to supply just one while
  inferring the other remains open.
- **one tuple input:** a function with a tuple-valued ordinary input continues
  to receive that value as one input; only explicit spread applies its
  components as separate inputs under existing call rules.
- **invalid type or contract:** a supplied type must satisfy an explicitly
  declared complete contract; incompatible ordinary values must not be admitted
  merely to make inference succeed. Exact inference and diagnostics are open.

Explicit call-site syntax, omitted or partial type arguments, result-context
inference, constraints, conflicts between type evidence, declaration scope,
shadowing, callable values, and recursive grammar remain open. In particular,
spellings such as `f<Int>(x)` or `f<Int | String>(x)` are examples to evaluate,
not selected calls. No implicit union should be inferred for differing inputs
without a separately selected inference rule.

FVP exception selected by the user, **2026-10-31**: adopt List<T> for this builtin
family in the [bounded INV-055 slice](lite://repo/research/investigations/INV-055-fvp-list-slice.md).
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

Except for the narrow List<T> approval above, read these as descriptions of type families and their inputs. The function-parameter direction above does not select type-family argument separators, declaration syntax, parameter kinds, or explicit application syntax.

The user selected a conditional type-boundary contract on 2026-10-23: if angle brackets are adopted for generic type application, grammatical type context must separate a closing > from an attached fallible-type ! suffix and any following initializer =. Box<Int>! = load(), Box<Int>!= load(), and Box<Int>!=load() preserve that boundary in a typed declaration; Box<Int> != load() has a detached suffix and is invalid shorthand. The separate function-parameter direction does not itself select generic type application syntax, expression operators, or complete token-splitting implementation. See [fallible-type shorthand attachment](lite://doc/fallible-types-and-error-composition#fallible-type-shorthand-attachment-selected).

The same convention covers capability examples such as `Iterable<Icon>`. A capability written in a parameter sketch does not settle whether the final spelling is a generic constraint or a runtime interface value, and it does not mandate boxing or dynamic dispatch. The future generic/interface review must distinguish those mechanisms explicitly.

In the array proposal, Float describes an element type and 3 describes an intended compile-time element count. Those play different conceptual roles. Showing them in one argument list does not settle whether the future language expresses them through generic parameters, compile-time functions, dedicated array syntax, or another mechanism. It also does not adopt another language's generic semantics merely by borrowing familiar punctuation.

## Preserve concepts without freezing punctuation

The 2026-10-24 rule makes a fresh [1, 2, 3] infer [Int; 3], superseding the earlier unconditional List default. This fixed-array notation does not select general angle-bracket generic declaration/application syntax. List<Int> now has the explicit builtin FVP exception above; other generic examples and runtime-array type spelling remain open. See [shape and inference decisions](lite://doc/tuple-array-shapes).

Likewise, future notation changes must preserve whichever array-length, slice-access, and type-identity contracts are selected. The current array/slice proposals do not themselves settle those contracts. Record syntax and already selected annotations remain separate decisions.

`Result<User, LoadError>` is conceptual type-family notation. The selected source fallibility form User ! LoadError and its postfix propagation rules retain their independent established status; this convention does not reopen them.

## Selected compatibility criterion

The selected [generic widening criterion](lite://doc/types-and-inference#generic-widening-requires-complete-compatibility) permits a value conversion only when the compiler can prove compatibility of the complete instantiated contracts. Int fitting Int | String does not automatically make an arbitrary G<Int> fit G<Int | String>; stored callbacks and other contracts can prevent it. This semantic criterion does not settle generic punctuation, variance declarations/inference, or the complete proof algorithm.

## Deferred generic design

The **2026-10-31** [INV-055 FVP proposal](lite://repo/research/investigations/INV-055-fvp-list-slice.md)
was explicitly approved for the builtin List<T> family after operation-name
selection. That bounded exception does not adopt angle brackets for other
families or settle their generic declaration/application design.

The future review should complete declaration and application syntax together, distinguish type inputs from compile-time value inputs, and define inference, defaults, constraints, specialization, and type identity. The separate function type-parameter direction above does not settle those topics.

The user subsequently selected general [compile-time evaluation and known-input
requirements](lite://doc/compile-time-evaluation). Compile-time-required inputs accept
only values known during compilation; that direction does not yet decide
whether compile-time value parameters belong in the generic angle-bracket list.

For now, keep one consistent explanatory notation and link to this convention. Beyond the explicit builtin List exception, the function direction is not an implementation or a settled generic grammar. Migrate explanatory examples only as the relevant source contracts are selected.

Related: [types and inference](lite://doc/types-and-inference), [arrays](lite://doc/arrays), [sequence families](lite://doc/sequence-types), [fallible types](lite://doc/fallible-types-and-error-composition), and [grammar sketch](lite://doc/grammar-sketch).
