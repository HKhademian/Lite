# How Many Numbers Are Smaller Than the Current Number

**Source:** [LeetCode #1365](https://leetcode.com/problems/how-many-numbers-are-smaller-than-the-current-number/)  
**Difficulty:** 2.0/10 (Easy)  
**Topics:** arrays, hash-table, sorting, counting-sort  
**Harness:** function-style inputs (`name = value` pairs)

## Problem

Given the array nums, for each nums[i] find out how many numbers in the array are smaller than it. That is, for each nums[i] you have to count the number of valid j's such that j != i and nums[j] < nums[i].
Return the answer in an array.

## Public examples

### example-1

```text
Input: nums = [8,1,2,2,3]
Output: [4,0,1,1,3]
```
