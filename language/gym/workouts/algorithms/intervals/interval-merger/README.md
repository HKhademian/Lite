# Workout: Merge Overlapping Closed Intervals

Read `count`, followed by `count` pairs of integers `start end` representing closed intervals `[start, end]`.
- If any pair has `start > end`, normalize to `[end, start]`.
- Sort intervals by ascending `start` (then `end`) and merge any overlapping or touching (`nextStart <= curEnd`) intervals.
- Print each merged interval as `start..end` on its own line, or `"EMPTY"` if `count <= 0`.
