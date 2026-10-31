# INV-004 — Proposed whole-input helper for compiler source

Status: proposed (new temporary helper needs explicit consent)
Contributor: redacted (agent-assisted)
Last updated: 2026-10-31
Catalog brief: [INV-004](TOPICS.md#inv-004)
Related: [self-hosting/source input](SUBTOPICS.md#inv-061-06)
Baseline: `3bce277`, igniter-v0.1.0-alpha.18

## Concrete need

The first Lite-written TS and C compiler applications accept one source line
through inputLine. For ordinary multi-line compiler source, including eventual
compiler source itself, choose an input contract rather than inventing a source
terminator, whitespace-flattening protocol, file API or process-launch helper.
The target directions and byte-parity goal do not authorize a new builtin.

Existing inputLine faults if no line is available; it is not an EOF iterator.
The current FVP lacks recovery/optional-input support, so reading lines until an
exception is not already an available source-level pattern. A one-physical-line
subset remains possible, but is not whole-file input and should not be advertised
as such. This proposal addresses input only, not full Lite parsing or self-rebuild.

## Proposed temporary API

Add inputAll(): String to the current single-file FVP runner's temporary helpers.
It takes no arguments and reads the remaining unread standard input until EOF:

- Preserve text exactly as delivered by the existing UTF-8 input decoder,
  including spaces, tabs, CR/LF and the presence/absence of a final newline.
- Include any existing input lookahead that has not yet been consumed. Read from
  the current input position; do not reopen a file or rewind earlier reads.
- Immediate EOF returns the empty String. EOF terminates this operation normally,
  rather than faulting for a missing token or line.
- Produce no prompt or other output, perform no normalization, and do not retry
  after failure. Existing UTF-8/read/resource failures retain terminal CLI handling.
- Check arity/types before effects. The helper is positional with no arguments,
  not a selected module/file/argument API or a public streaming abstraction.

For example, with stdin containing two source lines, the compiler can use:

```text
source := inputAll();
```

The result preserves the line break and final newline if present. Empty stdin
supplies an empty source; the compiler decides whether that is valid for its
admitted language subset. Existing inputInt/inputFloat/inputWord/inputLine EOF
rules remain unchanged, and no new String character/indexing policy is selected.

## Why this bounded recommendation

The input already arrives through the runner; one whole-text read can enable
multi-line source without adopting filesystem/process APIs or module design.
The name makes full remaining-stream consumption explicit. It is a temporary
read-all operation and may use memory proportional to input; it is not a bounded
memory streaming guarantee or a permanent standard-library API decision.

Alternatives remain possible: first implement selected failure/recovery machinery
for EOF-aware line iteration, or investigate a file/argument API. They require
more contracts than this single-input need. No alternative is selected here.

## After consent

Implement the helper, tests, indexed demonstration and owning references
atomically. Check multi-line and CRLF preservation, supplementary text, empty EOF,
final-newline distinctions, interaction with buffered lookahead/earlier reads,
before-effects arity rejection, and root run/check-only behavior. Continue compiler
work within its admitted subset; reading all source does not by itself implement
multi-line grammar, further source features or a self-hosted compiler.

No helper code or language change is added by this proposal. The naming and
empty-EOF behavior are new choices and need explicit consent under the
[workflow rule](README.md#explicit-consent-for-language-changes).
