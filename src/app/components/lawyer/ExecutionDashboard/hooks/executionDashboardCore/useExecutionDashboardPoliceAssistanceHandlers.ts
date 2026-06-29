import { useCallback, type Dispatch, MutableRefObject, SetStateAction } from 'react';
import type { ExecutionFile, TimelineEvent } from '@/app/types/execution';
import { EVICTION_TIMELINE_ACTION_IDS } from '@/app/utils/executionModuleStrategies';
import { formatDateToLocalYmd } from '@/app/utils/executionStateMachine';
import { patchExecutorDecisionRowReliable } from '@/app/utils/executorSeizureDecisionQueue';
import type { ExecutorApprovalActions } from '../../executionDashboardRuntimeChunkScope';

export type PendingCaseTask = {
    id: string;
    title: string;
    body: string;
    dueDate: string;
    createdAt: string;
};

export type SavePoliceAssistanceEntryInput = {
    decisionId: string;
    agencyName: string;
    linkToTasks?: boolean;
};

export type RunSavePoliceAssistanceEntryParams = {
    input: SavePoliceAssistanceEntryInput;
    evictionProcedureLocked: boolean;
    storageId: string;
    executorApprovalActions: ExecutorApprovalActions;
    timelineEvents: TimelineEvent[];
    caseTasksPending: PendingCaseTask[];
    nextTimelineId: () => string;
    persistExecutionMerge: (patch: Record<string, unknown>) => void;
    showToast: (message: string, type?: string) => void;
    onSaved: (next: { timelineEvents: TimelineEvent[]; caseTasksPending: PendingCaseTask[] }) => void;
    resetModal: () => void;
};

export function runSavePoliceAssistanceEntry({
    input,
    evictionProcedureLocked,
    storageId,
    executorApprovalActions,
    timelineEvents,
    caseTasksPending,
    nextTimelineId,
    persistExecutionMerge,
    showToast,
    onSaved,
    resetModal,
}: RunSavePoliceAssistanceEntryParams): void {
    if (evictionProcedureLocked) {
        showToast('لا يمكن حفظ القوة الجبرية — الإضبارة أو الإجراءات مقفلة.', 'warning');
        return;
    }
    const decisionId = String(input.decisionId || '').trim();
    if (!decisionId) return;
    const agency = String(input.agencyName || '').trim();
    if (!agency) {
        showToast('أدخل اسم الجهة المرافقة', 'warning');
        return;
    }

    const now = new Date().toISOString();
    const { ok } = patchExecutorDecisionRowReliable(storageId, decisionId, {
        policeAssistanceSavedAt: now,
        policeAssistanceAgency: agency,
    });
    if (!ok) {
        showToast('تعذر حفظ بيانات القوة الإجرائية — تحقق من قرار المنفذ.', 'error');
        return;
    }

    const linked = executorApprovalActions.getFieldVisitDeadlineIso();
    let dueYmd = now.slice(0, 10);
    if (linked) {
        const d = new Date(linked);
        if (!Number.isNaN(d.getTime())) {
            dueYmd = formatDateToLocalYmd(d);
        } else if (/^\d{4}-\d{2}-\d{2}/.test(linked)) {
            dueYmd = linked.slice(0, 10);
        }
    }

    const ev: TimelineEvent = {
        id: nextTimelineId(),
        type: 'eviction',
        date: now.slice(0, 10),
        timestamp: now,
        title: '🛡️ القوة الجبرية',
        description: `الجهة المرافقة: ${agency}`,
        source: 'الإجراءات الجبرية — تخلية',
        metadata: {
            evictionActionId: EVICTION_TIMELINE_ACTION_IDS.POLICE_FORCE,
            decisionRowId: decisionId,
            policeAssistanceAgency: agency,
        },
    };
    const linkToTasks = input.linkToTasks !== false;
    let nextTimeline = [ev, ...timelineEvents];
    let nextTasks = caseTasksPending;

    if (linkToTasks) {
        const taskId = nextTimelineId();
        const taskTitle = '🛡️ متابعة القوة الجبرية';
        const taskBody = `الجهة المرافقة: ${agency}`;
        nextTasks = [
            {
                id: taskId,
                title: taskTitle,
                body: taskBody,
                dueDate: dueYmd,
                createdAt: now,
            },
            ...nextTasks,
        ];
        nextTimeline = [
            {
                id: nextTimelineId(),
                type: 'other',
                date: now,
                timestamp: now,
                title: `📌 مهمة قيد الإنجاز: ${taskTitle}`,
                description: `${taskBody}\n\n📅 تاريخ الإنجاز المطلوب: ${dueYmd}`,
                source: 'الإجراءات الجبرية — تخلية',
            },
            ...nextTimeline,
        ];
    }

    persistExecutionMerge({
        eviction_police_assistance: {
            decisionId,
            agencyName: agency,
            dueYmd,
            savedAt: now,
            completedAt: null,
        },
        timelineEvents: nextTimeline,
        ...(linkToTasks ? { caseTasksPending: nextTasks } : {}),
    });

    onSaved({ timelineEvents: nextTimeline, caseTasksPending: nextTasks });
    resetModal();
    showToast(
        linkToTasks ? 'تم حفظ القوة الجبرية وإضافتها إلى المهام' : 'تم حفظ القوة الجبرية في السجل',
        'success',
    );
}

