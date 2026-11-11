# Minimum Interval to Include Each Query

**Source:** [LeetCode #1851](https://leetcode.com/problems/minimum-interval-to-include-each-query/)  
**Difficulty:** 8.0/10 (Hard)  
**Topics:** arrays, binary-search, sweep-line, sorting, heap  
**Harness:** function-style inputs (`name = value` pairs)

## Problem

You are given a 2D integer array intervals, where intervals[i] = [lefti, righti] describes the ith interval starting at lefti and ending at righti (inclusive). The size of an interval is defined as the number of integers it contains, or more formally righti - lefti + 1.
You are also given an integer array queries. The answer to the jth query is the size of the smallest interval i such that lefti <= queries[j] <= righti. If no such interval exists, the answer is -1.
Return an array containing the answers to the queries.

## Public examples

### example-1

```text
Input: intervals = [[1,4],[2,4],[3,6],[4,4]], queries = [2,3,4,5]
Output: [3,3,1,4]
```
