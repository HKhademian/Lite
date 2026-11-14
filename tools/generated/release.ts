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

const lite$intLines: readonly number[] = [0, 89, 90, 114, 140, 171, 199, 227, 257, 289, 317, 345, 371, 405, 435, 436, 500, 528, 571, 630, 636, 663, 679, 682, 683, 802, 835, 896, 922, 1014, 1020, 1046, 1078, 1129, 1139, 1257, 1263, 1278, 1281, 1282, 1387, 1443, 1521, 1567, 1573, 1627, 1687, 1727, 1730, 1731, 1845, 1901, 1979, 2031, 2037, 2088, 2154, 2194, 2197, 2198, 2251, 2308, 2384, 2385, 2428, 2463, 2506, 2568, 2593, 2603, 2646, 2717, 2742, 2752, 2830, 2836, 2837, 2885, 2921, 2962, 3020, 3021, 3088, 3157, 3228, 3299, 3379, 3461, 3462, 3492, 3520, 3547, 3623, 3708, 3736, 3830, 3921, 3931, 3932, 3962, 3990, 4017, 4080, 4165, 4193, 4282, 4372, 4382, 4383, 4413, 4440, 4472, 4503, 4533, 4566, 4601, 4636, 4671, 4702, 4770, 4855, 4883, 4978, 5066, 5101, 5201, 5298, 5335, 5440, 5458, 5472, 5560, 5595, 5687, 5732, 5778, 5884, 5994, 6104, 6204, 6245, 6362, 6380, 6394, 6404, 6405, 6449, 6481, 6517, 6559, 6595, 6633, 6734, 6754, 6765, 6794, 6815, 6821, 6831, 6834, 6835, 6912, 6970, 7037, 7073, 7142, 7148, 7149, 7201, 7274, 7275, 7335, 7360, 7401, 7407, 7408, 7428, 7504, 7615, 7646, 7709, 7719, 7806, 7921, 7955, 8018, 8028, 8034, 8035, 8067, 8098, 8175, 8246, 8256, 8262, 8263, 8353, 8401, 8459, 8485, 8486, 8527, 8563, 8625, 8626, 8672, 8756, 8813, 8875, 8925, 8926, 9013, 9079, 9080, 9106, 9134, 9157, 9185, 9212, 9238, 9267, 9298, 9329, 9360, 9387, 9388, 9417, 9487, 9535, 9651, 9661, 9723, 9777, 9841, 9842, 9896, 10013, 10095, 10147, 10217, 10303, 10382, 10466, 10476, 10502, 10589, 10618, 10717, 10727, 10728, 10791, 10904, 10984, 11036, 11106, 11196, 11297, 11404, 11503, 11504, 11586, 11623, 11661, 11757, 11857, 11957, 11958, 11993, 12098, 12169, 12233, 12250, 12339, 12349, 12350, 12374, 12473, 12561, 12631, 12632, 12684, 12731, 12822, 12832, 12873, 12933, 13004, 13066, 13175, 13235, 13329, 13393, 13394, 13432, 13494, 13553, 13617, 13623, 13624, 13650, 13674, 13697, 13757, 13848, 13892, 13971, 13981, 14038, 14199, 14293, 14361, 14431, 14455, 14489, 14495, 14496, 14581, 14654, 14730, 14731, 14803, 14844, 14859, 14872, 14946, 15024, 15031, 15064, 15079, 15092, 15151, 15219, 15226, 15227, 15255, 15289, 15327, 15385, 15438, 15507, 15567, 15612, 15651, 15690, 15701, 15702, 15760, 15808, 15885, 15891, 15953, 16017, 16018, 16062, 16107, 16177, 16225, 16226, 16273, 16309, 16365, 16434, 16484, 16485, 16572, 16638, 16639, 16764, 16839, 16885, 16934, 16994, 16995, 17081, 17158, 17187, 17286, 17292, 17293, 17343, 17409, 17443, 17495, 17496, 17529, 17585, 17649, 17707, 17724, 17807, 17869, 17875, 17952, 18008, 18009, 18046, 18074, 18133, 18171, 18203, 18237, 18334, 18350, 18357, 18432, 18492, 18493, 18529, 18549, 18577, 18637, 18695, 18748, 18754, 18821, 18879, 18880, 18911, 18964, 18967, 18968, 19009, 19057, 19101, 19160, 19161, 19194, 19232, 19266, 19343, 19404, 19410, 19411, 19460, 19570, 19595, 19653, 19659, 19732, 19772, 19775, 19776, 19797];
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
    function liteFn$lib$util$release$profileSummary(lite_profile: string): string {
        void lite_profile;
        if (((lite_profile) === ("compiler"))) {
            return "Compiler preview verified across the three-generation fixed-point bootstrap ladder and recorded corpus contracts; native C remains deferred.";
        }
        if (((lite_profile) === ("language"))) {
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
            if (((lite_profile) === ("language"))) {
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
    function liteFn_readOptionalJsonString(lite_source: string, lite_objPos: bigint, lite_key: string): { present: boolean; value: string } {
        void lite_source;
        void lite_objPos;
        void lite_key;
        const lite_field = liteFn$lib$util$json$findObjectField(lite_source, lite_objPos, lite_key);
        void lite_field;
        if ((((!((lite_field).found))) || (liteFn$lib$core$text$startsWithAt(lite_source, (lite_field).valuePos, "null")))) {
            return { present: false, value: "" };
        }
        const lite_str = liteFn$lib$util$json$readStringAt(lite_source, (lite_field).valuePos);
        void lite_str;
        if ((!((lite_str).ok))) {
            return { present: false, value: "" };
        }
        return { present: true, value: (lite_str).value };
    }
    void liteFn_readOptionalJsonString;
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
        if (((lite_outKind) !== ("missing"))) {
            if (((((lite_outKind) !== ("dir"))) || (((liteFn$lib$core$list$listCountText([...(lite$fileListDir(lite_output))])) > (0n))))) {
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
        if (((lite_profile) !== ("tools"))) {
            const lite_dependencies = liteFn$lib$core$path$join(lite_directory, "igniter/node_modules");
            void lite_dependencies;
            if (((lite$fileKind(lite_dependencies)) === ("missing"))) {
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
            if (((lite_profile) === ("language"))) {
                const lite_verifyArgs: string[] = [...([liteFn$lib$core$path$join(lite_source, "bin/lite"), "verify", "--all", "--no-cache"])];
                void lite_verifyArgs;
                liteFn_runChecked(lite_work, lite$processExecPath(), [...(lite_verifyArgs)], lite_source, "");
                lite_bootSupport = "current canonical contracts passed";
            } else {
                lite_bootSupport = "restricted generated-TS subset; consult migration inventory";
            }
            lite_hasBoot = true;
            lite_bootJson = (((((((((((("{\n  \"ladder\": ") + (lite$textSlice(lite_ladderRaw, (lite_ladderSpan).start, (lite_ladderSpan).end, 12415)))) + (",\n  \"corpus\": "))) + (lite$textSlice(lite_corpusRaw, (lite_corpusSpan).start, (lite_corpusSpan).end, 12503)))) + (",\n  \"support\": "))) + (liteFn$lib$util$json$quoteString(lite_bootSupport)))) + ("\n}"));
            const lite_releaseDir = liteFn$lib$core$path$join(lite_source, "release");
            void lite_releaseDir;
            if (((lite$fileKind(lite_releaseDir)) !== ("missing"))) {
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
            if (((lite$fileKind(lite_packager)) === ("missing"))) {
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
        const lite_label = (Boolean(((lite_tag) !== (""))) ? lite_tag : (("snapshot-") + (lite$textSlice(lite_commit, 0n, 12n, 14552))));
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
        if (((lite$fileKind(lite_releaseJsonPath)) !== ("missing"))) {
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
