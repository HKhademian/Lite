# Fixed `[T; N]` Arrays vs Mutable `List<T>` Snapshots

Distinguish fixed-extent arrays from dynamically resizable `List<T>` storage and understand `mut` vs `var mut` value-snapshot semantics.

## Walkthrough

1. `fixed: [Int; 3] = [10, 20, 30];` checks element count at compile time (`fixed[1]` is bounds-checked at runtime).
2. `mut queue: List<Int> = [2, 3];` allows in-place `pushFront`/`pushBack`/`popFront`/`popBack` dot operations, as well as direct indexed writes (`queue[0] = 9;`, `queue[0] += 1;`).
3. Both `[T; N]` and `List<T>` expose `.length()` (`Int`) and `.isEmpty()` (`Bool`) operations without needing an import.
4. `saved: List<Int> = queue;` captures an immutable value copy—mutating `queue` afterward leaves `saved` untouched.
5. `var mut bag := seed;` permits *both* mutating elements (`mut bag.pushBack(6)`) and replacing `bag = replacement;`.

> [!TIP]
> Notice `mut queue.pushBack(4)` marks `mut` at the call site too so mutations are always visible to readers. Fixed `[T; N]` arrays also support exact-length destructuring such as `[a, b, c] := fixed;`, whereas runtime-sized `List<T>` requires indexing or `loop` traversal (see [Records & Aggregate Destructuring](lite://learn/records-and-patterns)).

## Try Modifying This

1. Try pushing another item onto `saved`—observe that `saved` lacks `mut` permission.
2. Print `saved` before and after `mut queue.popFront()` to confirm value-snapshot isolation.

See [Handbook: Tuples, Arrays, Lists & Aliases](lite://handbook/tuples-arrays-lists-and-aliases) and [core/list](lite://module/core/list).
