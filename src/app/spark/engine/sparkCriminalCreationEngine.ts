import type { SparkNudge } from '@/app/spark/types';
import type { CriminalCreationSparkContext } from '@/app/spark/context/criminalCreationSparkContext';
import { collectCriminalCreationSparkNudges } from '@/app/spark/procedural/criminalCreationNudgeRules';
import { isSparkNudgeSuppressed } from '@/app/spark/memory/sparkPreferenceStore';

export function pickActiveCriminalCreationSparkNudge(
    ctx: CriminalCreationSparkContext,
): SparkNudge | null {
    for (const nudge of collectCriminalCreationSparkNudges(ctx)) {
        if (isSparkNudgeSuppressed(nudge.kind, 'creation:criminal')) continue;
        return nudge;
    }
    return null;
}
