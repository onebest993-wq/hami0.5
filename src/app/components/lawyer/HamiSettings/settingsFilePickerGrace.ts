/** يمنع focus-trap من سرقة التركيز أثناء منتقي الملفات الأصلي */
let filePickerGraceUntil = 0;

export function markSettingsFilePickerOpening(): void {
    filePickerGraceUntil = Date.now() + 2_500;
}

export function isSettingsFilePickerGraceActive(): boolean {
    return Date.now() < filePickerGraceUntil;
}
