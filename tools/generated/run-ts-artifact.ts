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
    getBuiltinModule(name: "node:path"): { join(...paths: string[]): string };
    getBuiltinModule(name: "node:os"): { tmpdir(): string };
    getBuiltinModule(name: "node:child_process"): {
        spawnSync(command: string, args: readonly string[], options: { cwd?: string; env: Record<string, string | undefined>; input: Uint8Array; stdio: readonly ["pipe", "pipe", "pipe"]; timeout?: number; maxBuffer: number }): { status: number | null; signal: string | null; stdout: Uint8Array | null; stderr: Uint8Array | null; error?: Error };
    };
};
declare const TextDecoder: { new (label: string, options?: { fatal?: boolean }): { decode(input?: Uint8Array, options?: { stream?: boolean }): string } };

function lite$inputArgs(): string[] {
    return process.argv.slice(2);
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
function lite$fromBytes(bytes: Uint8Array): bigint[] {
    const out: bigint[] = new Array<bigint>(bytes.length);
    for (let i = 0; i < bytes.length; i += 1) { out[i] = BigInt(bytes[i] ?? 0); }
    return out;
}
function lite$toBytes(bytes: readonly bigint[]): Uint8Array {
    const out = new Uint8Array(bytes.length);
    for (let i = 0; i < bytes.length; i += 1) {
        const byte = bytes[i];
        if (byte === undefined || byte < 0n || byte > 255n) {
            throw new Error("byte value outside 0..255: " + String(byte));
        }
        out[i] = Number(byte);
    }
    return out;
}
function lite$fileKind(path: string): string {
    try {
        const st = process.getBuiltinModule("node:fs").statSync(path);
        if (st.isFile()) return "file";
        if (st.isDirectory()) return "dir";
        return "other";
    } catch { return "missing"; }
}
function lite$fileMakeDir(path: string): { ok: boolean; error: string } {
    try { process.getBuiltinModule("node:fs").mkdirSync(path, { recursive: true }); return { ok: true, error: "" }; }
    catch (error) { return { ok: false, error: lite$errMsg(error) }; }
}
function lite$fileRemove(path: string): { ok: boolean; error: string } {
    try { process.getBuiltinModule("node:fs").rmSync(path, { recursive: true, force: true }); return { ok: true, error: "" }; }
    catch (error) { return { ok: false, error: lite$errMsg(error) }; }
}
function lite$fileCopy(fromPath: string, toPath: string): { ok: boolean; error: string } {
    try { process.getBuiltinModule("node:fs").cpSync(fromPath, toPath, { recursive: true, force: true, verbatimSymlinks: true }); return { ok: true, error: "" }; }
    catch (error) { return { ok: false, error: lite$errMsg(error) }; }
}
function lite$fileMakeTempDir(prefix: string): { ok: boolean; path: string; error: string } {
    try {
        const joined = process.getBuiltinModule("node:path").join(process.getBuiltinModule("node:os").tmpdir(), prefix);
        return { ok: true, path: process.getBuiltinModule("node:fs").mkdtempSync(joined), error: "" };
    } catch (error) { return { ok: false, path: "", error: lite$errMsg(error) }; }
}
function lite$fileReadBytes(path: string): bigint[] {
    try { return lite$fromBytes(process.getBuiltinModule("node:fs").readFileSync(path)); }
    catch (error) { lite$reportError(lite$errMsg(error)); return lite$exit(2n); }
}
function lite$fileReadText(path: string): { ok: boolean; text: string; error: string } {
    try {
        const raw = process.getBuiltinModule("node:fs").readFileSync(path);
        return { ok: true, text: new TextDecoder("utf-8", { fatal: true }).decode(raw), error: "" };
    } catch (error) { return { ok: false, text: "", error: lite$errMsg(error) }; }
}
function lite$fileWriteText(path: string, text: string): { ok: boolean; error: string } {
    try { process.getBuiltinModule("node:fs").writeFileSync(path, text, "utf8"); return { ok: true, error: "" }; }
    catch (error) { return { ok: false, error: lite$errMsg(error) }; }
}

function lite$processCwd(): string { return process.cwd(); }
function lite$processExecPath(): string { return process.execPath; }
function lite$processEntryPath(): string { return process.argv[1] ?? ""; }
function lite$processPlatform(): string { return process.platform; }
function lite$processArch(): string { return process.arch; }
function lite$buildEnv(envOverrides: readonly string[]): { ok: true; env: Record<string, string | undefined> } | { ok: false; error: string } {
    const env: Record<string, string | undefined> = { ...process.env };
    for (const entry of envOverrides) {
        const eq = entry.indexOf("=");
        if (eq === 0) { delete env[entry.slice(1)]; }
        else if (eq > 0) { env[entry.slice(0, eq)] = entry.slice(eq + 1); }
        else { return { ok: false, error: "invalid environment override: " + entry }; }
    }
    return { ok: true, env };
}
function lite$processRunBytes(command: string, args: string[], cwd: string, envOverrides: string[], timeoutMs: bigint, stdinBytes: readonly bigint[], stdoutPath: string, stderrPath: string): { status: bigint; error: string } {
    const built = lite$buildEnv(envOverrides);
    if (!built.ok) return { status: -1n, error: built.error };
    const fs = process.getBuiltinModule("node:fs");
    let input: Uint8Array;
    try { input = lite$toBytes(stdinBytes); }
    catch (error) { return { status: -1n, error: lite$errMsg(error) }; }
    const opts: { cwd?: string; env: Record<string, string | undefined>; input: Uint8Array; stdio: readonly ["pipe", "pipe", "pipe"]; timeout?: number; maxBuffer: number } = {
        env: built.env, input, stdio: ["pipe", "pipe", "pipe"], maxBuffer: 128 * 1024 * 1024,
    };
    if (cwd !== "") opts.cwd = cwd;
    if (timeoutMs > 0n) opts.timeout = Number(timeoutMs);
    const res = process.getBuiltinModule("node:child_process").spawnSync(command, args, opts);
    try {
        if (stdoutPath !== "") fs.writeFileSync(stdoutPath, res.stdout ?? new Uint8Array(0));
        if (stderrPath !== "") fs.writeFileSync(stderrPath, res.stderr ?? new Uint8Array(0));
    } catch (error) { return { status: -1n, error: lite$errMsg(error) }; }
    if (res.error !== undefined) return { status: -1n, error: lite$errMsg(res.error) };
    if (res.signal !== null) return { status: -1n, error: "terminated by signal " + res.signal };
    return { status: BigInt(res.status ?? 1), error: "" };
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

const lite$intLines: readonly number[] = [0, 130, 131, 155, 181, 212, 242, 270, 298, 326, 352, 380, 414, 444, 445, 497, 529, 559, 592, 612, 628, 649, 677, 722, 749, 816, 830, 857, 867, 886, 892, 900, 903, 904, 945, 981, 1001, 1070, 1090, 1096, 1097, 1145, 1200, 1250, 1303, 1353, 1404, 1454, 1455, 1561, 1607, 1628, 1634, 1660, 1704, 1725, 1731, 1757, 1796, 1817, 1823, 1824, 1883, 1946, 2004, 2065, 2123, 2182, 2224, 2285, 2306, 2312, 2313, 2336, 2385, 2433, 2527, 2614, 2615, 2664, 2687, 2723, 2743, 2749, 2774, 2775, 2827, 2875, 2899, 2931, 2968, 2988, 2994, 3084, 3109, 3141, 3179, 3199, 3205, 3253, 3430, 3484, 3509, 3541, 3579, 3599, 3605, 3606, 3627, 3730, 3758, 3817, 3853, 3932, 4076, 4109, 4119, 4125, 4126, 4158, 4263, 4309, 4335, 4374, 4380, 4430, 4480, 4513, 4514, 4624, 4653, 4685, 4721, 4741, 4747, 4748, 4815, 4882, 4926, 4948, 4980, 5015, 5035, 5041, 5085, 5107, 5139, 5174, 5194, 5200, 5228, 5229, 5310, 5372, 5428, 5474, 5537, 5564, 5592, 5595, 5596, 5617];
const lite$intSource = "tools/src/run-ts-artifact.lts:";
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
    function liteFn$lib$core$text$indexOf(lite_source: string, lite_needle: string, lite_start: bigint): bigint {
        void lite_source;
        void lite_needle;
        void lite_start;
        return lite$textIndexOf(lite_source, lite_needle, lite_start);
    }
    void liteFn$lib$core$text$indexOf;
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
    function liteFn$lib$core$text$startsWithAt(lite_source: string, lite_position: bigint, lite_text: string): boolean {
        void lite_source;
        void lite_position;
        void lite_text;
        return lite$textStartsWithAt(lite_source, lite_position, lite_text);
    }
    void liteFn$lib$core$text$startsWithAt;
    function liteFn$lib$core$text$indexOfText(lite_source: string, lite_needle: string, lite_start: bigint): bigint {
        void lite_source;
        void lite_needle;
        void lite_start;
        return liteFn$lib$core$text$indexOf(lite_source, lite_needle, lite_start);
    }
    void liteFn$lib$core$text$indexOfText;
    function liteFn$lib$core$text$joinTexts(lite_values: string[], lite_separator: string): string {
        void lite_values;
        void lite_separator;
        return lite_values.join(lite_separator);
    }
    void liteFn$lib$core$text$joinTexts;
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
    function liteFn$lib$util$json$valueSpan(lite_source: string, lite_start: bigint): { ok: boolean; start: bigint; end: bigint; error: string } {
        void lite_source;
        void lite_start;
        const lite_valStart = liteFn$lib$util$json$skipJsonSpaces(lite_source, lite_start);
        void lite_valStart;
        const lite_skipped = liteFn$lib$util$json$skipValue(lite_source, lite_valStart);
        void lite_skipped;
        return { ok: (lite_skipped).ok, start: lite_valStart, end: (lite_skipped).next, error: (lite_skipped).error };
    }
    void liteFn$lib$util$json$valueSpan;
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
    function liteFn$lib$util$json$objectKeys(lite_source: string, lite_objectStart: bigint): string[] {
        void lite_source;
        void lite_objectStart;
        const lite_keys: string[] = [...([])];
        void lite_keys;
        const lite_size = lite$textLength(lite_source);
        void lite_size;
        let lite_pos = liteFn$lib$util$json$skipJsonSpaces(lite_source, lite_objectStart);
        void lite_pos;
        if (((((lite_pos) >= (lite_size))) || (((lite$textAt(lite_source, lite_pos, 17036)) !== ("{"))))) {
            return [...(lite_keys)];
        }
        lite_pos = liteFn$lib$util$json$skipJsonSpaces(lite_source, lite$addInt(lite_pos, 1n, 17119));
        if (((((lite_pos) < (lite_size))) && (((lite$textAt(lite_source, lite_pos, 17147)) === ("}"))))) {
            return [...(lite_keys)];
        }
        while (((lite_pos) < (lite_size))) {
            const lite_keyRes = liteFn$lib$util$json$scanStringToken(lite_source, lite_pos, true);
            void lite_keyRes;
            if ((!((lite_keyRes).ok))) {
                return [...(lite_keys)];
            }
            lite_keys.push((lite_keyRes).value);
            lite_pos = liteFn$lib$util$json$skipJsonSpaces(lite_source, (lite_keyRes).next);
            if (((((lite_pos) >= (lite_size))) || (((lite$textAt(lite_source, lite_pos, 17434)) !== (":"))))) {
                return [...(lite_keys)];
            }
            const lite_skipped = liteFn$lib$util$json$skipValue(lite_source, lite$addInt(lite_pos, 1n, 17521));
            void lite_skipped;
            if ((!((lite_skipped).ok))) {
                return [...(lite_keys)];
            }
            lite_pos = liteFn$lib$util$json$skipJsonSpaces(lite_source, (lite_skipped).next);
            if (((((lite_pos) < (lite_size))) && (((lite$textAt(lite_source, lite_pos, 17648)) === (","))))) {
                lite_pos = liteFn$lib$util$json$skipJsonSpaces(lite_source, lite$addInt(lite_pos, 1n, 17723));
            } else {
                return [...(lite_keys)];
            }
        }
        return [...(lite_keys)];
    }
    void liteFn$lib$util$json$objectKeys;
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
    function liteFn$lib$core$file$readBytes(lite_path: string): bigint[] {
        void lite_path;
        return lite$fileReadBytes(lite_path);
    }
    void liteFn$lib$core$file$readBytes;
    function liteFn$lib$core$file$readText(lite_path: string): { ok: boolean; text: string; error: string } {
        void lite_path;
        return lite$fileReadText(lite_path);
    }
    void liteFn$lib$core$file$readText;
    function liteFn$lib$core$file$writeText(lite_path: string, lite_text: string): { ok: boolean; error: string } {
        void lite_path;
        void lite_text;
        return lite$fileWriteText(lite_path, lite_text);
    }
    void liteFn$lib$core$file$writeText;
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
    function liteFn$lib$util$cli$stripLeadingSeparator(lite_args: string[]): string[] {
        void lite_args;
        return [...(liteFn$lib$util$cli$dropIf([...(lite_args)], "--"))];
    }
    void liteFn$lib$util$cli$stripLeadingSeparator;
    function liteFn$lib$util$cli$hasOption(lite_args: string[], lite_option: string): boolean {
        void lite_args;
        void lite_option;
        for (const lite_arg of [...(lite_args)]) {
            void lite_arg;
            if (((lite_arg) === ("--"))) {
                return false;
            }
            if (((lite_arg) === (lite_option))) {
                return true;
            }
        }
        return false;
    }
    void liteFn$lib$util$cli$hasOption;
    function liteFn$lib$util$cli$withoutOptions(lite_args: string[], lite_options: string[]): string[] {
        void lite_args;
        void lite_options;
        const lite_out: string[] = [...([])];
        void lite_out;
        let lite_stop = false;
        void lite_stop;
        for (const lite_arg of [...(lite_args)]) {
            void lite_arg;
            if (lite_stop) {
                lite_out.push(lite_arg);
            } else if (((lite_arg) === ("--"))) {
                lite_stop = true;
                lite_out.push(lite_arg);
            } else if ((!(liteFn$lib$core$list$listContainsText([...(lite_options)], lite_arg)))) {
                lite_out.push(lite_arg);
            }
        }
        return [...(lite_out)];
    }
    void liteFn$lib$util$cli$withoutOptions;
    function liteFn$lib$util$cli$withoutOption(lite_args: string[], lite_option: string): string[] {
        void lite_args;
        void lite_option;
        const lite_options: string[] = [...([lite_option])];
        void lite_options;
        return [...(liteFn$lib$util$cli$withoutOptions([...(lite_args)], [...(lite_options)]))];
    }
    void liteFn$lib$util$cli$withoutOption;
    function liteFn$lib$util$cli$readOptionValue(lite_args: string[], lite_option: string): { found: boolean; valid: boolean; value: string } {
        void lite_args;
        void lite_option;
        const lite_count = liteFn$lib$core$list$listCountText([...(lite_args)]);
        void lite_count;
        let lite_found = false;
        void lite_found;
        let lite_valid = true;
        void lite_valid;
        let lite_value = "";
        void lite_value;
        let lite_i = 0n;
        void lite_i;
        while (((lite_i) < (lite_count))) {
            const lite_arg = lite$listAt((lite_args), lite_i, 3298);
            void lite_arg;
            if (((lite_arg) === ("--"))) {
                break;
            }
            if (((lite_arg) === (lite_option))) {
                if (((((lite_found) || (((lite$addInt(lite_i, 1n, 3389)) >= (lite_count))))) || (((lite$listAt((lite_args), lite$addInt(lite_i, 1n, 3412), 3410)) === ("--"))))) {
                    lite_valid = false;
                    lite_found = true;
                    lite_i = lite$addInt(lite_i, 1n, 3510);
                } else {
                    lite_found = true;
                    lite_value = lite$listAt((lite_args), lite$addInt(lite_i, 1n, 3597), 3595);
                    lite_i = lite$addInt(lite_i, 2n, 3625);
                }
            } else {
                lite_i = lite$addInt(lite_i, 1n, 3679);
            }
        }
        return { found: lite_found, valid: lite_valid, value: lite_value };
    }
    void liteFn$lib$util$cli$readOptionValue;
    function liteFn$lib$util$cli$withoutOptionValue(lite_args: string[], lite_option: string): string[] {
        void lite_args;
        void lite_option;
        const lite_out: string[] = [...([])];
        void lite_out;
        const lite_count = liteFn$lib$core$list$listCountText([...(lite_args)]);
        void lite_count;
        let lite_stop = false;
        void lite_stop;
        let lite_i = 0n;
        void lite_i;
        while (((lite_i) < (lite_count))) {
            const lite_arg = lite$listAt((lite_args), lite_i, 4096);
            void lite_arg;
            if (lite_stop) {
                lite_out.push(lite_arg);
                lite_i = lite$addInt(lite_i, 1n, 4177);
            } else if (((lite_arg) === ("--"))) {
                lite_stop = true;
                lite_out.push(lite_arg);
                lite_i = lite$addInt(lite_i, 1n, 4298);
            } else if (((lite_arg) === (lite_option))) {
                if (((((lite$addInt(lite_i, 1n, 4354)) < (lite_count))) && (((lite$listAt((lite_args), lite$addInt(lite_i, 1n, 4377), 4375)) !== ("--"))))) {
                    lite_i = lite$addInt(lite_i, 2n, 4415);
                } else {
                    lite_i = lite$addInt(lite_i, 1n, 4463);
                }
            } else {
                lite_out.push(lite_arg);
                lite_i = lite$addInt(lite_i, 1n, 4558);
            }
        }
        return [...(lite_out)];
    }
    void liteFn$lib$util$cli$withoutOptionValue;
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
    function liteFn$lib$util$cases$readFileDiagnostic(lite_filePath: string, lite_byteCount: bigint): string {
        void lite_filePath;
        void lite_byteCount;
        const lite_res = liteFn$lib$core$file$readText(lite_filePath);
        void lite_res;
        if ((lite_res).ok) {
            return (lite_res).text;
        }
        return (((("(binary output, ") + (liteFn$lib$core$int$intText(lite_byteCount)))) + (" bytes)"));
    }
    void liteFn$lib$util$cases$readFileDiagnostic;
    function liteFn$lib$util$cases$buildTsConfigText(lite_rootDir: string, lite_artifactPath: string): { ok: boolean; text: string; error: string } {
        void lite_rootDir;
        void lite_artifactPath;
        const lite_cfgPath = liteFn$lib$core$path$join(lite_rootDir, "igniter/tsconfig.json");
        void lite_cfgPath;
        const lite_cfgRes = liteFn$lib$core$file$readText(lite_cfgPath);
        void lite_cfgRes;
        if ((!((lite_cfgRes).ok))) {
            return { ok: false, text: "", error: ((((lite_cfgPath) + (": "))) + ((lite_cfgRes).error)) };
        }
        const lite_optsField = liteFn$lib$util$json$findObjectField((lite_cfgRes).text, 0n, "compilerOptions");
        void lite_optsField;
        if ((!((lite_optsField).found))) {
            return { ok: false, text: "", error: ((lite_cfgPath) + (": missing compilerOptions")) };
        }
        const lite_parts: string[] = [...([])];
        void lite_parts;
        for (const lite_key of [...(liteFn$lib$util$json$objectKeys((lite_cfgRes).text, (lite_optsField).valuePos))]) {
            void lite_key;
            if (((((((lite_key) !== ("types"))) && (((lite_key) !== ("typeRoots"))))) && (((lite_key) !== ("lib"))))) {
                const lite_valField = liteFn$lib$util$json$findObjectField((lite_cfgRes).text, (lite_optsField).valuePos, lite_key);
                void lite_valField;
                const lite_span = liteFn$lib$util$json$valueSpan((lite_cfgRes).text, (lite_valField).valuePos);
                void lite_span;
                if ((!((lite_span).ok))) {
                    return { ok: false, text: "", error: ((((lite_cfgPath) + (": invalid compilerOptions."))) + (lite_key)) };
                }
                lite_parts.push(((((liteFn$lib$util$json$quoteString(lite_key)) + (":"))) + (lite$textSlice((lite_cfgRes).text, (lite_span).start, (lite_span).end, 17731))));
            }
        }
        lite_parts.push("\"types\":[]");
        lite_parts.push("\"typeRoots\":[]");
        lite_parts.push("\"lib\":[\"ESNext\"]");
        const lite_body = (((((((("{\"compilerOptions\":{") + (liteFn$lib$core$text$joinTexts([...(lite_parts)], ",")))) + ("},\"files\":["))) + (liteFn$lib$util$json$quoteString(lite_artifactPath)))) + ("]}\n"));
        void lite_body;
        return { ok: true, text: lite_body, error: "" };
    }
    void liteFn$lib$util$cases$buildTsConfigText;
    function liteFn$lib$util$cases$checkTsArtifactFileWithStatus(lite_rootDir: string, lite_artifactPath: string, lite_workDir: string, lite_timeoutMs: bigint): { ok: boolean; status: bigint; error: string } {
        void lite_rootDir;
        void lite_artifactPath;
        void lite_workDir;
        void lite_timeoutMs;
        const lite_mkRes = lite$fileMakeDir(lite_workDir);
        void lite_mkRes;
        if ((!((lite_mkRes).ok))) {
            return { ok: false, status: (-1n), error: (lite_mkRes).error };
        }
        const lite_pkgRes = liteFn$lib$core$file$writeText(liteFn$lib$core$path$join(lite_workDir, "package.json"), "{\"type\":\"module\"}\n");
        void lite_pkgRes;
        if ((!((lite_pkgRes).ok))) {
            return { ok: false, status: (-1n), error: (lite_pkgRes).error };
        }
        const lite_localArtifact = liteFn$lib$core$path$join(lite_workDir, "artifact.ts");
        void lite_localArtifact;
        const lite_copyArt = lite$fileCopy(lite_artifactPath, lite_localArtifact);
        void lite_copyArt;
        if ((!((lite_copyArt).ok))) {
            return { ok: false, status: (-1n), error: (lite_copyArt).error };
        }
        const lite_cfgRes = liteFn$lib$util$cases$buildTsConfigText(lite_rootDir, lite_localArtifact);
        void lite_cfgRes;
        if ((!((lite_cfgRes).ok))) {
            return { ok: false, status: (-1n), error: (lite_cfgRes).error };
        }
        const lite_tsconfigPath = liteFn$lib$core$path$join(lite_workDir, "tsconfig.json");
        void lite_tsconfigPath;
        const lite_wCfg = liteFn$lib$core$file$writeText(lite_tsconfigPath, (lite_cfgRes).text);
        void lite_wCfg;
        if ((!((lite_wCfg).ok))) {
            return { ok: false, status: (-1n), error: (lite_wCfg).error };
        }
        const lite_exeName = (Boolean(((lite$processPlatform()) === ("win32"))) ? "tsc.exe" : "tsc");
        void lite_exeName;
        const lite_nativeTsc = liteFn$lib$core$path$join(lite_rootDir, (((((((((("igniter/node_modules/@typescript/typescript-") + (lite$processPlatform()))) + ("-"))) + (lite$processArch()))) + ("/lib/"))) + (lite_exeName)));
        void lite_nativeTsc;
        const lite_outPath = liteFn$lib$core$path$join(lite_workDir, "tsc.stdout");
        void lite_outPath;
        const lite_errPath = liteFn$lib$core$path$join(lite_workDir, "tsc.stderr");
        void lite_errPath;
        const lite_emptyBytes: bigint[] = [...([])];
        void lite_emptyBytes;
        const lite_emptyEnv: string[] = [...([])];
        void lite_emptyEnv;
        let lite_status = (-1n);
        void lite_status;
        let lite_procErr = "";
        void lite_procErr;
        if (((lite$fileKind(lite_nativeTsc)) === ("file"))) {
            const lite_args: string[] = [...(["-p", lite_tsconfigPath])];
            void lite_args;
            const lite_res = lite$processRunBytes(lite_nativeTsc, [...(lite_args)], lite_workDir, [...(lite_emptyEnv)], lite_timeoutMs, [...(lite_emptyBytes)], lite_outPath, lite_errPath);
            void lite_res;
            lite_status = (lite_res).status;
            lite_procErr = (lite_res).error;
        } else {
            const lite_args: string[] = [...([liteFn$lib$core$path$join(lite_rootDir, "igniter/node_modules/typescript/bin/tsc"), "-p", lite_tsconfigPath])];
            void lite_args;
            const lite_res = lite$processRunBytes(lite$processExecPath(), [...(lite_args)], lite_workDir, [...(lite_emptyEnv)], lite_timeoutMs, [...(lite_emptyBytes)], lite_outPath, lite_errPath);
            void lite_res;
            lite_status = (lite_res).status;
            lite_procErr = (lite_res).error;
        }
        if (((lite_procErr) !== (""))) {
            return { ok: false, status: lite_status, error: lite_procErr };
        }
        if (((lite_status) !== (0n))) {
            const lite_errBytes: bigint[] = [...(liteFn$lib$core$file$readBytes(lite_errPath))];
            void lite_errBytes;
            const lite_outBytes: bigint[] = [...(liteFn$lib$core$file$readBytes(lite_outPath))];
            void lite_outBytes;
            const lite_msg = (Boolean(((liteFn$lib$core$list$listCountInt([...(lite_errBytes)])) > (0n))) ? liteFn$lib$util$cases$readFileDiagnostic(lite_errPath, liteFn$lib$core$list$listCountInt([...(lite_errBytes)])) : liteFn$lib$util$cases$readFileDiagnostic(lite_outPath, liteFn$lib$core$list$listCountInt([...(lite_outBytes)])));
            void lite_msg;
            return { ok: false, status: lite_status, error: lite_msg };
        }
        return { ok: true, status: 0n, error: "" };
    }
    void liteFn$lib$util$cases$checkTsArtifactFileWithStatus;
    function liteFn_splitNonEmptyCsv(lite_raw: string): string[] {
        void lite_raw;
        const lite_out: string[] = [...([])];
        void lite_out;
        const lite_size = lite$textLength(lite_raw);
        void lite_size;
        if (((lite_size) === (0n))) {
            return [...(lite_out)];
        }
        let lite_start = 0n;
        void lite_start;
        let lite_i = 0n;
        void lite_i;
        while (((lite_i) <= (lite_size))) {
            const lite_atEnd = ((lite_i) === (lite_size));
            void lite_atEnd;
            if (((lite_atEnd) || (((lite$textAt(lite_raw, lite_i, 697)) === (","))))) {
                if (((lite_i) > (lite_start))) {
                    lite_out.push(lite$textSlice(lite_raw, lite_start, lite_i, 788));
                }
                lite_start = lite$addInt(lite_i, 1n, 852);
            }
            lite_i = lite$addInt(lite_i, 1n, 881);
        }
        return [...(lite_out)];
    }
    void liteFn_splitNonEmptyCsv;
    function liteFn_run(lite_rawArgs: string[]): void {
        void lite_rawArgs;
        const lite_root = liteFn$lib$util$project$findRepoRoot();
        void lite_root;
        if (((lite_root) === (""))) {
            lite$reportError("could not locate LiteScript repository root");
            lite$exit(1n);
        }
        const lite_args: string[] = [...(liteFn$lib$util$cli$stripLeadingSeparator([...(lite_rawArgs)]))];
        void lite_args;
        const lite_artOpt = liteFn$lib$util$cli$readOptionValue([...(lite_args)], "--artifact");
        void lite_artOpt;
        const lite_outOpt = liteFn$lib$util$cli$readOptionValue([...(lite_args)], "--out");
        void lite_outOpt;
        const lite_srcOpt = liteFn$lib$util$cli$readOptionValue([...(lite_args)], "--source");
        void lite_srcOpt;
        const lite_errOpt = liteFn$lib$util$cli$readOptionValue([...(lite_args)], "--err");
        void lite_errOpt;
        const lite_argOpt = liteFn$lib$util$cli$readOptionValue([...(lite_args)], "--args");
        void lite_argOpt;
        const lite_noCheck = liteFn$lib$util$cli$hasOption([...(lite_args)], "--no-check");
        void lite_noCheck;
        if ((((((((((!((lite_artOpt).valid))) || ((!((lite_outOpt).valid))))) || ((!((lite_srcOpt).valid))))) || ((!((lite_errOpt).valid))))) || ((!((lite_argOpt).valid))))) {
            lite$reportError("invalid option value");
            lite$exit(64n);
        }
        if ((!((lite_artOpt).found))) {
            lite$reportError("missing --artifact");
            lite$exit(64n);
        }
        if ((!((lite_outOpt).found))) {
            lite$reportError("missing --out");
            lite$exit(64n);
        }
        let lite_leftover: string[] = [...(liteFn$lib$util$cli$withoutOption([...(lite_args)], "--no-check"))];
        void lite_leftover;
        lite_leftover = [...(liteFn$lib$util$cli$withoutOptionValue([...(lite_leftover)], "--artifact"))];
        lite_leftover = [...(liteFn$lib$util$cli$withoutOptionValue([...(lite_leftover)], "--out"))];
        lite_leftover = [...(liteFn$lib$util$cli$withoutOptionValue([...(lite_leftover)], "--source"))];
        lite_leftover = [...(liteFn$lib$util$cli$withoutOptionValue([...(lite_leftover)], "--err"))];
        lite_leftover = [...(liteFn$lib$util$cli$withoutOptionValue([...(lite_leftover)], "--args"))];
        if (((liteFn$lib$core$list$listCountText([...(lite_leftover)])) > (0n))) {
            lite$reportError((("unexpected argument: ") + (lite$listAt((lite_leftover), 0n, 2280))));
            lite$exit(64n);
        }
        const lite_cwd = lite$processCwd();
        void lite_cwd;
        const lite_artifact = liteFn$lib$core$path$resolve(lite_cwd, (lite_artOpt).value);
        void lite_artifact;
        const lite_outPath = liteFn$lib$core$path$resolve(lite_cwd, (lite_outOpt).value);
        void lite_outPath;
        const lite_errPath = (Boolean((lite_errOpt).found) ? liteFn$lib$core$path$resolve(lite_cwd, (lite_errOpt).value) : ((lite_outPath) + (".err")));
        void lite_errPath;
        const lite_extraArgs: string[] = [...((Boolean((lite_argOpt).found) ? [...(liteFn_splitNonEmptyCsv((lite_argOpt).value))] : [...(lite_leftover)]))];
        void lite_extraArgs;
        const lite_tmpRes = lite$fileMakeTempDir("lite-self-host-");
        void lite_tmpRes;
        if ((!((lite_tmpRes).ok))) {
            lite$reportError((lite_tmpRes).error);
            lite$exit(1n);
        }
        const lite_work = (lite_tmpRes).path;
        void lite_work;
        const lite_artifactPath = liteFn$lib$core$path$join(lite_work, "artifact.ts");
        void lite_artifactPath;
        const lite_copyArt = lite$fileCopy(lite_artifact, lite_artifactPath);
        void lite_copyArt;
        if ((!((lite_copyArt).ok))) {
            const lite__rm = lite$fileRemove(lite_work);
            void lite__rm;
            lite$reportError((lite_copyArt).error);
            lite$exit(1n);
        }
        const lite_pkgWrite = liteFn$lib$core$file$writeText(liteFn$lib$core$path$join(lite_work, "package.json"), "{\"type\":\"module\"}\n");
        void lite_pkgWrite;
        if ((!((lite_pkgWrite).ok))) {
            const lite__rm = lite$fileRemove(lite_work);
            void lite__rm;
            lite$reportError((lite_pkgWrite).error);
            lite$exit(1n);
        }
        const lite_runnerPath = liteFn$lib$core$path$join(lite_work, "runner.ts");
        void lite_runnerPath;
        const lite_runnerCode = "import { main } from './artifact.ts';\nimport { writeSync } from 'node:fs';\nprocess.stdout.write(main((text: string): void => { writeSync(1, text); }));\n";
        void lite_runnerCode;
        const lite_runWrite = liteFn$lib$core$file$writeText(lite_runnerPath, lite_runnerCode);
        void lite_runWrite;
        if ((!((lite_runWrite).ok))) {
            const lite__rm = lite$fileRemove(lite_work);
            void lite__rm;
            lite$reportError((lite_runWrite).error);
            lite$exit(1n);
        }
        if ((!(lite_noCheck))) {
            const lite_checked = liteFn$lib$util$cases$checkTsArtifactFileWithStatus(lite_root, lite_artifactPath, liteFn$lib$core$path$join(lite_work, "tsc"), 0n);
            void lite_checked;
            if ((!((lite_checked).ok))) {
                const lite__wErr = liteFn$lib$core$file$writeText(lite_errPath, (lite_checked).error);
                void lite__wErr;
                const lite__rm = lite$fileRemove(lite_work);
                void lite__rm;
                const lite_exitStatus = (Boolean((((lite_checked).status) > (0n))) ? (lite_checked).status : 1n);
                void lite_exitStatus;
                lite$reportError((((((((("{\"phase\":\"typecheck\",\"status\":") + (liteFn$lib$core$int$intText(lite_exitStatus)))) + (",\"err\":"))) + (liteFn$lib$util$json$quoteString(lite_errPath)))) + ("}")));
                lite$exit(lite_exitStatus);
            }
        }
        const lite_emptyBytes: bigint[] = [...([])];
        void lite_emptyBytes;
        const lite_stdinBytes: bigint[] = [...((Boolean((lite_srcOpt).found) ? [...(liteFn$lib$core$file$readBytes(liteFn$lib$core$path$resolve(lite_cwd, (lite_srcOpt).value)))] : [...(lite_emptyBytes)]))];
        void lite_stdinBytes;
        const lite_cmdArgs: string[] = [...([lite_runnerPath])];
        void lite_cmdArgs;
        for (const lite_a of [...(lite_extraArgs)]) {
            void lite_a;
            lite_cmdArgs.push(lite_a);
        }
        const lite_tempOutPath = liteFn$lib$core$path$join(lite_work, "run.stdout");
        void lite_tempOutPath;
        const lite_tempErrPath = liteFn$lib$core$path$join(lite_work, "run.stderr");
        void lite_tempErrPath;
        const lite_emptyEnv: string[] = [...([])];
        void lite_emptyEnv;
        const lite_runRes = lite$processRunBytes(lite$processExecPath(), [...(lite_cmdArgs)], "", [...(lite_emptyEnv)], 0n, [...(lite_stdinBytes)], lite_tempOutPath, lite_tempErrPath);
        void lite_runRes;
        if ((((lite_runRes).error) !== (""))) {
            const lite__rm = lite$fileRemove(lite_work);
            void lite__rm;
            lite$reportError((lite_runRes).error);
            lite$exit(1n);
        }
        const lite_outBytesCount = liteFn$lib$core$list$listCountInt([...(liteFn$lib$core$file$readBytes(lite_tempOutPath))]);
        void lite_outBytesCount;
        const lite_errBytesCount = liteFn$lib$core$list$listCountInt([...(liteFn$lib$core$file$readBytes(lite_tempErrPath))]);
        void lite_errBytesCount;
        const lite_cpOut = lite$fileCopy(lite_tempOutPath, lite_outPath);
        void lite_cpOut;
        if ((!((lite_cpOut).ok))) {
            const lite__rm = lite$fileRemove(lite_work);
            void lite__rm;
            lite$reportError((lite_cpOut).error);
            lite$exit(1n);
        }
        const lite_cpErr = lite$fileCopy(lite_tempErrPath, lite_errPath);
        void lite_cpErr;
        if ((!((lite_cpErr).ok))) {
            const lite__rm = lite$fileRemove(lite_work);
            void lite__rm;
            lite$reportError((lite_cpErr).error);
            lite$exit(1n);
        }
        const lite__rm = lite$fileRemove(lite_work);
        void lite__rm;
        const lite_summary = (((((((((((((((((((("{\"phase\":\"run\",\"status\":") + (liteFn$lib$core$int$intText((lite_runRes).status)))) + (",\"signal\":null,\"out\":"))) + (liteFn$lib$util$json$quoteString(lite_outPath)))) + (",\"outBytes\":"))) + (liteFn$lib$core$int$intText(lite_outBytesCount)))) + (",\"err\":"))) + (liteFn$lib$util$json$quoteString(lite_errPath)))) + (",\"errBytes\":"))) + (liteFn$lib$core$int$intText(lite_errBytesCount)))) + ("}"));
        void lite_summary;
        lite$reportError(lite_summary);
        lite$exit((lite_runRes).status);
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