export type UseExecutionDashboardPoliceAssistanceHandlersParams = {
    evictionProcedureLocked: boolean;
    decisionsStorageExecutionId: string | undefined;
    executionData: ExecutionFile | null | undefined;
    executionId: string | undefined;
    executorApprovalActions: ExecutorApprovalActions;
    timelineEventsRef: MutableRefObject<TimelineEvent[]>;
    caseTasksPendingRef: MutableRefObject<PendingCaseTask[]>;
    policeAssistanceDecisionId: string | null;
    nextTimelineId: () => string;
    persistExecutionMerge: (patch: Record<string, unknown>) => void;
    showToast: (message: string, type?: string) => void;
    setCaseTasksPending: Dispatch<SetStateAction<PendingCaseTask[]>>;
    setTimelineEvents: Dispatch<SetStateAction<TimelineEvent[]>>;
    setPoliceAssistanceDecisionId: Dispatch<SetStateAction<string | null>>;
    setPoliceAssistanceRequestTitle: Dispatch<SetStateAction<string>>;
    setPoliceAssistanceAgencyDraft: Dispatch<SetStateAction<string>>;
    setPoliceAssistanceModalOpen: Dispatch<SetStateAction<boolean>>;
    executionDataRef: MutableRefObject<ExecutionFile | null | undefined>;
    setShowDecisionsModal: (show: boolean) => void;
    setShowUnifiedExecutionModal: (show: boolean) => void;
    setUnifiedModalTab: Dispatch<SetStateAction<string>>;
    setFollowupExpandProcedureKey: Dispatch<SetStateAction<string | null>>;
};

