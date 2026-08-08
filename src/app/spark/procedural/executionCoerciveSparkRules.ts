import type { SparkNudge } from '@/app/spark/types';
import type { ExecutionSparkContext } from '@/app/spark/context/executionSparkContext';
import {
    formatCoerciveActionsList,
    type ExecutionSparkRuntimeOverlay,
} from '@/app/spark/context/executionSparkRuntimeOverlay';

export function collectExecutionCoerciveSparkNudges(
    ctx: ExecutionSparkContext,
    overlay?: ExecutionSparkRuntimeOverlay,
): SparkNudge[] {
    const actions =
        overlay?.activeCoerciveActions ??
        (Array.isArray(ctx.executionData.activeCoerciveActions)
            ? ctx.executionData.activeCoerciveActions
            : []);

    if (!actions.length) return [];

    const nudges: SparkNudge[] = [];
    const labels = formatCoerciveActionsList(actions);
    const daysSince = ctx.signals.daysSinceLastTimelineAction;

    if (daysSince != null && daysSince >= 21) {
        nudges.push({
            id: `${ctx.dossierKey}:coercive-stalled`,
            kind: 'execution.coercive_stalled',
            surface: 'execution',
            priority: 16,
            message: `إجراءات جبريّة فعّالة (${labels}) دون تحديث في السجل منذ ${daysSince} يوماً — هل تود متابعة المحضر؟`,
            presence: {
                present: actions.map((a) => formatCoerciveActionsList([a])),
                missing: ['تحديث السجل الزمني'],
            },
            source: 'execution.activeCoerciveActions.stalled',
            dossierKey: ctx.dossierKey,
            action: { label: 'فتح الإجراءات الجبرية', actionId: 'open_coercive' },
        });
    }

    if (actions.includes('seizure') && ctx.pendingExecutorDecisionCount > 0) {
        nudges.push({
            id: `${ctx.dossierKey}:coercive-seizure-decision`,
            kind: 'execution.coercive_seizure_pending',
            surface: 'execution',
            priority: 14,
            message: `حجز منقول فعّال مع قرار منفذ معلّق — راجع طلبات الحجز والقرارات.`,
            presence: {
                present: ['حجز منقول', `${ctx.pendingExecutorDecisionCount} قرار معلّق`],
                missing: ['رد المنفذ'],
            },
            source: 'execution.activeCoerciveActions.seizure',
            dossierKey: ctx.dossierKey,
            action: { label: 'طلبات الحجز', actionId: 'open_seizure_requests' },
        });
    }

    if (
        actions.includes('salary') &&
        ctx.signals.globalStatus === 'GRACE_PERIOD' &&
        !overlay?.lawyerStartedPostNoticeExecution
    ) {
        nudges.push({
            id: `${ctx.dossierKey}:coercive-salary-grace`,
            kind: 'execution.coercive_salary_during_grace',
            surface: 'execution',
            priority: 18,
            message: `حجز راتب مُفعَّل ضمن فترة رضائية — تأكّد من توافق المسار مع مرحلة التبليغ.`,
            presence: {
                present: ['حجز راتب', 'فترة رضائية'],
                missing: ['توافق إجرائي'],
            },
            source: 'execution.activeCoerciveActions.salary',
            dossierKey: ctx.dossierKey,
            action: { label: 'مراجعة المحضر', actionId: 'open_followup' },
        });
    }

    return nudges.sort((a, b) => a.priority - b.priority);
}
