import { useCallback, useEffect, useRef, useState } from 'react';
import { SmartDialog } from '@/app/components/ui/SmartDialog';
import { SmartToast } from '@/app/components/ui/SmartToast';
import { wipeAllApplicationData } from '@/app/services/settings/applicationWipe';

const COUNTDOWN_SECONDS = 10;

export function useLocalDataClear(resetToDefaults: () => void) {
    const countdownTimerRef = useRef<number | null>(null);
    const cancelledRef = useRef(false);
    const [wipePhase, setWipePhase] = useState<'idle' | 'countdown' | 'wiping'>('idle');
    const [countdown, setCountdown] = useState(0);

    useEffect(() => {
        return () => {
            if (countdownTimerRef.current) window.clearInterval(countdownTimerRef.current);
        };
    }, []);

    const cancelCountdown = useCallback(() => {
        cancelledRef.current = true;
        if (countdownTimerRef.current) {
            window.clearInterval(countdownTimerRef.current);
            countdownTimerRef.current = null;
        }
        setWipePhase('idle');
        setCountdown(0);
        SmartToast.info('تم إلغاء المسح');
    }, []);

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
