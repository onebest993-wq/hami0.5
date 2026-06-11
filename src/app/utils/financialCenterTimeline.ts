import { dispatchExecutionTimelineAppend } from '@/app/components/lawyer/ExecutionDashboard/utils/applyPersonalCoerciveExecutorOutcome';
import type { TimelineEvent, TimelineEventType } from '@/app/types/execution';

/** نشر حدث المركز المالي إلى السجل الزمني مع الحفظ في الإضبارة */
export function publishFinancialCenterTimelineNote(
    executionId: string | undefined,
    title: string,
    description: string,
    type: TimelineEventType | string = 'other',
    mergePatch?: Record<string, unknown>
): void {
    const id = String(executionId ?? '').trim();
    if (!id || id === 'undefined') return;
    const ts = new Date().toISOString();
    const event: Omit<TimelineEvent, 'id'> = {
        date: ts.slice(0, 10),
        timestamp: ts,
        title,
        description,
        type,
        source: 'إدارة الأموال والمصاريف',
    };
    dispatchExecutionTimelineAppend({
        executionId: id,
        event,
        mergePatch,
    });
}
