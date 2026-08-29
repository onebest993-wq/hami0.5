/** Phase C — مهلة التخلية السكنية + إكمال قرارات المنفذ */
import { useCallback, useMemo } from 'react';
import type { TimelineEvent } from '@/app/types/execution';
import { stripResidentialGraceTimelineEvents } from '@/app/utils/residentialGraceTimeline';
import { evictionLocalYmdToday } from '@/app/components/lawyer/ExecutionDashboard/helpers';
import { toastAfterExecutionPersist } from '../../helpers/toastAfterExecutionPersist';
import { runOpenEvictionExecutorCompletion } from './openEvictionExecutorCompletion';
import { submitEvictionResidentialGraceFromModal as runSubmitEvictionResidentialGraceFromModal } from './submitEvictionResidentialGraceFromModal';

export type { UseExecutionDashboardEvictionResidentialGraceHandlersParams } from './useExecutionDashboardEvictionResidentialGraceHandlers.types';
import type { UseExecutionDashboardEvictionResidentialGraceHandlersParams } from './useExecutionDashboardEvictionResidentialGraceHandlers.types';

export function useExecutionDashboardEvictionResidentialGraceHandlers({
    graceModalAllowResave,
    residentialGracePeriodSaved,
    evictionProcedureLocked,
    evictionVacateDeadlineLocal,
    evictionVacateDraft,
    evictionResidentialGracePeriodStart,
    graceModalStartYmd,
    graceModalEndYmd,
    isResidentialVacateGraceFinished,
    residentialVacateDeadlineMaxIso,
    timelineEvents,
    timelineEventsRef,
    caseTasksPendingRef,
    decisionsStorageExecutionId,
    executionId,
    executionData,
    file,
    currentFileId,
    evictionGraceDecisionId,
    executorApprovalActions,
    openBreakInventoryCompletion,
    openJudicialCustodianCompletion,
    nextTimelineId,
    persistExecutionMerge,
    showToast,
    setGraceModalEndYmd,
    setGraceModalStartYmd,
    setGraceModalAllowResave,
    setShowEvictionResidentialGraceModal,
    setEvictionGraceDecisionId,
    setEvictionVacateDeadlineLocal,
    setEvictionVacateDraft,
    setEvictionResidentialGracePeriodStart,
    setEvictionExecutorVacateGrantApproved,
    setEvictionResidentialGraceManuallyEndedAt,
    setTimelineEvents,
    setCaseTasksPending,
    setShowDecisionsModal,
    setDecisionsModalBootListTab,
    setDecisionsModalScrollToDecisionId,
    setPoliceAssistanceDecisionId,
    setPoliceAssistanceRequestTitle,
    setPoliceAssistanceAgencyDraft,
    setPoliceAssistanceModalOpen,
    openFollowupModalPersisted,
    setShowUnifiedExecutionModal,
    setUnifiedModalTab,
}: UseExecutionDashboardEvictionResidentialGraceHandlersParams) {
    const residentialGraceModalShowPrimarySave = useMemo(() => {
        if (graceModalAllowResave) return true;
        return !residentialGracePeriodSaved;
    }, [graceModalAllowResave, residentialGracePeriodSaved]);

    const openEvictionResidentialGraceModal = useCallback(
        (opts?: { edit?: boolean }) => {
            if (evictionProcedureLocked) {
                showToast('لا يمكن فتح المهلة — الإضبارة أو الإجراءات مقفلة.', 'warning');
                return;
            }
            const endFromState =
                evictionVacateDeadlineLocal && /^\d{4}-\d{2}-\d{2}$/.test(evictionVacateDeadlineLocal)
                    ? evictionVacateDeadlineLocal
                    : evictionVacateDraft.trim();
            setGraceModalEndYmd(/^\d{4}-\d{2}-\d{2}$/.test(endFromState) ? endFromState : '');
            setGraceModalStartYmd(evictionResidentialGracePeriodStart || evictionLocalYmdToday());
            setGraceModalAllowResave(Boolean(opts?.edit));
            setShowEvictionResidentialGraceModal(true);
        },
        [
            evictionProcedureLocked,
            evictionVacateDeadlineLocal,
            evictionVacateDraft,
            evictionResidentialGracePeriodStart,
            showToast,
            setGraceModalEndYmd,
            setGraceModalStartYmd,
            setGraceModalAllowResave,
            setShowEvictionResidentialGraceModal,
        ],
    );

    const openEvictionExecutorCompletion = useCallback(
        (decisionId: string) => {
            runOpenEvictionExecutorCompletion(
                {
                    decisionsStorageExecutionId,
                    executionId,
                    executorApprovalActions,
                    openBreakInventoryCompletion,
                    openJudicialCustodianCompletion,
                    openFollowupModalPersisted,
                    setShowUnifiedExecutionModal,
                    setUnifiedModalTab,
                    showToast,
                    setShowDecisionsModal,
                    setDecisionsModalBootListTab,
                    setDecisionsModalScrollToDecisionId,
                    setEvictionGraceDecisionId,
                    setPoliceAssistanceAgencyDraft,
                    setPoliceAssistanceDecisionId,
                    setPoliceAssistanceModalOpen,
                    setPoliceAssistanceRequestTitle,
                },
                decisionId,
                () => openEvictionResidentialGraceModal(),
            );
        },
        [
            decisionsStorageExecutionId,
            executionId,
            executorApprovalActions,
            openBreakInventoryCompletion,
            openEvictionResidentialGraceModal,
            openJudicialCustodianCompletion,
            setDecisionsModalBootListTab,
            setDecisionsModalScrollToDecisionId,
            setEvictionGraceDecisionId,
            setPoliceAssistanceAgencyDraft,
            setPoliceAssistanceDecisionId,
            setPoliceAssistanceModalOpen,
            setPoliceAssistanceRequestTitle,
            setShowDecisionsModal,
            openFollowupModalPersisted,
            setShowUnifiedExecutionModal,
            setUnifiedModalTab,
            showToast,
        ],
    );

    const submitEvictionResidentialGraceFromModal = useCallback(() => {
        runSubmitEvictionResidentialGraceFromModal({
            graceModalAllowResave,
            graceModalStartYmd,
            graceModalEndYmd,
            evictionResidentialGracePeriodStart,
            evictionVacateDeadlineLocal,
            isResidentialVacateGraceFinished,
            residentialVacateDeadlineMaxIso,
            showToast,
            nextTimelineId,
            timelineEvents,
            persistExecutionMerge,
            executionData,
            file,
            evictionGraceDecisionId,
            executionId,
            currentFileId,
            setEvictionVacateDeadlineLocal,
            setEvictionVacateDraft,
            setEvictionResidentialGracePeriodStart,
            setEvictionExecutorVacateGrantApproved,
            setEvictionResidentialGraceManuallyEndedAt,
            setTimelineEvents,
            setEvictionGraceDecisionId,
            setGraceModalAllowResave,
            setShowEvictionResidentialGraceModal,
        });
    }, [
        graceModalAllowResave,
        graceModalStartYmd,
        graceModalEndYmd,
        evictionResidentialGracePeriodStart,
        evictionVacateDeadlineLocal,
        isResidentialVacateGraceFinished,
        residentialVacateDeadlineMaxIso,
        showToast,
        nextTimelineId,
        timelineEvents,
        persistExecutionMerge,
        executionData,
        file,
        evictionGraceDecisionId,
        executionId,
        currentFileId,
        setEvictionVacateDeadlineLocal,
        setEvictionVacateDraft,
        setEvictionResidentialGracePeriodStart,
        setEvictionExecutorVacateGrantApproved,
        setEvictionResidentialGraceManuallyEndedAt,
        setTimelineEvents,
        setEvictionGraceDecisionId,
        setGraceModalAllowResave,
        setShowEvictionResidentialGraceModal,
    ]);

    const completeEvictionResidentialGrace = useCallback(() => {
        if (evictionProcedureLocked) {
            showToast('لا يمكن إتمام المهلة — الإضبارة أو الإجراءات مقفلة.', 'warning');
            return;
        }
        const now = new Date().toISOString();
        const nextTasks = (caseTasksPendingRef.current || []).filter(
            (t) => !String(t.id || '').startsWith('eviction-residential-grace-'),
        );
        const ev: TimelineEvent = {
            id: nextTimelineId(),
            type: 'eviction',
            date: now.slice(0, 10),
            timestamp: now,
            title: '✅ إتمام المهلة',
            description: 'تم إنهاء المهلة وإغلاق شارتها من البطاقة.',
            source: 'الإجراءات الجبرية — تخلية',
        };
        const nextTimeline = [ev, ...stripResidentialGraceTimelineEvents(timelineEventsRef.current)];
        setEvictionResidentialGraceManuallyEndedAt(now);
        setCaseTasksPending(nextTasks);
        setTimelineEvents(nextTimeline);
        toastAfterExecutionPersist(
            persistExecutionMerge({
                eviction_residential_grace_manually_ended_at: now,
                caseTasksPending: nextTasks,
                timelineEvents: nextTimeline,
            }),
            showToast,
            'تم إتمام المهلة',
        );
    }, [
        evictionProcedureLocked,
        nextTimelineId,
        persistExecutionMerge,
        showToast,
        caseTasksPendingRef,
        timelineEventsRef,
        setEvictionResidentialGraceManuallyEndedAt,
        setCaseTasksPending,
        setTimelineEvents,
    ]);

    return {
        residentialGraceModalShowPrimarySave,
        openEvictionResidentialGraceModal,
        openEvictionExecutorCompletion,
        submitEvictionResidentialGraceFromModal,
        completeEvictionResidentialGrace,
    };
}
