import { useCallback, useEffect, useState } from 'react';
import { SmartToast } from '@/app/components/ui/SmartToast';
import { useLawyerSettingsSecurity } from '@/app/context/LawyerSettingsContext';
import {
    probeBiometricSession,
    reconcileBiometricSessionLockEnabled,
    resolveBiometricSessionHint,
} from '@/app/services/security/biometricSessionService';
import type { AppSettingsState } from '@/app/services/settings';
import { useSettingsPatches } from '../hooks/useSettingsPatches';
import {
    runBiometricLockToggle,
    runLocalOnlyToggle,
    runPrivacyBlurToggle,
    runScreenshotDeterrentToggle,
} from './securitySectionToggles';

export function useSecuritySection() {
    const security = useLawyerSettingsSecurity();
    const { patchSecurity, patchLocalOnlyMode } = useSettingsPatches();
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
        (enabled: boolean) => runLocalOnlyToggle(enabled, patchLocalOnlyMode, security),
        [patchLocalOnlyMode, security],
    );

    const toggleBiometric = useCallback(
        (checked: boolean) =>
            runBiometricLockToggle(checked, patchSecurity, security.autoLockMinutes),
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

    const toggleScreenshotDeterrent = useCallback(
        (enabled: boolean) => runScreenshotDeterrentToggle(enabled, patchSecurity),
        [patchSecurity],
    );

    const togglePrivacyBlur = useCallback(
        (enabled: boolean) =>
            runPrivacyBlurToggle(enabled, patchSecurity, security.screenshotDeterrent),
        [patchSecurity, security.screenshotDeterrent],
    );

    return {
        security,
        toggleLocalOnly,
        toggleBiometric,
        toggleScreenshotDeterrent,
        togglePrivacyBlur,
        setAutoLockMinutes,
        biometricSubLabel: biometricHint,
    };
}

export type SecuritySectionViewModel = ReturnType<typeof useSecuritySection>;
