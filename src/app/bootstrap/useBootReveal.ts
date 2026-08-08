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
import { removeStaticBootShell, hasStaticBootShell } from '@/app/bootstrap/bootStaticShell';
import {
    HOME_MAIN_GRID_PAINTED_EVENT,
    isHomeMainGridPainted,
} from '@/app/bootstrap/homeMainGridPaintGate';
import type { HamiBootOverlayPhase } from '@/app/bootstrap/HamiBootOverlay';

export type BootRevealState = {
    overlayPhase: HamiBootOverlayPhase | 'gone';
    overlayCovering: boolean;
};

function readExitStarted(): boolean {
    return typeof window !== 'undefined' && window.__hamiBootExitStarted__ === true;
}

/**
 * كشف الإقلاع: الطبقة تبقى معتمة بالكامل ثم تُزال فوراً بعد paint الواجهة.
 * لا مرحلة تلاشي — التلاشي كان يكشف #05060d ويُنتج الشاشة السوداء.
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
    const shellFallbackTimerRef = useRef<number | null>(null);

    const clearShellFallbackTimer = useCallback(() => {
        if (shellFallbackTimerRef.current != null) {
            window.clearTimeout(shellFallbackTimerRef.current);
            shellFallbackTimerRef.current = null;
        }
    }, []);

    const finalizeStaticShellIfNeeded = useCallback((opts?: { force?: boolean }) => {
        if (!hasStaticBootShell()) return;
        if (!opts?.force && !isHomeMainGridPainted()) return;
        removeStaticBootShell({ force: opts?.force, instant: true });
        if (!isBootRevealDone()) {
            markBootRevealDone();
            window.dispatchEvent(new Event(BOOT_REVEAL_DONE_EVENT));
        }
    }, []);

    const scheduleShellFallbackAfterContentReady = useCallback(() => {
        if (!hasStaticBootShell()) return;
        clearShellFallbackTimer();
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                if (!hasStaticBootShell() || isHomeMainGridPainted()) return;
                shellFallbackTimerRef.current = window.setTimeout(() => {
                    shellFallbackTimerRef.current = null;
                    finalizeStaticShellIfNeeded({ force: true });
                }, 320);
            });
        });
    }, [clearShellFallbackTimer, finalizeStaticShellIfNeeded]);

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
        clearShellFallbackTimer();
    }, [clearShellFallbackTimer]);

    /** تطبيق الخروج — overlay React فقط؛ #hami-static-boot يُزال عند paint الشبكة */
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
            removeStaticBootShell({ instant: true });
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
            if (isHomeMainGridPainted()) {
                removeStaticBootShell({ instant: true });
            }
            setOverlayPhase('gone');
            return undefined;
        }

        if (readExitStarted() && shellPresent) {
            /* warm reload: shell باقي — انتظر content-ready ثم أزل */
        }

        shownAtRef.current = Date.now();
        contentReadyRef.current = isBootContentReady();

        const onGridPainted = () => {
            clearShellFallbackTimer();
            finalizeStaticShellIfNeeded();
        };

        const onContentReady = () => {
            contentReadyRef.current = true;
            tryStartExit();
            scheduleShellFallbackAfterContentReady();
        };

        window.addEventListener(BOOT_CONTENT_READY_EVENT, onContentReady);
        window.addEventListener(HOME_MAIN_GRID_PAINTED_EVENT, onGridPainted);
        if (isBootContentReady()) {
            onContentReady();
        }
        if (isHomeMainGridPainted()) {
            onGridPainted();
        }
        maxTimerRef.current = window.setTimeout(() => {
            maxTimerRef.current = null;
            contentReadyRef.current = true;
            tryStartExit();
            finalizeStaticShellIfNeeded({ force: true });
        }, getBootRevealMaxMs());

        return () => {
            window.removeEventListener(BOOT_CONTENT_READY_EVENT, onContentReady);
            window.removeEventListener(HOME_MAIN_GRID_PAINTED_EVENT, onGridPainted);
            clearWaitTimers();
        };
    }, [
        applyExitGone,
        clearShellFallbackTimer,
        clearWaitTimers,
        finalizeStaticShellIfNeeded,
        scheduleShellFallbackAfterContentReady,
        tryStartExit,
    ]);

    return {
        overlayPhase,
        overlayCovering: overlayPhase !== 'gone',
    };
}
