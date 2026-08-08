/** hami-open-decisions-modal — يحافظ على openDecisionsModalWithBoot (موجة 13) */
import { useEffect } from 'react';
import { matchesDecisionsModalOpenTarget } from '@/app/components/lawyer/DecisionsAndAppealsEngine/engine/resolveDecisionsStorageExecutionId';
import type { ExecutionDecisionsOrchestratorSlice } from '../../orchestrators/executionDecisionsOrchestratorTypes';

export function useExecutionDashboardOpenDecisionsModalBridge({
    executionDataId,
    executionId,
    decisionsStorageExecutionId,
    executionData,
    setShowExecutionFinancialHub,
    setShowUnifiedExecutionModal,
    setShowUnifiedSummonsModal,
    setShowNotesModal,
    setShowDocumentsModal,
    setShowAppointmentModal,
    setShowTimelineModal,
    setShowNotificationModal,
    openDecisionsModalWithBoot,
}: {
    executionDataId: string | undefined;
    executionId: string | undefined;
    decisionsStorageExecutionId?: string | undefined;
    executionData?: Record<string, unknown> | null;
    setShowExecutionFinancialHub: (show: boolean) => void;
    setShowUnifiedExecutionModal: (show: boolean) => void;
    setShowUnifiedSummonsModal: (show: boolean) => void;
    setShowNotesModal: (show: boolean) => void;
    setShowDocumentsModal: (show: boolean) => void;
    setShowAppointmentModal: (show: boolean) => void;
    setShowTimelineModal: (show: boolean) => void;
    setShowNotificationModal: (show: boolean) => void;
    openDecisionsModalWithBoot: ExecutionDecisionsOrchestratorSlice['openDecisionsModalWithBoot'];
}) {
    useEffect(() => {
        const handler = (e: Event) => {
            const ce = e as CustomEvent<{ executionId?: string; decisionId?: string; tab?: string }>;
            if (
                !matchesDecisionsModalOpenTarget(ce.detail?.executionId, {
                    executionDataId,
                    executionId,
                    decisionsStorageExecutionId,
                    executionData,
                })
            ) {
                return;
            }
            setShowExecutionFinancialHub(false);
            setShowUnifiedExecutionModal(false);
            setShowUnifiedSummonsModal(false);
            setShowNotesModal(false);
            setShowDocumentsModal(false);
            setShowAppointmentModal(false);
            setShowTimelineModal(false);
            setShowNotificationModal(false);
            const tabRaw = String(ce.detail?.tab || '').trim();
            const tab =
                tabRaw === 'current' || tabRaw === 'previous' || tabRaw === 'appeals'
                    ? tabRaw
                    : undefined;
            const did = String(ce.detail?.decisionId || '').trim() || null;
            openDecisionsModalWithBoot(
                tab || did ? { tab: tab ?? undefined, decisionId: did } : undefined,
            );
        };
        window.addEventListener('hami-open-decisions-modal', handler as EventListener);
        return () => window.removeEventListener('hami-open-decisions-modal', handler as EventListener);
    }, [
        executionDataId,
        executionId,
        decisionsStorageExecutionId,
        executionData,
        setShowExecutionFinancialHub,
        setShowUnifiedExecutionModal,
        setShowUnifiedSummonsModal,
        setShowNotesModal,
        setShowDocumentsModal,
        setShowAppointmentModal,
        setShowTimelineModal,
        setShowNotificationModal,
        openDecisionsModalWithBoot,
    ]);
}
