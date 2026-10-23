# First Bad Version

**Source:** [LeetCode #278](https://leetcode.com/problems/first-bad-version/)  
**Difficulty:** 2.0/10 (Easy)  
**Topics:** binary-search, interactive  
**Harness:** function-style inputs (`name = value` pairs)

## Problem

You are a product manager and currently leading a team to develop a new product. Unfortunately, the latest version of your product fails the quality check. Since each version is developed based on the previous version, all the versions after a bad version are also bad.
Suppose you have n versions [1, 2, ..., n] and you want to find out the first bad one, which causes all the following ones to be bad.
You are given an API bool isBadVersion(version) which returns whether version is bad. Implement a function to find the first bad version. You should minimize the number of calls to the API.

## Public examples

### example-1

```text
Input: n = 5, bad = 4
Output: 4
```
