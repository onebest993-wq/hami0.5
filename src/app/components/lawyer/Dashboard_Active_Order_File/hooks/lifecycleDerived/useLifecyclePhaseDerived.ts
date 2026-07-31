import { useMemo } from 'react';

import type { UseOrderFileLifecycleDerivedArgs } from './types';

export function useLifecyclePhaseDerived(args: UseOrderFileLifecycleDerivedArgs) {
    const {
        caseData,
        judgeDecision,
        fileStatus,
        grievanceData,
        isFinalized,
        isFinalityNoGrievance,
        showGrievanceStep,
        isIqrarContext,
    } = args;

    const effectiveJudgeDecision = judgeDecision.decision ?? (caseData as any)?.judgeDecision ?? null;
    const effectiveJudgeDecisionDate = String(
        judgeDecision.decisionDate || (caseData as any)?.judgeDecisionDate || '',
    ).trim();
    const persistedJudgeDecision = String((caseData as any)?.judgeDecision ?? '').trim();
    const persistedJudgeDate = String((caseData as any)?.judgeDecisionDate ?? '').trim();
    const judgePhaseSaved =
        (persistedJudgeDecision && persistedJudgeDate) || fileStatus !== 'pending' || isFinalized;

    const defenderStateOrderSummaryDate = useMemo(() => {
        const s = String((caseData as any)?.stateOrderIssuedDate || '').trim();
        return s.match(/^(\d{4}-\d{2}-\d{2})/)?.[1] ?? '';
    }, [(caseData as any)?.stateOrderIssuedDate]);

    const grievancePhaseStarted =
        !!caseData?.grievanceOutcome || !!caseData?.grievanceDecision || isFinalityNoGrievance;

    const grievanceEligible =
        persistedJudgeDecision === 'rejected' ||
        persistedJudgeDecision === 'accepted' ||
        persistedJudgeDecision === 'partially_accepted' ||
        grievancePhaseStarted;

    const showGrievanceLifecycle =
        showGrievanceStep && judgePhaseSaved && grievanceEligible;

    const grievancePhaseClosed =
        !!caseData?.grievanceDecision ||
        caseData?.grievanceOutcome === 'expired' ||
        isFinalityNoGrievance ||
        (isFinalized && persistedJudgeDecision === 'rejected') ||
        !!caseData?.cassationOutcome ||
        !!caseData?.cassationDecision;

    const showCassationLifecycle = useMemo(() => {
        if (isIqrarContext) return false;
        if (!showGrievanceStep) {
            return judgePhaseSaved || !!caseData?.cassationOutcome || !!caseData?.cassationDecision || isFinalized;
        }
        if (!grievancePhaseClosed) return false;
        const cassationReached =
            !!caseData?.cassationOutcome ||
            !!caseData?.cassationDecision ||
            (caseData as any)?.legalState === 'Awaiting_Cassation' ||
            isFinalized;
        return cassationReached;
    }, [caseData, grievancePhaseClosed, isFinalized, isIqrarContext, judgePhaseSaved, showGrievanceStep]);

    const effectiveRejectionNotificationDate = useMemo(() => {
        return String(grievanceData.rejectionNotificationDate || (caseData as any)?.notificationDate || '').trim();
    }, [caseData, grievanceData.rejectionNotificationDate]);

    const judgePhaseComplete = !!effectiveJudgeDecision && !!effectiveJudgeDecisionDate;

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
