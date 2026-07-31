import { useCallback, useEffect, useState } from 'react';
import { SmartToast } from '@/app/components/ui/SmartToast';
import { SmartDialog } from '@/app/components/ui/SmartDialog';
import { prefetchSettingsDialogs } from '../settingsDialogPrefetch';
import { useLawyerSettingsSecurity } from '@/app/context/LawyerSettingsContext';
import {
    clearNativeBiometricOnDisable,
    clearNativeBiometricEnrollment,
    hasNativeBiometricEnrollment,
    probeNativeBiometricAvailability,
    registerNativeBiometric,
} from '@/app/runtime/nativeBiometricBridge';
import { isCapacitorNativePlatform } from '@/app/runtime/nativePlatform';
import {
    clearStoredBiometricCredential,
    hasStoredBiometricCredential,
    isWebAuthnLockSupported,
    registerBiometricCredential,
} from '@/app/services/security/webAuthnLock';
import type { AppSettingsState } from '@/app/services/settings';
import { useSettingsPatches } from '../hooks/useSettingsPatches';

function hasActiveBiometricEnrollment(): boolean {
    return hasNativeBiometricEnrollment() || (isWebAuthnLockSupported() && hasStoredBiometricCredential());
}

export function useSecuritySection() {
    const security = useLawyerSettingsSecurity();
    const { patchSecurity, patchData } = useSettingsPatches();
    const [biometricHint, setBiometricHint] = useState('يفحص جاهزية الجهاز…');

    useEffect(() => {
        let cancelled = false;
        void (async () => {
            if (security.biometricLock && !hasActiveBiometricEnrollment()) {
                clearStoredBiometricCredential();
                clearNativeBiometricEnrollment();
                patchSecurity({ biometricLock: false });
                if (!cancelled) {
                    SmartToast.info('أُعيد ضبط القفل البيومتري — سجّله من جديد على هذا الجهاز');
                }
            }

            if (isCapacitorNativePlatform()) {
                const probe = await probeNativeBiometricAvailability();
                if (cancelled) return;
                if (!probe.pluginLoaded) {
                    setBiometricHint('جاهز للتطبيق — ثبّت غلاف Capacitor مع إضافة البصمة');
                    return;
                }
                if (!probe.hardwareAvailable) {
                    setBiometricHint('لا بصمة/Face ID على هذا الجهاز حالياً');
                    return;
                }
                setBiometricHint(
                    security.biometricLock
                        ? 'مفعّل — يُقفل عند العودة من الخلفية وبعد الخمول'
                        : 'جاهز — بصمة/Face ID أصلية على الجهاز',
                );
                return;
            }

            if (!isWebAuthnLockSupported()) {
                if (!cancelled) {
                    setBiometricHint('يتطلب HTTPS وجهازاً يدعم البصمة — أو تطبيق Android/iOS');
                }
                return;
            }
            if (!cancelled) {
                setBiometricHint(
                    security.biometricLock
                        ? 'مفعّل عبر WebAuthn على المتصفح'
                        : 'متاح على المتصفح — أفضل على تطبيق الهاتف',
                );
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [security.biometricLock, patchSecurity]);

    const toggleLocalOnly = useCallback(
        async (enabled: boolean) => {
            if (enabled) {
                prefetchSettingsDialogs();
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
                const probe = await probeNativeBiometricAvailability();
                if (!probe.pluginLoaded) {
                    SmartToast.warning('إضافة البصمة غير محمّلة — أعد بناء غلاف التطبيق');
                    return;
                }
                if (!probe.hardwareAvailable) {
                    SmartToast.warning('لا توجد بصمة أو Face ID مسجّلة على الجهاز');
                    return;
                }
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
                            : 'تم تفعيل القفل البيومتري الأصلي',
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
            const n = Number(value);
            const allowed: AppSettingsState['security']['autoLockMinutes'][] = [0, 1, 5, 15, 30, 60];
            if (!allowed.includes(n as AppSettingsState['security']['autoLockMinutes'])) return;
            patchSecurity({
                autoLockMinutes: n as AppSettingsState['security']['autoLockMinutes'],
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
        biometricSubLabel: biometricHint,
    };
}

export type SecuritySectionViewModel = ReturnType<typeof useSecuritySection>;
