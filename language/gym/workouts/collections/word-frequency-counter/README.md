# Word Frequency Counter

Read an integer `n`, followed by `n` lines of words, and then one query word on the final line.

Count how many times each word appears using a `mut Map<String, Int>` and print two values separated by a space:

1. The number of distinct words (`map.size(counts)`).
2. The count for the query word (`map.getOr(counts, query, 0)`).
