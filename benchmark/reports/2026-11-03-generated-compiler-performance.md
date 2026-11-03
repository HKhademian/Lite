# Generated compiler performance — 2026-11-03

Runtime environment details omitted for privacy.

Sequential fresh-process samples: 3; excluded warmups: 1. Strict compiler check: 66.12 ms; strict program check: 87.02 ms.

- output-1: median process 86.35 ms; load 21.54 ms; compile 2.47 ms.
- output-100: median process 86.62 ms; load 19.73 ms; compile 13.02 ms.
- output-1000: median process 142.45 ms; load 19.92 ms; compile 65.87 ms.
- compiler-corpus: median process 7799.66 ms; load 1887.23 ms; compile 249.29 ms.
- self-build: median process 843.59 ms; load 19.76 ms; compile 760.13 ms.

Generated program execution: 61.84 ms median process time; exact output checked.

93 compiler contracts and 69 strictly checked program executions pass. These finite cases do not establish full language support.

This is a generated-only baseline. No speedup is claimed; historical T00 reports are unchanged. Raw samples and all input/artifact identities are in the adjacent JSON.
