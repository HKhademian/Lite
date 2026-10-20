# LiteScript single-file problem catalog

520 planned scripts, ordered from first expressions to small applications. Each entry names one future file and describes its problem; this catalog does not create the `.lite` files.

## Starting conditions

The repository is currently a language-design workspace, with no implemented compiler, runtime, or standard library. The syntax and contracts in the [language reference](../docs/README.md) include open proposals. These are learning and design experiments, not claims that the programs can run today. In particular, do not assume existing printing, input, string indexing, collection methods, math functions, filesystem APIs, or generic syntax.

- Keep every script self-contained: literal fixtures, local helpers, solution, and representative checks in the same file. No manifest, imports from other samples, or third-party dependencies should be necessary.
- Begin with fixed inputs and a computed result. Console input and printing are optional extensions once host I/O exists; they are not prerequisites for arithmetic lessons.
- Implement the algorithm being studied locally. For supporting operations, use the smallest local helper possible; record an absent primitive as a blocker rather than pretending a standard API exists.
- For text exercises, use ASCII unless the entry explicitly requests Unicode. Choose byte, scalar, or grapheme behavior deliberately; do not silently treat a string as an indexable list.
- For sets, maps, queues, trees, and graphs, a list-based or index-based representation is acceptable. Native hash tables, pointers, inheritance, and a finalized generic system are not prerequisites.
- Use bounded inputs and deterministic fixtures first. Supply a fixed seed or scripted events for simulations; no clock, network, GUI, or concurrency is assumed.
- Later applications remain single-file command processors or simulations. Persistence is an optional host extension unless the problem explicitly studies files.

Difficulty is approximate: stages increase prerequisite knowledge and implementation scope, and files progress within each stage. A later topic can feel easier to someone with relevant experience. Numbers provide a stable reading order, not a benchmark score.

## How to work through an entry

Choose a small input/output example, state the accepted inputs, and solve the smallest useful version first. Add ordinary, boundary, and invalid cases where relevant; collection tasks should consider empty, singleton, and duplicate inputs. Keep checks inline until a test facility exists. Use exact integer units for money and small bounded integers where numeric limits are not yet settled.

For each attempt, record: **what worked; language or type-system ambiguity; missing library or host operation; confusing diagnostic; smallest reproducer; next design decision**. Separate an inconvenient helper from an actual language limitation. Never turn unspecified behavior into an assumed rule simply to finish a sample.

As each subject makes it useful, compare inferred and explicitly annotated forms, returning a new value and updating writable data, or concrete helpers and functions passed as values. Keep invalid-type experiments clearly separate from the intended successful solution. These variations should reveal contract gaps without making advanced syntax a prerequisite for the first solution.

Stage notes identify likely dependencies and design pressure. They are capabilities to investigate, not promises of available APIs. No entry requires an unresolved feature to be silently finalized.

## 01 — Literal values and arithmetic (001–020)

Needs: numeric values, bindings, expressions. Design pressure: inferred numeric types, division, rounding, and expression results. All inputs can be literals.

1. `samples/001_add_two_numbers.lite` — **Add two numbers:** Compute the sum of two supplied integers and check positive, negative, and zero inputs.
2. `samples/002_arithmetic_operations.lite` — **Four arithmetic operations:** Compute sum, difference, product, and fractional quotient for two numbers with a nonzero divisor.
3. `samples/003_rectangle_measurements.lite` — **Rectangle measurements:** Calculate area and perimeter from positive width and height.
4. `samples/004_triangle_area.lite` — **Triangle area:** Calculate a triangle's area from its base and perpendicular height, including a fractional result.
5. `samples/005_circle_measurements.lite` — **Circle measurements:** Use a supplied approximation of pi to calculate circumference and area from a radius.
6. `samples/006_temperature_conversion.lite` — **Temperature conversion:** Convert Celsius to Fahrenheit and back, checking freezing and boiling examples.
7. `samples/007_distance_conversion.lite` — **Distance conversion:** Convert a distance between meters, kilometers, and centimeters using explicit scale factors.
8. `samples/008_duration_parts.lite` — **Duration parts:** Break a nonnegative whole-second duration into hours, minutes, and remaining seconds.
9. `samples/009_average_three_values.lite` — **Average three values:** Calculate the arithmetic mean of three numbers without accidentally truncating a fractional answer.
10. `samples/010_percentage_of_total.lite` — **Percentage of a total:** Calculate a part's percentage of a positive total and the amount represented by a percentage.
11. `samples/011_discounted_price.lite` — **Discounted price:** Apply an integer percentage discount to a price in cents using an explicitly stated rounding rule.
12. `samples/012_tax_and_tip.lite` — **Tax and tip:** Calculate a bill total from subtotal, tax rate, and tip rate, stating which amount the tip uses.
13. `samples/013_simple_interest.lite` — **Simple interest:** Compute interest and final balance from principal, annual rate, and whole-year duration.
14. `samples/014_speed_distance_time.lite` — **Speed, distance, time:** Derive each quantity from the other two using consistent units and positive denominators.
15. `samples/015_weighted_average.lite` — **Weighted average:** Combine three assessment scores with supplied weights whose sum is positive.
16. `samples/016_midpoint_coordinates.lite` — **Midpoint coordinates:** Find the midpoint of two two-dimensional points from their coordinate values.
17. `samples/017_linear_interpolation.lite` — **Linear interpolation:** Calculate a value between two endpoints for a supplied fraction between zero and one.
18. `samples/018_split_bill.lite` — **Split a bill:** Divide a total in cents among a positive number of people and report leftover cents.
19. `samples/019_currency_conversion.lite` — **Fixed-rate currency conversion:** Apply a supplied rational exchange rate to integer minor units with explicit rounding.
20. `samples/020_swap_values.lite` — **Swap two values:** Exchange two integer bindings using a temporary value and verify both final values.

## 02 — Conditions and small decisions (021–040)

Needs: comparisons, Boolean logic, branches, reassignment where needed. Design pressure: branch result typing, comparison boundaries, and short-circuiting.

21. `samples/021_number_sign.lite` — **Number sign:** Classify an integer as negative, zero, or positive.
22. `samples/022_even_or_odd.lite` — **Even or odd:** Determine parity for positive and negative integers, including zero.
23. `samples/023_larger_of_two.lite` — **Larger of two:** Select the greater of two values and handle equality explicitly.
24. `samples/024_largest_of_three.lite` — **Largest of three:** Find the maximum of three integers without a collection or a maximum helper.
25. `samples/025_order_three_numbers.lite` — **Order three numbers:** Arrange three supplied integers in ascending order, preserving duplicates.
26. `samples/026_absolute_value.lite` — **Absolute value:** Compute magnitude using a conditional for bounded integers, documenting the minimum-integer overflow question.
27. `samples/027_clamp_to_range.lite` — **Clamp to a range:** Restrict a number to inclusive lower and upper bounds supplied in valid order.
28. `samples/028_grade_band.lite` — **Grade band:** Map a score from zero through one hundred to a letter grade using explicit thresholds.
29. `samples/029_leap_year.lite` — **Leap year:** Apply the Gregorian divisibility rules and test ordinary, century, and four-hundred-year boundaries.
30. `samples/030_days_in_month.lite` — **Days in a month:** Return the day count for a valid month and year, including leap-year February.
31. `samples/031_triangle_validity.lite` — **Triangle validity:** Decide whether three positive side lengths can form a nondegenerate triangle.
32. `samples/032_triangle_kind.lite` — **Triangle kind:** Classify a valid triangle as equilateral, isosceles, or scalene.
33. `samples/033_point_in_rectangle.lite` — **Point in a rectangle:** Test whether a point lies inside or on the boundary of an axis-aligned rectangle.
34. `samples/034_interval_overlap.lite` — **Interval overlap:** Decide whether two closed numeric intervals overlap, including endpoint contact.
35. `samples/035_shipping_charge.lite` — **Shipping charge:** Select a shipping fee from weight bands and a supplied express-delivery flag.
36. `samples/036_progressive_fare.lite` — **Progressive fare:** Calculate a taxi fare using a base charge and different rates for successive distance bands.
37. `samples/037_electricity_bill.lite` — **Electricity bill:** Price whole-unit consumption across cumulative usage tiers using integer monetary units.
38. `samples/038_rock_paper_scissors_round.lite` — **Rock-paper-scissors round:** Determine the winner or draw from two valid numeric move codes.
39. `samples/039_safe_division_choice.lite` — **Safe division choice:** Check the divisor before division and produce either a quotient or an explicit failure flag.
40. `samples/040_admission_rules.lite` — **Admission rules:** Combine age, ticket, and guardian conditions into a decision with an explanatory reason.

## 03 — Loops and repeated arithmetic (041–060)

Needs: loops, counters, accumulators, integer division and remainder. Design pressure: loop termination, empty traversal, mutation permissions, and numeric faults.

41. `samples/041_count_to_n.lite` — **Count to N:** Produce successive integers from one through a bounded N; nonpositive N produces no values.
42. `samples/042_sum_to_n.lite` — **Sum to N:** Sum integers from one through a nonnegative N with a loop.
43. `samples/043_sum_even_numbers.lite` — **Sum even numbers:** Sum the even integers in an inclusive interval with ordered endpoints.
44. `samples/044_multiplication_table.lite` — **Multiplication table:** Produce the first twelve products of a supplied integer.
45. `samples/045_factorial_iterative.lite` — **Iterative factorial:** Calculate N factorial for a small nonnegative N and define the zero case.
46. `samples/046_integer_power.lite` — **Integer power:** Raise an integer to a nonnegative exponent using repeated multiplication and state the zero-exponent rule.
47. `samples/047_digit_count.lite` — **Digit count:** Count decimal digits in a bounded nonnegative integer, treating zero as one digit.
48. `samples/048_digit_sum.lite` — **Digit sum:** Sum the decimal digits of a nonnegative integer using division and remainder.
49. `samples/049_reverse_integer_digits.lite` — **Reverse integer digits:** Reverse the decimal digits of a nonnegative integer, allowing leading zeroes to disappear.
50. `samples/050_numeric_palindrome.lite` — **Numeric palindrome:** Determine whether a bounded nonnegative integer reads the same in reverse.
51. `samples/051_count_digit_occurrences.lite` — **Count a digit:** Count occurrences of a chosen decimal digit, including its occurrence in the number zero.
52. `samples/052_divisors.lite` — **List divisors:** Find all positive divisors of a positive integer in ascending order.
53. `samples/053_prime_trial_division.lite` — **Primality by trial division:** Determine whether a small integer is prime, rejecting values below two.
54. `samples/054_primes_in_range.lite` — **Primes in a range:** Enumerate primes in a bounded inclusive interval using the previous trial-division idea locally.
55. `samples/055_greatest_common_divisor.lite` — **Greatest common divisor:** Use Euclid's remainder algorithm on nonnegative integers, with an explicit convention for two zeroes.
56. `samples/056_least_common_multiple.lite` — **Least common multiple:** Calculate the LCM of two nonnegative integers using GCD and a zero-input rule.
57. `samples/057_fibonacci_iterative.lite` — **Iterative Fibonacci:** Compute the Nth Fibonacci number with two running values and a stated indexing convention.
58. `samples/058_perfect_number.lite` — **Perfect number:** Test whether a positive integer equals the sum of its proper positive divisors.
59. `samples/059_armstrong_number.lite` — **Armstrong number:** Check whether a small nonnegative integer equals the sum of its digits raised to its digit count.
60. `samples/060_bounded_collatz.lite` — **Bounded Collatz trace:** Follow the Collatz rules from a positive start, stopping at one or a fixed step limit.

