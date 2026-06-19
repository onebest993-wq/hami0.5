import React from 'react';
import type { Decision } from '../../types';
import type { UseDecisionsAppealsAppealRenderersArgs } from './appealRenderersTypes';
import {
    appealPipelineRowForCard,
    isExecutorDecisionAppealFinal,
    resolveCreditorDecisionEnforcementState,
    renderDecisionHubStatusPill,
} from '../../utils';

export function useAppealDecisionCardStatus(args: UseDecisionsAppealsAppealRenderersArgs) {
    const {
        appealPerspective,
        decisionsHubTab,
        setAppealDetailDecision,
        setDecisionsHubTab,
        goToAppealsWithScroll,
        requestNeedsExecutorOutcome,
        getAppealStatus,
    } = args;

    const buildDecisionCardStatus = React.useCallback((
        decision: Decision,
        appealWindowClosed: boolean,
        allDecisions: Decision[]
    ) => {
        const pipeline = appealPipelineRowForCard(decision, allDecisions);
        const deadlineMeta = getAppealStatus(decision);
        const ap = pipeline.appealPhase ?? null;
        const awaitingTamyeezAfterGrievance =
            Boolean(pipeline.awaitingCassationEntryBy) ||
            pipeline.grievanceRejectedAwaitingTamyeez === true ||
            pipeline.grievanceAcceptedAwaitingDebtorTamyeez === true;
        const appealTrackVisual =
            ap === 'grievance' ||
            ap === 'cassation' ||
            pipeline.appealStatus === 'tadhallum_filed' ||
            pipeline.appealStatus === 'tamyeez_filed' ||
            Boolean(pipeline.awaitingCassationEntryBy) ||
            pipeline.grievanceAcceptedAwaitingDebtorTamyeez === true;

        const appealLegallyFinal = isExecutorDecisionAppealFinal(decision, pipeline, {
            appealWindowClosed,
            appealTrackActive: appealTrackVisual && !appealWindowClosed,
            isPastTamyeezDeadline: deadlineMeta.isPastTamyeezDeadline,
        });

        const openAppealContext = (final: boolean) => {
            if (final) {
                setAppealDetailDecision(decision);
                setDecisionsHubTab('appeals');
                return;
            }
            goToAppealsWithScroll(decision.id);
        };

        const statusPillEl = (() => {
            const enforcement = resolveCreditorDecisionEnforcementState(decision, pipeline, {
                hubTab: decisionsHubTab,
                appealLegallyFinal,
                needsExecutor: requestNeedsExecutorOutcome(decision),
                appealPerspective,
                allDecisions,
            });
            const isFinalEnforcedLabel =
                enforcement.pillLabel === 'القرار نافذ' ||
                enforcement.pillLabel.endsWith('— نافذ');
            return renderDecisionHubStatusPill(
                enforcement.pillLabel,
                enforcement.pillTone,
                enforcement.enforced && isFinalEnforcedLabel
                    ? () => openAppealContext(true)
                    : undefined
            );
        })();

        return { statusPillEl, appealTrackVisual, awaitingTamyeezAfterGrievance, ap };
    }, [appealPerspective, decisionsHubTab, getAppealStatus, goToAppealsWithScroll, requestNeedsExecutorOutcome]);

    return { buildDecisionCardStatus };
}
