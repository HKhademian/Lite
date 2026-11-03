# Compiler performance benchmarks

Generated-only compiler measurements and historical comparisons live here.
`challenges/benchmark/` is the separate algorithm challenge dataset.

Run from the repository root:

```sh
node benchmark/compiler-performance.ts --samples 7 --warmups 1
```

The default command selects the current compiler through the generated host,
without importing T00. `--artifact /path/compiler.ts` measures another generated
builder, which must pass the recorded corpus. Its untimed self-built compiler
also passes that corpus before timed self-build bytes are compared. `--out path/prefix` chooses report filenames;
defaults use a dated `generated-compiler-performance` prefix. `--samples N`,
`--warmups N` and `--self-timeout-ms N` control sampling and the per-invocation
limit. A timeout is a failure, never a zero-time or successful build.

Before publishing reports the runner strictly checks the compiler, validates all
93 compiler contracts and executes all 69 admitted corpus scenarios from
strictly checked artifacts. It then measures one, 100 and 1,000 output statements,
the compiler corpus and S itself. Each input runs in a sequential fresh Node
process. Warmups are excluded; they warm filesystem caches, not persistent
compiler state. Corpus totals sum independent invocations.

Raw JSON records source, compiler, tool and input hashes, the actual Node/TS
versions, process wall time, module loading, compiler time, CPU and peak RSS.
Compiler time includes generated stdin decoding; TS checking and generated
program execution are outside that interval. Strict-check timings and the
1,000-output program's execution samples are reported separately. Worker
startup, compiler loading and stream capture are included in process wall time.
Git revision may be null in source archives. No T00 ratio or speedup is inferred
from this generated-only baseline.

## Historical reference routes

```sh
node benchmark/compiler-performance.ts --reference --out /tmp/lite-reference-performance
```

This explicit route preserves the old T00+S, T11 and T00-frontend comparison in
`compiler-performance-reference.ts`. It requires T00; it cannot be entered as a
fallback. Prior results retain their original source/artifact identities:

- [Original 2026-11-02 availability/timing audit](reports/2026-11-02-compiler-performance.md)
  and [raw samples](reports/2026-11-02-compiler-performance.json).
- [Text-cache comparison](reports/2026-11-02-text-cache.md) and
  [raw samples](reports/2026-11-02-text-cache.json), measured on its recorded
  snapshot. Reproduce that separate before/after experiment with
  `node benchmark/text-cache.ts --before /path/to/old/T11.ts`.

Historical censored timeouts remain censored; successful small workloads do not
establish a self-build timing. C/native work remains outside the current TS
migration gate. These finite corpus checks are not full language conformance.
