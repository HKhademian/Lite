# Generated compiler performance — 2026-11-15

Source SHA-256 `fa7cfeed6b4ff0b63d9cd045dcb5a344a12debf51bd31c947b1e79d412f31e96`; compiler SHA-256 `fdcf56f70271eaadbfb33032adb6d1a367fb8081aa14defb0678d59b427acc37`.

Sequential fresh-process samples: 7; excluded warmups: 1. Strict compiler check: 144.92 ms; strict program check: 59.94 ms.

- output-1: median process 122.90 ms; load 51.55 ms; compile 16.09 ms.
- output-100: median process 126.38 ms; load 50.91 ms; compile 19.65 ms.
- output-1000: median process 139.58 ms; load 50.97 ms; compile 32.60 ms.
- compiler-corpus: median process 11542.55 ms; load 4882.55 ms; compile 1398.44 ms.
- self-build: median process 445.91 ms; load 50.52 ms; compile 336.64 ms.

Generated program execution: 60.92 ms median process time; exact output checked.

94 compiler contracts and 69 strictly checked program executions pass. These finite cases do not establish full language support.

This is a generated-only baseline. No speedup is claimed; historical T00 reports are unchanged. Raw samples and all input/artifact identities are in the adjacent JSON.
