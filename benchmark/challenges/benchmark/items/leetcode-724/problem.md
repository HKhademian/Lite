# Find Pivot Index

**Source:** [LeetCode #724](https://leetcode.com/problems/find-pivot-index/)  
**Difficulty:** 2.0/10 (Easy)  
**Topics:** arrays, prefix-sum  
**Harness:** function-style inputs (`name = value` pairs)

## Problem

Given an array of integers nums, calculate the pivot index of this array.
The pivot index is the index where the sum of all the numbers strictly to the left of the index is equal to the sum of all the numbers strictly to the index's right.
If the index is on the left edge of the array, then the left sum is 0 because there are no elements to the left. This also applies to the right edge of the array.
Return the leftmost pivot index. If no such index exists, return -1.

## Public examples

### example-1

```text
Input: nums = [1,7,3,6,5,6]
Output: 3
```
