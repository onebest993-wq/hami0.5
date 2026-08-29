import React, { Suspense, useEffect, useLayoutEffect, type ReactElement } from 'react';

import { AuthProvider } from './context/AuthContext';
import { isBootRevealDone } from '@/app/bootstrap/bootReveal';
import { shouldHideBootSuspenseFallback, shouldMountReactBootOverlay } from '@/app/bootstrap/bootStaticShell';
import {
    getAppRuntimeShellModuleSync,
    loadAppRuntimeShellModule,
} from '@/app/runtime/appRuntimeShellLoader';
import { qa } from '@/app/qa/qaAttr';
import {
    isPlainDocumentSurface,
    whenPlainDocumentCoverClears,
} from '@/boot/plainDocumentPath';

const APP_RUNTIME_READY_EVENT = 'hami:app-runtime-ready';

const LazyGlobalErrorBoundary = React.lazy(() =>
    import('./components/shared/GlobalErrorBoundary').then((m) => ({
        default: m.GlobalErrorBoundary,
    })),
);

/** يبدأ عند تقييم الوحدة — يطوي انتظار React.lazy الأول */
const appRuntimeShellPromise = loadAppRuntimeShellModule().then((m) => ({
    default: m.AppRuntimeShell,
}));
const LazyAppRuntimeShell = React.lazy(() => appRuntimeShellPromise);

function AppRuntimeShellEntry(): ReactElement {
    const sync = getAppRuntimeShellModuleSync();
    if (sync) return <sync.AppRuntimeShell />;
    return (
        <Suspense fallback={<AppRuntimeSuspenseFallback />}>
            <LazyAppRuntimeShell />
        </Suspense>
    );
}

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
        return <div className="min-h-screen w-full" aria-hidden {...qa('app-runtime-static-shell-cover')} />;
    }
    if (isBootRevealDone() || !shouldMountReactBootOverlay()) {
        return (
            <div
                className="min-h-screen w-full hami-board-canvas-bg"
                {...qa('app-runtime-warm-fallback')}
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
                    {...qa('app-runtime-overlay-fallback')}
                    aria-busy="true"
                    aria-label="حامي"
                />
            }
        >
            <LazyHamiBootOverlay phase="visible" />
        </Suspense>
    );
}

function AppRuntimeTree(): ReactElement {
    return (
        <AuthProvider>
            <AppRuntimeShellEntry />
        </AuthProvider>
    );
}

export function AppResolvedRuntime(): ReactElement {
    useLayoutEffect(() => {
        const markReady = () => {
            document.documentElement.dataset.hamiAppRuntimeReady = '1';
            window.dispatchEvent(new Event(APP_RUNTIME_READY_EVENT));
        };
        if (isPlainDocumentSurface()) {
            return whenPlainDocumentCoverClears(markReady);
        }
        markReady();
        return undefined;
    }, []);

    useEffect(() => {
        const runDeferredAppBoot = () => {
            void Promise.all([
                import('./utils/production'),
                import('./utils/constants'),
                import('./utils/debug'),
            ]).then(([production, constants, debugModule]) => {
                production.initializeProduction();
                if (!isPlainDocumentSurface()) {
                    production.logBuildInfo();
                    debugModule.debug.log('✅ [App] System Ready');
                }
                constants.clearCacheIfNeeded();
            });

            try {
                sessionStorage.removeItem(CHUNK_RELOAD_SESSION_KEY);
                sessionStorage.removeItem(VITE_STALE_IMPORT_RELOAD_KEY);
            } catch {
                /* ignore */
            }
        };

        if (isPlainDocumentSurface()) {
            return whenPlainDocumentCoverClears(runDeferredAppBoot);
        }

        if (typeof requestIdleCallback !== 'undefined') {
            const idleId = requestIdleCallback(runDeferredAppBoot, { timeout: 1500 });
            return () => cancelIdleCallback(idleId);
        }
        const timer = window.setTimeout(runDeferredAppBoot, 0);
        return () => window.clearTimeout(timer);
    }, []);

    return (
        <Suspense fallback={<AppRuntimeTree />}>
            <LazyGlobalErrorBoundary>
                <AppRuntimeTree />
            </LazyGlobalErrorBoundary>
        </Suspense>
    );
}
