import { useCallback, useEffect, useRef, useState } from 'react';

import { SmartToast } from '@/app/components/ui/SmartToast';
import { isRealSignedIn } from '@/app/services/auth/shellAuth';
import {
    openSettingsFromShell,
    SETTINGS_SHELL_FEATURE,
} from '@/app/services/settings/settingsShellNavigation';
import {
    primeSettingsShellForOpen,
    warmSettingsOnHover,
    warmSettingsOnOpen,
} from '@/app/hooks/lawyerDashboard/settingsIntentWarm';
import {
    clearSettingsPerfMarks,
    markSettingsPerfPhase,
} from '@/app/services/settings/settingsPerfMetrics';
import {
    dismissTransientOverlays,
} from '@/app/utils/bodyScrollLock';
import { registerDashboardOverlayCloser } from '@/app/hooks/lawyerDashboard/dashboardOverlayCoordinator';
import {
    SETTINGS_SHELL_HYDRATED_EVENT,
    hydrateSettingsShellForInstantOpen,
    isSettingsShellFullyHydrated,
} from '@/app/runtime/settingsBootHydrator';
import { useKeepAliveIdleRelease } from '@/app/hooks/lawyerDashboard/useKeepAliveIdleRelease';

export function useLawyerDashboardSettings(userId: string | null) {
    const [showSettings, setShowSettings] = useState(false);
    const [settingsHostMounted, setSettingsHostMounted] = useState(false);
    const [settingsSessionKey, setSettingsSessionKey] = useState(0);
    const showSettingsRef = useRef(false);
    const openInFlightRef = useRef(false);
    showSettingsRef.current = showSettings;

    const armSettingsHost = useCallback(() => {
        setSettingsHostMounted(true);
        primeSettingsShellForOpen();
    }, []);

    const closeSettings = useCallback(() => {
        showSettingsRef.current = false;
        setShowSettings(false);
    }, []);

    const primeSettingsShellMount = useCallback(() => {
        warmSettingsOnHover();
        armSettingsHost();
    }, [armSettingsHost]);

    const resetSettingsShell = useCallback(() => {
        setSettingsSessionKey((k) => k + 1);
    }, []);

    useEffect(() => {
        if (isSettingsShellFullyHydrated()) {
            setSettingsHostMounted(true);
            return;
        }

        const armHost = () => setSettingsHostMounted(true);
        window.addEventListener(SETTINGS_SHELL_HYDRATED_EVENT, armHost);
        void hydrateSettingsShellForInstantOpen().then((ready) => {
            if (ready) armHost();
        });

        return () => window.removeEventListener(SETTINGS_SHELL_HYDRATED_EVENT, armHost);
    }, []);

    useEffect(() => {
        return registerDashboardOverlayCloser('settings', () => {
            setShowSettings(false);
        });
    }, []);

    useKeepAliveIdleRelease(showSettings, () => setSettingsHostMounted(false));

    const openSettings = useCallback(() => {
        openSettingsFromShell({
            signedIn: isRealSignedIn(userId),
            onSignedOut: () =>
                SmartToast.error(`يرجى تسجيل الدخول أولاً لاستخدام ${SETTINGS_SHELL_FEATURE}`),
            onOpen: () => {
                if (showSettingsRef.current || openInFlightRef.current) return;
                openInFlightRef.current = true;
                try {
                    clearSettingsPerfMarks();
                    markSettingsPerfPhase('open-request');
                    armSettingsHost();
                    warmSettingsOnOpen();

                    setShowSettings(true);
                    showSettingsRef.current = true;
                    queueMicrotask(() => dismissTransientOverlays('settings'));

                    void hydrateSettingsShellForInstantOpen(true)
                        .catch(() => undefined)
                        .then(() => markSettingsPerfPhase('chunk-ready'));
                } finally {
                    openInFlightRef.current = false;
                }
            },
        });
    }, [armSettingsHost, userId]);

    return {
        showSettings,
        setShowSettings,
        closeSettings,
        settingsSessionKey,
        settingsHostMounted,
        primeSettingsShellMount,
        resetSettingsShell,
        openSettings,
    };
}
