import { useCallback } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { ExecutionFile, TimelineEvent } from '@/app/types/execution';
import { syncExecutionTaskDueDeferred } from './executionDashboardStayCalendarSync';
import { resolveExecutionDossierIdentity } from './executionDashboardDossierIdentity';

type UseExecutionDashboardStayApplyHandlerParams = {
    executionData: ExecutionFile | null | undefined;
    file: ExecutionFile | null | undefined;
    currentFileId: string;
    nextTimelineId: () => string;
    persistExecutionMerge: (patch: Record<string, unknown>) => void;
    showToast: (message: string, type?: string) => void;
    setTimelineEvents: Dispatch<SetStateAction<TimelineEvent[]>>;
    setCaseTasksPending: Dispatch<SetStateAction<NonNullable<ExecutionFile['caseTasksPending']>>>;
};

export function useExecutionDashboardStayApplyHandler({
    executionData,
    file,
    currentFileId,
    nextTimelineId,
    persistExecutionMerge,
    showToast,
    setTimelineEvents,
    setCaseTasksPending,
}: UseExecutionDashboardStayApplyHandlerParams) {
    return useCallback(
        (input: { decision_number: string; court_name: string; next_hearing_date: string }): boolean => {
            const court_name = input.court_name.trim();
            const next_hearing_date = input.next_hearing_date.trim();
            if (!court_name || !next_hearing_date) {
                showToast('أدخل اسم المحكمة وتاريخ الجلسة', 'warning');
                return false;
            }

            const decision_number = input.decision_number.trim();
            const taskId = nextTimelineId();
            const teId = nextTimelineId();
            const now = new Date().toISOString();
            const task = {
                id: taskId,
                title: 'متابعة استئخار التنفيذ',
                body: `محكمة: ${court_name}${decision_number ? ` — قرار: ${decision_number}` : ''}`,
                dueDate: next_hearing_date,
                createdAt: now,
            };
            const te: TimelineEvent = {
                id: teId,
                date: now.slice(0, 10),
                timestamp: now,
                title: '⚠️ تفعيل استئخار التنفيذ',
                description: `محكمة: ${court_name}${decision_number ? `\nرقم القرار: ${decision_number}` : ''}\nجلسة/متابعة: ${next_hearing_date}\n— تُعطَّل أدوات الإضبارة حتى رفع الاستئخار.`,
                type: 'decision',
                source: 'استئخار التنفيذ',
            };
            const dossierIdentity = resolveExecutionDossierIdentity(executionData, file);

            setCaseTasksPending((prev) => {
                const nextTasks = [...prev, task];
                setTimelineEvents((prevTl) => {
                    const nextTl = [te, ...prevTl];
                    queueMicrotask(() => {
                        persistExecutionMerge({
                            stay_of_execution: {
                                active: true,
                                decision_number,
                                court_name,
                                next_hearing_date,
                            },
                            timelineEvents: nextTl,
                            caseTasksPending: nextTasks,
                        });
                        syncExecutionTaskDueDeferred({
                            executionId: currentFileId,
                            task,
                            caseNo: dossierIdentity.caseNo,
                            clientName: dossierIdentity.clientName,
                        });
                    });
                    return nextTl;
                });
                return nextTasks;
            });

            showToast('تم تفعيل الاستئخار وتسجيل المهمة.', 'success');
            return true;
        },
        [
            currentFileId,
            executionData,
            file,
            nextTimelineId,
            persistExecutionMerge,
            setCaseTasksPending,
            setTimelineEvents,
            showToast,
        ],
    );
}
