# Moving tools to LiteLang

Status: active migration, updated 2026-11-17.

Self-hosting remains a compiler requirement. LiteLang tools live in `tools/src/*.lts`
and `lib/util/*.lts`, and are compiled into untracked `dist/tools/*.ts` artifacts
during ignition (`./bin/lite-ignite [--check]`, `node compiler/bootstrap/igniter.ts [--check]`,
or automatically on demand when invoking any `bin/lite*` symlink). No pre-generated
tool or compiler artifacts are checked into source control outside the single
Lite-generated bootstrap igniter (`compiler/bootstrap/igniter.ts`, recorded in
`compiler/bootstrap/seed.ts`), which compiles the compiler (`dist/bootstrap/compiler.ts`)
and tools (`dist/tools/*.ts`) into untracked `dist/`.

A tool moves when the generated compiler supports its actual inputs, outputs and
dependencies; thin TypeScript entrypoints remain only where Node host glue or JS
module boundaries are required, until full migration removes handwritten scripts.

Start with a small pure text task whose stdin/stdout contract is sufficient.
Compare the TS and generated-Lite implementations using the same JSON cases,
including empty input, boundaries, failures and combinations. Compile with the
accepted generated compiler, strictly check the result, verify behavior and
measure comparable workloads before switching the public command.

Larger tools have additional requirements:

- Documentation indexing: file reading, directory traversal, text and structured metadata.
- Case verification: JSON, exact byte streams, temporary files, subprocesses and statuses.
- Benchmarking: the verifier's capabilities plus clocks and environment identities.
- Release packaging: filesystem, Git, hashing, archives and platform subprocesses.

These are workload requirements, not approvals of new builtins. Keep primitive
host adapters small and reusable. The compiler's parser/checker/emitter remain in
LiteLang regardless of which language hosts a development tool.

Use [the workflow](development-workflow.md) for support/adoption gates and
[the bootstrap guide](../compiler/bootstrap/README.md) for generated-only validation.
