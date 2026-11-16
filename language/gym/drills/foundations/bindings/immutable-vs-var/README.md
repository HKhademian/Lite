# Drill: Immutable `:=` vs Mutable `var`

This code fails to compile because it tries to apply `+=` to an immutable `:=` binding.

Fix `count` so that reading an integer `n` from stdin adds `10` to `count` and prints the updated value.
