import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

const confirm = vi.fn();
const success = vi.fn();
const info = vi.fn();
const warning = vi.fn();
const loading = vi.fn();
const dismiss = vi.fn();
const patchSecurity = vi.fn();
const patchLocalOnlyMode = vi.fn();
const applySettingsSecurityRuntime = vi.fn().mockResolvedValue('ok');
const clearBiometricSessionEnrollment = vi.fn();
const enrollBiometricSessionLock = vi.fn();
const hasBiometricSessionEnrollment = vi.fn();
const probeBiometricSession = vi.fn();
const reconcileBiometricSessionLockEnabled = vi.fn();
const resolveBiometricSessionHint = vi.fn();
const syncNativeScreenshotGuard = vi.fn();

let securityState = {
    localOnlyMode: false,
    privacyBlur: true,
    biometricLock: false,
    autoLockMinutes: 0,
    screenshotDeterrent: false,
};

vi.mock('@/app/components/ui/SmartDialog', () => ({
    SmartDialog: {
        confirm: (...args: unknown[]) => confirm(...args),
    },
}));

vi.mock('@/app/components/ui/SmartToast', () => ({
    SmartToast: {
        success: (...args: unknown[]) => success(...args),
        info: (...args: unknown[]) => info(...args),
        warning: (...args: unknown[]) => warning(...args),
        loading: (...args: unknown[]) => loading(...args),
        dismiss: (...args: unknown[]) => dismiss(...args),
    },
}));

vi.mock('@/app/context/LawyerSettingsContext', () => ({
    useLawyerSettingsSecurity: () => securityState,
}));

vi.mock('@/app/components/lawyer/HamiSettings/hooks/useSettingsPatches', () => ({
    useSettingsPatches: () => ({
        patchSecurity,
        patchLocalOnlyMode,
    }),
}));

vi.mock('@/app/services/settings/settingsSecurityRuntime', () => ({
    applySettingsSecurityRuntime: (...args: unknown[]) => applySettingsSecurityRuntime(...args),
}));

vi.mock('@/app/services/security/biometricSessionService', () => ({
    clearBiometricSessionEnrollment: (...args: unknown[]) => clearBiometricSessionEnrollment(...args),
    enrollBiometricSessionLock: (...args: unknown[]) => enrollBiometricSessionLock(...args),
    hasBiometricSessionEnrollment: () => hasBiometricSessionEnrollment(),
    probeBiometricSession: (...args: unknown[]) => probeBiometricSession(...args),
    reconcileBiometricSessionLockEnabled: (...args: unknown[]) => reconcileBiometricSessionLockEnabled(...args),
    resolveBiometricSessionHint: (...args: unknown[]) => resolveBiometricSessionHint(...args),
}));

vi.mock('@/app/runtime/screenshotDeterrentRuntime', () => ({
    syncNativeScreenshotGuard: (...args: unknown[]) => syncNativeScreenshotGuard(...args),
}));

vi.mock('@/app/runtime/nativePrivacyGuard', () => ({
    applyNativePrivacyGuard: vi.fn(async () => true),
    syncNativePrivacyGuardFromSettings: vi.fn(async () => true),
}));

vi.mock('@/app/components/lawyer/HamiSettings/settingsDialogPrefetch', () => ({
    prefetchSettingsDialogs: vi.fn(),
    ensureSettingsDialogsReady: vi.fn(() => Promise.resolve()),
}));

vi.mock('@/app/runtime/nativePlatform', () => ({
    isCapacitorNativePlatform: vi.fn(() => false),
}));

vi.mock('@/app/services/settings/localOnlyNetworkIsolation', () => ({
    armLocalOnlyNetworkIsolation: vi.fn(),
    installLocalOnlyNetworkIsolation: vi.fn(),
}));

import { useSecuritySection } from '@/app/components/lawyer/HamiSettings/security/useSecuritySection';
import { isCapacitorNativePlatform } from '@/app/runtime/nativePlatform';
import { armLocalOnlyNetworkIsolation } from '@/app/services/settings/localOnlyNetworkIsolation';