## 04 — Functions and reusable numeric rules (061–080)

Needs: local functions, parameters, return values, and explicit input bounds. Design pressure: inference across calls, early returns, tuples, and reusable contracts.

61. `samples/061_unit_converter_functions.lite` — **Unit converter functions:** Factor temperature and distance conversions into named functions and call each with several fixtures.
62. `samples/062_distance_squared.lite` — **Squared point distance:** Write a function returning squared Euclidean distance, avoiding a square-root dependency.
63. `samples/063_manhattan_distance.lite` — **Manhattan distance:** Compute grid distance between two points with a locally defined magnitude helper.
64. `samples/064_fraction_reduction.lite` — **Fraction reduction:** Reduce a numerator and positive denominator by GCD and normalize a zero numerator.
65. `samples/065_fraction_addition.lite` — **Fraction addition:** Add two fractions with positive denominators and return a reduced numerator-denominator pair.
66. `samples/066_fraction_comparison.lite` — **Fraction comparison:** Compare bounded fractions by cross multiplication without converting to floating point.
67. `samples/067_round_to_multiple.lite` — **Round to a multiple:** Round a nonnegative integer to the nearest positive multiple with a stated tie rule.
68. `samples/068_ceiling_division.lite` — **Ceiling division:** Calculate how many fixed-capacity containers are needed for a nonnegative item count.
69. `samples/069_compound_interest.lite` — **Compound interest:** Apply a supplied interest rate for a bounded number of periods and round under a documented policy.
70. `samples/070_savings_target.lite` — **Savings target:** Find the first month that regular deposits reach a target, with a limit preventing an endless search.
71. `samples/071_population_projection.lite` — **Population projection:** Apply births, deaths, and migration over a bounded number of periods without allowing negative population.
72. `samples/072_polynomial_evaluation.lite` — **Polynomial evaluation:** Evaluate a cubic polynomial through a reusable Horner-form function.
73. `samples/073_square_root_bisection.lite` — **Square root by bisection:** Approximate the square root of a nonnegative number with tolerance and iteration limits.
74. `samples/074_square_root_newton.lite` — **Square root by Newton iteration:** Approximate a positive square root and stop on convergence or a bounded iteration count.
75. `samples/075_binomial_coefficient.lite` — **Binomial coefficient:** Calculate small N-choose-K values using an iterative formula and reject K outside zero through N.
76. `samples/076_pascal_row.lite` — **Pascal row values:** Generate a chosen small row of Pascal's triangle from successive binomial coefficients.
77. `samples/077_decimal_to_binary_digits.lite` — **Binary digits:** Derive a nonnegative integer's binary digits using repeated division, without bitwise operators.
78. `samples/078_binary_digits_to_decimal.lite` — **Binary numeral conversion:** Convert a supplied sequence of zero-one digits to a decimal integer and reject other digits.
79. `samples/079_integer_logarithm.lite` — **Integer logarithm:** Find the largest exponent whose positive integer base power does not exceed a positive input.
80. `samples/080_numeric_approximation_check.lite` — **Approximate equality:** Compare numeric results using explicit absolute and relative tolerances, including values near zero.

## 05 — Small text problems (081–100)

Needs: an explicit ASCII traversal/building contract or a local list-of-character-codes representation. Design pressure: text units, concatenation, equality, and absent text helpers.

81. `samples/081_greeting_message.lite` — **Greeting message:** Combine fixed text with a supplied name and preserve intentional spaces and punctuation.
82. `samples/082_ascii_length.lite` — **ASCII length:** Count characters in a supplied ASCII text without assuming a predefined length operation.
83. `samples/083_count_vowels.lite` — **Count vowels:** Count ASCII vowels in mixed-case text using a locally defined character predicate.
84. `samples/084_character_categories.lite` — **Character categories:** Count ASCII letters, digits, spaces, and other characters separately.
85. `samples/085_ascii_case_conversion.lite` — **ASCII case conversion:** Convert letters to upper or lower case while leaving digits and punctuation unchanged.
86. `samples/086_reverse_text.lite` — **Reverse text:** Reverse an ASCII character sequence and cover empty and single-character inputs.
87. `samples/087_text_palindrome.lite` — **Text palindrome:** Test an ASCII string for exact palindrome equality, including spaces and punctuation.
88. `samples/088_count_character.lite` — **Count a character:** Count exact occurrences of a supplied ASCII character in text.
89. `samples/089_remove_character.lite` — **Remove a character:** Build a new text value omitting every occurrence of one chosen character.
90. `samples/090_replace_character.lite` — **Replace a character:** Replace each occurrence of one ASCII character with another.
91. `samples/091_trim_ascii_spaces.lite` — **Trim spaces:** Remove leading and trailing ASCII spaces while retaining spaces inside the text.
92. `samples/092_collapse_spaces.lite` — **Collapse spaces:** Replace each consecutive run of ASCII spaces with one space.
93. `samples/093_count_words.lite` — **Count words:** Count nonempty runs separated by ASCII whitespace under a stated whitespace definition.
94. `samples/094_longest_word.lite` — **Longest word:** Find the first longest whitespace-delimited word and handle text containing no words.
95. `samples/095_initials.lite` — **Initials:** Extract the first ASCII letter of each whitespace-delimited name component.
96. `samples/096_prefix_suffix_checks.lite` — **Prefix and suffix checks:** Test whether text starts or ends with a supplied literal, defining empty-pattern behavior.
97. `samples/097_find_substring_naive.lite` — **Find a substring:** Return the first exact match position with a naive scan and an explicit missing-result representation.
98. `samples/098_count_substrings.lite` — **Count substrings:** Count exact nonempty-pattern occurrences, with an explicit choice about overlapping matches.
99. `samples/099_caesar_cipher.lite` — **Caesar cipher:** Shift ASCII letters cyclically while preserving case and leaving other characters untouched.
100. `samples/100_run_length_encode.lite` — **Run-length encoding:** Turn repeated ASCII characters into character-count pairs without an ambiguous serialized format.

## 06 — First list traversals (101–120)

Needs: list construction, traversal, and a way to collect outputs. Design pressure: element inference, empty input, indexing, and separating binding replacement from element mutation.

101. `samples/101_sum_list.lite` — **Sum a list:** Accumulate all integers in a list and return zero for an empty input.
102. `samples/102_list_average.lite` — **List average:** Compute the mean of a nonempty numeric list and represent absence for empty input.
103. `samples/103_list_minimum_maximum.lite` — **List minimum and maximum:** Find both extrema in one traversal and handle an empty list explicitly.
104. `samples/104_count_matching_values.lite` — **Count matching values:** Count how many list elements equal a supplied target.
105. `samples/105_first_matching_index.lite` — **First matching index:** Locate the first target occurrence or return an explicit not-found outcome.
106. `samples/106_last_matching_index.lite` — **Last matching index:** Locate the last target occurrence while preserving the distinction between index zero and absence.
107. `samples/107_count_signs.lite` — **Count signs:** Count positive, negative, and zero values in one list traversal.
108. `samples/108_list_sorted_check.lite` — **Sorted-list check:** Decide whether integers are in nondecreasing order, treating empty and singleton lists as sorted.
109. `samples/109_second_distinct_largest.lite` — **Second distinct largest:** Find the second-largest distinct integer or report that fewer than two distinct values exist.
110. `samples/110_reverse_list_copy.lite` — **Reversed copy:** Build a reversed list while preserving the original input.
111. `samples/111_reverse_list_in_place.lite` — **Reverse in place:** Swap symmetric elements through explicit writable access without creating a second list.
112. `samples/112_filter_even_values.lite` — **Filter even values:** Collect even integers in original order using a local loop.
113. `samples/113_square_list_values.lite` — **Square list values:** Produce a new list containing each bounded input integer squared.
114. `samples/114_prefix_sums.lite` — **Prefix sums:** Produce the running total after each element, including the behavior of an empty list.
115. `samples/115_adjacent_differences.lite` — **Adjacent differences:** Produce differences between successive numbers and return no differences for fewer than two inputs.
116. `samples/116_copy_selected_range.lite` — **Copy a selected range:** Copy elements from a valid half-open index interval without assuming slice syntax.
117. `samples/117_concatenate_lists.lite` — **Concatenate lists:** Build a new list containing two input lists in order.
118. `samples/118_pairwise_list_sum.lite` — **Pairwise list sum:** Add corresponding integers from equal-length lists and explicitly reject mismatched lengths.
119. `samples/119_dot_product.lite` — **Dot product:** Multiply corresponding numeric elements and sum them, defining length-mismatch handling.
120. `samples/120_all_any_conditions.lite` — **All and any:** Implement all-positive and any-negative checks with short-circuiting and explicit empty-input results.

## 07 — List transformations and windows (121–140)

Needs: indexed reads, controlled writes, and output construction. Design pressure: bounds failures, aliasing, capacity growth, and stable traversal order.

