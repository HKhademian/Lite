# Linked List Cycle

**Source:** [LeetCode #141](https://leetcode.com/problems/linked-list-cycle/)  
**Difficulty:** 2.0/10 (Easy)  
**Topics:** hash-table, linked-list, two-pointers  
**Harness:** function-style inputs (`name = value` pairs)

## Problem

Given head, the head of a linked list, determine if the linked list has a cycle in it.
There is a cycle in a linked list if there is some node in the list that can be reached again by continuously following the next pointer. Internally, pos is used to denote the index of the node that tail's next pointer is connected to. Note that pos is not passed as a parameter.
Return true if there is a cycle in the linked list. Otherwise, return false.

## Public examples

### example-1

```text
Input: head = [3,2,0,-4], pos = 1
Output: true
```
