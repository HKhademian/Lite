# Tutorial 1: Expression Evaluator

Build a self-contained recursive-descent arithmetic evaluator in Lite that parses parenthesized expressions, unary minus, multiplication/division/remainder precedence, and addition/subtraction from stdin.

## Architecture

1. **`ParseRes` type alias**: `(ok: Bool, value: Int, next: Int, error: String)` threads both parse success and cursor offset cleanly through recursive calls without hidden global state.
2. **Parallel mutual recursion**: `parseExpr`, `parseTerm`, and `parseFactor` call each other across declaration order thanks to Lite's parallel function wiring.
3. **Explicit division guard**: Before executing `/` or `%`, `parseTerm` checks `right.value == 0` so user input errors report cleanly instead of trapping.

## Sample Input & Output

Given:

```text
1 + 2 * 3
(4 + 5) * -2
100 / 0
```

It outputs:

```text
OK: 1 + 2 * 3 = 7
OK: (4 + 5) * -2 = -18
ERR: division by zero
```

## Extensions to Try

- Add floor division `:/` and floor modulo `:%` inside `parseTerm`.
- Add right-associative `**` exponentiation between `parseTerm` and `parseFactor`.

See [Functions](../../../../../../docs/functions.md) and [Handbook: Blocks & Wiring](../../../../handbook/execution/blocks-wiring-and-closures.md).
