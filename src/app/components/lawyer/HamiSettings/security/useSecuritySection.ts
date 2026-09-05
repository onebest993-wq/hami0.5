import { useCallback, useEffect, useState } from 'react';
import { SmartToast } from '@/app/components/ui/SmartToast';
import { useLawyerSettingsSecurity } from '@/app/context/LawyerSettingsContext';
import { scheduleIdleWork } from '@/app/runtime/mobileRuntimePolicy';
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
    runScreenshotDeterrentToggle,
} from './securitySectionToggles';

export function useSecuritySection() {
    const security = useLawyerSettingsSecurity();
    const { patchSecurity, patchLocalOnlyMode } = useSettingsPatches();
    const [biometricHint, setBiometricHint] = useState('');

    useEffect(() => {
        let cancelled = false;
        const reconcile = reconcileBiometricSessionLockEnabled(security.biometricLock);
        if (reconcile === 'reset') {
            patchSecurity({ biometricLock: false });
            SmartToast.info('أُعيد ضبط القفل البيومتري — سجّله من جديد على هذا الجهاز');
        }
        const cancelIdle = scheduleIdleWork(() => {
            void (async () => {
                const availability = await probeBiometricSession();
                if (cancelled) return;
                setBiometricHint(resolveBiometricSessionHint(availability, security.biometricLock));
            })();
        }, { minDelayMs: 0, timeoutMs: 800 });
        return () => {
            cancelled = true;
            cancelIdle();
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

    return {
        security,
        toggleLocalOnly,
        toggleBiometric,
        toggleScreenshotDeterrent,
        setAutoLockMinutes,
        biometricSubLabel: biometricHint,
    };
}
