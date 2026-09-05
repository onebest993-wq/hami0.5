import { useCallback, useEffect, useRef, useState } from 'react';
import { SmartToast } from '@/app/components/ui/SmartToast';
import { registerSettingsWipeCountdownGuard } from '@/app/components/lawyer/HamiSettings/settingsEscapeStack';
import { isAppForeground, subscribeAppForeground } from '@/app/runtime/appForegroundGate';
import { settingsFlowAbandoned, useSettingsSectionActiveRef } from '../settingsFlowGuard';

const COUNTDOWN_SECONDS = 10;

export type WipePhase = 'idle' | 'confirming' | 'countdown' | 'wiping';

export function useWipeCountdown() {
    const { sectionActive, sectionActiveRef } = useSettingsSectionActiveRef();
    const mountedRef = useRef(true);
    const countdownTimerRef = useRef<number | null>(null);
    const countdownResolveRef = useRef<((completed: boolean) => void) | null>(null);
    const cancelledRef = useRef(false);
    const requestInFlightRef = useRef(false);
    const [wipePhase, setWipePhaseState] = useState<WipePhase>('idle');
    const wipePhaseRef = useRef<WipePhase>(wipePhase);
    const [countdown, setCountdown] = useState(0);

    const setWipePhase = useCallback((phase: WipePhase) => {
        wipePhaseRef.current = phase;
        setWipePhaseState(phase);
    }, []);

    const beginDangerRequest = useCallback((): boolean => {
        if (requestInFlightRef.current || settingsFlowAbandoned(sectionActiveRef)) return false;
        if (wipePhaseRef.current !== 'idle') return false;
        requestInFlightRef.current = true;
        setWipePhase('confirming');
        return true;
    }, [setWipePhase]);

    const endDangerRequest = useCallback(() => {
        requestInFlightRef.current = false;
        if (wipePhaseRef.current === 'confirming') {
            setWipePhase('idle');
        }
    }, [setWipePhase]);

    const finishCountdown = useCallback((completed: boolean) => {
        if (countdownTimerRef.current !== null) {
            window.clearInterval(countdownTimerRef.current);
            countdownTimerRef.current = null;
        }
        const resolve = countdownResolveRef.current;
        countdownResolveRef.current = null;
        resolve?.(completed);
    }, []);

    const cancelCountdown = useCallback(() => {
        cancelledRef.current = true;
        finishCountdown(false);
        registerSettingsWipeCountdownGuard(false);
        setWipePhase('idle');
        setCountdown(0);
        SmartToast.info('تم إلغاء المسح');
    }, [finishCountdown, setWipePhase]);

    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
            finishCountdown(false);
            registerSettingsWipeCountdownGuard(false);
        };
    }, [finishCountdown]);

    useEffect(() => {
        if (sectionActive || wipePhase !== 'countdown') return;
        cancelledRef.current = true;
        finishCountdown(false);
        registerSettingsWipeCountdownGuard(false);
        setWipePhase('idle');
        setCountdown(0);
    }, [finishCountdown, sectionActive, setWipePhase, wipePhase]);

    useEffect(() => {
        if (sectionActive && wipePhase === 'countdown') {
            registerSettingsWipeCountdownGuard(true, cancelCountdown);
            return;
        }
        registerSettingsWipeCountdownGuard(false);
    }, [wipePhase, cancelCountdown, sectionActive]);

    useEffect(() => {
        if (wipePhase !== 'countdown') return;
        if (!isAppForeground()) {
            cancelCountdown();
            return;
        }
        return subscribeAppForeground({
            onSuspend: cancelCountdown,
            onResume: () => undefined,
        });
    }, [cancelCountdown, wipePhase]);

    const waitCountdown = useCallback((): Promise<boolean> => {
        cancelledRef.current = false;
        setWipePhase('countdown');
        setCountdown(COUNTDOWN_SECONDS);

        return new Promise((resolve) => {
            countdownResolveRef.current = resolve;
            let remaining = COUNTDOWN_SECONDS;
            countdownTimerRef.current = window.setInterval(() => {
                remaining -= 1;
                if (cancelledRef.current) {
                    finishCountdown(false);
                    return;
                }
                if (remaining <= 0) {
                    setCountdown(0);
                    finishCountdown(true);
                    return;
                }
                setCountdown(remaining);
            }, 1000);
        });
    }, [finishCountdown, setWipePhase]);

    return {
        COUNTDOWN_SECONDS,
        wipePhase,
        setWipePhase,
        countdown,
        setCountdown,
        cancelCountdown,
        waitCountdown,
        beginDangerRequest,
        endDangerRequest,
        sectionActiveRef,
        mountedRef,
    };
}
