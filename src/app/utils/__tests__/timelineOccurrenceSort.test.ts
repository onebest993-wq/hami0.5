import { describe, expect, it } from 'vitest';
import type { TimelineEvent } from '@/app/types/execution';
import {
    parseTimelineDeadlineDate,
    sortTimelineByOccurrence,
    timelineOccurrenceSortMs,
} from '@/app/utils/timelineSmartDisplay';

describe('timeline occurrence ordering', () => {
    it('preserves ISO time instead of truncating to local midnight', () => {
        const morning = parseTimelineDeadlineDate('2026-09-02T09:15:00.000Z');
        const evening = parseTimelineDeadlineDate('2026-09-02T21:40:00.000Z');
        expect(morning).not.toBeNull();
        expect(evening).not.toBeNull();
        expect(evening!.getTime()).toBeGreaterThan(morning!.getTime());
    });

    it('keeps calendar-only dates as local midnight', () => {
        const d = parseTimelineDeadlineDate('2026-09-02');
        expect(d).not.toBeNull();
        expect(d!.getHours()).toBe(0);
        expect(d!.getMinutes()).toBe(0);
    });

    it('orders by registration timestamp, not business date', () => {
        const events: TimelineEvent[] = [
            {
                id: 'old-notice',
                type: 'notification',
                title: 'تبليغ قديم سُجّل الآن',
                date: '2026-08-28',
                timestamp: '2026-09-02T18:00:00.000Z',
            },
            {
                id: 'recent-death',
                type: 'procedure',
                title: 'تسجيل وفاة',
                date: '2026-09-02',
                timestamp: '2026-09-02T12:00:00.000Z',
            },
            {
                id: 'later-approval',
                type: 'decision',
                title: 'موافقة المنفذ',
                date: '2026-09-01',
                timestamp: '2026-09-02T20:00:00.000Z',
            },
        ];
        const sorted = sortTimelineByOccurrence(events);
        expect(sorted.map((e) => e.id)).toEqual(['later-approval', 'old-notice', 'recent-death']);
        expect(timelineOccurrenceSortMs(events[0])).toBeGreaterThan(
            timelineOccurrenceSortMs(events[1]),
        );
    });
});
