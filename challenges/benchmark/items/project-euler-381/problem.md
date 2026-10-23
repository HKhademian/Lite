# $(\text{prime}-k)$ Factorial

**Source:** [Project Euler #381](https://projecteuler.net/problem=381)  
**Answer type:** one number  
**Difficulty:** 6.0/10 (381)

## Problem

For a prime $p$ let $S(p) = (\sum (p-k)!) \bmod (p)$ for $1 \le k \le 5$.

For example, if $p=7$,

$(7-1)! + (7-2)! + (7-3)! + (7-4)! + (7-5)! = 6! + 5! + 4! + 3! + 2! = 720+120+24+6+2 = 872$.
 
As $872 \bmod (7) = 4$, $S(7) = 4$.

It can be verified that $\sum S(p) = 480$ for $5 \le p \lt 100$.

Find $\sum S(p)$ for $5 \le p \lt 10^8$.

## Output

Print the single numeric answer.
