import React, { Suspense, useEffect, useLayoutEffect, type ReactElement } from 'react';

import { AuthProvider } from '@/app/context/AuthContext';
import {
    getHqRuntimeShellModuleSync,
    loadHqRuntimeShellModule,
} from '@/app/runtime/hqRuntimeShellLoader';
import { APP_RUNTIME_READY_EVENT } from '@/app/runtime/eventConstants';

const hqRuntimeShellPromise = loadHqRuntimeShellModule().then((m) => ({
    default: m.HqRuntimeShell,
}));
const LazyHqRuntimeShell = React.lazy(() => hqRuntimeShellPromise);

function HqRuntimeShellEntry(): ReactElement {
    const sync = getHqRuntimeShellModuleSync();
    if (sync) return <sync.HqRuntimeShell />;
    return (
        <Suspense fallback={<div style={{ minHeight: '100dvh', background: '#ffffff' }} aria-hidden />}>
            <LazyHqRuntimeShell />
        </Suspense>
    );
}

function HqRuntimeTree(): ReactElement {
    return (
        <AuthProvider>
            <HqRuntimeShellEntry />
        </AuthProvider>
    );
}

export function HqResolvedRuntime(): ReactElement {
    useLayoutEffect(() => {
        document.documentElement.dataset.hamiAppRuntimeReady = '1';
        window.dispatchEvent(new Event(APP_RUNTIME_READY_EVENT));
    }, []);

    useEffect(() => {
        try {
            sessionStorage.removeItem('hami:chunk-reload-once');
            sessionStorage.removeItem('hami:vite-stale-import-reload');
        } catch {
            /* ignore */
        }
    }, []);

    return <HqRuntimeTree />;
}
