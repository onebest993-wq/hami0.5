import { useCallback, useEffect, useState } from 'react';
import { SmartToast } from '@/app/components/ui/SmartToast';
import { SmartDialog } from '@/app/components/ui/SmartDialog';
import { prefetchSettingsDialogs, ensureSettingsDialogsReady } from '../settingsDialogPrefetch';
import { useLawyerSettingsSecurity } from '@/app/context/LawyerSettingsContext';
import {
    clearBiometricSessionEnrollment,
    enrollBiometricSessionLock,
    hasBiometricSessionEnrollment,
    probeBiometricSession,
    reconcileBiometricSessionLockEnabled,
    resolveBiometricSessionHint,
} from '@/app/services/security/biometricSessionService';
import type { AppSettingsState } from '@/app/services/settings';
import { useSettingsPatches } from '../hooks/useSettingsPatches';

export function useSecuritySection() {
    const security = useLawyerSettingsSecurity();
    const { patchSecurity, patchData } = useSettingsPatches();
    const [biometricHint, setBiometricHint] = useState('');

    useEffect(() => {
        let cancelled = false;
        void (async () => {
            const reconcile = reconcileBiometricSessionLockEnabled(security.biometricLock);
            if (reconcile === 'reset') {
                patchSecurity({ biometricLock: false });
                if (!cancelled) {
                    SmartToast.info('أُعيد ضبط القفل البيومتري — سجّله من جديد على هذا الجهاز');
                }
            }

            const availability = await probeBiometricSession();
            if (cancelled) return;
            setBiometricHint(resolveBiometricSessionHint(availability, security.biometricLock));
        })();
        return () => {
            cancelled = true;
        };
    }, [security.biometricLock, patchSecurity]);

    const toggleLocalOnly = useCallback(
        async (enabled: boolean): Promise<boolean | void> => {
            if (enabled) {
                await ensureSettingsDialogsReady();
                const ok = await SmartDialog.confirm(
                    'لن يتصل التطبيق بالإنترنت أو السحابة. تبقى القضايا والملاحظات والتنفيذ على هذا الجهاز فقط. يمكنك إلغاء ذلك لاحقاً.',
                    { title: 'تفعيل قطع الاتصال؟' },
                );
                if (!ok) return false;
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
        async (checked: boolean): Promise<boolean | void> => {
            if (!checked) {
                clearBiometricSessionEnrollment();
                patchSecurity({ biometricLock: false });
                SmartToast.success('تم إيقاف القفل البيومتري');
                return;
            }

            const loadingToastId = SmartToast.loading('جاري التحقق البيومتري…');
            let outcome: Awaited<ReturnType<typeof enrollBiometricSessionLock>>;
            try {
                outcome = await enrollBiometricSessionLock();
            } finally {
                if (loadingToastId) SmartToast.dismiss(loadingToastId);
            }
            if (outcome.status === 'enrolled') {
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
                return;
            }

            if (outcome.status === 'cancelled') {
                SmartToast.info('لم يُفعَّل القفل البيومتري — ألغيت التحقق أو فشل');
                return false;
            }

            if (outcome.status === 'unavailable') {
                const availability = await probeBiometricSession();
                if (availability.channel === 'native') {
                    SmartToast.warning(
                        'البصمة غير جاهزة في هذا التثبيت — أعد البناء: npm run cap:build:android ثم cap:install:android',
                    );
                } else {
                    SmartToast.info('القفل البيومتري يتطلب جهازاً يدعم البصمة أو Face ID');
                }
                return false;
            }

            SmartToast.warning('تعذر تفعيل البصمة على هذا الجهاز');
            return false;
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
        hasBiometricEnrollment: hasBiometricSessionEnrollment(),
    };
}

export type SecuritySectionViewModel = ReturnType<typeof useSecuritySection>;
