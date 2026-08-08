import { describe, expect, it, beforeEach } from 'vitest';
import {
    clearAllSeizureWorkflowOptimisticPendingForTests,
    patchSeizureWorkflowOptimisticPending,
    readSeizureWorkflowOptimisticPending,
    writeSeizureWorkflowOptimisticPending,
} from '@/app/domain/seizure/seizureWorkflowOptimisticPendingSession';

describe('seizureWorkflowOptimisticPendingSession', () => {
    beforeEach(() => {
        clearAllSeizureWorkflowOptimisticPendingForTests();
    });

    it('persists optimistic pending by entity across reads', () => {
        writeSeizureWorkflowOptimisticPending('movable', 'movable-1', {
            movable_auction_date: 'dec-1',
        });
        expect(readSeizureWorkflowOptimisticPending('movable', 'movable-1')).toEqual({
            movable_auction_date: 'dec-1',
        });
    });

    it('patches and removes subtype entries', () => {
        patchSeizureWorkflowOptimisticPending('movable', 'movable-1', 'movable_expert', 'dec-e');
        patchSeizureWorkflowOptimisticPending('movable', 'movable-1', 'movable_expert', null);
        expect(readSeizureWorkflowOptimisticPending('movable', 'movable-1')).toEqual({});
    });
});
