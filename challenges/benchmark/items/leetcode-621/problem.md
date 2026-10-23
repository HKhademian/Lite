# Task Scheduler

**Source:** [LeetCode #621](https://leetcode.com/problems/task-scheduler/)  
**Difficulty:** 5.0/10 (Medium)  
**Topics:** arrays, hash-table, greedy, sorting, heap, counting  
**Harness:** function-style inputs (`name = value` pairs)

## Problem

You are given an array of CPU tasks, each labeled with a letter from A to Z, and a number n. Each CPU interval can be idle or allow the completion of one task. Tasks can be completed in any order, but there's a constraint: there has to be a gap of at least n intervals between two tasks with the same label.
Return the minimum number of CPU intervals required to complete all tasks.

## Public examples

### example-1

```text
Input: tasks = ["A","A","A","B","B","B"], n = 2
Output: 8
```
