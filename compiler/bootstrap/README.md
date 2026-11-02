# T11 bootstrap seed

`T11.ts` is the exact generated compiler recorded in the
[parity ledger](../parity.md#bootstrap-ladder), not handwritten compiler logic.
Its source/builder revision and SHA-256 identities are in [`seed.ts`](seed.ts).
T11 and T12 were byte-identical; this seed does not claim a T13 or C fixed point.

The owner approved starting the default-compiler transition on 2026-11-02.
Checking in the verified seed makes a clean checkout's TS compiler independent
of T00. No release version or tag is introduced. Edit Lite compiler source under
`compiler/src/` and `lib/core/`, not this artifact. The host checks seed integrity
and source identity before selecting a compiler. Changed S is rebuilt by T11
into a source-keyed, strictly checked `.cache/compiler/` artifact; there is no
automatic fallback to the T00 interpreter.

```sh
node igniter/node_modules/typescript/bin/tsc -p compiler/bootstrap/tsconfig.json
node compiler/scripts/build.mjs
```

The second command returns the selected TS compiler and its hashes. It uses the
seed immediately for unchanged S; changed S may take minutes to rebuild.

Historical T00 regeneration is still explicit:

```sh
node compiler/scripts/self-host.mjs --out /tmp/lite-historical-ladder
```

That script deliberately invokes `igniter/bundle-cli.ts`, rather than the default
launcher, so its T11/T12 labels retain their original builder meaning. The active
seed is not rewritten by this audit. Preserve published tags and record a new
seed's source/builder pair before selecting it.
