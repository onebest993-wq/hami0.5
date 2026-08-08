import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

const confirm = vi.fn();
const success = vi.fn();
const info = vi.fn();
const warning = vi.fn();
const loading = vi.fn();
const dismiss = vi.fn();
const patchSecurity = vi.fn();
const patchData = vi.fn();
const clearBiometricSessionEnrollment = vi.fn();
const enrollBiometricSessionLock = vi.fn();
const hasBiometricSessionEnrollment = vi.fn();
const probeBiometricSession = vi.fn();
const reconcileBiometricSessionLockEnabled = vi.fn();
const resolveBiometricSessionHint = vi.fn();

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
        patchData,
    }),
}));

vi.mock('@/app/services/security/biometricSessionService', () => ({
    clearBiometricSessionEnrollment: (...args: unknown[]) => clearBiometricSessionEnrollment(...args),
    enrollBiometricSessionLock: (...args: unknown[]) => enrollBiometricSessionLock(...args),
    hasBiometricSessionEnrollment: () => hasBiometricSessionEnrollment(),
    probeBiometricSession: (...args: unknown[]) => probeBiometricSession(...args),
    reconcileBiometricSessionLockEnabled: (...args: unknown[]) => reconcileBiometricSessionLockEnabled(...args),
    resolveBiometricSessionHint: (...args: unknown[]) => resolveBiometricSessionHint(...args),
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

    it('يعطّل البصمة عبر BiometricSessionService', async () => {
        const { result } = renderHook(() => useSecuritySection());

        await act(async () => {
            await result.current.toggleBiometric(false);
        });

        expect(clearBiometricSessionEnrollment).toHaveBeenCalledTimes(1);
        expect(patchSecurity).toHaveBeenCalledWith({ biometricLock: false });
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
        probeBiometricSession.mockResolvedValue({
            channel: 'native',
            pluginLoaded: false,
            hardwareAvailable: false,
            enrolled: false,
        });

        const { result } = renderHook(() => useSecuritySection());

        await act(async () => {
            await result.current.toggleBiometric(true);
        });

        expect(warning).toHaveBeenCalled();
        expect(patchSecurity).not.toHaveBeenCalled();
    });

    it('يعرض رسالة صادقة إذا كان WebAuthn غير مدعوم', async () => {
        enrollBiometricSessionLock.mockResolvedValueOnce({ status: 'unavailable' });
        probeBiometricSession.mockResolvedValueOnce({
            channel: 'none',
            pluginLoaded: false,
            hardwareAvailable: false,
            enrolled: false,
        });

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
});
