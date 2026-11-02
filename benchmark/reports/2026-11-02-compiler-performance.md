# Compiler performance — 2026-11-02

Runtime environment details omitted for privacy.

T11: 243216 bytes, SHA-256 `8273ce69973afb8beb25052dc2c8ef4b0682c00f4af866623ece751531b15e39`. Strict artifact typecheck passed. Current S: 155219 bytes, SHA-256 `827f90152433e65d2134f6e6df294d2c544b4bd665b879e9a3bd55d1eac343b8`.

## Availability

- **T00: available.** handwritten TS parser/checker/interpreter; code generation measured as T00+S.
- **T11: available.** Lite-written TS compiler emitted as TS; exact snapshot hash recorded.
- **C01: unavailable.** planned first native compiler; no buildable self-hosted artifact.
- **C11: unavailable.** not defined in current bootstrap ledger; no runnable artifact found; C11 C language mode is not a compiler node.

## Comparable TS code generation

Each result is the median of 7 sequential fresh-process samples, after 1 discarded warm-up pass(es). Wall time includes Node startup, compiler loading and output capture. Smaller is faster. T00+S means T00 running the Lite-written TS compiler; it is not the handwritten frontend alone.

- **report-1:** T00+S 126.54 ms; T11 70.91 ms; T00+S/T11 wall ratio **1.78×**. A ratio below 1 means T11 is slower.
  Compilation alone: T00+S 5.82 ms; T11 1.96 ms. Median per-pass peak RSS: 138.47 / 91.77 MiB.
- **report-100:** T00+S 291.01 ms; T11 101.61 ms; T00+S/T11 wall ratio **2.86×**. A ratio below 1 means T11 is slower.
  Compilation alone: T00+S 173.72 ms; T11 39.41 ms. Median per-pass peak RSS: 140.11 / 97.08 MiB.
- **report-1000:** T00+S 3032.74 ms; T11 3190.01 ms; T00+S/T11 wall ratio **0.95×**. A ratio below 1 means T11 is slower.
  Compilation alone: T00+S 2904.15 ms; T11 3122.84 ms. Median per-pass peak RSS: 190.55 / 158.52 MiB.
- **compiler-corpus:** T00+S 12386.53 ms; T11 6958.78 ms; T00+S/T11 wall ratio **1.78×**. A ratio below 1 means T11 is slower.
  Compilation alone: T00+S 1005.36 ms; T11 231.07 ms. Median per-pass peak RSS: 140.48 / 97.41 MiB.

## T00 frontend only

Parser/checker timing only; no target emission, so no speedup comparison with T11:

- benchmark:report-1: median wall 72.18 ms; parser/checker 1.37 ms.
- benchmark:report-100: median wall 72.19 ms; parser/checker 2.43 ms.
- benchmark:report-1000: median wall 72.17 ms; parser/checker 6.16 ms.
- benchmark:S: median wall 116.67 ms; parser/checker 50.81 ms.

## Full compiler source

- T00+S: **timeout**, 60.01 s observed; did not complete within 60 s. No successful-build timing or ratio is claimed.
- T11: **timeout**, 60.01 s observed; did not complete within 60 s. No successful-build timing or ratio is claimed.

## Validation and limits

- 760 paired invocations matched exact stdout/stderr bytes, status and signal, including warm-up passes; zero mismatches.
- The 92-case corpus is compared as compiler output, including successful artifacts and rejection diagnostics. This is not full-language support or generated-program runtime benchmarking.
- Fresh-process order alternates; no timed measurements run concurrently. The machine was not reserved exclusively and no statistical confidence interval is claimed.
- Actual Node is v24.16.0; repository pin is 26.13.0. Results describe the actual host, not an untested pinned toolchain.
- Artifact strict typechecking and bootstrap generation are excluded. Full-source timeouts are censored and excluded from ratios.
- C01/C11 are unavailable, not zero-time results. Existing C emission runs under T00 and is not a native compiler artifact.

Reproduce:

```sh
node benchmark/compiler-performance.mjs --artifact /absolute/path/T11.ts --samples 7 --warmups 1 --self-timeout-ms 60000
```

Raw samples: [JSON](2026-11-02-compiler-performance.json). Interactive summary: [Canvas](2026-11-02-compiler-performance.canvas.tsx).
