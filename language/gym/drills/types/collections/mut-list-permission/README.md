# Drill: Explicit `mut` List Storage Permission

In-place collection operations such as `list.pushBack(mut items, v)` require the variable `items` itself to be declared with `mut List<T>`.

Add `mut` to `items` so appending both read values succeeds and prints them joined by `,`.
