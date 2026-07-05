import React, { Suspense, useCallback, useEffect, useState } from 'react';

import { HamiBootOverlay } from '@/app/bootstrap/HamiBootOverlay';
import { useBootReveal } from '@/app/bootstrap/useBootReveal';
import { LawyerDashboardLazy, preloadLawyerDashboardChunk, resetLawyerDashboardChunkPreload } from '@/app/bootstrap/lawyerDashboardChunk';
import { LawyerDashboardBootErrorBoundary } from '@/app/bootstrap/LawyerDashboardBootErrorBoundary';
import { LawyerSettingsProvider } from '@/app/context/LawyerSettingsContext';
import type { LawyerDashboardShellProps } from '@/app/components/lawyer/dashboard/LawyerDashboardQuantumShell';

/** chunk يُحمَّل عند دخول شاشة المحامي — طبقة «حامي» حتى جاهزية الواجهة */
export function LawyerDashboardGate(props: LawyerDashboardShellProps) {
    const [bootKey, setBootKey] = useState(0);
    const { overlayPhase, dashboardVisible } = useBootReveal();

    useEffect(() => {
        void preloadLawyerDashboardChunk();
    }, []);

    const handleBootReset = useCallback(() => {
        try {
            sessionStorage.removeItem('hami:vite-stale-import-reload');
        } catch {
            /* ignore */
        }
        resetLawyerDashboardChunkPreload();
        setBootKey((k) => k + 1);
    }, []);

    return (
        <LawyerSettingsProvider>
            <LawyerDashboardBootErrorBoundary bootKey={bootKey} onReset={handleBootReset}>
                <div
                    className="relative min-h-screen"
                    style={{
                        visibility: dashboardVisible ? 'visible' : 'hidden',
                        pointerEvents: dashboardVisible ? 'auto' : 'none',
                    }}
                    aria-hidden={!dashboardVisible}
                >
                    <Suspense fallback={null}>
                        <LawyerDashboardLazy key={bootKey} {...props} />
                    </Suspense>
                </div>
                {overlayPhase !== 'gone' ? <HamiBootOverlay phase={overlayPhase} /> : null}
            </LawyerDashboardBootErrorBoundary>
        </LawyerSettingsProvider>
    );
}
