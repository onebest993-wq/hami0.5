import { useEffect, useMemo, useRef } from 'react';
import type { SeizureDecisionOutcomeContext } from '@/app/components/lawyer/ExecutionDashboard/utils/seizureDecisionOutcomeHandler.types';

/**
 * مستمع نتيجة قرار الحجز — يحمّل المعالج الثقيل ديناميكياً دون تأخير الربط (الموافقة inline تتطلب استجابة فورية).
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

        void import('@/app/components/lawyer/ExecutionDashboard/utils/seizureDecisionOutcomeHandler')
            .then((m) => {
                if (cancelled) return;
                handler = ((e: Event) => {
                    m.handleSeizureDecisionOutcomeEvent(e, ctxRef.current);
                }) as EventListener;
                window.addEventListener('hami-execution-decision-outcome', handler);
            })
            .catch(() => undefined);

        return () => {
            cancelled = true;
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
