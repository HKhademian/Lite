#include <stdio.h>
#include <inttypes.h>
#include <stdbool.h>
#include <string.h>
typedef struct { const char *data; uint32_t byte_len; int32_t cp_len; } lt_str;
#define LT_STR_LIT(s, cp) ((lt_str){ (s), (uint32_t)(sizeof(s) - 1u), (int32_t)(cp) })
#define LT_ASTR(s) ((lt_str){ (s), (uint32_t)(sizeof(s) - 1u), (int32_t)(sizeof(s) - 1u) })
#define LT_STR(s) ((lt_str){ (s), (uint32_t)(sizeof(s) - 1u), -1 })
#define LT_NULL_STR ((lt_str){ NULL, 0u, 0 })
#if defined(__GNUC__) || defined(__clang__)
#define LT_INLINE static inline __attribute__((unused))
#else
#define LT_INLINE static inline
#endif
LT_INLINE int lt_print_str(lt_str s) {
    if (s.byte_len == 0u) { return 0; }
    return fwrite(s.data, 1u, s.byte_len, stdout) == (size_t)s.byte_len ? 0 : -1;
}
int main(void) {
    int status = 0;
    if (printf("%" PRId64, (int64_t)(INT64_C(42))) < 0) { status = 1; }
    if (printf("\n") < 0) { status = 1; }
    return status;
}
