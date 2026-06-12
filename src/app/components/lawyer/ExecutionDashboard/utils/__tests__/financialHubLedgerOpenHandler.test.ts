import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { ExecutionFile, SeizedMovable } from '@/app/types/execution';
import { handleFinancialHubLedgerOpenEvent } from '@/app/components/lawyer/ExecutionDashboard/utils/financialHubLedgerOpenHandler';

vi.mock('@/app/components/lawyer/ExecutionDashboard/utils/movableSeizureFinancialUtils', () => ({
    resolveMovableSaleProceedsIqd: vi.fn(() => 500_000),
    creditMovableProceedsForExecution: vi.fn(() => ({
        created: true,
        updated: false,
        paymentId: 'pay-m-1',
    })),
    creditMovableSaleProceedsToTrustLedger: vi.fn(),
}));

vi.mock('@/app/components/lawyer/ExecutionDashboard/utils/propertySeizureFinancialUtils', () => ({
    resolvePropertySaleProceedsIqd: vi.fn(() => 0),
    creditPropertyProceedsForExecution: vi.fn(),
    creditPropertySaleProceedsToTrustLedger: vi.fn(),
}));

describe('handleFinancialHubLedgerOpenEvent', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('ignores events for other executions', () => {
        const openFinancialHubLedger = vi.fn();
        const ctx = {
            executionDataId: 'ex-1',
            executionId: 'ex-1',
            executionDataRef: { current: null as ExecutionFile | null },
            seizureMatrixLedgerParamsRef: { current: null },
            pushTimelineEventRef: { current: vi.fn() },
            nextTimelineId: () => 'tl-1',
            setUnifiedLedgerRevision: vi.fn(),
            showToast: vi.fn(),
            setFinancialHubAutoOpenMode: vi.fn(),
            setFinancialHubSeizedMovableId: vi.fn(),
            setFinancialHubSeizedPropertyId: vi.fn(),
            openFinancialHubLedger,
        };

        handleFinancialHubLedgerOpenEvent(
            new CustomEvent('hami-open-financial-hub-ledger', {
                detail: { executionId: 'ex-2', mode: 'disburse' },
            }),
            ctx
        );

        expect(openFinancialHubLedger).not.toHaveBeenCalled();
    });

    it('opens hub in disburse mode for movable proceeds', async () => {
        const openFinancialHubLedger = vi.fn();
        const pushTimeline = vi.fn();
        const setAutoOpen = vi.fn();
        const setMovableId = vi.fn();
        const movable: SeizedMovable = {
            id: 'sm-1',
            movableDescription: 'سيارة',
            status: 'sold',
        } as SeizedMovable;
        const ctx = {
            executionDataId: 'ex-1',
            executionId: 'ex-1',
            executionDataRef: {
                current: { seizedMovables: [movable] } as ExecutionFile,
            },
            seizureMatrixLedgerParamsRef: { current: { totalOwedUnified: 1_000_000 } as any },
            pushTimelineEventRef: { current: pushTimeline },
            nextTimelineId: () => 'tl-9',
            setUnifiedLedgerRevision: vi.fn(),
            showToast: vi.fn(),
            setFinancialHubAutoOpenMode: setAutoOpen,
            setFinancialHubSeizedMovableId: setMovableId,
            setFinancialHubSeizedPropertyId: vi.fn(),
            openFinancialHubLedger,
        };

        handleFinancialHubLedgerOpenEvent(
            new CustomEvent('hami-open-financial-hub-ledger', {
                detail: {
                    executionId: 'ex-1',
                    mode: 'disburse',
                    seizedMovableId: 'sm-1',
                },
            }),
            ctx
        );

        expect(pushTimeline).toHaveBeenCalledTimes(1);
        expect(setAutoOpen).toHaveBeenCalledWith('disburse');
        expect(setMovableId).toHaveBeenCalledWith('sm-1');
        await new Promise((r) => queueMicrotask(r));
        expect(openFinancialHubLedger).toHaveBeenCalledTimes(1);
    });
});