121. `samples/121_insert_at_index.lite` — **Insert at an index:** Construct a list with one new element inserted at a valid position, including either end.
122. `samples/122_remove_at_index.lite` — **Remove at an index:** Remove one selected element, return it, and reject indexes outside the list.
123. `samples/123_rotate_list.lite` — **Rotate a list:** Rotate elements right by a nonnegative amount, normalizing amounts larger than the length.
124. `samples/124_move_zeroes.lite` — **Move zeroes:** Move all zero values to the end while retaining nonzero order.
125. `samples/125_partition_by_predicate.lite` — **Partition by a predicate:** Divide integers into matching and nonmatching lists while preserving order within both groups.
126. `samples/126_remove_consecutive_duplicates.lite` — **Remove consecutive duplicates:** Keep one representative of each adjacent equal-value run.
127. `samples/127_unique_values_by_scan.lite` — **Unique values by scanning:** Remove all later duplicates using nested scans and retain first-occurrence order.
128. `samples/128_merge_sorted_lists.lite` — **Merge sorted lists:** Combine two sorted integer lists into one sorted result while preserving duplicates.
129. `samples/129_sorted_intersection.lite` — **Sorted intersection:** Find common distinct values in two sorted lists with two advancing positions.
130. `samples/130_sorted_union.lite` — **Sorted union:** Combine two sorted lists into sorted distinct values without a set dependency.
131. `samples/131_chunk_list.lite` — **Chunk a list:** Group consecutive elements into chunks of positive maximum size, allowing a shorter final chunk.
132. `samples/132_flatten_one_level.lite` — **Flatten one level:** Concatenate a list of integer lists, including empty inner lists.
133. `samples/133_interleave_lists.lite` — **Interleave lists:** Alternate values from two lists and append the longer list's remaining tail.
134. `samples/134_zip_with_length_check.lite` — **Checked zip:** Pair corresponding elements of equal-length lists or return a length-mismatch outcome.
135. `samples/135_unzip_pairs.lite` — **Unzip pairs:** Split a list of pairs into two lists while retaining pair order.
136. `samples/136_fixed_window_sums.lite` — **Fixed window sums:** Compute every contiguous window sum for a valid positive width using a running total.
137. `samples/137_moving_average.lite` — **Moving average:** Calculate averages for complete fixed-width windows and state behavior when the input is too short.
138. `samples/138_longest_increasing_run.lite` — **Longest increasing run:** Find the first longest contiguous strictly increasing run, distinct from a noncontiguous subsequence.
139. `samples/139_two_sum_sorted.lite` — **Two-sum on sorted input:** Find two distinct positions whose values add to a target using a two-pointer scan.
140. `samples/140_maximum_subarray.lite` — **Maximum subarray:** Find the largest nonempty contiguous sum and its bounds, including all-negative input.

## 08 — Matrices and grid traversal (141–160)

Needs: nested collections or flat storage with dimensions. Design pressure: rectangular shape validation, multidimensional bounds, nested mutation, and output shape inference.

141. `samples/141_matrix_dimensions.lite` — **Matrix dimensions:** Determine row and column counts and reject ragged rows under a stated empty-matrix convention.
142. `samples/142_matrix_total.lite` — **Matrix total:** Sum every numeric cell in a rectangular matrix.
143. `samples/143_row_column_sums.lite` — **Row and column sums:** Produce separate sums for each row and column of a rectangular matrix.
144. `samples/144_matrix_addition.lite` — **Matrix addition:** Add corresponding cells of equal-shaped matrices and reject shape mismatches.
145. `samples/145_matrix_transpose.lite` — **Matrix transpose:** Exchange row and column positions, including nonsquare matrices.
146. `samples/146_diagonal_sums.lite` — **Diagonal sums:** Compute primary and secondary diagonal sums of a square matrix without double-counting a combined center total.
147. `samples/147_identity_matrix_check.lite` — **Identity matrix check:** Verify that a square integer matrix has ones on the main diagonal and zeroes elsewhere.
148. `samples/148_symmetric_matrix_check.lite` — **Symmetric matrix check:** Test whether a square matrix equals its transpose using mirrored cell comparisons.
149. `samples/149_matrix_multiplication.lite` — **Matrix multiplication:** Multiply compatible small matrices and return a clear error for incompatible inner dimensions.
150. `samples/150_rotate_matrix_quarter_turn.lite` — **Quarter-turn rotation:** Build a matrix rotated ninety degrees clockwise, correctly exchanging dimensions.
151. `samples/151_matrix_border.lite` — **Matrix border:** Traverse boundary cells once in clockwise order, covering single-row and single-column grids.
152. `samples/152_spiral_traversal.lite` — **Spiral traversal:** Visit every rectangular matrix cell in inward clockwise spiral order.
153. `samples/153_checkerboard_pattern.lite` — **Checkerboard pattern:** Construct a two-value grid whose orthogonal neighbors alternate.
154. `samples/154_grid_neighbor_count.lite` — **Grid neighbor count:** Count occupied adjacent cells under a supplied four-neighbor or eight-neighbor rule.
155. `samples/155_minesweeper_counts.lite` — **Minesweeper counts:** Replace nonmine cells with counts of surrounding mines while preserving mine positions.
156. `samples/156_tic_tac_toe_winner.lite` — **Tic-tac-toe winner:** Check a supplied three-by-three board for winning lines, draw, or unfinished play.
157. `samples/157_magic_square_check.lite` — **Magic square check:** Verify distinct values from one through N squared and equal row, column, and diagonal sums.
158. `samples/158_sudoku_board_validation.lite` — **Sudoku board validation:** Check a fixed nine-by-nine board for duplicate nonzero digits in rows, columns, and boxes.
159. `samples/159_grid_blur.lite` — **Grid blur:** Replace each numeric cell with its local neighborhood average using an explicitly chosen edge policy.
160. `samples/160_game_of_life_step.lite` — **Game of Life step:** Compute one simultaneous generation on a bounded grid, reading only the original generation.

## 09 — Records and small domain models (161–180)

Needs: record construction, field access, functions, and collections. Design pressure: nominal type identity, defaults, copies, domain units, and explicit writable access.

161. `samples/161_student_record.lite` — **Student record:** Model a student's identifier, name, and scores and compute a summary without changing the input.
162. `samples/162_point_translation.lite` — **Point translation:** Translate a point by a displacement and compare returning a new point with updating writable data.
163. `samples/163_rectangle_intersection.lite` — **Rectangle intersection:** Compute the overlapping rectangle of two axis-aligned rectangles or an explicit empty result.
164. `samples/164_duration_record.lite` — **Normalized duration:** Model hours, minutes, and seconds and normalize an arbitrary nonnegative total.
165. `samples/165_date_validation.lite` — **Date validation:** Validate Gregorian year-month-day records within a stated supported year range.
166. `samples/166_next_calendar_date.lite` — **Next calendar date:** Advance a valid date by one day across month, year, and leap-day boundaries.
167. `samples/167_date_comparison.lite` — **Date comparison:** Order valid date records lexicographically without a date library or timezone assumptions.
168. `samples/168_rational_record.lite` — **Rational record:** Represent reduced fractions with a positive denominator and enforce that invariant through construction functions.
169. `samples/169_complex_arithmetic.lite` — **Complex arithmetic:** Implement addition and multiplication for real-imaginary pairs using a small record type.
170. `samples/170_money_record.lite` — **Money record:** Pair integer minor units with a currency code and reject arithmetic across different currencies.
171. `samples/171_cart_line_totals.lite` — **Cart line totals:** Compute each product quantity times unit price and sum a cart in one currency.
172. `samples/172_inventory_adjustment.lite` — **Inventory adjustment:** Apply a stock increase or decrease to a product record and reject negative final stock.
173. `samples/173_bank_account_operations.lite` — **Bank account operations:** Apply deposits and withdrawals in cents with explicit insufficient-funds handling.
174. `samples/174_contact_lookup.lite` — **Contact lookup:** Find contacts by exact identifier or name and distinguish no match from several matches.
175. `samples/175_book_availability.lite` — **Book availability:** Derive available copy counts from book and loan records while detecting inconsistent totals.
176. `samples/176_employee_pay.lite` — **Employee pay:** Calculate regular and overtime pay from bounded work records and an explicit rounding policy.
177. `samples/177_course_results.lite` — **Course results:** Compute weighted grades for student records and report pass status under supplied course rules.
178. `samples/178_measurement_units.lite` — **Measurement units:** Keep distance and duration as distinct domain records and convert explicitly when calculating speed.
179. `samples/179_copy_then_edit_record.lite` — **Copy then edit:** Make an editable record copy, change inline fields, and check the original under documented copy rules.
180. `samples/180_order_status_transitions.lite` — **Order status transitions:** Model a small order lifecycle and reject transitions such as shipping a cancelled order.

## 10 — Membership, frequency, and grouping (181–200)

Needs: explicit key equality and set/map behavior, implementable with lists of entries. Design pressure: missing keys, duplicate keys, deterministic ordering, and eventual hashing contracts.

181. `samples/181_set_membership.lite` — **Set membership:** Build a distinct integer collection and answer membership queries using a list-backed implementation.
182. `samples/182_set_operations.lite` — **Set operations:** Implement union, intersection, and difference with a documented deterministic output order.
183. `samples/183_subset_check.lite` — **Subset check:** Determine whether every distinct element of one collection belongs to another.
184. `samples/184_duplicate_detection.lite` — **Duplicate detection:** Report whether a collection repeats a value and return the first repeated occurrence.
185. `samples/185_integer_frequency_table.lite` — **Integer frequency table:** Count each distinct integer while preserving first-seen key order.
186. `samples/186_character_histogram.lite` — **Character histogram:** Count ASCII character occurrences and present keys in a stated order.
187. `samples/187_word_frequency.lite` — **Word frequency:** Count lowercase ASCII words using an explicit tokenization and punctuation policy.
188. `samples/188_most_frequent_value.lite` — **Most frequent value:** Select the highest-frequency value using a documented rule for ties and empty input.
189. `samples/189_first_unique_character.lite` — **First unique character:** Find the first ASCII character whose total frequency is one.
190. `samples/190_anagram_check.lite` — **Anagram check:** Compare normalized ASCII letter frequencies while explicitly deciding whether to ignore spaces and case.
191. `samples/191_group_anagrams.lite` — **Group anagrams:** Group words by equal letter counts while retaining deterministic group and member order.
192. `samples/192_two_sum_unsorted.lite` — **Two-sum on unsorted input:** Track previously seen values to find distinct input positions summing to a target.
193. `samples/193_multiset_comparison.lite` — **Multiset comparison:** Decide whether two lists contain identical values with identical multiplicities regardless of order.
194. `samples/194_group_students_by_grade.lite` — **Group students by grade:** Group student records into grade bands and retain input order inside each band.
195. `samples/195_aggregate_sales_by_product.lite` — **Sales by product:** Aggregate quantities and monetary totals by product identifier.
196. `samples/196_invert_multivalue_index.lite` — **Invert an index:** Convert person-to-hobbies entries into hobby-to-people groups without losing shared values.
197. `samples/197_join_records_by_key.lite` — **Join records by key:** Match enrollment records with student records and report unmatched or duplicate identifiers.
198. `samples/198_missing_identifiers.lite` — **Missing identifiers:** Compare expected and observed identifiers and report missing and unexpected members separately.
199. `samples/199_distinct_window_counts.lite` — **Distinct values per window:** Maintain value frequencies while a fixed-width window moves across a list.
200. `samples/200_majority_element.lite` — **Majority element:** Find a candidate with a cancellation scan and verify that it occurs more than half the time.

