export function main(lite$write?: (text: string) => void): string {
    let lite_out = "";
    function lite$emit(text: string): void {
        if (lite$write === undefined) lite_out += text;
        else lite$write(text);
    }
    void lite$emit;
    const lite$report0 = (42n).toString();
    lite$emit(lite$report0 + "\n");
    return lite_out;
}
