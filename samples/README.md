# Small problems, a few lines at a time

Start with [adding two numbers](001_add_two_numbers.lts), then follow exercises 001–020 in the [full list](list.md). Each file tells a small story, supplies the numbers, and calculates an answer. Comments beside the answers show what to expect.

For short programs you can run with the current interpreter, use the
[indexed FVP examples](../examples/README.md) in the root examples directory.
Their local numbering is separate from the 520 exercise IDs.

You do not need to know LiteScript to read the first example:

```text
/* Two baskets hold 7 apples and 5 apples. How many apples altogether? */

first_basket := 7;
second_basket := 5;

apples := first_basket + second_basket; /* 12 apples */
```

Read `first_basket := 7` as “give the name first_basket to the number 7.” The last line adds the two numbers and names the answer `apples`. Names with underscores are just words joined together, such as “first basket.”

## Reading the notation

- `:=` introduces a name and gives it a value.
- `;` ends a step.
- `/* ... */` contains a note for the reader.
- `+` adds, `-` subtracts, and `*` multiplies.
- `/` divides: without a result annotation, `7 / 2` is `3`, while `7.0 / 2` or `7 / 2.0` is `3.5`.
- Floating inputs keep their values during division. For integer storage, `part: Int = 7.5 / 2` truncates `3.75` to `3`; `part: Int = -7.5 _/ 2` rounds down to `-4`.
- A fractional result type keeps the fraction: `part: Float = 2 / 7`.
- `_/` divides with rounding down: `-7 _/ 2` is `-4`.
- `%` finds the remainder: `7 % 2` is `1`. Its nonzero result follows the first number's sign.
- `_%` finds the modulo: `-7 _% 2` is `1`. Its nonzero result follows the second number's sign.
- Parentheses say which calculation to do first.

The last lesson introduces changeable values: `var` allows a named value to change, and `=` replaces it. Earlier lessons only need fixed values.

Try changing an input number and working out the new answer yourself. The answer comments describe the original numbers; they will not update automatically.

Money examples count amounts in cents: 1999 cents means 19.99 euros. A few examples explain how to round when a calculation lands between cents. Other lessons explore measurements, temperatures, grades, and positions on a map.

The current lessons use Lite’s simple-English reference spellings. [Multilingual learning](../docs/multilingual-source-and-learning.md) is being explored so students could begin in a familiar language and compare the same ideas with English later; localized keywords and translated lessons are not implemented yet.

**Can I run these?** The [experimental igniter](../igniter/README.md) runs a small
subset now. Lessons 001, 002, and 020 have checked outcomes in its tests; other
lessons may use unsupported features. Lesson files themselves print nothing—add
an explicit report(value) call to see an answer. See the [contributor notes](NOTES.md)
for verification limits.
