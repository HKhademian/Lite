# Recorded regression expectations

`process.json` preserves the expected process results previously obtained by
calling T00 from generated compiler regressions. It contains exact Lite source
identities, raw stdin (base64), argument vectors, optional diagnostic names,
exit status, stdout and stderr. Sources are deduplicated by SHA-256. Output is
stored as UTF-8 text, matching the captured Buffers in these existing tests.

The initial 727 TS-lane scenarios were captured from the unchanged handwritten
interpreter at revision `5259aaa`, with interpreter and adapter SHA-256 identities
in `provenance`. An additional 49 requests from the deferred native test
matrices were evaluated with T00 alone, without artifact/native execution,
bringing the archive to 776 contracts. They were not generated from compiler output. Existing explicit
expectations for selected Lite behavior remain in the test bodies; a historical
reference is not the authority for future language decisions. This archive is
finite regression evidence, not complete language conformance or native coverage.

`../contracts.ts` reads expectations only. A changed source/input/name/argument
vector with no reviewed expectation fails explicitly. It cannot run an
interpreter, update this file or substitute generated output. New tests should
prefer short explicit expectations in their bodies or canonical manifests.
Review a deliberate contract change against the owning specification; do not
refresh expectations merely to match the compiler under test.

`igniter/test-fixtures.ts` separately loads the existing 93 compiler fixtures
and their hashed streams. Default artifact checks use those manifest contracts;
T00 fixture execution is retained in `igniter/reference.test.ts`. The reference
suite also replays this archive, preserving the old differential checks while
generated tests use independent expectations. Raw fixture bytes still reach
generated artifacts unchanged; the historical T00 adapter keeps its existing
UTF-8 replacement when testing the admitted compiler fixtures.

At this migration checkpoint the launcher still includes the reference suite.
The next workflow step makes it explicitly selectable and changes the remaining
actual compiler/phase-driver calls to generated execution. Moving the tests
alone is not evidence that those actual helpers are independent of T00.

```sh
node --test compiler/tests/contracts.test.ts
node --test --test-name-pattern='T00 reference' igniter/reference.test.ts
```

`../test-migration.json` maps every one of the 240 original igniter tests to its
maintained suite by title, with original assertion counts and dependency names.
All 81 compiler/phase/artifact tests stay in `igniter/test.ts`; 159 interpreter
and historical audit tests stay in `igniter/reference.test.ts`. Language-level
assertions in the reference suite still need generated equivalents, including
the existing failures assigned by the retirement plans. Moving a reference test
does not mark its semantics supported. The migration ledger's integrity test
fails if an original test loses its destination.
