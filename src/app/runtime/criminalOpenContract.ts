/**
 * عقد فتح الإضبارة الجزائية — commit فوري ثم تهيئة بالخلفية.
 * يطابق التنفيذ/الدعاوى: لا انتظار prime قبل كشف البوابة.
 */
import { requestCriminalDashboardBridgeActivate } from '@/app/slices/criminal/bridgeEvent';

/** تسخين chrome + حقن السجل — بلا انتظار المستدعي */
export function prepareCriminalDossierOpen(caseId: string): void {
    const trimmed = String(caseId ?? '').trim();
    if (!trimmed || typeof window === 'undefined') return;

    void import('@/app/runtime/criminalDashboardLoader')
        .then((m) => {
            m.prefetchCriminalDashboardChromeWarm();
        })
        .catch(() => undefined);

    void import('@/app/runtime/primeCriminalDossierForOpen')
        .then((m) => m.primeCriminalDossierForOpen(trimmed))
        .catch(() => undefined);
}

/**
 * يفعّل الجسر، ينفّذ commit (setCaseId)، ثم يجهّز البيانات/الـ chunk.
 */
export function openCriminalDossierWithContract(
    caseId: string,
    commit: (trimmedId: string) => void,
): void {
    const trimmed = String(caseId ?? '').trim();
    if (!trimmed) return;
    requestCriminalDashboardBridgeActivate();
    commit(trimmed);
    prepareCriminalDossierOpen(trimmed);
}
