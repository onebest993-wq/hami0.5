import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
    acquireLocalNotificationsPlugin,
    isLocalNotificationsTimingError,
    resetLocalNotificationsNativeForTests,
} from '@/app/runtime/localNotificationsNative';

const mockCheckPermissions = vi.fn();

vi.mock('@/app/runtime/nativeBridgeReady', () => ({
    whenNativeBridgeReady: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/app/runtime/nativeCapacitorBoot', () => ({
    whenNativeCapacitorBootComplete: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/app/runtime/nativePlatform', () => ({
    isCapacitorNativePlatform: () => true,
}));

vi.mock('@capacitor/core', () => ({
    Capacitor: {
        isNativePlatform: () => true,
        isPluginAvailable: (name: string) => name === 'LocalNotifications',
    },
}));

vi.mock('@capacitor/local-notifications', () => ({
    LocalNotifications: {
        checkPermissions: (...args: unknown[]) => mockCheckPermissions(...args),
        createChannel: vi.fn(),
        addListener: vi.fn(),
    },
}));

describe('localNotificationsNative', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        resetLocalNotificationsNativeForTests();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('يكتشف أخطاء التوقيت المبكر', () => {
        expect(isLocalNotificationsTimingError(new Error('"LocalNotifications.then()" is not implemented on android'))).toBe(
            true,
        );
        expect(
            isLocalNotificationsTimingError(new Error('"LocalNotifications.checkPermissions()" is not implemented')),
        ).toBe(true);
    });

    it('يستدعي checkPermissions بعد جاهزية الجسر', async () => {
        mockCheckPermissions.mockResolvedValue({ display: 'granted' });
        const plugin = await acquireLocalNotificationsPlugin();
        expect(plugin).not.toBeNull();
        expect(mockCheckPermissions).toHaveBeenCalled();
    });

    it('يعيد null عند فشل التوقيت المتكرر', async () => {
        vi.useFakeTimers();
        mockCheckPermissions.mockRejectedValue(
            new Error('"LocalNotifications.then()" is not implemented on android'),
        );

        const pending = acquireLocalNotificationsPlugin();
        await vi.runAllTimersAsync();
        await expect(pending).resolves.toBeNull();
    });
});
