# Loop result and metadata review

Status: joint review notes. This working direction would revise the earlier implicit final `.value` contract. See [loop value](../../../docs/loop-value.md), [completion](../../../docs/loop-completion.md), and [branch contributions](06-control-flow.md#joint-review-noncontributing-paths).

## Syntax and result access

One loop family covers iterable traversal, a reevaluated Bool condition, and unconditional repetition. `as name` and `@tag` are optional. A tag can qualify metadata and target an enclosing loop. Keep bare and tagged break/continue, payload-bearing transfers, and tagged return in the review. Their existing `.value` commits need reconciliation with output metadata.

For ordinary result use, select specific metadata or construct a result in `then`. The proposed suffix `loop numbers { .item * 2 }.collected` selects a field. `then { (.last, .count) }` can return multiple fields from one execution. The exact suffix grammar and direct named destructuring remain open.

The latest proposal permits `x := loop numbers { .item * 2 }` to bind the whole metadata value with a suppressible warning. An explicit exposure of the whole metadata in `then` makes the request visible. Its spelling and the warning controls remain open. In statement position the loop can run for its effects. On normal completion `then` computes the result before `finally` cleanup. Abrupt exits can skip `then` while applicable cleanup still runs. Which metadata `finally` can read remains open.

## Metadata and contributions

- `.item` names the visited input. `.index` names its traversal position for positional sources. `.count` counts entered iterations, including skips.
- `.value` holds inferred, zero-initialized feedback. Body contributions commit the next value. Direct writes such as `.value += .item` remain a separate proposal. They would let feedback advance without contributing an output.
- `.last` and candidate `.first` report actual contributions as `Option<T>`. Absence is `None`, even if `.value` is zero. A genuine zero contribution gives `Some(0)`.
- `.collected` holds contributions in order. No contribution produces an empty collection. The body tail can contribute a value. Empty or absent branches, and bare continue, contribute nothing. Intentional versus action-produced `Unit` and whether all payload-bearing transfers contribute to output metadata remain open.

## Collected type and cost

The reviewed design uses `[TM; N]` when the exact contribution count is known at compile time, and `List<TM>` as the fallback. Implementations can start with the fallback and incrementally support stronger proofs. A statically known input length alone does not prove a filter's output length. Skipped paths affect count without adding an element type. Different contributing types can form a union. A receiver may widen an inferred fixed array to a list. [Collection review](07-collections.md)

Metadata retention follows observable use in the source, condition, body, completion and any permitted cleanup. `.last` alone needs no collection. `.value` used for feedback still needs its state even if the result is discarded. A whole metadata value that can escape must preserve fields that receiving code can observe. The emitter may omit unobservable storage and pure work, preserving effects, observable failures and required cleanup.

Use map, filter, filter-map, early stop, repeated accumulation, empty input, all skipped and a contributed zero as distinct verification cases. Also test tagged transfers out of nested loops, and cleanup when a collection is partially built.
