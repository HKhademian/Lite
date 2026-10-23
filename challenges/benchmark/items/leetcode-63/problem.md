# Unique Paths II

**Source:** [LeetCode #63](https://leetcode.com/problems/unique-paths-ii/)  
**Difficulty:** 5.0/10 (Medium)  
**Topics:** arrays, dynamic-programming, matrix  
**Harness:** function-style inputs (`name = value` pairs)

## Problem

You are given an m x n integer array grid. There is a robot initially located at the top-left corner (i.e., grid[0][0]). The robot tries to move to the bottom-right corner (i.e., grid[m - 1][n - 1]). The robot can only move either down or right at any point in time.
An obstacle and space are marked as 1 or 0 respectively in grid. A path that the robot takes cannot include any square that is an obstacle.
Return the number of possible unique paths that the robot can take to reach the bottom-right corner.
The testcases are generated so that the answer will be less than or equal to 2 * 109.

## Public examples

### example-1

```text
Input: obstacleGrid = [[0,0,0],[0,1,0],[0,0,0]]
Output: 2
```
