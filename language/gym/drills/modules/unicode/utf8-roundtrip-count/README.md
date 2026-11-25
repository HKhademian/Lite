# Drill: `core/text` Scalar Count vs UTF-8 Byte Length

Read one line of text from stdin and print `scalars:<count> utf8Bytes:<byteCount>` where `scalars` uses [`String.length`](lite://module/core/text#String.length) and `utf8Bytes` counts bytes encoded by [`line.utf8Encode()`](lite://module/core/text#String.utf8Encode).

Fix `utf8Bytes` to count encoded UTF-8 bytes rather than repeating scalar length.
