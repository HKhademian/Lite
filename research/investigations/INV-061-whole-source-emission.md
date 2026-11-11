# INV-061 — Whole-source input for the restricted emitters

Status: recorded (existing source subset over complete input; not full-language parsing)
Contributor: redacted (agent-assisted)
Last updated: 2026-10-31
Catalog brief: [INV-061](TOPICS.md#inv-061)
Compatible helper milestone: igniter-v0.1.0-alpha.19, `90754bd`

## Delivery and selected boundary

After explicit inputAll(prompt?) approval, adapt the existing
[TS](../../compiler/ts-emitter.lts) and
[C](../../compiler/c-emitter.lts) compiler applications to inputAll()
without a prompt. Validate the complete source rather than just the first line;
preserve clean emitted output and reject later unsupported source before emission.
The admitted source remains one signed-decimal integer report. The existing
Lite source-whitespace contract permits spaces/tabs/CR/LF between its tokens;
accept those forms without flattening or rewriting source text.

This is ordinary Lite application work inside selected syntax/helper scope, not
a new language feature, file/argument API, target ABI or compiler framework.
Rename private source variables accordingly. The reference TS/C outputs and
Node adapter bytes remain unchanged for report(42);.

## Changed application input behavior

Immediate EOF now supplies empty source to each compiler, which rejects it as
outside the admitted source class with status 2 and no artifact. It is no longer
an inputLine missing-read fault for these two applications. Existing inputLine
and other helper EOF behavior remains unchanged; inputAll's behavior was selected
separately. A valid first line followed by a second report is now rejected rather
than left unread. This subset does not claim to compile the whole Lite language.

## Evidence

Strict no-emit TypeScript checking and all 139 interpreter groups pass with
pinned Node 26.13.0/TypeScript 7.0.2. Extend the shared admitted-source table to
12 cases, adding LF/CRLF layouts and a final newline. The actual emitted native
C, emitted TS, translated ES-module JS and direct igniter paths retain identical
stdout/stderr bytes and status for those supported programs. Native checks run
locally with Apple clang 21.0.0; they are explicit skips where a C compiler is
unavailable, not assumed evidence there.

New root-launcher probes check both emitters on empty source, later valid or
injected statements, and invalid UTF-8 after an otherwise valid first line. They
fail before any emitted artifact bytes. Check-only mode remains silent and does
not read stdin. All 9 editor groups pass with the updated compiler sources.
No native runtime-fault-environment parity, browser/AS/Wasm execution or
compiler self-rebuild is claimed.

Commit source, checks and affected references atomically as
igniter-v0.1.0-alpha.20, preserving all previous tags and the readable artifacts.
Further ordinary statement sequencing can use this complete-source boundary;
do not add unselected language semantics or host APIs to advance it.

The subsequent [script-argument increment](INV-067-fvp-script-arguments.md) is
explicitly approved and implements inputArgs plus a -- suffix. Compiler use of
logical source identity is now available as a separate application step; the
helper itself does not complete target fault semantics.
