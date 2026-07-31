/** يمنع focus-trap من سرقة التركيز أثناء منتقي الملفات الأصلي */
let filePickerGraceUntil = 0;

export function markSettingsFilePickerOpening(): void {
    /* معرض الجهاز قد يستغرق أكثر من ثانيتين قبل إعادة التركيز */
    filePickerGraceUntil = Date.now() + 12_000;
}

export function isSettingsFilePickerGraceActive(): boolean {
    return Date.now() < filePickerGraceUntil;
}
