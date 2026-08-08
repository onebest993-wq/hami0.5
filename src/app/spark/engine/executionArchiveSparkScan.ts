import type { SparkNudge } from '@/app/spark/types';
import {
    buildExecutionSparkContextFromArchiveFile,
    isExecutionArchiveFileActive,
    resolveExecutionArchiveCaseLabel,
} from '@/app/spark/context/executionSparkContextFromFile';
import { pickActiveExecutionSparkNudge } from '@/app/spark/engine/sparkExecutionEngine';

export type ExecutionArchiveSparkHit = {
    fileId: string;
    dossierKey: string;
    caseLabel: string;
    nudge: SparkNudge;
};

/** مسح خفيف لإضابير التنفيذ النشطة — بدون LLM */
export function scanExecutionArchiveForSpark(
    files: Array<Record<string, unknown>>,
    options?: { maxHits?: number },
): ExecutionArchiveSparkHit[] {
    const maxHits = options?.maxHits ?? 24;
    const hits: ExecutionArchiveSparkHit[] = [];

    for (const file of files) {
        if (hits.length >= maxHits) break;
        if (!isExecutionArchiveFileActive(file)) continue;

        const ctx = buildExecutionSparkContextFromArchiveFile(file);
        if (!ctx) continue;

        const nudge = pickActiveExecutionSparkNudge(ctx);
        if (!nudge) continue;

        hits.push({
            fileId: ctx.fileId,
            dossierKey: ctx.dossierKey,
            caseLabel: resolveExecutionArchiveCaseLabel(file, ctx.dossierKey),
            nudge,
        });
    }

    return hits;
}

export function buildExecutionArchiveAttentionNudge(
    hits: ExecutionArchiveSparkHit[],
): SparkNudge | null {
    if (!hits.length) return null;

    const first = hits[0];
    const count = hits.length;
    const kindLabel =
        first.nudge.kind === 'execution.debtor_unnotified'
            ? 'تبليغ المدين'
            : first.nudge.kind === 'execution.debtor_absence_followup'
              ? 'عدم حضور المدين'
              : first.nudge.kind === 'execution.ready_for_coercive'
                ? 'جاهز للتنفيذ الجبري'
                : first.nudge.kind === 'execution.voluntary_period_end' ||
                    first.nudge.kind === 'execution.eviction_voluntary_period_end'
                  ? 'مهلة رضائية منتهية'
                  : first.nudge.kind === 'execution.pending_executor_decision'
                    ? 'قرار منفذ معلّق'
                    : first.nudge.kind === 'execution.detention_judge_followup'
                      ? 'قرار قاضٍ للحبس معلّق'
                      : first.nudge.kind === 'execution.dormancy_art112'
                        ? 'ركود إضبارة'
                        : first.nudge.kind === 'execution.timeline_urgent_deadline'
                          ? 'مهلة في السجل'
                          : first.nudge.kind === 'execution.lifecycle_resume'
                            ? 'إضبارة متوقفة'
                            : 'متابعة إجرائية';

    const message =
        count === 1
            ? `يبدو أن إضبارة ${first.caseLabel} تحتاج ${kindLabel} — هل يهمك الأمر؟`
            : `يبدو أن ${count} إضابير تنفيذ تحتاج متابعة — أولها: ${first.caseLabel} (${kindLabel}). هل يهمك الأمر؟`;

    return {
        id: `execution-archive-attention:${first.fileId}`,
        kind: 'execution.archive_attention_summary',
        surface: 'execution',
        priority: 5,
        message,
        presence: {
            present: [`${count} إضبارة في المسح`],
            missing: [kindLabel],
        },
        source: 'executionArchiveSparkScan',
        dossierKey: first.dossierKey,
        targetFileId: first.fileId,
        hitCount: count,
        action: { label: 'فتح الإضبارة', actionId: 'open_dossier' },
    };
}
