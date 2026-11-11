# Declarative cases

Run `./bin/lite test --cases [FILTER]` or `./bin/lite verify PATH.case.json`.
Definitions use [the case schema](../../config/case.schema.json); streams use
[one shared schema](../../config/stream.schema.json) and byte resolver, also used
by the existing compiler fixtures and semantic verifier.

Each `.case.json` has an ID, kind, feature IDs and named scenarios. Language
source stays in a separate `.lts`. Tool cases name a real command under `bin/`;
there are no per-case executable wrappers. Each scenario states stdin, stdout,
stderr and exitCode. Streams contain exactly one of `text`, `bytes` or `file`,
with optional `sha256:` hash. Substantial payloads belong in external raw files.
Processes default to 30 seconds; a scenario can declare `timeoutMs` from 1 to
600000 for a larger workload. Timeouts always fail verification and benchmarking.

Kinds distinguish `tool`, `compile`, `reject`, and runnable `feature`, `sample`
or `example`. Successful compiler stdout is captured as the generated artifact;
compile scenarios compare diagnostics/status and optionally a separate `artifact`
descriptor. Generated TS is strictly checked. Rejections must have nonzero status,
empty artifact stdout and no generated output file; the program is never run.
Silent compilation/execution is useful coverage without artificial I/O.

Runnable cases may stage `inputFiles` and compare `outputFiles`, mapping relative
workspace paths to stream descriptors. Each process uses an isolated directory.
Tool cases may request a clean or dirty isolated Git workspace and an optional
annotated/lightweight fixture tag. `files` asserts created workspace paths.

Proposed cases can carry `pending: "reason"`; their structure and expectations
are validated now, but they never pass, benchmark, or establish bootstrap support.
Explicit verification of a pending file exits unsuccessfully. Existing accepted
TS migration failures remain failing in their original verifier and inventory.

Opt a case into benchmarking with `benchmark: { "warmups": 1, "samples": 7 }`.
Run `./bin/lite bench NEW_REPORT.json FILTER`. Every measured run verifies its
expected behavior; timeouts and failures produce no successful report. Reports
include raw samples, median, host details, component versions, source/compiler/tool
identities and the measurement scope. Existing detailed compiler-phase benchmarks
remain under [benchmark/](../../benchmark/README.md).

Use [the development workflow](../../docs/development-workflow.md) and
[documentation guide](../../docs/documentation.md) when adding cases.
