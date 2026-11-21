# Unique Visitor Counter

Read an integer `n`, followed by `n` lines of visitor names, and then one query name on the final line.

Record all visitors in a `mut Set<String>` and print two values separated by a space:

1. The number of distinct visitors (`set.size(visitors)`).
2. Whether the query visitor was seen (`set.has(visitors, query)`).
