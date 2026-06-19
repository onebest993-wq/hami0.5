import { describe, expect, it } from 'vitest';
import { filterTimelineEvents } from '../timelineSearch';

describe('timelineSearch', () => {
    it('filters by title and details', () => {
        const events = [
            { id: '1', type: 'note', date: '2026-01-01', title: 'محضر الجلسة 1', details: 'مجريات' },
            { id: '2', type: 'appointment', date: '2026-01-02', title: 'جلسة مرافعة', details: 'موعد' },
        ];

        expect(filterTimelineEvents(events, '')).toHaveLength(2);
        expect(filterTimelineEvents(events, 'محضر')).toHaveLength(1);
        expect(filterTimelineEvents(events, 'مرافعة')).toHaveLength(1);
        expect(filterTimelineEvents(events, 'xyz')).toHaveLength(0);
    });
});
