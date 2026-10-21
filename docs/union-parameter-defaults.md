# Omitted arguments for union parameters

Status: **open review, 2026-10-21**. Local multi-member union declarations require a value initializer or explicit reservation, and conditional union results require a fallback on unmatched paths. The general omitted-value-argument rule still needs a corresponding union exception.

## Concrete case

```text
consume := fn(value: A | B): Unit {}

consume()         /* proposed: rejected without a declared default */
consume(make_a())  /* supplies an initialized A */
```

Assume A and B are distinct normalized members and make_a returns a valid A. The ordinary parameter accepts initialized values and preserves their active identity. Omitting it would otherwise request zero(A | B), which has no explicitly chosen member. An unused input or a zero-initialized callable does not by itself make an invalid incoming value legal.

## Recommendation

For an ordinary value parameter whose resolved type is a normalized multi-member plain union, permit omission only when an applicable declared default supplies an initialized compatible value. Without such a default, require the caller to supply an argument. Do not choose a first/canonical member, manufacture an empty union, or pass uninitialized storage.

A declared default such as a valid A{} record construction explicitly supplies member A. An existing compatible union default can preserve whichever active member it holds. This is a semantic example, not selection of parameter-default grammar. Bare 0 cannot be used as an undirected union-default request to evade the explicit-member restriction. = ? is a declaration reservation marker, not an ordinary parameter value or implicit output-only parameter.

The supplied argument takes precedence over the default. Ordinary non-union zero defaults remain as selected: an Int parameter with no declared default can still receive integer zero when omitted. A parameter resolving to Unit has its Unit zero. A | Unit remains a multi-member union and receives no implicit Unit preference. Normalize aliases and duplicates before applying the rule; A | A follows A's resulting contract.

## Boundaries

No choice is selected yet. Complete default-expression syntax, evaluation scope/timing, and defaults attached to callable signatures versus implementations remain open. The proposal says an applicable declared default must exist; it does not decide where the default lives or require inspecting an implementation body at runtime. Caller-access parameters, named-argument grammar, patterns, generic constraints, and output construction remain separate.

Reserved local storage must be initialized before it can be supplied as an ordinary argument. A caller cannot request omission and thereby bypass that requirement. Normal callee and supplied-argument evaluation rules remain intact; this review does not define default-expression evaluation order or add an error channel.

Alternatives are to prohibit omission for every union parameter even with a declared default, or reopen automatic member selection. The recommendation retains explicitly declared useful defaults while preventing a hidden union-zero decision. The general non-union omission rule is not reopened by this review.

Zero-callable results, union-valued record fields, and loop accumulator initialization still need their own creation policies.

## Modern references

Checked 2026-10-21. [Odin default parameters](https://odin-lang.org/docs/overview/#default-values) use explicitly declared defaults when arguments are omitted, with documented compile-time restrictions. This supports the distinction between a declared default and an implicit member choice; LiteScript's expression restrictions/timing remain its own open decisions. [Rust E0061](https://doc.rust-lang.org/error_codes/E0061.html) requires the supplied argument count to match the signature rather than providing ordinary optional arguments. Neither rule supplies an implicit zero member for LiteScript unions.
