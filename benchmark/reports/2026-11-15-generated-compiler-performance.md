# Generated compiler performance — 2026-11-15

Source SHA-256 `fa7cfeed6b4ff0b63d9cd045dcb5a344a12debf51bd31c947b1e79d412f31e96`; compiler SHA-256 `91e5d26c72197b3ccd4b9845819c45ae124b822f9de12e0506050fb17f7ac3fd`.

Sequential fresh-process samples: 7; excluded warmups: 1. Strict compiler check: 138.98 ms; strict program check: 54.96 ms.

- output-1: median process 122.34 ms; load 49.84 ms; compile 17.05 ms.
- output-100: median process 127.17 ms; load 50.04 ms; compile 21.06 ms.
- output-1000: median process 136.86 ms; load 48.78 ms; compile 32.89 ms.
- compiler-corpus: median process 11261.13 ms; load 4639.63 ms; compile 1468.29 ms.
- self-build: median process 547.22 ms; load 49.18 ms; compile 440.68 ms.

Generated program execution: 59.20 ms median process time; exact output checked.

94 compiler contracts and 69 strictly checked program executions pass. These finite cases do not establish full language support.

This is a generated-only baseline. No speedup is claimed; historical T00 reports are unchanged. Raw samples and all input/artifact identities are in the adjacent JSON.
