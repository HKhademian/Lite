# Pure vs host (`builtin`) mode & dead-symbol purging — 2026-11-15

Revision `97c3dddee3ae020621c256f41eefe21aa62da5b2`; compiler SHA-256 `28c0c566d3a7ca1cbc3625b7f777dc59ef19f7e8bb4b5dedf8c6405ae8deef6b`.

## 1. Compiler throughput (`benchmark/compiler-performance.ts --samples 7 --warmups 1`)

- `output-1`: median process `136.63 ms` (was `159.31 ms`); load `49.05 ms` (was `52.45 ms`); compile `32.05 ms` (was `44.81 ms`).
- `output-100`: median process `146.68 ms`; load `51.51 ms`; compile `36.03 ms` (was `49.85 ms`).
- `output-1000`: median process `170.13 ms`; load `51.91 ms`; compile `55.12 ms` (was `66.10 ms`).
- `compiler-corpus` (94 cases): median process `13196.97 ms` (was `14125.11 ms`); compile `2912.09 ms` (was `3851.76 ms`).
- `self-build`: median process `1461.00 ms`; load `48.97 ms`; compile `1350.83 ms`.

## 2. Minimal snippet emitted TS artifact size (`--builtin-mode pure` vs default host `builtin`)

| Snippet | Default host (`builtin`) | `--builtin-mode pure` | Reduction vs `pure` |
| --- | --- | --- | --- |
| `output-1` | 311 B (10 lines) | 311 B (10 lines) | 1.00x (dead stdlib purged) |
| `crypto.sha256Text("hi")` | 1,622 B (41 lines) | 29,952 B (603 lines) | **18.47x smaller** (was 8,907 B / 133 lines) |
| `unicode.utf8Encode("hi")` | 1,168 B (28 lines) | 3,755 B (77 lines) | **3.21x smaller** (was 3,762 B / 78 lines) |
| `file.readText("x").ok` | 2,554 B (54 lines) | 19,627 B (408 lines) | **7.69x smaller** (was 19,429 B / 406 lines) |

## 3. Runtime execution & code size (`--builtin-mode pure` vs default host `builtin`)

Measured via `prepareTsArtifacts` fresh Node process invocations (median of 5 runs after 1 warmup; includes Node process startup overhead ~50–55 ms; exact stdout parity verified on every case):

| Workload | Host median | Pure median | Speedup | Host size | Pure size | Code reduction |
| --- | --- | --- | --- | --- | --- | --- |
| `core/crypto.sha256Text` (50x 3 KB) | 55.51 ms | 693.70 ms | **12.50x** | 6,151 B | 33,500 B | 5.45x |
| `core/text.indexOf` (3000x 2.5 KB) | 55.96 ms | 135.46 ms | **2.42x** | 7,191 B | 8,454 B | 1.18x |
| `core/io.writeLine` + `readAllText` (200x 3 KB) | 67.20 ms | 163.14 ms | **2.43x** | 16,748 B | 28,872 B | 1.72x |
| `core/unicode.utf8Encode` + `utf8DecodeStrict` (200x 3 KB) | 68.85 ms | 120.17 ms | **1.75x** | 8,937 B | 16,849 B | 1.89x |
| `core/file.writeText` + `appendText` + `readText` (60x ~8 KB) | 64.44 ms | 167.88 ms | **2.61x** | 10,314 B | 34,826 B | 3.38x |