## 11 — Validation, absence, and typed failures (201–220)

Needs: selected Option/Result and matching directions; exact construction/type syntax may remain a blocker. Design pressure: exhaustive handling, propagation, error unions, and preserving success/error distinctions.

201. `samples/201_checked_list_access.lite` — **Checked list access:** Return an element or a typed bounds failure for a supplied index.
202. `samples/202_optional_contact_search.lite` — **Optional contact search:** Return explicit absence when a contact identifier is missing and handle both outcomes at the call site.
203. `samples/203_checked_integer_division.lite` — **Checked integer division:** Wrap validated integer division in a function with a declared zero-divisor error outcome.
204. `samples/204_validate_age.lite` — **Validate an age:** Accept a bounded age or return distinct below-minimum and above-maximum errors.
205. `samples/205_validate_username.lite` — **Validate a username:** Check a deliberately small ASCII policy for length, leading character, and permitted remaining characters.
206. `samples/206_validate_password_policy.lite` — **Validate a password policy:** Check specified classroom rules and report unmet conditions without claiming real-world security strength.
207. `samples/207_validate_simple_address.lite` — **Validate a simple address:** Check a restricted classroom email-like format and explicitly avoid claiming full email validation.
208. `samples/208_validate_form_all_errors.lite` — **Validate a form:** Collect all independent field errors into a report instead of stopping at the first one.
209. `samples/209_parse_unsigned_integer.lite` — **Parse an unsigned integer:** Convert ASCII digits to a bounded integer and distinguish empty, invalid-character, and overflow failures.
210. `samples/210_parse_signed_integer.lite` — **Parse a signed integer:** Support one optional leading sign and check both supported numeric bounds.
211. `samples/211_parse_boolean_text.lite` — **Parse Boolean text:** Accept a documented set of true/false spellings and reject every other token.
212. `samples/212_parse_fixed_decimal.lite` — **Parse a fixed decimal:** Convert a signed decimal with at most two fractional digits into integer hundredths.
213. `samples/213_parse_calendar_date.lite` — **Parse a calendar date:** Parse an exact year-month-day shape and distinguish format errors from invalid dates.
214. `samples/214_checked_withdrawal.lite` — **Checked withdrawal:** Return either an updated account or a typed amount/balance error, leaving failure state unchanged.
215. `samples/215_validate_transfer.lite` — **Validate a transfer:** Check currency, amount, and funds before producing both resulting account balances.
216. `samples/216_fallback_configuration.lite` — **Fallback configuration:** Use a default only for an absent setting and preserve a distinct error for malformed supplied data.
217. `samples/217_compose_fallible_steps.lite` — **Compose fallible steps:** Parse, validate, and transform a value while preserving each step's declared failure category.
218. `samples/218_handle_batch_results.lite` — **Handle batch results:** Process independent inputs into separate success and error collections without silently dropping failures.
219. `samples/219_bounded_retry.lite` — **Bounded retry:** Retry a scripted fallible operation a fixed number of times and report attempts plus the final outcome.
220. `samples/220_exhaustive_command_dispatch.lite` — **Exhaustive command dispatch:** Handle every variant of a small command model and return a meaningful outcome for each case.

## 12 — Text parsing and formatting (221–240)

Needs: text traversal/building and explicit parse outcomes. Design pressure: cursor state, error locations, escape rules, and reusable helpers without an assumed parser library.

221. `samples/221_split_delimited_text.lite` — **Split delimited text:** Split on one literal delimiter while retaining empty fields and defining empty-input behavior.
222. `samples/222_join_text_fields.lite` — **Join text fields:** Combine fields with a separator without inserting an extra separator at either end.
223. `samples/223_parse_key_value_lines.lite` — **Key-value lines:** Parse nonblank lines containing one key/value separator and report missing keys or separators.
224. `samples/224_parse_restricted_csv.lite` — **Restricted CSV:** Parse comma-separated rows with no quoting, preserving empty fields and rejecting inconsistent column counts.
225. `samples/225_write_restricted_csv.lite` — **Write restricted CSV:** Serialize a rectangular text table and reject fields containing commas or line breaks.
226. `samples/226_parse_quoted_csv.lite` — **Quoted CSV:** Extend a CSV parser to quoted fields, doubled quotes, and embedded line breaks with useful error positions.
227. `samples/227_format_aligned_table.lite` — **Aligned text table:** Compute ASCII column widths and pad cells to create a readable table.
228. `samples/228_wrap_words.lite` — **Word wrapping:** Wrap whitespace-delimited words to a positive line width with a stated oversized-word policy.
229. `samples/229_format_money.lite` — **Format money:** Format signed integer cents with exactly two fractional digits and a supplied currency label.
230. `samples/230_format_duration.lite` — **Format duration:** Format nonnegative whole seconds as zero-padded hours, minutes, and seconds without a formatting library.
231. `samples/231_parse_clock_time.lite` — **Parse clock time:** Parse an exact hours-minutes-seconds representation and validate each field.
232. `samples/232_parse_integer_ranges.lite` — **Parse integer ranges:** Expand a restricted expression such as single values and inclusive ranges with a bounded output limit.
233. `samples/233_template_placeholders.lite` — **Template placeholders:** Replace named placeholders from a supplied entry list and report unknown or unclosed placeholders.
234. `samples/234_escape_markup_text.lite` — **Escape markup text:** Replace the explicitly supported special characters with entities in plain text content.
235. `samples/235_percent_encode_ascii.lite` — **Percent-encode ASCII:** Encode bytes outside a documented safe set as two-digit hexadecimal escapes.
236. `samples/236_percent_decode_ascii.lite` — **Percent-decode ASCII:** Decode percent escapes and reject truncated or invalid hexadecimal pairs.
237. `samples/237_hex_byte_conversion.lite` — **Hexadecimal byte conversion:** Convert bounded byte values to hex pairs and parse them back with exact length checks.
238. `samples/238_run_length_decode.lite` — **Run-length decoding:** Expand character-count pairs with positive counts and a cap on total output size.
239. `samples/239_unicode_scalar_count.lite` — **Unicode scalar count:** Count scalar values in valid UTF-8 bytes and reject malformed sequences; defer grapheme segmentation.
240. `samples/240_text_line_ending_normalization.lite` — **Line-ending normalization:** Convert CRLF and lone CR line endings to LF while preserving all other text.

## 13 — Sorting and searching (241–260)

Needs: sequences, comparison, functions, and controlled mutation; recursion appears only after iterative foundations. Design pressure: comparator contracts, stable ordering, writable parameters, and boundary arithmetic.

241. `samples/241_linear_search_all.lite` — **Linear search for all matches:** Return every matching index from an unsorted list.
242. `samples/242_binary_search.lite` — **Binary search:** Find a target in a sorted list with explicit not-found handling and safe midpoint arithmetic.
243. `samples/243_lower_upper_bounds.lite` — **Lower and upper bounds:** Locate the first not-less and first greater positions around a target in sorted input.
244. `samples/244_insert_into_sorted_list.lite` — **Sorted insertion:** Insert a value at a documented duplicate boundary while preserving sorted order.
245. `samples/245_bubble_sort.lite` — **Bubble sort:** Sort a small mutable integer list with adjacent swaps and stop when a pass makes no changes.
246. `samples/246_selection_sort.lite` — **Selection sort:** Repeatedly select the smallest remaining value and place it in its final position.
247. `samples/247_insertion_sort.lite` — **Insertion sort:** Shift elements to insert each new value into a sorted prefix.
248. `samples/248_sort_records_by_field.lite` — **Sort records by a field:** Order student records by score while retaining original order for equal scores.
249. `samples/249_sort_multiple_keys.lite` — **Sort by multiple keys:** Order records by a primary field, secondary field, and explicit final tie rule.
250. `samples/250_counting_sort.lite` — **Counting sort:** Sort integers from a small supplied range using occurrence counts and reject out-of-range values.
251. `samples/251_bottom_up_merge_sort.lite` — **Bottom-up merge sort:** Merge successively larger sorted runs without recursion, preserving stability.
252. `samples/252_quicksort_partition.lite` — **Quicksort partition:** Partition a mutable region around a pivot and verify the region invariants without sorting recursively.
253. `samples/253_iterative_quicksort.lite` — **Iterative quicksort:** Sort through explicit pending ranges and a local partition helper.
254. `samples/254_quickselect.lite` — **Quickselect:** Find the Kth smallest value with partitioning and explicit invalid-K handling.
255. `samples/255_k_largest_values.lite` — **K largest values:** Maintain a bounded sorted selection while scanning input, including K equal to zero.
256. `samples/256_search_rotated_sorted_list.lite` — **Search a rotated list:** Find a target in a rotated strictly increasing list using a modified binary search.
257. `samples/257_integer_square_root_search.lite` — **Integer square root search:** Use binary search to find the greatest integer whose square does not exceed a nonnegative input.
258. `samples/258_peak_element.lite` — **Peak element:** Find a peak in a nonempty list under a stated neighbor and equal-value policy.
259. `samples/259_sort_invariant_checks.lite` — **Sort invariant checks:** Verify sortedness and preservation of element multiplicities for several local sorting implementations.
260. `samples/260_comparison_count_experiment.lite` — **Comparison-count experiment:** Count comparisons for local sorts on sorted, reversed, and duplicate-heavy fixtures without requiring a clock.

## 14 — Recursion and bounded enumeration (261–280)

Needs: recursive functions and bounded output construction. Design pressure: recursive type inference, call depth, shared versus copied state, and cleanup of backtracking choices.

