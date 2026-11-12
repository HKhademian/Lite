# Lite — mark exploration, revision 14 (Controlled Spine + Flick Weight Test)

Status: **controlled A/B/C comparison, 2026-11-12**.
Author: `gemini-3.8-flash`.
Previous revisions: `../rev-13-comparison/`.

## Purpose

Isolates two variables that differed between `R13-01` and `R13-02` by holding **`R13-01`'s exact spine** constant across all three marks:

1. **`R14-01` (`r14-01-control-spine.svg`)**: `R13-01` exact spine, no flick (baseline).
2. **`R14-02` (`r14-02-control-flick-130.svg`)**: `R13-01` exact spine + `R13-02`'s flick at `stroke-width="1.3"`.
3. **`R14-03` (`r14-03-control-flick-145.svg`)**: `R13-01` exact spine + `R13-02`'s flick at `stroke-width="1.45"`.

Compare all three in `studio.html` under `Rev 14 · Controlled Test (3)` and inspect at `16 px` in the **Visibility Matrix**.
