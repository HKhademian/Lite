# Drill: Reserved `= ?` Initialization Before Read

Lite rejects reading a reserved `= ?` binding unless every reachable control-flow path initializes it first.

Fix the conditional so `label` is always initialized to `"non-negative"` when `n >= 0` and `"negative"` otherwise.