export function useExecutionDashboardPoliceAssistanceHandlers({
    evictionProcedureLocked,
    decisionsStorageExecutionId,
    executionData,
    executionId,
    executorApprovalActions,
    timelineEventsRef,
    caseTasksPendingRef,
    policeAssistanceDecisionId,
    nextTimelineId,
    persistExecutionMerge,
    showToast,
    setCaseTasksPending,
    setTimelineEvents,
    setPoliceAssistanceDecisionId,
    setPoliceAssistanceRequestTitle,
    setPoliceAssistanceAgencyDraft,
    setPoliceAssistanceModalOpen,
    executionDataRef,
    setShowDecisionsModal,
    setShowUnifiedExecutionModal,
    setUnifiedModalTab,
    setFollowupExpandProcedureKey,
}: UseExecutionDashboardPoliceAssistanceHandlersParams) {
    const openPoliceAssistanceFromBadge = useCallback(() => {
        const st = executionDataRef.current?.eviction_police_assistance;
        if (!st || st.completedAt) return;
        setPoliceAssistanceDecisionId(st.decisionId);
        setPoliceAssistanceRequestTitle('القوة الجبرية');
        setPoliceAssistanceAgencyDraft(st.agencyName);
        setPoliceAssistanceModalOpen(true);
    }, [
        executionDataRef,
        setPoliceAssistanceAgencyDraft,
        setPoliceAssistanceDecisionId,
        setPoliceAssistanceModalOpen,
        setPoliceAssistanceRequestTitle,
    ]);

    const openPoliceAssistanceDetailsForDecision = useCallback(
        (input: { decisionId: string; requestTitle: string }) => {
            void input;
            setShowDecisionsModal(false);
            setShowUnifiedExecutionModal(true);
            setUnifiedModalTab('coercive');
            setFollowupExpandProcedureKey('police');
        },
        [
            setFollowupExpandProcedureKey,
            setShowDecisionsModal,
            setShowUnifiedExecutionModal,
            setUnifiedModalTab,
        ],
    );

    const savePoliceAssistanceEntry = useCallback(
        (input: SavePoliceAssistanceEntryInput) => {
            const storageId = String(
                decisionsStorageExecutionId || executionData?.id || executionId || '',
            ).trim();
            runSavePoliceAssistanceEntry({
                input,
                evictionProcedureLocked,
                storageId,
                executorApprovalActions,
                timelineEvents: timelineEventsRef.current,
                caseTasksPending: caseTasksPendingRef.current,
                nextTimelineId,
                persistExecutionMerge,
                showToast,
                onSaved: ({ timelineEvents: nextTimeline, caseTasksPending: nextTasks }) => {
                    setCaseTasksPending(nextTasks);
                    setTimelineEvents(nextTimeline);
                },
                resetModal: () => {
                    setPoliceAssistanceDecisionId(null);
                    setPoliceAssistanceRequestTitle('');
                    setPoliceAssistanceAgencyDraft('');
                    setPoliceAssistanceModalOpen(false);
                },
            });
        },
        [
            caseTasksPendingRef,
            decisionsStorageExecutionId,
            evictionProcedureLocked,
            executionData?.id,
            executionId,
            executorApprovalActions,
            nextTimelineId,
            persistExecutionMerge,
            setCaseTasksPending,
            setPoliceAssistanceAgencyDraft,
            setPoliceAssistanceDecisionId,
            setPoliceAssistanceModalOpen,
            setPoliceAssistanceRequestTitle,
            setTimelineEvents,
            showToast,
            timelineEventsRef,
        ],
    );

    const savePoliceAssistanceFromModal = useCallback(
        (agencyName: string, options?: { linkToTasks?: boolean }) => {
            const decisionId = String(policeAssistanceDecisionId || '').trim();
            if (!decisionId) return;
            savePoliceAssistanceEntry({
                decisionId,
                agencyName,
                linkToTasks: options?.linkToTasks,
            });
        },
        [policeAssistanceDecisionId, savePoliceAssistanceEntry],
    );

    const completePoliceAssistance = useCallback(() => {
        if (evictionProcedureLocked) {
            showToast('لا يمكن إتمام الطلب — الإضبارة أو الإجراءات مقفلة.', 'warning');
            return;
        }
        const cur = executionDataRef.current?.eviction_police_assistance;
        if (!cur || !cur.decisionId) return;
        const now = new Date().toISOString();
        const nextTasks = (caseTasksPendingRef.current || []).filter(
            (t) => String(t.id || '') !== `eviction-police-assistance-${cur.decisionId}`,
        );
        const ev: TimelineEvent = {
            id: nextTimelineId(),
            type: 'eviction',
            date: now.slice(0, 10),
            timestamp: now,
            title: '✅ إتمام طلب القوة الجبرية',
            description: `تم إتمام الطلب وإغلاق شارة القوة الجبرية. الجهة: ${cur.agencyName}`,
            source: 'الإجراءات الجبرية — تخلية',
        };
        const nextTimeline = [ev, ...timelineEventsRef.current];
        setCaseTasksPending(nextTasks);
        setTimelineEvents(nextTimeline);
        persistExecutionMerge({
            eviction_police_assistance: { ...cur, completedAt: now },
            caseTasksPending: nextTasks,
            timelineEvents: nextTimeline,
        });
        showToast('تم إتمام طلب القوة الجبرية', 'success');
    }, [
        evictionProcedureLocked,
        executionDataRef,
        caseTasksPendingRef,
        nextTimelineId,
        timelineEventsRef,
        persistExecutionMerge,
        showToast,
        setCaseTasksPending,
        setTimelineEvents,
    ]);

    return {
        openPoliceAssistanceFromBadge,
        openPoliceAssistanceDetailsForDecision,
        savePoliceAssistanceEntry,
        savePoliceAssistanceFromModal,
        completePoliceAssistance,
    };
}
