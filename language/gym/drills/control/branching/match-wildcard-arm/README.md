# Drill: Mandatory `_` Fallback in Subjectless `match`

Subjectless `match { ... }` requires a trailing wildcard `_` fallback arm so every runtime input has a defined outcome.

Add `_ { "C" }` for scores below `70`.
