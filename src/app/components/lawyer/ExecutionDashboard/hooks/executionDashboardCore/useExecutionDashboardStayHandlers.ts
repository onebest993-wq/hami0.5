// @ts-nocheck
/** استئخار التنفيذ + رفع الاستئخار + استئناف الإيقاف المؤقت */
import { useCallback, type Dispatch, type SetStateAction } from 'react';
import type { ExecutionFile, TimelineEvent } from '@/app/types/execution';
import { syncExecutionTaskDue } from '@/app/services/calendarDossierSync';

export type UseExecutionDashboardStayHandlersParams = {
    executionData: ExecutionFile | null | undefined;
    file: ExecutionFile | null | undefined;
    currentFileId: string;
    nextTimelineId: () => string;
    persistExecutionMerge: (patch: Record<string, unknown>) => void;
    showToast: (message: string, type?: string) => void;
    setTimelineEvents: Dispatch<SetStateAction<TimelineEvent[]>>;
    setCaseTasksPending: Dispatch<SetStateAction<NonNullable<ExecutionFile['caseTasksPending']>>>;
    setExecutionPaused: Dispatch<SetStateAction<boolean>>;
};

export function useExecutionDashboardStayHandlers({
    executionData,
    file,
    currentFileId,
    nextTimelineId,
    persistExecutionMerge,
    showToast,
    setTimelineEvents,
    setCaseTasksPending,
    setExecutionPaused,
}: UseExecutionDashboardStayHandlersParams) {
    const handleLiftStayOfExecution = useCallback(() => {
        const now = new Date().toISOString();
        const te: TimelineEvent = {
            id: nextTimelineId(),
            date: now.slice(0, 10),
            timestamp: now,
            title: '✅ رفع الاستئخار',
            description: 'عادت أدوات التنفيذ للعمل وفق وضع الإيقاف العام للإضبارة.',
            type: 'decision',
            source: 'التنفيذ',
        };
        setTimelineEvents((prev) => {
            const next = [te, ...prev];
            queueMicrotask(() =>
                persistExecutionMerge({
                    stay_of_execution: {
                        active: false,
                        decision_number: '',
                        court_name: '',
                        next_hearing_date: '',
                    },
                    timelineEvents: next,
                }),
            );
            return next;
        });
        showToast('تم رفع الاستئخار', 'success');
    }, [nextTimelineId, persistExecutionMerge, showToast, setTimelineEvents]);

    const handleSpecialCasesStay = useCallback(
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
                        syncExecutionTaskDue({
                            executionId: currentFileId,
                            task,
                            caseNo:
                                String(
                                    executionData?.fileNumber ??
                                        executionData?.caseNo ??
                                        file?.fileNumber ??
                                        '',
                                ).trim() || undefined,
                            clientName:
                                String(
                                    executionData?.creditors?.[0]?.name ??
                                        executionData?.clientName ??
                                        file?.creditors?.[0]?.name ??
                                        '',
                                ).trim() || undefined,
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
            showToast,
            setCaseTasksPending,
            setTimelineEvents,
        ],
    );

    /**
     * كان يُحدّث الحالة المحلية ويُعلن النجاح ولا يُثبّت شيئاً — بخلاف
     * `handleLiftStayOfExecution` أعلاه. و`executionPaused` يُعاد ترطيبه من
     * البلوب عند الفتح، فتعود الإضبارة «موقوفة» ويختفي حدث الاستئناف؛ وبما أن
     * `executionPaused` يُقفل الأدوات الجبرية فالنتيجة قسم مقفل بلا سبب ظاهر.
     * كان الاستئناف ينتظر حفظ لقطة لاحقة، وإن أُغلقت الإضبارة قبلها فُقد.
     */
    const handleResumeExecution = useCallback(() => {
        setExecutionPaused(false);
        const now = new Date().toISOString();
        const newEvent: TimelineEvent = {
            id: nextTimelineId(),
            date: now.slice(0, 10),
            timestamp: now,
            title: '▶️ استئناف التنفيذ',
            description: 'تم استئناف التنفيذ بعد مراجعة الدائن',
            type: 'decision',
            source: 'التنفيذ',
        };
        setTimelineEvents((prev) => {
            const next = [newEvent, ...prev];
            queueMicrotask(() =>
                persistExecutionMerge({
                    executionPaused: false,
                    timelineEvents: next,
                }),
            );
            return next;
        });
        showToast('تم استئناف التنفيذ', 'success');
    }, [nextTimelineId, persistExecutionMerge, setExecutionPaused, setTimelineEvents, showToast]);

    return {
        handleLiftStayOfExecution,
        handleSpecialCasesStay,
        handleResumeExecution,
    };
}
