import type { CriminalCase } from './criminalCaseModel';

/** هل الإضبارة مرئية لمحامي الجلسة الحالية؟ */
export function isCriminalCaseVisibleToLawyer(
    caseRecord: Pick<CriminalCase, 'ownerLawyerId'> | null | undefined,
    lawyerId: string | null | undefined,
): boolean {
    const uid = String(lawyerId ?? '').trim();
    // بلا جلسة: لا تُعرض أي إضبارة (fail-closed) — كان fail-open ويكشف كل الجهاز
    if (!uid) return false;
    const owner = String(caseRecord?.ownerLawyerId ?? '').trim();
    // يتيم بلا مالك: لا يُدرَج في الأرشيف لأي محامٍ — التملّك فقط عند فتح صريح
    if (!owner) return false;
    return owner === uid;
}

/**
 * هل يُسمح بفتح/تعديل/حذف الإضبارة لمحامي الجلسة؟
 * أصرم من العرض: إن وُجد مالك مختلف والمستخدم معروف — يُرفض.
 */
export function canMutateCriminalCaseForLawyer(
    caseRecord: Pick<CriminalCase, 'ownerLawyerId'> | null | undefined,
    lawyerId: string | null | undefined,
): boolean {
    const uid = String(lawyerId ?? '').trim();
    if (!uid) return false;
    const owner = String(caseRecord?.ownerLawyerId ?? '').trim();
    if (!owner) return false;
    return owner === uid;
}

/** يصفّي قائمة الأضابير حسب مالك الجلسة. */
export function filterCriminalCasesForLawyer(
    cases: CriminalCase[],
    lawyerId: string | null | undefined,
): CriminalCase[] {
    const list = Array.isArray(cases) ? cases : [];
    const uid = String(lawyerId ?? '').trim();
    if (!uid) return [];
    return list.filter((c) => isCriminalCaseVisibleToLawyer(c, uid));
}

/** إضبارة تراثية بلا ownerLawyerId مسجّل. */
export function isOrphanCriminalCase(
    caseRecord: Pick<CriminalCase, 'ownerLawyerId'> | null | undefined,
): boolean {
    return !String(caseRecord?.ownerLawyerId ?? '').trim();
}

/**
 * يختم مالك الإضبارة عند التملّك الصريح — فقط لليتامى بلا مالك.
 * يُرجع null إن وُجد مالك أو الجلسة غير معروفة.
 */
export function claimOrphanCriminalCaseOwnership(
    caseRecord: CriminalCase,
    lawyerId: string | null | undefined,
): CriminalCase | null {
    const uid = String(lawyerId ?? '').trim();
    if (!uid || !isOrphanCriminalCase(caseRecord)) return null;
    return { ...caseRecord, ownerLawyerId: uid };
}

/**
 * عند فتح/حقن إضبارة: يتيم → ختم المالك للجلسة؛ غير مرئي لغيره → null.
 * لا يُستدعى على قائمة الأرشيف (تلك تستخدم isCriminalCaseVisibleToLawyer فقط).
 */
export function resolveCriminalCaseForSessionOpen<T extends Pick<CriminalCase, 'ownerLawyerId'>>(
    caseRecord: T,
    lawyerId: string | null | undefined,
): T | null {
    const uid = String(lawyerId ?? '').trim();
    if (!uid) return null;
    if (isOrphanCriminalCase(caseRecord)) {
        return claimOrphanCriminalCaseOwnership(caseRecord as CriminalCase, uid) as T | null;
    }
    if (!isCriminalCaseVisibleToLawyer(caseRecord, uid)) return null;
    return caseRecord;
}

/**
 * ترحيل تراثي اختياري — لم يعد يُطبَّق تلقائياً على كل الأضابير عند فتح الجسر
 * (كان يختم كل اليتامى لأول محامٍ يفتح الجلسة على جهاز مشترك).
 * الإنشاء الجديد يختم المالك عند createCase.
 */
export function claimUnownedCriminalCases(
    casesById: Record<string, CriminalCase>,
    _lawyerId: string,
): { next: Record<string, CriminalCase>; claimedIds: string[] } {
    return { next: casesById, claimedIds: [] };
}
