# Cheapest Flights Within K Stops

**Source:** [LeetCode #787](https://leetcode.com/problems/cheapest-flights-within-k-stops/)  
**Difficulty:** 5.0/10 (Medium)  
**Topics:** dynamic-programming, dfs, bfs, graphs, heap, shortest-path  
**Harness:** function-style inputs (`name = value` pairs)

## Problem

There are n cities connected by some number of flights. You are given an array flights where flights[i] = [fromi, toi, pricei] indicates that there is a flight from city fromi to city toi with cost pricei.
You are also given three integers src, dst, and k, return the cheapest price from src to dst with at most k stops. If there is no such route, return -1.

## Public examples

### example-1

```text
Input: n = 4, flights = [[0,1,100],[1,2,100],[2,0,100],[1,3,600],[2,3,200]], src = 0, dst = 3, k = 1
Output: 700
```
