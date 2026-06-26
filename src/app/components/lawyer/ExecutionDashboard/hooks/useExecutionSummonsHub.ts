import { useCallback, useEffect, useState, startTransition } from 'react';

import type { FollowupUnifiedModalTab } from '../followupModalTabTypes';

export type SummonsHubMainTab = 'tabligh' | 'taklif' | 'nashr' | 'guarantor' | null;

export type UseExecutionSummonsHubParams = {
    executionDashboardFileId: string | null;
    setExecutionModal: (
        key: 'showUnifiedExecutionModal' | 'showCoerciveModal' | 'showUnifiedSummonsModal',
        show: boolean,
    ) => void;
    setUnifiedModalTab: (tab: FollowupUnifiedModalTab) => void;
};

/** مركز الاستدعاءات الموحّد + فتح تبويب الحجز */
export function useExecutionSummonsHub({
    executionDashboardFileId,
    setExecutionModal,
    setUnifiedModalTab,
}: UseExecutionSummonsHubParams) {
    const [summonsHubInitialMainTab, setSummonsHubInitialMainTab] = useState<SummonsHubMainTab>(null);
    const [summonsContextDebtorKey, setSummonsContextDebtorKey] = useState<string | null>(null);

    useEffect(() => {
        setSummonsContextDebtorKey(null);
        setSummonsHubInitialMainTab(null);
    }, [executionDashboardFileId]);

    const openExecutionSeizuresTab = useCallback(() => {
        startTransition(() => {
            setUnifiedModalTab('coercive');
            setExecutionModal('showUnifiedExecutionModal', true);
            setExecutionModal('showCoerciveModal', false);
            setExecutionModal('showUnifiedSummonsModal', false);
            setSummonsHubInitialMainTab(null);
            setSummonsContextDebtorKey(null);
        });
    }, [setExecutionModal, setUnifiedModalTab]);

    return {
        summonsHubInitialMainTab,
        setSummonsHubInitialMainTab,
        summonsContextDebtorKey,
        setSummonsContextDebtorKey,
        openExecutionSeizuresTab,
    };
}
