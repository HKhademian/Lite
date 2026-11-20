# Order Invoice Summary

Read an item count `n`, followed by `n` triples (`qty`, `unitPrice`, `discountPct`) from stdin.

For each entry, construct a `LineItem := record { qty: Int; unitPrice: Int; discountPct: Int = 0; };` (using the default `0` when `discountPct <= 0`), destructure its fields via `{ = qty, price = unitPrice, disc = discountPct } := item;`, and compute the line net as:

`gross := qty * price; net := gross - ((gross * disc) / 100)`

Aggregate the total invoice net alongside the minimum and maximum line nets (tracked in a fixed `[Int; 2]` bounds pair), and output `total minLine maxLine` separated by spaces (or `0 0 0` when `n <= 0`).
