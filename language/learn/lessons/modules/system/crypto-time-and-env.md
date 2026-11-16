# Cryptographic Digests, Encodings & Host/Clock Checks

Compute deterministic SHA-256 and HMAC-SHA256 digests (`core/crypto`), Hex/Base64 UTF-8 round-trips, and monotonic clock/process platform checks (`core/time`, `core/process`).

## Walkthrough

1. `bytes := unicode.utf8Encode(payload);` encodes text as UTF-8 byte values (`0..255`).
2. `crypto.sha256Text` and `crypto.hmacSha256Bytes` compute deterministic cryptographic digests.
3. `crypto.hexEncode` / `base64Encode` / `base64Decode` convert cleanly between byte lists and printable ASCII encodings.
4. `time.monotonicNs()` + `time.sleepMs(1)` verify non-decreasing monotonic elapsed time alongside `proc.cwd()`, `proc.platform()`, and `proc.arch()`.

> [!IMPORTANT]
> Because `core/crypto`, `core/time`, and `core/process` use host OS & Node crypto builtins (`CLI / Host OS`), run this lesson locally via `./bin/lite run language/showcases/modules/system/crypto-time-and-env.lts` or click **Compile TS** in-browser to inspect generated code!

See [core/crypto](../../../../../lib/core/crypto.lts), [core/time](../../../../../lib/core/time.lts), and [Handbook: Imports, Visibility & I/O](../../../handbook/modules/imports-visibility-and-io.md).
