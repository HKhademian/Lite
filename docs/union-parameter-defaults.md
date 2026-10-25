# Argument omission and implementation-owned handling

Status: **selected 2026-10-21, applying to all function argument types**. The user broadens the proposed union exception: argument omission is rejected without public permission and valid implementation handling. Ordinary user implementations require applicable declared defaults; zero-callable omission now has a selected no-execution rule. This supersedes automatic zero argument defaults, including for Int and Unit. Default timing is selected on 2026-10-25; ordinary default-based type inference is now selected separately; earlier ordinary parameter dependencies are now selected; complete grammar, general lexical lookup/captures, access-aware dependencies, and complete public omission-marker grammar remain separate. The public marker = ... is selected for ordinary fixed inputs; see [public omission marker](callable-default-contracts.md#public-omission-marker). The public contract controls omission while the selected implementation owns compatible default expressions; see [public omission contracts and implementation defaults](callable-default-contracts.md).

## Required arguments without defaults

```text
consume := fn(value: A | B): Unit {}
consume()         /* rejected: no declared default */
consume(make_a())  /* supplies an initialized A */

double := fn(value: Int): Int { value * 2 }
double()          /* rejected: no declared default */
double(0)         /* explicitly supplied zero */
```

Assume A and B are distinct normalized members and make_a returns a valid A. A supplied union value preserves its active member. An ordinary parameter always receives an initialized compatible value; uninitialized storage is not an argument value.

The same omission restriction applies to Unit, records, aliases, and generic parameters once their contracts are established. Supporting zero or declared-default construction for a type does not declare a default for each parameter of that type. A genuinely zero-input signature needs no arguments: this is not omission of a required parameter.

## Declared defaults

For an ordinary user implementation, an applicable explicitly declared default supplies an input the public contract permits omitting and must produce a valid compatible value. A supplied argument takes precedence. For a union, a valid A{} record default explicitly supplies member A; an initialized compatible union default preserves whichever member it holds. These semantic examples do not select parameter-default syntax.

No implicit first/canonical member, Unit preference, empty union, automatic zero, or uninitialized ordinary input follows from omission. Bare 0 cannot evade the selected undirected union-initialization restriction. = ? remains a declaration reservation marker, not a usable default parameter value.

## Callable and initialization boundaries

The rule applies even when a parameter is unused, unnamed in a contextual lambda, or accepted by a zero-initialized callable. Those implementation choices do not erase the declared input contract. A zero callable still evaluates supplied arguments normally, but needs no actual default definition, runs no default expressions, and returns its declared result zero under [zero-callable omission](callable-default-contracts.md#zero-callable-omission-selected); union-valued zero-callable results remain a pending creation-policy case.

Reserved local storage must be initialized before it can be passed as an ordinary value. Caller-access permissions and writable-location requirements still apply. The explicit-default requirement does not independently authorize default mut/var arguments or an output-only construction API.

Local variable initialization, record-field construction defaults, conditional no-match behavior, and callable result initialization remain separate. The user changed function argument omission, not every use of the word default in the language.

## Public omission and implementation defaults

Selected 2026-10-25: for ordinary inputs, the public callable contract says whether an argument may be omitted, while the implementation owns the default expression. Replacing an otherwise compatible callable can change the default value/effects without changing its public omission contract. A required fn(n: Int): Int view still requires n; an omission-capable view requires compatible omission handling. Ordinary user implementations need actual defaults; the zero implementation instead follows the no-execution rule and needs no default definition. This settles the omission dimension of callable compatibility while selecting = ... after an ordinary fixed input type as the public omission marker while leaving full grammar and broader conversions open. See [public omission contracts and implementation defaults](callable-default-contracts.md). The [zero-callable omission](callable-default-contracts.md#zero-callable-omission-selected) rule is now selected: the zero implementation needs no expression provider and may treat an omitted TP input conceptually as zero(TP), without materialization. A possible internal non-public unvalued state remains deferred; public undefined semantics are not introduced.

## Remaining default-expression decisions

Call-time default timing is selected: evaluate the callee, supplied expressions in source order, then only missing defaults in declared slot order before invocation. For the b, c, a, d signature with supplied d/c, execute new_d(), new_c(), default_b(), default_a(). See [default timing](evaluation-order.md#default-argument-evaluation-selected). Ordinary [parameter-default inference](parameter-default-inference.md) is selected. Ordinary [earlier-parameter defaults](parameter-default-inference.md#defaults-may-read-earlier-parameters) are selected: read final prepared earlier inputs and reject self/later references regardless of call arguments. Complete syntax, access-aware expression eligibility/dependencies, general lexical lookup/captures, recursive named-call grammar, and complete public omission-marker integration remain to be formalized; the marker itself is selected as the = ... token sequence. Default ownership is selected in [public omission contracts and implementation defaults](callable-default-contracts.md): public permission to omit requires compatible implementation handling, while required interfaces hide omission. Core named-call routing and validation are already selected. The omission decision is nevertheless selected: without valid public omission permission and implementation handling, reject it. Ordinary user implementations still require applicable declared defaults; zero-callable omission is the selected specific case. Do not restore the earlier zero fallback while those details await design.

## Modern references

Checked 2026-10-21. [Odin default parameters](https://odin-lang.org/docs/overview/#default-values) use explicitly declared defaults when arguments are omitted, with documented compile-time restrictions. This supports the distinction between a declared default and an implicit member choice; LiteScript's expression restrictions/scope remain separate, while its selected [default evaluation order](evaluation-order.md#default-argument-evaluation-selected) supplies call-time timing. [Rust E0061](https://doc.rust-lang.org/error_codes/E0061.html) requires the supplied argument count to match the signature rather than providing ordinary optional arguments. Neither rule supplies an implicit zero member for LiteScript unions.
