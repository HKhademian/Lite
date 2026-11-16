# Workout: Wildcard Glob Matcher (`*` & `?`)

Read lines from `io.inputAll()`:
- Line 1 is the glob `pattern` (where `?` matches any single code point and `*` matches any sequence of zero or more code points).
- Each remaining non-empty line is a candidate string; print `"MATCH"` if the entire candidate matches `pattern`, else `"NO"`.
