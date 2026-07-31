import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';

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
import { dismissTransientOverlays } from '@/app/utils/bodyScrollLock';
import { registerDashboardOverlayCloser } from '@/app/hooks/lawyerDashboard/dashboardOverlayCoordinator';
import { isLitePerformanceActive } from '@/app/runtime/devicePerformanceTier';
import {
    clearSettingsForceVisible,
    concealSettingsWarmShell,
    hasSettingsOverlayHost,
    isSettingsReopenSuppressed,
    paintSettingsInstantChrome,
    registerSettingsInstantCloseHandler,
    removeSettingsInstantBridge,
    suppressSettingsReopen,
} from '@/app/runtime/settingsInstantPaint';
import {
    persistSettingsSessionOpen,
    readInitialSettingsSession,
} from '@/app/hooks/lawyerDashboard/lawyerDashboardNav';
import { ensureDeferredFeatureStylesLoaded } from '@/app/runtime/deferredFeatureStyles';
import { onDashboardInteractive } from '@/app/bootstrap/bootMetrics';
import {
    clearSettingsPerfMarks,
    markSettingsPerfPhase,
} from '@/app/services/settings/settingsPerfMetrics';
import { prefetchSettingsOverlayEntry } from '@/app/runtime/settingsOverlayEntryLoader';

function loadSettingsBootHydrator() {
    return import('@/app/runtime/settingsBootHydrator');
}

function persistSettingsSessionDeferred(open: boolean): void {
    if (typeof window === 'undefined') {
        persistSettingsSessionOpen(open);
        return;
    }
    queueMicrotask(() => persistSettingsSessionOpen(open));
}

/**
 * مسار فتح/إغلاق لحظي للتبديل السريع:
 * - Host دافئ: paint DOM فوراً ثم flushSync خفيف (open فقط)
 * - كبح إعادة الفتح إيمائي ≤90ms وليس 280ms
 * - لا hydrate/warm ثقيل على كل إغلاق
 */
