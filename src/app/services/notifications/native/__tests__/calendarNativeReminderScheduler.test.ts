import { describe, expect, it } from 'vitest';
import {
    buildCalendarNativeSchedules,
    buildCalendarSnoozeNativeSchedules,
    buildImmediateNativeNotification,
} from '@/app/services/notifications/native/calendarNativeReminderScheduler';
import { LAWYER_SETTINGS_V2_DEFAULTS } from '@/app/services/settings/defaults';
import { publishLawyerSettingsLive } from '@/app/services/settings/settingsSnapshot';
import type { CalendarEvent } from '@/app/services/cloud/lawyerCalendarTypes';
import {
    HAMI_NATIVE_CHANNEL_IDS,
    HAMI_NATIVE_CHANNEL_IDS_LEGACY,
} from '@/app/services/notifications/native/nativeNotificationChannels';
import { toCapacitorNotificationPayload } from '@/app/services/notifications/HamiNotificationBridge';
import {
    HAMI_ARRIVAL_SOUND_FILE,
    HAMI_LEGAL_ALARM_SOUND_FILE,
} from '@/app/services/notifications/native/hamiNativeSound';

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
        expect(schedules[0]!.channelId).toBe('hami-calendar-v4');
    });

    it('يتخطى المواعيد الماضية', () => {
        publishLawyerSettingsLive(LAWYER_SETTINGS_V2_DEFAULTS);
        const now = new Date('2026-08-08T10:30:00');
        const schedules = buildCalendarNativeSchedules([event], now);
        expect(schedules).toHaveLength(0);
    });
});

describe('قناة Android v2 + إشعار فوري', () => {
    it('يستخدم معرّفات v2 ويحتفظ بالقديمة للحذف', () => {
        expect(HAMI_NATIVE_CHANNEL_IDS.community).toBe('hami-community-v3');
        expect(HAMI_NATIVE_CHANNEL_IDS.secretary).toBe('hami-secretary-v3');
        expect(HAMI_NATIVE_CHANNEL_IDS_LEGACY).toContain('hami-community-v2');
        expect(HAMI_NATIVE_CHANNEL_IDS.calendar).toBe('hami-calendar-v4');
        expect(HAMI_NATIVE_CHANNEL_IDS_LEGACY).toContain('hami-calendar-v3');
    });

    it('الإشعار الفوري يُعلَّم immediate ويُحذف schedule من حمولة Capacitor', () => {
        publishLawyerSettingsLive(LAWYER_SETTINGS_V2_DEFAULTS);
        const item = buildImmediateNativeNotification({
            key: 'preview-1',
            channel: 'community',
            title: 'حامي',
            body: 'تجربة',
        });
        expect(item).not.toBeNull();
        expect(item!.immediate).toBe(true);
        const payload = toCapacitorNotificationPayload(item!);
        expect(payload).not.toHaveProperty('schedule');
        expect(payload.sound).toBe(HAMI_ARRIVAL_SOUND_FILE);
        expect(payload.channelId).toBe('hami-community-v3');
        expect(payload.visibility).toBe(0);
        expect(payload.extra).not.toHaveProperty('reminderKey');
    });

    it('تذكير التقويم يوقظ الجهاز ويستخدم نغمة المنبّه القانونية', () => {
        publishLawyerSettingsLive(LAWYER_SETTINGS_V2_DEFAULTS);
        const now = new Date('2026-08-08T09:40:00');
        const schedules = buildCalendarNativeSchedules([event], now);
        const payload = toCapacitorNotificationPayload(schedules[0]!);
        expect(payload.schedule).toEqual({ at: schedules[0]!.fireAt, allowWhileIdle: true });
        expect(payload.sound).toBe(HAMI_LEGAL_ALARM_SOUND_FILE);
        expect(payload.autoCancel).toBe(false);
        expect(payload.extra).toMatchObject({ type: 'calendar-reminder', eventId: 'evt-native' });
    });

    it('يؤجّل المنبه إلى إشعار أصلي لاحق', () => {
        publishLawyerSettingsLive(LAWYER_SETTINGS_V2_DEFAULTS);
        const now = new Date('2026-08-08T09:50:00');
        const until = now.getTime() + 10 * 60_000;
        const snoozes = buildCalendarSnoozeNativeSchedules(
            [
                {
                    key: 'evt-native|2026-08-08|10:00|10',
                    eventId: 'evt-native',
                    date: '2026-08-08',
                    time: '10:00',
                    reminderMinutesBefore: 10,
                    title: 'جلسة محكمة',
                    untilMs: until,
                },
            ],
            now,
        );
        expect(snoozes).toHaveLength(1);
        expect(snoozes[0]!.fireAt.getTime()).toBe(until);
        const payload = toCapacitorNotificationPayload(snoozes[0]!);
        expect(payload.schedule).toEqual({ at: snoozes[0]!.fireAt, allowWhileIdle: true });
        expect(payload.sound).toBe(HAMI_LEGAL_ALARM_SOUND_FILE);
    });
});
