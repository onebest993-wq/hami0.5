import React, { Suspense, useCallback, useEffect, useState } from 'react';

import { LawyerDashboardLazy, preloadLawyerDashboardChunk } from '@/app/bootstrap/lawyerDashboardChunk';
import { LawyerBootShell } from '@/app/bootstrap/LawyerBootShell';
import { LawyerDashboardBootErrorBoundary } from '@/app/bootstrap/LawyerDashboardBootErrorBoundary';
import { LawyerSettingsProvider } from '@/app/context/LawyerSettingsContext';
import type { LawyerDashboardShellProps } from '@/app/components/lawyer/dashboard/LawyerDashboardQuantumShell';

/** chunk يُحمَّل عند دخول شاشة المحامي — LawyerBootShell أثناء الانتظار */
export function LawyerDashboardGate(props: LawyerDashboardShellProps) {
    const [bootKey, setBootKey] = useState(0);

    useEffect(() => {
        void preloadLawyerDashboardChunk();
    }, []);

    const handleBootReset = useCallback(() => {
        try {
            sessionStorage.removeItem('hami:vite-stale-import-reload');
        } catch {
            /* ignore */
        }
        void import('@/app/bootstrap/lawyerDashboardChunk').then((m) => m.resetLawyerDashboardChunkPreload());
        setBootKey((k) => k + 1);
    }, []);

    return (
        <LawyerSettingsProvider>
            <LawyerDashboardBootErrorBoundary bootKey={bootKey} onReset={handleBootReset}>
                <Suspense fallback={<LawyerBootShell />}>
                    <LawyerDashboardLazy key={bootKey} {...props} />
                </Suspense>
            </LawyerDashboardBootErrorBoundary>
        </LawyerSettingsProvider>
    );
}
