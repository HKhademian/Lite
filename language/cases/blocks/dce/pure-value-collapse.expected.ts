export function main(lite$write?: (text: string) => void): string {
    let lite$out = "";
    function lite$emit(text: string): void {
        if (lite$write === undefined) lite$out += text;
        else lite$write(text);
    }
    void lite$emit;
    const lite_x = 5n;
    void lite_x;
    lite$emit((lite_x).toString() + "\n");
    return lite$out;
}