261. `samples/261_factorial_recursive.lite` — **Recursive factorial:** Express a small factorial through a base case and decreasing recursive argument.
262. `samples/262_gcd_recursive.lite` — **Recursive GCD:** Express Euclid's algorithm recursively and define zero-input behavior.
263. `samples/263_recursive_list_sum.lite` — **Recursive list sum:** Sum a list through an index parameter without copying the remaining tail at every call.
264. `samples/264_recursive_binary_search.lite` — **Recursive binary search:** Search a sorted list through shrinking half-open bounds and explicit absence.
265. `samples/265_exponentiation_by_squaring.lite` — **Exponentiation by squaring:** Compute bounded integer powers with logarithmic recursion and nonnegative exponents.
266. `samples/266_fibonacci_memoization.lite` — **Memoized Fibonacci:** Cache recursive Fibonacci results and count calls to show avoided repeated work.
267. `samples/267_recursive_merge_sort.lite` — **Recursive merge sort:** Sort by dividing ranges and merging results while preserving equal-key order.
268. `samples/268_tower_of_hanoi.lite` — **Tower of Hanoi:** Generate legal disk moves for a small disk count and verify the move count.
269. `samples/269_generate_binary_words.lite` — **Binary words:** Generate every zero-one word of a small fixed length in deterministic order.
270. `samples/270_generate_subsets.lite` — **Generate subsets:** Enumerate every subset of a short list of distinct values, including the empty subset.
271. `samples/271_generate_combinations.lite` — **Generate combinations:** Enumerate size-K selections from distinct values without reordering or repetition.
272. `samples/272_generate_permutations.lite` — **Generate permutations:** Enumerate arrangements of a short distinct-value list with explicit restoration of chosen state.
273. `samples/273_unique_permutations.lite` — **Unique permutations:** Generate each distinct arrangement once when input values contain duplicates.
274. `samples/274_balanced_parentheses_generation.lite` — **Balanced parentheses generation:** Generate all well-formed parenthesis sequences for a small number of pairs.
275. `samples/275_subset_sum_search.lite` — **Subset-sum search:** Find one subset of bounded nonnegative integers adding to a target, retaining selected positions.
276. `samples/276_maze_backtracking.lite` — **Maze backtracking:** Find one path through a small blocked grid without revisiting cells on the current path.
277. `samples/277_word_search_grid.lite` — **Grid word search:** Find an ASCII word along orthogonally adjacent cells without reusing a cell in one match.
278. `samples/278_n_queens.lite` — **N queens:** Enumerate solutions for a small board while rejecting shared columns and diagonals.
279. `samples/279_sudoku_solver.lite` — **Sudoku solver:** Solve one valid partial nine-by-nine board with bounded search and distinguish unsatisfiable input.
280. `samples/280_search_budget.lite` — **Search budget:** Add a node-visit budget to a backtracking solver and distinguish exhaustion from a proven absence of solutions.

## 15 — Implementing small data structures (281–300)

Needs: sequences, records, optional outcomes, and mutation. Use integer indexes for links so pointers and recursive ownership are unnecessary. Design pressure: representation invariants and reusable element contracts.

281. `samples/281_stack.lite` — **Stack:** Implement push, pop, and peek for integers with explicit empty-stack outcomes.
282. `samples/282_queue.lite` — **Queue:** Implement FIFO enqueue and dequeue with a head index and a documented compaction policy.
283. `samples/283_ring_buffer.lite` — **Ring buffer:** Implement a fixed-capacity circular queue that distinguishes full from empty and handles wraparound.
284. `samples/284_deque.lite` — **Deque:** Support insertion and removal at both ends of a bounded circular buffer.
285. `samples/285_min_stack.lite` — **Minimum stack:** Track the current minimum alongside stack values, correctly handling repeated minima.
286. `samples/286_balanced_delimiters.lite` — **Balanced delimiters:** Use a stack to validate nested parentheses, brackets, and braces and report the first mismatch.
287. `samples/287_postfix_evaluator.lite` — **Postfix evaluator:** Evaluate integer tokens and binary operators with stack-underflow and malformed-expression errors.
288. `samples/288_undo_redo.lite` — **Undo and redo:** Maintain two stacks for a small numeric editing model and clear redo history after a new edit.
289. `samples/289_two_stack_queue.lite` — **Queue from two stacks:** Preserve FIFO order by transferring values only when the output stack becomes empty.
290. `samples/290_index_linked_list.lite` — **Index-linked list:** Model singly linked nodes in a list and support insertion, deletion, and traversal through optional indexes.
291. `samples/291_linked_list_cycle_detection.lite` — **Linked-list cycle detection:** Detect cycles in an index-linked structure while validating that every referenced index exists.
292. `samples/292_doubly_linked_list.lite` — **Doubly linked list:** Maintain previous and next indexes and verify both directions after insertions and removals.
293. `samples/293_binary_min_heap.lite` — **Binary min-heap:** Implement insertion and minimum removal in array storage with invariant checks.
294. `samples/294_priority_task_queue.lite` — **Priority task queue:** Order tasks by priority and insertion sequence so equal-priority tasks remain predictable.
295. `samples/295_heap_sort.lite` — **Heap sort:** Build a heap and sort a mutable integer list without a library sort.
296. `samples/296_dictionary_by_entries.lite` — **Dictionary by entries:** Implement lookup, insertion, replacement, and deletion using explicit key-value records.
297. `samples/297_hash_table_chaining.lite` — **Hash table with chaining:** Store bounded integer keys in buckets using a documented local hash and collision handling.
298. `samples/298_hash_table_open_addressing.lite` — **Open-addressed hash table:** Implement probing with explicit empty, occupied, and deleted bucket states.
299. `samples/299_disjoint_set_union.lite` — **Disjoint-set union:** Implement representative lookup and union by size for a fixed universe of integer identifiers.
300. `samples/300_lru_cache.lite` — **LRU cache:** Simulate a bounded least-recently-used cache and verify lookup, replacement, and eviction order.

## 16 — Command arguments and file utilities (301–320)

Needs: host-provided argument and filesystem operations, text decoding, typed I/O failures, and eventually cleanup contracts. These are explicit future host dependencies. Start parsers and transforms on in-memory fixtures; real I/O remains blocked until a host contract exists. File-changing exercises should use a supplied temporary directory and plan changes before applying them.

301. `samples/301_parse_command_arguments.lite` — **Command arguments:** Parse a supplied argument list into positional values and recognized flags, rejecting unknown flags.
302. `samples/302_command_help.lite` — **Command help:** Build usage text for a small command and report missing or extra arguments consistently.
303. `samples/303_read_text_file.lite` — **Read a text file:** Read a supplied path and distinguish missing-file, permission, and decoding failures through the host contract.
304. `samples/304_write_text_file.lite` — **Write a text file:** Write supplied text to an explicitly chosen path with a defined overwrite policy and failure outcome.
305. `samples/305_line_word_byte_counts.lite` — **Line, word, and byte counts:** Count a text file's lines, ASCII whitespace-delimited words, and raw bytes with stated final-line behavior.
306. `samples/306_number_file_lines.lite` — **Number file lines:** Prefix each logical line with its one-based number while specifying final-newline preservation.
307. `samples/307_file_head_tail.lite` — **File head and tail:** Return the first or last N lines, handling zero and files shorter than N.
308. `samples/308_literal_line_filter.lite` — **Literal line filter:** Select lines containing a supplied exact text pattern without a regex dependency.
309. `samples/309_sort_file_lines.lite` — **Sort file lines:** Sort ASCII lines under a stated comparison rule with an optional distinct-only mode.
310. `samples/310_merge_text_files.lite` — **Merge text files:** Combine explicitly listed input files in order with a documented boundary-newline policy.
311. `samples/311_copy_file.lite` — **Copy a file:** Copy bytes to a separate destination and report partial-write or destination-conflict failures.
312. `samples/312_compare_files.lite` — **Compare files:** Determine byte equality and report the first differing offset or a length mismatch.
313. `samples/313_list_directory.lite` — **List a directory:** Read entries from a supplied directory and report a deterministic sorted listing without assuming host iteration order.
314. `samples/314_filter_file_extensions.lite` — **Filter file extensions:** Select regular files by a documented extension rule, including hidden names and names without extensions.
315. `samples/315_directory_size.lite` — **Directory size:** Sum regular-file sizes recursively with an explicit no-symlink-following rule and partial-error report.
316. `samples/316_duplicate_file_candidates.lite` — **Duplicate file candidates:** Group by byte size, then compare bytes exactly to identify identical files without requiring a cryptographic hash.
317. `samples/317_batch_rename_plan.lite` — **Batch rename plan:** Propose filename changes and detect collisions before producing any optional application step.
318. `samples/318_extension_organizer.lite` — **Extension organizer:** Plan moves into extension-based folders and validate destination conflicts inside a supplied working directory.
319. `samples/319_safe_config_replacement.lite` — **Safe configuration replacement:** Prepare validated replacement text and investigate the host's temporary-write and atomic-replace guarantees.
320. `samples/320_streaming_line_count.lite` — **Streaming line count:** Count lines from bounded byte chunks, carrying split CRLF pairs and unfinished lines across chunk boundaries.

## 17 — Practical text and data tools (321–340)

Needs: combinations of parsing, records, aggregation, and formatting. Host I/O is optional: all primary tasks accept in-memory fixtures. Design pressure: preserving source locations and stable report shapes as scripts grow.

321. `samples/321_shopping_list_totals.lite` — **Shopping list totals:** Parse a restricted item-quantity-price table and produce per-item and overall costs.
322. `samples/322_receipt_formatter.lite` — **Receipt formatter:** Produce a readable receipt with aligned amounts, quantity totals, and a documented tax rule.
323. `samples/323_expense_categories.lite` — **Expense categories:** Group validated expense records by category and calculate totals in one currency.
324. `samples/324_monthly_budget_summary.lite` — **Monthly budget summary:** Compare actual category spending with planned amounts and report remaining or exceeded budgets.
325. `samples/325_gradebook_report.lite` — **Gradebook report:** Parse student scores and report averages, extrema, and pass counts while retaining invalid-row diagnostics.
326. `samples/326_attendance_summary.lite` — **Attendance summary:** Aggregate present, absent, and excused attendance per student from dated records.
327. `samples/327_timesheet_summary.lite` — **Timesheet summary:** Validate same-day work intervals and aggregate worked minutes by person and day.
328. `samples/328_sensor_data_summary.lite` — **Sensor data summary:** Separate invalid readings and compute min, max, mean, and threshold counts for valid data.
329. `samples/329_log_level_counts.lite` — **Log level counts:** Parse a restricted log format and count entries by severity, reporting malformed lines.
330. `samples/330_error_log_groups.lite` — **Error log groups:** Group repeated error codes and retain counts plus their first and last supplied sequence positions.
331. `samples/331_access_log_summary.lite` — **Access log summary:** Aggregate a restricted request log by path and status code without claiming a full web-server parser.
332. `samples/332_configuration_overlay.lite` — **Configuration overlay:** Merge default, file-like, and argument-like entry lists with explicit precedence and unknown-key validation.
333. `samples/333_deduplicate_contacts.lite` — **Deduplicate contacts:** Identify matching contacts under a supplied normalized key and report conflicting fields before merging.
334. `samples/334_table_column_selection.lite` — **Table column selection:** Select and reorder named columns while rejecting missing or ambiguous headers.
335. `samples/335_table_row_filter.lite` — **Table row filter:** Apply typed numeric and text predicates to a parsed table without silently accepting failed conversions.
336. `samples/336_table_group_summary.lite` — **Table group summary:** Group rows by selected keys and compute count and sum aggregates.
337. `samples/337_inventory_reorder_report.lite` — **Inventory reorder report:** Find products below reorder thresholds and calculate suggested quantities from supplied target stock levels.
338. `samples/338_dated_reminder_report.lite` — **Dated reminder report:** Compare reminder dates with an explicitly supplied current date and list overdue and upcoming items.
339. `samples/339_markdown_heading_index.lite` — **Markdown heading index:** Extract headings from a deliberately restricted Markdown subset and build an indented outline.
340. `samples/340_source_line_statistics.lite` — **Source line statistics:** Count blank, comment-only, and code lines for a stated toy comment grammar, including multiline comment state.

