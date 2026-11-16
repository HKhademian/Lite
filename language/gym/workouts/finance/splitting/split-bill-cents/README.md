# Workout: Split Bill in Cents

Read two integers from stdin: `cents` (total bill in minor currency units) and `people`.
- If `cents < 0` or `people <= 0`, print `"INVALID"`.
- Otherwise print `"each:" + <cents / people> + " rem:" + <cents % people>`.
