/** تطبيع نص بحث مواد القانون — بلا بذور مواد ولا محمل JSON. */
export function normalizeLawSearchText(s: string): string {
    return s
        .trim()
        .toLowerCase()
        .normalize('NFC')
        .replace(/[\u0623\u0625\u0622\u0671]/g, 'ا')
        .replace(/\u0629/g, 'ه')
        .replace(/\u0649/g, 'ي')
        .replace(/\u064A/g, 'ي')
        .replace(/[\u064B-\u0652]/g, '');
}
