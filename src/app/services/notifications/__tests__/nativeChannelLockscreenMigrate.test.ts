import { describe, expect, it } from 'vitest';
import {
    HAMI_NATIVE_CHANNEL_IDS,
    HAMI_NATIVE_CHANNEL_IDS_LEGACY,
} from '@/app/services/notifications/native/nativeNotificationChannels';
import {
    HAMI_NATIVE_LOCKSCREEN_CHANNEL_GEN,
    nativeHamiChannelIdsToDelete,
    parseNativeLockscreenChannelGen,
    shouldPurgeDeliveredHamiNotifications,
    shouldRebuildNativeLockscreenChannels,
} from '@/app/services/notifications/native/nativeChannelLockscreenMigrate';

describe('nativeChannelLockscreenMigrate', () => {
    it('يعيد بناء القنوات عندما الجيل المخزّن ليس الحالي', () => {
        expect(parseNativeLockscreenChannelGen(null)).toBe(0);
        expect(parseNativeLockscreenChannelGen('nope')).toBe(0);
        expect(shouldRebuildNativeLockscreenChannels(0)).toBe(true);
        expect(shouldRebuildNativeLockscreenChannels(HAMI_NATIVE_LOCKSCREEN_CHANNEL_GEN)).toBe(false);
    });

    it('عند إعادة البناء يحذف الجيل الحالي وليس فقط القديم', () => {
        const currentCommunity = HAMI_NATIVE_CHANNEL_IDS.community;
        const deleted = nativeHamiChannelIdsToDelete({
            existingIds: [currentCommunity, 'hami-community-v2', 'other-app'],
            rebuildLockscreen: true,
        });
        expect(deleted).toContain(currentCommunity);
        expect(deleted).toContain('hami-community-v2');
        expect(deleted).toContain(HAMI_NATIVE_CHANNEL_IDS_LEGACY[0]);
        expect(deleted).not.toContain('other-app');
        expect(shouldPurgeDeliveredHamiNotifications({ rebuildLockscreen: true, existingIds: [] })).toBe(
            true,
        );
    });

    it('بدون إعادة بناء يحذف البقايا فقط ويمسح الظل إن وُجدت قناة قديمة', () => {
        const currentCommunity = HAMI_NATIVE_CHANNEL_IDS.community;
        const deleted = nativeHamiChannelIdsToDelete({
            existingIds: [currentCommunity, 'hami-community-v2'],
            rebuildLockscreen: false,
        });
        expect(deleted).toContain('hami-community-v2');
        expect(deleted).not.toContain(currentCommunity);
        expect(
            shouldPurgeDeliveredHamiNotifications({
                rebuildLockscreen: false,
                existingIds: [currentCommunity],
            }),
        ).toBe(false);
        expect(
            shouldPurgeDeliveredHamiNotifications({
                rebuildLockscreen: false,
                existingIds: ['hami-community-v2'],
            }),
        ).toBe(true);
    });
});
