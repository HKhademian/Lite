# Decode Ways

**Source:** [LeetCode #91](https://leetcode.com/problems/decode-ways/)  
**Difficulty:** 5.0/10 (Medium)  
**Topics:** strings, dynamic-programming  
**Harness:** function-style inputs (`name = value` pairs)

## Problem

You have intercepted a secret message encoded as a string of numbers. The message is decoded via the following mapping:
"1" -> 'A'
"2" -> 'B'
...
"25" -> 'Y'
"26" -> 'Z'
However, while decoding the message, you realize that there are many different ways you can decode the message because some codes are contained in other codes ("2" and "5" vs "25").
For example, "11106" can be decoded into:
Note: there may be strings that are impossible to decode.

Given a string s containing only digits, return the number of ways to decode it. If the entire string cannot be decoded in any valid way, return 0.
The test cases are generated so that the answer fits in a 32-bit integer.

## Public examples

### example-1

```text
Input: s = "12"
Output: 2
```
