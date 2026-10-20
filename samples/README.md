# Small problems, a few lines at a time

Start with [adding two numbers](001_add_two_numbers.lite), then follow exercises 001–020 in the [full list](list.md). Each file tells a small story, supplies the numbers, and calculates an answer. Comments beside the answers show what to expect.

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
- `/` divides, keeping the fractional part: `7 / 2` is `3.5`.
- `//` divides into whole units: `7 // 2` is `3`.
- `%` finds the remainder: `7 % 2` is `1`.
- Parentheses say which calculation to do first.

The last lesson introduces changeable values: `var` allows a named value to change, and `=` replaces it. Earlier lessons only need fixed values.

Try changing an input number and working out the new answer yourself. The answer comments describe the original numbers; they will not update automatically.

Money examples count amounts in cents: 1999 cents means 19.99 euros. A few examples explain how to round when a calculation lands between cents. Other lessons explore measurements, temperatures, grades, and positions on a map.

**Can I run these?** Not yet. LiteScript is still being designed, and this repository has no compiler or runtime. These are readable source examples whose calculations have been checked separately. For verification limits and language questions, see the [contributor notes](NOTES.md).
