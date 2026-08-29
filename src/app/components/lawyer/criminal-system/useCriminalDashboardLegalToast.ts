import { useCallback, useEffect, useRef } from 'react';
import { useCriminalToastOrchestrator } from './orchestrators/useCriminalToastOrchestrator';

type ClaimOwnershipFn = (caseId: string) => string | null | undefined;

/**
 * toast قانوني مع مؤقّت تلقائي + تملّك إضبارة يتيمة عبر نفس مسار الإشعار.
 * يغلّف useCriminalToastOrchestrator ولا يستبدله.
 */
export function useCriminalDashboardLegalToast(
    caseId: string,
    claimCriminalCaseOwnership: ClaimOwnershipFn,
) {
    const { legalToast, setLegalToast } = useCriminalToastOrchestrator();
    const legalToastTimerRef = useRef<number | null>(null);

    const clearLegalToastTimer = useCallback(() => {
        if (legalToastTimerRef.current === null) return;
        window.clearTimeout(legalToastTimerRef.current);
        legalToastTimerRef.current = null;
    }, []);

    const showLegalToast = useCallback(
        (message: string, durationMs = 5000) => {
            setLegalToast(message);
            clearLegalToastTimer();
            if (!message || durationMs <= 0) return;
            legalToastTimerRef.current = window.setTimeout(() => {
                legalToastTimerRef.current = null;
                setLegalToast('');
            }, durationMs);
        },
        [clearLegalToastTimer, setLegalToast],
    );

    const handleClaimCaseOwnership = useCallback(() => {
        const err = claimCriminalCaseOwnership(caseId);
        if (err) showLegalToast(err);
        else showLegalToast('تم تملّك الإضبارة — يمكنك التعديل الآن.');
    }, [claimCriminalCaseOwnership, caseId, showLegalToast]);

    useEffect(() => () => clearLegalToastTimer(), [clearLegalToastTimer]);

    return { legalToast, setLegalToast, showLegalToast, handleClaimCaseOwnership };
}