describe('useSecuritySection', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        securityState = {
            localOnlyMode: false,
            privacyBlur: true,
            biometricLock: false,
            autoLockMinutes: 0,
            screenshotDeterrent: false,
        };
        confirm.mockResolvedValue(true);
        hasBiometricSessionEnrollment.mockReturnValue(false);
        reconcileBiometricSessionLockEnabled.mockReturnValue('ok');
        probeBiometricSession.mockResolvedValue({
            channel: 'none',
            pluginLoaded: false,
            hardwareAvailable: false,
            enrolled: false,
        });
        resolveBiometricSessionHint.mockReturnValue('');
        enrollBiometricSessionLock.mockResolvedValue({ status: 'unavailable' });
        loading.mockReturnValue('toast-loading');
        syncNativeScreenshotGuard.mockResolvedValue(true);
    });

    it('يفعّل localOnly مع تعطيل مسارات المزامنة بعد التأكيد', async () => {
        const { result } = renderHook(() => useSecuritySection());

        await act(async () => {
            await result.current.toggleLocalOnly(true);
        });

        expect(patchLocalOnlyMode).toHaveBeenCalledWith(true);
        expect(armLocalOnlyNetworkIsolation).toHaveBeenCalledWith(true);
        expect(applySettingsSecurityRuntime).toHaveBeenCalledWith(
            expect.objectContaining({ localOnlyMode: true }),
        );
        expect(patchSecurity).not.toHaveBeenCalled();
    });

    it('يعيد الشبكة عند إيقاف قطع الاتصال', async () => {
        const { result } = renderHook(() => useSecuritySection());

        await act(async () => {
            await result.current.toggleLocalOnly(false);
        });

        expect(armLocalOnlyNetworkIsolation).toHaveBeenCalledWith(false);
        expect(patchLocalOnlyMode).toHaveBeenCalledWith(false);
    });

    it('لا يغيّر localOnly عند إلغاء التأكيد', async () => {
        confirm.mockResolvedValueOnce(false);
        const { result } = renderHook(() => useSecuritySection());

        await act(async () => {
            await result.current.toggleLocalOnly(true);
        });

        expect(patchLocalOnlyMode).not.toHaveBeenCalled();
        expect(applySettingsSecurityRuntime).not.toHaveBeenCalled();
    });

    it('يعطّل البصمة عبر BiometricSessionService', async () => {
        const { result } = renderHook(() => useSecuritySection());

        await act(async () => {
            await result.current.toggleBiometric(false);
        });

        expect(clearBiometricSessionEnrollment).toHaveBeenCalledTimes(1);
        expect(patchSecurity).toHaveBeenCalledWith({ biometricLock: false });
    });

    it('لا يوقف البصمة إن أُلغي التأكيد', async () => {
        confirm.mockResolvedValueOnce(false);
        const { result } = renderHook(() => useSecuritySection());

        await act(async () => {
            await result.current.toggleBiometric(false);
        });

        expect(clearBiometricSessionEnrollment).not.toHaveBeenCalled();
        expect(patchSecurity).not.toHaveBeenCalled();
    });

    it('يعيد ضبط القفل عند وجود علم مفعّل بلا تسجيل فعلي', async () => {
        securityState = { ...securityState, biometricLock: true };
        reconcileBiometricSessionLockEnabled.mockReturnValue('reset');

        renderHook(() => useSecuritySection());

        await waitFor(() => {
            expect(patchSecurity).toHaveBeenCalledWith({ biometricLock: false });
        });
        expect(info).toHaveBeenCalled();
    });

    it('يفعّل البصمة ويضبط القفل التلقائي عند الحاجة', async () => {
        enrollBiometricSessionLock.mockResolvedValueOnce({ status: 'enrolled' });
        securityState = { ...securityState, autoLockMinutes: 0 };

        const { result } = renderHook(() => useSecuritySection());

        await act(async () => {
            await result.current.toggleBiometric(true);
        });

        expect(enrollBiometricSessionLock).toHaveBeenCalled();
        expect(loading).toHaveBeenCalled();
        expect(dismiss).toHaveBeenCalledWith('toast-loading');
        expect(patchSecurity).toHaveBeenCalledWith({
            biometricLock: true,
            autoLockMinutes: 5,
        });
    });

    it('يعرض رسالة عند إلغاء التحقق البيومتري', async () => {
        enrollBiometricSessionLock.mockResolvedValueOnce({ status: 'cancelled' });

        const { result } = renderHook(() => useSecuritySection());

        await act(async () => {
            await result.current.toggleBiometric(true);
        });

        expect(info).toHaveBeenCalled();
        expect(patchSecurity).not.toHaveBeenCalled();
    });

    it('يوقف التفعيل إذا كانت القناة غير متاحة', async () => {
        enrollBiometricSessionLock.mockResolvedValueOnce({ status: 'unavailable' });
        vi.mocked(isCapacitorNativePlatform).mockReturnValueOnce(true);

        const { result } = renderHook(() => useSecuritySection());

        await act(async () => {
            await result.current.toggleBiometric(true);
        });

        expect(warning).toHaveBeenCalled();
        expect(patchSecurity).not.toHaveBeenCalled();
    });

    it('يعرض رسالة صادقة إذا كان WebAuthn غير مدعوم', async () => {
        enrollBiometricSessionLock.mockResolvedValueOnce({ status: 'unavailable' });
        vi.mocked(isCapacitorNativePlatform).mockReturnValueOnce(false);

        const { result } = renderHook(() => useSecuritySection());

        await act(async () => {
            await result.current.toggleBiometric(true);
        });

        expect(info).toHaveBeenCalled();
        expect(patchSecurity).not.toHaveBeenCalled();
    });

    it('يفعّل WebAuthn دون تعديل autoLock إذا كان مضبوطاً مسبقاً', async () => {
        securityState = { ...securityState, autoLockMinutes: 15 };
        enrollBiometricSessionLock.mockResolvedValueOnce({ status: 'enrolled' });

        const { result } = renderHook(() => useSecuritySection());

        await act(async () => {
            await result.current.toggleBiometric(true);
        });

        expect(patchSecurity).toHaveBeenCalledWith({
            biometricLock: true,
        });
    });

    it('لا يعلن حماية لقطة الشاشة إذا رفض الجسر الأصلي التطبيق', async () => {
        syncNativeScreenshotGuard.mockResolvedValueOnce(false);
        const { result } = renderHook(() => useSecuritySection());

        let outcome: boolean | void;
        await act(async () => {
            outcome = await result.current.toggleScreenshotDeterrent(true);
        });

        expect(outcome!).toBe(false);
        expect(warning).toHaveBeenCalled();
        expect(patchSecurity).not.toHaveBeenCalled();
    });

    it('يثبّت إعداد لقطة الشاشة بعد نجاح تطبيقه', async () => {
        const { result } = renderHook(() => useSecuritySection());
        await act(async () => {
            await result.current.toggleScreenshotDeterrent(true);
        });
        expect(patchSecurity).toHaveBeenCalledWith({ screenshotDeterrent: true });
    });

    it('يفعّل ضبابية الخصوصية دون حوار', async () => {
        const { result } = renderHook(() => useSecuritySection());

        await act(async () => {
            await result.current.togglePrivacyBlur(true);
        });

        expect(confirm).not.toHaveBeenCalled();
        expect(patchSecurity).toHaveBeenCalledWith({ privacyBlur: true });
        expect(success).toHaveBeenCalled();
    });

    it('يوقف ضبابية الخصوصية بعد التأكيد', async () => {
        const { result } = renderHook(() => useSecuritySection());

        await act(async () => {
            await result.current.togglePrivacyBlur(false);
        });

        expect(confirm).toHaveBeenCalled();
        expect(patchSecurity).toHaveBeenCalledWith({ privacyBlur: false });
        expect(info).toHaveBeenCalled();
    });

    it('لا يوقف ضبابية الخصوصية إن أُلغي التأكيد', async () => {
        confirm.mockResolvedValueOnce(false);
        const { result } = renderHook(() => useSecuritySection());

        await act(async () => {
            await result.current.togglePrivacyBlur(false);
        });

        expect(patchSecurity).not.toHaveBeenCalled();
    });
});
