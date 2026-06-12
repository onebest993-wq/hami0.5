import { describe, expect, it, vi } from 'vitest';
import type { ExecutionFile, SeizedMovable } from '@/app/types/execution';
import { handleTrustDisbursedEvent } from '@/app/components/lawyer/ExecutionDashboard/utils/trustDisbursedOutcomeHandler';

describe('handleTrustDisbursedEvent', () => {
    it('marks movable proceeds disbursed when sold and delivered', () => {
        const persist = vi.fn();
        const movable: SeizedMovable = {
            id: 'sm-1',
            status: 'sold',
            buyerDeliveryCompletedAtIso: '2026-01-01T00:00:00.000Z',
        } as SeizedMovable;
        const ctx = {
            executionDataId: 'ex-1',
            executionId: 'ex-1',
            executionDataRef: {
                current: { seizedMovables: [movable] } as ExecutionFile,
            },
            persistExecutionMergeRef: { current: persist },
        };

        handleTrustDisbursedEvent(
            new CustomEvent('hami-trust-disbursed', {
                detail: { executionId: 'ex-1', seizedMovableId: 'sm-1' },
            }),
            ctx
        );

        expect(persist).toHaveBeenCalledTimes(1);
        const patch = persist.mock.calls[0][0] as { seizedMovables: SeizedMovable[] };
        expect(patch.seizedMovables[0].proceedsDisburseCompletedAtIso).toBeTruthy();
    });

    it('skips when proceeds already disbursed', () => {
        const persist = vi.fn();
        const movable: SeizedMovable = {
            id: 'sm-1',
            status: 'sold',
            buyerDeliveryCompletedAtIso: '2026-01-01T00:00:00.000Z',
            proceedsDisburseCompletedAtIso: '2026-01-02T00:00:00.000Z',
        } as SeizedMovable;
        const ctx = {
            executionDataId: 'ex-1',
            executionId: 'ex-1',
            executionDataRef: {
                current: { seizedMovables: [movable] } as ExecutionFile,
            },
            persistExecutionMergeRef: { current: persist },
        };

        handleTrustDisbursedEvent(
            new CustomEvent('hami-trust-disbursed', {
                detail: { executionId: 'ex-1', seizedMovableId: 'sm-1' },
            }),
            ctx
        );

        expect(persist).not.toHaveBeenCalled();
    });
});
