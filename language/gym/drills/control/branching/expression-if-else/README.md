# Drill: Value-Returning `if / else`

In Lite, a partial `if cond { value }` without `else` evaluates to the type's empty/zero fallback (`""` for `String`) when `cond` is false. Add `else` so every outcome returns your intended value.

Complete `status` so scores `>= 60` yield `"pass"` and lower scores yield `"retry"`.
