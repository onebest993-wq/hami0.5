import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

const confirm = vi.fn();
const success = vi.fn();
const info = vi.fn();
const warning = vi.fn();
const patchSecurity = vi.fn();
const patchData = vi.fn();
const clearStoredBiometricCredential = vi.fn();
const clearNativeBiometricEnrollment = vi.fn();
const clearNativeBiometricOnDisable = vi.fn();
const hasNativeBiometricEnrollment = vi.fn();
const hasStoredBiometricCredential = vi.fn();
const probeNativeBiometricAvailability = vi.fn();
const registerNativeBiometric = vi.fn();
const isCapacitorNativePlatform = vi.fn();
const isWebAuthnLockSupported = vi.fn();
const registerBiometricCredential = vi.fn();

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
    },
}));

vi.mock('@/app/context/LawyerSettingsContext', () => ({
    useLawyerSettingsSecurity: () => securityState,
}));

vi.mock('@/app/components/lawyer/HamiSettings/hooks/useSettingsPatches', () => ({
    useSettingsPatches: () => ({
        patchSecurity,
        patchData,
    }),
}));

vi.mock('@/app/runtime/nativeBiometricBridge', () => ({
    clearNativeBiometricOnDisable: (...args: unknown[]) => clearNativeBiometricOnDisable(...args),
    clearNativeBiometricEnrollment: (...args: unknown[]) => clearNativeBiometricEnrollment(...args),
    hasNativeBiometricEnrollment: () => hasNativeBiometricEnrollment(),
    probeNativeBiometricAvailability: (...args: unknown[]) => probeNativeBiometricAvailability(...args),
    registerNativeBiometric: (...args: unknown[]) => registerNativeBiometric(...args),
}));

vi.mock('@/app/runtime/nativePlatform', () => ({
    isCapacitorNativePlatform: () => isCapacitorNativePlatform(),
}));

vi.mock('@/app/services/security/webAuthnLock', () => ({
    clearStoredBiometricCredential: (...args: unknown[]) => clearStoredBiometricCredential(...args),
    hasStoredBiometricCredential: () => hasStoredBiometricCredential(),
    isWebAuthnLockSupported: () => isWebAuthnLockSupported(),
    registerBiometricCredential: (...args: unknown[]) => registerBiometricCredential(...args),
}));

