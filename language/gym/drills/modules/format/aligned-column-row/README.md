# Drill: `core/text` Aligned Columns

Read a key line and an integer value from stdin. Format one table row where the key is left-aligned (padded on the right to width 10 using [`String.padRight`](lite://module/core/text#String.padRight)) and the integer decimal text is right-aligned (padded on the left to width 6 using [`String.padLeft`](lite://module/core/text#String.padLeft)), separated by `" : "`.

Fix the padding helper directions in `starter.lts`.
