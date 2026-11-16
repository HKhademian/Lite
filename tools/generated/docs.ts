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
        writeFileSync(path: string, data: Uint8Array): void;
        appendFileSync(path: string, data: string, encoding: "utf8"): void;
        appendFileSync(path: string, data: Uint8Array): void;
        readdirSync(path: string): string[];
        mkdirSync(path: string, options: { recursive: boolean }): void;
        rmSync(path: string, options: { recursive: boolean; force: boolean }): void;
        cpSync(src: string, dest: string, options: { recursive: boolean; force: boolean; verbatimSymlinks?: boolean }): void;
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
function lite$fileKind(path: string): string {
    try {
        const st = process.getBuiltinModule("node:fs").statSync(path);
        if (st.isFile()) return "file";
        if (st.isDirectory()) return "dir";
        return "other";
    } catch { return "missing"; }
}
function lite$fileListDir(path: string): string[] {
    return process.getBuiltinModule("node:fs").readdirSync(path).sort();
}
function lite$fileReadText(path: string): { ok: boolean; text: string; error: string } {
    try {
        const raw = process.getBuiltinModule("node:fs").readFileSync(path);
        return { ok: true, text: new TextDecoder("utf-8", { fatal: true }).decode(raw), error: "" };
    } catch (error) { return { ok: false, text: "", error: lite$errMsg(error) }; }
}

function lite$processCwd(): string { return process.cwd(); }
function lite$processEntryPath(): string { return process.argv[1] ?? ""; }
function lite$processPlatform(): string { return process.platform; }
function lite$processEnvGet(name: string): { found: boolean; value: string } {
    if (!Object.prototype.hasOwnProperty.call(process.env, name)) return { found: false, value: "" };
    const raw = process.env[name];
    return raw === undefined ? { found: false, value: "" } : { found: true, value: raw };
}

let lite$lastBmp = "";
const lite$bmpSet = new Set<string>();
const lite$textCache = new Map<string, readonly string[]>();
function lite$isBmp(text: string): boolean {
    if (text === lite$lastBmp) return true;
    const len = text.length;
    if (len === 0) return true;
    if (len === 1) {
        return (text.charCodeAt(0) & 0xf800) !== 0xd800;
    }
    if (len > 64) {
        if (lite$bmpSet.has(text)) {
            lite$lastBmp = text;
            return true;
        }
        if (lite$textCache.has(text)) return false;
    }
    for (let i = 0; i < len; i += 1) {
        if ((text.charCodeAt(i) & 0xf800) === 0xd800) return false;
    }
    if (len > 64) {
        if (lite$bmpSet.size >= 128) lite$bmpSet.clear();
        lite$bmpSet.add(text);
        lite$lastBmp = text;
    }
    return true;
}
function lite$textPoints(text: string): readonly string[] {
    const found = lite$textCache.get(text);
    if (found !== undefined) return found;
    const points = Array.from(text);
    if (lite$textCache.size >= 128) lite$textCache.clear();
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
        if (idx < 0 || idx >= text.length) {
            lite$fault("BoundPanic", at, "textAt index outside text");
        }
        return text.charAt(idx);
    }
    const points = lite$textPoints(text);
    const idx = Number(position);
    if (idx < 0 || idx >= points.length) {
        lite$fault("BoundPanic", at, "textAt index outside text");
    }
    return points[idx]!;
}

function lite$textSlice(text: string, start: bigint, end: bigint, at: number): string {
    if (lite$isBmp(text)) {
        const s = Number(start);
        const e = Number(end);
        if (s < 0 || e < s || e > text.length) {
            lite$fault("BoundPanic", at, "textSlice requires 0 <= start <= end <= textLength(text)");
        }
        return text.slice(s, e);
    }
    const points = lite$textPoints(text);
    const s = Number(start);
    const e = Number(end);
    if (s < 0 || e < s || e > points.length) {
        lite$fault("BoundPanic", at, "textSlice requires 0 <= start <= end <= textLength(text)");
    }
    return points.slice(s, e).join("");
}

function lite$textIndexOf(source: string, needle: string, start: bigint): bigint {
    const s = Number(start);
    if (s < 0 || s > source.length) return -1n;
    if (needle.length === 0) {
        if (s === 0) return 0n;
        const len = lite$isBmp(source) ? source.length : lite$textPoints(source).length;
        return s > len ? -1n : start;
    }
    const rawIdx = source.indexOf(needle, s);
    if (rawIdx < 0) return -1n;
    if (lite$isBmp(source)) return BigInt(rawIdx);
    const points = lite$textPoints(source);
    if (s > points.length) return -1n;
    const nPoints = lite$isBmp(needle) ? null : lite$textPoints(needle);
    const nLen = nPoints === null ? needle.length : nPoints.length;
    const limit = points.length - nLen;
    if (nLen === 1) {
        for (let i = s; i <= limit; i += 1) {
            if (points[i] === needle) return BigInt(i);
        }
        return -1n;
    }
    const first = nPoints === null ? needle[0] : nPoints[0];
    for (let i = s; i <= limit; i += 1) {
        if (points[i] !== first) continue;
        let ok = true;
        for (let j = 1; j < nLen; j += 1) {
            if (points[i + j] !== (nPoints === null ? needle[j] : nPoints[j])) { ok = false; break; }
        }
        if (ok) return BigInt(i);
    }
    return -1n;
}

function lite$textSkipWhile(source: string, start: bigint, spaces: boolean): bigint {
    if (start < 0n) lite$fault("BoundPanic", 0, "textAt index outside text");
    let pos = Number(start);
    if (lite$isBmp(source)) {
        const len = source.length;
        if (pos >= len) return start;
        if (spaces) {
            while (pos < len) {
                const c = source.charCodeAt(pos);
                if (c === 32 || c === 9 || c === 13 || c === 10) pos += 1;
                else break;
            }
        } else {
            while (pos < len) {
                const c = source.charCodeAt(pos);
                if ((c >= 97 && c <= 122) || (c >= 65 && c <= 90) || (c >= 48 && c <= 57) || c === 95) pos += 1;
                else break;
            }
        }
        return BigInt(pos);
    }
    const points = lite$textPoints(source);
    const len = points.length;
    if (pos >= len) return start;
    while (pos < len) {
        const p = points[pos]!;
        if (p.length !== 1) break;
        const c = p.charCodeAt(0);
        if (spaces ? (c === 32 || c === 9 || c === 13 || c === 10) : ((c >= 97 && c <= 122) || (c >= 65 && c <= 90) || (c >= 48 && c <= 57) || c === 95)) pos += 1;
        else break;
    }
    return BigInt(pos);
}

function lite$textStartsWithAt(source: string, position: bigint, text: string): boolean {
    const pos = Number(position);
    if (pos < 0 || pos > source.length) return false;
    if (pos === 0) return source.startsWith(text);
    if (lite$isBmp(source)) return source.startsWith(text, pos);
    const points = lite$textPoints(source);
    if (pos > points.length) return false;
    if (text.length === 0) return true;
    if (lite$isBmp(text)) {
        if (pos + text.length > points.length) return false;
        for (let i = 0; i < text.length; i += 1) {
            if (points[pos + i] !== text[i]) return false;
        }
        return true;
    }
    const tPoints = lite$textPoints(text);
    if (pos + tPoints.length > points.length) return false;
    for (let i = 0; i < tPoints.length; i += 1) {
        const tp = tPoints[i];
        if (tp === undefined || points[pos + i] !== tp) return false;
    }
    return true;
}

function lite$textWordAt(source: string, position: bigint, word: string): boolean {
    const pos = Number(position);
    if (pos < 0) return false;
    if (lite$isBmp(source)) {
        if (pos > source.length) return false;
        if (!source.startsWith(word, pos)) return false;
        const after = pos + word.length;
        if (after >= source.length) return true;
        const cc = source.charCodeAt(after);
        return !((cc >= 65 && cc <= 90) || (cc >= 97 && cc <= 122) || (cc >= 48 && cc <= 57) || cc === 95);
    }
    if (!lite$textStartsWithAt(source, position, word)) return false;
    const points = lite$textPoints(source);
    const wLen = lite$isBmp(word) ? word.length : lite$textPoints(word).length;
    const after = pos + wLen;
    if (after >= points.length) return true;
    const next = points[after];
    if (next === undefined || next.length !== 1) return true;
    const cc = next.charCodeAt(0);
    return !((cc >= 65 && cc <= 90) || (cc >= 97 && cc <= 122) || (cc >= 48 && cc <= 57) || cc === 95);
}

function lite$textToInt(text: string): { value: bigint; ok: boolean } {
    if (!/^[+-]?[0-9]+$/.test(text)) return { value: 0n, ok: false };
    const value = BigInt(text);
    if (value < -9223372036854775808n || value > 9223372036854775807n) return { value: 0n, ok: false };
    return { value, ok: true };
}

function lite$textTrim(source: string, trimLeft: boolean, trimRight: boolean): string {
    let start = 0;
    let end = source.length;
    if (trimLeft) {
        while (start < end) {
            const c = source.charCodeAt(start);
            if (c !== 32 && c !== 9 && c !== 13 && c !== 10) break;
            start += 1;
        }
    }
    if (trimRight) {
        while (end > start) {
            const c = source.charCodeAt(end - 1);
            if (c !== 32 && c !== 9 && c !== 13 && c !== 10) break;
            end -= 1;
        }
    }
    return start === 0 && end === source.length ? source : source.slice(start, end);
}

