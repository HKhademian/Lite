# Workout: Greatest Common Divisor & Least Common Multiple

Read two integers `a` and `b` from stdin. Use their non-negative magnitudes `|a|` and `|b|`:
- Compute `gcd(|a|, |b|)` with Euclid's remainder algorithm (`gcd(0, 0) == 0`).
- Compute `lcm(|a|, |b|)`: `0` when either input is `0`, otherwise `(|a| / g) * |b|`.
- Print `gcd:<g> lcm:<l>`.
