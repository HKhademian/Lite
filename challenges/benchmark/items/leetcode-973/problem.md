# K Closest Points to Origin

**Source:** [LeetCode #973](https://leetcode.com/problems/k-closest-points-to-origin/)  
**Difficulty:** 5.0/10 (Medium)  
**Topics:** arrays, math, divide-and-conquer, geometry, sorting, heap, quickselect  
**Harness:** function-style inputs (`name = value` pairs)

## Problem

Given an array of points where points[i] = [xi, yi] represents a point on the X-Y plane and an integer k, return the k closest points to the origin (0, 0).
The distance between two points on the X-Y plane is the Euclidean distance (i.e., √(x1 - x2)2 + (y1 - y2)2).
You may return the answer in any order. The answer is guaranteed to be unique (except for the order that it is in).

## Public examples

### example-1

```text
Input: points = [[1,3],[-2,2]], k = 1
Output: [[-2,2]]
```
