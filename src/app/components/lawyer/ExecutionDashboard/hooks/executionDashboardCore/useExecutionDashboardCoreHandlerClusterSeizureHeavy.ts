/** Heavy seizure cluster without followup/eviction slices. */
import { useExecutionDashboardCoreHandlerClusterFoundation } from './useExecutionDashboardCoreHandlerClusterFoundation';
import { useExecutionDashboardCoreHandlerClusterSeizureFollowup } from './useExecutionDashboardCoreHandlerClusterSeizureFollowup';
import { useExecutionDashboardCoreHandlerClusterSeizureCoercive } from './useExecutionDashboardCoreHandlerClusterSeizureCoercive';
import type { ExecutionDashboardCoreHandlerClusterInput } from './executionDashboardCoreHandlerClusterTypes';

type FocusSeizureInlineFn = (decisionId: string, subject?: string) => void;
type FocusSeizureInlineRef = { current?: FocusSeizureInlineFn | null };

function bindFocusViaRef(ref: unknown): FocusSeizureInlineFn {
    return (decisionId, subject) => {
        const current = (ref as FocusSeizureInlineRef | null | undefined)?.current;
        current?.(decisionId, subject);
    };
}

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

    const resolved = c;
    // Thin delegates — AssetModal bridge populates the real impls on these refs.
    const focusSeizurePropertyInlineCompletion = bindFocusViaRef(resolved.focusSeizurePropertyInlineRef);
    const focusSeizureMovableInlineCompletion = bindFocusViaRef(resolved.focusSeizureMovableInlineRef);
    const focusSeizureThirdPartyInlineCompletion = bindFocusViaRef(resolved.focusSeizureThirdPartyInlineRef);
    const focusSeizureNoticeInlineCompletion = bindFocusViaRef(resolved.focusSeizureNoticeInlineRef);

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
        ...seizureFollowupBlock,
        ...seizureCoercive,
    };
}
