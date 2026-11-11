# Intersection of Two Linked Lists

**Source:** [LeetCode #160](https://leetcode.com/problems/intersection-of-two-linked-lists/)  
**Difficulty:** 2.0/10 (Easy)  
**Topics:** hash-table, linked-list, two-pointers  
**Harness:** function-style inputs (`name = value` pairs)

## Problem

Given the heads of two singly linked-lists headA and headB, return the node at which the two lists intersect. If the two linked lists have no intersection at all, return null.
For example, the following two linked lists begin to intersect at node c1:
The test cases are generated such that there are no cycles anywhere in the entire linked structure.
Note that the linked lists must retain their original structure after the function returns.
Custom Judge:
The inputs to the judge are given as follows (your program is not given these inputs):
The judge will then create the linked structure based on these inputs and pass the two heads, headA and headB to your program. If you correctly return the intersected node, then your solution will be accepted.

## Public examples

### example-1

```text
Input: intersectVal = 8, listA = [4,1,8,4,5], listB = [5,6,1,8,4,5], skipA = 2, skipB = 3
Output: Intersected at '8'
```
