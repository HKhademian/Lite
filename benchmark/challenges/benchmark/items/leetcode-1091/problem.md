# Shortest Path in Binary Matrix

**Source:** [LeetCode #1091](https://leetcode.com/problems/shortest-path-in-binary-matrix/)  
**Difficulty:** 5.0/10 (Medium)  
**Topics:** arrays, bfs, matrix  
**Harness:** function-style inputs (`name = value` pairs)

## Problem

Given an n x n binary matrix grid, return the length of the shortest clear path in the matrix. If there is no clear path, return -1.
A clear path in a binary matrix is a path from the top-left cell (i.e., (0, 0)) to the bottom-right cell (i.e., (n - 1, n - 1)) such that:
The length of a clear path is the number of visited cells of this path.

## Public examples

### example-1

```text
Input: grid = [[0,1],[1,0]]
Output: 2
```
