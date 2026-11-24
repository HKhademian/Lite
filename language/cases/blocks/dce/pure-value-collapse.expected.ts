export function main(lite$write?: (text: string) => void): string {
    const lite$out: string[] = [];
    function lite$emit(text: string): void {
        if (lite$write === undefined) lite$out.push(text);
        else lite$write(text);
    }
    const lite_x = 5n;
    void lite_x;
    lite$emit((lite_x).toString() + "\n");
    return lite$out.join("");
}
