import { useCallback, useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';

import { SmartToast } from '@/app/components/ui/SmartToast';
import { isRealSignedIn } from '@/app/services/auth/shellAuth';
import {
    openSettingsFromShell,
    SETTINGS_SHELL_FEATURE,
} from '@/app/services/settings/settingsShellNavigation';
import { warmSettingsOnHover, warmSettingsOnOpen } from '@/app/hooks/lawyerDashboard/settingsIntentWarm';
import { loadHamiSettingsModule } from '@/app/runtime/hamiSettingsLoader';
import {
    clearSettingsPerfMarks,
    markSettingsPerfPhase,
} from '@/app/services/settings/settingsPerfMetrics';
import {
    dismissTransientOverlays,
    HAMI_DISMISS_OVERLAYS_EVENT,
    releaseBodyScrollLock,
    type TransientOverlayId,
} from '@/app/utils/bodyScrollLock';

export function useLawyerDashboardSettings(userId: string | null) {
    const [showSettings, setShowSettings] = useState(false);
    const [settingsSessionKey, setSettingsSessionKey] = useState(0);
    const showSettingsRef = useRef(false);
    const openInFlightRef = useRef(false);
    showSettingsRef.current = showSettings;

    const closeSettings = useCallback(() => {
        showSettingsRef.current = false;
        setShowSettings(false);
    }, []);

    const primeSettingsShellMount = useCallback(() => {
        warmSettingsOnHover();
    }, []);

    const resetSettingsShell = useCallback(() => {
        setSettingsSessionKey((k) => k + 1);
    }, []);

    useEffect(() => {
        const onDismiss = (e: Event) => {
            const except = (e as CustomEvent<{ except?: TransientOverlayId }>).detail?.except;
            if (except !== 'settings') {
                setShowSettings(false);
            }
            if (except == null) {
                releaseBodyScrollLock();
            }
        };
        window.addEventListener(HAMI_DISMISS_OVERLAYS_EVENT, onDismiss);
        return () => window.removeEventListener(HAMI_DISMISS_OVERLAYS_EVENT, onDismiss);
    }, []);

    const openSettings = useCallback(() => {
        openSettingsFromShell({
            signedIn: isRealSignedIn(userId),
            onSignedOut: () =>
                SmartToast.error(`يرجى تسجيل الدخول أولاً لاستخدام ${SETTINGS_SHELL_FEATURE}`),
            onOpen: () => {
                if (showSettingsRef.current || openInFlightRef.current) return;
                openInFlightRef.current = true;
                void (async () => {
                    try {
                        clearSettingsPerfMarks();
                        markSettingsPerfPhase('open-request');
                        warmSettingsOnOpen();
                        await loadHamiSettingsModule().catch(() => undefined);
                        markSettingsPerfPhase('chunk-ready');
                        flushSync(() => {
                            setShowSettings(true);
                        });
                        showSettingsRef.current = true;
                        queueMicrotask(() => dismissTransientOverlays('settings'));
                    } finally {
                        openInFlightRef.current = false;
                    }
                })();
            },
        });
    }, [userId]);

    return {
        showSettings,
        setShowSettings,
        closeSettings,
        settingsSessionKey,
        primeSettingsShellMount,
        resetSettingsShell,
        openSettings,
    };
}
