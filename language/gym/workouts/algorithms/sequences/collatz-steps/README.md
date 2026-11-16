# Workout: Collatz Steps & Peak Value

Read an integer `n` from stdin.
- If `n <= 0`, print `"INVALID"`.
- Otherwise iterate the Collatz rule until reaching `1`:
  - even: `cur = cur / 2`
  - odd: `cur = 3 * cur + 1`
- Track the number of steps and the maximum value seen (including `n`), and print `steps:<k> peak:<max>`.
