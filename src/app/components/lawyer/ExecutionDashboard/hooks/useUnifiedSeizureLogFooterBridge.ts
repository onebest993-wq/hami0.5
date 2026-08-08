import { useEffect, useRef } from 'react';
import type { MutableRefObject } from 'react';
import {
    runUnifiedSeizureLogFooterNavigation,
    UNIFIED_SEIZURE_LOG_FOOTER_ACTION_EVENT,
    type UnifiedSeizureLogFooterActionDetail,
} from '@/app/components/lawyer/ExecutionDashboard/utils/unifiedSeizureLogFooterNavigation';
import type { OpenFollowupModalPersistedFn } from '@/app/components/lawyer/ExecutionDashboard/utils/followupModalOpen';

type UseUnifiedSeizureLogFooterBridgeParams = {
    openFollowupModalPersisted?: OpenFollowupModalPersistedFn | null;
    setShowUnifiedExecutionModal?: (show: boolean) => void;
    openSeizureRequestsTabRef?: MutableRefObject<(() => void) | null>;
};

/**
 * يربط أزرار سجل الحجز الموحّد بمحضر المتابعة وتبويب طلبات الحجز حتى عند فتح السجل فقط.
 */
export function useUnifiedSeizureLogFooterBridge(params: UseUnifiedSeizureLogFooterBridgeParams) {
    const paramsRef = useRef(params);
    paramsRef.current = params;

    useEffect(() => {
        const handler = (e: Event) => {
            const ce = e as CustomEvent<UnifiedSeizureLogFooterActionDetail>;
            const detail = ce.detail;
            if (!detail?.executionId || !detail?.decisionId || !detail?.kind) return;
            const current = paramsRef.current;
            runUnifiedSeizureLogFooterNavigation(detail, {
                setShowUnifiedExecutionModal: current.setShowUnifiedExecutionModal,
                openSeizureRequestsTabRef: current.openSeizureRequestsTabRef,
            }, current.openFollowupModalPersisted);
        };

        window.addEventListener(UNIFIED_SEIZURE_LOG_FOOTER_ACTION_EVENT, handler as EventListener);
        return () =>
            window.removeEventListener(UNIFIED_SEIZURE_LOG_FOOTER_ACTION_EVENT, handler as EventListener);
    }, []);
}
