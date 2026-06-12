import { useEffect, useMemo } from 'react';
import {
    handleTrustDisbursedEvent,
    type TrustDisbursedOutcomeContext,
} from '@/app/components/lawyer/ExecutionDashboard/utils/trustDisbursedOutcomeHandler';

export function useTrustDisbursedOutcome(ctx: TrustDisbursedOutcomeContext) {
    const stableKeys = useMemo(
        () => ({
            executionDataId: ctx.executionDataId,
            executionId: ctx.executionId,
        }),
        [ctx.executionDataId, ctx.executionId]
    );

    useEffect(() => {
        const handler = (e: Event) => handleTrustDisbursedEvent(e, ctx);
        window.addEventListener('hami-trust-disbursed', handler as EventListener);
        return () => window.removeEventListener('hami-trust-disbursed', handler as EventListener);
    }, [
        stableKeys.executionDataId,
        stableKeys.executionId,
        ctx.executionDataRef,
        ctx.persistExecutionMergeRef,
    ]);
}
