# Copy-on-Write Record Field Updates

Read three integers `dx`, `dy`, and `dmg`. Starting from `var player := Player { pos = Vec2 { x = 10, y = 20 }, hp = 100 };`, take an immutable `snapshot := player;`, then update `player.pos.x`, `player.pos.y`, and `player.hp` in place with compound field assignments (`+=` / `-=`).

Print the snapshot's unchanged values followed by the updated player's values:

```text
<snapshot.pos.x> <snapshot.pos.y> <snapshot.hp> | <player.pos.x> <player.pos.y> <player.hp>
```
