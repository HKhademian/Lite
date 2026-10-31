# Verifications

Feature verifications are the canonical semantic contract. Examples, samples and
showcases are verified **consumers** of those features, not the contract itself.

The same runner executes both:

- **Feature cases** are small, focused and may be ugly. They verify one feature
  or edge condition and carry a short guideline.
- **Artifact cases** verify that a polished example/sample/showcase still runs
  and produces its documented streams. Samples may append observation calls via
  `append` instead of putting `report` calls into teaching material.

## Layout

```text
verifications/
  README.md
  schema/verification.schema.json
  features.json                 # feature registry: IDs, summaries, case paths, docs
  features/
    int-arithmetic.lts
    int-arithmetic.json
    ...
  artifacts/
    examples/001-double-sum.json
    samples/001-add-two-numbers.json
    showcases/                  # reserved; transcript manifests later
```

Each manifest has a sibling `.lts` source for feature cases, or a relative
`source` path for an artifact. Manifest JSON uses the stream model from the
compiler fixtures.

## Manifest shape

```json
{
  "id": "int.arithmetic",
  "kind": "feature",
  "source": "int-arithmetic.lts",
  "features": ["int.arithmetic"],
  "guideline": "Checks precedence, left associativity and truncating division.",
  "sourceHash": "sha256:<64 lowercase hex>",
  "cases": [
    {
      "name": "precedence-and-division",
      "stdout": { "text": "-1\n6\n-3\n" },
      "exitCode": 0
    }
  ]
}
```

- `id` — unique manifest ID. Feature IDs use dotted names (`int.arithmetic`);
  artifact IDs use a kind prefix (`example.001-double-sum`).
- `kind` — `feature`, `example`, `sample` or `showcase`; must match the directory.
- `source` — source path relative to the manifest.
- `features` — feature IDs from `features.json`. A feature case includes its own ID.
- `guideline` — required for `feature`; the one-line verification rationale.
- `description` — optional artifact summary.
- `append` — optional text appended to the source for observation. Used by
  samples whose teaching bodies print nothing.
- `sourceHash` — SHA-256 of the original source file bytes. Changed source fails
  verification until `--update` is reviewed.
- `cases` — one or more scenarios:
  - `name` — unique within the manifest.
  - `stdin`/`stdout`/`stderr` — `{ "text": ... }`, `{ "bytes": [...] }` or
    `{ "file": "relative-file" }`; omitted means empty.
  - `args` — optional script arguments after `--`.
  - `exitCode` — required process status.

The JSON Schema is [schema/verification.schema.json](schema/verification.schema.json).
The runner performs equivalent structural validation in
[igniter/verify.ts](../igniter/verify.ts).

## Runner

```sh
./lite verify            # verify all cases; CI mode
./lite verify --update   # regenerate expected streams and source hashes
./lite verify --coverage # report feature/artifact coverage without executing
./lite verify --filter int.arithmetic
```

`--update` writes expected streams from the reference igniter and updates source
hashes. Review the diff before committing; it is the only supported way to change
expectations.

`--filter` matches manifest IDs, paths or feature IDs.

The runner currently executes through the reference igniter. Compiler-target
feature cases (`targets: ["igniter", "ts", "c"]`) are a later step; compiler
verification remains in [igniter/tests/compiler](../igniter/tests/compiler/).

## Coverage status

- Features: 17 registered, 17 cases.
- Examples: 5 of 19 manifest-covered (001, 006, 016, 020, 021).
- Samples: 3 of 20 manifest-covered (001, 002, 020). Samples 021 and 023 in the
  initial migration plan do not exist; existing 002 and 020 are used instead.
- Showcases: reserved, no manifests yet.

The coverage report is currently informational. The migration plan makes it a
blocking gate after all examples and samples have manifests. CI wiring is also a
later step; today `./lite verify` is the local gate.

## Adding a case

1. Add the `.lts` source.
2. Add the manifest with id, kind, source, features, guideline/description and
   cases.
3. Register a new feature in `features.json` if needed.
4. Run `./lite verify --update`, review the generated streams/hash, then run
   `./lite verify`.
5. Run `npm test` from `igniter/`; the suite includes verification and coverage
   checks.

Feature cases are deliberately independent of examples. Do not use an example
as the only verification for a language feature, and do not make a feature case
carry pedagogical explanation beyond its guideline.
