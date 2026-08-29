import React, { lazy, Suspense, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

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
import { prefetchLawyerAuthLane } from '@/app/bootstrap/lawyerAuth/prefetchLawyerAuthLane';
import { getLawyerDashboardModuleSync } from '@/app/runtime/lawyerDashboardLoader';
import { prefetchLawyerDashboardInner } from '@/app/runtime/lawyerDashboardInnerLoader';
import {
    resolveLawyerBoardEnter,
    shouldPreloadLawyerDashboardBoard,
} from '@/boot/shouldPreloadLawyerBoard';
import { useAuthSafe } from '@/app/context/authHooks';
import { subscribePasswordRecovery } from '@/app/services/auth/passwordRecoveryGate';
import { subscribeAuthLogout, subscribeSameTabAuthLogout } from '@/app/services/auth/authSessionBroadcast';
import type { LawyerDashboardShellProps } from '@/app/components/lawyer/dashboard/LawyerDashboardQuantumShell';

const LazyLawyerAuthLaneHost = lazy(() =>
    import('@/app/bootstrap/lawyerAuth/LawyerAuthLaneHost').then((m) => ({
        default: m.LawyerAuthLaneHost,
    })),
);

/** مع تقييم Gate — اللوحة فقط عند جلسة مقبولة؛ وإلا مسار الهوية */
if (typeof window !== 'undefined') {
    if (shouldPreloadLawyerDashboardBoard()) {
        void preloadLawyerDashboardChunk();
    } else {
        prefetchLawyerAuthLane();
    }
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
            aria-label={isSplashGuardFrozen() ? 'جاري التهيئة' : 'لوحة العمل'}
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
    const [laneReleased, setLaneReleased] = useState(false);
    const { overlayCovering } = useBootReveal();
    const dashboardRootRef = useRef<HTMLDivElement | null>(null);
    const splashFrozen = isSplashGuardFrozen();
    const mountReactOverlay = shouldMountReactBootOverlay();
    const showBootOverlay = overlayCovering && !splashFrozen && mountReactOverlay;
    /** لا تحجب اللمس إلا عند overlay React — #hami-static-boot يغطي بz-index خاص */
    const blockPointer = !splashFrozen && showBootOverlay;
    const { user: authUser } = useAuthSafe();
    const [, setRecoveryEpoch] = useState(0);
    const [forcedAuthLane, setForcedAuthLane] = useState(false);

    useEffect(() => subscribePasswordRecovery(() => setRecoveryEpoch((n) => n + 1)), []);

    useEffect(() => {
        const leaveBoard = () => {
            setForcedAuthLane(true);
            setLaneReleased(false);
        };
        const unsubSameTab = subscribeSameTabAuthLogout(leaveBoard);
        const unsubCrossTab = subscribeAuthLogout(leaveBoard);
        return () => {
            unsubSameTab();
            unsubCrossTab();
        };
    }, []);

    useEffect(() => {
        if (authUser?.id) setForcedAuthLane(false);
    }, [authUser?.id]);

    const enterBoard = resolveLawyerBoardEnter({
        forcedAuthLane,
        laneReleased,
        liveUserId: authUser?.id,
    });
    const releaseLane = useCallback(() => setLaneReleased(true), []);

    useLayoutEffect(() => {
        if (!enterBoard) return;
        void preloadLawyerDashboardChunk();
        prefetchLawyerDashboardInner();
        prefetchLawyerAuthLane();
    }, [enterBoard]);

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
                {enterBoard ? (
                    <LawyerDashboardBody bootKey={bootKey} {...props} />
                ) : (
                    <Suspense fallback={<GateContentFallback />}>
                        <LazyLawyerAuthLaneHost onEnterBoard={releaseLane} />
                    </Suspense>
                )}
            </div>
            {showBootOverlay && enterBoard ? <HamiBootOverlay phase="visible" /> : null}
        </LawyerDashboardBootErrorBoundary>
    );
}
