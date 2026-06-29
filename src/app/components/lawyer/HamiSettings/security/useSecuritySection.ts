import { useCallback } from 'react';
import { SmartToast } from '@/app/components/ui/SmartToast';
import { SmartDialog } from '@/app/components/ui/SmartDialog';
import { useLawyerSettingsSecurity } from '@/app/context/LawyerSettingsContext';
import {
    clearNativeBiometricOnDisable,
    clearNativeBiometricEnrollment,
    registerNativeBiometric,
} from '@/app/runtime/nativeBiometricBridge';
import { isCapacitorNativePlatform } from '@/app/runtime/nativePlatform';
import {
    clearStoredBiometricCredential,
    isWebAuthnLockSupported,
    registerBiometricCredential,
} from '@/app/services/security/webAuthnLock';
import type { AppSettingsState } from '@/app/services/settings';
import { useSettingsPatches } from '../hooks/useSettingsPatches';

export function useSecuritySection() {
    const security = useLawyerSettingsSecurity();
    const { patchSecurity, patchData } = useSettingsPatches();

    const toggleLocalOnly = useCallback(
        async (enabled: boolean) => {
            if (enabled) {
                const ok = await SmartDialog.confirm(
                    'لن يتصل التطبيق بالإنترنت أو السحابة. تبقى القضايا والملاحظات والتنفيذ على هذا الجهاز فقط. يمكنك إلغاء ذلك لاحقاً.',
                    { title: 'تفعيل قطع الاتصال؟' },
                );
                if (!ok) return;
                patchSecurity({ localOnlyMode: true });
                patchData({
                    cloudSync: false,
                    syncNotes: false,
                    syncFiles: false,
                    syncExecution: false,
                });
                SmartToast.success('قطع الاتصال — العمل محلياً بالكامل');
                return;
            }
            patchSecurity({ localOnlyMode: false });
            SmartToast.info('تم استعادة إمكانية الاتصال');
        },
        [patchData, patchSecurity],
    );

    const toggleBiometric = useCallback(
        async (checked: boolean) => {
            if (!checked) {
                clearStoredBiometricCredential();
                clearNativeBiometricEnrollment();
                void clearNativeBiometricOnDisable();
                patchSecurity({ biometricLock: false });
                SmartToast.success('تم إيقاف القفل البيومتري');
                return;
            }

            if (isCapacitorNativePlatform()) {
                const nativeRegistered = await registerNativeBiometric();
                if (nativeRegistered === true) {
                    const needsAutoLock = security.autoLockMinutes === 0;
                    patchSecurity({
                        biometricLock: true,
                        ...(needsAutoLock ? { autoLockMinutes: 5 as const } : {}),
                    });
                    SmartToast.success(
                        needsAutoLock
                            ? 'تم تفعيل البصمة الأصلية مع قفل تلقائي (5 دقائق)'
                            : 'تم تفعيل القفل البيومتري',
                    );
                    return;
                }
                if (nativeRegistered === false) {
                    SmartToast.warning('تعذر تفعيل البصمة على هذا الجهاز');
                    return;
                }
            }

            if (!isWebAuthnLockSupported()) {
                SmartToast.info('القفل البيومتري يتطلب جهازاً يدعم البصمة أو Face ID');
                return;
            }
            try {
                const registered = await registerBiometricCredential();
                if (registered) {
                    const needsAutoLock = security.autoLockMinutes === 0;
                    patchSecurity({
                        biometricLock: true,
                        ...(needsAutoLock ? { autoLockMinutes: 5 as const } : {}),
                    });
                    SmartToast.success(
                        needsAutoLock
                            ? 'تم تفعيل البصمة مع قفل تلقائي (5 دقائق)'
                            : 'تم تفعيل القفل البيومتري',
                    );
                } else {
                    SmartToast.warning('تعذر تسجيل البصمة');
                }
            } catch {
                SmartToast.warning('تعذر تفعيل البصمة على هذا الجهاز');
            }
        },
        [patchSecurity, security.autoLockMinutes],
    );

    const setAutoLockMinutes = useCallback(
        (value: string) => {
            patchSecurity({
                autoLockMinutes: Number(value) as AppSettingsState['security']['autoLockMinutes'],
            });
        },
        [patchSecurity],
    );

    return {
        security,
        patchSecurity,
        toggleLocalOnly,
        toggleBiometric,
        setAutoLockMinutes,
    };
}

export type SecuritySectionViewModel = ReturnType<typeof useSecuritySection>;
