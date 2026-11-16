# Workout: Case-Insensitive Word Frequency Tally

Read all remaining text from stdin (`io.inputAll()`).
- Extract contiguous ASCII alphanumeric words (`A-Z`, `a-z`, `0-9`, `_`) and convert to lowercase via `text.toLowerAscii`.
- Tally frequencies and sort words by descending count, breaking ties alphabetically ascending (`a < b`).
- Print `"word: count"` per line, or `"EMPTY"` when no words occur.
