import { useEffect, useMemo } from 'react';
import {
    handleOpenSeizureCompletionEvent,
    type OpenSeizureCompletionContext,
} from '@/app/components/lawyer/ExecutionDashboard/utils/openSeizureCompletionHandler';

export function useOpenSeizureCompletion(ctx: OpenSeizureCompletionContext) {
    const stableKeys = useMemo(
        () => ({
            executionDataId: ctx.executionDataId,
            executionId: ctx.executionId,
        }),
        [ctx.executionDataId, ctx.executionId]
    );

    useEffect(() => {
        const handler = (e: Event) => handleOpenSeizureCompletionEvent(e, ctx);
        window.addEventListener('hami-open-seizure-completion', handler as EventListener);
        return () =>
            window.removeEventListener('hami-open-seizure-completion', handler as EventListener);
    }, [
        stableKeys.executionDataId,
        stableKeys.executionId,
        ctx.executionDataRef,
        ctx.focusSeizureMovableInlineRef,
        ctx.focusSeizureNoticeInlineRef,
        ctx.focusSeizurePropertyInlineRef,
        ctx.focusSeizureThirdPartyInlineRef,
        ctx.nextTimelineId,
        ctx.persistExecutionMergeRef,
        ctx.pushTimelineEventRef,
        ctx.seizedAssetsSnapshotRef,
        ctx.setSeizedAssets,
        ctx.setSeizureDetailCompletion,
    ]);
}
