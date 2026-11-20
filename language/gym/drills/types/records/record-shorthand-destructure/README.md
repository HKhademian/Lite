# Drill: Record `=name` Shorthand & Destructuring

Read `delta` and `rawBonus` from stdin, construct a `Score` record (`base` defaults to `10`, `bonus` defaults to `0`) with `base = 10 + delta` and `= bonus` shorthand, destructure its fields via `{ = base, = bonus } := entry;`, and print `base + bonus`.

The starter omits `=` inside the record destructuring pattern (`{ base, bonus }`), which Lite rejects. Fix the destructuring clause to use `= base` and `= bonus`.
