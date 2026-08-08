import { describe, expect, it } from 'vitest';
import { buildCalendarNativeSchedules } from '@/app/services/notifications/native/calendarNativeReminderScheduler';
import { LAWYER_SETTINGS_V2_DEFAULTS } from '@/app/services/settings/defaults';
import { publishLawyerSettingsLive } from '@/app/services/settings/settingsSnapshot';
import type { CalendarEvent } from '@/app/services/cloud/lawyerCalendarTypes';

const event: CalendarEvent = {
    id: 'evt-native',
    userId: 'u1',
    title: 'جلسة محكمة',
    date: '2026-08-08',
    time: '10:00',
    type: 'custom',
    reminderMinutesBefore: 10,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('buildCalendarNativeSchedules', () => {
    it('يجدول التذكيرات المستقبلية فقط', () => {
        publishLawyerSettingsLive(LAWYER_SETTINGS_V2_DEFAULTS);
        const now = new Date('2026-08-08T09:40:00');
        const schedules = buildCalendarNativeSchedules([event], now);
        expect(schedules).toHaveLength(1);
        expect(schedules[0]!.body).toContain('جلسة محكمة');
        expect(schedules[0]!.channelId).toBe('hami-calendar');
    });

    it('يتخطى المواعيد الماضية', () => {
        publishLawyerSettingsLive(LAWYER_SETTINGS_V2_DEFAULTS);
        const now = new Date('2026-08-08T10:30:00');
        const schedules = buildCalendarNativeSchedules([event], now);
        expect(schedules).toHaveLength(0);
    });
});
