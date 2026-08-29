import { debug } from '@/app/utils/debug';

/** حفظ قضية عبر LawyerDB بدون سحب runtime إلى stem اللوحة. */
export function saveCaseDeferred(userId: string, caseData: Record<string, unknown>): void {
    void import('@/app/services/lawyerDbRuntime')
        .then(({ LawyerDB }) => LawyerDB.saveCase(userId, caseData))
        .catch(debug.error);
}

/** مزامنة تقويم مؤجّلة — فشل صامت. */
export function syncLawsuitFileToCalendarDeferred(
    file: Record<string, unknown>,
    userId?: string | null,
): void {
    void import('@/app/services/calendar/dossierSyncLazy')
        .then((m) => m.syncLawsuitFileToCalendar(file, userId))
        .catch(() => undefined);
}
