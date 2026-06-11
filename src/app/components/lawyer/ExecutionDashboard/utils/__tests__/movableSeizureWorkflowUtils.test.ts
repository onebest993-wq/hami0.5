import { describe, expect, it } from 'vitest';
import {
    findConflictingPendingMovableSubtype,
    movableConflictingSubtypeLabelAr,
} from '../movableSeizureWorkflowUtils';

describe('findConflictingPendingMovableSubtype', () => {
    const movableId = 'mov-1';
    const decisions = [
        {
            id: 'd1',
            requestKind: 'seizure',
            seizureSubtype: 'movable_auction_date',
            executorOutcome: 'pending',
            seizurePayloadJson: JSON.stringify({ seizedMovableId: movableId }),
        },
    ];

    it('blocks objection when auction pending', () => {
        expect(
            findConflictingPendingMovableSubtype(
                decisions,
                movableId,
                'movable_expert_objection'
            )
        ).toBe('movable_auction_date');
    });

    it('allows auction when no conflict', () => {
        expect(
            findConflictingPendingMovableSubtype(decisions, movableId, 'movable_auction_date')
        ).toBeNull();
    });

    it('blocks final award when reauction pending', () => {
        const rows = [
            {
                id: 'd2',
                requestKind: 'seizure',
                seizureSubtype: 'movable_reauction_default',
                executorOutcome: 'pending',
                seizurePayloadJson: JSON.stringify({ seizedMovableId: movableId }),
            },
        ];
        expect(
            findConflictingPendingMovableSubtype(rows, movableId, 'movable_final_award')
        ).toBe('movable_reauction_default');
    });

    it('returns Arabic label for known subtypes', () => {
        expect(movableConflictingSubtypeLabelAr('movable_final_award')).toBe('إحالة قطعية');
    });
});
