import { describe, it, expect } from 'vitest';
import type { TimelineEvent } from '@/app/types/execution';
import {
    TIMELINE_METADATA_DEBTOR_KEY,
    timelineDebtorMetadata,
    timelineEventBelongsToDebtorWorkspace,
} from '@/app/utils/timelineDebtorScope';

describe('timelineDebtorScope', () => {
    it('timelineDebtorMetadata uses stable key', () => {
        const m = timelineDebtorMetadata('debtor-x');
        expect(m[TIMELINE_METADATA_DEBTOR_KEY]).toBe('debtor-x');
    });

    it('event without metadata belongs to primary tab only', () => {
        const e = { id: '1', title: 'x', date: '2026-01-01', type: 'summons' } as TimelineEvent;
        expect(timelineEventBelongsToDebtorWorkspace(e, 'primary_debtor', 'primary_debtor')).toBe(true);
        expect(timelineEventBelongsToDebtorWorkspace(e, 'other', 'primary_debtor')).toBe(false);
    });

    it('event with timelineDebtorKey matches that debtor tab', () => {
        const e = {
            id: '2',
            title: 'تكليف',
            date: '2026-01-02',
            type: 'summons',
            metadata: timelineDebtorMetadata('d-99'),
        } as TimelineEvent;
        expect(timelineEventBelongsToDebtorWorkspace(e, 'd-99', 'primary_debtor')).toBe(true);
        expect(timelineEventBelongsToDebtorWorkspace(e, 'primary_debtor', 'primary_debtor')).toBe(false);
    });
});
