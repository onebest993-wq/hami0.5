// @ts-nocheck
/** Phase C — مهلة التخلية السكنية + إكمال قرارات المنفذ */
import { useCallback, useMemo, type Dispatch, type MutableRefObject, type SetStateAction } from 'react';
import type { ExecutionFile, TimelineEvent } from '@/app/types/execution';
import SecureStoreService from '@/app/services/SecureStoreService';
import { syncExecutionTimelineAppointment } from '@/app/services/calendarDossierSync';
import { patchExecutorDecisionRow, readExecutorDecisionsArray } from '@/app/utils/executorSeizureDecisionQueue';
import { stripResidentialGraceTimelineEvents } from '@/app/utils/residentialGraceTimeline';
import {
    fieldVisitAppointmentStorageKey,
    inferExecutorApprovalDecisionType,
} from '@/app/utils/executorApprovalWorkflow';
import { evictionInclusiveCalendarDays, evictionLocalYmdToday } from '@/app/components/lawyer/ExecutionDashboard/helpers';
import {
    openFollowupCoerciveModal,
    type OpenFollowupModalPersistedFn,
} from '../../utils/followupModalOpen';

export type UseExecutionDashboardEvictionResidentialGraceHandlersParams = {
    graceModalAllowResave: boolean;
    residentialGracePeriodSaved: boolean;
    evictionProcedureLocked: boolean;
    evictionVacateDeadlineLocal: string | null | undefined;
    evictionVacateDraft: string;
    evictionResidentialGracePeriodStart: string | null | undefined;
    graceModalStartYmd: string;
    graceModalEndYmd: string;
    isResidentialVacateGraceFinished: boolean;
    residentialVacateDeadlineMaxIso: string | null | undefined;
    timelineEvents: TimelineEvent[];
    timelineEventsRef: MutableRefObject<TimelineEvent[]>;
    caseTasksPendingRef: MutableRefObject<Array<{ id: string; title?: string; body?: string }>>;
    decisionsStorageExecutionId: string | undefined;
    executionId: string | undefined;
    executionData: ExecutionFile | null | undefined;
    file: ExecutionFile | null | undefined;
    currentFileId: string;
    evictionGraceDecisionId: string | null;
    executorApprovalActions: Record<string, (...args: unknown[]) => unknown>;
    openBreakInventoryCompletion: (
        decisionId: string,
        actions: Record<string, unknown>,
        requestTitle: string,
    ) => void;
    openJudicialCustodianCompletion: (
        decisionId: string,
        actions: Record<string, unknown>,
        requestTitle: string,
    ) => void;
    nextTimelineId: () => string;
    persistExecutionMerge: (patch: Record<string, unknown>) => void;
    showToast: (message: string, type?: string, opts?: Record<string, unknown>) => void;
    setGraceModalEndYmd: Dispatch<SetStateAction<string>>;
    setGraceModalStartYmd: Dispatch<SetStateAction<string>>;
    setGraceModalAllowResave: Dispatch<SetStateAction<boolean>>;
    setShowEvictionResidentialGraceModal: (show: boolean) => void;
    setEvictionGraceDecisionId: Dispatch<SetStateAction<string | null>>;
    setEvictionVacateDeadlineLocal: Dispatch<SetStateAction<string>>;
    setEvictionVacateDraft: Dispatch<SetStateAction<string>>;
    setEvictionResidentialGracePeriodStart: Dispatch<SetStateAction<string | null>>;
    setEvictionExecutorVacateGrantApproved: Dispatch<SetStateAction<boolean>>;
    setEvictionResidentialGraceManuallyEndedAt: Dispatch<SetStateAction<string | null>>;
    setTimelineEvents: Dispatch<SetStateAction<TimelineEvent[]>>;
    setCaseTasksPending: Dispatch<SetStateAction<Array<{ id: string; title?: string; body?: string }>>>;
    setShowDecisionsModal: (show: boolean) => void;
    setDecisionsModalBootListTab: Dispatch<SetStateAction<string>>;
    setDecisionsModalScrollToDecisionId: Dispatch<SetStateAction<string | null>>;
    setPoliceAssistanceDecisionId: Dispatch<SetStateAction<string | null>>;
    setPoliceAssistanceRequestTitle: Dispatch<SetStateAction<string>>;
    setPoliceAssistanceAgencyDraft: Dispatch<SetStateAction<string>>;
    setPoliceAssistanceModalOpen: (open: boolean) => void;
    openFollowupModalPersisted?: OpenFollowupModalPersistedFn;
    setShowUnifiedExecutionModal: (show: boolean) => void;
    setUnifiedModalTab: Dispatch<SetStateAction<string>>;
};

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
            const primaryKey = String(decisionsStorageExecutionId ?? '').trim();
            const altKey = String(executionId ?? '').trim();
            const did = String(decisionId).trim();
            if (!did) return;

            const rowsPrimary = readExecutorDecisionsArray(primaryKey) as Array<Record<string, unknown>>;
            let keyUsed = primaryKey;
            let row = rowsPrimary.find((r) => String((r as { id?: string }).id || '').trim() === did);
            if (!row && altKey && altKey !== primaryKey) {
                const rowsAlt = readExecutorDecisionsArray(altKey) as Array<Record<string, unknown>>;
                row = rowsAlt.find((r) => String((r as { id?: string }).id || '').trim() === did);
                if (row) keyUsed = altKey;
            }
            if (!row) return;
            const branch = inferExecutorApprovalDecisionType(row as Record<string, unknown>);
            const requestTitle = String((row as { title?: string }).title || '').trim() || 'طلب';
            const dossierId = keyUsed;

            const openDecisionCardFallback = () => {
                setShowDecisionsModal(true);
                setDecisionsModalBootListTab('previous');
                setDecisionsModalScrollToDecisionId(did);
            };

            if (branch === 'Field Visit Date') {
                executorApprovalActions.openScheduledDateModal({
                    decisionId,
                    requestTitle,
                    onSaved: (payload: { eventIso: string; displayAr: string }) => {
                        executorApprovalActions.pushCalendarAppointment({
                            dossierId,
                            decisionId,
                            purpose: requestTitle,
                            eventIso: payload.eventIso,
                            recordedAt: new Date().toISOString(),
                        });
                        executorApprovalActions.patchDecision(decisionId, {
                            executorScheduleLabel: `مجدول: ${payload.displayAr}`,
                        });
                        try {
                            SecureStoreService.setItemSync(
                                fieldVisitAppointmentStorageKey(dossierId),
                                payload.eventIso,
                            );
                        } catch {
                            /* ignore */
                        }
                    },
                });
                return;
            }

            if (branch === 'Grace Period') {
                setShowDecisionsModal(false);
                setEvictionGraceDecisionId(decisionId);
                openEvictionResidentialGraceModal();
                return;
            }

            if (branch === 'Police Assistance Request') {
                setShowDecisionsModal(false);
                setPoliceAssistanceDecisionId(decisionId);
                setPoliceAssistanceRequestTitle(requestTitle);
                setPoliceAssistanceAgencyDraft(
                    String((row as { policeAssistanceAgency?: string }).policeAssistanceAgency || '').trim(),
                );
                setPoliceAssistanceModalOpen(true);
                return;
            }

            if (branch === 'Lock Breaking & Inventory') {
                setShowDecisionsModal(false);
                openBreakInventoryCompletion(decisionId, executorApprovalActions, requestTitle);
                return;
            }

            if (branch === 'Judicial Custodian') {
                setShowDecisionsModal(false);
                openJudicialCustodianCompletion(decisionId, executorApprovalActions, requestTitle);
                return;
            }

            if (branch === 'Eviction') {
                setShowDecisionsModal(false);
                executorApprovalActions.promptOpenExecutionReport(() => {
                    /* handled by confirm modal */
                });
                return;
            }

            if (branch === 'Residential Grace Early End') {
                openFollowupCoerciveModal(openFollowupModalPersisted, {
                    setShowUnifiedExecutionModal,
                    setUnifiedModalTab,
                });
                showToast('تمت موافقة المنفذ — أكمل من بطاقة الطلب في «محضر المتابعة».', 'info', {
                    decisionsLink: true,
                    decisionId: did,
                    decisionsTab: 'previous',
                });
                return;
            }

            openDecisionCardFallback();
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
        if (
            !graceModalAllowResave &&
            evictionResidentialGracePeriodStart &&
            /^\d{4}-\d{2}-\d{2}$/.test(evictionResidentialGracePeriodStart) &&
            evictionVacateDeadlineLocal &&
            /^\d{4}-\d{2}-\d{2}$/.test(evictionVacateDeadlineLocal) &&
            !isResidentialVacateGraceFinished
        ) {
            showToast(
                'المهلة مسجّلة. لإعادة ضبط المدة أو حفظ مهلة جديدة يُنفَّذ أولاً إنهاء دورة المهلة.',
                'warning',
            );
            return;
        }
        const start = graceModalStartYmd.trim();
        const end = graceModalEndYmd.trim();
        if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end)) {
            showToast('اختر تاريخ بداية المهلة وتاريخ انتهائها بشكل صحيح.', 'warning');
            return;
        }
        if (start > end) {
            showToast('تاريخ البداية لا يجوز أن يتأخر عن تاريخ الانتهاء', 'warning');
            return;
        }
        if (residentialVacateDeadlineMaxIso && end > residentialVacateDeadlineMaxIso) {
            showToast(
                `لا يجوز تجاوز ${residentialVacateDeadlineMaxIso} (أقصى 90 يوماً تقويمياً بعد الإخبار)`,
                'warning',
            );
            return;
        }
        const days = evictionInclusiveCalendarDays(start, end);
        if (days <= 0) {
            showToast('تأكد من صحة المدة بين التاريخين', 'warning');
            return;
        }
        setEvictionVacateDeadlineLocal(end);
        setEvictionVacateDraft(end);
        setEvictionResidentialGracePeriodStart(start);
        setEvictionExecutorVacateGrantApproved(false);
        setEvictionResidentialGraceManuallyEndedAt(null);

        const now = new Date().toISOString();
        const day = now.slice(0, 10);
        const ev: TimelineEvent = {
            id: nextTimelineId(),
            type: 'eviction',
            title: '🏠 مهلة',
            description: `من ${start} إلى ${end} — ${days} يوماً تقويمياً`,
            date: day,
            timestamp: now,
            source: 'الإجراءات الجبرية — تخلية',
            metadata: {
                evictionResidentialGraceModal: true,
                graceStartYmd: start,
                graceEndYmd: end,
                graceDays: days,
            },
        };
        const appointmentEv: TimelineEvent = {
            id: nextTimelineId(),
            type: 'appointment',
            date: `${end}T12:00:00`,
            timestamp: now,
            title: '⏳ انتهاء المهلة',
            description: `المهلة ${days} يوماً (من ${start} إلى ${end})`,
            source: 'المهلة',
            metadata: {
                residentialGraceDeadlineAppointment: true,
                graceStartYmd: start,
                graceEndYmd: end,
                graceDays: days,
            },
        };
        const nextTimeline = [ev, appointmentEv, ...stripResidentialGraceTimelineEvents(timelineEvents)];
        setTimelineEvents(nextTimeline);
        syncExecutionTimelineAppointment({
            executionId: currentFileId,
            event: appointmentEv,
            caseNo:
                String(executionData?.fileNumber ?? executionData?.caseNo ?? file?.fileNumber ?? '').trim() ||
                undefined,
            clientName:
                String(
                    executionData?.creditors?.[0]?.name ??
                        executionData?.clientName ??
                        file?.creditors?.[0]?.name ??
                        '',
                ).trim() || undefined,
        });

        persistExecutionMerge({
            eviction_vacate_deadline: end,
            eviction_residential_grace_period_start: start,
            eviction_executor_vacate_grant_approved: false,
            eviction_residential_grace_manually_ended_at: null,
            timelineEvents: nextTimeline,
        });

        if (evictionGraceDecisionId) {
            patchExecutorDecisionRow(executionData?.id ?? executionId, evictionGraceDecisionId, {
                evictionGraceSavedAt: now,
                evictionGraceStartYmd: start,
                evictionGraceEndYmd: end,
                evictionGraceDays: days,
            });
            setEvictionGraceDecisionId(null);
        }

        setGraceModalAllowResave(false);
        setShowEvictionResidentialGraceModal(false);
        showToast(
            graceModalAllowResave
                ? 'تم تحديث المهلة.'
                : 'تم تسجيل المهلة — يُحدَّث السجل والمواعيد تلقائياً.',
            'success',
        );
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
        const nextTimeline = [
            ev,
            ...stripResidentialGraceTimelineEvents(timelineEventsRef.current),
        ];
        setEvictionResidentialGraceManuallyEndedAt(now);
        setCaseTasksPending(nextTasks);
        setTimelineEvents(nextTimeline);
        persistExecutionMerge({
            eviction_residential_grace_manually_ended_at: now,
            caseTasksPending: nextTasks,
            timelineEvents: nextTimeline,
        });
        showToast('تم إتمام المهلة', 'success');
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
