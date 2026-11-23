export function main(lite$write?: (text: string) => void): string {
    const lite$out: string[] = [];
    function lite$emit(text: string): void {
        if (lite$write === undefined) lite$out.push(text);
        else lite$write(text);
    }
    lite$emit((42n).toString() + "\n");
    return lite$out.join("");
}
