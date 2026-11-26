# Record mutation lowering

The [caller mutation grant](lite://doc/caller-mutation-grants#evaluation-and-scope)
owns the language rule. The [first-call boundary](lite://doc/type-operations#mutation-grants-for-field-receivers)
selects the writable receiver.

For a writable inline field, native C11 passes the field address. Generated
TypeScript uses a live accessor box. Its getter reads the current field.
Its setter reconstructs the affected path and installs the new value
immediately, preserving independent value copies. An active forwarded grant
uses its enclosing box, so a callback or cleanup can observe completed writes
without waiting for normal return.

See the [receiver regression cases](lite://repo/compiler/tests/codegen/mut-field-receiver.test.lts)
and [index setter regression cases](lite://repo/compiler/tests/codegen/index-operator-hooks.test.lts).
The browser tooling strips the accessor annotations before executing the
generated JavaScript. See the [site regression](lite://repo/site/features.test.ts).
