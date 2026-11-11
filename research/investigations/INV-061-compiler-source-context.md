# INV-061 — Explicit source context in compiler applications

Status: recorded (application context implemented; generated runtime faults remain open)
Contributor: project contributor (agent-assisted)
Last updated: 2026-10-31
Catalog brief: [INV-061](TOPICS.md#inv-061)
Compatible helper milestone: igniter-v0.1.0-alpha.21, `7ebd22d`

## Delivery

After the explicit argument-helper approval, the existing TS/C emitter
applications consume inputArgs() and accept zero or one logical source-name
argument. No name retains their existing compiler messages. One supplied name
prefixes their rejection diagnostic exactly with name followed by colon/space,
including an intentionally empty name. More arguments produce a clear compiler
usage rejection before reading source or emitting artifacts.

For example, run from the project root:

```sh
printf '%s\n' 'report(1 + 2);' | ./bin/lite run compiler/ts-emitter.lts -- demo.lts
```

The source expression is outside this compiler's admitted report-literal subset;
stderr is demo.lts: expected ) followed by newline, stdout empty, status 2. This
is a compiler diagnostic, not the runtime behavior of an admitted program.

Pass the prefix explicitly to ordinary helper functions, preserving the current
no-surrounding-data-capture implementation boundary. Do not add a hidden Node
driver, implicit source-name global, file read or new language feature.

The name remains ordinary data in diagnostic output; it is not pasted into TS/C
source, and valid source produces the same artifact bytes with or without a
name. In particular, quote/backslash/newline characters cannot inject generated
code through this application interface. A future generated-source metadata
encoder still needs its own correct implementation.

## Evidence

Strict no-emit checking and all 147 interpreter groups pass on pinned Node
26.13.0/TypeScript 7.0.2. New direct and real-launcher tests cover omitted/empty
names, spaces, Unicode, quotes, backslashes and newlines; exact diagnostic bytes;
unchanged valid TS/C artifacts; rejecting extra application arguments before any
input read; and silent check-only mode. Existing 12-case igniter/TS/JS/native C
output parity still passes. All 9 editor groups pass on the updated sources.

Preserve the application step as igniter-v0.1.0-alpha.22. It introduces no host
feature and does not complete source-position tracking, generated arithmetic/
input faults, target error ABI, general C export, AS/Wasm support or compiler
self-rebuild. The igniter remains an active reference during continued work.
