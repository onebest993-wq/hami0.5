// @ts-nocheck
/** Heavy seizure cluster without followup/eviction slices. */
import { useExecutionDashboardCoreHandlerClusterFoundation } from './useExecutionDashboardCoreHandlerClusterFoundation';
import { useExecutionDashboardCoreHandlerClusterSeizureFollowup } from './useExecutionDashboardCoreHandlerClusterSeizureFollowup';
import { useExecutionDashboardCoreHandlerClusterSeizureCoercive } from './useExecutionDashboardCoreHandlerClusterSeizureCoercive';
import type { ExecutionDashboardCoreHandlerClusterInput } from './executionDashboardCoreHandlerClusterTypes';

export function useExecutionDashboardCoreHandlerClusterSeizureHeavy(c: ExecutionDashboardCoreHandlerClusterInput) {
    const foundation = useExecutionDashboardCoreHandlerClusterFoundation(c);
    const {
        firstActiveAppealDecisionId,
        removeJudicialCustodianEntry,
        pushTimelineEventBinding,
        pushTimelineEvent,
        propertyInlineSaveCtx,
        movableInlineSaveCtx,
        realEstateSeizureHandlers,
        thirdPartySeizureHandlers,
    } = foundation;

    const seizureFollowupBlock = useExecutionDashboardCoreHandlerClusterSeizureFollowup(c, { pushTimelineEvent });
    const {
        focusSeizurePropertyInlineCompletion,
        focusSeizureMovableInlineCompletion,
        focusSeizureThirdPartyInlineCompletion,
        focusSeizureNoticeInlineCompletion,
        ...seizureFollowupRest
    } = seizureFollowupBlock;

    const seizureCoercive = useExecutionDashboardCoreHandlerClusterSeizureCoercive(c, {
        pushTimelineEvent,
        focusSeizurePropertyInlineCompletion,
        focusSeizureMovableInlineCompletion,
        focusSeizureThirdPartyInlineCompletion,
        focusSeizureNoticeInlineCompletion,
    });

    return {
        firstActiveAppealDecisionId,
        removeJudicialCustodianEntry,
        pushTimelineEventBinding,
        pushTimelineEvent,
        propertyInlineSaveCtx,
        movableInlineSaveCtx,
        realEstateSeizureHandlers,
        thirdPartySeizureHandlers,
        focusSeizurePropertyInlineCompletion,
        focusSeizureMovableInlineCompletion,
        focusSeizureThirdPartyInlineCompletion,
        focusSeizureNoticeInlineCompletion,
        ...seizureFollowupRest,
        ...seizureCoercive,
    };
}
