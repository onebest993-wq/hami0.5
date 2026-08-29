import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import {
    BOOT_CONTENT_READY_EVENT,
    BOOT_EXIT_MS,
    BOOT_REVEAL_DONE_EVENT,
    getBootRevealMinMs,
    getBootRevealMaxMs,
    isBootContentReady,
    isBootRevealDone,
    markBootRevealDone,
} from '@/app/bootstrap/bootReveal';
import { hasStaticBootShell } from '@/app/bootstrap/bootStaticShell';
import type { HamiBootOverlayPhase } from '@/app/bootstrap/HamiBootOverlay';

type BootRevealState = {
    overlayPhase: HamiBootOverlayPhase | 'gone';
    overlayCovering: boolean;
};

function readExitStarted(): boolean {
    return typeof window !== 'undefined' && window.__hamiBootExitStarted__ === true;
}

/**
 * طبقة React فقط.
 * مالك إزالة #hami-static-boot على المنزل = homeMainGridPaintGate وحده.
 * لا قصّ قسري بعد مهلة — الغطاء الكحلي يبقى حتى الشبكة الحية.
 */
export function useBootReveal(): BootRevealState {
    const bootAlreadyRevealed = isBootRevealDone();
    const exitAlreadyStarted = !bootAlreadyRevealed && readExitStarted();

    const [overlayPhase, setOverlayPhase] = useState<HamiBootOverlayPhase | 'gone'>(() => {
        if (bootAlreadyRevealed) return 'gone';
        return 'visible';
    });

    const shownAtRef = useRef(Date.now());
    const contentReadyRef = useRef(isBootContentReady());
    const exitStartedRef = useRef(bootAlreadyRevealed || exitAlreadyStarted);
    const waitTimerRef = useRef<number | null>(null);
    const maxTimerRef = useRef<number | null>(null);

    const clearWaitTimers = useCallback(() => {
        if (waitTimerRef.current != null) {
            window.clearTimeout(waitTimerRef.current);
            waitTimerRef.current = null;
        }
        if (maxTimerRef.current != null) {
            window.clearTimeout(maxTimerRef.current);
            maxTimerRef.current = null;
        }
    }, []);

    const applyExitGone = useCallback((opts?: { flush?: boolean }) => {
        if (typeof window !== 'undefined') {
            window.__hamiBootExitStarted__ = true;
        }
        if (opts?.flush) {
            flushSync(() => {
                setOverlayPhase('gone');
            });
        } else {
            setOverlayPhase('gone');
        }
        if (!hasStaticBootShell()) {
            markBootRevealDone();
            window.dispatchEvent(new Event(BOOT_REVEAL_DONE_EVENT));
        }
    }, []);

    const finishExit = useCallback(() => {
        applyExitGone({ flush: true });
    }, [applyExitGone]);

    const startExit = useCallback(() => {
        if (exitStartedRef.current) return;
        exitStartedRef.current = true;
        if (typeof window !== 'undefined') {
            window.__hamiBootExitStarted__ = true;
        }
        if (BOOT_EXIT_MS > 0) {
            window.setTimeout(finishExit, BOOT_EXIT_MS);
        } else {
            finishExit();
        }
    }, [finishExit]);

    const tryStartExit = useCallback(() => {
        if (exitStartedRef.current) return;
        if (!contentReadyRef.current) return;
        const visibleForMs = Date.now() - shownAtRef.current;
        const waitMs = Math.max(0, getBootRevealMinMs() - visibleForMs);
        if (waitMs > 0) {
            if (waitTimerRef.current != null) window.clearTimeout(waitTimerRef.current);
            waitTimerRef.current = window.setTimeout(() => {
                waitTimerRef.current = null;
                startExit();
            }, waitMs);
            return;
        }
        startExit();
    }, [startExit]);

    useLayoutEffect(() => {
        const shellPresent = hasStaticBootShell();

        if (isBootRevealDone() && !shellPresent) {
            markBootRevealDone();
            setOverlayPhase('gone');
            return undefined;
        }

        if (readExitStarted() && !shellPresent) {
            applyExitGone({ flush: false });
            return undefined;
        }

        if (isBootRevealDone() && shellPresent) {
            setOverlayPhase('gone');
        }

        shownAtRef.current = Date.now();
        contentReadyRef.current = isBootContentReady();

        const onContentReady = () => {
            contentReadyRef.current = true;
            tryStartExit();
        };

        window.addEventListener(BOOT_CONTENT_READY_EVENT, onContentReady);
        if (isBootContentReady()) {
            onContentReady();
        }
        maxTimerRef.current = window.setTimeout(() => {
            maxTimerRef.current = null;
            contentReadyRef.current = true;
            tryStartExit();
        }, getBootRevealMaxMs());

        return () => {
            window.removeEventListener(BOOT_CONTENT_READY_EVENT, onContentReady);
            clearWaitTimers();
        };
    }, [applyExitGone, clearWaitTimers, tryStartExit]);

    return {
        overlayPhase,
        overlayCovering: overlayPhase !== 'gone',
    };
}