## 18 — Discrete math, encodings, and numerical tools (341–360)

Needs: bounded numeric representations and local math helpers; bit exercises additionally require an explicit fixed-width unsigned/bit-operation contract or a documented arithmetic emulation. Design pressure: overflow, shifts, conversion, precision, and reproducibility.

341. `samples/341_sieve_of_eratosthenes.lite` — **Prime sieve:** Find all primes up to a bounded limit with a mutable composite-marker list.
342. `samples/342_prime_factorization.lite` — **Prime factorization:** Decompose a positive integer into prime factors with multiplicities and define the input-one result.
343. `samples/343_fast_modular_power.lite` — **Modular power:** Compute a nonnegative integer exponent modulo a positive modulus using repeated squaring within safe multiplication bounds.
344. `samples/344_extended_euclidean_algorithm.lite` — **Extended Euclidean algorithm:** Find GCD and integer coefficients satisfying the Bezout identity for bounded inputs.
345. `samples/345_modular_inverse.lite` — **Modular inverse:** Find an inverse modulo a number greater than one or return a not-coprime outcome.
346. `samples/346_base_conversion.lite` — **Base conversion:** Convert bounded nonnegative integers between textual bases two through thirty-six with explicit digit validation.
347. `samples/347_roman_numerals.lite` — **Roman numerals:** Convert integers in a stated conventional range to Roman notation and reject noncanonical parsed spellings.
348. `samples/348_population_count.lite` — **Population count:** Count set bits in a fixed-width unsigned value and check zero and the all-bits-set case.
349. `samples/349_bit_flags.lite` — **Bit flags:** Set, clear, toggle, and test named flags under an explicit unsigned-width contract.
350. `samples/350_bitset_membership.lite` — **Bitset membership:** Represent a small bounded integer set in bit storage and support add, remove, and membership checks.
351. `samples/351_pack_color_channels.lite` — **Pack color channels:** Pack and unpack bounded red, green, blue, and alpha bytes using a stated byte order.
352. `samples/352_byte_order_conversion.lite` — **Byte order conversion:** Encode and decode a fixed-width unsigned integer in big-endian and little-endian byte sequences.
353. `samples/353_parity_bit.lite` — **Parity bit:** Calculate and verify even parity for fixed-width data, demonstrating which error patterns remain undetected.
354. `samples/354_simple_checksum.lite` — **Simple checksum:** Compute a modular byte-sum checksum and demonstrate a collision without presenting it as cryptographic protection.
355. `samples/355_base64_codec.lite` — **Base64 codec:** Encode and decode byte sequences with explicit padding validation and malformed-input errors.
356. `samples/356_deterministic_prng.lite` — **Deterministic pseudorandom sequence:** Implement a small explicitly bounded generator from a fixed seed and document that it is unsuitable for security.
357. `samples/357_fisher_yates_shuffle.lite` — **Fisher-Yates shuffle:** Shuffle a list with a supplied bounded-choice source and state the requirement for unbiased choices.
358. `samples/358_online_mean_variance.lite` — **Online mean and variance:** Update summary statistics one value at a time with an explicit population-versus-sample variance choice.
359. `samples/359_linear_regression.lite` — **Simple linear regression:** Fit a line to small numeric point fixtures and report insufficient or degenerate data.
360. `samples/360_numerical_integration.lite` — **Trapezoidal integration:** Approximate an integral over a bounded interval using a local numeric function and a positive subdivision count.

## 19 — Two pointers, intervals, and greedy choices (361–380)

Needs: sorting, records, and explicit tie policies. Design pressure: comparator reuse and expressing algorithm invariants without hidden collection behavior.

361. `samples/361_deduplicate_sorted_in_place.lite` — **Deduplicate sorted storage:** Compact a sorted mutable list into a distinct prefix and return its valid logical length.
362. `samples/362_remove_value_in_place.lite` — **Remove a value in place:** Compact retained elements into the input's writable prefix while preserving order.
363. `samples/363_three_sum_zero.lite` — **Three-sum zero:** Find unique value triples summing to zero using sorted input and duplicate-aware two-pointer scans.
364. `samples/364_pair_sum_closest.lite` — **Closest pair sum:** Find two distinct positions whose sum is closest to a target under a stated tie rule.
365. `samples/365_max_container_area.lite` — **Container area:** Choose two nonnegative heights maximizing width times the smaller height using a two-pointer strategy.
366. `samples/366_minimum_positive_window.lite` — **Minimum positive-sum window:** Find the shortest contiguous window reaching a target when every input is positive.
367. `samples/367_longest_unique_substring.lite` — **Longest unique substring:** Find the first longest ASCII substring containing no repeated characters with a moving window.
368. `samples/368_merge_intervals.lite` — **Merge intervals:** Combine overlapping half-open intervals with an explicit policy for touching endpoints.
369. `samples/369_insert_interval.lite` — **Insert an interval:** Add one interval to an already ordered disjoint list and merge affected neighbors.
370. `samples/370_interval_intersections.lite` — **Interval intersections:** Find overlaps between two sorted disjoint interval lists with a joint scan.
371. `samples/371_activity_selection.lite` — **Activity selection:** Select a maximum-size compatible set of unweighted activities by finishing time.
372. `samples/372_meeting_room_count.lite` — **Meeting room count:** Calculate the maximum simultaneous meetings with a stated same-time start/end ordering.
373. `samples/373_platform_count.lite` — **Platform count:** Determine required train platforms from arrivals and departures, explicitly defining whether exact-time reuse is allowed.
374. `samples/374_fractional_knapsack.lite` — **Fractional knapsack:** Maximize value when item fractions are allowed, rejecting zero-weight items or handling them explicitly.
375. `samples/375_greedy_coin_counterexample.lite` — **Greedy coin counterexample:** Compare greedy change with exhaustive bounded search and show why arbitrary denominations need another strategy.
376. `samples/376_job_deadline_scheduling.lite` — **Deadline scheduling:** Choose profitable unit-duration jobs within integer deadlines using a bounded schedule.
377. `samples/377_minimum_rope_connection_cost.lite` — **Rope connection cost:** Repeatedly combine the shortest lengths through a local min-heap and accumulate total cost.
378. `samples/378_gas_station_circuit.lite` — **Gas-station circuit:** Find a starting station permitting one complete circuit or report insufficient total fuel.
379. `samples/379_jump_game_reachability.lite` — **Jump reachability:** Determine whether nonnegative maximum jump lengths allow reaching the last list position.
380. `samples/380_minimum_jumps.lite` — **Minimum jumps:** Calculate the fewest forward jumps to the end or report unreachable input.

## 20 — Dynamic programming (381–400)

Needs: indexed state tables and explicit unreachable states. Design pressure: initialized versus reserved storage, table shapes, optional costs, and reconstruction of decisions.

381. `samples/381_climbing_stairs.lite` — **Climbing stairs:** Count ways to reach a small step count using one-step and two-step moves.
382. `samples/382_minimum_stair_cost.lite` — **Minimum stair cost:** Find the least cost to climb beyond a list of step costs under a stated starting rule.
383. `samples/383_nonadjacent_maximum_sum.lite` — **Nonadjacent maximum sum:** Maximize selected values without taking adjacent positions, explicitly allowing an empty selection.
384. `samples/384_minimum_coin_change.lite` — **Minimum coin change:** Find the fewest positive-denomination coins for a target and distinguish unreachable totals.
385. `samples/385_coin_change_combinations.lite` — **Coin-change combinations:** Count order-independent ways to reach a small target using distinct positive denominations.
386. `samples/386_grid_path_count.lite` — **Grid path count:** Count right/down paths through a bounded rectangular grid with blocked cells.
387. `samples/387_minimum_grid_path_sum.lite` — **Minimum grid path sum:** Find a lowest-cost right/down path and reconstruct its cells.
388. `samples/388_zero_one_knapsack.lite` — **Zero-one knapsack:** Choose whole items at most once to maximize value under a bounded integer capacity.
389. `samples/389_subset_sum_table.lite` — **Subset-sum table:** Determine reachable totals for bounded nonnegative values and recover one selection for a target.
390. `samples/390_equal_partition.lite` — **Equal partition:** Decide whether a list of nonnegative integers can be split into two equal-sum groups.
391. `samples/391_longest_common_subsequence.lite` — **Longest common subsequence:** Find a longest order-preserving common sequence of two short ASCII texts.
392. `samples/392_edit_distance.lite` — **Edit distance:** Calculate insertion, deletion, and replacement distance under unit costs and reconstruct one edit sequence.
393. `samples/393_longest_increasing_subsequence.lite` — **Longest increasing subsequence:** Find a noncontiguous strictly increasing subsequence with a quadratic table and predecessor links.
394. `samples/394_longest_palindromic_subsequence.lite` — **Longest palindromic subsequence:** Find the maximum palindrome subsequence length in short ASCII text.
395. `samples/395_word_break.lite` — **Word break:** Decide whether text can be segmented into supplied nonempty dictionary words and recover a segmentation.
396. `samples/396_rod_cutting.lite` — **Rod cutting:** Maximize revenue from cutting a bounded integer length using a supplied price table.
397. `samples/397_weighted_interval_scheduling.lite` — **Weighted interval scheduling:** Choose compatible intervals maximizing total weight rather than activity count.
398. `samples/398_matrix_chain_cost.lite` — **Matrix-chain cost:** Find the multiplication parenthesization requiring the fewest scalar operations for compatible dimensions.
399. `samples/399_palindrome_partition_cuts.lite` — **Palindrome partition cuts:** Compute the fewest cuts dividing ASCII text into palindromic substrings.
400. `samples/400_small_traveling_salesperson.lite` — **Small traveling salesperson:** Use subset-state dynamic programming to find a minimum round trip on a tiny complete weighted graph.

