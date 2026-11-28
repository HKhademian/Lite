#!/usr/bin/env sh
# Zero-Node.js native C11 3-generation self-hosting fixed-point verification.
# Bootstraps directly from tracked compiler/bootstrap/compiler.c using only cc.
set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
ROOT=$(CDPATH= cd -- "$SCRIPT_DIR/../.." && pwd)
CC_BIN="${CC:-cc}"
OUT_DIR=""

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
        -h|--help)
            echo "Usage: $0 [--out <dir>] [--cc <compiler>]"
            exit 0
            ;;
        *)
            echo "self-host-c: unknown argument: $1" >&2
            exit 2
            ;;
    esac
    shift
done

CLEANUP=0
if [ -z "$OUT_DIR" ]; then
    OUT_DIR=$(mktemp -d "${TMPDIR:-/tmp}/lite-selfhost-c.XXXXXX")
    CLEANUP=1
else
    mkdir -p "$OUT_DIR"
fi

if [ "$CLEANUP" -eq 1 ]; then
    trap 'rm -rf "$OUT_DIR"' EXIT
fi

hash_file() {
    if command -v shasum >/dev/null 2>&1; then
        shasum -a 256 "$1" | awk '{print $1}'
    elif command -v sha256sum >/dev/null 2>&1; then
        sha256sum "$1" | awk '{print $1}'
    else
        echo "self-host-c: missing shasum or sha256sum" >&2
        exit 1
    fi
}

SEED_C="$ROOT/compiler/bootstrap/compiler.c"
SEED_TS="$ROOT/compiler/bootstrap/seed.ts"
C_ROOT="$ROOT/lib/lite/compiler/c-root.lts"

if [ ! -f "$SEED_C" ]; then
    echo "self-host-c: missing tracked bootstrap source: $SEED_C" >&2
    exit 1
fi

SEED_HASH=$(hash_file "$SEED_C")
RECORDED_HASH=$(grep '"cArtifactSha256"' "$SEED_TS" | sed -E 's/.*"cArtifactSha256":[[:space:]]*"([^"]+)".*/\1/')

if [ -n "$RECORDED_HASH" ] && [ "$SEED_HASH" != "$RECORDED_HASH" ]; then
    echo "self-host-c: compiler/bootstrap/compiler.c hash mismatch against seed.ts" >&2
    echo "  file:     $SEED_HASH" >&2
    echo "  seed.ts:  $RECORDED_HASH" >&2
    exit 1
fi

CC_OPT="${LITE_SELF_HOST_C_OPT:--O0}"
CFLAGS="-std=c11 -Wall -Wextra -Werror $CC_OPT"

echo "self-host-c: compiling tracked compiler/bootstrap/compiler.c (Gen 0)..."
"$CC_BIN" $CFLAGS "$SEED_C" -o "$OUT_DIR/lite-gen0" -lm

echo "self-host-c: Gen 0 -> Gen 1 (compiling lib/lite/compiler/c-root.lts)..."
"$OUT_DIR/lite-gen0" -O1 "$C_ROOT" --out "$OUT_DIR/generation-1.c"
"$CC_BIN" $CFLAGS "$OUT_DIR/generation-1.c" -o "$OUT_DIR/lite-gen1" -lm

echo "self-host-c: Gen 1 -> Gen 2..."
"$OUT_DIR/lite-gen1" -O1 "$C_ROOT" --out "$OUT_DIR/generation-2.c"
"$CC_BIN" $CFLAGS "$OUT_DIR/generation-2.c" -o "$OUT_DIR/lite-gen2" -lm

echo "self-host-c: Gen 2 -> Gen 3..."
"$OUT_DIR/lite-gen2" -O1 "$C_ROOT" --out "$OUT_DIR/generation-3.c"

H1=$(hash_file "$OUT_DIR/generation-1.c")
H2=$(hash_file "$OUT_DIR/generation-2.c")
H3=$(hash_file "$OUT_DIR/generation-3.c")
BYTES=$(wc -c < "$OUT_DIR/generation-3.c" | tr -d ' ')
BIN_BYTES=$(wc -c < "$OUT_DIR/lite-gen2" | tr -d ' ')

echo "  seed.c:       $SEED_HASH"
echo "  generation-1: $H1"
echo "  generation-2: $H2"
echo "  generation-3: $H3"
echo "  c source:     $BYTES bytes"
echo "  native bin:   $BIN_BYTES bytes"

if [ "$H1" != "$H2" ] || [ "$H2" != "$H3" ]; then
    echo "self-host-c: FAIL (generations did not reach a fixed point)" >&2
    exit 1
fi

if [ "$H3" != "$SEED_HASH" ]; then
    echo "self-host-c: FAIL (generation-3.c differs from tracked compiler/bootstrap/compiler.c)" >&2
    exit 1
fi

echo "self-host-c: PASS (3-generation native C11 fixed point matches tracked compiler/bootstrap/compiler.c)"
