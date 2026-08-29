import {
    HAMI_NATIVE_CHANNEL_IDS,
    HAMI_NATIVE_CHANNEL_IDS_LEGACY,
    staleHamiNotificationChannelIds,
} from '@/app/services/notifications/native/nativeNotificationChannels';

/**
 * جيل قنوات القفل PRIVATE. أندرويد لا يعدّل visibility بعد الإنشاء —
 * أي رقم جديد يحذف القنوات الحالية (حتى نفس المعرّف) ثم يعيد إنشاءها.
 */
export const HAMI_NATIVE_LOCKSCREEN_CHANNEL_GEN = 1;

export const HAMI_NATIVE_LOCKSCREEN_GEN_STORAGE_KEY = 'hami:native-notify-lockscreen-gen';

export function parseNativeLockscreenChannelGen(raw: string | null | undefined): number {
    const n = Number.parseInt(String(raw ?? ''), 10);
    return Number.isFinite(n) && n > 0 ? n : 0;
}

export function shouldRebuildNativeLockscreenChannels(storedGen: number): boolean {
    return storedGen !== HAMI_NATIVE_LOCKSCREEN_CHANNEL_GEN;
}

/** عند إعادة البناء ن حذف الجيل الحالي أيضاً — createChannel لا يُصلح قناة PUBLIC قائمة */
export function nativeHamiChannelIdsToDelete(input: {
    existingIds: readonly string[];
    rebuildLockscreen: boolean;
}): string[] {
    const listedHami = input.existingIds.filter((id) => id.startsWith('hami-'));
    const current = Object.values(HAMI_NATIVE_CHANNEL_IDS);
    const fromDevice = input.rebuildLockscreen
        ? [...listedHami, ...current]
        : staleHamiNotificationChannelIds(input.existingIds);
    return [...new Set([...fromDevice, ...HAMI_NATIVE_CHANNEL_IDS_LEGACY])];
}

export function shouldPurgeDeliveredHamiNotifications(input: {
    rebuildLockscreen: boolean;
    existingIds: readonly string[];
}): boolean {
    if (input.rebuildLockscreen) return true;
    return staleHamiNotificationChannelIds(input.existingIds).length > 0;
}
