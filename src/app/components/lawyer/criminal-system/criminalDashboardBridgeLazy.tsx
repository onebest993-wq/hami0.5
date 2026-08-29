import React, { useEffect, useState, type ReactNode } from 'react';
import {
    getBackgroundServicesDeferMs,
    scheduleIdleWork,
} from '@/app/runtime/mobileRuntimePolicy';
import {
    CRIMINAL_DASHBOARD_BRIDGE_ACTIVATE_EVENT,
    consumeCriminalDashboardBridgeActivateRequest,
} from '@/app/slices/criminal/bridgeEvent';
import { HOME_MAIN_GRID_PAINTED_EVENT } from '@/app/bootstrap/bootEventNames';
import {
    CRIMINAL_DASHBOARD_STUB,
    CriminalDashboardBridgeContext,
    type CriminalDashboardBridge,
} from './criminalDashboardBridgeContext';

type CriminalDashboardBridgeLazyProviderProps = {
    lawyerId: string | null;
    enabled: boolean;
    children: ReactNode;
    onCasesChange?: (cases: CriminalDashboardBridge['criminalCases']) => void;
};

function isHomeMainGridPaintedNow(): boolean {
    return typeof window !== 'undefined' && window.__hamiHomeMainGridPainted__ === true;
}

/**
 * قشرة FullBoot — STUB فوري ثم attach دينامي بلا إعادة تركيب الأبناء.
 * idle لا يبدأ قبل طلاء شبكة المنزل؛ activate-on-open فوري دائماً.
 */
export function CriminalDashboardBridgeLazyProvider({
    lawyerId,
    enabled,
    children,
    onCasesChange,
}: CriminalDashboardBridgeLazyProviderProps) {
    const [bridge, setBridge] = useState<CriminalDashboardBridge>(CRIMINAL_DASHBOARD_STUB);

    useEffect(() => {
        if (!enabled) {
            setBridge(CRIMINAL_DASHBOARD_STUB);
            return;
        }

        let cancelled = false;
        let started = false;
        let detach: (() => void) | undefined;
        let cancelIdle: (() => void) | undefined;
        let removePaintListener: (() => void) | undefined;

        const attach = () => {
            if (started || cancelled) return;
            started = true;
            cancelIdle?.();
            cancelIdle = undefined;
            removePaintListener?.();
            removePaintListener = undefined;
            void import('./criminalDashboardBridgeRuntime').then((m) => {
                if (cancelled) return;
                detach?.();
                detach = m.attachCriminalDashboardBridge({
                    lawyerId,
                    onChange: (next) => {
                        if (!cancelled) setBridge(next);
                    },
                    onCasesChange,
                });
            });
        };

        const startIdleAttach = () => {
            if (started || cancelled) return;
            cancelIdle = scheduleIdleWork(attach, {
                minDelayMs: getBackgroundServicesDeferMs(),
                timeoutMs: 20_000,
            });
        };

        const pendingActivate = consumeCriminalDashboardBridgeActivateRequest();
        if (pendingActivate) {
            attach();
        } else if (isHomeMainGridPaintedNow()) {
            startIdleAttach();
        } else {
            const onPainted = () => {
                removePaintListener?.();
                removePaintListener = undefined;
                startIdleAttach();
            };
            window.addEventListener(HOME_MAIN_GRID_PAINTED_EVENT, onPainted);
            removePaintListener = () =>
                window.removeEventListener(HOME_MAIN_GRID_PAINTED_EVENT, onPainted);
        }

        const activateNow = () => {
            cancelIdle?.();
            cancelIdle = undefined;
            removePaintListener?.();
            removePaintListener = undefined;
            attach();
        };
        window.addEventListener(CRIMINAL_DASHBOARD_BRIDGE_ACTIVATE_EVENT, activateNow);

        return () => {
            cancelled = true;
            cancelIdle?.();
            removePaintListener?.();
            window.removeEventListener(CRIMINAL_DASHBOARD_BRIDGE_ACTIVATE_EVENT, activateNow);
            detach?.();
        };
    }, [enabled, lawyerId, onCasesChange]);

    return (
        <CriminalDashboardBridgeContext.Provider value={bridge}>
            {children}
        </CriminalDashboardBridgeContext.Provider>
    );
}
