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
    getBuiltinModule(name: "node:child_process"): {
        spawnSync(command: string, args: readonly string[], options: { cwd?: string; env: Record<string, string | undefined>; encoding?: "utf8"; input?: string; stdio: "inherit" | readonly ["pipe", "pipe", "pipe"]; maxBuffer: number }): { status: number | null; signal: string | null; stdout: string | null; stderr: string | null; error?: Error };
    };
    getBuiltinModule(name: "node:crypto"): {
        createHash(algorithm: string): { update(data: Uint8Array): { digest(encoding: "hex"): string }; update(data: string, inputEncoding: "utf8"): { digest(encoding: "hex"): string } };
        createHmac(algorithm: string, key: Uint8Array): { update(data: Uint8Array): { digest(encoding: "hex"): string } };
        randomBytes(size: number): Uint8Array;
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
function lite$processExecPath(): string { return process.execPath; }
function lite$processEntryPath(): string { return process.argv[1] ?? ""; }
function lite$processPlatform(): string { return process.platform; }
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
function lite$processRun(command: string, args: string[], cwd: string, envOverrides: string[], capture: boolean, stdinText: string): { status: bigint; stdout: string; stderr: string; error: string } {
    const built = lite$buildEnv(envOverrides);
    if (!built.ok) return { status: -1n, stdout: "", stderr: "", error: built.error };
    const opts: { cwd?: string; env: Record<string, string | undefined>; encoding?: "utf8"; input?: string; stdio: "inherit" | readonly ["pipe", "pipe", "pipe"]; maxBuffer: number } = capture
        ? { env: built.env, encoding: "utf8", input: stdinText, stdio: ["pipe", "pipe", "pipe"], maxBuffer: 128 * 1024 * 1024 }
        : { env: built.env, stdio: "inherit", maxBuffer: 128 * 1024 * 1024 };
    if (cwd !== "") opts.cwd = cwd;
    const res = process.getBuiltinModule("node:child_process").spawnSync(command, args, opts);
    const stdout = res.stdout ?? "";
    const stderr = res.stderr ?? "";
    if (res.error !== undefined) return { status: -1n, stdout, stderr, error: res.error instanceof Error ? res.error.message : String(res.error) };
    if (res.signal !== null) return { status: -1n, stdout, stderr, error: "terminated by signal " + res.signal };
    return { status: BigInt(res.status ?? 1), stdout, stderr, error: "" };
}

function lite$cryptoDigestBytes(algorithm: string, bytes: readonly bigint[]): string {
    if (algorithm !== "sha256" && algorithm !== "sha512") {
        throw new Error("unsupported digest algorithm: " + algorithm);
    }
    return process.getBuiltinModule("node:crypto").createHash(algorithm).update(lite$toBytes(bytes)).digest("hex");
}
function lite$cryptoDigestText(algorithm: string, value: string): string {
    if (algorithm !== "sha256" && algorithm !== "sha512") {
        throw new Error("unsupported digest algorithm: " + algorithm);
    }
    return process.getBuiltinModule("node:crypto").createHash(algorithm).update(value, "utf8").digest("hex");
}
function lite$cryptoDigestFile(algorithm: string, path: string): { ok: boolean; hex: string; error: string } {
    if (algorithm !== "sha256" && algorithm !== "sha512") {
        throw new Error("unsupported digest algorithm: " + algorithm);
    }
    try {
        const bytes = process.getBuiltinModule("node:fs").readFileSync(path);
        return { ok: true, hex: process.getBuiltinModule("node:crypto").createHash(algorithm).update(bytes).digest("hex"), error: "" };
    } catch (error) {
        return { ok: false, hex: "", error: lite$errMsg(error) };
    }
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

const lite$intLines: readonly number[] = [0, 81, 82, 106, 132, 163, 191, 219, 247, 273, 301, 333, 367, 401, 402, 444, 471, 487, 489, 490, 555, 615, 674, 707, 783, 809, 840, 846, 872, 976, 982, 1009, 1040, 1046, 1048, 1049, 1087, 1144, 1145, 1193, 1238, 1281, 1332, 1338, 1339, 1378, 1401, 1454, 1460, 1461, 1528, 1571, 1598, 1668, 1674, 1725, 1753, 1824, 1830, 1831, 1884, 1929, 1984, 1990, 1991, 2053, 2138, 2168, 2243, 2249, 2323, 2372, 2440, 2446, 2490, 2550, 2556, 2557, 2642, 2667, 2742, 2748, 2815, 2897, 2952, 2958, 3027, 3056, 3119, 3125, 3206, 3238, 3301, 3307, 3397, 3488, 3551, 3557, 3558, 3611, 3636, 3672, 3678, 3679, 3701, 3758, 3826, 3832, 3833, 3881, 3884, 3885, 3906];
const lite$intSource = "tools/src/check.lts:";
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
    function liteFn$lib$core$text$skipSpaces(lite_source: string, lite_start: bigint): bigint {
        void lite_source;
        void lite_start;
        return lite$textSkipWhile(lite_source, lite_start, true);
    }
    void liteFn$lib$core$text$skipSpaces;
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
    function liteFn$lib$util$json$readObjectBool(lite_source: string, lite_objectStart: bigint, lite_key: string): { found: boolean; ok: boolean; value: boolean } {
        void lite_source;
        void lite_objectStart;
        void lite_key;
        const lite_field = liteFn$lib$util$json$findObjectField(lite_source, lite_objectStart, lite_key);
        void lite_field;
        if ((!((lite_field).found))) {
            return { found: false, ok: false, value: false };
        }
        const lite_pos = liteFn$lib$util$json$skipJsonSpaces(lite_source, (lite_field).valuePos);
        void lite_pos;
        if (liteFn$lib$core$text$startsWithAt(lite_source, lite_pos, "true")) {
            return { found: true, ok: true, value: true };
        }
        if (liteFn$lib$core$text$startsWithAt(lite_source, lite_pos, "false")) {
            return { found: true, ok: true, value: false };
        }
        return { found: true, ok: false, value: false };
    }
    void liteFn$lib$util$json$readObjectBool;
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
    const lite$m$lib$core$file$FILE_KIND_MISSING = "missing";
    void lite$m$lib$core$file$FILE_KIND_MISSING;
    const lite$m$lib$core$file$FILE_KIND_FILE = "file";
    void lite$m$lib$core$file$FILE_KIND_FILE;
    const lite$m$lib$core$file$FILE_KIND_DIR = "dir";
    void lite$m$lib$core$file$FILE_KIND_DIR;
    function liteFn$lib$core$file$readText(lite_path: string): { ok: boolean; text: string; error: string } {
        void lite_path;
        return lite$fileReadText(lite_path);
    }
    void liteFn$lib$core$file$readText;
    function liteFn$lib$core$crypto$sha256Bytes(lite_bytes: bigint[]): string {
        void lite_bytes;
        return lite$cryptoDigestBytes("sha256", lite_bytes);
    }
    void liteFn$lib$core$crypto$sha256Bytes;
    function liteFn$lib$core$crypto$sha256Text(lite_value: string): string {
        void lite_value;
        return lite$cryptoDigestText("sha256", lite_value);
    }
    void liteFn$lib$core$crypto$sha256Text;
    function liteFn$lib$core$crypto$sha256File(lite_path: string): { ok: boolean; hex: string; error: string } {
        void lite_path;
        return lite$cryptoDigestFile("sha256", lite_path);
    }
    void liteFn$lib$core$crypto$sha256File;
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
        let lite_targetIdx = lite$subtractInt(liteFn$lib$core$list$listCountText([...(lite_targets)]), 1n, 8990);
        void lite_targetIdx;
        while (((lite_targetIdx) >= (0n))) {
            lite_stack.push(liteFn$lib$core$path$resolve(lite_baseDir, lite$listAt((lite_targets), lite_targetIdx, 9079)));
            lite_stackCount = lite$addInt(lite_stackCount, 1n, 9125);
            lite_targetIdx = lite$subtractInt(lite_targetIdx, 1n, 9160);
        }
        while (((lite_stackCount) > (0n))) {
            const lite_resolved = lite$listPopBack(lite_stack, 9218);
            void lite_resolved;
            lite_stackCount = lite$subtractInt(lite_stackCount, 1n, 9275);
            const lite_entryKind = lite$fileKind(lite_resolved);
            void lite_entryKind;
            if (((lite_entryKind) === (lite$m$lib$core$file$FILE_KIND_MISSING))) {
                lite$reportError((((("ENOENT: no such file or directory, stat '") + (lite_resolved))) + ("'")));
                return lite$exit(1n);
            }
            if (((lite_entryKind) === (lite$m$lib$core$file$FILE_KIND_DIR))) {
                const lite_entries: string[] = [...(lite$fileListDir(lite_resolved))];
                void lite_entries;
                let lite_entryIdx = lite$subtractInt(liteFn$lib$core$list$listCountText([...(lite_entries)]), 1n, 9641);
                void lite_entryIdx;
                while (((lite_entryIdx) >= (0n))) {
                    const lite_entry = lite$listAt((lite_entries), lite_entryIdx, 9712);
                    void lite_entry;
                    const lite_isDot = ((lite_skipDotEntries) && (liteFn$lib$core$text$startsWithAt(lite_entry, 0n, ".")));
                    void lite_isDot;
                    if ((((!(lite_isDot))) && ((!(liteFn$lib$core$list$listContainsText([...(lite_ignoredNames)], lite_entry)))))) {
                        lite_stack.push(liteFn$lib$core$path$resolve(lite_resolved, lite_entry));
                        lite_stackCount = lite$addInt(lite_stackCount, 1n, 9999);
                    }
                    lite_entryIdx = lite$subtractInt(lite_entryIdx, 1n, 10058);
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
                            if (((lite_destKind) === (lite$m$lib$core$file$FILE_KIND_MISSING))) {
                                lite_failures.push(((((lite_relPath) + (": missing link "))) + (lite_target)));
                            } else if (((((((lite_fragment) !== (""))) && (((liteFn$lib$core$path$extName(lite_destination)) === (".md"))))) && (((lite_destKind) === (lite$m$lib$core$file$FILE_KIND_FILE))))) {
                                const lite_cacheIdx = liteFn$lib$core$list$listIndexOfText([...(lite_cachePaths)], lite_destination);
                                void lite_cacheIdx;
                                let lite_packed = "";
                                void lite_packed;
                                if (((lite_cacheIdx) >= (0n))) {
                                    lite_packed = lite$listAt((lite_cachePacked), lite_cacheIdx, 6166);
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
        if (((lite$fileKind(lite_configPath)) === (lite$m$lib$core$file$FILE_KIND_FILE))) {
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
                    if (((((lite_navLabel) === (""))) || (((lite$fileKind(liteFn$lib$core$path$resolve(lite_directory, lite_navPath))) === (lite$m$lib$core$file$FILE_KIND_MISSING))))) {
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
                    if (((((lite$fileKind(lite_srcFull)) === (lite$m$lib$core$file$FILE_KIND_MISSING))) || (((lite$fileKind(lite_docFull)) === (lite$m$lib$core$file$FILE_KIND_MISSING))))) {
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
                            if (((((((lite_fenceIdx) < (0n))) || (((lite_fenceIdx) >= (liteFn$lib$core$list$listCountText([...(lite_fences)])))))) || (((lite$listAt((lite_fences), lite_fenceIdx, 10098)) !== (lite_expected))))) {
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
    function liteFn$lib$util$project$findRepoRootFrom(lite_startPath: string): string {
        void lite_startPath;
        if (((lite_startPath) === (""))) {
            return "";
        }
        let lite_dir = liteFn$lib$core$path$normalize(lite_startPath);
        void lite_dir;
        if (((lite$fileKind(lite_dir)) !== (lite$m$lib$core$file$FILE_KIND_DIR))) {
            lite_dir = liteFn$lib$core$path$parentDir(lite_dir);
        }
        let lite_steps = 0n;
        void lite_steps;
        while (((lite_steps) < (16n))) {
            const lite_versionsPath = liteFn$lib$core$path$resolve(lite_dir, "config/versions.json");
            void lite_versionsPath;
            if (((lite$fileKind(lite_versionsPath)) === (lite$m$lib$core$file$FILE_KIND_FILE))) {
                return lite_dir;
            }
            const lite_next = liteFn$lib$core$path$parentDir(lite_dir);
            void lite_next;
            if (((lite_next) === (lite_dir))) {
                break;
            }
            lite_dir = lite_next;
            lite_steps = lite$addInt(lite_steps, 1n, 776);
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
        if (((((lite_argCount) > (0n))) && (((lite$listAt((lite_args), 0n, 1888)) === ("--version"))))) {
            if (((lite_argCount) !== (1n))) {
                lite$reportError((((("Usage: lite ") + (lite_command))) + (" --version")));
                lite$exit(2n);
            }
            lite$emit((((((("lite ") + (lite_command))) + (" "))) + (liteFn$lib$util$project$readComponentVersion(lite_component))) + "\n");
            lite$exit(0n);
        }
    }
    void liteFn$lib$util$project$handleVersionFlag;
    function liteFn$lib$util$streams$isHex64(lite_value: string): boolean {
        void lite_value;
        if (((lite$textLength(lite_value)) !== (64n))) {
            return false;
        }
        let lite_i = 0n;
        void lite_i;
        while (((lite_i) < (64n))) {
            const lite_ch = lite$textAt(lite_value, lite_i, 439);
            void lite_ch;
            const lite_ok = ((((((((((((liteFn$lib$core$text$isDigit(lite_ch)) || (((lite_ch) === ("a"))))) || (((lite_ch) === ("b"))))) || (((lite_ch) === ("c"))))) || (((lite_ch) === ("d"))))) || (((lite_ch) === ("e"))))) || (((lite_ch) === ("f"))));
            void lite_ok;
            if ((!(lite_ok))) {
                return false;
            }
            lite_i = lite$addInt(lite_i, 1n, 618);
        }
        return true;
    }
    void liteFn$lib$util$streams$isHex64;
    function liteFn$lib$util$streams$isSiblingFileName(lite_name: string): boolean {
        void lite_name;
        const lite_size = lite$textLength(lite_name);
        void lite_size;
        if (((lite_size) === (0n))) {
            return false;
        }
        const lite_first = lite$textAt(lite_name, 0n, 766);
        void lite_first;
        if ((!((((liteFn$lib$core$text$isAsciiLetter(lite_first)) || (liteFn$lib$core$text$isDigit(lite_first))))))) {
            return false;
        }
        let lite_i = 1n;
        void lite_i;
        while (((lite_i) < (lite_size))) {
            const lite_ch = lite$textAt(lite_name, lite_i, 914);
            void lite_ch;
            const lite_ok = ((((((((liteFn$lib$core$text$isAsciiLetter(lite_ch)) || (liteFn$lib$core$text$isDigit(lite_ch)))) || (((lite_ch) === ("."))))) || (((lite_ch) === ("_"))))) || (((lite_ch) === ("-"))));
            void lite_ok;
            if ((!(lite_ok))) {
                return false;
            }
            lite_i = lite$addInt(lite_i, 1n, 1079);
        }
        return true;
    }
    void liteFn$lib$util$streams$isSiblingFileName;
    function liteFn$lib$util$streams$isJsonPrefixAt(lite_source: string, lite_start: bigint, lite_prefix: string): boolean {
        void lite_source;
        void lite_start;
        void lite_prefix;
        const lite_pos = liteFn$lib$core$text$skipSpaces(lite_source, lite_start);
        void lite_pos;
        return liteFn$lib$core$text$startsWithAt(lite_source, lite_pos, lite_prefix);
    }
    void liteFn$lib$util$streams$isJsonPrefixAt;
    function liteFn$lib$util$streams$parseBytesArray(lite_source: string, lite_arrayPos: bigint, lite_label: string): { ok: boolean; error: string } {
        void lite_source;
        void lite_arrayPos;
        void lite_label;
        if ((!(liteFn$lib$util$streams$isJsonPrefixAt(lite_source, lite_arrayPos, "[")))) {
            return { ok: false, error: ((lite_label) + (".bytes must contain integers 0-255")) };
        }
        const lite_offsets: bigint[] = [...(liteFn$lib$util$json$arrayElementOffsets(lite_source, lite_arrayPos))];
        void lite_offsets;
        for (const lite_bPos of [...(lite_offsets)]) {
            void lite_bPos;
            const lite_byteRes = liteFn$lib$util$json$readIntAt(lite_source, lite_bPos);
            void lite_byteRes;
            if ((((((!((lite_byteRes).ok))) || ((((lite_byteRes).value) < (0n))))) || ((((lite_byteRes).value) > (255n))))) {
                return { ok: false, error: ((lite_label) + (".bytes must contain integers 0-255")) };
            }
        }
        return { ok: true, error: "" };
    }
    void liteFn$lib$util$streams$parseBytesArray;
    function liteFn$lib$util$streams$collectBytesArray(lite_source: string, lite_arrayPos: bigint): bigint[] {
        void lite_source;
        void lite_arrayPos;
        const lite_out: bigint[] = [...([])];
        void lite_out;
        const lite_offsets: bigint[] = [...(liteFn$lib$util$json$arrayElementOffsets(lite_source, lite_arrayPos))];
        void lite_offsets;
        for (const lite_bPos of [...(lite_offsets)]) {
            void lite_bPos;
            const lite_byteRes = liteFn$lib$util$json$readIntAt(lite_source, lite_bPos);
            void lite_byteRes;
            lite_out.push((lite_byteRes).value);
        }
        return [...(lite_out)];
    }
    void liteFn$lib$util$streams$collectBytesArray;
    function liteFn$lib$util$streams$validateStream(lite_source: string, lite_streamPos: bigint, lite_directory: string, lite_label: string, lite_requiredHash: boolean, lite_siblingOnly: boolean, lite_checkHash: boolean): { ok: boolean; sha256: string; kind: string; error: string } {
        void lite_source;
        void lite_streamPos;
        void lite_directory;
        void lite_label;
        void lite_requiredHash;
        void lite_siblingOnly;
        void lite_checkHash;
        if ((!(liteFn$lib$util$streams$isJsonPrefixAt(lite_source, lite_streamPos, "{")))) {
            return { ok: false, sha256: "", kind: "", error: ((lite_label) + (": stream must be an object")) };
        }
        const lite_keys: string[] = [...(liteFn$lib$util$json$objectKeys(lite_source, lite_streamPos))];
        void lite_keys;
        const lite_allowed: string[] = [...(["text", "bytes", "file", "hash"])];
        void lite_allowed;
        let lite_form = "";
        void lite_form;
        let lite_formCount = 0n;
        void lite_formCount;
        for (const lite_k of [...(lite_keys)]) {
            void lite_k;
            if ((!(liteFn$lib$core$list$listContainsText([...(lite_allowed)], lite_k)))) {
                return { ok: false, sha256: "", kind: "", error: ((lite_label) + (": unexpected stream key")) };
            }
            if (((lite_k) !== ("hash"))) {
                lite_form = lite_k;
                lite_formCount = lite$addInt(lite_formCount, 1n, 3022);
            }
        }
        if (((lite_formCount) !== (1n))) {
            return { ok: false, sha256: "", kind: "", error: ((lite_label) + (": exactly one of text, bytes or file required")) };
        }
        let lite_digest = "";
        void lite_digest;
        if (((lite_form) === ("text"))) {
            const lite_tRes = liteFn$lib$util$json$readObjectString(lite_source, lite_streamPos, "text");
            void lite_tRes;
            if ((!((lite_tRes).ok))) {
                return { ok: false, sha256: "", kind: "", error: ((lite_label) + (".text must be a string")) };
            }
            lite_digest = (("sha256:") + (liteFn$lib$core$crypto$sha256Text((lite_tRes).value)));
        } else if (((lite_form) === ("bytes"))) {
            const lite_bField = liteFn$lib$util$json$findObjectField(lite_source, lite_streamPos, "bytes");
            void lite_bField;
            const lite_parsed = liteFn$lib$util$streams$parseBytesArray(lite_source, (lite_bField).valuePos, lite_label);
            void lite_parsed;
            if ((!((lite_parsed).ok))) {
                return { ok: false, sha256: "", kind: "", error: (lite_parsed).error };
            }
            lite_digest = (("sha256:") + (liteFn$lib$core$crypto$sha256Bytes([...(liteFn$lib$util$streams$collectBytesArray(lite_source, (lite_bField).valuePos))])));
        } else {
            const lite_fRes = liteFn$lib$util$json$readObjectString(lite_source, lite_streamPos, "file");
            void lite_fRes;
            if ((((((!((lite_fRes).ok))) || ((((lite_fRes).value) === (""))))) || ((((lite_siblingOnly) && ((!(liteFn$lib$util$streams$isSiblingFileName((lite_fRes).value))))))))) {
                const lite_kindMsg = (Boolean(lite_siblingOnly) ? "a sibling file name" : "a nonempty file path");
                void lite_kindMsg;
                return { ok: false, sha256: "", kind: "", error: ((((lite_label) + (".file must be "))) + (lite_kindMsg)) };
            }
            const lite_fullFile = liteFn$lib$core$path$resolve(lite_directory, (lite_fRes).value);
            void lite_fullFile;
            if (((lite$fileKind(lite_fullFile)) !== (lite$m$lib$core$file$FILE_KIND_FILE))) {
                return { ok: false, sha256: "", kind: "", error: ((((lite_label) + (".file missing: "))) + (lite_fullFile)) };
            }
            const lite_fHash = liteFn$lib$core$crypto$sha256File(lite_fullFile);
            void lite_fHash;
            if ((!((lite_fHash).ok))) {
                return { ok: false, sha256: "", kind: "", error: ((((lite_label) + (".file hash failed: "))) + ((lite_fHash).error)) };
            }
            lite_digest = (("sha256:") + ((lite_fHash).hex));
        }
        const lite_hashField = liteFn$lib$util$json$findObjectField(lite_source, lite_streamPos, "hash");
        void lite_hashField;
        if (((lite_requiredHash) || ((lite_hashField).found))) {
            let lite_validHash = false;
            void lite_validHash;
            let lite_hashValue = "";
            void lite_hashValue;
            if ((lite_hashField).found) {
                const lite_hStr = liteFn$lib$util$json$readStringAt(lite_source, (lite_hashField).valuePos);
                void lite_hStr;
                if ((((lite_hStr).ok) && (liteFn$lib$core$text$startsWithAt((lite_hStr).value, 0n, "sha256:")))) {
                    const lite_hexPart = lite$textSlice((lite_hStr).value, 7n, lite$textLength((lite_hStr).value), 5048);
                    void lite_hexPart;
                    if (liteFn$lib$util$streams$isHex64(lite_hexPart)) {
                        lite_validHash = true;
                        lite_hashValue = (lite_hStr).value;
                    }
                }
            }
            if ((!(lite_validHash))) {
                return { ok: false, sha256: "", kind: "", error: ((lite_label) + (".hash must be sha256:<64 lowercase hex>")) };
            }
            if (((lite_checkHash) && (((lite_hashValue) !== (lite_digest))))) {
                return { ok: false, sha256: "", kind: "", error: ((lite_label) + (".hash does not match content")) };
            }
        }
        return { ok: true, sha256: lite_digest, kind: lite_form, error: "" };
    }
    void liteFn$lib$util$streams$validateStream;
    function liteFn$lib$util$cases$hasDotDotSegment(lite_relPath: string): boolean {
        void lite_relPath;
        const lite_size = lite$textLength(lite_relPath);
        void lite_size;
        let lite_segStart = 0n;
        void lite_segStart;
        let lite_i = 0n;
        void lite_i;
        while (((lite_i) <= (lite_size))) {
            const lite_atEnd = ((lite_i) === (lite_size));
            void lite_atEnd;
            if (((((lite_atEnd) || (((lite$textAt(lite_relPath, lite_i, 561)) === ("/"))))) || (((lite$textAt(lite_relPath, lite_i, 591)) === ("\\"))))) {
                if (((lite$textSlice(lite_relPath, lite_segStart, lite_i, 636)) === (".."))) {
                    return true;
                }
                lite_segStart = lite$addInt(lite_i, 1n, 719);
            }
            lite_i = lite$addInt(lite_i, 1n, 748);
        }
        return false;
    }
    void liteFn$lib$util$cases$hasDotDotSegment;
    function liteFn$lib$util$cases$validateStream(lite_source: string, lite_streamPos: bigint, lite_directory: string): { ok: boolean; error: string } {
        void lite_source;
        void lite_streamPos;
        void lite_directory;
        const lite_checked = liteFn$lib$util$streams$validateStream(lite_source, lite_streamPos, lite_directory, "stream", false, false, true);
        void lite_checked;
        return { ok: (lite_checked).ok, error: (lite_checked).error };
    }
    void liteFn$lib$util$cases$validateStream;
    function liteFn$lib$util$cases$validateCaseFile(lite_rootDir: string, lite_caseFile: string): { ok: boolean; id: string; error: string } {
        void lite_rootDir;
        void lite_caseFile;
        const lite_readRes = liteFn$lib$core$file$readText(lite_caseFile);
        void lite_readRes;
        if ((!((lite_readRes).ok))) {
            return { ok: false, id: "", error: ((((lite_caseFile) + (": "))) + ((lite_readRes).error)) };
        }
        const lite_textSrc = (lite_readRes).text;
        void lite_textSrc;
        const lite_validJson = liteFn$lib$util$json$validate(lite_textSrc);
        void lite_validJson;
        if ((!((lite_validJson).ok))) {
            return { ok: false, id: "", error: ((((lite_caseFile) + (": "))) + ((lite_validJson).error)) };
        }
        const lite_topKeys: string[] = [...(liteFn$lib$util$json$objectKeys(lite_textSrc, 0n))];
        void lite_topKeys;
        const lite_allowedTop: string[] = [...(["id", "kind", "pending", "features", "cases", "benchmark", "tool", "source"])];
        void lite_allowedTop;
        for (const lite_k of [...(lite_topKeys)]) {
            void lite_k;
            if ((!(liteFn$lib$core$list$listContainsText([...(lite_allowedTop)], lite_k)))) {
                return { ok: false, id: "", error: ((((lite_caseFile) + (": unexpected case key "))) + (lite_k)) };
            }
        }
        const lite_idRes = liteFn$lib$util$json$readObjectString(lite_textSrc, 0n, "id");
        void lite_idRes;
        if ((((((!((lite_idRes).found))) || ((!((lite_idRes).ok))))) || ((((lite_idRes).value) === (""))))) {
            return { ok: false, id: "", error: ((lite_caseFile) + (": case ID required")) };
        }
        const lite_caseId = (lite_idRes).value;
        void lite_caseId;
        const lite_kindRes = liteFn$lib$util$json$readObjectString(lite_textSrc, 0n, "kind");
        void lite_kindRes;
        const lite_validKinds: string[] = [...(["tool", "feature", "reject", "compile", "sample", "example"])];
        void lite_validKinds;
        if ((((((!((lite_kindRes).found))) || ((!((lite_kindRes).ok))))) || ((!(liteFn$lib$core$list$listContainsText([...(lite_validKinds)], (lite_kindRes).value)))))) {
            return { ok: false, id: "", error: ((lite_caseFile) + (": invalid case kind")) };
        }
        const lite_kind = (lite_kindRes).value;
        void lite_kind;
        const lite_pendingField = liteFn$lib$util$json$findObjectField(lite_textSrc, 0n, "pending");
        void lite_pendingField;
        if ((lite_pendingField).found) {
            const lite_pStr = liteFn$lib$util$json$readStringAt(lite_textSrc, (lite_pendingField).valuePos);
            void lite_pStr;
            if (((((((lite_kind) === ("tool"))) || ((!((lite_pStr).ok))))) || (((liteFn$lib$core$text$trim((lite_pStr).value)) === (""))))) {
                return { ok: false, id: "", error: ((lite_caseFile) + (": pending needs a language case and reason")) };
            }
        }
        const lite_caseDir = liteFn$lib$core$path$parentDir(lite_caseFile);
        void lite_caseDir;
        if (((lite_kind) === ("tool"))) {
            if ((liteFn$lib$util$json$findObjectField(lite_textSrc, 0n, "source")).found) {
                return { ok: false, id: "", error: ((lite_caseFile) + (": tool cases name a tool, not a case executable")) };
            }
            const lite_toolRes = liteFn$lib$util$json$readObjectString(lite_textSrc, 0n, "tool");
            void lite_toolRes;
            if ((((((((!((lite_toolRes).found))) || ((!((lite_toolRes).ok))))) || (liteFn$lib$core$text$containsText((lite_toolRes).value, "/")))) || (((lite$fileKind(liteFn$lib$core$path$join(lite_rootDir, (("bin/") + ((lite_toolRes).value))))) === (lite$m$lib$core$file$FILE_KIND_MISSING))))) {
                return { ok: false, id: "", error: ((lite_caseFile) + (": unknown tool")) };
            }
        } else {
            const lite_srcRes = liteFn$lib$util$json$readObjectString(lite_textSrc, 0n, "source");
            void lite_srcRes;
            if ((((((!((lite_srcRes).found))) || ((!((lite_srcRes).ok))))) || ((!(liteFn$lib$core$text$endsWith((lite_srcRes).value, ".lts")))))) {
                return { ok: false, id: "", error: ((lite_caseFile) + (": Lite source must use .lts")) };
            }
            if (((lite$fileKind(liteFn$lib$core$path$resolve(lite_caseDir, (lite_srcRes).value))) !== (lite$m$lib$core$file$FILE_KIND_FILE))) {
                return { ok: false, id: "", error: ((((lite_caseFile) + (": missing case source "))) + ((lite_srcRes).value)) };
            }
        }
        const lite_featField = liteFn$lib$util$json$findObjectField(lite_textSrc, 0n, "features");
        void lite_featField;
        if ((!((lite_featField).found))) {
            return { ok: false, id: "", error: ((lite_caseFile) + (": features must be an array")) };
        }
        const lite_seenFeatures: string[] = [...([])];
        void lite_seenFeatures;
        for (const lite_fPos of [...(liteFn$lib$util$json$arrayElementOffsets(lite_textSrc, (lite_featField).valuePos))]) {
            void lite_fPos;
            const lite_fStr = liteFn$lib$util$json$readStringAt(lite_textSrc, lite_fPos);
            void lite_fStr;
            if ((!((lite_fStr).ok))) {
                return { ok: false, id: "", error: ((lite_caseFile) + (": features must be strings")) };
            }
            if (liteFn$lib$core$list$listContainsText([...(lite_seenFeatures)], (lite_fStr).value)) {
                return { ok: false, id: "", error: ((lite_caseFile) + (": duplicate feature IDs")) };
            }
            lite_seenFeatures.push((lite_fStr).value);
        }
        const lite_casesField = liteFn$lib$util$json$findObjectField(lite_textSrc, 0n, "cases");
        void lite_casesField;
        if ((!((lite_casesField).found))) {
            return { ok: false, id: "", error: ((lite_caseFile) + (": case scenarios required")) };
        }
        const lite_scenarios: bigint[] = [...(liteFn$lib$util$json$arrayElementOffsets(lite_textSrc, (lite_casesField).valuePos))];
        void lite_scenarios;
        if (((liteFn$lib$core$list$listCountInt([...(lite_scenarios)])) === (0n))) {
            return { ok: false, id: "", error: ((lite_caseFile) + (": case scenarios required")) };
        }
        const lite_allowedScenario: string[] = [...(["name", "args", "stdin", "stdout", "stderr", "exitCode", "timeoutMs", "artifact", "inputFiles", "outputFiles", "workspace", "tag", "files"])];
        void lite_allowedScenario;
        const lite_seenScenarios: string[] = [...([])];
        void lite_seenScenarios;
        for (const lite_sPos of [...(lite_scenarios)]) {
            void lite_sPos;
            for (const lite_sk of [...(liteFn$lib$util$json$objectKeys(lite_textSrc, lite_sPos))]) {
                void lite_sk;
                if ((!(liteFn$lib$core$list$listContainsText([...(lite_allowedScenario)], lite_sk)))) {
                    return { ok: false, id: "", error: ((((lite_caseFile) + (": unexpected scenario key "))) + (lite_sk)) };
                }
            }
            const lite_nameRes = liteFn$lib$util$json$readObjectString(lite_textSrc, lite_sPos, "name");
            void lite_nameRes;
            if ((((((((!((lite_nameRes).found))) || ((!((lite_nameRes).ok))))) || ((((lite_nameRes).value) === (""))))) || (liteFn$lib$core$list$listContainsText([...(lite_seenScenarios)], (lite_nameRes).value)))) {
                return { ok: false, id: "", error: ((lite_caseFile) + (": scenario names must be unique")) };
            }
            lite_seenScenarios.push((lite_nameRes).value);
            const lite_codeRes = liteFn$lib$util$json$readObjectInt(lite_textSrc, lite_sPos, "exitCode");
            void lite_codeRes;
            if ((((((((!((lite_codeRes).found))) || ((!((lite_codeRes).ok))))) || ((((lite_codeRes).value) < (0n))))) || ((((lite_codeRes).value) > (255n))))) {
                return { ok: false, id: "", error: ((lite_caseFile) + (": invalid exit status")) };
            }
            const lite_timeoutRes = liteFn$lib$util$json$readObjectInt(lite_textSrc, lite_sPos, "timeoutMs");
            void lite_timeoutRes;
            if ((((lite_timeoutRes).found) && (((((((!((lite_timeoutRes).ok))) || ((((lite_timeoutRes).value) <= (0n))))) || ((((lite_timeoutRes).value) > (600000n)))))))) {
                return { ok: false, id: "", error: ((lite_caseFile) + (": invalid timeout")) };
            }
            const lite_argsField = liteFn$lib$util$json$findObjectField(lite_textSrc, lite_sPos, "args");
            void lite_argsField;
            if ((lite_argsField).found) {
                for (const lite_aPos of [...(liteFn$lib$util$json$arrayElementOffsets(lite_textSrc, (lite_argsField).valuePos))]) {
                    void lite_aPos;
                    const lite_aStr = liteFn$lib$util$json$readStringAt(lite_textSrc, lite_aPos);
                    void lite_aStr;
                    if ((!((lite_aStr).ok))) {
                        return { ok: false, id: "", error: ((lite_caseFile) + (": invalid arguments")) };
                    }
                }
            }
            const lite_stdinField = liteFn$lib$util$json$findObjectField(lite_textSrc, lite_sPos, "stdin");
            void lite_stdinField;
            const lite_stdoutField = liteFn$lib$util$json$findObjectField(lite_textSrc, lite_sPos, "stdout");
            void lite_stdoutField;
            const lite_stderrField = liteFn$lib$util$json$findObjectField(lite_textSrc, lite_sPos, "stderr");
            void lite_stderrField;
            if ((((((!((lite_stdinField).found))) || ((!((lite_stdoutField).found))))) || ((!((lite_stderrField).found))))) {
                return { ok: false, id: "", error: ((lite_caseFile) + (": missing stream")) };
            }
            const lite_s1 = liteFn$lib$util$cases$validateStream(lite_textSrc, (lite_stdinField).valuePos, lite_caseDir);
            void lite_s1;
            if ((!((lite_s1).ok))) {
                return { ok: false, id: "", error: (lite_s1).error };
            }
            const lite_s2 = liteFn$lib$util$cases$validateStream(lite_textSrc, (lite_stdoutField).valuePos, lite_caseDir);
            void lite_s2;
            if ((!((lite_s2).ok))) {
                return { ok: false, id: "", error: (lite_s2).error };
            }
            const lite_s3 = liteFn$lib$util$cases$validateStream(lite_textSrc, (lite_stderrField).valuePos, lite_caseDir);
            void lite_s3;
            if ((!((lite_s3).ok))) {
                return { ok: false, id: "", error: (lite_s3).error };
            }
            const lite_inFilesField = liteFn$lib$util$json$findObjectField(lite_textSrc, lite_sPos, "inputFiles");
            void lite_inFilesField;
            if ((lite_inFilesField).found) {
                if (((((((lite_kind) !== ("feature"))) && (((lite_kind) !== ("sample"))))) && (((lite_kind) !== ("example"))))) {
                    return { ok: false, id: "", error: ((lite_caseFile) + (": file fixtures need a runnable Lite case")) };
                }
                for (const lite_fname of [...(liteFn$lib$util$json$objectKeys(lite_textSrc, (lite_inFilesField).valuePos))]) {
                    void lite_fname;
                    if (((((((lite_fname) === (""))) || (liteFn$lib$core$path$isAbsolute(lite_fname)))) || (liteFn$lib$util$cases$hasDotDotSegment(lite_fname)))) {
                        return { ok: false, id: "", error: ((lite_caseFile) + (": file fixture paths must stay inside the case workspace")) };
                    }
                    const lite_fv = liteFn$lib$util$json$findObjectField(lite_textSrc, (lite_inFilesField).valuePos, lite_fname);
                    void lite_fv;
                    const lite_vs = liteFn$lib$util$cases$validateStream(lite_textSrc, (lite_fv).valuePos, lite_caseDir);
                    void lite_vs;
                    if ((!((lite_vs).ok))) {
                        return { ok: false, id: "", error: (lite_vs).error };
                    }
                }
            }
            const lite_outFilesField = liteFn$lib$util$json$findObjectField(lite_textSrc, lite_sPos, "outputFiles");
            void lite_outFilesField;
            if ((lite_outFilesField).found) {
                if (((((((lite_kind) !== ("feature"))) && (((lite_kind) !== ("sample"))))) && (((lite_kind) !== ("example"))))) {
                    return { ok: false, id: "", error: ((lite_caseFile) + (": file fixtures need a runnable Lite case")) };
                }
                for (const lite_fname of [...(liteFn$lib$util$json$objectKeys(lite_textSrc, (lite_outFilesField).valuePos))]) {
                    void lite_fname;
                    if (((((((lite_fname) === (""))) || (liteFn$lib$core$path$isAbsolute(lite_fname)))) || (liteFn$lib$util$cases$hasDotDotSegment(lite_fname)))) {
                        return { ok: false, id: "", error: ((lite_caseFile) + (": file fixture paths must stay inside the case workspace")) };
                    }
                    const lite_fv = liteFn$lib$util$json$findObjectField(lite_textSrc, (lite_outFilesField).valuePos, lite_fname);
                    void lite_fv;
                    const lite_vs = liteFn$lib$util$cases$validateStream(lite_textSrc, (lite_fv).valuePos, lite_caseDir);
                    void lite_vs;
                    if ((!((lite_vs).ok))) {
                        return { ok: false, id: "", error: (lite_vs).error };
                    }
                }
            }
            const lite_artField = liteFn$lib$util$json$findObjectField(lite_textSrc, lite_sPos, "artifact");
            void lite_artField;
            if ((lite_artField).found) {
                if (((lite_kind) !== ("compile"))) {
                    return { ok: false, id: "", error: ((lite_caseFile) + (": only compile cases compare generated artifacts")) };
                }
                const lite_vs = liteFn$lib$util$cases$validateStream(lite_textSrc, (lite_artField).valuePos, lite_caseDir);
                void lite_vs;
                if ((!((lite_vs).ok))) {
                    return { ok: false, id: "", error: (lite_vs).error };
                }
            }
            const lite_wsRes = liteFn$lib$util$json$readObjectString(lite_textSrc, lite_sPos, "workspace");
            void lite_wsRes;
            if ((((lite_wsRes).found) && ((((((((lite_kind) !== ("tool"))) || ((!((lite_wsRes).ok))))) || (((((((lite_wsRes).value) !== ("clean"))) && ((((lite_wsRes).value) !== ("dirty"))))))))))) {
                return { ok: false, id: "", error: ((lite_caseFile) + (": invalid workspace")) };
            }
            const lite_tagField = liteFn$lib$util$json$findObjectField(lite_textSrc, lite_sPos, "tag");
            void lite_tagField;
            if ((lite_tagField).found) {
                const lite_tName = liteFn$lib$util$json$readObjectString(lite_textSrc, (lite_tagField).valuePos, "name");
                void lite_tName;
                const lite_tAnn = liteFn$lib$util$json$readObjectBool(lite_textSrc, (lite_tagField).valuePos, "annotated");
                void lite_tAnn;
                if ((((((((((!((lite_wsRes).found))) || ((!((lite_tName).found))))) || ((!((lite_tName).ok))))) || ((!((lite_tAnn).found))))) || ((!((lite_tAnn).ok))))) {
                    return { ok: false, id: "", error: ((lite_caseFile) + (": invalid fixture tag")) };
                }
            }
            const lite_filesField = liteFn$lib$util$json$findObjectField(lite_textSrc, lite_sPos, "files");
            void lite_filesField;
            if ((lite_filesField).found) {
                if (((lite_kind) !== ("tool"))) {
                    return { ok: false, id: "", error: ((lite_caseFile) + (": invalid artifact paths")) };
                }
                for (const lite_fpPos of [...(liteFn$lib$util$json$arrayElementOffsets(lite_textSrc, (lite_filesField).valuePos))]) {
                    void lite_fpPos;
                    const lite_fpStr = liteFn$lib$util$json$readStringAt(lite_textSrc, lite_fpPos);
                    void lite_fpStr;
                    if ((((((((!((lite_fpStr).ok))) || ((((lite_fpStr).value) === (""))))) || (liteFn$lib$core$path$isAbsolute((lite_fpStr).value)))) || (liteFn$lib$util$cases$hasDotDotSegment((lite_fpStr).value)))) {
                        return { ok: false, id: "", error: ((lite_caseFile) + (": invalid artifact paths")) };
                    }
                }
            }
        }
        const lite_benchField = liteFn$lib$util$json$findObjectField(lite_textSrc, 0n, "benchmark");
        void lite_benchField;
        if ((lite_benchField).found) {
            const lite_allowedBench: string[] = [...(["warmups", "samples"])];
            void lite_allowedBench;
            for (const lite_bk of [...(liteFn$lib$util$json$objectKeys(lite_textSrc, (lite_benchField).valuePos))]) {
                void lite_bk;
                if ((!(liteFn$lib$core$list$listContainsText([...(lite_allowedBench)], lite_bk)))) {
                    return { ok: false, id: "", error: ((((lite_caseFile) + (": unexpected benchmark key "))) + (lite_bk)) };
                }
            }
            const lite_wRes = liteFn$lib$util$json$readObjectInt(lite_textSrc, (lite_benchField).valuePos, "warmups");
            void lite_wRes;
            const lite_smRes = liteFn$lib$util$json$readObjectInt(lite_textSrc, (lite_benchField).valuePos, "samples");
            void lite_smRes;
            if ((((((((((((!((lite_wRes).found))) || ((!((lite_wRes).ok))))) || ((((lite_wRes).value) < (0n))))) || ((!((lite_smRes).found))))) || ((!((lite_smRes).ok))))) || ((((lite_smRes).value) < (1n))))) {
                return { ok: false, id: "", error: ((lite_caseFile) + (": invalid benchmark counts")) };
            }
        }
        return { ok: true, id: lite_caseId, error: "" };
    }
    void liteFn$lib$util$cases$validateCaseFile;
    function liteFn$lib$util$cases$discoverAllCaseFiles(lite_rootDir: string): string[] {
        void lite_rootDir;
        const lite_roots: string[] = [...([liteFn$lib$core$path$join(lite_rootDir, "language/cases"), liteFn$lib$core$path$join(lite_rootDir, "tools/cases")])];
        void lite_roots;
        const lite_ignored: string[] = [...([])];
        void lite_ignored;
        return [...(liteFn$lib$core$path$collectFiles(lite_rootDir, [...(lite_roots)], ".case.json", [...(lite_ignored)], false))];
    }
    void liteFn$lib$util$cases$discoverAllCaseFiles;
    function liteFn$lib$util$cases$matchesCaseFilter(lite_candidate: string, lite_filter: string): boolean {
        void lite_candidate;
        void lite_filter;
        if (((lite_filter) === (""))) {
            return true;
        }
        if ((!(liteFn$lib$core$text$containsText(lite_filter, "*")))) {
            return liteFn$lib$core$text$containsText(lite_candidate, lite_filter);
        }
        const lite_filterLen = lite$textLength(lite_filter);
        void lite_filterLen;
        const lite_startsWild = ((lite$textAt(lite_filter, 0n, 12520)) === ("*"));
        void lite_startsWild;
        const lite_endsWild = ((lite$textAt(lite_filter, lite$subtractInt(lite_filterLen, 1n, 12589), 12563)) === ("*"));
        void lite_endsWild;
        const lite_parts: string[] = [...([])];
        void lite_parts;
        let lite_segStart = 0n;
        void lite_segStart;
        let lite_i = 0n;
        void lite_i;
        while (((lite_i) <= (lite_filterLen))) {
            const lite_atEnd = ((lite_i) === (lite_filterLen));
            void lite_atEnd;
            if (((lite_atEnd) || (((lite$textAt(lite_filter, lite_i, 12754)) === ("*"))))) {
                if (((lite_i) > (lite_segStart))) {
                    lite_parts.push(lite$textSlice(lite_filter, lite_segStart, lite_i, 12853));
                }
                lite_segStart = lite$addInt(lite_i, 1n, 12926);
            }
            lite_i = lite$addInt(lite_i, 1n, 12955);
        }
        const lite_partCount = liteFn$lib$core$list$listCountText([...(lite_parts)]);
        void lite_partCount;
        if (((lite_partCount) === (0n))) {
            return true;
        }
        const lite_candLen = lite$textLength(lite_candidate);
        void lite_candLen;
        let lite_cursor = 0n;
        void lite_cursor;
        let lite_idx = 0n;
        void lite_idx;
        while (((lite_idx) < (lite_partCount))) {
            const lite_part = lite$listAt((lite_parts), lite_idx, 13176);
            void lite_part;
            const lite_partLen = lite$textLength(lite_part);
            void lite_partLen;
            if (((((lite_idx) === (0n))) && ((!(lite_startsWild))))) {
                if ((!(liteFn$lib$core$text$startsWithAt(lite_candidate, 0n, lite_part)))) {
                    return false;
                }
                lite_cursor = lite_partLen;
            } else if (((((lite_idx) === (lite$subtractInt(lite_partCount, 1n, 13401)))) && ((!(lite_endsWild))))) {
                if (((((((lite_candLen) < (lite_partLen))) || (((lite_cursor) > (lite$subtractInt(lite_candLen, lite_partLen, 13477)))))) || ((!(liteFn$lib$core$text$endsWith(lite_candidate, lite_part)))))) {
                    return false;
                }
                lite_cursor = lite_candLen;
            } else {
                const lite_found = liteFn$lib$core$text$indexOfText(lite_candidate, lite_part, lite_cursor);
                void lite_found;
                if (((lite_found) < (0n))) {
                    return false;
                }
                lite_cursor = lite$addInt(lite_found, lite_partLen, 13752);
            }
            lite_idx = lite$addInt(lite_idx, 1n, 13791);
        }
        return true;
    }
    void liteFn$lib$util$cases$matchesCaseFilter;
    function liteFn$lib$util$cases$matchesCaseEntry(lite_rootDir: string, lite_caseId: string, lite_caseFile: string, lite_filter: string): boolean {
        void lite_rootDir;
        void lite_caseId;
        void lite_caseFile;
        void lite_filter;
        if (((lite_filter) === (""))) {
            return true;
        }
        if (liteFn$lib$util$cases$matchesCaseFilter(lite_caseId, lite_filter)) {
            return true;
        }
        const lite_relFile = liteFn$lib$core$path$relative(lite_rootDir, lite_caseFile);
        void lite_relFile;
        return liteFn$lib$util$cases$matchesCaseFilter(lite_relFile, lite_filter);
    }
    void liteFn$lib$util$cases$matchesCaseEntry;
    function liteFn$lib$util$cases$validateCaseSet(lite_rootDir: string, lite_filter: string): { ok: boolean; matchCount: bigint; error: string } {
        void lite_rootDir;
        void lite_filter;
        const lite_files: string[] = [...(liteFn$lib$util$cases$discoverAllCaseFiles(lite_rootDir))];
        void lite_files;
        if (((liteFn$lib$core$list$listCountText([...(lite_files)])) === (0n))) {
            return { ok: false, matchCount: 0n, error: "no cases found" };
        }
        const lite_seenIds: string[] = [...([])];
        void lite_seenIds;
        let lite_matches = 0n;
        void lite_matches;
        for (const lite_caseFile of [...(lite_files)]) {
            void lite_caseFile;
            const lite_checked = liteFn$lib$util$cases$validateCaseFile(lite_rootDir, lite_caseFile);
            void lite_checked;
            if ((!((lite_checked).ok))) {
                return { ok: false, matchCount: 0n, error: (lite_checked).error };
            }
            if (liteFn$lib$core$list$listContainsText([...(lite_seenIds)], (lite_checked).id)) {
                return { ok: false, matchCount: 0n, error: "duplicate case IDs" };
            }
            lite_seenIds.push((lite_checked).id);
            if (liteFn$lib$util$cases$matchesCaseEntry(lite_rootDir, (lite_checked).id, lite_caseFile, lite_filter)) {
                lite_matches = lite$addInt(lite_matches, 1n, 14997);
            }
        }
        if (((lite_matches) === (0n))) {
            return { ok: false, matchCount: 0n, error: (("no cases match: ") + (lite_filter)) };
        }
        return { ok: true, matchCount: lite_matches, error: "" };
    }
    void liteFn$lib$util$cases$validateCaseSet;
    function liteFn$lib$util$cases$validateAllCases(lite_rootDir: string): { ok: boolean; error: string } {
        void lite_rootDir;
        const lite_checked = liteFn$lib$util$cases$validateCaseSet(lite_rootDir, "");
        void lite_checked;
        return { ok: (lite_checked).ok, error: (lite_checked).error };
    }
    void liteFn$lib$util$cases$validateAllCases;
    function liteFn_failDoctor(lite_message: string): void {
        void lite_message;
        lite$reportError(lite_message);
        lite$exit(1n);
    }
    void liteFn_failDoctor;
    function liteFn_runCheckedTsc(lite_rootDir: string, lite_configPath: string): void {
        void lite_rootDir;
        void lite_configPath;
        const lite_tscScript = "igniter/node_modules/typescript/bin/tsc";
        void lite_tscScript;
        const lite_tscArgs: string[] = [...([lite_tscScript, "-p", lite_configPath])];
        void lite_tscArgs;
        const lite_emptyEnv: string[] = [...([])];
        void lite_emptyEnv;
        const lite_res = lite$processRun(lite$processExecPath(), [...(lite_tscArgs)], lite_rootDir, [...(lite_emptyEnv)], true, "");
        void lite_res;
        if ((((lite_res).error) !== (""))) {
            liteFn_failDoctor((lite_res).error);
        }
        if ((((lite_res).status) !== (0n))) {
            liteFn_failDoctor((((((((("node igniter/node_modules/typescript/bin/tsc -p ") + (lite_configPath))) + (" failed:\n"))) + ((lite_res).stdout))) + ((lite_res).stderr)));
        }
        if ((((lite_res).stdout) !== (""))) {
            lite$emit((lite_res).stdout);
        }
    }
    void liteFn_runCheckedTsc;
    function liteFn_run(lite_args: string[]): void {
        void lite_args;
        liteFn$lib$util$project$handleVersionFlag([...(lite_args)], "doctor", "doctor");
        const lite_docsOnly = liteFn$lib$util$cli$startsWith([...(lite_args)], "--docs");
        void lite_docsOnly;
        const lite_remaining: string[] = [...(liteFn$lib$util$cli$dropIf([...(lite_args)], "--docs"))];
        void lite_remaining;
        if (((liteFn$lib$core$list$listCountText([...(lite_remaining)])) > (0n))) {
            liteFn_failDoctor("usage: lite doctor [--docs]");
        }
        const lite_rootDir = liteFn$lib$util$project$findRepoRoot();
        void lite_rootDir;
        if (((lite_rootDir) === (""))) {
            liteFn_failDoctor("cannot locate repository root");
        }
        const lite_docCfgPath = liteFn$lib$core$path$join(lite_rootDir, "config/documentation.json");
        void lite_docCfgPath;
        const lite_docCfgRead = liteFn$lib$core$file$readText(lite_docCfgPath);
        void lite_docCfgRead;
        if ((!((lite_docCfgRead).ok))) {
            liteFn_failDoctor((("config/documentation.json: ") + ((lite_docCfgRead).error)));
        }
        const lite_docCfgValid = liteFn$lib$util$json$validate((lite_docCfgRead).text);
        void lite_docCfgValid;
        if ((!((lite_docCfgValid).ok))) {
            liteFn_failDoctor((("config/documentation.json: ") + ((lite_docCfgValid).error)));
        }
        const lite_docFailures: string[] = [...(liteFn$lib$util$docs$checkDocuments(lite_rootDir))];
        void lite_docFailures;
        if (((liteFn$lib$core$list$listCountText([...(lite_docFailures)])) > (0n))) {
            liteFn_failDoctor(liteFn$lib$core$text$joinTexts([...(lite_docFailures)], "\n"));
        }
        const lite_registryVscode = liteFn$lib$util$project$readComponentVersion("vscode");
        void lite_registryVscode;
        const lite_editorPkgRead = liteFn$lib$core$file$readText(liteFn$lib$core$path$join(lite_rootDir, "editors/vscode/package.json"));
        void lite_editorPkgRead;
        if ((!((lite_editorPkgRead).ok))) {
            liteFn_failDoctor((("editors/vscode/package.json: ") + ((lite_editorPkgRead).error)));
        }
        const lite_editorVer = liteFn$lib$util$json$readObjectString((lite_editorPkgRead).text, 0n, "version");
        void lite_editorVer;
        if ((((!((lite_editorVer).found))) || ((!((lite_editorVer).ok))))) {
            liteFn_failDoctor("editors/vscode/package.json: missing version");
        }
        if (((lite_registryVscode) !== ((lite_editorVer).value))) {
            liteFn_failDoctor("editor version differs from registry");
        }
        const lite_lockRead = liteFn$lib$core$file$readText(liteFn$lib$core$path$join(lite_rootDir, "editors/vscode/package-lock.json"));
        void lite_lockRead;
        if ((!((lite_lockRead).ok))) {
            liteFn_failDoctor((("editors/vscode/package-lock.json: ") + ((lite_lockRead).error)));
        }
        const lite_lockVer = liteFn$lib$util$json$readObjectString((lite_lockRead).text, 0n, "version");
        void lite_lockVer;
        if ((((((!((lite_lockVer).found))) || ((!((lite_lockVer).ok))))) || ((((lite_lockVer).value) !== ((lite_editorVer).value))))) {
            liteFn_failDoctor("editor lockfile version differs");
        }
        const lite_pkgsField = liteFn$lib$util$json$findObjectField((lite_lockRead).text, 0n, "packages");
        void lite_pkgsField;
        if ((!((lite_pkgsField).found))) {
            liteFn_failDoctor("editor lockfile package version differs");
        }
        const lite_rootPkgField = liteFn$lib$util$json$findObjectField((lite_lockRead).text, (lite_pkgsField).valuePos, "");
        void lite_rootPkgField;
        if ((!((lite_rootPkgField).found))) {
            liteFn_failDoctor("editor lockfile package version differs");
        }
        const lite_rootPkgVer = liteFn$lib$util$json$readObjectString((lite_lockRead).text, (lite_rootPkgField).valuePos, "version");
        void lite_rootPkgVer;
        if ((((((!((lite_rootPkgVer).found))) || ((!((lite_rootPkgVer).ok))))) || ((((lite_rootPkgVer).value) !== ((lite_editorVer).value))))) {
            liteFn_failDoctor("editor lockfile package version differs");
        }
        const lite_casesRes = liteFn$lib$util$cases$validateAllCases(lite_rootDir);
        void lite_casesRes;
        if ((!((lite_casesRes).ok))) {
            liteFn_failDoctor((lite_casesRes).error);
        }
        if ((!(lite_docsOnly))) {
            liteFn_runCheckedTsc(lite_rootDir, "igniter/tsconfig.json");
            liteFn_runCheckedTsc(lite_rootDir, "compiler/bootstrap/tsconfig.json");
        }
        lite$emit("Repository checks passed." + "\n");
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