## 21 — Trees and hierarchical data (401–420)

Needs: index-linked node records, recursion or explicit stacks, and absence handling. Design pressure: recursive shapes without assumed pointers, safe updates, and ownership/cycle distinctions.

401. `samples/401_binary_tree_traversals.lite` — **Binary tree traversals:** Produce preorder, inorder, and postorder node sequences from a validated index-linked binary tree.
402. `samples/402_tree_level_order.lite` — **Tree level order:** Traverse a binary tree by levels using a local queue.
403. `samples/403_tree_size_height.lite` — **Tree size and height:** Calculate node count, leaf count, and height with an explicit empty-tree convention.
404. `samples/404_tree_balance_check.lite` — **Tree balance check:** Determine whether every binary-tree node's subtree heights differ by at most one.
405. `samples/405_mirror_binary_tree.lite` — **Mirror a binary tree:** Exchange left and right links and verify that applying the operation twice restores the structure.
406. `samples/406_tree_equality.lite` — **Tree equality:** Compare structure and stored values without relying on node-storage indexes being identical.
407. `samples/407_bst_lookup_insert.lite` — **BST lookup and insertion:** Maintain a binary search tree with a stated duplicate-key policy.
408. `samples/408_bst_validation.lite` — **BST validation:** Check all inherited key bounds rather than comparing only immediate parent and child values.
409. `samples/409_bst_deletion.lite` — **BST deletion:** Remove keys from leaf, one-child, and two-child nodes while preserving search order.
410. `samples/410_bst_order_statistics.lite` — **BST order statistics:** Select the Kth smallest key and count keys below a query with explicit duplicate semantics.
411. `samples/411_lowest_common_ancestor.lite` — **Lowest common ancestor:** Find a shared ancestor of two node identifiers in a general binary tree, reporting missing targets.
412. `samples/412_tree_path_sum.lite` — **Tree path sum:** Find root-to-leaf paths whose stored values sum to a target.
413. `samples/413_tree_diameter.lite` — **Tree diameter:** Calculate the longest simple path length in a binary tree under a stated edge-count convention.
414. `samples/414_tree_serialization.lite` — **Tree serialization:** Encode and decode a small binary tree with explicit empty-child markers and malformed-input checks.
415. `samples/415_expression_tree_evaluation.lite` — **Expression tree evaluation:** Evaluate numeric leaf and binary-operator nodes with typed arithmetic and shape errors.
416. `samples/416_directory_tree_report.lite` — **Directory tree report:** Render an in-memory hierarchy with indentation, deterministic sibling order, and cycle rejection.
417. `samples/417_trie_dictionary.lite` — **Trie dictionary:** Insert and look up lowercase ASCII words with separate terminal markers for prefixes that are full words.
418. `samples/418_prefix_autocomplete.lite` — **Prefix autocomplete:** Enumerate a bounded number of trie words matching a supplied prefix in lexical order.
419. `samples/419_fenwick_tree.lite` — **Fenwick tree:** Support point updates and prefix/range sums over bounded integer storage.
420. `samples/420_segment_tree.lite` — **Segment tree:** Support point updates and range-minimum queries with explicit interval and identity conventions.

## 22 — Graphs and networks (421–440)

Needs: adjacency representations, queues/stacks, sets, and optional distances. Design pressure: identity versus position, unreachable values, priority ordering, and validating interconnected input.

421. `samples/421_graph_representation.lite` — **Graph representation:** Build adjacency lists from a supplied edge list and validate vertex identifiers and duplicate-edge policy.
422. `samples/422_breadth_first_traversal.lite` — **Breadth-first traversal:** Visit reachable vertices from a start node in deterministic neighbor order.
423. `samples/423_depth_first_traversal.lite` — **Depth-first traversal:** Traverse a graph with an explicit stack and prevent repeated visits through cycles.
424. `samples/424_connected_components.lite` — **Connected components:** Label all components of an undirected graph, including isolated vertices.
425. `samples/425_unweighted_shortest_path.lite` — **Unweighted shortest path:** Reconstruct a shortest path using breadth-first parent links or report no route.
426. `samples/426_grid_shortest_path.lite` — **Grid shortest path:** Find a shortest orthogonal route through a blocked grid and validate endpoints.
427. `samples/427_count_islands.lite` — **Count islands:** Count connected occupied-cell regions with an explicit four-neighbor connectivity rule.
428. `samples/428_flood_fill.lite` — **Flood fill:** Recolor one connected grid region and handle replacement with the existing color without looping.
429. `samples/429_undirected_cycle_detection.lite` — **Undirected cycle detection:** Detect cycles while respecting parent edges and a documented parallel-edge policy.
430. `samples/430_directed_cycle_detection.lite` — **Directed cycle detection:** Distinguish active and completed visits and return one detected cycle.
431. `samples/431_topological_sort.lite` — **Topological sort:** Produce a valid order for a directed acyclic graph or report vertices blocked by a cycle.
432. `samples/432_course_prerequisites.lite` — **Course prerequisites:** Validate a course dependency list and produce a feasible semester grouping without capacity limits.
433. `samples/433_bipartite_check.lite` — **Bipartite check:** Assign two groups to an undirected graph or report a conflicting edge.
434. `samples/434_dijkstra_shortest_paths.lite` — **Dijkstra shortest paths:** Find distances and predecessor routes for a graph with nonnegative bounded edge weights.
435. `samples/435_bellman_ford.lite` — **Bellman-Ford:** Handle negative edge weights and distinguish a reachable negative cycle from an unreachable one.
436. `samples/436_floyd_warshall.lite` — **Floyd-Warshall:** Compute all-pairs shortest distances with explicit unreachable states and negative-cycle reporting.
437. `samples/437_kruskal_spanning_forest.lite` — **Kruskal spanning forest:** Select minimum-weight connecting edges using local sorting and disjoint sets, including disconnected input.
438. `samples/438_prim_spanning_tree.lite` — **Prim spanning tree:** Grow a minimum spanning tree from one vertex and explicitly report disconnected vertices.
439. `samples/439_strongly_connected_components.lite` — **Strongly connected components:** Group directed vertices by mutual reachability using a bounded two-pass traversal.
440. `samples/440_network_flow.lite` — **Small network flow:** Compute maximum source-to-sink flow with augmenting paths and explicit residual-capacity bookkeeping.

## 23 — Deterministic simulations and game logic (441–460)

Needs: explicit state records, event lists, validation, and reproducible choices. Design pressure: atomic transitions, exhaustive events, state ownership, and separating pure rules from future interaction APIs.

441. `samples/441_number_guessing_session.lite` — **Number guessing session:** Process scripted guesses against a fixed secret with higher/lower feedback and an attempt limit.
442. `samples/442_hangman_rules.lite` — **Hangman rules:** Track guessed ASCII letters, repeated guesses, remaining attempts, and win/loss state for a fixed word.
443. `samples/443_tic_tac_toe_session.lite` — **Tic-tac-toe session:** Apply alternating legal moves, reject occupied cells, and forbid moves after a terminal state.
444. `samples/444_connect_four_rules.lite` — **Connect Four rules:** Drop pieces into a bounded board and detect horizontal, vertical, and diagonal wins.
445. `samples/445_battleship_rules.lite` — **Battleship rules:** Validate fixed ship placements and process shots into miss, hit, repeat, and sunk outcomes.
446. `samples/446_snake_step_simulation.lite` — **Snake step simulation:** Advance a grid snake through scripted directions and food positions with explicit tail-movement collision rules.
447. `samples/447_card_deck_simulation.lite` — **Card deck simulation:** Build a fixed deck, shuffle with a supplied choice source, and deal without duplicate cards.
448. `samples/448_blackjack_scoring.lite` — **Blackjack scoring:** Score card hands with flexible ace values and distinguish bust from nonbust outcomes.
449. `samples/449_dice_frequency_experiment.lite` — **Dice frequency experiment:** Feed supplied die outcomes into frequency and pair-sum summaries without assuming randomness APIs.
450. `samples/450_random_walk_simulation.lite` — **Random-walk simulation:** Apply a fixed sequence of directional choices and report displacement plus visited positions.
451. `samples/451_queue_service_simulation.lite` — **Queue service simulation:** Process supplied arrival and service durations to calculate waiting and completion times for one server.
452. `samples/452_round_robin_scheduler.lite` — **Round-robin scheduler:** Simulate process time slices, arrivals, and completion without using operating-system threads.
453. `samples/453_traffic_light_controller.lite` — **Traffic-light controller:** Advance a finite-state controller through supplied elapsed-time events and enforce allowed signal combinations.
454. `samples/454_vending_machine.lite` — **Vending machine:** Process coin, selection, and cancel events while preserving stock, credit, and change invariants.
455. `samples/455_elevator_simulation.lite` — **Elevator simulation:** Serve a bounded list of floor requests under a simple stated movement and selection policy.
456. `samples/456_parking_lot_simulation.lite` — **Parking lot simulation:** Process arrivals and departures with slot allocation, duplicate-entry checks, and occupancy reports.
457. `samples/457_board_dice_race.lite` — **Board dice race:** Advance players through scripted rolls, special squares, and a documented exact-finish rule.
458. `samples/458_cellular_automaton.lite` — **One-dimensional cellular automaton:** Evolve a binary row using a supplied neighborhood rule and explicit boundary behavior.
459. `samples/459_event_queue_simulation.lite` — **Event queue simulation:** Execute time-ordered synthetic events with deterministic same-time ordering and a bounded event budget.
460. `samples/460_tic_tac_toe_minimax.lite` — **Tic-tac-toe minimax:** Choose an optimal legal move on a valid board with deterministic ties and terminal-position handling.

## 24 — Small parsers, evaluators, and language tools (461–480)

Needs: tokens, tagged data, recursive or index-linked syntax nodes, and structured errors. Design pressure: recursive domain types, source spans, result composition, and diagnostics. Each parser deliberately supports a small documented grammar rather than a complete industry format or LiteScript itself.

