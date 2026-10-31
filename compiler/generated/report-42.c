#include <stdio.h>
#include <inttypes.h>
int main(void) {
    int status = 0;
    if (printf("%" PRId64 "\n", (int64_t)(INT64_C(42))) < 0) { status = 1; }
    return status;
}
