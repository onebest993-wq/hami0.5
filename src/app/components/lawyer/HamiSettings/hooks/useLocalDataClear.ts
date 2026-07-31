import { useCallback, useEffect, useRef, useState } from 'react';
import { SmartDialog } from '@/app/components/ui/SmartDialog';
import { SmartToast } from '@/app/components/ui/SmartToast';
import { wipeAllApplicationData } from '@/app/services/settings/applicationWipe';
import {
    mintSensitiveConfirmChallenge,
    verifySensitiveSettingsAction,
} from '@/app/services/settings/verifySensitiveSettingsAction';
import { registerSettingsWipeCountdownGuard } from '@/app/components/lawyer/HamiSettings/settingsEscapeStack';

const COUNTDOWN_SECONDS = 10;
const WIPE_CONFIRM_PHRASE = 'مسح نهائي';

export function useLocalDataClear(resetToDefaults: () => void) {
    const countdownTimerRef = useRef<number | null>(null);
    const cancelledRef = useRef(false);
    const [wipePhase, setWipePhase] = useState<'idle' | 'countdown' | 'wiping'>('idle');
    const [countdown, setCountdown] = useState(0);

    const cancelCountdown = useCallback(() => {
        cancelledRef.current = true;
        if (countdownTimerRef.current) {
            window.clearInterval(countdownTimerRef.current);
            countdownTimerRef.current = null;
        }
        registerSettingsWipeCountdownGuard(false);
        setWipePhase('idle');
        setCountdown(0);
        SmartToast.info('تم إلغاء المسح');
    }, []);

    useEffect(() => {
        return () => {
            if (countdownTimerRef.current) window.clearInterval(countdownTimerRef.current);
            registerSettingsWipeCountdownGuard(false);
        };
    }, []);

    useEffect(() => {
        if (wipePhase === 'countdown') {
            registerSettingsWipeCountdownGuard(true, cancelCountdown);
            return;
        }
        registerSettingsWipeCountdownGuard(false);
    }, [wipePhase, cancelCountdown]);

    const waitCountdown = useCallback((): Promise<boolean> => {
        cancelledRef.current = false;
        setWipePhase('countdown');
        setCountdown(COUNTDOWN_SECONDS);

        return new Promise((resolve) => {
            let remaining = COUNTDOWN_SECONDS;
            countdownTimerRef.current = window.setInterval(() => {
                remaining -= 1;
                if (cancelledRef.current) {
                    if (countdownTimerRef.current) window.clearInterval(countdownTimerRef.current);
                    countdownTimerRef.current = null;
                    resolve(false);
                    return;
                }
                if (remaining <= 0) {
                    if (countdownTimerRef.current) window.clearInterval(countdownTimerRef.current);
                    countdownTimerRef.current = null;
                    setCountdown(0);
                    resolve(true);
                    return;
                }
                setCountdown(remaining);
            }, 1000);
        });
    }, []);

    const requestFullWipe = useCallback(async () => {
        if (wipePhase !== 'idle') return;

        const okFirst = await SmartDialog.confirm(
            'سيتم حذف جميع بيانات التطبيق محلياً وسحابياً: القضايا، الملاحظات، المخزن، التنفيذ، التنبيهات، والإعدادات. لا يمكن التراجع عن هذا الإجراء.',
            { title: 'مسح كل البيانات؟', confirmText: 'متابعة', cancelText: 'إلغاء' },
        );
        if (!okFirst) return;

        const challenge = mintSensitiveConfirmChallenge(WIPE_CONFIRM_PHRASE);
        const verified = await verifySensitiveSettingsAction({
            confirmPhrase: challenge.confirmPhrase,
            title: 'تحقق قبل المسح',
            promptMessage: challenge.promptMessage,
        });
        if (!verified) return;

        SmartToast.warning(`انتظر ${COUNTDOWN_SECONDS} ثوانٍ قبل التأكيد النهائي`);
        const completed = await waitCountdown();
        if (!completed) {
            setWipePhase('idle');
            return;
        }

        const okFinal = await SmartDialog.confirm(
            'هذا تأكيد نهائي. سيتم مسح كل شيء في التطبيق — محلياً وسحابياً — الآن.',
            { title: 'التأكيد النهائي', confirmText: 'مسح الآن', cancelText: 'إلغاء' },
        );
        if (!okFinal) {
            setWipePhase('idle');
            return;
        }

        setWipePhase('wiping');
        try {
            const result = await wipeAllApplicationData(resetToDefaults);
            if (result.cloudAttempted) {
                SmartToast.success('تم مسح البيانات المحلية والسحابية');
            } else {
                SmartToast.success('تم مسح البيانات المحلية');
            }
        } catch {
            SmartToast.warning('تعذر إكمال المسح — راجع الاتصال وحاول مرة أخرى');
        } finally {
            setWipePhase('idle');
            setCountdown(0);
        }
    }, [resetToDefaults, waitCountdown, wipePhase]);

    return {
        wipePhase,
        countdown,
        cancelCountdown,
        requestFullWipe,
    };
}
