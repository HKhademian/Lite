# Course Schedule II

**Source:** [LeetCode #210](https://leetcode.com/problems/course-schedule-ii/)  
**Difficulty:** 5.0/10 (Medium)  
**Topics:** dfs, bfs, graphs, topological-sort  
**Harness:** function-style inputs (`name = value` pairs)

## Problem

There are a total of numCourses courses you have to take, labeled from 0 to numCourses - 1. You are given an array prerequisites where prerequisites[i] = [ai, bi] indicates that you must take course bi first if you want to take course ai.
Return the ordering of courses you should take to finish all courses. If there are many valid answers, return any of them. If it is impossible to finish all courses, return an empty array.

## Public examples

### example-1

```text
Input: numCourses = 2, prerequisites = [[1,0]]
Output: [0,1]
```
