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
        writeSync(fd: number, buffer: Uint8Array, offset: number, length: number): number;
        openSync(path: string, flags: string): number;
        closeSync(fd: number): void;
        fstatSync(fd: number): { isFile(): boolean; isDirectory(): boolean };
        fsyncSync(fd: number): void;
        statSync(path: string): { isFile(): boolean; isDirectory(): boolean };
        readFileSync(path: string): Uint8Array;
        writeFileSync(path: string, data: string, encoding: "utf8"): void;
        writeFileSync(path: string, data: Uint8Array): void;
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
};
declare const TextDecoder: { new (label: string, options?: { fatal?: boolean }): { decode(input?: Uint8Array, options?: { stream?: boolean }): string } };
declare const TextEncoder: { new (): { encode(input?: string): Uint8Array } };

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
function lite$fileKind(path: string): string {
    try {
        const st = process.getBuiltinModule("node:fs").statSync(path);
        if (st.isFile()) return "file";
        if (st.isDirectory()) return "dir";
        return "other";
    } catch { return "missing"; }
}
type Lite$StreamHandle = { kind: string; handle: bigint };
type Lite$StreamEntry =
    | { kind: "file"; fd: number; eof: boolean; closed: boolean; error: string }
    | { kind: "bufferReader"; bytes: Uint8Array; pos: number; eof: boolean; closed: boolean; error: string }
    | { kind: "bufferWriter"; bytes: number[]; closed: boolean; error: string }
    | { kind: "error"; closed: boolean; error: string };
