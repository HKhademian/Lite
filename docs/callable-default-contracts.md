# Public omission contracts and implementation defaults

Status: **selected 2026-10-25 for ordinary value parameters; language design, not compiler/runtime verification**.

## Public contract and implementation responsibilities

The public callable contract records whether an input may be omitted. The implementation owns the default expression used to supply that missing input. The public contract does not prescribe the expression or freeze its resulting value.

```text
one := fn(n: Int = 1): Int { n * 10 }
two := fn(n: Int = 2): Int { n * 10 }

one();  /* 10 */
two();  /* 20 */
```

These declarations infer public contracts admitting omission of n. They have the same ordinary Int input, Int result, and omission capability; the different default expressions do not distinguish their public callable types. Existing label, type, access, and failure-contract requirements still apply. Public omission capability is now written = ... after a fixed ordinary input type, as specified below.

If a stored omission-capable operation holds one, operation() uses one's default and yields 10. Replacing it with compatible two makes a subsequent operation() use two's default and yield 20. The replacement changes implementation behavior while retaining the public omission contract. No public default of 1 is injected into two.

The outcomes here are designed examples, not executed LiteScript tests. Replacement is an ordinary compatible assignment; this selection introduces no separate API for mutating a callable's default expression in place.

## Public omission marker

Selected on **2026-10-25**: use = ... after an ordinary fixed input's type in a public function type to record omission permission, without exposing a default expression. The form works for named and unnamed inputs:

```text
fn(n: Int): Int         /* required named input */
fn(n: Int = ...): Int  /* omission-capable named input */
fn(Int = ...): Int     /* omission-capable unnamed input */
```

These are function-type fragments. The marker consists of the existing = and ... tokens; =... and = ... have the same meaning. It belongs to the input contract and does not alter Int or add Unit, Option, or an uninitialized state.

An implementation still writes its actual default expression:

```text
var operation: fn(n: Int = ...): Int =
    fn(n: Int = 1): Int { n * 10 }

operation();  /* 10 */

operation = fn(n: Int = 2): Int { n * 10 }
operation();  /* 20 */
```

The public type stays the same under this otherwise compatible replacement. The selected implementation supplies the default; the public marker does not supply a value, infer an input type, or freeze the expression.

Omission-capable fixed inputs need not form a trailing suffix. For example, fn(left: Int = ..., right: Int): Int permits omitting left when right is supplied by name, under the existing named-input routing rules. Right remains required. This does not add a positional hole or an omission token at a call site.

The ... after = is a declaration marker only in a public function-type input. It is not an executable expression or a placeholder satisfying an implementation's default-provider obligation. Writing fn(n: Int = ...) { n } does not provide a default; an implementation must use an otherwise valid expression. Similarly, f(n = ...) cannot request omission: leave the input absent instead. Existing ...pack spread and ...rest declarations retain their prefix roles and required operands. This extension does not enable marker defaults on variadic or permission-bearing inputs.

The alternative = ? is not selected for public omission; = ? retains its existing reservation/no-value roles. Nor is a name-side n? marker introduced. The chosen type-side = ... spelling works consistently for unnamed inputs and does not add another meaning to ?.

Python's typing specification provides a matching notation for recording a default's presence without its value. Source checked 2026-10-25: [default argument values](https://typing.python.org/en/latest/spec/callables.html#default-argument-values). Its other parameter and runtime rules are not adopted by this comparison.

## Required interfaces hide optional supply

An expected or explicitly written required-input contract continues to require that input, even when its implementation has a default:

```text
required: fn(n: Int): Int = one;
required(3);  /* 30 */
required();   /* rejected: this public contract requires n */
```

The shown fn(n: Int): Int spelling has a required input. The default behind the value does not enable omission through that view. This selects the omission dimension of compatibility; it does not complete general callable conversion, variance, label adaptation, captures, or representation.

Likewise, in the existing contextual example:

```text
handler: fn(Int | String): Int = fn(value = 3) { 0 }
handler(7);  /* valid */
handler();   /* rejected: expected contract requires its input */
```

The default remains statically checked against Int | String, but cannot override the expected required-input contract or narrow that input to Int.

## Compatibility obligations

For otherwise compatible ordinary input/result/access contracts:

- A required-input public contract can be implemented by a required-input implementation.
- A required-input public contract can also use an implementation with a default. The public contract still requires the argument.
- An omission-capable public contract requires an implementation that supplies a valid declared default for every input that contract allows callers to omit.
- An implementation lacking such a default cannot satisfy the omission-capable contract merely because its input type has a zero value. Reject that assignment or replacement; do not silently create a default or wrapper.

The same obligation applies when passing, returning, or replacing callable values. A value known only through a required-input contract does not acquire public omission capability from a hidden implementation default. Broader conversions or explicit adapters remain separate.

Different compatible implementation defaults can produce different values or perform different otherwise valid effects. Every default must still fit the established input type, failure contract, and ordinary access/initialization obligations. Changing a default from 1 to 2 preserves an inferred Int input; changing it to "two" can change an independently inferred input to String and therefore break compatibility with an Int contract. Implementation ownership does not authorize changing a fixed public type.

## Call preparation still runs defaults before invocation

Omission permission is checked against the public contract, and compatibility ensures a provider exists. The default expression comes from the callable implementation selected when the callee is evaluated once. Subsequent preparation does not reselect a different implementation merely because a caller variable holding a callable changes.

Keep [selected timing](evaluation-order.md#default-argument-evaluation-selected): evaluate the callee, supplied expressions in written order and finish routing, then only missing applicable defaults in declaration order, then invoke. Owning the expression does not move its evaluation into the user body, evaluate it at definition time, cache its first result, or make it a caller-owned expression.

Supplied final inputs skip their defaults. Permitted spread replacement, [earlier-parameter reads](parameter-default-inference.md#defaults-may-read-earlier-parameters), static default validation, ordinary copies, and entry-time permission/initialization checks retain their contracts. Both ordinary invocation and intrinsic .call use the same public omission checks and selected implementation's defaults. No missing input receives implicit zero.

## Remaining boundaries

The public = ... omission marker is selected. Complete function-type/header grammar, recursive/variadic/pattern defaults, general callable compatibility beyond omission, public label versus local receiver-name integration, lexical lookup/captures, and permission-bearing defaults remain separate. No new ABI, storage field, closure layout, implicit reference, adapter, or runtime missing-default fallback is selected. Reference syntax, memory safety, ownership/lifetimes, alias enforcement, and resources remain deferred.

Zero-initialized callables keep their existing successful input-preparation rule whenever an applicable default provider is established. How zero construction of an omission-capable function type supplies implementation-owned default expressions remains a follow-up design question. The public omission flag alone does not provide an expression, and a zero-result body is not a default provider. Do not claim that this selection supplies that missing construction rule.

## Related documents

- [Parameter default inference](parameter-default-inference.md)
- [Argument omission](union-parameter-defaults.md)
- [Functions](functions.md#omitted-value-arguments)
- [Callable input packs](callable-input-packs.md)
- [Evaluation order](evaluation-order.md#default-argument-evaluation-selected)
- [Zero-initialized functions](zero-initialization.md#zero-initialized-functions)
