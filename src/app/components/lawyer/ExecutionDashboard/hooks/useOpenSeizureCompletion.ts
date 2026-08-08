import { useEffect, useMemo, useRef } from 'react';
import type { OpenSeizureCompletionContext } from '@/app/components/lawyer/ExecutionDashboard/utils/openSeizureCompletionHandler.types';
import { scheduleIdleWork } from '@/app/utils/scheduleIdleWork';

/**
 * مستمع إكمال الحجز — تحميل كسول للمعالج حتى لا يثقل فتح الإضبارة.
 */
export function useOpenSeizureCompletion(ctx: OpenSeizureCompletionContext) {
    const ctxRef = useRef(ctx);
    ctxRef.current = ctx;

    const stableKeys = useMemo(
        () => ({
            executionDataId: ctx.executionDataId,
            executionId: ctx.executionId,
        }),
        [ctx.executionDataId, ctx.executionId],
    );

    useEffect(() => {
        let cancelled = false;
        let handler: EventListener | null = null;
        let removeIdle: (() => void) | undefined;

        const attach = () => {
            void import('@/app/components/lawyer/ExecutionDashboard/utils/openSeizureCompletionHandler')
                .then((m) => {
                    if (cancelled) return;
                    handler = ((e: Event) => {
                        m.handleOpenSeizureCompletionEvent(e, ctxRef.current);
                    }) as EventListener;
                    window.addEventListener('hami-open-seizure-completion', handler);
                })
                .catch(() => undefined);
        };

        removeIdle = scheduleIdleWork(attach, 0);

        return () => {
            cancelled = true;
            removeIdle?.();
            if (handler) {
                window.removeEventListener('hami-open-seizure-completion', handler);
            }
        };
    }, [stableKeys.executionDataId, stableKeys.executionId]);
}
