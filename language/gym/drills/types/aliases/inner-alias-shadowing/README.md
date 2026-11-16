# Drill: Lexical Type Alias Shadowing & Forward Block Types

Outer blocks declare `NumOrText := type String;`. Inside `{ ... }`, we want a local `NumOrText := type Int;` shadowing it cleanly, plus `Pair := type (a: NumOrText, b: NumOrText);`.

Add the inner `NumOrText := type Int;` alias so `item` constructs with `Int` fields and returns `item.a + item.b`.
