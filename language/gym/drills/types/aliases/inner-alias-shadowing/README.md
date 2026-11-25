# Drill: Lexical Type Alias Shadowing & Forward Block Types

Outer blocks declare `NumOrText := alias String;`. Inside `{ ... }`, we want a local `NumOrText := alias Int;` shadowing it cleanly, plus `Pair := alias (a: NumOrText, b: NumOrText);`.

Add the inner `NumOrText := alias Int;` alias so `item` constructs with `Int` fields and returns `item.a + item.b`.
