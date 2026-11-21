# Traffic Signal Cycle

A traffic light cycles through three phases with fixed durations in seconds:

- `Red = 30`
- `Green = 25`
- `Yellow = 5`

Read an integer `steps` (`>= 0`) from stdin. Starting from `Signal.Red`, advance `steps` times (`Red -> Green -> Yellow -> Red`) and sum the `.value` duration of each visited phase (for `steps == 0`, output `Signal.Red 0`; for `steps == 1`, visit `Red` then advance to `Green` so output `Signal.Green 30`, etc.).

Print the final `Signal` and the total elapsed seconds separated by a space.
