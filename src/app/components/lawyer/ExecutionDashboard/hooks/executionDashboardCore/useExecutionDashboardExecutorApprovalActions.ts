// @ts-nocheck
/** Phase C — callbacks قبول المنفذ للقرارات (مواعيد، قوة جبرية، حراس، مهام) */
import { useMemo, type Dispatch, type MutableRefObject, type SetStateAction } from 'react';
import type { ExecutionFile, TimelineEvent } from '@/app/types/execution';
import SecureStoreService from '@/app/services/SecureStoreService';
import { syncExecutionTimelineAppointment } from '@/app/services/calendarDossierSync';
import { patchExecutorDecisionRow } from '@/app/utils/executorSeizureDecisionQueue';
import { fieldVisitAppointmentStorageKey } from '@/app/utils/executorApprovalWorkflow';
import type { ExecutorApprovalActions } from '../../executionDashboardRuntimeChunkScope';

export type UseExecutionDashboardExecutorApprovalActionsParams = {
    executionData: ExecutionFile | null | undefined;
    executionId: string | undefined;
    file: ExecutionFile | null | undefined;
    currentFileId: string;
    isMaritalFurnitureClaim: boolean;
    nextTimelineId: () => string;
    timelineEventsRef: MutableRefObject<TimelineEvent[]>;
    persistExecutionMergeRef: MutableRefObject<((patch: Record<string, unknown>) => void) | null>;
    executionFileSnapshotRef: MutableRefObject<ExecutionFile | null | undefined>;
    showToast: (message: string, type?: string) => void;
    setShowDecisionsModal: (show: boolean) => void;
    setShowUnifiedExecutionModal: (show: boolean) => void;
    setUnifiedModalTab: Dispatch<SetStateAction<string>>;
    setFollowupExpandProcedureKey: Dispatch<SetStateAction<string | null>>;
    setCaseTasksPending: Dispatch<SetStateAction<Array<Record<string, unknown>>>>;
    setTimelineEvents: Dispatch<SetStateAction<TimelineEvent[]>>;
    setExecutionReportPrompt: Dispatch<
        SetStateAction<{ onConfirm: () => void } | null>
    >;
    setJudicialCustodianModalCtx: Dispatch<
        SetStateAction<{ requestTitle: string; onSaved?: () => void } | null>
    >;
    setJudicialCustodianModalOpen: (open: boolean) => void;
    setCaseNotesLog: Dispatch<SetStateAction<Array<Record<string, unknown>>>>;
};

