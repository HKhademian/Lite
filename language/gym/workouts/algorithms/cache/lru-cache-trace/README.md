# Workout: LRU Cache Simulator

Read commands via `io.inputAll()`:
- The first non-empty line is the positive integer cache `capacity`.
- Remaining non-empty lines are commands:
  - `GET <key>`: if present, promote `<key>` to most-recently-used and print `<value>`; otherwise print `"MISS"`.
  - `SET <key> <value>`: insert or update `<key>` as most-recently-used; if inserting exceeds `capacity`, evict the least-recently-used entry.
- After all commands, print `"ORDER:" + keysJoinedByComma` (from most-recently-used to least-recently-used, or `"ORDER:EMPTY"`).
