import { useCallback, useEffect, type Dispatch, type SetStateAction } from 'react';
import type { AppSettingsState } from '@/app/services/settings/types';
import { applySettingsSecurityRuntime } from '@/app/services/settings/settingsSecurityRuntime';

export function useLawyerSettingsSecurityBindings(
    settings: AppSettingsState,
    setSettings: Dispatch<SetStateAction<AppSettingsState>>,
    settingsHydrated: boolean,
) {
    useEffect(() => {
        let unbind: (() => void) | undefined;
        let cancelled = false;
        void import('@/app/runtime/privacyBlurRuntime')
            .then((m) => {
                if (cancelled) return;
                unbind = m.bindPrivacyBlur(settings.security.privacyBlur);
            })
            .catch(() => undefined);
        return () => {
            cancelled = true;
            unbind?.();
        };
    }, [settings.security.privacyBlur]);

    useEffect(() => {
        let unbind: (() => void) | undefined;
        let cancelled = false;

        const run = () => {
            if (cancelled) return;
            if (!settings.security.screenshotDeterrent) {
                void import('@/app/runtime/screenshotDeterrentRuntime')
                    .then((m) => m.syncNativeScreenshotGuard(false))
                    .catch(() => undefined);
                return;
            }
            void import('@/app/runtime/screenshotDeterrentRuntime')
                .then((m) => {
                    if (cancelled) return;
                    unbind = m.bindWebScreenshotDeterrent();
                })
                .catch(() => undefined);
        };

        void import('@/app/runtime/nativeCapacitorBoot')
            .then((boot) => boot.whenNativeCapacitorBootComplete())
            .then(run)
            .catch(() => undefined);

        return () => {
            cancelled = true;
            unbind?.();
        };
    }, [settings.security.screenshotDeterrent]);

    const patchSecurityRuntime = useCallback((patch: Partial<AppSettingsState['security']>) => {
        setSettings((prev) => ({
            ...prev,
            security: { ...prev.security, ...patch },
        }));
    }, []);

    useEffect(() => {
        if (!settingsHydrated) return;
        void applySettingsSecurityRuntime(settings.security, {
            patchSecurity: patchSecurityRuntime,
        });
    }, [
        settingsHydrated,
        settings.security.localOnlyMode,
        settings.security.biometricLock,
        patchSecurityRuntime,
    ]);
}
