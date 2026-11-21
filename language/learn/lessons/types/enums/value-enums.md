# Nominal Plain & Value Enums

Declare nominal closed sets of named cases with `enum { ... }` or attach typed scalar backing values with `enum : Type { ... }`.

## Key Concepts

- **Plain & backing-typed enums:** `Phase := enum { Idle; Running; Done; }` declares plain cases; `Level := enum : Float { Quiet = 0.5; Normal = 1.0; Loud = 2.5; }` attaches explicit `Float` backing values (supported backing types: `Int`, `Int8`, `Int16`, `Int32`, `Float`, `Float32`, `String`, `Bool`; integer cases auto-increment when omitted).
- **Zero-initialization:** Uninitialized enum variables (`var phase: Phase;`) default to the first declared case (`Phase.Idle`).
- **Contextual `.Case` shorthand:** Wherever the enum type is known (typed bindings, assignments, returns, function arguments, `==`, `Map` keys, and `match` arms), write `.Running` instead of `Phase.Running`.
- **Backing value access (`.value`):** Read the backing value of a typed enum case with `gain.value` without implicit conversion between the enum and its backing type.
- **Exhaustive `match`:** Covering every case in `match p { .Idle { ... } .Running { ... } .Done { ... } }` satisfies exhaustiveness without a `_` fallback.

## Try It

1. Add a fourth case `Paused;` to `Phase` and update `nextPhase` so the compiler's exhaustiveness check passes.
2. Print `gain.value * 2.0` alongside `gain` to see how `.value` bridges into arithmetic.
3. Practice exhaustive enum matching in [Exhaustive Enum match](lite://gym/drills/enum-exhaustive-match) and build a state cycle in [Traffic Signal Cycle](lite://gym/workouts/traffic-signal-cycle).

See [Enums and variants](lite://doc/enums-and-variants) and [Tuples, Arrays, Lists & Aliases](lite://handbook/tuples-arrays-lists-and-aliases) for the full contract.
