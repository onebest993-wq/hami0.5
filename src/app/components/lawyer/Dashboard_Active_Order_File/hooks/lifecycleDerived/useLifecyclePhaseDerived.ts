import { useEffect, useMemo } from 'react';

import type { UseOrderFileLifecycleDerivedArgs } from './types';



export function useLifecyclePhaseDerived(args: UseOrderFileLifecycleDerivedArgs) {
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
    

    const effectiveJudgeDecision = judgeDecision.decision ?? (caseData as any)?.judgeDecision ?? null;
const effectiveJudgeDecisionDate = String(judgeDecision.decisionDate || (caseData as any)?.judgeDecisionDate || '').trim();
const defenderStateOrderSummaryDate = useMemo(() => {
    const s = String((caseData as any)?.stateOrderIssuedDate || '').trim();
    return s.match(/^(\d{4}-\d{2}-\d{2})/)?.[1] ?? '';
}, [(caseData as any)?.stateOrderIssuedDate]);
const judgePhaseComplete = !!effectiveJudgeDecision && !!effectiveJudgeDecisionDate;
const showGrievanceLifecycle =
    showGrievanceStep &&
    (judgePhaseComplete || isFinalized) &&
    (effectiveJudgeDecision === 'rejected' ||
        effectiveJudgeDecision === 'accepted' ||
        effectiveJudgeDecision === 'partially_accepted' ||
        !!caseData?.grievanceOutcome ||
        !!caseData?.grievanceDecision ||
        isFinalityNoGrievance);
const showCassationLifecycle = useMemo(() => {
    if (isIqrarContext) return false;
    if (!showGrievanceStep) {
        return (
            judgePhaseComplete ||
            !!caseData?.cassationOutcome ||
            !!caseData?.cassationDecision ||
            isFinalized
        );
    }
    const grievanceReached =
        !!caseData?.grievanceOutcome ||
        !!caseData?.grievanceDecision ||
        isFinalityNoGrievance ||
        (isFinalized && effectiveJudgeDecision === 'rejected') ||
        (isFinalized &&
            (effectiveJudgeDecision === 'accepted' || effectiveJudgeDecision === 'partially_accepted'));
    const cassationReached =
        !!caseData?.cassationOutcome ||
        !!caseData?.cassationDecision ||
        (caseData as any)?.legalState === 'Awaiting_Cassation' ||
        isFinalized;
    return grievanceReached && cassationReached;
}, [
    caseData,
    effectiveJudgeDecision,
    isFinalityNoGrievance,
    isFinalized,
    judgePhaseComplete,
    showGrievanceStep,
    isIqrarContext,
]);
    const effectiveRejectionNotificationDate = useMemo(() => {
        return String(grievanceData.rejectionNotificationDate || (caseData as any)?.notificationDate || '').trim();
    }, [caseData, grievanceData.rejectionNotificationDate]);

    return {
        effectiveJudgeDecision,
        effectiveJudgeDecisionDate,
        defenderStateOrderSummaryDate,
        judgePhaseComplete,
        showGrievanceLifecycle,
        showCassationLifecycle,
        effectiveRejectionNotificationDate,
    };
}
