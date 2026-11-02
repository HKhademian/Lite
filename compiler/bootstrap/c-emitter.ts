let lite_out = "";

declare const process: {
    argv: string[];
    exit(code: number): never;
    getBuiltinModule(name: "node:fs"): {
        readFileSync(fd: number, encoding: "utf8"): string;
        writeSync(fd: number, text: string): number;
    };
};

function lite$inputArgs(): string[] {
    return process.argv.slice(2);
}

function lite$inputAll(): string {
    return process.getBuiltinModule("node:fs").readFileSync(0, "utf8");
}

function lite$reportError(text: string): void {
    process.getBuiltinModule("node:fs").writeSync(2, text + "\n");
}

function lite$exit(status: bigint): void {
    process.getBuiltinModule("node:fs").writeSync(1, lite_out);
    process.exit(Number(status));
}

const lite$textCache = new Map<string, readonly string[]>();
function lite$textPoints(text: string): readonly string[] {
    const found = lite$textCache.get(text);
    if (found !== undefined) {
        lite$textCache.delete(text);
        lite$textCache.set(text, found);
        return found;
    }
    const points = Array.from(text);
    lite$textCache.set(text, points);
    if (lite$textCache.size > 8) {
        const oldest = lite$textCache.keys().next();
        if (oldest.done !== true) lite$textCache.delete(oldest.value);
    }
    return points;
}

function lite$textLength(text: string): bigint {
    return BigInt(lite$textPoints(text).length);
}

function lite$textAt(text: string, position: bigint): string {
    const points = lite$textPoints(text);
    if (position < 0n || position >= BigInt(points.length)) {
        throw new Error("BoundPanic: textAt index outside text");
    }
    const value = points[Number(position)];
    if (value === undefined) {
        throw new Error("BoundPanic: textAt index outside text");
    }
    return value;
}

function lite$textSlice(text: string, start: bigint, end: bigint): string {
    const points = lite$textPoints(text);
    if (start < 0n || end < start || end > BigInt(points.length)) {
        throw new Error("BoundPanic: textSlice requires 0 <= start <= end <= textLength(text)");
    }
    return points.slice(Number(start), Number(end)).join("");
}

function lite$listAt<T>(items: readonly T[], index: bigint): T {
    if (index < 0n || index >= BigInt(items.length)) {
        throw new Error("BoundPanic: list index outside its extent");
    }
    const value = items[Number(index)];
    if (value === undefined) {
        throw new Error("BoundPanic: list index outside its extent");
    }
    return value;
}

function lite$listPopBack<T>(items: T[]): T {
    const value = items.pop();
    if (value === undefined) {
        throw new Error("BoundPanic: pop_back on an empty list");
    }
    return value;
}

function lite$divideInt(left: bigint, right: bigint): bigint {
    if (right === 0n) {
        throw new Error("ArithmeticPanic: division by zero in integer expression");
    }
    if (left === -(1n << 63n) && right === -1n) {
        throw new Error("ArithmeticPanic: integer expression outside signed 64-bit range");
    }
    return left / right;
}

function lite$remainderInt(left: bigint, right: bigint): bigint {
    if (right === 0n) {
        throw new Error("ArithmeticPanic: remainder by zero in integer expression");
    }
    if (left === -(1n << 63n) && right === -1n) {
        throw new Error("ArithmeticPanic: integer expression outside signed 64-bit range");
    }
    return left % right;
}

