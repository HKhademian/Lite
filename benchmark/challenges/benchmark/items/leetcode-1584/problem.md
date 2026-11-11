# Min Cost to Connect All Points

**Source:** [LeetCode #1584](https://leetcode.com/problems/min-cost-to-connect-all-points/)  
**Difficulty:** 5.0/10 (Medium)  
**Topics:** arrays, union-find, graphs, minimum-spanning-tree  
**Harness:** function-style inputs (`name = value` pairs)

## Problem

You are given an array points representing integer coordinates of some points on a 2D-plane, where points[i] = [xi, yi].
The cost of connecting two points [xi, yi] and [xj, yj] is the manhattan distance between them: |xi - xj| + |yi - yj|, where |val| denotes the absolute value of val.
Return the minimum cost to make all points connected. All points are connected if there is exactly one simple path between any two points.

## Public examples

### example-1

```text
Input: points = [[0,0],[2,2],[3,10],[5,2],[7,0]]
Output: 20
```
