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
        spawnSync(command: string, args: readonly string[], options: { cwd?: string; env: Record<string, string | undefined>; encoding?: "utf8"; input?: string; stdio: "inherit" | readonly ["pipe", "pipe", "pipe"]; maxBuffer: number }): { status: number | null; signal: string | null; stdout: string | null; stderr: string | null; error?: Error };
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
function lite$fileRemove(path: string): { ok: boolean; error: string } {
    try { process.getBuiltinModule("node:fs").rmSync(path, { recursive: true, force: true }); return { ok: true, error: "" }; }
    catch (error) { return { ok: false, error: lite$errMsg(error) }; }
}
function lite$fileSymlink(targetPath: string, linkPath: string): { ok: boolean; error: string } {
    try { process.getBuiltinModule("node:fs").symlinkSync(targetPath, linkPath); return { ok: true, error: "" }; }
    catch (error) { return { ok: false, error: lite$errMsg(error) }; }
}
function lite$fileMakeTempDir(prefix: string): { ok: boolean; path: string; error: string } {
    try {
        const joined = process.getBuiltinModule("node:path").join(process.getBuiltinModule("node:os").tmpdir(), prefix);
        return { ok: true, path: process.getBuiltinModule("node:fs").mkdtempSync(joined), error: "" };
    } catch (error) { return { ok: false, path: "", error: lite$errMsg(error) }; }
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
function lite$processEnvGet(name: string): { found: boolean; value: string } {
    if (!Object.prototype.hasOwnProperty.call(process.env, name)) return { found: false, value: "" };
    const raw = process.env[name];
    return raw === undefined ? { found: false, value: "" } : { found: true, value: raw };
}
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

function lite$textIndexOf(source: string, needle: string, start: bigint): bigint {
    if (start < 0n) return -1n;
    if (lite$isBmp(source)) {
        const len = source.length;
        if (start > BigInt(len)) return -1n;
        if (needle.length === 0) return start;
        const idx = source.indexOf(needle, Number(start));
        return idx < 0 ? -1n : BigInt(idx);
    }
    const points = lite$textPoints(source);
    if (start > BigInt(points.length)) return -1n;
    if (needle.length === 0) return start;
    if (source.indexOf(needle) < 0) return -1n;
    const s = Number(start);
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
    if (position < 0n) return false;
    if (lite$isBmp(source)) {
        if (position > BigInt(source.length)) return false;
        return source.startsWith(text, Number(position));
    }
    const points = lite$textPoints(source);
    if (position > BigInt(points.length)) return false;
    const pos = Number(position);
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

const lite$intLines: readonly number[] = [0, 91, 92, 116, 142, 173, 201, 229, 259, 287, 315, 341, 375, 405, 406, 444, 471, 487, 490, 491, 588, 621, 683, 729, 793, 844, 924, 930, 933, 934, 1005, 1043, 1046, 1047, 1111, 1157, 1160, 1161, 1223, 1287, 1313, 1355, 1361, 1393, 1396, 1397, 1468, 1488, 1513, 1562, 1568, 1578, 1581, 1582, 1650, 1689, 1750, 1774, 1858, 1884, 1894, 1900, 1909, 1912, 1913, 1980, 2009, 2057, 2109, 2131, 2197, 2224, 2230, 2286, 2348, 2391, 2394, 2395, 2453, 2487, 2520, 2538, 2560, 2611, 2658, 2711, 2779, 2789, 2818, 2840, 2846, 2856, 2859, 2860, 2904, 2964, 3001, 3050, 3121, 3235, 3307, 3396, 3441, 3520, 3546, 3600, 3688, 3745, 3751, 3752, 3847, 3880, 3956, 4003, 4055, 4115, 4116, 4165, 4213, 4280, 4353, 4359, 4413, 4494, 4500, 4547, 4604, 4643, 4693, 4699, 4766, 4815, 4978, 4981, 4982, 5021, 5051, 5090, 5097, 5100, 5101, 5130, 5220, 5264, 5270, 5277, 5280, 5281, 5335, 5399, 5450, 5540, 5543, 5544, 5584, 5637, 5686, 5712, 5758, 5842, 5888, 5948, 5992, 6016, 6017, 6126, 6150, 6175, 6206, 6212, 6213, 6271, 6328, 6413, 6523, 6573, 6623, 6673, 6723, 6755, 6810, 6813, 6814, 6853, 6944, 6999, 7005, 7045, 7114, 7164, 7236, 7295, 7366, 7448, 7519, 7525, 7556, 7638, 7729, 7821, 7912, 7945, 7955, 7961, 7962, 8023, 8061, 8089, 8155, 8161, 8205, 8254, 8305, 8349, 8387, 8436, 8511, 8580, 8614, 8702, 8734, 8737, 8738, 8788, 8815, 8902, 8962, 9029, 9045, 9051, 9104, 9145, 9177, 9193, 9199, 9223, 9272, 9304, 9320, 9326, 9380, 9451, 9576, 9613, 9649, 9665, 9671, 9695, 9758, 9790, 9806, 9812, 9840, 9895, 9927, 9943, 9949, 9978, 10009, 10025, 10031, 10063, 10098, 10116, 10190, 10265, 10338, 10349, 10385, 10401, 10407, 10446, 10491, 10544, 10580, 10590, 10606, 10612, 10648, 10693, 10752, 10788, 10798, 10814, 10820, 10857, 10927, 10943, 10949, 10978, 11005, 11021, 11027, 11054, 11083, 11191, 11250, 11285, 11301, 11307, 11334, 11360, 11376, 11382, 11422, 11425, 11426, 11467, 11515, 11547, 11616, 11657, 11663, 11702, 11753, 11791, 11827, 11890, 11915, 11918, 11919, 11940];
const lite$intSource = "tools/src/ci.lts:";
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
    function liteFn$lib$core$text$textToInt(lite_text: string): { value: bigint; ok: boolean } {
        void lite_text;
        return lite$textToInt(lite_text);
    }
    void liteFn$lib$core$text$textToInt;
    function liteFn$lib$core$text$trim(lite_source: string): string {
        void lite_source;
        return lite$textTrim(lite_source, true, true);
    }
    void liteFn$lib$core$text$trim;
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
    function liteFn$lib$util$cli$head(lite_args: string[]): string {
        void lite_args;
        if (((liteFn$lib$core$list$listCountText([...(lite_args)])) === (0n))) {
            return "";
        }
        return lite$listAt((lite_args), 0n, 362);
    }
    void liteFn$lib$util$cli$head;
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
    function liteFn$lib$util$project$errorText(lite_chunk: string): void {
        void lite_chunk;
        if (((lite_chunk) === (""))) {
            return;
        }
        const lite_len = lite$textLength(lite_chunk);
        void lite_len;
        if (((lite$textAt(lite_chunk, lite$subtractInt(lite_len, 1n, 2348), 2329)) === ("\n"))) {
            return (void (lite$reportError(lite$textSlice(lite_chunk, 0n, lite$subtractInt(lite_len, 1n, 2409), 2384))));
        } else {
            return (void (lite$reportError(lite_chunk)));
        }
    }
    void liteFn$lib$util$project$errorText;
    function liteFn$lib$util$release$isIdentChar(lite_ch: string): boolean {
        void lite_ch;
        return ((((liteFn$lib$core$text$isDigit(lite_ch)) || (liteFn$lib$core$text$isAsciiLetter(lite_ch)))) || (((lite_ch) === ("-"))));
    }
    void liteFn$lib$util$release$isIdentChar;
    function liteFn$lib$util$release$isAllDigits(lite_segment: string): boolean {
        void lite_segment;
        const lite_size = lite$textLength(lite_segment);
        void lite_size;
        if (((lite_size) === (0n))) {
            return false;
        }
        let lite_i = 0n;
        void lite_i;
        while (((lite_i) < (lite_size))) {
            if ((!(liteFn$lib$core$text$isDigit(lite$textAt(lite_segment, lite_i, 546))))) {
                return false;
            }
            lite_i = lite$addInt(lite_i, 1n, 599);
        }
        return true;
    }
    void liteFn$lib$util$release$isAllDigits;
    function liteFn$lib$util$release$isPlainNumericSegment(lite_segment: string): boolean {
        void lite_segment;
        if ((!(liteFn$lib$util$release$isAllDigits(lite_segment)))) {
            return false;
        }
        const lite_size = lite$textLength(lite_segment);
        void lite_size;
        if (((((lite_size) > (1n))) && (((lite$textAt(lite_segment, 0n, 780)) === ("0"))))) {
            return false;
        }
        return true;
    }
    void liteFn$lib$util$release$isPlainNumericSegment;
    function liteFn$lib$util$release$validDotIdentifiers(lite_part: string, lite_rejectLeadingZeroNumeric: boolean): boolean {
        void lite_part;
        void lite_rejectLeadingZeroNumeric;
        const lite_size = lite$textLength(lite_part);
        void lite_size;
        if (((lite_size) === (0n))) {
            return false;
        }
        let lite_segStart = 0n;
        void lite_segStart;
        let lite_i = 0n;
        void lite_i;
        while (((lite_i) <= (lite_size))) {
            const lite_atEnd = ((lite_i) === (lite_size));
            void lite_atEnd;
            const lite_isDot = (((!(lite_atEnd))) && (((lite$textAt(lite_part, lite_i, 1103)) === ("."))));
            void lite_isDot;
            if (((lite_atEnd) || (lite_isDot))) {
                const lite_seg = lite$textSlice(lite_part, lite_segStart, lite_i, 1175);
                void lite_seg;
                if (((lite$textLength(lite_seg)) === (0n))) {
                    return false;
                }
                if (((((lite_rejectLeadingZeroNumeric) && (liteFn$lib$util$release$isAllDigits(lite_seg)))) && ((!(liteFn$lib$util$release$isPlainNumericSegment(lite_seg)))))) {
                    return false;
                }
                lite_segStart = lite$addInt(lite_i, 1n, 1428);
            } else if ((!(liteFn$lib$util$release$isIdentChar(lite$textAt(lite_part, lite_i, 1467))))) {
                return false;
            }
            lite_i = lite$addInt(lite_i, 1n, 1537);
        }
        return true;
    }
    void liteFn$lib$util$release$validDotIdentifiers;
    function liteFn$lib$util$release$isValidSemver(lite_version: string): boolean {
        void lite_version;
        const lite_size = lite$textLength(lite_version);
        void lite_size;
        if (((lite_size) === (0n))) {
            return false;
        }
        const lite_plusPos = liteFn$lib$core$text$indexOfText(lite_version, "+", 0n);
        void lite_plusPos;
        const lite_beforeBuild = (Boolean(((lite_plusPos) >= (0n))) ? lite$textSlice(lite_version, 0n, lite_plusPos, 1880) : lite_version);
        void lite_beforeBuild;
        if (((lite_plusPos) >= (0n))) {
            const lite_buildPart = lite$textSlice(lite_version, lite$addInt(lite_plusPos, 1n, 2003), lite_size, 1975);
            void lite_buildPart;
            if ((!(liteFn$lib$util$release$validDotIdentifiers(lite_buildPart, false)))) {
                return false;
            }
        }
        const lite_dashPos = liteFn$lib$core$text$indexOfText(lite_beforeBuild, "-", 0n);
        void lite_dashPos;
        const lite_corePart = (Boolean(((lite_dashPos) >= (0n))) ? lite$textSlice(lite_beforeBuild, 0n, lite_dashPos, 2180) : lite_beforeBuild);
        void lite_corePart;
        if (((lite_dashPos) >= (0n))) {
            const lite_prePart = lite$textSlice(lite_beforeBuild, lite$addInt(lite_dashPos, 1n, 2313), lite$textLength(lite_beforeBuild), 2281);
            void lite_prePart;
            if ((!(liteFn$lib$util$release$validDotIdentifiers(lite_prePart, true)))) {
                return false;
            }
        }
        const lite_dot1 = liteFn$lib$core$text$indexOfText(lite_corePart, ".", 0n);
        void lite_dot1;
        if (((lite_dot1) < (0n))) {
            return false;
        }
        const lite_dot2 = liteFn$lib$core$text$indexOfText(lite_corePart, ".", lite$addInt(lite_dot1, 1n, 2550));
        void lite_dot2;
        if (((lite_dot2) < (0n))) {
            return false;
        }
        if (((liteFn$lib$core$text$indexOfText(lite_corePart, ".", lite$addInt(lite_dot2, 1n, 2634))) >= (0n))) {
            return false;
        }
        return ((((liteFn$lib$util$release$isPlainNumericSegment(lite$textSlice(lite_corePart, 0n, lite_dot1, 2688))) && (liteFn$lib$util$release$isPlainNumericSegment(lite$textSlice(lite_corePart, lite$addInt(lite_dot1, 1n, 2775), lite_dot2, 2749))))) && (liteFn$lib$util$release$isPlainNumericSegment(lite$textSlice(lite_corePart, lite$addInt(lite_dot2, 1n, 2843), lite$textLength(lite_corePart), 2817))));
    }
    void liteFn$lib$util$release$isValidSemver;
    function liteFn$lib$util$release$isPlainMajorMinorPatch(lite_version: string): boolean {
        void lite_version;
        return ((((((liteFn$lib$core$text$indexOfText(lite_version, "-", 0n)) < (0n))) && (((liteFn$lib$core$text$indexOfText(lite_version, "+", 0n)) < (0n))))) && (liteFn$lib$util$release$isValidSemver(lite_version)));
    }
    void liteFn$lib$util$release$isPlainMajorMinorPatch;
    function liteFn$lib$util$release$allComponents(): string[] {
        const lite_items: string[] = [...(["project", "language", "scripting", "compiler", "igniter", "cli", "formatter", "runtime", "stdlib", "builtins", "checker", "tester", "verifier", "benchmark", "release", "docs", "vscode", "linker", "doctor"])];
        void lite_items;
        return [...(lite_items)];
    }
    void liteFn$lib$util$release$allComponents;
    function liteFn$lib$util$release$componentTagPrefix(lite_component: string): string {
        void lite_component;
        if (((lite_component) === ("project"))) {
            return "lite";
        }
        if (((lite_component) === ("language"))) {
            return "lang";
        }
        if (((lite_component) === ("scripting"))) {
            return "script";
        }
        if (((lite_component) === ("compiler"))) {
            return "compiler";
        }
        if (((lite_component) === ("igniter"))) {
            return "igniter";
        }
        if (((lite_component) === ("cli"))) {
            return "cli";
        }
        if (((lite_component) === ("formatter"))) {
            return "formatter";
        }
        if (((lite_component) === ("runtime"))) {
            return "runtime";
        }
        if (((lite_component) === ("stdlib"))) {
            return "std";
        }
        if (((lite_component) === ("builtins"))) {
            return "builtins";
        }
        if (((lite_component) === ("checker"))) {
            return "check";
        }
        if (((lite_component) === ("tester"))) {
            return "test";
        }
        if (((lite_component) === ("verifier"))) {
            return "verify";
        }
        if (((lite_component) === ("benchmark"))) {
            return "bench";
        }
        if (((lite_component) === ("release"))) {
            return "release";
        }
        if (((lite_component) === ("docs"))) {
            return "docs";
        }
        if (((lite_component) === ("vscode"))) {
            return "vscode";
        }
        if (((lite_component) === ("linker"))) {
            return "linker";
        }
        if (((lite_component) === ("doctor"))) {
            return "doctor";
        }
        return "";
    }
    void liteFn$lib$util$release$componentTagPrefix;
    function liteFn$lib$util$release$parseComponentTag(lite_tag: string): { ok: boolean; component: string; version: string; error: string } {
        void lite_tag;
        const lite_components: string[] = [...(liteFn$lib$util$release$allComponents())];
        void lite_components;
        for (const lite_component of [...(lite_components)]) {
            void lite_component;
            const lite_prefix = ((liteFn$lib$util$release$componentTagPrefix(lite_component)) + ("-v"));
            void lite_prefix;
            if (liteFn$lib$core$text$startsWithAt(lite_tag, 0n, lite_prefix)) {
                const lite_version = lite$textSlice(lite_tag, lite$textLength(lite_prefix), lite$textLength(lite_tag), 4990);
                void lite_version;
                if ((!(liteFn$lib$util$release$isValidSemver(lite_version)))) {
                    return { ok: false, component: "", version: "", error: (("invalid release version: ") + (lite_tag)) };
                }
                return { ok: true, component: lite_component, version: lite_version, error: "" };
            }
        }
        return { ok: false, component: "", version: "", error: (("unsupported release tag: ") + (lite_tag)) };
    }
    void liteFn$lib$util$release$parseComponentTag;
    function liteFn$lib$util$release$readIgniterVersion(lite_rootDir: string): { ok: boolean; version: string; error: string } {
        void lite_rootDir;
        const lite_pkgRead = liteFn$lib$core$file$readText(liteFn$lib$core$path$join(lite_rootDir, "igniter/package.json"));
        void lite_pkgRead;
        if ((!((lite_pkgRead).ok))) {
            return { ok: false, version: "", error: (lite_pkgRead).error };
        }
        const lite_ver = liteFn$lib$util$json$readObjectString((lite_pkgRead).text, 0n, "version");
        void lite_ver;
        if ((((((!((lite_ver).found))) || ((!((lite_ver).ok))))) || ((!(liteFn$lib$util$release$isValidSemver((lite_ver).value)))))) {
            return { ok: false, version: "", error: "invalid igniter package version" };
        }
        return { ok: true, version: (lite_ver).value, error: "" };
    }
    void liteFn$lib$util$release$readIgniterVersion;
    function liteFn$lib$util$release$selectComponentRelease(lite_rootDir: string, lite_tag: string): { ok: boolean; hasTag: boolean; component: string; version: string; error: string } {
        void lite_rootDir;
        void lite_tag;
        const lite_igniterRes = liteFn$lib$util$release$readIgniterVersion(lite_rootDir);
        void lite_igniterRes;
        if ((!((lite_igniterRes).ok))) {
            return { ok: false, hasTag: false, component: "", version: "", error: (lite_igniterRes).error };
        }
        const lite_verRead = liteFn$lib$core$file$readText(liteFn$lib$core$path$join(lite_rootDir, "config/versions.json"));
        void lite_verRead;
        if ((!((lite_verRead).ok))) {
            return { ok: false, hasTag: false, component: "", version: "", error: (lite_verRead).error };
        }
        const lite_verValid = liteFn$lib$util$json$validate((lite_verRead).text);
        void lite_verValid;
        if ((!((lite_verValid).ok))) {
            return { ok: false, hasTag: false, component: "", version: "", error: (lite_verValid).error };
        }
        const lite_components: string[] = [...(liteFn$lib$util$release$allComponents())];
        void lite_components;
        const lite_keys: string[] = [...(liteFn$lib$util$json$objectKeys((lite_verRead).text, 0n))];
        void lite_keys;
        for (const lite_key of [...(lite_keys)]) {
            void lite_key;
            if (((((lite_key) === ("igniter"))) || ((!(liteFn$lib$core$list$listContainsText([...(lite_components)], lite_key)))))) {
                return { ok: false, hasTag: false, component: "", version: "", error: (("unknown versions.json component: ") + (lite_key)) };
            }
        }
        let lite_matchedComponent = "";
        void lite_matchedComponent;
        let lite_matchedVersion = "";
        void lite_matchedVersion;
        let lite_wantComponent = "";
        void lite_wantComponent;
        let lite_wantVersion = "";
        void lite_wantVersion;
        if (((lite_tag) !== (""))) {
            const lite_parsed = liteFn$lib$util$release$parseComponentTag(lite_tag);
            void lite_parsed;
            if ((!((lite_parsed).ok))) {
                return { ok: false, hasTag: false, component: "", version: "", error: (lite_parsed).error };
            }
            lite_wantComponent = (lite_parsed).component;
            lite_wantVersion = (lite_parsed).version;
        }
        for (const lite_component of [...(lite_components)]) {
            void lite_component;
            let lite_assigned = false;
            void lite_assigned;
            let lite_val = "";
            void lite_val;
            if (((lite_component) === ("igniter"))) {
                lite_assigned = true;
                lite_val = (lite_igniterRes).version;
            } else {
                const lite_field = liteFn$lib$util$json$findObjectField((lite_verRead).text, 0n, lite_component);
                void lite_field;
                if ((!((lite_field).found))) {
                    return { ok: false, hasTag: false, component: "", version: "", error: (((("versions.json: invalid or missing ") + (lite_component))) + (" version")) };
                }
                if (liteFn$lib$core$text$startsWithAt((lite_verRead).text, (lite_field).valuePos, "null")) {
                    lite_assigned = false;
                } else {
                    const lite_strRes = liteFn$lib$util$json$readStringAt((lite_verRead).text, (lite_field).valuePos);
                    void lite_strRes;
                    if ((((!((lite_strRes).ok))) || ((!(liteFn$lib$util$release$isValidSemver((lite_strRes).value)))))) {
                        return { ok: false, hasTag: false, component: "", version: "", error: (((("versions.json: invalid or missing ") + (lite_component))) + (" version")) };
                    }
                    if (((((lite_component) === ("vscode"))) && ((!(liteFn$lib$util$release$isPlainMajorMinorPatch((lite_strRes).value)))))) {
                        return { ok: false, hasTag: false, component: "", version: "", error: "vscode version requires plain MAJOR.MINOR.PATCH" };
                    }
                    lite_assigned = true;
                    lite_val = (lite_strRes).value;
                }
            }
            if (((lite_component) === (lite_wantComponent))) {
                if ((((!(lite_assigned))) || (((lite_val) !== (lite_wantVersion))))) {
                    const lite_authFile = (Boolean(((lite_component) === ("igniter"))) ? "igniter/package.json" : "versions.json");
                    void lite_authFile;
                    return { ok: false, hasTag: false, component: "", version: "", error: ((((((lite_component) + (" tag/version mismatch: update "))) + (lite_authFile))) + (" before tagging")) };
                }
                lite_matchedComponent = lite_component;
                lite_matchedVersion = lite_val;
            }
        }
        if (((lite_tag) === (""))) {
            return { ok: true, hasTag: false, component: "", version: "", error: "" };
        }
        return { ok: true, hasTag: true, component: lite_matchedComponent, version: lite_matchedVersion, error: "" };
    }
    void liteFn$lib$util$release$selectComponentRelease;
    function liteFn$lib$util$release$releaseProfile(lite_hasTag: boolean, lite_component: string, lite_version: string): string {
        void lite_hasTag;
        void lite_component;
        void lite_version;
        const lite_toolComponents: string[] = [...(["cli", "checker", "tester", "verifier", "benchmark", "release", "docs", "vscode", "formatter", "linker", "doctor"])];
        void lite_toolComponents;
        if ((((!(lite_hasTag))) || (liteFn$lib$core$list$listContainsText([...(lite_toolComponents)], lite_component)))) {
            return "tools";
        }
        if (((((((lite_component) === ("project"))) || (((lite_component) === ("language"))))) || (((lite_component) === ("scripting"))))) {
            return "language";
        }
        if (((((lite_component) === ("compiler"))) && (((liteFn$lib$core$text$indexOfText(lite_version, "-", 0n)) < (0n))))) {
            return "language";
        }
        return "compiler";
    }
    void liteFn$lib$util$release$releaseProfile;
    function liteFn_failCi(lite_message: string): void {
        void lite_message;
        lite$reportError(lite_message);
        lite$exit(1n);
    }
    void liteFn_failCi;
    function liteFn_invokeIn(lite_workDirToClean: string, lite_command: string, lite_args: string[], lite_cwd: string): void {
        void lite_workDirToClean;
        void lite_command;
        void lite_args;
        void lite_cwd;
        const lite_emptyEnv: string[] = [...([])];
        void lite_emptyEnv;
        const lite_res = lite$processRun(lite_command, [...(lite_args)], lite_cwd, [...(lite_emptyEnv)], false, "");
        void lite_res;
        if ((((((lite_res).error) !== (""))) || ((((lite_res).status) !== (0n))))) {
            if (((lite_workDirToClean) !== (""))) {
                lite$fileRemove(lite_workDirToClean);
            }
            if ((((lite_res).error) !== (""))) {
                liteFn_failCi((lite_res).error);
            }
            liteFn_failCi((((((("CI task failed: ") + (lite_command))) + (" "))) + (liteFn$lib$core$text$joinTexts([...(lite_args)], " "))));
        }
    }
    void liteFn_invokeIn;
    function liteFn_invoke(lite_command: string, lite_args: string[], lite_cwd: string): void {
        void lite_command;
        void lite_args;
        void lite_cwd;
        return (void (liteFn_invokeIn("", lite_command, [...(lite_args)], lite_cwd)));
    }
    void liteFn_invoke;
    function liteFn_invokeNode(lite_scriptArgs: string[], lite_cwd: string): void {
        void lite_scriptArgs;
        void lite_cwd;
        return (void (liteFn_invoke(lite$processExecPath(), [...(lite_scriptArgs)], lite_cwd)));
    }
    void liteFn_invokeNode;
    function liteFn_invokeLite(lite_root: string, lite_subArgs: string[]): void {
        void lite_root;
        void lite_subArgs;
        const lite_nodeArgs: string[] = [...([liteFn$lib$core$path$join(lite_root, "bin/lite")])];
        void lite_nodeArgs;
        for (const lite_arg of [...(lite_subArgs)]) {
            void lite_arg;
            lite_nodeArgs.push(lite_arg);
        }
        return (void (liteFn_invokeNode([...(lite_nodeArgs)], lite_root)));
    }
    void liteFn_invokeLite;
    function liteFn_countTextOccurrences(lite_items: string[], lite_target: string): bigint {
        void lite_items;
        void lite_target;
        let lite_count = 0n;
        void lite_count;
        for (const lite_item of [...(lite_items)]) {
            void lite_item;
            if (((lite_item) === (lite_target))) {
                lite_count = lite$addInt(lite_count, 1n, 1555);
            }
        }
        return lite_count;
    }
    void liteFn_countTextOccurrences;
    function liteFn_sameTextList(lite_left: string[], lite_right: string[]): boolean {
        void lite_left;
        void lite_right;
        const lite_count = liteFn$lib$core$list$listCountText([...(lite_left)]);
        void lite_count;
        if (((lite_count) !== (liteFn$lib$core$list$listCountText([...(lite_right)])))) {
            return false;
        }
        for (const lite_item of [...(lite_left)]) {
            void lite_item;
            if (((liteFn_countTextOccurrences([...(lite_left)], lite_item)) !== (liteFn_countTextOccurrences([...(lite_right)], lite_item)))) {
                return false;
            }
        }
        return true;
    }
    void liteFn_sameTextList;
    function liteFn_parseExecutedCount(lite_output: string): { ok: boolean; count: bigint } {
        void lite_output;
        const lite_marker = " executed, ";
        void lite_marker;
        const lite_pos = liteFn$lib$core$text$indexOfText(lite_output, lite_marker, 0n);
        void lite_pos;
        if (((lite_pos) <= (0n))) {
            return { ok: false, count: 0n };
        }
        let lite_start = lite_pos;
        void lite_start;
        while (((((lite_start) > (0n))) && (liteFn$lib$core$text$isDigit(lite$textAt(lite_output, lite$subtractInt(lite_start, 1n, 2189), 2167))))) {
            lite_start = lite$subtractInt(lite_start, 1n, 2219);
        }
        if (((lite_start) === (lite_pos))) {
            return { ok: false, count: 0n };
        }
        const lite_parsed = liteFn$lib$core$text$textToInt(lite$textSlice(lite_output, lite_start, lite_pos, 2315));
        void lite_parsed;
        return { ok: (lite_parsed).ok, count: (lite_parsed).value };
    }
    void liteFn_parseExecutedCount;
    function liteFn_collectFailureLines(lite_output: string): string[] {
        void lite_output;
        const lite_found: string[] = [...([])];
        void lite_found;
        const lite_size = lite$textLength(lite_output);
        void lite_size;
        let lite_pos = 0n;
        void lite_pos;
        while (((lite_pos) < (lite_size))) {
            const lite_nl = liteFn$lib$core$text$indexOfText(lite_output, "\n", lite_pos);
            void lite_nl;
            const lite_end = (Boolean(((lite_nl) < (0n))) ? lite_size : lite_nl);
            void lite_end;
            if (liteFn$lib$core$text$startsWithAt(lite_output, lite_pos, "FAIL ")) {
                lite_found.push(lite$textSlice(lite_output, lite_pos, lite_end, 2748));
            }
            if (((lite_nl) < (0n))) {
                break;
            }
            lite_pos = lite$addInt(lite_nl, 1n, 2835);
        }
        return [...(lite_found)];
    }
    void liteFn_collectFailureLines;
    function liteFn_verifyMigration(lite_root: string): void {
        void lite_root;
        const lite_cfgPath = liteFn$lib$core$path$join(lite_root, "config/ts-migration.json");
        void lite_cfgPath;
        const lite_cfgRead = liteFn$lib$core$file$readText(lite_cfgPath);
        void lite_cfgRead;
        if ((!((lite_cfgRead).ok))) {
            liteFn_failCi((lite_cfgRead).error);
        }
        const lite_expectedCount = liteFn$lib$util$json$readObjectInt((lite_cfgRead).text, 0n, "scenarios");
        void lite_expectedCount;
        if ((((!((lite_expectedCount).found))) || ((!((lite_expectedCount).ok))))) {
            liteFn_failCi("invalid config/ts-migration.json: scenarios");
        }
        const lite_failuresField = liteFn$lib$util$json$findObjectField((lite_cfgRead).text, 0n, "failures");
        void lite_failuresField;
        if ((!((lite_failuresField).found))) {
            liteFn_failCi("invalid config/ts-migration.json: failures");
        }
        const lite_expectedFailures: string[] = [...([])];
        void lite_expectedFailures;
        const lite_offsets: bigint[] = [...(liteFn$lib$util$json$arrayElementOffsets((lite_cfgRead).text, (lite_failuresField).valuePos))];
        void lite_offsets;
        for (const lite_off of [...(lite_offsets)]) {
            void lite_off;
            const lite_item = liteFn$lib$util$json$readStringAt((lite_cfgRead).text, lite_off);
            void lite_item;
            if ((!((lite_item).ok))) {
                liteFn_failCi("invalid failure entry in config/ts-migration.json");
            }
            lite_expectedFailures.push((lite_item).value);
        }
        const lite_verifyArgs: string[] = [...([liteFn$lib$core$path$join(lite_root, "bin/lite"), "verify", "--all", "--no-cache"])];
        void lite_verifyArgs;
        const lite_emptyEnv: string[] = [...([])];
        void lite_emptyEnv;
        const lite_res = lite$processRun(lite$processExecPath(), [...(lite_verifyArgs)], lite_root, [...(lite_emptyEnv)], true, "");
        void lite_res;
        if ((((lite_res).error) !== (""))) {
            liteFn_failCi((lite_res).error);
        }
        if ((((lite_res).stdout) !== (""))) {
            lite$emit((lite_res).stdout);
        }
        if ((((lite_res).stderr) !== (""))) {
            liteFn$lib$util$project$errorText((lite_res).stderr);
        }
        const lite_failures: string[] = [...(liteFn_collectFailureLines((lite_res).stdout))];
        void lite_failures;
        const lite_executed = liteFn_parseExecutedCount((lite_res).stdout);
        void lite_executed;
        if ((((!((lite_executed).ok))) || ((((lite_executed).count) !== ((lite_expectedCount).value))))) {
            liteFn_failCi("migration scenario inventory changed; review baseline");
        }
        if ((!(liteFn_sameTextList([...(lite_failures)], [...(lite_expectedFailures)])))) {
            liteFn_failCi("migration failures changed; review new support or regressions");
        }
        const lite_failCount = liteFn$lib$core$list$listCountText([...(lite_failures)]);
        void lite_failCount;
        const lite_expectedStatus = (Boolean(((lite_failCount) > (0n))) ? 1n : 0n);
        void lite_expectedStatus;
        if ((((lite_res).status) !== (lite_expectedStatus))) {
            liteFn_failCi("migration exit status mismatch");
        }
        const lite_passCount = liteFn$lib$core$int$intText(lite$subtractInt((lite_expectedCount).value, lite_failCount, 4752));
        void lite_passCount;
        const lite_failCountText = liteFn$lib$core$int$intText(lite_failCount);
        void lite_failCountText;
        lite$emit((((((((("Migration baseline unchanged: ") + (lite_passCount))) + (" pass; "))) + (lite_failCountText))) + (" accepted-language failures remain. This is not full conformance.")) + "\n");
    }
    void liteFn_verifyMigration;
    function liteFn_envValue(lite_name: string): string {
        void lite_name;
        const lite_res = lite$processEnvGet(lite_name);
        void lite_res;
        if ((lite_res).found) {
            return (lite_res).value;
        }
        return "";
    }
    void liteFn_envValue;
    function liteFn_releaseTag(): string {
        if (((((liteFn_envValue("GITHUB_EVENT_NAME")) === ("push"))) && (((liteFn_envValue("GITHUB_REF_TYPE")) === ("tag"))))) {
            return liteFn_envValue("GITHUB_REF_NAME");
        }
        return "";
    }
    void liteFn_releaseTag;
    function liteFn_releaseNeedsCompilerGates(lite_root: string): boolean {
        void lite_root;
        const lite_selected = liteFn$lib$util$release$selectComponentRelease(lite_root, liteFn_releaseTag());
        void lite_selected;
        if ((!((lite_selected).ok))) {
            liteFn_failCi((lite_selected).error);
        }
        return ((liteFn$lib$util$release$releaseProfile((lite_selected).hasTag, (lite_selected).component, (lite_selected).version)) !== ("tools"));
    }
    void liteFn_releaseNeedsCompilerGates;
    function liteFn_runSelfHost(lite_root: string): void {
        void lite_root;
        const lite_workRes = lite$fileMakeTempDir("lite-ci-self-host-");
        void lite_workRes;
        if ((!((lite_workRes).ok))) {
            liteFn_failCi((lite_workRes).error);
        }
        const lite_work = (lite_workRes).path;
        void lite_work;
        const lite_tarPath = liteFn$lib$core$path$join(lite_work, "source.tar");
        void lite_tarPath;
        const lite_archiveArgs: string[] = [...(["archive", "--format=tar", "-o", lite_tarPath, "HEAD"])];
        void lite_archiveArgs;
        liteFn_invokeIn(lite_work, "git", [...(lite_archiveArgs)], lite_root);
        const lite_untarArgs: string[] = [...(["-xf", lite_tarPath, "-C", lite_work])];
        void lite_untarArgs;
        liteFn_invokeIn(lite_work, "tar", [...(lite_untarArgs)], lite_work);
        lite$fileRemove(lite_tarPath);
        const lite_linkRes = lite$fileSymlink(liteFn$lib$core$path$join(lite_root, "igniter/node_modules"), liteFn$lib$core$path$join(lite_work, "igniter/node_modules"));
        void lite_linkRes;
        if ((!((lite_linkRes).ok))) {
            lite$fileRemove(lite_work);
            liteFn_failCi((lite_linkRes).error);
        }
        const lite_step1: string[] = [...(["bin/lite", "test", "--full"])];
        void lite_step1;
        const lite_step2: string[] = [...(["compiler/scripts/build.ts"])];
        void lite_step2;
        const lite_step3: string[] = [...(["compiler/scripts/self-host.ts", "--out", "dist/ladder"])];
        void lite_step3;
        const lite_step4: string[] = [...(["compiler/scripts/corpus-parity.ts", "--artifact", "dist/ladder/generation-3.ts"])];
        void lite_step4;
        liteFn_invokeIn(lite_work, lite$processExecPath(), [...(lite_step1)], lite_work);
        liteFn_invokeIn(lite_work, lite$processExecPath(), [...(lite_step2)], lite_work);
        liteFn_invokeIn(lite_work, lite$processExecPath(), [...(lite_step3)], lite_work);
        liteFn_invokeIn(lite_work, lite$processExecPath(), [...(lite_step4)], lite_work);
        const lite_cleanup = lite$fileRemove(lite_work);
        void lite_cleanup;
        if ((!((lite_cleanup).ok))) {
            lite$reportError((lite_cleanup).error);
        }
    }
    void liteFn_runSelfHost;
    function liteFn_runPublish(lite_root: string): void {
        void lite_root;
        if (((((liteFn_envValue("GITHUB_EVENT_NAME")) !== ("push"))) || (((liteFn_envValue("GITHUB_REF_TYPE")) !== ("tag"))))) {
            liteFn_failCi("publish requires a pushed tag event");
        }
        const lite_tag = liteFn_envValue("GITHUB_REF_NAME");
        void lite_tag;
        if (((lite_tag) === (""))) {
            liteFn_failCi("GITHUB_REF_NAME required for publish");
        }
        const lite_directory = liteFn$lib$core$path$join(lite_root, "dist/release");
        void lite_directory;
        const lite_manifestRead = liteFn$lib$core$file$readText(liteFn$lib$core$path$join(lite_directory, "manifest.json"));
        void lite_manifestRead;
        if ((!((lite_manifestRead).ok))) {
            liteFn_failCi((lite_manifestRead).error);
        }
        const lite_manifestTag = liteFn$lib$util$json$readObjectString((lite_manifestRead).text, 0n, "tag");
        void lite_manifestTag;
        if ((((((!((lite_manifestTag).found))) || ((!((lite_manifestTag).ok))))) || ((((lite_manifestTag).value) !== (lite_tag))))) {
            liteFn_failCi("release manifest tag does not match GITHUB_REF_NAME");
        }
        let lite_isPrerelease = false;
        void lite_isPrerelease;
        const lite_compField = liteFn$lib$util$json$findObjectField((lite_manifestRead).text, 0n, "releasedComponent");
        void lite_compField;
        if ((((lite_compField).found) && (liteFn$lib$core$text$startsWithAt((lite_manifestRead).text, (lite_compField).valuePos, "{")))) {
            const lite_compVer = liteFn$lib$util$json$readObjectString((lite_manifestRead).text, (lite_compField).valuePos, "version");
            void lite_compVer;
            if ((((((lite_compVer).found) && ((lite_compVer).ok))) && (((liteFn$lib$core$text$indexOfText((lite_compVer).value, "-", 0n)) >= (0n))))) {
                lite_isPrerelease = true;
            }
        }
        const lite_ghCreate: string[] = [...(["release", "create", lite_tag])];
        void lite_ghCreate;
        const lite_entries: string[] = [...(lite$fileListDir(lite_directory))];
        void lite_entries;
        for (const lite_entry of [...(lite_entries)]) {
            void lite_entry;
            lite_ghCreate.push(liteFn$lib$core$path$join(lite_directory, lite_entry));
        }
        lite_ghCreate.push("--draft");
        lite_ghCreate.push("--verify-tag");
        lite_ghCreate.push("--latest=false");
        lite_ghCreate.push("--title");
        lite_ghCreate.push(lite_tag);
        lite_ghCreate.push("--notes-file");
        lite_ghCreate.push(liteFn$lib$core$path$join(lite_directory, "RELEASE-NOTES.md"));
        if (lite_isPrerelease) {
            lite_ghCreate.push("--prerelease");
        }
        liteFn_invoke("gh", [...(lite_ghCreate)], lite_root);
        const lite_ghEdit: string[] = [...(["release", "edit", lite_tag, "--draft=false", "--latest=false"])];
        void lite_ghEdit;
        return (void (liteFn_invoke("gh", [...(lite_ghEdit)], lite_root)));
    }
    void liteFn_runPublish;
    function liteFn_runTask(lite_root: string, lite_task: string): void {
        void lite_root;
        void lite_task;
        if (((lite_task) === ("install"))) {
            const lite_npmArgs: string[] = [...(["ci", "--ignore-scripts", "--no-audit", "--no-fund"])];
            void lite_npmArgs;
            liteFn_invoke("npm", [...(lite_npmArgs)], liteFn$lib$core$path$join(lite_root, "igniter"));
            liteFn_invoke("npm", [...(lite_npmArgs)], liteFn$lib$core$path$join(lite_root, "editors/vscode"));
            return;
        }
        if (((((lite_task) === ("check"))) || (((lite_task) === ("release-doctor"))))) {
            const lite_args: string[] = [...(["doctor"])];
            void lite_args;
            liteFn_invokeLite(lite_root, [...(lite_args)]);
            return;
        }
        if (((lite_task) === ("test"))) {
            const lite_args: string[] = [...(["test", "--full"])];
            void lite_args;
            liteFn_invokeLite(lite_root, [...(lite_args)]);
            return;
        }
        if (((((lite_task) === ("editor"))) || (((lite_task) === ("release-editor"))))) {
            const lite_buildArgs: string[] = [...(["editors/vscode/scripts/build.ts"])];
            void lite_buildArgs;
            const lite_testArgs: string[] = [...(["--test", "editors/vscode/test/grammar.test.ts", "editors/vscode/test/extension.test.ts"])];
            void lite_testArgs;
            liteFn_invokeNode([...(lite_buildArgs)], lite_root);
            liteFn_invokeNode([...(lite_testArgs)], lite_root);
            return;
        }
        if (((lite_task) === ("site"))) {
            const lite_args: string[] = [...(["--test", "site/build.test.ts"])];
            void lite_args;
            liteFn_invokeNode([...(lite_args)], lite_root);
            return;
        }
        if (((lite_task) === ("coverage"))) {
            const lite_args: string[] = [...(["verify", "--coverage"])];
            void lite_args;
            liteFn_invokeLite(lite_root, [...(lite_args)]);
            return;
        }
        if (((lite_task) === ("migration"))) {
            liteFn_verifyMigration(lite_root);
            return;
        }
        if (((lite_task) === ("release-unit"))) {
            const lite_unitArgs: string[] = [...(["--test", "tools/docs.test.ts", "tools/cases.test.ts", "tools/cli.test.ts", "tools/fmt.test.ts", "tools/run.test.ts", "tools/release.test.ts", "compiler/scripts/release-streams.test.ts", "site/build.test.ts"])];
            void lite_unitArgs;
            liteFn_invokeNode([...(lite_unitArgs)], lite_root);
            return;
        }
        if (((lite_task) === ("release-regressions"))) {
            if (liteFn_releaseNeedsCompilerGates(lite_root)) {
                const lite_args: string[] = [...(["test", "--full"])];
                void lite_args;
                liteFn_invokeLite(lite_root, [...(lite_args)]);
            }
            return;
        }
        if (((lite_task) === ("release-coverage"))) {
            if (liteFn_releaseNeedsCompilerGates(lite_root)) {
                const lite_args: string[] = [...(["verify", "--coverage"])];
                void lite_args;
                liteFn_invokeLite(lite_root, [...(lite_args)]);
            }
            return;
        }
        if (((lite_task) === ("release-migration"))) {
            if (liteFn_releaseNeedsCompilerGates(lite_root)) {
                liteFn_verifyMigration(lite_root);
            }
            return;
        }
        if (((lite_task) === ("self-host"))) {
            liteFn_runSelfHost(lite_root);
            return;
        }
        if (((lite_task) === ("package"))) {
            const lite_tag = liteFn_releaseTag();
            void lite_tag;
            const lite_pkgArgs: string[] = [...([liteFn$lib$core$path$join(lite_root, "bin/lite-release"), liteFn$lib$core$path$join(lite_root, "dist/release")])];
            void lite_pkgArgs;
            if (((lite_tag) !== (""))) {
                lite_pkgArgs.push(lite_tag);
            }
            liteFn_invokeNode([...(lite_pkgArgs)], lite_root);
            return;
        }
        if (((lite_task) === ("publish"))) {
            liteFn_runPublish(lite_root);
            return;
        }
        return (void (liteFn_failCi((("unknown CI task: ") + (lite_task)))));
    }
    void liteFn_runTask;
    function liteFn_run(lite_rawArgs: string[]): void {
        void lite_rawArgs;
        const lite_args: string[] = [...(liteFn$lib$util$cli$stripLeadingSeparator([...(lite_rawArgs)]))];
        void lite_args;
        const lite_taskFile = liteFn$lib$util$cli$head([...(lite_args)]);
        void lite_taskFile;
        if (((((lite_taskFile) === (""))) || (((liteFn$lib$core$list$listCountText([...(liteFn$lib$util$cli$rest([...(lite_args)], 1n))])) > (0n))))) {
            liteFn_failCi("CI task file required");
        }
        const lite_taskRead = liteFn$lib$core$file$readText(lite_taskFile);
        void lite_taskRead;
        if ((!((lite_taskRead).ok))) {
            liteFn_failCi((lite_taskRead).error);
        }
        const lite_task = liteFn$lib$core$text$trim((lite_taskRead).text);
        void lite_task;
        const lite_root = liteFn$lib$util$project$findRepoRoot();
        void lite_root;
        if (((lite_root) === (""))) {
            liteFn_failCi("cannot locate repository root");
        }
        return (void (liteFn_runTask(lite_root, lite_task)));
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
