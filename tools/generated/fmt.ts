let lite$out = "";

declare const process: {
    argv: string[];
    exit(code: number): never;
    cwd(): string;
    execPath: string;
    platform: string;
    arch: string;
    version: string;
    env: Record<string, string | undefined>;
    getBuiltinModule(name: "node:fs"): {
        readSync(fd: number, buffer: Uint8Array, offset: number, length: number, position: null): number;
        writeSync(fd: number, text: string): number;
        statSync(path: string): { isFile(): boolean; isDirectory(): boolean };
        readFileSync(path: string): Uint8Array;
        writeFileSync(path: string, data: string, encoding: "utf8"): void;
        readdirSync(path: string): string[];
        mkdirSync(path: string, options: { recursive: boolean }): void;
        rmSync(path: string, options: { recursive: boolean; force: boolean }): void;
        cpSync(src: string, dest: string, options: { recursive: boolean; force: boolean }): void;
        symlinkSync(target: string, path: string): void;
        realpathSync(path: string): string;
        mkdtempSync(prefix: string): string;
    };
};
declare const TextDecoder: { new (label: string, options?: { fatal?: boolean }): { decode(input?: Uint8Array, options?: { stream?: boolean }): string } };

function lite$inputArgs(): string[] {
    return process.argv.slice(2);
}

let lite$decoder = new TextDecoder("utf-8", { fatal: true });
const lite$bytes = new Uint8Array(4096);
let lite$byteAt = 0, lite$byteEnd = 0;
let lite$ended = false;
let lite$pending: string | null | undefined;
function lite$resetInput(): void {
    lite$decoder = new TextDecoder("utf-8", { fatal: true });
    lite$byteAt = 0;
    lite$byteEnd = 0;
    lite$ended = false;
    lite$pending = undefined;
}
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

function lite$errMsg(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
}
function lite$fsKind(path: string): string {
    try {
        const st = process.getBuiltinModule("node:fs").statSync(path);
        if (st.isFile()) return "file";
        if (st.isDirectory()) return "dir";
        return "other";
    } catch { return "missing"; }
}
function lite$fsReadText(path: string): { ok: boolean; text: string; error: string } {
    try {
        const bytes = process.getBuiltinModule("node:fs").readFileSync(path);
        return { ok: true, text: new TextDecoder("utf-8", { fatal: true }).decode(bytes), error: "" };
    } catch (error) { return { ok: false, text: "", error: lite$errMsg(error) }; }
}
function lite$fsWriteText(path: string, text: string): { ok: boolean; error: string } {
    try { process.getBuiltinModule("node:fs").writeFileSync(path, text, "utf8"); return { ok: true, error: "" }; }
    catch (error) { return { ok: false, error: lite$errMsg(error) }; }
}
function lite$fsListDir(path: string): string[] {
    return process.getBuiltinModule("node:fs").readdirSync(path).sort();
}

function lite$processCwd(): string { return process.cwd(); }
function lite$processEntryPath(): string { return process.argv[1] ?? ""; }
function lite$processPlatform(): string { return process.platform; }

let lite$lastBmp = "";
const lite$bmpSet = new Set<string>();
const lite$textCache = new Map<string, readonly string[]>();
function lite$isBmp(text: string): boolean {
    if (text === lite$lastBmp) return true;
    const len = text.length;
    if (len === 0) return true;
    if (len === 1) {
        const c = text.charCodeAt(0);
        return c < 0xd800 || c > 0xdfff;
    }
    if (len > 64) {
        if (lite$bmpSet.has(text)) {
            lite$lastBmp = text;
            return true;
        }
        if (lite$textCache.has(text)) return false;
    }
    for (let i = 0; i < len; i += 1) {
        const c = text.charCodeAt(i);
        if (c >= 0xd800 && c <= 0xdfff) return false;
    }
    if (len > 64) {
        if (lite$bmpSet.size >= 64) lite$bmpSet.clear();
        lite$bmpSet.add(text);
        lite$lastBmp = text;
    }
    return true;
}
function lite$textPoints(text: string): readonly string[] {
    const found = lite$textCache.get(text);
    if (found !== undefined) return found;
    const points = Array.from(text);
    if (lite$textCache.size >= 64) lite$textCache.clear();
    lite$textCache.set(text, points);
    return points;
}

function lite$textLength(text: string): bigint {
    if (lite$isBmp(text)) return BigInt(text.length);
    return BigInt(lite$textPoints(text).length);
}

