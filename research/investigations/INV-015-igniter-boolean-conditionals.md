# INV-015 — Boolean and conditional igniter increment

Status: recorded (bounded implementation; broader conditional contracts open)
Contributor: redacted (agent-assisted)
Last updated: 2026-10-30
Catalog brief: [INV-015](TOPICS.md#inv-015)
Covered scope: Boolean-only conditions, short-circuit logic and comparisons, and
basic conditionals in the experimental interpreter; not the whole topic.

## Contracts and scope

Baseline: `8c74537`, preserved as igniter-v0.1.0-alpha.1. The user requests
continuation of the runnable igniter. This increment implements a bounded part
of already-selected rules rather than selecting new conditional semantics:

- [Conditionals](../../docs/conditionals.md): Bool conditions, mandatory braces,
  branch values, and no-else actions. Match only one branch and execute it once.
- [Comparisons](../../docs/comparison-chains.md): ten operators at one precedence,
  adjacent pairs, one evaluation per reached operand and short-circuiting.
- [Operators](../../docs/operators.md): arithmetic before comparison, then not,
  and, or; Bool requirements survive optional leading Boolean separators.
- [Block results](../../docs/blocks-and-results.md#final-item-rule): expression tails
  yield values, declaration/assignment/empty tails yield Unit, separators do not
  discard values, and scopes preserve lexical binding identities.

The [implementation guide](../../igniter/README.md#conditions-and-block-values)
documents the supported subset: matching scalar comparison types, numeric order,
scalar equality, homogeneous conditional value branches, and no-else actions.
Mixed result unions, partial value/guarded initialization and assignment,
pattern conditions, tags, then/finally and recovery are explicitly unsupported.
This does not revise their broader language contracts or pretend a missing
conditional path contributes Unit to a user-visible value.

## Evidence

Strict no-emit typechecking passes. All 22 Node test groups pass on Node 26.13.0
with TypeScript 7.0.2. New cases cover:

- branch selection, nested/else-if values, skipped input/division faults and exit;
- lexical shadows, permitted outer var replacement, local names not escaping;
- expression/Unit block tails and complete-braced-item separator rules;
- Bool-only conditions and logical operands, optional-leader Bool checking;
- not/comparison/and/or precedence and skipped logical operands;
- comparison middle values read once and later operands skipped after failure;
- every negated comparison, exact large Int comparisons, and equality types;
- unselected branch checking, malformed bodies, and unsupported conditional forms.

The runnable example [decisions.lts](../../language/examples/002-decisions.lts) accepts an
integer, reports its sign, tests a range, and guards division from zero. Existing
lesson sources remain unchanged. This is actual narrow interpreter evidence,
not a complete language or self-hosted compiler result.

## Handoff

Milestone igniter-v0.1.0-alpha.2 preserves this increment without moving alpha.1.
Continue toward the Lite-written compiler with small tested increments. Loops,
user functions, collections/text operations and compiler file I/O remain future
work; a full conditional type/effect system is not required for this checkpoint.
