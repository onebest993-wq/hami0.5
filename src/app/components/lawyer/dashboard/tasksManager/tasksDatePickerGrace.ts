/** يمنع إعادة تخطيط overlay المهام أثناء منتقي التاريخ الأصلي (visualViewport) */
let datePickerGraceUntil = 0;

export function markTasksDatePickerOpening(): void {
    datePickerGraceUntil = Date.now() + 4_000;
}

export function isTasksDatePickerGraceActive(): boolean {
    return Date.now() < datePickerGraceUntil;
}
