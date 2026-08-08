import type { SparkNudge } from '@/app/spark/types';
import type { UrgentSparkContext } from '@/app/spark/context/urgentSparkContext';
import { collectUrgentSparkNudges } from '@/app/spark/procedural/urgentNudgeRules';
import { isSparkNudgeSuppressed } from '@/app/spark/memory/sparkPreferenceStore';
import { runSparkCoherenceForUrgent } from '@/app/spark/coherence/runSparkCoherenceForUrgent';
import { coherenceReportToSparkNudges } from '@/app/spark/coherence/bridge/coherenceToSparkNudges';

function mergeUrgentSparkCandidates(ctx: UrgentSparkContext): SparkNudge[] {
    const procedural = collectUrgentSparkNudges(ctx);
    const coherence = coherenceReportToSparkNudges(
        runSparkCoherenceForUrgent(ctx),
        ctx.dossierKey,
        'lawsuit',
        'supplemental',
    );
    const merged = [...procedural, ...coherence];
    const seen = new Set<string>();
    const unique: SparkNudge[] = [];
    for (const nudge of merged.sort((a, b) => a.priority - b.priority)) {
        if (seen.has(nudge.id)) continue;
        seen.add(nudge.id);
        unique.push(nudge);
    }
    return unique;
}

export function pickActiveUrgentSparkNudge(ctx: UrgentSparkContext): SparkNudge | null {
    for (const nudge of mergeUrgentSparkCandidates(ctx)) {
        if (isSparkNudgeSuppressed(nudge.kind, ctx.dossierKey)) continue;
        return nudge;
    }
    return null;
}
