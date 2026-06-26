import { useCallback, useEffect, useState } from 'react';
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
        const bump = () => {
            queueMicrotask(() => setDecisionsReloadEpoch((n) => n + 1));
        };
        window.addEventListener('hami-decisions-reload', bump);
        window.addEventListener('hami-execution-decision-outcome', bump);
        return () => {
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
