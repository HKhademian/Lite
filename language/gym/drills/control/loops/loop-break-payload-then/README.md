# Drill: Loop `break value` and `then { if @scan.value ... }`

Read `target` and three integers `a`, `b`, `c`. Find the first element in `[a, b, c]` that is `>= target` using `break v;` (or yield `-1` if none qualifies), then add `@scan.count` in the `then` clause only when a match was found (`if @scan.value >= 0 { @scan.value + @scan.count } else { -1 }`). Inside a nested conditional in `then`, leading-dot `.value` requires the loop's explicit `@tag`.

Fix the starter's `break` payload and `then` expression.
