import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { SmartToast } from '@/app/components/ui/SmartToast';
import { hasLocalAppSession } from '@/app/services/auth/shellAuth';
import {
    openSettingsFromShell,
    SETTINGS_SHELL_FEATURE,
} from '@/app/services/settings/settingsShellNavigation';
import { registerDashboardOverlayCloser } from '@/app/hooks/lawyerDashboard/dashboardOverlayCoordinator';
import { executeSettingsOverlayClose } from '@/app/runtime/overlaySnapClose';
import {
    clearSettingsForceVisible,
    concealSettingsWarmShell,
    hasSettingsOverlayHost,
    isSettingsReopenSuppressed,
    removeSettingsInstantBridge,
    suppressSettingsReopen,
} from '@/app/runtime/settingsInstantPaint';
import {
    persistSettingsSessionOpen,
    readInitialSettingsSession,
    LAWYER_SETTINGS_OPEN_KEY,
} from '@/app/hooks/lawyerDashboard/lawyerDashboardNav';
import { ensureDeferredFeatureStylesLoaded } from '@/app/runtime/deferredFeatureStyles';
import {
    clearSettingsPerfMarks,
    markSettingsPerfPhase,
} from '@/app/services/settings/settingsPerfMetrics';
import { beginSettingsShellExit } from '@/app/hooks/lawyerDashboard/settings/settingsShellExit';
import { commitSettingsShellOpen } from '@/app/hooks/lawyerDashboard/settings/settingsShellOpenFlow';
import {
    primeSettingsHostMount,
    useSettingsHostLifecycle,
} from '@/app/hooks/lawyerDashboard/settings/useSettingsHostLifecycle';
import {
    snapSettingsShellClose,
} from '@/app/services/settings/settingsShellSnap';
import { SETTINGS_PRIME_HOST_EVENT } from '@/app/runtime/settingsShellEvents';

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
 * - فتح: snap + paint فوري → setState بلا flushSync
 * - إغلاق: conceal فوري → setState بلا flushSync
 */
export function useLawyerDashboardSettings(userId: string | null) {
    const [initialSession] = useState(() => readInitialSettingsSession());
    const signedIn = hasLocalAppSession(userId);
    const [showSettings, setShowSettings] = useState(() => initialSession.open);
    const [settingsHostMounted, setSettingsHostMounted] = useState(() => initialSession.open);
    const [settingsSessionKey, setSettingsSessionKey] = useState(0);
    const showSettingsRef = useRef(initialSession.open);
    const settingsHostMountedRef = useRef(initialSession.open);
    const settingsShellResetOnceRef = useRef(false);
    const openInFlightRef = useRef(false);
    showSettingsRef.current = showSettings;

    const ensureSettingsHostMounted = useCallback(() => {
        if (settingsHostMountedRef.current) return;
        settingsHostMountedRef.current = true;
        setSettingsHostMounted(true);
    }, []);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        try {
            sessionStorage.removeItem(LAWYER_SETTINGS_OPEN_KEY);
        } catch {
            /* ignore */
        }
    }, []);

    useSettingsHostLifecycle({
        signedIn,
        initialSessionOpen: initialSession.open,
        ensureSettingsHostMounted,
    });

    /** كان الحدث يُطلَق من pointerdown بلا مستمع — الآن يركّب Host مثل الملف الشخصي */
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const onPrime = () => {
            primeSettingsHostMount(ensureSettingsHostMounted);
        };
        window.addEventListener(SETTINGS_PRIME_HOST_EVENT, onPrime);
        return () => window.removeEventListener(SETTINGS_PRIME_HOST_EVENT, onPrime);
    }, [ensureSettingsHostMounted]);

    const closeSettings = useCallback(() => {
        openInFlightRef.current = false;
        suppressSettingsReopen();
        beginSettingsShellExit(() => {
            showSettingsRef.current = false;
            executeSettingsOverlayClose({
                conceal: () => {
                    snapSettingsShellClose();
                    concealSettingsWarmShell({ suppressReopen: true });
                    clearSettingsForceVisible();
                    removeSettingsInstantBridge();
                },
                commit: () => {
                    setShowSettings(false);
                    persistSettingsSessionDeferred(false);
                },
            });
        });
    }, []);

    useEffect(() => {
        if (signedIn) return;
        openInFlightRef.current = false;
        showSettingsRef.current = false;
        settingsHostMountedRef.current = false;
        setShowSettings(false);
        setSettingsHostMounted(false);
        snapSettingsShellClose();
        concealSettingsWarmShell();
        clearSettingsForceVisible();
        removeSettingsInstantBridge();
        persistSettingsSessionOpen(false);
    }, [signedIn]);

    const primeSettingsShellMount = useCallback(() => {
        /* لا flushSync — تجنّب تجميد إيماءة الفتح خلف تركيب Host */
        if (hasSettingsOverlayHost()) {
            void ensureDeferredFeatureStylesLoaded();
            void loadSettingsBootHydrator()
                .then((m) => m.hydrateSettingsShellForInstantOpen(true))
                .catch(() => undefined);
            return;
        }
        primeSettingsHostMount(ensureSettingsHostMounted);
        void ensureDeferredFeatureStylesLoaded();
    }, [ensureSettingsHostMounted]);

    const resetSettingsShell = useCallback(() => {
        if (settingsShellResetOnceRef.current) return;
        settingsShellResetOnceRef.current = true;
        setSettingsSessionKey((k) => k + 1);
    }, []);

    useEffect(() => {
        return registerDashboardOverlayCloser('settings', closeSettings);
    }, [closeSettings]);

    useEffect(() => {
        persistSettingsSessionDeferred(showSettings);
        if (!showSettings) {
            settingsShellResetOnceRef.current = false;
        }
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

    return useMemo(
        () => ({
            showSettings,
            setShowSettings,
            closeSettings,
            settingsSessionKey,
            settingsHostMounted,
            primeSettingsShellMount,
            resetSettingsShell,
            openSettings,
        }),
        [
            closeSettings,
            openSettings,
            primeSettingsShellMount,
            resetSettingsShell,
            settingsHostMounted,
            settingsSessionKey,
            showSettings,
        ],
    );
};
