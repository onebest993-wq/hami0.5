/**
 * مصفوفة أساسية فارغة بعد فكّ التشفير = الحالة المعتمدة.
 * الدمج من المفاتيح القديمة فوقها كان يعيد إضبارة محذوفة إلى `lawyer_files`.
 */
export function isCanonicalEmptyDossierPrimary(
    primary: unknown[] | null,
    unread: boolean,
): boolean {
    return primary !== null && primary.length === 0 && !unread;
}
