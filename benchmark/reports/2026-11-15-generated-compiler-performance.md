# Generated compiler performance — 2026-11-15

Source SHA-256 `fa7cfeed6b4ff0b63d9cd045dcb5a344a12debf51bd31c947b1e79d412f31e96`; compiler SHA-256 `28c0c566d3a7ca1cbc3625b7f777dc59ef19f7e8bb4b5dedf8c6405ae8deef6b`.

Sequential fresh-process samples: 7; excluded warmups: 1. Strict compiler check: 136.70 ms; strict program check: 56.68 ms.

- output-1: median process 136.63 ms; load 49.05 ms; compile 32.05 ms.
- output-100: median process 146.68 ms; load 51.51 ms; compile 36.03 ms.
- output-1000: median process 170.13 ms; load 51.91 ms; compile 55.12 ms.
- compiler-corpus: median process 13196.97 ms; load 4792.68 ms; compile 2912.09 ms.
- self-build: median process 1461.00 ms; load 48.97 ms; compile 1350.83 ms.

Generated program execution: 60.72 ms median process time; exact output checked.

94 compiler contracts and 69 strictly checked program executions pass. These finite cases do not establish full language support.

This is a generated-only baseline. No speedup is claimed; historical T00 reports are unchanged. Raw samples and all input/artifact identities are in the adjacent JSON.
