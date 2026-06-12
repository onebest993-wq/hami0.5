import { useEffect, useMemo } from 'react';
import {
    HAMI_OPEN_FINANCIAL_HUB_LEDGER_EVENT,
    handleFinancialHubLedgerOpenEvent,
    type FinancialHubLedgerOpenContext,
} from '@/app/components/lawyer/ExecutionDashboard/utils/financialHubLedgerOpenHandler';

export function useOpenFinancialHubLedger(ctx: FinancialHubLedgerOpenContext) {
    const stableKeys = useMemo(
        () => ({
            executionDataId: ctx.executionDataId,
            executionId: ctx.executionId,
        }),
        [ctx.executionDataId, ctx.executionId]
    );

    useEffect(() => {
        const handler = (e: Event) => handleFinancialHubLedgerOpenEvent(e, ctx);
        window.addEventListener(HAMI_OPEN_FINANCIAL_HUB_LEDGER_EVENT, handler as EventListener);
        return () =>
            window.removeEventListener(HAMI_OPEN_FINANCIAL_HUB_LEDGER_EVENT, handler as EventListener);
    }, [
        stableKeys.executionDataId,
        stableKeys.executionId,
        ctx.executionDataRef,
        ctx.nextTimelineId,
        ctx.openFinancialHubLedger,
        ctx.pushTimelineEventRef,
        ctx.seizureMatrixLedgerParamsRef,
        ctx.setFinancialHubAutoOpenMode,
        ctx.setFinancialHubSeizedMovableId,
        ctx.setFinancialHubSeizedPropertyId,
        ctx.setUnifiedLedgerRevision,
        ctx.showToast,
    ]);
}
