import { useEffect, useMemo, useRef } from 'react';
import type { SeizureDecisionOutcomeContext } from '@/app/components/lawyer/ExecutionDashboard/utils/seizureDecisionOutcomeHandler.types';
import { scheduleIdleWork } from '@/app/utils/scheduleIdleWork';

/**
 * مستمع نتيجة قرار الحجز — يحمّل المعالج الثقيل بعد idle حتى لا يُسحب إلى جذع ED المتزامن.
 */
export function useSeizureDecisionOutcome(ctx: SeizureDecisionOutcomeContext) {
    const ctxRef = useRef(ctx);
    ctxRef.current = ctx;

    const stableKeys = useMemo(
        () => ({
            executionDataId: ctx.executionDataId,
            executionId: ctx.executionId,
            decisionsStorageExecutionId: ctx.decisionsStorageExecutionId,
        }),
        [ctx.decisionsStorageExecutionId, ctx.executionDataId, ctx.executionId],
    );

    useEffect(() => {
        let cancelled = false;
        let handler: EventListener | null = null;
        let removeIdle: (() => void) | undefined;

        const attach = () => {
            void import('@/app/components/lawyer/ExecutionDashboard/utils/seizureDecisionOutcomeHandler')
                .then((m) => {
                    if (cancelled) return;
                    handler = ((e: Event) => {
                        m.handleSeizureDecisionOutcomeEvent(e, ctxRef.current);
                    }) as EventListener;
                    window.addEventListener(
                        'hami-execution-decision-outcome',
                        handler,
                    );
                })
                .catch(() => undefined);
        };

        removeIdle = scheduleIdleWork(attach, 1800);

        return () => {
            cancelled = true;
            removeIdle?.();
            if (handler) {
                window.removeEventListener('hami-execution-decision-outcome', handler);
            }
        };
    }, [
        stableKeys.decisionsStorageExecutionId,
        stableKeys.executionDataId,
        stableKeys.executionId,
    ]);
}
