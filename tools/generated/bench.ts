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
    hrtime: { bigint(): bigint };
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
        spawnSync(command: string, args: readonly string[], options: { cwd?: string; env: Record<string, string | undefined>; input: Uint8Array; stdio: readonly ["pipe", "pipe", "pipe"]; timeout?: number; maxBuffer: number }): { status: number | null; signal: string | null; stdout: Uint8Array | null; stderr: Uint8Array | null; error?: Error };
    };
    getBuiltinModule(name: "node:crypto"): {
        createHash(algorithm: string): { update(data: Uint8Array): { digest(encoding: "hex"): string }; update(data: string, inputEncoding: "utf8"): { digest(encoding: "hex"): string } };
        createHmac(algorithm: string, key: Uint8Array): { update(data: Uint8Array): { digest(encoding: "hex"): string } };
        randomBytes(size: number): Uint8Array;
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
function lite$fileWriteBytes(path: string, bytes: readonly bigint[]): { ok: boolean; error: string } {
    try { process.getBuiltinModule("node:fs").writeFileSync(path, lite$toBytes(bytes)); return { ok: true, error: "" }; }
    catch (error) { return { ok: false, error: lite$errMsg(error) }; }
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
function lite$timeMonotonicNs(): bigint { return process.hrtime.bigint(); }

let lite$utf8Encoder: { encode(input?: string): Uint8Array } | undefined;
function lite$unicodeUtf8Encode(text: string): bigint[] {
    const encoder = lite$utf8Encoder ?? (lite$utf8Encoder = new TextEncoder());
    return lite$fromBytes(encoder.encode(text));
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

const lite$intLines: readonly number[] = [0, 79, 80, 104, 130, 161, 193, 223, 251, 285, 313, 341, 369, 395, 429, 457, 487, 521, 522, 567, 612, 641, 688, 729, 750, 778, 807, 834, 840, 882, 885, 886, 932, 961, 990, 1013, 1038, 1076, 1109, 1115, 1139, 1165, 1185, 1213, 1252, 1281, 1295, 1318, 1328, 1374, 1408, 1428, 1456, 1487, 1536, 1550, 1573, 1583, 1611, 1658, 1695, 1705, 1733, 1775, 1812, 1822, 1828, 1836, 1839, 1840, 1892, 1929, 1952, 1953, 1998, 2024, 2139, 2189, 2233, 2269, 2320, 2408, 2443, 2502, 2524, 2559, 2626, 2685, 2707, 2762, 2813, 2872, 2894, 2912, 2926, 2936, 2942, 2978, 2981, 2982, 3069, 3102, 3178, 3253, 3340, 3443, 3503, 3608, 3694, 3782, 3869, 3938, 4032, 4038, 4099, 4156, 4219, 4264, 4267, 4268, 4306, 4365, 4416, 4464, 4502, 4561, 4581, 4587, 4588, 4643, 4705, 4755, 4838, 4858, 4864, 4865, 4901, 4921, 4990, 5010, 5016, 5017, 5072, 5099, 5139, 5159, 5165, 5219, 5220, 5260, 5293, 5345, 5370, 5408, 5432, 5442, 5473, 5506, 5576, 5604, 5618, 5679, 5709, 5752, 5780, 5794, 5821, 5866, 5931, 5959, 5999, 6075, 6112, 6162, 6198, 6220, 6251, 6269, 6316, 6344, 6384, 6430, 6506, 6552, 6589, 6639, 6675, 6697, 6756, 6787, 6805, 6852, 6919, 6920, 6969, 7014, 7091, 7109, 7110, 7139, 7195, 7256, 7317, 7369, 7435, 7513, 7587, 7610, 7665, 7698, 7712, 7722, 7728, 7729, 7781, 7807, 7860, 7880, 7886, 7887, 7920, 7993, 8023, 8052, 8068, 8123, 8193, 8249, 8353, 8377, 8387, 8452, 8453, 8513, 8585, 8643, 8742, 8766, 8776, 8860, 8866, 8867, 8909, 8932, 8968, 8988, 8994, 9033, 9057, 9094, 9114, 9120, 9165, 9166, 9215, 9237, 9272, 9292, 9298, 9348, 9431, 9451, 9457, 9458, 9573, 9593, 9637, 9679, 9730, 9782, 9846, 9906, 9990, 10003, 10004, 10047, 10069, 10104, 10124, 10130, 10226, 10229, 10230, 10251];
const lite$intSource = "tools/src/bench.lts:";
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
    function liteFn$lib$core$unicode$utf8Encode(lite_text: string): bigint[] {
        void lite_text;
        return lite$unicodeUtf8Encode(lite_text);
    }
    void liteFn$lib$core$unicode$utf8Encode;
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
    const lite$m$lib$core$file$FILE_KIND_MISSING = "missing";
    void lite$m$lib$core$file$FILE_KIND_MISSING;
    const lite$m$lib$core$file$FILE_KIND_FILE = "file";
    void lite$m$lib$core$file$FILE_KIND_FILE;
    const lite$m$lib$core$file$FILE_KIND_DIR = "dir";
    void lite$m$lib$core$file$FILE_KIND_DIR;
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
    function liteFn$lib$core$file$writeBytes(lite_path: string, lite_bytes: bigint[]): { ok: boolean; error: string } {
        void lite_path;
        void lite_bytes;
        return lite$fileWriteBytes(lite_path, lite_bytes);
    }
    void liteFn$lib$core$file$writeBytes;
    function liteFn$lib$core$file$writeText(lite_path: string, lite_text: string): { ok: boolean; error: string } {
        void lite_path;
        void lite_text;
        return lite$fileWriteText(lite_path, lite_text);
    }
    void liteFn$lib$core$file$writeText;
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
    function liteFn$lib$core$path$copyFiltered(lite_srcDir: string, lite_dstDir: string, lite_topSkipNames: string[], lite_nestedSkipNames: string[]): { ok: boolean; error: string } {
        void lite_srcDir;
        void lite_dstDir;
        void lite_topSkipNames;
        void lite_nestedSkipNames;
        const lite_mkRoot = lite$fileMakeDir(lite_dstDir);
        void lite_mkRoot;
        if ((!((lite_mkRoot).ok))) {
            return { ok: false, error: (lite_mkRoot).error };
        }
        const lite_srcStack: string[] = [...([])];
        void lite_srcStack;
        const lite_dstStack: string[] = [...([])];
        void lite_dstStack;
        const lite_depthStack: bigint[] = [...([])];
        void lite_depthStack;
        let lite_stackCount = 0n;
        void lite_stackCount;
        lite_srcStack.push(lite_srcDir);
        lite_dstStack.push(lite_dstDir);
        lite_depthStack.push(0n);
        lite_stackCount = 1n;
        while (((lite_stackCount) > (0n))) {
            const lite_curSrc = lite$listPopBack(lite_srcStack, 10908);
            void lite_curSrc;
            const lite_curDst = lite$listPopBack(lite_dstStack, 10954);
            void lite_curDst;
            const lite_curDepth = lite$listPopBack(lite_depthStack, 11002);
            void lite_curDepth;
            lite_stackCount = lite$subtractInt(lite_stackCount, 1n, 11064);
            const lite_entries: string[] = [...(lite$fileListDir(lite_curSrc))];
            void lite_entries;
            const lite_skipList: string[] = [...((Boolean(((lite_curDepth) === (0n))) ? [...(lite_topSkipNames)] : [...(lite_nestedSkipNames)]))];
            void lite_skipList;
            for (const lite_entry of [...(lite_entries)]) {
                void lite_entry;
                if ((!(liteFn$lib$core$list$listContainsText([...(lite_skipList)], lite_entry)))) {
                    const lite_nextSrc = liteFn$lib$core$path$join(lite_curSrc, lite_entry);
                    void lite_nextSrc;
                    const lite_nextDst = liteFn$lib$core$path$join(lite_curDst, lite_entry);
                    void lite_nextDst;
                    const lite_entryKind = lite$fileKind(lite_nextSrc);
                    void lite_entryKind;
                    if (((lite_entryKind) === (lite$m$lib$core$file$FILE_KIND_DIR))) {
                        const lite_mkSub = lite$fileMakeDir(lite_nextDst);
                        void lite_mkSub;
                        if ((!((lite_mkSub).ok))) {
                            return { ok: false, error: (lite_mkSub).error };
                        }
                        lite_srcStack.push(lite_nextSrc);
                        lite_dstStack.push(lite_nextDst);
                        lite_depthStack.push(lite$addInt(lite_curDepth, 1n, 11790));
                        lite_stackCount = lite$addInt(lite_stackCount, 1n, 11840);
                    } else if (((lite_entryKind) === (lite$m$lib$core$file$FILE_KIND_FILE))) {
                        const lite_copied = lite$fileCopy(lite_nextSrc, lite_nextDst);
                        void lite_copied;
                        if ((!((lite_copied).ok))) {
                            return { ok: false, error: (lite_copied).error };
                        }
                    }
                }
            }
        }
        return { ok: true, error: "" };
    }
    void liteFn$lib$core$path$copyFiltered;
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
    function liteFn$lib$util$release$versionsJson(lite_rootDir: string): { ok: boolean; jsonText: string; error: string } {
        void lite_rootDir;
        const lite_checked = liteFn$lib$util$release$selectComponentRelease(lite_rootDir, "");
        void lite_checked;
        if ((!((lite_checked).ok))) {
            return { ok: false, jsonText: "", error: (lite_checked).error };
        }
        const lite_igniterRes = liteFn$lib$util$release$readIgniterVersion(lite_rootDir);
        void lite_igniterRes;
        if ((!((lite_igniterRes).ok))) {
            return { ok: false, jsonText: "", error: (lite_igniterRes).error };
        }
        const lite_verRead = liteFn$lib$core$file$readText(liteFn$lib$core$path$join(lite_rootDir, "config/versions.json"));
        void lite_verRead;
        if ((!((lite_verRead).ok))) {
            return { ok: false, jsonText: "", error: (lite_verRead).error };
        }
        const lite_entries: string[] = [...([])];
        void lite_entries;
        for (const lite_component of [...(liteFn$lib$util$release$allComponents())]) {
            void lite_component;
            if (((lite_component) === ("igniter"))) {
                lite_entries.push((("\"igniter\":") + (liteFn$lib$util$json$quoteString((lite_igniterRes).version))));
            } else {
                const lite_field = liteFn$lib$util$json$findObjectField((lite_verRead).text, 0n, lite_component);
                void lite_field;
                if (liteFn$lib$core$text$startsWithAt((lite_verRead).text, (lite_field).valuePos, "null")) {
                    lite_entries.push(((liteFn$lib$util$json$quoteString(lite_component)) + (":null")));
                } else {
                    const lite_strRes = liteFn$lib$util$json$readStringAt((lite_verRead).text, (lite_field).valuePos);
                    void lite_strRes;
                    lite_entries.push(((((liteFn$lib$util$json$quoteString(lite_component)) + (":"))) + (liteFn$lib$util$json$quoteString((lite_strRes).value))));
                }
            }
        }
        return { ok: true, jsonText: (((("{") + (liteFn$lib$core$text$joinTexts([...(lite_entries)], ",")))) + ("}")), error: "" };
    }
    void liteFn$lib$util$release$versionsJson;
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
    function liteFn$lib$util$streams$readStreamBytes(lite_source: string, lite_streamPos: bigint, lite_directory: string): bigint[] {
        void lite_source;
        void lite_streamPos;
        void lite_directory;
        if ((liteFn$lib$util$json$findObjectField(lite_source, lite_streamPos, "text")).found) {
            const lite_tRes = liteFn$lib$util$json$readObjectString(lite_source, lite_streamPos, "text");
            void lite_tRes;
            return [...(liteFn$lib$core$unicode$utf8Encode((lite_tRes).value))];
        }
        const lite_bField = liteFn$lib$util$json$findObjectField(lite_source, lite_streamPos, "bytes");
        void lite_bField;
        if ((lite_bField).found) {
            return [...(liteFn$lib$util$streams$collectBytesArray(lite_source, (lite_bField).valuePos))];
        }
        const lite_fRes = liteFn$lib$util$json$readObjectString(lite_source, lite_streamPos, "file");
        void lite_fRes;
        return [...(liteFn$lib$core$file$readBytes(liteFn$lib$core$path$resolve(lite_directory, (lite_fRes).value)))];
    }
    void liteFn$lib$util$streams$readStreamBytes;
    function liteFn$lib$util$streams$equalBytes(lite_left: bigint[], lite_right: bigint[]): boolean {
        void lite_left;
        void lite_right;
        const lite_n = liteFn$lib$core$list$listCountInt([...(lite_left)]);
        void lite_n;
        if (((lite_n) !== (liteFn$lib$core$list$listCountInt([...(lite_right)])))) {
            return false;
        }
        let lite_i = 0n;
        void lite_i;
        while (((lite_i) < (lite_n))) {
            if (((lite$listAt((lite_left), lite_i, 6557)) !== (lite$listAt((lite_right), lite_i, 6570)))) {
                return false;
            }
            lite_i = lite$addInt(lite_i, 1n, 6605);
        }
        return true;
    }
    void liteFn$lib$util$streams$equalBytes;
    const lite$m$lib$util$cases$CASE_KIND_TOOL = "tool";
    void lite$m$lib$util$cases$CASE_KIND_TOOL;
    const lite$m$lib$util$cases$CASE_KIND_FEATURE = "feature";
    void lite$m$lib$util$cases$CASE_KIND_FEATURE;
    const lite$m$lib$util$cases$CASE_KIND_REJECT = "reject";
    void lite$m$lib$util$cases$CASE_KIND_REJECT;
    const lite$m$lib$util$cases$CASE_KIND_COMPILE = "compile";
    void lite$m$lib$util$cases$CASE_KIND_COMPILE;
    const lite$m$lib$util$cases$CASE_KIND_SAMPLE = "sample";
    void lite$m$lib$util$cases$CASE_KIND_SAMPLE;
    const lite$m$lib$util$cases$CASE_KIND_EXAMPLE = "example";
    void lite$m$lib$util$cases$CASE_KIND_EXAMPLE;
    const lite$m$lib$util$cases$WORKSPACE_CLEAN = "clean";
    void lite$m$lib$util$cases$WORKSPACE_CLEAN;
    const lite$m$lib$util$cases$WORKSPACE_DIRTY = "dirty";
    void lite$m$lib$util$cases$WORKSPACE_DIRTY;
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
            if (((((lite_atEnd) || (((lite$textAt(lite_relPath, lite_i, 801)) === ("/"))))) || (((lite$textAt(lite_relPath, lite_i, 831)) === ("\\"))))) {
                if (((lite$textSlice(lite_relPath, lite_segStart, lite_i, 876)) === (".."))) {
                    return true;
                }
                lite_segStart = lite$addInt(lite_i, 1n, 959);
            }
            lite_i = lite$addInt(lite_i, 1n, 988);
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
        const lite_validKinds: string[] = [...([lite$m$lib$util$cases$CASE_KIND_TOOL, lite$m$lib$util$cases$CASE_KIND_FEATURE, lite$m$lib$util$cases$CASE_KIND_REJECT, lite$m$lib$util$cases$CASE_KIND_COMPILE, lite$m$lib$util$cases$CASE_KIND_SAMPLE, lite$m$lib$util$cases$CASE_KIND_EXAMPLE])];
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
            if (((((((lite_kind) === (lite$m$lib$util$cases$CASE_KIND_TOOL))) || ((!((lite_pStr).ok))))) || (((liteFn$lib$core$text$trim((lite_pStr).value)) === (""))))) {
                return { ok: false, id: "", error: ((lite_caseFile) + (": pending needs a language case and reason")) };
            }
        }
        const lite_caseDir = liteFn$lib$core$path$parentDir(lite_caseFile);
        void lite_caseDir;
        if (((lite_kind) === (lite$m$lib$util$cases$CASE_KIND_TOOL))) {
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
                if (((((((lite_kind) !== (lite$m$lib$util$cases$CASE_KIND_FEATURE))) && (((lite_kind) !== (lite$m$lib$util$cases$CASE_KIND_SAMPLE))))) && (((lite_kind) !== (lite$m$lib$util$cases$CASE_KIND_EXAMPLE))))) {
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
                if (((((((lite_kind) !== (lite$m$lib$util$cases$CASE_KIND_FEATURE))) && (((lite_kind) !== (lite$m$lib$util$cases$CASE_KIND_SAMPLE))))) && (((lite_kind) !== (lite$m$lib$util$cases$CASE_KIND_EXAMPLE))))) {
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
                if (((lite_kind) !== (lite$m$lib$util$cases$CASE_KIND_COMPILE))) {
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
            if ((((lite_wsRes).found) && ((((((((lite_kind) !== (lite$m$lib$util$cases$CASE_KIND_TOOL))) || ((!((lite_wsRes).ok))))) || (((((((lite_wsRes).value) !== (lite$m$lib$util$cases$WORKSPACE_CLEAN))) && ((((lite_wsRes).value) !== (lite$m$lib$util$cases$WORKSPACE_DIRTY))))))))))) {
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
                if (((lite_kind) !== (lite$m$lib$util$cases$CASE_KIND_TOOL))) {
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
        const lite_startsWild = ((lite$textAt(lite_filter, 0n, 12926)) === ("*"));
        void lite_startsWild;
        const lite_endsWild = ((lite$textAt(lite_filter, lite$subtractInt(lite_filterLen, 1n, 12995), 12969)) === ("*"));
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
            if (((lite_atEnd) || (((lite$textAt(lite_filter, lite_i, 13160)) === ("*"))))) {
                if (((lite_i) > (lite_segStart))) {
                    lite_parts.push(lite$textSlice(lite_filter, lite_segStart, lite_i, 13259));
                }
                lite_segStart = lite$addInt(lite_i, 1n, 13332);
            }
            lite_i = lite$addInt(lite_i, 1n, 13361);
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
            const lite_part = lite$listAt((lite_parts), lite_idx, 13582);
            void lite_part;
            const lite_partLen = lite$textLength(lite_part);
            void lite_partLen;
            if (((((lite_idx) === (0n))) && ((!(lite_startsWild))))) {
                if ((!(liteFn$lib$core$text$startsWithAt(lite_candidate, 0n, lite_part)))) {
                    return false;
                }
                lite_cursor = lite_partLen;
            } else if (((((lite_idx) === (lite$subtractInt(lite_partCount, 1n, 13807)))) && ((!(lite_endsWild))))) {
                if (((((((lite_candLen) < (lite_partLen))) || (((lite_cursor) > (lite$subtractInt(lite_candLen, lite_partLen, 13883)))))) || ((!(liteFn$lib$core$text$endsWith(lite_candidate, lite_part)))))) {
                    return false;
                }
                lite_cursor = lite_candLen;
            } else {
                const lite_found = liteFn$lib$core$text$indexOfText(lite_candidate, lite_part, lite_cursor);
                void lite_found;
                if (((lite_found) < (0n))) {
                    return false;
                }
                lite_cursor = lite$addInt(lite_found, lite_partLen, 14158);
            }
            lite_idx = lite$addInt(lite_idx, 1n, 14197);
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
                lite_matches = lite$addInt(lite_matches, 1n, 15403);
            }
        }
        if (((lite_matches) === (0n))) {
            return { ok: false, matchCount: 0n, error: (("no cases match: ") + (lite_filter)) };
        }
        return { ok: true, matchCount: lite_matches, error: "" };
    }
    void liteFn$lib$util$cases$validateCaseSet;
    function liteFn$lib$util$cases$selectCaseFiles(lite_rootDir: string, lite_filter: string): string[] {
        void lite_rootDir;
        void lite_filter;
        const lite_files: string[] = [...(liteFn$lib$util$cases$discoverAllCaseFiles(lite_rootDir))];
        void lite_files;
        if (((lite_filter) === (""))) {
            return [...(lite_files)];
        }
        const lite_selected: string[] = [...([])];
        void lite_selected;
        for (const lite_caseFile of [...(lite_files)]) {
            void lite_caseFile;
            const lite_readRes = liteFn$lib$core$file$readText(lite_caseFile);
            void lite_readRes;
            if ((lite_readRes).ok) {
                const lite_idRes = liteFn$lib$util$json$readObjectString((lite_readRes).text, 0n, "id");
                void lite_idRes;
                if ((((((lite_idRes).found) && ((lite_idRes).ok))) && (liteFn$lib$util$cases$matchesCaseEntry(lite_rootDir, (lite_idRes).value, lite_caseFile, lite_filter)))) {
                    lite_selected.push(lite_caseFile);
                }
            }
        }
        return [...(lite_selected)];
    }
    void liteFn$lib$util$cases$selectCaseFiles;
    function liteFn$lib$util$cases$readCaseMeta(lite_rootDir: string, lite_caseFile: string): { ok: boolean; id: string; kind: string; pending: string; hasPending: boolean; tool: string; source: string; hasBenchmark: boolean; warmups: bigint; samples: bigint; scenarioCount: bigint; error: string } {
        void lite_rootDir;
        void lite_caseFile;
        const lite_absFile = liteFn$lib$core$path$resolve(lite$processCwd(), lite_caseFile);
        void lite_absFile;
        const lite_checked = liteFn$lib$util$cases$validateCaseFile(lite_rootDir, lite_absFile);
        void lite_checked;
        if ((!((lite_checked).ok))) {
            return { ok: false, id: "", kind: "", pending: "", hasPending: false, tool: "", source: "", hasBenchmark: false, warmups: 0n, samples: 0n, scenarioCount: 0n, error: (lite_checked).error };
        }
        const lite_src = (liteFn$lib$core$file$readText(lite_absFile)).text;
        void lite_src;
        const lite_kind = (liteFn$lib$util$json$readObjectString(lite_src, 0n, "kind")).value;
        void lite_kind;
        const lite_pendRes = liteFn$lib$util$json$readObjectString(lite_src, 0n, "pending");
        void lite_pendRes;
        const lite_toolRes = liteFn$lib$util$json$readObjectString(lite_src, 0n, "tool");
        void lite_toolRes;
        const lite_srcRes = liteFn$lib$util$json$readObjectString(lite_src, 0n, "source");
        void lite_srcRes;
        const lite_benchField = liteFn$lib$util$json$findObjectField(lite_src, 0n, "benchmark");
        void lite_benchField;
        let lite_warmups = 0n;
        void lite_warmups;
        let lite_samples = 0n;
        void lite_samples;
        if ((lite_benchField).found) {
            lite_warmups = (liteFn$lib$util$json$readObjectInt(lite_src, (lite_benchField).valuePos, "warmups")).value;
            lite_samples = (liteFn$lib$util$json$readObjectInt(lite_src, (lite_benchField).valuePos, "samples")).value;
        }
        const lite_casesField = liteFn$lib$util$json$findObjectField(lite_src, 0n, "cases");
        void lite_casesField;
        const lite_scenarios: bigint[] = [...(liteFn$lib$util$json$arrayElementOffsets(lite_src, (lite_casesField).valuePos))];
        void lite_scenarios;
        return { ok: true, id: (lite_checked).id, kind: lite_kind, pending: (Boolean((lite_pendRes).found) ? (lite_pendRes).value : ""), hasPending: (lite_pendRes).found, tool: (Boolean((lite_toolRes).found) ? (lite_toolRes).value : ""), source: (Boolean((lite_srcRes).found) ? (lite_srcRes).value : ""), hasBenchmark: (lite_benchField).found, warmups: lite_warmups, samples: lite_samples, scenarioCount: liteFn$lib$core$list$listCountInt([...(lite_scenarios)]), error: "" };
    }
    void liteFn$lib$util$cases$readCaseMeta;
    function liteFn$lib$util$cases$readScenarioName(lite_caseFile: string, lite_scenarioIdx: bigint): string {
        void lite_caseFile;
        void lite_scenarioIdx;
        const lite_absFile = liteFn$lib$core$path$resolve(lite$processCwd(), lite_caseFile);
        void lite_absFile;
        const lite_readRes = liteFn$lib$core$file$readText(lite_absFile);
        void lite_readRes;
        if ((!((lite_readRes).ok))) {
            return "";
        }
        const lite_casesField = liteFn$lib$util$json$findObjectField((lite_readRes).text, 0n, "cases");
        void lite_casesField;
        if ((!((lite_casesField).found))) {
            return "";
        }
        const lite_scenarios: bigint[] = [...(liteFn$lib$util$json$arrayElementOffsets((lite_readRes).text, (lite_casesField).valuePos))];
        void lite_scenarios;
        if (((((lite_scenarioIdx) < (0n))) || (((lite_scenarioIdx) >= (liteFn$lib$core$list$listCountInt([...(lite_scenarios)])))))) {
            return "";
        }
        return (liteFn$lib$util$json$readObjectString((lite_readRes).text, lite$listAt((lite_scenarios), lite_scenarioIdx, 18897), "name")).value;
    }
    void liteFn$lib$util$cases$readScenarioName;
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
                lite_parts.push(((((liteFn$lib$util$json$quoteString(lite_key)) + (":"))) + (lite$textSlice((lite_cfgRes).text, (lite_span).start, (lite_span).end, 20124))));
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
        if (((lite$fileKind(lite_nativeTsc)) === (lite$m$lib$core$file$FILE_KIND_FILE))) {
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
    function liteFn$lib$util$cases$checkTsArtifactFile(lite_rootDir: string, lite_artifactPath: string, lite_workDir: string): { ok: boolean; error: string } {
        void lite_rootDir;
        void lite_artifactPath;
        void lite_workDir;
        const lite_checked = liteFn$lib$util$cases$checkTsArtifactFileWithStatus(lite_rootDir, lite_artifactPath, lite_workDir, 30000n);
        void lite_checked;
        return { ok: (lite_checked).ok, error: (lite_checked).error };
    }
    void liteFn$lib$util$cases$checkTsArtifactFile;
    function liteFn$lib$util$cases$runCaseGit(lite_projDir: string, lite_gitArgs: string[]): { ok: boolean; error: string } {
        void lite_projDir;
        void lite_gitArgs;
        const lite_args: string[] = [...(["-c", "user.name=Case fixture", "-c", "user.email=fixture@example.invalid", "-c", "commit.gpgSign=false", "-c", "tag.gpgSign=false", "-c", "maintenance.auto=false", "-c", "gc.auto=0"])];
        void lite_args;
        for (const lite_gArg of [...(lite_gitArgs)]) {
            void lite_gArg;
            lite_args.push(lite_gArg);
        }
        const lite_emptyEnv: string[] = [...([])];
        void lite_emptyEnv;
        const lite_res = lite$processRun("git", [...(lite_args)], lite_projDir, [...(lite_emptyEnv)], true, "");
        void lite_res;
        if ((((lite_res).error) !== (""))) {
            return { ok: false, error: (lite_res).error };
        }
        if ((((lite_res).status) !== (0n))) {
            return { ok: false, error: (((("git failed: ") + ((lite_res).stdout))) + ((lite_res).stderr)) };
        }
        return { ok: true, error: "" };
    }
    void liteFn$lib$util$cases$runCaseGit;
    function liteFn$lib$util$cases$prepareToolWorkspace(lite_rootDir: string, lite_caseText: string, lite_sPos: bigint, lite_workDir: string): { ok: boolean; workspace: string; error: string } {
        void lite_rootDir;
        void lite_caseText;
        void lite_sPos;
        void lite_workDir;
        const lite_wsRes = liteFn$lib$util$json$readObjectString(lite_caseText, lite_sPos, "workspace");
        void lite_wsRes;
        if ((!((lite_wsRes).found))) {
            return { ok: true, workspace: lite_rootDir, error: "" };
        }
        const lite_projDir = liteFn$lib$core$path$join(lite_workDir, "project");
        void lite_projDir;
        const lite_topSkip: string[] = [...([".git", "node_modules", "dist", ".cache"])];
        void lite_topSkip;
        const lite_nestedSkip: string[] = [...(["node_modules"])];
        void lite_nestedSkip;
        const lite_copied = liteFn$lib$core$path$copyFiltered(lite_rootDir, lite_projDir, [...(lite_topSkip)], [...(lite_nestedSkip)]);
        void lite_copied;
        if ((!((lite_copied).ok))) {
            return { ok: false, workspace: "", error: (lite_copied).error };
        }
        const lite_g1 = liteFn$lib$util$cases$runCaseGit(lite_projDir, [...(["init", "-b", "main"])]);
        void lite_g1;
        if ((!((lite_g1).ok))) {
            return { ok: false, workspace: "", error: (lite_g1).error };
        }
        const lite_g2 = liteFn$lib$util$cases$runCaseGit(lite_projDir, [...(["add", "."])]);
        void lite_g2;
        if ((!((lite_g2).ok))) {
            return { ok: false, workspace: "", error: (lite_g2).error };
        }
        const lite_g3 = liteFn$lib$util$cases$runCaseGit(lite_projDir, [...(["commit", "-m", "case fixture"])]);
        void lite_g3;
        if ((!((lite_g3).ok))) {
            return { ok: false, workspace: "", error: (lite_g3).error };
        }
        const lite_tagField = liteFn$lib$util$json$findObjectField(lite_caseText, lite_sPos, "tag");
        void lite_tagField;
        if ((lite_tagField).found) {
            const lite_tName = (liteFn$lib$util$json$readObjectString(lite_caseText, (lite_tagField).valuePos, "name")).value;
            void lite_tName;
            const lite_tAnn = (liteFn$lib$util$json$readObjectBool(lite_caseText, (lite_tagField).valuePos, "annotated")).value;
            void lite_tAnn;
            if (lite_tAnn) {
                const lite_gt = liteFn$lib$util$cases$runCaseGit(lite_projDir, [...(["tag", "-a", lite_tName, "-m", lite_tName])]);
                void lite_gt;
                if ((!((lite_gt).ok))) {
                    return { ok: false, workspace: "", error: (lite_gt).error };
                }
            } else {
                const lite_gt = liteFn$lib$util$cases$runCaseGit(lite_projDir, [...(["tag", lite_tName])]);
                void lite_gt;
                if ((!((lite_gt).ok))) {
                    return { ok: false, workspace: "", error: (lite_gt).error };
                }
            }
        }
        if ((((lite_wsRes).value) === (lite$m$lib$util$cases$WORKSPACE_DIRTY))) {
            const lite_wDirty = liteFn$lib$core$file$writeText(liteFn$lib$core$path$join(lite_projDir, "uncommitted.txt"), "dirty\n");
            void lite_wDirty;
            if ((!((lite_wDirty).ok))) {
                return { ok: false, workspace: "", error: (lite_wDirty).error };
            }
        }
        return { ok: true, workspace: lite_projDir, error: "" };
    }
    void liteFn$lib$util$cases$prepareToolWorkspace;
    function liteFn$lib$util$cases$readStringListAt(lite_caseText: string, lite_arrPos: bigint): string[] {
        void lite_caseText;
        void lite_arrPos;
        const lite_items: string[] = [...([])];
        void lite_items;
        for (const lite_elPos of [...(liteFn$lib$util$json$arrayElementOffsets(lite_caseText, lite_arrPos))]) {
            void lite_elPos;
            const lite_s = liteFn$lib$util$json$readStringAt(lite_caseText, lite_elPos);
            void lite_s;
            if ((lite_s).ok) {
                lite_items.push((lite_s).value);
            }
        }
        return [...(lite_items)];
    }
    void liteFn$lib$util$cases$readStringListAt;
    function liteFn$lib$util$cases$verifyScenarioInWork(lite_rootDir: string, lite_absFile: string, lite_scenarioIdx: bigint, lite_work: string): { ok: boolean; artifactSha: string; error: string } {
        void lite_rootDir;
        void lite_absFile;
        void lite_scenarioIdx;
        void lite_work;
        const lite_checked = liteFn$lib$util$cases$validateCaseFile(lite_rootDir, lite_absFile);
        void lite_checked;
        if ((!((lite_checked).ok))) {
            return { ok: false, artifactSha: "", error: (lite_checked).error };
        }
        const lite_caseText = (liteFn$lib$core$file$readText(lite_absFile)).text;
        void lite_caseText;
        const lite_caseId = (lite_checked).id;
        void lite_caseId;
        const lite_pendRes = liteFn$lib$util$json$readObjectString(lite_caseText, 0n, "pending");
        void lite_pendRes;
        if ((lite_pendRes).found) {
            return { ok: false, artifactSha: "", error: ((((lite_caseId) + (": pending: "))) + ((lite_pendRes).value)) };
        }
        const lite_casesField = liteFn$lib$util$json$findObjectField(lite_caseText, 0n, "cases");
        void lite_casesField;
        const lite_scenarios: bigint[] = [...(liteFn$lib$util$json$arrayElementOffsets(lite_caseText, (lite_casesField).valuePos))];
        void lite_scenarios;
        if (((((lite_scenarioIdx) < (0n))) || (((lite_scenarioIdx) >= (liteFn$lib$core$list$listCountInt([...(lite_scenarios)])))))) {
            return { ok: false, artifactSha: "", error: ((lite_caseId) + (": invalid scenario index")) };
        }
        const lite_sPos = lite$listAt((lite_scenarios), lite_scenarioIdx, 27124);
        void lite_sPos;
        const lite_sName = (liteFn$lib$util$json$readObjectString(lite_caseText, lite_sPos, "name")).value;
        void lite_sName;
        const lite_label = ((((lite_caseId) + ("/"))) + (lite_sName));
        void lite_label;
        const lite_kind = (liteFn$lib$util$json$readObjectString(lite_caseText, 0n, "kind")).value;
        void lite_kind;
        const lite_caseDir = liteFn$lib$core$path$parentDir(lite_absFile);
        void lite_caseDir;
        const lite_timeoutRes = liteFn$lib$util$json$readObjectInt(lite_caseText, lite_sPos, "timeoutMs");
        void lite_timeoutRes;
        const lite_timeoutMs = (Boolean((lite_timeoutRes).found) ? (lite_timeoutRes).value : 30000n);
        void lite_timeoutMs;
        const lite_argsField = liteFn$lib$util$json$findObjectField(lite_caseText, lite_sPos, "args");
        void lite_argsField;
        const lite_emptyStrings: string[] = [...([])];
        void lite_emptyStrings;
        const lite_scenarioArgs: string[] = [...((Boolean((lite_argsField).found) ? [...(liteFn$lib$util$cases$readStringListAt(lite_caseText, (lite_argsField).valuePos))] : [...(lite_emptyStrings)]))];
        void lite_scenarioArgs;
        const lite_stdinField = liteFn$lib$util$json$findObjectField(lite_caseText, lite_sPos, "stdin");
        void lite_stdinField;
        const lite_stdoutField = liteFn$lib$util$json$findObjectField(lite_caseText, lite_sPos, "stdout");
        void lite_stdoutField;
        const lite_stderrField = liteFn$lib$util$json$findObjectField(lite_caseText, lite_sPos, "stderr");
        void lite_stderrField;
        const lite_stdinBytes: bigint[] = [...(liteFn$lib$util$streams$readStreamBytes(lite_caseText, (lite_stdinField).valuePos, lite_caseDir))];
        void lite_stdinBytes;
        const lite_expectedStdout: bigint[] = [...(liteFn$lib$util$streams$readStreamBytes(lite_caseText, (lite_stdoutField).valuePos, lite_caseDir))];
        void lite_expectedStdout;
        const lite_expectedStderr: bigint[] = [...(liteFn$lib$util$streams$readStreamBytes(lite_caseText, (lite_stderrField).valuePos, lite_caseDir))];
        void lite_expectedStderr;
        const lite_expectedExit = (liteFn$lib$util$json$readObjectInt(lite_caseText, lite_sPos, "exitCode")).value;
        void lite_expectedExit;
        const lite_emptyBytes: bigint[] = [...([])];
        void lite_emptyBytes;
        const lite_emptyEnv: string[] = [...([])];
        void lite_emptyEnv;
        let lite_actualStatus = (-1n);
        void lite_actualStatus;
        let lite_actualStdout: bigint[] = [...([...([])])];
        void lite_actualStdout;
        let lite_actualStderr: bigint[] = [...([...([])])];
        void lite_actualStderr;
        let lite_actualStderrPath = "";
        void lite_actualStderrPath;
        let lite_artifactSha = "";
        void lite_artifactSha;
        let lite_workspace = lite_rootDir;
        void lite_workspace;
        if (((lite_kind) === (lite$m$lib$util$cases$CASE_KIND_TOOL))) {
            const lite_wsRes = liteFn$lib$util$cases$prepareToolWorkspace(lite_rootDir, lite_caseText, lite_sPos, lite_work);
            void lite_wsRes;
            if ((!((lite_wsRes).ok))) {
                return { ok: false, artifactSha: "", error: (lite_wsRes).error };
            }
            lite_workspace = (lite_wsRes).workspace;
            const lite_toolName = (liteFn$lib$util$json$readObjectString(lite_caseText, 0n, "tool")).value;
            void lite_toolName;
            const lite_cmdArgs: string[] = [...([liteFn$lib$core$path$join(lite_workspace, (("bin/") + (lite_toolName)))])];
            void lite_cmdArgs;
            for (const lite_arg of [...(lite_scenarioArgs)]) {
                void lite_arg;
                lite_cmdArgs.push(lite_arg);
            }
            const lite_outPath = liteFn$lib$core$path$join(lite_work, "tool.stdout");
            void lite_outPath;
            const lite_errPath = liteFn$lib$core$path$join(lite_work, "tool.stderr");
            void lite_errPath;
            const lite_runRes = lite$processRunBytes(lite$processExecPath(), [...(lite_cmdArgs)], lite_workspace, [...(lite_emptyEnv)], lite_timeoutMs, [...(lite_stdinBytes)], lite_outPath, lite_errPath);
            void lite_runRes;
            if ((((lite_runRes).error) !== (""))) {
                return { ok: false, artifactSha: "", error: (lite_runRes).error };
            }
            lite_actualStatus = (lite_runRes).status;
            lite_actualStdout = [...(liteFn$lib$core$file$readBytes(lite_outPath))];
            lite_actualStderr = [...(liteFn$lib$core$file$readBytes(lite_errPath))];
            lite_actualStderrPath = lite_errPath;
        } else {
            const lite_sourceRel = (liteFn$lib$util$json$readObjectString(lite_caseText, 0n, "source")).value;
            void lite_sourceRel;
            const lite_compileArg = liteFn$lib$core$path$relative(lite_rootDir, liteFn$lib$core$path$resolve(lite_caseDir, lite_sourceRel));
            void lite_compileArg;
            const lite_compArgs: string[] = [...([liteFn$lib$core$path$join(lite_rootDir, "bin/lite-compile"), lite_compileArg])];
            void lite_compArgs;
            const lite_compOutPath = liteFn$lib$core$path$join(lite_work, "compile.stdout");
            void lite_compOutPath;
            const lite_compErrPath = liteFn$lib$core$path$join(lite_work, "compile.stderr");
            void lite_compErrPath;
            const lite_compiled = lite$processRunBytes(lite$processExecPath(), [...(lite_compArgs)], lite_rootDir, [...(lite_emptyEnv)], lite_timeoutMs, [...(lite_emptyBytes)], lite_compOutPath, lite_compErrPath);
            void lite_compiled;
            if ((((lite_compiled).error) !== (""))) {
                return { ok: false, artifactSha: "", error: (lite_compiled).error };
            }
            const lite_compOutBytes: bigint[] = [...(liteFn$lib$core$file$readBytes(lite_compOutPath))];
            void lite_compOutBytes;
            const lite_compErrBytes: bigint[] = [...(liteFn$lib$core$file$readBytes(lite_compErrPath))];
            void lite_compErrBytes;
            const lite_outputTsPath = liteFn$lib$core$path$join(lite_work, "program.lts.ts");
            void lite_outputTsPath;
            if ((((lite_compiled).status) === (0n))) {
                const lite_copied = lite$fileCopy(lite_compOutPath, lite_outputTsPath);
                void lite_copied;
                if ((!((lite_copied).ok))) {
                    return { ok: false, artifactSha: "", error: (lite_copied).error };
                }
                const lite_tsCheck = liteFn$lib$util$cases$checkTsArtifactFile(lite_rootDir, lite_outputTsPath, liteFn$lib$core$path$join(lite_work, "tsc-check"));
                void lite_tsCheck;
                if ((!((lite_tsCheck).ok))) {
                    return { ok: false, artifactSha: "", error: (lite_tsCheck).error };
                }
                const lite_hashRes = liteFn$lib$core$crypto$sha256File(lite_outputTsPath);
                void lite_hashRes;
                if ((!((lite_hashRes).ok))) {
                    return { ok: false, artifactSha: "", error: (lite_hashRes).error };
                }
                lite_artifactSha = (lite_hashRes).hex;
            }
            if (((lite_kind) === (lite$m$lib$util$cases$CASE_KIND_COMPILE))) {
                const lite_artField = liteFn$lib$util$json$findObjectField(lite_caseText, lite_sPos, "artifact");
                void lite_artField;
                if ((lite_artField).found) {
                    if (((lite$fileKind(lite_outputTsPath)) !== (lite$m$lib$core$file$FILE_KIND_FILE))) {
                        return { ok: false, artifactSha: "", error: ((lite_label) + (": missing generated artifact")) };
                    }
                    const lite_expectedArt: bigint[] = [...(liteFn$lib$util$streams$readStreamBytes(lite_caseText, (lite_artField).valuePos, lite_caseDir))];
                    void lite_expectedArt;
                    if ((!(liteFn$lib$util$streams$equalBytes([...(liteFn$lib$core$file$readBytes(lite_outputTsPath))], [...(lite_expectedArt)])))) {
                        return { ok: false, artifactSha: "", error: "generated artifact differs" };
                    }
                }
            }
            if (((((lite_kind) === (lite$m$lib$util$cases$CASE_KIND_REJECT))) && (((lite$fileKind(lite_outputTsPath)) !== (lite$m$lib$core$file$FILE_KIND_MISSING))))) {
                return { ok: false, artifactSha: "", error: "rejection created an output artifact" };
            }
            if (((((lite_kind) === (lite$m$lib$util$cases$CASE_KIND_REJECT))) || (((lite_kind) === (lite$m$lib$util$cases$CASE_KIND_COMPILE))))) {
                lite_actualStatus = (lite_compiled).status;
                lite_actualStdout = [...((Boolean((((lite_compiled).status) === (0n))) ? [...(lite_emptyBytes)] : [...(lite_compOutBytes)]))];
                lite_actualStderr = [...(lite_compErrBytes)];
                lite_actualStderrPath = lite_compErrPath;
            } else {
                if ((((lite_compiled).status) !== (0n))) {
                    return { ok: false, artifactSha: "", error: liteFn$lib$util$cases$readFileDiagnostic(lite_compErrPath, liteFn$lib$core$list$listCountInt([...(lite_compErrBytes)])) };
                }
                if (((liteFn$lib$core$list$listCountInt([...(lite_compErrBytes)])) > (0n))) {
                    return { ok: false, artifactSha: "", error: "unexpected compiler diagnostics" };
                }
                const lite_wPkg = liteFn$lib$core$file$writeText(liteFn$lib$core$path$join(lite_work, "package.json"), "{\"type\":\"module\"}\n");
                void lite_wPkg;
                if ((!((lite_wPkg).ok))) {
                    return { ok: false, artifactSha: "", error: (lite_wPkg).error };
                }
                const lite_filesDir = liteFn$lib$core$path$join(lite_work, "files");
                void lite_filesDir;
                const lite_mkFiles = lite$fileMakeDir(lite_filesDir);
                void lite_mkFiles;
                if ((!((lite_mkFiles).ok))) {
                    return { ok: false, artifactSha: "", error: (lite_mkFiles).error };
                }
                const lite_inFilesField = liteFn$lib$util$json$findObjectField(lite_caseText, lite_sPos, "inputFiles");
                void lite_inFilesField;
                if ((lite_inFilesField).found) {
                    for (const lite_fname of [...(liteFn$lib$util$json$objectKeys(lite_caseText, (lite_inFilesField).valuePos))]) {
                        void lite_fname;
                        const lite_fv = liteFn$lib$util$json$findObjectField(lite_caseText, (lite_inFilesField).valuePos, lite_fname);
                        void lite_fv;
                        const lite_dstFile = liteFn$lib$core$path$join(lite_filesDir, lite_fname);
                        void lite_dstFile;
                        const lite_mkParent = lite$fileMakeDir(liteFn$lib$core$path$parentDir(lite_dstFile));
                        void lite_mkParent;
                        if ((!((lite_mkParent).ok))) {
                            return { ok: false, artifactSha: "", error: (lite_mkParent).error };
                        }
                        const lite_wf = liteFn$lib$core$file$writeBytes(lite_dstFile, [...(liteFn$lib$util$streams$readStreamBytes(lite_caseText, (lite_fv).valuePos, lite_caseDir))]);
                        void lite_wf;
                        if ((!((lite_wf).ok))) {
                            return { ok: false, artifactSha: "", error: (lite_wf).error };
                        }
                    }
                }
                const lite_runArgs: string[] = [...([liteFn$lib$core$path$join(lite_rootDir, "compiler/entry.ts"), lite_outputTsPath])];
                void lite_runArgs;
                for (const lite_arg of [...(lite_scenarioArgs)]) {
                    void lite_arg;
                    lite_runArgs.push(lite_arg);
                }
                const lite_runOutPath = liteFn$lib$core$path$join(lite_work, "run.stdout");
                void lite_runOutPath;
                const lite_runErrPath = liteFn$lib$core$path$join(lite_work, "run.stderr");
                void lite_runErrPath;
                const lite_runRes = lite$processRunBytes(lite$processExecPath(), [...(lite_runArgs)], lite_filesDir, [...(lite_emptyEnv)], lite_timeoutMs, [...(lite_stdinBytes)], lite_runOutPath, lite_runErrPath);
                void lite_runRes;
                if ((((lite_runRes).error) !== (""))) {
                    return { ok: false, artifactSha: "", error: (lite_runRes).error };
                }
                const lite_outFilesField = liteFn$lib$util$json$findObjectField(lite_caseText, lite_sPos, "outputFiles");
                void lite_outFilesField;
                if ((lite_outFilesField).found) {
                    for (const lite_fname of [...(liteFn$lib$util$json$objectKeys(lite_caseText, (lite_outFilesField).valuePos))]) {
                        void lite_fname;
                        const lite_fv = liteFn$lib$util$json$findObjectField(lite_caseText, (lite_outFilesField).valuePos, lite_fname);
                        void lite_fv;
                        const lite_outFile = liteFn$lib$core$path$join(lite_filesDir, lite_fname);
                        void lite_outFile;
                        if (((lite$fileKind(lite_outFile)) !== (lite$m$lib$core$file$FILE_KIND_FILE))) {
                            return { ok: false, artifactSha: "", error: ((((lite_label) + (": file "))) + (lite_fname)) };
                        }
                        const lite_expectedFileBytes: bigint[] = [...(liteFn$lib$util$streams$readStreamBytes(lite_caseText, (lite_fv).valuePos, lite_caseDir))];
                        void lite_expectedFileBytes;
                        if ((!(liteFn$lib$util$streams$equalBytes([...(liteFn$lib$core$file$readBytes(lite_outFile))], [...(lite_expectedFileBytes)])))) {
                            return { ok: false, artifactSha: "", error: ((((lite_label) + (": file "))) + (lite_fname)) };
                        }
                    }
                }
                lite_actualStatus = (lite_runRes).status;
                lite_actualStdout = [...(liteFn$lib$core$file$readBytes(lite_runOutPath))];
                lite_actualStderr = [...(liteFn$lib$core$file$readBytes(lite_runErrPath))];
                lite_actualStderrPath = lite_runErrPath;
            }
        }
        if (((lite_actualStatus) !== (lite_expectedExit))) {
            const lite_diag = liteFn$lib$util$cases$readFileDiagnostic(lite_actualStderrPath, liteFn$lib$core$list$listCountInt([...(lite_actualStderr)]));
            void lite_diag;
            return { ok: false, artifactSha: "", error: ((((lite_label) + (": exit status; "))) + (lite_diag)) };
        }
        if ((!(liteFn$lib$util$streams$equalBytes([...(lite_actualStdout)], [...(lite_expectedStdout)])))) {
            return { ok: false, artifactSha: "", error: ((lite_label) + (": stdout")) };
        }
        if ((!(liteFn$lib$util$streams$equalBytes([...(lite_actualStderr)], [...(lite_expectedStderr)])))) {
            return { ok: false, artifactSha: "", error: ((lite_label) + (": stderr")) };
        }
        if (((lite_kind) === (lite$m$lib$util$cases$CASE_KIND_REJECT))) {
            if (((((lite_expectedExit) === (0n))) || (((liteFn$lib$core$list$listCountInt([...(lite_actualStdout)])) > (0n))))) {
                return { ok: false, artifactSha: "", error: ((lite_label) + (": unexpected reject output")) };
            }
        }
        const lite_filesField = liteFn$lib$util$json$findObjectField(lite_caseText, lite_sPos, "files");
        void lite_filesField;
        if ((lite_filesField).found) {
            for (const lite_artifactRel of [...(liteFn$lib$util$cases$readStringListAt(lite_caseText, (lite_filesField).valuePos))]) {
                void lite_artifactRel;
                if (((lite$fileKind(liteFn$lib$core$path$resolve(lite_workspace, lite_artifactRel))) === (lite$m$lib$core$file$FILE_KIND_MISSING))) {
                    return { ok: false, artifactSha: "", error: (("missing artifact: ") + (lite_artifactRel)) };
                }
            }
        }
        return { ok: true, artifactSha: lite_artifactSha, error: "" };
    }
    void liteFn$lib$util$cases$verifyScenarioInWork;
    function liteFn$lib$util$cases$verifyCaseScenario(lite_rootDir: string, lite_caseFile: string, lite_scenarioIdx: bigint): { ok: boolean; artifactSha: string; error: string } {
        void lite_rootDir;
        void lite_caseFile;
        void lite_scenarioIdx;
        const lite_absFile = liteFn$lib$core$path$resolve(lite$processCwd(), lite_caseFile);
        void lite_absFile;
        const lite_tmpRes = lite$fileMakeTempDir("lite-case-");
        void lite_tmpRes;
        if ((!((lite_tmpRes).ok))) {
            return { ok: false, artifactSha: "", error: (lite_tmpRes).error };
        }
        const lite_res = liteFn$lib$util$cases$verifyScenarioInWork(lite_rootDir, lite_absFile, lite_scenarioIdx, (lite_tmpRes).path);
        void lite_res;
        const lite__rm = lite$fileRemove((lite_tmpRes).path);
        void lite__rm;
        return lite_res;
    }
    void liteFn$lib$util$cases$verifyCaseScenario;
    function liteFn$lib$util$cases$hashFileMapJson(lite_caseText: string, lite_objPos: bigint, lite_caseDir: string): string {
        void lite_caseText;
        void lite_objPos;
        void lite_caseDir;
        const lite_entries: string[] = [...([])];
        void lite_entries;
        for (const lite_fname of [...(liteFn$lib$util$json$objectKeys(lite_caseText, lite_objPos))]) {
            void lite_fname;
            const lite_fv = liteFn$lib$util$json$findObjectField(lite_caseText, lite_objPos, lite_fname);
            void lite_fv;
            const lite_digest = liteFn$lib$core$crypto$sha256Bytes([...(liteFn$lib$util$streams$readStreamBytes(lite_caseText, (lite_fv).valuePos, lite_caseDir))]);
            void lite_digest;
            lite_entries.push(((((liteFn$lib$util$json$quoteString(lite_fname)) + (":"))) + (liteFn$lib$util$json$quoteString(lite_digest))));
        }
        return (((("{") + (liteFn$lib$core$text$joinTexts([...(lite_entries)], ",")))) + ("}"));
    }
    void liteFn$lib$util$cases$hashFileMapJson;
    function liteFn$lib$util$cases$caseIdentityJson(lite_rootDir: string, lite_caseFile: string): { ok: boolean; jsonText: string; error: string } {
        void lite_rootDir;
        void lite_caseFile;
        const lite_absFile = liteFn$lib$core$path$resolve(lite$processCwd(), lite_caseFile);
        void lite_absFile;
        const lite_checked = liteFn$lib$util$cases$validateCaseFile(lite_rootDir, lite_absFile);
        void lite_checked;
        if ((!((lite_checked).ok))) {
            return { ok: false, jsonText: "", error: (lite_checked).error };
        }
        const lite_caseText = (liteFn$lib$core$file$readText(lite_absFile)).text;
        void lite_caseText;
        const lite_caseDir = liteFn$lib$core$path$parentDir(lite_absFile);
        void lite_caseDir;
        const lite_kind = (liteFn$lib$util$json$readObjectString(lite_caseText, 0n, "kind")).value;
        void lite_kind;
        const lite_manifestHash = liteFn$lib$core$crypto$sha256File(lite_absFile);
        void lite_manifestHash;
        if ((!((lite_manifestHash).ok))) {
            return { ok: false, jsonText: "", error: (lite_manifestHash).error };
        }
        const lite_sourceTarget = (Boolean(((lite_kind) === (lite$m$lib$util$cases$CASE_KIND_TOOL))) ? liteFn$lib$core$path$join(lite_rootDir, (("bin/") + ((liteFn$lib$util$json$readObjectString(lite_caseText, 0n, "tool")).value))) : liteFn$lib$core$path$resolve(lite_caseDir, (liteFn$lib$util$json$readObjectString(lite_caseText, 0n, "source")).value));
        void lite_sourceTarget;
        const lite_sourceHash = liteFn$lib$core$crypto$sha256File(lite_sourceTarget);
        void lite_sourceHash;
        if ((!((lite_sourceHash).ok))) {
            return { ok: false, jsonText: "", error: (lite_sourceHash).error };
        }
        const lite_casesField = liteFn$lib$util$json$findObjectField(lite_caseText, 0n, "cases");
        void lite_casesField;
        const lite_scenarioJsonList: string[] = [...([])];
        void lite_scenarioJsonList;
        for (const lite_sPos of [...(liteFn$lib$util$json$arrayElementOffsets(lite_caseText, (lite_casesField).valuePos))]) {
            void lite_sPos;
            const lite_sName = (liteFn$lib$util$json$readObjectString(lite_caseText, lite_sPos, "name")).value;
            void lite_sName;
            const lite_stdinHash = liteFn$lib$core$crypto$sha256Bytes([...(liteFn$lib$util$streams$readStreamBytes(lite_caseText, (liteFn$lib$util$json$findObjectField(lite_caseText, lite_sPos, "stdin")).valuePos, lite_caseDir))]);
            void lite_stdinHash;
            const lite_stdoutHash = liteFn$lib$core$crypto$sha256Bytes([...(liteFn$lib$util$streams$readStreamBytes(lite_caseText, (liteFn$lib$util$json$findObjectField(lite_caseText, lite_sPos, "stdout")).valuePos, lite_caseDir))]);
            void lite_stdoutHash;
            const lite_stderrHash = liteFn$lib$core$crypto$sha256Bytes([...(liteFn$lib$util$streams$readStreamBytes(lite_caseText, (liteFn$lib$util$json$findObjectField(lite_caseText, lite_sPos, "stderr")).valuePos, lite_caseDir))]);
            void lite_stderrHash;
            const lite_fields: string[] = [...([(("\"name\":") + (liteFn$lib$util$json$quoteString(lite_sName))), (("\"stdin\":") + (liteFn$lib$util$json$quoteString(lite_stdinHash))), (("\"stdout\":") + (liteFn$lib$util$json$quoteString(lite_stdoutHash))), (("\"stderr\":") + (liteFn$lib$util$json$quoteString(lite_stderrHash)))])];
            void lite_fields;
            const lite_artField = liteFn$lib$util$json$findObjectField(lite_caseText, lite_sPos, "artifact");
            void lite_artField;
            if ((lite_artField).found) {
                const lite_artHash = liteFn$lib$core$crypto$sha256Bytes([...(liteFn$lib$util$streams$readStreamBytes(lite_caseText, (lite_artField).valuePos, lite_caseDir))]);
                void lite_artHash;
                lite_fields.push((("\"artifact\":") + (liteFn$lib$util$json$quoteString(lite_artHash))));
            }
            const lite_inFilesField = liteFn$lib$util$json$findObjectField(lite_caseText, lite_sPos, "inputFiles");
            void lite_inFilesField;
            if ((lite_inFilesField).found) {
                lite_fields.push((("\"inputFiles\":") + (liteFn$lib$util$cases$hashFileMapJson(lite_caseText, (lite_inFilesField).valuePos, lite_caseDir))));
            }
            const lite_outFilesField = liteFn$lib$util$json$findObjectField(lite_caseText, lite_sPos, "outputFiles");
            void lite_outFilesField;
            if ((lite_outFilesField).found) {
                lite_fields.push((("\"outputFiles\":") + (liteFn$lib$util$cases$hashFileMapJson(lite_caseText, (lite_outFilesField).valuePos, lite_caseDir))));
            }
            lite_scenarioJsonList.push((((("{") + (liteFn$lib$core$text$joinTexts([...(lite_fields)], ",")))) + ("}")));
        }
        const lite_body = (((((((((((("{\"manifest\":") + (liteFn$lib$util$json$quoteString((lite_manifestHash).hex)))) + (",\"source\":"))) + (liteFn$lib$util$json$quoteString((lite_sourceHash).hex)))) + (",\"streams\":["))) + (liteFn$lib$core$text$joinTexts([...(lite_scenarioJsonList)], ",")))) + ("]}"));
        void lite_body;
        return { ok: true, jsonText: lite_body, error: "" };
    }
    void liteFn$lib$util$cases$caseIdentityJson;
    function liteFn_formatNsAsMsJson(lite_nsRaw: bigint): string {
        void lite_nsRaw;
        const lite_ns = (Boolean(((lite_nsRaw) < (0n))) ? 0n : lite_nsRaw);
        void lite_ns;
        const lite_wholeMs = lite$divideInt(lite_ns, 1000000n, 630);
        void lite_wholeMs;
        const lite_micros = lite$divideInt((lite$subtractInt(lite_ns, lite$multiplyInt(lite_wholeMs, 1000000n, 669), 659)), 1000n, 680);
        void lite_micros;
        let lite_frac = liteFn$lib$core$int$intText(lite_micros);
        void lite_frac;
        if (((lite_micros) < (10n))) {
            lite_frac = (("00") + (lite_frac));
        } else if (((lite_micros) < (100n))) {
            lite_frac = (("0") + (lite_frac));
        }
        return ((((liteFn$lib$core$int$intText(lite_wholeMs)) + ("."))) + (lite_frac));
    }
    void liteFn_formatNsAsMsJson;
    function liteFn_sortInts(lite_items: bigint[]): bigint[] {
        void lite_items;
        const lite_out: bigint[] = [...([])];
        void lite_out;
        const lite_rem: bigint[] = [...([])];
        void lite_rem;
        let lite_remCount = 0n;
        void lite_remCount;
        for (const lite_item of [...(lite_items)]) {
            void lite_item;
            lite_rem.push(lite_item);
            lite_remCount = lite$addInt(lite_remCount, 1n, 1104);
        }
        while (((lite_remCount) > (0n))) {
            let lite_bestIdx = 0n;
            void lite_bestIdx;
            let lite_i = 1n;
            void lite_i;
            while (((lite_i) < (lite_remCount))) {
                if (((lite$listAt((lite_rem), lite_i, 1232)) < (lite$listAt((lite_rem), lite_bestIdx, 1241)))) {
                    lite_bestIdx = lite_i;
                }
                lite_i = lite$addInt(lite_i, 1n, 1313);
            }
            lite_out.push(lite$listAt((lite_rem), lite_bestIdx, 1363));
            const lite_next: bigint[] = [...([])];
            void lite_next;
            let lite_j = 0n;
            void lite_j;
            while (((lite_j) < (lite_remCount))) {
                if (((lite_j) !== (lite_bestIdx))) {
                    lite_next.push(lite$listAt((lite_rem), lite_j, 1531));
                }
                lite_j = lite$addInt(lite_j, 1n, 1568);
            }
            while (((lite_remCount) > (0n))) {
                const lite__dropped = lite$listPopBack(lite_rem, 1635);
                void lite__dropped;
                lite_remCount = lite$subtractInt(lite_remCount, 1n, 1690);
            }
            for (const lite_kept of [...(lite_next)]) {
                void lite_kept;
                lite_rem.push(lite_kept);
                lite_remCount = lite$addInt(lite_remCount, 1n, 1807);
            }
        }
        return [...(lite_out)];
    }
    void liteFn_sortInts;
    function liteFn_computeToolingHash(lite_rootDir: string): string {
        void lite_rootDir;
        const lite_digestBytes: bigint[] = [...([])];
        void lite_digestBytes;
        let lite_first = true;
        void lite_first;
        const lite_dirs: string[] = [...(["", "generated/"])];
        void lite_dirs;
        for (const lite_prefix of [...(lite_dirs)]) {
            void lite_prefix;
            const lite_dirPath = (Boolean(((lite_prefix) === (""))) ? liteFn$lib$core$path$join(lite_rootDir, "tools") : liteFn$lib$core$path$join(lite_rootDir, "tools/generated"));
            void lite_dirPath;
            if (((lite$fileKind(lite_dirPath)) === (lite$m$lib$core$file$FILE_KIND_DIR))) {
                const lite_entries: string[] = [...(lite$fileListDir(lite_dirPath))];
                void lite_entries;
                for (const lite_entry of [...(lite_entries)]) {
                    void lite_entry;
                    const lite_full = liteFn$lib$core$path$join(lite_dirPath, lite_entry);
                    void lite_full;
                    if (((liteFn$lib$core$text$endsWith(lite_entry, ".ts")) && (((lite$fileKind(lite_full)) === (lite$m$lib$core$file$FILE_KIND_FILE))))) {
                        if ((!(lite_first))) {
                            lite_digestBytes.push(0n);
                        }
                        lite_first = false;
                        for (const lite_b of [...(liteFn$lib$core$unicode$utf8Encode(((lite_prefix) + (lite_entry))))]) {
                            void lite_b;
                            lite_digestBytes.push(lite_b);
                        }
                        lite_digestBytes.push(0n);
                        for (const lite_b of [...(liteFn$lib$core$file$readBytes(lite_full))]) {
                            void lite_b;
                            lite_digestBytes.push(lite_b);
                        }
                    }
                }
            }
        }
        return liteFn$lib$core$crypto$sha256Bytes([...(lite_digestBytes)]);
    }
    void liteFn_computeToolingHash;
    function liteFn_readCompilerJson(lite_rootDir: string): { ok: boolean; jsonText: string; error: string } {
        void lite_rootDir;
        const lite_emptyEnv: string[] = [...([])];
        void lite_emptyEnv;
        const lite_args: string[] = [...([liteFn$lib$core$path$join(lite_rootDir, "compiler/scripts/build.ts")])];
        void lite_args;
        const lite_built = lite$processRun(lite$processExecPath(), [...(lite_args)], lite_rootDir, [...(lite_emptyEnv)], true, "");
        void lite_built;
        if ((((lite_built).error) !== (""))) {
            return { ok: false, jsonText: "", error: (lite_built).error };
        }
        if ((((lite_built).status) !== (0n))) {
            return { ok: false, jsonText: "", error: (((lite_built).stdout) + ((lite_built).stderr)) };
        }
        const lite_tsField = liteFn$lib$util$json$findObjectField((lite_built).stdout, 0n, "ts");
        void lite_tsField;
        if ((!((lite_tsField).found))) {
            return { ok: false, jsonText: "", error: "missing ts compiler metadata" };
        }
        const lite_srcHash = liteFn$lib$util$json$readObjectString((lite_built).stdout, (lite_tsField).valuePos, "sourceSha256");
        void lite_srcHash;
        const lite_artHash = liteFn$lib$util$json$readObjectString((lite_built).stdout, (lite_tsField).valuePos, "artifactSha256");
        void lite_artHash;
        const lite_bldHash = liteFn$lib$util$json$readObjectString((lite_built).stdout, (lite_tsField).valuePos, "builderSha256");
        void lite_bldHash;
        if ((((((!((lite_srcHash).found))) || ((!((lite_artHash).found))))) || ((!((lite_bldHash).found))))) {
            return { ok: false, jsonText: "", error: "incomplete ts compiler digest metadata" };
        }
        const lite_body = (((((((((((("{\"source\":") + (liteFn$lib$util$json$quoteString((lite_srcHash).value)))) + (",\"artifact\":"))) + (liteFn$lib$util$json$quoteString((lite_artHash).value)))) + (",\"builder\":"))) + (liteFn$lib$util$json$quoteString((lite_bldHash).value)))) + ("}"));
        void lite_body;
        return { ok: true, jsonText: lite_body, error: "" };
    }
    void liteFn_readCompilerJson;
    function liteFn_run(lite_args: string[]): void {
        void lite_args;
        liteFn$lib$util$project$handleVersionFlag([...(lite_args)], "benchmark", "bench");
        const lite_normalized: string[] = [...(liteFn$lib$util$cli$stripLeadingSeparator([...(lite_args)]))];
        void lite_normalized;
        const lite_argCount = liteFn$lib$core$list$listCountText([...(lite_normalized)]);
        void lite_argCount;
        if (((((lite_argCount) < (1n))) || (((lite_argCount) > (2n))))) {
            lite$reportError("usage: lite bench OUTPUT [FILTER]");
            lite$exit(1n);
        }
        const lite_output = liteFn$lib$core$path$resolve(lite$processCwd(), lite$listAt((lite_normalized), 0n, 4638));
        void lite_output;
        const lite_filter = (Boolean(((lite_argCount) === (2n))) ? lite$listAt((lite_normalized), 1n, 4687) : "");
        void lite_filter;
        if (((lite$fileKind(lite_output)) !== (lite$m$lib$core$file$FILE_KIND_MISSING))) {
            lite$reportError("benchmark output already exists; choose a new report path");
            lite$exit(1n);
        }
        const lite_root = liteFn$lib$util$project$findRepoRoot();
        void lite_root;
        if (((lite_root) === (""))) {
            lite$reportError("could not locate LiteScript repository root");
            lite$exit(1n);
        }
        const lite_checkedSet = liteFn$lib$util$cases$validateCaseSet(lite_root, lite_filter);
        void lite_checkedSet;
        if ((!((lite_checkedSet).ok))) {
            lite$reportError((lite_checkedSet).error);
            lite$exit(1n);
        }
        const lite_caseFiles: string[] = [...(liteFn$lib$util$cases$selectCaseFiles(lite_root, lite_filter))];
        void lite_caseFiles;
        const lite_resultsJson: string[] = [...([])];
        void lite_resultsJson;
        for (const lite_caseFile of [...(lite_caseFiles)]) {
            void lite_caseFile;
            const lite_meta = liteFn$lib$util$cases$readCaseMeta(lite_root, lite_caseFile);
            void lite_meta;
            if ((!((lite_meta).ok))) {
                lite$reportError((lite_meta).error);
                lite$exit(1n);
            }
            if ((lite_meta).hasBenchmark) {
                if ((lite_meta).hasPending) {
                    lite$reportError((((((lite_meta).id) + (": pending: "))) + ((lite_meta).pending)));
                    lite$exit(1n);
                }
                const lite_ident = liteFn$lib$util$cases$caseIdentityJson(lite_root, lite_caseFile);
                void lite_ident;
                if ((!((lite_ident).ok))) {
                    lite$reportError((lite_ident).error);
                    lite$exit(1n);
                }
                let lite_sIdx = 0n;
                void lite_sIdx;
                while (((lite_sIdx) < ((lite_meta).scenarioCount))) {
                    const lite_sName = liteFn$lib$util$cases$readScenarioName(lite_caseFile, lite_sIdx);
                    void lite_sName;
                    let lite_w = 0n;
                    void lite_w;
                    while (((lite_w) < ((lite_meta).warmups))) {
                        const lite_wRes = liteFn$lib$util$cases$verifyCaseScenario(lite_root, lite_caseFile, lite_sIdx);
                        void lite_wRes;
                        if ((!((lite_wRes).ok))) {
                            lite$reportError((lite_wRes).error);
                            lite$exit(1n);
                        }
                        lite_w = lite$addInt(lite_w, 1n, 6246);
                    }
                    const lite_samplesNs: bigint[] = [...([])];
                    void lite_samplesNs;
                    let lite_s = 0n;
                    void lite_s;
                    while (((lite_s) < ((lite_meta).samples))) {
                        const lite_t0 = lite$timeMonotonicNs();
                        void lite_t0;
                        const lite_sRes = liteFn$lib$util$cases$verifyCaseScenario(lite_root, lite_caseFile, lite_sIdx);
                        void lite_sRes;
                        const lite_t1 = lite$timeMonotonicNs();
                        void lite_t1;
                        if ((!((lite_sRes).ok))) {
                            lite$reportError((lite_sRes).error);
                            lite$exit(1n);
                        }
                        lite_samplesNs.push(lite$subtractInt(lite_t1, lite_t0, 6749));
                        lite_s = lite$addInt(lite_s, 1n, 6782);
                    }
                    const lite_sorted: bigint[] = [...(liteFn_sortInts([...(lite_samplesNs)]))];
                    void lite_sorted;
                    const lite_medianNs = lite$listAt((lite_sorted), lite$divideInt(liteFn$lib$core$list$listCountInt([...(lite_sorted)]), 2n, 6913), 6887);
                    void lite_medianNs;
                    const lite_msFields: string[] = [...([])];
                    void lite_msFields;
                    for (const lite_sampleNs of [...(lite_samplesNs)]) {
                        void lite_sampleNs;
                        lite_msFields.push(liteFn_formatNsAsMsJson(lite_sampleNs));
                    }
                    const lite_entry = (((((((((((((((((((((((((((((("{\"id\":") + (liteFn$lib$util$json$quoteString((lite_meta).id)))) + (",\"scenario\":"))) + (liteFn$lib$util$json$quoteString(lite_sName)))) + (",\"kind\":"))) + (liteFn$lib$util$json$quoteString((lite_meta).kind)))) + (",\"identity\":"))) + ((lite_ident).jsonText))) + (",\"warmups\":"))) + (liteFn$lib$core$int$intText((lite_meta).warmups)))) + (",\"milliseconds\":["))) + (liteFn$lib$core$text$joinTexts([...(lite_msFields)], ",")))) + ("]"))) + (",\"medianMilliseconds\":"))) + (liteFn_formatNsAsMsJson(lite_medianNs)))) + ("}"));
                    void lite_entry;
                    lite_resultsJson.push(lite_entry);
                    lite_sIdx = lite$addInt(lite_sIdx, 1n, 7693);
                }
            }
        }
        const lite_resultCount = liteFn$lib$core$list$listCountText([...(lite_resultsJson)]);
        void lite_resultCount;
        if (((lite_resultCount) === (0n))) {
            lite$reportError("no benchmark cases selected");
            lite$exit(1n);
        }
        const lite_emptyEnv: string[] = [...([])];
        void lite_emptyEnv;
        const lite_hasGit = ((lite$fileKind(liteFn$lib$core$path$join(lite_root, ".git"))) !== (lite$m$lib$core$file$FILE_KIND_MISSING));
        void lite_hasGit;
        let lite_commitJson = "null";
        void lite_commitJson;
        let lite_dirtyJson = "null";
        void lite_dirtyJson;
        if (lite_hasGit) {
            const lite_revArgs: string[] = [...(["rev-parse", "HEAD"])];
            void lite_revArgs;
            const lite_revRes = lite$processRun("git", [...(lite_revArgs)], lite_root, [...(lite_emptyEnv)], true, "");
            void lite_revRes;
            if ((((((lite_revRes).error) !== (""))) || ((((lite_revRes).status) !== (0n))))) {
                lite$reportError((((((("git rev-parse HEAD failed: ") + ((lite_revRes).stdout))) + ((lite_revRes).stderr))) + ((lite_revRes).error)));
                lite$exit(1n);
            }
            lite_commitJson = liteFn$lib$util$json$quoteString(liteFn$lib$core$text$trim((lite_revRes).stdout));
            const lite_statArgs: string[] = [...(["status", "--porcelain"])];
            void lite_statArgs;
            const lite_statRes = lite$processRun("git", [...(lite_statArgs)], lite_root, [...(lite_emptyEnv)], true, "");
            void lite_statRes;
            if ((((((lite_statRes).error) !== (""))) || ((((lite_statRes).status) !== (0n))))) {
                lite$reportError((((((("git status failed: ") + ((lite_statRes).stdout))) + ((lite_statRes).stderr))) + ((lite_statRes).error)));
                lite$exit(1n);
            }
            lite_dirtyJson = (Boolean(((lite$textLength((lite_statRes).stdout)) > (0n))) ? "true" : "false");
        }
        const lite_verRes = liteFn$lib$util$release$versionsJson(lite_root);
        void lite_verRes;
        if ((!((lite_verRes).ok))) {
            lite$reportError((lite_verRes).error);
            lite$exit(1n);
        }
        const lite_compRes = liteFn_readCompilerJson(lite_root);
        void lite_compRes;
        if ((!((lite_compRes).ok))) {
            lite$reportError((lite_compRes).error);
            lite$exit(1n);
        }
        const lite_toolingHash = liteFn_computeToolingHash(lite_root);
        void lite_toolingHash;
        const lite_mkOut = lite$fileMakeDir(liteFn$lib$core$path$parentDir(lite_output));
        void lite_mkOut;
        if ((!((lite_mkOut).ok))) {
            lite$reportError((lite_mkOut).error);
            lite$exit(1n);
        }
        if (((lite$fileKind(lite_output)) !== (lite$m$lib$core$file$FILE_KIND_MISSING))) {
            lite$reportError("benchmark output already exists; choose a new report path");
            lite$exit(1n);
        }
        const lite_scopeText = "fresh-process wall time including startup, IO, verification, and compilation for program cases";
        void lite_scopeText;
        const lite_report = (((((((((((((((((((((((((((((((((((((((((("{\n  \"commit\": ") + (lite_commitJson))) + (",\n"))) + ("  \"dirty\": "))) + (lite_dirtyJson))) + (",\n"))) + ("  \"versions\": "))) + ((lite_verRes).jsonText))) + (",\n"))) + ("  \"compiler\": "))) + ((lite_compRes).jsonText))) + (",\n"))) + ("  \"tooling\": "))) + (liteFn$lib$util$json$quoteString(lite_toolingHash)))) + (",\n"))) + ("  \"scope\": "))) + (liteFn$lib$util$json$quoteString(lite_scopeText)))) + (",\n"))) + ("  \"results\": [\n    "))) + (liteFn$lib$core$text$joinTexts([...(lite_resultsJson)], ",\n    ")))) + ("\n  ]\n"))) + ("}\n"));
        void lite_report;
        const lite_wrote = liteFn$lib$core$file$writeText(lite_output, lite_report);
        void lite_wrote;
        if ((!((lite_wrote).ok))) {
            lite$reportError((lite_wrote).error);
            lite$exit(1n);
        }
        lite$emit((((((("Wrote ") + (liteFn$lib$core$int$intText(lite_resultCount)))) + (" benchmark results to "))) + (lite_output)) + "\n");
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