export function useLawyerDashboardSettings(userId: string | null) {
    const [initialSession] = useState(() => readInitialSettingsSession());
    const [showSettings, setShowSettings] = useState(() => initialSession.open);
    const [settingsHostMounted, setSettingsHostMounted] = useState(() => initialSession.open);
    const [settingsSessionKey, setSettingsSessionKey] = useState(0);
    const showSettingsRef = useRef(initialSession.open);
    const openInFlightRef = useRef(false);
    showSettingsRef.current = showSettings;

    const armSettingsHost = useCallback(() => {
        setSettingsHostMounted(true);
        void ensureDeferredFeatureStylesLoaded();
        primeSettingsShellForOpen();
    }, []);

    /** ركّب Host مخفياً فور وجود هوية — قبل أول لمسة ترس */
    useLayoutEffect(() => {
        if (!isRealSignedIn(userId)) return;
        setSettingsHostMounted(true);
        prefetchSettingsOverlayEntry();
        warmSettingsOnHover();
        void ensureDeferredFeatureStylesLoaded();
        primeSettingsShellForOpen();
    }, [userId]);

    const closeSettings = useCallback(() => {
        openInFlightRef.current = false;
        suppressSettingsReopen();
        showSettingsRef.current = false;
        /*
         * flushSync أولاً — وإلا conceal يزيل --visible ثم React (open ما زال true)
         * يعيدها في الإطار التالي فيبدو الإغلاق متأخراً.
         */
        flushSync(() => {
            setShowSettings(false);
        });
        concealSettingsWarmShell();
        clearSettingsForceVisible();
        removeSettingsInstantBridge();
        persistSettingsSessionDeferred(false);
    }, []);

    useEffect(() => {
        registerSettingsInstantCloseHandler(closeSettings);
        return () => registerSettingsInstantCloseHandler(null);
    }, [closeSettings]);

    useEffect(() => {
        if (isRealSignedIn(userId)) return;
        openInFlightRef.current = false;
        showSettingsRef.current = false;
        setShowSettings(false);
        setSettingsHostMounted(false);
        concealSettingsWarmShell();
        clearSettingsForceVisible();
        removeSettingsInstantBridge();
        persistSettingsSessionOpen(false);
    }, [userId]);

    const primeSettingsShellMount = useCallback(() => {
        warmSettingsOnHover();
        prefetchSettingsOverlayEntry();
        flushSync(() => {
            setSettingsHostMounted(true);
        });
        void ensureDeferredFeatureStylesLoaded();
        primeSettingsShellForOpen();
        void loadSettingsBootHydrator().then((m) => m.dispatchSettingsPrimeHost());
    }, []);

    const resetSettingsShell = useCallback(() => {
        setSettingsSessionKey((k) => k + 1);
    }, []);

    useEffect(() => {
        return registerDashboardOverlayCloser('settings', closeSettings);
    }, [closeSettings]);

    useEffect(() => {
        let unbind: (() => void) | undefined;
        void loadSettingsBootHydrator().then((m) => {
            unbind = m.bindSettingsBootHydrator();
        });
        return () => unbind?.();
    }, []);

    useEffect(() => {
        persistSettingsSessionDeferred(showSettings);
    }, [showSettings]);

    /**
     * بعد interactive: prefetch + تركيب Host مخفي فوراً
     */
    useLayoutEffect(() => {
        if (isLitePerformanceActive()) return;
        return onDashboardInteractive(() => {
            prefetchSettingsOverlayEntry();
            warmSettingsOnHover();
            setSettingsHostMounted(true);
            void ensureDeferredFeatureStylesLoaded();
            primeSettingsShellForOpen();
            void loadSettingsBootHydrator()
                .then((m) => m.hydrateSettingsShellForInstantOpen(false))
                .catch(() => undefined);
        });
    }, []);

    useEffect(() => {
        if (!showSettings || !isRealSignedIn(userId)) return;
        armSettingsHost();
        warmSettingsOnOpen();
        void loadSettingsBootHydrator()
            .then((m) => {
                if (m.isSettingsShellFullyHydrated()) return undefined;
                return m.hydrateSettingsShellForInstantOpen(true);
            })
            .catch(() => undefined);
    }, [armSettingsHost, showSettings, userId]);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const onPrime = () => {
            armSettingsHost();
            warmSettingsOnHover();
            void loadSettingsBootHydrator()
                .then((m) => {
                    if (m.isSettingsShellFullyHydrated()) return undefined;
                    return m.hydrateSettingsShellForInstantOpen(true);
                })
                .catch(() => undefined);
        };
        window.addEventListener('hami:settings-prime-host', onPrime);
        return () => window.removeEventListener('hami:settings-prime-host', onPrime);
    }, [armSettingsHost]);

    const openSettings = useCallback(() => {
        openSettingsFromShell({
            signedIn: isRealSignedIn(userId),
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

                    showSettingsRef.current = true;
                    const hostReady = hasSettingsOverlayHost();

                    if (hostReady) {
                        /* دافئ: اكشف DOM فوراً ثم زامن React — أرخص من تركيب شجرة */
                        paintSettingsInstantChrome();
                        flushSync(() => {
                            setSettingsHostMounted(true);
                            setShowSettings(true);
                        });
                    } else {
                        flushSync(() => {
                            setSettingsHostMounted(true);
                            setShowSettings(true);
                        });
                        paintSettingsInstantChrome();
                    }
                    removeSettingsInstantBridge();
                    persistSettingsSessionDeferred(true);
                    markSettingsPerfPhase('first-paint');

                    queueMicrotask(() => {
                        if (!showSettingsRef.current) return;
                        clearSettingsForceVisible();
                        dismissTransientOverlays('settings');
                        void loadSettingsBootHydrator()
                            .then((m) => {
                                if (m.isSettingsShellFullyHydrated()) {
                                    markSettingsPerfPhase('chunk-ready');
                                    return undefined;
                                }
                                warmSettingsOnOpen();
                                void ensureDeferredFeatureStylesLoaded();
                                return m.hydrateSettingsShellForInstantOpen(true).then(() => {
                                    if (showSettingsRef.current) {
                                        markSettingsPerfPhase('chunk-ready');
                                    }
                                });
                            })
                            .catch(() => undefined);
                    });
                } finally {
                    /* ارفع in-flight فوراً — التبديل السريع لا ينتظر microtask */
                    openInFlightRef.current = false;
                }
            },
        });
    }, [userId]);

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
