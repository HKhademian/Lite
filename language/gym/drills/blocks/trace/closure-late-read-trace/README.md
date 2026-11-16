# Drill: Execution-Trace Safety on Reserved Storage

Parallel wiring allows `readBonus := fn(): Int { bonus + 100 };` to mention `bonus` before `bonus` is initialized—provided every runtime execution path initializes `bonus` *before* calling `readBonus()`.

Move `bonus = n * 2;` above `readBonus()` so execution-trace verification succeeds.
