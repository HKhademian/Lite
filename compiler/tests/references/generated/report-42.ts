export function main(lite$write?: (text: string) => void): string {
    let lite$out = "";
    function lite$emit(text: string): void {
        if (lite$write === undefined) lite$out += text;
        else lite$write(text);
    }
    void lite$emit;
    lite$emit((42n).toString() + "\n");
    return lite$out;
}