import { useSecuritySection } from '@/app/components/lawyer/HamiSettings/security/useSecuritySection';

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
        isCapacitorNativePlatform.mockReturnValue(false);
        isWebAuthnLockSupported.mockReturnValue(false);
        hasNativeBiometricEnrollment.mockReturnValue(false);
        hasStoredBiometricCredential.mockReturnValue(false);
        probeNativeBiometricAvailability.mockResolvedValue({
            nativeShell: true,
            pluginLoaded: true,
            hardwareAvailable: true,
        });
        registerNativeBiometric.mockResolvedValue(null);
        registerBiometricCredential.mockResolvedValue(false);
        clearNativeBiometricOnDisable.mockResolvedValue(undefined);
    });

    it('يفعّل localOnly مع تعطيل مسارات المزامنة بعد التأكيد', async () => {
        const { result } = renderHook(() => useSecuritySection());

        await act(async () => {
            await result.current.toggleLocalOnly(true);
        });

        expect(patchSecurity).toHaveBeenCalledWith({ localOnlyMode: true });
        expect(patchData).toHaveBeenCalledWith({
            cloudSync: false,
            syncNotes: false,
            syncFiles: false,
            syncExecution: false,
        });
    });

    it('لا يغيّر localOnly عند إلغاء التأكيد', async () => {
        confirm.mockResolvedValueOnce(false);
        const { result } = renderHook(() => useSecuritySection());

        await act(async () => {
            await result.current.toggleLocalOnly(true);
        });

        expect(patchSecurity).not.toHaveBeenCalled();
        expect(patchData).not.toHaveBeenCalled();
    });

    it('يعطّل البصمة ويمسح التسجيلات المحلية والأصلية', async () => {
        const { result } = renderHook(() => useSecuritySection());

        await act(async () => {
            await result.current.toggleBiometric(false);
        });

        expect(clearStoredBiometricCredential).toHaveBeenCalledTimes(1);
        expect(clearNativeBiometricEnrollment).toHaveBeenCalledTimes(1);
        expect(clearNativeBiometricOnDisable).toHaveBeenCalledTimes(1);
        expect(patchSecurity).toHaveBeenCalledWith({ biometricLock: false });
    });

    it('يعيد ضبط القفل عند وجود علم مفعّل بلا تسجيل فعلي', async () => {
        securityState = { ...securityState, biometricLock: true };
        hasNativeBiometricEnrollment.mockReturnValue(false);
        hasStoredBiometricCredential.mockReturnValue(false);
        isWebAuthnLockSupported.mockReturnValue(true);

        renderHook(() => useSecuritySection());

        await waitFor(() => {
            expect(patchSecurity).toHaveBeenCalledWith({ biometricLock: false });
        });
        expect(clearStoredBiometricCredential).toHaveBeenCalled();
        expect(clearNativeBiometricEnrollment).toHaveBeenCalled();
        expect(info).toHaveBeenCalled();
    });

    it('يفعّل البصمة الأصلية ويضبط القفل التلقائي عند الحاجة', async () => {
        isCapacitorNativePlatform.mockReturnValue(true);
        registerNativeBiometric.mockResolvedValueOnce(true);
        securityState = { ...securityState, autoLockMinutes: 0 };

        const { result } = renderHook(() => useSecuritySection());

        await act(async () => {
            await result.current.toggleBiometric(true);
        });

        expect(probeNativeBiometricAvailability).toHaveBeenCalled();
        expect(patchSecurity).toHaveBeenCalledWith({
            biometricLock: true,
            autoLockMinutes: 5,
        });
    });

    it('يعرض تحذيراً عند فشل التسجيل الأصلي للبصمة', async () => {
        isCapacitorNativePlatform.mockReturnValue(true);
        registerNativeBiometric.mockResolvedValueOnce(false);

        const { result } = renderHook(() => useSecuritySection());

        await act(async () => {
            await result.current.toggleBiometric(true);
        });

        expect(warning).toHaveBeenCalled();
        expect(patchSecurity).not.toHaveBeenCalled();
    });

    it('يوقف التفعيل إذا لم تُحمَّل إضافة البصمة الأصلية', async () => {
        isCapacitorNativePlatform.mockReturnValue(true);
        probeNativeBiometricAvailability.mockResolvedValue({
            nativeShell: true,
            pluginLoaded: false,
            hardwareAvailable: false,
        });

        const { result } = renderHook(() => useSecuritySection());

        await act(async () => {
            await result.current.toggleBiometric(true);
        });

        expect(warning).toHaveBeenCalled();
        expect(registerNativeBiometric).not.toHaveBeenCalled();
        expect(patchSecurity).not.toHaveBeenCalled();
    });

    it('يعرض رسالة صادقة إذا كان WebAuthn غير مدعوم', async () => {
        isCapacitorNativePlatform.mockReturnValue(false);
        isWebAuthnLockSupported.mockReturnValue(false);

        const { result } = renderHook(() => useSecuritySection());

        await act(async () => {
            await result.current.toggleBiometric(true);
        });

        expect(info).toHaveBeenCalled();
        expect(patchSecurity).not.toHaveBeenCalled();
    });

    it('يفعّل WebAuthn دون تعديل autoLock إذا كان مضبوطاً مسبقاً', async () => {
        securityState = { ...securityState, autoLockMinutes: 15 };
        isCapacitorNativePlatform.mockReturnValue(false);
        isWebAuthnLockSupported.mockReturnValue(true);
        registerBiometricCredential.mockResolvedValueOnce(true);

        const { result } = renderHook(() => useSecuritySection());

        await act(async () => {
            await result.current.toggleBiometric(true);
        });

        expect(patchSecurity).toHaveBeenCalledWith({
            biometricLock: true,
        });
    });

    it('يعرض تلميح جاهزية على المتصفح', async () => {
        isWebAuthnLockSupported.mockReturnValue(true);
        const { result } = renderHook(() => useSecuritySection());

        await waitFor(() => {
            expect(result.current.biometricSubLabel).toMatch(/متاح على المتصفح|مفعّل عبر WebAuthn/);
        });
    });
});
