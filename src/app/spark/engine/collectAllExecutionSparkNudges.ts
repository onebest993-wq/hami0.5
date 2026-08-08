import type { SparkNudge } from '@/app/spark/types';
import type { ExecutionSparkContext } from '@/app/spark/context/executionSparkContext';
import type { ExecutionSparkRuntimeOverlay } from '@/app/spark/context/executionSparkRuntimeOverlay';
import { collectExecutionSparkNudges } from '@/app/spark/procedural/executionNudgeRules';
import { collectExecutionCoerciveSparkNudges } from '@/app/spark/procedural/executionCoerciveSparkRules';
import { collectExecutionSecretarySparkNudges } from '@/app/spark/engine/executionSecretarySparkBridge';

import { collectExecutionFinancialSparkNudges } from '@/app/spark/procedural/executionFinancialSparkRules';

/** يجمع كل مرشّحي سبارك للتنفيذ: قواعد محلية + Secretary + جبري لحظي + مركز مالي */
export function collectAllExecutionSparkNudges(
    ctx: ExecutionSparkContext,
    overlay?: ExecutionSparkRuntimeOverlay,
): SparkNudge[] {
    const financial = collectExecutionFinancialSparkNudges(ctx);
    const financialKinds = new Set(financial.map((n) => n.kind));

    const procedural = collectExecutionSparkNudges(ctx).filter((n) => {
        if (
            n.kind === 'execution.stale_payments' &&
            financialKinds.has('execution.financial_stale_payments')
        ) {
            return false;
        }
        return true;
    });
    const localKinds = new Set([
        ...procedural.map((n) => n.kind),
        ...financial.map((n) => n.kind),
    ]);

    const secretary = collectExecutionSecretarySparkNudges(
        ctx.executionData,
        localKinds,
    );
    const coercive = collectExecutionCoerciveSparkNudges(ctx, overlay);

    const merged = [...procedural, ...financial, ...secretary, ...coercive];
    const seen = new Set<string>();
    const unique: SparkNudge[] = [];

    for (const nudge of merged.sort((a, b) => a.priority - b.priority)) {
        if (seen.has(nudge.id)) continue;
        seen.add(nudge.id);
        unique.push(nudge);
    }

    return unique;
}
