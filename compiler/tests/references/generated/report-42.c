#include <stdio.h>
#include <inttypes.h>
#include <stdbool.h>
#include <string.h>
int main(void) {
    int status = 0;
    if (printf("%" PRId64, (int64_t)(INT64_C(42))) < 0) { status = 1; }
    if (printf("\n") < 0) { status = 1; }
    return status;
}
