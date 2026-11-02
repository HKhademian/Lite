# Generated bootstrap seeds

`T11.ts` is the current generated compiler after the
[value-shadowing refresh](../parity.md#sequential-value-shadowing). Its exact source/builder
identities are in [seed.ts](seed.ts). Three generated generations are byte-identical:
317957 bytes, SHA-256 `afc0ebb5…`. The refresh starts from the
previous generated seed, compiles unchanged current S at each generation, and
does not need T00 execution. The [ladder record](../reports/2026-11-02-value-shadowing-ladder.json)
preserves the recipe, previous seed revision and transitional artifact
hashes. Historical T00-built ladder identities remain in the parity ledger.

`c-emitter.ts` is the current Lite C emitter compiled by the refreshed TS seed.
It is 294328 bytes, SHA-256 `7384af58…`; C source
SHA-256 `b84fdd32…`, builder SHA-256 `afc0ebb5…`.
Its metadata is in [c-seed.ts](c-seed.ts). It supports admitted scalar output
forms and checked dynamic Int64 arithmetic, including positioned division-family faults.
Multi-value output evaluates every argument before writing. Comparison chains retain each middle operand and skip later operands after a
failed pair. Existing valid program artifacts stay unchanged;
six constant-arithmetic sources now compile and fault only when executed. The emitter still rejects unsupported input/aggregate forms explicitly. It is a
TS-hosted C emitter, not the pending native C11 compiler or a native fixed point.

The owner approved starting the default-compiler transition on 2026-11-02.
Checking in the verified seeds makes both compile targets in a clean checkout
independent of T00. No release version or tag is introduced. Edit Lite compiler source under
`compiler/src/` and `lib/core/`, not this artifact. The host checks seed integrity
and source identity before selecting a compiler. Changed S is rebuilt by T11
into a source-keyed, strictly checked `.cache/compiler/` artifact; there is no
automatic fallback to the T00 interpreter.

```sh
node igniter/node_modules/typescript/bin/tsc -p compiler/bootstrap/tsconfig.json
node compiler/scripts/build.ts
```

The second command returns both selected compilers and their hashes. It uses the
seeds immediately for unchanged sources; changed sources rebuild with T11. The
[text-cache benchmark](../../benchmark/reports/2026-11-02-text-cache.md) measures
the earlier text-cache source snapshot at a 668 ms self-compilation median, excluding strict checking.
Cache identities include target, source and builder, and cached
artifact bytes are checked before execution.

Compare the C-emitting compiler against the preserved stage-0 reference:

```sh
node compiler/scripts/corpus-parity.ts --target c --artifact compiler/bootstrap/c-emitter.ts
```

Historical T00 regeneration is still explicit:

```sh
node compiler/scripts/self-host.ts --out /tmp/lite-historical-ladder
```

That script deliberately invokes `igniter/bundle-cli.ts`, rather than the default
launcher, so its T11/T12 labels retain their original builder meaning. The active
seed is not rewritten by this audit. Preserve published tags and record a new
seed's source/builder pair before selecting it.
