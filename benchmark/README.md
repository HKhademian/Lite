# Compiler performance benchmarks

Measured compiler performance, raw samples, provenance and reports live here.
`challenges/benchmark/` is the separate algorithm challenge dataset.

Text-cache optimization: [before/after report](reports/2026-11-02-text-cache.md)
and [raw samples](reports/2026-11-02-text-cache.json). The measured 1,000-statement
workload improves from 3489 to 146 ms; current self-compilation is 668 ms median.
Reproduce with `node benchmark/text-cache.mjs --before /path/to/old/T11.ts`.
The report records exact artifact/source identities and its censored old self-build.

Original four-compiler availability and timing audit: [2026-11-02 report](reports/2026-11-02-compiler-performance.md),
[raw samples](reports/2026-11-02-compiler-performance.json), and
[interactive summary](reports/2026-11-02-compiler-performance.canvas.tsx).

Run from the repository root:

```sh
node benchmark/compiler-performance.mjs
```

The script defaults to the verified checked-in `compiler/bootstrap/T11.ts` seed.
Use `--artifact /absolute/path/T11.ts` to measure another generated artifact.
Strict typechecking happens outside the timed samples. The runner snapshots
the input artifact, validates its corpus outputs against stage 0, records its
SHA-256 and the source revision, then saves JSON, Markdown and a browsable canvas
under `benchmark/reports/`. Use `--out benchmark/reports/another-run` to preserve
a second run on the same day.

Defaults: seven measured fresh-process samples per workload, one excluded
warm-up pass, and a single full-source self-compilation probe capped at 60 s per
engine. Override with `--samples N`, `--warmups N` and `--self-timeout-ms N`.
All measurements run sequentially; paired engine order alternates. Process
startup, source loading and output capture are included in wall time. Worker
metrics separately report compiler loading and compilation, CPU time and peak
RSS. An excluded warm-up warms filesystem caches; these are not warm persistent
compiler measurements. No TypeScript checker or host C compiler is timed as part
of Lite compilation.

The comparable code-generation lanes are:

- **T00+S**: the handwritten T00 interpreter running the Lite-written TS compiler.
- **T11**: the generated TS compiler running on Node, emitting the same TS bytes.

**T00 frontend** is measured separately: its handwritten parser/checker does not
emit target code, so its timing is not used in code-generation speedup ratios.
The 92-case corpus workload is a sum of fresh invocations (including rejection
cases), not a long-running compiler server. Successful streams, diagnostics,
statuses and signals must match for every paired sample. This validates compiler
output equivalence, not execution of every generated program or full-language
parity. C01/C11 receive no timing when no runnable native compiler artifact
exists. The runner records concrete C prerequisite rejection probes instead.

Full-source timeouts are censored observations: they establish only that the
invocation did not finish within the limit. They are not successful builds and
are excluded from medians and speedup ratios. Smaller workload results must not
be extrapolated to compiler self-compilation.
