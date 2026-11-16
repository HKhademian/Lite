# Workout: Expression Evaluator with Precedence & Right-Assoc Power

Read non-empty expression lines via `io.inputAll()`. Evaluate signed integer expressions supporting:
- Parentheses `( ... )`
- Unary `-` (note: unary binds *below* `**` unless grouped like `(-2)**3`)
- Right-associative power `**` (non-negative exponents)
- Multiplicative `*`, `/` (truncating), `%`, `:/` (floor), `:%`
- Additive `+`, `-`

Print the integer result for each non-empty line, or `"ERR"` if the expression has syntax errors, negative exponents, or divides by zero.
