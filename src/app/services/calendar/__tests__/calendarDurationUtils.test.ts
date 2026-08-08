import { describe, expect, it } from 'vitest';
import {
    durationMinutesFromTimeRange,
    resolveTimelineEventDurationMinutes,
    resolveUnifiedEventDurationMinutes,
} from '@/app/services/calendar/calendarDurationUtils';
import { detectConflictsFromUnifiedEvents } from '@/app/services/calendar/scheduleConflictDetector';
import type { TimelineEvent } from '@/app/components/lawyer/LawyerShared';

describe('مدة الجلسة من الإضبارة/التقويم', () => {
    it('يستنتج المدة من نطاق الوقت', () => {
        expect(durationMinutesFromTimeRange('09:00', '10:30')).toBe(90);
        expect(durationMinutesFromTimeRange('09:00', '09:45')).toBe(45);
    });

    it('يقرأ durationMinutes من سجل الإضبارة', () => {
        const event = {
            id: 'e1',
            type: 'hearing',
            date: '2026-08-10',
            time: '09:00',
            title: 'جلسة',
            durationMinutes: 120,
        } as TimelineEvent;
        expect(resolveTimelineEventDurationMinutes(event)).toBe(120);
    });

    it('يمرّر مدة الجلسة الطويلة لكاشف التضارب', () => {
        const events = [
            {
                id: 'a',
                title: 'جلسة 1',
                date: '2026-08-10',
                time: '09:00',
                endTime: '10:30',
                type: 'hearing',
                source: 'hearing',
                location: 'محكمة أ',
            },
            {
                id: 'b',
                title: 'جلسة 2',
                date: '2026-08-10',
                time: '11:00',
                type: 'hearing',
                source: 'hearing',
                location: 'محكمة ب',
            },
        ];
        const duration = resolveUnifiedEventDurationMinutes(events[0]);
        expect(duration).toBe(90);
        const conflict = detectConflictsFromUnifiedEvents(events, '2026-08-10');
        expect(conflict.hasTravelConflict).toBe(true);
    });
});
