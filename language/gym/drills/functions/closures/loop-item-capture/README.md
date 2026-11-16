# Drill: Independent Closure State Frames

`makeCounter(start, step)` should allocate a separate mutable `var current` inside each returned closure. Right now the starter captures a single shared module-level `var sharedCurrent`, causing `c1` and `c2` to collide!

Move `var current := start;` inside `makeCounter` so `c1` and `c2` maintain independent counters.
