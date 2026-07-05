import { useCallback, useEffect, useRef, useState } from 'react';
import {
    BOOT_CONTENT_READY_EVENT,
    BOOT_EXIT_MS,
    BOOT_REVEAL_MAX_MS,
    BOOT_REVEAL_MIN_MS,
} from '@/app/bootstrap/bootReveal';
import { removeStaticBootShell } from '@/app/bootstrap/bootStaticShell';
import type { HamiBootOverlayPhase } from '@/app/bootstrap/HamiBootOverlay';

export type BootRevealState = {
    overlayPhase: HamiBootOverlayPhase | 'gone';
    dashboardVisible: boolean;
};

export function useBootReveal(): BootRevealState {
    const [overlayPhase, setOverlayPhase] = useState<HamiBootOverlayPhase | 'gone'>('visible');
    const [dashboardVisible, setDashboardVisible] = useState(false);
    const shownAtRef = useRef(Date.now());
    const contentReadyRef = useRef(false);
    const exitStartedRef = useRef(false);
    const timersRef = useRef<number[]>([]);

    const clearTimers = useCallback(() => {
        for (const id of timersRef.current) window.clearTimeout(id);
        timersRef.current = [];
    }, []);

    const schedule = useCallback((fn: () => void, ms: number) => {
        const id = window.setTimeout(fn, ms);
        timersRef.current.push(id);
    }, []);

    const startExit = useCallback(() => {
        if (exitStartedRef.current) return;
        exitStartedRef.current = true;
        setOverlayPhase('exiting');
        schedule(() => {
            removeStaticBootShell();
            setOverlayPhase('gone');
            setDashboardVisible(true);
        }, BOOT_EXIT_MS);
    }, [schedule]);

    const tryStartExit = useCallback(() => {
        if (exitStartedRef.current) return;
        if (!contentReadyRef.current) return;

        const elapsed = Date.now() - shownAtRef.current;
        const waitMore = Math.max(0, BOOT_REVEAL_MIN_MS - elapsed);
        schedule(startExit, waitMore);
    }, [schedule, startExit]);

    useEffect(() => {
        shownAtRef.current = Date.now();

        const onContentReady = () => {
            contentReadyRef.current = true;
            tryStartExit();
        };

        window.addEventListener(BOOT_CONTENT_READY_EVENT, onContentReady);
        schedule(() => {
            contentReadyRef.current = true;
            tryStartExit();
        }, BOOT_REVEAL_MAX_MS);

        return () => {
            window.removeEventListener(BOOT_CONTENT_READY_EVENT, onContentReady);
            clearTimers();
        };
    }, [clearTimers, schedule, tryStartExit]);

    return { overlayPhase, dashboardVisible };
}
