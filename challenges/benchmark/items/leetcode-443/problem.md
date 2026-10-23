# String Compression

**Source:** [LeetCode #443](https://leetcode.com/problems/string-compression/)  
**Difficulty:** 5.0/10 (Medium)  
**Topics:** two-pointers, strings  
**Harness:** function-style inputs (`name = value` pairs)

## Problem

Given an array of characters chars, compress it using the following algorithm:
Begin with an empty string s. For each group of consecutive repeating characters in chars:
The compressed string s should not be returned separately, but instead, be stored in the input character array chars. Note that group lengths that are 10 or longer will be split into multiple characters in chars.
After you are done modifying the input array, return the new length of the array.
You must write an algorithm that uses only constant extra space.

## Public examples

### example-1

```text
Input: chars = ["a","a","b","b","c","c","c"]
Output: Return 6, and the first 6 characters of the input array should be: ["a","2","b","2","c","3"]
```
