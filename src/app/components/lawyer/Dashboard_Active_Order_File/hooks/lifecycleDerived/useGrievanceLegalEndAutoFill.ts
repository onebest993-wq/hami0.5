import { useEffect } from 'react';
import { addDaysYmd } from '../../utils/ymd';
import type { UseOrderFileLifecycleDerivedArgs } from './types';



export function useGrievanceLegalEndAutoFill(args: UseOrderFileLifecycleDerivedArgs) {
    const {
        caseData,
        judgeDecision,
        grievanceData,
        grievanceDecision,
        cassationData,
        cassationDecision,
        hearings,
        hearingDraft,
        expertModule,
        phase2FirstHearingDate,
        grievanceLegalEndDate,
        setGrievanceLegalEndDate,
        grievanceTimingConfirmed,
        grievanceDetailsConfirmed,
        grievanceExpiredConfirmed,
        cassationExpiredConfirmed,
        editGrievance,
        requestDateYmd,
        todayYmdValue,
        hasIntervention,
        isFinalized,
        isFinalityNoGrievance,
        defenderPhase2ReadOnly,
        showGrievanceStep,
        isIqrarContext,
        partyLabel,
        computedGrievanceFiledBy,
        computedCassationFiledBy,
        showPreDecisionHearings,
    } = args;
    

    useEffect(() => {
    if (grievanceTimingConfirmed) return;
    const base = String(
        grievanceData.rejectionNotificationDate || caseData?.notificationDate || '',
    ).trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(base)) return;
    if (String(grievanceLegalEndDate || '').trim()) return;
    const end = addDaysYmd(base, 3);
    if (end) setGrievanceLegalEndDate(end);
}, [
    caseData,
    grievanceData.rejectionNotificationDate,
    grievanceLegalEndDate,
    grievanceTimingConfirmed,
    setGrievanceLegalEndDate,
]);
}