export function useExecutionDashboardExecutorApprovalActions(
    params: UseExecutionDashboardExecutorApprovalActionsParams,
): ExecutorApprovalActions {
    const {
        executionData,
        executionId,
        file,
        currentFileId,
        isMaritalFurnitureClaim,
        nextTimelineId,
        timelineEventsRef,
        persistExecutionMergeRef,
        executionFileSnapshotRef,
        showToast,
        setShowDecisionsModal,
        setShowUnifiedExecutionModal,
        setUnifiedModalTab,
        setFollowupExpandProcedureKey,
        setCaseTasksPending,
        setTimelineEvents,
        setExecutionReportPrompt,
        setJudicialCustodianModalCtx,
        setJudicialCustodianModalOpen,
        setCaseNotesLog,
    } = params;

    return useMemo(
        () => ({
            openScheduledDateModal: ({ requestTitle }) => {
                setShowDecisionsModal(false);
                setShowUnifiedExecutionModal(true);
                setUnifiedModalTab('coercive');
                setFollowupExpandProcedureKey(
                    isMaritalFurnitureClaim ? 'marital_furniture_delivery' : 'field_visit',
                );
                showToast(
                    isMaritalFurnitureClaim
                        ? `تمت موافقة المنفذ — ثبّت موعد التسليم من بطاقة «تسليم أثاث».\n(${requestTitle})`
                        : `تمت موافقة المنفذ — أكمل تسجيل الموعد من «الإجراءات الجبرية» داخل نفس البطاقة.\n(${requestTitle})`,
                    'info',
                );
            },
            openPoliceAssistanceModal: ({ decisionId, requestTitle }) => {
                void decisionId;
                void requestTitle;
                setShowDecisionsModal(false);
                setShowUnifiedExecutionModal(true);
                setUnifiedModalTab('coercive');
                setFollowupExpandProcedureKey('police');
                showToast(
                    'تمت الموافقة — أكمل بيانات القوة الإجرائية من البطاقة المنسدلة في الإجراءات الجبرية.',
                    'info',
                );
            },
            showToast,
            appendDossierTask: (task) => {
                const now = new Date().toISOString();
                const taskId = nextTimelineId();
                setCaseTasksPending((prev) => [
                    ...prev,
                    {
                        id: taskId,
                        title: task.title,
                        body: task.body,
                        dueDate: task.dueDate,
                        createdAt: now,
                    },
                ]);
                setTimelineEvents((prev) => [
                    {
                        id: nextTimelineId(),
                        type: 'other',
                        date: now,
                        timestamp: now,
                        title: `📌 مهمة قيد الإنجاز: ${task.title}`,
                        description: `${task.body}\n\n📅 تاريخ الإنجاز المطلوب: ${new Date(task.dueDate).toLocaleDateString('ar-EG')}`,
                        source: 'القرارات والطعون — قبول المنفذ',
                    },
                    ...prev,
                ]);
            },
            getFieldVisitDeadlineIso: () => {
                const did = String(executionData?.id ?? executionId ?? '');
                try {
                    const v = SecureStoreService.getItemSync(fieldVisitAppointmentStorageKey(did));
                    if (v) return v;
                } catch {
                    /* ignore */
                }
                const hit = timelineEventsRef.current.find(
                    (e) =>
                        e.type === 'appointment' &&
                        typeof e.source === 'string' &&
                        e.source.includes('موعد ميداني'),
                );
                return hit?.date ?? null;
            },
            promptOpenExecutionReport: (onConfirm) => {
                setExecutionReportPrompt({ onConfirm });
            },
            pushCalendarAppointment: ({ dossierId, decisionId, purpose, eventIso, recordedAt }) => {
                const newEvent: TimelineEvent = {
                    id: nextTimelineId(),
                    type: 'appointment',
                    date: eventIso,
                    timestamp: recordedAt,
                    title: `📅 ${purpose}`,
                    description: `موعد معتمد من قبول المنفذ — مرجع القرار: ${decisionId}`,
                    source: 'القرارات والطعون — موعد ميداني',
                };
                setTimelineEvents((prev) => [newEvent, ...prev]);
                syncExecutionTimelineAppointment({
                    executionId: currentFileId,
                    event: newEvent,
                    caseNo:
                        String(executionData?.fileNumber ?? executionData?.caseNo ?? file?.fileNumber ?? '').trim() ||
                        undefined,
                    clientName:
                        String(
                            executionData?.creditors?.[0]?.name ??
                                executionData?.clientName ??
                                file?.creditors?.[0]?.name ??
                                '',
                        ).trim() ||
                        undefined,
                });
                showToast('تم ربط الموعد بالسجل الزمني', 'success');
                void dossierId;
            },
            patchDecision: (decisionId, patch) => {
                patchExecutorDecisionRow(executionData?.id ?? executionId, decisionId, patch);
            },
            openBreakInventoryFurnitureModal: ({ decisionId, requestTitle, onSaved, onFinalize }) => {
                void decisionId;
                void requestTitle;
                void onSaved;
                void onFinalize;
                setShowDecisionsModal(false);
                setShowUnifiedExecutionModal(true);
                setUnifiedModalTab('coercive');
                setFollowupExpandProcedureKey(
                    isMaritalFurnitureClaim ? 'marital_furniture_delivery' : 'break_inventory',
                );
                showToast(
                    isMaritalFurnitureClaim
                        ? 'تمت الموافقة — أكمل جرد التسليم من بطاقة «تسليم أثاث».'
                        : 'تمت الموافقة — أكمل محضر الجرد من البطاقة المنسدلة في الإجراءات الجبرية.',
                    'info',
                );
            },
            openJudicialCustodianModal: ({ decisionId, requestTitle, onSaved }) => {
                void decisionId;
                setShowDecisionsModal(false);
                setJudicialCustodianModalCtx({ requestTitle, onSaved });
                setJudicialCustodianModalOpen(true);
            },
            appendCaseNote: ({ title, body }) => {
                const now = new Date().toISOString();
                const id = `note_${Date.now()}`;
                setCaseNotesLog((prev) => {
                    const next = [{ id, title, body, createdAt: now }, ...prev];
                    queueMicrotask(() => {
                        persistExecutionMergeRef.current?.({ caseNotesLog: next });
                    });
                    return next;
                });
            },
            persistJudicialCustodianDetails: ({ decisionId, fullName, salary, recordId }) => {
                const savedAt = new Date().toISOString();
                queueMicrotask(() => {
                    const snap = executionFileSnapshotRef.current;
                    const prevArr = Array.isArray(snap?.eviction_judicial_custodians)
                        ? [...(snap!.eviction_judicial_custodians as NonNullable<
                              ExecutionFile['eviction_judicial_custodians']
                          >)]
                        : [];
                    const legacy = snap?.eviction_judicial_custodian;
                    let list = prevArr;
                    if (!list.length && legacy?.fullName?.trim() && legacy.savedAt) {
                        list = [
                            {
                                id: 'legacy_custodian',
                                fullName: legacy.fullName,
                                salary: legacy.salary,
                                decisionId: legacy.decisionId,
                                savedAt: legacy.savedAt,
                            },
                        ];
                    }
                    let next;
                    if (recordId) {
                        next = list.map((c) =>
                            String(c.id) === String(recordId)
                                ? {
                                      ...c,
                                      fullName,
                                      salary,
                                      decisionId: decisionId || c.decisionId,
                                      savedAt,
                                  }
                                : c,
                        );
                    } else {
                        next = [
                            {
                                id: `cust_${Date.now()}`,
                                fullName,
                                salary,
                                decisionId,
                                savedAt,
                            },
                            ...list,
                        ];
                    }
                    persistExecutionMergeRef.current?.({
                        eviction_judicial_custodians: next,
                        eviction_judicial_custodian: null,
                    });
                });
            },
        }),
        [
            executionData?.id,
            executionId,
            isMaritalFurnitureClaim,
            nextTimelineId,
            setShowDecisionsModal,
            showToast,
            currentFileId,
            file,
            timelineEventsRef,
            persistExecutionMergeRef,
            executionFileSnapshotRef,
            setShowUnifiedExecutionModal,
            setUnifiedModalTab,
            setFollowupExpandProcedureKey,
            setCaseTasksPending,
            setTimelineEvents,
            setExecutionReportPrompt,
            setJudicialCustodianModalCtx,
            setJudicialCustodianModalOpen,
            setCaseNotesLog,
        ],
    );
}
