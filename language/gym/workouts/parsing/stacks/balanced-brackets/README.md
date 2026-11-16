# Workout: Balanced Brackets Validator

Read one line from stdin containing characters including brackets `(`, `)`, `[`, `]`, `{`, `}` (any non-bracket characters are ignored).
- Use a stack to check proper nesting and matching pairs.
- If balanced at the end of the line, print `"balanced"`.
- On the first mismatched closing bracket at 0-based index `i` (or extra closing bracket on an empty stack), print `"mismatch:" + i`.
- If unclosed opening brackets remain at end of line (of length `n`), print `"mismatch:" + n`.
