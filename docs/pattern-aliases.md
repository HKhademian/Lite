# Pattern aliases and duplicate names

Status: **reference comparison dated 2026-10-18; field aliases and duplicate-binding policy proposed, not selected**.

## Purpose

Keep a source field's name separate from the local name introduced by a pattern. This handles records that expose the same field name in different nested values, and lets the programmer avoid shadowing an outer name when desired.

Two fields named x are not themselves duplicate bindings. They become a binding collision only if the pattern attempts to introduce the same destination name twice in one simultaneous binding scope. Aliases can give the destinations distinct names.

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

This is an object-pattern fragment assuming exposed getters. The source field and the introduced variable are distinct. A typed variable subpattern can constrain the field while binding it, for example `Point(x: int xInside)`. Dart's exact getter effects, capture syntax, and wildcard rules are not selected for LiteScript. Source: [Dart object and variable patterns](https://dart.dev/language/pattern-types).

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

## Recommended duplicate-binding policy

- Require unique destination names within one simultaneous pattern, including nested parts and aliases. `(x, x)` would be rejected; it would not compare values or silently select the last binding.
- `_` remains a readable ordinary binding; repeated `_` within one pattern therefore needs the same duplicate policy. Aliases do not turn it into a wildcard.
- Preserve nested lexical shadowing and the separately selected left-to-right shadowing between loop receiver slots. Those are different binding contexts.
- Keep repeated names in distinct match arms independent. Conditional-chain rebinding needs its own scope policy.
- Define duplicate source-field selection separately. Giving one source field two local names must not silently duplicate ownership or repeat an effectful getter under an unspecified extraction contract.

The duplicate policy and alias punctuation remain recommendations pending a decision. Full record syntax, alias/type precedence, named versus positional patterns, field effects, and ownership still need formalization.

## Related concepts

- [Pattern context review](pattern-contexts.md#review-findings-and-decisions-to-settle-first).
- [Tuples and patterns](tuples-and-patterns.md), [identifiers](identifiers.md), and [pattern binding inference](pattern-binding-inference.md).
