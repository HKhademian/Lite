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
    getBuiltinModule(name: "node:path"): { join(...paths: string[]): string };
    getBuiltinModule(name: "node:os"): { tmpdir(): string };
    getBuiltinModule(name: "node:child_process"): {
        spawnSync(command: string, args: readonly string[], options: { cwd?: string; env: Record<string, string | undefined>; encoding?: "utf8"; input?: string; stdio: "inherit" | readonly ["pipe", "pipe", "pipe"]; maxBuffer: number }): { status: number | null; signal: string | null; stdout: string | null; stderr: string | null; error?: Error };
        spawnSync(command: string, args: readonly string[], options: { cwd?: string; env: Record<string, string | undefined>; input: Uint8Array; stdio: readonly ["pipe", "pipe", "pipe"]; timeout?: number; maxBuffer: number }): { status: number | null; signal: string | null; stdout: Uint8Array | null; stderr: Uint8Array | null; error?: Error };
    };
    getBuiltinModule(name: "node:crypto"): {
        createHash(algorithm: string): { update(data: Uint8Array): { digest(encoding: "hex"): string } };
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
type Lite$StreamHandle = { kind: string; handle: bigint };
type Lite$StreamEntry =
    | { kind: "file"; fd: number; eof: boolean; closed: boolean; error: string }
    | { kind: "bufferReader"; bytes: Uint8Array; pos: number; eof: boolean; closed: boolean; error: string }
    | { kind: "bufferWriter"; bytes: number[]; closed: boolean; error: string }
    | { kind: "error"; closed: boolean; error: string };
let lite$streams: Lite$StreamEntry[] = [];
let lite$stdinState = { eof: false, error: "" };
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
function lite$checkBytes(bytes: readonly bigint[]): { ok: true; data: Uint8Array } | { ok: false; error: string } {
    const data = new Uint8Array(bytes.length);
    for (let i = 0; i < bytes.length; i += 1) {
        const byte = bytes[i];
        if (byte === undefined || byte < 0n || byte > 255n) {
            return { ok: false, error: "byte value outside 0..255: " + String(byte) };
        }
        data[i] = Number(byte);
    }
    return { ok: true, data };
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
function lite$fileOpenWriter(path: string): Lite$StreamHandle { return lite$fileOpenStream(path, "w", true); }
function lite$fileOpenAppender(path: string): Lite$StreamHandle { return lite$fileOpenStream(path, "a", true); }
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
function lite$ioRead(reader: Lite$StreamHandle, maxBytes: bigint): bigint[] {
    if (maxBytes <= 0n) return [];
    if (reader.kind === "stdin" && reader.handle === 0n) {
        if (lite$stdinState.error !== "" || lite$stdinState.eof) return [];
        const cap = maxBytes > 16777216n ? 16777216 : Number(maxBytes);
        const buf = new Uint8Array(cap);
        try {
            const read = process.getBuiltinModule("node:fs").readSync(0, buf, 0, cap, null);
            if (read === 0) { lite$stdinState.eof = true; return []; }
            return lite$fromBytes(buf.subarray(0, read));
        } catch (error) { lite$stdinState.error = lite$errMsg(error); return []; }
    }
    const entry = lite$lookupStream(reader.handle);
    if (entry === undefined || entry.closed || entry.error !== "" || entry.kind === "error" || entry.kind === "bufferWriter") return [];
    if (entry.eof) return [];
    if (entry.kind === "bufferReader") {
        const take = maxBytes > BigInt(entry.bytes.length - entry.pos) ? entry.bytes.length - entry.pos : Number(maxBytes);
        if (take <= 0) { entry.eof = true; return []; }
        const out = entry.bytes.subarray(entry.pos, entry.pos + take);
        entry.pos += take;
        return lite$fromBytes(out);
    }
    const cap = maxBytes > 16777216n ? 16777216 : Number(maxBytes);
    const buf = new Uint8Array(cap);
    try {
        const read = process.getBuiltinModule("node:fs").readSync(entry.fd, buf, 0, cap, null);
        if (read === 0) { entry.eof = true; return []; }
        return lite$fromBytes(buf.subarray(0, read));
    } catch (error) { entry.error = lite$errMsg(error); return []; }
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
function lite$ioWriterError(writer: Lite$StreamHandle): string {
    if ((writer.kind === "stdout" && writer.handle === 1n) || (writer.kind === "stderr" && writer.handle === 2n)) return "";
    const entry = lite$lookupStream(writer.handle);
    if (entry === undefined) return "invalid writer handle";
    if (entry.kind === "bufferReader") return "handle is a reader, not a writer";
    if (entry.error !== "") return entry.error;
    if (entry.closed) return "writer is closed";
    return "";
}
function lite$ioWriterOk(writer: Lite$StreamHandle): boolean {
    if ((writer.kind === "stdout" && writer.handle === 1n) || (writer.kind === "stderr" && writer.handle === 2n)) return true;
    const entry = lite$lookupStream(writer.handle);
    return entry !== undefined && (entry.kind === "file" || entry.kind === "bufferWriter") && !entry.closed && entry.error === "";
}
function lite$writeRaw(writer: Lite$StreamHandle, data: Uint8Array): { ok: boolean; written: bigint; error: string } {
    if (writer.kind === "stdout" && writer.handle === 1n) {
        try {
            const fs = process.getBuiltinModule("node:fs");
            let off = 0;
            while (off < data.length) off += fs.writeSync(1, data, off, data.length - off);
            return { ok: true, written: BigInt(data.length), error: "" };
        } catch (error) { return { ok: false, written: 0n, error: lite$errMsg(error) }; }
    }
    if (writer.kind === "stderr" && writer.handle === 2n) {
        try {
            const fs = process.getBuiltinModule("node:fs");
            let off = 0;
            while (off < data.length) off += fs.writeSync(2, data, off, data.length - off);
            return { ok: true, written: BigInt(data.length), error: "" };
        } catch (error) { return { ok: false, written: 0n, error: lite$errMsg(error) }; }
    }
    const entry = lite$lookupStream(writer.handle);
    if (entry === undefined) return { ok: false, written: 0n, error: "invalid writer handle" };
    if (entry.kind === "error") return { ok: false, written: 0n, error: entry.error };
    if (entry.kind === "bufferReader") return { ok: false, written: 0n, error: "handle is a reader, not a writer" };
    if (entry.closed) return { ok: false, written: 0n, error: "writer is closed" };
    if (entry.error !== "") return { ok: false, written: 0n, error: entry.error };
    if (entry.kind === "bufferWriter") {
        for (let i = 0; i < data.length; i += 1) entry.bytes.push(data[i] ?? 0);
        return { ok: true, written: BigInt(data.length), error: "" };
    }
    try {
        const fs = process.getBuiltinModule("node:fs");
        let off = 0;
        while (off < data.length) off += fs.writeSync(entry.fd, data, off, data.length - off);
        return { ok: true, written: BigInt(data.length), error: "" };
    } catch (error) { const msg = lite$errMsg(error); entry.error = msg; return { ok: false, written: 0n, error: msg }; }
}
function lite$ioWrite(writer: Lite$StreamHandle, bytes: readonly bigint[]): { ok: boolean; written: bigint; error: string } {
    const checked = lite$checkBytes(bytes);
    if (!checked.ok) return { ok: false, written: 0n, error: checked.error };
    return lite$writeRaw(writer, checked.data);
}
function lite$ioCloseWriter(writer: Lite$StreamHandle): { ok: boolean; error: string } {
    if ((writer.kind === "stdout" && writer.handle === 1n) || (writer.kind === "stderr" && writer.handle === 2n)) return { ok: true, error: "" };
    const entry = lite$lookupStream(writer.handle);
    if (entry === undefined) return { ok: false, error: "invalid writer handle" };
    if (entry.kind === "error") return { ok: false, error: entry.error };
    if (entry.kind === "bufferReader") return { ok: false, error: "handle is a reader, not a writer" };
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

function lite$unicodeToCodePoints(text: string): bigint[] {
    const out: bigint[] = [];
    for (const ch of text) { out.push(BigInt(ch.codePointAt(0) ?? 0)); }
    return out;
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
    function liteFn$lib$core$int$intAdd(lite_left: bigint, lite_right: bigint): { value: bigint; ok: boolean } {
        void lite_left;
        void lite_right;
        if (((((lite_right) > (0n))) && (((lite_left) > (lite$subtractInt(liteFn$lib$core$int$intMax(), lite_right, 475)))))) {
            return { value: 0n, ok: false };
        }
        if (((((lite_right) < (0n))) && (((lite_left) < (lite$subtractInt(liteFn$lib$core$int$intMin(), lite_right, 556)))))) {
            return { value: 0n, ok: false };
        }
        return { value: lite$addInt(lite_left, lite_right, 618), ok: true };
    }
    void liteFn$lib$core$int$intAdd;
    function liteFn$lib$core$int$intSubtract(lite_left: bigint, lite_right: bigint): { value: bigint; ok: boolean } {
        void lite_left;
        void lite_right;
        if (((((lite_right) < (0n))) && (((lite_left) > (lite$addInt(liteFn$lib$core$int$intMax(), lite_right, 840)))))) {
            return { value: 0n, ok: false };
        }
        if (((((lite_right) > (0n))) && (((lite_left) < (lite$addInt(liteFn$lib$core$int$intMin(), lite_right, 921)))))) {
            return { value: 0n, ok: false };
        }
        return { value: lite$subtractInt(lite_left, lite_right, 983), ok: true };
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
                if (((lite_left) > (lite$divideInt(liteFn$lib$core$int$intMax(), lite_right, 1309)))) {
                    return { value: 0n, ok: false };
                }
            } else if (((lite_right) < (lite$divideInt(liteFn$lib$core$int$intMin(), lite_left, 1388)))) {
                return { value: 0n, ok: false };
            }
        } else if (((lite_right) > (0n))) {
            if (((lite_left) < (lite$divideInt(liteFn$lib$core$int$intMin(), lite_right, 1504)))) {
                return { value: 0n, ok: false };
            }
        } else if (((lite_right) < (lite$divideInt(liteFn$lib$core$int$intMax(), lite_left, 1579)))) {
            return { value: 0n, ok: false };
        }
        return { value: lite$multiplyInt(lite_left, lite_right, 1652), ok: true };
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
        return { value: lite$divideInt(lite_left, lite_right, 1989), ok: true };
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
        return { value: lite$remainderInt(lite_left, lite_right, 2347), ok: true };
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
        const lite_quotient = lite$divideInt(lite_left, lite_right, 2680);
        void lite_quotient;
        return (Boolean(((((lite$remainderInt(lite_left, lite_right, 2701)) !== (0n))) && ((Boolean((((lite_left) < (0n)))) !== Boolean((((lite_right) < (0n)))))))) ? { value: lite$subtractInt(lite_quotient, 1n, 2774), ok: true } : { value: lite_quotient, ok: true });
    }
    void liteFn$lib$core$int$intFloorDivide;
    function liteFn$lib$core$int$intFloorModulo(lite_left: bigint, lite_right: bigint): { value: bigint; ok: boolean } {
        void lite_left;
        void lite_right;
        if (((lite_right) === (0n))) {
            return { value: 0n, ok: false };
        }
        const lite_remainder = lite$remainderInt(lite_left, lite_right, 3067);
        void lite_remainder;
        return (Boolean(((((lite_remainder) !== (0n))) && ((Boolean((((lite_remainder) < (0n)))) !== Boolean((((lite_right) < (0n)))))))) ? { value: lite$addInt(lite_remainder, lite_right, 3164), ok: true } : { value: lite_remainder, ok: true });
    }
    void liteFn$lib$core$int$intFloorModulo;
    function liteFn$lib$core$int$intNegate(lite_value: bigint): { value: bigint; ok: boolean } {
        void lite_value;
        if (((lite_value) === (liteFn$lib$core$int$intMin()))) {
            return { value: 0n, ok: false };
        }
        return { value: lite$subtractInt(0n, lite_value, 3448), ok: true };
    }
    void liteFn$lib$core$int$intNegate;
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
            return (("-") + (liteFn$lib$core$int$intText(lite$subtractInt(0n, lite_value, 4021))));
        }
        let lite_remaining = lite_value;
        void lite_remaining;
        let lite_digits = "";
        void lite_digits;
        while (((lite_remaining) > (0n))) {
            const lite_digit = lite$remainderInt(lite_remaining, 10n, 4135);
            void lite_digit;
            lite_digits = ((liteFn$lib$core$int$digitChar(lite_digit)) + (lite_digits));
            lite_remaining = lite$divideInt(lite_remaining, 10n, 4215);
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
    function liteFn$lib$core$diag$diagnosticExit(): bigint {
        return 2n;
    }
    void liteFn$lib$core$diag$diagnosticExit;
    const lite$m$lib$core$diag$sourceErrorCategory = "SourceError";
    void lite$m$lib$core$diag$sourceErrorCategory;
    const lite$m$lib$core$diag$typeErrorCategory = "TypeError";
    void lite$m$lib$core$diag$typeErrorCategory;
    function liteFn$lib$core$diag$fail(lite_prefix: string, lite_message: string): void {
        void lite_prefix;
        void lite_message;
        if (((lite_prefix) === (""))) {
            lite$reportError(lite_message);
        } else {
            lite$reportError(((((lite_prefix) + (":"))) + (lite_message)));
        }
        lite$exit(liteFn$lib$core$diag$diagnosticExit());
    }
    void liteFn$lib$core$diag$fail;
    function liteFn$lib$core$diag$expect(lite_prefix: string, lite_condition: boolean, lite_message: string): void {
        void lite_prefix;
        void lite_condition;
        void lite_message;
        if ((!(lite_condition))) {
            return (void (liteFn$lib$core$diag$fail(lite_prefix, lite_message)));
        } else {
        }
    }
    void liteFn$lib$core$diag$expect;
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
            const lite_ch = lite$textAt(lite_source, lite_position, 2694);
            void lite_ch;
            if (((((((((lite_ch) === (" "))) || (((lite_ch) === ("\t"))))) || (((lite_ch) === ("\r"))))) || (((lite_ch) === ("\n"))))) {
                lite_position = lite$addInt(lite_position, 1n, 2813);
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
        while (((((lite_position) < (lite_size))) && (liteFn$lib$core$text$isNameContinue(lite$textAt(lite_source, lite_position, 3123))))) {
            lite_position = lite$addInt(lite_position, 1n, 3175);
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
        if (((((lite_position) < (0n))) || (((lite$addInt(lite_position, lite_width, 3437)) > (lite_size))))) {
            return false;
        }
        if (((lite_width) === (0n))) {
            return true;
        }
        if (((lite$textAt(lite_source, lite_position, 3512)) !== (lite$textAt(lite_text, 0n, 3537)))) {
            return false;
        }
        if (((lite_width) === (1n))) {
            return true;
        }
        return ((lite$textSlice(lite_source, lite_position, lite$addInt(lite_position, lite_width, 3639), 3606)) === (lite_text));
    }
    void liteFn$lib$core$text$startsWithAt;
    function liteFn$lib$core$text$wordAt(lite_source: string, lite_position: bigint, lite_word: string): boolean {
        void lite_source;
        void lite_position;
        void lite_word;
        if ((!(liteFn$lib$core$text$startsWithAt(lite_source, lite_position, lite_word)))) {
            return false;
        }
        const lite_after = lite$addInt(lite_position, lite$textLength(lite_word), 3936);
        void lite_after;
        return ((((lite_after) >= (lite$textLength(lite_source)))) || ((!(liteFn$lib$core$text$isNameContinue(lite$textAt(lite_source, lite_after, 4002))))));
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
        if (((lite$textAt(lite_text, 0n, 4923)) === ("-"))) {
            lite_negative = true;
            lite_position = 1n;
        } else if (((lite$textAt(lite_text, 0n, 5005)) === ("+"))) {
            lite_position = 1n;
        }
        if (((lite_position) >= (lite_size))) {
            return { value: 0n, ok: false };
        }
        let lite_value = 0n;
        void lite_value;
        while (((lite_position) < (lite_size))) {
            const lite_ch = lite$textAt(lite_text, lite_position, 5175);
            void lite_ch;
            if ((!(liteFn$lib$core$text$isDigit(lite_ch)))) {
                return { value: 0n, ok: false };
            }
            const lite_digit = liteFn$lib$core$text$digitValue(lite_ch);
            void lite_digit;
            if (lite_negative) {
                if (((lite_value) < (lite$divideInt((lite$addInt(liteFn$lib$core$int$intMin(), lite_digit, 5354)), 10n, 5363)))) {
                    return { value: 0n, ok: false };
                }
                lite_value = lite$subtractInt(lite$multiplyInt(lite_value, 10n, 5430), lite_digit, 5435);
            } else {
                if (((lite_value) > (lite$divideInt((lite$subtractInt(liteFn$lib$core$int$intMax(), lite_digit, 5502)), 10n, 5511)))) {
                    return { value: 0n, ok: false };
                }
                lite_value = lite$addInt(lite$multiplyInt(lite_value, 10n, 5578), lite_digit, 5583);
            }
            lite_position = lite$addInt(lite_position, 1n, 5630);
        }
        return { value: lite_value, ok: true };
    }
    void liteFn$lib$core$text$textToInt;
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
        while (((((lite_start) < (lite_size))) && (liteFn$lib$core$text$isWhitespace(lite$textAt(lite_source, lite_start, 6056))))) {
            lite_start = lite$addInt(lite_start, 1n, 6099);
        }
        return lite$textSlice(lite_source, lite_start, lite_size, 6114);
    }
    void liteFn$lib$core$text$trimStart;
    function liteFn$lib$core$text$trimEnd(lite_source: string): string {
        void lite_source;
        let lite_end = lite$textLength(lite_source);
        void lite_end;
        while (((((lite_end) > (0n))) && (liteFn$lib$core$text$isWhitespace(lite$textAt(lite_source, lite$subtractInt(lite_end, 1n, 6337), 6322))))) {
            lite_end = lite$subtractInt(lite_end, 1n, 6363);
        }
        return lite$textSlice(lite_source, 0n, lite_end, 6378);
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
        return liteFn$lib$core$text$startsWithAt(lite_source, lite$subtractInt(lite_sourceLen, lite_suffixLen, 6817), lite_suffix);
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
            lite_i = lite$addInt(lite_i, 1n, 7109);
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
            const lite_ch = lite$textAt(lite_source, lite_i, 8548);
            void lite_ch;
            const lite_lower = liteFn$lib$core$text$lowerAsciiChar(lite_ch);
            void lite_lower;
            if (((lite_lower) !== (lite_ch))) {
                if (((lite_i) > (lite_runStart))) {
                    lite_out = ((lite_out) + (lite$textSlice(lite_source, lite_runStart, lite_i, 8668)));
                }
                lite_out = ((lite_out) + (lite_lower));
                lite_runStart = lite$addInt(lite_i, 1n, 8754);
            }
            lite_i = lite$addInt(lite_i, 1n, 8783);
        }
        if (((lite_runStart) === (0n))) {
            return lite_source;
        }
        if (((lite_runStart) < (lite_size))) {
            lite_out = ((lite_out) + (lite$textSlice(lite_source, lite_runStart, lite_size, 8871)));
        }
        return lite_out;
    }
    void liteFn$lib$core$text$toLowerAscii;
    function liteFn$lib$core$unicode$isValidScalar(lite_point: bigint): boolean {
        void lite_point;
        return ((((((lite_point) >= (0n))) && (((lite_point) <= (1114111n))))) && ((((((lite_point) < (55296n))) || (((lite_point) > (57343n)))))));
    }
    void liteFn$lib$core$unicode$isValidScalar;
    function liteFn$lib$core$unicode$fromCodePoint(lite_point: bigint): { ok: boolean; text: string; error: string } {
        void lite_point;
        const lite_points: bigint[] = [...([lite_point])];
        void lite_points;
        return lite$unicodeFromCodePoints([...(lite_points)]);
    }
    void liteFn$lib$core$unicode$fromCodePoint;
    function liteFn$lib$core$unicode$codePointAt(lite_text: string, lite_position: bigint): bigint {
        void lite_text;
        void lite_position;
        const lite_ch = lite$textAt(lite_text, lite_position, 1120);
        void lite_ch;
        const lite_points: bigint[] = [...(lite$unicodeToCodePoints(lite_ch))];
        void lite_points;
        return lite$listAt((lite_points), 0n, 1191);
    }
    void liteFn$lib$core$unicode$codePointAt;
    function liteFn$lib$core$unicode$utf16Length(lite_text: string): bigint {
        void lite_text;
        let lite_total = 0n;
        void lite_total;
        for (const lite_cp of [...(lite$unicodeToCodePoints(lite_text))]) {
            void lite_cp;
            lite_total = lite$addInt(lite_total, (Boolean(((lite_cp) <= (65535n))) ? 1n : 2n), 1368);
        }
        return lite_total;
    }
    void liteFn$lib$core$unicode$utf16Length;
    function liteFn$lib$core$unicode$utf16Encode(lite_text: string): bigint[] {
        void lite_text;
        let lite_out: bigint[] = [...([...([])])];
        void lite_out;
        for (const lite_cp of [...(lite$unicodeToCodePoints(lite_text))]) {
            void lite_cp;
            if (((lite_cp) <= (65535n))) {
                lite_out.push(lite_cp);
            } else {
                const lite_adjusted = lite$subtractInt(lite_cp, 65536n, 1711);
                void lite_adjusted;
                lite_out.push(lite$addInt(55296n, (lite$divideInt(lite_adjusted, 1024n, 1773)), 1761));
                lite_out.push(lite$addInt(56320n, (lite$remainderInt(lite_adjusted, 1024n, 1836)), 1824));
            }
        }
        return [...(lite_out)];
    }
    void liteFn$lib$core$unicode$utf16Encode;
    function liteFn$lib$core$unicode$utf16DecodeStrict(lite_units: bigint[]): { ok: boolean; text: string; error: string } {
        void lite_units;
        const lite_count = liteFn$lib$core$list$listCountInt([...(lite_units)]);
        void lite_count;
        let lite_points: bigint[] = [...([...([])])];
        void lite_points;
        let lite_index = 0n;
        void lite_index;
        while (((lite_index) < (lite_count))) {
            const lite_code = lite$listAt((lite_units), lite_index, 2211);
            void lite_code;
            if (((((lite_code) < (0n))) || (((lite_code) > (65535n))))) {
                return { ok: false, text: "", error: (("UTF-16 code unit outside 0..65535: ") + (liteFn$lib$core$int$intText(lite_code))) };
            }
            if (((((lite_code) >= (55296n))) && (((lite_code) <= (56319n))))) {
                if (((lite$addInt(lite_index, 1n, 2448)) >= (lite_count))) {
                    return { ok: false, text: "", error: "unpaired UTF-16 high surrogate" };
                }
                const lite_next = lite$listAt((lite_units), lite$addInt(lite_index, 1n, 2599), 2593);
                void lite_next;
                if (((((lite_next) < (56320n))) || (((lite_next) > (57343n))))) {
                    return { ok: false, text: "", error: "unpaired UTF-16 high surrogate" };
                }
                lite_points.push(lite$addInt(lite$addInt(65536n, lite$multiplyInt((lite$subtractInt(lite_code, 55296n, 2807)), 1024n, 2816), 2799), (lite$subtractInt(lite_next, 56320n, 2831)), 2823));
                lite_index = lite$addInt(lite_index, 2n, 2860);
            } else if (((((lite_code) >= (56320n))) && (((lite_code) <= (57343n))))) {
                return { ok: false, text: "", error: "unpaired UTF-16 low surrogate" };
            } else {
                lite_points.push(lite_code);
                lite_index = lite$addInt(lite_index, 1n, 3083);
            }
        }
        return lite$unicodeFromCodePoints([...(lite_points)]);
    }
    void liteFn$lib$core$unicode$utf16DecodeStrict;
    function liteFn$lib$core$unicode$utf8Encode(lite_text: string): bigint[] {
        void lite_text;
        let lite_out: bigint[] = [...([...([])])];
        void lite_out;
        for (const lite_cp of [...(lite$unicodeToCodePoints(lite_text))]) {
            void lite_cp;
            if (((lite_cp) <= (127n))) {
                lite_out.push(lite_cp);
            } else if (((lite_cp) <= (2047n))) {
                lite_out.push(lite$addInt(192n, (lite$divideInt(lite_cp, 64n, 3444)), 3438));
                lite_out.push(lite$addInt(128n, (lite$remainderInt(lite_cp, 64n, 3497)), 3491));
            } else if (((lite_cp) <= (65535n))) {
                lite_out.push(lite$addInt(224n, (lite$divideInt(lite_cp, 4096n, 3582)), 3576));
                lite_out.push(lite$addInt(128n, (lite$remainderInt((lite$divideInt(lite_cp, 64n, 3638)), 64n, 3644)), 3631));
                lite_out.push(lite$addInt(128n, (lite$remainderInt(lite_cp, 64n, 3697)), 3691));
            } else {
                lite_out.push(lite$addInt(240n, (lite$divideInt(lite_cp, 262144n, 3767)), 3761));
                lite_out.push(lite$addInt(128n, (lite$remainderInt((lite$divideInt(lite_cp, 4096n, 3825)), 64n, 3833)), 3818));
                lite_out.push(lite$addInt(128n, (lite$remainderInt((lite$divideInt(lite_cp, 64n, 3887)), 64n, 3893)), 3880));
                lite_out.push(lite$addInt(128n, (lite$remainderInt(lite_cp, 64n, 3946)), 3940));
            }
        }
        return [...(lite_out)];
    }
    void liteFn$lib$core$unicode$utf8Encode;
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
            const lite_b = lite$listAt((lite_bytes), lite_index, 4344);
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
                lite_index = lite$addInt(lite_index, 1n, 4731);
            } else if (((lite_needed) === (0n))) {
                if (((lite_b) <= (127n))) {
                    lite_points.push(lite_b);
                } else if (((((lite_b) >= (194n))) && (((lite_b) <= (223n))))) {
                    lite_needed = 1n;
                    lite_codePoint = lite$subtractInt(lite_b, 192n, 4945);
                } else if (((((lite_b) >= (224n))) && (((lite_b) <= (239n))))) {
                    if (((lite_b) === (224n))) {
                        lite_lowerBoundary = 160n;
                    }
                    if (((lite_b) === (237n))) {
                        lite_upperBoundary = 159n;
                    }
                    lite_needed = 2n;
                    lite_codePoint = lite$subtractInt(lite_b, 224n, 5162);
                } else if (((((lite_b) >= (240n))) && (((lite_b) <= (244n))))) {
                    if (((lite_b) === (240n))) {
                        lite_lowerBoundary = 144n;
                    }
                    if (((lite_b) === (244n))) {
                        lite_upperBoundary = 143n;
                    }
                    lite_needed = 3n;
                    lite_codePoint = lite$subtractInt(lite_b, 240n, 5379);
                } else {
                    if (lite_strict) {
                        return { ok: false, text: "", error: "invalid UTF-8 lead byte" };
                    }
                    lite_points.push(65533n);
                }
                lite_index = lite$addInt(lite_index, 1n, 5622);
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
                lite_codePoint = lite$addInt(lite$multiplyInt(lite_codePoint, 64n, 6118), (lite$subtractInt(lite_b, 128n, 6128)), 6123);
                lite_seen = lite$addInt(lite_seen, 1n, 6153);
                if (((lite_seen) === (lite_needed))) {
                    lite_points.push(lite_codePoint);
                    lite_codePoint = 0n;
                    lite_needed = 0n;
                    lite_seen = 0n;
                }
                lite_index = lite$addInt(lite_index, 1n, 6362);
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
    function liteFn$lib$core$unicode$utf8DecodeLossy(lite_bytes: bigint[]): string {
        void lite_bytes;
        return (liteFn$lib$core$unicode$utf8DecodeInternal([...(lite_bytes)], false)).text;
    }
    void liteFn$lib$core$unicode$utf8DecodeLossy;
    function liteFn$lib$core$unicode$isValidUtf8(lite_bytes: bigint[]): boolean {
        void lite_bytes;
        return (liteFn$lib$core$unicode$utf8DecodeStrict([...(lite_bytes)])).ok;
    }
    void liteFn$lib$core$unicode$isValidUtf8;
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
    function liteFn$lib$core$file$validateBytes(lite_bytes: bigint[]): { ok: boolean; error: string } {
        void lite_bytes;
        for (const lite_byte of [...(lite_bytes)]) {
            void lite_byte;
            if (((((lite_byte) < (0n))) || (((lite_byte) > (255n))))) {
                return { ok: false, error: (("byte value outside 0..255: ") + (liteFn$lib$core$int$intText(lite_byte))) };
            }
        }
        return { ok: true, error: "" };
    }
    void liteFn$lib$core$file$validateBytes;
    function liteFn$lib$core$file$writeWithHandle(lite_writer: { kind: string; handle: bigint }, lite_bytes: bigint[]): { ok: boolean; error: string } {
        void lite_writer;
        void lite_bytes;
        if ((!(lite$ioWriterOk(lite_writer)))) {
            return { ok: false, error: lite$ioWriterError(lite_writer) };
        }
        const lite_wrote = lite$ioWrite(lite_writer, [...(lite_bytes)]);
        void lite_wrote;
        const lite_closed = lite$ioCloseWriter(lite_writer);
        void lite_closed;
        if ((!((lite_wrote).ok))) {
            return { ok: false, error: (lite_wrote).error };
        }
        if ((!((lite_closed).ok))) {
            return { ok: false, error: (lite_closed).error };
        }
        return { ok: true, error: "" };
    }
    void liteFn$lib$core$file$writeWithHandle;
    function liteFn$lib$core$file$readBytes(lite_path: string): bigint[] {
        void lite_path;
        const lite_reader = lite$fileOpenReader(lite_path);
        void lite_reader;
        if ((!(lite$ioReaderOk(lite_reader)))) {
            liteFn$lib$core$diag$fail("", lite$ioReaderError(lite_reader));
            return [...([])];
        }
        const lite_bytes: bigint[] = [...(lite$ioReadAll(lite_reader))];
        void lite_bytes;
        const lite_readErr = lite$ioReaderError(lite_reader);
        void lite_readErr;
        const lite_closed = lite$ioCloseReader(lite_reader);
        void lite_closed;
        if (((lite_readErr) !== (""))) {
            liteFn$lib$core$diag$fail("", lite_readErr);
            return [...([])];
        }
        if ((!((lite_closed).ok))) {
            liteFn$lib$core$diag$fail("", (lite_closed).error);
            return [...([])];
        }
        return [...(lite_bytes)];
    }
    void liteFn$lib$core$file$readBytes;
    function liteFn$lib$core$file$readText(lite_path: string): { ok: boolean; text: string; error: string } {
        void lite_path;
        const lite_reader = lite$fileOpenReader(lite_path);
        void lite_reader;
        if ((!(lite$ioReaderOk(lite_reader)))) {
            return { ok: false, text: "", error: lite$ioReaderError(lite_reader) };
        }
        const lite_bytes: bigint[] = [...(lite$ioReadAll(lite_reader))];
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
    function liteFn$lib$core$file$writeBytes(lite_path: string, lite_bytes: bigint[]): { ok: boolean; error: string } {
        void lite_path;
        void lite_bytes;
        const lite_checked = liteFn$lib$core$file$validateBytes([...(lite_bytes)]);
        void lite_checked;
        if ((!((lite_checked).ok))) {
            return lite_checked;
        }
        return liteFn$lib$core$file$writeWithHandle(lite$fileOpenWriter(lite_path), [...(lite_bytes)]);
    }
    void liteFn$lib$core$file$writeBytes;
    function liteFn$lib$core$file$writeText(lite_path: string, lite_text: string): { ok: boolean; error: string } {
        void lite_path;
        void lite_text;
        return liteFn$lib$core$file$writeBytes(lite_path, [...(liteFn$lib$core$unicode$utf8Encode(lite_text))]);
    }
    void liteFn$lib$core$file$writeText;
    function liteFn$lib$core$file$appendBytes(lite_path: string, lite_bytes: bigint[]): { ok: boolean; error: string } {
        void lite_path;
        void lite_bytes;
        const lite_checked = liteFn$lib$core$file$validateBytes([...(lite_bytes)]);
        void lite_checked;
        if ((!((lite_checked).ok))) {
            return lite_checked;
        }
        return liteFn$lib$core$file$writeWithHandle(lite$fileOpenAppender(lite_path), [...(lite_bytes)]);
    }
    void liteFn$lib$core$file$appendBytes;
    function liteFn$lib$core$file$appendText(lite_path: string, lite_text: string): { ok: boolean; error: string } {
        void lite_path;
        void lite_text;
        return liteFn$lib$core$file$appendBytes(lite_path, [...(liteFn$lib$core$unicode$utf8Encode(lite_text))]);
    }
    void liteFn$lib$core$file$appendText;
    function liteFn$lib$core$file$copyStream(lite_reader: { kind: string; handle: bigint }, lite_writer: { kind: string; handle: bigint }): { ok: boolean; copied: bigint; error: string } {
        void lite_reader;
        void lite_writer;
        if ((!(lite$ioReaderOk(lite_reader)))) {
            return { ok: false, copied: 0n, error: lite$ioReaderError(lite_reader) };
        }
        if ((!(lite$ioWriterOk(lite_writer)))) {
            return { ok: false, copied: 0n, error: lite$ioWriterError(lite_writer) };
        }
        let lite_total = 0n;
        void lite_total;
        while (((lite$ioReaderOk(lite_reader)) && ((!(lite$ioReaderAtEof(lite_reader)))))) {
            const lite_chunk: bigint[] = [...(lite$ioRead(lite_reader, 65536n))];
            void lite_chunk;
            const lite_err = lite$ioReaderError(lite_reader);
            void lite_err;
            if (((lite_err) !== (""))) {
                return { ok: false, copied: lite_total, error: lite_err };
            }
            if (((liteFn$lib$core$list$listCountInt([...(lite_chunk)])) === (0n))) {
                break;
            }
            const lite_wrote = lite$ioWrite(lite_writer, [...(lite_chunk)]);
            void lite_wrote;
            if ((!((lite_wrote).ok))) {
                return { ok: false, copied: lite_total, error: (lite_wrote).error };
            }
            lite_total = lite$addInt(lite_total, (lite_wrote).written, 5678);
        }
        return { ok: true, copied: lite_total, error: "" };
    }
    void liteFn$lib$core$file$copyStream;
    const lite$m$lib$core$crypto$b64Alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    void lite$m$lib$core$crypto$b64Alphabet;
    const lite$m$lib$core$crypto$hexAlphabet = "0123456789abcdef";
    void lite$m$lib$core$crypto$hexAlphabet;
    function liteFn$lib$core$crypto$sha256File(lite_path: string): { ok: boolean; hex: string; error: string } {
        void lite_path;
        const lite_reader = lite$fileOpenReader(lite_path);
        void lite_reader;
        if ((!(lite$ioReaderOk(lite_reader)))) {
            return { ok: false, hex: "", error: lite$ioReaderError(lite_reader) };
        }
        const lite_bytes: bigint[] = [...(lite$ioReadAll(lite_reader))];
        void lite_bytes;
        const lite_readErr = lite$ioReaderError(lite_reader);
        void lite_readErr;
        const lite_closed = lite$ioCloseReader(lite_reader);
        void lite_closed;
        if (((lite_readErr) !== (""))) {
            return { ok: false, hex: "", error: lite_readErr };
        }
        if ((!((lite_closed).ok))) {
            return { ok: false, hex: "", error: (lite_closed).error };
        }
        return { ok: true, hex: lite$cryptoDigestBytes("sha256", [...(lite_bytes)]), error: "" };
    }
    void liteFn$lib$core$crypto$sha256File;
    function liteFn$lib$core$crypto$sha256Text(lite_value: string): string {
        void lite_value;
        return lite$cryptoDigestBytes("sha256", [...(liteFn$lib$core$unicode$utf8Encode(lite_value))]);
    }
    void liteFn$lib$core$crypto$sha256Text;
    function liteFn$lib$core$crypto$sha256Bytes(lite_bytes: bigint[]): string {
        void lite_bytes;
        return lite$cryptoDigestBytes("sha256", [...(lite_bytes)]);
    }
    void liteFn$lib$core$crypto$sha256Bytes;
    function liteFn$lib$core$crypto$sha512Text(lite_value: string): string {
        void lite_value;
        return lite$cryptoDigestBytes("sha512", [...(liteFn$lib$core$unicode$utf8Encode(lite_value))]);
    }
    void liteFn$lib$core$crypto$sha512Text;
    function liteFn$lib$core$crypto$sha512Bytes(lite_bytes: bigint[]): string {
        void lite_bytes;
        return lite$cryptoDigestBytes("sha512", [...(lite_bytes)]);
    }
    void liteFn$lib$core$crypto$sha512Bytes;
    function liteFn$lib$core$crypto$isBase64DataChar(lite_ch: string): boolean {
        void lite_ch;
        return ((liteFn$lib$core$text$indexOfText(lite$m$lib$core$crypto$b64Alphabet, lite_ch, 0n)) >= (0n));
    }
    void liteFn$lib$core$crypto$isBase64DataChar;
    function liteFn$lib$core$crypto$isHexChar(lite_ch: string): boolean {
        void lite_ch;
        return ((liteFn$lib$core$text$indexOfText("0123456789abcdefABCDEF", lite_ch, 0n)) >= (0n));
    }
    void liteFn$lib$core$crypto$isHexChar;
    function liteFn$lib$core$crypto$checkByteRange(lite_bytes: bigint[]): void {
        void lite_bytes;
        for (const lite_b of [...(lite_bytes)]) {
            void lite_b;
            if (((((lite_b) < (0n))) || (((lite_b) > (255n))))) {
                liteFn$lib$core$diag$fail("", (("byte value outside 0..255: ") + (liteFn$lib$core$int$intText(lite_b))));
                return;
            }
        }
    }
    void liteFn$lib$core$crypto$checkByteRange;
    function liteFn$lib$core$crypto$byteXor(lite_left: bigint, lite_right: bigint): bigint {
        void lite_left;
        void lite_right;
        let lite_a = lite_left;
        void lite_a;
        let lite_b = lite_right;
        void lite_b;
        let lite_bit = 1n;
        void lite_bit;
        let lite_out = 0n;
        void lite_out;
        while (((lite_bit) < (256n))) {
            if (((lite$remainderInt(lite_a, 2n, 2688)) !== (lite$remainderInt(lite_b, 2n, 2698)))) {
                lite_out = lite$addInt(lite_out, lite_bit, 2720);
            }
            lite_a = lite$divideInt(lite_a, 2n, 2752);
            lite_b = lite$divideInt(lite_b, 2n, 2771);
            lite_bit = lite$multiplyInt(lite_bit, 2n, 2788);
        }
        return lite_out;
    }
    void liteFn$lib$core$crypto$byteXor;
    function liteFn$lib$core$crypto$isValidBase64(lite_encoded: string): boolean {
        void lite_encoded;
        const lite_size = lite$textLength(lite_encoded);
        void lite_size;
        if (((lite_size) === (0n))) {
            return true;
        }
        if (((lite$remainderInt(lite_size, 4n, 3022)) !== (0n))) {
            return false;
        }
        let lite_padding = 0n;
        void lite_padding;
        if (((lite$textAt(lite_encoded, lite$subtractInt(lite_size, 1n, 3101), 3079)) === ("="))) {
            lite_padding = lite$addInt(lite_padding, 1n, 3123);
        }
        if (((lite$textAt(lite_encoded, lite$subtractInt(lite_size, 2n, 3160), 3138)) === ("="))) {
            if (((lite_padding) === (0n))) {
                return false;
            }
            lite_padding = lite$addInt(lite_padding, 1n, 3232);
        }
        const lite_dataEnd = lite$subtractInt(lite_size, lite_padding, 3264);
        void lite_dataEnd;
        let lite_index = 0n;
        void lite_index;
        while (((lite_index) < (lite_dataEnd))) {
            if ((!(liteFn$lib$core$crypto$isBase64DataChar(lite$textAt(lite_encoded, lite_index, 3354))))) {
                return false;
            }
            lite_index = lite$addInt(lite_index, 1n, 3411);
        }
        return true;
    }
    void liteFn$lib$core$crypto$isValidBase64;
    function liteFn$lib$core$crypto$isValidHex(lite_encoded: string): boolean {
        void lite_encoded;
        const lite_size = lite$textLength(lite_encoded);
        void lite_size;
        if (((lite$remainderInt(lite_size, 2n, 3606)) !== (0n))) {
            return false;
        }
        let lite_index = 0n;
        void lite_index;
        while (((lite_index) < (lite_size))) {
            if ((!(liteFn$lib$core$crypto$isHexChar(lite$textAt(lite_encoded, lite_index, 3703))))) {
                return false;
            }
            lite_index = lite$addInt(lite_index, 1n, 3760);
        }
        return true;
    }
    void liteFn$lib$core$crypto$isValidHex;
    function liteFn$lib$core$crypto$base64Encode(lite_bytes: bigint[]): string {
        void lite_bytes;
        liteFn$lib$core$crypto$checkByteRange([...(lite_bytes)]);
        const lite_count = liteFn$lib$core$list$listCountInt([...(lite_bytes)]);
        void lite_count;
        let lite_out = "";
        void lite_out;
        let lite_index = 0n;
        void lite_index;
        while (((lite_index) < (lite_count))) {
            const lite_b0 = lite$listAt((lite_bytes), lite_index, 4059);
            void lite_b0;
            lite_out = ((lite_out) + (lite$textAt(lite$m$lib$core$crypto$b64Alphabet, lite$divideInt(lite_b0, 4n, 4106), 4082)));
            const lite_rem0 = lite$remainderInt(lite_b0, 4n, 4131);
            void lite_rem0;
            if (((lite$addInt(lite_index, 1n, 4153)) >= (lite_count))) {
                lite_out = ((lite_out) + (((lite$textAt(lite$m$lib$core$crypto$b64Alphabet, lite$multiplyInt(lite_rem0, 16n, 4213), 4187)) + ("=="))));
                break;
            }
            const lite_b1 = lite$listAt((lite_bytes), lite$addInt(lite_index, 1n, 4282), 4276);
            void lite_b1;
            lite_out = ((lite_out) + (lite$textAt(lite$m$lib$core$crypto$b64Alphabet, lite$addInt(lite$multiplyInt(lite_rem0, 16n, 4329), (lite$divideInt(lite_b1, 16n, 4340)), 4334), 4303)));
            const lite_rem1 = lite$remainderInt(lite_b1, 16n, 4367);
            void lite_rem1;
            if (((lite$addInt(lite_index, 2n, 4390)) >= (lite_count))) {
                lite_out = ((lite_out) + (((lite$textAt(lite$m$lib$core$crypto$b64Alphabet, lite$multiplyInt(lite_rem1, 4n, 4450), 4424)) + ("="))));
                break;
            }
            const lite_b2 = lite$listAt((lite_bytes), lite$addInt(lite_index, 2n, 4517), 4511);
            void lite_b2;
            lite_out = ((lite_out) + (((lite$textAt(lite$m$lib$core$crypto$b64Alphabet, lite$addInt(lite$multiplyInt(lite_rem1, 4n, 4564), (lite$divideInt(lite_b2, 64n, 4574)), 4568), 4538)) + (lite$textAt(lite$m$lib$core$crypto$b64Alphabet, lite$remainderInt(lite_b2, 64n, 4607), 4583)))));
            lite_index = lite$addInt(lite_index, 3n, 4628);
        }
        return lite_out;
    }
    void liteFn$lib$core$crypto$base64Encode;
    function liteFn$lib$core$crypto$base64Decode(lite_encoded: string): bigint[] {
        void lite_encoded;
        if ((!(liteFn$lib$core$crypto$isValidBase64(lite_encoded)))) {
            liteFn$lib$core$diag$fail("", "invalid base64 input");
            return [...([])];
        }
        const lite_size = lite$textLength(lite_encoded);
        void lite_size;
        let lite_out: bigint[] = [...([...([])])];
        void lite_out;
        let lite_index = 0n;
        void lite_index;
        while (((lite_index) < (lite_size))) {
            const lite_d0 = liteFn$lib$core$text$indexOfText(lite$m$lib$core$crypto$b64Alphabet, lite$textAt(lite_encoded, lite_index, 5068), 0n);
            void lite_d0;
            const lite_d1 = liteFn$lib$core$text$indexOfText(lite$m$lib$core$crypto$b64Alphabet, lite$textAt(lite_encoded, lite$addInt(lite_index, 1n, 5164), 5141), 0n);
            void lite_d1;
            lite_out.push(lite$addInt(lite$multiplyInt(lite_d0, 4n, 5208), (lite$divideInt(lite_d1, 16n, 5218)), 5212));
            const lite_c2 = lite$textAt(lite_encoded, lite$addInt(lite_index, 2n, 5263), 5240);
            void lite_c2;
            if (((lite_c2) !== ("="))) {
                const lite_d2 = liteFn$lib$core$text$indexOfText(lite$m$lib$core$crypto$b64Alphabet, lite_c2, 0n);
                void lite_d2;
                lite_out.push(lite$addInt(lite$multiplyInt((lite$remainderInt(lite_d1, 16n, 5388)), 16n, 5394), (lite$divideInt(lite_d2, 4n, 5405)), 5399));
                const lite_c3 = lite$textAt(lite_encoded, lite$addInt(lite_index, 3n, 5453), 5430);
                void lite_c3;
                if (((lite_c3) !== ("="))) {
                    const lite_d3 = liteFn$lib$core$text$indexOfText(lite$m$lib$core$crypto$b64Alphabet, lite_c3, 0n);
                    void lite_d3;
                    lite_out.push(lite$addInt(lite$multiplyInt((lite$remainderInt(lite_d2, 4n, 5590)), 64n, 5595), lite_d3, 5600));
                }
            }
            lite_index = lite$addInt(lite_index, 4n, 5645);
        }
        return [...(lite_out)];
    }
    void liteFn$lib$core$crypto$base64Decode;
    function liteFn$lib$core$crypto$hexEncode(lite_bytes: bigint[]): string {
        void lite_bytes;
        liteFn$lib$core$crypto$checkByteRange([...(lite_bytes)]);
        let lite_out = "";
        void lite_out;
        for (const lite_b of [...(lite_bytes)]) {
            void lite_b;
            lite_out = ((lite_out) + (((lite$textAt(lite$m$lib$core$crypto$hexAlphabet, lite$divideInt(lite_b, 16n, 5893), 5870)) + (lite$textAt(lite$m$lib$core$crypto$hexAlphabet, lite$remainderInt(lite_b, 16n, 5924), 5901)))));
        }
        return lite_out;
    }
    void liteFn$lib$core$crypto$hexEncode;
    function liteFn$lib$core$crypto$hexDecode(lite_encoded: string): bigint[] {
        void lite_encoded;
        if ((!(liteFn$lib$core$crypto$isValidHex(lite_encoded)))) {
            liteFn$lib$core$diag$fail("", "invalid hex input");
            return [...([])];
        }
        const lite_size = lite$textLength(lite_encoded);
        void lite_size;
        let lite_out: bigint[] = [...([...([])])];
        void lite_out;
        let lite_index = 0n;
        void lite_index;
        while (((lite_index) < (lite_size))) {
            const lite_hi = liteFn$lib$core$text$indexOfText(lite$m$lib$core$crypto$hexAlphabet, liteFn$lib$core$text$toLowerAscii(lite$textAt(lite_encoded, lite_index, 6361)), 0n);
            void lite_hi;
            const lite_lo = liteFn$lib$core$text$indexOfText(lite$m$lib$core$crypto$hexAlphabet, liteFn$lib$core$text$toLowerAscii(lite$textAt(lite_encoded, lite$addInt(lite_index, 1n, 6476), 6453)), 0n);
            void lite_lo;
            lite_out.push(lite$addInt(lite$multiplyInt(lite_hi, 16n, 6521), lite_lo, 6526));
            lite_index = lite$addInt(lite_index, 2n, 6547);
        }
        return [...(lite_out)];
    }
    void liteFn$lib$core$crypto$hexDecode;
    function liteFn$lib$core$crypto$hmacSha256Bytes(lite_key: bigint[], lite_data: bigint[]): string {
        void lite_key;
        void lite_data;
        liteFn$lib$core$crypto$checkByteRange([...(lite_key)]);
        const lite_keySize = liteFn$lib$core$list$listCountInt([...(lite_key)]);
        void lite_keySize;
        const lite_normalized: bigint[] = [...((Boolean(((lite_keySize) > (64n))) ? [...(liteFn$lib$core$crypto$hexDecode(liteFn$lib$core$crypto$sha256Bytes([...(lite_key)])))] : [...(lite_key)]))];
        void lite_normalized;
        let lite_blockKey: bigint[] = [...([...([])])];
        void lite_blockKey;
        for (const lite_b of [...(lite_normalized)]) {
            void lite_b;
            lite_blockKey.push(lite_b);
        }
        while (((liteFn$lib$core$list$listCountInt([...(lite_blockKey)])) < (64n))) {
            lite_blockKey.push(0n);
        }
        let lite_inner: bigint[] = [...([...([])])];
        void lite_inner;
        let lite_outer: bigint[] = [...([...([])])];
        void lite_outer;
        let lite_index = 0n;
        void lite_index;
        while (((lite_index) < (64n))) {
            const lite_kb = lite$listAt((lite_blockKey), lite_index, 7212);
            void lite_kb;
            lite_inner.push(liteFn$lib$core$crypto$byteXor(lite_kb, 54n));
            lite_outer.push(liteFn$lib$core$crypto$byteXor(lite_kb, 92n));
            lite_index = lite$addInt(lite_index, 1n, 7336);
        }
        for (const lite_b of [...(lite_data)]) {
            void lite_b;
            lite_inner.push(lite_b);
        }
        const lite_innerDigest: bigint[] = [...(liteFn$lib$core$crypto$hexDecode(liteFn$lib$core$crypto$sha256Bytes([...(lite_inner)])))];
        void lite_innerDigest;
        for (const lite_b of [...(lite_innerDigest)]) {
            void lite_b;
            lite_outer.push(lite_b);
        }
        return liteFn$lib$core$crypto$sha256Bytes([...(lite_outer)]);
    }
    void liteFn$lib$core$crypto$hmacSha256Bytes;
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
        if (liteFn$lib$core$path$isSepWith(lite$textAt(lite_target, 0n, 826), lite_win)) {
            return true;
        }
        return ((((((lite_win) && (((lite_size) >= (2n))))) && (liteFn$lib$core$text$isAsciiLetter(lite$textAt(lite_target, 0n, 913))))) && (((lite$textAt(lite_target, 1n, 937)) === (":"))));
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
        if (((((((lite_win) && (((lite_size) >= (2n))))) && (liteFn$lib$core$text$isAsciiLetter(lite$textAt(lite_raw, 0n, 1309))))) && (((lite$textAt(lite_raw, 1n, 1330)) === (":"))))) {
            const lite_drive = lite$textSlice(lite_raw, 0n, 2n, 1372);
            void lite_drive;
            if (((((lite_size) >= (3n))) && (liteFn$lib$core$path$isSepWith(lite$textAt(lite_raw, 2n, 1430), true)))) {
                lite_rootPrefix = ((lite_drive) + (lite_separator));
                lite_start = 3n;
            } else {
                lite_rootPrefix = lite_drive;
                lite_start = 2n;
            }
        } else if (liteFn$lib$core$path$isSepWith(lite$textAt(lite_raw, 0n, 1628), lite_win)) {
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
                const lite_seg = lite$textSlice(lite_raw, lite_segStart, lite_i, 2150);
                void lite_seg;
                if (((lite_seg) === (".."))) {
                    if (((((lite_partsCount) > (0n))) && ((((((lite_rootPrefix) !== (""))) || (((lite$listAt((lite_parts), lite$subtractInt(lite_partsCount, 1n, 2286), 2275)) !== ("..")))))))) {
                        lite$listPopBack(lite_parts, 2323);
                        lite_partsCount = lite$subtractInt(lite_partsCount, 1n, 2392);
                    } else if (((lite_rootPrefix) === (""))) {
                        lite_parts.push("..");
                        lite_partsCount = lite$addInt(lite_partsCount, 1n, 2538);
                    }
                } else if (((lite_seg) !== ("."))) {
                    lite_parts.push(lite_seg);
                    lite_partsCount = lite$addInt(lite_partsCount, 1n, 2684);
                }
            }
            if (((lite_sepPos) < (0n))) {
                break;
            }
            lite_segStart = lite$addInt(lite_i, 1n, 2767);
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
    function liteFn$lib$core$path$joinAll(lite_parts: string[]): string {
        void lite_parts;
        let lite_acc = "";
        void lite_acc;
        let lite_hasAny = false;
        void lite_hasAny;
        for (const lite_part of [...(lite_parts)]) {
            void lite_part;
            if (((lite_part) !== (""))) {
                if ((!(lite_hasAny))) {
                    lite_acc = lite_part;
                    lite_hasAny = true;
                } else {
                    lite_acc = ((((lite_acc) + (liteFn$lib$core$path$sep()))) + (lite_part));
                }
            }
        }
        if ((!(lite_hasAny))) {
            return ".";
        }
        return liteFn$lib$core$path$normalize(lite_acc);
    }
    void liteFn$lib$core$path$joinAll;
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
        while (((((lite_end) > (0n))) && (liteFn$lib$core$path$isSep(lite$textAt(lite_target, lite$subtractInt(lite_end, 1n, 4237), 4217))))) {
            lite_end = lite$subtractInt(lite_end, 1n, 4263);
        }
        if (((lite_end) === (0n))) {
            return "";
        }
        let lite_pos = lite_end;
        void lite_pos;
        while (((((lite_pos) > (0n))) && ((!(liteFn$lib$core$path$isSep(lite$textAt(lite_target, lite$subtractInt(lite_pos, 1n, 4376), 4356))))))) {
            lite_pos = lite$subtractInt(lite_pos, 1n, 4402);
        }
        return lite$textSlice(lite_target, lite_pos, lite_end, 4417);
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
        let lite_i = lite$subtractInt(lite_size, 1n, 4734);
        void lite_i;
        while (((lite_i) > (0n))) {
            if (((lite$textAt(lite_base, lite_i, 4767)) === ("."))) {
                return lite$textSlice(lite_base, lite_i, lite_size, 4812);
            }
            lite_i = lite$subtractInt(lite_i, 1n, 4863);
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
        return lite$textSlice(lite_base, 0n, lite$subtractInt(lite$textLength(lite_base), lite$textLength(lite_ext), 5120), 5082);
    }
    void liteFn$lib$core$path$stem;
    function liteFn$lib$core$path$withExt(lite_target: string, lite_ext: string): string {
        void lite_target;
        void lite_ext;
        const lite_base = liteFn$lib$core$path$baseName(lite_target);
        void lite_base;
        if (((((((lite_base) === (""))) || (((lite_base) === ("."))))) || (((lite_base) === (".."))))) {
            return lite_target;
        }
        let lite_end = lite$textLength(lite_target);
        void lite_end;
        while (((((lite_end) > (0n))) && (liteFn$lib$core$path$isSep(lite$textAt(lite_target, lite$subtractInt(lite_end, 1n, 5479), 5459))))) {
            lite_end = lite$subtractInt(lite_end, 1n, 5505);
        }
        const lite_oldExt = liteFn$lib$core$path$extName(lite_target);
        void lite_oldExt;
        const lite_stemEnd = lite$subtractInt(lite_end, lite$textLength(lite_oldExt), 5566);
        void lite_stemEnd;
        const lite_prefix = lite$textSlice(lite_target, 0n, lite_stemEnd, 5603);
        void lite_prefix;
        const lite_suffix = lite$textSlice(lite_target, lite_end, lite$textLength(lite_target), 5649);
        void lite_suffix;
        if (((lite_ext) === (""))) {
            return ((lite_prefix) + (lite_suffix));
        }
        const lite_normalizedExt = (Boolean(liteFn$lib$core$text$startsWithAt(lite_ext, 0n, ".")) ? lite_ext : ((".") + (lite_ext)));
        void lite_normalizedExt;
        return ((((lite_prefix) + (lite_normalizedExt))) + (lite_suffix));
    }
    void liteFn$lib$core$path$withExt;
    function liteFn$lib$core$path$splitSegments(lite_normalized: string): string[] {
        void lite_normalized;
        const lite_parts: string[] = [...([])];
        void lite_parts;
        const lite_size = lite$textLength(lite_normalized);
        void lite_size;
        let lite_start = 0n;
        void lite_start;
        if (((((((liteFn$lib$core$path$isWin32()) && (((lite_size) >= (2n))))) && (liteFn$lib$core$text$isAsciiLetter(lite$textAt(lite_normalized, 0n, 6063))))) && (((lite$textAt(lite_normalized, 1n, 6091)) === (":"))))) {
            if (((((lite_size) >= (3n))) && (liteFn$lib$core$path$isSep(lite$textAt(lite_normalized, 2n, 6154))))) {
                lite_start = 3n;
            } else {
                lite_start = 2n;
            }
        } else if (((((lite_size) > (0n))) && (liteFn$lib$core$path$isSep(lite$textAt(lite_normalized, 0n, 6246))))) {
            lite_start = 1n;
        }
        let lite_segStart = lite_start;
        void lite_segStart;
        let lite_i = lite_start;
        void lite_i;
        while (((lite_i) <= (lite_size))) {
            const lite_atEnd = ((lite_i) === (lite_size));
            void lite_atEnd;
            if (((lite_atEnd) || (liteFn$lib$core$path$isSep(lite$textAt(lite_normalized, lite_i, 6419))))) {
                if (((lite_i) > (lite_segStart))) {
                    lite_parts.push(lite$textSlice(lite_normalized, lite_segStart, lite_i, 6516));
                }
                lite_segStart = lite$addInt(lite_i, 1n, 6593);
            }
            lite_i = lite$addInt(lite_i, 1n, 6622);
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
        while (((((((lite_common) < (lite_fromLen))) && (((lite_common) < (lite_toLen))))) && (((lite$listAt((lite_fromSegs), lite_common, 7194)) === (lite$listAt((lite_toSegs), lite_common, 7212)))))) {
            lite_common = lite$addInt(lite_common, 1n, 7246);
        }
        const lite_out: string[] = [...([])];
        void lite_out;
        let lite_up = lite_common;
        void lite_up;
        while (((lite_up) < (lite_fromLen))) {
            lite_out.push("..");
            lite_up = lite$addInt(lite_up, 1n, 7389);
        }
        let lite_down = lite_common;
        void lite_down;
        while (((lite_down) < (lite_toLen))) {
            lite_out.push(lite$listAt((lite_toSegs), lite_down, 7486));
            lite_down = lite$addInt(lite_down, 1n, 7514);
        }
        if (((liteFn$lib$core$list$listCountText([...(lite_out)])) === (0n))) {
            return "";
        }
        return liteFn$lib$core$text$joinTexts([...(lite_out)], liteFn$lib$core$path$sep());
    }
    void liteFn$lib$core$path$relative;
    function liteFn$lib$core$path$exists(lite_target: string): boolean {
        void lite_target;
        return ((lite$fileKind(lite_target)) !== ("missing"));
    }
    void liteFn$lib$core$path$exists;
    function liteFn$lib$core$path$isFile(lite_target: string): boolean {
        void lite_target;
        return ((lite$fileKind(lite_target)) === ("file"));
    }
    void liteFn$lib$core$path$isFile;
    function liteFn$lib$core$path$isDirectory(lite_target: string): boolean {
        void lite_target;
        return ((lite$fileKind(lite_target)) === ("dir"));
    }
    void liteFn$lib$core$path$isDirectory;
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
    function liteFn$lib$util$cli$stripSuffix(lite_value: string, lite_suffix: string): string {
        void lite_value;
        void lite_suffix;
        if (liteFn$lib$core$text$endsWith(lite_value, lite_suffix)) {
            return lite$textSlice(lite_value, 0n, lite$subtractInt(lite$textLength(lite_value), lite$textLength(lite_suffix), 4743), 4703);
        }
        return lite_value;
    }
    void liteFn$lib$util$cli$stripSuffix;
    function liteFn$lib$util$cli$entryCommand(lite_entryPath: string): string {
        void lite_entryPath;
        let lite_name = liteFn$lib$core$path$baseName(lite_entryPath);
        void lite_name;
        lite_name = liteFn$lib$util$cli$stripSuffix(lite_name, ".ts");
        lite_name = liteFn$lib$util$cli$stripSuffix(lite_name, ".js");
        lite_name = liteFn$lib$util$cli$stripSuffix(lite_name, ".exe");
        if (liteFn$lib$core$text$startsWithAt(lite_name, 0n, "lite-")) {
            lite_name = lite$textSlice(lite_name, 5n, lite$textLength(lite_name), 5164);
        }
        if (((((lite_name) === ("cli"))) || (((lite_name) === ("lite"))))) {
            return "lite";
        }
        if (((lite_name) === ("checker"))) {
            return "check";
        }
        if (((lite_name) === ("check"))) {
            return "doctor";
        }
        if (((lite_name) === ("test-runner"))) {
            return "test";
        }
        return lite_name;
    }
    void liteFn$lib$util$cli$entryCommand;
    function liteFn$lib$util$cli$currentEntryCommand(): string {
        return liteFn$lib$util$cli$entryCommand(lite$processEntryPath());
    }
    void liteFn$lib$util$cli$currentEntryCommand;
    function liteFn$lib$util$cli$normalizeSubcommand(lite_token: string, lite_commands: string[]): string {
        void lite_token;
        void lite_commands;
        if (liteFn$lib$core$list$listContainsText([...(lite_commands)], lite_token)) {
            return lite_token;
        }
        if (liteFn$lib$core$text$startsWithAt(lite_token, 0n, "--")) {
            const lite_candidate = lite$textSlice(lite_token, 2n, lite$textLength(lite_token), 5908);
            void lite_candidate;
            if (liteFn$lib$core$list$listContainsText([...(lite_commands)], lite_candidate)) {
                return lite_candidate;
            }
        }
        return "";
    }
    void liteFn$lib$util$cli$normalizeSubcommand;
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
        let lite_targetIdx = lite$subtractInt(liteFn$lib$core$list$listCountText([...(lite_targets)]), 1n, 842);
        void lite_targetIdx;
        while (((lite_targetIdx) >= (0n))) {
            lite_stack.push(liteFn$lib$core$path$resolve(lite_baseDir, lite$listAt((lite_targets), lite_targetIdx, 936)));
            lite_stackCount = lite$addInt(lite_stackCount, 1n, 982);
            lite_targetIdx = lite$subtractInt(lite_targetIdx, 1n, 1017);
        }
        while (((lite_stackCount) > (0n))) {
            const lite_resolved = lite$listPopBack(lite_stack, 1075);
            void lite_resolved;
            lite_stackCount = lite$subtractInt(lite_stackCount, 1n, 1132);
            const lite_kind = lite$fileKind(lite_resolved);
            void lite_kind;
            if (((lite_kind) === ("missing"))) {
                lite$reportError((((("ENOENT: no such file or directory, stat '") + (lite_resolved))) + ("'")));
                return lite$exit(1n);
            }
            if (((lite_kind) === ("dir"))) {
                const lite_entries: string[] = [...(lite$fileListDir(lite_resolved))];
                void lite_entries;
                let lite_entryIdx = lite$subtractInt(liteFn$lib$core$list$listCountText([...(lite_entries)]), 1n, 1453);
                void lite_entryIdx;
                while (((lite_entryIdx) >= (0n))) {
                    const lite_entry = lite$listAt((lite_entries), lite_entryIdx, 1524);
                    void lite_entry;
                    const lite_isDot = ((lite_skipDotEntries) && (liteFn$lib$core$text$startsWithAt(lite_entry, 0n, ".")));
                    void lite_isDot;
                    if ((((!(lite_isDot))) && ((!(liteFn$lib$core$list$listContainsText([...(lite_ignoredNames)], lite_entry)))))) {
                        lite_stack.push(liteFn$lib$core$path$resolve(lite_resolved, lite_entry));
                        lite_stackCount = lite$addInt(lite_stackCount, 1n, 1816);
                    }
                    lite_entryIdx = lite$subtractInt(lite_entryIdx, 1n, 1875);
                }
            } else if (((((lite_extension) === (""))) || (liteFn$lib$core$text$endsWith(lite_resolved, lite_extension)))) {
                lite_files.push(lite_resolved);
            }
        }
        return [...(lite_files)];
    }
    void liteFn$lib$util$fs$collectFiles;
    function liteFn$lib$util$fs$copyFiltered(lite_srcDir: string, lite_dstDir: string, lite_topSkipNames: string[], lite_nestedSkipNames: string[]): { ok: boolean; error: string } {
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
            const lite_curSrc = lite$listPopBack(lite_srcStack, 2747);
            void lite_curSrc;
            const lite_curDst = lite$listPopBack(lite_dstStack, 2793);
            void lite_curDst;
            const lite_curDepth = lite$listPopBack(lite_depthStack, 2841);
            void lite_curDepth;
            lite_stackCount = lite$subtractInt(lite_stackCount, 1n, 2903);
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
                    if (((lite_entryKind) === ("dir"))) {
                        const lite_mkSub = lite$fileMakeDir(lite_nextDst);
                        void lite_mkSub;
                        if ((!((lite_mkSub).ok))) {
                            return { ok: false, error: (lite_mkSub).error };
                        }
                        lite_srcStack.push(lite_nextSrc);
                        lite_dstStack.push(lite_nextDst);
                        lite_depthStack.push(lite$addInt(lite_curDepth, 1n, 3620));
                        lite_stackCount = lite$addInt(lite_stackCount, 1n, 3670);
                    } else if (((lite_entryKind) === ("file"))) {
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
    void liteFn$lib$util$fs$copyFiltered;
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
            if (((lite$fileKind(lite_fullFile)) !== ("file"))) {
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
                    const lite_hexPart = lite$textSlice((lite_hStr).value, 7n, lite$textLength((lite_hStr).value), 5037);
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
            if (((lite$listAt((lite_left), lite_i, 6546)) !== (lite$listAt((lite_right), lite_i, 6559)))) {
                return false;
            }
            lite_i = lite$addInt(lite_i, 1n, 6594);
        }
        return true;
    }
    void liteFn$lib$util$streams$equalBytes;
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
            if (((((lite_atEnd) || (((lite$textAt(lite_relPath, lite_i, 589)) === ("/"))))) || (((lite$textAt(lite_relPath, lite_i, 619)) === ("\\"))))) {
                if (((lite$textSlice(lite_relPath, lite_segStart, lite_i, 664)) === (".."))) {
                    return true;
                }
                lite_segStart = lite$addInt(lite_i, 1n, 747);
            }
            lite_i = lite$addInt(lite_i, 1n, 776);
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
            if ((((((((!((lite_toolRes).found))) || ((!((lite_toolRes).ok))))) || (liteFn$lib$core$text$containsText((lite_toolRes).value, "/")))) || (((lite$fileKind(liteFn$lib$core$path$join(lite_rootDir, (("bin/") + ((lite_toolRes).value))))) === ("missing"))))) {
                return { ok: false, id: "", error: ((lite_caseFile) + (": unknown tool")) };
            }
        } else {
            const lite_srcRes = liteFn$lib$util$json$readObjectString(lite_textSrc, 0n, "source");
            void lite_srcRes;
            if ((((((!((lite_srcRes).found))) || ((!((lite_srcRes).ok))))) || ((!(liteFn$lib$core$text$endsWith((lite_srcRes).value, ".lts")))))) {
                return { ok: false, id: "", error: ((lite_caseFile) + (": Lite source must use .lts")) };
            }
            if (((lite$fileKind(liteFn$lib$core$path$resolve(lite_caseDir, (lite_srcRes).value))) !== ("file"))) {
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
        return [...(liteFn$lib$util$fs$collectFiles(lite_rootDir, [...(lite_roots)], ".case.json", [...(lite_ignored)], false))];
    }
    void liteFn$lib$util$cases$discoverAllCaseFiles;
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
            if (((((lite_filter) === (""))) || (liteFn$lib$core$text$containsText((lite_checked).id, lite_filter)))) {
                lite_matches = lite$addInt(lite_matches, 1n, 13066);
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
                if ((((((lite_idRes).found) && ((lite_idRes).ok))) && (liteFn$lib$core$text$containsText((lite_idRes).value, lite_filter)))) {
                    lite_selected.push(lite_caseFile);
                }
            }
        }
        return [...(lite_selected)];
    }
    void liteFn$lib$util$cases$selectCaseFiles;
    function liteFn$lib$util$cases$validateAllCases(lite_rootDir: string): { ok: boolean; error: string } {
        void lite_rootDir;
        const lite_checked = liteFn$lib$util$cases$validateCaseSet(lite_rootDir, "");
        void lite_checked;
        return { ok: (lite_checked).ok, error: (lite_checked).error };
    }
    void liteFn$lib$util$cases$validateAllCases;
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
        return (liteFn$lib$util$json$readObjectString((lite_readRes).text, lite$listAt((lite_scenarios), lite_scenarioIdx, 16534), "name")).value;
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
                lite_parts.push(((((liteFn$lib$util$json$quoteString(lite_key)) + (":"))) + (lite$textSlice((lite_cfgRes).text, (lite_span).start, (lite_span).end, 17761))));
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
        const lite_copied = liteFn$lib$util$fs$copyFiltered(lite_rootDir, lite_projDir, [...(lite_topSkip)], [...(lite_nestedSkip)]);
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
        if ((((lite_wsRes).value) === ("dirty"))) {
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
        const lite_sPos = lite$listAt((lite_scenarios), lite_scenarioIdx, 24744);
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
        if (((lite_kind) === ("tool"))) {
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
            if (((lite_kind) === ("compile"))) {
                const lite_artField = liteFn$lib$util$json$findObjectField(lite_caseText, lite_sPos, "artifact");
                void lite_artField;
                if ((lite_artField).found) {
                    if (((lite$fileKind(lite_outputTsPath)) !== ("file"))) {
                        return { ok: false, artifactSha: "", error: ((lite_label) + (": missing generated artifact")) };
                    }
                    const lite_expectedArt: bigint[] = [...(liteFn$lib$util$streams$readStreamBytes(lite_caseText, (lite_artField).valuePos, lite_caseDir))];
                    void lite_expectedArt;
                    if ((!(liteFn$lib$util$streams$equalBytes([...(liteFn$lib$core$file$readBytes(lite_outputTsPath))], [...(lite_expectedArt)])))) {
                        return { ok: false, artifactSha: "", error: "generated artifact differs" };
                    }
                }
            }
            if (((((lite_kind) === ("reject"))) && (((lite$fileKind(lite_outputTsPath)) !== ("missing"))))) {
                return { ok: false, artifactSha: "", error: "rejection created an output artifact" };
            }
            if (((((lite_kind) === ("reject"))) || (((lite_kind) === ("compile"))))) {
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
                        if (((lite$fileKind(lite_outFile)) !== ("file"))) {
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
        if (((lite_kind) === ("reject"))) {
            if (((((lite_expectedExit) === (0n))) || (((liteFn$lib$core$list$listCountInt([...(lite_actualStdout)])) > (0n))))) {
                return { ok: false, artifactSha: "", error: ((lite_label) + (": unexpected reject output")) };
            }
        }
        const lite_filesField = liteFn$lib$util$json$findObjectField(lite_caseText, lite_sPos, "files");
        void lite_filesField;
        if ((lite_filesField).found) {
            for (const lite_artifactRel of [...(liteFn$lib$util$cases$readStringListAt(lite_caseText, (lite_filesField).valuePos))]) {
                void lite_artifactRel;
                if (((lite$fileKind(liteFn$lib$core$path$resolve(lite_workspace, lite_artifactRel))) === ("missing"))) {
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
        const lite_sourceTarget = (Boolean(((lite_kind) === ("tool"))) ? liteFn$lib$core$path$join(lite_rootDir, (("bin/") + ((liteFn$lib$util$json$readObjectString(lite_caseText, 0n, "tool")).value))) : liteFn$lib$core$path$resolve(lite_caseDir, (liteFn$lib$util$json$readObjectString(lite_caseText, 0n, "source")).value));
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
