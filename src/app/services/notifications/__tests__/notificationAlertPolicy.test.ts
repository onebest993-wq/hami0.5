import { describe, expect, it } from 'vitest';
import {
    isSessionMuted,
    shouldPlayChannelSound,
    shouldSendOsPush,
} from '@/app/services/notifications/notificationAlertPolicy';
import { LAWYER_SETTINGS_V2_DEFAULTS } from '@/app/services/settings/defaults';
import { patchNotificationSettings, sessionMuteUntilMs } from '@/app/services/settings/notificationSettings';

describe('notificationAlertPolicy', () => {
    it('يكتم الجلسة عند sessionMutedUntil', () => {
        const settings = {
            ...LAWYER_SETTINGS_V2_DEFAULTS,
            notifications: patchNotificationSettings(LAWYER_SETTINGS_V2_DEFAULTS.notifications, {
                sessionMutedUntil: sessionMuteUntilMs(30),
            }),
        };
        expect(isSessionMuted(settings)).toBe(true);
        expect(shouldPlayChannelSound('calendar', settings)).toBe(false);
    });

    it('يعطّل صوت قناة محددة', () => {
        const settings = {
            ...LAWYER_SETTINGS_V2_DEFAULTS,
            notifications: patchNotificationSettings(LAWYER_SETTINGS_V2_DEFAULTS.notifications, {
                channel: 'calendar',
                channelPatch: { sound: false },
            }),
        };
        expect(shouldPlayChannelSound('calendar', settings)).toBe(false);
        expect(shouldPlayChannelSound('community', settings)).toBe(true);
    });

    it('يمنع push عند تعطيل القناة', () => {
        const settings = {
            ...LAWYER_SETTINGS_V2_DEFAULTS,
            notifications: patchNotificationSettings(LAWYER_SETTINGS_V2_DEFAULTS.notifications, {
                channel: 'community',
                channelPatch: { enabled: false },
            }),
        };
        expect(shouldSendOsPush('community', settings)).toBe(false);
    });

    it('لا يفعّل إشعارات أقسام خارج المنتدى/النظام/التقويم', () => {
        expect(shouldSendOsPush('lawsuits', LAWYER_SETTINGS_V2_DEFAULTS)).toBe(false);
        expect(shouldSendOsPush('execution', LAWYER_SETTINGS_V2_DEFAULTS)).toBe(false);
        expect(shouldSendOsPush('financial', LAWYER_SETTINGS_V2_DEFAULTS)).toBe(false);
        expect(shouldSendOsPush('community', LAWYER_SETTINGS_V2_DEFAULTS)).toBe(true);
        expect(shouldSendOsPush('secretary', LAWYER_SETTINGS_V2_DEFAULTS)).toBe(true);
    });

    it('الاهتزاز لا يعتمد على صوت القناة', async () => {
        const { shouldVibrateChannel } = await import(
            '@/app/services/notifications/notificationAlertPolicy'
        );
        const settings = {
            ...LAWYER_SETTINGS_V2_DEFAULTS,
            notifications: patchNotificationSettings(LAWYER_SETTINGS_V2_DEFAULTS.notifications, {
                vibrateMaster: true,
                channel: 'community',
                channelPatch: { sound: false, enabled: true },
            }),
        };
        expect(shouldVibrateChannel('community', settings)).toBe(true);
    });

    it('لا يكتب تفضيلات الإشعارات كنص صريح في localStorage', async () => {
        const key = 'hami:notification-prefs-cache:v1';
        localStorage.setItem(key, '{"leaked":true}');
        const { cacheNotificationPrefsForBackground } = await import(
            '@/app/services/notifications/notificationAlertPolicy'
        );
        cacheNotificationPrefsForBackground(LAWYER_SETTINGS_V2_DEFAULTS);
        expect(localStorage.getItem(key)).toBeNull();
    });
});
