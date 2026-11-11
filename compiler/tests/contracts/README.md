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

`igniter/test-fixtures.ts` separately loads the current compiler fixtures and
their hashed streams. Artifact checks use those manifest contracts. Raw fixture
bytes reach generated artifacts unchanged.

The launcher uses generated compiler, phase, library and artifact execution.
Recorded contracts preserve expected process results without running a second
language implementation. The fast/full suite and compiler commands are checked
in a source archive without Git metadata.

```sh
node --test compiler/tests/contracts.test.ts
```

`../test-migration.json` accounts for all 240 original igniter tests by title.
The 81 compiler/phase/artifact tests remain active in `igniter/test.ts`; 159
interpreter-specific tests are marked retired with T00. Their source remains
recoverable from Git history. The ledger integrity test checks active test
destinations and the retired count.