function lite$textAt(text: string, position: bigint, at: number): string {
    if (lite$isBmp(text)) {
        const idx = Number(position);
        if (position < 0n || position >= BigInt(text.length)) {
            lite$fault("BoundPanic", at, "textAt index outside text");
        }
        const bmpValue = text[idx];
        if (bmpValue === undefined) {
            throw new Error("BoundPanic: textAt index outside text");
        }
        return bmpValue;
    }
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
    if (lite$isBmp(text)) {
        if (start < 0n || end < start || end > BigInt(text.length)) {
            lite$fault("BoundPanic", at, "textSlice requires 0 <= start <= end <= textLength(text)");
        }
        return text.slice(Number(start), Number(end));
    }
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

const lite$intLines: readonly number[] = [0, 79, 80, 104, 128, 159, 187, 215, 243, 277, 278, 415, 448, 472, 500, 526, 550, 569, 593, 627, 643, 644, 667, 699, 720, 748, 775, 854, 887, 919, 952, 979, 1000, 1027, 1041, 1077, 1105, 1132, 1180, 1228, 1264, 1299, 1326, 1347, 1400, 1427, 1441, 1523, 1577, 1596, 1678, 1708, 1736, 1764, 1792, 1815, 1859, 1886, 1914, 1942, 1969, 1992, 2022, 2124, 2153, 2181, 2209, 2287, 2320, 2352, 2366, 2389, 2419, 2530, 2563, 2577, 2616, 2645, 2673, 2701, 2724, 2741, 2802, 2830, 2857, 2880, 2890, 2896, 2897, 2940, 3056, 3058, 3059, 3168, 3215, 3253, 3282, 3302, 3335, 3358, 3391, 3409, 3432, 3433, 3453, 3481, 3511, 3555, 3606, 3641, 3651, 3704, 3733, 3758, 3875, 3906, 3923, 3954, 3964, 3965, 4007, 4050, 4104, 4154, 4207, 4237, 4251, 4286, 4337, 4386, 4440, 4493, 4519, 4536, 4581, 4633, 4693, 4741, 4840, 4889, 4936, 4976, 5029, 5055, 5065, 5071, 5072, 5142, 5179, 5224, 5230, 5272, 5315, 5317, 5318, 5342, 5395, 5396, 5420, 5452, 5474, 5493, 5533, 5552, 5621, 5644, 5716, 5727, 5747, 5780, 5806, 5840, 5881, 5920, 5926, 5928, 5929, 5951, 6025, 6041, 6043, 6044, 6088, 6118, 6151, 6170, 6234, 6240, 6263, 6279, 6281, 6282, 6376, 6377, 6393, 6414, 6448, 6472, 6523, 6543, 6549, 6588, 6620, 6647, 6670, 6703, 6720, 6771, 6804, 6864, 6892, 6906, 6916, 6922, 6924, 6925, 6968];
const lite$intSource = "tools/src/fmt.lts:";
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

function lite$divideInt(left: bigint, right: bigint, at: number): bigint {
    if (right === 0n) lite$intFault(at, "division by zero");
    return lite$checkedInt(left / right, at);
}

function lite$remainderInt(left: bigint, right: bigint, at: number): bigint {
    if (right === 0n) lite$intFault(at, "remainder by zero");
    return left % right;
}

export function main(lite$write?: (text: string) => void): string {
    lite$out = "";
    lite$resetInput();
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
    function liteFn$lib$core$list$listCountText(lite_values: string[]): bigint {
        void lite_values;
        let lite_count = 0n;
        void lite_count;
        for (const lite_value of [...(lite_values)]) {
            void lite_value;
            lite_count = lite$addInt(lite_count, 1n, 2101);
        }
        return lite_count;
    }
    void liteFn$lib$core$list$listCountText;
    function liteFn$lib$core$list$listCountInt(lite_values: bigint[]): bigint {
        void lite_values;
        let lite_count = 0n;
        void lite_count;
        for (const lite_value of [...(lite_values)]) {
            void lite_value;
            lite_count = lite$addInt(lite_count, 1n, 2294);
        }
        return lite_count;
    }
    void liteFn$lib$core$list$listCountInt;
    function liteFn$lib$core$list$listCountBool(lite_values: boolean[]): bigint {
        void lite_values;
        let lite_count = 0n;
        void lite_count;
        for (const lite_value of [...(lite_values)]) {
            void lite_value;
            lite_count = lite$addInt(lite_count, 1n, 2489);
        }
        return lite_count;
    }
    void liteFn$lib$core$list$listCountBool;
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
        return ((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((lite_ch) === ("a"))) || (((lite_ch) === ("b"))))) || (((lite_ch) === ("c"))))) || (((lite_ch) === ("d"))))) || (((lite_ch) === ("e"))))) || (((lite_ch) === ("f"))))) || (((lite_ch) === ("g"))))) || (((lite_ch) === ("h"))))) || (((lite_ch) === ("i"))))) || (((lite_ch) === ("j"))))) || (((lite_ch) === ("k"))))) || (((lite_ch) === ("l"))))) || (((lite_ch) === ("m"))))) || (((lite_ch) === ("n"))))) || (((lite_ch) === ("o"))))) || (((lite_ch) === ("p"))))) || (((lite_ch) === ("q"))))) || (((lite_ch) === ("r"))))) || (((lite_ch) === ("s"))))) || (((lite_ch) === ("t"))))) || (((lite_ch) === ("u"))))) || (((lite_ch) === ("v"))))) || (((lite_ch) === ("w"))))) || (((lite_ch) === ("x"))))) || (((lite_ch) === ("y"))))) || (((lite_ch) === ("z"))))) || (((lite_ch) === ("A"))))) || (((lite_ch) === ("B"))))) || (((lite_ch) === ("C"))))) || (((lite_ch) === ("D"))))) || (((lite_ch) === ("E"))))) || (((lite_ch) === ("F"))))) || (((lite_ch) === ("G"))))) || (((lite_ch) === ("H"))))) || (((lite_ch) === ("I"))))) || (((lite_ch) === ("J"))))) || (((lite_ch) === ("K"))))) || (((lite_ch) === ("L"))))) || (((lite_ch) === ("M"))))) || (((lite_ch) === ("N"))))) || (((lite_ch) === ("O"))))) || (((lite_ch) === ("P"))))) || (((lite_ch) === ("Q"))))) || (((lite_ch) === ("R"))))) || (((lite_ch) === ("S"))))) || (((lite_ch) === ("T"))))) || (((lite_ch) === ("U"))))) || (((lite_ch) === ("V"))))) || (((lite_ch) === ("W"))))) || (((lite_ch) === ("X"))))) || (((lite_ch) === ("Y"))))) || (((lite_ch) === ("Z"))));
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
        while (((lite_position) < (lite_size))) {
            const lite_ch = lite$textAt(lite_source, lite_position, 2162);
            void lite_ch;
            if (((((((((lite_ch) === (" "))) || (((lite_ch) === ("\t"))))) || (((lite_ch) === ("\r"))))) || (((lite_ch) === ("\n"))))) {
                lite_position = lite$addInt(lite_position, 1n, 2286);
            } else {
                return lite_position;
            }
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
        while (((((lite_position) < (lite_size))) && (liteFn$lib$core$text$isNameContinue(lite$textAt(lite_source, lite_position, 2601))))) {
            lite_position = lite$addInt(lite_position, 1n, 2658);
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
        const lite_size = lite$textLength(lite_source);
        void lite_size;
        if (((((lite_position) < (0n))) || (((lite$addInt(lite_position, lite_width, 2930)) > (lite_size))))) {
            return false;
        }
        if (((lite_width) === (0n))) {
            return true;
        }
        if (((lite$textAt(lite_source, lite_position, 3005)) !== (lite$textAt(lite_text, 0n, 3035)))) {
            return false;
        }
        if (((lite_width) === (1n))) {
            return true;
        }
        return ((lite$textSlice(lite_source, lite_position, lite$addInt(lite_position, lite_width, 3147), 3109)) === (lite_text));
    }
    void liteFn$lib$core$text$startsWithAt;
    function liteFn$lib$core$text$wordAt(lite_source: string, lite_position: bigint, lite_word: string): boolean {
        void lite_source;
        void lite_position;
        void lite_word;
        if ((!(liteFn$lib$core$text$startsWithAt(lite_source, lite_position, lite_word)))) {
            return false;
        }
        const lite_after = lite$addInt(lite_position, lite$textLength(lite_word), 3444);
        void lite_after;
        return ((((lite_after) >= (lite$textLength(lite_source)))) || ((!(liteFn$lib$core$text$isNameContinue(lite$textAt(lite_source, lite_after, 3520))))));
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
        const lite_first = lite$textAt(lite_needle, 0n, 3913);
        void lite_first;
        if (((lite_width) === (1n))) {
            while (((lite_position) < (lite_size))) {
                if (((lite$textAt(lite_source, lite_position, 3999)) === (lite_first))) {
                    return lite_position;
                }
                lite_position = lite$addInt(lite_position, 1n, 4087);
            }
            return (-1n);
        }
        while (((lite$addInt(lite_position, lite_width, 4145)) <= (lite_size))) {
            if (((((lite$textAt(lite_source, lite_position, 4174)) === (lite_first))) && (liteFn$lib$core$text$startsWithAt(lite_source, lite_position, lite_needle)))) {
                return lite_position;
            }
            lite_position = lite$addInt(lite_position, 1n, 4301);
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
        if (((lite$textAt(lite_text, 0n, 5022)) === ("-"))) {
            lite_negative = true;
            lite_position = 1n;
        } else if (((lite$textAt(lite_text, 0n, 5109)) === ("+"))) {
            lite_position = 1n;
        }
        if (((lite_position) >= (lite_size))) {
            return { value: 0n, ok: false };
        }
        let lite_value = 0n;
        void lite_value;
        while (((lite_position) < (lite_size))) {
            const lite_ch = lite$textAt(lite_text, lite_position, 5284);
            void lite_ch;
            if ((!(liteFn$lib$core$text$isDigit(lite_ch)))) {
                return { value: 0n, ok: false };
            }
            const lite_digit = liteFn$lib$core$text$digitValue(lite_ch);
            void lite_digit;
            if (lite_negative) {
                if (((lite_value) < (lite$divideInt((lite$addInt(liteFn$lib$core$int$intMin(), lite_digit, 5468)), 10n, 5477)))) {
                    return { value: 0n, ok: false };
                }
                lite_value = lite$subtractInt(lite$multiplyInt(lite_value, 10n, 5544), lite_digit, 5549);
            } else {
                if (((lite_value) > (lite$divideInt((lite$subtractInt(liteFn$lib$core$int$intMax(), lite_digit, 5616)), 10n, 5625)))) {
                    return { value: 0n, ok: false };
                }
                lite_value = lite$addInt(lite$multiplyInt(lite_value, 10n, 5692), lite_digit, 5697);
            }
            lite_position = lite$addInt(lite_position, 1n, 5744);
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
        return lite$textAt(lite_text, lite_position, 6043);
    }
    void liteFn$lib$core$text$at;
    function liteFn$lib$core$text$slice(lite_text: string, lite_start: bigint, lite_end: bigint): string {
        void lite_text;
        void lite_start;
        void lite_end;
        return lite$textSlice(lite_text, lite_start, lite_end, 6228);
    }
    void liteFn$lib$core$text$slice;
    function liteFn$lib$core$text$isWhitespace(lite_ch: string): boolean {
        void lite_ch;
        return ((((((((lite_ch) === (" "))) || (((lite_ch) === ("\t"))))) || (((lite_ch) === ("\r"))))) || (((lite_ch) === ("\n"))));
    }
    void liteFn$lib$core$text$isWhitespace;
    function liteFn$lib$core$text$trimStart(lite_source: string): string {
        void lite_source;
        const lite_size = lite$textLength(lite_source);
        void lite_size;
        let lite_start = 0n;
        void lite_start;
        while (((((lite_start) < (lite_size))) && (liteFn$lib$core$text$isWhitespace(lite$textAt(lite_source, lite_start, 6646))))) {
            lite_start = lite$addInt(lite_start, 1n, 6694);
        }
        return lite$textSlice(lite_source, lite_start, lite_size, 6709);
    }
    void liteFn$lib$core$text$trimStart;
    function liteFn$lib$core$text$trimEnd(lite_source: string): string {
        void lite_source;
        let lite_end = lite$textLength(lite_source);
        void lite_end;
        while (((((lite_end) > (0n))) && (liteFn$lib$core$text$isWhitespace(lite$textAt(lite_source, lite$subtractInt(lite_end, 1n, 6947), 6927))))) {
            lite_end = lite$subtractInt(lite_end, 1n, 6973);
        }
        return lite$textSlice(lite_source, 0n, lite_end, 6988);
    }
    void liteFn$lib$core$text$trimEnd;
    function liteFn$lib$core$text$trim(lite_source: string): string {
        void lite_source;
        return liteFn$lib$core$text$trimEnd(liteFn$lib$core$text$trimStart(lite_source));
    }
    void liteFn$lib$core$text$trim;
    function liteFn$lib$core$text$endsWith(lite_source: string, lite_suffix: string): boolean {
        void lite_source;
        void lite_suffix;
        const lite_sourceLen = lite$textLength(lite_source);
        void lite_sourceLen;
        const lite_suffixLen = lite$textLength(lite_suffix);
        void lite_suffixLen;
        if (((lite_suffixLen) > (lite_sourceLen))) {
            return false;
        }
        return liteFn$lib$core$text$startsWithAt(lite_source, lite$subtractInt(lite_sourceLen, lite_suffixLen, 7442), lite_suffix);
    }
    void liteFn$lib$core$text$endsWith;
    function liteFn$lib$core$text$repeatText(lite_value: string, lite_count: bigint): string {
        void lite_value;
        void lite_count;
        if (((lite_count) <= (0n))) {
            return "";
        }
        let lite_out = "";
        void lite_out;
        let lite_i = 0n;
        void lite_i;
        while (((lite_i) < (lite_count))) {
            lite_out = ((lite_out) + (lite_value));
            lite_i = lite$addInt(lite_i, 1n, 7734);
        }
        return lite_out;
    }
    void liteFn$lib$core$text$repeatText;
    function liteFn$lib$util$path$isWin32(): boolean {
        return ((lite$processPlatform()) === ("win32"));
    }
    void liteFn$lib$util$path$isWin32;
    function liteFn$lib$util$path$sep(): string {
        if (liteFn$lib$util$path$isWin32()) {
            return "\\";
        }
        return "/";
    }
    void liteFn$lib$util$path$sep;
    function liteFn$lib$util$path$isSep(lite_ch: string): boolean {
        void lite_ch;
        return ((((lite_ch) === ("/"))) || ((((liteFn$lib$util$path$isWin32()) && (((lite_ch) === ("\\")))))));
    }
    void liteFn$lib$util$path$isSep;
    function liteFn$lib$util$path$isAbsolute(lite_target: string): boolean {
        void lite_target;
        const lite_size = liteFn$lib$core$text$length(lite_target);
        void lite_size;
        if (((lite_size) === (0n))) {
            return false;
        }
        if (liteFn$lib$util$path$isSep(liteFn$lib$core$text$at(lite_target, 0n))) {
            return true;
        }
        return ((((((liteFn$lib$util$path$isWin32()) && (((lite_size) >= (2n))))) && (liteFn$lib$core$text$isAsciiLetter(liteFn$lib$core$text$at(lite_target, 0n))))) && (((liteFn$lib$core$text$at(lite_target, 1n)) === (":"))));
    }
    void liteFn$lib$util$path$isAbsolute;
    function liteFn$lib$util$path$normalize(lite_raw: string): string {
        void lite_raw;
        const lite_size = liteFn$lib$core$text$length(lite_raw);
        void lite_size;
        if (((lite_size) === (0n))) {
            return ".";
        }
        const lite_separator = liteFn$lib$util$path$sep();
        void lite_separator;
        let lite_rootPrefix = "";
        void lite_rootPrefix;
        let lite_start = 0n;
        void lite_start;
        if (((((((liteFn$lib$util$path$isWin32()) && (((lite_size) >= (2n))))) && (liteFn$lib$core$text$isAsciiLetter(liteFn$lib$core$text$at(lite_raw, 0n))))) && (((liteFn$lib$core$text$at(lite_raw, 1n)) === (":"))))) {
            const lite_drive = liteFn$lib$core$text$slice(lite_raw, 0n, 2n);
            void lite_drive;
            if (((((lite_size) >= (3n))) && (liteFn$lib$util$path$isSep(liteFn$lib$core$text$at(lite_raw, 2n))))) {
                lite_rootPrefix = ((lite_drive) + (lite_separator));
                lite_start = 3n;
            } else {
                lite_rootPrefix = lite_drive;
                lite_start = 2n;
            }
        } else if (liteFn$lib$util$path$isSep(liteFn$lib$core$text$at(lite_raw, 0n))) {
            lite_rootPrefix = lite_separator;
            lite_start = 1n;
        }
        const lite_parts: string[] = [...([])];
        void lite_parts;
        let lite_partsCount = 0n;
        void lite_partsCount;
        let lite_segStart = lite_start;
        void lite_segStart;
        let lite_i = lite_start;
        void lite_i;
        while (((lite_i) <= (lite_size))) {
            const lite_atEnd = ((lite_i) === (lite_size));
            void lite_atEnd;
            if (((lite_atEnd) || (liteFn$lib$util$path$isSep(liteFn$lib$core$text$at(lite_raw, lite_i))))) {
                if (((lite_i) > (lite_segStart))) {
                    const lite_seg = liteFn$lib$core$text$slice(lite_raw, lite_segStart, lite_i);
                    void lite_seg;
                    if (((lite_seg) === (".."))) {
                        if (((((lite_partsCount) > (0n))) && ((((((lite_rootPrefix) !== (""))) || (((lite$listAt((lite_parts), lite$subtractInt(lite_partsCount, 1n, 1941), 1930)) !== ("..")))))))) {
                            lite$listPopBack(lite_parts, 1982);
                            lite_partsCount = lite$subtractInt(lite_partsCount, 1n, 2055);
                        } else if (((lite_rootPrefix) === (""))) {
                            lite_parts.push("..");
                            lite_partsCount = lite$addInt(lite_partsCount, 1n, 2213);
                        }
                    } else if (((lite_seg) !== ("."))) {
                        lite_parts.push(lite_seg);
                        lite_partsCount = lite$addInt(lite_partsCount, 1n, 2375);
                    }
                }
                lite_segStart = lite$addInt(lite_i, 1n, 2437);
            }
            lite_i = lite$addInt(lite_i, 1n, 2466);
        }
        if (((lite_partsCount) === (0n))) {
            if (((lite_rootPrefix) !== (""))) {
                return lite_rootPrefix;
            }
            return ".";
        }
        return ((lite_rootPrefix) + (liteFn$lib$core$text$joinTexts([...(lite_parts)], lite_separator)));
    }
    void liteFn$lib$util$path$normalize;
    function liteFn$lib$util$path$join(lite_baseDir: string, lite_target: string): string {
        void lite_baseDir;
        void lite_target;
        if (((lite_baseDir) === (""))) {
            return liteFn$lib$util$path$normalize(lite_target);
        }
        if (((lite_target) === (""))) {
            return liteFn$lib$util$path$normalize(lite_baseDir);
        }
        return liteFn$lib$util$path$normalize(((((lite_baseDir) + (liteFn$lib$util$path$sep()))) + (lite_target)));
    }
    void liteFn$lib$util$path$join;
    function liteFn$lib$util$path$resolve(lite_baseDir: string, lite_target: string): string {
        void lite_baseDir;
        void lite_target;
        if (liteFn$lib$util$path$isAbsolute(lite_target)) {
            return liteFn$lib$util$path$normalize(lite_target);
        }
        return liteFn$lib$util$path$join(lite_baseDir, lite_target);
    }
    void liteFn$lib$util$path$resolve;
    function liteFn$lib$util$path$parentDir(lite_target: string): string {
        void lite_target;
        return liteFn$lib$util$path$resolve(lite_target, "..");
    }
    void liteFn$lib$util$path$parentDir;
    function liteFn$lib$util$path$baseName(lite_target: string): string {
        void lite_target;
        let lite_end = liteFn$lib$core$text$length(lite_target);
        void lite_end;
        while (((((lite_end) > (0n))) && (liteFn$lib$util$path$isSep(liteFn$lib$core$text$at(lite_target, lite$subtractInt(lite_end, 1n, 3483)))))) {
            lite_end = lite$subtractInt(lite_end, 1n, 3509);
        }
        if (((lite_end) === (0n))) {
            return "";
        }
        let lite_pos = lite_end;
        void lite_pos;
        while (((((lite_pos) > (0n))) && ((!(liteFn$lib$util$path$isSep(liteFn$lib$core$text$at(lite_target, lite$subtractInt(lite_pos, 1n, 3622)))))))) {
            lite_pos = lite$subtractInt(lite_pos, 1n, 3648);
        }
        return liteFn$lib$core$text$slice(lite_target, lite_pos, lite_end);
    }
    void liteFn$lib$util$path$baseName;
    function liteFn$lib$util$path$extName(lite_target: string): string {
        void lite_target;
        const lite_base = liteFn$lib$util$path$baseName(lite_target);
        void lite_base;
        if (((((((lite_base) === (""))) || (((lite_base) === ("."))))) || (((lite_base) === (".."))))) {
            return "";
        }
        const lite_size = liteFn$lib$core$text$length(lite_base);
        void lite_size;
        let lite_i = lite$subtractInt(lite_size, 1n, 3980);
        void lite_i;
        while (((lite_i) > (0n))) {
            if (((liteFn$lib$core$text$at(lite_base, lite_i)) === ("."))) {
                return liteFn$lib$core$text$slice(lite_base, lite_i, lite_size);
            }
            lite_i = lite$subtractInt(lite_i, 1n, 4109);
        }
        return "";
    }
    void liteFn$lib$util$path$extName;
    function liteFn$lib$util$fs$defaultIgnoredDirs(): string[] {
        const lite_dirs: string[] = [...(["node_modules", "dist"])];
        void lite_dirs;
        return [...(lite_dirs)];
    }
    void liteFn$lib$util$fs$defaultIgnoredDirs;
    function liteFn$lib$util$fs$collectFiles(lite_baseDir: string, lite_targets: string[], lite_extension: string, lite_ignoredNames: string[], lite_skipDotEntries: boolean): string[] {
        void lite_baseDir;
        void lite_targets;
        void lite_extension;
        void lite_ignoredNames;
        void lite_skipDotEntries;
        const lite_files: string[] = [...([])];
        void lite_files;
        const lite_stack: string[] = [...([])];
        void lite_stack;
        let lite_stackCount = 0n;
        void lite_stackCount;
        let lite_targetIdx = lite$subtractInt(liteFn$lib$core$list$listCountText([...(lite_targets)]), 1n, 838);
        void lite_targetIdx;
        while (((lite_targetIdx) >= (0n))) {
            lite_stack.push(liteFn$lib$util$path$resolve(lite_baseDir, lite$listAt((lite_targets), lite_targetIdx, 932)));
            lite_stackCount = lite$addInt(lite_stackCount, 1n, 978);
            lite_targetIdx = lite$subtractInt(lite_targetIdx, 1n, 1013);
        }
        while (((lite_stackCount) > (0n))) {
            const lite_resolved = lite$listPopBack(lite_stack, 1071);
            void lite_resolved;
            lite_stackCount = lite$subtractInt(lite_stackCount, 1n, 1128);
            const lite_kind = lite$fsKind(lite_resolved);
            void lite_kind;
            if (((lite_kind) === ("missing"))) {
                lite$reportError((((("ENOENT: no such file or directory, stat '") + (lite_resolved))) + ("'")));
                return lite$exit(1n);
            }
            if (((lite_kind) === ("dir"))) {
                const lite_entries: string[] = [...(lite$fsListDir(lite_resolved))];
                void lite_entries;
                let lite_entryIdx = lite$subtractInt(liteFn$lib$core$list$listCountText([...(lite_entries)]), 1n, 1449);
                void lite_entryIdx;
                while (((lite_entryIdx) >= (0n))) {
                    const lite_entry = lite$listAt((lite_entries), lite_entryIdx, 1520);
                    void lite_entry;
                    const lite_isDot = ((lite_skipDotEntries) && (liteFn$lib$core$text$startsWithAt(lite_entry, 0n, ".")));
                    void lite_isDot;
                    if ((((!(lite_isDot))) && ((!(liteFn$lib$core$list$listContainsText([...(lite_ignoredNames)], lite_entry)))))) {
                        lite_stack.push(liteFn$lib$util$path$resolve(lite_resolved, lite_entry));
                        lite_stackCount = lite$addInt(lite_stackCount, 1n, 1812);
                    }
                    lite_entryIdx = lite$subtractInt(lite_entryIdx, 1n, 1871);
                }
            } else if (((((lite_extension) === (""))) || (liteFn$lib$core$text$endsWith(lite_resolved, lite_extension)))) {
                lite_files.push(lite_resolved);
            }
        }
        return [...(lite_files)];
    }
    void liteFn$lib$util$fs$collectFiles;
    function liteFn$lib$util$project$findRepoRootFrom(lite_startPath: string): string {
        void lite_startPath;
        if (((lite_startPath) === (""))) {
            return "";
        }
        let lite_dir = liteFn$lib$util$path$normalize(lite_startPath);
        void lite_dir;
        if (((lite$fsKind(lite_dir)) !== ("dir"))) {
            lite_dir = liteFn$lib$util$path$parentDir(lite_dir);
        }
        let lite_steps = 0n;
        void lite_steps;
        while (((lite_steps) < (16n))) {
            const lite_versionsPath = liteFn$lib$util$path$resolve(lite_dir, "config/versions.json");
            void lite_versionsPath;
            if (((lite$fsKind(lite_versionsPath)) === ("file"))) {
                return lite_dir;
            }
            const lite_next = liteFn$lib$util$path$parentDir(lite_dir);
            void lite_next;
            if (((lite_next) === (lite_dir))) {
                break;
            }
            lite_dir = lite_next;
            lite_steps = lite$addInt(lite_steps, 1n, 724);
        }
        return "";
    }
    void liteFn$lib$util$project$findRepoRootFrom;
    function liteFn$lib$util$project$findRepoRoot(): string {
        const lite_root = liteFn$lib$util$project$findRepoRootFrom(lite$processEntryPath());
        void lite_root;
        if (((lite_root) !== (""))) {
            return lite_root;
        }
        return liteFn$lib$util$project$findRepoRootFrom(lite$processCwd());
    }
    void liteFn$lib$util$project$findRepoRoot;
    function liteFn$lib$util$project$readComponentVersion(lite_component: string): string {
        void lite_component;
        const lite_root = liteFn$lib$util$project$findRepoRoot();
        void lite_root;
        if (((lite_root) === (""))) {
            return "unassigned";
        }
        const lite_versionsPath = liteFn$lib$util$path$resolve(lite_root, "config/versions.json");
        void lite_versionsPath;
        const lite_readRes = lite$fsReadText(lite_versionsPath);
        void lite_readRes;
        if ((!((lite_readRes).ok))) {
            return "unassigned";
        }
        const lite_content = (lite_readRes).text;
        void lite_content;
        const lite_size = liteFn$lib$core$text$length(lite_content);
        void lite_size;
        const lite_needle = (((("\"") + (lite_component))) + ("\""));
        void lite_needle;
        const lite_needleLen = liteFn$lib$core$text$length(lite_needle);
        void lite_needleLen;
        let lite_searchFrom = 0n;
        void lite_searchFrom;
        while (((lite_searchFrom) < (lite_size))) {
            const lite_keyPos = liteFn$lib$core$text$indexOfText(lite_content, lite_needle, lite_searchFrom);
            void lite_keyPos;
            if (((lite_keyPos) < (0n))) {
                return "unassigned";
            }
            const lite_afterKey = liteFn$lib$core$text$skipSpaces(lite_content, lite$addInt(lite_keyPos, lite_needleLen, 1792));
            void lite_afterKey;
            if (((((lite_afterKey) < (lite_size))) && (((liteFn$lib$core$text$at(lite_content, lite_afterKey)) === (":"))))) {
                let lite_pos = liteFn$lib$core$text$skipSpaces(lite_content, lite$addInt(lite_afterKey, 1n, 1930));
                void lite_pos;
                if (liteFn$lib$core$text$startsWithAt(lite_content, lite_pos, "null")) {
                    return "unassigned";
                }
                if (((((lite_pos) < (lite_size))) && (((liteFn$lib$core$text$at(lite_content, lite_pos)) === ("\""))))) {
                    lite_pos = lite$addInt(lite_pos, 1n, 2104);
                    const lite_start = lite_pos;
                    void lite_start;
                    while (((lite_pos) < (lite_size))) {
                        const lite_ch = liteFn$lib$core$text$at(lite_content, lite_pos);
                        void lite_ch;
                        if (((lite_ch) === ("\\"))) {
                            lite_pos = lite$addInt(lite_pos, 2n, 2292);
                        } else if (((lite_ch) === ("\""))) {
                            return liteFn$lib$core$text$slice(lite_content, lite_start, lite_pos);
                        } else {
                            lite_pos = lite$addInt(lite_pos, 1n, 2467);
                        }
                    }
                    return "unassigned";
                }
            }
            lite_searchFrom = lite$addInt(lite_keyPos, lite_needleLen, 2601);
        }
        return "unassigned";
    }
    void liteFn$lib$util$project$readComponentVersion;
    function liteFn$lib$util$project$handleVersionFlag(lite_args: string[], lite_component: string, lite_command: string): void {
        void lite_args;
        void lite_component;
        void lite_command;
        const lite_argCount = liteFn$lib$core$list$listCountText([...(lite_args)]);
        void lite_argCount;
        if (((((lite_argCount) > (0n))) && (((lite$listAt((lite_args), 0n, 2897)) === ("--version"))))) {
            if (((lite_argCount) !== (1n))) {
                lite$reportError((((("Usage: lite ") + (lite_command))) + (" --version")));
                lite$exit(2n);
            }
            lite$emit((((((("lite ") + (lite_command))) + (" "))) + (liteFn$lib$util$project$readComponentVersion(lite_component))) + "\n");
            lite$exit(0n);
        }
    }
    void liteFn$lib$util$project$handleVersionFlag;
    function liteFn_scanLineBraces(lite_line: string, lite_startInBlock: boolean): { leadingCloses: bigint; netChange: bigint; normalized: string; inBlockComment: boolean } {
        void lite_line;
        void lite_startInBlock;
        let lite_inBlock = lite_startInBlock;
        void lite_inBlock;
        let lite_inString = "";
        void lite_inString;
        let lite_leadingCloses = 0n;
        void lite_leadingCloses;
        let lite_sawCode = false;
        void lite_sawCode;
        let lite_netChange = 0n;
        void lite_netChange;
        let lite_out = "";
        void lite_out;
        let lite_lastChar = "";
        void lite_lastChar;
        const lite_lineLen = liteFn$lib$core$text$length(lite_line);
        void lite_lineLen;
        let lite_i = 0n;
        void lite_i;
        while (((lite_i) < (lite_lineLen))) {
            const lite_ch = liteFn$lib$core$text$at(lite_line, lite_i);
            void lite_ch;
            if (lite_inBlock) {
                lite_out = ((lite_out) + (lite_ch));
                lite_lastChar = lite_ch;
                if (((((((lite_ch) === ("*"))) && (((lite$addInt(lite_i, 1n, 806)) < (lite_lineLen))))) && (((liteFn$lib$core$text$at(lite_line, lite$addInt(lite_i, 1n, 840))) === ("/"))))) {
                    lite_out = ((lite_out) + ("/"));
                    lite_lastChar = "/";
                    lite_inBlock = false;
                    lite_i = lite$addInt(lite_i, 2n, 974);
                } else {
                    lite_i = lite$addInt(lite_i, 1n, 1022);
                }
            } else if (((lite_inString) !== (""))) {
                lite_out = ((lite_out) + (lite_ch));
                lite_lastChar = lite_ch;
                if (((((lite_ch) === ("\\"))) && (((lite$addInt(lite_i, 1n, 1164)) < (lite_lineLen))))) {
                    const lite_nextCh = liteFn$lib$core$text$at(lite_line, lite$addInt(lite_i, 1n, 1222));
                    void lite_nextCh;
                    lite_out = ((lite_out) + (lite_nextCh));
                    lite_lastChar = lite_nextCh;
                    lite_i = lite$addInt(lite_i, 2n, 1321);
                } else {
                    if (((lite_ch) === (lite_inString))) {
                        lite_inString = "";
                    }
                    lite_i = lite$addInt(lite_i, 1n, 1422);
                }
            } else if (((((((lite_ch) === ("/"))) && (((lite$addInt(lite_i, 1n, 1475)) < (lite_lineLen))))) && (((liteFn$lib$core$text$at(lite_line, lite$addInt(lite_i, 1n, 1509))) === ("/"))))) {
                lite_out = ((lite_out) + (liteFn$lib$core$text$slice(lite_line, lite_i, lite_lineLen)));
                break;
            } else if (((((((lite_ch) === ("/"))) && (((lite$addInt(lite_i, 1n, 1630)) < (lite_lineLen))))) && (((liteFn$lib$core$text$at(lite_line, lite$addInt(lite_i, 1n, 1664))) === ("*"))))) {
                lite_out = ((lite_out) + ("/*"));
                lite_lastChar = "*";
                lite_inBlock = true;
                lite_sawCode = true;
                lite_i = lite$addInt(lite_i, 2n, 1810);
            } else if (((((lite_ch) === ("\""))) || (((lite_ch) === ("'"))))) {
                lite_inString = lite_ch;
                lite_sawCode = true;
                lite_out = ((lite_out) + (lite_ch));
                lite_lastChar = lite_ch;
                lite_i = lite$addInt(lite_i, 1n, 1987);
            } else if (((lite_ch) === ("}"))) {
                if ((!(lite_sawCode))) {
                    lite_leadingCloses = lite$addInt(lite_leadingCloses, 1n, 2081);
                } else {
                    lite_netChange = lite$subtractInt(lite_netChange, 1n, 2117);
                }
                lite_out = ((lite_out) + ("}"));
                lite_lastChar = "}";
                lite_sawCode = true;
                if (((((lite$addInt(lite_i, 1n, 2226)) < (lite_lineLen))) && (liteFn$lib$core$text$isAsciiLetter(liteFn$lib$core$text$at(lite_line, lite$addInt(lite_i, 1n, 2279)))))) {
                    lite_out = ((lite_out) + (" "));
                    lite_lastChar = " ";
                }
                lite_i = lite$addInt(lite_i, 1n, 2384);
            } else if (((lite_ch) === ("{"))) {
                if (((((((((lite_lastChar) !== (""))) && ((!(liteFn$lib$core$text$isWhitespace(lite_lastChar)))))) && (((lite_lastChar) !== ("("))))) && (((lite_lastChar) !== ("["))))) {
                    lite_out = ((lite_out) + (" "));
                }
                lite_netChange = lite$addInt(lite_netChange, 1n, 2611);
                lite_out = ((lite_out) + ("{"));
                lite_lastChar = "{";
                lite_sawCode = true;
                lite_i = lite$addInt(lite_i, 1n, 2719);
            } else {
                if ((!(liteFn$lib$core$text$isWhitespace(lite_ch)))) {
                    lite_sawCode = true;
                }
                lite_out = ((lite_out) + (lite_ch));
                lite_lastChar = lite_ch;
                lite_i = lite$addInt(lite_i, 1n, 2875);
            }
        }
        const lite_totalNet = lite$subtractInt(lite_netChange, lite_leadingCloses, 2923);
        void lite_totalNet;
        return { leadingCloses: lite_leadingCloses, netChange: lite_totalNet, normalized: liteFn$lib$core$text$trimEnd(lite_out), inBlockComment: lite_inBlock };
    }
    void liteFn_scanLineBraces;
    function liteFn_formatLite(lite_source: string): string {
        void lite_source;
        const lite_formatted: string[] = [...([])];
        void lite_formatted;
        let lite_formattedCount = 0n;
        void lite_formattedCount;
        let lite_depth = 0n;
        void lite_depth;
        let lite_inBlockComment = false;
        void lite_inBlockComment;
        let lite_blankRun = 0n;
        void lite_blankRun;
        const lite_size = liteFn$lib$core$text$length(lite_source);
        void lite_size;
        let lite_pos = 0n;
        void lite_pos;
        let lite_done = false;
        void lite_done;
        while ((!(lite_done))) {
            let lite_lineEnd = lite_pos;
            void lite_lineEnd;
            while (((lite_lineEnd) < (lite_size))) {
                const lite_ch = liteFn$lib$core$text$at(lite_source, lite_lineEnd);
                void lite_ch;
                if (((((lite_ch) === ("\n"))) || (((lite_ch) === ("\r"))))) {
                    break;
                }
                lite_lineEnd = lite$addInt(lite_lineEnd, 1n, 3636);
            }
            const lite_rawLine = liteFn$lib$core$text$slice(lite_source, lite_pos, lite_lineEnd);
            void lite_rawLine;
            if (((lite_lineEnd) >= (lite_size))) {
                lite_done = true;
            } else if (((((((liteFn$lib$core$text$at(lite_source, lite_lineEnd)) === ("\r"))) && (((lite$addInt(lite_lineEnd, 1n, 3821)) < (lite_size))))) && (((liteFn$lib$core$text$at(lite_source, lite$addInt(lite_lineEnd, 1n, 3860))) === ("\n"))))) {
                lite_pos = lite$addInt(lite_lineEnd, 2n, 3901);
            } else {
                lite_pos = lite$addInt(lite_lineEnd, 1n, 3949);
            }
            const lite_trimmed = liteFn$lib$core$text$trimEnd(lite_rawLine);
            void lite_trimmed;
            if (((liteFn$lib$core$text$trimStart(lite_trimmed)) === (""))) {
                if (((((lite_formattedCount) > (0n))) && (((lite_blankRun) === (0n))))) {
                    lite_formatted.push("");
                    lite_formattedCount = lite$addInt(lite_formattedCount, 1n, 4202);
                    lite_blankRun = 1n;
                }
            } else if (lite_inBlockComment) {
                lite_formatted.push(lite_trimmed);
                lite_formattedCount = lite$addInt(lite_formattedCount, 1n, 4381);
                const lite_scanned = liteFn_scanLineBraces(lite_trimmed, true);
                void lite_scanned;
                lite_inBlockComment = (lite_scanned).inBlockComment;
                lite_blankRun = 0n;
            } else {
                const lite_body = liteFn$lib$core$text$trimStart(lite_trimmed);
                void lite_body;
                const lite_scanned = liteFn_scanLineBraces(lite_body, false);
                void lite_scanned;
                let lite_lineDepth = lite$subtractInt(lite_depth, (lite_scanned).leadingCloses, 4668);
                void lite_lineDepth;
                if (((lite_lineDepth) < (0n))) {
                    lite_lineDepth = 0n;
                }
                lite_formatted.push(((liteFn$lib$core$text$repeatText("    ", lite_lineDepth)) + ((lite_scanned).normalized)));
                lite_formattedCount = lite$addInt(lite_formattedCount, 1n, 4884);
                lite_depth = lite$addInt(lite_depth, (lite_scanned).netChange, 4915);
                if (((lite_depth) < (0n))) {
                    lite_depth = 0n;
                }
                lite_inBlockComment = (lite_scanned).inBlockComment;
                lite_blankRun = 0n;
            }
        }
        while (((((lite_formattedCount) > (0n))) && (((lite$listAt((lite_formatted), lite$subtractInt(lite_formattedCount, 1n, 5129), 5114)) === (""))))) {
            lite$listPopBack(lite_formatted, 5150);
            lite_formattedCount = lite$subtractInt(lite_formattedCount, 1n, 5219);
        }
        if (((lite_formattedCount) === (0n))) {
            return "";
        }
        return ((liteFn$lib$core$text$joinTexts([...(lite_formatted)], "\n")) + ("\n"));
    }
    void liteFn_formatLite;
    const lite_args: string[] = [...(lite$inputArgs())];
    void lite_args;
    liteFn$lib$util$project$handleVersionFlag([...(lite_args)], "formatter", "fmt");
    let lite_checkOnly = false;
    void lite_checkOnly;
    const lite_targets: string[] = [...([])];
    void lite_targets;
    let lite_targetCount = 0n;
    void lite_targetCount;
    for (const lite_arg of [...(lite_args)]) {
        void lite_arg;
        if (((((lite_arg) === ("--help"))) || (((lite_arg) === ("-h"))))) {
            lite$emit("Usage: ./bin/lite fmt [--check] [FILE_OR_DIR... | -]\n\nOptions:\n  --check   Exit with status 1 if any file is not formatted\n");
            return lite$exit(0n);
        } else if (((lite_arg) === ("--check"))) {
            lite_checkOnly = true;
        } else if (((lite_arg) !== ("--write"))) {
            lite_targets.push(lite_arg);
            lite_targetCount = lite$addInt(lite_targetCount, 1n, 5915);
        }
    }
    if (((lite_targetCount) === (0n))) {
        lite$reportError("Usage: ./bin/lite fmt [--check] [FILE_OR_DIR... | -]");
        return lite$exit(2n);
    }
    if (((((lite_targetCount) === (1n))) && (((lite$listAt((lite_targets), 0n, 6076)) === ("-"))))) {
        const lite_input = lite$inputAll("", "tools/src/fmt.lts:183:14: InputFault: ");
        void lite_input;
        const lite_output = liteFn_formatLite(lite_input);
        void lite_output;
        if (lite_checkOnly) {
            if (((lite_input) === (lite_output))) {
                return lite$exit(0n);
            } else {
                return lite$exit(1n);
            }
        }
        lite$emit(lite_output);
        return lite$exit(0n);
    }
    const lite_files: string[] = [...(liteFn$lib$util$fs$collectFiles(lite$processCwd(), [...(lite_targets)], ".lts", [...(liteFn$lib$util$fs$defaultIgnoredDirs())], true))];
    void lite_files;
    let lite_dirty = 0n;
    void lite_dirty;
    for (const lite_file of [...(lite_files)]) {
        void lite_file;
        const lite_readRes = lite$fsReadText(lite_file);
        void lite_readRes;
        if ((!((lite_readRes).ok))) {
            lite$reportError(((((lite_file) + (": "))) + ((lite_readRes).error)));
            return lite$exit(1n);
        }
        const lite_after = liteFn_formatLite((lite_readRes).text);
        void lite_after;
        if ((((lite_readRes).text) !== (lite_after))) {
            lite_dirty = lite$addInt(lite_dirty, 1n, 6642);
            if (lite_checkOnly) {
                lite$emit(lite_file + "\n");
            } else {
                const lite_writeRes = lite$fsWriteText(lite_file, lite_after);
                void lite_writeRes;
                if ((!((lite_writeRes).ok))) {
                    lite$reportError(((((lite_file) + (": "))) + ((lite_writeRes).error)));
                    return lite$exit(1n);
                }
            }
        }
    }
    if (((lite_checkOnly) && (((lite_dirty) > (0n))))) {
        return lite$exit(1n);
    }
    return lite$out;
}

if ((import.meta as { readonly main?: boolean }).main === true) {
    main((text: string): void => {
        process.getBuiltinModule("node:fs").writeSync(1, text);
    });
}
