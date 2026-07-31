import { useCallback } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { TimelineEvent } from '@/app/types/execution';

type UseExecutionDashboardStayLifecycleHandlersParams = {
    nextTimelineId: () => string;
    persistExecutionMerge: (patch: Record<string, unknown>) => void;
    showToast: (message: string, type?: string) => void;
    setTimelineEvents: Dispatch<SetStateAction<TimelineEvent[]>>;
    setExecutionPaused: Dispatch<SetStateAction<boolean>>;
};

export function useExecutionDashboardStayLifecycleHandlers({
    nextTimelineId,
    persistExecutionMerge,
    showToast,
    setTimelineEvents,
    setExecutionPaused,
}: UseExecutionDashboardStayLifecycleHandlersParams) {
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
    }, [nextTimelineId, persistExecutionMerge, setTimelineEvents, showToast]);

    const handleResumeExecution = useCallback(() => {
        setExecutionPaused(false);
        const now = new Date().toISOString();
        const newEvent: TimelineEvent = {
            id: Date.now().toString(),
            date: now,
            title: '▶️ استئناف التنفيذ',
            description: 'تم استئناف التنفيذ بعد مراجعة الدائن',
            type: 'decision',
        };
        setTimelineEvents((prev) => [newEvent, ...prev]);
        showToast('تم استئناف التنفيذ', 'success');
    }, [setExecutionPaused, setTimelineEvents, showToast]);

    return {
        handleLiftStayOfExecution,
        handleResumeExecution,
    };
}
