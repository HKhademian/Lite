# Drill: Value Block Final-Expression Rule

In Lite, a `{ ... }` block yields a value ONLY when its final item is an expression (such as `scaled * h`). Ending a block with a declaration (`product := ...;`) or assignment makes the block yield `Unit`, which cannot initialize an `Int` local.

Fix `area: Int = { ... }` so it ends with the value expression `scaled * h` (`w * 2 * h`) instead of yielding `Unit`.
