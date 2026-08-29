import { describe, expect, it, beforeEach } from 'vitest';
import {
    clearCalendarReminderSnoozesForTests,
    isCalendarReminderSnoozed,
    readCalendarReminderSnoozes,
    removeCalendarReminderSnooze,
    upsertCalendarReminderSnooze,
} from '@/app/services/calendar/calendarReminderSnoozeStore';

describe('calendarReminderSnoozeStore', () => {
    beforeEach(() => {
        clearCalendarReminderSnoozesForTests();
    });

    it('يحفظ التأجيل النشط ويتجاهل المنتهي', () => {
        const now = Date.now();
        upsertCalendarReminderSnooze({
            key: 'a|2026-08-22|10:00|10',
            eventId: 'a',
            date: '2026-08-22',
            time: '10:00',
            reminderMinutesBefore: 10,
            title: 'جلسة',
            untilMs: now + 60_000,
        });
        upsertCalendarReminderSnooze({
            key: 'b|2026-08-22|11:00|10',
            eventId: 'b',
            date: '2026-08-22',
            time: '11:00',
            reminderMinutesBefore: 10,
            title: 'قديم',
            untilMs: now - 1_000,
        });

        expect(isCalendarReminderSnoozed('a|2026-08-22|10:00|10', now)).toBe(true);
        expect(isCalendarReminderSnoozed('b|2026-08-22|11:00|10', now)).toBe(false);
        expect(readCalendarReminderSnoozes(now)).toHaveLength(1);

        removeCalendarReminderSnooze('a|2026-08-22|10:00|10');
        expect(readCalendarReminderSnoozes(now)).toHaveLength(0);
    });
});
