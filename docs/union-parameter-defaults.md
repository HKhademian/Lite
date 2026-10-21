# Argument omission requires declared defaults

Status: **selected 2026-10-21, applying to all function argument types**. The user broadens the proposed union exception: argument omission is always rejected unless an applicable default is explicitly declared. This supersedes automatic zero argument defaults, including for Int and Unit. Default grammar, timing, and signature-versus-implementation placement remain open.

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

An applicable explicitly declared default allows omission and must produce a valid compatible value. A supplied argument takes precedence. For a union, a valid A{} record default explicitly supplies member A; an initialized compatible union default preserves whichever member it holds. These semantic examples do not select parameter-default syntax.

No implicit first/canonical member, Unit preference, empty union, automatic zero, or uninitialized ordinary input follows from omission. Bare 0 cannot evade the selected undirected union-initialization restriction. = ? remains a declaration reservation marker, not a usable default parameter value.

## Callable and initialization boundaries

The rule applies even when a parameter is unused, unnamed in a contextual lambda, or accepted by a zero-initialized callable. Those implementation choices do not erase the declared input contract. A zero callable still evaluates supplied arguments normally and returns its declared result zero under the separate result rule; union-valued zero-callable results remain a pending creation-policy case.

Reserved local storage must be initialized before it can be passed as an ordinary value. Caller-access permissions and writable-location requirements still apply. The explicit-default requirement does not independently authorize default mut/var arguments or an output-only construction API.

Local variable initialization, record-field construction defaults, conditional fallback, and callable result initialization remain separate. The user changed function argument omission, not every use of the word default in the language.

## Remaining default-expression decisions

Complete syntax, expression eligibility, evaluation scope/timing, complete recursive named-call grammar, and defaults in callable signatures versus implementations remain to be formalized. Core named-call routing and validation are already selected. The omission decision is nevertheless selected: without an applicable explicitly declared default, reject it. Do not restore the earlier zero fallback while those details await design.

## Modern references

Checked 2026-10-21. [Odin default parameters](https://odin-lang.org/docs/overview/#default-values) use explicitly declared defaults when arguments are omitted, with documented compile-time restrictions. This supports the distinction between a declared default and an implicit member choice; LiteScript's expression restrictions/timing remain its own open decisions. [Rust E0061](https://doc.rust-lang.org/error_codes/E0061.html) requires the supplied argument count to match the signature rather than providing ordinary optional arguments. Neither rule supplies an implicit zero member for LiteScript unions.
