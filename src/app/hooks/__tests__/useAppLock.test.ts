import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { HAMI_APP_STATE_EVENT } from '@/app/runtime/appStateEvents';
import type { SecuritySettings } from '@/app/services/settings/types';

const hasBiometricSessionEnrollment = vi.fn(() => false);
const verifyBiometricSessionUnlock = vi.fn(async () => true);
const isBiometricWorkspaceUnlocked = vi.fn(() => false);
const markBiometricWorkspaceUnlocked = vi.fn();

vi.mock('@/app/services/security/biometricSessionService', () => ({
    hasBiometricSessionEnrollment: () => hasBiometricSessionEnrollment(),
    verifyBiometricSessionUnlock: () => verifyBiometricSessionUnlock(),
}));

vi.mock('@/app/services/security/biometricWorkspaceGate', () => ({
    isBiometricWorkspaceUnlocked: () => isBiometricWorkspaceUnlocked(),
    markBiometricWorkspaceUnlocked: () => markBiometricWorkspaceUnlocked(),
}));

vi.mock('@/app/runtime/nativeCapacitorBoot', () => ({
    whenNativeCapacitorBootComplete: () => Promise.resolve(),
}));

vi.mock('@/app/runtime/appLockInstantPaint', () => ({
    snapAppLockOpen: vi.fn(),
    snapAppLockClose: vi.fn(),
}));

vi.mock('@/app/runtime/nativeBiometricBridge', () => ({
    hasNativeBiometricEnrollment: () => true,
}));

vi.mock('@/app/runtime/nativeBiometricLifecycle', () => ({
    wireNativeBiometricAvailabilityListener: async () => () => undefined,
}));

import { useAppLock } from '@/app/hooks/useAppLock';

const security = (patch: Partial<SecuritySettings> = {}): SecuritySettings => ({
    localOnlyMode: false,
    privacyBlur: true,
    biometricLock: false,
    autoLockMinutes: 0,
    screenshotDeterrent: false,
    ...patch,
});

describe('useAppLock', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        hasBiometricSessionEnrollment.mockReturnValue(false);
        isBiometricWorkspaceUnlocked.mockReturnValue(false);
    });

    afterEach(() => {
        document.body.innerHTML = '';
    });

    it('يقفل المكتب عند الدخول إذا كانت البصمة مفعّلة والجلسة غير مفتوحة', async () => {
        hasBiometricSessionEnrollment.mockReturnValue(true);
        const { result } = renderHook(() => useAppLock(security({ biometricLock: true })));
        await act(async () => {
            await Promise.resolve();
        });
        expect(result.current.locked).toBe(true);
        expect(result.current.requiresBiometricToUnlock).toBe(true);
    });

    it('لا يقفل فوراً بعد تفعيل البصمة في نفس العملية', async () => {
        hasBiometricSessionEnrollment.mockReturnValue(true);
        isBiometricWorkspaceUnlocked.mockReturnValue(true);
        const { result } = renderHook(() => useAppLock(security({ biometricLock: true })));
        await act(async () => {
            await Promise.resolve();
        });
        expect(result.current.locked).toBe(false);
    });

    it('يقفل عند انتقال التطبيق إلى الخلفية', async () => {
        hasBiometricSessionEnrollment.mockReturnValue(true);
        isBiometricWorkspaceUnlocked.mockReturnValue(true);
        const { result } = renderHook(() =>
            useAppLock(security({ biometricLock: true, autoLockMinutes: 5 })),
        );
        await act(async () => {
            await Promise.resolve();
        });
        expect(result.current.locked).toBe(false);

        act(() => {
            window.dispatchEvent(
                new CustomEvent(HAMI_APP_STATE_EVENT, { detail: { isActive: false } }),
            );
        });
        expect(result.current.locked).toBe(true);
    });

    it('يثبت فتح الجلسة بعد تحقق بيومتري ناجح', async () => {
        hasBiometricSessionEnrollment.mockReturnValue(true);
        const { result } = renderHook(() => useAppLock(security({ biometricLock: true })));
        expect(result.current.locked).toBe(true);

        await act(async () => {
            await result.current.unlockWithBiometric();
        });
        expect(markBiometricWorkspaceUnlocked).toHaveBeenCalled();
        expect(result.current.locked).toBe(false);
    });
});
