/** Heavy seizure cluster — طلبات/كفيل + إطلاق/استلام/علامات عبر Coercive. */
import { useExecutionDashboardCoreHandlerClusterFoundation } from './useExecutionDashboardCoreHandlerClusterFoundation';
import { useExecutionDashboardCoreHandlerClusterSeizureFollowup } from './useExecutionDashboardCoreHandlerClusterSeizureFollowup';
import { useExecutionDashboardCoreHandlerClusterSeizureCoercive } from './useExecutionDashboardCoreHandlerClusterSeizureCoercive';
import type { ExecutionDashboardCoreHandlerClusterInput } from './executionDashboardCoreHandlerClusterTypes';

const noopFocus = (_decisionId: string, _subject?: string) => {};

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

    const seizureCoercive = useExecutionDashboardCoreHandlerClusterSeizureCoercive(c, {
        pushTimelineEvent,
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
        // تركيز الإكمال أُزيل — نُبقي دوالاً آمنة حتى لا تنهار حقائب الهاتف/الـ stubs
        focusSeizurePropertyInlineCompletion: noopFocus,
        focusSeizureMovableInlineCompletion: noopFocus,
        focusSeizureThirdPartyInlineCompletion: noopFocus,
        focusSeizureNoticeInlineCompletion: noopFocus,
        ...seizureFollowupBlock,
        ...seizureCoercive,
    };
}
