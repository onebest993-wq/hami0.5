import { useCallback, useEffect, useRef, useState } from 'react';
import { resolveDecisionsModalBootState } from '@/app/utils/decisionsModalBoot';

export type UseExecutionDecisionsModalControllerParams = {
    setShowDecisionsModal: (show: boolean) => void;
    showDecisionsModal: boolean;
};

/** boot state + reload epoch + فتح modal القرارات من أحداث النافذة */
export function useExecutionDecisionsModalController({
    setShowDecisionsModal,
    showDecisionsModal,
}: UseExecutionDecisionsModalControllerParams) {
    const [decisionsReloadEpoch, setDecisionsReloadEpoch] = useState(0);
    const [decisionsModalBootHubTab, setDecisionsModalBootHubTab] = useState<'appeals' | null>(null);
    const [decisionsModalBootListTab, setDecisionsModalBootListTab] = useState<
        'current' | 'previous' | 'appeals' | null
    >(null);
    const [decisionsModalScrollToDecisionId, setDecisionsModalScrollToDecisionId] = useState<string | null>(
        null,
    );
    const [appealsModalScrollToDecisionId, setAppealsModalScrollToDecisionId] = useState<string | null>(
        null,
    );
    const reloadDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const clearDecisionsModalBootState = useCallback(() => {
        setDecisionsModalBootHubTab(null);
        setDecisionsModalBootListTab(null);
        setDecisionsModalScrollToDecisionId(null);
        setAppealsModalScrollToDecisionId(null);
    }, []);

    const openDecisionsModalWithBoot = useCallback(
        (opts?: { tab?: 'current' | 'previous' | 'appeals'; decisionId?: string | null }) => {
            const boot = resolveDecisionsModalBootState(opts);
            setDecisionsModalBootHubTab(boot.hubTab);
            setDecisionsModalBootListTab(boot.listTab);
            setDecisionsModalScrollToDecisionId(boot.scrollDecisionId);
            setAppealsModalScrollToDecisionId(boot.scrollAppealId);
            setShowDecisionsModal(true);
        },
        [setShowDecisionsModal],
    );

    useEffect(() => {
        // البتّ (موافقة/رفض المنفذ) يحدث والـ modal مفتوح — إسقاط الحدث هنا كان يجمّد
        // كل الحالات المشتقة من epoch (حالة طلب الإحلال، عناوين قائمة ⋮، مزامنة الملف)
        // إلى الأبد حتى بعد إغلاق الـ modal. نُرحّل دوماً مع debounce يلمّ الدفعات.
        const bump = () => {
            if (reloadDebounceRef.current) clearTimeout(reloadDebounceRef.current);
            reloadDebounceRef.current = setTimeout(() => {
                reloadDebounceRef.current = null;
                setDecisionsReloadEpoch((n) => n + 1);
            }, 80);
        };
        window.addEventListener('hami-decisions-reload', bump);
        window.addEventListener('hami-execution-decision-outcome', bump);
        return () => {
            if (reloadDebounceRef.current) {
                clearTimeout(reloadDebounceRef.current);
                reloadDebounceRef.current = null;
            }
            window.removeEventListener('hami-decisions-reload', bump);
            window.removeEventListener('hami-execution-decision-outcome', bump);
        };
    }, []);

    useEffect(() => {
        if (showDecisionsModal) return;
        clearDecisionsModalBootState();
    }, [showDecisionsModal, clearDecisionsModalBootState]);

    return {
        decisionsReloadEpoch,
        setDecisionsReloadEpoch,
        decisionsModalBootHubTab,
        setDecisionsModalBootHubTab,
        decisionsModalBootListTab,
        setDecisionsModalBootListTab,
        decisionsModalScrollToDecisionId,
        setDecisionsModalScrollToDecisionId,
        appealsModalScrollToDecisionId,
        setAppealsModalScrollToDecisionId,
        clearDecisionsModalBootState,
        openDecisionsModalWithBoot,
    };
}
