# Burst Balloons

**Source:** [LeetCode #312](https://leetcode.com/problems/burst-balloons/)  
**Difficulty:** 8.0/10 (Hard)  
**Topics:** arrays, dynamic-programming  
**Harness:** function-style inputs (`name = value` pairs)

## Problem

You are given n balloons, indexed from 0 to n - 1. Each balloon is painted with a number on it represented by an array nums. You are asked to burst all the balloons.
If you burst the ith balloon, you will get nums[i - 1] * nums[i] * nums[i + 1] coins. If i - 1 or i + 1 goes out of bounds of the array, then treat it as if there is a balloon with a 1 painted on it.
Return the maximum coins you can collect by bursting the balloons wisely.

## Public examples

### example-1

```text
Input: nums = [3,1,5,8]
Output: 167
```
