#include <stdio.h>
int main(void) {
    return fputs("42\n", stdout) == EOF ? 1 : 0;
}
