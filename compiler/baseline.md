# Bootstrap baseline

Status: **P0 baseline record, 2026-11-01**. This page records the state the
bootstrap work starts from. It is not a self-hosting claim: stage 0 is still the
only execution path, and no T, C, T2 or C2 artifact exists.

> P4 later moved the compiler source under `compiler/src/` and split the
> emitters. The paths and source hashes below are the historical P0 snapshot;
> artifact hashes for the 50 program cases remain the reference baseline.

Source baseline commit: `b4156bd02226d4e3b58cbc9d3a265a64a18b0284`
(`igniter-v0.1.0-alpha.38` plus release-history recording). The P0 changes add
only this record, the manifest contract and empty target directories; they do
not change compiler behavior.

## Counts

| Item | Value |
|---|---|
| Igniter version | `0.1.0-alpha.38` |
| Igniter tag | `igniter-v0.1.0-alpha.38` |
| Interpreter test groups | 175 |
| Editor grammar groups | 9 |
| Verification features / examples / samples | 36 / 19 / 20 |
| Verification scenarios / target executions | 75 / 91 |
| Compiler program cases | 50 |
| Compiler rejection cases | 42 |
| Compiler cases total | 92 |
| Compiler source lines | 1119 |

## Compiler sources

The sources stay in place for P0. Only the emitters are checkable standalone;
`frontend.lts` is declaration-only and expects a backend to define the literal
encoders.

| File | Lines | SHA-256 |
|---|---|---|
| `compiler/frontend.lts` | 830 | `957bf2ed05eafa8d6f79db7043c32337e162019ed99f2c8113e34ca4087284a8` |
| `compiler/ts-emitter.lts` | 142 | `b184a90a2fa947348b87fb1131328444183040684201c9ea91cf688599dd5a7d` |
| `compiler/c-emitter.lts` | 147 | `855e1060a806cae4e905a31e67fa822ed4692d8a536f57830e65a08f1aa0bac2` |

Commands and results:

```text
$ ./lite check compiler/ts-emitter.lts
(exit 0)

$ ./lite check compiler/c-emitter.lts
(exit 0)
```

`./lite check compiler/frontend.lts` exits 1 with `unknown helper/function
boolLiteralCode; forward function lookup is not supported yet`. That is expected
for a declaration-only shared front-end, not a regression.

## Reference artifacts

`report(42);` is the checked-in reference program. Both emitters reproduce these
files byte for byte.

| Artifact | SHA-256 |
|---|---|
| `compiler/generated/report-42.ts` | `89df6dd0454f8d6cc50fa6fc9758e7beb708ce6487715773b335343bbedde3cb` |
| `compiler/generated/report-42.c` | `7b245669f9a1bc4a1d81c797e3a4a16268270bffcc67014cf13d18d5b452f101` |

The full current compiler output baseline is
[`generated/baseline-artifacts.json`](generated/baseline-artifacts.json): one
SHA-256 per emitted TS and C artifact for all 50 program cases, produced by
`./litec --target ts|c <fixture source>`. That file records 50 program cases and
42 rejection cases. Rejection output is not duplicated here because each
rejection manifest already holds the exact expected `stdout`, `stderr` and exit
status contract.

## Test evidence

```text
$ ./lite test --fast
ℹ tests 175
ℹ pass 174
ℹ fail 0
ℹ skipped 1
ℹ duration_ms 10846.54275

$ ./lite test
ℹ tests 175
ℹ pass 175
ℹ fail 0
ℹ skipped 0
ℹ duration_ms 11815.801
```

The one skipped test in `--fast` is the native-C lane that the fast mode
deliberately omits. The compiler corpus path (50 program + 42 rejection cases)
is green.

## Boundary

- The current restricted compiler accepts Int/String/Bool expressions, locals,
  `report`, `if`/`else` and Boolean/unconditional `loop`.
- It does not parse the bootstrap source S, so it cannot produce T or C yet.
- Dynamic division, dynamic String concatenation, `break`/`continue`, functions,
  tuples/lists, `match`, runtime input and checked dynamic C overflow remain
  outside the accepted surface.
- The manifest schema and line-map contract are recorded in
  [`manifests/README.md`](manifests/README.md); the loader is P1 work.
