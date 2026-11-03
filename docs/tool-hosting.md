# Moving tools to LiteLang

Status: approved direction, 2026-11-03; individual tool ports are not implemented.

Self-hosting remains a compiler requirement. LiteLang's maturity also makes
language-written tools a useful next direction. A tool moves when the generated
compiler supports its actual inputs, outputs and dependencies; TS remains useful
for platform adapters and as the verified previous implementation.

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
