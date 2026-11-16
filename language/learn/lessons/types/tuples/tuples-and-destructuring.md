# Tuples, Shorthand Labels, Label Conversion & Destructuring

Group structured data concisely with tuples supporting unnamed fields, `=name` shorthand labels, explicit relabeling, and destructuring.

## Walkthrough

1. `pair := (14, "ok");` and `single := (99,);` build positional tuples (singleton tuples retain their trailing comma cleanly).
2. `(=x, =y, label = "canvas")` expands `=x` to `x = x` without repeating identifier names.
3. `(w: Int, h: Int, title: String) = rect;` relabels fields cleanly along positional slots.
4. `var (p0, p1) := (3, 4);` unpacks fields directly into independent mutable bindings.

> [!NOTE]
> Tuples are value types whose labels are visible in `io.outputLine(...)` output (`(w = 640, h = 480, title = "canvas")`).

## Try Modifying This

1. Add a fourth field to `rect` and destructure it cleanly alongside `(width, height, ...)`.
2. Change `mix.active` and inspect how `io.outputLine(mix)` displays mixed positional and labeled elements.

See [Handbook: Tuples, Arrays, Lists & Aliases](../../../handbook/types/tuples-arrays-lists-and-aliases.md) and [Tuples & Patterns](../../../../../docs/tuples-and-patterns.md).