function lite$textToLowerAscii(source: string): string {
    for (let i = 0; i < source.length; i += 1) {
        const c = source.charCodeAt(i);
        if (c >= 65 && c <= 90) return source.replace(/[A-Z]+/g, m => m.toLowerCase());
    }
    return source;
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

const lite$intLines: readonly number[] = [0, 111, 112, 138, 162, 190, 221, 249, 277, 303, 335, 367, 406, 440, 441, 495, 529, 559, 577, 600, 648, 695, 752, 780, 827, 837, 866, 888, 894, 904, 907, 908, 983, 1019, 1045, 1093, 1135, 1163, 1217, 1241, 1251, 1304, 1390, 1396, 1453, 1508, 1511, 1512, 1550, 1603, 1604, 1650, 1758, 1759, 1834, 1888, 1934, 1992, 2016, 2026, 2102, 2122, 2128, 2129, 2211, 2273, 2293, 2299, 2300, 2347, 2389, 2438, 2507, 2531, 2541, 2600, 2648, 2716, 2740, 2750, 2805, 2849, 2887, 2964, 2974, 3039, 3059, 3065, 3066, 3112, 3174, 3175, 3191, 3249, 3269, 3275, 3276, 3297, 3349, 3373, 3410, 3434, 3444, 3477, 3497, 3503, 3504, 3561, 3590, 3669, 3689, 3695, 3729, 3732, 3733, 3754];
const lite$intSource = "tools/src/docs.lts:";
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

export function main(lite$write?: (text: string) => void): string {
    lite$out = "";
    lite$resetInput();
    function lite$emit(text: string): void {
        if (lite$write === undefined) lite$out += text;
        else lite$write(text);
    }
    void lite$emit;
    function liteFn$lib$core$int$intText(lite_value: bigint): string {
        void lite_value;
        return String(lite_value);
    }
    void liteFn$lib$core$int$intText;
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
    function liteFn$lib$core$text$isDigit(lite_text: string): boolean {
        void lite_text;
        return (lite_text.length === 1 && lite_text >= "0" && lite_text <= "9");
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
        return (lite_ch.length === 1 && ((lite_ch >= "a" && lite_ch <= "z") || (lite_ch >= "A" && lite_ch <= "Z")));
    }
    void liteFn$lib$core$text$isAsciiLetter;
    function liteFn$lib$core$text$isNameContinue(lite_ch: string): boolean {
        void lite_ch;
        return (lite_ch === "_" || (lite_ch.length === 1 && ((lite_ch >= "a" && lite_ch <= "z") || (lite_ch >= "A" && lite_ch <= "Z") || (lite_ch >= "0" && lite_ch <= "9"))));
    }
    void liteFn$lib$core$text$isNameContinue;
    function liteFn$lib$core$text$skipName(lite_source: string, lite_start: bigint): bigint {
        void lite_source;
        void lite_start;
        return lite$textSkipWhile(lite_source, lite_start, false);
    }
    void liteFn$lib$core$text$skipName;
    function liteFn$lib$core$text$startsWithAt(lite_source: string, lite_position: bigint, lite_text: string): boolean {
        void lite_source;
        void lite_position;
        void lite_text;
        return lite$textStartsWithAt(lite_source, lite_position, lite_text);
    }
    void liteFn$lib$core$text$startsWithAt;
    function liteFn$lib$core$text$wordAt(lite_source: string, lite_position: bigint, lite_word: string): boolean {
        void lite_source;
        void lite_position;
        void lite_word;
        return lite$textWordAt(lite_source, lite_position, lite_word);
    }
    void liteFn$lib$core$text$wordAt;
    function liteFn$lib$core$text$indexOfText(lite_source: string, lite_needle: string, lite_start: bigint): bigint {
        void lite_source;
        void lite_needle;
        void lite_start;
        return lite$textIndexOf(lite_source, lite_needle, lite_start);
    }
    void liteFn$lib$core$text$indexOfText;
    function liteFn$lib$core$text$joinTexts(lite_values: string[], lite_separator: string): string {
        void lite_values;
        void lite_separator;
        return lite_values.join(lite_separator);
    }
    void liteFn$lib$core$text$joinTexts;
    function liteFn$lib$core$text$textToInt(lite_text: string): { value: bigint; ok: boolean } {
        void lite_text;
        return lite$textToInt(lite_text);
    }
    void liteFn$lib$core$text$textToInt;
    function liteFn$lib$core$text$isWhitespace(lite_ch: string): boolean {
        void lite_ch;
        return (lite_ch === " " || lite_ch === "\t" || lite_ch === "\r" || lite_ch === "\n");
    }
    void liteFn$lib$core$text$isWhitespace;
    function liteFn$lib$core$text$trimStart(lite_source: string): string {
        void lite_source;
        return lite$textTrim(lite_source, true, false);
    }
    void liteFn$lib$core$text$trimStart;
    function liteFn$lib$core$text$trim(lite_source: string): string {
        void lite_source;
        return lite$textTrim(lite_source, true, true);
    }
    void liteFn$lib$core$text$trim;
    function liteFn$lib$core$text$endsWith(lite_source: string, lite_suffix: string): boolean {
        void lite_source;
        void lite_suffix;
        return lite_source.endsWith(lite_suffix);
    }
    void liteFn$lib$core$text$endsWith;
    function liteFn$lib$core$text$repeatText(lite_value: string, lite_count: bigint): string {
        void lite_value;
        void lite_count;
        return (lite_count <= 0n || lite_value === "" ? "" : lite_value.repeat(Number(lite_count)));
    }
    void liteFn$lib$core$text$repeatText;
    function liteFn$lib$core$text$containsText(lite_source: string, lite_needle: string): boolean {
        void lite_source;
        void lite_needle;
        return lite_source.includes(lite_needle);
    }
    void liteFn$lib$core$text$containsText;
    function liteFn$lib$core$text$toLowerAscii(lite_source: string): string {
        void lite_source;
        return lite$textToLowerAscii(lite_source);
    }
    void liteFn$lib$core$text$toLowerAscii;
    function liteFn$lib$util$json$isJsonSpace(lite_ch: string): boolean {
        void lite_ch;
        return ((((((((lite_ch) === (" "))) || (((lite_ch) === ("\t"))))) || (((lite_ch) === ("\r"))))) || (((lite_ch) === ("\n"))));
    }
    void liteFn$lib$util$json$isJsonSpace;
    function liteFn$lib$util$json$skipJsonSpaces(lite_source: string, lite_start: bigint): bigint {
        void lite_source;
        void lite_start;
        const lite_size = lite$textLength(lite_source);
        void lite_size;
        let lite_pos = lite_start;
        void lite_pos;
        while (((((lite_pos) < (lite_size))) && (liteFn$lib$util$json$isJsonSpace(lite$textAt(lite_source, lite_pos, 379))))) {
            lite_pos = lite$addInt(lite_pos, 1n, 421);
        }
        return lite_pos;
    }
    void liteFn$lib$util$json$skipJsonSpaces;
    function liteFn$lib$util$json$isHexDigit(lite_ch: string): boolean {
        void lite_ch;
        return ((((((((((((((((((((((((liteFn$lib$core$text$isDigit(lite_ch)) || (((lite_ch) === ("a"))))) || (((lite_ch) === ("b"))))) || (((lite_ch) === ("c"))))) || (((lite_ch) === ("d"))))) || (((lite_ch) === ("e"))))) || (((lite_ch) === ("f"))))) || (((lite_ch) === ("A"))))) || (((lite_ch) === ("B"))))) || (((lite_ch) === ("C"))))) || (((lite_ch) === ("D"))))) || (((lite_ch) === ("E"))))) || (((lite_ch) === ("F"))));
    }
    void liteFn$lib$util$json$isHexDigit;
    function liteFn$lib$util$json$hexDigitValue(lite_ch: string): bigint {
        void lite_ch;
        if (liteFn$lib$core$text$isDigit(lite_ch)) {
            return liteFn$lib$core$text$digitValue(lite_ch);
        }
        const lite_lower = liteFn$lib$core$text$toLowerAscii(lite_ch);
        void lite_lower;
        if (((lite_lower) === ("a"))) {
            return 10n;
        }
        if (((lite_lower) === ("b"))) {
            return 11n;
        }
        if (((lite_lower) === ("c"))) {
            return 12n;
        }
        if (((lite_lower) === ("d"))) {
            return 13n;
        }
        if (((lite_lower) === ("e"))) {
            return 14n;
        }
        return 15n;
    }
    void liteFn$lib$util$json$hexDigitValue;
    function liteFn$lib$util$json$asciiFromCode(lite_code: bigint): string {
        void lite_code;
        if (((lite_code) === (9n))) {
            return "\t";
        }
        if (((lite_code) === (10n))) {
            return "\n";
        }
        if (((lite_code) === (13n))) {
            return "\r";
        }
        if (((((lite_code) >= (32n))) && (((lite_code) <= (126n))))) {
            const lite_table = " !\"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~";
            void lite_table;
            return lite$textAt(lite_table, lite$subtractInt(lite_code, 32n, 1318), 1298);
        }
        return "";
    }
    void liteFn$lib$util$json$asciiFromCode;
    function liteFn$lib$util$json$scanStringToken(lite_source: string, lite_start: bigint, lite_decode: boolean): { ok: boolean; value: string; next: bigint; error: string } {
        void lite_source;
        void lite_start;
        void lite_decode;
        const lite_size = lite$textLength(lite_source);
        void lite_size;
        if (((((lite_start) >= (lite_size))) || (((lite$textAt(lite_source, lite_start, 1517)) !== ("\""))))) {
            return { ok: false, value: "", next: lite_start, error: "expected JSON string" };
        }
        let lite_pos = lite$addInt(lite_start, 1n, 1665);
        void lite_pos;
        let lite_out = "";
        void lite_out;
        let lite_runStart = lite_pos;
        void lite_runStart;
        while (((lite_pos) < (lite_size))) {
            const lite_ch = lite$textAt(lite_source, lite_pos, 1750);
            void lite_ch;
            if (((lite_ch) === ("\""))) {
                if (((lite_decode) && (((lite_pos) > (lite_runStart))))) {
                    lite_out = ((lite_out) + (lite$textSlice(lite_source, lite_runStart, lite_pos, 1867)));
                }
                return { ok: true, value: lite_out, next: lite$addInt(lite_pos, 1n, 1971), error: "" };
            }
            if (((lite_ch) === ("\\"))) {
                if (((lite_decode) && (((lite_pos) > (lite_runStart))))) {
                    lite_out = ((lite_out) + (lite$textSlice(lite_source, lite_runStart, lite_pos, 2094)));
                }
                if (((lite$addInt(lite_pos, 1n, 2162)) >= (lite_size))) {
                    return { ok: false, value: "", next: lite_pos, error: "unterminated string escape" };
                }
                const lite_esc = lite$textAt(lite_source, lite$addInt(lite_pos, 1n, 2328), 2308);
                void lite_esc;
                if (((((((lite_esc) === ("\""))) || (((lite_esc) === ("\\"))))) || (((lite_esc) === ("/"))))) {
                    if (lite_decode) {
                        lite_out = ((lite_out) + (lite_esc));
                    }
                    lite_pos = lite$addInt(lite_pos, 2n, 2465);
                    lite_runStart = lite_pos;
                } else if (((lite_esc) === ("n"))) {
                    if (lite_decode) {
                        lite_out = ((lite_out) + ("\n"));
                    }
                    lite_pos = lite$addInt(lite_pos, 2n, 2611);
                    lite_runStart = lite_pos;
                } else if (((lite_esc) === ("r"))) {
                    if (lite_decode) {
                        lite_out = ((lite_out) + ("\r"));
                    }
                    lite_pos = lite$addInt(lite_pos, 2n, 2757);
                    lite_runStart = lite_pos;
                } else if (((lite_esc) === ("t"))) {
                    if (lite_decode) {
                        lite_out = ((lite_out) + ("\t"));
                    }
                    lite_pos = lite$addInt(lite_pos, 2n, 2903);
                    lite_runStart = lite_pos;
                } else if (((((lite_esc) === ("b"))) || (((lite_esc) === ("f"))))) {
                    lite_pos = lite$addInt(lite_pos, 2n, 3015);
                    lite_runStart = lite_pos;
                } else if (((lite_esc) === ("u"))) {
                    if (((lite$addInt(lite_pos, 5n, 3110)) >= (lite_size))) {
                        return { ok: false, value: "", next: lite_pos, error: "incomplete unicode escape" };
                    }
                    const lite_h0 = lite$textAt(lite_source, lite$addInt(lite_pos, 2n, 3286), 3266);
                    void lite_h0;
                    const lite_h1 = lite$textAt(lite_source, lite$addInt(lite_pos, 3n, 3334), 3314);
                    void lite_h1;
                    const lite_h2 = lite$textAt(lite_source, lite$addInt(lite_pos, 4n, 3382), 3362);
                    void lite_h2;
                    const lite_h3 = lite$textAt(lite_source, lite$addInt(lite_pos, 5n, 3430), 3410);
                    void lite_h3;
                    if ((((((((!(liteFn$lib$util$json$isHexDigit(lite_h0)))) || ((!(liteFn$lib$util$json$isHexDigit(lite_h1)))))) || ((!(liteFn$lib$util$json$isHexDigit(lite_h2)))))) || ((!(liteFn$lib$util$json$isHexDigit(lite_h3)))))) {
                        return { ok: false, value: "", next: lite_pos, error: "invalid unicode escape" };
                    }
                    if (lite_decode) {
                        const lite_code = lite$addInt(lite$multiplyInt((lite$addInt(lite$multiplyInt((lite$addInt(lite$multiplyInt(liteFn$lib$util$json$hexDigitValue(lite_h0), 16n, 3735), liteFn$lib$util$json$hexDigitValue(lite_h1), 3740)), 16n, 3761), liteFn$lib$util$json$hexDigitValue(lite_h2), 3766)), 16n, 3787), liteFn$lib$util$json$hexDigitValue(lite_h3), 3792);
                        void lite_code;
                        const lite_decoded = liteFn$lib$util$json$asciiFromCode(lite_code);
                        void lite_decoded;
                        if (((lite_decoded) !== (""))) {
                            lite_out = ((lite_out) + (lite_decoded));
                        } else {
                            lite_out = ((lite_out) + (lite$textSlice(lite_source, lite_pos, lite$addInt(lite_pos, 6n, 4043), 4015)));
                        }
                    }
                    lite_pos = lite$addInt(lite_pos, 6n, 4115);
                    lite_runStart = lite_pos;
                } else {
                    return { ok: false, value: "", next: lite_pos, error: "invalid string escape" };
                }
            } else {
                if (((((((lite_ch) === ("\n"))) || (((lite_ch) === ("\r"))))) || (((lite_ch) === ("\t"))))) {
                    return { ok: false, value: "", next: lite_pos, error: "unescaped control character in string" };
                }
                lite_pos = lite$addInt(lite_pos, 1n, 4500);
            }
        }
        return { ok: false, value: "", next: lite_pos, error: "unterminated string literal" };
    }
    void liteFn$lib$util$json$scanStringToken;
    function liteFn$lib$util$json$scanNumberToken(lite_source: string, lite_start: bigint): { ok: boolean; next: bigint; error: string } {
        void lite_source;
        void lite_start;
        const lite_size = lite$textLength(lite_source);
        void lite_size;
        let lite_pos = lite_start;
        void lite_pos;
        if (((((lite_pos) < (lite_size))) && (((lite$textAt(lite_source, lite_pos, 4771)) === ("-"))))) {
            lite_pos = lite$addInt(lite_pos, 1n, 4819);
        }
        if (((((lite_pos) >= (lite_size))) || ((!(liteFn$lib$core$text$isDigit(lite$textAt(lite_source, lite_pos, 4869))))))) {
            return { ok: false, next: lite_pos, error: "expected JSON number digit" };
        }
        if (((lite$textAt(lite_source, lite_pos, 4985)) === ("0"))) {
            lite_pos = lite$addInt(lite_pos, 1n, 5033);
            if (((((lite_pos) < (lite_size))) && (liteFn$lib$core$text$isDigit(lite$textAt(lite_source, lite_pos, 5077))))) {
                return { ok: false, next: lite_pos, error: "leading zero in JSON number" };
            }
        } else {
            while (((((lite_pos) < (lite_size))) && (liteFn$lib$core$text$isDigit(lite$textAt(lite_source, lite_pos, 5249))))) {
                lite_pos = lite$addInt(lite_pos, 1n, 5295);
            }
        }
        if (((((lite_pos) < (lite_size))) && (((lite$textAt(lite_source, lite_pos, 5338)) === ("."))))) {
            lite_pos = lite$addInt(lite_pos, 1n, 5386);
            if (((((lite_pos) >= (lite_size))) || ((!(liteFn$lib$core$text$isDigit(lite$textAt(lite_source, lite_pos, 5434))))))) {
                return { ok: false, next: lite_pos, error: "expected fraction digit in JSON number" };
            }
            while (((((lite_pos) < (lite_size))) && (liteFn$lib$core$text$isDigit(lite$textAt(lite_source, lite_pos, 5604))))) {
                lite_pos = lite$addInt(lite_pos, 1n, 5650);
            }
        }
        if (((((lite_pos) < (lite_size))) && ((((((lite$textAt(lite_source, lite_pos, 5694)) === ("e"))) || (((lite$textAt(lite_source, lite_pos, 5725)) === ("E")))))))) {
            lite_pos = lite$addInt(lite_pos, 1n, 5774);
            if (((((lite_pos) < (lite_size))) && ((((((lite$textAt(lite_source, lite_pos, 5806)) === ("+"))) || (((lite$textAt(lite_source, lite_pos, 5837)) === ("-")))))))) {
                lite_pos = lite$addInt(lite_pos, 1n, 5890);
            }
            if (((((lite_pos) >= (lite_size))) || ((!(liteFn$lib$core$text$isDigit(lite$textAt(lite_source, lite_pos, 5948))))))) {
                return { ok: false, next: lite_pos, error: "expected exponent digit in JSON number" };
            }
            while (((((lite_pos) < (lite_size))) && (liteFn$lib$core$text$isDigit(lite$textAt(lite_source, lite_pos, 6118))))) {
                lite_pos = lite$addInt(lite_pos, 1n, 6164);
            }
        }
        return { ok: true, next: lite_pos, error: "" };
    }
    void liteFn$lib$util$json$scanNumberToken;
    function liteFn$lib$util$json$skipValue(lite_source: string, lite_start: bigint): { ok: boolean; next: bigint; error: string } {
        void lite_source;
        void lite_start;
        const lite_size = lite$textLength(lite_source);
        void lite_size;
        const lite_stack: string[] = [...([])];
        void lite_stack;
        let lite_stackCount = 0n;
        void lite_stackCount;
        let lite_pos = lite_start;
        void lite_pos;
        let lite_expectKey = false;
        void lite_expectKey;
        while (Boolean(true)) {
            lite_pos = liteFn$lib$util$json$skipJsonSpaces(lite_source, lite_pos);
            if (lite_expectKey) {
                const lite_keyRes = liteFn$lib$util$json$scanStringToken(lite_source, lite_pos, false);
                void lite_keyRes;
                if ((!((lite_keyRes).ok))) {
                    return { ok: false, next: lite_pos, error: "expected JSON object key" };
                }
                lite_pos = liteFn$lib$util$json$skipJsonSpaces(lite_source, (lite_keyRes).next);
                if (((((lite_pos) >= (lite_size))) || (((lite$textAt(lite_source, lite_pos, 6921)) !== (":"))))) {
                    return { ok: false, next: lite_pos, error: "expected ':' after JSON object key" };
                }
                lite_pos = liteFn$lib$util$json$skipJsonSpaces(lite_source, lite$addInt(lite_pos, 1n, 7106));
                lite_expectKey = false;
            }
            if (((lite_pos) >= (lite_size))) {
                return { ok: false, next: lite_pos, error: "unexpected end of JSON input" };
            }
            const lite_ch = lite$textAt(lite_source, lite_pos, 7289);
            void lite_ch;
            let lite_valueCompleted = false;
            void lite_valueCompleted;
            if (((lite_ch) === ("{"))) {
                const lite_afterOpen = liteFn$lib$util$json$skipJsonSpaces(lite_source, lite$addInt(lite_pos, 1n, 7423));
                void lite_afterOpen;
                if (((((lite_afterOpen) < (lite_size))) && (((lite$textAt(lite_source, lite_afterOpen, 7465)) === ("}"))))) {
                    lite_pos = lite$addInt(lite_afterOpen, 1n, 7533);
                    lite_valueCompleted = true;
                } else {
                    lite_stack.push("obj");
                    lite_stackCount = lite$addInt(lite_stackCount, 1n, 7687);
                    lite_pos = lite_afterOpen;
                    lite_expectKey = true;
                }
            } else if (((lite_ch) === ("["))) {
                const lite_afterOpen = liteFn$lib$util$json$skipJsonSpaces(lite_source, lite$addInt(lite_pos, 1n, 7855));
                void lite_afterOpen;
                if (((((lite_afterOpen) < (lite_size))) && (((lite$textAt(lite_source, lite_afterOpen, 7897)) === ("]"))))) {
                    lite_pos = lite$addInt(lite_afterOpen, 1n, 7965);
                    lite_valueCompleted = true;
                } else {
                    lite_stack.push("arr");
                    lite_stackCount = lite$addInt(lite_stackCount, 1n, 8119);
                    lite_pos = lite_afterOpen;
                }
            } else if (((lite_ch) === ("\""))) {
                const lite_strRes = liteFn$lib$util$json$scanStringToken(lite_source, lite_pos, false);
                void lite_strRes;
                if ((!((lite_strRes).ok))) {
                    return { ok: false, next: (lite_strRes).next, error: (lite_strRes).error };
                }
                lite_pos = (lite_strRes).next;
                lite_valueCompleted = true;
            } else if (liteFn$lib$core$text$startsWithAt(lite_source, lite_pos, "true")) {
                lite_pos = lite$addInt(lite_pos, 4n, 8532);
                lite_valueCompleted = true;
            } else if (liteFn$lib$core$text$startsWithAt(lite_source, lite_pos, "false")) {
                lite_pos = lite$addInt(lite_pos, 5n, 8654);
                lite_valueCompleted = true;
            } else if (liteFn$lib$core$text$startsWithAt(lite_source, lite_pos, "null")) {
                lite_pos = lite$addInt(lite_pos, 4n, 8775);
                lite_valueCompleted = true;
            } else if (((((lite_ch) === ("-"))) || (liteFn$lib$core$text$isDigit(lite_ch)))) {
                const lite_numRes = liteFn$lib$util$json$scanNumberToken(lite_source, lite_pos);
                void lite_numRes;
                if ((!((lite_numRes).ok))) {
                    return { ok: false, next: (lite_numRes).next, error: (lite_numRes).error };
                }
                lite_pos = (lite_numRes).next;
                lite_valueCompleted = true;
            } else {
                return { ok: false, next: lite_pos, error: "unexpected token in JSON value" };
            }
            if (lite_valueCompleted) {
                if (((lite_stackCount) === (0n))) {
                    return { ok: true, next: lite_pos, error: "" };
                }
                while (((lite_stackCount) > (0n))) {
                    lite_pos = liteFn$lib$util$json$skipJsonSpaces(lite_source, lite_pos);
                    if (((lite_pos) >= (lite_size))) {
                        return { ok: false, next: lite_pos, error: "unterminated JSON container" };
                    }
                    const lite_sep = lite$textAt(lite_source, lite_pos, 9608);
                    void lite_sep;
                    const lite_top = lite$listAt((lite_stack), lite$subtractInt(lite_stackCount, 1n, 9670), 9659);
                    void lite_top;
                    if (((lite_top) === ("arr"))) {
                        if (((lite_sep) === ("]"))) {
                            lite$listPopBack(lite_stack, 9770);
                            lite_stackCount = lite$subtractInt(lite_stackCount, 1n, 9843);
                            lite_pos = lite$addInt(lite_pos, 1n, 9882);
                        } else if (((lite_sep) === (","))) {
                            lite_pos = lite$addInt(lite_pos, 1n, 9964);
                            break;
                        } else {
                            return { ok: false, next: lite_pos, error: "expected ',' or ']' in JSON array" };
                        }
                    } else {
                        if (((lite_sep) === ("}"))) {
                            lite$listPopBack(lite_stack, 10238);
                            lite_stackCount = lite$subtractInt(lite_stackCount, 1n, 10311);
                            lite_pos = lite$addInt(lite_pos, 1n, 10350);
                        } else if (((lite_sep) === (","))) {
                            lite_pos = lite$addInt(lite_pos, 1n, 10432);
                            lite_expectKey = true;
                            break;
                        } else {
                            return { ok: false, next: lite_pos, error: "expected ',' or '}' in JSON object" };
                        }
                    }
                }
                if (((lite_stackCount) === (0n))) {
                    return { ok: true, next: lite_pos, error: "" };
                }
            }
        }
        return { ok: false, next: lite_pos, error: "unexpected end of JSON input" };
    }
    void liteFn$lib$util$json$skipValue;
    function liteFn$lib$util$json$validate(lite_source: string): { ok: boolean; error: string } {
        void lite_source;
        const lite_skipped = liteFn$lib$util$json$skipValue(lite_source, 0n);
        void lite_skipped;
        if ((!((lite_skipped).ok))) {
            return { ok: false, error: (lite_skipped).error };
        }
        const lite_rest = liteFn$lib$util$json$skipJsonSpaces(lite_source, (lite_skipped).next);
        void lite_rest;
        if (((lite_rest) < (lite$textLength(lite_source)))) {
            return { ok: false, error: "unexpected trailing JSON content" };
        }
        return { ok: true, error: "" };
    }
    void liteFn$lib$util$json$validate;
    function liteFn$lib$util$json$readStringAt(lite_source: string, lite_start: bigint): { ok: boolean; value: string; next: bigint; error: string } {
        void lite_source;
        void lite_start;
        const lite_pos = liteFn$lib$util$json$skipJsonSpaces(lite_source, lite_start);
        void lite_pos;
        return liteFn$lib$util$json$scanStringToken(lite_source, lite_pos, true);
    }
    void liteFn$lib$util$json$readStringAt;
    function liteFn$lib$util$json$readIntAt(lite_source: string, lite_start: bigint): { ok: boolean; value: bigint; next: bigint; error: string } {
        void lite_source;
        void lite_start;
        const lite_size = lite$textLength(lite_source);
        void lite_size;
        const lite_pos = liteFn$lib$util$json$skipJsonSpaces(lite_source, lite_start);
        void lite_pos;
        let lite_end = lite_pos;
        void lite_end;
        if (((((lite_end) < (lite_size))) && ((((((lite$textAt(lite_source, lite_end, 12272)) === ("-"))) || (((lite$textAt(lite_source, lite_end, 12303)) === ("+")))))))) {
            lite_end = lite$addInt(lite_end, 1n, 12352);
        }
        while (((((lite_end) < (lite_size))) && (liteFn$lib$core$text$isDigit(lite$textAt(lite_source, lite_end, 12400))))) {
            lite_end = lite$addInt(lite_end, 1n, 12442);
        }
        if (((lite_end) === (lite_pos))) {
            return { ok: false, value: 0n, next: lite_pos, error: "expected integer value" };
        }
        if (((((lite_end) < (lite_size))) && ((((((((lite$textAt(lite_source, lite_end, 12588)) === ("."))) || (((lite$textAt(lite_source, lite_end, 12619)) === ("e"))))) || (((lite$textAt(lite_source, lite_end, 12650)) === ("E")))))))) {
            return { ok: false, value: 0n, next: lite_pos, error: "expected integer value, got float" };
        }
        const lite_parsed = liteFn$lib$core$text$textToInt(lite$textSlice(lite_source, lite_pos, lite_end, 12813));
        void lite_parsed;
        if ((!((lite_parsed).ok))) {
            return { ok: false, value: 0n, next: lite_pos, error: "invalid integer value" };
        }
        return { ok: true, value: (lite_parsed).value, next: lite_end, error: "" };
    }
    void liteFn$lib$util$json$readIntAt;
    function liteFn$lib$util$json$findObjectField(lite_source: string, lite_objectStart: bigint, lite_key: string): { found: boolean; valuePos: bigint } {
        void lite_source;
        void lite_objectStart;
        void lite_key;
        const lite_size = lite$textLength(lite_source);
        void lite_size;
        let lite_pos = liteFn$lib$util$json$skipJsonSpaces(lite_source, lite_objectStart);
        void lite_pos;
        if (((((lite_pos) >= (lite_size))) || (((lite$textAt(lite_source, lite_pos, 13357)) !== ("{"))))) {
            return { found: false, valuePos: (-1n) };
        }
        lite_pos = liteFn$lib$util$json$skipJsonSpaces(lite_source, lite$addInt(lite_pos, 1n, 13478));
        if (((((lite_pos) < (lite_size))) && (((lite$textAt(lite_source, lite_pos, 13506)) === ("}"))))) {
            return { found: false, valuePos: (-1n) };
        }
        while (((lite_pos) < (lite_size))) {
            const lite_keyRes = liteFn$lib$util$json$scanStringToken(lite_source, lite_pos, true);
            void lite_keyRes;
            if ((!((lite_keyRes).ok))) {
                return { found: false, valuePos: (-1n) };
            }
            lite_pos = liteFn$lib$util$json$skipJsonSpaces(lite_source, (lite_keyRes).next);
            if (((((lite_pos) >= (lite_size))) || (((lite$textAt(lite_source, lite_pos, 13810)) !== (":"))))) {
                return { found: false, valuePos: (-1n) };
            }
            const lite_valStart = liteFn$lib$util$json$skipJsonSpaces(lite_source, lite$addInt(lite_pos, 1n, 13929));
            void lite_valStart;
            if ((((lite_keyRes).value) === (lite_key))) {
                return { found: true, valuePos: lite_valStart };
            }
            const lite_valEnd = liteFn$lib$util$json$skipValue(lite_source, lite_valStart);
            void lite_valEnd;
            if ((!((lite_valEnd).ok))) {
                return { found: false, valuePos: (-1n) };
            }
            lite_pos = liteFn$lib$util$json$skipJsonSpaces(lite_source, (lite_valEnd).next);
            if (((((lite_pos) < (lite_size))) && (((lite$textAt(lite_source, lite_pos, 14226)) === (","))))) {
                lite_pos = liteFn$lib$util$json$skipJsonSpaces(lite_source, lite$addInt(lite_pos, 1n, 14301));
            } else {
                return { found: false, valuePos: (-1n) };
            }
        }
        return { found: false, valuePos: (-1n) };
    }
    void liteFn$lib$util$json$findObjectField;
    function liteFn$lib$util$json$readObjectString(lite_source: string, lite_objectStart: bigint, lite_key: string): { found: boolean; ok: boolean; value: string } {
        void lite_source;
        void lite_objectStart;
        void lite_key;
        const lite_field = liteFn$lib$util$json$findObjectField(lite_source, lite_objectStart, lite_key);
        void lite_field;
        if ((!((lite_field).found))) {
            return { found: false, ok: false, value: "" };
        }
        const lite_str = liteFn$lib$util$json$readStringAt(lite_source, (lite_field).valuePos);
        void lite_str;
        return { found: true, ok: (lite_str).ok, value: (lite_str).value };
    }
    void liteFn$lib$util$json$readObjectString;
    function liteFn$lib$util$json$readObjectInt(lite_source: string, lite_objectStart: bigint, lite_key: string): { found: boolean; ok: boolean; value: bigint } {
        void lite_source;
        void lite_objectStart;
        void lite_key;
        const lite_field = liteFn$lib$util$json$findObjectField(lite_source, lite_objectStart, lite_key);
        void lite_field;
        if ((!((lite_field).found))) {
            return { found: false, ok: false, value: 0n };
        }
        const lite_num = liteFn$lib$util$json$readIntAt(lite_source, (lite_field).valuePos);
        void lite_num;
        return { found: true, ok: (lite_num).ok, value: (lite_num).value };
    }
    void liteFn$lib$util$json$readObjectInt;
    function liteFn$lib$util$json$arrayElementOffsets(lite_source: string, lite_arrayStart: bigint): bigint[] {
        void lite_source;
        void lite_arrayStart;
        const lite_offsets: bigint[] = [...([])];
        void lite_offsets;
        const lite_size = lite$textLength(lite_source);
        void lite_size;
        let lite_pos = liteFn$lib$util$json$skipJsonSpaces(lite_source, lite_arrayStart);
        void lite_pos;
        if (((((lite_pos) >= (lite_size))) || (((lite$textAt(lite_source, lite_pos, 16194)) !== ("["))))) {
            return [...(lite_offsets)];
        }
        lite_pos = liteFn$lib$util$json$skipJsonSpaces(lite_source, lite$addInt(lite_pos, 1n, 16280));
        if (((((lite_pos) < (lite_size))) && (((lite$textAt(lite_source, lite_pos, 16308)) === ("]"))))) {
            return [...(lite_offsets)];
        }
        while (((lite_pos) < (lite_size))) {
            lite_offsets.push(lite_pos);
            const lite_skipped = liteFn$lib$util$json$skipValue(lite_source, lite_pos);
            void lite_skipped;
            if ((!((lite_skipped).ok))) {
                return [...(lite_offsets)];
            }
            lite_pos = liteFn$lib$util$json$skipJsonSpaces(lite_source, (lite_skipped).next);
            if (((((lite_pos) < (lite_size))) && (((lite$textAt(lite_source, lite_pos, 16586)) === (","))))) {
                lite_pos = liteFn$lib$util$json$skipJsonSpaces(lite_source, lite$addInt(lite_pos, 1n, 16661));
            } else {
                return [...(lite_offsets)];
            }
        }
        return [...(lite_offsets)];
    }
    void liteFn$lib$util$json$arrayElementOffsets;
    function liteFn$lib$util$json$quoteString(lite_value: string): string {
        void lite_value;
        const lite_size = lite$textLength(lite_value);
        void lite_size;
        let lite_out = "\"";
        void lite_out;
        let lite_runStart = 0n;
        void lite_runStart;
        let lite_i = 0n;
        void lite_i;
        while (((lite_i) < (lite_size))) {
            const lite_ch = lite$textAt(lite_value, lite_i, 18028);
            void lite_ch;
            let lite_esc = "";
            void lite_esc;
            if (((lite_ch) === ("\""))) {
                lite_esc = "\\\"";
            } else if (((lite_ch) === ("\\"))) {
                lite_esc = "\\\\";
            } else if (((lite_ch) === ("\n"))) {
                lite_esc = "\\n";
            } else if (((lite_ch) === ("\r"))) {
                lite_esc = "\\r";
            } else if (((lite_ch) === ("\t"))) {
                lite_esc = "\\t";
            }
            if (((lite_esc) !== (""))) {
                if (((lite_i) > (lite_runStart))) {
                    lite_out = ((lite_out) + (lite$textSlice(lite_value, lite_runStart, lite_i, 18353)));
                }
                lite_out = ((lite_out) + (lite_esc));
                lite_runStart = lite$addInt(lite_i, 1n, 18441);
            }
            lite_i = lite$addInt(lite_i, 1n, 18470);
        }
        if (((lite_runStart) < (lite_size))) {
            lite_out = ((lite_out) + (lite$textSlice(lite_value, lite_runStart, lite_size, 18518)));
        }
        return ((lite_out) + ("\""));
    }
    void liteFn$lib$util$json$quoteString;
    function liteFn$lib$util$markdown$findLineEnd(lite_source: string, lite_start: bigint, lite_size: bigint): bigint {
        void lite_source;
        void lite_start;
        void lite_size;
        const lite_idx = liteFn$lib$core$text$indexOfText(lite_source, "\n", lite_start);
        void lite_idx;
        return (Boolean(((lite_idx) < (0n))) ? lite_size : lite_idx);
    }
    void liteFn$lib$util$markdown$findLineEnd;
    function liteFn$lib$util$markdown$isBlankRest(lite_source: string, lite_fromPos: bigint, lite_lineEnd: bigint): boolean {
        void lite_source;
        void lite_fromPos;
        void lite_lineEnd;
        let lite_i = lite_fromPos;
        void lite_i;
        while (((lite_i) < (lite_lineEnd))) {
            if ((!(liteFn$lib$core$text$isWhitespace(lite$textAt(lite_source, lite_i, 487))))) {
                return false;
            }
            lite_i = lite$addInt(lite_i, 1n, 539);
        }
        return true;
    }
    void liteFn$lib$util$markdown$isBlankRest;
    function liteFn$lib$util$markdown$countRepeatedAt(lite_source: string, lite_start: bigint, lite_limit: bigint, lite_ch: string): bigint {
        void lite_source;
        void lite_start;
        void lite_limit;
        void lite_ch;
        let lite_count = 0n;
        void lite_count;
        while (((((lite$addInt(lite_start, lite_count, 678)) < (lite_limit))) && (((lite$textAt(lite_source, lite$addInt(lite_start, lite_count, 720), 698)) === (lite_ch))))) {
            lite_count = lite$addInt(lite_count, 1n, 759);
        }
        return lite_count;
    }
    void liteFn$lib$util$markdown$countRepeatedAt;
    function liteFn$lib$util$markdown$stripCodeBlocks(lite_source: string): string {
        void lite_source;
        if (((((liteFn$lib$core$text$indexOfText(lite_source, "```", 0n)) < (0n))) && (((liteFn$lib$core$text$indexOfText(lite_source, "~~~", 0n)) < (0n))))) {
            return lite_source;
        }
        const lite_size = lite$textLength(lite_source);
        void lite_size;
        let lite_out = "";
        void lite_out;
        let lite_runStart = 0n;
        void lite_runStart;
        let lite_pos = 0n;
        void lite_pos;
        let lite_inFence = false;
        void lite_inFence;
        let lite_fenceChar = "";
        void lite_fenceChar;
        let lite_fenceLen = 0n;
        void lite_fenceLen;
        let lite_fenceStart = 0n;
        void lite_fenceStart;
        while (((lite_pos) <= (lite_size))) {
            const lite_lineEnd = liteFn$lib$util$markdown$findLineEnd(lite_source, lite_pos, lite_size);
            void lite_lineEnd;
            if ((!(lite_inFence))) {
                if (((lite_pos) < (lite_size))) {
                    const lite_ch = lite$textAt(lite_source, lite_pos, 1409);
                    void lite_ch;
                    if (((((lite_ch) === ("`"))) || (((lite_ch) === ("~"))))) {
                        const lite_cnt = liteFn$lib$util$markdown$countRepeatedAt(lite_source, lite_pos, lite_lineEnd, lite_ch);
                        void lite_cnt;
                        if (((lite_cnt) >= (3n))) {
                            if (((lite_pos) > (lite_runStart))) {
                                lite_out = ((lite_out) + (lite$textSlice(lite_source, lite_runStart, lite_pos, 1663)));
                            }
                            lite_inFence = true;
                            lite_fenceChar = lite_ch;
                            lite_fenceLen = lite_cnt;
                            lite_fenceStart = lite_pos;
                        }
                    }
                }
            } else {
                if (((lite$addInt(lite_pos, lite_fenceLen, 1976)) <= (lite_lineEnd))) {
                    const lite_matches = liteFn$lib$util$markdown$countRepeatedAt(lite_source, lite_pos, lite_lineEnd, lite_fenceChar);
                    void lite_matches;
                    if (((((lite_matches) === (lite_fenceLen))) && (liteFn$lib$util$markdown$isBlankRest(lite_source, lite$addInt(lite_pos, lite_fenceLen, 2144), lite_lineEnd)))) {
                        lite_inFence = false;
                        lite_fenceChar = "";
                        lite_fenceLen = 0n;
                        lite_runStart = lite_lineEnd;
                    }
                }
            }
            if (((lite_lineEnd) >= (lite_size))) {
                break;
            }
            lite_pos = lite$addInt(lite_lineEnd, 1n, 2416);
        }
        if (lite_inFence) {
            lite_out = ((lite_out) + (lite$textSlice(lite_source, lite_fenceStart, lite_size, 2465)));
        } else if (((lite_runStart) < (lite_size))) {
            lite_out = ((lite_out) + (lite$textSlice(lite_source, lite_runStart, lite_size, 2555)));
        }
        return lite_out;
    }
    void liteFn$lib$util$markdown$stripCodeBlocks;
    function liteFn$lib$util$markdown$hasUnclosedFence(lite_source: string): boolean {
        void lite_source;
        if (((((liteFn$lib$core$text$indexOfText(lite_source, "```", 0n)) < (0n))) && (((liteFn$lib$core$text$indexOfText(lite_source, "~~~", 0n)) < (0n))))) {
            return false;
        }
        const lite_size = lite$textLength(lite_source);
        void lite_size;
        let lite_pos = 0n;
        void lite_pos;
        let lite_fenceChar = "";
        void lite_fenceChar;
        let lite_fenceLen = 0n;
        void lite_fenceLen;
        while (((lite_pos) < (lite_size))) {
            const lite_lineEnd = liteFn$lib$util$markdown$findLineEnd(lite_source, lite_pos, lite_size);
            void lite_lineEnd;
            let lite_lead = lite_pos;
            void lite_lead;
            let lite_spaces = 0n;
            void lite_spaces;
            while (((((((lite_lead) < (lite_lineEnd))) && (((lite_spaces) < (3n))))) && (liteFn$lib$core$text$isWhitespace(lite$textAt(lite_source, lite_lead, 3166))))) {
                lite_lead = lite$addInt(lite_lead, 1n, 3215);
                lite_spaces = lite$addInt(lite_spaces, 1n, 3248);
            }
            if (((lite_lead) < (lite_lineEnd))) {
                const lite_ch = lite$textAt(lite_source, lite_lead, 3309);
                void lite_ch;
                if (((((lite_ch) === ("`"))) || (((lite_ch) === ("~"))))) {
                    const lite_cnt = liteFn$lib$util$markdown$countRepeatedAt(lite_source, lite_lead, lite_lineEnd, lite_ch);
                    void lite_cnt;
                    if (((lite_cnt) >= (3n))) {
                        if (((lite_fenceLen) === (0n))) {
                            lite_fenceChar = lite_ch;
                            lite_fenceLen = lite_cnt;
                        } else if (((((lite_ch) === (lite_fenceChar))) && (((lite_cnt) >= (lite_fenceLen))))) {
                            lite_fenceChar = "";
                            lite_fenceLen = 0n;
                        }
                    }
                }
            }
            if (((lite_lineEnd) >= (lite_size))) {
                break;
            }
            lite_pos = lite$addInt(lite_lineEnd, 1n, 3858);
        }
        return ((lite_fenceLen) > (0n));
    }
    void liteFn$lib$util$markdown$hasUnclosedFence;
    function liteFn$lib$util$markdown$extractHeadings(lite_proseText: string): string[] {
        void lite_proseText;
        const lite_headings: string[] = [...([])];
        void lite_headings;
        if (((liteFn$lib$core$text$indexOfText(lite_proseText, "#", 0n)) < (0n))) {
            return [...(lite_headings)];
        }
        const lite_size = lite$textLength(lite_proseText);
        void lite_size;
        let lite_pos = 0n;
        void lite_pos;
        while (((lite_pos) < (lite_size))) {
            const lite_lineEnd = liteFn$lib$util$markdown$findLineEnd(lite_proseText, lite_pos, lite_size);
            void lite_lineEnd;
            let lite_cleanEnd = lite_lineEnd;
            void lite_cleanEnd;
            if (((((lite_cleanEnd) > (lite_pos))) && (((lite$textAt(lite_proseText, lite$subtractInt(lite_cleanEnd, 1n, 4355), 4327)) === ("\r"))))) {
                lite_cleanEnd = lite$subtractInt(lite_cleanEnd, 1n, 4402);
            }
            const lite_hashes = liteFn$lib$util$markdown$countRepeatedAt(lite_proseText, lite_pos, lite_cleanEnd, "#");
            void lite_hashes;
            if (((((((lite_hashes) >= (1n))) && (((lite_hashes) <= (6n))))) && (((lite$addInt(lite_pos, lite_hashes, 4530)) < (lite_cleanEnd))))) {
                const lite_afterHash = lite$textAt(lite_proseText, lite$addInt(lite_pos, lite_hashes, 4600), 4577);
                void lite_afterHash;
                if (((((lite_afterHash) === (" "))) || (((lite_afterHash) === ("\t"))))) {
                    let lite_bodyStart = lite$addInt(lite$addInt(lite_pos, lite_hashes, 4703), 1n, 4712);
                    void lite_bodyStart;
                    while (((((lite_bodyStart) < (lite_cleanEnd))) && (liteFn$lib$core$text$isWhitespace(lite$textAt(lite_proseText, lite_bodyStart, 4781))))) {
                        lite_bodyStart = lite$addInt(lite_bodyStart, 1n, 4856);
                    }
                    let lite_bodyEnd = lite_cleanEnd;
                    void lite_bodyEnd;
                    while (((((lite_bodyEnd) > (lite_bodyStart))) && (liteFn$lib$core$text$isWhitespace(lite$textAt(lite_proseText, lite$subtractInt(lite_bodyEnd, 1n, 5010), 4983))))) {
                        lite_bodyEnd = lite$subtractInt(lite_bodyEnd, 1n, 5056);
                    }
                    while (((((lite_bodyEnd) > (lite_bodyStart))) && (((lite$textAt(lite_proseText, lite$subtractInt(lite_bodyEnd, 1n, 5151), 5124)) === ("#"))))) {
                        lite_bodyEnd = lite$subtractInt(lite_bodyEnd, 1n, 5203);
                    }
                    while (((((lite_bodyEnd) > (lite_bodyStart))) && (liteFn$lib$core$text$isWhitespace(lite$textAt(lite_proseText, lite$subtractInt(lite_bodyEnd, 1n, 5316), 5289))))) {
                        lite_bodyEnd = lite$subtractInt(lite_bodyEnd, 1n, 5362);
                    }
                    if (((lite_bodyEnd) > (lite_bodyStart))) {
                        lite_headings.push(lite$textSlice(lite_proseText, lite_bodyStart, lite_bodyEnd, 5474));
                    }
                }
            }
            if (((lite_lineEnd) >= (lite_size))) {
                break;
            }
            lite_pos = lite$addInt(lite_lineEnd, 1n, 5620);
        }
        return [...(lite_headings)];
    }
    void liteFn$lib$util$markdown$extractHeadings;
    function liteFn$lib$util$markdown$stripHtmlTags(lite_source: string): string {
        void lite_source;
        const lite_size = lite$textLength(lite_source);
        void lite_size;
        let lite_out = "";
        void lite_out;
        let lite_runStart = 0n;
        void lite_runStart;
        let lite_i = 0n;
        void lite_i;
        while (((lite_i) < (lite_size))) {
            const lite_open = liteFn$lib$core$text$indexOfText(lite_source, "<", lite_i);
            void lite_open;
            if (((lite_open) < (0n))) {
                break;
            }
            const lite_close = liteFn$lib$core$text$indexOfText(lite_source, ">", lite$addInt(lite_open, 1n, 5937));
            void lite_close;
            if (((lite_close) >= (0n))) {
                if (((lite_open) > (lite_runStart))) {
                    lite_out = ((lite_out) + (lite$textSlice(lite_source, lite_runStart, lite_open, 6012)));
                }
                lite_i = lite$addInt(lite_close, 1n, 6072);
                lite_runStart = lite_i;
            } else {
                lite_i = lite$addInt(lite_open, 1n, 6141);
            }
        }
        if (((lite_runStart) === (0n))) {
            return lite_source;
        }
        if (((lite_runStart) < (lite_size))) {
            lite_out = ((lite_out) + (lite$textSlice(lite_source, lite_runStart, lite_size, 6239)));
        }
        return lite_out;
    }
    void liteFn$lib$util$markdown$stripHtmlTags;
    function liteFn$lib$util$markdown$isAsciiPrintablePunct(lite_ch: string): boolean {
        void lite_ch;
        return liteFn$lib$core$text$containsText("!\"#$%&'()*+,./:;<=>?@[\\]^`{|}~", lite_ch);
    }
    void liteFn$lib$util$markdown$isAsciiPrintablePunct;
    function liteFn$lib$util$markdown$isUnicodeNonWordSymbol(lite_ch: string): boolean {
        void lite_ch;
        return liteFn$lib$core$text$containsText("—–…“”‘’•·×°§→←↔«»‹›", lite_ch);
    }
    void liteFn$lib$util$markdown$isUnicodeNonWordSymbol;
    function liteFn$lib$util$markdown$headingAnchor(lite_heading: string): string {
        void lite_heading;
        const lite_cleaned = liteFn$lib$util$markdown$stripHtmlTags(liteFn$lib$core$text$toLowerAscii(lite_heading));
        void lite_cleaned;
        const lite_size = lite$textLength(lite_cleaned);
        void lite_size;
        let lite_out = "";
        void lite_out;
        let lite_i = 0n;
        void lite_i;
        while (((lite_i) < (lite_size))) {
            const lite_ch = lite$textAt(lite_cleaned, lite_i, 6770);
            void lite_ch;
            if (liteFn$lib$core$text$isWhitespace(lite_ch)) {
                lite_out = ((lite_out) + ("-"));
            } else if (((((((((lite_ch) === ("_"))) || (((lite_ch) === ("-"))))) || (liteFn$lib$core$text$isAsciiLetter(lite_ch)))) || (liteFn$lib$core$text$isDigit(lite_ch)))) {
                lite_out = ((lite_out) + (lite_ch));
            } else if (((liteFn$lib$util$markdown$isAsciiPrintablePunct(lite_ch)) || (liteFn$lib$util$markdown$isUnicodeNonWordSymbol(lite_ch)))) {
            } else {
                lite_out = ((lite_out) + (lite_ch));
            }
            lite_i = lite$addInt(lite_i, 1n, 7117);
        }
        return lite_out;
    }
    void liteFn$lib$util$markdown$headingAnchor;
    function liteFn$lib$util$markdown$collectAnchors(lite_docText: string): string[] {
        void lite_docText;
        const lite_found: string[] = [...([])];
        void lite_found;
        const lite_seenSlugs: string[] = [...([])];
        void lite_seenSlugs;
        const lite_headings: string[] = [...(liteFn$lib$util$markdown$extractHeadings(liteFn$lib$util$markdown$stripCodeBlocks(lite_docText)))];
        void lite_headings;
        for (const lite_heading of [...(lite_headings)]) {
            void lite_heading;
            const lite_slug = liteFn$lib$util$markdown$headingAnchor(lite_heading);
            void lite_slug;
            let lite_dupCount = 0n;
            void lite_dupCount;
            for (const lite_prev of [...(lite_seenSlugs)]) {
                void lite_prev;
                if (((lite_prev) === (lite_slug))) {
                    lite_dupCount = lite$addInt(lite_dupCount, 1n, 7638);
                }
            }
            lite_seenSlugs.push(lite_slug);
            const lite_anchor = (Boolean(((lite_dupCount) === (0n))) ? lite_slug : ((((lite_slug) + ("-"))) + (liteFn$lib$core$int$intText(lite_dupCount))));
            void lite_anchor;
            if ((!(liteFn$lib$core$list$listContainsText([...(lite_found)], lite_anchor)))) {
                lite_found.push(lite_anchor);
            }
        }
        if (((((liteFn$lib$core$text$indexOfText(lite_docText, "id=", 0n)) < (0n))) && (((liteFn$lib$core$text$indexOfText(lite_docText, "name=", 0n)) < (0n))))) {
            return [...(lite_found)];
        }
        const lite_size = lite$textLength(lite_docText);
        void lite_size;
        let lite_pos = 0n;
        void lite_pos;
        while (((lite_pos) < (lite_size))) {
            const lite_eq = liteFn$lib$core$text$indexOfText(lite_docText, "=", lite_pos);
            void lite_eq;
            if (((lite_eq) < (0n))) {
                break;
            }
            let lite_isMatch = false;
            void lite_isMatch;
            if (((((lite$subtractInt(lite_eq, 2n, 8230)) >= (lite_pos))) && (liteFn$lib$core$text$startsWithAt(lite_docText, lite$subtractInt(lite_eq, 2n, 8275), "id=")))) {
                lite_isMatch = ((((lite$subtractInt(lite_eq, 2n, 8314)) === (0n))) || ((!(liteFn$lib$core$text$isNameContinue(lite$textAt(lite_docText, lite$subtractInt(lite_eq, 3n, 8370), 8350))))));
            } else if (((((lite$subtractInt(lite_eq, 4n, 8398)) >= (lite_pos))) && (liteFn$lib$core$text$startsWithAt(lite_docText, lite$subtractInt(lite_eq, 4n, 8443), "name=")))) {
                lite_isMatch = ((((lite$subtractInt(lite_eq, 4n, 8484)) === (0n))) || ((!(liteFn$lib$core$text$isNameContinue(lite$textAt(lite_docText, lite$subtractInt(lite_eq, 5n, 8540), 8520))))));
            }
            if (((lite_isMatch) && (((lite$addInt(lite_eq, 1n, 8583)) < (lite_size))))) {
                const lite_q = lite$textAt(lite_docText, lite$addInt(lite_eq, 1n, 8633), 8613);
                void lite_q;
                if (((((lite_q) === ("\""))) || (((lite_q) === ("'"))))) {
                    const lite_valStart = lite$addInt(lite_eq, 2n, 8709);
                    void lite_valStart;
                    const lite_valEnd = liteFn$lib$core$text$indexOfText(lite_docText, lite_q, lite_valStart);
                    void lite_valEnd;
                    if (((lite_valEnd) > (lite_valStart))) {
                        const lite_val = lite$textSlice(lite_docText, lite_valStart, lite_valEnd, 8846);
                        void lite_val;
                        if ((!(liteFn$lib$core$list$listContainsText([...(lite_found)], lite_val)))) {
                            lite_found.push(lite_val);
                        }
                        lite_pos = lite$addInt(lite_valEnd, 1n, 9058);
                    } else {
                        lite_pos = lite$addInt(lite_eq, 1n, 9117);
                    }
                } else {
                    lite_pos = lite$addInt(lite_eq, 1n, 9186);
                }
            } else {
                lite_pos = lite$addInt(lite_eq, 1n, 9243);
            }
        }
        return [...(lite_found)];
    }
    void liteFn$lib$util$markdown$collectAnchors;
    function liteFn$lib$util$markdown$stripInlineCode(lite_proseText: string): string {
        void lite_proseText;
        const lite_size = lite$textLength(lite_proseText);
        void lite_size;
        let lite_out = "";
        void lite_out;
        let lite_runStart = 0n;
        void lite_runStart;
        let lite_pos = 0n;
        void lite_pos;
        while (((lite_pos) < (lite_size))) {
            const lite_tickPos = liteFn$lib$core$text$indexOfText(lite_proseText, "`", lite_pos);
            void lite_tickPos;
            if (((lite_tickPos) < (0n))) {
                break;
            }
            const lite_ticks = liteFn$lib$util$markdown$countRepeatedAt(lite_proseText, lite_tickPos, lite_size, "`");
            void lite_ticks;
            const lite_closeNeedle = liteFn$lib$core$text$repeatText("`", lite_ticks);
            void lite_closeNeedle;
            const lite_lineEnd = liteFn$lib$util$markdown$findLineEnd(lite_proseText, lite$addInt(lite_tickPos, lite_ticks, 9705), lite_size);
            void lite_lineEnd;
            const lite_closeAt = liteFn$lib$core$text$indexOfText(lite_proseText, lite_closeNeedle, lite$addInt(lite_tickPos, lite_ticks, 9789));
            void lite_closeAt;
            if (((((lite_closeAt) >= (0n))) && (((lite$addInt(lite_closeAt, lite_ticks, 9835)) <= (lite_lineEnd))))) {
                if (((lite_tickPos) > (lite_runStart))) {
                    lite_out = ((lite_out) + (lite$textSlice(lite_proseText, lite_runStart, lite_tickPos, 9904)));
                }
                lite_pos = lite$addInt(lite_closeAt, lite_ticks, 9974);
                lite_runStart = lite_pos;
            } else {
                lite_pos = lite$addInt(lite_tickPos, lite_ticks, 10054);
            }
        }
        if (((lite_runStart) === (0n))) {
            return lite_proseText;
        }
        if (((lite_runStart) < (lite_size))) {
            lite_out = ((lite_out) + (lite$textSlice(lite_proseText, lite_runStart, lite_size, 10159)));
        }
        return lite_out;
    }
    void liteFn$lib$util$markdown$stripInlineCode;
    function liteFn$lib$util$markdown$extractLinkTargets(lite_proseText: string): string[] {
        void lite_proseText;
        const lite_links: string[] = [...([])];
        void lite_links;
        if (((liteFn$lib$core$text$indexOfText(lite_proseText, "](", 0n)) < (0n))) {
            return [...(lite_links)];
        }
        const lite_clean = liteFn$lib$util$markdown$stripInlineCode(lite_proseText);
        void lite_clean;
        const lite_size = lite$textLength(lite_clean);
        void lite_size;
        let lite_pos = 0n;
        void lite_pos;
        while (((lite_pos) < (lite_size))) {
            const lite_openPos = liteFn$lib$core$text$indexOfText(lite_clean, "[", lite_pos);
            void lite_openPos;
            if (((lite_openPos) < (0n))) {
                break;
            }
            const lite_labelEnd = liteFn$lib$core$text$indexOfText(lite_clean, "]", lite$addInt(lite_openPos, 1n, 10727));
            void lite_labelEnd;
            if (((lite_labelEnd) < (0n))) {
                break;
            }
            const lite_nlPos = liteFn$lib$core$text$indexOfText(lite_clean, "\n", lite$addInt(lite_openPos, 1n, 10823));
            void lite_nlPos;
            if ((((((((((lite_nlPos) < (0n))) || (((lite_labelEnd) < (lite_nlPos)))))) && (((lite$addInt(lite_labelEnd, 1n, 10885)) < (lite_size))))) && (((lite$textAt(lite_clean, lite$addInt(lite_labelEnd, 1n, 10924), 10900)) === ("("))))) {
                let lite_targetStart = lite$addInt(lite_labelEnd, 2n, 10978);
                void lite_targetStart;
                if (((lite_targetStart) < (lite_size))) {
                    if (((lite$textAt(lite_clean, lite_targetStart, 11038)) === ("<"))) {
                        const lite_gtPos = liteFn$lib$core$text$indexOfText(lite_clean, ">", lite$addInt(lite_targetStart, 1n, 11145));
                        void lite_gtPos;
                        if (((lite_gtPos) > (lite$addInt(lite_targetStart, 1n, 11194)))) {
                            let lite_afterGt = lite$addInt(lite_gtPos, 1n, 11245);
                            void lite_afterGt;
                            let lite_validClose = ((((lite_afterGt) < (lite_size))) && (((lite$textAt(lite_clean, lite_afterGt, 11311)) === (")"))));
                            void lite_validClose;
                            if ((((((!(lite_validClose))) && (((lite_afterGt) < (lite_size))))) && (liteFn$lib$core$text$isWhitespace(lite$textAt(lite_clean, lite_afterGt, 11426))))) {
                                while (((((lite_afterGt) < (lite_size))) && (liteFn$lib$core$text$isWhitespace(lite$textAt(lite_clean, lite_afterGt, 11523))))) {
                                    lite_afterGt = lite$addInt(lite_afterGt, 1n, 11600);
                                }
                                if (((((lite_afterGt) < (lite_size))) && (((lite$textAt(lite_clean, lite_afterGt, 11685)) === ("\""))))) {
                                    const lite_titleEnd = liteFn$lib$core$text$indexOfText(lite_clean, "\"", lite$addInt(lite_afterGt, 1n, 11801));
                                    void lite_titleEnd;
                                    if (((((((lite_titleEnd) >= (0n))) && (((lite$addInt(lite_titleEnd, 1n, 11869)) < (lite_size))))) && (((lite$textAt(lite_clean, lite$addInt(lite_titleEnd, 1n, 11908), 11884)) === (")"))))) {
                                        lite_afterGt = lite$addInt(lite_titleEnd, 1n, 11977);
                                        lite_validClose = true;
                                    }
                                }
                            }
                            if (lite_validClose) {
                                lite_links.push(lite$textSlice(lite_clean, lite$addInt(lite_targetStart, 1n, 12250), lite_gtPos, 12220));
                                lite_pos = lite$addInt(lite_afterGt, 1n, 12306);
                            } else {
                                lite_pos = lite$addInt(lite_openPos, 1n, 12386);
                            }
                        } else {
                            lite_pos = lite$addInt(lite_openPos, 1n, 12484);
                        }
                    } else {
                        let lite_targetEnd = lite_targetStart;
                        void lite_targetEnd;
                        while (((((((lite_targetEnd) < (lite_size))) && ((!(liteFn$lib$core$text$isWhitespace(lite$textAt(lite_clean, lite_targetEnd, 12654))))))) && (((lite$textAt(lite_clean, lite_targetEnd, 12685)) !== (")"))))) {
                            lite_targetEnd = lite$addInt(lite_targetEnd, 1n, 12767);
                        }
                        if (((((lite_targetEnd) > (lite_targetStart))) && (((lite_targetEnd) < (lite_size))))) {
                            let lite_afterTarget = lite_targetEnd;
                            void lite_afterTarget;
                            let lite_validClose = ((lite$textAt(lite_clean, lite_afterTarget, 12960)) === (")"));
                            void lite_validClose;
                            if ((((!(lite_validClose))) && (liteFn$lib$core$text$isWhitespace(lite$textAt(lite_clean, lite_afterTarget, 13060))))) {
                                while (((((lite_afterTarget) < (lite_size))) && (liteFn$lib$core$text$isWhitespace(lite$textAt(lite_clean, lite_afterTarget, 13165))))) {
                                    lite_afterTarget = lite$addInt(lite_afterTarget, 1n, 13254);
                                }
                                if (((((lite_afterTarget) < (lite_size))) && (((lite$textAt(lite_clean, lite_afterTarget, 13343)) === ("\""))))) {
                                    const lite_titleEnd = liteFn$lib$core$text$indexOfText(lite_clean, "\"", lite$addInt(lite_afterTarget, 1n, 13467));
                                    void lite_titleEnd;
                                    if (((((((lite_titleEnd) >= (0n))) && (((lite$addInt(lite_titleEnd, 1n, 13535)) < (lite_size))))) && (((lite$textAt(lite_clean, lite$addInt(lite_titleEnd, 1n, 13574), 13550)) === (")"))))) {
                                        lite_afterTarget = lite$addInt(lite_titleEnd, 1n, 13647);
                                        lite_validClose = true;
                                    }
                                }
                            }
                            if (lite_validClose) {
                                lite_links.push(lite$textSlice(lite_clean, lite_targetStart, lite_targetEnd, 13890));
                                lite_pos = lite$addInt(lite_afterTarget, 1n, 13980);
                            } else {
                                lite_pos = lite$addInt(lite_openPos, 1n, 14060);
                            }
                        } else {
                            lite_pos = lite$addInt(lite_openPos, 1n, 14158);
                        }
                    }
                } else {
                    lite_pos = lite$addInt(lite_openPos, 1n, 14254);
                }
            } else {
                lite_pos = lite$addInt(lite_openPos, 1n, 14316);
            }
        }
        return [...(lite_links)];
    }
    void liteFn$lib$util$markdown$extractLinkTargets;
    function liteFn$lib$util$markdown$extractBacktickFenceBodies(lite_docText: string): string[] {
        void lite_docText;
        const lite_bodies: string[] = [...([])];
        void lite_bodies;
        if (((liteFn$lib$core$text$indexOfText(lite_docText, "```", 0n)) < (0n))) {
            return [...(lite_bodies)];
        }
        const lite_size = lite$textLength(lite_docText);
        void lite_size;
        let lite_pos = 0n;
        void lite_pos;
        let lite_inFence = false;
        void lite_inFence;
        let lite_bodyStart = 0n;
        void lite_bodyStart;
        while (((lite_pos) <= (lite_size))) {
            const lite_lineEnd = liteFn$lib$util$markdown$findLineEnd(lite_docText, lite_pos, lite_size);
            void lite_lineEnd;
            if (liteFn$lib$core$text$startsWithAt(lite_docText, lite_pos, "```")) {
                if ((!(lite_inFence))) {
                    if (((lite_lineEnd) < (lite_size))) {
                        lite_inFence = true;
                        lite_bodyStart = lite$addInt(lite_lineEnd, 1n, 14985);
                    }
                } else {
                    lite_bodies.push(lite$textSlice(lite_docText, lite_bodyStart, lite_pos, 15071));
                    lite_inFence = false;
                }
            }
            if (((lite_lineEnd) >= (lite_size))) {
                break;
            }
            lite_pos = lite$addInt(lite_lineEnd, 1n, 15226);
        }
        return [...(lite_bodies)];
    }
    void liteFn$lib$util$markdown$extractBacktickFenceBodies;
    function liteFn$lib$util$markdown__html$escapeHtml(lite_raw: string): string {
        void lite_raw;
        const lite_size = lite$textLength(lite_raw);
        void lite_size;
        let lite_out = "";
        void lite_out;
        let lite_runStart = 0n;
        void lite_runStart;
        let lite_i = 0n;
        void lite_i;
        while (((lite_i) < (lite_size))) {
            const lite_ch = lite$textAt(lite_raw, lite_i, 470);
            void lite_ch;
            let lite_esc = "";
            void lite_esc;
            if (((lite_ch) === ("&"))) {
                lite_esc = "&amp;";
            } else if (((lite_ch) === ("<"))) {
                lite_esc = "&lt;";
            } else if (((lite_ch) === (">"))) {
                lite_esc = "&gt;";
            } else if (((lite_ch) === ("\""))) {
                lite_esc = "&quot;";
            }
            if (((lite_esc) !== (""))) {
                if (((lite_i) > (lite_runStart))) {
                    lite_out = ((lite_out) + (lite$textSlice(lite_raw, lite_runStart, lite_i, 751)));
                }
                lite_out = ((lite_out) + (lite_esc));
                lite_runStart = lite$addInt(lite_i, 1n, 837);
            }
            lite_i = lite$addInt(lite_i, 1n, 862);
        }
        if (((lite_runStart) === (0n))) {
            return lite_raw;
        }
        if (((lite_runStart) < (lite_size))) {
            lite_out = ((lite_out) + (lite$textSlice(lite_raw, lite_runStart, lite_size, 948)));
        }
        return lite_out;
    }
    void liteFn$lib$util$markdown__html$escapeHtml;
    function liteFn$lib$util$markdown__html$countCharAt(lite_source: string, lite_start: bigint, lite_limit: bigint, lite_ch: string): bigint {
        void lite_source;
        void lite_start;
        void lite_limit;
        void lite_ch;
        let lite_count = 0n;
        void lite_count;
        while (((((lite$addInt(lite_start, lite_count, 1107)) < (lite_limit))) && (((lite$textAt(lite_source, lite$addInt(lite_start, lite_count, 1149), 1127)) === (lite_ch))))) {
            lite_count = lite$addInt(lite_count, 1n, 1180);
        }
        return lite_count;
    }
    void liteFn$lib$util$markdown__html$countCharAt;
    function liteFn$lib$util$markdown__html$findLineEnd(lite_source: string, lite_start: bigint, lite_size: bigint): bigint {
        void lite_source;
        void lite_start;
        void lite_size;
        const lite_idx = liteFn$lib$core$text$indexOfText(lite_source, "\n", lite_start);
        void lite_idx;
        return (Boolean(((lite_idx) < (0n))) ? lite_size : lite_idx);
    }
    void liteFn$lib$util$markdown__html$findLineEnd;
    function liteFn$lib$util$markdown__html$splitLines(lite_source: string): string[] {
        void lite_source;
        const lite_lines: string[] = [...([])];
        void lite_lines;
        const lite_size = lite$textLength(lite_source);
        void lite_size;
        let lite_pos = 0n;
        void lite_pos;
        while (((lite_pos) <= (lite_size))) {
            const lite_lineEnd = liteFn$lib$util$markdown__html$findLineEnd(lite_source, lite_pos, lite_size);
            void lite_lineEnd;
            let lite_cleanEnd = lite_lineEnd;
            void lite_cleanEnd;
            if (((((lite_cleanEnd) > (lite_pos))) && (((lite$textAt(lite_source, lite$subtractInt(lite_cleanEnd, 1n, 1657), 1632)) === ("\r"))))) {
                lite_cleanEnd = lite$subtractInt(lite_cleanEnd, 1n, 1693);
            }
            lite_lines.push(lite$textSlice(lite_source, lite_pos, lite_cleanEnd, 1742));
            if (((lite_lineEnd) >= (lite_size))) {
                break;
            }
            lite_pos = lite$addInt(lite_lineEnd, 1n, 1838);
        }
        return [...(lite_lines)];
    }
    void liteFn$lib$util$markdown__html$splitLines;
    function liteFn$lib$util$markdown__html$isSchemeChar(lite_ch: string): boolean {
        void lite_ch;
        return ((((((((liteFn$lib$core$text$isAsciiLetter(lite_ch)) || (liteFn$lib$core$text$isDigit(lite_ch)))) || (((lite_ch) === ("+"))))) || (((lite_ch) === ("."))))) || (((lite_ch) === ("-"))));
    }
    void liteFn$lib$util$markdown__html$isSchemeChar;
    function liteFn$lib$util$markdown__html$isExternalHref(lite_target: string): boolean {
        void lite_target;
        if (liteFn$lib$core$text$startsWithAt(lite_target, 0n, "//")) {
            return true;
        }
        const lite_size = lite$textLength(lite_target);
        void lite_size;
        if (((((lite_size) < (2n))) || ((!(liteFn$lib$core$text$isAsciiLetter(lite$textAt(lite_target, 0n, 2171))))))) {
            return false;
        }
        let lite_i = 1n;
        void lite_i;
        while (((lite_i) < (lite_size))) {
            const lite_ch = lite$textAt(lite_target, lite_i, 2259);
            void lite_ch;
            if (((lite_ch) === (":"))) {
                return true;
            }
            if ((!(liteFn$lib$util$markdown__html$isSchemeChar(lite_ch)))) {
                return false;
            }
            lite_i = lite$addInt(lite_i, 1n, 2377);
        }
        return false;
    }
    void liteFn$lib$util$markdown__html$isExternalHref;
    function liteFn$lib$util$markdown__html$isEscapablePunct(lite_ch: string): boolean {
        void lite_ch;
        return liteFn$lib$core$text$containsText("\\`*_{}[]()#+-.!|<>\"'~", lite_ch);
    }
    void liteFn$lib$util$markdown__html$isEscapablePunct;
    function liteFn$lib$util$markdown__html$findClosingCodeTicks(lite_line: string, lite_start: bigint, lite_tickCount: bigint): bigint {
        void lite_line;
        void lite_start;
        void lite_tickCount;
        const lite_size = lite$textLength(lite_line);
        void lite_size;
        let lite_pos = lite_start;
        void lite_pos;
        while (((lite_pos) < (lite_size))) {
            if (((lite$textAt(lite_line, lite_pos, 2665)) === ("`"))) {
                const lite_cnt = liteFn$lib$util$markdown__html$countCharAt(lite_line, lite_pos, lite_size, "`");
                void lite_cnt;
                if (((lite_cnt) === (lite_tickCount))) {
                    return lite_pos;
                }
                lite_pos = lite$addInt(lite_pos, lite_cnt, 2811);
            } else {
                lite_pos = lite$addInt(lite_pos, 1n, 2852);
            }
        }
        return (-1n);
    }
    void liteFn$lib$util$markdown__html$findClosingCodeTicks;
    function liteFn$lib$util$markdown__html$findMatchingBracketEnd(lite_line: string, lite_openPos: bigint): bigint {
        void lite_line;
        void lite_openPos;
        const lite_size = lite$textLength(lite_line);
        void lite_size;
        let lite_pos = lite$addInt(lite_openPos, 1n, 3003);
        void lite_pos;
        let lite_depth = 1n;
        void lite_depth;
        while (((lite_pos) < (lite_size))) {
            const lite_ch = lite$textAt(lite_line, lite_pos, 3064);
            void lite_ch;
            if (((((lite_ch) === ("\\"))) && (((lite$addInt(lite_pos, 1n, 3114)) < (lite_size))))) {
                lite_pos = lite$addInt(lite_pos, 2n, 3143);
            } else if (((lite_ch) === ("`"))) {
                const lite_ticks = liteFn$lib$util$markdown__html$countCharAt(lite_line, lite_pos, lite_size, "`");
                void lite_ticks;
                const lite_closeTicks = liteFn$lib$util$markdown__html$findClosingCodeTicks(lite_line, lite$addInt(lite_pos, lite_ticks, 3292), lite_ticks);
                void lite_closeTicks;
                if (((lite_closeTicks) >= (0n))) {
                    lite_pos = lite$addInt(lite_closeTicks, lite_ticks, 3375);
                } else {
                    lite_pos = lite$addInt(lite_pos, lite_ticks, 3425);
                }
            } else if (((lite_ch) === ("["))) {
                lite_depth = lite$addInt(lite_depth, 1n, 3497);
                lite_pos = lite$addInt(lite_pos, 1n, 3519);
            } else if (((lite_ch) === ("]"))) {
                lite_depth = lite$subtractInt(lite_depth, 1n, 3573);
                if (((lite_depth) === (0n))) {
                    return lite_pos;
                }
                lite_pos = lite$addInt(lite_pos, 1n, 3637);
            } else {
                lite_pos = lite$addInt(lite_pos, 1n, 3676);
            }
        }
        return (-1n);
    }
    void liteFn$lib$util$markdown__html$findMatchingBracketEnd;
    function liteFn$lib$util$markdown__html$parseLinkDestination(lite_line: string, lite_openParen: bigint): { ok: boolean; href: string; title: string; closeParen: bigint } {
        void lite_line;
        void lite_openParen;
        const lite_size = lite$textLength(lite_line);
        void lite_size;
        let lite_pos = lite$addInt(lite_openParen, 1n, 3882);
        void lite_pos;
        while (((((lite_pos) < (lite_size))) && (liteFn$lib$core$text$isWhitespace(lite$textAt(lite_line, lite_pos, 3929))))) {
            lite_pos = lite$addInt(lite_pos, 1n, 3963);
        }
        if (((lite_pos) >= (lite_size))) {
            return { ok: false, href: "", title: "", closeParen: (-1n) };
        }
        let lite_href = "";
        void lite_href;
        if (((lite$textAt(lite_line, lite_pos, 4098)) === ("<"))) {
            const lite_gtPos = liteFn$lib$core$text$indexOfText(lite_line, ">", lite$addInt(lite_pos, 1n, 4175));
            void lite_gtPos;
            if (((lite_gtPos) < (0n))) {
                return { ok: false, href: "", title: "", closeParen: (-1n) };
            }
            lite_href = lite$textSlice(lite_line, lite$addInt(lite_pos, 1n, 4323), lite_gtPos, 4302);
            lite_pos = lite$addInt(lite_gtPos, 1n, 4356);
        } else {
            const lite_destStart = lite_pos;
            void lite_destStart;
            let lite_parenDepth = 0n;
            void lite_parenDepth;
            while (((lite_pos) < (lite_size))) {
                const lite_ch = lite$textAt(lite_line, lite_pos, 4473);
                void lite_ch;
                if (((((lite_ch) === (")"))) && (((lite_parenDepth) === (0n))))) {
                    break;
                }
                if (((liteFn$lib$core$text$isWhitespace(lite_ch)) && (((lite_parenDepth) === (0n))))) {
                    break;
                }
                if (((lite_ch) === ("("))) {
                    lite_parenDepth = lite$addInt(lite_parenDepth, 1n, 4655);
                } else if (((lite_ch) === (")"))) {
                    lite_parenDepth = lite$subtractInt(lite_parenDepth, 1n, 4706);
                }
                lite_pos = lite$addInt(lite_pos, 1n, 4730);
            }
            if (((lite_pos) === (lite_destStart))) {
                return { ok: false, href: "", title: "", closeParen: (-1n) };
            }
            lite_href = lite$textSlice(lite_line, lite_destStart, lite_pos, 4874);
        }
        while (((((lite_pos) < (lite_size))) && (liteFn$lib$core$text$isWhitespace(lite$textAt(lite_line, lite_pos, 4956))))) {
            lite_pos = lite$addInt(lite_pos, 1n, 4990);
        }
        let lite_title = "";
        void lite_title;
        if (((((lite_pos) < (lite_size))) && ((((((lite$textAt(lite_line, lite_pos, 5046)) === ("\""))) || (((lite$textAt(lite_line, lite_pos, 5076)) === ("'")))))))) {
            const lite_q = lite$textAt(lite_line, lite_pos, 5118);
            void lite_q;
            const lite_qEnd = liteFn$lib$core$text$indexOfText(lite_line, lite_q, lite$addInt(lite_pos, 1n, 5184));
            void lite_qEnd;
            if (((lite_qEnd) < (0n))) {
                return { ok: false, href: "", title: "", closeParen: (-1n) };
            }
            lite_title = lite$textSlice(lite_line, lite$addInt(lite_pos, 1n, 5332), lite_qEnd, 5311);
            lite_pos = lite$addInt(lite_qEnd, 1n, 5363);
            while (((((lite_pos) < (lite_size))) && (liteFn$lib$core$text$isWhitespace(lite$textAt(lite_line, lite_pos, 5414))))) {
                lite_pos = lite$addInt(lite_pos, 1n, 5452);
            }
        }
        if (((((lite_pos) >= (lite_size))) || (((lite$textAt(lite_line, lite_pos, 5496)) !== (")"))))) {
            return { ok: false, href: "", title: "", closeParen: (-1n) };
        }
        return { ok: true, href: lite_href, title: lite_title, closeParen: lite_pos };
    }
    void liteFn$lib$util$markdown__html$parseLinkDestination;
    function liteFn$lib$util$markdown__html$findClosingEmph(lite_line: string, lite_start: bigint, lite_doubleStar: boolean): bigint {
        void lite_line;
        void lite_start;
        void lite_doubleStar;
        const lite_size = lite$textLength(lite_line);
        void lite_size;
        let lite_pos = lite_start;
        void lite_pos;
        while (((lite_pos) < (lite_size))) {
            const lite_ch = lite$textAt(lite_line, lite_pos, 5815);
            void lite_ch;
            if (((((lite_ch) === ("\\"))) && (((lite$addInt(lite_pos, 1n, 5865)) < (lite_size))))) {
                lite_pos = lite$addInt(lite_pos, 2n, 5894);
            } else if (((lite_ch) === ("`"))) {
                const lite_ticks = liteFn$lib$util$markdown__html$countCharAt(lite_line, lite_pos, lite_size, "`");
                void lite_ticks;
                const lite_closeTicks = liteFn$lib$util$markdown__html$findClosingCodeTicks(lite_line, lite$addInt(lite_pos, lite_ticks, 6043), lite_ticks);
                void lite_closeTicks;
                if (((lite_closeTicks) >= (0n))) {
                    lite_pos = lite$addInt(lite_closeTicks, lite_ticks, 6126);
                } else {
                    lite_pos = lite$addInt(lite_pos, lite_ticks, 6176);
                }
            } else if (((lite_ch) === ("*"))) {
                if (lite_doubleStar) {
                    const lite_starRun = liteFn$lib$util$markdown__html$countCharAt(lite_line, lite_pos, lite_size, "*");
                    void lite_starRun;
                    if (((((((lite_starRun) >= (2n))) && (((lite_pos) > (lite_start))))) && ((!(liteFn$lib$core$text$isWhitespace(lite$textAt(lite_line, lite$subtractInt(lite_pos, 1n, 6412), 6394))))))) {
                        return lite$subtractInt(lite$addInt(lite_pos, lite_starRun, 6451), 2n, 6461);
                    }
                    lite_pos = lite$addInt(lite_pos, lite_starRun, 6504);
                } else {
                    if (((((lite$addInt(lite_pos, 1n, 6560)) < (lite_size))) && (((lite$textAt(lite_line, lite$addInt(lite_pos, 1n, 6593), 6575)) === ("*"))))) {
                        lite_pos = lite$addInt(lite_pos, 2n, 6631);
                    } else if (((((lite_pos) > (lite_start))) && ((!(liteFn$lib$core$text$isWhitespace(lite$textAt(lite_line, lite$subtractInt(lite_pos, 1n, 6719), 6701))))))) {
                        return lite_pos;
                    } else {
                        lite_pos = lite$addInt(lite_pos, 1n, 6808);
                    }
                }
            } else {
                lite_pos = lite$addInt(lite_pos, 1n, 6879);
            }
        }
        return (-1n);
    }
    void liteFn$lib$util$markdown__html$findClosingEmph;
    function liteFn$lib$util$markdown__html$renderInline(lite_line: string): string {
        void lite_line;
        const lite_size = lite$textLength(lite_line);
        void lite_size;
        let lite_out = "";
        void lite_out;
        let lite_pos = 0n;
        void lite_pos;
        while (((lite_pos) < (lite_size))) {
            const lite_ch = lite$textAt(lite_line, lite_pos, 7154);
            void lite_ch;
            if (((((((lite_ch) === ("\\"))) && (((lite$addInt(lite_pos, 1n, 7204)) < (lite_size))))) && (liteFn$lib$util$markdown__html$isEscapablePunct(lite$textAt(lite_line, lite$addInt(lite_pos, 1n, 7254), 7236))))) {
                lite_out = ((lite_out) + (liteFn$lib$util$markdown__html$escapeHtml(lite$textAt(lite_line, lite$addInt(lite_pos, 1n, 7315), 7297))));
                lite_pos = lite$addInt(lite_pos, 2n, 7338);
            } else if (((lite_ch) === ("`"))) {
                const lite_ticks = liteFn$lib$util$markdown__html$countCharAt(lite_line, lite_pos, lite_size, "`");
                void lite_ticks;
                const lite_closeTicks = liteFn$lib$util$markdown__html$findClosingCodeTicks(lite_line, lite$addInt(lite_pos, lite_ticks, 7487), lite_ticks);
                void lite_closeTicks;
                if (((lite_closeTicks) >= (0n))) {
                    let lite_body = lite$textSlice(lite_line, lite$addInt(lite_pos, lite_ticks, 7586), lite_closeTicks, 7565);
                    void lite_body;
                    const lite_bodyLen = lite$textLength(lite_body);
                    void lite_bodyLen;
                    if (((((((((lite_bodyLen) >= (2n))) && (((lite$textAt(lite_body, 0n, 7690)) === (" "))))) && (((lite$textAt(lite_body, lite$subtractInt(lite_bodyLen, 1n, 7740), 7718)) === (" "))))) && (((liteFn$lib$core$text$trim(lite_body)) !== (""))))) {
                        lite_body = lite$textSlice(lite_body, 1n, lite$subtractInt(lite_bodyLen, 1n, 7836), 7808);
                    }
                    lite_out = ((((((lite_out) + ("<code>"))) + (liteFn$lib$util$markdown__html$escapeHtml(lite_body)))) + ("</code>"));
                    lite_pos = lite$addInt(lite_closeTicks, lite_ticks, 7962);
                } else {
                    lite_out = ((lite_out) + (liteFn$lib$core$text$repeatText("`", lite_ticks)));
                    lite_pos = lite$addInt(lite_pos, lite_ticks, 8069);
                }
            } else if (((((((lite_ch) === ("!"))) && (((lite$addInt(lite_pos, 1n, 8129)) < (lite_size))))) && (((lite$textAt(lite_line, lite$addInt(lite_pos, 1n, 8162), 8144)) === ("["))))) {
                const lite_altEnd = liteFn$lib$util$markdown__html$findMatchingBracketEnd(lite_line, lite$addInt(lite_pos, 1n, 8231));
                void lite_altEnd;
                if (((((((lite_altEnd) >= (0n))) && (((lite$addInt(lite_altEnd, 1n, 8275)) < (lite_size))))) && (((lite$textAt(lite_line, lite$addInt(lite_altEnd, 1n, 8311), 8290)) === ("("))))) {
                    const lite_dest = liteFn$lib$util$markdown__html$parseLinkDestination(lite_line, lite$addInt(lite_altEnd, 1n, 8383));
                    void lite_dest;
                    if ((lite_dest).ok) {
                        const lite_altText = lite$textSlice(lite_line, lite$addInt(lite_pos, 2n, 8470), lite_altEnd, 8449);
                        void lite_altText;
                        const lite_srcAttr = liteFn$lib$util$markdown__html$escapeHtml((lite_dest).href);
                        void lite_srcAttr;
                        const lite_dataAttr = (Boolean(liteFn$lib$util$markdown__html$isExternalHref((lite_dest).href)) ? "" : ((((" data-md-src=\"") + (lite_srcAttr))) + ("\"")));
                        void lite_dataAttr;
                        const lite_titleAttr = (Boolean((((lite_dest).title) === (""))) ? "" : ((((" title=\"") + (liteFn$lib$util$markdown__html$escapeHtml((lite_dest).title)))) + ("\"")));
                        void lite_titleAttr;
                        lite_out = ((((((((((((((((((lite_out) + ("<img src=\""))) + (lite_srcAttr))) + ("\""))) + (lite_dataAttr))) + (" alt=\""))) + (liteFn$lib$util$markdown__html$escapeHtml(lite_altText)))) + ("\""))) + (lite_titleAttr))) + (" loading=\"lazy\">"));
                        lite_pos = lite$addInt((lite_dest).closeParen, 1n, 8958);
                    } else {
                        lite_out = ((lite_out) + ("!"));
                        lite_pos = lite$addInt(lite_pos, 1n, 9049);
                    }
                } else {
                    lite_out = ((lite_out) + ("!"));
                    lite_pos = lite$addInt(lite_pos, 1n, 9147);
                }
            } else if (((lite_ch) === ("["))) {
                const lite_labelEnd = liteFn$lib$util$markdown__html$findMatchingBracketEnd(lite_line, lite_pos);
                void lite_labelEnd;
                if (((((((lite_labelEnd) >= (0n))) && (((lite$addInt(lite_labelEnd, 1n, 9298)) < (lite_size))))) && (((lite$textAt(lite_line, lite$addInt(lite_labelEnd, 1n, 9336), 9313)) === ("("))))) {
                    const lite_dest = liteFn$lib$util$markdown__html$parseLinkDestination(lite_line, lite$addInt(lite_labelEnd, 1n, 9410));
                    void lite_dest;
                    if ((lite_dest).ok) {
                        const lite_labelRaw = lite$textSlice(lite_line, lite$addInt(lite_pos, 1n, 9498), lite_labelEnd, 9477);
                        void lite_labelRaw;
                        const lite_hrefAttr = liteFn$lib$util$markdown__html$escapeHtml((lite_dest).href);
                        void lite_hrefAttr;
                        const lite_isExt = liteFn$lib$util$markdown__html$isExternalHref((lite_dest).href);
                        void lite_isExt;
                        const lite_isHashOnly = liteFn$lib$core$text$startsWithAt((lite_dest).href, 0n, "#");
                        void lite_isHashOnly;
                        const lite_relAttr = (Boolean(((lite_isExt) && ((((liteFn$lib$core$text$startsWithAt((lite_dest).href, 0n, "http://")) || (liteFn$lib$core$text$startsWithAt((lite_dest).href, 0n, "https://"))))))) ? " target=\"_blank\" rel=\"noopener\"" : "");
                        void lite_relAttr;
                        const lite_dataAttr = (Boolean((((!(lite_isExt))) && ((!(lite_isHashOnly))))) ? ((((" data-md-href=\"") + (lite_hrefAttr))) + ("\"")) : "");
                        void lite_dataAttr;
                        const lite_titleAttr = (Boolean((((lite_dest).title) === (""))) ? "" : ((((" title=\"") + (liteFn$lib$util$markdown__html$escapeHtml((lite_dest).title)))) + ("\"")));
                        void lite_titleAttr;
                        lite_out = ((((((((((((((((((lite_out) + ("<a href=\""))) + (lite_hrefAttr))) + ("\""))) + (lite_dataAttr))) + (lite_relAttr))) + (lite_titleAttr))) + (">"))) + (liteFn$lib$util$markdown__html$renderInline(lite_labelRaw)))) + ("</a>"));
                        lite_pos = lite$addInt((lite_dest).closeParen, 1n, 10379);
                    } else {
                        lite_out = ((lite_out) + ("["));
                        lite_pos = lite$addInt(lite_pos, 1n, 10470);
                    }
                } else {
                    lite_out = ((lite_out) + ("["));
                    lite_pos = lite$addInt(lite_pos, 1n, 10568);
                }
            } else if (((lite_ch) === ("*"))) {
                if (((((lite$addInt(lite_pos, 1n, 10637)) < (lite_size))) && (((lite$textAt(lite_line, lite$addInt(lite_pos, 1n, 10670), 10652)) === ("*"))))) {
                    if (((((lite$addInt(lite_pos, 2n, 10707)) < (lite_size))) && ((!(liteFn$lib$core$text$isWhitespace(lite$textAt(lite_line, lite$addInt(lite_pos, 2n, 10762), 10744))))))) {
                        const lite_closeStrong = liteFn$lib$util$markdown__html$findClosingEmph(lite_line, lite$addInt(lite_pos, 2n, 10831), true);
                        void lite_closeStrong;
                        if (((lite_closeStrong) > (lite$addInt(lite_pos, 2n, 10884)))) {
                            const lite_innerStrong = lite$textSlice(lite_line, lite$addInt(lite_pos, 2n, 10950), lite_closeStrong, 10929);
                            void lite_innerStrong;
                            lite_out = ((((((lite_out) + ("<strong>"))) + (liteFn$lib$util$markdown__html$renderInline(lite_innerStrong)))) + ("</strong>"));
                            lite_pos = lite$addInt(lite_closeStrong, 2n, 11093);
                        } else {
                            lite_out = ((lite_out) + ("**"));
                            lite_pos = lite$addInt(lite_pos, 2n, 11197);
                        }
                    } else {
                        lite_out = ((lite_out) + ("**"));
                        lite_pos = lite$addInt(lite_pos, 2n, 11312);
                    }
                } else if (((((lite$addInt(lite_pos, 1n, 11362)) < (lite_size))) && ((!(liteFn$lib$core$text$isWhitespace(lite$textAt(lite_line, lite$addInt(lite_pos, 1n, 11417), 11399))))))) {
                    const lite_closeEm = liteFn$lib$util$markdown__html$findClosingEmph(lite_line, lite$addInt(lite_pos, 1n, 11478), false);
                    void lite_closeEm;
                    if (((lite_closeEm) > (lite$addInt(lite_pos, 1n, 11524)))) {
                        const lite_innerEm = lite$textSlice(lite_line, lite$addInt(lite_pos, 1n, 11582), lite_closeEm, 11561);
                        void lite_innerEm;
                        lite_out = ((((((lite_out) + ("<em>"))) + (liteFn$lib$util$markdown__html$renderInline(lite_innerEm)))) + ("</em>"));
                        lite_pos = lite$addInt(lite_closeEm, 1n, 11697);
                    } else {
                        lite_out = ((lite_out) + ("*"));
                        lite_pos = lite$addInt(lite_pos, 1n, 11788);
                    }
                } else {
                    lite_out = ((lite_out) + ("*"));
                    lite_pos = lite$addInt(lite_pos, 1n, 11886);
                }
            } else {
                if (((lite_ch) === ("&"))) {
                    lite_out = ((lite_out) + ("&amp;"));
                } else if (((lite_ch) === ("<"))) {
                    lite_out = ((lite_out) + ("&lt;"));
                } else if (((lite_ch) === (">"))) {
                    lite_out = ((lite_out) + ("&gt;"));
                } else if (((lite_ch) === ("\""))) {
                    lite_out = ((lite_out) + ("&quot;"));
                } else {
                    lite_out = ((lite_out) + (lite_ch));
                }
                lite_pos = lite$addInt(lite_pos, 1n, 12191);
            }
        }
        return lite_out;
    }
    void liteFn$lib$util$markdown__html$renderInline;
    function liteFn$lib$util$markdown__html$detectDocStatus(lite_docText: string): string {
        void lite_docText;
        const lite_lines: string[] = [...(liteFn$lib$util$markdown__html$splitLines(lite_docText))];
        void lite_lines;
        const lite_total = liteFn$lib$core$list$listCountText([...(lite_lines)]);
        void lite_total;
        let lite_i = 0n;
        void lite_i;
        let lite_headerBlock = "";
        void lite_headerBlock;
        while (((((lite_i) < (lite_total))) && (((lite_i) < (20n))))) {
            lite_headerBlock = ((((lite_headerBlock) + ("\n"))) + (liteFn$lib$core$text$toLowerAscii(lite$listAt((lite_lines), lite_i, 12583))));
            lite_i = lite$addInt(lite_i, 1n, 12598);
        }
        const lite_hasMarker = ((liteFn$lib$core$text$containsText(lite_headerBlock, "status:")) || (liteFn$lib$core$text$containsText(lite_headerBlock, "stage:")));
        void lite_hasMarker;
        if ((!(lite_hasMarker))) {
            return "guide";
        }
        if (((((liteFn$lib$core$text$containsText(lite_headerBlock, "historical")) || (liteFn$lib$core$text$containsText(lite_headerBlock, "superseded")))) || (liteFn$lib$core$text$containsText(lite_headerBlock, "retired")))) {
            return "historical";
        }
        if (((((((liteFn$lib$core$text$containsText(lite_headerBlock, "working proposal")) || (liteFn$lib$core$text$containsText(lite_headerBlock, "status: proposal")))) || (liteFn$lib$core$text$containsText(lite_headerBlock, "status: **proposal")))) || (liteFn$lib$core$text$containsText(lite_headerBlock, "draft")))) {
            return "proposal";
        }
        if (((liteFn$lib$core$text$containsText(lite_headerBlock, "selected")) || (liteFn$lib$core$text$containsText(lite_headerBlock, "established")))) {
            return "selected";
        }
        if (liteFn$lib$core$text$containsText(lite_headerBlock, "open")) {
            return "open";
        }
        return "guide";
    }
    void liteFn$lib$util$markdown__html$detectDocStatus;
    function liteFn$lib$util$markdown__html$parseHeadingLine(lite_line: string): { ok: boolean; level: bigint; headingText: string } {
        void lite_line;
        const lite_size = lite$textLength(lite_line);
        void lite_size;
        let lite_lead = 0n;
        void lite_lead;
        while (((((((lite_lead) < (lite_size))) && (((lite_lead) < (3n))))) && (((lite$textAt(lite_line, lite_lead, 13582)) === (" "))))) {
            lite_lead = lite$addInt(lite_lead, 1n, 13624);
        }
        const lite_hashes = liteFn$lib$util$markdown__html$countCharAt(lite_line, lite_lead, lite_size, "#");
        void lite_hashes;
        if (((((((lite_hashes) < (1n))) || (((lite_hashes) > (6n))))) || (((lite$addInt(lite_lead, lite_hashes, 13726)) >= (lite_size))))) {
            return { ok: false, level: 0n, headingText: "" };
        }
        const lite_afterHash = lite$textAt(lite_line, lite$addInt(lite_lead, lite_hashes, 13845), 13826);
        void lite_afterHash;
        if (((((lite_afterHash) !== (" "))) && (((lite_afterHash) !== ("\t"))))) {
            return { ok: false, level: 0n, headingText: "" };
        }
        let lite_bodyStart = lite$addInt(lite$addInt(lite_lead, lite_hashes, 13996), 1n, 14005);
        void lite_bodyStart;
        while (((((lite_bodyStart) < (lite_size))) && (liteFn$lib$core$text$isWhitespace(lite$textAt(lite_line, lite_bodyStart, 14058))))) {
            lite_bodyStart = lite$addInt(lite_bodyStart, 1n, 14104);
        }
        let lite_bodyEnd = lite_size;
        void lite_bodyEnd;
        while (((((lite_bodyEnd) > (lite_bodyStart))) && (liteFn$lib$core$text$isWhitespace(lite$textAt(lite_line, lite$subtractInt(lite_bodyEnd, 1n, 14214), 14192))))) {
            lite_bodyEnd = lite$subtractInt(lite_bodyEnd, 1n, 14238);
        }
        while (((((lite_bodyEnd) > (lite_bodyStart))) && (((lite$textAt(lite_line, lite$subtractInt(lite_bodyEnd, 1n, 14305), 14283)) === ("#"))))) {
            lite_bodyEnd = lite$subtractInt(lite_bodyEnd, 1n, 14335);
        }
        while (((((lite_bodyEnd) > (lite_bodyStart))) && (liteFn$lib$core$text$isWhitespace(lite$textAt(lite_line, lite$subtractInt(lite_bodyEnd, 1n, 14420), 14398))))) {
            lite_bodyEnd = lite$subtractInt(lite_bodyEnd, 1n, 14444);
        }
        if (((lite_bodyEnd) <= (lite_bodyStart))) {
            return { ok: false, level: 0n, headingText: "" };
        }
        return { ok: true, level: lite_hashes, headingText: lite$textSlice(lite_line, lite_bodyStart, lite_bodyEnd, 14596) };
    }
    void liteFn$lib$util$markdown__html$parseHeadingLine;
    function liteFn$lib$util$markdown__html$parseFenceOpen(lite_line: string): { ok: boolean; ch: string; count: bigint; lang: string } {
        void lite_line;
        const lite_size = lite$textLength(lite_line);
        void lite_size;
        let lite_lead = 0n;
        void lite_lead;
        while (((((((lite_lead) < (lite_size))) && (((lite_lead) < (3n))))) && (((lite$textAt(lite_line, lite_lead, 14813)) === (" "))))) {
            lite_lead = lite$addInt(lite_lead, 1n, 14855);
        }
        if (((lite_lead) >= (lite_size))) {
            return { ok: false, ch: "", count: 0n, lang: "" };
        }
        const lite_ch = lite$textAt(lite_line, lite_lead, 14953);
        void lite_ch;
        if (((((lite_ch) !== ("`"))) && (((lite_ch) !== ("~"))))) {
            return { ok: false, ch: "", count: 0n, lang: "" };
        }
        const lite_cnt = liteFn$lib$util$markdown__html$countCharAt(lite_line, lite_lead, lite_size, lite_ch);
        void lite_cnt;
        if (((lite_cnt) < (3n))) {
            return { ok: false, ch: "", count: 0n, lang: "" };
        }
        const lite_info = liteFn$lib$core$text$trim(lite$textSlice(lite_line, lite$addInt(lite_lead, lite_cnt, 15248), lite_size, 15226));
        void lite_info;
        if (((((lite_ch) === ("`"))) && (liteFn$lib$core$text$containsText(lite_info, "`")))) {
            return { ok: false, ch: "", count: 0n, lang: "" };
        }
        let lite_langEnd = 0n;
        void lite_langEnd;
        const lite_infoLen = lite$textLength(lite_info);
        void lite_infoLen;
        while (((((lite_langEnd) < (lite_infoLen))) && ((!(liteFn$lib$core$text$isWhitespace(lite$textAt(lite_info, lite_langEnd, 15490))))))) {
            lite_langEnd = lite$addInt(lite_langEnd, 1n, 15532);
        }
        const lite_lang = lite$textSlice(lite_info, 0n, lite_langEnd, 15556);
        void lite_lang;
        return { ok: true, ch: lite_ch, count: lite_cnt, lang: lite_lang };
    }
    void liteFn$lib$util$markdown__html$parseFenceOpen;
    function liteFn$lib$util$markdown__html$isFenceClose(lite_line: string, lite_fenceChar: string, lite_fenceLen: bigint): boolean {
        void lite_line;
        void lite_fenceChar;
        void lite_fenceLen;
        const lite_size = lite$textLength(lite_line);
        void lite_size;
        let lite_lead = 0n;
        void lite_lead;
        while (((((((lite_lead) < (lite_size))) && (((lite_lead) < (3n))))) && (((lite$textAt(lite_line, lite_lead, 15804)) === (" "))))) {
            lite_lead = lite$addInt(lite_lead, 1n, 15846);
        }
        const lite_cnt = liteFn$lib$util$markdown__html$countCharAt(lite_line, lite_lead, lite_size, lite_fenceChar);
        void lite_cnt;
        if (((lite_cnt) < (lite_fenceLen))) {
            return false;
        }
        return ((liteFn$lib$core$text$trim(lite$textSlice(lite_line, lite$addInt(lite_lead, lite_cnt, 15987), lite_size, 15965))) === (""));
    }
    void liteFn$lib$util$markdown__html$isFenceClose;
    function liteFn$lib$util$markdown__html$isHorizontalRule(lite_line: string): boolean {
        void lite_line;
        const lite_trimmed = liteFn$lib$core$text$trim(lite_line);
        void lite_trimmed;
        const lite_size = lite$textLength(lite_trimmed);
        void lite_size;
        if (((lite_size) < (3n))) {
            return false;
        }
        const lite_first = lite$textAt(lite_trimmed, 0n, 16169);
        void lite_first;
        if (((((((lite_first) !== ("-"))) && (((lite_first) !== ("*"))))) && (((lite_first) !== ("_"))))) {
            return false;
        }
        let lite_count = 0n;
        void lite_count;
        let lite_i = 0n;
        void lite_i;
        while (((lite_i) < (lite_size))) {
            const lite_ch = lite$textAt(lite_trimmed, lite_i, 16335);
            void lite_ch;
            if (((lite_ch) === (lite_first))) {
                lite_count = lite$addInt(lite_count, 1n, 16399);
            } else if ((!(liteFn$lib$core$text$isWhitespace(lite_ch)))) {
                return false;
            }
            lite_i = lite$addInt(lite_i, 1n, 16497);
        }
        return ((lite_count) >= (3n));
    }
    void liteFn$lib$util$markdown__html$isHorizontalRule;
    function liteFn$lib$util$markdown__html$parseBulletItem(lite_line: string): { ok: boolean; indent: bigint; body: string } {
        void lite_line;
        const lite_size = lite$textLength(lite_line);
        void lite_size;
        let lite_indent = 0n;
        void lite_indent;
        while (((((lite_indent) < (lite_size))) && (((lite$textAt(lite_line, lite_indent, 16684)) === (" "))))) {
            lite_indent = lite$addInt(lite_indent, 1n, 16730);
        }
        if (((lite$addInt(lite_indent, 1n, 16756)) >= (lite_size))) {
            return { ok: false, indent: 0n, body: "" };
        }
        const lite_marker = lite$textAt(lite_line, lite_indent, 16842);
        void lite_marker;
        const lite_after = lite$textAt(lite_line, lite$addInt(lite_indent, 1n, 16899), 16878);
        void lite_after;
        if ((((((((((lite_marker) === ("-"))) || (((lite_marker) === ("*"))))) || (((lite_marker) === ("+")))))) && ((((((lite_after) === (" "))) || (((lite_after) === ("\t")))))))) {
            return { ok: true, indent: lite_indent, body: liteFn$lib$core$text$trimStart(lite$textSlice(lite_line, lite$addInt(lite_indent, 2n, 17090), lite_size, 17066)) };
        }
        return { ok: false, indent: 0n, body: "" };
    }
    void liteFn$lib$util$markdown__html$parseBulletItem;
    function liteFn$lib$util$markdown__html$parseOrderedItem(lite_line: string): { ok: boolean; indent: bigint; body: string } {
        void lite_line;
        const lite_size = lite$textLength(lite_line);
        void lite_size;
        let lite_indent = 0n;
        void lite_indent;
        while (((((lite_indent) < (lite_size))) && (((lite$textAt(lite_line, lite_indent, 17311)) === (" "))))) {
            lite_indent = lite$addInt(lite_indent, 1n, 17357);
        }
        let lite_pos = lite_indent;
        void lite_pos;
        while (((((lite_pos) < (lite_size))) && (liteFn$lib$core$text$isDigit(lite$textAt(lite_line, lite_pos, 17429))))) {
            lite_pos = lite$addInt(lite_pos, 1n, 17463);
        }
        if (((((lite_pos) === (lite_indent))) || (((lite$addInt(lite_pos, 1n, 17503)) >= (lite_size))))) {
            return { ok: false, indent: 0n, body: "" };
        }
        const lite_delim = lite$textAt(lite_line, lite_pos, 17588);
        void lite_delim;
        const lite_after = lite$textAt(lite_line, lite$addInt(lite_pos, 1n, 17639), 17621);
        void lite_after;
        if ((((((((lite_delim) === ("."))) || (((lite_delim) === (")")))))) && ((((((lite_after) === (" "))) || (((lite_after) === ("\t")))))))) {
            return { ok: true, indent: lite_indent, body: liteFn$lib$core$text$trimStart(lite$textSlice(lite_line, lite$addInt(lite_pos, 2n, 17808), lite_size, 17787)) };
        }
        return { ok: false, indent: 0n, body: "" };
    }
    void liteFn$lib$util$markdown__html$parseOrderedItem;
    function liteFn$lib$util$markdown__html$parseTableRow(lite_line: string): string[] {
        void lite_line;
        const lite_cells: string[] = [...([])];
        void lite_cells;
        const lite_trimmed = liteFn$lib$core$text$trim(lite_line);
        void lite_trimmed;
        const lite_size = lite$textLength(lite_trimmed);
        void lite_size;
        if (((((lite_size) === (0n))) || ((!(liteFn$lib$core$text$containsText(lite_trimmed, "|")))))) {
            return [...(lite_cells)];
        }
        let lite_start = 0n;
        void lite_start;
        let lite_end = lite_size;
        void lite_end;
        if (((lite$textAt(lite_trimmed, 0n, 18144)) === ("|"))) {
            lite_start = 1n;
        }
        if (((((lite_end) > (lite_start))) && (((lite$textAt(lite_trimmed, lite$subtractInt(lite_end, 1n, 18230), 18209)) === ("|"))))) {
            lite_end = lite$subtractInt(lite_end, 1n, 18248);
        }
        let lite_cellStart = lite_start;
        void lite_cellStart;
        let lite_i = lite_start;
        void lite_i;
        while (((lite_i) <= (lite_end))) {
            if (((lite_i) === (lite_end))) {
                lite_cells.push(liteFn$lib$core$text$trim(lite$textSlice(lite_trimmed, lite_cellStart, lite_i, 18393)));
                break;
            }
            const lite_ch = lite$textAt(lite_trimmed, lite_i, 18473);
            void lite_ch;
            if (((((lite_ch) === ("\\"))) && (((lite$addInt(lite_i, 1n, 18522)) < (lite_end))))) {
                lite_i = lite$addInt(lite_i, 2n, 18548);
            } else if (((lite_ch) === ("`"))) {
                const lite_ticks = liteFn$lib$util$markdown__html$countCharAt(lite_trimmed, lite_i, lite_end, "`");
                void lite_ticks;
                const lite_closePos = liteFn$lib$util$markdown__html$findClosingCodeTicks(lite_trimmed, lite$addInt(lite_i, lite_ticks, 18696), lite_ticks);
                void lite_closePos;
                if (((((lite_closePos) >= (0n))) && (((lite_closePos) < (lite_end))))) {
                    lite_i = lite$addInt(lite_closePos, lite_ticks, 18792);
                } else {
                    lite_i = lite$addInt(lite_i, lite_ticks, 18840);
                }
            } else if (((lite_ch) === ("|"))) {
                lite_cells.push(liteFn$lib$core$text$trim(lite$textSlice(lite_trimmed, lite_cellStart, lite_i, 18941)));
                lite_cellStart = lite$addInt(lite_i, 1n, 19004);
                lite_i = lite$addInt(lite_i, 1n, 19023);
            } else {
                lite_i = lite$addInt(lite_i, 1n, 19060);
            }
        }
        return [...(lite_cells)];
    }
    void liteFn$lib$util$markdown__html$parseTableRow;
    function liteFn$lib$util$markdown__html$isTableSeparatorCell(lite_cell: string): boolean {
        void lite_cell;
        const lite_trimmed = liteFn$lib$core$text$trim(lite_cell);
        void lite_trimmed;
        const lite_size = lite$textLength(lite_trimmed);
        void lite_size;
        if (((lite_size) === (0n))) {
            return false;
        }
        let lite_i = 0n;
        void lite_i;
        if (((lite$textAt(lite_trimmed, lite_i, 19269)) === (":"))) {
            lite_i = lite$addInt(lite_i, 1n, 19300);
        }
        let lite_dashes = 0n;
        void lite_dashes;
        while (((((lite_i) < (lite_size))) && (((lite$textAt(lite_trimmed, lite_i, 19351)) === ("-"))))) {
            lite_dashes = lite$addInt(lite_dashes, 1n, 19395);
            lite_i = lite$addInt(lite_i, 1n, 19411);
        }
        if (((((lite_i) < (lite_size))) && (((lite$textAt(lite_trimmed, lite_i, 19443)) === (":"))))) {
            lite_i = lite$addInt(lite_i, 1n, 19474);
        }
        return ((((lite_dashes) >= (1n))) && (((lite_i) === (lite_size))));
    }
    void liteFn$lib$util$markdown__html$isTableSeparatorCell;
    function liteFn$lib$util$markdown__html$alignCodeStyle(lite_code: string): string {
        void lite_code;
        if (((lite_code) === ("l"))) {
            return " style=\"text-align:left\"";
        }
        if (((lite_code) === ("r"))) {
            return " style=\"text-align:right\"";
        }
        if (((lite_code) === ("c"))) {
            return " style=\"text-align:center\"";
        }
        return "";
    }
    void liteFn$lib$util$markdown__html$alignCodeStyle;
    function liteFn$lib$util$markdown__html$parseTableAligns(lite_line: string, lite_expectedCols: bigint): { ok: boolean; packed: string } {
        void lite_line;
        void lite_expectedCols;
        const lite_cells: string[] = [...(liteFn$lib$util$markdown__html$parseTableRow(lite_line))];
        void lite_cells;
        if (((((liteFn$lib$core$list$listCountText([...(lite_cells)])) !== (lite_expectedCols))) || (((lite_expectedCols) === (0n))))) {
            return { ok: false, packed: "" };
        }
        let lite_packed = "";
        void lite_packed;
        for (const lite_cell of [...(lite_cells)]) {
            void lite_cell;
            if ((!(liteFn$lib$util$markdown__html$isTableSeparatorCell(lite_cell)))) {
                return { ok: false, packed: "" };
            }
            const lite_trimmed = liteFn$lib$core$text$trim(lite_cell);
            void lite_trimmed;
            const lite_leftColon = liteFn$lib$core$text$startsWithAt(lite_trimmed, 0n, ":");
            void lite_leftColon;
            const lite_rightColon = liteFn$lib$core$text$endsWith(lite_trimmed, ":");
            void lite_rightColon;
            const lite_code = (Boolean(((lite_leftColon) && (lite_rightColon))) ? "c" : (Boolean(lite_rightColon) ? "r" : (Boolean(lite_leftColon) ? "l" : "-")));
            void lite_code;
            lite_packed = ((lite_packed) + (lite_code));
        }
        return { ok: true, packed: lite_packed };
    }
    void liteFn$lib$util$markdown__html$parseTableAligns;
    function liteFn$lib$util$markdown__html$renderBodyLines(lite_lines: string[], lite_collectToc: boolean): { title: string; html: string; tocJson: string } {
        void lite_lines;
        void lite_collectToc;
        const lite_total = liteFn$lib$core$list$listCountText([...(lite_lines)]);
        void lite_total;
        const lite_blocks: string[] = [...([])];
        void lite_blocks;
        const lite_seenSlugs: string[] = [...([])];
        void lite_seenSlugs;
        const lite_tocEntries: string[] = [...([])];
        void lite_tocEntries;
        let lite_docTitle = "";
        void lite_docTitle;
        let lite_fenceIndex = 0n;
        void lite_fenceIndex;
        let lite_i = 0n;
        void lite_i;
        while (((lite_i) < (lite_total))) {
            const lite_line = lite$listAt((lite_lines), lite_i, 20925);
            void lite_line;
            const lite_trimmed = liteFn$lib$core$text$trim(lite_line);
            void lite_trimmed;
            if (((lite_trimmed) === (""))) {
                lite_i = lite$addInt(lite_i, 1n, 21006);
            } else {
                const lite_fence = liteFn$lib$util$markdown__html$parseFenceOpen(lite_line);
                void lite_fence;
                if ((lite_fence).ok) {
                    const lite_bodyLines: string[] = [...([])];
                    void lite_bodyLines;
                    lite_i = lite$addInt(lite_i, 1n, 21166);
                    while (((lite_i) < (lite_total))) {
                        if (liteFn$lib$util$markdown__html$isFenceClose(lite$listAt((lite_lines), lite_i, 21247), (lite_fence).ch, (lite_fence).count)) {
                            lite_i = lite$addInt(lite_i, 1n, 21302);
                            break;
                        }
                        lite_bodyLines.push(lite$listAt((lite_lines), lite_i, 21416));
                        lite_i = lite$addInt(lite_i, 1n, 21443);
                    }
                    const lite_bodyRaw = (Boolean(((liteFn$lib$core$list$listCountText([...(lite_bodyLines)])) === (0n))) ? "" : ((liteFn$lib$core$text$joinTexts([...(lite_bodyLines)], "\n")) + ("\n")));
                    void lite_bodyRaw;
                    const lite_langAttr = liteFn$lib$util$markdown__html$escapeHtml((lite_fence).lang);
                    void lite_langAttr;
                    lite_blocks.push((((((((((((("<pre class=\"md-code\" data-lang=\"") + (lite_langAttr))) + ("\" data-fence=\""))) + (liteFn$lib$core$int$intText(lite_fenceIndex)))) + ("\"><code>"))) + (liteFn$lib$util$markdown__html$escapeHtml(lite_bodyRaw)))) + ("</code></pre>")));
                    lite_fenceIndex = lite$addInt(lite_fenceIndex, 1n, 21916);
                } else {
                    const lite_heading = liteFn$lib$util$markdown__html$parseHeadingLine(lite_line);
                    void lite_heading;
                    if ((lite_heading).ok) {
                        if (((((lite_docTitle) === (""))) && ((((lite_heading).level) === (1n))))) {
                            lite_docTitle = (lite_heading).headingText;
                        }
                        const lite_baseSlug = liteFn$lib$util$markdown$headingAnchor((lite_heading).headingText);
                        void lite_baseSlug;
                        let lite_dupCount = 0n;
                        void lite_dupCount;
                        for (const lite_prevSlug of [...(lite_seenSlugs)]) {
                            void lite_prevSlug;
                            if (((lite_prevSlug) === (lite_baseSlug))) {
                                lite_dupCount = lite$addInt(lite_dupCount, 1n, 22385);
                            }
                        }
                        lite_seenSlugs.push(lite_baseSlug);
                        const lite_slug = (Boolean(((lite_dupCount) === (0n))) ? lite_baseSlug : ((((lite_baseSlug) + ("-"))) + (liteFn$lib$core$int$intText(lite_dupCount))));
                        void lite_slug;
                        const lite_lvlStr = liteFn$lib$core$int$intText((lite_heading).level);
                        void lite_lvlStr;
                        lite_blocks.push((((((((((((((((("<h") + (lite_lvlStr))) + (" id=\""))) + (liteFn$lib$util$markdown__html$escapeHtml(lite_slug)))) + ("\">"))) + (liteFn$lib$util$markdown__html$renderInline((lite_heading).headingText)))) + ("</h"))) + (lite_lvlStr))) + (">")));
                        if (((lite_collectToc) && (((((((lite_heading).level) === (2n))) || ((((lite_heading).level) === (3n)))))))) {
                            const lite_tocEntry = (((((((((((("{\"level\":") + (lite_lvlStr))) + (",\"id\":"))) + (liteFn$lib$util$json$quoteString(lite_slug)))) + (",\"text\":"))) + (liteFn$lib$util$json$quoteString((lite_heading).headingText)))) + ("}"));
                            void lite_tocEntry;
                            lite_tocEntries.push(lite_tocEntry);
                        }
                        lite_i = lite$addInt(lite_i, 1n, 23221);
                    } else if (liteFn$lib$util$markdown__html$isHorizontalRule(lite_line)) {
                        lite_blocks.push("<hr>");
                        lite_i = lite$addInt(lite_i, 1n, 23355);
                    } else if (liteFn$lib$core$text$startsWithAt(liteFn$lib$core$text$trimStart(lite_line), 0n, ">")) {
                        const lite_quoteLines: string[] = [...([])];
                        void lite_quoteLines;
                        while (((lite_i) < (lite_total))) {
                            const lite_qlTrim = liteFn$lib$core$text$trimStart(lite$listAt((lite_lines), lite_i, 23584));
                            void lite_qlTrim;
                            if ((!(liteFn$lib$core$text$startsWithAt(lite_qlTrim, 0n, ">")))) {
                                break;
                            }
                            const lite_afterGt = lite$textSlice(lite_qlTrim, 1n, lite$textLength(lite_qlTrim), 23700);
                            void lite_afterGt;
                            const lite_cleaned = (Boolean(liteFn$lib$core$text$startsWithAt(lite_afterGt, 0n, " ")) ? lite$textSlice(lite_afterGt, 1n, lite$textLength(lite_afterGt), 23819) : lite_afterGt);
                            void lite_cleaned;
                            lite_quoteLines.push(lite_cleaned);
                            lite_i = lite$addInt(lite_i, 1n, 23974);
                        }
                        let lite_alertKind = "";
                        void lite_alertKind;
                        let lite_alertLabel = "";
                        void lite_alertLabel;
                        if (((liteFn$lib$core$list$listCountText([...(lite_quoteLines)])) > (0n))) {
                            const lite_firstQ = liteFn$lib$core$text$trim(lite$listAt((lite_quoteLines), 0n, 24200));
                            void lite_firstQ;
                            if (((lite_firstQ) === ("[!NOTE]"))) {
                                lite_alertKind = "note";
                                lite_alertLabel = "Note";
                            } else if (((lite_firstQ) === ("[!TIP]"))) {
                                lite_alertKind = "tip";
                                lite_alertLabel = "Tip";
                            } else if (((lite_firstQ) === ("[!IMPORTANT]"))) {
                                lite_alertKind = "important";
                                lite_alertLabel = "Important";
                            } else if (((lite_firstQ) === ("[!WARNING]"))) {
                                lite_alertKind = "warning";
                                lite_alertLabel = "Warning";
                            } else if (((lite_firstQ) === ("[!CAUTION]"))) {
                                lite_alertKind = "caution";
                                lite_alertLabel = "Caution";
                            }
                        }
                        if (((lite_alertKind) !== (""))) {
                            const lite_innerAlertLines: string[] = [...([])];
                            void lite_innerAlertLines;
                            let lite_qi = 1n;
                            void lite_qi;
                            const lite_qTotal = liteFn$lib$core$list$listCountText([...(lite_quoteLines)]);
                            void lite_qTotal;
                            while (((lite_qi) < (lite_qTotal))) {
                                lite_innerAlertLines.push(lite$listAt((lite_quoteLines), lite_qi, 25063));
                                lite_qi = lite$addInt(lite_qi, 1n, 25100);
                            }
                            const lite_innerAlert = liteFn$lib$util$markdown__html$renderBodyLines([...(lite_innerAlertLines)], false);
                            void lite_innerAlert;
                            lite_blocks.push((((((((((((("<div class=\"md-alert md-alert-") + (lite_alertKind))) + ("\"><div class=\"md-alert-title\">"))) + (lite_alertLabel))) + ("</div>"))) + ((lite_innerAlert).html))) + ("</div>")));
                        } else {
                            const lite_innerQuote = liteFn$lib$util$markdown__html$renderBodyLines([...(lite_quoteLines)], false);
                            void lite_innerQuote;
                            lite_blocks.push((((("<blockquote>") + ((lite_innerQuote).html))) + ("</blockquote>")));
                        }
                    } else {
                        const lite_hasTable = ((((lite$addInt(lite_i, 1n, 25740)) < (lite_total))) && (liteFn$lib$core$text$containsText(lite_line, "|")));
                        void lite_hasTable;
                        let lite_renderedTable = false;
                        void lite_renderedTable;
                        if (lite_hasTable) {
                            const lite_headCells: string[] = [...(liteFn$lib$util$markdown__html$parseTableRow(lite_line))];
                            void lite_headCells;
                            const lite_colCount = liteFn$lib$core$list$listCountText([...(lite_headCells)]);
                            void lite_colCount;
                            const lite_sepRes = liteFn$lib$util$markdown__html$parseTableAligns(lite$listAt((lite_lines), lite$addInt(lite_i, 1n, 26052), 26050), lite_colCount);
                            void lite_sepRes;
                            if ((lite_sepRes).ok) {
                                lite_renderedTable = true;
                                const lite_thParts: string[] = [...([])];
                                void lite_thParts;
                                let lite_ci = 0n;
                                void lite_ci;
                                while (((lite_ci) < (lite_colCount))) {
                                    const lite_styleAttr = liteFn$lib$util$markdown__html$alignCodeStyle(lite$textAt((lite_sepRes).packed, lite_ci, 26368));
                                    void lite_styleAttr;
                                    lite_thParts.push((((((((("<th") + (lite_styleAttr))) + (">"))) + (liteFn$lib$util$markdown__html$renderInline(lite$listAt((lite_headCells), lite_ci, 26505))))) + ("</th>")));
                                    lite_ci = lite$addInt(lite_ci, 1n, 26557);
                                }
                                const lite_rowParts: string[] = [...([])];
                                void lite_rowParts;
                                lite_i = lite$addInt(lite_i, 2n, 26684);
                                while (((lite_i) < (lite_total))) {
                                    const lite_rowTrim = liteFn$lib$core$text$trim(lite$listAt((lite_lines), lite_i, 26794));
                                    void lite_rowTrim;
                                    if (((((lite_rowTrim) === (""))) || ((!(liteFn$lib$core$text$containsText(lite_rowTrim, "|")))))) {
                                        break;
                                    }
                                    if ((((liteFn$lib$util$markdown__html$parseFenceOpen(lite$listAt((lite_lines), lite_i, 26954))).ok) || ((liteFn$lib$util$markdown__html$parseHeadingLine(lite$listAt((lite_lines), lite_i, 26987))).ok))) {
                                        break;
                                    }
                                    const lite_rowCells: string[] = [...(liteFn$lib$util$markdown__html$parseTableRow(lite$listAt((lite_lines), lite_i, 27069)))];
                                    void lite_rowCells;
                                    const lite_tdParts: string[] = [...([])];
                                    void lite_tdParts;
                                    const lite_rowLen = liteFn$lib$core$list$listCountText([...(lite_rowCells)]);
                                    void lite_rowLen;
                                    let lite_rci = 0n;
                                    void lite_rci;
                                    while (((lite_rci) < (lite_colCount))) {
                                        const lite_styleAttr = liteFn$lib$util$markdown__html$alignCodeStyle(lite$textAt((lite_sepRes).packed, lite_rci, 27374));
                                        void lite_styleAttr;
                                        const lite_cellVal = (Boolean(((lite_rci) < (lite_rowLen))) ? lite$listAt((lite_rowCells), lite_rci, 27478) : "");
                                        void lite_cellVal;
                                        lite_tdParts.push((((((((("<td") + (lite_styleAttr))) + (">"))) + (liteFn$lib$util$markdown__html$renderInline(lite_cellVal)))) + ("</td>")));
                                        lite_rci = lite$addInt(lite_rci, 1n, 27661);
                                    }
                                    lite_rowParts.push((((("<tr>") + (liteFn$lib$core$text$joinTexts([...(lite_tdParts)], "")))) + ("</tr>")));
                                    lite_i = lite$addInt(lite_i, 1n, 27844);
                                }
                                const lite_tbodyHtml = (Boolean(((liteFn$lib$core$list$listCountText([...(lite_rowParts)])) === (0n))) ? "" : (((("<tbody>") + (liteFn$lib$core$text$joinTexts([...(lite_rowParts)], "")))) + ("</tbody>")));
                                void lite_tbodyHtml;
                                lite_blocks.push((((((((("<div class=\"md-table-wrap\"><table><thead><tr>") + (liteFn$lib$core$text$joinTexts([...(lite_thParts)], "")))) + ("</tr></thead>"))) + (lite_tbodyHtml))) + ("</table></div>")));
                            }
                        }
                        if ((!(lite_renderedTable))) {
                            const lite_ulItem = liteFn$lib$util$markdown__html$parseBulletItem(lite_line);
                            void lite_ulItem;
                            if ((lite_ulItem).ok) {
                                const lite_itemsHtml: string[] = [...([])];
                                void lite_itemsHtml;
                                while (((lite_i) < (lite_total))) {
                                    const lite_curItem = liteFn$lib$util$markdown__html$parseBulletItem(lite$listAt((lite_lines), lite_i, 28660));
                                    void lite_curItem;
                                    if ((!((lite_curItem).ok))) {
                                        break;
                                    }
                                    const lite_itemLines: string[] = [...([(lite_curItem).body])];
                                    void lite_itemLines;
                                    lite_i = lite$addInt(lite_i, 1n, 28838);
                                    while (((lite_i) < (lite_total))) {
                                        const lite_nextLine = lite$listAt((lite_lines), lite_i, 28947);
                                        void lite_nextLine;
                                        const lite_nextTrim = liteFn$lib$core$text$trim(lite_nextLine);
                                        void lite_nextTrim;
                                        if (((lite_nextTrim) === (""))) {
                                            break;
                                        }
                                        if ((((((((((((liteFn$lib$util$markdown__html$parseBulletItem(lite_nextLine)).ok) || ((liteFn$lib$util$markdown__html$parseOrderedItem(lite_nextLine)).ok))) || ((liteFn$lib$util$markdown__html$parseHeadingLine(lite_nextLine)).ok))) || ((liteFn$lib$util$markdown__html$parseFenceOpen(lite_nextLine)).ok))) || (liteFn$lib$util$markdown__html$isHorizontalRule(lite_nextLine)))) || (liteFn$lib$core$text$startsWithAt(liteFn$lib$core$text$trimStart(lite_nextLine), 0n, ">")))) {
                                            break;
                                        }
                                        lite_itemLines.push(liteFn$lib$core$text$trim(lite_nextLine));
                                        lite_i = lite$addInt(lite_i, 1n, 29547);
                                    }
                                    lite_itemsHtml.push((((("<li>") + (liteFn$lib$util$markdown__html$renderInline(liteFn$lib$core$text$joinTexts([...(lite_itemLines)], " "))))) + ("</li>")));
                                    if (((((((((lite_i) < (lite_total))) && (((liteFn$lib$core$text$trim(lite$listAt((lite_lines), lite_i, 29779))) === (""))))) && (((lite$addInt(lite_i, 1n, 29795)) < (lite_total))))) && ((liteFn$lib$util$markdown__html$parseBulletItem(lite$listAt((lite_lines), lite$addInt(lite_i, 1n, 29835), 29833))).ok))) {
                                        lite_i = lite$addInt(lite_i, 1n, 29884);
                                    }
                                }
                                lite_blocks.push((((("<ul>") + (liteFn$lib$core$text$joinTexts([...(lite_itemsHtml)], "")))) + ("</ul>")));
                            } else {
                                const lite_olItem = liteFn$lib$util$markdown__html$parseOrderedItem(lite_line);
                                void lite_olItem;
                                if ((lite_olItem).ok) {
                                    const lite_olItemsHtml: string[] = [...([])];
                                    void lite_olItemsHtml;
                                    while (((lite_i) < (lite_total))) {
                                        const lite_curOl = liteFn$lib$util$markdown__html$parseOrderedItem(lite$listAt((lite_lines), lite_i, 30382));
                                        void lite_curOl;
                                        if ((!((lite_curOl).ok))) {
                                            break;
                                        }
                                        const lite_olItemLines: string[] = [...([(lite_curOl).body])];
                                        void lite_olItemLines;
                                        lite_i = lite$addInt(lite_i, 1n, 30570);
                                        while (((lite_i) < (lite_total))) {
                                            const lite_nextLine = lite$listAt((lite_lines), lite_i, 30687);
                                            void lite_nextLine;
                                            const lite_nextTrim = liteFn$lib$core$text$trim(lite_nextLine);
                                            void lite_nextTrim;
                                            if (((lite_nextTrim) === (""))) {
                                                break;
                                            }
                                            if ((((((((((((liteFn$lib$util$markdown__html$parseBulletItem(lite_nextLine)).ok) || ((liteFn$lib$util$markdown__html$parseOrderedItem(lite_nextLine)).ok))) || ((liteFn$lib$util$markdown__html$parseHeadingLine(lite_nextLine)).ok))) || ((liteFn$lib$util$markdown__html$parseFenceOpen(lite_nextLine)).ok))) || (liteFn$lib$util$markdown__html$isHorizontalRule(lite_nextLine)))) || (liteFn$lib$core$text$startsWithAt(liteFn$lib$core$text$trimStart(lite_nextLine), 0n, ">")))) {
                                                break;
                                            }
                                            lite_olItemLines.push(liteFn$lib$core$text$trim(lite_nextLine));
                                            lite_i = lite$addInt(lite_i, 1n, 31317);
                                        }
                                        lite_olItemsHtml.push((((("<li>") + (liteFn$lib$util$markdown__html$renderInline(liteFn$lib$core$text$joinTexts([...(lite_olItemLines)], " "))))) + ("</li>")));
                                        if (((((((((lite_i) < (lite_total))) && (((liteFn$lib$core$text$trim(lite$listAt((lite_lines), lite_i, 31565))) === (""))))) && (((lite$addInt(lite_i, 1n, 31581)) < (lite_total))))) && ((liteFn$lib$util$markdown__html$parseOrderedItem(lite$listAt((lite_lines), lite$addInt(lite_i, 1n, 31622), 31620))).ok))) {
                                            lite_i = lite$addInt(lite_i, 1n, 31675);
                                        }
                                    }
                                    lite_blocks.push((((("<ol>") + (liteFn$lib$core$text$joinTexts([...(lite_olItemsHtml)], "")))) + ("</ol>")));
                                } else {
                                    const lite_paraLines: string[] = [...([])];
                                    void lite_paraLines;
                                    while (((lite_i) < (lite_total))) {
                                        const lite_pLine = lite$listAt((lite_lines), lite_i, 32067);
                                        void lite_pLine;
                                        const lite_pTrim = liteFn$lib$core$text$trim(lite_pLine);
                                        void lite_pTrim;
                                        if (((lite_pTrim) === (""))) {
                                            break;
                                        }
                                        if (((liteFn$lib$core$list$listCountText([...(lite_paraLines)])) > (0n))) {
                                            if ((((((((((((liteFn$lib$util$markdown__html$parseFenceOpen(lite_pLine)).ok) || ((liteFn$lib$util$markdown__html$parseHeadingLine(lite_pLine)).ok))) || (liteFn$lib$util$markdown__html$isHorizontalRule(lite_pLine)))) || (liteFn$lib$core$text$startsWithAt(liteFn$lib$core$text$trimStart(lite_pLine), 0n, ">")))) || ((liteFn$lib$util$markdown__html$parseBulletItem(lite_pLine)).ok))) || ((liteFn$lib$util$markdown__html$parseOrderedItem(lite_pLine)).ok))) {
                                                break;
                                            }
                                            if (((((lite$addInt(lite_i, 1n, 32647)) < (lite_total))) && (liteFn$lib$core$text$containsText(lite_pLine, "|")))) {
                                                const lite_pCells: string[] = [...(liteFn$lib$util$markdown__html$parseTableRow(lite_pLine))];
                                                void lite_pCells;
                                                if ((liteFn$lib$util$markdown__html$parseTableAligns(lite$listAt((lite_lines), lite$addInt(lite_i, 1n, 32843), 32841), liteFn$lib$core$list$listCountText([...(lite_pCells)]))).ok) {
                                                    break;
                                                }
                                            }
                                        }
                                        lite_paraLines.push(lite_pTrim);
                                        lite_i = lite$addInt(lite_i, 1n, 33082);
                                    }
                                    lite_blocks.push((((("<p>") + (liteFn$lib$util$markdown__html$renderInline(liteFn$lib$core$text$joinTexts([...(lite_paraLines)], " "))))) + ("</p>")));
                                }
                            }
                        }
                    }
                }
            }
        }
        const lite_tocJson = (((("[") + (liteFn$lib$core$text$joinTexts([...(lite_tocEntries)], ",")))) + ("]"));
        void lite_tocJson;
        return { title: lite_docTitle, html: liteFn$lib$core$text$joinTexts([...(lite_blocks)], "\n"), tocJson: lite_tocJson };
    }
    void liteFn$lib$util$markdown__html$renderBodyLines;
    function liteFn$lib$util$markdown__html$renderMarkdown(lite_docText: string): { title: string; status: string; html: string; tocJson: string } {
        void lite_docText;
        const lite_lines: string[] = [...(liteFn$lib$util$markdown__html$splitLines(lite_docText))];
        void lite_lines;
        const lite_rendered = liteFn$lib$util$markdown__html$renderBodyLines([...(lite_lines)], true);
        void lite_rendered;
        const lite_status = liteFn$lib$util$markdown__html$detectDocStatus(lite_docText);
        void lite_status;
        return { title: (lite_rendered).title, status: lite_status, html: (lite_rendered).html, tocJson: (lite_rendered).tocJson };
    }
    void liteFn$lib$util$markdown__html$renderMarkdown;
    function liteFn$lib$util$markdown__html$renderMarkdownJson(lite_docText: string, lite_docPath: string): string {
        void lite_docText;
        void lite_docPath;
        const lite_rendered = liteFn$lib$util$markdown__html$renderMarkdown(lite_docText);
        void lite_rendered;
        const lite_title = (Boolean((((lite_rendered).title) === (""))) ? lite_docPath : (lite_rendered).title);
        void lite_title;
        return (((((((((((((((((((("{\"path\":") + (liteFn$lib$util$json$quoteString(lite_docPath)))) + (",\"title\":"))) + (liteFn$lib$util$json$quoteString(lite_title)))) + (",\"status\":"))) + (liteFn$lib$util$json$quoteString((lite_rendered).status)))) + (",\"toc\":"))) + ((lite_rendered).tocJson))) + (",\"html\":"))) + (liteFn$lib$util$json$quoteString((lite_rendered).html)))) + ("}"));
    }
    void liteFn$lib$util$markdown__html$renderMarkdownJson;
    function liteFn$lib$core$file$readText(lite_path: string): { ok: boolean; text: string; error: string } {
        void lite_path;
        return lite$fileReadText(lite_path);
    }
    void liteFn$lib$core$file$readText;
    function liteFn$lib$core$path$isWin32(): boolean {
        return ((lite$processPlatform()) === ("win32"));
    }
    void liteFn$lib$core$path$isWin32;
    function liteFn$lib$core$path$isSepWith(lite_ch: string, lite_win: boolean): boolean {
        void lite_ch;
        void lite_win;
        return ((((lite_ch) === ("/"))) || ((((lite_win) && (((lite_ch) === ("\\")))))));
    }
    void liteFn$lib$core$path$isSepWith;
    function liteFn$lib$core$path$sep(): string {
        if (liteFn$lib$core$path$isWin32()) {
            return "\\";
        }
        return "/";
    }
    void liteFn$lib$core$path$sep;
    function liteFn$lib$core$path$isSep(lite_ch: string): boolean {
        void lite_ch;
        return liteFn$lib$core$path$isSepWith(lite_ch, liteFn$lib$core$path$isWin32());
    }
    void liteFn$lib$core$path$isSep;
    function liteFn$lib$core$path$isAbsolute(lite_target: string): boolean {
        void lite_target;
        const lite_size = lite$textLength(lite_target);
        void lite_size;
        if (((lite_size) === (0n))) {
            return false;
        }
        const lite_win = liteFn$lib$core$path$isWin32();
        void lite_win;
        if (liteFn$lib$core$path$isSepWith(lite$textAt(lite_target, 0n, 1003), lite_win)) {
            return true;
        }
        return ((((((lite_win) && (((lite_size) >= (2n))))) && (liteFn$lib$core$text$isAsciiLetter(lite$textAt(lite_target, 0n, 1090))))) && (((lite$textAt(lite_target, 1n, 1114)) === (":"))));
    }
    void liteFn$lib$core$path$isAbsolute;
    function liteFn$lib$core$path$normalize(lite_raw: string): string {
        void lite_raw;
        const lite_size = lite$textLength(lite_raw);
        void lite_size;
        if (((lite_size) === (0n))) {
            return ".";
        }
        const lite_win = liteFn$lib$core$path$isWin32();
        void lite_win;
        const lite_separator = (Boolean(lite_win) ? "\\" : "/");
        void lite_separator;
        let lite_rootPrefix = "";
        void lite_rootPrefix;
        let lite_start = 0n;
        void lite_start;
        if (((((((lite_win) && (((lite_size) >= (2n))))) && (liteFn$lib$core$text$isAsciiLetter(lite$textAt(lite_raw, 0n, 1486))))) && (((lite$textAt(lite_raw, 1n, 1507)) === (":"))))) {
            const lite_drive = lite$textSlice(lite_raw, 0n, 2n, 1549);
            void lite_drive;
            if (((((lite_size) >= (3n))) && (liteFn$lib$core$path$isSepWith(lite$textAt(lite_raw, 2n, 1607), true)))) {
                lite_rootPrefix = ((lite_drive) + (lite_separator));
                lite_start = 3n;
            } else {
                lite_rootPrefix = lite_drive;
                lite_start = 2n;
            }
        } else if (liteFn$lib$core$path$isSepWith(lite$textAt(lite_raw, 0n, 1805), lite_win)) {
            lite_rootPrefix = lite_separator;
            lite_start = 1n;
        }
        const lite_parts: string[] = [...([])];
        void lite_parts;
        let lite_partsCount = 0n;
        void lite_partsCount;
        let lite_segStart = lite_start;
        void lite_segStart;
        while (((lite_segStart) <= (lite_size))) {
            let lite_sepPos = liteFn$lib$core$text$indexOfText(lite_raw, "/", lite_segStart);
            void lite_sepPos;
            if (lite_win) {
                const lite_bsPos = liteFn$lib$core$text$indexOfText(lite_raw, "\\", lite_segStart);
                void lite_bsPos;
                if (((((lite_bsPos) >= (0n))) && ((((((lite_sepPos) < (0n))) || (((lite_bsPos) < (lite_sepPos)))))))) {
                    lite_sepPos = lite_bsPos;
                }
            }
            const lite_i = (Boolean(((lite_sepPos) < (0n))) ? lite_size : lite_sepPos);
            void lite_i;
            if (((lite_i) > (lite_segStart))) {
                const lite_seg = lite$textSlice(lite_raw, lite_segStart, lite_i, 2327);
                void lite_seg;
                if (((lite_seg) === (".."))) {
                    if (((((lite_partsCount) > (0n))) && ((((((lite_rootPrefix) !== (""))) || (((lite$listAt((lite_parts), lite$subtractInt(lite_partsCount, 1n, 2463), 2452)) !== ("..")))))))) {
                        lite$listPopBack(lite_parts, 2500);
                        lite_partsCount = lite$subtractInt(lite_partsCount, 1n, 2569);
                    } else if (((lite_rootPrefix) === (""))) {
                        lite_parts.push("..");
                        lite_partsCount = lite$addInt(lite_partsCount, 1n, 2715);
                    }
                } else if (((lite_seg) !== ("."))) {
                    lite_parts.push(lite_seg);
                    lite_partsCount = lite$addInt(lite_partsCount, 1n, 2861);
                }
            }
            if (((lite_sepPos) < (0n))) {
                break;
            }
            lite_segStart = lite$addInt(lite_i, 1n, 2944);
        }
        if (((lite_partsCount) === (0n))) {
            if (((lite_rootPrefix) !== (""))) {
                return lite_rootPrefix;
            }
            return ".";
        }
        return ((lite_rootPrefix) + (liteFn$lib$core$text$joinTexts([...(lite_parts)], lite_separator)));
    }
    void liteFn$lib$core$path$normalize;
    function liteFn$lib$core$path$join(lite_baseDir: string, lite_target: string): string {
        void lite_baseDir;
        void lite_target;
        if (((lite_baseDir) === (""))) {
            return liteFn$lib$core$path$normalize(lite_target);
        }
        if (((lite_target) === (""))) {
            return liteFn$lib$core$path$normalize(lite_baseDir);
        }
        return liteFn$lib$core$path$normalize(((((lite_baseDir) + (liteFn$lib$core$path$sep()))) + (lite_target)));
    }
    void liteFn$lib$core$path$join;
    function liteFn$lib$core$path$resolve(lite_baseDir: string, lite_target: string): string {
        void lite_baseDir;
        void lite_target;
        if (liteFn$lib$core$path$isAbsolute(lite_target)) {
            return liteFn$lib$core$path$normalize(lite_target);
        }
        return liteFn$lib$core$path$join(lite_baseDir, lite_target);
    }
    void liteFn$lib$core$path$resolve;
    function liteFn$lib$core$path$parentDir(lite_target: string): string {
        void lite_target;
        return liteFn$lib$core$path$resolve(lite_target, "..");
    }
    void liteFn$lib$core$path$parentDir;
    function liteFn$lib$core$path$baseName(lite_target: string): string {
        void lite_target;
        let lite_end = lite$textLength(lite_target);
        void lite_end;
        while (((((lite_end) > (0n))) && (liteFn$lib$core$path$isSep(lite$textAt(lite_target, lite$subtractInt(lite_end, 1n, 4414), 4394))))) {
            lite_end = lite$subtractInt(lite_end, 1n, 4440);
        }
        if (((lite_end) === (0n))) {
            return "";
        }
        let lite_pos = lite_end;
        void lite_pos;
        while (((((lite_pos) > (0n))) && ((!(liteFn$lib$core$path$isSep(lite$textAt(lite_target, lite$subtractInt(lite_pos, 1n, 4553), 4533))))))) {
            lite_pos = lite$subtractInt(lite_pos, 1n, 4579);
        }
        return lite$textSlice(lite_target, lite_pos, lite_end, 4594);
    }
    void liteFn$lib$core$path$baseName;
    function liteFn$lib$core$path$extName(lite_target: string): string {
        void lite_target;
        const lite_base = liteFn$lib$core$path$baseName(lite_target);
        void lite_base;
        if (((((((lite_base) === (""))) || (((lite_base) === ("."))))) || (((lite_base) === (".."))))) {
            return "";
        }
        const lite_size = lite$textLength(lite_base);
        void lite_size;
        let lite_i = lite$subtractInt(lite_size, 1n, 4911);
        void lite_i;
        while (((lite_i) > (0n))) {
            if (((lite$textAt(lite_base, lite_i, 4944)) === ("."))) {
                return lite$textSlice(lite_base, lite_i, lite_size, 4989);
            }
            lite_i = lite$subtractInt(lite_i, 1n, 5040);
        }
        return "";
    }
    void liteFn$lib$core$path$extName;
    function liteFn$lib$core$path$stem(lite_target: string): string {
        void lite_target;
        const lite_base = liteFn$lib$core$path$baseName(lite_target);
        void lite_base;
        const lite_ext = liteFn$lib$core$path$extName(lite_target);
        void lite_ext;
        if (((lite_ext) === (""))) {
            return lite_base;
        }
        return lite$textSlice(lite_base, 0n, lite$subtractInt(lite$textLength(lite_base), lite$textLength(lite_ext), 5297), 5259);
    }
    void liteFn$lib$core$path$stem;
    function liteFn$lib$core$path$splitSegments(lite_normalized: string): string[] {
        void lite_normalized;
        const lite_parts: string[] = [...([])];
        void lite_parts;
        const lite_size = lite$textLength(lite_normalized);
        void lite_size;
        let lite_start = 0n;
        void lite_start;
        if (((((((liteFn$lib$core$path$isWin32()) && (((lite_size) >= (2n))))) && (liteFn$lib$core$text$isAsciiLetter(lite$textAt(lite_normalized, 0n, 6333))))) && (((lite$textAt(lite_normalized, 1n, 6361)) === (":"))))) {
            if (((((lite_size) >= (3n))) && (liteFn$lib$core$path$isSep(lite$textAt(lite_normalized, 2n, 6424))))) {
                lite_start = 3n;
            } else {
                lite_start = 2n;
            }
        } else if (((((lite_size) > (0n))) && (liteFn$lib$core$path$isSep(lite$textAt(lite_normalized, 0n, 6516))))) {
            lite_start = 1n;
        }
        let lite_segStart = lite_start;
        void lite_segStart;
        let lite_i = lite_start;
        void lite_i;
        while (((lite_i) <= (lite_size))) {
            const lite_atEnd = ((lite_i) === (lite_size));
            void lite_atEnd;
            if (((lite_atEnd) || (liteFn$lib$core$path$isSep(lite$textAt(lite_normalized, lite_i, 6689))))) {
                if (((lite_i) > (lite_segStart))) {
                    lite_parts.push(lite$textSlice(lite_normalized, lite_segStart, lite_i, 6786));
                }
                lite_segStart = lite$addInt(lite_i, 1n, 6863);
            }
            lite_i = lite$addInt(lite_i, 1n, 6892);
        }
        return [...(lite_parts)];
    }
    void liteFn$lib$core$path$splitSegments;
    function liteFn$lib$core$path$relative(lite_fromDir: string, lite_toPath: string): string {
        void lite_fromDir;
        void lite_toPath;
        const lite_cwd = lite$processCwd();
        void lite_cwd;
        const lite_fromAbs = liteFn$lib$core$path$resolve(lite_cwd, lite_fromDir);
        void lite_fromAbs;
        const lite_toAbs = liteFn$lib$core$path$resolve(lite_cwd, lite_toPath);
        void lite_toAbs;
        if (((lite_fromAbs) === (lite_toAbs))) {
            return "";
        }
        const lite_fromSegs: string[] = [...(liteFn$lib$core$path$splitSegments(lite_fromAbs))];
        void lite_fromSegs;
        const lite_toSegs: string[] = [...(liteFn$lib$core$path$splitSegments(lite_toAbs))];
        void lite_toSegs;
        const lite_fromLen = liteFn$lib$core$list$listCountText([...(lite_fromSegs)]);
        void lite_fromLen;
        const lite_toLen = liteFn$lib$core$list$listCountText([...(lite_toSegs)]);
        void lite_toLen;
        let lite_common = 0n;
        void lite_common;
        while (((((((lite_common) < (lite_fromLen))) && (((lite_common) < (lite_toLen))))) && (((lite$listAt((lite_fromSegs), lite_common, 7464)) === (lite$listAt((lite_toSegs), lite_common, 7482)))))) {
            lite_common = lite$addInt(lite_common, 1n, 7516);
        }
        const lite_out: string[] = [...([])];
        void lite_out;
        let lite_up = lite_common;
        void lite_up;
        while (((lite_up) < (lite_fromLen))) {
            lite_out.push("..");
            lite_up = lite$addInt(lite_up, 1n, 7659);
        }
        let lite_down = lite_common;
        void lite_down;
        while (((lite_down) < (lite_toLen))) {
            lite_out.push(lite$listAt((lite_toSegs), lite_down, 7756));
            lite_down = lite$addInt(lite_down, 1n, 7784);
        }
        if (((liteFn$lib$core$list$listCountText([...(lite_out)])) === (0n))) {
            return "";
        }
        return liteFn$lib$core$text$joinTexts([...(lite_out)], liteFn$lib$core$path$sep());
    }
    void liteFn$lib$core$path$relative;
    function liteFn$lib$core$path$collectFiles(lite_baseDir: string, lite_targets: string[], lite_extension: string, lite_ignoredNames: string[], lite_skipDotEntries: boolean): string[] {
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
        let lite_targetIdx = lite$subtractInt(liteFn$lib$core$list$listCountText([...(lite_targets)]), 1n, 8951);
        void lite_targetIdx;
        while (((lite_targetIdx) >= (0n))) {
            lite_stack.push(liteFn$lib$core$path$resolve(lite_baseDir, lite$listAt((lite_targets), lite_targetIdx, 9040)));
            lite_stackCount = lite$addInt(lite_stackCount, 1n, 9086);
            lite_targetIdx = lite$subtractInt(lite_targetIdx, 1n, 9121);
        }
        while (((lite_stackCount) > (0n))) {
            const lite_resolved = lite$listPopBack(lite_stack, 9179);
            void lite_resolved;
            lite_stackCount = lite$subtractInt(lite_stackCount, 1n, 9236);
            const lite_entryKind = lite$fileKind(lite_resolved);
            void lite_entryKind;
            if (((lite_entryKind) === ("missing"))) {
                lite$reportError((((("ENOENT: no such file or directory, stat '") + (lite_resolved))) + ("'")));
                return lite$exit(1n);
            }
            if (((lite_entryKind) === ("dir"))) {
                const lite_entries: string[] = [...(lite$fileListDir(lite_resolved))];
                void lite_entries;
                let lite_entryIdx = lite$subtractInt(liteFn$lib$core$list$listCountText([...(lite_entries)]), 1n, 9576);
                void lite_entryIdx;
                while (((lite_entryIdx) >= (0n))) {
                    const lite_entry = lite$listAt((lite_entries), lite_entryIdx, 9647);
                    void lite_entry;
                    const lite_isDot = ((lite_skipDotEntries) && (liteFn$lib$core$text$startsWithAt(lite_entry, 0n, ".")));
                    void lite_isDot;
                    if ((((!(lite_isDot))) && ((!(liteFn$lib$core$list$listContainsText([...(lite_ignoredNames)], lite_entry)))))) {
                        lite_stack.push(liteFn$lib$core$path$resolve(lite_resolved, lite_entry));
                        lite_stackCount = lite$addInt(lite_stackCount, 1n, 9934);
                    }
                    lite_entryIdx = lite$subtractInt(lite_entryIdx, 1n, 9993);
                }
            } else if (((((lite_extension) === (""))) || (liteFn$lib$core$text$endsWith(lite_resolved, lite_extension)))) {
                lite_files.push(lite_resolved);
            }
        }
        return [...(lite_files)];
    }
    void liteFn$lib$core$path$collectFiles;
    function liteFn$lib$util$cli$rest(lite_args: string[], lite_start: bigint): string[] {
        void lite_args;
        void lite_start;
        const lite_out: string[] = [...([])];
        void lite_out;
        const lite_count = liteFn$lib$core$list$listCountText([...(lite_args)]);
        void lite_count;
        let lite_i = (Boolean(((lite_start) < (0n))) ? 0n : lite_start);
        void lite_i;
        while (((lite_i) < (lite_count))) {
            lite_out.push(lite$listAt((lite_args), lite_i, 702));
            lite_i = lite$addInt(lite_i, 1n, 721);
        }
        return [...(lite_out)];
    }
    void liteFn$lib$util$cli$rest;
    function liteFn$lib$util$cli$startsWith(lite_args: string[], lite_token: string): boolean {
        void lite_args;
        void lite_token;
        return ((((liteFn$lib$core$list$listCountText([...(lite_args)])) > (0n))) && (((lite$listAt((lite_args), 0n, 895)) === (lite_token))));
    }
    void liteFn$lib$util$cli$startsWith;
    function liteFn$lib$util$cli$dropIf(lite_args: string[], lite_token: string): string[] {
        void lite_args;
        void lite_token;
        if (liteFn$lib$util$cli$startsWith([...(lite_args)], lite_token)) {
            return [...(liteFn$lib$util$cli$rest([...(lite_args)], 1n))];
        }
        return [...(liteFn$lib$util$cli$rest([...(lite_args)], 0n))];
    }
    void liteFn$lib$util$cli$dropIf;
    function liteFn$lib$util$docgen$cleanDocComment(lite_rawComment: string): string {
        void lite_rawComment;
        const lite_size = lite$textLength(lite_rawComment);
        void lite_size;
        let lite_start = 2n;
        void lite_start;
        if (((((lite_start) < (lite_size))) && (((lite$textAt(lite_rawComment, lite_start, 521)) === ("*"))))) {
            lite_start = lite$addInt(lite_start, 1n, 571);
        }
        let lite_end = lite_size;
        void lite_end;
        if (((((lite$subtractInt(lite_end, 2n, 615)) >= (lite_start))) && (liteFn$lib$core$text$startsWithAt(lite_rawComment, lite$subtractInt(lite_end, 2n, 666), "*/")))) {
            lite_end = lite$subtractInt(lite_end, 2n, 691);
        }
        const lite_inner = lite$textSlice(lite_rawComment, lite_start, lite_end, 716);
        void lite_inner;
        const lite_innerLen = lite$textLength(lite_inner);
        void lite_innerLen;
        const lite_cleanedLines: string[] = [...([])];
        void lite_cleanedLines;
        let lite_pos = 0n;
        void lite_pos;
        while (((lite_pos) <= (lite_innerLen))) {
            const lite_nl = liteFn$lib$core$text$indexOfText(lite_inner, "\n", lite_pos);
            void lite_nl;
            const lite_lineEnd = (Boolean(((lite_nl) < (0n))) ? lite_innerLen : lite_nl);
            void lite_lineEnd;
            let lite_cleanEnd = lite_lineEnd;
            void lite_cleanEnd;
            if (((((lite_cleanEnd) > (lite_pos))) && (((lite$textAt(lite_inner, lite$subtractInt(lite_cleanEnd, 1n, 1066), 1042)) === ("\r"))))) {
                lite_cleanEnd = lite$subtractInt(lite_cleanEnd, 1n, 1102);
            }
            const lite_trimmed = liteFn$lib$core$text$trim(lite$textSlice(lite_inner, lite_pos, lite_cleanEnd, 1147));
            void lite_trimmed;
            let lite_lineBody = lite_trimmed;
            void lite_lineBody;
            if (liteFn$lib$core$text$startsWithAt(lite_trimmed, 0n, "*")) {
                const lite_afterStar = lite$textSlice(lite_trimmed, 1n, lite$textLength(lite_trimmed), 1288);
                void lite_afterStar;
                lite_lineBody = (Boolean(liteFn$lib$core$text$startsWithAt(lite_afterStar, 0n, " ")) ? lite$textSlice(lite_afterStar, 1n, lite$textLength(lite_afterStar), 1415) : liteFn$lib$core$text$trimStart(lite_afterStar));
            }
            lite_cleanedLines.push(lite_lineBody);
            if (((lite_nl) < (0n))) {
                break;
            }
            lite_pos = lite$addInt(lite_nl, 1n, 1649);
        }
        return liteFn$lib$core$text$trim(liteFn$lib$core$text$joinTexts([...(lite_cleanedLines)], "\n"));
    }
    void liteFn$lib$util$docgen$cleanDocComment;
    function liteFn$lib$util$docgen$normalizeSignature(lite_raw: string): string {
        void lite_raw;
        const lite_size = lite$textLength(lite_raw);
        void lite_size;
        let lite_out = "";
        void lite_out;
        let lite_i = 0n;
        void lite_i;
        let lite_pendingSpace = false;
        void lite_pendingSpace;
        while (((lite_i) < (lite_size))) {
            const lite_ch = lite$textAt(lite_raw, lite_i, 1988);
            void lite_ch;
            if (liteFn$lib$core$text$isWhitespace(lite_ch)) {
                if (((lite_out) !== (""))) {
                    lite_pendingSpace = true;
                }
            } else {
                if (lite_pendingSpace) {
                    const lite_lastOut = lite$textAt(lite_out, lite$subtractInt(lite$textLength(lite_out), 1n, 2223), 2193);
                    void lite_lastOut;
                    if (((((((lite_lastOut) !== ("("))) && (((lite_ch) !== (")"))))) && (((lite_ch) !== (","))))) {
                        lite_out = ((lite_out) + (" "));
                    }
                    lite_pendingSpace = false;
                }
                lite_out = ((lite_out) + (lite_ch));
            }
            lite_i = lite$addInt(lite_i, 1n, 2451);
        }
        return liteFn$lib$core$text$trim(lite_out);
    }
    void liteFn$lib$util$docgen$normalizeSignature;
    function liteFn$lib$util$docgen$skipBlockComment(lite_source: string, lite_start: bigint, lite_startLine: bigint): { next: bigint; nextLine: bigint; raw: string } {
        void lite_source;
        void lite_start;
        void lite_startLine;
        const lite_size = lite$textLength(lite_source);
        void lite_size;
        let lite_pos = lite$addInt(lite_start, 2n, 2650);
        void lite_pos;
        let lite_line = lite_startLine;
        void lite_line;
        let lite_depth = 1n;
        void lite_depth;
        while (((((lite_pos) < (lite_size))) && (((lite_depth) > (0n))))) {
            if (((((((lite$addInt(lite_pos, 1n, 2753)) < (lite_size))) && (((lite$textAt(lite_source, lite_pos, 2768)) === ("/"))))) && (((lite$textAt(lite_source, lite$addInt(lite_pos, 1n, 2820), 2800)) === ("*"))))) {
                lite_depth = lite$addInt(lite_depth, 1n, 2852);
                lite_pos = lite$addInt(lite_pos, 2n, 2874);
            } else if (((((((lite$addInt(lite_pos, 1n, 2902)) < (lite_size))) && (((lite$textAt(lite_source, lite_pos, 2917)) === ("*"))))) && (((lite$textAt(lite_source, lite$addInt(lite_pos, 1n, 2969), 2949)) === ("/"))))) {
                lite_depth = lite$subtractInt(lite_depth, 1n, 3001);
                lite_pos = lite$addInt(lite_pos, 2n, 3023);
            } else {
                if (((lite$textAt(lite_source, lite_pos, 3061)) === ("\n"))) {
                    lite_line = lite$addInt(lite_line, 1n, 3097);
                }
                lite_pos = lite$addInt(lite_pos, 1n, 3121);
            }
        }
        return { next: lite_pos, nextLine: lite_line, raw: lite$textSlice(lite_source, lite_start, lite_pos, 3183) };
    }
    void liteFn$lib$util$docgen$skipBlockComment;
    function liteFn$lib$util$docgen$skipStringLiteral(lite_source: string, lite_start: bigint, lite_startLine: bigint): { next: bigint; nextLine: bigint } {
        void lite_source;
        void lite_start;
        void lite_startLine;
        const lite_size = lite$textLength(lite_source);
        void lite_size;
        let lite_pos = lite$addInt(lite_start, 1n, 3371);
        void lite_pos;
        let lite_line = lite_startLine;
        void lite_line;
        while (((lite_pos) < (lite_size))) {
            const lite_ch = lite$textAt(lite_source, lite_pos, 3439);
            void lite_ch;
            if (((((lite_ch) === ("\\"))) && (((lite$addInt(lite_pos, 1n, 3491)) < (lite_size))))) {
                if (((lite$textAt(lite_source, lite$addInt(lite_pos, 1n, 3539), 3519)) === ("\n"))) {
                    lite_line = lite$addInt(lite_line, 1n, 3559);
                }
                lite_pos = lite$addInt(lite_pos, 2n, 3583);
            } else if (((lite_ch) === ("\""))) {
                return { next: lite$addInt(lite_pos, 1n, 3651), nextLine: lite_line };
            } else {
                if (((lite_ch) === ("\n"))) {
                    lite_line = lite$addInt(lite_line, 1n, 3724);
                }
                lite_pos = lite$addInt(lite_pos, 1n, 3748);
            }
        }
        return { next: lite_pos, nextLine: lite_line };
    }
    void liteFn$lib$util$docgen$skipStringLiteral;
    function liteFn$lib$util$docgen$skipLineComment(lite_source: string, lite_start: bigint): bigint {
        void lite_source;
        void lite_start;
        const lite_nl = liteFn$lib$core$text$indexOfText(lite_source, "\n", lite_start);
        void lite_nl;
        return (Boolean(((lite_nl) < (0n))) ? lite$textLength(lite_source) : lite_nl);
    }
    void liteFn$lib$util$docgen$skipLineComment;
    function liteFn$lib$util$docgen$skipInlineTrivia(lite_source: string, lite_start: bigint, lite_startLine: bigint): { next: bigint; nextLine: bigint } {
        void lite_source;
        void lite_start;
        void lite_startLine;
        const lite_size = lite$textLength(lite_source);
        void lite_size;
        let lite_pos = lite_start;
        void lite_pos;
        let lite_line = lite_startLine;
        void lite_line;
        while (((lite_pos) < (lite_size))) {
            const lite_ch = lite$textAt(lite_source, lite_pos, 4183);
            void lite_ch;
            if (liteFn$lib$core$text$isWhitespace(lite_ch)) {
                if (((lite_ch) === ("\n"))) {
                    lite_line = lite$addInt(lite_line, 1n, 4273);
                }
                lite_pos = lite$addInt(lite_pos, 1n, 4297);
            } else if (((((((lite$addInt(lite_pos, 1n, 4325)) < (lite_size))) && (((lite_ch) === ("/"))))) && (((lite$textAt(lite_source, lite$addInt(lite_pos, 1n, 4374), 4354)) === ("/"))))) {
                lite_pos = liteFn$lib$util$docgen$skipLineComment(lite_source, lite_pos);
            } else if (((((((lite$addInt(lite_pos, 1n, 4458)) < (lite_size))) && (((lite_ch) === ("/"))))) && (((lite$textAt(lite_source, lite$addInt(lite_pos, 1n, 4507), 4487)) === ("*"))))) {
                const lite_skipped = liteFn$lib$util$docgen$skipBlockComment(lite_source, lite_pos, lite_line);
                void lite_skipped;
                lite_pos = (lite_skipped).next;
                lite_line = (lite_skipped).nextLine;
            } else {
                break;
            }
        }
        return { next: lite_pos, nextLine: lite_line };
    }
    void liteFn$lib$util$docgen$skipInlineTrivia;
    function liteFn$lib$util$docgen$classifyEnvironment(lite_namespace: string, lite_name: string): string {
        void lite_namespace;
        void lite_name;
        if (((lite_namespace) === ("extra"))) {
            return "play";
        }
        if (((((((((lite_name) === ("file"))) || (((lite_name) === ("path"))))) || (((lite_name) === ("process"))))) || (((lite_name) === ("time"))))) {
            return "cli";
        }
        return "universal";
    }
    void liteFn$lib$util$docgen$classifyEnvironment;
    function liteFn$lib$util$docgen$extractModuleJson(lite_source: string, lite_namespace: string, lite_name: string, lite_fileRel: string): string {
        void lite_source;
        void lite_namespace;
        void lite_name;
        void lite_fileRel;
        const lite_size = lite$textLength(lite_source);
        void lite_size;
        let lite_pos = 0n;
        void lite_pos;
        let lite_line = 1n;
        void lite_line;
        let lite_braceDepth = 0n;
        void lite_braceDepth;
        let lite_parenDepth = 0n;
        void lite_parenDepth;
        let lite_sawCode = false;
        void lite_sawCode;
        let lite_moduleSummary = "";
        void lite_moduleSummary;
        let lite_pendingDoc = "";
        void lite_pendingDoc;
        const lite_symbolsJson: string[] = [...([])];
        void lite_symbolsJson;
        while (((lite_pos) < (lite_size))) {
            const lite_ch = lite$textAt(lite_source, lite_pos, 5571);
            void lite_ch;
            if (liteFn$lib$core$text$isWhitespace(lite_ch)) {
                if (((lite_ch) === ("\n"))) {
                    lite_line = lite$addInt(lite_line, 1n, 5661);
                }
                lite_pos = lite$addInt(lite_pos, 1n, 5685);
            } else if (((lite_ch) === ("\""))) {
                lite_sawCode = true;
                const lite_lit = liteFn$lib$util$docgen$skipStringLiteral(lite_source, lite_pos, lite_line);
                void lite_lit;
                lite_pos = (lite_lit).next;
                lite_line = (lite_lit).nextLine;
            } else if (((((((lite$addInt(lite_pos, 1n, 5890)) < (lite_size))) && (((lite_ch) === ("/"))))) && (((lite$textAt(lite_source, lite$addInt(lite_pos, 1n, 5939), 5919)) === ("/"))))) {
                lite_pos = liteFn$lib$util$docgen$skipLineComment(lite_source, lite_pos);
            } else if (((((((lite$addInt(lite_pos, 1n, 6023)) < (lite_size))) && (((lite_ch) === ("/"))))) && (((lite$textAt(lite_source, lite$addInt(lite_pos, 1n, 6072), 6052)) === ("*"))))) {
                const lite_isDoc = ((((((lite$addInt(lite_pos, 2n, 6111)) < (lite_size))) && (((lite$textAt(lite_source, lite$addInt(lite_pos, 2n, 6146), 6126)) === ("*"))))) && ((((((lite$addInt(lite_pos, 3n, 6167)) >= (lite_size))) || (((lite$textAt(lite_source, lite$addInt(lite_pos, 3n, 6202), 6182)) !== ("/")))))));
                void lite_isDoc;
                const lite_blk = liteFn$lib$util$docgen$skipBlockComment(lite_source, lite_pos, lite_line);
                void lite_blk;
                if (((((lite_braceDepth) === (0n))) && (((lite_parenDepth) === (0n))))) {
                    const lite_cleaned = liteFn$lib$util$docgen$cleanDocComment((lite_blk).raw);
                    void lite_cleaned;
                    if ((((((!(lite_sawCode))) && (((lite_moduleSummary) === (""))))) && ((!(lite_isDoc))))) {
                        lite_moduleSummary = lite_cleaned;
                    } else if ((((((!(lite_sawCode))) && (((lite_moduleSummary) === (""))))) && (lite_isDoc))) {
                        const lite_afterComment = liteFn$lib$util$docgen$skipInlineTrivia(lite_source, (lite_blk).next, (lite_blk).nextLine);
                        void lite_afterComment;
                        if ((((((lite_afterComment).next) < (lite_size))) && ((!(liteFn$lib$core$text$wordAt(lite_source, (lite_afterComment).next, "pub")))))) {
                            lite_moduleSummary = lite_cleaned;
                        } else {
                            lite_pendingDoc = lite_cleaned;
                        }
                    } else if (lite_isDoc) {
                        lite_pendingDoc = lite_cleaned;
                    }
                }
                lite_pos = (lite_blk).next;
                lite_line = (lite_blk).nextLine;
            } else if (((((((lite_braceDepth) === (0n))) && (((lite_parenDepth) === (0n))))) && (liteFn$lib$core$text$wordAt(lite_source, lite_pos, "pub")))) {
                lite_sawCode = true;
                const lite_declLine = lite_line;
                void lite_declLine;
                const lite_afterPub = liteFn$lib$util$docgen$skipInlineTrivia(lite_source, lite$addInt(lite_pos, 3n, 7277), lite_line);
                void lite_afterPub;
                const lite_nameStart = (lite_afterPub).next;
                void lite_nameStart;
                const lite_nameEnd = liteFn$lib$core$text$skipName(lite_source, lite_nameStart);
                void lite_nameEnd;
                const lite_declName = lite$textSlice(lite_source, lite_nameStart, lite_nameEnd, 7410);
                void lite_declName;
                const lite_afterName = liteFn$lib$util$docgen$skipInlineTrivia(lite_source, lite_nameEnd, (lite_afterPub).nextLine);
                void lite_afterName;
                if (((((lite_declName) !== (""))) && (liteFn$lib$core$text$startsWithAt(lite_source, (lite_afterName).next, ":=")))) {
                    const lite_rhsProbe = liteFn$lib$util$docgen$skipInlineTrivia(lite_source, lite$addInt((lite_afterName).next, 2n, 7682), (lite_afterName).nextLine);
                    void lite_rhsProbe;
                    const lite_rhsStart = (lite_rhsProbe).next;
                    void lite_rhsStart;
                    let lite_scanPos = lite_rhsStart;
                    void lite_scanPos;
                    let lite_scanLine = (lite_rhsProbe).nextLine;
                    void lite_scanLine;
                    let lite_scanParen = 0n;
                    void lite_scanParen;
                    let lite_stoppedAt = "";
                    void lite_stoppedAt;
                    while (((lite_scanPos) < (lite_size))) {
                        const lite_sc = lite$textAt(lite_source, lite_scanPos, 7980);
                        void lite_sc;
                        if (((lite_sc) === ("\""))) {
                            const lite_sLit = liteFn$lib$util$docgen$skipStringLiteral(lite_source, lite_scanPos, lite_scanLine);
                            void lite_sLit;
                            lite_scanPos = (lite_sLit).next;
                            lite_scanLine = (lite_sLit).nextLine;
                        } else if (((((((lite$addInt(lite_scanPos, 1n, 8253)) < (lite_size))) && (((lite_sc) === ("/"))))) && (((lite$textAt(lite_source, lite$addInt(lite_scanPos, 1n, 8306), 8282)) === ("/"))))) {
                            lite_scanPos = liteFn$lib$util$docgen$skipLineComment(lite_source, lite_scanPos);
                        } else if (((((((lite$addInt(lite_scanPos, 1n, 8426)) < (lite_size))) && (((lite_sc) === ("/"))))) && (((lite$textAt(lite_source, lite$addInt(lite_scanPos, 1n, 8479), 8455)) === ("*"))))) {
                            const lite_sBlk = liteFn$lib$util$docgen$skipBlockComment(lite_source, lite_scanPos, lite_scanLine);
                            void lite_sBlk;
                            lite_scanPos = (lite_sBlk).next;
                            lite_scanLine = (lite_sBlk).nextLine;
                        } else if (((lite_sc) === ("("))) {
                            lite_scanParen = lite$addInt(lite_scanParen, 1n, 8741);
                            lite_scanPos = lite$addInt(lite_scanPos, 1n, 8779);
                        } else if (((lite_sc) === (")"))) {
                            if (((lite_scanParen) > (0n))) {
                                lite_scanParen = lite$subtractInt(lite_scanParen, 1n, 8880);
                            }
                            lite_scanPos = lite$addInt(lite_scanPos, 1n, 8920);
                        } else if (((((lite_scanParen) === (0n))) && ((((((lite_sc) === ("{"))) || (((lite_sc) === (";")))))))) {
                            lite_stoppedAt = lite_sc;
                            break;
                        } else {
                            if (((lite_sc) === ("\n"))) {
                                lite_scanLine = lite$addInt(lite_scanLine, 1n, 9151);
                            }
                            lite_scanPos = lite$addInt(lite_scanPos, 1n, 9191);
                        }
                    }
                    const lite_rawRhs = lite$textSlice(lite_source, lite_rhsStart, lite_scanPos, 9263);
                    void lite_rawRhs;
                    const lite_normRhs = liteFn$lib$util$docgen$normalizeSignature(lite_rawRhs);
                    void lite_normRhs;
                    let lite_kind = "const";
                    void lite_kind;
                    if (liteFn$lib$core$text$wordAt(lite_normRhs, 0n, "type")) {
                        lite_kind = "type";
                    } else if (((((liteFn$lib$core$text$wordAt(lite_normRhs, 0n, "fn")) || (liteFn$lib$core$text$startsWithAt(lite_normRhs, 0n, "fn<")))) || (liteFn$lib$core$text$startsWithAt(lite_normRhs, 0n, "fn(")))) {
                        lite_kind = "fn";
                    }
                    const lite_isHost = ((((lite_kind) === ("fn"))) && (((lite_stoppedAt) === (";"))));
                    void lite_isHost;
                    const lite_sig = (((((((("pub ") + (lite_declName))) + (" := "))) + (lite_normRhs))) + (((Boolean(((lite_stoppedAt) === (";"))) ? ";" : ""))));
                    void lite_sig;
                    const lite_symJson = (((((((((((((((((((((((("{\"kind\":") + (liteFn$lib$util$json$quoteString(lite_kind)))) + (",\"name\":"))) + (liteFn$lib$util$json$quoteString(lite_declName)))) + (",\"signature\":"))) + (liteFn$lib$util$json$quoteString(lite_sig)))) + (",\"isHostDeclaration\":"))) + (((Boolean(lite_isHost) ? "true" : "false"))))) + (",\"doc\":"))) + (liteFn$lib$util$json$quoteString(lite_pendingDoc)))) + (",\"line\":"))) + (liteFn$lib$core$int$intText(lite_declLine)))) + ("}"));
                    void lite_symJson;
                    lite_symbolsJson.push(lite_symJson);
                    lite_pendingDoc = "";
                    lite_pos = lite_scanPos;
                    lite_line = lite_scanLine;
                } else {
                    lite_pendingDoc = "";
                    lite_pos = lite_nameEnd;
                    lite_line = (lite_afterName).nextLine;
                }
            } else {
                lite_sawCode = true;
                if (((lite_ch) === ("{"))) {
                    lite_braceDepth = lite$addInt(lite_braceDepth, 1n, 10630);
                } else if (((lite_ch) === ("}"))) {
                    if (((lite_braceDepth) > (0n))) {
                        lite_braceDepth = lite$subtractInt(lite_braceDepth, 1n, 10717);
                    }
                    if (((((lite_braceDepth) === (0n))) && (((lite_parenDepth) === (0n))))) {
                        lite_pendingDoc = "";
                    }
                } else if (((lite_ch) === ("("))) {
                    lite_parenDepth = lite$addInt(lite_parenDepth, 1n, 10898);
                } else if (((lite_ch) === (")"))) {
                    if (((lite_parenDepth) > (0n))) {
                        lite_parenDepth = lite$subtractInt(lite_parenDepth, 1n, 10985);
                    }
                } else if (((((((lite_ch) === (";"))) && (((lite_braceDepth) === (0n))))) && (((lite_parenDepth) === (0n))))) {
                    lite_pendingDoc = "";
                }
                if (((lite_ch) === ("\n"))) {
                    lite_line = lite$addInt(lite_line, 1n, 11147);
                }
                lite_pos = lite$addInt(lite_pos, 1n, 11171);
            }
        }
        const lite_modId = ((((lite_namespace) + ("/"))) + (lite_name));
        void lite_modId;
        const lite_env = liteFn$lib$util$docgen$classifyEnvironment(lite_namespace, lite_name);
        void lite_env;
        return (((((((((((((((((((((((((((("{\"id\":") + (liteFn$lib$util$json$quoteString(lite_modId)))) + (",\"namespace\":"))) + (liteFn$lib$util$json$quoteString(lite_namespace)))) + (",\"name\":"))) + (liteFn$lib$util$json$quoteString(lite_name)))) + (",\"file\":"))) + (liteFn$lib$util$json$quoteString(lite_fileRel)))) + (",\"environment\":"))) + (liteFn$lib$util$json$quoteString(lite_env)))) + (",\"summary\":"))) + (liteFn$lib$util$json$quoteString(lite_moduleSummary)))) + (",\"symbols\":["))) + (liteFn$lib$core$text$joinTexts([...(lite_symbolsJson)], ",")))) + ("]}"));
    }
    void liteFn$lib$util$docgen$extractModuleJson;
    function liteFn$lib$util$docgen$extractAllModulesJson(lite_rootDir: string): string {
        void lite_rootDir;
        const lite_namespaces: string[] = [...(["core", "extra"])];
        void lite_namespaces;
        const lite_modJsonEntries: string[] = [...([])];
        void lite_modJsonEntries;
        for (const lite_ns of [...(lite_namespaces)]) {
            void lite_ns;
            const lite_nsDir = liteFn$lib$core$path$join(lite_rootDir, (("lib/") + (lite_ns)));
            void lite_nsDir;
            if (((lite$fileKind(lite_nsDir)) === ("dir"))) {
                const lite_entries: string[] = [...(lite$fileListDir(lite_nsDir))];
                void lite_entries;
                for (const lite_entryName of [...(lite_entries)]) {
                    void lite_entryName;
                    if (liteFn$lib$core$text$endsWith(lite_entryName, ".lts")) {
                        const lite_fullPath = liteFn$lib$core$path$join(lite_nsDir, lite_entryName);
                        void lite_fullPath;
                        if (((lite$fileKind(lite_fullPath)) === ("file"))) {
                            const lite_readRes = liteFn$lib$core$file$readText(lite_fullPath);
                            void lite_readRes;
                            if ((lite_readRes).ok) {
                                const lite_modName = liteFn$lib$core$path$stem(lite_entryName);
                                void lite_modName;
                                const lite_relFile = (((((("lib/") + (lite_ns))) + ("/"))) + (lite_entryName));
                                void lite_relFile;
                                lite_modJsonEntries.push(liteFn$lib$util$docgen$extractModuleJson((lite_readRes).text, lite_ns, lite_modName, lite_relFile));
                            }
                        }
                    }
                }
            }
        }
        return (((("[") + (liteFn$lib$core$text$joinTexts([...(lite_modJsonEntries)], ",")))) + ("]"));
    }
    void liteFn$lib$util$docgen$extractAllModulesJson;
    function liteFn$lib$util$docs$defaultIgnoredDirs(): string[] {
        const lite_dirs: string[] = [...([".git", ".cache", "node_modules", "dist", ".agent"])];
        void lite_dirs;
        return [...(lite_dirs)];
    }
    void liteFn$lib$util$docs$defaultIgnoredDirs;
    function liteFn$lib$util$docs$listDocFiles(lite_directory: string): string[] {
        void lite_directory;
        const lite_targets: string[] = [...([lite_directory])];
        void lite_targets;
        return [...(liteFn$lib$core$path$collectFiles(lite_directory, [...(lite_targets)], ".md", [...(liteFn$lib$util$docs$defaultIgnoredDirs())], false))];
    }
    void liteFn$lib$util$docs$listDocFiles;
    function liteFn$lib$util$docs$isSchemeChar(lite_ch: string): boolean {
        void lite_ch;
        return ((((((((liteFn$lib$core$text$isAsciiLetter(lite_ch)) || (liteFn$lib$core$text$isDigit(lite_ch)))) || (((lite_ch) === ("+"))))) || (((lite_ch) === ("."))))) || (((lite_ch) === ("-"))));
    }
    void liteFn$lib$util$docs$isSchemeChar;
    function liteFn$lib$util$docs$isExternalUri(lite_target: string): boolean {
        void lite_target;
        if (liteFn$lib$core$text$startsWithAt(lite_target, 0n, "//")) {
            return true;
        }
        const lite_size = lite$textLength(lite_target);
        void lite_size;
        if (((((lite_size) < (2n))) || ((!(liteFn$lib$core$text$isAsciiLetter(lite$textAt(lite_target, 0n, 1100))))))) {
            return false;
        }
        let lite_i = 1n;
        void lite_i;
        while (((lite_i) < (lite_size))) {
            const lite_ch = lite$textAt(lite_target, lite_i, 1188);
            void lite_ch;
            if (((lite_ch) === (":"))) {
                return true;
            }
            if ((!(liteFn$lib$util$docs$isSchemeChar(lite_ch)))) {
                return false;
            }
            lite_i = lite$addInt(lite_i, 1n, 1310);
        }
        return false;
    }
    void liteFn$lib$util$docs$isExternalUri;
    function liteFn$lib$util$docs$isHex(lite_ch: string): boolean {
        void lite_ch;
        return ((((((((((((((((((((((((liteFn$lib$core$text$isDigit(lite_ch)) || (((lite_ch) === ("a"))))) || (((lite_ch) === ("b"))))) || (((lite_ch) === ("c"))))) || (((lite_ch) === ("d"))))) || (((lite_ch) === ("e"))))) || (((lite_ch) === ("f"))))) || (((lite_ch) === ("A"))))) || (((lite_ch) === ("B"))))) || (((lite_ch) === ("C"))))) || (((lite_ch) === ("D"))))) || (((lite_ch) === ("E"))))) || (((lite_ch) === ("F"))));
    }
    void liteFn$lib$util$docs$isHex;
    function liteFn$lib$util$docs$hexVal(lite_ch: string): bigint {
        void lite_ch;
        if (liteFn$lib$core$text$isDigit(lite_ch)) {
            return liteFn$lib$core$text$digitValue(lite_ch);
        }
        const lite_lower = liteFn$lib$core$text$toLowerAscii(lite_ch);
        void lite_lower;
        if (((lite_lower) === ("a"))) {
            return 10n;
        }
        if (((lite_lower) === ("b"))) {
            return 11n;
        }
        if (((lite_lower) === ("c"))) {
            return 12n;
        }
        if (((lite_lower) === ("d"))) {
            return 13n;
        }
        if (((lite_lower) === ("e"))) {
            return 14n;
        }
        return 15n;
    }
    void liteFn$lib$util$docs$hexVal;
    function liteFn$lib$util$docs$asciiChar(lite_code: bigint): string {
        void lite_code;
        if (((((lite_code) >= (32n))) && (((lite_code) <= (126n))))) {
            const lite_table = " !\"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~";
            void lite_table;
            return lite$textAt(lite_table, lite$subtractInt(lite_code, 32n, 2089), 2069);
        }
        return "";
    }
    void liteFn$lib$util$docs$asciiChar;
    function liteFn$lib$util$docs$decodePercentUri(lite_target: string): { ok: boolean; value: string } {
        void lite_target;
        const lite_size = lite$textLength(lite_target);
        void lite_size;
        let lite_out = "";
        void lite_out;
        let lite_runStart = 0n;
        void lite_runStart;
        let lite_i = 0n;
        void lite_i;
        while (((lite_i) < (lite_size))) {
            if (((lite$textAt(lite_target, lite_i, 2302)) === ("%"))) {
                if (((((((lite$addInt(lite_i, 2n, 2347)) >= (lite_size))) || ((!(liteFn$lib$util$docs$isHex(lite$textAt(lite_target, lite$addInt(lite_i, 1n, 2390), 2372))))))) || ((!(liteFn$lib$util$docs$isHex(lite$textAt(lite_target, lite$addInt(lite_i, 2n, 2427), 2409))))))) {
                    return { ok: false, value: "" };
                }
                const lite_code = lite$addInt(lite$multiplyInt(liteFn$lib$util$docs$hexVal(lite$textAt(lite_target, lite$addInt(lite_i, 1n, 2543), 2525)), 16n, 2549), liteFn$lib$util$docs$hexVal(lite$textAt(lite_target, lite$addInt(lite_i, 2n, 2581), 2563)), 2554);
                void lite_code;
                if (((lite_i) > (lite_runStart))) {
                    lite_out = ((lite_out) + (lite$textSlice(lite_target, lite_runStart, lite_i, 2630)));
                }
                const lite_decoded = liteFn$lib$util$docs$asciiChar(lite_code);
                void lite_decoded;
                if (((lite_decoded) !== (""))) {
                    lite_out = ((lite_out) + (lite_decoded));
                } else if (((lite_code) < (128n))) {
                    if (((lite_code) === (9n))) {
                        lite_out = ((lite_out) + ("\t"));
                    } else if (((lite_code) === (10n))) {
                        lite_out = ((lite_out) + ("\n"));
                    } else if (((lite_code) === (13n))) {
                        lite_out = ((lite_out) + ("\r"));
                    } else {
                        return { ok: false, value: "" };
                    }
                } else {
                    lite_out = ((lite_out) + (lite$textSlice(lite_target, lite_i, lite$addInt(lite_i, 3n, 3105), 3081)));
                }
                lite_i = lite$addInt(lite_i, 3n, 3143);
                lite_runStart = lite_i;
            } else {
                lite_i = lite$addInt(lite_i, 1n, 3209);
            }
        }
        if (((lite_runStart) === (0n))) {
            return { ok: true, value: lite_target };
        }
        if (((lite_runStart) < (lite_size))) {
            lite_out = ((lite_out) + (lite$textSlice(lite_target, lite_runStart, lite_size, 3328)));
        }
        return { ok: true, value: lite_out };
    }
    void liteFn$lib$util$docs$decodePercentUri;
    function liteFn$lib$util$docs$dropFirstLines(lite_source: string, lite_skipLines: bigint): string {
        void lite_source;
        void lite_skipLines;
        if (((lite_skipLines) <= (0n))) {
            return lite_source;
        }
        const lite_size = lite$textLength(lite_source);
        void lite_size;
        let lite_pos = 0n;
        void lite_pos;
        let lite_skipped = 0n;
        void lite_skipped;
        while (((((lite_pos) < (lite_size))) && (((lite_skipped) < (lite_skipLines))))) {
            if (((lite$textAt(lite_source, lite_pos, 3632)) === ("\n"))) {
                lite_skipped = lite$addInt(lite_skipped, 1n, 3693);
            }
            lite_pos = lite$addInt(lite_pos, 1n, 3726);
        }
        if (((lite_skipped) < (lite_skipLines))) {
            return "";
        }
        return lite$textSlice(lite_source, lite_pos, lite_size, 3783);
    }
    void liteFn$lib$util$docs$dropFirstLines;
    function liteFn$lib$util$docs$packAnchors(lite_anchors: string[]): string {
        void lite_anchors;
        if (((liteFn$lib$core$list$listCountText([...(lite_anchors)])) === (0n))) {
            return "\n";
        }
        return (((("\n") + (liteFn$lib$core$text$joinTexts([...(lite_anchors)], "\n")))) + ("\n"));
    }
    void liteFn$lib$util$docs$packAnchors;
    function liteFn$lib$util$docs$checkDocuments(lite_directory: string): string[] {
        void lite_directory;
        const lite_failures: string[] = [...([])];
        void lite_failures;
        const lite_cachePaths: string[] = [...([])];
        void lite_cachePaths;
        const lite_cachePacked: string[] = [...([])];
        void lite_cachePacked;
        const lite_files: string[] = [...(liteFn$lib$util$docs$listDocFiles(lite_directory))];
        void lite_files;
        for (const lite_fullFile of [...(lite_files)]) {
            void lite_fullFile;
            const lite_relPath = liteFn$lib$core$path$relative(lite_directory, lite_fullFile);
            void lite_relPath;
            const lite_readRes = liteFn$lib$core$file$readText(lite_fullFile);
            void lite_readRes;
            if ((!((lite_readRes).ok))) {
                lite_failures.push(((((lite_relPath) + (": "))) + ((lite_readRes).error)));
            } else {
                const lite_docText = (lite_readRes).text;
                void lite_docText;
                if (liteFn$lib$util$markdown$hasUnclosedFence(lite_docText)) {
                    lite_failures.push(((lite_relPath) + (": unclosed code fence")));
                }
                const lite_links: string[] = [...(liteFn$lib$util$markdown$extractLinkTargets(liteFn$lib$util$markdown$stripCodeBlocks(lite_docText)))];
                void lite_links;
                for (const lite_rawTarget of [...(lite_links)]) {
                    void lite_rawTarget;
                    if ((!(liteFn$lib$util$docs$isExternalUri(lite_rawTarget)))) {
                        const lite_decodedRes = liteFn$lib$util$docs$decodePercentUri(lite_rawTarget);
                        void lite_decodedRes;
                        if ((!((lite_decodedRes).ok))) {
                            lite_failures.push(((((lite_relPath) + (": invalid link "))) + (lite_rawTarget)));
                        } else {
                            const lite_target = (lite_decodedRes).value;
                            void lite_target;
                            const lite_hashPos = liteFn$lib$core$text$indexOfText(lite_target, "#", 0n);
                            void lite_hashPos;
                            const lite_namePart = (Boolean(((lite_hashPos) < (0n))) ? lite_target : lite$textSlice(lite_target, 0n, lite_hashPos, 5309));
                            void lite_namePart;
                            const lite_fragment = (Boolean(((lite_hashPos) < (0n))) ? "" : lite$textSlice(lite_target, lite$addInt(lite_hashPos, 1n, 5435), lite$textLength(lite_target), 5408));
                            void lite_fragment;
                            const lite_destination = (Boolean(((lite_namePart) === (""))) ? lite_fullFile : liteFn$lib$core$path$resolve(liteFn$lib$core$path$parentDir(lite_fullFile), lite_namePart));
                            void lite_destination;
                            const lite_destKind = lite$fileKind(lite_destination);
                            void lite_destKind;
                            if (((lite_destKind) === ("missing"))) {
                                lite_failures.push(((((lite_relPath) + (": missing link "))) + (lite_target)));
                            } else if (((((((lite_fragment) !== (""))) && (((liteFn$lib$core$path$extName(lite_destination)) === (".md"))))) && (((lite_destKind) === ("file"))))) {
                                const lite_cacheIdx = liteFn$lib$core$list$listIndexOfText([...(lite_cachePaths)], lite_destination);
                                void lite_cacheIdx;
                                let lite_packed = "";
                                void lite_packed;
                                if (((lite_cacheIdx) >= (0n))) {
                                    lite_packed = lite$listAt((lite_cachePacked), lite_cacheIdx, 6144);
                                } else {
                                    const lite_targetRead = liteFn$lib$core$file$readText(lite_destination);
                                    void lite_targetRead;
                                    lite_packed = (Boolean((lite_targetRead).ok) ? liteFn$lib$util$docs$packAnchors([...(liteFn$lib$util$markdown$collectAnchors((lite_targetRead).text))]) : "\n");
                                    lite_cachePaths.push(lite_destination);
                                    lite_cachePacked.push(lite_packed);
                                }
                                if ((!(liteFn$lib$core$text$containsText(lite_packed, (((("\n") + (lite_fragment))) + ("\n")))))) {
                                    lite_failures.push(((((lite_relPath) + (": missing fragment "))) + (lite_target)));
                                }
                            }
                        }
                    }
                }
            }
        }
        const lite_configPath = liteFn$lib$core$path$join(lite_directory, "config/documentation.json");
        void lite_configPath;
        if (((lite$fileKind(lite_configPath)) === ("file"))) {
            const lite_cfgRead = liteFn$lib$core$file$readText(lite_configPath);
            void lite_cfgRead;
            if ((!((lite_cfgRead).ok))) {
                lite_failures.push((("config/documentation.json: ") + ((lite_cfgRead).error)));
                return [...(lite_failures)];
            }
            const lite_cfgText = (lite_cfgRead).text;
            void lite_cfgText;
            const lite_cfgCheck = liteFn$lib$util$json$validate(lite_cfgText);
            void lite_cfgCheck;
            if ((!((lite_cfgCheck).ok))) {
                lite_failures.push((("config/documentation.json: ") + ((lite_cfgCheck).error)));
                return [...(lite_failures)];
            }
            const lite_navField = liteFn$lib$util$json$findObjectField(lite_cfgText, 0n, "navigation");
            void lite_navField;
            if ((lite_navField).found) {
                const lite_navItems: bigint[] = [...(liteFn$lib$util$json$arrayElementOffsets(lite_cfgText, (lite_navField).valuePos))];
                void lite_navItems;
                for (const lite_navPos of [...(lite_navItems)]) {
                    void lite_navPos;
                    const lite_labelRes = liteFn$lib$util$json$readObjectString(lite_cfgText, lite_navPos, "label");
                    void lite_labelRes;
                    const lite_pathRes = liteFn$lib$util$json$readObjectString(lite_cfgText, lite_navPos, "path");
                    void lite_pathRes;
                    const lite_navPath = (Boolean((((lite_pathRes).found) && ((lite_pathRes).ok))) ? (lite_pathRes).value : "");
                    void lite_navPath;
                    const lite_navLabel = (Boolean((((lite_labelRes).found) && ((lite_labelRes).ok))) ? (lite_labelRes).value : "");
                    void lite_navLabel;
                    if (((((lite_navLabel) === (""))) || (((lite$fileKind(liteFn$lib$core$path$resolve(lite_directory, lite_navPath))) === ("missing"))))) {
                        lite_failures.push((("config/documentation.json: missing navigation destination ") + (lite_navPath)));
                    }
                }
            }
            const lite_snipField = liteFn$lib$util$json$findObjectField(lite_cfgText, 0n, "snippets");
            void lite_snipField;
            if ((lite_snipField).found) {
                const lite_snipItems: bigint[] = [...(liteFn$lib$util$json$arrayElementOffsets(lite_cfgText, (lite_snipField).valuePos))];
                void lite_snipItems;
                for (const lite_snipPos of [...(lite_snipItems)]) {
                    void lite_snipPos;
                    const lite_srcRes = liteFn$lib$util$json$readObjectString(lite_cfgText, lite_snipPos, "source");
                    void lite_srcRes;
                    const lite_docRes = liteFn$lib$util$json$readObjectString(lite_cfgText, lite_snipPos, "document");
                    void lite_docRes;
                    const lite_fenceRes = liteFn$lib$util$json$readObjectInt(lite_cfgText, lite_snipPos, "fence");
                    void lite_fenceRes;
                    const lite_skipRes = liteFn$lib$util$json$readObjectInt(lite_cfgText, lite_snipPos, "skipLines");
                    void lite_skipRes;
                    const lite_srcRel = (Boolean((((lite_srcRes).found) && ((lite_srcRes).ok))) ? (lite_srcRes).value : "");
                    void lite_srcRel;
                    const lite_docRel = (Boolean((((lite_docRes).found) && ((lite_docRes).ok))) ? (lite_docRes).value : "");
                    void lite_docRel;
                    const lite_srcFull = liteFn$lib$core$path$resolve(lite_directory, lite_srcRel);
                    void lite_srcFull;
                    const lite_docFull = liteFn$lib$core$path$resolve(lite_directory, lite_docRel);
                    void lite_docFull;
                    if (((((lite$fileKind(lite_srcFull)) === ("missing"))) || (((lite$fileKind(lite_docFull)) === ("missing"))))) {
                        lite_failures.push((("config/documentation.json: missing snippet source/document ") + (lite_srcRel)));
                    } else {
                        const lite_docRead = liteFn$lib$core$file$readText(lite_docFull);
                        void lite_docRead;
                        const lite_srcRead = liteFn$lib$core$file$readText(lite_srcFull);
                        void lite_srcRead;
                        if ((((!((lite_docRead).ok))) || ((!((lite_srcRead).ok))))) {
                            lite_failures.push((("config/documentation.json: cannot read snippet ") + (lite_srcRel)));
                        } else {
                            const lite_fences: string[] = [...(liteFn$lib$util$markdown$extractBacktickFenceBodies((lite_docRead).text))];
                            void lite_fences;
                            const lite_skipCount = (Boolean((((lite_skipRes).found) && ((lite_skipRes).ok))) ? (lite_skipRes).value : 0n);
                            void lite_skipCount;
                            const lite_expected = liteFn$lib$util$docs$dropFirstLines((lite_srcRead).text, lite_skipCount);
                            void lite_expected;
                            const lite_fenceIdx = (Boolean((((lite_fenceRes).found) && ((lite_fenceRes).ok))) ? (lite_fenceRes).value : (-1n));
                            void lite_fenceIdx;
                            if (((((((lite_fenceIdx) < (0n))) || (((lite_fenceIdx) >= (liteFn$lib$core$list$listCountText([...(lite_fences)])))))) || (((lite$listAt((lite_fences), lite_fenceIdx, 10032)) !== (lite_expected))))) {
                                lite_failures.push(((((((((lite_docRel) + (": code fence "))) + (liteFn$lib$core$int$intText(lite_fenceIdx)))) + (" differs from "))) + (lite_srcRel)));
                            }
                        }
                    }
                }
            }
        }
        return [...(lite_failures)];
    }
    void liteFn$lib$util$docs$checkDocuments;
    function liteFn$lib$util$docs$navigationSummary(lite_directory: string): { ok: boolean; text: string; error: string } {
        void lite_directory;
        const lite_configPath = liteFn$lib$core$path$join(lite_directory, "config/documentation.json");
        void lite_configPath;
        if (((lite$fileKind(lite_configPath)) !== ("file"))) {
            return { ok: false, text: "", error: "documentation navigation configuration is missing" };
        }
        const lite_cfgRead = liteFn$lib$core$file$readText(lite_configPath);
        void lite_cfgRead;
        if ((!((lite_cfgRead).ok))) {
            return { ok: false, text: "", error: (lite_cfgRead).error };
        }
        const lite_navField = liteFn$lib$util$json$findObjectField((lite_cfgRead).text, 0n, "navigation");
        void lite_navField;
        if ((!((lite_navField).found))) {
            return { ok: false, text: "", error: "documentation navigation configuration is missing" };
        }
        const lite_lines: string[] = [...([])];
        void lite_lines;
        const lite_navItems: bigint[] = [...(liteFn$lib$util$json$arrayElementOffsets((lite_cfgRead).text, (lite_navField).valuePos))];
        void lite_navItems;
        for (const lite_navPos of [...(lite_navItems)]) {
            void lite_navPos;
            const lite_labelRes = liteFn$lib$util$json$readObjectString((lite_cfgRead).text, lite_navPos, "label");
            void lite_labelRes;
            const lite_pathRes = liteFn$lib$util$json$readObjectString((lite_cfgRead).text, lite_navPos, "path");
            void lite_pathRes;
            const lite_label = (Boolean((((lite_labelRes).found) && ((lite_labelRes).ok))) ? (lite_labelRes).value : "");
            void lite_label;
            const lite_navPath = (Boolean((((lite_pathRes).found) && ((lite_pathRes).ok))) ? (lite_pathRes).value : "");
            void lite_navPath;
            lite_lines.push(((((lite_label) + (": "))) + (lite_navPath)));
        }
        lite_lines.push("Search: lite docs QUERY | --json [QUERY] | --check");
        return { ok: true, text: liteFn$lib$core$text$joinTexts([...(lite_lines)], "\n"), error: "" };
    }
    void liteFn$lib$util$docs$navigationSummary;
    function liteFn$lib$util$docs$docMatchesQuery(lite_relPath: string, lite_title: string, lite_headings: string[], lite_queryLower: string): boolean {
        void lite_relPath;
        void lite_title;
        void lite_headings;
        void lite_queryLower;
        if (((lite_queryLower) === (""))) {
            return true;
        }
        if (liteFn$lib$core$text$containsText(liteFn$lib$core$text$toLowerAscii(lite_relPath), lite_queryLower)) {
            return true;
        }
        if (liteFn$lib$core$text$containsText(liteFn$lib$core$text$toLowerAscii(lite_title), lite_queryLower)) {
            return true;
        }
        for (const lite_heading of [...(lite_headings)]) {
            void lite_heading;
            if (liteFn$lib$core$text$containsText(liteFn$lib$core$text$toLowerAscii(lite_heading), lite_queryLower)) {
                return true;
            }
        }
        return false;
    }
    void liteFn$lib$util$docs$docMatchesQuery;
    function liteFn$lib$util$docs$searchDocsText(lite_directory: string, lite_query: string): { count: bigint; text: string } {
        void lite_directory;
        void lite_query;
        const lite_queryLower = liteFn$lib$core$text$toLowerAscii(lite_query);
        void lite_queryLower;
        const lite_lines: string[] = [...([])];
        void lite_lines;
        let lite_count = 0n;
        void lite_count;
        const lite_files: string[] = [...(liteFn$lib$util$docs$listDocFiles(lite_directory))];
        void lite_files;
        for (const lite_fullFile of [...(lite_files)]) {
            void lite_fullFile;
            const lite_relPath = liteFn$lib$core$path$relative(lite_directory, lite_fullFile);
            void lite_relPath;
            const lite_readRes = liteFn$lib$core$file$readText(lite_fullFile);
            void lite_readRes;
            const lite_docText = (Boolean((lite_readRes).ok) ? (lite_readRes).text : "");
            void lite_docText;
            const lite_headings: string[] = [...(liteFn$lib$util$markdown$extractHeadings(liteFn$lib$util$markdown$stripCodeBlocks(lite_docText)))];
            void lite_headings;
            const lite_title = (Boolean(((liteFn$lib$core$list$listCountText([...(lite_headings)])) > (0n))) ? lite$listAt((lite_headings), 0n, 12783) : liteFn$lib$core$path$baseName(lite_fullFile));
            void lite_title;
            if (liteFn$lib$util$docs$docMatchesQuery(lite_relPath, lite_title, [...(lite_headings)], lite_queryLower)) {
                lite_lines.push(((((lite_title) + ("\n  "))) + (lite_relPath)));
                lite_count = lite$addInt(lite_count, 1n, 12979);
            }
        }
        return { count: lite_count, text: liteFn$lib$core$text$joinTexts([...(lite_lines)], "\n") };
    }
    void liteFn$lib$util$docs$searchDocsText;
    function liteFn$lib$util$docs$docsJson(lite_directory: string, lite_query: string): string {
        void lite_directory;
        void lite_query;
        const lite_queryLower = liteFn$lib$core$text$toLowerAscii(lite_query);
        void lite_queryLower;
        const lite_entries: string[] = [...([])];
        void lite_entries;
        const lite_files: string[] = [...(liteFn$lib$util$docs$listDocFiles(lite_directory))];
        void lite_files;
        for (const lite_fullFile of [...(lite_files)]) {
            void lite_fullFile;
            const lite_relPath = liteFn$lib$core$path$relative(lite_directory, lite_fullFile);
            void lite_relPath;
            const lite_readRes = liteFn$lib$core$file$readText(lite_fullFile);
            void lite_readRes;
            const lite_docText = (Boolean((lite_readRes).ok) ? (lite_readRes).text : "");
            void lite_docText;
            const lite_headings: string[] = [...(liteFn$lib$util$markdown$extractHeadings(liteFn$lib$util$markdown$stripCodeBlocks(lite_docText)))];
            void lite_headings;
            const lite_title = (Boolean(((liteFn$lib$core$list$listCountText([...(lite_headings)])) > (0n))) ? lite$listAt((lite_headings), 0n, 13675) : liteFn$lib$core$path$baseName(lite_fullFile));
            void lite_title;
            if (liteFn$lib$util$docs$docMatchesQuery(lite_relPath, lite_title, [...(lite_headings)], lite_queryLower)) {
                const lite_hCount = liteFn$lib$core$list$listCountText([...(lite_headings)]);
                void lite_hCount;
                let lite_headingsJson = "[]";
                void lite_headingsJson;
                if (((lite_hCount) > (0n))) {
                    const lite_hLines: string[] = [...([])];
                    void lite_hLines;
                    for (const lite_h of [...(lite_headings)]) {
                        void lite_h;
                        lite_hLines.push((("      ") + (liteFn$lib$util$json$quoteString(lite_h))));
                    }
                    lite_headingsJson = (((("[\n") + (liteFn$lib$core$text$joinTexts([...(lite_hLines)], ",\n")))) + ("\n    ]"));
                }
                const lite_entry = (((((((((((("  {\n    \"path\": ") + (liteFn$lib$util$json$quoteString(lite_relPath)))) + (",\n    \"title\": "))) + (liteFn$lib$util$json$quoteString(lite_title)))) + (",\n    \"headings\": "))) + (lite_headingsJson))) + ("\n  }"));
                void lite_entry;
                lite_entries.push(lite_entry);
            }
        }
        if (((liteFn$lib$core$list$listCountText([...(lite_entries)])) === (0n))) {
            return "[]";
        }
        return (((("[\n") + (liteFn$lib$core$text$joinTexts([...(lite_entries)], ",\n")))) + ("\n]"));
    }
    void liteFn$lib$util$docs$docsJson;
    function liteFn$lib$util$project$findRepoRootFrom(lite_startPath: string): string {
        void lite_startPath;
        if (((lite_startPath) === (""))) {
            return "";
        }
        let lite_dir = liteFn$lib$core$path$normalize(lite_startPath);
        void lite_dir;
        if (((lite$fileKind(lite_dir)) !== ("dir"))) {
            lite_dir = liteFn$lib$core$path$parentDir(lite_dir);
        }
        let lite_steps = 0n;
        void lite_steps;
        while (((lite_steps) < (16n))) {
            const lite_versionsPath = liteFn$lib$core$path$resolve(lite_dir, "config/versions.json");
            void lite_versionsPath;
            if (((lite$fileKind(lite_versionsPath)) === ("file"))) {
                return lite_dir;
            }
            const lite_next = liteFn$lib$core$path$parentDir(lite_dir);
            void lite_next;
            if (((lite_next) === (lite_dir))) {
                break;
            }
            lite_dir = lite_next;
            lite_steps = lite$addInt(lite_steps, 1n, 754);
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
        const lite_versionsPath = liteFn$lib$core$path$resolve(lite_root, "config/versions.json");
        void lite_versionsPath;
        const lite_readRes = liteFn$lib$core$file$readText(lite_versionsPath);
        void lite_readRes;
        if ((!((lite_readRes).ok))) {
            return "unassigned";
        }
        const lite_found = liteFn$lib$util$json$readObjectString((lite_readRes).text, 0n, lite_component);
        void lite_found;
        if ((((!((lite_found).found))) || ((!((lite_found).ok))))) {
            return "unassigned";
        }
        return (lite_found).value;
    }
    void liteFn$lib$util$project$readComponentVersion;
    function liteFn$lib$util$project$handleVersionFlag(lite_args: string[], lite_component: string, lite_command: string): void {
        void lite_args;
        void lite_component;
        void lite_command;
        const lite_argCount = liteFn$lib$core$list$listCountText([...(lite_args)]);
        void lite_argCount;
        if (((((lite_argCount) > (0n))) && (((lite$listAt((lite_args), 0n, 1866)) === ("--version"))))) {
            if (((lite_argCount) !== (1n))) {
                lite$reportError((((("Usage: lite ") + (lite_command))) + (" --version")));
                lite$exit(2n);
            }
            lite$emit((((((("lite ") + (lite_command))) + (" "))) + (liteFn$lib$util$project$readComponentVersion(lite_component))) + "\n");
            lite$exit(0n);
        }
    }
    void liteFn$lib$util$project$handleVersionFlag;
    function liteFn_splitNonEmptyLines(lite_raw: string): string[] {
        void lite_raw;
        const lite_lines: string[] = [...([])];
        void lite_lines;
        const lite_size = lite$textLength(lite_raw);
        void lite_size;
        let lite_pos = 0n;
        void lite_pos;
        while (((lite_pos) <= (lite_size))) {
            const lite_nl = liteFn$lib$core$text$indexOfText(lite_raw, "\n", lite_pos);
            void lite_nl;
            const lite_end = (Boolean(((lite_nl) < (0n))) ? lite_size : lite_nl);
            void lite_end;
            const lite_trimmed = liteFn$lib$core$text$trim(lite$textSlice(lite_raw, lite_pos, lite_end, 724));
            void lite_trimmed;
            if (((lite_trimmed) !== (""))) {
                lite_lines.push(lite_trimmed);
            }
            if (((lite_nl) < (0n))) {
                break;
            }
            lite_pos = lite$addInt(lite_nl, 1n, 883);
        }
        return [...(lite_lines)];
    }
    void liteFn_splitNonEmptyLines;
    function liteFn_renderSelectedJson(lite_rootDir: string, lite_targets: string[]): string {
        void lite_rootDir;
        void lite_targets;
        const lite_entries: string[] = [...([])];
        void lite_entries;
        for (const lite_rel of [...(lite_targets)]) {
            void lite_rel;
            const lite_fullFile = liteFn$lib$core$path$resolve(lite_rootDir, lite_rel);
            void lite_fullFile;
            const lite_readRes = liteFn$lib$core$file$readText(lite_fullFile);
            void lite_readRes;
            if ((!((lite_readRes).ok))) {
                lite$reportError(((((lite_rel) + (": "))) + ((lite_readRes).error)));
                return lite$exit(1n);
            }
            const lite_relPath = liteFn$lib$core$path$relative(lite_rootDir, lite_fullFile);
            void lite_relPath;
            lite_entries.push(liteFn$lib$util$markdown__html$renderMarkdownJson((lite_readRes).text, lite_relPath));
        }
        if (((liteFn$lib$core$list$listCountText([...(lite_entries)])) === (0n))) {
            return "[]";
        }
        return (((("[\n  ") + (liteFn$lib$core$text$joinTexts([...(lite_entries)], ",\n  ")))) + ("\n]"));
    }
    void liteFn_renderSelectedJson;
    function liteFn_run(lite_args: string[]): void {
        void lite_args;
        liteFn$lib$util$project$handleVersionFlag([...(lite_args)], "docs", "docs");
        const lite_envRoot = lite$processEnvGet("LITE_DOCS_ROOT");
        void lite_envRoot;
        const lite_rootDir = (Boolean((((lite_envRoot).found) && ((((lite_envRoot).value) !== (""))))) ? (lite_envRoot).value : liteFn$lib$util$project$findRepoRoot());
        void lite_rootDir;
        if (((((liteFn$lib$core$list$listCountText([...(lite_args)])) === (1n))) && (liteFn$lib$util$cli$startsWith([...(lite_args)], "--check")))) {
            const lite_failures: string[] = [...(liteFn$lib$util$docs$checkDocuments(lite_rootDir))];
            void lite_failures;
            if (((liteFn$lib$core$list$listCountText([...(lite_failures)])) > (0n))) {
                lite$reportError(liteFn$lib$core$text$joinTexts([...(lite_failures)], "\n"));
                lite$exit(1n);
            }
            lite$emit("Documentation links, fragments and fences passed." + "\n");
            lite$exit(0n);
        }
        if (((((liteFn$lib$core$list$listCountText([...(lite_args)])) === (1n))) && (liteFn$lib$util$cli$startsWith([...(lite_args)], "--modules-json")))) {
            lite$emit(liteFn$lib$util$docgen$extractAllModulesJson(lite_rootDir) + "\n");
            lite$exit(0n);
        }
        if (liteFn$lib$util$cli$startsWith([...(lite_args)], "--render-json")) {
            const lite_restTargets: string[] = [...(liteFn$lib$util$cli$rest([...(lite_args)], 1n))];
            void lite_restTargets;
            if (((liteFn$lib$core$list$listCountText([...(lite_restTargets)])) > (0n))) {
                lite$emit(liteFn_renderSelectedJson(lite_rootDir, [...(lite_restTargets)]) + "\n");
                lite$exit(0n);
            }
            const lite_stdinPaths: string[] = [...(liteFn_splitNonEmptyLines(lite$inputAll("", "tools/src/docs.lts:75:42: InputFault: ")))];
            void lite_stdinPaths;
            if (((liteFn$lib$core$list$listCountText([...(lite_stdinPaths)])) > (0n))) {
                lite$emit(liteFn_renderSelectedJson(lite_rootDir, [...(lite_stdinPaths)]) + "\n");
                lite$exit(0n);
            }
            const lite_allDocFiles: string[] = [...(liteFn$lib$util$docs$listDocFiles(lite_rootDir))];
            void lite_allDocFiles;
            const lite_relDocFiles: string[] = [...([])];
            void lite_relDocFiles;
            for (const lite_fullDoc of [...(lite_allDocFiles)]) {
                void lite_fullDoc;
                lite_relDocFiles.push(liteFn$lib$core$path$relative(lite_rootDir, lite_fullDoc));
            }
            lite$emit(liteFn_renderSelectedJson(lite_rootDir, [...(lite_relDocFiles)]) + "\n");
            lite$exit(0n);
        }
        const lite_isJson = liteFn$lib$util$cli$startsWith([...(lite_args)], "--json");
        void lite_isJson;
        const lite_query = liteFn$lib$core$text$joinTexts([...(liteFn$lib$util$cli$dropIf([...(lite_args)], "--json"))], " ");
        void lite_query;
        if (lite_isJson) {
            lite$emit(liteFn$lib$util$docs$docsJson(lite_rootDir, lite_query) + "\n");
            lite$exit(0n);
        }
        if (((lite_query) === (""))) {
            const lite_nav = liteFn$lib$util$docs$navigationSummary(lite_rootDir);
            void lite_nav;
            if ((!((lite_nav).ok))) {
                lite$reportError((lite_nav).error);
                lite$exit(1n);
            }
            lite$emit((lite_nav).text + "\n");
            lite$exit(0n);
        }
        const lite_searched = liteFn$lib$util$docs$searchDocsText(lite_rootDir, lite_query);
        void lite_searched;
        if ((((lite_searched).count) === (0n))) {
            lite$reportError((("no documentation matches: ") + (liteFn$lib$core$text$toLowerAscii(lite_query))));
            lite$exit(1n);
        }
        lite$emit((lite_searched).text + "\n");
    }
    void liteFn_run;
    liteFn_run([...(lite$inputArgs())]);
    return lite$out;
}

if ((import.meta as { readonly main?: boolean }).main === true) {
    main((text: string): void => {
        process.getBuiltinModule("node:fs").writeSync(1, text);
    });
}
