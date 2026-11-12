let lite_out = "";

declare const process: {
    argv: string[];
    exit(code: number): never;
    getBuiltinModule(name: "node:fs"): {
        readSync(fd: number, buffer: Uint8Array, offset: number, length: number, position: null): number;
        writeSync(fd: number, text: string): number;
    };
};

let lite$sourceProvider: ((importer: string, spec: string) => { path: string; text: string }) | undefined;
function lite$readSource(importer: string, spec: string): { path: string; text: string } {
    if (lite$sourceProvider === undefined) throw new Error("compiler host does not provide source reads");
    return lite$sourceProvider(importer, spec);
}

function lite$inputArgs(): string[] {
    return process.argv.slice(2);
}

declare const TextDecoder: { new(label: string, options: { fatal: boolean }): { decode(input?: Uint8Array, options?: { stream: boolean }): string } };
const lite$decoder = new TextDecoder("utf-8", { fatal: true });
const lite$bytes = new Uint8Array(4096);
let lite$byteAt = 0, lite$byteEnd = 0;
let lite$ended = false;
let lite$pending: string | null | undefined;
function lite$inputFault(at: string, message: string): never {
    process.getBuiltinModule("node:fs").writeSync(2, at + message + "\n");
    process.exit(1);
}
function lite$prompt(text: string | undefined): void {
    if (text === undefined) return;
    process.getBuiltinModule("node:fs").writeSync(1, lite_out + text);
    lite_out = "";
}
function lite$peek(at: string): string | null {
    if (lite$pending !== undefined) return lite$pending;
    if (lite$ended) return null;
    try {
        while (true) {
            if (lite$byteAt === lite$byteEnd) {
                lite$byteEnd = process.getBuiltinModule("node:fs").readSync(0, lite$bytes, 0, lite$bytes.length, null);
                lite$byteAt = 0;
                if (lite$byteEnd === 0) {
                    lite$ended = true;
                    lite$pending = lite$decoder.decode() || null;
                    return lite$pending;
                }
            }
            const text = lite$decoder.decode(lite$bytes.subarray(lite$byteAt, ++lite$byteAt), { stream: true });
            if (text !== "") { lite$pending = text; return text; }
        }
    } catch (error) {
        return lite$inputFault(at, "cannot read input: " + (error instanceof Error ? error.message : String(error)));
    }
}
function lite$take(at: string): string | null {
    const text = lite$peek(at); lite$pending = undefined; return text;
}
function lite$inputAll(prompt: string | undefined, at: string): string {
    lite$prompt(prompt);
    let text = "";
    for (let ch = lite$take(at); ch !== null; ch = lite$take(at)) text += ch;
    return text;
}

function lite$reportError(text: string): void {
    process.getBuiltinModule("node:fs").writeSync(2, text + "\n");
}

function lite$exit(status: bigint): void {
    process.getBuiltinModule("node:fs").writeSync(1, lite_out);
    process.exit(Number(status));
}

const lite$textCache = new Map<string, readonly string[]>();
function lite$textPoints(text: string): readonly string[] {
    const found = lite$textCache.get(text);
    if (found !== undefined) {
        lite$textCache.delete(text);
        lite$textCache.set(text, found);
        return found;
    }
    const points = Array.from(text);
    lite$textCache.set(text, points);
    if (lite$textCache.size > 8) {
        const oldest = lite$textCache.keys().next();
        if (oldest.done !== true) lite$textCache.delete(oldest.value);
    }
    return points;
}

function lite$textLength(text: string): bigint {
    return BigInt(lite$textPoints(text).length);
}

function lite$textAt(text: string, position: bigint, at: number): string {
    const points = lite$textPoints(text);
    if (position < 0n || position >= BigInt(points.length)) {
        lite$fault("BoundPanic", at, "textAt index outside text");
    }
    const value = points[Number(position)];
    if (value === undefined) {
        throw new Error("BoundPanic: textAt index outside text");
    }
    return value;
}

function lite$textSlice(text: string, start: bigint, end: bigint, at: number): string {
    const points = lite$textPoints(text);
    if (start < 0n || end < start || end > BigInt(points.length)) {
        lite$fault("BoundPanic", at, "textSlice requires 0 <= start <= end <= textLength(text)");
    }
    return points.slice(Number(start), Number(end)).join("");
}

function lite$listAt<T>(items: readonly T[], index: bigint, at: number): T {
    if (index < 0n || index >= BigInt(items.length)) {
        lite$fault("BoundPanic", at, "list index outside its extent");
    }
    const value = items[Number(index)];
    if (value === undefined) {
        lite$fault("BoundPanic", at, "list index outside its extent");
    }
    return value;
}

function lite$listPopBack<T>(items: T[], at: number): T {
    const value = items.pop();
    if (value === undefined) {
        lite$fault("BoundPanic", at, "pop_back on an empty list");
    }
    return value;
}

const lite$intLines: readonly number[] = [0, 34, 48];
const lite$intSource = "compiler/src/ts-root.lts:";
const lite$intMin = -(1n << 63n), lite$intMax = (1n << 63n) - 1n;
function lite$fault(category: string, at: number, message: string): never {
    let line = 0;
    while (line + 1 < lite$intLines.length && (lite$intLines[line + 1] ?? Infinity) <= at) line += 1;
    const column = at - (lite$intLines[line] ?? 0) + 1;
    process.getBuiltinModule("node:fs").writeSync(2, lite$intSource + (line + 1) + ":" + column + ": " + category + ": " + message + "\n");
    process.exit(1);
}
function lite$intFault(at: number, message: string): never { return lite$fault("ArithmeticPanic", at, message); }
function lite$checkedInt(value: bigint, at: number): bigint {
    if (value < lite$intMin || value > lite$intMax) lite$intFault(at, "integer outside Int range");
    return value;
}
function lite$addInt(left: bigint, right: bigint, at: number): bigint { return lite$checkedInt(left + right, at); }
function lite$subtractInt(left: bigint, right: bigint, at: number): bigint { return lite$checkedInt(left - right, at); }
function lite$multiplyInt(left: bigint, right: bigint, at: number): bigint { return lite$checkedInt(left * right, at); }
function lite$negateInt(value: bigint, at: number): bigint { return lite$checkedInt(-value, at); }

function lite$divideInt(left: bigint, right: bigint, at: number): bigint {
    if (right === 0n) lite$intFault(at, "division by zero");
    return lite$checkedInt(left / right, at);
}

function lite$remainderInt(left: bigint, right: bigint, at: number): bigint {
    if (right === 0n) lite$intFault(at, "remainder by zero");
    return left % right;
}

export function main(lite$write?: (text: string) => void, lite$sourceProviderInput?: (importer: string, spec: string) => { path: string; text: string }): string {
    lite$sourceProvider = lite$sourceProviderInput;
    function lite$emit(text: string): void {
        if (lite$write === undefined) lite_out += text;
        else lite$write(text);
    }
    void lite$emit;
    function liteFn_m4_intMin(): bigint {
        return (-9223372036854775808n);
    }
    void liteFn_m4_intMin;
    function liteFn_m4_intMax(): bigint {
        return 9223372036854775807n;
    }
    void liteFn_m4_intMax;
    function liteFn_m4_intAdd(lite_left: bigint, lite_right: bigint): { value: bigint; ok: boolean } {
        void lite_left;
        void lite_right;
        if (((((lite_right) > (0n))) && (((lite_left) > (lite$subtractInt(liteFn_m4_intMax(), lite_right, 475)))))) {
            return { value: 0n, ok: false };
        }
        if (((((lite_right) < (0n))) && (((lite_left) < (lite$subtractInt(liteFn_m4_intMin(), lite_right, 556)))))) {
            return { value: 0n, ok: false };
        }
        return { value: lite$addInt(lite_left, lite_right, 618), ok: true };
    }
    void liteFn_m4_intAdd;
    function liteFn_m4_intSubtract(lite_left: bigint, lite_right: bigint): { value: bigint; ok: boolean } {
        void lite_left;
        void lite_right;
        if (((((lite_right) < (0n))) && (((lite_left) > (lite$addInt(liteFn_m4_intMax(), lite_right, 840)))))) {
            return { value: 0n, ok: false };
        }
        if (((((lite_right) > (0n))) && (((lite_left) < (lite$addInt(liteFn_m4_intMin(), lite_right, 921)))))) {
            return { value: 0n, ok: false };
        }
        return { value: lite$subtractInt(lite_left, lite_right, 983), ok: true };
    }
    void liteFn_m4_intSubtract;
    function liteFn_m4_intMultiply(lite_left: bigint, lite_right: bigint): { value: bigint; ok: boolean } {
        void lite_left;
        void lite_right;
        if (((((lite_left) === (0n))) || (((lite_right) === (0n))))) {
            return { value: 0n, ok: true };
        }
        if (((lite_left) > (0n))) {
            if (((lite_right) > (0n))) {
                if (((lite_left) > (lite$divideInt(liteFn_m4_intMax(), lite_right, 1309)))) {
                    return { value: 0n, ok: false };
                }
            } else if (((lite_right) < (lite$divideInt(liteFn_m4_intMin(), lite_left, 1388)))) {
                return { value: 0n, ok: false };
            }
        } else if (((lite_right) > (0n))) {
            if (((lite_left) < (lite$divideInt(liteFn_m4_intMin(), lite_right, 1504)))) {
                return { value: 0n, ok: false };
            }
        } else if (((lite_right) < (lite$divideInt(liteFn_m4_intMax(), lite_left, 1579)))) {
            return { value: 0n, ok: false };
        }
        return { value: lite$multiplyInt(lite_left, lite_right, 1652), ok: true };
    }
    void liteFn_m4_intMultiply;
    function liteFn_m4_intDivide(lite_left: bigint, lite_right: bigint): { value: bigint; ok: boolean } {
        void lite_left;
        void lite_right;
        if (((lite_right) === (0n))) {
            return { value: 0n, ok: false };
        }
        if (((((lite_left) === (liteFn_m4_intMin()))) && (((lite_right) === ((-1n)))))) {
            return { value: 0n, ok: false };
        }
        return { value: lite$divideInt(lite_left, lite_right, 1989), ok: true };
    }
    void liteFn_m4_intDivide;
    function liteFn_m4_intRemainder(lite_left: bigint, lite_right: bigint): { value: bigint; ok: boolean } {
        void lite_left;
        void lite_right;
        if (((lite_right) === (0n))) {
            return { value: 0n, ok: false };
        }
        if (((((lite_left) === (liteFn_m4_intMin()))) && (((lite_right) === ((-1n)))))) {
            return { value: 0n, ok: true };
        }
        return { value: lite$remainderInt(lite_left, lite_right, 2347), ok: true };
    }
    void liteFn_m4_intRemainder;
    function liteFn_m4_intFloorDivide(lite_left: bigint, lite_right: bigint): { value: bigint; ok: boolean } {
        void lite_left;
        void lite_right;
        if (((lite_right) === (0n))) {
            return { value: 0n, ok: false };
        }
        if (((((lite_left) === (liteFn_m4_intMin()))) && (((lite_right) === ((-1n)))))) {
            return { value: 0n, ok: false };
        }
        const lite_m4_quotient = lite$divideInt(lite_left, lite_right, 2680);
        void lite_m4_quotient;
        return (Boolean(((((lite$remainderInt(lite_left, lite_right, 2701)) !== (0n))) && ((Boolean((((lite_left) < (0n)))) !== Boolean((((lite_right) < (0n)))))))) ? { value: lite$subtractInt(lite_m4_quotient, 1n, 2774), ok: true } : { value: lite_m4_quotient, ok: true });
    }
    void liteFn_m4_intFloorDivide;
    function liteFn_m4_intFloorModulo(lite_left: bigint, lite_right: bigint): { value: bigint; ok: boolean } {
        void lite_left;
        void lite_right;
        if (((lite_right) === (0n))) {
            return { value: 0n, ok: false };
        }
        const lite_m4_remainder = lite$remainderInt(lite_left, lite_right, 3067);
        void lite_m4_remainder;
        return (Boolean(((((lite_m4_remainder) !== (0n))) && ((Boolean((((lite_m4_remainder) < (0n)))) !== Boolean((((lite_right) < (0n)))))))) ? { value: lite$addInt(lite_m4_remainder, lite_right, 3164), ok: true } : { value: lite_m4_remainder, ok: true });
    }
    void liteFn_m4_intFloorModulo;
    function liteFn_m4_intNegate(lite_value: bigint): { value: bigint; ok: boolean } {
        void lite_value;
        if (((lite_value) === (liteFn_m4_intMin()))) {
            return { value: 0n, ok: false };
        }
        return { value: lite$subtractInt(0n, lite_value, 3448), ok: true };
    }
    void liteFn_m4_intNegate;
    function liteFn_m4_intText(lite_value: bigint): string {
        void lite_value;
        if (((lite_value) === (0n))) {
            return "0";
        }
        if (((lite_value) === (liteFn_m4_intMin()))) {
            return "-9223372036854775808";
        }
        if (((lite_value) < (0n))) {
            return (("-") + (liteFn_m4_intText(lite$subtractInt(0n, lite_value, 3701))));
        }
        let lite_m4_remaining = lite_value;
        void lite_m4_remaining;
        let lite_m4_digits = "";
        void lite_m4_digits;
        while (((lite_m4_remaining) > (0n))) {
            const lite_m4_digit = lite$remainderInt(lite_m4_remaining, 10n, 3815);
            void lite_m4_digit;
            lite_m4_digits = ((lite$textAt("0123456789", lite_m4_digit, 3838)) + (lite_m4_digits));
            lite_m4_remaining = lite$divideInt(lite_m4_remaining, 10n, 3906);
        }
        return lite_m4_digits;
    }
    void liteFn_m4_intText;
    function liteFn_m3_isDigit(lite_text: string): boolean {
        void lite_text;
        return ((((((((((((((((((((lite_text) === ("0"))) || (((lite_text) === ("1"))))) || (((lite_text) === ("2"))))) || (((lite_text) === ("3"))))) || (((lite_text) === ("4"))))) || (((lite_text) === ("5"))))) || (((lite_text) === ("6"))))) || (((lite_text) === ("7"))))) || (((lite_text) === ("8"))))) || (((lite_text) === ("9"))));
    }
    void liteFn_m3_isDigit;
    function liteFn_m3_digitValue(lite_text: string): bigint {
        void lite_text;
        if (((lite_text) === ("0"))) {
            return 0n;
        }
        if (((lite_text) === ("1"))) {
            return 1n;
        }
        if (((lite_text) === ("2"))) {
            return 2n;
        }
        if (((lite_text) === ("3"))) {
            return 3n;
        }
        if (((lite_text) === ("4"))) {
            return 4n;
        }
        if (((lite_text) === ("5"))) {
            return 5n;
        }
        if (((lite_text) === ("6"))) {
            return 6n;
        }
        if (((lite_text) === ("7"))) {
            return 7n;
        }
        if (((lite_text) === ("8"))) {
            return 8n;
        }
        return 9n;
    }
    void liteFn_m3_digitValue;
    function liteFn_m3_isAsciiLetter(lite_ch: string): boolean {
        void lite_ch;
        const lite_m3_letters = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
        void lite_m3_letters;
        const lite_m3_size = lite$textLength(lite_m3_letters);
        void lite_m3_size;
        let lite_m3_position = 0n;
        void lite_m3_position;
        while (((lite_m3_position) < (lite_m3_size))) {
            if (((lite$textAt(lite_m3_letters, lite_m3_position, 1038)) === (lite_ch))) {
                return true;
            }
            lite_m3_position = lite$addInt(lite_m3_position, 1n, 1115);
        }
        return false;
    }
    void liteFn_m3_isAsciiLetter;
    function liteFn_m3_isNameStart(lite_ch: string): boolean {
        void lite_ch;
        return ((liteFn_m3_isAsciiLetter(lite_ch)) || (((lite_ch) === ("_"))));
    }
    void liteFn_m3_isNameStart;
    function liteFn_m3_isNameContinue(lite_ch: string): boolean {
        void lite_ch;
        return ((liteFn_m3_isNameStart(lite_ch)) || (liteFn_m3_isDigit(lite_ch)));
    }
    void liteFn_m3_isNameContinue;
    function liteFn_m3_skipSpaces(lite_source: string, lite_start: bigint): bigint {
        void lite_source;
        void lite_start;
        const lite_m3_size = lite$textLength(lite_source);
        void lite_m3_size;
        let lite_m3_position = lite_start;
        void lite_m3_position;
        while (((((lite_m3_position) < (lite_m3_size))) && ((((((((((lite$textAt(lite_source, lite_m3_position, 1673)) === (" "))) || (((lite$textAt(lite_source, lite_m3_position, 1708)) === ("\t"))))) || (((lite$textAt(lite_source, lite_m3_position, 1744)) === ("\r"))))) || (((lite$textAt(lite_source, lite_m3_position, 1780)) === ("\n")))))))) {
            lite_m3_position = lite$addInt(lite_m3_position, 1n, 1844);
        }
        return lite_m3_position;
    }
    void liteFn_m3_skipSpaces;
    function liteFn_m3_skipName(lite_source: string, lite_start: bigint): bigint {
        void lite_source;
        void lite_start;
        const lite_m3_size = lite$textLength(lite_source);
        void lite_m3_size;
        let lite_m3_position = lite_start;
        void lite_m3_position;
        while (((((lite_m3_position) < (lite_m3_size))) && (liteFn_m3_isNameContinue(lite$textAt(lite_source, lite_m3_position, 2102))))) {
            lite_m3_position = lite$addInt(lite_m3_position, 1n, 2158);
        }
        return lite_m3_position;
    }
    void liteFn_m3_skipName;
    function liteFn_m3_startsWithAt(lite_source: string, lite_position: bigint, lite_text: string): boolean {
        void lite_source;
        void lite_position;
        void lite_text;
        const lite_m3_width = lite$textLength(lite_text);
        void lite_m3_width;
        if (((((lite_position) < (0n))) || (((lite$addInt(lite_position, lite_m3_width, 2396)) > (lite$textLength(lite_source)))))) {
            return false;
        }
        return ((lite$textSlice(lite_source, lite_position, lite$addInt(lite_position, lite_m3_width, 2484), 2447)) === (lite_text));
    }
    void liteFn_m3_startsWithAt;
    function liteFn_m3_wordAt(lite_source: string, lite_position: bigint, lite_word: string): boolean {
        void lite_source;
        void lite_position;
        void lite_word;
        if ((!(liteFn_m3_startsWithAt(lite_source, lite_position, lite_word)))) {
            return false;
        }
        const lite_m3_after = lite$addInt(lite_position, lite$textLength(lite_word), 2781);
        void lite_m3_after;
        return ((((lite_m3_after) >= (lite$textLength(lite_source)))) || ((!(liteFn_m3_isNameContinue(lite$textAt(lite_source, lite_m3_after, 2855))))));
    }
    void liteFn_m3_wordAt;
    function liteFn_m3_indexOfText(lite_source: string, lite_needle: string, lite_start: bigint): bigint {
        void lite_source;
        void lite_needle;
        void lite_start;
        const lite_m3_size = lite$textLength(lite_source);
        void lite_m3_size;
        const lite_m3_width = lite$textLength(lite_needle);
        void lite_m3_width;
        let lite_m3_position = lite_start;
        void lite_m3_position;
        if (((((lite_m3_position) < (0n))) || (((lite_m3_position) > (lite_m3_size))))) {
            return (-1n);
        }
        if (((lite_m3_width) === (0n))) {
            return lite_m3_position;
        }
        while (((lite$addInt(lite_m3_position, lite_m3_width, 3250)) <= (lite_m3_size))) {
            if (liteFn_m3_startsWithAt(lite_source, lite_m3_position, lite_needle)) {
                return lite_m3_position;
            }
            lite_m3_position = lite$addInt(lite_m3_position, 1n, 3367);
        }
        return (-1n);
    }
    void liteFn_m3_indexOfText;
    function liteFn_m3_joinTexts(lite_values: string[], lite_separator: string): string {
        void lite_values;
        void lite_separator;
        let lite_m3_result = "";
        void lite_m3_result;
        let lite_m3_first = true;
        void lite_m3_first;
        for (const lite_m3_value of [...(lite_values)]) {
            void lite_m3_value;
            if (lite_m3_first) {
                lite_m3_result = lite_m3_value;
                lite_m3_first = false;
            } else {
                lite_m3_result = ((((lite_m3_result) + (lite_separator))) + (lite_m3_value));
            }
        }
        return lite_m3_result;
    }
    void liteFn_m3_joinTexts;
    function liteFn_m3_textToInt(lite_text: string): { value: bigint; ok: boolean } {
        void lite_text;
        const lite_m3_size = lite$textLength(lite_text);
        void lite_m3_size;
        if (((lite_m3_size) === (0n))) {
            return { value: 0n, ok: false };
        }
        let lite_m3_position = 0n;
        void lite_m3_position;
        let lite_m3_negative = false;
        void lite_m3_negative;
        if (((lite$textAt(lite_text, 0n, 4087)) === ("-"))) {
            lite_m3_negative = true;
            lite_m3_position = 1n;
        } else if (((lite$textAt(lite_text, 0n, 4173)) === ("+"))) {
            lite_m3_position = 1n;
        }
        if (((lite_m3_position) >= (lite_m3_size))) {
            return { value: 0n, ok: false };
        }
        let lite_m3_value = 0n;
        void lite_m3_value;
        while (((lite_m3_position) < (lite_m3_size))) {
            const lite_m3_ch = lite$textAt(lite_text, lite_m3_position, 4347);
            void lite_m3_ch;
            if ((!(liteFn_m3_isDigit(lite_m3_ch)))) {
                return { value: 0n, ok: false };
            }
            const lite_m3_digit = liteFn_m3_digitValue(lite_m3_ch);
            void lite_m3_digit;
            if (lite_m3_negative) {
                if (((lite_m3_value) < (lite$divideInt((lite$addInt(liteFn_m4_intMin(), lite_m3_digit, 4530)), 10n, 4539)))) {
                    return { value: 0n, ok: false };
                }
                lite_m3_value = lite$subtractInt(lite$multiplyInt(lite_m3_value, 10n, 4606), lite_m3_digit, 4611);
            } else {
                if (((lite_m3_value) > (lite$divideInt((lite$subtractInt(liteFn_m4_intMax(), lite_m3_digit, 4678)), 10n, 4687)))) {
                    return { value: 0n, ok: false };
                }
                lite_m3_value = lite$addInt(lite$multiplyInt(lite_m3_value, 10n, 4754), lite_m3_digit, 4759);
            }
            lite_m3_position = lite$addInt(lite_m3_position, 1n, 4806);
        }
        return { value: lite_m3_value, ok: true };
    }
    void liteFn_m3_textToInt;
    function liteFn_m5_decimalText(lite_value: bigint): string {
        void lite_value;
        return liteFn_m4_intText(lite_value);
    }
    void liteFn_m5_decimalText;
    function liteFn_m5_padLeftText(lite_value: string, lite_width: bigint): string {
        void lite_value;
        void lite_width;
        const lite_m5_size = lite$textLength(lite_value);
        void lite_m5_size;
        let lite_m5_result = lite_value;
        void lite_m5_result;
        let lite_m5_index = lite_m5_size;
        void lite_m5_index;
        while (((lite_m5_index) < (lite_width))) {
            lite_m5_result = ((" ") + (lite_m5_result));
            lite_m5_index = lite$addInt(lite_m5_index, 1n, 528);
        }
        return lite_m5_result;
    }
    void liteFn_m5_padLeftText;
    function liteFn_m5_padRightText(lite_value: string, lite_width: bigint): string {
        void lite_value;
        void lite_width;
        const lite_m5_size = lite$textLength(lite_value);
        void lite_m5_size;
        let lite_m5_result = lite_value;
        void lite_m5_result;
        let lite_m5_index = lite_m5_size;
        void lite_m5_index;
        while (((lite_m5_index) < (lite_width))) {
            lite_m5_result = ((lite_m5_result) + (" "));
            lite_m5_index = lite$addInt(lite_m5_index, 1n, 840);
        }
        return lite_m5_result;
    }
    void liteFn_m5_padRightText;
    function liteFn_m5_padLeftInt(lite_value: bigint, lite_width: bigint): string {
        void lite_value;
        void lite_width;
        return liteFn_m5_padLeftText(liteFn_m4_intText(lite_value), lite_width);
    }
    void liteFn_m5_padLeftInt;
    function liteFn_m5_padRightInt(lite_value: bigint, lite_width: bigint): string {
        void lite_value;
        void lite_width;
        return liteFn_m5_padRightText(liteFn_m4_intText(lite_value), lite_width);
    }
    void liteFn_m5_padRightInt;
    function liteFn_m5_joinIntTexts(lite_values: bigint[], lite_separator: string): string {
        void lite_values;
        void lite_separator;
        let lite_m5_result = "";
        void lite_m5_result;
        let lite_m5_first = true;
        void lite_m5_first;
        for (const lite_m5_value of [...(lite_values)]) {
            void lite_m5_value;
            if (lite_m5_first) {
                lite_m5_result = liteFn_m4_intText(lite_m5_value);
                lite_m5_first = false;
            } else {
                lite_m5_result = ((((lite_m5_result) + (lite_separator))) + (liteFn_m4_intText(lite_m5_value)));
            }
        }
        return lite_m5_result;
    }
    void liteFn_m5_joinIntTexts;
    function liteFn_m6_listIndexOfText(lite_values: string[], lite_target: string): bigint {
        void lite_values;
        void lite_target;
        let lite_m6_index = 0n;
        void lite_m6_index;
        for (const lite_m6_value of [...(lite_values)]) {
            void lite_m6_value;
            if (((lite_m6_value) === (lite_target))) {
                return lite_m6_index;
            }
            lite_m6_index = lite$addInt(lite_m6_index, 1n, 338);
        }
        return (-1n);
    }
    void liteFn_m6_listIndexOfText;
    function liteFn_m6_listContainsText(lite_values: string[], lite_target: string): boolean {
        void lite_values;
        void lite_target;
        return ((liteFn_m6_listIndexOfText([...(lite_values)], lite_target)) >= (0n));
    }
    void liteFn_m6_listContainsText;
    function liteFn_m6_listIndexOfInt(lite_values: bigint[], lite_target: bigint): bigint {
        void lite_values;
        void lite_target;
        let lite_m6_index = 0n;
        void lite_m6_index;
        for (const lite_m6_value of [...(lite_values)]) {
            void lite_m6_value;
            if (((lite_m6_value) === (lite_target))) {
                return lite_m6_index;
            }
            lite_m6_index = lite$addInt(lite_m6_index, 1n, 768);
        }
        return (-1n);
    }
    void liteFn_m6_listIndexOfInt;
    function liteFn_m6_listContainsInt(lite_values: bigint[], lite_target: bigint): boolean {
        void lite_values;
        void lite_target;
        return ((liteFn_m6_listIndexOfInt([...(lite_values)], lite_target)) >= (0n));
    }
    void liteFn_m6_listContainsInt;
    function liteFn_m6_listIndexOfBool(lite_values: boolean[], lite_target: boolean): bigint {
        void lite_values;
        void lite_target;
        let lite_m6_index = 0n;
        void lite_m6_index;
        for (const lite_m6_value of [...(lite_values)]) {
            void lite_m6_value;
            if ((Boolean(lite_m6_value) === Boolean(lite_target))) {
                return lite_m6_index;
            }
            lite_m6_index = lite$addInt(lite_m6_index, 1n, 1193);
        }
        return (-1n);
    }
    void liteFn_m6_listIndexOfBool;
    function liteFn_m6_listContainsBool(lite_values: boolean[], lite_target: boolean): boolean {
        void lite_values;
        void lite_target;
        return ((liteFn_m6_listIndexOfBool([...(lite_values)], lite_target)) >= (0n));
    }
    void liteFn_m6_listContainsBool;
    function liteFn_m7_clampPosition(lite_source: string, lite_position: bigint): bigint {
        void lite_source;
        void lite_position;
        const lite_m7_size = lite$textLength(lite_source);
        void lite_m7_size;
        if (((lite_position) < (0n))) {
            return 0n;
        }
        if (((lite_position) > (lite_m7_size))) {
            return lite_m7_size;
        }
        return lite_position;
    }
    void liteFn_m7_clampPosition;
    function liteFn_m7_lineColumn(lite_source: string, lite_position: bigint): { line: bigint; column: bigint } {
        void lite_source;
        void lite_position;
        const lite_m7_cursor = liteFn_m7_clampPosition(lite_source, lite_position);
        void lite_m7_cursor;
        let lite_m7_line = 1n;
        void lite_m7_line;
        let lite_m7_lineStart = 0n;
        void lite_m7_lineStart;
        let lite_m7_index = 0n;
        void lite_m7_index;
        while (((lite_m7_index) < (lite_m7_cursor))) {
            if (((lite$textAt(lite_source, lite_m7_index, 650)) === ("\n"))) {
                lite_m7_line = lite$addInt(lite_m7_line, 1n, 706);
                lite_m7_lineStart = lite$addInt(lite_m7_index, 1n, 741);
            }
            lite_m7_index = lite$addInt(lite_m7_index, 1n, 778);
        }
        return { line: lite_m7_line, column: lite$addInt(lite$subtractInt(lite_m7_cursor, lite_m7_lineStart, 823), 1n, 835) };
    }
    void liteFn_m7_lineColumn;
    function liteFn_m7_lineCount(lite_source: string): bigint {
        void lite_source;
        const lite_m7_size = lite$textLength(lite_source);
        void lite_m7_size;
        let lite_m7_count = 1n;
        void lite_m7_count;
        let lite_m7_index = 0n;
        void lite_m7_index;
        while (((lite_m7_index) < (lite_m7_size))) {
            if (((lite$textAt(lite_source, lite_m7_index, 1063)) === ("\n"))) {
                lite_m7_count = lite$addInt(lite_m7_count, 1n, 1109);
            }
            lite_m7_index = lite$addInt(lite_m7_index, 1n, 1138);
        }
        return lite_m7_count;
    }
    void liteFn_m7_lineCount;
    function liteFn_m7_lineStartOffset(lite_source: string, lite_line: bigint): bigint {
        void lite_source;
        void lite_line;
        const lite_m7_size = lite$textLength(lite_source);
        void lite_m7_size;
        if (((lite_line) <= (1n))) {
            return 0n;
        }
        let lite_m7_current = 2n;
        void lite_m7_current;
        let lite_m7_index = 0n;
        void lite_m7_index;
        while (((lite_m7_index) < (lite_m7_size))) {
            if (((lite$textAt(lite_source, lite_m7_index, 1448)) === ("\n"))) {
                if (((lite_m7_current) === (lite_line))) {
                    return lite$addInt(lite_m7_index, 1n, 1526);
                }
                lite_m7_current = lite$addInt(lite_m7_current, 1n, 1563);
            }
            lite_m7_index = lite$addInt(lite_m7_index, 1n, 1600);
        }
        return lite_m7_size;
    }
    void liteFn_m7_lineStartOffset;
    function liteFn_m7_lineEndOffset(lite_source: string, lite_line: bigint): bigint {
        void lite_source;
        void lite_line;
        const lite_m7_size = lite$textLength(lite_source);
        void lite_m7_size;
        const lite_m7_start = liteFn_m7_lineStartOffset(lite_source, lite_line);
        void lite_m7_start;
        let lite_m7_index = lite_m7_start;
        void lite_m7_index;
        while (((((lite_m7_index) < (lite_m7_size))) && (((lite$textAt(lite_source, lite_m7_index, 1874)) !== ("\n"))))) {
            lite_m7_index = lite$addInt(lite_m7_index, 1n, 1929);
        }
        return lite_m7_index;
    }
    void liteFn_m7_lineEndOffset;
    function liteFn_m8_diagnosticExit(): bigint {
        return 2n;
    }
    void liteFn_m8_diagnosticExit;
    const lite_m8_sourceErrorCategory = "SourceError";
    void lite_m8_sourceErrorCategory;
    const lite_m8_typeErrorCategory = "TypeError";
    void lite_m8_typeErrorCategory;
    function liteFn_m8_fail(lite_prefix: string, lite_message: string): void {
        void lite_prefix;
        void lite_message;
        if (((lite_prefix) === (""))) {
            lite$reportError(lite_message);
        } else {
            lite$reportError(((((lite_prefix) + (":"))) + (lite_message)));
        }
        return (void (lite$exit(liteFn_m8_diagnosticExit())));
    }
    void liteFn_m8_fail;
    function liteFn_m8_expect(lite_prefix: string, lite_condition: boolean, lite_message: string): void {
        void lite_prefix;
        void lite_condition;
        void lite_message;
        if ((!(lite_condition))) {
            return (void (liteFn_m8_fail(lite_prefix, lite_message)));
        } else {
        }
    }
    void liteFn_m8_expect;
    function liteFn_m9_numericAliasKind(lite_name: string): string {
        void lite_name;
        return (Boolean(((lite_name) === ("Int64"))) ? "Int" : (Boolean(((((lite_name) === ("Float64"))) || (((lite_name) === ("Double"))))) ? "Float" : ""));
    }
    void liteFn_m9_numericAliasKind;
    function liteFn_m9_intExactlyFloat(lite_input: bigint): boolean {
        void lite_input;
        let lite_m9_value = lite_input;
        void lite_m9_value;
        while (((((lite_m9_value) > (9007199254740992n))) || (((lite_m9_value) < ((-9007199254740992n)))))) {
            if (((lite$remainderInt(lite_m9_value, 2n, 669)) !== (0n))) {
                return false;
            }
            lite_m9_value = lite$divideInt(lite_m9_value, 2n, 719);
        }
        return true;
    }
    void liteFn_m9_intExactlyFloat;
    function liteFn_m9_finiteFloatDigits(lite_digits: string, lite_fractionCount: bigint, lite_exponent: bigint): boolean {
        void lite_digits;
        void lite_fractionCount;
        void lite_exponent;
        let lite_m9_first = 0n;
        void lite_m9_first;
        while (((((lite_m9_first) < (lite$textLength(lite_digits)))) && (((lite$textAt(lite_digits, lite_m9_first, 1087)) === ("0"))))) {
            lite_m9_first = lite$addInt(lite_m9_first, 1n, 1132);
        }
        if (((lite_m9_first) === (lite$textLength(lite_digits)))) {
            return true;
        }
        const lite_m9_significant = lite$textSlice(lite_digits, lite_m9_first, lite$textLength(lite_digits), 1210);
        void lite_m9_significant;
        const lite_m9_power = lite$addInt(lite$subtractInt(lite$textLength(lite_m9_significant), lite_fractionCount, 1293), lite_exponent, 1309);
        void lite_m9_power;
        if (((lite_m9_power) < (309n))) {
            return true;
        }
        if (((lite_m9_power) > (309n))) {
            return false;
        }
        const lite_m9_midpoint = "179769313486231580793728971405303415079934132710037826936173778980444968292764750946649017977587207096330286416692887910946555547851940402630657488671505820681908902000708383676273854845817711531764475730270069855571366959622842914819860834936475292719074168444365510704342711559699508093042880177904174497792";
        void lite_m9_midpoint;
        let lite_m9_count = lite$textLength(lite_m9_significant);
        void lite_m9_count;
        if (((lite_m9_count) < (lite$textLength(lite_m9_midpoint)))) {
            lite_m9_count = lite$textLength(lite_m9_midpoint);
        }
        let lite_m9_index = 0n;
        void lite_m9_index;
        while (((lite_m9_index) < (lite_m9_count))) {
            const lite_m9_left = (Boolean(((lite_m9_index) < (lite$textLength(lite_m9_significant)))) ? liteFn_m3_digitValue(lite$textAt(lite_m9_significant, lite_m9_index, 1949)) : 0n);
            void lite_m9_left;
            const lite_m9_right = (Boolean(((lite_m9_index) < (lite$textLength(lite_m9_midpoint)))) ? liteFn_m3_digitValue(lite$textAt(lite_m9_midpoint, lite_m9_index, 2058)) : 0n);
            void lite_m9_right;
            if (((lite_m9_left) < (lite_m9_right))) {
                return true;
            }
            if (((lite_m9_left) > (lite_m9_right))) {
                return false;
            }
            lite_m9_index = lite$addInt(lite_m9_index, 1n, 2202);
        }
        return false;
    }
    void liteFn_m9_finiteFloatDigits;
    function liteFn_m9_scanNumericLiteral(lite_source: string, lite_position: bigint): { next: bigint; integerEnd: bigint; fractionStart: bigint; fractionEnd: bigint; exponent: bigint; floating: boolean; exponentMissingAt: bigint; magnitude: bigint; outsideInt: boolean } {
        void lite_source;
        void lite_position;
        const lite_m9_size = lite$textLength(lite_source);
        void lite_m9_size;
        let lite_m9_cursor = lite_position;
        void lite_m9_cursor;
        let lite_m9_magnitude = 0n;
        void lite_m9_magnitude;
        let lite_m9_outsideInt = false;
        void lite_m9_outsideInt;
        while (((((lite_m9_cursor) < (lite_m9_size))) && (liteFn_m3_isDigit(lite$textAt(lite_source, lite_m9_cursor, 2834))))) {
            const lite_m9_digit = liteFn_m3_digitValue(lite$textAt(lite_source, lite_m9_cursor, 2893));
            void lite_m9_digit;
            if ((!(lite_m9_outsideInt))) {
                if (((lite_m9_magnitude) < (lite$divideInt((lite$addInt((-9223372036854775808n), lite_m9_digit, 2995)), 10n, 3004)))) {
                    lite_m9_outsideInt = true;
                } else {
                    lite_m9_magnitude = lite$subtractInt(lite$multiplyInt(lite_m9_magnitude, 10n, 3073), lite_m9_digit, 3078);
                }
            }
            lite_m9_cursor = lite$addInt(lite_m9_cursor, 1n, 3123);
        }
        const lite_m9_integerEnd = lite_m9_cursor;
        void lite_m9_integerEnd;
        let lite_m9_fractionStart = lite_m9_cursor;
        void lite_m9_fractionStart;
        let lite_m9_fractionEnd = lite_m9_cursor;
        void lite_m9_fractionEnd;
        let lite_m9_floating = false;
        void lite_m9_floating;
        if (((((((lite$addInt(lite_m9_cursor, 1n, 3265)) < (lite_m9_size))) && (((lite$textAt(lite_source, lite_m9_cursor, 3280)) === ("."))))) && (liteFn_m3_isDigit(lite$textAt(lite_source, lite$addInt(lite_m9_cursor, 1n, 3349), 3327))))) {
            lite_m9_floating = true;
            lite_m9_cursor = lite$addInt(lite_m9_cursor, 1n, 3406);
            lite_m9_fractionStart = lite_m9_cursor;
            while (((((lite_m9_cursor) < (lite_m9_size))) && (liteFn_m3_isDigit(lite$textAt(lite_source, lite_m9_cursor, 3487))))) {
                lite_m9_cursor = lite$addInt(lite_m9_cursor, 1n, 3529);
            }
            lite_m9_fractionEnd = lite_m9_cursor;
        }
        let lite_m9_exponent = 0n;
        void lite_m9_exponent;
        let lite_m9_exponentMissingAt = (-1n);
        void lite_m9_exponentMissingAt;
        if (((((lite_m9_cursor) < (lite_m9_size))) && ((((((lite$textAt(lite_source, lite_m9_cursor, 3654)) === ("e"))) || (((lite$textAt(lite_source, lite_m9_cursor, 3687)) === ("E")))))))) {
            lite_m9_floating = true;
            const lite_m9_exponentAt = lite_m9_cursor;
            void lite_m9_exponentAt;
            lite_m9_cursor = lite$addInt(lite_m9_cursor, 1n, 3799);
            let lite_m9_negativeExponent = false;
            void lite_m9_negativeExponent;
            if (((((lite_m9_cursor) < (lite_m9_size))) && ((((((lite$textAt(lite_source, lite_m9_cursor, 3873)) === ("+"))) || (((lite$textAt(lite_source, lite_m9_cursor, 3906)) === ("-")))))))) {
                lite_m9_negativeExponent = ((lite$textAt(lite_source, lite_m9_cursor, 3970)) === ("-"));
                lite_m9_cursor = lite$addInt(lite_m9_cursor, 1n, 4029);
            }
            const lite_m9_exponentStart = lite_m9_cursor;
            void lite_m9_exponentStart;
            const lite_m9_limit = lite$addInt(lite_m9_size, 310n, 4099);
            void lite_m9_limit;
            while (((((lite_m9_cursor) < (lite_m9_size))) && (liteFn_m3_isDigit(lite$textAt(lite_source, lite_m9_cursor, 4150))))) {
                const lite_m9_digit = liteFn_m3_digitValue(lite$textAt(lite_source, lite_m9_cursor, 4213));
                void lite_m9_digit;
                if (((lite_m9_exponent) > (lite$divideInt((lite$subtractInt(lite_m9_limit, lite_m9_digit, 4271)), 10n, 4280)))) {
                    lite_m9_exponent = lite_m9_limit;
                } else {
                    lite_m9_exponent = lite$addInt(lite$multiplyInt(lite_m9_exponent, 10n, 4346), lite_m9_digit, 4351);
                }
                lite_m9_cursor = lite$addInt(lite_m9_cursor, 1n, 4390);
            }
            if (((lite_m9_cursor) === (lite_m9_exponentStart))) {
                lite_m9_exponentMissingAt = lite_m9_exponentAt;
            }
            if (lite_m9_negativeExponent) {
                lite_m9_exponent = lite$negateInt(lite_m9_exponent, 4517);
            }
        }
        return { next: lite_m9_cursor, integerEnd: lite_m9_integerEnd, fractionStart: lite_m9_fractionStart, fractionEnd: lite_m9_fractionEnd, exponent: lite_m9_exponent, floating: lite_m9_floating, exponentMissingAt: lite_m9_exponentMissingAt, magnitude: lite_m9_magnitude, outsideInt: lite_m9_outsideInt };
    }
    void liteFn_m9_scanNumericLiteral;
    function liteFn_m10_tsScalarType(lite_kind: string): string {
        void lite_kind;
        return (Boolean(((lite_kind) === ("Int"))) ? "bigint" : (Boolean(((lite_kind) === ("String"))) ? "string" : (Boolean(((lite_kind) === ("Float"))) ? "number" : (Boolean(((lite_kind) === ("Bool"))) ? "boolean" : "void"))));
    }
    void liteFn_m10_tsScalarType;
    function liteFn_m10_intLiteralCode(lite_value: bigint, lite_negative: boolean, lite_digits: string): string {
        void lite_value;
        void lite_negative;
        void lite_digits;
        return (Boolean(((lite_value) === (0n))) ? "0n" : (Boolean(lite_negative) ? (((("(-") + (lite_digits))) + ("n)")) : ((lite_digits) + ("n"))));
    }
    void liteFn_m10_intLiteralCode;
    function liteFn_m10_textLiteralCode(lite_value: string): string {
        void lite_value;
        const lite_m10_size = lite$textLength(lite_value);
        void lite_m10_size;
        let lite_m10_encoded = "\"";
        void lite_m10_encoded;
        let lite_m10_position = 0n;
        void lite_m10_position;
        while (((lite_m10_position) < (lite_m10_size))) {
            const lite_m10_ch = lite$textAt(lite_value, lite_m10_position, 887);
            void lite_m10_ch;
            if (((lite_m10_ch) === ("\\"))) {
                lite_m10_encoded = ((lite_m10_encoded) + ("\\\\"));
            } else if (((lite_m10_ch) === ("\""))) {
                lite_m10_encoded = ((lite_m10_encoded) + ("\\\""));
            } else if (((lite_m10_ch) === ("\n"))) {
                lite_m10_encoded = ((lite_m10_encoded) + ("\\n"));
            } else if (((lite_m10_ch) === ("\r"))) {
                lite_m10_encoded = ((lite_m10_encoded) + ("\\r"));
            } else if (((lite_m10_ch) === ("\t"))) {
                lite_m10_encoded = ((lite_m10_encoded) + ("\\t"));
            } else {
                lite_m10_encoded = ((lite_m10_encoded) + (lite_m10_ch));
            }
            lite_m10_position = lite$addInt(lite_m10_position, 1n, 1268);
        }
        return ((lite_m10_encoded) + ("\""));
    }
    void liteFn_m10_textLiteralCode;
    function liteFn_m10_floatLiteralCode(lite_digits: string, lite_negative: boolean): string {
        void lite_digits;
        void lite_negative;
        const lite_m10_parsed = (((("Number(") + (liteFn_m10_textLiteralCode(lite_digits)))) + (")"));
        void lite_m10_parsed;
        return (Boolean(lite_negative) ? (((("(-") + (lite_m10_parsed))) + (")")) : lite_m10_parsed);
    }
    void liteFn_m10_floatLiteralCode;
    function liteFn_m10_unitEvaluationCode(lite_code: string): string {
        void lite_code;
        return (((("(void (") + (lite_code))) + ("))"));
    }
    void liteFn_m10_unitEvaluationCode;
    function liteFn_m10_unitLiteralCode(): string {
        return "undefined";
    }
    void liteFn_m10_unitLiteralCode;
    function liteFn_m10_boolLiteralCode(lite_value: boolean): string {
        void lite_value;
        return (Boolean(lite_value) ? "true" : "false");
    }
    void liteFn_m10_boolLiteralCode;
    function liteFn_m10_listCopyCode(lite_code: string): string {
        void lite_code;
        return (((("[...(") + (lite_code))) + (")]"));
    }
    void liteFn_m10_listCopyCode;
    function liteFn_m10_concatCode(lite_left: string, lite_right: string): string {
        void lite_left;
        void lite_right;
        return (((((((("((") + (lite_left))) + (") + ("))) + (lite_right))) + ("))"));
    }
    void liteFn_m10_concatCode;
    function liteFn_m10_notCode(lite_value: string): string {
        void lite_value;
        return (((("(!(") + (lite_value))) + ("))"));
    }
    void liteFn_m10_notCode;
    function liteFn_m10_logicCode(lite_op: string, lite_left: string, lite_right: string): string {
        void lite_op;
        void lite_left;
        void lite_right;
        return (Boolean(((lite_op) === ("and"))) ? (((((((("((") + (lite_left))) + (") && ("))) + (lite_right))) + ("))")) : (((((((("((") + (lite_left))) + (") || ("))) + (lite_right))) + ("))")));
    }
    void liteFn_m10_logicCode;
    function liteFn_m10_comparisonCode(lite_op: string, lite_kind: string, lite_left: string, lite_right: string): string {
        void lite_op;
        void lite_kind;
        void lite_left;
        void lite_right;
        const lite_m10_operator = (Boolean(((lite_op) === ("=="))) ? "===" : (Boolean(((lite_op) === ("=!="))) ? "!==" : (Boolean(((lite_op) === ("<"))) ? "<" : (Boolean(((lite_op) === ("<!"))) ? ">=" : (Boolean(((lite_op) === ("<="))) ? "<=" : (Boolean(((lite_op) === ("<!="))) ? ">" : (Boolean(((lite_op) === (">"))) ? ">" : (Boolean(((lite_op) === (">!"))) ? "<=" : (Boolean(((lite_op) === (">="))) ? ">=" : "<")))))))));
        void lite_m10_operator;
        return (Boolean(((lite_kind) === ("Bool"))) ? (((((((((((("(Boolean(") + (lite_left))) + (") "))) + (lite_m10_operator))) + (" Boolean("))) + (lite_right))) + ("))")) : (((((((((((("((") + (lite_left))) + (") "))) + (lite_m10_operator))) + (" ("))) + (lite_right))) + ("))")));
    }
    void liteFn_m10_comparisonCode;
    function liteFn_m10_floatOperandCode(lite_kind: string, lite_code: string): string {
        void lite_kind;
        void lite_code;
        return (Boolean(((lite_kind) === ("Int"))) ? (((("Number(") + (lite_code))) + (")")) : lite_code);
    }
    void liteFn_m10_floatOperandCode;
    function liteFn_m10_comparisonPairCode(lite_op: string, lite_leftKind: string, lite_rightKind: string, lite_left: string, lite_right: string): string {
        void lite_op;
        void lite_leftKind;
        void lite_rightKind;
        void lite_left;
        void lite_right;
        return (Boolean(((((lite_leftKind) !== (lite_rightKind))) && ((((((lite_leftKind) === ("Float"))) || (((lite_rightKind) === ("Float")))))))) ? liteFn_m10_comparisonCode(lite_op, "Float", liteFn_m10_floatOperandCode(lite_leftKind, lite_left), liteFn_m10_floatOperandCode(lite_rightKind, lite_right)) : liteFn_m10_comparisonCode(lite_op, lite_leftKind, lite_left, lite_right));
    }
    void liteFn_m10_comparisonPairCode;
    function liteFn_m10_floatBinaryCode(lite_op: string, lite_left: string, lite_right: string, lite_position: bigint): string {
        void lite_op;
        void lite_left;
        void lite_right;
        void lite_position;
        const lite_m10_tag = (Boolean(((lite_op) === ("+"))) ? "0" : (Boolean(((lite_op) === ("-"))) ? "1" : (Boolean(((lite_op) === ("*"))) ? "2" : "3")));
        void lite_m10_tag;
        return (((((((((((((((("lite$floatOp(") + (lite_left))) + (", "))) + (lite_right))) + (", "))) + (lite_m10_tag))) + (", "))) + (liteFn_m4_intText(lite_position)))) + (")"));
    }
    void liteFn_m10_floatBinaryCode;
    function liteFn_m10_floatPowerCode(lite_left: string, lite_right: string, lite_position: bigint): string {
        void lite_left;
        void lite_right;
        void lite_position;
        return (((((((((((("lite$floatPower(") + (lite_left))) + (", "))) + (lite_right))) + (", "))) + (liteFn_m4_intText(lite_position)))) + (")"));
    }
    void liteFn_m10_floatPowerCode;
    function liteFn_m10_floorDivCode(lite_left: string, lite_right: string): string {
        void lite_left;
        void lite_right;
        return (((((((((((((((((((((((((((("(") + (lite_left))) + (" / "))) + (lite_right))) + (" - (((("))) + (lite_left))) + (" % "))) + (lite_right))) + (") != 0n) && ((("))) + (lite_left))) + (" % "))) + (lite_right))) + (") < 0n) != ("))) + (lite_right))) + (" < 0n))) ? 1n : 0n))"));
    }
    void liteFn_m10_floorDivCode;
    function liteFn_m10_floorModCode(lite_left: string, lite_right: string): string {
        void lite_left;
        void lite_right;
        return (((((((((((((((((((((((((((((((("(") + (lite_left))) + (" % "))) + (lite_right))) + (" + (((("))) + (lite_left))) + (" % "))) + (lite_right))) + (") != 0n) && ((("))) + (lite_left))) + (" % "))) + (lite_right))) + (") < 0n) != ("))) + (lite_right))) + (" < 0n))) ? "))) + (lite_right))) + (" : 0n))"));
    }
    void liteFn_m10_floorModCode;
    function liteFn_m10_intDivideCode(lite_left: string, lite_right: string, lite_position: bigint): string {
        void lite_left;
        void lite_right;
        void lite_position;
        return (((((((((((("lite$divideInt(") + (lite_left))) + (", "))) + (lite_right))) + (", "))) + (liteFn_m4_intText(lite_position)))) + (")"));
    }
    void liteFn_m10_intDivideCode;
    function liteFn_m10_intRemainderCode(lite_left: string, lite_right: string, lite_position: bigint): string {
        void lite_left;
        void lite_right;
        void lite_position;
        return (((((((((((("lite$remainderInt(") + (lite_left))) + (", "))) + (lite_right))) + (", "))) + (liteFn_m4_intText(lite_position)))) + (")"));
    }
    void liteFn_m10_intRemainderCode;
    function liteFn_m10_intFloorDivideCode(lite_left: string, lite_right: string, lite_position: bigint): string {
        void lite_left;
        void lite_right;
        void lite_position;
        return (((((((((((("lite$floorDivideInt(") + (lite_left))) + (", "))) + (lite_right))) + (", "))) + (liteFn_m4_intText(lite_position)))) + (")"));
    }
    void liteFn_m10_intFloorDivideCode;
    function liteFn_m10_intFloorModuloCode(lite_left: string, lite_right: string, lite_position: bigint): string {
        void lite_left;
        void lite_right;
        void lite_position;
        return (((((((((((("lite$floorModuloInt(") + (lite_left))) + (", "))) + (lite_right))) + (", "))) + (liteFn_m4_intText(lite_position)))) + (")"));
    }
    void liteFn_m10_intFloorModuloCode;
    function liteFn_m10_intAddCode(lite_left: string, lite_right: string, lite_position: bigint): string {
        void lite_left;
        void lite_right;
        void lite_position;
        return (((((((((((("lite$addInt(") + (lite_left))) + (", "))) + (lite_right))) + (", "))) + (liteFn_m4_intText(lite_position)))) + (")"));
    }
    void liteFn_m10_intAddCode;
    function liteFn_m10_intSubtractCode(lite_left: string, lite_right: string, lite_position: bigint): string {
        void lite_left;
        void lite_right;
        void lite_position;
        return (((((((((((("lite$subtractInt(") + (lite_left))) + (", "))) + (lite_right))) + (", "))) + (liteFn_m4_intText(lite_position)))) + (")"));
    }
    void liteFn_m10_intSubtractCode;
    function liteFn_m10_intMultiplyCode(lite_left: string, lite_right: string, lite_position: bigint): string {
        void lite_left;
        void lite_right;
        void lite_position;
        return (((((((((((("lite$multiplyInt(") + (lite_left))) + (", "))) + (lite_right))) + (", "))) + (liteFn_m4_intText(lite_position)))) + (")"));
    }
    void liteFn_m10_intMultiplyCode;
    function liteFn_m10_intNegateCode(lite_value: string, lite_position: bigint): string {
        void lite_value;
        void lite_position;
        return (((((((("lite$negateInt(") + (lite_value))) + (", "))) + (liteFn_m4_intText(lite_position)))) + (")"));
    }
    void liteFn_m10_intNegateCode;
    function liteFn_m10_comparisonChainCode(lite_codes: string[], lite_kinds: string[], lite_operators: string[], lite_count: bigint, lite_position: bigint): string {
        void lite_codes;
        void lite_kinds;
        void lite_operators;
        void lite_count;
        void lite_position;
        let lite_m10_result = "((): boolean => { ";
        void lite_m10_result;
        let lite_m10_index = 0n;
        void lite_m10_index;
        while (((lite_m10_index) <= (lite_count))) {
            const lite_m10_name = (("lite$compare") + (liteFn_m4_intText(lite_m10_index)));
            void lite_m10_name;
            lite_m10_result = ((((((((((((((lite_m10_result) + ("const "))) + (lite_m10_name))) + (": "))) + (liteFn_m10_tsScalarType(lite$listAt((lite_kinds), lite_m10_index, 7980))))) + (" = "))) + (lite$listAt((lite_codes), lite_m10_index, 8004)))) + ("; "));
            if (((lite_m10_index) > (0n))) {
                const lite_m10_pair = liteFn_m10_comparisonPairCode(lite$listAt((lite_operators), lite$subtractInt(lite_m10_index, 1n, 8097), 8091), lite$listAt((lite_kinds), lite$subtractInt(lite_m10_index, 1n, 8115), 8109), lite$listAt((lite_kinds), lite_m10_index, 8127), (("lite$compare") + (liteFn_m4_intText(lite$subtractInt(lite_m10_index, 1n, 8174)))), lite_m10_name);
                void lite_m10_pair;
                if (((lite_m10_index) < (lite_count))) {
                    lite_m10_result = ((((((lite_m10_result) + ("if (!("))) + (lite_m10_pair))) + (")) return false; "));
                } else {
                    lite_m10_result = ((((((lite_m10_result) + ("return "))) + (lite_m10_pair))) + ("; "));
                }
            }
            lite_m10_index = lite$addInt(lite_m10_index, 1n, 8373);
        }
        return ((lite_m10_result) + ("})()"));
    }
    void liteFn_m10_comparisonChainCode;
    function liteFn_m11_intLiteralCode(lite_value: bigint, lite_negative: boolean, lite_digits: string): string {
        void lite_value;
        void lite_negative;
        void lite_digits;
        return (Boolean(((lite_value) === ((-9223372036854775808n)))) ? "INT64_MIN" : (Boolean(((lite_value) === (0n))) ? "INT64_C(0)" : (Boolean(lite_negative) ? (((("(-INT64_C(") + (lite_digits))) + ("))")) : (((("INT64_C(") + (lite_digits))) + (")")))));
    }
    void liteFn_m11_intLiteralCode;
    function liteFn_m11_textLiteralCode(lite_value: string): string {
        void lite_value;
        const lite_m11_size = lite$textLength(lite_value);
        void lite_m11_size;
        let lite_m11_encoded = "\"";
        void lite_m11_encoded;
        let lite_m11_position = 0n;
        void lite_m11_position;
        while (((lite_m11_position) < (lite_m11_size))) {
            const lite_m11_ch = lite$textAt(lite_value, lite_m11_position, 746);
            void lite_m11_ch;
            if (((lite_m11_ch) === ("\\"))) {
                lite_m11_encoded = ((lite_m11_encoded) + ("\\\\"));
            } else if (((lite_m11_ch) === ("\""))) {
                lite_m11_encoded = ((lite_m11_encoded) + ("\\\""));
            } else if (((lite_m11_ch) === ("?"))) {
                lite_m11_encoded = ((lite_m11_encoded) + ("\\?"));
            } else if (((lite_m11_ch) === ("\n"))) {
                lite_m11_encoded = ((lite_m11_encoded) + ("\\n"));
            } else if (((lite_m11_ch) === ("\r"))) {
                lite_m11_encoded = ((lite_m11_encoded) + ("\\r"));
            } else if (((lite_m11_ch) === ("\t"))) {
                lite_m11_encoded = ((lite_m11_encoded) + ("\\t"));
            } else {
                lite_m11_encoded = ((lite_m11_encoded) + (lite_m11_ch));
            }
            lite_m11_position = lite$addInt(lite_m11_position, 1n, 1184);
        }
        return ((lite_m11_encoded) + ("\""));
    }
    void liteFn_m11_textLiteralCode;
    function liteFn_m11_floatLiteralCode(lite_digits: string, lite_negative: boolean): string {
        void lite_digits;
        void lite_negative;
        const lite_m11_parsed = (((("lt_float_literal(") + (liteFn_m11_textLiteralCode(lite_digits)))) + (")"));
        void lite_m11_parsed;
        return (Boolean(lite_negative) ? (((("(-") + (lite_m11_parsed))) + (")")) : lite_m11_parsed);
    }
    void liteFn_m11_floatLiteralCode;
    function liteFn_m11_unitEvaluationCode(lite_code: string): string {
        void lite_code;
        return (((("((void)(") + (lite_code))) + ("), 0)"));
    }
    void liteFn_m11_unitEvaluationCode;
    function liteFn_m11_unitLiteralCode(): string {
        return "0";
    }
    void liteFn_m11_unitLiteralCode;
    function liteFn_m11_boolLiteralCode(lite_value: boolean): string {
        void lite_value;
        return (Boolean(lite_value) ? "true" : "false");
    }
    void liteFn_m11_boolLiteralCode;
    function liteFn_m11_listCopyCode(lite_code: string): string {
        void lite_code;
        liteFn_m8_fail("", "C backend does not support list values yet");
        return lite_code;
    }
    void liteFn_m11_listCopyCode;
    function liteFn_m11_concatCode(lite_left: string, lite_right: string): string {
        void lite_left;
        void lite_right;
        return (((((((("lite_concat(") + (lite_left))) + (", "))) + (lite_right))) + (")"));
    }
    void liteFn_m11_concatCode;
    function liteFn_m11_notCode(lite_value: string): string {
        void lite_value;
        return (((("(!(") + (lite_value))) + ("))"));
    }
    void liteFn_m11_notCode;
    function liteFn_m11_logicCode(lite_op: string, lite_left: string, lite_right: string): string {
        void lite_op;
        void lite_left;
        void lite_right;
        return (Boolean(((lite_op) === ("and"))) ? (((((((("((") + (lite_left))) + (") && ("))) + (lite_right))) + ("))")) : (((((((("((") + (lite_left))) + (") || ("))) + (lite_right))) + ("))")));
    }
    void liteFn_m11_logicCode;
    function liteFn_m11_comparisonCode(lite_op: string, lite_kind: string, lite_left: string, lite_right: string): string {
        void lite_op;
        void lite_kind;
        void lite_left;
        void lite_right;
        if (((lite_kind) === ("String"))) {
            return (Boolean(((lite_op) === ("=="))) ? (((((((("strcmp(") + (lite_left))) + (", "))) + (lite_right))) + (") == 0")) : (((((((("strcmp(") + (lite_left))) + (", "))) + (lite_right))) + (") != 0")));
        } else {
            const lite_m11_operator = (Boolean(((lite_op) === ("=="))) ? "==" : (Boolean(((lite_op) === ("=!="))) ? "!=" : (Boolean(((lite_op) === ("<"))) ? "<" : (Boolean(((lite_op) === ("<!"))) ? ">=" : (Boolean(((lite_op) === ("<="))) ? "<=" : (Boolean(((lite_op) === ("<!="))) ? ">" : (Boolean(((lite_op) === (">"))) ? ">" : (Boolean(((lite_op) === (">!"))) ? "<=" : (Boolean(((lite_op) === (">="))) ? ">=" : "<")))))))));
            void lite_m11_operator;
            return (((((((((((("(") + (lite_left))) + (") "))) + (lite_m11_operator))) + (" ("))) + (lite_right))) + (")"));
        }
    }
    void liteFn_m11_comparisonCode;
    function liteFn_m11_floatOperandCode(lite_kind: string, lite_code: string): string {
        void lite_kind;
        void lite_code;
        return (Boolean(((lite_kind) === ("Int"))) ? (((("((double)(") + (lite_code))) + ("))")) : lite_code);
    }
    void liteFn_m11_floatOperandCode;
    function liteFn_m11_comparisonPairCode(lite_op: string, lite_leftKind: string, lite_rightKind: string, lite_left: string, lite_right: string): string {
        void lite_op;
        void lite_leftKind;
        void lite_rightKind;
        void lite_left;
        void lite_right;
        return (Boolean(((((lite_leftKind) !== (lite_rightKind))) && ((((((lite_leftKind) === ("Float"))) || (((lite_rightKind) === ("Float")))))))) ? liteFn_m11_comparisonCode(lite_op, "Float", liteFn_m11_floatOperandCode(lite_leftKind, lite_left), liteFn_m11_floatOperandCode(lite_rightKind, lite_right)) : liteFn_m11_comparisonCode(lite_op, lite_leftKind, lite_left, lite_right));
    }
    void liteFn_m11_comparisonPairCode;
    function liteFn_m11_floatBinaryCode(lite_op: string, lite_left: string, lite_right: string, lite_position: bigint): string {
        void lite_op;
        void lite_left;
        void lite_right;
        void lite_position;
        const lite_m11_tag = (Boolean(((lite_op) === ("+"))) ? "0" : (Boolean(((lite_op) === ("-"))) ? "1" : (Boolean(((lite_op) === ("*"))) ? "2" : "3")));
        void lite_m11_tag;
        const lite_m11_id = liteFn_m4_intText(lite_position);
        void lite_m11_id;
        return (((((((((((((((((((((((((((((((("(lt_arg_f_left_") + (lite_m11_id))) + (" = "))) + (lite_left))) + (", lt_arg_f_right_"))) + (lite_m11_id))) + (" = "))) + (lite_right))) + (", lt_float_op(lt_arg_f_left_"))) + (lite_m11_id))) + (", lt_arg_f_right_"))) + (lite_m11_id))) + (", "))) + (lite_m11_tag))) + (", "))) + (lite_m11_id))) + ("))"));
    }
    void liteFn_m11_floatBinaryCode;
    function liteFn_m11_floatPowerCode(lite_left: string, lite_right: string, lite_position: bigint): string {
        void lite_left;
        void lite_right;
        void lite_position;
        const lite_m11_id = liteFn_m4_intText(lite_position);
        void lite_m11_id;
        return (((((((((((((((((((((((((((("(lt_arg_f_left_") + (lite_m11_id))) + (" = "))) + (lite_left))) + (", lt_arg_f_right_"))) + (lite_m11_id))) + (" = "))) + (lite_right))) + (", lt_float_power(lt_arg_f_left_"))) + (lite_m11_id))) + (", lt_arg_f_right_"))) + (lite_m11_id))) + (", "))) + (lite_m11_id))) + ("))"));
    }
    void liteFn_m11_floatPowerCode;
    function liteFn_m11_floorDivCode(lite_left: string, lite_right: string): string {
        void lite_left;
        void lite_right;
        return (((((((((((((((((((((((((((("(") + (lite_left))) + (" / "))) + (lite_right))) + (" - (((("))) + (lite_left))) + (" % "))) + (lite_right))) + (") != 0) && ((("))) + (lite_left))) + (" % "))) + (lite_right))) + (") < 0) != ("))) + (lite_right))) + (" < 0))) ? 1 : 0))"));
    }
    void liteFn_m11_floorDivCode;
    function liteFn_m11_floorModCode(lite_left: string, lite_right: string): string {
        void lite_left;
        void lite_right;
        return (((((((((((((((((((((((((((((((("(") + (lite_left))) + (" % "))) + (lite_right))) + (" + (((("))) + (lite_left))) + (" % "))) + (lite_right))) + (") != 0) && ((("))) + (lite_left))) + (" % "))) + (lite_right))) + (") < 0) != ("))) + (lite_right))) + (" < 0))) ? "))) + (lite_right))) + (" : 0))"));
    }
    void liteFn_m11_floorModCode;
    function liteFn_m11_intBinaryCallCode(lite_name: string, lite_left: string, lite_right: string, lite_position: bigint): string {
        void lite_name;
        void lite_left;
        void lite_right;
        void lite_position;
        const lite_m11_id = liteFn_m4_intText(lite_position);
        void lite_m11_id;
        return (((((((((((((((((((((((((((((((("(lt_arg_left_") + (lite_m11_id))) + (" = "))) + (lite_left))) + (", lt_arg_right_"))) + (lite_m11_id))) + (" = "))) + (lite_right))) + (", "))) + (lite_name))) + ("(lt_arg_left_"))) + (lite_m11_id))) + (", lt_arg_right_"))) + (lite_m11_id))) + (", "))) + (lite_m11_id))) + ("))"));
    }
    void liteFn_m11_intBinaryCallCode;
    function liteFn_m11_intDivideCode(lite_left: string, lite_right: string, lite_position: bigint): string {
        void lite_left;
        void lite_right;
        void lite_position;
        return liteFn_m11_intBinaryCallCode("lite_divide_int", lite_left, lite_right, lite_position);
    }
    void liteFn_m11_intDivideCode;
    function liteFn_m11_intRemainderCode(lite_left: string, lite_right: string, lite_position: bigint): string {
        void lite_left;
        void lite_right;
        void lite_position;
        return liteFn_m11_intBinaryCallCode("lite_remainder_int", lite_left, lite_right, lite_position);
    }
    void liteFn_m11_intRemainderCode;
    function liteFn_m11_intFloorDivideCode(lite_left: string, lite_right: string, lite_position: bigint): string {
        void lite_left;
        void lite_right;
        void lite_position;
        return liteFn_m11_intBinaryCallCode("lite_floor_divide_int", lite_left, lite_right, lite_position);
    }
    void liteFn_m11_intFloorDivideCode;
    function liteFn_m11_intFloorModuloCode(lite_left: string, lite_right: string, lite_position: bigint): string {
        void lite_left;
        void lite_right;
        void lite_position;
        return liteFn_m11_intBinaryCallCode("lite_floor_modulo_int", lite_left, lite_right, lite_position);
    }
    void liteFn_m11_intFloorModuloCode;
    function liteFn_m11_intAddCode(lite_left: string, lite_right: string, lite_position: bigint): string {
        void lite_left;
        void lite_right;
        void lite_position;
        return liteFn_m11_intBinaryCallCode("lt_checked_add", lite_left, lite_right, lite_position);
    }
    void liteFn_m11_intAddCode;
    function liteFn_m11_intSubtractCode(lite_left: string, lite_right: string, lite_position: bigint): string {
        void lite_left;
        void lite_right;
        void lite_position;
        return liteFn_m11_intBinaryCallCode("lt_checked_subtract", lite_left, lite_right, lite_position);
    }
    void liteFn_m11_intSubtractCode;
    function liteFn_m11_intMultiplyCode(lite_left: string, lite_right: string, lite_position: bigint): string {
        void lite_left;
        void lite_right;
        void lite_position;
        return liteFn_m11_intBinaryCallCode("lt_checked_multiply", lite_left, lite_right, lite_position);
    }
    void liteFn_m11_intMultiplyCode;
    function liteFn_m11_intNegateCode(lite_value: string, lite_position: bigint): string {
        void lite_value;
        void lite_position;
        return (((((((("lt_checked_negate(") + (lite_value))) + (", "))) + (liteFn_m4_intText(lite_position)))) + (")"));
    }
    void liteFn_m11_intNegateCode;
    function liteFn_m11_comparisonTemp(lite_kind: string, lite_position: bigint, lite_index: bigint): string {
        void lite_kind;
        void lite_position;
        void lite_index;
        const lite_m11_tag = (Boolean(((lite_kind) === ("String"))) ? "s" : (Boolean(((lite_kind) === ("Bool"))) ? "b" : (Boolean(((lite_kind) === ("Float"))) ? "f" : "i")));
        void lite_m11_tag;
        return (((((((((("lt_cmp_") + (lite_m11_tag))) + ("_"))) + (liteFn_m4_intText(lite_position)))) + ("_"))) + (liteFn_m4_intText(lite_index)));
    }
    void liteFn_m11_comparisonTemp;
    function liteFn_m11_comparisonValueCode(lite_kind: string, lite_code: string): string {
        void lite_kind;
        void lite_code;
        if (((lite_kind) !== ("Unit"))) {
            return lite_code;
        }
        let lite_m11_inner = lite_code;
        void lite_m11_inner;
        while (((((((lite$textLength(lite_m11_inner)) >= (2n))) && (((lite$textAt(lite_m11_inner, 0n, 8545)) === ("("))))) && (((lite$textAt(lite_m11_inner, lite$subtractInt(lite$textLength(lite_m11_inner), 1n, 8605), 8573)) === (")"))))) {
            lite_m11_inner = lite$textSlice(lite_m11_inner, 1n, lite$subtractInt(lite$textLength(lite_m11_inner), 1n, 8673), 8635);
        }
        return (Boolean(((lite_m11_inner) === ("undefined"))) ? "0" : (((("(") + (lite_code))) + (", 0)")));
    }
    void liteFn_m11_comparisonValueCode;
    function liteFn_m11_comparisonChainCode(lite_codes: string[], lite_kinds: string[], lite_operators: string[], lite_count: bigint, lite_position: bigint): string {
        void lite_codes;
        void lite_kinds;
        void lite_operators;
        void lite_count;
        void lite_position;
        const lite_m11_first = liteFn_m11_comparisonTemp(lite$listAt((lite_kinds), 0n, 9042), lite_position, 0n);
        void lite_m11_first;
        const lite_m11_second = liteFn_m11_comparisonTemp(lite$listAt((lite_kinds), 1n, 9095), lite_position, 1n);
        void lite_m11_second;
        let lite_m11_result = (((((((((((((((((("(") + (lite_m11_first))) + (" = "))) + (liteFn_m11_comparisonValueCode(lite$listAt((lite_kinds), 0n, 9179), lite$listAt((lite_codes), 0n, 9189))))) + (", "))) + (lite_m11_second))) + (" = "))) + (liteFn_m11_comparisonValueCode(lite$listAt((lite_kinds), 1n, 9245), lite$listAt((lite_codes), 1n, 9255))))) + (", "))) + (liteFn_m11_comparisonPairCode(lite$listAt((lite_operators), 0n, 9297), lite$listAt((lite_kinds), 0n, 9307), lite$listAt((lite_kinds), 1n, 9317), lite_m11_first, lite_m11_second)));
        void lite_m11_result;
        let lite_m11_index = 2n;
        void lite_m11_index;
        while (((lite_m11_index) <= (lite_count))) {
            const lite_m11_name = liteFn_m11_comparisonTemp(lite$listAt((lite_kinds), lite_m11_index, 9420), lite_position, lite_m11_index);
            void lite_m11_name;
            const lite_m11_pair = liteFn_m11_comparisonPairCode(lite$listAt((lite_operators), lite$subtractInt(lite_m11_index, 1n, 9497), 9491), lite$listAt((lite_kinds), lite$subtractInt(lite_m11_index, 1n, 9515), 9509), lite$listAt((lite_kinds), lite_m11_index, 9527), liteFn_m11_comparisonTemp(lite$listAt((lite_kinds), lite$subtractInt(lite_m11_index, 1n, 9562), 9556), lite_position, lite$subtractInt(lite_m11_index, 1n, 9584)), lite_m11_name);
            void lite_m11_pair;
            lite_m11_result = ((((((((((((((lite_m11_result) + (" && ("))) + (lite_m11_name))) + (" = "))) + (liteFn_m11_comparisonValueCode(lite$listAt((lite_kinds), lite_m11_index, 9674), lite$listAt((lite_codes), lite_m11_index, 9688))))) + (", "))) + (lite_m11_pair))) + (")"));
            lite_m11_index = lite$addInt(lite_m11_index, 1n, 9739);
        }
        return ((lite_m11_result) + (")"));
    }
    void liteFn_m11_comparisonChainCode;
    function liteFn_m2_targetBoolLiteralCode(lite_target: string, lite_value: boolean): string {
        void lite_target;
        void lite_value;
        return (Boolean(((lite_target) === ("ts"))) ? liteFn_m10_boolLiteralCode(lite_value) : liteFn_m11_boolLiteralCode(lite_value));
    }
    void liteFn_m2_targetBoolLiteralCode;
    function liteFn_m2_targetComparisonChainCode(lite_target: string, lite_codes: string[], lite_kinds: string[], lite_operators: string[], lite_count: bigint, lite_position: bigint): string {
        void lite_target;
        void lite_codes;
        void lite_kinds;
        void lite_operators;
        void lite_count;
        void lite_position;
        return (Boolean(((lite_target) === ("ts"))) ? liteFn_m10_comparisonChainCode([...(lite_codes)], [...(lite_kinds)], [...(lite_operators)], lite_count, lite_position) : liteFn_m11_comparisonChainCode([...(lite_codes)], [...(lite_kinds)], [...(lite_operators)], lite_count, lite_position));
    }
    void liteFn_m2_targetComparisonChainCode;
    function liteFn_m2_targetComparisonCode(lite_target: string, lite_op: string, lite_kind: string, lite_left: string, lite_right: string): string {
        void lite_target;
        void lite_op;
        void lite_kind;
        void lite_left;
        void lite_right;
        return (Boolean(((lite_target) === ("ts"))) ? liteFn_m10_comparisonCode(lite_op, lite_kind, lite_left, lite_right) : liteFn_m11_comparisonCode(lite_op, lite_kind, lite_left, lite_right));
    }
    void liteFn_m2_targetComparisonCode;
    function liteFn_m2_targetConcatCode(lite_target: string, lite_left: string, lite_right: string): string {
        void lite_target;
        void lite_left;
        void lite_right;
        return (Boolean(((lite_target) === ("ts"))) ? liteFn_m10_concatCode(lite_left, lite_right) : liteFn_m11_concatCode(lite_left, lite_right));
    }
    void liteFn_m2_targetConcatCode;
    function liteFn_m2_targetFloatBinaryCode(lite_target: string, lite_op: string, lite_left: string, lite_right: string, lite_position: bigint): string {
        void lite_target;
        void lite_op;
        void lite_left;
        void lite_right;
        void lite_position;
        return (Boolean(((lite_target) === ("ts"))) ? liteFn_m10_floatBinaryCode(lite_op, lite_left, lite_right, lite_position) : liteFn_m11_floatBinaryCode(lite_op, lite_left, lite_right, lite_position));
    }
    void liteFn_m2_targetFloatBinaryCode;
    function liteFn_m2_targetFloatLiteralCode(lite_target: string, lite_digits: string, lite_negative: boolean): string {
        void lite_target;
        void lite_digits;
        void lite_negative;
        return (Boolean(((lite_target) === ("ts"))) ? liteFn_m10_floatLiteralCode(lite_digits, lite_negative) : liteFn_m11_floatLiteralCode(lite_digits, lite_negative));
    }
    void liteFn_m2_targetFloatLiteralCode;
    function liteFn_m2_targetFloatOperandCode(lite_target: string, lite_kind: string, lite_code: string): string {
        void lite_target;
        void lite_kind;
        void lite_code;
        return (Boolean(((lite_target) === ("ts"))) ? liteFn_m10_floatOperandCode(lite_kind, lite_code) : liteFn_m11_floatOperandCode(lite_kind, lite_code));
    }
    void liteFn_m2_targetFloatOperandCode;
    function liteFn_m2_targetFloatPowerCode(lite_target: string, lite_left: string, lite_right: string, lite_position: bigint): string {
        void lite_target;
        void lite_left;
        void lite_right;
        void lite_position;
        return (Boolean(((lite_target) === ("ts"))) ? liteFn_m10_floatPowerCode(lite_left, lite_right, lite_position) : liteFn_m11_floatPowerCode(lite_left, lite_right, lite_position));
    }
    void liteFn_m2_targetFloatPowerCode;
    function liteFn_m2_targetFloorDivCode(lite_target: string, lite_left: string, lite_right: string): string {
        void lite_target;
        void lite_left;
        void lite_right;
        return (Boolean(((lite_target) === ("ts"))) ? liteFn_m10_floorDivCode(lite_left, lite_right) : liteFn_m11_floorDivCode(lite_left, lite_right));
    }
    void liteFn_m2_targetFloorDivCode;
    function liteFn_m2_targetFloorModCode(lite_target: string, lite_left: string, lite_right: string): string {
        void lite_target;
        void lite_left;
        void lite_right;
        return (Boolean(((lite_target) === ("ts"))) ? liteFn_m10_floorModCode(lite_left, lite_right) : liteFn_m11_floorModCode(lite_left, lite_right));
    }
    void liteFn_m2_targetFloorModCode;
    function liteFn_m2_targetIntAddCode(lite_target: string, lite_left: string, lite_right: string, lite_position: bigint): string {
        void lite_target;
        void lite_left;
        void lite_right;
        void lite_position;
        return (Boolean(((lite_target) === ("ts"))) ? liteFn_m10_intAddCode(lite_left, lite_right, lite_position) : liteFn_m11_intAddCode(lite_left, lite_right, lite_position));
    }
    void liteFn_m2_targetIntAddCode;
    function liteFn_m2_targetIntDivideCode(lite_target: string, lite_left: string, lite_right: string, lite_position: bigint): string {
        void lite_target;
        void lite_left;
        void lite_right;
        void lite_position;
        return (Boolean(((lite_target) === ("ts"))) ? liteFn_m10_intDivideCode(lite_left, lite_right, lite_position) : liteFn_m11_intDivideCode(lite_left, lite_right, lite_position));
    }
    void liteFn_m2_targetIntDivideCode;
    function liteFn_m2_targetIntFloorDivideCode(lite_target: string, lite_left: string, lite_right: string, lite_position: bigint): string {
        void lite_target;
        void lite_left;
        void lite_right;
        void lite_position;
        return (Boolean(((lite_target) === ("ts"))) ? liteFn_m10_intFloorDivideCode(lite_left, lite_right, lite_position) : liteFn_m11_intFloorDivideCode(lite_left, lite_right, lite_position));
    }
    void liteFn_m2_targetIntFloorDivideCode;
    function liteFn_m2_targetIntFloorModuloCode(lite_target: string, lite_left: string, lite_right: string, lite_position: bigint): string {
        void lite_target;
        void lite_left;
        void lite_right;
        void lite_position;
        return (Boolean(((lite_target) === ("ts"))) ? liteFn_m10_intFloorModuloCode(lite_left, lite_right, lite_position) : liteFn_m11_intFloorModuloCode(lite_left, lite_right, lite_position));
    }
    void liteFn_m2_targetIntFloorModuloCode;
    function liteFn_m2_targetIntLiteralCode(lite_target: string, lite_value: bigint, lite_negative: boolean, lite_digits: string): string {
        void lite_target;
        void lite_value;
        void lite_negative;
        void lite_digits;
        return (Boolean(((lite_target) === ("ts"))) ? liteFn_m10_intLiteralCode(lite_value, lite_negative, lite_digits) : liteFn_m11_intLiteralCode(lite_value, lite_negative, lite_digits));
    }
    void liteFn_m2_targetIntLiteralCode;
    function liteFn_m2_targetIntMultiplyCode(lite_target: string, lite_left: string, lite_right: string, lite_position: bigint): string {
        void lite_target;
        void lite_left;
        void lite_right;
        void lite_position;
        return (Boolean(((lite_target) === ("ts"))) ? liteFn_m10_intMultiplyCode(lite_left, lite_right, lite_position) : liteFn_m11_intMultiplyCode(lite_left, lite_right, lite_position));
    }
    void liteFn_m2_targetIntMultiplyCode;
    function liteFn_m2_targetIntNegateCode(lite_target: string, lite_value: string, lite_position: bigint): string {
        void lite_target;
        void lite_value;
        void lite_position;
        return (Boolean(((lite_target) === ("ts"))) ? liteFn_m10_intNegateCode(lite_value, lite_position) : liteFn_m11_intNegateCode(lite_value, lite_position));
    }
    void liteFn_m2_targetIntNegateCode;
    function liteFn_m2_targetIntRemainderCode(lite_target: string, lite_left: string, lite_right: string, lite_position: bigint): string {
        void lite_target;
        void lite_left;
        void lite_right;
        void lite_position;
        return (Boolean(((lite_target) === ("ts"))) ? liteFn_m10_intRemainderCode(lite_left, lite_right, lite_position) : liteFn_m11_intRemainderCode(lite_left, lite_right, lite_position));
    }
    void liteFn_m2_targetIntRemainderCode;
    function liteFn_m2_targetIntSubtractCode(lite_target: string, lite_left: string, lite_right: string, lite_position: bigint): string {
        void lite_target;
        void lite_left;
        void lite_right;
        void lite_position;
        return (Boolean(((lite_target) === ("ts"))) ? liteFn_m10_intSubtractCode(lite_left, lite_right, lite_position) : liteFn_m11_intSubtractCode(lite_left, lite_right, lite_position));
    }
    void liteFn_m2_targetIntSubtractCode;
    function liteFn_m2_targetListCopyCode(lite_target: string, lite_code: string): string {
        void lite_target;
        void lite_code;
        return (Boolean(((lite_target) === ("ts"))) ? liteFn_m10_listCopyCode(lite_code) : liteFn_m11_listCopyCode(lite_code));
    }
    void liteFn_m2_targetListCopyCode;
    function liteFn_m2_targetLogicCode(lite_target: string, lite_op: string, lite_left: string, lite_right: string): string {
        void lite_target;
        void lite_op;
        void lite_left;
        void lite_right;
        return (Boolean(((lite_target) === ("ts"))) ? liteFn_m10_logicCode(lite_op, lite_left, lite_right) : liteFn_m11_logicCode(lite_op, lite_left, lite_right));
    }
    void liteFn_m2_targetLogicCode;
    function liteFn_m2_targetNotCode(lite_target: string, lite_value: string): string {
        void lite_target;
        void lite_value;
        return (Boolean(((lite_target) === ("ts"))) ? liteFn_m10_notCode(lite_value) : liteFn_m11_notCode(lite_value));
    }
    void liteFn_m2_targetNotCode;
    function liteFn_m2_targetTextLiteralCode(lite_target: string, lite_value: string): string {
        void lite_target;
        void lite_value;
        return (Boolean(((lite_target) === ("ts"))) ? liteFn_m10_textLiteralCode(lite_value) : liteFn_m11_textLiteralCode(lite_value));
    }
    void liteFn_m2_targetTextLiteralCode;
    function liteFn_m2_targetUnitEvaluationCode(lite_target: string, lite_code: string): string {
        void lite_target;
        void lite_code;
        return (Boolean(((lite_target) === ("ts"))) ? liteFn_m10_unitEvaluationCode(lite_code) : liteFn_m11_unitEvaluationCode(lite_code));
    }
    void liteFn_m2_targetUnitEvaluationCode;
    function liteFn_m2_targetUnitLiteralCode(lite_target: string): string {
        void lite_target;
        return (Boolean(((lite_target) === ("ts"))) ? liteFn_m10_unitLiteralCode() : liteFn_m11_unitLiteralCode());
    }
    void liteFn_m2_targetUnitLiteralCode;
    function liteFn_m2_failAt(lite_source: string, lite_position: bigint, lite_prefix: string, lite_message: string): void {
        void lite_source;
        void lite_position;
        void lite_prefix;
        void lite_message;
        const lite_m2_place = liteFn_m7_lineColumn(lite_source, lite_position);
        void lite_m2_place;
        return (void (liteFn_m8_fail(lite_prefix, ((((((((liteFn_m5_decimalText((lite_m2_place).line)) + (":"))) + (liteFn_m5_decimalText((lite_m2_place).column)))) + (": "))) + (lite_message)))));
    }
    void liteFn_m2_failAt;
    function liteFn_m2_expectSymbol(lite_source: string, lite_position: bigint, lite_symbol: string, lite_prefix: string): bigint {
        void lite_source;
        void lite_position;
        void lite_symbol;
        void lite_prefix;
        if (((((lite_position) >= (lite$textLength(lite_source)))) || (((lite$textAt(lite_source, lite_position, 10558)) !== (lite_symbol))))) {
            liteFn_m2_failAt(lite_source, lite_position, lite_prefix, (("expected ") + (lite_symbol)));
        }
        return lite$addInt(lite_position, 1n, 10679);
    }
    void liteFn_m2_expectSymbol;
    function liteFn_m2_rawFenceLength(lite_source: string, lite_position: bigint): bigint {
        void lite_source;
        void lite_position;
        if ((!(liteFn_m3_startsWithAt(lite_source, lite_position, "/*")))) {
            return 0n;
        }
        let lite_m2_index = lite$addInt(lite_position, 2n, 10941);
        void lite_m2_index;
        let lite_m2_count = 0n;
        void lite_m2_count;
        while (((((lite_m2_index) < (lite$textLength(lite_source)))) && (((lite$textAt(lite_source, lite_m2_index, 11006)) === ("#"))))) {
            lite_m2_count = lite$addInt(lite_m2_count, 1n, 11059);
            lite_m2_index = lite$addInt(lite_m2_index, 1n, 11086);
        }
        return lite_m2_count;
    }
    void liteFn_m2_rawFenceLength;
    function liteFn_m2_skipRawComment(lite_source: string, lite_position: bigint, lite_fence: bigint, lite_prefix: string): bigint {
        void lite_source;
        void lite_position;
        void lite_fence;
        void lite_prefix;
        const lite_m2_size = lite$textLength(lite_source);
        void lite_m2_size;
        let lite_m2_cursor = lite$addInt(lite$addInt(lite_position, 2n, 11390), lite_fence, 11394);
        void lite_m2_cursor;
        while (((lite_m2_cursor) < (lite_m2_size))) {
            if (((lite$textAt(lite_source, lite_m2_cursor, 11439)) === ("#"))) {
                const lite_m2_runStart = lite_m2_cursor;
                void lite_m2_runStart;
                let lite_m2_runEnd = lite_m2_cursor;
                void lite_m2_runEnd;
                while (((((lite_m2_runEnd) < (lite_m2_size))) && (((lite$textAt(lite_source, lite_m2_runEnd, 11572)) === ("#"))))) {
                    lite_m2_runEnd = lite$addInt(lite_m2_runEnd, 1n, 11620);
                }
                if (((((lite$subtractInt(lite_m2_runEnd, lite_m2_runStart, 11649)) === (lite_fence))) && (liteFn_m3_startsWithAt(lite_source, lite_m2_runEnd, "*/")))) {
                    return lite$addInt(lite_m2_runEnd, 2n, 11748);
                }
                lite_m2_cursor = lite_m2_runEnd;
            } else {
                lite_m2_cursor = lite$addInt(lite_m2_cursor, 1n, 11841);
            }
        }
        liteFn_m2_failAt(lite_source, lite_position, lite_prefix, "unterminated raw comment");
        return lite_m2_size;
    }
    void liteFn_m2_skipRawComment;
    function liteFn_m2_skipComment(lite_source: string, lite_position: bigint, lite_prefix: string): bigint {
        void lite_source;
        void lite_position;
        void lite_prefix;
        const lite_m2_size = lite$textLength(lite_source);
        void lite_m2_size;
        const lite_m2_fence = liteFn_m2_rawFenceLength(lite_source, lite_position);
        void lite_m2_fence;
        if (((lite_m2_fence) > (0n))) {
            return liteFn_m2_skipRawComment(lite_source, lite_position, lite_m2_fence, lite_prefix);
        }
        let lite_m2_cursor = lite$addInt(lite_position, 2n, 12304);
        void lite_m2_cursor;
        let lite_m2_depth = 1n;
        void lite_m2_depth;
        while (Boolean(true)) {
            if (((lite_m2_cursor) >= (lite_m2_size))) {
                liteFn_m2_failAt(lite_source, lite_position, lite_prefix, "unterminated comment");
            }
            if (liteFn_m3_startsWithAt(lite_source, lite_m2_cursor, "/*")) {
                const lite_m2_innerFence = liteFn_m2_rawFenceLength(lite_source, lite_m2_cursor);
                void lite_m2_innerFence;
                if (((lite_m2_innerFence) > (0n))) {
                    lite_m2_cursor = liteFn_m2_skipRawComment(lite_source, lite_m2_cursor, lite_m2_innerFence, lite_prefix);
                } else {
                    lite_m2_depth = lite$addInt(lite_m2_depth, 1n, 12727);
                    lite_m2_cursor = lite$addInt(lite_m2_cursor, 2n, 12764);
                }
            } else if (liteFn_m3_startsWithAt(lite_source, lite_m2_cursor, "*/")) {
                lite_m2_depth = lite$subtractInt(lite_m2_depth, 1n, 12872);
                lite_m2_cursor = lite$addInt(lite_m2_cursor, 2n, 12905);
                if (((lite_m2_depth) === (0n))) {
                    return lite_m2_cursor;
                }
            } else {
                lite_m2_cursor = lite$addInt(lite_m2_cursor, 1n, 13000);
            }
        }
        return lite_m2_size;
    }
    void liteFn_m2_skipComment;
    function liteFn_m2_skipTrivia(lite_source: string, lite_start: bigint, lite_prefix: string): bigint {
        void lite_source;
        void lite_start;
        void lite_prefix;
        const lite_m2_size = lite$textLength(lite_source);
        void lite_m2_size;
        let lite_m2_position = lite_start;
        void lite_m2_position;
        while (((lite_m2_position) < (lite_m2_size))) {
            const lite_m2_ch = lite$textAt(lite_source, lite_m2_position, 13342);
            void lite_m2_ch;
            if (((((((((lite_m2_ch) === (" "))) || (((lite_m2_ch) === ("\t"))))) || (((lite_m2_ch) === ("\r"))))) || (((lite_m2_ch) === ("\n"))))) {
                lite_m2_position = lite$addInt(lite_m2_position, 1n, 13465);
            } else if (liteFn_m3_startsWithAt(lite_source, lite_m2_position, "/*")) {
                lite_m2_position = liteFn_m2_skipComment(lite_source, lite_m2_position, lite_prefix);
            } else {
                break;
            }
        }
        return lite_m2_position;
    }
    void liteFn_m2_skipTrivia;
    function liteFn_m2_consumeStatementEnd(lite_source: string, lite_position: bigint, lite_prefix: string): bigint {
        void lite_source;
        void lite_position;
        void lite_prefix;
        const lite_m2_next = liteFn_m2_skipTrivia(lite_source, lite_position, lite_prefix);
        void lite_m2_next;
        if (((((lite_m2_next) < (lite$textLength(lite_source)))) && (((lite$textAt(lite_source, lite_m2_next, 14012)) === (";"))))) {
            return liteFn_m2_skipTrivia(lite_source, lite$addInt(lite_m2_next, 1n, 14073), lite_prefix);
        }
        if (((((((lite_m2_next) === (lite$textLength(lite_source)))) || (((lite$textAt(lite_source, lite_m2_next, 14126)) === ("}"))))) || ((((((lite_position) > (0n))) && (((lite$textAt(lite_source, lite$subtractInt(lite_position, 1n, 14207), 14183)) === ("}")))))))) {
            return lite_m2_next;
        }
        return (-1n);
    }
    void liteFn_m2_consumeStatementEnd;
    function liteFn_m2_isReservedWord(lite_name: string): boolean {
        void lite_name;
        return ((((((((((((((((((((((((((((((((((((((((((((lite_name) === ("pub"))) || (((lite_name) === ("var"))))) || (((lite_name) === ("mut"))))) || (((lite_name) === ("fn"))))) || (((lite_name) === ("loop"))))) || (((lite_name) === ("break"))))) || (((lite_name) === ("continue"))))) || (((lite_name) === ("return"))))) || (((lite_name) === ("if"))))) || (((lite_name) === ("else"))))) || (((lite_name) === ("then"))))) || (((lite_name) === ("finally"))))) || (((lite_name) === ("match"))))) || (((lite_name) === ("import"))))) || (((lite_name) === ("using"))))) || (((lite_name) === ("record"))))) || (((lite_name) === ("type"))))) || (((lite_name) === ("and"))))) || (((lite_name) === ("or"))))) || (((lite_name) === ("not"))))) || (((lite_name) === ("true"))))) || (((lite_name) === ("false"))));
    }
    void liteFn_m2_isReservedWord;
    function liteFn_m2_featureDoc(lite_name: string): string {
        void lite_name;
        return (Boolean(((lite_name) === ("loop"))) ? "docs/loops.md" : (Boolean(((((((((((((((lite_name) === ("if"))) || (((lite_name) === ("else"))))) || (((lite_name) === ("and"))))) || (((lite_name) === ("or"))))) || (((lite_name) === ("not"))))) || (((lite_name) === ("true"))))) || (((lite_name) === ("false"))))) ? "docs/conditionals.md" : (Boolean(((((lite_name) === ("var"))) || (((lite_name) === ("mut"))))) ? "docs/declarations-and-assignment.md" : (Boolean(((((lite_name) === ("fn"))) || (((lite_name) === ("return"))))) ? "docs/functions.md" : (Boolean(((lite_name) === ("match"))) ? "docs/match.md" : (Boolean(((lite_name) === ("pub"))) ? "docs/modules-and-packages.md" : (Boolean(((((lite_name) === ("import"))) || (((lite_name) === ("using"))))) ? "docs/modules-and-packages.md" : (Boolean(((((lite_name) === ("record"))) || (((lite_name) === ("type"))))) ? "docs/types-and-inference.md" : (Boolean(((((lite_name) === ("break"))) || (((lite_name) === ("continue"))))) ? "docs/control-flow.md" : (Boolean(((((lite_name) === ("then"))) || (((lite_name) === ("finally"))))) ? "docs/finally.md" : "docs/grammar-sketch.md"))))))))));
    }
    void liteFn_m2_featureDoc;
    function liteFn_m2_unsupportedFeature(lite_source: string, lite_position: bigint, lite_name: string, lite_prefix: string): void {
        void lite_source;
        void lite_position;
        void lite_name;
        void lite_prefix;
        return (void (liteFn_m2_failAt(lite_source, lite_position, lite_prefix, (((((((("unsupported feature \"") + (lite_name))) + ("\": see "))) + (liteFn_m2_featureDoc(lite_name)))) + ("; the restricted compiler accepts Int/Float/String/Bool expressions, locals, output/outputLine, if/else and loop only")))));
    }
    void liteFn_m2_unsupportedFeature;
    function liteFn_m2_findFunction(lite_functions: { name: string; runtime: string; result: string; first: bigint; count: bigint }[], lite_name: string): bigint {
        void lite_functions;
        void lite_name;
        let lite_m2_index = 0n;
        void lite_m2_index;
        for (const lite_m2_entry of [...(lite_functions)]) {
            void lite_m2_entry;
            if ((((lite_m2_entry).name) === (lite_name))) {
                return lite_m2_index;
            }
            lite_m2_index = lite$addInt(lite_m2_index, 1n, 16458);
        }
        return (-1n);
    }
    void liteFn_m2_findFunction;
    function liteFn_m2_isUnsupportedAliasTarget(lite_name: string): boolean {
        void lite_name;
        return ((((((((((((((((lite_name) === ("List"))) || (((lite_name) === ("Float"))))) || (((lite_name) === ("Double"))))) || (((lite_name) === ("Array"))))) || (((lite_name) === ("Option"))))) || (((lite_name) === ("Result"))))) || (((lite_name) === ("record"))))) || (((lite_name) === ("fn"))));
    }
    void liteFn_m2_isUnsupportedAliasTarget;
    function liteFn_m2_unsupportedAliasTarget(lite_source: string, lite_position: bigint, lite_prefix: string, lite_target: string): void {
        void lite_source;
        void lite_position;
        void lite_prefix;
        void lite_target;
        return (void (liteFn_m2_failAt(lite_source, lite_position, lite_prefix, (((("unsupported type alias ") + (lite_target))) + ("; only Int, Float, String, Bool, Unit, List<T>, flat named tuples and aliases are supported")))));
    }
    void liteFn_m2_unsupportedAliasTarget;
    function liteFn_m2_findAlias(lite_aliases: { name: string; target: string; at: bigint; end: bigint }[], lite_name: string): bigint {
        void lite_aliases;
        void lite_name;
        let lite_m2_index = 0n;
        void lite_m2_index;
        for (const lite_m2_alias of [...(lite_aliases)]) {
            void lite_m2_alias;
            if ((((lite_m2_alias).name) === (lite_name))) {
                return lite_m2_index;
            }
            lite_m2_index = lite$addInt(lite_m2_index, 1n, 17464);
        }
        return (-1n);
    }
    void liteFn_m2_findAlias;
    function liteFn_m2_typeNameAt(lite_source: string, lite_position: bigint, lite_prefix: string): { name: string; next: bigint } {
        void lite_source;
        void lite_position;
        void lite_prefix;
        const lite_m2_firstEnd = liteFn_m3_skipName(lite_source, lite_position);
        void lite_m2_firstEnd;
        const lite_m2_first = lite$textSlice(lite_source, lite_position, lite_m2_firstEnd, 17697);
        void lite_m2_first;
        const lite_m2_afterFirst = liteFn_m2_skipTrivia(lite_source, lite_m2_firstEnd, lite_prefix);
        void lite_m2_afterFirst;
        if (((((lite_m2_afterFirst) < (lite$textLength(lite_source)))) && (((lite$textAt(lite_source, lite_m2_afterFirst, 17835)) === ("."))))) {
            const lite_m2_memberStart = liteFn_m2_skipTrivia(lite_source, lite$addInt(lite_m2_afterFirst, 1n, 17924), lite_prefix);
            void lite_m2_memberStart;
            if (((((lite_m2_memberStart) >= (lite$textLength(lite_source)))) || ((!(liteFn_m3_isNameStart(lite$textAt(lite_source, lite_m2_memberStart, 18010))))))) {
                liteFn_m2_failAt(lite_source, lite_m2_memberStart, lite_prefix, "expected a type name after .");
            }
            const lite_m2_memberEnd = liteFn_m3_skipName(lite_source, lite_m2_memberStart);
            void lite_m2_memberEnd;
            const lite_m2_member = lite$textSlice(lite_source, lite_m2_memberStart, lite_m2_memberEnd, 18210);
            void lite_m2_member;
            return { name: ((((lite_m2_first) + ("."))) + (lite_m2_member)), next: lite_m2_memberEnd };
        }
        return { name: lite_m2_first, next: lite_m2_firstEnd };
    }
    void liteFn_m2_typeNameAt;
    function liteFn_m2_aliasIndexAt(lite_aliases: { name: string; target: string; at: bigint; end: bigint }[], lite_position: bigint): bigint {
        void lite_aliases;
        void lite_position;
        let lite_m2_index = 0n;
        void lite_m2_index;
        for (const lite_m2_alias of [...(lite_aliases)]) {
            void lite_m2_alias;
            if ((((lite_m2_alias).at) === (lite_position))) {
                return lite_m2_index;
            }
            lite_m2_index = lite$addInt(lite_m2_index, 1n, 18630);
        }
        return (-1n);
    }
    void liteFn_m2_aliasIndexAt;
    function liteFn_m2_isTupleKind(lite_kind: string): boolean {
        void lite_kind;
        return ((((lite$textLength(lite_kind)) > (0n))) && (((lite$textAt(lite_kind, 0n, 18835)) === ("("))));
    }
    void liteFn_m2_isTupleKind;
    function liteFn_m2_isListKind(lite_kind: string): boolean {
        void lite_kind;
        return ((((((lite$textLength(lite_kind)) > (5n))) && (liteFn_m3_startsWithAt(lite_kind, 0n, "List<")))) && (((lite$textAt(lite_kind, lite$subtractInt(lite$textLength(lite_kind), 1n, 19112), 19082)) === (">"))));
    }
    void liteFn_m2_isListKind;
    function liteFn_m2_listElementKind(lite_kind: string): string {
        void lite_kind;
        if ((!(liteFn_m2_isListKind(lite_kind)))) {
            return "";
        }
        return lite$textSlice(lite_kind, 5n, lite$subtractInt(lite$textLength(lite_kind), 1n, 19328), 19292);
    }
    void liteFn_m2_listElementKind;
    function liteFn_m2_codeUsesTextCall(lite_code: string, lite_needle: string): boolean {
        void lite_code;
        void lite_needle;
        const lite_m2_size = lite$textLength(lite_code);
        void lite_m2_size;
        let lite_m2_cursor = 0n;
        void lite_m2_cursor;
        while (((lite_m2_cursor) < (lite_m2_size))) {
            const lite_m2_ch = lite$textAt(lite_code, lite_m2_cursor, 19575);
            void lite_m2_ch;
            if (((lite_m2_ch) === ("\""))) {
                lite_m2_cursor = lite$addInt(lite_m2_cursor, 1n, 19649);
                while (((lite_m2_cursor) < (lite_m2_size))) {
                    const lite_m2_escaped = lite$textAt(lite_code, lite_m2_cursor, 19714);
                    void lite_m2_escaped;
                    if (((lite_m2_escaped) === ("\\"))) {
                        lite_m2_cursor = lite$addInt(lite_m2_cursor, 2n, 19809);
                    } else if (((lite_m2_escaped) === ("\""))) {
                        lite_m2_cursor = lite$addInt(lite_m2_cursor, 1n, 19894);
                        break;
                    } else {
                        lite_m2_cursor = lite$addInt(lite_m2_cursor, 1n, 19987);
                    }
                }
            } else if (liteFn_m3_startsWithAt(lite_code, lite_m2_cursor, lite_needle)) {
                return true;
            } else {
                lite_m2_cursor = lite$addInt(lite_m2_cursor, 1n, 20157);
            }
        }
        return false;
    }
    void liteFn_m2_codeUsesTextCall;
    function liteFn_m2_codeUsesListIndex(lite_code: string): boolean {
        void lite_code;
        return liteFn_m2_codeUsesTextCall(lite_code, "lite$listAt(");
    }
    void liteFn_m2_codeUsesListIndex;
    function liteFn_m2_codeUsesListPop(lite_code: string): boolean {
        void lite_code;
        return liteFn_m2_codeUsesTextCall(lite_code, "lite$listPopBack(");
    }
    void liteFn_m2_codeUsesListPop;
    function liteFn_m2_codeUsesValueIf(lite_code: string): boolean {
        void lite_code;
        return liteFn_m2_codeUsesTextCall(lite_code, "Boolean(");
    }
    void liteFn_m2_codeUsesValueIf;
    function liteFn_m2_tupleFieldKind(lite_kind: string, lite_label: string): string {
        void lite_kind;
        void lite_label;
        const lite_m2_size = lite$textLength(lite_kind);
        void lite_m2_size;
        let lite_m2_cursor = 1n;
        void lite_m2_cursor;
        while (((((lite_m2_cursor) < (lite_m2_size))) && (((lite$textAt(lite_kind, lite_m2_cursor, 21061)) !== (")"))))) {
            const lite_m2_nameStart = lite_m2_cursor;
            void lite_m2_nameStart;
            lite_m2_cursor = liteFn_m3_skipName(lite_kind, lite_m2_cursor);
            const lite_m2_fieldName = lite$textSlice(lite_kind, lite_m2_nameStart, lite_m2_cursor, 21191);
            void lite_m2_fieldName;
            if (((((lite_m2_cursor) < (lite_m2_size))) && (((lite$textAt(lite_kind, lite_m2_cursor, 21256)) === (":"))))) {
                lite_m2_cursor = lite$addInt(lite_m2_cursor, 1n, 21302);
            }
            const lite_m2_typeStart = lite_m2_cursor;
            void lite_m2_typeStart;
            lite_m2_cursor = liteFn_m3_skipName(lite_kind, lite_m2_cursor);
            const lite_m2_fieldKind = lite$textSlice(lite_kind, lite_m2_typeStart, lite_m2_cursor, 21408);
            void lite_m2_fieldKind;
            if (((lite_m2_fieldName) === (lite_label))) {
                return lite_m2_fieldKind;
            }
            if (((((lite_m2_cursor) < (lite_m2_size))) && (((lite$textAt(lite_kind, lite_m2_cursor, 21525)) === (","))))) {
                lite_m2_cursor = lite$addInt(lite_m2_cursor, 1n, 21571);
            }
        }
        return "";
    }
    void liteFn_m2_tupleFieldKind;
    function liteFn_m2_displayKind(lite_kind: string): string {
        void lite_kind;
        if (liteFn_m2_isListKind(lite_kind)) {
            return (((("List<") + (liteFn_m2_displayKind(liteFn_m2_listElementKind(lite_kind))))) + (">"));
        }
        if ((!(liteFn_m2_isTupleKind(lite_kind)))) {
            return lite_kind;
        }
        const lite_m2_size = lite$textLength(lite_kind);
        void lite_m2_size;
        let lite_m2_cursor = 1n;
        void lite_m2_cursor;
        let lite_m2_result = "(";
        void lite_m2_result;
        let lite_m2_count = 0n;
        void lite_m2_count;
        while (((((lite_m2_cursor) < (lite_m2_size))) && (((lite$textAt(lite_kind, lite_m2_cursor, 21991)) !== (")"))))) {
            const lite_m2_nameStart = lite_m2_cursor;
            void lite_m2_nameStart;
            lite_m2_cursor = liteFn_m3_skipName(lite_kind, lite_m2_cursor);
            const lite_m2_fieldName = lite$textSlice(lite_kind, lite_m2_nameStart, lite_m2_cursor, 22121);
            void lite_m2_fieldName;
            if (((((lite_m2_cursor) < (lite_m2_size))) && (((lite$textAt(lite_kind, lite_m2_cursor, 22186)) === (":"))))) {
                lite_m2_cursor = lite$addInt(lite_m2_cursor, 1n, 22232);
            }
            const lite_m2_typeStart = lite_m2_cursor;
            void lite_m2_typeStart;
            lite_m2_cursor = liteFn_m3_skipName(lite_kind, lite_m2_cursor);
            const lite_m2_fieldKind = lite$textSlice(lite_kind, lite_m2_typeStart, lite_m2_cursor, 22338);
            void lite_m2_fieldKind;
            if (((lite_m2_count) > (0n))) {
                lite_m2_result = ((lite_m2_result) + (", "));
            }
            lite_m2_result = ((((((lite_m2_result) + (lite_m2_fieldName))) + (": "))) + (liteFn_m2_displayKind(lite_m2_fieldKind)));
            lite_m2_count = lite$addInt(lite_m2_count, 1n, 22514);
            if (((((lite_m2_cursor) < (lite_m2_size))) && (((lite$textAt(lite_kind, lite_m2_cursor, 22548)) === (","))))) {
                lite_m2_cursor = lite$addInt(lite_m2_cursor, 1n, 22594);
            }
        }
        return ((lite_m2_result) + (")"));
    }
    void liteFn_m2_displayKind;
    function liteFn_m2_resolveTypeText(lite_source: string, lite_position: bigint, lite_prefix: string, lite_aliases: { name: string; target: string; at: bigint; end: bigint }[], lite_text: string, lite_seen: string[]): string {
        void lite_source;
        void lite_position;
        void lite_prefix;
        void lite_aliases;
        void lite_text;
        void lite_seen;
        const lite_m2_size = lite$textLength(lite_text);
        void lite_m2_size;
        let lite_m2_cursor = liteFn_m2_skipTrivia(lite_text, 0n, lite_prefix);
        void lite_m2_cursor;
        if (((((lite_m2_cursor) < (lite_m2_size))) && (((lite$textAt(lite_text, lite_m2_cursor, 23032)) === ("("))))) {
            lite_m2_cursor = liteFn_m2_skipTrivia(lite_text, lite$addInt(lite_m2_cursor, 1n, 23103), lite_prefix);
            const lite_m2_labels: string[] = [...([])];
            void lite_m2_labels;
            let lite_m2_kindText = "(";
            void lite_m2_kindText;
            let lite_m2_count = 0n;
            void lite_m2_count;
            while (Boolean(true)) {
                if (((lite_m2_cursor) >= (lite_m2_size))) {
                    liteFn_m2_failAt(lite_source, lite_position, lite_prefix, "expected ) in tuple type");
                }
                if (((lite$textAt(lite_text, lite_m2_cursor, 23340)) === (")"))) {
                    lite_m2_cursor = lite$addInt(lite_m2_cursor, 1n, 23402);
                    break;
                }
                if ((!(liteFn_m3_isNameStart(lite$textAt(lite_text, lite_m2_cursor, 23483))))) {
                    liteFn_m2_failAt(lite_source, lite_position, lite_prefix, "expected a tuple field name");
                }
                const lite_m2_labelStart = lite_m2_cursor;
                void lite_m2_labelStart;
                lite_m2_cursor = liteFn_m3_skipName(lite_text, lite_m2_cursor);
                const lite_m2_label = lite$textSlice(lite_text, lite_m2_labelStart, lite_m2_cursor, 23710);
                void lite_m2_label;
                if (liteFn_m6_listContainsText([...(lite_m2_labels)], lite_m2_label)) {
                    liteFn_m2_failAt(lite_source, lite_position, lite_prefix, (("duplicate tuple field ") + (lite_m2_label)));
                }
                lite_m2_labels.push(lite_m2_label);
                lite_m2_cursor = liteFn_m2_skipTrivia(lite_text, lite_m2_cursor, lite_prefix);
                if (((((lite_m2_cursor) >= (lite_m2_size))) || (((lite$textAt(lite_text, lite_m2_cursor, 24032)) !== (":"))))) {
                    liteFn_m2_failAt(lite_source, lite_position, lite_prefix, (("expected : after tuple field ") + (lite_m2_label)));
                }
                lite_m2_cursor = liteFn_m2_skipTrivia(lite_text, lite$addInt(lite_m2_cursor, 1n, 24213), lite_prefix);
                if (((((lite_m2_cursor) < (lite_m2_size))) && (((lite$textAt(lite_text, lite_m2_cursor, 24260)) === ("("))))) {
                    liteFn_m2_failAt(lite_source, lite_position, lite_prefix, "nested tuple types are not supported");
                }
                if (((((lite_m2_cursor) >= (lite_m2_size))) || ((!(liteFn_m3_isNameStart(lite$textAt(lite_text, lite_m2_cursor, 24451))))))) {
                    liteFn_m2_failAt(lite_source, lite_position, lite_prefix, "expected a tuple field type");
                }
                const lite_m2_componentStart = lite_m2_cursor;
                void lite_m2_componentStart;
                lite_m2_cursor = liteFn_m3_skipName(lite_text, lite_m2_cursor);
                const lite_m2_componentName = lite$textSlice(lite_text, lite_m2_componentStart, lite_m2_cursor, 24690);
                void lite_m2_componentName;
                const lite_m2_componentKind = liteFn_m2_resolveTypeText(lite_source, lite_position, lite_prefix, [...(lite_aliases)], lite_m2_componentName, [...(lite_seen)]);
                void lite_m2_componentKind;
                if (liteFn_m2_isTupleKind(lite_m2_componentKind)) {
                    liteFn_m2_failAt(lite_source, lite_position, lite_prefix, "nested tuple types are not supported");
                }
                if (liteFn_m2_isListKind(lite_m2_componentKind)) {
                    liteFn_m2_failAt(lite_source, lite_position, lite_prefix, "list types inside tuples are not supported");
                }
                if (((lite_m2_componentKind) === ("Unit"))) {
                    liteFn_m2_failAt(lite_source, lite_position, lite_prefix, "unsupported tuple component type Unit");
                }
                if (((lite_m2_count) > (0n))) {
                    lite_m2_kindText = ((lite_m2_kindText) + (","));
                }
                lite_m2_kindText = ((((((lite_m2_kindText) + (lite_m2_label))) + (":"))) + (lite_m2_componentKind));
                lite_m2_count = lite$addInt(lite_m2_count, 1n, 25425);
                lite_m2_cursor = liteFn_m2_skipTrivia(lite_text, lite_m2_cursor, lite_prefix);
                if (((((lite_m2_cursor) < (lite_m2_size))) && (((lite$textAt(lite_text, lite_m2_cursor, 25518)) === (","))))) {
                    lite_m2_cursor = liteFn_m2_skipTrivia(lite_text, lite$addInt(lite_m2_cursor, 1n, 25597), lite_prefix);
                }
            }
            if (((lite_m2_count) === (0n))) {
                liteFn_m2_failAt(lite_source, lite_position, lite_prefix, "tuple type needs at least one field");
            }
            lite_m2_cursor = liteFn_m2_skipTrivia(lite_text, lite_m2_cursor, lite_prefix);
            if (((lite_m2_cursor) < (lite_m2_size))) {
                liteFn_m2_failAt(lite_source, lite_position, lite_prefix, "unexpected text after tuple type");
            }
            return ((lite_m2_kindText) + (")"));
        }
        const lite_m2_parsedName = liteFn_m2_typeNameAt(lite_text, lite_m2_cursor, lite_prefix);
        void lite_m2_parsedName;
        const lite_m2_after = (lite_m2_parsedName).next;
        void lite_m2_after;
        const lite_m2_name = (lite_m2_parsedName).name;
        void lite_m2_name;
        const lite_m2_afterTrivia = liteFn_m2_skipTrivia(lite_text, lite_m2_after, lite_prefix);
        void lite_m2_afterTrivia;
        if (((((((lite_m2_name) === ("List"))) && (((lite_m2_afterTrivia) < (lite_m2_size))))) && (((lite$textAt(lite_text, lite_m2_afterTrivia, 26173)) === ("<"))))) {
            const lite_m2_innerStart = liteFn_m2_skipTrivia(lite_text, lite$addInt(lite_m2_afterTrivia, 1n, 26259), lite_prefix);
            void lite_m2_innerStart;
            if (((((lite_m2_innerStart) >= (lite_m2_size))) || (((lite$textAt(lite_text, lite_m2_innerStart, 26306)) === (">"))))) {
                liteFn_m2_failAt(lite_source, lite_position, lite_prefix, "expected a list element type");
            }
            let lite_m2_scan = lite_m2_innerStart;
            void lite_m2_scan;
            let lite_m2_depth = 0n;
            void lite_m2_depth;
            let lite_m2_close = (-1n);
            void lite_m2_close;
            while (((lite_m2_scan) < (lite_m2_size))) {
                const lite_m2_ch = lite$textAt(lite_text, lite_m2_scan, 26554);
                void lite_m2_ch;
                if (((lite_m2_ch) === ("<"))) {
                    lite_m2_depth = lite$addInt(lite_m2_depth, 1n, 26631);
                } else if (((lite_m2_ch) === (">"))) {
                    if (((lite_m2_depth) === (0n))) {
                        lite_m2_close = lite_m2_scan;
                        break;
                    }
                    lite_m2_depth = lite$subtractInt(lite_m2_depth, 1n, 26811);
                }
                lite_m2_scan = lite$addInt(lite_m2_scan, 1n, 26854);
            }
            if (((lite_m2_close) < (0n))) {
                liteFn_m2_failAt(lite_source, lite_position, lite_prefix, "expected > in list type");
            }
            const lite_m2_innerText = lite$textSlice(lite_text, lite_m2_innerStart, lite_m2_close, 26996);
            void lite_m2_innerText;
            const lite_m2_innerKind = liteFn_m2_resolveTypeText(lite_source, lite_position, lite_prefix, [...(lite_aliases)], lite_m2_innerText, [...(lite_seen)]);
            void lite_m2_innerKind;
            if (liteFn_m2_isListKind(lite_m2_innerKind)) {
                liteFn_m2_failAt(lite_source, lite_position, lite_prefix, "nested list types are not supported");
            }
            if (((lite_m2_innerKind) === ("Unit"))) {
                liteFn_m2_failAt(lite_source, lite_position, lite_prefix, "unsupported list element type Unit");
            }
            const lite_m2_afterList = liteFn_m2_skipTrivia(lite_text, lite$addInt(lite_m2_close, 1n, 27423), lite_prefix);
            void lite_m2_afterList;
            if (((lite_m2_afterList) < (lite_m2_size))) {
                liteFn_m2_failAt(lite_source, lite_position, lite_prefix, "unexpected text after list type");
            }
            return (((("List<") + (lite_m2_innerKind))) + (">"));
        }
        if (((lite_m2_afterTrivia) < (lite_m2_size))) {
            liteFn_m2_failAt(lite_source, lite_position, lite_prefix, (("unexpected text after type ") + (lite_m2_name)));
        }
        if (((((((((((lite_m2_name) === ("Int"))) || (((lite_m2_name) === ("Float"))))) || (((lite_m2_name) === ("String"))))) || (((lite_m2_name) === ("Bool"))))) || (((lite_m2_name) === ("Unit"))))) {
            return lite_m2_name;
        }
        const lite_m2_numericKind = liteFn_m9_numericAliasKind(lite_m2_name);
        void lite_m2_numericKind;
        if (((lite_m2_numericKind) !== (""))) {
            return lite_m2_numericKind;
        }
        if (liteFn_m2_isUnsupportedAliasTarget(lite_m2_name)) {
            liteFn_m2_unsupportedAliasTarget(lite_source, lite_position, lite_prefix, lite_m2_name);
            return "";
        }
        const lite_m2_index = liteFn_m2_findAlias([...(lite_aliases)], lite_m2_name);
        void lite_m2_index;
        if (((lite_m2_index) < (0n))) {
            liteFn_m2_failAt(lite_source, lite_position, lite_prefix, (("unknown type alias ") + (lite_m2_name)));
            return "";
        }
        const lite_m2_alias = lite$listAt((lite_aliases), lite_m2_index, 28239);
        void lite_m2_alias;
        if (liteFn_m6_listContainsText([...(lite_seen)], lite_m2_name)) {
            liteFn_m2_failAt(lite_source, (lite_m2_alias).at, lite_prefix, (("recursive type alias ") + (lite_m2_name)));
            return "";
        }
        if ((((lite_m2_alias).target) === (""))) {
            liteFn_m2_unsupportedAliasTarget(lite_source, (lite_m2_alias).at, lite_prefix, "target");
            return "";
        }
        const lite_m2_nextSeen: string[] = [...(lite_seen)];
        void lite_m2_nextSeen;
        lite_m2_nextSeen.push(lite_m2_name);
        return liteFn_m2_resolveTypeText(lite_source, (lite_m2_alias).at, lite_prefix, [...(lite_aliases)], (lite_m2_alias).target, [...(lite_m2_nextSeen)]);
    }
    void liteFn_m2_resolveTypeText;
    function liteFn_m2_resolveAliasKind(lite_source: string, lite_position: bigint, lite_prefix: string, lite_aliases: { name: string; target: string; at: bigint; end: bigint }[], lite_name: string, lite_seen: string[]): string {
        void lite_source;
        void lite_position;
        void lite_prefix;
        void lite_aliases;
        void lite_name;
        void lite_seen;
        return liteFn_m2_resolveTypeText(lite_source, lite_position, lite_prefix, [...(lite_aliases)], lite_name, [...(lite_seen)]);
    }
    void liteFn_m2_resolveAliasKind;
    function liteFn_m2_parseTupleTypeAt(lite_source: string, lite_position: bigint, lite_prefix: string, lite_aliases: { name: string; target: string; at: bigint; end: bigint }[]): { kind: string; next: bigint } {
        void lite_source;
        void lite_position;
        void lite_prefix;
        void lite_aliases;
        const lite_m2_size = lite$textLength(lite_source);
        void lite_m2_size;
        let lite_m2_cursor = liteFn_m2_skipTrivia(lite_source, lite_position, lite_prefix);
        void lite_m2_cursor;
        lite_m2_cursor = liteFn_m2_expectSymbol(lite_source, lite_m2_cursor, "(", lite_prefix);
        lite_m2_cursor = liteFn_m2_skipTrivia(lite_source, lite_m2_cursor, lite_prefix);
        const lite_m2_labels: string[] = [...([])];
        void lite_m2_labels;
        let lite_m2_kindText = "(";
        void lite_m2_kindText;
        let lite_m2_count = 0n;
        void lite_m2_count;
        while (Boolean(true)) {
            if (((lite_m2_cursor) >= (lite_m2_size))) {
                liteFn_m2_failAt(lite_source, lite_m2_cursor, lite_prefix, "expected ) in tuple type");
            }
            if (((lite$textAt(lite_source, lite_m2_cursor, 29600)) === (")"))) {
                lite_m2_cursor = lite$addInt(lite_m2_cursor, 1n, 29660);
                break;
            }
            if ((!(liteFn_m3_isNameStart(lite$textAt(lite_source, lite_m2_cursor, 29729))))) {
                liteFn_m2_failAt(lite_source, lite_m2_cursor, lite_prefix, "expected a tuple field name");
            }
            const lite_m2_labelStart = lite_m2_cursor;
            void lite_m2_labelStart;
            lite_m2_cursor = liteFn_m3_skipName(lite_source, lite_m2_cursor);
            const lite_m2_label = lite$textSlice(lite_source, lite_m2_labelStart, lite_m2_cursor, 29938);
            void lite_m2_label;
            if (liteFn_m2_isReservedWord(lite_m2_label)) {
                liteFn_m2_unsupportedFeature(lite_source, lite_m2_labelStart, lite_m2_label, lite_prefix);
            }
            if (liteFn_m6_listContainsText([...(lite_m2_labels)], lite_m2_label)) {
                liteFn_m2_failAt(lite_source, lite_m2_labelStart, lite_prefix, (("duplicate tuple field ") + (lite_m2_label)));
            }
            lite_m2_labels.push(lite_m2_label);
            lite_m2_cursor = liteFn_m2_skipTrivia(lite_source, lite_m2_cursor, lite_prefix);
            if (((((lite_m2_cursor) >= (lite_m2_size))) || (((lite$textAt(lite_source, lite_m2_cursor, 30334)) !== (":"))))) {
                liteFn_m2_failAt(lite_source, lite_m2_cursor, lite_prefix, (("expected : after tuple field ") + (lite_m2_label)));
            }
            lite_m2_cursor = liteFn_m2_skipTrivia(lite_source, lite$addInt(lite_m2_cursor, 1n, 30505), lite_prefix);
            if (((((lite_m2_cursor) < (lite_m2_size))) && (((lite$textAt(lite_source, lite_m2_cursor, 30548)) === ("("))))) {
                liteFn_m2_failAt(lite_source, lite_m2_cursor, lite_prefix, "nested tuple types are not supported");
            }
            if (((((lite_m2_cursor) >= (lite_m2_size))) || ((!(liteFn_m3_isNameStart(lite$textAt(lite_source, lite_m2_cursor, 30727))))))) {
                liteFn_m2_failAt(lite_source, lite_m2_cursor, lite_prefix, "expected a tuple field type");
            }
            const lite_m2_componentStart = lite_m2_cursor;
            void lite_m2_componentStart;
            const lite_m2_parsedComponent = liteFn_m2_typeNameAt(lite_source, lite_m2_cursor, lite_prefix);
            void lite_m2_parsedComponent;
            lite_m2_cursor = (lite_m2_parsedComponent).next;
            const lite_m2_componentName = (lite_m2_parsedComponent).name;
            void lite_m2_componentName;
            let lite_m2_componentKind = "";
            void lite_m2_componentKind;
            if (((((((((((lite_m2_componentName) === ("Int"))) || (((lite_m2_componentName) === ("Float"))))) || (((lite_m2_componentName) === ("String"))))) || (((lite_m2_componentName) === ("Bool"))))) || (((lite_m2_componentName) === ("Unit"))))) {
                lite_m2_componentKind = lite_m2_componentName;
            } else {
                lite_m2_componentKind = liteFn_m9_numericAliasKind(lite_m2_componentName);
                if (((lite_m2_componentKind) === (""))) {
                    if (((liteFn_m2_findAlias([...(lite_aliases)], lite_m2_componentName)) >= (0n))) {
                        const lite_m2_seen: string[] = [...([])];
                        void lite_m2_seen;
                        lite_m2_componentKind = liteFn_m2_resolveAliasKind(lite_source, lite_m2_componentStart, lite_prefix, [...(lite_aliases)], lite_m2_componentName, [...(lite_m2_seen)]);
                    } else {
                        liteFn_m2_failAt(lite_source, lite_m2_componentStart, lite_prefix, (("unsupported tuple field type ") + (lite_m2_componentName)));
                    }
                }
            }
            if (liteFn_m2_isTupleKind(lite_m2_componentKind)) {
                liteFn_m2_failAt(lite_source, lite_m2_componentStart, lite_prefix, "nested tuple types are not supported");
            }
            if (liteFn_m2_isListKind(lite_m2_componentKind)) {
                liteFn_m2_failAt(lite_source, lite_m2_componentStart, lite_prefix, "list types inside tuples are not supported");
            }
            if (((lite_m2_componentKind) === ("Unit"))) {
                liteFn_m2_failAt(lite_source, lite_m2_componentStart, lite_prefix, "unsupported tuple component type Unit");
            }
            if (((lite_m2_count) > (0n))) {
                lite_m2_kindText = ((lite_m2_kindText) + (","));
            }
            lite_m2_kindText = ((((((lite_m2_kindText) + (lite_m2_label))) + (":"))) + (lite_m2_componentKind));
            lite_m2_count = lite$addInt(lite_m2_count, 1n, 32330);
            lite_m2_cursor = liteFn_m2_skipTrivia(lite_source, lite_m2_cursor, lite_prefix);
            if (((((lite_m2_cursor) < (lite_m2_size))) && (((lite$textAt(lite_source, lite_m2_cursor, 32417)) === (","))))) {
                lite_m2_cursor = liteFn_m2_skipTrivia(lite_source, lite$addInt(lite_m2_cursor, 1n, 32496), lite_prefix);
            }
        }
        if (((lite_m2_count) === (0n))) {
            liteFn_m2_failAt(lite_source, lite_position, lite_prefix, "tuple type needs at least one field");
        }
        return { kind: ((lite_m2_kindText) + (")")), next: lite_m2_cursor };
    }
    void liteFn_m2_parseTupleTypeAt;
    function liteFn_m2_parseTypeAt(lite_source: string, lite_position: bigint, lite_prefix: string, lite_aliases: { name: string; target: string; at: bigint; end: bigint }[], lite_context: string): { kind: string; next: bigint } {
        void lite_source;
        void lite_position;
        void lite_prefix;
        void lite_aliases;
        void lite_context;
        const lite_m2_start = liteFn_m2_skipTrivia(lite_source, lite_position, lite_prefix);
        void lite_m2_start;
        if (((((lite_m2_start) < (lite$textLength(lite_source)))) && (((lite$textAt(lite_source, lite_m2_start, 33011)) === ("("))))) {
            return liteFn_m2_parseTupleTypeAt(lite_source, lite_position, lite_prefix, [...(lite_aliases)]);
        }
        const lite_m2_parsedName = liteFn_m2_typeNameAt(lite_source, lite_m2_start, lite_prefix);
        void lite_m2_parsedName;
        const lite_m2_after = (lite_m2_parsedName).next;
        void lite_m2_after;
        const lite_m2_name = (lite_m2_parsedName).name;
        void lite_m2_name;
        const lite_m2_afterName = liteFn_m2_skipTrivia(lite_source, lite_m2_after, lite_prefix);
        void lite_m2_afterName;
        if (((((((lite_m2_name) === ("List"))) && (((lite_m2_afterName) < (lite$textLength(lite_source)))))) && (((lite$textAt(lite_source, lite_m2_afterName, 33341)) === ("<"))))) {
            const lite_m2_innerStart = liteFn_m2_skipTrivia(lite_source, lite$addInt(lite_m2_afterName, 1n, 33427), lite_prefix);
            void lite_m2_innerStart;
            if (((((lite_m2_innerStart) >= (lite$textLength(lite_source)))) || (((lite$textAt(lite_source, lite_m2_innerStart, 33488)) === (">"))))) {
                liteFn_m2_failAt(lite_source, lite_m2_innerStart, lite_prefix, "expected a list element type");
            }
            const lite_m2_inner = liteFn_m2_parseTypeAt(lite_source, lite_m2_innerStart, lite_prefix, [...(lite_aliases)], lite_context);
            void lite_m2_inner;
            if (liteFn_m2_isListKind((lite_m2_inner).kind)) {
                liteFn_m2_failAt(lite_source, lite_m2_innerStart, lite_prefix, "nested list types are not supported");
            }
            if ((((lite_m2_inner).kind) === ("Unit"))) {
                liteFn_m2_failAt(lite_source, lite_m2_innerStart, lite_prefix, "unsupported list element type Unit");
            }
            let lite_m2_close = liteFn_m2_skipTrivia(lite_source, (lite_m2_inner).next, lite_prefix);
            void lite_m2_close;
            lite_m2_close = liteFn_m2_expectSymbol(lite_source, lite_m2_close, ">", lite_prefix);
            return { kind: (((("List<") + ((lite_m2_inner).kind))) + (">")), next: lite_m2_close };
        }
        if (((((((((((lite_m2_name) === ("Int"))) || (((lite_m2_name) === ("Float"))))) || (((lite_m2_name) === ("String"))))) || (((lite_m2_name) === ("Bool"))))) || (((lite_m2_name) === ("Unit"))))) {
            return { kind: lite_m2_name, next: lite_m2_after };
        }
        const lite_m2_numericKind = liteFn_m9_numericAliasKind(lite_m2_name);
        void lite_m2_numericKind;
        if (((lite_m2_numericKind) !== (""))) {
            return { kind: lite_m2_numericKind, next: lite_m2_after };
        }
        if (((liteFn_m2_findAlias([...(lite_aliases)], lite_m2_name)) >= (0n))) {
            const lite_m2_seen: string[] = [...([])];
            void lite_m2_seen;
            return { kind: liteFn_m2_resolveAliasKind(lite_source, lite_m2_start, lite_prefix, [...(lite_aliases)], lite_m2_name, [...(lite_m2_seen)]), next: lite_m2_after };
        }
        if (((liteFn_m3_indexOfText(lite_m2_name, ".", 0n)) >= (0n))) {
            liteFn_m2_failAt(lite_source, lite_m2_start, lite_prefix, (("unknown type alias ") + (lite_m2_name)));
        }
        liteFn_m2_failAt(lite_source, lite_m2_start, lite_prefix, (((((("unsupported ") + (lite_context))) + (" type "))) + (lite_m2_name)));
        return { kind: "", next: lite_m2_after };
    }
    void liteFn_m2_parseTypeAt;
    function liteFn_m2_parseFunctionType(lite_source: string, lite_position: bigint, lite_prefix: string, lite_aliases: { name: string; target: string; at: bigint; end: bigint }[]): { kind: string; next: bigint } {
        void lite_source;
        void lite_position;
        void lite_prefix;
        void lite_aliases;
        return liteFn_m2_parseTypeAt(lite_source, lite_position, lite_prefix, [...(lite_aliases)], "function");
    }
    void liteFn_m2_parseFunctionType;
    function liteFn_m2_parseFunctionHeader(lite_source: string, lite_position: bigint, lite_prefix: string, lite_aliases: { name: string; target: string; at: bigint; end: bigint }[]): { next: bigint; result: string; params: string; count: bigint } {
        void lite_source;
        void lite_position;
        void lite_prefix;
        void lite_aliases;
        const lite_m2_size = lite$textLength(lite_source);
        void lite_m2_size;
        let lite_m2_cursor = liteFn_m2_skipTrivia(lite_source, lite_position, lite_prefix);
        void lite_m2_cursor;
        lite_m2_cursor = liteFn_m2_expectSymbol(lite_source, lite_m2_cursor, "(", lite_prefix);
        lite_m2_cursor = liteFn_m2_skipTrivia(lite_source, lite_m2_cursor, lite_prefix);
        const lite_m2_names: string[] = [...([])];
        void lite_m2_names;
        let lite_m2_encoded = "";
        void lite_m2_encoded;
        let lite_m2_count = 0n;
        void lite_m2_count;
        if (((((lite_m2_cursor) < (lite_m2_size))) && (((lite$textAt(lite_source, lite_m2_cursor, 35748)) !== (")"))))) {
            while (Boolean(true)) {
                if (((((lite_m2_cursor) >= (lite_m2_size))) || ((!(liteFn_m3_isNameStart(lite$textAt(lite_source, lite_m2_cursor, 35858))))))) {
                    liteFn_m2_failAt(lite_source, lite_m2_cursor, lite_prefix, "expected a parameter name");
                }
                const lite_m2_nameStart = lite_m2_cursor;
                void lite_m2_nameStart;
                lite_m2_cursor = liteFn_m3_skipName(lite_source, lite_m2_cursor);
                const lite_m2_parameterName = lite$textSlice(lite_source, lite_m2_nameStart, lite_m2_cursor, 36092);
                void lite_m2_parameterName;
                if (liteFn_m2_isReservedWord(lite_m2_parameterName)) {
                    liteFn_m2_unsupportedFeature(lite_source, lite_m2_nameStart, lite_m2_parameterName, lite_prefix);
                }
                if (liteFn_m6_listContainsText([...(lite_m2_names)], lite_m2_parameterName)) {
                    liteFn_m2_failAt(lite_source, lite_m2_nameStart, lite_prefix, (("duplicate parameter ") + (lite_m2_parameterName)));
                }
                lite_m2_names.push(lite_m2_parameterName);
                lite_m2_cursor = liteFn_m2_skipTrivia(lite_source, lite_m2_cursor, lite_prefix);
                lite_m2_cursor = liteFn_m2_expectSymbol(lite_source, lite_m2_cursor, ":", lite_prefix);
                const lite_m2_typed = liteFn_m2_parseFunctionType(lite_source, lite_m2_cursor, lite_prefix, [...(lite_aliases)]);
                void lite_m2_typed;
                lite_m2_cursor = liteFn_m2_skipTrivia(lite_source, (lite_m2_typed).next, lite_prefix);
                if (((lite_m2_count) > (0n))) {
                    lite_m2_encoded = ((lite_m2_encoded) + ("|"));
                }
                lite_m2_encoded = ((((((lite_m2_encoded) + (lite_m2_parameterName))) + ("="))) + ((lite_m2_typed).kind));
                lite_m2_count = lite$addInt(lite_m2_count, 1n, 36860);
                if (((((lite_m2_cursor) < (lite_m2_size))) && (((lite$textAt(lite_source, lite_m2_cursor, 36898)) === (","))))) {
                    lite_m2_cursor = liteFn_m2_skipTrivia(lite_source, lite$addInt(lite_m2_cursor, 1n, 36981), lite_prefix);
                } else {
                    break;
                }
            }
        }
        lite_m2_cursor = liteFn_m2_expectSymbol(lite_source, lite_m2_cursor, ")", lite_prefix);
        lite_m2_cursor = liteFn_m2_skipTrivia(lite_source, lite_m2_cursor, lite_prefix);
        lite_m2_cursor = liteFn_m2_expectSymbol(lite_source, lite_m2_cursor, ":", lite_prefix);
        const lite_m2_resultType = liteFn_m2_parseFunctionType(lite_source, lite_m2_cursor, lite_prefix, [...(lite_aliases)]);
        void lite_m2_resultType;
        return { next: (lite_m2_resultType).next, result: (lite_m2_resultType).kind, params: lite_m2_encoded, count: lite_m2_count };
    }
    void liteFn_m2_parseFunctionHeader;
    function liteFn_m2_paramNameOf(lite_entry: string): string {
        void lite_entry;
        const lite_m2_separator = liteFn_m3_indexOfText(lite_entry, "=", 0n);
        void lite_m2_separator;
        if (((lite_m2_separator) < (0n))) {
            return lite_entry;
        }
        return lite$textSlice(lite_entry, 0n, lite_m2_separator, 37616);
    }
    void liteFn_m2_paramNameOf;
    function liteFn_m2_paramKindOf(lite_entry: string): string {
        void lite_entry;
        const lite_m2_separator = liteFn_m3_indexOfText(lite_entry, "=", 0n);
        void lite_m2_separator;
        if (((lite_m2_separator) < (0n))) {
            return "";
        }
        return lite$textSlice(lite_entry, lite$addInt(lite_m2_separator, 1n, 37892), lite$textLength(lite_entry), 37865);
    }
    void liteFn_m2_paramKindOf;
    function liteFn_m2_intParsed(lite_code: string, lite_value: bigint, lite_constant: boolean, lite_next: bigint): { kind: string; code: string; intValue: bigint; textValue: string; constant: boolean; next: bigint } {
        void lite_code;
        void lite_value;
        void lite_constant;
        void lite_next;
        return { kind: "Int", code: lite_code, intValue: lite_value, textValue: "", constant: lite_constant, next: lite_next };
    }
    void liteFn_m2_intParsed;
    function liteFn_m2_textParsed(lite_code: string, lite_value: string, lite_constant: boolean, lite_next: bigint): { kind: string; code: string; intValue: bigint; textValue: string; constant: boolean; next: bigint } {
        void lite_code;
        void lite_value;
        void lite_constant;
        void lite_next;
        return { kind: "String", code: lite_code, intValue: 0n, textValue: lite_value, constant: lite_constant, next: lite_next };
    }
    void liteFn_m2_textParsed;
    function liteFn_m2_boolParsed(lite_code: string, lite_value: boolean, lite_constant: boolean, lite_next: bigint): { kind: string; code: string; intValue: bigint; textValue: string; constant: boolean; next: bigint } {
        void lite_code;
        void lite_value;
        void lite_constant;
        void lite_next;
        return { kind: "Bool", code: lite_code, intValue: (Boolean(lite_value) ? 1n : 0n), textValue: "", constant: lite_constant, next: lite_next };
    }
    void liteFn_m2_boolParsed;
    function liteFn_m2_tryFoldInteger(lite_operator: string, lite_left: bigint, lite_right: bigint): { value: bigint; ok: boolean } {
        void lite_operator;
        void lite_left;
        void lite_right;
        if (((lite_operator) === ("+"))) {
            return liteFn_m4_intAdd(lite_left, lite_right);
        }
        if (((lite_operator) === ("-"))) {
            return liteFn_m4_intSubtract(lite_left, lite_right);
        }
        if (((lite_operator) === ("*"))) {
            return liteFn_m4_intMultiply(lite_left, lite_right);
        }
        if (((lite_operator) === ("/"))) {
            return liteFn_m4_intDivide(lite_left, lite_right);
        }
        if (((lite_operator) === ("%"))) {
            return liteFn_m4_intRemainder(lite_left, lite_right);
        }
        if (((lite_operator) === (":/"))) {
            return liteFn_m4_intFloorDivide(lite_left, lite_right);
        }
        return liteFn_m4_intFloorModulo(lite_left, lite_right);
    }
    void liteFn_m2_tryFoldInteger;
    function liteFn_m2_runtimeIntegerCode(lite_target: string, lite_operator: string, lite_left: string, lite_right: string, lite_position: bigint): string {
        void lite_target;
        void lite_operator;
        void lite_left;
        void lite_right;
        void lite_position;
        if (((lite_operator) === ("+"))) {
            return liteFn_m2_targetIntAddCode(lite_target, lite_left, lite_right, lite_position);
        }
        if (((lite_operator) === ("-"))) {
            return liteFn_m2_targetIntSubtractCode(lite_target, lite_left, lite_right, lite_position);
        }
        if (((lite_operator) === ("*"))) {
            return liteFn_m2_targetIntMultiplyCode(lite_target, lite_left, lite_right, lite_position);
        }
        if (((lite_operator) === ("/"))) {
            return liteFn_m2_targetIntDivideCode(lite_target, lite_left, lite_right, lite_position);
        }
        if (((lite_operator) === ("%"))) {
            return liteFn_m2_targetIntRemainderCode(lite_target, lite_left, lite_right, lite_position);
        }
        if (((lite_operator) === (":/"))) {
            return liteFn_m2_targetIntFloorDivideCode(lite_target, lite_left, lite_right, lite_position);
        }
        return liteFn_m2_targetIntFloorModuloCode(lite_target, lite_left, lite_right, lite_position);
    }
    void liteFn_m2_runtimeIntegerCode;
    function liteFn_m2_localIndex(lite_locals: { name: string; runtime: string; kind: string; mutable: boolean; writable: boolean; depth: bigint; constant: boolean; code: string; intValue: bigint; textValue: string }[], lite_name: string): bigint {
        void lite_locals;
        void lite_name;
        let lite_m2_index = 0n;
        void lite_m2_index;
        let lite_m2_found = (-1n);
        void lite_m2_found;
        for (const lite_m2_local of [...(lite_locals)]) {
            void lite_m2_local;
            if ((((lite_m2_local).name) === (lite_name))) {
                lite_m2_found = lite_m2_index;
            }
            lite_m2_index = lite$addInt(lite_m2_index, 1n, 40426);
        }
        return lite_m2_found;
    }
    void liteFn_m2_localIndex;
    function liteFn_m2_localRuntimeName(lite_locals: { name: string; runtime: string; kind: string; mutable: boolean; writable: boolean; depth: bigint; constant: boolean; code: string; intValue: bigint; textValue: string }[], lite_name: string, lite_position: bigint, lite_moduleId: bigint): string {
        void lite_locals;
        void lite_name;
        void lite_position;
        void lite_moduleId;
        const lite_m2_index = liteFn_m2_localIndex([...(lite_locals)], lite_name);
        void lite_m2_index;
        if (((lite_moduleId) === (0n))) {
            if (((lite_m2_index) < (0n))) {
                return (("lite_") + (lite_name));
            }
            return (((((("lt_local_") + (lite_name))) + ("_"))) + (liteFn_m4_intText(lite_position)));
        }
        if (((lite_m2_index) < (0n))) {
            return (((((("lite_m") + (liteFn_m4_intText(lite_moduleId)))) + ("_"))) + (lite_name));
        }
        return (((((((((("lt_local_m") + (liteFn_m4_intText(lite_moduleId)))) + ("_"))) + (lite_name))) + ("_"))) + (liteFn_m4_intText(lite_position)));
    }
    void liteFn_m2_localRuntimeName;
    function liteFn_m2_isComparison(lite_operator: string): boolean {
        void lite_operator;
        return ((((((((((((((((((((lite_operator) === ("=="))) || (((lite_operator) === ("=!="))))) || (((lite_operator) === ("<"))))) || (((lite_operator) === ("<!"))))) || (((lite_operator) === ("<="))))) || (((lite_operator) === ("<!="))))) || (((lite_operator) === (">"))))) || (((lite_operator) === (">!"))))) || (((lite_operator) === (">="))))) || (((lite_operator) === (">!="))));
    }
    void liteFn_m2_isComparison;
    function liteFn_m2_operatorLevel(lite_operator: string): bigint {
        void lite_operator;
        return (Boolean(((lite_operator) === ("or"))) ? 2n : (Boolean(((lite_operator) === ("and"))) ? 3n : (Boolean(liteFn_m2_isComparison(lite_operator)) ? 5n : (Boolean(((((lite_operator) === ("+"))) || (((lite_operator) === ("-"))))) ? 10n : (Boolean(((((((((((lite_operator) === ("*"))) || (((lite_operator) === ("/"))))) || (((lite_operator) === ("%"))))) || (((lite_operator) === (":/"))))) || (((lite_operator) === (":%"))))) ? 20n : (Boolean(((lite_operator) === ("**"))) ? 25n : 0n))))));
    }
    void liteFn_m2_operatorLevel;
    function liteFn_m2_readOperator(lite_source: string, lite_position: bigint): { text: string; width: bigint } {
        void lite_source;
        void lite_position;
        const lite_m2_ch = lite$textAt(lite_source, lite_position, 42055);
        void lite_m2_ch;
        if (((lite_m2_ch) === ("*"))) {
            if (liteFn_m3_startsWithAt(lite_source, lite_position, "**")) {
                return { text: "**", width: 2n };
            }
            return { text: "*", width: 1n };
        }
        if (liteFn_m3_startsWithAt(lite_source, lite_position, "=!=")) {
            return { text: "=!=", width: 3n };
        }
        if (liteFn_m3_startsWithAt(lite_source, lite_position, "<!=")) {
            return { text: "<!=", width: 3n };
        }
        if (liteFn_m3_startsWithAt(lite_source, lite_position, ">!=")) {
            return { text: ">!=", width: 3n };
        }
        if (liteFn_m3_startsWithAt(lite_source, lite_position, "==")) {
            return { text: "==", width: 2n };
        }
        if (liteFn_m3_startsWithAt(lite_source, lite_position, "<=")) {
            return { text: "<=", width: 2n };
        }
        if (liteFn_m3_startsWithAt(lite_source, lite_position, ">=")) {
            return { text: ">=", width: 2n };
        }
        if (liteFn_m3_startsWithAt(lite_source, lite_position, "<!")) {
            return { text: "<!", width: 2n };
        }
        if (liteFn_m3_startsWithAt(lite_source, lite_position, ">!")) {
            return { text: ">!", width: 2n };
        }
        if (((lite_m2_ch) === ("<"))) {
            return { text: "<", width: 1n };
        }
        if (((lite_m2_ch) === (">"))) {
            return { text: ">", width: 1n };
        }
        if (((((((((lite_m2_ch) === ("+"))) || (((lite_m2_ch) === ("-"))))) || (((lite_m2_ch) === ("/"))))) || (((lite_m2_ch) === ("%"))))) {
            return { text: lite_m2_ch, width: 1n };
        }
        if (liteFn_m3_startsWithAt(lite_source, lite_position, ":/")) {
            return { text: ":/", width: 2n };
        }
        if (liteFn_m3_startsWithAt(lite_source, lite_position, ":%")) {
            return { text: ":%", width: 2n };
        }
        if (liteFn_m3_isNameStart(lite_m2_ch)) {
            const lite_m2_after = liteFn_m3_skipName(lite_source, lite_position);
            void lite_m2_after;
            const lite_m2_word = lite$textSlice(lite_source, lite_position, lite_m2_after, 43434);
            void lite_m2_word;
            if (((((lite_m2_word) === ("and"))) || (((lite_m2_word) === ("or"))))) {
                return { text: lite_m2_word, width: lite$subtractInt(lite_m2_after, lite_position, 43548) };
            }
        }
        return { text: "", width: 0n };
    }
    void liteFn_m2_readOperator;
    function liteFn_m2_binaryFollows(lite_source: string, lite_next: bigint, lite_prefix: string, lite_minimum: bigint): boolean {
        void lite_source;
        void lite_next;
        void lite_prefix;
        void lite_minimum;
        const lite_m2_cursor = liteFn_m2_skipTrivia(lite_source, lite_next, lite_prefix);
        void lite_m2_cursor;
        if (((lite_m2_cursor) >= (lite$textLength(lite_source)))) {
            return false;
        }
        const lite_m2_operator = liteFn_m2_readOperator(lite_source, lite_m2_cursor);
        void lite_m2_operator;
        return (((((lite_m2_operator).text) !== (""))) && (((liteFn_m2_operatorLevel((lite_m2_operator).text)) >= (lite_minimum))));
    }
    void liteFn_m2_binaryFollows;
    function liteFn_m2_comparisonOperatorAt(lite_source: string, lite_position: bigint): { text: string; width: bigint } {
        void lite_source;
        void lite_position;
        if (((lite_position) >= (lite$textLength(lite_source)))) {
            return { text: "", width: 0n };
        }
        const lite_m2_ch = lite$textAt(lite_source, lite_position, 44305);
        void lite_m2_ch;
        if (((((((lite_m2_ch) === ("="))) || (((lite_m2_ch) === ("<"))))) || (((lite_m2_ch) === (">"))))) {
            return liteFn_m2_readOperator(lite_source, lite_position);
        }
        return { text: "", width: 0n };
    }
    void liteFn_m2_comparisonOperatorAt;
    function liteFn_m2_compareIntegers(lite_operator: string, lite_left: bigint, lite_right: bigint): boolean {
        void lite_operator;
        void lite_left;
        void lite_right;
        return (Boolean(((lite_operator) === ("=="))) ? ((lite_left) === (lite_right)) : (Boolean(((lite_operator) === ("=!="))) ? ((lite_left) !== (lite_right)) : (Boolean(((lite_operator) === ("<"))) ? ((lite_left) < (lite_right)) : (Boolean(((lite_operator) === ("<!"))) ? ((lite_left) >= (lite_right)) : (Boolean(((lite_operator) === ("<="))) ? ((lite_left) <= (lite_right)) : (Boolean(((lite_operator) === ("<!="))) ? ((lite_left) > (lite_right)) : (Boolean(((lite_operator) === (">"))) ? ((lite_left) > (lite_right)) : (Boolean(((lite_operator) === (">!"))) ? ((lite_left) <= (lite_right)) : (Boolean(((lite_operator) === (">="))) ? ((lite_left) >= (lite_right)) : ((lite_left) < (lite_right)))))))))));
    }
    void liteFn_m2_compareIntegers;
    function liteFn_m2_compareTexts(lite_operator: string, lite_left: string, lite_right: string): boolean {
        void lite_operator;
        void lite_left;
        void lite_right;
        return (Boolean(((lite_operator) === ("=="))) ? ((lite_left) === (lite_right)) : ((lite_left) !== (lite_right)));
    }
    void liteFn_m2_compareTexts;
    function liteFn_m2_compareBools(lite_operator: string, lite_left: boolean, lite_right: boolean): boolean {
        void lite_operator;
        void lite_left;
        void lite_right;
        return (Boolean(((lite_operator) === ("=="))) ? (Boolean(lite_left) === Boolean(lite_right)) : (Boolean(lite_left) !== Boolean(lite_right)));
    }
    void liteFn_m2_compareBools;
    function liteFn_m2_compareParsed(lite_target: string, lite_source: string, lite_at: bigint, lite_operator: string, lite_left: { kind: string; code: string; intValue: bigint; textValue: string; constant: boolean; next: bigint }, lite_right: { kind: string; code: string; intValue: bigint; textValue: string; constant: boolean; next: bigint }, lite_prefix: string): { kind: string; code: string; intValue: bigint; textValue: string; constant: boolean; next: bigint } {
        void lite_target;
        void lite_source;
        void lite_at;
        void lite_operator;
        void lite_left;
        void lite_right;
        void lite_prefix;
        if ((((lite_left).kind) !== ((lite_right).kind))) {
            if (((((((((lite_left).kind) === ("Int"))) || ((((lite_left).kind) === ("Float")))))) && (((((((lite_right).kind) === ("Int"))) || ((((lite_right).kind) === ("Float")))))))) {
                const lite_m2_codes: string[] = [...([(lite_left).code, (lite_right).code])];
                void lite_m2_codes;
                const lite_m2_kinds: string[] = [...([(lite_left).kind, (lite_right).kind])];
                void lite_m2_kinds;
                const lite_m2_operators: string[] = [...([lite_operator])];
                void lite_m2_operators;
                return liteFn_m2_boolParsed(liteFn_m2_targetComparisonChainCode(lite_target, [...(lite_m2_codes)], [...(lite_m2_kinds)], [...(lite_m2_operators)], 1n, lite_at), false, false, (lite_right).next);
            }
            liteFn_m2_failAt(lite_source, lite_at, lite_prefix, (((((("cannot compare ") + (liteFn_m2_displayKind((lite_left).kind)))) + (" and "))) + (liteFn_m2_displayKind((lite_right).kind))));
        }
        if (liteFn_m2_isTupleKind((lite_left).kind)) {
            liteFn_m2_failAt(lite_source, lite_at, lite_prefix, "cannot compare tuple values");
        }
        if (liteFn_m2_isListKind((lite_left).kind)) {
            liteFn_m2_failAt(lite_source, lite_at, lite_prefix, "cannot compare list values");
        }
        if ((((lite_left).kind) === ("Int"))) {
            if ((((lite_left).constant) && ((lite_right).constant))) {
                const lite_m2_value = liteFn_m2_compareIntegers(lite_operator, (lite_left).intValue, (lite_right).intValue);
                void lite_m2_value;
                return liteFn_m2_boolParsed(liteFn_m2_targetBoolLiteralCode(lite_target, lite_m2_value), lite_m2_value, true, (lite_right).next);
            }
            return liteFn_m2_boolParsed(liteFn_m2_targetComparisonCode(lite_target, lite_operator, (lite_left).kind, (lite_left).code, (lite_right).code), false, false, (lite_right).next);
        }
        if ((((lite_left).kind) === ("Float"))) {
            const lite_m2_codes: string[] = [...([(lite_left).code, (lite_right).code])];
            void lite_m2_codes;
            const lite_m2_kinds: string[] = [...([(lite_left).kind, (lite_right).kind])];
            void lite_m2_kinds;
            const lite_m2_operators: string[] = [...([lite_operator])];
            void lite_m2_operators;
            return liteFn_m2_boolParsed(liteFn_m2_targetComparisonChainCode(lite_target, [...(lite_m2_codes)], [...(lite_m2_kinds)], [...(lite_m2_operators)], 1n, lite_at), false, false, (lite_right).next);
        }
        if (((((lite_operator) !== ("=="))) && (((lite_operator) !== ("=!="))))) {
            liteFn_m2_failAt(lite_source, lite_at, lite_prefix, (((("operator ") + (lite_operator))) + (" requires Int operands")));
        }
        if ((((lite_left).constant) && ((lite_right).constant))) {
            const lite_m2_value = (Boolean((((lite_left).kind) === ("String"))) ? liteFn_m2_compareTexts(lite_operator, (lite_left).textValue, (lite_right).textValue) : liteFn_m2_compareBools(lite_operator, (((lite_left).intValue) !== (0n)), (((lite_right).intValue) !== (0n))));
            void lite_m2_value;
            return liteFn_m2_boolParsed(liteFn_m2_targetBoolLiteralCode(lite_target, lite_m2_value), lite_m2_value, true, (lite_right).next);
        }
        return liteFn_m2_boolParsed(liteFn_m2_targetComparisonCode(lite_target, lite_operator, (lite_left).kind, (lite_left).code, (lite_right).code), false, false, (lite_right).next);
    }
    void liteFn_m2_compareParsed;
    function liteFn_m2_parseNumber(lite_target: string, lite_source: string, lite_position: bigint, lite_prefix: string): { kind: string; code: string; intValue: bigint; textValue: string; constant: boolean; next: bigint } {
        void lite_target;
        void lite_source;
        void lite_position;
        void lite_prefix;
        let lite_m2_cursor = lite_position;
        void lite_m2_cursor;
        let lite_m2_negative = false;
        void lite_m2_negative;
        const lite_m2_ch = lite$textAt(lite_source, lite_m2_cursor, 48031);
        void lite_m2_ch;
        if (((((lite_m2_ch) === ("+"))) || (((lite_m2_ch) === ("-"))))) {
            lite_m2_negative = ((lite_m2_ch) === ("-"));
            lite_m2_cursor = liteFn_m2_skipTrivia(lite_source, lite$addInt(lite_m2_cursor, 1n, 48160), lite_prefix);
        }
        const lite_m2_start = lite_m2_cursor;
        void lite_m2_start;
        const lite_m2_afterDigit = lite$addInt(lite_m2_cursor, 1n, 48226);
        void lite_m2_afterDigit;
        const lite_m2_following = (Boolean(((lite_m2_afterDigit) < (lite$textLength(lite_source)))) ? lite$textAt(lite_source, lite_m2_afterDigit, 48285) : "");
        void lite_m2_following;
        if (((((((((liteFn_m3_isDigit(lite$textAt(lite_source, lite_m2_cursor, 48350))) && ((!(liteFn_m3_isDigit(lite_m2_following)))))) && (((lite_m2_following) !== ("."))))) && (((lite_m2_following) !== ("e"))))) && (((lite_m2_following) !== ("E"))))) {
            const lite_m2_digit = liteFn_m3_digitValue(lite$textAt(lite_source, lite_m2_cursor, 48638));
            void lite_m2_digit;
            const lite_m2_value = (Boolean(lite_m2_negative) ? lite$negateInt(lite_m2_digit, 48694) : lite_m2_digit);
            void lite_m2_value;
            return liteFn_m2_intParsed(liteFn_m2_targetIntLiteralCode(lite_target, lite_m2_value, lite_m2_negative, lite$textSlice(lite_source, lite_m2_cursor, lite_m2_afterDigit, 48790)), lite_m2_value, true, lite_m2_afterDigit);
        }
        const lite_m2_scanned = liteFn_m9_scanNumericLiteral(lite_source, lite_m2_cursor);
        void lite_m2_scanned;
        lite_m2_cursor = (lite_m2_scanned).next;
        const lite_m2_integerEnd = (lite_m2_scanned).integerEnd;
        void lite_m2_integerEnd;
        if (((lite_m2_start) === (lite_m2_integerEnd))) {
            liteFn_m2_failAt(lite_source, lite_position, lite_prefix, "expected a decimal numeric literal");
        }
        if ((((lite_m2_scanned).exponentMissingAt) >= (0n))) {
            liteFn_m2_failAt(lite_source, (lite_m2_scanned).exponentMissingAt, lite_prefix, "expected exponent digits");
        }
        let lite_m2_digitStart = lite_m2_start;
        void lite_m2_digitStart;
        while (((((lite$addInt(lite_m2_digitStart, 1n, 49259)) < (lite_m2_integerEnd))) && (((lite$textAt(lite_source, lite_m2_digitStart, 49280)) === ("0"))))) {
            lite_m2_digitStart = lite$addInt(lite_m2_digitStart, 1n, 49340);
        }
        if ((lite_m2_scanned).floating) {
            const lite_m2_digits = ((lite$textSlice(lite_source, lite_m2_start, lite_m2_integerEnd, 49391)) + (lite$textSlice(lite_source, (lite_m2_scanned).fractionStart, (lite_m2_scanned).fractionEnd, 49430)));
            void lite_m2_digits;
            if ((!(liteFn_m9_finiteFloatDigits(lite_m2_digits, lite$subtractInt((lite_m2_scanned).fractionEnd, (lite_m2_scanned).fractionStart, 49562), (lite_m2_scanned).exponent)))) {
                liteFn_m2_failAt(lite_source, lite_position, lite_prefix, "floating literal is not finite");
            }
            const lite_m2_raw = lite$textSlice(lite_source, lite_m2_digitStart, lite_m2_cursor, 49712);
            void lite_m2_raw;
            const lite_m2_code = liteFn_m2_targetFloatLiteralCode(lite_target, lite_m2_raw, lite_m2_negative);
            void lite_m2_code;
            return { kind: "Float", code: lite_m2_code, intValue: 0n, textValue: "", constant: false, next: lite_m2_cursor };
        }
        if ((((lite_m2_scanned).outsideInt) || (((((!(lite_m2_negative))) && ((((lite_m2_scanned).magnitude) === ((-9223372036854775808n))))))))) {
            liteFn_m2_failAt(lite_source, lite_position, lite_prefix, "integer literal outside signed 64-bit range");
        }
        const lite_m2_value = (Boolean(lite_m2_negative) ? (lite_m2_scanned).magnitude : lite$subtractInt(0n, (lite_m2_scanned).magnitude, 50172));
        void lite_m2_value;
        const lite_m2_code = liteFn_m2_targetIntLiteralCode(lite_target, lite_m2_value, lite_m2_negative, lite$textSlice(lite_source, lite_m2_digitStart, lite_m2_cursor, 50253));
        void lite_m2_code;
        return liteFn_m2_intParsed(lite_m2_code, lite_m2_value, true, lite_m2_cursor);
    }
    void liteFn_m2_parseNumber;
    function liteFn_m2_floatContextNumber(lite_target: string, lite_source: string, lite_start: bigint, lite_prefix: string, lite_parsed: { kind: string; code: string; intValue: bigint; textValue: string; constant: boolean; next: bigint }, lite_minimum: bigint): { kind: string; code: string; intValue: bigint; textValue: string; constant: boolean; next: bigint } {
        void lite_target;
        void lite_source;
        void lite_start;
        void lite_prefix;
        void lite_parsed;
        void lite_minimum;
        if ((((((lite_parsed).kind) !== ("Int"))) || (liteFn_m2_binaryFollows(lite_source, (lite_parsed).next, lite_prefix, lite_minimum)))) {
            return lite_parsed;
        }
        if ((!(liteFn_m9_intExactlyFloat((lite_parsed).intValue)))) {
            liteFn_m2_failAt(lite_source, lite_start, lite_prefix, "integer literal is not exactly representable in Float");
        }
        return { kind: "Float", code: liteFn_m2_targetFloatOperandCode(lite_target, "Int", (lite_parsed).code), intValue: 0n, textValue: "", constant: false, next: (lite_parsed).next };
    }
    void liteFn_m2_floatContextNumber;
    function liteFn_m2_parseText(lite_target: string, lite_source: string, lite_position: bigint, lite_prefix: string): { kind: string; code: string; intValue: bigint; textValue: string; constant: boolean; next: bigint } {
        void lite_target;
        void lite_source;
        void lite_position;
        void lite_prefix;
        let lite_m2_literalStart = lite_position;
        void lite_m2_literalStart;
        let lite_m2_cursor = lite$addInt(lite_position, 1n, 51356);
        void lite_m2_cursor;
        let lite_m2_value = "";
        void lite_m2_value;
        while (Boolean(true)) {
            if (((lite_m2_cursor) >= (lite$textLength(lite_source)))) {
                liteFn_m2_failAt(lite_source, lite_m2_literalStart, lite_prefix, "unterminated string literal");
            }
            const lite_m2_ch = lite$textAt(lite_source, lite_m2_cursor, 51545);
            void lite_m2_ch;
            if (((lite_m2_ch) === ("\""))) {
                lite_m2_cursor = lite$addInt(lite_m2_cursor, 1n, 51621);
                const lite_m2_next = liteFn_m2_skipTrivia(lite_source, lite_m2_cursor, lite_prefix);
                void lite_m2_next;
                if (((((lite_m2_next) < (lite$textLength(lite_source)))) && (((lite$textAt(lite_source, lite_m2_next, 51727)) === ("\""))))) {
                    lite_m2_literalStart = lite_m2_next;
                    lite_m2_cursor = lite$addInt(lite_m2_next, 1n, 51825);
                    continue;
                }
                break;
            }
            if (((lite_m2_ch) === ("\\"))) {
                const lite_m2_escapeStart = lite_m2_cursor;
                void lite_m2_escapeStart;
                lite_m2_cursor = lite$addInt(lite_m2_cursor, 1n, 51986);
                if (((lite_m2_cursor) >= (lite$textLength(lite_source)))) {
                    liteFn_m2_failAt(lite_source, lite_m2_escapeStart, lite_prefix, "unterminated string escape");
                }
                const lite_m2_escaped = lite$textAt(lite_source, lite_m2_cursor, 52157);
                void lite_m2_escaped;
                if (((lite_m2_escaped) === ("n"))) {
                    lite_m2_value = ((lite_m2_value) + ("\n"));
                } else if (((lite_m2_escaped) === ("t"))) {
                    lite_m2_value = ((lite_m2_value) + ("\t"));
                } else if (((lite_m2_escaped) === ("r"))) {
                    lite_m2_value = ((lite_m2_value) + ("\r"));
                } else if (((lite_m2_escaped) === ("\""))) {
                    lite_m2_value = ((lite_m2_value) + ("\""));
                } else if (((lite_m2_escaped) === ("\\"))) {
                    lite_m2_value = ((lite_m2_value) + ("\\"));
                } else {
                    liteFn_m2_failAt(lite_source, lite_m2_escapeStart, lite_prefix, (("unsupported string escape \\") + (lite_m2_escaped)));
                }
                lite_m2_cursor = lite$addInt(lite_m2_cursor, 1n, 52639);
            } else {
                lite_m2_value = ((lite_m2_value) + (lite_m2_ch));
                lite_m2_cursor = lite$addInt(lite_m2_cursor, 1n, 52721);
            }
        }
        return liteFn_m2_textParsed(liteFn_m2_targetTextLiteralCode(lite_target, lite_m2_value), lite_m2_value, true, lite_m2_cursor);
    }
    void liteFn_m2_parseText;
    function liteFn_m2_skipAliasString(lite_source: string, lite_position: bigint): bigint {
        void lite_source;
        void lite_position;
        const lite_m2_size = lite$textLength(lite_source);
        void lite_m2_size;
        let lite_m2_cursor = lite$addInt(lite_position, 1n, 53100);
        void lite_m2_cursor;
        while (((lite_m2_cursor) < (lite_m2_size))) {
            const lite_m2_ch = lite$textAt(lite_source, lite_m2_cursor, 53144);
            void lite_m2_ch;
            if (((lite_m2_ch) === ("\\"))) {
                lite_m2_cursor = lite$addInt(lite_m2_cursor, 2n, 53220);
            } else if (((lite_m2_ch) === ("\""))) {
                return lite$addInt(lite_m2_cursor, 1n, 53282);
            } else {
                lite_m2_cursor = lite$addInt(lite_m2_cursor, 1n, 53332);
            }
        }
        return lite_m2_size;
    }
    void liteFn_m2_skipAliasString;
    function liteFn_m2_targetCodeCalls(lite_code: string, lite_existing: string): string {
        void lite_code;
        void lite_existing;
        if (((((liteFn_m3_indexOfText(lite_code, "lite", 0n)) < (0n))) && (((liteFn_m3_indexOfText(lite_code, "lt_", 0n)) < (0n))))) {
            return lite_existing;
        }
        let lite_m2_calls = lite_existing;
        void lite_m2_calls;
        let lite_m2_cursor = 0n;
        void lite_m2_cursor;
        while (((lite_m2_cursor) < (lite$textLength(lite_code)))) {
            const lite_m2_ch = lite$textAt(lite_code, lite_m2_cursor, 53800);
            void lite_m2_ch;
            if (((lite_m2_ch) === ("\""))) {
                lite_m2_cursor = liteFn_m2_skipAliasString(lite_code, lite_m2_cursor);
            } else if (liteFn_m3_isNameStart(lite_m2_ch)) {
                const lite_m2_start = lite_m2_cursor;
                void lite_m2_start;
                lite_m2_cursor = liteFn_m3_skipName(lite_code, lite_m2_cursor);
                if (((((lite_m2_cursor) < (lite$textLength(lite_code)))) && (((lite$textAt(lite_code, lite_m2_cursor, 54069)) === ("$"))))) {
                    lite_m2_cursor = liteFn_m3_skipName(lite_code, lite$addInt(lite_m2_cursor, 1n, 54154));
                }
                if (((((lite_m2_cursor) < (lite$textLength(lite_code)))) && (((lite$textAt(lite_code, lite_m2_cursor, 54219)) === ("("))))) {
                    const lite_m2_name = lite$textSlice(lite_code, lite_m2_start, lite_m2_cursor, 54273);
                    void lite_m2_name;
                    if (((((liteFn_m3_startsWithAt(lite_m2_name, 0n, "lite$")) || (liteFn_m3_startsWithAt(lite_m2_name, 0n, "lite_")))) || (liteFn_m3_startsWithAt(lite_m2_name, 0n, "lt_")))) {
                        const lite_m2_token = ((lite_m2_name) + ("(|"));
                        void lite_m2_token;
                        if (((liteFn_m3_indexOfText(lite_m2_calls, (("|") + (lite_m2_token)), 0n)) < (0n))) {
                            lite_m2_calls = ((lite_m2_calls) + (lite_m2_token));
                        }
                    }
                }
            } else {
                lite_m2_cursor = lite$addInt(lite_m2_cursor, 1n, 54651);
            }
        }
        return lite_m2_calls;
    }
    void liteFn_m2_targetCodeCalls;
    function liteFn_m2_targetHelperCalls(lite_items: { kind: string; name: string; runtime: string; code: string; intValue: bigint; textValue: string }[]): string {
        void lite_items;
        let lite_m2_calls = "|";
        void lite_m2_calls;
        for (const lite_m2_item of [...(lite_items)]) {
            void lite_m2_item;
            lite_m2_calls = liteFn_m2_targetCodeCalls((lite_m2_item).code, lite_m2_calls);
        }
        return lite_m2_calls;
    }
    void liteFn_m2_targetHelperCalls;
    function liteFn_m2_collectTypeTarget(lite_source: string, lite_position: bigint, lite_prefix: string): { text: string; next: bigint } {
        void lite_source;
        void lite_position;
        void lite_prefix;
        const lite_m2_size = lite$textLength(lite_source);
        void lite_m2_size;
        const lite_m2_start = liteFn_m2_skipTrivia(lite_source, lite_position, lite_prefix);
        void lite_m2_start;
        if (((((lite_m2_start) < (lite_m2_size))) && (((lite$textAt(lite_source, lite_m2_start, 55315)) === ("("))))) {
            let lite_m2_cursor = lite_m2_start;
            void lite_m2_cursor;
            let lite_m2_depth = 0n;
            void lite_m2_depth;
            while (((lite_m2_cursor) < (lite_m2_size))) {
                const lite_m2_ch = lite$textAt(lite_source, lite_m2_cursor, 55446);
                void lite_m2_ch;
                if (((lite_m2_ch) === ("\""))) {
                    lite_m2_cursor = liteFn_m2_skipAliasString(lite_source, lite_m2_cursor);
                } else if (liteFn_m3_startsWithAt(lite_source, lite_m2_cursor, "/*")) {
                    lite_m2_cursor = liteFn_m2_skipComment(lite_source, lite_m2_cursor, lite_prefix);
                } else if (((lite_m2_ch) === ("("))) {
                    lite_m2_depth = lite$addInt(lite_m2_depth, 1n, 55749);
                    lite_m2_cursor = lite$addInt(lite_m2_cursor, 1n, 55786);
                } else if (((lite_m2_ch) === (")"))) {
                    lite_m2_depth = lite$subtractInt(lite_m2_depth, 1n, 55855);
                    lite_m2_cursor = lite$addInt(lite_m2_cursor, 1n, 55892);
                    if (((lite_m2_depth) === (0n))) {
                        return { text: lite$textSlice(lite_source, lite_m2_start, lite_m2_cursor, 55964), next: lite_m2_cursor };
                    }
                } else {
                    lite_m2_cursor = lite$addInt(lite_m2_cursor, 1n, 56085);
                }
            }
            return { text: lite$textSlice(lite_source, lite_m2_start, lite_m2_size, 56130), next: lite_m2_size };
        } else {
            const lite_m2_parsedName = liteFn_m2_typeNameAt(lite_source, lite_m2_start, lite_prefix);
            void lite_m2_parsedName;
            const lite_m2_after = (lite_m2_parsedName).next;
            void lite_m2_after;
            const lite_m2_afterName = liteFn_m2_skipTrivia(lite_source, lite_m2_after, lite_prefix);
            void lite_m2_afterName;
            if (((((lite_m2_afterName) < (lite_m2_size))) && (((lite$textAt(lite_source, lite_m2_afterName, 56367)) === ("<"))))) {
                let lite_m2_cursor = lite_m2_afterName;
                void lite_m2_cursor;
                let lite_m2_depth = 0n;
                void lite_m2_depth;
                while (((lite_m2_cursor) < (lite_m2_size))) {
                    const lite_m2_ch = lite$textAt(lite_source, lite_m2_cursor, 56522);
                    void lite_m2_ch;
                    if (liteFn_m3_startsWithAt(lite_source, lite_m2_cursor, "/*")) {
                        lite_m2_cursor = liteFn_m2_skipComment(lite_source, lite_m2_cursor, lite_prefix);
                    } else if (((lite_m2_ch) === ("<"))) {
                        lite_m2_depth = lite$addInt(lite_m2_depth, 1n, 56748);
                        lite_m2_cursor = lite$addInt(lite_m2_cursor, 1n, 56789);
                    } else if (((lite_m2_ch) === (">"))) {
                        lite_m2_depth = lite$subtractInt(lite_m2_depth, 1n, 56866);
                        lite_m2_cursor = lite$addInt(lite_m2_cursor, 1n, 56907);
                        if (((lite_m2_depth) === (0n))) {
                            return { text: lite$textSlice(lite_source, lite_m2_start, lite_m2_cursor, 56987), next: lite_m2_cursor };
                        }
                    } else {
                        lite_m2_cursor = lite$addInt(lite_m2_cursor, 1n, 57120);
                    }
                }
                return { text: lite$textSlice(lite_source, lite_m2_start, lite_m2_size, 57177), next: lite_m2_size };
            } else {
                return { text: lite$textSlice(lite_source, lite_m2_start, lite_m2_after, 57259), next: lite_m2_after };
            }
        }
    }
    void liteFn_m2_collectTypeTarget;
    function liteFn_m2_collectAliases(lite_source: string, lite_prefix: string): { name: string; target: string; at: bigint; end: bigint }[] {
        void lite_source;
        void lite_prefix;
        const lite_m2_aliases: { name: string; target: string; at: bigint; end: bigint }[] = [...([])];
        void lite_m2_aliases;
        const lite_m2_size = lite$textLength(lite_source);
        void lite_m2_size;
        let lite_m2_position = 0n;
        void lite_m2_position;
        let lite_m2_depth = 0n;
        void lite_m2_depth;
        while (((lite_m2_position) < (lite_m2_size))) {
            lite_m2_position = liteFn_m2_skipTrivia(lite_source, lite_m2_position, lite_prefix);
            if (((lite_m2_position) >= (lite_m2_size))) {
                break;
            }
            const lite_m2_ch = lite$textAt(lite_source, lite_m2_position, 57792);
            void lite_m2_ch;
            if (((lite_m2_ch) === ("\""))) {
                lite_m2_position = liteFn_m2_skipAliasString(lite_source, lite_m2_position);
            } else if (((lite_m2_ch) === ("{"))) {
                lite_m2_depth = lite$addInt(lite_m2_depth, 1n, 57956);
                lite_m2_position = lite$addInt(lite_m2_position, 1n, 57993);
            } else if (((lite_m2_ch) === ("}"))) {
                if (((lite_m2_depth) > (0n))) {
                    lite_m2_depth = lite$subtractInt(lite_m2_depth, 1n, 58069);
                }
                lite_m2_position = lite$addInt(lite_m2_position, 1n, 58108);
            } else if (((((lite_m2_depth) === (0n))) && (liteFn_m3_isNameStart(lite_m2_ch)))) {
                const lite_m2_nameStart = lite_m2_position;
                void lite_m2_nameStart;
                const lite_m2_afterName = liteFn_m3_skipName(lite_source, lite_m2_position);
                void lite_m2_afterName;
                const lite_m2_name = lite$textSlice(lite_source, lite_m2_nameStart, lite_m2_afterName, 58288);
                void lite_m2_name;
                const lite_m2_aliasPosition = liteFn_m2_skipTrivia(lite_source, lite_m2_afterName, lite_prefix);
                void lite_m2_aliasPosition;
                if (liteFn_m3_startsWithAt(lite_source, lite_m2_aliasPosition, ":=")) {
                    const lite_m2_typePosition = liteFn_m2_skipTrivia(lite_source, lite$addInt(lite_m2_aliasPosition, 2n, 58529), lite_prefix);
                    void lite_m2_typePosition;
                    if (liteFn_m3_wordAt(lite_source, lite_m2_typePosition, "type")) {
                        const lite_m2_targetStart = liteFn_m2_skipTrivia(lite_source, lite$addInt(lite_m2_typePosition, 4n, 58676), lite_prefix);
                        void lite_m2_targetStart;
                        const lite_m2_target = liteFn_m2_collectTypeTarget(lite_source, lite_m2_targetStart, lite_prefix);
                        void lite_m2_target;
                        lite_m2_aliases.push({ name: lite_m2_name, target: (lite_m2_target).text, at: lite_m2_nameStart, end: (lite_m2_target).next });
                        lite_m2_position = (lite_m2_target).next;
                        continue;
                    }
                }
                lite_m2_position = lite_m2_afterName;
            } else {
                lite_m2_position = lite$addInt(lite_m2_position, 1n, 59073);
            }
        }
        return [...(lite_m2_aliases)];
    }
    void liteFn_m2_collectAliases;
    function liteFn_m2_isSingleEquals(lite_source: string, lite_position: bigint): boolean {
        void lite_source;
        void lite_position;
        return ((((liteFn_m3_startsWithAt(lite_source, lite_position, "=")) && ((!(liteFn_m3_startsWithAt(lite_source, lite_position, "==")))))) && ((!(liteFn_m3_startsWithAt(lite_source, lite_position, "=!=")))));
    }
    void liteFn_m2_isSingleEquals;
    function liteFn_m2_looksLikeTupleEntry(lite_source: string, lite_position: bigint, lite_prefix: string): boolean {
        void lite_source;
        void lite_position;
        void lite_prefix;
        const lite_m2_start = liteFn_m2_skipTrivia(lite_source, lite_position, lite_prefix);
        void lite_m2_start;
        if (((((lite_m2_start) >= (lite$textLength(lite_source)))) || ((!(liteFn_m3_isNameStart(lite$textAt(lite_source, lite_m2_start, 59740))))))) {
            return false;
        }
        const lite_m2_afterName = liteFn_m2_skipTrivia(lite_source, liteFn_m3_skipName(lite_source, lite_m2_start), lite_prefix);
        void lite_m2_afterName;
        return liteFn_m2_isSingleEquals(lite_source, lite_m2_afterName);
    }
    void liteFn_m2_looksLikeTupleEntry;
    function liteFn_m2_copiedValueCode(lite_target: string, lite_kind: string, lite_code: string): string {
        void lite_target;
        void lite_kind;
        void lite_code;
        return (Boolean(liteFn_m2_isListKind(lite_kind)) ? liteFn_m2_targetListCopyCode(lite_target, lite_code) : lite_code);
    }
    void liteFn_m2_copiedValueCode;
    function liteFn_m2_isAdmittedBuiltin(lite_name: string): boolean {
        void lite_name;
        return ((((((((((((((((((((((lite_name) === ("inputArgs"))) || (((lite_name) === ("inputAll"))))) || (((lite_name) === ("inputLine"))))) || (((lite_name) === ("inputInt"))))) || (((lite_name) === ("inputFloat"))))) || (((lite_name) === ("reportError"))))) || (((lite_name) === ("exit"))))) || (((lite_name) === ("textLength"))))) || (((lite_name) === ("textAt"))))) || (((lite_name) === ("textSlice"))))) || (((lite_name) === ("readSource"))));
    }
    void liteFn_m2_isAdmittedBuiltin;
    function liteFn_m2_builtinArity(lite_name: string): bigint {
        void lite_name;
        return (Boolean(((lite_name) === ("inputArgs"))) ? 0n : (Boolean(((lite_name) === ("textAt"))) ? 2n : (Boolean(((lite_name) === ("textSlice"))) ? 3n : (Boolean(((lite_name) === ("readSource"))) ? 2n : 1n))));
    }
    void liteFn_m2_builtinArity;
    function liteFn_m2_builtinParameterKind(lite_name: string, lite_index: bigint): string {
        void lite_name;
        void lite_index;
        return (Boolean(((((((((((((lite_name) === ("reportError"))) || (((lite_name) === ("textLength"))))) || (((lite_name) === ("inputAll"))))) || (((lite_name) === ("inputLine"))))) || (((lite_name) === ("inputInt"))))) || (((lite_name) === ("inputFloat"))))) ? "String" : (Boolean(((lite_name) === ("readSource"))) ? "String" : (Boolean(((((lite_name) === ("textAt"))) || (((lite_name) === ("textSlice"))))) ? (Boolean(((lite_index) === (0n))) ? "String" : "Int") : "Int")));
    }
    void liteFn_m2_builtinParameterKind;
    function liteFn_m2_builtinResultKind(lite_name: string): string {
        void lite_name;
        return (Boolean(((lite_name) === ("inputArgs"))) ? "List<String>" : (Boolean(((lite_name) === ("readSource"))) ? "(path:String,text:String)" : (Boolean(((((((((lite_name) === ("inputAll"))) || (((lite_name) === ("inputLine"))))) || (((lite_name) === ("textAt"))))) || (((lite_name) === ("textSlice"))))) ? "String" : (Boolean(((((lite_name) === ("textLength"))) || (((lite_name) === ("inputInt"))))) ? "Int" : (Boolean(((lite_name) === ("inputFloat"))) ? "Float" : "Unit")))));
    }
    void liteFn_m2_builtinResultKind;
    function liteFn_m2_expectNonemptyCallClose(lite_source: string, lite_position: bigint, lite_prefix: string): bigint {
        void lite_source;
        void lite_position;
        void lite_prefix;
        let lite_m2_cursor = liteFn_m2_skipTrivia(lite_source, lite_position, lite_prefix);
        void lite_m2_cursor;
        if (((((lite_m2_cursor) < (lite$textLength(lite_source)))) && (((lite$textAt(lite_source, lite_m2_cursor, 62024)) === (","))))) {
            lite_m2_cursor = liteFn_m2_skipTrivia(lite_source, lite$addInt(lite_m2_cursor, 1n, 62091), lite_prefix);
        }
        return liteFn_m2_expectSymbol(lite_source, lite_m2_cursor, ")", lite_prefix);
    }
    void liteFn_m2_expectNonemptyCallClose;
    function liteFn_m2_parseListGrant(lite_source: string, lite_open: bigint, lite_prefix: string, lite_locals: { name: string; runtime: string; kind: string; mutable: boolean; writable: boolean; depth: bigint; constant: boolean; code: string; intValue: bigint; textValue: string }[], lite_operation: string): { runtime: string; kind: string; next: bigint } {
        void lite_source;
        void lite_open;
        void lite_prefix;
        void lite_locals;
        void lite_operation;
        let lite_m2_cursor = liteFn_m2_skipTrivia(lite_source, lite$addInt(lite_open, 1n, 62507), lite_prefix);
        void lite_m2_cursor;
        if ((!(liteFn_m3_wordAt(lite_source, lite_m2_cursor, "mut")))) {
            liteFn_m2_failAt(lite_source, lite_m2_cursor, lite_prefix, ((lite_operation) + (" requires mut list argument")));
        }
        lite_m2_cursor = liteFn_m2_skipTrivia(lite_source, lite$addInt(lite_m2_cursor, 3n, 62700), lite_prefix);
        if (((((lite_m2_cursor) >= (lite$textLength(lite_source)))) || ((!(liteFn_m3_isNameStart(lite$textAt(lite_source, lite_m2_cursor, 62777))))))) {
            liteFn_m2_failAt(lite_source, lite_m2_cursor, lite_prefix, "expected a list name after mut");
        }
        const lite_m2_nameEnd = liteFn_m3_skipName(lite_source, lite_m2_cursor);
        void lite_m2_nameEnd;
        const lite_m2_listName = lite$textSlice(lite_source, lite_m2_cursor, lite_m2_nameEnd, 62948);
        void lite_m2_listName;
        const lite_m2_index = liteFn_m2_localIndex([...(lite_locals)], lite_m2_listName);
        void lite_m2_index;
        if (((lite_m2_index) < (0n))) {
            liteFn_m2_failAt(lite_source, lite_m2_cursor, lite_prefix, (("unknown value ") + (lite_m2_listName)));
            return { runtime: "", kind: "", next: lite_m2_nameEnd };
        }
        const lite_m2_entry = lite$listAt((lite_locals), lite_m2_index, 63199);
        void lite_m2_entry;
        if ((!(liteFn_m2_isListKind((lite_m2_entry).kind)))) {
            liteFn_m2_failAt(lite_source, lite_m2_cursor, lite_prefix, ((((lite_operation) + (" requires a List value, got "))) + (liteFn_m2_displayKind((lite_m2_entry).kind))));
        }
        if ((!((lite_m2_entry).writable))) {
            liteFn_m2_failAt(lite_source, lite_m2_cursor, lite_prefix, (((("cannot mutate list ") + (lite_m2_listName))) + (" without mut")));
        }
        return { runtime: (lite_m2_entry).runtime, kind: (lite_m2_entry).kind, next: lite_m2_nameEnd };
    }
    void liteFn_m2_parseListGrant;
    function liteFn_m2_scanParenEnd(lite_source: string, lite_open: bigint, lite_prefix: string): bigint {
        void lite_source;
        void lite_open;
        void lite_prefix;
        let lite_m2_cursor = lite_open;
        void lite_m2_cursor;
        let lite_m2_depth = 0n;
        void lite_m2_depth;
        const lite_m2_size = lite$textLength(lite_source);
        void lite_m2_size;
        while (((lite_m2_cursor) < (lite_m2_size))) {
            const lite_m2_ch = lite$textAt(lite_source, lite_m2_cursor, 63853);
            void lite_m2_ch;
            if (((lite_m2_ch) === ("\""))) {
                lite_m2_cursor = liteFn_m2_skipAliasString(lite_source, lite_m2_cursor);
            } else if (liteFn_m3_startsWithAt(lite_source, lite_m2_cursor, "/*")) {
                lite_m2_cursor = liteFn_m2_skipComment(lite_source, lite_m2_cursor, lite_prefix);
            } else if (((lite_m2_ch) === ("("))) {
                lite_m2_depth = lite$addInt(lite_m2_depth, 1n, 64096);
                lite_m2_cursor = lite$addInt(lite_m2_cursor, 1n, 64117);
            } else if (((lite_m2_ch) === (")"))) {
                lite_m2_depth = lite$subtractInt(lite_m2_depth, 1n, 64178);
                lite_m2_cursor = lite$addInt(lite_m2_cursor, 1n, 64211);
                if (((lite_m2_depth) === (0n))) {
                    return lite_m2_cursor;
                }
            } else {
                lite_m2_cursor = lite$addInt(lite_m2_cursor, 1n, 64294);
            }
        }
        return (-1n);
    }
    void liteFn_m2_scanParenEnd;
    function liteFn_m2_parseBinary(lite_target: string, lite_source: string, lite_position: bigint, lite_prefix: string, lite_locals: { name: string; runtime: string; kind: string; mutable: boolean; writable: boolean; depth: bigint; constant: boolean; code: string; intValue: bigint; textValue: string }[], lite_functions: { name: string; runtime: string; result: string; first: bigint; count: bigint }[], lite_params: string[], lite_currentName: string, lite_expected: string, lite_minimum: bigint): { kind: string; code: string; intValue: bigint; textValue: string; constant: boolean; next: bigint } {
        void lite_target;
        void lite_source;
        void lite_position;
        void lite_prefix;
        void lite_locals;
        void lite_functions;
        void lite_params;
        void lite_currentName;
        void lite_expected;
        void lite_minimum;
        let lite_m2_start = liteFn_m2_skipTrivia(lite_source, lite_position, lite_prefix);
        void lite_m2_start;
        if (((lite_m2_start) >= (lite$textLength(lite_source)))) {
            liteFn_m2_failAt(lite_source, lite_m2_start, lite_prefix, "expected an Int, Float, String or Bool expression");
        }
        let lite_m2_leaderStart = (-1n);
        void lite_m2_leaderStart;
        let lite_m2_leaderText = "";
        void lite_m2_leaderText;
        if (((((lite_minimum) === (0n))) && ((((liteFn_m3_wordAt(lite_source, lite_m2_start, "and")) || (liteFn_m3_wordAt(lite_source, lite_m2_start, "or"))))))) {
            lite_m2_leaderStart = lite_m2_start;
            const lite_m2_leaderEnd = liteFn_m3_skipName(lite_source, lite_m2_start);
            void lite_m2_leaderEnd;
            lite_m2_leaderText = lite$textSlice(lite_source, lite_m2_start, lite_m2_leaderEnd, 65407);
            lite_m2_start = liteFn_m2_skipTrivia(lite_source, lite_m2_leaderEnd, lite_prefix);
            if (((liteFn_m3_wordAt(lite_source, lite_m2_start, "and")) || (liteFn_m3_wordAt(lite_source, lite_m2_start, "or")))) {
                liteFn_m2_failAt(lite_source, lite_m2_start, lite_prefix, (((("leading ") + (lite_m2_leaderText))) + (" may appear only once")));
            }
        }
        let lite_m2_left = liteFn_m2_intParsed("", 0n, true, lite_m2_start);
        void lite_m2_left;
        const lite_m2_ch = lite$textAt(lite_source, lite_m2_start, 65755);
        void lite_m2_ch;
        if (((lite_m2_ch) === ("("))) {
            if (((lite$textAt(lite_source, liteFn_m2_skipTrivia(lite_source, lite$addInt(lite_m2_start, 1n, 65848), lite_prefix), 65808)) === (")"))) {
                lite_m2_left = { kind: "Unit", code: liteFn_m2_targetUnitLiteralCode(lite_target), intValue: 0n, textValue: "", constant: true, next: lite$addInt(liteFn_m2_skipTrivia(lite_source, lite$addInt(lite_m2_start, 1n, 66023), lite_prefix), 1n, 66036) };
            } else if (liteFn_m2_looksLikeTupleEntry(lite_source, lite$addInt(lite_m2_start, 1n, 66094), lite_prefix)) {
                let lite_m2_cursor = liteFn_m2_skipTrivia(lite_source, lite$addInt(lite_m2_start, 1n, 66160), lite_prefix);
                void lite_m2_cursor;
                const lite_m2_labels: string[] = [...([])];
                void lite_m2_labels;
                const lite_m2_codes: string[] = [...([])];
                void lite_m2_codes;
                const lite_m2_kinds: string[] = [...([])];
                void lite_m2_kinds;
                let lite_m2_count = 0n;
                void lite_m2_count;
                while (Boolean(true)) {
                    if (((((lite_m2_cursor) >= (lite$textLength(lite_source)))) || ((!(liteFn_m3_isNameStart(lite$textAt(lite_source, lite_m2_cursor, 66428))))))) {
                        liteFn_m2_failAt(lite_source, lite_m2_cursor, lite_prefix, "expected a tuple field name");
                    }
                    const lite_m2_labelStart = lite_m2_cursor;
                    void lite_m2_labelStart;
                    lite_m2_cursor = liteFn_m3_skipName(lite_source, lite_m2_cursor);
                    const lite_m2_label = lite$textSlice(lite_source, lite_m2_labelStart, lite_m2_cursor, 66677);
                    void lite_m2_label;
                    if (liteFn_m2_isReservedWord(lite_m2_label)) {
                        liteFn_m2_unsupportedFeature(lite_source, lite_m2_labelStart, lite_m2_label, lite_prefix);
                    }
                    if (liteFn_m6_listContainsText([...(lite_m2_labels)], lite_m2_label)) {
                        liteFn_m2_failAt(lite_source, lite_m2_labelStart, lite_prefix, (("duplicate tuple field ") + (lite_m2_label)));
                    }
                    lite_m2_labels.push(lite_m2_label);
                    lite_m2_cursor = liteFn_m2_skipTrivia(lite_source, lite_m2_cursor, lite_prefix);
                    if ((!(liteFn_m2_isSingleEquals(lite_source, lite_m2_cursor)))) {
                        liteFn_m2_failAt(lite_source, lite_m2_cursor, lite_prefix, (("expected = after tuple field ") + (lite_m2_label)));
                    }
                    lite_m2_cursor = liteFn_m2_skipTrivia(lite_source, lite$addInt(lite_m2_cursor, 1n, 67310), lite_prefix);
                    const lite_m2_fieldExpected = (Boolean(liteFn_m2_isTupleKind(lite_expected)) ? liteFn_m2_tupleFieldKind(lite_expected, lite_m2_label) : "");
                    void lite_m2_fieldExpected;
                    const lite_m2_value = liteFn_m2_parseBinary(lite_target, lite_source, lite_m2_cursor, lite_prefix, [...(lite_locals)], [...(lite_functions)], [...(lite_params)], lite_currentName, lite_m2_fieldExpected, 0n);
                    void lite_m2_value;
                    if (liteFn_m2_isTupleKind((lite_m2_value).kind)) {
                        liteFn_m2_failAt(lite_source, lite_m2_cursor, lite_prefix, "nested tuple values are not supported");
                    }
                    if (liteFn_m2_isListKind((lite_m2_value).kind)) {
                        liteFn_m2_failAt(lite_source, lite_m2_cursor, lite_prefix, "list values inside tuples are not supported");
                    }
                    if ((((lite_m2_value).kind) === ("Unit"))) {
                        liteFn_m2_failAt(lite_source, lite_m2_cursor, lite_prefix, (((("tuple field ") + (lite_m2_label))) + (" cannot be Unit")));
                    }
                    lite_m2_codes.push((lite_m2_value).code);
                    lite_m2_kinds.push((lite_m2_value).kind);
                    lite_m2_count = lite$addInt(lite_m2_count, 1n, 68155);
                    lite_m2_cursor = liteFn_m2_skipTrivia(lite_source, (lite_m2_value).next, lite_prefix);
                    if (((((lite_m2_cursor) < (lite$textLength(lite_source)))) && (((lite$textAt(lite_source, lite_m2_cursor, 68276)) === (","))))) {
                        lite_m2_cursor = liteFn_m2_skipTrivia(lite_source, lite$addInt(lite_m2_cursor, 1n, 68363), lite_prefix);
                    } else {
                        break;
                    }
                }
                lite_m2_cursor = liteFn_m2_expectSymbol(lite_source, lite_m2_cursor, ")", lite_prefix);
                let lite_m2_kindText = "(";
                void lite_m2_kindText;
                let lite_m2_codeText = "{ ";
                void lite_m2_codeText;
                let lite_m2_index = 0n;
                void lite_m2_index;
                while (((lite_m2_index) < (lite_m2_count))) {
                    if (((lite_m2_index) > (0n))) {
                        lite_m2_kindText = ((lite_m2_kindText) + (","));
                        lite_m2_codeText = ((lite_m2_codeText) + (", "));
                    }
                    lite_m2_kindText = ((((((lite_m2_kindText) + (lite$listAt((lite_m2_labels), lite_m2_index, 68842)))) + (":"))) + (lite$listAt((lite_m2_kinds), lite_m2_index, 68863)));
                    lite_m2_codeText = ((((((lite_m2_codeText) + (lite$listAt((lite_m2_labels), lite_m2_index, 68916)))) + (": "))) + (lite$listAt((lite_m2_codes), lite_m2_index, 68938)));
                    lite_m2_index = lite$addInt(lite_m2_index, 1n, 68976);
                }
                lite_m2_left = { kind: ((lite_m2_kindText) + (")")), code: ((lite_m2_codeText) + (" }")), intValue: 0n, textValue: "", constant: false, next: lite_m2_cursor };
            } else {
                let lite_m2_groupedExpected = lite_expected;
                void lite_m2_groupedExpected;
                if (((lite_expected) === ("Float"))) {
                    const lite_m2_groupEnd = liteFn_m2_scanParenEnd(lite_source, lite_m2_start, lite_prefix);
                    void lite_m2_groupEnd;
                    if (((((lite_m2_groupEnd) >= (0n))) && (liteFn_m2_binaryFollows(lite_source, lite_m2_groupEnd, lite_prefix, lite_minimum)))) {
                        lite_m2_groupedExpected = "";
                    }
                }
                const lite_m2_inner = liteFn_m2_parseBinary(lite_target, lite_source, lite$addInt(lite_m2_start, 1n, 69464), lite_prefix, [...(lite_locals)], [...(lite_functions)], [...(lite_params)], lite_currentName, lite_m2_groupedExpected, 0n);
                void lite_m2_inner;
                const lite_m2_next = liteFn_m2_expectSymbol(lite_source, liteFn_m2_skipTrivia(lite_source, (lite_m2_inner).next, lite_prefix), ")", lite_prefix);
                void lite_m2_next;
                lite_m2_left = { kind: (lite_m2_inner).kind, code: (((("(") + ((lite_m2_inner).code))) + (")")), intValue: (lite_m2_inner).intValue, textValue: (lite_m2_inner).textValue, constant: (lite_m2_inner).constant, next: lite_m2_next };
            }
        } else if (((((lite_m2_ch) === ("+"))) || (((lite_m2_ch) === ("-"))))) {
            const lite_m2_after = liteFn_m2_skipTrivia(lite_source, lite$addInt(lite_m2_start, 1n, 69891), lite_prefix);
            void lite_m2_after;
            if (((((lite_m2_after) < (lite$textLength(lite_source)))) && (liteFn_m3_isDigit(lite$textAt(lite_source, lite_m2_after, 69963))))) {
                lite_m2_left = liteFn_m2_parseNumber(lite_target, lite_source, lite_m2_start, lite_prefix);
                if (((((lite_expected) === ("Float"))) && (((lite_m2_ch) === ("-"))))) {
                    lite_m2_left = liteFn_m2_floatContextNumber(lite_target, lite_source, lite_m2_start, lite_prefix, lite_m2_left, lite_minimum);
                }
            } else {
                const lite_m2_operand = liteFn_m2_parseBinary(lite_target, lite_source, lite$addInt(lite_m2_start, 1n, 70244), lite_prefix, [...(lite_locals)], [...(lite_functions)], [...(lite_params)], lite_currentName, "", 30n);
                void lite_m2_operand;
                if ((((((lite_m2_operand).kind) !== ("Int"))) && ((((lite_m2_operand).kind) !== ("Float"))))) {
                    liteFn_m2_failAt(lite_source, lite_m2_start, lite_prefix, (((("unary ") + (lite_m2_ch))) + (" requires an Int or Float operand")));
                }
                const lite_m2_code = (Boolean(((lite_m2_ch) === ("-"))) ? (((("(-") + ((lite_m2_operand).code))) + (")")) : (((("(") + ((lite_m2_operand).code))) + (")")));
                void lite_m2_code;
                if ((((lite_m2_operand).kind) === ("Float"))) {
                    lite_m2_left = { kind: "Float", code: lite_m2_code, intValue: 0n, textValue: "", constant: false, next: (lite_m2_operand).next };
                } else if ((lite_m2_operand).constant) {
                    const lite_m2_folded = (Boolean(((lite_m2_ch) === ("-"))) ? liteFn_m4_intNegate((lite_m2_operand).intValue) : { value: (lite_m2_operand).intValue, ok: true });
                    void lite_m2_folded;
                    if ((lite_m2_folded).ok) {
                        lite_m2_left = liteFn_m2_intParsed(lite_m2_code, (lite_m2_folded).value, true, (lite_m2_operand).next);
                    } else {
                        lite_m2_left = liteFn_m2_intParsed(liteFn_m2_targetIntNegateCode(lite_target, (lite_m2_operand).code, lite_m2_start), 0n, false, (lite_m2_operand).next);
                    }
                } else {
                    const lite_m2_runtimeCode = (Boolean(((lite_m2_ch) === ("-"))) ? liteFn_m2_targetIntNegateCode(lite_target, (lite_m2_operand).code, lite_m2_start) : lite_m2_code);
                    void lite_m2_runtimeCode;
                    lite_m2_left = liteFn_m2_intParsed(lite_m2_runtimeCode, 0n, false, (lite_m2_operand).next);
                }
            }
        } else if (liteFn_m3_isDigit(lite_m2_ch)) {
            lite_m2_left = liteFn_m2_parseNumber(lite_target, lite_source, lite_m2_start, lite_prefix);
            if (((lite_expected) === ("Float"))) {
                lite_m2_left = liteFn_m2_floatContextNumber(lite_target, lite_source, lite_m2_start, lite_prefix, lite_m2_left, lite_minimum);
            }
        } else if (((lite_m2_ch) === ("\""))) {
            lite_m2_left = liteFn_m2_parseText(lite_target, lite_source, lite_m2_start, lite_prefix);
        } else if (((lite_m2_ch) === ("["))) {
            let lite_m2_cursor = liteFn_m2_skipTrivia(lite_source, lite$addInt(lite_m2_start, 1n, 71715), lite_prefix);
            void lite_m2_cursor;
            let lite_m2_elementKind = "";
            void lite_m2_elementKind;
            if (liteFn_m2_isListKind(lite_expected)) {
                lite_m2_elementKind = liteFn_m2_listElementKind(lite_expected);
            }
            const lite_m2_elementCodes: string[] = [...([])];
            void lite_m2_elementCodes;
            let lite_m2_count = 0n;
            void lite_m2_count;
            while (Boolean(true)) {
                if (((lite_m2_cursor) >= (lite$textLength(lite_source)))) {
                    liteFn_m2_failAt(lite_source, lite_m2_cursor, lite_prefix, "expected ] in list literal");
                }
                if (((lite$textAt(lite_source, lite_m2_cursor, 72079)) === ("]"))) {
                    break;
                }
                const lite_m2_elementStart = lite_m2_cursor;
                void lite_m2_elementStart;
                const lite_m2_element = liteFn_m2_parseBinary(lite_target, lite_source, lite_m2_cursor, lite_prefix, [...(lite_locals)], [...(lite_functions)], [...(lite_params)], lite_currentName, lite_m2_elementKind, 0n);
                void lite_m2_element;
                if ((((lite_m2_element).kind) === ("Unit"))) {
                    liteFn_m2_failAt(lite_source, lite_m2_elementStart, lite_prefix, (((("list element ") + (liteFn_m5_decimalText(lite$addInt(lite_m2_count, 1n, 72412))))) + (" cannot be Unit")));
                }
                if (liteFn_m2_isListKind((lite_m2_element).kind)) {
                    liteFn_m2_failAt(lite_source, lite_m2_elementStart, lite_prefix, "nested list types are not supported");
                }
                if (((lite_m2_elementKind) === (""))) {
                    lite_m2_elementKind = (lite_m2_element).kind;
                } else if ((((lite_m2_element).kind) !== (lite_m2_elementKind))) {
                    liteFn_m2_failAt(lite_source, lite_m2_elementStart, lite_prefix, (((((((((("list element ") + (liteFn_m5_decimalText(lite$addInt(lite_m2_count, 1n, 72833))))) + (" must be "))) + (liteFn_m2_displayKind(lite_m2_elementKind)))) + (", got "))) + (liteFn_m2_displayKind((lite_m2_element).kind))));
                }
                lite_m2_elementCodes.push((lite_m2_element).code);
                lite_m2_count = lite$addInt(lite_m2_count, 1n, 73035);
                lite_m2_cursor = liteFn_m2_skipTrivia(lite_source, (lite_m2_element).next, lite_prefix);
                if (((((lite_m2_cursor) < (lite$textLength(lite_source)))) && (((lite$textAt(lite_source, lite_m2_cursor, 73150)) === (","))))) {
                    lite_m2_cursor = liteFn_m2_skipTrivia(lite_source, lite$addInt(lite_m2_cursor, 1n, 73233), lite_prefix);
                } else {
                    break;
                }
            }
            lite_m2_cursor = liteFn_m2_expectSymbol(lite_source, lite_m2_cursor, "]", lite_prefix);
            if (((((lite_m2_count) === (0n))) && (((lite_m2_elementKind) === (""))))) {
                liteFn_m2_failAt(lite_source, lite_m2_start, lite_prefix, "empty list literal requires a List element type");
            }
            lite_m2_left = { kind: (((("List<") + (lite_m2_elementKind))) + (">")), code: (((("[") + (liteFn_m3_joinTexts([...(lite_m2_elementCodes)], ", ")))) + ("]")), intValue: 0n, textValue: "", constant: false, next: lite_m2_cursor };
        } else if (liteFn_m3_isNameStart(lite_m2_ch)) {
            const lite_m2_nameStart = lite_m2_start;
            void lite_m2_nameStart;
            const lite_m2_next = liteFn_m3_skipName(lite_source, lite_m2_start);
            void lite_m2_next;
            const lite_m2_name = lite$textSlice(lite_source, lite_m2_nameStart, lite_m2_next, 73844);
            void lite_m2_name;
            if (((lite_m2_name) === ("Unit"))) {
                lite_m2_left = { kind: "Unit", code: liteFn_m2_targetUnitLiteralCode(lite_target), intValue: 0n, textValue: "", constant: true, next: lite_m2_next };
            } else if (((lite_m2_name) === ("true"))) {
                lite_m2_left = liteFn_m2_boolParsed(liteFn_m2_targetBoolLiteralCode(lite_target, true), true, true, lite_m2_next);
            } else if (((lite_m2_name) === ("false"))) {
                lite_m2_left = liteFn_m2_boolParsed(liteFn_m2_targetBoolLiteralCode(lite_target, false), false, true, lite_m2_next);
            } else if (((lite_m2_name) === ("not"))) {
                const lite_m2_operand = liteFn_m2_parseBinary(lite_target, lite_source, lite_m2_next, lite_prefix, [...(lite_locals)], [...(lite_functions)], [...(lite_params)], lite_currentName, "", 5n);
                void lite_m2_operand;
                if ((((lite_m2_operand).kind) !== ("Bool"))) {
                    liteFn_m2_failAt(lite_source, lite_m2_nameStart, lite_prefix, "not requires a Bool operand");
                }
                if ((lite_m2_operand).constant) {
                    const lite_m2_value = (((lite_m2_operand).intValue) === (0n));
                    void lite_m2_value;
                    lite_m2_left = liteFn_m2_boolParsed(liteFn_m2_targetBoolLiteralCode(lite_target, lite_m2_value), lite_m2_value, true, (lite_m2_operand).next);
                } else {
                    lite_m2_left = liteFn_m2_boolParsed(liteFn_m2_targetNotCode(lite_target, (lite_m2_operand).code), false, false, (lite_m2_operand).next);
                }
            } else if (((lite_m2_name) === ("if"))) {
                let lite_m2_cursor = liteFn_m2_skipTrivia(lite_source, lite_m2_next, lite_prefix);
                void lite_m2_cursor;
                const lite_m2_conditionStart = lite_m2_cursor;
                void lite_m2_conditionStart;
                const lite_m2_condition = liteFn_m2_parseBinary(lite_target, lite_source, lite_m2_cursor, lite_prefix, [...(lite_locals)], [...(lite_functions)], [...(lite_params)], lite_currentName, "", 0n);
                void lite_m2_condition;
                if ((((lite_m2_condition).kind) !== ("Bool"))) {
                    liteFn_m2_failAt(lite_source, lite_m2_conditionStart, lite_prefix, "if condition must be Bool");
                }
                const lite_m2_conditionCode = (Boolean((lite_m2_condition).constant) ? liteFn_m2_targetBoolLiteralCode(lite_target, (((lite_m2_condition).intValue) !== (0n))) : (lite_m2_condition).code);
                void lite_m2_conditionCode;
                lite_m2_cursor = liteFn_m2_expectSymbol(lite_source, liteFn_m2_skipTrivia(lite_source, (lite_m2_condition).next, lite_prefix), "{", lite_prefix);
                const lite_m2_branchStart = liteFn_m2_skipTrivia(lite_source, lite_m2_cursor, lite_prefix);
                void lite_m2_branchStart;
                const lite_m2_first = liteFn_m2_parseBinary(lite_target, lite_source, lite_m2_branchStart, lite_prefix, [...(lite_locals)], [...(lite_functions)], [...(lite_params)], lite_currentName, lite_expected, 0n);
                void lite_m2_first;
                lite_m2_cursor = liteFn_m2_expectSymbol(lite_source, liteFn_m2_skipTrivia(lite_source, (lite_m2_first).next, lite_prefix), "}", lite_prefix);
                const lite_m2_conditionCodes: string[] = [...([])];
                void lite_m2_conditionCodes;
                const lite_m2_branchCodes: string[] = [...([])];
                void lite_m2_branchCodes;
                lite_m2_conditionCodes.push(lite_m2_conditionCode);
                lite_m2_branchCodes.push((lite_m2_first).code);
                let lite_m2_resultKind = (lite_m2_first).kind;
                void lite_m2_resultKind;
                let lite_m2_branchCount = 1n;
                void lite_m2_branchCount;
                while (Boolean(true)) {
                    const lite_m2_afterBranch = liteFn_m2_skipTrivia(lite_source, lite_m2_cursor, lite_prefix);
                    void lite_m2_afterBranch;
                    if ((!(liteFn_m3_wordAt(lite_source, lite_m2_afterBranch, "else")))) {
                        liteFn_m2_failAt(lite_source, lite_m2_afterBranch, lite_prefix, "value if requires a final else");
                    }
                    const lite_m2_afterElse = liteFn_m2_skipTrivia(lite_source, lite$addInt(lite_m2_afterBranch, 4n, 76446), lite_prefix);
                    void lite_m2_afterElse;
                    if (liteFn_m3_wordAt(lite_source, lite_m2_afterElse, "if")) {
                        const lite_m2_elseConditionStart = liteFn_m2_skipTrivia(lite_source, lite$addInt(lite_m2_afterElse, 2n, 76592), lite_prefix);
                        void lite_m2_elseConditionStart;
                        const lite_m2_elseCondition = liteFn_m2_parseBinary(lite_target, lite_source, lite_m2_elseConditionStart, lite_prefix, [...(lite_locals)], [...(lite_functions)], [...(lite_params)], lite_currentName, "", 0n);
                        void lite_m2_elseCondition;
                        if ((((lite_m2_elseCondition).kind) !== ("Bool"))) {
                            liteFn_m2_failAt(lite_source, lite_m2_elseConditionStart, lite_prefix, "if condition must be Bool");
                        }
                        const lite_m2_elseConditionCode = (Boolean((lite_m2_elseCondition).constant) ? liteFn_m2_targetBoolLiteralCode(lite_target, (((lite_m2_elseCondition).intValue) !== (0n))) : (lite_m2_elseCondition).code);
                        void lite_m2_elseConditionCode;
                        const lite_m2_open = liteFn_m2_expectSymbol(lite_source, liteFn_m2_skipTrivia(lite_source, (lite_m2_elseCondition).next, lite_prefix), "{", lite_prefix);
                        void lite_m2_open;
                        const lite_m2_elseBranchStart = liteFn_m2_skipTrivia(lite_source, lite_m2_open, lite_prefix);
                        void lite_m2_elseBranchStart;
                        const lite_m2_branch = liteFn_m2_parseBinary(lite_target, lite_source, lite_m2_elseBranchStart, lite_prefix, [...(lite_locals)], [...(lite_functions)], [...(lite_params)], lite_currentName, lite_expected, 0n);
                        void lite_m2_branch;
                        if ((((lite_m2_branch).kind) !== (lite_m2_resultKind))) {
                            liteFn_m2_failAt(lite_source, lite_m2_elseBranchStart, lite_prefix, (((((("value if branches must have the same kind, got ") + (liteFn_m2_displayKind(lite_m2_resultKind)))) + (" and "))) + (liteFn_m2_displayKind((lite_m2_branch).kind))));
                        }
                        lite_m2_cursor = liteFn_m2_expectSymbol(lite_source, liteFn_m2_skipTrivia(lite_source, (lite_m2_branch).next, lite_prefix), "}", lite_prefix);
                        lite_m2_conditionCodes.push(lite_m2_elseConditionCode);
                        lite_m2_branchCodes.push((lite_m2_branch).code);
                        lite_m2_branchCount = lite$addInt(lite_m2_branchCount, 1n, 78039);
                    } else {
                        const lite_m2_open = liteFn_m2_expectSymbol(lite_source, lite_m2_afterElse, "{", lite_prefix);
                        void lite_m2_open;
                        const lite_m2_elseBranchStart = liteFn_m2_skipTrivia(lite_source, lite_m2_open, lite_prefix);
                        void lite_m2_elseBranchStart;
                        const lite_m2_branch = liteFn_m2_parseBinary(lite_target, lite_source, lite_m2_elseBranchStart, lite_prefix, [...(lite_locals)], [...(lite_functions)], [...(lite_params)], lite_currentName, lite_expected, 0n);
                        void lite_m2_branch;
                        if ((((lite_m2_branch).kind) !== (lite_m2_resultKind))) {
                            liteFn_m2_failAt(lite_source, lite_m2_elseBranchStart, lite_prefix, (((((("value if branches must have the same kind, got ") + (liteFn_m2_displayKind(lite_m2_resultKind)))) + (" and "))) + (liteFn_m2_displayKind((lite_m2_branch).kind))));
                        }
                        lite_m2_cursor = liteFn_m2_expectSymbol(lite_source, liteFn_m2_skipTrivia(lite_source, (lite_m2_branch).next, lite_prefix), "}", lite_prefix);
                        lite_m2_branchCodes.push((lite_m2_branch).code);
                        lite_m2_branchCount = lite$addInt(lite_m2_branchCount, 1n, 78839);
                        break;
                    }
                }
                let lite_m2_code = lite$listAt((lite_m2_branchCodes), lite$subtractInt(lite_m2_branchCount, 1n, 78951), 78939);
                void lite_m2_code;
                let lite_m2_index = lite$subtractInt(lite_m2_branchCount, 2n, 78994);
                void lite_m2_index;
                while (((lite_m2_index) >= (0n))) {
                    lite_m2_code = (((((((((((("(Boolean(") + (lite$listAt((lite_m2_conditionCodes), lite_m2_index, 79081)))) + (") ? "))) + (lite$listAt((lite_m2_branchCodes), lite_m2_index, 79111)))) + (" : "))) + (lite_m2_code))) + (")"));
                    lite_m2_index = lite$subtractInt(lite_m2_index, 1n, 79170);
                }
                lite_m2_left = { kind: lite_m2_resultKind, code: lite_m2_code, intValue: 0n, textValue: "", constant: false, next: lite_m2_cursor };
            } else {
                if (liteFn_m2_isReservedWord(lite_m2_name)) {
                    liteFn_m2_unsupportedFeature(lite_source, lite_m2_nameStart, lite_m2_name, lite_prefix);
                }
                const lite_m2_afterName = liteFn_m2_skipTrivia(lite_source, lite_m2_next, lite_prefix);
                void lite_m2_afterName;
                let lite_m2_callableIndex = liteFn_m2_findFunction([...(lite_functions)], lite_m2_name);
                void lite_m2_callableIndex;
                let lite_m2_calleeName = lite_m2_name;
                void lite_m2_calleeName;
                if (((lite_m2_name) === ("self"))) {
                    if (((lite_currentName) === (""))) {
                        liteFn_m2_failAt(lite_source, lite_m2_nameStart, lite_prefix, "self is only available inside a function");
                    }
                    lite_m2_calleeName = lite_currentName;
                    lite_m2_callableIndex = liteFn_m2_findFunction([...(lite_functions)], lite_currentName);
                }
                if (((((((lite_m2_callableIndex) >= (0n))) && (((lite_m2_afterName) < (lite$textLength(lite_source)))))) && (((lite$textAt(lite_source, lite_m2_afterName, 79961)) === ("("))))) {
                    const lite_m2_info = lite$listAt((lite_functions), lite_m2_callableIndex, 80030);
                    void lite_m2_info;
                    let lite_m2_cursor = liteFn_m2_skipTrivia(lite_source, lite$addInt(lite_m2_afterName, 1n, 80105), lite_prefix);
                    void lite_m2_cursor;
                    const lite_m2_argumentCodes: string[] = [...([])];
                    void lite_m2_argumentCodes;
                    let lite_m2_argumentCount = 0n;
                    void lite_m2_argumentCount;
                    if (((((lite_m2_cursor) < (lite$textLength(lite_source)))) && (((lite$textAt(lite_source, lite_m2_cursor, 80264)) !== (")"))))) {
                        while (Boolean(true)) {
                            if (((lite_m2_argumentCount) >= ((lite_m2_info).count))) {
                                const lite_m2_suffix = (Boolean((((lite_m2_info).count) === (1n))) ? " argument" : " arguments");
                                void lite_m2_suffix;
                                liteFn_m2_failAt(lite_source, lite_m2_nameStart, lite_prefix, (((((((((("function ") + (lite_m2_calleeName))) + (" expects "))) + (liteFn_m5_decimalText((lite_m2_info).count)))) + (lite_m2_suffix))) + (", got more")));
                            }
                            const lt_local_m2_expected_80695 = liteFn_m2_paramKindOf(lite$listAt((lite_params), lite$addInt((lite_m2_info).first, lite_m2_argumentCount, 80737), 80726));
                            void lt_local_m2_expected_80695;
                            const lite_m2_argument = liteFn_m2_parseBinary(lite_target, lite_source, lite_m2_cursor, lite_prefix, [...(lite_locals)], [...(lite_functions)], [...(lite_params)], lite_currentName, lt_local_m2_expected_80695, 0n);
                            void lite_m2_argument;
                            if ((((lite_m2_argument).kind) !== (lt_local_m2_expected_80695))) {
                                liteFn_m2_failAt(lite_source, lite_m2_cursor, lite_prefix, (((((((((((((("argument ") + (liteFn_m5_decimalText(lite$addInt(lite_m2_argumentCount, 1n, 81048))))) + (" of "))) + (lite_m2_calleeName))) + (" must be "))) + (liteFn_m2_displayKind(lt_local_m2_expected_80695)))) + (", got "))) + (liteFn_m2_displayKind((lite_m2_argument).kind))));
                            }
                            lite_m2_argumentCodes.push(liteFn_m2_copiedValueCode(lite_target, (lite_m2_argument).kind, (lite_m2_argument).code));
                            lite_m2_argumentCount = lite$addInt(lite_m2_argumentCount, 1n, 81376);
                            lite_m2_cursor = liteFn_m2_skipTrivia(lite_source, (lite_m2_argument).next, lite_prefix);
                            if (((((lite_m2_cursor) < (lite$textLength(lite_source)))) && (((lite$textAt(lite_source, lite_m2_cursor, 81516)) === (","))))) {
                                lite_m2_cursor = liteFn_m2_skipTrivia(lite_source, lite$addInt(lite_m2_cursor, 1n, 81611), lite_prefix);
                                if (((((lite_m2_cursor) < (lite$textLength(lite_source)))) && (((lite$textAt(lite_source, lite_m2_cursor, 81688)) === (")"))))) {
                                    break;
                                }
                            } else {
                                break;
                            }
                        }
                    }
                    lite_m2_cursor = liteFn_m2_expectSymbol(lite_source, lite_m2_cursor, ")", lite_prefix);
                    if (((lite_m2_argumentCount) !== ((lite_m2_info).count))) {
                        const lite_m2_suffix = (Boolean((((lite_m2_info).count) === (1n))) ? " argument" : " arguments");
                        void lite_m2_suffix;
                        liteFn_m2_failAt(lite_source, lite_m2_nameStart, lite_prefix, (((((((((((("function ") + (lite_m2_calleeName))) + (" expects "))) + (liteFn_m5_decimalText((lite_m2_info).count)))) + (lite_m2_suffix))) + (", got "))) + (liteFn_m5_decimalText(lite_m2_argumentCount))));
                    }
                    lite_m2_left = { kind: (lite_m2_info).result, code: (((((((lite_m2_info).runtime) + ("("))) + (liteFn_m3_joinTexts([...(lite_m2_argumentCodes)], ", ")))) + (")")), intValue: 0n, textValue: "", constant: false, next: lite_m2_cursor };
                } else if (((lite_m2_callableIndex) >= (0n))) {
                    liteFn_m2_failAt(lite_source, lite_m2_nameStart, lite_prefix, (((("function ") + (lite_m2_calleeName))) + (" must be called")));
                } else if (((liteFn_m2_isAdmittedBuiltin(lite_m2_name)) && (((liteFn_m2_localIndex([...(lite_locals)], lite_m2_name)) < (0n))))) {
                    if (((((lite_m2_afterName) >= (lite$textLength(lite_source)))) || (((lite$textAt(lite_source, lite_m2_afterName, 82778)) !== ("("))))) {
                        liteFn_m2_failAt(lite_source, lite_m2_nameStart, lite_prefix, ((lite_m2_name) + (" must be called")));
                    }
                    let lite_m2_builtinCursor = liteFn_m2_skipTrivia(lite_source, lite$addInt(lite_m2_afterName, 1n, 82979), lite_prefix);
                    void lite_m2_builtinCursor;
                    const lite_m2_builtinArityCount = liteFn_m2_builtinArity(lite_m2_name);
                    void lite_m2_builtinArityCount;
                    const lite_m2_builtinCodes: string[] = [...([])];
                    void lite_m2_builtinCodes;
                    let lite_m2_builtinCount = 0n;
                    void lite_m2_builtinCount;
                    if (((lite_m2_builtinArityCount) === (0n))) {
                        if (((((lite_m2_builtinCursor) < (lite$textLength(lite_source)))) && (((lite$textAt(lite_source, lite_m2_builtinCursor, 83248)) !== (")"))))) {
                            liteFn_m2_failAt(lite_source, lite_m2_nameStart, lite_prefix, ((lite_m2_name) + (" expects no arguments")));
                        }
                    } else {
                        if (((((lite_m2_builtinCursor) < (lite$textLength(lite_source)))) && (((lite$textAt(lite_source, lite_m2_builtinCursor, 83488)) !== (")"))))) {
                            while (Boolean(true)) {
                                if (((lite_m2_builtinCount) >= (lite_m2_builtinArityCount))) {
                                    const lite_m2_suffix = (Boolean(((lite_m2_builtinArityCount) === (1n))) ? " argument" : " arguments");
                                    void lite_m2_suffix;
                                    liteFn_m2_failAt(lite_source, lite_m2_nameStart, lite_prefix, ((((((((lite_m2_name) + (" expects "))) + (liteFn_m5_decimalText(lite_m2_builtinArityCount)))) + (lite_m2_suffix))) + (", got more")));
                                }
                                const lite_m2_builtinExpected = liteFn_m2_builtinParameterKind(lite_m2_name, lite_m2_builtinCount);
                                void lite_m2_builtinExpected;
                                const lite_m2_builtinStart = lite_m2_builtinCursor;
                                void lite_m2_builtinStart;
                                const lite_m2_builtinValue = liteFn_m2_parseBinary(lite_target, lite_source, lite_m2_builtinCursor, lite_prefix, [...(lite_locals)], [...(lite_functions)], [...(lite_params)], lite_currentName, lite_m2_builtinExpected, 0n);
                                void lite_m2_builtinValue;
                                if ((((lite_m2_builtinValue).kind) !== (lite_m2_builtinExpected))) {
                                    liteFn_m2_failAt(lite_source, lite_m2_builtinStart, lite_prefix, (((((((((((((("argument ") + (liteFn_m5_decimalText(lite$addInt(lite_m2_builtinCount, 1n, 84444))))) + (" of "))) + (lite_m2_name))) + (" must be "))) + (liteFn_m2_displayKind(lite_m2_builtinExpected)))) + (", got "))) + (liteFn_m2_displayKind((lite_m2_builtinValue).kind))));
                                }
                                lite_m2_builtinCodes.push((lite_m2_builtinValue).code);
                                lite_m2_builtinCount = lite$addInt(lite_m2_builtinCount, 1n, 84754);
                                lite_m2_builtinCursor = liteFn_m2_skipTrivia(lite_source, (lite_m2_builtinValue).next, lite_prefix);
                                if (((((lite_m2_builtinCursor) < (lite$textLength(lite_source)))) && (((lite$textAt(lite_source, lite_m2_builtinCursor, 84920)) === (","))))) {
                                    lite_m2_builtinCursor = liteFn_m2_skipTrivia(lite_source, lite$addInt(lite_m2_builtinCursor, 1n, 85040), lite_prefix);
                                    if (((((lite_m2_builtinCursor) < (lite$textLength(lite_source)))) && (((lite$textAt(lite_source, lite_m2_builtinCursor, 85128)) === (")"))))) {
                                        break;
                                    }
                                } else {
                                    break;
                                }
                            }
                        }
                    }
                    lite_m2_builtinCursor = liteFn_m2_expectSymbol(lite_source, lite_m2_builtinCursor, ")", lite_prefix);
                    const lite_m2_optionalPrompt = ((((((((lite_m2_name) === ("inputAll"))) || (((lite_m2_name) === ("inputLine"))))) || (((lite_m2_name) === ("inputInt"))))) || (((lite_m2_name) === ("inputFloat"))));
                    void lite_m2_optionalPrompt;
                    if (((((lite_m2_builtinCount) !== (lite_m2_builtinArityCount))) && ((!((((lite_m2_optionalPrompt) && (((lite_m2_builtinCount) === (0n)))))))))) {
                        const lite_m2_suffix = (Boolean(((lite_m2_builtinArityCount) === (1n))) ? " argument" : " arguments");
                        void lite_m2_suffix;
                        liteFn_m2_failAt(lite_source, lite_m2_nameStart, lite_prefix, ((((((((((lite_m2_name) + (" expects "))) + (liteFn_m5_decimalText(lite_m2_builtinArityCount)))) + (lite_m2_suffix))) + (", got "))) + (liteFn_m5_decimalText(lite_m2_builtinCount))));
                    }
                    if (lite_m2_optionalPrompt) {
                        if (((lite_m2_builtinCount) === (0n))) {
                            lite_m2_builtinCodes.push("undefined");
                        }
                        const lite_m2_place = liteFn_m7_lineColumn(lite_source, lite_m2_nameStart);
                        void lite_m2_place;
                        const lite_m2_location = ((((((((((Boolean(((lite_prefix) === (""))) ? "" : ((lite_prefix) + (":"))))) + (liteFn_m5_decimalText((lite_m2_place).line)))) + (":"))) + (liteFn_m5_decimalText((lite_m2_place).column)))) + (": InputFault: "));
                        void lite_m2_location;
                        lite_m2_builtinCodes.push(liteFn_m2_targetTextLiteralCode(lite_target, lite_m2_location));
                    }
                    if (((((lite_m2_name) === ("textAt"))) || (((lite_m2_name) === ("textSlice"))))) {
                        lite_m2_builtinCodes.push(liteFn_m4_intText(lite_m2_nameStart));
                    }
                    lite_m2_left = { kind: liteFn_m2_builtinResultKind(lite_m2_name), code: (((((((("lite$") + (lite_m2_name))) + ("("))) + (liteFn_m3_joinTexts([...(lite_m2_builtinCodes)], ", ")))) + (")")), intValue: 0n, textValue: "", constant: false, next: lite_m2_builtinCursor };
                } else if (((((((lite_m2_name) === ("push_back"))) && (((lite_m2_afterName) < (lite$textLength(lite_source)))))) && (((lite$textAt(lite_source, lite_m2_afterName, 86872)) === ("("))))) {
                    const lite_m2_grant = liteFn_m2_parseListGrant(lite_source, lite_m2_afterName, lite_prefix, [...(lite_locals)], "push_back");
                    void lite_m2_grant;
                    let lite_m2_cursor = liteFn_m2_skipTrivia(lite_source, (lite_m2_grant).next, lite_prefix);
                    void lite_m2_cursor;
                    if (((((lite_m2_cursor) >= (lite$textLength(lite_source)))) || (((lite$textAt(lite_source, lite_m2_cursor, 87117)) !== (","))))) {
                        liteFn_m2_failAt(lite_source, lite_m2_cursor, lite_prefix, "push_back expects a value after the mut list");
                    }
                    const lite_m2_valueStart = liteFn_m2_skipTrivia(lite_source, lite$addInt(lite_m2_cursor, 1n, 87324), lite_prefix);
                    void lite_m2_valueStart;
                    const lite_m2_elementKind = liteFn_m2_listElementKind((lite_m2_grant).kind);
                    void lite_m2_elementKind;
                    const lite_m2_value = liteFn_m2_parseBinary(lite_target, lite_source, lite_m2_valueStart, lite_prefix, [...(lite_locals)], [...(lite_functions)], [...(lite_params)], lite_currentName, lite_m2_elementKind, 0n);
                    void lite_m2_value;
                    if ((((lite_m2_value).kind) !== (lite_m2_elementKind))) {
                        liteFn_m2_failAt(lite_source, lite_m2_valueStart, lite_prefix, (((((("push_back element must be ") + (liteFn_m2_displayKind(lite_m2_elementKind)))) + (", got "))) + (liteFn_m2_displayKind((lite_m2_value).kind))));
                    }
                    const lite_m2_close = liteFn_m2_expectNonemptyCallClose(lite_source, (lite_m2_value).next, lite_prefix);
                    void lite_m2_close;
                    lite_m2_left = { kind: "Unit", code: (((((((lite_m2_grant).runtime) + (".push("))) + ((lite_m2_value).code))) + (")")), intValue: 0n, textValue: "", constant: false, next: lite_m2_close };
                } else if (((((((lite_m2_name) === ("pop_back"))) && (((lite_m2_afterName) < (lite$textLength(lite_source)))))) && (((lite$textAt(lite_source, lite_m2_afterName, 88093)) === ("("))))) {
                    const lite_m2_grant = liteFn_m2_parseListGrant(lite_source, lite_m2_afterName, lite_prefix, [...(lite_locals)], "pop_back");
                    void lite_m2_grant;
                    const lite_m2_close = liteFn_m2_expectNonemptyCallClose(lite_source, (lite_m2_grant).next, lite_prefix);
                    void lite_m2_close;
                    lite_m2_left = { kind: liteFn_m2_listElementKind((lite_m2_grant).kind), code: (((((((("lite$listPopBack(") + ((lite_m2_grant).runtime))) + (", "))) + (liteFn_m4_intText(lite_m2_nameStart)))) + (")")), intValue: 0n, textValue: "", constant: false, next: lite_m2_close };
                } else {
                    const lite_m2_index = liteFn_m2_localIndex([...(lite_locals)], lite_m2_name);
                    void lite_m2_index;
                    if (((lite_m2_index) < (0n))) {
                        liteFn_m2_failAt(lite_source, lite_m2_nameStart, lite_prefix, (("unknown value ") + (lite_m2_name)));
                    }
                    const lite_m2_entry = lite$listAt((lite_locals), lite_m2_index, 88756);
                    void lite_m2_entry;
                    lite_m2_left = { kind: (lite_m2_entry).kind, code: (lite_m2_entry).runtime, intValue: (lite_m2_entry).intValue, textValue: (lite_m2_entry).textValue, constant: (lite_m2_entry).constant, next: lite_m2_next };
                }
            }
        } else {
            liteFn_m2_failAt(lite_source, lite_m2_start, lite_prefix, "expected an Int, Float, String or Bool expression");
        }
        while (Boolean(true)) {
            const lite_m2_postPosition = liteFn_m2_skipTrivia(lite_source, (lite_m2_left).next, lite_prefix);
            void lite_m2_postPosition;
            if (((((lite_m2_postPosition) < (lite$textLength(lite_source)))) && (((lite$textAt(lite_source, lite_m2_postPosition, 89189)) === ("."))))) {
                const lite_m2_labelStart = liteFn_m2_skipTrivia(lite_source, lite$addInt(lite_m2_postPosition, 1n, 89285), lite_prefix);
                void lite_m2_labelStart;
                if (((((lite_m2_labelStart) >= (lite$textLength(lite_source)))) || ((!(liteFn_m3_isNameStart(lite$textAt(lite_source, lite_m2_labelStart, 89374))))))) {
                    break;
                }
                const lite_m2_labelEnd = liteFn_m3_skipName(lite_source, lite_m2_labelStart);
                void lite_m2_labelEnd;
                const lite_m2_label = lite$textSlice(lite_source, lite_m2_labelStart, lite_m2_labelEnd, 89524);
                void lite_m2_label;
                if ((((lite_m2_left).kind) === ("Module"))) {
                    const lite_m2_qualified = (((((lite_m2_left).textValue) + ("."))) + (lite_m2_label));
                    void lite_m2_qualified;
                    const lite_m2_functionIndex = liteFn_m2_findFunction([...(lite_functions)], lite_m2_qualified);
                    void lite_m2_functionIndex;
                    if (((lite_m2_functionIndex) >= (0n))) {
                        lite_m2_left = { kind: "ModuleFunction", code: "", intValue: lite_m2_functionIndex, textValue: lite_m2_qualified, constant: false, next: lite_m2_labelEnd };
                    } else {
                        const lite_m2_memberIndex = liteFn_m2_localIndex([...(lite_locals)], lite_m2_qualified);
                        void lite_m2_memberIndex;
                        if (((lite_m2_memberIndex) < (0n))) {
                            liteFn_m2_failAt(lite_source, lite_m2_labelStart, lite_prefix, (("unknown module member ") + (lite_m2_qualified)));
                        }
                        if (liteFn_m2_isSingleEquals(lite_source, liteFn_m2_skipTrivia(lite_source, lite_m2_labelEnd, lite_prefix))) {
                            liteFn_m2_failAt(lite_source, lite_m2_labelStart, lite_prefix, "module members are immutable");
                        }
                        const lite_m2_member = lite$listAt((lite_locals), lite_m2_memberIndex, 90434);
                        void lite_m2_member;
                        lite_m2_left = { kind: (lite_m2_member).kind, code: (lite_m2_member).runtime, intValue: (lite_m2_member).intValue, textValue: (lite_m2_member).textValue, constant: (lite_m2_member).constant, next: lite_m2_labelEnd };
                    }
                } else {
                    if ((!(liteFn_m2_isTupleKind((lite_m2_left).kind)))) {
                        liteFn_m2_failAt(lite_source, lite_m2_postPosition, lite_prefix, "field access requires a tuple or module value");
                    }
                    const lite_m2_fieldKind = liteFn_m2_tupleFieldKind((lite_m2_left).kind, lite_m2_label);
                    void lite_m2_fieldKind;
                    if (((lite_m2_fieldKind) === (""))) {
                        liteFn_m2_failAt(lite_source, lite_m2_labelStart, lite_prefix, (("tuple has no field ") + (lite_m2_label)));
                    }
                    lite_m2_left = { kind: lite_m2_fieldKind, code: (((((("(") + ((lite_m2_left).code))) + (")."))) + (lite_m2_label)), intValue: 0n, textValue: "", constant: false, next: lite_m2_labelEnd };
                }
            } else if (((((lite_m2_postPosition) < (lite$textLength(lite_source)))) && (((lite$textAt(lite_source, lite_m2_postPosition, 91281)) === ("["))))) {
                if ((!(liteFn_m2_isListKind((lite_m2_left).kind)))) {
                    liteFn_m2_failAt(lite_source, lite_m2_postPosition, lite_prefix, "indexing requires a list value");
                }
                const lite_m2_indexStart = liteFn_m2_skipTrivia(lite_source, lite$addInt(lite_m2_postPosition, 1n, 91522), lite_prefix);
                void lite_m2_indexStart;
                const lite_m2_index = liteFn_m2_parseBinary(lite_target, lite_source, lite_m2_indexStart, lite_prefix, [...(lite_locals)], [...(lite_functions)], [...(lite_params)], lite_currentName, "", 0n);
                void lite_m2_index;
                if ((((lite_m2_index).kind) !== ("Int"))) {
                    liteFn_m2_failAt(lite_source, lite_m2_indexStart, lite_prefix, (("list index must be Int, got ") + (liteFn_m2_displayKind((lite_m2_index).kind))));
                }
                const lite_m2_close = liteFn_m2_skipTrivia(lite_source, (lite_m2_index).next, lite_prefix);
                void lite_m2_close;
                const lite_m2_next = liteFn_m2_expectSymbol(lite_source, lite_m2_close, "]", lite_prefix);
                void lite_m2_next;
                lite_m2_left = { kind: liteFn_m2_listElementKind((lite_m2_left).kind), code: (((((((((((("lite$listAt((") + ((lite_m2_left).code))) + ("), "))) + ((lite_m2_index).code))) + (", "))) + (liteFn_m4_intText(lite_m2_indexStart)))) + (")")), intValue: 0n, textValue: "", constant: false, next: lite_m2_next };
            } else {
                break;
            }
        }
        if ((((lite_m2_left).kind) === ("ModuleFunction"))) {
            const lite_m2_info = lite$listAt((lite_functions), (lite_m2_left).intValue, 92297);
            void lite_m2_info;
            const lite_m2_callOpen = liteFn_m2_skipTrivia(lite_source, (lite_m2_left).next, lite_prefix);
            void lite_m2_callOpen;
            if (((((lite_m2_callOpen) >= (lite$textLength(lite_source)))) || (((lite$textAt(lite_source, lite_m2_callOpen, 92417)) !== ("("))))) {
                liteFn_m2_failAt(lite_source, lite_m2_start, lite_prefix, (((("function ") + ((lite_m2_left).textValue))) + (" must be called")));
            }
            let lite_m2_cursor = liteFn_m2_skipTrivia(lite_source, lite$addInt(lite_m2_callOpen, 1n, 92605), lite_prefix);
            void lite_m2_cursor;
            const lite_m2_argumentCodes: string[] = [...([])];
            void lite_m2_argumentCodes;
            let lite_m2_argumentCount = 0n;
            void lite_m2_argumentCount;
            if (((((lite_m2_cursor) < (lite$textLength(lite_source)))) && (((lite$textAt(lite_source, lite_m2_cursor, 92740)) !== (")"))))) {
                while (Boolean(true)) {
                    if (((lite_m2_argumentCount) >= ((lite_m2_info).count))) {
                        const lite_m2_suffix = (Boolean((((lite_m2_info).count) === (1n))) ? " argument" : " arguments");
                        void lite_m2_suffix;
                        liteFn_m2_failAt(lite_source, lite_m2_start, lite_prefix, (((((((((("function ") + ((lite_m2_left).textValue))) + (" expects "))) + (liteFn_m5_decimalText((lite_m2_info).count)))) + (lite_m2_suffix))) + (", got more")));
                    }
                    const lt_local_m2_expected_93123 = liteFn_m2_paramKindOf(lite$listAt((lite_params), lite$addInt((lite_m2_info).first, lite_m2_argumentCount, 93165), 93154));
                    void lt_local_m2_expected_93123;
                    const lite_m2_argument = liteFn_m2_parseBinary(lite_target, lite_source, lite_m2_cursor, lite_prefix, [...(lite_locals)], [...(lite_functions)], [...(lite_params)], lite_currentName, lt_local_m2_expected_93123, 0n);
                    void lite_m2_argument;
                    if ((((lite_m2_argument).kind) !== (lt_local_m2_expected_93123))) {
                        liteFn_m2_failAt(lite_source, lite_m2_cursor, lite_prefix, (((((((((((((("argument ") + (liteFn_m5_decimalText(lite$addInt(lite_m2_argumentCount, 1n, 93452))))) + (" of "))) + ((lite_m2_left).textValue))) + (" must be "))) + (liteFn_m2_displayKind(lt_local_m2_expected_93123)))) + (", got "))) + (liteFn_m2_displayKind((lite_m2_argument).kind))));
                    }
                    lite_m2_argumentCodes.push(liteFn_m2_copiedValueCode(lite_target, (lite_m2_argument).kind, (lite_m2_argument).code));
                    lite_m2_argumentCount = lite$addInt(lite_m2_argumentCount, 1n, 93752);
                    lite_m2_cursor = liteFn_m2_skipTrivia(lite_source, (lite_m2_argument).next, lite_prefix);
                    if (((((lite_m2_cursor) < (lite$textLength(lite_source)))) && (((lite$textAt(lite_source, lite_m2_cursor, 93876)) === (","))))) {
                        lite_m2_cursor = liteFn_m2_skipTrivia(lite_source, lite$addInt(lite_m2_cursor, 1n, 93963), lite_prefix);
                        if (((((lite_m2_cursor) < (lite$textLength(lite_source)))) && (((lite$textAt(lite_source, lite_m2_cursor, 94032)) === (")"))))) {
                            break;
                        }
                    } else {
                        break;
                    }
                }
            }
            lite_m2_cursor = liteFn_m2_expectSymbol(lite_source, lite_m2_cursor, ")", lite_prefix);
            if (((lite_m2_argumentCount) !== ((lite_m2_info).count))) {
                const lite_m2_suffix = (Boolean((((lite_m2_info).count) === (1n))) ? " argument" : " arguments");
                void lite_m2_suffix;
                liteFn_m2_failAt(lite_source, lite_m2_start, lite_prefix, (((((((((((("function ") + ((lite_m2_left).textValue))) + (" expects "))) + (liteFn_m5_decimalText((lite_m2_info).count)))) + (lite_m2_suffix))) + (", got "))) + (liteFn_m5_decimalText(lite_m2_argumentCount))));
            }
            lite_m2_left = { kind: (lite_m2_info).result, code: (((((((lite_m2_info).runtime) + ("("))) + (liteFn_m3_joinTexts([...(lite_m2_argumentCodes)], ", ")))) + (")")), intValue: 0n, textValue: "", constant: false, next: lite_m2_cursor };
        }
        while (Boolean(true)) {
            if ((((((lite_m2_left).next) > (0n))) && (((lite$textAt(lite_source, lite$subtractInt((lite_m2_left).next, 1n, 94819), 94794)) === ("}"))))) {
                break;
            }
            const lite_m2_operatorPosition = liteFn_m2_skipTrivia(lite_source, (lite_m2_left).next, lite_prefix);
            void lite_m2_operatorPosition;
            if (((lite_m2_operatorPosition) >= (lite$textLength(lite_source)))) {
                break;
            }
            const lite_m2_operator = liteFn_m2_readOperator(lite_source, lite_m2_operatorPosition);
            void lite_m2_operator;
            if ((((lite_m2_operator).text) === (""))) {
                break;
            }
            const lite_m2_level = liteFn_m2_operatorLevel((lite_m2_operator).text);
            void lite_m2_level;
            if (((lite_m2_level) < (lite_minimum))) {
                break;
            }
            if ((((lite_m2_operator).text) === ("**"))) {
                let lite_m2_signPosition = lite_m2_start;
                void lite_m2_signPosition;
                while (((((lite_m2_signPosition) < (lite$textLength(lite_source)))) && ((((((lite$textAt(lite_source, lite_m2_signPosition, 95287)) === ("+"))) || (((lite$textAt(lite_source, lite_m2_signPosition, 95326)) === ("-")))))))) {
                    if (((lite$textAt(lite_source, lite_m2_signPosition, 95384)) === ("-"))) {
                        liteFn_m2_failAt(lite_source, lite_m2_operatorPosition, lite_prefix, "group a negative power base as (-base) or negate the completed power as -(base ** exponent)");
                    }
                    lite_m2_signPosition = liteFn_m2_skipTrivia(lite_source, lite$addInt(lite_m2_signPosition, 1n, 95660), lite_prefix);
                }
            }
            const lite_m2_rightMinimum = (Boolean((((lite_m2_operator).text) === ("**"))) ? lite_m2_level : lite$addInt(lite_m2_level, 1n, 95770));
            void lite_m2_rightMinimum;
            const lite_m2_right = liteFn_m2_parseBinary(lite_target, lite_source, lite$addInt(lite_m2_operatorPosition, (lite_m2_operator).width, 95832), lite_prefix, [...(lite_locals)], [...(lite_functions)], [...(lite_params)], lite_currentName, "", lite_m2_rightMinimum);
            void lite_m2_right;
            if ((((((lite_m2_operator).text) === ("and"))) || ((((lite_m2_operator).text) === ("or"))))) {
                if ((((((lite_m2_left).kind) !== ("Bool"))) || ((((lite_m2_right).kind) !== ("Bool"))))) {
                    liteFn_m2_failAt(lite_source, lite_m2_operatorPosition, lite_prefix, (((("operator ") + ((lite_m2_operator).text))) + (" requires Bool operands")));
                }
                if ((((lite_m2_left).constant) && ((lite_m2_right).constant))) {
                    const lite_m2_value = (Boolean((((lite_m2_operator).text) === ("and"))) ? (((((lite_m2_left).intValue) !== (0n))) && ((((lite_m2_right).intValue) !== (0n)))) : (((((lite_m2_left).intValue) !== (0n))) || ((((lite_m2_right).intValue) !== (0n)))));
                    void lite_m2_value;
                    lite_m2_left = liteFn_m2_boolParsed(liteFn_m2_targetBoolLiteralCode(lite_target, lite_m2_value), lite_m2_value, true, (lite_m2_right).next);
                } else {
                    lite_m2_left = liteFn_m2_boolParsed(liteFn_m2_targetLogicCode(lite_target, (lite_m2_operator).text, (lite_m2_left).code, (lite_m2_right).code), false, false, (lite_m2_right).next);
                }
            } else if (liteFn_m2_isComparison((lite_m2_operator).text)) {
                const lite_m2_firstPair = liteFn_m2_compareParsed(lite_target, lite_source, lite_m2_operatorPosition, (lite_m2_operator).text, lite_m2_left, lite_m2_right, lite_prefix);
                void lite_m2_firstPair;
                let lite_m2_nextPosition = liteFn_m2_skipTrivia(lite_source, (lite_m2_right).next, lite_prefix);
                void lite_m2_nextPosition;
                let lite_m2_nextOperator = liteFn_m2_comparisonOperatorAt(lite_source, lite_m2_nextPosition);
                void lite_m2_nextOperator;
                if ((!(liteFn_m2_isComparison((lite_m2_nextOperator).text)))) {
                    lite_m2_left = lite_m2_firstPair;
                } else {
                    const lite_m2_codes: string[] = [...([(lite_m2_left).code, (lite_m2_right).code])];
                    void lite_m2_codes;
                    const lite_m2_kinds: string[] = [...([(lite_m2_left).kind, (lite_m2_right).kind])];
                    void lite_m2_kinds;
                    const lite_m2_operators: string[] = [...([(lite_m2_operator).text])];
                    void lite_m2_operators;
                    let lite_m2_count = 1n;
                    void lite_m2_count;
                    let lite_m2_previous = lite_m2_right;
                    void lite_m2_previous;
                    let lite_m2_end = (lite_m2_right).next;
                    void lite_m2_end;
                    let lite_m2_constant = (((lite_m2_left).constant) && ((lite_m2_right).constant));
                    void lite_m2_constant;
                    let lite_m2_value = (((lite_m2_firstPair).intValue) !== (0n));
                    void lite_m2_value;
                    while (liteFn_m2_isComparison((lite_m2_nextOperator).text)) {
                        const lite_m2_operand = liteFn_m2_parseBinary(lite_target, lite_source, lite$addInt(lite_m2_nextPosition, (lite_m2_nextOperator).width, 97665), lite_prefix, [...(lite_locals)], [...(lite_functions)], [...(lite_params)], lite_currentName, "", lite$addInt(lite_m2_level, 1n, 97745));
                        void lite_m2_operand;
                        const lite_m2_pair = liteFn_m2_compareParsed(lite_target, lite_source, lite_m2_nextPosition, (lite_m2_nextOperator).text, lite_m2_previous, lite_m2_operand, lite_prefix);
                        void lite_m2_pair;
                        lite_m2_codes.push((lite_m2_operand).code);
                        lite_m2_kinds.push((lite_m2_operand).kind);
                        lite_m2_operators.push((lite_m2_nextOperator).text);
                        lite_m2_constant = ((lite_m2_constant) && ((lite_m2_operand).constant));
                        if (lite_m2_constant) {
                            lite_m2_value = ((lite_m2_value) && ((((lite_m2_pair).intValue) !== (0n))));
                        }
                        lite_m2_count = lite$addInt(lite_m2_count, 1n, 98218);
                        lite_m2_previous = lite_m2_operand;
                        lite_m2_end = (lite_m2_operand).next;
                        lite_m2_nextPosition = liteFn_m2_skipTrivia(lite_source, lite_m2_end, lite_prefix);
                        lite_m2_nextOperator = liteFn_m2_comparisonOperatorAt(lite_source, lite_m2_nextPosition);
                    }
                    if (lite_m2_constant) {
                        lite_m2_left = liteFn_m2_boolParsed(liteFn_m2_targetBoolLiteralCode(lite_target, lite_m2_value), lite_m2_value, true, lite_m2_end);
                    } else {
                        lite_m2_left = liteFn_m2_boolParsed(liteFn_m2_targetComparisonChainCode(lite_target, [...(lite_m2_codes)], [...(lite_m2_kinds)], [...(lite_m2_operators)], lite_m2_count, lite_m2_operatorPosition), false, false, lite_m2_end);
                    }
                }
            } else if ((((lite_m2_operator).text) === ("**"))) {
                if (((((((((lite_m2_left).kind) !== ("Int"))) && ((((lite_m2_left).kind) !== ("Float")))))) || (((((((lite_m2_right).kind) !== ("Int"))) && ((((lite_m2_right).kind) !== ("Float")))))))) {
                    liteFn_m2_failAt(lite_source, lite_m2_operatorPosition, lite_prefix, "power requires Int or Float operands");
                }
                const lite_m2_code = liteFn_m2_targetFloatPowerCode(lite_target, liteFn_m2_targetFloatOperandCode(lite_target, (lite_m2_left).kind, (lite_m2_left).code), liteFn_m2_targetFloatOperandCode(lite_target, (lite_m2_right).kind, (lite_m2_right).code), lite_m2_operatorPosition);
                void lite_m2_code;
                lite_m2_left = { kind: "Float", code: lite_m2_code, intValue: 0n, textValue: "", constant: false, next: (lite_m2_right).next };
            } else if ((((((lite_m2_left).kind) === ("Int"))) && ((((lite_m2_right).kind) === ("Int"))))) {
                if ((((lite_m2_left).constant) && ((lite_m2_right).constant))) {
                    const lite_m2_folded = liteFn_m2_tryFoldInteger((lite_m2_operator).text, (lite_m2_left).intValue, (lite_m2_right).intValue);
                    void lite_m2_folded;
                    if ((lite_m2_folded).ok) {
                        const lite_m2_code = (Boolean(((((((((((lite_m2_operator).text) === ("%"))) || ((((lite_m2_operator).text) === (":%")))))) && ((((lite_m2_left).intValue) === (liteFn_m4_intMin()))))) && ((((lite_m2_right).intValue) === ((-1n)))))) ? liteFn_m2_targetIntLiteralCode(lite_target, 0n, false, "0") : (Boolean((((lite_m2_operator).text) === (":/"))) ? liteFn_m2_targetFloorDivCode(lite_target, (lite_m2_left).code, (lite_m2_right).code) : (Boolean((((lite_m2_operator).text) === (":%"))) ? liteFn_m2_targetFloorModCode(lite_target, (lite_m2_left).code, (lite_m2_right).code) : (((((((((((("(") + ((lite_m2_left).code))) + (" "))) + ((lite_m2_operator).text))) + (" "))) + ((lite_m2_right).code))) + (")")))));
                        void lite_m2_code;
                        lite_m2_left = liteFn_m2_intParsed(lite_m2_code, (lite_m2_folded).value, true, (lite_m2_right).next);
                    } else {
                        lite_m2_left = liteFn_m2_intParsed(liteFn_m2_runtimeIntegerCode(lite_target, (lite_m2_operator).text, (lite_m2_left).code, (lite_m2_right).code, lite_m2_operatorPosition), 0n, false, (lite_m2_right).next);
                    }
                } else {
                    lite_m2_left = liteFn_m2_intParsed(liteFn_m2_runtimeIntegerCode(lite_target, (lite_m2_operator).text, (lite_m2_left).code, (lite_m2_right).code, lite_m2_operatorPosition), 0n, false, (lite_m2_right).next);
                }
            } else if ((((((((lite_m2_operator).text) === ("+"))) && ((((lite_m2_left).kind) === ("String"))))) && ((((lite_m2_right).kind) === ("String"))))) {
                if ((((lite_m2_left).constant) && ((lite_m2_right).constant))) {
                    const lite_m2_combined = (((lite_m2_left).textValue) + ((lite_m2_right).textValue));
                    void lite_m2_combined;
                    lite_m2_left = liteFn_m2_textParsed(liteFn_m2_targetTextLiteralCode(lite_target, lite_m2_combined), lite_m2_combined, true, (lite_m2_right).next);
                } else {
                    lite_m2_left = liteFn_m2_textParsed(liteFn_m2_targetConcatCode(lite_target, (lite_m2_left).code, (lite_m2_right).code), "", false, (lite_m2_right).next);
                }
            } else if (((((((((lite_m2_left).kind) === ("Int"))) || ((((lite_m2_left).kind) === ("Float")))))) && (((((((lite_m2_right).kind) === ("Int"))) || ((((lite_m2_right).kind) === ("Float")))))))) {
                if ((((((((((lite_m2_operator).text) !== ("+"))) && ((((lite_m2_operator).text) !== ("-"))))) && ((((lite_m2_operator).text) !== ("*"))))) && ((((lite_m2_operator).text) !== ("/"))))) {
                    liteFn_m2_failAt(lite_source, lite_m2_operatorPosition, lite_prefix, (((("operator ") + ((lite_m2_operator).text))) + (" requires Int operands")));
                }
                const lite_m2_code = liteFn_m2_targetFloatBinaryCode(lite_target, (lite_m2_operator).text, liteFn_m2_targetFloatOperandCode(lite_target, (lite_m2_left).kind, (lite_m2_left).code), liteFn_m2_targetFloatOperandCode(lite_target, (lite_m2_right).kind, (lite_m2_right).code), lite_m2_operatorPosition);
                void lite_m2_code;
                lite_m2_left = { kind: "Float", code: lite_m2_code, intValue: 0n, textValue: "", constant: false, next: (lite_m2_right).next };
            } else if (((liteFn_m2_isListKind((lite_m2_left).kind)) || (liteFn_m2_isListKind((lite_m2_right).kind)))) {
                liteFn_m2_failAt(lite_source, lite_m2_operatorPosition, lite_prefix, (((("operator ") + ((lite_m2_operator).text))) + (" is not supported for list values")));
            } else if ((((lite_m2_operator).text) === ("+"))) {
                liteFn_m2_failAt(lite_source, lite_m2_operatorPosition, lite_prefix, "cannot mix Int and String operands");
            } else {
                liteFn_m2_failAt(lite_source, lite_m2_operatorPosition, lite_prefix, (((("operator ") + ((lite_m2_operator).text))) + (" requires Int operands")));
            }
        }
        if (((((lite_m2_leaderStart) >= (0n))) && ((((lite_m2_left).kind) !== ("Bool"))))) {
            liteFn_m2_failAt(lite_source, lite_m2_leaderStart, lite_prefix, (((("leading ") + (lite_m2_leaderText))) + (" requires a Bool expression")));
        }
        return lite_m2_left;
    }
    void liteFn_m2_parseBinary;
    function liteFn_m2_parseExpressionAs(lite_target: string, lite_source: string, lite_position: bigint, lite_prefix: string, lite_locals: { name: string; runtime: string; kind: string; mutable: boolean; writable: boolean; depth: bigint; constant: boolean; code: string; intValue: bigint; textValue: string }[], lite_functions: { name: string; runtime: string; result: string; first: bigint; count: bigint }[], lite_params: string[], lite_currentName: string, lite_expected: string): { kind: string; code: string; intValue: bigint; textValue: string; constant: boolean; next: bigint } {
        void lite_target;
        void lite_source;
        void lite_position;
        void lite_prefix;
        void lite_locals;
        void lite_functions;
        void lite_params;
        void lite_currentName;
        void lite_expected;
        return liteFn_m2_parseBinary(lite_target, lite_source, lite_position, lite_prefix, [...(lite_locals)], [...(lite_functions)], [...(lite_params)], lite_currentName, lite_expected, 0n);
    }
    void liteFn_m2_parseExpressionAs;
    function liteFn_m2_parseExpression(lite_target: string, lite_source: string, lite_position: bigint, lite_prefix: string, lite_locals: { name: string; runtime: string; kind: string; mutable: boolean; writable: boolean; depth: bigint; constant: boolean; code: string; intValue: bigint; textValue: string }[], lite_functions: { name: string; runtime: string; result: string; first: bigint; count: bigint }[], lite_params: string[], lite_currentName: string): { kind: string; code: string; intValue: bigint; textValue: string; constant: boolean; next: bigint } {
        void lite_target;
        void lite_source;
        void lite_position;
        void lite_prefix;
        void lite_locals;
        void lite_functions;
        void lite_params;
        void lite_currentName;
        return liteFn_m2_parseBinary(lite_target, lite_source, lite_position, lite_prefix, [...(lite_locals)], [...(lite_functions)], [...(lite_params)], lite_currentName, "", 0n);
    }
    void liteFn_m2_parseExpression;
    function liteFn_m2_sourcePrefix(): string {
        let lite_m2_prefix = "";
        void lite_m2_prefix;
        let lite_m2_argumentCountValue = 0n;
        void lite_m2_argumentCountValue;
        for (const lite_m2_argument of [...(lite$inputArgs())]) {
            void lite_m2_argument;
            if (((lite_m2_argumentCountValue) === (0n))) {
                lite_m2_prefix = lite_m2_argument;
            }
            lite_m2_argumentCountValue = lite$addInt(lite_m2_argumentCountValue, 1n, 103464);
        }
        if (((lite_m2_argumentCountValue) > (1n))) {
            lite$reportError("expected at most one logical source name argument");
            lite$exit(2n);
        }
        return lite_m2_prefix;
    }
    void liteFn_m2_sourcePrefix;
    function liteFn_m2_parseLocalType(lite_source: string, lite_position: bigint, lite_prefix: string, lite_aliases: { name: string; target: string; at: bigint; end: bigint }[]): { kind: string; writable: boolean; next: bigint } {
        void lite_source;
        void lite_position;
        void lite_prefix;
        void lite_aliases;
        const lite_m2_start = liteFn_m2_skipTrivia(lite_source, lite_position, lite_prefix);
        void lite_m2_start;
        let lite_m2_cursor = lite_m2_start;
        void lite_m2_cursor;
        let lite_m2_writable = false;
        void lite_m2_writable;
        if (liteFn_m3_wordAt(lite_source, lite_m2_cursor, "mut")) {
            lite_m2_writable = true;
            lite_m2_cursor = liteFn_m2_skipTrivia(lite_source, lite$addInt(lite_m2_cursor, 3n, 104134), lite_prefix);
        }
        const lite_m2_typed = liteFn_m2_parseTypeAt(lite_source, lite_m2_cursor, lite_prefix, [...(lite_aliases)], "local");
        void lite_m2_typed;
        if ((((lite_m2_typed).kind) === ("Unit"))) {
            const lite_m2_name = lite$textSlice(lite_source, lite_m2_cursor, liteFn_m3_skipName(lite_source, lite_m2_cursor), 104268);
            void lite_m2_name;
            liteFn_m2_failAt(lite_source, lite_m2_cursor, lite_prefix, (("unsupported local type ") + (lite_m2_name)));
        }
        if (((lite_m2_writable) && ((!(liteFn_m2_isListKind((lite_m2_typed).kind)))))) {
            liteFn_m2_failAt(lite_source, lite_m2_start, lite_prefix, (("mut requires a List type, got ") + (liteFn_m2_displayKind((lite_m2_typed).kind))));
        }
        return { kind: (lite_m2_typed).kind, writable: lite_m2_writable, next: (lite_m2_typed).next };
    }
    void liteFn_m2_parseLocalType;
    function liteFn_m2_tupleZeroParsed(lite_kind: string, lite_next: bigint): { kind: string; code: string; intValue: bigint; textValue: string; constant: boolean; next: bigint } {
        void lite_kind;
        void lite_next;
        const lite_m2_size = lite$textLength(lite_kind);
        void lite_m2_size;
        let lite_m2_cursor = 1n;
        void lite_m2_cursor;
        let lite_m2_code = "{ ";
        void lite_m2_code;
        let lite_m2_count = 0n;
        void lite_m2_count;
        while (((((lite_m2_cursor) < (lite_m2_size))) && (((lite$textAt(lite_kind, lite_m2_cursor, 104893)) !== (")"))))) {
            const lite_m2_nameStart = lite_m2_cursor;
            void lite_m2_nameStart;
            lite_m2_cursor = liteFn_m3_skipName(lite_kind, lite_m2_cursor);
            const lite_m2_label = lite$textSlice(lite_kind, lite_m2_nameStart, lite_m2_cursor, 105019);
            void lite_m2_label;
            if (((((lite_m2_cursor) < (lite_m2_size))) && (((lite$textAt(lite_kind, lite_m2_cursor, 105084)) === (":"))))) {
                lite_m2_cursor = lite$addInt(lite_m2_cursor, 1n, 105130);
            }
            const lite_m2_typeStart = lite_m2_cursor;
            void lite_m2_typeStart;
            lite_m2_cursor = liteFn_m3_skipName(lite_kind, lite_m2_cursor);
            const lite_m2_fieldKind = lite$textSlice(lite_kind, lite_m2_typeStart, lite_m2_cursor, 105236);
            void lite_m2_fieldKind;
            if (((lite_m2_count) > (0n))) {
                lite_m2_code = ((lite_m2_code) + (", "));
            }
            lite_m2_code = ((((lite_m2_code) + (lite_m2_label))) + (": "));
            if (((lite_m2_fieldKind) === ("Int"))) {
                lite_m2_code = ((lite_m2_code) + ("0n"));
            } else if (((lite_m2_fieldKind) === ("Float"))) {
                lite_m2_code = ((lite_m2_code) + ("0"));
            } else if (((lite_m2_fieldKind) === ("String"))) {
                lite_m2_code = ((lite_m2_code) + ("\"\""));
            } else {
                lite_m2_code = ((lite_m2_code) + ("false"));
            }
            lite_m2_count = lite$addInt(lite_m2_count, 1n, 105593);
            if (((((lite_m2_cursor) < (lite_m2_size))) && (((lite$textAt(lite_kind, lite_m2_cursor, 105627)) === (","))))) {
                lite_m2_cursor = lite$addInt(lite_m2_cursor, 1n, 105673);
            }
        }
        return { kind: lite_kind, code: ((lite_m2_code) + (" }")), intValue: 0n, textValue: "", constant: false, next: lite_next };
    }
    void liteFn_m2_tupleZeroParsed;
    function liteFn_m2_zeroParsed(lite_target: string, lite_kind: string, lite_next: bigint): { kind: string; code: string; intValue: bigint; textValue: string; constant: boolean; next: bigint } {
        void lite_target;
        void lite_kind;
        void lite_next;
        return (Boolean(liteFn_m2_isTupleKind(lite_kind)) ? liteFn_m2_tupleZeroParsed(lite_kind, lite_next) : (Boolean(liteFn_m2_isListKind(lite_kind)) ? { kind: lite_kind, code: "[]", intValue: 0n, textValue: "", constant: false, next: lite_next } : (Boolean(((lite_kind) === ("Int"))) ? liteFn_m2_intParsed(liteFn_m2_targetIntLiteralCode(lite_target, 0n, false, "0"), 0n, true, lite_next) : (Boolean(((lite_kind) === ("Float"))) ? { kind: "Float", code: "0", intValue: 0n, textValue: "", constant: false, next: lite_next } : (Boolean(((lite_kind) === ("String"))) ? liteFn_m2_textParsed(liteFn_m2_targetTextLiteralCode(lite_target, ""), "", true, lite_next) : liteFn_m2_boolParsed(liteFn_m2_targetBoolLiteralCode(lite_target, false), false, true, lite_next))))));
    }
    void liteFn_m2_zeroParsed;
    function liteFn_m2_storageKind(lite_kind: string): string {
        void lite_kind;
        return (Boolean(liteFn_m2_isListKind(lite_kind)) ? "List" : (Boolean(liteFn_m2_isTupleKind(lite_kind)) ? "Tuple" : lite_kind));
    }
    void liteFn_m2_storageKind;
    function liteFn_m2_itemTextPayload(lite_parsed: { kind: string; code: string; intValue: bigint; textValue: string; constant: boolean; next: bigint }): string {
        void lite_parsed;
        return (Boolean(liteFn_m2_isListKind((lite_parsed).kind)) ? (lite_parsed).kind : (lite_parsed).textValue);
    }
    void liteFn_m2_itemTextPayload;
    function liteFn_m2_scanBraceEnd(lite_source: string, lite_open: bigint, lite_prefix: string): bigint {
        void lite_source;
        void lite_open;
        void lite_prefix;
        const lite_m2_size = lite$textLength(lite_source);
        void lite_m2_size;
        let lite_m2_cursor = lite_open;
        void lite_m2_cursor;
        let lite_m2_depth = 0n;
        void lite_m2_depth;
        while (((lite_m2_cursor) < (lite_m2_size))) {
            const lite_m2_ch = lite$textAt(lite_source, lite_m2_cursor, 107386);
            void lite_m2_ch;
            if (((lite_m2_ch) === ("\""))) {
                lite_m2_cursor = liteFn_m2_skipAliasString(lite_source, lite_m2_cursor);
            } else if (liteFn_m3_startsWithAt(lite_source, lite_m2_cursor, "/*")) {
                lite_m2_cursor = liteFn_m2_skipComment(lite_source, lite_m2_cursor, lite_prefix);
            } else if (((lite_m2_ch) === ("{"))) {
                lite_m2_depth = lite$addInt(lite_m2_depth, 1n, 107665);
                lite_m2_cursor = lite$addInt(lite_m2_cursor, 1n, 107698);
            } else if (((lite_m2_ch) === ("}"))) {
                lite_m2_depth = lite$subtractInt(lite_m2_depth, 1n, 107759);
                lite_m2_cursor = lite$addInt(lite_m2_cursor, 1n, 107792);
                if (((lite_m2_depth) === (0n))) {
                    return lite_m2_cursor;
                }
            } else {
                lite_m2_cursor = lite$addInt(lite_m2_cursor, 1n, 107887);
            }
        }
        return (-1n);
    }
    void liteFn_m2_scanBraceEnd;
    function liteFn_m2_scanConditionOpen(lite_source: string, lite_start: bigint, lite_prefix: string): bigint {
        void lite_source;
        void lite_start;
        void lite_prefix;
        const lite_m2_size = lite$textLength(lite_source);
        void lite_m2_size;
        let lite_m2_cursor = lite_start;
        void lite_m2_cursor;
        let lite_m2_depth = 0n;
        void lite_m2_depth;
        while (((lite_m2_cursor) < (lite_m2_size))) {
            const lite_m2_ch = lite$textAt(lite_source, lite_m2_cursor, 108230);
            void lite_m2_ch;
            if (((lite_m2_ch) === ("\""))) {
                lite_m2_cursor = liteFn_m2_skipAliasString(lite_source, lite_m2_cursor);
            } else if (liteFn_m3_startsWithAt(lite_source, lite_m2_cursor, "/*")) {
                lite_m2_cursor = liteFn_m2_skipComment(lite_source, lite_m2_cursor, lite_prefix);
            } else if (((((lite_m2_ch) === ("("))) || (((lite_m2_ch) === ("["))))) {
                lite_m2_depth = lite$addInt(lite_m2_depth, 1n, 108522);
                lite_m2_cursor = lite$addInt(lite_m2_cursor, 1n, 108555);
            } else if (((((lite_m2_ch) === (")"))) || (((lite_m2_ch) === ("]"))))) {
                if (((lite_m2_depth) > (0n))) {
                    lite_m2_depth = lite$subtractInt(lite_m2_depth, 1n, 108644);
                }
                lite_m2_cursor = lite$addInt(lite_m2_cursor, 1n, 108679);
            } else if (((((lite_m2_ch) === ("{"))) && (((lite_m2_depth) === (0n))))) {
                return lite_m2_cursor;
            } else {
                lite_m2_cursor = lite$addInt(lite_m2_cursor, 1n, 108801);
            }
        }
        return (-1n);
    }
    void liteFn_m2_scanConditionOpen;
    function liteFn_m2_valueIfBranchAt(lite_source: string, lite_open: bigint, lite_close: bigint, lite_prefix: string): boolean {
        void lite_source;
        void lite_open;
        void lite_close;
        void lite_prefix;
        let lite_m2_cursor = liteFn_m2_skipTrivia(lite_source, lite$addInt(lite_open, 1n, 109093), lite_prefix);
        void lite_m2_cursor;
        if (((lite_m2_cursor) >= (lite_close))) {
            return false;
        }
        if (liteFn_m3_isNameStart(lite$textAt(lite_source, lite_m2_cursor, 109175))) {
            const lite_m2_word = lite$textSlice(lite_source, lite_m2_cursor, liteFn_m3_skipName(lite_source, lite_m2_cursor), 109217);
            void lite_m2_word;
            if (((((((((((((((((((lite_m2_word) === ("return"))) || (((lite_m2_word) === ("outputLine"))))) || (((lite_m2_word) === ("output"))))) || (((lite_m2_word) === ("var"))))) || (((lite_m2_word) === ("loop"))))) || (((lite_m2_word) === ("break"))))) || (((lite_m2_word) === ("continue"))))) || (((lite_m2_word) === ("else"))))) || (((lite_m2_word) === ("fn"))))) {
                return false;
            }
        }
        let lite_m2_scan = lite_m2_cursor;
        void lite_m2_scan;
        while (((lite_m2_scan) < (lite_close))) {
            const lite_m2_ch = lite$textAt(lite_source, lite_m2_scan, 109578);
            void lite_m2_ch;
            if (((lite_m2_ch) === ("\""))) {
                lite_m2_scan = liteFn_m2_skipAliasString(lite_source, lite_m2_scan);
            } else if (liteFn_m3_startsWithAt(lite_source, lite_m2_scan, "/*")) {
                lite_m2_scan = liteFn_m2_skipComment(lite_source, lite_m2_scan, lite_prefix);
            } else if (((lite_m2_ch) === (";"))) {
                return false;
            } else {
                lite_m2_scan = lite$addInt(lite_m2_scan, 1n, 109886);
            }
        }
        return true;
    }
    void liteFn_m2_valueIfBranchAt;
    function liteFn_m2_scanValueIfEnd(lite_source: string, lite_position: bigint, lite_prefix: string, lite_requireValueBranches: boolean): bigint {
        void lite_source;
        void lite_position;
        void lite_prefix;
        void lite_requireValueBranches;
        const lite_m2_size = lite$textLength(lite_source);
        void lite_m2_size;
        let lite_m2_cursor = liteFn_m2_skipTrivia(lite_source, lite_position, lite_prefix);
        void lite_m2_cursor;
        if ((!(liteFn_m3_wordAt(lite_source, lite_m2_cursor, "if")))) {
            return (-1n);
        }
        lite_m2_cursor = liteFn_m2_skipTrivia(lite_source, lite$addInt(lite_m2_cursor, 2n, 110536), lite_prefix);
        while (Boolean(true)) {
            const lite_m2_open = liteFn_m2_scanConditionOpen(lite_source, lite_m2_cursor, lite_prefix);
            void lite_m2_open;
            if (((lite_m2_open) < (0n))) {
                return (-1n);
            }
            const lite_m2_end = liteFn_m2_scanBraceEnd(lite_source, lite_m2_open, lite_prefix);
            void lite_m2_end;
            if (((lite_m2_end) < (0n))) {
                return (-1n);
            }
            if (((lite_requireValueBranches) && ((!(liteFn_m2_valueIfBranchAt(lite_source, lite_m2_open, lite$subtractInt(lite_m2_end, 1n, 110819), lite_prefix)))))) {
                return (-1n);
            }
            const lite_m2_after = liteFn_m2_skipTrivia(lite_source, lite_m2_end, lite_prefix);
            void lite_m2_after;
            if ((!(liteFn_m3_wordAt(lite_source, lite_m2_after, "else")))) {
                return (-1n);
            }
            const lite_m2_afterElse = liteFn_m2_skipTrivia(lite_source, lite$addInt(lite_m2_after, 4n, 111011), lite_prefix);
            void lite_m2_afterElse;
            if (liteFn_m3_wordAt(lite_source, lite_m2_afterElse, "if")) {
                lite_m2_cursor = liteFn_m2_skipTrivia(lite_source, lite$addInt(lite_m2_afterElse, 2n, 111128), lite_prefix);
            } else {
                if (((((lite_m2_afterElse) >= (lite_m2_size))) || (((lite$textAt(lite_source, lite_m2_afterElse, 111195)) !== ("{"))))) {
                    return (-1n);
                }
                const lite_m2_finalEnd = liteFn_m2_scanBraceEnd(lite_source, lite_m2_afterElse, lite_prefix);
                void lite_m2_finalEnd;
                if (((lite_m2_finalEnd) < (0n))) {
                    return (-1n);
                }
                if (((lite_requireValueBranches) && ((!(liteFn_m2_valueIfBranchAt(lite_source, lite_m2_afterElse, lite$subtractInt(lite_m2_finalEnd, 1n, 111440), lite_prefix)))))) {
                    return (-1n);
                }
                return lite_m2_finalEnd;
            }
        }
        return (-1n);
    }
    void liteFn_m2_scanValueIfEnd;
    function liteFn_m2_visibleLocals(lite_locals: { name: string; runtime: string; kind: string; mutable: boolean; writable: boolean; depth: bigint; constant: boolean; code: string; intValue: bigint; textValue: string }[], lite_depth: bigint): { name: string; runtime: string; kind: string; mutable: boolean; writable: boolean; depth: bigint; constant: boolean; code: string; intValue: bigint; textValue: string }[] {
        void lite_locals;
        void lite_depth;
        const lite_m2_kept: { name: string; runtime: string; kind: string; mutable: boolean; writable: boolean; depth: bigint; constant: boolean; code: string; intValue: bigint; textValue: string }[] = [...([])];
        void lite_m2_kept;
        for (const lite_m2_entry of [...(lite_locals)]) {
            void lite_m2_entry;
            if ((((lite_m2_entry).depth) < (lite_depth))) {
                lite_m2_kept.push(lite_m2_entry);
            }
        }
        return [...(lite_m2_kept)];
    }
    void liteFn_m2_visibleLocals;
    function liteFn_m2_atValueTail(lite_blocks: string[], lite_blockCount: bigint): boolean {
        void lite_blocks;
        void lite_blockCount;
        if (((lite_blockCount) <= (0n))) {
            return false;
        }
        const lite_m2_kind = lite$listAt((lite_blocks), lite$subtractInt(lite_blockCount, 1n, 112194), 112183);
        void lite_m2_kind;
        return ((((lite_m2_kind) === ("function"))) || (((lite_m2_kind) === ("ifvalue"))));
    }
    void liteFn_m2_atValueTail;
    function liteFn_m2_insideLoop(lite_blocks: string[]): boolean {
        void lite_blocks;
        for (const lite_m2_kind of [...(lite_blocks)]) {
            void lite_m2_kind;
            if (((lite_m2_kind) === ("loop"))) {
                return true;
            }
        }
        return false;
    }
    void liteFn_m2_insideLoop;
    function liteFn_m2_skipItemSeparators(lite_source: string, lite_position: bigint, lite_prefix: string): bigint {
        void lite_source;
        void lite_position;
        void lite_prefix;
        let lite_m2_next = liteFn_m2_skipTrivia(lite_source, lite_position, lite_prefix);
        void lite_m2_next;
        while (((((lite_m2_next) < (lite$textLength(lite_source)))) && (((lite$textAt(lite_source, lite_m2_next, 112757)) === (";"))))) {
            lite_m2_next = liteFn_m2_skipTrivia(lite_source, lite$addInt(lite_m2_next, 1n, 112826), lite_prefix);
        }
        return lite_m2_next;
    }
    void liteFn_m2_skipItemSeparators;
    function liteFn_m2_scanExpressionItemEnd(lite_source: string, lite_start: bigint, lite_prefix: string): bigint {
        void lite_source;
        void lite_start;
        void lite_prefix;
        let lite_m2_cursor = lite_start;
        void lite_m2_cursor;
        let lite_m2_depth = 0n;
        void lite_m2_depth;
        const lite_m2_size = lite$textLength(lite_source);
        void lite_m2_size;
        while (((lite_m2_cursor) < (lite_m2_size))) {
            const lite_m2_ch = lite$textAt(lite_source, lite_m2_cursor, 113173);
            void lite_m2_ch;
            if (((lite_m2_ch) === ("\""))) {
                lite_m2_cursor = liteFn_m2_skipAliasString(lite_source, lite_m2_cursor);
            } else if (liteFn_m3_startsWithAt(lite_source, lite_m2_cursor, "/*")) {
                lite_m2_cursor = liteFn_m2_skipComment(lite_source, lite_m2_cursor, lite_prefix);
            } else if (((((lite_m2_depth) === (0n))) && ((((((lite_m2_ch) === (";"))) || (((lite_m2_ch) === ("}")))))))) {
                return lite_m2_cursor;
            } else {
                if (((((((lite_m2_ch) === ("("))) || (((lite_m2_ch) === ("["))))) || (((lite_m2_ch) === ("{"))))) {
                    lite_m2_depth = lite$addInt(lite_m2_depth, 1n, 113531);
                } else if (((((((lite_m2_ch) === (")"))) || (((lite_m2_ch) === ("]"))))) || (((lite_m2_ch) === ("}"))))) {
                    lite_m2_depth = lite$subtractInt(lite_m2_depth, 1n, 113610);
                }
                lite_m2_cursor = lite$addInt(lite_m2_cursor, 1n, 113645);
            }
        }
        return lite_m2_cursor;
    }
    void liteFn_m2_scanExpressionItemEnd;
    function liteFn_m2_parseExpressionItem(lite_target: string, lite_source: string, lite_position: bigint, lite_prefix: string, lite_locals: { name: string; runtime: string; kind: string; mutable: boolean; writable: boolean; depth: bigint; constant: boolean; code: string; intValue: bigint; textValue: string }[], lite_functions: { name: string; runtime: string; result: string; first: bigint; count: bigint }[], lite_params: string[], lite_currentName: string, lite_currentResult: string, lite_valueTail: boolean): { next: bigint; returned: boolean; code: string; valueKind: string } {
        void lite_target;
        void lite_source;
        void lite_position;
        void lite_prefix;
        void lite_locals;
        void lite_functions;
        void lite_params;
        void lite_currentName;
        void lite_currentResult;
        void lite_valueTail;
        let lite_m2_expected = lite_currentResult;
        void lite_m2_expected;
        if (((lite_currentResult) === ("Float"))) {
            lite_m2_expected = "";
            if (lite_valueTail) {
                const lite_m2_end = liteFn_m2_scanExpressionItemEnd(lite_source, lite_position, lite_prefix);
                void lite_m2_end;
                const lite_m2_next = liteFn_m2_skipItemSeparators(lite_source, lite_m2_end, lite_prefix);
                void lite_m2_next;
                if (((((lite_m2_next) < (lite$textLength(lite_source)))) && (((lite$textAt(lite_source, lite_m2_next, 114388)) === ("}"))))) {
                    lite_m2_expected = "Float";
                }
            }
        }
        const lite_m2_parsed = liteFn_m2_parseExpressionAs(lite_target, lite_source, lite_position, lite_prefix, [...(lite_locals)], [...(lite_functions)], [...(lite_params)], lite_currentName, lite_m2_expected);
        void lite_m2_parsed;
        const lite_m2_ended = liteFn_m2_consumeStatementEnd(lite_source, (lite_m2_parsed).next, lite_prefix);
        void lite_m2_ended;
        if (((lite_m2_ended) < (0n))) {
            liteFn_m2_failAt(lite_source, liteFn_m2_skipTrivia(lite_source, (lite_m2_parsed).next, lite_prefix), lite_prefix, "expected ; after expression statement");
        }
        const lite_m2_next = liteFn_m2_skipItemSeparators(lite_source, lite_m2_ended, lite_prefix);
        void lite_m2_next;
        const lite_m2_returned = ((((((((lite_currentName) !== (""))) && (lite_valueTail))) && (((lite_m2_next) < (lite$textLength(lite_source)))))) && (((lite$textAt(lite_source, lite_m2_next, 114901)) === ("}"))));
        void lite_m2_returned;
        if (((lite_m2_returned) && ((((lite_m2_parsed).kind) !== (lite_currentResult))))) {
            liteFn_m2_failAt(lite_source, lite_position, lite_prefix, (((((((((("cannot return ") + (liteFn_m2_displayKind((lite_m2_parsed).kind)))) + (" from function "))) + (lite_currentName))) + (" returning "))) + (liteFn_m2_displayKind(lite_currentResult))));
        }
        return { next: lite_m2_next, returned: lite_m2_returned, code: (Boolean(lite_m2_returned) ? (Boolean((((lite_m2_parsed).kind) === ("Unit"))) ? liteFn_m2_targetUnitEvaluationCode(lite_target, (lite_m2_parsed).code) : liteFn_m2_copiedValueCode(lite_target, lite_currentResult, (lite_m2_parsed).code)) : (lite_m2_parsed).code), valueKind: (lite_m2_parsed).kind };
    }
    void liteFn_m2_parseExpressionItem;
    function liteFn_m2_blockCompletion(lite_kind: string, lite_completed: boolean, lite_branchesComplete: boolean, lite_hasElse: boolean, lite_loopForever: boolean): boolean {
        void lite_kind;
        void lite_completed;
        void lite_branchesComplete;
        void lite_hasElse;
        void lite_loopForever;
        return (Boolean(((lite_kind) === ("scope"))) ? lite_completed : (Boolean(((lite_kind) === ("loop"))) ? ((lite_loopForever) && (lite_completed)) : ((((lite_hasElse) && (lite_branchesComplete))) && (lite_completed))));
    }
    void liteFn_m2_blockCompletion;
    function liteFn_m2_collectFutureValues(lite_target: string, lite_source: string, lite_prefix: string): { name: string; runtime: string; kind: string; at: bigint; intValue: bigint; textValue: string }[] {
        void lite_target;
        void lite_source;
        void lite_prefix;
        const lite_m2_values: { name: string; runtime: string; kind: string; at: bigint; intValue: bigint; textValue: string }[] = [...([])];
        void lite_m2_values;
        const lite_m2_size = lite$textLength(lite_source);
        void lite_m2_size;
        let lite_m2_cursor = 0n;
        void lite_m2_cursor;
        let lite_m2_braceDepth = 0n;
        void lite_m2_braceDepth;
        while (((lite_m2_cursor) < (lite_m2_size))) {
            const lite_m2_ch = lite$textAt(lite_source, lite_m2_cursor, 116221);
            void lite_m2_ch;
            if (((lite_m2_ch) === ("\""))) {
                lite_m2_cursor = liteFn_m2_skipAliasString(lite_source, lite_m2_cursor);
            } else if (liteFn_m3_startsWithAt(lite_source, lite_m2_cursor, "/*")) {
                lite_m2_cursor = liteFn_m2_skipComment(lite_source, lite_m2_cursor, lite_prefix);
            } else if (((lite_m2_ch) === ("{"))) {
                lite_m2_braceDepth = lite$addInt(lite_m2_braceDepth, 1n, 116510);
                lite_m2_cursor = lite$addInt(lite_m2_cursor, 1n, 116543);
            } else if (((lite_m2_ch) === ("}"))) {
                if (((lite_m2_braceDepth) > (0n))) {
                    lite_m2_braceDepth = lite$subtractInt(lite_m2_braceDepth, 1n, 116634);
                }
                lite_m2_cursor = lite$addInt(lite_m2_cursor, 1n, 116669);
            } else if (((((lite_m2_braceDepth) === (0n))) && (liteFn_m3_isNameStart(lite_m2_ch)))) {
                const lite_m2_nameStart = lite_m2_cursor;
                void lite_m2_nameStart;
                const lite_m2_nameEnd = liteFn_m3_skipName(lite_source, lite_m2_cursor);
                void lite_m2_nameEnd;
                const lite_m2_afterName = liteFn_m2_skipTrivia(lite_source, lite_m2_nameEnd, lite_prefix);
                void lite_m2_afterName;
                if (liteFn_m3_startsWithAt(lite_source, lite_m2_afterName, ":=")) {
                    const lite_m2_valueStart = liteFn_m2_skipTrivia(lite_source, lite$addInt(lite_m2_afterName, 2n, 117012), lite_prefix);
                    void lite_m2_valueStart;
                    if ((((!(liteFn_m3_wordAt(lite_source, lite_m2_valueStart, "fn")))) && ((!(liteFn_m3_wordAt(lite_source, lite_m2_valueStart, "type")))))) {
                        const lite_m2_valueCh = lite$textAt(lite_source, lite_m2_valueStart, 117174);
                        void lite_m2_valueCh;
                        let lite_m2_kind = "";
                        void lite_m2_kind;
                        let lite_m2_intValue = 0n;
                        void lite_m2_intValue;
                        let lite_m2_textValue = "";
                        void lite_m2_textValue;
                        if (((((liteFn_m3_isDigit(lite_m2_valueCh)) || (((lite_m2_valueCh) === ("+"))))) || (((lite_m2_valueCh) === ("-"))))) {
                            const lite_m2_parsed = liteFn_m2_parseNumber(lite_target, lite_source, lite_m2_valueStart, lite_prefix);
                            void lite_m2_parsed;
                            lite_m2_kind = (lite_m2_parsed).kind;
                            lite_m2_intValue = (lite_m2_parsed).intValue;
                        } else if (((lite_m2_valueCh) === ("\""))) {
                            const lite_m2_parsed = liteFn_m2_parseText(lite_target, lite_source, lite_m2_valueStart, lite_prefix);
                            void lite_m2_parsed;
                            lite_m2_kind = (lite_m2_parsed).kind;
                            lite_m2_textValue = (lite_m2_parsed).textValue;
                        } else if (((liteFn_m3_wordAt(lite_source, lite_m2_valueStart, "true")) || (liteFn_m3_wordAt(lite_source, lite_m2_valueStart, "false")))) {
                            lite_m2_kind = "Bool";
                            lite_m2_intValue = (Boolean(liteFn_m3_wordAt(lite_source, lite_m2_valueStart, "true")) ? 1n : 0n);
                        }
                        if (((lite_m2_kind) !== (""))) {
                            const lite_m2_valueName = lite$textSlice(lite_source, lite_m2_nameStart, lite_m2_nameEnd, 118166);
                            void lite_m2_valueName;
                            lite_m2_values.push({ name: lite_m2_valueName, runtime: (("lite_") + (lite_m2_valueName)), kind: lite_m2_kind, at: lite_m2_nameStart, intValue: lite_m2_intValue, textValue: lite_m2_textValue });
                        }
                    }
                    lite_m2_cursor = lite_m2_valueStart;
                } else {
                    lite_m2_cursor = lite_m2_nameEnd;
                }
            } else {
                lite_m2_cursor = lite$addInt(lite_m2_cursor, 1n, 118595);
            }
        }
        return [...(lite_m2_values)];
    }
    void liteFn_m2_collectFutureValues;
    function liteFn_m2_withoutFutureValues(lite_locals: { name: string; runtime: string; kind: string; mutable: boolean; writable: boolean; depth: bigint; constant: boolean; code: string; intValue: bigint; textValue: string }[]): { name: string; runtime: string; kind: string; mutable: boolean; writable: boolean; depth: bigint; constant: boolean; code: string; intValue: bigint; textValue: string }[] {
        void lite_locals;
        const lite_m2_kept: { name: string; runtime: string; kind: string; mutable: boolean; writable: boolean; depth: bigint; constant: boolean; code: string; intValue: bigint; textValue: string }[] = [...([])];
        void lite_m2_kept;
        for (const lite_m2_entry of [...(lite_locals)]) {
            void lite_m2_entry;
            if ((((lite_m2_entry).depth) >= (0n))) {
                lite_m2_kept.push(lite_m2_entry);
            }
        }
        return [...(lite_m2_kept)];
    }
    void liteFn_m2_withoutFutureValues;
    function liteFn_m2_parseImportClause(lite_target: string, lite_source: string, lite_position: bigint, lite_alias: string, lite_prefix: string): { kind: string; name: string; runtime: string; code: string; intValue: bigint; textValue: string } {
        void lite_target;
        void lite_source;
        void lite_position;
        void lite_alias;
        void lite_prefix;
        const lite_m2_pathStart = liteFn_m2_skipTrivia(lite_source, lite$addInt(lite_position, 6n, 119163), lite_prefix);
        void lite_m2_pathStart;
        if (((((lite_m2_pathStart) >= (lite$textLength(lite_source)))) || (((lite$textAt(lite_source, lite_m2_pathStart, 119219)) !== ("\""))))) {
            liteFn_m2_failAt(lite_source, lite_m2_pathStart, lite_prefix, "import requires a quoted source path");
        }
        const lite_m2_path = liteFn_m2_parseText(lite_target, lite_source, lite_m2_pathStart, lite_prefix);
        void lite_m2_path;
        const lite_m2_pathLength = lite$textLength((lite_m2_path).textValue);
        void lite_m2_pathLength;
        let lite_m2_invalidPath = ((lite_m2_pathLength) === (0n));
        void lite_m2_invalidPath;
        if (((((lite_m2_pathLength) > (0n))) && (((lite$textAt((lite_m2_path).textValue, 0n, 119515)) === ("/"))))) {
            lite_m2_invalidPath = true;
        }
        let lite_m2_pathIndex = 0n;
        void lite_m2_pathIndex;
        while (((lite_m2_pathIndex) < (lite_m2_pathLength))) {
            if (((lite$textAt((lite_m2_path).textValue, lite_m2_pathIndex, 119641)) === ("\\"))) {
                lite_m2_invalidPath = true;
            }
            lite_m2_pathIndex = lite$addInt(lite_m2_pathIndex, 1n, 119737);
        }
        if (((((((lite_m2_pathLength) > (1n))) && (((lite$textAt((lite_m2_path).textValue, 1n, 119774)) === (":"))))) && (liteFn_m3_isNameStart(lite$textAt((lite_m2_path).textValue, 0n, 119831))))) {
            lite_m2_invalidPath = true;
        }
        if (lite_m2_invalidPath) {
            liteFn_m2_failAt(lite_source, lite_m2_pathStart, lite_prefix, "import path must be nonempty, relative, and use \"/\" separators");
        }
        const lite_m2_statementNext = liteFn_m2_consumeStatementEnd(lite_source, (lite_m2_path).next, lite_prefix);
        void lite_m2_statementNext;
        if (((lite_m2_statementNext) < (0n))) {
            liteFn_m2_failAt(lite_source, liteFn_m2_skipTrivia(lite_source, (lite_m2_path).next, lite_prefix), lite_prefix, "expected ; after import");
        }
        return { kind: "Import", name: lite_alias, runtime: "", code: "", intValue: lite_m2_statementNext, textValue: (lite_m2_path).textValue };
    }
    void liteFn_m2_parseImportClause;
    function liteFn_m2_collectImportClauses(lite_target: string, lite_source: string, lite_prefix: string): { kind: string; name: string; runtime: string; code: string; intValue: bigint; textValue: string }[] {
        void lite_target;
        void lite_source;
        void lite_prefix;
        const lite_m2_imports: { kind: string; name: string; runtime: string; code: string; intValue: bigint; textValue: string }[] = [...([])];
        void lite_m2_imports;
        const lite_m2_size = lite$textLength(lite_source);
        void lite_m2_size;
        let lite_m2_position = 0n;
        void lite_m2_position;
        let lite_m2_depth = 0n;
        void lite_m2_depth;
        while (((lite_m2_position) < (lite_m2_size))) {
            lite_m2_position = liteFn_m2_skipTrivia(lite_source, lite_m2_position, lite_prefix);
            if (((lite_m2_position) >= (lite_m2_size))) {
                break;
            }
            const lite_m2_ch = lite$textAt(lite_source, lite_m2_position, 120804);
            void lite_m2_ch;
            if (((lite_m2_ch) === ("\""))) {
                lite_m2_position = liteFn_m2_skipAliasString(lite_source, lite_m2_position);
            } else if (((lite_m2_ch) === ("{"))) {
                lite_m2_depth = lite$addInt(lite_m2_depth, 1n, 120968);
                lite_m2_position = lite$addInt(lite_m2_position, 1n, 121005);
            } else if (((lite_m2_ch) === ("}"))) {
                if (((lite_m2_depth) > (0n))) {
                    lite_m2_depth = lite$subtractInt(lite_m2_depth, 1n, 121081);
                }
                lite_m2_position = lite$addInt(lite_m2_position, 1n, 121120);
            } else if (((((lite_m2_depth) === (0n))) && (liteFn_m3_isNameStart(lite_m2_ch)))) {
                const lite_m2_nameEnd = liteFn_m3_skipName(lite_source, lite_m2_position);
                void lite_m2_nameEnd;
                const lite_m2_name = lite$textSlice(lite_source, lite_m2_position, lite_m2_nameEnd, 121263);
                void lite_m2_name;
                if (((lite_m2_name) === ("import"))) {
                    const lite_m2_imported = liteFn_m2_parseImportClause(lite_target, lite_source, lite_m2_position, "", lite_prefix);
                    void lite_m2_imported;
                    lite_m2_imports.push(lite_m2_imported);
                    lite_m2_position = (lite_m2_imported).intValue;
                } else {
                    const lite_m2_afterName = liteFn_m2_skipTrivia(lite_source, lite_m2_nameEnd, lite_prefix);
                    void lite_m2_afterName;
                    const lite_m2_afterDeclare = liteFn_m2_skipTrivia(lite_source, lite$addInt(lite_m2_afterName, 2n, 121664), lite_prefix);
                    void lite_m2_afterDeclare;
                    if (((liteFn_m3_startsWithAt(lite_source, lite_m2_afterName, ":=")) && (liteFn_m3_wordAt(lite_source, lite_m2_afterDeclare, "import")))) {
                        const lite_m2_imported = liteFn_m2_parseImportClause(lite_target, lite_source, lite_m2_afterDeclare, lite_m2_name, lite_prefix);
                        void lite_m2_imported;
                        lite_m2_imports.push(lite_m2_imported);
                        lite_m2_position = (lite_m2_imported).intValue;
                    } else {
                        lite_m2_position = lite_m2_nameEnd;
                    }
                }
            } else {
                lite_m2_position = lite$addInt(lite_m2_position, 1n, 122141);
            }
        }
        return [...(lite_m2_imports)];
    }
    void liteFn_m2_collectImportClauses;
    function liteFn_m2_collectPublishedFunctions(lite_source: string, lite_prefix: string): string[] {
        void lite_source;
        void lite_prefix;
        const lite_m2_names: string[] = [...([])];
        void lite_m2_names;
        const lite_m2_size = lite$textLength(lite_source);
        void lite_m2_size;
        let lite_m2_position = 0n;
        void lite_m2_position;
        let lite_m2_depth = 0n;
        void lite_m2_depth;
        while (((lite_m2_position) < (lite_m2_size))) {
            lite_m2_position = liteFn_m2_skipTrivia(lite_source, lite_m2_position, lite_prefix);
            if (((lite_m2_position) >= (lite_m2_size))) {
                break;
            }
            const lite_m2_ch = lite$textAt(lite_source, lite_m2_position, 122559);
            void lite_m2_ch;
            if (((lite_m2_ch) === ("\""))) {
                lite_m2_position = liteFn_m2_skipAliasString(lite_source, lite_m2_position);
            } else if (((lite_m2_ch) === ("{"))) {
                lite_m2_depth = lite$addInt(lite_m2_depth, 1n, 122723);
                lite_m2_position = lite$addInt(lite_m2_position, 1n, 122760);
            } else if (((lite_m2_ch) === ("}"))) {
                if (((lite_m2_depth) > (0n))) {
                    lite_m2_depth = lite$subtractInt(lite_m2_depth, 1n, 122836);
                }
                lite_m2_position = lite$addInt(lite_m2_position, 1n, 122875);
            } else if (((((lite_m2_depth) === (0n))) && (liteFn_m3_wordAt(lite_source, lite_m2_position, "pub")))) {
                const lite_m2_declarationStart = liteFn_m2_skipTrivia(lite_source, lite$addInt(lite_m2_position, 3n, 123015), lite_prefix);
                void lite_m2_declarationStart;
                if (((((lite_m2_declarationStart) < (lite_m2_size))) && (liteFn_m3_isNameStart(lite$textAt(lite_source, lite_m2_declarationStart, 123092))))) {
                    const lite_m2_nameEnd = liteFn_m3_skipName(lite_source, lite_m2_declarationStart);
                    void lite_m2_nameEnd;
                    const lite_m2_operator = liteFn_m2_skipTrivia(lite_source, lite_m2_nameEnd, lite_prefix);
                    void lite_m2_operator;
                    const lite_m2_value = liteFn_m2_skipTrivia(lite_source, lite$addInt(lite_m2_operator, 2n, 123317), lite_prefix);
                    void lite_m2_value;
                    if (((liteFn_m3_startsWithAt(lite_source, lite_m2_operator, ":=")) && (liteFn_m3_wordAt(lite_source, lite_m2_value, "fn")))) {
                        lite_m2_names.push(lite$textSlice(lite_source, lite_m2_declarationStart, lite_m2_nameEnd, 123478));
                    }
                    lite_m2_position = lite_m2_nameEnd;
                } else {
                    lite_m2_position = lite$addInt(lite_m2_position, 3n, 123636);
                }
            } else {
                lite_m2_position = lite$addInt(lite_m2_position, 1n, 123704);
            }
        }
        return [...(lite_m2_names)];
    }
    void liteFn_m2_collectPublishedFunctions;
    function liteFn_m2_collectPublishedValues(lite_source: string, lite_prefix: string): string[] {
        void lite_source;
        void lite_prefix;
        const lite_m2_names: string[] = [...([])];
        void lite_m2_names;
        const lite_m2_size = lite$textLength(lite_source);
        void lite_m2_size;
        let lite_m2_position = 0n;
        void lite_m2_position;
        let lite_m2_depth = 0n;
        void lite_m2_depth;
        while (((lite_m2_position) < (lite_m2_size))) {
            lite_m2_position = liteFn_m2_skipTrivia(lite_source, lite_m2_position, lite_prefix);
            if (((lite_m2_position) >= (lite_m2_size))) {
                break;
            }
            const lite_m2_ch = lite$textAt(lite_source, lite_m2_position, 124162);
            void lite_m2_ch;
            if (((lite_m2_ch) === ("\""))) {
                lite_m2_position = liteFn_m2_skipAliasString(lite_source, lite_m2_position);
            } else if (((lite_m2_ch) === ("{"))) {
                lite_m2_depth = lite$addInt(lite_m2_depth, 1n, 124326);
                lite_m2_position = lite$addInt(lite_m2_position, 1n, 124363);
            } else if (((lite_m2_ch) === ("}"))) {
                if (((lite_m2_depth) > (0n))) {
                    lite_m2_depth = lite$subtractInt(lite_m2_depth, 1n, 124439);
                }
                lite_m2_position = lite$addInt(lite_m2_position, 1n, 124478);
            } else if (((((lite_m2_depth) === (0n))) && (liteFn_m3_wordAt(lite_source, lite_m2_position, "pub")))) {
                const lite_m2_declarationStart = liteFn_m2_skipTrivia(lite_source, lite$addInt(lite_m2_position, 3n, 124618), lite_prefix);
                void lite_m2_declarationStart;
                if (((((lite_m2_declarationStart) < (lite_m2_size))) && (liteFn_m3_isNameStart(lite$textAt(lite_source, lite_m2_declarationStart, 124695))))) {
                    const lite_m2_nameEnd = liteFn_m3_skipName(lite_source, lite_m2_declarationStart);
                    void lite_m2_nameEnd;
                    const lite_m2_operator = liteFn_m2_skipTrivia(lite_source, lite_m2_nameEnd, lite_prefix);
                    void lite_m2_operator;
                    const lite_m2_value = liteFn_m2_skipTrivia(lite_source, lite$addInt(lite_m2_operator, 2n, 124920), lite_prefix);
                    void lite_m2_value;
                    if (((((liteFn_m3_startsWithAt(lite_source, lite_m2_operator, ":=")) && ((!(liteFn_m3_wordAt(lite_source, lite_m2_value, "fn")))))) && ((!(liteFn_m3_wordAt(lite_source, lite_m2_value, "type")))))) {
                        lite_m2_names.push(lite$textSlice(lite_source, lite_m2_declarationStart, lite_m2_nameEnd, 125151));
                    }
                    lite_m2_position = lite_m2_nameEnd;
                } else {
                    lite_m2_position = lite$addInt(lite_m2_position, 3n, 125309);
                }
            } else {
                lite_m2_position = lite$addInt(lite_m2_position, 1n, 125377);
            }
        }
        return [...(lite_m2_names)];
    }
    void liteFn_m2_collectPublishedValues;
    function liteFn_m2_collectPublishedTypes(lite_source: string, lite_prefix: string): string[] {
        void lite_source;
        void lite_prefix;
        const lite_m2_names: string[] = [...([])];
        void lite_m2_names;
        const lite_m2_size = lite$textLength(lite_source);
        void lite_m2_size;
        let lite_m2_position = 0n;
        void lite_m2_position;
        let lite_m2_depth = 0n;
        void lite_m2_depth;
        while (((lite_m2_position) < (lite_m2_size))) {
            lite_m2_position = liteFn_m2_skipTrivia(lite_source, lite_m2_position, lite_prefix);
            if (((lite_m2_position) >= (lite_m2_size))) {
                break;
            }
            const lite_m2_ch = lite$textAt(lite_source, lite_m2_position, 125809);
            void lite_m2_ch;
            if (((lite_m2_ch) === ("\""))) {
                lite_m2_position = liteFn_m2_skipAliasString(lite_source, lite_m2_position);
            } else if (((lite_m2_ch) === ("{"))) {
                lite_m2_depth = lite$addInt(lite_m2_depth, 1n, 125973);
                lite_m2_position = lite$addInt(lite_m2_position, 1n, 126010);
            } else if (((lite_m2_ch) === ("}"))) {
                if (((lite_m2_depth) > (0n))) {
                    lite_m2_depth = lite$subtractInt(lite_m2_depth, 1n, 126086);
                }
                lite_m2_position = lite$addInt(lite_m2_position, 1n, 126125);
            } else if (((((lite_m2_depth) === (0n))) && (liteFn_m3_wordAt(lite_source, lite_m2_position, "pub")))) {
                const lite_m2_declarationStart = liteFn_m2_skipTrivia(lite_source, lite$addInt(lite_m2_position, 3n, 126265), lite_prefix);
                void lite_m2_declarationStart;
                if (((((lite_m2_declarationStart) < (lite_m2_size))) && (liteFn_m3_isNameStart(lite$textAt(lite_source, lite_m2_declarationStart, 126342))))) {
                    const lite_m2_nameEnd = liteFn_m3_skipName(lite_source, lite_m2_declarationStart);
                    void lite_m2_nameEnd;
                    const lite_m2_operator = liteFn_m2_skipTrivia(lite_source, lite_m2_nameEnd, lite_prefix);
                    void lite_m2_operator;
                    const lite_m2_typeStart = liteFn_m2_skipTrivia(lite_source, lite$addInt(lite_m2_operator, 2n, 126571), lite_prefix);
                    void lite_m2_typeStart;
                    if (((liteFn_m3_startsWithAt(lite_source, lite_m2_operator, ":=")) && (liteFn_m3_wordAt(lite_source, lite_m2_typeStart, "type")))) {
                        lite_m2_names.push(lite$textSlice(lite_source, lite_m2_declarationStart, lite_m2_nameEnd, 126738));
                    }
                    lite_m2_position = lite_m2_nameEnd;
                } else {
                    lite_m2_position = lite$addInt(lite_m2_position, 3n, 126896);
                }
            } else {
                lite_m2_position = lite$addInt(lite_m2_position, 1n, 126964);
            }
        }
        return [...(lite_m2_names)];
    }
    void liteFn_m2_collectPublishedTypes;
    function liteFn_m2_parseProgramWithExports(lite_target: string, lite_source: string, lite_prefix: string, lite_exports: { kind: string; name: string; runtime: string; code: string; intValue: bigint; textValue: string }[], lite_moduleId: bigint): { kind: string; name: string; runtime: string; code: string; intValue: bigint; textValue: string }[] {
        void lite_target;
        void lite_source;
        void lite_prefix;
        void lite_exports;
        void lite_moduleId;
        const lite_m2_size = lite$textLength(lite_source);
        void lite_m2_size;
        let lite_m2_position = liteFn_m2_skipTrivia(lite_source, 0n, lite_prefix);
        void lite_m2_position;
        const lite_m2_items: { kind: string; name: string; runtime: string; code: string; intValue: bigint; textValue: string }[] = [...([])];
        void lite_m2_items;
        if (((lite_m2_position) === (lite_m2_size))) {
            return [...(lite_m2_items)];
        }
        const lite_m2_aliases: { name: string; target: string; at: bigint; end: bigint }[] = [...([])];
        void lite_m2_aliases;
        for (const lite_m2_exported of [...(lite_exports)]) {
            void lite_m2_exported;
            if ((((lite_m2_exported).kind) === ("PublicType"))) {
                lite_m2_aliases.push({ name: (lite_m2_exported).name, target: (lite_m2_exported).code, at: (-1n), end: 0n });
            }
        }
        for (const lite_m2_alias of [...(liteFn_m2_collectAliases(lite_source, lite_prefix))]) {
            void lite_m2_alias;
            lite_m2_aliases.push(lite_m2_alias);
        }
        const lite_m2_publishedFunctions: string[] = [...(liteFn_m2_collectPublishedFunctions(lite_source, lite_prefix))];
        void lite_m2_publishedFunctions;
        const lite_m2_publishedValues: string[] = [...(liteFn_m2_collectPublishedValues(lite_source, lite_prefix))];
        void lite_m2_publishedValues;
        const lite_m2_publishedTypes: string[] = [...(liteFn_m2_collectPublishedTypes(lite_source, lite_prefix))];
        void lite_m2_publishedTypes;
        const lite_m2_futureValues: { name: string; runtime: string; kind: string; at: bigint; intValue: bigint; textValue: string }[] = [...(liteFn_m2_collectFutureValues(lite_target, lite_source, lite_prefix))];
        void lite_m2_futureValues;
        let lite_m2_locals: { name: string; runtime: string; kind: string; mutable: boolean; writable: boolean; depth: bigint; constant: boolean; code: string; intValue: bigint; textValue: string }[] = [...([])];
        void lite_m2_locals;
        const lite_m2_blocks: string[] = [...([])];
        void lite_m2_blocks;
        const lite_m2_functions: { name: string; runtime: string; result: string; first: bigint; count: bigint }[] = [...([])];
        void lite_m2_functions;
        const lite_m2_functionParams: string[] = [...([])];
        void lite_m2_functionParams;
        const lite_m2_declaredImportAliases: string[] = [...([])];
        void lite_m2_declaredImportAliases;
        let lite_m2_parameterTotal = 0n;
        void lite_m2_parameterTotal;
        for (const lite_m2_exported of [...(lite_exports)]) {
            void lite_m2_exported;
            if ((((lite_m2_exported).kind) === ("ModuleAlias"))) {
                if (((((liteFn_m2_findFunction([...(lite_m2_functions)], (lite_m2_exported).name)) >= (0n))) || (((liteFn_m2_localIndex([...(lite_m2_locals)], (lite_m2_exported).name)) >= (0n))))) {
                    liteFn_m8_fail(lite_prefix, (("duplicate imported module name ") + ((lite_m2_exported).name)));
                }
                lite_m2_locals.push({ name: (lite_m2_exported).name, runtime: "", kind: "Module", mutable: false, writable: false, depth: 0n, constant: false, code: "", intValue: (lite_m2_exported).intValue, textValue: (lite_m2_exported).name });
            } else if ((((lite_m2_exported).kind) === ("PublicFunction"))) {
                if (((((liteFn_m2_findFunction([...(lite_m2_functions)], (lite_m2_exported).name)) >= (0n))) || (((liteFn_m2_localIndex([...(lite_m2_locals)], (lite_m2_exported).name)) >= (0n))))) {
                    liteFn_m8_fail(lite_prefix, (("duplicate imported public name ") + ((lite_m2_exported).name)));
                }
                const lite_m2_first = lite_m2_parameterTotal;
                void lite_m2_first;
                let lite_m2_entryStart = 0n;
                void lite_m2_entryStart;
                let lite_m2_entryIndex = 0n;
                void lite_m2_entryIndex;
                while (((lite_m2_entryIndex) < ((lite_m2_exported).intValue))) {
                    const lite_m2_separator = liteFn_m3_indexOfText((lite_m2_exported).textValue, "|", lite_m2_entryStart);
                    void lite_m2_separator;
                    let lite_m2_entryEnd = lite$textLength((lite_m2_exported).textValue);
                    void lite_m2_entryEnd;
                    if (((lite_m2_separator) >= (0n))) {
                        lite_m2_entryEnd = lite_m2_separator;
                    }
                    lite_m2_functionParams.push(lite$textSlice((lite_m2_exported).textValue, lite_m2_entryStart, lite_m2_entryEnd, 129450));
                    lite_m2_parameterTotal = lite$addInt(lite_m2_parameterTotal, 1n, 129552);
                    lite_m2_entryStart = lite$addInt(lite_m2_entryEnd, 1n, 129595);
                    lite_m2_entryIndex = lite$addInt(lite_m2_entryIndex, 1n, 129640);
                }
                lite_m2_functions.push({ name: (lite_m2_exported).name, runtime: (lite_m2_exported).runtime, result: (lite_m2_exported).code, first: lite_m2_first, count: (lite_m2_exported).intValue });
            } else if ((((lite_m2_exported).kind) === ("PublicValue"))) {
                if (((((liteFn_m2_findFunction([...(lite_m2_functions)], (lite_m2_exported).name)) >= (0n))) || (((liteFn_m2_localIndex([...(lite_m2_locals)], (lite_m2_exported).name)) >= (0n))))) {
                    liteFn_m8_fail(lite_prefix, (("duplicate imported public name ") + ((lite_m2_exported).name)));
                }
                lite_m2_locals.push({ name: (lite_m2_exported).name, runtime: (lite_m2_exported).runtime, kind: (lite_m2_exported).code, mutable: false, writable: false, depth: 0n, constant: false, code: (lite_m2_exported).runtime, intValue: 0n, textValue: "" });
            } else if ((((lite_m2_exported).kind) === ("PublicType"))) {
                if (((liteFn_m2_findAlias([...(lite_m2_aliases)], (lite_m2_exported).name)) < (0n))) {
                    liteFn_m8_fail(lite_prefix, (("unknown imported public type ") + ((lite_m2_exported).name)));
                }
            }
        }
        let lite_m2_blockCount = 0n;
        void lite_m2_blockCount;
        let lite_m2_depth = 0n;
        void lite_m2_depth;
        let lite_m2_currentName = "";
        void lite_m2_currentName;
        let lite_m2_currentResult = "";
        void lite_m2_currentResult;
        let lite_m2_currentReturned = false;
        void lite_m2_currentReturned;
        let lite_m2_currentStopped = false;
        void lite_m2_currentStopped;
        let lite_m2_branchesReturned = true;
        void lite_m2_branchesReturned;
        let lite_m2_branchesStopped = true;
        void lite_m2_branchesStopped;
        let lite_m2_hasElse = false;
        void lite_m2_hasElse;
        let lite_m2_loopForever = false;
        void lite_m2_loopForever;
        let lite_m2_currentLive = true;
        void lite_m2_currentLive;
        const lite_m2_savedStates: { returned: boolean; stopped: boolean; branchesReturned: boolean; branchesStopped: boolean; hasElse: boolean; loopForever: boolean; live: boolean }[] = [...([])];
        void lite_m2_savedStates;
        while (((lite_m2_position) < (lite_m2_size))) {
            const lite_m2_ch = lite$textAt(lite_source, lite_m2_position, 130975);
            void lite_m2_ch;
            if (((lite_m2_ch) === (";"))) {
                lite_m2_position = liteFn_m2_skipItemSeparators(lite_source, lite_m2_position, lite_prefix);
                continue;
            }
            if (((lite_m2_ch) === ("}"))) {
                if (((lite_m2_blockCount) === (0n))) {
                    liteFn_m2_failAt(lite_source, lite_m2_position, lite_prefix, "unexpected }");
                }
                const lite_m2_blockKind = lite$listAt((lite_m2_blocks), lite$subtractInt(lite_m2_blockCount, 1n, 131304), 131293);
                void lite_m2_blockKind;
                if (((((((lite_m2_blockKind) === ("ifvalue"))) && (((lite_m2_currentResult) !== ("Unit"))))) && ((!(lite_m2_currentReturned))))) {
                    liteFn_m2_failAt(lite_source, lite_m2_position, lite_prefix, (((((("branch of function ") + (lite_m2_currentName))) + (" must return "))) + (liteFn_m2_displayKind(lite_m2_currentResult))));
                }
                const lite_m2_after = liteFn_m2_skipTrivia(lite_source, lite$addInt(lite_m2_position, 1n, 131600), lite_prefix);
                void lite_m2_after;
                if ((((((((((lite_m2_blockKind) === ("if"))) || (((lite_m2_blockKind) === ("ifvalue")))))) && (((lite_m2_after) < (lite_m2_size))))) && (liteFn_m3_wordAt(lite_source, lite_m2_after, "else")))) {
                    lite_m2_locals = [...(liteFn_m2_visibleLocals([...(lite_m2_locals)], lite_m2_depth))];
                    const lite_m2_afterElse = liteFn_m2_skipTrivia(lite_source, lite$addInt(lite_m2_after, 4n, 131845), lite_prefix);
                    void lite_m2_afterElse;
                    lite_m2_branchesReturned = ((lite_m2_branchesReturned) && (lite_m2_currentReturned));
                    lite_m2_branchesStopped = ((lite_m2_branchesStopped) && (lite_m2_currentStopped));
                    lite_m2_currentReturned = false;
                    lite_m2_currentStopped = false;
                    lite_m2_hasElse = (!(liteFn_m3_wordAt(lite_source, lite_m2_afterElse, "if")));
                    const lite_m2_droppedIf = lite$listPopBack(lite_m2_blocks, 132183);
                    void lite_m2_droppedIf;
                    lite_m2_blockCount = lite$subtractInt(lite_m2_blockCount, 1n, 132245);
                    if (liteFn_m3_wordAt(lite_source, lite_m2_afterElse, "if")) {
                        const lite_m2_conditionStart = liteFn_m2_skipTrivia(lite_source, lite$addInt(lite_m2_afterElse, 2n, 132378), lite_prefix);
                        void lite_m2_conditionStart;
                        const lite_m2_condition = liteFn_m2_parseExpression(lite_target, lite_source, lite_m2_conditionStart, lite_prefix, [...(lite_m2_locals)], [...(lite_m2_functions)], [...(lite_m2_functionParams)], lite_m2_currentName);
                        void lite_m2_condition;
                        if ((((lite_m2_condition).kind) !== ("Bool"))) {
                            liteFn_m2_failAt(lite_source, lite_m2_conditionStart, lite_prefix, "else if condition must be Bool");
                        }
                        const lite_m2_conditionCode = (Boolean((lite_m2_condition).constant) ? liteFn_m2_targetBoolLiteralCode(lite_target, (((lite_m2_condition).intValue) !== (0n))) : (lite_m2_condition).code);
                        void lite_m2_conditionCode;
                        lite_m2_position = liteFn_m2_expectSymbol(lite_source, liteFn_m2_skipTrivia(lite_source, (lite_m2_condition).next, lite_prefix), "{", lite_prefix);
                        if (lite_m2_currentLive) {
                            lite_m2_items.push({ kind: "ElseIf", name: "", runtime: "", code: lite_m2_conditionCode, intValue: 0n, textValue: "" });
                        }
                        lite_m2_blocks.push(lite_m2_blockKind);
                        lite_m2_blockCount = lite$addInt(lite_m2_blockCount, 1n, 133322);
                    } else {
                        if (lite_m2_currentLive) {
                            lite_m2_items.push({ kind: "Else", name: "", runtime: "", code: "", intValue: 0n, textValue: "" });
                        }
                        lite_m2_blocks.push((Boolean(((lite_m2_blockKind) === ("ifvalue"))) ? "ifvalue" : "else"));
                        lite_m2_blockCount = lite$addInt(lite_m2_blockCount, 1n, 133640);
                        lite_m2_position = liteFn_m2_expectSymbol(lite_source, lite_m2_afterElse, "{", lite_prefix);
                    }
                    lite_m2_position = liteFn_m2_skipTrivia(lite_source, lite$addInt(lite_m2_position, 1n, 133795), lite_prefix);
                    continue;
                }
                lite_m2_locals = [...(liteFn_m2_visibleLocals([...(lite_m2_locals)], lite_m2_depth))];
                lite_m2_depth = lite$subtractInt(lite_m2_depth, 1n, 133926);
                if (((lite_m2_blockKind) === ("function"))) {
                    lite_m2_locals = [...(liteFn_m2_withoutFutureValues([...(lite_m2_locals)]))];
                    if (((((lite_m2_currentResult) !== ("Unit"))) && ((!(lite_m2_currentReturned))))) {
                        liteFn_m2_failAt(lite_source, lite_m2_position, lite_prefix, (((((("function ") + (lite_m2_currentName))) + (" must return "))) + (lite_m2_currentResult)));
                    }
                    const lite_m2_functionRuntime = (Boolean(((lite_moduleId) === (0n))) ? (("liteFn_") + (lite_m2_currentName)) : (((((("liteFn_m") + (liteFn_m4_intText(lite_moduleId)))) + ("_"))) + (lite_m2_currentName)));
                    void lite_m2_functionRuntime;
                    if (lite_m2_currentLive) {
                        lite_m2_items.push({ kind: "FunctionEnd", name: "", runtime: lite_m2_functionRuntime, code: "", intValue: 0n, textValue: "" });
                    }
                    lite_m2_currentName = "";
                    lite_m2_currentResult = "";
                    lite_m2_currentReturned = false;
                } else if (((lite_m2_blockKind) === ("loop"))) {
                    if (lite_m2_currentLive) {
                        lite_m2_items.push({ kind: "EndLoop", name: "", runtime: "", code: "", intValue: 0n, textValue: "" });
                    }
                } else if (((lite_m2_blockKind) === ("scope"))) {
                    if (lite_m2_currentLive) {
                        lite_m2_items.push({ kind: "EndScope", name: "", runtime: "", code: "", intValue: 0n, textValue: "" });
                    }
                } else {
                    if (lite_m2_currentLive) {
                        lite_m2_items.push({ kind: "EndIf", name: "", runtime: "", code: "", intValue: 0n, textValue: "" });
                    }
                }
                const lite_m2_completedReturn = liteFn_m2_blockCompletion(lite_m2_blockKind, lite_m2_currentReturned, lite_m2_branchesReturned, lite_m2_hasElse, lite_m2_loopForever);
                void lite_m2_completedReturn;
                const lite_m2_completedStop = liteFn_m2_blockCompletion(lite_m2_blockKind, (Boolean(((lite_m2_blockKind) === ("loop"))) ? lite_m2_currentReturned : lite_m2_currentStopped), lite_m2_branchesStopped, lite_m2_hasElse, lite_m2_loopForever);
                void lite_m2_completedStop;
                if (((((((lite_m2_blockKind) === ("loop"))) && (lite_m2_completedReturn))) && (lite_m2_currentLive))) {
                    lite_m2_items.push({ kind: "Unreachable", name: "", runtime: "", code: "", intValue: 0n, textValue: "" });
                }
                const lite_m2_parent = lite$listPopBack(lite_m2_savedStates, 135774);
                void lite_m2_parent;
                lite_m2_currentReturned = (((lite_m2_parent).returned) || (((((((!((lite_m2_parent).stopped))) && (lite_m2_completedReturn))) && (((lite_m2_blockKind) !== ("function")))))));
                lite_m2_currentStopped = (((lite_m2_parent).stopped) || ((((lite_m2_completedStop) && (((lite_m2_blockKind) !== ("function")))))));
                lite_m2_branchesReturned = (lite_m2_parent).branchesReturned;
                lite_m2_branchesStopped = (lite_m2_parent).branchesStopped;
                lite_m2_hasElse = (lite_m2_parent).hasElse;
                lite_m2_loopForever = (lite_m2_parent).loopForever;
                lite_m2_currentLive = (lite_m2_parent).live;
                const lite_m2_droppedBlock = lite$listPopBack(lite_m2_blocks, 136275);
                void lite_m2_droppedBlock;
                lite_m2_blockCount = lite$subtractInt(lite_m2_blockCount, 1n, 136333);
                lite_m2_position = liteFn_m2_skipTrivia(lite_source, lite$addInt(lite_m2_position, 1n, 136389), lite_prefix);
                if (((((lite_m2_position) < (lite_m2_size))) && (((lite$textAt(lite_source, lite_m2_position, 136438)) === (";"))))) {
                    lite_m2_position = liteFn_m2_skipTrivia(lite_source, lite$addInt(lite_m2_position, 1n, 136527), lite_prefix);
                }
                continue;
            }
            if (((lite_m2_ch) === ("{"))) {
                if (((lite_m2_currentLive) && ((!(lite_m2_currentStopped))))) {
                    lite_m2_items.push({ kind: "Scope", name: "", runtime: "", code: "", intValue: 0n, textValue: "" });
                }
                lite_m2_savedStates.push({ returned: lite_m2_currentReturned, stopped: lite_m2_currentStopped, branchesReturned: lite_m2_branchesReturned, branchesStopped: lite_m2_branchesStopped, hasElse: lite_m2_hasElse, loopForever: lite_m2_loopForever, live: lite_m2_currentLive });
                lite_m2_currentLive = ((lite_m2_currentLive) && ((!(lite_m2_currentStopped))));
                lite_m2_currentReturned = false;
                lite_m2_currentStopped = false;
                lite_m2_branchesReturned = true;
                lite_m2_branchesStopped = true;
                lite_m2_hasElse = false;
                lite_m2_loopForever = false;
                lite_m2_blocks.push("scope");
                lite_m2_blockCount = lite$addInt(lite_m2_blockCount, 1n, 137370);
                lite_m2_depth = lite$addInt(lite_m2_depth, 1n, 137401);
                lite_m2_position = liteFn_m2_skipTrivia(lite_source, lite$addInt(lite_m2_position, 1n, 137457), lite_prefix);
                continue;
            }
            if (((((((((((((((((((((liteFn_m3_isDigit(lite_m2_ch)) || (((lite_m2_ch) === ("\""))))) || (((lite_m2_ch) === ("("))))) || (((lite_m2_ch) === ("["))))) || (((lite_m2_ch) === ("+"))))) || (((lite_m2_ch) === ("-"))))) || ((((((lite_m2_ch) === ("a"))) && (liteFn_m3_wordAt(lite_source, lite_m2_position, "and"))))))) || ((((((lite_m2_ch) === ("o"))) && (liteFn_m3_wordAt(lite_source, lite_m2_position, "or"))))))) || ((((((lite_m2_ch) === ("n"))) && (liteFn_m3_wordAt(lite_source, lite_m2_position, "not"))))))) || ((((((lite_m2_ch) === ("t"))) && (liteFn_m3_wordAt(lite_source, lite_m2_position, "true"))))))) || ((((((lite_m2_ch) === ("f"))) && (liteFn_m3_wordAt(lite_source, lite_m2_position, "false"))))))) {
                const lite_m2_expression = liteFn_m2_parseExpressionItem(lite_target, lite_source, lite_m2_position, lite_prefix, [...(lite_m2_locals)], [...(lite_m2_functions)], [...(lite_m2_functionParams)], lite_m2_currentName, lite_m2_currentResult, ((liteFn_m2_atValueTail([...(lite_m2_blocks)], lite_m2_blockCount)) && ((!(lite_m2_currentStopped)))));
                void lite_m2_expression;
                if (((lite_m2_currentLive) && ((!(lite_m2_currentStopped))))) {
                    lite_m2_items.push({ kind: (Boolean((lite_m2_expression).returned) ? "Return" : "Discard"), name: (lite_m2_expression).valueKind, runtime: "", code: (lite_m2_expression).code, intValue: 0n, textValue: "" });
                }
                if ((lite_m2_expression).returned) {
                    lite_m2_currentReturned = true;
                    lite_m2_currentStopped = true;
                }
                lite_m2_position = (lite_m2_expression).next;
                continue;
            }
            if ((!(liteFn_m3_isNameStart(lite_m2_ch)))) {
                liteFn_m2_failAt(lite_source, lite_m2_position, lite_prefix, "expected a statement: output/outputLine, declaration, assignment, if or loop");
            }
            const lite_m2_nameStart = lite_m2_position;
            void lite_m2_nameStart;
            lite_m2_position = liteFn_m3_skipName(lite_source, lite_m2_position);
            const lite_m2_name = lite$textSlice(lite_source, lite_m2_nameStart, lite_m2_position, 138842);
            void lite_m2_name;
            if (((lite_m2_name) === ("import"))) {
                if (((lite_m2_blockCount) !== (0n))) {
                    liteFn_m2_failAt(lite_source, lite_m2_nameStart, lite_prefix, "import is only allowed at top level");
                }
                const lite_m2_imported = liteFn_m2_parseImportClause(lite_target, lite_source, lite_m2_nameStart, "", lite_prefix);
                void lite_m2_imported;
                lite_m2_items.push(lite_m2_imported);
                lite_m2_position = (lite_m2_imported).intValue;
                continue;
            }
            if (((lite_m2_name) === ("pub"))) {
                if (((lite_m2_blockCount) !== (0n))) {
                    liteFn_m2_failAt(lite_source, lite_m2_nameStart, lite_prefix, "pub is only allowed on top-level declarations");
                }
                const lite_m2_declarationStart = liteFn_m2_skipTrivia(lite_source, lite_m2_position, lite_prefix);
                void lite_m2_declarationStart;
                if (((((lite_m2_declarationStart) >= (lite_m2_size))) || ((!(liteFn_m3_isNameStart(lite$textAt(lite_source, lite_m2_declarationStart, 139562))))))) {
                    liteFn_m2_failAt(lite_source, lite_m2_declarationStart, lite_prefix, "expected a declaration after pub");
                }
                const lite_m2_declarationEnd = liteFn_m3_skipName(lite_source, lite_m2_declarationStart);
                void lite_m2_declarationEnd;
                const lite_m2_declarationOperator = liteFn_m2_skipTrivia(lite_source, lite_m2_declarationEnd, lite_prefix);
                void lite_m2_declarationOperator;
                if ((!(liteFn_m3_startsWithAt(lite_source, lite_m2_declarationOperator, ":=")))) {
                    liteFn_m2_failAt(lite_source, lite_m2_declarationOperator, lite_prefix, "expected := after published declaration name");
                }
                lite_m2_position = lite_m2_declarationStart;
                continue;
            }
            lite_m2_position = liteFn_m2_skipTrivia(lite_source, lite_m2_position, lite_prefix);
            if (liteFn_m3_startsWithAt(lite_source, lite_m2_position, ":=")) {
                const lite_m2_afterImport = liteFn_m2_skipTrivia(lite_source, lite$addInt(lite_m2_position, 2n, 140302), lite_prefix);
                void lite_m2_afterImport;
                if (liteFn_m3_wordAt(lite_source, lite_m2_afterImport, "import")) {
                    if (((lite_m2_blockCount) !== (0n))) {
                        liteFn_m2_failAt(lite_source, lite_m2_nameStart, lite_prefix, "import is only allowed at top level");
                    }
                    if (liteFn_m6_listContainsText([...(lite_m2_declaredImportAliases)], lite_m2_name)) {
                        liteFn_m2_failAt(lite_source, lite_m2_nameStart, lite_prefix, (("duplicate module alias ") + (lite_m2_name)));
                    }
                    lite_m2_declaredImportAliases.push(lite_m2_name);
                    const lite_m2_imported = liteFn_m2_parseImportClause(lite_target, lite_source, lite_m2_afterImport, lite_m2_name, lite_prefix);
                    void lite_m2_imported;
                    lite_m2_items.push(lite_m2_imported);
                    lite_m2_position = (lite_m2_imported).intValue;
                    continue;
                }
            }
            let lite_m2_afterDefinition = lite_m2_position;
            void lite_m2_afterDefinition;
            if (liteFn_m3_startsWithAt(lite_source, lite_m2_position, ":=")) {
                lite_m2_afterDefinition = liteFn_m2_skipTrivia(lite_source, lite$addInt(lite_m2_position, 2n, 141162), lite_prefix);
            }
            const lite_m2_definition = ((((((lite_m2_blockCount) === (0n))) && (liteFn_m3_startsWithAt(lite_source, lite_m2_position, ":=")))) && ((((liteFn_m3_wordAt(lite_source, lite_m2_afterDefinition, "fn")) || (liteFn_m3_wordAt(lite_source, lite_m2_afterDefinition, "type"))))));
            void lite_m2_definition;
            if (((lite_m2_name) === ("return"))) {
                if (((lite_m2_currentName) === (""))) {
                    liteFn_m2_failAt(lite_source, lite_m2_nameStart, lite_prefix, "return outside a function");
                }
                const lite_m2_valueStart = lite_m2_position;
                void lite_m2_valueStart;
                if (((((((lite_m2_valueStart) >= (lite_m2_size))) || (((lite$textAt(lite_source, lite_m2_valueStart, 141621)) === (";"))))) || (((lite$textAt(lite_source, lite_m2_valueStart, 141658)) === ("}"))))) {
                    if (((lite_m2_currentResult) !== ("Unit"))) {
                        liteFn_m2_failAt(lite_source, lite_m2_nameStart, lite_prefix, (((((("function ") + (lite_m2_currentName))) + (" must return "))) + (lite_m2_currentResult)));
                    }
                    lite_m2_position = liteFn_m2_consumeStatementEnd(lite_source, lite_m2_valueStart, lite_prefix);
                    if (((lite_m2_currentLive) && ((!(lite_m2_currentStopped))))) {
                        lite_m2_items.push({ kind: "Return", name: "", runtime: "", code: "", intValue: 0n, textValue: "" });
                    }
                    if ((!(lite_m2_currentStopped))) {
                        lite_m2_currentReturned = true;
                    }
                    lite_m2_currentStopped = true;
                    continue;
                }
                if (((lite_m2_currentResult) === ("Unit"))) {
                    liteFn_m2_failAt(lite_source, lite_m2_nameStart, lite_prefix, (((("function ") + (lite_m2_currentName))) + (" returns Unit and cannot return a value")));
                }
                const lite_m2_parsed = liteFn_m2_parseExpressionAs(lite_target, lite_source, lite_m2_position, lite_prefix, [...(lite_m2_locals)], [...(lite_m2_functions)], [...(lite_m2_functionParams)], lite_m2_currentName, lite_m2_currentResult);
                void lite_m2_parsed;
                if ((((lite_m2_parsed).kind) !== (lite_m2_currentResult))) {
                    liteFn_m2_failAt(lite_source, lite_m2_valueStart, lite_prefix, (((((((((("cannot return ") + (liteFn_m2_displayKind((lite_m2_parsed).kind)))) + (" from function "))) + (lite_m2_currentName))) + (" returning "))) + (liteFn_m2_displayKind(lite_m2_currentResult))));
                }
                const lite_m2_statementNext = liteFn_m2_consumeStatementEnd(lite_source, (lite_m2_parsed).next, lite_prefix);
                void lite_m2_statementNext;
                if (((lite_m2_statementNext) < (0n))) {
                    liteFn_m2_failAt(lite_source, liteFn_m2_skipTrivia(lite_source, (lite_m2_parsed).next, lite_prefix), lite_prefix, "expected ; after return");
                }
                lite_m2_position = lite_m2_statementNext;
                if (((lite_m2_currentLive) && ((!(lite_m2_currentStopped))))) {
                    lite_m2_items.push({ kind: "Return", name: "", runtime: "", code: liteFn_m2_copiedValueCode(lite_target, lite_m2_currentResult, (lite_m2_parsed).code), intValue: 0n, textValue: "" });
                }
                if ((!(lite_m2_currentStopped))) {
                    lite_m2_currentReturned = true;
                }
                lite_m2_currentStopped = true;
                continue;
            }
            if (((((lite_m2_name) === ("break"))) || (((lite_m2_name) === ("continue"))))) {
                if ((!(liteFn_m2_insideLoop([...(lite_m2_blocks)])))) {
                    liteFn_m2_failAt(lite_source, lite_m2_nameStart, lite_prefix, ((lite_m2_name) + (" outside loop")));
                }
                const lite_m2_statementNext = liteFn_m2_consumeStatementEnd(lite_source, lite_m2_position, lite_prefix);
                void lite_m2_statementNext;
                if (((lite_m2_statementNext) < (0n))) {
                    liteFn_m2_failAt(lite_source, lite_m2_position, lite_prefix, (("expected ; after ") + (lite_m2_name)));
                }
                lite_m2_position = lite_m2_statementNext;
                if (((lite_m2_currentLive) && ((!(lite_m2_currentStopped))))) {
                    lite_m2_items.push({ kind: (Boolean(((lite_m2_name) === ("break"))) ? "Break" : "Continue"), name: "", runtime: "", code: "", intValue: 0n, textValue: "" });
                }
                lite_m2_currentStopped = true;
                continue;
            }
            const lite_m2_moduleIndex = liteFn_m2_localIndex([...(lite_m2_locals)], lite_m2_name);
            void lite_m2_moduleIndex;
            if (((((lite_m2_moduleIndex) >= (0n))) && ((((lite$listAt((lite_m2_locals), lite_m2_moduleIndex, 144220)).kind) === ("Module"))))) {
                if (((((lite_m2_position) >= (lite_m2_size))) || (((lite$textAt(lite_source, lite_m2_position, 144287)) !== ("."))))) {
                    liteFn_m2_failAt(lite_source, lite_m2_nameStart, lite_prefix, (((("module namespace ") + (lite_m2_name))) + (" requires a public member")));
                }
                const lite_m2_expression = liteFn_m2_parseExpressionItem(lite_target, lite_source, lite_m2_nameStart, lite_prefix, [...(lite_m2_locals)], [...(lite_m2_functions)], [...(lite_m2_functionParams)], lite_m2_currentName, lite_m2_currentResult, ((liteFn_m2_atValueTail([...(lite_m2_blocks)], lite_m2_blockCount)) && ((!(lite_m2_currentStopped)))));
                void lite_m2_expression;
                if (((lite_m2_currentLive) && ((!(lite_m2_currentStopped))))) {
                    lite_m2_items.push({ kind: (Boolean((lite_m2_expression).returned) ? "Return" : "Call"), name: "", runtime: "", code: (lite_m2_expression).code, intValue: 0n, textValue: "" });
                }
                if ((lite_m2_expression).returned) {
                    lite_m2_currentReturned = true;
                    lite_m2_currentStopped = true;
                }
                lite_m2_position = (lite_m2_expression).next;
                continue;
            }
            let lite_m2_callableIndex = liteFn_m2_findFunction([...(lite_m2_functions)], lite_m2_name);
            void lite_m2_callableIndex;
            let lite_m2_callName = lite_m2_name;
            void lite_m2_callName;
            if (((lite_m2_name) === ("self"))) {
                if (((lite_m2_currentName) === (""))) {
                    liteFn_m2_failAt(lite_source, lite_m2_nameStart, lite_prefix, "self is only available inside a function");
                }
                lite_m2_callName = lite_m2_currentName;
                lite_m2_callableIndex = liteFn_m2_findFunction([...(lite_m2_functions)], lite_m2_currentName);
            }
            if ((((((((((((((lite_m2_callableIndex) >= (0n))) || (((lite_m2_name) === ("push_back"))))) || (((lite_m2_name) === ("pop_back"))))) || ((((liteFn_m2_isAdmittedBuiltin(lite_m2_name)) && (((liteFn_m2_localIndex([...(lite_m2_locals)], lite_m2_name)) < (0n))))))))) && (((lite_m2_position) < (lite_m2_size))))) && (((lite$textAt(lite_source, lite_m2_position, 145614)) === ("("))))) {
                const lite_m2_expression = liteFn_m2_parseExpressionItem(lite_target, lite_source, lite_m2_nameStart, lite_prefix, [...(lite_m2_locals)], [...(lite_m2_functions)], [...(lite_m2_functionParams)], lite_m2_currentName, lite_m2_currentResult, ((liteFn_m2_atValueTail([...(lite_m2_blocks)], lite_m2_blockCount)) && ((!(lite_m2_currentStopped)))));
                void lite_m2_expression;
                if (((lite_m2_currentLive) && ((!(lite_m2_currentStopped))))) {
                    lite_m2_items.push({ kind: (Boolean((lite_m2_expression).returned) ? "Return" : "Call"), name: lite_m2_callName, runtime: "", code: (lite_m2_expression).code, intValue: 0n, textValue: "" });
                }
                if ((lite_m2_expression).returned) {
                    lite_m2_currentReturned = true;
                    lite_m2_currentStopped = true;
                }
                lite_m2_position = (lite_m2_expression).next;
                continue;
            }
            if ((((((((lite_m2_name) === ("output"))) || (((lite_m2_name) === ("outputLine")))))) && (((liteFn_m2_localIndex([...(lite_m2_locals)], lite_m2_name)) < (0n))))) {
                if (((((lite_m2_position) >= (lite_m2_size))) || (((lite$textAt(lite_source, lite_m2_position, 146386)) !== ("("))))) {
                    liteFn_m2_failAt(lite_source, lite_m2_position, lite_prefix, (("expected ( after ") + (lite_m2_name)));
                }
                lite_m2_position = liteFn_m2_skipTrivia(lite_source, lite$addInt(lite_m2_position, 1n, 146564), lite_prefix);
                while (((((lite_m2_position) < (lite_m2_size))) && (((lite$textAt(lite_source, lite_m2_position, 146615)) !== (")"))))) {
                    const lite_m2_argument = liteFn_m2_parseExpression(lite_target, lite_source, lite_m2_position, lite_prefix, [...(lite_m2_locals)], [...(lite_m2_functions)], [...(lite_m2_functionParams)], lite_m2_currentName);
                    void lite_m2_argument;
                    if (((lite_m2_currentLive) && ((!(lite_m2_currentStopped))))) {
                        lite_m2_items.push({ kind: (lite_m2_argument).kind, name: "", runtime: "", code: (lite_m2_argument).code, intValue: (lite_m2_argument).intValue, textValue: (lite_m2_argument).textValue });
                    }
                    lite_m2_position = liteFn_m2_skipTrivia(lite_source, (lite_m2_argument).next, lite_prefix);
                    if (((((lite_m2_position) < (lite_m2_size))) && (((lite$textAt(lite_source, lite_m2_position, 147119)) === (","))))) {
                        lite_m2_position = liteFn_m2_skipTrivia(lite_source, lite$addInt(lite_m2_position, 1n, 147212), lite_prefix);
                    } else {
                        break;
                    }
                }
                lite_m2_position = liteFn_m2_expectSymbol(lite_source, lite_m2_position, ")", lite_prefix);
                const lite_m2_statementNext = liteFn_m2_consumeStatementEnd(lite_source, lite_m2_position, lite_prefix);
                void lite_m2_statementNext;
                if (((lite_m2_statementNext) < (0n))) {
                    liteFn_m2_failAt(lite_source, liteFn_m2_skipTrivia(lite_source, lite_m2_position, lite_prefix), lite_prefix, (("expected ; after ") + (lite_m2_name)));
                }
                lite_m2_position = lite_m2_statementNext;
                if (((lite_m2_currentLive) && ((!(lite_m2_currentStopped))))) {
                    lite_m2_items.push({ kind: (Boolean(((lite_m2_name) === ("outputLine"))) ? "End" : "EndOutput"), name: "", runtime: "", code: "", intValue: 0n, textValue: "" });
                }
                continue;
            }
            if (((lite_m2_name) === ("if"))) {
                let lite_m2_valueTailBranch = false;
                void lite_m2_valueTailBranch;
                if (((((((lite_m2_currentName) !== (""))) && (liteFn_m2_atValueTail([...(lite_m2_blocks)], lite_m2_blockCount)))) && ((!(lite_m2_currentStopped))))) {
                    const lite_m2_valueEnd = liteFn_m2_scanValueIfEnd(lite_source, lite_m2_nameStart, lite_prefix, true);
                    void lite_m2_valueEnd;
                    if (((lite_m2_valueEnd) >= (0n))) {
                        const lite_m2_afterChain = liteFn_m2_skipItemSeparators(lite_source, lite_m2_valueEnd, lite_prefix);
                        void lite_m2_afterChain;
                        if (((((lite_m2_afterChain) < (lite_m2_size))) && (((lite$textAt(lite_source, lite_m2_afterChain, 148274)) === ("}"))))) {
                            const lite_m2_expression = liteFn_m2_parseExpressionItem(lite_target, lite_source, lite_m2_nameStart, lite_prefix, [...(lite_m2_locals)], [...(lite_m2_functions)], [...(lite_m2_functionParams)], lite_m2_currentName, lite_m2_currentResult, true);
                            void lite_m2_expression;
                            if (((lite_m2_currentLive) && ((!(lite_m2_currentStopped))))) {
                                lite_m2_items.push({ kind: "Return", name: "", runtime: "", code: (lite_m2_expression).code, intValue: 0n, textValue: "" });
                            }
                            lite_m2_currentReturned = true;
                            lite_m2_currentStopped = true;
                            lite_m2_position = (lite_m2_expression).next;
                            continue;
                        }
                    }
                    const lite_m2_statementEnd = liteFn_m2_scanValueIfEnd(lite_source, lite_m2_nameStart, lite_prefix, false);
                    void lite_m2_statementEnd;
                    if (((lite_m2_statementEnd) >= (0n))) {
                        const lite_m2_afterStatement = liteFn_m2_skipItemSeparators(lite_source, lite_m2_statementEnd, lite_prefix);
                        void lite_m2_afterStatement;
                        if (((((lite_m2_afterStatement) < (lite_m2_size))) && (((lite$textAt(lite_source, lite_m2_afterStatement, 149194)) === ("}"))))) {
                            lite_m2_valueTailBranch = true;
                        }
                    }
                }
                const lite_m2_conditionStart = lite_m2_position;
                void lite_m2_conditionStart;
                const lite_m2_condition = liteFn_m2_parseExpression(lite_target, lite_source, lite_m2_position, lite_prefix, [...(lite_m2_locals)], [...(lite_m2_functions)], [...(lite_m2_functionParams)], lite_m2_currentName);
                void lite_m2_condition;
                if ((((lite_m2_condition).kind) !== ("Bool"))) {
                    liteFn_m2_failAt(lite_source, lite_m2_conditionStart, lite_prefix, "if condition must be Bool");
                }
                const lite_m2_conditionCode = (Boolean((lite_m2_condition).constant) ? liteFn_m2_targetBoolLiteralCode(lite_target, (((lite_m2_condition).intValue) !== (0n))) : (lite_m2_condition).code);
                void lite_m2_conditionCode;
                lite_m2_position = liteFn_m2_expectSymbol(lite_source, liteFn_m2_skipTrivia(lite_source, (lite_m2_condition).next, lite_prefix), "{", lite_prefix);
                if (((lite_m2_currentLive) && ((!(lite_m2_currentStopped))))) {
                    lite_m2_items.push({ kind: "If", name: "", runtime: "", code: lite_m2_conditionCode, intValue: 0n, textValue: "" });
                }
                lite_m2_savedStates.push({ returned: lite_m2_currentReturned, stopped: lite_m2_currentStopped, branchesReturned: lite_m2_branchesReturned, branchesStopped: lite_m2_branchesStopped, hasElse: lite_m2_hasElse, loopForever: lite_m2_loopForever, live: lite_m2_currentLive });
                lite_m2_currentLive = ((lite_m2_currentLive) && ((!(lite_m2_currentStopped))));
                lite_m2_currentReturned = false;
                lite_m2_currentStopped = false;
                lite_m2_branchesReturned = true;
                lite_m2_branchesStopped = true;
                lite_m2_hasElse = false;
                lite_m2_loopForever = false;
                lite_m2_blocks.push((Boolean(lite_m2_valueTailBranch) ? "ifvalue" : "if"));
                lite_m2_blockCount = lite$addInt(lite_m2_blockCount, 1n, 150759);
                lite_m2_depth = lite$addInt(lite_m2_depth, 1n, 150790);
                lite_m2_position = liteFn_m2_skipTrivia(lite_source, lite$addInt(lite_m2_position, 1n, 150846), lite_prefix);
                continue;
            }
            if (((lite_m2_name) === ("loop"))) {
                let lite_m2_conditionCode = "";
                void lite_m2_conditionCode;
                let lite_m2_sequenceCode = "";
                void lite_m2_sequenceCode;
                let lite_m2_itemName = "";
                void lite_m2_itemName;
                let lite_m2_itemKind = "";
                void lite_m2_itemKind;
                if (((((lite_m2_position) < (lite_m2_size))) && (((lite$textAt(lite_source, lite_m2_position, 151092)) !== ("{"))))) {
                    const lite_m2_parsed = liteFn_m2_parseExpression(lite_target, lite_source, lite_m2_position, lite_prefix, [...(lite_m2_locals)], [...(lite_m2_functions)], [...(lite_m2_functionParams)], lite_m2_currentName);
                    void lite_m2_parsed;
                    const lite_m2_afterParsed = liteFn_m2_skipTrivia(lite_source, (lite_m2_parsed).next, lite_prefix);
                    void lite_m2_afterParsed;
                    if (liteFn_m3_wordAt(lite_source, lite_m2_afterParsed, "as")) {
                        if ((!(liteFn_m2_isListKind((lite_m2_parsed).kind)))) {
                            liteFn_m2_failAt(lite_source, lite_m2_position, lite_prefix, (("loop sequence must be a List, got ") + (liteFn_m2_displayKind((lite_m2_parsed).kind))));
                        }
                        const lite_m2_itemStart = liteFn_m2_skipTrivia(lite_source, lite$addInt(lite_m2_afterParsed, 2n, 151649), lite_prefix);
                        void lite_m2_itemStart;
                        if (((((lite_m2_itemStart) >= (lite_m2_size))) || ((!(liteFn_m3_isNameStart(lite$textAt(lite_source, lite_m2_itemStart, 151731))))))) {
                            liteFn_m2_failAt(lite_source, lite_m2_itemStart, lite_prefix, "expected an item name after as");
                        }
                        const lite_m2_itemEnd = liteFn_m3_skipName(lite_source, lite_m2_itemStart);
                        void lite_m2_itemEnd;
                        lite_m2_itemName = lite$textSlice(lite_source, lite_m2_itemStart, lite_m2_itemEnd, 151974);
                        if (liteFn_m2_isReservedWord(lite_m2_itemName)) {
                            liteFn_m2_unsupportedFeature(lite_source, lite_m2_itemStart, lite_m2_itemName, lite_prefix);
                        }
                        lite_m2_itemKind = liteFn_m2_listElementKind((lite_m2_parsed).kind);
                        lite_m2_sequenceCode = (lite_m2_parsed).code;
                        lite_m2_position = liteFn_m2_skipTrivia(lite_source, lite_m2_itemEnd, lite_prefix);
                    } else {
                        if ((((lite_m2_parsed).kind) !== ("Bool"))) {
                            liteFn_m2_failAt(lite_source, lite_m2_position, lite_prefix, "loop condition must be Bool");
                        }
                        if ((lite_m2_parsed).constant) {
                            if ((((lite_m2_parsed).intValue) === (0n))) {
                                lite_m2_conditionCode = "false";
                            }
                        } else {
                            lite_m2_conditionCode = (lite_m2_parsed).code;
                        }
                        lite_m2_position = liteFn_m2_skipTrivia(lite_source, (lite_m2_parsed).next, lite_prefix);
                    }
                }
                lite_m2_position = liteFn_m2_expectSymbol(lite_source, lite_m2_position, "{", lite_prefix);
                if (((lite_m2_itemName) !== (""))) {
                    const lite_m2_runtime = liteFn_m2_localRuntimeName([...(lite_m2_locals)], lite_m2_itemName, lite_m2_nameStart, lite_moduleId);
                    void lite_m2_runtime;
                    lite_m2_locals.push({ name: lite_m2_itemName, runtime: lite_m2_runtime, kind: lite_m2_itemKind, mutable: false, writable: false, depth: lite$addInt(lite_m2_depth, 1n, 153155), constant: false, code: lite_m2_runtime, intValue: 0n, textValue: "" });
                    if (((lite_m2_currentLive) && ((!(lite_m2_currentStopped))))) {
                        lite_m2_items.push({ kind: "LoopSeq", name: lite_m2_itemName, runtime: lite_m2_runtime, code: lite_m2_sequenceCode, intValue: 0n, textValue: lite_m2_itemKind });
                    }
                } else {
                    if (((lite_m2_currentLive) && ((!(lite_m2_currentStopped))))) {
                        lite_m2_items.push({ kind: "Loop", name: "", runtime: "", code: lite_m2_conditionCode, intValue: 0n, textValue: "" });
                    }
                }
                lite_m2_savedStates.push({ returned: lite_m2_currentReturned, stopped: lite_m2_currentStopped, branchesReturned: lite_m2_branchesReturned, branchesStopped: lite_m2_branchesStopped, hasElse: lite_m2_hasElse, loopForever: lite_m2_loopForever, live: lite_m2_currentLive });
                lite_m2_currentLive = ((lite_m2_currentLive) && ((!(lite_m2_currentStopped))));
                lite_m2_currentReturned = false;
                lite_m2_currentStopped = false;
                lite_m2_branchesReturned = true;
                lite_m2_branchesStopped = true;
                lite_m2_hasElse = false;
                lite_m2_loopForever = ((((lite_m2_sequenceCode) === (""))) && ((((((lite_m2_conditionCode) === (""))) || (((lite_m2_conditionCode) === ("true")))))));
                lite_m2_blocks.push("loop");
                lite_m2_blockCount = lite$addInt(lite_m2_blockCount, 1n, 154353);
                lite_m2_depth = lite$addInt(lite_m2_depth, 1n, 154384);
                lite_m2_position = liteFn_m2_skipTrivia(lite_source, lite$addInt(lite_m2_position, 1n, 154440), lite_prefix);
                continue;
            }
            if (((lite_m2_name) === ("var"))) {
                lite_m2_position = liteFn_m2_skipTrivia(lite_source, lite_m2_position, lite_prefix);
                if (((((lite_m2_position) >= (lite_m2_size))) || ((!(liteFn_m3_isNameStart(lite$textAt(lite_source, lite_m2_position, 154633))))))) {
                    liteFn_m2_failAt(lite_source, lite_m2_position, lite_prefix, "expected local name after var");
                }
                const lite_m2_localStart = lite_m2_position;
                void lite_m2_localStart;
                lite_m2_position = liteFn_m3_skipName(lite_source, lite_m2_position);
                const lite_m2_localName = lite$textSlice(lite_source, lite_m2_localStart, lite_m2_position, 154878);
                void lite_m2_localName;
                if (liteFn_m2_isReservedWord(lite_m2_localName)) {
                    liteFn_m2_unsupportedFeature(lite_source, lite_m2_localStart, lite_m2_localName, lite_prefix);
                }
                if (((((lite_m2_depth) === (0n))) && (((lite_m2_blockCount) === (0n))))) {
                    const lite_m2_rootIndex = liteFn_m2_localIndex([...(lite_m2_locals)], lite_m2_localName);
                    void lite_m2_rootIndex;
                    if (((((lite_m2_rootIndex) >= (0n))) && ((((lite$listAt((lite_m2_locals), lite_m2_rootIndex, 155176)).depth) === (0n))))) {
                        liteFn_m2_failAt(lite_source, lite_m2_localStart, lite_prefix, (("duplicate top-level value ") + (lite_m2_localName)));
                    }
                }
                lite_m2_position = liteFn_m2_skipTrivia(lite_source, lite_m2_position, lite_prefix);
                let lite_m2_parsed = liteFn_m2_intParsed("", 0n, true, lite_m2_position);
                void lite_m2_parsed;
                let lite_m2_declaredWritable = false;
                void lite_m2_declaredWritable;
                if (liteFn_m3_startsWithAt(lite_source, lite_m2_position, ":=")) {
                    lite_m2_position = liteFn_m2_skipTrivia(lite_source, lite$addInt(lite_m2_position, 2n, 155611), lite_prefix);
                    lite_m2_parsed = liteFn_m2_parseExpression(lite_target, lite_source, lite_m2_position, lite_prefix, [...(lite_m2_locals)], [...(lite_m2_functions)], [...(lite_m2_functionParams)], lite_m2_currentName);
                    if ((((lite_m2_parsed).kind) === ("Unit"))) {
                        liteFn_m2_failAt(lite_source, lite_m2_localStart, lite_prefix, (("cannot declare a Unit local ") + (lite_m2_localName)));
                    }
                } else if (((((lite_m2_position) < (lite_m2_size))) && (((lite$textAt(lite_source, lite_m2_position, 155952)) === (":"))))) {
                    const lite_m2_typed = liteFn_m2_parseLocalType(lite_source, lite$addInt(lite_m2_position, 1n, 156043), lite_prefix, [...(lite_m2_aliases)]);
                    void lite_m2_typed;
                    lite_m2_declaredWritable = (lite_m2_typed).writable;
                    lite_m2_position = liteFn_m2_skipTrivia(lite_source, (lite_m2_typed).next, lite_prefix);
                    if (liteFn_m2_isSingleEquals(lite_source, lite_m2_position)) {
                        lite_m2_parsed = liteFn_m2_parseExpressionAs(lite_target, lite_source, liteFn_m2_skipTrivia(lite_source, lite$addInt(lite_m2_position, 1n, 156329), lite_prefix), lite_prefix, [...(lite_m2_locals)], [...(lite_m2_functions)], [...(lite_m2_functionParams)], lite_m2_currentName, (lite_m2_typed).kind);
                        if ((((lite_m2_parsed).kind) !== ((lite_m2_typed).kind))) {
                            liteFn_m2_failAt(lite_source, lite_m2_localStart, lite_prefix, (((((("cannot initialize ") + (liteFn_m2_displayKind((lite_m2_typed).kind)))) + (" with "))) + (liteFn_m2_displayKind((lite_m2_parsed).kind))));
                        }
                    } else {
                        lite_m2_parsed = liteFn_m2_zeroParsed(lite_target, (lite_m2_typed).kind, lite_m2_position);
                    }
                } else {
                    liteFn_m2_failAt(lite_source, lite_m2_position, lite_prefix, (("expected := or : after local name ") + (lite_m2_localName)));
                }
                const lite_m2_statementNext = liteFn_m2_consumeStatementEnd(lite_source, (lite_m2_parsed).next, lite_prefix);
                void lite_m2_statementNext;
                if (((lite_m2_statementNext) < (0n))) {
                    liteFn_m2_failAt(lite_source, liteFn_m2_skipTrivia(lite_source, (lite_m2_parsed).next, lite_prefix), lite_prefix, (("expected ; after local declaration ") + (lite_m2_localName)));
                }
                lite_m2_position = lite_m2_statementNext;
                const lite_m2_runtime = liteFn_m2_localRuntimeName([...(lite_m2_locals)], lite_m2_localName, lite_m2_localStart, lite_moduleId);
                void lite_m2_runtime;
                lite_m2_locals.push({ name: lite_m2_localName, runtime: lite_m2_runtime, kind: (lite_m2_parsed).kind, mutable: true, writable: lite_m2_declaredWritable, depth: lite_m2_depth, constant: false, code: (lite_m2_parsed).code, intValue: (lite_m2_parsed).intValue, textValue: (lite_m2_parsed).textValue });
                if (((lite_m2_currentLive) && ((!(lite_m2_currentStopped))))) {
                    lite_m2_items.push({ kind: (("Var") + (liteFn_m2_storageKind((lite_m2_parsed).kind))), name: lite_m2_localName, runtime: lite_m2_runtime, code: liteFn_m2_copiedValueCode(lite_target, (lite_m2_parsed).kind, (lite_m2_parsed).code), intValue: (lite_m2_parsed).intValue, textValue: liteFn_m2_itemTextPayload(lite_m2_parsed) });
                }
                continue;
            }
            if (((lite_m2_name) === ("else"))) {
                liteFn_m2_failAt(lite_source, lite_m2_nameStart, lite_prefix, "unexpected else");
            }
            if (liteFn_m2_isReservedWord(lite_m2_name)) {
                liteFn_m2_unsupportedFeature(lite_source, lite_m2_nameStart, lite_m2_name, lite_prefix);
            }
            if (((liteFn_m3_startsWithAt(lite_source, lite_m2_position, ":=")) && (liteFn_m3_wordAt(lite_source, lite_m2_afterDefinition, "type")))) {
                if (((((lite_m2_blockCount) !== (0n))) || (((lite_m2_depth) !== (0n))))) {
                    liteFn_m2_failAt(lite_source, lite_m2_nameStart, lite_prefix, "type aliases are only allowed at top level");
                }
                let lite_m2_earlierAlias = false;
                void lite_m2_earlierAlias;
                for (const lite_m2_alias of [...(lite_m2_aliases)]) {
                    void lite_m2_alias;
                    if ((((((lite_m2_alias).name) === (lite_m2_name))) && ((((lite_m2_alias).at) < (lite_m2_nameStart))))) {
                        lite_m2_earlierAlias = true;
                    }
                }
                if (lite_m2_earlierAlias) {
                    liteFn_m2_failAt(lite_source, lite_m2_nameStart, lite_prefix, (("duplicate type alias ") + (lite_m2_name)));
                }
                const lite_m2_typePosition = liteFn_m2_skipTrivia(lite_source, lite$addInt(lite_m2_position, 2n, 158665), lite_prefix);
                void lite_m2_typePosition;
                const lite_m2_targetStart = liteFn_m2_skipTrivia(lite_source, lite$addInt(lite_m2_typePosition, 4n, 158738), lite_prefix);
                void lite_m2_targetStart;
                const lite_m2_aliasIndex = liteFn_m2_aliasIndexAt([...(lite_m2_aliases)], lite_m2_nameStart);
                void lite_m2_aliasIndex;
                if (((lite_m2_aliasIndex) < (0n))) {
                    liteFn_m2_unsupportedAliasTarget(lite_source, lite_m2_targetStart, lite_prefix, "target");
                }
                const lite_m2_aliasEntry = lite$listAt((lite_m2_aliases), lite_m2_aliasIndex, 158971);
                void lite_m2_aliasEntry;
                if ((((lite_m2_aliasEntry).target) === (""))) {
                    liteFn_m2_unsupportedAliasTarget(lite_source, lite_m2_targetStart, lite_prefix, "target");
                }
                const lite_m2_seenAliases: string[] = [...([])];
                void lite_m2_seenAliases;
                const lite_m2_resolvedType = liteFn_m2_resolveTypeText(lite_source, lite_m2_targetStart, lite_prefix, [...(lite_m2_aliases)], (lite_m2_aliasEntry).target, [...(lite_m2_seenAliases)]);
                void lite_m2_resolvedType;
                if (liteFn_m6_listContainsText([...(lite_m2_publishedTypes)], lite_m2_name)) {
                    lite_m2_items.push({ kind: "PublicType", name: lite_m2_name, runtime: "", code: lite_m2_resolvedType, intValue: 0n, textValue: "" });
                }
                const lite_m2_afterTarget = liteFn_m2_consumeStatementEnd(lite_source, (lite_m2_aliasEntry).end, lite_prefix);
                void lite_m2_afterTarget;
                if (((lite_m2_afterTarget) < (0n))) {
                    liteFn_m2_unsupportedAliasTarget(lite_source, (lite_m2_aliasEntry).at, lite_prefix, "target");
                }
                lite_m2_position = lite_m2_afterTarget;
                continue;
            }
            if (liteFn_m3_startsWithAt(lite_source, lite_m2_position, ":=")) {
                const lite_m2_afterDeclare = liteFn_m2_skipTrivia(lite_source, lite$addInt(lite_m2_position, 2n, 159880), lite_prefix);
                void lite_m2_afterDeclare;
                if (liteFn_m3_wordAt(lite_source, lite_m2_afterDeclare, "fn")) {
                    if (((((lite_m2_blockCount) !== (0n))) || (((lite_m2_depth) !== (0n))))) {
                        liteFn_m2_failAt(lite_source, lite_m2_nameStart, lite_prefix, "function definitions are only allowed at top level");
                    }
                    if (((liteFn_m2_findFunction([...(lite_m2_functions)], lite_m2_name)) >= (0n))) {
                        liteFn_m2_failAt(lite_source, lite_m2_nameStart, lite_prefix, (("duplicate function ") + (lite_m2_name)));
                    }
                    const lite_m2_rootIndex = liteFn_m2_localIndex([...(lite_m2_locals)], lite_m2_name);
                    void lite_m2_rootIndex;
                    if (((((lite_m2_rootIndex) >= (0n))) && ((((lite$listAt((lite_m2_locals), lite_m2_rootIndex, 160393)).depth) === (0n))))) {
                        liteFn_m2_failAt(lite_source, lite_m2_nameStart, lite_prefix, (("duplicate top-level value ") + (lite_m2_name)));
                    }
                    lite_m2_position = liteFn_m2_skipTrivia(lite_source, lite$addInt(lite_m2_afterDeclare, 2n, 160586), lite_prefix);
                    const lite_m2_header = liteFn_m2_parseFunctionHeader(lite_source, lite_m2_position, lite_prefix, [...(lite_m2_aliases)]);
                    void lite_m2_header;
                    lite_m2_position = liteFn_m2_skipTrivia(lite_source, (lite_m2_header).next, lite_prefix);
                    lite_m2_position = liteFn_m2_expectSymbol(lite_source, lite_m2_position, "{", lite_prefix);
                    const lite_m2_functionRuntime = (Boolean(((lite_moduleId) === (0n))) ? (("liteFn_") + (lite_m2_name)) : (((((("liteFn_m") + (liteFn_m4_intText(lite_moduleId)))) + ("_"))) + (lite_m2_name)));
                    void lite_m2_functionRuntime;
                    lite_m2_functions.push({ name: lite_m2_name, runtime: lite_m2_functionRuntime, result: (lite_m2_header).result, first: lite_m2_parameterTotal, count: (lite_m2_header).count });
                    if (liteFn_m6_listContainsText([...(lite_m2_publishedFunctions)], lite_m2_name)) {
                        lite_m2_items.push({ kind: "PublicFunction", name: lite_m2_name, runtime: lite_m2_functionRuntime, code: (lite_m2_header).result, intValue: (lite_m2_header).count, textValue: (lite_m2_header).params });
                    }
                    if (((lite_m2_currentLive) && ((!(lite_m2_currentStopped))))) {
                        lite_m2_items.push({ kind: "FunctionStart", name: lite_m2_name, runtime: lite_m2_functionRuntime, code: (lite_m2_header).result, intValue: (lite_m2_header).count, textValue: (lite_m2_header).params });
                    }
                    let lite_m2_entryStart = 0n;
                    void lite_m2_entryStart;
                    let lite_m2_entryIndex = 0n;
                    void lite_m2_entryIndex;
                    for (const lite_m2_future of [...(lite_m2_futureValues)]) {
                        void lite_m2_future;
                        if ((((lite_m2_future).at) > (lite_m2_nameStart))) {
                            lite_m2_locals.push({ name: (lite_m2_future).name, runtime: (lite_m2_future).runtime, kind: (lite_m2_future).kind, mutable: false, writable: false, depth: (-1n), constant: false, code: (lite_m2_future).runtime, intValue: 0n, textValue: "" });
                        }
                    }
                    while (((lite_m2_entryIndex) < ((lite_m2_header).count))) {
                        const lite_m2_separator = liteFn_m3_indexOfText((lite_m2_header).params, "|", lite_m2_entryStart);
                        void lite_m2_separator;
                        let lite_m2_entryEnd = lite$textLength((lite_m2_header).params);
                        void lite_m2_entryEnd;
                        if (((lite_m2_separator) >= (0n))) {
                            lite_m2_entryEnd = lite_m2_separator;
                        }
                        const lite_m2_entry = lite$textSlice((lite_m2_header).params, lite_m2_entryStart, lite_m2_entryEnd, 162475);
                        void lite_m2_entry;
                        const lite_m2_parameterName = liteFn_m2_paramNameOf(lite_m2_entry);
                        void lite_m2_parameterName;
                        const lite_m2_parameterKind = liteFn_m2_paramKindOf(lite_m2_entry);
                        void lite_m2_parameterKind;
                        const lite_m2_runtime = (("lite_") + (lite_m2_parameterName));
                        void lite_m2_runtime;
                        lite_m2_functionParams.push(lite_m2_entry);
                        lite_m2_locals.push({ name: lite_m2_parameterName, runtime: lite_m2_runtime, kind: lite_m2_parameterKind, mutable: false, writable: false, depth: 1n, constant: false, code: lite_m2_runtime, intValue: 0n, textValue: "" });
                        lite_m2_parameterTotal = lite$addInt(lite_m2_parameterTotal, 1n, 163069);
                        lite_m2_entryStart = lite$addInt(lite_m2_entryEnd, 1n, 163116);
                        lite_m2_entryIndex = lite$addInt(lite_m2_entryIndex, 1n, 163165);
                    }
                    lite_m2_currentName = lite_m2_name;
                    lite_m2_currentResult = (lite_m2_header).result;
                    lite_m2_savedStates.push({ returned: lite_m2_currentReturned, stopped: lite_m2_currentStopped, branchesReturned: lite_m2_branchesReturned, branchesStopped: lite_m2_branchesStopped, hasElse: lite_m2_hasElse, loopForever: lite_m2_loopForever, live: lite_m2_currentLive });
                    lite_m2_currentLive = ((lite_m2_currentLive) && ((!(lite_m2_currentStopped))));
                    lite_m2_currentReturned = false;
                    lite_m2_currentStopped = false;
                    lite_m2_branchesReturned = true;
                    lite_m2_branchesStopped = true;
                    lite_m2_hasElse = false;
                    lite_m2_loopForever = false;
                    lite_m2_blocks.push("function");
                    lite_m2_blockCount = lite$addInt(lite_m2_blockCount, 1n, 163918);
                    lite_m2_depth = lite$addInt(lite_m2_depth, 1n, 163953);
                    lite_m2_position = liteFn_m2_skipTrivia(lite_source, lite_m2_position, lite_prefix);
                    continue;
                }
                if (((((lite_m2_depth) === (0n))) && (((lite_m2_blockCount) === (0n))))) {
                    const lite_m2_rootIndex = liteFn_m2_localIndex([...(lite_m2_locals)], lite_m2_name);
                    void lite_m2_rootIndex;
                    if (((((lite_m2_rootIndex) >= (0n))) && ((((lite$listAt((lite_m2_locals), lite_m2_rootIndex, 164211)).depth) === (0n))))) {
                        liteFn_m2_failAt(lite_source, lite_m2_nameStart, lite_prefix, (("duplicate top-level value ") + (lite_m2_name)));
                    }
                }
                lite_m2_position = lite_m2_afterDeclare;
                const lite_m2_parsed = liteFn_m2_parseExpression(lite_target, lite_source, lite_m2_position, lite_prefix, [...(lite_m2_locals)], [...(lite_m2_functions)], [...(lite_m2_functionParams)], lite_m2_currentName);
                void lite_m2_parsed;
                if ((((lite_m2_parsed).kind) === ("Unit"))) {
                    liteFn_m2_failAt(lite_source, lite_m2_nameStart, lite_prefix, (("cannot declare a Unit local ") + (lite_m2_name)));
                }
                const lite_m2_statementNext = liteFn_m2_consumeStatementEnd(lite_source, (lite_m2_parsed).next, lite_prefix);
                void lite_m2_statementNext;
                if (((lite_m2_statementNext) < (0n))) {
                    liteFn_m2_failAt(lite_source, liteFn_m2_skipTrivia(lite_source, (lite_m2_parsed).next, lite_prefix), lite_prefix, (("expected ; after local declaration ") + (lite_m2_name)));
                }
                lite_m2_position = lite_m2_statementNext;
                const lite_m2_runtime = liteFn_m2_localRuntimeName([...(lite_m2_locals)], lite_m2_name, lite_m2_nameStart, lite_moduleId);
                void lite_m2_runtime;
                lite_m2_locals.push({ name: lite_m2_name, runtime: lite_m2_runtime, kind: (lite_m2_parsed).kind, mutable: false, writable: false, depth: lite_m2_depth, constant: (lite_m2_parsed).constant, code: (lite_m2_parsed).code, intValue: (lite_m2_parsed).intValue, textValue: (lite_m2_parsed).textValue });
                if (((((((lite_m2_depth) === (0n))) && (((lite_m2_blockCount) === (0n))))) && (liteFn_m6_listContainsText([...(lite_m2_publishedValues)], lite_m2_name)))) {
                    lite_m2_items.push({ kind: "PublicValue", name: lite_m2_name, runtime: lite_m2_runtime, code: (lite_m2_parsed).kind, intValue: 0n, textValue: "" });
                }
                if (((lite_m2_currentLive) && ((!(lite_m2_currentStopped))))) {
                    lite_m2_items.push({ kind: (("Local") + (liteFn_m2_storageKind((lite_m2_parsed).kind))), name: lite_m2_name, runtime: lite_m2_runtime, code: liteFn_m2_copiedValueCode(lite_target, (lite_m2_parsed).kind, (lite_m2_parsed).code), intValue: (lite_m2_parsed).intValue, textValue: liteFn_m2_itemTextPayload(lite_m2_parsed) });
                }
                continue;
            }
            if (((((lite_m2_position) < (lite_m2_size))) && (((lite$textAt(lite_source, lite_m2_position, 165911)) === (":"))))) {
                if (((((lite_m2_depth) === (0n))) && (((lite_m2_blockCount) === (0n))))) {
                    const lite_m2_rootIndex = liteFn_m2_localIndex([...(lite_m2_locals)], lite_m2_name);
                    void lite_m2_rootIndex;
                    if (((((lite_m2_rootIndex) >= (0n))) && ((((lite$listAt((lite_m2_locals), lite_m2_rootIndex, 166093)).depth) === (0n))))) {
                        liteFn_m2_failAt(lite_source, lite_m2_nameStart, lite_prefix, (("duplicate top-level value ") + (lite_m2_name)));
                    }
                }
                const lite_m2_typed = liteFn_m2_parseLocalType(lite_source, lite$addInt(lite_m2_position, 1n, 166294), lite_prefix, [...(lite_m2_aliases)]);
                void lite_m2_typed;
                lite_m2_position = liteFn_m2_skipTrivia(lite_source, (lite_m2_typed).next, lite_prefix);
                let lite_m2_parsed = liteFn_m2_zeroParsed(lite_target, (lite_m2_typed).kind, lite_m2_position);
                void lite_m2_parsed;
                if (liteFn_m2_isSingleEquals(lite_source, lite_m2_position)) {
                    lite_m2_parsed = liteFn_m2_parseExpressionAs(lite_target, lite_source, liteFn_m2_skipTrivia(lite_source, lite$addInt(lite_m2_position, 1n, 166585), lite_prefix), lite_prefix, [...(lite_m2_locals)], [...(lite_m2_functions)], [...(lite_m2_functionParams)], lite_m2_currentName, (lite_m2_typed).kind);
                    if ((((lite_m2_parsed).kind) !== ((lite_m2_typed).kind))) {
                        liteFn_m2_failAt(lite_source, lite_m2_nameStart, lite_prefix, (((((("cannot initialize ") + (liteFn_m2_displayKind((lite_m2_typed).kind)))) + (" with "))) + (liteFn_m2_displayKind((lite_m2_parsed).kind))));
                    }
                }
                const lite_m2_statementNext = liteFn_m2_consumeStatementEnd(lite_source, (lite_m2_parsed).next, lite_prefix);
                void lite_m2_statementNext;
                if (((lite_m2_statementNext) < (0n))) {
                    liteFn_m2_failAt(lite_source, liteFn_m2_skipTrivia(lite_source, (lite_m2_parsed).next, lite_prefix), lite_prefix, (("expected ; after local declaration ") + (lite_m2_name)));
                }
                lite_m2_position = lite_m2_statementNext;
                const lite_m2_runtime = liteFn_m2_localRuntimeName([...(lite_m2_locals)], lite_m2_name, lite_m2_nameStart, lite_moduleId);
                void lite_m2_runtime;
                lite_m2_locals.push({ name: lite_m2_name, runtime: lite_m2_runtime, kind: (lite_m2_typed).kind, mutable: false, writable: (lite_m2_typed).writable, depth: lite_m2_depth, constant: (lite_m2_parsed).constant, code: (lite_m2_parsed).code, intValue: (lite_m2_parsed).intValue, textValue: (lite_m2_parsed).textValue });
                if (((lite_m2_currentLive) && ((!(lite_m2_currentStopped))))) {
                    lite_m2_items.push({ kind: (("Local") + (liteFn_m2_storageKind((lite_m2_typed).kind))), name: lite_m2_name, runtime: lite_m2_runtime, code: liteFn_m2_copiedValueCode(lite_target, (lite_m2_typed).kind, (lite_m2_parsed).code), intValue: (lite_m2_parsed).intValue, textValue: liteFn_m2_itemTextPayload(lite_m2_parsed) });
                }
                continue;
            }
            if (liteFn_m2_isSingleEquals(lite_source, lite_m2_position)) {
                const lite_m2_index = liteFn_m2_localIndex([...(lite_m2_locals)], lite_m2_name);
                void lite_m2_index;
                if (((lite_m2_index) < (0n))) {
                    liteFn_m2_failAt(lite_source, lite_m2_nameStart, lite_prefix, (("unknown value ") + (lite_m2_name)));
                }
                const lite_m2_entry = lite$listAt((lite_m2_locals), lite_m2_index, 168075);
                void lite_m2_entry;
                if ((!((lite_m2_entry).mutable))) {
                    liteFn_m2_failAt(lite_source, lite_m2_nameStart, lite_prefix, (("cannot assign to immutable local ") + (lite_m2_name)));
                }
                lite_m2_position = liteFn_m2_skipTrivia(lite_source, lite$addInt(lite_m2_position, 1n, 168278), lite_prefix);
                const lite_m2_parsed = liteFn_m2_parseExpressionAs(lite_target, lite_source, lite_m2_position, lite_prefix, [...(lite_m2_locals)], [...(lite_m2_functions)], [...(lite_m2_functionParams)], lite_m2_currentName, (lite_m2_entry).kind);
                void lite_m2_parsed;
                if ((((lite_m2_parsed).kind) !== ((lite_m2_entry).kind))) {
                    liteFn_m2_failAt(lite_source, lite_m2_nameStart, lite_prefix, (((((((((("cannot assign ") + (liteFn_m2_displayKind((lite_m2_parsed).kind)))) + (" to "))) + (liteFn_m2_displayKind((lite_m2_entry).kind)))) + (" local "))) + (lite_m2_name)));
                }
                const lite_m2_statementNext = liteFn_m2_consumeStatementEnd(lite_source, (lite_m2_parsed).next, lite_prefix);
                void lite_m2_statementNext;
                if (((lite_m2_statementNext) < (0n))) {
                    liteFn_m2_failAt(lite_source, liteFn_m2_skipTrivia(lite_source, (lite_m2_parsed).next, lite_prefix), lite_prefix, (("expected ; after assignment to ") + (lite_m2_name)));
                }
                lite_m2_position = lite_m2_statementNext;
                lite_m2_locals.push({ name: (lite_m2_entry).name, runtime: (lite_m2_entry).runtime, kind: (lite_m2_entry).kind, mutable: true, writable: (lite_m2_entry).writable, depth: (lite_m2_entry).depth, constant: false, code: (lite_m2_parsed).code, intValue: (lite_m2_parsed).intValue, textValue: (lite_m2_parsed).textValue });
                if (((lite_m2_currentLive) && ((!(lite_m2_currentStopped))))) {
                    lite_m2_items.push({ kind: (("Assign") + (liteFn_m2_storageKind((lite_m2_entry).kind))), name: lite_m2_name, runtime: (lite_m2_entry).runtime, code: liteFn_m2_copiedValueCode(lite_target, (lite_m2_entry).kind, (lite_m2_parsed).code), intValue: (lite_m2_parsed).intValue, textValue: liteFn_m2_itemTextPayload(lite_m2_parsed) });
                }
                continue;
            }
            const lite_m2_expression = liteFn_m2_parseExpressionItem(lite_target, lite_source, lite_m2_nameStart, lite_prefix, [...(lite_m2_locals)], [...(lite_m2_functions)], [...(lite_m2_functionParams)], lite_m2_currentName, lite_m2_currentResult, ((liteFn_m2_atValueTail([...(lite_m2_blocks)], lite_m2_blockCount)) && ((!(lite_m2_currentStopped)))));
            void lite_m2_expression;
            if (((lite_m2_currentLive) && ((!(lite_m2_currentStopped))))) {
                lite_m2_items.push({ kind: (Boolean((lite_m2_expression).returned) ? "Return" : "Discard"), name: (lite_m2_expression).valueKind, runtime: "", code: (lite_m2_expression).code, intValue: 0n, textValue: "" });
            }
            if ((lite_m2_expression).returned) {
                lite_m2_currentReturned = true;
                lite_m2_currentStopped = true;
            }
            lite_m2_position = (lite_m2_expression).next;
        }
        if (((lite_m2_blockCount) > (0n))) {
            liteFn_m2_failAt(lite_source, lite_m2_size, lite_prefix, "expected } before end of source");
        }
        return [...(lite_m2_items)];
    }
    void liteFn_m2_parseProgramWithExports;
    function liteFn_m2_parseProgram(lite_target: string, lite_source: string, lite_prefix: string): { kind: string; name: string; runtime: string; code: string; intValue: bigint; textValue: string }[] {
        void lite_target;
        void lite_source;
        void lite_prefix;
        return [...(liteFn_m2_parseProgramWithExports(lite_target, lite_source, lite_prefix, [...([])], 0n))];
    }
    void liteFn_m2_parseProgram;
    function liteFn_m2_lineStartCodes(lite_source: string): string {
        void lite_source;
        let lite_m2_code = "0";
        void lite_m2_code;
        let lite_m2_position = 0n;
        void lite_m2_position;
        while (((lite_m2_position) < (lite$textLength(lite_source)))) {
            if (((lite$textAt(lite_source, lite_m2_position, 170654)) === ("\n"))) {
                lite_m2_code = ((((lite_m2_code) + (", "))) + (liteFn_m4_intText(lite$addInt(lite_m2_position, 1n, 170735))));
            }
            lite_m2_position = lite$addInt(lite_m2_position, 1n, 170771);
        }
        return lite_m2_code;
    }
    void liteFn_m2_lineStartCodes;
    function liteFn_m12_moduleVisited(lite_graph: { kind: string; name: string; runtime: string; code: string; intValue: bigint; textValue: string }[], lite_path: string): boolean {
        void lite_graph;
        void lite_path;
        for (const lite_m12_item of [...(lite_graph)]) {
            void lite_m12_item;
            if ((((((lite_m12_item).kind) === ("ModuleVisited"))) && ((((lite_m12_item).name) === (lite_path))))) {
                return true;
            }
        }
        return false;
    }
    void liteFn_m12_moduleVisited;
    function liteFn_m12_moduleProcessed(lite_graph: { kind: string; name: string; runtime: string; code: string; intValue: bigint; textValue: string }[], lite_path: string): boolean {
        void lite_graph;
        void lite_path;
        for (const lite_m12_item of [...(lite_graph)]) {
            void lite_m12_item;
            if ((((((lite_m12_item).kind) === ("ModuleProcessed"))) && ((((lite_m12_item).name) === (lite_path))))) {
                return true;
            }
        }
        return false;
    }
    void liteFn_m12_moduleProcessed;
    function liteFn_m12_moduleIdForPath(lite_graph: { kind: string; name: string; runtime: string; code: string; intValue: bigint; textValue: string }[], lite_path: string): bigint {
        void lite_graph;
        void lite_path;
        for (const lite_m12_item of [...(lite_graph)]) {
            void lite_m12_item;
            if ((((((lite_m12_item).kind) === ("ModuleVisited"))) && ((((lite_m12_item).name) === (lite_path))))) {
                return (lite_m12_item).intValue;
            }
        }
        return (-1n);
    }
    void liteFn_m12_moduleIdForPath;
    function liteFn_m12_nextModuleId(lite_graph: { kind: string; name: string; runtime: string; code: string; intValue: bigint; textValue: string }[]): bigint {
        void lite_graph;
        let lite_m12_count = 0n;
        void lite_m12_count;
        for (const lite_m12_item of [...(lite_graph)]) {
            void lite_m12_item;
            if ((((lite_m12_item).kind) === ("ModuleVisited"))) {
                lite_m12_count = lite$addInt(lite_m12_count, 1n, 1221);
            }
        }
        return lite_m12_count;
    }
    void liteFn_m12_nextModuleId;
    function liteFn_m12_modulePublicDeclarations(lite_graph: { kind: string; name: string; runtime: string; code: string; intValue: bigint; textValue: string }[], lite_path: string): { kind: string; name: string; runtime: string; code: string; intValue: bigint; textValue: string }[] {
        void lite_graph;
        void lite_path;
        const lite_m12_result: { kind: string; name: string; runtime: string; code: string; intValue: bigint; textValue: string }[] = [...([])];
        void lite_m12_result;
        let lite_m12_inside = false;
        void lite_m12_inside;
        for (const lite_m12_item of [...(lite_graph)]) {
            void lite_m12_item;
            if ((((lite_m12_item).kind) === ("ModuleStart"))) {
                lite_m12_inside = (((lite_m12_item).name) === (lite_path));
            } else if ((((((lite_m12_item).kind) === ("ModuleEnd"))) && (lite_m12_inside))) {
                break;
            } else if (((lite_m12_inside) && (((((((((lite_m12_item).kind) === ("PublicFunction"))) || ((((lite_m12_item).kind) === ("PublicValue"))))) || ((((lite_m12_item).kind) === ("PublicType")))))))) {
                lite_m12_result.push(lite_m12_item);
            }
        }
        return [...(lite_m12_result)];
    }
    void liteFn_m12_modulePublicDeclarations;
    function liteFn_m12_appendModuleExports(lite_existing: { kind: string; name: string; runtime: string; code: string; intValue: bigint; textValue: string }[], lite_incoming: { kind: string; name: string; runtime: string; code: string; intValue: bigint; textValue: string }[], lite_prefix: string): { kind: string; name: string; runtime: string; code: string; intValue: bigint; textValue: string }[] {
        void lite_existing;
        void lite_incoming;
        void lite_prefix;
        let lite_m12_result: { kind: string; name: string; runtime: string; code: string; intValue: bigint; textValue: string }[] = [...(lite_existing)];
        void lite_m12_result;
        for (const lite_m12_item of [...(lite_incoming)]) {
            void lite_m12_item;
            let lite_m12_duplicate = false;
            void lite_m12_duplicate;
            for (const lite_m12_previous of [...(lite_m12_result)]) {
                void lite_m12_previous;
                if ((((lite_m12_item).kind) === ("ModuleAlias"))) {
                    if (((((((((lite_m12_previous).kind) === ("ModuleAlias"))) && ((((lite_m12_previous).name) === ((lite_m12_item).name)))))) || ((((((((((lite_m12_previous).kind) === ("PublicFunction"))) || ((((lite_m12_previous).kind) === ("PublicValue")))))) && ((((lite_m12_previous).name) === ((lite_m12_item).name)))))))) {
                        lite_m12_duplicate = true;
                    }
                } else if ((((((lite_m12_item).kind) === ("PublicFunction"))) || ((((lite_m12_item).kind) === ("PublicValue"))))) {
                    if ((((((((((((lite_m12_previous).kind) === ("PublicFunction"))) || ((((lite_m12_previous).kind) === ("PublicValue")))))) && ((((lite_m12_previous).name) === ((lite_m12_item).name)))))) || (((((((lite_m12_previous).kind) === ("ModuleAlias"))) && ((((lite_m12_previous).name) === ((lite_m12_item).name)))))))) {
                        lite_m12_duplicate = true;
                    }
                } else if ((((((((lite_m12_item).kind) === ("PublicType"))) && ((((lite_m12_previous).kind) === ("PublicType"))))) && ((((lite_m12_previous).name) === ((lite_m12_item).name))))) {
                    lite_m12_duplicate = true;
                }
            }
            if (lite_m12_duplicate) {
                if ((((lite_m12_item).kind) === ("ModuleAlias"))) {
                    liteFn_m8_fail(lite_prefix, (("duplicate module alias ") + ((lite_m12_item).name)));
                }
                if ((((lite_m12_item).kind) === ("PublicType"))) {
                    liteFn_m8_fail(lite_prefix, (("duplicate imported public type ") + ((lite_m12_item).name)));
                }
                liteFn_m8_fail(lite_prefix, (("duplicate imported public name ") + ((lite_m12_item).name)));
            }
            lite_m12_result.push(lite_m12_item);
        }
        return [...(lite_m12_result)];
    }
    void liteFn_m12_appendModuleExports;
    function liteFn_m12_moduleAliasExports(lite_graph: { kind: string; name: string; runtime: string; code: string; intValue: bigint; textValue: string }[], lite_path: string, lite_alias: string): { kind: string; name: string; runtime: string; code: string; intValue: bigint; textValue: string }[] {
        void lite_graph;
        void lite_path;
        void lite_alias;
        const lite_m12_result: { kind: string; name: string; runtime: string; code: string; intValue: bigint; textValue: string }[] = [...([{ kind: "ModuleAlias", name: lite_alias, runtime: "", code: "", intValue: liteFn_m12_moduleIdForPath([...(lite_graph)], lite_path), textValue: lite_path }])];
        void lite_m12_result;
        for (const lite_m12_item of [...(liteFn_m12_modulePublicDeclarations([...(lite_graph)], lite_path))]) {
            void lite_m12_item;
            lite_m12_result.push({ kind: (lite_m12_item).kind, name: ((((lite_alias) + ("."))) + ((lite_m12_item).name)), runtime: (lite_m12_item).runtime, code: (lite_m12_item).code, intValue: (lite_m12_item).intValue, textValue: (lite_m12_item).textValue });
        }
        return [...(lite_m12_result)];
    }
    void liteFn_m12_moduleAliasExports;
    function liteFn_m12_visitSourceModule(lite_target: string, lite_path: string, lite_source: string, lite_initialGraph: { kind: string; name: string; runtime: string; code: string; intValue: bigint; textValue: string }[]): { kind: string; name: string; runtime: string; code: string; intValue: bigint; textValue: string }[] {
        void lite_target;
        void lite_path;
        void lite_source;
        void lite_initialGraph;
        if (liteFn_m12_moduleVisited([...(lite_initialGraph)], lite_path)) {
            return [...(lite_initialGraph)];
        }
        const lite_m12_moduleId = liteFn_m12_nextModuleId([...(lite_initialGraph)]);
        void lite_m12_moduleId;
        let lite_m12_graph: { kind: string; name: string; runtime: string; code: string; intValue: bigint; textValue: string }[] = [...(lite_initialGraph)];
        void lite_m12_graph;
        lite_m12_graph.push({ kind: "ModuleVisited", name: lite_path, runtime: "", code: "", intValue: lite_m12_moduleId, textValue: "" });
        const lite_m12_barePaths: string[] = [...([])];
        void lite_m12_barePaths;
        let lite_m12_importedExports: { kind: string; name: string; runtime: string; code: string; intValue: bigint; textValue: string }[] = [...([])];
        void lite_m12_importedExports;
        for (const lite_m12_clause of [...(liteFn_m2_collectImportClauses(lite_target, lite_source, lite_path))]) {
            void lite_m12_clause;
            const lite_m12_loaded = lite$readSource(lite_path, (lite_m12_clause).textValue);
            void lite_m12_loaded;
            if ((!(liteFn_m12_moduleVisited([...(lite_m12_graph)], (lite_m12_loaded).path)))) {
                lite_m12_graph = [...(liteFn_m12_visitSourceModule(lite_target, (lite_m12_loaded).path, (lite_m12_loaded).text, [...(lite_m12_graph)]))];
            }
            if (liteFn_m12_moduleProcessed([...(lite_m12_graph)], (lite_m12_loaded).path)) {
                if ((((lite_m12_clause).name) === (""))) {
                    if ((!(liteFn_m6_listContainsText([...(lite_m12_barePaths)], (lite_m12_loaded).path)))) {
                        lite_m12_barePaths.push((lite_m12_loaded).path);
                        lite_m12_importedExports = [...(liteFn_m12_appendModuleExports([...(lite_m12_importedExports)], [...(liteFn_m12_modulePublicDeclarations([...(lite_m12_graph)], (lite_m12_loaded).path))], lite_path))];
                    }
                } else {
                    lite_m12_importedExports = [...(liteFn_m12_appendModuleExports([...(lite_m12_importedExports)], [...(liteFn_m12_moduleAliasExports([...(lite_m12_graph)], (lite_m12_loaded).path, (lite_m12_clause).name))], lite_path))];
                }
            }
        }
        const lite_m12_localItems: { kind: string; name: string; runtime: string; code: string; intValue: bigint; textValue: string }[] = [...(liteFn_m2_parseProgramWithExports(lite_target, lite_source, lite_path, [...(lite_m12_importedExports)], lite_m12_moduleId))];
        void lite_m12_localItems;
        lite_m12_graph.push({ kind: "ModuleStart", name: lite_path, runtime: "", code: "", intValue: lite_m12_moduleId, textValue: "" });
        for (const lite_m12_item of [...(lite_m12_localItems)]) {
            void lite_m12_item;
            lite_m12_graph.push(lite_m12_item);
        }
        lite_m12_graph.push({ kind: "ModuleEnd", name: lite_path, runtime: "", code: "", intValue: lite_m12_moduleId, textValue: "" });
        lite_m12_graph.push({ kind: "ModuleProcessed", name: lite_path, runtime: "", code: "", intValue: 0n, textValue: "" });
        return [...(lite_m12_graph)];
    }
    void liteFn_m12_visitSourceModule;
    function liteFn_m12_moduleItems(lite_graph: { kind: string; name: string; runtime: string; code: string; intValue: bigint; textValue: string }[]): { kind: string; name: string; runtime: string; code: string; intValue: bigint; textValue: string }[] {
        void lite_graph;
        const lite_m12_result: { kind: string; name: string; runtime: string; code: string; intValue: bigint; textValue: string }[] = [...([])];
        void lite_m12_result;
        for (const lite_m12_item of [...(lite_graph)]) {
            void lite_m12_item;
            if ((((((((((lite_m12_item).kind) !== ("ModuleVisited"))) && ((((lite_m12_item).kind) !== ("ModuleProcessed"))))) && ((((lite_m12_item).kind) !== ("ModuleStart"))))) && ((((lite_m12_item).kind) !== ("ModuleEnd"))))) {
                lite_m12_result.push(lite_m12_item);
            }
        }
        return [...(lite_m12_result)];
    }
    void liteFn_m12_moduleItems;
    function liteFn_m13_dedent(lite_indent: string): string {
        void lite_indent;
        return lite$textSlice(lite_indent, 0n, lite$subtractInt(lite$textLength(lite_indent), 4n, 309), 269);
    }
    void liteFn_m13_dedent;
    function liteFn_m13_tsTupleType(lite_kind: string): string {
        void lite_kind;
        const lite_m13_size = lite$textLength(lite_kind);
        void lite_m13_size;
        let lite_m13_cursor = 1n;
        void lite_m13_cursor;
        let lite_m13_result = "{ ";
        void lite_m13_result;
        let lite_m13_count = 0n;
        void lite_m13_count;
        while (((((lite_m13_cursor) < (lite_m13_size))) && (((lite$textAt(lite_kind, lite_m13_cursor, 561)) !== (")"))))) {
            const lite_m13_nameStart = lite_m13_cursor;
            void lite_m13_nameStart;
            lite_m13_cursor = liteFn_m3_skipName(lite_kind, lite_m13_cursor);
            const lite_m13_label = lite$textSlice(lite_kind, lite_m13_nameStart, lite_m13_cursor, 687);
            void lite_m13_label;
            if (((((lite_m13_cursor) < (lite_m13_size))) && (((lite$textAt(lite_kind, lite_m13_cursor, 752)) === (":"))))) {
                lite_m13_cursor = lite$addInt(lite_m13_cursor, 1n, 798);
            }
            const lite_m13_typeStart = lite_m13_cursor;
            void lite_m13_typeStart;
            lite_m13_cursor = liteFn_m3_skipName(lite_kind, lite_m13_cursor);
            const lite_m13_fieldKind = lite$textSlice(lite_kind, lite_m13_typeStart, lite_m13_cursor, 904);
            void lite_m13_fieldKind;
            if (((lite_m13_count) > (0n))) {
                lite_m13_result = ((lite_m13_result) + (" "));
            }
            lite_m13_result = ((((((lite_m13_result) + (lite_m13_label))) + (": "))) + (liteFn_m10_tsScalarType(lite_m13_fieldKind)));
            lite_m13_count = lite$addInt(lite_m13_count, 1n, 1086);
            if (((((lite_m13_cursor) < (lite_m13_size))) && (((lite$textAt(lite_kind, lite_m13_cursor, 1120)) === (","))))) {
                lite_m13_result = ((lite_m13_result) + (";"));
                lite_m13_cursor = lite$addInt(lite_m13_cursor, 1n, 1213);
            }
        }
        return ((lite_m13_result) + (" }"));
    }
    void liteFn_m13_tsTupleType;
    function liteFn_m13_tsFunctionType(lite_kind: string): string {
        void lite_kind;
        return (Boolean(liteFn_m2_isListKind(lite_kind)) ? ((liteFn_m13_tsFunctionType(liteFn_m2_listElementKind(lite_kind))) + ("[]")) : (Boolean(liteFn_m2_isTupleKind(lite_kind)) ? liteFn_m13_tsTupleType(lite_kind) : liteFn_m10_tsScalarType(lite_kind)));
    }
    void liteFn_m13_tsFunctionType;
    function liteFn_m13_tsParameterList(lite_encoded: string): string {
        void lite_encoded;
        if (((lite_encoded) === (""))) {
            return "";
        }
        let lite_m13_result = "";
        void lite_m13_result;
        let lite_m13_start = 0n;
        void lite_m13_start;
        while (Boolean(true)) {
            const lite_m13_separator = liteFn_m3_indexOfText(lite_encoded, "|", lite_m13_start);
            void lite_m13_separator;
            let lite_m13_end = lite$textLength(lite_encoded);
            void lite_m13_end;
            if (((lite_m13_separator) >= (0n))) {
                lite_m13_end = lite_m13_separator;
            }
            const lite_m13_entry = lite$textSlice(lite_encoded, lite_m13_start, lite_m13_end, 1989);
            void lite_m13_entry;
            const lite_m13_equals = liteFn_m3_indexOfText(lite_m13_entry, "=", 0n);
            void lite_m13_equals;
            const lite_m13_parameterName = lite$textSlice(lite_m13_entry, 0n, lite_m13_equals, 2100);
            void lite_m13_parameterName;
            const lite_m13_parameterKind = lite$textSlice(lite_m13_entry, lite$addInt(lite_m13_equals, 1n, 2178), lite$textLength(lite_m13_entry), 2154);
            void lite_m13_parameterKind;
            if (((lite$textLength(lite_m13_result)) > (0n))) {
                lite_m13_result = ((lite_m13_result) + (", "));
            }
            lite_m13_result = ((((((((lite_m13_result) + ("lite_"))) + (lite_m13_parameterName))) + (": "))) + (liteFn_m13_tsFunctionType(lite_m13_parameterKind)));
            if (((lite_m13_separator) < (0n))) {
                break;
            }
            lite_m13_start = lite$addInt(lite_m13_separator, 1n, 2417);
        }
        return lite_m13_result;
    }
    void liteFn_m13_tsParameterList;
    function liteFn_m13_reportParameterReads(lite_encoded: string, lite_indent: string): void {
        void lite_encoded;
        void lite_indent;
        if (((lite_encoded) === (""))) {
            return;
        }
        let lite_m13_start = 0n;
        void lite_m13_start;
        while (Boolean(true)) {
            const lite_m13_separator = liteFn_m3_indexOfText(lite_encoded, "|", lite_m13_start);
            void lite_m13_separator;
            let lite_m13_end = lite$textLength(lite_encoded);
            void lite_m13_end;
            if (((lite_m13_separator) >= (0n))) {
                lite_m13_end = lite_m13_separator;
            }
            const lite_m13_entry = lite$textSlice(lite_encoded, lite_m13_start, lite_m13_end, 2858);
            void lite_m13_entry;
            const lite_m13_equals = liteFn_m3_indexOfText(lite_m13_entry, "=", 0n);
            void lite_m13_equals;
            const lite$report0 = ((((((lite_indent) + ("void lite_"))) + (lite$textSlice(lite_m13_entry, 0n, lite_m13_equals, 2987)))) + (";"));
            lite$emit(lite$report0 + "\n");
            if (((lite_m13_separator) < (0n))) {
                break;
            }
            lite_m13_start = lite$addInt(lite_m13_separator, 1n, 3085);
        }
    }
    void liteFn_m13_reportParameterReads;
    function liteFn_m13_displayValueCode(lite_kind: string, lite_code: string): string {
        void lite_kind;
        void lite_code;
        if (((((lite_kind) === ("Int"))) || (((lite_kind) === ("Float"))))) {
            return (((("(") + (lite_code))) + (").toString()"));
        }
        if (((lite_kind) === ("Bool"))) {
            return (((("((") + (lite_code))) + (") ? \"true\" : \"false\")"));
        }
        if (((lite_kind) === ("Unit"))) {
            return (((("((value: unknown): string => { void value; return \"Unit\"; })(") + (lite_code))) + (")"));
        }
        if (liteFn_m2_isListKind(lite_kind)) {
            const lite_m13_element = liteFn_m2_listElementKind(lite_kind);
            void lite_m13_element;
            return (((((((((((("(\"[\" + (") + (lite_code))) + (").map((value: "))) + (liteFn_m13_tsFunctionType(lite_m13_element)))) + (") => "))) + (liteFn_m13_displayValueCode(lite_m13_element, "value")))) + (").join(\", \") + \"]\")"));
        }
        if (liteFn_m2_isTupleKind(lite_kind)) {
            let lite_m13_result = liteFn_m10_textLiteralCode("(");
            void lite_m13_result;
            let lite_m13_cursor = 1n;
            void lite_m13_cursor;
            let lite_m13_count = 0n;
            void lite_m13_count;
            while (((((lite_m13_cursor) < (lite$textLength(lite_kind)))) && (((lite$textAt(lite_kind, lite_m13_cursor, 3960)) !== (")"))))) {
                const lite_m13_start = lite_m13_cursor;
                void lite_m13_start;
                lite_m13_cursor = liteFn_m3_skipName(lite_kind, lite_m13_cursor);
                const lite_m13_label = lite$textSlice(lite_kind, lite_m13_start, lite_m13_cursor, 4094);
                void lite_m13_label;
                lite_m13_cursor = lite$addInt(lite_m13_cursor, 1n, 4154);
                const lite_m13_typeStart = lite_m13_cursor;
                void lite_m13_typeStart;
                lite_m13_cursor = liteFn_m3_skipName(lite_kind, lite_m13_cursor);
                const lite_m13_component = lite$textSlice(lite_kind, lite_m13_typeStart, lite_m13_cursor, 4270);
                void lite_m13_component;
                const lite_m13_separator = (Boolean(((lite_m13_count) === (0n))) ? "" : ", ");
                void lite_m13_separator;
                lite_m13_result = ((((((((lite_m13_result) + (" + "))) + (liteFn_m10_textLiteralCode(((((lite_m13_separator) + (lite_m13_label))) + ("=")))))) + (" + "))) + (liteFn_m13_displayValueCode(lite_m13_component, (("value.") + (lite_m13_label)))));
                lite_m13_count = lite$addInt(lite_m13_count, 1n, 4527);
                if (((((lite_m13_cursor) < (lite$textLength(lite_kind)))) && (((lite$textAt(lite_kind, lite_m13_cursor, 4577)) === (","))))) {
                    lite_m13_cursor = lite$addInt(lite_m13_cursor, 1n, 4623);
                }
            }
            const lite_m13_ending = (Boolean(((lite_m13_count) === (1n))) ? ",)" : ")");
            void lite_m13_ending;
            return (((((((((((((((("((value: ") + (liteFn_m13_tsFunctionType(lite_kind)))) + ("): string => "))) + (lite_m13_result))) + (" + "))) + (liteFn_m10_textLiteralCode(lite_m13_ending)))) + (")("))) + (lite_code))) + (")"));
        }
        return lite_code;
    }
    void liteFn_m13_displayValueCode;
    function liteFn_m13_reportArgumentCode(lite_item: { kind: string; name: string; runtime: string; code: string; intValue: bigint; textValue: string }): string {
        void lite_item;
        return liteFn_m13_displayValueCode((lite_item).kind, (lite_item).code);
    }
    void liteFn_m13_reportArgumentCode;
    function liteFn_m13_usesBuiltin(lite_calls: string, lite_name: string): boolean {
        void lite_calls;
        void lite_name;
        if (((lite_calls) === ("|"))) {
            return false;
        }
        return ((liteFn_m3_indexOfText(lite_calls, (((("|lite$") + (lite_name))) + ("(|")), 0n)) >= (0n));
    }
    void liteFn_m13_usesBuiltin;
    function liteFn_m13_usesListIndex(lite_calls: string): boolean {
        void lite_calls;
        return liteFn_m13_usesBuiltin(lite_calls, "listAt");
    }
    void liteFn_m13_usesListIndex;
    function liteFn_m13_usesListPop(lite_calls: string): boolean {
        void lite_calls;
        return liteFn_m13_usesBuiltin(lite_calls, "listPopBack");
    }
    void liteFn_m13_usesListPop;
    function liteFn_m13_usesIntArithmetic(lite_calls: string): boolean {
        void lite_calls;
        return ((((((liteFn_m13_usesBuiltin(lite_calls, "addInt")) || (liteFn_m13_usesBuiltin(lite_calls, "subtractInt")))) || (liteFn_m13_usesBuiltin(lite_calls, "multiplyInt")))) || (liteFn_m13_usesBuiltin(lite_calls, "negateInt")));
    }
    void liteFn_m13_usesIntArithmetic;
    function liteFn_m13_usesIntDivision(lite_calls: string): boolean {
        void lite_calls;
        return ((((((liteFn_m13_usesBuiltin(lite_calls, "divideInt")) || (liteFn_m13_usesBuiltin(lite_calls, "remainderInt")))) || (liteFn_m13_usesBuiltin(lite_calls, "floorDivideInt")))) || (liteFn_m13_usesBuiltin(lite_calls, "floorModuloInt")));
    }
    void liteFn_m13_usesIntDivision;
    function liteFn_m13_usesFloatArithmetic(lite_calls: string): boolean {
        void lite_calls;
        return ((liteFn_m13_usesBuiltin(lite_calls, "floatOp")) || (liteFn_m13_usesBuiltin(lite_calls, "floatPower")));
    }
    void liteFn_m13_usesFloatArithmetic;
    function liteFn_m13_emitFloatArithmeticHelpers(lite_calls: string): void {
        void lite_calls;
        if ((!(liteFn_m13_usesFloatArithmetic(lite_calls)))) {
            return;
        }
        if (liteFn_m13_usesBuiltin(lite_calls, "floatPower")) {
            const lite$report1 = "function lite$floatPower(left: number, right: number, at: number): number {";
            lite$emit(lite$report1 + "\n");
            const lite$report2 = "    if (right <= 0) lite$fault(\"ArithmeticPanic\", at, \"power exponent must be positive in this checkpoint\");";
            lite$emit(lite$report2 + "\n");
            const lite$report3 = "    const value = Math.pow(left, right);";
            lite$emit(lite$report3 + "\n");
            const lite$report4 = "    if (!Number.isFinite(value)) lite$fault(\"ArithmeticPanic\", at, \"non-finite floating value\");";
            lite$emit(lite$report4 + "\n");
            const lite$report5 = "    return value;";
            lite$emit(lite$report5 + "\n");
            const lite$report6 = "}";
            lite$emit(lite$report6 + "\n");
        }
        if ((!(liteFn_m13_usesBuiltin(lite_calls, "floatOp")))) {
            return;
        }
        const lite$report7 = "function lite$floatOp(left: number, right: number, op: number, at: number): number {";
        lite$emit(lite$report7 + "\n");
        const lite$report8 = "    if (op === 3 && right === 0) lite$fault(\"ArithmeticPanic\", at, \"division by zero\");";
        lite$emit(lite$report8 + "\n");
        const lite$report9 = "    const value = op === 0 ? left + right : op === 1 ? left - right : op === 2 ? left * right : left / right;";
        lite$emit(lite$report9 + "\n");
        const lite$report10 = "    if (!Number.isFinite(value)) lite$fault(\"ArithmeticPanic\", at, \"non-finite floating value\");";
        lite$emit(lite$report10 + "\n");
        const lite$report11 = "    return value;";
        lite$emit(lite$report11 + "\n");
        const lite$report12 = "}";
        lite$emit(lite$report12 + "\n");
    }
    void liteFn_m13_emitFloatArithmeticHelpers;
    function liteFn_m13_usesBounds(lite_calls: string): boolean {
        void lite_calls;
        return ((((((liteFn_m13_usesBuiltin(lite_calls, "textAt")) || (liteFn_m13_usesBuiltin(lite_calls, "textSlice")))) || (liteFn_m13_usesListIndex(lite_calls)))) || (liteFn_m13_usesListPop(lite_calls)));
    }
    void liteFn_m13_usesBounds;
    function liteFn_m13_emitIntArithmeticHelpers(lite_calls: string, lite_source: string, lite_prefix: string): void {
        void lite_calls;
        void lite_source;
        void lite_prefix;
        const lite_m13_integers = ((liteFn_m13_usesIntArithmetic(lite_calls)) || (liteFn_m13_usesIntDivision(lite_calls)));
        void lite_m13_integers;
        if ((((((!(lite_m13_integers))) && ((!(liteFn_m13_usesBounds(lite_calls)))))) && ((!(liteFn_m13_usesFloatArithmetic(lite_calls)))))) {
            return;
        }
        const lite_m13_namePrefix = (Boolean(((lite_prefix) === (""))) ? "" : ((lite_prefix) + (":")));
        void lite_m13_namePrefix;
        const lite_m13_needsRange = ((((liteFn_m13_usesIntArithmetic(lite_calls)) || (liteFn_m13_usesBuiltin(lite_calls, "divideInt")))) || (liteFn_m13_usesBuiltin(lite_calls, "floorDivideInt")));
        void lite_m13_needsRange;
        const lite$report13 = (((("const lite$intLines: readonly number[] = [") + (liteFn_m2_lineStartCodes(lite_source)))) + ("];"));
        lite$emit(lite$report13 + "\n");
        const lite$report14 = (((("const lite$intSource = ") + (liteFn_m10_textLiteralCode(lite_m13_namePrefix)))) + (";"));
        lite$emit(lite$report14 + "\n");
        if (lite_m13_needsRange) {
            const lite$report15 = "const lite$intMin = -(1n << 63n), lite$intMax = (1n << 63n) - 1n;";
            lite$emit(lite$report15 + "\n");
        }
        const lite$report16 = "function lite$fault(category: string, at: number, message: string): never {";
        lite$emit(lite$report16 + "\n");
        const lite$report17 = "    let line = 0;";
        lite$emit(lite$report17 + "\n");
        const lite$report18 = "    while (line + 1 < lite$intLines.length && (lite$intLines[line + 1] ?? Infinity) <= at) line += 1;";
        lite$emit(lite$report18 + "\n");
        const lite$report19 = "    const column = at - (lite$intLines[line] ?? 0) + 1;";
        lite$emit(lite$report19 + "\n");
        const lite$report20 = "    process.getBuiltinModule(\"node:fs\").writeSync(2, lite$intSource + (line + 1) + \":\" + column + \": \" + category + \": \" + message + \"\\n\");";
        lite$emit(lite$report20 + "\n");
        const lite$report21 = "    process.exit(1);";
        lite$emit(lite$report21 + "\n");
        const lite$report22 = "}";
        lite$emit(lite$report22 + "\n");
        if (lite_m13_integers) {
            const lite$report23 = "function lite$intFault(at: number, message: string): never { return lite$fault(\"ArithmeticPanic\", at, message); }";
            lite$emit(lite$report23 + "\n");
        }
        if (lite_m13_needsRange) {
            const lite$report24 = "function lite$checkedInt(value: bigint, at: number): bigint {";
            lite$emit(lite$report24 + "\n");
            const lite$report25 = "    if (value < lite$intMin || value > lite$intMax) lite$intFault(at, \"integer outside Int range\");";
            lite$emit(lite$report25 + "\n");
            const lite$report26 = "    return value;";
            lite$emit(lite$report26 + "\n");
            const lite$report27 = "}";
            lite$emit(lite$report27 + "\n");
        }
        if (liteFn_m13_usesBuiltin(lite_calls, "addInt")) {
            const lite$report28 = "function lite$addInt(left: bigint, right: bigint, at: number): bigint { return lite$checkedInt(left + right, at); }";
            lite$emit(lite$report28 + "\n");
        }
        if (liteFn_m13_usesBuiltin(lite_calls, "subtractInt")) {
            const lite$report29 = "function lite$subtractInt(left: bigint, right: bigint, at: number): bigint { return lite$checkedInt(left - right, at); }";
            lite$emit(lite$report29 + "\n");
        }
        if (liteFn_m13_usesBuiltin(lite_calls, "multiplyInt")) {
            const lite$report30 = "function lite$multiplyInt(left: bigint, right: bigint, at: number): bigint { return lite$checkedInt(left * right, at); }";
            lite$emit(lite$report30 + "\n");
        }
        if (liteFn_m13_usesBuiltin(lite_calls, "negateInt")) {
            const lite$report31 = "function lite$negateInt(value: bigint, at: number): bigint { return lite$checkedInt(-value, at); }";
            lite$emit(lite$report31 + "\n");
        }
        const lite$report32 = "";
        lite$emit(lite$report32 + "\n");
    }
    void liteFn_m13_emitIntArithmeticHelpers;
    function liteFn_m13_emitInputHelpers(lite_calls: string): void {
        void lite_calls;
        if ((!((((((((liteFn_m13_usesBuiltin(lite_calls, "inputAll")) || (liteFn_m13_usesBuiltin(lite_calls, "inputLine")))) || (liteFn_m13_usesBuiltin(lite_calls, "inputInt")))) || (liteFn_m13_usesBuiltin(lite_calls, "inputFloat"))))))) {
            return;
        }
        const lite$report33 = "declare const TextDecoder: { new(label: string, options: { fatal: boolean }): { decode(input?: Uint8Array, options?: { stream: boolean }): string } };";
        lite$emit(lite$report33 + "\n");
        const lite$report34 = "const lite$decoder = new TextDecoder(\"utf-8\", { fatal: true });";
        lite$emit(lite$report34 + "\n");
        const lite$report35 = "const lite$bytes = new Uint8Array(4096);";
        lite$emit(lite$report35 + "\n");
        const lite$report36 = "let lite$byteAt = 0, lite$byteEnd = 0;";
        lite$emit(lite$report36 + "\n");
        const lite$report37 = "let lite$ended = false;";
        lite$emit(lite$report37 + "\n");
        const lite$report38 = "let lite$pending: string | null | undefined;";
        lite$emit(lite$report38 + "\n");
        const lite$report39 = "function lite$inputFault(at: string, message: string): never {";
        lite$emit(lite$report39 + "\n");
        const lite$report40 = "    process.getBuiltinModule(\"node:fs\").writeSync(2, at + message + \"\\n\");";
        lite$emit(lite$report40 + "\n");
        const lite$report41 = "    process.exit(1);";
        lite$emit(lite$report41 + "\n");
        const lite$report42 = "}";
        lite$emit(lite$report42 + "\n");
        const lite$report43 = "function lite$prompt(text: string | undefined): void {";
        lite$emit(lite$report43 + "\n");
        const lite$report44 = "    if (text === undefined) return;";
        lite$emit(lite$report44 + "\n");
        const lite$report45 = "    process.getBuiltinModule(\"node:fs\").writeSync(1, lite_out + text);";
        lite$emit(lite$report45 + "\n");
        const lite$report46 = "    lite_out = \"\";";
        lite$emit(lite$report46 + "\n");
        const lite$report47 = "}";
        lite$emit(lite$report47 + "\n");
        const lite$report48 = "function lite$peek(at: string): string | null {";
        lite$emit(lite$report48 + "\n");
        const lite$report49 = "    if (lite$pending !== undefined) return lite$pending;";
        lite$emit(lite$report49 + "\n");
        const lite$report50 = "    if (lite$ended) return null;";
        lite$emit(lite$report50 + "\n");
        const lite$report51 = "    try {";
        lite$emit(lite$report51 + "\n");
        const lite$report52 = "        while (true) {";
        lite$emit(lite$report52 + "\n");
        const lite$report53 = "            if (lite$byteAt === lite$byteEnd) {";
        lite$emit(lite$report53 + "\n");
        const lite$report54 = "                lite$byteEnd = process.getBuiltinModule(\"node:fs\").readSync(0, lite$bytes, 0, lite$bytes.length, null);";
        lite$emit(lite$report54 + "\n");
        const lite$report55 = "                lite$byteAt = 0;";
        lite$emit(lite$report55 + "\n");
        const lite$report56 = "                if (lite$byteEnd === 0) {";
        lite$emit(lite$report56 + "\n");
        const lite$report57 = "                    lite$ended = true;";
        lite$emit(lite$report57 + "\n");
        const lite$report58 = "                    lite$pending = lite$decoder.decode() || null;";
        lite$emit(lite$report58 + "\n");
        const lite$report59 = "                    return lite$pending;";
        lite$emit(lite$report59 + "\n");
        const lite$report60 = "                }";
        lite$emit(lite$report60 + "\n");
        const lite$report61 = "            }";
        lite$emit(lite$report61 + "\n");
        const lite$report62 = "            const text = lite$decoder.decode(lite$bytes.subarray(lite$byteAt, ++lite$byteAt), { stream: true });";
        lite$emit(lite$report62 + "\n");
        const lite$report63 = "            if (text !== \"\") { lite$pending = text; return text; }";
        lite$emit(lite$report63 + "\n");
        const lite$report64 = "        }";
        lite$emit(lite$report64 + "\n");
        const lite$report65 = "    } catch (error) {";
        lite$emit(lite$report65 + "\n");
        const lite$report66 = "        return lite$inputFault(at, \"cannot read input: \" + (error instanceof Error ? error.message : String(error)));";
        lite$emit(lite$report66 + "\n");
        const lite$report67 = "    }";
        lite$emit(lite$report67 + "\n");
        const lite$report68 = "}";
        lite$emit(lite$report68 + "\n");
        const lite$report69 = "function lite$take(at: string): string | null {";
        lite$emit(lite$report69 + "\n");
        const lite$report70 = "    const text = lite$peek(at); lite$pending = undefined; return text;";
        lite$emit(lite$report70 + "\n");
        const lite$report71 = "}";
        lite$emit(lite$report71 + "\n");
        if (((liteFn_m13_usesBuiltin(lite_calls, "inputInt")) || (liteFn_m13_usesBuiltin(lite_calls, "inputFloat")))) {
            const lite$report72 = "function lite$word(at: string): string | null {";
            lite$emit(lite$report72 + "\n");
            const lite$report73 = "    let ch = lite$peek(at);";
            lite$emit(lite$report73 + "\n");
            const lite$report74 = "    while (ch !== null && /\\s/u.test(ch)) { lite$take(at); ch = lite$peek(at); }";
            lite$emit(lite$report74 + "\n");
            const lite$report75 = "    if (ch === null) return null;";
            lite$emit(lite$report75 + "\n");
            const lite$report76 = "    let text = \"\";";
            lite$emit(lite$report76 + "\n");
            const lite$report77 = "    while (ch !== null && !/\\s/u.test(ch)) { text += lite$take(at); ch = lite$peek(at); }";
            lite$emit(lite$report77 + "\n");
            const lite$report78 = "    return text;";
            lite$emit(lite$report78 + "\n");
            const lite$report79 = "}";
            lite$emit(lite$report79 + "\n");
        }
        if (liteFn_m13_usesBuiltin(lite_calls, "inputAll")) {
            const lite$report80 = "function lite$inputAll(prompt: string | undefined, at: string): string {";
            lite$emit(lite$report80 + "\n");
            const lite$report81 = "    lite$prompt(prompt);";
            lite$emit(lite$report81 + "\n");
            const lite$report82 = "    let text = \"\";";
            lite$emit(lite$report82 + "\n");
            const lite$report83 = "    for (let ch = lite$take(at); ch !== null; ch = lite$take(at)) text += ch;";
            lite$emit(lite$report83 + "\n");
            const lite$report84 = "    return text;";
            lite$emit(lite$report84 + "\n");
            const lite$report85 = "}";
            lite$emit(lite$report85 + "\n");
        }
        if (liteFn_m13_usesBuiltin(lite_calls, "inputLine")) {
            const lite$report86 = "function lite$inputLine(prompt: string | undefined, at: string): string {";
            lite$emit(lite$report86 + "\n");
            const lite$report87 = "    lite$prompt(prompt);";
            lite$emit(lite$report87 + "\n");
            const lite$report88 = "    let text = \"\", ch = lite$take(at);";
            lite$emit(lite$report88 + "\n");
            const lite$report89 = "    if (ch === null) return lite$inputFault(at, \"EOF before inputLine value\");";
            lite$emit(lite$report89 + "\n");
            const lite$report90 = "    while (ch !== null && ch !== \"\\n\") { text += ch; ch = lite$take(at); }";
            lite$emit(lite$report90 + "\n");
            const lite$report91 = "    return ch === \"\\n\" && text.endsWith(\"\\r\") ? text.slice(0, -1) : text;";
            lite$emit(lite$report91 + "\n");
            const lite$report92 = "}";
            lite$emit(lite$report92 + "\n");
        }
        if (liteFn_m13_usesBuiltin(lite_calls, "inputInt")) {
            const lite$report93 = "function lite$inputInt(prompt: string | undefined, at: string): bigint {";
            lite$emit(lite$report93 + "\n");
            const lite$report94 = "    lite$prompt(prompt);";
            lite$emit(lite$report94 + "\n");
            const lite$report95 = "    const text = lite$word(at);";
            lite$emit(lite$report95 + "\n");
            const lite$report96 = "    if (text === null) return lite$inputFault(at, \"EOF before inputInt value\");";
            lite$emit(lite$report96 + "\n");
            const lite$report97 = "    if (!/^[+-]?[0-9]+$/.test(text)) return lite$inputFault(at, \"expected an integer token\");";
            lite$emit(lite$report97 + "\n");
            const lite$report98 = "    const value = BigInt(text);";
            lite$emit(lite$report98 + "\n");
            const lite$report99 = "    if (value < -(1n << 63n) || value > (1n << 63n) - 1n) return lite$inputFault(at, \"input outside signed 64-bit range\");";
            lite$emit(lite$report99 + "\n");
            const lite$report100 = "    return value;";
            lite$emit(lite$report100 + "\n");
            const lite$report101 = "}";
            lite$emit(lite$report101 + "\n");
        }
        if (liteFn_m13_usesBuiltin(lite_calls, "inputFloat")) {
            const lite$report102 = "function lite$inputFloat(prompt: string | undefined, at: string): number {";
            lite$emit(lite$report102 + "\n");
            const lite$report103 = "    lite$prompt(prompt);";
            lite$emit(lite$report103 + "\n");
            const lite$report104 = "    const text = lite$word(at);";
            lite$emit(lite$report104 + "\n");
            const lite$report105 = "    if (text === null) return lite$inputFault(at, \"EOF before inputFloat value\");";
            lite$emit(lite$report105 + "\n");
            const lite$report106 = "    const value = Number(text);";
            lite$emit(lite$report106 + "\n");
            const lite$report107 = "    if (!/^[+-]?[0-9]+(?:\\.[0-9]+)?(?:[eE][+-]?[0-9]+)?$/.test(text) || !Number.isFinite(value)) return lite$inputFault(at, \"expected a finite floating token\");";
            lite$emit(lite$report107 + "\n");
            const lite$report108 = "    return value;";
            lite$emit(lite$report108 + "\n");
            const lite$report109 = "}";
            lite$emit(lite$report109 + "\n");
        }
        const lite$report110 = "";
        lite$emit(lite$report110 + "\n");
    }
    void liteFn_m13_emitInputHelpers;
    function liteFn_m13_emitBuiltinHelpers(lite_calls: string): void {
        void lite_calls;
        if (((((((((((((((((((((liteFn_m13_usesBuiltin(lite_calls, "inputArgs")) || (liteFn_m13_usesBuiltin(lite_calls, "inputAll")))) || (liteFn_m13_usesBuiltin(lite_calls, "inputLine")))) || (liteFn_m13_usesBuiltin(lite_calls, "inputInt")))) || (liteFn_m13_usesBuiltin(lite_calls, "inputFloat")))) || (liteFn_m13_usesBuiltin(lite_calls, "reportError")))) || (liteFn_m13_usesBuiltin(lite_calls, "exit")))) || (liteFn_m13_usesIntArithmetic(lite_calls)))) || (liteFn_m13_usesIntDivision(lite_calls)))) || (liteFn_m13_usesBounds(lite_calls)))) || (liteFn_m13_usesFloatArithmetic(lite_calls)))) {
            const lite$report111 = "declare const process: {";
            lite$emit(lite$report111 + "\n");
            const lite$report112 = "    argv: string[];";
            lite$emit(lite$report112 + "\n");
            const lite$report113 = "    exit(code: number): never;";
            lite$emit(lite$report113 + "\n");
            const lite$report114 = "    getBuiltinModule(name: \"node:fs\"): {";
            lite$emit(lite$report114 + "\n");
            const lite$report115 = "        readSync(fd: number, buffer: Uint8Array, offset: number, length: number, position: null): number;";
            lite$emit(lite$report115 + "\n");
            const lite$report116 = "        writeSync(fd: number, text: string): number;";
            lite$emit(lite$report116 + "\n");
            const lite$report117 = "    };";
            lite$emit(lite$report117 + "\n");
            const lite$report118 = "};";
            lite$emit(lite$report118 + "\n");
            const lite$report119 = "";
            lite$emit(lite$report119 + "\n");
        }
        if (liteFn_m13_usesBuiltin(lite_calls, "readSource")) {
            const lite$report120 = "let lite$sourceProvider: ((importer: string, spec: string) => { path: string; text: string }) | undefined;";
            lite$emit(lite$report120 + "\n");
            const lite$report121 = "function lite$readSource(importer: string, spec: string): { path: string; text: string } {";
            lite$emit(lite$report121 + "\n");
            const lite$report122 = "    if (lite$sourceProvider === undefined) throw new Error(\"compiler host does not provide source reads\");";
            lite$emit(lite$report122 + "\n");
            const lite$report123 = "    return lite$sourceProvider(importer, spec);";
            lite$emit(lite$report123 + "\n");
            const lite$report124 = "}";
            lite$emit(lite$report124 + "\n");
            const lite$report125 = "";
            lite$emit(lite$report125 + "\n");
        }
        if (liteFn_m13_usesBuiltin(lite_calls, "inputArgs")) {
            const lite$report126 = "function lite$inputArgs(): string[] {";
            lite$emit(lite$report126 + "\n");
            const lite$report127 = "    return process.argv.slice(2);";
            lite$emit(lite$report127 + "\n");
            const lite$report128 = "}";
            lite$emit(lite$report128 + "\n");
            const lite$report129 = "";
            lite$emit(lite$report129 + "\n");
        }
        liteFn_m13_emitInputHelpers(lite_calls);
        if (liteFn_m13_usesBuiltin(lite_calls, "reportError")) {
            const lite$report130 = "function lite$reportError(text: string): void {";
            lite$emit(lite$report130 + "\n");
            const lite$report131 = "    process.getBuiltinModule(\"node:fs\").writeSync(2, text + \"\\n\");";
            lite$emit(lite$report131 + "\n");
            const lite$report132 = "}";
            lite$emit(lite$report132 + "\n");
            const lite$report133 = "";
            lite$emit(lite$report133 + "\n");
        }
        if (liteFn_m13_usesBuiltin(lite_calls, "exit")) {
            const lite$report134 = "function lite$exit(status: bigint): void {";
            lite$emit(lite$report134 + "\n");
            const lite$report135 = "    process.getBuiltinModule(\"node:fs\").writeSync(1, lite_out);";
            lite$emit(lite$report135 + "\n");
            const lite$report136 = "    process.exit(Number(status));";
            lite$emit(lite$report136 + "\n");
            const lite$report137 = "}";
            lite$emit(lite$report137 + "\n");
            const lite$report138 = "";
            lite$emit(lite$report138 + "\n");
        }
        if (((((liteFn_m13_usesBuiltin(lite_calls, "textLength")) || (liteFn_m13_usesBuiltin(lite_calls, "textAt")))) || (liteFn_m13_usesBuiltin(lite_calls, "textSlice")))) {
            const lite$report139 = "const lite$textCache = new Map<string, readonly string[]>();";
            lite$emit(lite$report139 + "\n");
            const lite$report140 = "function lite$textPoints(text: string): readonly string[] {";
            lite$emit(lite$report140 + "\n");
            const lite$report141 = "    const found = lite$textCache.get(text);";
            lite$emit(lite$report141 + "\n");
            const lite$report142 = "    if (found !== undefined) {";
            lite$emit(lite$report142 + "\n");
            const lite$report143 = "        lite$textCache.delete(text);";
            lite$emit(lite$report143 + "\n");
            const lite$report144 = "        lite$textCache.set(text, found);";
            lite$emit(lite$report144 + "\n");
            const lite$report145 = "        return found;";
            lite$emit(lite$report145 + "\n");
            const lite$report146 = "    }";
            lite$emit(lite$report146 + "\n");
            const lite$report147 = "    const points = Array.from(text);";
            lite$emit(lite$report147 + "\n");
            const lite$report148 = "    lite$textCache.set(text, points);";
            lite$emit(lite$report148 + "\n");
            const lite$report149 = "    if (lite$textCache.size > 8) {";
            lite$emit(lite$report149 + "\n");
            const lite$report150 = "        const oldest = lite$textCache.keys().next();";
            lite$emit(lite$report150 + "\n");
            const lite$report151 = "        if (oldest.done !== true) lite$textCache.delete(oldest.value);";
            lite$emit(lite$report151 + "\n");
            const lite$report152 = "    }";
            lite$emit(lite$report152 + "\n");
            const lite$report153 = "    return points;";
            lite$emit(lite$report153 + "\n");
            const lite$report154 = "}";
            lite$emit(lite$report154 + "\n");
            const lite$report155 = "";
            lite$emit(lite$report155 + "\n");
        }
        if (liteFn_m13_usesBuiltin(lite_calls, "textLength")) {
            const lite$report156 = "function lite$textLength(text: string): bigint {";
            lite$emit(lite$report156 + "\n");
            const lite$report157 = "    return BigInt(lite$textPoints(text).length);";
            lite$emit(lite$report157 + "\n");
            const lite$report158 = "}";
            lite$emit(lite$report158 + "\n");
            const lite$report159 = "";
            lite$emit(lite$report159 + "\n");
        }
        if (liteFn_m13_usesBuiltin(lite_calls, "textAt")) {
            const lite$report160 = "function lite$textAt(text: string, position: bigint, at: number): string {";
            lite$emit(lite$report160 + "\n");
            const lite$report161 = "    const points = lite$textPoints(text);";
            lite$emit(lite$report161 + "\n");
            const lite$report162 = "    if (position < 0n || position >= BigInt(points.length)) {";
            lite$emit(lite$report162 + "\n");
            const lite$report163 = "        lite$fault(\"BoundPanic\", at, \"textAt index outside text\");";
            lite$emit(lite$report163 + "\n");
            const lite$report164 = "    }";
            lite$emit(lite$report164 + "\n");
            const lite$report165 = "    const value = points[Number(position)];";
            lite$emit(lite$report165 + "\n");
            const lite$report166 = "    if (value === undefined) {";
            lite$emit(lite$report166 + "\n");
            const lite$report167 = "        throw new Error(\"BoundPanic: textAt index outside text\");";
            lite$emit(lite$report167 + "\n");
            const lite$report168 = "    }";
            lite$emit(lite$report168 + "\n");
            const lite$report169 = "    return value;";
            lite$emit(lite$report169 + "\n");
            const lite$report170 = "}";
            lite$emit(lite$report170 + "\n");
            const lite$report171 = "";
            lite$emit(lite$report171 + "\n");
        }
        if (liteFn_m13_usesBuiltin(lite_calls, "textSlice")) {
            const lite$report172 = "function lite$textSlice(text: string, start: bigint, end: bigint, at: number): string {";
            lite$emit(lite$report172 + "\n");
            const lite$report173 = "    const points = lite$textPoints(text);";
            lite$emit(lite$report173 + "\n");
            const lite$report174 = "    if (start < 0n || end < start || end > BigInt(points.length)) {";
            lite$emit(lite$report174 + "\n");
            const lite$report175 = "        lite$fault(\"BoundPanic\", at, \"textSlice requires 0 <= start <= end <= textLength(text)\");";
            lite$emit(lite$report175 + "\n");
            const lite$report176 = "    }";
            lite$emit(lite$report176 + "\n");
            const lite$report177 = "    return points.slice(Number(start), Number(end)).join(\"\");";
            lite$emit(lite$report177 + "\n");
            const lite$report178 = "}";
            lite$emit(lite$report178 + "\n");
            const lite$report179 = "";
            lite$emit(lite$report179 + "\n");
        }
        return;
    }
    void liteFn_m13_emitBuiltinHelpers;
    function liteFn_m13_emitListIndexHelper(): void {
        const lite$report180 = "function lite$listAt<T>(items: readonly T[], index: bigint, at: number): T {";
        lite$emit(lite$report180 + "\n");
        const lite$report181 = "    if (index < 0n || index >= BigInt(items.length)) {";
        lite$emit(lite$report181 + "\n");
        const lite$report182 = "        lite$fault(\"BoundPanic\", at, \"list index outside its extent\");";
        lite$emit(lite$report182 + "\n");
        const lite$report183 = "    }";
        lite$emit(lite$report183 + "\n");
        const lite$report184 = "    const value = items[Number(index)];";
        lite$emit(lite$report184 + "\n");
        const lite$report185 = "    if (value === undefined) {";
        lite$emit(lite$report185 + "\n");
        const lite$report186 = "        lite$fault(\"BoundPanic\", at, \"list index outside its extent\");";
        lite$emit(lite$report186 + "\n");
        const lite$report187 = "    }";
        lite$emit(lite$report187 + "\n");
        const lite$report188 = "    return value;";
        lite$emit(lite$report188 + "\n");
        const lite$report189 = "}";
        lite$emit(lite$report189 + "\n");
        const lite$report190 = "";
        lite$emit(lite$report190 + "\n");
    }
    void liteFn_m13_emitListIndexHelper;
    function liteFn_m13_emitListPopHelper(): void {
        const lite$report191 = "function lite$listPopBack<T>(items: T[], at: number): T {";
        lite$emit(lite$report191 + "\n");
        const lite$report192 = "    const value = items.pop();";
        lite$emit(lite$report192 + "\n");
        const lite$report193 = "    if (value === undefined) {";
        lite$emit(lite$report193 + "\n");
        const lite$report194 = "        lite$fault(\"BoundPanic\", at, \"pop_back on an empty list\");";
        lite$emit(lite$report194 + "\n");
        const lite$report195 = "    }";
        lite$emit(lite$report195 + "\n");
        const lite$report196 = "    return value;";
        lite$emit(lite$report196 + "\n");
        const lite$report197 = "}";
        lite$emit(lite$report197 + "\n");
        const lite$report198 = "";
        lite$emit(lite$report198 + "\n");
    }
    void liteFn_m13_emitListPopHelper;
    function liteFn_m13_emitIntDivideHelper(): void {
        const lite$report199 = "function lite$divideInt(left: bigint, right: bigint, at: number): bigint {";
        lite$emit(lite$report199 + "\n");
        const lite$report200 = "    if (right === 0n) lite$intFault(at, \"division by zero\");";
        lite$emit(lite$report200 + "\n");
        const lite$report201 = "    return lite$checkedInt(left / right, at);";
        lite$emit(lite$report201 + "\n");
        const lite$report202 = "}";
        lite$emit(lite$report202 + "\n");
        const lite$report203 = "";
        lite$emit(lite$report203 + "\n");
    }
    void liteFn_m13_emitIntDivideHelper;
    function liteFn_m13_emitIntRemainderHelper(): void {
        const lite$report204 = "function lite$remainderInt(left: bigint, right: bigint, at: number): bigint {";
        lite$emit(lite$report204 + "\n");
        const lite$report205 = "    if (right === 0n) lite$intFault(at, \"remainder by zero\");";
        lite$emit(lite$report205 + "\n");
        const lite$report206 = "    return left % right;";
        lite$emit(lite$report206 + "\n");
        const lite$report207 = "}";
        lite$emit(lite$report207 + "\n");
        const lite$report208 = "";
        lite$emit(lite$report208 + "\n");
    }
    void liteFn_m13_emitIntRemainderHelper;
    function liteFn_m13_emitIntFloorDivideHelper(): void {
        const lite$report209 = "function lite$floorDivideInt(left: bigint, right: bigint, at: number): bigint {";
        lite$emit(lite$report209 + "\n");
        const lite$report210 = "    const quotient = lite$divideInt(left, right, at);";
        lite$emit(lite$report210 + "\n");
        const lite$report211 = "    const remainder = left % right;";
        lite$emit(lite$report211 + "\n");
        const lite$report212 = "    return remainder !== 0n && (left < 0n) !== (right < 0n) ? quotient - 1n : quotient;";
        lite$emit(lite$report212 + "\n");
        const lite$report213 = "}";
        lite$emit(lite$report213 + "\n");
        const lite$report214 = "";
        lite$emit(lite$report214 + "\n");
    }
    void liteFn_m13_emitIntFloorDivideHelper;
    function liteFn_m13_emitIntFloorModuloHelper(): void {
        const lite$report215 = "function lite$floorModuloInt(left: bigint, right: bigint, at: number): bigint {";
        lite$emit(lite$report215 + "\n");
        const lite$report216 = "    if (right === 0n) lite$intFault(at, \"modulo by zero\");";
        lite$emit(lite$report216 + "\n");
        const lite$report217 = "    const remainder = left % right;";
        lite$emit(lite$report217 + "\n");
        const lite$report218 = "    return remainder !== 0n && (remainder < 0n) !== (right < 0n) ? remainder + right : remainder;";
        lite$emit(lite$report218 + "\n");
        const lite$report219 = "}";
        lite$emit(lite$report219 + "\n");
        const lite$report220 = "";
        lite$emit(lite$report220 + "\n");
    }
    void liteFn_m13_emitIntFloorModuloHelper;
    function liteFn_m13_emitIntDivisionHelpers(lite_calls: string): void {
        void lite_calls;
        if ((((liteFn_m13_usesBuiltin(lite_calls, "divideInt")) || (liteFn_m13_usesBuiltin(lite_calls, "floorDivideInt"))))) {
            liteFn_m13_emitIntDivideHelper();
        }
        if (liteFn_m13_usesBuiltin(lite_calls, "remainderInt")) {
            liteFn_m13_emitIntRemainderHelper();
        }
        if (liteFn_m13_usesBuiltin(lite_calls, "floorDivideInt")) {
            liteFn_m13_emitIntFloorDivideHelper();
        }
        if (liteFn_m13_usesBuiltin(lite_calls, "floorModuloInt")) {
            liteFn_m13_emitIntFloorModuloHelper();
        }
        return;
    }
    void liteFn_m13_emitIntDivisionHelpers;
    function liteFn_m13_emitProgram(lite_items: { kind: string; name: string; runtime: string; code: string; intValue: bigint; textValue: string }[], lite_source: string, lite_prefix: string): void {
        void lite_items;
        void lite_source;
        void lite_prefix;
        const lite_m13_calls = liteFn_m2_targetHelperCalls([...(lite_items)]);
        void lite_m13_calls;
        const lite_m13_hasExit = ((((((((liteFn_m13_usesBuiltin(lite_m13_calls, "exit")) || (liteFn_m13_usesBuiltin(lite_m13_calls, "inputAll")))) || (liteFn_m13_usesBuiltin(lite_m13_calls, "inputLine")))) || (liteFn_m13_usesBuiltin(lite_m13_calls, "inputInt")))) || (liteFn_m13_usesBuiltin(lite_m13_calls, "inputFloat")));
        void lite_m13_hasExit;
        if (lite_m13_hasExit) {
            const lite$report221 = "let lite_out = \"\";";
            lite$emit(lite$report221 + "\n");
            const lite$report222 = "";
            lite$emit(lite$report222 + "\n");
        }
        liteFn_m13_emitBuiltinHelpers(lite_m13_calls);
        if (liteFn_m13_usesListIndex(lite_m13_calls)) {
            liteFn_m13_emitListIndexHelper();
        }
        if (liteFn_m13_usesListPop(lite_m13_calls)) {
            liteFn_m13_emitListPopHelper();
        }
        liteFn_m13_emitIntArithmeticHelpers(lite_m13_calls, lite_source, lite_prefix);
        liteFn_m13_emitFloatArithmeticHelpers(lite_m13_calls);
        liteFn_m13_emitIntDivisionHelpers(lite_m13_calls);
        if (liteFn_m13_usesBuiltin(lite_m13_calls, "readSource")) {
            const lite$report223 = "export function main(lite$write?: (text: string) => void, lite$sourceProviderInput?: (importer: string, spec: string) => { path: string; text: string }): string {";
            lite$emit(lite$report223 + "\n");
            const lite$report224 = "    lite$sourceProvider = lite$sourceProviderInput;";
            lite$emit(lite$report224 + "\n");
        } else {
            const lite$report225 = "export function main(lite$write?: (text: string) => void): string {";
            lite$emit(lite$report225 + "\n");
        }
        if ((!(lite_m13_hasExit))) {
            const lite$report226 = "    let lite_out = \"\";";
            lite$emit(lite$report226 + "\n");
        }
        const lite$report227 = "    function lite$emit(text: string): void {";
        lite$emit(lite$report227 + "\n");
        const lite$report228 = "        if (lite$write === undefined) lite_out += text;";
        lite$emit(lite$report228 + "\n");
        const lite$report229 = "        else lite$write(text);";
        lite$emit(lite$report229 + "\n");
        const lite$report230 = "    }";
        lite$emit(lite$report230 + "\n");
        const lite$report231 = "    void lite$emit;";
        lite$emit(lite$report231 + "\n");
        let lite_m13_indent = "    ";
        void lite_m13_indent;
        let lite_m13_line = "";
        void lite_m13_line;
        let lite_m13_count = 0n;
        void lite_m13_count;
        let lite_m13_reportIndex = 0n;
        void lite_m13_reportIndex;
        for (const lite_m13_item of [...(lite_items)]) {
            void lite_m13_item;
            if ((((lite_m13_item).kind) === ("FunctionStart"))) {
                const lite$report232 = ((((((((((((((lite_m13_indent) + ("function "))) + ((lite_m13_item).runtime))) + ("("))) + (liteFn_m13_tsParameterList((lite_m13_item).textValue)))) + ("): "))) + (liteFn_m13_tsFunctionType((lite_m13_item).code)))) + (" {"));
                lite$emit(lite$report232 + "\n");
                lite_m13_indent = ((lite_m13_indent) + ("    "));
                liteFn_m13_reportParameterReads((lite_m13_item).textValue, lite_m13_indent);
            } else if ((((lite_m13_item).kind) === ("FunctionEnd"))) {
                lite_m13_indent = liteFn_m13_dedent(lite_m13_indent);
                const lite$report233 = ((lite_m13_indent) + ("}"));
                lite$emit(lite$report233 + "\n");
                const lite$report234 = ((((((lite_m13_indent) + ("void "))) + ((lite_m13_item).runtime))) + (";"));
                lite$emit(lite$report234 + "\n");
            } else if ((((lite_m13_item).kind) === ("Return"))) {
                if ((((lite_m13_item).code) === (""))) {
                    const lite$report235 = ((lite_m13_indent) + ("return;"));
                    lite$emit(lite$report235 + "\n");
                } else {
                    const lite$report236 = ((((((lite_m13_indent) + ("return "))) + ((lite_m13_item).code))) + (";"));
                    lite$emit(lite$report236 + "\n");
                }
            } else if ((((lite_m13_item).kind) === ("Unreachable"))) {
                const lite$report237 = ((lite_m13_indent) + ("throw new Error(\"unreachable loop completion\");"));
                lite$emit(lite$report237 + "\n");
            } else if ((((lite_m13_item).kind) === ("Break"))) {
                const lite$report238 = ((lite_m13_indent) + ("break;"));
                lite$emit(lite$report238 + "\n");
            } else if ((((lite_m13_item).kind) === ("Continue"))) {
                const lite$report239 = ((lite_m13_indent) + ("continue;"));
                lite$emit(lite$report239 + "\n");
            } else if ((((lite_m13_item).kind) === ("Call"))) {
                const lite$report240 = ((((lite_m13_indent) + ((lite_m13_item).code))) + (";"));
                lite$emit(lite$report240 + "\n");
            } else if ((((lite_m13_item).kind) === ("Discard"))) {
                const lite$report241 = ((((((lite_m13_indent) + ("void ("))) + ((lite_m13_item).code))) + (");"));
                lite$emit(lite$report241 + "\n");
            } else if ((((((((((((lite_m13_item).kind) === ("LocalInt"))) || ((((lite_m13_item).kind) === ("LocalString"))))) || ((((lite_m13_item).kind) === ("LocalBool"))))) || ((((lite_m13_item).kind) === ("LocalFloat"))))) || ((((lite_m13_item).kind) === ("LocalTuple"))))) {
                const lite$report242 = ((((((((((lite_m13_indent) + ("const "))) + ((lite_m13_item).runtime))) + (" = "))) + ((lite_m13_item).code))) + (";"));
                lite$emit(lite$report242 + "\n");
                const lite$report243 = ((((((lite_m13_indent) + ("void "))) + ((lite_m13_item).runtime))) + (";"));
                lite$emit(lite$report243 + "\n");
            } else if ((((lite_m13_item).kind) === ("LocalList"))) {
                const lite$report244 = ((((((((((((((lite_m13_indent) + ("const "))) + ((lite_m13_item).runtime))) + (": "))) + (liteFn_m13_tsFunctionType((lite_m13_item).textValue)))) + (" = "))) + ((lite_m13_item).code))) + (";"));
                lite$emit(lite$report244 + "\n");
                const lite$report245 = ((((((lite_m13_indent) + ("void "))) + ((lite_m13_item).runtime))) + (";"));
                lite$emit(lite$report245 + "\n");
            } else if ((((((((((((lite_m13_item).kind) === ("VarInt"))) || ((((lite_m13_item).kind) === ("VarString"))))) || ((((lite_m13_item).kind) === ("VarBool"))))) || ((((lite_m13_item).kind) === ("VarFloat"))))) || ((((lite_m13_item).kind) === ("VarTuple"))))) {
                const lite$report246 = ((((((((((lite_m13_indent) + ("let "))) + ((lite_m13_item).runtime))) + (" = "))) + ((lite_m13_item).code))) + (";"));
                lite$emit(lite$report246 + "\n");
                const lite$report247 = ((((((lite_m13_indent) + ("void "))) + ((lite_m13_item).runtime))) + (";"));
                lite$emit(lite$report247 + "\n");
            } else if ((((lite_m13_item).kind) === ("VarList"))) {
                const lite$report248 = ((((((((((((((lite_m13_indent) + ("let "))) + ((lite_m13_item).runtime))) + (": "))) + (liteFn_m13_tsFunctionType((lite_m13_item).textValue)))) + (" = "))) + ((lite_m13_item).code))) + (";"));
                lite$emit(lite$report248 + "\n");
                const lite$report249 = ((((((lite_m13_indent) + ("void "))) + ((lite_m13_item).runtime))) + (";"));
                lite$emit(lite$report249 + "\n");
            } else if ((((((((((((lite_m13_item).kind) === ("AssignInt"))) || ((((lite_m13_item).kind) === ("AssignString"))))) || ((((lite_m13_item).kind) === ("AssignBool"))))) || ((((lite_m13_item).kind) === ("AssignFloat"))))) || ((((lite_m13_item).kind) === ("AssignTuple"))))) {
                const lite$report250 = ((((((((lite_m13_indent) + ((lite_m13_item).runtime))) + (" = "))) + ((lite_m13_item).code))) + (";"));
                lite$emit(lite$report250 + "\n");
            } else if ((((lite_m13_item).kind) === ("AssignList"))) {
                const lite$report251 = ((((((((lite_m13_indent) + ((lite_m13_item).runtime))) + (" = "))) + ((lite_m13_item).code))) + (";"));
                lite$emit(lite$report251 + "\n");
            } else if ((((lite_m13_item).kind) === ("Scope"))) {
                const lite$report252 = ((lite_m13_indent) + ("{"));
                lite$emit(lite$report252 + "\n");
                lite_m13_indent = ((lite_m13_indent) + ("    "));
            } else if ((((lite_m13_item).kind) === ("If"))) {
                const lite_m13_condition = (Boolean((((((lite_m13_item).code) === ("true"))) || ((((lite_m13_item).code) === ("false"))))) ? (((("Boolean(") + ((lite_m13_item).code))) + (")")) : (lite_m13_item).code);
                void lite_m13_condition;
                const lite$report253 = ((((((lite_m13_indent) + ("if ("))) + (lite_m13_condition))) + (") {"));
                lite$emit(lite$report253 + "\n");
                lite_m13_indent = ((lite_m13_indent) + ("    "));
            } else if ((((lite_m13_item).kind) === ("Else"))) {
                lite_m13_indent = liteFn_m13_dedent(lite_m13_indent);
                const lite$report254 = ((lite_m13_indent) + ("} else {"));
                lite$emit(lite$report254 + "\n");
                lite_m13_indent = ((lite_m13_indent) + ("    "));
            } else if ((((lite_m13_item).kind) === ("ElseIf"))) {
                lite_m13_indent = liteFn_m13_dedent(lite_m13_indent);
                const lite_m13_condition = (Boolean((((((lite_m13_item).code) === ("true"))) || ((((lite_m13_item).code) === ("false"))))) ? (((("Boolean(") + ((lite_m13_item).code))) + (")")) : (lite_m13_item).code);
                void lite_m13_condition;
                const lite$report255 = ((((((lite_m13_indent) + ("} else if ("))) + (lite_m13_condition))) + (") {"));
                lite$emit(lite$report255 + "\n");
                lite_m13_indent = ((lite_m13_indent) + ("    "));
            } else if ((((((lite_m13_item).kind) === ("EndIf"))) || ((((lite_m13_item).kind) === ("EndScope"))))) {
                lite_m13_indent = liteFn_m13_dedent(lite_m13_indent);
                const lite$report256 = ((lite_m13_indent) + ("}"));
                lite$emit(lite$report256 + "\n");
            } else if ((((lite_m13_item).kind) === ("LoopSeq"))) {
                const lite$report257 = ((((((((((lite_m13_indent) + ("for (const "))) + ((lite_m13_item).runtime))) + (" of "))) + (liteFn_m10_listCopyCode((lite_m13_item).code)))) + (") {"));
                lite$emit(lite$report257 + "\n");
                lite_m13_indent = ((lite_m13_indent) + ("    "));
                const lite$report258 = ((((((lite_m13_indent) + ("void "))) + ((lite_m13_item).runtime))) + (";"));
                lite$emit(lite$report258 + "\n");
            } else if ((((lite_m13_item).kind) === ("Loop"))) {
                const lite_m13_condition = (Boolean((((lite_m13_item).code) === (""))) ? "Boolean(true)" : (Boolean((((lite_m13_item).code) === ("false"))) ? "Boolean(false)" : (lite_m13_item).code));
                void lite_m13_condition;
                const lite$report259 = ((((((lite_m13_indent) + ("while ("))) + (lite_m13_condition))) + (") {"));
                lite$emit(lite$report259 + "\n");
                lite_m13_indent = ((lite_m13_indent) + ("    "));
            } else if ((((lite_m13_item).kind) === ("EndLoop"))) {
                lite_m13_indent = liteFn_m13_dedent(lite_m13_indent);
                const lite$report260 = ((lite_m13_indent) + ("}"));
                lite$emit(lite$report260 + "\n");
            } else if ((((((lite_m13_item).kind) === ("End"))) || ((((lite_m13_item).kind) === ("EndOutput"))))) {
                if (((lite_m13_count) === (0n))) {
                    lite_m13_line = liteFn_m10_textLiteralCode("");
                }
                const lite_m13_temporary = (("lite$report") + (liteFn_m4_intText(lite_m13_reportIndex)));
                void lite_m13_temporary;
                const lite$report261 = ((((((((((lite_m13_indent) + ("const "))) + (lite_m13_temporary))) + (" = "))) + (lite_m13_line))) + (";"));
                lite$emit(lite$report261 + "\n");
                const lite_m13_ending = (Boolean((((lite_m13_item).kind) === ("End"))) ? " + \"\\n\"" : "");
                void lite_m13_ending;
                const lite$report262 = ((((((((lite_m13_indent) + ("lite$emit("))) + (lite_m13_temporary))) + (lite_m13_ending))) + (");"));
                lite$emit(lite$report262 + "\n");
                lite_m13_reportIndex = lite$addInt(lite_m13_reportIndex, 1n, 31451);
                lite_m13_line = "";
                lite_m13_count = 0n;
            } else if ((((((((((lite_m13_item).kind) === ("Import"))) || ((((lite_m13_item).kind) === ("PublicFunction"))))) || ((((lite_m13_item).kind) === ("PublicValue"))))) || ((((lite_m13_item).kind) === ("PublicType"))))) {
            } else {
                if (((lite_m13_count) > (0n))) {
                    lite_m13_line = ((lite_m13_line) + (" + \" \" + "));
                }
                lite_m13_line = ((lite_m13_line) + (liteFn_m13_reportArgumentCode(lite_m13_item)));
                lite_m13_count = lite$addInt(lite_m13_count, 1n, 31789);
            }
        }
        const lite$report263 = "    return lite_out;";
        lite$emit(lite$report263 + "\n");
        const lite$report264 = "}";
        lite$emit(lite$report264 + "\n");
    }
    void liteFn_m13_emitProgram;
    function liteFn_m1_run(): void {
        const lite_m1_prefix = liteFn_m2_sourcePrefix();
        void lite_m1_prefix;
        const lite_m1_source = lite$inputAll(undefined, "compiler/src/driver-ts.lts:8:15: InputFault: ");
        void lite_m1_source;
        if (((lite_m1_prefix) !== (""))) {
            const lite_m1_graph: { kind: string; name: string; runtime: string; code: string; intValue: bigint; textValue: string }[] = [...(liteFn_m12_visitSourceModule("ts", lite_m1_prefix, lite_m1_source, [...([])]))];
            void lite_m1_graph;
            return (void (liteFn_m13_emitProgram([...(liteFn_m12_moduleItems([...(lite_m1_graph)]))], lite_m1_source, lite_m1_prefix)));
        } else {
            return (void (liteFn_m13_emitProgram([...(liteFn_m2_parseProgram("ts", lite_m1_source, lite_m1_prefix))], lite_m1_source, lite_m1_prefix)));
        }
    }
    void liteFn_m1_run;
    liteFn_m1_run();
    return lite_out;
}
