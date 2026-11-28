# Drill: Prefix `mut` Declarations & `loop mut` In-Place Updates

Lite places `mut` as a prefix before the variable name (`mut xs: List<Int>`) across both inferred and explicitly typed declarations, while `loop mut xs` updates elements in place via `.item`.

Fix the retired `xs: mut List<Int>` syntax and multiply every element in `xs` by `scale` in place using `loop mut xs`.
