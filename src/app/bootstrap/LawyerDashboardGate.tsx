import React, { Suspense, useCallback, useLayoutEffect, useRef, useState } from 'react';

import { HamiBootOverlay } from '@/app/bootstrap/HamiBootOverlay';
import {
    shouldMountReactBootOverlay,
} from '@/app/bootstrap/bootStaticShell';
import { useBootReveal } from '@/app/bootstrap/useBootReveal';
import { isBootRevealDone, isSplashGuardFrozen } from '@/app/bootstrap/bootReveal';
import { LawyerDashboardBootErrorBoundary } from '@/app/bootstrap/LawyerDashboardBootErrorBoundary';
import {
    LawyerDashboardLazy,
    preloadLawyerDashboardChunk,
} from '@/app/bootstrap/lawyerDashboardChunk';
import { getLawyerDashboardModuleSync } from '@/app/runtime/lawyerDashboardLoader';
import type { LawyerDashboardShellProps } from '@/app/components/lawyer/dashboard/LawyerDashboardQuantumShell';

/** مع تقييم Gate — ابدأ LD فوراً بلا انتظار commit لـ Suspense */
if (typeof window !== 'undefined') {
    void preloadLawyerDashboardChunk();
}

/**
 * أثناء تحميل chunk اللوحة:
 * - خلفية صامتة فقط — بلا شعار مكرر
 */
function GateContentFallback(): React.ReactElement {
    return (
        <div
            className="relative min-h-screen w-full hami-board-canvas-bg"
            data-testid="lawyer-gate-content-fallback"
            aria-busy="true"
            aria-label={isSplashGuardFrozen() ? 'تهيئة حامي' : 'حامي'}
        />
    );
}

/** مسار متزامن عند اكتمال preload قبل أول render — يتجاوز Suspense */
function LawyerDashboardBody({
    bootKey,
    ...props
}: LawyerDashboardShellProps & { bootKey: number }): React.ReactElement {
    const syncMod = getLawyerDashboardModuleSync();
    if (syncMod) {
        const Dashboard = syncMod.LawyerDashboard;
        return <Dashboard key={bootKey} {...props} />;
    }
    return (
        <Suspense fallback={<GateContentFallback />}>
            <LawyerDashboardLazy key={bootKey} {...props} />
        </Suspense>
    );
}

/** chunk يُحمَّل عند دخول شاشة المحامي — الشعار الثابت يغطي حتى جاهزية الواجهة */
export function LawyerDashboardGate(props: LawyerDashboardShellProps) {
    const [bootKey, setBootKey] = useState(0);
    const { overlayCovering } = useBootReveal();
    const dashboardRootRef = useRef<HTMLDivElement | null>(null);
    const splashFrozen = isSplashGuardFrozen();
    const mountReactOverlay = shouldMountReactBootOverlay();
    const showBootOverlay = overlayCovering && !splashFrozen && mountReactOverlay;
    /** لا تحجب اللمس إلا عند overlay React — #hami-static-boot يغطي بz-index خاص */
    const blockPointer = !splashFrozen && showBootOverlay;

    useLayoutEffect(() => {
        if (!isBootRevealDone()) return;
        dashboardRootRef.current?.style.setProperty('pointer-events', 'auto');
        dashboardRootRef.current?.setAttribute('aria-hidden', 'false');
        document
            .querySelectorAll<HTMLElement>('[data-testid="lawyer-boot-shell"]')
            .forEach((el) => el.setAttribute('hidden', ''));
    }, [overlayCovering]);

    const handleBootReset = useCallback(() => {
        try {
            sessionStorage.removeItem('hami:vite-stale-import-reload');
        } catch {
            /* ignore */
        }
        setBootKey((k) => k + 1);
    }, []);

    return (
        <LawyerDashboardBootErrorBoundary bootKey={bootKey} onReset={handleBootReset}>
            <div
                ref={dashboardRootRef}
                className="relative min-h-screen hami-board-canvas-bg"
                style={{
                    opacity: 1,
                    visibility: 'visible',
                    pointerEvents: blockPointer ? 'none' : 'auto',
                }}
                aria-hidden={blockPointer}
            >
                <LawyerDashboardBody bootKey={bootKey} {...props} />
            </div>
            {/* فقط إن غاب الشعار الثابت — مسار نادر */}
            {showBootOverlay ? <HamiBootOverlay phase="visible" /> : null}
        </LawyerDashboardBootErrorBoundary>
    );
}
