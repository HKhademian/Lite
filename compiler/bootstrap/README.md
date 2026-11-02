# Generated bootstrap seeds

`T11.ts` is the current generated compiler recorded in the
[parity ledger](../parity.md#text-cache-seed-refresh), not handwritten compiler logic.
Its source/builder revision and SHA-256 identities are in [`seed.ts`](seed.ts).
For the text-cache source snapshot, T11, T12 and T13 are byte-identical:
245146 bytes, SHA-256 `56d99755…`. Original seed identities remain in the ledger.
The native C fixed point is still pending.

`c-emitter.ts` is T11 compiling the unchanged Lite C-emitter bundle into a
TS-hosted compiler. Its identities are in [`c-seed.ts`](c-seed.ts): source SHA-256
`413044da…`, artifact SHA-256 `57b3a3fe…`, builder SHA-256 `56d99755…`.
It is 233939 bytes and passes the same strict TS check. It emits C for the
existing restricted C subset; it is not a native C01/C11 compiler or a C fixed
point. The C-emitter Lite source and emitted C program bytes are preserved by
the host migration.

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
current full-source self-compilation at a 668 ms median, excluding strict checking.
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
