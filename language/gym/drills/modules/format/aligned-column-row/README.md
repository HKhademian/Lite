# Drill: `core/format` Aligned Columns

Read a key line and an integer value from stdin. Format one table row where the key is left-aligned (padded on the right to width 10 using [`fmt.padRightText`](lite://module/core/format#padRightText)) and the integer decimal text is right-aligned (padded on the left to width 6 using [`fmt.padLeftText`](lite://module/core/format#padLeftText)), separated by `" : "`.

Fix the padding helper directions in `starter.lts`.
