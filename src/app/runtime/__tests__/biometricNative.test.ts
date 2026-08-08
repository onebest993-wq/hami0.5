import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { callBiometricNative, isBiometricTimingError, withReadyBiometricPlugin } from '@/app/runtime/biometricNative';
const mockCheckBiometry = vi.fn();

vi.mock('@/app/runtime/nativeBridgeReady', () => ({
    whenNativeBridgeReady: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/app/runtime/nativeCapacitorBoot', () => ({
    whenNativeCapacitorBootComplete: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/app/runtime/nativeCapacitorPluginRegistry', () => ({
    loadBiometricAuthPlugin: vi.fn().mockResolvedValue({
        checkBiometry: (...args: unknown[]) => mockCheckBiometry(...args),
        authenticate: vi.fn(),
    }),
}));

vi.mock('@capacitor/core', () => ({
    Capacitor: {
        isNativePlatform: () => true,
        isPluginAvailable: (name: string) => name === 'BiometricAuthNative',
    },
}));

describe('biometricNative', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('يكتشف أخطاء التوقيت المبكر', () => {
        expect(isBiometricTimingError(new Error('"BiometricAuth.then()" is not implemented on android'))).toBe(
            true,
        );
        expect(isBiometricTimingError(new Error('"BiometricAuthNative.then()" is not implemented on android'))).toBe(
            true,
        );
        expect(isBiometricTimingError(new Error('"BiometricAuthNative.checkBiometry()" is not implemented'))).toBe(
            true,
        );
    });

    it('يستدعي checkBiometry بعد جاهزية الجسر', async () => {
        mockCheckBiometry.mockResolvedValue({ isAvailable: true });
        await expect(callBiometricNative((plugin) => plugin.checkBiometry())).resolves.toEqual({
            isAvailable: true,
        });
        expect(mockCheckBiometry).toHaveBeenCalledTimes(2);
    });

    it('لا يرمي عند فشل توقيت BiometricAuthNative.then', async () => {
        vi.useFakeTimers();
        mockCheckBiometry.mockRejectedValue(new Error('"BiometricAuthNative.then()" is not implemented on android'));
        const promise = callBiometricNative((plugin) => plugin.checkBiometry());
        await vi.runAllTimersAsync();
        await expect(promise).resolves.toBeNull();
    });

    it('يمرّر أخطاء المصادقة عبر withReadyBiometricPlugin', async () => {
        mockCheckBiometry.mockResolvedValue({ isAvailable: true });
        const authError = Object.assign(new Error('user cancelled'), { code: 'userCancel' });
        const { loadBiometricAuthPlugin } = await import('@/app/runtime/nativeCapacitorPluginRegistry');
        vi.mocked(loadBiometricAuthPlugin).mockResolvedValue({
            checkBiometry: (...args: unknown[]) => mockCheckBiometry(...args),
            authenticate: vi.fn().mockRejectedValue(authError),
        } as never);

        await expect(
            withReadyBiometricPlugin(async (plugin) => {
                await plugin.authenticate();
                return true;
            }),
        ).rejects.toMatchObject({ code: 'userCancel' });
    });
});