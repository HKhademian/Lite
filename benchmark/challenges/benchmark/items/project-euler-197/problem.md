# A Recursively Defined Sequence

**Source:** [Project Euler #197](https://projecteuler.net/problem=197)  
**Answer type:** one number  
**Difficulty:** 4.0/10 (197)

## Problem

Given is the function $f(x) = \lfloor 2^{30.403243784 - x^2}\rfloor \times 10^{-9}$ ($\lfloor \, \rfloor$ is the floor-function),

the sequence $u_n$ is defined by $u_0 = -1$ and $u_{n + 1} = f(u_n)$.

Find $u_n + u_{n + 1}$ for $n = 10^{12}$.

Give your answer with $9$ digits after the decimal point.

## Output

Print the single numeric answer.