let lite$streams: Lite$StreamEntry[] = [];
let lite$stdinState = { eof: false, error: "" };
void lite$stdinState;
function lite$resetStreams(): void {
    const fs = process.getBuiltinModule("node:fs");
    for (const entry of lite$streams) {
        if (entry.kind === "file" && !entry.closed) { try { fs.closeSync(entry.fd); } catch {} entry.closed = true; }
    }
    lite$streams = [];
    lite$stdinState = { eof: false, error: "" };
}
function lite$allocStream(entry: Lite$StreamEntry): bigint {
    const id = BigInt(lite$streams.length + 10);
    lite$streams.push(entry);
    return id;
}
function lite$lookupStream(handle: bigint): Lite$StreamEntry | undefined {
    const index = Number(handle) - 10;
    if (index < 0 || index >= lite$streams.length) return undefined;
    return lite$streams[index];
}
function lite$fileOpenStream(path: string, flags: string, forWrite: boolean): Lite$StreamHandle {
    const fs = process.getBuiltinModule("node:fs");
    let fd = -1;
    try {
        fd = fs.openSync(path, flags);
        if (!forWrite && fs.fstatSync(fd).isDirectory()) {
            try { fs.closeSync(fd); } catch {}
            const msg = "EISDIR: illegal operation on a directory, open '" + path + "'";
            return { kind: "error", handle: lite$allocStream({ kind: "error", closed: false, error: msg }) };
        }
        return { kind: "file", handle: lite$allocStream({ kind: "file", fd, eof: false, closed: false, error: "" }) };
    } catch (error) {
        if (fd >= 0) { try { fs.closeSync(fd); } catch {} }
        return { kind: "error", handle: lite$allocStream({ kind: "error", closed: false, error: lite$errMsg(error) }) };
    }
}
function lite$fileOpenReader(path: string): Lite$StreamHandle { return lite$fileOpenStream(path, "r", false); }
function lite$ioReaderError(reader: Lite$StreamHandle): string {
    if (reader.kind === "stdin" && reader.handle === 0n) return lite$stdinState.error;
    const entry = lite$lookupStream(reader.handle);
    if (entry === undefined) return "invalid reader handle";
    if (entry.kind === "bufferWriter") return "handle is a writer, not a reader";
    if (entry.error !== "") return entry.error;
    if (entry.closed) return "reader is closed";
    return "";
}
function lite$ioReaderOk(reader: Lite$StreamHandle): boolean {
    if (reader.kind === "stdin" && reader.handle === 0n) return lite$stdinState.error === "";
    const entry = lite$lookupStream(reader.handle);
    return entry !== undefined && (entry.kind === "file" || entry.kind === "bufferReader") && !entry.closed && entry.error === "";
}
function lite$ioReaderAtEof(reader: Lite$StreamHandle): boolean {
    if (reader.kind === "stdin" && reader.handle === 0n) return lite$stdinState.eof;
    const entry = lite$lookupStream(reader.handle);
    if (entry !== undefined && (entry.kind === "file" || entry.kind === "bufferReader")) return entry.eof;
    return true;
}
function lite$readAllRaw(reader: Lite$StreamHandle): { ok: true; data: Uint8Array } | { ok: false; error: string } {
    if (!lite$ioReaderOk(reader)) return { ok: false, error: lite$ioReaderError(reader) };
    if (!(reader.kind === "stdin" && reader.handle === 0n)) {
        const entry = lite$lookupStream(reader.handle);
        if (entry === undefined) return { ok: false, error: "invalid reader handle" };
        if (entry.kind === "bufferReader") {
            const rest = entry.bytes.subarray(entry.pos);
            entry.pos = entry.bytes.length;
            entry.eof = true;
            return { ok: true, data: rest };
        }
        if (entry.kind !== "file") return { ok: false, error: "invalid reader handle" };
    }
    const fs = process.getBuiltinModule("node:fs");
    const chunks: Uint8Array[] = [];
    let total = 0;
    const buf = new Uint8Array(65536);
    while (!lite$ioReaderAtEof(reader)) {
        const fd = reader.kind === "stdin" ? 0 : (lite$lookupStream(reader.handle) as { fd: number }).fd;
        try {
            const read = fs.readSync(fd, buf, 0, buf.length, null);
            if (read === 0) {
                if (reader.kind === "stdin") lite$stdinState.eof = true;
                else { const e = lite$lookupStream(reader.handle); if (e && e.kind === "file") e.eof = true; }
                break;
            }
            chunks.push(buf.slice(0, read));
            total += read;
        } catch (error) {
            const msg = lite$errMsg(error);
            if (reader.kind === "stdin") lite$stdinState.error = msg;
            else { const e = lite$lookupStream(reader.handle); if (e && e.kind === "file") e.error = msg; }
            return { ok: false, error: msg };
        }
    }
    const merged = new Uint8Array(total);
    let off = 0;
    for (const chunk of chunks) { merged.set(chunk, off); off += chunk.length; }
    return { ok: true, data: merged };
}
function lite$ioReadAll(reader: Lite$StreamHandle): bigint[] {
    const raw = lite$readAllRaw(reader);
    return raw.ok ? lite$fromBytes(raw.data) : [];
}
function lite$ioCloseReader(reader: Lite$StreamHandle): { ok: boolean; error: string } {
    if (reader.kind === "stdin" && reader.handle === 0n) return { ok: true, error: "" };
    const entry = lite$lookupStream(reader.handle);
    if (entry === undefined) return { ok: false, error: "invalid reader handle" };
    if (entry.kind === "error") return { ok: false, error: entry.error };
    if (entry.kind === "bufferWriter") return { ok: false, error: "handle is a writer, not a reader" };
    if (entry.kind === "file" && !entry.closed) {
        try { process.getBuiltinModule("node:fs").closeSync(entry.fd); }
        catch (error) { entry.closed = true; return { ok: false, error: lite$errMsg(error) }; }
    }
    entry.closed = true;
    return { ok: true, error: "" };
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

function lite$unicodeFromCodePoints(points: readonly bigint[]): { ok: boolean; text: string; error: string } {
    let text = "";
    let chunk = "";
    for (let i = 0; i < points.length; i += 1) {
        const point = points[i];
        if (point === undefined || point < 0n || point > 1114111n || (point >= 55296n && point <= 57343n)) {
            return { ok: false, text: "", error: "invalid Unicode scalar code point: " + String(point) };
        }
        chunk += String.fromCodePoint(Number(point));
        if (chunk.length >= 4096) { text += chunk; chunk = ""; }
    }
    return { ok: true, text: text + chunk, error: "" };
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

const lite$intLines: readonly number[] = [0, 101, 102, 126, 152, 183, 211, 239, 267, 293, 327, 328, 367, 395, 423, 451, 480, 512, 563, 592, 619, 626, 636, 639, 640, 699, 733, 807, 831, 868, 888, 894, 922, 975, 1043, 1088, 1169, 1189, 1195, 1227, 1257, 1307, 1358, 1411, 1462, 1528, 1550, 1556, 1566, 1569, 1570, 1608, 1663, 1704, 1779, 1785, 1786, 1849, 1919, 1973, 2028, 2114, 2191, 2292, 2312, 2318, 2319, 2392, 2424, 2496, 2562, 2563, 2624, 2674, 2730, 2793, 2799, 2847, 2924, 2986, 2992, 2993, 3029, 3124, 3200, 3227, 3271, 3277, 3363, 3448, 3474, 3514, 3551, 3561, 3581, 3587, 3619, 3648, 3692, 3709, 3744, 3787, 3797, 3803, 3828, 3831, 3832, 3853];
const lite$intSource = "tools/src/test-runner.lts:";
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
    lite$resetStreams();
    function lite$emit(text: string): void {
        if (lite$write === undefined) lite$out += text;
        else lite$write(text);
    }
    void lite$emit;
    function liteFn$lib$core$int$intMin(): bigint {
        return (-9223372036854775808n);
    }
    void liteFn$lib$core$int$intMin;
    function liteFn$lib$core$int$digitChar(lite_digit: bigint): string {
        void lite_digit;
        return (Boolean(((lite_digit) === (0n))) ? "0" : (Boolean(((lite_digit) === (1n))) ? "1" : (Boolean(((lite_digit) === (2n))) ? "2" : (Boolean(((lite_digit) === (3n))) ? "3" : (Boolean(((lite_digit) === (4n))) ? "4" : (Boolean(((lite_digit) === (5n))) ? "5" : (Boolean(((lite_digit) === (6n))) ? "6" : (Boolean(((lite_digit) === (7n))) ? "7" : (Boolean(((lite_digit) === (8n))) ? "8" : "9")))))))));
    }
    void liteFn$lib$core$int$digitChar;
    function liteFn$lib$core$int$intText(lite_value: bigint): string {
        void lite_value;
        if (((lite_value) === (0n))) {
            return "0";
        }
        if (((lite_value) === (liteFn$lib$core$int$intMin()))) {
            return "-9223372036854775808";
        }
        if (((lite_value) < (0n))) {
            return (("-") + (liteFn$lib$core$int$intText(lite$subtractInt(0n, lite_value, 4091))));
        }
        let lite_remaining = lite_value;
        void lite_remaining;
        let lite_digits = "";
        void lite_digits;
        while (((lite_remaining) > (0n))) {
            const lite_digit = lite$remainderInt(lite_remaining, 10n, 4205);
            void lite_digit;
            lite_digits = ((liteFn$lib$core$int$digitChar(lite_digit)) + (lite_digits));
            lite_remaining = lite$divideInt(lite_remaining, 10n, 4285);
        }
        return lite_digits;
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
    function liteFn$lib$core$text$startsWithAt(lite_source: string, lite_position: bigint, lite_text: string): boolean {
        void lite_source;
        void lite_position;
        void lite_text;
        const lite_width = lite$textLength(lite_text);
        void lite_width;
        const lite_size = lite$textLength(lite_source);
        void lite_size;
        if (((((lite_position) < (0n))) || (((lite$addInt(lite_position, lite_width, 4130)) > (lite_size))))) {
            return false;
        }
        if (((lite_width) === (0n))) {
            return true;
        }
        if (((lite$textAt(lite_source, lite_position, 4205)) !== (lite$textAt(lite_text, 0n, 4230)))) {
            return false;
        }
        if (((lite_width) === (1n))) {
            return true;
        }
        return ((lite$textSlice(lite_source, lite_position, lite$addInt(lite_position, lite_width, 4332), 4299)) === (lite_text));
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
    function liteFn$lib$core$text$lowerAsciiChar(lite_ch: string): string {
        void lite_ch;
        if (((lite_ch) === ("A"))) {
            return "a";
        }
        if (((lite_ch) === ("B"))) {
            return "b";
        }
        if (((lite_ch) === ("C"))) {
            return "c";
        }
        if (((lite_ch) === ("D"))) {
            return "d";
        }
        if (((lite_ch) === ("E"))) {
            return "e";
        }
        if (((lite_ch) === ("F"))) {
            return "f";
        }
        if (((lite_ch) === ("G"))) {
            return "g";
        }
        if (((lite_ch) === ("H"))) {
            return "h";
        }
        if (((lite_ch) === ("I"))) {
            return "i";
        }
        if (((lite_ch) === ("J"))) {
            return "j";
        }
        if (((lite_ch) === ("K"))) {
            return "k";
        }
        if (((lite_ch) === ("L"))) {
            return "l";
        }
        if (((lite_ch) === ("M"))) {
            return "m";
        }
        if (((lite_ch) === ("N"))) {
            return "n";
        }
        if (((lite_ch) === ("O"))) {
            return "o";
        }
        if (((lite_ch) === ("P"))) {
            return "p";
        }
        if (((lite_ch) === ("Q"))) {
            return "q";
        }
        if (((lite_ch) === ("R"))) {
            return "r";
        }
        if (((lite_ch) === ("S"))) {
            return "s";
        }
        if (((lite_ch) === ("T"))) {
            return "t";
        }
        if (((lite_ch) === ("U"))) {
            return "u";
        }
        if (((lite_ch) === ("V"))) {
            return "v";
        }
        if (((lite_ch) === ("W"))) {
            return "w";
        }
        if (((lite_ch) === ("X"))) {
            return "x";
        }
        if (((lite_ch) === ("Y"))) {
            return "y";
        }
        if (((lite_ch) === ("Z"))) {
            return "z";
        }
        return lite_ch;
    }
    void liteFn$lib$core$text$lowerAsciiChar;
    function liteFn$lib$core$text$toLowerAscii(lite_source: string): string {
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
            const lite_ch = lite$textAt(lite_source, lite_i, 9241);
            void lite_ch;
            const lite_lower = liteFn$lib$core$text$lowerAsciiChar(lite_ch);
            void lite_lower;
            if (((lite_lower) !== (lite_ch))) {
                if (((lite_i) > (lite_runStart))) {
                    lite_out = ((lite_out) + (lite$textSlice(lite_source, lite_runStart, lite_i, 9361)));
                }
                lite_out = ((lite_out) + (lite_lower));
                lite_runStart = lite$addInt(lite_i, 1n, 9447);
            }
            lite_i = lite$addInt(lite_i, 1n, 9476);
        }
        if (((lite_runStart) === (0n))) {
            return lite_source;
        }
        if (((lite_runStart) < (lite_size))) {
            lite_out = ((lite_out) + (lite$textSlice(lite_source, lite_runStart, lite_size, 9564)));
        }
        return lite_out;
    }
    void liteFn$lib$core$text$toLowerAscii;
    function liteFn$lib$core$unicode$utf8DecodeInternal(lite_bytes: bigint[], lite_strict: boolean): { ok: boolean; text: string; error: string } {
        void lite_bytes;
        void lite_strict;
        const lite_count = liteFn$lib$core$list$listCountInt([...(lite_bytes)]);
        void lite_count;
        let lite_points: bigint[] = [...([...([])])];
        void lite_points;
        let lite_needed = 0n;
        void lite_needed;
        let lite_seen = 0n;
        void lite_seen;
        let lite_codePoint = 0n;
        void lite_codePoint;
        let lite_lowerBoundary = 128n;
        void lite_lowerBoundary;
        let lite_upperBoundary = 191n;
        void lite_upperBoundary;
        let lite_index = 0n;
        void lite_index;
        while (((lite_index) < (lite_count))) {
            const lite_b = lite$listAt((lite_bytes), lite_index, 4445);
            void lite_b;
            if (((((lite_b) < (0n))) || (((lite_b) > (255n))))) {
                if (lite_strict) {
                    return { ok: false, text: "", error: (("byte value outside 0..255: ") + (liteFn$lib$core$int$intText(lite_b))) };
                }
                lite_codePoint = 0n;
                lite_needed = 0n;
                lite_seen = 0n;
                lite_lowerBoundary = 128n;
                lite_upperBoundary = 191n;
                lite_points.push(65533n);
                lite_index = lite$addInt(lite_index, 1n, 4832);
            } else if (((lite_needed) === (0n))) {
                if (((lite_b) <= (127n))) {
                    lite_points.push(lite_b);
                } else if (((((lite_b) >= (194n))) && (((lite_b) <= (223n))))) {
                    lite_needed = 1n;
                    lite_codePoint = lite$subtractInt(lite_b, 192n, 5046);
                } else if (((((lite_b) >= (224n))) && (((lite_b) <= (239n))))) {
                    if (((lite_b) === (224n))) {
                        lite_lowerBoundary = 160n;
                    }
                    if (((lite_b) === (237n))) {
                        lite_upperBoundary = 159n;
                    }
                    lite_needed = 2n;
                    lite_codePoint = lite$subtractInt(lite_b, 224n, 5263);
                } else if (((((lite_b) >= (240n))) && (((lite_b) <= (244n))))) {
                    if (((lite_b) === (240n))) {
                        lite_lowerBoundary = 144n;
                    }
                    if (((lite_b) === (244n))) {
                        lite_upperBoundary = 143n;
                    }
                    lite_needed = 3n;
                    lite_codePoint = lite$subtractInt(lite_b, 240n, 5480);
                } else {
                    if (lite_strict) {
                        return { ok: false, text: "", error: "invalid UTF-8 lead byte" };
                    }
                    lite_points.push(65533n);
                }
                lite_index = lite$addInt(lite_index, 1n, 5723);
            } else if (((((lite_b) < (lite_lowerBoundary))) || (((lite_b) > (lite_upperBoundary))))) {
                if (lite_strict) {
                    return { ok: false, text: "", error: "invalid UTF-8 continuation byte" };
                }
                lite_codePoint = 0n;
                lite_needed = 0n;
                lite_seen = 0n;
                lite_lowerBoundary = 128n;
                lite_upperBoundary = 191n;
                lite_points.push(65533n);
            } else {
                lite_lowerBoundary = 128n;
                lite_upperBoundary = 191n;
                lite_codePoint = lite$addInt(lite$multiplyInt(lite_codePoint, 64n, 6219), (lite$subtractInt(lite_b, 128n, 6229)), 6224);
                lite_seen = lite$addInt(lite_seen, 1n, 6254);
                if (((lite_seen) === (lite_needed))) {
                    lite_points.push(lite_codePoint);
                    lite_codePoint = 0n;
                    lite_needed = 0n;
                    lite_seen = 0n;
                }
                lite_index = lite$addInt(lite_index, 1n, 6463);
            }
        }
        if (((lite_needed) > (0n))) {
            if (lite_strict) {
                return { ok: false, text: "", error: "truncated UTF-8 sequence" };
            }
            lite_points.push(65533n);
        }
        return lite$unicodeFromCodePoints([...(lite_points)]);
    }
    void liteFn$lib$core$unicode$utf8DecodeInternal;
    function liteFn$lib$core$unicode$utf8DecodeStrict(lite_bytes: bigint[]): { ok: boolean; text: string; error: string } {
        void lite_bytes;
        return liteFn$lib$core$unicode$utf8DecodeInternal([...(lite_bytes)], true);
    }
    void liteFn$lib$core$unicode$utf8DecodeStrict;
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
    function liteFn$lib$util$json$readStringAt(lite_source: string, lite_start: bigint): { ok: boolean; value: string; next: bigint; error: string } {
        void lite_source;
        void lite_start;
        const lite_pos = liteFn$lib$util$json$skipJsonSpaces(lite_source, lite_start);
        void lite_pos;
        return liteFn$lib$util$json$scanStringToken(lite_source, lite_pos, true);
    }
    void liteFn$lib$util$json$readStringAt;
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
    function liteFn$lib$core$io$readAll(lite_reader: { kind: string; handle: bigint }): bigint[] {
        void lite_reader;
        return lite$ioReadAll(lite_reader);
    }
    void liteFn$lib$core$io$readAll;
    const lite$m$lib$core$diag$sourceErrorCategory = "SourceError";
    void lite$m$lib$core$diag$sourceErrorCategory;
    const lite$m$lib$core$diag$typeErrorCategory = "TypeError";
    void lite$m$lib$core$diag$typeErrorCategory;
    function liteFn$lib$core$file$readText(lite_path: string): { ok: boolean; text: string; error: string } {
        void lite_path;
        const lite_reader = lite$fileOpenReader(lite_path);
        void lite_reader;
        if ((!(lite$ioReaderOk(lite_reader)))) {
            return { ok: false, text: "", error: lite$ioReaderError(lite_reader) };
        }
        const lite_bytes: bigint[] = [...(liteFn$lib$core$io$readAll(lite_reader))];
        void lite_bytes;
        const lite_readErr = lite$ioReaderError(lite_reader);
        void lite_readErr;
        const lite_closed = lite$ioCloseReader(lite_reader);
        void lite_closed;
        if (((lite_readErr) !== (""))) {
            return { ok: false, text: "", error: lite_readErr };
        }
        if ((!((lite_closed).ok))) {
            return { ok: false, text: "", error: (lite_closed).error };
        }
        return liteFn$lib$core$unicode$utf8DecodeStrict([...(lite_bytes)]);
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
    function liteFn$lib$util$cli$pickSingleOption(lite_args: string[], lite_choices: string[]): { ok: boolean; value: string } {
        void lite_args;
        void lite_choices;
        let lite_picked = "";
        void lite_picked;
        for (const lite_arg of [...(lite_args)]) {
            void lite_arg;
            if (((lite_arg) === ("--"))) {
                break;
            }
            if (liteFn$lib$core$list$listContainsText([...(lite_choices)], lite_arg)) {
                if (((lite_picked) !== (""))) {
                    return { ok: false, value: "" };
                }
                lite_picked = lite_arg;
            }
        }
        return { ok: true, value: lite_picked };
    }
    void liteFn$lib$util$cli$pickSingleOption;
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
    function liteFn$lib$util$project$forwardNode(lite_scriptRelPath: string, lite_args: string[]): void {
        void lite_scriptRelPath;
        void lite_args;
        const lite_root = liteFn$lib$util$project$findRepoRoot();
        void lite_root;
        const lite_scriptPath = (Boolean(((lite_root) === (""))) ? lite_scriptRelPath : liteFn$lib$core$path$resolve(lite_root, lite_scriptRelPath));
        void lite_scriptPath;
        const lite_nodeArgs: string[] = [...([lite_scriptPath])];
        void lite_nodeArgs;
        for (const lite_arg of [...(lite_args)]) {
            void lite_arg;
            lite_nodeArgs.push(lite_arg);
        }
        const lite_emptyEnv: string[] = [...([])];
        void lite_emptyEnv;
        const lite_res = lite$processRun(lite$processExecPath(), [...(lite_nodeArgs)], "", [...(lite_emptyEnv)], false, "");
        void lite_res;
        if ((((lite_res).error) !== (""))) {
            lite$reportError((lite_res).error);
            lite$exit(1n);
        }
        lite$exit((lite_res).status);
    }
    void liteFn$lib$util$project$forwardNode;
    function liteFn_smokeTestFiles(): string[] {
        const lite_files: string[] = [...(["../tools/cli.test.ts", "../tools/run.test.ts", "../tools/docs.test.ts", "../tools/release.test.ts", "../compiler/scripts/release-streams.test.ts", "../site/build.test.ts", "source-files.test.ts"])];
        void lite_files;
        return [...(lite_files)];
    }
    void liteFn_smokeTestFiles;
    function liteFn_readGeneratedTestFiles(lite_root: string): string[] {
        void lite_root;
        const lite_files: string[] = [...([])];
        void lite_files;
        const lite_readRes = liteFn$lib$core$file$readText(liteFn$lib$core$path$resolve(lite_root, "igniter/test-suites.ts"));
        void lite_readRes;
        if ((!((lite_readRes).ok))) {
            lite$reportError((lite_readRes).error);
            return lite$exit(1n);
        }
        const lite_source = (lite_readRes).text;
        void lite_source;
        const lite_openBracket = liteFn$lib$core$text$indexOfText(lite_source, "[", 0n);
        void lite_openBracket;
        const lite_closeBracket = liteFn$lib$core$text$indexOfText(lite_source, "]", lite$addInt(lite_openBracket, 1n, 1037));
        void lite_closeBracket;
        if (((((lite_openBracket) < (0n))) || (((lite_closeBracket) < (0n))))) {
            lite$reportError("igniter/test-suites.ts: missing generatedTestFiles list");
            return lite$exit(1n);
        }
        let lite_pos = lite$addInt(lite_openBracket, 1n, 1222);
        void lite_pos;
        while (((lite_pos) < (lite_closeBracket))) {
            const lite_q1 = liteFn$lib$core$text$indexOfText(lite_source, "'", lite_pos);
            void lite_q1;
            if (((((lite_q1) < (0n))) || (((lite_q1) >= (lite_closeBracket))))) {
                break;
            }
            const lite_q2 = liteFn$lib$core$text$indexOfText(lite_source, "'", lite$addInt(lite_q1, 1n, 1405));
            void lite_q2;
            if (((((lite_q2) < (0n))) || (((lite_q2) >= (lite_closeBracket))))) {
                break;
            }
            lite_files.push(lite$textSlice(lite_source, lite$addInt(lite_q1, 1n, 1517), lite_q2, 1495));
            lite_pos = lite$addInt(lite_q2, 1n, 1545);
        }
        return [...(lite_files)];
    }
    void liteFn_readGeneratedTestFiles;
    function liteFn_run(lite_args: string[]): void {
        void lite_args;
        liteFn$lib$util$project$handleVersionFlag([...(lite_args)], "tester", "test");
        if (liteFn$lib$util$cli$startsWith([...(lite_args)], "--cases")) {
            liteFn$lib$util$project$forwardNode("tools/generated/test.ts", [...(liteFn$lib$util$cli$rest([...(lite_args)], 1n))]);
        }
        const lite_modeFlags: string[] = [...(["--smoke", "--fast", "--full"])];
        void lite_modeFlags;
        const lite_outputFlags: string[] = [...(["--verbose", "--mute", "--silence"])];
        void lite_outputFlags;
        const lite_modeOpt = liteFn$lib$util$cli$pickSingleOption([...(lite_args)], [...(lite_modeFlags)]);
        void lite_modeOpt;
        const lite_outOpt = liteFn$lib$util$cli$pickSingleOption([...(lite_args)], [...(lite_outputFlags)]);
        void lite_outOpt;
        const lite_leftover: string[] = [...(liteFn$lib$util$cli$withoutOptions([...(liteFn$lib$util$cli$withoutOptions([...(lite_args)], [...(lite_modeFlags)]))], [...(lite_outputFlags)]))];
        void lite_leftover;
        if ((((((!((lite_modeOpt).ok))) || ((!((lite_outOpt).ok))))) || (((liteFn$lib$core$list$listCountText([...(lite_leftover)])) > (0n))))) {
            lite$reportError("Usage: ./bin/lite test [--smoke|--fast|--full] [--verbose|--mute|--silence]");
            lite$exit(2n);
        }
        const lite_mode = (Boolean((((lite_modeOpt).value) === (""))) ? "--smoke" : (lite_modeOpt).value);
        void lite_mode;
        const lite_outputMode = (lite_outOpt).value;
        void lite_outputMode;
        const lite_reporter = (Boolean(((lite_outputMode) === ("--verbose"))) ? "spec" : "dot");
        void lite_reporter;
        const lite_quiet = ((((lite_outputMode) === ("--mute"))) || (((lite_outputMode) === ("--silence"))));
        void lite_quiet;
        const lite_envOverrides: string[] = [...(["=NODE_TEST_CONTEXT"])];
        void lite_envOverrides;
        const lite_nativeVar = lite$processEnvGet("LITE_TEST_NATIVE");
        void lite_nativeVar;
        if ((((!((lite_nativeVar).found))) || ((((lite_nativeVar).value) !== ("1"))))) {
            lite_envOverrides.push("LITE_SKIP_NATIVE=1");
        }
        const lite_heavyVar = lite$processEnvGet("LITE_TEST_HEAVY");
        void lite_heavyVar;
        if (((((lite_mode) === ("--fast"))) && (((((!((lite_heavyVar).found))) || ((((lite_heavyVar).value) !== ("1")))))))) {
            lite_envOverrides.push("LITE_SKIP_HEAVY=1");
        }
        const lite_root = liteFn$lib$util$project$findRepoRoot();
        void lite_root;
        const lite_suites: string[] = [...((Boolean(((lite_mode) === ("--smoke"))) ? [...(liteFn_smokeTestFiles())] : [...(liteFn_readGeneratedTestFiles(lite_root))]))];
        void lite_suites;
        const lite_nodeArgs: string[] = [...(["--test", (("--test-reporter=") + (lite_reporter))])];
        void lite_nodeArgs;
        for (const lite_suite of [...(lite_suites)]) {
            void lite_suite;
            lite_nodeArgs.push(lite_suite);
        }
        const lite_igniterDir = (Boolean(((lite_root) === (""))) ? "igniter" : liteFn$lib$core$path$resolve(lite_root, "igniter"));
        void lite_igniterDir;
        const lite_res = lite$processRun(lite$processExecPath(), [...(lite_nodeArgs)], lite_igniterDir, [...(lite_envOverrides)], lite_quiet, "");
        void lite_res;
        if ((((lite_res).error) !== (""))) {
            if (((lite_outputMode) !== ("--silence"))) {
                lite$reportError((lite_res).error);
            }
            lite$exit(1n);
        }
        if (((lite_outputMode) === ("--mute"))) {
            if ((((lite_res).status) === (0n))) {
                lite$emit("Tests passed." + "\n");
            } else {
                lite$emit((lite_res).stdout);
                liteFn$lib$util$project$errorText((lite_res).stderr);
            }
        }
        lite$exit((lite_res).status);
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
