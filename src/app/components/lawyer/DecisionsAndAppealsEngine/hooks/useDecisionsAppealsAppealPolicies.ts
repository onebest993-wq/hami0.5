import { useCallback } from 'react';
import type { Decision } from '../types';
import { appealWindowsForDecision, EXECUTOR_QUEUE_REQUEST_KINDS, type AppealDeadlineWindows } from '../utils';

const CLOSED_APPEAL_WINDOWS: AppealDeadlineWindows = {
    canTadhallum: false,
    canTamyeez: false,
    daysElapsed: 999,
    grievanceDaysElapsed: 999,
    cassationDaysElapsed: 999,
    isPastGrievanceDeadline: true,
    isPastTamyeezDeadline: true,
    decisionClockYmd: '',
    cassationClockYmd: '',
};

const PENDING_EXECUTOR_APPEAL_WINDOWS: AppealDeadlineWindows = {
    canTadhallum: false,
    canTamyeez: false,
    daysElapsed: 0,
    grievanceDaysElapsed: 0,
    cassationDaysElapsed: 0,
    isPastGrievanceDeadline: false,
    isPastTamyeezDeadline: false,
    decisionClockYmd: '',
    cassationClockYmd: '',
};

export function useDecisionsAppealsAppealPolicies() {
    const requestNeedsExecutorOutcome = useCallback((d: Decision) => {
        if (d.executorOutcome === 'withdrawn' || d.lawyerWithdrawn === true) return false;
        return (
            Boolean(d.requestKind && EXECUTOR_QUEUE_REQUEST_KINDS.includes(d.requestKind)) &&
            (d.executorOutcome === undefined || d.executorOutcome === 'pending')
        );
    }, []);

    const canShowAppealInitialForDecision = useCallback(
        (d: Decision): boolean => {
            if (d.noAppealChosen === true) return false;
            if (d.personalCoerciveSubtype === 'release_debtor') return false;
            if (
                (d.personalCoerciveSubtype === 'executive_detention' ||
                    d.personalCoerciveSubtype === 'executive_dossier_presentation') &&
                d.executorDetentionHandedToJudge === true
            ) {
                return false;
            }
            if (d.manualExecutorLedgerEntry) return false;
            if (d.appealRequestOrigin === 'executor_side') return true;
            if (!d.requestKind || !EXECUTOR_QUEUE_REQUEST_KINDS.includes(d.requestKind)) return true;
            if (requestNeedsExecutorOutcome(d)) return false;
            const ex = d.executorOutcome;
            return ex === 'approved' || ex === 'rejected' || ex === 'alternative';
        },
        [requestNeedsExecutorOutcome],
    );

    const getAppealStatus = useCallback(
        (decision: Decision): AppealDeadlineWindows => {
            if (decision.appealStatus === 'final') return CLOSED_APPEAL_WINDOWS;
            if (requestNeedsExecutorOutcome(decision)) return PENDING_EXECUTOR_APPEAL_WINDOWS;
            return appealWindowsForDecision(decision);
        },
        [requestNeedsExecutorOutcome],
    );

    return {
        requestNeedsExecutorOutcome,
        canShowAppealInitialForDecision,
        getAppealStatus,
    };
}
