# Historical loop accumulator model

Status: **superseded by the user's typed zero-initialized loop value, 2026-10-19**.

The earlier design used Option<T> accumulator state, .acc, previous/accumulator receiver slots, and value_or(0) extraction. Those are no longer loop syntax or automatic loop state. The general Option type and its library operations remain available for explicitly optional data.

Use [loop value](loop-value.md): .value has the body's statically determined value type and starts at that type's universally valid all-zero value. Plain continue and break preserve it; a body tail value or continue value replaces it. Count and index come from metadata, not header receiver slots.

This file retains the old documentation path so historical references resolve. See [current loops](loops.md), [completion](loop-completion.md), and [examples](loop-examples.md).
