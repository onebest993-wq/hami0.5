import { useCallback } from 'react';
import type { Decision } from '../types';
import {
    appealWindowsForDecision,
    resolveAppealLastDeadlineYmd,
    EXECUTOR_QUEUE_REQUEST_KINDS,
    GRIEVANCE_APPEAL_WINDOW_DAYS,
    CASSATION_APPEAL_WINDOW_DAYS,
} from '../utils';

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
        (decision: Decision) => {
            if (decision.appealStatus === 'final') {
                return {
                    tadhallumDeadline: new Date(),
                    tamyeezDeadline: new Date(),
                    daysToTadhallum: 0,
                    daysToTamyeez: 0,
                    canFileTadhallum: false,
                    canFileTamyeez: false,
                    isFinal: true,
                };
            }
            if (requestNeedsExecutorOutcome(decision)) {
                return {
                    tadhallumDeadline: new Date(),
                    tamyeezDeadline: new Date(),
                    daysToTadhallum: 999,
                    daysToTamyeez: 999,
                    canFileTadhallum: false,
                    canFileTamyeez: false,
                    isFinal: false,
                };
            }
            const w = appealWindowsForDecision(decision);
            const tadhEndYmd = resolveAppealLastDeadlineYmd(
                'tadhallum',
                w.decisionClockYmd,
                w.cassationClockYmd,
            );
            const tamEndYmd = resolveAppealLastDeadlineYmd(
                'tamyeez',
                w.decisionClockYmd,
                w.cassationClockYmd,
            );
            const tadhallumDeadline = new Date(tadhEndYmd);
            const tamyeezDeadline = new Date(tamEndYmd);
            const daysToTadhallum =
                w.canTadhallum && w.grievanceDaysElapsed >= 0
                    ? Math.max(0, GRIEVANCE_APPEAL_WINDOW_DAYS - w.grievanceDaysElapsed)
                    : 0;
            const daysToTamyeez =
                w.canTamyeez && w.cassationDaysElapsed >= 0
                    ? Math.max(0, CASSATION_APPEAL_WINDOW_DAYS - w.cassationDaysElapsed)
                    : 0;

            return {
                tadhallumDeadline,
                tamyeezDeadline,
                daysToTadhallum,
                daysToTamyeez,
                canFileTadhallum: w.canTadhallum,
                canFileTamyeez: w.canTamyeez,
                isFinal: w.isPastTamyeezDeadline && decision.appealStatus === 'pending',
            };
        },
        [requestNeedsExecutorOutcome],
    );

    return {
        requestNeedsExecutorOutcome,
        canShowAppealInitialForDecision,
        getAppealStatus,
    };
}
