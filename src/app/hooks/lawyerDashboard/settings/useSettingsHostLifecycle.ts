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

let sessionIdCounter = 0;
const moduleSessionIdRef = { current: 0 };
const moduleActiveSessionIdRef = { current: 0 };

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

function bumpModuleSession(): number {
    sessionIdCounter += 1;
    const id = sessionIdCounter;
    moduleSessionIdRef.current = id;
    moduleActiveSessionIdRef.current = id;
    return id;
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
    const sessionIdRef = useRef(0);
    const activeSessionIdRef = useRef(0);

    useEffect(() => {
        bumpModuleSession();
        sessionIdCounter += 1;
        const thisSessionId = sessionIdCounter;
        sessionIdRef.current = thisSessionId;
        activeSessionIdRef.current = thisSessionId;

        let unbind: (() => void) | undefined;
        void loadSettingsBootHydrator().then((m) => {
            if (sessionIdRef.current !== activeSessionIdRef.current) return;
            if (moduleSessionIdRef.current !== moduleActiveSessionIdRef.current) return;
            unbind = m.bindSettingsBootHydrator();
        });
        return () => {
            activeSessionIdRef.current = 0;
            moduleActiveSessionIdRef.current = 0;
            unbind?.();
        };
    }, []);

    useEffect(() => {
        if (!signedIn) return;
        sessionIdCounter += 1;
        const thisSessionId = sessionIdCounter;
        sessionIdRef.current = thisSessionId;
        activeSessionIdRef.current = thisSessionId;
        moduleSessionIdRef.current = thisSessionId;
        moduleActiveSessionIdRef.current = thisSessionId;

        let cancelled = false;
        let cancelIdle: (() => void) | undefined;
        const stopListen = onLawyerDashboardFirstTabOpen(() => {
            if (cancelled) return;
            if (sessionIdRef.current !== activeSessionIdRef.current) return;
            prefetchSettingsShellChunks();
            cancelIdle = scheduleIdleWork(() => {
                if (cancelled) return;
                if (sessionIdRef.current !== activeSessionIdRef.current) return;
                ensureSettingsHostMounted();
            }, nativeIdleOptions());
        });
        return () => {
            cancelled = true;
            activeSessionIdRef.current = 0;
            moduleActiveSessionIdRef.current = 0;
            stopListen();
            cancelIdle?.();
        };
    }, [ensureSettingsHostMounted, signedIn]);

    useEffect(() => {
        if (!signedIn) return;
        sessionIdCounter += 1;
        const thisSessionId = sessionIdCounter;
        sessionIdRef.current = thisSessionId;
        activeSessionIdRef.current = thisSessionId;
        moduleSessionIdRef.current = thisSessionId;
        moduleActiveSessionIdRef.current = thisSessionId;

        let cancelled = false;
        let cancelIdle: (() => void) | undefined;
        const stopInteractive = onDashboardInteractive(() => {
            if (cancelled) return;
            if (sessionIdRef.current !== activeSessionIdRef.current) return;
            prefetchSettingsShellChunks();
            if (!isLitePerformanceActive()) {
                void loadSettingsIntentWarm()
                    .then((m) => {
                        if (cancelled) return;
                        if (sessionIdRef.current !== activeSessionIdRef.current) return;
                        if (moduleSessionIdRef.current !== moduleActiveSessionIdRef.current) return;
                        m.warmSettingsOnHover();
                    })
                    .catch(() => undefined);
            }
            cancelIdle = scheduleIdleWork(() => {
                if (cancelled) return;
                if (sessionIdRef.current !== activeSessionIdRef.current) return;
                ensureSettingsHostMounted();
                void loadSettingsBootHydrator()
                    .then((m) => {
                        if (cancelled) return;
                        if (sessionIdRef.current !== activeSessionIdRef.current) return;
                        if (moduleSessionIdRef.current !== moduleActiveSessionIdRef.current) return;
                        m.hydrateSettingsShellForInstantOpen(true);
                    })
                    .catch(() => undefined);
            }, nativeIdleOptions());
        });
        return () => {
            cancelled = true;
            activeSessionIdRef.current = 0;
            moduleActiveSessionIdRef.current = 0;
            stopInteractive();
            cancelIdle?.();
        };
    }, [ensureSettingsHostMounted, signedIn]);

    useEffect(() => {
        if (!initialSessionOpen || restoredWarmRef.current || !signedIn) return;
        sessionIdCounter += 1;
        const thisSessionId = sessionIdCounter;
        sessionIdRef.current = thisSessionId;
        activeSessionIdRef.current = thisSessionId;
        moduleSessionIdRef.current = thisSessionId;
        moduleActiveSessionIdRef.current = thisSessionId;

        let cancelled = false;
        restoredWarmRef.current = true;
        ensureSettingsHostMounted();
        void loadSettingsIntentWarm()
            .then((m) => {
                if (cancelled) return;
                if (sessionIdRef.current !== activeSessionIdRef.current) return;
                if (moduleSessionIdRef.current !== moduleActiveSessionIdRef.current) return;
                m.warmSettingsOnOpen();
            })
            .catch(() => undefined);
        void loadSettingsBootHydrator()
            .then((m) => {
                if (cancelled) return;
                if (sessionIdRef.current !== activeSessionIdRef.current) return;
                if (moduleSessionIdRef.current !== moduleActiveSessionIdRef.current) return;
                m.hydrateSettingsShellForInstantOpen(true);
            })
            .catch(() => undefined);
        return () => {
            cancelled = true;
            activeSessionIdRef.current = 0;
            moduleActiveSessionIdRef.current = 0;
        };
    }, [ensureSettingsHostMounted, initialSessionOpen, signedIn]);
}

function prefetchSettingsShellChunks(): void {
    prefetchSettingsOverlayEntry();
    void loadSettingsOverlayEntry().catch(() => undefined);
    prefetchHamiSettingsModule();
}

function warmSettingsChunks(): void {
    prefetchSettingsShellChunks();
    const sessionAtCall = moduleSessionIdRef.current;
    const activeAtCall = moduleActiveSessionIdRef.current;
    void loadSettingsIntentWarm()
        .then((m) => {
            if (sessionAtCall !== activeAtCall) return;
            if (moduleSessionIdRef.current !== moduleActiveSessionIdRef.current) return;
            m.warmSettingsOnHover();
            m.primeSettingsShellForOpen();
        })
        .catch(() => undefined);
    void loadSettingsBootHydrator()
        .then((m) => {
            if (sessionAtCall !== activeAtCall) return;
            if (moduleSessionIdRef.current !== moduleActiveSessionIdRef.current) return;
            m.hydrateSettingsShellForInstantOpen(true);
        })
        .catch(() => undefined);
}

/**
 * pointerdown على الترس — setState بلا flushSync حتى لا تتجمد لمسة الفتح خلف الشجرة.
 * الكروم الفوري من paintSettingsInstantChrome قبل هذا الاستدعاء.
 */
export function primeSettingsHostMount(ensureSettingsHostMounted: () => void): void {
    bumpModuleSession();
    if (hasSettingsOverlayHost()) {
        warmSettingsChunks();
        return;
    }
    ensureSettingsHostMounted();
    warmSettingsChunks();
}
