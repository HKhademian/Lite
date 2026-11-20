# Compile-Time Wiring vs Runtime Execution Trace Safety

Parallel wiring lets functions name later variables—and compile-time execution-trace analysis ensures no runtime path reads a binding before it has been initialized.

## Walkthrough

1. `readSlot` captures `var rootSlot: Int = ?;`, which is uninitialized at line 6. Calling `readSlot()` *after* `rootSlot = 25;` passes trace analysis cleanly.
2. `initAndRead` performs **write-before-read** (`innerSlot = 18;` then reads `innerSlot * 2`) inside its own closure body.
3. Pushing a closure reading `lateItem` into `tasks: mut List<fn(): Int>` is allowed before `lateItem := 14;`, because `tasks[0]()` executes only *after* `lateItem` is initialized!

> [!WARNING]
> Calling `readSlot()` on line 7 before `rootSlot = 25;` triggers a compile-time uninitialized-read error.

## Try Modifying This

1. Move `early := readSlot();` above `rootSlot = 25;` and inspect the compiler's exact trace diagnostic.
2. Add another deferred task to `tasks` that doubles `lateItem`.

See [Handbook: Blocks, Wiring & Closures](lite://handbook/blocks-wiring-and-closures) and [First Initialization](lite://doc/first-initialization).
