#!/usr/bin/env sh
# Zero-Node.js native C11 CLI builder.
# Bootstraps directly from tracked compiler/bootstrap/compiler.c using only cc,
# producing standalone native binaries: lite-compile-c, lite-build, and lite-fmt.
set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
ROOT=$(CDPATH= cd -- "$SCRIPT_DIR/../.." && pwd)
CC_BIN="${CC:-cc}"
OUT_DIR="$ROOT/.lite/native-bin"
VERIFY=1

while [ $# -gt 0 ]; do
    case "$1" in
        --out)
            shift
            OUT_DIR="$1"
            ;;
        --cc)
            shift
            CC_BIN="$1"
            ;;
        --no-verify)
            VERIFY=0
            ;;
        -h|--help)
            echo "Usage: $0 [--out <dir>] [--cc <compiler>] [--no-verify]"
            exit 0
            ;;
        *)
            echo "build-native-cli: unknown argument: $1" >&2
            exit 2
            ;;
    esac
    shift
done

SEED_C="$ROOT/compiler/bootstrap/compiler.c"
if [ ! -f "$SEED_C" ]; then
    echo "build-native-cli: missing tracked bootstrap source: $SEED_C" >&2
    exit 1
fi

mkdir -p "$OUT_DIR"
TMP_DIR=$(mktemp -d "${TMPDIR:-/tmp}/lite-native-cli.XXXXXX")
trap 'rm -rf "$TMP_DIR"' EXIT

CFLAGS="-std=c11 -Wall -Wextra -Werror -O2"

echo "build-native-cli: building lite-compile-c from compiler/bootstrap/compiler.c..."
"$CC_BIN" $CFLAGS "$SEED_C" -o "$OUT_DIR/lite-compile-c" -lm

echo "build-native-cli: building lite-build from tools/src/build.lts..."
"$OUT_DIR/lite-compile-c" -O1 "$ROOT/tools/src/build.lts" --out "$TMP_DIR/build.c"
"$CC_BIN" $CFLAGS "$TMP_DIR/build.c" -o "$OUT_DIR/lite-build" -lm

echo "build-native-cli: building lite-fmt from tools/src/fmt.lts..."
"$OUT_DIR/lite-compile-c" -O1 "$ROOT/tools/src/fmt.lts" --out "$TMP_DIR/fmt.c"
"$CC_BIN" $CFLAGS "$TMP_DIR/fmt.c" -o "$OUT_DIR/lite-fmt" -lm

echo "build-native-cli: building igniter-c from tools/src/ignite.lts..."
"$OUT_DIR/lite-compile-c" -O1 "$ROOT/tools/src/ignite.lts" --out "$TMP_DIR/igniter.c"
"$CC_BIN" $CFLAGS "$TMP_DIR/igniter.c" -o "$OUT_DIR/igniter-c" -lm

if [ "$VERIFY" -eq 1 ]; then
    echo "build-native-cli: verifying zero-Node native binaries..."
    "$OUT_DIR/lite-fmt" --check "$ROOT/samples/programs/math/fibonacci.lts"
    "$OUT_DIR/lite-build" --quiet "$ROOT/samples/programs/math/fibonacci.lts" -o "$TMP_DIR/fib"
    FIB_OUT=$("$TMP_DIR/fib")
    case "$FIB_OUT" in
        *"fib(12): 144"*)
            ;;
        *)
            echo "build-native-cli: unexpected fibonacci output: $FIB_OUT" >&2
            exit 1
            ;;
    esac
fi

echo "build-native-cli: PASS"
echo "  out:            $OUT_DIR"
echo "  lite-compile-c: $(wc -c < "$OUT_DIR/lite-compile-c" | tr -d ' ') bytes"
echo "  lite-build:     $(wc -c < "$OUT_DIR/lite-build" | tr -d ' ') bytes"
echo "  lite-fmt:       $(wc -c < "$OUT_DIR/lite-fmt" | tr -d ' ') bytes"
echo "  igniter-c:      $(wc -c < "$OUT_DIR/igniter-c" | tr -d ' ') bytes"
