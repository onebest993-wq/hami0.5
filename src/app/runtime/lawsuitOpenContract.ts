/**
 * عقد فتح إضبارة الدعوى — commit فوري + تسخين chrome بلا انتظار.
 * يطابق مبدأ التنفيذ/الإعدادات: لا تُعلَّق النقرة على warm.
 */
export const LAWSUIT_DOSSIER_CLICK_BUDGET_MS = 400;

/** يُطلَق قبل commit فتح الدعوى — يمنع وميض إضبارة التنفيذ المسلّحة */
export const LAWSUIT_DOSSIER_SUPPRESS_EXECUTION_HOST_EVENT =
    'hami:lawsuit-dossier-suppress-execution-host';

/** تسخين بوابة SmartFile + المحتوى + مساحة الدعاوى — fire-and-forget */
export function prepareLawsuitDossierOpen(): void {
    if (typeof window === 'undefined') return;
    void import('@/app/components/lawyer/dashboard/smartFileModalPortalLazy')
        .then((m) => m.prefetchSmartFileModalPortal())
        .catch(() => undefined);
    void import('@/app/runtime/smartFileModalLoader')
        .then((m) => m.prefetchSmartFileModalPhased())
        .catch(() => undefined);
    void import('@/app/runtime/lawsuitWorkspaceWarm')
        .then((m) => m.warmLawsuitWorkspace({ includeSecondary: false }))
        .catch(() => undefined);
}

/** commit الحالة فوراً بعد بدء التسخين — مصدر الحقيقة لفتح الدعوى */
export function openLawsuitDossierWithContract(commit: () => void): void {
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent(LAWSUIT_DOSSIER_SUPPRESS_EXECUTION_HOST_EVENT));
    }
    prepareLawsuitDossierOpen();
    commit();
}
