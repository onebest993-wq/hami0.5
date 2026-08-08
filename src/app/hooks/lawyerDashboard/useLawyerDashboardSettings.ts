import { useCallback, useEffect, useRef, useState } from 'react';

import { SmartToast } from '@/app/components/ui/SmartToast';
import { isRealSignedIn } from '@/app/services/auth/shellAuth';
import {
    openSettingsFromShell,
    SETTINGS_SHELL_FEATURE,
} from '@/app/services/settings/settingsShellNavigation';
import { registerDashboardOverlayCloser } from '@/app/hooks/lawyerDashboard/dashboardOverlayCoordinator';
import { executeOverlaySnapClose } from '@/app/runtime/overlaySnapClose';
import {
    clearSettingsForceVisible,
    concealSettingsWarmShell,
    getSettingsShellRevealedAt,
    isSettingsForceVisible,
    isSettingsOverlayInteractionArmed,
    isSettingsReopenSuppressed,
    registerSettingsInstantCloseHandler,
    removeSettingsInstantBridge,
    SETTINGS_INTERACT_ARM_MS,
    suppressSettingsReopen,
} from '@/app/runtime/settingsInstantPaint';
import {
    persistSettingsSessionOpen,
    readInitialSettingsSession,
} from '@/app/hooks/lawyerDashboard/lawyerDashboardNav';
import { ensureDeferredFeatureStylesLoaded } from '@/app/runtime/deferredFeatureStyles';
import {
    clearSettingsPerfMarks,
    markSettingsPerfPhase,
} from '@/app/services/settings/settingsPerfMetrics';
import { commitSettingsShellOpen } from '@/app/hooks/lawyerDashboard/settings/settingsShellOpenFlow';
import {
    primeSettingsHostMount,
    useSettingsHostLifecycle,
} from '@/app/hooks/lawyerDashboard/settings/useSettingsHostLifecycle';

function loadSettingsBootHydrator() {
    return import('@/app/runtime/settingsBootHydrator');
}

let settingsOpenWarmInflight: Promise<void> | null = null;

/** للاختبارات — يمنع تسرب inflight بين الحالات */
export function resetSettingsOpenWarmForTests(): void {
    settingsOpenWarmInflight = null;
}

function runSettingsOpenWarm(markChunkReady: () => void): Promise<void> {
    if (settingsOpenWarmInflight) return settingsOpenWarmInflight;
    settingsOpenWarmInflight = loadSettingsBootHydrator()
        .then((m) => {
            if (m.isSettingsShellFullyHydrated()) {
                markChunkReady();
                return undefined;
            }
            void ensureDeferredFeatureStylesLoaded();
            return m.hydrateSettingsShellForInstantOpen(true).then(() => {
                markChunkReady();
            });
        })
        .catch(() => undefined)
        .finally(() => {
            settingsOpenWarmInflight = null;
        });
    return settingsOpenWarmInflight;
}

function persistSettingsSessionDeferred(open: boolean): void {
    if (typeof window === 'undefined') {
        persistSettingsSessionOpen(open);
        return;
    }
    queueMicrotask(() => persistSettingsSessionOpen(open));
}

/**
 * مسار فتح/إغلاق — نمط الإشعارات:
 * - فتح: paint فوري → rAF commit (أو flushSync عند أول تركيب)
 * - إغلاق: conceal فوري → setState بلا flushSync
 */
export function useLawyerDashboardSettings(userId: string | null) {
    const [initialSession] = useState(() => readInitialSettingsSession());
    const signedIn = isRealSignedIn(userId);
    const [showSettings, setShowSettings] = useState(() => initialSession.open);
    const [settingsHostMounted, setSettingsHostMounted] = useState(() => initialSession.open);
    const [settingsSessionKey, setSettingsSessionKey] = useState(0);
    const showSettingsRef = useRef(initialSession.open);
    const settingsHostMountedRef = useRef(initialSession.open);
    const openInFlightRef = useRef(false);
    showSettingsRef.current = showSettings;

    const ensureSettingsHostMounted = useCallback(() => {
        if (settingsHostMountedRef.current) return;
        settingsHostMountedRef.current = true;
        setSettingsHostMounted(true);
    }, []);

    useSettingsHostLifecycle({
        signedIn,
        initialSessionOpen: initialSession.open,
        ensureSettingsHostMounted,
    });

    const closeSettings = useCallback(() => {
        openInFlightRef.current = false;
        suppressSettingsReopen();
        showSettingsRef.current = false;
        executeOverlaySnapClose({
            conceal: () => {
                concealSettingsWarmShell();
                clearSettingsForceVisible();
                removeSettingsInstantBridge();
            },
            commit: () => {
                setShowSettings(false);
                persistSettingsSessionDeferred(false);
            },
        });
    }, []);

    useEffect(() => {
        registerSettingsInstantCloseHandler(closeSettings);
        return () => registerSettingsInstantCloseHandler(null);
    }, [closeSettings]);

    useEffect(() => {
        if (signedIn) return;
        openInFlightRef.current = false;
        showSettingsRef.current = false;
        settingsHostMountedRef.current = false;
        setShowSettings(false);
        setSettingsHostMounted(false);
        concealSettingsWarmShell();
        clearSettingsForceVisible();
        removeSettingsInstantBridge();
        persistSettingsSessionOpen(false);
    }, [signedIn]);

    const primeSettingsShellMount = useCallback(() => {
        primeSettingsHostMount(ensureSettingsHostMounted);
        void ensureDeferredFeatureStylesLoaded();
    }, [ensureSettingsHostMounted]);

    const resetSettingsShell = useCallback(() => {
        setSettingsSessionKey((k) => k + 1);
    }, []);

    useEffect(() => {
        return registerDashboardOverlayCloser('settings', closeSettings);
    }, [closeSettings]);

    useEffect(() => {
        persistSettingsSessionDeferred(showSettings);
    }, [showSettings]);

    const openSettings = useCallback(() => {
        openSettingsFromShell({
            signedIn,
            onSignedOut: () =>
                SmartToast.error(`يرجى تسجيل الدخول أولاً لاستخدام ${SETTINGS_SHELL_FEATURE}`),
            onOpen: () => {
                if (isSettingsReopenSuppressed()) return;
                if (showSettingsRef.current || openInFlightRef.current) return;
                openInFlightRef.current = true;
                try {
                    try {
                        if (typeof performance !== 'undefined') {
                            clearSettingsPerfMarks();
                            markSettingsPerfPhase('open-request');
                        }
                    } catch {
                        /* ignore */
                    }

                    commitSettingsShellOpen({
                        showSettingsRef,
                        ensureSettingsHostMounted,
                        setShowSettings,
                        onAfterCommit: () => {
                            void runSettingsOpenWarm(() => {
                                if (showSettingsRef.current) {
                                    markSettingsPerfPhase('chunk-ready');
                                }
                            });
                        },
                    });
                } finally {
                    openInFlightRef.current = false;
                }
            },
        });
    }, [closeSettings, ensureSettingsHostMounted, signedIn]);

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
};
