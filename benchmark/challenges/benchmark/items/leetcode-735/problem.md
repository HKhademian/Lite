# Asteroid Collision

**Source:** [LeetCode #735](https://leetcode.com/problems/asteroid-collision/)  
**Difficulty:** 5.0/10 (Medium)  
**Topics:** arrays, stack, simulation  
**Harness:** function-style inputs (`name = value` pairs)

## Problem

We are given an array asteroids of integers representing asteroids in a row. The indices of the asteriod in the array represent their relative position in space.
For each asteroid, the absolute value represents its size, and the sign represents its direction (positive meaning right, negative meaning left). Each asteroid moves at the same speed.
Find out the state of the asteroids after all collisions. If two asteroids meet, the smaller one will explode. If both are the same size, both will explode. Two asteroids moving in the same direction will never meet.

## Public examples

### example-1

```text
Input: asteroids = [5,10,-5]
Output: [5,10]
```
