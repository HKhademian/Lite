# Generated bootstrap seeds

`T11.ts` is the exact generated compiler recorded in the
[parity ledger](../parity.md#bootstrap-ladder), not handwritten compiler logic.
Its source/builder revision and SHA-256 identities are in [`seed.ts`](seed.ts).
T11 and T12 were byte-identical; this seed does not claim a T13 or C fixed point.

`c-emitter.ts` is T11 compiling the unchanged Lite C-emitter bundle into a
TS-hosted compiler. Its identities are in [`c-seed.ts`](c-seed.ts): source SHA-256
`413044da…`, artifact SHA-256 `b5459cc7…`, builder SHA-256 `8273ce69…`.
It is 233360 bytes and passes the same strict TS check. It emits C for the
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
node compiler/scripts/build.mjs
```

The second command returns both selected compilers and their hashes. It uses the
seeds immediately for unchanged sources; changed sources rebuild with T11 and
may take minutes. Cache identities include target, source and builder, and cached
artifact bytes are checked before execution.

Compare the C-emitting compiler against the preserved stage-0 reference:

```sh
node compiler/scripts/corpus-parity.mjs --target c --artifact compiler/bootstrap/c-emitter.ts
```

Historical T00 regeneration is still explicit:

```sh
node compiler/scripts/self-host.mjs --out /tmp/lite-historical-ladder
```

That script deliberately invokes `igniter/bundle-cli.ts`, rather than the default
launcher, so its T11/T12 labels retain their original builder meaning. The active
seed is not rewritten by this audit. Preserve published tags and record a new
seed's source/builder pair before selecting it.
