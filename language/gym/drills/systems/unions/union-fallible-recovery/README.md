# Drill: Union Narrowing & `T!` `else(err)` Recovery

Read integer `v`. Implement `checkScale(v: Int): Int!` returning `.err(errs.Error.new("Input", "non-positive"))` when `v <= 0`, otherwise `v * 10`.

Recover errors locally with `else(e)` so failures produce `"err:" + e.message`, while successes narrow an `Int | String` result cleanly to `"ok:" + n.toText()`.
