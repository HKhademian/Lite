let lite_out = "";

declare const process: {
    argv: string[];
    exit(code: number): never;
    getBuiltinModule(name: "node:fs"): {
        readSync(fd: number, buffer: Uint8Array, offset: number, length: number, position: null): number;
        writeSync(fd: number, text: string): number;
    };
};

let lite$sourceProvider: ((importer: string, spec: string) => { path: string; display: string; identity: string; text: string }) | undefined;
function lite$readSource(importer: string, spec: string): { path: string; display: string; identity: string; text: string } {
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

const lite$intLines: readonly number[] = [0, 36, 50];
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

export function main(lite$write?: (text: string) => void, lite$sourceProviderInput?: (importer: string, spec: string) => { path: string; display: string; identity: string; text: string }): string {
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
        if (((((lite_right) > (0n))) && (((lite_left) > (lite$subtractInt(liteFn_m4_intMax(), lite_right, 513)))))) {
            return { value: 0n, ok: false };
        }
        if (((((lite_right) < (0n))) && (((lite_left) < (lite$subtractInt(liteFn_m4_intMin(), lite_right, 594)))))) {
            return { value: 0n, ok: false };
        }
        return { value: lite$addInt(lite_left, lite_right, 656), ok: true };
    }
    void liteFn_m4_intAdd;
    function liteFn_m4_intSubtract(lite_left: bigint, lite_right: bigint): { value: bigint; ok: boolean } {
        void lite_left;
        void lite_right;
        if (((((lite_right) < (0n))) && (((lite_left) > (lite$addInt(liteFn_m4_intMax(), lite_right, 878)))))) {
            return { value: 0n, ok: false };
        }
        if (((((lite_right) > (0n))) && (((lite_left) < (lite$addInt(liteFn_m4_intMin(), lite_right, 959)))))) {
            return { value: 0n, ok: false };
        }
        return { value: lite$subtractInt(lite_left, lite_right, 1021), ok: true };
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
                if (((lite_left) > (lite$divideInt(liteFn_m4_intMax(), lite_right, 1347)))) {
                    return { value: 0n, ok: false };
                }
            } else if (((lite_right) < (lite$divideInt(liteFn_m4_intMin(), lite_left, 1426)))) {
                return { value: 0n, ok: false };
            }
        } else if (((lite_right) > (0n))) {
            if (((lite_left) < (lite$divideInt(liteFn_m4_intMin(), lite_right, 1542)))) {
                return { value: 0n, ok: false };
            }
        } else if (((lite_right) < (lite$divideInt(liteFn_m4_intMax(), lite_left, 1617)))) {
            return { value: 0n, ok: false };
        }
        return { value: lite$multiplyInt(lite_left, lite_right, 1690), ok: true };
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
        return { value: lite$divideInt(lite_left, lite_right, 2027), ok: true };
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
        return { value: lite$remainderInt(lite_left, lite_right, 2385), ok: true };
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
        const lite_m4_quotient = lite$divideInt(lite_left, lite_right, 2718);
        void lite_m4_quotient;
        return (Boolean(((((lite$remainderInt(lite_left, lite_right, 2739)) !== (0n))) && ((Boolean((((lite_left) < (0n)))) !== Boolean((((lite_right) < (0n)))))))) ? { value: lite$subtractInt(lite_m4_quotient, 1n, 2812), ok: true } : { value: lite_m4_quotient, ok: true });
    }
    void liteFn_m4_intFloorDivide;
    function liteFn_m4_intFloorModulo(lite_left: bigint, lite_right: bigint): { value: bigint; ok: boolean } {
        void lite_left;
        void lite_right;
        if (((lite_right) === (0n))) {
            return { value: 0n, ok: false };
        }
        const lite_m4_remainder = lite$remainderInt(lite_left, lite_right, 3105);
        void lite_m4_remainder;
        return (Boolean(((((lite_m4_remainder) !== (0n))) && ((Boolean((((lite_m4_remainder) < (0n)))) !== Boolean((((lite_right) < (0n)))))))) ? { value: lite$addInt(lite_m4_remainder, lite_right, 3202), ok: true } : { value: lite_m4_remainder, ok: true });
    }
    void liteFn_m4_intFloorModulo;
    function liteFn_m4_intNegate(lite_value: bigint): { value: bigint; ok: boolean } {
        void lite_value;
        if (((lite_value) === (liteFn_m4_intMin()))) {
            return { value: 0n, ok: false };
        }
        return { value: lite$subtractInt(0n, lite_value, 3486), ok: true };
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
            return (("-") + (liteFn_m4_intText(lite$subtractInt(0n, lite_value, 3739))));
        }
        let lite_m4_remaining = lite_value;
        void lite_m4_remaining;
        let lite_m4_digits = "";
        void lite_m4_digits;
        while (((lite_m4_remaining) > (0n))) {
            const lite_m4_digit = lite$remainderInt(lite_m4_remaining, 10n, 3853);
            void lite_m4_digit;
            lite_m4_digits = ((lite$textAt("0123456789", lite_m4_digit, 3876)) + (lite_m4_digits));
            lite_m4_remaining = lite$divideInt(lite_m4_remaining, 10n, 3949);
        }
        return lite_m4_digits;
    }
    void liteFn_m4_intText;
    function liteFn_m6_isDigit(lite_text: string): boolean {
        void lite_text;
        return ((((((((((((((((((((lite_text) === ("0"))) || (((lite_text) === ("1"))))) || (((lite_text) === ("2"))))) || (((lite_text) === ("3"))))) || (((lite_text) === ("4"))))) || (((lite_text) === ("5"))))) || (((lite_text) === ("6"))))) || (((lite_text) === ("7"))))) || (((lite_text) === ("8"))))) || (((lite_text) === ("9"))));
    }
    void liteFn_m6_isDigit;
    function liteFn_m6_digitValue(lite_text: string): bigint {
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
    void liteFn_m6_digitValue;
    function liteFn_m6_isAsciiLetter(lite_ch: string): boolean {
        void lite_ch;
        const lite_m6_letters = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
        void lite_m6_letters;
        const lite_m6_size = lite$textLength(lite_m6_letters);
        void lite_m6_size;
        let lite_m6_position = 0n;
        void lite_m6_position;
        while (((lite_m6_position) < (lite_m6_size))) {
            if (((lite$textAt(lite_m6_letters, lite_m6_position, 1071)) === (lite_ch))) {
                return true;
            }
            lite_m6_position = lite$addInt(lite_m6_position, 1n, 1149);
        }
        return false;
    }
    void liteFn_m6_isAsciiLetter;
    function liteFn_m6_isNameStart(lite_ch: string): boolean {
        void lite_ch;
        return ((liteFn_m6_isAsciiLetter(lite_ch)) || (((lite_ch) === ("_"))));
    }
    void liteFn_m6_isNameStart;
    function liteFn_m6_isNameContinue(lite_ch: string): boolean {
        void lite_ch;
        return ((liteFn_m6_isNameStart(lite_ch)) || (liteFn_m6_isDigit(lite_ch)));
    }
    void liteFn_m6_isNameContinue;
    function liteFn_m6_skipSpaces(lite_source: string, lite_start: bigint): bigint {
        void lite_source;
        void lite_start;
        const lite_m6_size = lite$textLength(lite_source);
        void lite_m6_size;
        let lite_m6_position = lite_start;
        void lite_m6_position;
        while (((((lite_m6_position) < (lite_m6_size))) && ((((((((((lite$textAt(lite_source, lite_m6_position, 1708)) === (" "))) || (((lite$textAt(lite_source, lite_m6_position, 1744)) === ("\t"))))) || (((lite$textAt(lite_source, lite_m6_position, 1781)) === ("\r"))))) || (((lite$textAt(lite_source, lite_m6_position, 1818)) === ("\n")))))))) {
            lite_m6_position = lite$addInt(lite_m6_position, 1n, 1883);
        }
        return lite_m6_position;
    }
    void liteFn_m6_skipSpaces;
    function liteFn_m6_skipName(lite_source: string, lite_start: bigint): bigint {
        void lite_source;
        void lite_start;
        const lite_m6_size = lite$textLength(lite_source);
        void lite_m6_size;
        let lite_m6_position = lite_start;
        void lite_m6_position;
        while (((((lite_m6_position) < (lite_m6_size))) && (liteFn_m6_isNameContinue(lite$textAt(lite_source, lite_m6_position, 2142))))) {
            lite_m6_position = lite$addInt(lite_m6_position, 1n, 2199);
        }
        return lite_m6_position;
    }
    void liteFn_m6_skipName;
    function liteFn_m6_startsWithAt(lite_source: string, lite_position: bigint, lite_text: string): boolean {
        void lite_source;
        void lite_position;
        void lite_text;
        const lite_m6_width = lite$textLength(lite_text);
        void lite_m6_width;
        if (((((lite_position) < (0n))) || (((lite$addInt(lite_position, lite_m6_width, 2438)) > (lite$textLength(lite_source)))))) {
            return false;
        }
        return ((lite$textSlice(lite_source, lite_position, lite$addInt(lite_position, lite_m6_width, 2528), 2490)) === (lite_text));
    }
    void liteFn_m6_startsWithAt;
    function liteFn_m6_wordAt(lite_source: string, lite_position: bigint, lite_word: string): boolean {
        void lite_source;
        void lite_position;
        void lite_word;
        if ((!(liteFn_m6_startsWithAt(lite_source, lite_position, lite_word)))) {
            return false;
        }
        const lite_m6_after = lite$addInt(lite_position, lite$textLength(lite_word), 2825);
        void lite_m6_after;
        return ((((lite_m6_after) >= (lite$textLength(lite_source)))) || ((!(liteFn_m6_isNameContinue(lite$textAt(lite_source, lite_m6_after, 2901))))));
    }
    void liteFn_m6_wordAt;
    function liteFn_m6_indexOfText(lite_source: string, lite_needle: string, lite_start: bigint): bigint {
        void lite_source;
        void lite_needle;
        void lite_start;
        const lite_m6_size = lite$textLength(lite_source);
        void lite_m6_size;
        const lite_m6_width = lite$textLength(lite_needle);
        void lite_m6_width;
        let lite_m6_position = lite_start;
        void lite_m6_position;
        if (((((lite_m6_position) < (0n))) || (((lite_m6_position) > (lite_m6_size))))) {
            return (-1n);
        }
        if (((lite_m6_width) === (0n))) {
            return lite_m6_position;
        }
        while (((lite$addInt(lite_m6_position, lite_m6_width, 3299)) <= (lite_m6_size))) {
            if (liteFn_m6_startsWithAt(lite_source, lite_m6_position, lite_needle)) {
                return lite_m6_position;
            }
            lite_m6_position = lite$addInt(lite_m6_position, 1n, 3416);
        }
        return (-1n);
    }
    void liteFn_m6_indexOfText;
    function liteFn_m6_joinTexts(lite_values: string[], lite_separator: string): string {
        void lite_values;
        void lite_separator;
        let lite_m6_result = "";
        void lite_m6_result;
        let lite_m6_first = true;
        void lite_m6_first;
        for (const lite_m6_value of [...(lite_values)]) {
            void lite_m6_value;
            if (lite_m6_first) {
                lite_m6_result = lite_m6_value;
                lite_m6_first = false;
            } else {
                lite_m6_result = ((((lite_m6_result) + (lite_separator))) + (lite_m6_value));
            }
        }
        return lite_m6_result;
    }
    void liteFn_m6_joinTexts;
    function liteFn_m6_textToInt(lite_text: string): { value: bigint; ok: boolean } {
        void lite_text;
        const lite_m6_size = lite$textLength(lite_text);
        void lite_m6_size;
        if (((lite_m6_size) === (0n))) {
            return { value: 0n, ok: false };
        }
        let lite_m6_position = 0n;
        void lite_m6_position;
        let lite_m6_negative = false;
        void lite_m6_negative;
        if (((lite$textAt(lite_text, 0n, 4137)) === ("-"))) {
            lite_m6_negative = true;
            lite_m6_position = 1n;
        } else if (((lite$textAt(lite_text, 0n, 4224)) === ("+"))) {
            lite_m6_position = 1n;
        }
        if (((lite_m6_position) >= (lite_m6_size))) {
            return { value: 0n, ok: false };
        }
        let lite_m6_value = 0n;
        void lite_m6_value;
        while (((lite_m6_position) < (lite_m6_size))) {
            const lite_m6_ch = lite$textAt(lite_text, lite_m6_position, 4399);
            void lite_m6_ch;
            if ((!(liteFn_m6_isDigit(lite_m6_ch)))) {
                return { value: 0n, ok: false };
            }
            const lite_m6_digit = liteFn_m6_digitValue(lite_m6_ch);
            void lite_m6_digit;
            if (lite_m6_negative) {
                if (((lite_m6_value) < (lite$divideInt((lite$addInt(liteFn_m4_intMin(), lite_m6_digit, 4583)), 10n, 4592)))) {
                    return { value: 0n, ok: false };
                }
                lite_m6_value = lite$subtractInt(lite$multiplyInt(lite_m6_value, 10n, 4659), lite_m6_digit, 4664);
            } else {
                if (((lite_m6_value) > (lite$divideInt((lite$subtractInt(liteFn_m4_intMax(), lite_m6_digit, 4731)), 10n, 4740)))) {
                    return { value: 0n, ok: false };
                }
                lite_m6_value = lite$addInt(lite$multiplyInt(lite_m6_value, 10n, 4807), lite_m6_digit, 4812);
            }
            lite_m6_position = lite$addInt(lite_m6_position, 1n, 4859);
        }
        return { value: lite_m6_value, ok: true };
    }
    void liteFn_m6_textToInt;
    function liteFn_m6_length(lite_text: string): bigint {
        void lite_text;
        return lite$textLength(lite_text);
    }
    void liteFn_m6_length;
    function liteFn_m6_at(lite_text: string, lite_position: bigint): string {
        void lite_text;
        void lite_position;
        return lite$textAt(lite_text, lite_position, 5158);
    }
    void liteFn_m6_at;
    function liteFn_m6_slice(lite_text: string, lite_start: bigint, lite_end: bigint): string {
        void lite_text;
        void lite_start;
        void lite_end;
        return lite$textSlice(lite_text, lite_start, lite_end, 5343);
    }
    void liteFn_m6_slice;
    function liteFn_m3_decimalText(lite_value: bigint): string {
        void lite_value;
        return liteFn_m4_intText(lite_value);
    }
    void liteFn_m3_decimalText;
    function liteFn_m3_padLeftText(lite_value: string, lite_width: bigint): string {
        void lite_value;
        void lite_width;
        const lite_m3_size = liteFn_m6_length(lite_value);
        void lite_m3_size;
        let lite_m3_result = lite_value;
        void lite_m3_result;
        let lite_m3_index = lite_m3_size;
        void lite_m3_index;
        while (((lite_m3_index) < (lite_width))) {
            lite_m3_result = ((" ") + (lite_m3_result));
            lite_m3_index = lite$addInt(lite_m3_index, 1n, 556);
        }
        return lite_m3_result;
    }
    void liteFn_m3_padLeftText;
    function liteFn_m3_padRightText(lite_value: string, lite_width: bigint): string {
        void lite_value;
        void lite_width;
        const lite_m3_size = liteFn_m6_length(lite_value);
        void lite_m3_size;
        let lite_m3_result = lite_value;
        void lite_m3_result;
        let lite_m3_index = lite_m3_size;
        void lite_m3_index;
        while (((lite_m3_index) < (lite_width))) {
            lite_m3_result = ((lite_m3_result) + (" "));
            lite_m3_index = lite$addInt(lite_m3_index, 1n, 869);
        }
        return lite_m3_result;
    }
    void liteFn_m3_padRightText;
    function liteFn_m3_padLeftInt(lite_value: bigint, lite_width: bigint): string {
        void lite_value;
        void lite_width;
        return liteFn_m3_padLeftText(liteFn_m4_intText(lite_value), lite_width);
    }
    void liteFn_m3_padLeftInt;
    function liteFn_m3_padRightInt(lite_value: bigint, lite_width: bigint): string {
        void lite_value;
        void lite_width;
        return liteFn_m3_padRightText(liteFn_m4_intText(lite_value), lite_width);
    }
    void liteFn_m3_padRightInt;
    function liteFn_m3_joinIntTexts(lite_values: bigint[], lite_separator: string): string {
        void lite_values;
        void lite_separator;
        let lite_m3_result = "";
        void lite_m3_result;
        let lite_m3_first = true;
        void lite_m3_first;
        for (const lite_m3_value of [...(lite_values)]) {
            void lite_m3_value;
            if (lite_m3_first) {
                lite_m3_result = liteFn_m4_intText(lite_m3_value);
                lite_m3_first = false;
            } else {
                lite_m3_result = ((((lite_m3_result) + (lite_separator))) + (liteFn_m4_intText(lite_m3_value)));
            }
        }
        return lite_m3_result;
    }
    void liteFn_m3_joinIntTexts;
    function liteFn_m7_listIndexOfText(lite_values: string[], lite_target: string): bigint {
        void lite_values;
        void lite_target;
        let lite_m7_index = 0n;
        void lite_m7_index;
        for (const lite_m7_value of [...(lite_values)]) {
            void lite_m7_value;
            if (((lite_m7_value) === (lite_target))) {
                return lite_m7_index;
            }
            lite_m7_index = lite$addInt(lite_m7_index, 1n, 632);
        }
        return (-1n);
    }
    void liteFn_m7_listIndexOfText;
    function liteFn_m7_listContainsText(lite_values: string[], lite_target: string): boolean {
        void lite_values;
        void lite_target;
        return ((liteFn_m7_listIndexOfText([...(lite_values)], lite_target)) >= (0n));
    }
    void liteFn_m7_listContainsText;
    function liteFn_m7_listIndexOfInt(lite_values: bigint[], lite_target: bigint): bigint {
        void lite_values;
        void lite_target;
        let lite_m7_index = 0n;
        void lite_m7_index;
        for (const lite_m7_value of [...(lite_values)]) {
            void lite_m7_value;
            if (((lite_m7_value) === (lite_target))) {
                return lite_m7_index;
            }
            lite_m7_index = lite$addInt(lite_m7_index, 1n, 1062);
        }
        return (-1n);
    }
    void liteFn_m7_listIndexOfInt;
    function liteFn_m7_listContainsInt(lite_values: bigint[], lite_target: bigint): boolean {
        void lite_values;
        void lite_target;
        return ((liteFn_m7_listIndexOfInt([...(lite_values)], lite_target)) >= (0n));
    }
    void liteFn_m7_listContainsInt;
    function liteFn_m7_listIndexOfBool(lite_values: boolean[], lite_target: boolean): bigint {
        void lite_values;
        void lite_target;
        let lite_m7_index = 0n;
        void lite_m7_index;
        for (const lite_m7_value of [...(lite_values)]) {
            void lite_m7_value;
            if ((Boolean(lite_m7_value) === Boolean(lite_target))) {
                return lite_m7_index;
            }
            lite_m7_index = lite$addInt(lite_m7_index, 1n, 1487);
        }
        return (-1n);
    }
    void liteFn_m7_listIndexOfBool;
    function liteFn_m7_listContainsBool(lite_values: boolean[], lite_target: boolean): boolean {
        void lite_values;
        void lite_target;
        return ((liteFn_m7_listIndexOfBool([...(lite_values)], lite_target)) >= (0n));
    }
    void liteFn_m7_listContainsBool;
    function liteFn_m8_clampPosition(lite_source: string, lite_position: bigint): bigint {
        void lite_source;
        void lite_position;
        const lite_m8_size = liteFn_m6_length(lite_source);
        void lite_m8_size;
        if (((lite_position) < (0n))) {
            return 0n;
        }
        if (((lite_position) > (lite_m8_size))) {
            return lite_m8_size;
        }
        return lite_position;
    }
    void liteFn_m8_clampPosition;
    function liteFn_m8_lineColumn(lite_source: string, lite_position: bigint): { line: bigint; column: bigint } {
        void lite_source;
        void lite_position;
        const lite_m8_cursor = liteFn_m8_clampPosition(lite_source, lite_position);
        void lite_m8_cursor;
        let lite_m8_line = 1n;
        void lite_m8_line;
        let lite_m8_lineStart = 0n;
        void lite_m8_lineStart;
        let lite_m8_index = 0n;
        void lite_m8_index;
        while (((lite_m8_index) < (lite_m8_cursor))) {
            if (((liteFn_m6_at(lite_source, lite_m8_index)) === ("\n"))) {
                lite_m8_line = lite$addInt(lite_m8_line, 1n, 738);
                lite_m8_lineStart = lite$addInt(lite_m8_index, 1n, 773);
            }
            lite_m8_index = lite$addInt(lite_m8_index, 1n, 810);
        }
        return { line: lite_m8_line, column: lite$addInt(lite$subtractInt(lite_m8_cursor, lite_m8_lineStart, 855), 1n, 867) };
    }
    void liteFn_m8_lineColumn;
    function liteFn_m8_lineCount(lite_source: string): bigint {
        void lite_source;
        const lite_m8_size = liteFn_m6_length(lite_source);
        void lite_m8_size;
        let lite_m8_count = 1n;
        void lite_m8_count;
        let lite_m8_index = 0n;
        void lite_m8_index;
        while (((lite_m8_index) < (lite_m8_size))) {
            if (((liteFn_m6_at(lite_source, lite_m8_index)) === ("\n"))) {
                lite_m8_count = lite$addInt(lite_m8_count, 1n, 1143);
            }
            lite_m8_index = lite$addInt(lite_m8_index, 1n, 1172);
        }
        return lite_m8_count;
    }
    void liteFn_m8_lineCount;
    function liteFn_m8_lineStartOffset(lite_source: string, lite_line: bigint): bigint {
        void lite_source;
        void lite_line;
        const lite_m8_size = liteFn_m6_length(lite_source);
        void lite_m8_size;
        if (((lite_line) <= (1n))) {
            return 0n;
        }
        let lite_m8_current = 2n;
        void lite_m8_current;
        let lite_m8_index = 0n;
        void lite_m8_index;
        while (((lite_m8_index) < (lite_m8_size))) {
            if (((liteFn_m6_at(lite_source, lite_m8_index)) === ("\n"))) {
                if (((lite_m8_current) === (lite_line))) {
                    return lite$addInt(lite_m8_index, 1n, 1562);
                }
                lite_m8_current = lite$addInt(lite_m8_current, 1n, 1599);
            }
            lite_m8_index = lite$addInt(lite_m8_index, 1n, 1636);
        }
        return lite_m8_size;
    }
    void liteFn_m8_lineStartOffset;
    function liteFn_m8_lineEndOffset(lite_source: string, lite_line: bigint): bigint {
        void lite_source;
        void lite_line;
        const lite_m8_size = liteFn_m6_length(lite_source);
        void lite_m8_size;
        const lite_m8_start = liteFn_m8_lineStartOffset(lite_source, lite_line);
        void lite_m8_start;
        let lite_m8_index = lite_m8_start;
        void lite_m8_index;
        while (((((lite_m8_index) < (lite_m8_size))) && (((liteFn_m6_at(lite_source, lite_m8_index)) !== ("\n"))))) {
            lite_m8_index = lite$addInt(lite_m8_index, 1n, 1967);
        }
        return lite_m8_index;
    }
    void liteFn_m8_lineEndOffset;
    function liteFn_m9_diagnosticExit(): bigint {
        return 2n;
    }
    void liteFn_m9_diagnosticExit;
    const lite_m9_sourceErrorCategory = "SourceError";
    void lite_m9_sourceErrorCategory;
    const lite_m9_typeErrorCategory = "TypeError";
    void lite_m9_typeErrorCategory;
    function liteFn_m9_fail(lite_prefix: string, lite_message: string): void {
        void lite_prefix;
        void lite_message;
        if (((lite_prefix) === (""))) {
            lite$reportError(lite_message);
        } else {
            lite$reportError(((((lite_prefix) + (":"))) + (lite_message)));
        }
        return (void (lite$exit(liteFn_m9_diagnosticExit())));
    }
    void liteFn_m9_fail;
    function liteFn_m9_expect(lite_prefix: string, lite_condition: boolean, lite_message: string): void {
        void lite_prefix;
        void lite_condition;
        void lite_message;
        if ((!(lite_condition))) {
            return (void (liteFn_m9_fail(lite_prefix, lite_message)));
        } else {
        }
    }
    void liteFn_m9_expect;
    function liteFn_m11_numericAliasKind(lite_name: string): string {
        void lite_name;
        return (Boolean(((lite_name) === ("Int64"))) ? "Int" : (Boolean(((((lite_name) === ("Float64"))) || (((lite_name) === ("Double"))))) ? "Float" : ""));
    }
    void liteFn_m11_numericAliasKind;
    function liteFn_m11_intExactlyFloat(lite_input: bigint): boolean {
        void lite_input;
        let lite_m11_value = lite_input;
        void lite_m11_value;
        while (((((lite_m11_value) > (9007199254740992n))) || (((lite_m11_value) < ((-9007199254740992n)))))) {
            if (((lite$remainderInt(lite_m11_value, 2n, 659)) !== (0n))) {
                return false;
            }
            lite_m11_value = lite$divideInt(lite_m11_value, 2n, 709);
        }
        return true;
    }
    void liteFn_m11_intExactlyFloat;
    function liteFn_m11_finiteFloatDigits(lite_digits: string, lite_fractionCount: bigint, lite_exponent: bigint): boolean {
        void lite_digits;
        void lite_fractionCount;
        void lite_exponent;
        let lite_m11_first = 0n;
        void lite_m11_first;
        while (((((lite_m11_first) < (liteFn_m6_length(lite_digits)))) && (((liteFn_m6_at(lite_digits, lite_m11_first)) === ("0"))))) {
            lite_m11_first = lite$addInt(lite_m11_first, 1n, 1130);
        }
        if (((lite_m11_first) === (liteFn_m6_length(lite_digits)))) {
            return true;
        }
        const lite_m11_significant = liteFn_m6_slice(lite_digits, lite_m11_first, liteFn_m6_length(lite_digits));
        void lite_m11_significant;
        const lite_m11_power = lite$addInt(lite$subtractInt(liteFn_m6_length(lite_m11_significant), lite_fractionCount, 1307), lite_exponent, 1323);
        void lite_m11_power;
        if (((lite_m11_power) < (309n))) {
            return true;
        }
        if (((lite_m11_power) > (309n))) {
            return false;
        }
        const lite_m11_midpoint = "179769313486231580793728971405303415079934132710037826936173778980444968292764750946649017977587207096330286416692887910946555547851940402630657488671505820681908902000708383676273854845817711531764475730270069855571366959622842914819860834936475292719074168444365510704342711559699508093042880177904174497792";
        void lite_m11_midpoint;
        let lite_m11_count = liteFn_m6_length(lite_m11_significant);
        void lite_m11_count;
        if (((lite_m11_count) < (liteFn_m6_length(lite_m11_midpoint)))) {
            lite_m11_count = liteFn_m6_length(lite_m11_midpoint);
        }
        let lite_m11_index = 0n;
        void lite_m11_index;
        while (((lite_m11_index) < (lite_m11_count))) {
            const lite_m11_left = (Boolean(((lite_m11_index) < (liteFn_m6_length(lite_m11_significant)))) ? liteFn_m6_digitValue(liteFn_m6_at(lite_m11_significant, lite_m11_index)) : 0n);
            void lite_m11_left;
            const lite_m11_right = (Boolean(((lite_m11_index) < (liteFn_m6_length(lite_m11_midpoint)))) ? liteFn_m6_digitValue(liteFn_m6_at(lite_m11_midpoint, lite_m11_index)) : 0n);
            void lite_m11_right;
            if (((lite_m11_left) < (lite_m11_right))) {
                return true;
            }
            if (((lite_m11_left) > (lite_m11_right))) {
                return false;
            }
            lite_m11_index = lite$addInt(lite_m11_index, 1n, 2250);
        }
        return false;
    }
    void liteFn_m11_finiteFloatDigits;
    function liteFn_m11_scanNumericLiteral(lite_source: string, lite_position: bigint): { next: bigint; integerEnd: bigint; fractionStart: bigint; fractionEnd: bigint; exponent: bigint; floating: boolean; exponentMissingAt: bigint; magnitude: bigint; outsideInt: boolean } {
        void lite_source;
        void lite_position;
        const lite_m11_size = liteFn_m6_length(lite_source);
        void lite_m11_size;
        let lite_m11_cursor = lite_position;
        void lite_m11_cursor;
        let lite_m11_magnitude = 0n;
        void lite_m11_magnitude;
        let lite_m11_outsideInt = false;
        void lite_m11_outsideInt;
        while (((((lite_m11_cursor) < (lite_m11_size))) && (liteFn_m6_isDigit(liteFn_m6_at(lite_source, lite_m11_cursor))))) {
            const lite_m11_digit = liteFn_m6_digitValue(liteFn_m6_at(lite_source, lite_m11_cursor));
            void lite_m11_digit;
            if ((!(lite_m11_outsideInt))) {
                if (((lite_m11_magnitude) < (lite$divideInt((lite$addInt((-9223372036854775808n), lite_m11_digit, 3061)), 10n, 3070)))) {
                    lite_m11_outsideInt = true;
                } else {
                    lite_m11_magnitude = lite$subtractInt(lite$multiplyInt(lite_m11_magnitude, 10n, 3139), lite_m11_digit, 3144);
                }
            }
            lite_m11_cursor = lite$addInt(lite_m11_cursor, 1n, 3189);
        }
        const lite_m11_integerEnd = lite_m11_cursor;
        void lite_m11_integerEnd;
        let lite_m11_fractionStart = lite_m11_cursor;
        void lite_m11_fractionStart;
        let lite_m11_fractionEnd = lite_m11_cursor;
        void lite_m11_fractionEnd;
        let lite_m11_floating = false;
        void lite_m11_floating;
        if (((((((lite$addInt(lite_m11_cursor, 1n, 3331)) < (lite_m11_size))) && (((liteFn_m6_at(lite_source, lite_m11_cursor)) === ("."))))) && (liteFn_m6_isDigit(liteFn_m6_at(lite_source, lite$addInt(lite_m11_cursor, 1n, 3426)))))) {
            lite_m11_floating = true;
            lite_m11_cursor = lite$addInt(lite_m11_cursor, 1n, 3483);
            lite_m11_fractionStart = lite_m11_cursor;
            while (((((lite_m11_cursor) < (lite_m11_size))) && (liteFn_m6_isDigit(liteFn_m6_at(lite_source, lite_m11_cursor))))) {
                lite_m11_cursor = lite$addInt(lite_m11_cursor, 1n, 3613);
            }
            lite_m11_fractionEnd = lite_m11_cursor;
        }
        let lite_m11_exponent = 0n;
        void lite_m11_exponent;
        let lite_m11_exponentMissingAt = (-1n);
        void lite_m11_exponentMissingAt;
        if (((((lite_m11_cursor) < (lite_m11_size))) && ((((((liteFn_m6_at(lite_source, lite_m11_cursor)) === ("e"))) || (((liteFn_m6_at(lite_source, lite_m11_cursor)) === ("E")))))))) {
            lite_m11_floating = true;
            const lite_m11_exponentAt = lite_m11_cursor;
            void lite_m11_exponentAt;
            lite_m11_cursor = lite$addInt(lite_m11_cursor, 1n, 3891);
            let lite_m11_negativeExponent = false;
            void lite_m11_negativeExponent;
            if (((((lite_m11_cursor) < (lite_m11_size))) && ((((((liteFn_m6_at(lite_source, lite_m11_cursor)) === ("+"))) || (((liteFn_m6_at(lite_source, lite_m11_cursor)) === ("-")))))))) {
                lite_m11_negativeExponent = ((liteFn_m6_at(lite_source, lite_m11_cursor)) === ("-"));
                lite_m11_cursor = lite$addInt(lite_m11_cursor, 1n, 4133);
            }
            const lite_m11_exponentStart = lite_m11_cursor;
            void lite_m11_exponentStart;
            const lite_m11_limit = lite$addInt(lite_m11_size, 310n, 4203);
            void lite_m11_limit;
            while (((((lite_m11_cursor) < (lite_m11_size))) && (liteFn_m6_isDigit(liteFn_m6_at(lite_source, lite_m11_cursor))))) {
                const lite_m11_digit = liteFn_m6_digitValue(liteFn_m6_at(lite_source, lite_m11_cursor));
                void lite_m11_digit;
                if (((lite_m11_exponent) > (lite$divideInt((lite$subtractInt(lite_m11_limit, lite_m11_digit, 4389)), 10n, 4398)))) {
                    lite_m11_exponent = lite_m11_limit;
                } else {
                    lite_m11_exponent = lite$addInt(lite$multiplyInt(lite_m11_exponent, 10n, 4464), lite_m11_digit, 4469);
                }
                lite_m11_cursor = lite$addInt(lite_m11_cursor, 1n, 4508);
            }
            if (((lite_m11_cursor) === (lite_m11_exponentStart))) {
                lite_m11_exponentMissingAt = lite_m11_exponentAt;
            }
            if (lite_m11_negativeExponent) {
                lite_m11_exponent = lite$negateInt(lite_m11_exponent, 4635);
            }
        }
        return { next: lite_m11_cursor, integerEnd: lite_m11_integerEnd, fractionStart: lite_m11_fractionStart, fractionEnd: lite_m11_fractionEnd, exponent: lite_m11_exponent, floating: lite_m11_floating, exponentMissingAt: lite_m11_exponentMissingAt, magnitude: lite_m11_magnitude, outsideInt: lite_m11_outsideInt };
    }
    void liteFn_m11_scanNumericLiteral;
    function liteFn_m12_tsScalarType(lite_kind: string): string {
        void lite_kind;
        return (Boolean(((lite_kind) === ("Int"))) ? "bigint" : (Boolean(((lite_kind) === ("String"))) ? "string" : (Boolean(((lite_kind) === ("Float"))) ? "number" : (Boolean(((lite_kind) === ("Bool"))) ? "boolean" : "void"))));
    }
    void liteFn_m12_tsScalarType;
    function liteFn_m12_intLiteralCode(lite_value: bigint, lite_negative: boolean, lite_digits: string): string {
        void lite_value;
        void lite_negative;
        void lite_digits;
        return (Boolean(((lite_value) === (0n))) ? "0n" : (Boolean(lite_negative) ? (((("(-") + (lite_digits))) + ("n)")) : ((lite_digits) + ("n"))));
    }
    void liteFn_m12_intLiteralCode;
    function liteFn_m12_textLiteralCode(lite_value: string): string {
        void lite_value;
        const lite_m12_size = liteFn_m6_length(lite_value);
        void lite_m12_size;
        let lite_m12_encoded = "\"";
        void lite_m12_encoded;
        let lite_m12_position = 0n;
        void lite_m12_position;
        while (((lite_m12_position) < (lite_m12_size))) {
            const lite_m12_ch = liteFn_m6_at(lite_value, lite_m12_position);
            void lite_m12_ch;
            if (((lite_m12_ch) === ("\\"))) {
                lite_m12_encoded = ((lite_m12_encoded) + ("\\\\"));
            } else if (((lite_m12_ch) === ("\""))) {
                lite_m12_encoded = ((lite_m12_encoded) + ("\\\""));
            } else if (((lite_m12_ch) === ("\n"))) {
                lite_m12_encoded = ((lite_m12_encoded) + ("\\n"));
            } else if (((lite_m12_ch) === ("\r"))) {
                lite_m12_encoded = ((lite_m12_encoded) + ("\\r"));
            } else if (((lite_m12_ch) === ("\t"))) {
                lite_m12_encoded = ((lite_m12_encoded) + ("\\t"));
            } else {
                lite_m12_encoded = ((lite_m12_encoded) + (lite_m12_ch));
            }
            lite_m12_position = lite$addInt(lite_m12_position, 1n, 1295);
        }
        return ((lite_m12_encoded) + ("\""));
    }
    void liteFn_m12_textLiteralCode;
    function liteFn_m12_floatLiteralCode(lite_digits: string, lite_negative: boolean): string {
        void lite_digits;
        void lite_negative;
        const lite_m12_parsed = (((("Number(") + (liteFn_m12_textLiteralCode(lite_digits)))) + (")"));
        void lite_m12_parsed;
        return (Boolean(lite_negative) ? (((("(-") + (lite_m12_parsed))) + (")")) : lite_m12_parsed);
    }
    void liteFn_m12_floatLiteralCode;
    function liteFn_m12_unitEvaluationCode(lite_code: string): string {
        void lite_code;
        return (((("(void (") + (lite_code))) + ("))"));
    }
    void liteFn_m12_unitEvaluationCode;
    function liteFn_m12_unitLiteralCode(): string {
        return "undefined";
    }
    void liteFn_m12_unitLiteralCode;
    function liteFn_m12_boolLiteralCode(lite_value: boolean): string {
        void lite_value;
        return (Boolean(lite_value) ? "true" : "false");
    }
    void liteFn_m12_boolLiteralCode;
    function liteFn_m12_listCopyCode(lite_code: string): string {
        void lite_code;
        return (((("[...(") + (lite_code))) + (")]"));
    }
    void liteFn_m12_listCopyCode;
    function liteFn_m12_concatCode(lite_left: string, lite_right: string): string {
        void lite_left;
        void lite_right;
        return (((((((("((") + (lite_left))) + (") + ("))) + (lite_right))) + ("))"));
    }
    void liteFn_m12_concatCode;
    function liteFn_m12_notCode(lite_value: string): string {
        void lite_value;
        return (((("(!(") + (lite_value))) + ("))"));
    }
    void liteFn_m12_notCode;
    function liteFn_m12_logicCode(lite_op: string, lite_left: string, lite_right: string): string {
        void lite_op;
        void lite_left;
        void lite_right;
        return (Boolean(((lite_op) === ("and"))) ? (((((((("((") + (lite_left))) + (") && ("))) + (lite_right))) + ("))")) : (((((((("((") + (lite_left))) + (") || ("))) + (lite_right))) + ("))")));
    }
    void liteFn_m12_logicCode;
    function liteFn_m12_comparisonCode(lite_op: string, lite_kind: string, lite_left: string, lite_right: string): string {
        void lite_op;
        void lite_kind;
        void lite_left;
        void lite_right;
        const lite_m12_operator = (Boolean(((lite_op) === ("=="))) ? "===" : (Boolean(((lite_op) === ("=!="))) ? "!==" : (Boolean(((lite_op) === ("<"))) ? "<" : (Boolean(((lite_op) === ("<!"))) ? ">=" : (Boolean(((lite_op) === ("<="))) ? "<=" : (Boolean(((lite_op) === ("<!="))) ? ">" : (Boolean(((lite_op) === (">"))) ? ">" : (Boolean(((lite_op) === (">!"))) ? "<=" : (Boolean(((lite_op) === (">="))) ? ">=" : "<")))))))));
        void lite_m12_operator;
        return (Boolean(((lite_kind) === ("Bool"))) ? (((((((((((("(Boolean(") + (lite_left))) + (") "))) + (lite_m12_operator))) + (" Boolean("))) + (lite_right))) + ("))")) : (((((((((((("((") + (lite_left))) + (") "))) + (lite_m12_operator))) + (" ("))) + (lite_right))) + ("))")));
    }
    void liteFn_m12_comparisonCode;
    function liteFn_m12_floatOperandCode(lite_kind: string, lite_code: string): string {
        void lite_kind;
        void lite_code;
        return (Boolean(((lite_kind) === ("Int"))) ? (((("Number(") + (lite_code))) + (")")) : lite_code);
    }
    void liteFn_m12_floatOperandCode;
    function liteFn_m12_comparisonPairCode(lite_op: string, lite_leftKind: string, lite_rightKind: string, lite_left: string, lite_right: string): string {
        void lite_op;
        void lite_leftKind;
        void lite_rightKind;
        void lite_left;
        void lite_right;
        return (Boolean(((((lite_leftKind) !== (lite_rightKind))) && ((((((lite_leftKind) === ("Float"))) || (((lite_rightKind) === ("Float")))))))) ? liteFn_m12_comparisonCode(lite_op, "Float", liteFn_m12_floatOperandCode(lite_leftKind, lite_left), liteFn_m12_floatOperandCode(lite_rightKind, lite_right)) : liteFn_m12_comparisonCode(lite_op, lite_leftKind, lite_left, lite_right));
    }
    void liteFn_m12_comparisonPairCode;
    function liteFn_m12_floatBinaryCode(lite_op: string, lite_left: string, lite_right: string, lite_position: bigint): string {
        void lite_op;
        void lite_left;
        void lite_right;
        void lite_position;
        const lite_m12_tag = (Boolean(((lite_op) === ("+"))) ? "0" : (Boolean(((lite_op) === ("-"))) ? "1" : (Boolean(((lite_op) === ("*"))) ? "2" : "3")));
        void lite_m12_tag;
        return (((((((((((((((("lite$floatOp(") + (lite_left))) + (", "))) + (lite_right))) + (", "))) + (lite_m12_tag))) + (", "))) + (liteFn_m4_intText(lite_position)))) + (")"));
    }
    void liteFn_m12_floatBinaryCode;
    function liteFn_m12_floatPowerCode(lite_left: string, lite_right: string, lite_position: bigint): string {
        void lite_left;
        void lite_right;
        void lite_position;
        return (((((((((((("lite$floatPower(") + (lite_left))) + (", "))) + (lite_right))) + (", "))) + (liteFn_m4_intText(lite_position)))) + (")"));
    }
    void liteFn_m12_floatPowerCode;
    function liteFn_m12_floorDivCode(lite_left: string, lite_right: string): string {
        void lite_left;
        void lite_right;
        return (((((((((((((((((((((((((((("(") + (lite_left))) + (" / "))) + (lite_right))) + (" - (((("))) + (lite_left))) + (" % "))) + (lite_right))) + (") != 0n) && ((("))) + (lite_left))) + (" % "))) + (lite_right))) + (") < 0n) != ("))) + (lite_right))) + (" < 0n))) ? 1n : 0n))"));
    }
    void liteFn_m12_floorDivCode;
    function liteFn_m12_floorModCode(lite_left: string, lite_right: string): string {
        void lite_left;
        void lite_right;
        return (((((((((((((((((((((((((((((((("(") + (lite_left))) + (" % "))) + (lite_right))) + (" + (((("))) + (lite_left))) + (" % "))) + (lite_right))) + (") != 0n) && ((("))) + (lite_left))) + (" % "))) + (lite_right))) + (") < 0n) != ("))) + (lite_right))) + (" < 0n))) ? "))) + (lite_right))) + (" : 0n))"));
    }
    void liteFn_m12_floorModCode;
    function liteFn_m12_intDivideCode(lite_left: string, lite_right: string, lite_position: bigint): string {
        void lite_left;
        void lite_right;
        void lite_position;
        return (((((((((((("lite$divideInt(") + (lite_left))) + (", "))) + (lite_right))) + (", "))) + (liteFn_m4_intText(lite_position)))) + (")"));
    }
    void liteFn_m12_intDivideCode;
    function liteFn_m12_intRemainderCode(lite_left: string, lite_right: string, lite_position: bigint): string {
        void lite_left;
        void lite_right;
        void lite_position;
        return (((((((((((("lite$remainderInt(") + (lite_left))) + (", "))) + (lite_right))) + (", "))) + (liteFn_m4_intText(lite_position)))) + (")"));
    }
    void liteFn_m12_intRemainderCode;
    function liteFn_m12_intFloorDivideCode(lite_left: string, lite_right: string, lite_position: bigint): string {
        void lite_left;
        void lite_right;
        void lite_position;
        return (((((((((((("lite$floorDivideInt(") + (lite_left))) + (", "))) + (lite_right))) + (", "))) + (liteFn_m4_intText(lite_position)))) + (")"));
    }
    void liteFn_m12_intFloorDivideCode;
    function liteFn_m12_intFloorModuloCode(lite_left: string, lite_right: string, lite_position: bigint): string {
        void lite_left;
        void lite_right;
        void lite_position;
        return (((((((((((("lite$floorModuloInt(") + (lite_left))) + (", "))) + (lite_right))) + (", "))) + (liteFn_m4_intText(lite_position)))) + (")"));
    }
    void liteFn_m12_intFloorModuloCode;
    function liteFn_m12_intAddCode(lite_left: string, lite_right: string, lite_position: bigint): string {
        void lite_left;
        void lite_right;
        void lite_position;
        return (((((((((((("lite$addInt(") + (lite_left))) + (", "))) + (lite_right))) + (", "))) + (liteFn_m4_intText(lite_position)))) + (")"));
    }
    void liteFn_m12_intAddCode;
    function liteFn_m12_intSubtractCode(lite_left: string, lite_right: string, lite_position: bigint): string {
        void lite_left;
        void lite_right;
        void lite_position;
        return (((((((((((("lite$subtractInt(") + (lite_left))) + (", "))) + (lite_right))) + (", "))) + (liteFn_m4_intText(lite_position)))) + (")"));
    }
    void liteFn_m12_intSubtractCode;
    function liteFn_m12_intMultiplyCode(lite_left: string, lite_right: string, lite_position: bigint): string {
        void lite_left;
        void lite_right;
        void lite_position;
        return (((((((((((("lite$multiplyInt(") + (lite_left))) + (", "))) + (lite_right))) + (", "))) + (liteFn_m4_intText(lite_position)))) + (")"));
    }
    void liteFn_m12_intMultiplyCode;
    function liteFn_m12_intNegateCode(lite_value: string, lite_position: bigint): string {
        void lite_value;
        void lite_position;
        return (((((((("lite$negateInt(") + (lite_value))) + (", "))) + (liteFn_m4_intText(lite_position)))) + (")"));
    }
    void liteFn_m12_intNegateCode;
    function liteFn_m12_comparisonChainCode(lite_codes: string[], lite_kinds: string[], lite_operators: string[], lite_count: bigint, lite_position: bigint): string {
        void lite_codes;
        void lite_kinds;
        void lite_operators;
        void lite_count;
        void lite_position;
        let lite_m12_result = "((): boolean => { ";
        void lite_m12_result;
        let lite_m12_index = 0n;
        void lite_m12_index;
        while (((lite_m12_index) <= (lite_count))) {
            const lite_m12_name = (("lite$compare") + (liteFn_m4_intText(lite_m12_index)));
            void lite_m12_name;
            lite_m12_result = ((((((((((((((lite_m12_result) + ("const "))) + (lite_m12_name))) + (": "))) + (liteFn_m12_tsScalarType(lite$listAt((lite_kinds), lite_m12_index, 8007))))) + (" = "))) + (lite$listAt((lite_codes), lite_m12_index, 8031)))) + ("; "));
            if (((lite_m12_index) > (0n))) {
                const lite_m12_pair = liteFn_m12_comparisonPairCode(lite$listAt((lite_operators), lite$subtractInt(lite_m12_index, 1n, 8124), 8118), lite$listAt((lite_kinds), lite$subtractInt(lite_m12_index, 1n, 8142), 8136), lite$listAt((lite_kinds), lite_m12_index, 8154), (("lite$compare") + (liteFn_m4_intText(lite$subtractInt(lite_m12_index, 1n, 8201)))), lite_m12_name);
                void lite_m12_pair;
                if (((lite_m12_index) < (lite_count))) {
                    lite_m12_result = ((((((lite_m12_result) + ("if (!("))) + (lite_m12_pair))) + (")) return false; "));
                } else {
                    lite_m12_result = ((((((lite_m12_result) + ("return "))) + (lite_m12_pair))) + ("; "));
                }
            }
            lite_m12_index = lite$addInt(lite_m12_index, 1n, 8400);
        }
        return ((lite_m12_result) + ("})()"));
    }
    void liteFn_m12_comparisonChainCode;
    function liteFn_m13_intLiteralCode(lite_value: bigint, lite_negative: boolean, lite_digits: string): string {
        void lite_value;
        void lite_negative;
        void lite_digits;
        return (Boolean(((lite_value) === ((-9223372036854775808n)))) ? "INT64_MIN" : (Boolean(((lite_value) === (0n))) ? "INT64_C(0)" : (Boolean(lite_negative) ? (((("(-INT64_C(") + (lite_digits))) + ("))")) : (((("INT64_C(") + (lite_digits))) + (")")))));
    }
    void liteFn_m13_intLiteralCode;
    function liteFn_m13_textLiteralCode(lite_value: string): string {
        void lite_value;
        const lite_m13_size = liteFn_m6_length(lite_value);
        void lite_m13_size;
        let lite_m13_encoded = "\"";
        void lite_m13_encoded;
        let lite_m13_position = 0n;
        void lite_m13_position;
        while (((lite_m13_position) < (lite_m13_size))) {
            const lite_m13_ch = liteFn_m6_at(lite_value, lite_m13_position);
            void lite_m13_ch;
            if (((lite_m13_ch) === ("\\"))) {
                lite_m13_encoded = ((lite_m13_encoded) + ("\\\\"));
            } else if (((lite_m13_ch) === ("\""))) {
                lite_m13_encoded = ((lite_m13_encoded) + ("\\\""));
            } else if (((lite_m13_ch) === ("?"))) {
                lite_m13_encoded = ((lite_m13_encoded) + ("\\?"));
            } else if (((lite_m13_ch) === ("\n"))) {
                lite_m13_encoded = ((lite_m13_encoded) + ("\\n"));
            } else if (((lite_m13_ch) === ("\r"))) {
                lite_m13_encoded = ((lite_m13_encoded) + ("\\r"));
            } else if (((lite_m13_ch) === ("\t"))) {
                lite_m13_encoded = ((lite_m13_encoded) + ("\\t"));
            } else {
                lite_m13_encoded = ((lite_m13_encoded) + (lite_m13_ch));
            }
            lite_m13_position = lite$addInt(lite_m13_position, 1n, 1196);
        }
        return ((lite_m13_encoded) + ("\""));
    }
    void liteFn_m13_textLiteralCode;
    function liteFn_m13_floatLiteralCode(lite_digits: string, lite_negative: boolean): string {
        void lite_digits;
        void lite_negative;
        const lite_m13_parsed = (((("lt_float_literal(") + (liteFn_m13_textLiteralCode(lite_digits)))) + (")"));
        void lite_m13_parsed;
        return (Boolean(lite_negative) ? (((("(-") + (lite_m13_parsed))) + (")")) : lite_m13_parsed);
    }
    void liteFn_m13_floatLiteralCode;
    function liteFn_m13_unitEvaluationCode(lite_code: string): string {
        void lite_code;
        return (((("((void)(") + (lite_code))) + ("), 0)"));
    }
    void liteFn_m13_unitEvaluationCode;
    function liteFn_m13_unitLiteralCode(): string {
        return "0";
    }
    void liteFn_m13_unitLiteralCode;
    function liteFn_m13_boolLiteralCode(lite_value: boolean): string {
        void lite_value;
        return (Boolean(lite_value) ? "true" : "false");
    }
    void liteFn_m13_boolLiteralCode;
    function liteFn_m13_listCopyCode(lite_code: string): string {
        void lite_code;
        liteFn_m9_fail("", "C backend does not support list values yet");
        return lite_code;
    }
    void liteFn_m13_listCopyCode;
    function liteFn_m13_concatCode(lite_left: string, lite_right: string): string {
        void lite_left;
        void lite_right;
        return (((((((("lite_concat(") + (lite_left))) + (", "))) + (lite_right))) + (")"));
    }
    void liteFn_m13_concatCode;
    function liteFn_m13_notCode(lite_value: string): string {
        void lite_value;
        return (((("(!(") + (lite_value))) + ("))"));
    }
    void liteFn_m13_notCode;
    function liteFn_m13_logicCode(lite_op: string, lite_left: string, lite_right: string): string {
        void lite_op;
        void lite_left;
        void lite_right;
        return (Boolean(((lite_op) === ("and"))) ? (((((((("((") + (lite_left))) + (") && ("))) + (lite_right))) + ("))")) : (((((((("((") + (lite_left))) + (") || ("))) + (lite_right))) + ("))")));
    }
    void liteFn_m13_logicCode;
    function liteFn_m13_comparisonCode(lite_op: string, lite_kind: string, lite_left: string, lite_right: string): string {
        void lite_op;
        void lite_kind;
        void lite_left;
        void lite_right;
        if (((lite_kind) === ("String"))) {
            return (Boolean(((lite_op) === ("=="))) ? (((((((("strcmp(") + (lite_left))) + (", "))) + (lite_right))) + (") == 0")) : (((((((("strcmp(") + (lite_left))) + (", "))) + (lite_right))) + (") != 0")));
        } else {
            const lite_m13_operator = (Boolean(((lite_op) === ("=="))) ? "==" : (Boolean(((lite_op) === ("=!="))) ? "!=" : (Boolean(((lite_op) === ("<"))) ? "<" : (Boolean(((lite_op) === ("<!"))) ? ">=" : (Boolean(((lite_op) === ("<="))) ? "<=" : (Boolean(((lite_op) === ("<!="))) ? ">" : (Boolean(((lite_op) === (">"))) ? ">" : (Boolean(((lite_op) === (">!"))) ? "<=" : (Boolean(((lite_op) === (">="))) ? ">=" : "<")))))))));
            void lite_m13_operator;
            return (((((((((((("(") + (lite_left))) + (") "))) + (lite_m13_operator))) + (" ("))) + (lite_right))) + (")"));
        }
    }
    void liteFn_m13_comparisonCode;
    function liteFn_m13_floatOperandCode(lite_kind: string, lite_code: string): string {
        void lite_kind;
        void lite_code;
        return (Boolean(((lite_kind) === ("Int"))) ? (((("((double)(") + (lite_code))) + ("))")) : lite_code);
    }
    void liteFn_m13_floatOperandCode;
    function liteFn_m13_comparisonPairCode(lite_op: string, lite_leftKind: string, lite_rightKind: string, lite_left: string, lite_right: string): string {
        void lite_op;
        void lite_leftKind;
        void lite_rightKind;
        void lite_left;
        void lite_right;
        return (Boolean(((((lite_leftKind) !== (lite_rightKind))) && ((((((lite_leftKind) === ("Float"))) || (((lite_rightKind) === ("Float")))))))) ? liteFn_m13_comparisonCode(lite_op, "Float", liteFn_m13_floatOperandCode(lite_leftKind, lite_left), liteFn_m13_floatOperandCode(lite_rightKind, lite_right)) : liteFn_m13_comparisonCode(lite_op, lite_leftKind, lite_left, lite_right));
    }
    void liteFn_m13_comparisonPairCode;
    function liteFn_m13_floatBinaryCode(lite_op: string, lite_left: string, lite_right: string, lite_position: bigint): string {
        void lite_op;
        void lite_left;
        void lite_right;
        void lite_position;
        const lite_m13_tag = (Boolean(((lite_op) === ("+"))) ? "0" : (Boolean(((lite_op) === ("-"))) ? "1" : (Boolean(((lite_op) === ("*"))) ? "2" : "3")));
        void lite_m13_tag;
        const lite_m13_id = liteFn_m4_intText(lite_position);
        void lite_m13_id;
        return (((((((((((((((((((((((((((((((("(lt_arg_f_left_") + (lite_m13_id))) + (" = "))) + (lite_left))) + (", lt_arg_f_right_"))) + (lite_m13_id))) + (" = "))) + (lite_right))) + (", lt_float_op(lt_arg_f_left_"))) + (lite_m13_id))) + (", lt_arg_f_right_"))) + (lite_m13_id))) + (", "))) + (lite_m13_tag))) + (", "))) + (lite_m13_id))) + ("))"));
    }
    void liteFn_m13_floatBinaryCode;
    function liteFn_m13_floatPowerCode(lite_left: string, lite_right: string, lite_position: bigint): string {
        void lite_left;
        void lite_right;
        void lite_position;
        const lite_m13_id = liteFn_m4_intText(lite_position);
        void lite_m13_id;
        return (((((((((((((((((((((((((((("(lt_arg_f_left_") + (lite_m13_id))) + (" = "))) + (lite_left))) + (", lt_arg_f_right_"))) + (lite_m13_id))) + (" = "))) + (lite_right))) + (", lt_float_power(lt_arg_f_left_"))) + (lite_m13_id))) + (", lt_arg_f_right_"))) + (lite_m13_id))) + (", "))) + (lite_m13_id))) + ("))"));
    }
    void liteFn_m13_floatPowerCode;
    function liteFn_m13_floorDivCode(lite_left: string, lite_right: string): string {
        void lite_left;
        void lite_right;
        return (((((((((((((((((((((((((((("(") + (lite_left))) + (" / "))) + (lite_right))) + (" - (((("))) + (lite_left))) + (" % "))) + (lite_right))) + (") != 0) && ((("))) + (lite_left))) + (" % "))) + (lite_right))) + (") < 0) != ("))) + (lite_right))) + (" < 0))) ? 1 : 0))"));
    }
    void liteFn_m13_floorDivCode;
    function liteFn_m13_floorModCode(lite_left: string, lite_right: string): string {
        void lite_left;
        void lite_right;
        return (((((((((((((((((((((((((((((((("(") + (lite_left))) + (" % "))) + (lite_right))) + (" + (((("))) + (lite_left))) + (" % "))) + (lite_right))) + (") != 0) && ((("))) + (lite_left))) + (" % "))) + (lite_right))) + (") < 0) != ("))) + (lite_right))) + (" < 0))) ? "))) + (lite_right))) + (" : 0))"));
    }
    void liteFn_m13_floorModCode;
    function liteFn_m13_intBinaryCallCode(lite_name: string, lite_left: string, lite_right: string, lite_position: bigint): string {
        void lite_name;
        void lite_left;
        void lite_right;
        void lite_position;
        const lite_m13_id = liteFn_m4_intText(lite_position);
        void lite_m13_id;
        return (((((((((((((((((((((((((((((((("(lt_arg_left_") + (lite_m13_id))) + (" = "))) + (lite_left))) + (", lt_arg_right_"))) + (lite_m13_id))) + (" = "))) + (lite_right))) + (", "))) + (lite_name))) + ("(lt_arg_left_"))) + (lite_m13_id))) + (", lt_arg_right_"))) + (lite_m13_id))) + (", "))) + (lite_m13_id))) + ("))"));
    }
    void liteFn_m13_intBinaryCallCode;
    function liteFn_m13_intDivideCode(lite_left: string, lite_right: string, lite_position: bigint): string {
        void lite_left;
        void lite_right;
        void lite_position;
        return liteFn_m13_intBinaryCallCode("lite_divide_int", lite_left, lite_right, lite_position);
    }
    void liteFn_m13_intDivideCode;
    function liteFn_m13_intRemainderCode(lite_left: string, lite_right: string, lite_position: bigint): string {
        void lite_left;
        void lite_right;
        void lite_position;
        return liteFn_m13_intBinaryCallCode("lite_remainder_int", lite_left, lite_right, lite_position);
    }
    void liteFn_m13_intRemainderCode;
    function liteFn_m13_intFloorDivideCode(lite_left: string, lite_right: string, lite_position: bigint): string {
        void lite_left;
        void lite_right;
        void lite_position;
        return liteFn_m13_intBinaryCallCode("lite_floor_divide_int", lite_left, lite_right, lite_position);
    }
    void liteFn_m13_intFloorDivideCode;
    function liteFn_m13_intFloorModuloCode(lite_left: string, lite_right: string, lite_position: bigint): string {
        void lite_left;
        void lite_right;
        void lite_position;
        return liteFn_m13_intBinaryCallCode("lite_floor_modulo_int", lite_left, lite_right, lite_position);
    }
    void liteFn_m13_intFloorModuloCode;
    function liteFn_m13_intAddCode(lite_left: string, lite_right: string, lite_position: bigint): string {
        void lite_left;
        void lite_right;
        void lite_position;
        return liteFn_m13_intBinaryCallCode("lt_checked_add", lite_left, lite_right, lite_position);
    }
    void liteFn_m13_intAddCode;
    function liteFn_m13_intSubtractCode(lite_left: string, lite_right: string, lite_position: bigint): string {
        void lite_left;
        void lite_right;
        void lite_position;
        return liteFn_m13_intBinaryCallCode("lt_checked_subtract", lite_left, lite_right, lite_position);
    }
    void liteFn_m13_intSubtractCode;
    function liteFn_m13_intMultiplyCode(lite_left: string, lite_right: string, lite_position: bigint): string {
        void lite_left;
        void lite_right;
        void lite_position;
        return liteFn_m13_intBinaryCallCode("lt_checked_multiply", lite_left, lite_right, lite_position);
    }
    void liteFn_m13_intMultiplyCode;
    function liteFn_m13_intNegateCode(lite_value: string, lite_position: bigint): string {
        void lite_value;
        void lite_position;
        return (((((((("lt_checked_negate(") + (lite_value))) + (", "))) + (liteFn_m4_intText(lite_position)))) + (")"));
    }
    void liteFn_m13_intNegateCode;
    function liteFn_m13_comparisonTemp(lite_kind: string, lite_position: bigint, lite_index: bigint): string {
        void lite_kind;
        void lite_position;
        void lite_index;
        const lite_m13_tag = (Boolean(((lite_kind) === ("String"))) ? "s" : (Boolean(((lite_kind) === ("Bool"))) ? "b" : (Boolean(((lite_kind) === ("Float"))) ? "f" : "i")));
        void lite_m13_tag;
        return (((((((((("lt_cmp_") + (lite_m13_tag))) + ("_"))) + (liteFn_m4_intText(lite_position)))) + ("_"))) + (liteFn_m4_intText(lite_index)));
    }
    void liteFn_m13_comparisonTemp;
    function liteFn_m13_comparisonValueCode(lite_kind: string, lite_code: string): string {
        void lite_kind;
        void lite_code;
        if (((lite_kind) !== ("Unit"))) {
            return lite_code;
        }
        let lite_m13_inner = lite_code;
        void lite_m13_inner;
        while (((((((liteFn_m6_length(lite_m13_inner)) >= (2n))) && (((liteFn_m6_at(lite_m13_inner, 0n)) === ("("))))) && (((liteFn_m6_at(lite_m13_inner, lite$subtractInt(liteFn_m6_length(lite_m13_inner), 1n, 8633))) === (")"))))) {
            lite_m13_inner = liteFn_m6_slice(lite_m13_inner, 1n, lite$subtractInt(liteFn_m6_length(lite_m13_inner), 1n, 8709));
        }
        return (Boolean(((lite_m13_inner) === ("undefined"))) ? "0" : (((("(") + (lite_code))) + (", 0)")));
    }
    void liteFn_m13_comparisonValueCode;
    function liteFn_m13_comparisonChainCode(lite_codes: string[], lite_kinds: string[], lite_operators: string[], lite_count: bigint, lite_position: bigint): string {
        void lite_codes;
        void lite_kinds;
        void lite_operators;
        void lite_count;
        void lite_position;
        const lite_m13_first = liteFn_m13_comparisonTemp(lite$listAt((lite_kinds), 0n, 9078), lite_position, 0n);
        void lite_m13_first;
        const lite_m13_second = liteFn_m13_comparisonTemp(lite$listAt((lite_kinds), 1n, 9131), lite_position, 1n);
        void lite_m13_second;
        let lite_m13_result = (((((((((((((((((("(") + (lite_m13_first))) + (" = "))) + (liteFn_m13_comparisonValueCode(lite$listAt((lite_kinds), 0n, 9215), lite$listAt((lite_codes), 0n, 9225))))) + (", "))) + (lite_m13_second))) + (" = "))) + (liteFn_m13_comparisonValueCode(lite$listAt((lite_kinds), 1n, 9281), lite$listAt((lite_codes), 1n, 9291))))) + (", "))) + (liteFn_m13_comparisonPairCode(lite$listAt((lite_operators), 0n, 9333), lite$listAt((lite_kinds), 0n, 9343), lite$listAt((lite_kinds), 1n, 9353), lite_m13_first, lite_m13_second)));
        void lite_m13_result;
        let lite_m13_index = 2n;
        void lite_m13_index;
        while (((lite_m13_index) <= (lite_count))) {
            const lite_m13_name = liteFn_m13_comparisonTemp(lite$listAt((lite_kinds), lite_m13_index, 9456), lite_position, lite_m13_index);
            void lite_m13_name;
            const lite_m13_pair = liteFn_m13_comparisonPairCode(lite$listAt((lite_operators), lite$subtractInt(lite_m13_index, 1n, 9533), 9527), lite$listAt((lite_kinds), lite$subtractInt(lite_m13_index, 1n, 9551), 9545), lite$listAt((lite_kinds), lite_m13_index, 9563), liteFn_m13_comparisonTemp(lite$listAt((lite_kinds), lite$subtractInt(lite_m13_index, 1n, 9598), 9592), lite_position, lite$subtractInt(lite_m13_index, 1n, 9620)), lite_m13_name);
            void lite_m13_pair;
            lite_m13_result = ((((((((((((((lite_m13_result) + (" && ("))) + (lite_m13_name))) + (" = "))) + (liteFn_m13_comparisonValueCode(lite$listAt((lite_kinds), lite_m13_index, 9710), lite$listAt((lite_codes), lite_m13_index, 9724))))) + (", "))) + (lite_m13_pair))) + (")"));
            lite_m13_index = lite$addInt(lite_m13_index, 1n, 9775);
        }
        return ((lite_m13_result) + (")"));
    }
    void liteFn_m13_comparisonChainCode;
    function liteFn_m2_targetBoolLiteralCode(lite_target: string, lite_value: boolean): string {
        void lite_target;
        void lite_value;
        return (Boolean(((lite_target) === ("ts"))) ? liteFn_m12_boolLiteralCode(lite_value) : liteFn_m13_boolLiteralCode(lite_value));
    }
    void liteFn_m2_targetBoolLiteralCode;
    function liteFn_m2_targetComparisonChainCode(lite_target: string, lite_codes: string[], lite_kinds: string[], lite_operators: string[], lite_count: bigint, lite_position: bigint): string {
        void lite_target;
        void lite_codes;
        void lite_kinds;
        void lite_operators;
        void lite_count;
        void lite_position;
        return (Boolean(((lite_target) === ("ts"))) ? liteFn_m12_comparisonChainCode([...(lite_codes)], [...(lite_kinds)], [...(lite_operators)], lite_count, lite_position) : liteFn_m13_comparisonChainCode([...(lite_codes)], [...(lite_kinds)], [...(lite_operators)], lite_count, lite_position));
    }
    void liteFn_m2_targetComparisonChainCode;
    function liteFn_m2_targetComparisonCode(lite_target: string, lite_op: string, lite_kind: string, lite_left: string, lite_right: string): string {
        void lite_target;
        void lite_op;
        void lite_kind;
        void lite_left;
        void lite_right;
        return (Boolean(((lite_target) === ("ts"))) ? liteFn_m12_comparisonCode(lite_op, lite_kind, lite_left, lite_right) : liteFn_m13_comparisonCode(lite_op, lite_kind, lite_left, lite_right));
    }
    void liteFn_m2_targetComparisonCode;
    function liteFn_m2_targetConcatCode(lite_target: string, lite_left: string, lite_right: string): string {
        void lite_target;
        void lite_left;
        void lite_right;
        return (Boolean(((lite_target) === ("ts"))) ? liteFn_m12_concatCode(lite_left, lite_right) : liteFn_m13_concatCode(lite_left, lite_right));
    }
    void liteFn_m2_targetConcatCode;
    function liteFn_m2_targetFloatBinaryCode(lite_target: string, lite_op: string, lite_left: string, lite_right: string, lite_position: bigint): string {
        void lite_target;
        void lite_op;
        void lite_left;
        void lite_right;
        void lite_position;
        return (Boolean(((lite_target) === ("ts"))) ? liteFn_m12_floatBinaryCode(lite_op, lite_left, lite_right, lite_position) : liteFn_m13_floatBinaryCode(lite_op, lite_left, lite_right, lite_position));
    }
    void liteFn_m2_targetFloatBinaryCode;
    function liteFn_m2_targetFloatLiteralCode(lite_target: string, lite_digits: string, lite_negative: boolean): string {
        void lite_target;
        void lite_digits;
        void lite_negative;
        return (Boolean(((lite_target) === ("ts"))) ? liteFn_m12_floatLiteralCode(lite_digits, lite_negative) : liteFn_m13_floatLiteralCode(lite_digits, lite_negative));
    }
    void liteFn_m2_targetFloatLiteralCode;
    function liteFn_m2_targetFloatOperandCode(lite_target: string, lite_kind: string, lite_code: string): string {
        void lite_target;
        void lite_kind;
        void lite_code;
        return (Boolean(((lite_target) === ("ts"))) ? liteFn_m12_floatOperandCode(lite_kind, lite_code) : liteFn_m13_floatOperandCode(lite_kind, lite_code));
    }
    void liteFn_m2_targetFloatOperandCode;
    function liteFn_m2_targetFloatPowerCode(lite_target: string, lite_left: string, lite_right: string, lite_position: bigint): string {
        void lite_target;
        void lite_left;
        void lite_right;
        void lite_position;
        return (Boolean(((lite_target) === ("ts"))) ? liteFn_m12_floatPowerCode(lite_left, lite_right, lite_position) : liteFn_m13_floatPowerCode(lite_left, lite_right, lite_position));
    }
    void liteFn_m2_targetFloatPowerCode;
    function liteFn_m2_targetFloorDivCode(lite_target: string, lite_left: string, lite_right: string): string {
        void lite_target;
        void lite_left;
        void lite_right;
        return (Boolean(((lite_target) === ("ts"))) ? liteFn_m12_floorDivCode(lite_left, lite_right) : liteFn_m13_floorDivCode(lite_left, lite_right));
    }
    void liteFn_m2_targetFloorDivCode;
    function liteFn_m2_targetFloorModCode(lite_target: string, lite_left: string, lite_right: string): string {
        void lite_target;
        void lite_left;
        void lite_right;
        return (Boolean(((lite_target) === ("ts"))) ? liteFn_m12_floorModCode(lite_left, lite_right) : liteFn_m13_floorModCode(lite_left, lite_right));
    }
    void liteFn_m2_targetFloorModCode;
    function liteFn_m2_targetIntAddCode(lite_target: string, lite_left: string, lite_right: string, lite_position: bigint): string {
        void lite_target;
        void lite_left;
        void lite_right;
        void lite_position;
        return (Boolean(((lite_target) === ("ts"))) ? liteFn_m12_intAddCode(lite_left, lite_right, lite_position) : liteFn_m13_intAddCode(lite_left, lite_right, lite_position));
    }
    void liteFn_m2_targetIntAddCode;
    function liteFn_m2_targetIntDivideCode(lite_target: string, lite_left: string, lite_right: string, lite_position: bigint): string {
        void lite_target;
        void lite_left;
        void lite_right;
        void lite_position;
        return (Boolean(((lite_target) === ("ts"))) ? liteFn_m12_intDivideCode(lite_left, lite_right, lite_position) : liteFn_m13_intDivideCode(lite_left, lite_right, lite_position));
    }
    void liteFn_m2_targetIntDivideCode;
    function liteFn_m2_targetIntFloorDivideCode(lite_target: string, lite_left: string, lite_right: string, lite_position: bigint): string {
        void lite_target;
        void lite_left;
        void lite_right;
        void lite_position;
        return (Boolean(((lite_target) === ("ts"))) ? liteFn_m12_intFloorDivideCode(lite_left, lite_right, lite_position) : liteFn_m13_intFloorDivideCode(lite_left, lite_right, lite_position));
    }
    void liteFn_m2_targetIntFloorDivideCode;
    function liteFn_m2_targetIntFloorModuloCode(lite_target: string, lite_left: string, lite_right: string, lite_position: bigint): string {
        void lite_target;
        void lite_left;
        void lite_right;
        void lite_position;
        return (Boolean(((lite_target) === ("ts"))) ? liteFn_m12_intFloorModuloCode(lite_left, lite_right, lite_position) : liteFn_m13_intFloorModuloCode(lite_left, lite_right, lite_position));
    }
    void liteFn_m2_targetIntFloorModuloCode;
    function liteFn_m2_targetIntLiteralCode(lite_target: string, lite_value: bigint, lite_negative: boolean, lite_digits: string): string {
        void lite_target;
        void lite_value;
        void lite_negative;
        void lite_digits;
        return (Boolean(((lite_target) === ("ts"))) ? liteFn_m12_intLiteralCode(lite_value, lite_negative, lite_digits) : liteFn_m13_intLiteralCode(lite_value, lite_negative, lite_digits));
    }
    void liteFn_m2_targetIntLiteralCode;
    function liteFn_m2_targetIntMultiplyCode(lite_target: string, lite_left: string, lite_right: string, lite_position: bigint): string {
        void lite_target;
        void lite_left;
        void lite_right;
        void lite_position;
        return (Boolean(((lite_target) === ("ts"))) ? liteFn_m12_intMultiplyCode(lite_left, lite_right, lite_position) : liteFn_m13_intMultiplyCode(lite_left, lite_right, lite_position));
    }
    void liteFn_m2_targetIntMultiplyCode;
    function liteFn_m2_targetIntNegateCode(lite_target: string, lite_value: string, lite_position: bigint): string {
        void lite_target;
        void lite_value;
        void lite_position;
        return (Boolean(((lite_target) === ("ts"))) ? liteFn_m12_intNegateCode(lite_value, lite_position) : liteFn_m13_intNegateCode(lite_value, lite_position));
    }
    void liteFn_m2_targetIntNegateCode;
    function liteFn_m2_targetIntRemainderCode(lite_target: string, lite_left: string, lite_right: string, lite_position: bigint): string {
        void lite_target;
        void lite_left;
        void lite_right;
        void lite_position;
        return (Boolean(((lite_target) === ("ts"))) ? liteFn_m12_intRemainderCode(lite_left, lite_right, lite_position) : liteFn_m13_intRemainderCode(lite_left, lite_right, lite_position));
    }
    void liteFn_m2_targetIntRemainderCode;
    function liteFn_m2_targetIntSubtractCode(lite_target: string, lite_left: string, lite_right: string, lite_position: bigint): string {
        void lite_target;
        void lite_left;
        void lite_right;
        void lite_position;
        return (Boolean(((lite_target) === ("ts"))) ? liteFn_m12_intSubtractCode(lite_left, lite_right, lite_position) : liteFn_m13_intSubtractCode(lite_left, lite_right, lite_position));
    }
    void liteFn_m2_targetIntSubtractCode;
    function liteFn_m2_targetListCopyCode(lite_target: string, lite_code: string): string {
        void lite_target;
        void lite_code;
        return (Boolean(((lite_target) === ("ts"))) ? liteFn_m12_listCopyCode(lite_code) : liteFn_m13_listCopyCode(lite_code));
    }
    void liteFn_m2_targetListCopyCode;
    function liteFn_m2_targetLogicCode(lite_target: string, lite_op: string, lite_left: string, lite_right: string): string {
        void lite_target;
        void lite_op;
        void lite_left;
        void lite_right;
        return (Boolean(((lite_target) === ("ts"))) ? liteFn_m12_logicCode(lite_op, lite_left, lite_right) : liteFn_m13_logicCode(lite_op, lite_left, lite_right));
    }
    void liteFn_m2_targetLogicCode;
    function liteFn_m2_targetNotCode(lite_target: string, lite_value: string): string {
        void lite_target;
        void lite_value;
        return (Boolean(((lite_target) === ("ts"))) ? liteFn_m12_notCode(lite_value) : liteFn_m13_notCode(lite_value));
    }
    void liteFn_m2_targetNotCode;
    function liteFn_m2_targetTextLiteralCode(lite_target: string, lite_value: string): string {
        void lite_target;
        void lite_value;
        return (Boolean(((lite_target) === ("ts"))) ? liteFn_m12_textLiteralCode(lite_value) : liteFn_m13_textLiteralCode(lite_value));
    }
    void liteFn_m2_targetTextLiteralCode;
    function liteFn_m2_targetUnitEvaluationCode(lite_target: string, lite_code: string): string {
        void lite_target;
        void lite_code;
        return (Boolean(((lite_target) === ("ts"))) ? liteFn_m12_unitEvaluationCode(lite_code) : liteFn_m13_unitEvaluationCode(lite_code));
    }
    void liteFn_m2_targetUnitEvaluationCode;
    function liteFn_m2_targetUnitLiteralCode(lite_target: string): string {
        void lite_target;
        return (Boolean(((lite_target) === ("ts"))) ? liteFn_m12_unitLiteralCode() : liteFn_m13_unitLiteralCode());
    }
    void liteFn_m2_targetUnitLiteralCode;
    function liteFn_m2_failAt(lite_source: string, lite_position: bigint, lite_prefix: string, lite_message: string): void {
        void lite_source;
        void lite_position;
        void lite_prefix;
        void lite_message;
        const lite_m2_place = liteFn_m8_lineColumn(lite_source, lite_position);
        void lite_m2_place;
        return (void (liteFn_m9_fail(lite_prefix, ((((((((liteFn_m3_decimalText((lite_m2_place).line)) + (":"))) + (liteFn_m3_decimalText((lite_m2_place).column)))) + (": "))) + (lite_message)))));
    }
    void liteFn_m2_failAt;
    function liteFn_m2_expectSymbol(lite_source: string, lite_position: bigint, lite_symbol: string, lite_prefix: string): bigint {
        void lite_source;
        void lite_position;
        void lite_symbol;
        void lite_prefix;
        if (((((lite_position) >= (liteFn_m6_length(lite_source)))) || (((liteFn_m6_at(lite_source, lite_position)) !== (lite_symbol))))) {
            liteFn_m2_failAt(lite_source, lite_position, lite_prefix, (("expected ") + (lite_symbol)));
        }
        return lite$addInt(lite_position, 1n, 10634);
    }
    void liteFn_m2_expectSymbol;
    function liteFn_m2_rawFenceLength(lite_source: string, lite_position: bigint): bigint {
        void lite_source;
        void lite_position;
        if ((!(liteFn_m6_startsWithAt(lite_source, lite_position, "/*")))) {
            return 0n;
        }
        let lite_m2_index = lite$addInt(lite_position, 2n, 10896);
        void lite_m2_index;
        let lite_m2_count = 0n;
        void lite_m2_count;
        while (((((lite_m2_index) < (liteFn_m6_length(lite_source)))) && (((liteFn_m6_at(lite_source, lite_m2_index)) === ("#"))))) {
            lite_m2_count = lite$addInt(lite_m2_count, 1n, 11022);
            lite_m2_index = lite$addInt(lite_m2_index, 1n, 11049);
        }
        return lite_m2_count;
    }
    void liteFn_m2_rawFenceLength;
    function liteFn_m2_skipRawComment(lite_source: string, lite_position: bigint, lite_fence: bigint, lite_prefix: string): bigint {
        void lite_source;
        void lite_position;
        void lite_fence;
        void lite_prefix;
        const lite_m2_size = liteFn_m6_length(lite_source);
        void lite_m2_size;
        let lite_m2_cursor = lite$addInt(lite$addInt(lite_position, 2n, 11357), lite_fence, 11361);
        void lite_m2_cursor;
        while (((lite_m2_cursor) < (lite_m2_size))) {
            if (((liteFn_m6_at(lite_source, lite_m2_cursor)) === ("#"))) {
                const lite_m2_runStart = lite_m2_cursor;
                void lite_m2_runStart;
                let lite_m2_runEnd = lite_m2_cursor;
                void lite_m2_runEnd;
                while (((((lite_m2_runEnd) < (lite_m2_size))) && (((liteFn_m6_at(lite_source, lite_m2_runEnd)) === ("#"))))) {
                    lite_m2_runEnd = lite$addInt(lite_m2_runEnd, 1n, 11595);
                }
                if (((((lite$subtractInt(lite_m2_runEnd, lite_m2_runStart, 11624)) === (lite_fence))) && (liteFn_m6_startsWithAt(lite_source, lite_m2_runEnd, "*/")))) {
                    return lite$addInt(lite_m2_runEnd, 2n, 11723);
                }
                lite_m2_cursor = lite_m2_runEnd;
            } else {
                lite_m2_cursor = lite$addInt(lite_m2_cursor, 1n, 11816);
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
        const lite_m2_size = liteFn_m6_length(lite_source);
        void lite_m2_size;
        const lite_m2_fence = liteFn_m2_rawFenceLength(lite_source, lite_position);
        void lite_m2_fence;
        if (((lite_m2_fence) > (0n))) {
            return liteFn_m2_skipRawComment(lite_source, lite_position, lite_m2_fence, lite_prefix);
        }
        let lite_m2_cursor = lite$addInt(lite_position, 2n, 12283);
        void lite_m2_cursor;
        let lite_m2_depth = 1n;
        void lite_m2_depth;
        while (Boolean(true)) {
            if (((lite_m2_cursor) >= (lite_m2_size))) {
                liteFn_m2_failAt(lite_source, lite_position, lite_prefix, "unterminated comment");
            }
            if (liteFn_m6_startsWithAt(lite_source, lite_m2_cursor, "/*")) {
                const lite_m2_innerFence = liteFn_m2_rawFenceLength(lite_source, lite_m2_cursor);
                void lite_m2_innerFence;
                if (((lite_m2_innerFence) > (0n))) {
                    lite_m2_cursor = liteFn_m2_skipRawComment(lite_source, lite_m2_cursor, lite_m2_innerFence, lite_prefix);
                } else {
                    lite_m2_depth = lite$addInt(lite_m2_depth, 1n, 12706);
                    lite_m2_cursor = lite$addInt(lite_m2_cursor, 2n, 12743);
                }
            } else if (liteFn_m6_startsWithAt(lite_source, lite_m2_cursor, "*/")) {
                lite_m2_depth = lite$subtractInt(lite_m2_depth, 1n, 12851);
                lite_m2_cursor = lite$addInt(lite_m2_cursor, 2n, 12884);
                if (((lite_m2_depth) === (0n))) {
                    return lite_m2_cursor;
                }
            } else {
                lite_m2_cursor = lite$addInt(lite_m2_cursor, 1n, 12979);
            }
        }
        return lite_m2_size;
    }
    void liteFn_m2_skipComment;
    function liteFn_m2_skipTrivia(lite_source: string, lite_start: bigint, lite_prefix: string): bigint {
        void lite_source;
        void lite_start;
        void lite_prefix;
        const lite_m2_size = liteFn_m6_length(lite_source);
        void lite_m2_size;
        let lite_m2_position = lite_start;
        void lite_m2_position;
        while (((lite_m2_position) < (lite_m2_size))) {
            const lite_m2_ch = liteFn_m6_at(lite_source, lite_m2_position);
            void lite_m2_ch;
            if (((((((((lite_m2_ch) === (" "))) || (((lite_m2_ch) === ("\t"))))) || (((lite_m2_ch) === ("\r"))))) || (((lite_m2_ch) === ("\n"))))) {
                lite_m2_position = lite$addInt(lite_m2_position, 1n, 13452);
            } else if (liteFn_m6_startsWithAt(lite_source, lite_m2_position, "/*")) {
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
        if (((((lite_m2_next) < (liteFn_m6_length(lite_source)))) && (((liteFn_m6_at(lite_source, lite_m2_next)) === (";"))))) {
            return liteFn_m2_skipTrivia(lite_source, lite$addInt(lite_m2_next, 1n, 14068), lite_prefix);
        }
        if (((((((lite_m2_next) === (liteFn_m6_length(lite_source)))) || (((liteFn_m6_at(lite_source, lite_m2_next)) === ("}"))))) || ((((((lite_position) > (0n))) && (((liteFn_m6_at(lite_source, lite$subtractInt(lite_position, 1n, 14214))) === ("}")))))))) {
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
            lite_m2_index = lite$addInt(lite_m2_index, 1n, 16465);
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
            lite_m2_index = lite$addInt(lite_m2_index, 1n, 17471);
        }
        return (-1n);
    }
    void liteFn_m2_findAlias;
    function liteFn_m2_typeNameAt(lite_source: string, lite_position: bigint, lite_prefix: string): { name: string; next: bigint } {
        void lite_source;
        void lite_position;
        void lite_prefix;
        const lite_m2_firstEnd = liteFn_m6_skipName(lite_source, lite_position);
        void lite_m2_firstEnd;
        const lite_m2_first = liteFn_m6_slice(lite_source, lite_position, lite_m2_firstEnd);
        void lite_m2_first;
        const lite_m2_afterFirst = liteFn_m2_skipTrivia(lite_source, lite_m2_firstEnd, lite_prefix);
        void lite_m2_afterFirst;
        if (((((lite_m2_afterFirst) < (liteFn_m6_length(lite_source)))) && (((liteFn_m6_at(lite_source, lite_m2_afterFirst)) === ("."))))) {
            const lite_m2_memberStart = liteFn_m2_skipTrivia(lite_source, lite$addInt(lite_m2_afterFirst, 1n, 17943), lite_prefix);
            void lite_m2_memberStart;
            if (((((lite_m2_memberStart) >= (liteFn_m6_length(lite_source)))) || ((!(liteFn_m6_isNameStart(liteFn_m6_at(lite_source, lite_m2_memberStart))))))) {
                liteFn_m2_failAt(lite_source, lite_m2_memberStart, lite_prefix, "expected a type name after .");
            }
            const lite_m2_memberEnd = liteFn_m6_skipName(lite_source, lite_m2_memberStart);
            void lite_m2_memberEnd;
            const lite_m2_member = liteFn_m6_slice(lite_source, lite_m2_memberStart, lite_m2_memberEnd);
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
            lite_m2_index = lite$addInt(lite_m2_index, 1n, 18661);
        }
        return (-1n);
    }
    void liteFn_m2_aliasIndexAt;
    function liteFn_m2_isTupleKind(lite_kind: string): boolean {
        void lite_kind;
        return ((((liteFn_m6_length(lite_kind)) > (0n))) && (((liteFn_m6_at(lite_kind, 0n)) === ("("))));
    }
    void liteFn_m2_isTupleKind;
    function liteFn_m2_isListKind(lite_kind: string): boolean {
        void lite_kind;
        return ((((((liteFn_m6_length(lite_kind)) > (5n))) && (liteFn_m6_startsWithAt(lite_kind, 0n, "List<")))) && (((liteFn_m6_at(lite_kind, lite$subtractInt(liteFn_m6_length(lite_kind), 1n, 19163))) === (">"))));
    }
    void liteFn_m2_isListKind;
    function liteFn_m2_listElementKind(lite_kind: string): string {
        void lite_kind;
        if ((!(liteFn_m2_isListKind(lite_kind)))) {
            return "";
        }
        return liteFn_m6_slice(lite_kind, 5n, lite$subtractInt(liteFn_m6_length(lite_kind), 1n, 19387));
    }
    void liteFn_m2_listElementKind;
    function liteFn_m2_codeUsesTextCall(lite_code: string, lite_needle: string): boolean {
        void lite_code;
        void lite_needle;
        const lite_m2_size = liteFn_m6_length(lite_code);
        void lite_m2_size;
        let lite_m2_cursor = 0n;
        void lite_m2_cursor;
        while (((lite_m2_cursor) < (lite_m2_size))) {
            const lite_m2_ch = liteFn_m6_at(lite_code, lite_m2_cursor);
            void lite_m2_ch;
            if (((lite_m2_ch) === ("\""))) {
                lite_m2_cursor = lite$addInt(lite_m2_cursor, 1n, 19716);
                while (((lite_m2_cursor) < (lite_m2_size))) {
                    const lite_m2_escaped = liteFn_m6_at(lite_code, lite_m2_cursor);
                    void lite_m2_escaped;
                    if (((lite_m2_escaped) === ("\\"))) {
                        lite_m2_cursor = lite$addInt(lite_m2_cursor, 2n, 19880);
                    } else if (((lite_m2_escaped) === ("\""))) {
                        lite_m2_cursor = lite$addInt(lite_m2_cursor, 1n, 19965);
                        break;
                    } else {
                        lite_m2_cursor = lite$addInt(lite_m2_cursor, 1n, 20058);
                    }
                }
            } else if (liteFn_m6_startsWithAt(lite_code, lite_m2_cursor, lite_needle)) {
                return true;
            } else {
                lite_m2_cursor = lite$addInt(lite_m2_cursor, 1n, 20228);
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
        const lite_m2_size = liteFn_m6_length(lite_kind);
        void lite_m2_size;
        let lite_m2_cursor = 1n;
        void lite_m2_cursor;
        while (((((lite_m2_cursor) < (lite_m2_size))) && (((liteFn_m6_at(lite_kind, lite_m2_cursor)) !== (")"))))) {
            const lite_m2_nameStart = lite_m2_cursor;
            void lite_m2_nameStart;
            lite_m2_cursor = liteFn_m6_skipName(lite_kind, lite_m2_cursor);
            const lite_m2_fieldName = liteFn_m6_slice(lite_kind, lite_m2_nameStart, lite_m2_cursor);
            void lite_m2_fieldName;
            if (((((lite_m2_cursor) < (lite_m2_size))) && (((liteFn_m6_at(lite_kind, lite_m2_cursor)) === (":"))))) {
                lite_m2_cursor = lite$addInt(lite_m2_cursor, 1n, 21389);
            }
            const lite_m2_typeStart = lite_m2_cursor;
            void lite_m2_typeStart;
            lite_m2_cursor = liteFn_m6_skipName(lite_kind, lite_m2_cursor);
            const lite_m2_fieldKind = liteFn_m6_slice(lite_kind, lite_m2_typeStart, lite_m2_cursor);
            void lite_m2_fieldKind;
            if (((lite_m2_fieldName) === (lite_label))) {
                return lite_m2_fieldKind;
            }
            if (((((lite_m2_cursor) < (lite_m2_size))) && (((liteFn_m6_at(lite_kind, lite_m2_cursor)) === (","))))) {
                lite_m2_cursor = lite$addInt(lite_m2_cursor, 1n, 21666);
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
        const lite_m2_size = liteFn_m6_length(lite_kind);
        void lite_m2_size;
        let lite_m2_cursor = 1n;
        void lite_m2_cursor;
        let lite_m2_result = "(";
        void lite_m2_result;
        let lite_m2_count = 0n;
        void lite_m2_count;
        while (((((lite_m2_cursor) < (lite_m2_size))) && (((liteFn_m6_at(lite_kind, lite_m2_cursor)) !== (")"))))) {
            const lite_m2_nameStart = lite_m2_cursor;
            void lite_m2_nameStart;
            lite_m2_cursor = liteFn_m6_skipName(lite_kind, lite_m2_cursor);
            const lite_m2_fieldName = liteFn_m6_slice(lite_kind, lite_m2_nameStart, lite_m2_cursor);
            void lite_m2_fieldName;
            if (((((lite_m2_cursor) < (lite_m2_size))) && (((liteFn_m6_at(lite_kind, lite_m2_cursor)) === (":"))))) {
                lite_m2_cursor = lite$addInt(lite_m2_cursor, 1n, 22343);
            }
            const lite_m2_typeStart = lite_m2_cursor;
            void lite_m2_typeStart;
            lite_m2_cursor = liteFn_m6_skipName(lite_kind, lite_m2_cursor);
            const lite_m2_fieldKind = liteFn_m6_slice(lite_kind, lite_m2_typeStart, lite_m2_cursor);
            void lite_m2_fieldKind;
            if (((lite_m2_count) > (0n))) {
                lite_m2_result = ((lite_m2_result) + (", "));
            }
            lite_m2_result = ((((((lite_m2_result) + (lite_m2_fieldName))) + (": "))) + (liteFn_m2_displayKind(lite_m2_fieldKind)));
            lite_m2_count = lite$addInt(lite_m2_count, 1n, 22629);
            if (((((lite_m2_cursor) < (lite_m2_size))) && (((liteFn_m6_at(lite_kind, lite_m2_cursor)) === (","))))) {
                lite_m2_cursor = lite$addInt(lite_m2_cursor, 1n, 22713);
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
        const lite_m2_size = liteFn_m6_length(lite_text);
        void lite_m2_size;
        let lite_m2_cursor = liteFn_m2_skipTrivia(lite_text, 0n, lite_prefix);
        void lite_m2_cursor;
        if (((((lite_m2_cursor) < (lite_m2_size))) && (((liteFn_m6_at(lite_text, lite_m2_cursor)) === ("("))))) {
            lite_m2_cursor = liteFn_m2_skipTrivia(lite_text, lite$addInt(lite_m2_cursor, 1n, 23230), lite_prefix);
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
                if (((liteFn_m6_at(lite_text, lite_m2_cursor)) === (")"))) {
                    lite_m2_cursor = lite$addInt(lite_m2_cursor, 1n, 23533);
                    break;
                }
                if ((!(liteFn_m6_isNameStart(liteFn_m6_at(lite_text, lite_m2_cursor))))) {
                    liteFn_m2_failAt(lite_source, lite_position, lite_prefix, "expected a tuple field name");
                }
                const lite_m2_labelStart = lite_m2_cursor;
                void lite_m2_labelStart;
                lite_m2_cursor = liteFn_m6_skipName(lite_text, lite_m2_cursor);
                const lite_m2_label = liteFn_m6_slice(lite_text, lite_m2_labelStart, lite_m2_cursor);
                void lite_m2_label;
                if (liteFn_m7_listContainsText([...(lite_m2_labels)], lite_m2_label)) {
                    liteFn_m2_failAt(lite_source, lite_position, lite_prefix, (("duplicate tuple field ") + (lite_m2_label)));
                }
                lite_m2_labels.push(lite_m2_label);
                lite_m2_cursor = liteFn_m2_skipTrivia(lite_text, lite_m2_cursor, lite_prefix);
                if (((((lite_m2_cursor) >= (lite_m2_size))) || (((liteFn_m6_at(lite_text, lite_m2_cursor)) !== (":"))))) {
                    liteFn_m2_failAt(lite_source, lite_position, lite_prefix, (("expected : after tuple field ") + (lite_m2_label)));
                }
                lite_m2_cursor = liteFn_m2_skipTrivia(lite_text, lite$addInt(lite_m2_cursor, 1n, 24363), lite_prefix);
                if (((((lite_m2_cursor) < (lite_m2_size))) && (((liteFn_m6_at(lite_text, lite_m2_cursor)) === ("("))))) {
                    liteFn_m2_failAt(lite_source, lite_position, lite_prefix, "nested tuple types are not supported");
                }
                if (((((lite_m2_cursor) >= (lite_m2_size))) || ((!(liteFn_m6_isNameStart(liteFn_m6_at(lite_text, lite_m2_cursor))))))) {
                    liteFn_m2_failAt(lite_source, lite_position, lite_prefix, "expected a tuple field type");
                }
                const lite_m2_componentStart = lite_m2_cursor;
                void lite_m2_componentStart;
                lite_m2_cursor = liteFn_m6_skipName(lite_text, lite_m2_cursor);
                const lite_m2_componentName = liteFn_m6_slice(lite_text, lite_m2_componentStart, lite_m2_cursor);
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
                lite_m2_count = lite$addInt(lite_m2_count, 1n, 25587);
                lite_m2_cursor = liteFn_m2_skipTrivia(lite_text, lite_m2_cursor, lite_prefix);
                if (((((lite_m2_cursor) < (lite_m2_size))) && (((liteFn_m6_at(lite_text, lite_m2_cursor)) === (","))))) {
                    lite_m2_cursor = liteFn_m2_skipTrivia(lite_text, lite$addInt(lite_m2_cursor, 1n, 25763), lite_prefix);
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
        if (((((((lite_m2_name) === ("List"))) && (((lite_m2_afterTrivia) < (lite_m2_size))))) && (((liteFn_m6_at(lite_text, lite_m2_afterTrivia)) === ("<"))))) {
            const lite_m2_innerStart = liteFn_m2_skipTrivia(lite_text, lite$addInt(lite_m2_afterTrivia, 1n, 26429), lite_prefix);
            void lite_m2_innerStart;
            if (((((lite_m2_innerStart) >= (lite_m2_size))) || (((liteFn_m6_at(lite_text, lite_m2_innerStart)) === (">"))))) {
                liteFn_m2_failAt(lite_source, lite_position, lite_prefix, "expected a list element type");
            }
            let lite_m2_scan = lite_m2_innerStart;
            void lite_m2_scan;
            let lite_m2_depth = 0n;
            void lite_m2_depth;
            let lite_m2_close = (-1n);
            void lite_m2_close;
            while (((lite_m2_scan) < (lite_m2_size))) {
                const lite_m2_ch = liteFn_m6_at(lite_text, lite_m2_scan);
                void lite_m2_ch;
                if (((lite_m2_ch) === ("<"))) {
                    lite_m2_depth = lite$addInt(lite_m2_depth, 1n, 26809);
                } else if (((lite_m2_ch) === (">"))) {
                    if (((lite_m2_depth) === (0n))) {
                        lite_m2_close = lite_m2_scan;
                        break;
                    }
                    lite_m2_depth = lite$subtractInt(lite_m2_depth, 1n, 26989);
                }
                lite_m2_scan = lite$addInt(lite_m2_scan, 1n, 27032);
            }
            if (((lite_m2_close) < (0n))) {
                liteFn_m2_failAt(lite_source, lite_position, lite_prefix, "expected > in list type");
            }
            const lite_m2_innerText = liteFn_m6_slice(lite_text, lite_m2_innerStart, lite_m2_close);
            void lite_m2_innerText;
            const lite_m2_innerKind = liteFn_m2_resolveTypeText(lite_source, lite_position, lite_prefix, [...(lite_aliases)], lite_m2_innerText, [...(lite_seen)]);
            void lite_m2_innerKind;
            if (liteFn_m2_isListKind(lite_m2_innerKind)) {
                liteFn_m2_failAt(lite_source, lite_position, lite_prefix, "nested list types are not supported");
            }
            if (((lite_m2_innerKind) === ("Unit"))) {
                liteFn_m2_failAt(lite_source, lite_position, lite_prefix, "unsupported list element type Unit");
            }
            const lite_m2_afterList = liteFn_m2_skipTrivia(lite_text, lite$addInt(lite_m2_close, 1n, 27605), lite_prefix);
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
        const lite_m2_numericKind = liteFn_m11_numericAliasKind(lite_m2_name);
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
        const lite_m2_alias = lite$listAt((lite_aliases), lite_m2_index, 28421);
        void lite_m2_alias;
        if (liteFn_m7_listContainsText([...(lite_seen)], lite_m2_name)) {
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
        const lite_m2_size = liteFn_m6_length(lite_source);
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
            if (((liteFn_m6_at(lite_source, lite_m2_cursor)) === (")"))) {
                lite_m2_cursor = lite$addInt(lite_m2_cursor, 1n, 29857);
                break;
            }
            if ((!(liteFn_m6_isNameStart(liteFn_m6_at(lite_source, lite_m2_cursor))))) {
                liteFn_m2_failAt(lite_source, lite_m2_cursor, lite_prefix, "expected a tuple field name");
            }
            const lite_m2_labelStart = lite_m2_cursor;
            void lite_m2_labelStart;
            lite_m2_cursor = liteFn_m6_skipName(lite_source, lite_m2_cursor);
            const lite_m2_label = liteFn_m6_slice(lite_source, lite_m2_labelStart, lite_m2_cursor);
            void lite_m2_label;
            if (liteFn_m2_isReservedWord(lite_m2_label)) {
                liteFn_m2_unsupportedFeature(lite_source, lite_m2_labelStart, lite_m2_label, lite_prefix);
            }
            if (liteFn_m7_listContainsText([...(lite_m2_labels)], lite_m2_label)) {
                liteFn_m2_failAt(lite_source, lite_m2_labelStart, lite_prefix, (("duplicate tuple field ") + (lite_m2_label)));
            }
            lite_m2_labels.push(lite_m2_label);
            lite_m2_cursor = liteFn_m2_skipTrivia(lite_source, lite_m2_cursor, lite_prefix);
            if (((((lite_m2_cursor) >= (lite_m2_size))) || (((liteFn_m6_at(lite_source, lite_m2_cursor)) !== (":"))))) {
                liteFn_m2_failAt(lite_source, lite_m2_cursor, lite_prefix, (("expected : after tuple field ") + (lite_m2_label)));
            }
            lite_m2_cursor = liteFn_m2_skipTrivia(lite_source, lite$addInt(lite_m2_cursor, 1n, 30721), lite_prefix);
            if (((((lite_m2_cursor) < (lite_m2_size))) && (((liteFn_m6_at(lite_source, lite_m2_cursor)) === ("("))))) {
                liteFn_m2_failAt(lite_source, lite_m2_cursor, lite_prefix, "nested tuple types are not supported");
            }
            if (((((lite_m2_cursor) >= (lite_m2_size))) || ((!(liteFn_m6_isNameStart(liteFn_m6_at(lite_source, lite_m2_cursor))))))) {
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
                lite_m2_componentKind = liteFn_m11_numericAliasKind(lite_m2_componentName);
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
            lite_m2_count = lite$addInt(lite_m2_count, 1n, 32554);
            lite_m2_cursor = liteFn_m2_skipTrivia(lite_source, lite_m2_cursor, lite_prefix);
            if (((((lite_m2_cursor) < (lite_m2_size))) && (((liteFn_m6_at(lite_source, lite_m2_cursor)) === (","))))) {
                lite_m2_cursor = liteFn_m2_skipTrivia(lite_source, lite$addInt(lite_m2_cursor, 1n, 32724), lite_prefix);
            }
        }
        if (((lite_m2_count) === (0n))) {
            liteFn_m2_failAt(lite_source, lite_position, lite_prefix, "tuple type needs at least one field");
        }
        return { kind: ((lite_m2_kindText) + (")")), next: lite_m2_cursor };
    }
    void liteFn_m2_parseTupleTypeAt;
    function liteFn_m2_parseTypeAt(lite_source: string, lite_position: bigint, lite_prefix: string, lite_aliases: { name: string; target: string; at: bigint; end: bigint }[], lite_context: string, lite_genericType: string): { kind: string; next: bigint } {
        void lite_source;
        void lite_position;
        void lite_prefix;
        void lite_aliases;
        void lite_context;
        void lite_genericType;
        const lite_m2_start = liteFn_m2_skipTrivia(lite_source, lite_position, lite_prefix);
        void lite_m2_start;
        if (((((lite_m2_start) < (liteFn_m6_length(lite_source)))) && (((liteFn_m6_at(lite_source, lite_m2_start)) === ("("))))) {
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
        if (((((((lite_m2_name) === ("List"))) && (((lite_m2_afterName) < (liteFn_m6_length(lite_source)))))) && (((liteFn_m6_at(lite_source, lite_m2_afterName)) === ("<"))))) {
            const lite_m2_innerStart = liteFn_m2_skipTrivia(lite_source, lite$addInt(lite_m2_afterName, 1n, 33692), lite_prefix);
            void lite_m2_innerStart;
            if (((((lite_m2_innerStart) >= (liteFn_m6_length(lite_source)))) || (((liteFn_m6_at(lite_source, lite_m2_innerStart)) === (">"))))) {
                liteFn_m2_failAt(lite_source, lite_m2_innerStart, lite_prefix, "expected a list element type");
            }
            const lite_m2_inner = liteFn_m2_parseTypeAt(lite_source, lite_m2_innerStart, lite_prefix, [...(lite_aliases)], lite_context, lite_genericType);
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
        if (((((lite_genericType) !== (""))) && (((lite_m2_name) === (lite_genericType))))) {
            return { kind: lite_genericType, next: lite_m2_after };
        }
        if (((((((((((lite_m2_name) === ("Int"))) || (((lite_m2_name) === ("Float"))))) || (((lite_m2_name) === ("String"))))) || (((lite_m2_name) === ("Bool"))))) || (((lite_m2_name) === ("Unit"))))) {
            return { kind: lite_m2_name, next: lite_m2_after };
        }
        const lite_m2_numericKind = liteFn_m11_numericAliasKind(lite_m2_name);
        void lite_m2_numericKind;
        if (((lite_m2_numericKind) !== (""))) {
            return { kind: lite_m2_numericKind, next: lite_m2_after };
        }
        if (((liteFn_m2_findAlias([...(lite_aliases)], lite_m2_name)) >= (0n))) {
            const lite_m2_seen: string[] = [...([])];
            void lite_m2_seen;
            return { kind: liteFn_m2_resolveAliasKind(lite_source, lite_m2_start, lite_prefix, [...(lite_aliases)], lite_m2_name, [...(lite_m2_seen)]), next: lite_m2_after };
        }
        if (((liteFn_m6_indexOfText(lite_m2_name, ".", 0n)) >= (0n))) {
            liteFn_m2_failAt(lite_source, lite_m2_start, lite_prefix, (("unknown type alias ") + (lite_m2_name)));
        }
        liteFn_m2_failAt(lite_source, lite_m2_start, lite_prefix, (((((("unsupported ") + (lite_context))) + (" type "))) + (lite_m2_name)));
        return { kind: "", next: lite_m2_after };
    }
    void liteFn_m2_parseTypeAt;
    function liteFn_m2_parseFunctionType(lite_source: string, lite_position: bigint, lite_prefix: string, lite_aliases: { name: string; target: string; at: bigint; end: bigint }[], lite_genericType: string): { kind: string; next: bigint } {
        void lite_source;
        void lite_position;
        void lite_prefix;
        void lite_aliases;
        void lite_genericType;
        return liteFn_m2_parseTypeAt(lite_source, lite_position, lite_prefix, [...(lite_aliases)], "function", lite_genericType);
    }
    void liteFn_m2_parseFunctionType;
    function liteFn_m2_parseFunctionHeader(lite_source: string, lite_position: bigint, lite_prefix: string, lite_aliases: { name: string; target: string; at: bigint; end: bigint }[], lite_listIntrinsic: boolean): { next: bigint; result: string; params: string; count: bigint; genericType: string } {
        void lite_source;
        void lite_position;
        void lite_prefix;
        void lite_aliases;
        void lite_listIntrinsic;
        const lite_m2_size = liteFn_m6_length(lite_source);
        void lite_m2_size;
        let lite_m2_cursor = liteFn_m2_skipTrivia(lite_source, lite_position, lite_prefix);
        void lite_m2_cursor;
        let lite_m2_genericType = "";
        void lite_m2_genericType;
        if (lite_listIntrinsic) {
            lite_m2_cursor = liteFn_m2_expectSymbol(lite_source, lite_m2_cursor, "<", lite_prefix);
            const lite_m2_binderStart = liteFn_m2_skipTrivia(lite_source, lite_m2_cursor, lite_prefix);
            void lite_m2_binderStart;
            const lite_m2_binder = liteFn_m2_typeNameAt(lite_source, lite_m2_binderStart, lite_prefix);
            void lite_m2_binder;
            if ((((lite_m2_binder).name) !== ("T"))) {
                liteFn_m2_failAt(lite_source, lite_m2_binderStart, lite_prefix, "core list intrinsic type parameter must be T");
            }
            lite_m2_genericType = (lite_m2_binder).name;
            lite_m2_cursor = liteFn_m2_expectSymbol(lite_source, (lite_m2_binder).next, ">", lite_prefix);
            lite_m2_cursor = liteFn_m2_skipTrivia(lite_source, lite_m2_cursor, lite_prefix);
        }
        lite_m2_cursor = liteFn_m2_expectSymbol(lite_source, lite_m2_cursor, "(", lite_prefix);
        lite_m2_cursor = liteFn_m2_skipTrivia(lite_source, lite_m2_cursor, lite_prefix);
        const lite_m2_names: string[] = [...([])];
        void lite_m2_names;
        let lite_m2_encoded = "";
        void lite_m2_encoded;
        let lite_m2_count = 0n;
        void lite_m2_count;
        if (liteFn_m6_startsWithAt(lite_source, lite_m2_cursor, "...")) {
            lite_m2_cursor = liteFn_m2_skipTrivia(lite_source, lite$addInt(lite_m2_cursor, 3n, 36744), lite_prefix);
            if (((((lite_m2_cursor) >= (lite_m2_size))) || ((!(liteFn_m6_isNameStart(liteFn_m6_at(lite_source, lite_m2_cursor))))))) {
                liteFn_m2_failAt(lite_source, lite_m2_cursor, lite_prefix, "expected a name after ... in host value-pack declaration");
            }
            const lite_m2_nameStart = lite_m2_cursor;
            void lite_m2_nameStart;
            lite_m2_cursor = liteFn_m6_skipName(lite_source, lite_m2_cursor);
            lite_m2_encoded = (("...") + (liteFn_m6_slice(lite_source, lite_m2_nameStart, lite_m2_cursor)));
            lite_m2_count = (-1n);
            lite_m2_cursor = liteFn_m2_skipTrivia(lite_source, lite_m2_cursor, lite_prefix);
            if (((((lite_m2_cursor) < (lite_m2_size))) && (((liteFn_m6_at(lite_source, lite_m2_cursor)) === (","))))) {
                liteFn_m2_failAt(lite_source, lite_m2_cursor, lite_prefix, "host value-pack declaration must be its only parameter");
            }
        } else if (((((lite_m2_cursor) < (lite_m2_size))) && (((liteFn_m6_at(lite_source, lite_m2_cursor)) !== (")"))))) {
            while (Boolean(true)) {
                if (((((lite_m2_cursor) >= (lite_m2_size))) || ((!(liteFn_m6_isNameStart(liteFn_m6_at(lite_source, lite_m2_cursor))))))) {
                    liteFn_m2_failAt(lite_source, lite_m2_cursor, lite_prefix, "expected a parameter name");
                }
                const lite_m2_nameStart = lite_m2_cursor;
                void lite_m2_nameStart;
                lite_m2_cursor = liteFn_m6_skipName(lite_source, lite_m2_cursor);
                const lite_m2_parameterName = liteFn_m6_slice(lite_source, lite_m2_nameStart, lite_m2_cursor);
                void lite_m2_parameterName;
                if (liteFn_m2_isReservedWord(lite_m2_parameterName)) {
                    liteFn_m2_unsupportedFeature(lite_source, lite_m2_nameStart, lite_m2_parameterName, lite_prefix);
                }
                if (liteFn_m7_listContainsText([...(lite_m2_names)], lite_m2_parameterName)) {
                    liteFn_m2_failAt(lite_source, lite_m2_nameStart, lite_prefix, (("duplicate parameter ") + (lite_m2_parameterName)));
                }
                lite_m2_names.push(lite_m2_parameterName);
                lite_m2_cursor = liteFn_m2_skipTrivia(lite_source, lite_m2_cursor, lite_prefix);
                lite_m2_cursor = liteFn_m2_expectSymbol(lite_source, lite_m2_cursor, ":", lite_prefix);
                lite_m2_cursor = liteFn_m2_skipTrivia(lite_source, lite_m2_cursor, lite_prefix);
                let lite_m2_access = "";
                void lite_m2_access;
                if (liteFn_m6_wordAt(lite_source, lite_m2_cursor, "mut")) {
                    if ((!(lite_listIntrinsic))) {
                        liteFn_m2_failAt(lite_source, lite_m2_cursor, lite_prefix, "mut parameter signatures are reserved for registered core declarations");
                    }
                    lite_m2_access = "mut ";
                    lite_m2_cursor = liteFn_m2_skipTrivia(lite_source, lite$addInt(lite_m2_cursor, 3n, 38609), lite_prefix);
                }
                const lite_m2_typed = liteFn_m2_parseFunctionType(lite_source, lite_m2_cursor, lite_prefix, [...(lite_aliases)], lite_m2_genericType);
                void lite_m2_typed;
                lite_m2_cursor = liteFn_m2_skipTrivia(lite_source, (lite_m2_typed).next, lite_prefix);
                if (((lite_m2_count) > (0n))) {
                    lite_m2_encoded = ((lite_m2_encoded) + ("|"));
                }
                lite_m2_encoded = ((((((((lite_m2_encoded) + (lite_m2_parameterName))) + ("="))) + (lite_m2_access))) + ((lite_m2_typed).kind));
                lite_m2_count = lite$addInt(lite_m2_count, 1n, 38939);
                if (((((lite_m2_cursor) < (lite_m2_size))) && (((liteFn_m6_at(lite_source, lite_m2_cursor)) === (","))))) {
                    lite_m2_cursor = liteFn_m2_skipTrivia(lite_source, lite$addInt(lite_m2_cursor, 1n, 39064), lite_prefix);
                } else {
                    break;
                }
            }
        }
        lite_m2_cursor = liteFn_m2_expectSymbol(lite_source, lite_m2_cursor, ")", lite_prefix);
        lite_m2_cursor = liteFn_m2_skipTrivia(lite_source, lite_m2_cursor, lite_prefix);
        lite_m2_cursor = liteFn_m2_expectSymbol(lite_source, lite_m2_cursor, ":", lite_prefix);
        const lite_m2_resultType = liteFn_m2_parseFunctionType(lite_source, lite_m2_cursor, lite_prefix, [...(lite_aliases)], lite_m2_genericType);
        void lite_m2_resultType;
        return { next: (lite_m2_resultType).next, result: (lite_m2_resultType).kind, params: lite_m2_encoded, count: lite_m2_count, genericType: lite_m2_genericType };
    }
    void liteFn_m2_parseFunctionHeader;
    function liteFn_m2_coreHostFunction(lite_moduleIdentity: string, lite_name: string, lite_params: string, lite_result: string): string {
        void lite_moduleIdentity;
        void lite_name;
        void lite_params;
        void lite_result;
        return (Boolean(((lite_moduleIdentity) === ("lite.core.io.v1"))) ? (Boolean(((((lite_params) === ("...values"))) && (((lite_result) === ("Unit"))))) ? (Boolean(((lite_name) === ("output"))) ? "lite$core$io$output:v1" : (Boolean(((lite_name) === ("outputLine"))) ? "lite$core$io$outputLine:v1" : "")) : (Boolean(((((((lite_name) === ("errorLine"))) && (((lite_params) === ("text=String"))))) && (((lite_result) === ("Unit"))))) ? "lite$reportError" : (Boolean(((((((lite_name) === ("exit"))) && (((lite_params) === ("status=Int"))))) && (((lite_result) === ("Unit"))))) ? "lite$exit" : (Boolean(((((((lite_name) === ("inputArgs"))) && (((lite_params) === (""))))) && (((lite_result) === ("List<String>"))))) ? "lite$inputArgs" : (Boolean(((((lite_params) === ("prompt=String"))) && (((lite_result) === ("String"))))) ? (Boolean(((lite_name) === ("inputAll"))) ? "lite$inputAll" : (Boolean(((lite_name) === ("inputLine"))) ? "lite$inputLine" : "")) : (Boolean(((((((lite_params) === ("prompt=String"))) && (((lite_result) === ("Int"))))) && (((lite_name) === ("inputInt"))))) ? "lite$inputInt" : (Boolean(((((((lite_params) === ("prompt=String"))) && (((lite_result) === ("Float"))))) && (((lite_name) === ("inputFloat"))))) ? "lite$inputFloat" : ""))))))) : (Boolean(((lite_moduleIdentity) === ("lite.core.text.v1"))) ? (Boolean(((((((lite_name) === ("length"))) && (((lite_params) === ("text=String"))))) && (((lite_result) === ("Int"))))) ? "lite$textLength" : (Boolean(((((((lite_name) === ("at"))) && (((lite_params) === ("text=String|position=Int"))))) && (((lite_result) === ("String"))))) ? "lite$textAt" : (Boolean(((((((lite_name) === ("slice"))) && (((lite_params) === ("text=String|start=Int|end=Int"))))) && (((lite_result) === ("String"))))) ? "lite$textSlice" : ""))) : (Boolean(((lite_moduleIdentity) === ("lite.core.list.v1"))) ? (Boolean(((((((lite_name) === ("pushBack"))) && (((lite_params) === ("values=mut List<T>|value=T"))))) && (((lite_result) === ("Unit"))))) ? "lite$core$list$pushBack:v1" : (Boolean(((((((lite_name) === ("popBack"))) && (((lite_params) === ("values=mut List<T>"))))) && (((lite_result) === ("T"))))) ? "lite$core$list$popBack:v1" : "")) : (Boolean(((((((((lite_moduleIdentity) === ("lite.compiler.source-reader.v1"))) && (((lite_name) === ("read"))))) && (((lite_params) === ("importer=String|spec=String"))))) && (((lite_result) === ("(path:String,display:String,identity:String,text:String)"))))) ? "lite$readSource" : ""))));
    }
    void liteFn_m2_coreHostFunction;
    function liteFn_m2_coreOutputName(lite_runtime: string): string {
        void lite_runtime;
        return (Boolean(((lite_runtime) === ("lite$core$io$output:v1"))) ? "output" : (Boolean(((lite_runtime) === ("lite$core$io$outputLine:v1"))) ? "outputLine" : ""));
    }
    void liteFn_m2_coreOutputName;
    function liteFn_m2_paramNameOf(lite_entry: string): string {
        void lite_entry;
        const lite_m2_separator = liteFn_m6_indexOfText(lite_entry, "=", 0n);
        void lite_m2_separator;
        if (((lite_m2_separator) < (0n))) {
            return lite_entry;
        }
        return liteFn_m6_slice(lite_entry, 0n, lite_m2_separator);
    }
    void liteFn_m2_paramNameOf;
    function liteFn_m2_paramKindOf(lite_entry: string): string {
        void lite_entry;
        const lite_m2_separator = liteFn_m6_indexOfText(lite_entry, "=", 0n);
        void lite_m2_separator;
        if (((lite_m2_separator) < (0n))) {
            return "";
        }
        return liteFn_m6_slice(lite_entry, lite$addInt(lite_m2_separator, 1n, 42506), liteFn_m6_length(lite_entry));
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
            lite_m2_index = lite$addInt(lite_m2_index, 1n, 45044);
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
        const lite_m2_ch = liteFn_m6_at(lite_source, lite_position);
        void lite_m2_ch;
        if (((lite_m2_ch) === ("*"))) {
            if (liteFn_m6_startsWithAt(lite_source, lite_position, "**")) {
                return { text: "**", width: 2n };
            }
            return { text: "*", width: 1n };
        }
        if (liteFn_m6_startsWithAt(lite_source, lite_position, "=!=")) {
            return { text: "=!=", width: 3n };
        }
        if (liteFn_m6_startsWithAt(lite_source, lite_position, "<!=")) {
            return { text: "<!=", width: 3n };
        }
        if (liteFn_m6_startsWithAt(lite_source, lite_position, ">!=")) {
            return { text: ">!=", width: 3n };
        }
        if (liteFn_m6_startsWithAt(lite_source, lite_position, "==")) {
            return { text: "==", width: 2n };
        }
        if (liteFn_m6_startsWithAt(lite_source, lite_position, "<=")) {
            return { text: "<=", width: 2n };
        }
        if (liteFn_m6_startsWithAt(lite_source, lite_position, ">=")) {
            return { text: ">=", width: 2n };
        }
        if (liteFn_m6_startsWithAt(lite_source, lite_position, "<!")) {
            return { text: "<!", width: 2n };
        }
        if (liteFn_m6_startsWithAt(lite_source, lite_position, ">!")) {
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
        if (liteFn_m6_startsWithAt(lite_source, lite_position, ":/")) {
            return { text: ":/", width: 2n };
        }
        if (liteFn_m6_startsWithAt(lite_source, lite_position, ":%")) {
            return { text: ":%", width: 2n };
        }
        if (liteFn_m6_isNameStart(lite_m2_ch)) {
            const lite_m2_after = liteFn_m6_skipName(lite_source, lite_position);
            void lite_m2_after;
            const lite_m2_word = liteFn_m6_slice(lite_source, lite_position, lite_m2_after);
            void lite_m2_word;
            if (((((lite_m2_word) === ("and"))) || (((lite_m2_word) === ("or"))))) {
                return { text: lite_m2_word, width: lite$subtractInt(lite_m2_after, lite_position, 48174) };
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
        if (((lite_m2_cursor) >= (liteFn_m6_length(lite_source)))) {
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
        if (((lite_position) >= (liteFn_m6_length(lite_source)))) {
            return { text: "", width: 0n };
        }
        const lite_m2_ch = liteFn_m6_at(lite_source, lite_position);
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
        const lite_m2_ch = liteFn_m6_at(lite_source, lite_m2_cursor);
        void lite_m2_ch;
        if (((((lite_m2_ch) === ("+"))) || (((lite_m2_ch) === ("-"))))) {
            lite_m2_negative = ((lite_m2_ch) === ("-"));
            lite_m2_cursor = liteFn_m2_skipTrivia(lite_source, lite$addInt(lite_m2_cursor, 1n, 52802), lite_prefix);
        }
        const lite_m2_start = lite_m2_cursor;
        void lite_m2_start;
        const lite_m2_afterDigit = lite$addInt(lite_m2_cursor, 1n, 52868);
        void lite_m2_afterDigit;
        const lite_m2_following = (Boolean(((lite_m2_afterDigit) < (liteFn_m6_length(lite_source)))) ? liteFn_m6_at(lite_source, lite_m2_afterDigit) : "");
        void lite_m2_following;
        if (((((((((liteFn_m6_isDigit(liteFn_m6_at(lite_source, lite_m2_cursor))) && ((!(liteFn_m6_isDigit(lite_m2_following)))))) && (((lite_m2_following) !== ("."))))) && (((lite_m2_following) !== ("e"))))) && (((lite_m2_following) !== ("E"))))) {
            const lite_m2_digit = liteFn_m6_digitValue(liteFn_m6_at(lite_source, lite_m2_cursor));
            void lite_m2_digit;
            const lite_m2_value = (Boolean(lite_m2_negative) ? lite$negateInt(lite_m2_digit, 53352) : lite_m2_digit);
            void lite_m2_value;
            return liteFn_m2_intParsed(liteFn_m2_targetIntLiteralCode(lite_target, lite_m2_value, lite_m2_negative, liteFn_m6_slice(lite_source, lite_m2_cursor, lite_m2_afterDigit)), lite_m2_value, true, lite_m2_afterDigit);
        }
        const lite_m2_scanned = liteFn_m11_scanNumericLiteral(lite_source, lite_m2_cursor);
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
        while (((((lite$addInt(lite_m2_digitStart, 1n, 53921)) < (lite_m2_integerEnd))) && (((liteFn_m6_at(lite_source, lite_m2_digitStart)) === ("0"))))) {
            lite_m2_digitStart = lite$addInt(lite_m2_digitStart, 1n, 54006);
        }
        if ((lite_m2_scanned).floating) {
            const lite_m2_digits = ((liteFn_m6_slice(lite_source, lite_m2_start, lite_m2_integerEnd)) + (liteFn_m6_slice(lite_source, (lite_m2_scanned).fractionStart, (lite_m2_scanned).fractionEnd)));
            void lite_m2_digits;
            if ((!(liteFn_m11_finiteFloatDigits(lite_m2_digits, lite$subtractInt((lite_m2_scanned).fractionEnd, (lite_m2_scanned).fractionStart, 54236), (lite_m2_scanned).exponent)))) {
                liteFn_m2_failAt(lite_source, lite_position, lite_prefix, "floating literal is not finite");
            }
            const lite_m2_raw = liteFn_m6_slice(lite_source, lite_m2_digitStart, lite_m2_cursor);
            void lite_m2_raw;
            const lite_m2_code = liteFn_m2_targetFloatLiteralCode(lite_target, lite_m2_raw, lite_m2_negative);
            void lite_m2_code;
            return { kind: "Float", code: lite_m2_code, intValue: 0n, textValue: "", constant: false, next: lite_m2_cursor };
        }
        if ((((lite_m2_scanned).outsideInt) || (((((!(lite_m2_negative))) && ((((lite_m2_scanned).magnitude) === ((-9223372036854775808n))))))))) {
            liteFn_m2_failAt(lite_source, lite_position, lite_prefix, "integer literal outside signed 64-bit range");
        }
        const lite_m2_value = (Boolean(lite_m2_negative) ? (lite_m2_scanned).magnitude : lite$subtractInt(0n, (lite_m2_scanned).magnitude, 54850));
        void lite_m2_value;
        const lite_m2_code = liteFn_m2_targetIntLiteralCode(lite_target, lite_m2_value, lite_m2_negative, liteFn_m6_slice(lite_source, lite_m2_digitStart, lite_m2_cursor));
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
        if ((!(liteFn_m11_intExactlyFloat((lite_parsed).intValue)))) {
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
        let lite_m2_cursor = lite$addInt(lite_position, 1n, 56038);
        void lite_m2_cursor;
        let lite_m2_value = "";
        void lite_m2_value;
        while (Boolean(true)) {
            if (((lite_m2_cursor) >= (liteFn_m6_length(lite_source)))) {
                liteFn_m2_failAt(lite_source, lite_m2_literalStart, lite_prefix, "unterminated string literal");
            }
            const lite_m2_ch = liteFn_m6_at(lite_source, lite_m2_cursor);
            void lite_m2_ch;
            if (((lite_m2_ch) === ("\""))) {
                lite_m2_cursor = lite$addInt(lite_m2_cursor, 1n, 56311);
                const lite_m2_next = liteFn_m2_skipTrivia(lite_source, lite_m2_cursor, lite_prefix);
                void lite_m2_next;
                if (((((lite_m2_next) < (liteFn_m6_length(lite_source)))) && (((liteFn_m6_at(lite_source, lite_m2_next)) === ("\""))))) {
                    lite_m2_literalStart = lite_m2_next;
                    lite_m2_cursor = lite$addInt(lite_m2_next, 1n, 56523);
                    continue;
                }
                break;
            }
            if (((lite_m2_ch) === ("\\"))) {
                const lite_m2_escapeStart = lite_m2_cursor;
                void lite_m2_escapeStart;
                lite_m2_cursor = lite$addInt(lite_m2_cursor, 1n, 56684);
                if (((lite_m2_cursor) >= (liteFn_m6_length(lite_source)))) {
                    liteFn_m2_failAt(lite_source, lite_m2_escapeStart, lite_prefix, "unterminated string escape");
                }
                const lite_m2_escaped = liteFn_m6_at(lite_source, lite_m2_cursor);
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
                lite_m2_cursor = lite$addInt(lite_m2_cursor, 1n, 57345);
            } else {
                lite_m2_value = ((lite_m2_value) + (lite_m2_ch));
                lite_m2_cursor = lite$addInt(lite_m2_cursor, 1n, 57427);
            }
        }
        return liteFn_m2_textParsed(liteFn_m2_targetTextLiteralCode(lite_target, lite_m2_value), lite_m2_value, true, lite_m2_cursor);
    }
    void liteFn_m2_parseText;
    function liteFn_m2_skipAliasString(lite_source: string, lite_position: bigint): bigint {
        void lite_source;
        void lite_position;
        const lite_m2_size = liteFn_m6_length(lite_source);
        void lite_m2_size;
        let lite_m2_cursor = lite$addInt(lite_position, 1n, 57810);
        void lite_m2_cursor;
        while (((lite_m2_cursor) < (lite_m2_size))) {
            const lite_m2_ch = liteFn_m6_at(lite_source, lite_m2_cursor);
            void lite_m2_ch;
            if (((lite_m2_ch) === ("\\"))) {
                lite_m2_cursor = lite$addInt(lite_m2_cursor, 2n, 57934);
            } else if (((lite_m2_ch) === ("\""))) {
                return lite$addInt(lite_m2_cursor, 1n, 57996);
            } else {
                lite_m2_cursor = lite$addInt(lite_m2_cursor, 1n, 58046);
            }
        }
        return lite_m2_size;
    }
    void liteFn_m2_skipAliasString;
    function liteFn_m2_targetCodeCalls(lite_code: string, lite_existing: string): string {
        void lite_code;
        void lite_existing;
        if (((((liteFn_m6_indexOfText(lite_code, "lite", 0n)) < (0n))) && (((liteFn_m6_indexOfText(lite_code, "lt_", 0n)) < (0n))))) {
            return lite_existing;
        }
        let lite_m2_calls = lite_existing;
        void lite_m2_calls;
        let lite_m2_cursor = 0n;
        void lite_m2_cursor;
        while (((lite_m2_cursor) < (liteFn_m6_length(lite_code)))) {
            const lite_m2_ch = liteFn_m6_at(lite_code, lite_m2_cursor);
            void lite_m2_ch;
            if (((lite_m2_ch) === ("\""))) {
                lite_m2_cursor = liteFn_m2_skipAliasString(lite_code, lite_m2_cursor);
            } else if (liteFn_m6_isNameStart(lite_m2_ch)) {
                const lite_m2_start = lite_m2_cursor;
                void lite_m2_start;
                lite_m2_cursor = liteFn_m6_skipName(lite_code, lite_m2_cursor);
                if (((((lite_m2_cursor) < (liteFn_m6_length(lite_code)))) && (((liteFn_m6_at(lite_code, lite_m2_cursor)) === ("$"))))) {
                    lite_m2_cursor = liteFn_m6_skipName(lite_code, lite$addInt(lite_m2_cursor, 1n, 58884));
                }
                if (((((lite_m2_cursor) < (liteFn_m6_length(lite_code)))) && (((liteFn_m6_at(lite_code, lite_m2_cursor)) === ("("))))) {
                    const lite_m2_name = liteFn_m6_slice(lite_code, lite_m2_start, lite_m2_cursor);
                    void lite_m2_name;
                    if (((((liteFn_m6_startsWithAt(lite_m2_name, 0n, "lite$")) || (liteFn_m6_startsWithAt(lite_m2_name, 0n, "lite_")))) || (liteFn_m6_startsWithAt(lite_m2_name, 0n, "lt_")))) {
                        const lite_m2_token = ((lite_m2_name) + ("(|"));
                        void lite_m2_token;
                        if (((liteFn_m6_indexOfText(lite_m2_calls, (("|") + (lite_m2_token)), 0n)) < (0n))) {
                            lite_m2_calls = ((lite_m2_calls) + (lite_m2_token));
                        }
                    }
                }
            } else {
                lite_m2_cursor = lite$addInt(lite_m2_cursor, 1n, 59393);
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
        const lite_m2_size = liteFn_m6_length(lite_source);
        void lite_m2_size;
        const lite_m2_start = liteFn_m2_skipTrivia(lite_source, lite_position, lite_prefix);
        void lite_m2_start;
        if (((((lite_m2_start) < (lite_m2_size))) && (((liteFn_m6_at(lite_source, lite_m2_start)) === ("("))))) {
            let lite_m2_cursor = lite_m2_start;
            void lite_m2_cursor;
            let lite_m2_depth = 0n;
            void lite_m2_depth;
            while (((lite_m2_cursor) < (lite_m2_size))) {
                const lite_m2_ch = liteFn_m6_at(lite_source, lite_m2_cursor);
                void lite_m2_ch;
                if (((lite_m2_ch) === ("\""))) {
                    lite_m2_cursor = liteFn_m2_skipAliasString(lite_source, lite_m2_cursor);
                } else if (liteFn_m6_startsWithAt(lite_source, lite_m2_cursor, "/*")) {
                    lite_m2_cursor = liteFn_m2_skipComment(lite_source, lite_m2_cursor, lite_prefix);
                } else if (((lite_m2_ch) === ("("))) {
                    lite_m2_depth = lite$addInt(lite_m2_depth, 1n, 60503);
                    lite_m2_cursor = lite$addInt(lite_m2_cursor, 1n, 60540);
                } else if (((lite_m2_ch) === (")"))) {
                    lite_m2_depth = lite$subtractInt(lite_m2_depth, 1n, 60609);
                    lite_m2_cursor = lite$addInt(lite_m2_cursor, 1n, 60646);
                    if (((lite_m2_depth) === (0n))) {
                        return { text: liteFn_m6_slice(lite_source, lite_m2_start, lite_m2_cursor), next: lite_m2_cursor };
                    }
                } else {
                    lite_m2_cursor = lite$addInt(lite_m2_cursor, 1n, 60843);
                }
            }
            return { text: liteFn_m6_slice(lite_source, lite_m2_start, lite_m2_size), next: lite_m2_size };
        } else {
            const lite_m2_parsedName = liteFn_m2_typeNameAt(lite_source, lite_m2_start, lite_prefix);
            void lite_m2_parsedName;
            const lite_m2_after = (lite_m2_parsedName).next;
            void lite_m2_after;
            const lite_m2_afterName = liteFn_m2_skipTrivia(lite_source, lite_m2_after, lite_prefix);
            void lite_m2_afterName;
            if (((((lite_m2_afterName) < (lite_m2_size))) && (((liteFn_m6_at(lite_source, lite_m2_afterName)) === ("<"))))) {
                let lite_m2_cursor = lite_m2_afterName;
                void lite_m2_cursor;
                let lite_m2_depth = 0n;
                void lite_m2_depth;
                while (((lite_m2_cursor) < (lite_m2_size))) {
                    const lite_m2_ch = liteFn_m6_at(lite_source, lite_m2_cursor);
                    void lite_m2_ch;
                    if (liteFn_m6_startsWithAt(lite_source, lite_m2_cursor, "/*")) {
                        lite_m2_cursor = liteFn_m2_skipComment(lite_source, lite_m2_cursor, lite_prefix);
                    } else if (((lite_m2_ch) === ("<"))) {
                        lite_m2_depth = lite$addInt(lite_m2_depth, 1n, 61518);
                        lite_m2_cursor = lite$addInt(lite_m2_cursor, 1n, 61559);
                    } else if (((lite_m2_ch) === (">"))) {
                        lite_m2_depth = lite$subtractInt(lite_m2_depth, 1n, 61636);
                        lite_m2_cursor = lite$addInt(lite_m2_cursor, 1n, 61677);
                        if (((lite_m2_depth) === (0n))) {
                            return { text: liteFn_m6_slice(lite_source, lite_m2_start, lite_m2_cursor), next: lite_m2_cursor };
                        }
                    } else {
                        lite_m2_cursor = lite$addInt(lite_m2_cursor, 1n, 61894);
                    }
                }
                return { text: liteFn_m6_slice(lite_source, lite_m2_start, lite_m2_size), next: lite_m2_size };
            } else {
                return { text: liteFn_m6_slice(lite_source, lite_m2_start, lite_m2_after), next: lite_m2_after };
            }
        }
    }
    void liteFn_m2_collectTypeTarget;
    function liteFn_m2_collectAliases(lite_source: string, lite_prefix: string): { name: string; target: string; at: bigint; end: bigint }[] {
        void lite_source;
        void lite_prefix;
        const lite_m2_aliases: { name: string; target: string; at: bigint; end: bigint }[] = [...([])];
        void lite_m2_aliases;
        const lite_m2_size = liteFn_m6_length(lite_source);
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
            const lite_m2_ch = liteFn_m6_at(lite_source, lite_m2_position);
            void lite_m2_ch;
            if (((lite_m2_ch) === ("\""))) {
                lite_m2_position = liteFn_m2_skipAliasString(lite_source, lite_m2_position);
            } else if (((lite_m2_ch) === ("{"))) {
                lite_m2_depth = lite$addInt(lite_m2_depth, 1n, 62746);
                lite_m2_position = lite$addInt(lite_m2_position, 1n, 62783);
            } else if (((lite_m2_ch) === ("}"))) {
                if (((lite_m2_depth) > (0n))) {
                    lite_m2_depth = lite$subtractInt(lite_m2_depth, 1n, 62859);
                }
                lite_m2_position = lite$addInt(lite_m2_position, 1n, 62898);
            } else if (((((lite_m2_depth) === (0n))) && (liteFn_m6_isNameStart(lite_m2_ch)))) {
                const lite_m2_nameStart = lite_m2_position;
                void lite_m2_nameStart;
                const lite_m2_afterName = liteFn_m6_skipName(lite_source, lite_m2_position);
                void lite_m2_afterName;
                const lite_m2_name = liteFn_m6_slice(lite_source, lite_m2_nameStart, lite_m2_afterName);
                void lite_m2_name;
                const lite_m2_aliasPosition = liteFn_m2_skipTrivia(lite_source, lite_m2_afterName, lite_prefix);
                void lite_m2_aliasPosition;
                if (liteFn_m6_startsWithAt(lite_source, lite_m2_aliasPosition, ":=")) {
                    const lite_m2_typePosition = liteFn_m2_skipTrivia(lite_source, lite$addInt(lite_m2_aliasPosition, 2n, 63323), lite_prefix);
                    void lite_m2_typePosition;
                    if (liteFn_m6_wordAt(lite_source, lite_m2_typePosition, "type")) {
                        const lite_m2_targetStart = liteFn_m2_skipTrivia(lite_source, lite$addInt(lite_m2_typePosition, 4n, 63470), lite_prefix);
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
                lite_m2_position = lite$addInt(lite_m2_position, 1n, 63874);
            }
        }
        return [...(lite_m2_aliases)];
    }
    void liteFn_m2_collectAliases;
    function liteFn_m2_isSingleEquals(lite_source: string, lite_position: bigint): boolean {
        void lite_source;
        void lite_position;
        return ((((liteFn_m6_startsWithAt(lite_source, lite_position, "=")) && ((!(liteFn_m6_startsWithAt(lite_source, lite_position, "==")))))) && ((!(liteFn_m6_startsWithAt(lite_source, lite_position, "=!=")))));
    }
    void liteFn_m2_isSingleEquals;
    function liteFn_m2_looksLikeTupleEntry(lite_source: string, lite_position: bigint, lite_prefix: string): boolean {
        void lite_source;
        void lite_position;
        void lite_prefix;
        const lite_m2_start = liteFn_m2_skipTrivia(lite_source, lite_position, lite_prefix);
        void lite_m2_start;
        if (((((lite_m2_start) >= (liteFn_m6_length(lite_source)))) || ((!(liteFn_m6_isNameStart(liteFn_m6_at(lite_source, lite_m2_start))))))) {
            return false;
        }
        const lite_m2_afterName = liteFn_m2_skipTrivia(lite_source, liteFn_m6_skipName(lite_source, lite_m2_start), lite_prefix);
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
    function liteFn_m2_expectNonemptyCallClose(lite_source: string, lite_position: bigint, lite_prefix: string): bigint {
        void lite_source;
        void lite_position;
        void lite_prefix;
        let lite_m2_cursor = liteFn_m2_skipTrivia(lite_source, lite_position, lite_prefix);
        void lite_m2_cursor;
        if (((((lite_m2_cursor) < (liteFn_m6_length(lite_source)))) && (((liteFn_m6_at(lite_source, lite_m2_cursor)) === (","))))) {
            lite_m2_cursor = liteFn_m2_skipTrivia(lite_source, lite$addInt(lite_m2_cursor, 1n, 65338), lite_prefix);
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
        let lite_m2_cursor = liteFn_m2_skipTrivia(lite_source, lite$addInt(lite_open, 1n, 65754), lite_prefix);
        void lite_m2_cursor;
        if ((!(liteFn_m6_wordAt(lite_source, lite_m2_cursor, "mut")))) {
            liteFn_m2_failAt(lite_source, lite_m2_cursor, lite_prefix, ((lite_operation) + (" requires mut list argument")));
        }
        lite_m2_cursor = liteFn_m2_skipTrivia(lite_source, lite$addInt(lite_m2_cursor, 3n, 65947), lite_prefix);
        if (((((lite_m2_cursor) >= (liteFn_m6_length(lite_source)))) || ((!(liteFn_m6_isNameStart(liteFn_m6_at(lite_source, lite_m2_cursor))))))) {
            liteFn_m2_failAt(lite_source, lite_m2_cursor, lite_prefix, "expected a list name after mut");
        }
        const lite_m2_nameEnd = liteFn_m6_skipName(lite_source, lite_m2_cursor);
        void lite_m2_nameEnd;
        const lite_m2_listName = liteFn_m6_slice(lite_source, lite_m2_cursor, lite_m2_nameEnd);
        void lite_m2_listName;
        const lite_m2_index = liteFn_m2_localIndex([...(lite_locals)], lite_m2_listName);
        void lite_m2_index;
        if (((lite_m2_index) < (0n))) {
            liteFn_m2_failAt(lite_source, lite_m2_cursor, lite_prefix, (("unknown value ") + (lite_m2_listName)));
            return { runtime: "", kind: "", next: lite_m2_nameEnd };
        }
        const lite_m2_entry = lite$listAt((lite_locals), lite_m2_index, 66458);
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
        const lite_m2_size = liteFn_m6_length(lite_source);
        void lite_m2_size;
        while (((lite_m2_cursor) < (lite_m2_size))) {
            const lite_m2_ch = liteFn_m6_at(lite_source, lite_m2_cursor);
            void lite_m2_ch;
            if (((lite_m2_ch) === ("\""))) {
                lite_m2_cursor = liteFn_m2_skipAliasString(lite_source, lite_m2_cursor);
            } else if (liteFn_m6_startsWithAt(lite_source, lite_m2_cursor, "/*")) {
                lite_m2_cursor = liteFn_m2_skipComment(lite_source, lite_m2_cursor, lite_prefix);
            } else if (((lite_m2_ch) === ("("))) {
                lite_m2_depth = lite$addInt(lite_m2_depth, 1n, 67363);
                lite_m2_cursor = lite$addInt(lite_m2_cursor, 1n, 67384);
            } else if (((lite_m2_ch) === (")"))) {
                lite_m2_depth = lite$subtractInt(lite_m2_depth, 1n, 67445);
                lite_m2_cursor = lite$addInt(lite_m2_cursor, 1n, 67478);
                if (((lite_m2_depth) === (0n))) {
                    return lite_m2_cursor;
                }
            } else {
                lite_m2_cursor = lite$addInt(lite_m2_cursor, 1n, 67561);
            }
        }
        return (-1n);
    }
    void liteFn_m2_scanParenEnd;
    function liteFn_m2_tupleZeroParsed(lite_kind: string, lite_next: bigint): { kind: string; code: string; intValue: bigint; textValue: string; constant: boolean; next: bigint } {
        void lite_kind;
        void lite_next;
        const lite_m2_size = liteFn_m6_length(lite_kind);
        void lite_m2_size;
        let lite_m2_cursor = 1n;
        void lite_m2_cursor;
        let lite_m2_code = "{ ";
        void lite_m2_code;
        let lite_m2_count = 0n;
        void lite_m2_count;
        while (((((lite_m2_cursor) < (lite_m2_size))) && (((liteFn_m6_at(lite_kind, lite_m2_cursor)) !== (")"))))) {
            const lite_m2_nameStart = lite_m2_cursor;
            void lite_m2_nameStart;
            lite_m2_cursor = liteFn_m6_skipName(lite_kind, lite_m2_cursor);
            const lite_m2_label = liteFn_m6_slice(lite_kind, lite_m2_nameStart, lite_m2_cursor);
            void lite_m2_label;
            if (((((lite_m2_cursor) < (lite_m2_size))) && (((liteFn_m6_at(lite_kind, lite_m2_cursor)) === (":"))))) {
                lite_m2_cursor = lite$addInt(lite_m2_cursor, 1n, 68100);
            }
            const lite_m2_typeStart = lite_m2_cursor;
            void lite_m2_typeStart;
            lite_m2_cursor = liteFn_m6_skipName(lite_kind, lite_m2_cursor);
            const lite_m2_fieldKind = liteFn_m6_slice(lite_kind, lite_m2_typeStart, lite_m2_cursor);
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
            lite_m2_count = lite$addInt(lite_m2_count, 1n, 68567);
            if (((((lite_m2_cursor) < (lite_m2_size))) && (((liteFn_m6_at(lite_kind, lite_m2_cursor)) === (","))))) {
                lite_m2_cursor = lite$addInt(lite_m2_cursor, 1n, 68651);
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
        if (liteFn_m6_wordAt(lite_source, lite_m2_cursor, "mut")) {
            lite_m2_writable = true;
            lite_m2_cursor = liteFn_m2_skipTrivia(lite_source, lite$addInt(lite_m2_cursor, 3n, 70049), lite_prefix);
        }
        const lite_m2_typed = liteFn_m2_parseTypeAt(lite_source, lite_m2_cursor, lite_prefix, [...(lite_aliases)], "local", "");
        void lite_m2_typed;
        if ((((lite_m2_typed).kind) === ("Unit"))) {
            const lite_m2_name = liteFn_m6_slice(lite_source, lite_m2_cursor, liteFn_m6_skipName(lite_source, lite_m2_cursor));
            void lite_m2_name;
            liteFn_m2_failAt(lite_source, lite_m2_cursor, lite_prefix, (("unsupported local type ") + (lite_m2_name)));
        }
        if (((lite_m2_writable) && ((!(liteFn_m2_isListKind((lite_m2_typed).kind)))))) {
            liteFn_m2_failAt(lite_source, lite_m2_start, lite_prefix, (("mut requires a List type, got ") + (liteFn_m2_displayKind((lite_m2_typed).kind))));
        }
        return { kind: (lite_m2_typed).kind, writable: lite_m2_writable, next: (lite_m2_typed).next };
    }
    void liteFn_m2_parseLocalType;
    function liteFn_m2_skipItemSeparators(lite_source: string, lite_position: bigint, lite_prefix: string): bigint {
        void lite_source;
        void lite_position;
        void lite_prefix;
        let lite_m2_next = liteFn_m2_skipTrivia(lite_source, lite_position, lite_prefix);
        void lite_m2_next;
        while (((((lite_m2_next) < (liteFn_m6_length(lite_source)))) && (((liteFn_m6_at(lite_source, lite_m2_next)) === (";"))))) {
            lite_m2_next = liteFn_m2_skipTrivia(lite_source, lite$addInt(lite_m2_next, 1n, 70888), lite_prefix);
        }
        return lite_m2_next;
    }
    void liteFn_m2_skipItemSeparators;
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
        if (((lite_m2_start) >= (liteFn_m6_length(lite_source)))) {
            liteFn_m2_failAt(lite_source, lite_m2_start, lite_prefix, "expected an Int, Float, String or Bool expression");
        }
        const lite_m2_effectiveMinimum = (Boolean(((lite_minimum) < (0n))) ? 0n : lite_minimum);
        void lite_m2_effectiveMinimum;
        let lite_m2_leaderStart = (-1n);
        void lite_m2_leaderStart;
        let lite_m2_leaderText = "";
        void lite_m2_leaderText;
        if (((((lite_m2_effectiveMinimum) === (0n))) && ((((liteFn_m6_wordAt(lite_source, lite_m2_start, "and")) || (liteFn_m6_wordAt(lite_source, lite_m2_start, "or"))))))) {
            lite_m2_leaderStart = lite_m2_start;
            const lite_m2_leaderEnd = liteFn_m6_skipName(lite_source, lite_m2_start);
            void lite_m2_leaderEnd;
            lite_m2_leaderText = liteFn_m6_slice(lite_source, lite_m2_start, lite_m2_leaderEnd);
            lite_m2_start = liteFn_m2_skipTrivia(lite_source, lite_m2_leaderEnd, lite_prefix);
            if (((liteFn_m6_wordAt(lite_source, lite_m2_start, "and")) || (liteFn_m6_wordAt(lite_source, lite_m2_start, "or")))) {
                liteFn_m2_failAt(lite_source, lite_m2_start, lite_prefix, (((("leading ") + (lite_m2_leaderText))) + (" may appear only once")));
            }
        }
        let lite_m2_left = liteFn_m2_intParsed("", 0n, true, lite_m2_start);
        void lite_m2_left;
        const lite_m2_ch = liteFn_m6_at(lite_source, lite_m2_start);
        void lite_m2_ch;
        if (((lite_m2_ch) === ("("))) {
            if (((liteFn_m6_at(lite_source, liteFn_m2_skipTrivia(lite_source, lite$addInt(lite_m2_start, 1n, 72539), lite_prefix))) === (")"))) {
                lite_m2_left = { kind: "Unit", code: liteFn_m2_targetUnitLiteralCode(lite_target), intValue: 0n, textValue: "", constant: true, next: lite$addInt(liteFn_m2_skipTrivia(lite_source, lite$addInt(lite_m2_start, 1n, 72714), lite_prefix), 1n, 72727) };
            } else if (liteFn_m2_looksLikeTupleEntry(lite_source, lite$addInt(lite_m2_start, 1n, 72785), lite_prefix)) {
                let lite_m2_cursor = liteFn_m2_skipTrivia(lite_source, lite$addInt(lite_m2_start, 1n, 72851), lite_prefix);
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
                    if (((((lite_m2_cursor) >= (liteFn_m6_length(lite_source)))) || ((!(liteFn_m6_isNameStart(liteFn_m6_at(lite_source, lite_m2_cursor))))))) {
                        liteFn_m2_failAt(lite_source, lite_m2_cursor, lite_prefix, "expected a tuple field name");
                    }
                    const lite_m2_labelStart = lite_m2_cursor;
                    void lite_m2_labelStart;
                    lite_m2_cursor = liteFn_m6_skipName(lite_source, lite_m2_cursor);
                    const lite_m2_label = liteFn_m6_slice(lite_source, lite_m2_labelStart, lite_m2_cursor);
                    void lite_m2_label;
                    if (liteFn_m2_isReservedWord(lite_m2_label)) {
                        liteFn_m2_unsupportedFeature(lite_source, lite_m2_labelStart, lite_m2_label, lite_prefix);
                    }
                    if (liteFn_m7_listContainsText([...(lite_m2_labels)], lite_m2_label)) {
                        liteFn_m2_failAt(lite_source, lite_m2_labelStart, lite_prefix, (("duplicate tuple field ") + (lite_m2_label)));
                    }
                    lite_m2_labels.push(lite_m2_label);
                    lite_m2_cursor = liteFn_m2_skipTrivia(lite_source, lite_m2_cursor, lite_prefix);
                    if ((!(liteFn_m2_isSingleEquals(lite_source, lite_m2_cursor)))) {
                        liteFn_m2_failAt(lite_source, lite_m2_cursor, lite_prefix, (("expected = after tuple field ") + (lite_m2_label)));
                    }
                    lite_m2_cursor = liteFn_m2_skipTrivia(lite_source, lite$addInt(lite_m2_cursor, 1n, 74020), lite_prefix);
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
                    lite_m2_count = lite$addInt(lite_m2_count, 1n, 74879);
                    lite_m2_cursor = liteFn_m2_skipTrivia(lite_source, (lite_m2_value).next, lite_prefix);
                    if (((((lite_m2_cursor) < (liteFn_m6_length(lite_source)))) && (((liteFn_m6_at(lite_source, lite_m2_cursor)) === (","))))) {
                        lite_m2_cursor = liteFn_m2_skipTrivia(lite_source, lite$addInt(lite_m2_cursor, 1n, 75095), lite_prefix);
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
                    lite_m2_kindText = ((((((lite_m2_kindText) + (lite$listAt((lite_m2_labels), lite_m2_index, 75574)))) + (":"))) + (lite$listAt((lite_m2_kinds), lite_m2_index, 75595)));
                    lite_m2_codeText = ((((((lite_m2_codeText) + (lite$listAt((lite_m2_labels), lite_m2_index, 75648)))) + (": "))) + (lite$listAt((lite_m2_codes), lite_m2_index, 75670)));
                    lite_m2_index = lite$addInt(lite_m2_index, 1n, 75708);
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
                const lite_m2_inner = liteFn_m2_parseBinary(lite_target, lite_source, lite$addInt(lite_m2_start, 1n, 76196), lite_prefix, [...(lite_locals)], [...(lite_functions)], [...(lite_params)], lite_currentName, lite_m2_groupedExpected, 0n);
                void lite_m2_inner;
                const lite_m2_next = liteFn_m2_expectSymbol(lite_source, liteFn_m2_skipTrivia(lite_source, (lite_m2_inner).next, lite_prefix), ")", lite_prefix);
                void lite_m2_next;
                lite_m2_left = { kind: (lite_m2_inner).kind, code: (((("(") + ((lite_m2_inner).code))) + (")")), intValue: (lite_m2_inner).intValue, textValue: (lite_m2_inner).textValue, constant: (lite_m2_inner).constant, next: lite_m2_next };
            }
        } else if (((((lite_m2_ch) === ("+"))) || (((lite_m2_ch) === ("-"))))) {
            const lite_m2_after = liteFn_m2_skipTrivia(lite_source, lite$addInt(lite_m2_start, 1n, 76623), lite_prefix);
            void lite_m2_after;
            if (((((lite_m2_after) < (liteFn_m6_length(lite_source)))) && (liteFn_m6_isDigit(liteFn_m6_at(lite_source, lite_m2_after))))) {
                lite_m2_left = liteFn_m2_parseNumber(lite_target, lite_source, lite_m2_start, lite_prefix);
                if (((((lite_expected) === ("Float"))) && (((lite_m2_ch) === ("-"))))) {
                    lite_m2_left = liteFn_m2_floatContextNumber(lite_target, lite_source, lite_m2_start, lite_prefix, lite_m2_left, lite_minimum);
                }
            } else {
                const lite_m2_operand = liteFn_m2_parseBinary(lite_target, lite_source, lite$addInt(lite_m2_start, 1n, 76984), lite_prefix, [...(lite_locals)], [...(lite_functions)], [...(lite_params)], lite_currentName, "", 30n);
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
        } else if (liteFn_m6_isDigit(lite_m2_ch)) {
            lite_m2_left = liteFn_m2_parseNumber(lite_target, lite_source, lite_m2_start, lite_prefix);
            if (((lite_expected) === ("Float"))) {
                lite_m2_left = liteFn_m2_floatContextNumber(lite_target, lite_source, lite_m2_start, lite_prefix, lite_m2_left, lite_minimum);
            }
        } else if (((lite_m2_ch) === ("\""))) {
            lite_m2_left = liteFn_m2_parseText(lite_target, lite_source, lite_m2_start, lite_prefix);
        } else if (((lite_m2_ch) === ("["))) {
            let lite_m2_cursor = liteFn_m2_skipTrivia(lite_source, lite$addInt(lite_m2_start, 1n, 78455), lite_prefix);
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
                if (((lite_m2_cursor) >= (liteFn_m6_length(lite_source)))) {
                    liteFn_m2_failAt(lite_source, lite_m2_cursor, lite_prefix, "expected ] in list literal");
                }
                if (((liteFn_m6_at(lite_source, lite_m2_cursor)) === ("]"))) {
                    break;
                }
                const lite_m2_elementStart = lite_m2_cursor;
                void lite_m2_elementStart;
                const lite_m2_element = liteFn_m2_parseBinary(lite_target, lite_source, lite_m2_cursor, lite_prefix, [...(lite_locals)], [...(lite_functions)], [...(lite_params)], lite_currentName, lite_m2_elementKind, 0n);
                void lite_m2_element;
                if ((((lite_m2_element).kind) === ("Unit"))) {
                    liteFn_m2_failAt(lite_source, lite_m2_elementStart, lite_prefix, (((("list element ") + (liteFn_m3_decimalText(lite$addInt(lite_m2_count, 1n, 79160))))) + (" cannot be Unit")));
                }
                if (liteFn_m2_isListKind((lite_m2_element).kind)) {
                    liteFn_m2_failAt(lite_source, lite_m2_elementStart, lite_prefix, "nested list types are not supported");
                }
                if (((lite_m2_elementKind) === (""))) {
                    lite_m2_elementKind = (lite_m2_element).kind;
                } else if ((((lite_m2_element).kind) !== (lite_m2_elementKind))) {
                    liteFn_m2_failAt(lite_source, lite_m2_elementStart, lite_prefix, (((((((((("list element ") + (liteFn_m3_decimalText(lite$addInt(lite_m2_count, 1n, 79581))))) + (" must be "))) + (liteFn_m2_displayKind(lite_m2_elementKind)))) + (", got "))) + (liteFn_m2_displayKind((lite_m2_element).kind))));
                }
                lite_m2_elementCodes.push((lite_m2_element).code);
                lite_m2_count = lite$addInt(lite_m2_count, 1n, 79790);
                lite_m2_cursor = liteFn_m2_skipTrivia(lite_source, (lite_m2_element).next, lite_prefix);
                if (((((lite_m2_cursor) < (liteFn_m6_length(lite_source)))) && (((liteFn_m6_at(lite_source, lite_m2_cursor)) === (","))))) {
                    lite_m2_cursor = liteFn_m2_skipTrivia(lite_source, lite$addInt(lite_m2_cursor, 1n, 79996), lite_prefix);
                } else {
                    break;
                }
            }
            lite_m2_cursor = liteFn_m2_expectSymbol(lite_source, lite_m2_cursor, "]", lite_prefix);
            if (((((lite_m2_count) === (0n))) && (((lite_m2_elementKind) === (""))))) {
                liteFn_m2_failAt(lite_source, lite_m2_start, lite_prefix, "empty list literal requires a List element type");
            }
            lite_m2_left = { kind: (((("List<") + (lite_m2_elementKind))) + (">")), code: (((("[") + (liteFn_m6_joinTexts([...(lite_m2_elementCodes)], ", ")))) + ("]")), intValue: 0n, textValue: "", constant: false, next: lite_m2_cursor };
        } else if (((lite_m2_ch) === ("{"))) {
            const lite_m2_blockLocals: { name: string; runtime: string; kind: string; mutable: boolean; writable: boolean; depth: bigint; constant: boolean; code: string; intValue: bigint; textValue: string }[] = [...([])];
            void lite_m2_blockLocals;
            for (const lite_m2_entry of [...(lite_locals)]) {
                void lite_m2_entry;
                lite_m2_blockLocals.push(lite_m2_entry);
            }
            const lite_m2_statements: string[] = [...([])];
            void lite_m2_statements;
            let lite_m2_statementCount = 0n;
            void lite_m2_statementCount;
            let lite_m2_cursor = liteFn_m2_skipItemSeparators(lite_source, lite$addInt(lite_m2_start, 1n, 80749), lite_prefix);
            void lite_m2_cursor;
            let lite_m2_blockKind = "Unit";
            void lite_m2_blockKind;
            let lite_m2_blockCode = liteFn_m2_targetUnitLiteralCode(lite_target);
            void lite_m2_blockCode;
            let lite_m2_blockInt = 0n;
            void lite_m2_blockInt;
            let lite_m2_blockText = "";
            void lite_m2_blockText;
            let lite_m2_blockConstant = true;
            void lite_m2_blockConstant;
            while (Boolean(true)) {
                lite_m2_cursor = liteFn_m2_skipItemSeparators(lite_source, lite_m2_cursor, lite_prefix);
                if (((lite_m2_cursor) >= (liteFn_m6_length(lite_source)))) {
                    liteFn_m2_failAt(lite_source, lite_m2_start, lite_prefix, "expected }");
                }
                if (((liteFn_m6_at(lite_source, lite_m2_cursor)) === ("}"))) {
                    lite_m2_cursor = lite$addInt(lite_m2_cursor, 1n, 81236);
                    break;
                }
                let lite_m2_isStatement = false;
                void lite_m2_isStatement;
                if (liteFn_m6_isNameStart(liteFn_m6_at(lite_source, lite_m2_cursor))) {
                    const lite_m2_itemStart = lite_m2_cursor;
                    void lite_m2_itemStart;
                    const lite_m2_itemEnd = liteFn_m6_skipName(lite_source, lite_m2_itemStart);
                    void lite_m2_itemEnd;
                    const lite_m2_itemName = liteFn_m6_slice(lite_source, lite_m2_itemStart, lite_m2_itemEnd);
                    void lite_m2_itemName;
                    const lite_m2_afterItemName = liteFn_m2_skipTrivia(lite_source, lite_m2_itemEnd, lite_prefix);
                    void lite_m2_afterItemName;
                    if (((lite_m2_itemName) === ("var"))) {
                        lite_m2_isStatement = true;
                        const lite_m2_localStart = liteFn_m2_skipTrivia(lite_source, lite_m2_itemEnd, lite_prefix);
                        void lite_m2_localStart;
                        if (((((lite_m2_localStart) >= (liteFn_m6_length(lite_source)))) || ((!(liteFn_m6_isNameStart(liteFn_m6_at(lite_source, lite_m2_localStart))))))) {
                            liteFn_m2_failAt(lite_source, lite_m2_localStart, lite_prefix, "expected local name after var");
                        }
                        const lite_m2_localEnd = liteFn_m6_skipName(lite_source, lite_m2_localStart);
                        void lite_m2_localEnd;
                        const lite_m2_localName = liteFn_m6_slice(lite_source, lite_m2_localStart, lite_m2_localEnd);
                        void lite_m2_localName;
                        if (liteFn_m2_isReservedWord(lite_m2_localName)) {
                            liteFn_m2_unsupportedFeature(lite_source, lite_m2_localStart, lite_m2_localName, lite_prefix);
                        }
                        let lite_m2_afterLocal = liteFn_m2_skipTrivia(lite_source, lite_m2_localEnd, lite_prefix);
                        void lite_m2_afterLocal;
                        let lite_m2_declParsed = liteFn_m2_intParsed("", 0n, true, lite_m2_afterLocal);
                        void lite_m2_declParsed;
                        let lite_m2_declWritable = false;
                        void lite_m2_declWritable;
                        if (liteFn_m6_startsWithAt(lite_source, lite_m2_afterLocal, ":=")) {
                            lite_m2_declParsed = liteFn_m2_parseBinary(lite_target, lite_source, liteFn_m2_skipTrivia(lite_source, lite$addInt(lite_m2_afterLocal, 2n, 82626), lite_prefix), lite_prefix, [...(lite_m2_blockLocals)], [...(lite_functions)], [...(lite_params)], lite_currentName, "", 0n);
                            if ((((lite_m2_declParsed).kind) === ("Unit"))) {
                                liteFn_m2_failAt(lite_source, lite_m2_localStart, lite_prefix, (("cannot declare a Unit local ") + (lite_m2_localName)));
                            }
                        } else if (((((lite_m2_afterLocal) < (liteFn_m6_length(lite_source)))) && (((liteFn_m6_at(lite_source, lite_m2_afterLocal)) === (":"))))) {
                            const lite_m2_emptyAliases: { name: string; target: string; at: bigint; end: bigint }[] = [...([])];
                            void lite_m2_emptyAliases;
                            const lite_m2_typed = liteFn_m2_parseLocalType(lite_source, lite$addInt(lite_m2_afterLocal, 1n, 83127), lite_prefix, [...(lite_m2_emptyAliases)]);
                            void lite_m2_typed;
                            lite_m2_declWritable = (lite_m2_typed).writable;
                            const lite_m2_afterType = liteFn_m2_skipTrivia(lite_source, (lite_m2_typed).next, lite_prefix);
                            void lite_m2_afterType;
                            if (liteFn_m2_isSingleEquals(lite_source, lite_m2_afterType)) {
                                lite_m2_declParsed = liteFn_m2_parseBinary(lite_target, lite_source, liteFn_m2_skipTrivia(lite_source, lite$addInt(lite_m2_afterType, 1n, 83441), lite_prefix), lite_prefix, [...(lite_m2_blockLocals)], [...(lite_functions)], [...(lite_params)], lite_currentName, (lite_m2_typed).kind, 0n);
                                if ((((lite_m2_declParsed).kind) !== ((lite_m2_typed).kind))) {
                                    liteFn_m2_failAt(lite_source, lite_m2_localStart, lite_prefix, (((((("cannot initialize ") + (liteFn_m2_displayKind((lite_m2_typed).kind)))) + (" with "))) + (liteFn_m2_displayKind((lite_m2_declParsed).kind))));
                                }
                            } else {
                                lite_m2_declParsed = liteFn_m2_zeroParsed(lite_target, (lite_m2_typed).kind, lite_m2_afterType);
                            }
                        } else {
                            liteFn_m2_failAt(lite_source, lite_m2_afterLocal, lite_prefix, (("expected := or : after local name ") + (lite_m2_localName)));
                        }
                        const lite_m2_statementNext = liteFn_m2_consumeStatementEnd(lite_source, (lite_m2_declParsed).next, lite_prefix);
                        void lite_m2_statementNext;
                        if (((lite_m2_statementNext) < (0n))) {
                            liteFn_m2_failAt(lite_source, liteFn_m2_skipTrivia(lite_source, (lite_m2_declParsed).next, lite_prefix), lite_prefix, (("expected ; after local declaration ") + (lite_m2_localName)));
                        }
                        const lite_m2_runtime = liteFn_m2_localRuntimeName([...(lite_m2_blockLocals)], lite_m2_localName, lite_m2_localStart, 0n);
                        void lite_m2_runtime;
                        lite_m2_blockLocals.push({ name: lite_m2_localName, runtime: lite_m2_runtime, kind: (lite_m2_declParsed).kind, mutable: true, writable: lite_m2_declWritable, depth: 1n, constant: false, code: (lite_m2_declParsed).code, intValue: (lite_m2_declParsed).intValue, textValue: (lite_m2_declParsed).textValue });
                        lite_m2_statements.push((((((((((((("let ") + (lite_m2_runtime))) + (" = "))) + (liteFn_m2_copiedValueCode(lite_target, (lite_m2_declParsed).kind, (lite_m2_declParsed).code)))) + ("; void "))) + (lite_m2_runtime))) + (";")));
                        lite_m2_statementCount = lite$addInt(lite_m2_statementCount, 1n, 84970);
                        lite_m2_blockConstant = false;
                        lite_m2_cursor = lite_m2_statementNext;
                    } else if (((((((liteFn_m6_startsWithAt(lite_source, lite_m2_afterItemName, ":=")) && ((!(liteFn_m6_wordAt(lite_source, liteFn_m2_skipTrivia(lite_source, lite$addInt(lite_m2_afterItemName, 2n, 85222), lite_prefix), "fn")))))) && ((!(liteFn_m6_wordAt(lite_source, liteFn_m2_skipTrivia(lite_source, lite$addInt(lite_m2_afterItemName, 2n, 85326), lite_prefix), "type")))))) && ((!(liteFn_m6_wordAt(lite_source, liteFn_m2_skipTrivia(lite_source, lite$addInt(lite_m2_afterItemName, 2n, 85432), lite_prefix), "import")))))) {
                        lite_m2_isStatement = true;
                        if (liteFn_m2_isReservedWord(lite_m2_itemName)) {
                            liteFn_m2_unsupportedFeature(lite_source, lite_m2_itemStart, lite_m2_itemName, lite_prefix);
                        }
                        const lite_m2_declParsed = liteFn_m2_parseBinary(lite_target, lite_source, liteFn_m2_skipTrivia(lite_source, lite$addInt(lite_m2_afterItemName, 2n, 85695), lite_prefix), lite_prefix, [...(lite_m2_blockLocals)], [...(lite_functions)], [...(lite_params)], lite_currentName, "", 0n);
                        void lite_m2_declParsed;
                        if ((((lite_m2_declParsed).kind) === ("Unit"))) {
                            liteFn_m2_failAt(lite_source, lite_m2_itemStart, lite_prefix, (("cannot declare a Unit local ") + (lite_m2_itemName)));
                        }
                        const lite_m2_statementNext = liteFn_m2_consumeStatementEnd(lite_source, (lite_m2_declParsed).next, lite_prefix);
                        void lite_m2_statementNext;
                        if (((lite_m2_statementNext) < (0n))) {
                            liteFn_m2_failAt(lite_source, liteFn_m2_skipTrivia(lite_source, (lite_m2_declParsed).next, lite_prefix), lite_prefix, (("expected ; after local declaration ") + (lite_m2_itemName)));
                        }
                        const lite_m2_runtime = liteFn_m2_localRuntimeName([...(lite_m2_blockLocals)], lite_m2_itemName, lite_m2_itemStart, 0n);
                        void lite_m2_runtime;
                        lite_m2_blockLocals.push({ name: lite_m2_itemName, runtime: lite_m2_runtime, kind: (lite_m2_declParsed).kind, mutable: false, writable: false, depth: 1n, constant: (lite_m2_declParsed).constant, code: (lite_m2_declParsed).code, intValue: (lite_m2_declParsed).intValue, textValue: (lite_m2_declParsed).textValue });
                        lite_m2_statements.push((((((((((((("const ") + (lite_m2_runtime))) + (" = "))) + (liteFn_m2_copiedValueCode(lite_target, (lite_m2_declParsed).kind, (lite_m2_declParsed).code)))) + ("; void "))) + (lite_m2_runtime))) + (";")));
                        lite_m2_statementCount = lite$addInt(lite_m2_statementCount, 1n, 86841);
                        lite_m2_blockConstant = false;
                        lite_m2_cursor = lite_m2_statementNext;
                    } else if (((((lite_m2_afterItemName) < (liteFn_m6_length(lite_source)))) && (((liteFn_m6_at(lite_source, lite_m2_afterItemName)) === (":"))))) {
                        lite_m2_isStatement = true;
                        if (liteFn_m2_isReservedWord(lite_m2_itemName)) {
                            liteFn_m2_unsupportedFeature(lite_source, lite_m2_itemStart, lite_m2_itemName, lite_prefix);
                        }
                        const lite_m2_emptyAliases: { name: string; target: string; at: bigint; end: bigint }[] = [...([])];
                        void lite_m2_emptyAliases;
                        const lite_m2_typed = liteFn_m2_parseLocalType(lite_source, lite$addInt(lite_m2_afterItemName, 1n, 87316), lite_prefix, [...(lite_m2_emptyAliases)]);
                        void lite_m2_typed;
                        const lite_m2_afterType = liteFn_m2_skipTrivia(lite_source, (lite_m2_typed).next, lite_prefix);
                        void lite_m2_afterType;
                        let lite_m2_declParsed = liteFn_m2_zeroParsed(lite_target, (lite_m2_typed).kind, lite_m2_afterType);
                        void lite_m2_declParsed;
                        if (liteFn_m2_isSingleEquals(lite_source, lite_m2_afterType)) {
                            lite_m2_declParsed = liteFn_m2_parseBinary(lite_target, lite_source, liteFn_m2_skipTrivia(lite_source, lite$addInt(lite_m2_afterType, 1n, 87644), lite_prefix), lite_prefix, [...(lite_m2_blockLocals)], [...(lite_functions)], [...(lite_params)], lite_currentName, (lite_m2_typed).kind, 0n);
                            if ((((lite_m2_declParsed).kind) !== ((lite_m2_typed).kind))) {
                                liteFn_m2_failAt(lite_source, lite_m2_itemStart, lite_prefix, (((((("cannot initialize ") + (liteFn_m2_displayKind((lite_m2_typed).kind)))) + (" with "))) + (liteFn_m2_displayKind((lite_m2_declParsed).kind))));
                            }
                        }
                        const lite_m2_statementNext = liteFn_m2_consumeStatementEnd(lite_source, (lite_m2_declParsed).next, lite_prefix);
                        void lite_m2_statementNext;
                        if (((lite_m2_statementNext) < (0n))) {
                            liteFn_m2_failAt(lite_source, liteFn_m2_skipTrivia(lite_source, (lite_m2_declParsed).next, lite_prefix), lite_prefix, (("expected ; after local declaration ") + (lite_m2_itemName)));
                        }
                        const lite_m2_runtime = liteFn_m2_localRuntimeName([...(lite_m2_blockLocals)], lite_m2_itemName, lite_m2_itemStart, 0n);
                        void lite_m2_runtime;
                        lite_m2_blockLocals.push({ name: lite_m2_itemName, runtime: lite_m2_runtime, kind: (lite_m2_typed).kind, mutable: false, writable: (lite_m2_typed).writable, depth: 1n, constant: (lite_m2_declParsed).constant, code: (lite_m2_declParsed).code, intValue: (lite_m2_declParsed).intValue, textValue: (lite_m2_declParsed).textValue });
                        lite_m2_statements.push((((((((((((("const ") + (lite_m2_runtime))) + (" = "))) + (liteFn_m2_copiedValueCode(lite_target, (lite_m2_typed).kind, (lite_m2_declParsed).code)))) + ("; void "))) + (lite_m2_runtime))) + (";")));
                        lite_m2_statementCount = lite$addInt(lite_m2_statementCount, 1n, 88883);
                        lite_m2_blockConstant = false;
                        lite_m2_cursor = lite_m2_statementNext;
                    } else if (liteFn_m2_isSingleEquals(lite_source, lite_m2_afterItemName)) {
                        lite_m2_isStatement = true;
                        const lite_m2_index = liteFn_m2_localIndex([...(lite_m2_blockLocals)], lite_m2_itemName);
                        void lite_m2_index;
                        if (((lite_m2_index) < (0n))) {
                            liteFn_m2_failAt(lite_source, lite_m2_itemStart, lite_prefix, (("unknown value ") + (lite_m2_itemName)));
                        }
                        const lite_m2_entry = lite$listAt((lite_m2_blockLocals), lite_m2_index, 89287);
                        void lite_m2_entry;
                        if ((!((lite_m2_entry).mutable))) {
                            liteFn_m2_failAt(lite_source, lite_m2_itemStart, lite_prefix, (("cannot assign to immutable local ") + (lite_m2_itemName)));
                        }
                        const lite_m2_rhs = liteFn_m2_parseBinary(lite_target, lite_source, liteFn_m2_skipTrivia(lite_source, lite$addInt(lite_m2_afterItemName, 1n, 89504), lite_prefix), lite_prefix, [...(lite_m2_blockLocals)], [...(lite_functions)], [...(lite_params)], lite_currentName, (lite_m2_entry).kind, 0n);
                        void lite_m2_rhs;
                        if ((((lite_m2_rhs).kind) !== ((lite_m2_entry).kind))) {
                            liteFn_m2_failAt(lite_source, lite_m2_itemStart, lite_prefix, (((((((((("cannot assign ") + (liteFn_m2_displayKind((lite_m2_rhs).kind)))) + (" to "))) + (liteFn_m2_displayKind((lite_m2_entry).kind)))) + (" local "))) + (lite_m2_itemName)));
                        }
                        const lite_m2_statementNext = liteFn_m2_consumeStatementEnd(lite_source, (lite_m2_rhs).next, lite_prefix);
                        void lite_m2_statementNext;
                        if (((lite_m2_statementNext) < (0n))) {
                            liteFn_m2_failAt(lite_source, liteFn_m2_skipTrivia(lite_source, (lite_m2_rhs).next, lite_prefix), lite_prefix, (("expected ; after assignment to ") + (lite_m2_itemName)));
                        }
                        lite_m2_blockLocals.push({ name: (lite_m2_entry).name, runtime: (lite_m2_entry).runtime, kind: (lite_m2_entry).kind, mutable: true, writable: (lite_m2_entry).writable, depth: (lite_m2_entry).depth, constant: false, code: (lite_m2_rhs).code, intValue: (lite_m2_rhs).intValue, textValue: (lite_m2_rhs).textValue });
                        lite_m2_statements.push((((((((lite_m2_entry).runtime) + (" = "))) + (liteFn_m2_copiedValueCode(lite_target, (lite_m2_entry).kind, (lite_m2_rhs).code)))) + (";")));
                        lite_m2_statementCount = lite$addInt(lite_m2_statementCount, 1n, 90556);
                        lite_m2_blockConstant = false;
                        lite_m2_cursor = lite_m2_statementNext;
                    }
                }
                if ((!(lite_m2_isStatement))) {
                    const lite_m2_expr = liteFn_m2_parseBinary(lite_target, lite_source, lite_m2_cursor, lite_prefix, [...(lite_m2_blockLocals)], [...(lite_functions)], [...(lite_params)], lite_currentName, lite_expected, 0n);
                    void lite_m2_expr;
                    const lite_m2_statementNext = liteFn_m2_consumeStatementEnd(lite_source, (lite_m2_expr).next, lite_prefix);
                    void lite_m2_statementNext;
                    if (((lite_m2_statementNext) < (0n))) {
                        liteFn_m2_failAt(lite_source, liteFn_m2_skipTrivia(lite_source, (lite_m2_expr).next, lite_prefix), lite_prefix, "expected ; or }");
                    }
                    const lite_m2_afterExpr = liteFn_m2_skipItemSeparators(lite_source, lite_m2_statementNext, lite_prefix);
                    void lite_m2_afterExpr;
                    if (((((lite_m2_afterExpr) < (liteFn_m6_length(lite_source)))) && (((liteFn_m6_at(lite_source, lite_m2_afterExpr)) === ("}"))))) {
                        lite_m2_blockKind = (lite_m2_expr).kind;
                        lite_m2_blockCode = (lite_m2_expr).code;
                        lite_m2_blockInt = (lite_m2_expr).intValue;
                        lite_m2_blockText = (lite_m2_expr).textValue;
                        lite_m2_blockConstant = (lite_m2_expr).constant;
                        lite_m2_cursor = lite$addInt(lite_m2_afterExpr, 1n, 91484);
                        break;
                    }
                    lite_m2_statements.push((((("void (") + ((lite_m2_expr).code))) + (");")));
                    lite_m2_statementCount = lite$addInt(lite_m2_statementCount, 1n, 91661);
                    lite_m2_blockConstant = false;
                    lite_m2_cursor = lite_m2_statementNext;
                }
            }
            if (((lite_m2_statementCount) === (0n))) {
                lite_m2_left = { kind: lite_m2_blockKind, code: lite_m2_blockCode, intValue: lite_m2_blockInt, textValue: lite_m2_blockText, constant: lite_m2_blockConstant, next: lite_m2_cursor };
            } else {
                if (((lite_target) !== ("ts"))) {
                    liteFn_m2_failAt(lite_source, lite_m2_start, lite_prefix, "C backend does not support statement-bearing value blocks yet");
                }
                const lite_m2_returnCode = (Boolean(((lite_m2_blockKind) === ("Unit"))) ? (Boolean(((lite_m2_blockCode) === (liteFn_m2_targetUnitLiteralCode(lite_target)))) ? "return undefined;" : (((("void (") + (lite_m2_blockCode))) + ("); return undefined;"))) : (((("return ") + (liteFn_m2_copiedValueCode(lite_target, lite_m2_blockKind, lite_m2_blockCode)))) + (";")));
                void lite_m2_returnCode;
                lite_m2_left = { kind: lite_m2_blockKind, code: (((((((("(() => { ") + (liteFn_m6_joinTexts([...(lite_m2_statements)], " ")))) + (" "))) + (lite_m2_returnCode))) + (" })()")), intValue: 0n, textValue: "", constant: false, next: lite_m2_cursor };
            }
        } else if (liteFn_m6_isNameStart(lite_m2_ch)) {
            const lite_m2_nameStart = lite_m2_start;
            void lite_m2_nameStart;
            const lite_m2_next = liteFn_m6_skipName(lite_source, lite_m2_start);
            void lite_m2_next;
            const lite_m2_name = liteFn_m6_slice(lite_source, lite_m2_nameStart, lite_m2_next);
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
                const lite_m2_first = liteFn_m2_parseBinary(lite_target, lite_source, lite$subtractInt(lite_m2_cursor, 1n, 94556), lite_prefix, [...(lite_locals)], [...(lite_functions)], [...(lite_params)], lite_currentName, lite_expected, 0n);
                void lite_m2_first;
                lite_m2_cursor = (lite_m2_first).next;
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
                    if ((!(liteFn_m6_wordAt(lite_source, lite_m2_afterBranch, "else")))) {
                        if (((lite_minimum) >= (0n))) {
                            liteFn_m2_failAt(lite_source, lite_m2_afterBranch, lite_prefix, "value if requires a final else");
                        }
                        const lite_m2_fallback = liteFn_m2_zeroParsed(lite_target, lite_m2_resultKind, lite_m2_cursor);
                        void lite_m2_fallback;
                        lite_m2_branchCodes.push((lite_m2_fallback).code);
                        lite_m2_branchCount = lite$addInt(lite_m2_branchCount, 1n, 95458);
                        break;
                    }
                    const lite_m2_afterElse = liteFn_m2_skipTrivia(lite_source, lite$addInt(lite_m2_afterBranch, 4n, 95568), lite_prefix);
                    void lite_m2_afterElse;
                    if (liteFn_m6_wordAt(lite_source, lite_m2_afterElse, "if")) {
                        const lite_m2_elseConditionStart = liteFn_m2_skipTrivia(lite_source, lite$addInt(lite_m2_afterElse, 2n, 95714), lite_prefix);
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
                        const lite_m2_branch = liteFn_m2_parseBinary(lite_target, lite_source, lite$subtractInt(lite_m2_open, 1n, 96524), lite_prefix, [...(lite_locals)], [...(lite_functions)], [...(lite_params)], lite_currentName, lite_expected, 0n);
                        void lite_m2_branch;
                        if ((((lite_m2_branch).kind) !== (lite_m2_resultKind))) {
                            liteFn_m2_failAt(lite_source, lite_m2_elseBranchStart, lite_prefix, (((((("value if branches must have the same kind, got ") + (liteFn_m2_displayKind(lite_m2_resultKind)))) + (" and "))) + (liteFn_m2_displayKind((lite_m2_branch).kind))));
                        }
                        lite_m2_cursor = (lite_m2_branch).next;
                        lite_m2_conditionCodes.push(lite_m2_elseConditionCode);
                        lite_m2_branchCodes.push((lite_m2_branch).code);
                        lite_m2_branchCount = lite$addInt(lite_m2_branchCount, 1n, 97105);
                    } else {
                        const lite_m2_open = liteFn_m2_expectSymbol(lite_source, lite_m2_afterElse, "{", lite_prefix);
                        void lite_m2_open;
                        const lite_m2_elseBranchStart = liteFn_m2_skipTrivia(lite_source, lite_m2_open, lite_prefix);
                        void lite_m2_elseBranchStart;
                        const lite_m2_branch = liteFn_m2_parseBinary(lite_target, lite_source, lite$subtractInt(lite_m2_open, 1n, 97338), lite_prefix, [...(lite_locals)], [...(lite_functions)], [...(lite_params)], lite_currentName, lite_expected, 0n);
                        void lite_m2_branch;
                        if ((((lite_m2_branch).kind) !== (lite_m2_resultKind))) {
                            liteFn_m2_failAt(lite_source, lite_m2_elseBranchStart, lite_prefix, (((((("value if branches must have the same kind, got ") + (liteFn_m2_displayKind(lite_m2_resultKind)))) + (" and "))) + (liteFn_m2_displayKind((lite_m2_branch).kind))));
                        }
                        lite_m2_cursor = (lite_m2_branch).next;
                        lite_m2_branchCodes.push((lite_m2_branch).code);
                        lite_m2_branchCount = lite$addInt(lite_m2_branchCount, 1n, 97842);
                        break;
                    }
                }
                let lite_m2_code = lite$listAt((lite_m2_branchCodes), lite$subtractInt(lite_m2_branchCount, 1n, 97954), 97942);
                void lite_m2_code;
                let lite_m2_index = lite$subtractInt(lite_m2_branchCount, 2n, 97997);
                void lite_m2_index;
                while (((lite_m2_index) >= (0n))) {
                    lite_m2_code = (((((((((((("(Boolean(") + (lite$listAt((lite_m2_conditionCodes), lite_m2_index, 98084)))) + (") ? "))) + (lite$listAt((lite_m2_branchCodes), lite_m2_index, 98114)))) + (" : "))) + (lite_m2_code))) + (")"));
                    lite_m2_index = lite$subtractInt(lite_m2_index, 1n, 98173);
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
                if (((((((lite_m2_callableIndex) >= (0n))) && (((lite_m2_afterName) < (liteFn_m6_length(lite_source)))))) && (((liteFn_m6_at(lite_source, lite_m2_afterName)) === ("("))))) {
                    const lite_m2_info = lite$listAt((lite_functions), lite_m2_callableIndex, 99041);
                    void lite_m2_info;
                    if ((((lite_m2_info).count) < (0n))) {
                        liteFn_m2_failAt(lite_source, lite_m2_nameStart, lite_prefix, "host output functions are standalone statements");
                    }
                    let lite_m2_cursor = liteFn_m2_skipTrivia(lite_source, lite$addInt(lite_m2_afterName, 1n, 99276), lite_prefix);
                    void lite_m2_cursor;
                    const lite_m2_argumentCodes: string[] = [...([])];
                    void lite_m2_argumentCodes;
                    let lite_m2_argumentCount = 0n;
                    void lite_m2_argumentCount;
                    if (((((lite_m2_cursor) < (liteFn_m6_length(lite_source)))) && (((liteFn_m6_at(lite_source, lite_m2_cursor)) !== (")"))))) {
                        while (Boolean(true)) {
                            if (((lite_m2_argumentCount) >= ((lite_m2_info).count))) {
                                const lite_m2_suffix = (Boolean((((lite_m2_info).count) === (1n))) ? " argument" : " arguments");
                                void lite_m2_suffix;
                                liteFn_m2_failAt(lite_source, lite_m2_nameStart, lite_prefix, (((((((((("function ") + (lite_m2_calleeName))) + (" expects "))) + (liteFn_m3_decimalText((lite_m2_info).count)))) + (lite_m2_suffix))) + (", got more")));
                            }
                            const lt_local_m2_expected_99874 = liteFn_m2_paramKindOf(lite$listAt((lite_params), lite$addInt((lite_m2_info).first, lite_m2_argumentCount, 99916), 99905));
                            void lt_local_m2_expected_99874;
                            const lite_m2_argument = liteFn_m2_parseBinary(lite_target, lite_source, lite_m2_cursor, lite_prefix, [...(lite_locals)], [...(lite_functions)], [...(lite_params)], lite_currentName, lt_local_m2_expected_99874, 0n);
                            void lite_m2_argument;
                            if ((((lite_m2_argument).kind) !== (lt_local_m2_expected_99874))) {
                                liteFn_m2_failAt(lite_source, lite_m2_cursor, lite_prefix, (((((((((((((("argument ") + (liteFn_m3_decimalText(lite$addInt(lite_m2_argumentCount, 1n, 100227))))) + (" of "))) + (lite_m2_calleeName))) + (" must be "))) + (liteFn_m2_displayKind(lt_local_m2_expected_99874)))) + (", got "))) + (liteFn_m2_displayKind((lite_m2_argument).kind))));
                            }
                            lite_m2_argumentCodes.push(liteFn_m2_copiedValueCode(lite_target, (lite_m2_argument).kind, (lite_m2_argument).code));
                            lite_m2_argumentCount = lite$addInt(lite_m2_argumentCount, 1n, 100562);
                            lite_m2_cursor = liteFn_m2_skipTrivia(lite_source, (lite_m2_argument).next, lite_prefix);
                            if (((((lite_m2_cursor) < (liteFn_m6_length(lite_source)))) && (((liteFn_m6_at(lite_source, lite_m2_cursor)) === (","))))) {
                                lite_m2_cursor = liteFn_m2_skipTrivia(lite_source, lite$addInt(lite_m2_cursor, 1n, 100805), lite_prefix);
                                if (((((lite_m2_cursor) < (liteFn_m6_length(lite_source)))) && (((liteFn_m6_at(lite_source, lite_m2_cursor)) === (")"))))) {
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
                        liteFn_m2_failAt(lite_source, lite_m2_nameStart, lite_prefix, (((((((((((("function ") + (lite_m2_calleeName))) + (" expects "))) + (liteFn_m3_decimalText((lite_m2_info).count)))) + (lite_m2_suffix))) + (", got "))) + (liteFn_m3_decimalText(lite_m2_argumentCount))));
                    }
                    lite_m2_left = { kind: (lite_m2_info).result, code: (((((((lite_m2_info).runtime) + ("("))) + (liteFn_m6_joinTexts([...(lite_m2_argumentCodes)], ", ")))) + (")")), intValue: 0n, textValue: "", constant: false, next: lite_m2_cursor };
                } else if (((lite_m2_callableIndex) >= (0n))) {
                    liteFn_m2_failAt(lite_source, lite_m2_nameStart, lite_prefix, (((("function ") + (lite_m2_calleeName))) + (" must be called")));
                } else {
                    const lite_m2_index = liteFn_m2_localIndex([...(lite_locals)], lite_m2_name);
                    void lite_m2_index;
                    if (((lite_m2_index) < (0n))) {
                        liteFn_m2_failAt(lite_source, lite_m2_nameStart, lite_prefix, (("unknown value ") + (lite_m2_name)));
                    }
                    const lite_m2_entry = lite$listAt((lite_locals), lite_m2_index, 102078);
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
            if (((((lite_m2_postPosition) < (liteFn_m6_length(lite_source)))) && (((liteFn_m6_at(lite_source, lite_m2_postPosition)) === ("."))))) {
                const lite_m2_labelStart = liteFn_m2_skipTrivia(lite_source, lite$addInt(lite_m2_postPosition, 1n, 102615), lite_prefix);
                void lite_m2_labelStart;
                if (((((lite_m2_labelStart) >= (liteFn_m6_length(lite_source)))) || ((!(liteFn_m6_isNameStart(liteFn_m6_at(lite_source, lite_m2_labelStart))))))) {
                    break;
                }
                const lite_m2_labelEnd = liteFn_m6_skipName(lite_source, lite_m2_labelStart);
                void lite_m2_labelEnd;
                const lite_m2_label = liteFn_m6_slice(lite_source, lite_m2_labelStart, lite_m2_labelEnd);
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
                        const lite_m2_member = lite$listAt((lite_locals), lite_m2_memberIndex, 103776);
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
            } else if (((((lite_m2_postPosition) < (liteFn_m6_length(lite_source)))) && (((liteFn_m6_at(lite_source, lite_m2_postPosition)) === ("["))))) {
                if ((!(liteFn_m2_isListKind((lite_m2_left).kind)))) {
                    liteFn_m2_failAt(lite_source, lite_m2_postPosition, lite_prefix, "indexing requires a list value");
                }
                const lite_m2_indexStart = liteFn_m2_skipTrivia(lite_source, lite$addInt(lite_m2_postPosition, 1n, 104872), lite_prefix);
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
            const lite_m2_info = lite$listAt((lite_functions), (lite_m2_left).intValue, 105647);
            void lite_m2_info;
            if ((((lite_m2_info).runtime) === ("lite$core$list$pushBack:v1"))) {
                const lite_m2_grant = liteFn_m2_parseListGrant(lite_source, (lite_m2_left).next, lite_prefix, [...(lite_locals)], "pushBack");
                void lite_m2_grant;
                let lite_m2_cursor = liteFn_m2_skipTrivia(lite_source, (lite_m2_grant).next, lite_prefix);
                void lite_m2_cursor;
                if (((((lite_m2_cursor) >= (liteFn_m6_length(lite_source)))) || (((liteFn_m6_at(lite_source, lite_m2_cursor)) !== (","))))) {
                    liteFn_m2_failAt(lite_source, lite_m2_cursor, lite_prefix, "pushBack expects a value after the mut list");
                }
                const lite_m2_valueStart = liteFn_m2_skipTrivia(lite_source, lite$addInt(lite_m2_cursor, 1n, 106120), lite_prefix);
                void lite_m2_valueStart;
                const lite_m2_elementKind = liteFn_m2_listElementKind((lite_m2_grant).kind);
                void lite_m2_elementKind;
                const lite_m2_value = liteFn_m2_parseBinary(lite_target, lite_source, lite_m2_valueStart, lite_prefix, [...(lite_locals)], [...(lite_functions)], [...(lite_params)], lite_currentName, lite_m2_elementKind, 0n);
                void lite_m2_value;
                if ((((lite_m2_value).kind) !== (lite_m2_elementKind))) {
                    liteFn_m2_failAt(lite_source, lite_m2_valueStart, lite_prefix, (((((("pushBack element must be ") + (liteFn_m2_displayKind(lite_m2_elementKind)))) + (", got "))) + (liteFn_m2_displayKind((lite_m2_value).kind))));
                }
                const lite_m2_close = liteFn_m2_expectNonemptyCallClose(lite_source, (lite_m2_value).next, lite_prefix);
                void lite_m2_close;
                lite_m2_left = { kind: "Unit", code: (((((((lite_m2_grant).runtime) + (".push("))) + ((lite_m2_value).code))) + (")")), intValue: 0n, textValue: "", constant: false, next: lite_m2_close };
            } else if ((((lite_m2_info).runtime) === ("lite$core$list$popBack:v1"))) {
                const lite_m2_grant = liteFn_m2_parseListGrant(lite_source, (lite_m2_left).next, lite_prefix, [...(lite_locals)], "popBack");
                void lite_m2_grant;
                const lite_m2_close = liteFn_m2_expectNonemptyCallClose(lite_source, (lite_m2_grant).next, lite_prefix);
                void lite_m2_close;
                lite_m2_left = { kind: liteFn_m2_listElementKind((lite_m2_grant).kind), code: (((((((("lite$listPopBack(") + ((lite_m2_grant).runtime))) + (", "))) + (liteFn_m4_intText(lite_m2_start)))) + (")")), intValue: 0n, textValue: "", constant: false, next: lite_m2_close };
            } else {
                if ((((lite_m2_info).count) < (0n))) {
                    liteFn_m2_failAt(lite_source, lite_m2_start, lite_prefix, "host output functions are standalone statements");
                }
                const lite_m2_callOpen = liteFn_m2_skipTrivia(lite_source, (lite_m2_left).next, lite_prefix);
                void lite_m2_callOpen;
                if (((((lite_m2_callOpen) >= (liteFn_m6_length(lite_source)))) || (((liteFn_m6_at(lite_source, lite_m2_callOpen)) !== ("("))))) {
                    liteFn_m2_failAt(lite_source, lite_m2_start, lite_prefix, (((("function ") + ((lite_m2_left).textValue))) + (" must be called")));
                }
                let lite_m2_cursor = liteFn_m2_skipTrivia(lite_source, lite$addInt(lite_m2_callOpen, 1n, 107691), lite_prefix);
                void lite_m2_cursor;
                const lite_m2_argumentCodes: string[] = [...([])];
                void lite_m2_argumentCodes;
                let lite_m2_argumentCount = 0n;
                void lite_m2_argumentCount;
                if (((((lite_m2_cursor) < (liteFn_m6_length(lite_source)))) && (((liteFn_m6_at(lite_source, lite_m2_cursor)) !== (")"))))) {
                    while (Boolean(true)) {
                        if (((lite_m2_argumentCount) >= ((lite_m2_info).count))) {
                            const lite_m2_suffix = (Boolean((((lite_m2_info).count) === (1n))) ? " argument" : " arguments");
                            void lite_m2_suffix;
                            liteFn_m2_failAt(lite_source, lite_m2_start, lite_prefix, (((((((((("function ") + ((lite_m2_left).textValue))) + (" expects "))) + (liteFn_m3_decimalText((lite_m2_info).count)))) + (lite_m2_suffix))) + (", got more")));
                        }
                        const lt_local_m2_expected_108253 = liteFn_m2_paramKindOf(lite$listAt((lite_params), lite$addInt((lite_m2_info).first, lite_m2_argumentCount, 108295), 108284));
                        void lt_local_m2_expected_108253;
                        const lite_m2_argument = liteFn_m2_parseBinary(lite_target, lite_source, lite_m2_cursor, lite_prefix, [...(lite_locals)], [...(lite_functions)], [...(lite_params)], lite_currentName, lt_local_m2_expected_108253, 0n);
                        void lite_m2_argument;
                        if ((((lite_m2_argument).kind) !== (lt_local_m2_expected_108253))) {
                            liteFn_m2_failAt(lite_source, lite_m2_cursor, lite_prefix, (((((((((((((("argument ") + (liteFn_m3_decimalText(lite$addInt(lite_m2_argumentCount, 1n, 108594))))) + (" of "))) + ((lite_m2_left).textValue))) + (" must be "))) + (liteFn_m2_displayKind(lt_local_m2_expected_108253)))) + (", got "))) + (liteFn_m2_displayKind((lite_m2_argument).kind))));
                        }
                        lite_m2_argumentCodes.push(liteFn_m2_copiedValueCode(lite_target, (lite_m2_argument).kind, (lite_m2_argument).code));
                        lite_m2_argumentCount = lite$addInt(lite_m2_argumentCount, 1n, 108917);
                        lite_m2_cursor = liteFn_m2_skipTrivia(lite_source, (lite_m2_argument).next, lite_prefix);
                        if (((((lite_m2_cursor) < (liteFn_m6_length(lite_source)))) && (((liteFn_m6_at(lite_source, lite_m2_cursor)) === (","))))) {
                            lite_m2_cursor = liteFn_m2_skipTrivia(lite_source, lite$addInt(lite_m2_cursor, 1n, 109148), lite_prefix);
                            if (((((lite_m2_cursor) < (liteFn_m6_length(lite_source)))) && (((liteFn_m6_at(lite_source, lite_m2_cursor)) === (")"))))) {
                                break;
                            }
                        } else {
                            break;
                        }
                    }
                }
                lite_m2_cursor = liteFn_m2_expectSymbol(lite_source, lite_m2_cursor, ")", lite_prefix);
                const lite_m2_optionalPrompt = (((((((((lite_m2_info).runtime) === ("lite$inputAll"))) || ((((lite_m2_info).runtime) === ("lite$inputLine"))))) || ((((lite_m2_info).runtime) === ("lite$inputInt"))))) || ((((lite_m2_info).runtime) === ("lite$inputFloat"))));
                void lite_m2_optionalPrompt;
                if (((((lite_m2_argumentCount) !== ((lite_m2_info).count))) && ((!((((lite_m2_optionalPrompt) && (((lite_m2_argumentCount) === (0n)))))))))) {
                    const lite_m2_suffix = (Boolean((((lite_m2_info).count) === (1n))) ? " argument" : " arguments");
                    void lite_m2_suffix;
                    liteFn_m2_failAt(lite_source, lite_m2_start, lite_prefix, (((((((((((("function ") + ((lite_m2_left).textValue))) + (" expects "))) + (liteFn_m3_decimalText((lite_m2_info).count)))) + (lite_m2_suffix))) + (", got "))) + (liteFn_m3_decimalText(lite_m2_argumentCount))));
                }
                if (lite_m2_optionalPrompt) {
                    if (((lite_m2_argumentCount) === (0n))) {
                        lite_m2_argumentCodes.push("undefined");
                    }
                    const lite_m2_place = liteFn_m8_lineColumn(lite_source, lite_m2_start);
                    void lite_m2_place;
                    const lite_m2_location = ((((((((((Boolean(((lite_prefix) === (""))) ? "" : ((lite_prefix) + (":"))))) + (liteFn_m3_decimalText((lite_m2_place).line)))) + (":"))) + (liteFn_m3_decimalText((lite_m2_place).column)))) + (": InputFault: "));
                    void lite_m2_location;
                    lite_m2_argumentCodes.push(liteFn_m2_targetTextLiteralCode(lite_target, lite_m2_location));
                }
                if ((((((lite_m2_info).runtime) === ("lite$textAt"))) || ((((lite_m2_info).runtime) === ("lite$textSlice"))))) {
                    lite_m2_argumentCodes.push(liteFn_m4_intText(lite_m2_start));
                }
                lite_m2_left = { kind: (lite_m2_info).result, code: (((((((lite_m2_info).runtime) + ("("))) + (liteFn_m6_joinTexts([...(lite_m2_argumentCodes)], ", ")))) + (")")), intValue: 0n, textValue: "", constant: false, next: lite_m2_cursor };
            }
        }
        while (Boolean(true)) {
            if ((((((lite_m2_left).next) > (0n))) && (((liteFn_m6_at(lite_source, lite$subtractInt((lite_m2_left).next, 1n, 110980))) === ("}"))))) {
                break;
            }
            const lite_m2_operatorPosition = liteFn_m2_skipTrivia(lite_source, (lite_m2_left).next, lite_prefix);
            void lite_m2_operatorPosition;
            if (((lite_m2_operatorPosition) >= (liteFn_m6_length(lite_source)))) {
                break;
            }
            const lite_m2_operator = liteFn_m2_readOperator(lite_source, lite_m2_operatorPosition);
            void lite_m2_operator;
            if ((((lite_m2_operator).text) === (""))) {
                break;
            }
            const lite_m2_level = liteFn_m2_operatorLevel((lite_m2_operator).text);
            void lite_m2_level;
            if (((lite_m2_level) < (lite_m2_effectiveMinimum))) {
                break;
            }
            if ((((lite_m2_operator).text) === ("**"))) {
                let lite_m2_signPosition = lite_m2_start;
                void lite_m2_signPosition;
                while (((((lite_m2_signPosition) < (liteFn_m6_length(lite_source)))) && ((((((liteFn_m6_at(lite_source, lite_m2_signPosition)) === ("+"))) || (((liteFn_m6_at(lite_source, lite_m2_signPosition)) === ("-")))))))) {
                    if (((liteFn_m6_at(lite_source, lite_m2_signPosition)) === ("-"))) {
                        liteFn_m2_failAt(lite_source, lite_m2_operatorPosition, lite_prefix, "group a negative power base as (-base) or negate the completed power as -(base ** exponent)");
                    }
                    lite_m2_signPosition = liteFn_m2_skipTrivia(lite_source, lite$addInt(lite_m2_signPosition, 1n, 111850), lite_prefix);
                }
            }
            const lite_m2_rightMinimum = (Boolean((((lite_m2_operator).text) === ("**"))) ? lite_m2_level : lite$addInt(lite_m2_level, 1n, 111960));
            void lite_m2_rightMinimum;
            const lite_m2_right = liteFn_m2_parseBinary(lite_target, lite_source, lite$addInt(lite_m2_operatorPosition, (lite_m2_operator).width, 112022), lite_prefix, [...(lite_locals)], [...(lite_functions)], [...(lite_params)], lite_currentName, "", lite_m2_rightMinimum);
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
                        const lite_m2_operand = liteFn_m2_parseBinary(lite_target, lite_source, lite$addInt(lite_m2_nextPosition, (lite_m2_nextOperator).width, 113855), lite_prefix, [...(lite_locals)], [...(lite_functions)], [...(lite_params)], lite_currentName, "", lite$addInt(lite_m2_level, 1n, 113935));
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
                        lite_m2_count = lite$addInt(lite_m2_count, 1n, 114429);
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
        let lite_m2_argumentIndex = 0n;
        void lite_m2_argumentIndex;
        for (const lite_m2_argument of [...(lite$inputArgs())]) {
            void lite_m2_argument;
            if (((lite_m2_argumentIndex) === (0n))) {
                lite_m2_prefix = lite_m2_argument;
            }
            lite_m2_argumentIndex = lite$addInt(lite_m2_argumentIndex, 1n, 119579);
        }
        return lite_m2_prefix;
    }
    void liteFn_m2_sourcePrefix;
    function liteFn_m2_sourceModuleIdentity(): string {
        let lite_m2_identity = "";
        void lite_m2_identity;
        let lite_m2_argumentIndex = 0n;
        void lite_m2_argumentIndex;
        for (const lite_m2_argument of [...(lite$inputArgs())]) {
            void lite_m2_argument;
            if (((lite_m2_argumentIndex) === (1n))) {
                lite_m2_identity = lite_m2_argument;
            }
            lite_m2_argumentIndex = lite$addInt(lite_m2_argumentIndex, 1n, 119906);
        }
        return lite_m2_identity;
    }
    void liteFn_m2_sourceModuleIdentity;
    function liteFn_m2_sourceModulePath(): string {
        let lite_m2_path = "";
        void lite_m2_path;
        let lite_m2_argumentIndex = 0n;
        void lite_m2_argumentIndex;
        for (const lite_m2_argument of [...(lite$inputArgs())]) {
            void lite_m2_argument;
            if (((lite_m2_argumentIndex) === (2n))) {
                lite_m2_path = lite_m2_argument;
            }
            lite_m2_argumentIndex = lite$addInt(lite_m2_argumentIndex, 1n, 120224);
        }
        return lite_m2_path;
    }
    void liteFn_m2_sourceModulePath;
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
    function liteFn_m2_parsePartialAssignIf(lite_target: string, lite_source: string, lite_position: bigint, lite_prefix: string, lite_locals: { name: string; runtime: string; kind: string; mutable: boolean; writable: boolean; depth: bigint; constant: boolean; code: string; intValue: bigint; textValue: string }[], lite_functions: { name: string; runtime: string; result: string; first: bigint; count: bigint }[], lite_params: string[], lite_currentName: string, lite_targetAt: bigint, lite_targetKind: string, lite_targetName: string, lite_targetRuntime: string): { kind: string; name: string; runtime: string; code: string; intValue: bigint; textValue: string }[] {
        void lite_target;
        void lite_source;
        void lite_position;
        void lite_prefix;
        void lite_locals;
        void lite_functions;
        void lite_params;
        void lite_currentName;
        void lite_targetAt;
        void lite_targetKind;
        void lite_targetName;
        void lite_targetRuntime;
        let lite_m2_inner = liteFn_m2_skipTrivia(lite_source, lite_position, lite_prefix);
        void lite_m2_inner;
        let lite_m2_parenCount = 0n;
        void lite_m2_parenCount;
        while (((((lite_m2_inner) < (liteFn_m6_length(lite_source)))) && (((liteFn_m6_at(lite_source, lite_m2_inner)) === ("("))))) {
            lite_m2_parenCount = lite$addInt(lite_m2_parenCount, 1n, 121352);
            lite_m2_inner = liteFn_m2_skipTrivia(lite_source, lite$addInt(lite_m2_inner, 1n, 121398), lite_prefix);
        }
        if ((!(liteFn_m6_wordAt(lite_source, lite_m2_inner, "if")))) {
            return [...([])];
        }
        const lite_m2_result: { kind: string; name: string; runtime: string; code: string; intValue: bigint; textValue: string }[] = [...([])];
        void lite_m2_result;
        let lite_m2_cursor = liteFn_m2_skipTrivia(lite_source, lite$addInt(lite_m2_inner, 2n, 121556), lite_prefix);
        void lite_m2_cursor;
        let lite_m2_isFirst = true;
        void lite_m2_isFirst;
        while (Boolean(true)) {
            const lite_m2_conditionStart = lite_m2_cursor;
            void lite_m2_conditionStart;
            const lite_m2_condition = liteFn_m2_parseExpression(lite_target, lite_source, lite_m2_conditionStart, lite_prefix, [...(lite_locals)], [...(lite_functions)], [...(lite_params)], lite_currentName);
            void lite_m2_condition;
            if ((((lite_m2_condition).kind) !== ("Bool"))) {
                liteFn_m2_failAt(lite_source, lite_m2_conditionStart, lite_prefix, "if condition must be Bool");
            }
            const lite_m2_conditionCode = (Boolean((lite_m2_condition).constant) ? liteFn_m2_targetBoolLiteralCode(lite_target, (((lite_m2_condition).intValue) !== (0n))) : (lite_m2_condition).code);
            void lite_m2_conditionCode;
            const lite_m2_open = liteFn_m2_expectSymbol(lite_source, liteFn_m2_skipTrivia(lite_source, (lite_m2_condition).next, lite_prefix), "{", lite_prefix);
            void lite_m2_open;
            const lite_m2_branchStart = liteFn_m2_skipTrivia(lite_source, lite_m2_open, lite_prefix);
            void lite_m2_branchStart;
            const lite_m2_branch = liteFn_m2_parseExpressionAs(lite_target, lite_source, lite_m2_branchStart, lite_prefix, [...(lite_locals)], [...(lite_functions)], [...(lite_params)], lite_currentName, lite_targetKind);
            void lite_m2_branch;
            if ((((lite_m2_branch).kind) !== (lite_targetKind))) {
                liteFn_m2_failAt(lite_source, lite_targetAt, lite_prefix, (((((((((("cannot assign ") + (liteFn_m2_displayKind((lite_m2_branch).kind)))) + (" to "))) + (liteFn_m2_displayKind(lite_targetKind)))) + (" local "))) + (lite_targetName)));
            }
            lite_m2_cursor = liteFn_m2_expectSymbol(lite_source, liteFn_m2_skipTrivia(lite_source, (lite_m2_branch).next, lite_prefix), "}", lite_prefix);
            lite_m2_result.push({ kind: (Boolean(lite_m2_isFirst) ? "If" : "ElseIf"), name: "", runtime: "", code: lite_m2_conditionCode, intValue: 0n, textValue: "" });
            lite_m2_result.push({ kind: (("Assign") + (liteFn_m2_storageKind(lite_targetKind))), name: lite_targetName, runtime: lite_targetRuntime, code: liteFn_m2_copiedValueCode(lite_target, lite_targetKind, (lite_m2_branch).code), intValue: (lite_m2_branch).intValue, textValue: liteFn_m2_itemTextPayload(lite_m2_branch) });
            lite_m2_isFirst = false;
            const lite_m2_afterBranch = liteFn_m2_skipTrivia(lite_source, lite_m2_cursor, lite_prefix);
            void lite_m2_afterBranch;
            if ((!(liteFn_m6_wordAt(lite_source, lite_m2_afterBranch, "else")))) {
                let lite_m2_end = lite_m2_afterBranch;
                void lite_m2_end;
                let lite_m2_remaining = lite_m2_parenCount;
                void lite_m2_remaining;
                let lite_m2_matched = true;
                void lite_m2_matched;
                while (((lite_m2_remaining) > (0n))) {
                    if (((((lite_m2_end) >= (liteFn_m6_length(lite_source)))) || (((liteFn_m6_at(lite_source, lite_m2_end)) !== (")"))))) {
                        lite_m2_matched = false;
                        break;
                    }
                    lite_m2_end = liteFn_m2_skipTrivia(lite_source, lite$addInt(lite_m2_end, 1n, 123574), lite_prefix);
                    lite_m2_remaining = lite$subtractInt(lite_m2_remaining, 1n, 123626);
                }
                const lite_m2_statementNext = (Boolean(lite_m2_matched) ? liteFn_m2_consumeStatementEnd(lite_source, lite_m2_end, lite_prefix) : (-1n));
                void lite_m2_statementNext;
                if (((lite_m2_statementNext) < (0n))) {
                    liteFn_m2_failAt(lite_source, lite_m2_afterBranch, lite_prefix, "value if requires a final else");
                }
                lite_m2_result.push({ kind: "EndIf", name: "", runtime: "", code: "", intValue: 0n, textValue: "" });
                lite_m2_result.push({ kind: "End", name: "", runtime: "", code: "", intValue: lite_m2_statementNext, textValue: "" });
                return [...(lite_m2_result)];
            }
            const lite_m2_afterElse = liteFn_m2_skipTrivia(lite_source, lite$addInt(lite_m2_afterBranch, 4n, 124230), lite_prefix);
            void lite_m2_afterElse;
            if ((!(liteFn_m6_wordAt(lite_source, lite_m2_afterElse, "if")))) {
                return [...([])];
            }
            lite_m2_cursor = liteFn_m2_skipTrivia(lite_source, lite$addInt(lite_m2_afterElse, 2n, 124380), lite_prefix);
        }
        return [...([])];
    }
    void liteFn_m2_parsePartialAssignIf;
    function liteFn_m2_scanBraceEnd(lite_source: string, lite_open: bigint, lite_prefix: string): bigint {
        void lite_source;
        void lite_open;
        void lite_prefix;
        const lite_m2_size = liteFn_m6_length(lite_source);
        void lite_m2_size;
        let lite_m2_cursor = lite_open;
        void lite_m2_cursor;
        let lite_m2_depth = 0n;
        void lite_m2_depth;
        while (((lite_m2_cursor) < (lite_m2_size))) {
            const lite_m2_ch = liteFn_m6_at(lite_source, lite_m2_cursor);
            void lite_m2_ch;
            if (((lite_m2_ch) === ("\""))) {
                lite_m2_cursor = liteFn_m2_skipAliasString(lite_source, lite_m2_cursor);
            } else if (liteFn_m6_startsWithAt(lite_source, lite_m2_cursor, "/*")) {
                lite_m2_cursor = liteFn_m2_skipComment(lite_source, lite_m2_cursor, lite_prefix);
            } else if (((lite_m2_ch) === ("{"))) {
                lite_m2_depth = lite$addInt(lite_m2_depth, 1n, 125014);
                lite_m2_cursor = lite$addInt(lite_m2_cursor, 1n, 125047);
            } else if (((lite_m2_ch) === ("}"))) {
                lite_m2_depth = lite$subtractInt(lite_m2_depth, 1n, 125108);
                lite_m2_cursor = lite$addInt(lite_m2_cursor, 1n, 125141);
                if (((lite_m2_depth) === (0n))) {
                    return lite_m2_cursor;
                }
            } else {
                lite_m2_cursor = lite$addInt(lite_m2_cursor, 1n, 125236);
            }
        }
        return (-1n);
    }
    void liteFn_m2_scanBraceEnd;
    function liteFn_m2_scanConditionOpen(lite_source: string, lite_start: bigint, lite_prefix: string): bigint {
        void lite_source;
        void lite_start;
        void lite_prefix;
        const lite_m2_size = liteFn_m6_length(lite_source);
        void lite_m2_size;
        let lite_m2_cursor = lite_start;
        void lite_m2_cursor;
        let lite_m2_depth = 0n;
        void lite_m2_depth;
        while (((lite_m2_cursor) < (lite_m2_size))) {
            const lite_m2_ch = liteFn_m6_at(lite_source, lite_m2_cursor);
            void lite_m2_ch;
            if (((lite_m2_ch) === ("\""))) {
                lite_m2_cursor = liteFn_m2_skipAliasString(lite_source, lite_m2_cursor);
            } else if (liteFn_m6_startsWithAt(lite_source, lite_m2_cursor, "/*")) {
                lite_m2_cursor = liteFn_m2_skipComment(lite_source, lite_m2_cursor, lite_prefix);
            } else if (((((lite_m2_ch) === ("("))) || (((lite_m2_ch) === ("["))))) {
                lite_m2_depth = lite$addInt(lite_m2_depth, 1n, 125879);
                lite_m2_cursor = lite$addInt(lite_m2_cursor, 1n, 125912);
            } else if (((((lite_m2_ch) === (")"))) || (((lite_m2_ch) === ("]"))))) {
                if (((lite_m2_depth) > (0n))) {
                    lite_m2_depth = lite$subtractInt(lite_m2_depth, 1n, 126001);
                }
                lite_m2_cursor = lite$addInt(lite_m2_cursor, 1n, 126036);
            } else if (((((lite_m2_ch) === ("{"))) && (((lite_m2_depth) === (0n))))) {
                return lite_m2_cursor;
            } else {
                lite_m2_cursor = lite$addInt(lite_m2_cursor, 1n, 126158);
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
        let lite_m2_cursor = liteFn_m2_skipTrivia(lite_source, lite$addInt(lite_open, 1n, 126450), lite_prefix);
        void lite_m2_cursor;
        if (((lite_m2_cursor) >= (lite_close))) {
            return false;
        }
        if (liteFn_m6_isNameStart(liteFn_m6_at(lite_source, lite_m2_cursor))) {
            const lite_m2_word = liteFn_m6_slice(lite_source, lite_m2_cursor, liteFn_m6_skipName(lite_source, lite_m2_cursor));
            void lite_m2_word;
            if (((((((((((((((((((lite_m2_word) === ("return"))) || (((lite_m2_word) === ("outputLine"))))) || (((lite_m2_word) === ("output"))))) || (((lite_m2_word) === ("var"))))) || (((lite_m2_word) === ("loop"))))) || (((lite_m2_word) === ("break"))))) || (((lite_m2_word) === ("continue"))))) || (((lite_m2_word) === ("else"))))) || (((lite_m2_word) === ("fn"))))) {
                return false;
            }
        }
        let lite_m2_scan = lite_m2_cursor;
        void lite_m2_scan;
        while (((lite_m2_scan) < (lite_close))) {
            const lite_m2_ch = liteFn_m6_at(lite_source, lite_m2_scan);
            void lite_m2_ch;
            if (((lite_m2_ch) === ("\""))) {
                lite_m2_scan = liteFn_m2_skipAliasString(lite_source, lite_m2_scan);
            } else if (liteFn_m6_startsWithAt(lite_source, lite_m2_scan, "/*")) {
                lite_m2_scan = liteFn_m2_skipComment(lite_source, lite_m2_scan, lite_prefix);
            } else if (((lite_m2_ch) === (";"))) {
                return false;
            } else {
                lite_m2_scan = lite$addInt(lite_m2_scan, 1n, 127255);
            }
        }
        return true;
    }
    void liteFn_m2_valueIfBranchAt;
    function liteFn_m2_scanIfChainEnd(lite_source: string, lite_position: bigint, lite_prefix: string, lite_requireValueBranches: boolean, lite_allowPartial: boolean): bigint {
        void lite_source;
        void lite_position;
        void lite_prefix;
        void lite_requireValueBranches;
        void lite_allowPartial;
        const lite_m2_size = liteFn_m6_length(lite_source);
        void lite_m2_size;
        let lite_m2_cursor = liteFn_m2_skipTrivia(lite_source, lite_position, lite_prefix);
        void lite_m2_cursor;
        if ((!(liteFn_m6_wordAt(lite_source, lite_m2_cursor, "if")))) {
            return (-1n);
        }
        lite_m2_cursor = liteFn_m2_skipTrivia(lite_source, lite$addInt(lite_m2_cursor, 2n, 128018), lite_prefix);
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
            if (((lite_requireValueBranches) && ((!(liteFn_m2_valueIfBranchAt(lite_source, lite_m2_open, lite$subtractInt(lite_m2_end, 1n, 128301), lite_prefix)))))) {
                return (-1n);
            }
            const lite_m2_after = liteFn_m2_skipTrivia(lite_source, lite_m2_end, lite_prefix);
            void lite_m2_after;
            if ((!(liteFn_m6_wordAt(lite_source, lite_m2_after, "else")))) {
                return (Boolean(lite_allowPartial) ? lite_m2_end : (-1n));
            }
            const lite_m2_afterElse = liteFn_m2_skipTrivia(lite_source, lite$addInt(lite_m2_after, 4n, 128546), lite_prefix);
            void lite_m2_afterElse;
            if (liteFn_m6_wordAt(lite_source, lite_m2_afterElse, "if")) {
                lite_m2_cursor = liteFn_m2_skipTrivia(lite_source, lite$addInt(lite_m2_afterElse, 2n, 128663), lite_prefix);
            } else {
                if (((((lite_m2_afterElse) >= (lite_m2_size))) || (((liteFn_m6_at(lite_source, lite_m2_afterElse)) !== ("{"))))) {
                    return (-1n);
                }
                const lite_m2_finalEnd = liteFn_m2_scanBraceEnd(lite_source, lite_m2_afterElse, lite_prefix);
                void lite_m2_finalEnd;
                if (((lite_m2_finalEnd) < (0n))) {
                    return (-1n);
                }
                if (((lite_requireValueBranches) && ((!(liteFn_m2_valueIfBranchAt(lite_source, lite_m2_afterElse, lite$subtractInt(lite_m2_finalEnd, 1n, 128979), lite_prefix)))))) {
                    return (-1n);
                }
                return lite_m2_finalEnd;
            }
        }
        return (-1n);
    }
    void liteFn_m2_scanIfChainEnd;
    function liteFn_m2_scanValueIfEnd(lite_source: string, lite_position: bigint, lite_prefix: string, lite_requireValueBranches: boolean): bigint {
        void lite_source;
        void lite_position;
        void lite_prefix;
        void lite_requireValueBranches;
        return liteFn_m2_scanIfChainEnd(lite_source, lite_position, lite_prefix, lite_requireValueBranches, false);
    }
    void liteFn_m2_scanValueIfEnd;
    function liteFn_m2_parseInitializerExpression(lite_target: string, lite_source: string, lite_position: bigint, lite_prefix: string, lite_locals: { name: string; runtime: string; kind: string; mutable: boolean; writable: boolean; depth: bigint; constant: boolean; code: string; intValue: bigint; textValue: string }[], lite_functions: { name: string; runtime: string; result: string; first: bigint; count: bigint }[], lite_params: string[], lite_currentName: string, lite_expected: string): { kind: string; code: string; intValue: bigint; textValue: string; constant: boolean; next: bigint } {
        void lite_target;
        void lite_source;
        void lite_position;
        void lite_prefix;
        void lite_locals;
        void lite_functions;
        void lite_params;
        void lite_currentName;
        void lite_expected;
        let lite_m2_inner = liteFn_m2_skipTrivia(lite_source, lite_position, lite_prefix);
        void lite_m2_inner;
        let lite_m2_parenCount = 0n;
        void lite_m2_parenCount;
        while (((((lite_m2_inner) < (liteFn_m6_length(lite_source)))) && (((liteFn_m6_at(lite_source, lite_m2_inner)) === ("("))))) {
            lite_m2_parenCount = lite$addInt(lite_m2_parenCount, 1n, 129832);
            lite_m2_inner = liteFn_m2_skipTrivia(lite_source, lite$addInt(lite_m2_inner, 1n, 129878), lite_prefix);
        }
        if (liteFn_m6_wordAt(lite_source, lite_m2_inner, "if")) {
            const lite_m2_scannedEnd = liteFn_m2_scanIfChainEnd(lite_source, lite_m2_inner, lite_prefix, false, true);
            void lite_m2_scannedEnd;
            if (((lite_m2_scannedEnd) >= (0n))) {
                let lite_m2_end = liteFn_m2_skipTrivia(lite_source, lite_m2_scannedEnd, lite_prefix);
                void lite_m2_end;
                let lite_m2_remaining = lite_m2_parenCount;
                void lite_m2_remaining;
                let lite_m2_matched = true;
                void lite_m2_matched;
                while (((lite_m2_remaining) > (0n))) {
                    if (((((lite_m2_end) >= (liteFn_m6_length(lite_source)))) || (((liteFn_m6_at(lite_source, lite_m2_end)) !== (")"))))) {
                        lite_m2_matched = false;
                        break;
                    }
                    lite_m2_end = liteFn_m2_skipTrivia(lite_source, lite$addInt(lite_m2_end, 1n, 130429), lite_prefix);
                    lite_m2_remaining = lite$subtractInt(lite_m2_remaining, 1n, 130481);
                }
                if (((lite_m2_matched) && (((liteFn_m2_consumeStatementEnd(lite_source, lite_m2_end, lite_prefix)) >= (0n))))) {
                    const lite_m2_parsed = liteFn_m2_parseBinary(lite_target, lite_source, lite_m2_inner, lite_prefix, [...(lite_locals)], [...(lite_functions)], [...(lite_params)], lite_currentName, lite_expected, (-1n));
                    void lite_m2_parsed;
                    return { kind: (lite_m2_parsed).kind, code: (lite_m2_parsed).code, intValue: (lite_m2_parsed).intValue, textValue: (lite_m2_parsed).textValue, constant: (lite_m2_parsed).constant, next: lite_m2_end };
                }
            }
        }
        return liteFn_m2_parseExpressionAs(lite_target, lite_source, lite_position, lite_prefix, [...(lite_locals)], [...(lite_functions)], [...(lite_params)], lite_currentName, lite_expected);
    }
    void liteFn_m2_parseInitializerExpression;
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
        const lite_m2_kind = lite$listAt((lite_blocks), lite$subtractInt(lite_blockCount, 1n, 131699), 131688);
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
    function liteFn_m2_scanExpressionItemEnd(lite_source: string, lite_start: bigint, lite_prefix: string): bigint {
        void lite_source;
        void lite_start;
        void lite_prefix;
        let lite_m2_cursor = lite_start;
        void lite_m2_cursor;
        let lite_m2_depth = 0n;
        void lite_m2_depth;
        const lite_m2_size = liteFn_m6_length(lite_source);
        void lite_m2_size;
        while (((lite_m2_cursor) < (lite_m2_size))) {
            const lite_m2_ch = liteFn_m6_at(lite_source, lite_m2_cursor);
            void lite_m2_ch;
            if (((lite_m2_ch) === ("\""))) {
                lite_m2_cursor = liteFn_m2_skipAliasString(lite_source, lite_m2_cursor);
            } else if (liteFn_m6_startsWithAt(lite_source, lite_m2_cursor, "/*")) {
                lite_m2_cursor = liteFn_m2_skipComment(lite_source, lite_m2_cursor, lite_prefix);
            } else if (((((lite_m2_depth) === (0n))) && ((((((lite_m2_ch) === (";"))) || (((lite_m2_ch) === ("}")))))))) {
                return lite_m2_cursor;
            } else {
                if (((((((lite_m2_ch) === ("("))) || (((lite_m2_ch) === ("["))))) || (((lite_m2_ch) === ("{"))))) {
                    lite_m2_depth = lite$addInt(lite_m2_depth, 1n, 132685);
                } else if (((((((lite_m2_ch) === (")"))) || (((lite_m2_ch) === ("]"))))) || (((lite_m2_ch) === ("}"))))) {
                    lite_m2_depth = lite$subtractInt(lite_m2_depth, 1n, 132764);
                }
                lite_m2_cursor = lite$addInt(lite_m2_cursor, 1n, 132799);
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
                if (((((lite_m2_next) < (liteFn_m6_length(lite_source)))) && (((liteFn_m6_at(lite_source, lite_m2_next)) === ("}"))))) {
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
        const lite_m2_returned = ((((((((lite_currentName) !== (""))) && (lite_valueTail))) && (((lite_m2_next) < (liteFn_m6_length(lite_source)))))) && (((liteFn_m6_at(lite_source, lite_m2_next)) === ("}"))));
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
        const lite_m2_size = liteFn_m6_length(lite_source);
        void lite_m2_size;
        let lite_m2_cursor = 0n;
        void lite_m2_cursor;
        let lite_m2_braceDepth = 0n;
        void lite_m2_braceDepth;
        while (((lite_m2_cursor) < (lite_m2_size))) {
            const lite_m2_ch = liteFn_m6_at(lite_source, lite_m2_cursor);
            void lite_m2_ch;
            if (((lite_m2_ch) === ("\""))) {
                lite_m2_cursor = liteFn_m2_skipAliasString(lite_source, lite_m2_cursor);
            } else if (liteFn_m6_startsWithAt(lite_source, lite_m2_cursor, "/*")) {
                lite_m2_cursor = liteFn_m2_skipComment(lite_source, lite_m2_cursor, lite_prefix);
            } else if (((lite_m2_ch) === ("{"))) {
                lite_m2_braceDepth = lite$addInt(lite_m2_braceDepth, 1n, 135688);
                lite_m2_cursor = lite$addInt(lite_m2_cursor, 1n, 135721);
            } else if (((lite_m2_ch) === ("}"))) {
                if (((lite_m2_braceDepth) > (0n))) {
                    lite_m2_braceDepth = lite$subtractInt(lite_m2_braceDepth, 1n, 135812);
                }
                lite_m2_cursor = lite$addInt(lite_m2_cursor, 1n, 135847);
            } else if (((((lite_m2_braceDepth) === (0n))) && (liteFn_m6_isNameStart(lite_m2_ch)))) {
                const lite_m2_nameStart = lite_m2_cursor;
                void lite_m2_nameStart;
                const lite_m2_nameEnd = liteFn_m6_skipName(lite_source, lite_m2_cursor);
                void lite_m2_nameEnd;
                const lite_m2_afterName = liteFn_m2_skipTrivia(lite_source, lite_m2_nameEnd, lite_prefix);
                void lite_m2_afterName;
                if (liteFn_m6_startsWithAt(lite_source, lite_m2_afterName, ":=")) {
                    const lite_m2_valueStart = liteFn_m2_skipTrivia(lite_source, lite$addInt(lite_m2_afterName, 2n, 136190), lite_prefix);
                    void lite_m2_valueStart;
                    if ((((!(liteFn_m6_wordAt(lite_source, lite_m2_valueStart, "fn")))) && ((!(liteFn_m6_wordAt(lite_source, lite_m2_valueStart, "type")))))) {
                        const lite_m2_valueCh = liteFn_m6_at(lite_source, lite_m2_valueStart);
                        void lite_m2_valueCh;
                        let lite_m2_kind = "";
                        void lite_m2_kind;
                        let lite_m2_intValue = 0n;
                        void lite_m2_intValue;
                        let lite_m2_textValue = "";
                        void lite_m2_textValue;
                        if (((((liteFn_m6_isDigit(lite_m2_valueCh)) || (((lite_m2_valueCh) === ("+"))))) || (((lite_m2_valueCh) === ("-"))))) {
                            const lite_m2_parsed = liteFn_m2_parseNumber(lite_target, lite_source, lite_m2_valueStart, lite_prefix);
                            void lite_m2_parsed;
                            lite_m2_kind = (lite_m2_parsed).kind;
                            lite_m2_intValue = (lite_m2_parsed).intValue;
                        } else if (((lite_m2_valueCh) === ("\""))) {
                            const lite_m2_parsed = liteFn_m2_parseText(lite_target, lite_source, lite_m2_valueStart, lite_prefix);
                            void lite_m2_parsed;
                            lite_m2_kind = (lite_m2_parsed).kind;
                            lite_m2_textValue = (lite_m2_parsed).textValue;
                        } else if (((liteFn_m6_wordAt(lite_source, lite_m2_valueStart, "true")) || (liteFn_m6_wordAt(lite_source, lite_m2_valueStart, "false")))) {
                            lite_m2_kind = "Bool";
                            lite_m2_intValue = (Boolean(liteFn_m6_wordAt(lite_source, lite_m2_valueStart, "true")) ? 1n : 0n);
                        }
                        if (((lite_m2_kind) !== (""))) {
                            const lite_m2_valueName = liteFn_m6_slice(lite_source, lite_m2_nameStart, lite_m2_nameEnd);
                            void lite_m2_valueName;
                            lite_m2_values.push({ name: lite_m2_valueName, runtime: (("lite_") + (lite_m2_valueName)), kind: lite_m2_kind, at: lite_m2_nameStart, intValue: lite_m2_intValue, textValue: lite_m2_textValue });
                        }
                    }
                    lite_m2_cursor = lite_m2_valueStart;
                } else {
                    lite_m2_cursor = lite_m2_nameEnd;
                }
            } else {
                lite_m2_cursor = lite$addInt(lite_m2_cursor, 1n, 137788);
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
        if (((lite_alias) === (""))) {
            liteFn_m2_failAt(lite_source, lite_position, lite_prefix, "import requires a module alias");
        }
        const lite_m2_pathStart = liteFn_m2_skipTrivia(lite_source, lite$addInt(lite_position, 6n, 138435), lite_prefix);
        void lite_m2_pathStart;
        if (((((lite_m2_pathStart) >= (liteFn_m6_length(lite_source)))) || (((liteFn_m6_at(lite_source, lite_m2_pathStart)) !== ("\""))))) {
            liteFn_m2_failAt(lite_source, lite_m2_pathStart, lite_prefix, "import requires a quoted source path");
        }
        const lite_m2_path = liteFn_m2_parseText(lite_target, lite_source, lite_m2_pathStart, lite_prefix);
        void lite_m2_path;
        const lite_m2_pathLength = liteFn_m6_length((lite_m2_path).textValue);
        void lite_m2_pathLength;
        let lite_m2_invalidPath = ((lite_m2_pathLength) === (0n));
        void lite_m2_invalidPath;
        let lite_m2_pathIndex = 0n;
        void lite_m2_pathIndex;
        while (((lite_m2_pathIndex) < (lite_m2_pathLength))) {
            if (((liteFn_m6_at((lite_m2_path).textValue, lite_m2_pathIndex)) === ("\\"))) {
                lite_m2_invalidPath = true;
            }
            lite_m2_pathIndex = lite$addInt(lite_m2_pathIndex, 1n, 138942);
        }
        if (lite_m2_invalidPath) {
            liteFn_m2_failAt(lite_source, lite_m2_pathStart, lite_prefix, "import path must be nonempty and use \"/\" separators");
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
        const lite_m2_size = liteFn_m6_length(lite_source);
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
            const lite_m2_ch = liteFn_m6_at(lite_source, lite_m2_position);
            void lite_m2_ch;
            if (((lite_m2_ch) === ("\""))) {
                lite_m2_position = liteFn_m2_skipAliasString(lite_source, lite_m2_position);
            } else if (((lite_m2_ch) === ("{"))) {
                lite_m2_depth = lite$addInt(lite_m2_depth, 1n, 140024);
                lite_m2_position = lite$addInt(lite_m2_position, 1n, 140061);
            } else if (((lite_m2_ch) === ("}"))) {
                if (((lite_m2_depth) > (0n))) {
                    lite_m2_depth = lite$subtractInt(lite_m2_depth, 1n, 140137);
                }
                lite_m2_position = lite$addInt(lite_m2_position, 1n, 140176);
            } else if (((((lite_m2_depth) === (0n))) && (liteFn_m6_isNameStart(lite_m2_ch)))) {
                const lite_m2_nameEnd = liteFn_m6_skipName(lite_source, lite_m2_position);
                void lite_m2_nameEnd;
                const lite_m2_name = liteFn_m6_slice(lite_source, lite_m2_position, lite_m2_nameEnd);
                void lite_m2_name;
                if (((lite_m2_name) === ("import"))) {
                    const lite_m2_imported = liteFn_m2_parseImportClause(lite_target, lite_source, lite_m2_position, "", lite_prefix);
                    void lite_m2_imported;
                    lite_m2_imports.push(lite_m2_imported);
                    lite_m2_position = (lite_m2_imported).intValue;
                } else {
                    const lite_m2_afterName = liteFn_m2_skipTrivia(lite_source, lite_m2_nameEnd, lite_prefix);
                    void lite_m2_afterName;
                    const lite_m2_afterDeclare = liteFn_m2_skipTrivia(lite_source, lite$addInt(lite_m2_afterName, 2n, 140731), lite_prefix);
                    void lite_m2_afterDeclare;
                    if (((liteFn_m6_startsWithAt(lite_source, lite_m2_afterName, ":=")) && (liteFn_m6_wordAt(lite_source, lite_m2_afterDeclare, "import")))) {
                        const lite_m2_imported = liteFn_m2_parseImportClause(lite_target, lite_source, lite_m2_afterDeclare, lite_m2_name, lite_prefix);
                        void lite_m2_imported;
                        lite_m2_imports.push(lite_m2_imported);
                        lite_m2_position = (lite_m2_imported).intValue;
                    } else {
                        lite_m2_position = lite_m2_nameEnd;
                    }
                }
            } else {
                lite_m2_position = lite$addInt(lite_m2_position, 1n, 141215);
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
        const lite_m2_size = liteFn_m6_length(lite_source);
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
            const lite_m2_ch = liteFn_m6_at(lite_source, lite_m2_position);
            void lite_m2_ch;
            if (((lite_m2_ch) === ("\""))) {
                lite_m2_position = liteFn_m2_skipAliasString(lite_source, lite_m2_position);
            } else if (((lite_m2_ch) === ("{"))) {
                lite_m2_depth = lite$addInt(lite_m2_depth, 1n, 141805);
                lite_m2_position = lite$addInt(lite_m2_position, 1n, 141842);
            } else if (((lite_m2_ch) === ("}"))) {
                if (((lite_m2_depth) > (0n))) {
                    lite_m2_depth = lite$subtractInt(lite_m2_depth, 1n, 141918);
                }
                lite_m2_position = lite$addInt(lite_m2_position, 1n, 141957);
            } else if (((((lite_m2_depth) === (0n))) && (liteFn_m6_wordAt(lite_source, lite_m2_position, "pub")))) {
                const lite_m2_declarationStart = liteFn_m2_skipTrivia(lite_source, lite$addInt(lite_m2_position, 3n, 142097), lite_prefix);
                void lite_m2_declarationStart;
                if (((((lite_m2_declarationStart) < (lite_m2_size))) && (liteFn_m6_isNameStart(liteFn_m6_at(lite_source, lite_m2_declarationStart))))) {
                    const lite_m2_nameEnd = liteFn_m6_skipName(lite_source, lite_m2_declarationStart);
                    void lite_m2_nameEnd;
                    const lite_m2_operator = liteFn_m2_skipTrivia(lite_source, lite_m2_nameEnd, lite_prefix);
                    void lite_m2_operator;
                    const lite_m2_value = liteFn_m2_skipTrivia(lite_source, lite$addInt(lite_m2_operator, 2n, 142403), lite_prefix);
                    void lite_m2_value;
                    if (((liteFn_m6_startsWithAt(lite_source, lite_m2_operator, ":=")) && (liteFn_m6_wordAt(lite_source, lite_m2_value, "fn")))) {
                        lite_m2_names.push(liteFn_m6_slice(lite_source, lite_m2_declarationStart, lite_m2_nameEnd));
                    }
                    lite_m2_position = lite_m2_nameEnd;
                } else {
                    lite_m2_position = lite$addInt(lite_m2_position, 3n, 142733);
                }
            } else {
                lite_m2_position = lite$addInt(lite_m2_position, 1n, 142801);
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
        const lite_m2_size = liteFn_m6_length(lite_source);
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
            const lite_m2_ch = liteFn_m6_at(lite_source, lite_m2_position);
            void lite_m2_ch;
            if (((lite_m2_ch) === ("\""))) {
                lite_m2_position = liteFn_m2_skipAliasString(lite_source, lite_m2_position);
            } else if (((lite_m2_ch) === ("{"))) {
                lite_m2_depth = lite$addInt(lite_m2_depth, 1n, 143431);
                lite_m2_position = lite$addInt(lite_m2_position, 1n, 143468);
            } else if (((lite_m2_ch) === ("}"))) {
                if (((lite_m2_depth) > (0n))) {
                    lite_m2_depth = lite$subtractInt(lite_m2_depth, 1n, 143544);
                }
                lite_m2_position = lite$addInt(lite_m2_position, 1n, 143583);
            } else if (((((lite_m2_depth) === (0n))) && (liteFn_m6_wordAt(lite_source, lite_m2_position, "pub")))) {
                const lite_m2_declarationStart = liteFn_m2_skipTrivia(lite_source, lite$addInt(lite_m2_position, 3n, 143723), lite_prefix);
                void lite_m2_declarationStart;
                if (((((lite_m2_declarationStart) < (lite_m2_size))) && (liteFn_m6_isNameStart(liteFn_m6_at(lite_source, lite_m2_declarationStart))))) {
                    const lite_m2_nameEnd = liteFn_m6_skipName(lite_source, lite_m2_declarationStart);
                    void lite_m2_nameEnd;
                    const lite_m2_operator = liteFn_m2_skipTrivia(lite_source, lite_m2_nameEnd, lite_prefix);
                    void lite_m2_operator;
                    const lite_m2_value = liteFn_m2_skipTrivia(lite_source, lite$addInt(lite_m2_operator, 2n, 144029), lite_prefix);
                    void lite_m2_value;
                    if (((((liteFn_m6_startsWithAt(lite_source, lite_m2_operator, ":=")) && ((!(liteFn_m6_wordAt(lite_source, lite_m2_value, "fn")))))) && ((!(liteFn_m6_wordAt(lite_source, lite_m2_value, "type")))))) {
                        lite_m2_names.push(liteFn_m6_slice(lite_source, lite_m2_declarationStart, lite_m2_nameEnd));
                    }
                    lite_m2_position = lite_m2_nameEnd;
                } else {
                    lite_m2_position = lite$addInt(lite_m2_position, 3n, 144429);
                }
            } else {
                lite_m2_position = lite$addInt(lite_m2_position, 1n, 144497);
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
        const lite_m2_size = liteFn_m6_length(lite_source);
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
            const lite_m2_ch = liteFn_m6_at(lite_source, lite_m2_position);
            void lite_m2_ch;
            if (((lite_m2_ch) === ("\""))) {
                lite_m2_position = liteFn_m2_skipAliasString(lite_source, lite_m2_position);
            } else if (((lite_m2_ch) === ("{"))) {
                lite_m2_depth = lite$addInt(lite_m2_depth, 1n, 145101);
                lite_m2_position = lite$addInt(lite_m2_position, 1n, 145138);
            } else if (((lite_m2_ch) === ("}"))) {
                if (((lite_m2_depth) > (0n))) {
                    lite_m2_depth = lite$subtractInt(lite_m2_depth, 1n, 145214);
                }
                lite_m2_position = lite$addInt(lite_m2_position, 1n, 145253);
            } else if (((((lite_m2_depth) === (0n))) && (liteFn_m6_wordAt(lite_source, lite_m2_position, "pub")))) {
                const lite_m2_declarationStart = liteFn_m2_skipTrivia(lite_source, lite$addInt(lite_m2_position, 3n, 145393), lite_prefix);
                void lite_m2_declarationStart;
                if (((((lite_m2_declarationStart) < (lite_m2_size))) && (liteFn_m6_isNameStart(liteFn_m6_at(lite_source, lite_m2_declarationStart))))) {
                    const lite_m2_nameEnd = liteFn_m6_skipName(lite_source, lite_m2_declarationStart);
                    void lite_m2_nameEnd;
                    const lite_m2_operator = liteFn_m2_skipTrivia(lite_source, lite_m2_nameEnd, lite_prefix);
                    void lite_m2_operator;
                    const lite_m2_typeStart = liteFn_m2_skipTrivia(lite_source, lite$addInt(lite_m2_operator, 2n, 145703), lite_prefix);
                    void lite_m2_typeStart;
                    if (((liteFn_m6_startsWithAt(lite_source, lite_m2_operator, ":=")) && (liteFn_m6_wordAt(lite_source, lite_m2_typeStart, "type")))) {
                        lite_m2_names.push(liteFn_m6_slice(lite_source, lite_m2_declarationStart, lite_m2_nameEnd));
                    }
                    lite_m2_position = lite_m2_nameEnd;
                } else {
                    lite_m2_position = lite$addInt(lite_m2_position, 3n, 146039);
                }
            } else {
                lite_m2_position = lite$addInt(lite_m2_position, 1n, 146107);
            }
        }
        return [...(lite_m2_names)];
    }
    void liteFn_m2_collectPublishedTypes;
    function liteFn_m2_parseOutputStatement(lite_target: string, lite_source: string, lite_openPosition: bigint, lite_outputName: string, lite_prefix: string, lite_locals: { name: string; runtime: string; kind: string; mutable: boolean; writable: boolean; depth: bigint; constant: boolean; code: string; intValue: bigint; textValue: string }[], lite_functions: { name: string; runtime: string; result: string; first: bigint; count: bigint }[], lite_params: string[], lite_currentName: string, lite_live: boolean): { kind: string; name: string; runtime: string; code: string; intValue: bigint; textValue: string }[] {
        void lite_target;
        void lite_source;
        void lite_openPosition;
        void lite_outputName;
        void lite_prefix;
        void lite_locals;
        void lite_functions;
        void lite_params;
        void lite_currentName;
        void lite_live;
        let lite_m2_position = lite_openPosition;
        void lite_m2_position;
        if (((((lite_m2_position) >= (liteFn_m6_length(lite_source)))) || (((liteFn_m6_at(lite_source, lite_m2_position)) !== ("("))))) {
            liteFn_m2_failAt(lite_source, lite_m2_position, lite_prefix, (("expected ( after ") + (lite_outputName)));
        }
        lite_m2_position = liteFn_m2_skipTrivia(lite_source, lite$addInt(lite_m2_position, 1n, 146732), lite_prefix);
        const lite_m2_result: { kind: string; name: string; runtime: string; code: string; intValue: bigint; textValue: string }[] = [...([])];
        void lite_m2_result;
        while (((((lite_m2_position) < (liteFn_m6_length(lite_source)))) && (((liteFn_m6_at(lite_source, lite_m2_position)) !== (")"))))) {
            const lite_m2_argument = liteFn_m2_parseExpression(lite_target, lite_source, lite_m2_position, lite_prefix, [...(lite_locals)], [...(lite_functions)], [...(lite_params)], lite_currentName);
            void lite_m2_argument;
            if (lite_live) {
                lite_m2_result.push({ kind: (lite_m2_argument).kind, name: "", runtime: "", code: (lite_m2_argument).code, intValue: (lite_m2_argument).intValue, textValue: (lite_m2_argument).textValue });
            }
            lite_m2_position = liteFn_m2_skipTrivia(lite_source, (lite_m2_argument).next, lite_prefix);
            if (((((lite_m2_position) < (liteFn_m6_length(lite_source)))) && (((liteFn_m6_at(lite_source, lite_m2_position)) === (","))))) {
                lite_m2_position = liteFn_m2_skipTrivia(lite_source, lite$addInt(lite_m2_position, 1n, 147371), lite_prefix);
            } else {
                break;
            }
        }
        lite_m2_position = liteFn_m2_expectSymbol(lite_source, lite_m2_position, ")", lite_prefix);
        const lite_m2_statementNext = liteFn_m2_consumeStatementEnd(lite_source, lite_m2_position, lite_prefix);
        void lite_m2_statementNext;
        if (((lite_m2_statementNext) < (0n))) {
            liteFn_m2_failAt(lite_source, liteFn_m2_skipTrivia(lite_source, lite_m2_position, lite_prefix), lite_prefix, (("expected ; after ") + (lite_outputName)));
        }
        lite_m2_result.push({ kind: (Boolean(((lite_outputName) === ("outputLine"))) ? "End" : "EndOutput"), name: "", runtime: "", code: "", intValue: lite_m2_statementNext, textValue: "" });
        return [...(lite_m2_result)];
    }
    void liteFn_m2_parseOutputStatement;
    function liteFn_m2_parseProgramWithIdentity(lite_target: string, lite_source: string, lite_prefix: string, lite_exports: { kind: string; name: string; runtime: string; code: string; intValue: bigint; textValue: string }[], lite_moduleId: bigint, lite_moduleIdentity: string): { kind: string; name: string; runtime: string; code: string; intValue: bigint; textValue: string }[] {
        void lite_target;
        void lite_source;
        void lite_prefix;
        void lite_exports;
        void lite_moduleId;
        void lite_moduleIdentity;
        const lite_m2_size = liteFn_m6_length(lite_source);
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
                    liteFn_m9_fail(lite_prefix, (("duplicate imported module name ") + ((lite_m2_exported).name)));
                }
                lite_m2_locals.push({ name: (lite_m2_exported).name, runtime: "", kind: "Module", mutable: false, writable: false, depth: 0n, constant: false, code: "", intValue: (lite_m2_exported).intValue, textValue: (lite_m2_exported).name });
            } else if ((((lite_m2_exported).kind) === ("PublicFunction"))) {
                if (((((liteFn_m2_findFunction([...(lite_m2_functions)], (lite_m2_exported).name)) >= (0n))) || (((liteFn_m2_localIndex([...(lite_m2_locals)], (lite_m2_exported).name)) >= (0n))))) {
                    liteFn_m9_fail(lite_prefix, (("duplicate imported public name ") + ((lite_m2_exported).name)));
                }
                const lite_m2_first = lite_m2_parameterTotal;
                void lite_m2_first;
                let lite_m2_entryStart = 0n;
                void lite_m2_entryStart;
                let lite_m2_entryIndex = 0n;
                void lite_m2_entryIndex;
                while (((lite_m2_entryIndex) < ((lite_m2_exported).intValue))) {
                    const lite_m2_separator = liteFn_m6_indexOfText((lite_m2_exported).textValue, "|", lite_m2_entryStart);
                    void lite_m2_separator;
                    let lite_m2_entryEnd = liteFn_m6_length((lite_m2_exported).textValue);
                    void lite_m2_entryEnd;
                    if (((lite_m2_separator) >= (0n))) {
                        lite_m2_entryEnd = lite_m2_separator;
                    }
                    lite_m2_functionParams.push(liteFn_m6_slice((lite_m2_exported).textValue, lite_m2_entryStart, lite_m2_entryEnd));
                    lite_m2_parameterTotal = lite$addInt(lite_m2_parameterTotal, 1n, 150518);
                    lite_m2_entryStart = lite$addInt(lite_m2_entryEnd, 1n, 150561);
                    lite_m2_entryIndex = lite$addInt(lite_m2_entryIndex, 1n, 150606);
                }
                lite_m2_functions.push({ name: (lite_m2_exported).name, runtime: (lite_m2_exported).runtime, result: (lite_m2_exported).code, first: lite_m2_first, count: (lite_m2_exported).intValue });
            } else if ((((lite_m2_exported).kind) === ("PublicValue"))) {
                if (((((liteFn_m2_findFunction([...(lite_m2_functions)], (lite_m2_exported).name)) >= (0n))) || (((liteFn_m2_localIndex([...(lite_m2_locals)], (lite_m2_exported).name)) >= (0n))))) {
                    liteFn_m9_fail(lite_prefix, (("duplicate imported public name ") + ((lite_m2_exported).name)));
                }
                lite_m2_locals.push({ name: (lite_m2_exported).name, runtime: (lite_m2_exported).runtime, kind: (lite_m2_exported).code, mutable: false, writable: false, depth: 0n, constant: false, code: (lite_m2_exported).runtime, intValue: 0n, textValue: "" });
            } else if ((((lite_m2_exported).kind) === ("PublicType"))) {
                if (((liteFn_m2_findAlias([...(lite_m2_aliases)], (lite_m2_exported).name)) < (0n))) {
                    liteFn_m9_fail(lite_prefix, (("unknown imported public type ") + ((lite_m2_exported).name)));
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
            const lite_m2_ch = liteFn_m6_at(lite_source, lite_m2_position);
            void lite_m2_ch;
            if (((lite_m2_ch) === (";"))) {
                lite_m2_position = liteFn_m2_skipItemSeparators(lite_source, lite_m2_position, lite_prefix);
                continue;
            }
            if (((lite_m2_ch) === ("}"))) {
                if (((lite_m2_blockCount) === (0n))) {
                    liteFn_m2_failAt(lite_source, lite_m2_position, lite_prefix, "unexpected }");
                }
                const lite_m2_blockKind = lite$listAt((lite_m2_blocks), lite$subtractInt(lite_m2_blockCount, 1n, 152288), 152277);
                void lite_m2_blockKind;
                if (((((((lite_m2_blockKind) === ("ifvalue"))) && (((lite_m2_currentResult) !== ("Unit"))))) && ((!(lite_m2_currentReturned))))) {
                    liteFn_m2_failAt(lite_source, lite_m2_position, lite_prefix, (((((("branch of function ") + (lite_m2_currentName))) + (" must return "))) + (liteFn_m2_displayKind(lite_m2_currentResult))));
                }
                const lite_m2_after = liteFn_m2_skipTrivia(lite_source, lite$addInt(lite_m2_position, 1n, 152584), lite_prefix);
                void lite_m2_after;
                if ((((((((((lite_m2_blockKind) === ("if"))) || (((lite_m2_blockKind) === ("ifvalue")))))) && (((lite_m2_after) < (lite_m2_size))))) && (liteFn_m6_wordAt(lite_source, lite_m2_after, "else")))) {
                    lite_m2_locals = [...(liteFn_m2_visibleLocals([...(lite_m2_locals)], lite_m2_depth))];
                    const lite_m2_afterElse = liteFn_m2_skipTrivia(lite_source, lite$addInt(lite_m2_after, 4n, 152829), lite_prefix);
                    void lite_m2_afterElse;
                    lite_m2_branchesReturned = ((lite_m2_branchesReturned) && (lite_m2_currentReturned));
                    lite_m2_branchesStopped = ((lite_m2_branchesStopped) && (lite_m2_currentStopped));
                    lite_m2_currentReturned = false;
                    lite_m2_currentStopped = false;
                    lite_m2_hasElse = (!(liteFn_m6_wordAt(lite_source, lite_m2_afterElse, "if")));
                    const lite_m2_droppedIf = lite$listPopBack(lite_m2_blocks, 153167);
                    void lite_m2_droppedIf;
                    lite_m2_blockCount = lite$subtractInt(lite_m2_blockCount, 1n, 153236);
                    if (liteFn_m6_wordAt(lite_source, lite_m2_afterElse, "if")) {
                        const lite_m2_conditionStart = liteFn_m2_skipTrivia(lite_source, lite$addInt(lite_m2_afterElse, 2n, 153369), lite_prefix);
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
                        lite_m2_blockCount = lite$addInt(lite_m2_blockCount, 1n, 154327);
                    } else {
                        if (lite_m2_currentLive) {
                            lite_m2_items.push({ kind: "Else", name: "", runtime: "", code: "", intValue: 0n, textValue: "" });
                        }
                        lite_m2_blocks.push((Boolean(((lite_m2_blockKind) === ("ifvalue"))) ? "ifvalue" : "else"));
                        lite_m2_blockCount = lite$addInt(lite_m2_blockCount, 1n, 154659);
                        lite_m2_position = liteFn_m2_expectSymbol(lite_source, lite_m2_afterElse, "{", lite_prefix);
                    }
                    lite_m2_position = liteFn_m2_skipTrivia(lite_source, lite$addInt(lite_m2_position, 1n, 154814), lite_prefix);
                    continue;
                }
                lite_m2_locals = [...(liteFn_m2_visibleLocals([...(lite_m2_locals)], lite_m2_depth))];
                lite_m2_depth = lite$subtractInt(lite_m2_depth, 1n, 154945);
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
                const lite_m2_parent = lite$listPopBack(lite_m2_savedStates, 156828);
                void lite_m2_parent;
                lite_m2_currentReturned = (((lite_m2_parent).returned) || (((((((!((lite_m2_parent).stopped))) && (lite_m2_completedReturn))) && (((lite_m2_blockKind) !== ("function")))))));
                lite_m2_currentStopped = (((lite_m2_parent).stopped) || ((((lite_m2_completedStop) && (((lite_m2_blockKind) !== ("function")))))));
                lite_m2_branchesReturned = (lite_m2_parent).branchesReturned;
                lite_m2_branchesStopped = (lite_m2_parent).branchesStopped;
                lite_m2_hasElse = (lite_m2_parent).hasElse;
                lite_m2_loopForever = (lite_m2_parent).loopForever;
                lite_m2_currentLive = (lite_m2_parent).live;
                const lite_m2_droppedBlock = lite$listPopBack(lite_m2_blocks, 157336);
                void lite_m2_droppedBlock;
                lite_m2_blockCount = lite$subtractInt(lite_m2_blockCount, 1n, 157401);
                lite_m2_position = liteFn_m2_skipTrivia(lite_source, lite$addInt(lite_m2_position, 1n, 157457), lite_prefix);
                if (((((lite_m2_position) < (lite_m2_size))) && (((liteFn_m6_at(lite_source, lite_m2_position)) === (";"))))) {
                    lite_m2_position = liteFn_m2_skipTrivia(lite_source, lite$addInt(lite_m2_position, 1n, 157599), lite_prefix);
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
                lite_m2_blockCount = lite$addInt(lite_m2_blockCount, 1n, 158463);
                lite_m2_depth = lite$addInt(lite_m2_depth, 1n, 158494);
                lite_m2_position = liteFn_m2_skipTrivia(lite_source, lite$addInt(lite_m2_position, 1n, 158550), lite_prefix);
                continue;
            }
            if (((((((((((((((((((((liteFn_m6_isDigit(lite_m2_ch)) || (((lite_m2_ch) === ("\""))))) || (((lite_m2_ch) === ("("))))) || (((lite_m2_ch) === ("["))))) || (((lite_m2_ch) === ("+"))))) || (((lite_m2_ch) === ("-"))))) || ((((((lite_m2_ch) === ("a"))) && (liteFn_m6_wordAt(lite_source, lite_m2_position, "and"))))))) || ((((((lite_m2_ch) === ("o"))) && (liteFn_m6_wordAt(lite_source, lite_m2_position, "or"))))))) || ((((((lite_m2_ch) === ("n"))) && (liteFn_m6_wordAt(lite_source, lite_m2_position, "not"))))))) || ((((((lite_m2_ch) === ("t"))) && (liteFn_m6_wordAt(lite_source, lite_m2_position, "true"))))))) || ((((((lite_m2_ch) === ("f"))) && (liteFn_m6_wordAt(lite_source, lite_m2_position, "false"))))))) {
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
            if ((!(liteFn_m6_isNameStart(lite_m2_ch)))) {
                liteFn_m2_failAt(lite_source, lite_m2_position, lite_prefix, "expected a statement: output/outputLine, declaration, assignment, if or loop");
            }
            const lite_m2_nameStart = lite_m2_position;
            void lite_m2_nameStart;
            lite_m2_position = liteFn_m6_skipName(lite_source, lite_m2_position);
            const lite_m2_name = liteFn_m6_slice(lite_source, lite_m2_nameStart, lite_m2_position);
            void lite_m2_name;
            if (((lite_m2_name) === ("import"))) {
                if (((lite_m2_blockCount) !== (0n))) {
                    liteFn_m2_failAt(lite_source, lite_m2_nameStart, lite_prefix, "import is only allowed at top level");
                }
                liteFn_m2_failAt(lite_source, lite_m2_nameStart, lite_prefix, "import requires a module alias");
            }
            if (((lite_m2_name) === ("pub"))) {
                if (((lite_m2_blockCount) !== (0n))) {
                    liteFn_m2_failAt(lite_source, lite_m2_nameStart, lite_prefix, "pub is only allowed on top-level declarations");
                }
                const lite_m2_declarationStart = liteFn_m2_skipTrivia(lite_source, lite_m2_position, lite_prefix);
                void lite_m2_declarationStart;
                if (((((lite_m2_declarationStart) >= (lite_m2_size))) || ((!(liteFn_m6_isNameStart(liteFn_m6_at(lite_source, lite_m2_declarationStart))))))) {
                    liteFn_m2_failAt(lite_source, lite_m2_declarationStart, lite_prefix, "expected a declaration after pub");
                }
                const lite_m2_declarationEnd = liteFn_m6_skipName(lite_source, lite_m2_declarationStart);
                void lite_m2_declarationEnd;
                const lite_m2_declarationOperator = liteFn_m2_skipTrivia(lite_source, lite_m2_declarationEnd, lite_prefix);
                void lite_m2_declarationOperator;
                if ((!(liteFn_m6_startsWithAt(lite_source, lite_m2_declarationOperator, ":=")))) {
                    liteFn_m2_failAt(lite_source, lite_m2_declarationOperator, lite_prefix, "expected := after published declaration name");
                }
                lite_m2_position = lite_m2_declarationStart;
                continue;
            }
            lite_m2_position = liteFn_m2_skipTrivia(lite_source, lite_m2_position, lite_prefix);
            if (liteFn_m6_startsWithAt(lite_source, lite_m2_position, ":=")) {
                const lite_m2_afterImport = liteFn_m2_skipTrivia(lite_source, lite$addInt(lite_m2_position, 2n, 161301), lite_prefix);
                void lite_m2_afterImport;
                if (liteFn_m6_wordAt(lite_source, lite_m2_afterImport, "import")) {
                    if (((lite_m2_blockCount) !== (0n))) {
                        liteFn_m2_failAt(lite_source, lite_m2_nameStart, lite_prefix, "import is only allowed at top level");
                    }
                    if (liteFn_m7_listContainsText([...(lite_m2_declaredImportAliases)], lite_m2_name)) {
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
            if (liteFn_m6_startsWithAt(lite_source, lite_m2_position, ":=")) {
                lite_m2_afterDefinition = liteFn_m2_skipTrivia(lite_source, lite$addInt(lite_m2_position, 2n, 162175), lite_prefix);
            }
            const lite_m2_definition = ((((((lite_m2_blockCount) === (0n))) && (liteFn_m6_startsWithAt(lite_source, lite_m2_position, ":=")))) && ((((liteFn_m6_wordAt(lite_source, lite_m2_afterDefinition, "fn")) || (liteFn_m6_wordAt(lite_source, lite_m2_afterDefinition, "type"))))));
            void lite_m2_definition;
            if (((lite_m2_name) === ("return"))) {
                if (((lite_m2_currentName) === (""))) {
                    liteFn_m2_failAt(lite_source, lite_m2_nameStart, lite_prefix, "return outside a function");
                }
                const lite_m2_valueStart = lite_m2_position;
                void lite_m2_valueStart;
                if (((((((lite_m2_valueStart) >= (lite_m2_size))) || (((liteFn_m6_at(lite_source, lite_m2_valueStart)) === (";"))))) || (((liteFn_m6_at(lite_source, lite_m2_valueStart)) === ("}"))))) {
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
            let lite_m2_importedOutputName = "";
            void lite_m2_importedOutputName;
            let lite_m2_importedOutputOpen = lite_m2_position;
            void lite_m2_importedOutputOpen;
            const lite_m2_moduleIndex = liteFn_m2_localIndex([...(lite_m2_locals)], lite_m2_name);
            void lite_m2_moduleIndex;
            if (((((lite_m2_moduleIndex) >= (0n))) && ((((lite$listAt((lite_m2_locals), lite_m2_moduleIndex, 165344)).kind) === ("Module"))))) {
                if (((((lite_m2_position) >= (lite_m2_size))) || (((liteFn_m6_at(lite_source, lite_m2_position)) !== ("."))))) {
                    liteFn_m2_failAt(lite_source, lite_m2_nameStart, lite_prefix, (((("module namespace ") + (lite_m2_name))) + (" requires a public member")));
                }
                const lite_m2_memberStart = liteFn_m2_skipTrivia(lite_source, lite$addInt(lite_m2_position, 1n, 165628), lite_prefix);
                void lite_m2_memberStart;
                const lite_m2_memberEnd = liteFn_m6_skipName(lite_source, lite_m2_memberStart);
                void lite_m2_memberEnd;
                if (((lite_m2_memberEnd) > (lite_m2_memberStart))) {
                    const lite_m2_functionIndex = liteFn_m2_findFunction([...(lite_m2_functions)], ((((lite_m2_name) + ("."))) + (liteFn_m6_slice(lite_source, lite_m2_memberStart, lite_m2_memberEnd))));
                    void lite_m2_functionIndex;
                    if (((lite_m2_functionIndex) >= (0n))) {
                        lite_m2_importedOutputName = liteFn_m2_coreOutputName((lite$listAt((lite_m2_functions), lite_m2_functionIndex, 165971)).runtime);
                        lite_m2_importedOutputOpen = liteFn_m2_skipTrivia(lite_source, lite_m2_memberEnd, lite_prefix);
                    }
                }
            }
            if (((lite_m2_importedOutputName) !== (""))) {
                const lite_m2_parsedOutput: { kind: string; name: string; runtime: string; code: string; intValue: bigint; textValue: string }[] = [...(liteFn_m2_parseOutputStatement(lite_target, lite_source, lite_m2_importedOutputOpen, lite_m2_importedOutputName, lite_prefix, [...(lite_m2_locals)], [...(lite_m2_functions)], [...(lite_m2_functionParams)], lite_m2_currentName, ((lite_m2_currentLive) && ((!(lite_m2_currentStopped))))))];
                void lite_m2_parsedOutput;
                for (const lite_m2_outputItem of [...(lite_m2_parsedOutput)]) {
                    void lite_m2_outputItem;
                    if ((((((lite_m2_outputItem).kind) === ("End"))) || ((((lite_m2_outputItem).kind) === ("EndOutput"))))) {
                        lite_m2_position = (lite_m2_outputItem).intValue;
                    }
                    if (((lite_m2_currentLive) && ((!(lite_m2_currentStopped))))) {
                        lite_m2_items.push(lite_m2_outputItem);
                    }
                }
                continue;
            }
            if (((((lite_m2_moduleIndex) >= (0n))) && ((((lite$listAt((lite_m2_locals), lite_m2_moduleIndex, 166715)).kind) === ("Module"))))) {
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
            if (((((((lite_m2_callableIndex) >= (0n))) && (((lite_m2_position) < (lite_m2_size))))) && (((liteFn_m6_at(lite_source, lite_m2_position)) === ("("))))) {
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
            if (((lite_m2_name) === ("if"))) {
                let lite_m2_valueTailBranch = false;
                void lite_m2_valueTailBranch;
                if (((((((lite_m2_currentName) !== (""))) && (liteFn_m2_atValueTail([...(lite_m2_blocks)], lite_m2_blockCount)))) && ((!(lite_m2_currentStopped))))) {
                    const lite_m2_valueEnd = liteFn_m2_scanValueIfEnd(lite_source, lite_m2_nameStart, lite_prefix, true);
                    void lite_m2_valueEnd;
                    if (((lite_m2_valueEnd) >= (0n))) {
                        const lite_m2_afterChain = liteFn_m2_skipItemSeparators(lite_source, lite_m2_valueEnd, lite_prefix);
                        void lite_m2_afterChain;
                        if (((((lite_m2_afterChain) < (lite_m2_size))) && (((liteFn_m6_at(lite_source, lite_m2_afterChain)) === ("}"))))) {
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
                        if (((((lite_m2_afterStatement) < (lite_m2_size))) && (((liteFn_m6_at(lite_source, lite_m2_afterStatement)) === ("}"))))) {
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
                lite_m2_blockCount = lite$addInt(lite_m2_blockCount, 1n, 171382);
                lite_m2_depth = lite$addInt(lite_m2_depth, 1n, 171413);
                lite_m2_position = liteFn_m2_skipTrivia(lite_source, lite$addInt(lite_m2_position, 1n, 171469), lite_prefix);
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
                if (((((lite_m2_position) < (lite_m2_size))) && (((liteFn_m6_at(lite_source, lite_m2_position)) !== ("{"))))) {
                    const lite_m2_parsed = liteFn_m2_parseExpression(lite_target, lite_source, lite_m2_position, lite_prefix, [...(lite_m2_locals)], [...(lite_m2_functions)], [...(lite_m2_functionParams)], lite_m2_currentName);
                    void lite_m2_parsed;
                    const lite_m2_afterParsed = liteFn_m2_skipTrivia(lite_source, (lite_m2_parsed).next, lite_prefix);
                    void lite_m2_afterParsed;
                    if (liteFn_m6_wordAt(lite_source, lite_m2_afterParsed, "as")) {
                        if ((!(liteFn_m2_isListKind((lite_m2_parsed).kind)))) {
                            liteFn_m2_failAt(lite_source, lite_m2_position, lite_prefix, (("loop sequence must be a List, got ") + (liteFn_m2_displayKind((lite_m2_parsed).kind))));
                        }
                        const lite_m2_itemStart = liteFn_m2_skipTrivia(lite_source, lite$addInt(lite_m2_afterParsed, 2n, 172276), lite_prefix);
                        void lite_m2_itemStart;
                        if (((((lite_m2_itemStart) >= (lite_m2_size))) || ((!(liteFn_m6_isNameStart(liteFn_m6_at(lite_source, lite_m2_itemStart))))))) {
                            liteFn_m2_failAt(lite_source, lite_m2_itemStart, lite_prefix, "expected an item name after as");
                        }
                        const lite_m2_itemEnd = liteFn_m6_skipName(lite_source, lite_m2_itemStart);
                        void lite_m2_itemEnd;
                        lite_m2_itemName = liteFn_m6_slice(lite_source, lite_m2_itemStart, lite_m2_itemEnd);
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
                    lite_m2_locals.push({ name: lite_m2_itemName, runtime: lite_m2_runtime, kind: lite_m2_itemKind, mutable: false, writable: false, depth: lite$addInt(lite_m2_depth, 1n, 173797), constant: false, code: lite_m2_runtime, intValue: 0n, textValue: "" });
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
                lite_m2_blockCount = lite$addInt(lite_m2_blockCount, 1n, 175023);
                lite_m2_depth = lite$addInt(lite_m2_depth, 1n, 175054);
                lite_m2_position = liteFn_m2_skipTrivia(lite_source, lite$addInt(lite_m2_position, 1n, 175110), lite_prefix);
                continue;
            }
            if (((lite_m2_name) === ("var"))) {
                lite_m2_position = liteFn_m2_skipTrivia(lite_source, lite_m2_position, lite_prefix);
                if (((((lite_m2_position) >= (lite_m2_size))) || ((!(liteFn_m6_isNameStart(liteFn_m6_at(lite_source, lite_m2_position))))))) {
                    liteFn_m2_failAt(lite_source, lite_m2_position, lite_prefix, "expected local name after var");
                }
                const lite_m2_localStart = lite_m2_position;
                void lite_m2_localStart;
                lite_m2_position = liteFn_m6_skipName(lite_source, lite_m2_position);
                const lite_m2_localName = liteFn_m6_slice(lite_source, lite_m2_localStart, lite_m2_position);
                void lite_m2_localName;
                if (liteFn_m2_isReservedWord(lite_m2_localName)) {
                    liteFn_m2_unsupportedFeature(lite_source, lite_m2_localStart, lite_m2_localName, lite_prefix);
                }
                if (((((lite_m2_depth) === (0n))) && (((lite_m2_blockCount) === (0n))))) {
                    const lite_m2_rootIndex = liteFn_m2_localIndex([...(lite_m2_locals)], lite_m2_localName);
                    void lite_m2_rootIndex;
                    if (((((lite_m2_rootIndex) >= (0n))) && ((((lite$listAt((lite_m2_locals), lite_m2_rootIndex, 175854)).depth) === (0n))))) {
                        liteFn_m2_failAt(lite_source, lite_m2_localStart, lite_prefix, (("duplicate top-level value ") + (lite_m2_localName)));
                    }
                }
                lite_m2_position = liteFn_m2_skipTrivia(lite_source, lite_m2_position, lite_prefix);
                let lite_m2_parsed = liteFn_m2_intParsed("", 0n, true, lite_m2_position);
                void lite_m2_parsed;
                let lite_m2_declaredWritable = false;
                void lite_m2_declaredWritable;
                if (liteFn_m6_startsWithAt(lite_source, lite_m2_position, ":=")) {
                    lite_m2_position = liteFn_m2_skipTrivia(lite_source, lite$addInt(lite_m2_position, 2n, 176289), lite_prefix);
                    lite_m2_parsed = liteFn_m2_parseInitializerExpression(lite_target, lite_source, lite_m2_position, lite_prefix, [...(lite_m2_locals)], [...(lite_m2_functions)], [...(lite_m2_functionParams)], lite_m2_currentName, "");
                    if ((((lite_m2_parsed).kind) === ("Unit"))) {
                        liteFn_m2_failAt(lite_source, lite_m2_localStart, lite_prefix, (("cannot declare a Unit local ") + (lite_m2_localName)));
                    }
                } else if (((((lite_m2_position) < (lite_m2_size))) && (((liteFn_m6_at(lite_source, lite_m2_position)) === (":"))))) {
                    const lite_m2_typed = liteFn_m2_parseLocalType(lite_source, lite$addInt(lite_m2_position, 1n, 176740), lite_prefix, [...(lite_m2_aliases)]);
                    void lite_m2_typed;
                    lite_m2_declaredWritable = (lite_m2_typed).writable;
                    lite_m2_position = liteFn_m2_skipTrivia(lite_source, (lite_m2_typed).next, lite_prefix);
                    if (liteFn_m2_isSingleEquals(lite_source, lite_m2_position)) {
                        lite_m2_parsed = liteFn_m2_parseInitializerExpression(lite_target, lite_source, liteFn_m2_skipTrivia(lite_source, lite$addInt(lite_m2_position, 1n, 177035), lite_prefix), lite_prefix, [...(lite_m2_locals)], [...(lite_m2_functions)], [...(lite_m2_functionParams)], lite_m2_currentName, (lite_m2_typed).kind);
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
            if (((liteFn_m6_startsWithAt(lite_source, lite_m2_position, ":=")) && (liteFn_m6_wordAt(lite_source, lite_m2_afterDefinition, "type")))) {
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
                const lite_m2_typePosition = liteFn_m2_skipTrivia(lite_source, lite$addInt(lite_m2_position, 2n, 179385), lite_prefix);
                void lite_m2_typePosition;
                const lite_m2_targetStart = liteFn_m2_skipTrivia(lite_source, lite$addInt(lite_m2_typePosition, 4n, 179458), lite_prefix);
                void lite_m2_targetStart;
                const lite_m2_aliasIndex = liteFn_m2_aliasIndexAt([...(lite_m2_aliases)], lite_m2_nameStart);
                void lite_m2_aliasIndex;
                if (((lite_m2_aliasIndex) < (0n))) {
                    liteFn_m2_unsupportedAliasTarget(lite_source, lite_m2_targetStart, lite_prefix, "target");
                }
                const lite_m2_aliasEntry = lite$listAt((lite_m2_aliases), lite_m2_aliasIndex, 179691);
                void lite_m2_aliasEntry;
                if ((((lite_m2_aliasEntry).target) === (""))) {
                    liteFn_m2_unsupportedAliasTarget(lite_source, lite_m2_targetStart, lite_prefix, "target");
                }
                const lite_m2_seenAliases: string[] = [...([])];
                void lite_m2_seenAliases;
                const lite_m2_resolvedType = liteFn_m2_resolveTypeText(lite_source, lite_m2_targetStart, lite_prefix, [...(lite_m2_aliases)], (lite_m2_aliasEntry).target, [...(lite_m2_seenAliases)]);
                void lite_m2_resolvedType;
                if (liteFn_m7_listContainsText([...(lite_m2_publishedTypes)], lite_m2_name)) {
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
            if (liteFn_m6_startsWithAt(lite_source, lite_m2_position, ":=")) {
                const lite_m2_afterDeclare = liteFn_m2_skipTrivia(lite_source, lite$addInt(lite_m2_position, 2n, 180607), lite_prefix);
                void lite_m2_afterDeclare;
                if (liteFn_m6_wordAt(lite_source, lite_m2_afterDeclare, "fn")) {
                    if (((((lite_m2_blockCount) !== (0n))) || (((lite_m2_depth) !== (0n))))) {
                        liteFn_m2_failAt(lite_source, lite_m2_nameStart, lite_prefix, "function definitions are only allowed at top level");
                    }
                    if (((liteFn_m2_findFunction([...(lite_m2_functions)], lite_m2_name)) >= (0n))) {
                        liteFn_m2_failAt(lite_source, lite_m2_nameStart, lite_prefix, (("duplicate function ") + (lite_m2_name)));
                    }
                    const lite_m2_rootIndex = liteFn_m2_localIndex([...(lite_m2_locals)], lite_m2_name);
                    void lite_m2_rootIndex;
                    if (((((lite_m2_rootIndex) >= (0n))) && ((((lite$listAt((lite_m2_locals), lite_m2_rootIndex, 181120)).depth) === (0n))))) {
                        liteFn_m2_failAt(lite_source, lite_m2_nameStart, lite_prefix, (("duplicate top-level value ") + (lite_m2_name)));
                    }
                    lite_m2_position = liteFn_m2_skipTrivia(lite_source, lite$addInt(lite_m2_afterDeclare, 2n, 181313), lite_prefix);
                    const lite_m2_listIntrinsic = ((((lite_moduleIdentity) === ("lite.core.list.v1"))) && ((((((lite_m2_name) === ("pushBack"))) || (((lite_m2_name) === ("popBack")))))));
                    void lite_m2_listIntrinsic;
                    const lite_m2_header = liteFn_m2_parseFunctionHeader(lite_source, lite_m2_position, lite_prefix, [...(lite_m2_aliases)], lite_m2_listIntrinsic);
                    void lite_m2_header;
                    lite_m2_position = liteFn_m2_skipTrivia(lite_source, (lite_m2_header).next, lite_prefix);
                    if (((((lite_m2_position) < (lite_m2_size))) && (((liteFn_m6_at(lite_source, lite_m2_position)) === (";"))))) {
                        const lite_m2_hostRuntime = liteFn_m2_coreHostFunction(lite_moduleIdentity, lite_m2_name, (lite_m2_header).params, (lite_m2_header).result);
                        void lite_m2_hostRuntime;
                        if ((((!(liteFn_m7_listContainsText([...(lite_m2_publishedFunctions)], lite_m2_name)))) || (((lite_m2_hostRuntime) === (""))))) {
                            liteFn_m2_failAt(lite_source, lite_m2_nameStart, lite_prefix, "bodyless function declaration has no matching core host binding");
                        }
                        lite_m2_position = liteFn_m2_skipTrivia(lite_source, lite$addInt(lite_m2_position, 1n, 182100), lite_prefix);
                        lite_m2_functions.push({ name: lite_m2_name, runtime: lite_m2_hostRuntime, result: (lite_m2_header).result, first: lite_m2_parameterTotal, count: (lite_m2_header).count });
                        if (lite_m2_currentLive) {
                            lite_m2_items.push({ kind: "PublicFunction", name: lite_m2_name, runtime: lite_m2_hostRuntime, code: (lite_m2_header).result, intValue: (lite_m2_header).count, textValue: (lite_m2_header).params });
                        }
                        continue;
                    }
                    if ((((lite_m2_header).count) < (0n))) {
                        liteFn_m2_failAt(lite_source, lite_m2_nameStart, lite_prefix, "variadic parameters are reserved for registered core host declarations");
                    }
                    if ((((lite_m2_header).genericType) !== (""))) {
                        liteFn_m2_failAt(lite_source, lite_m2_nameStart, lite_prefix, "generic function bodies are not supported");
                    }
                    lite_m2_position = liteFn_m2_expectSymbol(lite_source, lite_m2_position, "{", lite_prefix);
                    const lite_m2_functionRuntime = (Boolean(((lite_moduleId) === (0n))) ? (("liteFn_") + (lite_m2_name)) : (((((("liteFn_m") + (liteFn_m4_intText(lite_moduleId)))) + ("_"))) + (lite_m2_name)));
                    void lite_m2_functionRuntime;
                    lite_m2_functions.push({ name: lite_m2_name, runtime: lite_m2_functionRuntime, result: (lite_m2_header).result, first: lite_m2_parameterTotal, count: (lite_m2_header).count });
                    if (liteFn_m7_listContainsText([...(lite_m2_publishedFunctions)], lite_m2_name)) {
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
                        const lite_m2_separator = liteFn_m6_indexOfText((lite_m2_header).params, "|", lite_m2_entryStart);
                        void lite_m2_separator;
                        let lite_m2_entryEnd = liteFn_m6_length((lite_m2_header).params);
                        void lite_m2_entryEnd;
                        if (((lite_m2_separator) >= (0n))) {
                            lite_m2_entryEnd = lite_m2_separator;
                        }
                        const lite_m2_entry = liteFn_m6_slice((lite_m2_header).params, lite_m2_entryStart, lite_m2_entryEnd);
                        void lite_m2_entry;
                        const lite_m2_parameterName = liteFn_m2_paramNameOf(lite_m2_entry);
                        void lite_m2_parameterName;
                        const lite_m2_parameterKind = liteFn_m2_paramKindOf(lite_m2_entry);
                        void lite_m2_parameterKind;
                        const lite_m2_runtime = (("lite_") + (lite_m2_parameterName));
                        void lite_m2_runtime;
                        lite_m2_functionParams.push(lite_m2_entry);
                        lite_m2_locals.push({ name: lite_m2_parameterName, runtime: lite_m2_runtime, kind: lite_m2_parameterKind, mutable: false, writable: false, depth: 1n, constant: false, code: lite_m2_runtime, intValue: 0n, textValue: "" });
                        lite_m2_parameterTotal = lite$addInt(lite_m2_parameterTotal, 1n, 185343);
                        lite_m2_entryStart = lite$addInt(lite_m2_entryEnd, 1n, 185390);
                        lite_m2_entryIndex = lite$addInt(lite_m2_entryIndex, 1n, 185439);
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
                    lite_m2_blockCount = lite$addInt(lite_m2_blockCount, 1n, 186206);
                    lite_m2_depth = lite$addInt(lite_m2_depth, 1n, 186241);
                    lite_m2_position = liteFn_m2_skipTrivia(lite_source, lite_m2_position, lite_prefix);
                    continue;
                }
                if (((((lite_m2_depth) === (0n))) && (((lite_m2_blockCount) === (0n))))) {
                    const lite_m2_rootIndex = liteFn_m2_localIndex([...(lite_m2_locals)], lite_m2_name);
                    void lite_m2_rootIndex;
                    if (((((lite_m2_rootIndex) >= (0n))) && ((((lite$listAt((lite_m2_locals), lite_m2_rootIndex, 186499)).depth) === (0n))))) {
                        liteFn_m2_failAt(lite_source, lite_m2_nameStart, lite_prefix, (("duplicate top-level value ") + (lite_m2_name)));
                    }
                }
                lite_m2_position = lite_m2_afterDeclare;
                const lite_m2_parsed = liteFn_m2_parseInitializerExpression(lite_target, lite_source, lite_m2_position, lite_prefix, [...(lite_m2_locals)], [...(lite_m2_functions)], [...(lite_m2_functionParams)], lite_m2_currentName, "");
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
                if (((((((lite_m2_depth) === (0n))) && (((lite_m2_blockCount) === (0n))))) && (liteFn_m7_listContainsText([...(lite_m2_publishedValues)], lite_m2_name)))) {
                    lite_m2_items.push({ kind: "PublicValue", name: lite_m2_name, runtime: lite_m2_runtime, code: (lite_m2_parsed).kind, intValue: 0n, textValue: "" });
                }
                if (((lite_m2_currentLive) && ((!(lite_m2_currentStopped))))) {
                    lite_m2_items.push({ kind: (("Local") + (liteFn_m2_storageKind((lite_m2_parsed).kind))), name: lite_m2_name, runtime: lite_m2_runtime, code: liteFn_m2_copiedValueCode(lite_target, (lite_m2_parsed).kind, (lite_m2_parsed).code), intValue: (lite_m2_parsed).intValue, textValue: liteFn_m2_itemTextPayload(lite_m2_parsed) });
                }
                continue;
            }
            if (((((lite_m2_position) < (lite_m2_size))) && (((liteFn_m6_at(lite_source, lite_m2_position)) === (":"))))) {
                if (((((lite_m2_depth) === (0n))) && (((lite_m2_blockCount) === (0n))))) {
                    const lite_m2_rootIndex = liteFn_m2_localIndex([...(lite_m2_locals)], lite_m2_name);
                    void lite_m2_rootIndex;
                    if (((((lite_m2_rootIndex) >= (0n))) && ((((lite$listAt((lite_m2_locals), lite_m2_rootIndex, 188421)).depth) === (0n))))) {
                        liteFn_m2_failAt(lite_source, lite_m2_nameStart, lite_prefix, (("duplicate top-level value ") + (lite_m2_name)));
                    }
                }
                const lite_m2_typed = liteFn_m2_parseLocalType(lite_source, lite$addInt(lite_m2_position, 1n, 188622), lite_prefix, [...(lite_m2_aliases)]);
                void lite_m2_typed;
                lite_m2_position = liteFn_m2_skipTrivia(lite_source, (lite_m2_typed).next, lite_prefix);
                let lite_m2_parsed = liteFn_m2_zeroParsed(lite_target, (lite_m2_typed).kind, lite_m2_position);
                void lite_m2_parsed;
                if (liteFn_m2_isSingleEquals(lite_source, lite_m2_position)) {
                    lite_m2_parsed = liteFn_m2_parseInitializerExpression(lite_target, lite_source, liteFn_m2_skipTrivia(lite_source, lite$addInt(lite_m2_position, 1n, 188922), lite_prefix), lite_prefix, [...(lite_m2_locals)], [...(lite_m2_functions)], [...(lite_m2_functionParams)], lite_m2_currentName, (lite_m2_typed).kind);
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
                const lite_m2_entry = lite$listAt((lite_m2_locals), lite_m2_index, 190426);
                void lite_m2_entry;
                if ((!((lite_m2_entry).mutable))) {
                    liteFn_m2_failAt(lite_source, lite_m2_nameStart, lite_prefix, (("cannot assign to immutable local ") + (lite_m2_name)));
                }
                lite_m2_position = liteFn_m2_skipTrivia(lite_source, lite$addInt(lite_m2_position, 1n, 190629), lite_prefix);
                const lite_m2_partialItems: { kind: string; name: string; runtime: string; code: string; intValue: bigint; textValue: string }[] = [...(liteFn_m2_parsePartialAssignIf(lite_target, lite_source, lite_m2_position, lite_prefix, [...(lite_m2_locals)], [...(lite_m2_functions)], [...(lite_m2_functionParams)], lite_m2_currentName, lite_m2_nameStart, (lite_m2_entry).kind, lite_m2_name, (lite_m2_entry).runtime))];
                void lite_m2_partialItems;
                let lite_m2_partialCount = 0n;
                void lite_m2_partialCount;
                for (const lite_m2_partialItem of [...(lite_m2_partialItems)]) {
                    void lite_m2_partialItem;
                    lite_m2_partialCount = lite$addInt(lite_m2_partialCount, 1n, 190945);
                    if ((((lite_m2_partialItem).kind) === ("End"))) {
                        lite_m2_position = (lite_m2_partialItem).intValue;
                    } else if (((lite_m2_currentLive) && ((!(lite_m2_currentStopped))))) {
                        lite_m2_items.push(lite_m2_partialItem);
                    }
                }
                if (((lite_m2_partialCount) > (0n))) {
                    lite_m2_locals.push({ name: (lite_m2_entry).name, runtime: (lite_m2_entry).runtime, kind: (lite_m2_entry).kind, mutable: true, writable: (lite_m2_entry).writable, depth: (lite_m2_entry).depth, constant: false, code: (lite_m2_entry).runtime, intValue: 0n, textValue: "" });
                    continue;
                }
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
    void liteFn_m2_parseProgramWithIdentity;
    function liteFn_m2_parseProgramWithExports(lite_target: string, lite_source: string, lite_prefix: string, lite_exports: { kind: string; name: string; runtime: string; code: string; intValue: bigint; textValue: string }[], lite_moduleId: bigint): { kind: string; name: string; runtime: string; code: string; intValue: bigint; textValue: string }[] {
        void lite_target;
        void lite_source;
        void lite_prefix;
        void lite_exports;
        void lite_moduleId;
        return [...(liteFn_m2_parseProgramWithIdentity(lite_target, lite_source, lite_prefix, [...(lite_exports)], lite_moduleId, ""))];
    }
    void liteFn_m2_parseProgramWithExports;
    function liteFn_m2_parseProgram(lite_target: string, lite_source: string, lite_prefix: string): { kind: string; name: string; runtime: string; code: string; intValue: bigint; textValue: string }[] {
        void lite_target;
        void lite_source;
        void lite_prefix;
        return [...(liteFn_m2_parseProgramWithIdentity(lite_target, lite_source, lite_prefix, [...([])], 0n, ""))];
    }
    void liteFn_m2_parseProgram;
    function liteFn_m2_lineStartCodes(lite_source: string): string {
        void lite_source;
        let lite_m2_code = "0";
        void lite_m2_code;
        let lite_m2_position = 0n;
        void lite_m2_position;
        while (((lite_m2_position) < (liteFn_m6_length(lite_source)))) {
            if (((liteFn_m6_at(lite_source, lite_m2_position)) === ("\n"))) {
                lite_m2_code = ((((lite_m2_code) + (", "))) + (liteFn_m4_intText(lite$addInt(lite_m2_position, 1n, 194354))));
            }
            lite_m2_position = lite$addInt(lite_m2_position, 1n, 194390);
        }
        return lite_m2_code;
    }
    void liteFn_m2_lineStartCodes;
    function liteFn_m14_moduleVisited(lite_graph: { kind: string; name: string; runtime: string; code: string; intValue: bigint; textValue: string }[], lite_path: string): boolean {
        void lite_graph;
        void lite_path;
        for (const lite_m14_item of [...(lite_graph)]) {
            void lite_m14_item;
            if ((((((lite_m14_item).kind) === ("ModuleVisited"))) && ((((lite_m14_item).name) === (lite_path))))) {
                return true;
            }
        }
        return false;
    }
    void liteFn_m14_moduleVisited;
    function liteFn_m14_moduleProcessed(lite_graph: { kind: string; name: string; runtime: string; code: string; intValue: bigint; textValue: string }[], lite_path: string): boolean {
        void lite_graph;
        void lite_path;
        for (const lite_m14_item of [...(lite_graph)]) {
            void lite_m14_item;
            if ((((((lite_m14_item).kind) === ("ModuleProcessed"))) && ((((lite_m14_item).name) === (lite_path))))) {
                return true;
            }
        }
        return false;
    }
    void liteFn_m14_moduleProcessed;
    function liteFn_m14_moduleIdForPath(lite_graph: { kind: string; name: string; runtime: string; code: string; intValue: bigint; textValue: string }[], lite_path: string): bigint {
        void lite_graph;
        void lite_path;
        for (const lite_m14_item of [...(lite_graph)]) {
            void lite_m14_item;
            if ((((((lite_m14_item).kind) === ("ModuleVisited"))) && ((((lite_m14_item).name) === (lite_path))))) {
                return (lite_m14_item).intValue;
            }
        }
        return (-1n);
    }
    void liteFn_m14_moduleIdForPath;
    function liteFn_m14_nextModuleId(lite_graph: { kind: string; name: string; runtime: string; code: string; intValue: bigint; textValue: string }[]): bigint {
        void lite_graph;
        let lite_m14_count = 0n;
        void lite_m14_count;
        for (const lite_m14_item of [...(lite_graph)]) {
            void lite_m14_item;
            if ((((lite_m14_item).kind) === ("ModuleVisited"))) {
                lite_m14_count = lite$addInt(lite_m14_count, 1n, 1241);
            }
        }
        return lite_m14_count;
    }
    void liteFn_m14_nextModuleId;
    function liteFn_m14_modulePublicDeclarations(lite_graph: { kind: string; name: string; runtime: string; code: string; intValue: bigint; textValue: string }[], lite_path: string): { kind: string; name: string; runtime: string; code: string; intValue: bigint; textValue: string }[] {
        void lite_graph;
        void lite_path;
        const lite_m14_result: { kind: string; name: string; runtime: string; code: string; intValue: bigint; textValue: string }[] = [...([])];
        void lite_m14_result;
        let lite_m14_inside = false;
        void lite_m14_inside;
        for (const lite_m14_item of [...(lite_graph)]) {
            void lite_m14_item;
            if ((((lite_m14_item).kind) === ("ModuleStart"))) {
                lite_m14_inside = (((lite_m14_item).name) === (lite_path));
            } else if ((((((lite_m14_item).kind) === ("ModuleEnd"))) && (lite_m14_inside))) {
                break;
            } else if (((lite_m14_inside) && (((((((((lite_m14_item).kind) === ("PublicFunction"))) || ((((lite_m14_item).kind) === ("PublicValue"))))) || ((((lite_m14_item).kind) === ("PublicType")))))))) {
                lite_m14_result.push(lite_m14_item);
            }
        }
        return [...(lite_m14_result)];
    }
    void liteFn_m14_modulePublicDeclarations;
    function liteFn_m14_appendModuleExports(lite_existing: { kind: string; name: string; runtime: string; code: string; intValue: bigint; textValue: string }[], lite_incoming: { kind: string; name: string; runtime: string; code: string; intValue: bigint; textValue: string }[], lite_prefix: string): { kind: string; name: string; runtime: string; code: string; intValue: bigint; textValue: string }[] {
        void lite_existing;
        void lite_incoming;
        void lite_prefix;
        let lite_m14_result: { kind: string; name: string; runtime: string; code: string; intValue: bigint; textValue: string }[] = [...(lite_existing)];
        void lite_m14_result;
        for (const lite_m14_item of [...(lite_incoming)]) {
            void lite_m14_item;
            let lite_m14_duplicate = false;
            void lite_m14_duplicate;
            for (const lite_m14_previous of [...(lite_m14_result)]) {
                void lite_m14_previous;
                if ((((lite_m14_item).kind) === ("ModuleAlias"))) {
                    if (((((((((lite_m14_previous).kind) === ("ModuleAlias"))) && ((((lite_m14_previous).name) === ((lite_m14_item).name)))))) || ((((((((((lite_m14_previous).kind) === ("PublicFunction"))) || ((((lite_m14_previous).kind) === ("PublicValue")))))) && ((((lite_m14_previous).name) === ((lite_m14_item).name)))))))) {
                        lite_m14_duplicate = true;
                    }
                } else if ((((((lite_m14_item).kind) === ("PublicFunction"))) || ((((lite_m14_item).kind) === ("PublicValue"))))) {
                    if ((((((((((((lite_m14_previous).kind) === ("PublicFunction"))) || ((((lite_m14_previous).kind) === ("PublicValue")))))) && ((((lite_m14_previous).name) === ((lite_m14_item).name)))))) || (((((((lite_m14_previous).kind) === ("ModuleAlias"))) && ((((lite_m14_previous).name) === ((lite_m14_item).name)))))))) {
                        lite_m14_duplicate = true;
                    }
                } else if ((((((((lite_m14_item).kind) === ("PublicType"))) && ((((lite_m14_previous).kind) === ("PublicType"))))) && ((((lite_m14_previous).name) === ((lite_m14_item).name))))) {
                    lite_m14_duplicate = true;
                }
            }
            if (lite_m14_duplicate) {
                if ((((lite_m14_item).kind) === ("ModuleAlias"))) {
                    liteFn_m9_fail(lite_prefix, (("duplicate module alias ") + ((lite_m14_item).name)));
                }
                if ((((lite_m14_item).kind) === ("PublicType"))) {
                    liteFn_m9_fail(lite_prefix, (("duplicate imported public type ") + ((lite_m14_item).name)));
                }
                liteFn_m9_fail(lite_prefix, (("duplicate imported public name ") + ((lite_m14_item).name)));
            }
            lite_m14_result.push(lite_m14_item);
        }
        return [...(lite_m14_result)];
    }
    void liteFn_m14_appendModuleExports;
    function liteFn_m14_moduleAliasExports(lite_graph: { kind: string; name: string; runtime: string; code: string; intValue: bigint; textValue: string }[], lite_path: string, lite_alias: string): { kind: string; name: string; runtime: string; code: string; intValue: bigint; textValue: string }[] {
        void lite_graph;
        void lite_path;
        void lite_alias;
        const lite_m14_result: { kind: string; name: string; runtime: string; code: string; intValue: bigint; textValue: string }[] = [...([{ kind: "ModuleAlias", name: lite_alias, runtime: "", code: "", intValue: liteFn_m14_moduleIdForPath([...(lite_graph)], lite_path), textValue: lite_path }])];
        void lite_m14_result;
        for (const lite_m14_item of [...(liteFn_m14_modulePublicDeclarations([...(lite_graph)], lite_path))]) {
            void lite_m14_item;
            lite_m14_result.push({ kind: (lite_m14_item).kind, name: ((((lite_alias) + ("."))) + ((lite_m14_item).name)), runtime: (lite_m14_item).runtime, code: (lite_m14_item).code, intValue: (lite_m14_item).intValue, textValue: (lite_m14_item).textValue });
        }
        return [...(lite_m14_result)];
    }
    void liteFn_m14_moduleAliasExports;
    function liteFn_m14_visitSourceModule(lite_target: string, lite_path: string, lite_display: string, lite_identity: string, lite_source: string, lite_initialGraph: { kind: string; name: string; runtime: string; code: string; intValue: bigint; textValue: string }[]): { kind: string; name: string; runtime: string; code: string; intValue: bigint; textValue: string }[] {
        void lite_target;
        void lite_path;
        void lite_display;
        void lite_identity;
        void lite_source;
        void lite_initialGraph;
        if (liteFn_m14_moduleVisited([...(lite_initialGraph)], lite_path)) {
            return [...(lite_initialGraph)];
        }
        const lite_m14_moduleId = liteFn_m14_nextModuleId([...(lite_initialGraph)]);
        void lite_m14_moduleId;
        let lite_m14_graph: { kind: string; name: string; runtime: string; code: string; intValue: bigint; textValue: string }[] = [...(lite_initialGraph)];
        void lite_m14_graph;
        lite_m14_graph.push({ kind: "ModuleVisited", name: lite_path, runtime: "", code: "", intValue: lite_m14_moduleId, textValue: "" });
        let lite_m14_importedExports: { kind: string; name: string; runtime: string; code: string; intValue: bigint; textValue: string }[] = [...([])];
        void lite_m14_importedExports;
        for (const lite_m14_clause of [...(liteFn_m2_collectImportClauses(lite_target, lite_source, lite_path))]) {
            void lite_m14_clause;
            const lite_m14_loaded = lite$readSource(lite_path, (lite_m14_clause).textValue);
            void lite_m14_loaded;
            if ((((((lite_m14_loaded).identity) === ("lite.compiler.source-reader.v1"))) && (((lite_identity) !== ("lite.compiler.modules.v1"))))) {
                liteFn_m9_fail(lite_display, "the compiler source reader is private to module traversal");
            }
            if ((!(liteFn_m14_moduleVisited([...(lite_m14_graph)], (lite_m14_loaded).path)))) {
                lite_m14_graph = [...(liteFn_m14_visitSourceModule(lite_target, (lite_m14_loaded).path, (lite_m14_loaded).display, (lite_m14_loaded).identity, (lite_m14_loaded).text, [...(lite_m14_graph)]))];
            }
            if (liteFn_m14_moduleProcessed([...(lite_m14_graph)], (lite_m14_loaded).path)) {
                lite_m14_importedExports = [...(liteFn_m14_appendModuleExports([...(lite_m14_importedExports)], [...(liteFn_m14_moduleAliasExports([...(lite_m14_graph)], (lite_m14_loaded).path, (lite_m14_clause).name))], lite_path))];
            }
        }
        const lite_m14_localItems: { kind: string; name: string; runtime: string; code: string; intValue: bigint; textValue: string }[] = [...(liteFn_m2_parseProgramWithIdentity(lite_target, lite_source, lite_display, [...(lite_m14_importedExports)], lite_m14_moduleId, lite_identity))];
        void lite_m14_localItems;
        lite_m14_graph.push({ kind: "ModuleStart", name: lite_path, runtime: "", code: "", intValue: lite_m14_moduleId, textValue: lite_display });
        for (const lite_m14_item of [...(lite_m14_localItems)]) {
            void lite_m14_item;
            lite_m14_graph.push(lite_m14_item);
        }
        lite_m14_graph.push({ kind: "ModuleEnd", name: lite_path, runtime: "", code: "", intValue: lite_m14_moduleId, textValue: "" });
        lite_m14_graph.push({ kind: "ModuleProcessed", name: lite_path, runtime: "", code: "", intValue: 0n, textValue: "" });
        return [...(lite_m14_graph)];
    }
    void liteFn_m14_visitSourceModule;
    function liteFn_m14_moduleItems(lite_graph: { kind: string; name: string; runtime: string; code: string; intValue: bigint; textValue: string }[]): { kind: string; name: string; runtime: string; code: string; intValue: bigint; textValue: string }[] {
        void lite_graph;
        const lite_m14_result: { kind: string; name: string; runtime: string; code: string; intValue: bigint; textValue: string }[] = [...([])];
        void lite_m14_result;
        for (const lite_m14_item of [...(lite_graph)]) {
            void lite_m14_item;
            if ((((((((((lite_m14_item).kind) !== ("ModuleVisited"))) && ((((lite_m14_item).kind) !== ("ModuleProcessed"))))) && ((((lite_m14_item).kind) !== ("ModuleStart"))))) && ((((lite_m14_item).kind) !== ("ModuleEnd"))))) {
                lite_m14_result.push(lite_m14_item);
            }
        }
        return [...(lite_m14_result)];
    }
    void liteFn_m14_moduleItems;
    function liteFn_m16_dedent(lite_indent: string): string {
        void lite_indent;
        return liteFn_m6_slice(lite_indent, 0n, lite$subtractInt(liteFn_m6_length(lite_indent), 4n, 318));
    }
    void liteFn_m16_dedent;
    function liteFn_m16_tsTupleType(lite_kind: string): string {
        void lite_kind;
        const lite_m16_size = liteFn_m6_length(lite_kind);
        void lite_m16_size;
        let lite_m16_cursor = 1n;
        void lite_m16_cursor;
        let lite_m16_result = "{ ";
        void lite_m16_result;
        let lite_m16_count = 0n;
        void lite_m16_count;
        while (((((lite_m16_cursor) < (lite_m16_size))) && (((liteFn_m6_at(lite_kind, lite_m16_cursor)) !== (")"))))) {
            const lite_m16_nameStart = lite_m16_cursor;
            void lite_m16_nameStart;
            lite_m16_cursor = liteFn_m6_skipName(lite_kind, lite_m16_cursor);
            const lite_m16_label = liteFn_m6_slice(lite_kind, lite_m16_nameStart, lite_m16_cursor);
            void lite_m16_label;
            if (((((lite_m16_cursor) < (lite_m16_size))) && (((liteFn_m6_at(lite_kind, lite_m16_cursor)) === (":"))))) {
                lite_m16_cursor = lite$addInt(lite_m16_cursor, 1n, 823);
            }
            const lite_m16_typeStart = lite_m16_cursor;
            void lite_m16_typeStart;
            lite_m16_cursor = liteFn_m6_skipName(lite_kind, lite_m16_cursor);
            const lite_m16_fieldKind = liteFn_m6_slice(lite_kind, lite_m16_typeStart, lite_m16_cursor);
            void lite_m16_fieldKind;
            if (((lite_m16_count) > (0n))) {
                lite_m16_result = ((lite_m16_result) + (" "));
            }
            lite_m16_result = ((((((lite_m16_result) + (lite_m16_label))) + (": "))) + (liteFn_m12_tsScalarType(lite_m16_fieldKind)));
            lite_m16_count = lite$addInt(lite_m16_count, 1n, 1115);
            if (((((lite_m16_cursor) < (lite_m16_size))) && (((liteFn_m6_at(lite_kind, lite_m16_cursor)) === (","))))) {
                lite_m16_result = ((lite_m16_result) + (";"));
                lite_m16_cursor = lite$addInt(lite_m16_cursor, 1n, 1246);
            }
        }
        return ((lite_m16_result) + (" }"));
    }
    void liteFn_m16_tsTupleType;
    function liteFn_m16_tsFunctionType(lite_kind: string): string {
        void lite_kind;
        return (Boolean(liteFn_m2_isListKind(lite_kind)) ? ((liteFn_m16_tsFunctionType(liteFn_m2_listElementKind(lite_kind))) + ("[]")) : (Boolean(liteFn_m2_isTupleKind(lite_kind)) ? liteFn_m16_tsTupleType(lite_kind) : liteFn_m12_tsScalarType(lite_kind)));
    }
    void liteFn_m16_tsFunctionType;
    function liteFn_m16_tsParameterList(lite_encoded: string): string {
        void lite_encoded;
        if (((lite_encoded) === (""))) {
            return "";
        }
        let lite_m16_result = "";
        void lite_m16_result;
        let lite_m16_start = 0n;
        void lite_m16_start;
        while (Boolean(true)) {
            const lite_m16_separator = liteFn_m6_indexOfText(lite_encoded, "|", lite_m16_start);
            void lite_m16_separator;
            let lite_m16_end = liteFn_m6_length(lite_encoded);
            void lite_m16_end;
            if (((lite_m16_separator) >= (0n))) {
                lite_m16_end = lite_m16_separator;
            }
            const lite_m16_entry = liteFn_m6_slice(lite_encoded, lite_m16_start, lite_m16_end);
            void lite_m16_entry;
            const lite_m16_equals = liteFn_m6_indexOfText(lite_m16_entry, "=", 0n);
            void lite_m16_equals;
            const lite_m16_parameterName = liteFn_m6_slice(lite_m16_entry, 0n, lite_m16_equals);
            void lite_m16_parameterName;
            const lite_m16_parameterKind = liteFn_m6_slice(lite_m16_entry, lite$addInt(lite_m16_equals, 1n, 2227), liteFn_m6_length(lite_m16_entry));
            void lite_m16_parameterKind;
            if (((liteFn_m6_length(lite_m16_result)) > (0n))) {
                lite_m16_result = ((lite_m16_result) + (", "));
            }
            lite_m16_result = ((((((((lite_m16_result) + ("lite_"))) + (lite_m16_parameterName))) + (": "))) + (liteFn_m16_tsFunctionType(lite_m16_parameterKind)));
            if (((lite_m16_separator) < (0n))) {
                break;
            }
            lite_m16_start = lite$addInt(lite_m16_separator, 1n, 2474);
        }
        return lite_m16_result;
    }
    void liteFn_m16_tsParameterList;
    function liteFn_m16_reportParameterReads(lite_encoded: string, lite_indent: string): void {
        void lite_encoded;
        void lite_indent;
        if (((lite_encoded) === (""))) {
            return;
        }
        let lite_m16_start = 0n;
        void lite_m16_start;
        while (Boolean(true)) {
            const lite_m16_separator = liteFn_m6_indexOfText(lite_encoded, "|", lite_m16_start);
            void lite_m16_separator;
            let lite_m16_end = liteFn_m6_length(lite_encoded);
            void lite_m16_end;
            if (((lite_m16_separator) >= (0n))) {
                lite_m16_end = lite_m16_separator;
            }
            const lite_m16_entry = liteFn_m6_slice(lite_encoded, lite_m16_start, lite_m16_end);
            void lite_m16_entry;
            const lite_m16_equals = liteFn_m6_indexOfText(lite_m16_entry, "=", 0n);
            void lite_m16_equals;
            const lite$report0 = ((((((lite_indent) + ("void lite_"))) + (liteFn_m6_slice(lite_m16_entry, 0n, lite_m16_equals)))) + (";"));
            lite$emit(lite$report0 + "\n");
            if (((lite_m16_separator) < (0n))) {
                break;
            }
            lite_m16_start = lite$addInt(lite_m16_separator, 1n, 3157);
        }
    }
    void liteFn_m16_reportParameterReads;
    function liteFn_m16_displayValueCode(lite_kind: string, lite_code: string): string {
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
            const lite_m16_element = liteFn_m2_listElementKind(lite_kind);
            void lite_m16_element;
            return (((((((((((("(\"[\" + (") + (lite_code))) + (").map((value: "))) + (liteFn_m16_tsFunctionType(lite_m16_element)))) + (") => "))) + (liteFn_m16_displayValueCode(lite_m16_element, "value")))) + (").join(\", \") + \"]\")"));
        }
        if (liteFn_m2_isTupleKind(lite_kind)) {
            let lite_m16_result = liteFn_m12_textLiteralCode("(");
            void lite_m16_result;
            let lite_m16_cursor = 1n;
            void lite_m16_cursor;
            let lite_m16_count = 0n;
            void lite_m16_count;
            while (((((lite_m16_cursor) < (liteFn_m6_length(lite_kind)))) && (((liteFn_m6_at(lite_kind, lite_m16_cursor)) !== (")"))))) {
                const lite_m16_start = lite_m16_cursor;
                void lite_m16_start;
                lite_m16_cursor = liteFn_m6_skipName(lite_kind, lite_m16_cursor);
                const lite_m16_label = liteFn_m6_slice(lite_kind, lite_m16_start, lite_m16_cursor);
                void lite_m16_label;
                lite_m16_cursor = lite$addInt(lite_m16_cursor, 1n, 4238);
                const lite_m16_typeStart = lite_m16_cursor;
                void lite_m16_typeStart;
                lite_m16_cursor = liteFn_m6_skipName(lite_kind, lite_m16_cursor);
                const lite_m16_component = liteFn_m6_slice(lite_kind, lite_m16_typeStart, lite_m16_cursor);
                void lite_m16_component;
                const lite_m16_separator = (Boolean(((lite_m16_count) === (0n))) ? "" : ", ");
                void lite_m16_separator;
                lite_m16_result = ((((((((lite_m16_result) + (" + "))) + (liteFn_m12_textLiteralCode(((((lite_m16_separator) + (lite_m16_label))) + ("=")))))) + (" + "))) + (liteFn_m16_displayValueCode(lite_m16_component, (("value.") + (lite_m16_label)))));
                lite_m16_count = lite$addInt(lite_m16_count, 1n, 4615);
                if (((((lite_m16_cursor) < (liteFn_m6_length(lite_kind)))) && (((liteFn_m6_at(lite_kind, lite_m16_cursor)) === (","))))) {
                    lite_m16_cursor = lite$addInt(lite_m16_cursor, 1n, 4719);
                }
            }
            const lite_m16_ending = (Boolean(((lite_m16_count) === (1n))) ? ",)" : ")");
            void lite_m16_ending;
            return (((((((((((((((("((value: ") + (liteFn_m16_tsFunctionType(lite_kind)))) + ("): string => "))) + (lite_m16_result))) + (" + "))) + (liteFn_m12_textLiteralCode(lite_m16_ending)))) + (")("))) + (lite_code))) + (")"));
        }
        return lite_code;
    }
    void liteFn_m16_displayValueCode;
    function liteFn_m16_reportArgumentCode(lite_item: { kind: string; name: string; runtime: string; code: string; intValue: bigint; textValue: string }): string {
        void lite_item;
        return liteFn_m16_displayValueCode((lite_item).kind, (lite_item).code);
    }
    void liteFn_m16_reportArgumentCode;
    function liteFn_m16_usesBuiltin(lite_calls: string, lite_name: string): boolean {
        void lite_calls;
        void lite_name;
        if (((lite_calls) === ("|"))) {
            return false;
        }
        return ((liteFn_m6_indexOfText(lite_calls, (((("|lite$") + (lite_name))) + ("(|")), 0n)) >= (0n));
    }
    void liteFn_m16_usesBuiltin;
    function liteFn_m16_usesListIndex(lite_calls: string): boolean {
        void lite_calls;
        return liteFn_m16_usesBuiltin(lite_calls, "listAt");
    }
    void liteFn_m16_usesListIndex;
    function liteFn_m16_usesListPop(lite_calls: string): boolean {
        void lite_calls;
        return liteFn_m16_usesBuiltin(lite_calls, "listPopBack");
    }
    void liteFn_m16_usesListPop;
    function liteFn_m16_usesIntArithmetic(lite_calls: string): boolean {
        void lite_calls;
        return ((((((liteFn_m16_usesBuiltin(lite_calls, "addInt")) || (liteFn_m16_usesBuiltin(lite_calls, "subtractInt")))) || (liteFn_m16_usesBuiltin(lite_calls, "multiplyInt")))) || (liteFn_m16_usesBuiltin(lite_calls, "negateInt")));
    }
    void liteFn_m16_usesIntArithmetic;
    function liteFn_m16_usesIntDivision(lite_calls: string): boolean {
        void lite_calls;
        return ((((((liteFn_m16_usesBuiltin(lite_calls, "divideInt")) || (liteFn_m16_usesBuiltin(lite_calls, "remainderInt")))) || (liteFn_m16_usesBuiltin(lite_calls, "floorDivideInt")))) || (liteFn_m16_usesBuiltin(lite_calls, "floorModuloInt")));
    }
    void liteFn_m16_usesIntDivision;
    function liteFn_m16_usesFloatArithmetic(lite_calls: string): boolean {
        void lite_calls;
        return ((liteFn_m16_usesBuiltin(lite_calls, "floatOp")) || (liteFn_m16_usesBuiltin(lite_calls, "floatPower")));
    }
    void liteFn_m16_usesFloatArithmetic;
    function liteFn_m16_emitFloatArithmeticHelpers(lite_calls: string): void {
        void lite_calls;
        if ((!(liteFn_m16_usesFloatArithmetic(lite_calls)))) {
            return;
        }
        if (liteFn_m16_usesBuiltin(lite_calls, "floatPower")) {
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
        if ((!(liteFn_m16_usesBuiltin(lite_calls, "floatOp")))) {
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
    void liteFn_m16_emitFloatArithmeticHelpers;
    function liteFn_m16_usesBounds(lite_calls: string): boolean {
        void lite_calls;
        return ((((((liteFn_m16_usesBuiltin(lite_calls, "textAt")) || (liteFn_m16_usesBuiltin(lite_calls, "textSlice")))) || (liteFn_m16_usesListIndex(lite_calls)))) || (liteFn_m16_usesListPop(lite_calls)));
    }
    void liteFn_m16_usesBounds;
    function liteFn_m16_emitIntArithmeticHelpers(lite_calls: string, lite_source: string, lite_prefix: string): void {
        void lite_calls;
        void lite_source;
        void lite_prefix;
        const lite_m16_integers = ((liteFn_m16_usesIntArithmetic(lite_calls)) || (liteFn_m16_usesIntDivision(lite_calls)));
        void lite_m16_integers;
        if ((((((!(lite_m16_integers))) && ((!(liteFn_m16_usesBounds(lite_calls)))))) && ((!(liteFn_m16_usesFloatArithmetic(lite_calls)))))) {
            return;
        }
        const lite_m16_namePrefix = (Boolean(((lite_prefix) === (""))) ? "" : ((lite_prefix) + (":")));
        void lite_m16_namePrefix;
        const lite_m16_needsRange = ((((liteFn_m16_usesIntArithmetic(lite_calls)) || (liteFn_m16_usesBuiltin(lite_calls, "divideInt")))) || (liteFn_m16_usesBuiltin(lite_calls, "floorDivideInt")));
        void lite_m16_needsRange;
        const lite$report13 = (((("const lite$intLines: readonly number[] = [") + (liteFn_m2_lineStartCodes(lite_source)))) + ("];"));
        lite$emit(lite$report13 + "\n");
        const lite$report14 = (((("const lite$intSource = ") + (liteFn_m12_textLiteralCode(lite_m16_namePrefix)))) + (";"));
        lite$emit(lite$report14 + "\n");
        if (lite_m16_needsRange) {
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
        if (lite_m16_integers) {
            const lite$report23 = "function lite$intFault(at: number, message: string): never { return lite$fault(\"ArithmeticPanic\", at, message); }";
            lite$emit(lite$report23 + "\n");
        }
        if (lite_m16_needsRange) {
            const lite$report24 = "function lite$checkedInt(value: bigint, at: number): bigint {";
            lite$emit(lite$report24 + "\n");
            const lite$report25 = "    if (value < lite$intMin || value > lite$intMax) lite$intFault(at, \"integer outside Int range\");";
            lite$emit(lite$report25 + "\n");
            const lite$report26 = "    return value;";
            lite$emit(lite$report26 + "\n");
            const lite$report27 = "}";
            lite$emit(lite$report27 + "\n");
        }
        if (liteFn_m16_usesBuiltin(lite_calls, "addInt")) {
            const lite$report28 = "function lite$addInt(left: bigint, right: bigint, at: number): bigint { return lite$checkedInt(left + right, at); }";
            lite$emit(lite$report28 + "\n");
        }
        if (liteFn_m16_usesBuiltin(lite_calls, "subtractInt")) {
            const lite$report29 = "function lite$subtractInt(left: bigint, right: bigint, at: number): bigint { return lite$checkedInt(left - right, at); }";
            lite$emit(lite$report29 + "\n");
        }
        if (liteFn_m16_usesBuiltin(lite_calls, "multiplyInt")) {
            const lite$report30 = "function lite$multiplyInt(left: bigint, right: bigint, at: number): bigint { return lite$checkedInt(left * right, at); }";
            lite$emit(lite$report30 + "\n");
        }
        if (liteFn_m16_usesBuiltin(lite_calls, "negateInt")) {
            const lite$report31 = "function lite$negateInt(value: bigint, at: number): bigint { return lite$checkedInt(-value, at); }";
            lite$emit(lite$report31 + "\n");
        }
        const lite$report32 = "";
        lite$emit(lite$report32 + "\n");
    }
    void liteFn_m16_emitIntArithmeticHelpers;
    function liteFn_m16_emitInputHelpers(lite_calls: string): void {
        void lite_calls;
        if ((!((((((((liteFn_m16_usesBuiltin(lite_calls, "inputAll")) || (liteFn_m16_usesBuiltin(lite_calls, "inputLine")))) || (liteFn_m16_usesBuiltin(lite_calls, "inputInt")))) || (liteFn_m16_usesBuiltin(lite_calls, "inputFloat"))))))) {
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
        if (((liteFn_m16_usesBuiltin(lite_calls, "inputInt")) || (liteFn_m16_usesBuiltin(lite_calls, "inputFloat")))) {
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
        if (liteFn_m16_usesBuiltin(lite_calls, "inputAll")) {
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
        if (liteFn_m16_usesBuiltin(lite_calls, "inputLine")) {
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
        if (liteFn_m16_usesBuiltin(lite_calls, "inputInt")) {
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
        if (liteFn_m16_usesBuiltin(lite_calls, "inputFloat")) {
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
    void liteFn_m16_emitInputHelpers;
    function liteFn_m16_emitBuiltinHelpers(lite_calls: string): void {
        void lite_calls;
        if (((((((((((((((((((((liteFn_m16_usesBuiltin(lite_calls, "inputArgs")) || (liteFn_m16_usesBuiltin(lite_calls, "inputAll")))) || (liteFn_m16_usesBuiltin(lite_calls, "inputLine")))) || (liteFn_m16_usesBuiltin(lite_calls, "inputInt")))) || (liteFn_m16_usesBuiltin(lite_calls, "inputFloat")))) || (liteFn_m16_usesBuiltin(lite_calls, "reportError")))) || (liteFn_m16_usesBuiltin(lite_calls, "exit")))) || (liteFn_m16_usesIntArithmetic(lite_calls)))) || (liteFn_m16_usesIntDivision(lite_calls)))) || (liteFn_m16_usesBounds(lite_calls)))) || (liteFn_m16_usesFloatArithmetic(lite_calls)))) {
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
        if (liteFn_m16_usesBuiltin(lite_calls, "readSource")) {
            const lite$report120 = "let lite$sourceProvider: ((importer: string, spec: string) => { path: string; display: string; identity: string; text: string }) | undefined;";
            lite$emit(lite$report120 + "\n");
            const lite$report121 = "function lite$readSource(importer: string, spec: string): { path: string; display: string; identity: string; text: string } {";
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
        if (liteFn_m16_usesBuiltin(lite_calls, "inputArgs")) {
            const lite$report126 = "function lite$inputArgs(): string[] {";
            lite$emit(lite$report126 + "\n");
            const lite$report127 = "    return process.argv.slice(2);";
            lite$emit(lite$report127 + "\n");
            const lite$report128 = "}";
            lite$emit(lite$report128 + "\n");
            const lite$report129 = "";
            lite$emit(lite$report129 + "\n");
        }
        liteFn_m16_emitInputHelpers(lite_calls);
        if (liteFn_m16_usesBuiltin(lite_calls, "reportError")) {
            const lite$report130 = "function lite$reportError(text: string): void {";
            lite$emit(lite$report130 + "\n");
            const lite$report131 = "    process.getBuiltinModule(\"node:fs\").writeSync(2, text + \"\\n\");";
            lite$emit(lite$report131 + "\n");
            const lite$report132 = "}";
            lite$emit(lite$report132 + "\n");
            const lite$report133 = "";
            lite$emit(lite$report133 + "\n");
        }
        if (liteFn_m16_usesBuiltin(lite_calls, "exit")) {
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
        if (((((liteFn_m16_usesBuiltin(lite_calls, "textLength")) || (liteFn_m16_usesBuiltin(lite_calls, "textAt")))) || (liteFn_m16_usesBuiltin(lite_calls, "textSlice")))) {
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
        if (liteFn_m16_usesBuiltin(lite_calls, "textLength")) {
            const lite$report156 = "function lite$textLength(text: string): bigint {";
            lite$emit(lite$report156 + "\n");
            const lite$report157 = "    return BigInt(lite$textPoints(text).length);";
            lite$emit(lite$report157 + "\n");
            const lite$report158 = "}";
            lite$emit(lite$report158 + "\n");
            const lite$report159 = "";
            lite$emit(lite$report159 + "\n");
        }
        if (liteFn_m16_usesBuiltin(lite_calls, "textAt")) {
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
        if (liteFn_m16_usesBuiltin(lite_calls, "textSlice")) {
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
    void liteFn_m16_emitBuiltinHelpers;
    function liteFn_m16_emitListIndexHelper(): void {
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
    void liteFn_m16_emitListIndexHelper;
    function liteFn_m16_emitListPopHelper(): void {
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
    void liteFn_m16_emitListPopHelper;
    function liteFn_m16_emitIntDivideHelper(): void {
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
    void liteFn_m16_emitIntDivideHelper;
    function liteFn_m16_emitIntRemainderHelper(): void {
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
    void liteFn_m16_emitIntRemainderHelper;
    function liteFn_m16_emitIntFloorDivideHelper(): void {
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
    void liteFn_m16_emitIntFloorDivideHelper;
    function liteFn_m16_emitIntFloorModuloHelper(): void {
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
    void liteFn_m16_emitIntFloorModuloHelper;
    function liteFn_m16_emitIntDivisionHelpers(lite_calls: string): void {
        void lite_calls;
        if ((((liteFn_m16_usesBuiltin(lite_calls, "divideInt")) || (liteFn_m16_usesBuiltin(lite_calls, "floorDivideInt"))))) {
            liteFn_m16_emitIntDivideHelper();
        }
        if (liteFn_m16_usesBuiltin(lite_calls, "remainderInt")) {
            liteFn_m16_emitIntRemainderHelper();
        }
        if (liteFn_m16_usesBuiltin(lite_calls, "floorDivideInt")) {
            liteFn_m16_emitIntFloorDivideHelper();
        }
        if (liteFn_m16_usesBuiltin(lite_calls, "floorModuloInt")) {
            liteFn_m16_emitIntFloorModuloHelper();
        }
        return;
    }
    void liteFn_m16_emitIntDivisionHelpers;
    function liteFn_m16_emitProgram(lite_items: { kind: string; name: string; runtime: string; code: string; intValue: bigint; textValue: string }[], lite_source: string, lite_prefix: string): void {
        void lite_items;
        void lite_source;
        void lite_prefix;
        const lite_m16_calls = liteFn_m2_targetHelperCalls([...(lite_items)]);
        void lite_m16_calls;
        const lite_m16_hasExit = ((((((((liteFn_m16_usesBuiltin(lite_m16_calls, "exit")) || (liteFn_m16_usesBuiltin(lite_m16_calls, "inputAll")))) || (liteFn_m16_usesBuiltin(lite_m16_calls, "inputLine")))) || (liteFn_m16_usesBuiltin(lite_m16_calls, "inputInt")))) || (liteFn_m16_usesBuiltin(lite_m16_calls, "inputFloat")));
        void lite_m16_hasExit;
        if (lite_m16_hasExit) {
            const lite$report221 = "let lite_out = \"\";";
            lite$emit(lite$report221 + "\n");
            const lite$report222 = "";
            lite$emit(lite$report222 + "\n");
        }
        liteFn_m16_emitBuiltinHelpers(lite_m16_calls);
        if (liteFn_m16_usesListIndex(lite_m16_calls)) {
            liteFn_m16_emitListIndexHelper();
        }
        if (liteFn_m16_usesListPop(lite_m16_calls)) {
            liteFn_m16_emitListPopHelper();
        }
        liteFn_m16_emitIntArithmeticHelpers(lite_m16_calls, lite_source, lite_prefix);
        liteFn_m16_emitFloatArithmeticHelpers(lite_m16_calls);
        liteFn_m16_emitIntDivisionHelpers(lite_m16_calls);
        if (liteFn_m16_usesBuiltin(lite_m16_calls, "readSource")) {
            const lite$report223 = "export function main(lite$write?: (text: string) => void, lite$sourceProviderInput?: (importer: string, spec: string) => { path: string; display: string; identity: string; text: string }): string {";
            lite$emit(lite$report223 + "\n");
            const lite$report224 = "    lite$sourceProvider = lite$sourceProviderInput;";
            lite$emit(lite$report224 + "\n");
        } else {
            const lite$report225 = "export function main(lite$write?: (text: string) => void): string {";
            lite$emit(lite$report225 + "\n");
        }
        if ((!(lite_m16_hasExit))) {
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
        let lite_m16_indent = "    ";
        void lite_m16_indent;
        let lite_m16_line = "";
        void lite_m16_line;
        let lite_m16_count = 0n;
        void lite_m16_count;
        let lite_m16_reportIndex = 0n;
        void lite_m16_reportIndex;
        for (const lite_m16_item of [...(lite_items)]) {
            void lite_m16_item;
            if ((((lite_m16_item).kind) === ("FunctionStart"))) {
                const lite$report232 = ((((((((((((((lite_m16_indent) + ("function "))) + ((lite_m16_item).runtime))) + ("("))) + (liteFn_m16_tsParameterList((lite_m16_item).textValue)))) + ("): "))) + (liteFn_m16_tsFunctionType((lite_m16_item).code)))) + (" {"));
                lite$emit(lite$report232 + "\n");
                lite_m16_indent = ((lite_m16_indent) + ("    "));
                liteFn_m16_reportParameterReads((lite_m16_item).textValue, lite_m16_indent);
            } else if ((((lite_m16_item).kind) === ("FunctionEnd"))) {
                lite_m16_indent = liteFn_m16_dedent(lite_m16_indent);
                const lite$report233 = ((lite_m16_indent) + ("}"));
                lite$emit(lite$report233 + "\n");
                const lite$report234 = ((((((lite_m16_indent) + ("void "))) + ((lite_m16_item).runtime))) + (";"));
                lite$emit(lite$report234 + "\n");
            } else if ((((lite_m16_item).kind) === ("Return"))) {
                if ((((lite_m16_item).code) === (""))) {
                    const lite$report235 = ((lite_m16_indent) + ("return;"));
                    lite$emit(lite$report235 + "\n");
                } else {
                    const lite$report236 = ((((((lite_m16_indent) + ("return "))) + ((lite_m16_item).code))) + (";"));
                    lite$emit(lite$report236 + "\n");
                }
            } else if ((((lite_m16_item).kind) === ("Unreachable"))) {
                const lite$report237 = ((lite_m16_indent) + ("throw new Error(\"unreachable loop completion\");"));
                lite$emit(lite$report237 + "\n");
            } else if ((((lite_m16_item).kind) === ("Break"))) {
                const lite$report238 = ((lite_m16_indent) + ("break;"));
                lite$emit(lite$report238 + "\n");
            } else if ((((lite_m16_item).kind) === ("Continue"))) {
                const lite$report239 = ((lite_m16_indent) + ("continue;"));
                lite$emit(lite$report239 + "\n");
            } else if ((((lite_m16_item).kind) === ("Call"))) {
                const lite$report240 = ((((lite_m16_indent) + ((lite_m16_item).code))) + (";"));
                lite$emit(lite$report240 + "\n");
            } else if ((((lite_m16_item).kind) === ("Discard"))) {
                const lite$report241 = ((((((lite_m16_indent) + ("void ("))) + ((lite_m16_item).code))) + (");"));
                lite$emit(lite$report241 + "\n");
            } else if ((((((((((((lite_m16_item).kind) === ("LocalInt"))) || ((((lite_m16_item).kind) === ("LocalString"))))) || ((((lite_m16_item).kind) === ("LocalBool"))))) || ((((lite_m16_item).kind) === ("LocalFloat"))))) || ((((lite_m16_item).kind) === ("LocalTuple"))))) {
                const lite$report242 = ((((((((((lite_m16_indent) + ("const "))) + ((lite_m16_item).runtime))) + (" = "))) + ((lite_m16_item).code))) + (";"));
                lite$emit(lite$report242 + "\n");
                const lite$report243 = ((((((lite_m16_indent) + ("void "))) + ((lite_m16_item).runtime))) + (";"));
                lite$emit(lite$report243 + "\n");
            } else if ((((lite_m16_item).kind) === ("LocalList"))) {
                const lite$report244 = ((((((((((((((lite_m16_indent) + ("const "))) + ((lite_m16_item).runtime))) + (": "))) + (liteFn_m16_tsFunctionType((lite_m16_item).textValue)))) + (" = "))) + ((lite_m16_item).code))) + (";"));
                lite$emit(lite$report244 + "\n");
                const lite$report245 = ((((((lite_m16_indent) + ("void "))) + ((lite_m16_item).runtime))) + (";"));
                lite$emit(lite$report245 + "\n");
            } else if ((((((((((((lite_m16_item).kind) === ("VarInt"))) || ((((lite_m16_item).kind) === ("VarString"))))) || ((((lite_m16_item).kind) === ("VarBool"))))) || ((((lite_m16_item).kind) === ("VarFloat"))))) || ((((lite_m16_item).kind) === ("VarTuple"))))) {
                const lite$report246 = ((((((((((lite_m16_indent) + ("let "))) + ((lite_m16_item).runtime))) + (" = "))) + ((lite_m16_item).code))) + (";"));
                lite$emit(lite$report246 + "\n");
                const lite$report247 = ((((((lite_m16_indent) + ("void "))) + ((lite_m16_item).runtime))) + (";"));
                lite$emit(lite$report247 + "\n");
            } else if ((((lite_m16_item).kind) === ("VarList"))) {
                const lite$report248 = ((((((((((((((lite_m16_indent) + ("let "))) + ((lite_m16_item).runtime))) + (": "))) + (liteFn_m16_tsFunctionType((lite_m16_item).textValue)))) + (" = "))) + ((lite_m16_item).code))) + (";"));
                lite$emit(lite$report248 + "\n");
                const lite$report249 = ((((((lite_m16_indent) + ("void "))) + ((lite_m16_item).runtime))) + (";"));
                lite$emit(lite$report249 + "\n");
            } else if ((((((((((((lite_m16_item).kind) === ("AssignInt"))) || ((((lite_m16_item).kind) === ("AssignString"))))) || ((((lite_m16_item).kind) === ("AssignBool"))))) || ((((lite_m16_item).kind) === ("AssignFloat"))))) || ((((lite_m16_item).kind) === ("AssignTuple"))))) {
                const lite$report250 = ((((((((lite_m16_indent) + ((lite_m16_item).runtime))) + (" = "))) + ((lite_m16_item).code))) + (";"));
                lite$emit(lite$report250 + "\n");
            } else if ((((lite_m16_item).kind) === ("AssignList"))) {
                const lite$report251 = ((((((((lite_m16_indent) + ((lite_m16_item).runtime))) + (" = "))) + ((lite_m16_item).code))) + (";"));
                lite$emit(lite$report251 + "\n");
            } else if ((((lite_m16_item).kind) === ("Scope"))) {
                const lite$report252 = ((lite_m16_indent) + ("{"));
                lite$emit(lite$report252 + "\n");
                lite_m16_indent = ((lite_m16_indent) + ("    "));
            } else if ((((lite_m16_item).kind) === ("If"))) {
                const lite_m16_condition = (Boolean((((((lite_m16_item).code) === ("true"))) || ((((lite_m16_item).code) === ("false"))))) ? (((("Boolean(") + ((lite_m16_item).code))) + (")")) : (lite_m16_item).code);
                void lite_m16_condition;
                const lite$report253 = ((((((lite_m16_indent) + ("if ("))) + (lite_m16_condition))) + (") {"));
                lite$emit(lite$report253 + "\n");
                lite_m16_indent = ((lite_m16_indent) + ("    "));
            } else if ((((lite_m16_item).kind) === ("Else"))) {
                lite_m16_indent = liteFn_m16_dedent(lite_m16_indent);
                const lite$report254 = ((lite_m16_indent) + ("} else {"));
                lite$emit(lite$report254 + "\n");
                lite_m16_indent = ((lite_m16_indent) + ("    "));
            } else if ((((lite_m16_item).kind) === ("ElseIf"))) {
                lite_m16_indent = liteFn_m16_dedent(lite_m16_indent);
                const lite_m16_condition = (Boolean((((((lite_m16_item).code) === ("true"))) || ((((lite_m16_item).code) === ("false"))))) ? (((("Boolean(") + ((lite_m16_item).code))) + (")")) : (lite_m16_item).code);
                void lite_m16_condition;
                const lite$report255 = ((((((lite_m16_indent) + ("} else if ("))) + (lite_m16_condition))) + (") {"));
                lite$emit(lite$report255 + "\n");
                lite_m16_indent = ((lite_m16_indent) + ("    "));
            } else if ((((((lite_m16_item).kind) === ("EndIf"))) || ((((lite_m16_item).kind) === ("EndScope"))))) {
                lite_m16_indent = liteFn_m16_dedent(lite_m16_indent);
                const lite$report256 = ((lite_m16_indent) + ("}"));
                lite$emit(lite$report256 + "\n");
            } else if ((((lite_m16_item).kind) === ("LoopSeq"))) {
                const lite$report257 = ((((((((((lite_m16_indent) + ("for (const "))) + ((lite_m16_item).runtime))) + (" of "))) + (liteFn_m12_listCopyCode((lite_m16_item).code)))) + (") {"));
                lite$emit(lite$report257 + "\n");
                lite_m16_indent = ((lite_m16_indent) + ("    "));
                const lite$report258 = ((((((lite_m16_indent) + ("void "))) + ((lite_m16_item).runtime))) + (";"));
                lite$emit(lite$report258 + "\n");
            } else if ((((lite_m16_item).kind) === ("Loop"))) {
                const lite_m16_condition = (Boolean((((lite_m16_item).code) === (""))) ? "Boolean(true)" : (Boolean((((lite_m16_item).code) === ("false"))) ? "Boolean(false)" : (lite_m16_item).code));
                void lite_m16_condition;
                const lite$report259 = ((((((lite_m16_indent) + ("while ("))) + (lite_m16_condition))) + (") {"));
                lite$emit(lite$report259 + "\n");
                lite_m16_indent = ((lite_m16_indent) + ("    "));
            } else if ((((lite_m16_item).kind) === ("EndLoop"))) {
                lite_m16_indent = liteFn_m16_dedent(lite_m16_indent);
                const lite$report260 = ((lite_m16_indent) + ("}"));
                lite$emit(lite$report260 + "\n");
            } else if ((((((lite_m16_item).kind) === ("End"))) || ((((lite_m16_item).kind) === ("EndOutput"))))) {
                if (((lite_m16_count) === (0n))) {
                    lite_m16_line = liteFn_m12_textLiteralCode("");
                }
                const lite_m16_temporary = (("lite$report") + (liteFn_m4_intText(lite_m16_reportIndex)));
                void lite_m16_temporary;
                const lite$report261 = ((((((((((lite_m16_indent) + ("const "))) + (lite_m16_temporary))) + (" = "))) + (lite_m16_line))) + (";"));
                lite$emit(lite$report261 + "\n");
                const lite_m16_ending = (Boolean((((lite_m16_item).kind) === ("End"))) ? " + \"\\n\"" : "");
                void lite_m16_ending;
                const lite$report262 = ((((((((lite_m16_indent) + ("lite$emit("))) + (lite_m16_temporary))) + (lite_m16_ending))) + (");"));
                lite$emit(lite$report262 + "\n");
                lite_m16_reportIndex = lite$addInt(lite_m16_reportIndex, 1n, 32438);
                lite_m16_line = "";
                lite_m16_count = 0n;
            } else if ((((((((((lite_m16_item).kind) === ("Import"))) || ((((lite_m16_item).kind) === ("PublicFunction"))))) || ((((lite_m16_item).kind) === ("PublicValue"))))) || ((((lite_m16_item).kind) === ("PublicType"))))) {
            } else {
                if (((lite_m16_count) > (0n))) {
                    lite_m16_line = ((lite_m16_line) + (" + \" \" + "));
                }
                lite_m16_line = ((lite_m16_line) + (liteFn_m16_reportArgumentCode(lite_m16_item)));
                lite_m16_count = lite$addInt(lite_m16_count, 1n, 32776);
            }
        }
        const lite$report263 = "    return lite_out;";
        lite$emit(lite$report263 + "\n");
        const lite$report264 = "}";
        lite$emit(lite$report264 + "\n");
    }
    void liteFn_m16_emitProgram;
    function liteFn_m1_run(): void {
        const lite_m1_prefix = liteFn_m2_sourcePrefix();
        void lite_m1_prefix;
        const lite_m1_source = lite$inputAll(undefined, "compiler/src/driver-ts.lts:9:15: InputFault: ");
        void lite_m1_source;
        if (((liteFn_m2_sourceModulePath()) !== (""))) {
            const lite_m1_graph: { kind: string; name: string; runtime: string; code: string; intValue: bigint; textValue: string }[] = [...(liteFn_m14_visitSourceModule("ts", liteFn_m2_sourceModulePath(), lite_m1_prefix, liteFn_m2_sourceModuleIdentity(), lite_m1_source, [...([])]))];
            void lite_m1_graph;
            return (void (liteFn_m16_emitProgram([...(liteFn_m14_moduleItems([...(lite_m1_graph)]))], lite_m1_source, lite_m1_prefix)));
        } else {
            return (void (liteFn_m16_emitProgram([...(liteFn_m2_parseProgram("ts", lite_m1_source, lite_m1_prefix))], lite_m1_source, lite_m1_prefix)));
        }
    }
    void liteFn_m1_run;
    liteFn_m1_run();
    return lite_out;
}
