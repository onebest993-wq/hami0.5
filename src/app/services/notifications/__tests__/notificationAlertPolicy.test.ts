import { describe, expect, it } from 'vitest';
import {
    isSessionMuted,
    shouldPlayChannelSound,
    shouldSendOsPush,
    shouldShowSecretaryAlerts,
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
        expect(shouldPlayChannelSound('lawsuits', settings)).toBe(true);
    });

    it('يعطّل السكرتير عند secretaryEnabled=false', () => {
        const settings = {
            ...LAWYER_SETTINGS_V2_DEFAULTS,
            notifications: patchNotificationSettings(LAWYER_SETTINGS_V2_DEFAULTS.notifications, {
                secretaryEnabled: false,
            }),
        };
        expect(shouldShowSecretaryAlerts(settings)).toBe(false);
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
});