461. `samples/461_arithmetic_tokenizer.lite` — **Arithmetic tokenizer:** Tokenize bounded integers, operators, and parentheses while retaining source spans and rejecting unknown characters.
462. `samples/462_infix_to_postfix.lite` — **Infix to postfix:** Convert a restricted binary-operator grammar using a stack with stated precedence and associativity.
463. `samples/463_parenthesized_expression_parser.lite` — **Parenthesized expression parser:** Parse fully parenthesized arithmetic into a syntax tree and reject leftover tokens.
464. `samples/464_precedence_expression_parser.lite` — **Precedence expression parser:** Parse ordinary arithmetic precedence, unary minus, and grouping with helpful expected-token errors.
465. `samples/465_expression_interpreter.lite` — **Expression interpreter:** Evaluate parsed arithmetic with variable lookup and explicit missing-name and arithmetic failures.
466. `samples/466_expression_pretty_printer.lite` — **Expression pretty-printer:** Print a syntax tree with sufficient parentheses and verify parse-print structural equivalence.
467. `samples/467_constant_folding.lite` — **Constant folding:** Simplify literal-only expression subtrees while preserving failure behavior and variable-dependent structure.
468. `samples/468_let_binding_interpreter.lite` — **Let-binding interpreter:** Evaluate a toy sequence of immutable named declarations and a final expression with explicit duplicate-name rules.
469. `samples/469_tiny_type_checker.lite` — **Tiny type checker:** Check a toy integer/Boolean expression tree and distinguish unknown names from incompatible operators.
470. `samples/470_json_value_parser.lite` — **JSON subset parser:** Parse bounded nested arrays, objects, integers, Booleans, null, and ASCII strings under documented escape restrictions.
471. `samples/471_json_value_writer.lite` — **JSON subset writer:** Serialize the same bounded subset and verify parse-write round trips without claiming full JSON support.
472. `samples/472_ini_config_parser.lite` — **INI-style configuration parser:** Parse restricted section headers, comments, and key-value entries with explicit duplicate-key rules.
473. `samples/473_glob_pattern_matcher.lite` — **Glob matcher:** Match whole ASCII strings against literal characters, question marks, and stars under a small explicit grammar.
474. `samples/474_regex_subset_matcher.lite` — **Regex subset matcher:** Match whole ASCII strings with literals, dot, and repetition star, rejecting malformed patterns.
475. `samples/475_boolean_query_parser.lite` — **Boolean query parser:** Parse named terms combined with AND, OR, NOT, and parentheses using stated precedence.
476. `samples/476_query_filter_engine.lite` — **Query filter engine:** Evaluate parsed Boolean queries against in-memory document term sets.
477. `samples/477_sql_select_subset.lite` — **SELECT subset interpreter:** Parse a restricted column-selection and equality-filter query against one in-memory table.
478. `samples/478_stack_virtual_machine.lite` — **Stack virtual machine:** Execute a small instruction list with arithmetic, loads, and bounded jumps under a step limit.
479. `samples/479_toy_bytecode_compiler.lite` — **Toy bytecode compiler:** Compile a restricted arithmetic syntax tree to local stack instructions and compare interpreter results.
480. `samples/480_source_diagnostic_renderer.lite` — **Source diagnostic renderer:** Render line, column, source excerpt, and underline for supplied ASCII source spans, including end-of-input errors.

## 25 — Larger algorithms and data-processing exercises (481–500)

Needs: several earlier techniques in one bounded script. Design pressure: interface boundaries inside a file, state size, reconstruction, and testable error reporting. No networking, database engine, or external package is assumed.

481. `samples/481_kmp_substring_search.lite` — **KMP substring search:** Build a prefix table and find all exact pattern occurrences, including overlaps.
482. `samples/482_rabin_karp_search.lite` — **Rabin-Karp search:** Use bounded rolling hashes with exact candidate verification so collisions cannot produce false matches.
483. `samples/483_longest_common_substring.lite` — **Longest common substring:** Find a longest contiguous shared ASCII segment with deterministic ties, distinct from a subsequence.
484. `samples/484_line_diff.lite` — **Line diff:** Produce an insertion/deletion script for small line lists using a documented shortest-edit algorithm and bounded storage.
485. `samples/485_apply_text_patch.lite` — **Apply a text patch:** Apply explicit line-edit operations only when expected source context matches, reporting conflicts without partial output.
486. `samples/486_three_way_text_merge.lite` — **Three-way text merge:** Compare base, left, and right line fixtures and merge disjoint changes while marking overlapping edits as conflicts.
487. `samples/487_huffman_codes.lite` — **Huffman codes:** Build a prefix-code tree from symbol frequencies with deterministic ties and a single-symbol convention.
488. `samples/488_huffman_round_trip.lite` — **Huffman round trip:** Encode and decode a bounded symbol list using explicit code/tree metadata and malformed-bitstream checks.
489. `samples/489_inverted_document_index.lite` — **Inverted document index:** Index normalized ASCII terms with document identifiers and positions from a small document collection.
490. `samples/490_phrase_search.lite` — **Phrase search:** Use positional index entries to find adjacent term sequences within documents.
491. `samples/491_spelling_suggestions.lite` — **Spelling suggestions:** Rank a supplied small dictionary by edit distance with a maximum result count and deterministic ties.
492. `samples/492_dependency_rebuild_plan.lite` — **Dependency rebuild plan:** From changed nodes and a dependency graph, select affected targets and order their rebuilds.
493. `samples/493_spreadsheet_formula_graph.lite` — **Spreadsheet formula graph:** Evaluate a tiny numeric cell grid with references, cached values, and cycle diagnostics.
494. `samples/494_recipe_dependency_expansion.lite` — **Recipe dependency expansion:** Expand nested recipes into base ingredient quantities while detecting cycles and inconsistent units.
495. `samples/495_booking_conflict_report.lite` — **Booking conflict report:** Group bookings by resource and report every overlapping pair with a stated endpoint policy.
496. `samples/496_settlement_minimization.lite` — **Expense settlement:** Convert shared-expense balances into valid debtor-to-creditor transfers without claiming the minimum possible transfer count.
497. `samples/497_apportionment.lite` — **Largest-remainder apportionment:** Allocate an integer total proportionally to nonnegative weights with explicit ties and zero-total-weight handling.
498. `samples/498_small_constraint_scheduler.lite` — **Constraint scheduler:** Assign a small set of tasks to time slots and resources through bounded search with conflict explanations.
499. `samples/499_a_star_grid_search.lite` — **A-star grid search:** Find routes on a weighted grid with nonnegative costs and a documented admissible heuristic.
500. `samples/500_property_checking_harness.lite` — **Bounded property checker:** Generate small deterministic inputs for one local algorithm and reduce a failing input using a simple documented shrinking strategy.

## 26 — Bounded single-file application projects (501–520)

Needs: coherent domain models, commands, validation, and reports. Keep the stated feature set small; scripted command lists are the primary interface. Optional CLI/file adapters must remain local to the file and explicitly depend on future host support. Design pressure: whether a single-file scripting experience still feels clear as types, errors, and state transitions grow.

501. `samples/501_todo_manager.lite` — **Todo manager:** Support add, complete, reopen, remove, and list commands with stable identifiers and filterable status.
502. `samples/502_contact_book.lite` — **Contact book:** Support validated add, edit, delete, exact lookup, and name-prefix search with duplicate-identifier handling.
503. `samples/503_personal_budget.lite` — **Personal budget:** Track categorized income and expenses, apply monthly limits, and produce a supplied-month balance report.
504. `samples/504_student_gradebook.lite` — **Student gradebook:** Manage students and weighted assessments, validate score ranges, and report missing work under an explicit grading policy.
505. `samples/505_library_lending.lite` — **Library lending:** Manage books, members, checkout, and return commands with copy availability and a supplied-date overdue report.
506. `samples/506_quiz_runner.lite` — **Quiz runner:** Run a fixed multiple-choice question bank against scripted answers and produce per-question feedback plus a final score.
507. `samples/507_flashcard_session.lite` — **Flashcard session:** Schedule a small deterministic review queue from supplied dates and answer grades using a documented simple interval rule.
508. `samples/508_habit_tracker.lite` — **Habit tracker:** Record dated completions, reject duplicates, and calculate current and longest streaks relative to a supplied date.
509. `samples/509_expense_sharing.lite` — **Expense sharing:** Track group members and equal or explicit-share expenses, preserve cent totals, and generate a valid settlement plan.
510. `samples/510_inventory_manager.lite` — **Inventory manager:** Apply stock receipts, sales, and corrections with a journal and reorder report, rejecting invalid partial updates.
511. `samples/511_order_processor.lite` — **Order processor:** Validate carts, reserve available stock, calculate totals, and process cancel/fulfill commands through a small lifecycle.
512. `samples/512_ticket_reservation.lite` — **Ticket reservation:** Reserve and cancel numbered seats, reject duplicate ownership, and report availability with no concurrent-booking claims.
513. `samples/513_room_booking.lite` — **Room booking:** Create and cancel dated room reservations with conflict checks and a supplied-date occupancy report.
514. `samples/514_timesheet_invoice.lite` — **Timesheet invoice:** Validate work entries, group billable minutes by project, and produce invoices under explicit rounding and rate rules.
515. `samples/515_personal_calendar.lite` — **Personal calendar:** Manage bounded date-and-time events, detect overlap, and list a supplied week's agenda without recurrence or timezones.
516. `samples/516_local_search_tool.lite` — **Local search tool:** Index supplied document fixtures and support term, phrase, and Boolean queries with stable result ordering.
517. `samples/517_table_query_tool.lite` — **Table query tool:** Parse a bounded CSV fixture and execute column selection, typed filtering, grouping, and sorting commands.
518. `samples/518_task_pipeline_runner.lite` — **Task pipeline runner:** Execute a dependency-ordered list of local simulated jobs with explicit failure, skip, and bounded-retry outcomes.
519. `samples/519_text_adventure.lite` — **Text adventure:** Build a small fixed map with movement, inventory, item use, and a reachable ending through scripted commands.
520. `samples/520_mini_script_runner.lite` — **Mini script runner:** Combine the earlier toy parser, checker, evaluator, and diagnostics for bounded scripts with declarations, arithmetic, and conditionals.

## Completion and gap tracking

The initial state of all 520 entries is **planned**. Add a script only when working on its subject; do not create hundreds of empty placeholder files.

When attempting a script, put its problem statement, fixtures, expected outcomes, supported input bounds, and current status in comments at the top. Suggested statuses are **draft**, **blocked by design**, **blocked by library/host support**, **implemented but unverified**, and **verified**. Verification requires an actual available toolchain and observed results; documentation examples alone do not qualify.

Keep a short gap note with the smallest reproducer and a link to the relevant design document when possible. A lesson may reveal several different needs: a language rule, a type-system rule, a diagnostic improvement, a library primitive, or a host capability. Record those separately so the catalog guides language growth without making every convenience a new language feature.
