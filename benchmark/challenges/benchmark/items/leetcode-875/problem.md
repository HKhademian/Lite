# Koko Eating Bananas

**Source:** [LeetCode #875](https://leetcode.com/problems/koko-eating-bananas/)  
**Difficulty:** 5.0/10 (Medium)  
**Topics:** arrays, binary-search  
**Harness:** function-style inputs (`name = value` pairs)

## Problem

Koko loves to eat bananas. There are n piles of bananas, the ith pile has piles[i] bananas. The guards have gone and will come back in h hours.
Koko can decide her bananas-per-hour eating speed of k. Each hour, she chooses some pile of bananas and eats k bananas from that pile. If the pile has less than k bananas, she eats all of them instead and will not eat any more bananas during this hour.
Koko likes to eat slowly but still wants to finish eating all the bananas before the guards return.
Return the minimum integer k such that she can eat all the bananas within h hours.

## Public examples

### example-1

```text
Input: piles = [3,6,7,11], h = 8
Output: 4
```
