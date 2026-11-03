declare const process: {
    argv: string[];
    exit(code: number): never;
    getBuiltinModule(name: "node:fs"): {
        readSync(fd: number, buffer: Uint8Array, offset: number, length: number, position: null): number;
        writeSync(fd: number, text: string): number;
    };
};

const lite$intLines: readonly number[] = [0, 12, 25, 54, 73, 92];
const lite$intSource = "cases/language/tour-bindings.lts:";
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
function lite$multiplyInt(left: bigint, right: bigint, at: number): bigint { return lite$checkedInt(left * right, at); }

export function main(lite$write?: (text: string) => void): string {
    let lite_out = "";
    function lite$emit(text: string): void {
        if (lite$write === undefined) lite_out += text;
        else lite$write(text);
    }
    void lite$emit;
    const lite_first = 7n;
    void lite_first;
    const lite_second = 5n;
    void lite_second;
    let lite_total = (lite_first + lite_second);
    void lite_total;
    lite_total = lite$multiplyInt(lite_total, 2n, 68);
    const lite$report0 = (lite_total).toString();
    lite$emit(lite$report0 + "\n");
    return lite_out;
}
