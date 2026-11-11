# INV-004 — Whole-input helper with optional prompt

Status: recorded (explicitly approved with optional prompt; implemented)
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

## Selected temporary API

The proposal was committed in `1dcee41`. The user accepts it with the refinement
"1. inputAll(prompt?)". Implement inputAll with zero arguments or one String
prompt, using the already selected inputInt prompt convention: evaluate once,
write exact stdout text without an added newline before reading, then read the
remaining unread standard input through EOF. No prompt argument means no output.
This selects optional prompting for inputAll, not public named helper arguments.

- Preserve text exactly as delivered by the existing UTF-8 input decoder,
  including spaces, tabs, CR/LF and the presence/absence of a final newline.
- Include any existing input lookahead that has not yet been consumed. Read from
  the current input position; do not reopen a file or rewind earlier reads.
- Immediate EOF returns the empty String. EOF terminates this operation normally,
  rather than faulting for a missing token or line.
- Apart from an explicitly supplied prompt, produce no output. Perform no
  normalization and do not retry after failure. Existing read/resource/UTF-8
  failures remain terminal. A failed prompt write prevents any read.
- Check arity/types before effects. The helper accepts zero or one positional
  String argument,
  not a selected module/file/argument API or a public streaming abstraction.

For example, with stdin containing two source lines, the compiler can use:

```text
source := inputAll();
```

The result preserves the line break and final newline if present. Empty stdin
supplies an empty source; the compiler decides whether that is valid for its
admitted language subset. Existing inputInt/inputFloat/inputWord/inputLine EOF
rules remain unchanged, and no new String character/indexing policy is selected.

## Scope rationale

The input already arrives through the runner; one whole-text read can enable
multi-line source without adopting filesystem/process APIs or module design.
The name makes full remaining-stream consumption explicit. It is a temporary
read-all operation and may use memory proportional to input; it is not a bounded
memory streaming guarantee or a permanent standard-library API decision.

Alternatives remain possible: first implement selected failure/recovery machinery
for EOF-aware line iteration, or investigate a file/argument API. They require
more contracts than this single-input need. No alternative is selected here.

## Verification and delivery

Strict no-emit TypeScript checking and all 138 interpreter groups pass on the
pinned Node 26.13.0/TypeScript 7.0.2. Six new groups verify multi-line/CRLF and
final-newline preservation, supplementary/combining text, immediate/repeated EOF,
unread lookahead after word/Int reads, remaining data after a line read, prompt
order/single evaluation/empty prompts, pre-read prompt failures, terminal read
failures, before-effects signature checks, shadowing, and the unchanged older
helper EOF behavior.

The real launcher runs [019-whole-input.lts](../../language/examples/019-whole-input.lts) on
empty and multi-line UTF-8 stdin. Output bytes preserve the original text in the
explicit report (whose own final newline still applies), and --check reads/writes
nothing. Invalid UTF-8 input produces the existing terminal InputFault path.
All 9 editor groups pass. No new file/process API, String representation or
streaming-memory bound is claimed.

Preserve this source as igniter-v0.1.0-alpha.19 with prior tags intact. Next use
inputAll() without a prompt in compiler applications so emitted source stays
clean. Reading all input does not itself implement a full multi-line grammar or
self-hosting; extend only the existing admitted source subset and reject other
source before emission. Preserve this prompt/EOF contract independently of
later permanent standard-library placement.
