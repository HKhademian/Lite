# Drill: `type/string` Scalar Count vs UTF-8 Byte Length

Read one line of text from stdin and print `scalars:<count> utf8Bytes:<byteCount>` where `scalars` uses [`String.length`](lite://module/type/string#String.length) and `utf8Bytes` counts bytes encoded by [`line.utf8Encode()`](lite://module/type/string#String.utf8Encode).

Fix `utf8Bytes` to count encoded UTF-8 bytes rather than repeating scalar length.

See the [verified UTF-8 round trip](lite://handbook/numbers-operators-and-strings#utf-8-round-trip).
