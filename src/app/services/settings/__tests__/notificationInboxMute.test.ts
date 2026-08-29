import { describe, expect, it } from 'vitest';
import {
    isNotificationInboxChannel,
    parseDatetimeLocalToMuteUntil,
    toDatetimeLocalValue,
} from '@/app/services/settings/notificationSettings';

describe('notification inbox mute helpers', () => {
    it('يعرّف قنوات اللوحة فقط', () => {
        expect(isNotificationInboxChannel('community')).toBe(true);
        expect(isNotificationInboxChannel('secretary')).toBe(true);
        expect(isNotificationInboxChannel('lawsuits')).toBe(false);
        expect(isNotificationInboxChannel('calendar')).toBe(false);
    });

    it('يرفض موعد كتم في الماضي أو قريب جداً', () => {
        expect(parseDatetimeLocalToMuteUntil('')).toBeNull();
        expect(parseDatetimeLocalToMuteUntil(toDatetimeLocalValue(Date.now() - 60_000))).toBeNull();
        expect(parseDatetimeLocalToMuteUntil(toDatetimeLocalValue(Date.now() + 10_000))).toBeNull();
    });

    it('يقبل موعد كتم لاحق', () => {
        const ms = Date.now() + 2 * 60 * 60_000;
        const parsed = parseDatetimeLocalToMuteUntil(toDatetimeLocalValue(ms));
        expect(parsed).not.toBeNull();
        expect(Math.abs((parsed as number) - ms)).toBeLessThan(60_000);
    });
});
