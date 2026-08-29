import { useCallback } from 'react';
import { SmartDialog } from '@/app/components/ui/SmartDialog';
import { SmartToast } from '@/app/components/ui/SmartToast';
import { wipeAllApplicationData } from '@/app/services/settings/applicationWipe';
import {
    mintSensitiveConfirmChallenge,
    verifySensitiveSettingsAction,
} from '@/app/services/settings/verifySensitiveSettingsAction';
import { useWipeCountdown } from './useWipeCountdown';

const WIPE_CONFIRM_PHRASE = 'مسح نهائي';

export function useLocalDataClear(
    resetToDefaults: () => void,
    onLogout?: (options?: { skipLocalPurge?: boolean }) => void | Promise<void>,
) {
    const {
        COUNTDOWN_SECONDS,
        wipePhase,
        setWipePhase,
        countdown,
        setCountdown,
        cancelCountdown,
        waitCountdown,
        sectionActiveRef,
        mountedRef,
    } = useWipeCountdown();

    const requestFullWipe = useCallback(async () => {
        if (wipePhase !== 'idle' || !sectionActiveRef.current) return;

        const okFirst = await SmartDialog.confirm(
            'سيتم حذف جميع بيانات التطبيق محلياً وسحابياً: القضايا، الملاحظات، المخزن، التنفيذ، التنبيهات، والإعدادات. لا يمكن التراجع عن هذا الإجراء.',
            { title: 'مسح كل البيانات؟', confirmText: 'متابعة', cancelText: 'إلغاء' },
        );
        if (!okFirst) return;
        if (!sectionActiveRef.current) return;

        const challenge = mintSensitiveConfirmChallenge(WIPE_CONFIRM_PHRASE);
        const verified = await verifySensitiveSettingsAction({
            confirmPhrase: challenge.confirmPhrase,
            title: 'تحقق قبل المسح',
            promptMessage: challenge.promptMessage,
        });
        if (!verified) return;
        if (!sectionActiveRef.current) return;

        SmartToast.warning(`انتظر ${COUNTDOWN_SECONDS} ثوانٍ قبل التأكيد النهائي`);
        const completed = await waitCountdown();
        if (!completed) {
            if (mountedRef.current) setWipePhase('idle');
            return;
        }
        if (!sectionActiveRef.current) return;

        const okFinal = await SmartDialog.confirm(
            'هذا تأكيد نهائي. سيتم مسح كل شيء في التطبيق — محلياً وسحابياً — الآن.',
            { title: 'التأكيد النهائي', confirmText: 'مسح الآن', cancelText: 'إلغاء' },
        );
        if (!okFinal) {
            if (mountedRef.current) setWipePhase('idle');
            return;
        }
        if (!sectionActiveRef.current) return;

        setWipePhase('wiping');
        try {
            const result = await wipeAllApplicationData(resetToDefaults, onLogout);
            if (result.cloudAttempted && result.cloudCompleted && result.localCompleted) {
                SmartToast.success('تم مسح البيانات المحلية والسحابية');
            } else if (!result.cloudAttempted && result.localCompleted) {
                SmartToast.success('تم مسح البيانات المحلية');
            } else {
                SmartToast.warning('لم يكتمل المسح — احتُفظ بحالة قابلة لإعادة المحاولة');
            }
        } catch {
            SmartToast.warning('تعذر إكمال المسح — راجع الاتصال وحاول مرة أخرى');
        } finally {
            if (mountedRef.current) {
                setWipePhase('idle');
                setCountdown(0);
            }
        }
    }, [
        COUNTDOWN_SECONDS,
        mountedRef,
        onLogout,
        resetToDefaults,
        sectionActiveRef,
        setCountdown,
        setWipePhase,
        waitCountdown,
        wipePhase,
    ]);

    return {
        wipePhase,
        countdown,
        cancelCountdown,
        requestFullWipe,
    };
}
