# Workout: Duration in Hours, Minutes & Seconds

Read a signed integer `totalSeconds` from stdin.
- If `totalSeconds < 0`, print `"INVALID"`.
- Otherwise decompose into whole hours, remaining minutes (`0..59`), and remaining seconds (`0..59`), and print `<H>h <M>m <S>s` (e.g. `3661` -> `1h 1m 1s`).
