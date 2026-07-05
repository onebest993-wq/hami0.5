/** يمنع إغلاق الورقة أو سرقة التركيز أثناء منتقي الملفات الأصلي */
let filePickerGraceUntil = 0;

export function markForumAddQuestionFilePickerOpening(): void {
    filePickerGraceUntil = Date.now() + 3_000;
}

export function isForumAddQuestionFilePickerGraceActive(): boolean {
    return Date.now() < filePickerGraceUntil;
}

export function resetForumAddQuestionFilePickerGraceForTests(): void {
    filePickerGraceUntil = 0;
}
