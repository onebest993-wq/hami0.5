import { useEffect, useRef } from 'react';

import { onLawyerDashboardFirstTabOpen } from '@/app/bootstrap/lawyerDashboardFirstTabMark';
import { onDashboardInteractive } from '@/app/bootstrap/bootMetrics';
import { isLitePerformanceActive } from '@/app/runtime/devicePerformanceTier';
import { isHamiNativeShell } from '@/app/runtime/hamiNativeShell';
import { prefetchHamiSettingsModule } from '@/app/runtime/hamiSettingsLoader';
import { scheduleIdleWork } from '@/app/runtime/mobileRuntimePolicy';
import { hasSettingsOverlayHost } from '@/app/runtime/settingsInstantPaint';
import {
    loadSettingsOverlayEntry,
    prefetchSettingsOverlayEntry,
} from '@/app/runtime/settingsOverlayEntryLoader';

function loadSettingsBootHydrator() {
    return import('@/app/runtime/settingsBootHydrator');
}

function loadSettingsIntentWarm() {
    return import('@/app/hooks/lawyerDashboard/settingsIntentWarm');
}

type UseSettingsHostLifecycleParams = {
    signedIn: boolean;
    initialSessionOpen: boolean;
    ensureSettingsHostMounted: () => void;
};

function nativeIdleOptions(): { minDelayMs: number; timeoutMs: number } | undefined {
    if (!isHamiNativeShell()) return undefined;
    return { minDelayMs: 0, timeoutMs: 800 };
}

/**
 * تسخين Host بعد طلاء المنزل — ليس في أول commit.
 * لمسة الترس تبقى فورية عبر primeSettingsHostMount + جسر الكروم.
 */
export function useSettingsHostLifecycle({
    signedIn,
    initialSessionOpen,
    ensureSettingsHostMounted,
}: UseSettingsHostLifecycleParams): void {
    const restoredWarmRef = useRef(false);

    useEffect(() => {
        let unbind: (() => void) | undefined;
        void loadSettingsBootHydrator().then((m) => {
            unbind = m.bindSettingsBootHydrator();
        });
        return () => unbind?.();
    }, []);

    useEffect(() => {
        if (!signedIn) return;
        let cancelIdle: (() => void) | undefined;
        const stopListen = onLawyerDashboardFirstTabOpen(() => {
            prefetchSettingsChunks();
            cancelIdle = scheduleIdleWork(() => {
                ensureSettingsHostMounted();
            }, nativeIdleOptions());
        });
        return () => {
            stopListen();
            cancelIdle?.();
        };
    }, [ensureSettingsHostMounted, signedIn]);

    useEffect(() => {
        if (!signedIn) return;
        let cancelIdle: (() => void) | undefined;
        const stopInteractive = onDashboardInteractive(() => {
            prefetchSettingsChunks();
            if (!isLitePerformanceActive()) {
                void loadSettingsIntentWarm()
                    .then((m) => m.warmSettingsOnHover())
                    .catch(() => undefined);
            }
            cancelIdle = scheduleIdleWork(() => {
                ensureSettingsHostMounted();
                void loadSettingsBootHydrator()
                    .then((m) => m.hydrateSettingsShellForInstantOpen(true))
                    .catch(() => undefined);
            }, nativeIdleOptions());
        });
        return () => {
            stopInteractive();
            cancelIdle?.();
        };
    }, [ensureSettingsHostMounted, signedIn]);

    useEffect(() => {
        if (!initialSessionOpen || restoredWarmRef.current || !signedIn) return;
        restoredWarmRef.current = true;
        ensureSettingsHostMounted();
        void loadSettingsIntentWarm()
            .then((m) => m.warmSettingsOnOpen())
            .catch(() => undefined);
        void loadSettingsBootHydrator()
            .then((m) => m.hydrateSettingsShellForInstantOpen(true))
            .catch(() => undefined);
    }, [ensureSettingsHostMounted, initialSessionOpen, signedIn]);
}

function prefetchSettingsChunks(): void {
    prefetchSettingsOverlayEntry();
    void loadSettingsOverlayEntry().catch(() => undefined);
    prefetchHamiSettingsModule();
    void import('@/app/components/lawyer/HamiSettings/settingsSectionLoad')
        .then((m) => {
            m.prefetchSecondarySettingsSections();
        })
        .catch(() => undefined);
}

function warmSettingsChunks(): void {
    prefetchSettingsChunks();
    void loadSettingsIntentWarm()
        .then((m) => {
            m.warmSettingsOnHover();
            m.primeSettingsShellForOpen();
        })
        .catch(() => undefined);
    void loadSettingsBootHydrator()
        .then((m) => m.hydrateSettingsShellForInstantOpen(true))
        .catch(() => undefined);
}

/**
 * pointerdown على الترس — setState بلا flushSync حتى لا تتجمد لمسة الفتح خلف الشجرة.
 * الكروم الفوري من paintSettingsInstantChrome قبل هذا الاستدعاء.
 */
export function primeSettingsHostMount(ensureSettingsHostMounted: () => void): void {
    if (hasSettingsOverlayHost()) {
        warmSettingsChunks();
        return;
    }
    ensureSettingsHostMounted();
    warmSettingsChunks();
}
