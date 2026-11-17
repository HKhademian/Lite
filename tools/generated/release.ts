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
function lite$fileWriteText(path: string, text: string): { ok: boolean; error: string } {
    try { process.getBuiltinModule("node:fs").writeFileSync(path, text, "utf8"); return { ok: true, error: "" }; }
    catch (error) { return { ok: false, error: lite$errMsg(error) }; }
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

const lite$intLines: readonly number[] = [0, 89, 90, 114, 140, 171, 199, 227, 257, 289, 317, 345, 371, 405, 435, 436, 500, 528, 571, 630, 636, 663, 679, 682, 683, 802, 835, 896, 922, 1014, 1020, 1046, 1078, 1129, 1139, 1257, 1263, 1278, 1281, 1282, 1387, 1443, 1521, 1567, 1573, 1627, 1687, 1727, 1730, 1731, 1845, 1901, 1979, 2031, 2037, 2088, 2154, 2194, 2197, 2198, 2251, 2308, 2384, 2385, 2428, 2463, 2506, 2568, 2593, 2603, 2646, 2717, 2742, 2752, 2830, 2836, 2837, 2885, 2921, 2962, 3020, 3021, 3088, 3157, 3228, 3299, 3379, 3461, 3462, 3492, 3520, 3547, 3623, 3708, 3736, 3830, 3921, 3931, 3932, 3962, 3990, 4017, 4080, 4165, 4193, 4282, 4372, 4382, 4383, 4413, 4440, 4472, 4503, 4533, 4566, 4601, 4636, 4671, 4702, 4770, 4855, 4883, 4978, 5066, 5101, 5201, 5298, 5335, 5440, 5458, 5472, 5560, 5595, 5687, 5732, 5778, 5884, 5994, 6104, 6204, 6245, 6362, 6380, 6394, 6404, 6405, 6449, 6481, 6517, 6559, 6595, 6633, 6734, 6754, 6765, 6794, 6815, 6821, 6831, 6834, 6835, 6912, 6970, 7037, 7073, 7142, 7148, 7149, 7201, 7274, 7275, 7335, 7360, 7401, 7407, 7408, 7428, 7504, 7615, 7646, 7709, 7719, 7806, 7921, 7955, 8018, 8028, 8034, 8035, 8067, 8109, 8197, 8268, 8278, 8284, 8285, 8375, 8423, 8481, 8507, 8508, 8549, 8585, 8647, 8648, 8694, 8778, 8835, 8897, 8947, 8948, 9035, 9101, 9102, 9128, 9156, 9179, 9207, 9234, 9260, 9289, 9320, 9351, 9382, 9409, 9410, 9449, 9519, 9578, 9694, 9704, 9766, 9820, 9884, 9885, 9939, 10056, 10138, 10190, 10260, 10346, 10425, 10509, 10519, 10545, 10632, 10661, 10760, 10770, 10771, 10834, 10947, 11027, 11079, 11149, 11239, 11340, 11447, 11546, 11547, 11629, 11666, 11704, 11800, 11900, 12000, 12001, 12046, 12151, 12222, 12286, 12303, 12392, 12402, 12403, 12427, 12526, 12614, 12684, 12685, 12737, 12795, 12886, 12896, 12937, 12997, 13068, 13130, 13239, 13299, 13393, 13457, 13458, 13496, 13558, 13617, 13681, 13687, 13688, 13714, 13738, 13761, 13821, 13912, 13967, 14046, 14056, 14113, 14274, 14368, 14436, 14506, 14530, 14564, 14570, 14571, 14656, 14729, 14805, 14806, 14878, 14919, 14934, 14947, 15021, 15099, 15106, 15139, 15154, 15167, 15226, 15294, 15301, 15302, 15330, 15364, 15402, 15460, 15513, 15582, 15642, 15687, 15726, 15765, 15776, 15777, 15835, 15894, 15971, 15977, 16039, 16103, 16104, 16148, 16193, 16263, 16311, 16312, 16359, 16395, 16451, 16520, 16570, 16571, 16658, 16724, 16725, 16850, 16925, 16971, 17020, 17080, 17081, 17167, 17244, 17273, 17372, 17378, 17379, 17429, 17495, 17529, 17581, 17582, 17615, 17671, 17735, 17793, 17810, 17893, 17955, 17961, 18038, 18094, 18095, 18132, 18160, 18219, 18257, 18289, 18323, 18420, 18436, 18443, 18518, 18578, 18579, 18615, 18635, 18663, 18723, 18781, 18834, 18840, 18907, 18965, 18966, 18997, 19050, 19053, 19054, 19095, 19143, 19187, 19246, 19247, 19280, 19318, 19352, 19429, 19490, 19496, 19497, 19546, 19656, 19681, 19739, 19745, 19818, 19858, 19861, 19862, 19883];
const lite$intSource = "tools/src/release.lts:";
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
    const lite$m$lib$util$release$PROFILE_TOOLS = "tools";
    void lite$m$lib$util$release$PROFILE_TOOLS;
    const lite$m$lib$util$release$PROFILE_COMPILER = "compiler";
    void lite$m$lib$util$release$PROFILE_COMPILER;
    const lite$m$lib$util$release$PROFILE_LANGUAGE = "language";
    void lite$m$lib$util$release$PROFILE_LANGUAGE;
    function liteFn$lib$util$release$releaseProfile(lite_hasTag: boolean, lite_component: string, lite_version: string): string {
        void lite_hasTag;
        void lite_component;
        void lite_version;
        const lite_toolComponents: string[] = [...(["cli", "checker", "tester", "verifier", "benchmark", "release", "docs", "vscode", "formatter", "linker", "doctor"])];
        void lite_toolComponents;
        if ((((!(lite_hasTag))) || (liteFn$lib$core$list$listContainsText([...(lite_toolComponents)], lite_component)))) {
            return lite$m$lib$util$release$PROFILE_TOOLS;
        }
        if (((((((lite_component) === ("project"))) || (((lite_component) === ("language"))))) || (((lite_component) === ("scripting"))))) {
            return lite$m$lib$util$release$PROFILE_LANGUAGE;
        }
        if (((((lite_component) === ("compiler"))) && (((liteFn$lib$core$text$indexOfText(lite_version, "-", 0n)) < (0n))))) {
            return lite$m$lib$util$release$PROFILE_LANGUAGE;
        }
        return lite$m$lib$util$release$PROFILE_COMPILER;
    }
    void liteFn$lib$util$release$releaseProfile;
    function liteFn$lib$util$release$profileSummary(lite_profile: string): string {
        void lite_profile;
        if (((lite_profile) === (lite$m$lib$util$release$PROFILE_COMPILER))) {
            return "Compiler preview verified across the three-generation fixed-point bootstrap ladder and recorded corpus contracts; native C remains deferred.";
        }
        if (((lite_profile) === (lite$m$lib$util$release$PROFILE_LANGUAGE))) {
            return "Language release verified across the three-generation bootstrap ladder, recorded corpus contracts, and full `lite verify --all --no-cache` conformance.";
        }
        return "Tool/source snapshot validated for CLI, docs, and extracted TS compilation; does not establish full language conformance.";
    }
    void liteFn$lib$util$release$profileSummary;
    function liteFn$lib$util$release$formatReleaseNotes(lite_label: string, lite_commit: string, lite_profile: string, lite_hasComponent: boolean, lite_componentName: string, lite_componentVersion: string, lite_archive: string, lite_archiveSha256: string, lite_manifestSha256: string, lite_hasVsix: boolean, lite_vsixFile: string, lite_vsixSha256: string, lite_hasBootstrap: boolean, lite_bootstrapGenerations: bigint, lite_bootstrapFixedPoint: boolean, lite_hasCorpusCases: boolean, lite_corpusCases: bigint, lite_corpusPrograms: bigint, lite_corpusRejections: bigint, lite_corpusExecutions: bigint, lite_corpusMismatches: bigint, lite_bootstrapSupport: string): string {
        void lite_label;
        void lite_commit;
        void lite_profile;
        void lite_hasComponent;
        void lite_componentName;
        void lite_componentVersion;
        void lite_archive;
        void lite_archiveSha256;
        void lite_manifestSha256;
        void lite_hasVsix;
        void lite_vsixFile;
        void lite_vsixSha256;
        void lite_hasBootstrap;
        void lite_bootstrapGenerations;
        void lite_bootstrapFixedPoint;
        void lite_hasCorpusCases;
        void lite_corpusCases;
        void lite_corpusPrograms;
        void lite_corpusRejections;
        void lite_corpusExecutions;
        void lite_corpusMismatches;
        void lite_bootstrapSupport;
        const lite_componentText = (Boolean((!(lite_hasComponent))) ? "unpublished snapshot" : ((((lite_componentName) + (" v"))) + (lite_componentVersion)));
        void lite_componentText;
        const lite_lines: string[] = [...([(("# ") + (lite_label)), "", (((("- **Source commit**: `") + (lite_commit))) + ("`")), (("- **Released component**: ") + (lite_componentText)), (((((("- **Readiness profile**: `") + (lite_profile))) + ("` — "))) + (liteFn$lib$util$release$profileSummary(lite_profile))), "- **Native C backend**: deferred (`nativeCompiler: false`)", "", "## Verification", "", "- Extracted archive validated with `./bin/lite doctor --docs`", "- Node-only TypeScript emission & execution roundtrip verified on `001-001-report-int-42.lts` (output `42`)"])];
        void lite_lines;
        if (lite_hasBootstrap) {
            const lite_ladderStatus = (Boolean(lite_bootstrapFixedPoint) ? "passed" : "failed");
            void lite_ladderStatus;
            const lite_corpusStats = (Boolean((!(lite_hasCorpusCases))) ? (("mismatches=") + (liteFn$lib$core$int$intText(lite_corpusMismatches))) : ((((((((((((((((liteFn$lib$core$int$intText(lite_corpusCases)) + (" cases ("))) + (liteFn$lib$core$int$intText(lite_corpusPrograms)))) + (" programs, "))) + (liteFn$lib$core$int$intText(lite_corpusRejections)))) + (" rejections, "))) + (liteFn$lib$core$int$intText(lite_corpusExecutions)))) + (" executions), mismatches="))) + (liteFn$lib$core$int$intText(lite_corpusMismatches))));
            void lite_corpusStats;
            lite_lines.push((((((((("- Self-hosting fixed-point ladder: ") + (lite_ladderStatus))) + (" ("))) + (liteFn$lib$core$int$intText(lite_bootstrapGenerations)))) + (" generations)")));
            lite_lines.push((("- Generated corpus parity: ") + (lite_corpusStats)));
            if (((lite_profile) === (lite$m$lib$util$release$PROFILE_LANGUAGE))) {
                lite_lines.push("- Full repository verification: `./bin/lite verify --all --no-cache` passed");
            }
            lite_lines.push((((("- Embedded archive evidence: `release/compiler.ts`, `release/compiler-source.lts`, `release/verification.json` (") + (lite_bootstrapSupport))) + (")")));
        }
        lite_lines.push("");
        lite_lines.push("## Artifacts");
        lite_lines.push("");
        lite_lines.push((((((((("- `") + (lite_archive))) + ("` — sha256: `"))) + (lite_archiveSha256))) + ("`")));
        if (lite_hasVsix) {
            lite_lines.push((((((((("- `") + (lite_vsixFile))) + ("` — sha256: `"))) + (lite_vsixSha256))) + ("`")));
        }
        lite_lines.push((((("- `manifest.json` — sha256: `") + (lite_manifestSha256))) + ("`")));
        lite_lines.push("- `RELEASE-NOTES.md` — these release notes");
        lite_lines.push("- `SHA256SUMS` — checksum manifest for all release files");
        lite_lines.push("");
        lite_lines.push("## Verify and extract");
        lite_lines.push("");
        lite_lines.push("```sh");
        lite_lines.push("shasum -a 256 -c SHA256SUMS");
        lite_lines.push((((((((((("mkdir -p lite-") + (lite_label))) + (" && tar -xzf "))) + (lite_archive))) + (" -C lite-"))) + (lite_label)));
        lite_lines.push((((("cd lite-") + (lite_label))) + (" && ./bin/lite doctor --docs")));
        lite_lines.push("```");
        lite_lines.push("");
        lite_lines.push("See `docs/start-here.md`, `docs/release-automation.md`, and `compiler/transition-plan.md` in the archive.");
        lite_lines.push("");
        return liteFn$lib$core$text$joinTexts([...(lite_lines)], "\n");
    }
    void liteFn$lib$util$release$formatReleaseNotes;
    function liteFn$lib$util$release$formatComponentVersionsJson(lite_rootDir: string, lite_indent: string): { ok: boolean; jsonText: string; error: string } {
        void lite_rootDir;
        void lite_indent;
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
        const lite_components: string[] = [...(liteFn$lib$util$release$allComponents())];
        void lite_components;
        const lite_entries: string[] = [...([])];
        void lite_entries;
        for (const lite_component of [...(lite_components)]) {
            void lite_component;
            if (((lite_component) === ("igniter"))) {
                lite_entries.push(((((lite_indent) + ("  \"igniter\": "))) + (liteFn$lib$util$json$quoteString((lite_igniterRes).version))));
            } else {
                const lite_field = liteFn$lib$util$json$findObjectField((lite_verRead).text, 0n, lite_component);
                void lite_field;
                if ((!((lite_field).found))) {
                    return { ok: false, jsonText: "", error: (("missing version for ") + (lite_component)) };
                }
                if (liteFn$lib$core$text$startsWithAt((lite_verRead).text, (lite_field).valuePos, "null")) {
                    lite_entries.push(((((((lite_indent) + ("  "))) + (liteFn$lib$util$json$quoteString(lite_component)))) + (": null")));
                } else {
                    const lite_strRes = liteFn$lib$util$json$readStringAt((lite_verRead).text, (lite_field).valuePos);
                    void lite_strRes;
                    if ((!((lite_strRes).ok))) {
                        return { ok: false, jsonText: "", error: (("invalid version for ") + (lite_component)) };
                    }
                    lite_entries.push(((((((((lite_indent) + ("  "))) + (liteFn$lib$util$json$quoteString(lite_component)))) + (": "))) + (liteFn$lib$util$json$quoteString((lite_strRes).value))));
                }
            }
        }
        return { ok: true, jsonText: (((((((("{\n") + (liteFn$lib$core$text$joinTexts([...(lite_entries)], ",\n")))) + ("\n"))) + (lite_indent))) + ("}")), error: "" };
    }
    void liteFn$lib$util$release$formatComponentVersionsJson;
    function liteFn_failRelease(lite_workToClean: string, lite_message: string): void {
        void lite_workToClean;
        void lite_message;
        if (((lite_workToClean) !== (""))) {
            const lite_removed = lite$fileRemove(lite_workToClean);
            void lite_removed;
            if ((!((lite_removed).ok))) {
                lite$reportError((lite_removed).error);
            }
        }
        lite$reportError(lite_message);
        lite$exit(1n);
    }
    void liteFn_failRelease;
    function liteFn_runChecked(lite_workToClean: string, lite_command: string, lite_args: string[], lite_cwd: string, lite_customError: string): string {
        void lite_workToClean;
        void lite_command;
        void lite_args;
        void lite_cwd;
        void lite_customError;
        const lite_emptyEnv: string[] = [...([])];
        void lite_emptyEnv;
        const lite_res = lite$processRun(lite_command, [...(lite_args)], lite_cwd, [...(lite_emptyEnv)], true, "");
        void lite_res;
        if ((((lite_res).error) !== (""))) {
            liteFn_failRelease(lite_workToClean, (Boolean(((lite_customError) !== (""))) ? lite_customError : (lite_res).error));
        }
        if ((((lite_res).status) !== (0n))) {
            if (((lite_customError) !== (""))) {
                liteFn_failRelease(lite_workToClean, lite_customError);
            }
            liteFn_failRelease(lite_workToClean, ((((((((((lite_command) + (" "))) + (liteFn$lib$core$text$joinTexts([...(lite_args)], " ")))) + (" failed:\n"))) + ((lite_res).stdout))) + ((lite_res).stderr)));
        }
        return (lite_res).stdout;
    }
    void liteFn_runChecked;
    function liteFn_readOptionalJsonInt(lite_source: string, lite_objPos: bigint, lite_key: string, lite_fallback: bigint): { present: boolean; value: bigint } {
        void lite_source;
        void lite_objPos;
        void lite_key;
        void lite_fallback;
        const lite_field = liteFn$lib$util$json$findObjectField(lite_source, lite_objPos, lite_key);
        void lite_field;
        if ((((!((lite_field).found))) || (liteFn$lib$core$text$startsWithAt(lite_source, (lite_field).valuePos, "null")))) {
            return { present: false, value: lite_fallback };
        }
        const lite_num = liteFn$lib$util$json$readIntAt(lite_source, (lite_field).valuePos);
        void lite_num;
        if ((!((lite_num).ok))) {
            return { present: false, value: lite_fallback };
        }
        return { present: true, value: (lite_num).value };
    }
    void liteFn_readOptionalJsonInt;
    function liteFn_handleInternalMode(lite_args: string[]): boolean {
        void lite_args;
        const lite_internalEnv = lite$processEnvGet("LITE_RELEASE_INTERNAL");
        void lite_internalEnv;
        if ((((!((lite_internalEnv).found))) || ((((lite_internalEnv).value) !== ("1"))))) {
            return false;
        }
        if (liteFn$lib$util$cli$startsWith([...(lite_args)], "--profile")) {
            const lite_rest: string[] = [...(liteFn$lib$util$cli$rest([...(lite_args)], 1n))];
            void lite_rest;
            if (((liteFn$lib$core$list$listCountText([...(lite_rest)])) === (0n))) {
                lite$emit(liteFn$lib$util$release$releaseProfile(false, "", "") + "\n");
                return true;
            }
            if (((liteFn$lib$core$list$listCountText([...(lite_rest)])) === (2n))) {
                lite$emit(liteFn$lib$util$release$releaseProfile(true, lite$listAt((lite_rest), 0n, 2702), lite$listAt((lite_rest), 1n, 2711)) + "\n");
                return true;
            }
            liteFn_failRelease("", "usage: lite release --profile [COMPONENT VERSION]");
        }
        if (liteFn$lib$util$cli$startsWith([...(lite_args)], "--format-notes")) {
            const lite_payload = lite$inputAll("", "tools/src/release.lts:78:20: InputFault: ");
            void lite_payload;
            const lite_valid = liteFn$lib$util$json$validate(lite_payload);
            void lite_valid;
            if ((!((lite_valid).ok))) {
                liteFn_failRelease("", (lite_valid).error);
            }
            const lite_label = (liteFn$lib$util$json$readObjectString(lite_payload, 0n, "label")).value;
            void lite_label;
            const lite_commit = (liteFn$lib$util$json$readObjectString(lite_payload, 0n, "commit")).value;
            void lite_commit;
            const lite_profile = (liteFn$lib$util$json$readObjectString(lite_payload, 0n, "profile")).value;
            void lite_profile;
            const lite_archive = (liteFn$lib$util$json$readObjectString(lite_payload, 0n, "archive")).value;
            void lite_archive;
            const lite_archiveSha = (liteFn$lib$util$json$readObjectString(lite_payload, 0n, "archiveSha256")).value;
            void lite_archiveSha;
            const lite_manifestSha = (liteFn$lib$util$json$readObjectString(lite_payload, 0n, "manifestSha256")).value;
            void lite_manifestSha;
            let lite_hasComp = false;
            void lite_hasComp;
            let lite_compName = "";
            void lite_compName;
            let lite_compVer = "";
            void lite_compVer;
            const lite_compField = liteFn$lib$util$json$findObjectField(lite_payload, 0n, "releasedComponent");
            void lite_compField;
            if ((((lite_compField).found) && (liteFn$lib$core$text$startsWithAt(lite_payload, (lite_compField).valuePos, "{")))) {
                lite_hasComp = true;
                lite_compName = (liteFn$lib$util$json$readObjectString(lite_payload, (lite_compField).valuePos, "component")).value;
                lite_compVer = (liteFn$lib$util$json$readObjectString(lite_payload, (lite_compField).valuePos, "version")).value;
            }
            let lite_hasVsix = false;
            void lite_hasVsix;
            let lite_vsixFile = "";
            void lite_vsixFile;
            let lite_vsixSha = "";
            void lite_vsixSha;
            const lite_vsixField = liteFn$lib$util$json$findObjectField(lite_payload, 0n, "vsix");
            void lite_vsixField;
            if ((((lite_vsixField).found) && (liteFn$lib$core$text$startsWithAt(lite_payload, (lite_vsixField).valuePos, "{")))) {
                lite_hasVsix = true;
                lite_vsixFile = (liteFn$lib$util$json$readObjectString(lite_payload, (lite_vsixField).valuePos, "file")).value;
                lite_vsixSha = (liteFn$lib$util$json$readObjectString(lite_payload, (lite_vsixField).valuePos, "sha256")).value;
            }
            let lite_hasBoot = false;
            void lite_hasBoot;
            let lite_bootGens = 0n;
            void lite_bootGens;
            let lite_bootFixed = false;
            void lite_bootFixed;
            let lite_hasCases = false;
            void lite_hasCases;
            let lite_corpusCases = 0n;
            void lite_corpusCases;
            let lite_corpusPrograms = 0n;
            void lite_corpusPrograms;
            let lite_corpusRejections = 0n;
            void lite_corpusRejections;
            let lite_corpusExecutions = 0n;
            void lite_corpusExecutions;
            let lite_corpusMismatches = 0n;
            void lite_corpusMismatches;
            let lite_bootSupport = "";
            void lite_bootSupport;
            const lite_bootField = liteFn$lib$util$json$findObjectField(lite_payload, 0n, "bootstrap");
            void lite_bootField;
            if ((((lite_bootField).found) && (liteFn$lib$core$text$startsWithAt(lite_payload, (lite_bootField).valuePos, "{")))) {
                lite_hasBoot = true;
                lite_bootSupport = (liteFn$lib$util$json$readObjectString(lite_payload, (lite_bootField).valuePos, "support")).value;
                const lite_ladderField = liteFn$lib$util$json$findObjectField(lite_payload, (lite_bootField).valuePos, "ladder");
                void lite_ladderField;
                if ((lite_ladderField).found) {
                    lite_bootFixed = (liteFn$lib$util$json$readObjectBool(lite_payload, (lite_ladderField).valuePos, "fixedPoint")).value;
                    const lite_gensField = liteFn$lib$util$json$findObjectField(lite_payload, (lite_ladderField).valuePos, "generations");
                    void lite_gensField;
                    if ((lite_gensField).found) {
                        lite_bootGens = liteFn$lib$core$list$listCountInt([...(liteFn$lib$util$json$arrayElementOffsets(lite_payload, (lite_gensField).valuePos))]);
                    }
                }
                const lite_corpusField = liteFn$lib$util$json$findObjectField(lite_payload, (lite_bootField).valuePos, "corpus");
                void lite_corpusField;
                if ((lite_corpusField).found) {
                    const lite_casesOpt = liteFn_readOptionalJsonInt(lite_payload, (lite_corpusField).valuePos, "cases", 0n);
                    void lite_casesOpt;
                    lite_hasCases = (lite_casesOpt).present;
                    lite_corpusCases = (lite_casesOpt).value;
                    lite_corpusPrograms = (liteFn_readOptionalJsonInt(lite_payload, (lite_corpusField).valuePos, "programs", 0n)).value;
                    lite_corpusRejections = (liteFn_readOptionalJsonInt(lite_payload, (lite_corpusField).valuePos, "rejections", 0n)).value;
                    lite_corpusExecutions = (liteFn_readOptionalJsonInt(lite_payload, (lite_corpusField).valuePos, "executions", 0n)).value;
                    const lite_mismatchField = liteFn$lib$util$json$findObjectField(lite_payload, (lite_corpusField).valuePos, "mismatches");
                    void lite_mismatchField;
                    if ((lite_mismatchField).found) {
                        lite_corpusMismatches = liteFn$lib$core$list$listCountInt([...(liteFn$lib$util$json$arrayElementOffsets(lite_payload, (lite_mismatchField).valuePos))]);
                    }
                }
            }
            const lite_rendered = liteFn$lib$util$release$formatReleaseNotes(lite_label, lite_commit, lite_profile, lite_hasComp, lite_compName, lite_compVer, lite_archive, lite_archiveSha, lite_manifestSha, lite_hasVsix, lite_vsixFile, lite_vsixSha, lite_hasBoot, lite_bootGens, lite_bootFixed, lite_hasCases, lite_corpusCases, lite_corpusPrograms, lite_corpusRejections, lite_corpusExecutions, lite_corpusMismatches, lite_bootSupport);
            void lite_rendered;
            lite$emit(lite_rendered);
            return true;
        }
        return false;
    }
    void liteFn_handleInternalMode;
    function liteFn_prepareRelease(lite_directory: string, lite_output: string, lite_tag: string): void {
        void lite_directory;
        void lite_output;
        void lite_tag;
        const lite_statusArgs: string[] = [...(["status", "--porcelain"])];
        void lite_statusArgs;
        const lite_porcelain = liteFn_runChecked("", "git", [...(lite_statusArgs)], lite_directory, "");
        void lite_porcelain;
        if (((lite$textLength(lite_porcelain)) > (0n))) {
            liteFn_failRelease("", "release needs a clean committed checkout");
        }
        const lite_headArgs: string[] = [...(["rev-parse", "HEAD"])];
        void lite_headArgs;
        const lite_commit = liteFn$lib$core$text$trim(liteFn_runChecked("", "git", [...(lite_headArgs)], lite_directory, ""));
        void lite_commit;
        const lite_selected = liteFn$lib$util$release$selectComponentRelease(lite_directory, lite_tag);
        void lite_selected;
        if ((!((lite_selected).ok))) {
            liteFn_failRelease("", (lite_selected).error);
        }
        if (((lite_tag) !== (""))) {
            const lite_tagTypeArgs: string[] = [...(["cat-file", "-t", (("refs/tags/") + (lite_tag))])];
            void lite_tagTypeArgs;
            const lite_tagType = liteFn$lib$core$text$trim(liteFn_runChecked("", "git", [...(lite_tagTypeArgs)], lite_directory, "release tags must be annotated"));
            void lite_tagType;
            if (((lite_tagType) !== ("tag"))) {
                liteFn_failRelease("", "release tags must be annotated");
            }
            const lite_tagCommitArgs: string[] = [...(["rev-parse", (((("refs/tags/") + (lite_tag))) + ("^{commit}"))])];
            void lite_tagCommitArgs;
            const lite_tagCommit = liteFn$lib$core$text$trim(liteFn_runChecked("", "git", [...(lite_tagCommitArgs)], lite_directory, "release tag must point at HEAD"));
            void lite_tagCommit;
            if (((lite_tagCommit) !== (lite_commit))) {
                liteFn_failRelease("", "release tag must point at HEAD");
            }
        }
        const lite_outKind = lite$fileKind(lite_output);
        void lite_outKind;
        if (((lite_outKind) !== (lite$m$lib$core$file$FILE_KIND_MISSING))) {
            if (((((lite_outKind) !== (lite$m$lib$core$file$FILE_KIND_DIR))) || (((liteFn$lib$core$list$listCountText([...(lite$fileListDir(lite_output))])) > (0n))))) {
                liteFn_failRelease("", "release output directory must be empty");
            }
        }
        const lite_profile = liteFn$lib$util$release$releaseProfile((lite_selected).hasTag, (lite_selected).component, (lite_selected).version);
        void lite_profile;
        const lite_workRes = lite$fileMakeTempDir("lite-release-");
        void lite_workRes;
        if ((!((lite_workRes).ok))) {
            liteFn_failRelease("", (lite_workRes).error);
        }
        const lite_work = (lite_workRes).path;
        void lite_work;
        const lite_source = liteFn$lib$core$path$join(lite_work, "source");
        void lite_source;
        const lite_mkSource = lite$fileMakeDir(lite_source);
        void lite_mkSource;
        if ((!((lite_mkSource).ok))) {
            liteFn_failRelease(lite_work, (lite_mkSource).error);
        }
        const lite_tarPath = liteFn$lib$core$path$join(lite_work, "source.tar");
        void lite_tarPath;
        const lite_archiveArgs: string[] = [...(["archive", "--format=tar", "-o", lite_tarPath, lite_commit])];
        void lite_archiveArgs;
        liteFn_runChecked(lite_work, "git", [...(lite_archiveArgs)], lite_directory, "");
        const lite_untarArgs: string[] = [...(["-xf", lite_tarPath, "-C", lite_source])];
        void lite_untarArgs;
        liteFn_runChecked(lite_work, "tar", [...(lite_untarArgs)], lite_work, "");
        const lite_sourceDocArgs: string[] = [...([liteFn$lib$core$path$join(lite_source, "bin/lite"), "doctor", "--docs"])];
        void lite_sourceDocArgs;
        liteFn_runChecked(lite_work, lite$processExecPath(), [...(lite_sourceDocArgs)], lite_source, "");
        let lite_hasBoot = false;
        void lite_hasBoot;
        let lite_bootJson = "null";
        void lite_bootJson;
        let lite_bootGens = 0n;
        void lite_bootGens;
        let lite_bootFixed = false;
        void lite_bootFixed;
        let lite_hasCases = false;
        void lite_hasCases;
        let lite_corpusCases = 0n;
        void lite_corpusCases;
        let lite_corpusPrograms = 0n;
        void lite_corpusPrograms;
        let lite_corpusRejections = 0n;
        void lite_corpusRejections;
        let lite_corpusExecutions = 0n;
        void lite_corpusExecutions;
        let lite_corpusMismatches = 0n;
        void lite_corpusMismatches;
        let lite_bootSupport = "";
        void lite_bootSupport;
        if (((lite_profile) !== (lite$m$lib$util$release$PROFILE_TOOLS))) {
            const lite_dependencies = liteFn$lib$core$path$join(lite_directory, "igniter/node_modules");
            void lite_dependencies;
            if (((lite$fileKind(lite_dependencies)) === (lite$m$lib$core$file$FILE_KIND_MISSING))) {
                liteFn_failRelease(lite_work, "install locked igniter development dependencies for compiler release verification");
            }
            const lite_srcDeps = liteFn$lib$core$path$join(lite_source, "igniter/node_modules");
            void lite_srcDeps;
            const lite_linkRes = lite$fileSymlink(lite_dependencies, lite_srcDeps);
            void lite_linkRes;
            if ((!((lite_linkRes).ok))) {
                liteFn_failRelease(lite_work, (lite_linkRes).error);
            }
            const lite_ladderDirectory = liteFn$lib$core$path$join(lite_work, "ladder");
            void lite_ladderDirectory;
            const lite_selfHostArgs: string[] = [...([liteFn$lib$core$path$join(lite_source, "compiler/scripts/self-host.ts"), "--out", lite_ladderDirectory])];
            void lite_selfHostArgs;
            const lite_ladderRaw = liteFn_runChecked(lite_work, lite$processExecPath(), [...(lite_selfHostArgs)], lite_source, "");
            void lite_ladderRaw;
            const lite_ladderSpan = liteFn$lib$util$json$valueSpan(lite_ladderRaw, 0n);
            void lite_ladderSpan;
            if ((!((lite_ladderSpan).ok))) {
                liteFn_failRelease(lite_work, (lite_ladderSpan).error);
            }
            const lite_fixedField = liteFn$lib$util$json$readObjectBool(lite_ladderRaw, (lite_ladderSpan).start, "fixedPoint");
            void lite_fixedField;
            if ((((((!((lite_fixedField).found))) || ((!((lite_fixedField).ok))))) || ((!((lite_fixedField).value))))) {
                liteFn_failRelease(lite_work, "compiler release requires a generated fixed point");
            }
            lite_bootFixed = true;
            const lite_gensField = liteFn$lib$util$json$findObjectField(lite_ladderRaw, (lite_ladderSpan).start, "generations");
            void lite_gensField;
            if ((lite_gensField).found) {
                lite_bootGens = liteFn$lib$core$list$listCountInt([...(liteFn$lib$util$json$arrayElementOffsets(lite_ladderRaw, (lite_gensField).valuePos))]);
            }
            const lite_gen3 = liteFn$lib$core$path$join(lite_ladderDirectory, "generation-3.ts");
            void lite_gen3;
            const lite_parityArgs: string[] = [...([liteFn$lib$core$path$join(lite_source, "compiler/scripts/corpus-parity.ts"), "--artifact", lite_gen3])];
            void lite_parityArgs;
            const lite_corpusRaw = liteFn_runChecked(lite_work, lite$processExecPath(), [...(lite_parityArgs)], lite_source, "");
            void lite_corpusRaw;
            const lite_corpusSpan = liteFn$lib$util$json$valueSpan(lite_corpusRaw, 0n);
            void lite_corpusSpan;
            if ((!((lite_corpusSpan).ok))) {
                liteFn_failRelease(lite_work, (lite_corpusSpan).error);
            }
            const lite_mismatchField = liteFn$lib$util$json$findObjectField(lite_corpusRaw, (lite_corpusSpan).start, "mismatches");
            void lite_mismatchField;
            if ((!((lite_mismatchField).found))) {
                liteFn_failRelease(lite_work, "corpus parity output missing mismatches");
            }
            lite_corpusMismatches = liteFn$lib$core$list$listCountInt([...(liteFn$lib$util$json$arrayElementOffsets(lite_corpusRaw, (lite_mismatchField).valuePos))]);
            if (((lite_corpusMismatches) !== (0n))) {
                liteFn_failRelease(lite_work, "generated corpus parity had mismatches");
            }
            const lite_casesOpt = liteFn_readOptionalJsonInt(lite_corpusRaw, (lite_corpusSpan).start, "cases", 0n);
            void lite_casesOpt;
            lite_hasCases = (lite_casesOpt).present;
            lite_corpusCases = (lite_casesOpt).value;
            lite_corpusPrograms = (liteFn_readOptionalJsonInt(lite_corpusRaw, (lite_corpusSpan).start, "programs", 0n)).value;
            lite_corpusRejections = (liteFn_readOptionalJsonInt(lite_corpusRaw, (lite_corpusSpan).start, "rejections", 0n)).value;
            lite_corpusExecutions = (liteFn_readOptionalJsonInt(lite_corpusRaw, (lite_corpusSpan).start, "executions", 0n)).value;
            if (((lite_profile) === (lite$m$lib$util$release$PROFILE_LANGUAGE))) {
                const lite_verifyArgs: string[] = [...([liteFn$lib$core$path$join(lite_source, "bin/lite"), "verify", "--all", "--no-cache"])];
                void lite_verifyArgs;
                liteFn_runChecked(lite_work, lite$processExecPath(), [...(lite_verifyArgs)], lite_source, "");
                lite_bootSupport = "current canonical contracts passed";
            } else {
                lite_bootSupport = "restricted generated-TS subset; consult migration inventory";
            }
            lite_hasBoot = true;
            lite_bootJson = (((((((((((("{\n  \"ladder\": ") + (lite$textSlice(lite_ladderRaw, (lite_ladderSpan).start, (lite_ladderSpan).end, 12468)))) + (",\n  \"corpus\": "))) + (lite$textSlice(lite_corpusRaw, (lite_corpusSpan).start, (lite_corpusSpan).end, 12556)))) + (",\n  \"support\": "))) + (liteFn$lib$util$json$quoteString(lite_bootSupport)))) + ("\n}"));
            const lite_releaseDir = liteFn$lib$core$path$join(lite_source, "release");
            void lite_releaseDir;
            if (((lite$fileKind(lite_releaseDir)) !== (lite$m$lib$core$file$FILE_KIND_MISSING))) {
                liteFn_failRelease(lite_work, "release/ is reserved for generated distribution evidence");
            }
            const lite_mkRel = lite$fileMakeDir(lite_releaseDir);
            void lite_mkRel;
            if ((!((lite_mkRel).ok))) {
                liteFn_failRelease(lite_work, (lite_mkRel).error);
            }
            const lite_cpGen3 = lite$fileCopy(lite_gen3, liteFn$lib$core$path$join(lite_releaseDir, "compiler.ts"));
            void lite_cpGen3;
            if ((!((lite_cpGen3).ok))) {
                liteFn_failRelease(lite_work, (lite_cpGen3).error);
            }
            const lite_cpSrc = lite$fileCopy(liteFn$lib$core$path$join(lite_ladderDirectory, "S.lts"), liteFn$lib$core$path$join(lite_releaseDir, "compiler-source.lts"));
            void lite_cpSrc;
            if ((!((lite_cpSrc).ok))) {
                liteFn_failRelease(lite_work, (lite_cpSrc).error);
            }
            const lite_wrVerif = liteFn$lib$core$file$writeText(liteFn$lib$core$path$join(lite_releaseDir, "verification.json"), ((lite_bootJson) + ("\n")));
            void lite_wrVerif;
            if ((!((lite_wrVerif).ok))) {
                liteFn_failRelease(lite_work, (lite_wrVerif).error);
            }
            const lite_rmDeps = lite$fileRemove(lite_srcDeps);
            void lite_rmDeps;
            if ((!((lite_rmDeps).ok))) {
                liteFn_failRelease(lite_work, (lite_rmDeps).error);
            }
            const lite_rmCache = lite$fileRemove(liteFn$lib$core$path$join(lite_source, ".cache"));
            void lite_rmCache;
            if ((!((lite_rmCache).ok))) {
                liteFn_failRelease(lite_work, (lite_rmCache).error);
            }
        }
        let lite_hasVsix = false;
        void lite_hasVsix;
        let lite_vsixFile = "";
        void lite_vsixFile;
        let lite_vsixSha = "";
        void lite_vsixSha;
        if ((((lite_selected).hasTag) && ((((lite_selected).component) === ("vscode"))))) {
            const lite_packager = liteFn$lib$core$path$join(lite_directory, "editors/vscode/node_modules/@vscode/vsce/vsce");
            void lite_packager;
            if (((lite$fileKind(lite_packager)) === (lite$m$lib$core$file$FILE_KIND_MISSING))) {
                liteFn_failRelease(lite_work, "install locked editor packaging dependencies");
            }
            lite_vsixFile = (((("lite-") + ((lite_selected).version))) + (".vsix"));
            const lite_vsixArgs: string[] = [...([lite_packager, "package", "--no-dependencies", "--allow-missing-repository", "--skip-license", "--out", liteFn$lib$core$path$join(lite_work, lite_vsixFile)])];
            void lite_vsixArgs;
            liteFn_runChecked(lite_work, lite$processExecPath(), [...(lite_vsixArgs)], liteFn$lib$core$path$join(lite_source, "editors/vscode"), "");
            const lite_vsixDigest = liteFn$lib$core$crypto$sha256File(liteFn$lib$core$path$join(lite_work, lite_vsixFile));
            void lite_vsixDigest;
            if ((!((lite_vsixDigest).ok))) {
                liteFn_failRelease(lite_work, (lite_vsixDigest).error);
            }
            lite_hasVsix = true;
            lite_vsixSha = (lite_vsixDigest).hex;
        }
        const lite_label = (Boolean(((lite_tag) !== (""))) ? lite_tag : (("snapshot-") + (lite$textSlice(lite_commit, 0n, 12n, 14627))));
        void lite_label;
        const lite_compVersionsRes = liteFn$lib$util$release$formatComponentVersionsJson(lite_directory, "  ");
        void lite_compVersionsRes;
        if ((!((lite_compVersionsRes).ok))) {
            liteFn_failRelease(lite_work, (lite_compVersionsRes).error);
        }
        const lite_tagJson = (Boolean(((lite_tag) !== (""))) ? liteFn$lib$util$json$quoteString(lite_tag) : "null");
        void lite_tagJson;
        const lite_compJson = (Boolean((!((lite_selected).hasTag))) ? "null" : (((((((("{\n    \"component\": ") + (liteFn$lib$util$json$quoteString((lite_selected).component)))) + (",\n    \"version\": "))) + (liteFn$lib$util$json$quoteString((lite_selected).version)))) + ("\n  }")));
        void lite_compJson;
        const lite_vsixJson = (Boolean((!(lite_hasVsix))) ? "null" : (((((((("{\n    \"file\": ") + (liteFn$lib$util$json$quoteString(lite_vsixFile)))) + (",\n    \"sha256\": "))) + (liteFn$lib$util$json$quoteString(lite_vsixSha)))) + ("\n  }")));
        void lite_vsixJson;
        const lite_manifestJson = (((((((((((((((((((((((((((((((((((((((((((("{\n  \"schemaVersion\": 3,\n  \"tag\": ") + (lite_tagJson))) + (",\n"))) + ("  \"commit\": "))) + (liteFn$lib$util$json$quoteString(lite_commit)))) + (",\n"))) + ("  \"releasedComponent\": "))) + (lite_compJson))) + (",\n"))) + ("  \"componentVersions\": "))) + ((lite_compVersionsRes).jsonText))) + (",\n"))) + ("  \"profile\": "))) + (liteFn$lib$util$json$quoteString(lite_profile)))) + (",\n"))) + ("  \"bootstrap\": "))) + (lite_bootJson))) + (",\n"))) + ("  \"nativeCompiler\": false,\n"))) + ("  \"vsix\": "))) + (lite_vsixJson))) + ("\n"))) + ("}\n"));
        void lite_manifestJson;
        const lite_releaseJsonPath = liteFn$lib$core$path$join(lite_source, "RELEASE.json");
        void lite_releaseJsonPath;
        if (((lite$fileKind(lite_releaseJsonPath)) !== (lite$m$lib$core$file$FILE_KIND_MISSING))) {
            liteFn_failRelease(lite_work, "RELEASE.json is reserved for packaged metadata");
        }
        const lite_wrRelJson = liteFn$lib$core$file$writeText(lite_releaseJsonPath, lite_manifestJson);
        void lite_wrRelJson;
        if ((!((lite_wrRelJson).ok))) {
            liteFn_failRelease(lite_work, (lite_wrRelJson).error);
        }
        const lite_archive = (((("lite-") + (lite_label))) + (".tar.gz"));
        void lite_archive;
        const lite_archivePath = liteFn$lib$core$path$join(lite_work, lite_archive);
        void lite_archivePath;
        const lite_tgzArgs: string[] = [...(["-czf", lite_archivePath, "-C", lite_source, "."])];
        void lite_tgzArgs;
        liteFn_runChecked(lite_work, "tar", [...(lite_tgzArgs)], lite_work, "");
        const lite_extracted = liteFn$lib$core$path$join(lite_work, "extracted");
        void lite_extracted;
        const lite_mkExt = lite$fileMakeDir(lite_extracted);
        void lite_mkExt;
        if ((!((lite_mkExt).ok))) {
            liteFn_failRelease(lite_work, (lite_mkExt).error);
        }
        const lite_exTgzArgs: string[] = [...(["-xf", lite_archivePath, "-C", lite_extracted])];
        void lite_exTgzArgs;
        liteFn_runChecked(lite_work, "tar", [...(lite_exTgzArgs)], lite_work, "");
        const lite_extDocArgs: string[] = [...([liteFn$lib$core$path$join(lite_extracted, "bin/lite"), "doctor", "--docs"])];
        void lite_extDocArgs;
        liteFn_runChecked(lite_work, lite$processExecPath(), [...(lite_extDocArgs)], lite_extracted, "");
        const lite_compArgs: string[] = [...([liteFn$lib$core$path$join(lite_extracted, "bin/lite-compile"), "igniter/tests/compiler/001-001-report-int-42.lts"])];
        void lite_compArgs;
        const lite_emitted = liteFn_runChecked(lite_work, lite$processExecPath(), [...(lite_compArgs)], lite_extracted, "");
        void lite_emitted;
        const lite_helloPath = liteFn$lib$core$path$join(lite_work, "hello.ts");
        void lite_helloPath;
        const lite_wrHello = liteFn$lib$core$file$writeText(lite_helloPath, lite_emitted);
        void lite_wrHello;
        if ((!((lite_wrHello).ok))) {
            liteFn_failRelease(lite_work, (lite_wrHello).error);
        }
        const lite_entryArgs: string[] = [...([liteFn$lib$core$path$join(lite_extracted, "compiler/entry.ts"), lite_helloPath])];
        void lite_entryArgs;
        const lite_helloOut = liteFn_runChecked(lite_work, lite$processExecPath(), [...(lite_entryArgs)], lite_extracted, "");
        void lite_helloOut;
        if (((lite_helloOut) !== ("42\n"))) {
            liteFn_failRelease(lite_work, (("extracted compiler roundtrip produced unexpected output: ") + (lite_helloOut)));
        }
        const lite_archDigest = liteFn$lib$core$crypto$sha256File(lite_archivePath);
        void lite_archDigest;
        if ((!((lite_archDigest).ok))) {
            liteFn_failRelease(lite_work, (lite_archDigest).error);
        }
        const lite_archiveSha = (lite_archDigest).hex;
        void lite_archiveSha;
        const lite_manifestSha = liteFn$lib$core$crypto$sha256Text(lite_manifestJson);
        void lite_manifestSha;
        const lite_mkOut = lite$fileMakeDir(lite_output);
        void lite_mkOut;
        if ((!((lite_mkOut).ok))) {
            liteFn_failRelease(lite_work, (lite_mkOut).error);
        }
        const lite_cpArch = lite$fileCopy(lite_archivePath, liteFn$lib$core$path$join(lite_output, lite_archive));
        void lite_cpArch;
        if ((!((lite_cpArch).ok))) {
            liteFn_failRelease(lite_work, (lite_cpArch).error);
        }
        if (lite_hasVsix) {
            const lite_cpVsix = lite$fileCopy(liteFn$lib$core$path$join(lite_work, lite_vsixFile), liteFn$lib$core$path$join(lite_output, lite_vsixFile));
            void lite_cpVsix;
            if ((!((lite_cpVsix).ok))) {
                liteFn_failRelease(lite_work, (lite_cpVsix).error);
            }
        }
        const lite_wrMan = liteFn$lib$core$file$writeText(liteFn$lib$core$path$join(lite_output, "manifest.json"), lite_manifestJson);
        void lite_wrMan;
        if ((!((lite_wrMan).ok))) {
            liteFn_failRelease(lite_work, (lite_wrMan).error);
        }
        const lite_notes = liteFn$lib$util$release$formatReleaseNotes(lite_label, lite_commit, lite_profile, (lite_selected).hasTag, (lite_selected).component, (lite_selected).version, lite_archive, lite_archiveSha, lite_manifestSha, lite_hasVsix, lite_vsixFile, lite_vsixSha, lite_hasBoot, lite_bootGens, lite_bootFixed, lite_hasCases, lite_corpusCases, lite_corpusPrograms, lite_corpusRejections, lite_corpusExecutions, lite_corpusMismatches, lite_bootSupport);
        void lite_notes;
        const lite_wrNotes = liteFn$lib$core$file$writeText(liteFn$lib$core$path$join(lite_output, "RELEASE-NOTES.md"), lite_notes);
        void lite_wrNotes;
        if ((!((lite_wrNotes).ok))) {
            liteFn_failRelease(lite_work, (lite_wrNotes).error);
        }
        const lite_sumFiles: string[] = [...(lite$fileListDir(lite_output))];
        void lite_sumFiles;
        let lite_sums = "";
        void lite_sums;
        for (const lite_file of [...(lite_sumFiles)]) {
            void lite_file;
            const lite_dRes = liteFn$lib$core$crypto$sha256File(liteFn$lib$core$path$join(lite_output, lite_file));
            void lite_dRes;
            if ((!((lite_dRes).ok))) {
                liteFn_failRelease(lite_work, (lite_dRes).error);
            }
            lite_sums = ((((((((lite_sums) + ((lite_dRes).hex))) + ("  "))) + (lite_file))) + ("\n"));
        }
        const lite_wrSums = liteFn$lib$core$file$writeText(liteFn$lib$core$path$join(lite_output, "SHA256SUMS"), lite_sums);
        void lite_wrSums;
        if ((!((lite_wrSums).ok))) {
            liteFn_failRelease(lite_work, (lite_wrSums).error);
        }
        const lite_rmWork = lite$fileRemove(lite_work);
        void lite_rmWork;
        if ((!((lite_rmWork).ok))) {
            lite$reportError((lite_rmWork).error);
        }
    }
    void liteFn_prepareRelease;
    function liteFn_run(lite_rawArgs: string[]): void {
        void lite_rawArgs;
        const lite_args: string[] = [...(liteFn$lib$util$cli$stripLeadingSeparator([...(lite_rawArgs)]))];
        void lite_args;
        if (liteFn_handleInternalMode([...(lite_args)])) {
            return;
        }
        liteFn$lib$util$project$handleVersionFlag([...(lite_args)], "release", "release");
        const lite_outputArg = liteFn$lib$util$cli$head([...(lite_args)]);
        void lite_outputArg;
        const lite_afterOutput: string[] = [...(liteFn$lib$util$cli$rest([...(lite_args)], 1n))];
        void lite_afterOutput;
        const lite_tag = liteFn$lib$util$cli$head([...(lite_afterOutput)]);
        void lite_tag;
        if (((((lite_outputArg) === (""))) || (((liteFn$lib$core$list$listCountText([...(liteFn$lib$util$cli$rest([...(lite_afterOutput)], 1n))])) > (0n))))) {
            liteFn_failRelease("", "usage: lite release OUTPUT [TAG]");
        }
        const lite_envRoot = lite$processEnvGet("LITE_RELEASE_ROOT");
        void lite_envRoot;
        const lite_directory = (Boolean((((lite_envRoot).found) && ((((lite_envRoot).value) !== (""))))) ? (lite_envRoot).value : liteFn$lib$util$project$findRepoRoot());
        void lite_directory;
        if (((lite_directory) === (""))) {
            liteFn_failRelease("", "cannot locate repository root");
        }
        liteFn_prepareRelease(lite_directory, liteFn$lib$core$path$resolve(lite$processCwd(), lite_outputArg), lite_tag);
        lite$emit("Release prepared." + "\n");
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
