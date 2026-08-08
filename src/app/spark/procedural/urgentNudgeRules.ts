import type { SparkNudge } from '@/app/spark/types';
import type { UrgentSparkContext } from '@/app/spark/context/urgentSparkContext';

export function collectUrgentSparkNudges(ctx: UrgentSparkContext): SparkNudge[] {
    if (ctx.isFinalized) return [];

    const nudges: SparkNudge[] = [];

    const hasJudgeDecision = Boolean(ctx.judgeDecision.decision && ctx.judgeDecision.decisionDate);
    const inGrievance =
        ctx.activeLifecycleStep === 'grievance' ||
        ctx.fileStatus === 'grievance' ||
        ctx.grievanceData.outcome === 'filed';

    if (inGrievance && hasJudgeDecision && !ctx.grievanceDecisionNotificationConfirmed) {
        nudges.push({
            id: `${ctx.dossierKey}:grievance-notification`,
            kind: 'urgent.grievance_notification_unconfirmed',
            surface: 'lawsuit',
            priority: 10,
            message:
                'قرار القاضي مسجّل، لكن تبليغ قرار التظلم غير مؤكّد بعد — هل يهمك الأمر؟',
            presence: {
                present: ['قرار قاضٍ', 'مرحلة التظلم'],
                missing: ['تأكيد تبليغ قرار التظلم'],
            },
            source: 'urgent.grievanceDecisionNotificationConfirmed',
            dossierKey: ctx.dossierKey,
            action: { label: 'تأكيد التبليغ', actionId: 'confirm_grievance_notification' },
        });
    }

    if (ctx.activeLifecycleStep === 'execution') {
        const missingExecution =
            !String(ctx.executionData.executionDate ?? '').trim() ||
            !String(ctx.executionData.notificationDate ?? '').trim() ||
            !String(ctx.executionData.authority ?? '').trim();
        if (missingExecution) {
            nudges.push({
                id: `${ctx.dossierKey}:execution-gap`,
                kind: 'urgent.execution_data_incomplete',
                surface: 'lawsuit',
                priority: 20,
                message:
                    'مرحلة التنفيذ مفتوحة، وبعض بيانات المفاتحة/التبليغ غير مكتملة — هل تود إكمالها؟',
                presence: {
                    present: ['مرحلة التنفيذ'],
                    missing: ['بيانات التبليغ أو المفاتحة'],
                },
                source: 'urgent.executionData',
                dossierKey: ctx.dossierKey,
                action: { label: 'مراجعة التنفيذ', actionId: 'review_execution' },
            });
        }
    }

    if (ctx.activeLifecycleStep === 'cassation' && !ctx.cassationData.outcome) {
        nudges.push({
            id: `${ctx.dossierKey}:cassation-followup`,
            kind: 'urgent.cassation_followup',
            surface: 'lawsuit',
            priority: 30,
            message:
                'مرحلة التمييز مفتوحة، ولم أجد تسجيلاً لنتيجة الطعن — هل يهمك متابعته؟',
            presence: {
                present: ['مرحلة التمييز'],
                missing: ['نتيجة الطعن في السجل'],
            },
            source: 'urgent.cassationData.outcome',
            dossierKey: ctx.dossierKey,
            action: { label: 'مراجعة التمييز', actionId: 'review_cassation' },
        });
    }

    return nudges.sort((a, b) => a.priority - b.priority);
}
