# TS compiler text-cache comparison

Runtime environment details omitted for privacy.

The old textLength/textAt/textSlice helpers rebuilt a whole code-point array for each call. Source scanning therefore repeatedly copied the entire source. The new private cache retains at most eight immutable code-point views, shared by those helpers. Public String and copy semantics are unchanged.

A diagnostic CPU profile of the same 1,000-statement input attributes 1,331 of
2,671 leaf samples (49.8%) directly to the three old text helpers; scanner callers
account for further samples. This supports the source-level diagnosis, rather
than proving that every compiler phase is now linear. [Profile summary and commands](2026-11-02-text-cache-profile.json)
record separate diagnostic invocations; their timings are not substituted for
the repeated unprofiled measurements below.

- **report-100:** 117.62 ms → 94.09 ms median process wall time; **1.25×** faster. Emitted TS bytes match exactly. Peak RSS medians: 98.1 → 101.5 MiB.
- **report-1000:** 3488.70 ms → 145.93 ms median process wall time; **23.91×** faster. Emitted TS bytes match exactly. Peak RSS medians: 153.5 → 134.5 MiB.

- **Full source (156236 bytes):** old invocation did not finish within 10 seconds; new median **668.37 ms**. Every successful new invocation reproduces the selected compiler SHA-256. No whole-source speedup ratio is claimed from a censored baseline.

Before artifact: `8273ce69973afb8beb25052dc2c8ef4b0682c00f4af866623ece751531b15e39`. After artifact: `56d99755c2c816305136da6c54299e2d61e6ff3ab215817a4fd479f85cd6361c`.

Source bundle: `17e53ce5a8eb6a603b84e25af67378c58a6bdec6d9914200c80f056931f8d74f`. Measurements were taken from the source snapshot based on `6c6b55b4d23a54b95697cabac7484b5aa70dec97`; dirty file paths are preserved in the raw data. The source and generated seeds are committed together after validation.

This measures the existing TS compiler and a private runtime optimization, not newly supported language features. Preparing the reference seeds, strict typechecking and output hashing are excluded from the timed interval. CPU activity elsewhere on the machine is not controlled.

Tool commands below use the current TypeScript filenames; recorded measurements and hashes are unchanged.

Reproduce using a preserved old artifact:

```sh
git show 6c6b55b4d23a54b95697cabac7484b5aa70dec97:compiler/bootstrap/T11.ts > /tmp/T11-before-text-cache.ts
node benchmark/text-cache.ts --before /tmp/T11-before-text-cache.ts
```

Raw samples: [JSON](2026-11-02-text-cache.json).
