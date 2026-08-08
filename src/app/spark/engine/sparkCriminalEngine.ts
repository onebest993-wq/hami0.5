import type { SparkNudge } from '@/app/spark/types';
import type { CriminalSparkContext } from '@/app/spark/context/criminalSparkContext';
import { collectCriminalSparkNudges } from '@/app/spark/procedural/criminalNudgeRules';
import { isSparkNudgeSuppressed } from '@/app/spark/memory/sparkPreferenceStore';
import { runSparkCoherenceForCriminal } from '@/app/spark/coherence/runSparkCoherenceForCriminal';
import { coherenceReportToSparkNudges } from '@/app/spark/coherence/bridge/coherenceToSparkNudges';

function mergeCriminalSparkCandidates(ctx: CriminalSparkContext): SparkNudge[] {
    const procedural = collectCriminalSparkNudges(ctx);
    const coherence = coherenceReportToSparkNudges(
        runSparkCoherenceForCriminal(ctx),
        ctx.dossierKey,
        'criminal',
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

export function pickActiveCriminalSparkNudge(ctx: CriminalSparkContext): SparkNudge | null {
    for (const nudge of mergeCriminalSparkCandidates(ctx)) {
        if (isSparkNudgeSuppressed(nudge.kind, ctx.dossierKey)) continue;
        return nudge;
    }
    return null;
}
