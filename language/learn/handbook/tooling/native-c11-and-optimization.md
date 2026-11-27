# Native C11, Optimization & Tooling

Lite compiles every language feature and standard module to **both** strict TypeScript (`--target ts`) and standalone native C11 (`--target c`), backed by a **3-generation self-hosting fixed point** on both backends.

## Dual-Target Compilation & Native Executables

Compile any `.lts` program to TypeScript or C11, or build a standalone native binary in one step with [`./bin/lite build`](lite://tool/build):

```sh
# Emit strict TypeScript
./bin/lite compile --target ts language/examples/foundations/io/double-sum.lts

# Emit standalone C11 (compiles cleanly with -std=c11 -Wall -Wextra -Werror)
./bin/lite compile --target c language/examples/foundations/io/double-sum.lts > out.c

# Build a native executable directly
./bin/lite build -O2 language/examples/foundations/io/double-sum.lts -o /tmp/double-sum
/tmp/double-sum
```

## Optimization Levels (`-O0` through `-O3` and `-Os`)

Both the TypeScript and C11 emitters accept unified optimization flags (`-O0`, `-O1`, `-O2`, `-O3`, `-Os`):

| Flag | Focus | Notes |
| --- | --- | --- |
| `-O0` | Fastest compile, verbatim output | Preserves direct structure for debugging |
| `-O1` | Light cleanup & dead-code pruning | Default for the checked-in `compiler/bootstrap/compiler.c` seed |
| `-O2` | Balanced speed optimizations | Constant folding, copy/expression simplification, native C `-O2` |
| `-O3` | Aggressive speed optimizations | Default for the checked-in `compiler/bootstrap/igniter.ts` seed |
| `-Os` | Minimal emitted code size | Compacts generated TS and C11 output |

## Self-Hosting & Tool Ignition (`./bin/lite ignite`)

The repository checks in two Lite-generated bootstrap seeds under [compiler/bootstrap](lite://doc/compiler/bootstrap-readme):

- `compiler/bootstrap/igniter.ts` — `-O3` TypeScript bootstrap igniter and CLI dispatcher.
- `compiler/bootstrap/compiler.c` — `-O1` standalone C11 bootstrap compiler with zero Node.js dependency.

When you run any `./bin/lite` command, the igniter automatically materializes native C11 (or TS) tools into `dist/tools/` and verifies SHA-256 provenance against `compiler/bootstrap/seed.ts`. You can also control ignition explicitly:

```sh
./bin/lite ignite              # Materialize all tools into dist/tools/
./bin/lite ignite --target ts  # Force TypeScript tools
./bin/lite ignite --target c   # Force native C11 tools
./bin/lite ignite --check      # Verify seed integrity and tool freshness
```

## Verification, Testing & Benchmarking

- [`./bin/lite verify`](lite://tool/verify) runs declarative `.case.json` and artifact manifests against **both** `[ts]` and `[c]` targets (`--coverage` checks feature-to-doc registration).
- [`./bin/lite test`](lite://tool/test) runs unit suites, compiler corpus parity (69 programs + 25 rejections on TS and C11), and host contract tests (`--smoke`, `--fast`, `--full`, `--unit NAME`).
- [`./bin/lite docs`](lite://tool/docs) searches documentation, extracts `--modules-json` API metadata for all 36 modules, and verifies every internal `lite://` URI and anchor with `--check`.
- [`./bin/lite bench`](lite://tool/bench-release) records reproducible compiler and runtime benchmarks.

Explore the full CLI reference in [Tools](lite://tool) and architecture details in [Compiler Overview](lite://doc/compiler/overview).

## Next Chapter

Continue to [Unions, Fallibles & Errors](lite://handbook/unions-fallibles-and-errors).
