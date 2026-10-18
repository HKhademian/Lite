# Pattern aliases and duplicate names

Status: **reference comparison dated 2026-10-18; field aliases proposed; ordered pattern shadowing selected**.

## Purpose

Keep a source field's name separate from the local name introduced by a pattern. This handles records that expose the same field name in different nested values, and lets the programmer avoid shadowing an outer name when desired.

Two source fields named x do not have to introduce the same local name. Aliases can keep both destinations accessible. LiteScript also allows repeated destination names within a pattern through ordered shadowing; the last binding is visible. This differs from the uniqueness rules in some reference languages below.

## JavaScript: import aliases versus destructuring names

```javascript
import { x as xInside } from "some-module";

const { x: xInside } = point;
```

JavaScript uses as for named import aliases. Object destructuring uses a colon between the property key and its binding pattern. A nested example avoids same-named destination bindings:

```javascript
const {
    left: { x: leftX },
    right: { x: rightX }
} = pair;
```

These mechanisms rename bindings; they do not make two simultaneous lexical bindings of the same destination name into distinct variables. Sources: [ECMAScript import grammar](https://tc39.es/ecma262/multipage/ecmascript-language-scripts-and-modules.html#sec-imports), [ECMAScript binding patterns](https://tc39.es/ecma262/multipage/ecmascript-language-statements-and-declarations.html#sec-destructuring-binding-patterns), [JavaScript destructuring examples](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Destructuring#assigning_to_new_variable_names).

## Rust: field selector followed by a pattern

```rust
Point { x: x_inside, y: y_inside }
```

This is a pattern fragment assuming an appropriate struct. Field shorthand x means the same field-and-binding-name combination; writing the full field/pattern form chooses another local name. Rust requires identifier bindings to be unique within one pattern. Its separate `whole @ subpattern` binds the whole matched value while checking a subpattern; that is different from renaming a field. Source: [Rust patterns](https://doc.rust-lang.org/reference/patterns.html).

## Dart: named getter and variable subpattern

```dart
Point(x: var xInside, y: var yInside)
```

This is an object-pattern fragment assuming exposed getters. The source field and the introduced variable are distinct. A typed variable subpattern can constrain the field while binding it, for example `Point(x: int xInside)`. Dart's exact getter effects and capture syntax are not selected for LiteScript. Source: [Dart object and variable patterns](https://dart.dev/language/pattern-types).

## Python: keyword field plus capture pattern

```python
case Point(x=x_inside, y=y_inside):
    process(x_inside, y_inside)
```

This assumes an appropriate class. Keyword field names select attributes and the right-hand patterns introduce local names. Python prohibits binding the same name twice within one pattern; alternative branches have their own binding-set rules. Its capture lifetime and dynamic matching semantics differ from LiteScript. Source: [Python patterns](https://docs.python.org/3/reference/compound_stmts.html#patterns).

## Kotlin: positional destructuring names

```kotlin
val (x, xInside) = pair
```

Names are chosen for positional component values rather than copied automatically from source fields. An additional field alias is unnecessary in this form. Its component-operator mechanism is not a general structural-pattern contract for LiteScript. Source: [Kotlin destructuring](https://kotlinlang.org/docs/destructuring-declarations.html).

## LiteScript recommendation

For named-field patterns, consider:

```text
field as localName
field as localName: Type
```

The field is a selector, not a local declaration in addition to localName. Only the chosen local name is introduced. A following type constraint would test and narrow the selected value without conversion. Alias naming must not alter the selected source value, inference, visibility, or ownership permissions.

For illustration, assuming Point is a record with one exposed x field, a possible future record-pattern form could be:

```text
match pair {
    (Point(x as leftX), Point(x as rightX)) {
        process(leftX, rightX)
    }
}
```

This illustrates a proposal, not selected record-pattern grammar. It would give distinct local names to two source fields both named x. Ordinary positional tuple patterns already let the programmer choose distinct names without an alias keyword.

The benefit of as is keeping source-to-local naming distinct from LiteScript's `binding: Type`. Do not assume the JavaScript/Rust field-colon spelling drops into the existing typed and whole-value colon patterns without a grammar decision. In this candidate, as is followed by a binding name and does not perform a type cast.

## Selected duplicate-binding policy

Repeated destination names within one pattern are permitted. Bind in recursive written order; the later binding shadows the earlier one. This includes `_`, which is an ordinary readable name with permission to be unused. `(x, x)` binds both components and exposes the second as x; it does not compare them. The earlier recommendation to reject duplicates is superseded. See [pattern binding and shadowing](pattern-shadowing.md).

Aliases remain useful when both selected values must stay accessible. The proposed `field as localName` binds only localName; it does not also introduce the source field's name. If alias grammar is adopted, its destination participates in the same ordering rule.

Repeated names in distinct match arms remain independent. Rebinding across separate conditional-chain operands is still open, as are full record syntax, alias/type precedence, named versus positional patterns, field effects, and ownership. Define duplicate source-field selection separately: selecting one source field twice must not silently duplicate ownership or repeat an effectful getter under an unspecified extraction contract.

## Related concepts

- [Pattern context review](pattern-contexts.md#review-findings-and-decisions-to-settle-first).
- [Tuples and patterns](tuples-and-patterns.md), [identifiers](identifiers.md), and [pattern binding inference](pattern-binding-inference.md).
