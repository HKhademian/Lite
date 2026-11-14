let lite$out = "";

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
    process.getBuiltinModule("node:fs").writeSync(1, lite$out + text);
    lite$out = "";
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

function lite$exit(status: bigint): never {
    process.getBuiltinModule("node:fs").writeSync(1, lite$out);
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
    if (items.length === 0) {
        lite$fault("BoundPanic", at, "pop_back on an empty list");
    }
    return items.pop() as T;
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
        if (lite$write === undefined) lite$out += text;
        else lite$write(text);
    }
    void lite$emit;
    function liteFn$lib$core$list$listIndexOfText(lite_values: string[], lite_target: string): bigint {
        void lite_values;
        void lite_target;
        let lite_index = 0n;
        void lite_index;
        for (const lite_value of [...(lite_values)]) {
            void lite_value;
            if (((lite_value) === (lite_target))) {
                return lite_index;
            }
            lite_index = lite$addInt(lite_index, 1n, 901);
        }
        return (-1n);
    }
    void liteFn$lib$core$list$listIndexOfText;
    function liteFn$lib$core$list$listContainsText(lite_values: string[], lite_target: string): boolean {
        void lite_values;
        void lite_target;
        return ((liteFn$lib$core$list$listIndexOfText([...(lite_values)], lite_target)) >= (0n));
    }
    void liteFn$lib$core$list$listContainsText;
    function liteFn$lib$core$list$listIndexOfInt(lite_values: bigint[], lite_target: bigint): bigint {
        void lite_values;
        void lite_target;
        let lite_index = 0n;
        void lite_index;
        for (const lite_value of [...(lite_values)]) {
            void lite_value;
            if (((lite_value) === (lite_target))) {
                return lite_index;
            }
            lite_index = lite$addInt(lite_index, 1n, 1326);
        }
        return (-1n);
    }
    void liteFn$lib$core$list$listIndexOfInt;
    function liteFn$lib$core$list$listContainsInt(lite_values: bigint[], lite_target: bigint): boolean {
        void lite_values;
        void lite_target;
        return ((liteFn$lib$core$list$listIndexOfInt([...(lite_values)], lite_target)) >= (0n));
    }
    void liteFn$lib$core$list$listContainsInt;
    function liteFn$lib$core$list$listIndexOfBool(lite_values: boolean[], lite_target: boolean): bigint {
        void lite_values;
        void lite_target;
        let lite_index = 0n;
        void lite_index;
        for (const lite_value of [...(lite_values)]) {
            void lite_value;
            if ((Boolean(lite_value) === Boolean(lite_target))) {
                return lite_index;
            }
            lite_index = lite$addInt(lite_index, 1n, 1746);
        }
        return (-1n);
    }
    void liteFn$lib$core$list$listIndexOfBool;
    function liteFn$lib$core$list$listContainsBool(lite_values: boolean[], lite_target: boolean): boolean {
        void lite_values;
        void lite_target;
        return ((liteFn$lib$core$list$listIndexOfBool([...(lite_values)], lite_target)) >= (0n));
    }
    void liteFn$lib$core$list$listContainsBool;
    function liteFn$lib$core$diag$diagnosticExit(): bigint {
        return 2n;
    }
    void liteFn$lib$core$diag$diagnosticExit;
    const lite$m$lib$core$diag$sourceErrorCategory = "SourceError";
    void lite$m$lib$core$diag$sourceErrorCategory;
    const lite$m$lib$core$diag$typeErrorCategory = "TypeError";
    void lite$m$lib$core$diag$typeErrorCategory;
    function liteFn$lib$core$diag$fail(lite_prefix: string, lite_message: string): void {
        void lite_prefix;
        void lite_message;
        if (((lite_prefix) === (""))) {
            lite$reportError(lite_message);
        } else {
            lite$reportError(((((lite_prefix) + (":"))) + (lite_message)));
        }
        lite$exit(liteFn$lib$core$diag$diagnosticExit());
    }
    void liteFn$lib$core$diag$fail;
    function liteFn$lib$core$diag$expect(lite_prefix: string, lite_condition: boolean, lite_message: string): void {
        void lite_prefix;
        void lite_condition;
        void lite_message;
        if ((!(lite_condition))) {
            return (void (liteFn$lib$core$diag$fail(lite_prefix, lite_message)));
        } else {
        }
    }
    void liteFn$lib$core$diag$expect;
    function liteFn$lib$core$int$intMin(): bigint {
        return (-9223372036854775808n);
    }
    void liteFn$lib$core$int$intMin;
    function liteFn$lib$core$int$intMax(): bigint {
        return 9223372036854775807n;
    }
    void liteFn$lib$core$int$intMax;
    function liteFn$lib$core$int$intAdd(lite_left: bigint, lite_right: bigint): { value: bigint; ok: boolean } {
        void lite_left;
        void lite_right;
        if (((((lite_right) > (0n))) && (((lite_left) > (lite$subtractInt(liteFn$lib$core$int$intMax(), lite_right, 513)))))) {
            return { value: 0n, ok: false };
        }
        if (((((lite_right) < (0n))) && (((lite_left) < (lite$subtractInt(liteFn$lib$core$int$intMin(), lite_right, 594)))))) {
            return { value: 0n, ok: false };
        }
        return { value: lite$addInt(lite_left, lite_right, 656), ok: true };
    }
    void liteFn$lib$core$int$intAdd;
    function liteFn$lib$core$int$intSubtract(lite_left: bigint, lite_right: bigint): { value: bigint; ok: boolean } {
        void lite_left;
        void lite_right;
        if (((((lite_right) < (0n))) && (((lite_left) > (lite$addInt(liteFn$lib$core$int$intMax(), lite_right, 878)))))) {
            return { value: 0n, ok: false };
        }
        if (((((lite_right) > (0n))) && (((lite_left) < (lite$addInt(liteFn$lib$core$int$intMin(), lite_right, 959)))))) {
            return { value: 0n, ok: false };
        }
        return { value: lite$subtractInt(lite_left, lite_right, 1021), ok: true };
    }
    void liteFn$lib$core$int$intSubtract;
    function liteFn$lib$core$int$intMultiply(lite_left: bigint, lite_right: bigint): { value: bigint; ok: boolean } {
        void lite_left;
        void lite_right;
        if (((((lite_left) === (0n))) || (((lite_right) === (0n))))) {
            return { value: 0n, ok: true };
        }
        if (((lite_left) > (0n))) {
            if (((lite_right) > (0n))) {
                if (((lite_left) > (lite$divideInt(liteFn$lib$core$int$intMax(), lite_right, 1347)))) {
                    return { value: 0n, ok: false };
                }
            } else if (((lite_right) < (lite$divideInt(liteFn$lib$core$int$intMin(), lite_left, 1426)))) {
                return { value: 0n, ok: false };
            }
        } else if (((lite_right) > (0n))) {
            if (((lite_left) < (lite$divideInt(liteFn$lib$core$int$intMin(), lite_right, 1542)))) {
                return { value: 0n, ok: false };
            }
        } else if (((lite_right) < (lite$divideInt(liteFn$lib$core$int$intMax(), lite_left, 1617)))) {
            return { value: 0n, ok: false };
        }
        return { value: lite$multiplyInt(lite_left, lite_right, 1690), ok: true };
    }
    void liteFn$lib$core$int$intMultiply;
    function liteFn$lib$core$int$intDivide(lite_left: bigint, lite_right: bigint): { value: bigint; ok: boolean } {
        void lite_left;
        void lite_right;
        if (((lite_right) === (0n))) {
            return { value: 0n, ok: false };
        }
        if (((((lite_left) === (liteFn$lib$core$int$intMin()))) && (((lite_right) === ((-1n)))))) {
            return { value: 0n, ok: false };
        }
        return { value: lite$divideInt(lite_left, lite_right, 2027), ok: true };
    }
    void liteFn$lib$core$int$intDivide;
    function liteFn$lib$core$int$intRemainder(lite_left: bigint, lite_right: bigint): { value: bigint; ok: boolean } {
        void lite_left;
        void lite_right;
        if (((lite_right) === (0n))) {
            return { value: 0n, ok: false };
        }
        if (((((lite_left) === (liteFn$lib$core$int$intMin()))) && (((lite_right) === ((-1n)))))) {
            return { value: 0n, ok: true };
        }
        return { value: lite$remainderInt(lite_left, lite_right, 2385), ok: true };
    }
    void liteFn$lib$core$int$intRemainder;
    function liteFn$lib$core$int$intFloorDivide(lite_left: bigint, lite_right: bigint): { value: bigint; ok: boolean } {
        void lite_left;
        void lite_right;
        if (((lite_right) === (0n))) {
            return { value: 0n, ok: false };
        }
        if (((((lite_left) === (liteFn$lib$core$int$intMin()))) && (((lite_right) === ((-1n)))))) {
            return { value: 0n, ok: false };
        }
        const lite_quotient = lite$divideInt(lite_left, lite_right, 2718);
        void lite_quotient;
        return (Boolean(((((lite$remainderInt(lite_left, lite_right, 2739)) !== (0n))) && ((Boolean((((lite_left) < (0n)))) !== Boolean((((lite_right) < (0n)))))))) ? { value: lite$subtractInt(lite_quotient, 1n, 2812), ok: true } : { value: lite_quotient, ok: true });
    }
    void liteFn$lib$core$int$intFloorDivide;
    function liteFn$lib$core$int$intFloorModulo(lite_left: bigint, lite_right: bigint): { value: bigint; ok: boolean } {
        void lite_left;
        void lite_right;
        if (((lite_right) === (0n))) {
            return { value: 0n, ok: false };
        }
        const lite_remainder = lite$remainderInt(lite_left, lite_right, 3105);
        void lite_remainder;
        return (Boolean(((((lite_remainder) !== (0n))) && ((Boolean((((lite_remainder) < (0n)))) !== Boolean((((lite_right) < (0n)))))))) ? { value: lite$addInt(lite_remainder, lite_right, 3202), ok: true } : { value: lite_remainder, ok: true });
    }
    void liteFn$lib$core$int$intFloorModulo;
    function liteFn$lib$core$int$intNegate(lite_value: bigint): { value: bigint; ok: boolean } {
        void lite_value;
        if (((lite_value) === (liteFn$lib$core$int$intMin()))) {
            return { value: 0n, ok: false };
        }
        return { value: lite$subtractInt(0n, lite_value, 3486), ok: true };
    }
    void liteFn$lib$core$int$intNegate;
    function liteFn$lib$core$int$intText(lite_value: bigint): string {
        void lite_value;
        if (((lite_value) === (0n))) {
            return "0";
        }
        if (((lite_value) === (liteFn$lib$core$int$intMin()))) {
            return "-9223372036854775808";
        }
        if (((lite_value) < (0n))) {
            return (("-") + (liteFn$lib$core$int$intText(lite$subtractInt(0n, lite_value, 3739))));
        }
        let lite_remaining = lite_value;
        void lite_remaining;
        let lite_digits = "";
        void lite_digits;
        while (((lite_remaining) > (0n))) {
            const lite_digit = lite$remainderInt(lite_remaining, 10n, 3853);
            void lite_digit;
            lite_digits = ((lite$textAt("0123456789", lite_digit, 3876)) + (lite_digits));
            lite_remaining = lite$divideInt(lite_remaining, 10n, 3949);
        }
        return lite_digits;
    }
    void liteFn$lib$core$int$intText;
    function liteFn$lib$core$text$isDigit(lite_text: string): boolean {
        void lite_text;
        return ((((((((((((((((((((lite_text) === ("0"))) || (((lite_text) === ("1"))))) || (((lite_text) === ("2"))))) || (((lite_text) === ("3"))))) || (((lite_text) === ("4"))))) || (((lite_text) === ("5"))))) || (((lite_text) === ("6"))))) || (((lite_text) === ("7"))))) || (((lite_text) === ("8"))))) || (((lite_text) === ("9"))));
    }
    void liteFn$lib$core$text$isDigit;
    function liteFn$lib$core$text$digitValue(lite_text: string): bigint {
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
    void liteFn$lib$core$text$digitValue;
    function liteFn$lib$core$text$isAsciiLetter(lite_ch: string): boolean {
        void lite_ch;
        const lite_letters = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
        void lite_letters;
        const lite_size = lite$textLength(lite_letters);
        void lite_size;
        let lite_position = 0n;
        void lite_position;
        while (((lite_position) < (lite_size))) {
            if (((lite$textAt(lite_letters, lite_position, 1071)) === (lite_ch))) {
                return true;
            }
            lite_position = lite$addInt(lite_position, 1n, 1149);
        }
        return false;
    }
    void liteFn$lib$core$text$isAsciiLetter;
    function liteFn$lib$core$text$isNameStart(lite_ch: string): boolean {
        void lite_ch;
        return ((liteFn$lib$core$text$isAsciiLetter(lite_ch)) || (((lite_ch) === ("_"))));
    }
    void liteFn$lib$core$text$isNameStart;
    function liteFn$lib$core$text$isNameContinue(lite_ch: string): boolean {
        void lite_ch;
        return ((liteFn$lib$core$text$isNameStart(lite_ch)) || (liteFn$lib$core$text$isDigit(lite_ch)));
    }
    void liteFn$lib$core$text$isNameContinue;
    function liteFn$lib$core$text$skipSpaces(lite_source: string, lite_start: bigint): bigint {
        void lite_source;
        void lite_start;
        const lite_size = lite$textLength(lite_source);
        void lite_size;
        let lite_position = lite_start;
        void lite_position;
        while (((((lite_position) < (lite_size))) && ((((((((((lite$textAt(lite_source, lite_position, 1708)) === (" "))) || (((lite$textAt(lite_source, lite_position, 1744)) === ("\t"))))) || (((lite$textAt(lite_source, lite_position, 1781)) === ("\r"))))) || (((lite$textAt(lite_source, lite_position, 1818)) === ("\n")))))))) {
            lite_position = lite$addInt(lite_position, 1n, 1883);
        }
        return lite_position;
    }
    void liteFn$lib$core$text$skipSpaces;
    function liteFn$lib$core$text$skipName(lite_source: string, lite_start: bigint): bigint {
        void lite_source;
        void lite_start;
        const lite_size = lite$textLength(lite_source);
        void lite_size;
        let lite_position = lite_start;
        void lite_position;
        while (((((lite_position) < (lite_size))) && (liteFn$lib$core$text$isNameContinue(lite$textAt(lite_source, lite_position, 2142))))) {
            lite_position = lite$addInt(lite_position, 1n, 2199);
        }
        return lite_position;
    }
    void liteFn$lib$core$text$skipName;
    function liteFn$lib$core$text$startsWithAt(lite_source: string, lite_position: bigint, lite_text: string): boolean {
        void lite_source;
        void lite_position;
        void lite_text;
        const lite_width = lite$textLength(lite_text);
        void lite_width;
        if (((((lite_position) < (0n))) || (((lite$addInt(lite_position, lite_width, 2438)) > (lite$textLength(lite_source)))))) {
            return false;
        }
        return ((lite$textSlice(lite_source, lite_position, lite$addInt(lite_position, lite_width, 2528), 2490)) === (lite_text));
    }
    void liteFn$lib$core$text$startsWithAt;
    function liteFn$lib$core$text$wordAt(lite_source: string, lite_position: bigint, lite_word: string): boolean {
        void lite_source;
        void lite_position;
        void lite_word;
        if ((!(liteFn$lib$core$text$startsWithAt(lite_source, lite_position, lite_word)))) {
            return false;
        }
        const lite_after = lite$addInt(lite_position, lite$textLength(lite_word), 2825);
        void lite_after;
        return ((((lite_after) >= (lite$textLength(lite_source)))) || ((!(liteFn$lib$core$text$isNameContinue(lite$textAt(lite_source, lite_after, 2901))))));
    }
    void liteFn$lib$core$text$wordAt;
    function liteFn$lib$core$text$indexOfText(lite_source: string, lite_needle: string, lite_start: bigint): bigint {
        void lite_source;
        void lite_needle;
        void lite_start;
        const lite_size = lite$textLength(lite_source);
        void lite_size;
        const lite_width = lite$textLength(lite_needle);
        void lite_width;
        let lite_position = lite_start;
        void lite_position;
        if (((((lite_position) < (0n))) || (((lite_position) > (lite_size))))) {
            return (-1n);
        }
        if (((lite_width) === (0n))) {
            return lite_position;
        }
        while (((lite$addInt(lite_position, lite_width, 3299)) <= (lite_size))) {
            if (liteFn$lib$core$text$startsWithAt(lite_source, lite_position, lite_needle)) {
                return lite_position;
            }
            lite_position = lite$addInt(lite_position, 1n, 3416);
        }
        return (-1n);
    }
    void liteFn$lib$core$text$indexOfText;
    function liteFn$lib$core$text$joinTexts(lite_values: string[], lite_separator: string): string {
        void lite_values;
        void lite_separator;
        let lite_result = "";
        void lite_result;
        let lite_first = true;
        void lite_first;
        for (const lite_value of [...(lite_values)]) {
            void lite_value;
            if (lite_first) {
                lite_result = lite_value;
                lite_first = false;
            } else {
                lite_result = ((((lite_result) + (lite_separator))) + (lite_value));
            }
        }
        return lite_result;
    }
    void liteFn$lib$core$text$joinTexts;
    function liteFn$lib$core$text$textToInt(lite_text: string): { value: bigint; ok: boolean } {
        void lite_text;
        const lite_size = lite$textLength(lite_text);
        void lite_size;
        if (((lite_size) === (0n))) {
            return { value: 0n, ok: false };
        }
        let lite_position = 0n;
        void lite_position;
        let lite_negative = false;
        void lite_negative;
        if (((lite$textAt(lite_text, 0n, 4137)) === ("-"))) {
            lite_negative = true;
            lite_position = 1n;
        } else if (((lite$textAt(lite_text, 0n, 4224)) === ("+"))) {
            lite_position = 1n;
        }
        if (((lite_position) >= (lite_size))) {
            return { value: 0n, ok: false };
        }
        let lite_value = 0n;
        void lite_value;
        while (((lite_position) < (lite_size))) {
            const lite_ch = lite$textAt(lite_text, lite_position, 4399);
            void lite_ch;
            if ((!(liteFn$lib$core$text$isDigit(lite_ch)))) {
                return { value: 0n, ok: false };
            }
            const lite_digit = liteFn$lib$core$text$digitValue(lite_ch);
            void lite_digit;
            if (lite_negative) {
                if (((lite_value) < (lite$divideInt((lite$addInt(liteFn$lib$core$int$intMin(), lite_digit, 4583)), 10n, 4592)))) {
                    return { value: 0n, ok: false };
                }
                lite_value = lite$subtractInt(lite$multiplyInt(lite_value, 10n, 4659), lite_digit, 4664);
            } else {
                if (((lite_value) > (lite$divideInt((lite$subtractInt(liteFn$lib$core$int$intMax(), lite_digit, 4731)), 10n, 4740)))) {
                    return { value: 0n, ok: false };
                }
                lite_value = lite$addInt(lite$multiplyInt(lite_value, 10n, 4807), lite_digit, 4812);
            }
            lite_position = lite$addInt(lite_position, 1n, 4859);
        }
        return { value: lite_value, ok: true };
    }
    void liteFn$lib$core$text$textToInt;
    function liteFn$lib$core$text$length(lite_text: string): bigint {
        void lite_text;
        return lite$textLength(lite_text);
    }
    void liteFn$lib$core$text$length;
    function liteFn$lib$core$text$at(lite_text: string, lite_position: bigint): string {
        void lite_text;
        void lite_position;
        return lite$textAt(lite_text, lite_position, 5158);
    }
    void liteFn$lib$core$text$at;
    function liteFn$lib$core$text$slice(lite_text: string, lite_start: bigint, lite_end: bigint): string {
        void lite_text;
        void lite_start;
        void lite_end;
        return lite$textSlice(lite_text, lite_start, lite_end, 5343);
    }
    void liteFn$lib$core$text$slice;
    function liteFn$lib$core$format$decimalText(lite_value: bigint): string {
        void lite_value;
        return liteFn$lib$core$int$intText(lite_value);
    }
    void liteFn$lib$core$format$decimalText;
    function liteFn$lib$core$format$padLeftText(lite_value: string, lite_width: bigint): string {
        void lite_value;
        void lite_width;
        const lite_size = liteFn$lib$core$text$length(lite_value);
        void lite_size;
        let lite_result = lite_value;
        void lite_result;
        let lite_index = lite_size;
        void lite_index;
        while (((lite_index) < (lite_width))) {
            lite_result = ((" ") + (lite_result));
            lite_index = lite$addInt(lite_index, 1n, 548);
        }
        return lite_result;
    }
    void liteFn$lib$core$format$padLeftText;
    function liteFn$lib$core$format$padRightText(lite_value: string, lite_width: bigint): string {
        void lite_value;
        void lite_width;
        const lite_size = liteFn$lib$core$text$length(lite_value);
        void lite_size;
        let lite_result = lite_value;
        void lite_result;
        let lite_index = lite_size;
        void lite_index;
        while (((lite_index) < (lite_width))) {
            lite_result = ((lite_result) + (" "));
            lite_index = lite$addInt(lite_index, 1n, 846);
        }
        return lite_result;
    }
    void liteFn$lib$core$format$padRightText;
    function liteFn$lib$core$format$padLeftInt(lite_value: bigint, lite_width: bigint): string {
        void lite_value;
        void lite_width;
        return liteFn$lib$core$format$padLeftText(liteFn$lib$core$int$intText(lite_value), lite_width);
    }
    void liteFn$lib$core$format$padLeftInt;
    function liteFn$lib$core$format$padRightInt(lite_value: bigint, lite_width: bigint): string {
        void lite_value;
        void lite_width;
        return liteFn$lib$core$format$padRightText(liteFn$lib$core$int$intText(lite_value), lite_width);
    }
    void liteFn$lib$core$format$padRightInt;
    function liteFn$lib$core$format$joinIntTexts(lite_values: bigint[], lite_separator: string): string {
        void lite_values;
        void lite_separator;
        let lite_result = "";
        void lite_result;
        let lite_first = true;
        void lite_first;
        for (const lite_value of [...(lite_values)]) {
            void lite_value;
            if (lite_first) {
                lite_result = liteFn$lib$core$int$intText(lite_value);
                lite_first = false;
            } else {
                lite_result = ((lite_result) + (((lite_separator) + (liteFn$lib$core$int$intText(lite_value)))));
            }
        }
        return lite_result;
    }
    void liteFn$lib$core$format$joinIntTexts;
    function liteFn$lib$core$source$clampPosition(lite_source: string, lite_position: bigint): bigint {
        void lite_source;
        void lite_position;
        const lite_size = liteFn$lib$core$text$length(lite_source);
        void lite_size;
        if (((lite_position) < (0n))) {
            return 0n;
        }
        if (((lite_position) > (lite_size))) {
            return lite_size;
        }
        return lite_position;
    }
    void liteFn$lib$core$source$clampPosition;
    function liteFn$lib$core$source$lineColumn(lite_source: string, lite_position: bigint): { line: bigint; column: bigint } {
        void lite_source;
        void lite_position;
        const lite_cursor = liteFn$lib$core$source$clampPosition(lite_source, lite_position);
        void lite_cursor;
        let lite_line = 1n;
        void lite_line;
        let lite_lineStart = 0n;
        void lite_lineStart;
        let lite_index = 0n;
        void lite_index;
        while (((lite_index) < (lite_cursor))) {
            if (((liteFn$lib$core$text$at(lite_source, lite_index)) === ("\n"))) {
                lite_line = lite$addInt(lite_line, 1n, 731);
                lite_lineStart = lite$addInt(lite_index, 1n, 767);
            }
            lite_index = lite$addInt(lite_index, 1n, 796);
        }
        return { line: lite_line, column: lite$addInt(lite$subtractInt(lite_cursor, lite_lineStart, 836), 1n, 848) };
    }
    void liteFn$lib$core$source$lineColumn;
    function liteFn$lib$core$source$lineCount(lite_source: string): bigint {
        void lite_source;
        const lite_size = liteFn$lib$core$text$length(lite_source);
        void lite_size;
        let lite_count = 1n;
        void lite_count;
        let lite_index = 0n;
        void lite_index;
        while (((lite_index) < (lite_size))) {
            if (((liteFn$lib$core$text$at(lite_source, lite_index)) === ("\n"))) {
                lite_count = lite$addInt(lite_count, 1n, 1116);
            }
            lite_index = lite$addInt(lite_index, 1n, 1138);
        }
        return lite_count;
    }
    void liteFn$lib$core$source$lineCount;
    function liteFn$lib$core$source$lineStartOffset(lite_source: string, lite_line: bigint): bigint {
        void lite_source;
        void lite_line;
        const lite_size = liteFn$lib$core$text$length(lite_source);
        void lite_size;
        if (((lite_line) <= (1n))) {
            return 0n;
        }
        let lite_current = 2n;
        void lite_current;
        let lite_index = 0n;
        void lite_index;
        while (((lite_index) < (lite_size))) {
            if (((liteFn$lib$core$text$at(lite_source, lite_index)) === ("\n"))) {
                if (((lite_current) === (lite_line))) {
                    return lite$addInt(lite_index, 1n, 1529);
                }
                lite_current = lite$addInt(lite_current, 1n, 1556);
            }
            lite_index = lite$addInt(lite_index, 1n, 1586);
        }
        return lite_size;
    }
    void liteFn$lib$core$source$lineStartOffset;
    function liteFn$lib$core$source$lineEndOffset(lite_source: string, lite_line: bigint): bigint {
        void lite_source;
        void lite_line;
        const lite_size = liteFn$lib$core$text$length(lite_source);
        void lite_size;
        const lite_start = liteFn$lib$core$source$lineStartOffset(lite_source, lite_line);
        void lite_start;
        let lite_index = lite_start;
        void lite_index;
        while (((((lite_index) < (lite_size))) && (((liteFn$lib$core$text$at(lite_source, lite_index)) !== ("\n"))))) {
            lite_index = lite$addInt(lite_index, 1n, 1910);
        }
        return lite_index;
    }
    void liteFn$lib$core$source$lineEndOffset;
    function liteFn$numeric__literals$numericAliasKind(lite_name: string): string {
        void lite_name;
        return (Boolean(((lite_name) === ("Int64"))) ? "Int" : (Boolean(((((lite_name) === ("Float64"))) || (((lite_name) === ("Double"))))) ? "Float" : ""));
    }
    void liteFn$numeric__literals$numericAliasKind;
    function liteFn$numeric__literals$isIntKind(lite_kind: string): boolean {
        void lite_kind;
        return ((((((((lite_kind) === ("Int8"))) || (((lite_kind) === ("Int16"))))) || (((lite_kind) === ("Int32"))))) || (((lite_kind) === ("Int"))));
    }
    void liteFn$numeric__literals$isIntKind;
    function liteFn$numeric__literals$isFloatKind(lite_kind: string): boolean {
        void lite_kind;
        return ((((lite_kind) === ("Float32"))) || (((lite_kind) === ("Float"))));
    }
    void liteFn$numeric__literals$isFloatKind;
    function liteFn$numeric__literals$isNumericKind(lite_kind: string): boolean {
        void lite_kind;
        return ((liteFn$numeric__literals$isIntKind(lite_kind)) || (liteFn$numeric__literals$isFloatKind(lite_kind)));
    }
    void liteFn$numeric__literals$isNumericKind;
    function liteFn$numeric__literals$isNarrowIntKind(lite_kind: string): boolean {
        void lite_kind;
        return ((((((lite_kind) === ("Int8"))) || (((lite_kind) === ("Int16"))))) || (((lite_kind) === ("Int32"))));
    }
    void liteFn$numeric__literals$isNarrowIntKind;
    function liteFn$numeric__literals$isNarrowNumericKind(lite_kind: string): boolean {
        void lite_kind;
        return ((liteFn$numeric__literals$isNarrowIntKind(lite_kind)) || (((lite_kind) === ("Float32"))));
    }
    void liteFn$numeric__literals$isNarrowNumericKind;
    function liteFn$numeric__literals$narrowIntBits(lite_kind: string): bigint {
        void lite_kind;
        return (Boolean(((lite_kind) === ("Int8"))) ? 8n : (Boolean(((lite_kind) === ("Int16"))) ? 16n : (Boolean(((lite_kind) === ("Int32"))) ? 32n : 64n)));
    }
    void liteFn$numeric__literals$narrowIntBits;
    function liteFn$numeric__literals$intKindFits(lite_kind: string, lite_value: bigint): boolean {
        void lite_kind;
        void lite_value;
        return (Boolean(((lite_kind) === ("Int8"))) ? ((((lite_value) >= ((-128n)))) && (((lite_value) <= (127n)))) : (Boolean(((lite_kind) === ("Int16"))) ? ((((lite_value) >= ((-32768n)))) && (((lite_value) <= (32767n)))) : (Boolean(((lite_kind) === ("Int32"))) ? ((((lite_value) >= ((-2147483648n)))) && (((lite_value) <= (2147483647n)))) : ((lite_kind) === ("Int")))));
    }
    void liteFn$numeric__literals$intKindFits;
    function liteFn$numeric__literals$numericRank(lite_kind: string): bigint {
        void lite_kind;
        return (Boolean(((((lite_kind) === ("Int8"))) || (((lite_kind) === ("Float32"))))) ? 1n : (Boolean(((lite_kind) === ("Int16"))) ? 2n : (Boolean(((lite_kind) === ("Int32"))) ? 3n : (Boolean(((((lite_kind) === ("Int"))) || (((lite_kind) === ("Float"))))) ? 4n : 0n))));
    }
    void liteFn$numeric__literals$numericRank;
    function liteFn$numeric__literals$promoteNumericKind(lite_leftKind: string, lite_rightKind: string): string {
        void lite_leftKind;
        void lite_rightKind;
        return (Boolean(((liteFn$numeric__literals$isIntKind(lite_leftKind)) && (liteFn$numeric__literals$isIntKind(lite_rightKind)))) ? (Boolean(((liteFn$numeric__literals$numericRank(lite_leftKind)) >= (liteFn$numeric__literals$numericRank(lite_rightKind)))) ? lite_leftKind : lite_rightKind) : (Boolean(((liteFn$numeric__literals$isFloatKind(lite_leftKind)) && (liteFn$numeric__literals$isFloatKind(lite_rightKind)))) ? (Boolean(((liteFn$numeric__literals$numericRank(lite_leftKind)) >= (liteFn$numeric__literals$numericRank(lite_rightKind)))) ? lite_leftKind : lite_rightKind) : ""));
    }
    void liteFn$numeric__literals$promoteNumericKind;
    function liteFn$numeric__literals$numericWidens(lite_expected: string, lite_actual: string): boolean {
        void lite_expected;
        void lite_actual;
        return (Boolean(((liteFn$numeric__literals$isIntKind(lite_expected)) && (liteFn$numeric__literals$isIntKind(lite_actual)))) ? ((liteFn$numeric__literals$numericRank(lite_actual)) <= (liteFn$numeric__literals$numericRank(lite_expected))) : (Boolean(((liteFn$numeric__literals$isFloatKind(lite_expected)) && (liteFn$numeric__literals$isFloatKind(lite_actual)))) ? ((liteFn$numeric__literals$numericRank(lite_actual)) <= (liteFn$numeric__literals$numericRank(lite_expected))) : (Boolean(((liteFn$numeric__literals$isFloatKind(lite_expected)) && (liteFn$numeric__literals$isIntKind(lite_actual)))) ? (Boolean(((lite_expected) === ("Float32"))) ? ((((lite_actual) === ("Int8"))) || (((lite_actual) === ("Int16")))) : ((((((lite_actual) === ("Int8"))) || (((lite_actual) === ("Int16"))))) || (((lite_actual) === ("Int32"))))) : false)));
    }
    void liteFn$numeric__literals$numericWidens;
    function liteFn$numeric__literals$intWithinFloatLimit(lite_input: bigint, lite_limit: bigint): boolean {
        void lite_input;
        void lite_limit;
        let lite_value = lite_input;
        void lite_value;
        while (((((lite_value) > (lite_limit))) || (((lite_value) < (lite$negateInt(lite_limit, 3731)))))) {
            if (((lite$remainderInt(lite_value, 2n, 3757)) !== (0n))) {
                return false;
            }
            lite_value = lite$divideInt(lite_value, 2n, 3799);
        }
        return true;
    }
    void liteFn$numeric__literals$intWithinFloatLimit;
    function liteFn$numeric__literals$intExactlyFloat(lite_input: bigint): boolean {
        void lite_input;
        return liteFn$numeric__literals$intWithinFloatLimit(lite_input, 9007199254740992n);
    }
    void liteFn$numeric__literals$intExactlyFloat;
    function liteFn$numeric__literals$intExactlyFloat32(lite_input: bigint): boolean {
        void lite_input;
        return liteFn$numeric__literals$intWithinFloatLimit(lite_input, 16777216n);
    }
    void liteFn$numeric__literals$intExactlyFloat32;
    function liteFn$numeric__literals$finiteDigitsWithin(lite_digits: string, lite_fractionCount: bigint, lite_exponent: bigint, lite_maxPower: bigint, lite_midpoint: string): boolean {
        void lite_digits;
        void lite_fractionCount;
        void lite_exponent;
        void lite_maxPower;
        void lite_midpoint;
        let lite_first = 0n;
        void lite_first;
        while (((((lite_first) < (liteFn$lib$core$text$length(lite_digits)))) && (((liteFn$lib$core$text$at(lite_digits, lite_first)) === ("0"))))) {
            lite_first = lite$addInt(lite_first, 1n, 4544);
        }
        if (((lite_first) === (liteFn$lib$core$text$length(lite_digits)))) {
            return true;
        }
        const lite_significant = liteFn$lib$core$text$slice(lite_digits, lite_first, liteFn$lib$core$text$length(lite_digits));
        void lite_significant;
        const lite_power = lite$addInt(lite$subtractInt(liteFn$lib$core$text$length(lite_significant), lite_fractionCount, 4722), lite_exponent, 4738);
        void lite_power;
        if (((lite_power) < (lite_maxPower))) {
            return true;
        }
        if (((lite_power) > (lite_maxPower))) {
            return false;
        }
        let lite_count = liteFn$lib$core$text$length(lite_significant);
        void lite_count;
        if (((lite_count) < (liteFn$lib$core$text$length(lite_midpoint)))) {
            lite_count = liteFn$lib$core$text$length(lite_midpoint);
        }
        let lite_index = 0n;
        void lite_index;
        while (((lite_index) < (lite_count))) {
            const lite_left = (Boolean(((lite_index) < (liteFn$lib$core$text$length(lite_significant)))) ? liteFn$lib$core$text$digitValue(liteFn$lib$core$text$at(lite_significant, lite_index)) : 0n);
            void lite_left;
            const lite_right = (Boolean(((lite_index) < (liteFn$lib$core$text$length(lite_midpoint)))) ? liteFn$lib$core$text$digitValue(liteFn$lib$core$text$at(lite_midpoint, lite_index)) : 0n);
            void lite_right;
            if (((lite_left) < (lite_right))) {
                return true;
            }
            if (((lite_left) > (lite_right))) {
                return false;
            }
            lite_index = lite$addInt(lite_index, 1n, 5338);
        }
        return false;
    }
    void liteFn$numeric__literals$finiteDigitsWithin;
    function liteFn$numeric__literals$finiteFloatDigits(lite_digits: string, lite_fractionCount: bigint, lite_exponent: bigint): boolean {
        void lite_digits;
        void lite_fractionCount;
        void lite_exponent;
        return liteFn$numeric__literals$finiteDigitsWithin(lite_digits, lite_fractionCount, lite_exponent, 309n, "179769313486231580793728971405303415079934132710037826936173778980444968292764750946649017977587207096330286416692887910946555547851940402630657488671505820681908902000708383676273854845817711531764475730270069855571366959622842914819860834936475292719074168444365510704342711559699508093042880177904174497792");
    }
    void liteFn$numeric__literals$finiteFloatDigits;
    function liteFn$numeric__literals$finiteFloat32Digits(lite_digits: string, lite_fractionCount: bigint, lite_exponent: bigint): boolean {
        void lite_digits;
        void lite_fractionCount;
        void lite_exponent;
        return liteFn$numeric__literals$finiteDigitsWithin(lite_digits, lite_fractionCount, lite_exponent, 39n, "340282356779733642748073463979561713664");
    }
    void liteFn$numeric__literals$finiteFloat32Digits;
    function liteFn$numeric__literals$scanNumericLiteral(lite_source: string, lite_position: bigint): { next: bigint; integerEnd: bigint; fractionStart: bigint; fractionEnd: bigint; exponent: bigint; floating: boolean; exponentMissingAt: bigint; magnitude: bigint; outsideInt: boolean } {
        void lite_source;
        void lite_position;
        const lite_size = liteFn$lib$core$text$length(lite_source);
        void lite_size;
        let lite_cursor = lite_position;
        void lite_cursor;
        let lite_magnitude = 0n;
        void lite_magnitude;
        let lite_outsideInt = false;
        void lite_outsideInt;
        while (((((lite_cursor) < (lite_size))) && (liteFn$lib$core$text$isDigit(liteFn$lib$core$text$at(lite_source, lite_cursor))))) {
            const lite_digit = liteFn$lib$core$text$digitValue(liteFn$lib$core$text$at(lite_source, lite_cursor));
            void lite_digit;
            if ((!(lite_outsideInt))) {
                if (((lite_magnitude) < (lite$divideInt((lite$addInt((-9223372036854775808n), lite_digit, 7155)), 10n, 7164)))) {
                    lite_outsideInt = true;
                } else {
                    lite_magnitude = lite$subtractInt(lite$multiplyInt(lite_magnitude, 10n, 7233), lite_digit, 7238);
                }
            }
            lite_cursor = lite$addInt(lite_cursor, 1n, 7274);
        }
        const lite_integerEnd = lite_cursor;
        void lite_integerEnd;
        let lite_fractionStart = lite_cursor;
        void lite_fractionStart;
        let lite_fractionEnd = lite_cursor;
        void lite_fractionEnd;
        let lite_floating = false;
        void lite_floating;
        if (((((((lite$addInt(lite_cursor, 1n, 7417)) < (lite_size))) && (((liteFn$lib$core$text$at(lite_source, lite_cursor)) === ("."))))) && (liteFn$lib$core$text$isDigit(liteFn$lib$core$text$at(lite_source, lite$addInt(lite_cursor, 1n, 7512)))))) {
            lite_floating = true;
            lite_cursor = lite$addInt(lite_cursor, 1n, 7560);
            lite_fractionStart = lite_cursor;
            while (((((lite_cursor) < (lite_size))) && (liteFn$lib$core$text$isDigit(liteFn$lib$core$text$at(lite_source, lite_cursor))))) {
                lite_cursor = lite$addInt(lite_cursor, 1n, 7682);
            }
            lite_fractionEnd = lite_cursor;
        }
        let lite_exponent = 0n;
        void lite_exponent;
        let lite_exponentMissingAt = (-1n);
        void lite_exponentMissingAt;
        if (((((lite_cursor) < (lite_size))) && ((((((liteFn$lib$core$text$at(lite_source, lite_cursor)) === ("e"))) || (((liteFn$lib$core$text$at(lite_source, lite_cursor)) === ("E")))))))) {
            lite_floating = true;
            const lite_exponentAt = lite_cursor;
            void lite_exponentAt;
            lite_cursor = lite$addInt(lite_cursor, 1n, 7952);
            let lite_negativeExponent = false;
            void lite_negativeExponent;
            if (((((lite_cursor) < (lite_size))) && ((((((liteFn$lib$core$text$at(lite_source, lite_cursor)) === ("+"))) || (((liteFn$lib$core$text$at(lite_source, lite_cursor)) === ("-")))))))) {
                lite_negativeExponent = ((liteFn$lib$core$text$at(lite_source, lite_cursor)) === ("-"));
                lite_cursor = lite$addInt(lite_cursor, 1n, 8186);
            }
            const lite_exponentStart = lite_cursor;
            void lite_exponentStart;
            const lite_limit = lite$addInt(lite_size, 310n, 8257);
            void lite_limit;
            while (((((lite_cursor) < (lite_size))) && (liteFn$lib$core$text$isDigit(liteFn$lib$core$text$at(lite_source, lite_cursor))))) {
                const lite_digit = liteFn$lib$core$text$digitValue(liteFn$lib$core$text$at(lite_source, lite_cursor));
                void lite_digit;
                if (((lite_exponent) > (lite$divideInt((lite$subtractInt(lite_limit, lite_digit, 8443)), 10n, 8452)))) {
                    lite_exponent = lite_limit;
                } else {
                    lite_exponent = lite$addInt(lite$multiplyInt(lite_exponent, 10n, 8518), lite_digit, 8523);
                }
                lite_cursor = lite$addInt(lite_cursor, 1n, 8553);
            }
            if (((lite_cursor) === (lite_exponentStart))) {
                lite_exponentMissingAt = lite_exponentAt;
            }
            if (lite_negativeExponent) {
                lite_exponent = lite$negateInt(lite_exponent, 8681);
            }
        }
        return { next: lite_cursor, integerEnd: lite_integerEnd, fractionStart: lite_fractionStart, fractionEnd: lite_fractionEnd, exponent: lite_exponent, floating: lite_floating, exponentMissingAt: lite_exponentMissingAt, magnitude: lite_magnitude, outsideInt: lite_outsideInt };
    }
    void liteFn$numeric__literals$scanNumericLiteral;
    function liteFn$c__literals$intLiteralCode(lite_value: bigint, lite_negative: boolean, lite_digits: string): string {
        void lite_value;
        void lite_negative;
        void lite_digits;
        return (Boolean(((lite_value) === ((-9223372036854775808n)))) ? "INT64_MIN" : (Boolean(((lite_value) === (0n))) ? "INT64_C(0)" : (Boolean(lite_negative) ? (((("(-INT64_C(") + (lite_digits))) + ("))")) : (((("INT64_C(") + (lite_digits))) + (")")))));
    }
    void liteFn$c__literals$intLiteralCode;
    function liteFn$c__literals$textLiteralCode(lite_value: string): string {
        void lite_value;
        const lite_size = liteFn$lib$core$text$length(lite_value);
        void lite_size;
        let lite_encoded = "\"";
        void lite_encoded;
        let lite_position = 0n;
        void lite_position;
        while (((lite_position) < (lite_size))) {
            const lite_ch = liteFn$lib$core$text$at(lite_value, lite_position);
            void lite_ch;
            if (((lite_ch) === ("\\"))) {
                lite_encoded = ((lite_encoded) + ("\\\\"));
            } else if (((lite_ch) === ("\""))) {
                lite_encoded = ((lite_encoded) + ("\\\""));
            } else if (((lite_ch) === ("?"))) {
                lite_encoded = ((lite_encoded) + ("\\?"));
            } else if (((lite_ch) === ("\n"))) {
                lite_encoded = ((lite_encoded) + ("\\n"));
            } else if (((lite_ch) === ("\r"))) {
                lite_encoded = ((lite_encoded) + ("\\r"));
            } else if (((lite_ch) === ("\t"))) {
                lite_encoded = ((lite_encoded) + ("\\t"));
            } else {
                lite_encoded = ((lite_encoded) + (lite_ch));
            }
            lite_position = lite$addInt(lite_position, 1n, 1166);
        }
        return ((lite_encoded) + ("\""));
    }
    void liteFn$c__literals$textLiteralCode;
    function liteFn$c__literals$floatLiteralCode(lite_digits: string, lite_negative: boolean): string {
        void lite_digits;
        void lite_negative;
        const lite_parsed = (((("lt_float_literal(") + (liteFn$c__literals$textLiteralCode(lite_digits)))) + (")"));
        void lite_parsed;
        return (Boolean(lite_negative) ? (((("(-") + (lite_parsed))) + (")")) : lite_parsed);
    }
    void liteFn$c__literals$floatLiteralCode;
    function liteFn$c__literals$float32LiteralCode(lite_digits: string, lite_negative: boolean): string {
        void lite_digits;
        void lite_negative;
        const lite_parsed = (((("((double)lt_float32_literal(") + (liteFn$c__literals$textLiteralCode(lite_digits)))) + ("))"));
        void lite_parsed;
        return (Boolean(lite_negative) ? (((("(-") + (lite_parsed))) + (")")) : lite_parsed);
    }
    void liteFn$c__literals$float32LiteralCode;
    function liteFn$c__literals$unitEvaluationCode(lite_code: string): string {
        void lite_code;
        return (((("((void)(") + (lite_code))) + ("), 0)"));
    }
    void liteFn$c__literals$unitEvaluationCode;
    function liteFn$c__literals$unitLiteralCode(): string {
        return "0";
    }
    void liteFn$c__literals$unitLiteralCode;
    function liteFn$c__literals$boolLiteralCode(lite_value: boolean): string {
        void lite_value;
        return (Boolean(lite_value) ? "true" : "false");
    }
    void liteFn$c__literals$boolLiteralCode;
    function liteFn$c__literals$listCopyCode(lite_code: string): string {
        void lite_code;
        liteFn$lib$core$diag$fail("", "C backend does not support list values yet");
        return lite_code;
    }
    void liteFn$c__literals$listCopyCode;
    function liteFn$c__literals$concatCode(lite_left: string, lite_right: string): string {
        void lite_left;
        void lite_right;
        return (((((((("lite_concat(") + (lite_left))) + (", "))) + (lite_right))) + (")"));
    }
    void liteFn$c__literals$concatCode;
    function liteFn$c__literals$notCode(lite_value: string): string {
        void lite_value;
        return (((("(!(") + (lite_value))) + ("))"));
    }
    void liteFn$c__literals$notCode;
    function liteFn$c__literals$logicCode(lite_op: string, lite_left: string, lite_right: string): string {
        void lite_op;
        void lite_left;
        void lite_right;
        return (Boolean(((lite_op) === ("and"))) ? (((((((("((") + (lite_left))) + (") && ("))) + (lite_right))) + ("))")) : (((((((("((") + (lite_left))) + (") || ("))) + (lite_right))) + ("))")));
    }
    void liteFn$c__literals$logicCode;
    function liteFn$c__literals$comparisonCode(lite_op: string, lite_kind: string, lite_left: string, lite_right: string): string {
        void lite_op;
        void lite_kind;
        void lite_left;
        void lite_right;
        if (((lite_kind) === ("String"))) {
            return (Boolean(((lite_op) === ("=="))) ? (((((((("strcmp(") + (lite_left))) + (", "))) + (lite_right))) + (") == 0")) : (((((((("strcmp(") + (lite_left))) + (", "))) + (lite_right))) + (") != 0")));
        } else {
            const lite_operator = (Boolean(((lite_op) === ("=="))) ? "==" : (Boolean(((lite_op) === ("=!="))) ? "!=" : (Boolean(((lite_op) === ("<"))) ? "<" : (Boolean(((lite_op) === ("<!"))) ? ">=" : (Boolean(((lite_op) === ("<="))) ? "<=" : (Boolean(((lite_op) === ("<!="))) ? ">" : (Boolean(((lite_op) === (">"))) ? ">" : (Boolean(((lite_op) === (">!"))) ? "<=" : (Boolean(((lite_op) === (">="))) ? ">=" : "<")))))))));
            void lite_operator;
            return (((((((((((("(") + (lite_left))) + (") "))) + (lite_operator))) + (" ("))) + (lite_right))) + (")"));
        }
    }
    void liteFn$c__literals$comparisonCode;
    function liteFn$c__literals$floatOperandCode(lite_kind: string, lite_code: string): string {
        void lite_kind;
        void lite_code;
        return (Boolean(liteFn$numeric__literals$isIntKind(lite_kind)) ? (((("((double)(") + (lite_code))) + ("))")) : lite_code);
    }
    void liteFn$c__literals$floatOperandCode;
    function liteFn$c__literals$float32OperandCode(lite_kind: string, lite_code: string): string {
        void lite_kind;
        void lite_code;
        return (Boolean(((liteFn$numeric__literals$isIntKind(lite_kind)) || (((lite_kind) === ("Float"))))) ? (((("((double)((float)(") + (lite_code))) + (")))")) : lite_code);
    }
    void liteFn$c__literals$float32OperandCode;
    function liteFn$c__literals$comparisonPairCode(lite_op: string, lite_leftKind: string, lite_rightKind: string, lite_left: string, lite_right: string): string {
        void lite_op;
        void lite_leftKind;
        void lite_rightKind;
        void lite_left;
        void lite_right;
        return (Boolean(((liteFn$numeric__literals$isFloatKind(lite_leftKind)) || (liteFn$numeric__literals$isFloatKind(lite_rightKind)))) ? liteFn$c__literals$comparisonCode(lite_op, "Float", liteFn$c__literals$floatOperandCode(lite_leftKind, lite_left), liteFn$c__literals$floatOperandCode(lite_rightKind, lite_right)) : liteFn$c__literals$comparisonCode(lite_op, lite_leftKind, lite_left, lite_right));
    }
    void liteFn$c__literals$comparisonPairCode;
    function liteFn$c__literals$floatOpTag(lite_op: string): string {
        void lite_op;
        return (Boolean(((lite_op) === ("+"))) ? "0" : (Boolean(((lite_op) === ("-"))) ? "1" : (Boolean(((lite_op) === ("*"))) ? "2" : "3")));
    }
    void liteFn$c__literals$floatOpTag;
    function liteFn$c__literals$floatBinaryCall(lite_helper: string, lite_op: string, lite_left: string, lite_right: string, lite_position: bigint): string {
        void lite_helper;
        void lite_op;
        void lite_left;
        void lite_right;
        void lite_position;
        const lite_id = liteFn$lib$core$int$intText(lite_position);
        void lite_id;
        return (((((((((((((((((((((((((((((((((((("(lt_arg_f_left_") + (lite_id))) + (" = "))) + (lite_left))) + (", lt_arg_f_right_"))) + (lite_id))) + (" = "))) + (lite_right))) + (", "))) + (lite_helper))) + ("(lt_arg_f_left_"))) + (lite_id))) + (", lt_arg_f_right_"))) + (lite_id))) + (", "))) + (liteFn$c__literals$floatOpTag(lite_op)))) + (", "))) + (lite_id))) + ("))"));
    }
    void liteFn$c__literals$floatBinaryCall;
    function liteFn$c__literals$floatBinaryCode(lite_op: string, lite_left: string, lite_right: string, lite_position: bigint): string {
        void lite_op;
        void lite_left;
        void lite_right;
        void lite_position;
        return liteFn$c__literals$floatBinaryCall("lt_float_op", lite_op, lite_left, lite_right, lite_position);
    }
    void liteFn$c__literals$floatBinaryCode;
    function liteFn$c__literals$float32BinaryCode(lite_op: string, lite_left: string, lite_right: string, lite_position: bigint): string {
        void lite_op;
        void lite_left;
        void lite_right;
        void lite_position;
        return liteFn$c__literals$floatBinaryCall("lt_float32_op", lite_op, lite_left, lite_right, lite_position);
    }
    void liteFn$c__literals$float32BinaryCode;
    function liteFn$c__literals$floatPowerCode(lite_left: string, lite_right: string, lite_position: bigint): string {
        void lite_left;
        void lite_right;
        void lite_position;
        const lite_id = liteFn$lib$core$int$intText(lite_position);
        void lite_id;
        return (((((((((((((((((((((((((((("(lt_arg_f_left_") + (lite_id))) + (" = "))) + (lite_left))) + (", lt_arg_f_right_"))) + (lite_id))) + (" = "))) + (lite_right))) + (", lt_float_power(lt_arg_f_left_"))) + (lite_id))) + (", lt_arg_f_right_"))) + (lite_id))) + (", "))) + (lite_id))) + ("))"));
    }
    void liteFn$c__literals$floatPowerCode;
    function liteFn$c__literals$floorDivCode(lite_left: string, lite_right: string): string {
        void lite_left;
        void lite_right;
        return (((((((((((((((((((((((((((("(") + (lite_left))) + (" / "))) + (lite_right))) + (" - (((("))) + (lite_left))) + (" % "))) + (lite_right))) + (") != 0) && ((("))) + (lite_left))) + (" % "))) + (lite_right))) + (") < 0) != ("))) + (lite_right))) + (" < 0))) ? 1 : 0))"));
    }
    void liteFn$c__literals$floorDivCode;
    function liteFn$c__literals$floorModCode(lite_left: string, lite_right: string): string {
        void lite_left;
        void lite_right;
        return (((((((((((((((((((((((((((((((("(") + (lite_left))) + (" % "))) + (lite_right))) + (" + (((("))) + (lite_left))) + (" % "))) + (lite_right))) + (") != 0) && ((("))) + (lite_left))) + (" % "))) + (lite_right))) + (") < 0) != ("))) + (lite_right))) + (" < 0))) ? "))) + (lite_right))) + (" : 0))"));
    }
    void liteFn$c__literals$floorModCode;
    function liteFn$c__literals$intBinaryCallCode(lite_name: string, lite_left: string, lite_right: string, lite_position: bigint): string {
        void lite_name;
        void lite_left;
        void lite_right;
        void lite_position;
        const lite_id = liteFn$lib$core$int$intText(lite_position);
        void lite_id;
        return (((((((((((((((((((((((((((((((("(lt_arg_left_") + (lite_id))) + (" = "))) + (lite_left))) + (", lt_arg_right_"))) + (lite_id))) + (" = "))) + (lite_right))) + (", "))) + (lite_name))) + ("(lt_arg_left_"))) + (lite_id))) + (", lt_arg_right_"))) + (lite_id))) + (", "))) + (lite_id))) + ("))"));
    }
    void liteFn$c__literals$intBinaryCallCode;
    function liteFn$c__literals$intDivideCode(lite_left: string, lite_right: string, lite_position: bigint): string {
        void lite_left;
        void lite_right;
        void lite_position;
        return liteFn$c__literals$intBinaryCallCode("lite_divide_int", lite_left, lite_right, lite_position);
    }
    void liteFn$c__literals$intDivideCode;
    function liteFn$c__literals$intRemainderCode(lite_left: string, lite_right: string, lite_position: bigint): string {
        void lite_left;
        void lite_right;
        void lite_position;
        return liteFn$c__literals$intBinaryCallCode("lite_remainder_int", lite_left, lite_right, lite_position);
    }
    void liteFn$c__literals$intRemainderCode;
    function liteFn$c__literals$intFloorDivideCode(lite_left: string, lite_right: string, lite_position: bigint): string {
        void lite_left;
        void lite_right;
        void lite_position;
        return liteFn$c__literals$intBinaryCallCode("lite_floor_divide_int", lite_left, lite_right, lite_position);
    }
    void liteFn$c__literals$intFloorDivideCode;
    function liteFn$c__literals$intFloorModuloCode(lite_left: string, lite_right: string, lite_position: bigint): string {
        void lite_left;
        void lite_right;
        void lite_position;
        return liteFn$c__literals$intBinaryCallCode("lite_floor_modulo_int", lite_left, lite_right, lite_position);
    }
    void liteFn$c__literals$intFloorModuloCode;
    function liteFn$c__literals$intAddCode(lite_left: string, lite_right: string, lite_position: bigint): string {
        void lite_left;
        void lite_right;
        void lite_position;
        return liteFn$c__literals$intBinaryCallCode("lt_checked_add", lite_left, lite_right, lite_position);
    }
    void liteFn$c__literals$intAddCode;
    function liteFn$c__literals$intSubtractCode(lite_left: string, lite_right: string, lite_position: bigint): string {
        void lite_left;
        void lite_right;
        void lite_position;
        return liteFn$c__literals$intBinaryCallCode("lt_checked_subtract", lite_left, lite_right, lite_position);
    }
    void liteFn$c__literals$intSubtractCode;
    function liteFn$c__literals$intMultiplyCode(lite_left: string, lite_right: string, lite_position: bigint): string {
        void lite_left;
        void lite_right;
        void lite_position;
        return liteFn$c__literals$intBinaryCallCode("lt_checked_multiply", lite_left, lite_right, lite_position);
    }
    void liteFn$c__literals$intMultiplyCode;
    function liteFn$c__literals$intNegateCode(lite_value: string, lite_position: bigint): string {
        void lite_value;
        void lite_position;
        return (((((((("lt_checked_negate(") + (lite_value))) + (", "))) + (liteFn$lib$core$int$intText(lite_position)))) + (")"));
    }
    void liteFn$c__literals$intNegateCode;
    function liteFn$c__literals$checkedNarrowIntCode(lite_kind: string, lite_value: string, lite_position: bigint): string {
        void lite_kind;
        void lite_value;
        void lite_position;
        return (((((((((((((((("lt_checked_narrow_int(") + (lite_value))) + (", "))) + (liteFn$lib$core$int$intText(liteFn$numeric__literals$narrowIntBits(lite_kind))))) + (", "))) + (liteFn$c__literals$textLiteralCode(lite_kind)))) + (", "))) + (liteFn$lib$core$int$intText(lite_position)))) + (")"));
    }
    void liteFn$c__literals$checkedNarrowIntCode;
    function liteFn$c__literals$comparisonTemp(lite_kind: string, lite_position: bigint, lite_index: bigint): string {
        void lite_kind;
        void lite_position;
        void lite_index;
        const lite_tag = (Boolean(((lite_kind) === ("String"))) ? "s" : (Boolean(((lite_kind) === ("Bool"))) ? "b" : (Boolean(liteFn$numeric__literals$isFloatKind(lite_kind)) ? "f" : "i")));
        void lite_tag;
        return (((((((((("lt_cmp_") + (lite_tag))) + ("_"))) + (liteFn$lib$core$int$intText(lite_position)))) + ("_"))) + (liteFn$lib$core$int$intText(lite_index)));
    }
    void liteFn$c__literals$comparisonTemp;
    function liteFn$c__literals$comparisonValueCode(lite_kind: string, lite_code: string): string {
        void lite_kind;
        void lite_code;
        if (((lite_kind) !== ("Unit"))) {
            return lite_code;
        }
        let lite_inner = lite_code;
        void lite_inner;
        while (((((((liteFn$lib$core$text$length(lite_inner)) >= (2n))) && (((liteFn$lib$core$text$at(lite_inner, 0n)) === ("("))))) && (((liteFn$lib$core$text$at(lite_inner, lite$subtractInt(liteFn$lib$core$text$length(lite_inner), 1n, 10192))) === (")"))))) {
            lite_inner = liteFn$lib$core$text$slice(lite_inner, 1n, lite$subtractInt(liteFn$lib$core$text$length(lite_inner), 1n, 10268));
        }
        return (Boolean(((lite_inner) === ("undefined"))) ? "0" : (((("(") + (lite_code))) + (", 0)")));
    }
    void liteFn$c__literals$comparisonValueCode;
    function liteFn$c__literals$comparisonChainCode(lite_codes: string[], lite_kinds: string[], lite_operators: string[], lite_count: bigint, lite_position: bigint): string {
        void lite_codes;
        void lite_kinds;
        void lite_operators;
        void lite_count;
        void lite_position;
        const lite_first = liteFn$c__literals$comparisonTemp(lite$listAt((lite_kinds), 0n, 10637), lite_position, 0n);
        void lite_first;
        const lite_second = liteFn$c__literals$comparisonTemp(lite$listAt((lite_kinds), 1n, 10690), lite_position, 1n);
        void lite_second;
        let lite_result = (((((((((((((((((("(") + (lite_first))) + (" = "))) + (liteFn$c__literals$comparisonValueCode(lite$listAt((lite_kinds), 0n, 10774), lite$listAt((lite_codes), 0n, 10784))))) + (", "))) + (lite_second))) + (" = "))) + (liteFn$c__literals$comparisonValueCode(lite$listAt((lite_kinds), 1n, 10840), lite$listAt((lite_codes), 1n, 10850))))) + (", "))) + (liteFn$c__literals$comparisonPairCode(lite$listAt((lite_operators), 0n, 10892), lite$listAt((lite_kinds), 0n, 10902), lite$listAt((lite_kinds), 1n, 10912), lite_first, lite_second)));
        void lite_result;
        let lite_index = 2n;
        void lite_index;
        while (((lite_index) <= (lite_count))) {
            const lite_name = liteFn$c__literals$comparisonTemp(lite$listAt((lite_kinds), lite_index, 11015), lite_position, lite_index);
            void lite_name;
            const lite_pair = liteFn$c__literals$comparisonPairCode(lite$listAt((lite_operators), lite$subtractInt(lite_index, 1n, 11092), 11086), lite$listAt((lite_kinds), lite$subtractInt(lite_index, 1n, 11110), 11104), lite$listAt((lite_kinds), lite_index, 11122), liteFn$c__literals$comparisonTemp(lite$listAt((lite_kinds), lite$subtractInt(lite_index, 1n, 11157), 11151), lite_position, lite$subtractInt(lite_index, 1n, 11179)), lite_name);
            void lite_pair;
            lite_result = ((lite_result) + (((((((((((((" && (") + (lite_name))) + (" = "))) + (liteFn$c__literals$comparisonValueCode(lite$listAt((lite_kinds), lite_index, 11261), lite$listAt((lite_codes), lite_index, 11275))))) + (", "))) + (lite_pair))) + (")"))));
            lite_index = lite$addInt(lite_index, 1n, 11318);
        }
        return ((lite_result) + (")"));
    }
    void liteFn$c__literals$comparisonChainCode;
    function liteFn$ts__literals$tsScalarType(lite_kind: string): string {
        void lite_kind;
        return (Boolean(liteFn$numeric__literals$isIntKind(lite_kind)) ? "bigint" : (Boolean(((lite_kind) === ("String"))) ? "string" : (Boolean(liteFn$numeric__literals$isFloatKind(lite_kind)) ? "number" : (Boolean(((lite_kind) === ("Bool"))) ? "boolean" : "void"))));
    }
    void liteFn$ts__literals$tsScalarType;
    function liteFn$ts__literals$intLiteralCode(lite_value: bigint, lite_negative: boolean, lite_digits: string): string {
        void lite_value;
        void lite_negative;
        void lite_digits;
        return (Boolean(((lite_value) === (0n))) ? "0n" : (Boolean(lite_negative) ? (((("(-") + (lite_digits))) + ("n)")) : ((lite_digits) + ("n"))));
    }
    void liteFn$ts__literals$intLiteralCode;
    function liteFn$ts__literals$textLiteralCode(lite_value: string): string {
        void lite_value;
        const lite_size = liteFn$lib$core$text$length(lite_value);
        void lite_size;
        let lite_encoded = "\"";
        void lite_encoded;
        let lite_position = 0n;
        void lite_position;
        while (((lite_position) < (lite_size))) {
            const lite_ch = liteFn$lib$core$text$at(lite_value, lite_position);
            void lite_ch;
            if (((lite_ch) === ("\\"))) {
                lite_encoded = ((lite_encoded) + ("\\\\"));
            } else if (((lite_ch) === ("\""))) {
                lite_encoded = ((lite_encoded) + ("\\\""));
            } else if (((lite_ch) === ("\n"))) {
                lite_encoded = ((lite_encoded) + ("\\n"));
            } else if (((lite_ch) === ("\r"))) {
                lite_encoded = ((lite_encoded) + ("\\r"));
            } else if (((lite_ch) === ("\t"))) {
                lite_encoded = ((lite_encoded) + ("\\t"));
            } else {
                lite_encoded = ((lite_encoded) + (lite_ch));
            }
            lite_position = lite$addInt(lite_position, 1n, 1294);
        }
        return ((lite_encoded) + ("\""));
    }
    void liteFn$ts__literals$textLiteralCode;
    function liteFn$ts__literals$floatLiteralCode(lite_digits: string, lite_negative: boolean): string {
        void lite_digits;
        void lite_negative;
        const lite_parsed = (((("Number(") + (liteFn$ts__literals$textLiteralCode(lite_digits)))) + (")"));
        void lite_parsed;
        return (Boolean(lite_negative) ? (((("(-") + (lite_parsed))) + (")")) : lite_parsed);
    }
    void liteFn$ts__literals$floatLiteralCode;
    function liteFn$ts__literals$float32LiteralCode(lite_digits: string, lite_negative: boolean): string {
        void lite_digits;
        void lite_negative;
        const lite_parsed = (((("Math.fround(Number(") + (liteFn$ts__literals$textLiteralCode(lite_digits)))) + ("))"));
        void lite_parsed;
        return (Boolean(lite_negative) ? (((("(-") + (lite_parsed))) + (")")) : lite_parsed);
    }
    void liteFn$ts__literals$float32LiteralCode;
    function liteFn$ts__literals$unitEvaluationCode(lite_code: string): string {
        void lite_code;
        return (((("(void (") + (lite_code))) + ("))"));
    }
    void liteFn$ts__literals$unitEvaluationCode;
    function liteFn$ts__literals$unitLiteralCode(): string {
        return "undefined";
    }
    void liteFn$ts__literals$unitLiteralCode;
    function liteFn$ts__literals$boolLiteralCode(lite_value: boolean): string {
        void lite_value;
        return (Boolean(lite_value) ? "true" : "false");
    }
    void liteFn$ts__literals$boolLiteralCode;
    function liteFn$ts__literals$listCopyCode(lite_code: string): string {
        void lite_code;
        return (((("[...(") + (lite_code))) + (")]"));
    }
    void liteFn$ts__literals$listCopyCode;
    function liteFn$ts__literals$concatCode(lite_left: string, lite_right: string): string {
        void lite_left;
        void lite_right;
        return (((((((("((") + (lite_left))) + (") + ("))) + (lite_right))) + ("))"));
    }
    void liteFn$ts__literals$concatCode;
    function liteFn$ts__literals$notCode(lite_value: string): string {
        void lite_value;
        return (((("(!(") + (lite_value))) + ("))"));
    }
    void liteFn$ts__literals$notCode;
    function liteFn$ts__literals$logicCode(lite_op: string, lite_left: string, lite_right: string): string {
        void lite_op;
        void lite_left;
        void lite_right;
        return (Boolean(((lite_op) === ("and"))) ? (((((((("((") + (lite_left))) + (") && ("))) + (lite_right))) + ("))")) : (((((((("((") + (lite_left))) + (") || ("))) + (lite_right))) + ("))")));
    }
    void liteFn$ts__literals$logicCode;
    function liteFn$ts__literals$comparisonCode(lite_op: string, lite_kind: string, lite_left: string, lite_right: string): string {
        void lite_op;
        void lite_kind;
        void lite_left;
        void lite_right;
        const lite_operator = (Boolean(((lite_op) === ("=="))) ? "===" : (Boolean(((lite_op) === ("=!="))) ? "!==" : (Boolean(((lite_op) === ("<"))) ? "<" : (Boolean(((lite_op) === ("<!"))) ? ">=" : (Boolean(((lite_op) === ("<="))) ? "<=" : (Boolean(((lite_op) === ("<!="))) ? ">" : (Boolean(((lite_op) === (">"))) ? ">" : (Boolean(((lite_op) === (">!"))) ? "<=" : (Boolean(((lite_op) === (">="))) ? ">=" : "<")))))))));
        void lite_operator;
        return (Boolean(((lite_kind) === ("Bool"))) ? (((((((((((("(Boolean(") + (lite_left))) + (") "))) + (lite_operator))) + (" Boolean("))) + (lite_right))) + ("))")) : (((((((((((("((") + (lite_left))) + (") "))) + (lite_operator))) + (" ("))) + (lite_right))) + ("))")));
    }
    void liteFn$ts__literals$comparisonCode;
    function liteFn$ts__literals$floatOperandCode(lite_kind: string, lite_code: string): string {
        void lite_kind;
        void lite_code;
        return (Boolean(liteFn$numeric__literals$isIntKind(lite_kind)) ? (((("Number(") + (lite_code))) + (")")) : lite_code);
    }
    void liteFn$ts__literals$floatOperandCode;
    function liteFn$ts__literals$float32OperandCode(lite_kind: string, lite_code: string): string {
        void lite_kind;
        void lite_code;
        return (Boolean(liteFn$numeric__literals$isIntKind(lite_kind)) ? (((("Math.fround(Number(") + (lite_code))) + ("))")) : (Boolean(((lite_kind) === ("Float"))) ? (((("Math.fround(") + (lite_code))) + (")")) : lite_code));
    }
    void liteFn$ts__literals$float32OperandCode;
    function liteFn$ts__literals$comparisonPairCode(lite_op: string, lite_leftKind: string, lite_rightKind: string, lite_left: string, lite_right: string): string {
        void lite_op;
        void lite_leftKind;
        void lite_rightKind;
        void lite_left;
        void lite_right;
        return (Boolean(((liteFn$numeric__literals$isFloatKind(lite_leftKind)) || (liteFn$numeric__literals$isFloatKind(lite_rightKind)))) ? liteFn$ts__literals$comparisonCode(lite_op, "Float", liteFn$ts__literals$floatOperandCode(lite_leftKind, lite_left), liteFn$ts__literals$floatOperandCode(lite_rightKind, lite_right)) : liteFn$ts__literals$comparisonCode(lite_op, lite_leftKind, lite_left, lite_right));
    }
    void liteFn$ts__literals$comparisonPairCode;
    function liteFn$ts__literals$floatOpTag(lite_op: string): string {
        void lite_op;
        return (Boolean(((lite_op) === ("+"))) ? "0" : (Boolean(((lite_op) === ("-"))) ? "1" : (Boolean(((lite_op) === ("*"))) ? "2" : "3")));
    }
    void liteFn$ts__literals$floatOpTag;
    function liteFn$ts__literals$floatBinaryCode(lite_op: string, lite_left: string, lite_right: string, lite_position: bigint): string {
        void lite_op;
        void lite_left;
        void lite_right;
        void lite_position;
        return (((((((((((((((("lite$floatOp(") + (lite_left))) + (", "))) + (lite_right))) + (", "))) + (liteFn$ts__literals$floatOpTag(lite_op)))) + (", "))) + (liteFn$lib$core$int$intText(lite_position)))) + (")"));
    }
    void liteFn$ts__literals$floatBinaryCode;
    function liteFn$ts__literals$float32BinaryCode(lite_op: string, lite_left: string, lite_right: string, lite_position: bigint): string {
        void lite_op;
        void lite_left;
        void lite_right;
        void lite_position;
        return (((((((((((((((("lite$float32Op(") + (lite_left))) + (", "))) + (lite_right))) + (", "))) + (liteFn$ts__literals$floatOpTag(lite_op)))) + (", "))) + (liteFn$lib$core$int$intText(lite_position)))) + (")"));
    }
    void liteFn$ts__literals$float32BinaryCode;
    function liteFn$ts__literals$floatPowerCode(lite_left: string, lite_right: string, lite_position: bigint): string {
        void lite_left;
        void lite_right;
        void lite_position;
        return (((((((((((("lite$floatPower(") + (lite_left))) + (", "))) + (lite_right))) + (", "))) + (liteFn$lib$core$int$intText(lite_position)))) + (")"));
    }
    void liteFn$ts__literals$floatPowerCode;
    function liteFn$ts__literals$floorDivCode(lite_left: string, lite_right: string): string {
        void lite_left;
        void lite_right;
        return (((((((((((((((((((((((((((("(") + (lite_left))) + (" / "))) + (lite_right))) + (" - (((("))) + (lite_left))) + (" % "))) + (lite_right))) + (") != 0n) && ((("))) + (lite_left))) + (" % "))) + (lite_right))) + (") < 0n) != ("))) + (lite_right))) + (" < 0n))) ? 1n : 0n))"));
    }
    void liteFn$ts__literals$floorDivCode;
    function liteFn$ts__literals$floorModCode(lite_left: string, lite_right: string): string {
        void lite_left;
        void lite_right;
        return (((((((((((((((((((((((((((((((("(") + (lite_left))) + (" % "))) + (lite_right))) + (" + (((("))) + (lite_left))) + (" % "))) + (lite_right))) + (") != 0n) && ((("))) + (lite_left))) + (" % "))) + (lite_right))) + (") < 0n) != ("))) + (lite_right))) + (" < 0n))) ? "))) + (lite_right))) + (" : 0n))"));
    }
    void liteFn$ts__literals$floorModCode;
    function liteFn$ts__literals$intDivideCode(lite_left: string, lite_right: string, lite_position: bigint): string {
        void lite_left;
        void lite_right;
        void lite_position;
        return (((((((((((("lite$divideInt(") + (lite_left))) + (", "))) + (lite_right))) + (", "))) + (liteFn$lib$core$int$intText(lite_position)))) + (")"));
    }
    void liteFn$ts__literals$intDivideCode;
    function liteFn$ts__literals$intRemainderCode(lite_left: string, lite_right: string, lite_position: bigint): string {
        void lite_left;
        void lite_right;
        void lite_position;
        return (((((((((((("lite$remainderInt(") + (lite_left))) + (", "))) + (lite_right))) + (", "))) + (liteFn$lib$core$int$intText(lite_position)))) + (")"));
    }
    void liteFn$ts__literals$intRemainderCode;
    function liteFn$ts__literals$intFloorDivideCode(lite_left: string, lite_right: string, lite_position: bigint): string {
        void lite_left;
        void lite_right;
        void lite_position;
        return (((((((((((("lite$floorDivideInt(") + (lite_left))) + (", "))) + (lite_right))) + (", "))) + (liteFn$lib$core$int$intText(lite_position)))) + (")"));
    }
    void liteFn$ts__literals$intFloorDivideCode;
    function liteFn$ts__literals$intFloorModuloCode(lite_left: string, lite_right: string, lite_position: bigint): string {
        void lite_left;
        void lite_right;
        void lite_position;
        return (((((((((((("lite$floorModuloInt(") + (lite_left))) + (", "))) + (lite_right))) + (", "))) + (liteFn$lib$core$int$intText(lite_position)))) + (")"));
    }
    void liteFn$ts__literals$intFloorModuloCode;
    function liteFn$ts__literals$intAddCode(lite_left: string, lite_right: string, lite_position: bigint): string {
        void lite_left;
        void lite_right;
        void lite_position;
        return (((((((((((("lite$addInt(") + (lite_left))) + (", "))) + (lite_right))) + (", "))) + (liteFn$lib$core$int$intText(lite_position)))) + (")"));
    }
    void liteFn$ts__literals$intAddCode;
    function liteFn$ts__literals$intSubtractCode(lite_left: string, lite_right: string, lite_position: bigint): string {
        void lite_left;
        void lite_right;
        void lite_position;
        return (((((((((((("lite$subtractInt(") + (lite_left))) + (", "))) + (lite_right))) + (", "))) + (liteFn$lib$core$int$intText(lite_position)))) + (")"));
    }
    void liteFn$ts__literals$intSubtractCode;
    function liteFn$ts__literals$intMultiplyCode(lite_left: string, lite_right: string, lite_position: bigint): string {
        void lite_left;
        void lite_right;
        void lite_position;
        return (((((((((((("lite$multiplyInt(") + (lite_left))) + (", "))) + (lite_right))) + (", "))) + (liteFn$lib$core$int$intText(lite_position)))) + (")"));
    }
    void liteFn$ts__literals$intMultiplyCode;
    function liteFn$ts__literals$intNegateCode(lite_value: string, lite_position: bigint): string {
        void lite_value;
        void lite_position;
        return (((((((("lite$negateInt(") + (lite_value))) + (", "))) + (liteFn$lib$core$int$intText(lite_position)))) + (")"));
    }
    void liteFn$ts__literals$intNegateCode;
    function liteFn$ts__literals$checkedNarrowIntCode(lite_kind: string, lite_value: string, lite_position: bigint): string {
        void lite_kind;
        void lite_value;
        void lite_position;
        return (((((((((((((((("lite$checkedNarrowInt(") + (lite_value))) + (", "))) + (liteFn$lib$core$int$intText(liteFn$numeric__literals$narrowIntBits(lite_kind))))) + ("n, "))) + (liteFn$ts__literals$textLiteralCode(lite_kind)))) + (", "))) + (liteFn$lib$core$int$intText(lite_position)))) + (")"));
    }
    void liteFn$ts__literals$checkedNarrowIntCode;
    function liteFn$ts__literals$comparisonChainCode(lite_codes: string[], lite_kinds: string[], lite_operators: string[], lite_count: bigint, lite_position: bigint): string {
        void lite_codes;
        void lite_kinds;
        void lite_operators;
        void lite_count;
        void lite_position;
        let lite_result = "((): boolean => { ";
        void lite_result;
        let lite_index = 0n;
        void lite_index;
        while (((lite_index) <= (lite_count))) {
            const lite_name = (("lite$compare") + (liteFn$lib$core$int$intText(lite_index)));
            void lite_name;
            lite_result = ((lite_result) + ((((((((((((("const ") + (lite_name))) + (": "))) + (liteFn$ts__literals$tsScalarType(lite$listAt((lite_kinds), lite_index, 9374))))) + (" = "))) + (lite$listAt((lite_codes), lite_index, 9398)))) + ("; "))));
            if (((lite_index) > (0n))) {
                const lite_pair = liteFn$ts__literals$comparisonPairCode(lite$listAt((lite_operators), lite$subtractInt(lite_index, 1n, 9491), 9485), lite$listAt((lite_kinds), lite$subtractInt(lite_index, 1n, 9509), 9503), lite$listAt((lite_kinds), lite_index, 9521), (("lite$compare") + (liteFn$lib$core$int$intText(lite$subtractInt(lite_index, 1n, 9568)))), lite_name);
                void lite_pair;
                if (((lite_index) < (lite_count))) {
                    lite_result = ((lite_result) + ((((("if (!(") + (lite_pair))) + (")) return false; "))));
                } else {
                    lite_result = ((lite_result) + ((((("return ") + (lite_pair))) + ("; "))));
                }
            }
            lite_index = lite$addInt(lite_index, 1n, 9743);
        }
        return ((lite_result) + ("})()"));
    }
    void liteFn$ts__literals$comparisonChainCode;
    function liteFn$frontend$targetBoolLiteralCode(lite_target: string, lite_value: boolean): string {
        void lite_target;
        void lite_value;
        return (Boolean(((lite_target) === ("ts"))) ? liteFn$ts__literals$boolLiteralCode(lite_value) : liteFn$c__literals$boolLiteralCode(lite_value));
    }
    void liteFn$frontend$targetBoolLiteralCode;
    function liteFn$frontend$targetComparisonChainCode(lite_target: string, lite_codes: string[], lite_kinds: string[], lite_operators: string[], lite_count: bigint, lite_position: bigint): string {
        void lite_target;
        void lite_codes;
        void lite_kinds;
        void lite_operators;
        void lite_count;
        void lite_position;
        return (Boolean(((lite_target) === ("ts"))) ? liteFn$ts__literals$comparisonChainCode([...(lite_codes)], [...(lite_kinds)], [...(lite_operators)], lite_count, lite_position) : liteFn$c__literals$comparisonChainCode([...(lite_codes)], [...(lite_kinds)], [...(lite_operators)], lite_count, lite_position));
    }
    void liteFn$frontend$targetComparisonChainCode;
    function liteFn$frontend$targetComparisonCode(lite_target: string, lite_op: string, lite_kind: string, lite_left: string, lite_right: string): string {
        void lite_target;
        void lite_op;
        void lite_kind;
        void lite_left;
        void lite_right;
        return (Boolean(((lite_target) === ("ts"))) ? liteFn$ts__literals$comparisonCode(lite_op, lite_kind, lite_left, lite_right) : liteFn$c__literals$comparisonCode(lite_op, lite_kind, lite_left, lite_right));
    }
    void liteFn$frontend$targetComparisonCode;
    function liteFn$frontend$targetConcatCode(lite_target: string, lite_left: string, lite_right: string): string {
        void lite_target;
        void lite_left;
        void lite_right;
        return (Boolean(((lite_target) === ("ts"))) ? liteFn$ts__literals$concatCode(lite_left, lite_right) : liteFn$c__literals$concatCode(lite_left, lite_right));
    }
    void liteFn$frontend$targetConcatCode;
    function liteFn$frontend$targetFloatBinaryCode(lite_target: string, lite_op: string, lite_left: string, lite_right: string, lite_position: bigint): string {
        void lite_target;
        void lite_op;
        void lite_left;
        void lite_right;
        void lite_position;
        return (Boolean(((lite_target) === ("ts"))) ? liteFn$ts__literals$floatBinaryCode(lite_op, lite_left, lite_right, lite_position) : liteFn$c__literals$floatBinaryCode(lite_op, lite_left, lite_right, lite_position));
    }
    void liteFn$frontend$targetFloatBinaryCode;
    function liteFn$frontend$targetFloat32BinaryCode(lite_target: string, lite_op: string, lite_left: string, lite_right: string, lite_position: bigint): string {
        void lite_target;
        void lite_op;
        void lite_left;
        void lite_right;
        void lite_position;
        return (Boolean(((lite_target) === ("ts"))) ? liteFn$ts__literals$float32BinaryCode(lite_op, lite_left, lite_right, lite_position) : liteFn$c__literals$float32BinaryCode(lite_op, lite_left, lite_right, lite_position));
    }
    void liteFn$frontend$targetFloat32BinaryCode;
    function liteFn$frontend$targetFloatLiteralCode(lite_target: string, lite_digits: string, lite_negative: boolean): string {
        void lite_target;
        void lite_digits;
        void lite_negative;
        return (Boolean(((lite_target) === ("ts"))) ? liteFn$ts__literals$floatLiteralCode(lite_digits, lite_negative) : liteFn$c__literals$floatLiteralCode(lite_digits, lite_negative));
    }
    void liteFn$frontend$targetFloatLiteralCode;
    function liteFn$frontend$targetFloat32LiteralCode(lite_target: string, lite_digits: string, lite_negative: boolean): string {
        void lite_target;
        void lite_digits;
        void lite_negative;
        return (Boolean(((lite_target) === ("ts"))) ? liteFn$ts__literals$float32LiteralCode(lite_digits, lite_negative) : liteFn$c__literals$float32LiteralCode(lite_digits, lite_negative));
    }
    void liteFn$frontend$targetFloat32LiteralCode;
    function liteFn$frontend$targetFloatOperandCode(lite_target: string, lite_kind: string, lite_code: string): string {
        void lite_target;
        void lite_kind;
        void lite_code;
        return (Boolean(((lite_target) === ("ts"))) ? liteFn$ts__literals$floatOperandCode(lite_kind, lite_code) : liteFn$c__literals$floatOperandCode(lite_kind, lite_code));
    }
    void liteFn$frontend$targetFloatOperandCode;
    function liteFn$frontend$targetFloat32OperandCode(lite_target: string, lite_kind: string, lite_code: string): string {
        void lite_target;
        void lite_kind;
        void lite_code;
        return (Boolean(((lite_target) === ("ts"))) ? liteFn$ts__literals$float32OperandCode(lite_kind, lite_code) : liteFn$c__literals$float32OperandCode(lite_kind, lite_code));
    }
    void liteFn$frontend$targetFloat32OperandCode;
    function liteFn$frontend$targetCheckedNarrowIntCode(lite_target: string, lite_kind: string, lite_value: string, lite_position: bigint): string {
        void lite_target;
        void lite_kind;
        void lite_value;
        void lite_position;
        return (Boolean(((lite_target) === ("ts"))) ? liteFn$ts__literals$checkedNarrowIntCode(lite_kind, lite_value, lite_position) : liteFn$c__literals$checkedNarrowIntCode(lite_kind, lite_value, lite_position));
    }
    void liteFn$frontend$targetCheckedNarrowIntCode;
    function liteFn$frontend$isIntScalarKind(lite_kind: string): boolean {
        void lite_kind;
        return liteFn$numeric__literals$isIntKind(lite_kind);
    }
    void liteFn$frontend$isIntScalarKind;
    function liteFn$frontend$isFloatScalarKind(lite_kind: string): boolean {
        void lite_kind;
        return liteFn$numeric__literals$isFloatKind(lite_kind);
    }
    void liteFn$frontend$isFloatScalarKind;
    function liteFn$frontend$targetFloatPowerCode(lite_target: string, lite_left: string, lite_right: string, lite_position: bigint): string {
        void lite_target;
        void lite_left;
        void lite_right;
        void lite_position;
        return (Boolean(((lite_target) === ("ts"))) ? liteFn$ts__literals$floatPowerCode(lite_left, lite_right, lite_position) : liteFn$c__literals$floatPowerCode(lite_left, lite_right, lite_position));
    }
    void liteFn$frontend$targetFloatPowerCode;
    function liteFn$frontend$targetFloorDivCode(lite_target: string, lite_left: string, lite_right: string): string {
        void lite_target;
        void lite_left;
        void lite_right;
        return (Boolean(((lite_target) === ("ts"))) ? liteFn$ts__literals$floorDivCode(lite_left, lite_right) : liteFn$c__literals$floorDivCode(lite_left, lite_right));
    }
    void liteFn$frontend$targetFloorDivCode;
    function liteFn$frontend$targetFloorModCode(lite_target: string, lite_left: string, lite_right: string): string {
        void lite_target;
        void lite_left;
        void lite_right;
        return (Boolean(((lite_target) === ("ts"))) ? liteFn$ts__literals$floorModCode(lite_left, lite_right) : liteFn$c__literals$floorModCode(lite_left, lite_right));
    }
    void liteFn$frontend$targetFloorModCode;
    function liteFn$frontend$targetIntAddCode(lite_target: string, lite_left: string, lite_right: string, lite_position: bigint): string {
        void lite_target;
        void lite_left;
        void lite_right;
        void lite_position;
        return (Boolean(((lite_target) === ("ts"))) ? liteFn$ts__literals$intAddCode(lite_left, lite_right, lite_position) : liteFn$c__literals$intAddCode(lite_left, lite_right, lite_position));
    }
    void liteFn$frontend$targetIntAddCode;
    function liteFn$frontend$targetIntDivideCode(lite_target: string, lite_left: string, lite_right: string, lite_position: bigint): string {
        void lite_target;
        void lite_left;
        void lite_right;
        void lite_position;
        return (Boolean(((lite_target) === ("ts"))) ? liteFn$ts__literals$intDivideCode(lite_left, lite_right, lite_position) : liteFn$c__literals$intDivideCode(lite_left, lite_right, lite_position));
    }
    void liteFn$frontend$targetIntDivideCode;
    function liteFn$frontend$targetIntFloorDivideCode(lite_target: string, lite_left: string, lite_right: string, lite_position: bigint): string {
        void lite_target;
        void lite_left;
        void lite_right;
        void lite_position;
        return (Boolean(((lite_target) === ("ts"))) ? liteFn$ts__literals$intFloorDivideCode(lite_left, lite_right, lite_position) : liteFn$c__literals$intFloorDivideCode(lite_left, lite_right, lite_position));
    }
    void liteFn$frontend$targetIntFloorDivideCode;
    function liteFn$frontend$targetIntFloorModuloCode(lite_target: string, lite_left: string, lite_right: string, lite_position: bigint): string {
        void lite_target;
        void lite_left;
        void lite_right;
        void lite_position;
        return (Boolean(((lite_target) === ("ts"))) ? liteFn$ts__literals$intFloorModuloCode(lite_left, lite_right, lite_position) : liteFn$c__literals$intFloorModuloCode(lite_left, lite_right, lite_position));
    }
    void liteFn$frontend$targetIntFloorModuloCode;
    function liteFn$frontend$targetIntLiteralCode(lite_target: string, lite_value: bigint, lite_negative: boolean, lite_digits: string): string {
        void lite_target;
        void lite_value;
        void lite_negative;
        void lite_digits;
        return (Boolean(((lite_target) === ("ts"))) ? liteFn$ts__literals$intLiteralCode(lite_value, lite_negative, lite_digits) : liteFn$c__literals$intLiteralCode(lite_value, lite_negative, lite_digits));
    }
    void liteFn$frontend$targetIntLiteralCode;
    function liteFn$frontend$targetIntMultiplyCode(lite_target: string, lite_left: string, lite_right: string, lite_position: bigint): string {
        void lite_target;
        void lite_left;
        void lite_right;
        void lite_position;
        return (Boolean(((lite_target) === ("ts"))) ? liteFn$ts__literals$intMultiplyCode(lite_left, lite_right, lite_position) : liteFn$c__literals$intMultiplyCode(lite_left, lite_right, lite_position));
    }
    void liteFn$frontend$targetIntMultiplyCode;
    function liteFn$frontend$targetIntNegateCode(lite_target: string, lite_value: string, lite_position: bigint): string {
        void lite_target;
        void lite_value;
        void lite_position;
        return (Boolean(((lite_target) === ("ts"))) ? liteFn$ts__literals$intNegateCode(lite_value, lite_position) : liteFn$c__literals$intNegateCode(lite_value, lite_position));
    }
    void liteFn$frontend$targetIntNegateCode;
    function liteFn$frontend$targetIntRemainderCode(lite_target: string, lite_left: string, lite_right: string, lite_position: bigint): string {
        void lite_target;
        void lite_left;
        void lite_right;
        void lite_position;
        return (Boolean(((lite_target) === ("ts"))) ? liteFn$ts__literals$intRemainderCode(lite_left, lite_right, lite_position) : liteFn$c__literals$intRemainderCode(lite_left, lite_right, lite_position));
    }
    void liteFn$frontend$targetIntRemainderCode;
    function liteFn$frontend$targetIntSubtractCode(lite_target: string, lite_left: string, lite_right: string, lite_position: bigint): string {
        void lite_target;
        void lite_left;
        void lite_right;
        void lite_position;
        return (Boolean(((lite_target) === ("ts"))) ? liteFn$ts__literals$intSubtractCode(lite_left, lite_right, lite_position) : liteFn$c__literals$intSubtractCode(lite_left, lite_right, lite_position));
    }
    void liteFn$frontend$targetIntSubtractCode;
    function liteFn$frontend$targetListCopyCode(lite_target: string, lite_code: string): string {
        void lite_target;
        void lite_code;
        return (Boolean(((lite_target) === ("ts"))) ? liteFn$ts__literals$listCopyCode(lite_code) : liteFn$c__literals$listCopyCode(lite_code));
    }
    void liteFn$frontend$targetListCopyCode;
    function liteFn$frontend$targetLogicCode(lite_target: string, lite_op: string, lite_left: string, lite_right: string): string {
        void lite_target;
        void lite_op;
        void lite_left;
        void lite_right;
        return (Boolean(((lite_target) === ("ts"))) ? liteFn$ts__literals$logicCode(lite_op, lite_left, lite_right) : liteFn$c__literals$logicCode(lite_op, lite_left, lite_right));
    }
    void liteFn$frontend$targetLogicCode;
    function liteFn$frontend$targetNotCode(lite_target: string, lite_value: string): string {
        void lite_target;
        void lite_value;
        return (Boolean(((lite_target) === ("ts"))) ? liteFn$ts__literals$notCode(lite_value) : liteFn$c__literals$notCode(lite_value));
    }
    void liteFn$frontend$targetNotCode;
    function liteFn$frontend$targetTextLiteralCode(lite_target: string, lite_value: string): string {
        void lite_target;
        void lite_value;
        return (Boolean(((lite_target) === ("ts"))) ? liteFn$ts__literals$textLiteralCode(lite_value) : liteFn$c__literals$textLiteralCode(lite_value));
    }
    void liteFn$frontend$targetTextLiteralCode;
    function liteFn$frontend$targetUnitEvaluationCode(lite_target: string, lite_code: string): string {
        void lite_target;
        void lite_code;
        return (Boolean(((lite_target) === ("ts"))) ? liteFn$ts__literals$unitEvaluationCode(lite_code) : liteFn$c__literals$unitEvaluationCode(lite_code));
    }
    void liteFn$frontend$targetUnitEvaluationCode;
    function liteFn$frontend$targetUnitLiteralCode(lite_target: string): string {
        void lite_target;
        return (Boolean(((lite_target) === ("ts"))) ? liteFn$ts__literals$unitLiteralCode() : liteFn$c__literals$unitLiteralCode());
    }
    void liteFn$frontend$targetUnitLiteralCode;
    function liteFn$frontend$failAt(lite_source: string, lite_position: bigint, lite_prefix: string, lite_message: string): void {
        void lite_source;
        void lite_position;
        void lite_prefix;
        void lite_message;
        const lite_place = liteFn$lib$core$source$lineColumn(lite_source, lite_position);
        void lite_place;
        return (void (liteFn$lib$core$diag$fail(lite_prefix, ((((((((liteFn$lib$core$format$decimalText((lite_place).line)) + (":"))) + (liteFn$lib$core$format$decimalText((lite_place).column)))) + (": "))) + (lite_message)))));
    }
    void liteFn$frontend$failAt;
    function liteFn$frontend$expectSymbol(lite_source: string, lite_position: bigint, lite_symbol: string, lite_prefix: string): bigint {
        void lite_source;
        void lite_position;
        void lite_symbol;
        void lite_prefix;
        if (((((lite_position) >= (liteFn$lib$core$text$length(lite_source)))) || (((liteFn$lib$core$text$at(lite_source, lite_position)) !== (lite_symbol))))) {
            liteFn$frontend$failAt(lite_source, lite_position, lite_prefix, (("expected ") + (lite_symbol)));
        }
        return lite$addInt(lite_position, 1n, 12882);
    }
    void liteFn$frontend$expectSymbol;
    function liteFn$frontend$rawFenceLength(lite_source: string, lite_position: bigint): bigint {
        void lite_source;
        void lite_position;
        if ((!(liteFn$lib$core$text$startsWithAt(lite_source, lite_position, "/*")))) {
            return 0n;
        }
        let lite_index = lite$addInt(lite_position, 2n, 13144);
        void lite_index;
        let lite_count = 0n;
        void lite_count;
        while (((((lite_index) < (liteFn$lib$core$text$length(lite_source)))) && (((liteFn$lib$core$text$at(lite_source, lite_index)) === ("#"))))) {
            lite_count = lite$addInt(lite_count, 1n, 13270);
            lite_index = lite$addInt(lite_index, 1n, 13297);
        }
        return lite_count;
    }
    void liteFn$frontend$rawFenceLength;
    function liteFn$frontend$skipRawComment(lite_source: string, lite_position: bigint, lite_fence: bigint, lite_prefix: string): bigint {
        void lite_source;
        void lite_position;
        void lite_fence;
        void lite_prefix;
        const lite_size = liteFn$lib$core$text$length(lite_source);
        void lite_size;
        let lite_cursor = lite$addInt(lite$addInt(lite_position, 2n, 13605), lite_fence, 13609);
        void lite_cursor;
        while (((lite_cursor) < (lite_size))) {
            if (((liteFn$lib$core$text$at(lite_source, lite_cursor)) === ("#"))) {
                const lite_runStart = lite_cursor;
                void lite_runStart;
                let lite_runEnd = lite_cursor;
                void lite_runEnd;
                while (((((lite_runEnd) < (lite_size))) && (((liteFn$lib$core$text$at(lite_source, lite_runEnd)) === ("#"))))) {
                    lite_runEnd = lite$addInt(lite_runEnd, 1n, 13843);
                }
                if (((((lite$subtractInt(lite_runEnd, lite_runStart, 13872)) === (lite_fence))) && (liteFn$lib$core$text$startsWithAt(lite_source, lite_runEnd, "*/")))) {
                    return lite$addInt(lite_runEnd, 2n, 13971);
                }
                lite_cursor = lite_runEnd;
            } else {
                lite_cursor = lite$addInt(lite_cursor, 1n, 14064);
            }
        }
        liteFn$frontend$failAt(lite_source, lite_position, lite_prefix, "unterminated raw comment");
        return lite_size;
    }
    void liteFn$frontend$skipRawComment;
    function liteFn$frontend$skipComment(lite_source: string, lite_position: bigint, lite_prefix: string): bigint {
        void lite_source;
        void lite_position;
        void lite_prefix;
        const lite_size = liteFn$lib$core$text$length(lite_source);
        void lite_size;
        const lite_fence = liteFn$frontend$rawFenceLength(lite_source, lite_position);
        void lite_fence;
        if (((lite_fence) > (0n))) {
            return liteFn$frontend$skipRawComment(lite_source, lite_position, lite_fence, lite_prefix);
        }
        let lite_cursor = lite$addInt(lite_position, 2n, 14531);
        void lite_cursor;
        let lite_depth = 1n;
        void lite_depth;
        while (Boolean(true)) {
            if (((lite_cursor) >= (lite_size))) {
                liteFn$frontend$failAt(lite_source, lite_position, lite_prefix, "unterminated comment");
            }
            if (liteFn$lib$core$text$startsWithAt(lite_source, lite_cursor, "/*")) {
                const lite_innerFence = liteFn$frontend$rawFenceLength(lite_source, lite_cursor);
                void lite_innerFence;
                if (((lite_innerFence) > (0n))) {
                    lite_cursor = liteFn$frontend$skipRawComment(lite_source, lite_cursor, lite_innerFence, lite_prefix);
                } else {
                    lite_depth = lite$addInt(lite_depth, 1n, 14954);
                    lite_cursor = lite$addInt(lite_cursor, 2n, 14991);
                }
            } else if (liteFn$lib$core$text$startsWithAt(lite_source, lite_cursor, "*/")) {
                lite_depth = lite$subtractInt(lite_depth, 1n, 15099);
                lite_cursor = lite$addInt(lite_cursor, 2n, 15132);
                if (((lite_depth) === (0n))) {
                    return lite_cursor;
                }
            } else {
                lite_cursor = lite$addInt(lite_cursor, 1n, 15227);
            }
        }
        return lite_size;
    }
    void liteFn$frontend$skipComment;
    function liteFn$frontend$skipTrivia(lite_source: string, lite_start: bigint, lite_prefix: string): bigint {
        void lite_source;
        void lite_start;
        void lite_prefix;
        const lite_size = liteFn$lib$core$text$length(lite_source);
        void lite_size;
        let lite_position = lite_start;
        void lite_position;
        while (((lite_position) < (lite_size))) {
            const lite_ch = liteFn$lib$core$text$at(lite_source, lite_position);
            void lite_ch;
            if (((((((((lite_ch) === (" "))) || (((lite_ch) === ("\t"))))) || (((lite_ch) === ("\r"))))) || (((lite_ch) === ("\n"))))) {
                lite_position = lite$addInt(lite_position, 1n, 15700);
            } else if (liteFn$lib$core$text$startsWithAt(lite_source, lite_position, "/*")) {
                lite_position = liteFn$frontend$skipComment(lite_source, lite_position, lite_prefix);
            } else {
                break;
            }
        }
        return lite_position;
    }
    void liteFn$frontend$skipTrivia;
    function liteFn$frontend$consumeStatementEnd(lite_source: string, lite_position: bigint, lite_prefix: string): bigint {
        void lite_source;
        void lite_position;
        void lite_prefix;
        const lite_next = liteFn$frontend$skipTrivia(lite_source, lite_position, lite_prefix);
        void lite_next;
        if (((((lite_next) < (liteFn$lib$core$text$length(lite_source)))) && (((liteFn$lib$core$text$at(lite_source, lite_next)) === (";"))))) {
            return liteFn$frontend$skipTrivia(lite_source, lite$addInt(lite_next, 1n, 16316), lite_prefix);
        }
        if (((((((lite_next) === (liteFn$lib$core$text$length(lite_source)))) || (((liteFn$lib$core$text$at(lite_source, lite_next)) === ("}"))))) || ((((((lite_position) > (0n))) && (((liteFn$lib$core$text$at(lite_source, lite$subtractInt(lite_position, 1n, 16462))) === ("}")))))))) {
            return lite_next;
        }
        return (-1n);
    }
    void liteFn$frontend$consumeStatementEnd;
    function liteFn$frontend$isReservedWord(lite_name: string): boolean {
        void lite_name;
        return ((((((((((((((((((((((((((((((((((((((((((((lite_name) === ("pub"))) || (((lite_name) === ("var"))))) || (((lite_name) === ("mut"))))) || (((lite_name) === ("fn"))))) || (((lite_name) === ("loop"))))) || (((lite_name) === ("break"))))) || (((lite_name) === ("continue"))))) || (((lite_name) === ("return"))))) || (((lite_name) === ("if"))))) || (((lite_name) === ("else"))))) || (((lite_name) === ("then"))))) || (((lite_name) === ("finally"))))) || (((lite_name) === ("match"))))) || (((lite_name) === ("import"))))) || (((lite_name) === ("using"))))) || (((lite_name) === ("record"))))) || (((lite_name) === ("type"))))) || (((lite_name) === ("and"))))) || (((lite_name) === ("or"))))) || (((lite_name) === ("not"))))) || (((lite_name) === ("true"))))) || (((lite_name) === ("false"))));
    }
    void liteFn$frontend$isReservedWord;
    function liteFn$frontend$featureDoc(lite_name: string): string {
        void lite_name;
        return (Boolean(((lite_name) === ("loop"))) ? "docs/loops.md" : (Boolean(((((((((((((((lite_name) === ("if"))) || (((lite_name) === ("else"))))) || (((lite_name) === ("and"))))) || (((lite_name) === ("or"))))) || (((lite_name) === ("not"))))) || (((lite_name) === ("true"))))) || (((lite_name) === ("false"))))) ? "docs/conditionals.md" : (Boolean(((((lite_name) === ("var"))) || (((lite_name) === ("mut"))))) ? "docs/declarations-and-assignment.md" : (Boolean(((((lite_name) === ("fn"))) || (((lite_name) === ("return"))))) ? "docs/functions.md" : (Boolean(((lite_name) === ("match"))) ? "docs/match.md" : (Boolean(((((((lite_name) === ("pub"))) || (((lite_name) === ("import"))))) || (((lite_name) === ("using"))))) ? "docs/modules-and-packages.md" : (Boolean(((((lite_name) === ("record"))) || (((lite_name) === ("type"))))) ? "docs/types-and-inference.md" : (Boolean(((((lite_name) === ("break"))) || (((lite_name) === ("continue"))))) ? "docs/control-flow.md" : (Boolean(((((lite_name) === ("then"))) || (((lite_name) === ("finally"))))) ? "docs/finally.md" : "docs/grammar-sketch.md")))))))));
    }
    void liteFn$frontend$featureDoc;
    function liteFn$frontend$unsupportedFeature(lite_source: string, lite_position: bigint, lite_name: string, lite_prefix: string): void {
        void lite_source;
        void lite_position;
        void lite_name;
        void lite_prefix;
        return (void (liteFn$frontend$failAt(lite_source, lite_position, lite_prefix, (((((((("unsupported feature \"") + (lite_name))) + ("\": see "))) + (liteFn$frontend$featureDoc(lite_name)))) + ("; the restricted compiler accepts Int/Float/String/Bool expressions, locals, output/outputLine, if/else and loop only")))));
    }
    void liteFn$frontend$unsupportedFeature;
    function liteFn$frontend$findFunction(lite_functions: { name: string; runtime: string; result: string; first: bigint; count: bigint }[], lite_name: string): bigint {
        void lite_functions;
        void lite_name;
        let lite_index = 0n;
        void lite_index;
        for (const lite_entry of [...(lite_functions)]) {
            void lite_entry;
            if ((((lite_entry).name) === (lite_name))) {
                return lite_index;
            }
            lite_index = lite$addInt(lite_index, 1n, 18661);
        }
        return (-1n);
    }
    void liteFn$frontend$findFunction;
    function liteFn$frontend$isUnsupportedAliasTarget(lite_name: string): boolean {
        void lite_name;
        return ((((((((((((((((lite_name) === ("List"))) || (((lite_name) === ("Float"))))) || (((lite_name) === ("Double"))))) || (((lite_name) === ("Array"))))) || (((lite_name) === ("Option"))))) || (((lite_name) === ("Result"))))) || (((lite_name) === ("record"))))) || (((lite_name) === ("fn"))));
    }
    void liteFn$frontend$isUnsupportedAliasTarget;
    function liteFn$frontend$unsupportedAliasTarget(lite_source: string, lite_position: bigint, lite_prefix: string, lite_target: string): void {
        void lite_source;
        void lite_position;
        void lite_prefix;
        void lite_target;
        return (void (liteFn$frontend$failAt(lite_source, lite_position, lite_prefix, (((("unsupported type alias ") + (lite_target))) + ("; only Int, Float, String, Bool, Unit, List<T>, flat named tuples and aliases are supported")))));
    }
    void liteFn$frontend$unsupportedAliasTarget;
    function liteFn$frontend$findAlias(lite_aliases: { name: string; target: string; at: bigint; end: bigint }[], lite_name: string): bigint {
        void lite_aliases;
        void lite_name;
        let lite_index = 0n;
        void lite_index;
        for (const lite_alias of [...(lite_aliases)]) {
            void lite_alias;
            if ((((lite_alias).name) === (lite_name))) {
                return lite_index;
            }
            lite_index = lite$addInt(lite_index, 1n, 19667);
        }
        return (-1n);
    }
    void liteFn$frontend$findAlias;
    function liteFn$frontend$typeNameAt(lite_source: string, lite_position: bigint, lite_prefix: string): { name: string; next: bigint } {
        void lite_source;
        void lite_position;
        void lite_prefix;
        const lite_firstEnd = liteFn$lib$core$text$skipName(lite_source, lite_position);
        void lite_firstEnd;
        const lite_first = liteFn$lib$core$text$slice(lite_source, lite_position, lite_firstEnd);
        void lite_first;
        const lite_afterFirst = liteFn$frontend$skipTrivia(lite_source, lite_firstEnd, lite_prefix);
        void lite_afterFirst;
        if (((((lite_afterFirst) < (liteFn$lib$core$text$length(lite_source)))) && (((liteFn$lib$core$text$at(lite_source, lite_afterFirst)) === ("."))))) {
            const lite_memberStart = liteFn$frontend$skipTrivia(lite_source, lite$addInt(lite_afterFirst, 1n, 20139), lite_prefix);
            void lite_memberStart;
            if (((((lite_memberStart) >= (liteFn$lib$core$text$length(lite_source)))) || ((!(liteFn$lib$core$text$isNameStart(liteFn$lib$core$text$at(lite_source, lite_memberStart))))))) {
                liteFn$frontend$failAt(lite_source, lite_memberStart, lite_prefix, "expected a type name after .");
            }
            const lite_memberEnd = liteFn$lib$core$text$skipName(lite_source, lite_memberStart);
            void lite_memberEnd;
            const lite_member = liteFn$lib$core$text$slice(lite_source, lite_memberStart, lite_memberEnd);
            void lite_member;
            return { name: ((((lite_first) + ("."))) + (lite_member)), next: lite_memberEnd };
        }
        return { name: lite_first, next: lite_firstEnd };
    }
    void liteFn$frontend$typeNameAt;
    function liteFn$frontend$aliasIndexAt(lite_aliases: { name: string; target: string; at: bigint; end: bigint }[], lite_position: bigint): bigint {
        void lite_aliases;
        void lite_position;
        let lite_index = 0n;
        void lite_index;
        for (const lite_alias of [...(lite_aliases)]) {
            void lite_alias;
            if ((((lite_alias).at) === (lite_position))) {
                return lite_index;
            }
            lite_index = lite$addInt(lite_index, 1n, 20857);
        }
        return (-1n);
    }
    void liteFn$frontend$aliasIndexAt;
    function liteFn$frontend$isTupleKind(lite_kind: string): boolean {
        void lite_kind;
        return ((((liteFn$lib$core$text$length(lite_kind)) > (0n))) && (((liteFn$lib$core$text$at(lite_kind, 0n)) === ("("))));
    }
    void liteFn$frontend$isTupleKind;
    function liteFn$frontend$tupleRuntimeProp(lite_label: string, lite_index: bigint): string {
        void lite_label;
        void lite_index;
        return (Boolean(((lite_label) === (""))) ? (("_") + (liteFn$lib$core$int$intText(lite_index))) : lite_label);
    }
    void liteFn$frontend$tupleRuntimeProp;
    function liteFn$frontend$tupleObjectKey(lite_label: string, lite_index: bigint): string {
        void lite_label;
        void lite_index;
        return (Boolean(((lite_label) === (""))) ? (("_") + (liteFn$lib$core$int$intText(lite_index))) : (Boolean(((lite_label) === ("__proto__"))) ? "[\"__proto__\"]" : lite_label));
    }
    void liteFn$frontend$tupleObjectKey;
    function liteFn$frontend$tupleComponentCount(lite_kind: string): bigint {
        void lite_kind;
        if ((!(liteFn$frontend$isTupleKind(lite_kind)))) {
            return 0n;
        }
        const lite_size = liteFn$lib$core$text$length(lite_kind);
        void lite_size;
        let lite_cursor = 1n;
        void lite_cursor;
        let lite_count = 0n;
        void lite_count;
        while (((((lite_cursor) < (lite_size))) && (((liteFn$lib$core$text$at(lite_kind, lite_cursor)) !== (")"))))) {
            if (((liteFn$lib$core$text$at(lite_kind, lite_cursor)) !== (":"))) {
                lite_cursor = liteFn$lib$core$text$skipName(lite_kind, lite_cursor);
            }
            if (((((lite_cursor) < (lite_size))) && (((liteFn$lib$core$text$at(lite_kind, lite_cursor)) === (":"))))) {
                lite_cursor = lite$addInt(lite_cursor, 1n, 22114);
            }
            lite_cursor = liteFn$lib$core$text$skipName(lite_kind, lite_cursor);
            lite_count = lite$addInt(lite_count, 1n, 22192);
            if (((((lite_cursor) < (lite_size))) && (((liteFn$lib$core$text$at(lite_kind, lite_cursor)) === (","))))) {
                lite_cursor = lite$addInt(lite_cursor, 1n, 22276);
            }
        }
        return lite_count;
    }
    void liteFn$frontend$tupleComponentCount;
    function liteFn$frontend$tupleComponent(lite_kind: string, lite_targetIndex: bigint): { label: string; kind: string; prop: string } {
        void lite_kind;
        void lite_targetIndex;
        const lite_size = liteFn$lib$core$text$length(lite_kind);
        void lite_size;
        let lite_cursor = 1n;
        void lite_cursor;
        let lite_index = 0n;
        void lite_index;
        while (((((lite_cursor) < (lite_size))) && (((liteFn$lib$core$text$at(lite_kind, lite_cursor)) !== (")"))))) {
            let lite_label = "";
            void lite_label;
            if (((liteFn$lib$core$text$at(lite_kind, lite_cursor)) !== (":"))) {
                const lite_nameStart = lite_cursor;
                void lite_nameStart;
                lite_cursor = liteFn$lib$core$text$skipName(lite_kind, lite_cursor);
                lite_label = liteFn$lib$core$text$slice(lite_kind, lite_nameStart, lite_cursor);
            }
            if (((((lite_cursor) < (lite_size))) && (((liteFn$lib$core$text$at(lite_kind, lite_cursor)) === (":"))))) {
                lite_cursor = lite$addInt(lite_cursor, 1n, 22967);
            }
            const lite_typeStart = lite_cursor;
            void lite_typeStart;
            lite_cursor = liteFn$lib$core$text$skipName(lite_kind, lite_cursor);
            const lite_fieldKind = liteFn$lib$core$text$slice(lite_kind, lite_typeStart, lite_cursor);
            void lite_fieldKind;
            if (((lite_index) === (lite_targetIndex))) {
                return { label: lite_label, kind: lite_fieldKind, prop: liteFn$frontend$tupleRuntimeProp(lite_label, lite_index) };
            }
            lite_index = lite$addInt(lite_index, 1n, 23272);
            if (((((lite_cursor) < (lite_size))) && (((liteFn$lib$core$text$at(lite_kind, lite_cursor)) === (","))))) {
                lite_cursor = lite$addInt(lite_cursor, 1n, 23356);
            }
        }
        return { label: "", kind: "", prop: "" };
    }
    void liteFn$frontend$tupleComponent;
    function liteFn$frontend$tupleShapeMatches(lite_expectedKind: string, lite_actualKind: string): boolean {
        void lite_expectedKind;
        void lite_actualKind;
        if ((((!(liteFn$frontend$isTupleKind(lite_expectedKind)))) || ((!(liteFn$frontend$isTupleKind(lite_actualKind)))))) {
            return false;
        }
        const lite_count = liteFn$frontend$tupleComponentCount(lite_expectedKind);
        void lite_count;
        if (((lite_count) !== (liteFn$frontend$tupleComponentCount(lite_actualKind)))) {
            return false;
        }
        let lite_index = 0n;
        void lite_index;
        while (((lite_index) < (lite_count))) {
            if ((((liteFn$frontend$tupleComponent(lite_expectedKind, lite_index)).kind) !== ((liteFn$frontend$tupleComponent(lite_actualKind, lite_index)).kind))) {
                return false;
            }
            lite_index = lite$addInt(lite_index, 1n, 24014);
        }
        return true;
    }
    void liteFn$frontend$tupleShapeMatches;
    function liteFn$frontend$convertTupleValue(lite_expectedKind: string, lite_actualKind: string, lite_actualCode: string): string {
        void lite_expectedKind;
        void lite_actualKind;
        void lite_actualCode;
        const lite_count = liteFn$frontend$tupleComponentCount(lite_expectedKind);
        void lite_count;
        let lite_fields = "";
        void lite_fields;
        let lite_index = 0n;
        void lite_index;
        while (((lite_index) < (lite_count))) {
            const lite_expectedComp = liteFn$frontend$tupleComponent(lite_expectedKind, lite_index);
            void lite_expectedComp;
            const lite_actualComp = liteFn$frontend$tupleComponent(lite_actualKind, lite_index);
            void lite_actualComp;
            if (((lite_index) > (0n))) {
                lite_fields = ((lite_fields) + (", "));
            }
            lite_fields = ((((((lite_fields) + (liteFn$frontend$tupleObjectKey((lite_expectedComp).label, lite_index)))) + (": lite$t."))) + ((lite_actualComp).prop));
            lite_index = lite$addInt(lite_index, 1n, 24657);
        }
        return (((((((("(() => { const lite$t = ") + (lite_actualCode))) + ("; return { "))) + (lite_fields))) + (" }; })()"));
    }
    void liteFn$frontend$convertTupleValue;
    function liteFn$frontend$isCompatibleKind(lite_expectedKind: string, lite_actualKind: string): boolean {
        void lite_expectedKind;
        void lite_actualKind;
        return (((((((((((lite_expectedKind) !== (""))) && (((lite_actualKind) === ("Never")))))) || (((lite_expectedKind) === (lite_actualKind))))) || (liteFn$numeric__literals$numericWidens(lite_expectedKind, lite_actualKind)))) || (liteFn$frontend$tupleShapeMatches(lite_expectedKind, lite_actualKind)));
    }
    void liteFn$frontend$isCompatibleKind;
    function liteFn$frontend$isListKind(lite_kind: string): boolean {
        void lite_kind;
        return ((((((liteFn$lib$core$text$length(lite_kind)) > (5n))) && (liteFn$lib$core$text$startsWithAt(lite_kind, 0n, "List<")))) && (((liteFn$lib$core$text$at(lite_kind, lite$subtractInt(liteFn$lib$core$text$length(lite_kind), 1n, 25454))) === (">"))));
    }
    void liteFn$frontend$isListKind;
    function liteFn$frontend$listElementKind(lite_kind: string): string {
        void lite_kind;
        if ((!(liteFn$frontend$isListKind(lite_kind)))) {
            return "";
        }
        return liteFn$lib$core$text$slice(lite_kind, 5n, lite$subtractInt(liteFn$lib$core$text$length(lite_kind), 1n, 25678));
    }
    void liteFn$frontend$listElementKind;
    function liteFn$frontend$arraySemiIndex(lite_kind: string): bigint {
        void lite_kind;
        const lite_size = liteFn$lib$core$text$length(lite_kind);
        void lite_size;
        if (((((((lite_size) < (5n))) || (((liteFn$lib$core$text$at(lite_kind, 0n)) !== ("["))))) || (((liteFn$lib$core$text$at(lite_kind, lite$subtractInt(lite_size, 1n, 25951))) !== ("]"))))) {
            return (-1n);
        }
        let lite_cursor = 1n;
        void lite_cursor;
        let lite_depth = 0n;
        void lite_depth;
        while (((lite_cursor) < (lite$subtractInt(lite_size, 1n, 26043)))) {
            const lite_ch = liteFn$lib$core$text$at(lite_kind, lite_cursor);
            void lite_ch;
            if (((((((lite_ch) === ("("))) || (((lite_ch) === ("["))))) || (((lite_ch) === ("<"))))) {
                lite_depth = lite$addInt(lite_depth, 1n, 26152);
            } else if (((((((lite_ch) === (")"))) || (((lite_ch) === ("]"))))) || (((lite_ch) === (">"))))) {
                lite_depth = lite$subtractInt(lite_depth, 1n, 26227);
            } else if (((((lite_ch) === (";"))) && (((lite_depth) === (0n))))) {
                return lite_cursor;
            }
            lite_cursor = lite$addInt(lite_cursor, 1n, 26318);
        }
        return (-1n);
    }
    void liteFn$frontend$arraySemiIndex;
    function liteFn$frontend$isArrayKind(lite_kind: string): boolean {
        void lite_kind;
        return ((liteFn$frontend$arraySemiIndex(lite_kind)) > (1n));
    }
    void liteFn$frontend$isArrayKind;
    function liteFn$frontend$arrayElementKind(lite_kind: string): string {
        void lite_kind;
        const lite_semi = liteFn$frontend$arraySemiIndex(lite_kind);
        void lite_semi;
        if (((lite_semi) <= (1n))) {
            return "";
        }
        return liteFn$lib$core$text$slice(lite_kind, 1n, lite_semi);
    }
    void liteFn$frontend$arrayElementKind;
    function liteFn$frontend$decimalDigit(lite_ch: string): bigint {
        void lite_ch;
        return (Boolean(((lite_ch) === ("0"))) ? 0n : (Boolean(((lite_ch) === ("1"))) ? 1n : (Boolean(((lite_ch) === ("2"))) ? 2n : (Boolean(((lite_ch) === ("3"))) ? 3n : (Boolean(((lite_ch) === ("4"))) ? 4n : (Boolean(((lite_ch) === ("5"))) ? 5n : (Boolean(((lite_ch) === ("6"))) ? 6n : (Boolean(((lite_ch) === ("7"))) ? 7n : (Boolean(((lite_ch) === ("8"))) ? 8n : 9n)))))))));
    }
    void liteFn$frontend$decimalDigit;
    function liteFn$frontend$parseDigits(lite_text: string, lite_start: bigint, lite_end: bigint): bigint {
        void lite_text;
        void lite_start;
        void lite_end;
        let lite_result = 0n;
        void lite_result;
        let lite_cursor = lite_start;
        void lite_cursor;
        while (((lite_cursor) < (lite_end))) {
            lite_result = lite$addInt(lite$multiplyInt(lite_result, 10n, 27336), liteFn$frontend$decimalDigit(liteFn$lib$core$text$at(lite_text, lite_cursor)), 27341);
            lite_cursor = lite$addInt(lite_cursor, 1n, 27407);
        }
        return lite_result;
    }
    void liteFn$frontend$parseDigits;
    function liteFn$frontend$arrayExtent(lite_kind: string): bigint {
        void lite_kind;
        const lite_semi = liteFn$frontend$arraySemiIndex(lite_kind);
        void lite_semi;
        if (((lite_semi) <= (1n))) {
            return 0n;
        }
        return liteFn$frontend$parseDigits(lite_kind, lite$addInt(lite_semi, 1n, 27630), lite$subtractInt(liteFn$lib$core$text$length(lite_kind), 1n, 27656));
    }
    void liteFn$frontend$arrayExtent;
    function liteFn$frontend$tsTupleType(lite_kind: string): string {
        void lite_kind;
        const lite_count = liteFn$frontend$tupleComponentCount(lite_kind);
        void lite_count;
        let lite_result = "{ ";
        void lite_result;
        let lite_index = 0n;
        void lite_index;
        while (((lite_index) < (lite_count))) {
            const lite_comp = liteFn$frontend$tupleComponent(lite_kind, lite_index);
            void lite_comp;
            if (((lite_index) > (0n))) {
                lite_result = ((lite_result) + ("; "));
            }
            lite_result = ((((((lite_result) + (liteFn$frontend$tupleObjectKey((lite_comp).label, lite_index)))) + (": "))) + (liteFn$ts__literals$tsScalarType((lite_comp).kind)));
            lite_index = lite$addInt(lite_index, 1n, 28113);
        }
        return ((lite_result) + (" }"));
    }
    void liteFn$frontend$tsTupleType;
    function liteFn$frontend$tsFunctionType(lite_kind: string): string {
        void lite_kind;
        return (Boolean(liteFn$frontend$isListKind(lite_kind)) ? ((liteFn$frontend$tsFunctionType(liteFn$frontend$listElementKind(lite_kind))) + ("[]")) : (Boolean(liteFn$frontend$isArrayKind(lite_kind)) ? ((liteFn$frontend$tsFunctionType(liteFn$frontend$arrayElementKind(lite_kind))) + ("[]")) : (Boolean(liteFn$frontend$isTupleKind(lite_kind)) ? liteFn$frontend$tsTupleType(lite_kind) : liteFn$ts__literals$tsScalarType(lite_kind))));
    }
    void liteFn$frontend$tsFunctionType;
    function liteFn$frontend$tsDisplayValueCode(lite_kind: string, lite_code: string): string {
        void lite_kind;
        void lite_code;
        if (((liteFn$frontend$isIntScalarKind(lite_kind)) || (liteFn$frontend$isFloatScalarKind(lite_kind)))) {
            return (((("(") + (lite_code))) + (").toString()"));
        }
        if (((lite_kind) === ("Bool"))) {
            return (((("((") + (lite_code))) + (") ? \"true\" : \"false\")"));
        }
        if (((lite_kind) === ("Unit"))) {
            return (((("((value: unknown): string => { void value; return \"Unit\"; })(") + (lite_code))) + (")"));
        }
        if (((liteFn$frontend$isListKind(lite_kind)) || (liteFn$frontend$isArrayKind(lite_kind)))) {
            const lite_element = (Boolean(liteFn$frontend$isListKind(lite_kind)) ? liteFn$frontend$listElementKind(lite_kind) : liteFn$frontend$arrayElementKind(lite_kind));
            void lite_element;
            return (((((((((((("(\"[\" + (") + (lite_code))) + (").map((value: "))) + (liteFn$frontend$tsFunctionType(lite_element)))) + (") => "))) + (liteFn$frontend$tsDisplayValueCode(lite_element, "value")))) + (").join(\", \") + \"]\")"));
        }
        if (liteFn$frontend$isTupleKind(lite_kind)) {
            let lite_result = liteFn$ts__literals$textLiteralCode("(");
            void lite_result;
            const lite_count = liteFn$frontend$tupleComponentCount(lite_kind);
            void lite_count;
            let lite_index = 0n;
            void lite_index;
            while (((lite_index) < (lite_count))) {
                const lite_comp = liteFn$frontend$tupleComponent(lite_kind, lite_index);
                void lite_comp;
                const lite_separator = (Boolean(((lite_index) === (0n))) ? "" : ", ");
                void lite_separator;
                const lite_prefixText = (Boolean((((lite_comp).label) === (""))) ? lite_separator : ((((lite_separator) + ((lite_comp).label))) + ("=")));
                void lite_prefixText;
                lite_result = ((((((((lite_result) + (" + "))) + (liteFn$ts__literals$textLiteralCode(lite_prefixText)))) + (" + "))) + (liteFn$frontend$tsDisplayValueCode((lite_comp).kind, (("value.") + ((lite_comp).prop)))));
                lite_index = lite$addInt(lite_index, 1n, 29827);
            }
            const lite_ending = (Boolean(((lite_count) === (1n))) ? ",)" : ")");
            void lite_ending;
            return (((((((((((((((("((value: ") + (liteFn$frontend$tsFunctionType(lite_kind)))) + ("): string => "))) + (lite_result))) + (" + "))) + (liteFn$ts__literals$textLiteralCode(lite_ending)))) + (")("))) + (lite_code))) + (")"));
        }
        return lite_code;
    }
    void liteFn$frontend$tsDisplayValueCode;
    function liteFn$frontend$codeUsesTextCall(lite_code: string, lite_needle: string): boolean {
        void lite_code;
        void lite_needle;
        const lite_size = liteFn$lib$core$text$length(lite_code);
        void lite_size;
        let lite_cursor = 0n;
        void lite_cursor;
        while (((lite_cursor) < (lite_size))) {
            const lite_ch = liteFn$lib$core$text$at(lite_code, lite_cursor);
            void lite_ch;
            if (((lite_ch) === ("\""))) {
                lite_cursor = lite$addInt(lite_cursor, 1n, 30378);
                while (((lite_cursor) < (lite_size))) {
                    const lite_escaped = liteFn$lib$core$text$at(lite_code, lite_cursor);
                    void lite_escaped;
                    if (((lite_escaped) === ("\\"))) {
                        lite_cursor = lite$addInt(lite_cursor, 2n, 30542);
                    } else if (((lite_escaped) === ("\""))) {
                        lite_cursor = lite$addInt(lite_cursor, 1n, 30627);
                        break;
                    } else {
                        lite_cursor = lite$addInt(lite_cursor, 1n, 30720);
                    }
                }
            } else if (liteFn$lib$core$text$startsWithAt(lite_code, lite_cursor, lite_needle)) {
                return true;
            } else {
                lite_cursor = lite$addInt(lite_cursor, 1n, 30890);
            }
        }
        return false;
    }
    void liteFn$frontend$codeUsesTextCall;
    function liteFn$frontend$codeUsesListIndex(lite_code: string): boolean {
        void lite_code;
        return liteFn$frontend$codeUsesTextCall(lite_code, "lite$listAt(");
    }
    void liteFn$frontend$codeUsesListIndex;
    function liteFn$frontend$codeUsesListPop(lite_code: string): boolean {
        void lite_code;
        return ((liteFn$frontend$codeUsesTextCall(lite_code, "lite$listPopBack(")) || (liteFn$frontend$codeUsesTextCall(lite_code, "lite$listPopFront(")));
    }
    void liteFn$frontend$codeUsesListPop;
    function liteFn$frontend$codeUsesValueIf(lite_code: string): boolean {
        void lite_code;
        return liteFn$frontend$codeUsesTextCall(lite_code, "Boolean(");
    }
    void liteFn$frontend$codeUsesValueIf;
    function liteFn$frontend$tupleFieldKind(lite_kind: string, lite_label: string): string {
        void lite_kind;
        void lite_label;
        const lite_count = liteFn$frontend$tupleComponentCount(lite_kind);
        void lite_count;
        let lite_index = 0n;
        void lite_index;
        while (((lite_index) < (lite_count))) {
            const lite_comp = liteFn$frontend$tupleComponent(lite_kind, lite_index);
            void lite_comp;
            if ((((((lite_comp).label) !== (""))) && ((((lite_comp).label) === (lite_label))))) {
                return (lite_comp).kind;
            }
            lite_index = lite$addInt(lite_index, 1n, 31989);
        }
        return "";
    }
    void liteFn$frontend$tupleFieldKind;
    function liteFn$frontend$displayKind(lite_kind: string): string {
        void lite_kind;
        if (liteFn$frontend$isListKind(lite_kind)) {
            return (((("List<") + (liteFn$frontend$displayKind(liteFn$frontend$listElementKind(lite_kind))))) + (">"));
        }
        if (liteFn$frontend$isArrayKind(lite_kind)) {
            return (((((((("[") + (liteFn$frontend$displayKind(liteFn$frontend$arrayElementKind(lite_kind))))) + ("; "))) + (liteFn$lib$core$int$intText(liteFn$frontend$arrayExtent(lite_kind))))) + ("]"));
        }
        if ((!(liteFn$frontend$isTupleKind(lite_kind)))) {
            return lite_kind;
        }
        const lite_count = liteFn$frontend$tupleComponentCount(lite_kind);
        void lite_count;
        let lite_result = "(";
        void lite_result;
        let lite_index = 0n;
        void lite_index;
        while (((lite_index) < (lite_count))) {
            const lite_comp = liteFn$frontend$tupleComponent(lite_kind, lite_index);
            void lite_comp;
            if (((lite_index) > (0n))) {
                lite_result = ((lite_result) + (", "));
            }
            if ((((lite_comp).label) === (""))) {
                lite_result = ((lite_result) + (liteFn$frontend$displayKind((lite_comp).kind)));
            } else {
                lite_result = ((((((lite_result) + ((lite_comp).label))) + (": "))) + (liteFn$frontend$displayKind((lite_comp).kind)));
            }
            lite_index = lite$addInt(lite_index, 1n, 32818);
        }
        if (((((lite_count) === (1n))) && ((((liteFn$frontend$tupleComponent(lite_kind, 0n)).label) === (""))))) {
            lite_result = ((lite_result) + (","));
        }
        return ((lite_result) + (")"));
    }
    void liteFn$frontend$displayKind;
    function liteFn$frontend$resolveTypeText(lite_source: string, lite_position: bigint, lite_prefix: string, lite_aliases: { name: string; target: string; at: bigint; end: bigint }[], lite_text: string, lite_seen: string[]): string {
        void lite_source;
        void lite_position;
        void lite_prefix;
        void lite_aliases;
        void lite_text;
        void lite_seen;
        const lite_size = liteFn$lib$core$text$length(lite_text);
        void lite_size;
        let lite_cursor = liteFn$frontend$skipTrivia(lite_text, 0n, lite_prefix);
        void lite_cursor;
        if (((((lite_cursor) < (lite_size))) && (((liteFn$lib$core$text$at(lite_text, lite_cursor)) === ("("))))) {
            lite_cursor = liteFn$frontend$skipTrivia(lite_text, lite$addInt(lite_cursor, 1n, 33418), lite_prefix);
            const lite_labels: string[] = [...([])];
            void lite_labels;
            let lite_kindText = "(";
            void lite_kindText;
            let lite_count = 0n;
            void lite_count;
            let lite_hadComma = false;
            void lite_hadComma;
            let lite_singleLabel = "";
            void lite_singleLabel;
            let lite_singleKind = "";
            void lite_singleKind;
            let lite_hadColon = false;
            void lite_hadColon;
            while (Boolean(true)) {
                if (((lite_cursor) >= (lite_size))) {
                    liteFn$frontend$failAt(lite_source, lite_position, lite_prefix, "expected ) in tuple type");
                }
                if (((liteFn$lib$core$text$at(lite_text, lite_cursor)) === (")"))) {
                    lite_cursor = lite$addInt(lite_cursor, 1n, 33844);
                    break;
                }
                if (((liteFn$lib$core$text$at(lite_text, lite_cursor)) === ("("))) {
                    liteFn$frontend$failAt(lite_source, lite_position, lite_prefix, "nested tuple types are not supported");
                }
                let lite_label = "";
                void lite_label;
                let lite_componentName = "";
                void lite_componentName;
                if (((liteFn$lib$core$text$at(lite_text, lite_cursor)) === (":"))) {
                    lite_hadColon = true;
                    lite_cursor = liteFn$frontend$skipTrivia(lite_text, lite$addInt(lite_cursor, 1n, 34236), lite_prefix);
                    if (((((lite_cursor) < (lite_size))) && (((liteFn$lib$core$text$at(lite_text, lite_cursor)) === ("("))))) {
                        liteFn$frontend$failAt(lite_source, lite_position, lite_prefix, "nested tuple types are not supported");
                    }
                    if (((((lite_cursor) >= (lite_size))) || ((!(liteFn$lib$core$text$isNameStart(liteFn$lib$core$text$at(lite_text, lite_cursor))))))) {
                        liteFn$frontend$failAt(lite_source, lite_position, lite_prefix, "expected a tuple field type");
                    }
                    const lite_componentStart = lite_cursor;
                    void lite_componentStart;
                    lite_cursor = liteFn$lib$core$text$skipName(lite_text, lite_cursor);
                    lite_componentName = liteFn$lib$core$text$slice(lite_text, lite_componentStart, lite_cursor);
                } else {
                    if ((!(liteFn$lib$core$text$isNameStart(liteFn$lib$core$text$at(lite_text, lite_cursor))))) {
                        liteFn$frontend$failAt(lite_source, lite_position, lite_prefix, "expected a tuple field name");
                    }
                    const lite_firstStart = lite_cursor;
                    void lite_firstStart;
                    const lite_firstEnd = liteFn$lib$core$text$skipName(lite_text, lite_cursor);
                    void lite_firstEnd;
                    const lite_firstName = liteFn$lib$core$text$slice(lite_text, lite_firstStart, lite_firstEnd);
                    void lite_firstName;
                    const lite_afterFirst = liteFn$frontend$skipTrivia(lite_text, lite_firstEnd, lite_prefix);
                    void lite_afterFirst;
                    if (((((lite_afterFirst) < (lite_size))) && (((liteFn$lib$core$text$at(lite_text, lite_afterFirst)) === (":"))))) {
                        lite_label = lite_firstName;
                        if (liteFn$lib$core$list$listContainsText([...(lite_labels)], lite_label)) {
                            liteFn$frontend$failAt(lite_source, lite_position, lite_prefix, (("duplicate tuple field ") + (lite_label)));
                        }
                        lite_labels.push(lite_label);
                        lite_cursor = liteFn$frontend$skipTrivia(lite_text, lite$addInt(lite_afterFirst, 1n, 35643), lite_prefix);
                        if (((((lite_cursor) < (lite_size))) && (((liteFn$lib$core$text$at(lite_text, lite_cursor)) === ("("))))) {
                            liteFn$frontend$failAt(lite_source, lite_position, lite_prefix, "nested tuple types are not supported");
                        }
                        if (((((lite_cursor) >= (lite_size))) || ((!(liteFn$lib$core$text$isNameStart(liteFn$lib$core$text$at(lite_text, lite_cursor))))))) {
                            liteFn$frontend$failAt(lite_source, lite_position, lite_prefix, "expected a tuple field type");
                        }
                        const lite_componentStart = lite_cursor;
                        void lite_componentStart;
                        lite_cursor = liteFn$lib$core$text$skipName(lite_text, lite_cursor);
                        lite_componentName = liteFn$lib$core$text$slice(lite_text, lite_componentStart, lite_cursor);
                    } else {
                        lite_componentName = lite_firstName;
                        lite_cursor = lite_firstEnd;
                    }
                }
                const lite_componentKind = liteFn$frontend$resolveTypeText(lite_source, lite_position, lite_prefix, [...(lite_aliases)], lite_componentName, [...(lite_seen)]);
                void lite_componentKind;
                if (liteFn$frontend$isTupleKind(lite_componentKind)) {
                    liteFn$frontend$failAt(lite_source, lite_position, lite_prefix, "nested tuple types are not supported");
                }
                if (liteFn$frontend$isListKind(lite_componentKind)) {
                    liteFn$frontend$failAt(lite_source, lite_position, lite_prefix, "list types inside tuples are not supported");
                }
                if (((lite_componentKind) === ("Unit"))) {
                    liteFn$frontend$failAt(lite_source, lite_position, lite_prefix, "unsupported tuple component type Unit");
                }
                if (((lite_count) > (0n))) {
                    lite_kindText = ((lite_kindText) + (","));
                }
                lite_kindText = ((((((lite_kindText) + (lite_label))) + (":"))) + (lite_componentKind));
                if (((lite_count) === (0n))) {
                    lite_singleLabel = lite_label;
                    lite_singleKind = lite_componentKind;
                }
                lite_count = lite$addInt(lite_count, 1n, 37160);
                lite_cursor = liteFn$frontend$skipTrivia(lite_text, lite_cursor, lite_prefix);
                if (((((lite_cursor) < (lite_size))) && (((liteFn$lib$core$text$at(lite_text, lite_cursor)) === (","))))) {
                    lite_hadComma = true;
                    lite_cursor = liteFn$frontend$skipTrivia(lite_text, lite$addInt(lite_cursor, 1n, 37369), lite_prefix);
                }
            }
            if (((lite_count) === (0n))) {
                liteFn$frontend$failAt(lite_source, lite_position, lite_prefix, "tuple type needs at least one field");
            }
            lite_cursor = liteFn$frontend$skipTrivia(lite_text, lite_cursor, lite_prefix);
            if (((lite_cursor) < (lite_size))) {
                liteFn$frontend$failAt(lite_source, lite_position, lite_prefix, "unexpected text after tuple type");
            }
            if (((((((lite_count) === (1n))) && (((lite_singleLabel) === (""))))) && ((!(lite_hadComma))))) {
                if (lite_hadColon) {
                    liteFn$frontend$failAt(lite_source, lite_position, lite_prefix, "unnamed singleton tuple type needs trailing comma");
                }
                return lite_singleKind;
            }
            return ((lite_kindText) + (")"));
        }
        if (((liteFn$lib$core$text$at(lite_text, lite_cursor)) === ("["))) {
            let lite_scan = lite$addInt(lite_cursor, 1n, 38020);
            void lite_scan;
            let lite_depth = 0n;
            void lite_depth;
            let lite_semi = (-1n);
            void lite_semi;
            let lite_close = (-1n);
            void lite_close;
            while (((lite_scan) < (lite_size))) {
                const lite_ch = liteFn$lib$core$text$at(lite_text, lite_scan);
                void lite_ch;
                if (((((((lite_ch) === ("("))) || (((lite_ch) === ("["))))) || (((lite_ch) === ("<"))))) {
                    lite_depth = lite$addInt(lite_depth, 1n, 38234);
                } else if (((((lite_ch) === (")"))) || (((lite_ch) === (">"))))) {
                    lite_depth = lite$subtractInt(lite_depth, 1n, 38300);
                } else if (((lite_ch) === ("]"))) {
                    if (((lite_depth) === (0n))) {
                        lite_close = lite_scan;
                        break;
                    }
                    lite_depth = lite$subtractInt(lite_depth, 1n, 38480);
                } else if (((((((lite_ch) === (";"))) && (((lite_depth) === (0n))))) && (((lite_semi) < (0n))))) {
                    lite_semi = lite_scan;
                }
                lite_scan = lite$addInt(lite_scan, 1n, 38614);
            }
            if (((((lite_close) < (0n))) || (((lite_semi) < (0n))))) {
                liteFn$frontend$failAt(lite_source, lite_position, lite_prefix, "expected [Type; Extent] in array type");
                return "";
            }
            const lite_elemText = liteFn$lib$core$text$slice(lite_text, lite$addInt(lite_cursor, 1n, 38831), lite_semi);
            void lite_elemText;
            const lite_elemKind = liteFn$frontend$resolveTypeText(lite_source, lite_position, lite_prefix, [...(lite_aliases)], lite_elemText, [...(lite_seen)]);
            void lite_elemKind;
            if (((lite_elemKind) === ("Unit"))) {
                liteFn$frontend$failAt(lite_source, lite_position, lite_prefix, "unsupported array element type Unit");
            }
            const lite_extentStart = liteFn$frontend$skipTrivia(lite_text, lite$addInt(lite_semi, 1n, 39103), lite_prefix);
            void lite_extentStart;
            let lite_extentEnd = lite_extentStart;
            void lite_extentEnd;
            while (((((lite_extentEnd) < (lite_close))) && (liteFn$lib$core$text$isDigit(liteFn$lib$core$text$at(lite_text, lite_extentEnd))))) {
                lite_extentEnd = lite$addInt(lite_extentEnd, 1n, 39259);
            }
            if (((((lite_extentEnd) === (lite_extentStart))) || (((liteFn$frontend$skipTrivia(lite_text, lite_extentEnd, lite_prefix)) < (lite_close))))) {
                liteFn$frontend$failAt(lite_source, lite_position, lite_prefix, "expected positive integer extent in array type");
            }
            const lite_extent = liteFn$frontend$parseDigits(lite_text, lite_extentStart, lite_extentEnd);
            void lite_extent;
            const lite_afterArray = liteFn$frontend$skipTrivia(lite_text, lite$addInt(lite_close, 1n, 39563), lite_prefix);
            void lite_afterArray;
            if (((lite_afterArray) < (lite_size))) {
                liteFn$frontend$failAt(lite_source, lite_position, lite_prefix, "unexpected text after array type");
            }
            return (((((((("[") + (lite_elemKind))) + (";"))) + (liteFn$lib$core$int$intText(lite_extent)))) + ("]"));
        }
        const lite_parsedName = liteFn$frontend$typeNameAt(lite_text, lite_cursor, lite_prefix);
        void lite_parsedName;
        const lite_after = (lite_parsedName).next;
        void lite_after;
        const lite_name = (lite_parsedName).name;
        void lite_name;
        const lite_afterTrivia = liteFn$frontend$skipTrivia(lite_text, lite_after, lite_prefix);
        void lite_afterTrivia;
        if (((((((lite_name) === ("List"))) && (((lite_afterTrivia) < (lite_size))))) && (((liteFn$lib$core$text$at(lite_text, lite_afterTrivia)) === ("<"))))) {
            const lite_innerStart = liteFn$frontend$skipTrivia(lite_text, lite$addInt(lite_afterTrivia, 1n, 40077), lite_prefix);
            void lite_innerStart;
            if (((((lite_innerStart) >= (lite_size))) || (((liteFn$lib$core$text$at(lite_text, lite_innerStart)) === (">"))))) {
                liteFn$frontend$failAt(lite_source, lite_position, lite_prefix, "expected a list element type");
            }
            let lite_scan = lite_innerStart;
            void lite_scan;
            let lite_depth = 0n;
            void lite_depth;
            let lite_close = (-1n);
            void lite_close;
            while (((lite_scan) < (lite_size))) {
                const lite_ch = liteFn$lib$core$text$at(lite_text, lite_scan);
                void lite_ch;
                if (((lite_ch) === ("<"))) {
                    lite_depth = lite$addInt(lite_depth, 1n, 40457);
                } else if (((lite_ch) === (">"))) {
                    if (((lite_depth) === (0n))) {
                        lite_close = lite_scan;
                        break;
                    }
                    lite_depth = lite$subtractInt(lite_depth, 1n, 40637);
                }
                lite_scan = lite$addInt(lite_scan, 1n, 40680);
            }
            if (((lite_close) < (0n))) {
                liteFn$frontend$failAt(lite_source, lite_position, lite_prefix, "expected > in list type");
            }
            const lite_innerText = liteFn$lib$core$text$slice(lite_text, lite_innerStart, lite_close);
            void lite_innerText;
            const lite_innerKind = liteFn$frontend$resolveTypeText(lite_source, lite_position, lite_prefix, [...(lite_aliases)], lite_innerText, [...(lite_seen)]);
            void lite_innerKind;
            if (liteFn$frontend$isListKind(lite_innerKind)) {
                liteFn$frontend$failAt(lite_source, lite_position, lite_prefix, "nested list types are not supported");
            }
            const lite_afterList = liteFn$frontend$skipTrivia(lite_text, lite$addInt(lite_close, 1n, 41126), lite_prefix);
            void lite_afterList;
            if (((lite_afterList) < (lite_size))) {
                liteFn$frontend$failAt(lite_source, lite_position, lite_prefix, "unexpected text after list type");
            }
            return (((("List<") + (lite_innerKind))) + (">"));
        }
        if (((lite_afterTrivia) < (lite_size))) {
            liteFn$frontend$failAt(lite_source, lite_position, lite_prefix, (("unexpected text after type ") + (lite_name)));
        }
        if (((((((((((((lite_name) === ("Int"))) || (((lite_name) === ("Float"))))) || (((lite_name) === ("String"))))) || (((lite_name) === ("Bool"))))) || (((lite_name) === ("Unit"))))) || (liteFn$numeric__literals$isNarrowNumericKind(lite_name)))) {
            return lite_name;
        }
        const lite_numericKind = liteFn$numeric__literals$numericAliasKind(lite_name);
        void lite_numericKind;
        if (((lite_numericKind) !== (""))) {
            return lite_numericKind;
        }
        if (liteFn$frontend$isUnsupportedAliasTarget(lite_name)) {
            liteFn$frontend$unsupportedAliasTarget(lite_source, lite_position, lite_prefix, lite_name);
            return "";
        }
        const lite_index = liteFn$frontend$findAlias([...(lite_aliases)], lite_name);
        void lite_index;
        if (((lite_index) < (0n))) {
            liteFn$frontend$failAt(lite_source, lite_position, lite_prefix, (("unknown type alias ") + (lite_name)));
            return "";
        }
        const lite_alias = lite$listAt((lite_aliases), lite_index, 41979);
        void lite_alias;
        if (liteFn$lib$core$list$listContainsText([...(lite_seen)], lite_name)) {
            liteFn$frontend$failAt(lite_source, (lite_alias).at, lite_prefix, (("recursive type alias ") + (lite_name)));
            return "";
        }
        if ((((lite_alias).target) === (""))) {
            liteFn$frontend$unsupportedAliasTarget(lite_source, (lite_alias).at, lite_prefix, "target");
            return "";
        }
        const lite_nextSeen: string[] = [...(lite_seen)];
        void lite_nextSeen;
        lite_nextSeen.push(lite_name);
        return liteFn$frontend$resolveTypeText(lite_source, (lite_alias).at, lite_prefix, [...(lite_aliases)], (lite_alias).target, [...(lite_nextSeen)]);
    }
    void liteFn$frontend$resolveTypeText;
    function liteFn$frontend$resolveAliasKind(lite_source: string, lite_position: bigint, lite_prefix: string, lite_aliases: { name: string; target: string; at: bigint; end: bigint }[], lite_name: string, lite_seen: string[]): string {
        void lite_source;
        void lite_position;
        void lite_prefix;
        void lite_aliases;
        void lite_name;
        void lite_seen;
        return liteFn$frontend$resolveTypeText(lite_source, lite_position, lite_prefix, [...(lite_aliases)], lite_name, [...(lite_seen)]);
    }
    void liteFn$frontend$resolveAliasKind;
    function liteFn$frontend$parseTupleTypeAt(lite_source: string, lite_position: bigint, lite_prefix: string, lite_aliases: { name: string; target: string; at: bigint; end: bigint }[]): { kind: string; next: bigint } {
        void lite_source;
        void lite_position;
        void lite_prefix;
        void lite_aliases;
        const lite_size = liteFn$lib$core$text$length(lite_source);
        void lite_size;
        let lite_cursor = liteFn$frontend$skipTrivia(lite_source, lite_position, lite_prefix);
        void lite_cursor;
        lite_cursor = liteFn$frontend$expectSymbol(lite_source, lite_cursor, "(", lite_prefix);
        lite_cursor = liteFn$frontend$skipTrivia(lite_source, lite_cursor, lite_prefix);
        const lite_labels: string[] = [...([])];
        void lite_labels;
        let lite_kindText = "(";
        void lite_kindText;
        let lite_count = 0n;
        void lite_count;
        let lite_hadComma = false;
        void lite_hadComma;
        let lite_singleLabel = "";
        void lite_singleLabel;
        let lite_singleKind = "";
        void lite_singleKind;
        let lite_hadColon = false;
        void lite_hadColon;
        while (Boolean(true)) {
            if (((lite_cursor) >= (lite_size))) {
                liteFn$frontend$failAt(lite_source, lite_cursor, lite_prefix, "expected ) in tuple type");
            }
            if (((liteFn$lib$core$text$at(lite_source, lite_cursor)) === (")"))) {
                lite_cursor = lite$addInt(lite_cursor, 1n, 43522);
                break;
            }
            if (((liteFn$lib$core$text$at(lite_source, lite_cursor)) === ("("))) {
                liteFn$frontend$failAt(lite_source, lite_cursor, lite_prefix, "nested tuple types are not supported");
            }
            let lite_label = "";
            void lite_label;
            let lite_componentStart = lite_cursor;
            void lite_componentStart;
            let lite_componentName = "";
            void lite_componentName;
            if (((liteFn$lib$core$text$at(lite_source, lite_cursor)) === (":"))) {
                lite_hadColon = true;
                lite_cursor = liteFn$frontend$skipTrivia(lite_source, lite$addInt(lite_cursor, 1n, 43916), lite_prefix);
                if (((((lite_cursor) < (lite_size))) && (((liteFn$lib$core$text$at(lite_source, lite_cursor)) === ("("))))) {
                    liteFn$frontend$failAt(lite_source, lite_cursor, lite_prefix, "nested tuple types are not supported");
                }
                if (((((lite_cursor) >= (lite_size))) || ((!(liteFn$lib$core$text$isNameStart(liteFn$lib$core$text$at(lite_source, lite_cursor))))))) {
                    liteFn$frontend$failAt(lite_source, lite_cursor, lite_prefix, "expected a tuple field type");
                }
                lite_componentStart = lite_cursor;
                const lite_parsedComponent = liteFn$frontend$typeNameAt(lite_source, lite_cursor, lite_prefix);
                void lite_parsedComponent;
                lite_cursor = (lite_parsedComponent).next;
                lite_componentName = (lite_parsedComponent).name;
            } else {
                if ((!(liteFn$lib$core$text$isNameStart(liteFn$lib$core$text$at(lite_source, lite_cursor))))) {
                    liteFn$frontend$failAt(lite_source, lite_cursor, lite_prefix, "expected a tuple field name");
                }
                const lite_firstStart = lite_cursor;
                void lite_firstStart;
                const lite_firstEnd = liteFn$lib$core$text$skipName(lite_source, lite_cursor);
                void lite_firstEnd;
                const lite_firstName = liteFn$lib$core$text$slice(lite_source, lite_firstStart, lite_firstEnd);
                void lite_firstName;
                const lite_afterFirst = liteFn$frontend$skipTrivia(lite_source, lite_firstEnd, lite_prefix);
                void lite_afterFirst;
                if (((((lite_afterFirst) < (lite_size))) && (((liteFn$lib$core$text$at(lite_source, lite_afterFirst)) === (":"))))) {
                    lite_label = lite_firstName;
                    if (liteFn$frontend$isReservedWord(lite_label)) {
                        liteFn$frontend$unsupportedFeature(lite_source, lite_firstStart, lite_label, lite_prefix);
                    }
                    if (liteFn$lib$core$list$listContainsText([...(lite_labels)], lite_label)) {
                        liteFn$frontend$failAt(lite_source, lite_firstStart, lite_prefix, (("duplicate tuple field ") + (lite_label)));
                    }
                    lite_labels.push(lite_label);
                    lite_cursor = liteFn$frontend$skipTrivia(lite_source, lite$addInt(lite_afterFirst, 1n, 45372), lite_prefix);
                    if (((((lite_cursor) < (lite_size))) && (((liteFn$lib$core$text$at(lite_source, lite_cursor)) === ("("))))) {
                        liteFn$frontend$failAt(lite_source, lite_cursor, lite_prefix, "nested tuple types are not supported");
                    }
                    if (((((lite_cursor) >= (lite_size))) || ((!(liteFn$lib$core$text$isNameStart(liteFn$lib$core$text$at(lite_source, lite_cursor))))))) {
                        liteFn$frontend$failAt(lite_source, lite_cursor, lite_prefix, "expected a tuple field type");
                    }
                    lite_componentStart = lite_cursor;
                    const lite_parsedComponent = liteFn$frontend$typeNameAt(lite_source, lite_cursor, lite_prefix);
                    void lite_parsedComponent;
                    lite_cursor = (lite_parsedComponent).next;
                    lite_componentName = (lite_parsedComponent).name;
                } else {
                    const lite_parsedComponent = liteFn$frontend$typeNameAt(lite_source, lite_firstStart, lite_prefix);
                    void lite_parsedComponent;
                    lite_cursor = (lite_parsedComponent).next;
                    lite_componentName = (lite_parsedComponent).name;
                }
            }
            let lite_componentKind = "";
            void lite_componentKind;
            if (((((((((((((lite_componentName) === ("Int"))) || (((lite_componentName) === ("Float"))))) || (((lite_componentName) === ("String"))))) || (((lite_componentName) === ("Bool"))))) || (((lite_componentName) === ("Unit"))))) || (liteFn$numeric__literals$isNarrowNumericKind(lite_componentName)))) {
                lite_componentKind = lite_componentName;
            } else {
                lite_componentKind = liteFn$numeric__literals$numericAliasKind(lite_componentName);
                if (((lite_componentKind) === (""))) {
                    if (((liteFn$frontend$findAlias([...(lite_aliases)], lite_componentName)) >= (0n))) {
                        const lite_seen: string[] = [...([])];
                        void lite_seen;
                        lite_componentKind = liteFn$frontend$resolveAliasKind(lite_source, lite_componentStart, lite_prefix, [...(lite_aliases)], lite_componentName, [...(lite_seen)]);
                    } else {
                        liteFn$frontend$failAt(lite_source, lite_componentStart, lite_prefix, (("unsupported tuple field type ") + (lite_componentName)));
                    }
                }
            }
            if (liteFn$frontend$isTupleKind(lite_componentKind)) {
                liteFn$frontend$failAt(lite_source, lite_componentStart, lite_prefix, "nested tuple types are not supported");
            }
            if (liteFn$frontend$isListKind(lite_componentKind)) {
                liteFn$frontend$failAt(lite_source, lite_componentStart, lite_prefix, "list types inside tuples are not supported");
            }
            if (((lite_componentKind) === ("Unit"))) {
                liteFn$frontend$failAt(lite_source, lite_componentStart, lite_prefix, "unsupported tuple component type Unit");
            }
            if (((lite_count) > (0n))) {
                lite_kindText = ((lite_kindText) + (","));
            }
            lite_kindText = ((((((lite_kindText) + (lite_label))) + (":"))) + (lite_componentKind));
            if (((lite_count) === (0n))) {
                lite_singleLabel = lite_label;
                lite_singleKind = lite_componentKind;
            }
            lite_count = lite$addInt(lite_count, 1n, 47625);
            lite_cursor = liteFn$frontend$skipTrivia(lite_source, lite_cursor, lite_prefix);
            if (((((lite_cursor) < (lite_size))) && (((liteFn$lib$core$text$at(lite_source, lite_cursor)) === (","))))) {
                lite_hadComma = true;
                lite_cursor = liteFn$frontend$skipTrivia(lite_source, lite$addInt(lite_cursor, 1n, 47824), lite_prefix);
            }
        }
        if (((lite_count) === (0n))) {
            liteFn$frontend$failAt(lite_source, lite_position, lite_prefix, "tuple type needs at least one field");
        }
        if (((((((lite_count) === (1n))) && (((lite_singleLabel) === (""))))) && ((!(lite_hadComma))))) {
            if (lite_hadColon) {
                liteFn$frontend$failAt(lite_source, lite_position, lite_prefix, "unnamed singleton tuple type needs trailing comma");
            }
            return { kind: lite_singleKind, next: lite_cursor };
        }
        return { kind: ((lite_kindText) + (")")), next: lite_cursor };
    }
    void liteFn$frontend$parseTupleTypeAt;
    function liteFn$frontend$parseTypeAt(lite_source: string, lite_position: bigint, lite_prefix: string, lite_aliases: { name: string; target: string; at: bigint; end: bigint }[], lite_context: string, lite_genericType: string): { kind: string; next: bigint } {
        void lite_source;
        void lite_position;
        void lite_prefix;
        void lite_aliases;
        void lite_context;
        void lite_genericType;
        const lite_start = liteFn$frontend$skipTrivia(lite_source, lite_position, lite_prefix);
        void lite_start;
        if (((((lite_start) < (liteFn$lib$core$text$length(lite_source)))) && (((liteFn$lib$core$text$at(lite_source, lite_start)) === ("("))))) {
            return liteFn$frontend$parseTupleTypeAt(lite_source, lite_position, lite_prefix, [...(lite_aliases)]);
        }
        if (((((lite_start) < (liteFn$lib$core$text$length(lite_source)))) && (((liteFn$lib$core$text$at(lite_source, lite_start)) === ("["))))) {
            const lite_elemStart = liteFn$frontend$skipTrivia(lite_source, lite$addInt(lite_start, 1n, 48823), lite_prefix);
            void lite_elemStart;
            const lite_inner = liteFn$frontend$parseTypeAt(lite_source, lite_elemStart, lite_prefix, [...(lite_aliases)], lite_context, lite_genericType);
            void lite_inner;
            if ((((lite_inner).kind) === ("Unit"))) {
                liteFn$frontend$failAt(lite_source, lite_elemStart, lite_prefix, "unsupported array element type Unit");
            }
            const lite_semi = liteFn$frontend$expectSymbol(lite_source, liteFn$frontend$skipTrivia(lite_source, (lite_inner).next, lite_prefix), ";", lite_prefix);
            void lite_semi;
            const lite_extentStart = liteFn$frontend$skipTrivia(lite_source, lite_semi, lite_prefix);
            void lite_extentStart;
            let lite_extentEnd = lite_extentStart;
            void lite_extentEnd;
            while (((((lite_extentEnd) < (liteFn$lib$core$text$length(lite_source)))) && (liteFn$lib$core$text$isDigit(liteFn$lib$core$text$at(lite_source, lite_extentEnd))))) {
                lite_extentEnd = lite$addInt(lite_extentEnd, 1n, 49369);
            }
            if (((lite_extentEnd) === (lite_extentStart))) {
                liteFn$frontend$failAt(lite_source, lite_extentStart, lite_prefix, "expected positive integer extent in array type");
            }
            const lite_extent = liteFn$frontend$parseDigits(lite_source, lite_extentStart, lite_extentEnd);
            void lite_extent;
            const lite_close = liteFn$frontend$expectSymbol(lite_source, liteFn$frontend$skipTrivia(lite_source, lite_extentEnd, lite_prefix), "]", lite_prefix);
            void lite_close;
            return { kind: (((((((("[") + ((lite_inner).kind))) + (";"))) + (liteFn$lib$core$int$intText(lite_extent)))) + ("]")), next: lite_close };
        }
        const lite_parsedName = liteFn$frontend$typeNameAt(lite_source, lite_start, lite_prefix);
        void lite_parsedName;
        const lite_after = (lite_parsedName).next;
        void lite_after;
        const lite_name = (lite_parsedName).name;
        void lite_name;
        const lite_afterName = liteFn$frontend$skipTrivia(lite_source, lite_after, lite_prefix);
        void lite_afterName;
        if (((((((lite_name) === ("List"))) && (((lite_afterName) < (liteFn$lib$core$text$length(lite_source)))))) && (((liteFn$lib$core$text$at(lite_source, lite_afterName)) === ("<"))))) {
            const lite_innerStart = liteFn$frontend$skipTrivia(lite_source, lite$addInt(lite_afterName, 1n, 50104), lite_prefix);
            void lite_innerStart;
            if (((((lite_innerStart) >= (liteFn$lib$core$text$length(lite_source)))) || (((liteFn$lib$core$text$at(lite_source, lite_innerStart)) === (">"))))) {
                liteFn$frontend$failAt(lite_source, lite_innerStart, lite_prefix, "expected a list element type");
            }
            const lite_inner = liteFn$frontend$parseTypeAt(lite_source, lite_innerStart, lite_prefix, [...(lite_aliases)], lite_context, lite_genericType);
            void lite_inner;
            if (liteFn$frontend$isListKind((lite_inner).kind)) {
                liteFn$frontend$failAt(lite_source, lite_innerStart, lite_prefix, "nested list types are not supported");
            }
            let lite_close = liteFn$frontend$skipTrivia(lite_source, (lite_inner).next, lite_prefix);
            void lite_close;
            lite_close = liteFn$frontend$expectSymbol(lite_source, lite_close, ">", lite_prefix);
            return { kind: (((("List<") + ((lite_inner).kind))) + (">")), next: lite_close };
        }
        if (((((lite_genericType) !== (""))) && (((lite_name) === (lite_genericType))))) {
            return { kind: lite_genericType, next: lite_after };
        }
        if (((((((((((((lite_name) === ("Int"))) || (((lite_name) === ("Float"))))) || (((lite_name) === ("String"))))) || (((lite_name) === ("Bool"))))) || (((lite_name) === ("Unit"))))) || (liteFn$numeric__literals$isNarrowNumericKind(lite_name)))) {
            return { kind: lite_name, next: lite_after };
        }
        const lite_numericKind = liteFn$numeric__literals$numericAliasKind(lite_name);
        void lite_numericKind;
        if (((lite_numericKind) !== (""))) {
            return { kind: lite_numericKind, next: lite_after };
        }
        if (((liteFn$frontend$findAlias([...(lite_aliases)], lite_name)) >= (0n))) {
            const lite_seen: string[] = [...([])];
            void lite_seen;
            return { kind: liteFn$frontend$resolveAliasKind(lite_source, lite_start, lite_prefix, [...(lite_aliases)], lite_name, [...(lite_seen)]), next: lite_after };
        }
        if (((liteFn$lib$core$text$indexOfText(lite_name, ".", 0n)) >= (0n))) {
            liteFn$frontend$failAt(lite_source, lite_start, lite_prefix, (("unknown type alias ") + (lite_name)));
        }
        liteFn$frontend$failAt(lite_source, lite_start, lite_prefix, (((((("unsupported ") + (lite_context))) + (" type "))) + (lite_name)));
        return { kind: "", next: lite_after };
    }
    void liteFn$frontend$parseTypeAt;
    function liteFn$frontend$parseFunctionType(lite_source: string, lite_position: bigint, lite_prefix: string, lite_aliases: { name: string; target: string; at: bigint; end: bigint }[], lite_genericType: string): { kind: string; next: bigint } {
        void lite_source;
        void lite_position;
        void lite_prefix;
        void lite_aliases;
        void lite_genericType;
        return liteFn$frontend$parseTypeAt(lite_source, lite_position, lite_prefix, [...(lite_aliases)], "function", lite_genericType);
    }
    void liteFn$frontend$parseFunctionType;
    function liteFn$frontend$parseFunctionHeader(lite_source: string, lite_position: bigint, lite_prefix: string, lite_aliases: { name: string; target: string; at: bigint; end: bigint }[], lite_listIntrinsic: boolean): { next: bigint; result: string; params: string; count: bigint; genericType: string } {
        void lite_source;
        void lite_position;
        void lite_prefix;
        void lite_aliases;
        void lite_listIntrinsic;
        const lite_size = liteFn$lib$core$text$length(lite_source);
        void lite_size;
        let lite_cursor = liteFn$frontend$skipTrivia(lite_source, lite_position, lite_prefix);
        void lite_cursor;
        let lite_genericType = "";
        void lite_genericType;
        if (lite_listIntrinsic) {
            lite_cursor = liteFn$frontend$expectSymbol(lite_source, lite_cursor, "<", lite_prefix);
            const lite_binderStart = liteFn$frontend$skipTrivia(lite_source, lite_cursor, lite_prefix);
            void lite_binderStart;
            const lite_binder = liteFn$frontend$typeNameAt(lite_source, lite_binderStart, lite_prefix);
            void lite_binder;
            if ((((lite_binder).name) !== ("T"))) {
                liteFn$frontend$failAt(lite_source, lite_binderStart, lite_prefix, "core list intrinsic type parameter must be T");
            }
            lite_genericType = (lite_binder).name;
            lite_cursor = liteFn$frontend$expectSymbol(lite_source, (lite_binder).next, ">", lite_prefix);
            lite_cursor = liteFn$frontend$skipTrivia(lite_source, lite_cursor, lite_prefix);
        }
        lite_cursor = liteFn$frontend$expectSymbol(lite_source, lite_cursor, "(", lite_prefix);
        lite_cursor = liteFn$frontend$skipTrivia(lite_source, lite_cursor, lite_prefix);
        const lite_names: string[] = [...([])];
        void lite_names;
        let lite_encoded = "";
        void lite_encoded;
        let lite_count = 0n;
        void lite_count;
        if (liteFn$lib$core$text$startsWithAt(lite_source, lite_cursor, "...")) {
            lite_cursor = liteFn$frontend$skipTrivia(lite_source, lite$addInt(lite_cursor, 3n, 53063), lite_prefix);
            if (((((lite_cursor) >= (lite_size))) || ((!(liteFn$lib$core$text$isNameStart(liteFn$lib$core$text$at(lite_source, lite_cursor))))))) {
                liteFn$frontend$failAt(lite_source, lite_cursor, lite_prefix, "expected a name after ... in host value-pack declaration");
            }
            const lite_nameStart = lite_cursor;
            void lite_nameStart;
            lite_cursor = liteFn$lib$core$text$skipName(lite_source, lite_cursor);
            lite_encoded = (("...") + (liteFn$lib$core$text$slice(lite_source, lite_nameStart, lite_cursor)));
            lite_count = (-1n);
            lite_cursor = liteFn$frontend$skipTrivia(lite_source, lite_cursor, lite_prefix);
            if (((((lite_cursor) < (lite_size))) && (((liteFn$lib$core$text$at(lite_source, lite_cursor)) === (","))))) {
                liteFn$frontend$failAt(lite_source, lite_cursor, lite_prefix, "host value-pack declaration must be its only parameter");
            }
        } else if (((((lite_cursor) < (lite_size))) && (((liteFn$lib$core$text$at(lite_source, lite_cursor)) !== (")"))))) {
            while (Boolean(true)) {
                if (((((lite_cursor) >= (lite_size))) || ((!(liteFn$lib$core$text$isNameStart(liteFn$lib$core$text$at(lite_source, lite_cursor))))))) {
                    liteFn$frontend$failAt(lite_source, lite_cursor, lite_prefix, "expected a parameter name");
                }
                const lite_nameStart = lite_cursor;
                void lite_nameStart;
                lite_cursor = liteFn$lib$core$text$skipName(lite_source, lite_cursor);
                const lite_parameterName = liteFn$lib$core$text$slice(lite_source, lite_nameStart, lite_cursor);
                void lite_parameterName;
                if (liteFn$frontend$isReservedWord(lite_parameterName)) {
                    liteFn$frontend$unsupportedFeature(lite_source, lite_nameStart, lite_parameterName, lite_prefix);
                }
                if (liteFn$lib$core$list$listContainsText([...(lite_names)], lite_parameterName)) {
                    liteFn$frontend$failAt(lite_source, lite_nameStart, lite_prefix, (("duplicate parameter ") + (lite_parameterName)));
                }
                lite_names.push(lite_parameterName);
                lite_cursor = liteFn$frontend$skipTrivia(lite_source, lite_cursor, lite_prefix);
                lite_cursor = liteFn$frontend$expectSymbol(lite_source, lite_cursor, ":", lite_prefix);
                lite_cursor = liteFn$frontend$skipTrivia(lite_source, lite_cursor, lite_prefix);
                let lite_access = "";
                void lite_access;
                if (liteFn$lib$core$text$wordAt(lite_source, lite_cursor, "mut")) {
                    if ((!(lite_listIntrinsic))) {
                        liteFn$frontend$failAt(lite_source, lite_cursor, lite_prefix, "mut parameter signatures are reserved for registered core declarations");
                    }
                    lite_access = "mut ";
                    lite_cursor = liteFn$frontend$skipTrivia(lite_source, lite$addInt(lite_cursor, 3n, 54928), lite_prefix);
                }
                const lite_typed = liteFn$frontend$parseFunctionType(lite_source, lite_cursor, lite_prefix, [...(lite_aliases)], lite_genericType);
                void lite_typed;
                lite_cursor = liteFn$frontend$skipTrivia(lite_source, (lite_typed).next, lite_prefix);
                if (((lite_count) > (0n))) {
                    lite_encoded = ((lite_encoded) + ("|"));
                }
                lite_encoded = ((((((((lite_encoded) + (lite_parameterName))) + ("="))) + (lite_access))) + ((lite_typed).kind));
                lite_count = lite$addInt(lite_count, 1n, 55258);
                if (((((lite_cursor) < (lite_size))) && (((liteFn$lib$core$text$at(lite_source, lite_cursor)) === (","))))) {
                    lite_cursor = liteFn$frontend$skipTrivia(lite_source, lite$addInt(lite_cursor, 1n, 55383), lite_prefix);
                } else {
                    break;
                }
            }
        }
        lite_cursor = liteFn$frontend$expectSymbol(lite_source, lite_cursor, ")", lite_prefix);
        lite_cursor = liteFn$frontend$skipTrivia(lite_source, lite_cursor, lite_prefix);
        lite_cursor = liteFn$frontend$expectSymbol(lite_source, lite_cursor, ":", lite_prefix);
        const lite_resultType = liteFn$frontend$parseFunctionType(lite_source, lite_cursor, lite_prefix, [...(lite_aliases)], lite_genericType);
        void lite_resultType;
        return { next: (lite_resultType).next, result: (lite_resultType).kind, params: lite_encoded, count: lite_count, genericType: lite_genericType };
    }
    void liteFn$frontend$parseFunctionHeader;
    function liteFn$frontend$coreHostFunction(lite_moduleIdentity: string, lite_name: string, lite_params: string, lite_result: string): string {
        void lite_moduleIdentity;
        void lite_name;
        void lite_params;
        void lite_result;
        return (Boolean(((lite_moduleIdentity) === ("lite.core.io.v1"))) ? (Boolean(((((lite_params) === ("...values"))) && (((lite_result) === ("Unit"))))) ? (Boolean(((lite_name) === ("output"))) ? "lite$core$io$output:v1" : (Boolean(((lite_name) === ("outputLine"))) ? "lite$core$io$outputLine:v1" : "")) : (Boolean(((((((lite_name) === ("errorLine"))) && (((lite_params) === ("text=String"))))) && (((lite_result) === ("Unit"))))) ? "lite$reportError" : (Boolean(((((((lite_name) === ("exit"))) && (((lite_params) === ("status=Int"))))) && (((lite_result) === ("Unit"))))) ? "lite$exit" : (Boolean(((((((lite_name) === ("inputArgs"))) && (((lite_params) === (""))))) && (((lite_result) === ("List<String>"))))) ? "lite$inputArgs" : (Boolean(((((lite_params) === ("prompt=String"))) && (((lite_result) === ("String"))))) ? (Boolean(((lite_name) === ("inputAll"))) ? "lite$inputAll" : (Boolean(((lite_name) === ("inputLine"))) ? "lite$inputLine" : "")) : (Boolean(((((((lite_params) === ("prompt=String"))) && (((lite_result) === ("Int"))))) && (((lite_name) === ("inputInt"))))) ? "lite$inputInt" : (Boolean(((((((lite_params) === ("prompt=String"))) && (((lite_result) === ("Float"))))) && (((lite_name) === ("inputFloat"))))) ? "lite$inputFloat" : ""))))))) : (Boolean(((lite_moduleIdentity) === ("lite.core.text.v1"))) ? (Boolean(((((((lite_name) === ("length"))) && (((lite_params) === ("text=String"))))) && (((lite_result) === ("Int"))))) ? "lite$textLength" : (Boolean(((((((lite_name) === ("at"))) && (((lite_params) === ("text=String|position=Int"))))) && (((lite_result) === ("String"))))) ? "lite$textAt" : (Boolean(((((((lite_name) === ("slice"))) && (((lite_params) === ("text=String|start=Int|end=Int"))))) && (((lite_result) === ("String"))))) ? "lite$textSlice" : ""))) : (Boolean(((lite_moduleIdentity) === ("lite.core.list.v1"))) ? (Boolean(((((((lite_name) === ("pushBack"))) && (((lite_params) === ("values=mut List<T>|value=T"))))) && (((lite_result) === ("Unit"))))) ? "lite$core$list$pushBack:v1" : (Boolean(((((((lite_name) === ("popBack"))) && (((lite_params) === ("values=mut List<T>"))))) && (((lite_result) === ("T"))))) ? "lite$core$list$popBack:v1" : (Boolean(((((((lite_name) === ("pushFront"))) && (((lite_params) === ("values=mut List<T>|value=T"))))) && (((lite_result) === ("Unit"))))) ? "lite$core$list$pushFront:v1" : (Boolean(((((((lite_name) === ("popFront"))) && (((lite_params) === ("values=mut List<T>"))))) && (((lite_result) === ("T"))))) ? "lite$core$list$popFront:v1" : "")))) : (Boolean(((((((((lite_moduleIdentity) === ("lite.compiler.source-reader.v1"))) && (((lite_name) === ("read"))))) && (((lite_params) === ("importer=String|spec=String"))))) && (((lite_result) === ("(path:String,display:String,identity:String,text:String)"))))) ? "lite$readSource" : ""))));
    }
    void liteFn$frontend$coreHostFunction;
    function liteFn$frontend$coreOutputName(lite_runtime: string): string {
        void lite_runtime;
        return (Boolean(((lite_runtime) === ("lite$core$io$output:v1"))) ? "output" : (Boolean(((lite_runtime) === ("lite$core$io$outputLine:v1"))) ? "outputLine" : ""));
    }
    void liteFn$frontend$coreOutputName;
    function liteFn$frontend$paramNameOf(lite_entry: string): string {
        void lite_entry;
        const lite_separator = liteFn$lib$core$text$indexOfText(lite_entry, "=", 0n);
        void lite_separator;
        if (((lite_separator) < (0n))) {
            return lite_entry;
        }
        return liteFn$lib$core$text$slice(lite_entry, 0n, lite_separator);
    }
    void liteFn$frontend$paramNameOf;
    function liteFn$frontend$paramKindOf(lite_entry: string): string {
        void lite_entry;
        const lite_separator = liteFn$lib$core$text$indexOfText(lite_entry, "=", 0n);
        void lite_separator;
        if (((lite_separator) < (0n))) {
            return "";
        }
        return liteFn$lib$core$text$slice(lite_entry, lite$addInt(lite_separator, 1n, 59096), liteFn$lib$core$text$length(lite_entry));
    }
    void liteFn$frontend$paramKindOf;
    function liteFn$frontend$typedIntParsed(lite_kind: string, lite_code: string, lite_value: bigint, lite_constant: boolean, lite_next: bigint): { kind: string; code: string; intValue: bigint; textValue: string; constant: boolean; next: bigint } {
        void lite_kind;
        void lite_code;
        void lite_value;
        void lite_constant;
        void lite_next;
        return { kind: lite_kind, code: lite_code, intValue: lite_value, textValue: "", constant: lite_constant, next: lite_next };
    }
    void liteFn$frontend$typedIntParsed;
    function liteFn$frontend$intParsed(lite_code: string, lite_value: bigint, lite_constant: boolean, lite_next: bigint): { kind: string; code: string; intValue: bigint; textValue: string; constant: boolean; next: bigint } {
        void lite_code;
        void lite_value;
        void lite_constant;
        void lite_next;
        return liteFn$frontend$typedIntParsed("Int", lite_code, lite_value, lite_constant, lite_next);
    }
    void liteFn$frontend$intParsed;
    function liteFn$frontend$textParsed(lite_code: string, lite_value: string, lite_constant: boolean, lite_next: bigint): { kind: string; code: string; intValue: bigint; textValue: string; constant: boolean; next: bigint } {
        void lite_code;
        void lite_value;
        void lite_constant;
        void lite_next;
        return { kind: "String", code: lite_code, intValue: 0n, textValue: lite_value, constant: lite_constant, next: lite_next };
    }
    void liteFn$frontend$textParsed;
    function liteFn$frontend$boolParsed(lite_code: string, lite_value: boolean, lite_constant: boolean, lite_next: bigint): { kind: string; code: string; intValue: bigint; textValue: string; constant: boolean; next: bigint } {
        void lite_code;
        void lite_value;
        void lite_constant;
        void lite_next;
        return { kind: "Bool", code: lite_code, intValue: (Boolean(lite_value) ? 1n : 0n), textValue: "", constant: lite_constant, next: lite_next };
    }
    void liteFn$frontend$boolParsed;
    function liteFn$frontend$tryFoldInteger(lite_operator: string, lite_left: bigint, lite_right: bigint): { value: bigint; ok: boolean } {
        void lite_operator;
        void lite_left;
        void lite_right;
        if (((lite_operator) === ("+"))) {
            return liteFn$lib$core$int$intAdd(lite_left, lite_right);
        }
        if (((lite_operator) === ("-"))) {
            return liteFn$lib$core$int$intSubtract(lite_left, lite_right);
        }
        if (((lite_operator) === ("*"))) {
            return liteFn$lib$core$int$intMultiply(lite_left, lite_right);
        }
        if (((lite_operator) === ("/"))) {
            return liteFn$lib$core$int$intDivide(lite_left, lite_right);
        }
        if (((lite_operator) === ("%"))) {
            return liteFn$lib$core$int$intRemainder(lite_left, lite_right);
        }
        if (((lite_operator) === (":/"))) {
            return liteFn$lib$core$int$intFloorDivide(lite_left, lite_right);
        }
        return liteFn$lib$core$int$intFloorModulo(lite_left, lite_right);
    }
    void liteFn$frontend$tryFoldInteger;
    function liteFn$frontend$runtimeIntegerCode(lite_target: string, lite_operator: string, lite_left: string, lite_right: string, lite_position: bigint): string {
        void lite_target;
        void lite_operator;
        void lite_left;
        void lite_right;
        void lite_position;
        if (((lite_operator) === ("+"))) {
            return liteFn$frontend$targetIntAddCode(lite_target, lite_left, lite_right, lite_position);
        }
        if (((lite_operator) === ("-"))) {
            return liteFn$frontend$targetIntSubtractCode(lite_target, lite_left, lite_right, lite_position);
        }
        if (((lite_operator) === ("*"))) {
            return liteFn$frontend$targetIntMultiplyCode(lite_target, lite_left, lite_right, lite_position);
        }
        if (((lite_operator) === ("/"))) {
            return liteFn$frontend$targetIntDivideCode(lite_target, lite_left, lite_right, lite_position);
        }
        if (((lite_operator) === ("%"))) {
            return liteFn$frontend$targetIntRemainderCode(lite_target, lite_left, lite_right, lite_position);
        }
        if (((lite_operator) === (":/"))) {
            return liteFn$frontend$targetIntFloorDivideCode(lite_target, lite_left, lite_right, lite_position);
        }
        return liteFn$frontend$targetIntFloorModuloCode(lite_target, lite_left, lite_right, lite_position);
    }
    void liteFn$frontend$runtimeIntegerCode;
    function liteFn$frontend$runtimeTypedIntegerCode(lite_target: string, lite_kind: string, lite_operator: string, lite_left: string, lite_right: string, lite_position: bigint): string {
        void lite_target;
        void lite_kind;
        void lite_operator;
        void lite_left;
        void lite_right;
        void lite_position;
        const lite_raw = liteFn$frontend$runtimeIntegerCode(lite_target, lite_operator, lite_left, lite_right, lite_position);
        void lite_raw;
        if (((((liteFn$numeric__literals$isNarrowIntKind(lite_kind)) && (((lite_operator) !== ("%"))))) && (((lite_operator) !== (":%"))))) {
            return liteFn$frontend$targetCheckedNarrowIntCode(lite_target, lite_kind, lite_raw, lite_position);
        }
        return lite_raw;
    }
    void liteFn$frontend$runtimeTypedIntegerCode;
    function liteFn$frontend$localIndex(lite_locals: { name: string; runtime: string; kind: string; mutable: boolean; writable: boolean; depth: bigint; constant: boolean; code: string; intValue: bigint; textValue: string; initState: string }[], lite_name: string): bigint {
        void lite_locals;
        void lite_name;
        let lite_index = 0n;
        void lite_index;
        let lite_found = (-1n);
        void lite_found;
        for (const lite_local of [...(lite_locals)]) {
            void lite_local;
            if ((((lite_local).name) === (lite_name))) {
                lite_found = lite_index;
            }
            lite_index = lite$addInt(lite_index, 1n, 62386);
        }
        return lite_found;
    }
    void liteFn$frontend$localIndex;
    function liteFn$frontend$localsUseRuntime(lite_locals: { name: string; runtime: string; kind: string; mutable: boolean; writable: boolean; depth: bigint; constant: boolean; code: string; intValue: bigint; textValue: string; initState: string }[], lite_runtime: string): boolean {
        void lite_locals;
        void lite_runtime;
        for (const lite_local of [...(lite_locals)]) {
            void lite_local;
            if ((((lite_local).runtime) === (lite_runtime))) {
                return true;
            }
        }
        return false;
    }
    void liteFn$frontend$localsUseRuntime;
    function liteFn$frontend$moduleValueRuntime(lite_target: string, lite_moduleKey: string, lite_name: string): string {
        void lite_target;
        void lite_moduleKey;
        void lite_name;
        if (((lite_moduleKey) === (""))) {
            return (("lite_") + (lite_name));
        }
        if (((lite_target) === ("ts"))) {
            return (((((("lite$m$") + (lite_moduleKey))) + ("$"))) + (lite_name));
        }
        return (((((("lt_m_") + (lite_moduleKey))) + ("__"))) + (lite_name));
    }
    void liteFn$frontend$moduleValueRuntime;
    function liteFn$frontend$moduleFunctionRuntime(lite_target: string, lite_moduleKey: string, lite_name: string): string {
        void lite_target;
        void lite_moduleKey;
        void lite_name;
        if (((lite_moduleKey) === (""))) {
            if (((lite_target) === ("ts"))) {
                return (("liteFn_") + (lite_name));
            }
            return (("lt_fn__") + (lite_name));
        }
        if (((lite_target) === ("ts"))) {
            return (((((("liteFn$") + (lite_moduleKey))) + ("$"))) + (lite_name));
        }
        return (((((("lt_fn_") + (lite_moduleKey))) + ("__"))) + (lite_name));
    }
    void liteFn$frontend$moduleFunctionRuntime;
    function liteFn$frontend$freshScopeTemp(lite_locals: { name: string; runtime: string; kind: string; mutable: boolean; writable: boolean; depth: bigint; constant: boolean; code: string; intValue: bigint; textValue: string; initState: string }[], lite_prefix: string): string {
        void lite_locals;
        void lite_prefix;
        if ((!(liteFn$frontend$localsUseRuntime([...(lite_locals)], lite_prefix)))) {
            return lite_prefix;
        }
        let lite_suffix = 2n;
        void lite_suffix;
        while (Boolean(true)) {
            const lite_candidate = ((((lite_prefix) + ("$"))) + (liteFn$lib$core$int$intText(lite_suffix)));
            void lite_candidate;
            if ((!(liteFn$frontend$localsUseRuntime([...(lite_locals)], lite_candidate)))) {
                return lite_candidate;
            }
            lite_suffix = lite$addInt(lite_suffix, 1n, 63795);
        }
        return lite_prefix;
    }
    void liteFn$frontend$freshScopeTemp;
    function liteFn$frontend$localRuntimeName(lite_target: string, lite_locals: { name: string; runtime: string; kind: string; mutable: boolean; writable: boolean; depth: bigint; constant: boolean; code: string; intValue: bigint; textValue: string; initState: string }[], lite_name: string, lite_moduleKey: string, lite_depth: bigint): string {
        void lite_target;
        void lite_locals;
        void lite_name;
        void lite_moduleKey;
        void lite_depth;
        if (((((lite_depth) === (0n))) && (((lite_moduleKey) !== (""))))) {
            return liteFn$frontend$moduleValueRuntime(lite_target, lite_moduleKey, lite_name);
        }
        const lite_base = (("lite_") + (lite_name));
        void lite_base;
        if ((!(liteFn$frontend$localsUseRuntime([...(lite_locals)], lite_base)))) {
            return lite_base;
        }
        let lite_suffix = 2n;
        void lite_suffix;
        while (Boolean(true)) {
            const lite_candidate = (Boolean(((lite_target) === ("ts"))) ? (((((("lite_") + (lite_name))) + ("$"))) + (liteFn$lib$core$int$intText(lite_suffix))) : (((((("lt_s") + (liteFn$lib$core$int$intText(lite_suffix)))) + ("_"))) + (lite_name)));
            void lite_candidate;
            if ((!(liteFn$frontend$localsUseRuntime([...(lite_locals)], lite_candidate)))) {
                return lite_candidate;
            }
            lite_suffix = lite$addInt(lite_suffix, 1n, 64561);
        }
        return lite_base;
    }
    void liteFn$frontend$localRuntimeName;
    function liteFn$frontend$isComparison(lite_operator: string): boolean {
        void lite_operator;
        return ((((((((((((((((((((lite_operator) === ("=="))) || (((lite_operator) === ("=!="))))) || (((lite_operator) === ("<"))))) || (((lite_operator) === ("<!"))))) || (((lite_operator) === ("<="))))) || (((lite_operator) === ("<!="))))) || (((lite_operator) === (">"))))) || (((lite_operator) === (">!"))))) || (((lite_operator) === (">="))))) || (((lite_operator) === (">!="))));
    }
    void liteFn$frontend$isComparison;
    function liteFn$frontend$operatorLevel(lite_operator: string): bigint {
        void lite_operator;
        return (Boolean(((lite_operator) === ("or"))) ? 2n : (Boolean(((lite_operator) === ("and"))) ? 3n : (Boolean(liteFn$frontend$isComparison(lite_operator)) ? 5n : (Boolean(((((lite_operator) === ("+"))) || (((lite_operator) === ("-"))))) ? 10n : (Boolean(((((((((((lite_operator) === ("*"))) || (((lite_operator) === ("/"))))) || (((lite_operator) === ("%"))))) || (((lite_operator) === (":/"))))) || (((lite_operator) === (":%"))))) ? 20n : (Boolean(((lite_operator) === ("**"))) ? 25n : 0n))))));
    }
    void liteFn$frontend$operatorLevel;
    function liteFn$frontend$readOperator(lite_source: string, lite_position: bigint): { text: string; width: bigint } {
        void lite_source;
        void lite_position;
        const lite_ch = liteFn$lib$core$text$at(lite_source, lite_position);
        void lite_ch;
        if (((lite_ch) === ("*"))) {
            if (liteFn$lib$core$text$startsWithAt(lite_source, lite_position, "**")) {
                return { text: "**", width: 2n };
            }
            return { text: "*", width: 1n };
        }
        if (liteFn$lib$core$text$startsWithAt(lite_source, lite_position, "=!=")) {
            return { text: "=!=", width: 3n };
        }
        if (liteFn$lib$core$text$startsWithAt(lite_source, lite_position, "<!=")) {
            return { text: "<!=", width: 3n };
        }
        if (liteFn$lib$core$text$startsWithAt(lite_source, lite_position, ">!=")) {
            return { text: ">!=", width: 3n };
        }
        if (liteFn$lib$core$text$startsWithAt(lite_source, lite_position, "==")) {
            return { text: "==", width: 2n };
        }
        if (liteFn$lib$core$text$startsWithAt(lite_source, lite_position, "<=")) {
            return { text: "<=", width: 2n };
        }
        if (liteFn$lib$core$text$startsWithAt(lite_source, lite_position, ">=")) {
            return { text: ">=", width: 2n };
        }
        if (liteFn$lib$core$text$startsWithAt(lite_source, lite_position, "<!")) {
            return { text: "<!", width: 2n };
        }
        if (liteFn$lib$core$text$startsWithAt(lite_source, lite_position, ">!")) {
            return { text: ">!", width: 2n };
        }
        if (((lite_ch) === ("<"))) {
            return { text: "<", width: 1n };
        }
        if (((lite_ch) === (">"))) {
            return { text: ">", width: 1n };
        }
        if (((((((((lite_ch) === ("+"))) || (((lite_ch) === ("-"))))) || (((lite_ch) === ("/"))))) || (((lite_ch) === ("%"))))) {
            return { text: lite_ch, width: 1n };
        }
        if (liteFn$lib$core$text$startsWithAt(lite_source, lite_position, ":/")) {
            return { text: ":/", width: 2n };
        }
        if (liteFn$lib$core$text$startsWithAt(lite_source, lite_position, ":%")) {
            return { text: ":%", width: 2n };
        }
        if (liteFn$lib$core$text$isNameStart(lite_ch)) {
            const lite_after = liteFn$lib$core$text$skipName(lite_source, lite_position);
            void lite_after;
            const lite_word = liteFn$lib$core$text$slice(lite_source, lite_position, lite_after);
            void lite_word;
            if (((((lite_word) === ("and"))) || (((lite_word) === ("or"))))) {
                return { text: lite_word, width: lite$subtractInt(lite_after, lite_position, 67104) };
            }
        }
        return { text: "", width: 0n };
    }
    void liteFn$frontend$readOperator;
    function liteFn$frontend$binaryFollows(lite_source: string, lite_next: bigint, lite_prefix: string, lite_minimum: bigint): boolean {
        void lite_source;
        void lite_next;
        void lite_prefix;
        void lite_minimum;
        const lite_cursor = liteFn$frontend$skipTrivia(lite_source, lite_next, lite_prefix);
        void lite_cursor;
        if (((lite_cursor) >= (liteFn$lib$core$text$length(lite_source)))) {
            return false;
        }
        const lite_operator = liteFn$frontend$readOperator(lite_source, lite_cursor);
        void lite_operator;
        return (((((lite_operator).text) !== (""))) && (((liteFn$frontend$operatorLevel((lite_operator).text)) >= (lite_minimum))));
    }
    void liteFn$frontend$binaryFollows;
    function liteFn$frontend$comparisonOperatorAt(lite_source: string, lite_position: bigint): { text: string; width: bigint } {
        void lite_source;
        void lite_position;
        if (((lite_position) >= (liteFn$lib$core$text$length(lite_source)))) {
            return { text: "", width: 0n };
        }
        const lite_ch = liteFn$lib$core$text$at(lite_source, lite_position);
        void lite_ch;
        if (((((((lite_ch) === ("="))) || (((lite_ch) === ("<"))))) || (((lite_ch) === (">"))))) {
            return liteFn$frontend$readOperator(lite_source, lite_position);
        }
        return { text: "", width: 0n };
    }
    void liteFn$frontend$comparisonOperatorAt;
    function liteFn$frontend$compareIntegers(lite_operator: string, lite_left: bigint, lite_right: bigint): boolean {
        void lite_operator;
        void lite_left;
        void lite_right;
        return (Boolean(((lite_operator) === ("=="))) ? ((lite_left) === (lite_right)) : (Boolean(((lite_operator) === ("=!="))) ? ((lite_left) !== (lite_right)) : (Boolean(((lite_operator) === ("<"))) ? ((lite_left) < (lite_right)) : (Boolean(((lite_operator) === ("<!"))) ? ((lite_left) >= (lite_right)) : (Boolean(((lite_operator) === ("<="))) ? ((lite_left) <= (lite_right)) : (Boolean(((lite_operator) === ("<!="))) ? ((lite_left) > (lite_right)) : (Boolean(((lite_operator) === (">"))) ? ((lite_left) > (lite_right)) : (Boolean(((lite_operator) === (">!"))) ? ((lite_left) <= (lite_right)) : (Boolean(((lite_operator) === (">="))) ? ((lite_left) >= (lite_right)) : ((lite_left) < (lite_right)))))))))));
    }
    void liteFn$frontend$compareIntegers;
    function liteFn$frontend$compareTexts(lite_operator: string, lite_left: string, lite_right: string): boolean {
        void lite_operator;
        void lite_left;
        void lite_right;
        return (Boolean(((lite_operator) === ("=="))) ? ((lite_left) === (lite_right)) : ((lite_left) !== (lite_right)));
    }
    void liteFn$frontend$compareTexts;
    function liteFn$frontend$compareBools(lite_operator: string, lite_left: boolean, lite_right: boolean): boolean {
        void lite_operator;
        void lite_left;
        void lite_right;
        return (Boolean(((lite_operator) === ("=="))) ? (Boolean(lite_left) === Boolean(lite_right)) : (Boolean(lite_left) !== Boolean(lite_right)));
    }
    void liteFn$frontend$compareBools;
    function liteFn$frontend$compareParsed(lite_target: string, lite_source: string, lite_at: bigint, lite_operator: string, lite_left: { kind: string; code: string; intValue: bigint; textValue: string; constant: boolean; next: bigint }, lite_right: { kind: string; code: string; intValue: bigint; textValue: string; constant: boolean; next: bigint }, lite_prefix: string): { kind: string; code: string; intValue: bigint; textValue: string; constant: boolean; next: bigint } {
        void lite_target;
        void lite_source;
        void lite_at;
        void lite_operator;
        void lite_left;
        void lite_right;
        void lite_prefix;
        if (((liteFn$numeric__literals$isIntKind((lite_left).kind)) && (liteFn$numeric__literals$isIntKind((lite_right).kind)))) {
            if ((((lite_left).constant) && ((lite_right).constant))) {
                const lite_value = liteFn$frontend$compareIntegers(lite_operator, (lite_left).intValue, (lite_right).intValue);
                void lite_value;
                return liteFn$frontend$boolParsed(liteFn$frontend$targetBoolLiteralCode(lite_target, lite_value), lite_value, true, (lite_right).next);
            }
            return liteFn$frontend$boolParsed(liteFn$frontend$targetComparisonCode(lite_target, lite_operator, "Int", (lite_left).code, (lite_right).code), false, false, (lite_right).next);
        }
        if (((liteFn$numeric__literals$isNumericKind((lite_left).kind)) && (liteFn$numeric__literals$isNumericKind((lite_right).kind)))) {
            const lite_codes: string[] = [...([(lite_left).code, (lite_right).code])];
            void lite_codes;
            const lite_kinds: string[] = [...([(lite_left).kind, (lite_right).kind])];
            void lite_kinds;
            const lite_operators: string[] = [...([lite_operator])];
            void lite_operators;
            return liteFn$frontend$boolParsed(liteFn$frontend$targetComparisonChainCode(lite_target, [...(lite_codes)], [...(lite_kinds)], [...(lite_operators)], 1n, lite_at), false, false, (lite_right).next);
        }
        if ((((lite_left).kind) !== ((lite_right).kind))) {
            liteFn$frontend$failAt(lite_source, lite_at, lite_prefix, (((((("cannot compare ") + (liteFn$frontend$displayKind((lite_left).kind)))) + (" and "))) + (liteFn$frontend$displayKind((lite_right).kind))));
        }
        if ((((lite_left).kind) === ("Never"))) {
            liteFn$frontend$failAt(lite_source, lite_at, lite_prefix, "cannot compare Never values");
        }
        if (liteFn$frontend$isTupleKind((lite_left).kind)) {
            liteFn$frontend$failAt(lite_source, lite_at, lite_prefix, "cannot compare tuple values");
        }
        if (liteFn$frontend$isListKind((lite_left).kind)) {
            liteFn$frontend$failAt(lite_source, lite_at, lite_prefix, "cannot compare list values");
        }
        if (((((lite_operator) !== ("=="))) && (((lite_operator) !== ("=!="))))) {
            liteFn$frontend$failAt(lite_source, lite_at, lite_prefix, (((("operator ") + (lite_operator))) + (" requires Int operands")));
        }
        if ((((lite_left).constant) && ((lite_right).constant))) {
            const lite_value = (Boolean((((lite_left).kind) === ("String"))) ? liteFn$frontend$compareTexts(lite_operator, (lite_left).textValue, (lite_right).textValue) : liteFn$frontend$compareBools(lite_operator, (((lite_left).intValue) !== (0n)), (((lite_right).intValue) !== (0n))));
            void lite_value;
            return liteFn$frontend$boolParsed(liteFn$frontend$targetBoolLiteralCode(lite_target, lite_value), lite_value, true, (lite_right).next);
        }
        return liteFn$frontend$boolParsed(liteFn$frontend$targetComparisonCode(lite_target, lite_operator, (lite_left).kind, (lite_left).code, (lite_right).code), false, false, (lite_right).next);
    }
    void liteFn$frontend$compareParsed;
    function liteFn$frontend$contextualIntegerParsed(lite_target: string, lite_source: string, lite_position: bigint, lite_prefix: string, lite_expected: string, lite_minimum: bigint, lite_value: bigint, lite_code: string, lite_next: bigint): { kind: string; code: string; intValue: bigint; textValue: string; constant: boolean; next: bigint } {
        void lite_target;
        void lite_source;
        void lite_position;
        void lite_prefix;
        void lite_expected;
        void lite_minimum;
        void lite_value;
        void lite_code;
        void lite_next;
        if (((((((lite_expected) !== (""))) && (((lite_expected) !== ("Int"))))) && ((!(liteFn$frontend$binaryFollows(lite_source, lite_next, lite_prefix, lite_minimum)))))) {
            if (liteFn$numeric__literals$isNarrowIntKind(lite_expected)) {
                if ((!(liteFn$numeric__literals$intKindFits(lite_expected, lite_value)))) {
                    liteFn$frontend$failAt(lite_source, lite_position, lite_prefix, (((("integer literal outside ") + (lite_expected))) + (" range")));
                }
                return liteFn$frontend$typedIntParsed(lite_expected, lite_code, lite_value, true, lite_next);
            }
            if (((lite_expected) === ("Float32"))) {
                if ((!(liteFn$numeric__literals$intExactlyFloat32(lite_value)))) {
                    liteFn$frontend$failAt(lite_source, lite_position, lite_prefix, "integer literal is not exactly representable in Float32");
                }
                return { kind: "Float32", code: liteFn$frontend$targetFloat32OperandCode(lite_target, "Int", lite_code), intValue: 0n, textValue: "", constant: false, next: lite_next };
            }
            if (((lite_expected) === ("Float"))) {
                if ((!(liteFn$numeric__literals$intExactlyFloat(lite_value)))) {
                    liteFn$frontend$failAt(lite_source, lite_position, lite_prefix, "integer literal is not exactly representable in Float");
                }
                return { kind: "Float", code: liteFn$frontend$targetFloatOperandCode(lite_target, "Int", lite_code), intValue: 0n, textValue: "", constant: false, next: lite_next };
            }
        }
        return liteFn$frontend$intParsed(lite_code, lite_value, true, lite_next);
    }
    void liteFn$frontend$contextualIntegerParsed;
    function liteFn$frontend$parseNumber(lite_target: string, lite_source: string, lite_position: bigint, lite_prefix: string, lite_expected: string, lite_minimum: bigint): { kind: string; code: string; intValue: bigint; textValue: string; constant: boolean; next: bigint } {
        void lite_target;
        void lite_source;
        void lite_position;
        void lite_prefix;
        void lite_expected;
        void lite_minimum;
        let lite_cursor = lite_position;
        void lite_cursor;
        let lite_negative = false;
        void lite_negative;
        const lite_ch = liteFn$lib$core$text$at(lite_source, lite_cursor);
        void lite_ch;
        if (((((lite_ch) === ("+"))) || (((lite_ch) === ("-"))))) {
            lite_negative = ((lite_ch) === ("-"));
            lite_cursor = liteFn$frontend$skipTrivia(lite_source, lite$addInt(lite_cursor, 1n, 73061), lite_prefix);
        }
        const lite_start = lite_cursor;
        void lite_start;
        const lite_afterDigit = lite$addInt(lite_cursor, 1n, 73127);
        void lite_afterDigit;
        const lite_following = (Boolean(((lite_afterDigit) < (liteFn$lib$core$text$length(lite_source)))) ? liteFn$lib$core$text$at(lite_source, lite_afterDigit) : "");
        void lite_following;
        if (((((((((liteFn$lib$core$text$isDigit(liteFn$lib$core$text$at(lite_source, lite_cursor))) && ((!(liteFn$lib$core$text$isDigit(lite_following)))))) && (((lite_following) !== ("."))))) && (((lite_following) !== ("e"))))) && (((lite_following) !== ("E"))))) {
            const lite_digit = liteFn$lib$core$text$digitValue(liteFn$lib$core$text$at(lite_source, lite_cursor));
            void lite_digit;
            const lite_value = (Boolean(lite_negative) ? lite$negateInt(lite_digit, 73588) : lite_digit);
            void lite_value;
            const lite_code = liteFn$frontend$targetIntLiteralCode(lite_target, lite_value, lite_negative, liteFn$lib$core$text$slice(lite_source, lite_cursor, lite_afterDigit));
            void lite_code;
            return liteFn$frontend$contextualIntegerParsed(lite_target, lite_source, lite_position, lite_prefix, lite_expected, lite_minimum, lite_value, lite_code, lite_afterDigit);
        }
        const lite_scanned = liteFn$numeric__literals$scanNumericLiteral(lite_source, lite_cursor);
        void lite_scanned;
        lite_cursor = (lite_scanned).next;
        const lite_integerEnd = (lite_scanned).integerEnd;
        void lite_integerEnd;
        if (((lite_start) === (lite_integerEnd))) {
            liteFn$frontend$failAt(lite_source, lite_position, lite_prefix, "expected a decimal numeric literal");
        }
        if ((((lite_scanned).exponentMissingAt) >= (0n))) {
            liteFn$frontend$failAt(lite_source, (lite_scanned).exponentMissingAt, lite_prefix, "expected exponent digits");
        }
        let lite_digitStart = lite_start;
        void lite_digitStart;
        while (((((lite$addInt(lite_digitStart, 1n, 74240)) < (lite_integerEnd))) && (((liteFn$lib$core$text$at(lite_source, lite_digitStart)) === ("0"))))) {
            lite_digitStart = lite$addInt(lite_digitStart, 1n, 74325);
        }
        if ((lite_scanned).floating) {
            const lite_digits = ((liteFn$lib$core$text$slice(lite_source, lite_start, lite_integerEnd)) + (liteFn$lib$core$text$slice(lite_source, (lite_scanned).fractionStart, (lite_scanned).fractionEnd)));
            void lite_digits;
            const lite_fractionCount = lite$subtractInt((lite_scanned).fractionEnd, (lite_scanned).fractionStart, 74531);
            void lite_fractionCount;
            const lite_raw = liteFn$lib$core$text$slice(lite_source, lite_digitStart, lite_cursor);
            void lite_raw;
            if (((((lite_expected) === ("Float32"))) && ((!(liteFn$frontend$binaryFollows(lite_source, lite_cursor, lite_prefix, lite_minimum)))))) {
                if ((!(liteFn$numeric__literals$finiteFloat32Digits(lite_digits, lite_fractionCount, (lite_scanned).exponent)))) {
                    liteFn$frontend$failAt(lite_source, lite_position, lite_prefix, "floating literal outside Float32 range");
                }
                return { kind: "Float32", code: liteFn$frontend$targetFloat32LiteralCode(lite_target, lite_raw, lite_negative), intValue: 0n, textValue: "", constant: false, next: lite_cursor };
            }
            if ((!(liteFn$numeric__literals$finiteFloatDigits(lite_digits, lite_fractionCount, (lite_scanned).exponent)))) {
                liteFn$frontend$failAt(lite_source, lite_position, lite_prefix, "floating literal is not finite");
            }
            const lite_code = liteFn$frontend$targetFloatLiteralCode(lite_target, lite_raw, lite_negative);
            void lite_code;
            return { kind: "Float", code: lite_code, intValue: 0n, textValue: "", constant: false, next: lite_cursor };
        }
        if ((((lite_scanned).outsideInt) || (((((!(lite_negative))) && ((((lite_scanned).magnitude) === ((-9223372036854775808n))))))))) {
            if (((liteFn$numeric__literals$isNarrowIntKind(lite_expected)) && ((!(liteFn$frontend$binaryFollows(lite_source, lite_cursor, lite_prefix, lite_minimum)))))) {
                liteFn$frontend$failAt(lite_source, lite_position, lite_prefix, (((("integer literal outside ") + (lite_expected))) + (" range")));
            }
            liteFn$frontend$failAt(lite_source, lite_position, lite_prefix, "integer literal outside signed 64-bit range");
        }
        const lite_value = (Boolean(lite_negative) ? (lite_scanned).magnitude : lite$subtractInt(0n, (lite_scanned).magnitude, 75871));
        void lite_value;
        const lite_code = liteFn$frontend$targetIntLiteralCode(lite_target, lite_value, lite_negative, liteFn$lib$core$text$slice(lite_source, lite_digitStart, lite_cursor));
        void lite_code;
        return liteFn$frontend$contextualIntegerParsed(lite_target, lite_source, lite_position, lite_prefix, lite_expected, lite_minimum, lite_value, lite_code, lite_cursor);
    }
    void liteFn$frontend$parseNumber;
    function liteFn$frontend$parseText(lite_target: string, lite_source: string, lite_position: bigint, lite_prefix: string): { kind: string; code: string; intValue: bigint; textValue: string; constant: boolean; next: bigint } {
        void lite_target;
        void lite_source;
        void lite_position;
        void lite_prefix;
        let lite_literalStart = lite_position;
        void lite_literalStart;
        let lite_cursor = lite$addInt(lite_position, 1n, 76435);
        void lite_cursor;
        let lite_value = "";
        void lite_value;
        while (Boolean(true)) {
            if (((lite_cursor) >= (liteFn$lib$core$text$length(lite_source)))) {
                liteFn$frontend$failAt(lite_source, lite_literalStart, lite_prefix, "unterminated string literal");
            }
            const lite_ch = liteFn$lib$core$text$at(lite_source, lite_cursor);
            void lite_ch;
            if (((lite_ch) === ("\""))) {
                lite_cursor = lite$addInt(lite_cursor, 1n, 76708);
                const lite_next = liteFn$frontend$skipTrivia(lite_source, lite_cursor, lite_prefix);
                void lite_next;
                if (((((lite_next) < (liteFn$lib$core$text$length(lite_source)))) && (((liteFn$lib$core$text$at(lite_source, lite_next)) === ("\""))))) {
                    lite_literalStart = lite_next;
                    lite_cursor = lite$addInt(lite_next, 1n, 76920);
                    continue;
                }
                break;
            }
            if (((lite_ch) === ("\\"))) {
                const lite_escapeStart = lite_cursor;
                void lite_escapeStart;
                lite_cursor = lite$addInt(lite_cursor, 1n, 77081);
                if (((lite_cursor) >= (liteFn$lib$core$text$length(lite_source)))) {
                    liteFn$frontend$failAt(lite_source, lite_escapeStart, lite_prefix, "unterminated string escape");
                }
                const lite_escaped = liteFn$lib$core$text$at(lite_source, lite_cursor);
                void lite_escaped;
                if (((lite_escaped) === ("n"))) {
                    lite_value = ((lite_value) + ("\n"));
                } else if (((lite_escaped) === ("t"))) {
                    lite_value = ((lite_value) + ("\t"));
                } else if (((lite_escaped) === ("r"))) {
                    lite_value = ((lite_value) + ("\r"));
                } else if (((lite_escaped) === ("\""))) {
                    lite_value = ((lite_value) + ("\""));
                } else if (((lite_escaped) === ("\\"))) {
                    lite_value = ((lite_value) + ("\\"));
                } else {
                    liteFn$frontend$failAt(lite_source, lite_escapeStart, lite_prefix, (("unsupported string escape \\") + (lite_escaped)));
                }
                lite_cursor = lite$addInt(lite_cursor, 1n, 77742);
            } else {
                lite_value = ((lite_value) + (lite_ch));
                lite_cursor = lite$addInt(lite_cursor, 1n, 77824);
            }
        }
        return liteFn$frontend$textParsed(liteFn$frontend$targetTextLiteralCode(lite_target, lite_value), lite_value, true, lite_cursor);
    }
    void liteFn$frontend$parseText;
    function liteFn$frontend$skipAliasString(lite_source: string, lite_position: bigint): bigint {
        void lite_source;
        void lite_position;
        const lite_size = liteFn$lib$core$text$length(lite_source);
        void lite_size;
        let lite_cursor = lite$addInt(lite_position, 1n, 78207);
        void lite_cursor;
        while (((lite_cursor) < (lite_size))) {
            const lite_ch = liteFn$lib$core$text$at(lite_source, lite_cursor);
            void lite_ch;
            if (((lite_ch) === ("\\"))) {
                lite_cursor = lite$addInt(lite_cursor, 2n, 78331);
            } else if (((lite_ch) === ("\""))) {
                return lite$addInt(lite_cursor, 1n, 78393);
            } else {
                lite_cursor = lite$addInt(lite_cursor, 1n, 78443);
            }
        }
        return lite_size;
    }
    void liteFn$frontend$skipAliasString;
    function liteFn$frontend$targetCodeCalls(lite_code: string, lite_existing: string): string {
        void lite_code;
        void lite_existing;
        if (((((((liteFn$lib$core$text$indexOfText(lite_code, "lite", 0n)) < (0n))) && (((liteFn$lib$core$text$indexOfText(lite_code, "lt_", 0n)) < (0n))))) && (((liteFn$lib$core$text$indexOfText(lite_code, "finally", 0n)) < (0n))))) {
            return lite_existing;
        }
        let lite_calls = lite_existing;
        void lite_calls;
        let lite_cursor = 0n;
        void lite_cursor;
        while (((lite_cursor) < (liteFn$lib$core$text$length(lite_code)))) {
            const lite_ch = liteFn$lib$core$text$at(lite_code, lite_cursor);
            void lite_ch;
            if (((lite_ch) === ("\""))) {
                lite_cursor = liteFn$frontend$skipAliasString(lite_code, lite_cursor);
            } else if (liteFn$lib$core$text$isNameStart(lite_ch)) {
                const lite_start = lite_cursor;
                void lite_start;
                lite_cursor = liteFn$lib$core$text$skipName(lite_code, lite_cursor);
                while (((((lite_cursor) < (liteFn$lib$core$text$length(lite_code)))) && (((liteFn$lib$core$text$at(lite_code, lite_cursor)) === ("$"))))) {
                    lite_cursor = liteFn$lib$core$text$skipName(lite_code, lite$addInt(lite_cursor, 1n, 79339));
                }
                const lite_name = liteFn$lib$core$text$slice(lite_code, lite_start, lite_cursor);
                void lite_name;
                if (((((lite_cursor) < (liteFn$lib$core$text$length(lite_code)))) && (((liteFn$lib$core$text$at(lite_code, lite_cursor)) === ("("))))) {
                    if ((((((((liteFn$lib$core$text$startsWithAt(lite_name, 0n, "lite$")) && ((!(liteFn$lib$core$text$startsWithAt(lite_name, 0n, "lite$m$"))))))) || (liteFn$lib$core$text$startsWithAt(lite_name, 0n, "lite_")))) || ((((((((liteFn$lib$core$text$startsWithAt(lite_name, 0n, "lt_")) && ((!(liteFn$lib$core$text$startsWithAt(lite_name, 0n, "lt_fn_")))))) && ((!(liteFn$lib$core$text$startsWithAt(lite_name, 0n, "lt_m_")))))) && ((!(liteFn$lib$core$text$startsWithAt(lite_name, 0n, "lt_s"))))))))) {
                        const lite_token = ((lite_name) + ("(|"));
                        void lite_token;
                        if (((liteFn$lib$core$text$indexOfText(lite_calls, (("|") + (lite_token)), 0n)) < (0n))) {
                            lite_calls = ((lite_calls) + (lite_token));
                        }
                    }
                } else if (((lite_name) === ("finally"))) {
                    let lite_afterFin = lite_cursor;
                    void lite_afterFin;
                    while (((((lite_afterFin) < (liteFn$lib$core$text$length(lite_code)))) && ((((((((liteFn$lib$core$text$at(lite_code, lite_afterFin)) === (" "))) || (((liteFn$lib$core$text$at(lite_code, lite_afterFin)) === ("\t"))))) || (((liteFn$lib$core$text$at(lite_code, lite_afterFin)) === ("\n")))))))) {
                        lite_afterFin = lite$addInt(lite_afterFin, 1n, 80348);
                    }
                    if (((((lite_afterFin) < (liteFn$lib$core$text$length(lite_code)))) && (((liteFn$lib$core$text$at(lite_code, lite_afterFin)) === ("{"))))) {
                        if (((liteFn$lib$core$text$indexOfText(lite_calls, "|lite$finally(|", 0n)) < (0n))) {
                            lite_calls = ((lite_calls) + ("lite$finally(|"));
                        }
                    }
                }
            } else {
                lite_cursor = lite$addInt(lite_cursor, 1n, 80641);
            }
        }
        return lite_calls;
    }
    void liteFn$frontend$targetCodeCalls;
    function liteFn$frontend$targetHelperCalls(lite_items: { kind: string; name: string; runtime: string; code: string; intValue: bigint; textValue: string }[]): string {
        void lite_items;
        let lite_calls = "|";
        void lite_calls;
        for (const lite_item of [...(lite_items)]) {
            void lite_item;
            lite_calls = liteFn$frontend$targetCodeCalls((lite_item).code, lite_calls);
        }
        return lite_calls;
    }
    void liteFn$frontend$targetHelperCalls;
    function liteFn$frontend$collectTypeTarget(lite_source: string, lite_position: bigint, lite_prefix: string): { text: string; next: bigint } {
        void lite_source;
        void lite_position;
        void lite_prefix;
        const lite_size = liteFn$lib$core$text$length(lite_source);
        void lite_size;
        const lite_start = liteFn$frontend$skipTrivia(lite_source, lite_position, lite_prefix);
        void lite_start;
        if (((((lite_start) < (lite_size))) && (((liteFn$lib$core$text$at(lite_source, lite_start)) === ("("))))) {
            let lite_cursor = lite_start;
            void lite_cursor;
            let lite_depth = 0n;
            void lite_depth;
            while (((lite_cursor) < (lite_size))) {
                const lite_ch = liteFn$lib$core$text$at(lite_source, lite_cursor);
                void lite_ch;
                if (((lite_ch) === ("\""))) {
                    lite_cursor = liteFn$frontend$skipAliasString(lite_source, lite_cursor);
                } else if (liteFn$lib$core$text$startsWithAt(lite_source, lite_cursor, "/*")) {
                    lite_cursor = liteFn$frontend$skipComment(lite_source, lite_cursor, lite_prefix);
                } else if (((lite_ch) === ("("))) {
                    lite_depth = lite$addInt(lite_depth, 1n, 81751);
                    lite_cursor = lite$addInt(lite_cursor, 1n, 81788);
                } else if (((lite_ch) === (")"))) {
                    lite_depth = lite$subtractInt(lite_depth, 1n, 81857);
                    lite_cursor = lite$addInt(lite_cursor, 1n, 81894);
                    if (((lite_depth) === (0n))) {
                        return { text: liteFn$lib$core$text$slice(lite_source, lite_start, lite_cursor), next: lite_cursor };
                    }
                } else {
                    lite_cursor = lite$addInt(lite_cursor, 1n, 82091);
                }
            }
            return { text: liteFn$lib$core$text$slice(lite_source, lite_start, lite_size), next: lite_size };
        } else if (((((lite_start) < (lite_size))) && (((liteFn$lib$core$text$at(lite_source, lite_start)) === ("["))))) {
            let lite_cursor = lite_start;
            void lite_cursor;
            let lite_depth = 0n;
            void lite_depth;
            while (((lite_cursor) < (lite_size))) {
                const lite_ch = liteFn$lib$core$text$at(lite_source, lite_cursor);
                void lite_ch;
                if (((lite_ch) === ("\""))) {
                    lite_cursor = liteFn$frontend$skipAliasString(lite_source, lite_cursor);
                } else if (liteFn$lib$core$text$startsWithAt(lite_source, lite_cursor, "/*")) {
                    lite_cursor = liteFn$frontend$skipComment(lite_source, lite_cursor, lite_prefix);
                } else if (((lite_ch) === ("["))) {
                    lite_depth = lite$addInt(lite_depth, 1n, 82658);
                    lite_cursor = lite$addInt(lite_cursor, 1n, 82695);
                } else if (((lite_ch) === ("]"))) {
                    lite_depth = lite$subtractInt(lite_depth, 1n, 82764);
                    lite_cursor = lite$addInt(lite_cursor, 1n, 82801);
                    if (((lite_depth) === (0n))) {
                        return { text: liteFn$lib$core$text$slice(lite_source, lite_start, lite_cursor), next: lite_cursor };
                    }
                } else {
                    lite_cursor = lite$addInt(lite_cursor, 1n, 82998);
                }
            }
            return { text: liteFn$lib$core$text$slice(lite_source, lite_start, lite_size), next: lite_size };
        } else {
            const lite_parsedName = liteFn$frontend$typeNameAt(lite_source, lite_start, lite_prefix);
            void lite_parsedName;
            const lite_after = (lite_parsedName).next;
            void lite_after;
            const lite_afterName = liteFn$frontend$skipTrivia(lite_source, lite_after, lite_prefix);
            void lite_afterName;
            if (((((lite_afterName) < (lite_size))) && (((liteFn$lib$core$text$at(lite_source, lite_afterName)) === ("<"))))) {
                let lite_cursor = lite_afterName;
                void lite_cursor;
                let lite_depth = 0n;
                void lite_depth;
                while (((lite_cursor) < (lite_size))) {
                    const lite_ch = liteFn$lib$core$text$at(lite_source, lite_cursor);
                    void lite_ch;
                    if (liteFn$lib$core$text$startsWithAt(lite_source, lite_cursor, "/*")) {
                        lite_cursor = liteFn$frontend$skipComment(lite_source, lite_cursor, lite_prefix);
                    } else if (((lite_ch) === ("<"))) {
                        lite_depth = lite$addInt(lite_depth, 1n, 83673);
                        lite_cursor = lite$addInt(lite_cursor, 1n, 83714);
                    } else if (((lite_ch) === (">"))) {
                        lite_depth = lite$subtractInt(lite_depth, 1n, 83791);
                        lite_cursor = lite$addInt(lite_cursor, 1n, 83832);
                        if (((lite_depth) === (0n))) {
                            return { text: liteFn$lib$core$text$slice(lite_source, lite_start, lite_cursor), next: lite_cursor };
                        }
                    } else {
                        lite_cursor = lite$addInt(lite_cursor, 1n, 84049);
                    }
                }
                return { text: liteFn$lib$core$text$slice(lite_source, lite_start, lite_size), next: lite_size };
            } else {
                return { text: liteFn$lib$core$text$slice(lite_source, lite_start, lite_after), next: lite_after };
            }
        }
    }
    void liteFn$frontend$collectTypeTarget;
    function liteFn$frontend$collectAliases(lite_source: string, lite_prefix: string): { name: string; target: string; at: bigint; end: bigint }[] {
        void lite_source;
        void lite_prefix;
        const lite_aliases: { name: string; target: string; at: bigint; end: bigint }[] = [...([])];
        void lite_aliases;
        const lite_size = liteFn$lib$core$text$length(lite_source);
        void lite_size;
        let lite_position = 0n;
        void lite_position;
        let lite_depth = 0n;
        void lite_depth;
        while (((lite_position) < (lite_size))) {
            lite_position = liteFn$frontend$skipTrivia(lite_source, lite_position, lite_prefix);
            if (((lite_position) >= (lite_size))) {
                break;
            }
            const lite_ch = liteFn$lib$core$text$at(lite_source, lite_position);
            void lite_ch;
            if (((lite_ch) === ("\""))) {
                lite_position = liteFn$frontend$skipAliasString(lite_source, lite_position);
            } else if (((lite_ch) === ("{"))) {
                lite_depth = lite$addInt(lite_depth, 1n, 84901);
                lite_position = lite$addInt(lite_position, 1n, 84938);
            } else if (((lite_ch) === ("}"))) {
                if (((lite_depth) > (0n))) {
                    lite_depth = lite$subtractInt(lite_depth, 1n, 85014);
                }
                lite_position = lite$addInt(lite_position, 1n, 85053);
            } else if (((((lite_depth) === (0n))) && (liteFn$lib$core$text$isNameStart(lite_ch)))) {
                const lite_nameStart = lite_position;
                void lite_nameStart;
                const lite_afterName = liteFn$lib$core$text$skipName(lite_source, lite_position);
                void lite_afterName;
                const lite_name = liteFn$lib$core$text$slice(lite_source, lite_nameStart, lite_afterName);
                void lite_name;
                const lite_aliasPosition = liteFn$frontend$skipTrivia(lite_source, lite_afterName, lite_prefix);
                void lite_aliasPosition;
                if (liteFn$lib$core$text$startsWithAt(lite_source, lite_aliasPosition, ":=")) {
                    const lite_typePosition = liteFn$frontend$skipTrivia(lite_source, lite$addInt(lite_aliasPosition, 2n, 85478), lite_prefix);
                    void lite_typePosition;
                    if (liteFn$lib$core$text$wordAt(lite_source, lite_typePosition, "type")) {
                        const lite_targetStart = liteFn$frontend$skipTrivia(lite_source, lite$addInt(lite_typePosition, 4n, 85625), lite_prefix);
                        void lite_targetStart;
                        const lite_target = liteFn$frontend$collectTypeTarget(lite_source, lite_targetStart, lite_prefix);
                        void lite_target;
                        lite_aliases.push({ name: lite_name, target: (lite_target).text, at: lite_nameStart, end: (lite_target).next });
                        lite_position = (lite_target).next;
                        continue;
                    }
                }
                lite_position = lite_afterName;
            } else {
                lite_position = lite$addInt(lite_position, 1n, 86029);
            }
        }
        return [...(lite_aliases)];
    }
    void liteFn$frontend$collectAliases;
    function liteFn$frontend$isSingleEquals(lite_source: string, lite_position: bigint): boolean {
        void lite_source;
        void lite_position;
        return ((((liteFn$lib$core$text$startsWithAt(lite_source, lite_position, "=")) && ((!(liteFn$lib$core$text$startsWithAt(lite_source, lite_position, "==")))))) && ((!(liteFn$lib$core$text$startsWithAt(lite_source, lite_position, "=!=")))));
    }
    void liteFn$frontend$isSingleEquals;
    function liteFn$frontend$looksLikeTupleEntry(lite_source: string, lite_position: bigint, lite_prefix: string): boolean {
        void lite_source;
        void lite_position;
        void lite_prefix;
        const lite_size = liteFn$lib$core$text$length(lite_source);
        void lite_size;
        const lite_start = liteFn$frontend$skipTrivia(lite_source, lite_position, lite_prefix);
        void lite_start;
        if (((lite_start) >= (lite_size))) {
            return false;
        }
        if (liteFn$frontend$isSingleEquals(lite_source, lite_start)) {
            return true;
        }
        if (liteFn$lib$core$text$isNameStart(liteFn$lib$core$text$at(lite_source, lite_start))) {
            const lite_afterName = liteFn$frontend$skipTrivia(lite_source, liteFn$lib$core$text$skipName(lite_source, lite_start), lite_prefix);
            void lite_afterName;
            if (liteFn$frontend$isSingleEquals(lite_source, lite_afterName)) {
                return true;
            }
        }
        let lite_cursor = lite_start;
        void lite_cursor;
        let lite_depth = 0n;
        void lite_depth;
        while (((lite_cursor) < (lite_size))) {
            const lite_ch = liteFn$lib$core$text$at(lite_source, lite_cursor);
            void lite_ch;
            if (((lite_ch) === ("\""))) {
                lite_cursor = liteFn$frontend$skipAliasString(lite_source, lite_cursor);
            } else if (liteFn$lib$core$text$startsWithAt(lite_source, lite_cursor, "/*")) {
                lite_cursor = liteFn$frontend$skipComment(lite_source, lite_cursor, lite_prefix);
            } else if (((((((lite_ch) === ("("))) || (((lite_ch) === ("["))))) || (((lite_ch) === ("{"))))) {
                lite_depth = lite$addInt(lite_depth, 1n, 87394);
                lite_cursor = lite$addInt(lite_cursor, 1n, 87427);
            } else if (((((((lite_ch) === (")"))) || (((lite_ch) === ("]"))))) || (((lite_ch) === ("}"))))) {
                if (((lite_depth) === (0n))) {
                    return false;
                }
                lite_depth = lite$subtractInt(lite_depth, 1n, 87558);
                lite_cursor = lite$addInt(lite_cursor, 1n, 87591);
            } else if (((((lite_depth) === (0n))) && (((lite_ch) === (","))))) {
                return true;
            } else {
                lite_cursor = lite$addInt(lite_cursor, 1n, 87711);
            }
        }
        return false;
    }
    void liteFn$frontend$looksLikeTupleEntry;
    function liteFn$frontend$copiedValueCode(lite_target: string, lite_kind: string, lite_code: string): string {
        void lite_target;
        void lite_kind;
        void lite_code;
        return (Boolean(((lite_kind) === ("Never"))) ? lite_code : (Boolean(((liteFn$frontend$isListKind(lite_kind)) || (liteFn$frontend$isArrayKind(lite_kind)))) ? liteFn$frontend$targetListCopyCode(lite_target, lite_code) : lite_code));
    }
    void liteFn$frontend$copiedValueCode;
    function liteFn$frontend$assignValueCode(lite_target: string, lite_expectedKind: string, lite_actualKind: string, lite_actualCode: string): string {
        void lite_target;
        void lite_expectedKind;
        void lite_actualKind;
        void lite_actualCode;
        return (Boolean(((lite_actualKind) === ("Never"))) ? lite_actualCode : (Boolean(((((lite_expectedKind) === ("Float32"))) && (liteFn$numeric__literals$isIntKind(lite_actualKind)))) ? liteFn$frontend$targetFloat32OperandCode(lite_target, lite_actualKind, lite_actualCode) : (Boolean(((((lite_expectedKind) === ("Float"))) && (liteFn$numeric__literals$isIntKind(lite_actualKind)))) ? liteFn$frontend$targetFloatOperandCode(lite_target, lite_actualKind, lite_actualCode) : (Boolean(((((lite_expectedKind) !== (lite_actualKind))) && (liteFn$frontend$tupleShapeMatches(lite_expectedKind, lite_actualKind)))) ? liteFn$frontend$convertTupleValue(lite_expectedKind, lite_actualKind, lite_actualCode) : liteFn$frontend$copiedValueCode(lite_target, lite_expectedKind, lite_actualCode)))));
    }
    void liteFn$frontend$assignValueCode;
    function liteFn$frontend$rejectNonValueBinding(lite_source: string, lite_at: bigint, lite_prefix: string, lite_kind: string, lite_name: string): void {
        void lite_source;
        void lite_at;
        void lite_prefix;
        void lite_kind;
        void lite_name;
        if (((((lite_kind) === ("Unit"))) || (((lite_kind) === ("Never"))))) {
            liteFn$frontend$failAt(lite_source, lite_at, lite_prefix, (((((("cannot declare a ") + (liteFn$frontend$displayKind(lite_kind)))) + (" local "))) + (lite_name)));
        }
    }
    void liteFn$frontend$rejectNonValueBinding;
    function liteFn$frontend$expressionStatementKind(lite_valueKind: string, lite_returned: boolean, lite_defaultKind: string, lite_currentResult: string): string {
        void lite_valueKind;
        void lite_returned;
        void lite_defaultKind;
        void lite_currentResult;
        return (Boolean(((lite_valueKind) === ("Never"))) ? (Boolean(((lite_currentResult) !== ("Unit"))) ? "Return" : "Call") : (Boolean(lite_returned) ? "Return" : lite_defaultKind));
    }
    void liteFn$frontend$expressionStatementKind;
    function liteFn$frontend$expectNonemptyCallClose(lite_source: string, lite_position: bigint, lite_prefix: string): bigint {
        void lite_source;
        void lite_position;
        void lite_prefix;
        let lite_cursor = liteFn$frontend$skipTrivia(lite_source, lite_position, lite_prefix);
        void lite_cursor;
        if (((((lite_cursor) < (liteFn$lib$core$text$length(lite_source)))) && (((liteFn$lib$core$text$at(lite_source, lite_cursor)) === (","))))) {
            lite_cursor = liteFn$frontend$skipTrivia(lite_source, lite$addInt(lite_cursor, 1n, 90036), lite_prefix);
        }
        return liteFn$frontend$expectSymbol(lite_source, lite_cursor, ")", lite_prefix);
    }
    void liteFn$frontend$expectNonemptyCallClose;
    function liteFn$frontend$parseListGrant(lite_source: string, lite_open: bigint, lite_prefix: string, lite_locals: { name: string; runtime: string; kind: string; mutable: boolean; writable: boolean; depth: bigint; constant: boolean; code: string; intValue: bigint; textValue: string; initState: string }[], lite_operation: string): { runtime: string; kind: string; next: bigint } {
        void lite_source;
        void lite_open;
        void lite_prefix;
        void lite_locals;
        void lite_operation;
        let lite_cursor = liteFn$frontend$skipTrivia(lite_source, lite$addInt(lite_open, 1n, 90452), lite_prefix);
        void lite_cursor;
        if ((!(liteFn$lib$core$text$wordAt(lite_source, lite_cursor, "mut")))) {
            liteFn$frontend$failAt(lite_source, lite_cursor, lite_prefix, ((lite_operation) + (" requires mut list argument")));
        }
        lite_cursor = liteFn$frontend$skipTrivia(lite_source, lite$addInt(lite_cursor, 3n, 90645), lite_prefix);
        if (((((lite_cursor) >= (liteFn$lib$core$text$length(lite_source)))) || ((!(liteFn$lib$core$text$isNameStart(liteFn$lib$core$text$at(lite_source, lite_cursor))))))) {
            liteFn$frontend$failAt(lite_source, lite_cursor, lite_prefix, "expected a list name after mut");
        }
        const lite_nameEnd = liteFn$lib$core$text$skipName(lite_source, lite_cursor);
        void lite_nameEnd;
        const lite_listName = liteFn$lib$core$text$slice(lite_source, lite_cursor, lite_nameEnd);
        void lite_listName;
        const lite_index = liteFn$frontend$localIndex([...(lite_locals)], lite_listName);
        void lite_index;
        if (((lite_index) < (0n))) {
            liteFn$frontend$failAt(lite_source, lite_cursor, lite_prefix, (("unknown value ") + (lite_listName)));
            return { runtime: "", kind: "", next: lite_nameEnd };
        }
        const lite_entry = lite$listAt((lite_locals), lite_index, 91156);
        void lite_entry;
        if ((!(liteFn$frontend$isListKind((lite_entry).kind)))) {
            liteFn$frontend$failAt(lite_source, lite_cursor, lite_prefix, ((((lite_operation) + (" requires a List value, got "))) + (liteFn$frontend$displayKind((lite_entry).kind))));
        }
        if ((!((lite_entry).writable))) {
            liteFn$frontend$failAt(lite_source, lite_cursor, lite_prefix, (((("cannot mutate list ") + (lite_listName))) + (" without mut")));
        }
        return { runtime: (lite_entry).runtime, kind: (lite_entry).kind, next: lite_nameEnd };
    }
    void liteFn$frontend$parseListGrant;
    function liteFn$frontend$scanParenEnd(lite_source: string, lite_open: bigint, lite_prefix: string): bigint {
        void lite_source;
        void lite_open;
        void lite_prefix;
        let lite_cursor = lite_open;
        void lite_cursor;
        let lite_depth = 0n;
        void lite_depth;
        const lite_size = liteFn$lib$core$text$length(lite_source);
        void lite_size;
        while (((lite_cursor) < (lite_size))) {
            const lite_ch = liteFn$lib$core$text$at(lite_source, lite_cursor);
            void lite_ch;
            if (((lite_ch) === ("\""))) {
                lite_cursor = liteFn$frontend$skipAliasString(lite_source, lite_cursor);
            } else if (liteFn$lib$core$text$startsWithAt(lite_source, lite_cursor, "/*")) {
                lite_cursor = liteFn$frontend$skipComment(lite_source, lite_cursor, lite_prefix);
            } else if (((lite_ch) === ("("))) {
                lite_depth = lite$addInt(lite_depth, 1n, 92061);
                lite_cursor = lite$addInt(lite_cursor, 1n, 92082);
            } else if (((lite_ch) === (")"))) {
                lite_depth = lite$subtractInt(lite_depth, 1n, 92143);
                lite_cursor = lite$addInt(lite_cursor, 1n, 92176);
                if (((lite_depth) === (0n))) {
                    return lite_cursor;
                }
            } else {
                lite_cursor = lite$addInt(lite_cursor, 1n, 92259);
            }
        }
        return (-1n);
    }
    void liteFn$frontend$scanParenEnd;
    function liteFn$frontend$tupleZeroParsed(lite_kind: string, lite_next: bigint): { kind: string; code: string; intValue: bigint; textValue: string; constant: boolean; next: bigint } {
        void lite_kind;
        void lite_next;
        const lite_count = liteFn$frontend$tupleComponentCount(lite_kind);
        void lite_count;
        let lite_code = "{ ";
        void lite_code;
        let lite_index = 0n;
        void lite_index;
        while (((lite_index) < (lite_count))) {
            const lite_comp = liteFn$frontend$tupleComponent(lite_kind, lite_index);
            void lite_comp;
            if (((lite_index) > (0n))) {
                lite_code = ((lite_code) + (", "));
            }
            lite_code = ((((lite_code) + (liteFn$frontend$tupleObjectKey((lite_comp).label, lite_index)))) + (": "));
            if (liteFn$numeric__literals$isIntKind((lite_comp).kind)) {
                lite_code = ((lite_code) + ("0n"));
            } else if (liteFn$numeric__literals$isFloatKind((lite_comp).kind)) {
                lite_code = ((lite_code) + ("0"));
            } else if ((((lite_comp).kind) === ("String"))) {
                lite_code = ((lite_code) + ("\"\""));
            } else {
                lite_code = ((lite_code) + ("false"));
            }
            lite_index = lite$addInt(lite_index, 1n, 92940);
        }
        return { kind: lite_kind, code: ((lite_code) + (" }")), intValue: 0n, textValue: "", constant: false, next: lite_next };
    }
    void liteFn$frontend$tupleZeroParsed;
    function liteFn$frontend$isZeroInitLiteral(lite_source: string, lite_position: bigint, lite_prefix: string): bigint {
        void lite_source;
        void lite_position;
        void lite_prefix;
        const lite_start = liteFn$frontend$skipTrivia(lite_source, lite_position, lite_prefix);
        void lite_start;
        const lite_size = liteFn$lib$core$text$length(lite_source);
        void lite_size;
        if (((((lite_start) >= (lite_size))) || (((liteFn$lib$core$text$at(lite_source, lite_start)) !== ("0"))))) {
            return (-1n);
        }
        if (((((lite$addInt(lite_start, 1n, 93425)) < (lite_size))) && ((((((liteFn$lib$core$text$isDigit(liteFn$lib$core$text$at(lite_source, lite$addInt(lite_start, 1n, 93482)))) || (liteFn$lib$core$text$isNameStart(liteFn$lib$core$text$at(lite_source, lite$addInt(lite_start, 1n, 93536)))))) || (((liteFn$lib$core$text$at(lite_source, lite$addInt(lite_start, 1n, 93570))) === (".")))))))) {
            return (-1n);
        }
        const lite_after = liteFn$frontend$skipTrivia(lite_source, lite$addInt(lite_start, 1n, 93648), lite_prefix);
        void lite_after;
        if (((((((lite_after) >= (lite_size))) || (((liteFn$lib$core$text$at(lite_source, lite_after)) === (";"))))) || (((liteFn$lib$core$text$at(lite_source, lite_after)) === ("}"))))) {
            return lite$addInt(lite_start, 1n, 93778);
        }
        return (-1n);
    }
    void liteFn$frontend$isZeroInitLiteral;
    function liteFn$frontend$isReservedInitMarker(lite_source: string, lite_position: bigint, lite_prefix: string): bigint {
        void lite_source;
        void lite_position;
        void lite_prefix;
        const lite_start = liteFn$frontend$skipTrivia(lite_source, lite_position, lite_prefix);
        void lite_start;
        if (((((lite_start) < (liteFn$lib$core$text$length(lite_source)))) && (((liteFn$lib$core$text$at(lite_source, lite_start)) === ("?"))))) {
            return lite$addInt(lite_start, 1n, 94134);
        }
        return (-1n);
    }
    void liteFn$frontend$isReservedInitMarker;
    function liteFn$frontend$compoundAssignOp(lite_source: string, lite_position: bigint): { op: string; baseOp: string; width: bigint } {
        void lite_source;
        void lite_position;
        if (liteFn$lib$core$text$startsWithAt(lite_source, lite_position, ":/=")) {
            return { op: ":/=", baseOp: ":/", width: 3n };
        }
        if (liteFn$lib$core$text$startsWithAt(lite_source, lite_position, ":%=")) {
            return { op: ":%=", baseOp: ":%", width: 3n };
        }
        if (liteFn$lib$core$text$startsWithAt(lite_source, lite_position, "+=")) {
            return { op: "+=", baseOp: "+", width: 2n };
        }
        if (liteFn$lib$core$text$startsWithAt(lite_source, lite_position, "-=")) {
            return { op: "-=", baseOp: "-", width: 2n };
        }
        if (liteFn$lib$core$text$startsWithAt(lite_source, lite_position, "*=")) {
            return { op: "*=", baseOp: "*", width: 2n };
        }
        if (liteFn$lib$core$text$startsWithAt(lite_source, lite_position, "/=")) {
            return { op: "/=", baseOp: "/", width: 2n };
        }
        if (liteFn$lib$core$text$startsWithAt(lite_source, lite_position, "%=")) {
            return { op: "%=", baseOp: "%", width: 2n };
        }
        return { op: "", baseOp: "", width: 0n };
    }
    void liteFn$frontend$compoundAssignOp;
    function liteFn$frontend$compoundAssignCode(lite_target: string, lite_source: string, lite_opPos: bigint, lite_prefix: string, lite_entryKind: string, lite_lhsCode: string, lite_baseOp: string, lite_rhs: { kind: string; code: string; intValue: bigint; textValue: string; constant: boolean; next: bigint }): string {
        void lite_target;
        void lite_source;
        void lite_opPos;
        void lite_prefix;
        void lite_entryKind;
        void lite_lhsCode;
        void lite_baseOp;
        void lite_rhs;
        if (((((liteFn$numeric__literals$isIntKind(lite_entryKind)) && (liteFn$numeric__literals$isIntKind((lite_rhs).kind)))) && (liteFn$numeric__literals$numericWidens(lite_entryKind, (lite_rhs).kind)))) {
            return liteFn$frontend$runtimeTypedIntegerCode(lite_target, lite_entryKind, lite_baseOp, lite_lhsCode, (lite_rhs).code, lite_opPos);
        }
        if (((((((lite_entryKind) === ("String"))) && ((((lite_rhs).kind) === ("String"))))) && (((lite_baseOp) === ("+"))))) {
            return liteFn$frontend$targetConcatCode(lite_target, lite_lhsCode, (lite_rhs).code);
        }
        if (((((((lite_entryKind) === ("Float32"))) && ((((liteFn$numeric__literals$isIntKind((lite_rhs).kind)) || ((((lite_rhs).kind) === ("Float32")))))))) && ((((((((((lite_baseOp) === ("+"))) || (((lite_baseOp) === ("-"))))) || (((lite_baseOp) === ("*"))))) || (((lite_baseOp) === ("/")))))))) {
            return liteFn$frontend$targetFloat32BinaryCode(lite_target, lite_baseOp, lite_lhsCode, liteFn$frontend$targetFloat32OperandCode(lite_target, (lite_rhs).kind, (lite_rhs).code), lite_opPos);
        }
        if (((((((lite_entryKind) === ("Float"))) && (liteFn$numeric__literals$isNumericKind((lite_rhs).kind)))) && ((((((((((lite_baseOp) === ("+"))) || (((lite_baseOp) === ("-"))))) || (((lite_baseOp) === ("*"))))) || (((lite_baseOp) === ("/")))))))) {
            return liteFn$frontend$targetFloatBinaryCode(lite_target, lite_baseOp, lite_lhsCode, liteFn$frontend$targetFloatOperandCode(lite_target, (lite_rhs).kind, (lite_rhs).code), lite_opPos);
        }
        liteFn$frontend$failAt(lite_source, lite_opPos, lite_prefix, (((((((((("cannot apply ") + (lite_baseOp))) + ("= to "))) + (liteFn$frontend$displayKind(lite_entryKind)))) + (" and "))) + (liteFn$frontend$displayKind((lite_rhs).kind))));
        return "";
    }
    void liteFn$frontend$compoundAssignCode;
    function liteFn$frontend$localsCount(lite_locals: { name: string; runtime: string; kind: string; mutable: boolean; writable: boolean; depth: bigint; constant: boolean; code: string; intValue: bigint; textValue: string; initState: string }[]): bigint {
        void lite_locals;
        let lite_count = 0n;
        void lite_count;
        for (const lite$item of [...(lite_locals)]) {
            void lite$item;
            lite_count = lite$addInt(lite_count, 1n, 96553);
        }
        return lite_count;
    }
    void liteFn$frontend$localsCount;
    function liteFn$frontend$truncateLocals(lite_locals: { name: string; runtime: string; kind: string; mutable: boolean; writable: boolean; depth: bigint; constant: boolean; code: string; intValue: bigint; textValue: string; initState: string }[], lite_targetLen: bigint): { name: string; runtime: string; kind: string; mutable: boolean; writable: boolean; depth: bigint; constant: boolean; code: string; intValue: bigint; textValue: string; initState: string }[] {
        void lite_locals;
        void lite_targetLen;
        const lite_kept: { name: string; runtime: string; kind: string; mutable: boolean; writable: boolean; depth: bigint; constant: boolean; code: string; intValue: bigint; textValue: string; initState: string }[] = [...([])];
        void lite_kept;
        let lite_idx = 0n;
        void lite_idx;
        for (const lite_local of [...(lite_locals)]) {
            void lite_local;
            if (((lite_idx) < (lite_targetLen))) {
                lite_kept.push(lite_local);
            }
            lite_idx = lite$addInt(lite_idx, 1n, 96873);
        }
        return [...(lite_kept)];
    }
    void liteFn$frontend$truncateLocals;
    function liteFn$frontend$recordBranchUpdates(lite_locals: { name: string; runtime: string; kind: string; mutable: boolean; writable: boolean; depth: bigint; constant: boolean; code: string; intValue: bigint; textValue: string; initState: string }[], lite_preLen: bigint, lite_maxDepth: bigint, lite_branchDepth: bigint, lite_updates: { depth: bigint; runtime: string; initState: string }[]): { depth: bigint; runtime: string; initState: string }[] {
        void lite_locals;
        void lite_preLen;
        void lite_maxDepth;
        void lite_branchDepth;
        void lite_updates;
        const lite_nextUpdates: { depth: bigint; runtime: string; initState: string }[] = [...([])];
        void lite_nextUpdates;
        for (const lite_existing of [...(lite_updates)]) {
            void lite_existing;
            lite_nextUpdates.push(lite_existing);
        }
        let lite_idx = 0n;
        void lite_idx;
        const lite_branchRuntimes: string[] = [...([])];
        void lite_branchRuntimes;
        const lite_branchStates: string[] = [...([])];
        void lite_branchStates;
        for (const lite_local of [...(lite_locals)]) {
            void lite_local;
            if (((((lite_idx) >= (lite_preLen))) && ((((lite_local).depth) <= (lite_maxDepth))))) {
                lite_branchRuntimes.push((lite_local).runtime);
                lite_branchStates.push((lite_local).initState);
            }
            lite_idx = lite$addInt(lite_idx, 1n, 97621);
        }
        const lite_emitted: string[] = [...([])];
        void lite_emitted;
        let lite_rev = 0n;
        void lite_rev;
        for (const lite$item of [...(lite_branchRuntimes)]) {
            void lite$item;
            lite_rev = lite$addInt(lite_rev, 1n, 97716);
        }
        while (((lite_rev) > (0n))) {
            lite_rev = lite$subtractInt(lite_rev, 1n, 97761);
            const lite_rt = lite$listAt((lite_branchRuntimes), lite_rev, 97795);
            void lite_rt;
            if ((!(liteFn$lib$core$list$listContainsText([...(lite_emitted)], lite_rt)))) {
                lite_emitted.push(lite_rt);
                lite_nextUpdates.push({ depth: lite_branchDepth, runtime: lite_rt, initState: lite$listAt((lite_branchStates), lite_rev, 98010) });
            }
        }
        return [...(lite_nextUpdates)];
    }
    void liteFn$frontend$recordBranchUpdates;
    function liteFn$frontend$joinBranchLocals(lite_locals: { name: string; runtime: string; kind: string; mutable: boolean; writable: boolean; depth: bigint; constant: boolean; code: string; intValue: bigint; textValue: string; initState: string }[], lite_preLen: bigint, lite_blockDepth: bigint, lite_hasElse: boolean, lite_liveBranchCount: bigint, lite_updates: { depth: bigint; runtime: string; initState: string }[]): { name: string; runtime: string; kind: string; mutable: boolean; writable: boolean; depth: bigint; constant: boolean; code: string; intValue: bigint; textValue: string; initState: string }[] {
        void lite_locals;
        void lite_preLen;
        void lite_blockDepth;
        void lite_hasElse;
        void lite_liveBranchCount;
        void lite_updates;
        const lite_here: { depth: bigint; runtime: string; initState: string }[] = [...([])];
        void lite_here;
        for (const lite_u of [...(lite_updates)]) {
            void lite_u;
            if ((((lite_u).depth) === (lite_blockDepth))) {
                lite_here.push(lite_u);
            }
        }
        const lite_nextLocals: { name: string; runtime: string; kind: string; mutable: boolean; writable: boolean; depth: bigint; constant: boolean; code: string; intValue: bigint; textValue: string; initState: string }[] = [...([])];
        void lite_nextLocals;
        for (const lite_l of [...(lite_locals)]) {
            void lite_l;
            lite_nextLocals.push(lite_l);
        }
        if (((lite_hasElse) && (((lite_liveBranchCount) === (0n))))) {
            return [...(lite_nextLocals)];
        }
        const lite_seenRuntimes: string[] = [...([])];
        void lite_seenRuntimes;
        for (const lite_u of [...(lite_here)]) {
            void lite_u;
            if ((!(liteFn$lib$core$list$listContainsText([...(lite_seenRuntimes)], (lite_u).runtime)))) {
                lite_seenRuntimes.push((lite_u).runtime);
            }
        }
        for (const lite_rt of [...(lite_seenRuntimes)]) {
            void lite_rt;
            let lite_preEntryIdx = (-1n);
            void lite_preEntryIdx;
            let lite_i = 0n;
            void lite_i;
            for (const lite_l of [...(lite_locals)]) {
                void lite_l;
                if (((((lite_i) < (lite_preLen))) && ((((lite_l).runtime) === (lite_rt))))) {
                    lite_preEntryIdx = lite_i;
                }
                lite_i = lite$addInt(lite_i, 1n, 98994);
            }
            if (((lite_preEntryIdx) >= (0n))) {
                const lite_pre = lite$listAt((lite_locals), lite_preEntryIdx, 99065);
                void lite_pre;
                if ((((lite_pre).initState) !== ("init"))) {
                    let lite_joined = "maybe";
                    void lite_joined;
                    if (lite_hasElse) {
                        let lite_initCount = 0n;
                        void lite_initCount;
                        for (const lite_u of [...(lite_here)]) {
                            void lite_u;
                            if ((((((lite_u).runtime) === (lite_rt))) && ((((lite_u).initState) === ("init"))))) {
                                lite_initCount = lite$addInt(lite_initCount, 1n, 99359);
                            }
                        }
                        if (((lite_initCount) === (lite_liveBranchCount))) {
                            lite_joined = "init";
                        }
                    }
                    lite_nextLocals.push({ name: (lite_pre).name, runtime: (lite_pre).runtime, kind: (lite_pre).kind, mutable: (lite_pre).mutable, writable: (lite_pre).writable, depth: (lite_pre).depth, constant: false, code: (lite_pre).code, intValue: 0n, textValue: "", initState: lite_joined });
                }
            }
        }
        return [...(lite_nextLocals)];
    }
    void liteFn$frontend$joinBranchLocals;
    function liteFn$frontend$popBranchUpdates(lite_updates: { depth: bigint; runtime: string; initState: string }[], lite_blockDepth: bigint): { depth: bigint; runtime: string; initState: string }[] {
        void lite_updates;
        void lite_blockDepth;
        const lite_kept: { depth: bigint; runtime: string; initState: string }[] = [...([])];
        void lite_kept;
        for (const lite_u of [...(lite_updates)]) {
            void lite_u;
            if ((((lite_u).depth) !== (lite_blockDepth))) {
                lite_kept.push(lite_u);
            }
        }
        return [...(lite_kept)];
    }
    void liteFn$frontend$popBranchUpdates;
    function liteFn$frontend$joinLoopUpdates(lite_locals: { name: string; runtime: string; kind: string; mutable: boolean; writable: boolean; depth: bigint; constant: boolean; code: string; intValue: bigint; textValue: string; initState: string }[], lite_preLen: bigint, lite_maxDepth: bigint): { name: string; runtime: string; kind: string; mutable: boolean; writable: boolean; depth: bigint; constant: boolean; code: string; intValue: bigint; textValue: string; initState: string }[] {
        void lite_locals;
        void lite_preLen;
        void lite_maxDepth;
        const lite_updatedRuntimes: string[] = [...([])];
        void lite_updatedRuntimes;
        let lite_idx = 0n;
        void lite_idx;
        for (const lite_l of [...(lite_locals)]) {
            void lite_l;
            if (((((lite_idx) >= (lite_preLen))) && ((((lite_l).depth) <= (lite_maxDepth))))) {
                if ((!(liteFn$lib$core$list$listContainsText([...(lite_updatedRuntimes)], (lite_l).runtime)))) {
                    lite_updatedRuntimes.push((lite_l).runtime);
                }
            }
            lite_idx = lite$addInt(lite_idx, 1n, 100622);
        }
        const lite_nextLocals: { name: string; runtime: string; kind: string; mutable: boolean; writable: boolean; depth: bigint; constant: boolean; code: string; intValue: bigint; textValue: string; initState: string }[] = [...([])];
        void lite_nextLocals;
        let lite_k = 0n;
        void lite_k;
        for (const lite_l of [...(lite_locals)]) {
            void lite_l;
            if (((lite_k) < (lite_preLen))) {
                lite_nextLocals.push(lite_l);
            }
            lite_k = lite$addInt(lite_k, 1n, 100787);
        }
        for (const lite_rt of [...(lite_updatedRuntimes)]) {
            void lite_rt;
            let lite_preIdx = (-1n);
            void lite_preIdx;
            let lite_i = 0n;
            void lite_i;
            for (const lite_l of [...(lite_nextLocals)]) {
                void lite_l;
                if ((((lite_l).runtime) === (lite_rt))) {
                    lite_preIdx = lite_i;
                }
                lite_i = lite$addInt(lite_i, 1n, 100973);
            }
            if (((lite_preIdx) >= (0n))) {
                const lite_pre = lite$listAt((lite_nextLocals), lite_preIdx, 101043);
                void lite_pre;
                if ((((lite_pre).initState) === ("uninit"))) {
                    lite_nextLocals.push({ name: (lite_pre).name, runtime: (lite_pre).runtime, kind: (lite_pre).kind, mutable: (lite_pre).mutable, writable: (lite_pre).writable, depth: (lite_pre).depth, constant: false, code: (lite_pre).code, intValue: 0n, textValue: "", initState: "maybe" });
                }
            }
        }
        return [...(lite_nextLocals)];
    }
    void liteFn$frontend$joinLoopUpdates;
    function liteFn$frontend$zeroParsed(lite_target: string, lite_kind: string, lite_next: bigint): { kind: string; code: string; intValue: bigint; textValue: string; constant: boolean; next: bigint } {
        void lite_target;
        void lite_kind;
        void lite_next;
        if (liteFn$frontend$isTupleKind(lite_kind)) {
            return liteFn$frontend$tupleZeroParsed(lite_kind, lite_next);
        } else if (liteFn$frontend$isListKind(lite_kind)) {
            return { kind: lite_kind, code: "[]", intValue: 0n, textValue: "", constant: false, next: lite_next };
        } else if (liteFn$frontend$isArrayKind(lite_kind)) {
            const lite_elemKind = liteFn$frontend$arrayElementKind(lite_kind);
            void lite_elemKind;
            const lite_extent = liteFn$frontend$arrayExtent(lite_kind);
            void lite_extent;
            const lite_elemZero = (liteFn$frontend$zeroParsed(lite_target, lite_elemKind, lite_next)).code;
            void lite_elemZero;
            const lite_items: string[] = [...([])];
            void lite_items;
            let lite_i = 0n;
            void lite_i;
            while (((lite_i) < (lite_extent))) {
                lite_items.push(lite_elemZero);
                lite_i = lite$addInt(lite_i, 1n, 102145);
            }
            return { kind: lite_kind, code: (((("[") + (liteFn$lib$core$text$joinTexts([...(lite_items)], ", ")))) + ("]")), intValue: 0n, textValue: "", constant: false, next: lite_next };
        } else if (liteFn$numeric__literals$isIntKind(lite_kind)) {
            return liteFn$frontend$typedIntParsed(lite_kind, liteFn$frontend$targetIntLiteralCode(lite_target, 0n, false, "0"), 0n, true, lite_next);
        } else if (liteFn$numeric__literals$isFloatKind(lite_kind)) {
            return { kind: lite_kind, code: "0", intValue: 0n, textValue: "", constant: false, next: lite_next };
        } else if (((lite_kind) === ("String"))) {
            return liteFn$frontend$textParsed(liteFn$frontend$targetTextLiteralCode(lite_target, ""), "", true, lite_next);
        } else if (((lite_kind) === ("Unit"))) {
            return { kind: "Unit", code: liteFn$frontend$targetUnitLiteralCode(lite_target), intValue: 0n, textValue: "", constant: true, next: lite_next };
        } else {
            return liteFn$frontend$boolParsed(liteFn$frontend$targetBoolLiteralCode(lite_target, false), false, true, lite_next);
        }
    }
    void liteFn$frontend$zeroParsed;
    function liteFn$frontend$parseLocalType(lite_source: string, lite_position: bigint, lite_prefix: string, lite_aliases: { name: string; target: string; at: bigint; end: bigint }[]): { kind: string; writable: boolean; next: bigint } {
        void lite_source;
        void lite_position;
        void lite_prefix;
        void lite_aliases;
        const lite_start = liteFn$frontend$skipTrivia(lite_source, lite_position, lite_prefix);
        void lite_start;
        let lite_cursor = lite_start;
        void lite_cursor;
        let lite_writable = false;
        void lite_writable;
        if (liteFn$lib$core$text$wordAt(lite_source, lite_cursor, "mut")) {
            lite_writable = true;
            lite_cursor = liteFn$frontend$skipTrivia(lite_source, lite$addInt(lite_cursor, 3n, 103390), lite_prefix);
        }
        const lite_typed = liteFn$frontend$parseTypeAt(lite_source, lite_cursor, lite_prefix, [...(lite_aliases)], "local", "");
        void lite_typed;
        if ((((lite_typed).kind) === ("Unit"))) {
            const lite_name = liteFn$lib$core$text$slice(lite_source, lite_cursor, liteFn$lib$core$text$skipName(lite_source, lite_cursor));
            void lite_name;
            liteFn$frontend$failAt(lite_source, lite_cursor, lite_prefix, (("unsupported local type ") + (lite_name)));
        }
        if (((lite_writable) && ((!(liteFn$frontend$isListKind((lite_typed).kind)))))) {
            liteFn$frontend$failAt(lite_source, lite_start, lite_prefix, (("mut requires a List type, got ") + (liteFn$frontend$displayKind((lite_typed).kind))));
        }
        return { kind: (lite_typed).kind, writable: lite_writable, next: (lite_typed).next };
    }
    void liteFn$frontend$parseLocalType;
    function liteFn$frontend$skipItemSeparators(lite_source: string, lite_position: bigint, lite_prefix: string): bigint {
        void lite_source;
        void lite_position;
        void lite_prefix;
        let lite_next = liteFn$frontend$skipTrivia(lite_source, lite_position, lite_prefix);
        void lite_next;
        while (((((lite_next) < (liteFn$lib$core$text$length(lite_source)))) && (((liteFn$lib$core$text$at(lite_source, lite_next)) === (";"))))) {
            lite_next = liteFn$frontend$skipTrivia(lite_source, lite$addInt(lite_next, 1n, 104229), lite_prefix);
        }
        return lite_next;
    }
    void liteFn$frontend$skipItemSeparators;
    function liteFn$frontend$setIntAt(lite_values: bigint[], lite_index: bigint, lite_value: bigint): bigint[] {
        void lite_values;
        void lite_index;
        void lite_value;
        const lite_updated: bigint[] = [...([])];
        void lite_updated;
        let lite_i = 0n;
        void lite_i;
        for (const lite_item of [...(lite_values)]) {
            void lite_item;
            lite_updated.push((Boolean(((lite_i) === (lite_index))) ? lite_value : lite_item));
            lite_i = lite$addInt(lite_i, 1n, 104575);
        }
        return [...(lite_updated)];
    }
    void liteFn$frontend$setIntAt;
    function liteFn$frontend$setBoolAt(lite_values: boolean[], lite_index: bigint, lite_value: boolean): boolean[] {
        void lite_values;
        void lite_index;
        void lite_value;
        const lite_updated: boolean[] = [...([])];
        void lite_updated;
        let lite_i = 0n;
        void lite_i;
        for (const lite_item of [...(lite_values)]) {
            void lite_item;
            lite_updated.push((Boolean(((lite_i) === (lite_index))) ? lite_value : lite_item));
            lite_i = lite$addInt(lite_i, 1n, 104920);
        }
        return [...(lite_updated)];
    }
    void liteFn$frontend$setBoolAt;
    function liteFn$frontend$findParamSlot(lite_params: string[], lite_first: bigint, lite_count: bigint, lite_label: string): bigint {
        void lite_params;
        void lite_first;
        void lite_count;
        void lite_label;
        let lite_i = 0n;
        void lite_i;
        while (((lite_i) < (lite_count))) {
            if (((liteFn$frontend$paramNameOf(lite$listAt((lite_params), lite$addInt(lite_first, lite_i, 105220), 105214))) === (lite_label))) {
                return lite_i;
            }
            lite_i = lite$addInt(lite_i, 1n, 105263);
        }
        return (-1n);
    }
    void liteFn$frontend$findParamSlot;
    function liteFn$frontend$skipBalancedArgument(lite_source: string, lite_position: bigint, lite_prefix: string): bigint {
        void lite_source;
        void lite_position;
        void lite_prefix;
        const lite_size = liteFn$lib$core$text$length(lite_source);
        void lite_size;
        let lite_cursor = lite_position;
        void lite_cursor;
        let lite_depth = 0n;
        void lite_depth;
        while (((lite_cursor) < (lite_size))) {
            const lite_ch = liteFn$lib$core$text$at(lite_source, lite_cursor);
            void lite_ch;
            if (((lite_ch) === ("\""))) {
                lite_cursor = liteFn$frontend$skipAliasString(lite_source, lite_cursor);
            } else if (liteFn$lib$core$text$startsWithAt(lite_source, lite_cursor, "/*")) {
                lite_cursor = liteFn$frontend$skipComment(lite_source, lite_cursor, lite_prefix);
            } else if (((((((lite_ch) === ("("))) || (((lite_ch) === ("["))))) || (((lite_ch) === ("{"))))) {
                lite_depth = lite$addInt(lite_depth, 1n, 105891);
                lite_cursor = lite$addInt(lite_cursor, 1n, 105924);
            } else if (((lite_ch) === (")"))) {
                if (((lite_depth) === (0n))) {
                    return lite_cursor;
                }
                lite_depth = lite$subtractInt(lite_depth, 1n, 106030);
                lite_cursor = lite$addInt(lite_cursor, 1n, 106063);
            } else if (((((lite_ch) === ("]"))) || (((lite_ch) === ("}"))))) {
                if (((lite_depth) > (0n))) {
                    lite_depth = lite$subtractInt(lite_depth, 1n, 106152);
                }
                lite_cursor = lite$addInt(lite_cursor, 1n, 106187);
            } else if (((((lite_ch) === (","))) && (((lite_depth) === (0n))))) {
                return lite_cursor;
            } else {
                lite_cursor = lite$addInt(lite_cursor, 1n, 106309);
            }
        }
        return lite_cursor;
    }
    void liteFn$frontend$skipBalancedArgument;
    function liteFn$frontend$collectExplicitCallLabels(lite_source: string, lite_openParen: bigint, lite_prefix: string): string[] {
        void lite_source;
        void lite_openParen;
        void lite_prefix;
        const lite_labels: string[] = [...([])];
        void lite_labels;
        const lite_size = liteFn$lib$core$text$length(lite_source);
        void lite_size;
        let lite_cursor = liteFn$frontend$skipTrivia(lite_source, lite$addInt(lite_openParen, 1n, 106682), lite_prefix);
        void lite_cursor;
        while (((((lite_cursor) < (lite_size))) && (((liteFn$lib$core$text$at(lite_source, lite_cursor)) !== (")"))))) {
            if (liteFn$frontend$isSingleEquals(lite_source, lite_cursor)) {
                const lite_nameStart = liteFn$frontend$skipTrivia(lite_source, lite$addInt(lite_cursor, 1n, 106855), lite_prefix);
                void lite_nameStart;
                if (((((lite_nameStart) < (lite_size))) && (liteFn$lib$core$text$isNameStart(liteFn$lib$core$text$at(lite_source, lite_nameStart))))) {
                    const lite_nameEnd = liteFn$lib$core$text$skipName(lite_source, lite_nameStart);
                    void lite_nameEnd;
                    lite_labels.push(liteFn$lib$core$text$slice(lite_source, lite_nameStart, lite_nameEnd));
                }
            } else if (liteFn$lib$core$text$isNameStart(liteFn$lib$core$text$at(lite_source, lite_cursor))) {
                const lite_nameEnd = liteFn$lib$core$text$skipName(lite_source, lite_cursor);
                void lite_nameEnd;
                const lite_afterName = liteFn$frontend$skipTrivia(lite_source, lite_nameEnd, lite_prefix);
                void lite_afterName;
                if (liteFn$frontend$isSingleEquals(lite_source, lite_afterName)) {
                    lite_labels.push(liteFn$lib$core$text$slice(lite_source, lite_cursor, lite_nameEnd));
                }
            }
            lite_cursor = liteFn$frontend$skipBalancedArgument(lite_source, lite_cursor, lite_prefix);
            if (((((lite_cursor) < (lite_size))) && (((liteFn$lib$core$text$at(lite_source, lite_cursor)) === (","))))) {
                lite_cursor = liteFn$frontend$skipTrivia(lite_source, lite$addInt(lite_cursor, 1n, 107648), lite_prefix);
                if (((((lite_cursor) < (lite_size))) && (((liteFn$lib$core$text$at(lite_source, lite_cursor)) === (")"))))) {
                    break;
                }
            } else {
                break;
            }
        }
        return [...(lite_labels)];
    }
    void liteFn$frontend$collectExplicitCallLabels;
    function liteFn$frontend$parseTupleDestructureTarget(lite_source: string, lite_open: bigint, lite_prefix: string): { namesText: string; count: bigint; grouped: boolean; next: bigint } {
        void lite_source;
        void lite_open;
        void lite_prefix;
        const lite_size = liteFn$lib$core$text$length(lite_source);
        void lite_size;
        let lite_cursor = liteFn$frontend$skipTrivia(lite_source, lite$addInt(lite_open, 1n, 108156), lite_prefix);
        void lite_cursor;
        const lite_names: string[] = [...([])];
        void lite_names;
        let lite_count = 0n;
        void lite_count;
        let lite_hadComma = false;
        void lite_hadComma;
        while (((((lite_cursor) < (lite_size))) && (((liteFn$lib$core$text$at(lite_source, lite_cursor)) !== (")"))))) {
            if ((!(liteFn$lib$core$text$isNameStart(liteFn$lib$core$text$at(lite_source, lite_cursor))))) {
                liteFn$frontend$failAt(lite_source, lite_cursor, lite_prefix, "expected a binding name in tuple destructuring");
            }
            const lite_nameStart = lite_cursor;
            void lite_nameStart;
            lite_cursor = liteFn$lib$core$text$skipName(lite_source, lite_cursor);
            const lite_bindName = liteFn$lib$core$text$slice(lite_source, lite_nameStart, lite_cursor);
            void lite_bindName;
            if (liteFn$frontend$isReservedWord(lite_bindName)) {
                liteFn$frontend$unsupportedFeature(lite_source, lite_nameStart, lite_bindName, lite_prefix);
            }
            lite_names.push(lite_bindName);
            lite_count = lite$addInt(lite_count, 1n, 108792);
            lite_cursor = liteFn$frontend$skipTrivia(lite_source, lite_cursor, lite_prefix);
            if (((((lite_cursor) < (lite_size))) && (((liteFn$lib$core$text$at(lite_source, lite_cursor)) === (","))))) {
                lite_hadComma = true;
                lite_cursor = liteFn$frontend$skipTrivia(lite_source, lite$addInt(lite_cursor, 1n, 108991), lite_prefix);
            } else {
                break;
            }
        }
        const lite_next = liteFn$frontend$expectSymbol(lite_source, lite_cursor, ")", lite_prefix);
        void lite_next;
        return { namesText: liteFn$lib$core$text$joinTexts([...(lite_names)], ","), count: lite_count, grouped: ((((lite_count) === (1n))) && ((!(lite_hadComma)))), next: lite_next };
    }
    void liteFn$frontend$parseTupleDestructureTarget;
    function liteFn$frontend$scanConditionOpen(lite_source: string, lite_start: bigint, lite_prefix: string): bigint {
        void lite_source;
        void lite_start;
        void lite_prefix;
        const lite_size = liteFn$lib$core$text$length(lite_source);
        void lite_size;
        let lite_cursor = lite_start;
        void lite_cursor;
        let lite_depth = 0n;
        void lite_depth;
        while (((lite_cursor) < (lite_size))) {
            const lite_ch = liteFn$lib$core$text$at(lite_source, lite_cursor);
            void lite_ch;
            if (((lite_ch) === ("\""))) {
                lite_cursor = liteFn$frontend$skipAliasString(lite_source, lite_cursor);
            } else if (liteFn$lib$core$text$startsWithAt(lite_source, lite_cursor, "/*")) {
                lite_cursor = liteFn$frontend$skipComment(lite_source, lite_cursor, lite_prefix);
            } else if (((((lite_ch) === ("("))) || (((lite_ch) === ("["))))) {
                lite_depth = lite$addInt(lite_depth, 1n, 109842);
                lite_cursor = lite$addInt(lite_cursor, 1n, 109875);
            } else if (((((lite_ch) === (")"))) || (((lite_ch) === ("]"))))) {
                if (((lite_depth) > (0n))) {
                    lite_depth = lite$subtractInt(lite_depth, 1n, 109964);
                }
                lite_cursor = lite$addInt(lite_cursor, 1n, 109999);
            } else if (((((lite_ch) === ("{"))) && (((lite_depth) === (0n))))) {
                return lite_cursor;
            } else {
                lite_cursor = lite$addInt(lite_cursor, 1n, 110121);
            }
        }
        return (-1n);
    }
    void liteFn$frontend$scanConditionOpen;
    function liteFn$frontend$scanExpressionItemEnd(lite_source: string, lite_start: bigint, lite_prefix: string): bigint {
        void lite_source;
        void lite_start;
        void lite_prefix;
        let lite_cursor = lite_start;
        void lite_cursor;
        let lite_depth = 0n;
        void lite_depth;
        const lite_size = liteFn$lib$core$text$length(lite_source);
        void lite_size;
        while (((lite_cursor) < (lite_size))) {
            const lite_ch = liteFn$lib$core$text$at(lite_source, lite_cursor);
            void lite_ch;
            if (((lite_ch) === ("\""))) {
                lite_cursor = liteFn$frontend$skipAliasString(lite_source, lite_cursor);
            } else if (liteFn$lib$core$text$startsWithAt(lite_source, lite_cursor, "/*")) {
                lite_cursor = liteFn$frontend$skipComment(lite_source, lite_cursor, lite_prefix);
            } else if (((((lite_depth) === (0n))) && ((((((lite_ch) === (";"))) || (((lite_ch) === ("}")))))))) {
                return lite_cursor;
            } else {
                if (((((((lite_ch) === ("("))) || (((lite_ch) === ("["))))) || (((lite_ch) === ("{"))))) {
                    lite_depth = lite$addInt(lite_depth, 1n, 110849);
                    lite_cursor = lite$addInt(lite_cursor, 1n, 110886);
                } else if (((((lite_ch) === ("}"))) && (((lite_depth) === (1n))))) {
                    lite_depth = 0n;
                    lite_cursor = lite$addInt(lite_cursor, 1n, 110999);
                    const lite_afterClose = liteFn$frontend$skipTrivia(lite_source, lite_cursor, lite_prefix);
                    void lite_afterClose;
                    if (((((lite_afterClose) >= (lite_size))) || (((((((!(liteFn$lib$core$text$wordAt(lite_source, lite_afterClose, "else")))) && ((!(liteFn$lib$core$text$wordAt(lite_source, lite_afterClose, "then")))))) && ((!(liteFn$lib$core$text$wordAt(lite_source, lite_afterClose, "finally"))))))))) {
                        return lite_cursor;
                    }
                } else if (((((((lite_ch) === (")"))) || (((lite_ch) === ("]"))))) || (((lite_ch) === ("}"))))) {
                    if (((lite_depth) > (0n))) {
                        lite_depth = lite$subtractInt(lite_depth, 1n, 111465);
                    }
                    lite_cursor = lite$addInt(lite_cursor, 1n, 111504);
                } else {
                    lite_cursor = lite$addInt(lite_cursor, 1n, 111562);
                }
            }
        }
        return lite_cursor;
    }
    void liteFn$frontend$scanExpressionItemEnd;
    function liteFn$frontend$loopValMarkerId(lite_kind: string): bigint {
        void lite_kind;
        if ((!(liteFn$lib$core$text$startsWithAt(lite_kind, 0n, "__loopVal:")))) {
            return (-1n);
        }
        const lite_suffix = liteFn$lib$core$text$slice(lite_kind, 10n, liteFn$lib$core$text$length(lite_kind));
        void lite_suffix;
        if (((lite_suffix) === (""))) {
            return (-1n);
        }
        let lite_value = 0n;
        void lite_value;
        let lite_index = 0n;
        void lite_index;
        while (((lite_index) < (liteFn$lib$core$text$length(lite_suffix)))) {
            const lite_ch = liteFn$lib$core$text$at(lite_suffix, lite_index);
            void lite_ch;
            if ((!(liteFn$lib$core$text$isDigit(lite_ch)))) {
                return (-1n);
            }
            lite_value = lite$addInt(lite$multiplyInt(lite_value, 10n, 112123), liteFn$frontend$decimalDigit(lite_ch), 112128);
            lite_index = lite$addInt(lite_index, 1n, 112170);
        }
        return lite_value;
    }
    void liteFn$frontend$loopValMarkerId;
    function liteFn$frontend$joinBranchKind(lite_current: string, lite_nextKind: string): string {
        void lite_current;
        void lite_nextKind;
        if (((((lite_current) === (""))) || (((lite_current) === ("Never"))))) {
            return lite_nextKind;
        }
        if (((((lite_nextKind) === ("Never"))) || (((lite_nextKind) === (lite_current))))) {
            return lite_current;
        }
        if (((liteFn$frontend$loopValMarkerId(lite_current)) >= (0n))) {
            return lite_nextKind;
        }
        if (((liteFn$frontend$loopValMarkerId(lite_nextKind)) >= (0n))) {
            return lite_current;
        }
        if (liteFn$numeric__literals$numericWidens(lite_current, lite_nextKind)) {
            return lite_current;
        }
        if (liteFn$numeric__literals$numericWidens(lite_nextKind, lite_current)) {
            return lite_nextKind;
        }
        return "";
    }
    void liteFn$frontend$joinBranchKind;
    function liteFn$frontend$ternaryChainCode(lite_target: string, lite_resultKind: string, lite_conditionCodes: string[], lite_branchCodes: string[], lite_branchKinds: string[], lite_branchCount: bigint): string {
        void lite_target;
        void lite_resultKind;
        void lite_conditionCodes;
        void lite_branchCodes;
        void lite_branchKinds;
        void lite_branchCount;
        let lite_code = liteFn$frontend$assignValueCode(lite_target, lite_resultKind, lite$listAt((lite_branchKinds), lite$subtractInt(lite_branchCount, 1n, 113166), 113154), lite$listAt((lite_branchCodes), lite$subtractInt(lite_branchCount, 1n, 113196), 113184));
        void lite_code;
        let lite_index = lite$subtractInt(lite_branchCount, 2n, 113232);
        void lite_index;
        while (((lite_index) >= (0n))) {
            const lite_branchCode = liteFn$frontend$assignValueCode(lite_target, lite_resultKind, lite$listAt((lite_branchKinds), lite_index, 113329), lite$listAt((lite_branchCodes), lite_index, 113349));
            void lite_branchCode;
            lite_code = (((((((((((("(Boolean(") + (lite$listAt((lite_conditionCodes), lite_index, 113402)))) + (") ? "))) + (lite_branchCode))) + (" : "))) + (lite_code))) + (")"));
            lite_index = lite$subtractInt(lite_index, 1n, 113475);
        }
        return lite_code;
    }
    void liteFn$frontend$ternaryChainCode;
    function liteFn$frontend$condBranchStmtCode(lite_target: string, lite_valKind: string, lite_valVar: string, lite_branchKind: string, lite_branchCode: string): string {
        void lite_target;
        void lite_valKind;
        void lite_valVar;
        void lite_branchKind;
        void lite_branchCode;
        return (Boolean(((lite_valKind) === ("Never"))) ? (((("return (") + (lite_branchCode))) + (");")) : (Boolean(((lite_branchKind) === ("Never"))) ? (((("(") + (lite_branchCode))) + (");")) : (Boolean(((lite_valKind) === ("Unit"))) ? (Boolean(((lite_branchCode) === (liteFn$frontend$targetUnitLiteralCode(lite_target)))) ? "" : (((("void (") + (lite_branchCode))) + (");"))) : ((((((lite_valVar) + (" = "))) + (liteFn$frontend$assignValueCode(lite_target, lite_valKind, lite_branchKind, lite_branchCode)))) + (";")))));
    }
    void liteFn$frontend$condBranchStmtCode;
    function liteFn$frontend$ctxCount(lite_ctxs: { id: bigint; tag: string; kind: string; phase: string; iifeDepth: bigint; valKind: string; valVar: string; label: string; iterLabel: string; countVar: string; itemVar: string; itemKind: string; indexVar: string; hasIndex: boolean }[]): bigint {
        void lite_ctxs;
        let lite_count = 0n;
        void lite_count;
        for (const lite$item of [...(lite_ctxs)]) {
            void lite$item;
            lite_count = lite$addInt(lite_count, 1n, 114263);
        }
        return lite_count;
    }
    void liteFn$frontend$ctxCount;
    function liteFn$frontend$appendCtx(lite_ctxs: { id: bigint; tag: string; kind: string; phase: string; iifeDepth: bigint; valKind: string; valVar: string; label: string; iterLabel: string; countVar: string; itemVar: string; itemKind: string; indexVar: string; hasIndex: boolean }[], lite_entry: { id: bigint; tag: string; kind: string; phase: string; iifeDepth: bigint; valKind: string; valVar: string; label: string; iterLabel: string; countVar: string; itemVar: string; itemKind: string; indexVar: string; hasIndex: boolean }): { id: bigint; tag: string; kind: string; phase: string; iifeDepth: bigint; valKind: string; valVar: string; label: string; iterLabel: string; countVar: string; itemVar: string; itemKind: string; indexVar: string; hasIndex: boolean }[] {
        void lite_ctxs;
        void lite_entry;
        const lite_copy: { id: bigint; tag: string; kind: string; phase: string; iifeDepth: bigint; valKind: string; valVar: string; label: string; iterLabel: string; countVar: string; itemVar: string; itemKind: string; indexVar: string; hasIndex: boolean }[] = [...([])];
        void lite_copy;
        for (const lite_existing of [...(lite_ctxs)]) {
            void lite_existing;
            lite_copy.push(lite_existing);
        }
        lite_copy.push(lite_entry);
        return [...(lite_copy)];
    }
    void liteFn$frontend$appendCtx;
    function liteFn$frontend$nextCtxId(lite_ctxs: { id: bigint; tag: string; kind: string; phase: string; iifeDepth: bigint; valKind: string; valVar: string; label: string; iterLabel: string; countVar: string; itemVar: string; itemKind: string; indexVar: string; hasIndex: boolean }[]): bigint {
        void lite_ctxs;
        let lite_highest = 0n;
        void lite_highest;
        for (const lite_existing of [...(lite_ctxs)]) {
            void lite_existing;
            if ((((lite_existing).id) > (lite_highest))) {
                lite_highest = (lite_existing).id;
            }
        }
        return lite$addInt(lite_highest, 1n, 114862);
    }
    void liteFn$frontend$nextCtxId;
    function liteFn$frontend$findTaggedCtxIndex(lite_ctxs: { id: bigint; tag: string; kind: string; phase: string; iifeDepth: bigint; valKind: string; valVar: string; label: string; iterLabel: string; countVar: string; itemVar: string; itemKind: string; indexVar: string; hasIndex: boolean }[], lite_tag: string): bigint {
        void lite_ctxs;
        void lite_tag;
        let lite_index = lite$subtractInt(liteFn$frontend$ctxCount([...(lite_ctxs)]), 1n, 115052);
        void lite_index;
        while (((lite_index) >= (0n))) {
            if ((((lite$listAt((lite_ctxs), lite_index, 115095)).tag) === (lite_tag))) {
                return lite_index;
            }
            lite_index = lite$subtractInt(lite_index, 1n, 115153);
        }
        return (-1n);
    }
    void liteFn$frontend$findTaggedCtxIndex;
    function liteFn$frontend$findCtxByKindIndex(lite_ctxs: { id: bigint; tag: string; kind: string; phase: string; iifeDepth: bigint; valKind: string; valVar: string; label: string; iterLabel: string; countVar: string; itemVar: string; itemKind: string; indexVar: string; hasIndex: boolean }[], lite_kind: string): bigint {
        void lite_ctxs;
        void lite_kind;
        let lite_index = lite$subtractInt(liteFn$frontend$ctxCount([...(lite_ctxs)]), 1n, 115359);
        void lite_index;
        while (((lite_index) >= (0n))) {
            if ((((lite$listAt((lite_ctxs), lite_index, 115402)).kind) === (lite_kind))) {
                return lite_index;
            }
            lite_index = lite$subtractInt(lite_index, 1n, 115462);
        }
        return (-1n);
    }
    void liteFn$frontend$findCtxByKindIndex;
    function liteFn$frontend$visibleLocals(lite_locals: { name: string; runtime: string; kind: string; mutable: boolean; writable: boolean; depth: bigint; constant: boolean; code: string; intValue: bigint; textValue: string; initState: string }[], lite_depth: bigint): { name: string; runtime: string; kind: string; mutable: boolean; writable: boolean; depth: bigint; constant: boolean; code: string; intValue: bigint; textValue: string; initState: string }[] {
        void lite_locals;
        void lite_depth;
        const lite_kept: { name: string; runtime: string; kind: string; mutable: boolean; writable: boolean; depth: bigint; constant: boolean; code: string; intValue: bigint; textValue: string; initState: string }[] = [...([])];
        void lite_kept;
        for (const lite_entry of [...(lite_locals)]) {
            void lite_entry;
            if ((((lite_entry).depth) < (lite_depth))) {
                lite_kept.push(lite_entry);
            }
        }
        return [...(lite_kept)];
    }
    void liteFn$frontend$visibleLocals;
    function liteFn$frontend$blockCompletion(lite_kind: string, lite_completed: boolean, lite_branchesComplete: boolean, lite_hasElse: boolean, lite_loopForever: boolean): boolean {
        void lite_kind;
        void lite_completed;
        void lite_branchesComplete;
        void lite_hasElse;
        void lite_loopForever;
        return (Boolean(((((((lite_kind) === ("scope"))) || (((lite_kind) === ("matchsingle"))))) || (((lite_kind) === ("matchsingleval"))))) ? lite_completed : (Boolean(((lite_kind) === ("loop"))) ? ((lite_loopForever) && (lite_completed)) : ((((lite_hasElse) && (lite_branchesComplete))) && (lite_completed))));
    }
    void liteFn$frontend$blockCompletion;
    function liteFn$frontend$itemsCount(lite_items: { kind: string; name: string; runtime: string; code: string; intValue: bigint; textValue: string }[]): bigint {
        void lite_items;
        let lite_count = 0n;
        void lite_count;
        for (const lite$item of [...(lite_items)]) {
            void lite$item;
            lite_count = lite$addInt(lite_count, 1n, 116494);
        }
        return lite_count;
    }
    void liteFn$frontend$itemsCount;
    function liteFn$frontend$setItemAt(lite_items: { kind: string; name: string; runtime: string; code: string; intValue: bigint; textValue: string }[], lite_targetIndex: bigint, lite_replacement: { kind: string; name: string; runtime: string; code: string; intValue: bigint; textValue: string }): { kind: string; name: string; runtime: string; code: string; intValue: bigint; textValue: string }[] {
        void lite_items;
        void lite_targetIndex;
        void lite_replacement;
        const lite_updated: { kind: string; name: string; runtime: string; code: string; intValue: bigint; textValue: string }[] = [...([])];
        void lite_updated;
        let lite_index = 0n;
        void lite_index;
        for (const lite_existing of [...(lite_items)]) {
            void lite_existing;
            if (((lite_index) === (lite_targetIndex))) {
                lite_updated.push(lite_replacement);
            } else {
                lite_updated.push(lite_existing);
            }
            lite_index = lite$addInt(lite_index, 1n, 116952);
        }
        return [...(lite_updated)];
    }
    void liteFn$frontend$setItemAt;
    function liteFn$frontend$itemsUseTransferCall(lite_items: { kind: string; name: string; runtime: string; code: string; intValue: bigint; textValue: string }[], lite_startIndex: bigint, lite_needle: string): boolean {
        void lite_items;
        void lite_startIndex;
        void lite_needle;
        let lite_index = lite_startIndex;
        void lite_index;
        const lite_total = liteFn$frontend$itemsCount([...(lite_items)]);
        void lite_total;
        while (((lite_index) < (lite_total))) {
            if (liteFn$frontend$codeUsesTextCall((lite$listAt((lite_items), lite_index, 117297)).code, lite_needle)) {
                return true;
            }
            lite_index = lite$addInt(lite_index, 1n, 117357);
        }
        return false;
    }
    void liteFn$frontend$itemsUseTransferCall;
    function liteFn$frontend$parseTagAt(lite_source: string, lite_atPos: bigint, lite_prefix: string): { tag: string; next: bigint; at: bigint } {
        void lite_source;
        void lite_atPos;
        void lite_prefix;
        const lite_size = liteFn$lib$core$text$length(lite_source);
        void lite_size;
        const lite_nameStart = lite$addInt(lite_atPos, 1n, 117590);
        void lite_nameStart;
        if (((((lite_nameStart) >= (lite_size))) || ((!(liteFn$lib$core$text$isNameStart(liteFn$lib$core$text$at(lite_source, lite_nameStart))))))) {
            liteFn$frontend$failAt(lite_source, lite_atPos, lite_prefix, "expected tag name after @");
        }
        const lite_nameEnd = liteFn$lib$core$text$skipName(lite_source, lite_nameStart);
        void lite_nameEnd;
        const lite_tag = liteFn$lib$core$text$slice(lite_source, lite_nameStart, lite_nameEnd);
        void lite_tag;
        if (liteFn$frontend$isReservedWord(lite_tag)) {
            liteFn$frontend$failAt(lite_source, lite_nameStart, lite_prefix, (("tag name cannot be reserved word ") + (lite_tag)));
        }
        return { tag: lite_tag, next: lite_nameEnd, at: lite_atPos };
    }
    void liteFn$frontend$parseTagAt;
    function liteFn$frontend$rejectMisplacedTag(lite_source: string, lite_position: bigint, lite_prefix: string, lite_message: string): void {
        void lite_source;
        void lite_position;
        void lite_prefix;
        void lite_message;
        const lite_pos = liteFn$frontend$skipTrivia(lite_source, lite_position, lite_prefix);
        void lite_pos;
        if (((((lite_pos) < (liteFn$lib$core$text$length(lite_source)))) && (((liteFn$lib$core$text$at(lite_source, lite_pos)) === ("@"))))) {
            liteFn$frontend$failAt(lite_source, lite_pos, lite_prefix, lite_message);
        }
    }
    void liteFn$frontend$rejectMisplacedTag;
    function liteFn$frontend$rejectHeaderBlockTag(lite_source: string, lite_position: bigint, lite_prefix: string, lite_constructName: string): void {
        void lite_source;
        void lite_position;
        void lite_prefix;
        void lite_constructName;
        const lite_pos = liteFn$frontend$skipTrivia(lite_source, lite_position, lite_prefix);
        void lite_pos;
        const lite_size = liteFn$lib$core$text$length(lite_source);
        void lite_size;
        if (((((lite_pos) < (lite_size))) && (((liteFn$lib$core$text$at(lite_source, lite_pos)) === ("@"))))) {
            const lite_parsed = liteFn$frontend$parseTagAt(lite_source, lite_pos, lite_prefix);
            void lite_parsed;
            const lite_afterTag = liteFn$frontend$skipTrivia(lite_source, (lite_parsed).next, lite_prefix);
            void lite_afterTag;
            if (((((lite_afterTag) >= (lite_size))) || (((liteFn$lib$core$text$at(lite_source, lite_afterTag)) !== ("."))))) {
                liteFn$frontend$failAt(lite_source, lite_pos, lite_prefix, (((((((("unexpected block tag @") + ((lite_parsed).tag))) + (" in "))) + (lite_constructName))) + (" header")));
            }
        }
    }
    void liteFn$frontend$rejectHeaderBlockTag;
    function liteFn$frontend$hasMarkerPrefix(lite_parsed: { kind: string; code: string; intValue: bigint; textValue: string; constant: boolean; next: bigint }): boolean {
        void lite_parsed;
        return (((!((lite_parsed).constant))) && (liteFn$lib$core$text$startsWithAt((lite_parsed).textValue, 0n, "__m:")));
    }
    void liteFn$frontend$hasMarkerPrefix;
    function liteFn$frontend$collectParsedMarkers(lite_current: string, lite_parsed: { kind: string; code: string; intValue: bigint; textValue: string; constant: boolean; next: bigint }): string {
        void lite_current;
        void lite_parsed;
        if (liteFn$frontend$hasMarkerPrefix(lite_parsed)) {
            return ((lite_current) + (liteFn$lib$core$text$slice((lite_parsed).textValue, 4n, liteFn$lib$core$text$length((lite_parsed).textValue))));
        }
        return lite_current;
    }
    void liteFn$frontend$collectParsedMarkers;
    function liteFn$frontend$wrapMarkers(lite_raw: string): string {
        void lite_raw;
        return (Boolean(((lite_raw) === (""))) ? "" : (("__m:") + (lite_raw)));
    }
    void liteFn$frontend$wrapMarkers;
    function liteFn$frontend$withMarkers(lite_parsed: { kind: string; code: string; intValue: bigint; textValue: string; constant: boolean; next: bigint }, lite_raw: string): { kind: string; code: string; intValue: bigint; textValue: string; constant: boolean; next: bigint } {
        void lite_parsed;
        void lite_raw;
        if (((lite_raw) === (""))) {
            return lite_parsed;
        }
        return { kind: (lite_parsed).kind, code: (lite_parsed).code, intValue: (lite_parsed).intValue, textValue: (("__m:") + (lite_raw)), constant: false, next: (lite_parsed).next };
    }
    void liteFn$frontend$withMarkers;
    function liteFn$frontend$filterOtherMarkers(lite_raw: string, lite_excludeId: bigint): string {
        void lite_raw;
        void lite_excludeId;
        const lite_excludeKey = liteFn$lib$core$int$intText(lite_excludeId);
        void lite_excludeKey;
        const lite_size = liteFn$lib$core$text$length(lite_raw);
        void lite_size;
        let lite_cursor = 0n;
        void lite_cursor;
        let lite_kept = "";
        void lite_kept;
        while (((lite_cursor) < (lite_size))) {
            const lite_eqPos = liteFn$lib$core$text$indexOfText(lite_raw, "=", lite_cursor);
            void lite_eqPos;
            if (((lite_eqPos) < (0n))) {
                break;
            }
            const lite_nlPos = liteFn$lib$core$text$indexOfText(lite_raw, "\n", lite$addInt(lite_eqPos, 1n, 120518));
            void lite_nlPos;
            const lite_endPos = (Boolean(((lite_nlPos) < (0n))) ? lite_size : lite_nlPos);
            void lite_endPos;
            const lite_entryId = liteFn$lib$core$text$slice(lite_raw, lite_cursor, lite_eqPos);
            void lite_entryId;
            if (((lite_entryId) !== (lite_excludeKey))) {
                lite_kept = ((((lite_kept) + (liteFn$lib$core$text$slice(lite_raw, lite_cursor, lite_endPos)))) + ("\n"));
            }
            lite_cursor = lite$addInt(lite_endPos, 1n, 120773);
        }
        return lite_kept;
    }
    void liteFn$frontend$filterOtherMarkers;
    function liteFn$frontend$inferKindFromMarkers(lite_raw: string, lite_targetId: bigint, lite_targetTag: string, lite_source: string, lite_at: bigint, lite_prefix: string, lite_blockStopped: boolean): string {
        void lite_raw;
        void lite_targetId;
        void lite_targetTag;
        void lite_source;
        void lite_at;
        void lite_prefix;
        void lite_blockStopped;
        const lite_idKey = liteFn$lib$core$int$intText(lite_targetId);
        void lite_idKey;
        const lite_size = liteFn$lib$core$text$length(lite_raw);
        void lite_size;
        let lite_cursor = 0n;
        void lite_cursor;
        let lite_result = "";
        void lite_result;
        while (((lite_cursor) < (lite_size))) {
            const lite_eqPos = liteFn$lib$core$text$indexOfText(lite_raw, "=", lite_cursor);
            void lite_eqPos;
            if (((lite_eqPos) < (0n))) {
                break;
            }
            const lite_nlPos = liteFn$lib$core$text$indexOfText(lite_raw, "\n", lite$addInt(lite_eqPos, 1n, 121341));
            void lite_nlPos;
            const lite_endPos = (Boolean(((lite_nlPos) < (0n))) ? lite_size : lite_nlPos);
            void lite_endPos;
            const lite_entryId = liteFn$lib$core$text$slice(lite_raw, lite_cursor, lite_eqPos);
            void lite_entryId;
            const lite_entryKind = liteFn$lib$core$text$slice(lite_raw, lite$addInt(lite_eqPos, 1n, 121503), lite_endPos);
            void lite_entryKind;
            if (((lite_entryId) === (lite_idKey))) {
                if (((lite_result) === (""))) {
                    lite_result = lite_entryKind;
                } else {
                    const lite_joined = liteFn$frontend$joinBranchKind(lite_result, lite_entryKind);
                    void lite_joined;
                    if (((lite_joined) === (""))) {
                        liteFn$frontend$failAt(lite_source, lite_at, lite_prefix, (((((((((("block @") + (lite_targetTag))) + (" cannot return both "))) + (liteFn$frontend$displayKind(lite_result)))) + (" and "))) + (liteFn$frontend$displayKind(lite_entryKind))));
                    }
                    lite_result = lite_joined;
                }
            }
            lite_cursor = lite$addInt(lite_endPos, 1n, 122005);
        }
        return (Boolean(((lite_result) === (""))) ? (Boolean(lite_blockStopped) ? "Never" : "Unit") : lite_result);
    }
    void liteFn$frontend$inferKindFromMarkers;
    function liteFn$frontend$callReordersArgs(lite_source: string, lite_openParen: bigint, lite_prefix: string, lite_params: string[], lite_firstParam: bigint, lite_paramCount: bigint): boolean {
        void lite_source;
        void lite_openParen;
        void lite_prefix;
        void lite_params;
        void lite_firstParam;
        void lite_paramCount;
        const lite_size = liteFn$lib$core$text$length(lite_source);
        void lite_size;
        let lite_cursor = liteFn$frontend$skipTrivia(lite_source, lite$addInt(lite_openParen, 1n, 122464), lite_prefix);
        void lite_cursor;
        if (((((lite_cursor) >= (lite_size))) || (((liteFn$lib$core$text$at(lite_source, lite_cursor)) === (")"))))) {
            return false;
        }
        let lite_entryIdx = 0n;
        void lite_entryIdx;
        let lite_atArgStart = true;
        void lite_atArgStart;
        let lite_depth = 0n;
        void lite_depth;
        while (((lite_cursor) < (lite_size))) {
            if (((lite_atArgStart) && (((lite_depth) === (0n))))) {
                if (((liteFn$lib$core$text$at(lite_source, lite_cursor)) === (")"))) {
                    break;
                }
                let lite_label = "";
                void lite_label;
                if (liteFn$frontend$isSingleEquals(lite_source, lite_cursor)) {
                    const lite_nameStart = liteFn$frontend$skipTrivia(lite_source, lite$addInt(lite_cursor, 1n, 122882), lite_prefix);
                    void lite_nameStart;
                    if (((((lite_nameStart) < (lite_size))) && (liteFn$lib$core$text$isNameStart(liteFn$lib$core$text$at(lite_source, lite_nameStart))))) {
                        lite_label = liteFn$lib$core$text$slice(lite_source, lite_nameStart, liteFn$lib$core$text$skipName(lite_source, lite_nameStart));
                    }
                } else if (liteFn$lib$core$text$isNameStart(liteFn$lib$core$text$at(lite_source, lite_cursor))) {
                    const lite_nameEnd = liteFn$lib$core$text$skipName(lite_source, lite_cursor);
                    void lite_nameEnd;
                    const lite_afterName = liteFn$frontend$skipTrivia(lite_source, lite_nameEnd, lite_prefix);
                    void lite_afterName;
                    if (liteFn$frontend$isSingleEquals(lite_source, lite_afterName)) {
                        lite_label = liteFn$lib$core$text$slice(lite_source, lite_cursor, lite_nameEnd);
                    }
                }
                if (((((lite_label) !== (""))) && (((liteFn$frontend$findParamSlot([...(lite_params)], lite_firstParam, lite_paramCount, lite_label)) !== (lite_entryIdx))))) {
                    return true;
                }
                lite_atArgStart = false;
            }
            const lite_ch = liteFn$lib$core$text$at(lite_source, lite_cursor);
            void lite_ch;
            if (((lite_ch) === ("\""))) {
                lite_cursor = liteFn$frontend$skipAliasString(lite_source, lite_cursor);
            } else if (liteFn$lib$core$text$startsWithAt(lite_source, lite_cursor, "/*")) {
                lite_cursor = liteFn$frontend$skipComment(lite_source, lite_cursor, lite_prefix);
            } else if (((((((lite_ch) === ("("))) || (((lite_ch) === ("["))))) || (((lite_ch) === ("{"))))) {
                lite_depth = lite$addInt(lite_depth, 1n, 123968);
                lite_cursor = lite$addInt(lite_cursor, 1n, 124001);
            } else if (((((((lite_ch) === (")"))) || (((lite_ch) === ("]"))))) || (((lite_ch) === ("}"))))) {
                if (((((lite_depth) === (0n))) && (((lite_ch) === (")"))))) {
                    lite_entryIdx = lite$addInt(lite_entryIdx, 1n, 124140);
                    break;
                }
                if (((lite_depth) > (0n))) {
                    lite_depth = lite$subtractInt(lite_depth, 1n, 124223);
                }
                lite_cursor = lite$addInt(lite_cursor, 1n, 124258);
            } else if (((((lite_depth) === (0n))) && (((lite_ch) === (","))))) {
                lite_entryIdx = lite$addInt(lite_entryIdx, 1n, 124340);
                lite_cursor = liteFn$frontend$skipTrivia(lite_source, lite$addInt(lite_cursor, 1n, 124392), lite_prefix);
                if (((((lite_cursor) < (lite_size))) && (((liteFn$lib$core$text$at(lite_source, lite_cursor)) === (")"))))) {
                    break;
                }
                lite_atArgStart = true;
            } else {
                lite_cursor = lite$addInt(lite_cursor, 1n, 124560);
            }
        }
        return ((lite_entryIdx) !== (lite_paramCount));
    }
    void liteFn$frontend$callReordersArgs;
    function liteFn$frontend$scanBraceEnd(lite_source: string, lite_open: bigint, lite_prefix: string): bigint {
        void lite_source;
        void lite_open;
        void lite_prefix;
        const lite_size = liteFn$lib$core$text$length(lite_source);
        void lite_size;
        let lite_cursor = lite_open;
        void lite_cursor;
        let lite_depth = 0n;
        void lite_depth;
        while (((lite_cursor) < (lite_size))) {
            const lite_ch = liteFn$lib$core$text$at(lite_source, lite_cursor);
            void lite_ch;
            if (((lite_ch) === ("\""))) {
                lite_cursor = liteFn$frontend$skipAliasString(lite_source, lite_cursor);
            } else if (liteFn$lib$core$text$startsWithAt(lite_source, lite_cursor, "/*")) {
                lite_cursor = liteFn$frontend$skipComment(lite_source, lite_cursor, lite_prefix);
            } else if (((lite_ch) === ("{"))) {
                lite_depth = lite$addInt(lite_depth, 1n, 125216);
                lite_cursor = lite$addInt(lite_cursor, 1n, 125249);
            } else if (((lite_ch) === ("}"))) {
                lite_depth = lite$subtractInt(lite_depth, 1n, 125310);
                lite_cursor = lite$addInt(lite_cursor, 1n, 125343);
                if (((lite_depth) === (0n))) {
                    return lite_cursor;
                }
            } else {
                lite_cursor = lite$addInt(lite_cursor, 1n, 125438);
            }
        }
        return (-1n);
    }
    void liteFn$frontend$scanBraceEnd;
    function liteFn$frontend$valueIfBranchAt(lite_source: string, lite_open: bigint, lite_close: bigint, lite_prefix: string): boolean {
        void lite_source;
        void lite_open;
        void lite_close;
        void lite_prefix;
        let lite_cursor = liteFn$frontend$skipTrivia(lite_source, lite$addInt(lite_open, 1n, 125730), lite_prefix);
        void lite_cursor;
        if (((lite_cursor) >= (lite_close))) {
            return false;
        }
        if (liteFn$lib$core$text$isNameStart(liteFn$lib$core$text$at(lite_source, lite_cursor))) {
            const lite_word = liteFn$lib$core$text$slice(lite_source, lite_cursor, liteFn$lib$core$text$skipName(lite_source, lite_cursor));
            void lite_word;
            if (((((((((((((((((((lite_word) === ("return"))) || (((lite_word) === ("outputLine"))))) || (((lite_word) === ("output"))))) || (((lite_word) === ("var"))))) || (((lite_word) === ("loop"))))) || (((lite_word) === ("break"))))) || (((lite_word) === ("continue"))))) || (((lite_word) === ("else"))))) || (((lite_word) === ("fn"))))) {
                return false;
            }
        }
        let lite_scan = lite_cursor;
        void lite_scan;
        while (((lite_scan) < (lite_close))) {
            const lite_ch = liteFn$lib$core$text$at(lite_source, lite_scan);
            void lite_ch;
            if (((lite_ch) === ("\""))) {
                lite_scan = liteFn$frontend$skipAliasString(lite_source, lite_scan);
            } else if (liteFn$lib$core$text$startsWithAt(lite_source, lite_scan, "/*")) {
                lite_scan = liteFn$frontend$skipComment(lite_source, lite_scan, lite_prefix);
            } else if (((((lite_ch) === (";"))) || (liteFn$lib$core$text$startsWithAt(lite_source, lite_scan, ".output")))) {
                return false;
            } else {
                lite_scan = lite$addInt(lite_scan, 1n, 126584);
            }
        }
        return true;
    }
    void liteFn$frontend$valueIfBranchAt;
    function liteFn$frontend$skipOptionalScanTag(lite_source: string, lite_position: bigint, lite_prefix: string, lite_keyword: string): bigint {
        void lite_source;
        void lite_position;
        void lite_prefix;
        void lite_keyword;
        const lite_cursor = liteFn$frontend$skipTrivia(lite_source, lite_position, lite_prefix);
        void lite_cursor;
        const lite_size = liteFn$lib$core$text$length(lite_source);
        void lite_size;
        if (((((lite_cursor) >= (lite_size))) || (((liteFn$lib$core$text$at(lite_source, lite_cursor)) !== ("@"))))) {
            return lite_cursor;
        }
        const lite_nameStart = lite$addInt(lite_cursor, 1n, 127075);
        void lite_nameStart;
        if (((((lite_nameStart) >= (lite_size))) || ((!(liteFn$lib$core$text$isNameStart(liteFn$lib$core$text$at(lite_source, lite_nameStart))))))) {
            return (-1n);
        }
        const lite_afterTag = liteFn$frontend$skipTrivia(lite_source, liteFn$lib$core$text$skipName(lite_source, lite_nameStart), lite_prefix);
        void lite_afterTag;
        return (Boolean(((((lite_afterTag) < (lite_size))) && (liteFn$lib$core$text$wordAt(lite_source, lite_afterTag, lite_keyword)))) ? lite_afterTag : (-1n));
    }
    void liteFn$frontend$skipOptionalScanTag;
    function liteFn$frontend$scanTrailingThenEnd(lite_source: string, lite_position: bigint, lite_prefix: string, lite_requireThenValue: boolean): bigint {
        void lite_source;
        void lite_position;
        void lite_prefix;
        void lite_requireThenValue;
        const lite_size = liteFn$lib$core$text$length(lite_source);
        void lite_size;
        const lite_after = liteFn$frontend$skipTrivia(lite_source, lite_position, lite_prefix);
        void lite_after;
        if (((((lite_after) >= (lite_size))) || ((!(liteFn$lib$core$text$wordAt(lite_source, lite_after, "then")))))) {
            return (-2n);
        }
        const lite_thenOpen = liteFn$frontend$skipTrivia(lite_source, lite$addInt(lite_after, 4n, 127805), lite_prefix);
        void lite_thenOpen;
        if (((((lite_thenOpen) >= (lite_size))) || (((liteFn$lib$core$text$at(lite_source, lite_thenOpen)) !== ("{"))))) {
            return (-1n);
        }
        const lite_thenEnd = liteFn$frontend$scanBraceEnd(lite_source, lite_thenOpen, lite_prefix);
        void lite_thenEnd;
        if (((lite_thenEnd) < (0n))) {
            return (-1n);
        }
        if (((lite_requireThenValue) && ((!(liteFn$frontend$valueIfBranchAt(lite_source, lite_thenOpen, lite$subtractInt(lite_thenEnd, 1n, 128061), lite_prefix)))))) {
            return (-1n);
        }
        return lite_thenEnd;
    }
    void liteFn$frontend$scanTrailingThenEnd;
    function liteFn$frontend$scanTrailingFinallyEnd(lite_source: string, lite_position: bigint, lite_prefix: string): bigint {
        void lite_source;
        void lite_position;
        void lite_prefix;
        const lite_size = liteFn$lib$core$text$length(lite_source);
        void lite_size;
        const lite_after = liteFn$frontend$skipTrivia(lite_source, lite_position, lite_prefix);
        void lite_after;
        if (((((lite_after) >= (lite_size))) || ((!(liteFn$lib$core$text$wordAt(lite_source, lite_after, "finally")))))) {
            return lite_position;
        }
        const lite_finOpen = liteFn$frontend$skipTrivia(lite_source, lite$addInt(lite_after, 7n, 128516), lite_prefix);
        void lite_finOpen;
        if (((((lite_finOpen) >= (lite_size))) || (((liteFn$lib$core$text$at(lite_source, lite_finOpen)) !== ("{"))))) {
            return (-1n);
        }
        return liteFn$frontend$scanBraceEnd(lite_source, lite_finOpen, lite_prefix);
    }
    void liteFn$frontend$scanTrailingFinallyEnd;
    function liteFn$frontend$scanRawIfChainEnd(lite_source: string, lite_position: bigint, lite_prefix: string, lite_allowPartial: boolean): bigint {
        void lite_source;
        void lite_position;
        void lite_prefix;
        void lite_allowPartial;
        const lite_size = liteFn$lib$core$text$length(lite_source);
        void lite_size;
        let lite_cursor = liteFn$frontend$skipOptionalScanTag(lite_source, lite_position, lite_prefix, "if");
        void lite_cursor;
        if (((((lite_cursor) < (0n))) || ((!(liteFn$lib$core$text$wordAt(lite_source, lite_cursor, "if")))))) {
            return (-1n);
        }
        lite_cursor = liteFn$frontend$skipTrivia(lite_source, lite$addInt(lite_cursor, 2n, 129094), lite_prefix);
        while (Boolean(true)) {
            const lite_open = liteFn$frontend$scanConditionOpen(lite_source, lite_cursor, lite_prefix);
            void lite_open;
            if (((lite_open) < (0n))) {
                return (-1n);
            }
            const lite_end = liteFn$frontend$scanBraceEnd(lite_source, lite_open, lite_prefix);
            void lite_end;
            if (((lite_end) < (0n))) {
                return (-1n);
            }
            const lite_after = liteFn$frontend$skipTrivia(lite_source, lite_end, lite_prefix);
            void lite_after;
            if ((!(liteFn$lib$core$text$wordAt(lite_source, lite_after, "else")))) {
                return (Boolean(lite_allowPartial) ? lite_end : (-1n));
            }
            const lite_afterElse = liteFn$frontend$skipTrivia(lite_source, lite$addInt(lite_after, 4n, 129520), lite_prefix);
            void lite_afterElse;
            if (liteFn$lib$core$text$wordAt(lite_source, lite_afterElse, "if")) {
                lite_cursor = liteFn$frontend$skipTrivia(lite_source, lite$addInt(lite_afterElse, 2n, 129637), lite_prefix);
            } else {
                if (((((lite_afterElse) >= (lite_size))) || (((liteFn$lib$core$text$at(lite_source, lite_afterElse)) !== ("{"))))) {
                    return (-1n);
                }
                const lite_finalEnd = liteFn$frontend$scanBraceEnd(lite_source, lite_afterElse, lite_prefix);
                void lite_finalEnd;
                return lite_finalEnd;
            }
        }
        return (-1n);
    }
    void liteFn$frontend$scanRawIfChainEnd;
    function liteFn$frontend$scanIfChainEnd(lite_source: string, lite_position: bigint, lite_prefix: string, lite_requireValueBranches: boolean, lite_allowPartial: boolean): bigint {
        void lite_source;
        void lite_position;
        void lite_prefix;
        void lite_requireValueBranches;
        void lite_allowPartial;
        const lite_size = liteFn$lib$core$text$length(lite_source);
        void lite_size;
        let lite_cursor = liteFn$frontend$skipOptionalScanTag(lite_source, lite_position, lite_prefix, "if");
        void lite_cursor;
        if (((((lite_cursor) < (0n))) || ((!(liteFn$lib$core$text$wordAt(lite_source, lite_cursor, "if")))))) {
            return (-1n);
        }
        lite_cursor = liteFn$frontend$skipTrivia(lite_source, lite$addInt(lite_cursor, 2n, 130357), lite_prefix);
        let lite_allBranchesValue = true;
        void lite_allBranchesValue;
        while (Boolean(true)) {
            const lite_open = liteFn$frontend$scanConditionOpen(lite_source, lite_cursor, lite_prefix);
            void lite_open;
            if (((lite_open) < (0n))) {
                return (-1n);
            }
            const lite_end = liteFn$frontend$scanBraceEnd(lite_source, lite_open, lite_prefix);
            void lite_end;
            if (((lite_end) < (0n))) {
                return (-1n);
            }
            if (((lite_requireValueBranches) && ((!(liteFn$frontend$valueIfBranchAt(lite_source, lite_open, lite$subtractInt(lite_end, 1n, 130674), lite_prefix)))))) {
                lite_allBranchesValue = false;
            }
            const lite_after = liteFn$frontend$skipTrivia(lite_source, lite_end, lite_prefix);
            void lite_after;
            if ((!(liteFn$lib$core$text$wordAt(lite_source, lite_after, "else")))) {
                if ((!(lite_allowPartial))) {
                    return (-1n);
                }
                if (liteFn$lib$core$text$wordAt(lite_source, lite_after, "then")) {
                    return (-1n);
                }
                if (((lite_requireValueBranches) && ((!(lite_allBranchesValue))))) {
                    return (-1n);
                }
                return liteFn$frontend$scanTrailingFinallyEnd(lite_source, lite_end, lite_prefix);
            }
            const lite_afterElse = liteFn$frontend$skipTrivia(lite_source, lite$addInt(lite_after, 4n, 131133), lite_prefix);
            void lite_afterElse;
            if (liteFn$lib$core$text$wordAt(lite_source, lite_afterElse, "if")) {
                lite_cursor = liteFn$frontend$skipTrivia(lite_source, lite$addInt(lite_afterElse, 2n, 131250), lite_prefix);
            } else {
                if (((((lite_afterElse) >= (lite_size))) || (((liteFn$lib$core$text$at(lite_source, lite_afterElse)) !== ("{"))))) {
                    return (-1n);
                }
                const lite_finalEnd = liteFn$frontend$scanBraceEnd(lite_source, lite_afterElse, lite_prefix);
                void lite_finalEnd;
                if (((lite_finalEnd) < (0n))) {
                    return (-1n);
                }
                if (((lite_requireValueBranches) && ((!(liteFn$frontend$valueIfBranchAt(lite_source, lite_afterElse, lite$subtractInt(lite_finalEnd, 1n, 131566), lite_prefix)))))) {
                    lite_allBranchesValue = false;
                }
                const lite_thenEnd = liteFn$frontend$scanTrailingThenEnd(lite_source, lite_finalEnd, lite_prefix, lite_requireValueBranches);
                void lite_thenEnd;
                if (((lite_thenEnd) === ((-1n)))) {
                    return (-1n);
                }
                const lite_baseEnd = (Boolean(((lite_thenEnd) === ((-2n)))) ? (Boolean(((lite_requireValueBranches) && ((!(lite_allBranchesValue))))) ? (-1n) : lite_finalEnd) : lite_thenEnd);
                void lite_baseEnd;
                if (((lite_baseEnd) < (0n))) {
                    return (-1n);
                }
                return liteFn$frontend$scanTrailingFinallyEnd(lite_source, lite_baseEnd, lite_prefix);
            }
        }
        return (-1n);
    }
    void liteFn$frontend$scanIfChainEnd;
    function liteFn$frontend$scanValueIfEnd(lite_source: string, lite_position: bigint, lite_prefix: string, lite_requireValueBranches: boolean): bigint {
        void lite_source;
        void lite_position;
        void lite_prefix;
        void lite_requireValueBranches;
        return liteFn$frontend$scanIfChainEnd(lite_source, lite_position, lite_prefix, lite_requireValueBranches, false);
    }
    void liteFn$frontend$scanValueIfEnd;
    function liteFn$frontend$scanRawMatchEnd(lite_source: string, lite_position: bigint, lite_prefix: string): bigint {
        void lite_source;
        void lite_position;
        void lite_prefix;
        const lite_size = liteFn$lib$core$text$length(lite_source);
        void lite_size;
        let lite_cursor = liteFn$frontend$skipOptionalScanTag(lite_source, lite_position, lite_prefix, "match");
        void lite_cursor;
        if (((((lite_cursor) < (0n))) || ((!(liteFn$lib$core$text$wordAt(lite_source, lite_cursor, "match")))))) {
            return (-1n);
        }
        const lite_openMatch = liteFn$frontend$skipTrivia(lite_source, lite$addInt(lite_cursor, 5n, 132762), lite_prefix);
        void lite_openMatch;
        if (((((lite_openMatch) >= (lite_size))) || (((liteFn$lib$core$text$at(lite_source, lite_openMatch)) !== ("{"))))) {
            return (-1n);
        }
        let lite_armCursor = liteFn$frontend$skipItemSeparators(lite_source, lite$addInt(lite_openMatch, 1n, 132915), lite_prefix);
        void lite_armCursor;
        while (((lite_armCursor) < (lite_size))) {
            if (((liteFn$lib$core$text$at(lite_source, lite_armCursor)) === ("}"))) {
                return (-1n);
            }
            const lite_afterUnderscore = liteFn$frontend$skipTrivia(lite_source, lite$addInt(lite_armCursor, 1n, 133076), lite_prefix);
            void lite_afterUnderscore;
            const lite_isFallback = ((((liteFn$lib$core$text$wordAt(lite_source, lite_armCursor, "_")) && (((lite_afterUnderscore) < (lite_size))))) && (((liteFn$lib$core$text$at(lite_source, lite_afterUnderscore)) === ("{"))));
            void lite_isFallback;
            const lite_armOpen = (Boolean(lite_isFallback) ? lite_afterUnderscore : liteFn$frontend$scanConditionOpen(lite_source, lite_armCursor, lite_prefix));
            void lite_armOpen;
            if (((((lite_armOpen) < (0n))) || (((((!(lite_isFallback))) && (((lite_armOpen) === (lite_armCursor)))))))) {
                return (-1n);
            }
            const lite_armEnd = liteFn$frontend$scanBraceEnd(lite_source, lite_armOpen, lite_prefix);
            void lite_armEnd;
            if (((lite_armEnd) < (0n))) {
                return (-1n);
            }
            const lite_afterArm = liteFn$frontend$skipItemSeparators(lite_source, lite_armEnd, lite_prefix);
            void lite_afterArm;
            if (lite_isFallback) {
                if (((((lite_afterArm) < (lite_size))) && (((liteFn$lib$core$text$at(lite_source, lite_afterArm)) === ("}"))))) {
                    return lite$addInt(lite_afterArm, 1n, 133728);
                }
                return (-1n);
            }
            lite_armCursor = lite_afterArm;
        }
        return (-1n);
    }
    void liteFn$frontend$scanRawMatchEnd;
    function liteFn$frontend$scanValueMatchEnd(lite_source: string, lite_position: bigint, lite_prefix: string, lite_requireValueBranches: boolean): bigint {
        void lite_source;
        void lite_position;
        void lite_prefix;
        void lite_requireValueBranches;
        const lite_size = liteFn$lib$core$text$length(lite_source);
        void lite_size;
        let lite_cursor = liteFn$frontend$skipOptionalScanTag(lite_source, lite_position, lite_prefix, "match");
        void lite_cursor;
        if (((((lite_cursor) < (0n))) || ((!(liteFn$lib$core$text$wordAt(lite_source, lite_cursor, "match")))))) {
            return (-1n);
        }
        const lite_openMatch = liteFn$frontend$skipTrivia(lite_source, lite$addInt(lite_cursor, 5n, 134281), lite_prefix);
        void lite_openMatch;
        if (((((lite_openMatch) >= (lite_size))) || (((liteFn$lib$core$text$at(lite_source, lite_openMatch)) !== ("{"))))) {
            return (-1n);
        }
        let lite_allArmsValue = true;
        void lite_allArmsValue;
        let lite_armCursor = liteFn$frontend$skipItemSeparators(lite_source, lite$addInt(lite_openMatch, 1n, 134464), lite_prefix);
        void lite_armCursor;
        while (((lite_armCursor) < (lite_size))) {
            if (((liteFn$lib$core$text$at(lite_source, lite_armCursor)) === ("}"))) {
                return (-1n);
            }
            const lite_afterUnderscore = liteFn$frontend$skipTrivia(lite_source, lite$addInt(lite_armCursor, 1n, 134625), lite_prefix);
            void lite_afterUnderscore;
            const lite_isFallback = ((((liteFn$lib$core$text$wordAt(lite_source, lite_armCursor, "_")) && (((lite_afterUnderscore) < (lite_size))))) && (((liteFn$lib$core$text$at(lite_source, lite_afterUnderscore)) === ("{"))));
            void lite_isFallback;
            const lite_armOpen = (Boolean(lite_isFallback) ? lite_afterUnderscore : liteFn$frontend$scanConditionOpen(lite_source, lite_armCursor, lite_prefix));
            void lite_armOpen;
            if (((((lite_armOpen) < (0n))) || (((((!(lite_isFallback))) && (((lite_armOpen) === (lite_armCursor)))))))) {
                return (-1n);
            }
            const lite_armEnd = liteFn$frontend$scanBraceEnd(lite_source, lite_armOpen, lite_prefix);
            void lite_armEnd;
            if (((lite_armEnd) < (0n))) {
                return (-1n);
            }
            if (((lite_requireValueBranches) && ((!(liteFn$frontend$valueIfBranchAt(lite_source, lite_armOpen, lite$subtractInt(lite_armEnd, 1n, 135164), lite_prefix)))))) {
                lite_allArmsValue = false;
            }
            const lite_afterArm = liteFn$frontend$skipItemSeparators(lite_source, lite_armEnd, lite_prefix);
            void lite_afterArm;
            if (lite_isFallback) {
                if (((((lite_afterArm) < (lite_size))) && (((liteFn$lib$core$text$at(lite_source, lite_afterArm)) === ("}"))))) {
                    const lite_thenEnd = liteFn$frontend$scanTrailingThenEnd(lite_source, lite$addInt(lite_afterArm, 1n, 135428), lite_prefix, lite_requireValueBranches);
                    void lite_thenEnd;
                    if (((lite_thenEnd) === ((-1n)))) {
                        return (-1n);
                    }
                    const lite_baseEnd = (Boolean(((lite_thenEnd) === ((-2n)))) ? (Boolean(((lite_requireValueBranches) && ((!(lite_allArmsValue))))) ? (-1n) : lite$addInt(lite_afterArm, 1n, 135646)) : lite_thenEnd);
                    void lite_baseEnd;
                    if (((lite_baseEnd) < (0n))) {
                        return (-1n);
                    }
                    return liteFn$frontend$scanTrailingFinallyEnd(lite_source, lite_baseEnd, lite_prefix);
                }
                return (-1n);
            }
            lite_armCursor = lite_afterArm;
        }
        return (-1n);
    }
    void liteFn$frontend$scanValueMatchEnd;
    function liteFn$frontend$findLeadingDotLoopIdx(lite_ctxs: { id: bigint; tag: string; kind: string; phase: string; iifeDepth: bigint; valKind: string; valVar: string; label: string; iterLabel: string; countVar: string; itemVar: string; itemKind: string; indexVar: string; hasIndex: boolean }[]): bigint {
        void lite_ctxs;
        let lite_index = lite$subtractInt(liteFn$frontend$ctxCount([...(lite_ctxs)]), 1n, 136191);
        void lite_index;
        while (((lite_index) >= (0n))) {
            const lite_kind = (lite$listAt((lite_ctxs), lite_index, 136239)).kind;
            void lite_kind;
            if (((lite_kind) === ("loop"))) {
                return lite_index;
            }
            if (((((lite_kind) === ("if"))) || (((lite_kind) === ("match"))))) {
                return (-2n);
            }
            if (((lite_kind) === ("finally"))) {
                return (-3n);
            }
            if (((lite_kind) === ("fn"))) {
                return (-1n);
            }
            lite_index = lite$subtractInt(lite_index, 1n, 136459);
        }
        return (-1n);
    }
    void liteFn$frontend$findLeadingDotLoopIdx;
    function liteFn$frontend$findActiveLoopCtxIndex(lite_ctxs: { id: bigint; tag: string; kind: string; phase: string; iifeDepth: bigint; valKind: string; valVar: string; label: string; iterLabel: string; countVar: string; itemVar: string; itemKind: string; indexVar: string; hasIndex: boolean }[]): bigint {
        void lite_ctxs;
        let lite_index = lite$subtractInt(liteFn$frontend$ctxCount([...(lite_ctxs)]), 1n, 136720);
        void lite_index;
        while (((lite_index) >= (0n))) {
            const lite_entry = lite$listAt((lite_ctxs), lite_index, 136769);
            void lite_entry;
            if ((((lite_entry).kind) === ("fn"))) {
                return (-1n);
            }
            if ((((((((lite_entry).kind) === ("loop"))) && ((((lite_entry).phase) !== ("then"))))) && ((((lite_entry).phase) !== ("finally"))))) {
                return lite_index;
            }
            lite_index = lite$subtractInt(lite_index, 1n, 136951);
        }
        return (-1n);
    }
    void liteFn$frontend$findActiveLoopCtxIndex;
    function liteFn$frontend$hasFinallyAbove(lite_ctxs: { id: bigint; tag: string; kind: string; phase: string; iifeDepth: bigint; valKind: string; valVar: string; label: string; iterLabel: string; countVar: string; itemVar: string; itemKind: string; indexVar: string; hasIndex: boolean }[], lite_targetIdx: bigint): boolean {
        void lite_ctxs;
        void lite_targetIdx;
        let lite_index = lite$subtractInt(liteFn$frontend$ctxCount([...(lite_ctxs)]), 1n, 137164);
        void lite_index;
        while (((lite_index) > (lite_targetIdx))) {
            if ((((lite$listAt((lite_ctxs), lite_index, 137214)).kind) === ("finally"))) {
                return true;
            }
            lite_index = lite$subtractInt(lite_index, 1n, 137278);
        }
        return false;
    }
    void liteFn$frontend$hasFinallyAbove;
    function liteFn$frontend$scanRawLoopEnd(lite_source: string, lite_position: bigint, lite_prefix: string): bigint {
        void lite_source;
        void lite_position;
        void lite_prefix;
        const lite_size = liteFn$lib$core$text$length(lite_source);
        void lite_size;
        const lite_cursor = liteFn$frontend$skipOptionalScanTag(lite_source, lite_position, lite_prefix, "loop");
        void lite_cursor;
        if (((((lite_cursor) < (0n))) || ((!(liteFn$lib$core$text$wordAt(lite_source, lite_cursor, "loop")))))) {
            return (-1n);
        }
        const lite_afterLoop = liteFn$frontend$skipTrivia(lite_source, lite$addInt(lite_cursor, 4n, 137742), lite_prefix);
        void lite_afterLoop;
        if (((lite_afterLoop) >= (lite_size))) {
            return (-1n);
        }
        const lite_open = (Boolean(((liteFn$lib$core$text$at(lite_source, lite_afterLoop)) === ("{"))) ? lite_afterLoop : liteFn$frontend$scanConditionOpen(lite_source, lite_afterLoop, lite_prefix));
        void lite_open;
        if (((((((lite_open) < (0n))) || (((lite_open) >= (lite_size))))) || (((liteFn$lib$core$text$at(lite_source, lite_open)) !== ("{"))))) {
            return (-1n);
        }
        return liteFn$frontend$scanBraceEnd(lite_source, lite_open, lite_prefix);
    }
    void liteFn$frontend$scanRawLoopEnd;
    function liteFn$frontend$loopNeedsExprLowering(lite_source: string, lite_position: bigint, lite_prefix: string): boolean {
        void lite_source;
        void lite_position;
        void lite_prefix;
        const lite_size = liteFn$lib$core$text$length(lite_source);
        void lite_size;
        const lite_trimmed = liteFn$frontend$skipTrivia(lite_source, lite_position, lite_prefix);
        void lite_trimmed;
        if (((lite_trimmed) >= (lite_size))) {
            return false;
        }
        if (((liteFn$lib$core$text$at(lite_source, lite_trimmed)) === ("@"))) {
            return true;
        }
        const lite_rawEnd = liteFn$frontend$scanRawLoopEnd(lite_source, lite_trimmed, lite_prefix);
        void lite_rawEnd;
        if (((lite_rawEnd) < (0n))) {
            return false;
        }
        const lite_afterRaw = liteFn$frontend$skipTrivia(lite_source, lite_rawEnd, lite_prefix);
        void lite_afterRaw;
        if (((((lite_afterRaw) < (lite_size))) && ((((liteFn$lib$core$text$wordAt(lite_source, lite_afterRaw, "then")) || (liteFn$lib$core$text$wordAt(lite_source, lite_afterRaw, "finally"))))))) {
            return true;
        }
        let lite_cursor = lite_trimmed;
        void lite_cursor;
        let lite_prevExpr = false;
        void lite_prevExpr;
        while (((lite_cursor) < (lite_rawEnd))) {
            const lite_ch = liteFn$lib$core$text$at(lite_source, lite_cursor);
            void lite_ch;
            if (((lite_ch) === ("\""))) {
                lite_cursor = liteFn$frontend$skipAliasString(lite_source, lite_cursor);
                lite_prevExpr = true;
            } else if (liteFn$lib$core$text$startsWithAt(lite_source, lite_cursor, "/*")) {
                lite_cursor = liteFn$frontend$skipComment(lite_source, lite_cursor, lite_prefix);
            } else if (((((((((lite_ch) === (" "))) || (((lite_ch) === ("\t"))))) || (((lite_ch) === ("\r"))))) || (((lite_ch) === ("\n"))))) {
                lite_cursor = lite$addInt(lite_cursor, 1n, 139225);
            } else if (((lite_ch) === ("@"))) {
                return true;
            } else if (((((((lite_ch) === (")"))) || (((lite_ch) === ("]"))))) || (((lite_ch) === ("}"))))) {
                lite_cursor = lite$addInt(lite_cursor, 1n, 139369);
                lite_prevExpr = true;
            } else if (((lite_ch) === ("."))) {
                if ((!(lite_prevExpr))) {
                    return true;
                }
                lite_cursor = lite$addInt(lite_cursor, 1n, 139506);
                lite_prevExpr = false;
            } else if (liteFn$lib$core$text$isDigit(lite_ch)) {
                lite_cursor = liteFn$lib$core$text$skipName(lite_source, lite_cursor);
                lite_prevExpr = true;
            } else if (liteFn$lib$core$text$isNameStart(lite_ch)) {
                const lite_end = liteFn$lib$core$text$skipName(lite_source, lite_cursor);
                void lite_end;
                const lite_word = liteFn$lib$core$text$slice(lite_source, lite_cursor, lite_end);
                void lite_word;
                if (((((lite_word) === ("break"))) || (((lite_word) === ("continue"))))) {
                    const lite_afterWord = liteFn$frontend$skipTrivia(lite_source, lite_end, lite_prefix);
                    void lite_afterWord;
                    if (((((((lite_afterWord) < (lite_rawEnd))) && (((liteFn$lib$core$text$at(lite_source, lite_afterWord)) !== (";"))))) && (((liteFn$lib$core$text$at(lite_source, lite_afterWord)) !== ("}"))))) {
                        return true;
                    }
                }
                lite_prevExpr = ((((((((((((((((((((((((((((((lite_word) !== ("and"))) && (((lite_word) !== ("or"))))) && (((lite_word) !== ("not"))))) && (((lite_word) !== ("if"))))) && (((lite_word) !== ("else"))))) && (((lite_word) !== ("match"))))) && (((lite_word) !== ("loop"))))) && (((lite_word) !== ("then"))))) && (((lite_word) !== ("finally"))))) && (((lite_word) !== ("return"))))) && (((lite_word) !== ("break"))))) && (((lite_word) !== ("continue"))))) && (((lite_word) !== ("as"))))) && (((lite_word) !== ("var"))))) && (((lite_word) !== ("mut"))));
                lite_cursor = lite_end;
            } else {
                lite_cursor = lite$addInt(lite_cursor, 1n, 140564);
                lite_prevExpr = false;
            }
        }
        return false;
    }
    void liteFn$frontend$loopNeedsExprLowering;
    function liteFn$frontend$resolveLoopField(lite_target: string, lite_ctx: { id: bigint; tag: string; kind: string; phase: string; iifeDepth: bigint; valKind: string; valVar: string; label: string; iterLabel: string; countVar: string; itemVar: string; itemKind: string; indexVar: string; hasIndex: boolean }, lite_fieldName: string, lite_expected: string, lite_source: string, lite_fieldStart: bigint, lite_fieldEnd: bigint, lite_prefix: string): { kind: string; code: string; intValue: bigint; textValue: string; constant: boolean; next: bigint } {
        void lite_target;
        void lite_ctx;
        void lite_fieldName;
        void lite_expected;
        void lite_source;
        void lite_fieldStart;
        void lite_fieldEnd;
        void lite_prefix;
        if (((lite_fieldName) === ("count"))) {
            return liteFn$frontend$intParsed((lite_ctx).countVar, 0n, false, lite_fieldEnd);
        }
        if (((lite_fieldName) === ("value"))) {
            if ((((lite_ctx).valKind) === ("__infer__"))) {
                if (((((((((((lite_expected) !== (""))) && (((lite_expected) !== ("Unit"))))) && (((lite_expected) !== ("Never"))))) && ((!(liteFn$lib$core$text$startsWithAt(lite_expected, 0n, "TailList<")))))) && ((!(liteFn$lib$core$text$startsWithAt(lite_expected, 0n, "__loopVal:")))))) {
                    return liteFn$frontend$withMarkers({ kind: lite_expected, code: (lite_ctx).valVar, intValue: 0n, textValue: "", constant: false, next: lite_fieldEnd }, ((((((liteFn$lib$core$int$intText((lite_ctx).id)) + ("="))) + (lite_expected))) + ("\n")));
                }
                return liteFn$frontend$withMarkers({ kind: (("__loopVal:") + (liteFn$lib$core$int$intText((lite_ctx).id))), code: (lite_ctx).valVar, intValue: 0n, textValue: "", constant: false, next: lite_fieldEnd }, (Boolean((((lite_ctx).phase) !== ("then"))) ? ((liteFn$lib$core$int$intText((lite_ctx).id)) + ("=@read\n")) : ""));
            }
            if (liteFn$lib$core$text$startsWithAt((lite_ctx).valKind, 0n, "__infer__:")) {
                const lite_hint = liteFn$lib$core$text$slice((lite_ctx).valKind, 10n, liteFn$lib$core$text$length((lite_ctx).valKind));
                void lite_hint;
                return liteFn$frontend$withMarkers({ kind: lite_hint, code: (lite_ctx).valVar, intValue: 0n, textValue: "", constant: false, next: lite_fieldEnd }, ((((((liteFn$lib$core$int$intText((lite_ctx).id)) + ("="))) + (lite_hint))) + ("\n")));
            }
            if ((((lite_ctx).valKind) === ("Unit"))) {
                return { kind: "Unit", code: liteFn$frontend$targetUnitLiteralCode(lite_target), intValue: 0n, textValue: "", constant: true, next: lite_fieldEnd };
            }
            return { kind: (lite_ctx).valKind, code: (lite_ctx).valVar, intValue: 0n, textValue: "", constant: false, next: lite_fieldEnd };
        }
        if (((lite_fieldName) === ("item"))) {
            if ((((lite_ctx).phase) === ("header"))) {
                liteFn$frontend$failAt(lite_source, lite_fieldStart, lite_prefix, ".item is not available in loop header");
            }
            if ((((((lite_ctx).itemKind) === (""))) || ((((lite_ctx).itemKind) === ("Unit"))))) {
                return { kind: "Unit", code: liteFn$frontend$targetUnitLiteralCode(lite_target), intValue: 0n, textValue: "", constant: true, next: lite_fieldEnd };
            }
            return { kind: (lite_ctx).itemKind, code: (lite_ctx).itemVar, intValue: 0n, textValue: "", constant: false, next: lite_fieldEnd };
        }
        if (((lite_fieldName) === ("index"))) {
            if ((((lite_ctx).phase) === ("header"))) {
                liteFn$frontend$failAt(lite_source, lite_fieldStart, lite_prefix, ".index is not available in loop header");
            }
            if ((!((lite_ctx).hasIndex))) {
                liteFn$frontend$failAt(lite_source, lite_fieldStart, lite_prefix, "loop does not expose .index without a sequence source");
            }
            return liteFn$frontend$intParsed((lite_ctx).indexVar, 0n, false, lite_fieldEnd);
        }
        liteFn$frontend$failAt(lite_source, lite_fieldStart, lite_prefix, (("unknown loop metadata field .") + (lite_fieldName)));
        return liteFn$frontend$intParsed("", 0n, false, lite_fieldEnd);
    }
    void liteFn$frontend$resolveLoopField;
    function liteFn$frontend$scanLoopMarkers(lite_raw: string, lite_loopId: bigint): { hasAny: boolean; hasConcrete: boolean } {
        void lite_raw;
        void lite_loopId;
        const lite_idKey = liteFn$lib$core$int$intText(lite_loopId);
        void lite_idKey;
        const lite_size = liteFn$lib$core$text$length(lite_raw);
        void lite_size;
        let lite_cursor = 0n;
        void lite_cursor;
        let lite_hasAny = false;
        void lite_hasAny;
        let lite_hasConcrete = false;
        void lite_hasConcrete;
        while (((lite_cursor) < (lite_size))) {
            const lite_eqPos = liteFn$lib$core$text$indexOfText(lite_raw, "=", lite_cursor);
            void lite_eqPos;
            if (((lite_eqPos) < (0n))) {
                break;
            }
            const lite_nlPos = liteFn$lib$core$text$indexOfText(lite_raw, "\n", lite$addInt(lite_eqPos, 1n, 143960));
            void lite_nlPos;
            const lite_endPos = (Boolean(((lite_nlPos) < (0n))) ? lite_size : lite_nlPos);
            void lite_endPos;
            const lite_entryId = liteFn$lib$core$text$slice(lite_raw, lite_cursor, lite_eqPos);
            void lite_entryId;
            const lite_entryKind = liteFn$lib$core$text$slice(lite_raw, lite$addInt(lite_eqPos, 1n, 144122), lite_endPos);
            void lite_entryKind;
            if (((lite_entryId) === (lite_idKey))) {
                lite_hasAny = true;
                if (((((((lite_entryKind) !== ("@read"))) && (((lite_entryKind) !== ("@break"))))) && (((liteFn$frontend$loopValMarkerId(lite_entryKind)) < (0n))))) {
                    lite_hasConcrete = true;
                }
            }
            lite_cursor = lite$addInt(lite_endPos, 1n, 144378);
        }
        return { hasAny: lite_hasAny, hasConcrete: lite_hasConcrete };
    }
    void liteFn$frontend$scanLoopMarkers;
    function liteFn$frontend$inferLoopValueKind(lite_raw: string, lite_loopId: bigint, lite_tagDisplay: string, lite_source: string, lite_at: bigint, lite_prefix: string, lite_expectedHint: string): string {
        void lite_raw;
        void lite_loopId;
        void lite_tagDisplay;
        void lite_source;
        void lite_at;
        void lite_prefix;
        void lite_expectedHint;
        const lite_idKey = liteFn$lib$core$int$intText(lite_loopId);
        void lite_idKey;
        const lite_size = liteFn$lib$core$text$length(lite_raw);
        void lite_size;
        let lite_cursor = 0n;
        void lite_cursor;
        let lite_result = "";
        void lite_result;
        let lite_sawRead = false;
        void lite_sawRead;
        while (((lite_cursor) < (lite_size))) {
            const lite_eqPos = liteFn$lib$core$text$indexOfText(lite_raw, "=", lite_cursor);
            void lite_eqPos;
            if (((lite_eqPos) < (0n))) {
                break;
            }
            const lite_nlPos = liteFn$lib$core$text$indexOfText(lite_raw, "\n", lite$addInt(lite_eqPos, 1n, 145028));
            void lite_nlPos;
            const lite_endPos = (Boolean(((lite_nlPos) < (0n))) ? lite_size : lite_nlPos);
            void lite_endPos;
            const lite_entryId = liteFn$lib$core$text$slice(lite_raw, lite_cursor, lite_eqPos);
            void lite_entryId;
            const lite_entryKind = liteFn$lib$core$text$slice(lite_raw, lite$addInt(lite_eqPos, 1n, 145190), lite_endPos);
            void lite_entryKind;
            if (((lite_entryId) === (lite_idKey))) {
                if (((lite_entryKind) === ("@read"))) {
                    lite_sawRead = true;
                } else if (((((lite_entryKind) !== ("@break"))) && (((liteFn$frontend$loopValMarkerId(lite_entryKind)) < (0n))))) {
                    if (((lite_result) === (""))) {
                        lite_result = lite_entryKind;
                    } else {
                        const lite_joined = liteFn$frontend$joinBranchKind(lite_result, lite_entryKind);
                        void lite_joined;
                        if (((lite_joined) === (""))) {
                            const lite_labelPrefix = (Boolean(((lite_tagDisplay) !== ("loop"))) ? (("loop @") + (lite_tagDisplay)) : "loop");
                            void lite_labelPrefix;
                            liteFn$frontend$failAt(lite_source, lite_at, lite_prefix, ((((((((lite_labelPrefix) + (" cannot produce both "))) + (liteFn$frontend$displayKind(lite_result)))) + (" and "))) + (liteFn$frontend$displayKind(lite_entryKind))));
                        }
                        lite_result = lite_joined;
                    }
                }
            }
            lite_cursor = lite$addInt(lite_endPos, 1n, 145996);
        }
        if (((lite_result) !== (""))) {
            return lite_result;
        }
        if (((lite_expectedHint) !== (""))) {
            return lite_expectedHint;
        }
        if (lite_sawRead) {
            liteFn$frontend$failAt(lite_source, lite_at, lite_prefix, "cannot infer loop .value type; add a type annotation");
        }
        return "Unit";
    }
    void liteFn$frontend$inferLoopValueKind;
    function liteFn$frontend$parseBinaryCtx(lite_target: string, lite_source: string, lite_position: bigint, lite_prefix: string, lite_locals: { name: string; runtime: string; kind: string; mutable: boolean; writable: boolean; depth: bigint; constant: boolean; code: string; intValue: bigint; textValue: string; initState: string }[], lite_functions: { name: string; runtime: string; result: string; first: bigint; count: bigint }[], lite_params: string[], lite_currentName: string, lite_expected: string, lite_minimum: bigint, lite_ctxs: { id: bigint; tag: string; kind: string; phase: string; iifeDepth: bigint; valKind: string; valVar: string; label: string; iterLabel: string; countVar: string; itemVar: string; itemKind: string; indexVar: string; hasIndex: boolean }[], lite_iifeDepth: bigint, lite_inferMode: boolean, lite_bodySink: string): { kind: string; code: string; intValue: bigint; textValue: string; constant: boolean; next: bigint } {
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
        void lite_ctxs;
        void lite_iifeDepth;
        void lite_inferMode;
        void lite_bodySink;
        let lite_start = liteFn$frontend$skipTrivia(lite_source, lite_position, lite_prefix);
        void lite_start;
        if (((lite_start) >= (liteFn$lib$core$text$length(lite_source)))) {
            liteFn$frontend$failAt(lite_source, lite_start, lite_prefix, "expected an Int, Float, String or Bool expression");
        }
        const lite_effectiveMinimum = (Boolean(((lite_minimum) < (0n))) ? 0n : lite_minimum);
        void lite_effectiveMinimum;
        let lite_leaderStart = (-1n);
        void lite_leaderStart;
        let lite_leaderText = "";
        void lite_leaderText;
        if (((((lite_effectiveMinimum) === (0n))) && ((((liteFn$lib$core$text$wordAt(lite_source, lite_start, "and")) || (liteFn$lib$core$text$wordAt(lite_source, lite_start, "or"))))))) {
            lite_leaderStart = lite_start;
            const lite_leaderEnd = liteFn$lib$core$text$skipName(lite_source, lite_start);
            void lite_leaderEnd;
            lite_leaderText = liteFn$lib$core$text$slice(lite_source, lite_start, lite_leaderEnd);
            lite_start = liteFn$frontend$skipTrivia(lite_source, lite_leaderEnd, lite_prefix);
            if (((liteFn$lib$core$text$wordAt(lite_source, lite_start, "and")) || (liteFn$lib$core$text$wordAt(lite_source, lite_start, "or")))) {
                liteFn$frontend$failAt(lite_source, lite_start, lite_prefix, (((("leading ") + (lite_leaderText))) + (" may appear only once")));
            }
        }
        let lite_left = liteFn$frontend$intParsed("", 0n, true, lite_start);
        void lite_left;
        let lite_condParseKind = "";
        void lite_condParseKind;
        let lite_condParseStart = (-1n);
        void lite_condParseStart;
        let lite_condParseTag = "";
        void lite_condParseTag;
        let lite_condParseTagAt = (-1n);
        void lite_condParseTagAt;
        const lite_ch = liteFn$lib$core$text$at(lite_source, lite_start);
        void lite_ch;
        if (((lite_ch) === ("("))) {
            if (((liteFn$lib$core$text$at(lite_source, liteFn$frontend$skipTrivia(lite_source, lite$addInt(lite_start, 1n, 147827), lite_prefix))) === (")"))) {
                lite_left = { kind: "Unit", code: liteFn$frontend$targetUnitLiteralCode(lite_target), intValue: 0n, textValue: "", constant: true, next: lite$addInt(liteFn$frontend$skipTrivia(lite_source, lite$addInt(lite_start, 1n, 148002), lite_prefix), 1n, 148015) };
            } else if (liteFn$frontend$looksLikeTupleEntry(lite_source, lite$addInt(lite_start, 1n, 148073), lite_prefix)) {
                let lite_cursor = liteFn$frontend$skipTrivia(lite_source, lite$addInt(lite_start, 1n, 148139), lite_prefix);
                void lite_cursor;
                const lite_labels: string[] = [...([])];
                void lite_labels;
                const lite_codes: string[] = [...([])];
                void lite_codes;
                const lite_kinds: string[] = [...([])];
                void lite_kinds;
                let lite_tupleMarkers = "";
                void lite_tupleMarkers;
                let lite_count = 0n;
                void lite_count;
                while (((((lite_cursor) < (liteFn$lib$core$text$length(lite_source)))) && (((liteFn$lib$core$text$at(lite_source, lite_cursor)) !== (")"))))) {
                    let lite_label = "";
                    void lite_label;
                    let lite_valueStart = lite_cursor;
                    void lite_valueStart;
                    let lite_value = liteFn$frontend$intParsed("", 0n, true, lite_cursor);
                    void lite_value;
                    if (liteFn$frontend$isSingleEquals(lite_source, lite_cursor)) {
                        const lite_nameStart = liteFn$frontend$skipTrivia(lite_source, lite$addInt(lite_cursor, 1n, 148681), lite_prefix);
                        void lite_nameStart;
                        if (((((lite_nameStart) >= (liteFn$lib$core$text$length(lite_source)))) || ((!(liteFn$lib$core$text$isNameStart(liteFn$lib$core$text$at(lite_source, lite_nameStart))))))) {
                            liteFn$frontend$failAt(lite_source, lite_nameStart, lite_prefix, "expected a tuple field name after =");
                        }
                        const lite_nameEnd = liteFn$lib$core$text$skipName(lite_source, lite_nameStart);
                        void lite_nameEnd;
                        lite_label = liteFn$lib$core$text$slice(lite_source, lite_nameStart, lite_nameEnd);
                        if (liteFn$frontend$isReservedWord(lite_label)) {
                            liteFn$frontend$unsupportedFeature(lite_source, lite_nameStart, lite_label, lite_prefix);
                        }
                        if (liteFn$lib$core$list$listContainsText([...(lite_labels)], lite_label)) {
                            liteFn$frontend$failAt(lite_source, lite_nameStart, lite_prefix, (("duplicate tuple field ") + (lite_label)));
                        }
                        lite_valueStart = lite_nameStart;
                        const lite_fieldExpected = (Boolean(liteFn$frontend$isTupleKind(lite_expected)) ? liteFn$frontend$tupleFieldKind(lite_expected, lite_label) : "");
                        void lite_fieldExpected;
                        lite_value = liteFn$frontend$parseBinaryCtx(lite_target, lite_source, lite_nameStart, lite_prefix, [...(lite_locals)], [...(lite_functions)], [...(lite_params)], lite_currentName, lite_fieldExpected, 30n, [...(lite_ctxs)], lite_iifeDepth, lite_inferMode, "");
                    } else if (((((lite_cursor) < (liteFn$lib$core$text$length(lite_source)))) && (liteFn$lib$core$text$isNameStart(liteFn$lib$core$text$at(lite_source, lite_cursor))))) {
                        const lite_nameEnd = liteFn$lib$core$text$skipName(lite_source, lite_cursor);
                        void lite_nameEnd;
                        const lite_afterName = liteFn$frontend$skipTrivia(lite_source, lite_nameEnd, lite_prefix);
                        void lite_afterName;
                        if (liteFn$frontend$isSingleEquals(lite_source, lite_afterName)) {
                            lite_label = liteFn$lib$core$text$slice(lite_source, lite_cursor, lite_nameEnd);
                            if (liteFn$frontend$isReservedWord(lite_label)) {
                                liteFn$frontend$unsupportedFeature(lite_source, lite_cursor, lite_label, lite_prefix);
                            }
                            if (liteFn$lib$core$list$listContainsText([...(lite_labels)], lite_label)) {
                                liteFn$frontend$failAt(lite_source, lite_cursor, lite_prefix, (("duplicate tuple field ") + (lite_label)));
                            }
                            lite_valueStart = liteFn$frontend$skipTrivia(lite_source, lite$addInt(lite_afterName, 1n, 150408), lite_prefix);
                            const lite_fieldExpected = (Boolean(liteFn$frontend$isTupleKind(lite_expected)) ? liteFn$frontend$tupleFieldKind(lite_expected, lite_label) : "");
                            void lite_fieldExpected;
                            lite_value = liteFn$frontend$parseBinaryCtx(lite_target, lite_source, lite_valueStart, lite_prefix, [...(lite_locals)], [...(lite_functions)], [...(lite_params)], lite_currentName, lite_fieldExpected, 0n, [...(lite_ctxs)], lite_iifeDepth, lite_inferMode, "");
                        } else {
                            const lite_fieldExpected = (Boolean(((liteFn$frontend$isTupleKind(lite_expected)) && (((lite_count) < (liteFn$frontend$tupleComponentCount(lite_expected)))))) ? (liteFn$frontend$tupleComponent(lite_expected, lite_count)).kind : "");
                            void lite_fieldExpected;
                            lite_value = liteFn$frontend$parseBinaryCtx(lite_target, lite_source, lite_cursor, lite_prefix, [...(lite_locals)], [...(lite_functions)], [...(lite_params)], lite_currentName, lite_fieldExpected, 0n, [...(lite_ctxs)], lite_iifeDepth, lite_inferMode, "");
                        }
                    } else {
                        const lite_fieldExpected = (Boolean(((liteFn$frontend$isTupleKind(lite_expected)) && (((lite_count) < (liteFn$frontend$tupleComponentCount(lite_expected)))))) ? (liteFn$frontend$tupleComponent(lite_expected, lite_count)).kind : "");
                        void lite_fieldExpected;
                        lite_value = liteFn$frontend$parseBinaryCtx(lite_target, lite_source, lite_cursor, lite_prefix, [...(lite_locals)], [...(lite_functions)], [...(lite_params)], lite_currentName, lite_fieldExpected, 0n, [...(lite_ctxs)], lite_iifeDepth, lite_inferMode, "");
                    }
                    if (lite_inferMode) {
                        lite_tupleMarkers = liteFn$frontend$collectParsedMarkers(lite_tupleMarkers, lite_value);
                    }
                    if (liteFn$frontend$isTupleKind((lite_value).kind)) {
                        liteFn$frontend$failAt(lite_source, lite_valueStart, lite_prefix, "nested tuple values are not supported");
                    }
                    if (liteFn$frontend$isListKind((lite_value).kind)) {
                        liteFn$frontend$failAt(lite_source, lite_valueStart, lite_prefix, "list values inside tuples are not supported");
                    }
                    if ((((((lite_value).kind) === ("Unit"))) || ((((lite_value).kind) === ("Never"))))) {
                        const lite_failName = (Boolean(((lite_label) !== (""))) ? lite_label : liteFn$lib$core$int$intText(lite_count));
                        void lite_failName;
                        liteFn$frontend$failAt(lite_source, lite_valueStart, lite_prefix, (((((("tuple field ") + (lite_failName))) + (" cannot be "))) + (liteFn$frontend$displayKind((lite_value).kind))));
                    }
                    lite_labels.push(lite_label);
                    lite_codes.push((lite_value).code);
                    lite_kinds.push((lite_value).kind);
                    lite_count = lite$addInt(lite_count, 1n, 152345);
                    lite_cursor = liteFn$frontend$skipTrivia(lite_source, (lite_value).next, lite_prefix);
                    if (((((lite_cursor) < (liteFn$lib$core$text$length(lite_source)))) && (((liteFn$lib$core$text$at(lite_source, lite_cursor)) === (","))))) {
                        lite_cursor = liteFn$frontend$skipTrivia(lite_source, lite$addInt(lite_cursor, 1n, 152561), lite_prefix);
                    } else {
                        break;
                    }
                }
                lite_cursor = liteFn$frontend$expectSymbol(lite_source, lite_cursor, ")", lite_prefix);
                let lite_kindText = "(";
                void lite_kindText;
                let lite_codeText = "{ ";
                void lite_codeText;
                let lite_index = 0n;
                void lite_index;
                while (((lite_index) < (lite_count))) {
                    if (((lite_index) > (0n))) {
                        lite_kindText = ((lite_kindText) + (","));
                        lite_codeText = ((lite_codeText) + (", "));
                    }
                    lite_kindText = ((((((lite_kindText) + (lite$listAt((lite_labels), lite_index, 153040)))) + (":"))) + (lite$listAt((lite_kinds), lite_index, 153061)));
                    lite_codeText = ((((((lite_codeText) + (liteFn$frontend$tupleObjectKey(lite$listAt((lite_labels), lite_index, 153129), lite_index)))) + (": "))) + (lite$listAt((lite_codes), lite_index, 153159)));
                    lite_index = lite$addInt(lite_index, 1n, 153197);
                }
                lite_left = liteFn$frontend$withMarkers({ kind: ((lite_kindText) + (")")), code: ((lite_codeText) + (" }")), intValue: 0n, textValue: "", constant: false, next: lite_cursor }, lite_tupleMarkers);
            } else {
                let lite_groupedExpected = lite_expected;
                void lite_groupedExpected;
                if (liteFn$numeric__literals$isNumericKind(lite_expected)) {
                    const lite_groupEnd = liteFn$frontend$scanParenEnd(lite_source, lite_start, lite_prefix);
                    void lite_groupEnd;
                    if (((((lite_groupEnd) >= (0n))) && (liteFn$frontend$binaryFollows(lite_source, lite_groupEnd, lite_prefix, lite_minimum)))) {
                        lite_groupedExpected = "";
                    }
                }
                const lite_inner = liteFn$frontend$parseBinaryCtx(lite_target, lite_source, lite$addInt(lite_start, 1n, 153724), lite_prefix, [...(lite_locals)], [...(lite_functions)], [...(lite_params)], lite_currentName, lite_groupedExpected, 0n, [...(lite_ctxs)], lite_iifeDepth, lite_inferMode, "");
                void lite_inner;
                const lite_next = liteFn$frontend$expectSymbol(lite_source, liteFn$frontend$skipTrivia(lite_source, (lite_inner).next, lite_prefix), ")", lite_prefix);
                void lite_next;
                lite_left = liteFn$frontend$withMarkers({ kind: (lite_inner).kind, code: (((("(") + ((lite_inner).code))) + (")")), intValue: (lite_inner).intValue, textValue: (lite_inner).textValue, constant: (lite_inner).constant, next: lite_next }, (Boolean(lite_inferMode) ? liteFn$frontend$collectParsedMarkers("", lite_inner) : ""));
            }
        } else if (((((lite_ch) === ("+"))) || (((lite_ch) === ("-"))))) {
            const lite_after = liteFn$frontend$skipTrivia(lite_source, lite$addInt(lite_start, 1n, 154274), lite_prefix);
            void lite_after;
            if (((((lite_after) < (liteFn$lib$core$text$length(lite_source)))) && (liteFn$lib$core$text$isDigit(liteFn$lib$core$text$at(lite_source, lite_after))))) {
                const lite_litExpected = (Boolean(((lite_ch) === ("-"))) ? lite_expected : "");
                void lite_litExpected;
                lite_left = liteFn$frontend$parseNumber(lite_target, lite_source, lite_start, lite_prefix, lite_litExpected, lite_minimum);
            } else {
                const lite_operand = liteFn$frontend$parseBinaryCtx(lite_target, lite_source, lite$addInt(lite_start, 1n, 154597), lite_prefix, [...(lite_locals)], [...(lite_functions)], [...(lite_params)], lite_currentName, "", 30n, [...(lite_ctxs)], lite_iifeDepth, lite_inferMode, "");
                void lite_operand;
                const lite_operandLoopId = liteFn$frontend$loopValMarkerId((lite_operand).kind);
                void lite_operandLoopId;
                if (((lite_inferMode) && (((lite_operandLoopId) >= (0n))))) {
                    if (((((((((lite_expected) !== (""))) && (((lite_expected) !== ("Unit"))))) && (((lite_expected) !== ("Never"))))) && (liteFn$numeric__literals$isNumericKind(lite_expected)))) {
                        lite_left = liteFn$frontend$withMarkers({ kind: lite_expected, code: "", intValue: 0n, textValue: "", constant: false, next: (lite_operand).next }, ((((((((liteFn$frontend$collectParsedMarkers("", lite_operand)) + (liteFn$lib$core$int$intText(lite_operandLoopId)))) + ("="))) + (lite_expected))) + ("\n")));
                    } else {
                        lite_left = liteFn$frontend$withMarkers({ kind: (lite_operand).kind, code: "", intValue: 0n, textValue: "", constant: false, next: (lite_operand).next }, liteFn$frontend$collectParsedMarkers("", lite_operand));
                    }
                } else {
                    if ((!(liteFn$numeric__literals$isNumericKind((lite_operand).kind)))) {
                        liteFn$frontend$failAt(lite_source, lite_start, lite_prefix, (((("unary ") + (lite_ch))) + (" requires an Int or Float operand")));
                    }
                    const lite_code = (Boolean(((lite_ch) === ("-"))) ? (((("(-") + ((lite_operand).code))) + (")")) : (((("(") + ((lite_operand).code))) + (")")));
                    void lite_code;
                    if (liteFn$numeric__literals$isFloatKind((lite_operand).kind)) {
                        lite_left = liteFn$frontend$withMarkers({ kind: (lite_operand).kind, code: lite_code, intValue: 0n, textValue: "", constant: false, next: (lite_operand).next }, (Boolean(lite_inferMode) ? liteFn$frontend$collectParsedMarkers("", lite_operand) : ""));
                    } else if ((lite_operand).constant) {
                        const lite_folded = (Boolean(((lite_ch) === ("-"))) ? liteFn$lib$core$int$intNegate((lite_operand).intValue) : { value: (lite_operand).intValue, ok: true });
                        void lite_folded;
                        if ((((lite_folded).ok) && (liteFn$numeric__literals$intKindFits((lite_operand).kind, (lite_folded).value)))) {
                            lite_left = liteFn$frontend$typedIntParsed((lite_operand).kind, lite_code, (lite_folded).value, true, (lite_operand).next);
                        } else {
                            const lite_rawNeg = liteFn$frontend$targetIntNegateCode(lite_target, (lite_operand).code, lite_start);
                            void lite_rawNeg;
                            const lite_checkedNeg = (Boolean(liteFn$numeric__literals$isNarrowIntKind((lite_operand).kind)) ? liteFn$frontend$targetCheckedNarrowIntCode(lite_target, (lite_operand).kind, lite_rawNeg, lite_start) : lite_rawNeg);
                            void lite_checkedNeg;
                            lite_left = liteFn$frontend$typedIntParsed((lite_operand).kind, lite_checkedNeg, 0n, false, (lite_operand).next);
                        }
                    } else {
                        const lite_runtimeCode = (Boolean(((lite_ch) === ("-"))) ? (() => { const lite_rawNeg = liteFn$frontend$targetIntNegateCode(lite_target, (lite_operand).code, lite_start); void lite_rawNeg; return (Boolean(liteFn$numeric__literals$isNarrowIntKind((lite_operand).kind)) ? liteFn$frontend$targetCheckedNarrowIntCode(lite_target, (lite_operand).kind, lite_rawNeg, lite_start) : lite_rawNeg); })() : lite_code);
                        void lite_runtimeCode;
                        lite_left = liteFn$frontend$withMarkers(liteFn$frontend$typedIntParsed((lite_operand).kind, lite_runtimeCode, 0n, false, (lite_operand).next), (Boolean(lite_inferMode) ? liteFn$frontend$collectParsedMarkers("", lite_operand) : ""));
                    }
                }
            }
        } else if (liteFn$lib$core$text$isDigit(lite_ch)) {
            lite_left = liteFn$frontend$parseNumber(lite_target, lite_source, lite_start, lite_prefix, lite_expected, lite_minimum);
        } else if (((lite_ch) === ("\""))) {
            lite_left = liteFn$frontend$parseText(lite_target, lite_source, lite_start, lite_prefix);
        } else if (((lite_ch) === ("["))) {
            let lite_cursor = liteFn$frontend$skipTrivia(lite_source, lite$addInt(lite_start, 1n, 157734), lite_prefix);
            void lite_cursor;
            const lite_isTailList = liteFn$lib$core$text$startsWithAt(lite_expected, 0n, "TailList<");
            void lite_isTailList;
            const lite_isListTarget = ((liteFn$frontend$isListKind(lite_expected)) || (lite_isTailList));
            void lite_isListTarget;
            let lite_elementKind = "";
            void lite_elementKind;
            if (liteFn$frontend$isListKind(lite_expected)) {
                lite_elementKind = liteFn$frontend$listElementKind(lite_expected);
            } else if (lite_isTailList) {
                lite_elementKind = liteFn$frontend$listElementKind(liteFn$lib$core$text$slice(lite_expected, 4n, liteFn$lib$core$text$length(lite_expected)));
            } else if (liteFn$frontend$isArrayKind(lite_expected)) {
                lite_elementKind = liteFn$frontend$arrayElementKind(lite_expected);
            }
            const lite_elementCodes: string[] = [...([])];
            void lite_elementCodes;
            let lite_listMarkers = "";
            void lite_listMarkers;
            let lite_count = 0n;
            void lite_count;
            while (Boolean(true)) {
                if (((lite_cursor) >= (liteFn$lib$core$text$length(lite_source)))) {
                    liteFn$frontend$failAt(lite_source, lite_cursor, lite_prefix, "expected ] in list literal");
                }
                if (((liteFn$lib$core$text$at(lite_source, lite_cursor)) === ("]"))) {
                    break;
                }
                const lite_elementStart = lite_cursor;
                void lite_elementStart;
                const lite_element = liteFn$frontend$parseBinaryCtx(lite_target, lite_source, lite_cursor, lite_prefix, [...(lite_locals)], [...(lite_functions)], [...(lite_params)], lite_currentName, lite_elementKind, 0n, [...(lite_ctxs)], lite_iifeDepth, lite_inferMode, "");
                void lite_element;
                if (lite_inferMode) {
                    lite_listMarkers = liteFn$frontend$collectParsedMarkers(lite_listMarkers, lite_element);
                }
                if ((((((lite_element).kind) === ("Unit"))) && (((lite_elementKind) !== ("Unit"))))) {
                    liteFn$frontend$failAt(lite_source, lite_elementStart, lite_prefix, (((("list element ") + (liteFn$lib$core$format$decimalText(lite$addInt(lite_count, 1n, 158946))))) + (" cannot be Unit")));
                }
                if (liteFn$frontend$isListKind((lite_element).kind)) {
                    liteFn$frontend$failAt(lite_source, lite_elementStart, lite_prefix, "nested list types are not supported");
                }
                if (((lite_elementKind) === (""))) {
                    if ((((lite_element).kind) !== ("Never"))) {
                        lite_elementKind = (lite_element).kind;
                    }
                } else {
                    const lite_compatible = (Boolean(lite_isListTarget) ? liteFn$frontend$isCompatibleKind(lite_elementKind, (lite_element).kind) : (((((lite_element).kind) === ("Never"))) || ((((lite_element).kind) === (lite_elementKind)))));
                    void lite_compatible;
                    if ((!(lite_compatible))) {
                        liteFn$frontend$failAt(lite_source, lite_elementStart, lite_prefix, (((((((((("list element ") + (liteFn$lib$core$format$decimalText(lite$addInt(lite_count, 1n, 159586))))) + (" must be "))) + (liteFn$frontend$displayKind(lite_elementKind)))) + (", got "))) + (liteFn$frontend$displayKind((lite_element).kind))));
                    }
                }
                lite_elementCodes.push(liteFn$frontend$assignValueCode(lite_target, lite_elementKind, (lite_element).kind, (lite_element).code));
                lite_count = lite$addInt(lite_count, 1n, 159869);
                lite_cursor = liteFn$frontend$skipTrivia(lite_source, (lite_element).next, lite_prefix);
                if (((((lite_cursor) < (liteFn$lib$core$text$length(lite_source)))) && (((liteFn$lib$core$text$at(lite_source, lite_cursor)) === (","))))) {
                    lite_cursor = liteFn$frontend$skipTrivia(lite_source, lite$addInt(lite_cursor, 1n, 160075), lite_prefix);
                } else {
                    break;
                }
            }
            lite_cursor = liteFn$frontend$expectSymbol(lite_source, lite_cursor, "]", lite_prefix);
            if (((((lite_count) > (0n))) && (((lite_elementKind) === (""))))) {
                liteFn$frontend$failAt(lite_source, lite_start, lite_prefix, "list element 1 cannot be Never");
            }
            if (((((((((lite_count) === (0n))) && ((!(liteFn$frontend$isListKind(lite_expected)))))) && ((!(lite_isTailList))))) && ((!(liteFn$frontend$isArrayKind(lite_expected)))))) {
                liteFn$frontend$failAt(lite_source, lite_start, lite_prefix, "empty list literal requires a List element type");
            }
            const lite_resultKind = (Boolean(((liteFn$frontend$isListKind(lite_expected)) || ((((((lite_count) === (0n))) && (lite_isTailList)))))) ? (((("List<") + (lite_elementKind))) + (">")) : (((((((("[") + (lite_elementKind))) + (";"))) + (liteFn$lib$core$int$intText(lite_count)))) + ("]")));
            void lite_resultKind;
            lite_left = liteFn$frontend$withMarkers({ kind: lite_resultKind, code: (((("[") + (liteFn$lib$core$text$joinTexts([...(lite_elementCodes)], ", ")))) + ("]")), intValue: 0n, textValue: "", constant: false, next: lite_cursor }, lite_listMarkers);
        } else if (((lite_ch) === ("@"))) {
            const lite_tagInfo = liteFn$frontend$parseTagAt(lite_source, lite_start, lite_prefix);
            void lite_tagInfo;
            const lite_afterTag = liteFn$frontend$skipTrivia(lite_source, (lite_tagInfo).next, lite_prefix);
            void lite_afterTag;
            const lite_tagSourceSize = liteFn$lib$core$text$length(lite_source);
            void lite_tagSourceSize;
            if (((((lite_afterTag) < (lite_tagSourceSize))) && (((liteFn$lib$core$text$at(lite_source, lite_afterTag)) === ("."))))) {
                const lite_fieldStart = liteFn$frontend$skipTrivia(lite_source, lite$addInt(lite_afterTag, 1n, 161287), lite_prefix);
                void lite_fieldStart;
                if (((((lite_fieldStart) >= (lite_tagSourceSize))) || ((!(liteFn$lib$core$text$isNameStart(liteFn$lib$core$text$at(lite_source, lite_fieldStart))))))) {
                    liteFn$frontend$failAt(lite_source, lite_fieldStart, lite_prefix, (((("expected field name after @") + ((lite_tagInfo).tag))) + (".")));
                }
                const lite_fieldEnd = liteFn$lib$core$text$skipName(lite_source, lite_fieldStart);
                void lite_fieldEnd;
                const lite_fieldName = liteFn$lib$core$text$slice(lite_source, lite_fieldStart, lite_fieldEnd);
                void lite_fieldName;
                const lite_ctxIdx = liteFn$frontend$findTaggedCtxIndex([...(lite_ctxs)], (lite_tagInfo).tag);
                void lite_ctxIdx;
                if (((lite_ctxIdx) < (0n))) {
                    liteFn$frontend$failAt(lite_source, lite_start, lite_prefix, (("unknown block tag @") + ((lite_tagInfo).tag)));
                }
                if (liteFn$frontend$hasFinallyAbove([...(lite_ctxs)], lite_ctxIdx)) {
                    liteFn$frontend$failAt(lite_source, lite_fieldStart, lite_prefix, (((("metadata for @") + ((lite_tagInfo).tag))) + (" is not available in finally")));
                }
                const lite_ctx = lite$listAt((lite_ctxs), lite_ctxIdx, 162043);
                void lite_ctx;
                if ((((((lite_ctx).kind) === ("if"))) || ((((lite_ctx).kind) === ("match"))))) {
                    if (((lite_fieldName) === ("value"))) {
                        if ((((lite_ctx).phase) !== ("then"))) {
                            liteFn$frontend$failAt(lite_source, lite_fieldStart, lite_prefix, (((("@") + ((lite_tagInfo).tag))) + (".value is only available inside that conditional's then block")));
                        }
                        if ((((((((lite_ctx).itemKind) === ("Unit"))) || ((((lite_ctx).itemKind) === ("Never"))))) || ((((lite_ctx).itemKind) === (""))))) {
                            liteFn$frontend$failAt(lite_source, lite_fieldStart, lite_prefix, (((((((("block tag @") + ((lite_tagInfo).tag))) + (" does not expose .value for "))) + (liteFn$frontend$displayKind((Boolean((((lite_ctx).itemKind) === (""))) ? "Unit" : (lite_ctx).itemKind))))) + (" conditional")));
                        }
                        lite_left = { kind: (lite_ctx).itemKind, code: (lite_ctx).itemVar, intValue: 0n, textValue: "", constant: false, next: lite_fieldEnd };
                    } else {
                        liteFn$frontend$failAt(lite_source, lite_fieldStart, lite_prefix, (((((("conditional tag @") + ((lite_tagInfo).tag))) + (" only exposes .value, not ."))) + (lite_fieldName)));
                    }
                } else if ((((lite_ctx).kind) === ("loop"))) {
                    if ((((lite_ctx).phase) === ("finally"))) {
                        liteFn$frontend$failAt(lite_source, lite_fieldStart, lite_prefix, (((("metadata for @") + ((lite_tagInfo).tag))) + (" is not available in finally")));
                    }
                    if (((lite_target) !== ("ts"))) {
                        liteFn$frontend$failAt(lite_source, lite_start, lite_prefix, "C backend does not support loop metadata yet");
                    }
                    lite_left = liteFn$frontend$resolveLoopField(lite_target, lite_ctx, lite_fieldName, lite_expected, lite_source, lite_fieldStart, lite_fieldEnd, lite_prefix);
                } else {
                    liteFn$frontend$failAt(lite_source, lite_fieldStart, lite_prefix, (((((("block tag @") + ((lite_tagInfo).tag))) + (" does not expose ."))) + (lite_fieldName)));
                }
            } else if (((((lite_afterTag) < (lite_tagSourceSize))) && (((liteFn$lib$core$text$at(lite_source, lite_afterTag)) === ("{"))))) {
                if (((lite_target) !== ("ts"))) {
                    liteFn$frontend$failAt(lite_source, lite_start, lite_prefix, "C backend does not support tagged blocks yet");
                }
                const lite_hintExpected = (Boolean(((((lite_expected) === ("Unit"))) || (((lite_expected) === ("Never"))))) ? "" : (Boolean(liteFn$lib$core$text$startsWithAt(lite_expected, 0n, "TailList<")) ? (((("List<") + (liteFn$frontend$listElementKind(liteFn$lib$core$text$slice(lite_expected, 4n, liteFn$lib$core$text$length(lite_expected)))))) + (">")) : lite_expected));
                void lite_hintExpected;
                const lite_blockId = liteFn$frontend$nextCtxId([...(lite_ctxs)]);
                void lite_blockId;
                const lite_blockLabel = (("lite$b") + (liteFn$lib$core$int$intText(lite_blockId)));
                void lite_blockLabel;
                const lite_blockValVar = (("lite$val") + (liteFn$lib$core$int$intText(lite_blockId)));
                void lite_blockValVar;
                const lite_pass1ValKind = (Boolean(((lite_hintExpected) === (""))) ? "__infer__" : (("__infer__:") + (lite_hintExpected)));
                void lite_pass1ValKind;
                const lite_pass1Ctx = { id: lite_blockId, tag: (lite_tagInfo).tag, kind: "block", phase: "body", iifeDepth: lite$addInt(lite_iifeDepth, 1n, 164633), valKind: lite_pass1ValKind, valVar: lite_blockValVar, label: lite_blockLabel, iterLabel: "", countVar: "", itemVar: "", itemKind: "", indexVar: "", hasIndex: false };
                void lite_pass1Ctx;
                const lite_pass1 = liteFn$frontend$parseBinaryCtx(lite_target, lite_source, lite_afterTag, lite_prefix, [...(lite_locals)], [...(lite_functions)], [...(lite_params)], lite_currentName, lite_hintExpected, 0n, [...(liteFn$frontend$appendCtx([...(lite_ctxs)], lite_pass1Ctx))], lite$addInt(lite_iifeDepth, 1n, 164984), true, "tagged");
                void lite_pass1;
                if (lite_inferMode) {
                    lite_left = lite_pass1;
                } else {
                    const lite_inferredKind = (lite_pass1).kind;
                    void lite_inferredKind;
                    const lite_pass2Expected = (Boolean(((((lite_inferredKind) === ("Unit"))) || (((lite_inferredKind) === ("Never"))))) ? "" : lite_inferredKind);
                    void lite_pass2Expected;
                    const lite_pass2Ctx = { id: lite_blockId, tag: (lite_tagInfo).tag, kind: "block", phase: "body", iifeDepth: lite$addInt(lite_iifeDepth, 1n, 165380), valKind: lite_inferredKind, valVar: lite_blockValVar, label: lite_blockLabel, iterLabel: "", countVar: "", itemVar: "", itemKind: "", indexVar: "", hasIndex: false };
                    void lite_pass2Ctx;
                    lite_left = liteFn$frontend$parseBinaryCtx(lite_target, lite_source, lite_afterTag, lite_prefix, [...(lite_locals)], [...(lite_functions)], [...(lite_params)], lite_currentName, lite_pass2Expected, 0n, [...(liteFn$frontend$appendCtx([...(lite_ctxs)], lite_pass2Ctx))], lite$addInt(lite_iifeDepth, 1n, 165742), false, "tagged");
                }
                const lite_afterTaggedClose = liteFn$frontend$skipTrivia(lite_source, (lite_left).next, lite_prefix);
                void lite_afterTaggedClose;
                if (((((lite_afterTaggedClose) < (lite_tagSourceSize))) && (liteFn$lib$core$text$wordAt(lite_source, lite_afterTaggedClose, "then")))) {
                    liteFn$frontend$failAt(lite_source, lite_afterTaggedClose, lite_prefix, "then requires an if, match, or loop");
                }
                if (((((lite_afterTaggedClose) < (lite_tagSourceSize))) && (liteFn$lib$core$text$wordAt(lite_source, lite_afterTaggedClose, "finally")))) {
                    const lite_afterFinKw = liteFn$frontend$skipTrivia(lite_source, lite$addInt(lite_afterTaggedClose, 7n, 166236), lite_prefix);
                    void lite_afterFinKw;
                    liteFn$frontend$rejectMisplacedTag(lite_source, lite_afterFinKw, lite_prefix, "block tag cannot appear after finally");
                    const lite_finOpen = liteFn$frontend$expectSymbol(lite_source, lite_afterFinKw, "{", lite_prefix);
                    void lite_finOpen;
                    const lite_taggedFinCtx = { id: lite_blockId, tag: (lite_tagInfo).tag, kind: "block", phase: "finally", iifeDepth: lite$addInt(lite_iifeDepth, 1n, 166572), valKind: (lite_left).kind, valVar: lite_blockValVar, label: lite_blockLabel, iterLabel: "", countVar: "", itemVar: "", itemKind: "", indexVar: "", hasIndex: false };
                    void lite_taggedFinCtx;
                    const lite_finBarrierCtx = { id: 0n, tag: "", kind: "finally", phase: "finally", iifeDepth: lite$addInt(lite_iifeDepth, 1n, 166885), valKind: "Unit", valVar: "", label: "", iterLabel: "", countVar: "", itemVar: "", itemKind: "", indexVar: "", hasIndex: false };
                    void lite_finBarrierCtx;
                    const lite_finCtxs: { id: bigint; tag: string; kind: string; phase: string; iifeDepth: bigint; valKind: string; valVar: string; label: string; iterLabel: string; countVar: string; itemVar: string; itemKind: string; indexVar: string; hasIndex: boolean }[] = [...(liteFn$frontend$appendCtx([...(liteFn$frontend$appendCtx([...(lite_ctxs)], lite_taggedFinCtx))], lite_finBarrierCtx))];
                    void lite_finCtxs;
                    const lite_finParsed = liteFn$frontend$parseBinaryCtx(lite_target, lite_source, lite$subtractInt(lite_finOpen, 1n, 167189), lite_prefix, [...(lite_locals)], [...(lite_functions)], [...(lite_params)], lite_currentName, "", 0n, [...(lite_finCtxs)], lite$addInt(lite_iifeDepth, 1n, 167288), lite_inferMode, "finally");
                    void lite_finParsed;
                    const lite_afterFinClose = liteFn$frontend$skipTrivia(lite_source, (lite_finParsed).next, lite_prefix);
                    void lite_afterFinClose;
                    if (((((lite_afterFinClose) < (lite_tagSourceSize))) && (liteFn$lib$core$text$wordAt(lite_source, lite_afterFinClose, "then")))) {
                        liteFn$frontend$failAt(lite_source, lite_afterFinClose, lite_prefix, "then must appear before finally");
                    }
                    if (((((lite_afterFinClose) < (lite_tagSourceSize))) && (liteFn$lib$core$text$wordAt(lite_source, lite_afterFinClose, "finally")))) {
                        liteFn$frontend$failAt(lite_source, lite_afterFinClose, lite_prefix, "duplicate finally block");
                    }
                    const lite_finalTaggedKind = (Boolean((((lite_finParsed).kind) === ("Never"))) ? "Never" : (lite_left).kind);
                    void lite_finalTaggedKind;
                    if (lite_inferMode) {
                        const lite_mergedTaggedMarkers = liteFn$frontend$collectParsedMarkers(liteFn$frontend$collectParsedMarkers("", lite_left), lite_finParsed);
                        void lite_mergedTaggedMarkers;
                        lite_left = liteFn$frontend$withMarkers({ kind: lite_finalTaggedKind, code: "", intValue: 0n, textValue: "", constant: false, next: (lite_finParsed).next }, lite_mergedTaggedMarkers);
                    } else {
                        const lite_taggedTryBody = (Boolean((((lite_left).kind) === ("Unit"))) ? (((("void (") + ((lite_left).code))) + ("); return undefined;")) : (Boolean((((lite_left).kind) === ("Never"))) ? (((("(") + ((lite_left).code))) + (");")) : (((("return ") + ((lite_left).code))) + (";"))));
                        void lite_taggedTryBody;
                        lite_left = { kind: lite_finalTaggedKind, code: (((((((("(() => { try { ") + (lite_taggedTryBody))) + (" } finally { "))) + ((lite_finParsed).code))) + (" } })()")), intValue: 0n, textValue: "", constant: false, next: (lite_finParsed).next };
                    }
                }
            } else if (((((lite_afterTag) < (lite_tagSourceSize))) && (liteFn$lib$core$text$wordAt(lite_source, lite_afterTag, "if")))) {
                lite_condParseKind = "if";
                lite_condParseStart = lite_afterTag;
                lite_condParseTag = (lite_tagInfo).tag;
                lite_condParseTagAt = lite_start;
            } else if (((((lite_afterTag) < (lite_tagSourceSize))) && (liteFn$lib$core$text$wordAt(lite_source, lite_afterTag, "match")))) {
                lite_condParseKind = "match";
                lite_condParseStart = lite_afterTag;
                lite_condParseTag = (lite_tagInfo).tag;
                lite_condParseTagAt = lite_start;
            } else if (((((lite_afterTag) < (lite_tagSourceSize))) && (liteFn$lib$core$text$wordAt(lite_source, lite_afterTag, "loop")))) {
                lite_condParseKind = "loop";
                lite_condParseStart = lite_afterTag;
                lite_condParseTag = (lite_tagInfo).tag;
                lite_condParseTagAt = lite_start;
            } else {
                liteFn$frontend$failAt(lite_source, lite_afterTag, lite_prefix, (("expected {, if, match, loop or . after block tag @") + ((lite_tagInfo).tag)));
            }
        } else if (((lite_ch) === ("{"))) {
            const lite_isTaggedBody = ((lite_bodySink) === ("tagged"));
            void lite_isTaggedBody;
            const lite_isLoopBody = ((lite_bodySink) === ("loopBody"));
            void lite_isLoopBody;
            const lite_isStmtBody = ((lite_bodySink) === ("stmt"));
            void lite_isStmtBody;
            const lite_isFinallyBody = ((lite_bodySink) === ("finally"));
            void lite_isFinallyBody;
            const lite_isBranchBody = ((lite_bodySink) === ("branch"));
            void lite_isBranchBody;
            const lite_isStandaloneBlock = (((((((((!(lite_isTaggedBody))) && ((!(lite_isLoopBody))))) && ((!(lite_isStmtBody))))) && ((!(lite_isFinallyBody))))) && ((!(lite_isBranchBody))));
            void lite_isStandaloneBlock;
            const lite_allowOutput = ((((((((((lite_isTaggedBody) || (lite_isLoopBody))) || (lite_isStmtBody))) || (lite_isFinallyBody))) || (lite_isBranchBody))) || ((((lite_bodySink) === ("exprOut")))));
            void lite_allowOutput;
            const lite_bodyDepth = (Boolean(((((((lite_isTaggedBody) || (lite_isLoopBody))) || (lite_isStmtBody))) || (lite_isFinallyBody))) ? lite_iifeDepth : lite$addInt(lite_iifeDepth, 1n, 170330));
            void lite_bodyDepth;
            const lite_stmtReturnPrefix = (Boolean(((((((lite_isTaggedBody) || (lite_isLoopBody))) || (lite_isStmtBody))) || (lite_isFinallyBody))) ? "" : "return ");
            void lite_stmtReturnPrefix;
            const lite_blockLocals: { name: string; runtime: string; kind: string; mutable: boolean; writable: boolean; depth: bigint; constant: boolean; code: string; intValue: bigint; textValue: string; initState: string }[] = [...([])];
            void lite_blockLocals;
            for (const lite_entry of [...(lite_locals)]) {
                void lite_entry;
                lite_blockLocals.push(lite_entry);
            }
            const lite_statements: string[] = [...([])];
            void lite_statements;
            let lite_statementCount = 0n;
            void lite_statementCount;
            let lite_blockMarkers = "";
            void lite_blockMarkers;
            let lite_cursor = liteFn$frontend$skipItemSeparators(lite_source, lite$addInt(lite_start, 1n, 170734), lite_prefix);
            void lite_cursor;
            let lite_blockKind = "Unit";
            void lite_blockKind;
            let lite_blockCode = liteFn$frontend$targetUnitLiteralCode(lite_target);
            void lite_blockCode;
            let lite_blockInt = 0n;
            void lite_blockInt;
            let lite_blockText = "";
            void lite_blockText;
            let lite_blockConstant = true;
            void lite_blockConstant;
            let lite_blockExits = false;
            void lite_blockExits;
            let lite_sawTailExpr = false;
            void lite_sawTailExpr;
            let lite_lastPartialIfDiverges = false;
            void lite_lastPartialIfDiverges;
            const lite_blockSourceSize = liteFn$lib$core$text$length(lite_source);
            void lite_blockSourceSize;
            while (Boolean(true)) {
                lite_cursor = liteFn$frontend$skipItemSeparators(lite_source, lite_cursor, lite_prefix);
                if (((lite_cursor) >= (lite_blockSourceSize))) {
                    liteFn$frontend$failAt(lite_source, lite_start, lite_prefix, "expected }");
                }
                if (((liteFn$lib$core$text$at(lite_source, lite_cursor)) === ("}"))) {
                    lite_cursor = lite$addInt(lite_cursor, 1n, 171376);
                    break;
                }
                lite_lastPartialIfDiverges = false;
                let lite_isStatement = false;
                void lite_isStatement;
                let lite_destructureOpen = (-1n);
                void lite_destructureOpen;
                let lite_destructureMutable = false;
                void lite_destructureMutable;
                const lite_chAtCursor = liteFn$lib$core$text$at(lite_source, lite_cursor);
                void lite_chAtCursor;
                if (((lite_chAtCursor) === ("("))) {
                    const lite_parenEnd = liteFn$frontend$scanParenEnd(lite_source, lite_cursor, lite_prefix);
                    void lite_parenEnd;
                    const lite_afterParen = (Boolean(((lite_parenEnd) >= (0n))) ? liteFn$frontend$skipTrivia(lite_source, lite_parenEnd, lite_prefix) : (-1n));
                    void lite_afterParen;
                    if (((((lite_afterParen) >= (0n))) && (liteFn$lib$core$text$startsWithAt(lite_source, lite_afterParen, ":=")))) {
                        lite_destructureOpen = lite_cursor;
                    }
                } else if (((((lite_chAtCursor) === ("v"))) && (liteFn$lib$core$text$wordAt(lite_source, lite_cursor, "var")))) {
                    const lite_afterVar = liteFn$frontend$skipTrivia(lite_source, lite$addInt(lite_cursor, 3n, 172129), lite_prefix);
                    void lite_afterVar;
                    if (((((lite_afterVar) < (lite_blockSourceSize))) && (((liteFn$lib$core$text$at(lite_source, lite_afterVar)) === ("("))))) {
                        lite_destructureOpen = lite_afterVar;
                        lite_destructureMutable = true;
                    }
                }
                if (((lite_destructureOpen) >= (0n))) {
                    lite_isStatement = true;
                    const lite_destructure = liteFn$frontend$parseTupleDestructureTarget(lite_source, lite_destructureOpen, lite_prefix);
                    void lite_destructure;
                    const lite_afterTarget = liteFn$frontend$skipTrivia(lite_source, (lite_destructure).next, lite_prefix);
                    void lite_afterTarget;
                    if ((!(liteFn$lib$core$text$startsWithAt(lite_source, lite_afterTarget, ":=")))) {
                        liteFn$frontend$failAt(lite_source, lite_afterTarget, lite_prefix, "expected := after tuple destructuring target");
                    }
                    const lite_rhs = liteFn$frontend$parseBinaryCtx(lite_target, lite_source, liteFn$frontend$skipTrivia(lite_source, lite$addInt(lite_afterTarget, 2n, 172873), lite_prefix), lite_prefix, [...(lite_blockLocals)], [...(lite_functions)], [...(lite_params)], lite_currentName, "", 0n, [...(lite_ctxs)], lite_bodyDepth, lite_inferMode, "");
                    void lite_rhs;
                    if (lite_inferMode) {
                        lite_blockMarkers = liteFn$frontend$collectParsedMarkers(lite_blockMarkers, lite_rhs);
                    }
                    if ((((lite_destructure).count) === (0n))) {
                        if (lite_destructureMutable) {
                            liteFn$frontend$failAt(lite_source, lite_destructureOpen, lite_prefix, "var tuple destructuring needs at least one binding");
                        }
                        if (liteFn$frontend$isTupleKind((lite_rhs).kind)) {
                            liteFn$frontend$failAt(lite_source, lite_destructureOpen, lite_prefix, (("tuple destructuring expected 0 fields, got ") + (liteFn$lib$core$int$intText(liteFn$frontend$tupleComponentCount((lite_rhs).kind)))));
                        }
                        if ((((((lite_rhs).kind) !== ("Unit"))) && ((((lite_rhs).kind) !== ("Never"))))) {
                            liteFn$frontend$failAt(lite_source, lite_destructureOpen, lite_prefix, (("tuple destructuring requires Unit for (), got ") + (liteFn$frontend$displayKind((lite_rhs).kind))));
                        }
                        const lite_statementNext = liteFn$frontend$consumeStatementEnd(lite_source, (lite_rhs).next, lite_prefix);
                        void lite_statementNext;
                        if (((lite_statementNext) < (0n))) {
                            liteFn$frontend$failAt(lite_source, liteFn$frontend$skipTrivia(lite_source, (lite_rhs).next, lite_prefix), lite_prefix, "expected ; after tuple destructuring");
                        }
                        if ((!(lite_blockExits))) {
                            if ((((lite_rhs).kind) === ("Never"))) {
                                lite_statements.push(((((((lite_stmtReturnPrefix) + ("("))) + ((lite_rhs).code))) + (");")));
                                lite_blockExits = true;
                            } else {
                                lite_statements.push((((("void (") + ((lite_rhs).code))) + (");")));
                            }
                            lite_statementCount = lite$addInt(lite_statementCount, 1n, 174435);
                        }
                        lite_blockConstant = false;
                        lite_cursor = lite_statementNext;
                    } else if ((lite_destructure).grouped) {
                        const lite_bindName = (lite_destructure).namesText;
                        void lite_bindName;
                        liteFn$frontend$rejectNonValueBinding(lite_source, lite_destructureOpen, lite_prefix, (lite_rhs).kind, lite_bindName);
                        const lite_statementNext = liteFn$frontend$consumeStatementEnd(lite_source, (lite_rhs).next, lite_prefix);
                        void lite_statementNext;
                        if (((lite_statementNext) < (0n))) {
                            liteFn$frontend$failAt(lite_source, liteFn$frontend$skipTrivia(lite_source, (lite_rhs).next, lite_prefix), lite_prefix, "expected ; after tuple destructuring");
                        }
                        const lite_bindRuntime = liteFn$frontend$localRuntimeName(lite_target, [...(lite_blockLocals)], lite_bindName, "", 1n);
                        void lite_bindRuntime;
                        lite_blockLocals.push({ name: lite_bindName, runtime: lite_bindRuntime, kind: (lite_rhs).kind, mutable: lite_destructureMutable, writable: false, depth: 1n, constant: false, code: (lite_rhs).code, intValue: (lite_rhs).intValue, textValue: (lite_rhs).textValue, initState: "init" });
                        if ((!(lite_blockExits))) {
                            const lite_declKw = (Boolean(lite_destructureMutable) ? "let " : "const ");
                            void lite_declKw;
                            lite_statements.push(((((((((((((lite_declKw) + (lite_bindRuntime))) + (" = "))) + (liteFn$frontend$copiedValueCode(lite_target, (lite_rhs).kind, (lite_rhs).code)))) + ("; void "))) + (lite_bindRuntime))) + (";")));
                            lite_statementCount = lite$addInt(lite_statementCount, 1n, 175746);
                        }
                        lite_blockConstant = false;
                        lite_cursor = lite_statementNext;
                    } else {
                        if ((!(liteFn$frontend$isTupleKind((lite_rhs).kind)))) {
                            liteFn$frontend$failAt(lite_source, lite_destructureOpen, lite_prefix, (("tuple destructuring requires a tuple value, got ") + (liteFn$frontend$displayKind((lite_rhs).kind))));
                        }
                        if (((liteFn$frontend$tupleComponentCount((lite_rhs).kind)) !== ((lite_destructure).count))) {
                            liteFn$frontend$failAt(lite_source, lite_destructureOpen, lite_prefix, (((((("tuple destructuring expected ") + (liteFn$lib$core$int$intText((lite_destructure).count)))) + (" fields, got "))) + (liteFn$lib$core$int$intText(liteFn$frontend$tupleComponentCount((lite_rhs).kind)))));
                        }
                        const lite_statementNext = liteFn$frontend$consumeStatementEnd(lite_source, (lite_rhs).next, lite_prefix);
                        void lite_statementNext;
                        if (((lite_statementNext) < (0n))) {
                            liteFn$frontend$failAt(lite_source, liteFn$frontend$skipTrivia(lite_source, (lite_rhs).next, lite_prefix), lite_prefix, "expected ; after tuple destructuring");
                        }
                        const lite_tempRuntime = liteFn$frontend$freshScopeTemp([...(lite_blockLocals)], "lite$tuple");
                        void lite_tempRuntime;
                        lite_blockLocals.push({ name: "$tuple", runtime: lite_tempRuntime, kind: "Unit", mutable: false, writable: false, depth: 1n, constant: false, code: "", intValue: 0n, textValue: "", initState: "init" });
                        if ((!(lite_blockExits))) {
                            lite_statements.push((((((((((((("const ") + (lite_tempRuntime))) + (" = "))) + ((lite_rhs).code))) + ("; void "))) + (lite_tempRuntime))) + (";")));
                        }
                        let lite_bindCursor = 0n;
                        void lite_bindCursor;
                        let lite_bindIndex = 0n;
                        void lite_bindIndex;
                        const lite_namesLen = liteFn$lib$core$text$length((lite_destructure).namesText);
                        void lite_namesLen;
                        while (((lite_bindIndex) < ((lite_destructure).count))) {
                            let lite_bindEnd = lite_bindCursor;
                            void lite_bindEnd;
                            while (((((lite_bindEnd) < (lite_namesLen))) && (((liteFn$lib$core$text$at((lite_destructure).namesText, lite_bindEnd)) !== (","))))) {
                                lite_bindEnd = lite$addInt(lite_bindEnd, 1n, 177628);
                            }
                            const lite_bindName = liteFn$lib$core$text$slice((lite_destructure).namesText, lite_bindCursor, lite_bindEnd);
                            void lite_bindName;
                            lite_bindCursor = lite$addInt(lite_bindEnd, 1n, 177799);
                            const lite_comp = liteFn$frontend$tupleComponent((lite_rhs).kind, lite_bindIndex);
                            void lite_comp;
                            const lite_bindRuntime = liteFn$frontend$localRuntimeName(lite_target, [...(lite_blockLocals)], lite_bindName, "", 1n);
                            void lite_bindRuntime;
                            const lite_fieldCode = ((((lite_tempRuntime) + ("."))) + ((lite_comp).prop));
                            void lite_fieldCode;
                            lite_blockLocals.push({ name: lite_bindName, runtime: lite_bindRuntime, kind: (lite_comp).kind, mutable: lite_destructureMutable, writable: false, depth: 1n, constant: false, code: lite_fieldCode, intValue: 0n, textValue: "", initState: "init" });
                            if ((!(lite_blockExits))) {
                                const lite_declKw = (Boolean(lite_destructureMutable) ? "let " : "const ");
                                void lite_declKw;
                                lite_statements.push(((((((((((((lite_declKw) + (lite_bindRuntime))) + (" = "))) + (lite_fieldCode))) + ("; void "))) + (lite_bindRuntime))) + (";")));
                            }
                            lite_bindIndex = lite$addInt(lite_bindIndex, 1n, 178698);
                        }
                        if ((!(lite_blockExits))) {
                            lite_statementCount = lite$addInt(lite_statementCount, 1n, 178797);
                        }
                        lite_blockConstant = false;
                        lite_cursor = lite_statementNext;
                    }
                } else if (((lite_chAtCursor) === ("{"))) {
                    const lite_braceEnd = liteFn$frontend$scanBraceEnd(lite_source, lite_cursor, lite_prefix);
                    void lite_braceEnd;
                    const lite_fullBraceEnd = (Boolean(((lite_braceEnd) >= (0n))) ? liteFn$frontend$scanTrailingFinallyEnd(lite_source, lite_braceEnd, lite_prefix) : (-1n));
                    void lite_fullBraceEnd;
                    const lite_afterBrace = (Boolean(((lite_fullBraceEnd) >= (0n))) ? liteFn$frontend$skipItemSeparators(lite_source, lite_fullBraceEnd, lite_prefix) : (-1n));
                    void lite_afterBrace;
                    const lite_atTailBrace = ((((((((!(lite_isStmtBody)))) && (((lite_afterBrace) >= (0n))))) && (((lite_afterBrace) < (lite_blockSourceSize))))) && (((liteFn$lib$core$text$at(lite_source, lite_afterBrace)) === ("}"))));
                    void lite_atTailBrace;
                    if ((!(lite_atTailBrace))) {
                        lite_isStatement = true;
                        const lite_stmtBlock = liteFn$frontend$parseBinaryCtx(lite_target, lite_source, lite_cursor, lite_prefix, [...(lite_blockLocals)], [...(lite_functions)], [...(lite_params)], lite_currentName, "", 0n, [...(lite_ctxs)], lite_bodyDepth, lite_inferMode, "stmt");
                        void lite_stmtBlock;
                        if (lite_inferMode) {
                            lite_blockMarkers = liteFn$frontend$collectParsedMarkers(lite_blockMarkers, lite_stmtBlock);
                        }
                        const lite_afterStmtBlock = liteFn$frontend$skipTrivia(lite_source, (lite_stmtBlock).next, lite_prefix);
                        void lite_afterStmtBlock;
                        if (((((lite_afterStmtBlock) < (lite_blockSourceSize))) && (liteFn$lib$core$text$wordAt(lite_source, lite_afterStmtBlock, "then")))) {
                            liteFn$frontend$failAt(lite_source, lite_afterStmtBlock, lite_prefix, "then requires an if, match, or loop");
                        }
                        let lite_stmtEndPos = (lite_stmtBlock).next;
                        void lite_stmtEndPos;
                        if (((((lite_afterStmtBlock) < (lite_blockSourceSize))) && (liteFn$lib$core$text$wordAt(lite_source, lite_afterStmtBlock, "finally")))) {
                            if (((lite_target) !== ("ts"))) {
                                liteFn$frontend$failAt(lite_source, lite_afterStmtBlock, lite_prefix, "C backend does not support finally blocks yet");
                            }
                            const lite_afterStmtFinKw = liteFn$frontend$skipTrivia(lite_source, lite$addInt(lite_afterStmtBlock, 7n, 180474), lite_prefix);
                            void lite_afterStmtFinKw;
                            liteFn$frontend$rejectMisplacedTag(lite_source, lite_afterStmtFinKw, lite_prefix, "block tag cannot appear after finally");
                            const lite_stmtFinOpen = liteFn$frontend$expectSymbol(lite_source, lite_afterStmtFinKw, "{", lite_prefix);
                            void lite_stmtFinOpen;
                            const lite_stmtFinCtx = { id: 0n, tag: "", kind: "finally", phase: "finally", iifeDepth: lite_bodyDepth, valKind: "Unit", valVar: "", label: "", iterLabel: "", countVar: "", itemVar: "", itemKind: "", indexVar: "", hasIndex: false };
                            void lite_stmtFinCtx;
                            const lite_stmtFin = liteFn$frontend$parseBinaryCtx(lite_target, lite_source, lite$subtractInt(lite_stmtFinOpen, 1n, 181073), lite_prefix, [...(lite_blockLocals)], [...(lite_functions)], [...(lite_params)], lite_currentName, "", 0n, [...(liteFn$frontend$appendCtx([...(lite_ctxs)], lite_stmtFinCtx))], lite_bodyDepth, lite_inferMode, "finally");
                            void lite_stmtFin;
                            const lite_afterStmtFinClose = liteFn$frontend$skipTrivia(lite_source, (lite_stmtFin).next, lite_prefix);
                            void lite_afterStmtFinClose;
                            if (((((lite_afterStmtFinClose) < (lite_blockSourceSize))) && (liteFn$lib$core$text$wordAt(lite_source, lite_afterStmtFinClose, "then")))) {
                                liteFn$frontend$failAt(lite_source, lite_afterStmtFinClose, lite_prefix, "then must appear before finally");
                            }
                            if (((((lite_afterStmtFinClose) < (lite_blockSourceSize))) && (liteFn$lib$core$text$wordAt(lite_source, lite_afterStmtFinClose, "finally")))) {
                                liteFn$frontend$failAt(lite_source, lite_afterStmtFinClose, lite_prefix, "duplicate finally block");
                            }
                            if (lite_inferMode) {
                                lite_blockMarkers = liteFn$frontend$collectParsedMarkers(lite_blockMarkers, lite_stmtFin);
                            }
                            if ((!(lite_blockExits))) {
                                lite_statements.push((((((((("try { ") + ((lite_stmtBlock).code))) + (" } finally { "))) + ((lite_stmtFin).code))) + (" }")));
                                if ((((((lite_stmtBlock).kind) === ("Never"))) || ((((lite_stmtFin).kind) === ("Never"))))) {
                                    lite_blockExits = true;
                                }
                                lite_statementCount = lite$addInt(lite_statementCount, 1n, 182254);
                            }
                            lite_stmtEndPos = (lite_stmtFin).next;
                        } else if ((!(lite_blockExits))) {
                            if ((((lite_stmtBlock).code) !== (""))) {
                                lite_statements.push((((("{ ") + ((lite_stmtBlock).code))) + (" }")));
                            }
                            if ((((lite_stmtBlock).kind) === ("Never"))) {
                                lite_blockExits = true;
                            }
                            lite_statementCount = lite$addInt(lite_statementCount, 1n, 182684);
                        }
                        lite_blockConstant = false;
                        const lite_stmtNext = liteFn$frontend$consumeStatementEnd(lite_source, lite_stmtEndPos, lite_prefix);
                        void lite_stmtNext;
                        lite_cursor = (Boolean(((lite_stmtNext) >= (0n))) ? lite_stmtNext : lite_stmtEndPos);
                    }
                } else if (((lite_chAtCursor) === ("@"))) {
                    const lite_tagPeek = liteFn$frontend$parseTagAt(lite_source, lite_cursor, lite_prefix);
                    void lite_tagPeek;
                    const lite_afterPeek = liteFn$frontend$skipTrivia(lite_source, (lite_tagPeek).next, lite_prefix);
                    void lite_afterPeek;
                    if (((((lite_afterPeek) >= (lite_blockSourceSize))) || ((((((((((((liteFn$lib$core$text$at(lite_source, lite_afterPeek)) !== ("{"))) && (((liteFn$lib$core$text$at(lite_source, lite_afterPeek)) !== ("."))))) && ((!(liteFn$lib$core$text$wordAt(lite_source, lite_afterPeek, "if")))))) && ((!(liteFn$lib$core$text$wordAt(lite_source, lite_afterPeek, "match")))))) && ((!(liteFn$lib$core$text$wordAt(lite_source, lite_afterPeek, "loop"))))))))) {
                        liteFn$frontend$failAt(lite_source, lite_afterPeek, lite_prefix, (("expected {, if, match, loop or . after block tag @") + ((lite_tagPeek).tag)));
                    }
                } else if (liteFn$lib$core$text$isNameStart(lite_chAtCursor)) {
                    const lite_itemStart = lite_cursor;
                    void lite_itemStart;
                    const lite_itemEnd = liteFn$lib$core$text$skipName(lite_source, lite_itemStart);
                    void lite_itemEnd;
                    const lite_itemName = liteFn$lib$core$text$slice(lite_source, lite_itemStart, lite_itemEnd);
                    void lite_itemName;
                    const lite_afterItemName = liteFn$frontend$skipTrivia(lite_source, lite_itemEnd, lite_prefix);
                    void lite_afterItemName;
                    let lite_blockOutputName = "";
                    void lite_blockOutputName;
                    let lite_blockOutputOpen = lite_afterItemName;
                    void lite_blockOutputOpen;
                    const lite_blockModIdx = liteFn$frontend$localIndex([...(lite_blockLocals)], lite_itemName);
                    void lite_blockModIdx;
                    if (((((((((lite_blockModIdx) >= (0n))) && ((((lite$listAt((lite_blockLocals), lite_blockModIdx, 184087)).kind) === ("Module"))))) && (((lite_afterItemName) < (lite_blockSourceSize))))) && (((liteFn$lib$core$text$at(lite_source, lite_afterItemName)) === ("."))))) {
                        const lite_memberStart = liteFn$frontend$skipTrivia(lite_source, lite$addInt(lite_afterItemName, 1n, 184288), lite_prefix);
                        void lite_memberStart;
                        const lite_memberEnd = liteFn$lib$core$text$skipName(lite_source, lite_memberStart);
                        void lite_memberEnd;
                        if (((lite_memberEnd) > (lite_memberStart))) {
                            const lite_fnIdx = liteFn$frontend$findFunction([...(lite_functions)], ((((lite_itemName) + ("."))) + (liteFn$lib$core$text$slice(lite_source, lite_memberStart, lite_memberEnd))));
                            void lite_fnIdx;
                            if (((lite_fnIdx) >= (0n))) {
                                lite_blockOutputName = liteFn$frontend$coreOutputName((lite$listAt((lite_functions), lite_fnIdx, 184656)).runtime);
                                lite_blockOutputOpen = liteFn$frontend$skipTrivia(lite_source, lite_memberEnd, lite_prefix);
                            }
                        }
                    }
                    if (((lite_blockOutputName) !== (""))) {
                        lite_isStatement = true;
                        if ((!(lite_allowOutput))) {
                            liteFn$frontend$failAt(lite_source, lite_itemStart, lite_prefix, "host output functions are standalone statements");
                        }
                        let lite_outPos = liteFn$frontend$expectSymbol(lite_source, lite_blockOutputOpen, "(", lite_prefix);
                        void lite_outPos;
                        lite_outPos = liteFn$frontend$skipTrivia(lite_source, lite_outPos, lite_prefix);
                        const lite_outParts: string[] = [...([])];
                        void lite_outParts;
                        let lite_outArgCount = 0n;
                        void lite_outArgCount;
                        let lite_outDiverged = false;
                        void lite_outDiverged;
                        while (((((lite_outPos) < (lite_blockSourceSize))) && (((liteFn$lib$core$text$at(lite_source, lite_outPos)) !== (")"))))) {
                            const lite_outArg = liteFn$frontend$parseBinaryCtx(lite_target, lite_source, lite_outPos, lite_prefix, [...(lite_blockLocals)], [...(lite_functions)], [...(lite_params)], lite_currentName, "", 0n, [...(lite_ctxs)], lite_bodyDepth, lite_inferMode, "");
                            void lite_outArg;
                            if (lite_inferMode) {
                                lite_blockMarkers = liteFn$frontend$collectParsedMarkers(lite_blockMarkers, lite_outArg);
                            }
                            if ((!(lite_outDiverged))) {
                                if ((((lite_outArg).kind) === ("Never"))) {
                                    if ((!(lite_blockExits))) {
                                        lite_statements.push(((((((lite_stmtReturnPrefix) + ("("))) + ((lite_outArg).code))) + (");")));
                                        lite_blockExits = true;
                                    }
                                    lite_outDiverged = true;
                                } else {
                                    lite_outParts.push(liteFn$frontend$tsDisplayValueCode((lite_outArg).kind, (lite_outArg).code));
                                }
                            }
                            lite_outArgCount = lite$addInt(lite_outArgCount, 1n, 186382);
                            lite_outPos = liteFn$frontend$skipTrivia(lite_source, (lite_outArg).next, lite_prefix);
                            if (((((lite_outPos) < (lite_blockSourceSize))) && (((liteFn$lib$core$text$at(lite_source, lite_outPos)) === (","))))) {
                                lite_outPos = liteFn$frontend$skipTrivia(lite_source, lite$addInt(lite_outPos, 1n, 186616), lite_prefix);
                            } else {
                                break;
                            }
                        }
                        lite_outPos = liteFn$frontend$expectSymbol(lite_source, lite_outPos, ")", lite_prefix);
                        const lite_stmtNext = liteFn$frontend$consumeStatementEnd(lite_source, lite_outPos, lite_prefix);
                        void lite_stmtNext;
                        if (((lite_stmtNext) < (0n))) {
                            liteFn$frontend$failAt(lite_source, liteFn$frontend$skipTrivia(lite_source, lite_outPos, lite_prefix), lite_prefix, (("expected ; after ") + (lite_blockOutputName)));
                        }
                        if ((((!(lite_outDiverged))) && ((!(lite_blockExits))))) {
                            const lite_lineCode = (Boolean(((lite_outArgCount) === (0n))) ? liteFn$ts__literals$textLiteralCode((Boolean(((lite_blockOutputName) === ("outputLine"))) ? "\n" : "")) : (() => { const lite_joinedArgs = liteFn$lib$core$text$joinTexts([...(lite_outParts)], " + \" \" + "); void lite_joinedArgs; const lite_ending = (Boolean(((lite_blockOutputName) === ("outputLine"))) ? " + \"\\n\"" : ""); void lite_ending; return (Boolean(((lite_ending) !== (""))) ? (((((("(") + (lite_joinedArgs))) + (")"))) + (lite_ending)) : lite_joinedArgs); })());
                            void lite_lineCode;
                            lite_statements.push((((("lite$emit(") + (lite_lineCode))) + (");")));
                        }
                        if ((((!(lite_blockExits))) || (lite_outDiverged))) {
                            lite_statementCount = lite$addInt(lite_statementCount, 1n, 187812);
                        }
                        lite_blockConstant = false;
                        lite_cursor = lite_stmtNext;
                    } else if (((lite_itemName) === ("return"))) {
                        lite_isStatement = true;
                        let lite_hasTargetTag = false;
                        void lite_hasTargetTag;
                        let lite_targetTagName = "";
                        void lite_targetTagName;
                        let lite_targetTagPos = lite_afterItemName;
                        void lite_targetTagPos;
                        let lite_retValStart = lite_afterItemName;
                        void lite_retValStart;
                        if (((((lite_afterItemName) < (lite_blockSourceSize))) && (((liteFn$lib$core$text$at(lite_source, lite_afterItemName)) === ("@"))))) {
                            const lite_retTag = liteFn$frontend$parseTagAt(lite_source, lite_afterItemName, lite_prefix);
                            void lite_retTag;
                            const lite_afterRetTag = liteFn$frontend$skipTrivia(lite_source, (lite_retTag).next, lite_prefix);
                            void lite_afterRetTag;
                            if (((((lite_afterRetTag) >= (lite_blockSourceSize))) || (((liteFn$lib$core$text$at(lite_source, lite_afterRetTag)) !== ("."))))) {
                                lite_hasTargetTag = true;
                                lite_targetTagName = (lite_retTag).tag;
                                lite_retValStart = lite_afterRetTag;
                            }
                        }
                        if (lite_hasTargetTag) {
                            const lite_targetIdx = liteFn$frontend$findTaggedCtxIndex([...(lite_ctxs)], lite_targetTagName);
                            void lite_targetIdx;
                            if (((lite_targetIdx) < (0n))) {
                                liteFn$frontend$failAt(lite_source, lite_targetTagPos, lite_prefix, (("unknown block tag @") + (lite_targetTagName)));
                            }
                            const lite_targetCtx = lite$listAt((lite_ctxs), lite_targetIdx, 189093);
                            void lite_targetCtx;
                            if ((((lite_targetCtx).phase) === ("then"))) {
                                liteFn$frontend$failAt(lite_source, lite_itemStart, lite_prefix, (((("cannot return to @") + ((lite_targetCtx).tag))) + (" from inside its own then block")));
                            }
                            if (liteFn$frontend$hasFinallyAbove([...(lite_ctxs)], lite_targetIdx)) {
                                liteFn$frontend$failAt(lite_source, lite_itemStart, lite_prefix, "cannot return out of finally block");
                            }
                            const lite_isInferTarget = (((((lite_targetCtx).valKind) === ("__infer__"))) || (liteFn$lib$core$text$startsWithAt((lite_targetCtx).valKind, 0n, "__infer__:")));
                            void lite_isInferTarget;
                            if (((((((lite_retValStart) >= (lite_blockSourceSize))) || (((liteFn$lib$core$text$at(lite_source, lite_retValStart)) === (";"))))) || (((liteFn$lib$core$text$at(lite_source, lite_retValStart)) === ("}"))))) {
                                if ((((!(lite_isInferTarget))) && ((((lite_targetCtx).valKind) !== ("Unit"))))) {
                                    liteFn$frontend$failAt(lite_source, lite_itemStart, lite_prefix, (((((((("block @") + ((lite_targetCtx).tag))) + (" returns "))) + (liteFn$frontend$displayKind((lite_targetCtx).valKind)))) + (" and cannot return Unit")));
                                }
                                const lite_stmtNext = liteFn$frontend$consumeStatementEnd(lite_source, lite_retValStart, lite_prefix);
                                void lite_stmtNext;
                                if (((lite_stmtNext) < (0n))) {
                                    liteFn$frontend$failAt(lite_source, lite_retValStart, lite_prefix, "expected ; after return");
                                }
                                if (lite_inferMode) {
                                    lite_blockMarkers = ((((lite_blockMarkers) + (liteFn$lib$core$int$intText((lite_targetCtx).id)))) + ("=Unit\n"));
                                }
                                if ((!(lite_blockExits))) {
                                    if ((((lite_targetCtx).iifeDepth) === (lite_bodyDepth))) {
                                        lite_statements.push((((("break ") + ((lite_targetCtx).label))) + (";")));
                                    } else {
                                        if (((lite_target) !== ("ts"))) {
                                            liteFn$frontend$failAt(lite_source, lite_itemStart, lite_prefix, "C backend does not support non-local return yet");
                                        }
                                        lite_statements.push(((((((lite_stmtReturnPrefix) + ("lite$throwTransfer("))) + (liteFn$lib$core$int$intText((lite_targetCtx).id)))) + (", undefined);")));
                                    }
                                    lite_blockExits = true;
                                }
                                lite_statementCount = lite$addInt(lite_statementCount, 1n, 191235);
                                lite_blockConstant = false;
                                lite_cursor = lite_stmtNext;
                            } else {
                                const lite_retExpected = (Boolean(liteFn$lib$core$text$startsWithAt((lite_targetCtx).valKind, 0n, "__infer__:")) ? liteFn$lib$core$text$slice((lite_targetCtx).valKind, 10n, liteFn$lib$core$text$length((lite_targetCtx).valKind)) : (Boolean((((((((lite_targetCtx).valKind) === ("__infer__"))) || ((((lite_targetCtx).valKind) === ("Unit"))))) || ((((lite_targetCtx).valKind) === ("Never"))))) ? "" : (lite_targetCtx).valKind));
                                void lite_retExpected;
                                const lite_rhs = liteFn$frontend$parseBinaryCtx(lite_target, lite_source, lite_retValStart, lite_prefix, [...(lite_blockLocals)], [...(lite_functions)], [...(lite_params)], lite_currentName, lite_retExpected, 0n, [...(lite_ctxs)], lite_bodyDepth, lite_inferMode, "");
                                void lite_rhs;
                                if (lite_inferMode) {
                                    lite_blockMarkers = liteFn$frontend$collectParsedMarkers(lite_blockMarkers, lite_rhs);
                                }
                                const lite_stmtNext = liteFn$frontend$consumeStatementEnd(lite_source, (lite_rhs).next, lite_prefix);
                                void lite_stmtNext;
                                if (((lite_stmtNext) < (0n))) {
                                    liteFn$frontend$failAt(lite_source, liteFn$frontend$skipTrivia(lite_source, (lite_rhs).next, lite_prefix), lite_prefix, "expected ; after return");
                                }
                                if ((!(lite_isInferTarget))) {
                                    if ((((lite_targetCtx).valKind) === ("Unit"))) {
                                        if ((((((lite_rhs).kind) !== ("Unit"))) && ((((lite_rhs).kind) !== ("Never"))))) {
                                            liteFn$frontend$failAt(lite_source, lite_itemStart, lite_prefix, (((("block @") + ((lite_targetCtx).tag))) + (" returns Unit and cannot return a value")));
                                        }
                                    } else if ((((((lite_rhs).kind) !== ("Never"))) && ((!(liteFn$frontend$isCompatibleKind((lite_targetCtx).valKind, (lite_rhs).kind)))))) {
                                        liteFn$frontend$failAt(lite_source, lite_retValStart, lite_prefix, (((((((((("cannot return ") + (liteFn$frontend$displayKind((lite_rhs).kind)))) + (" from block @"))) + ((lite_targetCtx).tag))) + (" returning "))) + (liteFn$frontend$displayKind((lite_targetCtx).valKind))));
                                    }
                                }
                                if (((((lite_inferMode) && ((((lite_rhs).kind) !== ("Never"))))) && (((liteFn$frontend$loopValMarkerId((lite_rhs).kind)) < (0n))))) {
                                    lite_blockMarkers = ((((((((lite_blockMarkers) + (liteFn$lib$core$int$intText((lite_targetCtx).id)))) + ("="))) + ((lite_rhs).kind))) + ("\n"));
                                }
                                if ((!(lite_blockExits))) {
                                    if ((((lite_rhs).kind) === ("Never"))) {
                                        lite_statements.push(((((((lite_stmtReturnPrefix) + ("("))) + ((lite_rhs).code))) + (");")));
                                    } else {
                                        const lite_retValCode = (Boolean(lite_isInferTarget) ? (lite_rhs).code : (Boolean((((lite_targetCtx).valKind) === ("Unit"))) ? liteFn$frontend$targetUnitEvaluationCode(lite_target, (lite_rhs).code) : liteFn$frontend$assignValueCode(lite_target, (lite_targetCtx).valKind, (lite_rhs).kind, (lite_rhs).code)));
                                        void lite_retValCode;
                                        if ((((lite_targetCtx).iifeDepth) === (lite_bodyDepth))) {
                                            if ((((lite_targetCtx).valKind) === ("Unit"))) {
                                                lite_statements.push((((((((("void (") + (lite_retValCode))) + ("); break "))) + ((lite_targetCtx).label))) + (";")));
                                            } else {
                                                lite_statements.push((((((((((((lite_targetCtx).valVar) + (" = "))) + (lite_retValCode))) + ("; break "))) + ((lite_targetCtx).label))) + (";")));
                                            }
                                        } else {
                                            if (((lite_target) !== ("ts"))) {
                                                liteFn$frontend$failAt(lite_source, lite_itemStart, lite_prefix, "C backend does not support non-local return yet");
                                            }
                                            lite_statements.push(((((((((((lite_stmtReturnPrefix) + ("lite$throwTransfer("))) + (liteFn$lib$core$int$intText((lite_targetCtx).id)))) + (", "))) + (lite_retValCode))) + (");")));
                                        }
                                    }
                                    lite_blockExits = true;
                                }
                                lite_statementCount = lite$addInt(lite_statementCount, 1n, 195108);
                                lite_blockConstant = false;
                                lite_cursor = lite_stmtNext;
                            }
                        } else {
                            const lite_fnIdx = liteFn$frontend$findCtxByKindIndex([...(lite_ctxs)], "fn");
                            void lite_fnIdx;
                            if (((lite_fnIdx) < (0n))) {
                                if (liteFn$frontend$hasFinallyAbove([...(lite_ctxs)], (-1n))) {
                                    liteFn$frontend$failAt(lite_source, lite_itemStart, lite_prefix, "cannot return out of finally block");
                                }
                                liteFn$frontend$failAt(lite_source, lite_itemStart, lite_prefix, "return outside a function");
                            }
                            if (liteFn$frontend$hasFinallyAbove([...(lite_ctxs)], lite_fnIdx)) {
                                liteFn$frontend$failAt(lite_source, lite_itemStart, lite_prefix, "cannot return out of finally block");
                            }
                            const lite_fnCtx = lite$listAt((lite_ctxs), lite_fnIdx, 195905);
                            void lite_fnCtx;
                            const lite_fnResult = (lite_fnCtx).valKind;
                            void lite_fnResult;
                            if (((((((lite_retValStart) >= (lite_blockSourceSize))) || (((liteFn$lib$core$text$at(lite_source, lite_retValStart)) === (";"))))) || (((liteFn$lib$core$text$at(lite_source, lite_retValStart)) === ("}"))))) {
                                if (((lite_fnResult) !== ("Unit"))) {
                                    liteFn$frontend$failAt(lite_source, lite_itemStart, lite_prefix, (((((("function ") + (lite_currentName))) + (" must return "))) + (lite_fnResult)));
                                }
                                const lite_stmtNext = liteFn$frontend$consumeStatementEnd(lite_source, lite_retValStart, lite_prefix);
                                void lite_stmtNext;
                                if (((lite_stmtNext) < (0n))) {
                                    liteFn$frontend$failAt(lite_source, lite_retValStart, lite_prefix, "expected ; after return");
                                }
                                if ((!(lite_blockExits))) {
                                    if ((((lite_fnCtx).iifeDepth) === (lite_bodyDepth))) {
                                        lite_statements.push("return;");
                                    } else {
                                        if (((lite_target) !== ("ts"))) {
                                            liteFn$frontend$failAt(lite_source, lite_itemStart, lite_prefix, "C backend does not support non-local return yet");
                                        }
                                        lite_statements.push(((lite_stmtReturnPrefix) + ("lite$throwTransfer(0, undefined);")));
                                    }
                                    lite_blockExits = true;
                                }
                                lite_statementCount = lite$addInt(lite_statementCount, 1n, 197198);
                                lite_blockConstant = false;
                                lite_cursor = lite_stmtNext;
                            } else {
                                if (((lite_fnResult) === ("Unit"))) {
                                    liteFn$frontend$failAt(lite_source, lite_itemStart, lite_prefix, (((("function ") + (lite_currentName))) + (" returns Unit and cannot return a value")));
                                }
                                const lite_rhs = liteFn$frontend$parseBinaryCtx(lite_target, lite_source, lite_retValStart, lite_prefix, [...(lite_blockLocals)], [...(lite_functions)], [...(lite_params)], lite_currentName, lite_fnResult, 0n, [...(lite_ctxs)], lite_bodyDepth, lite_inferMode, "");
                                void lite_rhs;
                                if (lite_inferMode) {
                                    lite_blockMarkers = liteFn$frontend$collectParsedMarkers(lite_blockMarkers, lite_rhs);
                                }
                                if ((!(liteFn$frontend$isCompatibleKind(lite_fnResult, (lite_rhs).kind)))) {
                                    liteFn$frontend$failAt(lite_source, lite_retValStart, lite_prefix, (((((((((("cannot return ") + (liteFn$frontend$displayKind((lite_rhs).kind)))) + (" from function "))) + (lite_currentName))) + (" returning "))) + (liteFn$frontend$displayKind(lite_fnResult))));
                                }
                                const lite_stmtNext = liteFn$frontend$consumeStatementEnd(lite_source, (lite_rhs).next, lite_prefix);
                                void lite_stmtNext;
                                if (((lite_stmtNext) < (0n))) {
                                    liteFn$frontend$failAt(lite_source, liteFn$frontend$skipTrivia(lite_source, (lite_rhs).next, lite_prefix), lite_prefix, "expected ; after return");
                                }
                                if ((!(lite_blockExits))) {
                                    const lite_retValCode = liteFn$frontend$assignValueCode(lite_target, lite_fnResult, (lite_rhs).kind, (lite_rhs).code);
                                    void lite_retValCode;
                                    if ((((lite_rhs).kind) === ("Never"))) {
                                        lite_statements.push(((((((lite_stmtReturnPrefix) + ("("))) + (lite_retValCode))) + (");")));
                                    } else if ((((lite_fnCtx).iifeDepth) === (lite_bodyDepth))) {
                                        lite_statements.push((((("return ") + (lite_retValCode))) + (";")));
                                    } else {
                                        if (((lite_target) !== ("ts"))) {
                                            liteFn$frontend$failAt(lite_source, lite_itemStart, lite_prefix, "C backend does not support non-local return yet");
                                        }
                                        lite_statements.push(((((((lite_stmtReturnPrefix) + ("lite$throwTransfer(0, "))) + (lite_retValCode))) + (");")));
                                    }
                                    lite_blockExits = true;
                                }
                                lite_statementCount = lite$addInt(lite_statementCount, 1n, 199361);
                                lite_blockConstant = false;
                                lite_cursor = lite_stmtNext;
                            }
                        }
                    } else if (((((lite_itemName) === ("break"))) || (((lite_itemName) === ("continue"))))) {
                        lite_isStatement = true;
                        let lite_targetLoopIdx = (-1n);
                        void lite_targetLoopIdx;
                        let lite_afterExit = lite_afterItemName;
                        void lite_afterExit;
                        if (((((lite_afterItemName) < (lite_blockSourceSize))) && (((liteFn$lib$core$text$at(lite_source, lite_afterItemName)) === ("@"))))) {
                            const lite_exitTag = liteFn$frontend$parseTagAt(lite_source, lite_afterItemName, lite_prefix);
                            void lite_exitTag;
                            const lite_afterDotCheck = liteFn$frontend$skipTrivia(lite_source, (lite_exitTag).next, lite_prefix);
                            void lite_afterDotCheck;
                            if (((((lite_afterDotCheck) < (lite_blockSourceSize))) && (((liteFn$lib$core$text$at(lite_source, lite_afterDotCheck)) === ("."))))) {
                                liteFn$frontend$failAt(lite_source, lite_afterDotCheck, lite_prefix, ((((((lite_itemName) + (" @"))) + ((lite_exitTag).tag))) + (" followed by . is ambiguous; wrap the payload in parentheses")));
                            }
                            const lite_foundIdx = liteFn$frontend$findTaggedCtxIndex([...(lite_ctxs)], (lite_exitTag).tag);
                            void lite_foundIdx;
                            if (((lite_foundIdx) < (0n))) {
                                liteFn$frontend$failAt(lite_source, lite_afterItemName, lite_prefix, (("unknown block tag @") + ((lite_exitTag).tag)));
                            }
                            if ((((lite$listAt((lite_ctxs), lite_foundIdx, 200560)).kind) !== ("loop"))) {
                                liteFn$frontend$failAt(lite_source, lite_afterItemName, lite_prefix, ((((((lite_itemName) + (" @"))) + ((lite_exitTag).tag))) + (" requires an enclosing loop")));
                            }
                            if ((((lite$listAt((lite_ctxs), lite_foundIdx, 200776)).phase) === ("then"))) {
                                liteFn$frontend$failAt(lite_source, lite_itemStart, lite_prefix, (((((((("cannot ") + (lite_itemName))) + (" @"))) + ((lite_exitTag).tag))) + (" from inside its own then block")));
                            }
                            lite_targetLoopIdx = lite_foundIdx;
                            lite_afterExit = lite_afterDotCheck;
                        } else {
                            lite_targetLoopIdx = liteFn$frontend$findActiveLoopCtxIndex([...(lite_ctxs)]);
                            if (((lite_targetLoopIdx) < (0n))) {
                                if (liteFn$frontend$hasFinallyAbove([...(lite_ctxs)], (-1n))) {
                                    liteFn$frontend$failAt(lite_source, lite_itemStart, lite_prefix, (((("cannot ") + (lite_itemName))) + (" out of finally block")));
                                }
                                liteFn$frontend$failAt(lite_source, lite_itemStart, lite_prefix, ((lite_itemName) + (" outside loop")));
                            }
                        }
                        if (liteFn$frontend$hasFinallyAbove([...(lite_ctxs)], lite_targetLoopIdx)) {
                            liteFn$frontend$failAt(lite_source, lite_itemStart, lite_prefix, (((("cannot ") + (lite_itemName))) + (" out of finally block")));
                        }
                        const lite_loopCtx = lite$listAt((lite_ctxs), lite_targetLoopIdx, 201789);
                        void lite_loopCtx;
                        if ((((lite_loopCtx).phase) === ("header"))) {
                            liteFn$frontend$failAt(lite_source, lite_itemStart, lite_prefix, (((("cannot ") + (lite_itemName))) + (" from loop header")));
                        }
                        const lite_hasPayload = ((((((lite_afterExit) < (lite_blockSourceSize))) && (((liteFn$lib$core$text$at(lite_source, lite_afterExit)) !== (";"))))) && (((liteFn$lib$core$text$at(lite_source, lite_afterExit)) !== ("}"))));
                        void lite_hasPayload;
                        let lite_exitNext = lite_afterExit;
                        void lite_exitNext;
                        if ((!(lite_hasPayload))) {
                            const lite_stmtNext = liteFn$frontend$consumeStatementEnd(lite_source, lite_afterExit, lite_prefix);
                            void lite_stmtNext;
                            if (((lite_stmtNext) < (0n))) {
                                liteFn$frontend$failAt(lite_source, lite_afterExit, lite_prefix, (("expected ; after ") + (lite_itemName)));
                            }
                            lite_exitNext = lite_stmtNext;
                            if (((((lite_inferMode) && (((lite_itemName) === ("break"))))) && ((!(lite_blockExits))))) {
                                lite_blockMarkers = ((((lite_blockMarkers) + (liteFn$lib$core$int$intText((lite_loopCtx).id)))) + ("=@break\n"));
                            }
                            if ((!(lite_blockExits))) {
                                if ((((lite_loopCtx).iifeDepth) === (lite_bodyDepth))) {
                                    if ((((((lite_loopCtx).label) !== (""))) && (((lite_targetLoopIdx) < (liteFn$frontend$findActiveLoopCtxIndex([...(lite_ctxs)])))))) {
                                        lite_statements.push(((((((lite_itemName) + (" "))) + ((lite_loopCtx).label))) + (";")));
                                    } else {
                                        lite_statements.push(((lite_itemName) + (";")));
                                    }
                                } else {
                                    if (((lite_target) !== ("ts"))) {
                                        liteFn$frontend$failAt(lite_source, lite_itemStart, lite_prefix, (((("C backend does not support non-local ") + (lite_itemName))) + (" yet")));
                                    }
                                    const lite_transferId = (Boolean((((lite_loopCtx).valVar) !== (""))) ? (Boolean(((lite_itemName) === ("break"))) ? lite$addInt(1000000n, (lite_loopCtx).id, 203478) : lite$subtractInt((0n - 1000000n), (lite_loopCtx).id, 203512)) : (Boolean(((lite_itemName) === ("break"))) ? (lite_loopCtx).id : lite$subtractInt(0n, (lite_loopCtx).id, 203651)));
                                    void lite_transferId;
                                    lite_statements.push(((((((lite_stmtReturnPrefix) + ("lite$throwTransfer("))) + (liteFn$lib$core$int$intText(lite_transferId)))) + (", undefined);")));
                                }
                                lite_blockExits = true;
                            }
                        } else {
                            if (((lite_target) !== ("ts"))) {
                                liteFn$frontend$failAt(lite_source, lite_itemStart, lite_prefix, (((("C backend does not support ") + (lite_itemName))) + (" payloads yet")));
                            }
                            const lite_isInferLoop = (((((lite_loopCtx).valKind) === ("__infer__"))) || (liteFn$lib$core$text$startsWithAt((lite_loopCtx).valKind, 0n, "__infer__:")));
                            void lite_isInferLoop;
                            const lite_payExpected = (Boolean(liteFn$lib$core$text$startsWithAt((lite_loopCtx).valKind, 0n, "__infer__:")) ? liteFn$lib$core$text$slice((lite_loopCtx).valKind, 10n, liteFn$lib$core$text$length((lite_loopCtx).valKind)) : (Boolean((((((((lite_loopCtx).valKind) === ("__infer__"))) || ((((lite_loopCtx).valKind) === ("Unit"))))) || ((((lite_loopCtx).valKind) === ("Never"))))) ? "" : (lite_loopCtx).valKind));
                            void lite_payExpected;
                            const lite_rhs = liteFn$frontend$parseBinaryCtx(lite_target, lite_source, lite_afterExit, lite_prefix, [...(lite_blockLocals)], [...(lite_functions)], [...(lite_params)], lite_currentName, lite_payExpected, 0n, [...(lite_ctxs)], lite_bodyDepth, lite_inferMode, "");
                            void lite_rhs;
                            if (lite_inferMode) {
                                lite_blockMarkers = liteFn$frontend$collectParsedMarkers(lite_blockMarkers, lite_rhs);
                            }
                            const lite_stmtNext = liteFn$frontend$consumeStatementEnd(lite_source, (lite_rhs).next, lite_prefix);
                            void lite_stmtNext;
                            if (((lite_stmtNext) < (0n))) {
                                liteFn$frontend$failAt(lite_source, liteFn$frontend$skipTrivia(lite_source, (lite_rhs).next, lite_prefix), lite_prefix, (("expected ; after ") + (lite_itemName)));
                            }
                            lite_exitNext = lite_stmtNext;
                            if ((!(lite_isInferLoop))) {
                                if ((((lite_loopCtx).valKind) === ("Unit"))) {
                                    if ((((((lite_rhs).kind) !== ("Unit"))) && ((((lite_rhs).kind) !== ("Never"))))) {
                                        liteFn$frontend$failAt(lite_source, lite_afterExit, lite_prefix, (((("cannot commit ") + (liteFn$frontend$displayKind((lite_rhs).kind)))) + (" to Unit loop .value")));
                                    }
                                } else if ((((((lite_rhs).kind) !== ("Never"))) && ((!(liteFn$frontend$isCompatibleKind((lite_loopCtx).valKind, (lite_rhs).kind)))))) {
                                    liteFn$frontend$failAt(lite_source, lite_afterExit, lite_prefix, (((((("cannot commit ") + (liteFn$frontend$displayKind((lite_rhs).kind)))) + (" to loop .value of kind "))) + (liteFn$frontend$displayKind((lite_loopCtx).valKind))));
                                }
                            }
                            if (((((lite_inferMode) && ((((lite_rhs).kind) !== ("Never"))))) && (((liteFn$frontend$loopValMarkerId((lite_rhs).kind)) < (0n))))) {
                                lite_blockMarkers = ((((((((lite_blockMarkers) + (liteFn$lib$core$int$intText((lite_loopCtx).id)))) + ("="))) + ((lite_rhs).kind))) + ("\n"));
                            }
                            if ((!(lite_blockExits))) {
                                if ((((lite_rhs).kind) === ("Never"))) {
                                    lite_statements.push(((((((lite_stmtReturnPrefix) + ("("))) + ((lite_rhs).code))) + (");")));
                                } else {
                                    const lite_payCode = (Boolean(lite_isInferLoop) ? (lite_rhs).code : (Boolean((((lite_loopCtx).valKind) === ("Unit"))) ? liteFn$frontend$targetUnitEvaluationCode(lite_target, (lite_rhs).code) : liteFn$frontend$assignValueCode(lite_target, (lite_loopCtx).valKind, (lite_rhs).kind, (lite_rhs).code)));
                                    void lite_payCode;
                                    if ((((lite_loopCtx).iifeDepth) === (lite_bodyDepth))) {
                                        const lite_jumpStmt = (Boolean((((((lite_loopCtx).label) !== (""))) && (((lite_targetLoopIdx) < (liteFn$frontend$findActiveLoopCtxIndex([...(lite_ctxs)])))))) ? ((((((lite_itemName) + (" "))) + ((lite_loopCtx).label))) + (";")) : ((lite_itemName) + (";")));
                                        void lite_jumpStmt;
                                        if ((((lite_loopCtx).valKind) === ("Unit"))) {
                                            lite_statements.push((((((("void (") + (lite_payCode))) + ("); "))) + (lite_jumpStmt)));
                                        } else {
                                            lite_statements.push((((((((((lite_loopCtx).valVar) + (" = "))) + (lite_payCode))) + ("; "))) + (lite_jumpStmt)));
                                        }
                                    } else {
                                        const lite_payTransferId = (Boolean(((lite_itemName) === ("break"))) ? (lite_loopCtx).id : lite$subtractInt(0n, (lite_loopCtx).id, 207685));
                                        void lite_payTransferId;
                                        lite_statements.push(((((((((((lite_stmtReturnPrefix) + ("lite$throwTransfer("))) + (liteFn$lib$core$int$intText(lite_payTransferId)))) + (", "))) + (lite_payCode))) + (");")));
                                    }
                                }
                                lite_blockExits = true;
                            }
                        }
                        lite_statementCount = lite$addInt(lite_statementCount, 1n, 208081);
                        lite_blockConstant = false;
                        lite_cursor = lite_exitNext;
                    } else if (((lite_itemName) === ("else"))) {
                        liteFn$frontend$failAt(lite_source, lite_itemStart, lite_prefix, "unexpected else");
                    } else if (((lite_itemName) === ("if"))) {
                        const lite_rawStmtIfEnd = liteFn$frontend$scanRawIfChainEnd(lite_source, lite_itemStart, lite_prefix, true);
                        void lite_rawStmtIfEnd;
                        const lite_afterRawStmtIf = (Boolean(((lite_rawStmtIfEnd) >= (0n))) ? liteFn$frontend$skipTrivia(lite_source, lite_rawStmtIfEnd, lite_prefix) : (-1n));
                        void lite_afterRawStmtIf;
                        const lite_stmtIfHasThen = ((((lite_afterRawStmtIf) >= (0n))) && ((((liteFn$lib$core$text$wordAt(lite_source, lite_afterRawStmtIf, "then")) || (liteFn$lib$core$text$wordAt(lite_source, lite_afterRawStmtIf, "finally"))))));
                        void lite_stmtIfHasThen;
                        let lite_useValueIf = lite_stmtIfHasThen;
                        void lite_useValueIf;
                        if (((((!(lite_isStmtBody)))) && ((!(lite_useValueIf))))) {
                            const lite_valIfEnd = liteFn$frontend$scanValueIfEnd(lite_source, lite_itemStart, lite_prefix, false);
                            void lite_valIfEnd;
                            if (((lite_valIfEnd) >= (0n))) {
                                const lite_afterValIf = liteFn$frontend$skipItemSeparators(lite_source, lite_valIfEnd, lite_prefix);
                                void lite_afterValIf;
                                if (((((lite_afterValIf) < (lite_blockSourceSize))) && (((liteFn$lib$core$text$at(lite_source, lite_afterValIf)) === ("}"))))) {
                                    lite_useValueIf = true;
                                }
                            }
                        }
                        if ((!(lite_useValueIf))) {
                            lite_isStatement = true;
                            let lite_ifParts = "";
                            void lite_ifParts;
                            let lite_allBranchesExit = true;
                            void lite_allBranchesExit;
                            let lite_hasElseBranch = false;
                            void lite_hasElseBranch;
                            let lite_ifCursor = lite_afterItemName;
                            void lite_ifCursor;
                            let lite_isFirstIf = true;
                            void lite_isFirstIf;
                            const lite_ifBarrierCtxs: { id: bigint; tag: string; kind: string; phase: string; iifeDepth: bigint; valKind: string; valVar: string; label: string; iterLabel: string; countVar: string; itemVar: string; itemKind: string; indexVar: string; hasIndex: boolean }[] = [...(liteFn$frontend$appendCtx([...(lite_ctxs)], { id: 0n, tag: "", kind: "if", phase: "body", iifeDepth: lite_bodyDepth, valKind: "Unit", valVar: "", label: "", iterLabel: "", countVar: "", itemVar: "", itemKind: "", indexVar: "", hasIndex: false }))];
                            void lite_ifBarrierCtxs;
                            while (Boolean(true)) {
                                liteFn$frontend$rejectHeaderBlockTag(lite_source, lite_ifCursor, lite_prefix, (Boolean(lite_isFirstIf) ? "if" : "else if"));
                                const lite_condParsed = liteFn$frontend$parseBinaryCtx(lite_target, lite_source, lite_ifCursor, lite_prefix, [...(lite_blockLocals)], [...(lite_functions)], [...(lite_params)], lite_currentName, "", 0n, [...(lite_ifBarrierCtxs)], lite_bodyDepth, lite_inferMode, "");
                                void lite_condParsed;
                                if (lite_inferMode) {
                                    lite_blockMarkers = liteFn$frontend$collectParsedMarkers(lite_blockMarkers, lite_condParsed);
                                }
                                if ((((lite_condParsed).kind) !== ("Bool"))) {
                                    liteFn$frontend$failAt(lite_source, lite_ifCursor, lite_prefix, (Boolean(lite_isFirstIf) ? "if condition must be Bool" : "else if condition must be Bool"));
                                }
                                const lite_condCode = (Boolean((lite_condParsed).constant) ? (((("Boolean(") + (liteFn$frontend$targetBoolLiteralCode(lite_target, (((lite_condParsed).intValue) !== (0n)))))) + (")")) : (lite_condParsed).code);
                                void lite_condCode;
                                const lite_beforeOpen = liteFn$frontend$skipTrivia(lite_source, (lite_condParsed).next, lite_prefix);
                                void lite_beforeOpen;
                                liteFn$frontend$rejectMisplacedTag(lite_source, lite_beforeOpen, lite_prefix, (Boolean(lite_isFirstIf) ? "block tag cannot appear before { in if" : "block tag cannot appear before { in else if"));
                                const lite_openPos = liteFn$frontend$expectSymbol(lite_source, lite_beforeOpen, "{", lite_prefix);
                                void lite_openPos;
                                const lite_branch = liteFn$frontend$parseBinaryCtx(lite_target, lite_source, lite$subtractInt(lite_openPos, 1n, 211323), lite_prefix, [...(lite_blockLocals)], [...(lite_functions)], [...(lite_params)], lite_currentName, "", 0n, [...(lite_ifBarrierCtxs)], lite_bodyDepth, lite_inferMode, "stmt");
                                void lite_branch;
                                if (lite_inferMode) {
                                    lite_blockMarkers = liteFn$frontend$collectParsedMarkers(lite_blockMarkers, lite_branch);
                                }
                                if ((((lite_branch).kind) !== ("Never"))) {
                                    lite_allBranchesExit = false;
                                }
                                const lite_prefixKw = (Boolean(lite_isFirstIf) ? "if (" : " else if (");
                                void lite_prefixKw;
                                lite_ifParts = ((((((((((lite_ifParts) + (lite_prefixKw))) + (lite_condCode))) + (") { "))) + ((lite_branch).code))) + (" }"));
                                lite_ifCursor = (lite_branch).next;
                                lite_isFirstIf = false;
                                const lite_afterBranch = liteFn$frontend$skipTrivia(lite_source, lite_ifCursor, lite_prefix);
                                void lite_afterBranch;
                                if (((((lite_afterBranch) < (lite_blockSourceSize))) && (liteFn$lib$core$text$wordAt(lite_source, lite_afterBranch, "else")))) {
                                    const lite_afterElse = liteFn$frontend$skipTrivia(lite_source, lite$addInt(lite_afterBranch, 4n, 212175), lite_prefix);
                                    void lite_afterElse;
                                    liteFn$frontend$rejectMisplacedTag(lite_source, lite_afterElse, lite_prefix, "block tag cannot appear after else");
                                    if (((((lite_afterElse) < (lite_blockSourceSize))) && (liteFn$lib$core$text$wordAt(lite_source, lite_afterElse, "if")))) {
                                        lite_ifCursor = liteFn$frontend$skipTrivia(lite_source, lite$addInt(lite_afterElse, 2n, 212491), lite_prefix);
                                    } else {
                                        lite_hasElseBranch = true;
                                        const lite_elseOpen = liteFn$frontend$expectSymbol(lite_source, lite_afterElse, "{", lite_prefix);
                                        void lite_elseOpen;
                                        const lite_elseBranch = liteFn$frontend$parseBinaryCtx(lite_target, lite_source, lite$subtractInt(lite_elseOpen, 1n, 212778), lite_prefix, [...(lite_blockLocals)], [...(lite_functions)], [...(lite_params)], lite_currentName, "", 0n, [...(lite_ifBarrierCtxs)], lite_bodyDepth, lite_inferMode, "stmt");
                                        void lite_elseBranch;
                                        if (lite_inferMode) {
                                            lite_blockMarkers = liteFn$frontend$collectParsedMarkers(lite_blockMarkers, lite_elseBranch);
                                        }
                                        if ((((lite_elseBranch).kind) !== ("Never"))) {
                                            lite_allBranchesExit = false;
                                        }
                                        lite_ifParts = ((((((lite_ifParts) + (" else { "))) + ((lite_elseBranch).code))) + (" }"));
                                        lite_ifCursor = (lite_elseBranch).next;
                                        break;
                                    }
                                } else {
                                    break;
                                }
                            }
                            if ((!(lite_blockExits))) {
                                lite_statements.push(lite_ifParts);
                                if (((lite_hasElseBranch) && (lite_allBranchesExit))) {
                                    lite_blockExits = true;
                                }
                                lite_statementCount = lite$addInt(lite_statementCount, 1n, 213730);
                            }
                            if ((((!(lite_hasElseBranch))) && (lite_allBranchesExit))) {
                                lite_lastPartialIfDiverges = true;
                            }
                            lite_blockConstant = false;
                            const lite_stmtNext = liteFn$frontend$consumeStatementEnd(lite_source, lite_ifCursor, lite_prefix);
                            void lite_stmtNext;
                            lite_cursor = (Boolean(((lite_stmtNext) >= (0n))) ? lite_stmtNext : lite_ifCursor);
                        }
                    } else if (((lite_itemName) === ("match"))) {
                        liteFn$frontend$rejectMisplacedTag(lite_source, lite_afterItemName, lite_prefix, "block tag cannot appear before { in match");
                        if (((((lite_afterItemName) >= (lite_blockSourceSize))) || (((liteFn$lib$core$text$at(lite_source, lite_afterItemName)) !== ("{"))))) {
                            liteFn$frontend$unsupportedFeature(lite_source, lite_itemStart, "match", lite_prefix);
                        }
                        const lite_rawStmtMatchEnd = liteFn$frontend$scanRawMatchEnd(lite_source, lite_itemStart, lite_prefix);
                        void lite_rawStmtMatchEnd;
                        const lite_afterRawStmtMatch = (Boolean(((lite_rawStmtMatchEnd) >= (0n))) ? liteFn$frontend$skipTrivia(lite_source, lite_rawStmtMatchEnd, lite_prefix) : (-1n));
                        void lite_afterRawStmtMatch;
                        const lite_stmtMatchHasThen = ((((lite_afterRawStmtMatch) >= (0n))) && ((((liteFn$lib$core$text$wordAt(lite_source, lite_afterRawStmtMatch, "then")) || (liteFn$lib$core$text$wordAt(lite_source, lite_afterRawStmtMatch, "finally"))))));
                        void lite_stmtMatchHasThen;
                        let lite_useValueMatch = lite_stmtMatchHasThen;
                        void lite_useValueMatch;
                        if (((((((!(lite_isStmtBody)))) && (((lite_target) === ("ts"))))) && ((!(lite_useValueMatch))))) {
                            const lite_valMatchEnd = liteFn$frontend$scanValueMatchEnd(lite_source, lite_itemStart, lite_prefix, false);
                            void lite_valMatchEnd;
                            if (((lite_valMatchEnd) >= (0n))) {
                                const lite_afterValMatch = liteFn$frontend$skipItemSeparators(lite_source, lite_valMatchEnd, lite_prefix);
                                void lite_afterValMatch;
                                if (((((lite_afterValMatch) < (lite_blockSourceSize))) && (((liteFn$lib$core$text$at(lite_source, lite_afterValMatch)) === ("}"))))) {
                                    lite_useValueMatch = true;
                                }
                            }
                        }
                        if ((!(lite_useValueMatch))) {
                            lite_isStatement = true;
                            let lite_matchCursor = liteFn$frontend$skipItemSeparators(lite_source, lite$addInt(lite_afterItemName, 1n, 215687), lite_prefix);
                            void lite_matchCursor;
                            let lite_matchParts = "";
                            void lite_matchParts;
                            let lite_sawFallback = false;
                            void lite_sawFallback;
                            let lite_armCount = 0n;
                            void lite_armCount;
                            let lite_allArmsExit = true;
                            void lite_allArmsExit;
                            const lite_matchBarrierCtxs: { id: bigint; tag: string; kind: string; phase: string; iifeDepth: bigint; valKind: string; valVar: string; label: string; iterLabel: string; countVar: string; itemVar: string; itemKind: string; indexVar: string; hasIndex: boolean }[] = [...(liteFn$frontend$appendCtx([...(lite_ctxs)], { id: 0n, tag: "", kind: "match", phase: "body", iifeDepth: lite_bodyDepth, valKind: "Unit", valVar: "", label: "", iterLabel: "", countVar: "", itemVar: "", itemKind: "", indexVar: "", hasIndex: false }))];
                            void lite_matchBarrierCtxs;
                            while (Boolean(true)) {
                                lite_matchCursor = liteFn$frontend$skipItemSeparators(lite_source, lite_matchCursor, lite_prefix);
                                if (((lite_matchCursor) >= (lite_blockSourceSize))) {
                                    liteFn$frontend$failAt(lite_source, lite_afterItemName, lite_prefix, "expected } to close match");
                                }
                                if (((liteFn$lib$core$text$at(lite_source, lite_matchCursor)) === ("}"))) {
                                    if ((!(lite_sawFallback))) {
                                        liteFn$frontend$failAt(lite_source, lite_matchCursor, lite_prefix, "subjectless match requires a final _ fallback arm");
                                    }
                                    lite_matchCursor = lite$addInt(lite_matchCursor, 1n, 216881);
                                    break;
                                }
                                if (lite_sawFallback) {
                                    liteFn$frontend$failAt(lite_source, lite_matchCursor, lite_prefix, "match fallback _ must be the final arm");
                                }
                                const lite_afterUnder = liteFn$frontend$skipTrivia(lite_source, lite$addInt(lite_matchCursor, 1n, 217214), lite_prefix);
                                void lite_afterUnder;
                                if (liteFn$lib$core$text$wordAt(lite_source, lite_matchCursor, "_")) {
                                    liteFn$frontend$rejectMisplacedTag(lite_source, lite_afterUnder, lite_prefix, "block tag cannot appear after _ in match arm");
                                }
                                const lite_isFallback = ((((liteFn$lib$core$text$wordAt(lite_source, lite_matchCursor, "_")) && (((lite_afterUnder) < (lite_blockSourceSize))))) && (((liteFn$lib$core$text$at(lite_source, lite_afterUnder)) === ("{"))));
                                void lite_isFallback;
                                if (lite_isFallback) {
                                    lite_sawFallback = true;
                                    const lite_arm = liteFn$frontend$parseBinaryCtx(lite_target, lite_source, lite_afterUnder, lite_prefix, [...(lite_blockLocals)], [...(lite_functions)], [...(lite_params)], lite_currentName, "", 0n, [...(lite_matchBarrierCtxs)], lite_bodyDepth, lite_inferMode, "stmt");
                                    void lite_arm;
                                    if (lite_inferMode) {
                                        lite_blockMarkers = liteFn$frontend$collectParsedMarkers(lite_blockMarkers, lite_arm);
                                    }
                                    if ((((lite_arm).kind) !== ("Never"))) {
                                        lite_allArmsExit = false;
                                    }
                                    if (((lite_armCount) === (0n))) {
                                        lite_matchParts = (((("{ ") + ((lite_arm).code))) + (" }"));
                                    } else {
                                        lite_matchParts = ((((((lite_matchParts) + (" else { "))) + ((lite_arm).code))) + (" }"));
                                    }
                                    lite_armCount = lite$addInt(lite_armCount, 1n, 218457);
                                    lite_matchCursor = (lite_arm).next;
                                } else {
                                    const lite_armOpen = liteFn$frontend$scanConditionOpen(lite_source, lite_matchCursor, lite_prefix);
                                    void lite_armOpen;
                                    if (((lite_armOpen) < (0n))) {
                                        liteFn$frontend$failAt(lite_source, lite_matchCursor, lite_prefix, "expected { after match arm condition");
                                    }
                                    if (((lite_armOpen) === (lite_matchCursor))) {
                                        liteFn$frontend$failAt(lite_source, lite_matchCursor, lite_prefix, "match arm header requires grouping for { ... } expressions");
                                    }
                                    liteFn$frontend$rejectHeaderBlockTag(lite_source, lite_matchCursor, lite_prefix, "match arm");
                                    const lite_condParsed = liteFn$frontend$parseBinaryCtx(lite_target, lite_source, lite_matchCursor, lite_prefix, [...(lite_blockLocals)], [...(lite_functions)], [...(lite_params)], lite_currentName, "", 0n, [...(lite_matchBarrierCtxs)], lite_bodyDepth, lite_inferMode, "");
                                    void lite_condParsed;
                                    if (lite_inferMode) {
                                        lite_blockMarkers = liteFn$frontend$collectParsedMarkers(lite_blockMarkers, lite_condParsed);
                                    }
                                    const lite_afterCond = liteFn$frontend$skipTrivia(lite_source, (lite_condParsed).next, lite_prefix);
                                    void lite_afterCond;
                                    liteFn$frontend$rejectMisplacedTag(lite_source, lite_afterCond, lite_prefix, "block tag cannot appear before { in match arm");
                                    if (((lite_afterCond) > (lite_armOpen))) {
                                        liteFn$frontend$failAt(lite_source, lite_armOpen, lite_prefix, "ungrouped { in match arm header starts the arm body; parenthesize block or conditional expressions");
                                    }
                                    if (((lite_afterCond) !== (lite_armOpen))) {
                                        const lite__ = liteFn$frontend$expectSymbol(lite_source, lite_afterCond, "{", lite_prefix);
                                        void lite__;
                                    }
                                    if ((((lite_condParsed).kind) !== ("Bool"))) {
                                        liteFn$frontend$failAt(lite_source, lite_matchCursor, lite_prefix, "match arm condition must be Bool");
                                    }
                                    const lite_condCode = (Boolean((lite_condParsed).constant) ? (((("Boolean(") + (liteFn$frontend$targetBoolLiteralCode(lite_target, (((lite_condParsed).intValue) !== (0n)))))) + (")")) : (lite_condParsed).code);
                                    void lite_condCode;
                                    const lite_arm = liteFn$frontend$parseBinaryCtx(lite_target, lite_source, lite_armOpen, lite_prefix, [...(lite_blockLocals)], [...(lite_functions)], [...(lite_params)], lite_currentName, "", 0n, [...(lite_matchBarrierCtxs)], lite_bodyDepth, lite_inferMode, "stmt");
                                    void lite_arm;
                                    if (lite_inferMode) {
                                        lite_blockMarkers = liteFn$frontend$collectParsedMarkers(lite_blockMarkers, lite_arm);
                                    }
                                    if ((((lite_arm).kind) !== ("Never"))) {
                                        lite_allArmsExit = false;
                                    }
                                    const lite_armKw = (Boolean(((lite_armCount) === (0n))) ? "if (" : " else if (");
                                    void lite_armKw;
                                    lite_matchParts = ((((((((((lite_matchParts) + (lite_armKw))) + (lite_condCode))) + (") { "))) + ((lite_arm).code))) + (" }"));
                                    lite_armCount = lite$addInt(lite_armCount, 1n, 221251);
                                    lite_matchCursor = (lite_arm).next;
                                }
                            }
                            if ((!(lite_blockExits))) {
                                lite_statements.push(lite_matchParts);
                                if (lite_allArmsExit) {
                                    lite_blockExits = true;
                                }
                                lite_statementCount = lite$addInt(lite_statementCount, 1n, 221612);
                            }
                            lite_blockConstant = false;
                            const lite_stmtNext = liteFn$frontend$consumeStatementEnd(lite_source, lite_matchCursor, lite_prefix);
                            void lite_stmtNext;
                            lite_cursor = (Boolean(((lite_stmtNext) >= (0n))) ? lite_stmtNext : lite_matchCursor);
                        }
                    } else if (((lite_itemName) === ("loop"))) {
                        const lite_rawLoopStmtEnd = liteFn$frontend$scanRawLoopEnd(lite_source, lite_itemStart, lite_prefix);
                        void lite_rawLoopStmtEnd;
                        let lite_atLoopTail = false;
                        void lite_atLoopTail;
                        if (((((!(lite_isStmtBody)))) && (((lite_rawLoopStmtEnd) >= (0n))))) {
                            const lite_afterRawLoopStmt = liteFn$frontend$skipItemSeparators(lite_source, lite_rawLoopStmtEnd, lite_prefix);
                            void lite_afterRawLoopStmt;
                            lite_atLoopTail = ((((lite_afterRawLoopStmt) < (lite_blockSourceSize))) && (((liteFn$lib$core$text$at(lite_source, lite_afterRawLoopStmt)) === ("}"))));
                        }
                        const lite_useExprLoop = ((liteFn$frontend$loopNeedsExprLowering(lite_source, lite_itemStart, lite_prefix)) || ((((((lite_target) === ("ts"))) && (lite_atLoopTail)))));
                        void lite_useExprLoop;
                        if ((!(lite_useExprLoop))) {
                            lite_isStatement = true;
                            liteFn$frontend$rejectHeaderBlockTag(lite_source, lite_afterItemName, lite_prefix, "loop");
                            let lite_loopHeaderPos = lite_afterItemName;
                            void lite_loopHeaderPos;
                            let lite_loopCondCode = "";
                            void lite_loopCondCode;
                            let lite_loopSeqCode = "";
                            void lite_loopSeqCode;
                            let lite_loopItemName = "";
                            void lite_loopItemName;
                            let lite_loopItemKind = "";
                            void lite_loopItemKind;
                            if (((((lite_loopHeaderPos) < (lite_blockSourceSize))) && (((liteFn$lib$core$text$at(lite_source, lite_loopHeaderPos)) !== ("{"))))) {
                                const lite_hdrParsed = liteFn$frontend$parseBinaryCtx(lite_target, lite_source, lite_loopHeaderPos, lite_prefix, [...(lite_blockLocals)], [...(lite_functions)], [...(lite_params)], lite_currentName, "", 0n, [...(lite_ctxs)], lite_bodyDepth, lite_inferMode, "");
                                void lite_hdrParsed;
                                if (lite_inferMode) {
                                    lite_blockMarkers = liteFn$frontend$collectParsedMarkers(lite_blockMarkers, lite_hdrParsed);
                                }
                                const lite_afterHdr = liteFn$frontend$skipTrivia(lite_source, (lite_hdrParsed).next, lite_prefix);
                                void lite_afterHdr;
                                if (liteFn$lib$core$text$wordAt(lite_source, lite_afterHdr, "as")) {
                                    if ((((!(liteFn$frontend$isListKind((lite_hdrParsed).kind)))) && ((!(liteFn$frontend$isArrayKind((lite_hdrParsed).kind)))))) {
                                        liteFn$frontend$failAt(lite_source, lite_loopHeaderPos, lite_prefix, (("loop sequence must be a List or Array, got ") + (liteFn$frontend$displayKind((lite_hdrParsed).kind))));
                                    }
                                    const lite_asNameStart = liteFn$frontend$skipTrivia(lite_source, lite$addInt(lite_afterHdr, 2n, 223751), lite_prefix);
                                    void lite_asNameStart;
                                    if (((((lite_asNameStart) >= (lite_blockSourceSize))) || ((!(liteFn$lib$core$text$isNameStart(liteFn$lib$core$text$at(lite_source, lite_asNameStart))))))) {
                                        liteFn$frontend$failAt(lite_source, lite_asNameStart, lite_prefix, "expected an item name after as");
                                    }
                                    const lite_asNameEnd = liteFn$lib$core$text$skipName(lite_source, lite_asNameStart);
                                    void lite_asNameEnd;
                                    lite_loopItemName = liteFn$lib$core$text$slice(lite_source, lite_asNameStart, lite_asNameEnd);
                                    if (liteFn$frontend$isReservedWord(lite_loopItemName)) {
                                        liteFn$frontend$unsupportedFeature(lite_source, lite_asNameStart, lite_loopItemName, lite_prefix);
                                    }
                                    lite_loopItemKind = (Boolean(liteFn$frontend$isListKind((lite_hdrParsed).kind)) ? liteFn$frontend$listElementKind((lite_hdrParsed).kind) : liteFn$frontend$arrayElementKind((lite_hdrParsed).kind));
                                    lite_loopSeqCode = (lite_hdrParsed).code;
                                    lite_loopHeaderPos = liteFn$frontend$skipTrivia(lite_source, lite_asNameEnd, lite_prefix);
                                    liteFn$frontend$rejectMisplacedTag(lite_source, lite_loopHeaderPos, lite_prefix, "block tag cannot appear before { in loop");
                                } else if (((liteFn$frontend$isListKind((lite_hdrParsed).kind)) || (liteFn$frontend$isArrayKind((lite_hdrParsed).kind)))) {
                                    lite_loopItemKind = (Boolean(liteFn$frontend$isListKind((lite_hdrParsed).kind)) ? liteFn$frontend$listElementKind((lite_hdrParsed).kind) : liteFn$frontend$arrayElementKind((lite_hdrParsed).kind));
                                    lite_loopSeqCode = (lite_hdrParsed).code;
                                    lite_loopHeaderPos = lite_afterHdr;
                                    liteFn$frontend$rejectMisplacedTag(lite_source, lite_loopHeaderPos, lite_prefix, "block tag cannot appear before { in loop");
                                } else {
                                    if ((((lite_hdrParsed).kind) !== ("Bool"))) {
                                        liteFn$frontend$failAt(lite_source, lite_loopHeaderPos, lite_prefix, "loop condition must be Bool");
                                    }
                                    if ((lite_hdrParsed).constant) {
                                        if ((((lite_hdrParsed).intValue) === (0n))) {
                                            lite_loopCondCode = "false";
                                        }
                                    } else {
                                        lite_loopCondCode = (lite_hdrParsed).code;
                                    }
                                    lite_loopHeaderPos = lite_afterHdr;
                                    liteFn$frontend$rejectMisplacedTag(lite_source, lite_loopHeaderPos, lite_prefix, "block tag cannot appear before { in loop");
                                }
                            }
                            const lite_loopOpen = liteFn$frontend$expectSymbol(lite_source, lite_loopHeaderPos, "{", lite_prefix);
                            void lite_loopOpen;
                            const lite_loopId = liteFn$frontend$nextCtxId([...(lite_ctxs)]);
                            void lite_loopId;
                            const lite_loopLabel = (("lite$l") + (liteFn$lib$core$int$intText(lite_loopId)));
                            void lite_loopLabel;
                            const lite_loopLocals: { name: string; runtime: string; kind: string; mutable: boolean; writable: boolean; depth: bigint; constant: boolean; code: string; intValue: bigint; textValue: string; initState: string }[] = [...([])];
                            void lite_loopLocals;
                            for (const lite_entry of [...(lite_blockLocals)]) {
                                void lite_entry;
                                lite_loopLocals.push(lite_entry);
                            }
                            let lite_loopHeadCode = "";
                            void lite_loopHeadCode;
                            if (((lite_loopItemName) !== (""))) {
                                const lite_loopItemRuntime = liteFn$frontend$localRuntimeName(lite_target, [...(lite_loopLocals)], lite_loopItemName, "", 1n);
                                void lite_loopItemRuntime;
                                lite_loopLocals.push({ name: lite_loopItemName, runtime: lite_loopItemRuntime, kind: lite_loopItemKind, mutable: false, writable: false, depth: 1n, constant: false, code: lite_loopItemRuntime, intValue: 0n, textValue: "", initState: "init" });
                                lite_loopHeadCode = (((((((((((("for (const ") + (lite_loopItemRuntime))) + (" of "))) + (liteFn$frontend$targetListCopyCode(lite_target, lite_loopSeqCode)))) + (") { void "))) + (lite_loopItemRuntime))) + ("; "));
                            } else if (((lite_loopSeqCode) !== (""))) {
                                const lite_tempItemRuntime = liteFn$frontend$freshScopeTemp([...(lite_loopLocals)], "lite$item");
                                void lite_tempItemRuntime;
                                lite_loopLocals.push({ name: "$item", runtime: lite_tempItemRuntime, kind: "Unit", mutable: false, writable: false, depth: 1n, constant: false, code: "", intValue: 0n, textValue: "", initState: "init" });
                                lite_loopHeadCode = (((((((((((("for (const ") + (lite_tempItemRuntime))) + (" of "))) + (liteFn$frontend$targetListCopyCode(lite_target, lite_loopSeqCode)))) + (") { void "))) + (lite_tempItemRuntime))) + ("; "));
                            } else {
                                const lite_condText = (Boolean(((lite_loopCondCode) === (""))) ? "Boolean(true)" : (Boolean(((lite_loopCondCode) === ("false"))) ? "Boolean(false)" : lite_loopCondCode));
                                void lite_condText;
                                lite_loopHeadCode = (((("while (") + (lite_condText))) + (") { "));
                            }
                            const lite_loopCtx = { id: lite_loopId, tag: "", kind: "loop", phase: "body", iifeDepth: lite_bodyDepth, valKind: "", valVar: "", label: lite_loopLabel, iterLabel: "", countVar: "", itemVar: "", itemKind: "", indexVar: "", hasIndex: false };
                            void lite_loopCtx;
                            const lite_loopBody = liteFn$frontend$parseBinaryCtx(lite_target, lite_source, lite$subtractInt(lite_loopOpen, 1n, 228183), lite_prefix, [...(lite_loopLocals)], [...(lite_functions)], [...(lite_params)], lite_currentName, "", 0n, [...(liteFn$frontend$appendCtx([...(lite_ctxs)], lite_loopCtx))], lite_bodyDepth, lite_inferMode, "stmt");
                            void lite_loopBody;
                            if (lite_inferMode) {
                                lite_blockMarkers = liteFn$frontend$collectParsedMarkers(lite_blockMarkers, lite_loopBody);
                            }
                            const lite_hasCrossBreak = liteFn$frontend$codeUsesTextCall((lite_loopBody).code, (((("lite$throwTransfer(") + (liteFn$lib$core$int$intText(lite_loopId)))) + (",")));
                            void lite_hasCrossBreak;
                            const lite_hasCrossCont = liteFn$frontend$codeUsesTextCall((lite_loopBody).code, (((("lite$throwTransfer(") + (liteFn$lib$core$int$intText(lite$subtractInt(0n, lite_loopId, 228661))))) + (",")));
                            void lite_hasCrossCont;
                            const lite_needsLoopLabel = ((liteFn$frontend$codeUsesTextCall((lite_loopBody).code, (((("break ") + (lite_loopLabel))) + (";")))) || (liteFn$frontend$codeUsesTextCall((lite_loopBody).code, (((("continue ") + (lite_loopLabel))) + (";")))));
                            void lite_needsLoopLabel;
                            const lite_wrappedLoopBody = (Boolean(((lite_hasCrossBreak) || (lite_hasCrossCont))) ? (((((((((((("try { ") + ((lite_loopBody).code))) + (" } catch (lite$err) { if (lite$hasTransfer(lite$err, "))) + (liteFn$lib$core$int$intText(lite_loopId)))) + (")) { break; } if (lite$hasTransfer(lite$err, "))) + (liteFn$lib$core$int$intText(lite$subtractInt(0n, lite_loopId, 229121))))) + (")) { continue; } throw lite$err; }")) : (lite_loopBody).code);
                            void lite_wrappedLoopBody;
                            const lite_loopLabelPrefix = (Boolean(lite_needsLoopLabel) ? ((lite_loopLabel) + (": ")) : "");
                            void lite_loopLabelPrefix;
                            if ((!(lite_blockExits))) {
                                lite_statements.push(((((((lite_loopLabelPrefix) + (lite_loopHeadCode))) + (lite_wrappedLoopBody))) + (" }")));
                                lite_statementCount = lite$addInt(lite_statementCount, 1n, 229562);
                            }
                            lite_blockConstant = false;
                            const lite_stmtNext = liteFn$frontend$consumeStatementEnd(lite_source, (lite_loopBody).next, lite_prefix);
                            void lite_stmtNext;
                            lite_cursor = (Boolean(((lite_stmtNext) >= (0n))) ? lite_stmtNext : (lite_loopBody).next);
                        }
                    } else if (((lite_itemName) === ("var"))) {
                        lite_isStatement = true;
                        let lite_localStart = liteFn$frontend$skipTrivia(lite_source, lite_itemEnd, lite_prefix);
                        void lite_localStart;
                        let lite_declWritable = false;
                        void lite_declWritable;
                        if (liteFn$lib$core$text$wordAt(lite_source, lite_localStart, "mut")) {
                            lite_declWritable = true;
                            lite_localStart = liteFn$frontend$skipTrivia(lite_source, lite$addInt(lite_localStart, 3n, 230208), lite_prefix);
                        }
                        if (((((lite_localStart) >= (liteFn$lib$core$text$length(lite_source)))) || ((!(liteFn$lib$core$text$isNameStart(liteFn$lib$core$text$at(lite_source, lite_localStart))))))) {
                            liteFn$frontend$failAt(lite_source, lite_localStart, lite_prefix, "expected local name after var");
                        }
                        const lite_localEnd = liteFn$lib$core$text$skipName(lite_source, lite_localStart);
                        void lite_localEnd;
                        const lite_localName = liteFn$lib$core$text$slice(lite_source, lite_localStart, lite_localEnd);
                        void lite_localName;
                        if (liteFn$frontend$isReservedWord(lite_localName)) {
                            liteFn$frontend$unsupportedFeature(lite_source, lite_localStart, lite_localName, lite_prefix);
                        }
                        let lite_afterLocal = liteFn$frontend$skipTrivia(lite_source, lite_localEnd, lite_prefix);
                        void lite_afterLocal;
                        let lite_declParsed = liteFn$frontend$intParsed("", 0n, true, lite_afterLocal);
                        void lite_declParsed;
                        let lite_declInitState = "init";
                        void lite_declInitState;
                        let lite_varDiverged = false;
                        void lite_varDiverged;
                        if (liteFn$lib$core$text$startsWithAt(lite_source, lite_afterLocal, ":=")) {
                            lite_declParsed = liteFn$frontend$parseBinaryCtx(lite_target, lite_source, liteFn$frontend$skipTrivia(lite_source, lite$addInt(lite_afterLocal, 2n, 231145), lite_prefix), lite_prefix, [...(lite_blockLocals)], [...(lite_functions)], [...(lite_params)], lite_currentName, "", 0n, [...(lite_ctxs)], lite_bodyDepth, lite_inferMode, "");
                            if (lite_inferMode) {
                                lite_blockMarkers = liteFn$frontend$collectParsedMarkers(lite_blockMarkers, lite_declParsed);
                            }
                            liteFn$frontend$rejectNonValueBinding(lite_source, lite_localStart, lite_prefix, (lite_declParsed).kind, lite_localName);
                            if (((lite_declWritable) && ((!(liteFn$frontend$isListKind((lite_declParsed).kind)))))) {
                                liteFn$frontend$failAt(lite_source, lite_localStart, lite_prefix, (("mut requires a List value, got ") + (liteFn$frontend$displayKind((lite_declParsed).kind))));
                            }
                        } else if (((((lite_afterLocal) < (liteFn$lib$core$text$length(lite_source)))) && (((liteFn$lib$core$text$at(lite_source, lite_afterLocal)) === (":"))))) {
                            if (lite_declWritable) {
                                liteFn$frontend$failAt(lite_source, lite_localStart, lite_prefix, "var mut cannot be combined with explicit type annotation");
                            }
                            const lite_emptyAliases: { name: string; target: string; at: bigint; end: bigint }[] = [...([])];
                            void lite_emptyAliases;
                            const lite_typed = liteFn$frontend$parseLocalType(lite_source, lite$addInt(lite_afterLocal, 1n, 232070), lite_prefix, [...(lite_emptyAliases)]);
                            void lite_typed;
                            lite_declWritable = (lite_typed).writable;
                            const lite_afterType = liteFn$frontend$skipTrivia(lite_source, (lite_typed).next, lite_prefix);
                            void lite_afterType;
                            if (liteFn$frontend$isSingleEquals(lite_source, lite_afterType)) {
                                const lite_rhsStart = liteFn$frontend$skipTrivia(lite_source, lite$addInt(lite_afterType, 1n, 232362), lite_prefix);
                                void lite_rhsStart;
                                const lite_reservedEnd = liteFn$frontend$isReservedInitMarker(lite_source, lite_rhsStart, lite_prefix);
                                void lite_reservedEnd;
                                const lite_zeroEnd = liteFn$frontend$isZeroInitLiteral(lite_source, lite_rhsStart, lite_prefix);
                                void lite_zeroEnd;
                                if (((lite_reservedEnd) >= (0n))) {
                                    if (liteFn$frontend$isListKind((lite_typed).kind)) {
                                        liteFn$frontend$failAt(lite_source, lite_localStart, lite_prefix, "reserved storage is not supported for List");
                                    }
                                    lite_declInitState = "uninit";
                                    lite_declParsed = liteFn$frontend$zeroParsed(lite_target, (lite_typed).kind, lite_reservedEnd);
                                } else if (((((lite_zeroEnd) >= (0n))) && ((!(liteFn$numeric__literals$isNumericKind((lite_typed).kind)))))) {
                                    lite_declParsed = liteFn$frontend$zeroParsed(lite_target, (lite_typed).kind, lite_zeroEnd);
                                } else {
                                    const lite_initParsed = liteFn$frontend$parseBinaryCtx(lite_target, lite_source, lite_rhsStart, lite_prefix, [...(lite_blockLocals)], [...(lite_functions)], [...(lite_params)], lite_currentName, (lite_typed).kind, 0n, [...(lite_ctxs)], lite_bodyDepth, lite_inferMode, "");
                                    void lite_initParsed;
                                    if (lite_inferMode) {
                                        lite_blockMarkers = liteFn$frontend$collectParsedMarkers(lite_blockMarkers, lite_initParsed);
                                    }
                                    if ((!(liteFn$frontend$isCompatibleKind((lite_typed).kind, (lite_initParsed).kind)))) {
                                        liteFn$frontend$failAt(lite_source, lite_localStart, lite_prefix, (((((("cannot initialize ") + (liteFn$frontend$displayKind((lite_typed).kind)))) + (" with "))) + (liteFn$frontend$displayKind((lite_initParsed).kind))));
                                    }
                                    lite_varDiverged = (((lite_initParsed).kind) === ("Never"));
                                    const lite_converted = liteFn$frontend$assignValueCode(lite_target, (lite_typed).kind, (lite_initParsed).kind, (lite_initParsed).code);
                                    void lite_converted;
                                    lite_declParsed = { kind: (lite_typed).kind, code: lite_converted, intValue: (lite_initParsed).intValue, textValue: (lite_initParsed).textValue, constant: (lite_initParsed).constant, next: (lite_initParsed).next };
                                }
                            } else {
                                lite_declParsed = liteFn$frontend$zeroParsed(lite_target, (lite_typed).kind, lite_afterType);
                            }
                        } else {
                            liteFn$frontend$failAt(lite_source, lite_afterLocal, lite_prefix, (("expected := or : after local name ") + (lite_localName)));
                        }
                        const lite_statementNext = liteFn$frontend$consumeStatementEnd(lite_source, (lite_declParsed).next, lite_prefix);
                        void lite_statementNext;
                        if (((lite_statementNext) < (0n))) {
                            liteFn$frontend$failAt(lite_source, liteFn$frontend$skipTrivia(lite_source, (lite_declParsed).next, lite_prefix), lite_prefix, (("expected ; after local declaration ") + (lite_localName)));
                        }
                        const lite_runtime = liteFn$frontend$localRuntimeName(lite_target, [...(lite_blockLocals)], lite_localName, "", 1n);
                        void lite_runtime;
                        lite_blockLocals.push({ name: lite_localName, runtime: lite_runtime, kind: (lite_declParsed).kind, mutable: true, writable: lite_declWritable, depth: 1n, constant: false, code: (lite_declParsed).code, intValue: (lite_declParsed).intValue, textValue: (lite_declParsed).textValue, initState: lite_declInitState });
                        if ((!(lite_blockExits))) {
                            if (lite_varDiverged) {
                                lite_statements.push(((((((lite_stmtReturnPrefix) + ("("))) + ((lite_declParsed).code))) + (");")));
                                lite_blockExits = true;
                            } else {
                                lite_statements.push((((((((((((("let ") + (lite_runtime))) + (" = "))) + (liteFn$frontend$assignValueCode(lite_target, (lite_declParsed).kind, (lite_declParsed).kind, (lite_declParsed).code)))) + ("; void "))) + (lite_runtime))) + (";")));
                            }
                            lite_statementCount = lite$addInt(lite_statementCount, 1n, 235658);
                        }
                        lite_blockConstant = false;
                        lite_cursor = lite_statementNext;
                    } else if (((lite_itemName) === ("mut"))) {
                        lite_isStatement = true;
                        const lite_localStart = liteFn$frontend$skipTrivia(lite_source, lite_itemEnd, lite_prefix);
                        void lite_localStart;
                        if (((((lite_localStart) >= (liteFn$lib$core$text$length(lite_source)))) || ((!(liteFn$lib$core$text$isNameStart(liteFn$lib$core$text$at(lite_source, lite_localStart))))))) {
                            liteFn$frontend$failAt(lite_source, lite_localStart, lite_prefix, "expected local name after mut");
                        }
                        const lite_localEnd = liteFn$lib$core$text$skipName(lite_source, lite_localStart);
                        void lite_localEnd;
                        const lite_localName = liteFn$lib$core$text$slice(lite_source, lite_localStart, lite_localEnd);
                        void lite_localName;
                        if (liteFn$frontend$isReservedWord(lite_localName)) {
                            liteFn$frontend$unsupportedFeature(lite_source, lite_localStart, lite_localName, lite_prefix);
                        }
                        const lite_afterLocal = liteFn$frontend$skipTrivia(lite_source, lite_localEnd, lite_prefix);
                        void lite_afterLocal;
                        if ((!(liteFn$lib$core$text$startsWithAt(lite_source, lite_afterLocal, ":=")))) {
                            liteFn$frontend$failAt(lite_source, lite_afterLocal, lite_prefix, (("expected := after mut local name ") + (lite_localName)));
                        }
                        const lite_declParsed = liteFn$frontend$parseBinaryCtx(lite_target, lite_source, liteFn$frontend$skipTrivia(lite_source, lite$addInt(lite_afterLocal, 2n, 236789), lite_prefix), lite_prefix, [...(lite_blockLocals)], [...(lite_functions)], [...(lite_params)], lite_currentName, "", 0n, [...(lite_ctxs)], lite_bodyDepth, lite_inferMode, "");
                        void lite_declParsed;
                        if (lite_inferMode) {
                            lite_blockMarkers = liteFn$frontend$collectParsedMarkers(lite_blockMarkers, lite_declParsed);
                        }
                        if ((!(liteFn$frontend$isListKind((lite_declParsed).kind)))) {
                            liteFn$frontend$failAt(lite_source, lite_localStart, lite_prefix, (("mut requires a List value, got ") + (liteFn$frontend$displayKind((lite_declParsed).kind))));
                        }
                        const lite_statementNext = liteFn$frontend$consumeStatementEnd(lite_source, (lite_declParsed).next, lite_prefix);
                        void lite_statementNext;
                        if (((lite_statementNext) < (0n))) {
                            liteFn$frontend$failAt(lite_source, liteFn$frontend$skipTrivia(lite_source, (lite_declParsed).next, lite_prefix), lite_prefix, (("expected ; after local declaration ") + (lite_localName)));
                        }
                        const lite_runtime = liteFn$frontend$localRuntimeName(lite_target, [...(lite_blockLocals)], lite_localName, "", 1n);
                        void lite_runtime;
                        lite_blockLocals.push({ name: lite_localName, runtime: lite_runtime, kind: (lite_declParsed).kind, mutable: false, writable: true, depth: 1n, constant: false, code: (lite_declParsed).code, intValue: (lite_declParsed).intValue, textValue: (lite_declParsed).textValue, initState: "init" });
                        if ((!(lite_blockExits))) {
                            lite_statements.push((((((((((((("const ") + (lite_runtime))) + (" = "))) + (liteFn$frontend$copiedValueCode(lite_target, (lite_declParsed).kind, (lite_declParsed).code)))) + ("; void "))) + (lite_runtime))) + (";")));
                            lite_statementCount = lite$addInt(lite_statementCount, 1n, 238154);
                        }
                        lite_blockConstant = false;
                        lite_cursor = lite_statementNext;
                    } else if (((((((liteFn$lib$core$text$startsWithAt(lite_source, lite_afterItemName, ":=")) && ((!(liteFn$lib$core$text$wordAt(lite_source, liteFn$frontend$skipTrivia(lite_source, lite$addInt(lite_afterItemName, 2n, 238428), lite_prefix), "fn")))))) && ((!(liteFn$lib$core$text$wordAt(lite_source, liteFn$frontend$skipTrivia(lite_source, lite$addInt(lite_afterItemName, 2n, 238532), lite_prefix), "type")))))) && ((!(liteFn$lib$core$text$wordAt(lite_source, liteFn$frontend$skipTrivia(lite_source, lite$addInt(lite_afterItemName, 2n, 238638), lite_prefix), "import")))))) {
                        lite_isStatement = true;
                        if (liteFn$frontend$isReservedWord(lite_itemName)) {
                            liteFn$frontend$unsupportedFeature(lite_source, lite_itemStart, lite_itemName, lite_prefix);
                        }
                        const lite_declParsed = liteFn$frontend$parseBinaryCtx(lite_target, lite_source, liteFn$frontend$skipTrivia(lite_source, lite$addInt(lite_afterItemName, 2n, 238901), lite_prefix), lite_prefix, [...(lite_blockLocals)], [...(lite_functions)], [...(lite_params)], lite_currentName, "", 0n, [...(lite_ctxs)], lite_bodyDepth, lite_inferMode, "");
                        void lite_declParsed;
                        if (lite_inferMode) {
                            lite_blockMarkers = liteFn$frontend$collectParsedMarkers(lite_blockMarkers, lite_declParsed);
                        }
                        liteFn$frontend$rejectNonValueBinding(lite_source, lite_itemStart, lite_prefix, (lite_declParsed).kind, lite_itemName);
                        const lite_statementNext = liteFn$frontend$consumeStatementEnd(lite_source, (lite_declParsed).next, lite_prefix);
                        void lite_statementNext;
                        if (((lite_statementNext) < (0n))) {
                            liteFn$frontend$failAt(lite_source, liteFn$frontend$skipTrivia(lite_source, (lite_declParsed).next, lite_prefix), lite_prefix, (("expected ; after local declaration ") + (lite_itemName)));
                        }
                        const lite_runtime = liteFn$frontend$localRuntimeName(lite_target, [...(lite_blockLocals)], lite_itemName, "", 1n);
                        void lite_runtime;
                        lite_blockLocals.push({ name: lite_itemName, runtime: lite_runtime, kind: (lite_declParsed).kind, mutable: false, writable: false, depth: 1n, constant: (lite_declParsed).constant, code: (lite_declParsed).code, intValue: (lite_declParsed).intValue, textValue: (lite_declParsed).textValue, initState: "init" });
                        if ((!(lite_blockExits))) {
                            lite_statements.push((((((((((((("const ") + (lite_runtime))) + (" = "))) + (liteFn$frontend$copiedValueCode(lite_target, (lite_declParsed).kind, (lite_declParsed).code)))) + ("; void "))) + (lite_runtime))) + (";")));
                            lite_statementCount = lite$addInt(lite_statementCount, 1n, 240170);
                        }
                        lite_blockConstant = false;
                        lite_cursor = lite_statementNext;
                    } else if (((((((lite_afterItemName) < (liteFn$lib$core$text$length(lite_source)))) && (((liteFn$lib$core$text$at(lite_source, lite_afterItemName)) === (":"))))) && ((((liteFn$frontend$compoundAssignOp(lite_source, lite_afterItemName)).width) === (0n))))) {
                        lite_isStatement = true;
                        if (liteFn$frontend$isReservedWord(lite_itemName)) {
                            liteFn$frontend$unsupportedFeature(lite_source, lite_itemStart, lite_itemName, lite_prefix);
                        }
                        const lite_emptyAliases: { name: string; target: string; at: bigint; end: bigint }[] = [...([])];
                        void lite_emptyAliases;
                        const lite_typed = liteFn$frontend$parseLocalType(lite_source, lite$addInt(lite_afterItemName, 1n, 240722), lite_prefix, [...(lite_emptyAliases)]);
                        void lite_typed;
                        const lite_afterType = liteFn$frontend$skipTrivia(lite_source, (lite_typed).next, lite_prefix);
                        void lite_afterType;
                        let lite_declParsed = liteFn$frontend$zeroParsed(lite_target, (lite_typed).kind, lite_afterType);
                        void lite_declParsed;
                        let lite_declInitState = "init";
                        void lite_declInitState;
                        if (liteFn$frontend$isSingleEquals(lite_source, lite_afterType)) {
                            const lite_rhsStart = liteFn$frontend$skipTrivia(lite_source, lite$addInt(lite_afterType, 1n, 241077), lite_prefix);
                            void lite_rhsStart;
                            const lite_reservedEnd = liteFn$frontend$isReservedInitMarker(lite_source, lite_rhsStart, lite_prefix);
                            void lite_reservedEnd;
                            const lite_zeroEnd = liteFn$frontend$isZeroInitLiteral(lite_source, lite_rhsStart, lite_prefix);
                            void lite_zeroEnd;
                            if (((lite_reservedEnd) >= (0n))) {
                                if (liteFn$frontend$isListKind((lite_typed).kind)) {
                                    liteFn$frontend$failAt(lite_source, lite_itemStart, lite_prefix, "reserved storage is not supported for List");
                                }
                                lite_declInitState = "uninit";
                                lite_declParsed = liteFn$frontend$zeroParsed(lite_target, (lite_typed).kind, lite_reservedEnd);
                            } else if (((((lite_zeroEnd) >= (0n))) && ((!(liteFn$numeric__literals$isNumericKind((lite_typed).kind)))))) {
                                lite_declParsed = liteFn$frontend$zeroParsed(lite_target, (lite_typed).kind, lite_zeroEnd);
                            } else {
                                lite_declParsed = liteFn$frontend$parseBinaryCtx(lite_target, lite_source, lite_rhsStart, lite_prefix, [...(lite_blockLocals)], [...(lite_functions)], [...(lite_params)], lite_currentName, (lite_typed).kind, 0n, [...(lite_ctxs)], lite_bodyDepth, lite_inferMode, "");
                                if (lite_inferMode) {
                                    lite_blockMarkers = liteFn$frontend$collectParsedMarkers(lite_blockMarkers, lite_declParsed);
                                }
                                if ((!(liteFn$frontend$isCompatibleKind((lite_typed).kind, (lite_declParsed).kind)))) {
                                    liteFn$frontend$failAt(lite_source, lite_itemStart, lite_prefix, (((((("cannot initialize ") + (liteFn$frontend$displayKind((lite_typed).kind)))) + (" with "))) + (liteFn$frontend$displayKind((lite_declParsed).kind))));
                                }
                            }
                        }
                        const lite_statementNext = liteFn$frontend$consumeStatementEnd(lite_source, (lite_declParsed).next, lite_prefix);
                        void lite_statementNext;
                        if (((lite_statementNext) < (0n))) {
                            liteFn$frontend$failAt(lite_source, liteFn$frontend$skipTrivia(lite_source, (lite_declParsed).next, lite_prefix), lite_prefix, (("expected ; after local declaration ") + (lite_itemName)));
                        }
                        const lite_runtime = liteFn$frontend$localRuntimeName(lite_target, [...(lite_blockLocals)], lite_itemName, "", 1n);
                        void lite_runtime;
                        const lite_declCode = liteFn$frontend$assignValueCode(lite_target, (lite_typed).kind, (lite_declParsed).kind, (lite_declParsed).code);
                        void lite_declCode;
                        lite_blockLocals.push({ name: lite_itemName, runtime: lite_runtime, kind: (lite_typed).kind, mutable: false, writable: (lite_typed).writable, depth: 1n, constant: (Boolean(((((lite_declInitState) === ("init"))) && ((!(liteFn$numeric__literals$isFloatKind((lite_typed).kind)))))) ? (lite_declParsed).constant : false), code: lite_declCode, intValue: (lite_declParsed).intValue, textValue: (lite_declParsed).textValue, initState: lite_declInitState });
                        if ((!(lite_blockExits))) {
                            if ((((lite_declParsed).kind) === ("Never"))) {
                                lite_statements.push(((((((lite_stmtReturnPrefix) + ("("))) + (lite_declCode))) + (");")));
                                lite_blockExits = true;
                            } else {
                                const lite_declKw = (Boolean(((lite_declInitState) === ("init"))) ? "const " : "let ");
                                void lite_declKw;
                                lite_statements.push(((((((((((((lite_declKw) + (lite_runtime))) + (" = "))) + (lite_declCode))) + ("; void "))) + (lite_runtime))) + (";")));
                            }
                            lite_statementCount = lite$addInt(lite_statementCount, 1n, 243860);
                        }
                        lite_blockConstant = false;
                        lite_cursor = lite_statementNext;
                    } else if (liteFn$frontend$isSingleEquals(lite_source, lite_afterItemName)) {
                        lite_isStatement = true;
                        const lite_index = liteFn$frontend$localIndex([...(lite_blockLocals)], lite_itemName);
                        void lite_index;
                        if (((lite_index) < (0n))) {
                            liteFn$frontend$failAt(lite_source, lite_itemStart, lite_prefix, (("unknown value ") + (lite_itemName)));
                        }
                        const lite_entry = lite$listAt((lite_blockLocals), lite_index, 244286);
                        void lite_entry;
                        if ((((((lite_entry).initState) === ("init"))) && ((!((lite_entry).mutable))))) {
                            liteFn$frontend$failAt(lite_source, lite_itemStart, lite_prefix, (("cannot assign to immutable local ") + (lite_itemName)));
                        }
                        if ((((((lite_entry).initState) === ("maybe"))) && ((!((lite_entry).mutable))))) {
                            liteFn$frontend$failAt(lite_source, lite_itemStart, lite_prefix, (("cannot assign to possibly initialized immutable local ") + (lite_itemName)));
                        }
                        const lite_rhs = liteFn$frontend$parseBinaryCtx(lite_target, lite_source, liteFn$frontend$skipTrivia(lite_source, lite$addInt(lite_afterItemName, 1n, 244713), lite_prefix), lite_prefix, [...(lite_blockLocals)], [...(lite_functions)], [...(lite_params)], lite_currentName, (lite_entry).kind, 0n, [...(lite_ctxs)], lite_bodyDepth, lite_inferMode, "");
                        void lite_rhs;
                        if (lite_inferMode) {
                            lite_blockMarkers = liteFn$frontend$collectParsedMarkers(lite_blockMarkers, lite_rhs);
                        }
                        if ((!(liteFn$frontend$isCompatibleKind((lite_entry).kind, (lite_rhs).kind)))) {
                            liteFn$frontend$failAt(lite_source, lite_itemStart, lite_prefix, (((((((((("cannot assign ") + (liteFn$frontend$displayKind((lite_rhs).kind)))) + (" to "))) + (liteFn$frontend$displayKind((lite_entry).kind)))) + (" local "))) + (lite_itemName)));
                        }
                        const lite_statementNext = liteFn$frontend$consumeStatementEnd(lite_source, (lite_rhs).next, lite_prefix);
                        void lite_statementNext;
                        if (((lite_statementNext) < (0n))) {
                            liteFn$frontend$failAt(lite_source, liteFn$frontend$skipTrivia(lite_source, (lite_rhs).next, lite_prefix), lite_prefix, (("expected ; after assignment to ") + (lite_itemName)));
                        }
                        const lite_rhsCode = liteFn$frontend$assignValueCode(lite_target, (lite_entry).kind, (lite_rhs).kind, (lite_rhs).code);
                        void lite_rhsCode;
                        lite_blockLocals.push({ name: (lite_entry).name, runtime: (lite_entry).runtime, kind: (lite_entry).kind, mutable: (lite_entry).mutable, writable: (lite_entry).writable, depth: (lite_entry).depth, constant: false, code: lite_rhsCode, intValue: (lite_rhs).intValue, textValue: (lite_rhs).textValue, initState: "init" });
                        if ((!(lite_blockExits))) {
                            if ((((lite_rhs).kind) === ("Never"))) {
                                lite_statements.push(((((((lite_stmtReturnPrefix) + ("("))) + (lite_rhsCode))) + (");")));
                                lite_blockExits = true;
                            } else {
                                lite_statements.push((((((((lite_entry).runtime) + (" = "))) + (lite_rhsCode))) + (";")));
                            }
                            lite_statementCount = lite$addInt(lite_statementCount, 1n, 246297);
                        }
                        lite_blockConstant = false;
                        lite_cursor = lite_statementNext;
                    } else if ((((liteFn$frontend$compoundAssignOp(lite_source, lite_afterItemName)).width) > (0n))) {
                        lite_isStatement = true;
                        const lite_compound = liteFn$frontend$compoundAssignOp(lite_source, lite_afterItemName);
                        void lite_compound;
                        const lite_index = liteFn$frontend$localIndex([...(lite_blockLocals)], lite_itemName);
                        void lite_index;
                        if (((lite_index) < (0n))) {
                            liteFn$frontend$failAt(lite_source, lite_itemStart, lite_prefix, (("unknown value ") + (lite_itemName)));
                        }
                        const lite_entry = lite$listAt((lite_blockLocals), lite_index, 246808);
                        void lite_entry;
                        if ((((lite_entry).initState) !== ("init"))) {
                            liteFn$frontend$failAt(lite_source, lite_itemStart, lite_prefix, (("cannot read uninitialized local ") + (lite_itemName)));
                        }
                        if ((!((lite_entry).mutable))) {
                            liteFn$frontend$failAt(lite_source, lite_itemStart, lite_prefix, (("cannot assign to immutable local ") + (lite_itemName)));
                        }
                        const lite_rhs = liteFn$frontend$parseBinaryCtx(lite_target, lite_source, liteFn$frontend$skipTrivia(lite_source, lite$addInt(lite_afterItemName, (lite_compound).width, 247161), lite_prefix), lite_prefix, [...(lite_blockLocals)], [...(lite_functions)], [...(lite_params)], lite_currentName, (lite_entry).kind, 0n, [...(lite_ctxs)], lite_bodyDepth, lite_inferMode, "");
                        void lite_rhs;
                        if (lite_inferMode) {
                            lite_blockMarkers = liteFn$frontend$collectParsedMarkers(lite_blockMarkers, lite_rhs);
                        }
                        const lite_rhsCode = liteFn$frontend$compoundAssignCode(lite_target, lite_source, lite_afterItemName, lite_prefix, (lite_entry).kind, (lite_entry).runtime, (lite_compound).baseOp, lite_rhs);
                        void lite_rhsCode;
                        const lite_statementNext = liteFn$frontend$consumeStatementEnd(lite_source, (lite_rhs).next, lite_prefix);
                        void lite_statementNext;
                        if (((lite_statementNext) < (0n))) {
                            liteFn$frontend$failAt(lite_source, liteFn$frontend$skipTrivia(lite_source, (lite_rhs).next, lite_prefix), lite_prefix, (("expected ; after assignment to ") + (lite_itemName)));
                        }
                        lite_blockLocals.push({ name: (lite_entry).name, runtime: (lite_entry).runtime, kind: (lite_entry).kind, mutable: (lite_entry).mutable, writable: (lite_entry).writable, depth: (lite_entry).depth, constant: false, code: lite_rhsCode, intValue: 0n, textValue: "", initState: "init" });
                        if ((!(lite_blockExits))) {
                            lite_statements.push((((((((lite_entry).runtime) + (" = "))) + (lite_rhsCode))) + (";")));
                            lite_statementCount = lite$addInt(lite_statementCount, 1n, 248276);
                        }
                        lite_blockConstant = false;
                        lite_cursor = lite_statementNext;
                    }
                }
                if ((!(lite_isStatement))) {
                    let lite_itemExpected = (Boolean(lite_isStmtBody) ? "" : lite_expected);
                    void lite_itemExpected;
                    const lite_itemEnd = liteFn$frontend$scanExpressionItemEnd(lite_source, lite_cursor, lite_prefix);
                    void lite_itemEnd;
                    const lite_itemAfter = liteFn$frontend$skipItemSeparators(lite_source, lite_itemEnd, lite_prefix);
                    void lite_itemAfter;
                    const lite_itemAtClose = ((((lite_itemAfter) < (liteFn$lib$core$text$length(lite_source)))) && (((liteFn$lib$core$text$at(lite_source, lite_itemAfter)) === ("}"))));
                    void lite_itemAtClose;
                    if ((!(lite_itemAtClose))) {
                        lite_itemExpected = "";
                    } else if (((lite_isTaggedBody) && ((((((lite_expected) === ("Unit"))) || (((lite_expected) === ("Never")))))))) {
                        lite_itemExpected = "";
                    }
                    const lite_itemSink = (Boolean(((((((!(lite_isStmtBody)))) && (lite_allowOutput))) && (lite_itemAtClose))) ? "exprOut" : "");
                    void lite_itemSink;
                    const lite_itemMinimum = (Boolean(((((((lite_isStmtBody) || (((!(lite_itemAtClose)))))) || (((lite_minimum) === ((-2n)))))) || ((((lite_isLoopBody) && ((((((lite_expected) === (""))) || (((lite_expected) === ("Unit"))))))))))) ? (-2n) : 0n);
                    void lite_itemMinimum;
                    const lite_expr = liteFn$frontend$parseBinaryCtx(lite_target, lite_source, lite_cursor, lite_prefix, [...(lite_blockLocals)], [...(lite_functions)], [...(lite_params)], lite_currentName, lite_itemExpected, lite_itemMinimum, [...(lite_ctxs)], lite_bodyDepth, lite_inferMode, lite_itemSink);
                    void lite_expr;
                    if (lite_inferMode) {
                        lite_blockMarkers = liteFn$frontend$collectParsedMarkers(lite_blockMarkers, lite_expr);
                    }
                    const lite_statementNext = liteFn$frontend$consumeStatementEnd(lite_source, (lite_expr).next, lite_prefix);
                    void lite_statementNext;
                    if (((lite_statementNext) < (0n))) {
                        liteFn$frontend$failAt(lite_source, liteFn$frontend$skipTrivia(lite_source, (lite_expr).next, lite_prefix), lite_prefix, "expected ; or }");
                    }
                    const lite_afterExpr = liteFn$frontend$skipItemSeparators(lite_source, lite_statementNext, lite_prefix);
                    void lite_afterExpr;
                    if (((((((!(lite_isStmtBody)))) && (((lite_afterExpr) < (liteFn$lib$core$text$length(lite_source)))))) && (((liteFn$lib$core$text$at(lite_source, lite_afterExpr)) === ("}"))))) {
                        lite_sawTailExpr = true;
                        lite_blockKind = (lite_expr).kind;
                        lite_blockCode = (lite_expr).code;
                        lite_blockInt = (lite_expr).intValue;
                        lite_blockText = (lite_expr).textValue;
                        lite_blockConstant = (lite_expr).constant;
                        lite_cursor = lite$addInt(lite_afterExpr, 1n, 250215);
                        break;
                    }
                    if ((!(lite_blockExits))) {
                        if ((((lite_expr).kind) === ("Never"))) {
                            lite_statements.push(((((((lite_stmtReturnPrefix) + ("("))) + ((lite_expr).code))) + (");")));
                            lite_blockExits = true;
                        } else {
                            lite_statements.push((((("void (") + ((lite_expr).code))) + (");")));
                        }
                        lite_statementCount = lite$addInt(lite_statementCount, 1n, 250681);
                    }
                    lite_blockConstant = false;
                    if (((((lite_isStmtBody) && (((lite_afterExpr) < (liteFn$lib$core$text$length(lite_source)))))) && (((liteFn$lib$core$text$at(lite_source, lite_afterExpr)) === ("}"))))) {
                        lite_cursor = lite$addInt(lite_afterExpr, 1n, 250894);
                        break;
                    }
                    lite_cursor = lite_statementNext;
                }
            }
            if (lite_isStmtBody) {
                const lite_stmtCode = liteFn$lib$core$text$joinTexts([...(lite_statements)], " ");
                void lite_stmtCode;
                const lite_stmtKind = (Boolean(lite_blockExits) ? "Never" : "Unit");
                void lite_stmtKind;
                lite_left = liteFn$frontend$withMarkers({ kind: lite_stmtKind, code: lite_stmtCode, intValue: 0n, textValue: "", constant: false, next: lite_cursor }, (Boolean(lite_inferMode) ? lite_blockMarkers : ""));
            } else if (lite_isFinallyBody) {
                if ((((!(lite_blockExits))) && (lite_sawTailExpr))) {
                    if (((((lite_blockKind) !== ("Unit"))) && (((lite_blockKind) !== ("Never"))))) {
                        liteFn$frontend$failAt(lite_source, lite_start, lite_prefix, (("finally block must produce Unit, got ") + (liteFn$frontend$displayKind(lite_blockKind))));
                    }
                    if (((lite_blockKind) === ("Never"))) {
                        lite_statements.push((((("(") + (lite_blockCode))) + (");")));
                        lite_blockExits = true;
                    } else if (((lite_blockCode) !== (liteFn$frontend$targetUnitLiteralCode(lite_target)))) {
                        lite_statements.push((((("void (") + (lite_blockCode))) + (");")));
                    }
                }
                const lite_finCode = liteFn$lib$core$text$joinTexts([...(lite_statements)], " ");
                void lite_finCode;
                const lite_finKind = (Boolean(lite_blockExits) ? "Never" : "Unit");
                void lite_finKind;
                lite_left = liteFn$frontend$withMarkers({ kind: lite_finKind, code: lite_finCode, intValue: 0n, textValue: "", constant: false, next: lite_cursor }, (Boolean(lite_inferMode) ? lite_blockMarkers : ""));
            } else if (lite_isLoopBody) {
                const lite_topLoopCtx = lite$listAt((lite_ctxs), lite$subtractInt(liteFn$frontend$ctxCount([...(lite_ctxs)]), 1n, 252370), 252355);
                void lite_topLoopCtx;
                const lite_topLoopId = (lite_topLoopCtx).id;
                void lite_topLoopId;
                const lite_topLoopValKind = (lite_topLoopCtx).valKind;
                void lite_topLoopValKind;
                const lite_topLoopValVar = (lite_topLoopCtx).valVar;
                void lite_topLoopValVar;
                if (((((lite_topLoopValKind) === ("__infer__"))) || (liteFn$lib$core$text$startsWithAt(lite_topLoopValKind, 0n, "__infer__:")))) {
                    if ((!(lite_blockExits))) {
                        if (lite_sawTailExpr) {
                            if (((((lite_blockKind) !== ("Never"))) && (((liteFn$frontend$loopValMarkerId(lite_blockKind)) < (0n))))) {
                                lite_blockMarkers = ((((((((lite_blockMarkers) + (liteFn$lib$core$int$intText(lite_topLoopId)))) + ("="))) + (lite_blockKind))) + ("\n"));
                            }
                        } else if ((!(lite_lastPartialIfDiverges))) {
                            lite_blockMarkers = ((((lite_blockMarkers) + (liteFn$lib$core$int$intText(lite_topLoopId)))) + ("=Unit\n"));
                        }
                    }
                    const lite_tailPlaceholderKind = (Boolean(lite_blockExits) ? "Never" : (Boolean(lite_sawTailExpr) ? lite_blockKind : "Unit"));
                    void lite_tailPlaceholderKind;
                    lite_left = liteFn$frontend$withMarkers({ kind: lite_tailPlaceholderKind, code: "", intValue: (Boolean(lite_blockExits) ? 1n : 0n), textValue: "", constant: false, next: lite_cursor }, lite_blockMarkers);
                } else {
                    if ((!(lite_blockExits))) {
                        if (lite_sawTailExpr) {
                            if (((lite_topLoopValKind) === ("Unit"))) {
                                if (((((lite_blockKind) !== ("Unit"))) && (((lite_blockKind) !== ("Never"))))) {
                                    liteFn$frontend$failAt(lite_source, lite_start, lite_prefix, (("loop produces Unit and cannot yield ") + (liteFn$frontend$displayKind(lite_blockKind))));
                                }
                            } else if (((lite_topLoopValKind) === ("Never"))) {
                                if (((lite_blockKind) !== ("Never"))) {
                                    liteFn$frontend$failAt(lite_source, lite_start, lite_prefix, (((("cannot yield ") + (liteFn$frontend$displayKind(lite_blockKind)))) + (" from diverging loop")));
                                }
                            } else if ((!(liteFn$frontend$isCompatibleKind(lite_topLoopValKind, lite_blockKind)))) {
                                liteFn$frontend$failAt(lite_source, lite_start, lite_prefix, (((((("cannot commit ") + (liteFn$frontend$displayKind(lite_blockKind)))) + (" to loop .value of kind "))) + (liteFn$frontend$displayKind(lite_topLoopValKind))));
                            }
                            if (((lite_blockKind) === ("Never"))) {
                                lite_statements.push((((("(") + (lite_blockCode))) + (");")));
                                lite_blockExits = true;
                            } else if (((lite_topLoopValKind) === ("Unit"))) {
                                if (((lite_blockCode) !== (liteFn$frontend$targetUnitLiteralCode(lite_target)))) {
                                    lite_statements.push((((("void (") + (lite_blockCode))) + (");")));
                                }
                            } else {
                                const lite_tailLoopCode = liteFn$frontend$assignValueCode(lite_target, lite_topLoopValKind, lite_blockKind, lite_blockCode);
                                void lite_tailLoopCode;
                                lite_statements.push(((((((lite_topLoopValVar) + (" = "))) + (lite_tailLoopCode))) + (";")));
                            }
                        } else if ((((!(lite_lastPartialIfDiverges))) && (((lite_topLoopValKind) !== ("Unit"))))) {
                            liteFn$frontend$failAt(lite_source, lite_start, lite_prefix, (("loop body must produce ") + (liteFn$frontend$displayKind(lite_topLoopValKind))));
                        }
                    }
                    const lite_loopBodyJoined = liteFn$lib$core$text$joinTexts([...(lite_statements)], " ");
                    void lite_loopBodyJoined;
                    lite_left = liteFn$frontend$withMarkers({ kind: (Boolean(lite_blockExits) ? "Never" : lite_topLoopValKind), code: lite_loopBodyJoined, intValue: 0n, textValue: "", constant: false, next: lite_cursor }, (Boolean(lite_inferMode) ? liteFn$frontend$filterOtherMarkers(lite_blockMarkers, lite_topLoopId) : ""));
                }
            } else if (lite_isTaggedBody) {
                const lite_topCtx = lite$listAt((lite_ctxs), lite$subtractInt(liteFn$frontend$ctxCount([...(lite_ctxs)]), 1n, 255912), 255897);
                void lite_topCtx;
                const lite_topId = (lite_topCtx).id;
                void lite_topId;
                const lite_topTag = (lite_topCtx).tag;
                void lite_topTag;
                const lite_topValKind = (lite_topCtx).valKind;
                void lite_topValKind;
                const lite_topValVar = (lite_topCtx).valVar;
                void lite_topValVar;
                const lite_topLabel = (lite_topCtx).label;
                void lite_topLabel;
                if (((((lite_topValKind) === ("__infer__"))) || (liteFn$lib$core$text$startsWithAt(lite_topValKind, 0n, "__infer__:")))) {
                    if ((!(lite_blockExits))) {
                        if (lite_sawTailExpr) {
                            if (((lite_blockKind) !== ("Never"))) {
                                lite_blockMarkers = ((((((((lite_blockMarkers) + (liteFn$lib$core$int$intText(lite_topId)))) + ("="))) + (lite_blockKind))) + ("\n"));
                            }
                        } else {
                            lite_blockMarkers = ((((lite_blockMarkers) + (liteFn$lib$core$int$intText(lite_topId)))) + ("=Unit\n"));
                        }
                    }
                    const lite_inferredKind = liteFn$frontend$inferKindFromMarkers(lite_blockMarkers, lite_topId, lite_topTag, lite_source, lite_start, lite_prefix, lite_blockExits);
                    void lite_inferredKind;
                    const lite_outerMarkers = liteFn$frontend$filterOtherMarkers(lite_blockMarkers, lite_topId);
                    void lite_outerMarkers;
                    lite_left = liteFn$frontend$withMarkers({ kind: lite_inferredKind, code: "", intValue: (Boolean(lite_blockExits) ? 1n : 0n), textValue: "", constant: false, next: lite_cursor }, lite_outerMarkers);
                } else {
                    if ((!(lite_blockExits))) {
                        if (lite_sawTailExpr) {
                            if (((lite_topValKind) === ("Unit"))) {
                                if (((((lite_blockKind) !== ("Unit"))) && (((lite_blockKind) !== ("Never"))))) {
                                    liteFn$frontend$failAt(lite_source, lite_start, lite_prefix, (((("block @") + (lite_topTag))) + (" returns Unit and cannot return a value")));
                                }
                            } else if (((lite_topValKind) === ("Never"))) {
                                if (((lite_blockKind) !== ("Never"))) {
                                    liteFn$frontend$failAt(lite_source, lite_start, lite_prefix, (((((((("cannot return ") + (liteFn$frontend$displayKind(lite_blockKind)))) + (" from block @"))) + (lite_topTag))) + (" returning Never")));
                                }
                            } else if ((!(liteFn$frontend$isCompatibleKind(lite_topValKind, lite_blockKind)))) {
                                liteFn$frontend$failAt(lite_source, lite_start, lite_prefix, (((((((((("cannot return ") + (liteFn$frontend$displayKind(lite_blockKind)))) + (" from block @"))) + (lite_topTag))) + (" returning "))) + (liteFn$frontend$displayKind(lite_topValKind))));
                            }
                        } else if (((lite_topValKind) !== ("Unit"))) {
                            liteFn$frontend$failAt(lite_source, lite_start, lite_prefix, (((((("block @") + (lite_topTag))) + (" must return "))) + (liteFn$frontend$displayKind(lite_topValKind))));
                        }
                    }
                    if ((((!(lite_blockExits))) && (lite_sawTailExpr))) {
                        if (((lite_blockKind) === ("Never"))) {
                            lite_statements.push((((("(") + (lite_blockCode))) + (");")));
                            lite_blockExits = true;
                        } else if (((lite_topValKind) === ("Unit"))) {
                            if (((lite_blockCode) !== (liteFn$frontend$targetUnitLiteralCode(lite_target)))) {
                                lite_statements.push((((("void (") + (lite_blockCode))) + (");")));
                            }
                        } else {
                            const lite_tailCode = liteFn$frontend$assignValueCode(lite_target, lite_topValKind, lite_blockKind, lite_blockCode);
                            void lite_tailCode;
                            lite_statements.push(((((((lite_topValVar) + (" = "))) + (lite_tailCode))) + (";")));
                        }
                    }
                    const lite_bodyJoined = liteFn$lib$core$text$joinTexts([...(lite_statements)], " ");
                    void lite_bodyJoined;
                    const lite_needsLabel = liteFn$frontend$codeUsesTextCall(lite_bodyJoined, (((("break ") + (lite_topLabel))) + (";")));
                    void lite_needsLabel;
                    const lite_needsTry = liteFn$frontend$codeUsesTextCall(lite_bodyJoined, (((("lite$throwTransfer(") + (liteFn$lib$core$int$intText(lite_topId)))) + (",")));
                    void lite_needsTry;
                    const lite_labeledBody = (Boolean(lite_needsLabel) ? ((((((lite_topLabel) + (": { "))) + (lite_bodyJoined))) + (" }")) : lite_bodyJoined);
                    void lite_labeledBody;
                    const lite_wrappedBody = (Boolean(lite_needsTry) ? (() => { const lite_catchAssign = (Boolean(((((lite_topValKind) === ("Unit"))) || (((lite_topValKind) === ("Never"))))) ? "" : ((lite_topValVar) + (" = lite$transferVal;"))); void lite_catchAssign; const lite_tryInner = (Boolean(lite_needsLabel) ? lite_labeledBody : (((("{ ") + (lite_labeledBody))) + (" }"))); void lite_tryInner; return (((((((((((("try { ") + (lite_tryInner))) + (" } catch (lite$err) { if (lite$hasTransfer(lite$err, "))) + (liteFn$lib$core$int$intText(lite_topId)))) + (")) { "))) + (lite_catchAssign))) + (" } else { throw lite$err; } }")); })() : lite_labeledBody);
                    void lite_wrappedBody;
                    const lite_finalIife = (Boolean(((lite_topValKind) === ("Unit"))) ? (((((("(() => { ") + (lite_wrappedBody))) + (((Boolean(((lite_wrappedBody) !== (""))) ? " " : ""))))) + ("return undefined; })()")) : (Boolean(((lite_topValKind) === ("Never"))) ? (((("(() => { ") + (lite_wrappedBody))) + (" })()")) : (((((((((((((((((((("(() => { let ") + (lite_topValVar))) + (": "))) + (liteFn$frontend$tsFunctionType(lite_topValKind)))) + (" = "))) + ((liteFn$frontend$zeroParsed(lite_target, lite_topValKind, 0n)).code))) + ("; "))) + (lite_wrappedBody))) + (" return "))) + (lite_topValVar))) + ("; })()"))));
                    void lite_finalIife;
                    lite_left = liteFn$frontend$withMarkers({ kind: lite_topValKind, code: lite_finalIife, intValue: 0n, textValue: "", constant: false, next: lite_cursor }, (Boolean(lite_inferMode) ? liteFn$frontend$filterOtherMarkers(lite_blockMarkers, lite_topId) : ""));
                }
            } else {
                let lite_hasStandaloneFinally = false;
                void lite_hasStandaloneFinally;
                let lite_standaloneFinEnd = (-1n);
                void lite_standaloneFinEnd;
                if (lite_isStandaloneBlock) {
                    const lite_afterUntaggedClose = liteFn$frontend$skipTrivia(lite_source, lite_cursor, lite_prefix);
                    void lite_afterUntaggedClose;
                    if (((((lite_afterUntaggedClose) < (lite_blockSourceSize))) && (liteFn$lib$core$text$wordAt(lite_source, lite_afterUntaggedClose, "then")))) {
                        liteFn$frontend$failAt(lite_source, lite_afterUntaggedClose, lite_prefix, "then requires an if, match, or loop");
                    }
                    if (((((lite_afterUntaggedClose) < (lite_blockSourceSize))) && (liteFn$lib$core$text$wordAt(lite_source, lite_afterUntaggedClose, "finally")))) {
                        if (((lite_target) !== ("ts"))) {
                            liteFn$frontend$failAt(lite_source, lite_afterUntaggedClose, lite_prefix, "C backend does not support finally blocks yet");
                        }
                        lite_hasStandaloneFinally = true;
                        const lite_afterFinKw = liteFn$frontend$skipTrivia(lite_source, lite$addInt(lite_afterUntaggedClose, 7n, 261424), lite_prefix);
                        void lite_afterFinKw;
                        liteFn$frontend$rejectMisplacedTag(lite_source, lite_afterFinKw, lite_prefix, "block tag cannot appear after finally");
                        const lite_finOpen = liteFn$frontend$expectSymbol(lite_source, lite_afterFinKw, "{", lite_prefix);
                        void lite_finOpen;
                        const lite_finBarrierCtx = { id: 0n, tag: "", kind: "finally", phase: "finally", iifeDepth: lite_bodyDepth, valKind: "Unit", valVar: "", label: "", iterLabel: "", countVar: "", itemVar: "", itemKind: "", indexVar: "", hasIndex: false };
                        void lite_finBarrierCtx;
                        const lite_finParsed = liteFn$frontend$parseBinaryCtx(lite_target, lite_source, lite$subtractInt(lite_finOpen, 1n, 261988), lite_prefix, [...(lite_locals)], [...(lite_functions)], [...(lite_params)], lite_currentName, "", 0n, [...(liteFn$frontend$appendCtx([...(lite_ctxs)], lite_finBarrierCtx))], lite_bodyDepth, lite_inferMode, "finally");
                        void lite_finParsed;
                        const lite_afterFinClose = liteFn$frontend$skipTrivia(lite_source, (lite_finParsed).next, lite_prefix);
                        void lite_afterFinClose;
                        if (((((lite_afterFinClose) < (lite_blockSourceSize))) && (liteFn$lib$core$text$wordAt(lite_source, lite_afterFinClose, "then")))) {
                            liteFn$frontend$failAt(lite_source, lite_afterFinClose, lite_prefix, "then must appear before finally");
                        }
                        if (((((lite_afterFinClose) < (lite_blockSourceSize))) && (liteFn$lib$core$text$wordAt(lite_source, lite_afterFinClose, "finally")))) {
                            liteFn$frontend$failAt(lite_source, lite_afterFinClose, lite_prefix, "duplicate finally block");
                        }
                        if (lite_inferMode) {
                            lite_blockMarkers = liteFn$frontend$collectParsedMarkers(lite_blockMarkers, lite_finParsed);
                        }
                        const lite_stmtsJoined = liteFn$lib$core$text$joinTexts([...(lite_statements)], " ");
                        void lite_stmtsJoined;
                        const lite_standaloneTryBody = (Boolean(lite_blockExits) ? lite_stmtsJoined : (Boolean(((lite_blockKind) === ("Unit"))) ? (() => { const lite_unitRet = (Boolean(((lite_blockCode) === (liteFn$frontend$targetUnitLiteralCode(lite_target)))) ? "return undefined;" : (((("void (") + (lite_blockCode))) + ("); return undefined;"))); void lite_unitRet; return (Boolean(((lite_stmtsJoined) === (""))) ? lite_unitRet : ((((lite_stmtsJoined) + (" "))) + (lite_unitRet))); })() : (Boolean(((lite_blockKind) === ("Never"))) ? (Boolean(((lite_stmtsJoined) === (""))) ? (((("return ") + (lite_blockCode))) + (";")) : ((((((lite_stmtsJoined) + (" return "))) + (lite_blockCode))) + (";"))) : (() => { const lite_valRet = (((("return ") + (liteFn$frontend$copiedValueCode(lite_target, lite_blockKind, lite_blockCode)))) + (";")); void lite_valRet; return (Boolean(((lite_stmtsJoined) === (""))) ? lite_valRet : ((((lite_stmtsJoined) + (" "))) + (lite_valRet))); })())));
                        void lite_standaloneTryBody;
                        const lite_finalStandaloneKind = (Boolean(((lite_blockExits) || ((((lite_finParsed).kind) === ("Never"))))) ? "Never" : lite_blockKind);
                        void lite_finalStandaloneKind;
                        lite_standaloneFinEnd = (lite_finParsed).next;
                        lite_left = liteFn$frontend$withMarkers({ kind: lite_finalStandaloneKind, code: (((((((("(() => { try { ") + (lite_standaloneTryBody))) + (" } finally { "))) + ((lite_finParsed).code))) + (" } })()")), intValue: 0n, textValue: "", constant: false, next: lite_standaloneFinEnd }, (Boolean(lite_inferMode) ? lite_blockMarkers : ""));
                    }
                }
                if ((!(lite_hasStandaloneFinally))) {
                    if (lite_blockExits) {
                        if (((lite_target) !== ("ts"))) {
                            liteFn$frontend$failAt(lite_source, lite_start, lite_prefix, "C backend does not support statement-bearing value blocks yet");
                        }
                        lite_left = liteFn$frontend$withMarkers({ kind: "Never", code: (((("(() => { ") + (liteFn$lib$core$text$joinTexts([...(lite_statements)], " ")))) + (" })()")), intValue: 0n, textValue: "", constant: false, next: lite_cursor }, (Boolean(lite_inferMode) ? lite_blockMarkers : ""));
                    } else if (((lite_statementCount) === (0n))) {
                        const lite_baseBlock = { kind: lite_blockKind, code: lite_blockCode, intValue: lite_blockInt, textValue: lite_blockText, constant: lite_blockConstant, next: lite_cursor };
                        void lite_baseBlock;
                        lite_left = (Boolean(((lite_inferMode) && (((lite_blockMarkers) !== (""))))) ? liteFn$frontend$withMarkers(lite_baseBlock, lite_blockMarkers) : lite_baseBlock);
                    } else {
                        if (((lite_target) !== ("ts"))) {
                            liteFn$frontend$failAt(lite_source, lite_start, lite_prefix, "C backend does not support statement-bearing value blocks yet");
                        }
                        const lite_returnCode = (Boolean(((lite_blockKind) === ("Unit"))) ? (Boolean(((lite_blockCode) === (liteFn$frontend$targetUnitLiteralCode(lite_target)))) ? "return undefined;" : (((("void (") + (lite_blockCode))) + ("); return undefined;"))) : (Boolean(((lite_blockKind) === ("Never"))) ? (((("return ") + (lite_blockCode))) + (";")) : (((("return ") + (liteFn$frontend$copiedValueCode(lite_target, lite_blockKind, lite_blockCode)))) + (";"))));
                        void lite_returnCode;
                        lite_left = liteFn$frontend$withMarkers({ kind: lite_blockKind, code: (((((((("(() => { ") + (liteFn$lib$core$text$joinTexts([...(lite_statements)], " ")))) + (" "))) + (lite_returnCode))) + (" })()")), intValue: 0n, textValue: "", constant: false, next: lite_cursor }, (Boolean(lite_inferMode) ? lite_blockMarkers : ""));
                    }
                }
            }
        } else if (liteFn$lib$core$text$isNameStart(lite_ch)) {
            const lite_nameStart = lite_start;
            void lite_nameStart;
            const lite_next = liteFn$lib$core$text$skipName(lite_source, lite_start);
            void lite_next;
            const lite_name = liteFn$lib$core$text$slice(lite_source, lite_nameStart, lite_next);
            void lite_name;
            if (((lite_name) === ("Unit"))) {
                lite_left = { kind: "Unit", code: liteFn$frontend$targetUnitLiteralCode(lite_target), intValue: 0n, textValue: "", constant: true, next: lite_next };
            } else if (((lite_name) === ("true"))) {
                lite_left = liteFn$frontend$boolParsed(liteFn$frontend$targetBoolLiteralCode(lite_target, true), true, true, lite_next);
            } else if (((lite_name) === ("false"))) {
                lite_left = liteFn$frontend$boolParsed(liteFn$frontend$targetBoolLiteralCode(lite_target, false), false, true, lite_next);
            } else if (((lite_name) === ("not"))) {
                const lite_operand = liteFn$frontend$parseBinaryCtx(lite_target, lite_source, lite_next, lite_prefix, [...(lite_locals)], [...(lite_functions)], [...(lite_params)], lite_currentName, "", 5n, [...(lite_ctxs)], lite_iifeDepth, lite_inferMode, "");
                void lite_operand;
                const lite_operandLoopId = liteFn$frontend$loopValMarkerId((lite_operand).kind);
                void lite_operandLoopId;
                if (((lite_inferMode) && (((lite_operandLoopId) >= (0n))))) {
                    lite_left = liteFn$frontend$withMarkers(liteFn$frontend$boolParsed("", false, false, (lite_operand).next), ((((liteFn$frontend$collectParsedMarkers("", lite_operand)) + (liteFn$lib$core$int$intText(lite_operandLoopId)))) + ("=Bool\n")));
                } else {
                    if ((((lite_operand).kind) !== ("Bool"))) {
                        liteFn$frontend$failAt(lite_source, lite_nameStart, lite_prefix, "not requires a Bool operand");
                    }
                    if ((lite_operand).constant) {
                        const lite_value = (((lite_operand).intValue) === (0n));
                        void lite_value;
                        lite_left = liteFn$frontend$boolParsed(liteFn$frontend$targetBoolLiteralCode(lite_target, lite_value), lite_value, true, (lite_operand).next);
                    } else {
                        lite_left = liteFn$frontend$withMarkers(liteFn$frontend$boolParsed(liteFn$frontend$targetNotCode(lite_target, (lite_operand).code), false, false, (lite_operand).next), (Boolean(lite_inferMode) ? liteFn$frontend$collectParsedMarkers("", lite_operand) : ""));
                    }
                }
            } else if (((((((lite_name) === ("if"))) || (((lite_name) === ("match"))))) || (((lite_name) === ("loop"))))) {
                lite_condParseKind = lite_name;
                lite_condParseStart = lite_nameStart;
                lite_condParseTag = "";
                lite_condParseTagAt = lite_nameStart;
            } else {
                if (liteFn$frontend$isReservedWord(lite_name)) {
                    liteFn$frontend$unsupportedFeature(lite_source, lite_nameStart, lite_name, lite_prefix);
                }
                const lite_afterName = liteFn$frontend$skipTrivia(lite_source, lite_next, lite_prefix);
                void lite_afterName;
                let lite_callableIndex = liteFn$frontend$findFunction([...(lite_functions)], lite_name);
                void lite_callableIndex;
                let lite_calleeName = lite_name;
                void lite_calleeName;
                if (((lite_name) === ("self"))) {
                    if (((lite_currentName) === (""))) {
                        liteFn$frontend$failAt(lite_source, lite_nameStart, lite_prefix, "self is only available inside a function");
                    }
                    lite_calleeName = lite_currentName;
                    lite_callableIndex = liteFn$frontend$findFunction([...(lite_functions)], lite_currentName);
                }
                if (((lite_callableIndex) >= (0n))) {
                    lite_left = { kind: "ModuleFunction", code: liteFn$lib$core$int$intText(lite_nameStart), intValue: lite_callableIndex, textValue: lite_calleeName, constant: false, next: lite_next };
                } else if ((((((((((((((lite_name) === ("push_back"))) || (((lite_name) === ("pop_back"))))) || (((lite_name) === ("push_front"))))) || (((lite_name) === ("pop_front")))))) && (((lite_afterName) < (liteFn$lib$core$text$length(lite_source)))))) && (((liteFn$lib$core$text$at(lite_source, lite_afterName)) === ("("))))) {
                    lite_left = { kind: "ListOp", code: lite_name, intValue: 0n, textValue: lite_name, constant: false, next: lite_afterName };
                } else {
                    const lite_index = liteFn$frontend$localIndex([...(lite_locals)], lite_name);
                    void lite_index;
                    if (((lite_index) < (0n))) {
                        liteFn$frontend$failAt(lite_source, lite_nameStart, lite_prefix, (("unknown value ") + (lite_name)));
                    }
                    const lite_entry = lite$listAt((lite_locals), lite_index, 269470);
                    void lite_entry;
                    if ((((lite_entry).initState) !== ("init"))) {
                        liteFn$frontend$failAt(lite_source, lite_nameStart, lite_prefix, (("cannot read uninitialized local ") + (lite_name)));
                    }
                    lite_left = { kind: (lite_entry).kind, code: (lite_entry).runtime, intValue: (lite_entry).intValue, textValue: (lite_entry).textValue, constant: (lite_entry).constant, next: lite_next };
                }
            }
        } else if (((lite_ch) === ("."))) {
            const lite_fieldStart = liteFn$frontend$skipTrivia(lite_source, lite$addInt(lite_start, 1n, 269901), lite_prefix);
            void lite_fieldStart;
            const lite_size = liteFn$lib$core$text$length(lite_source);
            void lite_size;
            if (((((lite_fieldStart) >= (lite_size))) || ((!(liteFn$lib$core$text$isNameStart(liteFn$lib$core$text$at(lite_source, lite_fieldStart))))))) {
                liteFn$frontend$failAt(lite_source, lite_fieldStart, lite_prefix, "expected metadata field name after .");
            }
            const lite_fieldEnd = liteFn$lib$core$text$skipName(lite_source, lite_fieldStart);
            void lite_fieldEnd;
            const lite_fieldName = liteFn$lib$core$text$slice(lite_source, lite_fieldStart, lite_fieldEnd);
            void lite_fieldName;
            const lite_loopIdx = liteFn$frontend$findLeadingDotLoopIdx([...(lite_ctxs)]);
            void lite_loopIdx;
            if (((lite_loopIdx) === ((-2n)))) {
                liteFn$frontend$failAt(lite_source, lite_start, lite_prefix, (((("leading-dot .") + (lite_fieldName))) + (" is not available inside a conditional; use an explicit loop @tag")));
            } else if (((lite_loopIdx) === ((-3n)))) {
                liteFn$frontend$failAt(lite_source, lite_start, lite_prefix, "loop metadata is not available in finally");
            } else if (((lite_loopIdx) < (0n))) {
                liteFn$frontend$failAt(lite_source, lite_start, lite_prefix, ((((".") + (lite_fieldName))) + (" outside loop")));
            } else {
                if (((lite_target) !== ("ts"))) {
                    liteFn$frontend$failAt(lite_source, lite_start, lite_prefix, "C backend does not support loop metadata yet");
                }
                lite_left = liteFn$frontend$resolveLoopField(lite_target, lite$listAt((lite_ctxs), lite_loopIdx, 270925), lite_fieldName, lite_expected, lite_source, lite_fieldStart, lite_fieldEnd, lite_prefix);
            }
        } else {
            liteFn$frontend$failAt(lite_source, lite_start, lite_prefix, "expected an Int, Float, String or Bool expression");
        }
        if (((lite_condParseKind) === ("loop"))) {
            const lite_rawLoopEnd = liteFn$frontend$scanRawLoopEnd(lite_source, lite_condParseStart, lite_prefix);
            void lite_rawLoopEnd;
            const lite_afterRawLoop = (Boolean(((lite_rawLoopEnd) >= (0n))) ? liteFn$frontend$skipTrivia(lite_source, lite_rawLoopEnd, lite_prefix) : (-1n));
            void lite_afterRawLoop;
            const lite_hasActualThen = ((((lite_afterRawLoop) >= (0n))) && (liteFn$lib$core$text$wordAt(lite_source, lite_afterRawLoop, "then")));
            void lite_hasActualThen;
            const lite_afterOptLoopThen = (Boolean(lite_hasActualThen) ? liteFn$frontend$scanTrailingThenEnd(lite_source, lite_rawLoopEnd, lite_prefix, false) : lite_rawLoopEnd);
            void lite_afterOptLoopThen;
            const lite_afterOptLoopThenTrivia = (Boolean(((lite_afterOptLoopThen) >= (0n))) ? liteFn$frontend$skipTrivia(lite_source, lite_afterOptLoopThen, lite_prefix) : (-1n));
            void lite_afterOptLoopThenTrivia;
            const lite_hasLoopFinally = ((((lite_afterOptLoopThenTrivia) >= (0n))) && (liteFn$lib$core$text$wordAt(lite_source, lite_afterOptLoopThenTrivia, "finally")));
            void lite_hasLoopFinally;
            if (((lite_target) !== ("ts"))) {
                if (((lite_condParseTag) !== (""))) {
                    liteFn$frontend$failAt(lite_source, lite_condParseTagAt, lite_prefix, "C backend does not support tagged loops yet");
                }
                if (lite_hasLoopFinally) {
                    liteFn$frontend$failAt(lite_source, lite_afterOptLoopThenTrivia, lite_prefix, "C backend does not support finally blocks yet");
                }
                liteFn$frontend$unsupportedFeature(lite_source, lite_condParseStart, "loop", lite_prefix);
            }
            const lite_loopId = liteFn$frontend$nextCtxId([...(lite_ctxs)]);
            void lite_loopId;
            const lite_loopIdStr = liteFn$lib$core$int$intText(lite_loopId);
            void lite_loopIdStr;
            const lite_loopValVar = (("lite$val") + (lite_loopIdStr));
            void lite_loopValVar;
            const lite_loopCountVar = (("lite$cnt") + (lite_loopIdStr));
            void lite_loopCountVar;
            const lite_loopItemMetaVar = (("lite$litem") + (lite_loopIdStr));
            void lite_loopItemMetaVar;
            const lite_loopIdxVar = (("lite$lidx") + (lite_loopIdStr));
            void lite_loopIdxVar;
            const lite_loopIterVar = (("lite$iter") + (lite_loopIdStr));
            void lite_loopIterVar;
            const lite_loopLabel = (("lite$l") + (lite_loopIdStr));
            void lite_loopLabel;
            const lite_loopDepth = lite$addInt(lite_iifeDepth, 1n, 272595);
            void lite_loopDepth;
            const lite_normExpected = (Boolean(((((lite_expected) === ("Unit"))) || (((lite_expected) === ("Never"))))) ? "" : (Boolean(liteFn$lib$core$text$startsWithAt(lite_expected, 0n, "TailList<")) ? (((("List<") + (liteFn$frontend$listElementKind(liteFn$lib$core$text$slice(lite_expected, 4n, liteFn$lib$core$text$length(lite_expected)))))) + (">")) : lite_expected));
            void lite_normExpected;
            const lite_loopHintExpected = (Boolean(lite_hasActualThen) ? "" : lite_normExpected);
            void lite_loopHintExpected;
            const lite_loopTagDisplay = (Boolean(((lite_condParseTag) !== (""))) ? lite_condParseTag : "loop");
            void lite_loopTagDisplay;
            const lite_passCount = (Boolean(lite_inferMode) ? 1n : 2n);
            void lite_passCount;
            let lite_resolvedPreThenKind = "";
            void lite_resolvedPreThenKind;
            let lite_loopOuterMarkers = "";
            void lite_loopOuterMarkers;
            let lite_loopEndCursor = lite_condParseStart;
            void lite_loopEndCursor;
            let lite_loopStmtCode = "";
            void lite_loopStmtCode;
            let lite_finalIsSeqLoop = false;
            void lite_finalIsSeqLoop;
            let lite_finalSeqItemKind = "";
            void lite_finalSeqItemKind;
            let lite_pass = 1n;
            void lite_pass;
            while (((lite_pass) <= (lite_passCount))) {
                const lite_isPass1 = ((lite_pass) === (1n));
                void lite_isPass1;
                const lite_passInfer = ((lite_isPass1) || (lite_inferMode));
                void lite_passInfer;
                const lite_passCtxValKind = (Boolean(lite_isPass1) ? (Boolean(((lite_loopHintExpected) === (""))) ? "__infer__" : (("__infer__:") + (lite_loopHintExpected))) : lite_resolvedPreThenKind);
                void lite_passCtxValKind;
                const lite_passBodyExpected = (Boolean(lite_isPass1) ? lite_loopHintExpected : (Boolean(((((lite_resolvedPreThenKind) === ("Unit"))) || (((lite_resolvedPreThenKind) === ("Never"))))) ? "" : lite_resolvedPreThenKind));
                void lite_passBodyExpected;
                const lite_headerCtx = { id: lite_loopId, tag: lite_condParseTag, kind: "loop", phase: "header", iifeDepth: lite_loopDepth, valKind: lite_passCtxValKind, valVar: lite_loopValVar, label: lite_loopLabel, iterLabel: lite_loopLabel, countVar: lite_loopCountVar, itemVar: "", itemKind: "", indexVar: "", hasIndex: false };
                void lite_headerCtx;
                const lite_headerCtxs: { id: bigint; tag: string; kind: string; phase: string; iifeDepth: bigint; valKind: string; valVar: string; label: string; iterLabel: string; countVar: string; itemVar: string; itemKind: string; indexVar: string; hasIndex: boolean }[] = [...(liteFn$frontend$appendCtx([...(lite_ctxs)], lite_headerCtx))];
                void lite_headerCtxs;
                const lite_hdrStart = liteFn$frontend$skipTrivia(lite_source, lite$addInt(lite_condParseStart, 4n, 274379), lite_prefix);
                void lite_hdrStart;
                liteFn$frontend$rejectHeaderBlockTag(lite_source, lite_hdrStart, lite_prefix, "loop");
                let lite_passMarkers = "";
                void lite_passMarkers;
                let lite_isSeqLoop = false;
                void lite_isSeqLoop;
                let lite_isUncond = false;
                void lite_isUncond;
                let lite_condCode = "true";
                void lite_condCode;
                let lite_seqCode = "";
                void lite_seqCode;
                let lite_seqItemName = "";
                void lite_seqItemName;
                let lite_seqItemKind = "";
                void lite_seqItemKind;
                let lite_beforeLoopOpen = lite_hdrStart;
                void lite_beforeLoopOpen;
                if (((((lite_hdrStart) < (liteFn$lib$core$text$length(lite_source)))) && (((liteFn$lib$core$text$at(lite_source, lite_hdrStart)) === ("{"))))) {
                    lite_isUncond = true;
                } else {
                    const lite_hdr = liteFn$frontend$parseBinaryCtx(lite_target, lite_source, lite_hdrStart, lite_prefix, [...(lite_locals)], [...(lite_functions)], [...(lite_params)], lite_currentName, "", 0n, [...(lite_headerCtxs)], lite_loopDepth, lite_passInfer, "");
                    void lite_hdr;
                    if (lite_passInfer) {
                        lite_passMarkers = liteFn$frontend$collectParsedMarkers(lite_passMarkers, lite_hdr);
                    }
                    const lite_afterHdr = liteFn$frontend$skipTrivia(lite_source, (lite_hdr).next, lite_prefix);
                    void lite_afterHdr;
                    if (liteFn$lib$core$text$wordAt(lite_source, lite_afterHdr, "as")) {
                        if ((((!(liteFn$frontend$isListKind((lite_hdr).kind)))) && ((!(liteFn$frontend$isArrayKind((lite_hdr).kind)))))) {
                            liteFn$frontend$failAt(lite_source, lite_hdrStart, lite_prefix, (("loop sequence must be a List or Array, got ") + (liteFn$frontend$displayKind((lite_hdr).kind))));
                        }
                        const lite_itemNameStart = liteFn$frontend$skipTrivia(lite_source, lite$addInt(lite_afterHdr, 2n, 275550), lite_prefix);
                        void lite_itemNameStart;
                        if (((((lite_itemNameStart) >= (liteFn$lib$core$text$length(lite_source)))) || ((!(liteFn$lib$core$text$isNameStart(liteFn$lib$core$text$at(lite_source, lite_itemNameStart))))))) {
                            liteFn$frontend$failAt(lite_source, lite_itemNameStart, lite_prefix, "expected an item name after as");
                        }
                        const lite_itemNameEnd = liteFn$lib$core$text$skipName(lite_source, lite_itemNameStart);
                        void lite_itemNameEnd;
                        lite_seqItemName = liteFn$lib$core$text$slice(lite_source, lite_itemNameStart, lite_itemNameEnd);
                        if (liteFn$frontend$isReservedWord(lite_seqItemName)) {
                            liteFn$frontend$unsupportedFeature(lite_source, lite_itemNameStart, lite_seqItemName, lite_prefix);
                        }
                        lite_isSeqLoop = true;
                        lite_seqCode = (lite_hdr).code;
                        lite_seqItemKind = (Boolean(liteFn$frontend$isListKind((lite_hdr).kind)) ? liteFn$frontend$listElementKind((lite_hdr).kind) : liteFn$frontend$arrayElementKind((lite_hdr).kind));
                        lite_beforeLoopOpen = liteFn$frontend$skipTrivia(lite_source, lite_itemNameEnd, lite_prefix);
                    } else if (((liteFn$frontend$isListKind((lite_hdr).kind)) || (liteFn$frontend$isArrayKind((lite_hdr).kind)))) {
                        lite_isSeqLoop = true;
                        lite_seqCode = (lite_hdr).code;
                        lite_seqItemKind = (Boolean(liteFn$frontend$isListKind((lite_hdr).kind)) ? liteFn$frontend$listElementKind((lite_hdr).kind) : liteFn$frontend$arrayElementKind((lite_hdr).kind));
                        lite_beforeLoopOpen = lite_afterHdr;
                    } else {
                        if ((((lite_hdr).kind) !== ("Bool"))) {
                            liteFn$frontend$failAt(lite_source, lite_hdrStart, lite_prefix, "loop condition must be Bool");
                        }
                        if ((lite_hdr).constant) {
                            if ((((lite_hdr).intValue) === (0n))) {
                                lite_condCode = "false";
                            } else {
                                lite_condCode = "true";
                                lite_isUncond = true;
                            }
                        } else {
                            lite_condCode = (lite_hdr).code;
                        }
                        lite_beforeLoopOpen = lite_afterHdr;
                    }
                }
                liteFn$frontend$rejectMisplacedTag(lite_source, lite_beforeLoopOpen, lite_prefix, "block tag cannot appear before { in loop");
                const lite_loopOpen = liteFn$frontend$expectSymbol(lite_source, lite_beforeLoopOpen, "{", lite_prefix);
                void lite_loopOpen;
                const lite_loopLocals: { name: string; runtime: string; kind: string; mutable: boolean; writable: boolean; depth: bigint; constant: boolean; code: string; intValue: bigint; textValue: string; initState: string }[] = [...([])];
                void lite_loopLocals;
                for (const lite_entry of [...(lite_locals)]) {
                    void lite_entry;
                    lite_loopLocals.push(lite_entry);
                }
                if (((lite_isSeqLoop) && (((lite_seqItemName) !== (""))))) {
                    if (((lite_seqItemKind) === ("Unit"))) {
                        lite_loopLocals.push({ name: lite_seqItemName, runtime: liteFn$frontend$targetUnitLiteralCode(lite_target), kind: "Unit", mutable: false, writable: false, depth: 1n, constant: true, code: liteFn$frontend$targetUnitLiteralCode(lite_target), intValue: 0n, textValue: "", initState: "init" });
                    } else {
                        lite_loopLocals.push({ name: lite_seqItemName, runtime: lite_loopItemMetaVar, kind: lite_seqItemKind, mutable: false, writable: false, depth: 1n, constant: false, code: lite_loopItemMetaVar, intValue: 0n, textValue: "", initState: "init" });
                    }
                }
                const lite_bodyCtx = { id: lite_loopId, tag: lite_condParseTag, kind: "loop", phase: "body", iifeDepth: lite_loopDepth, valKind: lite_passCtxValKind, valVar: lite_loopValVar, label: lite_loopLabel, iterLabel: lite_loopLabel, countVar: lite_loopCountVar, itemVar: lite_loopItemMetaVar, itemKind: lite_seqItemKind, indexVar: lite_loopIdxVar, hasIndex: lite_isSeqLoop };
                void lite_bodyCtx;
                const lite_bodyCtxs: { id: bigint; tag: string; kind: string; phase: string; iifeDepth: bigint; valKind: string; valVar: string; label: string; iterLabel: string; countVar: string; itemVar: string; itemKind: string; indexVar: string; hasIndex: boolean }[] = [...(liteFn$frontend$appendCtx([...(lite_ctxs)], lite_bodyCtx))];
                void lite_bodyCtxs;
                const lite_bodyParsed = liteFn$frontend$parseBinaryCtx(lite_target, lite_source, lite$subtractInt(lite_loopOpen, 1n, 278908), lite_prefix, [...(lite_loopLocals)], [...(lite_functions)], [...(lite_params)], lite_currentName, lite_passBodyExpected, 0n, [...(lite_bodyCtxs)], lite_loopDepth, lite_passInfer, "loopBody");
                void lite_bodyParsed;
                if (lite_passInfer) {
                    lite_passMarkers = liteFn$frontend$collectParsedMarkers(lite_passMarkers, lite_bodyParsed);
                }
                if (lite_isPass1) {
                    lite_loopEndCursor = (lite_bodyParsed).next;
                    lite_finalIsSeqLoop = lite_isSeqLoop;
                    lite_finalSeqItemKind = lite_seqItemKind;
                    lite_loopOuterMarkers = liteFn$frontend$filterOtherMarkers(lite_passMarkers, lite_loopId);
                    const lite_markerScan = liteFn$frontend$scanLoopMarkers(lite_passMarkers, lite_loopId);
                    void lite_markerScan;
                    if (((((lite_isUncond) && ((((lite_bodyParsed).kind) === ("Never"))))) && ((!((lite_markerScan).hasAny))))) {
                        lite_resolvedPreThenKind = "Never";
                    } else {
                        if (((lite_hasActualThen) && ((!((lite_markerScan).hasConcrete))))) {
                            const lite_probeThenKw = liteFn$frontend$skipTrivia(lite_source, lite_loopEndCursor, lite_prefix);
                            void lite_probeThenKw;
                            const lite_probeAfterThen = liteFn$frontend$skipTrivia(lite_source, lite$addInt(lite_probeThenKw, 4n, 279835), lite_prefix);
                            void lite_probeAfterThen;
                            liteFn$frontend$rejectMisplacedTag(lite_source, lite_probeAfterThen, lite_prefix, "block tag cannot appear after then");
                            const lite_probeThenOpen = liteFn$frontend$expectSymbol(lite_source, lite_probeAfterThen, "{", lite_prefix);
                            void lite_probeThenOpen;
                            const lite_thenProbeCtx = { id: lite_loopId, tag: lite_condParseTag, kind: "loop", phase: "then", iifeDepth: lite_loopDepth, valKind: "__infer__", valVar: lite_loopValVar, label: lite_loopLabel, iterLabel: "", countVar: lite_loopCountVar, itemVar: lite_loopItemMetaVar, itemKind: lite_seqItemKind, indexVar: lite_loopIdxVar, hasIndex: lite_isSeqLoop };
                            void lite_thenProbeCtx;
                            const lite_thenProbe = liteFn$frontend$parseBinaryCtx(lite_target, lite_source, lite$subtractInt(lite_probeThenOpen, 1n, 280540), lite_prefix, [...(lite_locals)], [...(lite_functions)], [...(lite_params)], lite_currentName, lite_normExpected, 0n, [...(liteFn$frontend$appendCtx([...(lite_ctxs)], lite_thenProbeCtx))], lite_iifeDepth, true, "exprOut");
                            void lite_thenProbe;
                            lite_passMarkers = liteFn$frontend$collectParsedMarkers(lite_passMarkers, lite_thenProbe);
                        }
                        lite_resolvedPreThenKind = liteFn$frontend$inferLoopValueKind(lite_passMarkers, lite_loopId, lite_loopTagDisplay, lite_source, lite_condParseTagAt, lite_prefix, lite_loopHintExpected);
                    }
                } else {
                    let lite_metaStep = "";
                    void lite_metaStep;
                    if (lite_isSeqLoop) {
                        const lite_itemStep = (Boolean(((((lite_seqItemKind) === (""))) || (((lite_seqItemKind) === ("Unit"))))) ? (((("void ") + (lite_loopIterVar))) + ("; ")) : ((((((lite_loopItemMetaVar) + (" = "))) + (lite_loopIterVar))) + ("; ")));
                        void lite_itemStep;
                        lite_metaStep = ((((((((((((((((lite_loopIdxVar) + (" = "))) + (lite_loopCountVar))) + ("; "))) + (lite_loopCountVar))) + (" = "))) + (lite_loopCountVar))) + (" + 1n; "))) + (lite_itemStep));
                    } else {
                        lite_metaStep = ((((((lite_loopCountVar) + (" = "))) + (lite_loopCountVar))) + (" + 1n; "));
                    }
                    const lite_brkPayId = lite_loopIdStr;
                    void lite_brkPayId;
                    const lite_contPayId = liteFn$lib$core$int$intText(lite$subtractInt(0n, lite_loopId, 281656));
                    void lite_contPayId;
                    const lite_brkBareId = liteFn$lib$core$int$intText(lite$addInt(1000000n, lite_loopId, 281720));
                    void lite_brkBareId;
                    const lite_contBareId = liteFn$lib$core$int$intText(lite$subtractInt((0n - 1000000n), lite_loopId, 281789));
                    void lite_contBareId;
                    const lite_hasPayCont = liteFn$frontend$codeUsesTextCall((lite_bodyParsed).code, (((("lite$throwTransfer(") + (lite_contPayId))) + (",")));
                    void lite_hasPayCont;
                    const lite_hasBareCont = liteFn$frontend$codeUsesTextCall((lite_bodyParsed).code, (((("lite$throwTransfer(") + (lite_contBareId))) + (",")));
                    void lite_hasBareCont;
                    const lite_hasPayBrk = liteFn$frontend$codeUsesTextCall((lite_bodyParsed).code, (((("lite$throwTransfer(") + (lite_brkPayId))) + (",")));
                    void lite_hasPayBrk;
                    const lite_hasBareBrk = liteFn$frontend$codeUsesTextCall((lite_bodyParsed).code, (((("lite$throwTransfer(") + (lite_brkBareId))) + (",")));
                    void lite_hasBareBrk;
                    const lite_valAssign = (Boolean(((((lite_resolvedPreThenKind) === ("Unit"))) || (((lite_resolvedPreThenKind) === ("Never"))))) ? "" : ((lite_loopValVar) + (" = lite$transferVal; ")));
                    void lite_valAssign;
                    let lite_wrappedBody = (lite_bodyParsed).code;
                    void lite_wrappedBody;
                    if (((((((lite_hasPayCont) || (lite_hasBareCont))) || (lite_hasPayBrk))) || (lite_hasBareBrk))) {
                        const lite_catchClauses: string[] = [...([])];
                        void lite_catchClauses;
                        if (lite_hasPayCont) {
                            lite_catchClauses.push((((((((("if (lite$hasTransfer(lite$err, ") + (lite_contPayId))) + (")) { "))) + (lite_valAssign))) + ("continue; }")));
                        }
                        if (lite_hasBareCont) {
                            lite_catchClauses.push((((("if (lite$hasTransfer(lite$err, ") + (lite_contBareId))) + (")) { continue; }")));
                        }
                        if (lite_hasPayBrk) {
                            lite_catchClauses.push((((((((("if (lite$hasTransfer(lite$err, ") + (lite_brkPayId))) + (")) { "))) + (lite_valAssign))) + ("break; }")));
                        }
                        if (lite_hasBareBrk) {
                            lite_catchClauses.push((((("if (lite$hasTransfer(lite$err, ") + (lite_brkBareId))) + (")) { break; }")));
                        }
                        lite_wrappedBody = (((((((("try { ") + ((lite_bodyParsed).code))) + (" } catch (lite$err) { "))) + (liteFn$lib$core$text$joinTexts([...(lite_catchClauses)], " else ")))) + (" else { throw lite$err; } }"));
                    }
                    const lite_rawLoopStmt = (Boolean(lite_isSeqLoop) ? (((((((((((((("for (const ") + (lite_loopIterVar))) + (" of "))) + (liteFn$frontend$targetListCopyCode(lite_target, lite_seqCode)))) + (") { "))) + (lite_metaStep))) + (lite_wrappedBody))) + (" }")) : (() => { const lite_whileCond = (Boolean(((lite_condCode) === ("true"))) ? "Boolean(true)" : (Boolean(((lite_condCode) === ("false"))) ? "Boolean(false)" : (((("Boolean(") + (lite_condCode))) + (")")))); void lite_whileCond; return (((((((((("while (") + (lite_whileCond))) + (") { "))) + (lite_metaStep))) + (lite_wrappedBody))) + (" }")); })());
                    void lite_rawLoopStmt;
                    const lite_needsLoopLabel = ((liteFn$frontend$codeUsesTextCall(lite_rawLoopStmt, (((("break ") + (lite_loopLabel))) + (";")))) || (liteFn$frontend$codeUsesTextCall(lite_rawLoopStmt, (((("continue ") + (lite_loopLabel))) + (";")))));
                    void lite_needsLoopLabel;
                    const lite_labeledLoop = (Boolean(lite_needsLoopLabel) ? ((((lite_loopLabel) + (": "))) + (lite_rawLoopStmt)) : lite_rawLoopStmt);
                    void lite_labeledLoop;
                    const lite_hdrCheckText = (Boolean(lite_isSeqLoop) ? lite_seqCode : lite_condCode);
                    void lite_hdrCheckText;
                    const lite_hdrHasPayBrk = liteFn$frontend$codeUsesTextCall(lite_hdrCheckText, (((("lite$throwTransfer(") + (lite_brkPayId))) + (",")));
                    void lite_hdrHasPayBrk;
                    const lite_hdrHasBareBrk = liteFn$frontend$codeUsesTextCall(lite_hdrCheckText, (((("lite$throwTransfer(") + (lite_brkBareId))) + (",")));
                    void lite_hdrHasBareBrk;
                    if (((lite_hdrHasPayBrk) || (lite_hdrHasBareBrk))) {
                        const lite_hdrClauses: string[] = [...([])];
                        void lite_hdrClauses;
                        if (lite_hdrHasPayBrk) {
                            lite_hdrClauses.push((((((((("if (lite$hasTransfer(lite$err, ") + (lite_brkPayId))) + (")) { "))) + (lite_valAssign))) + ("}")));
                        }
                        if (lite_hdrHasBareBrk) {
                            lite_hdrClauses.push((((("if (lite$hasTransfer(lite$err, ") + (lite_brkBareId))) + (")) { }")));
                        }
                        lite_loopStmtCode = (((((((("try { ") + (lite_labeledLoop))) + (" } catch (lite$err) { "))) + (liteFn$lib$core$text$joinTexts([...(lite_hdrClauses)], " else ")))) + (" else { throw lite$err; } }"));
                    } else {
                        lite_loopStmtCode = lite_labeledLoop;
                    }
                }
                lite_pass = lite$addInt(lite_pass, 1n, 285516);
            }
            let lite_decls = "";
            void lite_decls;
            if ((!(lite_inferMode))) {
                lite_decls = (((((((("let ") + (lite_loopCountVar))) + (": bigint = 0n; void "))) + (lite_loopCountVar))) + ("; "));
                if (lite_finalIsSeqLoop) {
                    lite_decls = ((((((((((lite_decls) + ("let "))) + (lite_loopIdxVar))) + (": bigint = 0n; void "))) + (lite_loopIdxVar))) + ("; "));
                    if (((((lite_finalSeqItemKind) !== (""))) && (((lite_finalSeqItemKind) !== ("Unit"))))) {
                        lite_decls = ((((((((((((((((((lite_decls) + ("let "))) + (lite_loopItemMetaVar))) + (": "))) + (liteFn$frontend$tsFunctionType(lite_finalSeqItemKind)))) + (" = "))) + ((liteFn$frontend$zeroParsed(lite_target, lite_finalSeqItemKind, 0n)).code))) + ("; void "))) + (lite_loopItemMetaVar))) + ("; "));
                    }
                }
                if (((((lite_resolvedPreThenKind) !== ("Unit"))) && (((lite_resolvedPreThenKind) !== ("Never"))))) {
                    lite_decls = ((((((((((((((((((lite_decls) + ("let "))) + (lite_loopValVar))) + (": "))) + (liteFn$frontend$tsFunctionType(lite_resolvedPreThenKind)))) + (" = "))) + ((liteFn$frontend$zeroParsed(lite_target, lite_resolvedPreThenKind, 0n)).code))) + ("; void "))) + (lite_loopValVar))) + ("; "));
                }
            }
            let lite_loopIifeBody = "";
            void lite_loopIifeBody;
            if (lite_hasActualThen) {
                const lite_thenKwPos = liteFn$frontend$skipTrivia(lite_source, lite_loopEndCursor, lite_prefix);
                void lite_thenKwPos;
                const lite_afterThenKw = liteFn$frontend$skipTrivia(lite_source, lite$addInt(lite_thenKwPos, 4n, 286631), lite_prefix);
                void lite_afterThenKw;
                liteFn$frontend$rejectMisplacedTag(lite_source, lite_afterThenKw, lite_prefix, "block tag cannot appear after then");
                const lite_thenOpen = liteFn$frontend$expectSymbol(lite_source, lite_afterThenKw, "{", lite_prefix);
                void lite_thenOpen;
                const lite_loopThenCtx = { id: lite_loopId, tag: lite_condParseTag, kind: "loop", phase: "then", iifeDepth: lite_loopDepth, valKind: lite_resolvedPreThenKind, valVar: lite_loopValVar, label: lite_loopLabel, iterLabel: "", countVar: lite_loopCountVar, itemVar: lite_loopItemMetaVar, itemKind: lite_finalSeqItemKind, indexVar: lite_loopIdxVar, hasIndex: lite_finalIsSeqLoop };
                void lite_loopThenCtx;
                const lite_thenParsed = liteFn$frontend$parseBinaryCtx(lite_target, lite_source, lite$subtractInt(lite_thenOpen, 1n, 287254), lite_prefix, [...(lite_locals)], [...(lite_functions)], [...(lite_params)], lite_currentName, lite_normExpected, 0n, [...(liteFn$frontend$appendCtx([...(lite_ctxs)], lite_loopThenCtx))], lite_iifeDepth, lite_inferMode, "branch");
                void lite_thenParsed;
                if (lite_inferMode) {
                    const lite_thenMarkers = ((lite_loopOuterMarkers) + (liteFn$frontend$collectParsedMarkers("", lite_thenParsed)));
                    void lite_thenMarkers;
                    const lite_finalKind = (Boolean(((lite_resolvedPreThenKind) === ("Never"))) ? "Never" : (lite_thenParsed).kind);
                    void lite_finalKind;
                    lite_left = liteFn$frontend$withMarkers({ kind: lite_finalKind, code: "", intValue: 0n, textValue: "", constant: false, next: (lite_thenParsed).next }, lite_thenMarkers);
                } else if (((lite_resolvedPreThenKind) === ("Never"))) {
                    lite_loopIifeBody = ((((lite_decls) + (lite_loopStmtCode))) + (" throw new Error(\"unreachable\");"));
                    lite_left = { kind: "Never", code: (((("(() => { ") + (lite_loopIifeBody))) + (" })()")), intValue: 0n, textValue: "", constant: false, next: (lite_thenParsed).next };
                } else {
                    const lite_thenRet = (Boolean((((lite_thenParsed).kind) === ("Unit"))) ? (((("void (") + ((lite_thenParsed).code))) + ("); return undefined;")) : (Boolean((((lite_thenParsed).kind) === ("Never"))) ? (((("(") + ((lite_thenParsed).code))) + ("); throw new Error(\"unreachable\");")) : (((("return ") + ((lite_thenParsed).code))) + (";"))));
                    void lite_thenRet;
                    lite_loopIifeBody = ((((((lite_decls) + (lite_loopStmtCode))) + (" "))) + (lite_thenRet));
                    lite_left = { kind: (lite_thenParsed).kind, code: (((("(() => { ") + (lite_loopIifeBody))) + (" })()")), intValue: 0n, textValue: "", constant: false, next: (lite_thenParsed).next };
                }
            } else {
                if (lite_inferMode) {
                    lite_left = liteFn$frontend$withMarkers({ kind: lite_resolvedPreThenKind, code: "", intValue: 0n, textValue: "", constant: false, next: lite_loopEndCursor }, lite_loopOuterMarkers);
                } else {
                    const lite_finalRet = (Boolean(((lite_resolvedPreThenKind) === ("Unit"))) ? " return undefined;" : (Boolean(((lite_resolvedPreThenKind) === ("Never"))) ? " throw new Error(\"unreachable\");" : ((((" return ") + (lite_loopValVar))) + (";"))));
                    void lite_finalRet;
                    lite_loopIifeBody = ((((lite_decls) + (lite_loopStmtCode))) + (lite_finalRet));
                    lite_left = { kind: lite_resolvedPreThenKind, code: (((("(() => { ") + (lite_loopIifeBody))) + (" })()")), intValue: 0n, textValue: "", constant: false, next: lite_loopEndCursor };
                }
            }
            const lite_afterLoopConstruct = liteFn$frontend$skipTrivia(lite_source, (lite_left).next, lite_prefix);
            void lite_afterLoopConstruct;
            if (((((lite_hasActualThen) && (((lite_afterLoopConstruct) < (liteFn$lib$core$text$length(lite_source)))))) && (liteFn$lib$core$text$wordAt(lite_source, lite_afterLoopConstruct, "then")))) {
                liteFn$frontend$failAt(lite_source, lite_afterLoopConstruct, lite_prefix, "duplicate then block");
            }
            if (((((lite_afterLoopConstruct) < (liteFn$lib$core$text$length(lite_source)))) && (liteFn$lib$core$text$wordAt(lite_source, lite_afterLoopConstruct, "finally")))) {
                const lite_afterFinKw = liteFn$frontend$skipTrivia(lite_source, lite$addInt(lite_afterLoopConstruct, 7n, 290040), lite_prefix);
                void lite_afterFinKw;
                liteFn$frontend$rejectMisplacedTag(lite_source, lite_afterFinKw, lite_prefix, "block tag cannot appear after finally");
                const lite_finOpen = liteFn$frontend$expectSymbol(lite_source, lite_afterFinKw, "{", lite_prefix);
                void lite_finOpen;
                const lite_loopFinCtx = { id: lite_loopId, tag: lite_condParseTag, kind: "loop", phase: "finally", iifeDepth: lite_loopDepth, valKind: lite_resolvedPreThenKind, valVar: lite_loopValVar, label: lite_loopLabel, iterLabel: "", countVar: lite_loopCountVar, itemVar: lite_loopItemMetaVar, itemKind: lite_finalSeqItemKind, indexVar: lite_loopIdxVar, hasIndex: lite_finalIsSeqLoop };
                void lite_loopFinCtx;
                const lite_finBarrierCtx = { id: 0n, tag: "", kind: "finally", phase: "finally", iifeDepth: lite_loopDepth, valKind: "Unit", valVar: "", label: "", iterLabel: "", countVar: "", itemVar: "", itemKind: "", indexVar: "", hasIndex: false };
                void lite_finBarrierCtx;
                const lite_loopFinCtxs: { id: bigint; tag: string; kind: string; phase: string; iifeDepth: bigint; valKind: string; valVar: string; label: string; iterLabel: string; countVar: string; itemVar: string; itemKind: string; indexVar: string; hasIndex: boolean }[] = [...(liteFn$frontend$appendCtx([...(liteFn$frontend$appendCtx([...(lite_ctxs)], lite_loopFinCtx))], lite_finBarrierCtx))];
                void lite_loopFinCtxs;
                const lite_finParsed = liteFn$frontend$parseBinaryCtx(lite_target, lite_source, lite$subtractInt(lite_finOpen, 1n, 291022), lite_prefix, [...(lite_locals)], [...(lite_functions)], [...(lite_params)], lite_currentName, "", 0n, [...(lite_loopFinCtxs)], lite_loopDepth, lite_inferMode, "finally");
                void lite_finParsed;
                const lite_afterFinClose = liteFn$frontend$skipTrivia(lite_source, (lite_finParsed).next, lite_prefix);
                void lite_afterFinClose;
                if (liteFn$lib$core$text$wordAt(lite_source, lite_afterFinClose, "then")) {
                    liteFn$frontend$failAt(lite_source, lite_afterFinClose, lite_prefix, "then must appear before finally");
                }
                if (liteFn$lib$core$text$wordAt(lite_source, lite_afterFinClose, "finally")) {
                    liteFn$frontend$failAt(lite_source, lite_afterFinClose, lite_prefix, "duplicate finally block");
                }
                const lite_finalLoopKind = (Boolean((((lite_finParsed).kind) === ("Never"))) ? "Never" : (lite_left).kind);
                void lite_finalLoopKind;
                if (lite_inferMode) {
                    const lite_mergedLoopMarkers = liteFn$frontend$collectParsedMarkers(liteFn$frontend$collectParsedMarkers("", lite_left), lite_finParsed);
                    void lite_mergedLoopMarkers;
                    lite_left = liteFn$frontend$withMarkers({ kind: lite_finalLoopKind, code: "", intValue: 0n, textValue: "", constant: false, next: (lite_finParsed).next }, lite_mergedLoopMarkers);
                } else {
                    lite_left = { kind: lite_finalLoopKind, code: (((((((("(() => { try { ") + (lite_loopIifeBody))) + (" } finally { "))) + ((lite_finParsed).code))) + (" } })()")), intValue: 0n, textValue: "", constant: false, next: (lite_finParsed).next };
                }
            }
        } else if (((lite_condParseKind) !== (""))) {
            const lite_rawCondEnd = (Boolean(((lite_condParseKind) === ("if"))) ? liteFn$frontend$scanRawIfChainEnd(lite_source, lite_condParseStart, lite_prefix, true) : (() => { const lite_openMatchCheck = liteFn$frontend$skipTrivia(lite_source, lite$addInt(lite_condParseStart, 5n, 292433), lite_prefix); void lite_openMatchCheck; void (liteFn$frontend$rejectMisplacedTag(lite_source, lite_openMatchCheck, lite_prefix, "block tag cannot appear before { in match")); if (((((lite_openMatchCheck) >= (liteFn$lib$core$text$length(lite_source)))) || (((liteFn$lib$core$text$at(lite_source, lite_openMatchCheck)) !== ("{"))))) { void (liteFn$frontend$unsupportedFeature(lite_source, lite_condParseStart, "match", lite_prefix)); } return liteFn$frontend$scanRawMatchEnd(lite_source, lite_condParseStart, lite_prefix); })());
            void lite_rawCondEnd;
            const lite_afterRawCond = (Boolean(((lite_rawCondEnd) >= (0n))) ? liteFn$frontend$skipTrivia(lite_source, lite_rawCondEnd, lite_prefix) : (-1n));
            void lite_afterRawCond;
            const lite_hasActualThen = ((((lite_afterRawCond) >= (0n))) && (liteFn$lib$core$text$wordAt(lite_source, lite_afterRawCond, "then")));
            void lite_hasActualThen;
            const lite_afterOptThen = (Boolean(lite_hasActualThen) ? liteFn$frontend$scanTrailingThenEnd(lite_source, lite_rawCondEnd, lite_prefix, false) : lite_rawCondEnd);
            void lite_afterOptThen;
            const lite_afterOptThenTrivia = (Boolean(((lite_afterOptThen) >= (0n))) ? liteFn$frontend$skipTrivia(lite_source, lite_afterOptThen, lite_prefix) : (-1n));
            void lite_afterOptThenTrivia;
            const lite_hasActualFinally = ((((lite_afterOptThenTrivia) >= (0n))) && (liteFn$lib$core$text$wordAt(lite_source, lite_afterOptThenTrivia, "finally")));
            void lite_hasActualFinally;
            if (((lite_hasActualFinally) && (((lite_target) !== ("ts"))))) {
                liteFn$frontend$failAt(lite_source, lite_afterOptThenTrivia, lite_prefix, "C backend does not support finally blocks yet");
            }
            if (((((lite_condParseKind) === ("match"))) && (((lite_target) !== ("ts"))))) {
                liteFn$frontend$failAt(lite_source, lite_condParseStart, lite_prefix, "C backend does not support value match expressions yet");
            }
            const lite_useIifeCond = ((((((lite_condParseTag) !== (""))) || (lite_hasActualThen))) || (lite_hasActualFinally));
            void lite_useIifeCond;
            if (((((lite_useIifeCond) && (((lite_condParseKind) === ("if"))))) && (((lite_target) !== ("ts"))))) {
                if (((lite_condParseTag) !== (""))) {
                    liteFn$frontend$failAt(lite_source, lite_condParseTagAt, lite_prefix, "C backend does not support tagged conditionals yet");
                } else {
                    liteFn$frontend$failAt(lite_source, lite_condParseStart, lite_prefix, "C backend does not support conditional then blocks yet");
                }
            }
            if ((!(lite_useIifeCond))) {
                const lite_condBarrierCtxs: { id: bigint; tag: string; kind: string; phase: string; iifeDepth: bigint; valKind: string; valVar: string; label: string; iterLabel: string; countVar: string; itemVar: string; itemKind: string; indexVar: string; hasIndex: boolean }[] = [...(liteFn$frontend$appendCtx([...(lite_ctxs)], { id: 0n, tag: "", kind: lite_condParseKind, phase: "body", iifeDepth: lite_iifeDepth, valKind: "", valVar: "", label: "", iterLabel: "", countVar: "", itemVar: "", itemKind: "", indexVar: "", hasIndex: false }))];
                void lite_condBarrierCtxs;
                if (((lite_condParseKind) === ("if"))) {
                    let lite_cursor = liteFn$frontend$skipTrivia(lite_source, lite$addInt(lite_condParseStart, 2n, 294581), lite_prefix);
                    void lite_cursor;
                    let lite_ifMarkers = "";
                    void lite_ifMarkers;
                    liteFn$frontend$rejectHeaderBlockTag(lite_source, lite_cursor, lite_prefix, "if");
                    const lite_conditionStart = lite_cursor;
                    void lite_conditionStart;
                    const lite_condition = liteFn$frontend$parseBinaryCtx(lite_target, lite_source, lite_cursor, lite_prefix, [...(lite_locals)], [...(lite_functions)], [...(lite_params)], lite_currentName, "", 0n, [...(lite_condBarrierCtxs)], lite_iifeDepth, lite_inferMode, "");
                    void lite_condition;
                    if (lite_inferMode) {
                        lite_ifMarkers = liteFn$frontend$collectParsedMarkers(lite_ifMarkers, lite_condition);
                    }
                    if ((((lite_condition).kind) !== ("Bool"))) {
                        liteFn$frontend$failAt(lite_source, lite_conditionStart, lite_prefix, "if condition must be Bool");
                    }
                    const lite_conditionCode = (Boolean((lite_condition).constant) ? liteFn$frontend$targetBoolLiteralCode(lite_target, (((lite_condition).intValue) !== (0n))) : (lite_condition).code);
                    void lite_conditionCode;
                    const lite_beforeFirstOpen = liteFn$frontend$skipTrivia(lite_source, (lite_condition).next, lite_prefix);
                    void lite_beforeFirstOpen;
                    liteFn$frontend$rejectMisplacedTag(lite_source, lite_beforeFirstOpen, lite_prefix, "block tag cannot appear before { in if");
                    lite_cursor = liteFn$frontend$expectSymbol(lite_source, lite_beforeFirstOpen, "{", lite_prefix);
                    const lite_first = liteFn$frontend$parseBinaryCtx(lite_target, lite_source, lite$subtractInt(lite_cursor, 1n, 295674), lite_prefix, [...(lite_locals)], [...(lite_functions)], [...(lite_params)], lite_currentName, lite_expected, 0n, [...(lite_condBarrierCtxs)], lite_iifeDepth, lite_inferMode, "branch");
                    void lite_first;
                    if (lite_inferMode) {
                        lite_ifMarkers = liteFn$frontend$collectParsedMarkers(lite_ifMarkers, lite_first);
                    }
                    lite_cursor = (lite_first).next;
                    const lite_conditionCodes: string[] = [...([])];
                    void lite_conditionCodes;
                    const lite_branchCodes: string[] = [...([])];
                    void lite_branchCodes;
                    const lite_branchKinds: string[] = [...([])];
                    void lite_branchKinds;
                    lite_conditionCodes.push(lite_conditionCode);
                    lite_branchCodes.push((lite_first).code);
                    lite_branchKinds.push((lite_first).kind);
                    let lite_resultKind = (lite_first).kind;
                    void lite_resultKind;
                    let lite_branchCount = 1n;
                    void lite_branchCount;
                    while (Boolean(true)) {
                        const lite_afterBranch = liteFn$frontend$skipTrivia(lite_source, lite_cursor, lite_prefix);
                        void lite_afterBranch;
                        if ((!(liteFn$lib$core$text$wordAt(lite_source, lite_afterBranch, "else")))) {
                            if (((((lite_minimum) >= (0n))) || ((((((lite_minimum) === ((-2n)))) && (((lite_resultKind) !== ("Unit")))))))) {
                                liteFn$frontend$failAt(lite_source, lite_afterBranch, lite_prefix, "value if requires a final else");
                            }
                            if (((lite_resultKind) === ("Never"))) {
                                if (((((lite_expected) === (""))) || (liteFn$lib$core$text$startsWithAt(lite_expected, 0n, "TailList<")))) {
                                    liteFn$frontend$failAt(lite_source, lite_condParseStart, lite_prefix, "partial conditional declaration needs a normally completing value branch; add else");
                                }
                                lite_resultKind = lite_expected;
                            }
                            const lite_fallback = liteFn$frontend$zeroParsed(lite_target, lite_resultKind, lite_cursor);
                            void lite_fallback;
                            lite_branchCodes.push((lite_fallback).code);
                            lite_branchKinds.push(lite_resultKind);
                            lite_branchCount = lite$addInt(lite_branchCount, 1n, 297419);
                            break;
                        }
                        const lite_afterElse = liteFn$frontend$skipTrivia(lite_source, lite$addInt(lite_afterBranch, 4n, 297541), lite_prefix);
                        void lite_afterElse;
                        liteFn$frontend$rejectMisplacedTag(lite_source, lite_afterElse, lite_prefix, "block tag cannot appear after else");
                        if (liteFn$lib$core$text$wordAt(lite_source, lite_afterElse, "if")) {
                            const lite_elseConditionStart = liteFn$frontend$skipTrivia(lite_source, lite$addInt(lite_afterElse, 2n, 297800), lite_prefix);
                            void lite_elseConditionStart;
                            liteFn$frontend$rejectHeaderBlockTag(lite_source, lite_elseConditionStart, lite_prefix, "else if");
                            const lite_elseCondition = liteFn$frontend$parseBinaryCtx(lite_target, lite_source, lite_elseConditionStart, lite_prefix, [...(lite_locals)], [...(lite_functions)], [...(lite_params)], lite_currentName, "", 0n, [...(lite_condBarrierCtxs)], lite_iifeDepth, lite_inferMode, "");
                            void lite_elseCondition;
                            if (lite_inferMode) {
                                lite_ifMarkers = liteFn$frontend$collectParsedMarkers(lite_ifMarkers, lite_elseCondition);
                            }
                            if ((((lite_elseCondition).kind) !== ("Bool"))) {
                                liteFn$frontend$failAt(lite_source, lite_elseConditionStart, lite_prefix, "if condition must be Bool");
                            }
                            const lite_elseConditionCode = (Boolean((lite_elseCondition).constant) ? liteFn$frontend$targetBoolLiteralCode(lite_target, (((lite_elseCondition).intValue) !== (0n))) : (lite_elseCondition).code);
                            void lite_elseConditionCode;
                            const lite_beforeElseIfOpen = liteFn$frontend$skipTrivia(lite_source, (lite_elseCondition).next, lite_prefix);
                            void lite_beforeElseIfOpen;
                            liteFn$frontend$rejectMisplacedTag(lite_source, lite_beforeElseIfOpen, lite_prefix, "block tag cannot appear before { in else if");
                            const lite_open = liteFn$frontend$expectSymbol(lite_source, lite_beforeElseIfOpen, "{", lite_prefix);
                            void lite_open;
                            const lite_elseBranchStart = liteFn$frontend$skipTrivia(lite_source, lite_open, lite_prefix);
                            void lite_elseBranchStart;
                            const lite_branch = liteFn$frontend$parseBinaryCtx(lite_target, lite_source, lite$subtractInt(lite_open, 1n, 299082), lite_prefix, [...(lite_locals)], [...(lite_functions)], [...(lite_params)], lite_currentName, lite_expected, 0n, [...(lite_condBarrierCtxs)], lite_iifeDepth, lite_inferMode, "branch");
                            void lite_branch;
                            if (lite_inferMode) {
                                lite_ifMarkers = liteFn$frontend$collectParsedMarkers(lite_ifMarkers, lite_branch);
                            }
                            const lite_joinedKind = liteFn$frontend$joinBranchKind(lite_resultKind, (lite_branch).kind);
                            void lite_joinedKind;
                            if (((lite_joinedKind) === (""))) {
                                liteFn$frontend$failAt(lite_source, lite_elseBranchStart, lite_prefix, (((((("value if branches must have the same kind, got ") + (liteFn$frontend$displayKind(lite_resultKind)))) + (" and "))) + (liteFn$frontend$displayKind((lite_branch).kind))));
                            }
                            lite_resultKind = lite_joinedKind;
                            lite_cursor = (lite_branch).next;
                            lite_conditionCodes.push(lite_elseConditionCode);
                            lite_branchCodes.push((lite_branch).code);
                            lite_branchKinds.push((lite_branch).kind);
                            lite_branchCount = lite$addInt(lite_branchCount, 1n, 300028);
                        } else {
                            const lite_open = liteFn$frontend$expectSymbol(lite_source, lite_afterElse, "{", lite_prefix);
                            void lite_open;
                            const lite_elseBranchStart = liteFn$frontend$skipTrivia(lite_source, lite_open, lite_prefix);
                            void lite_elseBranchStart;
                            const lite_branch = liteFn$frontend$parseBinaryCtx(lite_target, lite_source, lite$subtractInt(lite_open, 1n, 300277), lite_prefix, [...(lite_locals)], [...(lite_functions)], [...(lite_params)], lite_currentName, lite_expected, 0n, [...(lite_condBarrierCtxs)], lite_iifeDepth, lite_inferMode, "branch");
                            void lite_branch;
                            if (lite_inferMode) {
                                lite_ifMarkers = liteFn$frontend$collectParsedMarkers(lite_ifMarkers, lite_branch);
                            }
                            const lite_joinedKind = liteFn$frontend$joinBranchKind(lite_resultKind, (lite_branch).kind);
                            void lite_joinedKind;
                            if (((lite_joinedKind) === (""))) {
                                liteFn$frontend$failAt(lite_source, lite_elseBranchStart, lite_prefix, (((((("value if branches must have the same kind, got ") + (liteFn$frontend$displayKind(lite_resultKind)))) + (" and "))) + (liteFn$frontend$displayKind((lite_branch).kind))));
                            }
                            lite_resultKind = lite_joinedKind;
                            lite_cursor = (lite_branch).next;
                            lite_branchCodes.push((lite_branch).code);
                            lite_branchKinds.push((lite_branch).kind);
                            lite_branchCount = lite$addInt(lite_branchCount, 1n, 301142);
                            break;
                        }
                    }
                    const lite_code = liteFn$frontend$ternaryChainCode(lite_target, lite_resultKind, [...(lite_conditionCodes)], [...(lite_branchCodes)], [...(lite_branchKinds)], lite_branchCount);
                    void lite_code;
                    lite_left = liteFn$frontend$withMarkers({ kind: lite_resultKind, code: lite_code, intValue: 0n, textValue: "", constant: false, next: lite_cursor }, lite_ifMarkers);
                } else {
                    const lite_openMatchPos = liteFn$frontend$skipTrivia(lite_source, lite$addInt(lite_condParseStart, 5n, 301566), lite_prefix);
                    void lite_openMatchPos;
                    const lite_size = liteFn$lib$core$text$length(lite_source);
                    void lite_size;
                    let lite_cursor = liteFn$frontend$skipItemSeparators(lite_source, lite$addInt(lite_openMatchPos, 1n, 301698), lite_prefix);
                    void lite_cursor;
                    const lite_conditionCodes: string[] = [...([])];
                    void lite_conditionCodes;
                    const lite_branchCodes: string[] = [...([])];
                    void lite_branchCodes;
                    const lite_branchKinds: string[] = [...([])];
                    void lite_branchKinds;
                    let lite_matchMarkers = "";
                    void lite_matchMarkers;
                    let lite_resultKind = "";
                    void lite_resultKind;
                    let lite_branchCount = 0n;
                    void lite_branchCount;
                    let lite_sawFallback = false;
                    void lite_sawFallback;
                    while (Boolean(true)) {
                        lite_cursor = liteFn$frontend$skipItemSeparators(lite_source, lite_cursor, lite_prefix);
                        if (((lite_cursor) >= (lite_size))) {
                            liteFn$frontend$failAt(lite_source, lite_openMatchPos, lite_prefix, "expected } to close match");
                        }
                        if (((liteFn$lib$core$text$at(lite_source, lite_cursor)) === ("}"))) {
                            if ((!(lite_sawFallback))) {
                                liteFn$frontend$failAt(lite_source, lite_cursor, lite_prefix, "subjectless match requires a final _ fallback arm");
                            }
                            lite_cursor = lite$addInt(lite_cursor, 1n, 302566);
                            break;
                        }
                        if (lite_sawFallback) {
                            liteFn$frontend$failAt(lite_source, lite_cursor, lite_prefix, "match fallback _ must be the final arm");
                        }
                        const lite_afterUnderscore = liteFn$frontend$skipTrivia(lite_source, lite$addInt(lite_cursor, 1n, 302846), lite_prefix);
                        void lite_afterUnderscore;
                        if (liteFn$lib$core$text$wordAt(lite_source, lite_cursor, "_")) {
                            liteFn$frontend$rejectMisplacedTag(lite_source, lite_afterUnderscore, lite_prefix, "block tag cannot appear after _ in match arm");
                        }
                        const lite_isFallback = ((((liteFn$lib$core$text$wordAt(lite_source, lite_cursor, "_")) && (((lite_afterUnderscore) < (lite_size))))) && (((liteFn$lib$core$text$at(lite_source, lite_afterUnderscore)) === ("{"))));
                        void lite_isFallback;
                        let lite_armOpen = (-1n);
                        void lite_armOpen;
                        if (lite_isFallback) {
                            lite_armOpen = lite_afterUnderscore;
                            lite_sawFallback = true;
                        } else {
                            lite_armOpen = liteFn$frontend$scanConditionOpen(lite_source, lite_cursor, lite_prefix);
                            if (((lite_armOpen) < (0n))) {
                                liteFn$frontend$failAt(lite_source, lite_cursor, lite_prefix, "expected { after match arm condition");
                            }
                            if (((lite_armOpen) === (lite_cursor))) {
                                liteFn$frontend$failAt(lite_source, lite_cursor, lite_prefix, "match arm header requires grouping for { ... } expressions");
                            }
                            const lite_condStart = lite_cursor;
                            void lite_condStart;
                            liteFn$frontend$rejectHeaderBlockTag(lite_source, lite_condStart, lite_prefix, "match arm");
                            const lite_condition = liteFn$frontend$parseBinaryCtx(lite_target, lite_source, lite_condStart, lite_prefix, [...(lite_locals)], [...(lite_functions)], [...(lite_params)], lite_currentName, "", 0n, [...(lite_condBarrierCtxs)], lite_iifeDepth, lite_inferMode, "");
                            void lite_condition;
                            if (lite_inferMode) {
                                lite_matchMarkers = liteFn$frontend$collectParsedMarkers(lite_matchMarkers, lite_condition);
                            }
                            const lite_afterCond = liteFn$frontend$skipTrivia(lite_source, (lite_condition).next, lite_prefix);
                            void lite_afterCond;
                            liteFn$frontend$rejectMisplacedTag(lite_source, lite_afterCond, lite_prefix, "block tag cannot appear before { in match arm");
                            if (((lite_afterCond) > (lite_armOpen))) {
                                liteFn$frontend$failAt(lite_source, lite_armOpen, lite_prefix, "ungrouped { in match arm header starts the arm body; parenthesize block or conditional expressions");
                            }
                            if (((lite_afterCond) !== (lite_armOpen))) {
                                const lite__ = liteFn$frontend$expectSymbol(lite_source, lite_afterCond, "{", lite_prefix);
                                void lite__;
                            }
                            if ((((lite_condition).kind) !== ("Bool"))) {
                                liteFn$frontend$failAt(lite_source, lite_condStart, lite_prefix, "match arm condition must be Bool");
                            }
                            const lite_conditionCode = (Boolean((lite_condition).constant) ? liteFn$frontend$targetBoolLiteralCode(lite_target, (((lite_condition).intValue) !== (0n))) : (lite_condition).code);
                            void lite_conditionCode;
                            lite_conditionCodes.push(lite_conditionCode);
                        }
                        const lite_armBodyStart = liteFn$frontend$skipTrivia(lite_source, lite$addInt(lite_armOpen, 1n, 305466), lite_prefix);
                        void lite_armBodyStart;
                        const lite_branch = liteFn$frontend$parseBinaryCtx(lite_target, lite_source, lite_armOpen, lite_prefix, [...(lite_locals)], [...(lite_functions)], [...(lite_params)], lite_currentName, lite_expected, 0n, [...(lite_condBarrierCtxs)], lite_iifeDepth, lite_inferMode, "branch");
                        void lite_branch;
                        if (lite_inferMode) {
                            lite_matchMarkers = liteFn$frontend$collectParsedMarkers(lite_matchMarkers, lite_branch);
                        }
                        const lite_joinedKind = liteFn$frontend$joinBranchKind(lite_resultKind, (lite_branch).kind);
                        void lite_joinedKind;
                        if (((lite_joinedKind) === (""))) {
                            liteFn$frontend$failAt(lite_source, lite_armBodyStart, lite_prefix, (((((("value match arms must have the same kind, got ") + (liteFn$frontend$displayKind(lite_resultKind)))) + (" and "))) + (liteFn$frontend$displayKind((lite_branch).kind))));
                        }
                        lite_resultKind = lite_joinedKind;
                        lite_branchCodes.push((lite_branch).code);
                        lite_branchKinds.push((lite_branch).kind);
                        lite_branchCount = lite$addInt(lite_branchCount, 1n, 306316);
                        lite_cursor = (lite_branch).next;
                    }
                    const lite_code = liteFn$frontend$ternaryChainCode(lite_target, lite_resultKind, [...(lite_conditionCodes)], [...(lite_branchCodes)], [...(lite_branchKinds)], lite_branchCount);
                    void lite_code;
                    lite_left = liteFn$frontend$withMarkers({ kind: lite_resultKind, code: lite_code, intValue: 0n, textValue: "", constant: false, next: lite_cursor }, lite_matchMarkers);
                }
            } else {
                const lite_condId = liteFn$frontend$nextCtxId([...(lite_ctxs)]);
                void lite_condId;
                const lite_condValVar = (("lite$val") + (liteFn$lib$core$int$intText(lite_condId)));
                void lite_condValVar;
                const lite_condLabel = (("lite$b") + (liteFn$lib$core$int$intText(lite_condId)));
                void lite_condLabel;
                const lite_condDepth = lite$addInt(lite_iifeDepth, 1n, 306875);
                void lite_condDepth;
                const lite_normExpected = (Boolean(((((lite_expected) === ("Unit"))) || (((lite_expected) === ("Never"))))) ? "" : (Boolean(liteFn$lib$core$text$startsWithAt(lite_expected, 0n, "TailList<")) ? (((("List<") + (liteFn$frontend$listElementKind(liteFn$lib$core$text$slice(lite_expected, 4n, liteFn$lib$core$text$length(lite_expected)))))) + (">")) : lite_expected));
                void lite_normExpected;
                const lite_condHintExpected = (Boolean(lite_hasActualThen) ? "" : lite_normExpected);
                void lite_condHintExpected;
                const lite_condTagDisplay = (Boolean(((lite_condParseTag) !== (""))) ? lite_condParseTag : lite_condParseKind);
                void lite_condTagDisplay;
                const lite_passCount = (Boolean(lite_inferMode) ? 1n : 2n);
                void lite_passCount;
                let lite_resolvedPreThenKind = "";
                void lite_resolvedPreThenKind;
                let lite_condOuterMarkers = "";
                void lite_condOuterMarkers;
                let lite_condEndCursor = lite_condParseStart;
                void lite_condEndCursor;
                let lite_condStmtCode = "";
                void lite_condStmtCode;
                let lite_pass = 1n;
                void lite_pass;
                while (((lite_pass) <= (lite_passCount))) {
                    const lite_isPass1 = ((lite_pass) === (1n));
                    void lite_isPass1;
                    const lite_passInfer = ((lite_isPass1) || (lite_inferMode));
                    void lite_passInfer;
                    const lite_passCtxValKind = (Boolean(lite_isPass1) ? (Boolean(((lite_condHintExpected) === (""))) ? "__infer__" : (("__infer__:") + (lite_condHintExpected))) : lite_resolvedPreThenKind);
                    void lite_passCtxValKind;
                    const lite_condCtx = { id: lite_condId, tag: lite_condParseTag, kind: lite_condParseKind, phase: "body", iifeDepth: lite_condDepth, valKind: lite_passCtxValKind, valVar: lite_condValVar, label: lite_condLabel, iterLabel: "", countVar: "", itemVar: "", itemKind: "", indexVar: "", hasIndex: false };
                    void lite_condCtx;
                    const lite_condPassCtxs: { id: bigint; tag: string; kind: string; phase: string; iifeDepth: bigint; valKind: string; valVar: string; label: string; iterLabel: string; countVar: string; itemVar: string; itemKind: string; indexVar: string; hasIndex: boolean }[] = [...(liteFn$frontend$appendCtx([...(lite_ctxs)], lite_condCtx))];
                    void lite_condPassCtxs;
                    const lite_passBranchExpected = (Boolean(lite_isPass1) ? lite_condHintExpected : (Boolean(((((lite_resolvedPreThenKind) === ("Unit"))) || (((lite_resolvedPreThenKind) === ("Never"))))) ? "" : lite_resolvedPreThenKind));
                    void lite_passBranchExpected;
                    let lite_passMarkers = "";
                    void lite_passMarkers;
                    const lite_passCondCodes: string[] = [...([])];
                    void lite_passCondCodes;
                    const lite_passBranchCodes: string[] = [...([])];
                    void lite_passBranchCodes;
                    const lite_passBranchKinds: string[] = [...([])];
                    void lite_passBranchKinds;
                    let lite_passResultKind = "";
                    void lite_passResultKind;
                    let lite_passBranchCount = 0n;
                    void lite_passBranchCount;
                    let lite_passHasElse = false;
                    void lite_passHasElse;
                    let lite_passPartialNoElseAt = (-1n);
                    void lite_passPartialNoElseAt;
                    let lite_cursor = 0n;
                    void lite_cursor;
                    if (((lite_condParseKind) === ("if"))) {
                        lite_cursor = liteFn$frontend$skipTrivia(lite_source, lite$addInt(lite_condParseStart, 2n, 309176), lite_prefix);
                        liteFn$frontend$rejectHeaderBlockTag(lite_source, lite_cursor, lite_prefix, "if");
                        const lite_condStart0 = lite_cursor;
                        void lite_condStart0;
                        const lite_cond0 = liteFn$frontend$parseBinaryCtx(lite_target, lite_source, lite_condStart0, lite_prefix, [...(lite_locals)], [...(lite_functions)], [...(lite_params)], lite_currentName, "", 0n, [...(lite_condPassCtxs)], lite_condDepth, lite_passInfer, "");
                        void lite_cond0;
                        if (lite_passInfer) {
                            lite_passMarkers = liteFn$frontend$collectParsedMarkers(lite_passMarkers, lite_cond0);
                        }
                        if ((((lite_cond0).kind) !== ("Bool"))) {
                            liteFn$frontend$failAt(lite_source, lite_condStart0, lite_prefix, "if condition must be Bool");
                        }
                        const lite_cond0Code = (Boolean((lite_cond0).constant) ? liteFn$frontend$targetBoolLiteralCode(lite_target, (((lite_cond0).intValue) !== (0n))) : (lite_cond0).code);
                        void lite_cond0Code;
                        const lite_beforeFirstOpen = liteFn$frontend$skipTrivia(lite_source, (lite_cond0).next, lite_prefix);
                        void lite_beforeFirstOpen;
                        liteFn$frontend$rejectMisplacedTag(lite_source, lite_beforeFirstOpen, lite_prefix, "block tag cannot appear before { in if");
                        lite_cursor = liteFn$frontend$expectSymbol(lite_source, lite_beforeFirstOpen, "{", lite_prefix);
                        const lite_first = liteFn$frontend$parseBinaryCtx(lite_target, lite_source, lite$subtractInt(lite_cursor, 1n, 310261), lite_prefix, [...(lite_locals)], [...(lite_functions)], [...(lite_params)], lite_currentName, lite_passBranchExpected, 0n, [...(lite_condPassCtxs)], lite_condDepth, lite_passInfer, "branch");
                        void lite_first;
                        if (lite_passInfer) {
                            lite_passMarkers = liteFn$frontend$collectParsedMarkers(lite_passMarkers, lite_first);
                        }
                        lite_cursor = (lite_first).next;
                        lite_passCondCodes.push(lite_cond0Code);
                        lite_passBranchCodes.push((lite_first).code);
                        lite_passBranchKinds.push((lite_first).kind);
                        lite_passResultKind = (lite_first).kind;
                        lite_passBranchCount = 1n;
                        while (Boolean(true)) {
                            const lite_afterBranch = liteFn$frontend$skipTrivia(lite_source, lite_cursor, lite_prefix);
                            void lite_afterBranch;
                            if ((!(liteFn$lib$core$text$wordAt(lite_source, lite_afterBranch, "else")))) {
                                if (((lite_hasActualThen) || (((lite_minimum) >= (0n))))) {
                                    liteFn$frontend$failAt(lite_source, lite_afterBranch, lite_prefix, "value if requires a final else");
                                }
                                lite_passPartialNoElseAt = lite_afterBranch;
                                break;
                            }
                            const lite_afterElse = liteFn$frontend$skipTrivia(lite_source, lite$addInt(lite_afterBranch, 4n, 311390), lite_prefix);
                            void lite_afterElse;
                            liteFn$frontend$rejectMisplacedTag(lite_source, lite_afterElse, lite_prefix, "block tag cannot appear after else");
                            if (liteFn$lib$core$text$wordAt(lite_source, lite_afterElse, "if")) {
                                const lite_elseCondStart = liteFn$frontend$skipTrivia(lite_source, lite$addInt(lite_afterElse, 2n, 311656), lite_prefix);
                                void lite_elseCondStart;
                                liteFn$frontend$rejectHeaderBlockTag(lite_source, lite_elseCondStart, lite_prefix, "else if");
                                const lite_elseCond = liteFn$frontend$parseBinaryCtx(lite_target, lite_source, lite_elseCondStart, lite_prefix, [...(lite_locals)], [...(lite_functions)], [...(lite_params)], lite_currentName, "", 0n, [...(lite_condPassCtxs)], lite_condDepth, lite_passInfer, "");
                                void lite_elseCond;
                                if (lite_passInfer) {
                                    lite_passMarkers = liteFn$frontend$collectParsedMarkers(lite_passMarkers, lite_elseCond);
                                }
                                if ((((lite_elseCond).kind) !== ("Bool"))) {
                                    liteFn$frontend$failAt(lite_source, lite_elseCondStart, lite_prefix, "if condition must be Bool");
                                }
                                const lite_elseCondCode = (Boolean((lite_elseCond).constant) ? liteFn$frontend$targetBoolLiteralCode(lite_target, (((lite_elseCond).intValue) !== (0n))) : (lite_elseCond).code);
                                void lite_elseCondCode;
                                const lite_beforeElseIfOpen = liteFn$frontend$skipTrivia(lite_source, (lite_elseCond).next, lite_prefix);
                                void lite_beforeElseIfOpen;
                                liteFn$frontend$rejectMisplacedTag(lite_source, lite_beforeElseIfOpen, lite_prefix, "block tag cannot appear before { in else if");
                                const lite_open = liteFn$frontend$expectSymbol(lite_source, lite_beforeElseIfOpen, "{", lite_prefix);
                                void lite_open;
                                const lite_elseBranchStart = liteFn$frontend$skipTrivia(lite_source, lite_open, lite_prefix);
                                void lite_elseBranchStart;
                                const lite_branch = liteFn$frontend$parseBinaryCtx(lite_target, lite_source, lite$subtractInt(lite_open, 1n, 312948), lite_prefix, [...(lite_locals)], [...(lite_functions)], [...(lite_params)], lite_currentName, lite_passBranchExpected, 0n, [...(lite_condPassCtxs)], lite_condDepth, lite_passInfer, "branch");
                                void lite_branch;
                                if (lite_passInfer) {
                                    lite_passMarkers = liteFn$frontend$collectParsedMarkers(lite_passMarkers, lite_branch);
                                }
                                const lite_joinedKind = liteFn$frontend$joinBranchKind(lite_passResultKind, (lite_branch).kind);
                                void lite_joinedKind;
                                if (((lite_joinedKind) === (""))) {
                                    liteFn$frontend$failAt(lite_source, lite_elseBranchStart, lite_prefix, (((((("value if branches must have the same kind, got ") + (liteFn$frontend$displayKind(lite_passResultKind)))) + (" and "))) + (liteFn$frontend$displayKind((lite_branch).kind))));
                                }
                                lite_passResultKind = lite_joinedKind;
                                lite_cursor = (lite_branch).next;
                                lite_passCondCodes.push(lite_elseCondCode);
                                lite_passBranchCodes.push((lite_branch).code);
                                lite_passBranchKinds.push((lite_branch).kind);
                                lite_passBranchCount = lite$addInt(lite_passBranchCount, 1n, 313975);
                            } else {
                                lite_passHasElse = true;
                                const lite_open = liteFn$frontend$expectSymbol(lite_source, lite_afterElse, "{", lite_prefix);
                                void lite_open;
                                const lite_elseBranchStart = liteFn$frontend$skipTrivia(lite_source, lite_open, lite_prefix);
                                void lite_elseBranchStart;
                                const lite_branch = liteFn$frontend$parseBinaryCtx(lite_target, lite_source, lite$subtractInt(lite_open, 1n, 314288), lite_prefix, [...(lite_locals)], [...(lite_functions)], [...(lite_params)], lite_currentName, lite_passBranchExpected, 0n, [...(lite_condPassCtxs)], lite_condDepth, lite_passInfer, "branch");
                                void lite_branch;
                                if (lite_passInfer) {
                                    lite_passMarkers = liteFn$frontend$collectParsedMarkers(lite_passMarkers, lite_branch);
                                }
                                const lite_joinedKind = liteFn$frontend$joinBranchKind(lite_passResultKind, (lite_branch).kind);
                                void lite_joinedKind;
                                if (((lite_joinedKind) === (""))) {
                                    liteFn$frontend$failAt(lite_source, lite_elseBranchStart, lite_prefix, (((((("value if branches must have the same kind, got ") + (liteFn$frontend$displayKind(lite_passResultKind)))) + (" and "))) + (liteFn$frontend$displayKind((lite_branch).kind))));
                                }
                                lite_passResultKind = lite_joinedKind;
                                lite_cursor = (lite_branch).next;
                                lite_passBranchCodes.push((lite_branch).code);
                                lite_passBranchKinds.push((lite_branch).kind);
                                lite_passBranchCount = lite$addInt(lite_passBranchCount, 1n, 315236);
                                break;
                            }
                        }
                    } else {
                        const lite_openMatchPos = liteFn$frontend$skipTrivia(lite_source, lite$addInt(lite_condParseStart, 5n, 315419), lite_prefix);
                        void lite_openMatchPos;
                        const lite_size = liteFn$lib$core$text$length(lite_source);
                        void lite_size;
                        lite_cursor = liteFn$frontend$skipItemSeparators(lite_source, lite$addInt(lite_openMatchPos, 1n, 315554), lite_prefix);
                        let lite_sawFallback = false;
                        void lite_sawFallback;
                        while (Boolean(true)) {
                            lite_cursor = liteFn$frontend$skipItemSeparators(lite_source, lite_cursor, lite_prefix);
                            if (((lite_cursor) >= (lite_size))) {
                                liteFn$frontend$failAt(lite_source, lite_openMatchPos, lite_prefix, "expected } to close match");
                            }
                            if (((liteFn$lib$core$text$at(lite_source, lite_cursor)) === ("}"))) {
                                if ((!(lite_sawFallback))) {
                                    liteFn$frontend$failAt(lite_source, lite_cursor, lite_prefix, "subjectless match requires a final _ fallback arm");
                                }
                                lite_cursor = lite$addInt(lite_cursor, 1n, 316191);
                                break;
                            }
                            if (lite_sawFallback) {
                                liteFn$frontend$failAt(lite_source, lite_cursor, lite_prefix, "match fallback _ must be the final arm");
                            }
                            const lite_afterUnderscore = liteFn$frontend$skipTrivia(lite_source, lite$addInt(lite_cursor, 1n, 316495), lite_prefix);
                            void lite_afterUnderscore;
                            if (liteFn$lib$core$text$wordAt(lite_source, lite_cursor, "_")) {
                                liteFn$frontend$rejectMisplacedTag(lite_source, lite_afterUnderscore, lite_prefix, "block tag cannot appear after _ in match arm");
                            }
                            const lite_isFallback = ((((liteFn$lib$core$text$wordAt(lite_source, lite_cursor, "_")) && (((lite_afterUnderscore) < (lite_size))))) && (((liteFn$lib$core$text$at(lite_source, lite_afterUnderscore)) === ("{"))));
                            void lite_isFallback;
                            let lite_armOpen = (-1n);
                            void lite_armOpen;
                            if (lite_isFallback) {
                                lite_armOpen = lite_afterUnderscore;
                                lite_sawFallback = true;
                                lite_passHasElse = true;
                            } else {
                                lite_armOpen = liteFn$frontend$scanConditionOpen(lite_source, lite_cursor, lite_prefix);
                                if (((lite_armOpen) < (0n))) {
                                    liteFn$frontend$failAt(lite_source, lite_cursor, lite_prefix, "expected { after match arm condition");
                                }
                                if (((lite_armOpen) === (lite_cursor))) {
                                    liteFn$frontend$failAt(lite_source, lite_cursor, lite_prefix, "match arm header requires grouping for { ... } expressions");
                                }
                                const lite_condStart = lite_cursor;
                                void lite_condStart;
                                liteFn$frontend$rejectHeaderBlockTag(lite_source, lite_condStart, lite_prefix, "match arm");
                                const lite_condParsed = liteFn$frontend$parseBinaryCtx(lite_target, lite_source, lite_condStart, lite_prefix, [...(lite_locals)], [...(lite_functions)], [...(lite_params)], lite_currentName, "", 0n, [...(lite_condPassCtxs)], lite_condDepth, lite_passInfer, "");
                                void lite_condParsed;
                                if (lite_passInfer) {
                                    lite_passMarkers = liteFn$frontend$collectParsedMarkers(lite_passMarkers, lite_condParsed);
                                }
                                const lite_afterCond = liteFn$frontend$skipTrivia(lite_source, (lite_condParsed).next, lite_prefix);
                                void lite_afterCond;
                                liteFn$frontend$rejectMisplacedTag(lite_source, lite_afterCond, lite_prefix, "block tag cannot appear before { in match arm");
                                if (((lite_afterCond) > (lite_armOpen))) {
                                    liteFn$frontend$failAt(lite_source, lite_armOpen, lite_prefix, "ungrouped { in match arm header starts the arm body; parenthesize block or conditional expressions");
                                }
                                if (((lite_afterCond) !== (lite_armOpen))) {
                                    const lite__ = liteFn$frontend$expectSymbol(lite_source, lite_afterCond, "{", lite_prefix);
                                    void lite__;
                                }
                                if ((((lite_condParsed).kind) !== ("Bool"))) {
                                    liteFn$frontend$failAt(lite_source, lite_condStart, lite_prefix, "match arm condition must be Bool");
                                }
                                const lite_condCode = (Boolean((lite_condParsed).constant) ? liteFn$frontend$targetBoolLiteralCode(lite_target, (((lite_condParsed).intValue) !== (0n))) : (lite_condParsed).code);
                                void lite_condCode;
                                lite_passCondCodes.push(lite_condCode);
                            }
                            const lite_armBodyStart = liteFn$frontend$skipTrivia(lite_source, lite$addInt(lite_armOpen, 1n, 319314), lite_prefix);
                            void lite_armBodyStart;
                            const lite_branch = liteFn$frontend$parseBinaryCtx(lite_target, lite_source, lite_armOpen, lite_prefix, [...(lite_locals)], [...(lite_functions)], [...(lite_params)], lite_currentName, lite_passBranchExpected, 0n, [...(lite_condPassCtxs)], lite_condDepth, lite_passInfer, "branch");
                            void lite_branch;
                            if (lite_passInfer) {
                                lite_passMarkers = liteFn$frontend$collectParsedMarkers(lite_passMarkers, lite_branch);
                            }
                            const lite_joinedKind = liteFn$frontend$joinBranchKind(lite_passResultKind, (lite_branch).kind);
                            void lite_joinedKind;
                            if (((lite_joinedKind) === (""))) {
                                liteFn$frontend$failAt(lite_source, lite_armBodyStart, lite_prefix, (((((("value match arms must have the same kind, got ") + (liteFn$frontend$displayKind(lite_passResultKind)))) + (" and "))) + (liteFn$frontend$displayKind((lite_branch).kind))));
                            }
                            lite_passResultKind = lite_joinedKind;
                            lite_passBranchCodes.push((lite_branch).code);
                            lite_passBranchKinds.push((lite_branch).kind);
                            lite_passBranchCount = lite$addInt(lite_passBranchCount, 1n, 320241);
                            lite_cursor = (lite_branch).next;
                        }
                    }
                    if (lite_isPass1) {
                        let lite_bIdx = 0n;
                        void lite_bIdx;
                        let lite_allBranchesNever = true;
                        void lite_allBranchesNever;
                        while (((lite_bIdx) < (lite_passBranchCount))) {
                            const lite_bKind = lite$listAt((lite_passBranchKinds), lite_bIdx, 320545);
                            void lite_bKind;
                            if (((lite_bKind) !== ("Never"))) {
                                lite_allBranchesNever = false;
                                lite_passMarkers = ((((((((lite_passMarkers) + (liteFn$lib$core$int$intText(lite_condId)))) + ("="))) + (lite_bKind))) + ("\n"));
                            }
                            lite_bIdx = lite$addInt(lite_bIdx, 1n, 320817);
                        }
                        if (lite_passHasElse) {
                            lite_resolvedPreThenKind = liteFn$frontend$inferKindFromMarkers(lite_passMarkers, lite_condId, lite_condTagDisplay, lite_source, lite_condParseTagAt, lite_prefix, lite_allBranchesNever);
                        } else {
                            const lite_partialStopped = (Boolean(((lite_minimum) === ((-1n)))) ? lite_allBranchesNever : false);
                            void lite_partialStopped;
                            const lite_prePartial = liteFn$frontend$inferKindFromMarkers(lite_passMarkers, lite_condId, lite_condTagDisplay, lite_source, lite_condParseTagAt, lite_prefix, lite_partialStopped);
                            void lite_prePartial;
                            if (((lite_minimum) === ((-1n)))) {
                                if (((lite_prePartial) === ("Never"))) {
                                    if (((((lite_expected) === (""))) || (liteFn$lib$core$text$startsWithAt(lite_expected, 0n, "TailList<")))) {
                                        liteFn$frontend$failAt(lite_source, lite_condParseStart, lite_prefix, "partial conditional declaration needs a normally completing value branch; add else");
                                    }
                                    lite_resolvedPreThenKind = lite_expected;
                                } else {
                                    lite_resolvedPreThenKind = lite_prePartial;
                                }
                            } else {
                                if (((lite_prePartial) !== ("Unit"))) {
                                    liteFn$frontend$failAt(lite_source, lite_passPartialNoElseAt, lite_prefix, "value if requires a final else");
                                }
                                lite_resolvedPreThenKind = "Unit";
                            }
                        }
                        lite_condOuterMarkers = liteFn$frontend$filterOtherMarkers(lite_passMarkers, lite_condId);
                        lite_condEndCursor = lite_cursor;
                    } else {
                        let lite_rawIfStmt = "";
                        void lite_rawIfStmt;
                        if (((((((lite_condParseKind) === ("match"))) && (((lite_passBranchCount) === (1n))))) && (lite_passHasElse))) {
                            lite_rawIfStmt = liteFn$frontend$condBranchStmtCode(lite_target, lite_resolvedPreThenKind, lite_condValVar, lite$listAt((lite_passBranchKinds), 0n, 322627), lite$listAt((lite_passBranchCodes), 0n, 322647));
                        } else {
                            const lite_condCount = (Boolean(lite_passHasElse) ? lite$subtractInt(lite_passBranchCount, 1n, 322751) : lite_passBranchCount);
                            void lite_condCount;
                            let lite_cIdx = 0n;
                            void lite_cIdx;
                            while (((lite_cIdx) < (lite_condCount))) {
                                const lite_kwPrefix = (Boolean(((lite_cIdx) === (0n))) ? "if (" : " else if (");
                                void lite_kwPrefix;
                                const lite_stmtPart = liteFn$frontend$condBranchStmtCode(lite_target, lite_resolvedPreThenKind, lite_condValVar, lite$listAt((lite_passBranchKinds), lite_cIdx, 323073), lite$listAt((lite_passBranchCodes), lite_cIdx, 323096));
                                void lite_stmtPart;
                                lite_rawIfStmt = ((((((((((((lite_rawIfStmt) + (lite_kwPrefix))) + ("Boolean("))) + (lite$listAt((lite_passCondCodes), lite_cIdx, 323194)))) + (")) { "))) + (lite_stmtPart))) + (" }"));
                                lite_cIdx = lite$addInt(lite_cIdx, 1n, 323269);
                            }
                            if (lite_passHasElse) {
                                const lite_elsePart = liteFn$frontend$condBranchStmtCode(lite_target, lite_resolvedPreThenKind, lite_condValVar, lite$listAt((lite_passBranchKinds), lite$subtractInt(lite_passBranchCount, 1n, 323473), 323457), lite$listAt((lite_passBranchCodes), lite$subtractInt(lite_passBranchCount, 1n, 323511), 323495));
                                void lite_elsePart;
                                lite_rawIfStmt = ((((((lite_rawIfStmt) + (" else { "))) + (lite_elsePart))) + (" }"));
                            }
                        }
                        const lite_needsCondTry = ((((lite_condParseTag) !== (""))) && (liteFn$frontend$codeUsesTextCall(lite_rawIfStmt, (((("lite$throwTransfer(") + (liteFn$lib$core$int$intText(lite_condId)))) + (",")))));
                        void lite_needsCondTry;
                        if (lite_needsCondTry) {
                            const lite_catchAssign = (Boolean(((((lite_resolvedPreThenKind) === ("Unit"))) || (((lite_resolvedPreThenKind) === ("Never"))))) ? "" : ((lite_condValVar) + (" = lite$transferVal;")));
                            void lite_catchAssign;
                            lite_condStmtCode = (((((((((((("try { ") + (lite_rawIfStmt))) + (" } catch (lite$err) { if (lite$hasTransfer(lite$err, "))) + (liteFn$lib$core$int$intText(lite_condId)))) + (")) { "))) + (lite_catchAssign))) + (" } else { throw lite$err; } }"));
                        } else {
                            lite_condStmtCode = lite_rawIfStmt;
                        }
                    }
                    lite_pass = lite$addInt(lite_pass, 1n, 324395);
                }
                let lite_condIifeBody = "";
                void lite_condIifeBody;
                if (lite_hasActualThen) {
                    const lite_thenKwPos = liteFn$frontend$skipTrivia(lite_source, lite_condEndCursor, lite_prefix);
                    void lite_thenKwPos;
                    const lite_afterThenKw = liteFn$frontend$skipTrivia(lite_source, lite$addInt(lite_thenKwPos, 4n, 324613), lite_prefix);
                    void lite_afterThenKw;
                    liteFn$frontend$rejectMisplacedTag(lite_source, lite_afterThenKw, lite_prefix, "block tag cannot appear after then");
                    const lite_thenOpen = liteFn$frontend$expectSymbol(lite_source, lite_afterThenKw, "{", lite_prefix);
                    void lite_thenOpen;
                    const lite_thenId = lite$addInt(lite_condId, 1n, 324839);
                    void lite_thenId;
                    const lite_thenValVar = (("lite$val") + (liteFn$lib$core$int$intText(lite_thenId)));
                    void lite_thenValVar;
                    const lite_thenLabel = (("lite$b") + (liteFn$lib$core$int$intText(lite_thenId)));
                    void lite_thenLabel;
                    const lite_thenPass1ValKind = (Boolean(((lite_normExpected) === (""))) ? "__infer__" : (("__infer__:") + (lite_normExpected)));
                    void lite_thenPass1ValKind;
                    const lite_thenPass1Ctx = { id: lite_thenId, tag: lite_condParseTag, kind: lite_condParseKind, phase: "then", iifeDepth: lite_condDepth, valKind: lite_thenPass1ValKind, valVar: lite_thenValVar, label: lite_thenLabel, iterLabel: "", countVar: "", itemVar: lite_condValVar, itemKind: lite_resolvedPreThenKind, indexVar: "", hasIndex: false };
                    void lite_thenPass1Ctx;
                    const lite_thenPass1 = liteFn$frontend$parseBinaryCtx(lite_target, lite_source, lite$subtractInt(lite_thenOpen, 1n, 325502), lite_prefix, [...(lite_locals)], [...(lite_functions)], [...(lite_params)], lite_currentName, lite_normExpected, 0n, [...(liteFn$frontend$appendCtx([...(lite_ctxs)], lite_thenPass1Ctx))], lite_condDepth, true, "tagged");
                    void lite_thenPass1;
                    if (lite_inferMode) {
                        const lite_thenMarkers = ((lite_condOuterMarkers) + (liteFn$frontend$collectParsedMarkers("", lite_thenPass1)));
                        void lite_thenMarkers;
                        const lite_finalKind = (Boolean(((lite_resolvedPreThenKind) === ("Never"))) ? "Never" : (lite_thenPass1).kind);
                        void lite_finalKind;
                        lite_left = liteFn$frontend$withMarkers({ kind: lite_finalKind, code: "", intValue: 0n, textValue: "", constant: false, next: (lite_thenPass1).next }, lite_thenMarkers);
                    } else {
                        const lite_thenValKind = (lite_thenPass1).kind;
                        void lite_thenValKind;
                        const lite_thenPass2Expected = (Boolean(((((lite_thenValKind) === ("Unit"))) || (((lite_thenValKind) === ("Never"))))) ? "" : lite_thenValKind);
                        void lite_thenPass2Expected;
                        const lite_thenPass2Ctx = { id: lite_thenId, tag: lite_condParseTag, kind: lite_condParseKind, phase: "then", iifeDepth: lite_condDepth, valKind: lite_thenValKind, valVar: lite_thenValVar, label: lite_thenLabel, iterLabel: "", countVar: "", itemVar: lite_condValVar, itemKind: lite_resolvedPreThenKind, indexVar: "", hasIndex: false };
                        void lite_thenPass2Ctx;
                        const lite_thenPass2 = liteFn$frontend$parseBinaryCtx(lite_target, lite_source, lite$subtractInt(lite_thenOpen, 1n, 326653), lite_prefix, [...(lite_locals)], [...(lite_functions)], [...(lite_params)], lite_currentName, lite_thenPass2Expected, 0n, [...(liteFn$frontend$appendCtx([...(lite_ctxs)], lite_thenPass2Ctx))], lite_condDepth, false, "tagged");
                        void lite_thenPass2;
                        if (((lite_resolvedPreThenKind) === ("Never"))) {
                            lite_condIifeBody = lite_condStmtCode;
                            lite_left = { kind: "Never", code: (((("(() => { ") + (lite_condIifeBody))) + (" })()")), intValue: 0n, textValue: "", constant: false, next: (lite_thenPass2).next };
                        } else {
                            const lite_valDecl = (Boolean(((lite_resolvedPreThenKind) === ("Unit"))) ? "" : (((((((((((((((("let ") + (lite_condValVar))) + (": "))) + (liteFn$frontend$tsFunctionType(lite_resolvedPreThenKind)))) + (" = "))) + ((liteFn$frontend$zeroParsed(lite_target, lite_resolvedPreThenKind, 0n)).code))) + ("; void "))) + (lite_condValVar))) + ("; ")));
                            void lite_valDecl;
                            const lite_thenRet = (Boolean(((lite_thenValKind) === ("Unit"))) ? (((("void (") + ((lite_thenPass2).code))) + ("); return undefined;")) : (((("return ") + ((lite_thenPass2).code))) + (";")));
                            void lite_thenRet;
                            lite_condIifeBody = ((((((lite_valDecl) + (lite_condStmtCode))) + (" "))) + (lite_thenRet));
                            lite_left = { kind: lite_thenValKind, code: (((("(() => { ") + (lite_condIifeBody))) + (" })()")), intValue: 0n, textValue: "", constant: false, next: (lite_thenPass2).next };
                        }
                    }
                } else {
                    if (lite_inferMode) {
                        lite_left = liteFn$frontend$withMarkers({ kind: lite_resolvedPreThenKind, code: "", intValue: 0n, textValue: "", constant: false, next: lite_condEndCursor }, lite_condOuterMarkers);
                    } else {
                        const lite_valDecl = (Boolean(((((lite_resolvedPreThenKind) === ("Unit"))) || (((lite_resolvedPreThenKind) === ("Never"))))) ? "" : (((((((((((("let ") + (lite_condValVar))) + (": "))) + (liteFn$frontend$tsFunctionType(lite_resolvedPreThenKind)))) + (" = "))) + ((liteFn$frontend$zeroParsed(lite_target, lite_resolvedPreThenKind, 0n)).code))) + ("; ")));
                        void lite_valDecl;
                        const lite_finalRet = (Boolean(((lite_resolvedPreThenKind) === ("Unit"))) ? " return undefined;" : (Boolean(((lite_resolvedPreThenKind) === ("Never"))) ? "" : ((((" return ") + (lite_condValVar))) + (";"))));
                        void lite_finalRet;
                        lite_condIifeBody = ((((lite_valDecl) + (lite_condStmtCode))) + (lite_finalRet));
                        lite_left = { kind: lite_resolvedPreThenKind, code: (((("(() => { ") + (lite_condIifeBody))) + (" })()")), intValue: 0n, textValue: "", constant: false, next: lite_condEndCursor };
                    }
                }
                const lite_afterCondConstruct = liteFn$frontend$skipTrivia(lite_source, (lite_left).next, lite_prefix);
                void lite_afterCondConstruct;
                if (((((lite_hasActualThen) && (((lite_afterCondConstruct) < (liteFn$lib$core$text$length(lite_source)))))) && (liteFn$lib$core$text$wordAt(lite_source, lite_afterCondConstruct, "then")))) {
                    liteFn$frontend$failAt(lite_source, lite_afterCondConstruct, lite_prefix, "duplicate then block");
                }
                if (((((lite_afterCondConstruct) < (liteFn$lib$core$text$length(lite_source)))) && (liteFn$lib$core$text$wordAt(lite_source, lite_afterCondConstruct, "finally")))) {
                    if (((lite_target) !== ("ts"))) {
                        liteFn$frontend$failAt(lite_source, lite_afterCondConstruct, lite_prefix, "C backend does not support finally blocks yet");
                    }
                    const lite_afterFinKw = liteFn$frontend$skipTrivia(lite_source, lite$addInt(lite_afterCondConstruct, 7n, 329910), lite_prefix);
                    void lite_afterFinKw;
                    liteFn$frontend$rejectMisplacedTag(lite_source, lite_afterFinKw, lite_prefix, "block tag cannot appear after finally");
                    const lite_finOpen = liteFn$frontend$expectSymbol(lite_source, lite_afterFinKw, "{", lite_prefix);
                    void lite_finOpen;
                    const lite_condFinCtx = { id: lite_condId, tag: lite_condParseTag, kind: lite_condParseKind, phase: "finally", iifeDepth: lite_condDepth, valKind: lite_resolvedPreThenKind, valVar: lite_condValVar, label: lite_condLabel, iterLabel: "", countVar: "", itemVar: "", itemKind: "", indexVar: "", hasIndex: false };
                    void lite_condFinCtx;
                    const lite_finBarrierCtx = { id: 0n, tag: "", kind: "finally", phase: "finally", iifeDepth: lite_condDepth, valKind: "Unit", valVar: "", label: "", iterLabel: "", countVar: "", itemVar: "", itemKind: "", indexVar: "", hasIndex: false };
                    void lite_finBarrierCtx;
                    const lite_condFinCtxs: { id: bigint; tag: string; kind: string; phase: string; iifeDepth: bigint; valKind: string; valVar: string; label: string; iterLabel: string; countVar: string; itemVar: string; itemKind: string; indexVar: string; hasIndex: boolean }[] = [...(liteFn$frontend$appendCtx([...(liteFn$frontend$appendCtx([...(lite_ctxs)], lite_condFinCtx))], lite_finBarrierCtx))];
                    void lite_condFinCtxs;
                    const lite_finParsed = liteFn$frontend$parseBinaryCtx(lite_target, lite_source, lite$subtractInt(lite_finOpen, 1n, 330869), lite_prefix, [...(lite_locals)], [...(lite_functions)], [...(lite_params)], lite_currentName, "", 0n, [...(lite_condFinCtxs)], lite_condDepth, lite_inferMode, "finally");
                    void lite_finParsed;
                    const lite_afterFinClose = liteFn$frontend$skipTrivia(lite_source, (lite_finParsed).next, lite_prefix);
                    void lite_afterFinClose;
                    if (liteFn$lib$core$text$wordAt(lite_source, lite_afterFinClose, "then")) {
                        liteFn$frontend$failAt(lite_source, lite_afterFinClose, lite_prefix, "then must appear before finally");
                    }
                    if (liteFn$lib$core$text$wordAt(lite_source, lite_afterFinClose, "finally")) {
                        liteFn$frontend$failAt(lite_source, lite_afterFinClose, lite_prefix, "duplicate finally block");
                    }
                    const lite_finalCondKind = (Boolean((((lite_finParsed).kind) === ("Never"))) ? "Never" : (lite_left).kind);
                    void lite_finalCondKind;
                    if (lite_inferMode) {
                        const lite_mergedCondMarkers = liteFn$frontend$collectParsedMarkers(liteFn$frontend$collectParsedMarkers("", lite_left), lite_finParsed);
                        void lite_mergedCondMarkers;
                        lite_left = liteFn$frontend$withMarkers({ kind: lite_finalCondKind, code: "", intValue: 0n, textValue: "", constant: false, next: (lite_finParsed).next }, lite_mergedCondMarkers);
                    } else {
                        lite_left = { kind: lite_finalCondKind, code: (((((((("(() => { try { ") + (lite_condIifeBody))) + (" } finally { "))) + ((lite_finParsed).code))) + (" } })()")), intValue: 0n, textValue: "", constant: false, next: (lite_finParsed).next };
                    }
                }
            }
        }
        while (Boolean(true)) {
            if ((((((lite_left).next) > (0n))) && (((liteFn$lib$core$text$at(lite_source, lite$subtractInt((lite_left).next, 1n, 332203))) === ("}"))))) {
                break;
            }
            const lite_postPosition = liteFn$frontend$skipTrivia(lite_source, (lite_left).next, lite_prefix);
            void lite_postPosition;
            if (((((lite_postPosition) < (liteFn$lib$core$text$length(lite_source)))) && (((liteFn$lib$core$text$at(lite_source, lite_postPosition)) === ("."))))) {
                const lite_labelStart = liteFn$frontend$skipTrivia(lite_source, lite$addInt(lite_postPosition, 1n, 332442), lite_prefix);
                void lite_labelStart;
                if (((((lite_labelStart) < (liteFn$lib$core$text$length(lite_source)))) && (liteFn$lib$core$text$isDigit(liteFn$lib$core$text$at(lite_source, lite_labelStart))))) {
                    let lite_end = lite_labelStart;
                    void lite_end;
                    let lite_fieldIndex = 0n;
                    void lite_fieldIndex;
                    while (((((lite_end) < (liteFn$lib$core$text$length(lite_source)))) && (liteFn$lib$core$text$isDigit(liteFn$lib$core$text$at(lite_source, lite_end))))) {
                        lite_fieldIndex = lite$addInt(lite$multiplyInt(lite_fieldIndex, 10n, 332778), liteFn$frontend$decimalDigit(liteFn$lib$core$text$at(lite_source, lite_end)), 332783);
                        lite_end = lite$addInt(lite_end, 1n, 332854);
                    }
                    if (liteFn$frontend$isArrayKind((lite_left).kind)) {
                        if (((lite_fieldIndex) >= (liteFn$frontend$arrayExtent((lite_left).kind)))) {
                            liteFn$frontend$failAt(lite_source, lite_labelStart, lite_prefix, (((("array index ") + (liteFn$lib$core$text$slice(lite_source, lite_labelStart, lite_end)))) + (" out of bounds")));
                        }
                        lite_left = liteFn$frontend$withMarkers({ kind: liteFn$frontend$arrayElementKind((lite_left).kind), code: (((((((("(") + ((lite_left).code))) + (")["))) + (liteFn$lib$core$int$intText(lite_fieldIndex)))) + ("]!")), intValue: 0n, textValue: "", constant: false, next: lite_end }, (Boolean(lite_inferMode) ? liteFn$frontend$collectParsedMarkers("", lite_left) : ""));
                    } else if ((!(liteFn$frontend$isTupleKind((lite_left).kind)))) {
                        liteFn$frontend$failAt(lite_source, lite_postPosition, lite_prefix, "field access requires a tuple or module value");
                    } else {
                        const lite_comp = liteFn$frontend$tupleComponent((lite_left).kind, lite_fieldIndex);
                        void lite_comp;
                        if ((((lite_comp).kind) === (""))) {
                            liteFn$frontend$failAt(lite_source, lite_labelStart, lite_prefix, (("tuple has no field ") + (liteFn$lib$core$text$slice(lite_source, lite_labelStart, lite_end))));
                        }
                        lite_left = liteFn$frontend$withMarkers({ kind: (lite_comp).kind, code: (((((("(") + ((lite_left).code))) + (")."))) + ((lite_comp).prop)), intValue: 0n, textValue: "", constant: false, next: lite_end }, (Boolean(lite_inferMode) ? liteFn$frontend$collectParsedMarkers("", lite_left) : ""));
                    }
                } else if (((((lite_labelStart) >= (liteFn$lib$core$text$length(lite_source)))) || ((!(liteFn$lib$core$text$isNameStart(liteFn$lib$core$text$at(lite_source, lite_labelStart))))))) {
                    break;
                } else {
                    const lite_labelEnd = liteFn$lib$core$text$skipName(lite_source, lite_labelStart);
                    void lite_labelEnd;
                    const lite_label = liteFn$lib$core$text$slice(lite_source, lite_labelStart, lite_labelEnd);
                    void lite_label;
                    if ((((lite_left).kind) === ("Module"))) {
                        const lite_qualified = (((((lite_left).textValue) + ("."))) + (lite_label));
                        void lite_qualified;
                        const lite_functionIndex = liteFn$frontend$findFunction([...(lite_functions)], lite_qualified);
                        void lite_functionIndex;
                        if (((lite_functionIndex) >= (0n))) {
                            lite_left = { kind: "ModuleFunction", code: liteFn$lib$core$int$intText(lite_start), intValue: lite_functionIndex, textValue: lite_qualified, constant: false, next: lite_labelEnd };
                        } else {
                            const lite_memberIndex = liteFn$frontend$localIndex([...(lite_locals)], lite_qualified);
                            void lite_memberIndex;
                            if (((lite_memberIndex) < (0n))) {
                                liteFn$frontend$failAt(lite_source, lite_labelStart, lite_prefix, (("unknown module member ") + (lite_qualified)));
                            }
                            if (liteFn$frontend$isSingleEquals(lite_source, liteFn$frontend$skipTrivia(lite_source, lite_labelEnd, lite_prefix))) {
                                liteFn$frontend$failAt(lite_source, lite_labelStart, lite_prefix, "module members are immutable");
                            }
                            const lite_member = lite$listAt((lite_locals), lite_memberIndex, 335436);
                            void lite_member;
                            lite_left = { kind: (lite_member).kind, code: (lite_member).runtime, intValue: (lite_member).intValue, textValue: (lite_member).textValue, constant: (lite_member).constant, next: lite_labelEnd };
                        }
                    } else {
                        if ((!(liteFn$frontend$isTupleKind((lite_left).kind)))) {
                            liteFn$frontend$failAt(lite_source, lite_postPosition, lite_prefix, "field access requires a tuple or module value");
                        }
                        const lite_fieldKind = liteFn$frontend$tupleFieldKind((lite_left).kind, lite_label);
                        void lite_fieldKind;
                        if (((lite_fieldKind) === (""))) {
                            liteFn$frontend$failAt(lite_source, lite_labelStart, lite_prefix, (("tuple has no field ") + (lite_label)));
                        }
                        lite_left = liteFn$frontend$withMarkers({ kind: lite_fieldKind, code: (((((("(") + ((lite_left).code))) + (")."))) + (lite_label)), intValue: 0n, textValue: "", constant: false, next: lite_labelEnd }, (Boolean(lite_inferMode) ? liteFn$frontend$collectParsedMarkers("", lite_left) : ""));
                    }
                }
            } else if (((((lite_postPosition) < (liteFn$lib$core$text$length(lite_source)))) && (((liteFn$lib$core$text$at(lite_source, lite_postPosition)) === ("["))))) {
                if ((((!(liteFn$frontend$isListKind((lite_left).kind)))) && ((!(liteFn$frontend$isArrayKind((lite_left).kind)))))) {
                    liteFn$frontend$failAt(lite_source, lite_postPosition, lite_prefix, "indexing requires a list value");
                }
                const lite_indexStart = liteFn$frontend$skipTrivia(lite_source, lite$addInt(lite_postPosition, 1n, 336751), lite_prefix);
                void lite_indexStart;
                const lite_index = liteFn$frontend$parseBinaryCtx(lite_target, lite_source, lite_indexStart, lite_prefix, [...(lite_locals)], [...(lite_functions)], [...(lite_params)], lite_currentName, "", 0n, [...(lite_ctxs)], lite_iifeDepth, lite_inferMode, "");
                void lite_index;
                if ((((lite_index).kind) !== ("Int"))) {
                    liteFn$frontend$failAt(lite_source, lite_indexStart, lite_prefix, (("list index must be Int, got ") + (liteFn$frontend$displayKind((lite_index).kind))));
                }
                const lite_close = liteFn$frontend$skipTrivia(lite_source, (lite_index).next, lite_prefix);
                void lite_close;
                const lite_next = liteFn$frontend$expectSymbol(lite_source, lite_close, "]", lite_prefix);
                void lite_next;
                const lite_elemKind = (Boolean(liteFn$frontend$isListKind((lite_left).kind)) ? liteFn$frontend$listElementKind((lite_left).kind) : liteFn$frontend$arrayElementKind((lite_left).kind));
                void lite_elemKind;
                lite_left = liteFn$frontend$withMarkers({ kind: lite_elemKind, code: (((((((((((("lite$listAt((") + ((lite_left).code))) + ("), "))) + ((lite_index).code))) + (", "))) + (liteFn$lib$core$int$intText(lite_indexStart)))) + (")")), intValue: 0n, textValue: "", constant: false, next: lite_next }, (Boolean(lite_inferMode) ? liteFn$frontend$collectParsedMarkers(liteFn$frontend$collectParsedMarkers("", lite_left), lite_index) : ""));
            } else if ((((lite_left).kind) === ("ListOp"))) {
                const lite_grant = liteFn$frontend$parseListGrant(lite_source, (lite_left).next, lite_prefix, [...(lite_locals)], (lite_left).code);
                void lite_grant;
                if ((((((lite_left).textValue) === ("push_back"))) || ((((lite_left).textValue) === ("push_front"))))) {
                    let lite_cursor = liteFn$frontend$skipTrivia(lite_source, (lite_grant).next, lite_prefix);
                    void lite_cursor;
                    if (((((lite_cursor) >= (liteFn$lib$core$text$length(lite_source)))) || (((liteFn$lib$core$text$at(lite_source, lite_cursor)) !== (","))))) {
                        liteFn$frontend$failAt(lite_source, lite_cursor, lite_prefix, (((lite_left).code) + (" expects a value after the mut list")));
                    }
                    const lite_valueStart = liteFn$frontend$skipTrivia(lite_source, lite$addInt(lite_cursor, 1n, 338205), lite_prefix);
                    void lite_valueStart;
                    const lite_elementKind = liteFn$frontend$listElementKind((lite_grant).kind);
                    void lite_elementKind;
                    const lite_value = liteFn$frontend$parseBinaryCtx(lite_target, lite_source, lite_valueStart, lite_prefix, [...(lite_locals)], [...(lite_functions)], [...(lite_params)], lite_currentName, lite_elementKind, 0n, [...(lite_ctxs)], lite_iifeDepth, lite_inferMode, "");
                    void lite_value;
                    if ((!(liteFn$frontend$isCompatibleKind(lite_elementKind, (lite_value).kind)))) {
                        liteFn$frontend$failAt(lite_source, lite_valueStart, lite_prefix, (((((((((lite_left).code) + (" element must be "))) + (liteFn$frontend$displayKind(lite_elementKind)))) + (", got "))) + (liteFn$frontend$displayKind((lite_value).kind))));
                    }
                    const lite_close = liteFn$frontend$expectNonemptyCallClose(lite_source, (lite_value).next, lite_prefix);
                    void lite_close;
                    const lite_method = (Boolean((((lite_left).textValue) === ("push_back"))) ? ".push(" : ".unshift(");
                    void lite_method;
                    lite_left = liteFn$frontend$withMarkers({ kind: "Unit", code: (((((((lite_grant).runtime) + (lite_method))) + (liteFn$frontend$assignValueCode(lite_target, lite_elementKind, (lite_value).kind, (lite_value).code)))) + (")")), intValue: 0n, textValue: "", constant: false, next: lite_close }, (Boolean(lite_inferMode) ? liteFn$frontend$collectParsedMarkers("", lite_value) : ""));
                } else {
                    const lite_close = liteFn$frontend$expectNonemptyCallClose(lite_source, (lite_grant).next, lite_prefix);
                    void lite_close;
                    const lite_helper = (Boolean((((lite_left).textValue) === ("pop_back"))) ? "lite$listPopBack(" : "lite$listPopFront(");
                    void lite_helper;
                    lite_left = { kind: liteFn$frontend$listElementKind((lite_grant).kind), code: ((((((((lite_helper) + ((lite_grant).runtime))) + (", "))) + (liteFn$lib$core$int$intText(lite_start)))) + (")")), intValue: 0n, textValue: "", constant: false, next: lite_close };
                }
            } else if ((((lite_left).kind) === ("ModuleFunction"))) {
                const lite_info = lite$listAt((lite_functions), (lite_left).intValue, 339703);
                void lite_info;
                const lite_calleeDisplay = (lite_left).textValue;
                void lite_calleeDisplay;
                const lite_errPos = (Boolean((((lite_left).code) !== (""))) ? liteFn$frontend$parseDigits((lite_left).code, 0n, liteFn$lib$core$text$length((lite_left).code)) : lite_start);
                void lite_errPos;
                let lite_listOpName = "";
                void lite_listOpName;
                let lite_listOpDisplay = "";
                void lite_listOpDisplay;
                if ((((lite_info).runtime) === ("lite$core$list$pushBack:v1"))) {
                    lite_listOpName = "push_back";
                    lite_listOpDisplay = "pushBack";
                } else if ((((lite_info).runtime) === ("lite$core$list$popBack:v1"))) {
                    lite_listOpName = "pop_back";
                    lite_listOpDisplay = "popBack";
                } else if ((((lite_info).runtime) === ("lite$core$list$pushFront:v1"))) {
                    lite_listOpName = "push_front";
                    lite_listOpDisplay = "pushFront";
                } else if ((((lite_info).runtime) === ("lite$core$list$popFront:v1"))) {
                    lite_listOpName = "pop_front";
                    lite_listOpDisplay = "popFront";
                }
                if (((lite_listOpName) !== (""))) {
                    const lite_grant = liteFn$frontend$parseListGrant(lite_source, (lite_left).next, lite_prefix, [...(lite_locals)], lite_listOpDisplay);
                    void lite_grant;
                    if (((((lite_listOpName) === ("push_back"))) || (((lite_listOpName) === ("push_front"))))) {
                        let lite_cursor = liteFn$frontend$skipTrivia(lite_source, (lite_grant).next, lite_prefix);
                        void lite_cursor;
                        if (((((lite_cursor) >= (liteFn$lib$core$text$length(lite_source)))) || (((liteFn$lib$core$text$at(lite_source, lite_cursor)) !== (","))))) {
                            liteFn$frontend$failAt(lite_source, lite_cursor, lite_prefix, ((lite_listOpDisplay) + (" expects a value after the mut list")));
                        }
                        const lite_valueStart = liteFn$frontend$skipTrivia(lite_source, lite$addInt(lite_cursor, 1n, 341003), lite_prefix);
                        void lite_valueStart;
                        const lite_elementKind = liteFn$frontend$listElementKind((lite_grant).kind);
                        void lite_elementKind;
                        const lite_value = liteFn$frontend$parseBinaryCtx(lite_target, lite_source, lite_valueStart, lite_prefix, [...(lite_locals)], [...(lite_functions)], [...(lite_params)], lite_currentName, lite_elementKind, 0n, [...(lite_ctxs)], lite_iifeDepth, lite_inferMode, "");
                        void lite_value;
                        if ((!(liteFn$frontend$isCompatibleKind(lite_elementKind, (lite_value).kind)))) {
                            liteFn$frontend$failAt(lite_source, lite_valueStart, lite_prefix, ((((((((lite_listOpDisplay) + (" element must be "))) + (liteFn$frontend$displayKind(lite_elementKind)))) + (", got "))) + (liteFn$frontend$displayKind((lite_value).kind))));
                        }
                        const lite_close = liteFn$frontend$expectNonemptyCallClose(lite_source, (lite_value).next, lite_prefix);
                        void lite_close;
                        const lite_method = (Boolean(((lite_listOpName) === ("push_back"))) ? ".push(" : ".unshift(");
                        void lite_method;
                        lite_left = liteFn$frontend$withMarkers({ kind: "Unit", code: (((((((lite_grant).runtime) + (lite_method))) + (liteFn$frontend$assignValueCode(lite_target, lite_elementKind, (lite_value).kind, (lite_value).code)))) + (")")), intValue: 0n, textValue: "", constant: false, next: lite_close }, (Boolean(lite_inferMode) ? liteFn$frontend$collectParsedMarkers("", lite_value) : ""));
                    } else {
                        const lite_close = liteFn$frontend$expectNonemptyCallClose(lite_source, (lite_grant).next, lite_prefix);
                        void lite_close;
                        const lite_helper = (Boolean(((lite_listOpName) === ("pop_back"))) ? "lite$listPopBack(" : "lite$listPopFront(");
                        void lite_helper;
                        lite_left = { kind: liteFn$frontend$listElementKind((lite_grant).kind), code: ((((((((lite_helper) + ((lite_grant).runtime))) + (", "))) + (liteFn$lib$core$int$intText(lite_start)))) + (")")), intValue: 0n, textValue: "", constant: false, next: lite_close };
                    }
                } else if ((((lite_info).count) < (0n))) {
                    liteFn$frontend$failAt(lite_source, lite_errPos, lite_prefix, "host output functions are standalone statements");
                } else if (((((lite_postPosition) >= (liteFn$lib$core$text$length(lite_source)))) || (((liteFn$lib$core$text$at(lite_source, lite_postPosition)) !== ("("))))) {
                    liteFn$frontend$failAt(lite_source, lite_errPos, lite_prefix, (((("function ") + (lite_calleeDisplay))) + (" must be called")));
                } else if (liteFn$lib$core$text$startsWithAt((lite_info).runtime, 0n, "lite$")) {
                    let lite_cursor = liteFn$frontend$skipTrivia(lite_source, lite$addInt(lite_postPosition, 1n, 342960), lite_prefix);
                    void lite_cursor;
                    const lite_argumentCodes: string[] = [...([])];
                    void lite_argumentCodes;
                    let lite_callMarkers = "";
                    void lite_callMarkers;
                    let lite_argumentCount = 0n;
                    void lite_argumentCount;
                    const lite_size = liteFn$lib$core$text$length(lite_source);
                    void lite_size;
                    if (((((lite_cursor) < (lite_size))) && (((liteFn$lib$core$text$at(lite_source, lite_cursor)) !== (")"))))) {
                        while (Boolean(true)) {
                            const lite_isNamed = (Boolean(liteFn$frontend$isSingleEquals(lite_source, lite_cursor)) ? true : (Boolean(((((lite_cursor) < (lite_size))) && (liteFn$lib$core$text$isNameStart(liteFn$lib$core$text$at(lite_source, lite_cursor))))) ? liteFn$frontend$isSingleEquals(lite_source, liteFn$frontend$skipTrivia(lite_source, liteFn$lib$core$text$skipName(lite_source, lite_cursor), lite_prefix)) : false));
                            void lite_isNamed;
                            if (lite_isNamed) {
                                liteFn$frontend$failAt(lite_source, lite_cursor, lite_prefix, (("named arguments are not supported for host function ") + (lite_calleeDisplay)));
                            }
                            if (((lite_argumentCount) >= ((lite_info).count))) {
                                const lite_suffix = (Boolean((((lite_info).count) === (1n))) ? " argument" : " arguments");
                                void lite_suffix;
                                liteFn$frontend$failAt(lite_source, lite_errPos, lite_prefix, (((((((((("function ") + (lite_calleeDisplay))) + (" expects "))) + (liteFn$lib$core$format$decimalText((lite_info).count)))) + (lite_suffix))) + (", got more")));
                            }
                            const lite_expected$2 = liteFn$frontend$paramKindOf(lite$listAt((lite_params), lite$addInt((lite_info).first, lite_argumentCount, 344209), 344198));
                            void lite_expected$2;
                            const lite_argument = liteFn$frontend$parseBinaryCtx(lite_target, lite_source, lite_cursor, lite_prefix, [...(lite_locals)], [...(lite_functions)], [...(lite_params)], lite_currentName, lite_expected$2, 0n, [...(lite_ctxs)], lite_iifeDepth, lite_inferMode, "");
                            void lite_argument;
                            if (lite_inferMode) {
                                lite_callMarkers = liteFn$frontend$collectParsedMarkers(lite_callMarkers, lite_argument);
                            }
                            if ((!(liteFn$frontend$isCompatibleKind(lite_expected$2, (lite_argument).kind)))) {
                                liteFn$frontend$failAt(lite_source, lite_cursor, lite_prefix, (((((((((((((("argument ") + (liteFn$lib$core$format$decimalText(lite$addInt(lite_argumentCount, 1n, 344671))))) + (" of "))) + (lite_calleeDisplay))) + (" must be "))) + (liteFn$frontend$displayKind(lite_expected$2)))) + (", got "))) + (liteFn$frontend$displayKind((lite_argument).kind))));
                            }
                            lite_argumentCodes.push(liteFn$frontend$assignValueCode(lite_target, lite_expected$2, (lite_argument).kind, (lite_argument).code));
                            lite_argumentCount = lite$addInt(lite_argumentCount, 1n, 345019);
                            lite_cursor = liteFn$frontend$skipTrivia(lite_source, (lite_argument).next, lite_prefix);
                            if (((((lite_cursor) < (lite_size))) && (((liteFn$lib$core$text$at(lite_source, lite_cursor)) === (","))))) {
                                lite_cursor = liteFn$frontend$skipTrivia(lite_source, lite$addInt(lite_cursor, 1n, 345244), lite_prefix);
                                if (((((lite_cursor) < (lite_size))) && (((liteFn$lib$core$text$at(lite_source, lite_cursor)) === (")"))))) {
                                    break;
                                }
                            } else {
                                break;
                            }
                        }
                    }
                    lite_cursor = liteFn$frontend$expectSymbol(lite_source, lite_cursor, ")", lite_prefix);
                    const lite_optionalPrompt = (((((((((lite_info).runtime) === ("lite$inputAll"))) || ((((lite_info).runtime) === ("lite$inputLine"))))) || ((((lite_info).runtime) === ("lite$inputInt"))))) || ((((lite_info).runtime) === ("lite$inputFloat"))));
                    void lite_optionalPrompt;
                    const lite_optionalExit = (((lite_info).runtime) === ("lite$exit"));
                    void lite_optionalExit;
                    if (((((lite_argumentCount) !== ((lite_info).count))) && ((!(((((((lite_optionalPrompt) || (lite_optionalExit)))) && (((lite_argumentCount) === (0n)))))))))) {
                        const lite_suffix = (Boolean((((lite_info).count) === (1n))) ? " argument" : " arguments");
                        void lite_suffix;
                        liteFn$frontend$failAt(lite_source, lite_errPos, lite_prefix, (((((((((((("function ") + (lite_calleeDisplay))) + (" expects "))) + (liteFn$lib$core$format$decimalText((lite_info).count)))) + (lite_suffix))) + (", got "))) + (liteFn$lib$core$format$decimalText(lite_argumentCount))));
                    }
                    if (((lite_optionalExit) && (((lite_argumentCount) === (0n))))) {
                        lite_argumentCodes.push(liteFn$frontend$targetIntLiteralCode(lite_target, 0n, false, "0"));
                    }
                    if (lite_optionalPrompt) {
                        if (((lite_argumentCount) === (0n))) {
                            lite_argumentCodes.push("undefined");
                        }
                        const lite_place = liteFn$lib$core$source$lineColumn(lite_source, lite_errPos);
                        void lite_place;
                        const lite_location = ((((((((((Boolean(((lite_prefix) === (""))) ? "" : ((lite_prefix) + (":"))))) + (liteFn$lib$core$format$decimalText((lite_place).line)))) + (":"))) + (liteFn$lib$core$format$decimalText((lite_place).column)))) + (": InputFault: "));
                        void lite_location;
                        lite_argumentCodes.push(liteFn$frontend$targetTextLiteralCode(lite_target, lite_location));
                    }
                    if ((((((lite_info).runtime) === ("lite$textAt"))) || ((((lite_info).runtime) === ("lite$textSlice"))))) {
                        lite_argumentCodes.push(liteFn$lib$core$int$intText(lite_errPos));
                    }
                    const lite_callResultKind = (Boolean(lite_optionalExit) ? "Never" : (lite_info).result);
                    void lite_callResultKind;
                    lite_left = liteFn$frontend$withMarkers({ kind: lite_callResultKind, code: (((((((lite_info).runtime) + ("("))) + (liteFn$lib$core$text$joinTexts([...(lite_argumentCodes)], ", ")))) + (")")), intValue: 0n, textValue: "", constant: false, next: lite_cursor }, lite_callMarkers);
                } else {
                    const lite_size = liteFn$lib$core$text$length(lite_source);
                    void lite_size;
                    const lite_explicitLabels: string[] = [...(liteFn$frontend$collectExplicitCallLabels(lite_source, lite_postPosition, lite_prefix))];
                    void lite_explicitLabels;
                    const lite_argIifeDepth = (Boolean(((((lite_target) === ("ts"))) && (liteFn$frontend$callReordersArgs(lite_source, lite_postPosition, lite_prefix, [...(lite_params)], (lite_info).first, (lite_info).count)))) ? lite$addInt(lite_iifeDepth, 1n, 347768) : lite_iifeDepth);
                    void lite_argIifeDepth;
                    let lite_callMarkers = "";
                    void lite_callMarkers;
                    let lite_slotEntry: bigint[] = [...([...([])])];
                    void lite_slotEntry;
                    let lite_slotExplicit: boolean[] = [...([...([])])];
                    void lite_slotExplicit;
                    const lite_initSlots: bigint[] = [...([])];
                    void lite_initSlots;
                    const lite_initExplicit: boolean[] = [...([])];
                    void lite_initExplicit;
                    let lite_initIdx = 0n;
                    void lite_initIdx;
                    while (((lite_initIdx) < ((lite_info).count))) {
                        lite_initSlots.push((-1n));
                        lite_initExplicit.push(false);
                        lite_initIdx = lite$addInt(lite_initIdx, 1n, 348317);
                    }
                    lite_slotEntry = [...(lite_initSlots)];
                    lite_slotExplicit = [...(lite_initExplicit)];
                    const lite_entryPositions: bigint[] = [...([])];
                    void lite_entryPositions;
                    const lite_entrySlots: bigint[] = [...([])];
                    void lite_entrySlots;
                    const lite_entryKinds: string[] = [...([])];
                    void lite_entryKinds;
                    const lite_entryCodes: string[] = [...([])];
                    void lite_entryCodes;
                    let lite_entryCount = 0n;
                    void lite_entryCount;
                    let lite_cursor = liteFn$frontend$skipTrivia(lite_source, lite$addInt(lite_postPosition, 1n, 348725), lite_prefix);
                    void lite_cursor;
                    if (((((lite_cursor) < (lite_size))) && (((liteFn$lib$core$text$at(lite_source, lite_cursor)) !== (")"))))) {
                        while (Boolean(true)) {
                            if (liteFn$frontend$isSingleEquals(lite_source, lite_cursor)) {
                                const lite_argNameStart = liteFn$frontend$skipTrivia(lite_source, lite$addInt(lite_cursor, 1n, 348975), lite_prefix);
                                void lite_argNameStart;
                                if (((((lite_argNameStart) >= (lite_size))) || ((!(liteFn$lib$core$text$isNameStart(liteFn$lib$core$text$at(lite_source, lite_argNameStart))))))) {
                                    liteFn$frontend$failAt(lite_source, lite_argNameStart, lite_prefix, "expected parameter name after =");
                                }
                                const lite_argNameEnd = liteFn$lib$core$text$skipName(lite_source, lite_argNameStart);
                                void lite_argNameEnd;
                                const lite_label = liteFn$lib$core$text$slice(lite_source, lite_argNameStart, lite_argNameEnd);
                                void lite_label;
                                if (liteFn$frontend$isReservedWord(lite_label)) {
                                    liteFn$frontend$unsupportedFeature(lite_source, lite_argNameStart, lite_label, lite_prefix);
                                }
                                const lite_afterIdent = liteFn$frontend$skipTrivia(lite_source, lite_argNameEnd, lite_prefix);
                                void lite_afterIdent;
                                if (((((((lite_afterIdent) < (lite_size))) && (((liteFn$lib$core$text$at(lite_source, lite_afterIdent)) !== (","))))) && (((liteFn$lib$core$text$at(lite_source, lite_afterIdent)) !== (")"))))) {
                                    liteFn$frontend$failAt(lite_source, lite_afterIdent, lite_prefix, "shorthand argument requires a bare identifier");
                                }
                                const lite_slot = liteFn$frontend$findParamSlot([...(lite_params)], (lite_info).first, (lite_info).count, lite_label);
                                void lite_slot;
                                if (((lite_slot) < (0n))) {
                                    liteFn$frontend$failAt(lite_source, lite_argNameStart, lite_prefix, (((((("unknown parameter ") + (lite_label))) + (" in call to "))) + (lite_calleeDisplay)));
                                }
                                if (lite$listAt((lite_slotExplicit), lite_slot, 350226)) {
                                    liteFn$frontend$failAt(lite_source, lite_argNameStart, lite_prefix, (((((("duplicate named argument ") + (lite_label))) + (" in call to "))) + (lite_calleeDisplay)));
                                }
                                lite_slotExplicit = [...(liteFn$frontend$setBoolAt([...(lite_slotExplicit)], lite_slot, true))];
                                lite_slotEntry = [...(liteFn$frontend$setIntAt([...(lite_slotEntry)], lite_slot, lite_entryCount))];
                                const lite_expected$2 = liteFn$frontend$paramKindOf(lite$listAt((lite_params), lite$addInt((lite_info).first, lite_slot, 350633), 350622));
                                void lite_expected$2;
                                const lite_arg = liteFn$frontend$parseBinaryCtx(lite_target, lite_source, lite_argNameStart, lite_prefix, [...(lite_locals)], [...(lite_functions)], [...(lite_params)], lite_currentName, lite_expected$2, 30n, [...(lite_ctxs)], lite_argIifeDepth, lite_inferMode, "");
                                void lite_arg;
                                if (lite_inferMode) {
                                    lite_callMarkers = liteFn$frontend$collectParsedMarkers(lite_callMarkers, lite_arg);
                                }
                                lite_entryPositions.push(lite_argNameStart);
                                lite_entrySlots.push(lite_slot);
                                lite_entryKinds.push((lite_arg).kind);
                                lite_entryCodes.push((lite_arg).code);
                                lite_entryCount = lite$addInt(lite_entryCount, 1n, 351295);
                                lite_cursor = liteFn$frontend$skipTrivia(lite_source, (lite_arg).next, lite_prefix);
                            } else {
                                let lite_namedLabel = "";
                                void lite_namedLabel;
                                let lite_rhsStart = (-1n);
                                void lite_rhsStart;
                                if (((((lite_cursor) < (lite_size))) && (liteFn$lib$core$text$isNameStart(liteFn$lib$core$text$at(lite_source, lite_cursor))))) {
                                    const lite_labelEnd = liteFn$lib$core$text$skipName(lite_source, lite_cursor);
                                    void lite_labelEnd;
                                    const lite_afterLabel = liteFn$frontend$skipTrivia(lite_source, lite_labelEnd, lite_prefix);
                                    void lite_afterLabel;
                                    if (liteFn$frontend$isSingleEquals(lite_source, lite_afterLabel)) {
                                        lite_namedLabel = liteFn$lib$core$text$slice(lite_source, lite_cursor, lite_labelEnd);
                                        lite_rhsStart = liteFn$frontend$skipTrivia(lite_source, lite$addInt(lite_afterLabel, 1n, 352007), lite_prefix);
                                    }
                                }
                                if (((lite_namedLabel) !== (""))) {
                                    if (liteFn$frontend$isReservedWord(lite_namedLabel)) {
                                        liteFn$frontend$unsupportedFeature(lite_source, lite_cursor, lite_namedLabel, lite_prefix);
                                    }
                                    const lite_slot = liteFn$frontend$findParamSlot([...(lite_params)], (lite_info).first, (lite_info).count, lite_namedLabel);
                                    void lite_slot;
                                    if (((lite_slot) < (0n))) {
                                        liteFn$frontend$failAt(lite_source, lite_cursor, lite_prefix, (((((("unknown parameter ") + (lite_namedLabel))) + (" in call to "))) + (lite_calleeDisplay)));
                                    }
                                    if (lite$listAt((lite_slotExplicit), lite_slot, 352621)) {
                                        liteFn$frontend$failAt(lite_source, lite_cursor, lite_prefix, (((((("duplicate named argument ") + (lite_namedLabel))) + (" in call to "))) + (lite_calleeDisplay)));
                                    }
                                    lite_slotExplicit = [...(liteFn$frontend$setBoolAt([...(lite_slotExplicit)], lite_slot, true))];
                                    lite_slotEntry = [...(liteFn$frontend$setIntAt([...(lite_slotEntry)], lite_slot, lite_entryCount))];
                                    const lite_expected$2 = liteFn$frontend$paramKindOf(lite$listAt((lite_params), lite$addInt((lite_info).first, lite_slot, 353047), 353036));
                                    void lite_expected$2;
                                    const lite_arg = liteFn$frontend$parseBinaryCtx(lite_target, lite_source, lite_rhsStart, lite_prefix, [...(lite_locals)], [...(lite_functions)], [...(lite_params)], lite_currentName, lite_expected$2, 0n, [...(lite_ctxs)], lite_argIifeDepth, lite_inferMode, "");
                                    void lite_arg;
                                    if (lite_inferMode) {
                                        lite_callMarkers = liteFn$frontend$collectParsedMarkers(lite_callMarkers, lite_arg);
                                    }
                                    lite_entryPositions.push(lite_rhsStart);
                                    lite_entrySlots.push(lite_slot);
                                    lite_entryKinds.push((lite_arg).kind);
                                    lite_entryCodes.push((lite_arg).code);
                                    lite_entryCount = lite$addInt(lite_entryCount, 1n, 353728);
                                    lite_cursor = liteFn$frontend$skipTrivia(lite_source, (lite_arg).next, lite_prefix);
                                } else {
                                    let lite_nextSlot = (-1n);
                                    void lite_nextSlot;
                                    let lite_scan = 0n;
                                    void lite_scan;
                                    while (((lite_scan) < ((lite_info).count))) {
                                        if (((lite$listAt((lite_slotEntry), lite_scan, 354055)) < (0n))) {
                                            lite_nextSlot = lite_scan;
                                            break;
                                        }
                                        lite_scan = lite$addInt(lite_scan, 1n, 354250);
                                    }
                                    if (((lite_nextSlot) < (0n))) {
                                        const lite_suffix = (Boolean((((lite_info).count) === (1n))) ? " argument" : " arguments");
                                        void lite_suffix;
                                        liteFn$frontend$failAt(lite_source, lite_errPos, lite_prefix, (((((((((("function ") + (lite_calleeDisplay))) + (" expects "))) + (liteFn$lib$core$format$decimalText((lite_info).count)))) + (lite_suffix))) + (", got more")));
                                    }
                                    const lite_slotName = liteFn$frontend$paramNameOf(lite$listAt((lite_params), lite$addInt((lite_info).first, lite_nextSlot, 354723), 354712));
                                    void lite_slotName;
                                    const lite_posExpected = (Boolean(liteFn$lib$core$list$listContainsText([...(lite_explicitLabels)], lite_slotName)) ? "" : liteFn$frontend$paramKindOf(lite$listAt((lite_params), lite$addInt((lite_info).first, lite_nextSlot, 354882), 354871)));
                                    void lite_posExpected;
                                    lite_slotEntry = [...(liteFn$frontend$setIntAt([...(lite_slotEntry)], lite_nextSlot, lite_entryCount))];
                                    const lite_arg = liteFn$frontend$parseBinaryCtx(lite_target, lite_source, lite_cursor, lite_prefix, [...(lite_locals)], [...(lite_functions)], [...(lite_params)], lite_currentName, lite_posExpected, 0n, [...(lite_ctxs)], lite_argIifeDepth, lite_inferMode, "");
                                    void lite_arg;
                                    if (lite_inferMode) {
                                        lite_callMarkers = liteFn$frontend$collectParsedMarkers(lite_callMarkers, lite_arg);
                                    }
                                    lite_entryPositions.push(lite_cursor);
                                    lite_entrySlots.push(lite_nextSlot);
                                    lite_entryKinds.push((lite_arg).kind);
                                    lite_entryCodes.push((lite_arg).code);
                                    lite_entryCount = lite$addInt(lite_entryCount, 1n, 355669);
                                    lite_cursor = liteFn$frontend$skipTrivia(lite_source, (lite_arg).next, lite_prefix);
                                }
                            }
                            if (((((lite_cursor) < (lite_size))) && (((liteFn$lib$core$text$at(lite_source, lite_cursor)) === (","))))) {
                                lite_cursor = liteFn$frontend$skipTrivia(lite_source, lite$addInt(lite_cursor, 1n, 355954), lite_prefix);
                                if (((((lite_cursor) < (lite_size))) && (((liteFn$lib$core$text$at(lite_source, lite_cursor)) === (")"))))) {
                                    break;
                                }
                            } else {
                                break;
                            }
                        }
                    }
                    lite_cursor = liteFn$frontend$expectSymbol(lite_source, lite_cursor, ")", lite_prefix);
                    let lite_filledCount = 0n;
                    void lite_filledCount;
                    let lite_checkSlot = 0n;
                    void lite_checkSlot;
                    while (((lite_checkSlot) < ((lite_info).count))) {
                        if (((lite$listAt((lite_slotEntry), lite_checkSlot, 356417)) >= (0n))) {
                            lite_filledCount = lite$addInt(lite_filledCount, 1n, 356447);
                        }
                        lite_checkSlot = lite$addInt(lite_checkSlot, 1n, 356485);
                    }
                    if (((lite_filledCount) !== ((lite_info).count))) {
                        const lite_suffix = (Boolean((((lite_info).count) === (1n))) ? " argument" : " arguments");
                        void lite_suffix;
                        liteFn$frontend$failAt(lite_source, lite_errPos, lite_prefix, (((((((((((("function ") + (lite_calleeDisplay))) + (" expects "))) + (liteFn$lib$core$format$decimalText((lite_info).count)))) + (lite_suffix))) + (", got "))) + (liteFn$lib$core$format$decimalText(lite_filledCount))));
                    }
                    let lite_isIdentityOrder = ((lite_entryCount) === ((lite_info).count));
                    void lite_isIdentityOrder;
                    let lite_slotIdx = 0n;
                    void lite_slotIdx;
                    while (((lite_slotIdx) < ((lite_info).count))) {
                        const lite_k = lite$listAt((lite_slotEntry), lite_slotIdx, 357053);
                        void lite_k;
                        if (((lite_k) !== (lite_slotIdx))) {
                            lite_isIdentityOrder = false;
                        }
                        const lite_expected$2 = liteFn$frontend$paramKindOf(lite$listAt((lite_params), lite$addInt((lite_info).first, lite_slotIdx, 357191), 357180));
                        void lite_expected$2;
                        if ((!(liteFn$frontend$isCompatibleKind(lite_expected$2, lite$listAt((lite_entryKinds), lite_k, 357269))))) {
                            liteFn$frontend$failAt(lite_source, lite$listAt((lite_entryPositions), lite_k, 357329), lite_prefix, (((((((((((((("argument ") + (liteFn$lib$core$format$decimalText(lite$addInt(lite_slotIdx, 1n, 357385))))) + (" of "))) + (lite_calleeDisplay))) + (" must be "))) + (liteFn$frontend$displayKind(lite_expected$2)))) + (", got "))) + (liteFn$frontend$displayKind(lite$listAt((lite_entryKinds), lite_k, 357517)))));
                        }
                        lite_slotIdx = lite$addInt(lite_slotIdx, 1n, 357573);
                    }
                    let lite_emittedCode = "";
                    void lite_emittedCode;
                    let lite_emittedResultKind = (lite_info).result;
                    void lite_emittedResultKind;
                    if (lite_isIdentityOrder) {
                        const lite_finalArgs: string[] = [...([])];
                        void lite_finalArgs;
                        let lite_pIdx = 0n;
                        void lite_pIdx;
                        while (((lite_pIdx) < ((lite_info).count))) {
                            const lite_expected$2 = liteFn$frontend$paramKindOf(lite$listAt((lite_params), lite$addInt((lite_info).first, lite_pIdx, 357927), 357916));
                            void lite_expected$2;
                            lite_finalArgs.push(liteFn$frontend$assignValueCode(lite_target, lite_expected$2, lite$listAt((lite_entryKinds), lite_pIdx, 358038), lite$listAt((lite_entryCodes), lite_pIdx, 358056)));
                            lite_pIdx = lite$addInt(lite_pIdx, 1n, 358101);
                        }
                        lite_emittedCode = (((((((lite_info).runtime) + ("("))) + (liteFn$lib$core$text$joinTexts([...(lite_finalArgs)], ", ")))) + (")"));
                    } else {
                        if (((lite_target) !== ("ts"))) {
                            liteFn$frontend$failAt(lite_source, lite_errPos, lite_prefix, "C backend does not support named or reordered call arguments yet");
                        }
                        const lite_evalStmts: string[] = [...([])];
                        void lite_evalStmts;
                        let lite_callDiverged = false;
                        void lite_callDiverged;
                        let lite_kIdx = 0n;
                        void lite_kIdx;
                        while (((lite_kIdx) < (lite_entryCount))) {
                            if ((!(lite_callDiverged))) {
                                const lite_targetSlot = lite$listAt((lite_entrySlots), lite_kIdx, 358717);
                                void lite_targetSlot;
                                if (((lite$listAt((lite_entryKinds), lite_kIdx, 358766)) === ("Never"))) {
                                    lite_evalStmts.push((((("return ") + (lite$listAt((lite_entryCodes), lite_kIdx, 358872)))) + (";")));
                                    lite_callDiverged = true;
                                } else if (((lite$listAt((lite_slotEntry), lite_targetSlot, 358987)) === (lite_kIdx))) {
                                    const lite_temp = (("lite$arg") + (liteFn$lib$core$int$intText(lite_kIdx)));
                                    void lite_temp;
                                    const lite_expected$2 = liteFn$frontend$paramKindOf(lite$listAt((lite_params), lite$addInt((lite_info).first, lite_targetSlot, 359159), 359148));
                                    void lite_expected$2;
                                    lite_evalStmts.push((((((((("const ") + (lite_temp))) + (" = "))) + (liteFn$frontend$assignValueCode(lite_target, lite_expected$2, lite$listAt((lite_entryKinds), lite_kIdx, 359310), lite$listAt((lite_entryCodes), lite_kIdx, 359328))))) + (";")));
                                } else {
                                    lite_evalStmts.push((((("void (") + (lite$listAt((lite_entryCodes), lite_kIdx, 359466)))) + (");")));
                                }
                            }
                            lite_kIdx = lite$addInt(lite_kIdx, 1n, 359573);
                        }
                        if (lite_callDiverged) {
                            lite_emittedCode = (((("(() => { ") + (liteFn$lib$core$text$joinTexts([...(lite_evalStmts)], " ")))) + (" })()"));
                            lite_emittedResultKind = "Never";
                        } else {
                            const lite_slotTemps: string[] = [...([])];
                            void lite_slotTemps;
                            let lite_sIdx = 0n;
                            void lite_sIdx;
                            while (((lite_sIdx) < ((lite_info).count))) {
                                lite_slotTemps.push((("lite$arg") + (liteFn$lib$core$int$intText(lite$listAt((lite_slotEntry), lite_sIdx, 360062)))));
                                lite_sIdx = lite$addInt(lite_sIdx, 1n, 360111);
                            }
                            const lite_callExpr = (((((((lite_info).runtime) + ("("))) + (liteFn$lib$core$text$joinTexts([...(lite_slotTemps)], ", ")))) + (")"));
                            void lite_callExpr;
                            const lite_retStmt = (Boolean((((lite_info).result) === ("Unit"))) ? (((("void (") + (lite_callExpr))) + ("); return undefined;")) : (((("return ") + (lite_callExpr))) + (";")));
                            void lite_retStmt;
                            lite_emittedCode = (((((((("(() => { ") + (liteFn$lib$core$text$joinTexts([...(lite_evalStmts)], " ")))) + (" "))) + (lite_retStmt))) + (" })()"));
                        }
                    }
                    lite_left = liteFn$frontend$withMarkers({ kind: lite_emittedResultKind, code: lite_emittedCode, intValue: 0n, textValue: "", constant: false, next: lite_cursor }, lite_callMarkers);
                }
            } else {
                break;
            }
        }
        while (Boolean(true)) {
            if ((((((lite_left).next) > (0n))) && (((liteFn$lib$core$text$at(lite_source, lite$subtractInt((lite_left).next, 1n, 360840))) === ("}"))))) {
                break;
            }
            const lite_operatorPosition = liteFn$frontend$skipTrivia(lite_source, (lite_left).next, lite_prefix);
            void lite_operatorPosition;
            if (((lite_operatorPosition) >= (liteFn$lib$core$text$length(lite_source)))) {
                break;
            }
            const lite_operator = liteFn$frontend$readOperator(lite_source, lite_operatorPosition);
            void lite_operator;
            if ((((lite_operator).text) === (""))) {
                break;
            }
            const lite_level = liteFn$frontend$operatorLevel((lite_operator).text);
            void lite_level;
            if (((lite_level) < (lite_effectiveMinimum))) {
                break;
            }
            if ((((lite_operator).text) === ("**"))) {
                let lite_signPosition = lite_start;
                void lite_signPosition;
                while (((((lite_signPosition) < (liteFn$lib$core$text$length(lite_source)))) && ((((((liteFn$lib$core$text$at(lite_source, lite_signPosition)) === ("+"))) || (((liteFn$lib$core$text$at(lite_source, lite_signPosition)) === ("-")))))))) {
                    if (((liteFn$lib$core$text$at(lite_source, lite_signPosition)) === ("-"))) {
                        liteFn$frontend$failAt(lite_source, lite_operatorPosition, lite_prefix, "group a negative power base as (-base) or negate the completed power as -(base ** exponent)");
                    }
                    lite_signPosition = liteFn$frontend$skipTrivia(lite_source, lite$addInt(lite_signPosition, 1n, 361710), lite_prefix);
                }
            }
            const lite_rightMinimum = (Boolean((((lite_operator).text) === ("**"))) ? lite_level : lite$addInt(lite_level, 1n, 361820));
            void lite_rightMinimum;
            const lite_right = liteFn$frontend$parseBinaryCtx(lite_target, lite_source, lite$addInt(lite_operatorPosition, (lite_operator).width, 361882), lite_prefix, [...(lite_locals)], [...(lite_functions)], [...(lite_params)], lite_currentName, "", lite_rightMinimum, [...(lite_ctxs)], lite_iifeDepth, lite_inferMode, "");
            void lite_right;
            let lite_opMarkers = (Boolean(lite_inferMode) ? liteFn$frontend$collectParsedMarkers(liteFn$frontend$collectParsedMarkers("", lite_left), lite_right) : "");
            void lite_opMarkers;
            const lite_leftLoopId = liteFn$frontend$loopValMarkerId((lite_left).kind);
            void lite_leftLoopId;
            const lite_rightLoopId = liteFn$frontend$loopValMarkerId((lite_right).kind);
            void lite_rightLoopId;
            if (((lite_inferMode) && ((((((lite_leftLoopId) >= (0n))) || (((lite_rightLoopId) >= (0n)))))))) {
                if (((((lite_leftLoopId) >= (0n))) && (((lite_rightLoopId) >= (0n))))) {
                    if ((((((lite_operator).text) === ("and"))) || ((((lite_operator).text) === ("or"))))) {
                        lite_opMarkers = ((((((((lite_opMarkers) + (liteFn$lib$core$int$intText(lite_leftLoopId)))) + ("=Bool\n"))) + (liteFn$lib$core$int$intText(lite_rightLoopId)))) + ("=Bool\n"));
                        lite_left = liteFn$frontend$boolParsed("", false, false, (lite_right).next);
                    } else if (liteFn$frontend$isComparison((lite_operator).text)) {
                        let lite_chainEnd = (lite_right).next;
                        void lite_chainEnd;
                        let lite_nextPos = liteFn$frontend$skipTrivia(lite_source, lite_chainEnd, lite_prefix);
                        void lite_nextPos;
                        let lite_nextOp = liteFn$frontend$comparisonOperatorAt(lite_source, lite_nextPos);
                        void lite_nextOp;
                        while (liteFn$frontend$isComparison((lite_nextOp).text)) {
                            const lite_operand = liteFn$frontend$parseBinaryCtx(lite_target, lite_source, lite$addInt(lite_nextPos, (lite_nextOp).width, 362968), lite_prefix, [...(lite_locals)], [...(lite_functions)], [...(lite_params)], lite_currentName, "", lite$addInt(lite_level, 1n, 363042), [...(lite_ctxs)], lite_iifeDepth, lite_inferMode, "");
                            void lite_operand;
                            lite_opMarkers = liteFn$frontend$collectParsedMarkers(lite_opMarkers, lite_operand);
                            lite_chainEnd = (lite_operand).next;
                            lite_nextPos = liteFn$frontend$skipTrivia(lite_source, lite_chainEnd, lite_prefix);
                            lite_nextOp = liteFn$frontend$comparisonOperatorAt(lite_source, lite_nextPos);
                        }
                        lite_left = liteFn$frontend$boolParsed("", false, false, lite_chainEnd);
                    } else if ((((lite_operator).text) === ("**"))) {
                        lite_left = { kind: "Float", code: "", intValue: 0n, textValue: "", constant: false, next: (lite_right).next };
                    } else {
                        lite_left = { kind: (lite_left).kind, code: "", intValue: 0n, textValue: "", constant: false, next: (lite_right).next };
                    }
                } else {
                    const lite_targetLoopId = (Boolean(((lite_leftLoopId) >= (0n))) ? lite_leftLoopId : lite_rightLoopId);
                    void lite_targetLoopId;
                    const lite_peerKind = (Boolean(((lite_leftLoopId) >= (0n))) ? (lite_right).kind : (lite_left).kind);
                    void lite_peerKind;
                    if ((((((lite_operator).text) === ("and"))) || ((((lite_operator).text) === ("or"))))) {
                        if (((lite_peerKind) !== ("Bool"))) {
                            liteFn$frontend$failAt(lite_source, lite_operatorPosition, lite_prefix, (((("operator ") + ((lite_operator).text))) + (" requires Bool operands")));
                        }
                        lite_opMarkers = ((((lite_opMarkers) + (liteFn$lib$core$int$intText(lite_targetLoopId)))) + ("=Bool\n"));
                        lite_left = liteFn$frontend$boolParsed("", false, false, (lite_right).next);
                    } else if (liteFn$frontend$isComparison((lite_operator).text)) {
                        if (((lite_peerKind) === ("Never"))) {
                            liteFn$frontend$failAt(lite_source, lite_operatorPosition, lite_prefix, "cannot compare Never values");
                        }
                        if (liteFn$frontend$isTupleKind(lite_peerKind)) {
                            liteFn$frontend$failAt(lite_source, lite_operatorPosition, lite_prefix, "cannot compare tuple values");
                        }
                        if (liteFn$frontend$isListKind(lite_peerKind)) {
                            liteFn$frontend$failAt(lite_source, lite_operatorPosition, lite_prefix, "cannot compare list values");
                        }
                        if ((((((((lite_operator).text) !== ("=="))) && ((((lite_operator).text) !== ("=!="))))) && ((!(liteFn$numeric__literals$isNumericKind(lite_peerKind)))))) {
                            liteFn$frontend$failAt(lite_source, lite_operatorPosition, lite_prefix, (((("operator ") + ((lite_operator).text))) + (" requires Int operands")));
                        }
                        lite_opMarkers = ((((((((lite_opMarkers) + (liteFn$lib$core$int$intText(lite_targetLoopId)))) + ("="))) + (lite_peerKind))) + ("\n"));
                        let lite_chainEnd = (lite_right).next;
                        void lite_chainEnd;
                        let lite_nextPos = liteFn$frontend$skipTrivia(lite_source, lite_chainEnd, lite_prefix);
                        void lite_nextPos;
                        let lite_nextOp = liteFn$frontend$comparisonOperatorAt(lite_source, lite_nextPos);
                        void lite_nextOp;
                        while (liteFn$frontend$isComparison((lite_nextOp).text)) {
                            const lite_operand = liteFn$frontend$parseBinaryCtx(lite_target, lite_source, lite$addInt(lite_nextPos, (lite_nextOp).width, 365475), lite_prefix, [...(lite_locals)], [...(lite_functions)], [...(lite_params)], lite_currentName, "", lite$addInt(lite_level, 1n, 365549), [...(lite_ctxs)], lite_iifeDepth, lite_inferMode, "");
                            void lite_operand;
                            lite_opMarkers = liteFn$frontend$collectParsedMarkers(lite_opMarkers, lite_operand);
                            lite_chainEnd = (lite_operand).next;
                            lite_nextPos = liteFn$frontend$skipTrivia(lite_source, lite_chainEnd, lite_prefix);
                            lite_nextOp = liteFn$frontend$comparisonOperatorAt(lite_source, lite_nextPos);
                        }
                        lite_left = liteFn$frontend$boolParsed("", false, false, lite_chainEnd);
                    } else if ((((lite_operator).text) === ("**"))) {
                        if ((!(liteFn$numeric__literals$isNumericKind(lite_peerKind)))) {
                            liteFn$frontend$failAt(lite_source, lite_operatorPosition, lite_prefix, "power requires Int or Float operands");
                        }
                        lite_opMarkers = ((((((((lite_opMarkers) + (liteFn$lib$core$int$intText(lite_targetLoopId)))) + ("="))) + (lite_peerKind))) + ("\n"));
                        lite_left = { kind: "Float", code: "", intValue: 0n, textValue: "", constant: false, next: (lite_right).next };
                    } else if ((((((lite_operator).text) === ("+"))) && (((lite_peerKind) === ("String"))))) {
                        lite_opMarkers = ((((lite_opMarkers) + (liteFn$lib$core$int$intText(lite_targetLoopId)))) + ("=String\n"));
                        lite_left = liteFn$frontend$textParsed("", "", false, (lite_right).next);
                    } else if (liteFn$numeric__literals$isNumericKind(lite_peerKind)) {
                        if ((((((((((!(liteFn$numeric__literals$isIntKind(lite_peerKind)))) && ((((lite_operator).text) !== ("+"))))) && ((((lite_operator).text) !== ("-"))))) && ((((lite_operator).text) !== ("*"))))) && ((((lite_operator).text) !== ("/"))))) {
                            liteFn$frontend$failAt(lite_source, lite_operatorPosition, lite_prefix, (((("operator ") + ((lite_operator).text))) + (" requires Int operands")));
                        }
                        lite_opMarkers = ((((((((lite_opMarkers) + (liteFn$lib$core$int$intText(lite_targetLoopId)))) + ("="))) + (lite_peerKind))) + ("\n"));
                        lite_left = { kind: lite_peerKind, code: "", intValue: 0n, textValue: "", constant: false, next: (lite_right).next };
                    } else if (liteFn$frontend$isListKind(lite_peerKind)) {
                        liteFn$frontend$failAt(lite_source, lite_operatorPosition, lite_prefix, (((("operator ") + ((lite_operator).text))) + (" is not supported for list values")));
                    } else if ((((lite_operator).text) === ("+"))) {
                        liteFn$frontend$failAt(lite_source, lite_operatorPosition, lite_prefix, "cannot mix Int and String operands");
                    } else {
                        liteFn$frontend$failAt(lite_source, lite_operatorPosition, lite_prefix, (((("operator ") + ((lite_operator).text))) + (" requires Int operands")));
                    }
                }
            } else if ((((((lite_operator).text) === ("and"))) || ((((lite_operator).text) === ("or"))))) {
                if ((((((lite_left).kind) !== ("Bool"))) || ((((lite_right).kind) !== ("Bool"))))) {
                    liteFn$frontend$failAt(lite_source, lite_operatorPosition, lite_prefix, (((("operator ") + ((lite_operator).text))) + (" requires Bool operands")));
                }
                if ((((lite_left).constant) && ((lite_right).constant))) {
                    const lite_value = (Boolean((((lite_operator).text) === ("and"))) ? (((((lite_left).intValue) !== (0n))) && ((((lite_right).intValue) !== (0n)))) : (((((lite_left).intValue) !== (0n))) || ((((lite_right).intValue) !== (0n)))));
                    void lite_value;
                    lite_left = liteFn$frontend$boolParsed(liteFn$frontend$targetBoolLiteralCode(lite_target, lite_value), lite_value, true, (lite_right).next);
                } else {
                    lite_left = liteFn$frontend$boolParsed(liteFn$frontend$targetLogicCode(lite_target, (lite_operator).text, (lite_left).code, (lite_right).code), false, false, (lite_right).next);
                }
            } else if (liteFn$frontend$isComparison((lite_operator).text)) {
                const lite_firstPair = liteFn$frontend$compareParsed(lite_target, lite_source, lite_operatorPosition, (lite_operator).text, lite_left, lite_right, lite_prefix);
                void lite_firstPair;
                let lite_nextPosition = liteFn$frontend$skipTrivia(lite_source, (lite_right).next, lite_prefix);
                void lite_nextPosition;
                let lite_nextOperator = liteFn$frontend$comparisonOperatorAt(lite_source, lite_nextPosition);
                void lite_nextOperator;
                if ((!(liteFn$frontend$isComparison((lite_nextOperator).text)))) {
                    lite_left = lite_firstPair;
                } else {
                    const lite_codes: string[] = [...([(lite_left).code, (lite_right).code])];
                    void lite_codes;
                    const lite_kinds: string[] = [...([(lite_left).kind, (lite_right).kind])];
                    void lite_kinds;
                    const lite_operators: string[] = [...([(lite_operator).text])];
                    void lite_operators;
                    let lite_count = 1n;
                    void lite_count;
                    let lite_previous = lite_right;
                    void lite_previous;
                    let lite_end = (lite_right).next;
                    void lite_end;
                    let lite_constant = (((lite_left).constant) && ((lite_right).constant));
                    void lite_constant;
                    let lite_value = (((lite_firstPair).intValue) !== (0n));
                    void lite_value;
                    while (liteFn$frontend$isComparison((lite_nextOperator).text)) {
                        const lite_operand = liteFn$frontend$parseBinaryCtx(lite_target, lite_source, lite$addInt(lite_nextPosition, (lite_nextOperator).width, 369482), lite_prefix, [...(lite_locals)], [...(lite_functions)], [...(lite_params)], lite_currentName, "", lite$addInt(lite_level, 1n, 369562), [...(lite_ctxs)], lite_iifeDepth, lite_inferMode, "");
                        void lite_operand;
                        if (lite_inferMode) {
                            lite_opMarkers = liteFn$frontend$collectParsedMarkers(lite_opMarkers, lite_operand);
                        }
                        const lite_pair = liteFn$frontend$compareParsed(lite_target, lite_source, lite_nextPosition, (lite_nextOperator).text, lite_previous, lite_operand, lite_prefix);
                        void lite_pair;
                        lite_codes.push((lite_operand).code);
                        lite_kinds.push((lite_operand).kind);
                        lite_operators.push((lite_nextOperator).text);
                        lite_constant = ((lite_constant) && ((lite_operand).constant));
                        if (lite_constant) {
                            lite_value = ((lite_value) && ((((lite_pair).intValue) !== (0n))));
                        }
                        lite_count = lite$addInt(lite_count, 1n, 370179);
                        lite_previous = lite_operand;
                        lite_end = (lite_operand).next;
                        lite_nextPosition = liteFn$frontend$skipTrivia(lite_source, lite_end, lite_prefix);
                        lite_nextOperator = liteFn$frontend$comparisonOperatorAt(lite_source, lite_nextPosition);
                    }
                    if (lite_constant) {
                        lite_left = liteFn$frontend$boolParsed(liteFn$frontend$targetBoolLiteralCode(lite_target, lite_value), lite_value, true, lite_end);
                    } else {
                        lite_left = liteFn$frontend$boolParsed(liteFn$frontend$targetComparisonChainCode(lite_target, [...(lite_codes)], [...(lite_kinds)], [...(lite_operators)], lite_count, lite_operatorPosition), false, false, lite_end);
                    }
                }
            } else if ((((lite_operator).text) === ("**"))) {
                if ((((!(liteFn$numeric__literals$isNumericKind((lite_left).kind)))) || ((!(liteFn$numeric__literals$isNumericKind((lite_right).kind)))))) {
                    liteFn$frontend$failAt(lite_source, lite_operatorPosition, lite_prefix, "power requires Int or Float operands");
                }
                const lite_code = liteFn$frontend$targetFloatPowerCode(lite_target, liteFn$frontend$targetFloatOperandCode(lite_target, (lite_left).kind, (lite_left).code), liteFn$frontend$targetFloatOperandCode(lite_target, (lite_right).kind, (lite_right).code), lite_operatorPosition);
                void lite_code;
                lite_left = { kind: "Float", code: lite_code, intValue: 0n, textValue: "", constant: false, next: (lite_right).next };
            } else if (((liteFn$numeric__literals$isIntKind((lite_left).kind)) && (liteFn$numeric__literals$isIntKind((lite_right).kind)))) {
                const lite_promoted = liteFn$numeric__literals$promoteNumericKind((lite_left).kind, (lite_right).kind);
                void lite_promoted;
                if ((((lite_left).constant) && ((lite_right).constant))) {
                    const lite_folded = liteFn$frontend$tryFoldInteger((lite_operator).text, (lite_left).intValue, (lite_right).intValue);
                    void lite_folded;
                    if ((((lite_folded).ok) && (liteFn$numeric__literals$intKindFits(lite_promoted, (lite_folded).value)))) {
                        const lite_code = (Boolean(((((((((((lite_operator).text) === ("%"))) || ((((lite_operator).text) === (":%")))))) && ((((lite_left).intValue) === (liteFn$lib$core$int$intMin()))))) && ((((lite_right).intValue) === ((-1n)))))) ? liteFn$frontend$targetIntLiteralCode(lite_target, 0n, false, "0") : (Boolean((((lite_operator).text) === (":/"))) ? liteFn$frontend$targetFloorDivCode(lite_target, (lite_left).code, (lite_right).code) : (Boolean((((lite_operator).text) === (":%"))) ? liteFn$frontend$targetFloorModCode(lite_target, (lite_left).code, (lite_right).code) : (((((((((((("(") + ((lite_left).code))) + (" "))) + ((lite_operator).text))) + (" "))) + ((lite_right).code))) + (")")))));
                        void lite_code;
                        lite_left = liteFn$frontend$typedIntParsed(lite_promoted, lite_code, (lite_folded).value, true, (lite_right).next);
                    } else {
                        lite_left = liteFn$frontend$typedIntParsed(lite_promoted, liteFn$frontend$runtimeTypedIntegerCode(lite_target, lite_promoted, (lite_operator).text, (lite_left).code, (lite_right).code, lite_operatorPosition), 0n, false, (lite_right).next);
                    }
                } else {
                    lite_left = liteFn$frontend$typedIntParsed(lite_promoted, liteFn$frontend$runtimeTypedIntegerCode(lite_target, lite_promoted, (lite_operator).text, (lite_left).code, (lite_right).code, lite_operatorPosition), 0n, false, (lite_right).next);
                }
            } else if ((((((((lite_operator).text) === ("+"))) && ((((lite_left).kind) === ("String"))))) && ((((lite_right).kind) === ("String"))))) {
                if ((((lite_left).constant) && ((lite_right).constant))) {
                    const lite_combined = (((lite_left).textValue) + ((lite_right).textValue));
                    void lite_combined;
                    lite_left = liteFn$frontend$textParsed(liteFn$frontend$targetTextLiteralCode(lite_target, lite_combined), lite_combined, true, (lite_right).next);
                } else {
                    lite_left = liteFn$frontend$textParsed(liteFn$frontend$targetConcatCode(lite_target, (lite_left).code, (lite_right).code), "", false, (lite_right).next);
                }
            } else if (((liteFn$numeric__literals$isNumericKind((lite_left).kind)) && (liteFn$numeric__literals$isNumericKind((lite_right).kind)))) {
                if ((((((((((lite_operator).text) !== ("+"))) && ((((lite_operator).text) !== ("-"))))) && ((((lite_operator).text) !== ("*"))))) && ((((lite_operator).text) !== ("/"))))) {
                    liteFn$frontend$failAt(lite_source, lite_operatorPosition, lite_prefix, (((("operator ") + ((lite_operator).text))) + (" requires Int operands")));
                }
                const lite_promotedFloat = liteFn$numeric__literals$promoteNumericKind((lite_left).kind, (lite_right).kind);
                void lite_promotedFloat;
                const lite_floatKind = (Boolean(((lite_promotedFloat) !== (""))) ? lite_promotedFloat : (Boolean(liteFn$numeric__literals$isFloatKind((lite_left).kind)) ? (lite_left).kind : (lite_right).kind));
                void lite_floatKind;
                const lite_code = (Boolean(((lite_floatKind) === ("Float32"))) ? liteFn$frontend$targetFloat32BinaryCode(lite_target, (lite_operator).text, liteFn$frontend$targetFloat32OperandCode(lite_target, (lite_left).kind, (lite_left).code), liteFn$frontend$targetFloat32OperandCode(lite_target, (lite_right).kind, (lite_right).code), lite_operatorPosition) : liteFn$frontend$targetFloatBinaryCode(lite_target, (lite_operator).text, liteFn$frontend$targetFloatOperandCode(lite_target, (lite_left).kind, (lite_left).code), liteFn$frontend$targetFloatOperandCode(lite_target, (lite_right).kind, (lite_right).code), lite_operatorPosition));
                void lite_code;
                lite_left = { kind: lite_floatKind, code: lite_code, intValue: 0n, textValue: "", constant: false, next: (lite_right).next };
            } else if (((liteFn$frontend$isListKind((lite_left).kind)) || (liteFn$frontend$isListKind((lite_right).kind)))) {
                liteFn$frontend$failAt(lite_source, lite_operatorPosition, lite_prefix, (((("operator ") + ((lite_operator).text))) + (" is not supported for list values")));
            } else if ((((lite_operator).text) === ("+"))) {
                liteFn$frontend$failAt(lite_source, lite_operatorPosition, lite_prefix, "cannot mix Int and String operands");
            } else {
                liteFn$frontend$failAt(lite_source, lite_operatorPosition, lite_prefix, (((("operator ") + ((lite_operator).text))) + (" requires Int operands")));
            }
            if (((lite_inferMode) && (((lite_opMarkers) !== (""))))) {
                lite_left = liteFn$frontend$withMarkers(lite_left, lite_opMarkers);
            }
        }
        if (((((lite_leaderStart) >= (0n))) && ((((lite_left).kind) !== ("Bool"))))) {
            liteFn$frontend$failAt(lite_source, lite_leaderStart, lite_prefix, (((("leading ") + (lite_leaderText))) + (" requires a Bool expression")));
        }
        return lite_left;
    }
    void liteFn$frontend$parseBinaryCtx;
    function liteFn$frontend$parseBinary(lite_target: string, lite_source: string, lite_position: bigint, lite_prefix: string, lite_locals: { name: string; runtime: string; kind: string; mutable: boolean; writable: boolean; depth: bigint; constant: boolean; code: string; intValue: bigint; textValue: string; initState: string }[], lite_functions: { name: string; runtime: string; result: string; first: bigint; count: bigint }[], lite_params: string[], lite_currentName: string, lite_expected: string, lite_minimum: bigint): { kind: string; code: string; intValue: bigint; textValue: string; constant: boolean; next: bigint } {
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
        return liteFn$frontend$parseBinaryCtx(lite_target, lite_source, lite_position, lite_prefix, [...(lite_locals)], [...(lite_functions)], [...(lite_params)], lite_currentName, lite_expected, lite_minimum, [...([])], 0n, false, "");
    }
    void liteFn$frontend$parseBinary;
    function liteFn$frontend$parseExpressionAsCtx(lite_target: string, lite_source: string, lite_position: bigint, lite_prefix: string, lite_locals: { name: string; runtime: string; kind: string; mutable: boolean; writable: boolean; depth: bigint; constant: boolean; code: string; intValue: bigint; textValue: string; initState: string }[], lite_functions: { name: string; runtime: string; result: string; first: bigint; count: bigint }[], lite_params: string[], lite_currentName: string, lite_expected: string, lite_ctxs: { id: bigint; tag: string; kind: string; phase: string; iifeDepth: bigint; valKind: string; valVar: string; label: string; iterLabel: string; countVar: string; itemVar: string; itemKind: string; indexVar: string; hasIndex: boolean }[]): { kind: string; code: string; intValue: bigint; textValue: string; constant: boolean; next: bigint } {
        void lite_target;
        void lite_source;
        void lite_position;
        void lite_prefix;
        void lite_locals;
        void lite_functions;
        void lite_params;
        void lite_currentName;
        void lite_expected;
        void lite_ctxs;
        return liteFn$frontend$parseBinaryCtx(lite_target, lite_source, lite_position, lite_prefix, [...(lite_locals)], [...(lite_functions)], [...(lite_params)], lite_currentName, lite_expected, 0n, [...(lite_ctxs)], 0n, false, "");
    }
    void liteFn$frontend$parseExpressionAsCtx;
    function liteFn$frontend$parseStatementExpressionCtx(lite_target: string, lite_source: string, lite_position: bigint, lite_prefix: string, lite_locals: { name: string; runtime: string; kind: string; mutable: boolean; writable: boolean; depth: bigint; constant: boolean; code: string; intValue: bigint; textValue: string; initState: string }[], lite_functions: { name: string; runtime: string; result: string; first: bigint; count: bigint }[], lite_params: string[], lite_currentName: string, lite_expected: string, lite_ctxs: { id: bigint; tag: string; kind: string; phase: string; iifeDepth: bigint; valKind: string; valVar: string; label: string; iterLabel: string; countVar: string; itemVar: string; itemKind: string; indexVar: string; hasIndex: boolean }[]): { kind: string; code: string; intValue: bigint; textValue: string; constant: boolean; next: bigint } {
        void lite_target;
        void lite_source;
        void lite_position;
        void lite_prefix;
        void lite_locals;
        void lite_functions;
        void lite_params;
        void lite_currentName;
        void lite_expected;
        void lite_ctxs;
        return liteFn$frontend$parseBinaryCtx(lite_target, lite_source, lite_position, lite_prefix, [...(lite_locals)], [...(lite_functions)], [...(lite_params)], lite_currentName, lite_expected, (-2n), [...(lite_ctxs)], 0n, false, "");
    }
    void liteFn$frontend$parseStatementExpressionCtx;
    function liteFn$frontend$parseExpressionAs(lite_target: string, lite_source: string, lite_position: bigint, lite_prefix: string, lite_locals: { name: string; runtime: string; kind: string; mutable: boolean; writable: boolean; depth: bigint; constant: boolean; code: string; intValue: bigint; textValue: string; initState: string }[], lite_functions: { name: string; runtime: string; result: string; first: bigint; count: bigint }[], lite_params: string[], lite_currentName: string, lite_expected: string): { kind: string; code: string; intValue: bigint; textValue: string; constant: boolean; next: bigint } {
        void lite_target;
        void lite_source;
        void lite_position;
        void lite_prefix;
        void lite_locals;
        void lite_functions;
        void lite_params;
        void lite_currentName;
        void lite_expected;
        return liteFn$frontend$parseBinary(lite_target, lite_source, lite_position, lite_prefix, [...(lite_locals)], [...(lite_functions)], [...(lite_params)], lite_currentName, lite_expected, 0n);
    }
    void liteFn$frontend$parseExpressionAs;
    function liteFn$frontend$parseExpressionCtx(lite_target: string, lite_source: string, lite_position: bigint, lite_prefix: string, lite_locals: { name: string; runtime: string; kind: string; mutable: boolean; writable: boolean; depth: bigint; constant: boolean; code: string; intValue: bigint; textValue: string; initState: string }[], lite_functions: { name: string; runtime: string; result: string; first: bigint; count: bigint }[], lite_params: string[], lite_currentName: string, lite_ctxs: { id: bigint; tag: string; kind: string; phase: string; iifeDepth: bigint; valKind: string; valVar: string; label: string; iterLabel: string; countVar: string; itemVar: string; itemKind: string; indexVar: string; hasIndex: boolean }[]): { kind: string; code: string; intValue: bigint; textValue: string; constant: boolean; next: bigint } {
        void lite_target;
        void lite_source;
        void lite_position;
        void lite_prefix;
        void lite_locals;
        void lite_functions;
        void lite_params;
        void lite_currentName;
        void lite_ctxs;
        return liteFn$frontend$parseBinaryCtx(lite_target, lite_source, lite_position, lite_prefix, [...(lite_locals)], [...(lite_functions)], [...(lite_params)], lite_currentName, "", 0n, [...(lite_ctxs)], 0n, false, "");
    }
    void liteFn$frontend$parseExpressionCtx;
    function liteFn$frontend$parseExpression(lite_target: string, lite_source: string, lite_position: bigint, lite_prefix: string, lite_locals: { name: string; runtime: string; kind: string; mutable: boolean; writable: boolean; depth: bigint; constant: boolean; code: string; intValue: bigint; textValue: string; initState: string }[], lite_functions: { name: string; runtime: string; result: string; first: bigint; count: bigint }[], lite_params: string[], lite_currentName: string): { kind: string; code: string; intValue: bigint; textValue: string; constant: boolean; next: bigint } {
        void lite_target;
        void lite_source;
        void lite_position;
        void lite_prefix;
        void lite_locals;
        void lite_functions;
        void lite_params;
        void lite_currentName;
        return liteFn$frontend$parseBinary(lite_target, lite_source, lite_position, lite_prefix, [...(lite_locals)], [...(lite_functions)], [...(lite_params)], lite_currentName, "", 0n);
    }
    void liteFn$frontend$parseExpression;
    function liteFn$frontend$sourcePrefix(): string {
        let lite_prefix = "";
        void lite_prefix;
        let lite_argumentIndex = 0n;
        void lite_argumentIndex;
        for (const lite_argument of [...(lite$inputArgs())]) {
            void lite_argument;
            if (((lite_argumentIndex) === (0n))) {
                lite_prefix = lite_argument;
            }
            lite_argumentIndex = lite$addInt(lite_argumentIndex, 1n, 377943);
        }
        return lite_prefix;
    }
    void liteFn$frontend$sourcePrefix;
    function liteFn$frontend$sourceModuleIdentity(): string {
        let lite_identity = "";
        void lite_identity;
        let lite_argumentIndex = 0n;
        void lite_argumentIndex;
        for (const lite_argument of [...(lite$inputArgs())]) {
            void lite_argument;
            if (((lite_argumentIndex) === (1n))) {
                lite_identity = lite_argument;
            }
            lite_argumentIndex = lite$addInt(lite_argumentIndex, 1n, 378270);
        }
        return lite_identity;
    }
    void liteFn$frontend$sourceModuleIdentity;
    function liteFn$frontend$sourceModulePath(): string {
        let lite_path = "";
        void lite_path;
        let lite_argumentIndex = 0n;
        void lite_argumentIndex;
        for (const lite_argument of [...(lite$inputArgs())]) {
            void lite_argument;
            if (((lite_argumentIndex) === (2n))) {
                lite_path = lite_argument;
            }
            lite_argumentIndex = lite$addInt(lite_argumentIndex, 1n, 378588);
        }
        return lite_path;
    }
    void liteFn$frontend$sourceModulePath;
    function liteFn$frontend$storageKind(lite_kind: string): string {
        void lite_kind;
        return (Boolean(((liteFn$frontend$isListKind(lite_kind)) || (liteFn$frontend$isArrayKind(lite_kind)))) ? "List" : (Boolean(liteFn$frontend$isTupleKind(lite_kind)) ? "Tuple" : (Boolean(liteFn$numeric__literals$isIntKind(lite_kind)) ? "Int" : (Boolean(liteFn$numeric__literals$isFloatKind(lite_kind)) ? "Float" : lite_kind))));
    }
    void liteFn$frontend$storageKind;
    function liteFn$frontend$itemTextPayload(lite_parsed: { kind: string; code: string; intValue: bigint; textValue: string; constant: boolean; next: bigint }): string {
        void lite_parsed;
        return (Boolean(((liteFn$frontend$isListKind((lite_parsed).kind)) || (liteFn$frontend$isArrayKind((lite_parsed).kind)))) ? (lite_parsed).kind : (lite_parsed).textValue);
    }
    void liteFn$frontend$itemTextPayload;
    function liteFn$frontend$parsePartialAssignIf(lite_target: string, lite_source: string, lite_position: bigint, lite_prefix: string, lite_locals: { name: string; runtime: string; kind: string; mutable: boolean; writable: boolean; depth: bigint; constant: boolean; code: string; intValue: bigint; textValue: string; initState: string }[], lite_functions: { name: string; runtime: string; result: string; first: bigint; count: bigint }[], lite_params: string[], lite_currentName: string, lite_targetAt: bigint, lite_targetKind: string, lite_targetName: string, lite_targetRuntime: string, lite_ctxs: { id: bigint; tag: string; kind: string; phase: string; iifeDepth: bigint; valKind: string; valVar: string; label: string; iterLabel: string; countVar: string; itemVar: string; itemKind: string; indexVar: string; hasIndex: boolean }[]): { kind: string; name: string; runtime: string; code: string; intValue: bigint; textValue: string }[] {
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
        void lite_ctxs;
        let lite_inner = liteFn$frontend$skipTrivia(lite_source, lite_position, lite_prefix);
        void lite_inner;
        let lite_parenCount = 0n;
        void lite_parenCount;
        while (((((lite_inner) < (liteFn$lib$core$text$length(lite_source)))) && (((liteFn$lib$core$text$at(lite_source, lite_inner)) === ("("))))) {
            lite_parenCount = lite$addInt(lite_parenCount, 1n, 379953);
            lite_inner = liteFn$frontend$skipTrivia(lite_source, lite$addInt(lite_inner, 1n, 379999), lite_prefix);
        }
        if ((!(liteFn$lib$core$text$wordAt(lite_source, lite_inner, "if")))) {
            return [...([])];
        }
        const lite_result: { kind: string; name: string; runtime: string; code: string; intValue: bigint; textValue: string }[] = [...([])];
        void lite_result;
        let lite_cursor = liteFn$frontend$skipTrivia(lite_source, lite$addInt(lite_inner, 2n, 380157), lite_prefix);
        void lite_cursor;
        let lite_isFirst = true;
        void lite_isFirst;
        while (Boolean(true)) {
            liteFn$frontend$rejectHeaderBlockTag(lite_source, lite_cursor, lite_prefix, (Boolean(lite_isFirst) ? "if" : "else if"));
            const lite_conditionStart = lite_cursor;
            void lite_conditionStart;
            const lite_condition = liteFn$frontend$parseExpressionCtx(lite_target, lite_source, lite_conditionStart, lite_prefix, [...(lite_locals)], [...(lite_functions)], [...(lite_params)], lite_currentName, [...(lite_ctxs)]);
            void lite_condition;
            if ((((lite_condition).kind) !== ("Bool"))) {
                liteFn$frontend$failAt(lite_source, lite_conditionStart, lite_prefix, "if condition must be Bool");
            }
            const lite_conditionCode = (Boolean((lite_condition).constant) ? liteFn$frontend$targetBoolLiteralCode(lite_target, (((lite_condition).intValue) !== (0n))) : (lite_condition).code);
            void lite_conditionCode;
            const lite_beforeOpen = liteFn$frontend$skipTrivia(lite_source, (lite_condition).next, lite_prefix);
            void lite_beforeOpen;
            liteFn$frontend$rejectMisplacedTag(lite_source, lite_beforeOpen, lite_prefix, "block tag cannot appear before { in if");
            const lite_open = liteFn$frontend$expectSymbol(lite_source, lite_beforeOpen, "{", lite_prefix);
            void lite_open;
            const lite_branchStart = liteFn$frontend$skipTrivia(lite_source, lite_open, lite_prefix);
            void lite_branchStart;
            const lite_branch = liteFn$frontend$parseExpressionAsCtx(lite_target, lite_source, lite_branchStart, lite_prefix, [...(lite_locals)], [...(lite_functions)], [...(lite_params)], lite_currentName, lite_targetKind, [...(lite_ctxs)]);
            void lite_branch;
            if ((!(liteFn$frontend$isCompatibleKind(lite_targetKind, (lite_branch).kind)))) {
                liteFn$frontend$failAt(lite_source, lite_targetAt, lite_prefix, (((((((((("cannot assign ") + (liteFn$frontend$displayKind((lite_branch).kind)))) + (" to "))) + (liteFn$frontend$displayKind(lite_targetKind)))) + (" local "))) + (lite_targetName)));
            }
            lite_cursor = liteFn$frontend$expectSymbol(lite_source, liteFn$frontend$skipTrivia(lite_source, (lite_branch).next, lite_prefix), "}", lite_prefix);
            lite_result.push({ kind: (Boolean(lite_isFirst) ? "If" : "ElseIf"), name: "", runtime: "", code: lite_conditionCode, intValue: 0n, textValue: "" });
            lite_result.push({ kind: (("Assign") + (liteFn$frontend$storageKind(lite_targetKind))), name: lite_targetName, runtime: lite_targetRuntime, code: liteFn$frontend$assignValueCode(lite_target, lite_targetKind, (lite_branch).kind, (lite_branch).code), intValue: (lite_branch).intValue, textValue: liteFn$frontend$itemTextPayload(lite_branch) });
            lite_isFirst = false;
            const lite_afterBranch = liteFn$frontend$skipTrivia(lite_source, lite_cursor, lite_prefix);
            void lite_afterBranch;
            if ((!(liteFn$lib$core$text$wordAt(lite_source, lite_afterBranch, "else")))) {
                let lite_end = lite_afterBranch;
                void lite_end;
                let lite_remaining = lite_parenCount;
                void lite_remaining;
                let lite_matched = true;
                void lite_matched;
                while (((lite_remaining) > (0n))) {
                    if (((((lite_end) >= (liteFn$lib$core$text$length(lite_source)))) || (((liteFn$lib$core$text$at(lite_source, lite_end)) !== (")"))))) {
                        lite_matched = false;
                        break;
                    }
                    lite_end = liteFn$frontend$skipTrivia(lite_source, lite$addInt(lite_end, 1n, 382451), lite_prefix);
                    lite_remaining = lite$subtractInt(lite_remaining, 1n, 382503);
                }
                const lite_statementNext = (Boolean(lite_matched) ? liteFn$frontend$consumeStatementEnd(lite_source, lite_end, lite_prefix) : (-1n));
                void lite_statementNext;
                if (((lite_statementNext) < (0n))) {
                    liteFn$frontend$failAt(lite_source, lite_afterBranch, lite_prefix, "value if requires a final else");
                }
                lite_result.push({ kind: "EndIf", name: "", runtime: "", code: "", intValue: 0n, textValue: "" });
                lite_result.push({ kind: "End", name: "", runtime: "", code: "", intValue: lite_statementNext, textValue: "" });
                return [...(lite_result)];
            }
            const lite_afterElse = liteFn$frontend$skipTrivia(lite_source, lite$addInt(lite_afterBranch, 4n, 383107), lite_prefix);
            void lite_afterElse;
            liteFn$frontend$rejectMisplacedTag(lite_source, lite_afterElse, lite_prefix, "block tag cannot appear after else");
            if ((!(liteFn$lib$core$text$wordAt(lite_source, lite_afterElse, "if")))) {
                return [...([])];
            }
            lite_cursor = liteFn$frontend$skipTrivia(lite_source, lite$addInt(lite_afterElse, 2n, 383350), lite_prefix);
        }
        return [...([])];
    }
    void liteFn$frontend$parsePartialAssignIf;
    function liteFn$frontend$parseInitializerExpression(lite_target: string, lite_source: string, lite_position: bigint, lite_prefix: string, lite_locals: { name: string; runtime: string; kind: string; mutable: boolean; writable: boolean; depth: bigint; constant: boolean; code: string; intValue: bigint; textValue: string; initState: string }[], lite_functions: { name: string; runtime: string; result: string; first: bigint; count: bigint }[], lite_params: string[], lite_currentName: string, lite_expected: string, lite_ctxs: { id: bigint; tag: string; kind: string; phase: string; iifeDepth: bigint; valKind: string; valVar: string; label: string; iterLabel: string; countVar: string; itemVar: string; itemKind: string; indexVar: string; hasIndex: boolean }[]): { kind: string; code: string; intValue: bigint; textValue: string; constant: boolean; next: bigint } {
        void lite_target;
        void lite_source;
        void lite_position;
        void lite_prefix;
        void lite_locals;
        void lite_functions;
        void lite_params;
        void lite_currentName;
        void lite_expected;
        void lite_ctxs;
        let lite_inner = liteFn$frontend$skipTrivia(lite_source, lite_position, lite_prefix);
        void lite_inner;
        let lite_parenCount = 0n;
        void lite_parenCount;
        while (((((lite_inner) < (liteFn$lib$core$text$length(lite_source)))) && (((liteFn$lib$core$text$at(lite_source, lite_inner)) === ("("))))) {
            lite_parenCount = lite$addInt(lite_parenCount, 1n, 383928);
            lite_inner = liteFn$frontend$skipTrivia(lite_source, lite$addInt(lite_inner, 1n, 383974), lite_prefix);
        }
        const lite_ifKwPos = liteFn$frontend$skipOptionalScanTag(lite_source, lite_inner, lite_prefix, "if");
        void lite_ifKwPos;
        if (((((lite_ifKwPos) >= (0n))) && (liteFn$lib$core$text$wordAt(lite_source, lite_ifKwPos, "if")))) {
            const lite_scannedEnd = liteFn$frontend$scanIfChainEnd(lite_source, lite_inner, lite_prefix, false, true);
            void lite_scannedEnd;
            if (((lite_scannedEnd) >= (0n))) {
                let lite_end = liteFn$frontend$skipTrivia(lite_source, lite_scannedEnd, lite_prefix);
                void lite_end;
                let lite_remaining = lite_parenCount;
                void lite_remaining;
                let lite_matched = true;
                void lite_matched;
                while (((lite_remaining) > (0n))) {
                    if (((((lite_end) >= (liteFn$lib$core$text$length(lite_source)))) || (((liteFn$lib$core$text$at(lite_source, lite_end)) !== (")"))))) {
                        lite_matched = false;
                        break;
                    }
                    lite_end = liteFn$frontend$skipTrivia(lite_source, lite$addInt(lite_end, 1n, 384609), lite_prefix);
                    lite_remaining = lite$subtractInt(lite_remaining, 1n, 384661);
                }
                if (((lite_matched) && (((liteFn$frontend$consumeStatementEnd(lite_source, lite_end, lite_prefix)) >= (0n))))) {
                    const lite_parsed = liteFn$frontend$parseBinaryCtx(lite_target, lite_source, lite_inner, lite_prefix, [...(lite_locals)], [...(lite_functions)], [...(lite_params)], lite_currentName, lite_expected, (-1n), [...(lite_ctxs)], 0n, false, "");
                    void lite_parsed;
                    return { kind: (lite_parsed).kind, code: (lite_parsed).code, intValue: (lite_parsed).intValue, textValue: (lite_parsed).textValue, constant: (lite_parsed).constant, next: lite_end };
                }
            }
        }
        return liteFn$frontend$parseExpressionAsCtx(lite_target, lite_source, lite_position, lite_prefix, [...(lite_locals)], [...(lite_functions)], [...(lite_params)], lite_currentName, lite_expected, [...(lite_ctxs)]);
    }
    void liteFn$frontend$parseInitializerExpression;
    function liteFn$frontend$atValueTail(lite_blocks: string[], lite_blockCount: bigint): boolean {
        void lite_blocks;
        void lite_blockCount;
        if (((lite_blockCount) <= (0n))) {
            return false;
        }
        const lite_kind = lite$listAt((lite_blocks), lite$subtractInt(lite_blockCount, 1n, 385502), 385491);
        void lite_kind;
        return ((((((((((lite_kind) === ("function"))) || (((lite_kind) === ("ifvalue"))))) || (((lite_kind) === ("matchvalue"))))) || (((lite_kind) === ("matchelseval"))))) || (((lite_kind) === ("matchsingleval"))));
    }
    void liteFn$frontend$atValueTail;
    function liteFn$frontend$insideLoop(lite_blocks: string[]): boolean {
        void lite_blocks;
        for (const lite_kind of [...(lite_blocks)]) {
            void lite_kind;
            if (((lite_kind) === ("loop"))) {
                return true;
            }
        }
        return false;
    }
    void liteFn$frontend$insideLoop;
    function liteFn$frontend$parseExpressionItem(lite_target: string, lite_source: string, lite_position: bigint, lite_prefix: string, lite_locals: { name: string; runtime: string; kind: string; mutable: boolean; writable: boolean; depth: bigint; constant: boolean; code: string; intValue: bigint; textValue: string; initState: string }[], lite_functions: { name: string; runtime: string; result: string; first: bigint; count: bigint }[], lite_params: string[], lite_currentName: string, lite_currentResult: string, lite_valueTail: boolean, lite_ctxs: { id: bigint; tag: string; kind: string; phase: string; iifeDepth: bigint; valKind: string; valVar: string; label: string; iterLabel: string; countVar: string; itemVar: string; itemKind: string; indexVar: string; hasIndex: boolean }[]): { next: bigint; returned: boolean; code: string; valueKind: string } {
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
        void lite_ctxs;
        let lite_isTailClose = false;
        void lite_isTailClose;
        if (lite_valueTail) {
            const lite_end = liteFn$frontend$scanExpressionItemEnd(lite_source, lite_position, lite_prefix);
            void lite_end;
            const lite_nextCheck = liteFn$frontend$skipItemSeparators(lite_source, lite_end, lite_prefix);
            void lite_nextCheck;
            lite_isTailClose = ((((lite_nextCheck) < (liteFn$lib$core$text$length(lite_source)))) && (((liteFn$lib$core$text$at(lite_source, lite_nextCheck)) === ("}"))));
        }
        const lite_expected = (Boolean(lite_isTailClose) ? (Boolean(liteFn$frontend$isListKind(lite_currentResult)) ? (("Tail") + (lite_currentResult)) : lite_currentResult) : "");
        void lite_expected;
        const lite_trimmedStart = liteFn$frontend$skipTrivia(lite_source, lite_position, lite_prefix);
        void lite_trimmedStart;
        const lite_stmtSink = (Boolean(((((lite_trimmedStart) < (liteFn$lib$core$text$length(lite_source)))) && (((liteFn$lib$core$text$at(lite_source, lite_trimmedStart)) === ("{"))))) ? "exprOut" : "");
        void lite_stmtSink;
        const lite_stmtMin = (Boolean((((!(lite_isTailClose))) || (((lite_currentResult) === ("Unit"))))) ? (-2n) : 0n);
        void lite_stmtMin;
        const lite_parsed = liteFn$frontend$parseBinaryCtx(lite_target, lite_source, lite_position, lite_prefix, [...(lite_locals)], [...(lite_functions)], [...(lite_params)], lite_currentName, lite_expected, lite_stmtMin, [...(lite_ctxs)], 0n, false, lite_stmtSink);
        void lite_parsed;
        const lite_ended = liteFn$frontend$consumeStatementEnd(lite_source, (lite_parsed).next, lite_prefix);
        void lite_ended;
        if (((lite_ended) < (0n))) {
            liteFn$frontend$failAt(lite_source, liteFn$frontend$skipTrivia(lite_source, (lite_parsed).next, lite_prefix), lite_prefix, "expected ; after expression statement");
        }
        const lite_next = liteFn$frontend$skipItemSeparators(lite_source, lite_ended, lite_prefix);
        void lite_next;
        const lite_returned = ((((((((lite_currentName) !== (""))) && (lite_valueTail))) && (((lite_next) < (liteFn$lib$core$text$length(lite_source)))))) && (((liteFn$lib$core$text$at(lite_source, lite_next)) === ("}"))));
        void lite_returned;
        if (((lite_returned) && ((!(liteFn$frontend$isCompatibleKind(lite_currentResult, (lite_parsed).kind)))))) {
            liteFn$frontend$failAt(lite_source, lite_position, lite_prefix, (((((((((("cannot return ") + (liteFn$frontend$displayKind((lite_parsed).kind)))) + (" from function "))) + (lite_currentName))) + (" returning "))) + (liteFn$frontend$displayKind(lite_currentResult))));
        }
        return { next: lite_next, returned: lite_returned, code: (Boolean(lite_returned) ? (Boolean((((lite_parsed).kind) === ("Unit"))) ? liteFn$frontend$targetUnitEvaluationCode(lite_target, (lite_parsed).code) : liteFn$frontend$assignValueCode(lite_target, lite_currentResult, (lite_parsed).kind, (lite_parsed).code)) : (lite_parsed).code), valueKind: (lite_parsed).kind };
    }
    void liteFn$frontend$parseExpressionItem;
    function liteFn$frontend$collectFutureValues(lite_target: string, lite_source: string, lite_prefix: string, lite_moduleKey: string): { name: string; runtime: string; kind: string; at: bigint; intValue: bigint; textValue: string }[] {
        void lite_target;
        void lite_source;
        void lite_prefix;
        void lite_moduleKey;
        const lite_values: { name: string; runtime: string; kind: string; at: bigint; intValue: bigint; textValue: string }[] = [...([])];
        void lite_values;
        const lite_size = liteFn$lib$core$text$length(lite_source);
        void lite_size;
        let lite_cursor = 0n;
        void lite_cursor;
        let lite_braceDepth = 0n;
        void lite_braceDepth;
        while (((lite_cursor) < (lite_size))) {
            const lite_ch = liteFn$lib$core$text$at(lite_source, lite_cursor);
            void lite_ch;
            if (((lite_ch) === ("\""))) {
                lite_cursor = liteFn$frontend$skipAliasString(lite_source, lite_cursor);
            } else if (liteFn$lib$core$text$startsWithAt(lite_source, lite_cursor, "/*")) {
                lite_cursor = liteFn$frontend$skipComment(lite_source, lite_cursor, lite_prefix);
            } else if (((lite_ch) === ("{"))) {
                lite_braceDepth = lite$addInt(lite_braceDepth, 1n, 388761);
                lite_cursor = lite$addInt(lite_cursor, 1n, 388794);
            } else if (((lite_ch) === ("}"))) {
                if (((lite_braceDepth) > (0n))) {
                    lite_braceDepth = lite$subtractInt(lite_braceDepth, 1n, 388885);
                }
                lite_cursor = lite$addInt(lite_cursor, 1n, 388920);
            } else if (((((lite_braceDepth) === (0n))) && (liteFn$lib$core$text$isNameStart(lite_ch)))) {
                const lite_nameStart = lite_cursor;
                void lite_nameStart;
                const lite_nameEnd = liteFn$lib$core$text$skipName(lite_source, lite_cursor);
                void lite_nameEnd;
                const lite_afterName = liteFn$frontend$skipTrivia(lite_source, lite_nameEnd, lite_prefix);
                void lite_afterName;
                if (liteFn$lib$core$text$startsWithAt(lite_source, lite_afterName, ":=")) {
                    const lite_valueStart = liteFn$frontend$skipTrivia(lite_source, lite$addInt(lite_afterName, 2n, 389263), lite_prefix);
                    void lite_valueStart;
                    if ((((!(liteFn$lib$core$text$wordAt(lite_source, lite_valueStart, "fn")))) && ((!(liteFn$lib$core$text$wordAt(lite_source, lite_valueStart, "type")))))) {
                        const lite_valueCh = liteFn$lib$core$text$at(lite_source, lite_valueStart);
                        void lite_valueCh;
                        let lite_kind = "";
                        void lite_kind;
                        let lite_intValue = 0n;
                        void lite_intValue;
                        let lite_textValue = "";
                        void lite_textValue;
                        if (((((liteFn$lib$core$text$isDigit(lite_valueCh)) || (((lite_valueCh) === ("+"))))) || (((lite_valueCh) === ("-"))))) {
                            const lite_parsed = liteFn$frontend$parseNumber(lite_target, lite_source, lite_valueStart, lite_prefix, "", 0n);
                            void lite_parsed;
                            lite_kind = (lite_parsed).kind;
                            lite_intValue = (lite_parsed).intValue;
                        } else if (((lite_valueCh) === ("\""))) {
                            const lite_parsed = liteFn$frontend$parseText(lite_target, lite_source, lite_valueStart, lite_prefix);
                            void lite_parsed;
                            lite_kind = (lite_parsed).kind;
                            lite_textValue = (lite_parsed).textValue;
                        } else if (((liteFn$lib$core$text$wordAt(lite_source, lite_valueStart, "true")) || (liteFn$lib$core$text$wordAt(lite_source, lite_valueStart, "false")))) {
                            lite_kind = "Bool";
                            lite_intValue = (Boolean(liteFn$lib$core$text$wordAt(lite_source, lite_valueStart, "true")) ? 1n : 0n);
                        }
                        if (((lite_kind) !== (""))) {
                            const lite_valueName = liteFn$lib$core$text$slice(lite_source, lite_nameStart, lite_nameEnd);
                            void lite_valueName;
                            const lite_futureRuntime = liteFn$frontend$moduleValueRuntime(lite_target, lite_moduleKey, lite_valueName);
                            void lite_futureRuntime;
                            lite_values.push({ name: lite_valueName, runtime: lite_futureRuntime, kind: lite_kind, at: lite_nameStart, intValue: lite_intValue, textValue: lite_textValue });
                        }
                    }
                    lite_cursor = lite_valueStart;
                } else {
                    lite_cursor = lite_nameEnd;
                }
            } else {
                lite_cursor = lite$addInt(lite_cursor, 1n, 390953);
            }
        }
        return [...(lite_values)];
    }
    void liteFn$frontend$collectFutureValues;
    function liteFn$frontend$withoutFutureValues(lite_locals: { name: string; runtime: string; kind: string; mutable: boolean; writable: boolean; depth: bigint; constant: boolean; code: string; intValue: bigint; textValue: string; initState: string }[]): { name: string; runtime: string; kind: string; mutable: boolean; writable: boolean; depth: bigint; constant: boolean; code: string; intValue: bigint; textValue: string; initState: string }[] {
        void lite_locals;
        const lite_kept: { name: string; runtime: string; kind: string; mutable: boolean; writable: boolean; depth: bigint; constant: boolean; code: string; intValue: bigint; textValue: string; initState: string }[] = [...([])];
        void lite_kept;
        for (const lite_entry of [...(lite_locals)]) {
            void lite_entry;
            if ((((lite_entry).depth) >= (0n))) {
                lite_kept.push(lite_entry);
            }
        }
        return [...(lite_kept)];
    }
    void liteFn$frontend$withoutFutureValues;
    function liteFn$frontend$parseImportClause(lite_target: string, lite_source: string, lite_position: bigint, lite_alias: string, lite_prefix: string): { kind: string; name: string; runtime: string; code: string; intValue: bigint; textValue: string } {
        void lite_target;
        void lite_source;
        void lite_position;
        void lite_alias;
        void lite_prefix;
        if (((lite_alias) === (""))) {
            liteFn$frontend$failAt(lite_source, lite_position, lite_prefix, "import requires a module alias");
        }
        const lite_pathStart = liteFn$frontend$skipTrivia(lite_source, lite$addInt(lite_position, 6n, 391600), lite_prefix);
        void lite_pathStart;
        if (((((lite_pathStart) >= (liteFn$lib$core$text$length(lite_source)))) || (((liteFn$lib$core$text$at(lite_source, lite_pathStart)) !== ("\""))))) {
            liteFn$frontend$failAt(lite_source, lite_pathStart, lite_prefix, "import requires a quoted source path");
        }
        const lite_path = liteFn$frontend$parseText(lite_target, lite_source, lite_pathStart, lite_prefix);
        void lite_path;
        const lite_pathLength = liteFn$lib$core$text$length((lite_path).textValue);
        void lite_pathLength;
        let lite_invalidPath = ((lite_pathLength) === (0n));
        void lite_invalidPath;
        let lite_pathIndex = 0n;
        void lite_pathIndex;
        while (((lite_pathIndex) < (lite_pathLength))) {
            if (((liteFn$lib$core$text$at((lite_path).textValue, lite_pathIndex)) === ("\\"))) {
                lite_invalidPath = true;
            }
            lite_pathIndex = lite$addInt(lite_pathIndex, 1n, 392107);
        }
        if (lite_invalidPath) {
            liteFn$frontend$failAt(lite_source, lite_pathStart, lite_prefix, "import path must be nonempty and use \"/\" separators");
        }
        const lite_statementNext = liteFn$frontend$consumeStatementEnd(lite_source, (lite_path).next, lite_prefix);
        void lite_statementNext;
        if (((lite_statementNext) < (0n))) {
            liteFn$frontend$failAt(lite_source, liteFn$frontend$skipTrivia(lite_source, (lite_path).next, lite_prefix), lite_prefix, "expected ; after import");
        }
        return { kind: "Import", name: lite_alias, runtime: "", code: "", intValue: lite_statementNext, textValue: (lite_path).textValue };
    }
    void liteFn$frontend$parseImportClause;
    function liteFn$frontend$collectImportClauses(lite_target: string, lite_source: string, lite_prefix: string): { kind: string; name: string; runtime: string; code: string; intValue: bigint; textValue: string }[] {
        void lite_target;
        void lite_source;
        void lite_prefix;
        const lite_imports: { kind: string; name: string; runtime: string; code: string; intValue: bigint; textValue: string }[] = [...([])];
        void lite_imports;
        const lite_size = liteFn$lib$core$text$length(lite_source);
        void lite_size;
        let lite_position = 0n;
        void lite_position;
        let lite_depth = 0n;
        void lite_depth;
        while (((lite_position) < (lite_size))) {
            lite_position = liteFn$frontend$skipTrivia(lite_source, lite_position, lite_prefix);
            if (((lite_position) >= (lite_size))) {
                break;
            }
            const lite_ch = liteFn$lib$core$text$at(lite_source, lite_position);
            void lite_ch;
            if (((lite_ch) === ("\""))) {
                lite_position = liteFn$frontend$skipAliasString(lite_source, lite_position);
            } else if (((lite_ch) === ("{"))) {
                lite_depth = lite$addInt(lite_depth, 1n, 393189);
                lite_position = lite$addInt(lite_position, 1n, 393226);
            } else if (((lite_ch) === ("}"))) {
                if (((lite_depth) > (0n))) {
                    lite_depth = lite$subtractInt(lite_depth, 1n, 393302);
                }
                lite_position = lite$addInt(lite_position, 1n, 393341);
            } else if (((((lite_depth) === (0n))) && (liteFn$lib$core$text$isNameStart(lite_ch)))) {
                const lite_nameEnd = liteFn$lib$core$text$skipName(lite_source, lite_position);
                void lite_nameEnd;
                const lite_name = liteFn$lib$core$text$slice(lite_source, lite_position, lite_nameEnd);
                void lite_name;
                if (((lite_name) === ("import"))) {
                    const lite_imported = liteFn$frontend$parseImportClause(lite_target, lite_source, lite_position, "", lite_prefix);
                    void lite_imported;
                    lite_imports.push(lite_imported);
                    lite_position = (lite_imported).intValue;
                } else {
                    const lite_afterName = liteFn$frontend$skipTrivia(lite_source, lite_nameEnd, lite_prefix);
                    void lite_afterName;
                    const lite_afterDeclare = liteFn$frontend$skipTrivia(lite_source, lite$addInt(lite_afterName, 2n, 393896), lite_prefix);
                    void lite_afterDeclare;
                    if (((liteFn$lib$core$text$startsWithAt(lite_source, lite_afterName, ":=")) && (liteFn$lib$core$text$wordAt(lite_source, lite_afterDeclare, "import")))) {
                        const lite_imported = liteFn$frontend$parseImportClause(lite_target, lite_source, lite_afterDeclare, lite_name, lite_prefix);
                        void lite_imported;
                        lite_imports.push(lite_imported);
                        lite_position = (lite_imported).intValue;
                    } else {
                        lite_position = lite_nameEnd;
                    }
                }
            } else {
                lite_position = lite$addInt(lite_position, 1n, 394380);
            }
        }
        return [...(lite_imports)];
    }
    void liteFn$frontend$collectImportClauses;
    function liteFn$frontend$collectPublishedFunctions(lite_source: string, lite_prefix: string): string[] {
        void lite_source;
        void lite_prefix;
        const lite_names: string[] = [...([])];
        void lite_names;
        const lite_size = liteFn$lib$core$text$length(lite_source);
        void lite_size;
        let lite_position = 0n;
        void lite_position;
        let lite_depth = 0n;
        void lite_depth;
        while (((lite_position) < (lite_size))) {
            lite_position = liteFn$frontend$skipTrivia(lite_source, lite_position, lite_prefix);
            if (((lite_position) >= (lite_size))) {
                break;
            }
            const lite_ch = liteFn$lib$core$text$at(lite_source, lite_position);
            void lite_ch;
            if (((lite_ch) === ("\""))) {
                lite_position = liteFn$frontend$skipAliasString(lite_source, lite_position);
            } else if (((lite_ch) === ("{"))) {
                lite_depth = lite$addInt(lite_depth, 1n, 394970);
                lite_position = lite$addInt(lite_position, 1n, 395007);
            } else if (((lite_ch) === ("}"))) {
                if (((lite_depth) > (0n))) {
                    lite_depth = lite$subtractInt(lite_depth, 1n, 395083);
                }
                lite_position = lite$addInt(lite_position, 1n, 395122);
            } else if (((((lite_depth) === (0n))) && (liteFn$lib$core$text$wordAt(lite_source, lite_position, "pub")))) {
                const lite_declarationStart = liteFn$frontend$skipTrivia(lite_source, lite$addInt(lite_position, 3n, 395262), lite_prefix);
                void lite_declarationStart;
                if (((((lite_declarationStart) < (lite_size))) && (liteFn$lib$core$text$isNameStart(liteFn$lib$core$text$at(lite_source, lite_declarationStart))))) {
                    const lite_nameEnd = liteFn$lib$core$text$skipName(lite_source, lite_declarationStart);
                    void lite_nameEnd;
                    const lite_operator = liteFn$frontend$skipTrivia(lite_source, lite_nameEnd, lite_prefix);
                    void lite_operator;
                    const lite_value = liteFn$frontend$skipTrivia(lite_source, lite$addInt(lite_operator, 2n, 395568), lite_prefix);
                    void lite_value;
                    if (((liteFn$lib$core$text$startsWithAt(lite_source, lite_operator, ":=")) && (liteFn$lib$core$text$wordAt(lite_source, lite_value, "fn")))) {
                        lite_names.push(liteFn$lib$core$text$slice(lite_source, lite_declarationStart, lite_nameEnd));
                    }
                    lite_position = lite_nameEnd;
                } else {
                    lite_position = lite$addInt(lite_position, 3n, 395898);
                }
            } else {
                lite_position = lite$addInt(lite_position, 1n, 395966);
            }
        }
        return [...(lite_names)];
    }
    void liteFn$frontend$collectPublishedFunctions;
    function liteFn$frontend$collectPublishedValues(lite_source: string, lite_prefix: string): string[] {
        void lite_source;
        void lite_prefix;
        const lite_names: string[] = [...([])];
        void lite_names;
        const lite_size = liteFn$lib$core$text$length(lite_source);
        void lite_size;
        let lite_position = 0n;
        void lite_position;
        let lite_depth = 0n;
        void lite_depth;
        while (((lite_position) < (lite_size))) {
            lite_position = liteFn$frontend$skipTrivia(lite_source, lite_position, lite_prefix);
            if (((lite_position) >= (lite_size))) {
                break;
            }
            const lite_ch = liteFn$lib$core$text$at(lite_source, lite_position);
            void lite_ch;
            if (((lite_ch) === ("\""))) {
                lite_position = liteFn$frontend$skipAliasString(lite_source, lite_position);
            } else if (((lite_ch) === ("{"))) {
                lite_depth = lite$addInt(lite_depth, 1n, 396596);
                lite_position = lite$addInt(lite_position, 1n, 396633);
            } else if (((lite_ch) === ("}"))) {
                if (((lite_depth) > (0n))) {
                    lite_depth = lite$subtractInt(lite_depth, 1n, 396709);
                }
                lite_position = lite$addInt(lite_position, 1n, 396748);
            } else if (((((lite_depth) === (0n))) && (liteFn$lib$core$text$wordAt(lite_source, lite_position, "pub")))) {
                const lite_declarationStart = liteFn$frontend$skipTrivia(lite_source, lite$addInt(lite_position, 3n, 396888), lite_prefix);
                void lite_declarationStart;
                if (((((lite_declarationStart) < (lite_size))) && (liteFn$lib$core$text$isNameStart(liteFn$lib$core$text$at(lite_source, lite_declarationStart))))) {
                    const lite_nameEnd = liteFn$lib$core$text$skipName(lite_source, lite_declarationStart);
                    void lite_nameEnd;
                    const lite_operator = liteFn$frontend$skipTrivia(lite_source, lite_nameEnd, lite_prefix);
                    void lite_operator;
                    const lite_value = liteFn$frontend$skipTrivia(lite_source, lite$addInt(lite_operator, 2n, 397194), lite_prefix);
                    void lite_value;
                    if (((((liteFn$lib$core$text$startsWithAt(lite_source, lite_operator, ":=")) && ((!(liteFn$lib$core$text$wordAt(lite_source, lite_value, "fn")))))) && ((!(liteFn$lib$core$text$wordAt(lite_source, lite_value, "type")))))) {
                        lite_names.push(liteFn$lib$core$text$slice(lite_source, lite_declarationStart, lite_nameEnd));
                    }
                    lite_position = lite_nameEnd;
                } else {
                    lite_position = lite$addInt(lite_position, 3n, 397594);
                }
            } else {
                lite_position = lite$addInt(lite_position, 1n, 397662);
            }
        }
        return [...(lite_names)];
    }
    void liteFn$frontend$collectPublishedValues;
    function liteFn$frontend$collectPublishedTypes(lite_source: string, lite_prefix: string): string[] {
        void lite_source;
        void lite_prefix;
        const lite_names: string[] = [...([])];
        void lite_names;
        const lite_size = liteFn$lib$core$text$length(lite_source);
        void lite_size;
        let lite_position = 0n;
        void lite_position;
        let lite_depth = 0n;
        void lite_depth;
        while (((lite_position) < (lite_size))) {
            lite_position = liteFn$frontend$skipTrivia(lite_source, lite_position, lite_prefix);
            if (((lite_position) >= (lite_size))) {
                break;
            }
            const lite_ch = liteFn$lib$core$text$at(lite_source, lite_position);
            void lite_ch;
            if (((lite_ch) === ("\""))) {
                lite_position = liteFn$frontend$skipAliasString(lite_source, lite_position);
            } else if (((lite_ch) === ("{"))) {
                lite_depth = lite$addInt(lite_depth, 1n, 398266);
                lite_position = lite$addInt(lite_position, 1n, 398303);
            } else if (((lite_ch) === ("}"))) {
                if (((lite_depth) > (0n))) {
                    lite_depth = lite$subtractInt(lite_depth, 1n, 398379);
                }
                lite_position = lite$addInt(lite_position, 1n, 398418);
            } else if (((((lite_depth) === (0n))) && (liteFn$lib$core$text$wordAt(lite_source, lite_position, "pub")))) {
                const lite_declarationStart = liteFn$frontend$skipTrivia(lite_source, lite$addInt(lite_position, 3n, 398558), lite_prefix);
                void lite_declarationStart;
                if (((((lite_declarationStart) < (lite_size))) && (liteFn$lib$core$text$isNameStart(liteFn$lib$core$text$at(lite_source, lite_declarationStart))))) {
                    const lite_nameEnd = liteFn$lib$core$text$skipName(lite_source, lite_declarationStart);
                    void lite_nameEnd;
                    const lite_operator = liteFn$frontend$skipTrivia(lite_source, lite_nameEnd, lite_prefix);
                    void lite_operator;
                    const lite_typeStart = liteFn$frontend$skipTrivia(lite_source, lite$addInt(lite_operator, 2n, 398868), lite_prefix);
                    void lite_typeStart;
                    if (((liteFn$lib$core$text$startsWithAt(lite_source, lite_operator, ":=")) && (liteFn$lib$core$text$wordAt(lite_source, lite_typeStart, "type")))) {
                        lite_names.push(liteFn$lib$core$text$slice(lite_source, lite_declarationStart, lite_nameEnd));
                    }
                    lite_position = lite_nameEnd;
                } else {
                    lite_position = lite$addInt(lite_position, 3n, 399204);
                }
            } else {
                lite_position = lite$addInt(lite_position, 1n, 399272);
            }
        }
        return [...(lite_names)];
    }
    void liteFn$frontend$collectPublishedTypes;
    function liteFn$frontend$parseOutputStatement(lite_target: string, lite_source: string, lite_openPosition: bigint, lite_outputName: string, lite_prefix: string, lite_locals: { name: string; runtime: string; kind: string; mutable: boolean; writable: boolean; depth: bigint; constant: boolean; code: string; intValue: bigint; textValue: string; initState: string }[], lite_functions: { name: string; runtime: string; result: string; first: bigint; count: bigint }[], lite_params: string[], lite_currentName: string, lite_live: boolean, lite_ctxs: { id: bigint; tag: string; kind: string; phase: string; iifeDepth: bigint; valKind: string; valVar: string; label: string; iterLabel: string; countVar: string; itemVar: string; itemKind: string; indexVar: string; hasIndex: boolean }[]): { kind: string; name: string; runtime: string; code: string; intValue: bigint; textValue: string }[] {
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
        void lite_ctxs;
        let lite_position = lite_openPosition;
        void lite_position;
        if (((((lite_position) >= (liteFn$lib$core$text$length(lite_source)))) || (((liteFn$lib$core$text$at(lite_source, lite_position)) !== ("("))))) {
            liteFn$frontend$failAt(lite_source, lite_position, lite_prefix, (("expected ( after ") + (lite_outputName)));
        }
        lite_position = liteFn$frontend$skipTrivia(lite_source, lite$addInt(lite_position, 1n, 399923), lite_prefix);
        const lite_result: { kind: string; name: string; runtime: string; code: string; intValue: bigint; textValue: string }[] = [...([])];
        void lite_result;
        while (((((lite_position) < (liteFn$lib$core$text$length(lite_source)))) && (((liteFn$lib$core$text$at(lite_source, lite_position)) !== (")"))))) {
            const lite_argument = liteFn$frontend$parseExpressionCtx(lite_target, lite_source, lite_position, lite_prefix, [...(lite_locals)], [...(lite_functions)], [...(lite_params)], lite_currentName, [...(lite_ctxs)]);
            void lite_argument;
            lite_result.push({ kind: (lite_argument).kind, name: "", runtime: "", code: (lite_argument).code, intValue: (lite_argument).intValue, textValue: (lite_argument).textValue });
            lite_position = liteFn$frontend$skipTrivia(lite_source, (lite_argument).next, lite_prefix);
            if (((((lite_position) < (liteFn$lib$core$text$length(lite_source)))) && (((liteFn$lib$core$text$at(lite_source, lite_position)) === (","))))) {
                lite_position = liteFn$frontend$skipTrivia(lite_source, lite$addInt(lite_position, 1n, 400559), lite_prefix);
            } else {
                break;
            }
        }
        lite_position = liteFn$frontend$expectSymbol(lite_source, lite_position, ")", lite_prefix);
        const lite_statementNext = liteFn$frontend$consumeStatementEnd(lite_source, lite_position, lite_prefix);
        void lite_statementNext;
        if (((lite_statementNext) < (0n))) {
            liteFn$frontend$failAt(lite_source, liteFn$frontend$skipTrivia(lite_source, lite_position, lite_prefix), lite_prefix, (("expected ; after ") + (lite_outputName)));
        }
        lite_result.push({ kind: (Boolean(((lite_outputName) === ("outputLine"))) ? "End" : "EndOutput"), name: "", runtime: "", code: "", intValue: lite_statementNext, textValue: "" });
        return [...(lite_result)];
    }
    void liteFn$frontend$parseOutputStatement;
    function liteFn$frontend$parseProgramWithModule(lite_target: string, lite_source: string, lite_prefix: string, lite_exports: { kind: string; name: string; runtime: string; code: string; intValue: bigint; textValue: string }[], lite_moduleKey: string, lite_moduleIdentity: string): { kind: string; name: string; runtime: string; code: string; intValue: bigint; textValue: string }[] {
        void lite_target;
        void lite_source;
        void lite_prefix;
        void lite_exports;
        void lite_moduleKey;
        void lite_moduleIdentity;
        const lite_size = liteFn$lib$core$text$length(lite_source);
        void lite_size;
        let lite_position = liteFn$frontend$skipTrivia(lite_source, 0n, lite_prefix);
        void lite_position;
        let lite_items: { kind: string; name: string; runtime: string; code: string; intValue: bigint; textValue: string }[] = [...([...([])])];
        void lite_items;
        if (((lite_position) === (lite_size))) {
            return [...(lite_items)];
        }
        const lite_aliases: { name: string; target: string; at: bigint; end: bigint }[] = [...([])];
        void lite_aliases;
        for (const lite_exported of [...(lite_exports)]) {
            void lite_exported;
            if ((((lite_exported).kind) === ("PublicType"))) {
                lite_aliases.push({ name: (lite_exported).name, target: (lite_exported).code, at: (-1n), end: 0n });
            }
        }
        for (const lite_alias of [...(liteFn$frontend$collectAliases(lite_source, lite_prefix))]) {
            void lite_alias;
            lite_aliases.push(lite_alias);
        }
        const lite_publishedFunctions: string[] = [...(liteFn$frontend$collectPublishedFunctions(lite_source, lite_prefix))];
        void lite_publishedFunctions;
        const lite_publishedValues: string[] = [...(liteFn$frontend$collectPublishedValues(lite_source, lite_prefix))];
        void lite_publishedValues;
        const lite_publishedTypes: string[] = [...(liteFn$frontend$collectPublishedTypes(lite_source, lite_prefix))];
        void lite_publishedTypes;
        const lite_futureValues: { name: string; runtime: string; kind: string; at: bigint; intValue: bigint; textValue: string }[] = [...(liteFn$frontend$collectFutureValues(lite_target, lite_source, lite_prefix, lite_moduleKey))];
        void lite_futureValues;
        let lite_locals: { name: string; runtime: string; kind: string; mutable: boolean; writable: boolean; depth: bigint; constant: boolean; code: string; intValue: bigint; textValue: string; initState: string }[] = [...([...([])])];
        void lite_locals;
        const lite_blocks: string[] = [...([])];
        void lite_blocks;
        const lite_functions: { name: string; runtime: string; result: string; first: bigint; count: bigint }[] = [...([])];
        void lite_functions;
        const lite_functionParams: string[] = [...([])];
        void lite_functionParams;
        const lite_declaredImportAliases: string[] = [...([])];
        void lite_declaredImportAliases;
        let lite_parameterTotal = 0n;
        void lite_parameterTotal;
        for (const lite_exported of [...(lite_exports)]) {
            void lite_exported;
            if ((((lite_exported).kind) === ("ModuleAlias"))) {
                if (((((liteFn$frontend$findFunction([...(lite_functions)], (lite_exported).name)) >= (0n))) || (((liteFn$frontend$localIndex([...(lite_locals)], (lite_exported).name)) >= (0n))))) {
                    liteFn$lib$core$diag$fail(lite_prefix, (("duplicate imported module name ") + ((lite_exported).name)));
                }
                lite_locals.push({ name: (lite_exported).name, runtime: "", kind: "Module", mutable: false, writable: false, depth: 0n, constant: false, code: "", intValue: (lite_exported).intValue, textValue: (lite_exported).name, initState: "init" });
            } else if ((((lite_exported).kind) === ("PublicFunction"))) {
                if (((((liteFn$frontend$findFunction([...(lite_functions)], (lite_exported).name)) >= (0n))) || (((liteFn$frontend$localIndex([...(lite_locals)], (lite_exported).name)) >= (0n))))) {
                    liteFn$lib$core$diag$fail(lite_prefix, (("duplicate imported public name ") + ((lite_exported).name)));
                }
                const lite_first = lite_parameterTotal;
                void lite_first;
                let lite_entryStart = 0n;
                void lite_entryStart;
                let lite_entryIndex = 0n;
                void lite_entryIndex;
                while (((lite_entryIndex) < ((lite_exported).intValue))) {
                    const lite_separator = liteFn$lib$core$text$indexOfText((lite_exported).textValue, "|", lite_entryStart);
                    void lite_separator;
                    let lite_entryEnd = liteFn$lib$core$text$length((lite_exported).textValue);
                    void lite_entryEnd;
                    if (((lite_separator) >= (0n))) {
                        lite_entryEnd = lite_separator;
                    }
                    lite_functionParams.push(liteFn$lib$core$text$slice((lite_exported).textValue, lite_entryStart, lite_entryEnd));
                    lite_parameterTotal = lite$addInt(lite_parameterTotal, 1n, 403743);
                    lite_entryStart = lite$addInt(lite_entryEnd, 1n, 403786);
                    lite_entryIndex = lite$addInt(lite_entryIndex, 1n, 403831);
                }
                lite_functions.push({ name: (lite_exported).name, runtime: (lite_exported).runtime, result: (lite_exported).code, first: lite_first, count: (lite_exported).intValue });
            } else if ((((lite_exported).kind) === ("PublicValue"))) {
                if (((((liteFn$frontend$findFunction([...(lite_functions)], (lite_exported).name)) >= (0n))) || (((liteFn$frontend$localIndex([...(lite_locals)], (lite_exported).name)) >= (0n))))) {
                    liteFn$lib$core$diag$fail(lite_prefix, (("duplicate imported public name ") + ((lite_exported).name)));
                }
                lite_locals.push({ name: (lite_exported).name, runtime: (lite_exported).runtime, kind: (lite_exported).code, mutable: false, writable: false, depth: 0n, constant: false, code: (lite_exported).runtime, intValue: 0n, textValue: "", initState: "init" });
            } else if ((((lite_exported).kind) === ("PublicType"))) {
                if (((liteFn$frontend$findAlias([...(lite_aliases)], (lite_exported).name)) < (0n))) {
                    liteFn$lib$core$diag$fail(lite_prefix, (("unknown imported public type ") + ((lite_exported).name)));
                }
            }
        }
        let lite_blockCount = 0n;
        void lite_blockCount;
        let lite_depth = 0n;
        void lite_depth;
        let lite_currentName = "";
        void lite_currentName;
        let lite_currentResult = "";
        void lite_currentResult;
        let lite_currentReturned = false;
        void lite_currentReturned;
        let lite_currentStopped = false;
        void lite_currentStopped;
        let lite_branchesReturned = true;
        void lite_branchesReturned;
        let lite_branchesStopped = true;
        void lite_branchesStopped;
        let lite_hasElse = false;
        void lite_hasElse;
        let lite_loopForever = false;
        void lite_loopForever;
        let lite_currentLive = true;
        void lite_currentLive;
        let lite_liveBranchCount = 0n;
        void lite_liveBranchCount;
        const lite_savedStates: { returned: boolean; stopped: boolean; branchesReturned: boolean; branchesStopped: boolean; hasElse: boolean; loopForever: boolean; live: boolean; preLocalsLen: bigint; liveBranchCount: bigint }[] = [...([])];
        void lite_savedStates;
        let lite_branchUpdates: { depth: bigint; runtime: string; initState: string }[] = [...([...([])])];
        void lite_branchUpdates;
        let lite_stmtCtxs: { id: bigint; tag: string; kind: string; phase: string; iifeDepth: bigint; valKind: string; valVar: string; label: string; iterLabel: string; countVar: string; itemVar: string; itemKind: string; indexVar: string; hasIndex: boolean }[] = [...([...([])])];
        void lite_stmtCtxs;
        let lite_nextStmtCtxId = 1n;
        void lite_nextStmtCtxId;
        let lite_fnTryIndex = (-1n);
        void lite_fnTryIndex;
        const lite_loopIds: bigint[] = [...([])];
        void lite_loopIds;
        const lite_loopTryIndices: bigint[] = [...([])];
        void lite_loopTryIndices;
        while (((lite_position) < (lite_size))) {
            const lite_ch = liteFn$lib$core$text$at(lite_source, lite_position);
            void lite_ch;
            if (((lite_ch) === (";"))) {
                lite_position = liteFn$frontend$skipItemSeparators(lite_source, lite_position, lite_prefix);
                continue;
            }
            if (((lite_ch) === ("}"))) {
                if (((lite_blockCount) === (0n))) {
                    liteFn$frontend$failAt(lite_source, lite_position, lite_prefix, "unexpected }");
                }
                const lite_blockKind = lite$listAt((lite_blocks), lite$subtractInt(lite_blockCount, 1n, 405789), 405778);
                void lite_blockKind;
                if ((((((((((((((lite_blockKind) === ("ifvalue"))) || (((lite_blockKind) === ("matchvalue"))))) || (((lite_blockKind) === ("matchelseval"))))) || (((lite_blockKind) === ("matchsingleval")))))) && (((lite_currentResult) !== ("Unit"))))) && ((!(lite_currentReturned))))) {
                    liteFn$frontend$failAt(lite_source, lite_position, lite_prefix, (((((("branch of function ") + (lite_currentName))) + (" must return "))) + (liteFn$frontend$displayKind(lite_currentResult))));
                }
                const lite_after = liteFn$frontend$skipTrivia(lite_source, lite$addInt(lite_position, 1n, 406196), lite_prefix);
                void lite_after;
                if ((((((((((lite_blockKind) === ("if"))) || (((lite_blockKind) === ("ifvalue")))))) && (((lite_after) < (lite_size))))) && (liteFn$lib$core$text$wordAt(lite_source, lite_after, "else")))) {
                    lite_locals = [...(liteFn$frontend$visibleLocals([...(lite_locals)], lite_depth))];
                    let lite_stateCount = 0n;
                    void lite_stateCount;
                    for (const lite$item of [...(lite_savedStates)]) {
                        void lite$item;
                        lite_stateCount = lite$addInt(lite_stateCount, 1n, 406470);
                    }
                    const lite_branchPreLen = (lite$listAt((lite_savedStates), lite$subtractInt(lite_stateCount, 1n, 406533), 406522)).preLocalsLen;
                    void lite_branchPreLen;
                    if (((lite_currentLive) && ((!(lite_currentStopped))))) {
                        const lite_nextBranchUpdates: { depth: bigint; runtime: string; initState: string }[] = [...(liteFn$frontend$recordBranchUpdates([...(lite_locals)], lite_branchPreLen, lite$subtractInt(lite_depth, 1n, 406697), lite_blockCount, [...(lite_branchUpdates)]))];
                        void lite_nextBranchUpdates;
                        lite_branchUpdates = [...([])];
                        for (const lite_u of [...(lite_nextBranchUpdates)]) {
                            void lite_u;
                            lite_branchUpdates.push(lite_u);
                        }
                        lite_liveBranchCount = lite$addInt(lite_liveBranchCount, 1n, 406916);
                    }
                    const lite_nextLocals: { name: string; runtime: string; kind: string; mutable: boolean; writable: boolean; depth: bigint; constant: boolean; code: string; intValue: bigint; textValue: string; initState: string }[] = [...(liteFn$frontend$truncateLocals([...(lite_locals)], lite_branchPreLen))];
                    void lite_nextLocals;
                    lite_locals = [...([])];
                    for (const lite_l of [...(lite_nextLocals)]) {
                        void lite_l;
                        lite_locals.push(lite_l);
                    }
                    const lite_afterElse = liteFn$frontend$skipTrivia(lite_source, lite$addInt(lite_after, 4n, 407164), lite_prefix);
                    void lite_afterElse;
                    liteFn$frontend$rejectMisplacedTag(lite_source, lite_afterElse, lite_prefix, "block tag cannot appear after else");
                    lite_branchesReturned = ((lite_branchesReturned) && (lite_currentReturned));
                    lite_branchesStopped = ((lite_branchesStopped) && (lite_currentStopped));
                    lite_currentReturned = false;
                    lite_currentStopped = false;
                    lite_hasElse = (!(liteFn$lib$core$text$wordAt(lite_source, lite_afterElse, "if")));
                    const lite_droppedIf = lite$listPopBack(lite_blocks, 407603);
                    void lite_droppedIf;
                    lite_blockCount = lite$subtractInt(lite_blockCount, 1n, 407672);
                    if (liteFn$lib$core$text$wordAt(lite_source, lite_afterElse, "if")) {
                        const lite_conditionStart = liteFn$frontend$skipTrivia(lite_source, lite$addInt(lite_afterElse, 2n, 407805), lite_prefix);
                        void lite_conditionStart;
                        liteFn$frontend$rejectHeaderBlockTag(lite_source, lite_conditionStart, lite_prefix, "else if");
                        const lite_condition = liteFn$frontend$parseExpressionCtx(lite_target, lite_source, lite_conditionStart, lite_prefix, [...(lite_locals)], [...(lite_functions)], [...(lite_functionParams)], lite_currentName, [...(lite_stmtCtxs)]);
                        void lite_condition;
                        if ((((lite_condition).kind) !== ("Bool"))) {
                            liteFn$frontend$failAt(lite_source, lite_conditionStart, lite_prefix, "else if condition must be Bool");
                        }
                        const lite_conditionCode = (Boolean((lite_condition).constant) ? liteFn$frontend$targetBoolLiteralCode(lite_target, (((lite_condition).intValue) !== (0n))) : (lite_condition).code);
                        void lite_conditionCode;
                        const lite_beforeOpen = liteFn$frontend$skipTrivia(lite_source, (lite_condition).next, lite_prefix);
                        void lite_beforeOpen;
                        liteFn$frontend$rejectMisplacedTag(lite_source, lite_beforeOpen, lite_prefix, "block tag cannot appear before { in else if");
                        lite_position = liteFn$frontend$expectSymbol(lite_source, lite_beforeOpen, "{", lite_prefix);
                        if (lite_currentLive) {
                            lite_items.push({ kind: "ElseIf", name: "", runtime: "", code: lite_conditionCode, intValue: 0n, textValue: "" });
                        }
                        lite_blocks.push(lite_blockKind);
                        lite_blockCount = lite$addInt(lite_blockCount, 1n, 409022);
                    } else {
                        if (lite_currentLive) {
                            lite_items.push({ kind: "Else", name: "", runtime: "", code: "", intValue: 0n, textValue: "" });
                        }
                        lite_blocks.push((Boolean(((lite_blockKind) === ("ifvalue"))) ? "ifvalue" : "else"));
                        lite_blockCount = lite$addInt(lite_blockCount, 1n, 409354);
                        lite_position = liteFn$frontend$expectSymbol(lite_source, lite_afterElse, "{", lite_prefix);
                    }
                    lite_position = liteFn$frontend$skipTrivia(lite_source, lite_position, lite_prefix);
                    continue;
                }
                if (((((lite_blockKind) === ("match"))) || (((lite_blockKind) === ("matchvalue"))))) {
                    const lite_nextArmStart = liteFn$frontend$skipItemSeparators(lite_source, lite$addInt(lite_position, 1n, 409694), lite_prefix);
                    void lite_nextArmStart;
                    if (((lite_nextArmStart) >= (lite_size))) {
                        liteFn$frontend$failAt(lite_source, lite$addInt(lite_position, 1n, 409794), lite_prefix, "expected } to close match");
                    }
                    if (((liteFn$lib$core$text$at(lite_source, lite_nextArmStart)) === ("}"))) {
                        liteFn$frontend$failAt(lite_source, lite_nextArmStart, lite_prefix, "subjectless match requires a final _ fallback arm");
                    }
                    lite_locals = [...(liteFn$frontend$visibleLocals([...(lite_locals)], lite_depth))];
                    let lite_stateCount = 0n;
                    void lite_stateCount;
                    for (const lite$item of [...(lite_savedStates)]) {
                        void lite$item;
                        lite_stateCount = lite$addInt(lite_stateCount, 1n, 410183);
                    }
                    const lite_branchPreLen = (lite$listAt((lite_savedStates), lite$subtractInt(lite_stateCount, 1n, 410246), 410235)).preLocalsLen;
                    void lite_branchPreLen;
                    if (((lite_currentLive) && ((!(lite_currentStopped))))) {
                        const lite_nextBranchUpdates: { depth: bigint; runtime: string; initState: string }[] = [...(liteFn$frontend$recordBranchUpdates([...(lite_locals)], lite_branchPreLen, lite$subtractInt(lite_depth, 1n, 410410), lite_blockCount, [...(lite_branchUpdates)]))];
                        void lite_nextBranchUpdates;
                        lite_branchUpdates = [...([])];
                        for (const lite_u of [...(lite_nextBranchUpdates)]) {
                            void lite_u;
                            lite_branchUpdates.push(lite_u);
                        }
                        lite_liveBranchCount = lite$addInt(lite_liveBranchCount, 1n, 410629);
                    }
                    const lite_nextLocals: { name: string; runtime: string; kind: string; mutable: boolean; writable: boolean; depth: bigint; constant: boolean; code: string; intValue: bigint; textValue: string; initState: string }[] = [...(liteFn$frontend$truncateLocals([...(lite_locals)], lite_branchPreLen))];
                    void lite_nextLocals;
                    lite_locals = [...([])];
                    for (const lite_l of [...(lite_nextLocals)]) {
                        void lite_l;
                        lite_locals.push(lite_l);
                    }
                    lite_branchesReturned = ((lite_branchesReturned) && (lite_currentReturned));
                    lite_branchesStopped = ((lite_branchesStopped) && (lite_currentStopped));
                    lite_currentReturned = false;
                    lite_currentStopped = false;
                    const lite_droppedMatch = lite$listPopBack(lite_blocks, 411079);
                    void lite_droppedMatch;
                    lite_blockCount = lite$subtractInt(lite_blockCount, 1n, 411148);
                    const lite_afterUnderscore = liteFn$frontend$skipTrivia(lite_source, lite$addInt(lite_nextArmStart, 1n, 411220), lite_prefix);
                    void lite_afterUnderscore;
                    if (liteFn$lib$core$text$wordAt(lite_source, lite_nextArmStart, "_")) {
                        liteFn$frontend$rejectMisplacedTag(lite_source, lite_afterUnderscore, lite_prefix, "block tag cannot appear after _ in match arm");
                    }
                    const lite_isFallback = ((((liteFn$lib$core$text$wordAt(lite_source, lite_nextArmStart, "_")) && (((lite_afterUnderscore) < (lite_size))))) && (((liteFn$lib$core$text$at(lite_source, lite_afterUnderscore)) === ("{"))));
                    void lite_isFallback;
                    let lite_armOpen = (-1n);
                    void lite_armOpen;
                    if (lite_isFallback) {
                        lite_armOpen = lite_afterUnderscore;
                        lite_hasElse = true;
                        if (lite_currentLive) {
                            lite_items.push({ kind: "Else", name: "", runtime: "", code: "", intValue: 0n, textValue: "" });
                        }
                        lite_blocks.push((Boolean(((lite_blockKind) === ("matchvalue"))) ? "matchelseval" : "matchelse"));
                        lite_blockCount = lite$addInt(lite_blockCount, 1n, 412068);
                    } else {
                        lite_armOpen = liteFn$frontend$scanConditionOpen(lite_source, lite_nextArmStart, lite_prefix);
                        if (((lite_armOpen) < (0n))) {
                            liteFn$frontend$failAt(lite_source, lite_nextArmStart, lite_prefix, "expected { after match arm condition");
                        }
                        if (((lite_armOpen) === (lite_nextArmStart))) {
                            liteFn$frontend$failAt(lite_source, lite_nextArmStart, lite_prefix, "match arm header requires grouping for { ... } expressions");
                        }
                        liteFn$frontend$rejectHeaderBlockTag(lite_source, lite_nextArmStart, lite_prefix, "match arm");
                        const lite_condition = liteFn$frontend$parseExpressionCtx(lite_target, lite_source, lite_nextArmStart, lite_prefix, [...(lite_locals)], [...(lite_functions)], [...(lite_functionParams)], lite_currentName, [...(lite_stmtCtxs)]);
                        void lite_condition;
                        const lite_afterCond = liteFn$frontend$skipTrivia(lite_source, (lite_condition).next, lite_prefix);
                        void lite_afterCond;
                        liteFn$frontend$rejectMisplacedTag(lite_source, lite_afterCond, lite_prefix, "block tag cannot appear before { in match arm");
                        if (((lite_afterCond) > (lite_armOpen))) {
                            liteFn$frontend$failAt(lite_source, lite_armOpen, lite_prefix, "ungrouped { in match arm header starts the arm body; parenthesize block or conditional expressions");
                        }
                        if (((lite_afterCond) !== (lite_armOpen))) {
                            const lite__ = liteFn$frontend$expectSymbol(lite_source, lite_afterCond, "{", lite_prefix);
                            void lite__;
                        }
                        if ((((lite_condition).kind) !== ("Bool"))) {
                            liteFn$frontend$failAt(lite_source, lite_nextArmStart, lite_prefix, "match arm condition must be Bool");
                        }
                        const lite_conditionCode = (Boolean((lite_condition).constant) ? liteFn$frontend$targetBoolLiteralCode(lite_target, (((lite_condition).intValue) !== (0n))) : (lite_condition).code);
                        void lite_conditionCode;
                        if (lite_currentLive) {
                            lite_items.push({ kind: "ElseIf", name: "", runtime: "", code: lite_conditionCode, intValue: 0n, textValue: "" });
                        }
                        lite_blocks.push(lite_blockKind);
                        lite_blockCount = lite$addInt(lite_blockCount, 1n, 414026);
                    }
                    lite_position = liteFn$frontend$skipTrivia(lite_source, lite$addInt(lite_armOpen, 1n, 414103), lite_prefix);
                    continue;
                }
                let lite_closeBracePos = lite_position;
                void lite_closeBracePos;
                if (((((((((lite_blockKind) === ("matchelse"))) || (((lite_blockKind) === ("matchelseval"))))) || (((lite_blockKind) === ("matchsingle"))))) || (((lite_blockKind) === ("matchsingleval"))))) {
                    const lite_afterFallback = liteFn$frontend$skipItemSeparators(lite_source, lite$addInt(lite_position, 1n, 414405), lite_prefix);
                    void lite_afterFallback;
                    if (((lite_afterFallback) >= (lite_size))) {
                        liteFn$frontend$failAt(lite_source, lite$addInt(lite_position, 1n, 414506), lite_prefix, "expected } to close match");
                    }
                    if (((liteFn$lib$core$text$at(lite_source, lite_afterFallback)) !== ("}"))) {
                        liteFn$frontend$failAt(lite_source, lite_afterFallback, lite_prefix, "match fallback _ must be the final arm");
                    }
                    lite_closeBracePos = lite_afterFallback;
                }
                lite_locals = [...(liteFn$frontend$visibleLocals([...(lite_locals)], lite_depth))];
                lite_depth = lite$subtractInt(lite_depth, 1n, 414887);
                if (((lite_blockKind) === ("function"))) {
                    lite_locals = [...(liteFn$frontend$withoutFutureValues([...(lite_locals)]))];
                    if (((((lite_currentResult) !== ("Unit"))) && ((!(lite_currentReturned))))) {
                        liteFn$frontend$failAt(lite_source, lite_position, lite_prefix, (((((("function ") + (lite_currentName))) + (" must return "))) + (lite_currentResult)));
                    }
                    const lite_droppedFnCtx = lite$listPopBack(lite_stmtCtxs, 415222);
                    void lite_droppedFnCtx;
                    if (((lite_fnTryIndex) >= (0n))) {
                        if (liteFn$frontend$itemsUseTransferCall([...(lite_items)], lite$addInt(lite_fnTryIndex, 1n, 415352), "lite$throwTransfer(0,")) {
                            if (lite_currentLive) {
                                lite_items.push({ kind: "TransferCatch", name: "", runtime: "", code: lite_currentResult, intValue: 0n, textValue: "" });
                            }
                        } else {
                            const lite_noopItems: { kind: string; name: string; runtime: string; code: string; intValue: bigint; textValue: string }[] = [...(liteFn$frontend$setItemAt([...(lite_items)], lite_fnTryIndex, { kind: "Noop", name: "", runtime: "", code: "", intValue: 0n, textValue: "" }))];
                            void lite_noopItems;
                            lite_items = [...([])];
                            for (const lite_noopItem of [...(lite_noopItems)]) {
                                void lite_noopItem;
                                lite_items.push(lite_noopItem);
                            }
                        }
                        lite_fnTryIndex = (-1n);
                    }
                    const lite_functionRuntime = liteFn$frontend$moduleFunctionRuntime(lite_target, lite_moduleKey, lite_currentName);
                    void lite_functionRuntime;
                    if (lite_currentLive) {
                        lite_items.push({ kind: "FunctionEnd", name: "", runtime: lite_functionRuntime, code: "", intValue: 0n, textValue: "" });
                    }
                    lite_currentName = "";
                    lite_currentResult = "";
                    lite_currentReturned = false;
                } else if (((lite_blockKind) === ("loop"))) {
                    const lite_loopId = lite$listPopBack(lite_loopIds, 416455);
                    void lite_loopId;
                    const lite_loopTryIdx = lite$listPopBack(lite_loopTryIndices, 416515);
                    void lite_loopTryIdx;
                    const lite_droppedLoopCtx = lite$listPopBack(lite_stmtCtxs, 416586);
                    void lite_droppedLoopCtx;
                    if (((lite_loopTryIdx) >= (0n))) {
                        const lite_hasLoopBreak = liteFn$frontend$itemsUseTransferCall([...(lite_items)], lite$addInt(lite_loopTryIdx, 1n, 416729), (((("lite$throwTransfer(") + (liteFn$lib$core$int$intText(lite_loopId)))) + (",")));
                        void lite_hasLoopBreak;
                        const lite_hasLoopCont = liteFn$frontend$itemsUseTransferCall([...(lite_items)], lite$addInt(lite_loopTryIdx, 1n, 416864), (((("lite$throwTransfer(") + (liteFn$lib$core$int$intText(lite$subtractInt(0n, lite_loopId, 416911))))) + (",")));
                        void lite_hasLoopCont;
                        if (((lite_hasLoopBreak) || (lite_hasLoopCont))) {
                            if (lite_currentLive) {
                                lite_items.push({ kind: "LoopTransferCatch", name: "", runtime: "", code: liteFn$lib$core$int$intText(lite_loopId), intValue: lite_loopId, textValue: liteFn$lib$core$int$intText(lite$subtractInt(0n, lite_loopId, 417246)) });
                            }
                        } else {
                            const lite_noopItems: { kind: string; name: string; runtime: string; code: string; intValue: bigint; textValue: string }[] = [...(liteFn$frontend$setItemAt([...(lite_items)], lite_loopTryIdx, { kind: "Noop", name: "", runtime: "", code: "", intValue: 0n, textValue: "" }))];
                            void lite_noopItems;
                            lite_items = [...([])];
                            for (const lite_noopItem of [...(lite_noopItems)]) {
                                void lite_noopItem;
                                lite_items.push(lite_noopItem);
                            }
                        }
                        if (lite_hasLoopBreak) {
                            lite_currentReturned = false;
                            lite_currentStopped = false;
                        }
                    }
                    if (lite_currentLive) {
                        lite_items.push({ kind: "EndLoop", name: "", runtime: "", code: "", intValue: 0n, textValue: "" });
                    }
                } else if (((lite_blockKind) === ("scope"))) {
                    if (lite_currentLive) {
                        lite_items.push({ kind: "EndScope", name: "", runtime: "", code: "", intValue: 0n, textValue: "" });
                    }
                } else if (((((lite_blockKind) === ("matchsingle"))) || (((lite_blockKind) === ("matchsingleval"))))) {
                    const lite_droppedCondCtx = lite$listPopBack(lite_stmtCtxs, 418255);
                    void lite_droppedCondCtx;
                    if (lite_currentLive) {
                        lite_items.push({ kind: "EndScope", name: "", runtime: "", code: "", intValue: 0n, textValue: "" });
                    }
                } else {
                    const lite_droppedCondCtx = lite$listPopBack(lite_stmtCtxs, 418492);
                    void lite_droppedCondCtx;
                    if (lite_currentLive) {
                        lite_items.push({ kind: "EndIf", name: "", runtime: "", code: "", intValue: 0n, textValue: "" });
                    }
                }
                const lite_completedReturn = liteFn$frontend$blockCompletion(lite_blockKind, lite_currentReturned, lite_branchesReturned, lite_hasElse, lite_loopForever);
                void lite_completedReturn;
                const lite_completedStop = liteFn$frontend$blockCompletion(lite_blockKind, (Boolean(((lite_blockKind) === ("loop"))) ? lite_currentReturned : lite_currentStopped), lite_branchesStopped, lite_hasElse, lite_loopForever);
                void lite_completedStop;
                if (((((((lite_blockKind) === ("loop"))) && (lite_completedReturn))) && (lite_currentLive))) {
                    lite_items.push({ kind: "Unreachable", name: "", runtime: "", code: "", intValue: 0n, textValue: "" });
                }
                const lite_parent = lite$listPopBack(lite_savedStates, 419225);
                void lite_parent;
                if (((((((((((lite_blockKind) === ("if"))) || (((lite_blockKind) === ("ifvalue"))))) || (((lite_blockKind) === ("else"))))) || (((lite_blockKind) === ("matchelse"))))) || (((lite_blockKind) === ("matchelseval"))))) {
                    if (((lite_currentLive) && ((!(lite_currentStopped))))) {
                        const lite_nextBranchUpdates: { depth: bigint; runtime: string; initState: string }[] = [...(liteFn$frontend$recordBranchUpdates([...(lite_locals)], (lite_parent).preLocalsLen, lite_depth, lite_blockCount, [...(lite_branchUpdates)]))];
                        void lite_nextBranchUpdates;
                        lite_branchUpdates = [...([])];
                        for (const lite_u of [...(lite_nextBranchUpdates)]) {
                            void lite_u;
                            lite_branchUpdates.push(lite_u);
                        }
                        lite_liveBranchCount = lite$addInt(lite_liveBranchCount, 1n, 419769);
                    }
                    const lite_truncated: { name: string; runtime: string; kind: string; mutable: boolean; writable: boolean; depth: bigint; constant: boolean; code: string; intValue: bigint; textValue: string; initState: string }[] = [...(liteFn$frontend$truncateLocals([...(lite_locals)], (lite_parent).preLocalsLen))];
                    void lite_truncated;
                    const lite_joinedLocals: { name: string; runtime: string; kind: string; mutable: boolean; writable: boolean; depth: bigint; constant: boolean; code: string; intValue: bigint; textValue: string; initState: string }[] = [...(liteFn$frontend$joinBranchLocals([...(lite_truncated)], (lite_parent).preLocalsLen, lite_blockCount, ((lite_hasElse) || (((lite_blockKind) === ("else")))), lite_liveBranchCount, [...(lite_branchUpdates)]))];
                    void lite_joinedLocals;
                    const lite_keptUpdates: { depth: bigint; runtime: string; initState: string }[] = [...(liteFn$frontend$popBranchUpdates([...(lite_branchUpdates)], lite_blockCount))];
                    void lite_keptUpdates;
                    lite_locals = [...([])];
                    for (const lite_l of [...(lite_joinedLocals)]) {
                        void lite_l;
                        lite_locals.push(lite_l);
                    }
                    lite_branchUpdates = [...([])];
                    for (const lite_u of [...(lite_keptUpdates)]) {
                        void lite_u;
                        lite_branchUpdates.push(lite_u);
                    }
                } else if (((lite_blockKind) === ("loop"))) {
                    const lite_loopJoined: { name: string; runtime: string; kind: string; mutable: boolean; writable: boolean; depth: bigint; constant: boolean; code: string; intValue: bigint; textValue: string; initState: string }[] = [...(liteFn$frontend$joinLoopUpdates([...(lite_locals)], (lite_parent).preLocalsLen, lite_depth))];
                    void lite_loopJoined;
                    lite_locals = [...([])];
                    for (const lite_l of [...(lite_loopJoined)]) {
                        void lite_l;
                        lite_locals.push(lite_l);
                    }
                }
                lite_liveBranchCount = (lite_parent).liveBranchCount;
                lite_currentReturned = (((lite_parent).returned) || (((((((!((lite_parent).stopped))) && (lite_completedReturn))) && (((lite_blockKind) !== ("function")))))));
                lite_currentStopped = (((lite_parent).stopped) || ((((lite_completedStop) && (((lite_blockKind) !== ("function")))))));
                lite_branchesReturned = (lite_parent).branchesReturned;
                lite_branchesStopped = (lite_parent).branchesStopped;
                lite_hasElse = (lite_parent).hasElse;
                lite_loopForever = (lite_parent).loopForever;
                lite_currentLive = (lite_parent).live;
                const lite_droppedBlock = lite$listPopBack(lite_blocks, 421095);
                void lite_droppedBlock;
                lite_blockCount = lite$subtractInt(lite_blockCount, 1n, 421160);
                lite_position = liteFn$frontend$skipTrivia(lite_source, lite$addInt(lite_closeBracePos, 1n, 421221), lite_prefix);
                if (((((lite_position) < (lite_size))) && (((liteFn$lib$core$text$at(lite_source, lite_position)) === (";"))))) {
                    lite_position = liteFn$frontend$skipTrivia(lite_source, lite$addInt(lite_position, 1n, 421363), lite_prefix);
                }
                continue;
            }
            if (((lite_ch) === ("{"))) {
                const lite_rawBraceEnd = liteFn$frontend$scanBraceEnd(lite_source, lite_position, lite_prefix);
                void lite_rawBraceEnd;
                const lite_afterRawBrace = (Boolean(((lite_rawBraceEnd) >= (0n))) ? liteFn$frontend$skipTrivia(lite_source, lite_rawBraceEnd, lite_prefix) : (-1n));
                void lite_afterRawBrace;
                if (((((lite_afterRawBrace) >= (0n))) && (liteFn$lib$core$text$wordAt(lite_source, lite_afterRawBrace, "then")))) {
                    liteFn$frontend$failAt(lite_source, lite_afterRawBrace, lite_prefix, "then requires an if, match, or loop");
                }
                if (((((lite_afterRawBrace) >= (0n))) && (liteFn$lib$core$text$wordAt(lite_source, lite_afterRawBrace, "finally")))) {
                    const lite_expression = liteFn$frontend$parseExpressionItem(lite_target, lite_source, lite_position, lite_prefix, [...(lite_locals)], [...(lite_functions)], [...(lite_functionParams)], lite_currentName, lite_currentResult, ((liteFn$frontend$atValueTail([...(lite_blocks)], lite_blockCount)) && ((!(lite_currentStopped)))), [...(lite_stmtCtxs)]);
                    void lite_expression;
                    if (((lite_currentLive) && ((!(lite_currentStopped))))) {
                        lite_items.push({ kind: liteFn$frontend$expressionStatementKind((lite_expression).valueKind, (lite_expression).returned, "Discard", lite_currentResult), name: (lite_expression).valueKind, runtime: "", code: (lite_expression).code, intValue: 0n, textValue: "" });
                    }
                    if ((((lite_expression).returned) || ((((lite_expression).valueKind) === ("Never"))))) {
                        if ((!(lite_currentStopped))) {
                            lite_currentReturned = true;
                        }
                        lite_currentStopped = true;
                    }
                    lite_position = (lite_expression).next;
                    continue;
                }
                if (((lite_currentLive) && ((!(lite_currentStopped))))) {
                    lite_items.push({ kind: "Scope", name: "", runtime: "", code: "", intValue: 0n, textValue: "" });
                }
                lite_savedStates.push({ returned: lite_currentReturned, stopped: lite_currentStopped, branchesReturned: lite_branchesReturned, branchesStopped: lite_branchesStopped, hasElse: lite_hasElse, loopForever: lite_loopForever, live: lite_currentLive, preLocalsLen: liteFn$frontend$localsCount([...(lite_locals)]), liveBranchCount: lite_liveBranchCount });
                lite_liveBranchCount = 0n;
                lite_currentLive = ((lite_currentLive) && ((!(lite_currentStopped))));
                lite_currentReturned = false;
                lite_currentStopped = false;
                lite_branchesReturned = true;
                lite_branchesStopped = true;
                lite_hasElse = false;
                lite_loopForever = false;
                lite_blocks.push("scope");
                lite_blockCount = lite$addInt(lite_blockCount, 1n, 423635);
                lite_depth = lite$addInt(lite_depth, 1n, 423666);
                lite_position = liteFn$frontend$skipTrivia(lite_source, lite$addInt(lite_position, 1n, 423722), lite_prefix);
                continue;
            }
            let lite_destructureOpen = (-1n);
            void lite_destructureOpen;
            let lite_destructureMutable = false;
            void lite_destructureMutable;
            if (((lite_ch) === ("("))) {
                const lite_parenEnd = liteFn$frontend$scanParenEnd(lite_source, lite_position, lite_prefix);
                void lite_parenEnd;
                const lite_afterParen = (Boolean(((lite_parenEnd) >= (0n))) ? liteFn$frontend$skipTrivia(lite_source, lite_parenEnd, lite_prefix) : (-1n));
                void lite_afterParen;
                if (((((lite_afterParen) >= (0n))) && (liteFn$lib$core$text$startsWithAt(lite_source, lite_afterParen, ":=")))) {
                    lite_destructureOpen = lite_position;
                }
            } else if (((((lite_ch) === ("v"))) && (liteFn$lib$core$text$wordAt(lite_source, lite_position, "var")))) {
                const lite_afterVar = liteFn$frontend$skipTrivia(lite_source, lite$addInt(lite_position, 3n, 424296), lite_prefix);
                void lite_afterVar;
                if (((((lite_afterVar) < (lite_size))) && (((liteFn$lib$core$text$at(lite_source, lite_afterVar)) === ("("))))) {
                    lite_destructureOpen = lite_afterVar;
                    lite_destructureMutable = true;
                }
            }
            if (((lite_destructureOpen) >= (0n))) {
                const lite_destructure = liteFn$frontend$parseTupleDestructureTarget(lite_source, lite_destructureOpen, lite_prefix);
                void lite_destructure;
                const lite_afterTarget = liteFn$frontend$skipTrivia(lite_source, (lite_destructure).next, lite_prefix);
                void lite_afterTarget;
                if ((!(liteFn$lib$core$text$startsWithAt(lite_source, lite_afterTarget, ":=")))) {
                    liteFn$frontend$failAt(lite_source, lite_afterTarget, lite_prefix, "expected := after tuple destructuring target");
                }
                const lite_rhs = liteFn$frontend$parseInitializerExpression(lite_target, lite_source, liteFn$frontend$skipTrivia(lite_source, lite$addInt(lite_afterTarget, 2n, 424967), lite_prefix), lite_prefix, [...(lite_locals)], [...(lite_functions)], [...(lite_functionParams)], lite_currentName, "", [...(lite_stmtCtxs)]);
                void lite_rhs;
                if ((((lite_destructure).count) === (0n))) {
                    if (lite_destructureMutable) {
                        liteFn$frontend$failAt(lite_source, lite_destructureOpen, lite_prefix, "var tuple destructuring needs at least one binding");
                    }
                    if (liteFn$frontend$isTupleKind((lite_rhs).kind)) {
                        liteFn$frontend$failAt(lite_source, lite_destructureOpen, lite_prefix, (("tuple destructuring expected 0 fields, got ") + (liteFn$lib$core$int$intText(liteFn$frontend$tupleComponentCount((lite_rhs).kind)))));
                    }
                    if ((((lite_rhs).kind) !== ("Unit"))) {
                        liteFn$frontend$failAt(lite_source, lite_destructureOpen, lite_prefix, (("tuple destructuring requires Unit for (), got ") + (liteFn$frontend$displayKind((lite_rhs).kind))));
                    }
                    const lite_statementNext = liteFn$frontend$consumeStatementEnd(lite_source, (lite_rhs).next, lite_prefix);
                    void lite_statementNext;
                    if (((lite_statementNext) < (0n))) {
                        liteFn$frontend$failAt(lite_source, liteFn$frontend$skipTrivia(lite_source, (lite_rhs).next, lite_prefix), lite_prefix, "expected ; after tuple destructuring");
                    }
                    lite_position = lite_statementNext;
                    if (((lite_currentLive) && ((!(lite_currentStopped))))) {
                        lite_items.push({ kind: "Discard", name: "Unit", runtime: "", code: (lite_rhs).code, intValue: 0n, textValue: "" });
                    }
                    continue;
                }
                if ((lite_destructure).grouped) {
                    const lite_bindName = (lite_destructure).namesText;
                    void lite_bindName;
                    liteFn$frontend$rejectNonValueBinding(lite_source, lite_destructureOpen, lite_prefix, (lite_rhs).kind, lite_bindName);
                    const lite_statementNext = liteFn$frontend$consumeStatementEnd(lite_source, (lite_rhs).next, lite_prefix);
                    void lite_statementNext;
                    if (((lite_statementNext) < (0n))) {
                        liteFn$frontend$failAt(lite_source, liteFn$frontend$skipTrivia(lite_source, (lite_rhs).next, lite_prefix), lite_prefix, "expected ; after tuple destructuring");
                    }
                    lite_position = lite_statementNext;
                    if (((((lite_depth) === (0n))) && (((lite_blockCount) === (0n))))) {
                        const lite_rootIndex = liteFn$frontend$localIndex([...(lite_locals)], lite_bindName);
                        void lite_rootIndex;
                        if (((((lite_rootIndex) >= (0n))) && ((((lite$listAt((lite_locals), lite_rootIndex, 426834)).depth) === (0n))))) {
                            liteFn$frontend$failAt(lite_source, lite_destructureOpen, lite_prefix, (("duplicate top-level value ") + (lite_bindName)));
                        }
                    }
                    const lite_bindRuntime = liteFn$frontend$localRuntimeName(lite_target, [...(lite_locals)], lite_bindName, lite_moduleKey, lite_depth);
                    void lite_bindRuntime;
                    lite_locals.push({ name: lite_bindName, runtime: lite_bindRuntime, kind: (lite_rhs).kind, mutable: lite_destructureMutable, writable: false, depth: lite_depth, constant: false, code: (lite_rhs).code, intValue: (lite_rhs).intValue, textValue: (lite_rhs).textValue, initState: "init" });
                    if (((lite_currentLive) && ((!(lite_currentStopped))))) {
                        const lite_itemPrefix = (Boolean(lite_destructureMutable) ? "Var" : "Local");
                        void lite_itemPrefix;
                        lite_items.push({ kind: ((lite_itemPrefix) + (liteFn$frontend$storageKind((lite_rhs).kind))), name: lite_bindName, runtime: lite_bindRuntime, code: liteFn$frontend$copiedValueCode(lite_target, (lite_rhs).kind, (lite_rhs).code), intValue: (lite_rhs).intValue, textValue: liteFn$frontend$itemTextPayload(lite_rhs) });
                    }
                    continue;
                }
                if ((!(liteFn$frontend$isTupleKind((lite_rhs).kind)))) {
                    liteFn$frontend$failAt(lite_source, lite_destructureOpen, lite_prefix, (("tuple destructuring requires a tuple value, got ") + (liteFn$frontend$displayKind((lite_rhs).kind))));
                }
                if (((liteFn$frontend$tupleComponentCount((lite_rhs).kind)) !== ((lite_destructure).count))) {
                    liteFn$frontend$failAt(lite_source, lite_destructureOpen, lite_prefix, (((((("tuple destructuring expected ") + (liteFn$lib$core$int$intText((lite_destructure).count)))) + (" fields, got "))) + (liteFn$lib$core$int$intText(liteFn$frontend$tupleComponentCount((lite_rhs).kind)))));
                }
                const lite_statementNext = liteFn$frontend$consumeStatementEnd(lite_source, (lite_rhs).next, lite_prefix);
                void lite_statementNext;
                if (((lite_statementNext) < (0n))) {
                    liteFn$frontend$failAt(lite_source, liteFn$frontend$skipTrivia(lite_source, (lite_rhs).next, lite_prefix), lite_prefix, "expected ; after tuple destructuring");
                }
                lite_position = lite_statementNext;
                const lite_tempRuntime = liteFn$frontend$freshScopeTemp([...(lite_locals)], "lite$tuple");
                void lite_tempRuntime;
                lite_locals.push({ name: "$tuple", runtime: lite_tempRuntime, kind: "Unit", mutable: false, writable: false, depth: lite_depth, constant: false, code: "", intValue: 0n, textValue: "", initState: "init" });
                if (((lite_currentLive) && ((!(lite_currentStopped))))) {
                    lite_items.push({ kind: "LocalTuple", name: "", runtime: lite_tempRuntime, code: (lite_rhs).code, intValue: 0n, textValue: "" });
                }
                let lite_bindCursor = 0n;
                void lite_bindCursor;
                let lite_bindIndex = 0n;
                void lite_bindIndex;
                const lite_namesLen = liteFn$lib$core$text$length((lite_destructure).namesText);
                void lite_namesLen;
                while (((lite_bindIndex) < ((lite_destructure).count))) {
                    let lite_bindEnd = lite_bindCursor;
                    void lite_bindEnd;
                    while (((((lite_bindEnd) < (lite_namesLen))) && (((liteFn$lib$core$text$at((lite_destructure).namesText, lite_bindEnd)) !== (","))))) {
                        lite_bindEnd = lite$addInt(lite_bindEnd, 1n, 429534);
                    }
                    const lite_bindName = liteFn$lib$core$text$slice((lite_destructure).namesText, lite_bindCursor, lite_bindEnd);
                    void lite_bindName;
                    lite_bindCursor = lite$addInt(lite_bindEnd, 1n, 429681);
                    if (((((lite_depth) === (0n))) && (((lite_blockCount) === (0n))))) {
                        const lite_rootIndex = liteFn$frontend$localIndex([...(lite_locals)], lite_bindName);
                        void lite_rootIndex;
                        if (((((lite_rootIndex) >= (0n))) && ((((lite$listAt((lite_locals), lite_rootIndex, 429850)).depth) === (0n))))) {
                            liteFn$frontend$failAt(lite_source, lite_destructureOpen, lite_prefix, (("duplicate top-level value ") + (lite_bindName)));
                        }
                    }
                    const lite_comp = liteFn$frontend$tupleComponent((lite_rhs).kind, lite_bindIndex);
                    void lite_comp;
                    const lite_bindRuntime = liteFn$frontend$localRuntimeName(lite_target, [...(lite_locals)], lite_bindName, lite_moduleKey, lite_depth);
                    void lite_bindRuntime;
                    const lite_fieldCode = ((((lite_tempRuntime) + ("."))) + ((lite_comp).prop));
                    void lite_fieldCode;
                    lite_locals.push({ name: lite_bindName, runtime: lite_bindRuntime, kind: (lite_comp).kind, mutable: lite_destructureMutable, writable: false, depth: lite_depth, constant: false, code: lite_fieldCode, intValue: 0n, textValue: "", initState: "init" });
                    if (((lite_currentLive) && ((!(lite_currentStopped))))) {
                        const lite_itemPrefix = (Boolean(lite_destructureMutable) ? "Var" : "Local");
                        void lite_itemPrefix;
                        lite_items.push({ kind: ((lite_itemPrefix) + (liteFn$frontend$storageKind((lite_comp).kind))), name: lite_bindName, runtime: lite_bindRuntime, code: lite_fieldCode, intValue: 0n, textValue: "" });
                    }
                    lite_bindIndex = lite$addInt(lite_bindIndex, 1n, 430932);
                }
                continue;
            }
            if (((((((((((((((((((((((liteFn$lib$core$text$isDigit(lite_ch)) || (((lite_ch) === ("\""))))) || (((lite_ch) === ("("))))) || (((lite_ch) === ("["))))) || (((lite_ch) === ("+"))))) || (((lite_ch) === ("-"))))) || (((lite_ch) === ("."))))) || ((((((lite_ch) === ("a"))) && (liteFn$lib$core$text$wordAt(lite_source, lite_position, "and"))))))) || ((((((lite_ch) === ("o"))) && (liteFn$lib$core$text$wordAt(lite_source, lite_position, "or"))))))) || ((((((lite_ch) === ("n"))) && (liteFn$lib$core$text$wordAt(lite_source, lite_position, "not"))))))) || ((((((lite_ch) === ("t"))) && (liteFn$lib$core$text$wordAt(lite_source, lite_position, "true"))))))) || ((((((lite_ch) === ("f"))) && (liteFn$lib$core$text$wordAt(lite_source, lite_position, "false"))))))) {
                const lite_expression = liteFn$frontend$parseExpressionItem(lite_target, lite_source, lite_position, lite_prefix, [...(lite_locals)], [...(lite_functions)], [...(lite_functionParams)], lite_currentName, lite_currentResult, ((liteFn$frontend$atValueTail([...(lite_blocks)], lite_blockCount)) && ((!(lite_currentStopped)))), [...(lite_stmtCtxs)]);
                void lite_expression;
                if (((lite_currentLive) && ((!(lite_currentStopped))))) {
                    lite_items.push({ kind: liteFn$frontend$expressionStatementKind((lite_expression).valueKind, (lite_expression).returned, "Discard", lite_currentResult), name: (lite_expression).valueKind, runtime: "", code: (lite_expression).code, intValue: 0n, textValue: "" });
                }
                if ((((lite_expression).returned) || ((((lite_expression).valueKind) === ("Never"))))) {
                    if ((!(lite_currentStopped))) {
                        lite_currentReturned = true;
                    }
                    lite_currentStopped = true;
                }
                lite_position = (lite_expression).next;
                continue;
            }
            if (((lite_ch) === ("@"))) {
                const lite_tagInfo = liteFn$frontend$parseTagAt(lite_source, lite_position, lite_prefix);
                void lite_tagInfo;
                const lite_afterTag = liteFn$frontend$skipTrivia(lite_source, (lite_tagInfo).next, lite_prefix);
                void lite_afterTag;
                if (((((lite_afterTag) >= (lite_size))) || ((((((((((((liteFn$lib$core$text$at(lite_source, lite_afterTag)) !== ("{"))) && (((liteFn$lib$core$text$at(lite_source, lite_afterTag)) !== ("."))))) && ((!(liteFn$lib$core$text$wordAt(lite_source, lite_afterTag, "if")))))) && ((!(liteFn$lib$core$text$wordAt(lite_source, lite_afterTag, "match")))))) && ((!(liteFn$lib$core$text$wordAt(lite_source, lite_afterTag, "loop"))))))))) {
                    liteFn$frontend$failAt(lite_source, lite_afterTag, lite_prefix, (("expected {, if, match, loop or . after block tag @") + ((lite_tagInfo).tag)));
                }
                const lite_expression = liteFn$frontend$parseExpressionItem(lite_target, lite_source, lite_position, lite_prefix, [...(lite_locals)], [...(lite_functions)], [...(lite_functionParams)], lite_currentName, lite_currentResult, ((liteFn$frontend$atValueTail([...(lite_blocks)], lite_blockCount)) && ((!(lite_currentStopped)))), [...(lite_stmtCtxs)]);
                void lite_expression;
                if (((lite_currentLive) && ((!(lite_currentStopped))))) {
                    lite_items.push({ kind: liteFn$frontend$expressionStatementKind((lite_expression).valueKind, (lite_expression).returned, "Discard", lite_currentResult), name: (lite_expression).valueKind, runtime: "", code: (lite_expression).code, intValue: 0n, textValue: "" });
                }
                if ((((lite_expression).returned) || ((((lite_expression).valueKind) === ("Never"))))) {
                    if ((!(lite_currentStopped))) {
                        lite_currentReturned = true;
                    }
                    lite_currentStopped = true;
                }
                lite_position = (lite_expression).next;
                continue;
            }
            if ((!(liteFn$lib$core$text$isNameStart(lite_ch)))) {
                liteFn$frontend$failAt(lite_source, lite_position, lite_prefix, "expected a statement: output/outputLine, declaration, assignment, if or loop");
            }
            const lite_nameStart = lite_position;
            void lite_nameStart;
            lite_position = liteFn$lib$core$text$skipName(lite_source, lite_position);
            const lite_name = liteFn$lib$core$text$slice(lite_source, lite_nameStart, lite_position);
            void lite_name;
            if (((lite_name) === ("import"))) {
                if (((lite_blockCount) !== (0n))) {
                    liteFn$frontend$failAt(lite_source, lite_nameStart, lite_prefix, "import is only allowed at top level");
                }
                liteFn$frontend$failAt(lite_source, lite_nameStart, lite_prefix, "import requires a module alias");
            }
            if (((lite_name) === ("pub"))) {
                if (((lite_blockCount) !== (0n))) {
                    liteFn$frontend$failAt(lite_source, lite_nameStart, lite_prefix, "pub is only allowed on top-level declarations");
                }
                const lite_declarationStart = liteFn$frontend$skipTrivia(lite_source, lite_position, lite_prefix);
                void lite_declarationStart;
                if (((((lite_declarationStart) >= (lite_size))) || ((!(liteFn$lib$core$text$isNameStart(liteFn$lib$core$text$at(lite_source, lite_declarationStart))))))) {
                    liteFn$frontend$failAt(lite_source, lite_declarationStart, lite_prefix, "expected a declaration after pub");
                }
                const lite_declarationEnd = liteFn$lib$core$text$skipName(lite_source, lite_declarationStart);
                void lite_declarationEnd;
                const lite_declarationOperator = liteFn$frontend$skipTrivia(lite_source, lite_declarationEnd, lite_prefix);
                void lite_declarationOperator;
                if ((!(liteFn$lib$core$text$startsWithAt(lite_source, lite_declarationOperator, ":=")))) {
                    liteFn$frontend$failAt(lite_source, lite_declarationOperator, lite_prefix, "expected := after published declaration name");
                }
                lite_position = lite_declarationStart;
                continue;
            }
            lite_position = liteFn$frontend$skipTrivia(lite_source, lite_position, lite_prefix);
            if (liteFn$lib$core$text$startsWithAt(lite_source, lite_position, ":=")) {
                const lite_afterImport = liteFn$frontend$skipTrivia(lite_source, lite$addInt(lite_position, 2n, 435219), lite_prefix);
                void lite_afterImport;
                if (liteFn$lib$core$text$wordAt(lite_source, lite_afterImport, "import")) {
                    if (((lite_blockCount) !== (0n))) {
                        liteFn$frontend$failAt(lite_source, lite_nameStart, lite_prefix, "import is only allowed at top level");
                    }
                    if (liteFn$lib$core$list$listContainsText([...(lite_declaredImportAliases)], lite_name)) {
                        liteFn$frontend$failAt(lite_source, lite_nameStart, lite_prefix, (("duplicate module alias ") + (lite_name)));
                    }
                    lite_declaredImportAliases.push(lite_name);
                    const lite_imported = liteFn$frontend$parseImportClause(lite_target, lite_source, lite_afterImport, lite_name, lite_prefix);
                    void lite_imported;
                    lite_items.push(lite_imported);
                    lite_position = (lite_imported).intValue;
                    continue;
                }
            }
            let lite_afterDefinition = lite_position;
            void lite_afterDefinition;
            if (liteFn$lib$core$text$startsWithAt(lite_source, lite_position, ":=")) {
                lite_afterDefinition = liteFn$frontend$skipTrivia(lite_source, lite$addInt(lite_position, 2n, 436093), lite_prefix);
            }
            const lite_definition = ((((((lite_blockCount) === (0n))) && (liteFn$lib$core$text$startsWithAt(lite_source, lite_position, ":=")))) && ((((liteFn$lib$core$text$wordAt(lite_source, lite_afterDefinition, "fn")) || (liteFn$lib$core$text$wordAt(lite_source, lite_afterDefinition, "type"))))));
            void lite_definition;
            if (((lite_name) === ("return"))) {
                let lite_targetTagPos = lite_position;
                void lite_targetTagPos;
                let lite_targetTagName = "";
                void lite_targetTagName;
                let lite_hasTargetTag = false;
                void lite_hasTargetTag;
                if (((((lite_position) < (lite_size))) && (((liteFn$lib$core$text$at(lite_source, lite_position)) === ("@"))))) {
                    const lite_retTag = liteFn$frontend$parseTagAt(lite_source, lite_position, lite_prefix);
                    void lite_retTag;
                    const lite_afterRetTag = liteFn$frontend$skipTrivia(lite_source, (lite_retTag).next, lite_prefix);
                    void lite_afterRetTag;
                    if (((((lite_afterRetTag) >= (lite_size))) || (((liteFn$lib$core$text$at(lite_source, lite_afterRetTag)) !== ("."))))) {
                        lite_hasTargetTag = true;
                        lite_targetTagName = (lite_retTag).tag;
                    }
                }
                if (lite_hasTargetTag) {
                    const lite_tagIdx = liteFn$frontend$findTaggedCtxIndex([...(lite_stmtCtxs)], lite_targetTagName);
                    void lite_tagIdx;
                    if (((lite_tagIdx) < (0n))) {
                        liteFn$frontend$failAt(lite_source, lite_targetTagPos, lite_prefix, (("unknown block tag @") + (lite_targetTagName)));
                    }
                    liteFn$frontend$failAt(lite_source, lite_targetTagPos, lite_prefix, (("unknown block tag @") + (lite_targetTagName)));
                }
                if (((lite_currentName) === (""))) {
                    liteFn$frontend$failAt(lite_source, lite_nameStart, lite_prefix, "return outside a function");
                }
                const lite_valueStart = lite_position;
                void lite_valueStart;
                if (((((((lite_valueStart) >= (lite_size))) || (((liteFn$lib$core$text$at(lite_source, lite_valueStart)) === (";"))))) || (((liteFn$lib$core$text$at(lite_source, lite_valueStart)) === ("}"))))) {
                    if (((lite_currentResult) !== ("Unit"))) {
                        liteFn$frontend$failAt(lite_source, lite_nameStart, lite_prefix, (((((("function ") + (lite_currentName))) + (" must return "))) + (lite_currentResult)));
                    }
                    lite_position = liteFn$frontend$consumeStatementEnd(lite_source, lite_valueStart, lite_prefix);
                    if (((lite_currentLive) && ((!(lite_currentStopped))))) {
                        lite_items.push({ kind: "Return", name: "", runtime: "", code: "", intValue: 0n, textValue: "" });
                    }
                    if ((!(lite_currentStopped))) {
                        lite_currentReturned = true;
                    }
                    lite_currentStopped = true;
                    continue;
                }
                if (((lite_currentResult) === ("Unit"))) {
                    liteFn$frontend$failAt(lite_source, lite_nameStart, lite_prefix, (((("function ") + (lite_currentName))) + (" returns Unit and cannot return a value")));
                }
                const lite_parsed = liteFn$frontend$parseExpressionAsCtx(lite_target, lite_source, lite_position, lite_prefix, [...(lite_locals)], [...(lite_functions)], [...(lite_functionParams)], lite_currentName, lite_currentResult, [...(lite_stmtCtxs)]);
                void lite_parsed;
                if ((!(liteFn$frontend$isCompatibleKind(lite_currentResult, (lite_parsed).kind)))) {
                    liteFn$frontend$failAt(lite_source, lite_valueStart, lite_prefix, (((((((((("cannot return ") + (liteFn$frontend$displayKind((lite_parsed).kind)))) + (" from function "))) + (lite_currentName))) + (" returning "))) + (liteFn$frontend$displayKind(lite_currentResult))));
                }
                const lite_statementNext = liteFn$frontend$consumeStatementEnd(lite_source, (lite_parsed).next, lite_prefix);
                void lite_statementNext;
                if (((lite_statementNext) < (0n))) {
                    liteFn$frontend$failAt(lite_source, liteFn$frontend$skipTrivia(lite_source, (lite_parsed).next, lite_prefix), lite_prefix, "expected ; after return");
                }
                lite_position = lite_statementNext;
                if (((lite_currentLive) && ((!(lite_currentStopped))))) {
                    lite_items.push({ kind: "Return", name: "", runtime: "", code: liteFn$frontend$assignValueCode(lite_target, lite_currentResult, (lite_parsed).kind, (lite_parsed).code), intValue: 0n, textValue: "" });
                }
                if ((!(lite_currentStopped))) {
                    lite_currentReturned = true;
                }
                lite_currentStopped = true;
                continue;
            }
            if (((((lite_name) === ("break"))) || (((lite_name) === ("continue"))))) {
                let lite_afterExit = lite_position;
                void lite_afterExit;
                if (((((lite_position) < (lite_size))) && (((liteFn$lib$core$text$at(lite_source, lite_position)) === ("@"))))) {
                    const lite_exitTag = liteFn$frontend$parseTagAt(lite_source, lite_position, lite_prefix);
                    void lite_exitTag;
                    const lite_afterDotCheck = liteFn$frontend$skipTrivia(lite_source, (lite_exitTag).next, lite_prefix);
                    void lite_afterDotCheck;
                    if (((((lite_afterDotCheck) < (lite_size))) && (((liteFn$lib$core$text$at(lite_source, lite_afterDotCheck)) === ("."))))) {
                        liteFn$frontend$failAt(lite_source, lite_afterDotCheck, lite_prefix, ((((((lite_name) + (" @"))) + ((lite_exitTag).tag))) + (" followed by . is ambiguous; wrap the payload in parentheses")));
                    }
                    const lite_foundIdx = liteFn$frontend$findTaggedCtxIndex([...(lite_stmtCtxs)], (lite_exitTag).tag);
                    void lite_foundIdx;
                    if (((lite_foundIdx) < (0n))) {
                        liteFn$frontend$failAt(lite_source, lite_position, lite_prefix, (("unknown block tag @") + ((lite_exitTag).tag)));
                    }
                    if ((((lite$listAt((lite_stmtCtxs), lite_foundIdx, 440139)).kind) !== ("loop"))) {
                        liteFn$frontend$failAt(lite_source, lite_position, lite_prefix, ((((((lite_name) + (" @"))) + ((lite_exitTag).tag))) + (" requires an enclosing loop")));
                    }
                    lite_afterExit = lite_afterDotCheck;
                } else if ((!(liteFn$frontend$insideLoop([...(lite_blocks)])))) {
                    liteFn$frontend$failAt(lite_source, lite_nameStart, lite_prefix, ((lite_name) + (" outside loop")));
                }
                if (((((((((lite_target) !== ("ts"))) && (((lite_afterExit) < (lite_size))))) && (((liteFn$lib$core$text$at(lite_source, lite_afterExit)) !== (";"))))) && (((liteFn$lib$core$text$at(lite_source, lite_afterExit)) !== ("}"))))) {
                    liteFn$frontend$failAt(lite_source, lite_nameStart, lite_prefix, (((("C backend does not support ") + (lite_name))) + (" payloads yet")));
                }
                const lite_statementNext = liteFn$frontend$consumeStatementEnd(lite_source, lite_afterExit, lite_prefix);
                void lite_statementNext;
                if (((lite_statementNext) < (0n))) {
                    liteFn$frontend$failAt(lite_source, lite_afterExit, lite_prefix, (("expected ; after ") + (lite_name)));
                }
                lite_position = lite_statementNext;
                if (((lite_currentLive) && ((!(lite_currentStopped))))) {
                    lite_items.push({ kind: (Boolean(((lite_name) === ("break"))) ? "Break" : "Continue"), name: "", runtime: "", code: "", intValue: 0n, textValue: "" });
                }
                lite_currentStopped = true;
                continue;
            }
            let lite_importedOutputName = "";
            void lite_importedOutputName;
            let lite_importedOutputOpen = lite_position;
            void lite_importedOutputOpen;
            const lite_moduleIndex = liteFn$frontend$localIndex([...(lite_locals)], lite_name);
            void lite_moduleIndex;
            if (((((lite_moduleIndex) >= (0n))) && ((((lite$listAt((lite_locals), lite_moduleIndex, 441414)).kind) === ("Module"))))) {
                if (((((lite_position) >= (lite_size))) || (((liteFn$lib$core$text$at(lite_source, lite_position)) !== ("."))))) {
                    liteFn$frontend$failAt(lite_source, lite_nameStart, lite_prefix, (((("module namespace ") + (lite_name))) + (" requires a public member")));
                }
                const lite_memberStart = liteFn$frontend$skipTrivia(lite_source, lite$addInt(lite_position, 1n, 441698), lite_prefix);
                void lite_memberStart;
                const lite_memberEnd = liteFn$lib$core$text$skipName(lite_source, lite_memberStart);
                void lite_memberEnd;
                if (((lite_memberEnd) > (lite_memberStart))) {
                    const lite_functionIndex = liteFn$frontend$findFunction([...(lite_functions)], ((((lite_name) + ("."))) + (liteFn$lib$core$text$slice(lite_source, lite_memberStart, lite_memberEnd))));
                    void lite_functionIndex;
                    if (((lite_functionIndex) >= (0n))) {
                        lite_importedOutputName = liteFn$frontend$coreOutputName((lite$listAt((lite_functions), lite_functionIndex, 442041)).runtime);
                        lite_importedOutputOpen = liteFn$frontend$skipTrivia(lite_source, lite_memberEnd, lite_prefix);
                    }
                }
            }
            if (((lite_importedOutputName) !== (""))) {
                const lite_parsedOutput: { kind: string; name: string; runtime: string; code: string; intValue: bigint; textValue: string }[] = [...(liteFn$frontend$parseOutputStatement(lite_target, lite_source, lite_importedOutputOpen, lite_importedOutputName, lite_prefix, [...(lite_locals)], [...(lite_functions)], [...(lite_functionParams)], lite_currentName, ((lite_currentLive) && ((!(lite_currentStopped)))), [...(lite_stmtCtxs)]))];
                void lite_parsedOutput;
                let lite_outputDiverged = false;
                void lite_outputDiverged;
                for (const lite_outputItem of [...(lite_parsedOutput)]) {
                    void lite_outputItem;
                    if ((((((lite_outputItem).kind) === ("End"))) || ((((lite_outputItem).kind) === ("EndOutput"))))) {
                        lite_position = (lite_outputItem).intValue;
                    }
                    if ((((lite_outputItem).kind) === ("Never"))) {
                        lite_outputDiverged = true;
                    }
                    if (((lite_currentLive) && ((!(lite_currentStopped))))) {
                        lite_items.push(lite_outputItem);
                    }
                }
                if (lite_outputDiverged) {
                    if (((((lite_currentLive) && ((!(lite_currentStopped))))) && (((lite_currentResult) !== ("Unit"))))) {
                        lite_items.push({ kind: "Unreachable", name: "", runtime: "", code: "", intValue: 0n, textValue: "" });
                    }
                    if ((!(lite_currentStopped))) {
                        lite_currentReturned = true;
                    }
                    lite_currentStopped = true;
                }
                continue;
            }
            if (((((lite_moduleIndex) >= (0n))) && ((((lite$listAt((lite_locals), lite_moduleIndex, 443302)).kind) === ("Module"))))) {
                const lite_expression = liteFn$frontend$parseExpressionItem(lite_target, lite_source, lite_nameStart, lite_prefix, [...(lite_locals)], [...(lite_functions)], [...(lite_functionParams)], lite_currentName, lite_currentResult, ((liteFn$frontend$atValueTail([...(lite_blocks)], lite_blockCount)) && ((!(lite_currentStopped)))), [...(lite_stmtCtxs)]);
                void lite_expression;
                if (((lite_currentLive) && ((!(lite_currentStopped))))) {
                    lite_items.push({ kind: liteFn$frontend$expressionStatementKind((lite_expression).valueKind, (lite_expression).returned, "Call", lite_currentResult), name: "", runtime: "", code: (lite_expression).code, intValue: 0n, textValue: "" });
                }
                if ((((lite_expression).returned) || ((((lite_expression).valueKind) === ("Never"))))) {
                    if ((!(lite_currentStopped))) {
                        lite_currentReturned = true;
                    }
                    lite_currentStopped = true;
                }
                lite_position = (lite_expression).next;
                continue;
            }
            let lite_callableIndex = liteFn$frontend$findFunction([...(lite_functions)], lite_name);
            void lite_callableIndex;
            let lite_callName = lite_name;
            void lite_callName;
            if (((lite_name) === ("self"))) {
                if (((lite_currentName) === (""))) {
                    liteFn$frontend$failAt(lite_source, lite_nameStart, lite_prefix, "self is only available inside a function");
                }
                lite_callName = lite_currentName;
                lite_callableIndex = liteFn$frontend$findFunction([...(lite_functions)], lite_currentName);
            }
            if ((((((((((((((((lite_callableIndex) >= (0n))) || (((lite_name) === ("push_back"))))) || (((lite_name) === ("pop_back"))))) || (((lite_name) === ("push_front"))))) || (((lite_name) === ("pop_front")))))) && (((lite_position) < (lite_size))))) && (((liteFn$lib$core$text$at(lite_source, lite_position)) === ("("))))) {
                const lite_expression = liteFn$frontend$parseExpressionItem(lite_target, lite_source, lite_nameStart, lite_prefix, [...(lite_locals)], [...(lite_functions)], [...(lite_functionParams)], lite_currentName, lite_currentResult, ((liteFn$frontend$atValueTail([...(lite_blocks)], lite_blockCount)) && ((!(lite_currentStopped)))), [...(lite_stmtCtxs)]);
                void lite_expression;
                if (((lite_currentLive) && ((!(lite_currentStopped))))) {
                    lite_items.push({ kind: liteFn$frontend$expressionStatementKind((lite_expression).valueKind, (lite_expression).returned, "Call", lite_currentResult), name: lite_callName, runtime: "", code: (lite_expression).code, intValue: 0n, textValue: "" });
                }
                if ((((lite_expression).returned) || ((((lite_expression).valueKind) === ("Never"))))) {
                    if ((!(lite_currentStopped))) {
                        lite_currentReturned = true;
                    }
                    lite_currentStopped = true;
                }
                lite_position = (lite_expression).next;
                continue;
            }
            if (((lite_name) === ("if"))) {
                const lite_rawIfEnd = liteFn$frontend$scanRawIfChainEnd(lite_source, lite_nameStart, lite_prefix, true);
                void lite_rawIfEnd;
                const lite_afterRawIf = (Boolean(((lite_rawIfEnd) >= (0n))) ? liteFn$frontend$skipTrivia(lite_source, lite_rawIfEnd, lite_prefix) : (-1n));
                void lite_afterRawIf;
                if (((((lite_afterRawIf) >= (0n))) && ((((liteFn$lib$core$text$wordAt(lite_source, lite_afterRawIf, "then")) || (liteFn$lib$core$text$wordAt(lite_source, lite_afterRawIf, "finally"))))))) {
                    const lite_expression = liteFn$frontend$parseExpressionItem(lite_target, lite_source, lite_nameStart, lite_prefix, [...(lite_locals)], [...(lite_functions)], [...(lite_functionParams)], lite_currentName, lite_currentResult, ((liteFn$frontend$atValueTail([...(lite_blocks)], lite_blockCount)) && ((!(lite_currentStopped)))), [...(lite_stmtCtxs)]);
                    void lite_expression;
                    if (((lite_currentLive) && ((!(lite_currentStopped))))) {
                        lite_items.push({ kind: liteFn$frontend$expressionStatementKind((lite_expression).valueKind, (lite_expression).returned, "Discard", lite_currentResult), name: (lite_expression).valueKind, runtime: "", code: (lite_expression).code, intValue: 0n, textValue: "" });
                    }
                    if ((((lite_expression).returned) || ((((lite_expression).valueKind) === ("Never"))))) {
                        if ((!(lite_currentStopped))) {
                            lite_currentReturned = true;
                        }
                        lite_currentStopped = true;
                    }
                    lite_position = (lite_expression).next;
                    continue;
                }
                let lite_valueTailBranch = false;
                void lite_valueTailBranch;
                if (((((((lite_currentName) !== (""))) && (liteFn$frontend$atValueTail([...(lite_blocks)], lite_blockCount)))) && ((!(lite_currentStopped))))) {
                    const lite_valueEnd = liteFn$frontend$scanValueIfEnd(lite_source, lite_nameStart, lite_prefix, true);
                    void lite_valueEnd;
                    if (((lite_valueEnd) >= (0n))) {
                        const lite_afterChain = liteFn$frontend$skipItemSeparators(lite_source, lite_valueEnd, lite_prefix);
                        void lite_afterChain;
                        if (((((lite_afterChain) < (lite_size))) && (((liteFn$lib$core$text$at(lite_source, lite_afterChain)) === ("}"))))) {
                            const lite_expression = liteFn$frontend$parseExpressionItem(lite_target, lite_source, lite_nameStart, lite_prefix, [...(lite_locals)], [...(lite_functions)], [...(lite_functionParams)], lite_currentName, lite_currentResult, true, [...(lite_stmtCtxs)]);
                            void lite_expression;
                            if (((lite_currentLive) && ((!(lite_currentStopped))))) {
                                lite_items.push({ kind: "Return", name: "", runtime: "", code: (lite_expression).code, intValue: 0n, textValue: "" });
                            }
                            lite_currentReturned = true;
                            lite_currentStopped = true;
                            lite_position = (lite_expression).next;
                            continue;
                        }
                    }
                    const lite_statementEnd = liteFn$frontend$scanValueIfEnd(lite_source, lite_nameStart, lite_prefix, false);
                    void lite_statementEnd;
                    if (((lite_statementEnd) >= (0n))) {
                        const lite_afterStatement = liteFn$frontend$skipItemSeparators(lite_source, lite_statementEnd, lite_prefix);
                        void lite_afterStatement;
                        if (((((lite_afterStatement) < (lite_size))) && (((liteFn$lib$core$text$at(lite_source, lite_afterStatement)) === ("}"))))) {
                            lite_valueTailBranch = true;
                        }
                    }
                }
                const lite_conditionStart = lite_position;
                void lite_conditionStart;
                liteFn$frontend$rejectHeaderBlockTag(lite_source, lite_conditionStart, lite_prefix, "if");
                const lite_ifBarrierCtx = { id: 0n, tag: "", kind: "if", phase: "body", iifeDepth: 0n, valKind: "", valVar: "", label: "", iterLabel: "", countVar: "", itemVar: "", itemKind: "", indexVar: "", hasIndex: false };
                void lite_ifBarrierCtx;
                const lite_condition = liteFn$frontend$parseExpressionCtx(lite_target, lite_source, lite_position, lite_prefix, [...(lite_locals)], [...(lite_functions)], [...(lite_functionParams)], lite_currentName, [...(liteFn$frontend$appendCtx([...(lite_stmtCtxs)], lite_ifBarrierCtx))]);
                void lite_condition;
                if ((((lite_condition).kind) !== ("Bool"))) {
                    liteFn$frontend$failAt(lite_source, lite_conditionStart, lite_prefix, "if condition must be Bool");
                }
                const lite_conditionCode = (Boolean((lite_condition).constant) ? liteFn$frontend$targetBoolLiteralCode(lite_target, (((lite_condition).intValue) !== (0n))) : (lite_condition).code);
                void lite_conditionCode;
                const lite_beforeIfOpen = liteFn$frontend$skipTrivia(lite_source, (lite_condition).next, lite_prefix);
                void lite_beforeIfOpen;
                liteFn$frontend$rejectMisplacedTag(lite_source, lite_beforeIfOpen, lite_prefix, "block tag cannot appear before { in if");
                lite_position = liteFn$frontend$expectSymbol(lite_source, lite_beforeIfOpen, "{", lite_prefix);
                if (((lite_currentLive) && ((!(lite_currentStopped))))) {
                    lite_items.push({ kind: "If", name: "", runtime: "", code: lite_conditionCode, intValue: 0n, textValue: "" });
                }
                lite_savedStates.push({ returned: lite_currentReturned, stopped: lite_currentStopped, branchesReturned: lite_branchesReturned, branchesStopped: lite_branchesStopped, hasElse: lite_hasElse, loopForever: lite_loopForever, live: lite_currentLive, preLocalsLen: liteFn$frontend$localsCount([...(lite_locals)]), liveBranchCount: lite_liveBranchCount });
                lite_liveBranchCount = 0n;
                lite_currentLive = ((lite_currentLive) && ((!(lite_currentStopped))));
                lite_currentReturned = false;
                lite_currentStopped = false;
                lite_branchesReturned = true;
                lite_branchesStopped = true;
                lite_hasElse = false;
                lite_loopForever = false;
                lite_stmtCtxs.push(lite_ifBarrierCtx);
                lite_blocks.push((Boolean(lite_valueTailBranch) ? "ifvalue" : "if"));
                lite_blockCount = lite$addInt(lite_blockCount, 1n, 450222);
                lite_depth = lite$addInt(lite_depth, 1n, 450253);
                lite_position = liteFn$frontend$skipTrivia(lite_source, lite_position, lite_prefix);
                continue;
            }
            if (((lite_name) === ("match"))) {
                liteFn$frontend$rejectMisplacedTag(lite_source, lite_position, lite_prefix, "block tag cannot appear before { in match");
                if (((((lite_position) >= (lite_size))) || (((liteFn$lib$core$text$at(lite_source, lite_position)) !== ("{"))))) {
                    liteFn$frontend$unsupportedFeature(lite_source, lite_nameStart, "match", lite_prefix);
                }
                const lite_rawMatchEnd = liteFn$frontend$scanRawMatchEnd(lite_source, lite_nameStart, lite_prefix);
                void lite_rawMatchEnd;
                const lite_afterRawMatch = (Boolean(((lite_rawMatchEnd) >= (0n))) ? liteFn$frontend$skipTrivia(lite_source, lite_rawMatchEnd, lite_prefix) : (-1n));
                void lite_afterRawMatch;
                if (((((lite_afterRawMatch) >= (0n))) && ((((liteFn$lib$core$text$wordAt(lite_source, lite_afterRawMatch, "then")) || (liteFn$lib$core$text$wordAt(lite_source, lite_afterRawMatch, "finally"))))))) {
                    const lite_expression = liteFn$frontend$parseExpressionItem(lite_target, lite_source, lite_nameStart, lite_prefix, [...(lite_locals)], [...(lite_functions)], [...(lite_functionParams)], lite_currentName, lite_currentResult, ((liteFn$frontend$atValueTail([...(lite_blocks)], lite_blockCount)) && ((!(lite_currentStopped)))), [...(lite_stmtCtxs)]);
                    void lite_expression;
                    if (((lite_currentLive) && ((!(lite_currentStopped))))) {
                        lite_items.push({ kind: liteFn$frontend$expressionStatementKind((lite_expression).valueKind, (lite_expression).returned, "Discard", lite_currentResult), name: (lite_expression).valueKind, runtime: "", code: (lite_expression).code, intValue: 0n, textValue: "" });
                    }
                    if ((((lite_expression).returned) || ((((lite_expression).valueKind) === ("Never"))))) {
                        if ((!(lite_currentStopped))) {
                            lite_currentReturned = true;
                        }
                        lite_currentStopped = true;
                    }
                    lite_position = (lite_expression).next;
                    continue;
                }
                let lite_valueTailBranch = false;
                void lite_valueTailBranch;
                if (((((((((lite_currentName) !== (""))) && (((lite_currentResult) !== ("Unit"))))) && (liteFn$frontend$atValueTail([...(lite_blocks)], lite_blockCount)))) && ((!(lite_currentStopped))))) {
                    if (((lite_target) === ("ts"))) {
                        const lite_valueEnd = liteFn$frontend$scanValueMatchEnd(lite_source, lite_nameStart, lite_prefix, true);
                        void lite_valueEnd;
                        if (((lite_valueEnd) >= (0n))) {
                            const lite_afterMatch = liteFn$frontend$skipItemSeparators(lite_source, lite_valueEnd, lite_prefix);
                            void lite_afterMatch;
                            if (((((lite_afterMatch) < (lite_size))) && (((liteFn$lib$core$text$at(lite_source, lite_afterMatch)) === ("}"))))) {
                                const lite_expression = liteFn$frontend$parseExpressionItem(lite_target, lite_source, lite_nameStart, lite_prefix, [...(lite_locals)], [...(lite_functions)], [...(lite_functionParams)], lite_currentName, lite_currentResult, true, [...(lite_stmtCtxs)]);
                                void lite_expression;
                                if (((lite_currentLive) && ((!(lite_currentStopped))))) {
                                    lite_items.push({ kind: "Return", name: "", runtime: "", code: (lite_expression).code, intValue: 0n, textValue: "" });
                                }
                                lite_currentReturned = true;
                                lite_currentStopped = true;
                                lite_position = (lite_expression).next;
                                continue;
                            }
                        }
                    }
                    const lite_statementEnd = liteFn$frontend$scanValueMatchEnd(lite_source, lite_nameStart, lite_prefix, false);
                    void lite_statementEnd;
                    if (((lite_statementEnd) >= (0n))) {
                        const lite_afterStatement = liteFn$frontend$skipItemSeparators(lite_source, lite_statementEnd, lite_prefix);
                        void lite_afterStatement;
                        if (((((lite_afterStatement) < (lite_size))) && (((liteFn$lib$core$text$at(lite_source, lite_afterStatement)) === ("}"))))) {
                            lite_valueTailBranch = true;
                        }
                    }
                }
                const lite_firstArmStart = liteFn$frontend$skipItemSeparators(lite_source, lite$addInt(lite_position, 1n, 453464), lite_prefix);
                void lite_firstArmStart;
                if (((lite_firstArmStart) >= (lite_size))) {
                    liteFn$frontend$failAt(lite_source, lite_position, lite_prefix, "expected } to close match");
                }
                if (((liteFn$lib$core$text$at(lite_source, lite_firstArmStart)) === ("}"))) {
                    liteFn$frontend$failAt(lite_source, lite_firstArmStart, lite_prefix, "subjectless match requires a final _ fallback arm");
                }
                const lite_afterUnderscore = liteFn$frontend$skipTrivia(lite_source, lite$addInt(lite_firstArmStart, 1n, 453854), lite_prefix);
                void lite_afterUnderscore;
                if (liteFn$lib$core$text$wordAt(lite_source, lite_firstArmStart, "_")) {
                    liteFn$frontend$rejectMisplacedTag(lite_source, lite_afterUnderscore, lite_prefix, "block tag cannot appear after _ in match arm");
                }
                const lite_isFirstFallback = ((((liteFn$lib$core$text$wordAt(lite_source, lite_firstArmStart, "_")) && (((lite_afterUnderscore) < (lite_size))))) && (((liteFn$lib$core$text$at(lite_source, lite_afterUnderscore)) === ("{"))));
                void lite_isFirstFallback;
                const lite_matchBarrierCtx = { id: 0n, tag: "", kind: "match", phase: "body", iifeDepth: 0n, valKind: "", valVar: "", label: "", iterLabel: "", countVar: "", itemVar: "", itemKind: "", indexVar: "", hasIndex: false };
                void lite_matchBarrierCtx;
                let lite_firstArmOpen = (-1n);
                void lite_firstArmOpen;
                if (lite_isFirstFallback) {
                    lite_firstArmOpen = lite_afterUnderscore;
                    if (((lite_currentLive) && ((!(lite_currentStopped))))) {
                        lite_items.push({ kind: "Scope", name: "", runtime: "", code: "", intValue: 0n, textValue: "" });
                    }
                } else {
                    lite_firstArmOpen = liteFn$frontend$scanConditionOpen(lite_source, lite_firstArmStart, lite_prefix);
                    if (((lite_firstArmOpen) < (0n))) {
                        liteFn$frontend$failAt(lite_source, lite_firstArmStart, lite_prefix, "expected { after match arm condition");
                    }
                    if (((lite_firstArmOpen) === (lite_firstArmStart))) {
                        liteFn$frontend$failAt(lite_source, lite_firstArmStart, lite_prefix, "match arm header requires grouping for { ... } expressions");
                    }
                    liteFn$frontend$rejectHeaderBlockTag(lite_source, lite_firstArmStart, lite_prefix, "match arm");
                    const lite_condition = liteFn$frontend$parseExpressionCtx(lite_target, lite_source, lite_firstArmStart, lite_prefix, [...(lite_locals)], [...(lite_functions)], [...(lite_functionParams)], lite_currentName, [...(liteFn$frontend$appendCtx([...(lite_stmtCtxs)], lite_matchBarrierCtx))]);
                    void lite_condition;
                    const lite_afterCond = liteFn$frontend$skipTrivia(lite_source, (lite_condition).next, lite_prefix);
                    void lite_afterCond;
                    liteFn$frontend$rejectMisplacedTag(lite_source, lite_afterCond, lite_prefix, "block tag cannot appear before { in match arm");
                    if (((lite_afterCond) > (lite_firstArmOpen))) {
                        liteFn$frontend$failAt(lite_source, lite_firstArmOpen, lite_prefix, "ungrouped { in match arm header starts the arm body; parenthesize block or conditional expressions");
                    }
                    if (((lite_afterCond) !== (lite_firstArmOpen))) {
                        const lite__ = liteFn$frontend$expectSymbol(lite_source, lite_afterCond, "{", lite_prefix);
                        void lite__;
                    }
                    if ((((lite_condition).kind) !== ("Bool"))) {
                        liteFn$frontend$failAt(lite_source, lite_firstArmStart, lite_prefix, "match arm condition must be Bool");
                    }
                    const lite_conditionCode = (Boolean((lite_condition).constant) ? liteFn$frontend$targetBoolLiteralCode(lite_target, (((lite_condition).intValue) !== (0n))) : (lite_condition).code);
                    void lite_conditionCode;
                    if (((lite_currentLive) && ((!(lite_currentStopped))))) {
                        lite_items.push({ kind: "If", name: "", runtime: "", code: lite_conditionCode, intValue: 0n, textValue: "" });
                    }
                }
                lite_savedStates.push({ returned: lite_currentReturned, stopped: lite_currentStopped, branchesReturned: lite_branchesReturned, branchesStopped: lite_branchesStopped, hasElse: lite_hasElse, loopForever: lite_loopForever, live: lite_currentLive, preLocalsLen: liteFn$frontend$localsCount([...(lite_locals)]), liveBranchCount: lite_liveBranchCount });
                lite_liveBranchCount = 0n;
                lite_currentLive = ((lite_currentLive) && ((!(lite_currentStopped))));
                lite_currentReturned = false;
                lite_currentStopped = false;
                lite_branchesReturned = true;
                lite_branchesStopped = true;
                lite_hasElse = lite_isFirstFallback;
                lite_loopForever = false;
                const lite_firstBlockKind = (Boolean(lite_isFirstFallback) ? (Boolean(lite_valueTailBranch) ? "matchsingleval" : "matchsingle") : (Boolean(lite_valueTailBranch) ? "matchvalue" : "match"));
                void lite_firstBlockKind;
                lite_stmtCtxs.push(lite_matchBarrierCtx);
                lite_blocks.push(lite_firstBlockKind);
                lite_blockCount = lite$addInt(lite_blockCount, 1n, 457695);
                lite_depth = lite$addInt(lite_depth, 1n, 457726);
                lite_position = liteFn$frontend$skipTrivia(lite_source, lite$addInt(lite_firstArmOpen, 1n, 457786), lite_prefix);
                continue;
            }
            if (((lite_name) === ("loop"))) {
                const lite_rawStmtLoopEnd = liteFn$frontend$scanRawLoopEnd(lite_source, lite_nameStart, lite_prefix);
                void lite_rawStmtLoopEnd;
                const lite_afterRawStmtLoopTok = (Boolean(((lite_rawStmtLoopEnd) >= (0n))) ? liteFn$frontend$skipTrivia(lite_source, lite_rawStmtLoopEnd, lite_prefix) : (-1n));
                void lite_afterRawStmtLoopTok;
                const lite_hasStmtLoopThen = ((((lite_afterRawStmtLoopTok) >= (0n))) && (liteFn$lib$core$text$wordAt(lite_source, lite_afterRawStmtLoopTok, "then")));
                void lite_hasStmtLoopThen;
                const lite_hasStmtLoopFin = ((((lite_afterRawStmtLoopTok) >= (0n))) && (liteFn$lib$core$text$wordAt(lite_source, lite_afterRawStmtLoopTok, "finally")));
                void lite_hasStmtLoopFin;
                let lite_atFnTailLoop = false;
                void lite_atFnTailLoop;
                if (((((((((((lite_currentName) !== (""))) && (((lite_currentResult) !== ("Unit"))))) && (liteFn$frontend$atValueTail([...(lite_blocks)], lite_blockCount)))) && ((!(lite_currentStopped))))) && (((lite_rawStmtLoopEnd) >= (0n))))) {
                    const lite_afterRawStmtLoop = liteFn$frontend$skipItemSeparators(lite_source, lite_rawStmtLoopEnd, lite_prefix);
                    void lite_afterRawStmtLoop;
                    if (((((lite_afterRawStmtLoop) < (lite_size))) && (((liteFn$lib$core$text$at(lite_source, lite_afterRawStmtLoop)) === ("}"))))) {
                        lite_atFnTailLoop = true;
                    }
                }
                if (((((((lite_hasStmtLoopThen) || (lite_hasStmtLoopFin))) || (liteFn$frontend$loopNeedsExprLowering(lite_source, lite_nameStart, lite_prefix)))) || ((((((lite_target) === ("ts"))) && (lite_atFnTailLoop)))))) {
                    if (((lite_target) !== ("ts"))) {
                        if (lite_hasStmtLoopFin) {
                            liteFn$frontend$failAt(lite_source, lite_afterRawStmtLoopTok, lite_prefix, "C backend does not support finally blocks yet");
                        }
                        if (lite_hasStmtLoopThen) {
                            liteFn$frontend$failAt(lite_source, lite_nameStart, lite_prefix, "C backend does not support loop then blocks yet");
                        }
                    } else {
                        const lite_expression = liteFn$frontend$parseExpressionItem(lite_target, lite_source, lite_nameStart, lite_prefix, [...(lite_locals)], [...(lite_functions)], [...(lite_functionParams)], lite_currentName, lite_currentResult, ((liteFn$frontend$atValueTail([...(lite_blocks)], lite_blockCount)) && ((!(lite_currentStopped)))), [...(lite_stmtCtxs)]);
                        void lite_expression;
                        if (((lite_currentLive) && ((!(lite_currentStopped))))) {
                            lite_items.push({ kind: liteFn$frontend$expressionStatementKind((lite_expression).valueKind, (lite_expression).returned, "Discard", lite_currentResult), name: (lite_expression).valueKind, runtime: "", code: (lite_expression).code, intValue: 0n, textValue: "" });
                        }
                        if ((((lite_expression).returned) || ((((lite_expression).valueKind) === ("Never"))))) {
                            if ((!(lite_currentStopped))) {
                                lite_currentReturned = true;
                            }
                            lite_currentStopped = true;
                        }
                        lite_position = (lite_expression).next;
                        continue;
                    }
                }
                liteFn$frontend$rejectHeaderBlockTag(lite_source, lite_position, lite_prefix, "loop");
                let lite_conditionCode = "";
                void lite_conditionCode;
                let lite_sequenceCode = "";
                void lite_sequenceCode;
                let lite_itemName = "";
                void lite_itemName;
                let lite_itemKind = "";
                void lite_itemKind;
                if (((((lite_position) < (lite_size))) && (((liteFn$lib$core$text$at(lite_source, lite_position)) !== ("{"))))) {
                    const lite_parsed = liteFn$frontend$parseExpressionCtx(lite_target, lite_source, lite_position, lite_prefix, [...(lite_locals)], [...(lite_functions)], [...(lite_functionParams)], lite_currentName, [...(lite_stmtCtxs)]);
                    void lite_parsed;
                    const lite_afterParsed = liteFn$frontend$skipTrivia(lite_source, (lite_parsed).next, lite_prefix);
                    void lite_afterParsed;
                    if (liteFn$lib$core$text$wordAt(lite_source, lite_afterParsed, "as")) {
                        if ((((!(liteFn$frontend$isListKind((lite_parsed).kind)))) && ((!(liteFn$frontend$isArrayKind((lite_parsed).kind)))))) {
                            liteFn$frontend$failAt(lite_source, lite_position, lite_prefix, (("loop sequence must be a List or Array, got ") + (liteFn$frontend$displayKind((lite_parsed).kind))));
                        }
                        const lite_itemStart = liteFn$frontend$skipTrivia(lite_source, lite$addInt(lite_afterParsed, 2n, 461022), lite_prefix);
                        void lite_itemStart;
                        if (((((lite_itemStart) >= (lite_size))) || ((!(liteFn$lib$core$text$isNameStart(liteFn$lib$core$text$at(lite_source, lite_itemStart))))))) {
                            liteFn$frontend$failAt(lite_source, lite_itemStart, lite_prefix, "expected an item name after as");
                        }
                        const lite_itemEnd = liteFn$lib$core$text$skipName(lite_source, lite_itemStart);
                        void lite_itemEnd;
                        lite_itemName = liteFn$lib$core$text$slice(lite_source, lite_itemStart, lite_itemEnd);
                        if (liteFn$frontend$isReservedWord(lite_itemName)) {
                            liteFn$frontend$unsupportedFeature(lite_source, lite_itemStart, lite_itemName, lite_prefix);
                        }
                        lite_itemKind = (Boolean(liteFn$frontend$isListKind((lite_parsed).kind)) ? liteFn$frontend$listElementKind((lite_parsed).kind) : liteFn$frontend$arrayElementKind((lite_parsed).kind));
                        lite_sequenceCode = (lite_parsed).code;
                        lite_position = liteFn$frontend$skipTrivia(lite_source, lite_itemEnd, lite_prefix);
                    } else if (((liteFn$frontend$isListKind((lite_parsed).kind)) || (liteFn$frontend$isArrayKind((lite_parsed).kind)))) {
                        lite_itemKind = (Boolean(liteFn$frontend$isListKind((lite_parsed).kind)) ? liteFn$frontend$listElementKind((lite_parsed).kind) : liteFn$frontend$arrayElementKind((lite_parsed).kind));
                        lite_sequenceCode = (lite_parsed).code;
                        lite_position = lite_afterParsed;
                    } else {
                        if ((((lite_parsed).kind) !== ("Bool"))) {
                            liteFn$frontend$failAt(lite_source, lite_position, lite_prefix, "loop condition must be Bool");
                        }
                        if ((lite_parsed).constant) {
                            if ((((lite_parsed).intValue) === (0n))) {
                                lite_conditionCode = "false";
                            }
                        } else {
                            lite_conditionCode = (lite_parsed).code;
                        }
                        lite_position = liteFn$frontend$skipTrivia(lite_source, (lite_parsed).next, lite_prefix);
                    }
                }
                liteFn$frontend$rejectMisplacedTag(lite_source, lite_position, lite_prefix, "block tag cannot appear before { in loop");
                lite_position = liteFn$frontend$expectSymbol(lite_source, lite_position, "{", lite_prefix);
                const lite_loopPreLocalsLen = liteFn$frontend$localsCount([...(lite_locals)]);
                void lite_loopPreLocalsLen;
                if (((lite_itemName) !== (""))) {
                    const lite_runtime = liteFn$frontend$localRuntimeName(lite_target, [...(lite_locals)], lite_itemName, lite_moduleKey, lite$addInt(lite_depth, 1n, 462906));
                    void lite_runtime;
                    lite_locals.push({ name: lite_itemName, runtime: lite_runtime, kind: lite_itemKind, mutable: false, writable: false, depth: lite$addInt(lite_depth, 1n, 463080), constant: false, code: lite_runtime, intValue: 0n, textValue: "", initState: "init" });
                    if (((lite_currentLive) && ((!(lite_currentStopped))))) {
                        lite_items.push({ kind: "LoopSeq", name: lite_itemName, runtime: lite_runtime, code: lite_sequenceCode, intValue: 0n, textValue: lite_itemKind });
                    }
                } else if (((lite_sequenceCode) !== (""))) {
                    const lite_tempItemRuntime = liteFn$frontend$freshScopeTemp([...(lite_locals)], "lite$item");
                    void lite_tempItemRuntime;
                    lite_locals.push({ name: "$item", runtime: lite_tempItemRuntime, kind: "Unit", mutable: false, writable: false, depth: lite$addInt(lite_depth, 1n, 463700), constant: false, code: "", intValue: 0n, textValue: "", initState: "init" });
                    if (((lite_currentLive) && ((!(lite_currentStopped))))) {
                        lite_items.push({ kind: "LoopSeq", name: "", runtime: lite_tempItemRuntime, code: lite_sequenceCode, intValue: 0n, textValue: lite_itemKind });
                    }
                } else {
                    if (((lite_currentLive) && ((!(lite_currentStopped))))) {
                        lite_items.push({ kind: "Loop", name: "", runtime: "", code: lite_conditionCode, intValue: 0n, textValue: "" });
                    }
                }
                const lite_stmtLoopId = lite_nextStmtCtxId;
                void lite_stmtLoopId;
                lite_nextStmtCtxId = lite$addInt(lite_nextStmtCtxId, 1n, 464347);
                let lite_loopTryIdx = (-1n);
                void lite_loopTryIdx;
                if (((((((lite_target) === ("ts"))) && (lite_currentLive))) && ((!(lite_currentStopped))))) {
                    lite_loopTryIdx = liteFn$frontend$itemsCount([...(lite_items)]);
                    lite_items.push({ kind: "LoopTransferTry", name: "", runtime: "", code: liteFn$lib$core$int$intText(lite_stmtLoopId), intValue: lite_stmtLoopId, textValue: liteFn$lib$core$int$intText(lite$subtractInt(0n, lite_stmtLoopId, 464710)) });
                }
                lite_loopIds.push(lite_stmtLoopId);
                lite_loopTryIndices.push(lite_loopTryIdx);
                lite_stmtCtxs.push({ id: lite_stmtLoopId, tag: "", kind: "loop", phase: "body", iifeDepth: 0n, valKind: "", valVar: "", label: "", iterLabel: "", countVar: "", itemVar: "", itemKind: "", indexVar: "", hasIndex: false });
                lite_savedStates.push({ returned: lite_currentReturned, stopped: lite_currentStopped, branchesReturned: lite_branchesReturned, branchesStopped: lite_branchesStopped, hasElse: lite_hasElse, loopForever: lite_loopForever, live: lite_currentLive, preLocalsLen: lite_loopPreLocalsLen, liveBranchCount: lite_liveBranchCount });
                lite_liveBranchCount = 0n;
                lite_currentLive = ((lite_currentLive) && ((!(lite_currentStopped))));
                lite_currentReturned = false;
                lite_currentStopped = false;
                lite_branchesReturned = true;
                lite_branchesStopped = true;
                lite_hasElse = false;
                lite_loopForever = ((((lite_sequenceCode) === (""))) && ((((((lite_conditionCode) === (""))) || (((lite_conditionCode) === ("true")))))));
                lite_blocks.push("loop");
                lite_blockCount = lite$addInt(lite_blockCount, 1n, 465937);
                lite_depth = lite$addInt(lite_depth, 1n, 465968);
                lite_position = liteFn$frontend$skipTrivia(lite_source, lite_position, lite_prefix);
                continue;
            }
            if (((lite_name) === ("mut"))) {
                const lite_localStart = liteFn$frontend$skipTrivia(lite_source, lite_position, lite_prefix);
                void lite_localStart;
                if (((((lite_localStart) >= (lite_size))) || ((!(liteFn$lib$core$text$isNameStart(liteFn$lib$core$text$at(lite_source, lite_localStart))))))) {
                    liteFn$frontend$failAt(lite_source, lite_localStart, lite_prefix, "expected local name after mut");
                }
                const lite_localEnd = liteFn$lib$core$text$skipName(lite_source, lite_localStart);
                void lite_localEnd;
                const lite_localName = liteFn$lib$core$text$slice(lite_source, lite_localStart, lite_localEnd);
                void lite_localName;
                if (liteFn$frontend$isReservedWord(lite_localName)) {
                    liteFn$frontend$unsupportedFeature(lite_source, lite_localStart, lite_localName, lite_prefix);
                }
                if (((((lite_depth) === (0n))) && (((lite_blockCount) === (0n))))) {
                    const lite_rootIndex = liteFn$frontend$localIndex([...(lite_locals)], lite_localName);
                    void lite_rootIndex;
                    if (((((lite_rootIndex) >= (0n))) && ((((lite$listAt((lite_locals), lite_rootIndex, 466740)).depth) === (0n))))) {
                        liteFn$frontend$failAt(lite_source, lite_localStart, lite_prefix, (("duplicate top-level value ") + (lite_localName)));
                    }
                }
                const lite_afterName = liteFn$frontend$skipTrivia(lite_source, lite_localEnd, lite_prefix);
                void lite_afterName;
                if ((!(liteFn$lib$core$text$startsWithAt(lite_source, lite_afterName, ":=")))) {
                    liteFn$frontend$failAt(lite_source, lite_afterName, lite_prefix, (("expected := after mut local name ") + (lite_localName)));
                }
                const lite_parsed = liteFn$frontend$parseInitializerExpression(lite_target, lite_source, liteFn$frontend$skipTrivia(lite_source, lite$addInt(lite_afterName, 2n, 467232), lite_prefix), lite_prefix, [...(lite_locals)], [...(lite_functions)], [...(lite_functionParams)], lite_currentName, "", [...(lite_stmtCtxs)]);
                void lite_parsed;
                if ((!(liteFn$frontend$isListKind((lite_parsed).kind)))) {
                    liteFn$frontend$failAt(lite_source, lite_localStart, lite_prefix, (("mut requires a List value, got ") + (liteFn$frontend$displayKind((lite_parsed).kind))));
                }
                const lite_statementNext = liteFn$frontend$consumeStatementEnd(lite_source, (lite_parsed).next, lite_prefix);
                void lite_statementNext;
                if (((lite_statementNext) < (0n))) {
                    liteFn$frontend$failAt(lite_source, liteFn$frontend$skipTrivia(lite_source, (lite_parsed).next, lite_prefix), lite_prefix, (("expected ; after local declaration ") + (lite_localName)));
                }
                lite_position = lite_statementNext;
                const lite_runtime = liteFn$frontend$localRuntimeName(lite_target, [...(lite_locals)], lite_localName, lite_moduleKey, lite_depth);
                void lite_runtime;
                lite_locals.push({ name: lite_localName, runtime: lite_runtime, kind: (lite_parsed).kind, mutable: false, writable: true, depth: lite_depth, constant: false, code: (lite_parsed).code, intValue: (lite_parsed).intValue, textValue: (lite_parsed).textValue, initState: "init" });
                if (((lite_currentLive) && ((!(lite_currentStopped))))) {
                    lite_items.push({ kind: (("Local") + (liteFn$frontend$storageKind((lite_parsed).kind))), name: lite_localName, runtime: lite_runtime, code: liteFn$frontend$copiedValueCode(lite_target, (lite_parsed).kind, (lite_parsed).code), intValue: (lite_parsed).intValue, textValue: liteFn$frontend$itemTextPayload(lite_parsed) });
                }
                continue;
            }
            if (((lite_name) === ("var"))) {
                lite_position = liteFn$frontend$skipTrivia(lite_source, lite_position, lite_prefix);
                let lite_declaredWritable = false;
                void lite_declaredWritable;
                if (liteFn$lib$core$text$wordAt(lite_source, lite_position, "mut")) {
                    lite_declaredWritable = true;
                    lite_position = liteFn$frontend$skipTrivia(lite_source, lite$addInt(lite_position, 3n, 468764), lite_prefix);
                }
                if (((((lite_position) >= (lite_size))) || ((!(liteFn$lib$core$text$isNameStart(liteFn$lib$core$text$at(lite_source, lite_position))))))) {
                    liteFn$frontend$failAt(lite_source, lite_position, lite_prefix, "expected local name after var");
                }
                const lite_localStart = lite_position;
                void lite_localStart;
                lite_position = liteFn$lib$core$text$skipName(lite_source, lite_position);
                const lite_localName = liteFn$lib$core$text$slice(lite_source, lite_localStart, lite_position);
                void lite_localName;
                if (liteFn$frontend$isReservedWord(lite_localName)) {
                    liteFn$frontend$unsupportedFeature(lite_source, lite_localStart, lite_localName, lite_prefix);
                }
                if (((((lite_depth) === (0n))) && (((lite_blockCount) === (0n))))) {
                    const lite_rootIndex = liteFn$frontend$localIndex([...(lite_locals)], lite_localName);
                    void lite_rootIndex;
                    if (((((lite_rootIndex) >= (0n))) && ((((lite$listAt((lite_locals), lite_rootIndex, 469402)).depth) === (0n))))) {
                        liteFn$frontend$failAt(lite_source, lite_localStart, lite_prefix, (("duplicate top-level value ") + (lite_localName)));
                    }
                }
                lite_position = liteFn$frontend$skipTrivia(lite_source, lite_position, lite_prefix);
                let lite_parsed = liteFn$frontend$intParsed("", 0n, true, lite_position);
                void lite_parsed;
                let lite_declInitState = "init";
                void lite_declInitState;
                let lite_rhsDiverged = false;
                void lite_rhsDiverged;
                if (liteFn$lib$core$text$startsWithAt(lite_source, lite_position, ":=")) {
                    lite_position = liteFn$frontend$skipTrivia(lite_source, lite$addInt(lite_position, 2n, 469873), lite_prefix);
                    lite_parsed = liteFn$frontend$parseInitializerExpression(lite_target, lite_source, lite_position, lite_prefix, [...(lite_locals)], [...(lite_functions)], [...(lite_functionParams)], lite_currentName, "", [...(lite_stmtCtxs)]);
                    liteFn$frontend$rejectNonValueBinding(lite_source, lite_localStart, lite_prefix, (lite_parsed).kind, lite_localName);
                    if (((lite_declaredWritable) && ((!(liteFn$frontend$isListKind((lite_parsed).kind)))))) {
                        liteFn$frontend$failAt(lite_source, lite_localStart, lite_prefix, (("mut requires a List value, got ") + (liteFn$frontend$displayKind((lite_parsed).kind))));
                    }
                } else if (((((lite_position) < (lite_size))) && (((liteFn$lib$core$text$at(lite_source, lite_position)) === (":"))))) {
                    if (lite_declaredWritable) {
                        liteFn$frontend$failAt(lite_source, lite_localStart, lite_prefix, "var mut cannot be combined with explicit type annotation");
                    }
                    const lite_typed = liteFn$frontend$parseLocalType(lite_source, lite$addInt(lite_position, 1n, 470606), lite_prefix, [...(lite_aliases)]);
                    void lite_typed;
                    lite_declaredWritable = (lite_typed).writable;
                    lite_position = liteFn$frontend$skipTrivia(lite_source, (lite_typed).next, lite_prefix);
                    if (liteFn$frontend$isSingleEquals(lite_source, lite_position)) {
                        const lite_rhsStart = liteFn$frontend$skipTrivia(lite_source, lite$addInt(lite_position, 1n, 470861), lite_prefix);
                        void lite_rhsStart;
                        const lite_reservedEnd = liteFn$frontend$isReservedInitMarker(lite_source, lite_rhsStart, lite_prefix);
                        void lite_reservedEnd;
                        const lite_zeroEnd = liteFn$frontend$isZeroInitLiteral(lite_source, lite_rhsStart, lite_prefix);
                        void lite_zeroEnd;
                        if (((lite_reservedEnd) >= (0n))) {
                            if (liteFn$frontend$isListKind((lite_typed).kind)) {
                                liteFn$frontend$failAt(lite_source, lite_localStart, lite_prefix, "reserved storage is not supported for List");
                            }
                            lite_declInitState = "uninit";
                            lite_parsed = liteFn$frontend$zeroParsed(lite_target, (lite_typed).kind, lite_reservedEnd);
                        } else if (((((lite_zeroEnd) >= (0n))) && ((!(liteFn$numeric__literals$isNumericKind((lite_typed).kind)))))) {
                            lite_parsed = liteFn$frontend$zeroParsed(lite_target, (lite_typed).kind, lite_zeroEnd);
                        } else {
                            lite_parsed = liteFn$frontend$parseInitializerExpression(lite_target, lite_source, lite_rhsStart, lite_prefix, [...(lite_locals)], [...(lite_functions)], [...(lite_functionParams)], lite_currentName, (lite_typed).kind, [...(lite_stmtCtxs)]);
                            if ((!(liteFn$frontend$isCompatibleKind((lite_typed).kind, (lite_parsed).kind)))) {
                                liteFn$frontend$failAt(lite_source, lite_localStart, lite_prefix, (((((("cannot initialize ") + (liteFn$frontend$displayKind((lite_typed).kind)))) + (" with "))) + (liteFn$frontend$displayKind((lite_parsed).kind))));
                            }
                            lite_rhsDiverged = (((lite_parsed).kind) === ("Never"));
                            const lite_converted = liteFn$frontend$assignValueCode(lite_target, (lite_typed).kind, (lite_parsed).kind, (lite_parsed).code);
                            void lite_converted;
                            lite_parsed = { kind: (lite_typed).kind, code: lite_converted, intValue: (lite_parsed).intValue, textValue: (lite_parsed).textValue, constant: (lite_parsed).constant, next: (lite_parsed).next };
                        }
                    } else {
                        lite_parsed = liteFn$frontend$zeroParsed(lite_target, (lite_typed).kind, lite_position);
                    }
                } else {
                    liteFn$frontend$failAt(lite_source, lite_position, lite_prefix, (("expected := or : after local name ") + (lite_localName)));
                }
                const lite_statementNext = liteFn$frontend$consumeStatementEnd(lite_source, (lite_parsed).next, lite_prefix);
                void lite_statementNext;
                if (((lite_statementNext) < (0n))) {
                    liteFn$frontend$failAt(lite_source, liteFn$frontend$skipTrivia(lite_source, (lite_parsed).next, lite_prefix), lite_prefix, (("expected ; after local declaration ") + (lite_localName)));
                }
                lite_position = lite_statementNext;
                const lite_runtime = liteFn$frontend$localRuntimeName(lite_target, [...(lite_locals)], lite_localName, lite_moduleKey, lite_depth);
                void lite_runtime;
                lite_locals.push({ name: lite_localName, runtime: lite_runtime, kind: (lite_parsed).kind, mutable: true, writable: lite_declaredWritable, depth: lite_depth, constant: false, code: (lite_parsed).code, intValue: (lite_parsed).intValue, textValue: (lite_parsed).textValue, initState: lite_declInitState });
                if (((lite_currentLive) && ((!(lite_currentStopped))))) {
                    if (lite_rhsDiverged) {
                        lite_items.push({ kind: liteFn$frontend$expressionStatementKind("Never", false, "Call", lite_currentResult), name: "", runtime: "", code: (lite_parsed).code, intValue: 0n, textValue: "" });
                    } else {
                        lite_items.push({ kind: (("Var") + (liteFn$frontend$storageKind((lite_parsed).kind))), name: lite_localName, runtime: lite_runtime, code: liteFn$frontend$copiedValueCode(lite_target, (lite_parsed).kind, (lite_parsed).code), intValue: (lite_parsed).intValue, textValue: liteFn$frontend$itemTextPayload(lite_parsed) });
                    }
                }
                if (lite_rhsDiverged) {
                    if ((!(lite_currentStopped))) {
                        lite_currentReturned = true;
                    }
                    lite_currentStopped = true;
                }
                continue;
            }
            if (((lite_name) === ("else"))) {
                liteFn$frontend$failAt(lite_source, lite_nameStart, lite_prefix, "unexpected else");
            }
            if (liteFn$frontend$isReservedWord(lite_name)) {
                liteFn$frontend$unsupportedFeature(lite_source, lite_nameStart, lite_name, lite_prefix);
            }
            if (((liteFn$lib$core$text$startsWithAt(lite_source, lite_position, ":=")) && (liteFn$lib$core$text$wordAt(lite_source, lite_afterDefinition, "type")))) {
                if (((((lite_blockCount) !== (0n))) || (((lite_depth) !== (0n))))) {
                    liteFn$frontend$failAt(lite_source, lite_nameStart, lite_prefix, "type aliases are only allowed at top level");
                }
                let lite_earlierAlias = false;
                void lite_earlierAlias;
                for (const lite_alias of [...(lite_aliases)]) {
                    void lite_alias;
                    if ((((((lite_alias).name) === (lite_name))) && ((((lite_alias).at) < (lite_nameStart))))) {
                        lite_earlierAlias = true;
                    }
                }
                if (lite_earlierAlias) {
                    liteFn$frontend$failAt(lite_source, lite_nameStart, lite_prefix, (("duplicate type alias ") + (lite_name)));
                }
                const lite_typePosition = liteFn$frontend$skipTrivia(lite_source, lite$addInt(lite_position, 2n, 474871), lite_prefix);
                void lite_typePosition;
                const lite_targetStart = liteFn$frontend$skipTrivia(lite_source, lite$addInt(lite_typePosition, 4n, 474944), lite_prefix);
                void lite_targetStart;
                const lite_aliasIndex = liteFn$frontend$aliasIndexAt([...(lite_aliases)], lite_nameStart);
                void lite_aliasIndex;
                if (((lite_aliasIndex) < (0n))) {
                    liteFn$frontend$unsupportedAliasTarget(lite_source, lite_targetStart, lite_prefix, "target");
                }
                const lite_aliasEntry = lite$listAt((lite_aliases), lite_aliasIndex, 475177);
                void lite_aliasEntry;
                if ((((lite_aliasEntry).target) === (""))) {
                    liteFn$frontend$unsupportedAliasTarget(lite_source, lite_targetStart, lite_prefix, "target");
                }
                const lite_seenAliases: string[] = [...([])];
                void lite_seenAliases;
                const lite_resolvedType = liteFn$frontend$resolveTypeText(lite_source, lite_targetStart, lite_prefix, [...(lite_aliases)], (lite_aliasEntry).target, [...(lite_seenAliases)]);
                void lite_resolvedType;
                if (liteFn$lib$core$list$listContainsText([...(lite_publishedTypes)], lite_name)) {
                    lite_items.push({ kind: "PublicType", name: lite_name, runtime: "", code: lite_resolvedType, intValue: 0n, textValue: "" });
                }
                const lite_afterTarget = liteFn$frontend$consumeStatementEnd(lite_source, (lite_aliasEntry).end, lite_prefix);
                void lite_afterTarget;
                if (((lite_afterTarget) < (0n))) {
                    liteFn$frontend$unsupportedAliasTarget(lite_source, (lite_aliasEntry).at, lite_prefix, "target");
                }
                lite_position = lite_afterTarget;
                continue;
            }
            if (liteFn$lib$core$text$startsWithAt(lite_source, lite_position, ":=")) {
                const lite_afterDeclare = liteFn$frontend$skipTrivia(lite_source, lite$addInt(lite_position, 2n, 476093), lite_prefix);
                void lite_afterDeclare;
                if (liteFn$lib$core$text$wordAt(lite_source, lite_afterDeclare, "fn")) {
                    if (((((lite_blockCount) !== (0n))) || (((lite_depth) !== (0n))))) {
                        liteFn$frontend$failAt(lite_source, lite_nameStart, lite_prefix, "function definitions are only allowed at top level");
                    }
                    if (((liteFn$frontend$findFunction([...(lite_functions)], lite_name)) >= (0n))) {
                        liteFn$frontend$failAt(lite_source, lite_nameStart, lite_prefix, (("duplicate function ") + (lite_name)));
                    }
                    const lite_rootIndex = liteFn$frontend$localIndex([...(lite_locals)], lite_name);
                    void lite_rootIndex;
                    if (((((lite_rootIndex) >= (0n))) && ((((lite$listAt((lite_locals), lite_rootIndex, 476606)).depth) === (0n))))) {
                        liteFn$frontend$failAt(lite_source, lite_nameStart, lite_prefix, (("duplicate top-level value ") + (lite_name)));
                    }
                    lite_position = liteFn$frontend$skipTrivia(lite_source, lite$addInt(lite_afterDeclare, 2n, 476799), lite_prefix);
                    const lite_listIntrinsic = ((((lite_moduleIdentity) === ("lite.core.list.v1"))) && ((((((((((lite_name) === ("pushBack"))) || (((lite_name) === ("popBack"))))) || (((lite_name) === ("pushFront"))))) || (((lite_name) === ("popFront")))))));
                    void lite_listIntrinsic;
                    const lite_header = liteFn$frontend$parseFunctionHeader(lite_source, lite_position, lite_prefix, [...(lite_aliases)], lite_listIntrinsic);
                    void lite_header;
                    lite_position = liteFn$frontend$skipTrivia(lite_source, (lite_header).next, lite_prefix);
                    liteFn$frontend$rejectMisplacedTag(lite_source, lite_position, lite_prefix, "unexpected block tag in function header");
                    if (((((lite_position) < (lite_size))) && (((liteFn$lib$core$text$at(lite_source, lite_position)) === (";"))))) {
                        const lite_hostRuntime = liteFn$frontend$coreHostFunction(lite_moduleIdentity, lite_name, (lite_header).params, (lite_header).result);
                        void lite_hostRuntime;
                        if ((((!(liteFn$lib$core$list$listContainsText([...(lite_publishedFunctions)], lite_name)))) || (((lite_hostRuntime) === (""))))) {
                            liteFn$frontend$failAt(lite_source, lite_nameStart, lite_prefix, "bodyless function declaration has no matching core host binding");
                        }
                        lite_position = liteFn$frontend$skipTrivia(lite_source, lite$addInt(lite_position, 1n, 477736), lite_prefix);
                        lite_functions.push({ name: lite_name, runtime: lite_hostRuntime, result: (lite_header).result, first: lite_parameterTotal, count: (lite_header).count });
                        if (lite_currentLive) {
                            lite_items.push({ kind: "PublicFunction", name: lite_name, runtime: lite_hostRuntime, code: (lite_header).result, intValue: (lite_header).count, textValue: (lite_header).params });
                        }
                        continue;
                    }
                    if ((((lite_header).count) < (0n))) {
                        liteFn$frontend$failAt(lite_source, lite_nameStart, lite_prefix, "variadic parameters are reserved for registered core host declarations");
                    }
                    if ((((lite_header).genericType) !== (""))) {
                        liteFn$frontend$failAt(lite_source, lite_nameStart, lite_prefix, "generic function bodies are not supported");
                    }
                    lite_position = liteFn$frontend$expectSymbol(lite_source, lite_position, "{", lite_prefix);
                    const lite_functionRuntime = liteFn$frontend$moduleFunctionRuntime(lite_target, lite_moduleKey, lite_name);
                    void lite_functionRuntime;
                    lite_functions.push({ name: lite_name, runtime: lite_functionRuntime, result: (lite_header).result, first: lite_parameterTotal, count: (lite_header).count });
                    if (liteFn$lib$core$list$listContainsText([...(lite_publishedFunctions)], lite_name)) {
                        lite_items.push({ kind: "PublicFunction", name: lite_name, runtime: lite_functionRuntime, code: (lite_header).result, intValue: (lite_header).count, textValue: (lite_header).params });
                    }
                    if (((lite_currentLive) && ((!(lite_currentStopped))))) {
                        lite_items.push({ kind: "FunctionStart", name: lite_name, runtime: lite_functionRuntime, code: (lite_header).result, intValue: (lite_header).count, textValue: (lite_header).params });
                    }
                    lite_fnTryIndex = (-1n);
                    if (((((((lite_target) === ("ts"))) && (lite_currentLive))) && ((!(lite_currentStopped))))) {
                        lite_fnTryIndex = liteFn$frontend$itemsCount([...(lite_items)]);
                        lite_items.push({ kind: "TransferTry", name: "", runtime: "", code: "", intValue: 0n, textValue: "" });
                    }
                    lite_stmtCtxs.push({ id: 0n, tag: "", kind: "fn", phase: "body", iifeDepth: 0n, valKind: (lite_header).result, valVar: "", label: "", iterLabel: "", countVar: "", itemVar: "", itemKind: "", indexVar: "", hasIndex: false });
                    let lite_entryStart = 0n;
                    void lite_entryStart;
                    let lite_entryIndex = 0n;
                    void lite_entryIndex;
                    for (const lite_future of [...(lite_futureValues)]) {
                        void lite_future;
                        if ((((lite_future).at) > (lite_nameStart))) {
                            lite_locals.push({ name: (lite_future).name, runtime: (lite_future).runtime, kind: (lite_future).kind, mutable: false, writable: false, depth: (-1n), constant: false, code: (lite_future).runtime, intValue: 0n, textValue: "", initState: "init" });
                        }
                    }
                    while (((lite_entryIndex) < ((lite_header).count))) {
                        const lite_separator = liteFn$lib$core$text$indexOfText((lite_header).params, "|", lite_entryStart);
                        void lite_separator;
                        let lite_entryEnd = liteFn$lib$core$text$length((lite_header).params);
                        void lite_entryEnd;
                        if (((lite_separator) >= (0n))) {
                            lite_entryEnd = lite_separator;
                        }
                        const lite_entry = liteFn$lib$core$text$slice((lite_header).params, lite_entryStart, lite_entryEnd);
                        void lite_entry;
                        const lite_parameterName = liteFn$frontend$paramNameOf(lite_entry);
                        void lite_parameterName;
                        const lite_parameterKind = liteFn$frontend$paramKindOf(lite_entry);
                        void lite_parameterKind;
                        const lite_runtime = (("lite_") + (lite_parameterName));
                        void lite_runtime;
                        lite_functionParams.push(lite_entry);
                        lite_locals.push({ name: lite_parameterName, runtime: lite_runtime, kind: lite_parameterKind, mutable: false, writable: false, depth: 1n, constant: false, code: lite_runtime, intValue: 0n, textValue: "", initState: "init" });
                        lite_parameterTotal = lite$addInt(lite_parameterTotal, 1n, 481559);
                        lite_entryStart = lite$addInt(lite_entryEnd, 1n, 481606);
                        lite_entryIndex = lite$addInt(lite_entryIndex, 1n, 481655);
                    }
                    lite_currentName = lite_name;
                    lite_currentResult = (lite_header).result;
                    lite_savedStates.push({ returned: lite_currentReturned, stopped: lite_currentStopped, branchesReturned: lite_branchesReturned, branchesStopped: lite_branchesStopped, hasElse: lite_hasElse, loopForever: lite_loopForever, live: lite_currentLive, preLocalsLen: liteFn$frontend$localsCount([...(lite_locals)]), liveBranchCount: lite_liveBranchCount });
                    lite_liveBranchCount = 0n;
                    lite_currentLive = ((lite_currentLive) && ((!(lite_currentStopped))));
                    lite_currentReturned = false;
                    lite_currentStopped = false;
                    lite_branchesReturned = true;
                    lite_branchesStopped = true;
                    lite_hasElse = false;
                    lite_loopForever = false;
                    lite_blocks.push("function");
                    lite_blockCount = lite$addInt(lite_blockCount, 1n, 482550);
                    lite_depth = lite$addInt(lite_depth, 1n, 482585);
                    lite_position = liteFn$frontend$skipTrivia(lite_source, lite_position, lite_prefix);
                    continue;
                }
                if (((((lite_depth) === (0n))) && (((lite_blockCount) === (0n))))) {
                    const lite_rootIndex = liteFn$frontend$localIndex([...(lite_locals)], lite_name);
                    void lite_rootIndex;
                    if (((((lite_rootIndex) >= (0n))) && ((((lite$listAt((lite_locals), lite_rootIndex, 482843)).depth) === (0n))))) {
                        liteFn$frontend$failAt(lite_source, lite_nameStart, lite_prefix, (("duplicate top-level value ") + (lite_name)));
                    }
                }
                lite_position = lite_afterDeclare;
                const lite_parsed = liteFn$frontend$parseInitializerExpression(lite_target, lite_source, lite_position, lite_prefix, [...(lite_locals)], [...(lite_functions)], [...(lite_functionParams)], lite_currentName, "", [...(lite_stmtCtxs)]);
                void lite_parsed;
                liteFn$frontend$rejectNonValueBinding(lite_source, lite_nameStart, lite_prefix, (lite_parsed).kind, lite_name);
                const lite_statementNext = liteFn$frontend$consumeStatementEnd(lite_source, (lite_parsed).next, lite_prefix);
                void lite_statementNext;
                if (((lite_statementNext) < (0n))) {
                    liteFn$frontend$failAt(lite_source, liteFn$frontend$skipTrivia(lite_source, (lite_parsed).next, lite_prefix), lite_prefix, (("expected ; after local declaration ") + (lite_name)));
                }
                lite_position = lite_statementNext;
                const lite_runtime = liteFn$frontend$localRuntimeName(lite_target, [...(lite_locals)], lite_name, lite_moduleKey, lite_depth);
                void lite_runtime;
                lite_locals.push({ name: lite_name, runtime: lite_runtime, kind: (lite_parsed).kind, mutable: false, writable: false, depth: lite_depth, constant: (lite_parsed).constant, code: (lite_parsed).code, intValue: (lite_parsed).intValue, textValue: (lite_parsed).textValue, initState: "init" });
                if (((((((lite_depth) === (0n))) && (((lite_blockCount) === (0n))))) && (liteFn$lib$core$list$listContainsText([...(lite_publishedValues)], lite_name)))) {
                    lite_items.push({ kind: "PublicValue", name: lite_name, runtime: lite_runtime, code: (lite_parsed).kind, intValue: 0n, textValue: "" });
                }
                if (((lite_currentLive) && ((!(lite_currentStopped))))) {
                    lite_items.push({ kind: (("Local") + (liteFn$frontend$storageKind((lite_parsed).kind))), name: lite_name, runtime: lite_runtime, code: liteFn$frontend$copiedValueCode(lite_target, (lite_parsed).kind, (lite_parsed).code), intValue: (lite_parsed).intValue, textValue: liteFn$frontend$itemTextPayload(lite_parsed) });
                }
                continue;
            }
            if (((((((lite_position) < (lite_size))) && (((liteFn$lib$core$text$at(lite_source, lite_position)) === (":"))))) && ((((liteFn$frontend$compoundAssignOp(lite_source, lite_position)).width) === (0n))))) {
                if (((((lite_depth) === (0n))) && (((lite_blockCount) === (0n))))) {
                    const lite_rootIndex = liteFn$frontend$localIndex([...(lite_locals)], lite_name);
                    void lite_rootIndex;
                    if (((((lite_rootIndex) >= (0n))) && ((((lite$listAt((lite_locals), lite_rootIndex, 484788)).depth) === (0n))))) {
                        liteFn$frontend$failAt(lite_source, lite_nameStart, lite_prefix, (("duplicate top-level value ") + (lite_name)));
                    }
                }
                const lite_typed = liteFn$frontend$parseLocalType(lite_source, lite$addInt(lite_position, 1n, 484989), lite_prefix, [...(lite_aliases)]);
                void lite_typed;
                lite_position = liteFn$frontend$skipTrivia(lite_source, (lite_typed).next, lite_prefix);
                let lite_parsed = liteFn$frontend$zeroParsed(lite_target, (lite_typed).kind, lite_position);
                void lite_parsed;
                let lite_declInitState = "init";
                void lite_declInitState;
                if (liteFn$frontend$isSingleEquals(lite_source, lite_position)) {
                    const lite_rhsStart = liteFn$frontend$skipTrivia(lite_source, lite$addInt(lite_position, 1n, 485290), lite_prefix);
                    void lite_rhsStart;
                    const lite_reservedEnd = liteFn$frontend$isReservedInitMarker(lite_source, lite_rhsStart, lite_prefix);
                    void lite_reservedEnd;
                    const lite_zeroEnd = liteFn$frontend$isZeroInitLiteral(lite_source, lite_rhsStart, lite_prefix);
                    void lite_zeroEnd;
                    if (((lite_reservedEnd) >= (0n))) {
                        if (liteFn$frontend$isListKind((lite_typed).kind)) {
                            liteFn$frontend$failAt(lite_source, lite_nameStart, lite_prefix, "reserved storage is not supported for List");
                        }
                        lite_declInitState = "uninit";
                        lite_parsed = liteFn$frontend$zeroParsed(lite_target, (lite_typed).kind, lite_reservedEnd);
                    } else if (((((lite_zeroEnd) >= (0n))) && ((!(liteFn$numeric__literals$isNumericKind((lite_typed).kind)))))) {
                        lite_parsed = liteFn$frontend$zeroParsed(lite_target, (lite_typed).kind, lite_zeroEnd);
                    } else {
                        lite_parsed = liteFn$frontend$parseInitializerExpression(lite_target, lite_source, lite_rhsStart, lite_prefix, [...(lite_locals)], [...(lite_functions)], [...(lite_functionParams)], lite_currentName, (lite_typed).kind, [...(lite_stmtCtxs)]);
                        if ((!(liteFn$frontend$isCompatibleKind((lite_typed).kind, (lite_parsed).kind)))) {
                            liteFn$frontend$failAt(lite_source, lite_nameStart, lite_prefix, (((((("cannot initialize ") + (liteFn$frontend$displayKind((lite_typed).kind)))) + (" with "))) + (liteFn$frontend$displayKind((lite_parsed).kind))));
                        }
                    }
                }
                const lite_statementNext = liteFn$frontend$consumeStatementEnd(lite_source, (lite_parsed).next, lite_prefix);
                void lite_statementNext;
                if (((lite_statementNext) < (0n))) {
                    liteFn$frontend$failAt(lite_source, liteFn$frontend$skipTrivia(lite_source, (lite_parsed).next, lite_prefix), lite_prefix, (("expected ; after local declaration ") + (lite_name)));
                }
                lite_position = lite_statementNext;
                const lite_runtime = liteFn$frontend$localRuntimeName(lite_target, [...(lite_locals)], lite_name, lite_moduleKey, lite_depth);
                void lite_runtime;
                const lite_rhsDiverged = (((lite_parsed).kind) === ("Never"));
                void lite_rhsDiverged;
                const lite_assignedCode = liteFn$frontend$assignValueCode(lite_target, (lite_typed).kind, (lite_parsed).kind, (lite_parsed).code);
                void lite_assignedCode;
                lite_locals.push({ name: lite_name, runtime: lite_runtime, kind: (lite_typed).kind, mutable: false, writable: (lite_typed).writable, depth: lite_depth, constant: (Boolean(((((lite_declInitState) === ("init"))) && ((!(liteFn$numeric__literals$isFloatKind((lite_typed).kind)))))) ? (lite_parsed).constant : false), code: lite_assignedCode, intValue: (lite_parsed).intValue, textValue: (lite_parsed).textValue, initState: lite_declInitState });
                const lite_declItemPrefix = (Boolean(((lite_declInitState) === ("init"))) ? "Local" : "Var");
                void lite_declItemPrefix;
                if (((lite_currentLive) && ((!(lite_currentStopped))))) {
                    if (lite_rhsDiverged) {
                        lite_items.push({ kind: liteFn$frontend$expressionStatementKind("Never", false, "Call", lite_currentResult), name: "", runtime: "", code: lite_assignedCode, intValue: 0n, textValue: "" });
                    } else {
                        lite_items.push({ kind: ((lite_declItemPrefix) + (liteFn$frontend$storageKind((lite_typed).kind))), name: lite_name, runtime: lite_runtime, code: lite_assignedCode, intValue: (lite_parsed).intValue, textValue: liteFn$frontend$itemTextPayload(lite_parsed) });
                    }
                }
                if (lite_rhsDiverged) {
                    if ((!(lite_currentStopped))) {
                        lite_currentReturned = true;
                    }
                    lite_currentStopped = true;
                }
                continue;
            }
            if (liteFn$frontend$isSingleEquals(lite_source, lite_position)) {
                const lite_index = liteFn$frontend$localIndex([...(lite_locals)], lite_name);
                void lite_index;
                if (((lite_index) < (0n))) {
                    liteFn$frontend$failAt(lite_source, lite_nameStart, lite_prefix, (("unknown value ") + (lite_name)));
                }
                const lite_entry = lite$listAt((lite_locals), lite_index, 488356);
                void lite_entry;
                if ((((((lite_entry).initState) === ("init"))) && ((!((lite_entry).mutable))))) {
                    liteFn$frontend$failAt(lite_source, lite_nameStart, lite_prefix, (("cannot assign to immutable local ") + (lite_name)));
                }
                if ((((((lite_entry).initState) === ("maybe"))) && ((!((lite_entry).mutable))))) {
                    liteFn$frontend$failAt(lite_source, lite_nameStart, lite_prefix, (("cannot assign to possibly initialized immutable local ") + (lite_name)));
                }
                lite_position = liteFn$frontend$skipTrivia(lite_source, lite$addInt(lite_position, 1n, 488785), lite_prefix);
                const lite_partialItems: { kind: string; name: string; runtime: string; code: string; intValue: bigint; textValue: string }[] = [...(liteFn$frontend$parsePartialAssignIf(lite_target, lite_source, lite_position, lite_prefix, [...(lite_locals)], [...(lite_functions)], [...(lite_functionParams)], lite_currentName, lite_nameStart, (lite_entry).kind, lite_name, (lite_entry).runtime, [...(lite_stmtCtxs)]))];
                void lite_partialItems;
                let lite_partialCount = 0n;
                void lite_partialCount;
                for (const lite_partialItem of [...(lite_partialItems)]) {
                    void lite_partialItem;
                    lite_partialCount = lite$addInt(lite_partialCount, 1n, 489111);
                    if ((((lite_partialItem).kind) === ("End"))) {
                        lite_position = (lite_partialItem).intValue;
                    } else if (((lite_currentLive) && ((!(lite_currentStopped))))) {
                        lite_items.push(lite_partialItem);
                    }
                }
                if (((lite_partialCount) > (0n))) {
                    lite_locals.push({ name: (lite_entry).name, runtime: (lite_entry).runtime, kind: (lite_entry).kind, mutable: (lite_entry).mutable, writable: (lite_entry).writable, depth: (lite_entry).depth, constant: false, code: (lite_entry).runtime, intValue: 0n, textValue: "", initState: "init" });
                    continue;
                }
                const lite_parsed = liteFn$frontend$parseExpressionAsCtx(lite_target, lite_source, lite_position, lite_prefix, [...(lite_locals)], [...(lite_functions)], [...(lite_functionParams)], lite_currentName, (lite_entry).kind, [...(lite_stmtCtxs)]);
                void lite_parsed;
                if ((!(liteFn$frontend$isCompatibleKind((lite_entry).kind, (lite_parsed).kind)))) {
                    liteFn$frontend$failAt(lite_source, lite_nameStart, lite_prefix, (((((((((("cannot assign ") + (liteFn$frontend$displayKind((lite_parsed).kind)))) + (" to "))) + (liteFn$frontend$displayKind((lite_entry).kind)))) + (" local "))) + (lite_name)));
                }
                const lite_statementNext = liteFn$frontend$consumeStatementEnd(lite_source, (lite_parsed).next, lite_prefix);
                void lite_statementNext;
                if (((lite_statementNext) < (0n))) {
                    liteFn$frontend$failAt(lite_source, liteFn$frontend$skipTrivia(lite_source, (lite_parsed).next, lite_prefix), lite_prefix, (("expected ; after assignment to ") + (lite_name)));
                }
                lite_position = lite_statementNext;
                const lite_rhsDiverged = (((lite_parsed).kind) === ("Never"));
                void lite_rhsDiverged;
                const lite_assignedCode = liteFn$frontend$assignValueCode(lite_target, (lite_entry).kind, (lite_parsed).kind, (lite_parsed).code);
                void lite_assignedCode;
                lite_locals.push({ name: (lite_entry).name, runtime: (lite_entry).runtime, kind: (lite_entry).kind, mutable: (lite_entry).mutable, writable: (lite_entry).writable, depth: (lite_entry).depth, constant: false, code: lite_assignedCode, intValue: (lite_parsed).intValue, textValue: (lite_parsed).textValue, initState: "init" });
                if (((lite_currentLive) && ((!(lite_currentStopped))))) {
                    if (lite_rhsDiverged) {
                        lite_items.push({ kind: liteFn$frontend$expressionStatementKind("Never", false, "Call", lite_currentResult), name: "", runtime: "", code: lite_assignedCode, intValue: 0n, textValue: "" });
                    } else {
                        lite_items.push({ kind: (("Assign") + (liteFn$frontend$storageKind((lite_entry).kind))), name: lite_name, runtime: (lite_entry).runtime, code: lite_assignedCode, intValue: (lite_parsed).intValue, textValue: liteFn$frontend$itemTextPayload(lite_parsed) });
                    }
                }
                if (lite_rhsDiverged) {
                    if ((!(lite_currentStopped))) {
                        lite_currentReturned = true;
                    }
                    lite_currentStopped = true;
                }
                continue;
            }
            if ((((liteFn$frontend$compoundAssignOp(lite_source, lite_position)).width) > (0n))) {
                const lite_compound = liteFn$frontend$compoundAssignOp(lite_source, lite_position);
                void lite_compound;
                const lite_index = liteFn$frontend$localIndex([...(lite_locals)], lite_name);
                void lite_index;
                if (((lite_index) < (0n))) {
                    liteFn$frontend$failAt(lite_source, lite_nameStart, lite_prefix, (("unknown value ") + (lite_name)));
                }
                const lite_entry = lite$listAt((lite_locals), lite_index, 491964);
                void lite_entry;
                if ((((lite_entry).initState) !== ("init"))) {
                    liteFn$frontend$failAt(lite_source, lite_nameStart, lite_prefix, (("cannot read uninitialized local ") + (lite_name)));
                }
                if ((!((lite_entry).mutable))) {
                    liteFn$frontend$failAt(lite_source, lite_nameStart, lite_prefix, (("cannot assign to immutable local ") + (lite_name)));
                }
                const lite_opPos = lite_position;
                void lite_opPos;
                lite_position = liteFn$frontend$skipTrivia(lite_source, lite$addInt(lite_position, (lite_compound).width, 492350), lite_prefix);
                const lite_parsed = liteFn$frontend$parseExpressionAsCtx(lite_target, lite_source, lite_position, lite_prefix, [...(lite_locals)], [...(lite_functions)], [...(lite_functionParams)], lite_currentName, (lite_entry).kind, [...(lite_stmtCtxs)]);
                void lite_parsed;
                const lite_assignedCode = liteFn$frontend$compoundAssignCode(lite_target, lite_source, lite_opPos, lite_prefix, (lite_entry).kind, (lite_entry).runtime, (lite_compound).baseOp, lite_parsed);
                void lite_assignedCode;
                const lite_statementNext = liteFn$frontend$consumeStatementEnd(lite_source, (lite_parsed).next, lite_prefix);
                void lite_statementNext;
                if (((lite_statementNext) < (0n))) {
                    liteFn$frontend$failAt(lite_source, liteFn$frontend$skipTrivia(lite_source, (lite_parsed).next, lite_prefix), lite_prefix, (("expected ; after assignment to ") + (lite_name)));
                }
                lite_position = lite_statementNext;
                lite_locals.push({ name: (lite_entry).name, runtime: (lite_entry).runtime, kind: (lite_entry).kind, mutable: (lite_entry).mutable, writable: (lite_entry).writable, depth: (lite_entry).depth, constant: false, code: lite_assignedCode, intValue: 0n, textValue: "", initState: "init" });
                if (((lite_currentLive) && ((!(lite_currentStopped))))) {
                    lite_items.push({ kind: (("Assign") + (liteFn$frontend$storageKind((lite_entry).kind))), name: lite_name, runtime: (lite_entry).runtime, code: lite_assignedCode, intValue: 0n, textValue: "" });
                }
                continue;
            }
            const lite_expression = liteFn$frontend$parseExpressionItem(lite_target, lite_source, lite_nameStart, lite_prefix, [...(lite_locals)], [...(lite_functions)], [...(lite_functionParams)], lite_currentName, lite_currentResult, ((liteFn$frontend$atValueTail([...(lite_blocks)], lite_blockCount)) && ((!(lite_currentStopped)))), [...(lite_stmtCtxs)]);
            void lite_expression;
            if (((lite_currentLive) && ((!(lite_currentStopped))))) {
                lite_items.push({ kind: liteFn$frontend$expressionStatementKind((lite_expression).valueKind, (lite_expression).returned, "Discard", lite_currentResult), name: (lite_expression).valueKind, runtime: "", code: (lite_expression).code, intValue: 0n, textValue: "" });
            }
            if ((((lite_expression).returned) || ((((lite_expression).valueKind) === ("Never"))))) {
                if ((!(lite_currentStopped))) {
                    lite_currentReturned = true;
                }
                lite_currentStopped = true;
            }
            lite_position = (lite_expression).next;
        }
        if (((lite_blockCount) > (0n))) {
            liteFn$frontend$failAt(lite_source, lite_size, lite_prefix, "expected } before end of source");
        }
        if (lite_currentStopped) {
            lite_items.push({ kind: "MainStop", name: "", runtime: "", code: "", intValue: 0n, textValue: "" });
        }
        return [...(lite_items)];
    }
    void liteFn$frontend$parseProgramWithModule;
    function liteFn$frontend$parseProgramWithIdentity(lite_target: string, lite_source: string, lite_prefix: string, lite_exports: { kind: string; name: string; runtime: string; code: string; intValue: bigint; textValue: string }[], lite_moduleId: bigint, lite_moduleIdentity: string): { kind: string; name: string; runtime: string; code: string; intValue: bigint; textValue: string }[] {
        void lite_target;
        void lite_source;
        void lite_prefix;
        void lite_exports;
        void lite_moduleId;
        void lite_moduleIdentity;
        const lite_moduleKey = (Boolean(((lite_moduleId) === (0n))) ? "" : (("m") + (liteFn$lib$core$int$intText(lite_moduleId))));
        void lite_moduleKey;
        return [...(liteFn$frontend$parseProgramWithModule(lite_target, lite_source, lite_prefix, [...(lite_exports)], lite_moduleKey, lite_moduleIdentity))];
    }
    void liteFn$frontend$parseProgramWithIdentity;
    function liteFn$frontend$parseProgramWithExports(lite_target: string, lite_source: string, lite_prefix: string, lite_exports: { kind: string; name: string; runtime: string; code: string; intValue: bigint; textValue: string }[], lite_moduleId: bigint): { kind: string; name: string; runtime: string; code: string; intValue: bigint; textValue: string }[] {
        void lite_target;
        void lite_source;
        void lite_prefix;
        void lite_exports;
        void lite_moduleId;
        return [...(liteFn$frontend$parseProgramWithIdentity(lite_target, lite_source, lite_prefix, [...(lite_exports)], lite_moduleId, ""))];
    }
    void liteFn$frontend$parseProgramWithExports;
    function liteFn$frontend$parseProgram(lite_target: string, lite_source: string, lite_prefix: string): { kind: string; name: string; runtime: string; code: string; intValue: bigint; textValue: string }[] {
        void lite_target;
        void lite_source;
        void lite_prefix;
        return [...(liteFn$frontend$parseProgramWithModule(lite_target, lite_source, lite_prefix, [...([])], "", ""))];
    }
    void liteFn$frontend$parseProgram;
    function liteFn$frontend$lineStartCodes(lite_source: string): string {
        void lite_source;
        let lite_code = "0";
        void lite_code;
        let lite_position = 0n;
        void lite_position;
        while (((lite_position) < (liteFn$lib$core$text$length(lite_source)))) {
            if (((liteFn$lib$core$text$at(lite_source, lite_position)) === ("\n"))) {
                lite_code = ((((lite_code) + (", "))) + (liteFn$lib$core$int$intText(lite$addInt(lite_position, 1n, 495736))));
            }
            lite_position = lite$addInt(lite_position, 1n, 495772);
        }
        return lite_code;
    }
    void liteFn$frontend$lineStartCodes;
    function liteFn$emit__ts$dedent(lite_indent: string): string {
        void lite_indent;
        return liteFn$lib$core$text$slice(lite_indent, 0n, lite$subtractInt(liteFn$lib$core$text$length(lite_indent), 4n, 288));
    }
    void liteFn$emit__ts$dedent;
    function liteFn$emit__ts$tsTupleType(lite_kind: string): string {
        void lite_kind;
        return liteFn$frontend$tsTupleType(lite_kind);
    }
    void liteFn$emit__ts$tsTupleType;
    function liteFn$emit__ts$tsFunctionType(lite_kind: string): string {
        void lite_kind;
        return liteFn$frontend$tsFunctionType(lite_kind);
    }
    void liteFn$emit__ts$tsFunctionType;
    function liteFn$emit__ts$tsParameterList(lite_encoded: string): string {
        void lite_encoded;
        if (((lite_encoded) === (""))) {
            return "";
        }
        let lite_result = "";
        void lite_result;
        let lite_start = 0n;
        void lite_start;
        while (Boolean(true)) {
            const lite_separator = liteFn$lib$core$text$indexOfText(lite_encoded, "|", lite_start);
            void lite_separator;
            let lite_end = liteFn$lib$core$text$length(lite_encoded);
            void lite_end;
            if (((lite_separator) >= (0n))) {
                lite_end = lite_separator;
            }
            const lite_entry = liteFn$lib$core$text$slice(lite_encoded, lite_start, lite_end);
            void lite_entry;
            const lite_equals = liteFn$lib$core$text$indexOfText(lite_entry, "=", 0n);
            void lite_equals;
            const lite_parameterName = liteFn$lib$core$text$slice(lite_entry, 0n, lite_equals);
            void lite_parameterName;
            const lite_parameterKind = liteFn$lib$core$text$slice(lite_entry, lite$addInt(lite_equals, 1n, 1238), liteFn$lib$core$text$length(lite_entry));
            void lite_parameterKind;
            if (((liteFn$lib$core$text$length(lite_result)) > (0n))) {
                lite_result = ((lite_result) + (", "));
            }
            lite_result = ((((((((lite_result) + ("lite_"))) + (lite_parameterName))) + (": "))) + (liteFn$emit__ts$tsFunctionType(lite_parameterKind)));
            if (((lite_separator) < (0n))) {
                break;
            }
            lite_start = lite$addInt(lite_separator, 1n, 1485);
        }
        return lite_result;
    }
    void liteFn$emit__ts$tsParameterList;
    function liteFn$emit__ts$reportParameterReads(lite_encoded: string, lite_indent: string): void {
        void lite_encoded;
        void lite_indent;
        if (((lite_encoded) === (""))) {
            return;
        }
        let lite_start = 0n;
        void lite_start;
        while (Boolean(true)) {
            const lite_separator = liteFn$lib$core$text$indexOfText(lite_encoded, "|", lite_start);
            void lite_separator;
            let lite_end = liteFn$lib$core$text$length(lite_encoded);
            void lite_end;
            if (((lite_separator) >= (0n))) {
                lite_end = lite_separator;
            }
            const lite_entry = liteFn$lib$core$text$slice(lite_encoded, lite_start, lite_end);
            void lite_entry;
            const lite_equals = liteFn$lib$core$text$indexOfText(lite_entry, "=", 0n);
            void lite_equals;
            lite$emit(((((((lite_indent) + ("void lite_"))) + (liteFn$lib$core$text$slice(lite_entry, 0n, lite_equals)))) + (";")) + "\n");
            if (((lite_separator) < (0n))) {
                break;
            }
            lite_start = lite$addInt(lite_separator, 1n, 2168);
        }
    }
    void liteFn$emit__ts$reportParameterReads;
    function liteFn$emit__ts$displayValueCode(lite_kind: string, lite_code: string): string {
        void lite_kind;
        void lite_code;
        return liteFn$frontend$tsDisplayValueCode(lite_kind, lite_code);
    }
    void liteFn$emit__ts$displayValueCode;
    function liteFn$emit__ts$reportArgumentCode(lite_item: { kind: string; name: string; runtime: string; code: string; intValue: bigint; textValue: string }): string {
        void lite_item;
        return liteFn$emit__ts$displayValueCode((lite_item).kind, (lite_item).code);
    }
    void liteFn$emit__ts$reportArgumentCode;
    function liteFn$emit__ts$usesBuiltin(lite_calls: string, lite_name: string): boolean {
        void lite_calls;
        void lite_name;
        if (((lite_calls) === ("|"))) {
            return false;
        }
        return ((liteFn$lib$core$text$indexOfText(lite_calls, (((("|lite$") + (lite_name))) + ("(|")), 0n)) >= (0n));
    }
    void liteFn$emit__ts$usesBuiltin;
    function liteFn$emit__ts$usesListIndex(lite_calls: string): boolean {
        void lite_calls;
        return liteFn$emit__ts$usesBuiltin(lite_calls, "listAt");
    }
    void liteFn$emit__ts$usesListIndex;
    function liteFn$emit__ts$usesListPop(lite_calls: string): boolean {
        void lite_calls;
        return liteFn$emit__ts$usesBuiltin(lite_calls, "listPopBack");
    }
    void liteFn$emit__ts$usesListPop;
    function liteFn$emit__ts$usesListPopFront(lite_calls: string): boolean {
        void lite_calls;
        return liteFn$emit__ts$usesBuiltin(lite_calls, "listPopFront");
    }
    void liteFn$emit__ts$usesListPopFront;
    function liteFn$emit__ts$usesIntArithmetic(lite_calls: string): boolean {
        void lite_calls;
        return ((((((((liteFn$emit__ts$usesBuiltin(lite_calls, "addInt")) || (liteFn$emit__ts$usesBuiltin(lite_calls, "subtractInt")))) || (liteFn$emit__ts$usesBuiltin(lite_calls, "multiplyInt")))) || (liteFn$emit__ts$usesBuiltin(lite_calls, "negateInt")))) || (liteFn$emit__ts$usesBuiltin(lite_calls, "checkedNarrowInt")));
    }
    void liteFn$emit__ts$usesIntArithmetic;
    function liteFn$emit__ts$usesIntDivision(lite_calls: string): boolean {
        void lite_calls;
        return ((((((liteFn$emit__ts$usesBuiltin(lite_calls, "divideInt")) || (liteFn$emit__ts$usesBuiltin(lite_calls, "remainderInt")))) || (liteFn$emit__ts$usesBuiltin(lite_calls, "floorDivideInt")))) || (liteFn$emit__ts$usesBuiltin(lite_calls, "floorModuloInt")));
    }
    void liteFn$emit__ts$usesIntDivision;
    function liteFn$emit__ts$usesFloatArithmetic(lite_calls: string): boolean {
        void lite_calls;
        return ((((liteFn$emit__ts$usesBuiltin(lite_calls, "floatOp")) || (liteFn$emit__ts$usesBuiltin(lite_calls, "float32Op")))) || (liteFn$emit__ts$usesBuiltin(lite_calls, "floatPower")));
    }
    void liteFn$emit__ts$usesFloatArithmetic;
    function liteFn$emit__ts$emitFloatArithmeticHelpers(lite_calls: string): void {
        void lite_calls;
        if ((!(liteFn$emit__ts$usesFloatArithmetic(lite_calls)))) {
            return;
        }
        if (liteFn$emit__ts$usesBuiltin(lite_calls, "floatPower")) {
            lite$emit("function lite$floatPower(left: number, right: number, at: number): number {" + "\n");
            lite$emit("    if (right <= 0) lite$fault(\"ArithmeticPanic\", at, \"power exponent must be positive in this checkpoint\");" + "\n");
            lite$emit("    const value = Math.pow(left, right);" + "\n");
            lite$emit("    if (!Number.isFinite(value)) lite$fault(\"ArithmeticPanic\", at, \"non-finite floating value\");" + "\n");
            lite$emit("    return value;" + "\n");
            lite$emit("}" + "\n");
        }
        if (liteFn$emit__ts$usesBuiltin(lite_calls, "float32Op")) {
            lite$emit("function lite$float32Op(left: number, right: number, op: number, at: number): number {" + "\n");
            lite$emit("    if (op === 3 && right === 0) lite$fault(\"ArithmeticPanic\", at, \"division by zero\");" + "\n");
            lite$emit(("    const value = Math.fround(op === 0 ? left + right : op === 1 ? left - right : op === 2 ? left * right : left / right);") + "\n");
            lite$emit("    if (!Number.isFinite(value)) lite$fault(\"ArithmeticPanic\", at, \"non-finite floating value\");" + "\n");
            lite$emit("    return value;" + "\n");
            lite$emit("}" + "\n");
        }
        if ((!(liteFn$emit__ts$usesBuiltin(lite_calls, "floatOp")))) {
            return;
        }
        lite$emit("function lite$floatOp(left: number, right: number, op: number, at: number): number {" + "\n");
        lite$emit("    if (op === 3 && right === 0) lite$fault(\"ArithmeticPanic\", at, \"division by zero\");" + "\n");
        lite$emit(("    const value = op === 0 ? left + right : op === 1 ? left - right : op === 2 ? left * right : left / right;") + "\n");
        lite$emit("    if (!Number.isFinite(value)) lite$fault(\"ArithmeticPanic\", at, \"non-finite floating value\");" + "\n");
        lite$emit("    return value;" + "\n");
        lite$emit("}" + "\n");
    }
    void liteFn$emit__ts$emitFloatArithmeticHelpers;
    function liteFn$emit__ts$usesBounds(lite_calls: string): boolean {
        void lite_calls;
        return ((((((((liteFn$emit__ts$usesBuiltin(lite_calls, "textAt")) || (liteFn$emit__ts$usesBuiltin(lite_calls, "textSlice")))) || (liteFn$emit__ts$usesListIndex(lite_calls)))) || (liteFn$emit__ts$usesListPop(lite_calls)))) || (liteFn$emit__ts$usesListPopFront(lite_calls)));
    }
    void liteFn$emit__ts$usesBounds;
    function liteFn$emit__ts$usesAbruptFault(lite_calls: string): boolean {
        void lite_calls;
        return ((liteFn$emit__ts$usesBuiltin(lite_calls, "finally")) && ((((((((((((((((liteFn$emit__ts$usesBuiltin(lite_calls, "inputAll")) || (liteFn$emit__ts$usesBuiltin(lite_calls, "inputLine")))) || (liteFn$emit__ts$usesBuiltin(lite_calls, "inputInt")))) || (liteFn$emit__ts$usesBuiltin(lite_calls, "inputFloat")))) || (liteFn$emit__ts$usesIntArithmetic(lite_calls)))) || (liteFn$emit__ts$usesIntDivision(lite_calls)))) || (liteFn$emit__ts$usesBounds(lite_calls)))) || (liteFn$emit__ts$usesFloatArithmetic(lite_calls))))));
    }
    void liteFn$emit__ts$usesAbruptFault;
    function liteFn$emit__ts$usesAbruptUnwind(lite_calls: string): boolean {
        void lite_calls;
        return ((liteFn$emit__ts$usesAbruptFault(lite_calls)) || ((((liteFn$emit__ts$usesBuiltin(lite_calls, "finally")) && (liteFn$emit__ts$usesBuiltin(lite_calls, "exit"))))));
    }
    void liteFn$emit__ts$usesAbruptUnwind;
    function liteFn$emit__ts$emitIntArithmeticHelpers(lite_calls: string, lite_source: string, lite_prefix: string): void {
        void lite_calls;
        void lite_source;
        void lite_prefix;
        const lite_integers = ((liteFn$emit__ts$usesIntArithmetic(lite_calls)) || (liteFn$emit__ts$usesIntDivision(lite_calls)));
        void lite_integers;
        if ((((((!(lite_integers))) && ((!(liteFn$emit__ts$usesBounds(lite_calls)))))) && ((!(liteFn$emit__ts$usesFloatArithmetic(lite_calls)))))) {
            return;
        }
        const lite_namePrefix = (Boolean(((lite_prefix) === (""))) ? "" : ((lite_prefix) + (":")));
        void lite_namePrefix;
        const lite_needsRange = ((((((((((liteFn$emit__ts$usesBuiltin(lite_calls, "addInt")) || (liteFn$emit__ts$usesBuiltin(lite_calls, "subtractInt")))) || (liteFn$emit__ts$usesBuiltin(lite_calls, "multiplyInt")))) || (liteFn$emit__ts$usesBuiltin(lite_calls, "negateInt")))) || (liteFn$emit__ts$usesBuiltin(lite_calls, "divideInt")))) || (liteFn$emit__ts$usesBuiltin(lite_calls, "floorDivideInt")));
        void lite_needsRange;
        lite$emit((((("const lite$intLines: readonly number[] = [") + (liteFn$frontend$lineStartCodes(lite_source)))) + ("];")) + "\n");
        lite$emit((((("const lite$intSource = ") + (liteFn$ts__literals$textLiteralCode(lite_namePrefix)))) + (";")) + "\n");
        if (lite_needsRange) {
            lite$emit("const lite$intMin = -(1n << 63n), lite$intMax = (1n << 63n) - 1n;" + "\n");
        }
        lite$emit("function lite$fault(category: string, at: number, message: string): never {" + "\n");
        lite$emit("    let line = 0;" + "\n");
        lite$emit(("    while (line + 1 < lite$intLines.length && (lite$intLines[line + 1] ?? Infinity) <= at) line += 1;") + "\n");
        lite$emit(("    const column = at - (lite$intLines[line] ?? 0) + 1;") + "\n");
        if (liteFn$emit__ts$usesAbruptUnwind(lite_calls)) {
            lite$emit("    return lite$throwAbruptFault(lite$intSource + (line + 1) + \":\" + column + \": \" + category + \": \" + message + \"\\n\");" + "\n");
        } else {
            lite$emit("    process.getBuiltinModule(\"node:fs\").writeSync(2, lite$intSource + (line + 1) + \":\" + column + \": \" + category + \": \" + message + \"\\n\");" + "\n");
            lite$emit("    process.exit(1);" + "\n");
        }
        lite$emit("}" + "\n");
        if (lite_integers) {
            lite$emit("function lite$intFault(at: number, message: string): never { return lite$fault(\"ArithmeticPanic\", at, message); }" + "\n");
        }
        if (lite_needsRange) {
            lite$emit("function lite$checkedInt(value: bigint, at: number): bigint {" + "\n");
            lite$emit("    if (value < lite$intMin || value > lite$intMax) lite$intFault(at, \"integer outside Int range\");" + "\n");
            lite$emit("    return value;" + "\n");
            lite$emit("}" + "\n");
        }
        if (liteFn$emit__ts$usesBuiltin(lite_calls, "addInt")) {
            lite$emit("function lite$addInt(left: bigint, right: bigint, at: number): bigint { return lite$checkedInt(left + right, at); }" + "\n");
        }
        if (liteFn$emit__ts$usesBuiltin(lite_calls, "subtractInt")) {
            lite$emit("function lite$subtractInt(left: bigint, right: bigint, at: number): bigint { return lite$checkedInt(left - right, at); }" + "\n");
        }
        if (liteFn$emit__ts$usesBuiltin(lite_calls, "multiplyInt")) {
            lite$emit("function lite$multiplyInt(left: bigint, right: bigint, at: number): bigint { return lite$checkedInt(left * right, at); }" + "\n");
        }
        if (liteFn$emit__ts$usesBuiltin(lite_calls, "negateInt")) {
            lite$emit("function lite$negateInt(value: bigint, at: number): bigint { return lite$checkedInt(-value, at); }" + "\n");
        }
        if (liteFn$emit__ts$usesBuiltin(lite_calls, "checkedNarrowInt")) {
            lite$emit("function lite$checkedNarrowInt(value: bigint, bits: bigint, name: string, at: number): bigint {" + "\n");
            lite$emit("    const limit = 1n << (bits - 1n);" + "\n");
            lite$emit("    if (value < -limit || value >= limit) lite$intFault(at, \"integer outside \" + name + \" range\");" + "\n");
            lite$emit("    return value;" + "\n");
            lite$emit("}" + "\n");
        }
        lite$emit("" + "\n");
    }
    void liteFn$emit__ts$emitIntArithmeticHelpers;
    function liteFn$emit__ts$emitInputHelpers(lite_calls: string): void {
        void lite_calls;
        if ((!((((((((liteFn$emit__ts$usesBuiltin(lite_calls, "inputAll")) || (liteFn$emit__ts$usesBuiltin(lite_calls, "inputLine")))) || (liteFn$emit__ts$usesBuiltin(lite_calls, "inputInt")))) || (liteFn$emit__ts$usesBuiltin(lite_calls, "inputFloat"))))))) {
            return;
        }
        lite$emit(("declare const TextDecoder: { new(label: string, options: { fatal: boolean }): { decode(input?: Uint8Array, options?: { stream: boolean }): string } };") + "\n");
        lite$emit("const lite$decoder = new TextDecoder(\"utf-8\", { fatal: true });" + "\n");
        lite$emit("const lite$bytes = new Uint8Array(4096);" + "\n");
        lite$emit("let lite$byteAt = 0, lite$byteEnd = 0;" + "\n");
        lite$emit("let lite$ended = false;" + "\n");
        lite$emit("let lite$pending: string | null | undefined;" + "\n");
        lite$emit("function lite$inputFault(at: string, message: string): never {" + "\n");
        if (liteFn$emit__ts$usesAbruptUnwind(lite_calls)) {
            lite$emit("    return lite$throwAbruptFault(at + message + \"\\n\");" + "\n");
        } else {
            lite$emit("    process.getBuiltinModule(\"node:fs\").writeSync(2, at + message + \"\\n\");" + "\n");
            lite$emit("    process.exit(1);" + "\n");
        }
        lite$emit("}" + "\n");
        lite$emit("function lite$prompt(text: string | undefined): void {" + "\n");
        lite$emit("    if (text === undefined) return;" + "\n");
        lite$emit("    process.getBuiltinModule(\"node:fs\").writeSync(1, lite$out + text);" + "\n");
        lite$emit("    lite$out = \"\";" + "\n");
        lite$emit("}" + "\n");
        lite$emit("function lite$peek(at: string): string | null {" + "\n");
        lite$emit("    if (lite$pending !== undefined) return lite$pending;" + "\n");
        lite$emit("    if (lite$ended) return null;" + "\n");
        lite$emit("    try {" + "\n");
        lite$emit("        while (true) {" + "\n");
        lite$emit("            if (lite$byteAt === lite$byteEnd) {" + "\n");
        lite$emit("                lite$byteEnd = process.getBuiltinModule(\"node:fs\").readSync(0, lite$bytes, 0, lite$bytes.length, null);" + "\n");
        lite$emit("                lite$byteAt = 0;" + "\n");
        lite$emit("                if (lite$byteEnd === 0) {" + "\n");
        lite$emit("                    lite$ended = true;" + "\n");
        lite$emit("                    lite$pending = lite$decoder.decode() || null;" + "\n");
        lite$emit("                    return lite$pending;" + "\n");
        lite$emit("                }" + "\n");
        lite$emit("            }" + "\n");
        lite$emit("            const text = lite$decoder.decode(lite$bytes.subarray(lite$byteAt, ++lite$byteAt), { stream: true });" + "\n");
        lite$emit("            if (text !== \"\") { lite$pending = text; return text; }" + "\n");
        lite$emit("        }" + "\n");
        lite$emit("    } catch (error) {" + "\n");
        lite$emit(("        return lite$inputFault(at, \"cannot read input: \" + (error instanceof Error ? error.message : String(error)));") + "\n");
        lite$emit("    }" + "\n");
        lite$emit("}" + "\n");
        lite$emit("function lite$take(at: string): string | null {" + "\n");
        lite$emit("    const text = lite$peek(at); lite$pending = undefined; return text;" + "\n");
        lite$emit("}" + "\n");
        if (((liteFn$emit__ts$usesBuiltin(lite_calls, "inputInt")) || (liteFn$emit__ts$usesBuiltin(lite_calls, "inputFloat")))) {
            lite$emit("function lite$word(at: string): string | null {" + "\n");
            lite$emit("    let ch = lite$peek(at);" + "\n");
            lite$emit("    while (ch !== null && /\\s/u.test(ch)) { lite$take(at); ch = lite$peek(at); }" + "\n");
            lite$emit("    if (ch === null) return null;" + "\n");
            lite$emit("    let text = \"\";" + "\n");
            lite$emit("    while (ch !== null && !/\\s/u.test(ch)) { text += lite$take(at); ch = lite$peek(at); }" + "\n");
            lite$emit("    return text;" + "\n");
            lite$emit("}" + "\n");
        }
        if (liteFn$emit__ts$usesBuiltin(lite_calls, "inputAll")) {
            lite$emit("function lite$inputAll(prompt: string | undefined, at: string): string {" + "\n");
            lite$emit("    lite$prompt(prompt);" + "\n");
            lite$emit("    let text = \"\";" + "\n");
            lite$emit("    for (let ch = lite$take(at); ch !== null; ch = lite$take(at)) text += ch;" + "\n");
            lite$emit("    return text;" + "\n");
            lite$emit("}" + "\n");
        }
        if (liteFn$emit__ts$usesBuiltin(lite_calls, "inputLine")) {
            lite$emit("function lite$inputLine(prompt: string | undefined, at: string): string {" + "\n");
            lite$emit("    lite$prompt(prompt);" + "\n");
            lite$emit("    let text = \"\", ch = lite$take(at);" + "\n");
            lite$emit("    if (ch === null) return lite$inputFault(at, \"EOF before inputLine value\");" + "\n");
            lite$emit("    while (ch !== null && ch !== \"\\n\") { text += ch; ch = lite$take(at); }" + "\n");
            lite$emit(("    return ch === \"\\n\" && text.endsWith(\"\\r\") ? text.slice(0, -1) : text;") + "\n");
            lite$emit("}" + "\n");
        }
        if (liteFn$emit__ts$usesBuiltin(lite_calls, "inputInt")) {
            lite$emit("function lite$inputInt(prompt: string | undefined, at: string): bigint {" + "\n");
            lite$emit("    lite$prompt(prompt);" + "\n");
            lite$emit("    const text = lite$word(at);" + "\n");
            lite$emit("    if (text === null) return lite$inputFault(at, \"EOF before inputInt value\");" + "\n");
            lite$emit(("    if (!/^[+-]?[0-9]+$/.test(text)) return lite$inputFault(at, \"expected an integer token\");") + "\n");
            lite$emit("    const value = BigInt(text);" + "\n");
            lite$emit("    if (value < -(1n << 63n) || value > (1n << 63n) - 1n) return lite$inputFault(at, \"input outside signed 64-bit range\");" + "\n");
            lite$emit("    return value;" + "\n");
            lite$emit("}" + "\n");
        }
        if (liteFn$emit__ts$usesBuiltin(lite_calls, "inputFloat")) {
            lite$emit("function lite$inputFloat(prompt: string | undefined, at: string): number {" + "\n");
            lite$emit("    lite$prompt(prompt);" + "\n");
            lite$emit("    const text = lite$word(at);" + "\n");
            lite$emit("    if (text === null) return lite$inputFault(at, \"EOF before inputFloat value\");" + "\n");
            lite$emit("    const value = Number(text);" + "\n");
            lite$emit(("    if (!/^[+-]?[0-9]+(?:\\.[0-9]+)?(?:[eE][+-]?[0-9]+)?$/.test(text) || !Number.isFinite(value)) return lite$inputFault(at, \"expected a finite floating token\");") + "\n");
            lite$emit("    return value;" + "\n");
            lite$emit("}" + "\n");
        }
        lite$emit("" + "\n");
    }
    void liteFn$emit__ts$emitInputHelpers;
    function liteFn$emit__ts$emitBuiltinHelpers(lite_calls: string): void {
        void lite_calls;
        const lite_abruptFault = liteFn$emit__ts$usesAbruptFault(lite_calls);
        void lite_abruptFault;
        const lite_abruptExit = ((liteFn$emit__ts$usesBuiltin(lite_calls, "finally")) && (liteFn$emit__ts$usesBuiltin(lite_calls, "exit")));
        void lite_abruptExit;
        const lite_abruptUnwind = liteFn$emit__ts$usesAbruptUnwind(lite_calls);
        void lite_abruptUnwind;
        if (((((((((((((((((((((liteFn$emit__ts$usesBuiltin(lite_calls, "inputArgs")) || (liteFn$emit__ts$usesBuiltin(lite_calls, "inputAll")))) || (liteFn$emit__ts$usesBuiltin(lite_calls, "inputLine")))) || (liteFn$emit__ts$usesBuiltin(lite_calls, "inputInt")))) || (liteFn$emit__ts$usesBuiltin(lite_calls, "inputFloat")))) || (liteFn$emit__ts$usesBuiltin(lite_calls, "reportError")))) || (liteFn$emit__ts$usesBuiltin(lite_calls, "exit")))) || (liteFn$emit__ts$usesIntArithmetic(lite_calls)))) || (liteFn$emit__ts$usesIntDivision(lite_calls)))) || (liteFn$emit__ts$usesBounds(lite_calls)))) || (liteFn$emit__ts$usesFloatArithmetic(lite_calls)))) {
            lite$emit("declare const process: {" + "\n");
            lite$emit("    argv: string[];" + "\n");
            lite$emit("    exit(code: number): never;" + "\n");
            lite$emit("    getBuiltinModule(name: \"node:fs\"): {" + "\n");
            lite$emit("        readSync(fd: number, buffer: Uint8Array, offset: number, length: number, position: null): number;" + "\n");
            lite$emit("        writeSync(fd: number, text: string): number;" + "\n");
            lite$emit("    };" + "\n");
            lite$emit("};" + "\n");
            lite$emit("" + "\n");
        }
        if (lite_abruptUnwind) {
            lite$emit("const lite$abruptToken = {};" + "\n");
            lite$emit("let lite$abruptActive: boolean = false;" + "\n");
            if (lite_abruptFault) {
                lite$emit("let lite$abruptHasFault: boolean = false;" + "\n");
            }
            lite$emit("let lite$abruptStderr: string = \"\";" + "\n");
            lite$emit("let lite$abruptStatus: number = 0;" + "\n");
            if (lite_abruptFault) {
                lite$emit("function lite$throwAbruptFault(text: string): never {" + "\n");
                lite$emit("    if (!lite$abruptActive) {" + "\n");
                lite$emit("        lite$abruptActive = true;" + "\n");
                lite$emit("        lite$abruptHasFault = true;" + "\n");
                lite$emit("        lite$abruptStderr = text;" + "\n");
                lite$emit("        lite$abruptStatus = 1;" + "\n");
                lite$emit("    } else if (!lite$abruptHasFault) {" + "\n");
                lite$emit("        lite$abruptHasFault = true;" + "\n");
                lite$emit("        lite$abruptStderr = text;" + "\n");
                lite$emit("        lite$abruptStatus = 1;" + "\n");
                lite$emit("    } else {" + "\n");
                lite$emit("        lite$abruptStderr += text;" + "\n");
                lite$emit("    }" + "\n");
                lite$emit("    throw lite$abruptToken;" + "\n");
                lite$emit("}" + "\n");
            }
            if (lite_abruptExit) {
                lite$emit("function lite$throwAbruptExit(status: number): never {" + "\n");
                lite$emit("    if (!lite$abruptActive) {" + "\n");
                lite$emit("        lite$abruptActive = true;" + "\n");
                lite$emit("        lite$abruptStatus = status;" + "\n");
                lite$emit("    }" + "\n");
                lite$emit("    throw lite$abruptToken;" + "\n");
                lite$emit("}" + "\n");
            }
            lite$emit("" + "\n");
        }
        if (liteFn$emit__ts$usesBuiltin(lite_calls, "readSource")) {
            lite$emit("let lite$sourceProvider: ((importer: string, spec: string) => { path: string; display: string; identity: string; text: string }) | undefined;" + "\n");
            lite$emit("function lite$readSource(importer: string, spec: string): { path: string; display: string; identity: string; text: string } {" + "\n");
            lite$emit("    if (lite$sourceProvider === undefined) throw new Error(\"compiler host does not provide source reads\");" + "\n");
            lite$emit("    return lite$sourceProvider(importer, spec);" + "\n");
            lite$emit("}" + "\n");
            lite$emit("" + "\n");
        }
        if (liteFn$emit__ts$usesBuiltin(lite_calls, "inputArgs")) {
            lite$emit("function lite$inputArgs(): string[] {" + "\n");
            lite$emit("    return process.argv.slice(2);" + "\n");
            lite$emit("}" + "\n");
            lite$emit("" + "\n");
        }
        liteFn$emit__ts$emitInputHelpers(lite_calls);
        if (liteFn$emit__ts$usesBuiltin(lite_calls, "reportError")) {
            lite$emit("function lite$reportError(text: string): void {" + "\n");
            lite$emit("    process.getBuiltinModule(\"node:fs\").writeSync(2, text + \"\\n\");" + "\n");
            lite$emit("}" + "\n");
            lite$emit("" + "\n");
        }
        if (liteFn$emit__ts$usesBuiltin(lite_calls, "exit")) {
            lite$emit("function lite$exit(status: bigint): never {" + "\n");
            if (lite_abruptUnwind) {
                lite$emit("    return lite$throwAbruptExit(Number(status));" + "\n");
            } else {
                lite$emit("    process.getBuiltinModule(\"node:fs\").writeSync(1, lite$out);" + "\n");
                lite$emit("    process.exit(Number(status));" + "\n");
            }
            lite$emit("}" + "\n");
            lite$emit("" + "\n");
        }
        if (((((liteFn$emit__ts$usesBuiltin(lite_calls, "textLength")) || (liteFn$emit__ts$usesBuiltin(lite_calls, "textAt")))) || (liteFn$emit__ts$usesBuiltin(lite_calls, "textSlice")))) {
            lite$emit("const lite$textCache = new Map<string, readonly string[]>();" + "\n");
            lite$emit("function lite$textPoints(text: string): readonly string[] {" + "\n");
            lite$emit("    const found = lite$textCache.get(text);" + "\n");
            lite$emit("    if (found !== undefined) {" + "\n");
            lite$emit("        lite$textCache.delete(text);" + "\n");
            lite$emit("        lite$textCache.set(text, found);" + "\n");
            lite$emit("        return found;" + "\n");
            lite$emit("    }" + "\n");
            lite$emit("    const points = Array.from(text);" + "\n");
            lite$emit("    lite$textCache.set(text, points);" + "\n");
            lite$emit("    if (lite$textCache.size > 8) {" + "\n");
            lite$emit("        const oldest = lite$textCache.keys().next();" + "\n");
            lite$emit("        if (oldest.done !== true) lite$textCache.delete(oldest.value);" + "\n");
            lite$emit("    }" + "\n");
            lite$emit("    return points;" + "\n");
            lite$emit("}" + "\n");
            lite$emit("" + "\n");
        }
        if (liteFn$emit__ts$usesBuiltin(lite_calls, "textLength")) {
            lite$emit("function lite$textLength(text: string): bigint {" + "\n");
            lite$emit("    return BigInt(lite$textPoints(text).length);" + "\n");
            lite$emit("}" + "\n");
            lite$emit("" + "\n");
        }
        if (liteFn$emit__ts$usesBuiltin(lite_calls, "textAt")) {
            lite$emit("function lite$textAt(text: string, position: bigint, at: number): string {" + "\n");
            lite$emit("    const points = lite$textPoints(text);" + "\n");
            lite$emit("    if (position < 0n || position >= BigInt(points.length)) {" + "\n");
            lite$emit("        lite$fault(\"BoundPanic\", at, \"textAt index outside text\");" + "\n");
            lite$emit("    }" + "\n");
            lite$emit("    const value = points[Number(position)];" + "\n");
            lite$emit("    if (value === undefined) {" + "\n");
            lite$emit("        throw new Error(\"BoundPanic: textAt index outside text\");" + "\n");
            lite$emit("    }" + "\n");
            lite$emit("    return value;" + "\n");
            lite$emit("}" + "\n");
            lite$emit("" + "\n");
        }
        if (liteFn$emit__ts$usesBuiltin(lite_calls, "textSlice")) {
            lite$emit("function lite$textSlice(text: string, start: bigint, end: bigint, at: number): string {" + "\n");
            lite$emit("    const points = lite$textPoints(text);" + "\n");
            lite$emit("    if (start < 0n || end < start || end > BigInt(points.length)) {" + "\n");
            lite$emit("        lite$fault(\"BoundPanic\", at, \"textSlice requires 0 <= start <= end <= textLength(text)\");" + "\n");
            lite$emit("    }" + "\n");
            lite$emit("    return points.slice(Number(start), Number(end)).join(\"\");" + "\n");
            lite$emit("}" + "\n");
            lite$emit("" + "\n");
        }
        if (liteFn$emit__ts$usesBuiltin(lite_calls, "throwTransfer")) {
            lite$emit("const lite$transferToken = {};" + "\n");
            lite$emit("let lite$transferVal: any = undefined;" + "\n");
            lite$emit("function lite$throwTransfer(id: number, value: unknown): never {" + "\n");
            lite$emit("    throw { token: lite$transferToken, id, value };" + "\n");
            lite$emit("}" + "\n");
            lite$emit("function lite$hasTransfer(err: unknown, id: number): boolean {" + "\n");
            lite$emit("    if (typeof err === \"object\" && err !== null && \"token\" in err && err.token === lite$transferToken && \"id\" in err && err.id === id && \"value\" in err) {" + "\n");
            lite$emit("        lite$transferVal = err.value;" + "\n");
            lite$emit("        return true;" + "\n");
            lite$emit("    }" + "\n");
            lite$emit("    return false;" + "\n");
            lite$emit("}" + "\n");
            lite$emit("" + "\n");
        }
        return;
    }
    void liteFn$emit__ts$emitBuiltinHelpers;
    function liteFn$emit__ts$emitListIndexHelper(): void {
        lite$emit("function lite$listAt<T>(items: readonly T[], index: bigint, at: number): T {" + "\n");
        lite$emit("    if (index < 0n || index >= BigInt(items.length)) {" + "\n");
        lite$emit("        lite$fault(\"BoundPanic\", at, \"list index outside its extent\");" + "\n");
        lite$emit("    }" + "\n");
        lite$emit("    const value = items[Number(index)];" + "\n");
        lite$emit("    if (value === undefined) {" + "\n");
        lite$emit("        lite$fault(\"BoundPanic\", at, \"list index outside its extent\");" + "\n");
        lite$emit("    }" + "\n");
        lite$emit("    return value;" + "\n");
        lite$emit("}" + "\n");
        lite$emit("" + "\n");
    }
    void liteFn$emit__ts$emitListIndexHelper;
    function liteFn$emit__ts$emitListPopHelper(): void {
        lite$emit("function lite$listPopBack<T>(items: T[], at: number): T {" + "\n");
        lite$emit("    if (items.length === 0) {" + "\n");
        lite$emit("        lite$fault(\"BoundPanic\", at, \"pop_back on an empty list\");" + "\n");
        lite$emit("    }" + "\n");
        lite$emit("    return items.pop() as T;" + "\n");
        lite$emit("}" + "\n");
        lite$emit("" + "\n");
    }
    void liteFn$emit__ts$emitListPopHelper;
    function liteFn$emit__ts$emitListPopFrontHelper(): void {
        lite$emit("function lite$listPopFront<T>(items: T[], at: number): T {" + "\n");
        lite$emit("    if (items.length === 0) {" + "\n");
        lite$emit("        lite$fault(\"BoundPanic\", at, \"pop_front on an empty list\");" + "\n");
        lite$emit("    }" + "\n");
        lite$emit("    return items.shift() as T;" + "\n");
        lite$emit("}" + "\n");
        lite$emit("" + "\n");
    }
    void liteFn$emit__ts$emitListPopFrontHelper;
    function liteFn$emit__ts$emitIntDivideHelper(): void {
        lite$emit("function lite$divideInt(left: bigint, right: bigint, at: number): bigint {" + "\n");
        lite$emit("    if (right === 0n) lite$intFault(at, \"division by zero\");" + "\n");
        lite$emit("    return lite$checkedInt(left / right, at);" + "\n");
        lite$emit("}" + "\n");
        lite$emit("" + "\n");
    }
    void liteFn$emit__ts$emitIntDivideHelper;
    function liteFn$emit__ts$emitIntRemainderHelper(): void {
        lite$emit("function lite$remainderInt(left: bigint, right: bigint, at: number): bigint {" + "\n");
        lite$emit("    if (right === 0n) lite$intFault(at, \"remainder by zero\");" + "\n");
        lite$emit("    return left % right;" + "\n");
        lite$emit("}" + "\n");
        lite$emit("" + "\n");
    }
    void liteFn$emit__ts$emitIntRemainderHelper;
    function liteFn$emit__ts$emitIntFloorDivideHelper(): void {
        lite$emit("function lite$floorDivideInt(left: bigint, right: bigint, at: number): bigint {" + "\n");
        lite$emit("    const quotient = lite$divideInt(left, right, at);" + "\n");
        lite$emit("    const remainder = left % right;" + "\n");
        lite$emit(("    return remainder !== 0n && (left < 0n) !== (right < 0n) ? quotient - 1n : quotient;") + "\n");
        lite$emit("}" + "\n");
        lite$emit("" + "\n");
    }
    void liteFn$emit__ts$emitIntFloorDivideHelper;
    function liteFn$emit__ts$emitIntFloorModuloHelper(): void {
        lite$emit("function lite$floorModuloInt(left: bigint, right: bigint, at: number): bigint {" + "\n");
        lite$emit("    if (right === 0n) lite$intFault(at, \"modulo by zero\");" + "\n");
        lite$emit("    const remainder = left % right;" + "\n");
        lite$emit(("    return remainder !== 0n && (remainder < 0n) !== (right < 0n) ? remainder + right : remainder;") + "\n");
        lite$emit("}" + "\n");
        lite$emit("" + "\n");
    }
    void liteFn$emit__ts$emitIntFloorModuloHelper;
    function liteFn$emit__ts$emitIntDivisionHelpers(lite_calls: string): void {
        void lite_calls;
        if ((((liteFn$emit__ts$usesBuiltin(lite_calls, "divideInt")) || (liteFn$emit__ts$usesBuiltin(lite_calls, "floorDivideInt"))))) {
            liteFn$emit__ts$emitIntDivideHelper();
        }
        if (liteFn$emit__ts$usesBuiltin(lite_calls, "remainderInt")) {
            liteFn$emit__ts$emitIntRemainderHelper();
        }
        if (liteFn$emit__ts$usesBuiltin(lite_calls, "floorDivideInt")) {
            liteFn$emit__ts$emitIntFloorDivideHelper();
        }
        if (liteFn$emit__ts$usesBuiltin(lite_calls, "floorModuloInt")) {
            liteFn$emit__ts$emitIntFloorModuloHelper();
        }
        return;
    }
    void liteFn$emit__ts$emitIntDivisionHelpers;
    function liteFn$emit__ts$emitProgram(lite_items: { kind: string; name: string; runtime: string; code: string; intValue: bigint; textValue: string }[], lite_source: string, lite_prefix: string): void {
        void lite_items;
        void lite_source;
        void lite_prefix;
        const lite_calls = liteFn$frontend$targetHelperCalls([...(lite_items)]);
        void lite_calls;
        const lite_abruptFault = liteFn$emit__ts$usesAbruptFault(lite_calls);
        void lite_abruptFault;
        const lite_abruptUnwind = liteFn$emit__ts$usesAbruptUnwind(lite_calls);
        void lite_abruptUnwind;
        const lite_hasExit = ((((((((((liteFn$emit__ts$usesBuiltin(lite_calls, "exit")) || (liteFn$emit__ts$usesBuiltin(lite_calls, "inputAll")))) || (liteFn$emit__ts$usesBuiltin(lite_calls, "inputLine")))) || (liteFn$emit__ts$usesBuiltin(lite_calls, "inputInt")))) || (liteFn$emit__ts$usesBuiltin(lite_calls, "inputFloat")))) || (lite_abruptUnwind));
        void lite_hasExit;
        if (lite_hasExit) {
            lite$emit("let lite$out = \"\";" + "\n");
            lite$emit("" + "\n");
        }
        liteFn$emit__ts$emitBuiltinHelpers(lite_calls);
        if (liteFn$emit__ts$usesListIndex(lite_calls)) {
            liteFn$emit__ts$emitListIndexHelper();
        }
        if (liteFn$emit__ts$usesListPop(lite_calls)) {
            liteFn$emit__ts$emitListPopHelper();
        }
        if (liteFn$emit__ts$usesListPopFront(lite_calls)) {
            liteFn$emit__ts$emitListPopFrontHelper();
        }
        liteFn$emit__ts$emitIntArithmeticHelpers(lite_calls, lite_source, lite_prefix);
        liteFn$emit__ts$emitFloatArithmeticHelpers(lite_calls);
        liteFn$emit__ts$emitIntDivisionHelpers(lite_calls);
        if (liteFn$emit__ts$usesBuiltin(lite_calls, "readSource")) {
            lite$emit(("export function main(lite$write?: (text: string) => void, lite$sourceProviderInput?: (importer: string, spec: string) => { path: string; display: string; identity: string; text: string }): string {") + "\n");
            lite$emit("    lite$sourceProvider = lite$sourceProviderInput;" + "\n");
        } else {
            lite$emit(("export function main(lite$write?: (text: string) => void): string {") + "\n");
        }
        if ((!(lite_hasExit))) {
            lite$emit("    let lite$out = \"\";" + "\n");
        }
        lite$emit("    function lite$emit(text: string): void {" + "\n");
        lite$emit("        if (lite$write === undefined) lite$out += text;" + "\n");
        lite$emit("        else lite$write(text);" + "\n");
        lite$emit("    }" + "\n");
        lite$emit("    void lite$emit;" + "\n");
        let lite_indent = "    ";
        void lite_indent;
        if (lite_abruptUnwind) {
            lite$emit("    lite$abruptActive = false;" + "\n");
            if (lite_abruptFault) {
                lite$emit("    lite$abruptHasFault = false;" + "\n");
            }
            lite$emit("    lite$abruptStderr = \"\";" + "\n");
            lite$emit("    lite$abruptStatus = 0;" + "\n");
            lite$emit("    try {" + "\n");
            lite_indent = "        ";
        }
        let lite_line = "";
        void lite_line;
        let lite_count = 0n;
        void lite_count;
        let lite_mainStopped = false;
        void lite_mainStopped;
        for (const lite_item of [...(lite_items)]) {
            void lite_item;
            if ((((lite_item).kind) === ("FunctionStart"))) {
                lite$emit(((((((((((((((lite_indent) + ("function "))) + ((lite_item).runtime))) + ("("))) + (liteFn$emit__ts$tsParameterList((lite_item).textValue)))) + ("): "))) + (liteFn$emit__ts$tsFunctionType((lite_item).code)))) + (" {")) + "\n");
                lite_indent = ((lite_indent) + ("    "));
                liteFn$emit__ts$reportParameterReads((lite_item).textValue, lite_indent);
            } else if ((((lite_item).kind) === ("FunctionEnd"))) {
                lite_indent = liteFn$emit__ts$dedent(lite_indent);
                lite$emit(((lite_indent) + ("}")) + "\n");
                lite$emit(((((((lite_indent) + ("void "))) + ((lite_item).runtime))) + (";")) + "\n");
            } else if ((((((lite_item).kind) === ("TransferTry"))) || ((((lite_item).kind) === ("LoopTransferTry"))))) {
                lite$emit(((lite_indent) + ("try {")) + "\n");
                lite_indent = ((lite_indent) + ("    "));
            } else if ((((lite_item).kind) === ("TransferCatch"))) {
                lite_indent = liteFn$emit__ts$dedent(lite_indent);
                lite$emit(((lite_indent) + ("} catch (lite$err) {")) + "\n");
                if ((((lite_item).code) === ("Unit"))) {
                    lite$emit(((lite_indent) + ("    if (lite$hasTransfer(lite$err, 0)) { return; } else { throw lite$err; }")) + "\n");
                } else {
                    lite$emit(((lite_indent) + ("    if (lite$hasTransfer(lite$err, 0)) { return lite$transferVal; } else { throw lite$err; }")) + "\n");
                }
                lite$emit(((lite_indent) + ("}")) + "\n");
            } else if ((((lite_item).kind) === ("LoopTransferCatch"))) {
                lite_indent = liteFn$emit__ts$dedent(lite_indent);
                lite$emit(((lite_indent) + ("} catch (lite$err) {")) + "\n");
                lite$emit(((((((lite_indent) + ("    if (lite$hasTransfer(lite$err, "))) + ((lite_item).code))) + (")) { break; }")) + "\n");
                lite$emit(((((((lite_indent) + ("    else if (lite$hasTransfer(lite$err, "))) + ((lite_item).textValue))) + (")) { continue; }")) + "\n");
                lite$emit(((lite_indent) + ("    else { throw lite$err; }")) + "\n");
                lite$emit(((lite_indent) + ("}")) + "\n");
            } else if ((((lite_item).kind) === ("Return"))) {
                if ((((lite_item).code) === (""))) {
                    lite$emit(((lite_indent) + ("return;")) + "\n");
                } else {
                    lite$emit(((((((lite_indent) + ("return "))) + ((lite_item).code))) + (";")) + "\n");
                }
            } else if ((((lite_item).kind) === ("Unreachable"))) {
                lite$emit(((lite_indent) + ("throw new Error(\"unreachable loop completion\");")) + "\n");
            } else if ((((lite_item).kind) === ("Break"))) {
                lite$emit(((lite_indent) + ("break;")) + "\n");
            } else if ((((lite_item).kind) === ("Continue"))) {
                lite$emit(((lite_indent) + ("continue;")) + "\n");
            } else if ((((lite_item).kind) === ("Call"))) {
                lite$emit(((((lite_indent) + ((lite_item).code))) + (";")) + "\n");
            } else if ((((lite_item).kind) === ("Discard"))) {
                lite$emit(((((((lite_indent) + ("void ("))) + ((lite_item).code))) + (");")) + "\n");
            } else if ((((((((((((lite_item).kind) === ("LocalInt"))) || ((((lite_item).kind) === ("LocalString"))))) || ((((lite_item).kind) === ("LocalBool"))))) || ((((lite_item).kind) === ("LocalFloat"))))) || ((((lite_item).kind) === ("LocalTuple"))))) {
                lite$emit(((((((((((lite_indent) + ("const "))) + ((lite_item).runtime))) + (" = "))) + ((lite_item).code))) + (";")) + "\n");
                lite$emit(((((((lite_indent) + ("void "))) + ((lite_item).runtime))) + (";")) + "\n");
            } else if ((((lite_item).kind) === ("LocalList"))) {
                lite$emit(((((((((((((((lite_indent) + ("const "))) + ((lite_item).runtime))) + (": "))) + (liteFn$emit__ts$tsFunctionType((lite_item).textValue)))) + (" = "))) + ((lite_item).code))) + (";")) + "\n");
                lite$emit(((((((lite_indent) + ("void "))) + ((lite_item).runtime))) + (";")) + "\n");
            } else if ((((((((((((lite_item).kind) === ("VarInt"))) || ((((lite_item).kind) === ("VarString"))))) || ((((lite_item).kind) === ("VarBool"))))) || ((((lite_item).kind) === ("VarFloat"))))) || ((((lite_item).kind) === ("VarTuple"))))) {
                lite$emit(((((((((((lite_indent) + ("let "))) + ((lite_item).runtime))) + (" = "))) + ((lite_item).code))) + (";")) + "\n");
                lite$emit(((((((lite_indent) + ("void "))) + ((lite_item).runtime))) + (";")) + "\n");
            } else if ((((lite_item).kind) === ("VarList"))) {
                lite$emit(((((((((((((((lite_indent) + ("let "))) + ((lite_item).runtime))) + (": "))) + (liteFn$emit__ts$tsFunctionType((lite_item).textValue)))) + (" = "))) + ((lite_item).code))) + (";")) + "\n");
                lite$emit(((((((lite_indent) + ("void "))) + ((lite_item).runtime))) + (";")) + "\n");
            } else if ((((((((((((lite_item).kind) === ("AssignInt"))) || ((((lite_item).kind) === ("AssignString"))))) || ((((lite_item).kind) === ("AssignBool"))))) || ((((lite_item).kind) === ("AssignFloat"))))) || ((((lite_item).kind) === ("AssignTuple"))))) {
                lite$emit(((((((((lite_indent) + ((lite_item).runtime))) + (" = "))) + ((lite_item).code))) + (";")) + "\n");
            } else if ((((lite_item).kind) === ("AssignList"))) {
                lite$emit(((((((((lite_indent) + ((lite_item).runtime))) + (" = "))) + ((lite_item).code))) + (";")) + "\n");
            } else if ((((lite_item).kind) === ("Scope"))) {
                lite$emit(((lite_indent) + ("{")) + "\n");
                lite_indent = ((lite_indent) + ("    "));
            } else if ((((lite_item).kind) === ("If"))) {
                const lite_condition = (Boolean((((((lite_item).code) === ("true"))) || ((((lite_item).code) === ("false"))))) ? (((("Boolean(") + ((lite_item).code))) + (")")) : (lite_item).code);
                void lite_condition;
                lite$emit(((((((lite_indent) + ("if ("))) + (lite_condition))) + (") {")) + "\n");
                lite_indent = ((lite_indent) + ("    "));
            } else if ((((lite_item).kind) === ("Else"))) {
                lite_indent = liteFn$emit__ts$dedent(lite_indent);
                lite$emit(((lite_indent) + ("} else {")) + "\n");
                lite_indent = ((lite_indent) + ("    "));
            } else if ((((lite_item).kind) === ("ElseIf"))) {
                lite_indent = liteFn$emit__ts$dedent(lite_indent);
                const lite_condition = (Boolean((((((lite_item).code) === ("true"))) || ((((lite_item).code) === ("false"))))) ? (((("Boolean(") + ((lite_item).code))) + (")")) : (lite_item).code);
                void lite_condition;
                lite$emit(((((((lite_indent) + ("} else if ("))) + (lite_condition))) + (") {")) + "\n");
                lite_indent = ((lite_indent) + ("    "));
            } else if ((((((lite_item).kind) === ("EndIf"))) || ((((lite_item).kind) === ("EndScope"))))) {
                lite_indent = liteFn$emit__ts$dedent(lite_indent);
                lite$emit(((lite_indent) + ("}")) + "\n");
            } else if ((((lite_item).kind) === ("LoopSeq"))) {
                lite$emit(((((((((((lite_indent) + ("for (const "))) + ((lite_item).runtime))) + (" of "))) + (liteFn$ts__literals$listCopyCode((lite_item).code)))) + (") {")) + "\n");
                lite_indent = ((lite_indent) + ("    "));
                lite$emit(((((((lite_indent) + ("void "))) + ((lite_item).runtime))) + (";")) + "\n");
            } else if ((((lite_item).kind) === ("Loop"))) {
                const lite_condition = (Boolean((((lite_item).code) === (""))) ? "Boolean(true)" : (Boolean((((lite_item).code) === ("false"))) ? "Boolean(false)" : (lite_item).code));
                void lite_condition;
                lite$emit(((((((lite_indent) + ("while ("))) + (lite_condition))) + (") {")) + "\n");
                lite_indent = ((lite_indent) + ("    "));
            } else if ((((lite_item).kind) === ("EndLoop"))) {
                lite_indent = liteFn$emit__ts$dedent(lite_indent);
                lite$emit(((lite_indent) + ("}")) + "\n");
            } else if ((((((lite_item).kind) === ("End"))) || ((((lite_item).kind) === ("EndOutput"))))) {
                if (((lite_count) === (0n))) {
                    lite$emit(((((((lite_indent) + ("lite$emit("))) + (liteFn$ts__literals$textLiteralCode((Boolean((((lite_item).kind) === ("End"))) ? "\n" : ""))))) + (");")) + "\n");
                } else {
                    const lite_ending = (Boolean((((lite_item).kind) === ("End"))) ? " + \"\\n\"" : "");
                    void lite_ending;
                    const lite_emitted = (Boolean(((((((((lite_count) === (1n))) && ((((lite_item).kind) === ("End"))))) && ((!(liteFn$lib$core$text$startsWithAt(lite_line, 0n, "(")))))) && (((liteFn$lib$core$text$indexOfText(lite_line, "?", 0n)) >= (0n))))) ? (((("(") + (lite_line))) + (")")) : lite_line);
                    void lite_emitted;
                    lite$emit(((((((((lite_indent) + ("lite$emit("))) + (lite_emitted))) + (lite_ending))) + (");")) + "\n");
                }
                lite_line = "";
                lite_count = 0n;
            } else if ((((lite_item).kind) === ("MainStop"))) {
                lite_mainStopped = true;
            } else if ((((((((((((lite_item).kind) === ("Import"))) || ((((lite_item).kind) === ("PublicFunction"))))) || ((((lite_item).kind) === ("PublicValue"))))) || ((((lite_item).kind) === ("PublicType"))))) || ((((lite_item).kind) === ("Noop"))))) {
            } else {
                if (((lite_count) > (0n))) {
                    lite_line = ((lite_line) + (" + \" \" + "));
                }
                lite_line = ((lite_line) + (liteFn$emit__ts$reportArgumentCode(lite_item)));
                lite_count = lite$addInt(lite_count, 1n, 38215);
            }
        }
        if ((!(lite_mainStopped))) {
            lite$emit(((lite_indent) + ("return lite$out;")) + "\n");
        }
        if (lite_abruptUnwind) {
            lite$emit("    } catch (lite$err) {" + "\n");
            lite$emit("        if (lite$err === lite$abruptToken) {" + "\n");
            lite$emit("            if (lite$out !== \"\") {" + "\n");
            lite$emit("                process.getBuiltinModule(\"node:fs\").writeSync(1, lite$out);" + "\n");
            lite$emit("                lite$out = \"\";" + "\n");
            lite$emit("            }" + "\n");
            lite$emit("            if (lite$abruptStderr !== \"\") {" + "\n");
            lite$emit("                process.getBuiltinModule(\"node:fs\").writeSync(2, lite$abruptStderr);" + "\n");
            lite$emit("            }" + "\n");
            lite$emit("            process.exit(lite$abruptStatus);" + "\n");
            lite$emit("        }" + "\n");
            lite$emit("        throw lite$err;" + "\n");
            lite$emit("    }" + "\n");
        }
        lite$emit("}" + "\n");
    }
    void liteFn$emit__ts$emitProgram;
    function liteFn$modules$moduleVisited(lite_graph: { kind: string; name: string; runtime: string; code: string; intValue: bigint; textValue: string }[], lite_path: string): boolean {
        void lite_graph;
        void lite_path;
        for (const lite_item of [...(lite_graph)]) {
            void lite_item;
            if ((((((lite_item).kind) === ("ModuleVisited"))) && ((((lite_item).name) === (lite_path))))) {
                return true;
            }
        }
        return false;
    }
    void liteFn$modules$moduleVisited;
    function liteFn$modules$moduleProcessed(lite_graph: { kind: string; name: string; runtime: string; code: string; intValue: bigint; textValue: string }[], lite_path: string): boolean {
        void lite_graph;
        void lite_path;
        for (const lite_item of [...(lite_graph)]) {
            void lite_item;
            if ((((((lite_item).kind) === ("ModuleProcessed"))) && ((((lite_item).name) === (lite_path))))) {
                return true;
            }
        }
        return false;
    }
    void liteFn$modules$moduleProcessed;
    function liteFn$modules$listContainsInt(lite_values: bigint[], lite_needle: bigint): boolean {
        void lite_values;
        void lite_needle;
        for (const lite_value of [...(lite_values)]) {
            void lite_value;
            if (((lite_value) === (lite_needle))) {
                return true;
            }
        }
        return false;
    }
    void liteFn$modules$listContainsInt;
    function liteFn$modules$asciiCode(lite_ch: string): bigint {
        void lite_ch;
        if (((liteFn$lib$core$text$length(lite_ch)) !== (1n))) {
            return (-1n);
        }
        const lite_printable = " !\"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~";
        void lite_printable;
        const lite_found = liteFn$lib$core$text$indexOfText(lite_printable, lite_ch, 0n);
        void lite_found;
        if (((lite_found) >= (0n))) {
            return lite$addInt(lite_found, 32n, 1405);
        }
        if (((lite_ch) === ("\t"))) {
            return 9n;
        }
        if (((lite_ch) === ("\n"))) {
            return 10n;
        }
        if (((lite_ch) === ("\r"))) {
            return 13n;
        }
        return (-1n);
    }
    void liteFn$modules$asciiCode;
    function liteFn$modules$compareText(lite_left: string, lite_right: string): bigint {
        void lite_left;
        void lite_right;
        const lite_leftLen = liteFn$lib$core$text$length(lite_left);
        void lite_leftLen;
        const lite_rightLen = liteFn$lib$core$text$length(lite_right);
        void lite_rightLen;
        const lite_limit = (Boolean(((lite_leftLen) < (lite_rightLen))) ? lite_leftLen : lite_rightLen);
        void lite_limit;
        let lite_index = 0n;
        void lite_index;
        while (((lite_index) < (lite_limit))) {
            const lite_leftCh = liteFn$lib$core$text$at(lite_left, lite_index);
            void lite_leftCh;
            const lite_rightCh = liteFn$lib$core$text$at(lite_right, lite_index);
            void lite_rightCh;
            if (((lite_leftCh) !== (lite_rightCh))) {
                const lite_leftCode = liteFn$modules$asciiCode(lite_leftCh);
                void lite_leftCode;
                const lite_rightCode = liteFn$modules$asciiCode(lite_rightCh);
                void lite_rightCode;
                if (((lite_leftCode) < (lite_rightCode))) {
                    return (-1n);
                }
                if (((lite_leftCode) > (lite_rightCode))) {
                    return 1n;
                }
            }
            lite_index = lite$addInt(lite_index, 1n, 2193);
        }
        return (Boolean(((lite_leftLen) < (lite_rightLen))) ? (-1n) : (Boolean(((lite_leftLen) > (lite_rightLen))) ? 1n : 0n));
    }
    void liteFn$modules$compareText;
    function liteFn$modules$normalizeSlashes(lite_path: string): string {
        void lite_path;
        if (((liteFn$lib$core$text$indexOfText(lite_path, "\\", 0n)) < (0n))) {
            return lite_path;
        }
        let lite_result = "";
        void lite_result;
        let lite_index = 0n;
        void lite_index;
        const lite_size = liteFn$lib$core$text$length(lite_path);
        void lite_size;
        while (((lite_index) < (lite_size))) {
            const lite_ch = liteFn$lib$core$text$at(lite_path, lite_index);
            void lite_ch;
            lite_result = ((lite_result) + ((Boolean(((lite_ch) === ("\\"))) ? "/" : lite_ch)));
            lite_index = lite$addInt(lite_index, 1n, 2707);
        }
        return lite_result;
    }
    void liteFn$modules$normalizeSlashes;
    function liteFn$modules$stripLtsExtension(lite_name: string): string {
        void lite_name;
        const lite_size = liteFn$lib$core$text$length(lite_name);
        void lite_size;
        if (((((lite_size) > (4n))) && (liteFn$lib$core$text$startsWithAt(lite_name, lite$subtractInt(lite_size, 4n, 2941), ".lts")))) {
            return liteFn$lib$core$text$slice(lite_name, 0n, lite$subtractInt(lite_size, 4n, 2999));
        }
        return lite_name;
    }
    void liteFn$modules$stripLtsExtension;
    function liteFn$modules$dirnameOfPath(lite_path: string): string {
        void lite_path;
        let lite_index = lite$subtractInt(liteFn$lib$core$text$length(lite_path), 1n, 3198);
        void lite_index;
        while (((lite_index) >= (0n))) {
            if (((liteFn$lib$core$text$at(lite_path, lite_index)) === ("/"))) {
                if (((lite_index) === (0n))) {
                    return "/";
                }
                return liteFn$lib$core$text$slice(lite_path, 0n, lite_index);
            }
            lite_index = lite$subtractInt(lite_index, 1n, 3393);
        }
        return "";
    }
    void liteFn$modules$dirnameOfPath;
    function liteFn$modules$basenameOfPath(lite_path: string): string {
        void lite_path;
        const lite_size = liteFn$lib$core$text$length(lite_path);
        void lite_size;
        let lite_index = lite$subtractInt(lite_size, 1n, 3564);
        void lite_index;
        while (((lite_index) >= (0n))) {
            if (((liteFn$lib$core$text$at(lite_path, lite_index)) === ("/"))) {
                return liteFn$lib$core$text$slice(lite_path, lite$addInt(lite_index, 1n, 3680), lite_size);
            }
            lite_index = lite$subtractInt(lite_index, 1n, 3724);
        }
        return lite_path;
    }
    void liteFn$modules$basenameOfPath;
    function liteFn$modules$relativeFromDir(lite_rootDir: string, lite_path: string): string {
        void lite_rootDir;
        void lite_path;
        const lite_normPath = liteFn$modules$normalizeSlashes(lite_path);
        void lite_normPath;
        if (((lite_rootDir) === (""))) {
            if (((((lite_normPath) === (""))) || (liteFn$lib$core$text$startsWithAt(lite_normPath, 0n, "/")))) {
                return "";
            }
            return lite_normPath;
        }
        if (((lite_rootDir) === ("/"))) {
            if (liteFn$lib$core$text$startsWithAt(lite_normPath, 0n, "/")) {
                return liteFn$lib$core$text$slice(lite_normPath, 1n, liteFn$lib$core$text$length(lite_normPath));
            }
            return "";
        }
        const lite_rootIsAbs = liteFn$lib$core$text$startsWithAt(lite_rootDir, 0n, "/");
        void lite_rootIsAbs;
        const lite_pathIsAbs = liteFn$lib$core$text$startsWithAt(lite_normPath, 0n, "/");
        void lite_pathIsAbs;
        if ((Boolean(lite_rootIsAbs) !== Boolean(lite_pathIsAbs))) {
            return "";
        }
        const lite_rootSlash = ((lite_rootDir) + ("/"));
        void lite_rootSlash;
        const lite_rootLen = liteFn$lib$core$text$length(lite_rootSlash);
        void lite_rootLen;
        const lite_pathLen = liteFn$lib$core$text$length(lite_normPath);
        void lite_pathLen;
        const lite_limit = (Boolean(((lite_rootLen) < (lite_pathLen))) ? lite_rootLen : lite_pathLen);
        void lite_limit;
        let lite_index = 0n;
        void lite_index;
        let lite_commonSlash = (-1n);
        void lite_commonSlash;
        while (((lite_index) < (lite_limit))) {
            const lite_ch = liteFn$lib$core$text$at(lite_rootSlash, lite_index);
            void lite_ch;
            if (((lite_ch) !== (liteFn$lib$core$text$at(lite_normPath, lite_index)))) {
                break;
            }
            if (((lite_ch) === ("/"))) {
                lite_commonSlash = lite_index;
            }
            lite_index = lite$addInt(lite_index, 1n, 4839);
        }
        if (((lite_rootIsAbs) && (((lite_commonSlash) <= (0n))))) {
            return "";
        }
        let lite_prefix = "";
        void lite_prefix;
        let lite_scan = lite$addInt(lite_commonSlash, 1n, 4953);
        void lite_scan;
        while (((lite_scan) < (lite_rootLen))) {
            if (((liteFn$lib$core$text$at(lite_rootSlash, lite_scan)) === ("/"))) {
                lite_prefix = ((lite_prefix) + ("../"));
            }
            lite_scan = lite$addInt(lite_scan, 1n, 5079);
        }
        return ((lite_prefix) + (liteFn$lib$core$text$slice(lite_normPath, lite$addInt(lite_commonSlash, 1n, 5139), lite_pathLen)));
    }
    void liteFn$modules$relativeFromDir;
    function liteFn$modules$logicalModuleName(lite_rootDir: string, lite_path: string, lite_display: string): string {
        void lite_rootDir;
        void lite_path;
        void lite_display;
        const lite_normDisplay = liteFn$modules$normalizeSlashes(lite_display);
        void lite_normDisplay;
        if (liteFn$lib$core$text$startsWithAt(lite_normDisplay, 0n, "lib/")) {
            const lite_cleanedStd = liteFn$modules$stripLtsExtension(lite_normDisplay);
            void lite_cleanedStd;
            if (((lite_cleanedStd) !== (""))) {
                return lite_cleanedStd;
            }
        }
        const lite_relative = liteFn$modules$relativeFromDir(lite_rootDir, lite_path);
        void lite_relative;
        if (((lite_relative) !== (""))) {
            const lite_cleanedRel = liteFn$modules$stripLtsExtension(lite_relative);
            void lite_cleanedRel;
            if (((lite_cleanedRel) !== (""))) {
                return lite_cleanedRel;
            }
        }
        const lite_cleanedDisp = liteFn$modules$stripLtsExtension(lite_normDisplay);
        void lite_cleanedDisp;
        if (((lite_cleanedDisp) !== (""))) {
            return lite_cleanedDisp;
        }
        const lite_cleanedBase = liteFn$modules$stripLtsExtension(liteFn$modules$basenameOfPath(liteFn$modules$normalizeSlashes(lite_path)));
        void lite_cleanedBase;
        if (((lite_cleanedBase) !== (""))) {
            return lite_cleanedBase;
        }
        return "module";
    }
    void liteFn$modules$logicalModuleName;
    function liteFn$modules$encodeModuleSlug(lite_target: string, lite_logical: string): string {
        void lite_target;
        void lite_logical;
        let lite_result = "";
        void lite_result;
        let lite_index = 0n;
        void lite_index;
        const lite_size = liteFn$lib$core$text$length(lite_logical);
        void lite_size;
        while (((lite_index) < (lite_size))) {
            const lite_ch = liteFn$lib$core$text$at(lite_logical, lite_index);
            void lite_ch;
            if (((liteFn$lib$core$text$isAsciiLetter(lite_ch)) || (liteFn$lib$core$text$isDigit(lite_ch)))) {
                lite_result = ((lite_result) + (lite_ch));
            } else if (((lite_ch) === ("/"))) {
                lite_result = ((lite_result) + ((Boolean(((lite_target) === ("ts"))) ? "$" : "_s_")));
            } else if (((lite_ch) === ("-"))) {
                lite_result = ((lite_result) + ((Boolean(((lite_target) === ("ts"))) ? "__" : "_d_")));
            } else if (((lite_ch) === ("_"))) {
                lite_result = ((lite_result) + ("_u_"));
            } else if (((lite_ch) === ("."))) {
                lite_result = ((lite_result) + ("_p_"));
            } else {
                const lite_code = liteFn$modules$asciiCode(lite_ch);
                void lite_code;
                lite_result = ((lite_result) + ((Boolean(((lite_code) >= (0n))) ? (((("_a") + (liteFn$lib$core$int$intText(lite_code)))) + ("_")) : "_z_")));
            }
            lite_index = lite$addInt(lite_index, 1n, 6859);
        }
        if (((lite_result) === (""))) {
            return "module";
        }
        return lite_result;
    }
    void liteFn$modules$encodeModuleSlug;
    function liteFn$modules$graphUsesModuleKey(lite_graph: { kind: string; name: string; runtime: string; code: string; intValue: bigint; textValue: string }[], lite_moduleKey: string): boolean {
        void lite_graph;
        void lite_moduleKey;
        for (const lite_item of [...(lite_graph)]) {
            void lite_item;
            if ((((((lite_item).kind) === ("ModuleVisited"))) && ((((lite_item).textValue) === (lite_moduleKey))))) {
                return true;
            }
        }
        return false;
    }
    void liteFn$modules$graphUsesModuleKey;
    function liteFn$modules$uniqueModuleKey(lite_graph: { kind: string; name: string; runtime: string; code: string; intValue: bigint; textValue: string }[], lite_target: string, lite_baseSlug: string): string {
        void lite_graph;
        void lite_target;
        void lite_baseSlug;
        if ((!(liteFn$modules$graphUsesModuleKey([...(lite_graph)], lite_baseSlug)))) {
            return lite_baseSlug;
        }
        let lite_suffix = 2n;
        void lite_suffix;
        while (Boolean(true)) {
            const lite_candidate = (Boolean(((lite_target) === ("ts"))) ? ((((lite_baseSlug) + ("$"))) + (liteFn$lib$core$int$intText(lite_suffix))) : ((((((lite_baseSlug) + ("_k"))) + (liteFn$lib$core$int$intText(lite_suffix)))) + ("_")));
            void lite_candidate;
            if ((!(liteFn$modules$graphUsesModuleKey([...(lite_graph)], lite_candidate)))) {
                return lite_candidate;
            }
            lite_suffix = lite$addInt(lite_suffix, 1n, 7743);
        }
        return lite_baseSlug;
    }
    void liteFn$modules$uniqueModuleKey;
    function liteFn$modules$rootDirForGraph(lite_graph: { kind: string; name: string; runtime: string; code: string; intValue: bigint; textValue: string }[]): string {
        void lite_graph;
        for (const lite_item of [...(lite_graph)]) {
            void lite_item;
            if ((((((lite_item).kind) === ("ModuleVisited"))) && ((((lite_item).intValue) === (1n))))) {
                return (lite_item).runtime;
            }
        }
        return "";
    }
    void liteFn$modules$rootDirForGraph;
    function liteFn$modules$moduleKeyForPath(lite_graph: { kind: string; name: string; runtime: string; code: string; intValue: bigint; textValue: string }[], lite_path: string): string {
        void lite_graph;
        void lite_path;
        for (const lite_item of [...(lite_graph)]) {
            void lite_item;
            if ((((((lite_item).kind) === ("ModuleVisited"))) && ((((lite_item).name) === (lite_path))))) {
                return (lite_item).textValue;
            }
        }
        return "";
    }
    void liteFn$modules$moduleKeyForPath;
    function liteFn$modules$moduleLevelForPath(lite_graph: { kind: string; name: string; runtime: string; code: string; intValue: bigint; textValue: string }[], lite_path: string): bigint {
        void lite_graph;
        void lite_path;
        for (const lite_item of [...(lite_graph)]) {
            void lite_item;
            if ((((((lite_item).kind) === ("ModuleProcessed"))) && ((((lite_item).name) === (lite_path))))) {
                return (lite_item).intValue;
            }
        }
        return 0n;
    }
    void liteFn$modules$moduleLevelForPath;
    function liteFn$modules$sortedDepIndices(lite_logicals: string[], lite_paths: string[], lite_count: bigint): bigint[] {
        void lite_logicals;
        void lite_paths;
        void lite_count;
        const lite_picked: bigint[] = [...([])];
        void lite_picked;
        let lite_step = 0n;
        void lite_step;
        while (((lite_step) < (lite_count))) {
            let lite_best = (-1n);
            void lite_best;
            let lite_idx = 0n;
            void lite_idx;
            while (((lite_idx) < (lite_count))) {
                if ((!(liteFn$modules$listContainsInt([...(lite_picked)], lite_idx)))) {
                    if (((lite_best) < (0n))) {
                        lite_best = lite_idx;
                    } else {
                        const lite_cmpLogical = liteFn$modules$compareText(lite$listAt((lite_logicals), lite_idx, 9111), lite$listAt((lite_logicals), lite_best, 9126));
                        void lite_cmpLogical;
                        if (((((lite_cmpLogical) < (0n))) || ((((((lite_cmpLogical) === (0n))) && (((liteFn$modules$compareText(lite$listAt((lite_paths), lite_idx, 9214), lite$listAt((lite_paths), lite_best, 9226))) < (0n)))))))) {
                            lite_best = lite_idx;
                        }
                    }
                }
                lite_idx = lite$addInt(lite_idx, 1n, 9352);
            }
            lite_picked.push(lite_best);
            lite_step = lite$addInt(lite_step, 1n, 9431);
        }
        return [...(lite_picked)];
    }
    void liteFn$modules$sortedDepIndices;
    function liteFn$modules$modulePublicDeclarations(lite_graph: { kind: string; name: string; runtime: string; code: string; intValue: bigint; textValue: string }[], lite_path: string): { kind: string; name: string; runtime: string; code: string; intValue: bigint; textValue: string }[] {
        void lite_graph;
        void lite_path;
        const lite_result: { kind: string; name: string; runtime: string; code: string; intValue: bigint; textValue: string }[] = [...([])];
        void lite_result;
        let lite_inside = false;
        void lite_inside;
        for (const lite_item of [...(lite_graph)]) {
            void lite_item;
            if ((((lite_item).kind) === ("ModuleStart"))) {
                lite_inside = (((lite_item).name) === (lite_path));
            } else if ((((((lite_item).kind) === ("ModuleEnd"))) && (lite_inside))) {
                break;
            } else if (((lite_inside) && (((((((((lite_item).kind) === ("PublicFunction"))) || ((((lite_item).kind) === ("PublicValue"))))) || ((((lite_item).kind) === ("PublicType")))))))) {
                lite_result.push(lite_item);
            }
        }
        return [...(lite_result)];
    }
    void liteFn$modules$modulePublicDeclarations;
    function liteFn$modules$appendModuleExports(lite_existing: { kind: string; name: string; runtime: string; code: string; intValue: bigint; textValue: string }[], lite_incoming: { kind: string; name: string; runtime: string; code: string; intValue: bigint; textValue: string }[], lite_prefix: string): { kind: string; name: string; runtime: string; code: string; intValue: bigint; textValue: string }[] {
        void lite_existing;
        void lite_incoming;
        void lite_prefix;
        let lite_result: { kind: string; name: string; runtime: string; code: string; intValue: bigint; textValue: string }[] = [...([...(lite_existing)])];
        void lite_result;
        for (const lite_item of [...(lite_incoming)]) {
            void lite_item;
            let lite_duplicate = false;
            void lite_duplicate;
            for (const lite_previous of [...(lite_result)]) {
                void lite_previous;
                if ((((lite_item).kind) === ("ModuleAlias"))) {
                    if (((((((((lite_previous).kind) === ("ModuleAlias"))) && ((((lite_previous).name) === ((lite_item).name)))))) || ((((((((((lite_previous).kind) === ("PublicFunction"))) || ((((lite_previous).kind) === ("PublicValue")))))) && ((((lite_previous).name) === ((lite_item).name)))))))) {
                        lite_duplicate = true;
                    }
                } else if ((((((lite_item).kind) === ("PublicFunction"))) || ((((lite_item).kind) === ("PublicValue"))))) {
                    if ((((((((((((lite_previous).kind) === ("PublicFunction"))) || ((((lite_previous).kind) === ("PublicValue")))))) && ((((lite_previous).name) === ((lite_item).name)))))) || (((((((lite_previous).kind) === ("ModuleAlias"))) && ((((lite_previous).name) === ((lite_item).name)))))))) {
                        lite_duplicate = true;
                    }
                } else if ((((((((lite_item).kind) === ("PublicType"))) && ((((lite_previous).kind) === ("PublicType"))))) && ((((lite_previous).name) === ((lite_item).name))))) {
                    lite_duplicate = true;
                }
            }
            if (lite_duplicate) {
                if ((((lite_item).kind) === ("ModuleAlias"))) {
                    liteFn$lib$core$diag$fail(lite_prefix, (("duplicate module alias ") + ((lite_item).name)));
                }
                if ((((lite_item).kind) === ("PublicType"))) {
                    liteFn$lib$core$diag$fail(lite_prefix, (("duplicate imported public type ") + ((lite_item).name)));
                }
                liteFn$lib$core$diag$fail(lite_prefix, (("duplicate imported public name ") + ((lite_item).name)));
            }
            lite_result.push(lite_item);
        }
        return [...(lite_result)];
    }
    void liteFn$modules$appendModuleExports;
    function liteFn$modules$moduleAliasExports(lite_graph: { kind: string; name: string; runtime: string; code: string; intValue: bigint; textValue: string }[], lite_path: string, lite_alias: string): { kind: string; name: string; runtime: string; code: string; intValue: bigint; textValue: string }[] {
        void lite_graph;
        void lite_path;
        void lite_alias;
        const lite_result: { kind: string; name: string; runtime: string; code: string; intValue: bigint; textValue: string }[] = [...([{ kind: "ModuleAlias", name: lite_alias, runtime: liteFn$modules$moduleKeyForPath([...(lite_graph)], lite_path), code: "", intValue: 0n, textValue: lite_path }])];
        void lite_result;
        for (const lite_item of [...(liteFn$modules$modulePublicDeclarations([...(lite_graph)], lite_path))]) {
            void lite_item;
            lite_result.push({ kind: (lite_item).kind, name: ((((lite_alias) + ("."))) + ((lite_item).name)), runtime: (lite_item).runtime, code: (lite_item).code, intValue: (lite_item).intValue, textValue: (lite_item).textValue });
        }
        return [...(lite_result)];
    }
    void liteFn$modules$moduleAliasExports;
    function liteFn$modules$visitSourceModule(lite_target: string, lite_path: string, lite_display: string, lite_identity: string, lite_source: string, lite_initialGraph: { kind: string; name: string; runtime: string; code: string; intValue: bigint; textValue: string }[]): { kind: string; name: string; runtime: string; code: string; intValue: bigint; textValue: string }[] {
        void lite_target;
        void lite_path;
        void lite_display;
        void lite_identity;
        void lite_source;
        void lite_initialGraph;
        if (liteFn$modules$moduleVisited([...(lite_initialGraph)], lite_path)) {
            return [...(lite_initialGraph)];
        }
        let lite_hasVisited = false;
        void lite_hasVisited;
        for (const lite_item of [...(lite_initialGraph)]) {
            void lite_item;
            if ((((lite_item).kind) === ("ModuleVisited"))) {
                lite_hasVisited = true;
                break;
            }
        }
        const lite_isRoot = (!(lite_hasVisited));
        void lite_isRoot;
        const lite_normPath = liteFn$modules$normalizeSlashes(lite_path);
        void lite_normPath;
        const lite_rootDir = (Boolean(lite_isRoot) ? liteFn$modules$dirnameOfPath(lite_normPath) : liteFn$modules$rootDirForGraph([...(lite_initialGraph)]));
        void lite_rootDir;
        const lite_logical = liteFn$modules$logicalModuleName(lite_rootDir, lite_path, lite_display);
        void lite_logical;
        const lite_moduleKey = (Boolean(lite_isRoot) ? "" : liteFn$modules$uniqueModuleKey([...(lite_initialGraph)], lite_target, liteFn$modules$encodeModuleSlug(lite_target, lite_logical)));
        void lite_moduleKey;
        let lite_graph: { kind: string; name: string; runtime: string; code: string; intValue: bigint; textValue: string }[] = [...([...(lite_initialGraph)])];
        void lite_graph;
        lite_graph.push({ kind: "ModuleVisited", name: lite_path, runtime: lite_rootDir, code: lite_logical, intValue: (Boolean(lite_isRoot) ? 1n : 0n), textValue: lite_moduleKey });
        const lite_clauses: { kind: string; name: string; runtime: string; code: string; intValue: bigint; textValue: string }[] = [...(liteFn$frontend$collectImportClauses(lite_target, lite_source, lite_path))];
        void lite_clauses;
        const lite_clausePaths: string[] = [...([])];
        void lite_clausePaths;
        const lite_depPaths: string[] = [...([])];
        void lite_depPaths;
        const lite_depDisplays: string[] = [...([])];
        void lite_depDisplays;
        const lite_depIdentities: string[] = [...([])];
        void lite_depIdentities;
        const lite_depTexts: string[] = [...([])];
        void lite_depTexts;
        const lite_depLogicals: string[] = [...([])];
        void lite_depLogicals;
        let lite_depCount = 0n;
        void lite_depCount;
        for (const lite_clause of [...(lite_clauses)]) {
            void lite_clause;
            const lite_loaded = lite$readSource(lite_path, (lite_clause).textValue);
            void lite_loaded;
            if ((((((lite_loaded).identity) === ("lite.compiler.source-reader.v1"))) && (((lite_identity) !== ("lite.compiler.modules.v1"))))) {
                liteFn$lib$core$diag$fail(lite_display, "the compiler source reader is private to module traversal");
            }
            lite_clausePaths.push((lite_loaded).path);
            if ((!(liteFn$lib$core$list$listContainsText([...(lite_depPaths)], (lite_loaded).path)))) {
                lite_depPaths.push((lite_loaded).path);
                lite_depDisplays.push((lite_loaded).display);
                lite_depIdentities.push((lite_loaded).identity);
                lite_depTexts.push((lite_loaded).text);
                lite_depLogicals.push(liteFn$modules$logicalModuleName(lite_rootDir, (lite_loaded).path, (lite_loaded).display));
                lite_depCount = lite$addInt(lite_depCount, 1n, 14467);
            }
        }
        const lite_sortedOrder: bigint[] = [...(liteFn$modules$sortedDepIndices([...(lite_depLogicals)], [...(lite_depPaths)], lite_depCount))];
        void lite_sortedOrder;
        for (const lite_depIdx of [...(lite_sortedOrder)]) {
            void lite_depIdx;
            const lite_depPath = lite$listAt((lite_depPaths), lite_depIdx, 14620);
            void lite_depPath;
            if ((!(liteFn$modules$moduleVisited([...(lite_graph)], lite_depPath)))) {
                lite_graph = [...(liteFn$modules$visitSourceModule(lite_target, lite_depPath, lite$listAt((lite_depDisplays), lite_depIdx, 14748), lite$listAt((lite_depIdentities), lite_depIdx, 14782), lite$listAt((lite_depTexts), lite_depIdx, 14825), [...(lite_graph)]))];
            }
        }
        let lite_maxChildLevel = (-1n);
        void lite_maxChildLevel;
        for (const lite_depIdx of [...(lite_sortedOrder)]) {
            void lite_depIdx;
            const lite_depPath = lite$listAt((lite_depPaths), lite_depIdx, 14964);
            void lite_depPath;
            if (liteFn$modules$moduleProcessed([...(lite_graph)], lite_depPath)) {
                const lite_childLevel = liteFn$modules$moduleLevelForPath([...(lite_graph)], lite_depPath);
                void lite_childLevel;
                if (((lite_childLevel) > (lite_maxChildLevel))) {
                    lite_maxChildLevel = lite_childLevel;
                }
            }
        }
        const lite_level = lite$addInt(lite_maxChildLevel, 1n, 15197);
        void lite_level;
        let lite_importedExports: { kind: string; name: string; runtime: string; code: string; intValue: bigint; textValue: string }[] = [...([...([])])];
        void lite_importedExports;
        let lite_clauseIndex = 0n;
        void lite_clauseIndex;
        for (const lite_clause of [...(lite_clauses)]) {
            void lite_clause;
            const lite_depPath = lite$listAt((lite_clausePaths), lite_clauseIndex, 15339);
            void lite_depPath;
            if (liteFn$modules$moduleProcessed([...(lite_graph)], lite_depPath)) {
                lite_importedExports = [...(liteFn$modules$appendModuleExports([...(lite_importedExports)], [...(liteFn$modules$moduleAliasExports([...(lite_graph)], lite_depPath, (lite_clause).name))], lite_path))];
            }
            lite_clauseIndex = lite$addInt(lite_clauseIndex, 1n, 15565);
        }
        const lite_localItems: { kind: string; name: string; runtime: string; code: string; intValue: bigint; textValue: string }[] = [...(liteFn$frontend$parseProgramWithModule(lite_target, lite_source, lite_display, [...(lite_importedExports)], lite_moduleKey, lite_identity))];
        void lite_localItems;
        lite_graph.push({ kind: "ModuleStart", name: lite_path, runtime: lite_moduleKey, code: lite_logical, intValue: lite_level, textValue: lite_display });
        for (const lite_item of [...(lite_localItems)]) {
            void lite_item;
            lite_graph.push(lite_item);
        }
        lite_graph.push({ kind: "ModuleEnd", name: lite_path, runtime: lite_moduleKey, code: lite_logical, intValue: lite_level, textValue: "" });
        lite_graph.push({ kind: "ModuleProcessed", name: lite_path, runtime: lite_moduleKey, code: lite_logical, intValue: lite_level, textValue: "" });
        return [...(lite_graph)];
    }
    void liteFn$modules$visitSourceModule;
    function liteFn$modules$moduleItems(lite_graph: { kind: string; name: string; runtime: string; code: string; intValue: bigint; textValue: string }[]): { kind: string; name: string; runtime: string; code: string; intValue: bigint; textValue: string }[] {
        void lite_graph;
        const lite_startIndices: bigint[] = [...([])];
        void lite_startIndices;
        const lite_startLevels: bigint[] = [...([])];
        void lite_startLevels;
        const lite_startLogicals: string[] = [...([])];
        void lite_startLogicals;
        const lite_startPaths: string[] = [...([])];
        void lite_startPaths;
        let lite_moduleCount = 0n;
        void lite_moduleCount;
        let lite_index = 0n;
        void lite_index;
        for (const lite_item of [...(lite_graph)]) {
            void lite_item;
            if ((((lite_item).kind) === ("ModuleStart"))) {
                lite_startIndices.push(lite$addInt(lite_index, 1n, 16760));
                lite_startLevels.push((lite_item).intValue);
                lite_startLogicals.push((lite_item).code);
                lite_startPaths.push((lite_item).name);
                lite_moduleCount = lite$addInt(lite_moduleCount, 1n, 16983);
            }
            lite_index = lite$addInt(lite_index, 1n, 17020);
        }
        const lite_picked: bigint[] = [...([])];
        void lite_picked;
        const lite_result: { kind: string; name: string; runtime: string; code: string; intValue: bigint; textValue: string }[] = [...([])];
        void lite_result;
        let lite_step = 0n;
        void lite_step;
        while (((lite_step) < (lite_moduleCount))) {
            let lite_best = (-1n);
            void lite_best;
            let lite_m = 0n;
            void lite_m;
            while (((lite_m) < (lite_moduleCount))) {
                if ((!(liteFn$modules$listContainsInt([...(lite_picked)], lite_m)))) {
                    if (((lite_best) < (0n))) {
                        lite_best = lite_m;
                    } else if (((lite$listAt((lite_startLevels), lite_m, 17370)) < (lite$listAt((lite_startLevels), lite_best, 17387)))) {
                        lite_best = lite_m;
                    } else if (((lite$listAt((lite_startLevels), lite_m, 17463)) === (lite$listAt((lite_startLevels), lite_best, 17481)))) {
                        const lite_cmpLogical = liteFn$modules$compareText(lite$listAt((lite_startLogicals), lite_m, 17549), lite$listAt((lite_startLogicals), lite_best, 17567));
                        void lite_cmpLogical;
                        if (((((lite_cmpLogical) < (0n))) || ((((((lite_cmpLogical) === (0n))) && (((liteFn$modules$compareText(lite$listAt((lite_startPaths), lite_m, 17660), lite$listAt((lite_startPaths), lite_best, 17675))) < (0n)))))))) {
                            lite_best = lite_m;
                        }
                    }
                }
                lite_m = lite$addInt(lite_m, 1n, 17795);
            }
            lite_picked.push(lite_best);
            let lite_itemIndex = lite$listAt((lite_startIndices), lite_best, 17892);
            void lite_itemIndex;
            while (Boolean(true)) {
                const lite_entry = lite$listAt((lite_graph), lite_itemIndex, 17946);
                void lite_entry;
                if ((((lite_entry).kind) === ("ModuleEnd"))) {
                    break;
                }
                lite_result.push(lite_entry);
                lite_itemIndex = lite$addInt(lite_itemIndex, 1n, 18093);
            }
            lite_step = lite$addInt(lite_step, 1n, 18128);
        }
        return [...(lite_result)];
    }
    void liteFn$modules$moduleItems;
    function liteFn$driver__ts$run(): void {
        const lite_prefix = liteFn$frontend$sourcePrefix();
        void lite_prefix;
        const lite_source = lite$inputAll(undefined, "compiler/src/driver-ts.lts:9:15: InputFault: ");
        void lite_source;
        if (((liteFn$frontend$sourceModulePath()) !== (""))) {
            const lite_graph: { kind: string; name: string; runtime: string; code: string; intValue: bigint; textValue: string }[] = [...(liteFn$modules$visitSourceModule("ts", liteFn$frontend$sourceModulePath(), lite_prefix, liteFn$frontend$sourceModuleIdentity(), lite_source, [...([])]))];
            void lite_graph;
            return (void (liteFn$emit__ts$emitProgram([...(liteFn$modules$moduleItems([...(lite_graph)]))], lite_source, lite_prefix)));
        } else {
            return (void (liteFn$emit__ts$emitProgram([...(liteFn$frontend$parseProgram("ts", lite_source, lite_prefix))], lite_source, lite_prefix)));
        }
    }
    void liteFn$driver__ts$run;
    liteFn$driver__ts$run();
    return lite$out;
}