export function main(): string {
    function liteFn_intMin(): bigint {
        return (-9223372036854775808n);
    }
    void liteFn_intMin;
    function liteFn_intMax(): bigint {
        return 9223372036854775807n;
    }
    void liteFn_intMax;
    function liteFn_intAdd(lite_left: bigint, lite_right: bigint): { value: bigint; ok: boolean } {
        void lite_left;
        void lite_right;
        if (((((lite_right) > (0n))) && (((lite_left) > ((liteFn_intMax() - lite_right)))))) {
            return { value: 0n, ok: false };
        }
        if (((((lite_right) < (0n))) && (((lite_left) < ((liteFn_intMin() - lite_right)))))) {
            return { value: 0n, ok: false };
        }
        return { value: (lite_left + lite_right), ok: true };
    }
    void liteFn_intAdd;
    function liteFn_intSubtract(lite_left: bigint, lite_right: bigint): { value: bigint; ok: boolean } {
        void lite_left;
        void lite_right;
        if (((((lite_right) < (0n))) && (((lite_left) > ((liteFn_intMax() + lite_right)))))) {
            return { value: 0n, ok: false };
        }
        if (((((lite_right) > (0n))) && (((lite_left) < ((liteFn_intMin() + lite_right)))))) {
            return { value: 0n, ok: false };
        }
        return { value: (lite_left - lite_right), ok: true };
    }
    void liteFn_intSubtract;
    function liteFn_intMultiply(lite_left: bigint, lite_right: bigint): { value: bigint; ok: boolean } {
        void lite_left;
        void lite_right;
        if (((((lite_left) === (0n))) || (((lite_right) === (0n))))) {
            return { value: 0n, ok: true };
        }
        if (((lite_left) > (0n))) {
            if (((lite_right) > (0n))) {
                if (((lite_left) > (lite$divideInt(liteFn_intMax(), lite_right)))) {
                    return { value: 0n, ok: false };
                }
            } else if (((lite_right) < (lite$divideInt(liteFn_intMin(), lite_left)))) {
                return { value: 0n, ok: false };
            }
        } else if (((lite_right) > (0n))) {
            if (((lite_left) < (lite$divideInt(liteFn_intMin(), lite_right)))) {
                return { value: 0n, ok: false };
            }
        } else if (((lite_right) < (lite$divideInt(liteFn_intMax(), lite_left)))) {
            return { value: 0n, ok: false };
        }
        return { value: (lite_left * lite_right), ok: true };
    }
    void liteFn_intMultiply;
    function liteFn_intDivide(lite_left: bigint, lite_right: bigint): { value: bigint; ok: boolean } {
        void lite_left;
        void lite_right;
        if (((lite_right) === (0n))) {
            return { value: 0n, ok: false };
        }
        if (((((lite_left) === (liteFn_intMin()))) && (((lite_right) === ((-1n)))))) {
            return { value: 0n, ok: false };
        }
        return { value: lite$divideInt(lite_left, lite_right), ok: true };
    }
    void liteFn_intDivide;
    function liteFn_intRemainder(lite_left: bigint, lite_right: bigint): { value: bigint; ok: boolean } {
        void lite_left;
        void lite_right;
        if (((lite_right) === (0n))) {
            return { value: 0n, ok: false };
        }
        if (((((lite_left) === (liteFn_intMin()))) && (((lite_right) === ((-1n)))))) {
            return { value: 0n, ok: false };
        }
        return { value: lite$remainderInt(lite_left, lite_right), ok: true };
    }
    void liteFn_intRemainder;
    function liteFn_intFloorDivide(lite_left: bigint, lite_right: bigint): { value: bigint; ok: boolean } {
        void lite_left;
        void lite_right;
        if (((lite_right) === (0n))) {
            return { value: 0n, ok: false };
        }
        if (((((lite_left) === (liteFn_intMin()))) && (((lite_right) === ((-1n)))))) {
            return { value: 0n, ok: false };
        }
        const lite_quotient = lite$divideInt(lite_left, lite_right);
        void lite_quotient;
        return (Boolean(((((lite$remainderInt(lite_left, lite_right)) !== (0n))) && ((Boolean((((lite_left) < (0n)))) !== Boolean((((lite_right) < (0n)))))))) ? { value: (lite_quotient - 1n), ok: true } : { value: lite_quotient, ok: true });
    }
    void liteFn_intFloorDivide;
    function liteFn_intFloorModulo(lite_left: bigint, lite_right: bigint): { value: bigint; ok: boolean } {
        void lite_left;
        void lite_right;
        if (((lite_right) === (0n))) {
            return { value: 0n, ok: false };
        }
        const lite_remainder = lite$remainderInt(lite_left, lite_right);
        void lite_remainder;
        return (Boolean(((((lite_remainder) !== (0n))) && ((Boolean((((lite_remainder) < (0n)))) !== Boolean((((lite_right) < (0n)))))))) ? { value: (lite_remainder + lite_right), ok: true } : { value: lite_remainder, ok: true });
    }
    void liteFn_intFloorModulo;
    function liteFn_intNegate(lite_value: bigint): { value: bigint; ok: boolean } {
        void lite_value;
        if (((lite_value) === (liteFn_intMin()))) {
            return { value: 0n, ok: false };
        }
        return { value: (0n - lite_value), ok: true };
    }
    void liteFn_intNegate;
    function liteFn_intText(lite_value: bigint): string {
        void lite_value;
        if (((lite_value) === (0n))) {
            return "0";
        }
        if (((lite_value) === (liteFn_intMin()))) {
            return "-9223372036854775808";
        }
        if (((lite_value) < (0n))) {
            return (("-") + (liteFn_intText((0n - lite_value))));
        }
        let lite_remaining = lite_value;
        void lite_remaining;
        let lite_digits = "";
        void lite_digits;
        while (((lite_remaining) > (0n))) {
            const lite_digit = lite$remainderInt(lite_remaining, 10n);
            void lite_digit;
            lite_digits = ((lite$textAt("0123456789", lite_digit)) + (lite_digits));
            lite_remaining = lite$divideInt(lite_remaining, 10n);
        }
        return lite_digits;
    }
    void liteFn_intText;
    function liteFn_isDigit(lite_text: string): boolean {
        void lite_text;
        return ((((((((((((((((((((lite_text) === ("0"))) || (((lite_text) === ("1"))))) || (((lite_text) === ("2"))))) || (((lite_text) === ("3"))))) || (((lite_text) === ("4"))))) || (((lite_text) === ("5"))))) || (((lite_text) === ("6"))))) || (((lite_text) === ("7"))))) || (((lite_text) === ("8"))))) || (((lite_text) === ("9"))));
    }
    void liteFn_isDigit;
    function liteFn_digitValue(lite_text: string): bigint {
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
    void liteFn_digitValue;
    function liteFn_isAsciiLetter(lite_ch: string): boolean {
        void lite_ch;
        const lite_letters = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
        void lite_letters;
        const lite_size = lite$textLength(lite_letters);
        void lite_size;
        let lite_position = 0n;
        void lite_position;
        while (((lite_position) < (lite_size))) {
            if (((lite$textAt(lite_letters, lite_position)) === (lite_ch))) {
                return true;
            }
            lite_position = (lite_position + 1n);
        }
        return false;
    }
    void liteFn_isAsciiLetter;
    function liteFn_isNameStart(lite_ch: string): boolean {
        void lite_ch;
        return ((liteFn_isAsciiLetter(lite_ch)) || (((lite_ch) === ("_"))));
    }
    void liteFn_isNameStart;
    function liteFn_isNameContinue(lite_ch: string): boolean {
        void lite_ch;
        return ((liteFn_isNameStart(lite_ch)) || (liteFn_isDigit(lite_ch)));
    }
    void liteFn_isNameContinue;
    function liteFn_skipSpaces(lite_source: string, lite_start: bigint): bigint {
        void lite_source;
        void lite_start;
        const lite_size = lite$textLength(lite_source);
        void lite_size;
        let lite_position = lite_start;
        void lite_position;
        while (((((lite_position) < (lite_size))) && ((((((((((lite$textAt(lite_source, lite_position)) === (" "))) || (((lite$textAt(lite_source, lite_position)) === ("\t"))))) || (((lite$textAt(lite_source, lite_position)) === ("\r"))))) || (((lite$textAt(lite_source, lite_position)) === ("\n")))))))) {
            lite_position = (lite_position + 1n);
        }
        return lite_position;
    }
    void liteFn_skipSpaces;
    function liteFn_skipName(lite_source: string, lite_start: bigint): bigint {
        void lite_source;
        void lite_start;
        const lite_size = lite$textLength(lite_source);
        void lite_size;
        let lite_position = lite_start;
        void lite_position;
        while (((((lite_position) < (lite_size))) && (liteFn_isNameContinue(lite$textAt(lite_source, lite_position))))) {
            lite_position = (lite_position + 1n);
        }
        return lite_position;
    }
    void liteFn_skipName;
    function liteFn_startsWithAt(lite_source: string, lite_position: bigint, lite_text: string): boolean {
        void lite_source;
        void lite_position;
        void lite_text;
        const lite_width = lite$textLength(lite_text);
        void lite_width;
        if (((((lite_position) < (0n))) || ((((lite_position + lite_width)) > (lite$textLength(lite_source)))))) {
            return false;
        }
        return ((lite$textSlice(lite_source, lite_position, (lite_position + lite_width))) === (lite_text));
    }
    void liteFn_startsWithAt;
    function liteFn_wordAt(lite_source: string, lite_position: bigint, lite_word: string): boolean {
        void lite_source;
        void lite_position;
        void lite_word;
        if ((!(liteFn_startsWithAt(lite_source, lite_position, lite_word)))) {
            return false;
        }
        const lite_after = (lite_position + lite$textLength(lite_word));
        void lite_after;
        return ((((lite_after) >= (lite$textLength(lite_source)))) || ((!(liteFn_isNameContinue(lite$textAt(lite_source, lite_after))))));
    }
    void liteFn_wordAt;
    function liteFn_indexOfText(lite_source: string, lite_needle: string, lite_start: bigint): bigint {
        void lite_source;
        void lite_needle;
        void lite_start;
        const lite_size = lite$textLength(lite_source);
        void lite_size;
        const lite_width = lite$textLength(lite_needle);
        void lite_width;
        let lite_position = lite_start;
        void lite_position;
        if (((((lite_position) < (0n))) || (((lite_position) > (lite_size))))) {
            return (-1n);
        }
        if (((lite_width) === (0n))) {
            return lite_position;
        }
        while ((((lite_position + lite_width)) <= (lite_size))) {
            if (liteFn_startsWithAt(lite_source, lite_position, lite_needle)) {
                return lite_position;
            }
            lite_position = (lite_position + 1n);
        }
        return (-1n);
    }
    void liteFn_indexOfText;
    function liteFn_joinTexts(lite_values: string[], lite_separator: string): string {
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
    void liteFn_joinTexts;
    function liteFn_textToInt(lite_text: string): { value: bigint; ok: boolean } {
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
        if (((lite$textAt(lite_text, 0n)) === ("-"))) {
            lite_negative = true;
            lite_position = 1n;
        } else if (((lite$textAt(lite_text, 0n)) === ("+"))) {
            lite_position = 1n;
        }
        if (((lite_position) >= (lite_size))) {
            return { value: 0n, ok: false };
        }
        let lite_value = 0n;
        void lite_value;
        while (((lite_position) < (lite_size))) {
            const lite_ch = lite$textAt(lite_text, lite_position);
            void lite_ch;
            if ((!(liteFn_isDigit(lite_ch)))) {
                return { value: 0n, ok: false };
            }
            const lite_digit = liteFn_digitValue(lite_ch);
            void lite_digit;
            if (lite_negative) {
                if (((lite_value) < (lite$divideInt(((liteFn_intMin() + lite_digit)), 10n)))) {
                    return { value: 0n, ok: false };
                }
                lite_value = ((lite_value * 10n) - lite_digit);
            } else {
                if (((lite_value) > (lite$divideInt(((liteFn_intMax() - lite_digit)), 10n)))) {
                    return { value: 0n, ok: false };
                }
                lite_value = ((lite_value * 10n) + lite_digit);
            }
            lite_position = (lite_position + 1n);
        }
        return { value: lite_value, ok: true };
    }
    void liteFn_textToInt;
    function liteFn_clampPosition(lite_source: string, lite_position: bigint): bigint {
        void lite_source;
        void lite_position;
        const lite_size = lite$textLength(lite_source);
        void lite_size;
        if (((lite_position) < (0n))) {
            return 0n;
        }
        if (((lite_position) > (lite_size))) {
            return lite_size;
        }
        return lite_position;
    }
    void liteFn_clampPosition;
    function liteFn_lineColumn(lite_source: string, lite_position: bigint): { line: bigint; column: bigint } {
        void lite_source;
        void lite_position;
        const lite_cursor = liteFn_clampPosition(lite_source, lite_position);
        void lite_cursor;
        let lite_line = 1n;
        void lite_line;
        let lite_lineStart = 0n;
        void lite_lineStart;
        let lite_index = 0n;
        void lite_index;
        while (((lite_index) < (lite_cursor))) {
            if (((lite$textAt(lite_source, lite_index)) === ("\n"))) {
                lite_line = (lite_line + 1n);
                lite_lineStart = (lite_index + 1n);
            }
            lite_index = (lite_index + 1n);
        }
        return { line: lite_line, column: ((lite_cursor - lite_lineStart) + 1n) };
    }
    void liteFn_lineColumn;
    function liteFn_lineCount(lite_source: string): bigint {
        void lite_source;
        const lite_size = lite$textLength(lite_source);
        void lite_size;
        let lite_count = 1n;
        void lite_count;
        let lite_index = 0n;
        void lite_index;
        while (((lite_index) < (lite_size))) {
            if (((lite$textAt(lite_source, lite_index)) === ("\n"))) {
                lite_count = (lite_count + 1n);
            }
            lite_index = (lite_index + 1n);
        }
        return lite_count;
    }
    void liteFn_lineCount;
    function liteFn_lineStartOffset(lite_source: string, lite_line: bigint): bigint {
        void lite_source;
        void lite_line;
        const lite_size = lite$textLength(lite_source);
        void lite_size;
        if (((lite_line) <= (1n))) {
            return 0n;
        }
        let lite_current = 2n;
        void lite_current;
        let lite_index = 0n;
        void lite_index;
        while (((lite_index) < (lite_size))) {
            if (((lite$textAt(lite_source, lite_index)) === ("\n"))) {
                if (((lite_current) === (lite_line))) {
                    return (lite_index + 1n);
                }
                lite_current = (lite_current + 1n);
            }
            lite_index = (lite_index + 1n);
        }
        return lite_size;
    }
    void liteFn_lineStartOffset;
    function liteFn_lineEndOffset(lite_source: string, lite_line: bigint): bigint {
        void lite_source;
        void lite_line;
        const lite_size = lite$textLength(lite_source);
        void lite_size;
        const lite_start = liteFn_lineStartOffset(lite_source, lite_line);
        void lite_start;
        let lite_index = lite_start;
        void lite_index;
        while (((((lite_index) < (lite_size))) && (((lite$textAt(lite_source, lite_index)) !== ("\n"))))) {
            lite_index = (lite_index + 1n);
        }
        return lite_index;
    }
    void liteFn_lineEndOffset;
    function liteFn_diagnosticExit(): bigint {
        return 2n;
    }
    void liteFn_diagnosticExit;
    const lite_sourceErrorCategory = "SourceError";
    void lite_sourceErrorCategory;
    const lite_typeErrorCategory = "TypeError";
    void lite_typeErrorCategory;
    function liteFn_fail(lite_prefix: string, lite_message: string): void {
        void lite_prefix;
        void lite_message;
        if (((lite_prefix) === (""))) {
            lite$reportError(lite_message);
        } else {
            lite$reportError(((((lite_prefix) + (":"))) + (lite_message)));
        }
        lite$exit(liteFn_diagnosticExit());
    }
    void liteFn_fail;
    function liteFn_expect(lite_prefix: string, lite_condition: boolean, lite_message: string): void {
        void lite_prefix;
        void lite_condition;
        void lite_message;
        if ((!(lite_condition))) {
            liteFn_fail(lite_prefix, lite_message);
        } else {
        }
    }
    void liteFn_expect;
    function liteFn_decimalText(lite_value: bigint): string {
        void lite_value;
        return liteFn_intText(lite_value);
    }
    void liteFn_decimalText;
    function liteFn_padLeftText(lite_value: string, lite_width: bigint): string {
        void lite_value;
        void lite_width;
        const lite_size = lite$textLength(lite_value);
        void lite_size;
        let lite_result = lite_value;
        void lite_result;
        let lite_index = lite_size;
        void lite_index;
        while (((lite_index) < (lite_width))) {
            lite_result = ((" ") + (lite_result));
            lite_index = (lite_index + 1n);
        }
        return lite_result;
    }
    void liteFn_padLeftText;
    function liteFn_padRightText(lite_value: string, lite_width: bigint): string {
        void lite_value;
        void lite_width;
        const lite_size = lite$textLength(lite_value);
        void lite_size;
        let lite_result = lite_value;
        void lite_result;
        let lite_index = lite_size;
        void lite_index;
        while (((lite_index) < (lite_width))) {
            lite_result = ((lite_result) + (" "));
            lite_index = (lite_index + 1n);
        }
        return lite_result;
    }
    void liteFn_padRightText;
    function liteFn_padLeftInt(lite_value: bigint, lite_width: bigint): string {
        void lite_value;
        void lite_width;
        return liteFn_padLeftText(liteFn_intText(lite_value), lite_width);
    }
    void liteFn_padLeftInt;
    function liteFn_padRightInt(lite_value: bigint, lite_width: bigint): string {
        void lite_value;
        void lite_width;
        return liteFn_padRightText(liteFn_intText(lite_value), lite_width);
    }
    void liteFn_padRightInt;
    function liteFn_joinIntTexts(lite_values: bigint[], lite_separator: string): string {
        void lite_values;
        void lite_separator;
        let lite_result = "";
        void lite_result;
        let lite_first = true;
        void lite_first;
        for (const lite_value of [...(lite_values)]) {
            void lite_value;
            if (lite_first) {
                lite_result = liteFn_intText(lite_value);
                lite_first = false;
            } else {
                lite_result = ((((lite_result) + (lite_separator))) + (liteFn_intText(lite_value)));
            }
        }
        return lite_result;
    }
    void liteFn_joinIntTexts;
    function liteFn_listIndexOfText(lite_values: string[], lite_target: string): bigint {
        void lite_values;
        void lite_target;
        let lite_index = 0n;
        void lite_index;
        for (const lite_value of [...(lite_values)]) {
            void lite_value;
            if (((lite_value) === (lite_target))) {
                return lite_index;
            }
            lite_index = (lite_index + 1n);
        }
        return (-1n);
    }
    void liteFn_listIndexOfText;
    function liteFn_listContainsText(lite_values: string[], lite_target: string): boolean {
        void lite_values;
        void lite_target;
        return ((liteFn_listIndexOfText([...(lite_values)], lite_target)) >= (0n));
    }
    void liteFn_listContainsText;
    function liteFn_listIndexOfInt(lite_values: bigint[], lite_target: bigint): bigint {
        void lite_values;
        void lite_target;
        let lite_index = 0n;
        void lite_index;
        for (const lite_value of [...(lite_values)]) {
            void lite_value;
            if (((lite_value) === (lite_target))) {
                return lite_index;
            }
            lite_index = (lite_index + 1n);
        }
        return (-1n);
    }
    void liteFn_listIndexOfInt;
    function liteFn_listContainsInt(lite_values: bigint[], lite_target: bigint): boolean {
        void lite_values;
        void lite_target;
        return ((liteFn_listIndexOfInt([...(lite_values)], lite_target)) >= (0n));
    }
    void liteFn_listContainsInt;
    function liteFn_listIndexOfBool(lite_values: boolean[], lite_target: boolean): bigint {
        void lite_values;
        void lite_target;
        let lite_index = 0n;
        void lite_index;
        for (const lite_value of [...(lite_values)]) {
            void lite_value;
            if ((Boolean(lite_value) === Boolean(lite_target))) {
                return lite_index;
            }
            lite_index = (lite_index + 1n);
        }
        return (-1n);
    }
    void liteFn_listIndexOfBool;
    function liteFn_listContainsBool(lite_values: boolean[], lite_target: boolean): boolean {
        void lite_values;
        void lite_target;
        return ((liteFn_listIndexOfBool([...(lite_values)], lite_target)) >= (0n));
    }
    void liteFn_listContainsBool;
    function liteFn_intLiteralCode(lite_value: bigint, lite_negative: boolean, lite_digits: string): string {
        void lite_value;
        void lite_negative;
        void lite_digits;
        return (Boolean(((lite_value) === ((-9223372036854775808n)))) ? "INT64_MIN" : (Boolean(((lite_value) === (0n))) ? "INT64_C(0)" : (Boolean(lite_negative) ? (((("(-INT64_C(") + (lite_digits))) + ("))")) : (((("INT64_C(") + (lite_digits))) + (")")))));
    }
    void liteFn_intLiteralCode;
    function liteFn_textLiteralCode(lite_value: string): string {
        void lite_value;
        const lite_size = lite$textLength(lite_value);
        void lite_size;
        let lite_encoded = "\"";
        void lite_encoded;
        let lite_position = 0n;
        void lite_position;
        while (((lite_position) < (lite_size))) {
            const lite_ch = lite$textAt(lite_value, lite_position);
            void lite_ch;
            if (((lite_ch) === ("\\"))) {
                lite_encoded = ((lite_encoded) + ("\\\\"));
            } else if (((lite_ch) === ("\""))) {
                lite_encoded = ((lite_encoded) + ("\\\""));
            } else if (((lite_ch) === ("?"))) {
                lite_encoded = ((lite_encoded) + ("\\?"));
            } else if (((lite_ch) === ("\n"))) {
                lite_encoded = ((lite_encoded) + ("\\n"));
            } else if (((lite_ch) === ("\r"))) {
                lite_encoded = ((lite_encoded) + ("\\r"));
            } else if (((lite_ch) === ("\t"))) {
                lite_encoded = ((lite_encoded) + ("\\t"));
            } else {
                lite_encoded = ((lite_encoded) + (lite_ch));
            }
            lite_position = (lite_position + 1n);
        }
        return ((lite_encoded) + ("\""));
    }
    void liteFn_textLiteralCode;
    function liteFn_boolLiteralCode(lite_value: boolean): string {
        void lite_value;
        return (Boolean(lite_value) ? "true" : "false");
    }
    void liteFn_boolLiteralCode;
    function liteFn_listCopyCode(lite_code: string): string {
        void lite_code;
        liteFn_fail("", "C backend does not support list values yet");
        return lite_code;
    }
    void liteFn_listCopyCode;
    function liteFn_concatCode(lite_left: string, lite_right: string): string {
        void lite_left;
        void lite_right;
        return (((((((("lite_concat(") + (lite_left))) + (", "))) + (lite_right))) + (")"));
    }
    void liteFn_concatCode;
    function liteFn_notCode(lite_value: string): string {
        void lite_value;
        return (((("(!(") + (lite_value))) + ("))"));
    }
    void liteFn_notCode;
    function liteFn_logicCode(lite_op: string, lite_left: string, lite_right: string): string {
        void lite_op;
        void lite_left;
        void lite_right;
        return (Boolean(((lite_op) === ("and"))) ? (((((((("((") + (lite_left))) + (") && ("))) + (lite_right))) + ("))")) : (((((((("((") + (lite_left))) + (") || ("))) + (lite_right))) + ("))")));
    }
    void liteFn_logicCode;
    function liteFn_comparisonCode(lite_op: string, lite_kind: string, lite_left: string, lite_right: string): string {
        void lite_op;
        void lite_kind;
        void lite_left;
        void lite_right;
        if (((lite_kind) === ("String"))) {
            return (Boolean(((lite_op) === ("=="))) ? (((((((("strcmp(") + (lite_left))) + (", "))) + (lite_right))) + (") == 0")) : (((((((("strcmp(") + (lite_left))) + (", "))) + (lite_right))) + (") != 0")));
        } else {
            const lite_operator = (Boolean(((lite_op) === ("=="))) ? "==" : (Boolean(((lite_op) === ("=!="))) ? "!=" : (Boolean(((lite_op) === ("<"))) ? "<" : (Boolean(((lite_op) === ("<!"))) ? ">=" : (Boolean(((lite_op) === ("<="))) ? "<=" : (Boolean(((lite_op) === ("<!="))) ? ">" : (Boolean(((lite_op) === (">"))) ? ">" : (Boolean(((lite_op) === (">!"))) ? "<=" : (Boolean(((lite_op) === (">="))) ? ">=" : "<")))))))));
            void lite_operator;
            return (((((((((((("(") + (lite_left))) + (") "))) + (lite_operator))) + (" ("))) + (lite_right))) + (")"));
        }
    }
    void liteFn_comparisonCode;
    function liteFn_floorDivCode(lite_left: string, lite_right: string): string {
        void lite_left;
        void lite_right;
        return (((((((((((((((((((((((((((("(") + (lite_left))) + (" / "))) + (lite_right))) + (" - (((("))) + (lite_left))) + (" % "))) + (lite_right))) + (") != 0) && ((("))) + (lite_left))) + (" % "))) + (lite_right))) + (") < 0) != ("))) + (lite_right))) + (" < 0))) ? 1 : 0))"));
    }
    void liteFn_floorDivCode;
    function liteFn_floorModCode(lite_left: string, lite_right: string): string {
        void lite_left;
        void lite_right;
        return (((((((((((((((((((((((((((((((("(") + (lite_left))) + (" % "))) + (lite_right))) + (" + (((("))) + (lite_left))) + (" % "))) + (lite_right))) + (") != 0) && ((("))) + (lite_left))) + (" % "))) + (lite_right))) + (") < 0) != ("))) + (lite_right))) + (" < 0))) ? "))) + (lite_right))) + (" : 0))"));
    }
    void liteFn_floorModCode;
    function liteFn_intDivideCode(lite_left: string, lite_right: string): string {
        void lite_left;
        void lite_right;
        return (((((((("lite_divide_int(") + (lite_left))) + (", "))) + (lite_right))) + (")"));
    }
    void liteFn_intDivideCode;
    function liteFn_intRemainderCode(lite_left: string, lite_right: string): string {
        void lite_left;
        void lite_right;
        return (((((((("lite_remainder_int(") + (lite_left))) + (", "))) + (lite_right))) + (")"));
    }
    void liteFn_intRemainderCode;
    function liteFn_intFloorDivideCode(lite_left: string, lite_right: string): string {
        void lite_left;
        void lite_right;
        return (((((((("lite_floor_divide_int(") + (lite_left))) + (", "))) + (lite_right))) + (")"));
    }
    void liteFn_intFloorDivideCode;
    function liteFn_intFloorModuloCode(lite_left: string, lite_right: string): string {
        void lite_left;
        void lite_right;
        return (((((((("lite_floor_modulo_int(") + (lite_left))) + (", "))) + (lite_right))) + (")"));
    }
    void liteFn_intFloorModuloCode;
    function liteFn_failAt(lite_source: string, lite_position: bigint, lite_prefix: string, lite_message: string): void {
        void lite_source;
        void lite_position;
        void lite_prefix;
        void lite_message;
        const lite_place = liteFn_lineColumn(lite_source, lite_position);
        void lite_place;
        liteFn_fail(lite_prefix, ((((((((liteFn_decimalText((lite_place).line)) + (":"))) + (liteFn_decimalText((lite_place).column)))) + (": "))) + (lite_message)));
    }
    void liteFn_failAt;
    function liteFn_expectSymbol(lite_source: string, lite_position: bigint, lite_symbol: string, lite_prefix: string): bigint {
        void lite_source;
        void lite_position;
        void lite_symbol;
        void lite_prefix;
        if (((((lite_position) >= (lite$textLength(lite_source)))) || (((lite$textAt(lite_source, lite_position)) !== (lite_symbol))))) {
            liteFn_failAt(lite_source, lite_position, lite_prefix, (("expected ") + (lite_symbol)));
        }
        return (lite_position + 1n);
    }
    void liteFn_expectSymbol;
    function liteFn_rawFenceLength(lite_source: string, lite_position: bigint): bigint {
        void lite_source;
        void lite_position;
        if ((!(liteFn_startsWithAt(lite_source, lite_position, "/*")))) {
            return 0n;
        }
        let lite_index = (lite_position + 2n);
        void lite_index;
        let lite_count = 0n;
        void lite_count;
        while (((((lite_index) < (lite$textLength(lite_source)))) && (((lite$textAt(lite_source, lite_index)) === ("#"))))) {
            lite_count = (lite_count + 1n);
            lite_index = (lite_index + 1n);
        }
        return lite_count;
    }
    void liteFn_rawFenceLength;
    function liteFn_skipRawComment(lite_source: string, lite_position: bigint, lite_fence: bigint, lite_prefix: string): bigint {
        void lite_source;
        void lite_position;
        void lite_fence;
        void lite_prefix;
        const lite_size = lite$textLength(lite_source);
        void lite_size;
        let lite_cursor = ((lite_position + 2n) + lite_fence);
        void lite_cursor;
        while (((lite_cursor) < (lite_size))) {
            if (((lite$textAt(lite_source, lite_cursor)) === ("#"))) {
                const lite_runStart = lite_cursor;
                void lite_runStart;
                let lite_runEnd = lite_cursor;
                void lite_runEnd;
                while (((((lite_runEnd) < (lite_size))) && (((lite$textAt(lite_source, lite_runEnd)) === ("#"))))) {
                    lite_runEnd = (lite_runEnd + 1n);
                }
                if ((((((lite_runEnd - lite_runStart)) === (lite_fence))) && (liteFn_startsWithAt(lite_source, lite_runEnd, "*/")))) {
                    return (lite_runEnd + 2n);
                }
                lite_cursor = lite_runEnd;
            } else {
                lite_cursor = (lite_cursor + 1n);
            }
        }
        liteFn_failAt(lite_source, lite_position, lite_prefix, "unterminated raw comment");
        return lite_size;
    }
    void liteFn_skipRawComment;
    function liteFn_skipComment(lite_source: string, lite_position: bigint, lite_prefix: string): bigint {
        void lite_source;
        void lite_position;
        void lite_prefix;
        const lite_size = lite$textLength(lite_source);
        void lite_size;
        const lite_fence = liteFn_rawFenceLength(lite_source, lite_position);
        void lite_fence;
        if (((lite_fence) > (0n))) {
            return liteFn_skipRawComment(lite_source, lite_position, lite_fence, lite_prefix);
        }
        let lite_cursor = (lite_position + 2n);
        void lite_cursor;
        let lite_depth = 1n;
        void lite_depth;
        while (Boolean(true)) {
            if (((lite_cursor) >= (lite_size))) {
                liteFn_failAt(lite_source, lite_position, lite_prefix, "unterminated comment");
            }
            if (liteFn_startsWithAt(lite_source, lite_cursor, "/*")) {
                const lite_innerFence = liteFn_rawFenceLength(lite_source, lite_cursor);
                void lite_innerFence;
                if (((lite_innerFence) > (0n))) {
                    lite_cursor = liteFn_skipRawComment(lite_source, lite_cursor, lite_innerFence, lite_prefix);
                } else {
                    lite_depth = (lite_depth + 1n);
                    lite_cursor = (lite_cursor + 2n);
                }
            } else if (liteFn_startsWithAt(lite_source, lite_cursor, "*/")) {
                lite_depth = (lite_depth - 1n);
                lite_cursor = (lite_cursor + 2n);
                if (((lite_depth) === (0n))) {
                    return lite_cursor;
                }
            } else {
                lite_cursor = (lite_cursor + 1n);
            }
        }
        return lite_size;
    }
    void liteFn_skipComment;
    function liteFn_skipTrivia(lite_source: string, lite_start: bigint, lite_prefix: string): bigint {
        void lite_source;
        void lite_start;
        void lite_prefix;
        const lite_size = lite$textLength(lite_source);
        void lite_size;
        let lite_position = lite_start;
        void lite_position;
        while (((lite_position) < (lite_size))) {
            const lite_ch = lite$textAt(lite_source, lite_position);
            void lite_ch;
            if (((((((((lite_ch) === (" "))) || (((lite_ch) === ("\t"))))) || (((lite_ch) === ("\r"))))) || (((lite_ch) === ("\n"))))) {
                lite_position = (lite_position + 1n);
            } else if (liteFn_startsWithAt(lite_source, lite_position, "/*")) {
                lite_position = liteFn_skipComment(lite_source, lite_position, lite_prefix);
            } else {
                break;
            }
        }
        return lite_position;
    }
    void liteFn_skipTrivia;
    function liteFn_isReservedWord(lite_name: string): boolean {
        void lite_name;
        return ((((((((((((((((((((((((((((((((((((((((((lite_name) === ("var"))) || (((lite_name) === ("mut"))))) || (((lite_name) === ("fn"))))) || (((lite_name) === ("loop"))))) || (((lite_name) === ("break"))))) || (((lite_name) === ("continue"))))) || (((lite_name) === ("return"))))) || (((lite_name) === ("if"))))) || (((lite_name) === ("else"))))) || (((lite_name) === ("then"))))) || (((lite_name) === ("finally"))))) || (((lite_name) === ("match"))))) || (((lite_name) === ("import"))))) || (((lite_name) === ("using"))))) || (((lite_name) === ("record"))))) || (((lite_name) === ("type"))))) || (((lite_name) === ("and"))))) || (((lite_name) === ("or"))))) || (((lite_name) === ("not"))))) || (((lite_name) === ("true"))))) || (((lite_name) === ("false"))));
    }
    void liteFn_isReservedWord;
    function liteFn_featureDoc(lite_name: string): string {
        void lite_name;
        return (Boolean(((lite_name) === ("loop"))) ? "docs/loops.md" : (Boolean(((((((((((((((lite_name) === ("if"))) || (((lite_name) === ("else"))))) || (((lite_name) === ("and"))))) || (((lite_name) === ("or"))))) || (((lite_name) === ("not"))))) || (((lite_name) === ("true"))))) || (((lite_name) === ("false"))))) ? "docs/conditionals.md" : (Boolean(((((lite_name) === ("var"))) || (((lite_name) === ("mut"))))) ? "docs/declarations-and-assignment.md" : (Boolean(((((lite_name) === ("fn"))) || (((lite_name) === ("return"))))) ? "docs/functions.md" : (Boolean(((lite_name) === ("match"))) ? "docs/match.md" : (Boolean(((((lite_name) === ("import"))) || (((lite_name) === ("using"))))) ? "docs/modules-and-packages.md" : (Boolean(((((lite_name) === ("record"))) || (((lite_name) === ("type"))))) ? "docs/types-and-inference.md" : (Boolean(((((lite_name) === ("break"))) || (((lite_name) === ("continue"))))) ? "docs/control-flow.md" : (Boolean(((((lite_name) === ("then"))) || (((lite_name) === ("finally"))))) ? "docs/finally.md" : "docs/grammar-sketch.md")))))))));
    }
    void liteFn_featureDoc;
    function liteFn_unsupportedFeature(lite_source: string, lite_position: bigint, lite_name: string, lite_prefix: string): void {
        void lite_source;
        void lite_position;
        void lite_name;
        void lite_prefix;
        liteFn_failAt(lite_source, lite_position, lite_prefix, (((((((("unsupported feature \"") + (lite_name))) + ("\": see "))) + (liteFn_featureDoc(lite_name)))) + ("; the restricted compiler accepts Int/String/Bool expressions, locals, report, if/else and loop only")));
    }
    void liteFn_unsupportedFeature;
    function liteFn_findFunction(lite_functions: { name: string; result: string; first: bigint; count: bigint }[], lite_name: string): bigint {
        void lite_functions;
        void lite_name;
        let lite_index = 0n;
        void lite_index;
        for (const lite_entry of [...(lite_functions)]) {
            void lite_entry;
            if ((((lite_entry).name) === (lite_name))) {
                return lite_index;
            }
            lite_index = (lite_index + 1n);
        }
        return (-1n);
    }
    void liteFn_findFunction;
    function liteFn_isUnsupportedAliasTarget(lite_name: string): boolean {
        void lite_name;
        return ((((((((((((((((lite_name) === ("List"))) || (((lite_name) === ("Float"))))) || (((lite_name) === ("Double"))))) || (((lite_name) === ("Array"))))) || (((lite_name) === ("Option"))))) || (((lite_name) === ("Result"))))) || (((lite_name) === ("record"))))) || (((lite_name) === ("fn"))));
    }
    void liteFn_isUnsupportedAliasTarget;
    function liteFn_unsupportedAliasTarget(lite_source: string, lite_position: bigint, lite_prefix: string, lite_target: string): void {
        void lite_source;
        void lite_position;
        void lite_prefix;
        void lite_target;
        liteFn_failAt(lite_source, lite_position, lite_prefix, (((("unsupported type alias ") + (lite_target))) + ("; only Int, String, Bool, Unit, List<T>, flat named tuples and aliases are supported")));
    }
    void liteFn_unsupportedAliasTarget;
    function liteFn_findAlias(lite_aliases: { name: string; target: string; at: bigint; end: bigint }[], lite_name: string): bigint {
        void lite_aliases;
        void lite_name;
        let lite_index = 0n;
        void lite_index;
        for (const lite_alias of [...(lite_aliases)]) {
            void lite_alias;
            if ((((lite_alias).name) === (lite_name))) {
                return lite_index;
            }
            lite_index = (lite_index + 1n);
        }
        return (-1n);
    }
    void liteFn_findAlias;
    function liteFn_aliasIndexAt(lite_aliases: { name: string; target: string; at: bigint; end: bigint }[], lite_position: bigint): bigint {
        void lite_aliases;
        void lite_position;
        let lite_index = 0n;
        void lite_index;
        for (const lite_alias of [...(lite_aliases)]) {
            void lite_alias;
            if ((((lite_alias).at) === (lite_position))) {
                return lite_index;
            }
            lite_index = (lite_index + 1n);
        }
        return (-1n);
    }
    void liteFn_aliasIndexAt;
    function liteFn_isTupleKind(lite_kind: string): boolean {
        void lite_kind;
        return ((((lite$textLength(lite_kind)) > (0n))) && (((lite$textAt(lite_kind, 0n)) === ("("))));
    }
    void liteFn_isTupleKind;
    function liteFn_isListKind(lite_kind: string): boolean {
        void lite_kind;
        return ((((((lite$textLength(lite_kind)) > (5n))) && (liteFn_startsWithAt(lite_kind, 0n, "List<")))) && (((lite$textAt(lite_kind, (lite$textLength(lite_kind) - 1n))) === (">"))));
    }
    void liteFn_isListKind;
    function liteFn_listElementKind(lite_kind: string): string {
        void lite_kind;
        if ((!(liteFn_isListKind(lite_kind)))) {
            return "";
        }
        return lite$textSlice(lite_kind, 5n, (lite$textLength(lite_kind) - 1n));
    }
    void liteFn_listElementKind;
    function liteFn_codeUsesTextCall(lite_code: string, lite_needle: string): boolean {
        void lite_code;
        void lite_needle;
        const lite_size = lite$textLength(lite_code);
        void lite_size;
        let lite_cursor = 0n;
        void lite_cursor;
        while (((lite_cursor) < (lite_size))) {
            const lite_ch = lite$textAt(lite_code, lite_cursor);
            void lite_ch;
            if (((lite_ch) === ("\""))) {
                lite_cursor = (lite_cursor + 1n);
                while (((lite_cursor) < (lite_size))) {
                    const lite_escaped = lite$textAt(lite_code, lite_cursor);
                    void lite_escaped;
                    if (((lite_escaped) === ("\\"))) {
                        lite_cursor = (lite_cursor + 2n);
                    } else if (((lite_escaped) === ("\""))) {
                        lite_cursor = (lite_cursor + 1n);
                        break;
                    } else {
                        lite_cursor = (lite_cursor + 1n);
                    }
                }
            } else if (liteFn_startsWithAt(lite_code, lite_cursor, lite_needle)) {
                return true;
            } else {
                lite_cursor = (lite_cursor + 1n);
            }
        }
        return false;
    }
    void liteFn_codeUsesTextCall;
    function liteFn_codeUsesListIndex(lite_code: string): boolean {
        void lite_code;
        return liteFn_codeUsesTextCall(lite_code, "lite$listAt(");
    }
    void liteFn_codeUsesListIndex;
    function liteFn_codeUsesListPop(lite_code: string): boolean {
        void lite_code;
        return liteFn_codeUsesTextCall(lite_code, "lite$listPopBack(");
    }
    void liteFn_codeUsesListPop;
    function liteFn_codeUsesValueIf(lite_code: string): boolean {
        void lite_code;
        return liteFn_codeUsesTextCall(lite_code, "Boolean(");
    }
    void liteFn_codeUsesValueIf;
    function liteFn_tupleFieldKind(lite_kind: string, lite_label: string): string {
        void lite_kind;
        void lite_label;
        const lite_size = lite$textLength(lite_kind);
        void lite_size;
        let lite_cursor = 1n;
        void lite_cursor;
        while (((((lite_cursor) < (lite_size))) && (((lite$textAt(lite_kind, lite_cursor)) !== (")"))))) {
            const lite_nameStart = lite_cursor;
            void lite_nameStart;
            lite_cursor = liteFn_skipName(lite_kind, lite_cursor);
            const lite_fieldName = lite$textSlice(lite_kind, lite_nameStart, lite_cursor);
            void lite_fieldName;
            if (((((lite_cursor) < (lite_size))) && (((lite$textAt(lite_kind, lite_cursor)) === (":"))))) {
                lite_cursor = (lite_cursor + 1n);
            }
            const lite_typeStart = lite_cursor;
            void lite_typeStart;
            lite_cursor = liteFn_skipName(lite_kind, lite_cursor);
            const lite_fieldKind = lite$textSlice(lite_kind, lite_typeStart, lite_cursor);
            void lite_fieldKind;
            if (((lite_fieldName) === (lite_label))) {
                return lite_fieldKind;
            }
            if (((((lite_cursor) < (lite_size))) && (((lite$textAt(lite_kind, lite_cursor)) === (","))))) {
                lite_cursor = (lite_cursor + 1n);
            }
        }
        return "";
    }
    void liteFn_tupleFieldKind;
    function liteFn_displayKind(lite_kind: string): string {
        void lite_kind;
        if (liteFn_isListKind(lite_kind)) {
            return (((("List<") + (liteFn_displayKind(liteFn_listElementKind(lite_kind))))) + (">"));
        }
        if ((!(liteFn_isTupleKind(lite_kind)))) {
            return lite_kind;
        }
        const lite_size = lite$textLength(lite_kind);
        void lite_size;
        let lite_cursor = 1n;
        void lite_cursor;
        let lite_result = "(";
        void lite_result;
        let lite_count = 0n;
        void lite_count;
        while (((((lite_cursor) < (lite_size))) && (((lite$textAt(lite_kind, lite_cursor)) !== (")"))))) {
            const lite_nameStart = lite_cursor;
            void lite_nameStart;
            lite_cursor = liteFn_skipName(lite_kind, lite_cursor);
            const lite_fieldName = lite$textSlice(lite_kind, lite_nameStart, lite_cursor);
            void lite_fieldName;
            if (((((lite_cursor) < (lite_size))) && (((lite$textAt(lite_kind, lite_cursor)) === (":"))))) {
                lite_cursor = (lite_cursor + 1n);
            }
            const lite_typeStart = lite_cursor;
            void lite_typeStart;
            lite_cursor = liteFn_skipName(lite_kind, lite_cursor);
            const lite_fieldKind = lite$textSlice(lite_kind, lite_typeStart, lite_cursor);
            void lite_fieldKind;
            if (((lite_count) > (0n))) {
                lite_result = ((lite_result) + (", "));
            }
            lite_result = ((((((lite_result) + (lite_fieldName))) + (": "))) + (liteFn_displayKind(lite_fieldKind)));
            lite_count = (lite_count + 1n);
            if (((((lite_cursor) < (lite_size))) && (((lite$textAt(lite_kind, lite_cursor)) === (","))))) {
                lite_cursor = (lite_cursor + 1n);
            }
        }
        return ((lite_result) + (")"));
    }
    void liteFn_displayKind;
    function liteFn_resolveTypeText(lite_source: string, lite_position: bigint, lite_prefix: string, lite_aliases: { name: string; target: string; at: bigint; end: bigint }[], lite_text: string, lite_seen: string[]): string {
        void lite_source;
        void lite_position;
        void lite_prefix;
        void lite_aliases;
        void lite_text;
        void lite_seen;
        const lite_size = lite$textLength(lite_text);
        void lite_size;
        let lite_cursor = liteFn_skipTrivia(lite_text, 0n, lite_prefix);
        void lite_cursor;
        if (((((lite_cursor) < (lite_size))) && (((lite$textAt(lite_text, lite_cursor)) === ("("))))) {
            lite_cursor = liteFn_skipTrivia(lite_text, (lite_cursor + 1n), lite_prefix);
            const lite_labels: string[] = [...([])];
            void lite_labels;
            let lite_kindText = "(";
            void lite_kindText;
            let lite_count = 0n;
            void lite_count;
            while (Boolean(true)) {
                if (((lite_cursor) >= (lite_size))) {
                    liteFn_failAt(lite_source, lite_position, lite_prefix, "expected ) in tuple type");
                }
                if (((lite$textAt(lite_text, lite_cursor)) === (")"))) {
                    lite_cursor = (lite_cursor + 1n);
                    break;
                }
                if ((!(liteFn_isNameStart(lite$textAt(lite_text, lite_cursor))))) {
                    liteFn_failAt(lite_source, lite_position, lite_prefix, "expected a tuple field name");
                }
                const lite_labelStart = lite_cursor;
                void lite_labelStart;
                lite_cursor = liteFn_skipName(lite_text, lite_cursor);
                const lite_label = lite$textSlice(lite_text, lite_labelStart, lite_cursor);
                void lite_label;
                if (liteFn_listContainsText([...(lite_labels)], lite_label)) {
                    liteFn_failAt(lite_source, lite_position, lite_prefix, (("duplicate tuple field ") + (lite_label)));
                }
                lite_labels.push(lite_label);
                lite_cursor = liteFn_skipTrivia(lite_text, lite_cursor, lite_prefix);
                if (((((lite_cursor) >= (lite_size))) || (((lite$textAt(lite_text, lite_cursor)) !== (":"))))) {
                    liteFn_failAt(lite_source, lite_position, lite_prefix, (("expected : after tuple field ") + (lite_label)));
                }
                lite_cursor = liteFn_skipTrivia(lite_text, (lite_cursor + 1n), lite_prefix);
                if (((((lite_cursor) < (lite_size))) && (((lite$textAt(lite_text, lite_cursor)) === ("("))))) {
                    liteFn_failAt(lite_source, lite_position, lite_prefix, "nested tuple types are not supported");
                }
                if (((((lite_cursor) >= (lite_size))) || ((!(liteFn_isNameStart(lite$textAt(lite_text, lite_cursor))))))) {
                    liteFn_failAt(lite_source, lite_position, lite_prefix, "expected a tuple field type");
                }
                const lite_componentStart = lite_cursor;
                void lite_componentStart;
                lite_cursor = liteFn_skipName(lite_text, lite_cursor);
                const lite_componentName = lite$textSlice(lite_text, lite_componentStart, lite_cursor);
                void lite_componentName;
                const lite_componentKind = liteFn_resolveTypeText(lite_source, lite_position, lite_prefix, [...(lite_aliases)], lite_componentName, [...(lite_seen)]);
                void lite_componentKind;
                if (liteFn_isTupleKind(lite_componentKind)) {
                    liteFn_failAt(lite_source, lite_position, lite_prefix, "nested tuple types are not supported");
                }
                if (liteFn_isListKind(lite_componentKind)) {
                    liteFn_failAt(lite_source, lite_position, lite_prefix, "list types inside tuples are not supported");
                }
                if (((lite_componentKind) === ("Unit"))) {
                    liteFn_failAt(lite_source, lite_position, lite_prefix, "unsupported tuple component type Unit");
                }
                if (((lite_count) > (0n))) {
                    lite_kindText = ((lite_kindText) + (","));
                }
                lite_kindText = ((((((lite_kindText) + (lite_label))) + (":"))) + (lite_componentKind));
                lite_count = (lite_count + 1n);
                lite_cursor = liteFn_skipTrivia(lite_text, lite_cursor, lite_prefix);
                if (((((lite_cursor) < (lite_size))) && (((lite$textAt(lite_text, lite_cursor)) === (","))))) {
                    lite_cursor = liteFn_skipTrivia(lite_text, (lite_cursor + 1n), lite_prefix);
                }
            }
            if (((lite_count) === (0n))) {
                liteFn_failAt(lite_source, lite_position, lite_prefix, "tuple type needs at least one field");
            }
            lite_cursor = liteFn_skipTrivia(lite_text, lite_cursor, lite_prefix);
            if (((lite_cursor) < (lite_size))) {
                liteFn_failAt(lite_source, lite_position, lite_prefix, "unexpected text after tuple type");
            }
            return ((lite_kindText) + (")"));
        }
        const lite_after = liteFn_skipName(lite_text, lite_cursor);
        void lite_after;
        const lite_name = lite$textSlice(lite_text, lite_cursor, lite_after);
        void lite_name;
        const lite_afterTrivia = liteFn_skipTrivia(lite_text, lite_after, lite_prefix);
        void lite_afterTrivia;
        if (((((((lite_name) === ("List"))) && (((lite_afterTrivia) < (lite_size))))) && (((lite$textAt(lite_text, lite_afterTrivia)) === ("<"))))) {
            const lite_innerStart = liteFn_skipTrivia(lite_text, (lite_afterTrivia + 1n), lite_prefix);
            void lite_innerStart;
            if (((((lite_innerStart) >= (lite_size))) || (((lite$textAt(lite_text, lite_innerStart)) === (">"))))) {
                liteFn_failAt(lite_source, lite_position, lite_prefix, "expected a list element type");
            }
            let lite_scan = lite_innerStart;
            void lite_scan;
            let lite_depth = 0n;
            void lite_depth;
            let lite_close = (-1n);
            void lite_close;
            while (((lite_scan) < (lite_size))) {
                const lite_ch = lite$textAt(lite_text, lite_scan);
                void lite_ch;
                if (((lite_ch) === ("<"))) {
                    lite_depth = (lite_depth + 1n);
                } else if (((lite_ch) === (">"))) {
                    if (((lite_depth) === (0n))) {
                        lite_close = lite_scan;
                        break;
                    }
                    lite_depth = (lite_depth - 1n);
                }
                lite_scan = (lite_scan + 1n);
            }
            if (((lite_close) < (0n))) {
                liteFn_failAt(lite_source, lite_position, lite_prefix, "expected > in list type");
            }
            const lite_innerText = lite$textSlice(lite_text, lite_innerStart, lite_close);
            void lite_innerText;
            const lite_innerKind = liteFn_resolveTypeText(lite_source, lite_position, lite_prefix, [...(lite_aliases)], lite_innerText, [...(lite_seen)]);
            void lite_innerKind;
            if (liteFn_isListKind(lite_innerKind)) {
                liteFn_failAt(lite_source, lite_position, lite_prefix, "nested list types are not supported");
            }
            if (((lite_innerKind) === ("Unit"))) {
                liteFn_failAt(lite_source, lite_position, lite_prefix, "unsupported list element type Unit");
            }
            const lite_afterList = liteFn_skipTrivia(lite_text, (lite_close + 1n), lite_prefix);
            void lite_afterList;
            if (((lite_afterList) < (lite_size))) {
                liteFn_failAt(lite_source, lite_position, lite_prefix, "unexpected text after list type");
            }
            return (((("List<") + (lite_innerKind))) + (">"));
        }
        if (((lite_afterTrivia) < (lite_size))) {
            liteFn_failAt(lite_source, lite_position, lite_prefix, (("unexpected text after type ") + (lite_name)));
        }
        if (((((((((lite_name) === ("Int"))) || (((lite_name) === ("String"))))) || (((lite_name) === ("Bool"))))) || (((lite_name) === ("Unit"))))) {
            return lite_name;
        }
        if (liteFn_isUnsupportedAliasTarget(lite_name)) {
            liteFn_unsupportedAliasTarget(lite_source, lite_position, lite_prefix, lite_name);
            return "";
        }
        const lite_index = liteFn_findAlias([...(lite_aliases)], lite_name);
        void lite_index;
        if (((lite_index) < (0n))) {
            liteFn_failAt(lite_source, lite_position, lite_prefix, (("unknown type alias ") + (lite_name)));
            return "";
        }
        const lite_alias = lite$listAt((lite_aliases), lite_index);
        void lite_alias;
        if (liteFn_listContainsText([...(lite_seen)], lite_name)) {
            liteFn_failAt(lite_source, (lite_alias).at, lite_prefix, (("recursive type alias ") + (lite_name)));
            return "";
        }
        if ((((lite_alias).target) === (""))) {
            liteFn_unsupportedAliasTarget(lite_source, (lite_alias).at, lite_prefix, "target");
            return "";
        }
        const lite_nextSeen: string[] = [...(lite_seen)];
        void lite_nextSeen;
        lite_nextSeen.push(lite_name);
        return liteFn_resolveTypeText(lite_source, (lite_alias).at, lite_prefix, [...(lite_aliases)], (lite_alias).target, [...(lite_nextSeen)]);
    }
    void liteFn_resolveTypeText;
    function liteFn_resolveAliasKind(lite_source: string, lite_position: bigint, lite_prefix: string, lite_aliases: { name: string; target: string; at: bigint; end: bigint }[], lite_name: string, lite_seen: string[]): string {
        void lite_source;
        void lite_position;
        void lite_prefix;
        void lite_aliases;
        void lite_name;
        void lite_seen;
        return liteFn_resolveTypeText(lite_source, lite_position, lite_prefix, [...(lite_aliases)], lite_name, [...(lite_seen)]);
    }
    void liteFn_resolveAliasKind;
    function liteFn_parseTupleTypeAt(lite_source: string, lite_position: bigint, lite_prefix: string, lite_aliases: { name: string; target: string; at: bigint; end: bigint }[]): { kind: string; next: bigint } {
        void lite_source;
        void lite_position;
        void lite_prefix;
        void lite_aliases;
        const lite_size = lite$textLength(lite_source);
        void lite_size;
        let lite_cursor = liteFn_skipTrivia(lite_source, lite_position, lite_prefix);
        void lite_cursor;
        lite_cursor = liteFn_expectSymbol(lite_source, lite_cursor, "(", lite_prefix);
        lite_cursor = liteFn_skipTrivia(lite_source, lite_cursor, lite_prefix);
        const lite_labels: string[] = [...([])];
        void lite_labels;
        let lite_kindText = "(";
        void lite_kindText;
        let lite_count = 0n;
        void lite_count;
        while (Boolean(true)) {
            if (((lite_cursor) >= (lite_size))) {
                liteFn_failAt(lite_source, lite_cursor, lite_prefix, "expected ) in tuple type");
            }
            if (((lite$textAt(lite_source, lite_cursor)) === (")"))) {
                lite_cursor = (lite_cursor + 1n);
                break;
            }
            if ((!(liteFn_isNameStart(lite$textAt(lite_source, lite_cursor))))) {
                liteFn_failAt(lite_source, lite_cursor, lite_prefix, "expected a tuple field name");
            }
            const lite_labelStart = lite_cursor;
            void lite_labelStart;
            lite_cursor = liteFn_skipName(lite_source, lite_cursor);
            const lite_label = lite$textSlice(lite_source, lite_labelStart, lite_cursor);
            void lite_label;
            if (liteFn_isReservedWord(lite_label)) {
                liteFn_unsupportedFeature(lite_source, lite_labelStart, lite_label, lite_prefix);
            }
            if (liteFn_listContainsText([...(lite_labels)], lite_label)) {
                liteFn_failAt(lite_source, lite_labelStart, lite_prefix, (("duplicate tuple field ") + (lite_label)));
            }
            lite_labels.push(lite_label);
            lite_cursor = liteFn_skipTrivia(lite_source, lite_cursor, lite_prefix);
            if (((((lite_cursor) >= (lite_size))) || (((lite$textAt(lite_source, lite_cursor)) !== (":"))))) {
                liteFn_failAt(lite_source, lite_cursor, lite_prefix, (("expected : after tuple field ") + (lite_label)));
            }
            lite_cursor = liteFn_skipTrivia(lite_source, (lite_cursor + 1n), lite_prefix);
            if (((((lite_cursor) < (lite_size))) && (((lite$textAt(lite_source, lite_cursor)) === ("("))))) {
                liteFn_failAt(lite_source, lite_cursor, lite_prefix, "nested tuple types are not supported");
            }
            if (((((lite_cursor) >= (lite_size))) || ((!(liteFn_isNameStart(lite$textAt(lite_source, lite_cursor))))))) {
                liteFn_failAt(lite_source, lite_cursor, lite_prefix, "expected a tuple field type");
            }
            const lite_componentStart = lite_cursor;
            void lite_componentStart;
            lite_cursor = liteFn_skipName(lite_source, lite_cursor);
            const lite_componentName = lite$textSlice(lite_source, lite_componentStart, lite_cursor);
            void lite_componentName;
            let lite_componentKind = "";
            void lite_componentKind;
            if (((((((((lite_componentName) === ("Int"))) || (((lite_componentName) === ("String"))))) || (((lite_componentName) === ("Bool"))))) || (((lite_componentName) === ("Unit"))))) {
                lite_componentKind = lite_componentName;
            } else if (((liteFn_findAlias([...(lite_aliases)], lite_componentName)) >= (0n))) {
                const lite_seen: string[] = [...([])];
                void lite_seen;
                lite_componentKind = liteFn_resolveAliasKind(lite_source, lite_componentStart, lite_prefix, [...(lite_aliases)], lite_componentName, [...(lite_seen)]);
            } else {
                liteFn_failAt(lite_source, lite_componentStart, lite_prefix, (("unsupported tuple field type ") + (lite_componentName)));
            }
            if (liteFn_isTupleKind(lite_componentKind)) {
                liteFn_failAt(lite_source, lite_componentStart, lite_prefix, "nested tuple types are not supported");
            }
            if (liteFn_isListKind(lite_componentKind)) {
                liteFn_failAt(lite_source, lite_componentStart, lite_prefix, "list types inside tuples are not supported");
            }
            if (((lite_componentKind) === ("Unit"))) {
                liteFn_failAt(lite_source, lite_componentStart, lite_prefix, "unsupported tuple component type Unit");
            }
            if (((lite_count) > (0n))) {
                lite_kindText = ((lite_kindText) + (","));
            }
            lite_kindText = ((((((lite_kindText) + (lite_label))) + (":"))) + (lite_componentKind));
            lite_count = (lite_count + 1n);
            lite_cursor = liteFn_skipTrivia(lite_source, lite_cursor, lite_prefix);
            if (((((lite_cursor) < (lite_size))) && (((lite$textAt(lite_source, lite_cursor)) === (","))))) {
                lite_cursor = liteFn_skipTrivia(lite_source, (lite_cursor + 1n), lite_prefix);
            }
        }
        if (((lite_count) === (0n))) {
            liteFn_failAt(lite_source, lite_position, lite_prefix, "tuple type needs at least one field");
        }
        return { kind: ((lite_kindText) + (")")), next: lite_cursor };
    }
    void liteFn_parseTupleTypeAt;
    function liteFn_parseTypeAt(lite_source: string, lite_position: bigint, lite_prefix: string, lite_aliases: { name: string; target: string; at: bigint; end: bigint }[], lite_context: string): { kind: string; next: bigint } {
        void lite_source;
        void lite_position;
        void lite_prefix;
        void lite_aliases;
        void lite_context;
        const lite_start = liteFn_skipTrivia(lite_source, lite_position, lite_prefix);
        void lite_start;
        if (((((lite_start) < (lite$textLength(lite_source)))) && (((lite$textAt(lite_source, lite_start)) === ("("))))) {
            return liteFn_parseTupleTypeAt(lite_source, lite_position, lite_prefix, [...(lite_aliases)]);
        }
        const lite_after = liteFn_skipName(lite_source, lite_start);
        void lite_after;
        const lite_name = lite$textSlice(lite_source, lite_start, lite_after);
        void lite_name;
        const lite_afterName = liteFn_skipTrivia(lite_source, lite_after, lite_prefix);
        void lite_afterName;
        if (((((((lite_name) === ("List"))) && (((lite_afterName) < (lite$textLength(lite_source)))))) && (((lite$textAt(lite_source, lite_afterName)) === ("<"))))) {
            const lite_innerStart = liteFn_skipTrivia(lite_source, (lite_afterName + 1n), lite_prefix);
            void lite_innerStart;
            if (((((lite_innerStart) >= (lite$textLength(lite_source)))) || (((lite$textAt(lite_source, lite_innerStart)) === (">"))))) {
                liteFn_failAt(lite_source, lite_innerStart, lite_prefix, "expected a list element type");
            }
            const lite_inner = liteFn_parseTypeAt(lite_source, lite_innerStart, lite_prefix, [...(lite_aliases)], lite_context);
            void lite_inner;
            if (liteFn_isListKind((lite_inner).kind)) {
                liteFn_failAt(lite_source, lite_innerStart, lite_prefix, "nested list types are not supported");
            }
            if ((((lite_inner).kind) === ("Unit"))) {
                liteFn_failAt(lite_source, lite_innerStart, lite_prefix, "unsupported list element type Unit");
            }
            let lite_close = liteFn_skipTrivia(lite_source, (lite_inner).next, lite_prefix);
            void lite_close;
            lite_close = liteFn_expectSymbol(lite_source, lite_close, ">", lite_prefix);
            return { kind: (((("List<") + ((lite_inner).kind))) + (">")), next: lite_close };
        }
        if (((((((((lite_name) === ("Int"))) || (((lite_name) === ("String"))))) || (((lite_name) === ("Bool"))))) || (((lite_name) === ("Unit"))))) {
            return { kind: lite_name, next: lite_after };
        }
        if (((liteFn_findAlias([...(lite_aliases)], lite_name)) >= (0n))) {
            const lite_seen: string[] = [...([])];
            void lite_seen;
            return { kind: liteFn_resolveAliasKind(lite_source, lite_start, lite_prefix, [...(lite_aliases)], lite_name, [...(lite_seen)]), next: lite_after };
        }
        liteFn_failAt(lite_source, lite_start, lite_prefix, (((((("unsupported ") + (lite_context))) + (" type "))) + (lite_name)));
        return { kind: "", next: lite_after };
    }
    void liteFn_parseTypeAt;
    function liteFn_parseFunctionType(lite_source: string, lite_position: bigint, lite_prefix: string, lite_aliases: { name: string; target: string; at: bigint; end: bigint }[]): { kind: string; next: bigint } {
        void lite_source;
        void lite_position;
        void lite_prefix;
        void lite_aliases;
        return liteFn_parseTypeAt(lite_source, lite_position, lite_prefix, [...(lite_aliases)], "function");
    }
    void liteFn_parseFunctionType;
    function liteFn_parseFunctionHeader(lite_source: string, lite_position: bigint, lite_prefix: string, lite_aliases: { name: string; target: string; at: bigint; end: bigint }[]): { next: bigint; result: string; params: string; count: bigint } {
        void lite_source;
        void lite_position;
        void lite_prefix;
        void lite_aliases;
        const lite_size = lite$textLength(lite_source);
        void lite_size;
        let lite_cursor = liteFn_skipTrivia(lite_source, lite_position, lite_prefix);
        void lite_cursor;
        lite_cursor = liteFn_expectSymbol(lite_source, lite_cursor, "(", lite_prefix);
        lite_cursor = liteFn_skipTrivia(lite_source, lite_cursor, lite_prefix);
        const lite_names: string[] = [...([])];
        void lite_names;
        let lite_encoded = "";
        void lite_encoded;
        let lite_count = 0n;
        void lite_count;
        if (((((lite_cursor) < (lite_size))) && (((lite$textAt(lite_source, lite_cursor)) !== (")"))))) {
            while (Boolean(true)) {
                if (((((lite_cursor) >= (lite_size))) || ((!(liteFn_isNameStart(lite$textAt(lite_source, lite_cursor))))))) {
                    liteFn_failAt(lite_source, lite_cursor, lite_prefix, "expected a parameter name");
                }
                const lite_nameStart = lite_cursor;
                void lite_nameStart;
                lite_cursor = liteFn_skipName(lite_source, lite_cursor);
                const lite_parameterName = lite$textSlice(lite_source, lite_nameStart, lite_cursor);
                void lite_parameterName;
                if (liteFn_isReservedWord(lite_parameterName)) {
                    liteFn_unsupportedFeature(lite_source, lite_nameStart, lite_parameterName, lite_prefix);
                }
                if (liteFn_listContainsText([...(lite_names)], lite_parameterName)) {
                    liteFn_failAt(lite_source, lite_nameStart, lite_prefix, (("duplicate parameter ") + (lite_parameterName)));
                }
                lite_names.push(lite_parameterName);
                lite_cursor = liteFn_skipTrivia(lite_source, lite_cursor, lite_prefix);
                lite_cursor = liteFn_expectSymbol(lite_source, lite_cursor, ":", lite_prefix);
                const lite_typed = liteFn_parseFunctionType(lite_source, lite_cursor, lite_prefix, [...(lite_aliases)]);
                void lite_typed;
                lite_cursor = liteFn_skipTrivia(lite_source, (lite_typed).next, lite_prefix);
                if (((lite_count) > (0n))) {
                    lite_encoded = ((lite_encoded) + ("|"));
                }
                lite_encoded = ((((((lite_encoded) + (lite_parameterName))) + ("="))) + ((lite_typed).kind));
                lite_count = (lite_count + 1n);
                if (((((lite_cursor) < (lite_size))) && (((lite$textAt(lite_source, lite_cursor)) === (","))))) {
                    lite_cursor = liteFn_skipTrivia(lite_source, (lite_cursor + 1n), lite_prefix);
                } else {
                    break;
                }
            }
        }
        lite_cursor = liteFn_expectSymbol(lite_source, lite_cursor, ")", lite_prefix);
        lite_cursor = liteFn_skipTrivia(lite_source, lite_cursor, lite_prefix);
        lite_cursor = liteFn_expectSymbol(lite_source, lite_cursor, ":", lite_prefix);
        const lite_resultType = liteFn_parseFunctionType(lite_source, lite_cursor, lite_prefix, [...(lite_aliases)]);
        void lite_resultType;
        return { next: (lite_resultType).next, result: (lite_resultType).kind, params: lite_encoded, count: lite_count };
    }
    void liteFn_parseFunctionHeader;
    function liteFn_paramNameOf(lite_entry: string): string {
        void lite_entry;
        const lite_separator = liteFn_indexOfText(lite_entry, "=", 0n);
        void lite_separator;
        if (((lite_separator) < (0n))) {
            return lite_entry;
        }
        return lite$textSlice(lite_entry, 0n, lite_separator);
    }
    void liteFn_paramNameOf;
    function liteFn_paramKindOf(lite_entry: string): string {
        void lite_entry;
        const lite_separator = liteFn_indexOfText(lite_entry, "=", 0n);
        void lite_separator;
        if (((lite_separator) < (0n))) {
            return "";
        }
        return lite$textSlice(lite_entry, (lite_separator + 1n), lite$textLength(lite_entry));
    }
    void liteFn_paramKindOf;
    function liteFn_intParsed(lite_code: string, lite_value: bigint, lite_constant: boolean, lite_next: bigint): { kind: string; code: string; intValue: bigint; textValue: string; constant: boolean; next: bigint } {
        void lite_code;
        void lite_value;
        void lite_constant;
        void lite_next;
        return { kind: "Int", code: lite_code, intValue: lite_value, textValue: "", constant: lite_constant, next: lite_next };
    }
    void liteFn_intParsed;
    function liteFn_textParsed(lite_code: string, lite_value: string, lite_constant: boolean, lite_next: bigint): { kind: string; code: string; intValue: bigint; textValue: string; constant: boolean; next: bigint } {
        void lite_code;
        void lite_value;
        void lite_constant;
        void lite_next;
        return { kind: "String", code: lite_code, intValue: 0n, textValue: lite_value, constant: lite_constant, next: lite_next };
    }
    void liteFn_textParsed;
    function liteFn_boolParsed(lite_code: string, lite_value: boolean, lite_constant: boolean, lite_next: bigint): { kind: string; code: string; intValue: bigint; textValue: string; constant: boolean; next: bigint } {
        void lite_code;
        void lite_value;
        void lite_constant;
        void lite_next;
        return { kind: "Bool", code: lite_code, intValue: (Boolean(lite_value) ? 1n : 0n), textValue: "", constant: lite_constant, next: lite_next };
    }
    void liteFn_boolParsed;
    function liteFn_addIntegers(lite_source: string, lite_at: bigint, lite_left: bigint, lite_right: bigint, lite_prefix: string): bigint {
        void lite_source;
        void lite_at;
        void lite_left;
        void lite_right;
        void lite_prefix;
        const lite_result = liteFn_intAdd(lite_left, lite_right);
        void lite_result;
        if ((!((lite_result).ok))) {
            liteFn_failAt(lite_source, lite_at, lite_prefix, "integer expression outside signed 64-bit range");
        }
        return (lite_result).value;
    }
    void liteFn_addIntegers;
    function liteFn_subtractIntegers(lite_source: string, lite_at: bigint, lite_left: bigint, lite_right: bigint, lite_prefix: string): bigint {
        void lite_source;
        void lite_at;
        void lite_left;
        void lite_right;
        void lite_prefix;
        const lite_result = liteFn_intSubtract(lite_left, lite_right);
        void lite_result;
        if ((!((lite_result).ok))) {
            liteFn_failAt(lite_source, lite_at, lite_prefix, "integer expression outside signed 64-bit range");
        }
        return (lite_result).value;
    }
    void liteFn_subtractIntegers;
    function liteFn_multiplyIntegers(lite_source: string, lite_at: bigint, lite_left: bigint, lite_right: bigint, lite_prefix: string): bigint {
        void lite_source;
        void lite_at;
        void lite_left;
        void lite_right;
        void lite_prefix;
        const lite_result = liteFn_intMultiply(lite_left, lite_right);
        void lite_result;
        if ((!((lite_result).ok))) {
            liteFn_failAt(lite_source, lite_at, lite_prefix, "integer expression outside signed 64-bit range");
        }
        return (lite_result).value;
    }
    void liteFn_multiplyIntegers;
    function liteFn_divideIntegers(lite_source: string, lite_at: bigint, lite_left: bigint, lite_right: bigint, lite_prefix: string): bigint {
        void lite_source;
        void lite_at;
        void lite_left;
        void lite_right;
        void lite_prefix;
        const lite_result = liteFn_intDivide(lite_left, lite_right);
        void lite_result;
        if ((!((lite_result).ok))) {
            if (((lite_right) === (0n))) {
                liteFn_failAt(lite_source, lite_at, lite_prefix, "division by zero in integer expression");
            }
            liteFn_failAt(lite_source, lite_at, lite_prefix, "integer expression outside signed 64-bit range");
        }
        return (lite_result).value;
    }
    void liteFn_divideIntegers;
    function liteFn_remainderIntegers(lite_source: string, lite_at: bigint, lite_left: bigint, lite_right: bigint, lite_prefix: string): bigint {
        void lite_source;
        void lite_at;
        void lite_left;
        void lite_right;
        void lite_prefix;
        const lite_result = liteFn_intRemainder(lite_left, lite_right);
        void lite_result;
        if ((!((lite_result).ok))) {
            if (((lite_right) === (0n))) {
                liteFn_failAt(lite_source, lite_at, lite_prefix, "remainder by zero in integer expression");
            }
            liteFn_failAt(lite_source, lite_at, lite_prefix, "integer expression outside signed 64-bit range");
        }
        return (lite_result).value;
    }
    void liteFn_remainderIntegers;
    function liteFn_floorDivideIntegers(lite_source: string, lite_at: bigint, lite_left: bigint, lite_right: bigint, lite_prefix: string): bigint {
        void lite_source;
        void lite_at;
        void lite_left;
        void lite_right;
        void lite_prefix;
        const lite_result = liteFn_intFloorDivide(lite_left, lite_right);
        void lite_result;
        if ((!((lite_result).ok))) {
            if (((lite_right) === (0n))) {
                liteFn_failAt(lite_source, lite_at, lite_prefix, "division by zero in integer expression");
            }
            liteFn_failAt(lite_source, lite_at, lite_prefix, "integer expression outside signed 64-bit range");
        }
        return (lite_result).value;
    }
    void liteFn_floorDivideIntegers;
    function liteFn_floorModuloIntegers(lite_source: string, lite_at: bigint, lite_left: bigint, lite_right: bigint, lite_prefix: string): bigint {
        void lite_source;
        void lite_at;
        void lite_left;
        void lite_right;
        void lite_prefix;
        const lite_result = liteFn_intFloorModulo(lite_left, lite_right);
        void lite_result;
        if ((!((lite_result).ok))) {
            liteFn_failAt(lite_source, lite_at, lite_prefix, "modulo by zero in integer expression");
        }
        return (lite_result).value;
    }
    void liteFn_floorModuloIntegers;
    function liteFn_negateInteger(lite_source: string, lite_at: bigint, lite_value: bigint, lite_prefix: string): bigint {
        void lite_source;
        void lite_at;
        void lite_value;
        void lite_prefix;
        const lite_result = liteFn_intNegate(lite_value);
        void lite_result;
        if ((!((lite_result).ok))) {
            liteFn_failAt(lite_source, lite_at, lite_prefix, "integer expression outside signed 64-bit range");
        }
        return (lite_result).value;
    }
    void liteFn_negateInteger;
    function liteFn_localIndex(lite_locals: { name: string; runtime: string; kind: string; mutable: boolean; writable: boolean; depth: bigint; constant: boolean; code: string; intValue: bigint; textValue: string }[], lite_name: string): bigint {
        void lite_locals;
        void lite_name;
        let lite_index = 0n;
        void lite_index;
        let lite_found = (-1n);
        void lite_found;
        for (const lite_local of [...(lite_locals)]) {
            void lite_local;
            if ((((lite_local).name) === (lite_name))) {
                lite_found = lite_index;
            }
            lite_index = (lite_index + 1n);
        }
        return lite_found;
    }
    void liteFn_localIndex;
    function liteFn_localSameBlock(lite_locals: { name: string; runtime: string; kind: string; mutable: boolean; writable: boolean; depth: bigint; constant: boolean; code: string; intValue: bigint; textValue: string }[], lite_name: string, lite_depth: bigint): boolean {
        void lite_locals;
        void lite_name;
        void lite_depth;
        const lite_index = liteFn_localIndex([...(lite_locals)], lite_name);
        void lite_index;
        if (((lite_index) < (0n))) {
            return false;
        }
        return (((lite$listAt((lite_locals), lite_index)).depth) === (lite_depth));
    }
    void liteFn_localSameBlock;
    function liteFn_isComparison(lite_operator: string): boolean {
        void lite_operator;
        return ((((((((((((((((((((lite_operator) === ("=="))) || (((lite_operator) === ("=!="))))) || (((lite_operator) === ("<"))))) || (((lite_operator) === ("<!"))))) || (((lite_operator) === ("<="))))) || (((lite_operator) === ("<!="))))) || (((lite_operator) === (">"))))) || (((lite_operator) === (">!"))))) || (((lite_operator) === (">="))))) || (((lite_operator) === (">!="))));
    }
    void liteFn_isComparison;
    function liteFn_operatorLevel(lite_operator: string): bigint {
        void lite_operator;
        return (Boolean(((lite_operator) === ("or"))) ? 2n : (Boolean(((lite_operator) === ("and"))) ? 3n : (Boolean(liteFn_isComparison(lite_operator)) ? 5n : (Boolean(((((lite_operator) === ("+"))) || (((lite_operator) === ("-"))))) ? 10n : (Boolean(((((((((((lite_operator) === ("*"))) || (((lite_operator) === ("/"))))) || (((lite_operator) === ("%"))))) || (((lite_operator) === (":/"))))) || (((lite_operator) === (":%"))))) ? 20n : 0n)))));
    }
    void liteFn_operatorLevel;
    function liteFn_readOperator(lite_source: string, lite_position: bigint): { text: string; width: bigint } {
        void lite_source;
        void lite_position;
        if (liteFn_startsWithAt(lite_source, lite_position, "=!=")) {
            return { text: "=!=", width: 3n };
        }
        if (liteFn_startsWithAt(lite_source, lite_position, "<!=")) {
            return { text: "<!=", width: 3n };
        }
        if (liteFn_startsWithAt(lite_source, lite_position, ">!=")) {
            return { text: ">!=", width: 3n };
        }
        if (liteFn_startsWithAt(lite_source, lite_position, "==")) {
            return { text: "==", width: 2n };
        }
        if (liteFn_startsWithAt(lite_source, lite_position, "<=")) {
            return { text: "<=", width: 2n };
        }
        if (liteFn_startsWithAt(lite_source, lite_position, ">=")) {
            return { text: ">=", width: 2n };
        }
        if (liteFn_startsWithAt(lite_source, lite_position, "<!")) {
            return { text: "<!", width: 2n };
        }
        if (liteFn_startsWithAt(lite_source, lite_position, ">!")) {
            return { text: ">!", width: 2n };
        }
        const lite_ch = lite$textAt(lite_source, lite_position);
        void lite_ch;
        if (((lite_ch) === ("<"))) {
            return { text: "<", width: 1n };
        }
        if (((lite_ch) === (">"))) {
            return { text: ">", width: 1n };
        }
        if (((((((((((lite_ch) === ("+"))) || (((lite_ch) === ("-"))))) || (((lite_ch) === ("*"))))) || (((lite_ch) === ("/"))))) || (((lite_ch) === ("%"))))) {
            return { text: lite_ch, width: 1n };
        }
        if (liteFn_startsWithAt(lite_source, lite_position, ":/")) {
            return { text: ":/", width: 2n };
        }
        if (liteFn_startsWithAt(lite_source, lite_position, ":%")) {
            return { text: ":%", width: 2n };
        }
        if (liteFn_isNameStart(lite_ch)) {
            const lite_after = liteFn_skipName(lite_source, lite_position);
            void lite_after;
            const lite_word = lite$textSlice(lite_source, lite_position, lite_after);
            void lite_word;
            if (((((lite_word) === ("and"))) || (((lite_word) === ("or"))))) {
                return { text: lite_word, width: (lite_after - lite_position) };
            }
        }
        return { text: "", width: 0n };
    }
    void liteFn_readOperator;
    function liteFn_compareIntegers(lite_operator: string, lite_left: bigint, lite_right: bigint): boolean {
        void lite_operator;
        void lite_left;
        void lite_right;
        return (Boolean(((lite_operator) === ("=="))) ? ((lite_left) === (lite_right)) : (Boolean(((lite_operator) === ("=!="))) ? ((lite_left) !== (lite_right)) : (Boolean(((lite_operator) === ("<"))) ? ((lite_left) < (lite_right)) : (Boolean(((lite_operator) === ("<!"))) ? ((lite_left) >= (lite_right)) : (Boolean(((lite_operator) === ("<="))) ? ((lite_left) <= (lite_right)) : (Boolean(((lite_operator) === ("<!="))) ? ((lite_left) > (lite_right)) : (Boolean(((lite_operator) === (">"))) ? ((lite_left) > (lite_right)) : (Boolean(((lite_operator) === (">!"))) ? ((lite_left) <= (lite_right)) : (Boolean(((lite_operator) === (">="))) ? ((lite_left) >= (lite_right)) : ((lite_left) < (lite_right)))))))))));
    }
    void liteFn_compareIntegers;
    function liteFn_compareTexts(lite_operator: string, lite_left: string, lite_right: string): boolean {
        void lite_operator;
        void lite_left;
        void lite_right;
        return (Boolean(((lite_operator) === ("=="))) ? ((lite_left) === (lite_right)) : ((lite_left) !== (lite_right)));
    }
    void liteFn_compareTexts;
    function liteFn_compareBools(lite_operator: string, lite_left: boolean, lite_right: boolean): boolean {
        void lite_operator;
        void lite_left;
        void lite_right;
        return (Boolean(((lite_operator) === ("=="))) ? (Boolean(lite_left) === Boolean(lite_right)) : (Boolean(lite_left) !== Boolean(lite_right)));
    }
    void liteFn_compareBools;
    function liteFn_compareParsed(lite_source: string, lite_at: bigint, lite_operator: string, lite_left: { kind: string; code: string; intValue: bigint; textValue: string; constant: boolean; next: bigint }, lite_right: { kind: string; code: string; intValue: bigint; textValue: string; constant: boolean; next: bigint }, lite_prefix: string): { kind: string; code: string; intValue: bigint; textValue: string; constant: boolean; next: bigint } {
        void lite_source;
        void lite_at;
        void lite_operator;
        void lite_left;
        void lite_right;
        void lite_prefix;
        if ((((lite_left).kind) !== ((lite_right).kind))) {
            liteFn_failAt(lite_source, lite_at, lite_prefix, (((((("cannot compare ") + (liteFn_displayKind((lite_left).kind)))) + (" and "))) + (liteFn_displayKind((lite_right).kind))));
        }
        if (liteFn_isTupleKind((lite_left).kind)) {
            liteFn_failAt(lite_source, lite_at, lite_prefix, "cannot compare tuple values");
        }
        if (liteFn_isListKind((lite_left).kind)) {
            liteFn_failAt(lite_source, lite_at, lite_prefix, "cannot compare list values");
        }
        if ((((lite_left).kind) === ("Int"))) {
            if ((((lite_left).constant) && ((lite_right).constant))) {
                const lite_value = liteFn_compareIntegers(lite_operator, (lite_left).intValue, (lite_right).intValue);
                void lite_value;
                return liteFn_boolParsed(liteFn_boolLiteralCode(lite_value), lite_value, true, (lite_right).next);
            }
            return liteFn_boolParsed(liteFn_comparisonCode(lite_operator, (lite_left).kind, (lite_left).code, (lite_right).code), false, false, (lite_right).next);
        }
        if (((((lite_operator) !== ("=="))) && (((lite_operator) !== ("=!="))))) {
            liteFn_failAt(lite_source, lite_at, lite_prefix, (((("operator ") + (lite_operator))) + (" requires Int operands")));
        }
        if ((((lite_left).constant) && ((lite_right).constant))) {
            const lite_value = (Boolean((((lite_left).kind) === ("String"))) ? liteFn_compareTexts(lite_operator, (lite_left).textValue, (lite_right).textValue) : liteFn_compareBools(lite_operator, (((lite_left).intValue) !== (0n)), (((lite_right).intValue) !== (0n))));
            void lite_value;
            return liteFn_boolParsed(liteFn_boolLiteralCode(lite_value), lite_value, true, (lite_right).next);
        }
        return liteFn_boolParsed(liteFn_comparisonCode(lite_operator, (lite_left).kind, (lite_left).code, (lite_right).code), false, false, (lite_right).next);
    }
    void liteFn_compareParsed;
    function liteFn_parseInteger(lite_source: string, lite_position: bigint, lite_prefix: string): { kind: string; code: string; intValue: bigint; textValue: string; constant: boolean; next: bigint } {
        void lite_source;
        void lite_position;
        void lite_prefix;
        let lite_cursor = lite_position;
        void lite_cursor;
        let lite_negative = false;
        void lite_negative;
        const lite_ch = lite$textAt(lite_source, lite_cursor);
        void lite_ch;
        if (((((lite_ch) === ("+"))) || (((lite_ch) === ("-"))))) {
            lite_negative = ((lite_ch) === ("-"));
            lite_cursor = liteFn_skipTrivia(lite_source, (lite_cursor + 1n), lite_prefix);
        }
        const lite_start = lite_cursor;
        void lite_start;
        let lite_magnitude = 0n;
        void lite_magnitude;
        while (((((lite_cursor) < (lite$textLength(lite_source)))) && (liteFn_isDigit(lite$textAt(lite_source, lite_cursor))))) {
            const lite_digit = liteFn_digitValue(lite$textAt(lite_source, lite_cursor));
            void lite_digit;
            if (((lite_magnitude) < (lite$divideInt((((-9223372036854775808n) + lite_digit)), 10n)))) {
                liteFn_failAt(lite_source, lite_position, lite_prefix, "integer literal outside signed 64-bit range");
            }
            lite_magnitude = ((lite_magnitude * 10n) - lite_digit);
            lite_cursor = (lite_cursor + 1n);
        }
        if (((lite_start) === (lite_cursor))) {
            liteFn_failAt(lite_source, lite_position, lite_prefix, "expected a decimal integer literal");
        }
        if ((((!(lite_negative))) && (((lite_magnitude) === ((-9223372036854775808n)))))) {
            liteFn_failAt(lite_source, lite_position, lite_prefix, "integer literal outside signed 64-bit range");
        }
        const lite_value = (Boolean(lite_negative) ? lite_magnitude : (0n - lite_magnitude));
        void lite_value;
        const lite_raw = lite$textSlice(lite_source, lite_start, lite_cursor);
        void lite_raw;
        let lite_digitStart = 0n;
        void lite_digitStart;
        while ((((((lite_digitStart + 1n)) < (lite$textLength(lite_raw)))) && (((lite$textAt(lite_raw, lite_digitStart)) === ("0"))))) {
            lite_digitStart = (lite_digitStart + 1n);
        }
        const lite_digits = lite$textSlice(lite_raw, lite_digitStart, lite$textLength(lite_raw));
        void lite_digits;
        const lite_code = liteFn_intLiteralCode(lite_value, lite_negative, lite_digits);
        void lite_code;
        return liteFn_intParsed(lite_code, lite_value, true, lite_cursor);
    }
    void liteFn_parseInteger;
    function liteFn_parseText(lite_source: string, lite_position: bigint, lite_prefix: string): { kind: string; code: string; intValue: bigint; textValue: string; constant: boolean; next: bigint } {
        void lite_source;
        void lite_position;
        void lite_prefix;
        let lite_cursor = (lite_position + 1n);
        void lite_cursor;
        let lite_value = "";
        void lite_value;
        while (Boolean(true)) {
            if (((lite_cursor) >= (lite$textLength(lite_source)))) {
                liteFn_failAt(lite_source, lite_position, lite_prefix, "unterminated string literal");
            }
            const lite_ch = lite$textAt(lite_source, lite_cursor);
            void lite_ch;
            if (((lite_ch) === ("\""))) {
                lite_cursor = (lite_cursor + 1n);
                break;
            }
            if (((lite_ch) === ("\\"))) {
                const lite_escapeStart = lite_cursor;
                void lite_escapeStart;
                lite_cursor = (lite_cursor + 1n);
                if (((lite_cursor) >= (lite$textLength(lite_source)))) {
                    liteFn_failAt(lite_source, lite_escapeStart, lite_prefix, "unterminated string escape");
                }
                const lite_escaped = lite$textAt(lite_source, lite_cursor);
                void lite_escaped;
                if (((lite_escaped) === ("n"))) {
                    lite_value = ((lite_value) + ("\n"));
                } else if (((lite_escaped) === ("t"))) {
                    lite_value = ((lite_value) + ("\t"));
                } else if (((lite_escaped) === ("r"))) {
                    lite_value = ((lite_value) + ("\r"));
                } else if (((lite_escaped) === ("\""))) {
                    lite_value = ((lite_value) + ("\""));
                } else if (((lite_escaped) === ("\\"))) {
                    lite_value = ((lite_value) + ("\\"));
                } else {
                    liteFn_failAt(lite_source, lite_escapeStart, lite_prefix, (("unsupported string escape \\") + (lite_escaped)));
                }
                lite_cursor = (lite_cursor + 1n);
            } else {
                lite_value = ((lite_value) + (lite_ch));
                lite_cursor = (lite_cursor + 1n);
            }
        }
        return liteFn_textParsed(liteFn_textLiteralCode(lite_value), lite_value, true, lite_cursor);
    }
    void liteFn_parseText;
    function liteFn_skipAliasString(lite_source: string, lite_position: bigint): bigint {
        void lite_source;
        void lite_position;
        const lite_size = lite$textLength(lite_source);
        void lite_size;
        let lite_cursor = (lite_position + 1n);
        void lite_cursor;
        while (((lite_cursor) < (lite_size))) {
            const lite_ch = lite$textAt(lite_source, lite_cursor);
            void lite_ch;
            if (((lite_ch) === ("\\"))) {
                lite_cursor = (lite_cursor + 2n);
            } else if (((lite_ch) === ("\""))) {
                return (lite_cursor + 1n);
            } else {
                lite_cursor = (lite_cursor + 1n);
            }
        }
        return lite_size;
    }
    void liteFn_skipAliasString;
    function liteFn_collectTypeTarget(lite_source: string, lite_position: bigint, lite_prefix: string): { text: string; next: bigint } {
        void lite_source;
        void lite_position;
        void lite_prefix;
        const lite_size = lite$textLength(lite_source);
        void lite_size;
        const lite_start = liteFn_skipTrivia(lite_source, lite_position, lite_prefix);
        void lite_start;
        if (((((lite_start) < (lite_size))) && (((lite$textAt(lite_source, lite_start)) === ("("))))) {
            let lite_cursor = lite_start;
            void lite_cursor;
            let lite_depth = 0n;
            void lite_depth;
            while (((lite_cursor) < (lite_size))) {
                const lite_ch = lite$textAt(lite_source, lite_cursor);
                void lite_ch;
                if (((lite_ch) === ("\""))) {
                    lite_cursor = liteFn_skipAliasString(lite_source, lite_cursor);
                } else if (liteFn_startsWithAt(lite_source, lite_cursor, "/*")) {
                    lite_cursor = liteFn_skipComment(lite_source, lite_cursor, lite_prefix);
                } else if (((lite_ch) === ("("))) {
                    lite_depth = (lite_depth + 1n);
                    lite_cursor = (lite_cursor + 1n);
                } else if (((lite_ch) === (")"))) {
                    lite_depth = (lite_depth - 1n);
                    lite_cursor = (lite_cursor + 1n);
                    if (((lite_depth) === (0n))) {
                        return { text: lite$textSlice(lite_source, lite_start, lite_cursor), next: lite_cursor };
                    }
                } else {
                    lite_cursor = (lite_cursor + 1n);
                }
            }
            return { text: lite$textSlice(lite_source, lite_start, lite_size), next: lite_size };
        } else {
            const lite_after = liteFn_skipName(lite_source, lite_start);
            void lite_after;
            const lite_afterName = liteFn_skipTrivia(lite_source, lite_after, lite_prefix);
            void lite_afterName;
            if (((((lite_afterName) < (lite_size))) && (((lite$textAt(lite_source, lite_afterName)) === ("<"))))) {
                let lite_cursor = lite_afterName;
                void lite_cursor;
                let lite_depth = 0n;
                void lite_depth;
                while (((lite_cursor) < (lite_size))) {
                    const lite_ch = lite$textAt(lite_source, lite_cursor);
                    void lite_ch;
                    if (liteFn_startsWithAt(lite_source, lite_cursor, "/*")) {
                        lite_cursor = liteFn_skipComment(lite_source, lite_cursor, lite_prefix);
                    } else if (((lite_ch) === ("<"))) {
                        lite_depth = (lite_depth + 1n);
                        lite_cursor = (lite_cursor + 1n);
                    } else if (((lite_ch) === (">"))) {
                        lite_depth = (lite_depth - 1n);
                        lite_cursor = (lite_cursor + 1n);
                        if (((lite_depth) === (0n))) {
                            return { text: lite$textSlice(lite_source, lite_start, lite_cursor), next: lite_cursor };
                        }
                    } else {
                        lite_cursor = (lite_cursor + 1n);
                    }
                }
                return { text: lite$textSlice(lite_source, lite_start, lite_size), next: lite_size };
            } else {
                return { text: lite$textSlice(lite_source, lite_start, lite_after), next: lite_after };
            }
        }
    }
    void liteFn_collectTypeTarget;
    function liteFn_collectAliases(lite_source: string, lite_prefix: string): { name: string; target: string; at: bigint; end: bigint }[] {
        void lite_source;
        void lite_prefix;
        const lite_aliases: { name: string; target: string; at: bigint; end: bigint }[] = [...([])];
        void lite_aliases;
        const lite_size = lite$textLength(lite_source);
        void lite_size;
        let lite_position = 0n;
        void lite_position;
        let lite_depth = 0n;
        void lite_depth;
        while (((lite_position) < (lite_size))) {
            lite_position = liteFn_skipTrivia(lite_source, lite_position, lite_prefix);
            if (((lite_position) >= (lite_size))) {
                break;
            }
            const lite_ch = lite$textAt(lite_source, lite_position);
            void lite_ch;
            if (((lite_ch) === ("\""))) {
                lite_position = liteFn_skipAliasString(lite_source, lite_position);
            } else if (((lite_ch) === ("{"))) {
                lite_depth = (lite_depth + 1n);
                lite_position = (lite_position + 1n);
            } else if (((lite_ch) === ("}"))) {
                if (((lite_depth) > (0n))) {
                    lite_depth = (lite_depth - 1n);
                }
                lite_position = (lite_position + 1n);
            } else if (((((lite_depth) === (0n))) && (liteFn_isNameStart(lite_ch)))) {
                const lite_nameStart = lite_position;
                void lite_nameStart;
                const lite_afterName = liteFn_skipName(lite_source, lite_position);
                void lite_afterName;
                const lite_name = lite$textSlice(lite_source, lite_nameStart, lite_afterName);
                void lite_name;
                const lite_aliasPosition = liteFn_skipTrivia(lite_source, lite_afterName, lite_prefix);
                void lite_aliasPosition;
                if (liteFn_startsWithAt(lite_source, lite_aliasPosition, ":=")) {
                    const lite_typePosition = liteFn_skipTrivia(lite_source, (lite_aliasPosition + 2n), lite_prefix);
                    void lite_typePosition;
                    if (liteFn_wordAt(lite_source, lite_typePosition, "type")) {
                        const lite_targetStart = liteFn_skipTrivia(lite_source, (lite_typePosition + 4n), lite_prefix);
                        void lite_targetStart;
                        const lite_target = liteFn_collectTypeTarget(lite_source, lite_targetStart, lite_prefix);
                        void lite_target;
                        lite_aliases.push({ name: lite_name, target: (lite_target).text, at: lite_nameStart, end: (lite_target).next });
                        lite_position = (lite_target).next;
                        continue;
                    }
                }
                lite_position = lite_afterName;
            } else {
                lite_position = (lite_position + 1n);
            }
        }
        return [...(lite_aliases)];
    }
    void liteFn_collectAliases;
    function liteFn_looksLikeTupleEntry(lite_source: string, lite_position: bigint, lite_prefix: string): boolean {
        void lite_source;
        void lite_position;
        void lite_prefix;
        const lite_start = liteFn_skipTrivia(lite_source, lite_position, lite_prefix);
        void lite_start;
        if (((((lite_start) >= (lite$textLength(lite_source)))) || ((!(liteFn_isNameStart(lite$textAt(lite_source, lite_start))))))) {
            return false;
        }
        const lite_afterName = liteFn_skipTrivia(lite_source, liteFn_skipName(lite_source, lite_start), lite_prefix);
        void lite_afterName;
        if (((((lite_afterName) >= (lite$textLength(lite_source)))) || (((lite$textAt(lite_source, lite_afterName)) !== ("="))))) {
            return false;
        }
        return (!(liteFn_startsWithAt(lite_source, lite_afterName, "==")));
    }
    void liteFn_looksLikeTupleEntry;
    function liteFn_copiedValueCode(lite_kind: string, lite_code: string): string {
        void lite_kind;
        void lite_code;
        return (Boolean(liteFn_isListKind(lite_kind)) ? liteFn_listCopyCode(lite_code) : lite_code);
    }
    void liteFn_copiedValueCode;
    function liteFn_isAdmittedBuiltin(lite_name: string): boolean {
        void lite_name;
        return ((((((((((((((lite_name) === ("inputArgs"))) || (((lite_name) === ("inputAll"))))) || (((lite_name) === ("reportError"))))) || (((lite_name) === ("exit"))))) || (((lite_name) === ("textLength"))))) || (((lite_name) === ("textAt"))))) || (((lite_name) === ("textSlice"))));
    }
    void liteFn_isAdmittedBuiltin;
    function liteFn_builtinArity(lite_name: string): bigint {
        void lite_name;
        return (Boolean(((((lite_name) === ("inputArgs"))) || (((lite_name) === ("inputAll"))))) ? 0n : (Boolean(((lite_name) === ("textAt"))) ? 2n : (Boolean(((lite_name) === ("textSlice"))) ? 3n : 1n)));
    }
    void liteFn_builtinArity;
    function liteFn_builtinParameterKind(lite_name: string, lite_index: bigint): string {
        void lite_name;
        void lite_index;
        return (Boolean(((((lite_name) === ("reportError"))) || (((lite_name) === ("textLength"))))) ? "String" : (Boolean(((((lite_name) === ("textAt"))) || (((lite_name) === ("textSlice"))))) ? (Boolean(((lite_index) === (0n))) ? "String" : "Int") : "Int"));
    }
    void liteFn_builtinParameterKind;
    function liteFn_builtinResultKind(lite_name: string): string {
        void lite_name;
        return (Boolean(((lite_name) === ("inputArgs"))) ? "List<String>" : (Boolean(((((((lite_name) === ("inputAll"))) || (((lite_name) === ("textAt"))))) || (((lite_name) === ("textSlice"))))) ? "String" : (Boolean(((lite_name) === ("textLength"))) ? "Int" : "Unit")));
    }
    void liteFn_builtinResultKind;
    function liteFn_parseListGrant(lite_source: string, lite_open: bigint, lite_prefix: string, lite_locals: { name: string; runtime: string; kind: string; mutable: boolean; writable: boolean; depth: bigint; constant: boolean; code: string; intValue: bigint; textValue: string }[], lite_operation: string): { runtime: string; kind: string; next: bigint } {
        void lite_source;
        void lite_open;
        void lite_prefix;
        void lite_locals;
        void lite_operation;
        let lite_cursor = liteFn_skipTrivia(lite_source, (lite_open + 1n), lite_prefix);
        void lite_cursor;
        if ((!(liteFn_wordAt(lite_source, lite_cursor, "mut")))) {
            liteFn_failAt(lite_source, lite_cursor, lite_prefix, ((lite_operation) + (" requires mut list argument")));
        }
        lite_cursor = liteFn_skipTrivia(lite_source, (lite_cursor + 3n), lite_prefix);
        if (((((lite_cursor) >= (lite$textLength(lite_source)))) || ((!(liteFn_isNameStart(lite$textAt(lite_source, lite_cursor))))))) {
            liteFn_failAt(lite_source, lite_cursor, lite_prefix, "expected a list name after mut");
        }
        const lite_nameEnd = liteFn_skipName(lite_source, lite_cursor);
        void lite_nameEnd;
        const lite_listName = lite$textSlice(lite_source, lite_cursor, lite_nameEnd);
        void lite_listName;
        const lite_index = liteFn_localIndex([...(lite_locals)], lite_listName);
        void lite_index;
        if (((lite_index) < (0n))) {
            liteFn_failAt(lite_source, lite_cursor, lite_prefix, (("unknown value ") + (lite_listName)));
            return { runtime: "", kind: "", next: lite_nameEnd };
        }
        const lite_entry = lite$listAt((lite_locals), lite_index);
        void lite_entry;
        if ((!(liteFn_isListKind((lite_entry).kind)))) {
            liteFn_failAt(lite_source, lite_cursor, lite_prefix, ((((lite_operation) + (" requires a List value, got "))) + (liteFn_displayKind((lite_entry).kind))));
        }
        if ((!((lite_entry).writable))) {
            liteFn_failAt(lite_source, lite_cursor, lite_prefix, (((("cannot mutate list ") + (lite_listName))) + (" without mut")));
        }
        return { runtime: (lite_entry).runtime, kind: (lite_entry).kind, next: lite_nameEnd };
    }
    void liteFn_parseListGrant;
    function liteFn_parseBinary(lite_source: string, lite_position: bigint, lite_prefix: string, lite_locals: { name: string; runtime: string; kind: string; mutable: boolean; writable: boolean; depth: bigint; constant: boolean; code: string; intValue: bigint; textValue: string }[], lite_functions: { name: string; result: string; first: bigint; count: bigint }[], lite_params: string[], lite_currentName: string, lite_expected: string, lite_minimum: bigint): { kind: string; code: string; intValue: bigint; textValue: string; constant: boolean; next: bigint } {
        void lite_source;
        void lite_position;
        void lite_prefix;
        void lite_locals;
        void lite_functions;
        void lite_params;
        void lite_currentName;
        void lite_expected;
        void lite_minimum;
        let lite_start = liteFn_skipTrivia(lite_source, lite_position, lite_prefix);
        void lite_start;
        if (((lite_start) >= (lite$textLength(lite_source)))) {
            liteFn_failAt(lite_source, lite_start, lite_prefix, "expected an Int, String or Bool expression");
        }
        let lite_leaderStart = (-1n);
        void lite_leaderStart;
        let lite_leaderText = "";
        void lite_leaderText;
        if (((((lite_minimum) === (0n))) && ((((liteFn_wordAt(lite_source, lite_start, "and")) || (liteFn_wordAt(lite_source, lite_start, "or"))))))) {
            lite_leaderStart = lite_start;
            const lite_leaderEnd = liteFn_skipName(lite_source, lite_start);
            void lite_leaderEnd;
            lite_leaderText = lite$textSlice(lite_source, lite_start, lite_leaderEnd);
            lite_start = liteFn_skipTrivia(lite_source, lite_leaderEnd, lite_prefix);
            if (((liteFn_wordAt(lite_source, lite_start, "and")) || (liteFn_wordAt(lite_source, lite_start, "or")))) {
                liteFn_failAt(lite_source, lite_start, lite_prefix, (((("leading ") + (lite_leaderText))) + (" may appear only once")));
            }
        }
        let lite_left = liteFn_intParsed("", 0n, true, lite_start);
        void lite_left;
        const lite_ch = lite$textAt(lite_source, lite_start);
        void lite_ch;
        if (((lite_ch) === ("("))) {
            if (liteFn_looksLikeTupleEntry(lite_source, (lite_start + 1n), lite_prefix)) {
                let lite_cursor = liteFn_skipTrivia(lite_source, (lite_start + 1n), lite_prefix);
                void lite_cursor;
                const lite_labels: string[] = [...([])];
                void lite_labels;
                const lite_codes: string[] = [...([])];
                void lite_codes;
                const lite_kinds: string[] = [...([])];
                void lite_kinds;
                let lite_count = 0n;
                void lite_count;
                while (Boolean(true)) {
                    if (((((lite_cursor) >= (lite$textLength(lite_source)))) || ((!(liteFn_isNameStart(lite$textAt(lite_source, lite_cursor))))))) {
                        liteFn_failAt(lite_source, lite_cursor, lite_prefix, "expected a tuple field name");
                    }
                    const lite_labelStart = lite_cursor;
                    void lite_labelStart;
                    lite_cursor = liteFn_skipName(lite_source, lite_cursor);
                    const lite_label = lite$textSlice(lite_source, lite_labelStart, lite_cursor);
                    void lite_label;
                    if (liteFn_isReservedWord(lite_label)) {
                        liteFn_unsupportedFeature(lite_source, lite_labelStart, lite_label, lite_prefix);
                    }
                    if (liteFn_listContainsText([...(lite_labels)], lite_label)) {
                        liteFn_failAt(lite_source, lite_labelStart, lite_prefix, (("duplicate tuple field ") + (lite_label)));
                    }
                    lite_labels.push(lite_label);
                    lite_cursor = liteFn_skipTrivia(lite_source, lite_cursor, lite_prefix);
                    if (((((((lite_cursor) >= (lite$textLength(lite_source)))) || (((lite$textAt(lite_source, lite_cursor)) !== ("="))))) || (liteFn_startsWithAt(lite_source, lite_cursor, "==")))) {
                        liteFn_failAt(lite_source, lite_cursor, lite_prefix, (("expected = after tuple field ") + (lite_label)));
                    }
                    lite_cursor = liteFn_skipTrivia(lite_source, (lite_cursor + 1n), lite_prefix);
                    const lite_value = liteFn_parseBinary(lite_source, lite_cursor, lite_prefix, [...(lite_locals)], [...(lite_functions)], [...(lite_params)], lite_currentName, "", 0n);
                    void lite_value;
                    if (liteFn_isTupleKind((lite_value).kind)) {
                        liteFn_failAt(lite_source, lite_cursor, lite_prefix, "nested tuple values are not supported");
                    }
                    if (liteFn_isListKind((lite_value).kind)) {
                        liteFn_failAt(lite_source, lite_cursor, lite_prefix, "list values inside tuples are not supported");
                    }
                    if ((((lite_value).kind) === ("Unit"))) {
                        liteFn_failAt(lite_source, lite_cursor, lite_prefix, (((("tuple field ") + (lite_label))) + (" cannot be Unit")));
                    }
                    lite_codes.push((lite_value).code);
                    lite_kinds.push((lite_value).kind);
                    lite_count = (lite_count + 1n);
                    lite_cursor = liteFn_skipTrivia(lite_source, (lite_value).next, lite_prefix);
                    if (((((lite_cursor) < (lite$textLength(lite_source)))) && (((lite$textAt(lite_source, lite_cursor)) === (","))))) {
                        lite_cursor = liteFn_skipTrivia(lite_source, (lite_cursor + 1n), lite_prefix);
                    } else {
                        break;
                    }
                }
                lite_cursor = liteFn_expectSymbol(lite_source, lite_cursor, ")", lite_prefix);
                let lite_kindText = "(";
                void lite_kindText;
                let lite_codeText = "{ ";
                void lite_codeText;
                let lite_index = 0n;
                void lite_index;
                while (((lite_index) < (lite_count))) {
                    if (((lite_index) > (0n))) {
                        lite_kindText = ((lite_kindText) + (","));
                        lite_codeText = ((lite_codeText) + (", "));
                    }
                    lite_kindText = ((((((lite_kindText) + (lite$listAt((lite_labels), lite_index)))) + (":"))) + (lite$listAt((lite_kinds), lite_index)));
                    lite_codeText = ((((((lite_codeText) + (lite$listAt((lite_labels), lite_index)))) + (": "))) + (lite$listAt((lite_codes), lite_index)));
                    lite_index = (lite_index + 1n);
                }
                lite_left = { kind: ((lite_kindText) + (")")), code: ((lite_codeText) + (" }")), intValue: 0n, textValue: "", constant: false, next: lite_cursor };
            } else {
                const lite_inner = liteFn_parseBinary(lite_source, (lite_start + 1n), lite_prefix, [...(lite_locals)], [...(lite_functions)], [...(lite_params)], lite_currentName, lite_expected, 0n);
                void lite_inner;
                const lite_next = liteFn_expectSymbol(lite_source, liteFn_skipTrivia(lite_source, (lite_inner).next, lite_prefix), ")", lite_prefix);
                void lite_next;
                lite_left = { kind: (lite_inner).kind, code: (((("(") + ((lite_inner).code))) + (")")), intValue: (lite_inner).intValue, textValue: (lite_inner).textValue, constant: (lite_inner).constant, next: lite_next };
            }
        } else if (((((lite_ch) === ("+"))) || (((lite_ch) === ("-"))))) {
            const lite_after = liteFn_skipTrivia(lite_source, (lite_start + 1n), lite_prefix);
            void lite_after;
            if (((((lite_after) < (lite$textLength(lite_source)))) && (liteFn_isDigit(lite$textAt(lite_source, lite_after))))) {
                lite_left = liteFn_parseInteger(lite_source, lite_start, lite_prefix);
            } else {
                const lite_operand = liteFn_parseBinary(lite_source, (lite_start + 1n), lite_prefix, [...(lite_locals)], [...(lite_functions)], [...(lite_params)], lite_currentName, "", 30n);
                void lite_operand;
                if ((((lite_operand).kind) !== ("Int"))) {
                    liteFn_failAt(lite_source, lite_start, lite_prefix, (((("unary ") + (lite_ch))) + (" requires an Int operand")));
                }
                const lite_code = (Boolean(((lite_ch) === ("-"))) ? (((("(-") + ((lite_operand).code))) + (")")) : (((("(") + ((lite_operand).code))) + (")")));
                void lite_code;
                if ((lite_operand).constant) {
                    const lite_value = (Boolean(((lite_ch) === ("-"))) ? liteFn_negateInteger(lite_source, lite_start, (lite_operand).intValue, lite_prefix) : (lite_operand).intValue);
                    void lite_value;
                    lite_left = liteFn_intParsed(lite_code, lite_value, true, (lite_operand).next);
                } else {
                    lite_left = liteFn_intParsed(lite_code, 0n, false, (lite_operand).next);
                }
            }
        } else if (liteFn_isDigit(lite_ch)) {
            lite_left = liteFn_parseInteger(lite_source, lite_start, lite_prefix);
        } else if (((lite_ch) === ("\""))) {
            lite_left = liteFn_parseText(lite_source, lite_start, lite_prefix);
        } else if (((lite_ch) === ("["))) {
            let lite_cursor = liteFn_skipTrivia(lite_source, (lite_start + 1n), lite_prefix);
            void lite_cursor;
            let lite_elementKind = "";
            void lite_elementKind;
            if (liteFn_isListKind(lite_expected)) {
                lite_elementKind = liteFn_listElementKind(lite_expected);
            }
            const lite_elementCodes: string[] = [...([])];
            void lite_elementCodes;
            let lite_count = 0n;
            void lite_count;
            while (Boolean(true)) {
                if (((lite_cursor) >= (lite$textLength(lite_source)))) {
                    liteFn_failAt(lite_source, lite_cursor, lite_prefix, "expected ] in list literal");
                }
                if (((lite$textAt(lite_source, lite_cursor)) === ("]"))) {
                    break;
                }
                const lite_elementStart = lite_cursor;
                void lite_elementStart;
                const lite_element = liteFn_parseBinary(lite_source, lite_cursor, lite_prefix, [...(lite_locals)], [...(lite_functions)], [...(lite_params)], lite_currentName, lite_elementKind, 0n);
                void lite_element;
                if ((((lite_element).kind) === ("Unit"))) {
                    liteFn_failAt(lite_source, lite_elementStart, lite_prefix, (((("list element ") + (liteFn_decimalText((lite_count + 1n))))) + (" cannot be Unit")));
                }
                if (liteFn_isListKind((lite_element).kind)) {
                    liteFn_failAt(lite_source, lite_elementStart, lite_prefix, "nested list types are not supported");
                }
                if (((lite_elementKind) === (""))) {
                    lite_elementKind = (lite_element).kind;
                } else if ((((lite_element).kind) !== (lite_elementKind))) {
                    liteFn_failAt(lite_source, lite_elementStart, lite_prefix, (((((((((("list element ") + (liteFn_decimalText((lite_count + 1n))))) + (" must be "))) + (liteFn_displayKind(lite_elementKind)))) + (", got "))) + (liteFn_displayKind((lite_element).kind))));
                }
                lite_elementCodes.push((lite_element).code);
                lite_count = (lite_count + 1n);
                lite_cursor = liteFn_skipTrivia(lite_source, (lite_element).next, lite_prefix);
                if (((((lite_cursor) < (lite$textLength(lite_source)))) && (((lite$textAt(lite_source, lite_cursor)) === (","))))) {
                    lite_cursor = liteFn_skipTrivia(lite_source, (lite_cursor + 1n), lite_prefix);
                } else {
                    break;
                }
            }
            lite_cursor = liteFn_expectSymbol(lite_source, lite_cursor, "]", lite_prefix);
            if (((((lite_count) === (0n))) && (((lite_elementKind) === (""))))) {
                liteFn_failAt(lite_source, lite_start, lite_prefix, "empty list literal requires a List element type");
            }
            lite_left = { kind: (((("List<") + (lite_elementKind))) + (">")), code: (((("[") + (liteFn_joinTexts([...(lite_elementCodes)], ", ")))) + ("]")), intValue: 0n, textValue: "", constant: false, next: lite_cursor };
        } else if (liteFn_isNameStart(lite_ch)) {
            const lite_nameStart = lite_start;
            void lite_nameStart;
            const lite_next = liteFn_skipName(lite_source, lite_start);
            void lite_next;
            const lite_name = lite$textSlice(lite_source, lite_nameStart, lite_next);
            void lite_name;
            if (((lite_name) === ("true"))) {
                lite_left = liteFn_boolParsed(liteFn_boolLiteralCode(true), true, true, lite_next);
            } else if (((lite_name) === ("false"))) {
                lite_left = liteFn_boolParsed(liteFn_boolLiteralCode(false), false, true, lite_next);
            } else if (((lite_name) === ("not"))) {
                const lite_operand = liteFn_parseBinary(lite_source, lite_next, lite_prefix, [...(lite_locals)], [...(lite_functions)], [...(lite_params)], lite_currentName, "", 5n);
                void lite_operand;
                if ((((lite_operand).kind) !== ("Bool"))) {
                    liteFn_failAt(lite_source, lite_nameStart, lite_prefix, "not requires a Bool operand");
                }
                if ((lite_operand).constant) {
                    const lite_value = (((lite_operand).intValue) === (0n));
                    void lite_value;
                    lite_left = liteFn_boolParsed(liteFn_boolLiteralCode(lite_value), lite_value, true, (lite_operand).next);
                } else {
                    lite_left = liteFn_boolParsed(liteFn_notCode((lite_operand).code), false, false, (lite_operand).next);
                }
            } else if (((lite_name) === ("if"))) {
                let lite_cursor = liteFn_skipTrivia(lite_source, lite_next, lite_prefix);
                void lite_cursor;
                const lite_conditionStart = lite_cursor;
                void lite_conditionStart;
                const lite_condition = liteFn_parseBinary(lite_source, lite_cursor, lite_prefix, [...(lite_locals)], [...(lite_functions)], [...(lite_params)], lite_currentName, "", 0n);
                void lite_condition;
                if ((((lite_condition).kind) !== ("Bool"))) {
                    liteFn_failAt(lite_source, lite_conditionStart, lite_prefix, "if condition must be Bool");
                }
                const lite_conditionCode = (Boolean((lite_condition).constant) ? liteFn_boolLiteralCode((((lite_condition).intValue) !== (0n))) : (lite_condition).code);
                void lite_conditionCode;
                lite_cursor = liteFn_expectSymbol(lite_source, liteFn_skipTrivia(lite_source, (lite_condition).next, lite_prefix), "{", lite_prefix);
                const lite_branchStart = liteFn_skipTrivia(lite_source, (lite_cursor + 1n), lite_prefix);
                void lite_branchStart;
                const lite_first = liteFn_parseBinary(lite_source, lite_branchStart, lite_prefix, [...(lite_locals)], [...(lite_functions)], [...(lite_params)], lite_currentName, lite_expected, 0n);
                void lite_first;
                lite_cursor = liteFn_expectSymbol(lite_source, liteFn_skipTrivia(lite_source, (lite_first).next, lite_prefix), "}", lite_prefix);
                const lite_conditionCodes: string[] = [...([])];
                void lite_conditionCodes;
                const lite_branchCodes: string[] = [...([])];
                void lite_branchCodes;
                lite_conditionCodes.push(lite_conditionCode);
                lite_branchCodes.push((lite_first).code);
                let lite_resultKind = (lite_first).kind;
                void lite_resultKind;
                let lite_branchCount = 1n;
                void lite_branchCount;
                while (Boolean(true)) {
                    const lite_afterBranch = liteFn_skipTrivia(lite_source, lite_cursor, lite_prefix);
                    void lite_afterBranch;
                    if ((!(liteFn_wordAt(lite_source, lite_afterBranch, "else")))) {
                        liteFn_failAt(lite_source, lite_afterBranch, lite_prefix, "value if requires a final else");
                    }
                    const lite_afterElse = liteFn_skipTrivia(lite_source, (lite_afterBranch + 4n), lite_prefix);
                    void lite_afterElse;
                    if (liteFn_wordAt(lite_source, lite_afterElse, "if")) {
                        const lite_elseConditionStart = liteFn_skipTrivia(lite_source, (lite_afterElse + 2n), lite_prefix);
                        void lite_elseConditionStart;
                        const lite_elseCondition = liteFn_parseBinary(lite_source, lite_elseConditionStart, lite_prefix, [...(lite_locals)], [...(lite_functions)], [...(lite_params)], lite_currentName, "", 0n);
                        void lite_elseCondition;
                        if ((((lite_elseCondition).kind) !== ("Bool"))) {
                            liteFn_failAt(lite_source, lite_elseConditionStart, lite_prefix, "if condition must be Bool");
                        }
                        const lite_elseConditionCode = (Boolean((lite_elseCondition).constant) ? liteFn_boolLiteralCode((((lite_elseCondition).intValue) !== (0n))) : (lite_elseCondition).code);
                        void lite_elseConditionCode;
                        const lite_open = liteFn_expectSymbol(lite_source, liteFn_skipTrivia(lite_source, (lite_elseCondition).next, lite_prefix), "{", lite_prefix);
                        void lite_open;
                        const lite_elseBranchStart = liteFn_skipTrivia(lite_source, (lite_open + 1n), lite_prefix);
                        void lite_elseBranchStart;
                        const lite_branch = liteFn_parseBinary(lite_source, lite_elseBranchStart, lite_prefix, [...(lite_locals)], [...(lite_functions)], [...(lite_params)], lite_currentName, lite_expected, 0n);
                        void lite_branch;
                        if ((((lite_branch).kind) !== (lite_resultKind))) {
                            liteFn_failAt(lite_source, lite_elseBranchStart, lite_prefix, (((((("value if branches must have the same kind, got ") + (liteFn_displayKind(lite_resultKind)))) + (" and "))) + (liteFn_displayKind((lite_branch).kind))));
                        }
                        lite_cursor = liteFn_expectSymbol(lite_source, liteFn_skipTrivia(lite_source, (lite_branch).next, lite_prefix), "}", lite_prefix);
                        lite_conditionCodes.push(lite_elseConditionCode);
                        lite_branchCodes.push((lite_branch).code);
                        lite_branchCount = (lite_branchCount + 1n);
                    } else {
                        const lite_open = liteFn_expectSymbol(lite_source, lite_afterElse, "{", lite_prefix);
                        void lite_open;
                        const lite_elseBranchStart = liteFn_skipTrivia(lite_source, (lite_open + 1n), lite_prefix);
                        void lite_elseBranchStart;
                        const lite_branch = liteFn_parseBinary(lite_source, lite_elseBranchStart, lite_prefix, [...(lite_locals)], [...(lite_functions)], [...(lite_params)], lite_currentName, lite_expected, 0n);
                        void lite_branch;
                        if ((((lite_branch).kind) !== (lite_resultKind))) {
                            liteFn_failAt(lite_source, lite_elseBranchStart, lite_prefix, (((((("value if branches must have the same kind, got ") + (liteFn_displayKind(lite_resultKind)))) + (" and "))) + (liteFn_displayKind((lite_branch).kind))));
                        }
                        lite_cursor = liteFn_expectSymbol(lite_source, liteFn_skipTrivia(lite_source, (lite_branch).next, lite_prefix), "}", lite_prefix);
                        lite_branchCodes.push((lite_branch).code);
                        lite_branchCount = (lite_branchCount + 1n);
                        break;
                    }
                }
                let lite_code = lite$listAt((lite_branchCodes), (lite_branchCount - 1n));
                void lite_code;
                let lite_index = (lite_branchCount - 2n);
                void lite_index;
                while (((lite_index) >= (0n))) {
                    lite_code = (((((((((((("(Boolean(") + (lite$listAt((lite_conditionCodes), lite_index)))) + (") ? "))) + (lite$listAt((lite_branchCodes), lite_index)))) + (" : "))) + (lite_code))) + (")"));
                    lite_index = (lite_index - 1n);
                }
                lite_left = { kind: lite_resultKind, code: lite_code, intValue: 0n, textValue: "", constant: false, next: lite_cursor };
            } else {
                if (liteFn_isReservedWord(lite_name)) {
                    liteFn_unsupportedFeature(lite_source, lite_nameStart, lite_name, lite_prefix);
                }
                const lite_afterName = liteFn_skipTrivia(lite_source, lite_next, lite_prefix);
                void lite_afterName;
                let lite_callableIndex = liteFn_findFunction([...(lite_functions)], lite_name);
                void lite_callableIndex;
                let lite_calleeName = lite_name;
                void lite_calleeName;
                if (((lite_name) === ("self"))) {
                    if (((lite_currentName) === (""))) {
                        liteFn_failAt(lite_source, lite_nameStart, lite_prefix, "self is only available inside a function");
                    }
                    lite_calleeName = lite_currentName;
                    lite_callableIndex = liteFn_findFunction([...(lite_functions)], lite_currentName);
                }
                if (((((((lite_callableIndex) >= (0n))) && (((lite_afterName) < (lite$textLength(lite_source)))))) && (((lite$textAt(lite_source, lite_afterName)) === ("("))))) {
                    const lite_info = lite$listAt((lite_functions), lite_callableIndex);
                    void lite_info;
                    let lite_cursor = liteFn_skipTrivia(lite_source, (lite_afterName + 1n), lite_prefix);
                    void lite_cursor;
                    const lite_argumentCodes: string[] = [...([])];
                    void lite_argumentCodes;
                    let lite_argumentCount = 0n;
                    void lite_argumentCount;
                    if (((((lite_cursor) < (lite$textLength(lite_source)))) && (((lite$textAt(lite_source, lite_cursor)) !== (")"))))) {
                        while (Boolean(true)) {
                            if (((lite_argumentCount) >= ((lite_info).count))) {
                                const lite_suffix = (Boolean((((lite_info).count) === (1n))) ? " argument" : " arguments");
                                void lite_suffix;
                                liteFn_failAt(lite_source, lite_nameStart, lite_prefix, (((((((((("function ") + (lite_calleeName))) + (" expects "))) + (liteFn_decimalText((lite_info).count)))) + (lite_suffix))) + (", got more")));
                            }
                            const lite_expected = liteFn_paramKindOf(lite$listAt((lite_params), ((lite_info).first + lite_argumentCount)));
                            void lite_expected;
                            const lite_argument = liteFn_parseBinary(lite_source, lite_cursor, lite_prefix, [...(lite_locals)], [...(lite_functions)], [...(lite_params)], lite_currentName, lite_expected, 0n);
                            void lite_argument;
                            if ((((lite_argument).kind) !== (lite_expected))) {
                                liteFn_failAt(lite_source, lite_cursor, lite_prefix, (((((((((((((("argument ") + (liteFn_decimalText((lite_argumentCount + 1n))))) + (" of "))) + (lite_calleeName))) + (" must be "))) + (liteFn_displayKind(lite_expected)))) + (", got "))) + (liteFn_displayKind((lite_argument).kind))));
                            }
                            lite_argumentCodes.push(liteFn_copiedValueCode((lite_argument).kind, (lite_argument).code));
                            lite_argumentCount = (lite_argumentCount + 1n);
                            lite_cursor = liteFn_skipTrivia(lite_source, (lite_argument).next, lite_prefix);
                            if (((((lite_cursor) < (lite$textLength(lite_source)))) && (((lite$textAt(lite_source, lite_cursor)) === (","))))) {
                                lite_cursor = liteFn_skipTrivia(lite_source, (lite_cursor + 1n), lite_prefix);
                            } else {
                                break;
                            }
                        }
                    }
                    lite_cursor = liteFn_expectSymbol(lite_source, lite_cursor, ")", lite_prefix);
                    if (((lite_argumentCount) !== ((lite_info).count))) {
                        const lite_suffix = (Boolean((((lite_info).count) === (1n))) ? " argument" : " arguments");
                        void lite_suffix;
                        liteFn_failAt(lite_source, lite_nameStart, lite_prefix, (((((((((((("function ") + (lite_calleeName))) + (" expects "))) + (liteFn_decimalText((lite_info).count)))) + (lite_suffix))) + (", got "))) + (liteFn_decimalText(lite_argumentCount))));
                    }
                    lite_left = { kind: (lite_info).result, code: (((((((("liteFn_") + (lite_calleeName))) + ("("))) + (liteFn_joinTexts([...(lite_argumentCodes)], ", ")))) + (")")), intValue: 0n, textValue: "", constant: false, next: lite_cursor };
                } else if (((lite_callableIndex) >= (0n))) {
                    liteFn_failAt(lite_source, lite_nameStart, lite_prefix, (((("function ") + (lite_calleeName))) + (" must be called")));
                } else if (liteFn_isAdmittedBuiltin(lite_name)) {
                    if (((((lite_afterName) >= (lite$textLength(lite_source)))) || (((lite$textAt(lite_source, lite_afterName)) !== ("("))))) {
                        liteFn_failAt(lite_source, lite_nameStart, lite_prefix, ((lite_name) + (" must be called")));
                    }
                    let lite_builtinCursor = liteFn_skipTrivia(lite_source, (lite_afterName + 1n), lite_prefix);
                    void lite_builtinCursor;
                    const lite_builtinArityCount = liteFn_builtinArity(lite_name);
                    void lite_builtinArityCount;
                    const lite_builtinCodes: string[] = [...([])];
                    void lite_builtinCodes;
                    let lite_builtinCount = 0n;
                    void lite_builtinCount;
                    if (((lite_builtinArityCount) === (0n))) {
                        if (((((lite_builtinCursor) < (lite$textLength(lite_source)))) && (((lite$textAt(lite_source, lite_builtinCursor)) !== (")"))))) {
                            liteFn_failAt(lite_source, lite_nameStart, lite_prefix, ((lite_name) + (" expects no arguments")));
                        }
                    } else {
                        if (((((lite_builtinCursor) < (lite$textLength(lite_source)))) && (((lite$textAt(lite_source, lite_builtinCursor)) !== (")"))))) {
                            while (Boolean(true)) {
                                if (((lite_builtinCount) >= (lite_builtinArityCount))) {
                                    const lite_suffix = (Boolean(((lite_builtinArityCount) === (1n))) ? " argument" : " arguments");
                                    void lite_suffix;
                                    liteFn_failAt(lite_source, lite_nameStart, lite_prefix, ((((((((lite_name) + (" expects "))) + (liteFn_decimalText(lite_builtinArityCount)))) + (lite_suffix))) + (", got more")));
                                }
                                const lite_builtinExpected = liteFn_builtinParameterKind(lite_name, lite_builtinCount);
                                void lite_builtinExpected;
                                const lite_builtinStart = lite_builtinCursor;
                                void lite_builtinStart;
                                const lite_builtinValue = liteFn_parseBinary(lite_source, lite_builtinCursor, lite_prefix, [...(lite_locals)], [...(lite_functions)], [...(lite_params)], lite_currentName, lite_builtinExpected, 0n);
                                void lite_builtinValue;
                                if ((((lite_builtinValue).kind) !== (lite_builtinExpected))) {
                                    liteFn_failAt(lite_source, lite_builtinStart, lite_prefix, (((((((((((((("argument ") + (liteFn_decimalText((lite_builtinCount + 1n))))) + (" of "))) + (lite_name))) + (" must be "))) + (liteFn_displayKind(lite_builtinExpected)))) + (", got "))) + (liteFn_displayKind((lite_builtinValue).kind))));
                                }
                                lite_builtinCodes.push((lite_builtinValue).code);
                                lite_builtinCount = (lite_builtinCount + 1n);
                                lite_builtinCursor = liteFn_skipTrivia(lite_source, (lite_builtinValue).next, lite_prefix);
                                if (((((lite_builtinCursor) < (lite$textLength(lite_source)))) && (((lite$textAt(lite_source, lite_builtinCursor)) === (","))))) {
                                    lite_builtinCursor = liteFn_skipTrivia(lite_source, (lite_builtinCursor + 1n), lite_prefix);
                                } else {
                                    break;
                                }
                            }
                        }
                    }
                    lite_builtinCursor = liteFn_expectSymbol(lite_source, lite_builtinCursor, ")", lite_prefix);
                    if (((lite_builtinCount) !== (lite_builtinArityCount))) {
                        const lite_suffix = (Boolean(((lite_builtinArityCount) === (1n))) ? " argument" : " arguments");
                        void lite_suffix;
                        liteFn_failAt(lite_source, lite_nameStart, lite_prefix, ((((((((((lite_name) + (" expects "))) + (liteFn_decimalText(lite_builtinArityCount)))) + (lite_suffix))) + (", got "))) + (liteFn_decimalText(lite_builtinCount))));
                    }
                    lite_left = { kind: liteFn_builtinResultKind(lite_name), code: (((((((("lite$") + (lite_name))) + ("("))) + (liteFn_joinTexts([...(lite_builtinCodes)], ", ")))) + (")")), intValue: 0n, textValue: "", constant: false, next: lite_builtinCursor };
                } else if (((((((lite_name) === ("push_back"))) && (((lite_afterName) < (lite$textLength(lite_source)))))) && (((lite$textAt(lite_source, lite_afterName)) === ("("))))) {
                    const lite_grant = liteFn_parseListGrant(lite_source, lite_afterName, lite_prefix, [...(lite_locals)], "push_back");
                    void lite_grant;
                    let lite_cursor = liteFn_skipTrivia(lite_source, (lite_grant).next, lite_prefix);
                    void lite_cursor;
                    if (((((lite_cursor) >= (lite$textLength(lite_source)))) || (((lite$textAt(lite_source, lite_cursor)) !== (","))))) {
                        liteFn_failAt(lite_source, lite_cursor, lite_prefix, "push_back expects a value after the mut list");
                    }
                    const lite_valueStart = liteFn_skipTrivia(lite_source, (lite_cursor + 1n), lite_prefix);
                    void lite_valueStart;
                    const lite_elementKind = liteFn_listElementKind((lite_grant).kind);
                    void lite_elementKind;
                    const lite_value = liteFn_parseBinary(lite_source, lite_valueStart, lite_prefix, [...(lite_locals)], [...(lite_functions)], [...(lite_params)], lite_currentName, lite_elementKind, 0n);
                    void lite_value;
                    if ((((lite_value).kind) !== (lite_elementKind))) {
                        liteFn_failAt(lite_source, lite_valueStart, lite_prefix, (((((("push_back element must be ") + (liteFn_displayKind(lite_elementKind)))) + (", got "))) + (liteFn_displayKind((lite_value).kind))));
                    }
                    const lite_close = liteFn_expectSymbol(lite_source, liteFn_skipTrivia(lite_source, (lite_value).next, lite_prefix), ")", lite_prefix);
                    void lite_close;
                    lite_left = { kind: "Unit", code: (((((((lite_grant).runtime) + (".push("))) + ((lite_value).code))) + (")")), intValue: 0n, textValue: "", constant: false, next: lite_close };
                } else if (((((((lite_name) === ("pop_back"))) && (((lite_afterName) < (lite$textLength(lite_source)))))) && (((lite$textAt(lite_source, lite_afterName)) === ("("))))) {
                    const lite_grant = liteFn_parseListGrant(lite_source, lite_afterName, lite_prefix, [...(lite_locals)], "pop_back");
                    void lite_grant;
                    const lite_close = liteFn_expectSymbol(lite_source, liteFn_skipTrivia(lite_source, (lite_grant).next, lite_prefix), ")", lite_prefix);
                    void lite_close;
                    lite_left = { kind: liteFn_listElementKind((lite_grant).kind), code: (((("lite$listPopBack(") + ((lite_grant).runtime))) + (")")), intValue: 0n, textValue: "", constant: false, next: lite_close };
                } else {
                    const lite_index = liteFn_localIndex([...(lite_locals)], lite_name);
                    void lite_index;
                    if (((lite_index) < (0n))) {
                        liteFn_failAt(lite_source, lite_nameStart, lite_prefix, (("unknown value ") + (lite_name)));
                    }
                    const lite_entry = lite$listAt((lite_locals), lite_index);
                    void lite_entry;
                    lite_left = { kind: (lite_entry).kind, code: (lite_entry).runtime, intValue: (lite_entry).intValue, textValue: (lite_entry).textValue, constant: (lite_entry).constant, next: lite_next };
                }
            }
        } else {
            liteFn_failAt(lite_source, lite_start, lite_prefix, "expected an Int, String or Bool expression");
        }
        while (Boolean(true)) {
            const lite_postPosition = liteFn_skipTrivia(lite_source, (lite_left).next, lite_prefix);
            void lite_postPosition;
            if (((((lite_postPosition) < (lite$textLength(lite_source)))) && (((lite$textAt(lite_source, lite_postPosition)) === ("."))))) {
                const lite_labelStart = liteFn_skipTrivia(lite_source, (lite_postPosition + 1n), lite_prefix);
                void lite_labelStart;
                if (((((lite_labelStart) >= (lite$textLength(lite_source)))) || ((!(liteFn_isNameStart(lite$textAt(lite_source, lite_labelStart))))))) {
                    break;
                }
                if ((!(liteFn_isTupleKind((lite_left).kind)))) {
                    liteFn_failAt(lite_source, lite_postPosition, lite_prefix, "field access requires a tuple value");
                }
                const lite_labelEnd = liteFn_skipName(lite_source, lite_labelStart);
                void lite_labelEnd;
                const lite_label = lite$textSlice(lite_source, lite_labelStart, lite_labelEnd);
                void lite_label;
                const lite_fieldKind = liteFn_tupleFieldKind((lite_left).kind, lite_label);
                void lite_fieldKind;
                if (((lite_fieldKind) === (""))) {
                    liteFn_failAt(lite_source, lite_labelStart, lite_prefix, (("tuple has no field ") + (lite_label)));
                }
                lite_left = { kind: lite_fieldKind, code: (((((("(") + ((lite_left).code))) + (")."))) + (lite_label)), intValue: 0n, textValue: "", constant: false, next: lite_labelEnd };
            } else if (((((lite_postPosition) < (lite$textLength(lite_source)))) && (((lite$textAt(lite_source, lite_postPosition)) === ("["))))) {
                if ((!(liteFn_isListKind((lite_left).kind)))) {
                    liteFn_failAt(lite_source, lite_postPosition, lite_prefix, "indexing requires a list value");
                }
                const lite_indexStart = liteFn_skipTrivia(lite_source, (lite_postPosition + 1n), lite_prefix);
                void lite_indexStart;
                const lite_index = liteFn_parseBinary(lite_source, lite_indexStart, lite_prefix, [...(lite_locals)], [...(lite_functions)], [...(lite_params)], lite_currentName, "", 0n);
                void lite_index;
                if ((((lite_index).kind) !== ("Int"))) {
                    liteFn_failAt(lite_source, lite_indexStart, lite_prefix, (("list index must be Int, got ") + (liteFn_displayKind((lite_index).kind))));
                }
                const lite_close = liteFn_skipTrivia(lite_source, (lite_index).next, lite_prefix);
                void lite_close;
                const lite_next = liteFn_expectSymbol(lite_source, lite_close, "]", lite_prefix);
                void lite_next;
                lite_left = { kind: liteFn_listElementKind((lite_left).kind), code: (((((((("lite$listAt((") + ((lite_left).code))) + ("), "))) + ((lite_index).code))) + (")")), intValue: 0n, textValue: "", constant: false, next: lite_next };
            } else {
                break;
            }
        }
        while (Boolean(true)) {
            const lite_operatorPosition = liteFn_skipTrivia(lite_source, (lite_left).next, lite_prefix);
            void lite_operatorPosition;
            if (((lite_operatorPosition) >= (lite$textLength(lite_source)))) {
                break;
            }
            const lite_operator = liteFn_readOperator(lite_source, lite_operatorPosition);
            void lite_operator;
            if ((((lite_operator).text) === (""))) {
                break;
            }
            const lite_level = liteFn_operatorLevel((lite_operator).text);
            void lite_level;
            if (((lite_level) < (lite_minimum))) {
                break;
            }
            const lite_right = liteFn_parseBinary(lite_source, (lite_operatorPosition + (lite_operator).width), lite_prefix, [...(lite_locals)], [...(lite_functions)], [...(lite_params)], lite_currentName, "", (lite_level + 1n));
            void lite_right;
            if ((((((lite_operator).text) === ("and"))) || ((((lite_operator).text) === ("or"))))) {
                if ((((((lite_left).kind) !== ("Bool"))) || ((((lite_right).kind) !== ("Bool"))))) {
                    liteFn_failAt(lite_source, lite_operatorPosition, lite_prefix, (((("operator ") + ((lite_operator).text))) + (" requires Bool operands")));
                }
                if ((((lite_left).constant) && ((lite_right).constant))) {
                    const lite_value = (Boolean((((lite_operator).text) === ("and"))) ? (((((lite_left).intValue) !== (0n))) && ((((lite_right).intValue) !== (0n)))) : (((((lite_left).intValue) !== (0n))) || ((((lite_right).intValue) !== (0n)))));
                    void lite_value;
                    lite_left = liteFn_boolParsed(liteFn_boolLiteralCode(lite_value), lite_value, true, (lite_right).next);
                } else {
                    lite_left = liteFn_boolParsed(liteFn_logicCode((lite_operator).text, (lite_left).code, (lite_right).code), false, false, (lite_right).next);
                }
            } else if (liteFn_isComparison((lite_operator).text)) {
                lite_left = liteFn_compareParsed(lite_source, lite_operatorPosition, (lite_operator).text, lite_left, lite_right, lite_prefix);
            } else if ((((((lite_left).kind) === ("Int"))) && ((((lite_right).kind) === ("Int"))))) {
                if ((((lite_left).constant) && ((lite_right).constant))) {
                    const lite_folded = (Boolean((((lite_operator).text) === ("+"))) ? liteFn_addIntegers(lite_source, lite_operatorPosition, (lite_left).intValue, (lite_right).intValue, lite_prefix) : (Boolean((((lite_operator).text) === ("-"))) ? liteFn_subtractIntegers(lite_source, lite_operatorPosition, (lite_left).intValue, (lite_right).intValue, lite_prefix) : (Boolean((((lite_operator).text) === ("*"))) ? liteFn_multiplyIntegers(lite_source, lite_operatorPosition, (lite_left).intValue, (lite_right).intValue, lite_prefix) : (Boolean((((lite_operator).text) === ("%"))) ? liteFn_remainderIntegers(lite_source, lite_operatorPosition, (lite_left).intValue, (lite_right).intValue, lite_prefix) : (Boolean((((lite_operator).text) === (":/"))) ? liteFn_floorDivideIntegers(lite_source, lite_operatorPosition, (lite_left).intValue, (lite_right).intValue, lite_prefix) : (Boolean((((lite_operator).text) === (":%"))) ? liteFn_floorModuloIntegers(lite_source, lite_operatorPosition, (lite_left).intValue, (lite_right).intValue, lite_prefix) : liteFn_divideIntegers(lite_source, lite_operatorPosition, (lite_left).intValue, (lite_right).intValue, lite_prefix)))))));
                    void lite_folded;
                    const lite_code = (Boolean((((lite_operator).text) === (":/"))) ? liteFn_floorDivCode((lite_left).code, (lite_right).code) : (Boolean((((lite_operator).text) === (":%"))) ? liteFn_floorModCode((lite_left).code, (lite_right).code) : (((((((((((("(") + ((lite_left).code))) + (" "))) + ((lite_operator).text))) + (" "))) + ((lite_right).code))) + (")"))));
                    void lite_code;
                    lite_left = liteFn_intParsed(lite_code, lite_folded, true, (lite_right).next);
                } else if ((((lite_operator).text) === ("/"))) {
                    lite_left = liteFn_intParsed(liteFn_intDivideCode((lite_left).code, (lite_right).code), 0n, false, (lite_right).next);
                } else if ((((lite_operator).text) === ("%"))) {
                    lite_left = liteFn_intParsed(liteFn_intRemainderCode((lite_left).code, (lite_right).code), 0n, false, (lite_right).next);
                } else if ((((lite_operator).text) === (":/"))) {
                    lite_left = liteFn_intParsed(liteFn_intFloorDivideCode((lite_left).code, (lite_right).code), 0n, false, (lite_right).next);
                } else if ((((lite_operator).text) === (":%"))) {
                    lite_left = liteFn_intParsed(liteFn_intFloorModuloCode((lite_left).code, (lite_right).code), 0n, false, (lite_right).next);
                } else {
                    lite_left = liteFn_intParsed((((((((((((("(") + ((lite_left).code))) + (" "))) + ((lite_operator).text))) + (" "))) + ((lite_right).code))) + (")")), 0n, false, (lite_right).next);
                }
            } else if ((((((((lite_operator).text) === ("+"))) && ((((lite_left).kind) === ("String"))))) && ((((lite_right).kind) === ("String"))))) {
                if ((((lite_left).constant) && ((lite_right).constant))) {
                    const lite_combined = (((lite_left).textValue) + ((lite_right).textValue));
                    void lite_combined;
                    lite_left = liteFn_textParsed(liteFn_textLiteralCode(lite_combined), lite_combined, true, (lite_right).next);
                } else {
                    lite_left = liteFn_textParsed(liteFn_concatCode((lite_left).code, (lite_right).code), "", false, (lite_right).next);
                }
            } else if (((liteFn_isListKind((lite_left).kind)) || (liteFn_isListKind((lite_right).kind)))) {
                liteFn_failAt(lite_source, lite_operatorPosition, lite_prefix, (((("operator ") + ((lite_operator).text))) + (" is not supported for list values")));
            } else if ((((lite_operator).text) === ("+"))) {
                liteFn_failAt(lite_source, lite_operatorPosition, lite_prefix, "cannot mix Int and String operands");
            } else {
                liteFn_failAt(lite_source, lite_operatorPosition, lite_prefix, (((("operator ") + ((lite_operator).text))) + (" requires Int operands")));
            }
        }
        if (((((lite_leaderStart) >= (0n))) && ((((lite_left).kind) !== ("Bool"))))) {
            liteFn_failAt(lite_source, lite_leaderStart, lite_prefix, (((("leading ") + (lite_leaderText))) + (" requires a Bool expression")));
        }
        return lite_left;
    }
    void liteFn_parseBinary;
    function liteFn_parseExpressionAs(lite_source: string, lite_position: bigint, lite_prefix: string, lite_locals: { name: string; runtime: string; kind: string; mutable: boolean; writable: boolean; depth: bigint; constant: boolean; code: string; intValue: bigint; textValue: string }[], lite_functions: { name: string; result: string; first: bigint; count: bigint }[], lite_params: string[], lite_currentName: string, lite_expected: string): { kind: string; code: string; intValue: bigint; textValue: string; constant: boolean; next: bigint } {
        void lite_source;
        void lite_position;
        void lite_prefix;
        void lite_locals;
        void lite_functions;
        void lite_params;
        void lite_currentName;
        void lite_expected;
        return liteFn_parseBinary(lite_source, lite_position, lite_prefix, [...(lite_locals)], [...(lite_functions)], [...(lite_params)], lite_currentName, lite_expected, 0n);
    }
    void liteFn_parseExpressionAs;
    function liteFn_parseExpression(lite_source: string, lite_position: bigint, lite_prefix: string, lite_locals: { name: string; runtime: string; kind: string; mutable: boolean; writable: boolean; depth: bigint; constant: boolean; code: string; intValue: bigint; textValue: string }[], lite_functions: { name: string; result: string; first: bigint; count: bigint }[], lite_params: string[], lite_currentName: string): { kind: string; code: string; intValue: bigint; textValue: string; constant: boolean; next: bigint } {
        void lite_source;
        void lite_position;
        void lite_prefix;
        void lite_locals;
        void lite_functions;
        void lite_params;
        void lite_currentName;
        return liteFn_parseBinary(lite_source, lite_position, lite_prefix, [...(lite_locals)], [...(lite_functions)], [...(lite_params)], lite_currentName, "", 0n);
    }
    void liteFn_parseExpression;
    function liteFn_sourcePrefix(): string {
        let lite_prefix = "";
        void lite_prefix;
        let lite_argumentCountValue = 0n;
        void lite_argumentCountValue;
        for (const lite_argument of [...(lite$inputArgs())]) {
            void lite_argument;
            if (((lite_argumentCountValue) === (0n))) {
                lite_prefix = lite_argument;
            }
            lite_argumentCountValue = (lite_argumentCountValue + 1n);
        }
        if (((lite_argumentCountValue) > (1n))) {
            lite$reportError("expected at most one logical source name argument");
            lite$exit(2n);
        }
        return lite_prefix;
    }
    void liteFn_sourcePrefix;
    function liteFn_parseLocalType(lite_source: string, lite_position: bigint, lite_prefix: string, lite_aliases: { name: string; target: string; at: bigint; end: bigint }[]): { kind: string; writable: boolean; next: bigint } {
        void lite_source;
        void lite_position;
        void lite_prefix;
        void lite_aliases;
        const lite_start = liteFn_skipTrivia(lite_source, lite_position, lite_prefix);
        void lite_start;
        let lite_cursor = lite_start;
        void lite_cursor;
        let lite_writable = false;
        void lite_writable;
        if (liteFn_wordAt(lite_source, lite_cursor, "mut")) {
            lite_writable = true;
            lite_cursor = liteFn_skipTrivia(lite_source, (lite_cursor + 3n), lite_prefix);
        }
        const lite_typed = liteFn_parseTypeAt(lite_source, lite_cursor, lite_prefix, [...(lite_aliases)], "local");
        void lite_typed;
        if ((((lite_typed).kind) === ("Unit"))) {
            const lite_name = lite$textSlice(lite_source, lite_cursor, liteFn_skipName(lite_source, lite_cursor));
            void lite_name;
            liteFn_failAt(lite_source, lite_cursor, lite_prefix, (("unsupported local type ") + (lite_name)));
        }
        if (((lite_writable) && ((!(liteFn_isListKind((lite_typed).kind)))))) {
            liteFn_failAt(lite_source, lite_start, lite_prefix, (("mut requires a List type, got ") + (liteFn_displayKind((lite_typed).kind))));
        }
        return { kind: (lite_typed).kind, writable: lite_writable, next: (lite_typed).next };
    }
    void liteFn_parseLocalType;
    function liteFn_tupleZeroParsed(lite_kind: string, lite_next: bigint): { kind: string; code: string; intValue: bigint; textValue: string; constant: boolean; next: bigint } {
        void lite_kind;
        void lite_next;
        const lite_size = lite$textLength(lite_kind);
        void lite_size;
        let lite_cursor = 1n;
        void lite_cursor;
        let lite_code = "{ ";
        void lite_code;
        let lite_count = 0n;
        void lite_count;
        while (((((lite_cursor) < (lite_size))) && (((lite$textAt(lite_kind, lite_cursor)) !== (")"))))) {
            const lite_nameStart = lite_cursor;
            void lite_nameStart;
            lite_cursor = liteFn_skipName(lite_kind, lite_cursor);
            const lite_label = lite$textSlice(lite_kind, lite_nameStart, lite_cursor);
            void lite_label;
            if (((((lite_cursor) < (lite_size))) && (((lite$textAt(lite_kind, lite_cursor)) === (":"))))) {
                lite_cursor = (lite_cursor + 1n);
            }
            const lite_typeStart = lite_cursor;
            void lite_typeStart;
            lite_cursor = liteFn_skipName(lite_kind, lite_cursor);
            const lite_fieldKind = lite$textSlice(lite_kind, lite_typeStart, lite_cursor);
            void lite_fieldKind;
            if (((lite_count) > (0n))) {
                lite_code = ((lite_code) + (", "));
            }
            lite_code = ((((lite_code) + (lite_label))) + (": "));
            if (((lite_fieldKind) === ("Int"))) {
                lite_code = ((lite_code) + ("0n"));
            } else if (((lite_fieldKind) === ("String"))) {
                lite_code = ((lite_code) + ("\"\""));
            } else {
                lite_code = ((lite_code) + ("false"));
            }
            lite_count = (lite_count + 1n);
            if (((((lite_cursor) < (lite_size))) && (((lite$textAt(lite_kind, lite_cursor)) === (","))))) {
                lite_cursor = (lite_cursor + 1n);
            }
        }
        return { kind: lite_kind, code: ((lite_code) + (" }")), intValue: 0n, textValue: "", constant: false, next: lite_next };
    }
    void liteFn_tupleZeroParsed;
    function liteFn_zeroParsed(lite_kind: string, lite_next: bigint): { kind: string; code: string; intValue: bigint; textValue: string; constant: boolean; next: bigint } {
        void lite_kind;
        void lite_next;
        return (Boolean(liteFn_isTupleKind(lite_kind)) ? liteFn_tupleZeroParsed(lite_kind, lite_next) : (Boolean(liteFn_isListKind(lite_kind)) ? { kind: lite_kind, code: "[]", intValue: 0n, textValue: "", constant: false, next: lite_next } : (Boolean(((lite_kind) === ("Int"))) ? liteFn_intParsed(liteFn_intLiteralCode(0n, false, "0"), 0n, true, lite_next) : (Boolean(((lite_kind) === ("String"))) ? liteFn_textParsed(liteFn_textLiteralCode(""), "", true, lite_next) : liteFn_boolParsed(liteFn_boolLiteralCode(false), false, true, lite_next)))));
    }
    void liteFn_zeroParsed;
    function liteFn_storageKind(lite_kind: string): string {
        void lite_kind;
        return (Boolean(liteFn_isListKind(lite_kind)) ? "List" : (Boolean(liteFn_isTupleKind(lite_kind)) ? "Tuple" : lite_kind));
    }
    void liteFn_storageKind;
    function liteFn_itemTextPayload(lite_parsed: { kind: string; code: string; intValue: bigint; textValue: string; constant: boolean; next: bigint }): string {
        void lite_parsed;
        return (Boolean(liteFn_isListKind((lite_parsed).kind)) ? (lite_parsed).kind : (lite_parsed).textValue);
    }
    void liteFn_itemTextPayload;
    function liteFn_scanBraceEnd(lite_source: string, lite_open: bigint, lite_prefix: string): bigint {
        void lite_source;
        void lite_open;
        void lite_prefix;
        const lite_size = lite$textLength(lite_source);
        void lite_size;
        let lite_cursor = lite_open;
        void lite_cursor;
        let lite_depth = 0n;
        void lite_depth;
        while (((lite_cursor) < (lite_size))) {
            const lite_ch = lite$textAt(lite_source, lite_cursor);
            void lite_ch;
            if (((lite_ch) === ("\""))) {
                lite_cursor = liteFn_skipAliasString(lite_source, lite_cursor);
            } else if (liteFn_startsWithAt(lite_source, lite_cursor, "/*")) {
                lite_cursor = liteFn_skipComment(lite_source, lite_cursor, lite_prefix);
            } else if (((lite_ch) === ("{"))) {
                lite_depth = (lite_depth + 1n);
                lite_cursor = (lite_cursor + 1n);
            } else if (((lite_ch) === ("}"))) {
                lite_depth = (lite_depth - 1n);
                lite_cursor = (lite_cursor + 1n);
                if (((lite_depth) === (0n))) {
                    return lite_cursor;
                }
            } else {
                lite_cursor = (lite_cursor + 1n);
            }
        }
        return (-1n);
    }
    void liteFn_scanBraceEnd;
    function liteFn_scanConditionOpen(lite_source: string, lite_start: bigint, lite_prefix: string): bigint {
        void lite_source;
        void lite_start;
        void lite_prefix;
        const lite_size = lite$textLength(lite_source);
        void lite_size;
        let lite_cursor = lite_start;
        void lite_cursor;
        let lite_depth = 0n;
        void lite_depth;
        while (((lite_cursor) < (lite_size))) {
            const lite_ch = lite$textAt(lite_source, lite_cursor);
            void lite_ch;
            if (((lite_ch) === ("\""))) {
                lite_cursor = liteFn_skipAliasString(lite_source, lite_cursor);
            } else if (liteFn_startsWithAt(lite_source, lite_cursor, "/*")) {
                lite_cursor = liteFn_skipComment(lite_source, lite_cursor, lite_prefix);
            } else if (((((lite_ch) === ("("))) || (((lite_ch) === ("["))))) {
                lite_depth = (lite_depth + 1n);
                lite_cursor = (lite_cursor + 1n);
            } else if (((((lite_ch) === (")"))) || (((lite_ch) === ("]"))))) {
                if (((lite_depth) > (0n))) {
                    lite_depth = (lite_depth - 1n);
                }
                lite_cursor = (lite_cursor + 1n);
            } else if (((((lite_ch) === ("{"))) && (((lite_depth) === (0n))))) {
                return lite_cursor;
            } else {
                lite_cursor = (lite_cursor + 1n);
            }
        }
        return (-1n);
    }
    void liteFn_scanConditionOpen;
    function liteFn_valueIfBranchAt(lite_source: string, lite_open: bigint, lite_close: bigint, lite_prefix: string): boolean {
        void lite_source;
        void lite_open;
        void lite_close;
        void lite_prefix;
        let lite_cursor = liteFn_skipTrivia(lite_source, (lite_open + 1n), lite_prefix);
        void lite_cursor;
        if (((lite_cursor) >= (lite_close))) {
            return false;
        }
        if (liteFn_isNameStart(lite$textAt(lite_source, lite_cursor))) {
            const lite_word = lite$textSlice(lite_source, lite_cursor, liteFn_skipName(lite_source, lite_cursor));
            void lite_word;
            if (((((((((((((((((lite_word) === ("return"))) || (((lite_word) === ("report"))))) || (((lite_word) === ("var"))))) || (((lite_word) === ("loop"))))) || (((lite_word) === ("break"))))) || (((lite_word) === ("continue"))))) || (((lite_word) === ("else"))))) || (((lite_word) === ("fn"))))) {
                return false;
            }
        }
        let lite_scan = lite_cursor;
        void lite_scan;
        while (((lite_scan) < (lite_close))) {
            const lite_ch = lite$textAt(lite_source, lite_scan);
            void lite_ch;
            if (((lite_ch) === ("\""))) {
                lite_scan = liteFn_skipAliasString(lite_source, lite_scan);
            } else if (liteFn_startsWithAt(lite_source, lite_scan, "/*")) {
                lite_scan = liteFn_skipComment(lite_source, lite_scan, lite_prefix);
            } else if (((lite_ch) === (";"))) {
                return false;
            } else {
                lite_scan = (lite_scan + 1n);
            }
        }
        return true;
    }
    void liteFn_valueIfBranchAt;
    function liteFn_scanValueIfEnd(lite_source: string, lite_position: bigint, lite_prefix: string, lite_requireValueBranches: boolean): bigint {
        void lite_source;
        void lite_position;
        void lite_prefix;
        void lite_requireValueBranches;
        const lite_size = lite$textLength(lite_source);
        void lite_size;
        let lite_cursor = liteFn_skipTrivia(lite_source, lite_position, lite_prefix);
        void lite_cursor;
        if ((!(liteFn_wordAt(lite_source, lite_cursor, "if")))) {
            return (-1n);
        }
        lite_cursor = liteFn_skipTrivia(lite_source, (lite_cursor + 2n), lite_prefix);
        while (Boolean(true)) {
            const lite_open = liteFn_scanConditionOpen(lite_source, lite_cursor, lite_prefix);
            void lite_open;
            if (((lite_open) < (0n))) {
                return (-1n);
            }
            const lite_end = liteFn_scanBraceEnd(lite_source, lite_open, lite_prefix);
            void lite_end;
            if (((lite_end) < (0n))) {
                return (-1n);
            }
            if (((lite_requireValueBranches) && ((!(liteFn_valueIfBranchAt(lite_source, lite_open, (lite_end - 1n), lite_prefix)))))) {
                return (-1n);
            }
            const lite_after = liteFn_skipTrivia(lite_source, lite_end, lite_prefix);
            void lite_after;
            if ((!(liteFn_wordAt(lite_source, lite_after, "else")))) {
                return (-1n);
            }
            const lite_afterElse = liteFn_skipTrivia(lite_source, (lite_after + 4n), lite_prefix);
            void lite_afterElse;
            if (liteFn_wordAt(lite_source, lite_afterElse, "if")) {
                lite_cursor = liteFn_skipTrivia(lite_source, (lite_afterElse + 2n), lite_prefix);
            } else {
                if (((((lite_afterElse) >= (lite_size))) || (((lite$textAt(lite_source, lite_afterElse)) !== ("{"))))) {
                    return (-1n);
                }
                const lite_finalEnd = liteFn_scanBraceEnd(lite_source, lite_afterElse, lite_prefix);
                void lite_finalEnd;
                if (((lite_finalEnd) < (0n))) {
                    return (-1n);
                }
                if (((lite_requireValueBranches) && ((!(liteFn_valueIfBranchAt(lite_source, lite_afterElse, (lite_finalEnd - 1n), lite_prefix)))))) {
                    return (-1n);
                }
                return lite_finalEnd;
            }
        }
        return (-1n);
    }
    void liteFn_scanValueIfEnd;
    function liteFn_visibleLocals(lite_locals: { name: string; runtime: string; kind: string; mutable: boolean; writable: boolean; depth: bigint; constant: boolean; code: string; intValue: bigint; textValue: string }[], lite_depth: bigint): { name: string; runtime: string; kind: string; mutable: boolean; writable: boolean; depth: bigint; constant: boolean; code: string; intValue: bigint; textValue: string }[] {
        void lite_locals;
        void lite_depth;
        const lite_kept: { name: string; runtime: string; kind: string; mutable: boolean; writable: boolean; depth: bigint; constant: boolean; code: string; intValue: bigint; textValue: string }[] = [...([])];
        void lite_kept;
        for (const lite_entry of [...(lite_locals)]) {
            void lite_entry;
            if ((((lite_entry).depth) < (lite_depth))) {
                lite_kept.push(lite_entry);
            }
        }
        return [...(lite_kept)];
    }
    void liteFn_visibleLocals;
    function liteFn_atValueTail(lite_blocks: string[], lite_blockCount: bigint): boolean {
        void lite_blocks;
        void lite_blockCount;
        if (((lite_blockCount) <= (0n))) {
            return false;
        }
        const lite_kind = lite$listAt((lite_blocks), (lite_blockCount - 1n));
        void lite_kind;
        return ((((lite_kind) === ("function"))) || (((lite_kind) === ("ifvalue"))));
    }
    void liteFn_atValueTail;
    function liteFn_insideLoop(lite_blocks: string[]): boolean {
        void lite_blocks;
        for (const lite_kind of [...(lite_blocks)]) {
            void lite_kind;
            if (((lite_kind) === ("loop"))) {
                return true;
            }
        }
        return false;
    }
    void liteFn_insideLoop;
    function liteFn_parseProgram(lite_source: string, lite_prefix: string): { kind: string; name: string; runtime: string; code: string; intValue: bigint; textValue: string }[] {
        void lite_source;
        void lite_prefix;
        const lite_size = lite$textLength(lite_source);
        void lite_size;
        const lite_aliases: { name: string; target: string; at: bigint; end: bigint }[] = [...(liteFn_collectAliases(lite_source, lite_prefix))];
        void lite_aliases;
        let lite_locals: { name: string; runtime: string; kind: string; mutable: boolean; writable: boolean; depth: bigint; constant: boolean; code: string; intValue: bigint; textValue: string }[] = [...([])];
        void lite_locals;
        const lite_items: { kind: string; name: string; runtime: string; code: string; intValue: bigint; textValue: string }[] = [...([])];
        void lite_items;
        const lite_blocks: string[] = [...([])];
        void lite_blocks;
        const lite_functions: { name: string; result: string; first: bigint; count: bigint }[] = [...([])];
        void lite_functions;
        const lite_functionParams: string[] = [...([])];
        void lite_functionParams;
        let lite_blockCount = 0n;
        void lite_blockCount;
        let lite_depth = 0n;
        void lite_depth;
        let lite_parameterTotal = 0n;
        void lite_parameterTotal;
        let lite_currentName = "";
        void lite_currentName;
        let lite_currentResult = "";
        void lite_currentResult;
        let lite_currentReturned = false;
        void lite_currentReturned;
        let lite_position = liteFn_skipTrivia(lite_source, 0n, lite_prefix);
        void lite_position;
        if (((lite_position) === (lite_size))) {
            liteFn_failAt(lite_source, lite_position, lite_prefix, "expected a statement: report, declaration, assignment, if or loop");
        }
        while (((lite_position) < (lite_size))) {
            const lite_ch = lite$textAt(lite_source, lite_position);
            void lite_ch;
            if (((lite_ch) === ("}"))) {
                if (((lite_blockCount) === (0n))) {
                    liteFn_failAt(lite_source, lite_position, lite_prefix, "unexpected }");
                }
                const lite_blockKind = lite$listAt((lite_blocks), (lite_blockCount - 1n));
                void lite_blockKind;
                const lite_after = liteFn_skipTrivia(lite_source, (lite_position + 1n), lite_prefix);
                void lite_after;
                if ((((((((((lite_blockKind) === ("if"))) || (((lite_blockKind) === ("ifvalue")))))) && (((lite_after) < (lite_size))))) && (liteFn_wordAt(lite_source, lite_after, "else")))) {
                    lite_locals = [...(liteFn_visibleLocals([...(lite_locals)], lite_depth))];
                    const lite_afterElse = liteFn_skipTrivia(lite_source, (lite_after + 4n), lite_prefix);
                    void lite_afterElse;
                    const lite_droppedIf = lite$listPopBack(lite_blocks);
                    void lite_droppedIf;
                    lite_blockCount = (lite_blockCount - 1n);
                    if (liteFn_wordAt(lite_source, lite_afterElse, "if")) {
                        const lite_conditionStart = liteFn_skipTrivia(lite_source, (lite_afterElse + 2n), lite_prefix);
                        void lite_conditionStart;
                        const lite_condition = liteFn_parseExpression(lite_source, lite_conditionStart, lite_prefix, [...(lite_locals)], [...(lite_functions)], [...(lite_functionParams)], lite_currentName);
                        void lite_condition;
                        if ((((lite_condition).kind) !== ("Bool"))) {
                            liteFn_failAt(lite_source, lite_conditionStart, lite_prefix, "else if condition must be Bool");
                        }
                        const lite_conditionCode = (Boolean((lite_condition).constant) ? liteFn_boolLiteralCode((((lite_condition).intValue) !== (0n))) : (lite_condition).code);
                        void lite_conditionCode;
                        lite_position = liteFn_expectSymbol(lite_source, liteFn_skipTrivia(lite_source, (lite_condition).next, lite_prefix), "{", lite_prefix);
                        lite_items.push({ kind: "ElseIf", name: "", runtime: "", code: lite_conditionCode, intValue: 0n, textValue: "" });
                        lite_blocks.push(lite_blockKind);
                        lite_blockCount = (lite_blockCount + 1n);
                    } else {
                        lite_items.push({ kind: "Else", name: "", runtime: "", code: "", intValue: 0n, textValue: "" });
                        lite_blocks.push((Boolean(((lite_blockKind) === ("ifvalue"))) ? "ifvalue" : "else"));
                        lite_blockCount = (lite_blockCount + 1n);
                        lite_position = liteFn_expectSymbol(lite_source, lite_afterElse, "{", lite_prefix);
                    }
                    lite_position = liteFn_skipTrivia(lite_source, (lite_position + 1n), lite_prefix);
                    continue;
                }
                lite_locals = [...(liteFn_visibleLocals([...(lite_locals)], lite_depth))];
                lite_depth = (lite_depth - 1n);
                if (((lite_blockKind) === ("function"))) {
                    if (((((lite_currentResult) !== ("Unit"))) && ((!(lite_currentReturned))))) {
                        liteFn_failAt(lite_source, lite_position, lite_prefix, (((((("function ") + (lite_currentName))) + (" must return "))) + (lite_currentResult)));
                    }
                    lite_items.push({ kind: "FunctionEnd", name: "", runtime: (("liteFn_") + (lite_currentName)), code: "", intValue: 0n, textValue: "" });
                    lite_currentName = "";
                    lite_currentResult = "";
                    lite_currentReturned = false;
                } else if (((lite_blockKind) === ("loop"))) {
                    lite_items.push({ kind: "EndLoop", name: "", runtime: "", code: "", intValue: 0n, textValue: "" });
                } else {
                    lite_items.push({ kind: "EndIf", name: "", runtime: "", code: "", intValue: 0n, textValue: "" });
                }
                const lite_droppedBlock = lite$listPopBack(lite_blocks);
                void lite_droppedBlock;
                lite_blockCount = (lite_blockCount - 1n);
                lite_position = liteFn_skipTrivia(lite_source, (lite_position + 1n), lite_prefix);
                if (((((lite_position) < (lite_size))) && (((lite$textAt(lite_source, lite_position)) === (";"))))) {
                    lite_position = liteFn_skipTrivia(lite_source, (lite_position + 1n), lite_prefix);
                }
                continue;
            }
            if (((((lite_currentName) !== (""))) && ((((((((((((((((((liteFn_isDigit(lite_ch)) || (((lite_ch) === ("\""))))) || (((lite_ch) === ("("))))) || (((lite_ch) === ("["))))) || (((lite_ch) === ("+"))))) || (((lite_ch) === ("-"))))) || (liteFn_wordAt(lite_source, lite_position, "and")))) || (liteFn_wordAt(lite_source, lite_position, "or")))) || (liteFn_wordAt(lite_source, lite_position, "not"))))))) {
                const lite_tail = liteFn_parseExpressionAs(lite_source, lite_position, lite_prefix, [...(lite_locals)], [...(lite_functions)], [...(lite_functionParams)], lite_currentName, lite_currentResult);
                void lite_tail;
                const lite_afterTail = liteFn_skipTrivia(lite_source, (lite_tail).next, lite_prefix);
                void lite_afterTail;
                if (((((((lite_afterTail) < (lite_size))) && (((lite$textAt(lite_source, lite_afterTail)) === ("}"))))) && (liteFn_atValueTail([...(lite_blocks)], lite_blockCount)))) {
                    if (((lite_currentResult) === ("Unit"))) {
                        lite_items.push({ kind: "Return", name: "", runtime: "", code: "", intValue: 0n, textValue: "" });
                    } else {
                        if ((((lite_tail).kind) !== (lite_currentResult))) {
                            liteFn_failAt(lite_source, lite_position, lite_prefix, (((((((((("cannot return ") + (liteFn_displayKind((lite_tail).kind)))) + (" from function "))) + (lite_currentName))) + (" returning "))) + (liteFn_displayKind(lite_currentResult))));
                        }
                        lite_items.push({ kind: "Return", name: "", runtime: "", code: liteFn_copiedValueCode(lite_currentResult, (lite_tail).code), intValue: 0n, textValue: "" });
                    }
                    lite_currentReturned = true;
                    lite_position = lite_afterTail;
                    continue;
                }
                liteFn_failAt(lite_source, lite_afterTail, lite_prefix, "expected ; after expression statement");
            }
            if ((!(liteFn_isNameStart(lite_ch)))) {
                liteFn_failAt(lite_source, lite_position, lite_prefix, "expected a statement: report, declaration, assignment, if or loop");
            }
            const lite_nameStart = lite_position;
            void lite_nameStart;
            lite_position = liteFn_skipName(lite_source, lite_position);
            const lite_name = lite$textSlice(lite_source, lite_nameStart, lite_position);
            void lite_name;
            lite_position = liteFn_skipTrivia(lite_source, lite_position, lite_prefix);
            let lite_afterDefinition = lite_position;
            void lite_afterDefinition;
            if (liteFn_startsWithAt(lite_source, lite_position, ":=")) {
                lite_afterDefinition = liteFn_skipTrivia(lite_source, (lite_position + 2n), lite_prefix);
            }
            const lite_definition = ((((((lite_blockCount) === (0n))) && (liteFn_startsWithAt(lite_source, lite_position, ":=")))) && ((((liteFn_wordAt(lite_source, lite_afterDefinition, "fn")) || (liteFn_wordAt(lite_source, lite_afterDefinition, "type"))))));
            void lite_definition;
            if (((lite_name) === ("return"))) {
                if (((lite_currentName) === (""))) {
                    liteFn_failAt(lite_source, lite_nameStart, lite_prefix, "return outside a function");
                }
                const lite_valueStart = lite_position;
                void lite_valueStart;
                if (((((lite_valueStart) < (lite_size))) && (((lite$textAt(lite_source, lite_valueStart)) === (";"))))) {
                    if (((lite_currentResult) !== ("Unit"))) {
                        liteFn_failAt(lite_source, lite_nameStart, lite_prefix, (((((("function ") + (lite_currentName))) + (" must return "))) + (lite_currentResult)));
                    }
                    lite_position = liteFn_skipTrivia(lite_source, (lite_valueStart + 1n), lite_prefix);
                    lite_items.push({ kind: "Return", name: "", runtime: "", code: "", intValue: 0n, textValue: "" });
                    lite_currentReturned = true;
                    continue;
                }
                if (((lite_currentResult) === ("Unit"))) {
                    liteFn_failAt(lite_source, lite_nameStart, lite_prefix, (((("function ") + (lite_currentName))) + (" returns Unit and cannot return a value")));
                }
                const lite_parsed = liteFn_parseExpressionAs(lite_source, lite_position, lite_prefix, [...(lite_locals)], [...(lite_functions)], [...(lite_functionParams)], lite_currentName, lite_currentResult);
                void lite_parsed;
                if ((((lite_parsed).kind) !== (lite_currentResult))) {
                    liteFn_failAt(lite_source, lite_valueStart, lite_prefix, (((((((((("cannot return ") + (liteFn_displayKind((lite_parsed).kind)))) + (" from function "))) + (lite_currentName))) + (" returning "))) + (liteFn_displayKind(lite_currentResult))));
                }
                lite_position = liteFn_skipTrivia(lite_source, (lite_parsed).next, lite_prefix);
                if (((((lite_position) >= (lite_size))) || (((lite$textAt(lite_source, lite_position)) !== (";"))))) {
                    liteFn_failAt(lite_source, lite_position, lite_prefix, "expected ; after return");
                }
                lite_position = liteFn_skipTrivia(lite_source, (lite_position + 1n), lite_prefix);
                lite_items.push({ kind: "Return", name: "", runtime: "", code: liteFn_copiedValueCode(lite_currentResult, (lite_parsed).code), intValue: 0n, textValue: "" });
                lite_currentReturned = true;
                continue;
            }
            if (((((lite_name) === ("break"))) || (((lite_name) === ("continue"))))) {
                if ((!(liteFn_insideLoop([...(lite_blocks)])))) {
                    liteFn_failAt(lite_source, lite_nameStart, lite_prefix, ((lite_name) + (" outside loop")));
                }
                if (((((lite_position) >= (lite_size))) || (((lite$textAt(lite_source, lite_position)) !== (";"))))) {
                    liteFn_failAt(lite_source, lite_position, lite_prefix, (("expected ; after ") + (lite_name)));
                }
                lite_position = liteFn_skipTrivia(lite_source, (lite_position + 1n), lite_prefix);
                lite_items.push({ kind: (Boolean(((lite_name) === ("break"))) ? "Break" : "Continue"), name: "", runtime: "", code: "", intValue: 0n, textValue: "" });
                continue;
            }
            let lite_callableIndex = liteFn_findFunction([...(lite_functions)], lite_name);
            void lite_callableIndex;
            let lite_callName = lite_name;
            void lite_callName;
            if (((lite_name) === ("self"))) {
                if (((lite_currentName) === (""))) {
                    liteFn_failAt(lite_source, lite_nameStart, lite_prefix, "self is only available inside a function");
                }
                lite_callName = lite_currentName;
                lite_callableIndex = liteFn_findFunction([...(lite_functions)], lite_currentName);
            }
            if (((((((lite_callableIndex) >= (0n))) && (((lite_position) < (lite_size))))) && (((lite$textAt(lite_source, lite_position)) === ("("))))) {
                const lite_parsed = liteFn_parseExpression(lite_source, lite_nameStart, lite_prefix, [...(lite_locals)], [...(lite_functions)], [...(lite_functionParams)], lite_currentName);
                void lite_parsed;
                lite_position = liteFn_skipTrivia(lite_source, (lite_parsed).next, lite_prefix);
                if (((((((((lite_position) < (lite_size))) && (((lite$textAt(lite_source, lite_position)) === ("}"))))) && (((lite_currentName) !== (""))))) && (liteFn_atValueTail([...(lite_blocks)], lite_blockCount)))) {
                    if (((lite_currentResult) === ("Unit"))) {
                        lite_items.push({ kind: "Return", name: "", runtime: "", code: "", intValue: 0n, textValue: "" });
                    } else {
                        if ((((lite_parsed).kind) !== (lite_currentResult))) {
                            liteFn_failAt(lite_source, lite_nameStart, lite_prefix, (((((((((("cannot return ") + ((lite_parsed).kind))) + (" from function "))) + (lite_currentName))) + (" returning "))) + (lite_currentResult)));
                        }
                        lite_items.push({ kind: "Return", name: "", runtime: "", code: (lite_parsed).code, intValue: 0n, textValue: "" });
                    }
                    lite_currentReturned = true;
                    continue;
                }
                if (((((lite_position) >= (lite_size))) || (((lite$textAt(lite_source, lite_position)) !== (";"))))) {
                    liteFn_failAt(lite_source, lite_position, lite_prefix, "expected ; after function call");
                }
                lite_position = liteFn_skipTrivia(lite_source, (lite_position + 1n), lite_prefix);
                lite_items.push({ kind: "Call", name: lite_callName, runtime: "", code: (lite_parsed).code, intValue: 0n, textValue: "" });
                continue;
            }
            if ((((((((((lite_name) === ("push_back"))) || (((lite_name) === ("pop_back")))))) && (((lite_position) < (lite_size))))) && (((lite$textAt(lite_source, lite_position)) === ("("))))) {
                const lite_parsed = liteFn_parseExpression(lite_source, lite_nameStart, lite_prefix, [...(lite_locals)], [...(lite_functions)], [...(lite_functionParams)], lite_currentName);
                void lite_parsed;
                lite_position = liteFn_skipTrivia(lite_source, (lite_parsed).next, lite_prefix);
                if (((((lite_position) >= (lite_size))) || (((lite$textAt(lite_source, lite_position)) !== (";"))))) {
                    liteFn_failAt(lite_source, lite_position, lite_prefix, (("expected ; after ") + (lite_name)));
                }
                lite_position = liteFn_skipTrivia(lite_source, (lite_position + 1n), lite_prefix);
                lite_items.push({ kind: "Call", name: "", runtime: "", code: (lite_parsed).code, intValue: 0n, textValue: "" });
                continue;
            }
            if ((((((((((lite_name) === ("reportError"))) || (((lite_name) === ("exit")))))) && (((lite_position) < (lite_size))))) && (((lite$textAt(lite_source, lite_position)) === ("("))))) {
                const lite_parsed = liteFn_parseExpression(lite_source, lite_nameStart, lite_prefix, [...(lite_locals)], [...(lite_functions)], [...(lite_functionParams)], lite_currentName);
                void lite_parsed;
                lite_position = liteFn_skipTrivia(lite_source, (lite_parsed).next, lite_prefix);
                if (((((lite_position) >= (lite_size))) || (((lite$textAt(lite_source, lite_position)) !== (";"))))) {
                    liteFn_failAt(lite_source, lite_position, lite_prefix, (("expected ; after ") + (lite_name)));
                }
                lite_position = liteFn_skipTrivia(lite_source, (lite_position + 1n), lite_prefix);
                lite_items.push({ kind: "Call", name: "", runtime: "", code: (lite_parsed).code, intValue: 0n, textValue: "" });
                continue;
            }
            if (((lite_name) === ("report"))) {
                if (((((lite_position) >= (lite_size))) || (((lite$textAt(lite_source, lite_position)) !== ("("))))) {
                    liteFn_failAt(lite_source, lite_position, lite_prefix, "expected ( after report");
                }
                lite_position = liteFn_skipTrivia(lite_source, (lite_position + 1n), lite_prefix);
                while (Boolean(true)) {
                    const lite_argument = liteFn_parseExpression(lite_source, lite_position, lite_prefix, [...(lite_locals)], [...(lite_functions)], [...(lite_functionParams)], lite_currentName);
                    void lite_argument;
                    if ((((lite_argument).kind) === ("Unit"))) {
                        liteFn_failAt(lite_source, lite_position, lite_prefix, "report does not accept a Unit value");
                    }
                    if (liteFn_isTupleKind((lite_argument).kind)) {
                        liteFn_failAt(lite_source, lite_position, lite_prefix, "report does not accept a tuple value");
                    }
                    if (liteFn_isListKind((lite_argument).kind)) {
                        liteFn_failAt(lite_source, lite_position, lite_prefix, "report does not accept a list value");
                    }
                    lite_items.push({ kind: (lite_argument).kind, name: "", runtime: "", code: (lite_argument).code, intValue: (lite_argument).intValue, textValue: (lite_argument).textValue });
                    lite_position = liteFn_skipTrivia(lite_source, (lite_argument).next, lite_prefix);
                    if (((((lite_position) < (lite_size))) && (((lite$textAt(lite_source, lite_position)) === (","))))) {
                        lite_position = liteFn_skipTrivia(lite_source, (lite_position + 1n), lite_prefix);
                    } else {
                        break;
                    }
                }
                lite_position = liteFn_expectSymbol(lite_source, lite_position, ")", lite_prefix);
                lite_position = liteFn_skipTrivia(lite_source, lite_position, lite_prefix);
                if (((((lite_position) < (lite_size))) && (((lite$textAt(lite_source, lite_position)) === (";"))))) {
                    lite_position = liteFn_skipTrivia(lite_source, (lite_position + 1n), lite_prefix);
                }
                lite_items.push({ kind: "End", name: "", runtime: "", code: "", intValue: 0n, textValue: "" });
                continue;
            }
            if (((lite_name) === ("if"))) {
                let lite_valueTailBranch = false;
                void lite_valueTailBranch;
                if (((((lite_currentName) !== (""))) && (liteFn_atValueTail([...(lite_blocks)], lite_blockCount)))) {
                    const lite_valueEnd = liteFn_scanValueIfEnd(lite_source, lite_nameStart, lite_prefix, true);
                    void lite_valueEnd;
                    if (((lite_valueEnd) >= (0n))) {
                        const lite_afterChain = liteFn_skipTrivia(lite_source, lite_valueEnd, lite_prefix);
                        void lite_afterChain;
                        if (((((lite_afterChain) < (lite_size))) && (((lite$textAt(lite_source, lite_afterChain)) === ("}"))))) {
                            const lite_tail = liteFn_parseExpressionAs(lite_source, lite_nameStart, lite_prefix, [...(lite_locals)], [...(lite_functions)], [...(lite_functionParams)], lite_currentName, lite_currentResult);
                            void lite_tail;
                            if (((lite_currentResult) === ("Unit"))) {
                                lite_items.push({ kind: "Return", name: "", runtime: "", code: "", intValue: 0n, textValue: "" });
                            } else {
                                if ((((lite_tail).kind) !== (lite_currentResult))) {
                                    liteFn_failAt(lite_source, lite_nameStart, lite_prefix, (((((((((("cannot return ") + (liteFn_displayKind((lite_tail).kind)))) + (" from function "))) + (lite_currentName))) + (" returning "))) + (liteFn_displayKind(lite_currentResult))));
                                }
                                lite_items.push({ kind: "Return", name: "", runtime: "", code: liteFn_copiedValueCode(lite_currentResult, (lite_tail).code), intValue: 0n, textValue: "" });
                            }
                            lite_currentReturned = true;
                            lite_position = lite_afterChain;
                            continue;
                        }
                    }
                    if (((lite_currentResult) !== ("Unit"))) {
                        const lite_statementEnd = liteFn_scanValueIfEnd(lite_source, lite_nameStart, lite_prefix, false);
                        void lite_statementEnd;
                        if (((lite_statementEnd) >= (0n))) {
                            const lite_afterStatement = liteFn_skipTrivia(lite_source, lite_statementEnd, lite_prefix);
                            void lite_afterStatement;
                            if (((((lite_afterStatement) < (lite_size))) && (((lite$textAt(lite_source, lite_afterStatement)) === ("}"))))) {
                                lite_valueTailBranch = true;
                            }
                        }
                    }
                }
                const lite_conditionStart = lite_position;
                void lite_conditionStart;
                const lite_condition = liteFn_parseExpression(lite_source, lite_position, lite_prefix, [...(lite_locals)], [...(lite_functions)], [...(lite_functionParams)], lite_currentName);
                void lite_condition;
                if ((((lite_condition).kind) !== ("Bool"))) {
                    liteFn_failAt(lite_source, lite_conditionStart, lite_prefix, "if condition must be Bool");
                }
                const lite_conditionCode = (Boolean((lite_condition).constant) ? liteFn_boolLiteralCode((((lite_condition).intValue) !== (0n))) : (lite_condition).code);
                void lite_conditionCode;
                lite_position = liteFn_expectSymbol(lite_source, liteFn_skipTrivia(lite_source, (lite_condition).next, lite_prefix), "{", lite_prefix);
                lite_items.push({ kind: "If", name: "", runtime: "", code: lite_conditionCode, intValue: 0n, textValue: "" });
                lite_blocks.push((Boolean(lite_valueTailBranch) ? "ifvalue" : "if"));
                lite_blockCount = (lite_blockCount + 1n);
                lite_depth = (lite_depth + 1n);
                lite_position = liteFn_skipTrivia(lite_source, (lite_position + 1n), lite_prefix);
                continue;
            }
            if (((lite_name) === ("loop"))) {
                let lite_conditionCode = "";
                void lite_conditionCode;
                let lite_sequenceCode = "";
                void lite_sequenceCode;
                let lite_itemName = "";
                void lite_itemName;
                let lite_itemKind = "";
                void lite_itemKind;
                if (((((lite_position) < (lite_size))) && (((lite$textAt(lite_source, lite_position)) !== ("{"))))) {
                    const lite_parsed = liteFn_parseExpression(lite_source, lite_position, lite_prefix, [...(lite_locals)], [...(lite_functions)], [...(lite_functionParams)], lite_currentName);
                    void lite_parsed;
                    const lite_afterParsed = liteFn_skipTrivia(lite_source, (lite_parsed).next, lite_prefix);
                    void lite_afterParsed;
                    if (liteFn_wordAt(lite_source, lite_afterParsed, "as")) {
                        if ((!(liteFn_isListKind((lite_parsed).kind)))) {
                            liteFn_failAt(lite_source, lite_position, lite_prefix, (("loop sequence must be a List, got ") + (liteFn_displayKind((lite_parsed).kind))));
                        }
                        const lite_itemStart = liteFn_skipTrivia(lite_source, (lite_afterParsed + 2n), lite_prefix);
                        void lite_itemStart;
                        if (((((lite_itemStart) >= (lite_size))) || ((!(liteFn_isNameStart(lite$textAt(lite_source, lite_itemStart))))))) {
                            liteFn_failAt(lite_source, lite_itemStart, lite_prefix, "expected an item name after as");
                        }
                        const lite_itemEnd = liteFn_skipName(lite_source, lite_itemStart);
                        void lite_itemEnd;
                        lite_itemName = lite$textSlice(lite_source, lite_itemStart, lite_itemEnd);
                        if (liteFn_isReservedWord(lite_itemName)) {
                            liteFn_unsupportedFeature(lite_source, lite_itemStart, lite_itemName, lite_prefix);
                        }
                        if (liteFn_localSameBlock([...(lite_locals)], lite_itemName, (lite_depth + 1n))) {
                            liteFn_failAt(lite_source, lite_itemStart, lite_prefix, (("duplicate local ") + (lite_itemName)));
                        }
                        lite_itemKind = liteFn_listElementKind((lite_parsed).kind);
                        lite_sequenceCode = (lite_parsed).code;
                        lite_position = liteFn_skipTrivia(lite_source, lite_itemEnd, lite_prefix);
                    } else {
                        if ((((lite_parsed).kind) !== ("Bool"))) {
                            liteFn_failAt(lite_source, lite_position, lite_prefix, "loop condition must be Bool");
                        }
                        if ((lite_parsed).constant) {
                            if ((((lite_parsed).intValue) === (0n))) {
                                lite_conditionCode = "false";
                            }
                        } else {
                            lite_conditionCode = (lite_parsed).code;
                        }
                        lite_position = liteFn_skipTrivia(lite_source, (lite_parsed).next, lite_prefix);
                    }
                }
                lite_position = liteFn_expectSymbol(lite_source, lite_position, "{", lite_prefix);
                if (((lite_itemName) !== (""))) {
                    const lite_runtime = (("lite_") + (lite_itemName));
                    void lite_runtime;
                    lite_locals.push({ name: lite_itemName, runtime: lite_runtime, kind: lite_itemKind, mutable: false, writable: false, depth: (lite_depth + 1n), constant: false, code: lite_runtime, intValue: 0n, textValue: "" });
                    lite_items.push({ kind: "LoopSeq", name: lite_itemName, runtime: lite_runtime, code: lite_sequenceCode, intValue: 0n, textValue: lite_itemKind });
                } else {
                    lite_items.push({ kind: "Loop", name: "", runtime: "", code: lite_conditionCode, intValue: 0n, textValue: "" });
                }
                lite_blocks.push("loop");
                lite_blockCount = (lite_blockCount + 1n);
                lite_depth = (lite_depth + 1n);
                lite_position = liteFn_skipTrivia(lite_source, (lite_position + 1n), lite_prefix);
                continue;
            }
            if (((lite_name) === ("var"))) {
                lite_position = liteFn_skipTrivia(lite_source, lite_position, lite_prefix);
                if (((((lite_position) >= (lite_size))) || ((!(liteFn_isNameStart(lite$textAt(lite_source, lite_position))))))) {
                    liteFn_failAt(lite_source, lite_position, lite_prefix, "expected local name after var");
                }
                const lite_localStart = lite_position;
                void lite_localStart;
                lite_position = liteFn_skipName(lite_source, lite_position);
                const lite_localName = lite$textSlice(lite_source, lite_localStart, lite_position);
                void lite_localName;
                if (liteFn_isReservedWord(lite_localName)) {
                    liteFn_unsupportedFeature(lite_source, lite_localStart, lite_localName, lite_prefix);
                }
                lite_position = liteFn_skipTrivia(lite_source, lite_position, lite_prefix);
                let lite_parsed = liteFn_intParsed("", 0n, true, lite_position);
                void lite_parsed;
                let lite_declaredWritable = false;
                void lite_declaredWritable;
                if (liteFn_startsWithAt(lite_source, lite_position, ":=")) {
                    lite_position = liteFn_skipTrivia(lite_source, (lite_position + 2n), lite_prefix);
                    lite_parsed = liteFn_parseExpression(lite_source, lite_position, lite_prefix, [...(lite_locals)], [...(lite_functions)], [...(lite_functionParams)], lite_currentName);
                    if ((((lite_parsed).kind) === ("Unit"))) {
                        liteFn_failAt(lite_source, lite_localStart, lite_prefix, (("cannot declare a Unit local ") + (lite_localName)));
                    }
                } else if (((((lite_position) < (lite_size))) && (((lite$textAt(lite_source, lite_position)) === (":"))))) {
                    const lite_typed = liteFn_parseLocalType(lite_source, (lite_position + 1n), lite_prefix, [...(lite_aliases)]);
                    void lite_typed;
                    lite_declaredWritable = (lite_typed).writable;
                    lite_position = liteFn_skipTrivia(lite_source, (lite_typed).next, lite_prefix);
                    if (((((((lite_position) < (lite_size))) && (((lite$textAt(lite_source, lite_position)) === ("="))))) && ((!(liteFn_startsWithAt(lite_source, lite_position, "==")))))) {
                        lite_parsed = liteFn_parseExpressionAs(lite_source, liteFn_skipTrivia(lite_source, (lite_position + 1n), lite_prefix), lite_prefix, [...(lite_locals)], [...(lite_functions)], [...(lite_functionParams)], lite_currentName, (lite_typed).kind);
                        if ((((lite_parsed).kind) !== ((lite_typed).kind))) {
                            liteFn_failAt(lite_source, lite_localStart, lite_prefix, (((((("cannot initialize ") + (liteFn_displayKind((lite_typed).kind)))) + (" with "))) + (liteFn_displayKind((lite_parsed).kind))));
                        }
                    } else {
                        lite_parsed = liteFn_zeroParsed((lite_typed).kind, lite_position);
                    }
                } else {
                    liteFn_failAt(lite_source, lite_position, lite_prefix, (("expected := or : after local name ") + (lite_localName)));
                }
                lite_position = liteFn_skipTrivia(lite_source, (lite_parsed).next, lite_prefix);
                if (((((lite_position) >= (lite_size))) || (((lite$textAt(lite_source, lite_position)) !== (";"))))) {
                    liteFn_failAt(lite_source, lite_position, lite_prefix, (("expected ; after local declaration ") + (lite_localName)));
                }
                lite_position = liteFn_skipTrivia(lite_source, (lite_position + 1n), lite_prefix);
                if (liteFn_localSameBlock([...(lite_locals)], lite_localName, lite_depth)) {
                    liteFn_failAt(lite_source, lite_localStart, lite_prefix, (("duplicate local ") + (lite_localName)));
                }
                const lite_runtime = (("lite_") + (lite_localName));
                void lite_runtime;
                lite_locals.push({ name: lite_localName, runtime: lite_runtime, kind: (lite_parsed).kind, mutable: true, writable: lite_declaredWritable, depth: lite_depth, constant: false, code: (lite_parsed).code, intValue: (lite_parsed).intValue, textValue: (lite_parsed).textValue });
                lite_items.push({ kind: (("Var") + (liteFn_storageKind((lite_parsed).kind))), name: lite_localName, runtime: lite_runtime, code: liteFn_copiedValueCode((lite_parsed).kind, (lite_parsed).code), intValue: (lite_parsed).intValue, textValue: liteFn_itemTextPayload(lite_parsed) });
                continue;
            }
            if (((lite_name) === ("else"))) {
                liteFn_failAt(lite_source, lite_nameStart, lite_prefix, "unexpected else");
            }
            if ((((((((lite_name) === ("true"))) || (((lite_name) === ("false")))))) && (((lite_currentName) !== (""))))) {
                const lite_tail = liteFn_parseExpression(lite_source, lite_nameStart, lite_prefix, [...(lite_locals)], [...(lite_functions)], [...(lite_functionParams)], lite_currentName);
                void lite_tail;
                const lite_afterTail = liteFn_skipTrivia(lite_source, (lite_tail).next, lite_prefix);
                void lite_afterTail;
                if (((((((lite_afterTail) < (lite_size))) && (((lite$textAt(lite_source, lite_afterTail)) === ("}"))))) && (liteFn_atValueTail([...(lite_blocks)], lite_blockCount)))) {
                    if (((lite_currentResult) !== ("Bool"))) {
                        liteFn_failAt(lite_source, lite_nameStart, lite_prefix, (((((("cannot return Bool from function ") + (lite_currentName))) + (" returning "))) + (lite_currentResult)));
                    }
                    lite_items.push({ kind: "Return", name: "", runtime: "", code: (lite_tail).code, intValue: 0n, textValue: "" });
                    lite_currentReturned = true;
                    lite_position = lite_afterTail;
                    continue;
                }
                liteFn_failAt(lite_source, lite_nameStart, lite_prefix, "expected ; after expression statement");
            }
            if (liteFn_isReservedWord(lite_name)) {
                liteFn_unsupportedFeature(lite_source, lite_nameStart, lite_name, lite_prefix);
            }
            if (((liteFn_startsWithAt(lite_source, lite_position, ":=")) && (liteFn_wordAt(lite_source, lite_afterDefinition, "type")))) {
                if (((((lite_blockCount) !== (0n))) || (((lite_depth) !== (0n))))) {
                    liteFn_failAt(lite_source, lite_nameStart, lite_prefix, "type aliases are only allowed at top level");
                }
                let lite_earlierAlias = false;
                void lite_earlierAlias;
                for (const lite_alias of [...(lite_aliases)]) {
                    void lite_alias;
                    if ((((((lite_alias).name) === (lite_name))) && ((((lite_alias).at) < (lite_nameStart))))) {
                        lite_earlierAlias = true;
                    }
                }
                if (lite_earlierAlias) {
                    liteFn_failAt(lite_source, lite_nameStart, lite_prefix, (("duplicate type alias ") + (lite_name)));
                }
                const lite_typePosition = liteFn_skipTrivia(lite_source, (lite_position + 2n), lite_prefix);
                void lite_typePosition;
                const lite_targetStart = liteFn_skipTrivia(lite_source, (lite_typePosition + 4n), lite_prefix);
                void lite_targetStart;
                const lite_aliasIndex = liteFn_aliasIndexAt([...(lite_aliases)], lite_nameStart);
                void lite_aliasIndex;
                if (((lite_aliasIndex) < (0n))) {
                    liteFn_unsupportedAliasTarget(lite_source, lite_targetStart, lite_prefix, "target");
                }
                const lite_aliasEntry = lite$listAt((lite_aliases), lite_aliasIndex);
                void lite_aliasEntry;
                if ((((lite_aliasEntry).target) === (""))) {
                    liteFn_unsupportedAliasTarget(lite_source, lite_targetStart, lite_prefix, "target");
                }
                const lite_seenAliases: string[] = [...([])];
                void lite_seenAliases;
                liteFn_resolveTypeText(lite_source, lite_targetStart, lite_prefix, [...(lite_aliases)], (lite_aliasEntry).target, [...(lite_seenAliases)]);
                const lite_afterTarget = liteFn_skipTrivia(lite_source, (lite_aliasEntry).end, lite_prefix);
                void lite_afterTarget;
                if (((((lite_afterTarget) < (lite_size))) && (((lite$textAt(lite_source, lite_afterTarget)) !== (";"))))) {
                    liteFn_unsupportedAliasTarget(lite_source, (lite_aliasEntry).at, lite_prefix, "target");
                }
                if (((lite_afterTarget) >= (lite_size))) {
                    liteFn_failAt(lite_source, lite_afterTarget, lite_prefix, (("expected ; after type alias ") + (lite_name)));
                }
                lite_position = liteFn_skipTrivia(lite_source, (lite_afterTarget + 1n), lite_prefix);
                continue;
            }
            if (liteFn_startsWithAt(lite_source, lite_position, ":=")) {
                const lite_afterDeclare = liteFn_skipTrivia(lite_source, (lite_position + 2n), lite_prefix);
                void lite_afterDeclare;
                if (liteFn_wordAt(lite_source, lite_afterDeclare, "fn")) {
                    if (((((lite_blockCount) !== (0n))) || (((lite_depth) !== (0n))))) {
                        liteFn_failAt(lite_source, lite_nameStart, lite_prefix, "function definitions are only allowed at top level");
                    }
                    if (((liteFn_findFunction([...(lite_functions)], lite_name)) >= (0n))) {
                        liteFn_failAt(lite_source, lite_nameStart, lite_prefix, (("duplicate function ") + (lite_name)));
                    }
                    lite_position = liteFn_skipTrivia(lite_source, (lite_afterDeclare + 2n), lite_prefix);
                    const lite_header = liteFn_parseFunctionHeader(lite_source, lite_position, lite_prefix, [...(lite_aliases)]);
                    void lite_header;
                    lite_position = liteFn_skipTrivia(lite_source, (lite_header).next, lite_prefix);
                    lite_position = liteFn_expectSymbol(lite_source, lite_position, "{", lite_prefix);
                    lite_functions.push({ name: lite_name, result: (lite_header).result, first: lite_parameterTotal, count: (lite_header).count });
                    lite_items.push({ kind: "FunctionStart", name: lite_name, runtime: (("liteFn_") + (lite_name)), code: (lite_header).result, intValue: (lite_header).count, textValue: (lite_header).params });
                    let lite_entryStart = 0n;
                    void lite_entryStart;
                    let lite_entryIndex = 0n;
                    void lite_entryIndex;
                    while (((lite_entryIndex) < ((lite_header).count))) {
                        const lite_separator = liteFn_indexOfText((lite_header).params, "|", lite_entryStart);
                        void lite_separator;
                        let lite_entryEnd = lite$textLength((lite_header).params);
                        void lite_entryEnd;
                        if (((lite_separator) >= (0n))) {
                            lite_entryEnd = lite_separator;
                        }
                        const lite_entry = lite$textSlice((lite_header).params, lite_entryStart, lite_entryEnd);
                        void lite_entry;
                        const lite_parameterName = liteFn_paramNameOf(lite_entry);
                        void lite_parameterName;
                        const lite_parameterKind = liteFn_paramKindOf(lite_entry);
                        void lite_parameterKind;
                        const lite_runtime = (("lite_") + (lite_parameterName));
                        void lite_runtime;
                        lite_functionParams.push(lite_entry);
                        lite_locals.push({ name: lite_parameterName, runtime: lite_runtime, kind: lite_parameterKind, mutable: false, writable: false, depth: 1n, constant: false, code: lite_runtime, intValue: 0n, textValue: "" });
                        lite_parameterTotal = (lite_parameterTotal + 1n);
                        lite_entryStart = (lite_entryEnd + 1n);
                        lite_entryIndex = (lite_entryIndex + 1n);
                    }
                    lite_currentName = lite_name;
                    lite_currentResult = (lite_header).result;
                    lite_currentReturned = false;
                    lite_blocks.push("function");
                    lite_blockCount = (lite_blockCount + 1n);
                    lite_depth = (lite_depth + 1n);
                    lite_position = liteFn_skipTrivia(lite_source, lite_position, lite_prefix);
                    continue;
                }
                lite_position = lite_afterDeclare;
                const lite_parsed = liteFn_parseExpression(lite_source, lite_position, lite_prefix, [...(lite_locals)], [...(lite_functions)], [...(lite_functionParams)], lite_currentName);
                void lite_parsed;
                if ((((lite_parsed).kind) === ("Unit"))) {
                    liteFn_failAt(lite_source, lite_nameStart, lite_prefix, (("cannot declare a Unit local ") + (lite_name)));
                }
                lite_position = liteFn_skipTrivia(lite_source, (lite_parsed).next, lite_prefix);
                if (((((lite_position) >= (lite_size))) || (((lite$textAt(lite_source, lite_position)) !== (";"))))) {
                    liteFn_failAt(lite_source, lite_position, lite_prefix, (("expected ; after local declaration ") + (lite_name)));
                }
                lite_position = liteFn_skipTrivia(lite_source, (lite_position + 1n), lite_prefix);
                if (liteFn_localSameBlock([...(lite_locals)], lite_name, lite_depth)) {
                    liteFn_failAt(lite_source, lite_nameStart, lite_prefix, (("duplicate local ") + (lite_name)));
                }
                const lite_runtime = (("lite_") + (lite_name));
                void lite_runtime;
                lite_locals.push({ name: lite_name, runtime: lite_runtime, kind: (lite_parsed).kind, mutable: false, writable: false, depth: lite_depth, constant: (lite_parsed).constant, code: (lite_parsed).code, intValue: (lite_parsed).intValue, textValue: (lite_parsed).textValue });
                lite_items.push({ kind: (("Local") + (liteFn_storageKind((lite_parsed).kind))), name: lite_name, runtime: lite_runtime, code: liteFn_copiedValueCode((lite_parsed).kind, (lite_parsed).code), intValue: (lite_parsed).intValue, textValue: liteFn_itemTextPayload(lite_parsed) });
                continue;
            }
            if (((((lite_position) < (lite_size))) && (((lite$textAt(lite_source, lite_position)) === (":"))))) {
                const lite_typed = liteFn_parseLocalType(lite_source, (lite_position + 1n), lite_prefix, [...(lite_aliases)]);
                void lite_typed;
                lite_position = liteFn_skipTrivia(lite_source, (lite_typed).next, lite_prefix);
                let lite_parsed = liteFn_zeroParsed((lite_typed).kind, lite_position);
                void lite_parsed;
                if (((((((lite_position) < (lite_size))) && (((lite$textAt(lite_source, lite_position)) === ("="))))) && ((!(liteFn_startsWithAt(lite_source, lite_position, "==")))))) {
                    lite_parsed = liteFn_parseExpressionAs(lite_source, liteFn_skipTrivia(lite_source, (lite_position + 1n), lite_prefix), lite_prefix, [...(lite_locals)], [...(lite_functions)], [...(lite_functionParams)], lite_currentName, (lite_typed).kind);
                    if ((((lite_parsed).kind) !== ((lite_typed).kind))) {
                        liteFn_failAt(lite_source, lite_nameStart, lite_prefix, (((((("cannot initialize ") + (liteFn_displayKind((lite_typed).kind)))) + (" with "))) + (liteFn_displayKind((lite_parsed).kind))));
                    }
                }
                lite_position = liteFn_skipTrivia(lite_source, (lite_parsed).next, lite_prefix);
                if (((((lite_position) >= (lite_size))) || (((lite$textAt(lite_source, lite_position)) !== (";"))))) {
                    liteFn_failAt(lite_source, lite_position, lite_prefix, (("expected ; after local declaration ") + (lite_name)));
                }
                lite_position = liteFn_skipTrivia(lite_source, (lite_position + 1n), lite_prefix);
                if (liteFn_localSameBlock([...(lite_locals)], lite_name, lite_depth)) {
                    liteFn_failAt(lite_source, lite_nameStart, lite_prefix, (("duplicate local ") + (lite_name)));
                }
                const lite_runtime = (("lite_") + (lite_name));
                void lite_runtime;
                lite_locals.push({ name: lite_name, runtime: lite_runtime, kind: (lite_typed).kind, mutable: false, writable: (lite_typed).writable, depth: lite_depth, constant: (lite_parsed).constant, code: (lite_parsed).code, intValue: (lite_parsed).intValue, textValue: (lite_parsed).textValue });
                lite_items.push({ kind: (("Local") + (liteFn_storageKind((lite_typed).kind))), name: lite_name, runtime: lite_runtime, code: liteFn_copiedValueCode((lite_typed).kind, (lite_parsed).code), intValue: (lite_parsed).intValue, textValue: liteFn_itemTextPayload(lite_parsed) });
                continue;
            }
            if (((((((lite_position) < (lite_size))) && (((lite$textAt(lite_source, lite_position)) === ("="))))) && ((!(liteFn_startsWithAt(lite_source, lite_position, "==")))))) {
                const lite_index = liteFn_localIndex([...(lite_locals)], lite_name);
                void lite_index;
                if (((lite_index) < (0n))) {
                    liteFn_failAt(lite_source, lite_nameStart, lite_prefix, (("unknown value ") + (lite_name)));
                }
                const lite_entry = lite$listAt((lite_locals), lite_index);
                void lite_entry;
                if ((!((lite_entry).mutable))) {
                    liteFn_failAt(lite_source, lite_nameStart, lite_prefix, (("cannot assign to immutable local ") + (lite_name)));
                }
                lite_position = liteFn_skipTrivia(lite_source, (lite_position + 1n), lite_prefix);
                const lite_parsed = liteFn_parseExpressionAs(lite_source, lite_position, lite_prefix, [...(lite_locals)], [...(lite_functions)], [...(lite_functionParams)], lite_currentName, (lite_entry).kind);
                void lite_parsed;
                if ((((lite_parsed).kind) !== ((lite_entry).kind))) {
                    liteFn_failAt(lite_source, lite_nameStart, lite_prefix, (((((((((("cannot assign ") + (liteFn_displayKind((lite_parsed).kind)))) + (" to "))) + (liteFn_displayKind((lite_entry).kind)))) + (" local "))) + (lite_name)));
                }
                lite_position = liteFn_skipTrivia(lite_source, (lite_parsed).next, lite_prefix);
                if (((((lite_position) >= (lite_size))) || (((lite$textAt(lite_source, lite_position)) !== (";"))))) {
                    liteFn_failAt(lite_source, lite_position, lite_prefix, (("expected ; after assignment to ") + (lite_name)));
                }
                lite_position = liteFn_skipTrivia(lite_source, (lite_position + 1n), lite_prefix);
                lite_locals.push({ name: (lite_entry).name, runtime: (lite_entry).runtime, kind: (lite_entry).kind, mutable: true, writable: (lite_entry).writable, depth: (lite_entry).depth, constant: false, code: (lite_parsed).code, intValue: (lite_parsed).intValue, textValue: (lite_parsed).textValue });
                lite_items.push({ kind: (("Assign") + (liteFn_storageKind((lite_entry).kind))), name: lite_name, runtime: (lite_entry).runtime, code: liteFn_copiedValueCode((lite_entry).kind, (lite_parsed).code), intValue: (lite_parsed).intValue, textValue: liteFn_itemTextPayload(lite_parsed) });
                continue;
            }
            if (((lite_currentName) !== (""))) {
                const lite_tail = liteFn_parseExpressionAs(lite_source, lite_nameStart, lite_prefix, [...(lite_locals)], [...(lite_functions)], [...(lite_functionParams)], lite_currentName, lite_currentResult);
                void lite_tail;
                const lite_afterTail = liteFn_skipTrivia(lite_source, (lite_tail).next, lite_prefix);
                void lite_afterTail;
                if (((((((lite_afterTail) < (lite_size))) && (((lite$textAt(lite_source, lite_afterTail)) === ("}"))))) && (liteFn_atValueTail([...(lite_blocks)], lite_blockCount)))) {
                    if (((lite_currentResult) === ("Unit"))) {
                        lite_items.push({ kind: "Return", name: "", runtime: "", code: "", intValue: 0n, textValue: "" });
                    } else {
                        if ((((lite_tail).kind) !== (lite_currentResult))) {
                            liteFn_failAt(lite_source, lite_nameStart, lite_prefix, (((((((((("cannot return ") + (liteFn_displayKind((lite_tail).kind)))) + (" from function "))) + (lite_currentName))) + (" returning "))) + (liteFn_displayKind(lite_currentResult))));
                        }
                        lite_items.push({ kind: "Return", name: "", runtime: "", code: liteFn_copiedValueCode(lite_currentResult, (lite_tail).code), intValue: 0n, textValue: "" });
                    }
                    lite_currentReturned = true;
                    lite_position = lite_afterTail;
                    continue;
                }
                liteFn_failAt(lite_source, lite_afterTail, lite_prefix, "expected ; after expression statement");
            }
            liteFn_failAt(lite_source, lite_position, lite_prefix, (("expected := or = after local name ") + (lite_name)));
        }
        if (((lite_blockCount) > (0n))) {
            liteFn_failAt(lite_source, lite_size, lite_prefix, "expected } before end of source");
        }
        return [...(lite_items)];
    }
    void liteFn_parseProgram;
    function liteFn_dedent(lite_indent: string): string {
        void lite_indent;
        return lite$textSlice(lite_indent, 0n, (lite$textLength(lite_indent) - 4n));
    }
    void liteFn_dedent;
    function liteFn_cCall(lite_kind: string, lite_code: string): string {
        void lite_kind;
        void lite_code;
        return (Boolean(((lite_kind) === ("Int"))) ? (((("printf(\"%\" PRId64, (int64_t)(") + (lite_code))) + ("))")) : (Boolean(((lite_kind) === ("Bool"))) ? (((("printf(\"%s\", ((") + (lite_code))) + (") ? \"true\" : \"false\"))")) : (((("printf(\"%s\", ") + (lite_code))) + (")"))));
    }
    void liteFn_cCall;
    function liteFn_unsupportedBuiltinCode(lite_code: string): string {
        void lite_code;
        return (Boolean(((liteFn_codeUsesTextCall(lite_code, "lite$inputArgs(")) || (liteFn_codeUsesTextCall(lite_code, "lite$inputAll(")))) ? "C backend does not support input builtins yet" : (Boolean(((liteFn_codeUsesTextCall(lite_code, "lite$reportError(")) || (liteFn_codeUsesTextCall(lite_code, "lite$exit(")))) ? "C backend does not support reportError or exit yet" : (Boolean(((((liteFn_codeUsesTextCall(lite_code, "lite$textLength(")) || (liteFn_codeUsesTextCall(lite_code, "lite$textAt(")))) || (liteFn_codeUsesTextCall(lite_code, "lite$textSlice(")))) ? "C backend does not support text builtins yet" : "")));
    }
    void liteFn_unsupportedBuiltinCode;
    function liteFn_usesIntHelper(lite_items: { kind: string; name: string; runtime: string; code: string; intValue: bigint; textValue: string }[], lite_name: string): boolean {
        void lite_items;
        void lite_name;
        for (const lite_item of [...(lite_items)]) {
            void lite_item;
            if (liteFn_codeUsesTextCall((lite_item).code, lite_name)) {
                return true;
            }
        }
        return false;
    }
    void liteFn_usesIntHelper;
    function liteFn_usesIntDivision(lite_items: { kind: string; name: string; runtime: string; code: string; intValue: bigint; textValue: string }[]): boolean {
        void lite_items;
        return ((((((liteFn_usesIntHelper([...(lite_items)], "lite_divide_int(")) || (liteFn_usesIntHelper([...(lite_items)], "lite_remainder_int(")))) || (liteFn_usesIntHelper([...(lite_items)], "lite_floor_divide_int(")))) || (liteFn_usesIntHelper([...(lite_items)], "lite_floor_modulo_int(")));
    }
    void liteFn_usesIntDivision;
    function liteFn_usesStringConcat(lite_items: { kind: string; name: string; runtime: string; code: string; intValue: bigint; textValue: string }[]): boolean {
        void lite_items;
        return liteFn_usesIntHelper([...(lite_items)], "lite_concat(");
    }
    void liteFn_usesStringConcat;
    function liteFn_emitIntDivideHelper(): void {
        const lite$report0 = "static int64_t lite_divide_int(int64_t left, int64_t right) {";
        lite_out += lite$report0 + "\n";
        const lite$report1 = "    if (right == 0) {";
        lite_out += lite$report1 + "\n";
        const lite$report2 = "        fprintf(stderr, \"ArithmeticPanic: division by zero in integer expression\\n\");";
        lite_out += lite$report2 + "\n";
        const lite$report3 = "        exit(1);";
        lite_out += lite$report3 + "\n";
        const lite$report4 = "    }";
        lite_out += lite$report4 + "\n";
        const lite$report5 = "    if (left == INT64_MIN && right == -1) {";
        lite_out += lite$report5 + "\n";
        const lite$report6 = "        fprintf(stderr, \"ArithmeticPanic: integer expression outside signed 64-bit range\\n\");";
        lite_out += lite$report6 + "\n";
        const lite$report7 = "        exit(1);";
        lite_out += lite$report7 + "\n";
        const lite$report8 = "    }";
        lite_out += lite$report8 + "\n";
        const lite$report9 = "    return left / right;";
        lite_out += lite$report9 + "\n";
        const lite$report10 = "}";
        lite_out += lite$report10 + "\n";
        const lite$report11 = "";
        lite_out += lite$report11 + "\n";
    }
    void liteFn_emitIntDivideHelper;
    function liteFn_emitIntRemainderHelper(): void {
        const lite$report12 = "static int64_t lite_remainder_int(int64_t left, int64_t right) {";
        lite_out += lite$report12 + "\n";
        const lite$report13 = "    if (right == 0) {";
        lite_out += lite$report13 + "\n";
        const lite$report14 = "        fprintf(stderr, \"ArithmeticPanic: remainder by zero in integer expression\\n\");";
        lite_out += lite$report14 + "\n";
        const lite$report15 = "        exit(1);";
        lite_out += lite$report15 + "\n";
        const lite$report16 = "    }";
        lite_out += lite$report16 + "\n";
        const lite$report17 = "    if (left == INT64_MIN && right == -1) {";
        lite_out += lite$report17 + "\n";
        const lite$report18 = "        fprintf(stderr, \"ArithmeticPanic: integer expression outside signed 64-bit range\\n\");";
        lite_out += lite$report18 + "\n";
        const lite$report19 = "        exit(1);";
        lite_out += lite$report19 + "\n";
        const lite$report20 = "    }";
        lite_out += lite$report20 + "\n";
        const lite$report21 = "    return left % right;";
        lite_out += lite$report21 + "\n";
        const lite$report22 = "}";
        lite_out += lite$report22 + "\n";
        const lite$report23 = "";
        lite_out += lite$report23 + "\n";
    }
    void liteFn_emitIntRemainderHelper;
    function liteFn_emitIntFloorDivideHelper(): void {
        const lite$report24 = "static int64_t lite_floor_divide_int(int64_t left, int64_t right) {";
        lite_out += lite$report24 + "\n";
        const lite$report25 = "    const int64_t quotient = lite_divide_int(left, right);";
        lite_out += lite$report25 + "\n";
        const lite$report26 = "    const int64_t remainder = left % right;";
        lite_out += lite$report26 + "\n";
        const lite$report27 = "    return remainder != 0 && ((remainder < 0) != (right < 0)) ? quotient - 1 : quotient;";
        lite_out += lite$report27 + "\n";
        const lite$report28 = "}";
        lite_out += lite$report28 + "\n";
        const lite$report29 = "";
        lite_out += lite$report29 + "\n";
    }
    void liteFn_emitIntFloorDivideHelper;
    function liteFn_emitIntFloorModuloHelper(): void {
        const lite$report30 = "static int64_t lite_floor_modulo_int(int64_t left, int64_t right) {";
        lite_out += lite$report30 + "\n";
        const lite$report31 = "    if (right == 0) {";
        lite_out += lite$report31 + "\n";
        const lite$report32 = "        fprintf(stderr, \"ArithmeticPanic: modulo by zero in integer expression\\n\");";
        lite_out += lite$report32 + "\n";
        const lite$report33 = "        exit(1);";
        lite_out += lite$report33 + "\n";
        const lite$report34 = "    }";
        lite_out += lite$report34 + "\n";
        const lite$report35 = "    if (left == INT64_MIN && right == -1) { return 0; }";
        lite_out += lite$report35 + "\n";
        const lite$report36 = "    const int64_t remainder = left % right;";
        lite_out += lite$report36 + "\n";
        const lite$report37 = "    return remainder != 0 && ((remainder < 0) != (right < 0)) ? remainder + right : remainder;";
        lite_out += lite$report37 + "\n";
        const lite$report38 = "}";
        lite_out += lite$report38 + "\n";
        const lite$report39 = "";
        lite_out += lite$report39 + "\n";
    }
    void liteFn_emitIntFloorModuloHelper;
    function liteFn_emitIntDivisionHelpers(lite_items: { kind: string; name: string; runtime: string; code: string; intValue: bigint; textValue: string }[]): void {
        void lite_items;
        if (((liteFn_usesIntHelper([...(lite_items)], "lite_divide_int(")) || (liteFn_usesIntHelper([...(lite_items)], "lite_floor_divide_int(")))) {
            liteFn_emitIntDivideHelper();
        }
        if (liteFn_usesIntHelper([...(lite_items)], "lite_remainder_int(")) {
            liteFn_emitIntRemainderHelper();
        }
        if (liteFn_usesIntHelper([...(lite_items)], "lite_floor_divide_int(")) {
            liteFn_emitIntFloorDivideHelper();
        }
        if (liteFn_usesIntHelper([...(lite_items)], "lite_floor_modulo_int(")) {
            liteFn_emitIntFloorModuloHelper();
        }
        return;
    }
    void liteFn_emitIntDivisionHelpers;
    function liteFn_emitStringConcatHelper(): void {
        const lite$report40 = "static const char *lite_concat(const char *left, const char *right) {";
        lite_out += lite$report40 + "\n";
        const lite$report41 = "    const size_t left_length = strlen(left);";
        lite_out += lite$report41 + "\n";
        const lite$report42 = "    const size_t right_length = strlen(right);";
        lite_out += lite$report42 + "\n";
        const lite$report43 = "    char *combined = malloc(left_length + right_length + 1);";
        lite_out += lite$report43 + "\n";
        const lite$report44 = "    if (combined == NULL) {";
        lite_out += lite$report44 + "\n";
        const lite$report45 = "        fprintf(stderr, \"MemoryFault: cannot allocate concatenated text\\n\");";
        lite_out += lite$report45 + "\n";
        const lite$report46 = "        exit(1);";
        lite_out += lite$report46 + "\n";
        const lite$report47 = "    }";
        lite_out += lite$report47 + "\n";
        const lite$report48 = "    memcpy(combined, left, left_length);";
        lite_out += lite$report48 + "\n";
        const lite$report49 = "    memcpy(combined + left_length, right, right_length + 1);";
        lite_out += lite$report49 + "\n";
        const lite$report50 = "    return combined;";
        lite_out += lite$report50 + "\n";
        const lite$report51 = "}";
        lite_out += lite$report51 + "\n";
        const lite$report52 = "";
        lite_out += lite$report52 + "\n";
    }
    void liteFn_emitStringConcatHelper;
    function liteFn_emitProgram(lite_items: { kind: string; name: string; runtime: string; code: string; intValue: bigint; textValue: string }[]): void {
        void lite_items;
        for (const lite_item of [...(lite_items)]) {
            void lite_item;
            if ((((lite_item).kind) === ("FunctionStart"))) {
                liteFn_fail("", "C backend does not support top-level functions yet");
            }
            const lite_unsupported = liteFn_unsupportedBuiltinCode((lite_item).code);
            void lite_unsupported;
            if (((lite_unsupported) !== (""))) {
                liteFn_fail("", lite_unsupported);
            }
            if ((((((((lite_item).kind) === ("LocalTuple"))) || ((((lite_item).kind) === ("VarTuple"))))) || ((((lite_item).kind) === ("AssignTuple"))))) {
                liteFn_fail("", "C backend does not support tuple values yet");
            }
            if ((((((((lite_item).kind) === ("LocalList"))) || ((((lite_item).kind) === ("VarList"))))) || ((((lite_item).kind) === ("AssignList"))))) {
                liteFn_fail("", "C backend does not support list values yet");
            }
            if ((((lite_item).kind) === ("LoopSeq"))) {
                liteFn_fail("", "C backend does not support list traversal yet");
            }
            if (((liteFn_codeUsesListIndex((lite_item).code)) || (liteFn_codeUsesListPop((lite_item).code)))) {
                liteFn_fail("", "C backend does not support list values yet");
            }
            if (liteFn_codeUsesValueIf((lite_item).code)) {
                liteFn_fail("", "C backend does not support value if expressions yet");
            }
        }
        const lite$report53 = "#include <stdio.h>";
        lite_out += lite$report53 + "\n";
        if (((liteFn_usesIntDivision([...(lite_items)])) || (liteFn_usesStringConcat([...(lite_items)])))) {
            const lite$report54 = "#include <stdlib.h>";
            lite_out += lite$report54 + "\n";
        }
        const lite$report55 = "#include <inttypes.h>";
        lite_out += lite$report55 + "\n";
        const lite$report56 = "#include <stdbool.h>";
        lite_out += lite$report56 + "\n";
        const lite$report57 = "#include <string.h>";
        lite_out += lite$report57 + "\n";
        liteFn_emitIntDivisionHelpers([...(lite_items)]);
        if (liteFn_usesStringConcat([...(lite_items)])) {
            liteFn_emitStringConcatHelper();
        }
        const lite$report58 = "int main(void) {";
        lite_out += lite$report58 + "\n";
        const lite$report59 = "    int status = 0;";
        lite_out += lite$report59 + "\n";
        let lite_indent = "    ";
        void lite_indent;
        let lite_count = 0n;
        void lite_count;
        for (const lite_item of [...(lite_items)]) {
            void lite_item;
            if ((((((lite_item).kind) === ("LocalInt"))) || ((((lite_item).kind) === ("VarInt"))))) {
                const lite$report60 = ((((((((((lite_indent) + ("int64_t "))) + ((lite_item).runtime))) + (" = "))) + ((lite_item).code))) + (";"));
                lite_out += lite$report60 + "\n";
                const lite$report61 = ((((((lite_indent) + ("(void)"))) + ((lite_item).runtime))) + (";"));
                lite_out += lite$report61 + "\n";
            } else if ((((((lite_item).kind) === ("LocalString"))) || ((((lite_item).kind) === ("VarString"))))) {
                const lite$report62 = ((((((((((lite_indent) + ("const char *"))) + ((lite_item).runtime))) + (" = "))) + ((lite_item).code))) + (";"));
                lite_out += lite$report62 + "\n";
                const lite$report63 = ((((((lite_indent) + ("(void)"))) + ((lite_item).runtime))) + (";"));
                lite_out += lite$report63 + "\n";
            } else if ((((((lite_item).kind) === ("LocalBool"))) || ((((lite_item).kind) === ("VarBool"))))) {
                const lite$report64 = ((((((((((lite_indent) + ("bool "))) + ((lite_item).runtime))) + (" = "))) + ((lite_item).code))) + (";"));
                lite_out += lite$report64 + "\n";
                const lite$report65 = ((((((lite_indent) + ("(void)"))) + ((lite_item).runtime))) + (";"));
                lite_out += lite$report65 + "\n";
            } else if ((((((((lite_item).kind) === ("AssignInt"))) || ((((lite_item).kind) === ("AssignString"))))) || ((((lite_item).kind) === ("AssignBool"))))) {
                const lite$report66 = ((((((((lite_indent) + ((lite_item).runtime))) + (" = "))) + ((lite_item).code))) + (";"));
                lite_out += lite$report66 + "\n";
            } else if ((((lite_item).kind) === ("Break"))) {
                const lite$report67 = ((lite_indent) + ("break;"));
                lite_out += lite$report67 + "\n";
            } else if ((((lite_item).kind) === ("Continue"))) {
                const lite$report68 = ((lite_indent) + ("continue;"));
                lite_out += lite$report68 + "\n";
            } else if ((((lite_item).kind) === ("If"))) {
                const lite$report69 = ((((((lite_indent) + ("if ("))) + ((lite_item).code))) + (") {"));
                lite_out += lite$report69 + "\n";
                lite_indent = ((lite_indent) + ("    "));
            } else if ((((lite_item).kind) === ("Else"))) {
                lite_indent = liteFn_dedent(lite_indent);
                const lite$report70 = ((lite_indent) + ("} else {"));
                lite_out += lite$report70 + "\n";
                lite_indent = ((lite_indent) + ("    "));
            } else if ((((lite_item).kind) === ("ElseIf"))) {
                lite_indent = liteFn_dedent(lite_indent);
                const lite$report71 = ((((((lite_indent) + ("} else if ("))) + ((lite_item).code))) + (") {"));
                lite_out += lite$report71 + "\n";
                lite_indent = ((lite_indent) + ("    "));
            } else if ((((lite_item).kind) === ("EndIf"))) {
                lite_indent = liteFn_dedent(lite_indent);
                const lite$report72 = ((lite_indent) + ("}"));
                lite_out += lite$report72 + "\n";
            } else if ((((lite_item).kind) === ("Loop"))) {
                const lite_condition = (Boolean((((lite_item).code) === (""))) ? "true" : (lite_item).code);
                void lite_condition;
                const lite$report73 = ((((((lite_indent) + ("while ("))) + (lite_condition))) + (") {"));
                lite_out += lite$report73 + "\n";
                lite_indent = ((lite_indent) + ("    "));
            } else if ((((lite_item).kind) === ("EndLoop"))) {
                lite_indent = liteFn_dedent(lite_indent);
                const lite$report74 = ((lite_indent) + ("}"));
                lite_out += lite$report74 + "\n";
            } else if ((((lite_item).kind) === ("End"))) {
                const lite$report75 = ((lite_indent) + ("if (printf(\"\\n\") < 0) { status = 1; }"));
                lite_out += lite$report75 + "\n";
                lite_count = 0n;
            } else {
                if (((lite_count) > (0n))) {
                    const lite$report76 = ((lite_indent) + ("if (printf(\" \") < 0) { status = 1; }"));
                    lite_out += lite$report76 + "\n";
                }
                const lite$report77 = ((((((lite_indent) + ("if ("))) + (liteFn_cCall((lite_item).kind, (lite_item).code)))) + (" < 0) { status = 1; }"));
                lite_out += lite$report77 + "\n";
                lite_count = (lite_count + 1n);
            }
        }
        const lite$report78 = "    return status;";
        lite_out += lite$report78 + "\n";
        const lite$report79 = "}";
        lite_out += lite$report79 + "\n";
    }
    void liteFn_emitProgram;
    const lite_prefix = liteFn_sourcePrefix();
    void lite_prefix;
    const lite_source = lite$inputAll();
    void lite_source;
    liteFn_emitProgram([...(liteFn_parseProgram(lite_source, lite_prefix))]);
    return lite_out;
}
