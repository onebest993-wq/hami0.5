import { useEffect, useMemo } from 'react';
import {
    handleSeizureDecisionOutcomeEvent,
    type SeizureDecisionOutcomeContext,
} from '@/app/components/lawyer/ExecutionDashboard/utils/seizureDecisionOutcomeHandler';

export function useSeizureDecisionOutcome(ctx: SeizureDecisionOutcomeContext) {
    const stableKeys = useMemo(
        () => ({
            executionDataId: ctx.executionDataId,
            executionId: ctx.executionId,
            decisionsStorageExecutionId: ctx.decisionsStorageExecutionId,
        }),
        [ctx.decisionsStorageExecutionId, ctx.executionDataId, ctx.executionId]
    );

    useEffect(() => {
        const handler = (e: Event) => handleSeizureDecisionOutcomeEvent(e, ctx);
        window.addEventListener('hami-execution-decision-outcome', handler as EventListener);
        return () => window.removeEventListener('hami-execution-decision-outcome', handler as EventListener);
    }, [
        stableKeys.decisionsStorageExecutionId,
        stableKeys.executionDataId,
        stableKeys.executionId,
        ctx.applyThirdPartySeizuresFromPatch,
        ctx.executionDataRef,
        ctx.focusSeizureMovableInlineRef,
        ctx.focusSeizureNoticeInlineRef,
        ctx.focusSeizurePropertyInlineRef,
        ctx.focusSeizureThirdPartyInlineRef,
        ctx.nextTimelineId,
        ctx.openSeizureRequestsTabRef,
        ctx.persistExecutionMergeRef,
        ctx.pushTimelineEventRef,
        ctx.seizureMatrixLedgerParamsRef,
        ctx.setShowCoerciveActionForm,
        ctx.setSeizureDetailCompletion,
        ctx.setShowUnifiedExecutionModal,
        ctx.setUnifiedLedgerRevision,
        ctx.showToast,
    ]);
}
