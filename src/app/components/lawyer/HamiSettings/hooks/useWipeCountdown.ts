import { useCallback, useEffect, useRef, useState } from 'react';
import { SmartToast } from '@/app/components/ui/SmartToast';
import { registerSettingsWipeCountdownGuard } from '@/app/components/lawyer/HamiSettings/settingsEscapeStack';
import { useSettingsSectionActive } from '../settingsSectionActiveContext';

const COUNTDOWN_SECONDS = 10;

export function useWipeCountdown() {
    const sectionActive = useSettingsSectionActive();
    const sectionActiveRef = useRef(sectionActive);
    sectionActiveRef.current = sectionActive;
    const mountedRef = useRef(true);
    const countdownTimerRef = useRef<number | null>(null);
    const countdownResolveRef = useRef<((completed: boolean) => void) | null>(null);
    const cancelledRef = useRef(false);
    const [wipePhase, setWipePhase] = useState<'idle' | 'countdown' | 'wiping'>('idle');
    const [countdown, setCountdown] = useState(0);

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
    }, [finishCountdown]);

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
    }, [finishCountdown, sectionActive, wipePhase]);

    useEffect(() => {
        if (sectionActive && wipePhase === 'countdown') {
            registerSettingsWipeCountdownGuard(true, cancelCountdown);
            return;
        }
        registerSettingsWipeCountdownGuard(false);
    }, [wipePhase, cancelCountdown, sectionActive]);

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
    }, [finishCountdown]);

    return {
        COUNTDOWN_SECONDS,
        wipePhase,
        setWipePhase,
        countdown,
        setCountdown,
        cancelCountdown,
        waitCountdown,
        sectionActiveRef,
        mountedRef,
    };
}
