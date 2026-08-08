import type { SparkNudge } from '@/app/spark/types';
import type { LawsuitSparkContext } from '@/app/spark/context/lawsuitSparkContext';
import { collectLawsuitSparkNudges } from '@/app/spark/procedural/lawsuitNudgeRules';
import { isSparkNudgeSuppressed } from '@/app/spark/memory/sparkPreferenceStore';
import { readSparkAuditNudge } from '@/app/spark/audit/sparkAuditNudgeStore';
import { runSparkCoherenceForLawsuit } from '@/app/spark/coherence/runSparkCoherenceForLawsuit';
import { coherenceReportToSparkNudges } from '@/app/spark/coherence/bridge/coherenceToSparkNudges';

function mergeLawsuitSparkCandidates(ctx: LawsuitSparkContext): SparkNudge[] {
    const procedural = collectLawsuitSparkNudges(ctx);
    const coherence = coherenceReportToSparkNudges(
        runSparkCoherenceForLawsuit(ctx),
        ctx.dossierKey,
        'lawsuit',
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

/** طابور تنبيهات الدعوى — حتى 5 غير مكتمة */
export function pickLawsuitSparkNudgeQueue(
    ctx: LawsuitSparkContext,
    limit = 5,
): SparkNudge[] {
    const out: SparkNudge[] = [];
    for (const nudge of mergeLawsuitSparkCandidates(ctx)) {
        if (isSparkNudgeSuppressed(nudge.kind, ctx.dossierKey)) continue;
        out.push(nudge);
        if (out.length >= limit) break;
    }
    return out;
}

export function pickActiveLawsuitSparkNudge(ctx: LawsuitSparkContext): SparkNudge | null {
    return pickLawsuitSparkNudgeQueue(ctx, 1)[0] ?? null;
}
