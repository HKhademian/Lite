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
function lite$fileListDir(path: string): string[] {
    return process.getBuiltinModule("node:fs").readdirSync(path).sort();
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
function lite$processEntryPath(): string { return process.argv[1] ?? ""; }
function lite$processPlatform(): string { return process.platform; }
function lite$processEnvGet(name: string): { found: boolean; value: string } {
    if (!Object.prototype.hasOwnProperty.call(process.env, name)) return { found: false, value: "" };
    const raw = process.env[name];
    return raw === undefined ? { found: false, value: "" } : { found: true, value: raw };
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

const lite$intLines: readonly number[] = [0, 76, 77, 101, 132, 160, 188, 214, 246, 280, 281, 319, 372, 373, 419, 527, 528, 603, 657, 703, 761, 785, 795, 871, 891, 897, 898, 944, 1006, 1007, 1023, 1081, 1101, 1107, 1108, 1129, 1181, 1205, 1242, 1266, 1276, 1309, 1329, 1335, 1336, 1393, 1422, 1501, 1521, 1527, 1561, 1564, 1565, 1586];
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
    function liteFn$lib$core$int$intMax(): bigint {
        return 9223372036854775807n;
    }
    void liteFn$lib$core$int$intMax;
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
        if (((lite$textAt(lite_text, 0n, 5616)) === ("-"))) {
            lite_negative = true;
            lite_position = 1n;
        } else if (((lite$textAt(lite_text, 0n, 5698)) === ("+"))) {
            lite_position = 1n;
        }
        if (((lite_position) >= (lite_size))) {
            return { value: 0n, ok: false };
        }
        let lite_value = 0n;
        void lite_value;
        while (((lite_position) < (lite_size))) {
            const lite_ch = lite$textAt(lite_text, lite_position, 5868);
            void lite_ch;
            if ((!(liteFn$lib$core$text$isDigit(lite_ch)))) {
                return { value: 0n, ok: false };
            }
            const lite_digit = liteFn$lib$core$text$digitValue(lite_ch);
            void lite_digit;
            if (lite_negative) {
                if (((lite_value) < (lite$divideInt((lite$addInt(liteFn$lib$core$int$intMin(), lite_digit, 6047)), 10n, 6056)))) {
                    return { value: 0n, ok: false };
                }
                lite_value = lite$subtractInt(lite$multiplyInt(lite_value, 10n, 6123), lite_digit, 6128);
            } else {
                if (((lite_value) > (lite$divideInt((lite$subtractInt(liteFn$lib$core$int$intMax(), lite_digit, 6195)), 10n, 6204)))) {
                    return { value: 0n, ok: false };
                }
                lite_value = lite$addInt(lite$multiplyInt(lite_value, 10n, 6271), lite_digit, 6276);
            }
            lite_position = lite$addInt(lite_position, 1n, 6323);
        }
        return { value: lite_value, ok: true };
    }
    void liteFn$lib$core$text$textToInt;
    function liteFn$lib$core$text$isWhitespace(lite_ch: string): boolean {
        void lite_ch;
        return ((((((((lite_ch) === (" "))) || (((lite_ch) === ("\t"))))) || (((lite_ch) === ("\r"))))) || (((lite_ch) === ("\n"))));
    }
    void liteFn$lib$core$text$isWhitespace;
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
        return liteFn$lib$core$text$startsWithAt(lite_source, lite$subtractInt(lite_sourceLen, lite_suffixLen, 7510), lite_suffix);
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
            lite_i = lite$addInt(lite_i, 1n, 7802);
        }
        return lite_out;
    }
    void liteFn$lib$core$text$repeatText;
    function liteFn$lib$core$text$containsText(lite_source: string, lite_needle: string): boolean {
        void lite_source;
        void lite_needle;
        return ((liteFn$lib$core$text$indexOfText(lite_source, lite_needle, 0n)) >= (0n));
    }
    void liteFn$lib$core$text$containsText;
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
