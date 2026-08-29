/**
 * حارس صفحة الإنشاء: لا يُمسح pending/WAL في نفس تحميل الصفحة التي أنشأت الإضبارة.
 * إثبات القرص في الجلسة الحالية يكذب بعد Reload يقتل تشفير IndexedDB أو كتابة أقدم تسبق.
 * المسح مسموح فقط بعد إقلاع صفحة جديدة (module reload) ثم إثبات القرص.
 */

const stagedThisPage = new Set<string>();
const journaledThisPage = new Set<string>();

export function markLawsuitStagedThisPage(fileId: string | number): void {
    const id = String(fileId);
    if (id) stagedThisPage.add(id);
}

export function wasLawsuitStagedThisPage(fileId: string | number): boolean {
    return stagedThisPage.has(String(fileId));
}

export function markLawsuitJournaledThisPage(fileId: string | number): void {
    const id = String(fileId);
    if (id) journaledThisPage.add(id);
}

export function wasLawsuitJournaledThisPage(fileId: string | number): boolean {
    return journaledThisPage.has(String(fileId));
}

/** اختبارات: محاكاة Reload — يفرّغ حارس الصفحة دون مسح localStorage */
export function resetLawsuitPageWriteGuardForTests(): void {
    if (!import.meta.env.VITEST) return;
    stagedThisPage.clear();
    journaledThisPage.clear();
}
