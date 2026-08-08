import type { SparkNudge } from '@/app/spark/types';
import type { ExecutionCreationSparkContext } from '@/app/spark/context/executionCreationSparkContext';
import { collectExecutionCreationSparkNudges } from '@/app/spark/procedural/executionCreationNudgeRules';
import { isSparkNudgeSuppressed } from '@/app/spark/memory/sparkPreferenceStore';
import { readSparkAuditNudge } from '@/app/spark/audit/sparkAuditNudgeStore';
import { EXECUTION_CREATION_DOSSIER_KEY } from '@/app/spark/context/executionCreationSparkContext';
import { runSparkCoherenceForExecutionCreation } from '@/app/spark/coherence/runSparkCoherenceForExecutionCreation';
import { coherenceReportToSparkNudges } from '@/app/spark/coherence/bridge/coherenceToSparkNudges';

function mergeExecutionCreationCandidates(ctx: ExecutionCreationSparkContext): SparkNudge[] {
    const procedural = collectExecutionCreationSparkNudges(ctx);
    const coherence = coherenceReportToSparkNudges(
        runSparkCoherenceForExecutionCreation(ctx),
        EXECUTION_CREATION_DOSSIER_KEY,
        'execution',
    );
    const auditNudge = readSparkAuditNudge(EXECUTION_CREATION_DOSSIER_KEY);
    const merged = auditNudge
        ? [...procedural, ...coherence, auditNudge]
        : [...procedural, ...coherence];
    const seen = new Set<string>();
    const unique: SparkNudge[] = [];
    for (const nudge of merged.sort((a, b) => b.priority - a.priority)) {
        if (seen.has(nudge.id)) continue;
        seen.add(nudge.id);
        unique.push(nudge);
    }
    return unique;
}

export function pickExecutionCreationSparkNudgeQueue(
    ctx: ExecutionCreationSparkContext,
    limit = 5,
): SparkNudge[] {
    const out: SparkNudge[] = [];
    for (const nudge of mergeExecutionCreationCandidates(ctx)) {
        if (isSparkNudgeSuppressed(nudge.kind, 'creation:execution')) continue;
        out.push(nudge);
        if (out.length >= limit) break;
    }
    return out;
}

export function pickActiveExecutionCreationSparkNudge(
    ctx: ExecutionCreationSparkContext,
): SparkNudge | null {
    return pickExecutionCreationSparkNudgeQueue(ctx, 1)[0] ?? null;
}
