import { useMemo } from 'react';

export function useEvictionProcedureLockHint(
    coerciveUiLocked: boolean,
    coerciveDossierLocked: boolean,
    debtorNotifiedForEvictionGrace: boolean,
    notificationCount: number,
    isEvictionGraceEffectivelyExpired: boolean,
    isEvictionGraceExpiredCalendar: boolean,
    daysRemainingInEvictionGrace: number,
    evictionPremisesUseResolved: string | null | undefined,
    evictionVacateDeadlineLocal: string | null | undefined,
    residentialVacateDeadlineMaxIso: string | null | undefined,
    evictionExecutorVacateGrantApproved: boolean,
    isResidentialVacateGraceFinished: boolean,
) {
    return useMemo(() => {
        if (coerciveUiLocked) return 'موقوفة.';
        if (coerciveDossierLocked) return 'الإجراءات الجبرية مقفلة — الإضبارة ليست نشطة.';
        if (!debtorNotifiedForEvictionGrace) return 'أكمل التبليغ من «التبليغ».';
        if (notificationCount < 2) {
            if (!isEvictionGraceEffectivelyExpired) {
                if (isEvictionGraceExpiredCalendar) {
                    return 'انتهت المدة التقويمية — سجّل «انتهاء مدة التنفيذ الرضائي» من «التبليغ».';
                }
                return `باقٍ على الإخبار: ${daysRemainingInEvictionGrace} يوماً.`;
            }
        }
        if (evictionPremisesUseResolved === 'residential') {
            if (!evictionVacateDeadlineLocal) {
                return `سجّل تاريخ انتهاء المهلة (≤ ${residentialVacateDeadlineMaxIso || '—'}).`;
            }
            if (!evictionExecutorVacateGrantApproved) {
                return 'سجّل موافقة المنفذ على إعطاء المهلة.';
            }
            if (!isResidentialVacateGraceFinished) {
                return `بانتظار انتهاء المهلة (${evictionVacateDeadlineLocal}).`;
            }
        }
        return '';
    }, [
        coerciveUiLocked,
        coerciveDossierLocked,
        debtorNotifiedForEvictionGrace,
        notificationCount,
        isEvictionGraceEffectivelyExpired,
        isEvictionGraceExpiredCalendar,
        daysRemainingInEvictionGrace,
        evictionPremisesUseResolved,
        evictionVacateDeadlineLocal,
        residentialVacateDeadlineMaxIso,
        evictionExecutorVacateGrantApproved,
        isResidentialVacateGraceFinished,
    ]);
}
