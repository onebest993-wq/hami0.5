import React, { Suspense, useEffect, useLayoutEffect, type ReactElement } from 'react';

import { AuthProvider } from './context/AuthContext';
import { GlobalErrorBoundary } from './components/shared/GlobalErrorBoundary';
import { isBootRevealDone } from '@/app/bootstrap/bootReveal';
import { shouldHideBootSuspenseFallback, shouldMountReactBootOverlay } from '@/app/bootstrap/bootStaticShell';

const APP_RUNTIME_READY_EVENT = 'hami:app-runtime-ready';

/** يبدأ عند تقييم الوحدة — يطوي انتظار React.lazy الأول */
const appRuntimeShellPromise = import('./AppRuntimeShell').then((m) => ({
    default: m.AppRuntimeShell,
}));

const LazyAppRuntimeShell = React.lazy(() => appRuntimeShellPromise);

const LazyHamiBootOverlay = React.lazy(() =>
    import('@/app/bootstrap/HamiBootOverlay').then((m) => ({
        default: m.HamiBootOverlay,
    })),
);

const CHUNK_RELOAD_SESSION_KEY = 'hami:chunk-reload-once';
const VITE_STALE_IMPORT_RELOAD_KEY = 'hami:vite-stale-import-reload';

/**
 * بعد اكتمال الإقلاع / مع الشعار الثابت: لا تُعد HamiBootOverlay.
 * cold النادر: overlay lazy — بلا sync import على مسار warm.
 */
function AppRuntimeSuspenseFallback(): React.ReactElement {
    if (shouldHideBootSuspenseFallback()) {
        return <div className="min-h-screen w-full" aria-hidden data-testid="app-runtime-static-shell-cover" />;
    }
    if (isBootRevealDone() || !shouldMountReactBootOverlay()) {
        return (
            <div
                className="min-h-screen w-full hami-board-canvas-bg"
                data-testid="app-runtime-warm-fallback"
                aria-busy="true"
                aria-label="جاري التحميل"
            />
        );
    }
    return (
        <Suspense
            fallback={
                <div
                    className="min-h-screen w-full hami-board-canvas-bg"
                    data-testid="app-runtime-overlay-fallback"
                    aria-busy="true"
                    aria-label="حامي"
                />
            }
        >
            <LazyHamiBootOverlay phase="visible" />
        </Suspense>
    );
}

export function AppResolvedRuntime(): ReactElement {
    useLayoutEffect(() => {
        document.documentElement.dataset.hamiAppRuntimeReady = '1';
        window.dispatchEvent(new Event(APP_RUNTIME_READY_EVENT));
    }, []);

    useEffect(() => {
        const runDeferredAppBoot = () => {
            void Promise.all([
                import('./utils/production'),
                import('./utils/constants'),
                import('./utils/debug'),
            ]).then(([production, constants, debugModule]) => {
                production.initializeProduction();
                production.logBuildInfo();
                debugModule.debug.log('✅ [App] System Ready');
                constants.clearCacheIfNeeded();
            });

            try {
                sessionStorage.removeItem(CHUNK_RELOAD_SESSION_KEY);
                sessionStorage.removeItem(VITE_STALE_IMPORT_RELOAD_KEY);
            } catch {
                /* ignore */
            }
        };

        if (typeof requestIdleCallback !== 'undefined') {
            requestIdleCallback(runDeferredAppBoot, { timeout: 1500 });
        } else {
            window.setTimeout(runDeferredAppBoot, 0);
        }
    }, []);

    return (
        <GlobalErrorBoundary>
            <AuthProvider>
                <Suspense fallback={<AppRuntimeSuspenseFallback />}>
                    <LazyAppRuntimeShell />
                </Suspense>
            </AuthProvider>
        </GlobalErrorBoundary>
    );
}
