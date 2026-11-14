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

const lite$intLines: readonly number[] = [0, 79, 80, 104, 128, 159, 187, 215, 216, 254, 310, 312, 313, 351, 385, 444, 467, 473, 502, 504, 505, 545, 576, 596, 658, 685, 691, 725, 727, 728, 782, 818, 856, 902, 961, 963, 964, 1005, 1024, 1040, 1061, 1089, 1108, 1114, 1122, 1124, 1125, 1262, 1295, 1319, 1347, 1373, 1397, 1416, 1440, 1474, 1490, 1491, 1514, 1546, 1567, 1595, 1622, 1701, 1734, 1766, 1799, 1826, 1847, 1874, 1888, 1924, 1952, 1979, 2027, 2075, 2111, 2146, 2173, 2194, 2247, 2274, 2288, 2370, 2424, 2443, 2525, 2555, 2583, 2611, 2639, 2662, 2706, 2733, 2761, 2789, 2816, 2839, 2869, 2971, 3000, 3028, 3056, 3134, 3167, 3199, 3213, 3236, 3266, 3371, 3404, 3418, 3457, 3486, 3514, 3542, 3565, 3582, 3637, 3665, 3692, 3715, 3725, 3731, 3732, 3775, 3886, 3888, 3889, 3998, 4045, 4083, 4112, 4132, 4165, 4188, 4221, 4239, 4262, 4263, 4283, 4311, 4341, 4385, 4436, 4471, 4481, 4534, 4563, 4588, 4705, 4736, 4753, 4784, 4794, 4795, 4832, 4870, 4924, 4974, 5027, 5057, 5071, 5106, 5157, 5206, 5260, 5313, 5339, 5356, 5396, 5448, 5508, 5556, 5644, 5693, 5740, 5780, 5833, 5859, 5869, 5875, 5876, 5946, 5983, 6028, 6034, 6076, 6119, 6121, 6122, 6146, 6177, 6179, 6180, 6206, 6240, 6248, 6250, 6251, 6287, 6331, 6333, 6334, 6379, 6412, 6447, 6501, 6602, 6604, 6605, 6648, 6678, 6711, 6733, 6759, 6779, 6879, 6919, 6973, 7011, 7034, 7051, 7083, 7106, 7116, 7159, 7185, 7204, 7210, 7211, 7245, 7270, 7297, 7317, 7338, 7366, 7415, 7445, 7498, 7531, 7629, 7678, 7731, 7780, 7836, 7889, 7911, 7951, 8002, 8051, 8069, 8083, 8113, 8123, 8142, 8148, 8149, 8174, 8226, 8246, 8252, 8296, 8298, 8299, 8360, 8424, 8446, 8501, 8543, 8545, 8546, 8588, 8618, 8620, 8621, 8673, 8711, 8752, 8808, 8828, 8850, 8916, 8975, 9007, 9041, 9061, 9088, 9094, 9101, 9103, 9104, 9143, 9195, 9254, 9297, 9360, 9402, 9449, 9450, 9479, 9540, 9583, 9637, 9671, 9748, 9793, 9865, 9943, 9962, 9980, 10002, 10039, 10063, 10090, 10121, 10173, 10190, 10217, 10227, 10233, 10250, 10252, 10253, 10301, 10321, 10346, 10373, 10379, 10389, 10391, 10392, 10453, 10487, 10521, 10546, 10595, 10621, 10700, 10737, 10772, 10778, 10804, 10849, 10886, 10921, 10952, 11040, 11064, 11074, 11101, 11146, 11202, 11235, 11279, 11387, 11463, 11512, 11530, 11571, 11585, 11632, 11680, 11690, 11696, 11706, 11708, 11709, 11733, 11766, 11811, 11835, 11886, 11906, 11912, 11969, 11985, 11987, 11988, 12012, 12044, 12066, 12085, 12125, 12144, 12213, 12236, 12308, 12319, 12339, 12372, 12398, 12432, 12473, 12512, 12518, 12520, 12521, 12543, 12617, 12633, 12635, 12636, 12680, 12710, 12743, 12762, 12826, 12832, 12855, 12871, 12873, 12874, 12909, 12910, 12926, 12947, 12981, 13005, 13056, 13076, 13082, 13121, 13153, 13180, 13203, 13236, 13253, 13304, 13337, 13397, 13425, 13439, 13449, 13455, 13457, 13458, 13501];
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
    function liteFn_isSpaceChar(lite_ch: string): boolean {
        void lite_ch;
        return ((((((((lite_ch) === (" "))) || (((lite_ch) === ("\t"))))) || (((lite_ch) === ("\r"))))) || (((lite_ch) === ("\n"))));
    }
    void liteFn_isSpaceChar;
    function liteFn_trimEnd(lite_line: string): string {
        void lite_line;
        let lite_end = liteFn$lib$core$text$length(lite_line);
        void lite_end;
        while (((((lite_end) > (0n))) && (liteFn_isSpaceChar(liteFn$lib$core$text$at(lite_line, lite$subtractInt(lite_end, 1n, 436)))))) {
            lite_end = lite$subtractInt(lite_end, 1n, 462);
        }
        return liteFn$lib$core$text$slice(lite_line, 0n, lite_end);
    }
    void liteFn_trimEnd;
    function liteFn_trimStart(lite_line: string): string {
        void lite_line;
        const lite_size = liteFn$lib$core$text$length(lite_line);
        void lite_size;
        let lite_start = 0n;
        void lite_start;
        while (((((lite_start) < (lite_size))) && (liteFn_isSpaceChar(liteFn$lib$core$text$at(lite_line, lite_start))))) {
            lite_start = lite$addInt(lite_start, 1n, 680);
        }
        return liteFn$lib$core$text$slice(lite_line, lite_start, lite_size);
    }
    void liteFn_trimStart;
    function liteFn_endsWith(lite_value: string, lite_suffix: string): boolean {
        void lite_value;
        void lite_suffix;
        const lite_valueLen = liteFn$lib$core$text$length(lite_value);
        void lite_valueLen;
        const lite_suffixLen = liteFn$lib$core$text$length(lite_suffix);
        void lite_suffixLen;
        if (((lite_suffixLen) > (lite_valueLen))) {
            return false;
        }
        return liteFn$lib$core$text$startsWithAt(lite_value, lite$subtractInt(lite_valueLen, lite_suffixLen, 940), lite_suffix);
    }
    void liteFn_endsWith;
    function liteFn_indentSpaces(lite_depth: bigint): string {
        void lite_depth;
        let lite_out = "";
        void lite_out;
        let lite_i = 0n;
        void lite_i;
        while (((lite_i) < (lite_depth))) {
            lite_out = ((lite_out) + ("    "));
            lite_i = lite$addInt(lite_i, 1n, 1103);
        }
        return lite_out;
    }
    void liteFn_indentSpaces;
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
                if (((((((lite_ch) === ("*"))) && (((lite$addInt(lite_i, 1n, 1653)) < (lite_lineLen))))) && (((liteFn$lib$core$text$at(lite_line, lite$addInt(lite_i, 1n, 1687))) === ("/"))))) {
                    lite_out = ((lite_out) + ("/"));
                    lite_lastChar = "/";
                    lite_inBlock = false;
                    lite_i = lite$addInt(lite_i, 2n, 1821);
                } else {
                    lite_i = lite$addInt(lite_i, 1n, 1869);
                }
            } else if (((lite_inString) !== (""))) {
                lite_out = ((lite_out) + (lite_ch));
                lite_lastChar = lite_ch;
                if (((((lite_ch) === ("\\"))) && (((lite$addInt(lite_i, 1n, 2011)) < (lite_lineLen))))) {
                    const lite_nextCh = liteFn$lib$core$text$at(lite_line, lite$addInt(lite_i, 1n, 2069));
                    void lite_nextCh;
                    lite_out = ((lite_out) + (lite_nextCh));
                    lite_lastChar = lite_nextCh;
                    lite_i = lite$addInt(lite_i, 2n, 2168);
                } else {
                    if (((lite_ch) === (lite_inString))) {
                        lite_inString = "";
                    }
                    lite_i = lite$addInt(lite_i, 1n, 2269);
                }
            } else if (((((((lite_ch) === ("/"))) && (((lite$addInt(lite_i, 1n, 2322)) < (lite_lineLen))))) && (((liteFn$lib$core$text$at(lite_line, lite$addInt(lite_i, 1n, 2356))) === ("/"))))) {
                lite_out = ((lite_out) + (liteFn$lib$core$text$slice(lite_line, lite_i, lite_lineLen)));
                break;
            } else if (((((((lite_ch) === ("/"))) && (((lite$addInt(lite_i, 1n, 2477)) < (lite_lineLen))))) && (((liteFn$lib$core$text$at(lite_line, lite$addInt(lite_i, 1n, 2511))) === ("*"))))) {
                lite_out = ((lite_out) + ("/*"));
                lite_lastChar = "*";
                lite_inBlock = true;
                lite_sawCode = true;
                lite_i = lite$addInt(lite_i, 2n, 2657);
            } else if (((((lite_ch) === ("\""))) || (((lite_ch) === ("'"))))) {
                lite_inString = lite_ch;
                lite_sawCode = true;
                lite_out = ((lite_out) + (lite_ch));
                lite_lastChar = lite_ch;
                lite_i = lite$addInt(lite_i, 1n, 2834);
            } else if (((lite_ch) === ("}"))) {
                if ((!(lite_sawCode))) {
                    lite_leadingCloses = lite$addInt(lite_leadingCloses, 1n, 2928);
                } else {
                    lite_netChange = lite$subtractInt(lite_netChange, 1n, 2964);
                }
                lite_out = ((lite_out) + ("}"));
                lite_lastChar = "}";
                lite_sawCode = true;
                if (((((lite$addInt(lite_i, 1n, 3073)) < (lite_lineLen))) && (liteFn$lib$core$text$isAsciiLetter(liteFn$lib$core$text$at(lite_line, lite$addInt(lite_i, 1n, 3126)))))) {
                    lite_out = ((lite_out) + (" "));
                    lite_lastChar = " ";
                }
                lite_i = lite$addInt(lite_i, 1n, 3231);
            } else if (((lite_ch) === ("{"))) {
                if (((((((((lite_lastChar) !== (""))) && ((!(liteFn_isSpaceChar(lite_lastChar)))))) && (((lite_lastChar) !== ("("))))) && (((lite_lastChar) !== ("["))))) {
                    lite_out = ((lite_out) + (" "));
                }
                lite_netChange = lite$addInt(lite_netChange, 1n, 3452);
                lite_out = ((lite_out) + ("{"));
                lite_lastChar = "{";
                lite_sawCode = true;
                lite_i = lite$addInt(lite_i, 1n, 3560);
            } else {
                if ((!(liteFn_isSpaceChar(lite_ch)))) {
                    lite_sawCode = true;
                }
                lite_out = ((lite_out) + (lite_ch));
                lite_lastChar = lite_ch;
                lite_i = lite$addInt(lite_i, 1n, 3710);
            }
        }
        const lite_totalNet = lite$subtractInt(lite_netChange, lite_leadingCloses, 3758);
        void lite_totalNet;
        return { leadingCloses: lite_leadingCloses, netChange: lite_totalNet, normalized: liteFn_trimEnd(lite_out), inBlockComment: lite_inBlock };
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
                lite_lineEnd = lite$addInt(lite_lineEnd, 1n, 4466);
            }
            const lite_rawLine = liteFn$lib$core$text$slice(lite_source, lite_pos, lite_lineEnd);
            void lite_rawLine;
            if (((lite_lineEnd) >= (lite_size))) {
                lite_done = true;
            } else if (((((((liteFn$lib$core$text$at(lite_source, lite_lineEnd)) === ("\r"))) && (((lite$addInt(lite_lineEnd, 1n, 4651)) < (lite_size))))) && (((liteFn$lib$core$text$at(lite_source, lite$addInt(lite_lineEnd, 1n, 4690))) === ("\n"))))) {
                lite_pos = lite$addInt(lite_lineEnd, 2n, 4731);
            } else {
                lite_pos = lite$addInt(lite_lineEnd, 1n, 4779);
            }
            const lite_trimmed = liteFn_trimEnd(lite_rawLine);
            void lite_trimmed;
            if (((liteFn_trimStart(lite_trimmed)) === (""))) {
                if (((((lite_formattedCount) > (0n))) && (((lite_blankRun) === (0n))))) {
                    lite_formatted.push("");
                    lite_formattedCount = lite$addInt(lite_formattedCount, 1n, 5022);
                    lite_blankRun = 1n;
                }
            } else if (lite_inBlockComment) {
                lite_formatted.push(lite_trimmed);
                lite_formattedCount = lite$addInt(lite_formattedCount, 1n, 5201);
                const lite_scanned = liteFn_scanLineBraces(lite_trimmed, true);
                void lite_scanned;
                lite_inBlockComment = (lite_scanned).inBlockComment;
                lite_blankRun = 0n;
            } else {
                const lite_body = liteFn_trimStart(lite_trimmed);
                void lite_body;
                const lite_scanned = liteFn_scanLineBraces(lite_body, false);
                void lite_scanned;
                let lite_lineDepth = lite$subtractInt(lite_depth, (lite_scanned).leadingCloses, 5483);
                void lite_lineDepth;
                if (((lite_lineDepth) < (0n))) {
                    lite_lineDepth = 0n;
                }
                lite_formatted.push(((liteFn_indentSpaces(lite_lineDepth)) + ((lite_scanned).normalized)));
                lite_formattedCount = lite$addInt(lite_formattedCount, 1n, 5688);
                lite_depth = lite$addInt(lite_depth, (lite_scanned).netChange, 5719);
                if (((lite_depth) < (0n))) {
                    lite_depth = 0n;
                }
                lite_inBlockComment = (lite_scanned).inBlockComment;
                lite_blankRun = 0n;
            }
        }
        while (((((lite_formattedCount) > (0n))) && (((lite$listAt((lite_formatted), lite$subtractInt(lite_formattedCount, 1n, 5933), 5918)) === (""))))) {
            lite$listPopBack(lite_formatted, 5954);
            lite_formattedCount = lite$subtractInt(lite_formattedCount, 1n, 6023);
        }
        if (((lite_formattedCount) === (0n))) {
            return "";
        }
        return ((liteFn$lib$core$text$joinTexts([...(lite_formatted)], "\n")) + ("\n"));
    }
    void liteFn_formatLite;
    function liteFn_isWin32(): boolean {
        return ((lite$processPlatform()) === ("win32"));
    }
    void liteFn_isWin32;
    function liteFn_pathSep(): string {
        if (liteFn_isWin32()) {
            return "\\";
        }
        return "/";
    }
    void liteFn_pathSep;
    function liteFn_isPathSep(lite_ch: string): boolean {
        void lite_ch;
        return ((((lite_ch) === ("/"))) || ((((liteFn_isWin32()) && (((lite_ch) === ("\\")))))));
    }
    void liteFn_isPathSep;
    function liteFn_isAbsolutePath(lite_target: string): boolean {
        void lite_target;
        const lite_size = liteFn$lib$core$text$length(lite_target);
        void lite_size;
        if (((lite_size) === (0n))) {
            return false;
        }
        if (liteFn_isPathSep(liteFn$lib$core$text$at(lite_target, 0n))) {
            return true;
        }
        return ((((((liteFn_isWin32()) && (((lite_size) >= (2n))))) && (liteFn$lib$core$text$isAsciiLetter(liteFn$lib$core$text$at(lite_target, 0n))))) && (((liteFn$lib$core$text$at(lite_target, 1n)) === (":"))));
    }
    void liteFn_isAbsolutePath;
    function liteFn_normalizePath(lite_raw: string): string {
        void lite_raw;
        const lite_size = liteFn$lib$core$text$length(lite_raw);
        void lite_size;
        if (((lite_size) === (0n))) {
            return ".";
        }
        const lite_sep = liteFn_pathSep();
        void lite_sep;
        let lite_rootPrefix = "";
        void lite_rootPrefix;
        let lite_start = 0n;
        void lite_start;
        if (((((((liteFn_isWin32()) && (((lite_size) >= (2n))))) && (liteFn$lib$core$text$isAsciiLetter(liteFn$lib$core$text$at(lite_raw, 0n))))) && (((liteFn$lib$core$text$at(lite_raw, 1n)) === (":"))))) {
            const lite_drive = liteFn$lib$core$text$slice(lite_raw, 0n, 2n);
            void lite_drive;
            if (((((lite_size) >= (3n))) && (liteFn_isPathSep(liteFn$lib$core$text$at(lite_raw, 2n))))) {
                lite_rootPrefix = ((lite_drive) + (lite_sep));
                lite_start = 3n;
            } else {
                lite_rootPrefix = lite_drive;
                lite_start = 2n;
            }
        } else if (liteFn_isPathSep(liteFn$lib$core$text$at(lite_raw, 0n))) {
            lite_rootPrefix = lite_sep;
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
            if (((lite_atEnd) || (liteFn_isPathSep(liteFn$lib$core$text$at(lite_raw, lite_i))))) {
                if (((lite_i) > (lite_segStart))) {
                    const lite_seg = liteFn$lib$core$text$slice(lite_raw, lite_segStart, lite_i);
                    void lite_seg;
                    if (((lite_seg) === (".."))) {
                        if (((((lite_partsCount) > (0n))) && ((((((lite_rootPrefix) !== (""))) || (((lite$listAt((lite_parts), lite$subtractInt(lite_partsCount, 1n, 7612), 7601)) !== ("..")))))))) {
                            lite$listPopBack(lite_parts, 7653);
                            lite_partsCount = lite$subtractInt(lite_partsCount, 1n, 7726);
                        } else if (((lite_rootPrefix) === (""))) {
                            lite_parts.push("..");
                            lite_partsCount = lite$addInt(lite_partsCount, 1n, 7884);
                        }
                    } else if (((lite_seg) !== ("."))) {
                        lite_parts.push(lite_seg);
                        lite_partsCount = lite$addInt(lite_partsCount, 1n, 8046);
                    }
                }
                lite_segStart = lite$addInt(lite_i, 1n, 8108);
            }
            lite_i = lite$addInt(lite_i, 1n, 8137);
        }
        if (((lite_partsCount) === (0n))) {
            if (((lite_rootPrefix) !== (""))) {
                return lite_rootPrefix;
            }
            return ".";
        }
        return ((lite_rootPrefix) + (liteFn$lib$core$text$joinTexts([...(lite_parts)], lite_sep)));
    }
    void liteFn_normalizePath;
    function liteFn_resolvePath(lite_baseDir: string, lite_target: string): string {
        void lite_baseDir;
        void lite_target;
        if (liteFn_isAbsolutePath(lite_target)) {
            return liteFn_normalizePath(lite_target);
        }
        const lite_sep = liteFn_pathSep();
        void lite_sep;
        if (((lite_baseDir) === (""))) {
            return liteFn_normalizePath(lite_target);
        }
        return liteFn_normalizePath(((((lite_baseDir) + (lite_sep))) + (lite_target)));
    }
    void liteFn_resolvePath;
    function liteFn_parentDir(lite_target: string): string {
        void lite_target;
        return liteFn_resolvePath(lite_target, "..");
    }
    void liteFn_parentDir;
    function liteFn_findRepoRootFrom(lite_startPath: string): string {
        void lite_startPath;
        if (((lite_startPath) === (""))) {
            return "";
        }
        let lite_dir = liteFn_normalizePath(lite_startPath);
        void lite_dir;
        if (((lite$fsKind(lite_dir)) !== ("dir"))) {
            lite_dir = liteFn_parentDir(lite_dir);
        }
        let lite_steps = 0n;
        void lite_steps;
        while (((lite_steps) < (16n))) {
            const lite_versionsPath = liteFn_resolvePath(lite_dir, "config/versions.json");
            void lite_versionsPath;
            if (((lite$fsKind(lite_versionsPath)) === ("file"))) {
                return lite_dir;
            }
            const lite_next = liteFn_parentDir(lite_dir);
            void lite_next;
            if (((lite_next) === (lite_dir))) {
                break;
            }
            lite_dir = lite_next;
            lite_steps = lite$addInt(lite_steps, 1n, 9083);
        }
        return "";
    }
    void liteFn_findRepoRootFrom;
    function liteFn_readFormatterVersion(): string {
        let lite_root = liteFn_findRepoRootFrom(lite$processEntryPath());
        void lite_root;
        if (((lite_root) === (""))) {
            lite_root = liteFn_findRepoRootFrom(lite$processCwd());
        }
        if (((lite_root) === (""))) {
            return "unassigned";
        }
        const lite_versionsPath = liteFn_resolvePath(lite_root, "config/versions.json");
        void lite_versionsPath;
        const lite_readRes = lite$fsReadText(lite_versionsPath);
        void lite_readRes;
        if ((!((lite_readRes).ok))) {
            return "unassigned";
        }
        const lite_content = (lite_readRes).text;
        void lite_content;
        const lite_keyPos = liteFn$lib$core$text$indexOfText(lite_content, "\"formatter\"", 0n);
        void lite_keyPos;
        if (((lite_keyPos) < (0n))) {
            return "unassigned";
        }
        let lite_pos = liteFn$lib$core$text$skipSpaces(lite_content, lite$addInt(lite_keyPos, 11n, 9630));
        void lite_pos;
        const lite_size = liteFn$lib$core$text$length(lite_content);
        void lite_size;
        if (((((lite_pos) >= (lite_size))) || (((liteFn$lib$core$text$at(lite_content, lite_pos)) !== (":"))))) {
            return "unassigned";
        }
        lite_pos = liteFn$lib$core$text$skipSpaces(lite_content, lite$addInt(lite_pos, 1n, 9787));
        if (liteFn$lib$core$text$startsWithAt(lite_content, lite_pos, "null")) {
            return "unassigned";
        }
        if (((((lite_pos) >= (lite_size))) || (((liteFn$lib$core$text$at(lite_content, lite_pos)) !== ("\""))))) {
            return "unassigned";
        }
        lite_pos = lite$addInt(lite_pos, 1n, 9957);
        const lite_start = lite_pos;
        void lite_start;
        while (((lite_pos) < (lite_size))) {
            const lite_ch = liteFn$lib$core$text$at(lite_content, lite_pos);
            void lite_ch;
            if (((lite_ch) === ("\\"))) {
                lite_pos = lite$addInt(lite_pos, 2n, 10085);
            } else if (((lite_ch) === ("\""))) {
                return liteFn$lib$core$text$slice(lite_content, lite_start, lite_pos);
            } else {
                lite_pos = lite$addInt(lite_pos, 1n, 10212);
            }
        }
        return "unassigned";
    }
    void liteFn_readFormatterVersion;
    function liteFn_textListCount(lite_items: string[]): bigint {
        void lite_items;
        let lite_count = 0n;
        void lite_count;
        for (const lite_item of [...(lite_items)]) {
            void lite_item;
            lite_count = lite$addInt(lite_count, 1n, 10368);
        }
        return lite_count;
    }
    void liteFn_textListCount;
    function liteFn_collectLtsFiles(lite_targets: string[]): string[] {
        void lite_targets;
        const lite_files: string[] = [...([])];
        void lite_files;
        const lite_stack: string[] = [...([])];
        void lite_stack;
        let lite_stackCount = 0n;
        void lite_stackCount;
        let lite_targetIdx = lite$subtractInt(liteFn_textListCount([...(lite_targets)]), 1n, 10590);
        void lite_targetIdx;
        while (((lite_targetIdx) >= (0n))) {
            lite_stack.push(liteFn_resolvePath(lite$processCwd(), lite$listAt((lite_targets), lite_targetIdx, 10686)));
            lite_stackCount = lite$addInt(lite_stackCount, 1n, 10732);
            lite_targetIdx = lite$subtractInt(lite_targetIdx, 1n, 10767);
        }
        while (((lite_stackCount) > (0n))) {
            const lite_resolved = lite$listPopBack(lite_stack, 10824);
            void lite_resolved;
            lite_stackCount = lite$subtractInt(lite_stackCount, 1n, 10881);
            const lite_kind = lite$fsKind(lite_resolved);
            void lite_kind;
            if (((lite_kind) === ("missing"))) {
                lite$reportError((((("ENOENT: no such file or directory, stat '") + (lite_resolved))) + ("'")));
                return lite$exit(1n);
            }
            if (((lite_kind) === ("dir"))) {
                const lite_entries: string[] = [...(lite$fsListDir(lite_resolved))];
                void lite_entries;
                let lite_entryIdx = lite$subtractInt(liteFn_textListCount([...(lite_entries)]), 1n, 11197);
                void lite_entryIdx;
                while (((lite_entryIdx) >= (0n))) {
                    const lite_entry = lite$listAt((lite_entries), lite_entryIdx, 11268);
                    void lite_entry;
                    if (((((((lite_entry) !== ("node_modules"))) && (((lite_entry) !== ("dist"))))) && ((!(liteFn$lib$core$text$startsWithAt(lite_entry, 0n, ".")))))) {
                        lite_stack.push(liteFn_resolvePath(lite_resolved, lite_entry));
                        lite_stackCount = lite$addInt(lite_stackCount, 1n, 11507);
                    }
                    lite_entryIdx = lite$subtractInt(lite_entryIdx, 1n, 11566);
                }
            } else if (liteFn_endsWith(lite_resolved, ".lts")) {
                lite_files.push(lite_resolved);
            }
        }
        return [...(lite_files)];
    }
    void liteFn_collectLtsFiles;
    const lite_args: string[] = [...(lite$inputArgs())];
    void lite_args;
    const lite_argCount = liteFn_textListCount([...(lite_args)]);
    void lite_argCount;
    if (((((lite_argCount) > (0n))) && (((lite$listAt((lite_args), 0n, 11791)) === ("--version"))))) {
        if (((lite_argCount) !== (1n))) {
            lite$reportError("Usage: lite fmt --version");
            return lite$exit(2n);
        }
        lite$emit((("lite fmt ") + (liteFn_readFormatterVersion())) + "\n");
        return lite$exit(0n);
    }
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
            lite_targetCount = lite$addInt(lite_targetCount, 1n, 12507);
        }
    }
    if (((lite_targetCount) === (0n))) {
        lite$reportError("Usage: ./bin/lite fmt [--check] [FILE_OR_DIR... | -]");
        return lite$exit(2n);
    }
    if (((((lite_targetCount) === (1n))) && (((lite$listAt((lite_targets), 0n, 12668)) === ("-"))))) {
        const lite_input = lite$inputAll("", "tools/src/fmt.lts:404:14: InputFault: ");
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
    const lite_files: string[] = [...(liteFn_collectLtsFiles([...(lite_targets)]))];
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
            lite_dirty = lite$addInt(lite_dirty, 1n, 13175);
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
