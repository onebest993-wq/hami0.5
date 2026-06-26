import { useEffect, useRef } from 'react';
import { getLocalTodayYmd } from '@/app/utils/executionStateMachine';
import { SPECIAL_REQUEST_MANUAL_MODE } from '@/app/components/lawyer/ExecutionDashboard/components/requestsTabConstants';
import type { FollowupUnifiedModalTab } from '../followupModalTabTypes';

type UseFollowupSpecialRequestInitParams = {
    showUnifiedExecutionModal: boolean;
    unifiedModalTab: FollowupUnifiedModalTab;
    setSpecialRequestTemplatePick: (mode: string) => void;
    setSpecialRequestContent: (value: string) => void;
    setSpecialRequestManualTitle: (value: string) => void;
    setSpecialRequestDate: (value: string) => void;
};

export function useFollowupSpecialRequestInit({
    showUnifiedExecutionModal,
    unifiedModalTab,
    setSpecialRequestTemplatePick,
    setSpecialRequestContent,
    setSpecialRequestManualTitle,
    setSpecialRequestDate,
}: UseFollowupSpecialRequestInitParams) {
    const initOnceRef = useRef(false);

    useEffect(() => {
        if (!showUnifiedExecutionModal) {
            initOnceRef.current = false;
            return;
        }
        if (unifiedModalTab !== 'special') return;
        if (initOnceRef.current) return;
        initOnceRef.current = true;
        setSpecialRequestTemplatePick(SPECIAL_REQUEST_MANUAL_MODE);
        setSpecialRequestContent('');
        setSpecialRequestManualTitle('');
        setSpecialRequestDate(getLocalTodayYmd());
    }, [
        showUnifiedExecutionModal,
        unifiedModalTab,
        setSpecialRequestContent,
        setSpecialRequestDate,
        setSpecialRequestManualTitle,
        setSpecialRequestTemplatePick,
    ]);
}
