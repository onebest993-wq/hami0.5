import React from 'react';
import {
    closeSeizureSubtypeDecisionCycle,
    isGuarantorRequestDecisionRow,
} from '@/app/utils/executorSeizureDecisionQueue';
import {
    SEIZURE_LANE_SUBTYPE,
    type SeizureRequestLaneTab,
} from './seizureRequestsTabHelpers';
import type { DecisionRow } from './useSeizureRequestsTabModel.types';

export function useSeizureRequestsTabOpeners(input: {
    resolvedExecutionId: string;
    decisions: DecisionRow[];
}) {
    const { resolvedExecutionId, decisions } = input;

    const openAppeals = React.useCallback(
        (decisionId?: string) => {
            if (!resolvedExecutionId) return;
            try {
                window.dispatchEvent(
                    new CustomEvent('hami-open-decisions-modal', {
                        detail: {
                            executionId: resolvedExecutionId,
                            tab: 'appeals',
                            decisionId: decisionId || undefined,
                        },
                    }),
                );
            } catch {}
        },
        [resolvedExecutionId],
    );

    const openDecisions = React.useCallback(
        (decisionId?: string) => {
            if (!resolvedExecutionId) return;
            try {
                window.dispatchEvent(
                    new CustomEvent('hami-open-decisions-modal', {
                        detail: {
                            executionId: resolvedExecutionId,
                            tab: 'current',
                            decisionId: decisionId || undefined,
                        },
                    }),
                );
            } catch {
                /* ignore */
            }
        },
        [resolvedExecutionId],
    );

    const openGuarantorDetails = React.useCallback(
        (decisionId?: string) => {
            if (!resolvedExecutionId) return;
            try {
                window.dispatchEvent(
                    new CustomEvent('hami-open-guarantor-details', {
                        detail: {
                            executionId: resolvedExecutionId,
                            decisionId: decisionId || undefined,
                        },
                    }),
                );
            } catch {}
        },
        [resolvedExecutionId],
    );

    const findLatestGuarantorDecision = React.useMemo((): DecisionRow | null => {
        const row = decisions.find((r) => isGuarantorRequestDecisionRow(r));
        return row || null;
    }, [decisions]);

    const acknowledgeSeizureRequestFromLog = React.useCallback(
        (tab: SeizureRequestLaneTab) => {
            if (!resolvedExecutionId) return;
            closeSeizureSubtypeDecisionCycle({
                executionId: resolvedExecutionId,
                subtype: SEIZURE_LANE_SUBTYPE[tab],
            });
        },
        [resolvedExecutionId],
    );

    return {
        openAppeals,
        openDecisions,
        openGuarantorDetails,
        findLatestGuarantorDecision,
        acknowledgeSeizureRequestFromLog,
    };
}
