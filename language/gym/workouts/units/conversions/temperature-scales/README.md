# Workout: Temperature Scale Converter

Read two values from stdin:
1. Mode line: `"C2F"` (Celsius to Fahrenheit) or `"F2C"` (Fahrenheit to Celsius)
2. Integer temperature `t`

Convert using floor integer division (`:/`):
- `"C2F"`: `(t * 9) :/ 5 + 32` followed by `"F"` (e.g. `100` -> `212F`)
- `"F2C"`: `(t - 32) * 5 :/ 9` followed by `"C"` (e.g. `32` -> `0C`)
- Any unknown mode prints `"INVALID"`.
