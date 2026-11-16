# Drill: `core/unicode` Scalar Count vs UTF-8 Byte Length

Read one line of text from stdin and print `scalars:<count> utf8Bytes:<byteCount>` where `scalars` uses `text.length(line)` and `utf8Bytes` counts bytes encoded by `unicode.utf8Encode(line)`.

Fix `utf8Bytes` to count encoded UTF-8 bytes rather than repeating scalar length.
