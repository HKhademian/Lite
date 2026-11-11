# Linked List Cycle II

**Source:** [LeetCode #142](https://leetcode.com/problems/linked-list-cycle-ii/)  
**Difficulty:** 5.0/10 (Medium)  
**Topics:** hash-table, linked-list, two-pointers  
**Harness:** function-style inputs (`name = value` pairs)

## Problem

Given the head of a linked list, return the node where the cycle begins. If there is no cycle, return null.
There is a cycle in a linked list if there is some node in the list that can be reached again by continuously following the next pointer. Internally, pos is used to denote the index of the node that tail's next pointer is connected to (0-indexed). It is -1 if there is no cycle. Note that pos is not passed as a parameter.
Do not modify the linked list.

## Public examples

### example-1

```text
Input: head = [3,2,0,-4], pos = 1
Output: tail connects to node index 1
```
