# Implementation status

Use the [specification index](lite://spec) for the selected language design and
the [Shipped Handbook](lite://handbook/overview-and-setup) for supported usage.
The [compiler overview](lite://doc/compiler/overview) and [bootstrap guide](lite://doc/compiler/bootstrap-readme)
describe native C11 and TypeScript self-hosting and seed verification.

## Verified examples

The documentation migration ran these cases on both generated targets on
2026-11-26. The [documentation registry](lite://repo/config/documentation.json)
links the pages and manifest IDs used for the website's example badges.

- [First program](lite://doc/start-here) · [Double-sum case](lite://repo/language/verifications/artifacts/examples/foundations/io/double-sum.json)
- [UTF-8 round trip](lite://handbook/numbers-operators-and-strings#utf-8-round-trip) · [Showcase case](lite://repo/language/verifications/artifacts/showcases/foundations/strings/strings-and-unicode.json)
- [UTF-8 feature case](lite://repo/language/verifications/features/core/text/unicode-and-format.json)
  also passed on TS and C11, including invalid UTF-8 detection.

A badge refers to an example linked by the document. Backend or host
coverage for other examples follows their own verification evidence.

## Selected behavior awaiting support

On the documentation baseline revision `6bb53592`, both compilers supplied
zero on the unmatched path of a [partial initializer](lite://doc/conditionals#no-final-else-guarded-update).
The selected rule leaves the binding uninitialized. Both rejected the
[conditional payload guard](lite://doc/conditionals#pattern-binding-followed-by-guards),
[unaliased import](lite://doc/modules-and-packages#import-expansion-and-re-exports),
and [omitted compile-time parameter annotation](lite://doc/generic-notation#explicit-generic-names-and-inferred-parameter-declarations)
used in the baseline probes. See the [preload design](lite://doc/packages-and-preload)
and [standalone block draft](lite://doc/blocks-and-results#standalone-executable-blocks)
for their status.
