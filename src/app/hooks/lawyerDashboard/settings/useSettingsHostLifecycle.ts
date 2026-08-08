import { useEffect, useLayoutEffect, useRef } from 'react';

import { onDashboardInteractive } from '@/app/bootstrap/bootMetrics';
import { isLitePerformanceActive } from '@/app/runtime/devicePerformanceTier';
import { prefetchHamiSettingsModule } from '@/app/runtime/hamiSettingsLoader';
import { prefetchSettingsOverlayEntry } from '@/app/runtime/settingsOverlayEntryLoader';

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

/** تركيب Host بعد interactive + تسخين — قبل أول ضغطة على الترس */
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

    useLayoutEffect(() => {
        if (!signedIn) return;
        return onDashboardInteractive(() => {
            ensureSettingsHostMounted();
            prefetchSettingsOverlayEntry();
            prefetchHamiSettingsModule();
            if (!isLitePerformanceActive()) {
                void loadSettingsIntentWarm()
                    .then((m) => m.warmSettingsOnHover())
                    .catch(() => undefined);
            }
            void loadSettingsBootHydrator()
                .then((m) => m.hydrateSettingsShellForInstantOpen(true))
                .catch(() => undefined);
        });
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

export function primeSettingsHostMount(ensureSettingsHostMounted: () => void): void {
    ensureSettingsHostMounted();
    prefetchSettingsOverlayEntry();
    prefetchHamiSettingsModule();
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
