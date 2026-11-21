# Exhaustive Enum `match`

Matching on a nominal `enum` must cover every declared case (or include a `_` fallback arm).

The starter omits the `.Stopped` case in `match state { ... }`. Add the missing `.Stopped` arm returning `"stopped"` so the program compiles and maps `0 -> ready`, `1 -> busy`, `2 -> stopped`.
