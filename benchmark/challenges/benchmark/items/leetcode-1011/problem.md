# Capacity To Ship Packages Within D Days

**Source:** [LeetCode #1011](https://leetcode.com/problems/capacity-to-ship-packages-within-d-days/)  
**Difficulty:** 5.0/10 (Medium)  
**Topics:** arrays, binary-search  
**Harness:** function-style inputs (`name = value` pairs)

## Problem

A conveyor belt has packages that must be shipped from one port to another within days days.
The ith package on the conveyor belt has a weight of weights[i]. Each day, we load the ship with packages on the conveyor belt (in the order given by weights). We may not load more weight than the maximum weight capacity of the ship.
Return the least weight capacity of the ship that will result in all the packages on the conveyor belt being shipped within days days.

## Public examples

### example-1

```text
Input: weights = [1,2,3,4,5,6,7,8,9,10], days = 5
Output: 15
```
