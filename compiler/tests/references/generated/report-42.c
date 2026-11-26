#include <stdio.h>
#include <inttypes.h>
#include <stdbool.h>
#include <string.h>
typedef struct { uint64_t byte_len; int64_t cp_len; } lt_str_jumbo_hdr;
typedef union {
    struct { char buf[15]; uint8_t tag; } sso;
    struct {
        const char *data;
#if UINTPTR_MAX <= 0xffffffffu
        uint32_t _ptr_pad;
#endif
        uint32_t byte_len;
        uint32_t meta;
    } ext;
    struct { uint64_t w0; uint64_t w1; } raw;
} lt_str;
_Static_assert(sizeof(lt_str) == 16, "lt_str must be 16 bytes");
#define LT_STR_SSO(s, len) ((lt_str){ .sso = { s, (uint8_t)(len) } })
#define LT_STR_LIT(s, cp) ((lt_str){ .ext = { .data = (s), .byte_len = (uint32_t)(sizeof(s) - 1u), .meta = UINT32_C(0x80000000) | (uint32_t)(cp) } })
#define LT_STR(s) ((lt_str){ .ext = { .data = (s), .byte_len = (uint32_t)(sizeof(s) - 1u), .meta = UINT32_C(0xFFFFFFFF) } })
#define LT_NULL_STR ((lt_str){ .ext = { .data = NULL, .byte_len = 0u, .meta = UINT32_C(0x80000000) } })
#define LT_EMPTY_STR ((lt_str){ .raw = { 0u, 0u } })
#if defined(__GNUC__) || defined(__clang__)
#define LT_INLINE static inline __attribute__((unused))
#else
#define LT_INLINE static inline
#endif
#if defined(__STDC_NO_THREADS__)
#define LT_THREAD_LOCAL static
#else
#define LT_THREAD_LOCAL static _Thread_local
#endif
LT_INLINE bool lt_str_is_ext(lt_str s) { return (s.sso.tag & 0x80u) != 0u; }
LT_INLINE size_t lt_str_byte_len(lt_str s) {
    if (!lt_str_is_ext(s)) { return (size_t)(s.sso.tag & 0x0Fu); }
    if (s.ext.byte_len == UINT32_MAX) {
        return (size_t)((const lt_str_jumbo_hdr *)s.ext.data)[-1].byte_len;
    }
    return (size_t)s.ext.byte_len;
}
LT_INLINE int64_t lt_str_cp_len_known(lt_str s) {
    if (!lt_str_is_ext(s)) {
        return ((s.raw.w0 | s.raw.w1) & UINT64_C(0x8080808080808080)) == 0u ? (int64_t)(s.sso.tag & 0x0Fu) : -1;
    }
    if (s.ext.byte_len == UINT32_MAX) { return ((const lt_str_jumbo_hdr *)s.ext.data)[-1].cp_len; }
    uint32_t m = s.ext.meta & UINT32_C(0x7FFFFFFF);
    return (m == UINT32_C(0x7FFFFFFF)) ? -1 : (int64_t)m;
}
LT_INLINE uint32_t lt_str_pack_meta(int64_t cp_len) {
    if (cp_len < 0 || cp_len >= (int64_t)0x7FFFFFFF) { return UINT32_C(0xFFFFFFFF); }
    return UINT32_C(0x80000000) | (uint32_t)cp_len;
}
LT_INLINE const char *lt_str_data(const lt_str *s) {
    return lt_str_is_ext(*s) ? (s->ext.data != NULL ? s->ext.data : "") : s->sso.buf;
}
#define lt_text_cstr(s) lt_str_data((const lt_str[1]){ (s) })
LT_INLINE lt_str lt_str_from_sso(const char *src, size_t len) {
    lt_str r = LT_EMPTY_STR;
    if (len > 0u) { memcpy(r.sso.buf, src, len); }
    r.sso.tag = (uint8_t)len;
    return r;
}
LT_INLINE lt_str lt_astr_make(const char *s, size_t n) {
    if (n <= 14u) { return lt_str_from_sso(s, n); }
    return (lt_str){ .ext = { .data = s, .byte_len = (uint32_t)n, .meta = lt_str_pack_meta((int64_t)n) } };
}
#define LT_ASTR(s) lt_astr_make((s), sizeof(s) - 1u)
LT_INLINE int lt_print_str(lt_str s) {
    size_t bl = lt_str_byte_len(s);
    if (bl == 0u) { return 0; }
    return fwrite(lt_str_data(&s), 1u, bl, stdout) == bl ? 0 : -1;
}
int main(void) {
    int status = 0;
    if (printf("%" PRId64, (int64_t)(INT64_C(42))) < 0) { status = 1; }
    if (printf("\n") < 0) { status = 1; }
    return status;
}
