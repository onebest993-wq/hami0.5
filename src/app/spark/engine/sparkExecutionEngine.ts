import type { SparkNudge } from '@/app/spark/types';
import type { ExecutionSparkContext } from '@/app/spark/context/executionSparkContext';
import { collectAllExecutionSparkNudges } from '@/app/spark/engine/collectAllExecutionSparkNudges';
import { isSparkNudgeSuppressed } from '@/app/spark/memory/sparkPreferenceStore';
import { readSparkAuditNudge } from '@/app/spark/audit/sparkAuditNudgeStore';
import { runSparkCoherenceForExecutionOpen } from '@/app/spark/coherence/runSparkCoherenceForExecutionOpen';
import { coherenceReportToSparkNudges } from '@/app/spark/coherence/bridge/coherenceToSparkNudges';

function mergeExecutionSparkCandidates(ctx: ExecutionSparkContext): SparkNudge[] {
    const procedural = collectAllExecutionSparkNudges(ctx, ctx.runtimeOverlay);
    const coherence = coherenceReportToSparkNudges(
        runSparkCoherenceForExecutionOpen(ctx),
        ctx.dossierKey,
        'execution',
        'supplemental',
    );
    const auditNudge = readSparkAuditNudge(ctx.dossierKey);
    const merged = auditNudge
        ? [...procedural, ...coherence, auditNudge]
        : [...procedural, ...coherence];
    const seen = new Set<string>();
    const unique: SparkNudge[] = [];
    for (const nudge of merged.sort((a, b) => a.priority - b.priority)) {
        if (seen.has(nudge.id)) continue;
        seen.add(nudge.id);
        unique.push(nudge);
    }
    return unique;
}

export function pickActiveExecutionSparkNudge(ctx: ExecutionSparkContext): SparkNudge | null {
    return pickExecutionSparkNudgeQueue(ctx, 1)[0] ?? null;
}

/** يُرجع طابور تنبيهات التنفيذ غير المكتمة — للشارة + لوحة Shell */
export function pickExecutionSparkNudgeQueue(
    ctx: ExecutionSparkContext,
    limit = 5,
): SparkNudge[] {
    const out: SparkNudge[] = [];
    for (const nudge of mergeExecutionSparkCandidates(ctx)) {
        if (isSparkNudgeSuppressed(nudge.kind, ctx.dossierKey)) continue;
        out.push(nudge);
        if (out.length >= limit) break;
    }
    return out;
}
