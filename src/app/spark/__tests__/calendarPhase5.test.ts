import { describe, expect, it } from 'vitest';
import { buildCalendarSparkContext } from '@/app/spark/context/calendarSparkContext';
import { pickActiveCalendarSparkNudge } from '@/app/spark/engine/sparkCalendarEngine';
import { calendarMultiDayTravelRule } from '@/app/spark/procedural/calendarMultiDayTravelRule';
import type { UnifiedEvent } from '@/app/components/lawyer/hooks/useCalendarData';
import { detectConflictsFromUnifiedEvents } from '@/app/services/calendar/scheduleConflictDetector';

describe('calendar phase 5', () => {
    const nowMs = Date.parse('2026-08-05T10:00:00');

    it('يحسب تعارض التنقّل مع مدة الجلسة من الإضبارة', () => {
        const events = [
            {
                id: 'a',
                title: 'جلسة أ',
                date: '2026-08-05',
                time: '10:00',
                endTime: '11:00',
                location: 'محكمة الكرخ',
                type: 'hearing',
                source: 'hearing',
            },
            {
                id: 'b',
                title: 'جلسة ب',
                date: '2026-08-05',
                time: '11:15',
                location: 'محكمة الرصافة',
                type: 'hearing',
                source: 'hearing',
            },
        ];

        const conflict = detectConflictsFromUnifiedEvents(events, '2026-08-05');
        expect(conflict.hasTravelConflict).toBe(true);
    });

    it('يكتشف سفراً بين يومين متتاليين بمواقع مختلفة', () => {
        const events: UnifiedEvent[] = [
            {
                id: 'd1',
                title: 'جلسة كرخ',
                date: '2026-08-05',
                type: 'hearing',
                source: 'hearing',
                court: 'محكمة الكرخ',
            },
            {
                id: 'd2',
                title: 'جلسة رصافة',
                date: '2026-08-06',
                type: 'hearing',
                source: 'hearing',
                court: 'محكمة الرصافة',
            },
        ];

        const ctx = buildCalendarSparkContext(events, { nowMs, horizonHours: 168 });
        const nudge = calendarMultiDayTravelRule(ctx);
        expect(nudge?.kind).toBe('calendar.multi_day_travel');

        const active = pickActiveCalendarSparkNudge(ctx);
        expect(active?.kind).toBe('calendar.multi_day_travel');
    });
});
